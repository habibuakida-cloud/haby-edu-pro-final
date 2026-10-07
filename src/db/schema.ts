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

// 2. USERS (Integrated with Firebase Auth UID)
export const users = pgTable('users', {
  id: text('id').primaryKey(), // Firebase UID
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
}));

export const usersRelations = relations(users, ({ one }) => ({
  school: one(schools, {
    fields: [users.schoolId],
    references: [schools.id],
  }),
}));
