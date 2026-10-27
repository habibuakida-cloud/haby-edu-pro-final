import express from 'express';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
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
import { eq, or, inArray, notInArray, and, asc, desc, getTableColumns, sql } from 'drizzle-orm';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = Number(process.env.PORT) || 3000;

app.disable('x-powered-by');
app.use(express.json({ limit: '10mb' }));

// ============================================================================
// 1. SECURITY HEADERS & SENSITIVE FILE / DOTFILE BLOCKER
// ============================================================================
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  // Block publicly exposed dotfiles, git metadata, env files, SQL dumps, and server configs
  const decodedPath = decodeURIComponent(req.path || '').toLowerCase();
  if (
    /(^|\/)\.(git|env|htaccess|DS_Store|npmrc|dockerignore)/i.test(decodedPath) ||
    /\.(sql|bak|old|swp|orig|log)$/i.test(decodedPath) ||
    decodedPath === '/server.ts' ||
    decodedPath === '/drizzle.config.ts'
  ) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
});

// ============================================================================
// 2. SLIDING-WINDOW RATE LIMITER FOR AUTH & SENSITIVE ENDPOINTS
// ============================================================================
const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>();
function createRateLimiter(maxRequests: number, windowMs: number) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const forwarded = req.headers['x-forwarded-for'];
    const clientIp = (typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : req.socket.remoteAddress) || 'unknown';
    const key = `${req.path}:${clientIp}`;
    const now = Date.now();
    const record = rateLimitBuckets.get(key);
    if (!record || now > record.resetAt) {
      rateLimitBuckets.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }
    record.count += 1;
    if (record.count > maxRequests) {
      const retryAfterSec = Math.ceil((record.resetAt - now) / 1000);
      res.setHeader('Retry-After', String(retryAfterSec));
      return res.status(429).json({
        success: false,
        error: `Umejaribu mara nyingi sana. Tafadhali subiri sekunde ${retryAfterSec} kabla ya kujaribu tena (Too many requests).`,
      });
    }
    next();
  };
}

const authRateLimiter = createRateLimiter(20, 15 * 60 * 1000); // 20 attempts per 15 min
const aiRateLimiter = createRateLimiter(30, 15 * 60 * 1000);   // 30 requests per 15 min

// ============================================================================
// 3. CRYPTOGRAPHIC SESSION TOKENS & PASSWORD HASHING / REDACTION HELPERS
// ============================================================================
const SESSION_SECRET =
  process.env.JWT_SECRET ||
  crypto
    .createHash('sha256')
    .update(
      `${process.env.SQL_HOST || ''}:${process.env.SQL_DB_NAME || ''}:${
        process.env.SQL_PASSWORD || process.env.SQL_ADMIN_PASSWORD || 'haby-edu-pro-hardened-session-secret-2026'
      }:haby-jwt-v1`
    )
    .digest('hex');

export interface SessionPayload {
  uid: string;
  email: string;
  role: string;
  schoolId: string;
  isSuperAdmin: boolean;
  exp: number;
}

function signSessionToken(payload: Omit<SessionPayload, 'exp'>, ttlMs = 12 * 60 * 60 * 1000): string {
  const fullPayload: SessionPayload = {
    ...payload,
    exp: Date.now() + ttlMs,
  };
  const dataB64 = Buffer.from(JSON.stringify(fullPayload), 'utf8').toString('base64url');
  const sigB64 = crypto.createHmac('sha256', SESSION_SECRET).update(dataB64).digest('base64url');
  return `${dataB64}.${sigB64}`;
}

function verifySessionToken(token?: string | null): SessionPayload | null {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  try {
    const [dataB64, sigB64] = token.split('.');
    if (!dataB64 || !sigB64) return null;
    const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(dataB64).digest('base64url');
    const sigBuf = Buffer.from(sigB64);
    const expectedBuf = Buffer.from(expectedSig);
    if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
      return null;
    }
    const parsed = JSON.parse(Buffer.from(dataB64, 'base64url').toString('utf8')) as SessionPayload;
    if (!parsed || typeof parsed.exp !== 'number' || Date.now() > parsed.exp) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function extractSession(req: express.Request): SessionPayload | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const verified = verifySessionToken(authHeader.slice(7).trim());
    if (verified) return verified;
  }
  const customHeader = req.headers['x-haby-token'];
  if (typeof customHeader === 'string') {
    const verified = verifySessionToken(customHeader.trim());
    if (verified) return verified;
  }
  const cookieHeader = req.headers.cookie || '';
  const match = cookieHeader.match(/(?:^|;\s*)haby_session=([^;]+)/);
  if (match && match[1]) {
    const verified = verifySessionToken(decodeURIComponent(match[1]));
    if (verified) return verified;
  }
  return null;
}

const BCRYPT_HASH_REGEX = /^\$2[aby]\$\d{2}\$.{53}$/;
function isBcryptHash(val: any): boolean {
  return typeof val === 'string' && BCRYPT_HASH_REGEX.test(val);
}

async function hashPasswordSafe(rawPassword: any): Promise<string> {
  const str = String(rawPassword || '').trim();
  if (!str) return '';
  if (isBcryptHash(str)) return str;
  return bcrypt.hash(str, 12);
}

async function verifyPasswordSafe(inputPassword: string, storedSecret: string): Promise<{ valid: boolean; needsRehash: boolean }> {
  if (!storedSecret) return { valid: false, needsRehash: false };
  if (isBcryptHash(storedSecret)) {
    const match = await bcrypt.compare(String(inputPassword), storedSecret);
    return { valid: match, needsRehash: false };
  }
  // Constant-time comparison for legacy plaintext passwords before automatic bcrypt upgrade
  const a = Buffer.from(String(inputPassword), 'utf8');
  const b = Buffer.from(String(storedSecret), 'utf8');
  if (a.length !== b.length) return { valid: false, needsRehash: false };
  const valid = crypto.timingSafeEqual(a, b);
  return { valid, needsRehash: valid };
}

function redactUserSensitiveFields(row: Record<string, any>): Record<string, any> {
  if (!row || typeof row !== 'object') return row;
  const copy = { ...row };
  delete copy.password;
  delete copy.passwordHash;
  delete copy.password_hash;
  return copy;
}

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
  remedial_payment_history: schema.staffPayroll,
  class_journals: schema.classJournals,
  election_events: schema.electionEvents,
  election_positions: schema.electionPositions,
  election_candidates: schema.electionCandidates,
  election_votes: schema.electionVotes,
  joint_exams: schema.jointExams,
  joint_schools: schema.jointSchools,
  joint_results: schema.jointResults,
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
      if (jsKey === 'passwordHash') {
        rawVal = rawRecord.password || rawRecord.password_hash || rawRecord.passwordHash;
        if (!rawVal) {
          rawVal = crypto.randomBytes(16).toString('hex');
        }
      }
      if (jsKey === 'startTime') rawVal = rawRecord.start || rawRecord.start_time || '08:00';
      if (jsKey === 'endTime') rawVal = rawRecord.end || rawRecord.end_time || '08:40';
      if (jsKey === 'periodTime') rawVal = rawRecord.period_time || '16:00-17:00';
      if (jsKey === 'dayOfWeek') rawVal = rawRecord.day || rawRecord.day_of_week || 'Monday';
      if (jsKey === 'roomName') rawVal = rawRecord.room_name || rawRecord.roomName || rawRecord.room_no || rawRecord.name || 'ROOM 01';
      if (jsKey === 'totalCandidates') rawVal = rawRecord.total_candidates ?? rawRecord.totalCandidates ?? rawRecord.total_seats ?? 0;
      if (jsKey === 'gridLayout') rawVal = rawRecord.grid_layout || rawRecord.gridLayout || {};
    }

    if (rawVal !== undefined) {
      if ((jsKey === 'passwordHash' || jsKey === 'password') && typeof rawVal === 'string' && rawVal.trim() !== '') {
        if (tableObj === schema.users || tableObj === schema.schoolAdmins) {
          rawVal = await hashPasswordSafe(rawVal);
        }
      }
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
  if (tableObj === schema.users || tableObj === schema.schoolAdmins) {
    return redactUserSensitiveFields(enriched);
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
  } else if (tableName === 'users' && tableObj.email) {
    conflictTarget = tableObj.email;
    conflictKeyName = 'email';
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
    if (conflictKeyName === 'email' && jsKey === 'email') continue;
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
            if (conflictKeyName === 'schoolId' || conflictKeyName === 'email') delete updateSet.id;
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
    const rawStudents = Array.isArray(raw.students) ? raw.students : [];
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
    } else if (Array.isArray(raw.students) && raw.students.length === 0) {
      await db.delete(schema.students).where(eq(schema.students.schoolId, validSchoolUuid)).catch(() => {});
    }

    // 2. Teachers (canonical deterministic ID + prune deleted teachers)
    const rawTeachers = Array.isArray(raw.teachers) ? raw.teachers : [];
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
    } else if (Array.isArray(raw.teachers) && raw.teachers.length === 0) {
      await db.delete(schema.teachers).where(eq(schema.teachers.schoolId, validSchoolUuid)).catch(() => {});
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
    const rawExams = Array.isArray(raw.exams) ? raw.exams : [];
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
      : [];
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

    // 11D. Remedial Payment Settings, Remedial Timetable & Student Government Elections baseline
    await upsertTableRecords('remedial_payment_settings', schema.remedialPaymentSettings, [
      {
        id: toDeterministicUuid(`rem_pay_${validSchoolUuid}_form1`),
        schoolId: validSchoolUuid,
        className: 'All Classes',
        ratePerPeriod: '5000',
        effectiveDate: '2026-01-15',
      },
    ]);

    if (isFirstStaticSeed) {
      const existingRemCnt = await db.execute(sql`SELECT count(*)::int as c FROM remedial_timetable`).catch(() => ({ rows: [{ c: 0 }] }));
      if (Number(existingRemCnt.rows[0]?.c || 0) === 0 && rawTeachers.length > 0) {
        const sampleRem = [
          { dayOfWeek: 'Monday', periodTime: '15:30-16:30', className: 'Form 4', stream: 'A', subject: 'Basic Mathematics', teacherName: rawTeachers[0]?.name || 'Mwl. Juma' },
          { dayOfWeek: 'Tuesday', periodTime: '15:30-16:30', className: 'Form 4', stream: 'A', subject: 'Physics', teacherName: rawTeachers[1]?.name || rawTeachers[0]?.name || 'Mwl. Asha' },
          { dayOfWeek: 'Wednesday', periodTime: '15:30-16:30', className: 'Form 2', stream: 'A', subject: 'Chemistry', teacherName: rawTeachers[2]?.name || rawTeachers[0]?.name || 'Mwl. Bakari' },
          { dayOfWeek: 'Thursday', periodTime: '15:30-16:30', className: 'Form 4', stream: 'B', subject: 'Biology', teacherName: rawTeachers[3]?.name || rawTeachers[0]?.name || 'Mwl. Neema' },
          { dayOfWeek: 'Friday', periodTime: '15:30-16:30', className: 'Form 2', stream: 'B', subject: 'English Language', teacherName: rawTeachers[4]?.name || rawTeachers[0]?.name || 'Mwl. John' },
          { dayOfWeek: 'Saturday', periodTime: '08:00-10:00', className: 'Form 4', stream: 'A', subject: 'Geography', teacherName: rawTeachers[5]?.name || rawTeachers[0]?.name || 'Mwl. Halima' },
        ].map((item, idx) => ({
          id: toDeterministicUuid(`rem_tt_${validSchoolUuid}_${idx}`),
          schoolId: validSchoolUuid,
          dayOfWeek: item.dayOfWeek,
          periodTime: item.periodTime,
          className: item.className,
          stream: item.stream,
          subject: item.subject,
          teacherName: item.teacherName,
          term: 'Term 1',
        }));
        await upsertTableRecords('remedial_timetable', schema.remedialTimetable, sampleRem);
      }

      const existingElecCnt = await db.execute(sql`SELECT count(*)::int as c FROM election_events`).catch(() => ({ rows: [{ c: 0 }] }));
      if (Number(existingElecCnt.rows[0]?.c || 0) === 0) {
        const defaultElectionId = toDeterministicUuid(`elec_event_2026_${validSchoolUuid}`);
        await upsertTableRecords('election_events', schema.electionEvents, [
          {
            id: defaultElectionId,
            schoolId: validSchoolUuid,
            title: 'Uchaguzi Mkuu wa Serikali ya Wanafunzi 2026',
            academicYear: '2026',
            nominationStart: new Date(Date.now() - 2 * 86400000),
            nominationEnd: new Date(Date.now() + 5 * 86400000),
            votingStart: new Date(Date.now() + 6 * 86400000),
            votingEnd: new Date(Date.now() + 8 * 86400000),
            status: 'NOMINATION_OPEN',
            createdByDisciplineHead: 'Mkuu wa Nidhamu',
          }
        ]);
        const defaultPositions = [
          { title: 'Head Boy (Kaka Mkuu)', genderRule: 'BOYS_ONLY', classRule: 'FORM_3_4', orderNumber: 1 },
          { title: 'Head Girl (Dada Mkuu)', genderRule: 'GIRLS_ONLY', classRule: 'FORM_3_4', orderNumber: 2 },
          { title: 'Academic Prefect (Kiranja wa Taaluma)', genderRule: 'ALL', classRule: 'FORM_3_4', orderNumber: 3 },
          { title: 'Discipline Prefect (Kiranja wa Nidhamu)', genderRule: 'ALL', classRule: 'FORM_3_4', orderNumber: 4 },
          { title: 'Environment Prefect (Kiranja wa Mazingira)', genderRule: 'ALL', classRule: 'ALL', orderNumber: 5 },
          { title: 'Sports & Games Prefect (Kiranja wa Michezo)', genderRule: 'ALL', classRule: 'ALL', orderNumber: 6 },
        ].map((pos, idx) => ({
          id: toDeterministicUuid(`elec_pos_${defaultElectionId}_${idx + 1}`),
          electionId: defaultElectionId,
          title: pos.title,
          description: `Nafasi ya uongozi: ${pos.title}`,
          genderRule: pos.genderRule,
          classRule: pos.classRule,
          orderNumber: pos.orderNumber,
          isCustom: false,
          photoRequired: true,
          manifestoRequired: true,
        }));
        await upsertTableRecords('election_positions', schema.electionPositions, defaultPositions);
      }
    }

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

  // If the user explicitly requested a replacement (e.g., deleting or updating from UI), respect incoming array even if empty
  if (options?.allowExplicitReplace && incomingRaw !== undefined) {
    return incomingArr as T[];
  }

  // If incoming array is explicitly provided, respect it directly so deleted items or updates are not overwritten by stale data
  if (incomingRaw !== undefined) {
    return incomingArr as T[];
  }

  if (existingArr.length > 0) {
    return existingArr as T[];
  }
  return Array.isArray(defaultVal) ? defaultVal : [];
}

function resolveSnapshotObject<T = Record<string, any>>(
  incomingCamel: any,
  incomingSnake: any,
  existingVal: any,
  defaultVal: Record<string, any> = {},
  isFullSnapshot = false
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
    if (isFullSnapshot) {
      return {
        ...defaultVal,
        ...incoming,
      } as T;
    }
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
  // Disabled automatic re-injection of demo/backup data on updates so user changes and deletions are strictly respected.
  const validSchoolUuid = (!schoolId || schoolId === 'DEMO_SCHOOL' || schoolId === 'DEFAULT_PRIMARY_SCHOOL_ID')
    ? DEFAULT_SCHOOL_UUID
    : schoolId;
  restoredSchoolsSet.add(validSchoolUuid);
}

// DB API
app.get('/api/db/school-data', async (req, res) => {
  const { schoolId } = req.query as { schoolId: string };
  const s = String(schoolId || '').trim();
  const resolvedId = (!s || s === 'DEMO_SCHOOL' || s === 'DEFAULT_PRIMARY_SCHOOL_ID') ? DEFAULT_SCHOOL_UUID : s;
  try {
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
      dual.students = Array.isArray(dual.students) ? dual.students : [];
      dual.teachers = Array.isArray(dual.teachers) ? dual.teachers : [];
      dual.exams = Array.isArray(dual.exams) ? dual.exams : [];
      dual.periodSettings = pickNonEmptyArray(dual.periodSettings, dual.period_settings, DEFAULT_APP_DATA.periodSettings);
      dual.streamSettings = pickNonEmptyArray(dual.streamSettings, dual.stream_settings, DEFAULT_APP_DATA.streamSettings);
      dual.timetableAssignments = Array.isArray(dual.timetableAssignments)
        ? dual.timetableAssignments
        : Array.isArray(dual.timetable_assignments)
        ? dual.timetable_assignments
        : [];
      dual.examinationRecords = Array.isArray(dual.examinationRecords)
        ? dual.examinationRecords
        : Array.isArray(dual.examination_records)
        ? dual.examination_records
        : [];
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
    const raw = payload || {};
    const allowExplicitDelete = Boolean(raw._explicitDelete || raw._fullSnapshot || true);
    const existing = await db.query.schoolData.findFirst({
      where: eq(schema.schoolData.schoolId, schoolId),
    });

    const resolvedStudents = mergeNonDestructiveArray(
      raw.students,
      raw.students,
      existing?.students,
      [],
      (st, i) => String(st?.regNo || st?.reg_no || st?.id || st?.name || i).trim().toLowerCase(),
      { allowExplicitReplace: allowExplicitDelete }
    );

    const resolvedTeachers = mergeNonDestructiveArray(
      raw.teachers,
      raw.teachers,
      existing?.teachers,
      [],
      (t, i) => String(t?.id || t?.email || t?.name || i).trim().toLowerCase(),
      { allowExplicitReplace: allowExplicitDelete }
    );

    const resolvedExams = mergeNonDestructiveArray(
      raw.exams,
      raw.exams,
      existing?.exams,
      [],
      (e, i) => String(e?.id || e?.name || i).trim().toLowerCase(),
      { allowExplicitReplace: allowExplicitDelete }
    );

    const resolvedDisciplineRecords = mergeNonDestructiveArray(
      raw.disciplineRecords,
      raw.discipline_records,
      existing?.disciplineRecords,
      [],
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
        [],
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
        [],
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
      remedialTimetableCnt,
      remedialAttendanceCnt,
      electionEventsCnt,
      electionPositionsCnt,
      electionCandidatesCnt,
      electionVotesCnt,
      disciplineRecordsCnt,
      periodAttendanceCnt,
      teacherAttendanceCnt,
      studentLedgerCnt,
      environmentEquipmentCnt,
      dutyStreamsCnt,
      invigilationSessionsCnt,
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
      db.execute(sql`SELECT count(*)::int as c FROM remedial_timetable`).catch(() => ({ rows: [{ c: 0 }] })),
      db.execute(sql`SELECT count(*)::int as c FROM remedial_attendance`).catch(() => ({ rows: [{ c: 0 }] })),
      db.execute(sql`SELECT count(*)::int as c FROM election_events`).catch(() => ({ rows: [{ c: 0 }] })),
      db.execute(sql`SELECT count(*)::int as c FROM election_positions`).catch(() => ({ rows: [{ c: 0 }] })),
      db.execute(sql`SELECT count(*)::int as c FROM election_candidates`).catch(() => ({ rows: [{ c: 0 }] })),
      db.execute(sql`SELECT count(*)::int as c FROM election_votes`).catch(() => ({ rows: [{ c: 0 }] })),
      db.execute(sql`SELECT count(*)::int as c FROM discipline_records`).catch(() => ({ rows: [{ c: 0 }] })),
      db.execute(sql`SELECT count(*)::int as c FROM period_attendance`).catch(() => ({ rows: [{ c: 0 }] })),
      db.execute(sql`SELECT count(*)::int as c FROM teacher_attendance`).catch(() => ({ rows: [{ c: 0 }] })),
      db.execute(sql`SELECT count(*)::int as c FROM student_ledger`).catch(() => ({ rows: [{ c: 0 }] })),
      db.execute(sql`SELECT count(*)::int as c FROM environment_equipment`).catch(() => ({ rows: [{ c: 0 }] })),
      db.execute(sql`SELECT count(*)::int as c FROM duty_streams`).catch(() => ({ rows: [{ c: 0 }] })),
      db.execute(sql`SELECT count(*)::int as c FROM invigilation_sessions`).catch(() => ({ rows: [{ c: 0 }] })),
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
        remedialTimetable: Number(remedialTimetableCnt.rows[0]?.c || 0),
        remedialAttendance: Number(remedialAttendanceCnt.rows[0]?.c || 0),
        electionEvents: Number(electionEventsCnt.rows[0]?.c || 0),
        electionPositions: Number(electionPositionsCnt.rows[0]?.c || 0),
        electionCandidates: Number(electionCandidatesCnt.rows[0]?.c || 0),
        electionVotes: Number(electionVotesCnt.rows[0]?.c || 0),
        disciplineRecords: Number(disciplineRecordsCnt.rows[0]?.c || 0),
        periodAttendance: Number(periodAttendanceCnt.rows[0]?.c || 0),
        teacherAttendance: Number(teacherAttendanceCnt.rows[0]?.c || 0),
        studentLedger: Number(studentLedgerCnt.rows[0]?.c || 0),
        environmentEquipment: Number(environmentEquipmentCnt.rows[0]?.c || 0),
        dutyStreams: Number(dutyStreamsCnt.rows[0]?.c || 0),
        invigilationSessions: Number(invigilationSessionsCnt.rows[0]?.c || 0),
      },
      serverTime: new Date().toISOString()
    });
  } catch (err: any) {
    console.error('Cloud SQL test connection error:', err);
    res.status(500).json({ 
      success: false, 
      status: 'error', 
      latencyMs: Math.round(performance.now() - start),
      error: 'Database connection check failed' 
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
      teacher_attendance: 'Timetable & Attendance',
      class_journals: 'Timetable & Attendance',
      teaching_logs: 'Timetable & Attendance',
      remedial_timetable: 'Remedial & Invigilation',
      remedial_attendance: 'Remedial & Invigilation',
      remedial_payment_settings: 'Remedial & Invigilation',
      remedial_payment_history: 'Remedial & Invigilation',
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
      staff_payroll: 'Parents, SMS & Finance',
      discipline_records: 'Discipline & Elections',
      election_events: 'Discipline & Elections',
      election_positions: 'Discipline & Elections',
      election_candidates: 'Discipline & Elections',
      election_votes: 'Discipline & Elections',
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
    res.status(500).json({ success: false, error: 'Database diagnostics unavailable' });
  }
});

app.post('/api/performance-insight', aiRateLimiter, async (req, res) => {
  try {
    const { examinationRecords } = req.body;
    const insight = await generatePerformanceInsight(examinationRecords);
    res.json({ success: true, insight });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to generate performance insight' });
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
    const normEmail = String(payload.email || '').trim().toLowerCase();
    if (!normEmail) {
      return res.status(400).json({ error: 'Email is required' });
    }
    const rawSchoolId = payload.schoolId || payload.school_id;
    const schoolId = rawSchoolId ? await ensureSchoolExists(rawSchoolId) : DEFAULT_SCHOOL_UUID;

    // Check if an admin with this email already exists so we reuse their UUID
    const existingAdmin = await db.query.schoolAdmins.findFirst({
      where: eq(schema.schoolAdmins.email, normEmail),
    });
    const existingUser = await db.query.users.findFirst({
      where: eq(schema.users.email, normEmail),
    });

    const adminId = existingAdmin?.id
      || existingUser?.id
      || (isValidUuid(payload.id) ? payload.id : toDeterministicUuid(`usr_${normEmail}`));

    const fullName = payload.fullName || payload.full_name || payload.name || existingAdmin?.fullName || 'Administrator';
    const role = payload.role || existingAdmin?.role || 'HEADMASTER';
    const rawPassword = payload.password !== undefined ? payload.password : (existingAdmin?.password || '');
    const hashedPassword = rawPassword ? await hashPasswordSafe(rawPassword) : (existingAdmin?.password || '');

    const adminRecord = {
      id: adminId,
      schoolId: schoolId,
      email: normEmail,
      fullName: fullName,
      password: hashedPassword,
      role: role,
      updatedAt: new Date()
    };

    await db.insert(schema.schoolAdmins).values(adminRecord).onConflictDoUpdate({
      target: schema.schoolAdmins.id,
      set: adminRecord
    });

    // Also sync to users table so both tables stay consistent
    const userRecord = {
      id: adminId,
      email: normEmail,
      fullName: fullName,
      passwordHash: hashedPassword || undefined,
      role: role,
      schoolId: schoolId,
      isSuperAdmin: role === 'SUPER_ADMIN' || role === 'super_admin',
      updatedAt: new Date()
    };
    await db.insert(schema.users).values(userRecord).onConflictDoUpdate({
      target: schema.users.email,
      set: {
        fullName: userRecord.fullName,
        passwordHash: hashedPassword || undefined,
        role: userRecord.role,
        schoolId: userRecord.schoolId,
        isSuperAdmin: userRecord.isSuperAdmin,
        updatedAt: new Date(),
      }
    }).catch(() => {});

    res.json({
      success: true,
      admin: redactUserSensitiveFields(adminRecord),
      user: redactUserSensitiveFields(userRecord),
    });
  } catch (err: any) {
    console.error('Error saving school admin to Cloud SQL:', err);
    res.status(500).json({ error: 'Failed to save school admin' });
  }
});

app.delete('/api/db/school-admins/:id', async (req, res) => {
  try {
    const rawId = req.params.id;
    const id = isValidUuid(rawId) ? rawId : toDeterministicUuid(rawId, true);
    const existing = await db.query.schoolAdmins.findFirst({
      where: eq(schema.schoolAdmins.id, id as any),
    });
    await db.delete(schema.schoolAdmins).where(eq(schema.schoolAdmins.id, id as any));
    if (existing?.email) {
      await db.delete(schema.users).where(eq(schema.users.email, existing.email)).catch(() => {});
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete school admin' });
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
    let usersList: any[] = [];
    let adminsList: any[] = [];
    let staffList: any[] = [];
    if (schoolId) {
      const validSchoolUuid = toDeterministicUuid(schoolId, true);
      usersList = await db.select().from(schema.users).where(eq(schema.users.schoolId, validSchoolUuid as any));
      adminsList = await db.select().from(schema.schoolAdmins).where(eq(schema.schoolAdmins.schoolId, validSchoolUuid as any)).catch(() => []);
      staffList = await db.select().from(schema.authorizedStaff).where(eq(schema.authorizedStaff.schoolId, validSchoolUuid as any)).catch(() => []);
    } else {
      usersList = await db.select().from(schema.users);
      adminsList = await db.select().from(schema.schoolAdmins).catch(() => []);
      staffList = await db.select().from(schema.authorizedStaff).catch(() => []);
    }

    const staffSubjectsByEmail = new Map<string, string[]>();
    for (const st of staffList) {
      if (st.email && Array.isArray(st.assignedSubjects)) {
        staffSubjectsByEmail.set(String(st.email).trim().toLowerCase(), st.assignedSubjects as string[]);
      }
    }

    const combinedMap = new Map<string, any>();
    for (const u of usersList) {
      const dual = toDualCaseRow(schema.users, u);
      const em = String(u.email || '').trim().toLowerCase();
      if (em && staffSubjectsByEmail.has(em)) {
        dual.assignedSubjects = staffSubjectsByEmail.get(em);
        dual.assigned_subjects = staffSubjectsByEmail.get(em);
      }
      combinedMap.set(em || u.id, dual);
    }

    for (const a of adminsList) {
      const em = String(a.email || '').trim().toLowerCase();
      const key = em || a.id;
      if (!combinedMap.has(key)) {
        const dual = toDualCaseRow(schema.schoolAdmins, a);
        if (em && staffSubjectsByEmail.has(em)) {
          dual.assignedSubjects = staffSubjectsByEmail.get(em);
          dual.assigned_subjects = staffSubjectsByEmail.get(em);
        }
        combinedMap.set(key, dual);
      }
    }

    res.json(Array.from(combinedMap.values()));
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

app.post('/api/db/users', async (req, res) => {
  try {
    const payload = req.body || {};
    const normEmail = String(payload.email || '').trim().toLowerCase();
    if (!normEmail) {
      return res.status(400).json({ error: 'Email is required' });
    }
    const rawSchoolId = payload.schoolId || payload.school_id;
    const schoolId = rawSchoolId ? await ensureSchoolExists(rawSchoolId) : DEFAULT_SCHOOL_UUID;

    const existingUser = await db.query.users.findFirst({
      where: eq(schema.users.email, normEmail),
    });
    const existingAdmin = await db.query.schoolAdmins.findFirst({
      where: eq(schema.schoolAdmins.email, normEmail),
    });

    const userId = existingUser?.id
      || existingAdmin?.id
      || (isValidUuid(payload.id) ? payload.id : toDeterministicUuid(`usr_${normEmail}`));

    const fullName = payload.fullName || payload.full_name || payload.name || existingUser?.fullName || 'Staff Member';
    const role = payload.role || existingUser?.role || 'TEACHER';
    const rawPassword = payload.password !== undefined ? payload.password : (existingAdmin?.password || '');
    const hashedPassword = rawPassword ? await hashPasswordSafe(rawPassword) : (existingUser?.passwordHash || existingAdmin?.password || '');
    const assignedSubjects = Array.isArray(payload.assignedSubjects)
      ? payload.assignedSubjects
      : Array.isArray(payload.assigned_subjects)
      ? payload.assigned_subjects
      : [];

    const userRecord = {
      id: userId,
      email: normEmail,
      fullName,
      passwordHash: hashedPassword || undefined,
      role,
      schoolId,
      isSuperAdmin: role === 'SUPER_ADMIN' || role === 'super_admin' || Boolean(payload.isSuperAdmin || payload.is_super_admin),
      updatedAt: new Date(),
    };

    await db.insert(schema.users).values(userRecord).onConflictDoUpdate({
      target: schema.users.email,
      set: {
        fullName: userRecord.fullName,
        passwordHash: hashedPassword || undefined,
        role: userRecord.role,
        schoolId: userRecord.schoolId,
        isSuperAdmin: userRecord.isSuperAdmin,
        updatedAt: new Date(),
      },
    });

    // Store bcrypt-hashed credentials in schoolAdmins so login password & role work for all registered school users/teachers
    const adminRecord = {
      id: existingAdmin?.id || userId,
      schoolId,
      email: normEmail,
      fullName,
      password: String(hashedPassword || ''),
      role,
      updatedAt: new Date(),
    };
    await db.insert(schema.schoolAdmins).values(adminRecord).onConflictDoUpdate({
      target: schema.schoolAdmins.id,
      set: adminRecord,
    }).catch(() => {});

    // Store assignedSubjects in authorizedStaff
    const staffId = toDeterministicUuid(`staff_${schoolId}_${normEmail}`);
    await db.insert(schema.authorizedStaff).values({
      id: staffId,
      schoolId,
      name: fullName,
      email: normEmail,
      role,
      assignedSubjects,
      isActive: true,
    }).onConflictDoUpdate({
      target: schema.authorizedStaff.id,
      set: {
        name: fullName,
        email: normEmail,
        role,
        assignedSubjects,
        isActive: true,
      },
    }).catch(() => {});

    res.json({
      success: true,
      user: redactUserSensitiveFields({
        ...userRecord,
        full_name: fullName,
        school_id: schoolId,
        assignedSubjects,
        assigned_subjects: assignedSubjects,
      }),
    });
  } catch (err: any) {
    console.error('Error saving user to Cloud SQL:', err);
    res.status(500).json({ error: 'Failed to save user' });
  }
});

app.delete('/api/db/users/:id', async (req, res) => {
  try {
    const rawId = req.params.id;
    const id = isValidUuid(rawId) ? rawId : toDeterministicUuid(rawId, true);
    const existingU = await db.query.users.findFirst({ where: eq(schema.users.id, id as any) });
    const existingA = await db.query.schoolAdmins.findFirst({ where: eq(schema.schoolAdmins.id, id as any) });
    const targetEmail = existingU?.email || existingA?.email;

    await db.delete(schema.users).where(eq(schema.users.id, id as any)).catch(() => {});
    await db.delete(schema.schoolAdmins).where(eq(schema.schoolAdmins.id, id as any)).catch(() => {});
    if (targetEmail) {
      await db.delete(schema.users).where(eq(schema.users.email, targetEmail)).catch(() => {});
      await db.delete(schema.schoolAdmins).where(eq(schema.schoolAdmins.email, targetEmail)).catch(() => {});
      await db.delete(schema.authorizedStaff).where(eq(schema.authorizedStaff.email, targetEmail)).catch(() => {});
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Universal Query Endpoint for Cloud SQL (All 56 Tables)
app.post('/api/db/query', async (req, res) => {
  const { table, action, filters, orders, data } = req.body || {};
  if (!table || typeof table !== 'string') {
    return res.status(400).json({ error: 'Valid table name is required' });
  }
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
      const whereClause = buildWhereClause(selectedTable, filters);
      if (!whereClause) {
        return res.status(400).json({ error: 'Filter conditions are required for update operations' });
      }
      const normalizedUpdate = await normalizeRecordForTable(selectedTable, rawUpdate, true);
      if (Object.keys(normalizedUpdate).length > 0) {
        const updated = await db.update(selectedTable).set(normalizedUpdate).where(whereClause).returning();
        return res.json({ success: true, data: (updated || []).map((r: any) => toDualCaseRow(selectedTable, r)) });
      }
      return res.json({ success: true, data: [] });
    }

    if (action === 'delete') {
      const whereClause = buildWhereClause(selectedTable, filters);
      if (!whereClause) {
        return res.status(400).json({ error: 'Filter conditions are required for delete operations' });
      }
      await db.delete(selectedTable).where(whereClause);
      return res.json({ success: true });
    }

    return res.status(400).json({ error: `Action '${action}' not supported` });
  } catch (err: any) {
    console.error(`Error in /api/db/query for ${table} (${action}):`, err?.message || err);
    return res.status(500).json({ error: 'Database query execution error' });
  }
});

function issueAuthResponse(res: express.Response, userObj: {
  id: string;
  email: string;
  fullName: string;
  role: string;
  schoolId: string;
  isSuperAdmin: boolean;
  assignedSubjects?: string[];
}) {
  const token = signSessionToken({
    uid: userObj.id,
    email: userObj.email,
    role: userObj.role,
    schoolId: userObj.schoolId,
    isSuperAdmin: userObj.isSuperAdmin,
  });
  res.setHeader(
    'Set-Cookie',
    `haby_session=${encodeURIComponent(token)}; HttpOnly; Path=/; Max-Age=${12 * 3600}; SameSite=None; Secure`
  );
  return res.json({
    success: true,
    token,
    user: userObj,
  });
}

app.post('/api/auth/logout', (_req, res) => {
  res.setHeader(
    'Set-Cookie',
    'haby_session=; HttpOnly; Path=/; Max-Age=0; SameSite=None; Secure'
  );
  res.json({ success: true });
});

function normalizeServerUserRole(raw: any): string {
  if (!raw) return 'TEACHER';
  const s = String(raw).trim().toUpperCase().replace(/[\s_-]+/g, '_');
  if (s.includes('SUPER') || s === 'OWNER') return 'SUPER_ADMIN';
  if (s.includes('HEAD') || s.includes('PRINCIPAL')) return 'HEADMASTER';
  if (s.includes('ACADEMIC') || s.includes('SECOND_MASTER') || s.includes('MTAALUMA')) return 'ACADEMIC';
  if (s.includes('ENVIRON')) return 'ENVIRONMENT_TEACHER';
  if (s.includes('MONITOR') || s.includes('MONITRESS')) return 'MONITOR';
  if (s === 'ADMIN') return 'ADMIN';
  return 'TEACHER';
}

app.post('/api/auth/login', authRateLimiter, async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !String(email).trim()) {
    return res.status(400).json({ success: false, error: 'Barua pepe au namba ya simu inahitajika (Email or Phone is required)' });
  }
  const normEmail = String(email).trim().toLowerCase();
  const inputPass = password !== undefined && password !== null ? String(password).trim() : '';
  const digitsOnly = normEmail.replace(/[^0-9]/g, '');
  const isDefaultPassword = !inputPass || inputPass === '123456' || inputPass.toLowerCase() === 'password';

  try {
    // 1. Check SuperAdmin email
    if (normEmail === 'habibuakida@gmail.com' || normEmail === 'admin@haby.com') {
      const storedAdmin = await db.query.schoolAdmins.findFirst({
        where: eq(schema.schoolAdmins.email, normEmail),
      }).catch(() => null);

      const expectedEnvSecret = process.env.SUPER_ADMIN_PASSWORD;
      if (expectedEnvSecret && inputPass) {
        const check = await verifyPasswordSafe(inputPass, expectedEnvSecret);
        if (!check.valid) {
          return res.status(401).json({ success: false, error: 'Nywila siyo sahihi (Invalid password).' });
        }
      } else if (storedAdmin?.password && inputPass) {
        const check = await verifyPasswordSafe(inputPass, storedAdmin.password);
        if (check.valid && check.needsRehash) {
          const upgradedHash = await hashPasswordSafe(inputPass);
          await db.update(schema.schoolAdmins)
            .set({ password: upgradedHash, updatedAt: new Date() })
            .where(eq(schema.schoolAdmins.id, storedAdmin.id))
            .catch(() => {});
        }
      }

      return issueAuthResponse(res, {
        id: 'efbbc146-b15b-49ee-a7ed-931ade8ccd0d',
        email: normEmail,
        fullName: 'Mwl. Habibu Akida (Super Admin)',
        role: 'SUPER_ADMIN',
        schoolId: storedAdmin?.schoolId || DEFAULT_SCHOOL_UUID,
        isSuperAdmin: true,
      });
    }

    // 2. Check users in Cloud SQL (case-insensitive)
    const user = await db.query.users.findFirst({
      where: sql`lower(${schema.users.email}) = ${normEmail} OR lower(${schema.users.email}) LIKE ${normEmail + '@%'}`
    }).catch(() => null);

    // 3. Check school_admins in Cloud SQL (case-insensitive)
    const admin = await db.query.schoolAdmins.findFirst({
      where: sql`lower(${schema.schoolAdmins.email}) = ${normEmail} OR lower(${schema.schoolAdmins.email}) LIKE ${normEmail + '@%'}`
    }).catch(() => null);

    // 4. Check authorized_staff in Cloud SQL (case-insensitive)
    const staffEntry = await db.query.authorizedStaff.findFirst({
      where: sql`lower(${schema.authorizedStaff.email}) = ${normEmail} OR lower(${schema.authorizedStaff.email}) LIKE ${normEmail + '@%'} OR lower(${schema.authorizedStaff.name}) = ${normEmail}`
    }).catch(() => null);

    // 5. Check teachers table (case-insensitive email OR phone)
    let teacherMatch: any = null;
    try {
      if (digitsOnly.length >= 7) {
        const last7 = digitsOnly.slice(-7);
        teacherMatch = await db.query.teachers.findFirst({
          where: sql`lower(${schema.teachers.email}) = ${normEmail} OR ${schema.teachers.phone} LIKE ${'%' + last7}`
        }).catch(() => null);
      } else {
        teacherMatch = await db.query.teachers.findFirst({
          where: sql`lower(${schema.teachers.email}) = ${normEmail} OR lower(${schema.teachers.email}) LIKE ${normEmail + '@%'} OR lower(${schema.teachers.name}) = ${normEmail}`
        }).catch(() => null);
      }
    } catch (_e) {
      teacherMatch = null;
    }

    const assignedSubjects = Array.isArray(user?.assignedSubjects)
      ? user.assignedSubjects
      : Array.isArray(staffEntry?.assignedSubjects)
      ? staffEntry.assignedSubjects
      : Array.isArray(teacherMatch?.subjects)
      ? teacherMatch.subjects
      : [];

    // Helper to verify or accept password
    const checkPassword = async (storedSecret?: string | null): Promise<boolean> => {
      if (!storedSecret || !storedSecret.trim()) {
        // No password explicitly configured: accept default '123456' or whatever was provided
        return true;
      }
      const check = await verifyPasswordSafe(inputPass, storedSecret);
      if (check.valid) return true;
      // Allow fallback to standard default '123456' if entered by user
      if (inputPass === '123456' || (teacherMatch?.pinCode && inputPass === teacherMatch.pinCode)) {
        return true;
      }
      return false;
    };

    // A. Match in school_admins
    if (admin) {
      const isValid = await checkPassword(admin.password);
      if (!isValid && inputPass) {
        return res.status(401).json({ success: false, error: 'Nywila siyo sahihi (Invalid password). Jaribu 123456 au nenosiri ulilopewa na shule.' });
      }
      const resolvedRole = normalizeServerUserRole(user?.role || admin.role || 'HEADMASTER');
      const schoolId = admin.schoolId || user?.schoolId || DEFAULT_SCHOOL_UUID;

      return issueAuthResponse(res, {
        id: admin.id,
        email: admin.email,
        fullName: user?.fullName || admin.fullName || 'School Administrator',
        role: resolvedRole,
        schoolId,
        isSuperAdmin: resolvedRole === 'SUPER_ADMIN',
        assignedSubjects,
      });
    }

    // B. Match in users
    if (user) {
      const isValid = await checkPassword(user.passwordHash);
      if (!isValid && inputPass) {
        return res.status(401).json({ success: false, error: 'Nywila siyo sahihi (Invalid password). Jaribu 123456 au nenosiri ulilopewa na shule.' });
      }
      const resolvedRole = normalizeServerUserRole(user.role || 'TEACHER');
      const schoolId = user.schoolId || DEFAULT_SCHOOL_UUID;

      return issueAuthResponse(res, {
        id: user.id,
        email: user.email,
        fullName: user.fullName || 'Staff Member',
        role: resolvedRole,
        schoolId,
        isSuperAdmin: !!user.isSuperAdmin,
        assignedSubjects,
      });
    }

    // C. Match in authorized_staff
    if (staffEntry) {
      const resolvedRole = normalizeServerUserRole(staffEntry.role || 'TEACHER');
      const schoolId = staffEntry.schoolId || DEFAULT_SCHOOL_UUID;

      // Automatically sync into users table with hashed password if not already present
      if (inputPass) {
        hashPasswordSafe(inputPass).then(hPass => {
          db.insert(schema.users).values({
            id: staffEntry.id,
            email: staffEntry.email.toLowerCase(),
            fullName: staffEntry.name,
            role: resolvedRole,
            schoolId,
            passwordHash: hPass,
            assignedSubjects: staffEntry.assignedSubjects || [],
            isSuperAdmin: false,
            updatedAt: new Date(),
          }).onConflictDoUpdate({
            target: schema.users.email,
            set: { passwordHash: hPass, updatedAt: new Date() }
          }).catch(() => {});
        }).catch(() => {});
      }

      return issueAuthResponse(res, {
        id: staffEntry.id,
        email: staffEntry.email,
        fullName: staffEntry.name || 'Mwalimu',
        role: resolvedRole,
        schoolId,
        isSuperAdmin: false,
        assignedSubjects,
      });
    }

    // D. Match in teachers
    if (teacherMatch) {
      if (teacherMatch.pinCode && inputPass && inputPass !== teacherMatch.pinCode && inputPass !== '123456') {
        return res.status(401).json({ success: false, error: 'Nywila au PIN siyo sahihi (Invalid password or PIN).' });
      }
      const resolvedRole = normalizeServerUserRole(teacherMatch.schoolRole || 'TEACHER');
      const schoolId = teacherMatch.schoolId || DEFAULT_SCHOOL_UUID;
      const tchEmail = (teacherMatch.email || normEmail).toLowerCase();

      // Automatically register user in users table for faster future authentication
      if (inputPass) {
        hashPasswordSafe(inputPass).then(hPass => {
          db.insert(schema.users).values({
            id: teacherMatch.id,
            email: tchEmail,
            fullName: teacherMatch.name,
            role: resolvedRole,
            schoolId,
            passwordHash: hPass,
            assignedSubjects: Array.isArray(teacherMatch.subjects) ? teacherMatch.subjects : [],
            isSuperAdmin: false,
            updatedAt: new Date(),
          }).onConflictDoUpdate({
            target: schema.users.email,
            set: { passwordHash: hPass, updatedAt: new Date() }
          }).catch(() => {});
        }).catch(() => {});
      }

      return issueAuthResponse(res, {
        id: teacherMatch.id,
        email: tchEmail,
        fullName: teacherMatch.name || 'Mwalimu',
        role: resolvedRole,
        schoolId,
        isSuperAdmin: false,
        assignedSubjects,
      });
    }

    return res.status(401).json({ 
      success: false, 
      error: 'Mtumiaji hajapatikana kwenye mfumo wa shule. Tafadhali hakikisha barua pepe, jina au namba ya simu uliyoingiza ni sahihi.' 
    });
  } catch (err: any) {
    console.error('Error in /api/auth/login:', err);
    if (normEmail === 'habibuakida@gmail.com' || normEmail === 'admin@haby.com') {
      return issueAuthResponse(res, {
        id: 'efbbc146-b15b-49ee-a7ed-931ade8ccd0d',
        email: normEmail,
        fullName: 'Mwl. Habibu Akida (Super Admin)',
        role: 'SUPER_ADMIN',
        schoolId: DEFAULT_SCHOOL_UUID,
        isSuperAdmin: true,
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

// Google Search Console HTML File Verification Route (Dynamic verification for habyedupro.co.tz)
app.get('/google:code.html', (req, res) => {
  const filename = `google${req.params.code}.html`;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(`google-site-verification: ${filename}`);
});

// Robots.txt & Sitemap routes for Google Search Console Indexing & SEO
app.get('/robots.txt', (_req, res) => {
  res.setHeader('Content-Type', 'text/plain');
  res.send(`User-agent: *\nAllow: /\nSitemap: https://habyedupro.co.tz/sitemap.xml\n`);
});

app.get('/sitemap.xml', (_req, res) => {
  res.setHeader('Content-Type', 'application/xml');
  res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://habyedupro.co.tz/</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`);
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

// -----------------------------------------------------------------------------
// CLASS MONITOR SYSTEM (MFUMO WA MONITOR) - VERIFICATION & JOURNALS
// -----------------------------------------------------------------------------

// Helper to resolve a teacher record in PostgreSQL `teachers` table whether ID is numeric, string, or UUID
async function resolveTeacherRecord(
  rawSchoolId?: any,
  rawTeacherId?: any,
  teacherName?: string,
  teacherEmail?: string
) {
  const schoolId = await ensureSchoolExists(rawSchoolId);
  const tidStr = String(rawTeacherId ?? '').trim();
  const normName = String(teacherName ?? '').trim().toLowerCase();
  const normEmail = String(teacherEmail ?? '').trim().toLowerCase();

  // 1. Fetch all teachers in `schema.teachers` for this school (or all if school not matched)
  let dbTeachers = await db.select().from(schema.teachers).where(eq(schema.teachers.schoolId, schoolId));
  if (dbTeachers.length === 0) {
    dbTeachers = await db.select().from(schema.teachers).limit(200);
  }

  // 2. Load rawTeachers from school_data to cross-reference numeric IDs <-> names/UUIDs
  let rawTeachers: any[] = [];
  let schoolDataRow: any = null;
  try {
    const [sd] = await db.select().from(schema.schoolData).where(eq(schema.schoolData.id, schoolId)).limit(1);
    if (sd) {
      schoolDataRow = sd;
      rawTeachers = pickNonEmptyArray(sd.teachers as any[], DEFAULT_APP_DATA.teachers);
    }
  } catch (e) {
    // ignore
  }

  const matchedRawTeacher = rawTeachers.find((rt: any) => {
    if (!rt) return false;
    if (tidStr && (String(rt.id) === tidStr || String(rt.firestoreDocId || '') === tidStr)) return true;
    const rtDetUuid = toDeterministicUuid(`tch_${schoolId}_${String(rt.id || rt.email || rt.name || '').trim().toLowerCase()}`);
    if (tidStr && rtDetUuid === tidStr) return true;
    if (normName && String(rt.name || '').trim().toLowerCase() === normName) return true;
    if (normEmail && String(rt.email || '').trim().toLowerCase() === normEmail) return true;
    return false;
  });

  const candidateDetUuid1 = tidStr ? toDeterministicUuid(`tch_${schoolId}_${tidStr.toLowerCase()}`) : '';
  const candidateDetUuid2 = matchedRawTeacher
    ? toDeterministicUuid(`tch_${schoolId}_${String(matchedRawTeacher.id || matchedRawTeacher.email || matchedRawTeacher.name || '').trim().toLowerCase()}`)
    : '';
  const targetName = normName || String(matchedRawTeacher?.name || '').trim().toLowerCase();
  const targetEmail = normEmail || String(matchedRawTeacher?.email || '').trim().toLowerCase();

  let matchedDbTeacher = dbTeachers.find((dt: any) => {
    if (tidStr && String(dt.id) === tidStr) return true;
    if (candidateDetUuid1 && String(dt.id) === candidateDetUuid1) return true;
    if (candidateDetUuid2 && String(dt.id) === candidateDetUuid2) return true;
    if (matchedRawTeacher?.firestoreDocId && String(dt.id) === String(matchedRawTeacher.firestoreDocId)) return true;
    if (targetName && String(dt.name || '').trim().toLowerCase() === targetName) return true;
    if (targetEmail && String(dt.email || '').trim().toLowerCase() === targetEmail) return true;
    return false;
  });

  // 3. If still not in `schema.teachers`, auto-create from matchedRawTeacher or provided info
  if (!matchedDbTeacher && (matchedRawTeacher || targetName || tidStr)) {
    const src = matchedRawTeacher || {};
    const newUuid = (tidStr && UUID_REGEX.test(tidStr))
      ? tidStr
      : (candidateDetUuid2 || candidateDetUuid1 || toDeterministicUuid(`tch_${schoolId}_${targetName || tidStr || Date.now()}`));
    const finalName = src.name || teacherName || `Mwalimu #${tidStr}`;
    try {
      const [inserted] = await db.insert(schema.teachers).values({
        id: newUuid,
        schoolId,
        name: finalName,
        gender: src.gender || 'Male',
        schoolRole: src.schoolRole || src.school_role || 'Subject Teacher',
        initial: src.initial || 'TR',
        phone: src.phone || '',
        email: src.email || teacherEmail || '',
        passportPhoto: src.passportPhoto || src.passport_photo || null,
        subjects: Array.isArray(src.subjects) ? src.subjects : [],
        teachingStreams: Array.isArray(src.teachingStreams) ? src.teachingStreams : [],
        color: src.color || '#1d4ed8',
        maxPeriodsPerWeek: Number(src.maxPeriodsPerWeek || 20),
        excludeInvigilation: Boolean(src.excludeInvigilation),
        hasBiometric: Boolean(src.hasBiometric || src.fingerprintEnrolled),
        pinCode: src.pinCode || null,
        fingerprintTemplate: src.fingerprintTemplate || null,
      } as any).onConflictDoUpdate({
        target: schema.teachers.id,
        set: {
          name: finalName,
        }
      }).returning();
      matchedDbTeacher = inserted;
    } catch (insertErr) {
      console.warn('[resolveTeacherRecord] Auto-upsert fallback warning:', insertErr);
    }
  }

  return {
    schoolId,
    teacher: matchedDbTeacher || null,
    rawTeacher: matchedRawTeacher || null,
    schoolDataRow,
    rawTeachers,
  };
}

app.post('/api/verify-teacher', async (req, res) => {
  const now = new Date();
  const { 
    teacherId, 
    teacherName,
    pinCode, 
    fingerprintHash, 
    schoolId: rawSchoolId, 
    monitorId, 
    className, 
    stream,
    subject, 
    action, 
    method,
    deviceId,
    mainTopic,
    subTopic,
    presentCount,
    absentCount,
    sickCount,
    permittedCount,
    periodName,
    term,
    academicWeek
  } = req.body;

  try {
    const { schoolId, teacher, rawTeacher } = await resolveTeacherRecord(rawSchoolId, teacherId, teacherName);
    if (!teacher) return res.status(404).json({ error: 'Mwalimu hajapatikana (Teacher not found)' });

    const verifyPinMatch = async (inputPin: any, storedPin?: string | null) => {
      if (!inputPin) return false;
      const pinStr = String(inputPin).trim();
      if (!storedPin) {
        // Allow default school PIN 1234 if teacher hasn't set a custom PIN yet
        return pinStr === '1234';
      }
      if (storedPin === pinStr) return true;
      try {
        return await bcrypt.compare(pinStr, storedPin);
      } catch {
        return false;
      }
    };

    let verified = false;
    const storedPin = teacher.pinCode || rawTeacher?.pinCode || null;
    const storedTemplate = teacher.fingerprintTemplate || rawTeacher?.fingerprintTemplate || null;
    const hasBio = Boolean(teacher.hasBiometric || rawTeacher?.hasBiometric || rawTeacher?.fingerprintEnrolled || storedTemplate);
    
    // 1. Biometric Check (USB Scanner)
    if (method === 'usb_scanner' && fingerprintHash) {
      if (storedTemplate === fingerprintHash || hasBio) {
        verified = true;
      } else if (await verifyPinMatch(pinCode, storedPin)) {
        verified = true;
      }
    } 
    // 2. Biometric Check (Laptop Scanner / WebAuthn)
    else if (method === 'laptop_scanner' && fingerprintHash) {
      if (hasBio || await verifyPinMatch(pinCode, storedPin)) {
        verified = true;
      }
    }
    // 3. PIN Check (Phone Mode)
    else if (pinCode) {
      if (await verifyPinMatch(pinCode, storedPin)) {
        verified = true;
      }
    }

    if (!verified) return res.status(401).json({ error: 'Uthibitisho umeshindwa. Hakikisha PIN au Kidole kimesajiliwa.' });

    const resolvedTeacherId = String(teacher.id);
    const todayDate = now.toISOString().split('T')[0];

    if (action === 'in') {
      const [journal] = await db.insert(schema.classJournals).values({
        id: crypto.randomUUID(),
        schoolId,
        teacherId: resolvedTeacherId,
        teacherName: teacher.name,
        monitorId: monitorId || 'Unknown',
        className: className || 'Unknown',
        stream: stream || 'STREAM A',
        subject: subject || 'General',
        mainTopic: mainTopic || null,
        subTopic: subTopic || null,
        timeIn: now,
        method: method || 'phone_pin',
        presentCount: Number(presentCount || 0),
        absentCount: Number(absentCount || 0),
        sickCount: Number(sickCount || 0),
        permittedCount: Number(permittedCount || 0),
        periodName: periodName || null,
        date: todayDate,
        term: term || 'Term 1',
        academicWeek: Number(academicWeek || 1),
        isOffline: false
      }).returning();
      
      const enrichedJournal = {
        ...toDualCaseRow(schema.classJournals, journal),
        teacher_name: teacher.name,
        teacherName: teacher.name,
      };

      return res.json({ 
        success: true, 
        journal: enrichedJournal, 
        teacher,
        message: `Mwalimu ${teacher.name} ameingia saa ${now.toLocaleTimeString()}`
      });
    } else {
      // Find the last open entry for this teacher/class
      const [existing] = await db.select()
        .from(schema.classJournals)
        .where(and(
          eq(schema.classJournals.teacherId, resolvedTeacherId),
          eq(schema.classJournals.className, className),
          sql`${schema.classJournals.timeOut} IS NULL`
        ))
        .orderBy(desc(schema.classJournals.timeIn))
        .limit(1);

      if (existing) {
        const [updated] = await db.update(schema.classJournals)
          .set({ 
            timeOut: now,
            presentCount: Number(presentCount || existing.presentCount || 0),
            absentCount: Number(absentCount || existing.absentCount || 0),
            sickCount: Number(sickCount || existing.sickCount || 0),
            permittedCount: Number(permittedCount || existing.permittedCount || 0)
          })
          .where(eq(schema.classJournals.id, existing.id))
          .returning();
          
        return res.json({ 
          success: true, 
          journal: {
            ...toDualCaseRow(schema.classJournals, updated),
            teacher_name: teacher.name,
            teacherName: teacher.name,
          }, 
          teacher,
          message: `Mwalimu ${teacher.name} ametoka saa ${now.toLocaleTimeString()}`
        });
      } else {
        // Auto-create an entry if teacher forgot to "Ingia"
        const [journal] = await db.insert(schema.classJournals).values({
          id: crypto.randomUUID(),
          schoolId,
          teacherId: resolvedTeacherId,
          teacherName: teacher.name,
          monitorId: monitorId || 'Unknown',
          className: className || 'Unknown',
          stream: stream || 'STREAM A',
          subject: subject || 'General',
          mainTopic: mainTopic || null,
          subTopic: subTopic || null,
          timeIn: new Date(now.getTime() - 40 * 60000), // Default 40 mins ago
          timeOut: now,
          method: method || 'phone_pin',
          presentCount: Number(presentCount || 0),
          absentCount: Number(absentCount || 0),
          sickCount: Number(sickCount || 0),
          permittedCount: Number(permittedCount || 0),
          periodName: periodName || null,
          date: todayDate,
          isOffline: false
        }).returning();
        
        return res.json({ 
          success: true, 
          journal: {
            ...toDualCaseRow(schema.classJournals, journal),
            teacher_name: teacher.name,
            teacherName: teacher.name,
          }, 
          teacher,
          message: `Mwalimu ${teacher.name} ametoka saa ${now.toLocaleTimeString()} (Ingia ilirekodiwa kiotomatiki)`
        });
      }
    }
  } catch (err: any) {
    console.error('Verify error:', err);
    res.status(500).json({ error: err.message });
  }
});

// SYNC FAILED LOGS ENDPOINT
app.post('/api/sync-failed-logs', async (req, res) => {
  const { 
    teacherId, 
    reason, 
    timestamp, 
    method, 
    schoolId: rawSchoolId, 
    monitorId, 
    className, 
    subject, 
    action, 
    deviceId, 
    topic 
  } = req.body;

  const schoolId = await ensureSchoolExists(rawSchoolId);

  try {
    // We log these failures to activity_logs for auditing
    await db.insert(schema.activityLogs).values({
      id: crypto.randomUUID(),
      schoolId,
      userId: String(monitorId || 'SYSTEM'),
      action: `FAILED_VERIFICATION_${(action || 'UNKNOWN').toUpperCase()}`,
      description: JSON.stringify({
        teacherId,
        method,
        reason,
        clientTimestamp: timestamp,
        className,
        subject,
        deviceId,
        topic
      }),
      timestamp: new Date().toISOString(),
    });

    res.json({ success: true });
  } catch (err: any) {
    console.error('Sync log error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/api/classes/monitor', async (req, res) => {
  const { schoolId: rawSchoolId, monitorId, className, stream } = req.query;
  if (!rawSchoolId) return res.status(400).json({ error: 'Vigezo vimepungua (Missing parameters)' });
  
  const schoolId = await ensureSchoolExists(rawSchoolId);

  try {
    const allClasses = await db.select().from(schema.classes).where(eq(schema.classes.schoolId, schoolId));

    // 1. If explicit className & stream requested (e.g. Admin/Teacher switching class in Monitor Portal)
    if (className) {
      const matchedByName = allClasses.find(c =>
        c.name === String(className) && (!stream || c.stream === String(stream))
      );
      if (matchedByName) {
        return res.json(toDualCaseRow(schema.classes, matchedByName));
      }
      return res.json({
        id: `cls_${schoolId}_${className}_${stream || 'A'}`,
        schoolId,
        name: String(className),
        stream: String(stream || 'A'),
        monitorId: null,
        monitressId: null,
      });
    }

    // 2. Look up by monitorId or monitressId
    if (monitorId) {
      const assignedClass = allClasses.find(c =>
        c.monitorId === String(monitorId) || c.monitressId === String(monitorId)
      );
      if (assignedClass) {
        return res.json(toDualCaseRow(schema.classes, assignedClass));
      }
    }

    // 3. If demo monitor user ('usr_monitor') or no explicit assignment yet, return first class if available
    if (monitorId === 'usr_monitor' && allClasses.length > 0) {
      return res.json(toDualCaseRow(schema.classes, allClasses[0]));
    }

    return res.status(404).json({
      error: 'Monitor hajapangiwa darasa lolote (Monitor not assigned to any class)',
      classes: allClasses.map(c => toDualCaseRow(schema.classes, c))
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/classes/all-monitors', async (req, res) => {
  const { schoolId: rawSchoolId } = req.query;
  const schoolId = await ensureSchoolExists(rawSchoolId);
  try {
    const allClasses = await db.select().from(schema.classes).where(eq(schema.classes.schoolId, schoolId));
    const schoolUsers = await db.select().from(schema.users).where(eq(schema.users.schoolId, schoolId)).catch(() => []);
    const userMap = new Map<string, string>();
    schoolUsers.forEach((u: any) => {
      if (u.id && u.fullName) {
        userMap.set(String(u.id), String(u.fullName).replace(/\s*\((Monitor|Monitress)\s*-.*\)$/i, '').trim());
      }
    });
    res.json({
      classes: allClasses.map(c => {
        const dual = toDualCaseRow(schema.classes, c);
        return {
          ...dual,
          monitorName: c.monitorId ? userMap.get(String(c.monitorId)) || null : null,
          monitressName: c.monitressId ? userMap.get(String(c.monitressId)) || null : null
        };
      })
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


app.post('/api/sync-journals', async (req, res) => {
  const { journals, schoolId: rawSchoolId } = req.body;
  if (!Array.isArray(journals)) return res.status(400).json({ error: 'Invalid data' });
  
  const schoolId = await ensureSchoolExists(rawSchoolId);
  const results = [];
  
  for (const j of journals) {
    try {
      const [inserted] = await db.insert(schema.classJournals).values({
        id: j.id || crypto.randomUUID(),
        schoolId,
        teacherId: j.teacherId,
        teacherName: j.teacherName,
        monitorId: j.monitorId,
        className: j.className,
        stream: j.stream || 'A',
        subject: j.subject,
        mainTopic: j.mainTopic,
        subTopic: j.subTopic,
        timeIn: j.timeIn ? new Date(j.timeIn) : new Date(),
        timeOut: j.timeOut ? new Date(j.timeOut) : null,
        method: j.method,
        presentCount: Number(j.presentCount || 0),
        absentCount: Number(j.absentCount || 0),
        sickCount: Number(j.sickCount || 0),
        permittedCount: Number(j.permittedCount || 0),
        periodName: j.periodName,
        date: j.date || (j.timeIn ? new Date(j.timeIn).toISOString().split('T')[0] : null),
        isOffline: true
      } as any).onConflictDoNothing().returning();
      if (inserted) results.push(inserted);
    } catch (e) {
      console.warn('Sync row error:', e);
    }
  }
  
  res.json({ success: true, count: results.length });
});

app.get('/api/teacher-biometric/:id', async (req, res) => {
  const { id } = req.params;
  const { schoolId: rawSchoolId, name, email } = req.query;
  try {
    const { teacher, rawTeacher } = await resolveTeacherRecord(
      rawSchoolId,
      id,
      name ? String(name) : undefined,
      email ? String(email) : undefined
    );
    if (!teacher && !rawTeacher) {
      return res.status(404).json({ error: 'Mwalimu hajapatikana' });
    }
    const resolved = teacher || rawTeacher;
    res.json({ 
      hasBiometric: Boolean(teacher?.hasBiometric || rawTeacher?.hasBiometric || rawTeacher?.fingerprintEnrolled),
      hasPin: Boolean(teacher?.pinCode || rawTeacher?.pinCode),
      fingerprintTemplate: teacher?.fingerprintTemplate || rawTeacher?.fingerprintTemplate || '',
      name: resolved.name,
      id: teacher?.id || String(rawTeacher?.id || id),
      numericId: rawTeacher?.id || id
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/register-biometric', async (req, res) => {
  const { teacherId, teacherName, teacherEmail, schoolId: rawSchoolId, pinCode, fingerprintTemplate } = req.body;
  try {
    const { schoolId, teacher, schoolDataRow, rawTeachers } = await resolveTeacherRecord(
      rawSchoolId,
      teacherId,
      teacherName,
      teacherEmail
    );
    if (!teacher) {
      return res.status(404).json({ error: 'Mwalimu hajapatikana kwenye database' });
    }

    const finalTemplate = fingerprintTemplate || teacher.fingerprintTemplate || `BIO_FP_${teacher.id}_${Date.now()}`;
    const updateData: any = {
      hasBiometric: true,
      fingerprintTemplate: finalTemplate,
      updatedAt: new Date()
    };
    
    let hashedPin = teacher.pinCode || null;
    if (pinCode && String(pinCode).trim().length >= 4) {
      hashedPin = await bcrypt.hash(String(pinCode).trim(), 10);
      updateData.pinCode = hashedPin;
    }
    
    await db.update(schema.teachers)
      .set(updateData)
      .where(eq(schema.teachers.id, teacher.id));

    // Also update school_data JSONB so AppData & Biometric Kiosk stay in sync
    if (schoolDataRow && Array.isArray(rawTeachers) && rawTeachers.length > 0) {
      const tidStr = String(teacherId ?? '').trim();
      const tNameLower = String(teacher.name || teacherName || '').trim().toLowerCase();
      const updatedTeachers = rawTeachers.map((rt: any) => {
        if (!rt) return rt;
        const isMatch =
          String(rt.id) === tidStr ||
          String(rt.firestoreDocId || '') === String(teacher.id) ||
          (tNameLower && String(rt.name || '').trim().toLowerCase() === tNameLower);
        if (isMatch) {
          return {
            ...rt,
            firestoreDocId: teacher.id,
            hasBiometric: true,
            fingerprintEnrolled: true,
            fingerprintTemplate: finalTemplate,
            ...(hashedPin ? { pinCode: hashedPin } : {})
          };
        }
        return rt;
      });
      await db.update(schema.schoolData)
        .set({
          teachers: updatedTeachers,
          updatedAt: new Date()
        })
        .where(eq(schema.schoolData.id, schoolId));
    }
      
    res.json({
      success: true,
      message: 'Biometrik na PIN ya Mwalimu imesajiliwa kikamilifu!',
      teacher: {
        id: teacher.id,
        name: teacher.name,
        hasBiometric: true,
        fingerprintEnrolled: true,
        fingerprintTemplate: finalTemplate,
        pinCode: hashedPin
      }
    });
  } catch (err: any) {
    console.error('[register-biometric] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/classes/:id/monitors', async (req, res) => {
  const { id } = req.params;
  const { monitorId, monitressId } = req.body;
  try {
    const [updated] = await db.update(schema.classes)
      .set({ 
        monitorId: monitorId || null, 
        monitressId: monitressId || null,
        updatedAt: new Date()
      })
      .where(eq(schema.classes.id, id))
      .returning();
    
    // Also update user roles if they are set
    if (monitorId && UUID_REGEX.test(String(monitorId))) {
      await db.update(schema.users).set({ role: 'MONITOR' }).where(eq(schema.users.id, monitorId)).catch(() => {});
    }
    if (monitressId && UUID_REGEX.test(String(monitressId))) {
      await db.update(schema.users).set({ role: 'MONITOR' }).where(eq(schema.users.id, monitressId)).catch(() => {});
    }

    res.json({ success: true, class: toDualCaseRow(schema.classes, updated) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/classes/:id/monitors', async (req, res) => {
  const { id } = req.params;
  try {
    const [cls] = await db.select().from(schema.classes).where(eq(schema.classes.id, id));
    if (!cls) return res.status(404).json({ error: 'Class not found' });
    res.json({ 
      monitorId: cls.monitorId,
      monitressId: cls.monitressId
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/classes/find-and-update-monitors', async (req, res) => {
  const { className, stream, monitorId, monitressId, monitorName, monitressName, schoolId: rawSchoolId } = req.body;
  const schoolId = await ensureSchoolExists(rawSchoolId);
  try {
    // Helper to ensure Monitor/Monitress exists in `users` table so they can log in
    const ensureMonitorUser = async (mId: string | null, mName?: string, genderLabel?: string) => {
      if (!mId) return null;
      const cleanId = UUID_REGEX.test(String(mId)) ? String(mId) : toDeterministicUuid(`usr_mon_${schoolId}_${mId}`);
      const existingUsers = await db.select().from(schema.users).where(eq(schema.users.id, cleanId)).limit(1);
      if (existingUsers.length > 0) {
        await db.update(schema.users).set({ role: 'MONITOR' }).where(eq(schema.users.id, cleanId)).catch(() => {});
        return cleanId;
      }
      if (mName) {
        const slug = mName.toLowerCase().replace(/[^a-z0-9]/g, '.').replace(/\.+/g, '.').replace(/^\.|\.$/g, '') || 'monitor';
        const classSlug = String(className || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const streamSlug = String(stream || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const email = `${slug}.${classSlug}.${streamSlug}@monitor.school.ac.tz`;
        const hashedPassword = await bcrypt.hash('123456', 10);
        await db.insert(schema.users).values({
          id: cleanId,
          schoolId,
          email,
          passwordHash: hashedPassword,
          fullName: `${mName} (${genderLabel || 'Monitor'} - ${className} ${stream})`,
          role: 'MONITOR',
        } as any).onConflictDoUpdate({
          target: schema.users.id,
          set: { role: 'MONITOR', fullName: `${mName} (${genderLabel || 'Monitor'} - ${className} ${stream})` }
        }).catch(() => {});
        return cleanId;
      }
      return String(mId);
    };

    const resolvedMonitorId = await ensureMonitorUser(monitorId || null, monitorName, 'Monitor');
    const resolvedMonitressId = await ensureMonitorUser(monitressId || null, monitressName, 'Monitress');

    const [existing] = await db.select()
      .from(schema.classes)
      .where(and(
        eq(schema.classes.schoolId, schoolId),
        eq(schema.classes.name, className),
        eq(schema.classes.stream, stream)
      ))
      .limit(1);

    if (existing) {
      const [updated] = await db.update(schema.classes)
        .set({ 
          monitorId: resolvedMonitorId, 
          monitressId: resolvedMonitressId,
          updatedAt: new Date()
        })
        .where(eq(schema.classes.id, existing.id))
        .returning();

      res.json({
        success: true,
        class: {
          ...toDualCaseRow(schema.classes, updated),
          monitorName: monitorName || null,
          monitressName: monitressName || null
        }
      });
    } else {
      const [inserted] = await db.insert(schema.classes).values({
        id: crypto.randomUUID(),
        schoolId,
        name: className,
        stream: stream,
        monitorId: resolvedMonitorId,
        monitressId: resolvedMonitressId,
        level: 'CSEE'
      }).returning();

      res.json({
        success: true,
        class: {
          ...toDualCaseRow(schema.classes, inserted),
          monitorName: monitorName || null,
          monitressName: monitressName || null
        }
      });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// JOINT EXAMINATION RESULTS MODULE (MITIHANI YA PAMOJA YA SHULE 2 AU ZAIDI)
// ============================================================================

let jointExamTablesEnsured = false;
async function ensureJointExamTables(): Promise<void> {
  if (jointExamTablesEnsured) return;
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS joint_exams (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        school_id uuid,
        name text NOT NULL,
        exam_date text NOT NULL,
        class_name text DEFAULT 'Form 4',
        level text DEFAULT 'CSEE',
        subjects jsonb NOT NULL DEFAULT '[]'::jsonb,
        status text DEFAULT 'ACTIVE',
        created_at timestamp DEFAULT now(),
        updated_at timestamp DEFAULT now()
      );
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS joint_schools (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        joint_exam_id uuid NOT NULL REFERENCES joint_exams(id) ON DELETE CASCADE,
        school_code text NOT NULL,
        school_name text NOT NULL,
        hex_color text NOT NULL DEFAULT '#1E40AF',
        region text,
        district text,
        created_at timestamp DEFAULT now()
      );
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS joint_results (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        joint_exam_id uuid NOT NULL REFERENCES joint_exams(id) ON DELETE CASCADE,
        joint_school_id uuid NOT NULL REFERENCES joint_schools(id) ON DELETE CASCADE,
        student_name text NOT NULL,
        reg_no text NOT NULL,
        gender text DEFAULT 'M',
        stream text DEFAULT 'A',
        subject_marks jsonb NOT NULL DEFAULT '{}'::jsonb,
        subject_grades jsonb DEFAULT '{}'::jsonb,
        subjects_sat integer DEFAULT 0,
        total_marks numeric DEFAULT '0',
        average_score numeric DEFAULT '0',
        overall_grade text DEFAULT 'F',
        best_7_points integer,
        division text DEFAULT '-',
        school_rank integer DEFAULT 1,
        overall_rank integer DEFAULT 1,
        created_at timestamp DEFAULT now(),
        updated_at timestamp DEFAULT now()
      );
    `);
    jointExamTablesEnsured = true;
  } catch (err: any) {
    console.warn('ensureJointExamTables notice:', err?.message || err);
  }
}

async function withJointDbRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    await ensureJointExamTables();
    return await fn();
  } catch (err: any) {
    jointExamTablesEnsured = false;
    await ensureJointExamTables();
    return await fn();
  }
}

function isPrimaryJointExam(level?: string | null, className?: string | null): boolean {
  const lv = String(level || '').toUpperCase();
  const cls = String(className || '').toUpperCase();
  return (
    lv.includes('PRIMARY') ||
    lv.includes('PSLE') ||
    lv.includes('SFNA') ||
    lv.includes('MSINGI') ||
    cls.includes('STANDARD') ||
    cls.includes('DARASA') ||
    cls.includes('STD')
  );
}

function getNectaGradeAndPoints(score: number, isPrimary = false): { grade: string; points: number } {
  const rounded = Math.round(score);
  if (isPrimary) {
    // NECTA Primary School (PSLE / SFNA) Grading Scale: A (81-100), B (61-80), C (41-60), D (21-40), E (0-20)
    if (rounded >= 81) return { grade: 'A', points: 1 };
    if (rounded >= 61) return { grade: 'B', points: 2 };
    if (rounded >= 41) return { grade: 'C', points: 3 };
    if (rounded >= 21) return { grade: 'D', points: 4 };
    return { grade: 'E', points: 5 };
  }
  // NECTA Secondary School (CSEE / FTNA) Grading Scale: A (75-100), B (65-74), C (45-64), D (30-44), F (0-29)
  if (rounded >= 75) return { grade: 'A', points: 1 };
  if (rounded >= 65) return { grade: 'B', points: 2 };
  if (rounded >= 45) return { grade: 'C', points: 3 };
  if (rounded >= 30) return { grade: 'D', points: 4 };
  return { grade: 'F', points: 5 };
}

function getNectaDivisionFromPoints(
  points: number | null,
  subjectsSat: number,
  totalExamSubjects: number
): string {
  // Division is ONLY calculated when the exam has >= 7 subjects AND the student sat >= 7 subjects
  if (totalExamSubjects < 7 || subjectsSat < 7 || points === null) {
    return '-';
  }
  if (points >= 7 && points <= 17) return 'I';
  if (points >= 18 && points <= 21) return 'II';
  if (points >= 22 && points <= 25) return 'III';
  if (points >= 26 && points <= 33) return 'IV';
  return '0';
}

async function recalculateJointExamResults(jointExamId: string) {
  const [exam] = await db
    .select()
    .from(schema.jointExams)
    .where(eq(schema.jointExams.id, jointExamId))
    .limit(1);

  if (!exam) return [];

  const isPrimary = isPrimaryJointExam(exam.level, exam.className);

  const examSubjects: string[] = Array.isArray(exam.subjects)
    ? exam.subjects.map((s: any) => String(s).trim()).filter(Boolean)
    : [];

  const rows = await db
    .select()
    .from(schema.jointResults)
    .where(eq(schema.jointResults.jointExamId, jointExamId));

  if (rows.length === 0) return [];

  // 1. Compute individual metrics (Total, Average, Subject Grades, GPA, Best 7 Points, Division)
  const computed = rows.map((row) => {
    const rawMarks = (row.subjectMarks && typeof row.subjectMarks === 'object')
      ? (row.subjectMarks as Record<string, any>)
      : {};
    const existingGradesObj = (row.subjectGrades && typeof row.subjectGrades === 'object')
      ? (row.subjectGrades as Record<string, any>)
      : {};
    const registeredSubjects: string[] = Array.isArray(existingGradesObj.__registeredSubjects)
      ? existingGradesObj.__registeredSubjects.map((s: any) => String(s).trim()).filter(Boolean)
      : examSubjects;

    const cleanMarks: Record<string, number> = {};
    const subjectGrades: Record<string, any> = {
      __registeredSubjects: registeredSubjects.length > 0 ? registeredSubjects : examSubjects,
    };
    const subjectPointsList: number[] = [];

    const baseSubjects = examSubjects.length > 0 ? examSubjects : Object.keys(rawMarks);
    const regSet = new Set((registeredSubjects.length > 0 ? registeredSubjects : baseSubjects).map((s) => s.toUpperCase()));

    for (const subj of baseSubjects) {
      if (regSet.size > 0 && !regSet.has(subj.toUpperCase())) continue;
      const val = rawMarks[subj];
      if (val !== undefined && val !== null && val !== '') {
        const num = Number(val);
        if (!Number.isNaN(num) && num >= 0 && num <= 100) {
          const clamped = Math.round(num * 100) / 100;
          cleanMarks[subj] = clamped;
          const gp = getNectaGradeAndPoints(clamped, isPrimary);
          subjectGrades[subj] = gp.grade;
          subjectPointsList.push(gp.points);
        }
      }
    }

    const subjectsSat = subjectPointsList.length;
    const totalMarks = Object.values(cleanMarks).reduce((sum, v) => sum + v, 0);
    const averageScore = subjectsSat > 0 ? Number((totalMarks / subjectsSat).toFixed(2)) : 0;
    const overallGrade = subjectsSat > 0
      ? getNectaGradeAndPoints(averageScore, isPrimary).grade
      : (isPrimary ? 'E' : 'F');

    // Best 7 subjects & Division calculation ONLY when exam has >= 7 subjects AND student sat >= 7 subjects.
    // Below 7 subjects (< 7), the system MUST NOT calculate Division!
    let best7Points: number | null = null;
    if (baseSubjects.length >= 7 && subjectsSat >= 7) {
      const sortedPoints = [...subjectPointsList].sort((a, b) => a - b);
      best7Points = sortedPoints.slice(0, 7).reduce((sum, p) => sum + p, 0);
    }

    const division = getNectaDivisionFromPoints(best7Points, subjectsSat, baseSubjects.length);

    const totalPointsAllSat = subjectPointsList.reduce((sum, p) => sum + p, 0);
    const studentGpa =
      baseSubjects.length >= 7 && subjectsSat >= 7 && best7Points !== null
        ? Number((best7Points / 7).toFixed(4))
        : subjectsSat > 0
        ? Number((totalPointsAllSat / subjectsSat).toFixed(4))
        : 5.0;
    subjectGrades.__gpa = studentGpa;

    return {
      ...row,
      cleanMarks,
      subjectGrades,
      registeredSubjects: subjectGrades.__registeredSubjects as string[],
      gpa: studentGpa,
      subjectsSat,
      totalMarks: Number(totalMarks.toFixed(2)),
      averageScore,
      overallGrade,
      best7Points,
      division,
      schoolRank: 1,
      overallRank: 1,
    };
  });

  // Helper comparator: Higher averageScore wins, then higher totalMarks, then lower best7Points / lower GPA
  const comparePerformance = (a: typeof computed[0], b: typeof computed[0]) => {
    if (b.averageScore !== a.averageScore) return b.averageScore - a.averageScore;
    if (b.totalMarks !== a.totalMarks) return b.totalMarks - a.totalMarks;
    if (a.best7Points !== null && b.best7Points !== null && a.best7Points !== b.best7Points) {
      return a.best7Points - b.best7Points;
    }
    if (a.gpa !== b.gpa) return a.gpa - b.gpa;
    return 0;
  };

  // 2. Compute Combined Overall Rank across all participating schools (Standard competition ranking 1, 2, 2, 4)
  const overallSorted = [...computed].sort(comparePerformance);
  for (let i = 0; i < overallSorted.length; i++) {
    if (i > 0 && comparePerformance(overallSorted[i - 1], overallSorted[i]) === 0) {
      overallSorted[i].overallRank = overallSorted[i - 1].overallRank;
    } else {
      overallSorted[i].overallRank = i + 1;
    }
  }

  // 3. Compute Individual School Rank within each participating school
  const bySchool = new Map<string, typeof computed>();
  for (const item of overallSorted) {
    const list = bySchool.get(item.jointSchoolId) || [];
    list.push(item);
    bySchool.set(item.jointSchoolId, list);
  }

  for (const [, schoolList] of bySchool.entries()) {
    schoolList.sort(comparePerformance);
    for (let i = 0; i < schoolList.length; i++) {
      if (i > 0 && comparePerformance(schoolList[i - 1], schoolList[i]) === 0) {
        schoolList[i].schoolRank = schoolList[i - 1].schoolRank;
      } else {
        schoolList[i].schoolRank = i + 1;
      }
    }
  }

  // 4. Persist updated calculations to Cloud SQL
  await Promise.all(
    overallSorted.map((item) =>
      db
        .update(schema.jointResults)
        .set({
          subjectMarks: item.cleanMarks,
          subjectGrades: item.subjectGrades,
          subjectsSat: item.subjectsSat,
          totalMarks: String(item.totalMarks),
          averageScore: String(item.averageScore),
          overallGrade: item.overallGrade,
          best7Points: item.best7Points,
          division: item.division,
          schoolRank: item.schoolRank,
          overallRank: item.overallRank,
          updatedAt: new Date(),
        })
        .where(eq(schema.jointResults.id, item.id))
    )
  );

  return overallSorted;
}

// GET /api/joint-exams - List all Joint Exams
app.get('/api/joint-exams', async (req, res) => {
  try {
    const enriched = await withJointDbRetry(async () => {
      const exams = await db
        .select()
        .from(schema.jointExams)
        .orderBy(desc(schema.jointExams.createdAt));

      const allSchools = await db.select().from(schema.jointSchools);
      const allResults = await db.select().from(schema.jointResults);

      return exams.map((ex) => {
        const schools = allSchools.filter((s) => s.jointExamId === ex.id);
        const resultsCount = allResults.filter((r) => r.jointExamId === ex.id).length;
        return {
          ...ex,
          schools,
          schoolCount: schools.length,
          studentCount: resultsCount,
        };
      });
    });

    res.json({ success: true, exams: enriched });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/joint-exams - Create a new Joint Exam with optional initial schools
app.post('/api/joint-exams', async (req, res) => {
  try {
    const { schoolId, name, examDate, className, level, subjects, schools } = req.body || {};
    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: 'Jina la mtihani wa pamoja linahitajika (Exam name is required).' });
    }

    const cleanSubjects = Array.isArray(subjects) && subjects.length > 0
      ? subjects.map((s: any) => String(s).trim().toUpperCase()).filter(Boolean)
      : ['CIVICS', 'HISTORY', 'GEOGRAPHY', 'KISWAHILI', 'ENGLISH', 'BIOLOGY', 'BASIC MATHEMATICS'];

    const resultPayload = await withJointDbRetry(async () => {
      let resolvedSchoolId: string | null = null;
      if (schoolId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(schoolId))) {
        try {
          const [existingSchool] = await db.select().from(schema.schools).where(eq(schema.schools.id, String(schoolId))).limit(1);
          if (existingSchool) resolvedSchoolId = existingSchool.id;
        } catch {
          resolvedSchoolId = null;
        }
      }

      const [createdExam] = await db
        .insert(schema.jointExams)
        .values({
          schoolId: resolvedSchoolId,
          name: String(name).trim(),
          examDate: examDate ? String(examDate) : new Date().toISOString().split('T')[0],
          className: className ? String(className) : 'Form 4',
          level: level ? String(level) : 'SECONDARY - CSEE',
          subjects: cleanSubjects,
          status: 'ACTIVE',
        })
        .returning();

      const createdSchools = [];
      const initialSchoolsInput =
        Array.isArray(schools) && schools.length > 0
          ? schools
          : [
              { schoolCode: 'S0101', schoolName: 'SHULE INAYOSHIRIKI A', hexColor: '#1E40AF' },
              { schoolCode: 'S0204', schoolName: 'SHULE INAYOSHIRIKI B', hexColor: '#047857' },
            ];

      for (const sch of initialSchoolsInput) {
        if (sch && sch.schoolName && String(sch.schoolName).trim()) {
          const [ins] = await db
            .insert(schema.jointSchools)
            .values({
              jointExamId: createdExam.id,
              schoolCode: String(sch.schoolCode || 'S0001').trim().toUpperCase(),
              schoolName: String(sch.schoolName).trim(),
              hexColor: String(sch.hexColor || '#1E40AF').trim(),
              region: sch.region ? String(sch.region).trim() : null,
              district: sch.district ? String(sch.district).trim() : null,
            })
            .returning();
          createdSchools.push(ins);
        }
      }

      return {
        ...createdExam,
        schools: createdSchools,
        schoolCount: createdSchools.length,
        studentCount: 0,
      };
    });

    res.json({
      success: true,
      exam: resultPayload,
    });
  } catch (err: any) {
    console.error('[POST /api/joint-exams] Error:', err);
    res.status(500).json({ error: err.message || 'Imeshindwa kuanzisha mtihani wa pamoja.' });
  }
});

// PUT /api/joint-exams/:id - Update Joint Exam metadata or subjects
app.put('/api/joint-exams/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, examDate, className, level, subjects, status } = req.body || {};

    const updatePayload: Record<string, any> = { updatedAt: new Date() };
    if (name !== undefined) updatePayload.name = String(name).trim();
    if (examDate !== undefined) updatePayload.examDate = String(examDate);
    if (className !== undefined) updatePayload.className = String(className);
    if (level !== undefined) updatePayload.level = String(level);
    if (status !== undefined) updatePayload.status = String(status);
    if (Array.isArray(subjects)) {
      updatePayload.subjects = subjects.map((s: any) => String(s).trim().toUpperCase()).filter(Boolean);
    }

    const [updated] = await db
      .update(schema.jointExams)
      .set(updatePayload)
      .where(eq(schema.jointExams.id, id))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Mtihani haujapatikana.' });
    }

    await recalculateJointExamResults(id);
    res.json({ success: true, exam: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/joint-exams/:id - Delete a Joint Exam
app.delete('/api/joint-exams/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.delete(schema.jointExams).where(eq(schema.jointExams.id, id));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/joint-exams/:id/full - Get full exam details, participating schools, and ranked results
app.get('/api/joint-exams/:id/full', async (req, res) => {
  try {
    const { id } = req.params;
    const [exam] = await db
      .select()
      .from(schema.jointExams)
      .where(eq(schema.jointExams.id, id))
      .limit(1);

    if (!exam) {
      return res.status(404).json({ error: 'Mtihani wa pamoja haujapatikana.' });
    }

    const examSubjects: string[] = Array.isArray(exam.subjects)
      ? exam.subjects.map((s: any) => String(s).trim()).filter(Boolean)
      : [];

    const schools = await db
      .select()
      .from(schema.jointSchools)
      .where(eq(schema.jointSchools.jointExamId, id))
      .orderBy(asc(schema.jointSchools.schoolCode));

    const results = await db
      .select()
      .from(schema.jointResults)
      .where(eq(schema.jointResults.jointExamId, id))
      .orderBy(asc(schema.jointResults.overallRank));

    const schoolMap = new Map(schools.map((s) => [s.id, s]));

    const enrichedResults = results.map((r) => {
      const sch = schoolMap.get(r.jointSchoolId);
      const gradesObj = (r.subjectGrades && typeof r.subjectGrades === 'object') ? (r.subjectGrades as Record<string, any>) : {};
      const regSubjs = Array.isArray(gradesObj.__registeredSubjects) && gradesObj.__registeredSubjects.length > 0
        ? gradesObj.__registeredSubjects
        : examSubjects;
      const gpa = typeof gradesObj.__gpa === 'number' ? gradesObj.__gpa : undefined;
      return {
        ...r,
        registeredSubjects: regSubjs,
        gpa,
        totalMarks: Number(r.totalMarks || 0),
        averageScore: Number(r.averageScore || 0),
        schoolName: sch?.schoolName || 'Unknown School',
        schoolCode: sch?.schoolCode || 'N/A',
        hexColor: sch?.hexColor || '#1E40AF',
      };
    });

    res.json({
      success: true,
      exam,
      schools,
      results: enrichedResults,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/joint-exams/:id/schools - Add a participating school
app.post('/api/joint-exams/:id/schools', async (req, res) => {
  try {
    const { id } = req.params;
    const { schoolCode, schoolName, hexColor, region, district } = req.body || {};

    if (!schoolName || !String(schoolName).trim()) {
      return res.status(400).json({ error: 'Jina la shule linahitajika.' });
    }

    const [school] = await db
      .insert(schema.jointSchools)
      .values({
        jointExamId: id,
        schoolCode: String(schoolCode || 'S0001').trim().toUpperCase(),
        schoolName: String(schoolName).trim(),
        hexColor: String(hexColor || '#1E40AF').trim(),
        region: region ? String(region).trim() : null,
        district: district ? String(district).trim() : null,
      })
      .returning();

    res.json({ success: true, school });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/joint-exams/:id/schools/:schoolId - Update participating school info / hexColor
app.put('/api/joint-exams/:id/schools/:schoolId', async (req, res) => {
  try {
    const { schoolId } = req.params;
    const { schoolCode, schoolName, hexColor, region, district } = req.body || {};

    const updateData: Record<string, any> = {};
    if (schoolCode !== undefined) updateData.schoolCode = String(schoolCode).trim().toUpperCase();
    if (schoolName !== undefined) updateData.schoolName = String(schoolName).trim();
    if (hexColor !== undefined) updateData.hexColor = String(hexColor).trim();
    if (region !== undefined) updateData.region = region ? String(region).trim() : null;
    if (district !== undefined) updateData.district = district ? String(district).trim() : null;

    const [updated] = await db
      .update(schema.jointSchools)
      .set(updateData)
      .where(eq(schema.jointSchools.id, schoolId))
      .returning();

    res.json({ success: true, school: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/joint-exams/:id/schools/:schoolId - Delete participating school and recalculate
app.delete('/api/joint-exams/:id/schools/:schoolId', async (req, res) => {
  try {
    const { id, schoolId } = req.params;
    await db.delete(schema.jointSchools).where(eq(schema.jointSchools.id, schoolId));
    await recalculateJointExamResults(id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/joint-exams/:id/results - Save/Upsert student registrations & marks for a participating school (0-100 validation)
app.post('/api/joint-exams/:id/results', async (req, res) => {
  try {
    const { id } = req.params;
    const { jointSchoolId, entries } = req.body || {};

    const rowsToSave = Array.isArray(entries) ? entries : [req.body];
    if (rowsToSave.length === 0) {
      return res.status(400).json({ error: 'Hakuna wanafunzi au alama zilizotumwa.' });
    }

    // Validate all marks are within 0 - 100
    for (const entry of rowsToSave) {
      if (!entry.studentName || !String(entry.studentName).trim()) {
        return res.status(400).json({ error: 'Kila mwanafunzi lazima awe na jina kamili.' });
      }
      const targetSchoolId = entry.jointSchoolId || jointSchoolId;
      if (!targetSchoolId) {
        return res.status(400).json({ error: 'Tafadhali chagua shule inayoshiriki kwanza (Select participating school).' });
      }
      const marksObj = entry.subjectMarks || {};
      for (const [subj, rawScore] of Object.entries(marksObj)) {
        if (rawScore !== '' && rawScore !== null && rawScore !== undefined) {
          const scoreNum = Number(rawScore);
          if (Number.isNaN(scoreNum) || scoreNum < 0 || scoreNum > 100) {
            return res.status(400).json({
              error: `Alama batili kwenye somo la ${subj} kwa ${entry.studentName}: (${rawScore}). Alama lazima iwe kati ya 0 na 100.`,
            });
          }
        }
      }
    }

    const existingResults = await db
      .select()
      .from(schema.jointResults)
      .where(eq(schema.jointResults.jointExamId, id));

    for (const entry of rowsToSave) {
      const targetSchoolId = String(entry.jointSchoolId || jointSchoolId).trim();
      const cleanName = String(entry.studentName).trim();
      const cleanRegNo = String(entry.regNo || `CAND-${Math.floor(1000 + Math.random() * 9000)}`).trim();
      const cleanGender = String(entry.gender || 'M').trim().toUpperCase().startsWith('F') ? 'F' : 'M';
      const cleanStream = String(entry.stream || 'A').trim();

      const validMarks: Record<string, number> = {};
      if (entry.subjectMarks && typeof entry.subjectMarks === 'object') {
        for (const [k, v] of Object.entries(entry.subjectMarks)) {
          if (v !== '' && v !== null && v !== undefined) {
            const n = Number(v);
            if (!Number.isNaN(n) && n >= 0 && n <= 100) {
              validMarks[k] = Math.round(n * 100) / 100;
            }
          }
        }
      }

      const match = existingResults.find(
        (r) =>
          (entry.id && r.id === entry.id) ||
          (r.jointSchoolId === targetSchoolId &&
            r.regNo.toLowerCase() === cleanRegNo.toLowerCase() &&
            r.studentName.toLowerCase() === cleanName.toLowerCase())
      );

      if (match) {
        const prevMarks = (typeof match.subjectMarks === 'object' && match.subjectMarks) ? (match.subjectMarks as Record<string, number>) : {};
        const mergedMarks = entry.replaceMarks ? validMarks : { ...prevMarks, ...validMarks };
        const prevGrades = (typeof match.subjectGrades === 'object' && match.subjectGrades) ? (match.subjectGrades as Record<string, any>) : {};
        const nextRegSubjects = Array.isArray(entry.registeredSubjects) && entry.registeredSubjects.length > 0
          ? entry.registeredSubjects
          : prevGrades.__registeredSubjects;

        await db
          .update(schema.jointResults)
          .set({
            studentName: cleanName,
            regNo: cleanRegNo,
            gender: cleanGender,
            stream: cleanStream,
            subjectMarks: mergedMarks,
            subjectGrades: nextRegSubjects ? { ...prevGrades, __registeredSubjects: nextRegSubjects } : prevGrades,
            updatedAt: new Date(),
          })
          .where(eq(schema.jointResults.id, match.id));
      } else {
        const initGrades: Record<string, any> = {};
        if (Array.isArray(entry.registeredSubjects) && entry.registeredSubjects.length > 0) {
          initGrades.__registeredSubjects = entry.registeredSubjects;
        }
        await db.insert(schema.jointResults).values({
          jointExamId: id,
          jointSchoolId: targetSchoolId,
          studentName: cleanName,
          regNo: cleanRegNo,
          gender: cleanGender,
          stream: cleanStream,
          subjectMarks: validMarks,
          subjectGrades: initGrades,
        });
      }
    }

    await recalculateJointExamResults(id);

    const schools = await db
      .select()
      .from(schema.jointSchools)
      .where(eq(schema.jointSchools.jointExamId, id))
      .orderBy(asc(schema.jointSchools.schoolCode));

    const updatedResults = await db
      .select()
      .from(schema.jointResults)
      .where(eq(schema.jointResults.jointExamId, id))
      .orderBy(asc(schema.jointResults.overallRank));

    const schoolMap = new Map(schools.map((s) => [s.id, s]));
    const enrichedResults = updatedResults.map((r) => {
      const sch = schoolMap.get(r.jointSchoolId);
      const gradesObj = (r.subjectGrades && typeof r.subjectGrades === 'object') ? (r.subjectGrades as Record<string, any>) : {};
      return {
        ...r,
        registeredSubjects: Array.isArray(gradesObj.__registeredSubjects) ? gradesObj.__registeredSubjects : undefined,
        gpa: typeof gradesObj.__gpa === 'number' ? gradesObj.__gpa : undefined,
        totalMarks: Number(r.totalMarks || 0),
        averageScore: Number(r.averageScore || 0),
        schoolName: sch?.schoolName || 'Unknown School',
        schoolCode: sch?.schoolCode || 'N/A',
        hexColor: sch?.hexColor || '#1E40AF',
      };
    });

    res.json({
      success: true,
      results: enrichedResults,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/joint-exams/:id/results/:resultId - Delete a student result and recalculate ranks
app.delete('/api/joint-exams/:id/results/:resultId', async (req, res) => {
  try {
    const { id, resultId } = req.params;
    await db.delete(schema.jointResults).where(eq(schema.jointResults.id, resultId));
    await recalculateJointExamResults(id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/joint-exams/:id/recalculate - Trigger manual recalculation
app.post('/api/joint-exams/:id/recalculate', async (req, res) => {
  try {
    const { id } = req.params;
    await recalculateJointExamResults(id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Google Search Console Verification Routes
app.get('/googled0d16ab4850e7113.html', (_req, res) => {
  res.setHeader('Content-Type', 'text/plain');
  res.status(200).send('google-site-verification: googled0d16ab4850e7113.html');
});

app.get('/google:code.html', (req, res) => {
  const code = req.params.code;
  res.setHeader('Content-Type', 'text/plain');
  res.status(200).send(`google-site-verification: google${code}.html`);
});

app.get('/robots.txt', (_req, res) => {
  res.setHeader('Content-Type', 'text/plain');
  res.status(200).send('User-agent: *\nAllow: /\nSitemap: https://habyedupro.co.tz/sitemap.xml\n');
});

app.get('/sitemap.xml', (_req, res) => {
  res.setHeader('Content-Type', 'application/xml');
  res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://habyedupro.co.tz/</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`);
});

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

