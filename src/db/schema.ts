import { pgTable, text, timestamp, uuid, jsonb, integer, numeric, date, boolean, primaryKey } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// 1. SCHOOLS
export const schools = pgTable('schools', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  code: text('code'),
  district: text('district'),
  region: text('region'),
  phone: text('phone'),
  email: text('email'),
  status: text('status').default('ACTIVE'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 2. USERS (Integrated with Supabase Auth UID)
export const users = pgTable('users', {
  id: text('id').primaryKey(), // Supabase UID
  email: text('email').notNull().unique(),
  fullName: text('full_name'),
  role: text('role').default('TEACHER'),
  schoolId: uuid('school_id').references(() => schools.id, { onDelete: 'set null' }),
  isSuperAdmin: boolean('is_super_admin').default(false),
  assignedSubjects: jsonb('assigned_subjects').default([]),
  lastLoginAt: timestamp('last_login_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 3. STUDENTS
export const students = pgTable('students', {
  id: uuid('id').defaultRandom().primaryKey(),
  schoolId: uuid('school_id').references(() => schools.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  className: text('class_name').notNull(),
  stream: text('stream'),
  gender: text('gender'),
  parentPhone: text('parent_phone'),
  phone: text('phone'),
  regNo: text('reg_no'),
  level: text('level').default('CSEE'),
  dob: date('dob'),
  passportPhoto: text('passport_photo'),
  subjects: jsonb('subjects').default([]),
  marks: jsonb('marks').default({}),
  total: numeric('total').default('0'),
  average: text('average').default('0.0'),
  division: text('division').default('-'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 4. TEACHERS
export const teachers = pgTable('teachers', {
  id: uuid('id').defaultRandom().primaryKey(),
  schoolId: uuid('school_id').references(() => schools.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  gender: text('gender').default('Male'),
  schoolRole: text('school_role').default('Subject Teacher'),
  initial: text('initial'),
  phone: text('phone'),
  email: text('email'),
  subjects: jsonb('subjects').default([]),
  teachingStreams: jsonb('teaching_streams').default([]),
  color: text('color').default('#1d4ed8'),
  maxPeriodsPerWeek: integer('max_periods_per_week').default(20),
  excludeInvigilation: boolean('exclude_invigilation').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});
// 4B. CLASSES - ADD HII SASA
export const classes = pgTable('classes', {
  id: uuid('id').defaultRandom().primaryKey(),
  schoolId: uuid('school_id').references(() => schools.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(), // Form 1, Form 2, etc
  stream: text('stream').default('A'),
  level: text('level').default('CSEE'),
  classTeacherId: uuid('class_teacher_id').references(() => teachers.id, { onDelete: 'set null' }),
  capacity: integer('capacity').default(45),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 5. EXAMS
export const exams = pgTable('exams', {
  id: uuid('id').defaultRandom().primaryKey(),
  schoolId: uuid('school_id').references(() => schools.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  term: text('term'),
  year: text('year'),
  className: text('class_name'),
  level: text('level').default('CSEE'),
  date: date('date'),
  status: text('status').default('Active'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 6. ATTENDANCE (Period Attendance)
export const periodAttendance = pgTable('period_attendance', {
  id: text('id').primaryKey(), // school_id_date_time_class
  schoolId: uuid('school_id').references(() => schools.id, { onDelete: 'cascade' }),
  date: date('date').notNull(),
  dayOfWeek: text('day_of_week').notNull(),
  periodNumber: integer('period_number').notNull(),
  className: text('class_name').notNull(),
  stream: text('stream'),
  subject: text('subject'),
  teacherName: text('teacher_name'),
  status: text('status').default('taught'),
  reason: text('reason'),
  markedBy: text('marked_by'),
  markedAt: timestamp('marked_at').defaultNow(),
});

// 7. REMEDIAL MODULE
export const remedialTimetable = pgTable('remedial_timetable', {
  id: uuid('id').defaultRandom().primaryKey(),
  schoolId: uuid('school_id').references(() => schools.id, { onDelete: 'cascade' }),
  dayOfWeek: text('day_of_week').notNull(),
  periodTime: text('period_time').notNull(),
  className: text('class_name').notNull(),
  subject: text('subject').notNull(),
  teacherName: text('teacher_name').notNull(),
  stream: text('stream').default('A'),
  term: text('term').default('Term 1'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const remedialAttendance = pgTable('remedial_attendance', {
  id: text('id').primaryKey(),
  schoolId: uuid('school_id').references(() => schools.id, { onDelete: 'cascade' }),
  date: date('date').notNull(),
  dayOfWeek: text('day_of_week').notNull(),
  periodTime: text('period_time').notNull(),
  className: text('class_name').notNull(),
  subject: text('subject'),
  teacherName: text('teacher_name'),
  stream: text('stream'),
  status: text('status').default('taught'),
  ratePerPeriod: numeric('rate_per_period').default('5000'),
  markedBy: text('marked_by'),
  markedAt: timestamp('marked_at').defaultNow(),
});

// 8. RELATIONS
export const schoolsRelations = relations(schools, ({ many }) => ({
  users: many(users),
  students: many(students),
  teachers: many(teachers),
  exams: many(exams),
  classes: many(classes)
}));

export const usersRelations = relations(users, ({ one }) => ({
  school: one(schools, {
    fields: [users.schoolId],
    references: [schools.id],
  }),
}));

// 9. SCHOOL DATA (CENTRAL ENGINE)
export const schoolData = pgTable('school_data', {
  id: text('id').primaryKey(),
  schoolId: text('school_id').notNull().unique(),
  schoolInfo: jsonb('school_info').default({}),
  timetableAssignments: jsonb('timetable_assignments').default([]),
  periodSettings: jsonb('period_settings').default([]),
  streamSettings: jsonb('stream_settings').default([]),
  institutionalPolicy: jsonb('institutional_policy').default({}),
  sessions: jsonb('sessions').default([]),
  supervisors: jsonb('supervisors').default([]),
  selectedInvigilators: jsonb('selected_invigilators').default([]),
  invigilationAssignments: jsonb('invigilation_assignments').default({}),
  dailyAttendance: jsonb('daily_attendance').default({}),
  journalRecords: jsonb('journal_records').default({}),
  schemesOfWork: jsonb('schemes_of_work').default([]),
  lessonPlans: jsonb('lesson_plans').default([]),
  teacherEvaluations: jsonb('teacher_evaluations').default([]),
  savedTimetableRecords: jsonb('saved_timetable_records').default([]),
  savedInvigilationRecords: jsonb('saved_invigilation_records').default([]),
  gradeCutoffs: jsonb('grade_cutoffs').default({}),
  ledgerSubjectKeys: jsonb('ledger_subject_keys').default({}),
  subjectPeriodAllocations: jsonb('subject_period_allocations').default([]),
  teacherAssignments: jsonb('teacher_assignments').default([]),
  subjectPaperConfigs: jsonb('subject_paper_configs').default({}),
  bubbleSettings: jsonb('bubble_settings').default({}),
  students: jsonb('students').default([]),
  teachers: jsonb('teachers').default([]),
  exams: jsonb('exams').default([]),
  examinationRecords: jsonb('examination_records').default([]),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 10. TIMETABLE TABLES
export const timetables = pgTable('timetables', {
  id: text('id').primaryKey(),
  schoolId: text('school_id').notNull(),
  classId: text('class_id').notNull(),
  stream: text('stream').default('STREAM A'),
  dayOfWeek: text('day_of_week').notNull(),
  periodNumber: integer('period_number').notNull(),
  subjectId: text('subject_id').notNull(),
  teacherId: integer('teacher_id'),
  timeStart: text('time_start'),
  timeEnd: text('time_end'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const timetableAssignments = pgTable('timetable_assignments', {
  id: text('id').primaryKey(),
  schoolId: text('school_id').notNull(),
  className: text('class_name').notNull(),
  stream: text('stream').default('STREAM A'),
  day: text('day').notNull(),
  period: text('period').notNull(),
  periodName: text('period_name'),
  teacherId: integer('teacher_id'),
  teacherName: text('teacher_name'),
  subject: text('subject').notNull(),
  room: text('room').default('Classroom'),
  activityType: text('activity_type').default('academic'),
  customNote: text('custom_note'),
  isLocked: boolean('is_locked').default(false),
  allocationMode: text('allocation_mode').default('manual'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const periodSettings = pgTable('period_settings', {
  id: text('id').primaryKey(),
  schoolId: text('school_id').notNull(),
  day: text('day').default('Monday'),
  name: text('name').notNull(),
  startTime: text('start_time').notNull(),
  endTime: text('end_time').notNull(),
  isBreak: boolean('is_break').default(false),
  assignedTeacherId: integer('assigned_teacher_id'),
  defaultSubject: text('default_subject'),
  className: text('class_name').default('All Classes'),
  streamName: text('stream_name').default('All Streams'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const streamSettings = pgTable('stream_settings', {
  id: text('id').primaryKey(),
  schoolId: text('school_id').notNull(),
  className: text('class_name').notNull(),
  level: text('level').default('CSEE'),
  streams: jsonb('streams').default(['STREAM A', 'STREAM B']),
  createdAt: timestamp('created_at').defaultNow(),
});

export const subjectPeriodAllocations = pgTable('subject_period_allocations', {
  id: text('id').primaryKey(),
  schoolId: text('school_id').notNull(),
  className: text('class_name').notNull(),
  subjectName: text('subject_name').notNull(),
  periodsPerWeek: integer('periods_per_week').default(4),
  doublePeriods: boolean('double_periods').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

export const teacherAssignments = pgTable('teacher_assignments', {
  id: text('id').primaryKey(),
  schoolId: text('school_id').notNull(),
  teacherId: integer('teacher_id').notNull(),
  teacherName: text('teacher_name'),
  className: text('class_name').notNull(),
  stream: text('stream'),
  subjectName: text('subject_name').notNull(),
  periodsCount: integer('periods_count').default(4),
  createdAt: timestamp('created_at').defaultNow(),
});

export const savedTimetableRecords = pgTable('saved_timetable_records', {
  id: text('id').primaryKey(),
  schoolId: text('school_id').notNull(),
  name: text('name').notNull(),
  academicYear: text('academic_year').default('2026'),
  term: text('term').default('Term 1'),
  timetableData: jsonb('timetable_data').default([]),
  status: text('status').default('Published'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const institutionalPolicies = pgTable('institutional_policies', {
  id: text('id').primaryKey(),
  schoolId: text('school_id').notNull(),
  policyName: text('policy_name').notNull(),
  rules: jsonb('rules').default({}),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 11. EXAM RECORDS & MARKS
export const examRecords = pgTable('exam_records', {
  id: text('id').primaryKey(),
  schoolId: text('school_id').notNull(),
  examId: text('exam_id'),
  studentId: text('student_id'),
  regNo: text('reg_no'),
  studentName: text('student_name'),
  className: text('class_name'),
  examName: text('exam_name'),
  subjectMarks: jsonb('subject_marks').default({}),
  totalMarks: numeric('total_marks').default('0'),
  averageScore: numeric('average_score').default('0'),
  division: text('division').default('Division I'),
  points: integer('points').default(15),
  rank: integer('rank').default(1),
  createdAt: timestamp('created_at').defaultNow(),
});

export const disciplineRecords = pgTable('discipline_records', {
  id: text('id').primaryKey(),
  schoolId: text('school_id').notNull(),
  regNo: text('reg_no'),
  studentName: text('student_name'),
  incidentDate: date('incident_date'),
  incidentType: text('incident_type'),
  severity: text('severity').default('Minor'),
  actionTaken: text('action_taken'),
  reportedBy: text('reported_by'),
  status: text('status').default('Open'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 12. FINANCE & STUDENT LEDGER
export const contributionTypes = pgTable('contribution_types', {
  id: text('id').primaryKey(),
  schoolId: text('school_id').notNull(),
  name: text('name').notNull(),
  amountDefault: numeric('amount_default').default('0'),
  classLevels: jsonb('class_levels').default([]),
  academicYear: text('academic_year').default('2026'),
  term: text('term').default('Term 1 / 2026'),
  createdBy: text('created_by').default('Super Admin'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const studentLedger = pgTable('student_ledger', {
  id: text('id').primaryKey(),
  schoolId: text('school_id').notNull(),
  studentCno: text('student_cno').notNull(),
  studentName: text('student_name').notNull(),
  classLevel: text('class_level').notNull(),
  contributionTypeId: text('contribution_type_id'),
  contributionName: text('contribution_name').notNull(),
  requiredAmount: numeric('required_amount').default('0'),
  paidAmount: numeric('paid_amount').default('0'),
  balanceAmount: numeric('balance_amount').default('0'),
  status: text('status').default('UNPAID'),
  lastPaymentDate: date('last_payment_date'),
  receiptNumber: text('receipt_number'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 13. INVIGILATION TABLES
export const invigilationSessions = pgTable('invigilation_sessions', {
  id: text('id').primaryKey(),
  schoolId: text('school_id').notNull(),
  rawDate: text('raw_date'),
  date: date('date').notNull(),
  day: text('day').notNull(),
  session: text('session').notNull(),
  startTime: text('start_time').notNull(),
  endTime: text('end_time').notNull(),
  timeSlot: text('time_slot'),
  subject: text('subject').notNull(),
  level: text('level').default('CSEE'),
  className: text('class_name').notNull(),
  stream: text('stream'),
  roomsCount: integer('rooms_count').default(1),
  createdAt: timestamp('created_at').defaultNow(),
});

export const invigilationAssignments = pgTable('invigilation_assignments', {
  id: text('id').primaryKey(),
  schoolId: text('school_id').notNull(),
  sessionId: text('session_id'),
  examName: text('exam_name'),
  date: date('date').notNull(),
  roomNumber: integer('room_number').default(1),
  teacherId: integer('teacher_id'),
  teacherName: text('teacher_name').notNull(),
  role: text('role').default('Invigilator'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const invigilationSupervisors = pgTable('invigilation_supervisors', {
  id: text('id').primaryKey(),
  schoolId: text('school_id').notNull(),
  teacherId: integer('teacher_id').notNull(),
  name: text('name').notNull(),
  initial: text('initial'),
  phone: text('phone'),
  role: text('role').default('Chief Supervisor'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const selectedInvigilators = pgTable('selected_invigilators', {
  id: text('id').primaryKey(),
  schoolId: text('school_id').notNull(),
  teacherId: integer('teacher_id').notNull(),
  teacherName: text('teacher_name').notNull(),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

export const savedInvigilationRecords = pgTable('saved_invigilation_records', {
  id: text('id').primaryKey(),
  schoolId: text('school_id').notNull(),
  examName: text('exam_name').notNull(),
  academicYear: text('academic_year').default('2026'),
  term: text('term').default('Term 1'),
  dutyRoster: jsonb('duty_roster').default([]),
  createdAt: timestamp('created_at').defaultNow(),
});
