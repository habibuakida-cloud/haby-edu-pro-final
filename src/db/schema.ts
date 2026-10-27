import { pgTable, text, timestamp, uuid, jsonb, integer, numeric, date, boolean, primaryKey, unique } from 'drizzle-orm/pg-core';
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
  passwordHash: text('password_hash'),
  assignedSubjects: jsonb('assigned_subjects').default([]),
  lastLoginAt: timestamp('last_login_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
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
  pinCode: text('pin_code'),
  fingerprintTemplate: text('fingerprint_template'),
  hasBiometric: boolean('has_biometric').default(false),
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
  monitorId: text('monitor_id').references(() => users.id, { onDelete: 'set null' }),
  monitressId: text('monitress_id').references(() => users.id, { onDelete: 'set null' }),
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

export const remedialTimeSlots = pgTable('remedial_time_slots', {
  id: text('id').primaryKey(),
  schoolId: uuid('school_id').references(() => schools.id, { onDelete: 'cascade' }),
  className: text('class_name').notNull(),
  startTime: text('start_time').notNull(),
  endTime: text('end_time').notNull(),
  days: jsonb('days').default([]), // ["Monday", "Tuesday", ...]
  sessionType: text('session_type').default('Evening'),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => [
  unique('unique_remedial_slot').on(table.schoolId, table.className, table.sessionType),
]);

export const remedialGlobalSettings = pgTable('remedial_global_settings', {
  schoolId: uuid('school_id').references(() => schools.id, { onDelete: 'cascade' }).primaryKey(),
  startDate: date('start_date'),
  endDate: date('end_date'),
  defaultStartTime: text('default_start_time'),
  defaultEndTime: text('default_end_time'),
  morningStartTime: text('morning_start_time'),
  morningEndTime: text('morning_end_time'),
  updatedAt: timestamp('updated_at').defaultNow(),
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
  disciplineRecords: jsonb('discipline_records').default([]),
  dutyRosterData: jsonb('duty_roster_data').default({}),
  academicTermDates: jsonb('academic_term_dates').default({}),
  teacherAttendance: jsonb('teacher_attendance').default({}),
  staffPayroll: jsonb('staff_payroll').default({}),
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

export const parents = pgTable('parents', {
  id: uuid('id').defaultRandom().primaryKey(),
  schoolId: uuid('school_id').references(() => schools.id, { onDelete: 'cascade' }),
  phone: text('phone').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  fullName: text('full_name').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const parentStudents = pgTable('parent_students', {
  parentId: uuid('parent_id').references(() => parents.id, { onDelete: 'cascade' }).notNull(),
  studentId: uuid('student_id').references(() => students.id, { onDelete: 'cascade' }).notNull(),
}, (t) => ({
  pk: primaryKey({ columns: [t.parentId, t.studentId] }),
}));

export const announcements = pgTable('announcements', {
  id: uuid('id').defaultRandom().primaryKey(),
  schoolId: uuid('school_id').references(() => schools.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const parentMessages = pgTable('parent_messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  parentId: uuid('parent_id').references(() => parents.id, { onDelete: 'cascade' }),
  parentPhone: text('parent_phone'),
  parentName: text('parent_name'),
  studentId: uuid('student_id'),
  studentName: text('student_name'),
  message: text('message').notNull(),
  sender: text('sender').default('parent'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const schoolSubscriptions = pgTable('school_subscriptions', {
  id: uuid('id').defaultRandom().primaryKey(),
  schoolId: uuid('school_id').references(() => schools.id, { onDelete: 'cascade' }),
  trialStartedAt: timestamp('trial_started_at'),
  subscriptionExpiry: timestamp('subscription_expiry').defaultNow(),
  subscriptionType: text('subscription_type').default('TRIAL'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const schoolAdmins = pgTable('school_admins', {
  id: uuid('id').defaultRandom().primaryKey(),
  schoolId: uuid('school_id').references(() => schools.id, { onDelete: 'cascade' }),
  email: text('email').notNull(),
  fullName: text('full_name'),
  password: text('password'),
  role: text('role').default('HEADMASTER'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const remedialPaymentSettings = pgTable('remedial_payment_settings', {
  id: uuid('id').defaultRandom().primaryKey(),
  schoolId: uuid('school_id').references(() => schools.id, { onDelete: 'cascade' }),
  className: text('class_name'),
  ratePerPeriod: numeric('rate_per_period').default('5000'),
  effectiveDate: date('effective_date').defaultNow(),
});

export const sittingPlans = pgTable('sitting_plans', {
  id: uuid('id').defaultRandom().primaryKey(),
  schoolId: uuid('school_id').references(() => schools.id, { onDelete: 'cascade' }),
  roomName: text('room_name').notNull(),
  examDate: date('exam_date'),
  examSession: text('exam_session'),
  totalCandidates: integer('total_candidates').default(0),
  gridLayout: jsonb('grid_layout').default({}),
  theme: text('theme').default('navy'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const gatePassLogs = pgTable('gate_pass_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  schoolId: uuid('school_id').references(() => schools.id, { onDelete: 'cascade' }),
  studentId: uuid('student_id'),
  studentName: text('student_name'),
  regNo: text('reg_no'),
  className: text('class_name'),
  stream: text('stream'),
  type: text('type'),
  reason: text('reason'),
  officerName: text('officer_name'),
  timestamp: timestamp('timestamp').defaultNow(),
  status: text('status').default('VALID'),
  feeStatus: text('fee_status'),
});

export const periods = pgTable('periods', {
  id: uuid('id').defaultRandom().primaryKey(),
  schoolId: uuid('school_id').references(() => schools.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  startTime: text('start_time').notNull(),
  endTime: text('end_time').notNull(),
  isBreak: boolean('is_break').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

export const subjects = pgTable('subjects', {
  id: uuid('id').defaultRandom().primaryKey(),
  schoolId: uuid('school_id').references(() => schools.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  code: text('code'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const teachingLogs = pgTable('teaching_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  schoolId: uuid('school_id').references(() => schools.id, { onDelete: 'cascade' }),
  teacherId: uuid('teacher_id'),
  teacherName: text('teacher_name'),
  className: text('class_name'),
  subject: text('subject'),
  date: date('date'),
  topic: text('topic'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const authorizedStaff = pgTable('authorized_staff', {
  id: uuid('id').defaultRandom().primaryKey(),
  schoolId: uuid('school_id').references(() => schools.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  email: text('email').notNull(),
  role: text('role').default('TEACHER'),
  assignedSubjects: jsonb('assigned_subjects').default([]),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

export const environmentEquipment = pgTable('environment_equipment', {
  id: uuid('id').defaultRandom().primaryKey(),
  schoolId: uuid('school_id').references(() => schools.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  category: text('category').default('Usafi'),
  quantity: integer('quantity').default(1),
  condition: text('condition').default('Nzuri'),
  location: text('location').default('Stoo ya Mazingira'),
  purchaseDate: date('purchase_date').defaultNow(),
  addedBy: text('added_by'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const equipmentUsageLog = pgTable('equipment_usage_log', {
  id: uuid('id').defaultRandom().primaryKey(),
  schoolId: uuid('school_id').references(() => schools.id, { onDelete: 'cascade' }),
  equipmentId: uuid('equipment_id').references(() => environmentEquipment.id, { onDelete: 'cascade' }),
  usedBy: text('used_by').notNull(),
  quantityUsed: integer('quantity_used').default(1),
  purpose: text('purpose'),
  dateUsed: date('date_used').defaultNow(),
  returnedDate: date('returned_date'),
  status: text('status').default('Imetumika'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const environmentOrders = pgTable('environment_orders', {
  id: uuid('id').defaultRandom().primaryKey(),
  schoolId: uuid('school_id').references(() => schools.id, { onDelete: 'cascade' }),
  studentId: text('student_id'),
  studentName: text('student_name').notNull(),
  class: text('class').notNull(),
  stream: text('stream'),
  equipmentName: text('equipment_name').notNull(),
  quantityOrdered: integer('quantity_ordered').default(1),
  orderDate: date('order_date').defaultNow(),
  status: text('status').default('Imeagizwa'),
  notes: text('notes'),
  orderedBy: text('ordered_by'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const schoolPurchasedEquipment = pgTable('school_purchased_equipment', {
  id: uuid('id').defaultRandom().primaryKey(),
  schoolId: uuid('school_id').references(() => schools.id, { onDelete: 'cascade' }),
  equipmentName: text('equipment_name').notNull(),
  category: text('category').default('Kilimo'),
  quantityBought: integer('quantity_bought').default(1),
  unitPrice: numeric('unit_price').default('0'),
  totalCost: numeric('total_cost').default('0'),
  supplier: text('supplier'),
  purchaseDate: date('purchase_date').defaultNow(),
  receiptNumber: text('receipt_number'),
  condition: text('condition').default('Nzuri'),
  storageLocation: text('storage_location'),
  addedBy: text('added_by'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const reamPaperRecords = pgTable('ream_paper_records', {
  id: uuid('id').defaultRandom().primaryKey(),
  schoolId: uuid('school_id').references(() => schools.id, { onDelete: 'cascade' }),
  studentId: text('student_id'),
  studentName: text('student_name').notNull(),
  class: text('class').notNull(),
  stream: text('stream'),
  reamsBrought: numeric('reams_brought').default('1'),
  dateBrought: date('date_brought').defaultNow(),
  term: text('term').default('Muhula 1'),
  academicYear: text('academic_year').default('2026'),
  receivedBy: text('received_by'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const examResults = pgTable('exam_results', {
  id: uuid('id').defaultRandom().primaryKey(),
  schoolId: uuid('school_id').references(() => schools.id, { onDelete: 'cascade' }),
  studentId: uuid('student_id').references(() => students.id, { onDelete: 'cascade' }),
  subjectId: uuid('subject_id'), 
  examType: text('exam_type').notNull(), // 'MIDTERM', 'TERMINAL', 'ANNUAL'
  year: integer('year').notNull(),
  term: text('term').notNull(),
  marks: numeric('marks').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// 14. ACTIVITY LOGS & SMS WALLET / BILLING TABLES
export const activityLogs = pgTable('activity_logs', {
  id: text('id').primaryKey(),
  schoolId: text('school_id').notNull(),
  userId: text('user_id'),
  userName: text('user_name'),
  userEmail: text('user_email'),
  userRole: text('user_role'),
  category: text('category').default('General'),
  action: text('action').default('view'),
  title: text('title'),
  description: text('description'),
  timestamp: text('timestamp'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const smsWallet = pgTable('sms_wallet', {
  id: uuid('id').defaultRandom().primaryKey(),
  schoolId: text('school_id').notNull().unique(),
  balance: integer('balance').default(500),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const smsLogs = pgTable('sms_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  schoolId: text('school_id').notNull(),
  studentCno: text('student_cno'),
  phone: text('phone'),
  message: text('message'),
  status: text('status').default('SENT'),
  error: text('error'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const smsPaymentHistory = pgTable('sms_payment_history', {
  id: uuid('id').defaultRandom().primaryKey(),
  schoolId: text('school_id').notNull(),
  packageName: text('package_name'),
  amount: numeric('amount').default('0'),
  smsAdded: integer('sms_added').default(0),
  provider: text('provider'),
  phone: text('phone'),
  status: text('status').default('SUCCESS'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const paymentVerificationRequests = pgTable('payment_verification_requests', {
  id: uuid('id').defaultRandom().primaryKey(),
  schoolId: text('school_id').notNull(),
  packageName: text('package_name'),
  amount: numeric('amount').default('0'),
  smsAdded: integer('sms_added').default(0),
  phone: text('phone'),
  transactionRef: text('transaction_ref'),
  status: text('status').default('PENDING'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 15. TEACHER DUTY ROSTER SYSTEM (MFUMO WA ZAMU YA WALIMU)
export const dutyStreams = pgTable('duty_streams', {
  id: text('id').primaryKey(),
  schoolId: text('school_id').notNull(),
  streamName: text('stream_name').notNull(),
  totalStudents: integer('total_students').default(0),
  classTeacher: text('class_teacher'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const dutyWeeklyAssignments = pgTable('duty_weekly_assignments', {
  id: text('id').primaryKey(),
  schoolId: text('school_id').notNull(),
  weekStart: text('week_start').notNull(),
  weekEnd: text('week_end').notNull(),
  weekLabel: text('week_label').notNull(),
  teacherIds: jsonb('teacher_ids').default([]),
  teacherNames: jsonb('teacher_names').default([]),
  notes: text('notes'),
  assignedBy: text('assigned_by').default('Discipline Master'),
  status: text('status').default('Active'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const dutyDailyReports = pgTable('duty_daily_reports', {
  id: text('id').primaryKey(),
  schoolId: text('school_id').notNull(),
  weekAssignmentId: text('week_assignment_id'),
  weekStart: text('week_start'),
  weekEnd: text('week_end'),
  weekLabel: text('week_label'),
  reportDate: text('report_date').notNull(),
  dayName: text('day_name'),
  teacherId: text('teacher_id'),
  teacherName: text('teacher_name').notNull(),
  allWeekTeachers: jsonb('all_week_teachers').default([]),
  streamAttendance: jsonb('stream_attendance').default([]),
  totalSchoolRoll: integer('total_school_roll').default(0),
  totalPresent: integer('total_present').default(0),
  totalAbsent: integer('total_absent').default(0),
  totalPermitted: integer('total_permitted').default(0),
  totalSickPua: integer('total_sick_pua').default(0),
  totalUnexcused: integer('total_unexcused').default(0),
  environmentRating: integer('environment_rating').default(8),
  environmentNotes: text('environment_notes'),
  generalDiscipline: text('general_discipline'),
  teachersPresent: integer('teachers_present').default(0),
  teachersAbsent: integer('teachers_absent').default(0),
  teacherAttendanceNotes: text('teacher_attendance_notes'),
  keyEvents: text('key_events'),
  bellSchedule: text('bell_schedule'),
  recommendations: text('recommendations'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});


export const curriculumStandards = pgTable('curriculum_standards', {
  id: uuid('id').defaultRandom().primaryKey(),
  schoolId: uuid('school_id').references(() => schools.id, { onDelete: 'cascade' }),
  subjectName: text('subject_name').notNull(),
  level: text('level').notNull(), // Form 1, Form 2, etc
  curriculumType: text('curriculum_type').notNull(), // 'NEW_2023', 'OLD'
  topic: text('topic').notNull(),
  subTopic: text('sub_topic'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const pastPapers = pgTable('past_papers', {
  id: uuid('id').defaultRandom().primaryKey(),
  schoolId: uuid('school_id').references(() => schools.id, { onDelete: 'cascade' }),
  subjectName: text('subject_name').notNull(),
  level: text('level').notNull(),
  year: integer('year').notNull(),
  examType: text('exam_type').notNull(), // 'CSEE', 'ACSEE', 'PSLE', 'MIDTERM'
  paperType: text('paper_type').default('Paper 1'), // Paper 1, Paper 2, etc.
  fileUrl: text('file_url').notNull(),
  markingSchemeUrl: text('marking_scheme_url'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 16. TEACHER ATTENDANCE & STAFF PAYROLL TABLES
export const teacherAttendance = pgTable('teacher_attendance', {
  id: text('id').primaryKey(),
  schoolId: text('school_id').notNull(),
  teacherId: integer('teacher_id').notNull(),
  teacherName: text('teacher_name').notNull(),
  schoolRole: text('school_role').default('Subject Teacher'),
  date: date('date').notNull(),
  dayOfWeek: text('day_of_week').notNull(),
  status: text('status').default('PRESENT'),
  checkInTime: text('check_in_time').default('07:30'),
  checkOutTime: text('check_out_time').default('15:30'),
  remarks: text('remarks'),
  markedBy: text('marked_by').default('Admin'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const staffPayroll = pgTable('staff_payroll', {
  id: text('id').primaryKey(),
  schoolId: text('school_id').notNull(),
  teacherId: integer('teacher_id').notNull(),
  teacherName: text('teacher_name').notNull(),
  schoolRole: text('school_role').default('Subject Teacher'),
  monthYear: text('month_year').notNull(),
  basicSalary: numeric('basic_salary').default('0'),
  housingAllowance: numeric('housing_allowance').default('0'),
  transportAllowance: numeric('transport_allowance').default('0'),
  responsibilityAllowance: numeric('responsibility_allowance').default('0'),
  bonusAmount: numeric('bonus_amount').default('0'),
  bonusReason: text('bonus_reason'),
  workingDays: integer('working_days').default(22),
  daysPresent: integer('days_present').default(22),
  daysLate: integer('days_late').default(0),
  daysExcused: integer('days_excused').default(0),
  daysAbsent: integer('days_absent').default(0),
  attendanceDeduction: numeric('attendance_deduction').default('0'),
  taxDeduction: numeric('tax_deduction').default('0'),
  nssfDeduction: numeric('nssf_deduction').default('0'),
  healthInsurance: numeric('health_insurance').default('0'),
  loanAdvanceDeduction: numeric('loan_advance_deduction').default('0'),
  grossSalary: numeric('gross_salary').default('0'),
  totalDeductions: numeric('total_deductions').default('0'),
  netSalary: numeric('net_salary').default('0'),
  paymentStatus: text('payment_status').default('PENDING'),
  paymentMethod: text('payment_method').default('Bank Transfer'),
  bankName: text('bank_name'),
  bankAccount: text('bank_account'),
  paidAt: text('paid_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 17. CLASS JOURNALS (MFUMO WA MONITOR)
export const classJournals = pgTable('class_journals', {
  id: uuid('id').defaultRandom().primaryKey(),
  schoolId: uuid('school_id').references(() => schools.id, { onDelete: 'cascade' }),
  teacherId: uuid('teacher_id').references(() => teachers.id, { onDelete: 'cascade' }),
  teacherName: text('teacher_name'),
  monitorId: text('monitor_id').notNull(),
  className: text('class_name').notNull(),
  stream: text('stream'),
  subject: text('subject').notNull(),
  mainTopic: text('main_topic'),
  subTopic: text('sub_topic'),
  period: integer('period'),
  periodName: text('period_name'),
  timeIn: timestamp('time_in').notNull(),
  timeOut: timestamp('time_out'),
  method: text('method').notNull(), // 'usb_scanner' or 'phone_pin'
  presentCount: integer('present_count').default(0),
  absentCount: integer('absent_count').default(0),
  sickCount: integer('sick_count').default(0),
  permittedCount: integer('permitted_count').default(0),
  date: text('date'), // YYYY-MM-DD
  academicWeek: integer('academic_week'),
  term: text('term'),
  isOffline: boolean('is_offline').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

// 18. ELECTION EVENTS (STUDENT GOVERNMENT ELECTIONS - DISCIPLINE DEPARTMENT)
export const electionEvents = pgTable('election_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  schoolId: uuid('school_id').references(() => schools.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  academicYear: text('academic_year').notNull(),
  nominationStart: timestamp('nomination_start').notNull(),
  nominationEnd: timestamp('nomination_end').notNull(),
  votingStart: timestamp('voting_start').notNull(),
  votingEnd: timestamp('voting_end').notNull(),
  status: text('status').default('DRAFT'), // 'DRAFT', 'NOMINATION_OPEN', 'VOTING_OPEN', 'CLOSED', 'RESULTS_PUBLISHED'
  createdByDisciplineHead: text('created_by_discipline_head'),
  resultsPublishedAt: timestamp('results_published_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 19. ELECTION POSITIONS (VIONGOZI WA SERIKALI YA WANAFUNZI)
export const electionPositions = pgTable('election_positions', {
  id: uuid('id').defaultRandom().primaryKey(),
  electionId: uuid('election_id').references(() => electionEvents.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  genderRule: text('gender_rule').default('ALL'), // 'ALL', 'BOYS_ONLY', 'GIRLS_ONLY'
  classRule: text('class_rule').default('ALL'), // 'ALL', 'FORM_3_4', 'FORM_1_2', 'FORM_5_6', etc.
  orderNumber: integer('order_number').default(1),
  isCustom: boolean('is_custom').default(false),
  photoRequired: boolean('photo_required').default(true),
  manifestoRequired: boolean('manifesto_required').default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

// 20. ELECTION CANDIDATES (WAGOMBEA)
export const electionCandidates = pgTable('election_candidates', {
  id: uuid('id').defaultRandom().primaryKey(),
  electionId: uuid('election_id').references(() => electionEvents.id, { onDelete: 'cascade' }),
  positionId: uuid('position_id').references(() => electionPositions.id, { onDelete: 'cascade' }),
  studentId: text('student_id').notNull(),
  studentName: text('student_name').notNull(),
  studentClass: text('student_class').notNull(),
  studentGender: text('student_gender').default('Male'),
  manifestoText: text('manifesto_text'),
  manifestoVideoUrl: text('manifesto_video_url'),
  photoUrl: text('photo_url'),
  status: text('status').default('PENDING'), // 'PENDING', 'APPROVED', 'REJECTED'
  rejectionReason: text('rejection_reason'),
  reviewedBy: text('reviewed_by'),
  votesCount: integer('votes_count').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 21. ELECTION VOTES (KURA ZILIZOPIGWA - ONE VOTE PER POSITION PER STUDENT)
export const electionVotes = pgTable('election_votes', {
  id: uuid('id').defaultRandom().primaryKey(),
  electionId: uuid('election_id').references(() => electionEvents.id, { onDelete: 'cascade' }),
  voterStudentId: text('voter_student_id').notNull(),
  positionId: uuid('position_id').references(() => electionPositions.id, { onDelete: 'cascade' }),
  candidateId: uuid('candidate_id').references(() => electionCandidates.id, { onDelete: 'cascade' }),
  votedAt: timestamp('voted_at').defaultNow(),
  ipAddress: text('ip_address'),
  deviceId: text('device_id'),
  verificationMethod: text('verification_method').default('PORTAL_AUTH'), // 'PIN', 'FINGERPRINT', 'PORTAL_AUTH'
}, (table) => [
  unique('unique_voter_position_election').on(table.electionId, table.voterStudentId, table.positionId),
]);

// 22. JOINT EXAMINATIONS (MITIHANI YA PAMOJA YA SHULE 2 AU ZAIDI)
export const jointExams = pgTable('joint_exams', {
  id: uuid('id').defaultRandom().primaryKey(),
  schoolId: uuid('school_id').references(() => schools.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  examDate: text('exam_date').notNull(),
  className: text('class_name').default('Form 4'),
  level: text('level').default('CSEE'), // 'FTNA', 'CSEE', 'ACSEE'
  subjects: jsonb('subjects').default([]).notNull(), // string[] e.g. ["CIVICS", "HISTORY", "GEOGRAPHY", ...]
  status: text('status').default('ACTIVE'), // 'ACTIVE', 'PUBLISHED', 'LOCKED'
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 23. JOINT PARTICIPATING SCHOOLS (SHULE ZINAZOSHIRIKI MTIHANI WA PAMOJA)
export const jointSchools = pgTable('joint_schools', {
  id: uuid('id').defaultRandom().primaryKey(),
  jointExamId: uuid('joint_exam_id').references(() => jointExams.id, { onDelete: 'cascade' }).notNull(),
  schoolCode: text('school_code').notNull(), // e.g. S0101, S0204
  schoolName: text('school_name').notNull(),
  hexColor: text('hex_color').default('#1E40AF').notNull(), // e.g. #1E40AF, #047857, #B91C1C
  region: text('region'),
  district: text('district'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 24. JOINT EXAMINATION RESULTS (MATOKEO YA WANAFUNZI WA SHULE ZINAZOSHIRIKI)
export const jointResults = pgTable('joint_results', {
  id: uuid('id').defaultRandom().primaryKey(),
  jointExamId: uuid('joint_exam_id').references(() => jointExams.id, { onDelete: 'cascade' }).notNull(),
  jointSchoolId: uuid('joint_school_id').references(() => jointSchools.id, { onDelete: 'cascade' }).notNull(),
  studentName: text('student_name').notNull(),
  regNo: text('reg_no').notNull(),
  gender: text('gender').default('M'), // 'M' or 'F'
  stream: text('stream').default('A'),
  subjectMarks: jsonb('subject_marks').default({}).notNull(), // { [subject: string]: number }
  subjectGrades: jsonb('subject_grades').default({}), // { [subject: string]: string }
  subjectsSat: integer('subjects_sat').default(0),
  totalMarks: numeric('total_marks').default('0'),
  averageScore: numeric('average_score').default('0'),
  overallGrade: text('overall_grade').default('F'),
  best7Points: integer('best_7_points'), // null if < 7 subjects
  division: text('division').default('-'), // 'I', 'II', 'III', 'IV', '0', or '-' when < 7 subjects
  schoolRank: integer('school_rank').default(1),
  overallRank: integer('overall_rank').default(1),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
