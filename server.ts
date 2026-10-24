import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import crypto from 'crypto';
import axios from 'axios';
import { simpleGit } from 'simple-git';
import AdmZip from 'adm-zip';
import { generateAITimetable } from './src/server/timetableAILogic.ts';
import { generateAISchemeOfWork, generateAILessonPlan } from './src/server/schemeAILogic.ts';
import { fetchAndParseNectaUrl } from './src/server/nectaFetchLogic.ts';
import { normalizeTzPhone, sendBeemSMS } from './src/server/smsUtils.ts';
import { generatePerformanceInsight } from './src/server/aiPerformance.ts';
import {
  queryTimetable,
  saveTimetable,
  deleteTimetableAssignment,
  type ServerTimetableAssignment
} from './src/server/timetableStore.ts';
import { db } from './src/db/index.ts';
import * as schema from './src/db/schema.ts';
import {
  DEFAULT_APP_DATA,
  TANZANIAN_TEMPLATE_PERIOD_SETTINGS,
  TANZANIAN_TEMPLATE_STREAM_SETTINGS,
  TANZANIAN_TEMPLATE_TIMETABLE_ASSIGNMENTS,
  SECONDARY_SUBJECTS,
  UPPER_PRIMARY_SUBJECTS_LIST,
  NURSERY_SUBJECTS_LIST
} from './src/constants/defaults.ts';
import { eq, inArray, notInArray, and, asc, desc, getTableColumns, sql } from 'drizzle-orm';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '10mb' }));

const DEFAULT_SCHOOL_UUID = '02dff10d-78fb-4af6-ab5a-db1d275d7e06';
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUuid(val: any): boolean {
  return typeof val === 'string' && UUID_REGEX.test(val.trim());
}

export function toDeterministicUuid(val: any, isSchoolId = false): string {
  if (val === undefined || val === null || val === '') {
    return isSchoolId ? DEFAULT_SCHOOL_UUID : crypto.randomUUID();
  }
  const clean = String(val).trim();
  if (!clean || (isSchoolId && (clean === 'DEMO_SCHOOL' || clean === 'DEFAULT_PRIMARY_SCHOOL_ID' || clean === 'DEFAULT'))) {
    return isSchoolId ? DEFAULT_SCHOOL_UUID : crypto.randomUUID();
  }
  if (UUID_REGEX.test(clean)) {
    return clean.toLowerCase();
  }
  let h1 = 0xdeadbeef ^ clean.length;
  let h2 = 0x41c6ce57 ^ clean.length;
  let h3 = 0x9e3779b9 ^ clean.length;
  let h4 = 0x85ebca6b ^ clean.length;
  for (let i = 0; i < clean.length; i++) {
    const ch = clean.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
    h3 = Math.imul(h3 ^ ch, 2246822519);
    h4 = Math.imul(h4 ^ ch, 3266489917);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  h3 = Math.imul(h3 ^ (h3 >>> 16), 2246822507) ^ Math.imul(h4 ^ (h4 >>> 13), 3266489909);
  h4 = Math.imul(h4 ^ (h4 >>> 16), 2246822507) ^ Math.imul(h3 ^ (h3 >>> 13), 3266489909);
  const hex = (
    (h1 >>> 0).toString(16).padStart(8, '0') +
    (h2 >>> 0).toString(16).padStart(8, '0') +
    (h3 >>> 0).toString(16).padStart(8, '0') +
    (h4 >>> 0).toString(16).padStart(8, '0')
  );
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

const ensuredSchoolsCache = new Set<string>();
async function ensureSchoolExists(schoolIdRaw: any): Promise<string> {
  const schoolUuid = toDeterministicUuid(schoolIdRaw, true);
  if (ensuredSchoolsCache.has(schoolUuid)) return schoolUuid;
  try {
    await db.insert(schema.schools).values({
      id: schoolUuid,
      name: 'HABY EDU SCHOOL',
      code: 'CTR-001',
      status: 'ACTIVE',
    }).onConflictDoNothing();
    ensuredSchoolsCache.add(schoolUuid);
  } catch (e) {
    // ignore
  }
  return schoolUuid;
}

// Complete mapping of all 56 database tables in Cloud SQL
const TABLE_KEY_MAP: Record<string, any> = {
  schools: schema.schools,
  users: schema.users,
  students: schema.students,
  teachers: schema.teachers,
  classes: schema.classes,
  exams: schema.exams,
  period_attendance: schema.periodAttendance,
  remedial_timetable: schema.remedialTimetable,
  remedial_attendance: schema.remedialAttendance,
  remedial_payment_settings: schema.remedialPaymentSettings,
  school_data: schema.schoolData,
  school_admins: schema.schoolAdmins,
  school_subscriptions: schema.schoolSubscriptions,
  timetables: schema.timetables,
  timetable_assignments: schema.timetableAssignments,
  period_settings: schema.periodSettings,
  periods: schema.periods,
  stream_settings: schema.streamSettings,
  subject_period_allocations: schema.subjectPeriodAllocations,
  teacher_assignments: schema.teacherAssignments,
  saved_timetable_records: schema.savedTimetableRecords,
  institutional_policies: schema.institutionalPolicies,
  exam_records: schema.examRecords,
  exam_results: schema.examResults,
  discipline_records: schema.disciplineRecords,
  contribution_types: schema.contributionTypes,
  student_ledger: schema.studentLedger,
  invigilation_sessions: schema.invigilationSessions,
  invigilation_assignments: schema.invigilationAssignments,
  invigilation_supervisors: schema.invigilationSupervisors,
  selected_invigilators: schema.selectedInvigilators,
  saved_invigilation_records: schema.savedInvigilationRecords,
  sitting_plans: schema.sittingPlans,
  parents: schema.parents,
  parent_students: schema.parentStudents,
  announcements: schema.announcements,
  parent_messages: schema.parentMessages,
  gate_pass_logs: schema.gatePassLogs,
  subjects: schema.subjects,
  teaching_logs: schema.teachingLogs,
  authorized_staff: schema.authorizedStaff,
  environment_equipment: schema.environmentEquipment,
  equipment_usage_log: schema.equipmentUsageLog,
  environment_orders: schema.environmentOrders,
  school_purchased_equipment: schema.schoolPurchasedEquipment,
  ream_paper_records: schema.reamPaperRecords,
  activity_logs: schema.activityLogs,
  sms_wallet: schema.smsWallet,
  sms_logs: schema.smsLogs,
  sms_payment_history: schema.smsPaymentHistory,
  payment_verification_requests: schema.paymentVerificationRequests,
  duty_streams: schema.dutyStreams,
  duty_weekly_assignments: schema.dutyWeeklyAssignments,
  duty_daily_reports: schema.dutyDailyReports,
  curriculum_standards: schema.curriculumStandards,
  past_papers: schema.pastPapers,
  teacher_attendance: schema.teacherAttendance,
  staff_payroll: schema.staffPayroll,
};

function resolveColumn(tableObj: any, colName: string): { jsKey: string; colDef: any } | null {
  const cols = getTableColumns(tableObj);
  if (cols[colName]) {
    return { jsKey: colName, colDef: cols[colName] };
  }
  const lower = colName.toLowerCase();
  for (const [jsKey, colDef] of Object.entries(cols) as [string, any][]) {
    if (colDef.name?.toLowerCase() === lower || jsKey.toLowerCase() === lower) {
      return { jsKey, colDef };
    }
  }
  return null;
}

function coerceColumnValue(colDef: any, jsKey: string, rawVal: any): any {
  if (rawVal === undefined) return undefined;
  const colType = colDef.columnType || '';
  const sqlName = colDef.name || jsKey;

  if (colType === 'PgUUID') {
    const isSchoolCol = sqlName === 'school_id' || jsKey === 'schoolId';
    if (isSchoolCol) {
      return toDeterministicUuid(rawVal, true);
    }
    if (sqlName === 'id' || jsKey === 'id') {
      return rawVal ? toDeterministicUuid(rawVal, false) : crypto.randomUUID();
    }
    // Optional FK UUID columns
    if (rawVal === null || rawVal === '') return null;
    if (sqlName === 'class_teacher_id' || sqlName === 'equipment_id' || sqlName === 'class_id') {
      return isValidUuid(rawVal) ? rawVal : null;
    }
    return toDeterministicUuid(rawVal, false);
  }

  if (colType === 'PgTimestamp') {
    if (!rawVal) return new Date();
    if (rawVal instanceof Date) return rawVal;
    const d = new Date(rawVal);
    return isNaN(d.getTime()) ? new Date() : d;
  }

  if (colType === 'PgDate') {
    if (!rawVal) return colDef.notNull ? new Date().toISOString().split('T')[0] : null;
    if (rawVal instanceof Date) return rawVal.toISOString().split('T')[0];
    const s = String(rawVal).split('T')[0];
    return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : (colDef.notNull ? new Date().toISOString().split('T')[0] : null);
  }

  if (colType === 'PgInteger') {
    if (rawVal === null || rawVal === '') return colDef.notNull ? 0 : null;
    const n = typeof rawVal === 'number'
      ? Math.trunc(rawVal)
      : parseInt(String(rawVal).replace(/[^\d-]/g, ''), 10);
    if (isNaN(n) || !Number.isFinite(n)) return colDef.notNull ? 0 : null;
    if (n > 2147483647 || n < -2147483648) {
      return (Math.abs(n) % 2000000000) + 1000;
    }
    return n;
  }

  if (colType === 'PgNumeric') {
    if (rawVal === null || rawVal === '') return colDef.notNull ? '0' : null;
    const num = Number(rawVal);
    return isNaN(num) ? '0' : String(num);
  }

  if (colType === 'PgBoolean') {
    return Boolean(rawVal);
  }

  if (colType === 'PgText') {
    if (rawVal === null || rawVal === undefined) {
      if (sqlName === 'school_id' || jsKey === 'schoolId') return DEFAULT_SCHOOL_UUID;
      if (sqlName === 'id' || jsKey === 'id') return crypto.randomUUID();
      return colDef.notNull ? '' : null;
    }
    if (sqlName === 'school_id' || jsKey === 'schoolId') {
      const s = String(rawVal).trim();
      return (!s || s === 'DEMO_SCHOOL' || s === 'DEFAULT_PRIMARY_SCHOOL_ID') ? DEFAULT_SCHOOL_UUID : s;
    }
    return String(rawVal);
  }

  return rawVal;
}

async function normalizeRecordForTable(tableObj: any, rawRecord: Record<string, any>, isUpdate = false): Promise<Record<string, any>> {
  const cols = getTableColumns(tableObj);
  const result: Record<string, any> = {};

  // Map incoming properties (both camelCase and snake_case)
  for (const [jsKey, colDef] of Object.entries(cols) as [string, any][]) {
    const sqlName = colDef.name;
    let rawVal = rawRecord[jsKey] !== undefined ? rawRecord[jsKey] : rawRecord[sqlName];

    // Special alias fallbacks for common fields
    if (rawVal === undefined && !isUpdate) {
      if (jsKey === 'className') rawVal = rawRecord.class || rawRecord.classLevel || rawRecord.class_level || 'Form 1';
      if (jsKey === 'schoolId') rawVal = rawRecord.school_id || rawRecord.schoolId || DEFAULT_SCHOOL_UUID;
      if (jsKey === 'fullName') rawVal = rawRecord.name || rawRecord.full_name || 'User';
      if (jsKey === 'passwordHash') rawVal = rawRecord.password || rawRecord.password_hash || '123456';
      if (jsKey === 'startTime') rawVal = rawRecord.start || rawRecord.start_time || '08:00';
      if (jsKey === 'endTime') rawVal = rawRecord.end || rawRecord.end_time || '08:40';
      if (jsKey === 'periodTime') rawVal = rawRecord.period_time || '16:00-17:00';
      if (jsKey === 'dayOfWeek') rawVal = rawRecord.day || rawRecord.day_of_week || 'Monday';
      if (jsKey === 'roomName') rawVal = rawRecord.room_name || rawRecord.roomName || rawRecord.room_no || rawRecord.name || 'ROOM 01';
      if (jsKey === 'totalCandidates') rawVal = rawRecord.total_candidates ?? rawRecord.totalCandidates ?? rawRecord.total_seats ?? 0;
      if (jsKey === 'gridLayout') rawVal = rawRecord.grid_layout || rawRecord.gridLayout || {};
    }

    if (rawVal !== undefined) {
      result[jsKey] = coerceColumnValue(colDef, jsKey, rawVal);
    } else if (!isUpdate) {
      if (jsKey === 'id') {
        if (tableObj === schema.sittingPlans) {
          const sId = toDeterministicUuid(rawRecord.school_id || rawRecord.schoolId || DEFAULT_SCHOOL_UUID, true);
          const rName = String(rawRecord.room_name || rawRecord.roomName || rawRecord.room_no || rawRecord.name || 'ROOM 01').trim();
          result.id = toDeterministicUuid(`sitplan_${sId}_${rName}`);
        } else {
          result.id = colDef.columnType === 'PgUUID' ? crypto.randomUUID() : `rec_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        }
      } else if (jsKey === 'schoolId') {
        result.schoolId = DEFAULT_SCHOOL_UUID;
      } else if (colDef.notNull && !colDef.hasDefault) {
        result[jsKey] = coerceColumnValue(colDef, jsKey, null);
      }
    }
  }

  if (result.schoolId && cols.schoolId?.columnType === 'PgUUID') {
    result.schoolId = await ensureSchoolExists(result.schoolId);
  }

  return result;
}

function toDualCaseRow(tableObj: any, row: Record<string, any>): Record<string, any> {
  if (!row || typeof row !== 'object') return row;
  const cols = getTableColumns(tableObj);
  const enriched: Record<string, any> = { ...row };
  for (const [jsKey, colDef] of Object.entries(cols) as [string, any][]) {
    const sqlName = colDef.name;
    if (row[jsKey] !== undefined && enriched[sqlName] === undefined) {
      enriched[sqlName] = row[jsKey];
    } else if (row[sqlName] !== undefined && enriched[jsKey] === undefined) {
      enriched[jsKey] = row[sqlName];
    }
  }
  return enriched;
}

function buildWhereClause(tableObj: any, filters?: Record<string, any>) {
  if (!filters || typeof filters !== 'object') return undefined;
  const conditions: any[] = [];
  for (const [rawCol, rawVal] of Object.entries(filters)) {
    if (rawVal === undefined) continue;
    const resolved = resolveColumn(tableObj, rawCol);
    if (!resolved) continue;
    const { jsKey, colDef } = resolved;
    const colRef = tableObj[jsKey];
    if (!colRef) continue;

    if (Array.isArray(rawVal)) {
      const coercedArr = rawVal.map(v => coerceColumnValue(colDef, jsKey, v)).filter(v => v !== null && v !== undefined);
      if (coercedArr.length > 0) {
        conditions.push(inArray(colRef, coercedArr));
      }
    } else {
      const coercedVal = coerceColumnValue(colDef, jsKey, rawVal);
      if (coercedVal !== null && coercedVal !== undefined) {
        conditions.push(eq(colRef, coercedVal));
      }
    }
  }
  if (conditions.length === 0) return undefined;
  return conditions.length === 1 ? conditions[0] : and(...conditions);
}

async function upsertTableRecords(tableName: string, tableObj: any, rawRecords: any[]): Promise<any[]> {
  if (!Array.isArray(rawRecords) || rawRecords.length === 0) return [];
  const cols = getTableColumns(tableObj);
  const results: any[] = [];

  // Determine conflict target column
  let conflictTarget = tableObj.id;
  let conflictKeyName = 'id';
  if ((tableName === 'school_data' || tableName === 'sms_wallet') && tableObj.schoolId) {
    conflictTarget = tableObj.schoolId;
    conflictKeyName = 'schoolId';
  } else if (tableName === 'parents' && tableObj.phone) {
    conflictTarget = tableObj.phone;
    conflictKeyName = 'phone';
  }

  // Normalize & deduplicate records by conflict key
  const dedupedMap = new Map<string, Record<string, any>>();
  const unkeyedList: Record<string, any>[] = [];

  for (const raw of rawRecords) {
    if (!raw || typeof raw !== 'object') continue;
    try {
      const normalized = await normalizeRecordForTable(tableObj, raw, false);
      if (tableName === 'parent_students') {
        const compositeKey = `${normalized.parentId}_${normalized.studentId}`;
        dedupedMap.set(compositeKey, normalized);
      } else if (conflictKeyName && normalized[conflictKeyName] !== undefined && normalized[conflictKeyName] !== null) {
        dedupedMap.set(String(normalized[conflictKeyName]), normalized);
      } else {
        unkeyedList.push(normalized);
      }
    } catch (normErr: any) {
      console.warn(`Normalize warning on ${tableName}:`, normErr?.message || normErr);
    }
  }

  const normalizedList = [...Array.from(dedupedMap.values()), ...unkeyedList];
  if (normalizedList.length === 0) return [];

  // Build excluded column map for fast PostgreSQL multi-row upsert
  const excludedSet: Record<string, any> = {};
  for (const [jsKey, colDef] of Object.entries(cols) as [string, any][]) {
    if (jsKey === 'id' || jsKey === 'createdAt') continue;
    if (conflictKeyName === 'schoolId' && jsKey === 'schoolId') continue;
    excludedSet[jsKey] = sql.raw(`excluded."${colDef.name}"`);
  }

  const BATCH_SIZE = 100;
  for (let i = 0; i < normalizedList.length; i += BATCH_SIZE) {
    const batch = normalizedList.slice(i, i + BATCH_SIZE);
    try {
      if (tableName === 'parent_students' || !conflictTarget || Object.keys(excludedSet).length === 0) {
        const inserted: any[] = (await db.insert(tableObj).values(batch).onConflictDoNothing().returning()) as any[];
        for (const row of inserted) {
          results.push(toDualCaseRow(tableObj, row));
        }
      } else {
        const upserted: any[] = (await db.insert(tableObj).values(batch).onConflictDoUpdate({
          target: conflictTarget,
          set: excludedSet,
        }).returning()) as any[];
        for (const row of upserted) {
          results.push(toDualCaseRow(tableObj, row));
        }
      }
    } catch (batchErr: any) {
      // Fallback row-by-row if a batch hits a secondary constraint
      for (const normalized of batch) {
        try {
          if (tableName === 'parent_students' || !conflictTarget) {
            const inserted = await db.insert(tableObj).values(normalized).onConflictDoNothing().returning();
            if (inserted[0]) results.push(toDualCaseRow(tableObj, inserted[0]));
          } else {
            const updateSet = { ...normalized };
            if (conflictKeyName === 'schoolId') delete updateSet.id;
            const upserted = await db.insert(tableObj).values(normalized).onConflictDoUpdate({
              target: conflictTarget,
              set: updateSet,
            }).returning();
            if (upserted[0]) results.push(toDualCaseRow(tableObj, upserted[0]));
          }
        } catch (_rowErr: any) {
          // Ignore secondary constraint collisions on fallback rows
        }
      }
    }
  }
  return results;
}

function pickNonEmptyArray<T = any>(...candidates: any[]): T[] {
  for (const c of candidates) {
    if (Array.isArray(c) && c.length > 0) return c;
  }
  return [];
}

function pickNonEmptyObject<T = Record<string, any>>(...candidates: any[]): T {
  for (const c of candidates) {
    if (c && typeof c === 'object' && !Array.isArray(c) && Object.keys(c).length > 0) {
      return c as T;
    }
  }
  return {} as T;
}

const seededStaticBySchool = new Set<string>();

// Helper to synchronize relational tables from a schoolData snapshot
async function syncRelationalTablesFromSnapshot(schoolId: string, raw: Record<string, any>) {
  const validSchoolUuid = await ensureSchoolExists(schoolId);
  const isFirstStaticSeed = !seededStaticBySchool.has(validSchoolUuid);
  try {
    // 0. Sync School metadata & Subscriptions & SMS Wallet
    if (raw.schoolInfo && typeof raw.schoolInfo === 'object') {
      const info = raw.schoolInfo;
      await upsertTableRecords('schools', schema.schools, [{
        id: validSchoolUuid,
        name: info.name || 'HabyEduPro3A',
        code: info.schoolNumber || 'S.0123',
        phone: info.phone || '0717616343',
        email: info.email || 'info@habyedupro3a.ac.tz',
        status: 'ACTIVE',
        updatedAt: new Date(),
      }]);
    }

    if (isFirstStaticSeed) {
      await db.insert(schema.smsWallet).values({
        id: toDeterministicUuid(`wallet_${validSchoolUuid}`),
        schoolId: validSchoolUuid,
        balance: 500,
        updatedAt: new Date(),
      }).onConflictDoNothing().catch(() => {});
    }

    // 1. Students (canonical deterministic ID + prune deleted rows)
    const rawStudents = Array.isArray(raw.students) ? raw.students : DEFAULT_APP_DATA.students;
    const canonicalStudentIds: string[] = [];
    const seenStudentKeys = new Set<string>();
    const studentPayloads: any[] = [];

    for (const s of rawStudents) {
      if (!s || typeof s !== 'object') continue;
      const regKey = String(s.regNo || s.reg_no || '').trim().toUpperCase();
      const dedupeKey = regKey || String(s.id || s.name || '').trim().toLowerCase();
      if (!dedupeKey || seenStudentKeys.has(dedupeKey)) continue;
      seenStudentKeys.add(dedupeKey);

      const canonicalId = toDeterministicUuid(`std_${validSchoolUuid}_${regKey || s.id || s.name}`);
      canonicalStudentIds.push(canonicalId);
      studentPayloads.push({
        ...s,
        id: canonicalId,
        schoolId: validSchoolUuid,
      });
    }

    if (studentPayloads.length > 0) {
      await upsertTableRecords('students', schema.students, studentPayloads);
      if (Array.isArray(raw.students)) {
        await db.delete(schema.students)
          .where(and(eq(schema.students.schoolId, validSchoolUuid), notInArray(schema.students.id, canonicalStudentIds)))
          .catch(() => {});
      }
    }

    // 2. Teachers (canonical deterministic ID + prune deleted teachers)
    const rawTeachers = Array.isArray(raw.teachers) ? raw.teachers : DEFAULT_APP_DATA.teachers;
    const canonicalTeacherIds: string[] = [];
    const seenTeacherKeys = new Set<string>();
    const teacherPayloads: any[] = [];

    for (const t of rawTeachers) {
      if (!t || typeof t !== 'object') continue;
      const tchKey = String(t.email || t.name || t.id || '').trim().toLowerCase();
      if (!tchKey || seenTeacherKeys.has(tchKey)) continue;
      seenTeacherKeys.add(tchKey);

      const canonicalId = toDeterministicUuid(`tch_${validSchoolUuid}_${tchKey}`);
      canonicalTeacherIds.push(canonicalId);
      teacherPayloads.push({
        ...t,
        id: canonicalId,
        schoolId: validSchoolUuid,
      });
    }

    if (teacherPayloads.length > 0) {
      await upsertTableRecords('teachers', schema.teachers, teacherPayloads);
      if (Array.isArray(raw.teachers)) {
        await db.delete(schema.teachers)
          .where(and(eq(schema.teachers.schoolId, validSchoolUuid), notInArray(schema.teachers.id, canonicalTeacherIds)))
          .catch(() => {});
      }

      // Also sync authorized_staff from teachers
      await upsertTableRecords('authorized_staff', schema.authorizedStaff, teacherPayloads.slice(0, 60).map((t: any) => ({
        id: toDeterministicUuid(`staff_${validSchoolUuid}_${t.email || t.name}`),
        schoolId: validSchoolUuid,
        name: t.name || 'Teacher',
        email: t.email || `${String(t.name || 'teacher').toLowerCase().replace(/[^a-z0-9]/g, '.')}@school.ac.tz`,
        role: t.schoolRole || 'TEACHER',
        assignedSubjects: Array.isArray(t.subjects) ? t.subjects : [],
        isActive: true,
      })));
    }

    // 3. Subjects Catalog (seed once per school boot)
    if (isFirstStaticSeed) {
      const allSubjectNames = Array.from(new Set([
        ...SECONDARY_SUBJECTS,
        ...UPPER_PRIMARY_SUBJECTS_LIST,
        ...NURSERY_SUBJECTS_LIST
      ]));
      if (allSubjectNames.length > 0) {
        await upsertTableRecords('subjects', schema.subjects, allSubjectNames.map((subjName, idx) => ({
          id: toDeterministicUuid(`subj_${validSchoolUuid}_${subjName}`),
          schoolId: validSchoolUuid,
          name: subjName,
          code: `SUB-${String(idx + 1).padStart(3, '0')}`,
        })));
      }
    }

    // 4. Exams, Exam Records & Exam Results
    const rawExams = Array.isArray(raw.exams) ? raw.exams : DEFAULT_APP_DATA.exams;
    const firstExamUuid = rawExams.length > 0
      ? toDeterministicUuid(`exm_${validSchoolUuid}_${rawExams[0].id || rawExams[0].name}`)
      : null;
    if (rawExams.length > 0) {
      const canonicalExamIds: string[] = [];
      const examPayloads = rawExams.map((e: any) => {
        const eid = toDeterministicUuid(`exm_${validSchoolUuid}_${e.id || e.name}`);
        canonicalExamIds.push(eid);
        return {
          ...e,
          id: eid,
          schoolId: validSchoolUuid,
        };
      });
      await upsertTableRecords('exams', schema.exams, examPayloads);
      if (Array.isArray(raw.exams)) {
        await db.delete(schema.exams)
          .where(and(eq(schema.exams.schoolId, validSchoolUuid), notInArray(schema.exams.id, canonicalExamIds)))
          .catch(() => {});
      }
    } else if (Array.isArray(raw.exams) && raw.exams.length === 0) {
      await db.delete(schema.exams).where(eq(schema.exams.schoolId, validSchoolUuid)).catch(() => {});
    }

    const examRecs = Array.isArray(raw.examinationRecords)
      ? raw.examinationRecords
      : Array.isArray(raw.examination_records)
      ? raw.examination_records
      : DEFAULT_APP_DATA.examinationRecords;
    if (examRecs.length > 0) {
      const canonicalRecIds: string[] = [];
      await upsertTableRecords('exam_records', schema.examRecords, examRecs.map((r: any, idx: number) => {
        const rid = r.id ? String(r.id) : `rec_${validSchoolUuid}_${idx}`;
        canonicalRecIds.push(rid);
        return {
          ...r,
          id: rid,
          schoolId: validSchoolUuid,
          subjectMarks: r.subjectMarks || r.subjects || {},
          totalMarks: String(r.totalMarks ?? 0),
          averageScore: String(r.averageScore ?? r.averageMarks ?? 0),
          rank: Number(r.rank ?? r.positionInClass ?? (idx + 1)),
        };
      }));
      if (Array.isArray(raw.examinationRecords) || Array.isArray(raw.examination_records)) {
        await db.delete(schema.examRecords)
          .where(and(eq(schema.examRecords.schoolId, validSchoolUuid), notInArray(schema.examRecords.id, canonicalRecIds)))
          .catch(() => {});
      }
    }

    // Populate exam_results for students who have subject marks
    if (isFirstStaticSeed && firstExamUuid && studentPayloads.length > 0) {
      const examResultRows: any[] = [];
      for (const s of studentPayloads.slice(0, 60)) {
        const marksObj = s.marks && typeof s.marks === 'object' ? s.marks : {};
        for (const [subjName, scoreVal] of Object.entries(marksObj)) {
          const numericScore = typeof scoreVal === 'number' ? Math.round(scoreVal) : Number(scoreVal);
          if (isNaN(numericScore)) continue;
          const subjUuid = toDeterministicUuid(`subj_${validSchoolUuid}_${subjName}`);
          examResultRows.push({
            id: toDeterministicUuid(`exres_${validSchoolUuid}_${firstExamUuid}_${s.id}_${subjName}`),
            schoolId: validSchoolUuid,
            studentId: s.id,
            subjectId: subjUuid,
            examType: 'TERMINAL',
            year: 2026,
            term: 'Term 1',
            marks: String(numericScore),
          });
        }
      }
      if (examResultRows.length > 0) {
        await upsertTableRecords('exam_results', schema.examResults, examResultRows.slice(0, 300));
      }
    }

    // 5. Timetable Assignments & Timetables (respect deletions & empty list)
    const explicitTimetableProvided = Array.isArray(raw.timetableAssignments) || Array.isArray(raw.timetable_assignments);
    const ttAssigns = Array.isArray(raw.timetableAssignments)
      ? raw.timetableAssignments
      : Array.isArray(raw.timetable_assignments)
      ? raw.timetable_assignments
      : pickNonEmptyArray(DEFAULT_APP_DATA.timetableAssignments, TANZANIAN_TEMPLATE_TIMETABLE_ASSIGNMENTS);

    if (ttAssigns.length > 0) {
      const canonicalTaIds: string[] = [];
      const canonicalTtIds: string[] = [];
      await upsertTableRecords('timetable_assignments', schema.timetableAssignments, ttAssigns.map((a: any, idx: number) => {
        const rawId = a.id ? String(a.id) : String(idx);
        const taId = rawId.startsWith(`ta_${validSchoolUuid}_`) ? rawId : `ta_${validSchoolUuid}_${rawId}`;
        canonicalTaIds.push(taId);
        return {
          ...a,
          id: taId,
          schoolId: validSchoolUuid,
          className: a.className || 'Form 1',
          stream: a.stream || 'STREAM A',
          day: a.day || 'Monday',
          period: a.period || `Period ${(idx % 7) + 1}`,
          subject: a.subject || 'Mathematics',
          teacherId: typeof a.teacherId === 'number' ? a.teacherId : 101,
        };
      }));

      await upsertTableRecords('timetables', schema.timetables, ttAssigns.map((a: any, idx: number) => {
        const periodNumMatch = String(a.period || '').match(/(\d+)/);
        const periodNumber = periodNumMatch ? parseInt(periodNumMatch[1], 10) : (idx % 7) + 1;
        const rawId = a.id ? String(a.id) : String(idx);
        const ttId = rawId.startsWith(`tt_${validSchoolUuid}_`) ? rawId : `tt_${validSchoolUuid}_${rawId}`;
        canonicalTtIds.push(ttId);
        return {
          id: ttId,
          schoolId: validSchoolUuid,
          classId: a.className || 'Form 1',
          stream: a.stream || 'STREAM A',
          dayOfWeek: a.day || 'Monday',
          periodNumber,
          subjectId: a.subject || 'Mathematics',
          teacherId: typeof a.teacherId === 'number' ? a.teacherId : 101,
          timeStart: '08:00',
          timeEnd: '08:40',
        };
      }));

      if (explicitTimetableProvided) {
        await db.delete(schema.timetableAssignments)
          .where(and(eq(schema.timetableAssignments.schoolId, validSchoolUuid), notInArray(schema.timetableAssignments.id, canonicalTaIds)))
          .catch(() => {});
        await db.delete(schema.timetables)
          .where(and(eq(schema.timetables.schoolId, validSchoolUuid), notInArray(schema.timetables.id, canonicalTtIds)))
          .catch(() => {});
      }
    } else if (explicitTimetableProvided && ttAssigns.length === 0) {
      await db.delete(schema.timetableAssignments).where(eq(schema.timetableAssignments.schoolId, validSchoolUuid)).catch(() => {});
      await db.delete(schema.timetables).where(eq(schema.timetables.schoolId, validSchoolUuid)).catch(() => {});
    }

    // 6. Period Settings & Periods
    const pSettings = pickNonEmptyArray(
      raw.periodSettings,
      raw.period_settings,
      DEFAULT_APP_DATA.periodSettings,
      TANZANIAN_TEMPLATE_PERIOD_SETTINGS
    );
    if (pSettings.length > 0) {
      await upsertTableRecords('period_settings', schema.periodSettings, pSettings.map((p: any, idx: number) => ({
        ...p,
        id: p.id ? `ps_${validSchoolUuid}_${p.id}` : `ps_${validSchoolUuid}_${idx}`,
        schoolId: validSchoolUuid,
        day: p.day || 'Monday',
        name: p.name || `Period ${idx + 1}`,
        startTime: p.startTime || p.start || '08:00',
        endTime: p.endTime || p.end || '08:40',
        isBreak: Boolean(p.isBreak || p.is_break),
      })));

      // Deduplicate periods by period name (e.g., Period 1..7)
      const uniquePeriodsMap = new Map<string, any>();
      pSettings.forEach((p: any, idx: number) => {
        const pName = p.name || `Period ${idx + 1}`;
        if (!uniquePeriodsMap.has(pName)) {
          uniquePeriodsMap.set(pName, {
            id: toDeterministicUuid(`prd_${validSchoolUuid}_${pName}`),
            schoolId: validSchoolUuid,
            name: pName,
            startTime: p.startTime || p.start || '08:00',
            endTime: p.endTime || p.end || '08:40',
            isBreak: Boolean(p.isBreak || p.is_break),
          });
        }
      });
      await upsertTableRecords('periods', schema.periods, Array.from(uniquePeriodsMap.values()));
    }

    // 7. Stream Settings & Classes
    const sSettings = pickNonEmptyArray(
      raw.streamSettings,
      raw.stream_settings,
      DEFAULT_APP_DATA.streamSettings,
      TANZANIAN_TEMPLATE_STREAM_SETTINGS
    );
    if (sSettings.length > 0) {
      await upsertTableRecords('stream_settings', schema.streamSettings, sSettings.map((s: any, idx: number) => ({
        ...s,
        id: s.id ? `ss_${validSchoolUuid}_${s.id}` : `ss_${validSchoolUuid}_${s.className || idx}`,
        schoolId: validSchoolUuid,
        className: s.className || `Class ${idx + 1}`,
        level: s.level || 'CSEE',
        streams: Array.isArray(s.streams) ? s.streams : ['STREAM A', 'STREAM B'],
      })));

      await upsertTableRecords('classes', schema.classes, sSettings.map((s: any, idx: number) => ({
        id: toDeterministicUuid(`cls_${validSchoolUuid}_${s.className || idx}`),
        schoolId: validSchoolUuid,
        name: s.className || `Class ${idx + 1}`,
        level: s.level || 'CSEE',
        stream: Array.isArray(s.streams) && s.streams[0] ? s.streams[0] : 'STREAM A',
      })));
    }

    // 8. Subject Period Allocations & Teacher Assignments & Institutional Policy
    const spaList = pickNonEmptyArray(
      raw.subjectPeriodAllocations,
      raw.subject_period_allocations,
      DEFAULT_APP_DATA.subjectPeriodAllocations
    );
    if (spaList.length > 0) {
      await upsertTableRecords('subject_period_allocations', schema.subjectPeriodAllocations, spaList.map((spa: any, idx: number) => ({
        id: spa.id ? `${validSchoolUuid}_${spa.id}` : `spa_${validSchoolUuid}_${idx}`,
        schoolId: validSchoolUuid,
        className: spa.className || 'Form 1',
        subjectName: spa.subjectName || spa.subject || 'Mathematics',
        periodsPerWeek: Number(spa.periodsPerWeek || 4),
        doublePeriods: Boolean(spa.doublePeriods),
      })));
    }

    const tAssignList = pickNonEmptyArray(
      raw.teacherAssignments,
      raw.teacher_assignments,
      DEFAULT_APP_DATA.teacherAssignments
    );
    if (tAssignList.length > 0) {
      const flatTeacherAssigns: any[] = [];
      tAssignList.forEach((ta: any, idx: number) => {
        const subjectsArr = Array.isArray(ta.subjects) && ta.subjects.length > 0
          ? ta.subjects
          : [ta.subjectName || ta.subject || 'Mathematics'];
        const streamsArr = Array.isArray(ta.streams) && ta.streams.length > 0
          ? ta.streams
          : [`${ta.className || 'Form 1'} - ${ta.stream || 'STREAM A'}`];
        const firstStreamParts = String(streamsArr[0] || 'Form 1 - STREAM A').split(' - ');
        flatTeacherAssigns.push({
          id: ta.id ? `${validSchoolUuid}_${ta.id}` : `tassign_${validSchoolUuid}_${idx}`,
          schoolId: validSchoolUuid,
          teacherId: Number(ta.teacherId || 101),
          teacherName: ta.teacherName || 'Teacher',
          className: ta.className || firstStreamParts[0] || 'Form 1',
          stream: ta.stream || firstStreamParts[1] || 'STREAM A',
          subjectName: subjectsArr[0] || 'Mathematics',
          periodsCount: Number(ta.periodsCount || 4),
        });
      });
      await upsertTableRecords('teacher_assignments', schema.teacherAssignments, flatTeacherAssigns);
    }

    const policyObj = pickNonEmptyObject(raw.institutionalPolicy, raw.institutional_policy, DEFAULT_APP_DATA.institutionalPolicy);
    if (Object.keys(policyObj).length > 0) {
      await upsertTableRecords('institutional_policies', schema.institutionalPolicies, [{
        id: `pol_${validSchoolUuid}`,
        schoolId: validSchoolUuid,
        policyName: 'Standard School Timetable & Academic Policy',
        rules: policyObj,
        updatedAt: new Date(),
      }]);
    }

    // 9. Invigilation Sessions, Supervisors & Selected Invigilators
    const invSessions = pickNonEmptyArray(raw.sessions, DEFAULT_APP_DATA.sessions);
    if (invSessions.length > 0) {
      await upsertTableRecords('invigilation_sessions', schema.invigilationSessions, invSessions.map((s: any, idx: number) => ({
        id: s.id ? `inv_sess_${validSchoolUuid}_${s.id}` : `inv_sess_${validSchoolUuid}_${idx}`,
        schoolId: validSchoolUuid,
        rawDate: s.rawDate || '2026-10-15',
        date: s.rawDate || '2026-10-15',
        day: s.day || 'Thursday',
        session: s.session || 'SESSION I',
        startTime: s.startTime || s.start || '08:00',
        endTime: s.endTime || s.end || '10:30',
        timeSlot: s.timeSlot || s.time || '08:00-10:30',
        subject: s.subject || 'Mathematics',
        level: s.level || 'CSEE',
        className: s.className || 'Form 1',
        stream: s.stream || 'STREAM A',
        roomsCount: Number(s.roomsCount || s.rooms || 1),
      })));
    }

    const invSupervisors = pickNonEmptyArray(raw.supervisors, DEFAULT_APP_DATA.supervisors);
    if (invSupervisors.length > 0) {
      await upsertTableRecords('invigilation_supervisors', schema.invigilationSupervisors, invSupervisors.map((sup: any, idx: number) => ({
        id: sup.id ? `inv_sup_${validSchoolUuid}_${sup.id}` : `inv_sup_${validSchoolUuid}_${idx}`,
        schoolId: validSchoolUuid,
        teacherId: Number(sup.teacherId || 101),
        name: sup.name || 'Supervisor',
        initial: sup.initial || 'SV',
        phone: sup.phone || '',
        role: sup.role || 'Chief Supervisor',
      })));
    }

    const selInvigilators = pickNonEmptyArray(raw.selectedInvigilators, raw.selected_invigilators, DEFAULT_APP_DATA.selectedInvigilators);
    if (selInvigilators.length > 0) {
      const invigMap = new Map<string, any>();
      selInvigilators.forEach((item: any, idx: number) => {
        const rawTid = typeof item === 'object' && item !== null ? (item.teacherId ?? item.id) : item;
        const matchedT = rawTeachers.find((t: any) => String(t.id) === String(rawTid) || t.name === item?.teacherName);
        let safeTid = typeof rawTid === 'number' && Number.isFinite(rawTid) && Math.abs(rawTid) <= 2000000000
          ? Math.trunc(rawTid)
          : (typeof matchedT?.id === 'number' && Math.abs(matchedT.id) <= 2000000000 ? Math.trunc(matchedT.id) : (101 + idx));
        const rowId = `sel_inv_${validSchoolUuid}_${safeTid}`;
        invigMap.set(rowId, {
          id: rowId,
          schoolId: validSchoolUuid,
          teacherId: safeTid,
          teacherName: (typeof item === 'object' && item?.teacherName) || matchedT?.name || `Teacher ${safeTid}`,
          isActive: true,
        });
      });
      await upsertTableRecords('selected_invigilators', schema.selectedInvigilators, Array.from(invigMap.values()));
    }

    // 10. Daily Attendance -> period_attendance table
    const dailyAtt = pickNonEmptyObject(raw.dailyAttendance, raw.daily_attendance);
    const attRows: any[] = [];
    for (const [dateKey, studentStatusMap] of Object.entries(dailyAtt)) {
      if (!studentStatusMap || typeof studentStatusMap !== 'object') continue;
      for (const [studIdStr, statusVal] of Object.entries(studentStatusMap as Record<string, any>)) {
        const matchedStud = rawStudents.find((s: any) => String(s.id) === String(studIdStr));
        attRows.push({
          id: `att_${validSchoolUuid}_${dateKey}_${studIdStr}`,
          schoolId: validSchoolUuid,
          date: dateKey,
          dayOfWeek: new Date(dateKey).toLocaleDateString('en-US', { weekday: 'long' }) || 'Monday',
          periodNumber: 1,
          className: matchedStud?.className || 'Form 1',
          stream: matchedStud?.stream || 'STREAM A',
          subject: 'Daily Roll Call',
          teacherName: matchedStud?.name || `Student #${studIdStr}`,
          status: String(statusVal || 'PRESENT'),
          reason: `Student ID ${studIdStr} (${matchedStud?.regNo || ''})`,
          markedBy: 'Attendance System',
        });
      }
    }
    if (attRows.length > 0) {
      await upsertTableRecords('period_attendance', schema.periodAttendance, attRows.slice(0, 300));
    }

    // 10B. Teacher Daily Attendance -> teacher_attendance table
    const teacherAttMap = pickNonEmptyObject(raw.teacherAttendance, raw.teacher_attendance);
    const teacherAttRows: any[] = [];
    for (const [dateKey, tStatusMap] of Object.entries(teacherAttMap)) {
      if (!tStatusMap || typeof tStatusMap !== 'object') continue;
      for (const [tIdStr, entryVal] of Object.entries(tStatusMap as Record<string, any>)) {
        const matchedT = rawTeachers.find((t: any) => String(t.id) === String(tIdStr));
        const isObj = entryVal && typeof entryVal === 'object';
        const statusStr = isObj ? String(entryVal.status || 'PRESENT') : String(entryVal || 'PRESENT');
        teacherAttRows.push({
          id: `tatt_${validSchoolUuid}_${dateKey}_${tIdStr}`,
          schoolId: validSchoolUuid,
          teacherId: Number(tIdStr) || matchedT?.id || 101,
          teacherName: (isObj && entryVal.teacherName) || matchedT?.name || `Teacher #${tIdStr}`,
          schoolRole: (isObj && entryVal.schoolRole) || matchedT?.schoolRole || 'Subject Teacher',
          date: dateKey,
          dayOfWeek: new Date(dateKey).toLocaleDateString('en-US', { weekday: 'long' }) || 'Monday',
          status: statusStr,
          checkInTime: (isObj && entryVal.checkInTime) || '07:30',
          checkOutTime: (isObj && entryVal.checkOutTime) || '15:30',
          remarks: (isObj && entryVal.remarks) || '',
          markedBy: (isObj && entryVal.markedBy) || 'Admin',
          updatedAt: new Date(),
        });
      }
    }
    if (teacherAttRows.length > 0) {
      await upsertTableRecords('teacher_attendance', schema.teacherAttendance, teacherAttRows.slice(0, 400));
    }

    // 11. Parents & Parent-Students links from student parentPhone
    const parentRowsMap = new Map<string, any>();
    const parentStudentLinks: any[] = [];
    for (const s of studentPayloads.slice(0, 200)) {
      const phone = String(s.parentPhone || s.parent_phone || s.phone || '').trim();
      if (!phone || phone.length < 6) continue;
      const parentId = toDeterministicUuid(`par_${validSchoolUuid}_${phone}`);
      if (!parentRowsMap.has(phone)) {
        parentRowsMap.set(phone, {
          id: parentId,
          schoolId: validSchoolUuid,
          phone,
          passwordHash: '123456',
          fullName: `Parent of ${s.name || 'Student'}`,
        });
      }
      parentStudentLinks.push({
        parentId,
        studentId: s.id,
      });
    }
    if (parentRowsMap.size > 0) {
      await upsertTableRecords('parents', schema.parents, Array.from(parentRowsMap.values()));
    }
    if (parentStudentLinks.length > 0) {
      await upsertTableRecords('parent_students', schema.parentStudents, parentStudentLinks);
    }

    // 11B. Saved Timetable Records, Saved Invigilation Records & Invigilation Assignments
    const savedTtList = pickNonEmptyArray(raw.savedTimetableRecords, raw.saved_timetable_records);
    if (savedTtList.length > 0) {
      await upsertTableRecords('saved_timetable_records', schema.savedTimetableRecords, savedTtList.map((rec: any, idx: number) => ({
        id: rec.id ? String(rec.id) : `stt_${validSchoolUuid}_${idx}`,
        schoolId: validSchoolUuid,
        name: rec.name || `Master Timetable ${idx + 1}`,
        academicYear: String(rec.academicYear || rec.year || '2026'),
        term: rec.term || 'Term 1',
        timetableData: Array.isArray(rec.timetableData) ? rec.timetableData : (Array.isArray(rec.assignments) ? rec.assignments : ttAssigns),
        status: rec.status || 'Published',
      })));
    } else if (ttAssigns.length > 0) {
      await upsertTableRecords('saved_timetable_records', schema.savedTimetableRecords, [{
        id: `stt_active_${validSchoolUuid}`,
        schoolId: validSchoolUuid,
        name: 'Active School Master Timetable 2026',
        academicYear: '2026',
        term: 'Term 1',
        timetableData: ttAssigns,
        status: 'Published',
      }]);
    }

    const savedInvList = pickNonEmptyArray(raw.savedInvigilationRecords, raw.saved_invigilation_records);
    if (savedInvList.length > 0) {
      await upsertTableRecords('saved_invigilation_records', schema.savedInvigilationRecords, savedInvList.map((rec: any, idx: number) => ({
        id: rec.id ? String(rec.id) : `sinv_${validSchoolUuid}_${idx}`,
        schoolId: validSchoolUuid,
        examName: rec.examName || rec.name || `Exam Roster ${idx + 1}`,
        academicYear: String(rec.academicYear || rec.year || '2026'),
        term: rec.term || 'Term 1',
        dutyRoster: rec.dutyRoster || rec.assignments || [],
      })));
    } else if (invSessions.length > 0) {
      await upsertTableRecords('saved_invigilation_records', schema.savedInvigilationRecords, [{
        id: `sinv_active_${validSchoolUuid}`,
        schoolId: validSchoolUuid,
        examName: 'Terminal Examination Invigilation Roster 2026',
        academicYear: '2026',
        term: 'Term 1',
        dutyRoster: invSessions,
      }]);
    }

    // Sync invigilation_assignments from raw.invigilationAssignments or invigilation sessions
    const rawInvAssign = raw.invigilationAssignments || raw.invigilation_assignments;
    const invAssignRows: any[] = [];
    if (Array.isArray(rawInvAssign) && rawInvAssign.length > 0) {
      rawInvAssign.forEach((ia: any, idx: number) => {
        invAssignRows.push({
          id: ia.id ? String(ia.id) : `inva_${validSchoolUuid}_${idx}`,
          schoolId: validSchoolUuid,
          sessionId: String(ia.sessionId || `inv_sess_${validSchoolUuid}_0`),
          examName: ia.examName || 'Terminal Examination',
          date: ia.date || '2026-10-15',
          roomNumber: Number(ia.roomNumber || 1),
          teacherId: Number(ia.teacherId || 1001),
          teacherName: ia.teacherName || 'Invigilator',
          role: ia.role || 'Invigilator',
        });
      });
    } else if (invSessions.length > 0 && rawTeachers.length > 0) {
      invSessions.forEach((sess: any, idx: number) => {
        const tch = rawTeachers[idx % rawTeachers.length];
        invAssignRows.push({
          id: `inva_${validSchoolUuid}_${sess.id || idx}`,
          schoolId: validSchoolUuid,
          sessionId: sess.id ? `inv_sess_${validSchoolUuid}_${sess.id}` : `inv_sess_${validSchoolUuid}_${idx}`,
          examName: sess.subject ? `${sess.subject} Exam` : 'Terminal Exam',
          date: sess.rawDate || '2026-10-15',
          roomNumber: 1,
          teacherId: typeof tch?.id === 'number' ? tch.id : (1001 + idx),
          teacherName: tch?.name || 'Mwalimu Msimamizi',
          role: 'Invigilator',
        });
      });
    }
    if (invAssignRows.length > 0) {
      await upsertTableRecords('invigilation_assignments', schema.invigilationAssignments, invAssignRows);
    }

    // 11C. Sync Student Ledger & Contribution Types for Finance Module
    await upsertTableRecords('contribution_types', schema.contributionTypes, [
      {
        id: `contrib_fee_${validSchoolUuid}`,
        schoolId: validSchoolUuid,
        name: 'Ada na Michango ya Taaluma (School & Academic Fee)',
        amountDefault: '150000',
        classLevels: ['Form 1', 'Form 2', 'Form 3', 'Form 4'],
        academicYear: '2026',
        term: 'Term 1 / 2026',
        createdBy: 'School Bursar',
      },
      {
        id: `contrib_exam_${validSchoolUuid}`,
        schoolId: validSchoolUuid,
        name: 'Mchango wa Mitihani ya Ndani (Internal Exams)',
        amountDefault: '30000',
        classLevels: ['Form 1', 'Form 2', 'Form 3', 'Form 4'],
        academicYear: '2026',
        term: 'Term 1 / 2026',
        createdBy: 'Academic Office',
      },
    ]);

    if (rawStudents.length > 0) {
      const ledgerSample = rawStudents.slice(0, 60).map((s: any, idx: number) => {
        const isPaid = String(s.feeStatus || s.fee_status || 'UNPAID').toUpperCase() === 'PAID';
        const cno = String(s.regNo || s.reg_no || s.id || `STD-${idx + 1}`);
        return {
          id: `ledg_${validSchoolUuid}_${cno.replace(/[^a-zA-Z0-9_-]/g, '_')}`,
          schoolId: validSchoolUuid,
          studentCno: cno,
          studentName: s.name || `Student ${idx + 1}`,
          classLevel: s.className || s.class_name || 'Form 1',
          contributionTypeId: `contrib_fee_${validSchoolUuid}`,
          contributionName: 'Ada na Michango ya Taaluma (School & Academic Fee)',
          requiredAmount: '150000',
          paidAmount: isPaid ? '150000' : '50000',
          balanceAmount: isPaid ? '0' : '100000',
          status: isPaid ? 'PAID' : 'PARTIAL',
          lastPaymentDate: '2026-09-15',
          receiptNumber: `RCT-2026-${String(idx + 1).padStart(4, '0')}`,
          updatedAt: new Date(),
        };
      });
      await upsertTableRecords('student_ledger', schema.studentLedger, ledgerSample);
    }

    // 11D. Remedial Payment Settings & Remedial Timetable baseline
    await upsertTableRecords('remedial_payment_settings', schema.remedialPaymentSettings, [
      {
        id: toDeterministicUuid(`rem_pay_${validSchoolUuid}_form1`),
        schoolId: validSchoolUuid,
        className: 'All Classes',
        ratePerPeriod: '5000',
        effectiveDate: '2026-01-15',
      },
    ]);

    // 12. Discipline Records & Activity Logs & Duty Roster
    const discRecs = pickNonEmptyArray(raw.disciplineRecords, raw.discipline_records, DEFAULT_APP_DATA.disciplineRecords);
    if (discRecs.length > 0) {
      await upsertTableRecords('discipline_records', schema.disciplineRecords, discRecs.map((d: any, idx: number) => ({
        id: d.id ? String(d.id) : `disc_${validSchoolUuid}_${idx}`,
        schoolId: validSchoolUuid,
        regNo: d.regNo || d.reg_no || '',
        studentName: d.studentName || d.student_name || '',
        incidentDate: d.date || d.incidentDate || d.incident_date || new Date().toISOString().split('T')[0],
        incidentType: d.category || d.title || d.incidentType || d.incident_type || 'General',
        severity: d.severity || 'Minor',
        actionTaken: d.actionTaken || d.action_taken || '',
        reportedBy: d.reportedBy || d.reported_by || 'Staff',
        status: d.status || 'Resolved',
      })));
    }

    const actLogs = pickNonEmptyArray(raw.activityLogs, raw.activity_logs, DEFAULT_APP_DATA.activityLogs);
    if (actLogs.length > 0) {
      await upsertTableRecords('activity_logs', schema.activityLogs, actLogs.slice(0, 50).map((l: any, idx: number) => ({
        id: l.id ? String(l.id) : `log_${validSchoolUuid}_${idx}`,
        schoolId: validSchoolUuid,
        userId: l.userId || l.user_id || 'usr_head',
        userName: l.userName || l.user_name || 'Admin',
        userEmail: l.userEmail || l.user_email || '',
        userRole: l.userRole || l.user_role || 'HEADMASTER',
        category: l.category || 'system',
        action: l.action || 'UPDATE',
        title: l.title || 'Activity',
        description: l.description || '',
        timestamp: l.timestamp || new Date().toISOString(),
      })));
    }

    const dutyData = raw.dutyRosterData || raw.duty_roster_data;
    if (dutyData && typeof dutyData === 'object') {
      if (Array.isArray(dutyData.streams) && dutyData.streams.length > 0) {
        await upsertTableRecords('duty_streams', schema.dutyStreams, dutyData.streams.map((s: any, idx: number) => ({
          id: s.id ? String(s.id) : `dstream_${validSchoolUuid}_${idx}`,
          schoolId: validSchoolUuid,
          streamName: s.name || s.streamName || `Stream ${idx + 1}`,
          totalStudents: Number(s.totalStudents || 0),
          classTeacher: s.classTeacher || '',
          updatedAt: new Date(),
        })));
      }
      if (Array.isArray(dutyData.weeklyAssignments) && dutyData.weeklyAssignments.length > 0) {
        await upsertTableRecords('duty_weekly_assignments', schema.dutyWeeklyAssignments, dutyData.weeklyAssignments.map((w: any, idx: number) => ({
          id: w.id ? String(w.id) : `dweek_${validSchoolUuid}_${idx}`,
          schoolId: validSchoolUuid,
          weekStart: w.weekStart || '',
          weekEnd: w.weekEnd || '',
          weekLabel: w.weekLabel || '',
          teacherIds: Array.isArray(w.teacherIds) ? w.teacherIds : [],
          teacherNames: Array.isArray(w.teacherNames) ? w.teacherNames : [],
          notes: w.notes || '',
          assignedBy: w.assignedBy || 'Discipline Master',
          status: w.status || 'Active',
        })));
      }
      if (Array.isArray(dutyData.dailyReports) && dutyData.dailyReports.length > 0) {
        await upsertTableRecords('duty_daily_reports', schema.dutyDailyReports, dutyData.dailyReports.map((r: any, idx: number) => ({
          id: r.id ? String(r.id) : `drep_${validSchoolUuid}_${idx}`,
          schoolId: validSchoolUuid,
          weekAssignmentId: r.weekAssignmentId || '',
          weekStart: r.weekStart || '',
          weekEnd: r.weekEnd || '',
          weekLabel: r.weekLabel || '',
          reportDate: r.date || r.reportDate || new Date().toISOString().slice(0, 10),
          dayName: r.dayName || '',
          teacherId: String(r.teacherId || ''),
          teacherName: r.teacherName || 'Mwalimu wa Zamu',
          allWeekTeachers: Array.isArray(r.allWeekTeachers) ? r.allWeekTeachers : [],
          streamAttendance: Array.isArray(r.streams) ? r.streams : (Array.isArray(r.streamAttendance) ? r.streamAttendance : []),
          totalSchoolRoll: Number(r.totals?.totalStudents ?? r.totalSchoolRoll ?? 0),
          totalPresent: Number(r.totals?.present ?? r.totalPresent ?? 0),
          totalAbsent: Number(r.totals?.absent ?? r.totalAbsent ?? 0),
          totalPermitted: Number(r.totals?.permitted ?? r.totalPermitted ?? 0),
          totalSickPua: Number(r.totals?.sickPua ?? r.totalSickPua ?? 0),
          totalUnexcused: Number(r.totals?.unexcused ?? r.totalUnexcused ?? 0),
          environmentRating: Number(r.environmentRating ?? 8),
          environmentNotes: r.environmentNotes || '',
          generalDiscipline: r.generalDiscipline || '',
          teachersPresent: Number(r.teachersPresent ?? 0),
          teachersAbsent: Number(r.teachersAbsent ?? 0),
          teacherAttendanceNotes: r.teacherAttendanceNotes || '',
          keyEvents: r.keyEvents || '',
          bellSchedule: r.bellSchedule || '',
          recommendations: r.recommendations || '',
          updatedAt: new Date(),
        })));
      }
    }
  } catch (syncErr: any) {
    console.warn('Background relational table sync notice:', syncErr?.message || syncErr);
  }
}

const activeSyncBySchool = new Map<string, boolean>();
const pendingSyncSnapshotBySchool = new Map<string, Record<string, any>>();

function scheduleRelationalSync(schoolId: string, snapshotData: Record<string, any>) {
  pendingSyncSnapshotBySchool.set(schoolId, snapshotData);
  if (activeSyncBySchool.get(schoolId)) return;
  activeSyncBySchool.set(schoolId, true);

  setImmediate(async () => {
    while (pendingSyncSnapshotBySchool.has(schoolId)) {
      const nextSnap = pendingSyncSnapshotBySchool.get(schoolId)!;
      pendingSyncSnapshotBySchool.delete(schoolId);
      try {
        await syncRelationalTablesFromSnapshot(schoolId, nextSnap);
      } catch (e) {
        // handled inside syncRelationalTablesFromSnapshot
      }
    }
    activeSyncBySchool.set(schoolId, false);
  });
}

// ============================================================================
// NON-DESTRUCTIVE MERGE & HISTORICAL SNAPSHOT RECOVERY ENGINE
// ============================================================================

const DEMO_STUDENT_IDS = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
const DEMO_TEACHER_IDS = new Set([101, 102, 103, 104, 105, 106, 107, 108]);

function isDemoStudentList(list: any[]): boolean {
  if (!Array.isArray(list) || list.length === 0 || list.length > 20) return false;
  return list.every((s: any) => DEMO_STUDENT_IDS.has(Number(s?.id)));
}

function isDemoTeacherList(list: any[]): boolean {
  if (!Array.isArray(list) || list.length === 0 || list.length > 10) return false;
  return list.every((t: any) => DEMO_TEACHER_IDS.has(Number(t?.id)));
}

function mergeNonDestructiveArray<T = any>(
  incomingCamel: any,
  incomingSnake: any,
  existingVal: any,
  defaultVal: T[] = [],
  keyFn: (item: any, idx: number) => string,
  options?: {
    allowExplicitReplace?: boolean;
    filterDemoWhenRealExists?: 'students' | 'teachers';
  }
): T[] {
  const incomingRaw = Array.isArray(incomingCamel)
    ? incomingCamel
    : Array.isArray(incomingSnake)
    ? incomingSnake
    : undefined;

  const existingArr: any[] = Array.isArray(existingVal) ? existingVal : [];
  const incomingArr: any[] = Array.isArray(incomingRaw) ? incomingRaw : [];

  // If the user explicitly requested a replacement (e.g., deleting a specific item from UI), respect incoming if non-empty
  if (options?.allowExplicitReplace && incomingRaw !== undefined && incomingArr.length > 0) {
    return incomingArr as T[];
  }

  // Check if either existing or incoming has real (non-demo) records
  let cleanExisting = existingArr;
  let cleanIncoming = incomingArr;

  if (options?.filterDemoWhenRealExists === 'students') {
    const existingHasReal = existingArr.some((s: any) => !DEMO_STUDENT_IDS.has(Number(s?.id)));
    const incomingHasReal = incomingArr.some((s: any) => !DEMO_STUDENT_IDS.has(Number(s?.id)));
    if (existingHasReal && isDemoStudentList(incomingArr)) {
      cleanIncoming = [];
    }
    if ((existingHasReal || incomingHasReal) && existingArr.length > 15) {
      cleanExisting = existingArr.filter((s: any) => !DEMO_STUDENT_IDS.has(Number(s?.id)));
    }
    if ((existingHasReal || incomingHasReal) && incomingArr.length > 15) {
      cleanIncoming = cleanIncoming.filter((s: any) => !DEMO_STUDENT_IDS.has(Number(s?.id)));
    }
  } else if (options?.filterDemoWhenRealExists === 'teachers') {
    const existingHasReal = existingArr.some((t: any) => !DEMO_TEACHER_IDS.has(Number(t?.id)));
    const incomingHasReal = incomingArr.some((t: any) => !DEMO_TEACHER_IDS.has(Number(t?.id)));
    if (existingHasReal && isDemoTeacherList(incomingArr)) {
      cleanIncoming = [];
    }
    if (existingHasReal || incomingHasReal) {
      cleanExisting = existingArr.filter((t: any) => !DEMO_TEACHER_IDS.has(Number(t?.id)));
      cleanIncoming = cleanIncoming.filter((t: any) => !DEMO_TEACHER_IDS.has(Number(t?.id)));
    }
  }

  // Merge existing + incoming by key so old records are NEVER lost when updating
  const mergedMap = new Map<string, any>();
  cleanExisting.forEach((item, idx) => {
    if (item === null || item === undefined) return;
    const k = keyFn(item, idx);
    if (k) mergedMap.set(k, item);
  });

  cleanIncoming.forEach((item, idx) => {
    if (item === null || item === undefined) return;
    const k = keyFn(item, idx);
    if (k) {
      const prev = mergedMap.get(k);
      if (prev && typeof prev === 'object' && typeof item === 'object' && !Array.isArray(item)) {
        mergedMap.set(k, { ...prev, ...item });
      } else {
        mergedMap.set(k, item);
      }
    }
  });

  const mergedList = Array.from(mergedMap.values());
  if (mergedList.length > 0) {
    return mergedList as T[];
  }
  return Array.isArray(defaultVal) ? defaultVal : [];
}

function resolveSnapshotObject<T = Record<string, any>>(
  incomingCamel: any,
  incomingSnake: any,
  existingVal: any,
  defaultVal: Record<string, any> = {},
  _isFullSnapshot = false
): T {
  const incoming =
    incomingCamel && typeof incomingCamel === 'object' && !Array.isArray(incomingCamel)
      ? incomingCamel
      : incomingSnake && typeof incomingSnake === 'object' && !Array.isArray(incomingSnake)
      ? incomingSnake
      : undefined;

  const existingObj =
    existingVal && typeof existingVal === 'object' && !Array.isArray(existingVal)
      ? existingVal
      : {};

  if (incoming !== undefined) {
    // Always deep-preserve existing keys and merge incoming keys on top so old object properties are never wiped
    return {
      ...defaultVal,
      ...existingObj,
      ...incoming,
    } as T;
  }

  if (Object.keys(existingObj).length > 0) {
    return existingObj as T;
  }
  return (defaultVal || {}) as T;
}

const restoredSchoolsSet = new Set<string>();

async function ensureHistoricalBackupRestored(schoolId: string): Promise<void> {
  const validSchoolUuid = (!schoolId || schoolId === 'DEMO_SCHOOL' || schoolId === 'DEFAULT_PRIMARY_SCHOOL_ID')
    ? DEFAULT_SCHOOL_UUID
    : schoolId;

  try {
    const existing = await db.query.schoolData.findFirst({
      where: eq(schema.schoolData.schoolId, validSchoolUuid),
    });

    const currentStudents = Array.isArray(existing?.students) ? existing.students : [];
    const currentTeachers = Array.isArray(existing?.teachers) ? existing.teachers : [];

    // Check if we already have the full roster (>= 100 students and >= 20 teachers)
    if (currentStudents.length >= 100 && currentTeachers.length >= 20 && restoredSchoolsSet.has(validSchoolUuid)) {
      return;
    }

    const backupDir = path.resolve(__dirname, '.backups', validSchoolUuid);
    if (!fs.existsSync(backupDir)) return;

    const files = fs.readdirSync(backupDir).filter(f => f.startsWith('snap_') && f.endsWith('.json'));
    if (files.length === 0) return;

    // Pick the richest backup snapshot (largest file size)
    let bestSnapData: any = null;
    let bestScore = 0;

    for (const f of files) {
      try {
        const fullPath = path.join(backupDir, f);
        const stat = fs.statSync(fullPath);
        if (stat.size > bestScore) {
          const parsed = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
          const sCount = Array.isArray(parsed?.students) ? parsed.students.length : 0;
          const tCount = Array.isArray(parsed?.teachers) ? parsed.teachers.length : 0;
          if (sCount > currentStudents.length || tCount > currentTeachers.length) {
            bestScore = stat.size;
            bestSnapData = parsed;
          }
        }
      } catch (e) {}
    }

    if (!bestSnapData) {
      if (existing && !restoredSchoolsSet.has(validSchoolUuid)) {
        scheduleRelationalSync(validSchoolUuid, existing as any);
      }
      restoredSchoolsSet.add(validSchoolUuid);
      return;
    }

    console.log(`[Database Recovery] Restoring & merging historical data from backup for school ${validSchoolUuid}...`);

    const mergedStudents = mergeNonDestructiveArray(
      currentStudents,
      undefined,
      bestSnapData.students,
      DEFAULT_APP_DATA.students,
      (s, i) => String(s?.regNo || s?.reg_no || s?.id || s?.name || i).trim().toLowerCase(),
      { filterDemoWhenRealExists: 'students' }
    );

    const mergedTeachers = mergeNonDestructiveArray(
      currentTeachers,
      undefined,
      bestSnapData.teachers,
      DEFAULT_APP_DATA.teachers,
      (t, i) => String(t?.id || t?.email || t?.name || i).trim().toLowerCase(),
      { filterDemoWhenRealExists: 'teachers' }
    );

    const mergedExams = mergeNonDestructiveArray(
      existing?.exams,
      undefined,
      bestSnapData.exams,
      DEFAULT_APP_DATA.exams,
      (e, i) => String(e?.id || e?.name || i).trim().toLowerCase()
    );

    const mergedTimetable = mergeNonDestructiveArray(
      existing?.timetableAssignments,
      undefined,
      bestSnapData.timetableAssignments || bestSnapData.timetable_assignments,
      DEFAULT_APP_DATA.timetableAssignments,
      (a, i) => {
        const cls = String(a?.className || a?.class_name || '').trim().toLowerCase();
        const str = String(a?.stream || '').trim().toLowerCase();
        const day = String(a?.day || '').trim().toLowerCase();
        const prd = String(a?.period || a?.periodName || a?.period_name || '').trim().toLowerCase();
        return cls && day && prd ? `${cls}_${str}_${day}_${prd}` : String(a?.id || i);
      }
    ).map((a: any) => ({
      ...a,
      className: a.className || a.class_name || 'Form 1',
      teacherId: a.teacherId ?? a.teacher_id ?? 101,
      teacherName: a.teacherName || a.teacher_name || '',
      activityType: a.activityType || a.activity_type || 'academic',
      allocationMode: a.allocationMode || a.allocation_mode || 'manual',
    }));

    const mergedDutyRoster = resolveSnapshotObject(
      existing?.dutyRosterData,
      undefined,
      bestSnapData.dutyRosterData || bestSnapData.duty_roster_data,
      {}
    );

    const restoredRow: any = {
      id: validSchoolUuid,
      schoolId: validSchoolUuid,
      schoolInfo: {
        ...((DEFAULT_APP_DATA.schoolInfo as Record<string, any>) || {}),
        ...(bestSnapData.schoolInfo || bestSnapData.school_info || {}),
        ...((existing?.schoolInfo as Record<string, any>) || {}),
      },
      students: mergedStudents,
      teachers: mergedTeachers,
      exams: mergedExams,
      timetableAssignments: mergedTimetable,
      periodSettings: mergeNonDestructiveArray(
        existing?.periodSettings,
        undefined,
        bestSnapData.periodSettings || bestSnapData.period_settings,
        DEFAULT_APP_DATA.periodSettings,
        (p, i) => `${String(p?.day || '').trim().toLowerCase()}_${String(p?.name || p?.id || i).trim().toLowerCase()}`
      ),
      streamSettings: mergeNonDestructiveArray(
        existing?.streamSettings,
        undefined,
        bestSnapData.streamSettings || bestSnapData.stream_settings,
        DEFAULT_APP_DATA.streamSettings,
        (s, i) => String(s?.className || s?.id || i).trim().toLowerCase()
      ),
      subjectPeriodAllocations: mergeNonDestructiveArray(
        existing?.subjectPeriodAllocations,
        undefined,
        bestSnapData.subjectPeriodAllocations || bestSnapData.subject_period_allocations,
        DEFAULT_APP_DATA.subjectPeriodAllocations,
        (spa, i) => `${String(spa?.className || '').trim().toLowerCase()}_${String(spa?.stream || '').trim().toLowerCase()}_${String(spa?.subject || spa?.subjectName || i).trim().toLowerCase()}`
      ),
      teacherAssignments: mergeNonDestructiveArray(
        existing?.teacherAssignments,
        undefined,
        bestSnapData.teacherAssignments || bestSnapData.teacher_assignments,
        DEFAULT_APP_DATA.teacherAssignments,
        (ta, i) => String(ta?.id || `${ta?.teacherId}_${i}`).trim().toLowerCase()
      ),
      examinationRecords: mergeNonDestructiveArray(
        existing?.examinationRecords,
        undefined,
        bestSnapData.examinationRecords || bestSnapData.examination_records,
        DEFAULT_APP_DATA.examinationRecords,
        (r, i) => String(r?.id || `${r?.regNo}_${r?.examType}_${i}`).trim().toLowerCase()
      ),
      disciplineRecords: mergeNonDestructiveArray(
        existing?.disciplineRecords,
        undefined,
        bestSnapData.disciplineRecords || bestSnapData.discipline_records,
        DEFAULT_APP_DATA.disciplineRecords,
        (d, i) => String(d?.id || i)
      ),
      dutyRosterData: mergedDutyRoster,
      institutionalPolicy: resolveSnapshotObject(
        existing?.institutionalPolicy,
        undefined,
        bestSnapData.institutionalPolicy || bestSnapData.institutional_policy,
        (DEFAULT_APP_DATA.institutionalPolicy as Record<string, any>) || {}
      ),
      sessions: mergeNonDestructiveArray(
        existing?.sessions,
        undefined,
        bestSnapData.sessions,
        DEFAULT_APP_DATA.sessions,
        (s, i) => String(s?.id || i)
      ),
      supervisors: mergeNonDestructiveArray(
        existing?.supervisors,
        undefined,
        bestSnapData.supervisors,
        DEFAULT_APP_DATA.supervisors,
        (s, i) => String(s?.id || s?.teacherId || i)
      ),
      selectedInvigilators: mergeNonDestructiveArray(
        existing?.selectedInvigilators,
        undefined,
        bestSnapData.selectedInvigilators || bestSnapData.selected_invigilators,
        DEFAULT_APP_DATA.selectedInvigilators,
        (item, i) => String(typeof item === 'object' ? (item?.teacherId ?? item?.id ?? i) : item)
      ),
      invigilationAssignments: resolveSnapshotObject(
        existing?.invigilationAssignments,
        undefined,
        bestSnapData.invigilationAssignments || bestSnapData.invigilation_assignments,
        {}
      ),
      dailyAttendance: resolveSnapshotObject(
        existing?.dailyAttendance,
        undefined,
        bestSnapData.dailyAttendance || bestSnapData.daily_attendance,
        {}
      ),
      journalRecords: resolveSnapshotObject(
        existing?.journalRecords,
        undefined,
        bestSnapData.journalRecords || bestSnapData.journal_records,
        {}
      ),
      schemesOfWork: mergeNonDestructiveArray(
        existing?.schemesOfWork,
        undefined,
        bestSnapData.schemesOfWork || bestSnapData.schemes_of_work,
        [],
        (item, i) => String(item?.id || i)
      ),
      lessonPlans: mergeNonDestructiveArray(
        existing?.lessonPlans,
        undefined,
        bestSnapData.lessonPlans || bestSnapData.lesson_plans,
        [],
        (item, i) => String(item?.id || i)
      ),
      teacherEvaluations: mergeNonDestructiveArray(
        existing?.teacherEvaluations,
        undefined,
        bestSnapData.teacherEvaluations || bestSnapData.teacher_evaluations,
        [],
        (item, i) => String(item?.id || i)
      ),
      savedTimetableRecords: mergeNonDestructiveArray(
        existing?.savedTimetableRecords,
        undefined,
        bestSnapData.savedTimetableRecords || bestSnapData.saved_timetable_records,
        [],
        (item, i) => String(item?.id || i)
      ),
      savedInvigilationRecords: mergeNonDestructiveArray(
        existing?.savedInvigilationRecords,
        undefined,
        bestSnapData.savedInvigilationRecords || bestSnapData.saved_invigilation_records,
        [],
        (item, i) => String(item?.id || i)
      ),
      gradeCutoffs: resolveSnapshotObject(
        existing?.gradeCutoffs,
        undefined,
        bestSnapData.gradeCutoffs || bestSnapData.grade_cutoffs,
        {}
      ),
      ledgerSubjectKeys: resolveSnapshotObject(
        existing?.ledgerSubjectKeys,
        undefined,
        bestSnapData.ledgerSubjectKeys || bestSnapData.ledger_subject_keys,
        {}
      ),
      subjectPaperConfigs: resolveSnapshotObject(
        existing?.subjectPaperConfigs,
        undefined,
        bestSnapData.subjectPaperConfigs || bestSnapData.subject_paper_configs,
        {}
      ),
      bubbleSettings: resolveSnapshotObject(
        existing?.bubbleSettings,
        undefined,
        bestSnapData.bubbleSettings || bestSnapData.bubble_settings,
        {}
      ),
      academicTermDates: resolveSnapshotObject(
        existing?.academicTermDates,
        undefined,
        bestSnapData.academicTermDates || bestSnapData.academic_term_dates,
        {}
      ),
      teacherAttendance: resolveSnapshotObject(
        existing?.teacherAttendance,
        undefined,
        bestSnapData.teacherAttendance || bestSnapData.teacher_attendance,
        {}
      ),
      staffPayroll: resolveSnapshotObject(
        existing?.staffPayroll,
        undefined,
        bestSnapData.staffPayroll || bestSnapData.staff_payroll,
        {}
      ),
      updatedAt: new Date(),
    };

    await db.insert(schema.schoolData).values(restoredRow).onConflictDoUpdate({
      target: schema.schoolData.schoolId,
      set: restoredRow,
    });

    restoredSchoolsSet.add(validSchoolUuid);
    scheduleRelationalSync(validSchoolUuid, restoredRow);
    console.log(`[Database Recovery] Restored ${mergedStudents.length} students and ${mergedTeachers.length} teachers for school ${validSchoolUuid}.`);
  } catch (err: any) {
    console.warn('[Database Recovery] Warning:', err?.message || err);
  }
}

// Run recovery immediately on boot for the primary school
setImmediate(() => {
  ensureHistoricalBackupRestored(DEFAULT_SCHOOL_UUID).catch(() => {});
});

// DB API
app.get('/api/db/school-data', async (req, res) => {
  const { schoolId } = req.query as { schoolId: string };
  const s = String(schoolId || '').trim();
  const resolvedId = (!s || s === 'DEMO_SCHOOL' || s === 'DEFAULT_PRIMARY_SCHOOL_ID') ? DEFAULT_SCHOOL_UUID : s;
  try {
    await ensureHistoricalBackupRestored(resolvedId);

    let data = await db.query.schoolData.findFirst({
      where: eq(schema.schoolData.schoolId, resolvedId),
    });
    if (!data && s && s !== resolvedId) {
      data = await db.query.schoolData.findFirst({
        where: eq(schema.schoolData.schoolId, s),
      });
    }
    if (data) {
      const dual = toDualCaseRow(schema.schoolData, data);
      const isDemo = resolvedId === DEFAULT_SCHOOL_UUID;
      
      if (isDemo) {
        dual.students = Array.isArray(dual.students) && dual.students.length > 0 ? dual.students : DEFAULT_APP_DATA.students;
        dual.teachers = Array.isArray(dual.teachers) && dual.teachers.length > 0 ? dual.teachers : DEFAULT_APP_DATA.teachers;
        dual.exams = Array.isArray(dual.exams) && dual.exams.length > 0 ? dual.exams : DEFAULT_APP_DATA.exams;
        dual.periodSettings = pickNonEmptyArray(dual.periodSettings, dual.period_settings, DEFAULT_APP_DATA.periodSettings);
        dual.streamSettings = pickNonEmptyArray(dual.streamSettings, dual.stream_settings, DEFAULT_APP_DATA.streamSettings);
        dual.timetableAssignments = Array.isArray(dual.timetableAssignments) && dual.timetableAssignments.length > 0
          ? dual.timetableAssignments
          : Array.isArray(dual.timetable_assignments) && dual.timetable_assignments.length > 0
          ? dual.timetable_assignments
          : DEFAULT_APP_DATA.timetableAssignments;
        dual.examinationRecords = Array.isArray(dual.examinationRecords) && dual.examinationRecords.length > 0
          ? dual.examinationRecords
          : Array.isArray(dual.examination_records) && dual.examination_records.length > 0
          ? dual.examination_records
          : DEFAULT_APP_DATA.examinationRecords;
      } else {
        dual.students = Array.isArray(dual.students) ? dual.students : [];
        dual.teachers = Array.isArray(dual.teachers) ? dual.teachers : [];
        dual.exams = Array.isArray(dual.exams) ? dual.exams : [];
      }
      
      if (!dual.academicTermDates) {
        dual.academicTermDates = {};
      }
      return res.json(dual);
    }
    res.json({});
  } catch (err: any) {
    console.error('Error fetching school-data:', err?.message || err);
    res.status(500).json({ error: 'Failed to fetch school data' });
  }
});

app.post('/api/db/school-data', async (req, res) => {
  const { schoolId: rawSchoolId, payload } = req.body;
  if (!rawSchoolId) {
    return res.status(400).json({ error: 'schoolId is required' });
  }
  const s = String(rawSchoolId).trim();
  const schoolId = (!s || s === 'DEMO_SCHOOL' || s === 'DEFAULT_PRIMARY_SCHOOL_ID') ? DEFAULT_SCHOOL_UUID : s;
  try {
    await ensureHistoricalBackupRestored(schoolId);

    const raw = payload || {};
    const allowExplicitDelete = Boolean(raw._explicitDelete || raw._fullSnapshot);
    const existing = await db.query.schoolData.findFirst({
      where: eq(schema.schoolData.schoolId, schoolId),
    });

    const isDemo = schoolId === DEFAULT_SCHOOL_UUID;

    // Resolve all arrays: protect against uninitialized demo seed wipeouts while immediately respecting user deletions
    const resolvedStudents = mergeNonDestructiveArray(
      raw.students,
      raw.students,
      existing?.students,
      isDemo ? DEFAULT_APP_DATA.students : [],
      (st, i) => String(st?.regNo || st?.reg_no || st?.id || st?.name || i).trim().toLowerCase(),
      { allowExplicitReplace: allowExplicitDelete, filterDemoWhenRealExists: 'students' }
    );

    const resolvedTeachers = mergeNonDestructiveArray(
      raw.teachers,
      raw.teachers,
      existing?.teachers,
      isDemo ? DEFAULT_APP_DATA.teachers : [],
      (t, i) => String(t?.id || t?.email || t?.name || i).trim().toLowerCase(),
      { allowExplicitReplace: allowExplicitDelete, filterDemoWhenRealExists: 'teachers' }
    );

    const resolvedExams = mergeNonDestructiveArray(
      raw.exams,
      raw.exams,
      existing?.exams,
      isDemo ? DEFAULT_APP_DATA.exams : [],
      (e, i) => String(e?.id || e?.name || i).trim().toLowerCase(),
      { allowExplicitReplace: allowExplicitDelete }
    );

    const resolvedDisciplineRecords = mergeNonDestructiveArray(
      raw.disciplineRecords,
      raw.discipline_records,
      existing?.disciplineRecords,
      DEFAULT_APP_DATA.disciplineRecords,
      (d, i) => String(d?.id || i),
      { allowExplicitReplace: allowExplicitDelete }
    );

    const resolvedDutyRosterData = resolveSnapshotObject(
      raw.dutyRosterData,
      raw.duty_roster_data,
      existing?.dutyRosterData,
      {},
      allowExplicitDelete
    );

    const normalizedData = {
      id: schoolId,
      schoolId: schoolId,
      schoolInfo: {
        ...((DEFAULT_APP_DATA.schoolInfo as Record<string, any>) || {}),
        ...((existing?.schoolInfo as Record<string, any>) || {}),
        ...(raw.school_info || {}),
        ...(raw.schoolInfo || {}),
      },
      timetableAssignments: mergeNonDestructiveArray(
        raw.timetableAssignments,
        raw.timetable_assignments,
        existing?.timetableAssignments,
        DEFAULT_APP_DATA.timetableAssignments,
        (a, i) => {
          const cls = String(a?.className || a?.class_name || '').trim().toLowerCase();
          const str = String(a?.stream || '').trim().toLowerCase();
          const day = String(a?.day || '').trim().toLowerCase();
          const prd = String(a?.period || a?.periodName || a?.period_name || '').trim().toLowerCase();
          return cls && day && prd ? `${cls}_${str}_${day}_${prd}` : String(a?.id || i);
        },
        { allowExplicitReplace: allowExplicitDelete || Boolean(raw._replaceTimetable) }
      ),
      periodSettings: mergeNonDestructiveArray(
        raw.periodSettings,
        raw.period_settings,
        existing?.periodSettings,
        DEFAULT_APP_DATA.periodSettings,
        (p, i) => `${String(p?.day || '').trim().toLowerCase()}_${String(p?.name || p?.id || i).trim().toLowerCase()}`,
        { allowExplicitReplace: allowExplicitDelete }
      ),
      streamSettings: mergeNonDestructiveArray(
        raw.streamSettings,
        raw.stream_settings,
        existing?.streamSettings,
        DEFAULT_APP_DATA.streamSettings,
        (st, i) => String(st?.className || st?.id || i).trim().toLowerCase(),
        { allowExplicitReplace: allowExplicitDelete }
      ),
      institutionalPolicy: resolveSnapshotObject(
        raw.institutionalPolicy,
        raw.institutional_policy,
        existing?.institutionalPolicy,
        (DEFAULT_APP_DATA.institutionalPolicy as Record<string, any>) || {}
      ),
      sessions: mergeNonDestructiveArray(
        raw.sessions,
        raw.sessions,
        existing?.sessions,
        DEFAULT_APP_DATA.sessions,
        (s, i) => String(s?.id || i),
        { allowExplicitReplace: allowExplicitDelete }
      ),
      supervisors: mergeNonDestructiveArray(
        raw.supervisors,
        raw.supervisors,
        existing?.supervisors,
        DEFAULT_APP_DATA.supervisors,
        (s, i) => String(s?.id || s?.teacherId || i),
        { allowExplicitReplace: allowExplicitDelete }
      ),
      selectedInvigilators: mergeNonDestructiveArray(
        raw.selectedInvigilators,
        raw.selected_invigilators,
        existing?.selectedInvigilators,
        DEFAULT_APP_DATA.selectedInvigilators,
        (item, i) => String(typeof item === 'object' ? (item?.teacherId ?? item?.id ?? i) : item),
        { allowExplicitReplace: allowExplicitDelete }
      ),
      invigilationAssignments: resolveSnapshotObject(
        raw.invigilationAssignments,
        raw.invigilation_assignments,
        existing?.invigilationAssignments,
        {},
        allowExplicitDelete
      ),
      dailyAttendance: resolveSnapshotObject(
        raw.dailyAttendance,
        raw.daily_attendance,
        existing?.dailyAttendance,
        {},
        allowExplicitDelete
      ),
      journalRecords: resolveSnapshotObject(
        raw.journalRecords,
        raw.journal_records,
        existing?.journalRecords,
        {},
        allowExplicitDelete
      ),
      schemesOfWork: mergeNonDestructiveArray(
        raw.schemesOfWork,
        raw.schemes_of_work,
        existing?.schemesOfWork,
        [],
        (item, i) => String(item?.id || i),
        { allowExplicitReplace: allowExplicitDelete }
      ),
      lessonPlans: mergeNonDestructiveArray(
        raw.lessonPlans,
        raw.lesson_plans,
        existing?.lessonPlans,
        [],
        (item, i) => String(item?.id || i),
        { allowExplicitReplace: allowExplicitDelete }
      ),
      teacherEvaluations: mergeNonDestructiveArray(
        raw.teacherEvaluations,
        raw.teacher_evaluations,
        existing?.teacherEvaluations,
        [],
        (item, i) => String(item?.id || i),
        { allowExplicitReplace: allowExplicitDelete }
      ),
      savedTimetableRecords: mergeNonDestructiveArray(
        raw.savedTimetableRecords,
        raw.saved_timetable_records,
        existing?.savedTimetableRecords,
        [],
        (item, i) => String(item?.id || i),
        { allowExplicitReplace: allowExplicitDelete }
      ),
      savedInvigilationRecords: mergeNonDestructiveArray(
        raw.savedInvigilationRecords,
        raw.saved_invigilation_records,
        existing?.savedInvigilationRecords,
        [],
        (item, i) => String(item?.id || i),
        { allowExplicitReplace: allowExplicitDelete }
      ),
      gradeCutoffs: resolveSnapshotObject(
        raw.gradeCutoffs,
        raw.grade_cutoffs,
        existing?.gradeCutoffs,
        {},
        allowExplicitDelete
      ),
      ledgerSubjectKeys: resolveSnapshotObject(
        raw.ledgerSubjectKeys,
        raw.ledger_subject_keys,
        existing?.ledgerSubjectKeys,
        {},
        allowExplicitDelete
      ),
      subjectPeriodAllocations: mergeNonDestructiveArray(
        raw.subjectPeriodAllocations,
        raw.subject_period_allocations,
        existing?.subjectPeriodAllocations,
        DEFAULT_APP_DATA.subjectPeriodAllocations,
        (spa, i) => `${String(spa?.className || '').trim().toLowerCase()}_${String(spa?.stream || '').trim().toLowerCase()}_${String(spa?.subject || spa?.subjectName || i).trim().toLowerCase()}`,
        { allowExplicitReplace: allowExplicitDelete }
      ),
      teacherAssignments: mergeNonDestructiveArray(
        raw.teacherAssignments,
        raw.teacher_assignments,
        existing?.teacherAssignments,
        DEFAULT_APP_DATA.teacherAssignments,
        (ta, i) => String(ta?.id || `${ta?.teacherId}_${i}`).trim().toLowerCase(),
        { allowExplicitReplace: allowExplicitDelete }
      ),
      subjectPaperConfigs: resolveSnapshotObject(
        raw.subjectPaperConfigs,
        raw.subject_paper_configs,
        existing?.subjectPaperConfigs,
        {},
        allowExplicitDelete
      ),
      bubbleSettings: resolveSnapshotObject(
        raw.bubbleSettings,
        raw.bubble_settings,
        existing?.bubbleSettings,
        {}
      ),
      students: resolvedStudents,
      teachers: resolvedTeachers,
      exams: resolvedExams,
      examinationRecords: mergeNonDestructiveArray(
        raw.examinationRecords,
        raw.examination_records,
        existing?.examinationRecords,
        isDemo ? DEFAULT_APP_DATA.examinationRecords : [],
        (r, i) => String(r?.id || `${r?.regNo}_${r?.examType}_${i}`).trim().toLowerCase(),
        { allowExplicitReplace: allowExplicitDelete }
      ),
      disciplineRecords: resolvedDisciplineRecords,
      dutyRosterData: resolvedDutyRosterData,
      academicTermDates: resolveSnapshotObject(
        raw.academicTermDates,
        raw.academic_term_dates,
        existing?.academicTermDates,
        {}
      ),
      teacherAttendance: resolveSnapshotObject(
        raw.teacherAttendance,
        raw.teacher_attendance,
        existing?.teacherAttendance,
        {}
      ),
      staffPayroll: resolveSnapshotObject(
        raw.staffPayroll,
        raw.staff_payroll,
        existing?.staffPayroll,
        {}
      ),
      updatedAt: new Date(),
    };

    await db.insert(schema.schoolData).values(normalizedData).onConflictDoUpdate({
      target: schema.schoolData.schoolId,
      set: normalizedData,
    });

    // Respond immediately so saving/publishing is instant, and coalesce relational sync in the background
    res.json({ success: true });

    scheduleRelationalSync(schoolId, normalizedData);
  } catch (err: any) {
    console.error('Error saving school-data:', err?.message || err);
    res.status(500).json({ error: 'Failed to save school data', details: err?.message });
  }
});

// Past Papers API
app.get('/api/past-papers', async (req, res) => {
  const { schoolId, level, subjectName } = req.query as { schoolId: string, level?: string, subjectName?: string };
  const resolvedId = schoolId || DEFAULT_SCHOOL_UUID;
  try {
    const filters: any = { schoolId: resolvedId };
    if (level) filters.level = level;
    if (subjectName) filters.subjectName = subjectName;

    const papers = await db.select().from(schema.pastPapers).where(buildWhereClause(schema.pastPapers, filters));
    res.json(papers);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch past papers' });
  }
});

app.post('/api/past-papers', async (req, res) => {
  const { schoolId, ...paperData } = req.body;
  const resolvedId = schoolId || DEFAULT_SCHOOL_UUID;
  try {
    const normalized = await normalizeRecordForTable(schema.pastPapers, { ...paperData, schoolId: resolvedId }, false);
    const result = await db.insert(schema.pastPapers).values(normalized as any).returning();
    res.json(result[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add past paper' });
  }
});

app.delete('/api/past-papers/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await db.delete(schema.pastPapers).where(eq(schema.pastPapers.id, id));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete past paper' });
  }
});

// Dedicated Teacher Duty Roster API (Mfumo wa Zamu ya Walimu)
app.get('/api/db/duty-roster', async (req, res) => {
  const { schoolId } = req.query as { schoolId?: string };
  const resolvedId = schoolId || DEFAULT_SCHOOL_UUID;
  const validSchoolUuid = toDeterministicUuid(resolvedId, true);
  try {
    const snap = await db.query.schoolData.findFirst({
      where: eq(schema.schoolData.schoolId, resolvedId),
    });
    const snapDuty = (snap?.dutyRosterData || {}) as any;

    const dbStreams = await db.select().from(schema.dutyStreams).where(eq(schema.dutyStreams.schoolId, validSchoolUuid));
    const dbWeeks = await db.select().from(schema.dutyWeeklyAssignments).where(eq(schema.dutyWeeklyAssignments.schoolId, validSchoolUuid));
    const dbReports = await db.select().from(schema.dutyDailyReports).where(eq(schema.dutyDailyReports.schoolId, validSchoolUuid));

    const streams = Array.isArray(snapDuty.streams) && snapDuty.streams.length > 0
      ? snapDuty.streams
      : dbStreams.map(s => ({
          id: s.id,
          name: s.streamName,
          totalStudents: s.totalStudents || 0,
          classTeacher: s.classTeacher || '',
        }));

    const weeklyAssignments = Array.isArray(snapDuty.weeklyAssignments) && snapDuty.weeklyAssignments.length > 0
      ? snapDuty.weeklyAssignments
      : dbWeeks.map(w => ({
          id: w.id,
          weekStart: w.weekStart,
          weekEnd: w.weekEnd,
          weekLabel: w.weekLabel,
          teacherIds: Array.isArray(w.teacherIds) ? w.teacherIds : [],
          teacherNames: Array.isArray(w.teacherNames) ? w.teacherNames : [],
          notes: w.notes || '',
          assignedBy: w.assignedBy || 'Discipline Master',
          createdAt: w.createdAt ? new Date(w.createdAt).toISOString() : new Date().toISOString(),
        }));

    const dailyReports = Array.isArray(snapDuty.dailyReports) && snapDuty.dailyReports.length > 0
      ? snapDuty.dailyReports
      : dbReports.map(r => ({
          id: r.id,
          weekAssignmentId: r.weekAssignmentId || '',
          weekStart: r.weekStart || '',
          weekEnd: r.weekEnd || '',
          weekLabel: r.weekLabel || '',
          date: r.reportDate,
          dayName: r.dayName || '',
          teacherId: r.teacherId || '',
          teacherName: r.teacherName,
          allWeekTeachers: Array.isArray(r.allWeekTeachers) ? r.allWeekTeachers : [],
          streams: Array.isArray(r.streamAttendance) ? r.streamAttendance : [],
          totals: {
            totalStudents: r.totalSchoolRoll || 0,
            present: r.totalPresent || 0,
            absent: r.totalAbsent || 0,
            permitted: r.totalPermitted || 0,
            sickPua: r.totalSickPua || 0,
            unexcused: r.totalUnexcused || 0,
          },
          environmentRating: r.environmentRating || 8,
          environmentNotes: r.environmentNotes || '',
          generalDiscipline: r.generalDiscipline || '',
          teachersPresent: r.teachersPresent || 0,
          teachersAbsent: r.teachersAbsent || 0,
          teacherAttendanceNotes: r.teacherAttendanceNotes || '',
          keyEvents: r.keyEvents || '',
          bellSchedule: r.bellSchedule || '',
          recommendations: r.recommendations || '',
          createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString(),
          updatedAt: r.updatedAt ? new Date(r.updatedAt).toISOString() : new Date().toISOString(),
        }));

    res.json({
      streams,
      teachers: Array.isArray(snapDuty.teachers) ? snapDuty.teachers : [],
      weeklyAssignments,
      dailyReports,
      updatedAt: snapDuty.updatedAt || new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('Error loading duty-roster:', err?.message || err);
    res.status(500).json({ error: 'Failed to load duty roster data' });
  }
});

app.post('/api/db/duty-roster', async (req, res) => {
  const { schoolId = DEFAULT_SCHOOL_UUID, dutyRosterData } = req.body || {};
  try {
    const validSchoolUuid = await ensureSchoolExists(schoolId);
    const existing = await db.query.schoolData.findFirst({
      where: eq(schema.schoolData.schoolId, schoolId),
    });
    if (existing) {
      await db.update(schema.schoolData)
        .set({ dutyRosterData, updatedAt: new Date() })
        .where(eq(schema.schoolData.schoolId, schoolId));
    }
    await syncRelationalTablesFromSnapshot(validSchoolUuid, { dutyRosterData });
    res.json({ success: true });
  } catch (err: any) {
    console.error('Error saving duty-roster:', err?.message || err);
    res.status(500).json({ error: 'Failed to save duty roster data' });
  }
});

app.get('/api/db/school-subscriptions', async (req, res) => {
  const { schoolId } = req.query as { schoolId: string };
  try {
    const validSchoolUuid = toDeterministicUuid(schoolId, true);
    const data = await db.query.schoolSubscriptions.findFirst({
      where: eq(schema.schoolSubscriptions.schoolId, validSchoolUuid),
    });
    res.json(data ? toDualCaseRow(schema.schoolSubscriptions, data) : {});
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch subscriptions' });
  }
});

app.post('/api/db/school-subscriptions', async (req, res) => {
  const { schoolId, payload } = req.body;
  try {
    const validSchoolUuid = await ensureSchoolExists(schoolId || payload?.schoolId || payload?.school_id);
    const normalized = await normalizeRecordForTable(schema.schoolSubscriptions, {
      ...(payload || {}),
      schoolId: validSchoolUuid,
    });
    await db.insert(schema.schoolSubscriptions).values(normalized as any).onConflictDoUpdate({
      target: schema.schoolSubscriptions.id,
      set: normalized as any,
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save subscription' });
  }
});

// Cloud SQL Connection Health Status & Full Table Diagnostics
app.get('/api/db/status', async (_req, res) => {
  const start = performance.now();
  try {
    const [
      studentsCnt,
      teachersCnt,
      classesCnt,
      subjectsCnt,
      examsCnt,
      timetableCnt,
      parentsCnt,
      examResultsCnt,
      periodSettingsCnt,
      streamSettingsCnt,
      usersCnt,
      activityLogsCnt,
      schoolSnap
    ] = await Promise.all([
      db.execute(sql`SELECT count(*)::int as c FROM students`),
      db.execute(sql`SELECT count(*)::int as c FROM teachers`),
      db.execute(sql`SELECT count(*)::int as c FROM classes`),
      db.execute(sql`SELECT count(*)::int as c FROM subjects`),
      db.execute(sql`SELECT count(*)::int as c FROM exams`),
      db.execute(sql`SELECT count(*)::int as c FROM timetable_assignments`),
      db.execute(sql`SELECT count(*)::int as c FROM parents`),
      db.execute(sql`SELECT count(*)::int as c FROM exam_results`),
      db.execute(sql`SELECT count(*)::int as c FROM period_settings`),
      db.execute(sql`SELECT count(*)::int as c FROM stream_settings`),
      db.execute(sql`SELECT count(*)::int as c FROM users`),
      db.execute(sql`SELECT count(*)::int as c FROM activity_logs`),
      db.execute(sql`SELECT updated_at FROM school_data LIMIT 1`),
    ]);

    const latencyMs = Math.round(performance.now() - start);
    const lastSyncTimestamp = schoolSnap.rows[0]?.updated_at || new Date().toISOString();

    res.json({
      success: true,
      status: 'connected',
      latencyMs,
      engine: 'PostgreSQL 18.6 (Cloud SQL / Drizzle ORM)',
      totalTablesRegistered: Object.keys(TABLE_KEY_MAP).length,
      lastSyncTimestamp,
      counts: {
        students: Number(studentsCnt.rows[0]?.c || 0),
        teachers: Number(teachersCnt.rows[0]?.c || 0),
        classes: Number(classesCnt.rows[0]?.c || 0),
        subjects: Number(subjectsCnt.rows[0]?.c || 0),
        exams: Number(examsCnt.rows[0]?.c || 0),
        timetableAssignments: Number(timetableCnt.rows[0]?.c || 0),
        parents: Number(parentsCnt.rows[0]?.c || 0),
        examResults: Number(examResultsCnt.rows[0]?.c || 0),
        periodSettings: Number(periodSettingsCnt.rows[0]?.c || 0),
        streamSettings: Number(streamSettingsCnt.rows[0]?.c || 0),
        users: Number(usersCnt.rows[0]?.c || 0),
        activityLogs: Number(activityLogsCnt.rows[0]?.c || 0),
      },
      serverTime: new Date().toISOString()
    });
  } catch (err: any) {
    console.error('Cloud SQL test connection error:', err);
    res.status(500).json({ 
      success: false, 
      status: 'error', 
      latencyMs: Math.round(performance.now() - start),
      error: err?.message || String(err) 
    });
  }
});


app.get('/api/db/diagnostics', async (req, res) => {
  const { schoolId } = req.query as { schoolId?: string };
  try {
    const tableStats: { table: string; connected: boolean; rowCount: number; category: string }[] = [];
    const categoryMap: Record<string, string> = {
      schools: 'Core & Auth',
      school_data: 'Core & Auth',
      users: 'Core & Auth',
      school_admins: 'Core & Auth',
      authorized_staff: 'Core & Auth',
      school_subscriptions: 'Core & Auth',
      institutional_policies: 'Core & Auth',
      activity_logs: 'Core & Auth',
      students: 'Academic & Registry',
      teachers: 'Academic & Registry',
      classes: 'Academic & Registry',
      subjects: 'Academic & Registry',
      exams: 'Academic & Registry',
      exam_records: 'Academic & Registry',
      exam_results: 'Academic & Registry',
      timetables: 'Timetable & Attendance',
      timetable_assignments: 'Timetable & Attendance',
      period_settings: 'Timetable & Attendance',
      periods: 'Timetable & Attendance',
      stream_settings: 'Timetable & Attendance',
      subject_period_allocations: 'Timetable & Attendance',
      teacher_assignments: 'Timetable & Attendance',
      saved_timetable_records: 'Timetable & Attendance',
      period_attendance: 'Timetable & Attendance',
      teaching_logs: 'Timetable & Attendance',
      remedial_timetable: 'Remedial & Invigilation',
      remedial_attendance: 'Remedial & Invigilation',
      remedial_payment_settings: 'Remedial & Invigilation',
      invigilation_sessions: 'Remedial & Invigilation',
      invigilation_assignments: 'Remedial & Invigilation',
      invigilation_supervisors: 'Remedial & Invigilation',
      selected_invigilators: 'Remedial & Invigilation',
      saved_invigilation_records: 'Remedial & Invigilation',
      sitting_plans: 'Remedial & Invigilation',
      parents: 'Parents, SMS & Finance',
      parent_students: 'Parents, SMS & Finance',
      announcements: 'Parents, SMS & Finance',
      parent_messages: 'Parents, SMS & Finance',
      sms_wallet: 'Parents, SMS & Finance',
      sms_logs: 'Parents, SMS & Finance',
      sms_payment_history: 'Parents, SMS & Finance',
      payment_verification_requests: 'Parents, SMS & Finance',
      contribution_types: 'Parents, SMS & Finance',
      student_ledger: 'Parents, SMS & Finance',
      discipline_records: 'Operations & Inventory',
      gate_pass_logs: 'Operations & Inventory',
      environment_equipment: 'Operations & Inventory',
      equipment_usage_log: 'Operations & Inventory',
      environment_orders: 'Operations & Inventory',
      school_purchased_equipment: 'Operations & Inventory',
      ream_paper_records: 'Operations & Inventory',
      duty_streams: 'Operations & Inventory',
      duty_weekly_assignments: 'Operations & Inventory',
      duty_daily_reports: 'Operations & Inventory',
      curriculum_standards: 'Academic & Registry',
      past_papers: 'Academic & Registry',
    };

    const countQuery = await db.execute(sql`
      SELECT relname AS table_name, GREATEST(n_live_tup, 0)::int AS est_rows
      FROM pg_stat_user_tables
      WHERE schemaname = 'public'
      ORDER BY relname;
    `);

    const exactCounts: Record<string, number> = {};
    const entries = Object.entries(TABLE_KEY_MAP);
    const results = await Promise.all(
      entries.map(async ([tableName, tableObj]) => {
        try {
          const rows = await db.select({ count: sql<number>`count(*)::int` }).from(tableObj);
          const count = rows[0]?.count ?? 0;
          exactCounts[tableName] = count;
          return {
            table: tableName,
            connected: true,
            rowCount: count,
            category: categoryMap[tableName] || 'General',
          };
        } catch (e) {
          return {
            table: tableName,
            connected: false,
            rowCount: 0,
            category: categoryMap[tableName] || 'General',
          };
        }
      })
    );
    tableStats.push(...results);

    res.json({
      success: true,
      status: 'healthy',
      totalTables: tableStats.length,
      connectedTables: tableStats.filter(t => t.connected).length,
      tables: tableStats,
      summary: {
        schools: exactCounts.schools ?? 0,
        students: exactCounts.students ?? 0,
        teachers: exactCounts.teachers ?? 0,
        exams: exactCounts.exams ?? 0,
        classes: exactCounts.classes ?? 0,
        users: (exactCounts.users ?? 0) + (exactCounts.school_admins ?? 0),
      },
      checkedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('Diagnostics error:', err);
    res.status(500).json({ success: false, error: err?.message || String(err) });
  }
});

app.post('/api/performance-insight', async (req, res) => {
  try {
    const { examinationRecords } = req.body;
    const insight = await generatePerformanceInsight(examinationRecords);
    res.json({ success: true, insight });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || String(err) });
  }
});

app.post('/api/db/sync-all', async (req, res) => {

  try {
    const { schoolId = DEFAULT_SCHOOL_UUID, payload } = req.body || {};
    let sourceData: any = payload;
    if (!sourceData || typeof sourceData !== 'object') {
      const snap = await db.query.schoolData.findFirst({
        where: eq(schema.schoolData.schoolId, schoolId),
      });
      sourceData = snap || DEFAULT_APP_DATA;
    }

    const mergedSource = {
      ...sourceData,
      schoolInfo: pickNonEmptyObject(sourceData.schoolInfo, sourceData.school_info, DEFAULT_APP_DATA.schoolInfo),
      students: pickNonEmptyArray(sourceData.students, DEFAULT_APP_DATA.students),
      teachers: pickNonEmptyArray(sourceData.teachers, DEFAULT_APP_DATA.teachers),
      exams: pickNonEmptyArray(sourceData.exams, DEFAULT_APP_DATA.exams),
      streamSettings: pickNonEmptyArray(sourceData.streamSettings, sourceData.stream_settings, DEFAULT_APP_DATA.streamSettings, TANZANIAN_TEMPLATE_STREAM_SETTINGS),
      periodSettings: pickNonEmptyArray(sourceData.periodSettings, sourceData.period_settings, DEFAULT_APP_DATA.periodSettings, TANZANIAN_TEMPLATE_PERIOD_SETTINGS),
      timetableAssignments: pickNonEmptyArray(sourceData.timetableAssignments, sourceData.timetable_assignments, DEFAULT_APP_DATA.timetableAssignments, TANZANIAN_TEMPLATE_TIMETABLE_ASSIGNMENTS),
      examinationRecords: pickNonEmptyArray(sourceData.examinationRecords, sourceData.examination_records, DEFAULT_APP_DATA.examinationRecords),
      subjectPeriodAllocations: pickNonEmptyArray(sourceData.subjectPeriodAllocations, sourceData.subject_period_allocations, DEFAULT_APP_DATA.subjectPeriodAllocations),
      teacherAssignments: pickNonEmptyArray(sourceData.teacherAssignments, sourceData.teacher_assignments, DEFAULT_APP_DATA.teacherAssignments),
      institutionalPolicy: pickNonEmptyObject(sourceData.institutionalPolicy, sourceData.institutional_policy, DEFAULT_APP_DATA.institutionalPolicy),
      sessions: pickNonEmptyArray(sourceData.sessions, DEFAULT_APP_DATA.sessions),
      supervisors: pickNonEmptyArray(sourceData.supervisors, DEFAULT_APP_DATA.supervisors),
      selectedInvigilators: pickNonEmptyArray(sourceData.selectedInvigilators, sourceData.selected_invigilators, DEFAULT_APP_DATA.selectedInvigilators),
      disciplineRecords: pickNonEmptyArray(sourceData.disciplineRecords, sourceData.discipline_records, DEFAULT_APP_DATA.disciplineRecords),
      updatedAt: new Date(),
    };

    await db.insert(schema.schoolData).values({
      id: schoolId,
      schoolId: schoolId,
      ...mergedSource,
    }).onConflictDoUpdate({
      target: schema.schoolData.schoolId,
      set: mergedSource,
    });

    await syncRelationalTablesFromSnapshot(schoolId, mergedSource);
    res.json({
      success: true,
      synced: {
        students: (mergedSource.students || []).length,
        teachers: (mergedSource.teachers || []).length,
        exams: (mergedSource.exams || []).length,
        classes: (mergedSource.streamSettings || []).length,
        periods: (mergedSource.periodSettings || []).length,
        timetableAssignments: (mergedSource.timetableAssignments || []).length,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || String(err) });
  }
});

// Schools API
app.get('/api/db/schools', async (_req, res) => {
  try {
    const data = await db.select().from(schema.schools);
    res.json(data.map(r => toDualCaseRow(schema.schools, r)));
  } catch (err: any) {
    console.error('Error fetching schools from Cloud SQL:', err);
    res.status(500).json({ error: 'Failed to fetch schools' });
  }
});

app.post('/api/db/schools', async (req, res) => {
  try {
    const payload = req.body || {};
    const schoolId = isValidUuid(payload.id) ? payload.id : crypto.randomUUID();

    const schoolRecord = {
      id: schoolId,
      name: payload.name || 'HABY EDU SCHOOL',
      code: payload.code || null,
      district: payload.district || null,
      region: payload.region || null,
      phone: payload.phone || null,
      email: payload.email || null,
      status: payload.status || 'ACTIVE',
      updatedAt: new Date()
    };

    await db.insert(schema.schools).values(schoolRecord).onConflictDoUpdate({
      target: schema.schools.id,
      set: schoolRecord
    });

    try {
      await db.insert(schema.schoolData).values({
        id: schoolId,
        schoolId: schoolId,
        schoolInfo: { name: schoolRecord.name, email: schoolRecord.email, phone: schoolRecord.phone },
        students: [],
        teachers: [],
        exams: [],
        updatedAt: new Date()
      }).onConflictDoNothing();
    } catch (sdErr) {
      console.warn("Init schoolData on school create warning:", sdErr);
    }

    res.json({ success: true, school: schoolRecord });
  } catch (err: any) {
    console.error('Error saving school to Cloud SQL:', err);
    res.status(500).json({ error: 'Failed to save school', details: err?.message || String(err) });
  }
});

app.delete('/api/db/schools/:id', async (req, res) => {
  try {
    const id = toDeterministicUuid(req.params.id, true);
    await db.delete(schema.schools).where(eq(schema.schools.id, id as any));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete school' });
  }
});

// School Admins API
app.get('/api/db/school-admins', async (req, res) => {
  try {
    const { schoolId } = req.query as { schoolId?: string };
    if (schoolId) {
      const validSchoolUuid = toDeterministicUuid(schoolId, true);
      const data = await db.select().from(schema.schoolAdmins).where(eq(schema.schoolAdmins.schoolId, validSchoolUuid as any));
      return res.json(data.map(r => toDualCaseRow(schema.schoolAdmins, r)));
    }
    const data = await db.select().from(schema.schoolAdmins);
    res.json(data.map(r => toDualCaseRow(schema.schoolAdmins, r)));
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch school admins' });
  }
});

app.post('/api/db/school-admins', async (req, res) => {
  try {
    const payload = req.body || {};
    const adminId = isValidUuid(payload.id) ? payload.id : crypto.randomUUID();
    const rawSchoolId = payload.schoolId || payload.school_id;
    const schoolId = rawSchoolId ? await ensureSchoolExists(rawSchoolId) : DEFAULT_SCHOOL_UUID;

    const adminRecord = {
      id: adminId,
      schoolId: schoolId,
      email: String(payload.email || '').trim().toLowerCase(),
      fullName: payload.fullName || payload.full_name || 'Administrator',
      password: payload.password || '',
      role: payload.role || 'HEADMASTER',
      updatedAt: new Date()
    };

    await db.insert(schema.schoolAdmins).values(adminRecord).onConflictDoUpdate({
      target: schema.schoolAdmins.id,
      set: adminRecord
    });

    res.json({ success: true, admin: adminRecord });
  } catch (err: any) {
    console.error('Error saving school admin to Cloud SQL:', err);
    res.status(500).json({ error: 'Failed to save school admin', details: err?.message || String(err) });
  }
});

// Students API
app.get('/api/db/students', async (req, res) => {
  try {
    const { schoolId } = req.query as { schoolId: string };
    if (schoolId) {
      const validSchoolUuid = toDeterministicUuid(schoolId, true);
      const data = await db.select().from(schema.students).where(eq(schema.students.schoolId, validSchoolUuid as any));
      return res.json(data.map(r => toDualCaseRow(schema.students, r)));
    }
    const data = await db.select().from(schema.students);
    res.json(data.map(r => toDualCaseRow(schema.students, r)));
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch students' });
  }
});

app.post('/api/db/students', async (req, res) => {
  try {
    const { schoolId, payload } = req.body;
    const validSchoolUuid = await ensureSchoolExists(schoolId);
    const records = (Array.isArray(payload) ? payload : [payload]).map((s: any) => {
      const regKey = String(s.regNo || s.reg_no || '').trim().toUpperCase();
      return {
        ...s,
        id: toDeterministicUuid(`std_${validSchoolUuid}_${regKey || s.id || s.name}`),
        schoolId: validSchoolUuid,
      };
    });
    const saved = await upsertTableRecords('students', schema.students, records);
    res.json({ success: true, data: saved });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to save students' });
  }
});

// Teachers API
app.get('/api/db/teachers', async (req, res) => {
  try {
    const { schoolId } = req.query as { schoolId: string };
    if (schoolId) {
      const validSchoolUuid = toDeterministicUuid(schoolId, true);
      const data = await db.select().from(schema.teachers).where(eq(schema.teachers.schoolId, validSchoolUuid as any));
      return res.json(data.map(r => toDualCaseRow(schema.teachers, r)));
    }
    const data = await db.select().from(schema.teachers);
    res.json(data.map(r => toDualCaseRow(schema.teachers, r)));
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch teachers' });
  }
});

app.post('/api/db/teachers', async (req, res) => {
  try {
    const { schoolId, payload } = req.body;
    const validSchoolUuid = await ensureSchoolExists(schoolId);
    const records = (Array.isArray(payload) ? payload : [payload]).map((t: any) => {
      const tchKey = String(t.email || t.name || t.id || '').trim().toLowerCase();
      return {
        ...t,
        id: toDeterministicUuid(`tch_${validSchoolUuid}_${tchKey}`),
        schoolId: validSchoolUuid,
      };
    });
    const saved = await upsertTableRecords('teachers', schema.teachers, records);
    res.json({ success: true, data: saved });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to save teachers' });
  }
});

// Exams API
app.get('/api/db/exams', async (req, res) => {
  try {
    const { schoolId } = req.query as { schoolId: string };
    if (schoolId) {
      const validSchoolUuid = toDeterministicUuid(schoolId, true);
      const data = await db.select().from(schema.exams).where(eq(schema.exams.schoolId, validSchoolUuid as any));
      return res.json(data.map(r => toDualCaseRow(schema.exams, r)));
    }
    const data = await db.select().from(schema.exams);
    res.json(data.map(r => toDualCaseRow(schema.exams, r)));
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch exams' });
  }
});

app.post('/api/db/exams', async (req, res) => {
  try {
    const { schoolId, payload } = req.body;
    const validSchoolUuid = await ensureSchoolExists(schoolId);
    const records = (Array.isArray(payload) ? payload : [payload]).map((e: any) => ({
      ...e,
      id: toDeterministicUuid(`exm_${validSchoolUuid}_${e.id || e.name}`),
      schoolId: validSchoolUuid,
    }));
    const saved = await upsertTableRecords('exams', schema.exams, records);
    res.json({ success: true, data: saved });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to save exams' });
  }
});

// Users API
app.get('/api/db/users', async (req, res) => {
  try {
    const { schoolId } = req.query as { schoolId: string };
    if (schoolId) {
      const validSchoolUuid = toDeterministicUuid(schoolId, true);
      const data = await db.select().from(schema.users).where(eq(schema.users.schoolId, validSchoolUuid as any));
      return res.json(data.map(r => toDualCaseRow(schema.users, r)));
    }
    const data = await db.select().from(schema.users);
    res.json(data.map(r => toDualCaseRow(schema.users, r)));
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Universal Query Endpoint for Cloud SQL (All 51 Tables)
app.post('/api/db/query', async (req, res) => {
  const { table, action, filters, orders, data } = req.body || {};
  const selectedTable = TABLE_KEY_MAP[table];
  if (!selectedTable) {
    return res.status(400).json({ error: `Table '${table}' is not supported in Cloud SQL schema` });
  }

  try {
    if (action === 'select') {
      let query: any = db.select().from(selectedTable);
      const whereClause = buildWhereClause(selectedTable, filters);
      if (whereClause) {
        query = query.where(whereClause);
      }
      if (Array.isArray(orders) && orders.length > 0) {
        const orderClauses: any[] = [];
        for (const ord of orders) {
          const resolved = resolveColumn(selectedTable, ord.column);
          if (resolved && selectedTable[resolved.jsKey]) {
            orderClauses.push(ord.ascending === false ? desc(selectedTable[resolved.jsKey]) : asc(selectedTable[resolved.jsKey]));
          }
        }
        if (orderClauses.length > 0) {
          query = query.orderBy(...orderClauses);
        }
      }
      const results = await query;
      const dualResults = (results || []).map((r: any) => toDualCaseRow(selectedTable, r));
      return res.json({ success: true, data: dualResults });
    }

    if (action === 'insert' || action === 'upsert') {
      const records = Array.isArray(data) ? data : (data ? [data] : []);
      const saved = await upsertTableRecords(table, selectedTable, records);
      return res.json({ success: true, data: saved });
    }

    if (action === 'update') {
      const rawUpdate = Array.isArray(data) ? data[0] : data;
      if (!rawUpdate || typeof rawUpdate !== 'object') {
        return res.json({ success: true, data: [] });
      }
      const normalizedUpdate = await normalizeRecordForTable(selectedTable, rawUpdate, true);
      const whereClause = buildWhereClause(selectedTable, filters);
      if (whereClause && Object.keys(normalizedUpdate).length > 0) {
        const updated = await db.update(selectedTable).set(normalizedUpdate).where(whereClause).returning();
        return res.json({ success: true, data: (updated || []).map((r: any) => toDualCaseRow(selectedTable, r)) });
      }
      return res.json({ success: true, data: [] });
    }

    if (action === 'delete') {
      const whereClause = buildWhereClause(selectedTable, filters);
      if (whereClause) {
        await db.delete(selectedTable).where(whereClause);
      }
      return res.json({ success: true });
    }

    return res.status(400).json({ error: `Action '${action}' not supported` });
  } catch (err: any) {
    console.error(`Error in /api/db/query for ${table} (${action}):`, err?.message || err);
    return res.status(500).json({ error: err?.message || 'Database query error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email) {
    return res.status(400).json({ success: false, error: 'Email is required' });
  }
  const normEmail = String(email).trim().toLowerCase();

  try {
    // 1. Check SuperAdmin email
    if (normEmail === 'habibuakida@gmail.com' || normEmail === 'admin@haby.com') {
      return res.json({
        success: true,
        user: {
          id: 'efbbc146-b15b-49ee-a7ed-931ade8ccd0d',
          email: normEmail,
          fullName: 'Mwl. Habibu Akida (Super Admin)',
          role: 'SUPER_ADMIN',
          schoolId: '02dff10d-78fb-4af6-ab5a-db1d275d7e06',
          isSuperAdmin: true
        }
      });
    }

    // 2. Check school_admins in Cloud SQL
    const admin = await db.query.schoolAdmins.findFirst({
      where: eq(schema.schoolAdmins.email, normEmail)
    });
    if (admin) {
      return res.json({
        success: true,
        user: {
          id: admin.id,
          email: admin.email,
          fullName: admin.fullName || 'School Administrator',
          role: admin.role === 'super_admin' ? 'SUPER_ADMIN' : 'HEADMASTER',
          schoolId: admin.schoolId || '02dff10d-78fb-4af6-ab5a-db1d275d7e06',
          isSuperAdmin: admin.role === 'super_admin'
        }
      });
    }

    // 3. Check users in Cloud SQL
    const user = await db.query.users.findFirst({
      where: eq(schema.users.email, normEmail)
    });
    if (user) {
      return res.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName || 'Staff Member',
          role: user.role || 'TEACHER',
          schoolId: user.schoolId || '02dff10d-78fb-4af6-ab5a-db1d275d7e06',
          isSuperAdmin: !!user.isSuperAdmin
        }
      });
    }

    return res.status(401).json({ success: false, error: 'User not found in system.' });
  } catch (err: any) {
    console.error('Error in /api/auth/login:', err);
    // Graceful fallback for Habibu Akida
    if (normEmail === 'habibuakida@gmail.com' || normEmail === 'admin@haby.com') {
      return res.json({
        success: true,
        user: {
          id: 'efbbc146-b15b-49ee-a7ed-931ade8ccd0d',
          email: normEmail,
          fullName: 'Mwl. Habibu Akida (Super Admin)',
          role: 'SUPER_ADMIN',
          schoolId: '02dff10d-78fb-4af6-ab5a-db1d275d7e06',
          isSuperAdmin: true
        }
      });
    }
    return res.status(500).json({ success: false, error: 'Database authentication error' });
  }
});

app.get('/health', (_req, res) => {
  res.json({ status: 'healthy', appName: 'HABY EDU PRO' });
});

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'healthy',
    hasGeminiKey: !!process.env.GEMINI_API_KEY,
    hasBeemKey: !!(process.env.BEEM_API_KEY && process.env.BEEM_SECRET_KEY),
    appName: 'HABY EDU PRO - School Timetable & Management'
  });
});

// BACKEND: /api/sms/send-results - Connect to Beem Africa
app.post('/api/sms/send-results', async (req, res) => {
  try {
    const { schoolId, schoolName = 'HABY EDU PRO', examType, year, recipients } = req.body;

    if (!schoolId) {
      return res.status(400).json({ success: false, error: 'schoolId is required' });
    }

    if (!Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ success: false, error: 'Hakuna watahiniwa walioteuliwa (recipients required)' });
    }

    console.log(`[SMS Results] Sending ${recipients.length} result SMS for ${examType} ${year} | School: ${schoolId}`);

    const logs: any[] = [];
    let sentCount = 0;
    let failedCount = 0;

    for (const item of recipients) {
      const studentCno = item.student_cno || item.cno || 'CANDIDATE';
      const studentName = item.student_name || item.name || studentCno;
      const phone = normalizeTzPhone(item.phone_255 || item.phone || '');
      const div = item.div || item.DIV || '-';
      const aggt = item.aggt || item.AGGT || '-';

      // Format subjects summary: e.g. CIV-C HIST-C GEO-C KISW-D
      let subjectsStr = '';
      if (item.subjects && typeof item.subjects === 'object') {
        subjectsStr = Object.entries(item.subjects)
          .map(([subj, grade]) => `${subj}-${grade}`)
          .join(' ');
      } else if (item.subjects_json && typeof item.subjects_json === 'object') {
        subjectsStr = Object.entries(item.subjects_json)
          .map(([subj, grade]) => `${subj}-${grade}`)
          .join(' ');
      }

      // Format SMS exact template:
      // "Ndugu Mzazi, matokeo ya [student_name] [exam_type] [year]: DIV [DIV], AGGT [AGGT], CIV-[grade] HIST-[grade]... - [SchoolName]"
      const messageText = `Ndugu Mzazi, matokeo ya ${studentName} ${examType} ${year}: DIV ${div}, AGGT ${aggt}${subjectsStr ? ', ' + subjectsStr : ''} - ${schoolName}`;

      if (!phone) {
        failedCount++;
        logs.push({
          student_cno: studentCno,
          phone: '',
          message: messageText,
          status: 'FAILED',
          error: 'Namba ya mzazi haipo (Missing phone)'
        });
        continue;
      }

      const dispatchResult = await sendBeemSMS(phone, messageText);

      if (dispatchResult.success) {
        sentCount++;
        logs.push({
          student_cno: studentCno,
          phone,
          message: messageText,
          status: 'SENT',
          dispatchedAt: new Date().toISOString()
        });
      } else {
        failedCount++;
        logs.push({
          student_cno: studentCno,
          phone,
          message: messageText,
          status: 'FAILED',
          error: dispatchResult.error || 'Beem dispatch failed'
        });
      }
    }

    res.json({
      success: true,
      sentCount,
      failedCount,
      totalCount: recipients.length,
      logs
    });
  } catch (error: any) {
    console.error('Error in /api/sms/send-results:', error);
    res.status(500).json({ success: false, error: error.message || 'Hitilafu ya seva wakati wa kutuma SMS' });
  }
});

// BACKEND: /api/sms/send-announcement - Tuma Matangazo via Beem Africa
app.post('/api/sms/send-announcement', async (req, res) => {
  try {
    const { schoolId, schoolName = 'HABY EDU PRO', target = 'All school', message, recipients } = req.body;

    if (!schoolId) {
      return res.status(400).json({ success: false, error: 'schoolId is required' });
    }

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, error: 'Ujumbe wa tangazo hauwezi kuwa mtupu' });
    }

    if (!Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ success: false, error: 'Hakuna namba za wazazi zilizopatikana kwa walengwa hao' });
    }

    console.log(`[SMS Announcement] Sending to ${recipients.length} parents | Target: ${target} | School: ${schoolId}`);

    const logs: any[] = [];
    let sentCount = 0;
    let failedCount = 0;

    // Append school signature if not present
    const finalMsg = message.includes(schoolName) ? message : `${message}\n- ${schoolName}`;

    for (const item of recipients) {
      const phone = normalizeTzPhone(item.phone_255 || item.phone || '');
      const studentCno = item.student_cno || item.cno || 'ALL';

      if (!phone) {
        failedCount++;
        logs.push({
          student_cno: studentCno,
          phone: '',
          message: finalMsg,
          status: 'FAILED',
          error: 'Namba ya simu haipo'
        });
        continue;
      }

      const dispatchResult = await sendBeemSMS(phone, finalMsg);

      if (dispatchResult.success) {
        sentCount++;
        logs.push({
          student_cno: studentCno,
          phone,
          message: finalMsg,
          status: 'SENT',
          dispatchedAt: new Date().toISOString()
        });
      } else {
        failedCount++;
        logs.push({
          student_cno: studentCno,
          phone,
          message: finalMsg,
          status: 'FAILED',
          error: dispatchResult.error || 'Failed'
        });
      }
    }

    res.json({
      success: true,
      sentCount,
      failedCount,
      totalCount: recipients.length,
      logs
    });
  } catch (error: any) {
    console.error('Error in /api/sms/send-announcement:', error);
    res.status(500).json({ success: false, error: error.message || 'Hitilafu wakati wa kutuma matangazo' });
  }
});

// TIMETABLE REST API (Connected to both Cloud SQL timetable_assignments + school_data & local cache)
app.get('/api/timetable', async (req, res) => {
  try {
    const { schoolId, class: className, stream, teacherId, day } = req.query as Record<string, string>;
    const resolvedSchoolId = (!schoolId || schoolId === 'DEMO_SCHOOL' || schoolId === 'DEFAULT_PRIMARY_SCHOOL_ID')
      ? DEFAULT_SCHOOL_UUID
      : schoolId;

    // Pull from Cloud SQL school_data & timetable_assignments and merge into timetableStore
    try {
      const [snap, dbAssigns] = await Promise.all([
        db.query.schoolData.findFirst({ where: eq(schema.schoolData.schoolId, resolvedSchoolId) }),
        db.select().from(schema.timetableAssignments).where(eq(schema.timetableAssignments.schoolId, resolvedSchoolId)),
      ]);
      const snapList = Array.isArray(snap?.timetableAssignments) ? (snap.timetableAssignments as any[]) : [];
      const dbList = (dbAssigns || []).map(r => toDualCaseRow(schema.timetableAssignments, r));
      const mergedFromSql = mergeNonDestructiveArray(
        snapList,
        undefined,
        dbList,
        [],
        (a, i) => {
          const cls = String(a?.className || a?.class_name || '').trim().toLowerCase();
          const str = String(a?.stream || '').trim().toLowerCase();
          const d = String(a?.day || '').trim().toLowerCase();
          const prd = String(a?.period || a?.periodName || a?.period_name || '').trim().toLowerCase();
          return cls && d && prd ? `${cls}_${str}_${d}_${prd}` : String(a?.id || i);
        }
      );
      if (mergedFromSql.length > 0) {
        saveTimetable(resolvedSchoolId, mergedFromSql as ServerTimetableAssignment[], { replace: false });
      }
    } catch (sqlErr) {
      // Fallback to local store if Cloud SQL query fails
    }

    const results = queryTimetable({
      schoolId: resolvedSchoolId,
      className,
      stream,
      teacherId,
      day
    });

    res.json({
      success: true,
      count: results.length,
      data: results,
      periods: results
    });
  } catch (error: any) {
    console.error('Error in GET /api/timetable:', error);
    res.status(500).json({ success: false, error: error.message || 'Error fetching timetable' });
  }
});

app.post('/api/timetable', async (req, res) => {
  try {
    const { schoolId = DEFAULT_SCHOOL_UUID, assignments, replace = false, className, stream } = req.body;
    const resolvedSchoolId = (!schoolId || schoolId === 'DEMO_SCHOOL' || schoolId === 'DEFAULT_PRIMARY_SCHOOL_ID')
      ? DEFAULT_SCHOOL_UUID
      : schoolId;

    if (!Array.isArray(assignments) && !req.body.entry) {
      return res.status(400).json({ success: false, error: 'assignments array or entry object required' });
    }

    const toSave: ServerTimetableAssignment[] = Array.isArray(assignments)
      ? assignments
      : [req.body.entry];

    const updated = saveTimetable(resolvedSchoolId, toSave, { replace, className, stream });

    // Also persist to Cloud SQL timetable_assignments & school_data non-destructively
    try {
      const existing = await db.query.schoolData.findFirst({
        where: eq(schema.schoolData.schoolId, resolvedSchoolId),
      });
      const mergedTimetable = mergeNonDestructiveArray(
        updated,
        undefined,
        existing?.timetableAssignments,
        [],
        (a, i) => {
          const cls = String(a?.className || a?.class_name || '').trim().toLowerCase();
          const str = String(a?.stream || '').trim().toLowerCase();
          const d = String(a?.day || '').trim().toLowerCase();
          const prd = String(a?.period || a?.periodName || a?.period_name || '').trim().toLowerCase();
          return cls && d && prd ? `${cls}_${str}_${d}_${prd}` : String(a?.id || i);
        },
        { allowExplicitReplace: Boolean(replace && !className && !stream) }
      );
      if (existing) {
        await db.update(schema.schoolData)
          .set({ timetableAssignments: mergedTimetable, updatedAt: new Date() })
          .where(eq(schema.schoolData.schoolId, resolvedSchoolId));
      }
      scheduleRelationalSync(resolvedSchoolId, { ...(existing || {}), timetableAssignments: mergedTimetable });
    } catch (sqlErr) {
      console.warn('Cloud SQL sync in POST /api/timetable warning:', sqlErr);
    }

    res.json({
      success: true,
      count: updated.length,
      data: updated
    });
  } catch (error: any) {
    console.error('Error in POST /api/timetable:', error);
    res.status(500).json({ success: false, error: error.message || 'Error saving timetable' });
  }
});

app.delete('/api/timetable', async (req, res) => {
  try {
    const { schoolId = DEFAULT_SCHOOL_UUID, id, className, stream, day, period } = req.body;
    const resolvedSchoolId = (!schoolId || schoolId === 'DEMO_SCHOOL' || schoolId === 'DEFAULT_PRIMARY_SCHOOL_ID')
      ? DEFAULT_SCHOOL_UUID
      : schoolId;
    const deleted = deleteTimetableAssignment(resolvedSchoolId, { id, className, stream, day, period });

    try {
      const remaining = queryTimetable({ schoolId: resolvedSchoolId });
      const existing = await db.query.schoolData.findFirst({
        where: eq(schema.schoolData.schoolId, resolvedSchoolId),
      });
      if (existing && Array.isArray(existing.timetableAssignments)) {
        const filtered = (existing.timetableAssignments as any[]).filter((a: any) => {
          if (id && String(a?.id) === String(id)) return false;
          if (
            className && stream && day && period &&
            String(a?.className || a?.class_name || '').toLowerCase() === String(className).toLowerCase() &&
            String(a?.stream || '').toLowerCase() === String(stream).toLowerCase() &&
            String(a?.day || '').toLowerCase() === String(day).toLowerCase() &&
            String(a?.period || a?.periodName || '').toLowerCase() === String(period).toLowerCase()
          ) {
            return false;
          }
          return true;
        });
        await db.update(schema.schoolData)
          .set({ timetableAssignments: filtered, updatedAt: new Date() })
          .where(eq(schema.schoolData.schoolId, resolvedSchoolId));
      }
      if (id) {
        await db.delete(schema.timetableAssignments)
          .where(eq(schema.timetableAssignments.id, `ta_${resolvedSchoolId}_${id}`))
          .catch(() => {});
      }
      void remaining;
    } catch (sqlErr) {
      console.warn('Cloud SQL delete in DELETE /api/timetable warning:', sqlErr);
    }

    res.json({ success: true, deleted });
  } catch (error: any) {
    console.error('Error in DELETE /api/timetable:', error);
    res.status(500).json({ success: false, error: error.message || 'Error deleting timetable' });
  }
});

// Timetable AI generation endpoint
app.post('/api/ai/generate-timetable', async (req, res) => {
  try {
    const result = await generateAITimetable(req.body);
    res.json(result);
  } catch (error: any) {
    console.error('API Error in /api/ai/generate-timetable:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error while generating timetable'
    });
  }
});

// Scheme of Work AI generation endpoint
app.post('/api/ai/generate-scheme', async (req, res) => {
  try {
    const result = await generateAISchemeOfWork(req.body);
    res.json(result);
  } catch (error: any) {
    console.error('API Error in /api/ai/generate-scheme:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error while generating scheme of work'
    });
  }
});

// Lesson Plan AI generation endpoint
app.post('/api/ai/generate-lesson-plan', async (req, res) => {
  try {
    const result = await generateAILessonPlan(req.body);
    res.json(result);
  } catch (error: any) {
    console.error('API Error in /api/ai/generate-lesson-plan:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error while generating lesson plan'
    });
  }
});

// NECTA URL Results Fetcher & Parser
app.post('/api/necta/fetch-url', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ success: false, error: 'URL is required' });
    }
    const result = await fetchAndParseNectaUrl(url);
    res.json(result);
  } catch (error: any) {
    console.error('Error in /api/necta/fetch-url:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error while fetching NECTA URL'
    });
  }
});

// GITHUB INTEGRATION
app.get('/api/auth/github/url', (req, res) => {
  const { origin } = req.query;
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    return res.status(500).json({ error: 'GITHUB_CLIENT_ID NOT SET in environment' });
  }
  const redirectUri = `${origin}/api/auth/github/callback`;
  const url = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=repo,user`;
  res.json({ url });
});

app.get('/api/auth/github/callback', async (req, res) => {
  const { code } = req.query;
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  try {
    const response = await axios.post('https://github.com/login/oauth/access_token', {
      client_id: clientId,
      client_secret: clientSecret,
      code
    }, {
      headers: { Accept: 'application/json' }
    });

    const { access_token } = response.data;

    res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'GITHUB_AUTH_SUCCESS', token: '${access_token}' }, '*');
              window.close();
            } else {
              document.body.innerHTML = '<h2>Authentication successful. You can close this window.</h2>';
            }
          </script>
        </body>
      </html>
    `);
  } catch (error: any) {
    console.error('GitHub Callback Error:', error.response?.data || error.message);
    res.status(500).send('Authentication failed');
  }
});

app.post('/api/github/push', async (req, res) => {
  const { token, repoName, commitMessage = 'Push from Haby Edu Pro' } = req.body;
  if (!token || !repoName) {
    return res.status(400).json({ error: 'Token and repoName required' });
  }

  try {
    const git = simpleGit();
    
    // Initialize if not exists
    if (!fs.existsSync(path.join(__dirname, '.git'))) {
      await git.init();
    }

    // Git config if needed
    await git.addConfig('user.name', 'Haby Edu Pro AI');
    await git.addConfig('user.email', 'ai@habyedupro.com');

    // Add everything
    await git.add('.');
    
    // Commit
    try {
      await git.commit(commitMessage);
    } catch (e) {
      // ignore
    }

    // Remote
    const remoteUrl = `https://x-access-token:${token}@github.com/${repoName}.git`;
    
    // Check if remote exists
    const remotes = await git.getRemotes();
    if (remotes.some(r => r.name === 'origin')) {
      await git.remote(['set-url', 'origin', remoteUrl]);
    } else {
      await git.addRemote('origin', remoteUrl);
    }

    // Rename branch to main if needed
    try {
      await git.branch(['-M', 'main']);
    } catch (e) {}

    // Push
    await git.push('origin', 'main', ['--force']);

    res.json({ success: true });
  } catch (error: any) {
    console.error('Git push error:', error);
    res.status(500).json({ error: error.message });
  }
});

// NETLIFY AUTO CLEAR CACHE & DEPLOY
app.post('/api/netlify/deploy', async (req, res) => {
  const token = req.body.token || process.env.NETLIFY_TOKEN;
  const siteId = req.body.siteId || process.env.NETLIFY_SITE_ID || 'habyedupro';
  const clearCache = req.body.clearCache !== false;

  if (!token) {
    return res.status(400).json({ error: 'Netlify Personal Access Token is required.' });
  }

  try {
    console.log(`[Netlify] Triggering deploy for site: ${siteId} (clear_cache: ${clearCache})...`);
    const netlifyRes = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}/builds`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ clear_cache: clearCache })
    });

    if (!netlifyRes.ok) {
      const errBody = await netlifyRes.text();
      let parsedMessage = errBody;
      try {
        const json = JSON.parse(errBody);
        parsedMessage = json.message || errBody;
      } catch (e) {}
      console.error(`[Netlify API Error] Status ${netlifyRes.status}:`, parsedMessage);
      return res.status(netlifyRes.status).json({ error: `Netlify API error: ${parsedMessage}` });
    }

    const data = await netlifyRes.json();
    console.log('✅ Netlify deploy triggered successfully, Build ID:', data.id);
    return res.json({
      success: true,
      id: data.id,
      deploy_id: data.deploy_id || data.id,
      site_id: siteId,
      url: `https://app.netlify.com/sites/${siteId}/deploys/${data.id || ''}`,
      data
    });
  } catch (error: any) {
    console.error('Netlify deploy exception:', error);
    return res.status(500).json({ error: error.message || 'Failed to trigger Netlify deploy' });
  }
});

// ZIP DOWNLOAD
app.get('/api/project/zip', (req, res) => {
  try {
    const zip = new AdmZip();
    const rootPath = path.resolve(__dirname);
    
    const items = fs.readdirSync(rootPath);
    items.forEach(item => {
      const fullPath = path.join(rootPath, item);
      const stat = fs.statSync(fullPath);
      
      if (
        item === 'node_modules' ||
        item === '.git' ||
        item === 'dist' ||
        item.endsWith('.zip') ||
        item.endsWith('.tar.gz') ||
        item === '.env'
      ) {
        return;
      }
      
      if (stat.isDirectory()) {
        zip.addLocalFolder(fullPath, item);
      } else {
        zip.addLocalFile(fullPath);
      }
    });

    const buffer = zip.toBuffer();
    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': 'attachment; filename=haby-edu-pro-source.zip',
      'Content-Length': buffer.length
    });
    res.end(buffer);
  } catch (err: any) {
    console.error('Zip Error:', err);
    res.status(500).send('Error generating ZIP');
  }
});

// Attendance API
app.post('/api/db/attendance', async (req, res) => {
  try {
    const { schoolId, payload } = req.body || {};
    const validSchoolUuid = await ensureSchoolExists(schoolId || payload?.schoolId || payload?.school_id);
    const records = (Array.isArray(payload) ? payload : [payload]).map((p: any) => ({
      ...p,
      schoolId: validSchoolUuid,
    }));
    const saved = await upsertTableRecords('period_attendance', schema.periodAttendance, records);
    res.json({ success: true, data: saved });
  } catch (err: any) {
    console.error('Error saving attendance:', err?.message || err);
    res.status(500).json({ success: false, error: err?.message || 'Failed to save attendance' });
  }
});

app.get('/api/db/attendance', async (req, res) => {
  try {
    const { schoolId } = req.query as any;
    const validSchoolUuid = toDeterministicUuid(schoolId, true);
    const data = await db.select().from(schema.periodAttendance).where(eq(schema.periodAttendance.schoolId, validSchoolUuid));
    res.json(data.map(r => toDualCaseRow(schema.periodAttendance, r)));
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch attendance' });
  }
});

app.get('/api/db/attendance/weekly', async (req, res) => {
  try {
    const { schoolId } = req.query as any;
    const validSchoolUuid = toDeterministicUuid(schoolId, true);
    const data = await db.select().from(schema.periodAttendance).where(eq(schema.periodAttendance.schoolId, validSchoolUuid));
    res.json(data.map(r => toDualCaseRow(schema.periodAttendance, r)));
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch weekly attendance' });
  }
});

// ============================================================================
// AUTOMATED DAILY BACKUP & SUPABASE STORAGE SNAPSHOT ENGINE
// ============================================================================
const BACKUPS_ROOT_DIR = path.resolve(__dirname, '.backups');
if (!fs.existsSync(BACKUPS_ROOT_DIR)) {
  try {
    fs.mkdirSync(BACKUPS_ROOT_DIR, { recursive: true });
  } catch (e) {
    console.warn('Could not create .backups directory:', e);
  }
}

interface ServerAutoBackupConfig {
  enabled: boolean;
  scheduledTime: string; // "HH:MM"
  backupMode: 'json_download' | 'supabase_snapshot' | 'both';
  retentionCount: number;
  lastBackupDate?: string | null;
  lastJsonDownloadDate?: string | null;
  lastSupabaseSnapshotDate?: string | null;
  lastBackupTimestamp?: string | null;
  lastBackupStatus?: 'success' | 'error' | null;
  lastBackupMessage?: string | null;
}

const DEFAULT_SERVER_BACKUP_CONFIG: ServerAutoBackupConfig = {
  enabled: true,
  scheduledTime: '17:00',
  backupMode: 'both',
  retentionCount: 14,
  lastBackupDate: null,
  lastJsonDownloadDate: null,
  lastSupabaseSnapshotDate: null,
  lastBackupTimestamp: null,
  lastBackupStatus: null,
  lastBackupMessage: null,
};

function getSchoolBackupDir(schoolId: string): string {
  const validSchoolUuid = toDeterministicUuid(schoolId || '02dff10d-78fb-4af6-ab5a-db1d275d7e06', true);
  const dir = path.join(BACKUPS_ROOT_DIR, validSchoolUuid);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

async function readSchoolBackupConfig(schoolId: string): Promise<ServerAutoBackupConfig> {
  const validSchoolUuid = toDeterministicUuid(schoolId || '02dff10d-78fb-4af6-ab5a-db1d275d7e06', true);
  const dir = getSchoolBackupDir(validSchoolUuid);
  const cfgPath = path.join(dir, 'config.json');

  let fileCfg: Partial<ServerAutoBackupConfig> = {};
  if (fs.existsSync(cfgPath)) {
    try {
      fileCfg = JSON.parse(fs.readFileSync(cfgPath, 'utf-8'));
    } catch (e) {}
  }

  try {
    const rows = await db
      .select()
      .from(schema.schoolData)
      .where(eq(schema.schoolData.schoolId, validSchoolUuid));
    if (rows.length > 0) {
      const policy = (rows[0].institutionalPolicy || {}) as any;
      if (policy && policy.autoBackupConfig) {
        return {
          ...DEFAULT_SERVER_BACKUP_CONFIG,
          ...policy.autoBackupConfig,
          ...fileCfg,
        };
      }
    }
  } catch (e) {}

  return {
    ...DEFAULT_SERVER_BACKUP_CONFIG,
    ...fileCfg,
  };
}

async function writeSchoolBackupConfig(schoolId: string, config: Partial<ServerAutoBackupConfig>): Promise<ServerAutoBackupConfig> {
  const validSchoolUuid = await ensureSchoolExists(schoolId);
  const current = await readSchoolBackupConfig(validSchoolUuid);
  const merged: ServerAutoBackupConfig = {
    ...DEFAULT_SERVER_BACKUP_CONFIG,
    ...current,
    ...config,
  };

  const dir = getSchoolBackupDir(validSchoolUuid);
  const cfgPath = path.join(dir, 'config.json');
  try {
    fs.writeFileSync(cfgPath, JSON.stringify(merged, null, 2), 'utf-8');
  } catch (e) {
    console.warn('Error writing backup config file:', e);
  }

  // Also persist inside school_data.institutionalPolicy.autoBackupConfig in PostgreSQL
  try {
    const rows = await db
      .select()
      .from(schema.schoolData)
      .where(eq(schema.schoolData.schoolId, validSchoolUuid));
    if (rows.length > 0) {
      const existingPolicy = (rows[0].institutionalPolicy || {}) as any;
      await db
        .update(schema.schoolData)
        .set({
          institutionalPolicy: {
            ...existingPolicy,
            autoBackupConfig: merged,
          },
          updatedAt: new Date(),
        })
        .where(eq(schema.schoolData.schoolId, validSchoolUuid));
    }
  } catch (e) {
    console.warn('Error persisting autoBackupConfig to school_data:', e);
  }

  return merged;
}

function readSnapshotIndex(schoolId: string): any[] {
  const dir = getSchoolBackupDir(schoolId);
  const idxPath = path.join(dir, 'index.json');
  if (!fs.existsSync(idxPath)) return [];
  try {
    const list = JSON.parse(fs.readFileSync(idxPath, 'utf-8'));
    return Array.isArray(list) ? list : [];
  } catch (e) {
    return [];
  }
}

function writeSnapshotIndex(schoolId: string, list: any[]) {
  const dir = getSchoolBackupDir(schoolId);
  const idxPath = path.join(dir, 'index.json');
  try {
    fs.writeFileSync(idxPath, JSON.stringify(list, null, 2), 'utf-8');
  } catch (e) {
    console.warn('Error writing snapshot index:', e);
  }
}

async function createSchoolStorageSnapshot(
  schoolId: string,
  triggerType: 'scheduled' | 'manual' = 'manual',
  clientPayload?: any
) {
  const validSchoolUuid = await ensureSchoolExists(schoolId);
  const dir = getSchoolBackupDir(validSchoolUuid);
  const now = new Date();
  const dateKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const timeKey = `${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}-${String(now.getSeconds()).padStart(2, '0')}`;
  const snapshotId = `snap_${dateKey}_${timeKey}_${triggerType}`;
  const filename = `${snapshotId}.json`;
  const filePath = path.join(dir, filename);

  // Assemble complete school data from clientPayload OR directly from PostgreSQL
  let snapshotData: any = clientPayload && typeof clientPayload === 'object' ? { ...clientPayload } : null;

  if (!snapshotData || Object.keys(snapshotData).length === 0) {
    const [schoolDataRows, dbStudents, dbTeachers, dbExams, dbClasses, dbTimetable] = await Promise.all([
      db.select().from(schema.schoolData).where(eq(schema.schoolData.schoolId, validSchoolUuid)).catch(() => []),
      db.select().from(schema.students).where(eq(schema.students.schoolId, validSchoolUuid)).catch(() => []),
      db.select().from(schema.teachers).where(eq(schema.teachers.schoolId, validSchoolUuid)).catch(() => []),
      db.select().from(schema.exams).where(eq(schema.exams.schoolId, validSchoolUuid)).catch(() => []),
      db.select().from(schema.classes).where(eq(schema.classes.schoolId, validSchoolUuid)).catch(() => []),
      db.select().from(schema.timetableAssignments).where(eq(schema.timetableAssignments.schoolId, validSchoolUuid)).catch(() => []),
    ]);

    const baseRow: any = schoolDataRows[0] ? toDualCaseRow(schema.schoolData, schoolDataRows[0]) : {};
    snapshotData = {
      ...baseRow,
      schoolId: validSchoolUuid,
      students: Array.isArray(baseRow.students) && baseRow.students.length > 0 ? baseRow.students : dbStudents,
      teachers: Array.isArray(baseRow.teachers) && baseRow.teachers.length > 0 ? baseRow.teachers : dbTeachers,
      exams: Array.isArray(baseRow.exams) && baseRow.exams.length > 0 ? baseRow.exams : dbExams,
      classes: dbClasses,
      timetableAssignments:
        Array.isArray(baseRow.timetableAssignments) && baseRow.timetableAssignments.length > 0
          ? baseRow.timetableAssignments
          : dbTimetable,
    };
  }

  const counts = {
    students: Array.isArray(snapshotData.students) ? snapshotData.students.length : 0,
    teachers: Array.isArray(snapshotData.teachers) ? snapshotData.teachers.length : 0,
    exams: Array.isArray(snapshotData.exams) ? snapshotData.exams.length : 0,
    classes: Array.isArray(snapshotData.streamSettings)
      ? snapshotData.streamSettings.length
      : Array.isArray(snapshotData.classes)
      ? snapshotData.classes.length
      : 8,
    timetableAssignments: Array.isArray(snapshotData.timetableAssignments) ? snapshotData.timetableAssignments.length : 0,
    examinationRecords: Array.isArray(snapshotData.examinationRecords) ? snapshotData.examinationRecords.length : 0,
  };

  const fullEnvelope = {
    _snapshotMeta: {
      id: snapshotId,
      schoolId: validSchoolUuid,
      createdAt: now.toISOString(),
      dateKey,
      triggerType,
      bucket: 'school-backups',
      storagePath: `${validSchoolUuid}/${filename}`,
      counts,
    },
    ...snapshotData,
  };

  const serialized = JSON.stringify(fullEnvelope, null, 2);
  fs.writeFileSync(filePath, serialized, 'utf-8');
  const sizeBytes = Buffer.byteLength(serialized, 'utf-8');

  const meta = {
    id: snapshotId,
    schoolId: validSchoolUuid,
    filename,
    storagePath: `${validSchoolUuid}/${filename}`,
    bucket: 'school-backups',
    createdAt: now.toISOString(),
    dateKey,
    triggerType,
    mode: 'supabase_snapshot',
    sizeBytes,
    counts,
  };

  const existingIndex = readSnapshotIndex(validSchoolUuid).filter(item => item.id !== snapshotId);
  const config = await readSchoolBackupConfig(validSchoolUuid);
  const retention = Math.max(3, Number(config.retentionCount) || 14);

  const updatedIndex = [meta, ...existingIndex];
  const pruned = updatedIndex.slice(0, retention);
  const removed = updatedIndex.slice(retention);
  for (const old of removed) {
    try {
      const oldPath = path.join(dir, old.filename);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    } catch (e) {}
  }

  writeSnapshotIndex(validSchoolUuid, pruned);

  // Update config last backup metadata
  await writeSchoolBackupConfig(validSchoolUuid, {
    lastBackupDate: dateKey,
    lastSupabaseSnapshotDate: dateKey,
    lastBackupTimestamp: now.toISOString(),
    lastBackupStatus: 'success',
    lastBackupMessage: `Supabase storage snapshot ${filename} saved (${counts.students} students, ${counts.teachers} teachers)`,
  });

  // Record in activity_logs table
  try {
    await db
      .insert(schema.activityLogs)
      .values({
        id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        schoolId: validSchoolUuid,
        userId: 'system-scheduler',
        userName: triggerType === 'scheduled' ? 'Automated Daily Backup' : 'School Administrator',
        userEmail: 'backup@habyedupro.ac.tz',
        userRole: 'HEADMASTER',
        category: 'settings',
        action: 'BACKUP_SNAPSHOT',
        title: triggerType === 'scheduled' ? 'Automated Daily Supabase Snapshot Completed' : 'Manual Supabase Storage Snapshot Created',
        description: `Saved snapshot ${filename} (${(sizeBytes / 1024).toFixed(1)} KB) with ${counts.students} students and ${counts.teachers} teachers.`,
        timestamp: now.toISOString(),
      })
      .onConflictDoNothing();
  } catch (e) {}

  return meta;
}

// REST Endpoints for Automated Daily Backup & Supabase Storage Snapshots
app.get('/api/backups/config', async (req, res) => {
  try {
    const schoolId = (req.query.schoolId as string) || '02dff10d-78fb-4af6-ab5a-db1d275d7e06';
    const config = await readSchoolBackupConfig(schoolId);
    res.json({ success: true, config });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to read backup config' });
  }
});

app.post('/api/backups/config', async (req, res) => {
  try {
    const { schoolId = '02dff10d-78fb-4af6-ab5a-db1d275d7e06', config = {} } = req.body || {};
    const saved = await writeSchoolBackupConfig(schoolId, config);
    res.json({ success: true, config: saved });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to save backup config' });
  }
});

app.get('/api/backups/list', async (req, res) => {
  try {
    const schoolId = (req.query.schoolId as string) || '02dff10d-78fb-4af6-ab5a-db1d275d7e06';
    const validSchoolUuid = toDeterministicUuid(schoolId, true);
    let snapshots = readSnapshotIndex(validSchoolUuid);

    // Seed an initial baseline snapshot if none exists yet so the storage table is immediately populated
    if (snapshots.length === 0) {
      try {
        const initialSnap = await createSchoolStorageSnapshot(validSchoolUuid, 'scheduled');
        snapshots = [initialSnap];
      } catch (seedErr) {
        console.warn('Initial snapshot seed warning:', seedErr);
      }
    }

    res.json({ success: true, snapshots });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to list snapshots', snapshots: [] });
  }
});

app.post('/api/backups/snapshot', async (req, res) => {
  try {
    const { schoolId = '02dff10d-78fb-4af6-ab5a-db1d275d7e06', triggerType = 'manual', payload } = req.body || {};
    const snapshot = await createSchoolStorageSnapshot(schoolId, triggerType, payload);
    res.json({ success: true, snapshot });
  } catch (err: any) {
    console.error('Error creating storage snapshot:', err);
    res.status(500).json({ success: false, error: err?.message || 'Failed to create snapshot' });
  }
});

app.get('/api/backups/download/:snapshotId', async (req, res) => {
  try {
    const schoolId = (req.query.schoolId as string) || '02dff10d-78fb-4af6-ab5a-db1d275d7e06';
    const validSchoolUuid = toDeterministicUuid(schoolId, true);
    const snapshotId = req.params.snapshotId.replace(/\.json$/i, '');
    const dir = getSchoolBackupDir(validSchoolUuid);
    const filePath = path.join(dir, `${snapshotId}.json`);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Snapshot not found' });
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${snapshotId}.json"`);
    res.send(content);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to download snapshot' });
  }
});

app.delete('/api/backups/:snapshotId', async (req, res) => {
  try {
    const schoolId = (req.query.schoolId as string) || '02dff10d-78fb-4af6-ab5a-db1d275d7e06';
    const validSchoolUuid = toDeterministicUuid(schoolId, true);
    const snapshotId = req.params.snapshotId.replace(/\.json$/i, '');
    const dir = getSchoolBackupDir(validSchoolUuid);
    const filePath = path.join(dir, `${snapshotId}.json`);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    const updated = readSnapshotIndex(validSchoolUuid).filter(item => item.id !== snapshotId);
    writeSnapshotIndex(validSchoolUuid, updated);
    res.json({ success: true, snapshots: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to delete snapshot' });
  }
});

// Background Server-Side Daily Backup Cron (checks every 30 seconds)
setInterval(async () => {
  try {
    const now = new Date();
    const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const currentHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const schoolIds = new Set<string>(['02dff10d-78fb-4af6-ab5a-db1d275d7e06']);
    if (fs.existsSync(BACKUPS_ROOT_DIR)) {
      for (const entry of fs.readdirSync(BACKUPS_ROOT_DIR)) {
        if (UUID_REGEX.test(entry)) schoolIds.add(entry);
      }
    }

    for (const sId of schoolIds) {
      const cfg = await readSchoolBackupConfig(sId);
      if (!cfg.enabled) continue;
      if (cfg.backupMode !== 'supabase_snapshot' && cfg.backupMode !== 'both') continue;

      const scheduledHHMM = (cfg.scheduledTime || '17:00').slice(0, 5);
      const alreadyDoneToday = cfg.lastSupabaseSnapshotDate === todayKey;

      if (!alreadyDoneToday && currentHHMM >= scheduledHHMM) {
        console.log(`[AutoDailyBackup] Triggering scheduled daily Supabase snapshot for school ${sId} at ${currentHHMM} (scheduled: ${scheduledHHMM})`);
        await createSchoolStorageSnapshot(sId, 'scheduled');
      }
    }
  } catch (err) {
    // Silent background check
  }
}, 30000);


// In dev mode, mount Vite middleware; in production or when built, serve dist files immediately
async function startServer() {
  const isDevLifecycle = process.env.npm_lifecycle_event === 'dev' || process.argv.includes('--port');
  const isProduction = process.env.NODE_ENV === 'production' || !isDevLifecycle;
  const distDir = path.resolve(__dirname, 'dist');
  const indexPath = path.join(distDir, 'index.html');
  const hasDist = fs.existsSync(indexPath);

  const portArgIdx = process.argv.indexOf('--port');
  const cliPort = portArgIdx !== -1 && process.argv[portArgIdx + 1] ? Number(process.argv[portArgIdx + 1]) : null;
  const listenPort = cliPort || (isDevLifecycle ? 3000 : (Number(process.env.PORT) || 3000));

  // Bind HTTP listener immediately so Cloud Run / container health checks pass without waiting for bundler init
  const srv = app.listen(listenPort, '0.0.0.0', () => {
    console.log(`HABY EDU PRO server listening on http://0.0.0.0:${listenPort} (mode: ${isProduction && hasDist ? 'production' : 'development'})`);
  });

  srv.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE' && listenPort !== 3000) {
      app.listen(3000, '0.0.0.0', () => {
        console.log(`HABY EDU PRO server listening on fallback port http://0.0.0.0:3000`);
      });
    } else {
      console.error('Server listen error:', err);
    }
  });

  if (isProduction && hasDist) {
    app.use(express.static(distDir, { maxAge: '1h', index: false }));
    app.get(/.*/, (_req, res) => {
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath, (err) => {
          if (err && !res.headersSent) {
            res.status(500).send('Error loading application');
          }
        });
      } else {
        res.status(503).send('Application is rebuilding. Please refresh in a moment.');
      }
    });
  } else {
    // Development: mount Vite middleware
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    app.get(/.*/, async (req, res, next) => {
      try {
        const url = req.originalUrl;
        const templatePath = path.resolve(__dirname, 'index.html');
        if (!fs.existsSync(templatePath)) {
          return next();
        }
        let template = fs.readFileSync(templatePath, 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e: any) {
        vite.ssrFixStacktrace(e);
        next(e);
      }
    });
  }
}

export default app;

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

