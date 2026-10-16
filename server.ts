import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import axios from 'axios';
import { simpleGit } from 'simple-git';
import AdmZip from 'adm-zip';
import { generateAITimetable } from './src/server/timetableAILogic.ts';
import { generateAISchemeOfWork, generateAILessonPlan } from './src/server/schemeAILogic.ts';
import { fetchAndParseNectaUrl } from './src/server/nectaFetchLogic.ts';
import { normalizeTzPhone, sendBeemSMS } from './src/server/smsUtils.ts';
import {
  queryTimetable,
  saveTimetable,
  deleteTimetableAssignment,
  type ServerTimetableAssignment
} from './src/server/timetableStore.ts';
import { db } from './src/db/index.ts';
import * as schema from './src/db/schema.ts';
import { eq } from 'drizzle-orm';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '10mb' }));

// DB API
app.get('/api/db/school-data', async (req, res) => {
  const { schoolId } = req.query as { schoolId: string };
  try {
    const data = await db.query.schoolData.findFirst({
      where: eq(schema.schoolData.schoolId, schoolId),
    });
    res.json(data || {});
  } catch (err: any) {
    console.error('Error fetching school-data:', err?.message || err);
    res.status(500).json({ error: 'Failed to fetch school data' });
  }
});

app.post('/api/db/school-data', async (req, res) => {
  const { schoolId, payload } = req.body;
  if (!schoolId) {
    return res.status(400).json({ error: 'schoolId is required' });
  }
  try {
    const raw = payload || {};
    const normalizedData = {
      id: raw.id || schoolId,
      schoolId: schoolId,
      schoolInfo: raw.schoolInfo || raw.school_info || {},
      timetableAssignments: raw.timetableAssignments || raw.timetable_assignments || [],
      periodSettings: raw.periodSettings || raw.period_settings || [],
      streamSettings: raw.streamSettings || raw.stream_settings || [],
      institutionalPolicy: raw.institutionalPolicy || raw.institutional_policy || {},
      sessions: raw.sessions || [],
      supervisors: raw.supervisors || [],
      selectedInvigilators: raw.selectedInvigilators || raw.selected_invigilators || [],
      invigilationAssignments: raw.invigilationAssignments || raw.invigilation_assignments || {},
      dailyAttendance: raw.dailyAttendance || raw.daily_attendance || {},
      journalRecords: raw.journalRecords || raw.journal_records || {},
      schemesOfWork: raw.schemesOfWork || raw.schemes_of_work || [],
      lessonPlans: raw.lessonPlans || raw.lesson_plans || [],
      teacherEvaluations: raw.teacherEvaluations || raw.teacher_evaluations || [],
      savedTimetableRecords: raw.savedTimetableRecords || raw.saved_timetable_records || [],
      savedInvigilationRecords: raw.savedInvigilationRecords || raw.saved_invigilation_records || [],
      gradeCutoffs: raw.gradeCutoffs || raw.grade_cutoffs || {},
      ledgerSubjectKeys: raw.ledgerSubjectKeys || raw.ledger_subject_keys || {},
      subjectPeriodAllocations: raw.subjectPeriodAllocations || raw.subject_period_allocations || [],
      teacherAssignments: raw.teacherAssignments || raw.teacher_assignments || [],
      subjectPaperConfigs: raw.subjectPaperConfigs || raw.subject_paper_configs || {},
      bubbleSettings: raw.bubbleSettings || raw.bubble_settings || {},
      students: raw.students || [],
      teachers: raw.teachers || [],
      exams: raw.exams || [],
      examinationRecords: raw.examinationRecords || raw.examination_records || [],
      updatedAt: new Date(),
    };

    await db.insert(schema.schoolData).values(normalizedData).onConflictDoUpdate({
      target: schema.schoolData.schoolId,
      set: normalizedData,
    });
    res.json({ success: true });
  } catch (err: any) {
    console.error('Error saving school-data:', err?.message || err);
    res.status(500).json({ error: 'Failed to save school data', details: err?.message });
  }
});

app.get('/api/db/school-subscriptions', async (req, res) => {
  const { schoolId } = req.query as { schoolId: string };
  try {
    const data = await db.query.schoolSubscriptions.findFirst({
      where: eq(schema.schoolSubscriptions.schoolId, schoolId),
    });
    res.json(data || {});
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch subscriptions' });
  }
});

app.post('/api/db/school-subscriptions', async (req, res) => {
  const { schoolId, payload } = req.body;
  try {
    await db.insert(schema.schoolSubscriptions).values(payload).onConflictDoUpdate({
      target: schema.schoolSubscriptions.schoolId,
      set: payload
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save subscription' });
  }
});

// Schools API
app.get('/api/db/schools', async (_req, res) => {
  try {
    const data = await db.select().from(schema.schools);
    res.json(data);
  } catch (err: any) {
    console.error('Error fetching schools:', err);
    res.status(500).json({ error: 'Failed to fetch schools' });
  }
});

app.post('/api/db/schools', async (req, res) => {
  try {
    const payload = req.body;
    await db.insert(schema.schools).values(payload).onConflictDoUpdate({
      target: schema.schools.id,
      set: payload
    });
    res.json({ success: true });
  } catch (err: any) {
    console.error('Error saving school:', err);
    res.status(500).json({ error: 'Failed to save school' });
  }
});

app.delete('/api/db/schools/:id', async (req, res) => {
  try {
    await db.delete(schema.schools).where(eq(schema.schools.id, req.params.id as any));
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
      const data = await db.select().from(schema.schoolAdmins).where(eq(schema.schoolAdmins.schoolId, schoolId as any));
      return res.json(data);
    }
    const data = await db.select().from(schema.schoolAdmins);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch school admins' });
  }
});

app.post('/api/db/school-admins', async (req, res) => {
  try {
    const payload = req.body;
    await db.insert(schema.schoolAdmins).values(payload).onConflictDoUpdate({
      target: schema.schoolAdmins.id,
      set: payload
    });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to save school admin' });
  }
});

// Students API
app.get('/api/db/students', async (req, res) => {
  try {
    const { schoolId } = req.query as { schoolId: string };
    if (schoolId) {
      const data = await db.select().from(schema.students).where(eq(schema.students.schoolId, schoolId as any));
      return res.json(data);
    }
    const data = await db.select().from(schema.students);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch students' });
  }
});

app.post('/api/db/students', async (req, res) => {
  try {
    const { schoolId, payload } = req.body;
    const records = Array.isArray(payload) ? payload : [payload];
    await db.insert(schema.students).values(records.map((s: any) => ({ ...s, schoolId }))).onConflictDoNothing();
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to save students' });
  }
});

// Teachers API
app.get('/api/db/teachers', async (req, res) => {
  try {
    const { schoolId } = req.query as { schoolId: string };
    if (schoolId) {
      const data = await db.select().from(schema.teachers).where(eq(schema.teachers.schoolId, schoolId as any));
      return res.json(data);
    }
    const data = await db.select().from(schema.teachers);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch teachers' });
  }
});

app.post('/api/db/teachers', async (req, res) => {
  try {
    const { schoolId, payload } = req.body;
    const records = Array.isArray(payload) ? payload : [payload];
    await db.insert(schema.teachers).values(records.map((t: any) => ({ ...t, schoolId }))).onConflictDoNothing();
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to save teachers' });
  }
});

// Exams API
app.get('/api/db/exams', async (req, res) => {
  try {
    const { schoolId } = req.query as { schoolId: string };
    if (schoolId) {
      const data = await db.select().from(schema.exams).where(eq(schema.exams.schoolId, schoolId as any));
      return res.json(data);
    }
    const data = await db.select().from(schema.exams);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch exams' });
  }
});

app.post('/api/db/exams', async (req, res) => {
  try {
    const { schoolId, payload } = req.body;
    const records = Array.isArray(payload) ? payload : [payload];
    await db.insert(schema.exams).values(records.map((e: any) => ({ ...e, schoolId }))).onConflictDoNothing();
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to save exams' });
  }
});

// Users API
app.get('/api/db/users', async (req, res) => {
  try {
    const { schoolId } = req.query as { schoolId: string };
    if (schoolId) {
      const data = await db.select().from(schema.users).where(eq(schema.users.schoolId, schoolId as any));
      return res.json(data);
    }
    const data = await db.select().from(schema.users);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Universal Query Endpoint for Cloud SQL
app.post('/api/db/query', async (req, res) => {
  const { table, action, filters, data } = req.body;
  const tableKeyMap: Record<string, any> = {
    schools: schema.schools,
    users: schema.users,
    students: schema.students,
    teachers: schema.teachers,
    classes: schema.classes,
    exams: schema.exams,
    school_data: schema.schoolData,
    school_admins: schema.schoolAdmins,
    school_subscriptions: schema.schoolSubscriptions,
    period_attendance: schema.periodAttendance,
    remedial_timetable: schema.remedialTimetable,
    remedial_attendance: schema.remedialAttendance,
    timetables: schema.timetables,
    parents: schema.parents,
    discipline_records: schema.disciplineRecords,
    parent_messages: schema.parentMessages,
    announcements: schema.announcements,
    exam_records: schema.examRecords,
    sitting_plans: schema.sittingPlans,
    ream_paper_records: schema.reamPaperRecords,
    periods: schema.periods,
    period_settings: schema.periodSettings,
    stream_settings: schema.streamSettings,
    timetable_assignments: schema.timetableAssignments,
    subject_period_allocations: schema.subjectPeriodAllocations,
    teacher_assignments: schema.teacherAssignments,
  };

  const selectedTable = tableKeyMap[table];
  if (!selectedTable) {
    return res.status(400).json({ error: `Table '${table}' is not supported in Cloud SQL schema` });
  }

  try {
    if (action === 'select') {
      let query = db.select().from(selectedTable);
      if (filters && typeof filters === 'object') {
        const filterEntries = Object.entries(filters);
        if (filterEntries.length > 0) {
          const [col, val] = filterEntries[0];
          if (selectedTable[col]) {
            query = query.where(eq(selectedTable[col], val)) as any;
          }
        }
      }
      const results = await query;
      return res.json({ success: true, data: results });
    }

    if (action === 'insert') {
      const records = Array.isArray(data) ? data : [data];
      await db.insert(selectedTable).values(records).onConflictDoNothing();
      return res.json({ success: true });
    }

    if (action === 'upsert') {
      const records = Array.isArray(data) ? data : [data];
      if (records.length > 0) {
        await db.insert(selectedTable).values(records).onConflictDoNothing();
      }
      return res.json({ success: true });
    }

    if (action === 'delete') {
      if (filters && typeof filters === 'object') {
        const filterEntries = Object.entries(filters);
        if (filterEntries.length > 0) {
          const [col, val] = filterEntries[0];
          if (selectedTable[col]) {
            await db.delete(selectedTable).where(eq(selectedTable[col], val));
          }
        }
      }
      return res.json({ success: true });
    }

    return res.status(400).json({ error: `Action '${action}' not supported` });
  } catch (err: any) {
    console.error(`Error in /api/db/query for ${table}:`, err?.message || err);
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

// TIMETABLE REST API (Fetch, Save, Delete with Class + Stream filtering)
app.get('/api/timetable', (req, res) => {
  try {
    const { schoolId, class: className, stream, teacherId, day } = req.query as Record<string, string>;

    console.log(`[Timetable API] Fetching timetable for school: ${schoolId || 'DEFAULT'} | class: ${className || 'ALL'} | stream: ${stream || 'ALL'} | teacher: ${teacherId || 'ALL'}`);

    const results = queryTimetable({
      schoolId,
      className,
      stream,
      teacherId,
      day
    });

    console.log(`[Timetable API] Found ${results.length} periods for class="${className}" stream="${stream}"`);

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

app.post('/api/timetable', (req, res) => {
  try {
    const { schoolId = 'DEFAULT_PRIMARY_SCHOOL_ID', assignments, replace = false, className, stream } = req.body;

    if (!Array.isArray(assignments) && !req.body.entry) {
      return res.status(400).json({ success: false, error: 'assignments array or entry object required' });
    }

    const toSave: ServerTimetableAssignment[] = Array.isArray(assignments)
      ? assignments
      : [req.body.entry];

    console.log(`[Timetable API] Saving ${toSave.length} periods for school: ${schoolId} (replace: ${replace}, class: ${className}, stream: ${stream})`);

    const updated = saveTimetable(schoolId, toSave, { replace, className, stream });

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

app.delete('/api/timetable', (req, res) => {
  try {
    const { schoolId = 'DEFAULT_PRIMARY_SCHOOL_ID', id, className, stream, day, period } = req.body;
    const deleted = deleteTimetableAssignment(schoolId, { id, className, stream, day, period });
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
  const { schoolId, payload } = req.body;
  await db.insert(schema.periodAttendance).values({...payload, schoolId}).onConflictDoUpdate({
      target: schema.periodAttendance.id,
      set: payload
  });
  res.json({ success: true });
});

app.get('/api/db/attendance', async (req, res) => {
  const { schoolId } = req.query as any;
  const data = await db.select().from(schema.periodAttendance).where(eq(schema.periodAttendance.schoolId, schoolId));
  res.json(data);
});

app.get('/api/db/attendance/weekly', async (req, res) => {
  const { schoolId } = req.query as any;
  const data = await db.select().from(schema.periodAttendance).where(eq(schema.periodAttendance.schoolId, schoolId));
  res.json(data);
});

// In dev mode, mount Vite middleware; in production or when built, serve dist files
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';
  const distDir = path.resolve(__dirname, 'dist');
  const indexPath = path.join(distDir, 'index.html');
  const hasDist = fs.existsSync(indexPath);

  if (isProduction && hasDist) {
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
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
    // Development or fallback: mount Vite middleware
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    app.get('*', async (req, res, next) => {
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

  app.listen(port, '0.0.0.0', () => {
    console.log(`HABY EDU PRO server listening on http://0.0.0.0:${port} (mode: ${isProduction ? 'production' : 'development'})`);
  });
}

export default app;

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
