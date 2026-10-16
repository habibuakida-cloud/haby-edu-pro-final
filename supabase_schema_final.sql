-- ==============================================================================
-- HABY EDU PRO - SUPABASE PRODUCTION DATABASE SCHEMA & MIGRATION
-- Project: rdrmptcdxtdjblaqsxjy.supabase.co
-- Region: eu-west-1
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor > New query)
-- ==============================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. SCHOOLS TABLE (Idempotent: Creates if missing, adds columns if missing)
CREATE TABLE IF NOT EXISTS public.schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT,
  district TEXT,
  region TEXT,
  phone TEXT,
  email TEXT,
  status TEXT DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure Kiomoni Secondary School exists
INSERT INTO public.schools (id, name, code, district, status)
VALUES ('02dff10d-78fb-4af6-ab5a-db1d275d7e06', 'KIOMONI SECONDARY SCHOOL', 'KIOMONI-01', 'Tanga', 'ACTIVE')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  code = EXCLUDED.code,
  district = EXCLUDED.district;

-- 3. USERS TABLE
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  role TEXT DEFAULT 'TEACHER',
  school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add optional user columns
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS school_id UUID;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS password TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT FALSE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS assigned_subjects JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

-- Ensure Super Admin is linked to Kiomoni Secondary School
UPDATE public.users 
SET 
  school_id = '02dff10d-78fb-4af6-ab5a-db1d275d7e06',
  full_name = 'Mwl. Habibu Akida (Super Admin)',
  role = 'super_admin'
WHERE email = 'habibuakida@gmail.com';

-- 4. STUDENTS TABLE (Enhance existing table with all features)
CREATE TABLE IF NOT EXISTS public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID,
  name TEXT NOT NULL,
  class TEXT NOT NULL,
  stream TEXT,
  gender TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.students ADD COLUMN IF NOT EXISTS parent_phone TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS reg_no TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS level TEXT DEFAULT 'CSEE';
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS dob DATE;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS passport_photo TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS subjects JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS marks JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS total NUMERIC DEFAULT 0;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS average TEXT DEFAULT '0.0';
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS division TEXT DEFAULT '-';

-- 5. TEACHERS TABLE (Enhance existing table)
CREATE TABLE IF NOT EXISTS public.teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID,
  name TEXT NOT NULL,
  subject TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS gender TEXT DEFAULT 'Male';
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS school_role TEXT DEFAULT 'Subject Teacher';
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS initial TEXT;
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS subjects JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS teaching_streams JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#1d4ed8';
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS max_periods_per_week INTEGER DEFAULT 20;
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS exclude_invigilation BOOLEAN DEFAULT FALSE;

-- 6. EXAMS TABLE (Enhance existing table)
CREATE TABLE IF NOT EXISTS public.exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID,
  name TEXT NOT NULL,
  term TEXT,
  year TEXT,
  class TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS level TEXT DEFAULT 'CSEE';
ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS date DATE;
ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Active';

-- 7. EXAM RECORDS TABLE (Master Ledger for Printable A4 Results)
CREATE TABLE IF NOT EXISTS public.exam_records (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL,
  student_id TEXT,
  reg_no TEXT,
  student_name TEXT NOT NULL,
  class_name TEXT NOT NULL,
  level TEXT NOT NULL,
  exam_id TEXT,
  exam_name TEXT NOT NULL,
  exam_type TEXT NOT NULL,
  term TEXT,
  year TEXT,
  marks JSONB DEFAULT '{}'::jsonb,
  total NUMERIC DEFAULT 0,
  average NUMERIC DEFAULT 0,
  division TEXT,
  points INTEGER,
  gpa TEXT,
  rank INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. USAL RECORDS TABLE (Continuous Assessment)
CREATE TABLE IF NOT EXISTS public.usal_records (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL,
  student_id TEXT,
  exam_id TEXT,
  subject TEXT NOT NULL,
  test_1 NUMERIC,
  test_2 NUMERIC,
  midterm NUMERIC,
  project NUMERIC,
  terminal NUMERIC,
  final_score NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. SITTING PLANS TABLE (Examination Hall Layouts)
CREATE TABLE IF NOT EXISTS public.sitting_plans (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL,
  room_name TEXT NOT NULL,
  exam_date DATE,
  exam_session TEXT,
  total_candidates INTEGER DEFAULT 0,
  grid_layout JSONB DEFAULT '{}'::jsonb,
  theme TEXT DEFAULT 'navy',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. SCHOOL DATA (Complete state snapshot for durable multi-tenant sync)
CREATE TABLE IF NOT EXISTS public.school_data (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL UNIQUE,
  school_info JSONB DEFAULT '{}'::jsonb,
  "bubbleSettings" JSONB DEFAULT '{"count":12,"opacity":0.35,"colorPalette":"vibrant","enabled":true}'::jsonb,
  bubble_settings JSONB DEFAULT '{"count":12,"opacity":0.35,"colorPalette":"vibrant","enabled":true}'::jsonb,
  students JSONB DEFAULT '[]'::jsonb,
  teachers JSONB DEFAULT '[]'::jsonb,
  exams JSONB DEFAULT '[]'::jsonb,
  examination_records JSONB DEFAULT '[]'::jsonb,
  timetable_assignments JSONB DEFAULT '[]'::jsonb,
  "timetableAssignments" JSONB DEFAULT '[]'::jsonb,
  period_settings JSONB DEFAULT '[]'::jsonb,
  "periodSettings" JSONB DEFAULT '[]'::jsonb,
  stream_settings JSONB DEFAULT '[]'::jsonb,
  "streamSettings" JSONB DEFAULT '[]'::jsonb,
  institutional_policy JSONB DEFAULT '{}'::jsonb,
  "institutionalPolicy" JSONB DEFAULT '{}'::jsonb,
  sessions JSONB DEFAULT '[]'::jsonb,
  supervisors JSONB DEFAULT '[]'::jsonb,
  selected_invigilators JSONB DEFAULT '[]'::jsonb,
  invigilation_assignments JSONB DEFAULT '{}'::jsonb,
  activity_logs JSONB DEFAULT '[]'::jsonb,
  discipline_records JSONB DEFAULT '[]'::jsonb,
  daily_attendance JSONB DEFAULT '{}'::jsonb,
  "dailyAttendance" JSONB DEFAULT '{}'::jsonb,
  schemes_of_work JSONB DEFAULT '[]'::jsonb,
  "schemesOfWork" JSONB DEFAULT '[]'::jsonb,
  lesson_plans JSONB DEFAULT '[]'::jsonb,
  "lessonPlans" JSONB DEFAULT '[]'::jsonb,
  teacher_evaluations JSONB DEFAULT '[]'::jsonb,
  "teacherEvaluations" JSONB DEFAULT '[]'::jsonb,
  saved_timetable_records JSONB DEFAULT '[]'::jsonb,
  "savedTimetableRecords" JSONB DEFAULT '[]'::jsonb,
  saved_invigilation_records JSONB DEFAULT '[]'::jsonb,
  "savedInvigilationRecords" JSONB DEFAULT '[]'::jsonb,
  grade_cutoffs JSONB DEFAULT '{}'::jsonb,
  "gradeCutoffs" JSONB DEFAULT '{}'::jsonb,
  ledger_subject_keys JSONB DEFAULT '{}'::jsonb,
  "ledgerSubjectKeys" JSONB DEFAULT '{}'::jsonb,
  subject_period_allocations JSONB DEFAULT '[]'::jsonb,
  "subjectPeriodAllocations" JSONB DEFAULT '[]'::jsonb,
  teacher_assignments JSONB DEFAULT '[]'::jsonb,
  "teacherAssignments" JSONB DEFAULT '[]'::jsonb,
  subject_paper_configs JSONB DEFAULT '{}'::jsonb,
  "subjectPaperConfigs" JSONB DEFAULT '{}'::jsonb,
  data JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.school_data ADD COLUMN IF NOT EXISTS "bubbleSettings" JSONB DEFAULT '{"count":12,"opacity":0.35,"colorPalette":"vibrant","enabled":true}'::jsonb;
ALTER TABLE public.school_data ADD COLUMN IF NOT EXISTS bubble_settings JSONB DEFAULT '{"count":12,"opacity":0.35,"colorPalette":"vibrant","enabled":true}'::jsonb;

-- 11. PARENTS PORTAL TABLES
CREATE TABLE IF NOT EXISTS public.parents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
  phone TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.parent_students (
  parent_id UUID REFERENCES public.parents(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  PRIMARY KEY (parent_id, student_id)
);

CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id REFERENCES public.schools(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.parent_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID REFERENCES public.parents(id) ON DELETE CASCADE,
  parent_phone TEXT,
  parent_name TEXT,
  student_id UUID,
  student_name TEXT,
  message TEXT NOT NULL,
  sender TEXT DEFAULT 'parent',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. REMEDIAL PAYMENT MODULE TABLES & SUBSCRIPTIONS
CREATE TABLE IF NOT EXISTS public.school_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
  "schoolId" TEXT,
  trial_started_at TIMESTAMPTZ,
  "trialStartedAt" TIMESTAMPTZ,
  subscription_expiry TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
  "subscriptionExpiry" TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
  subscription_type TEXT DEFAULT 'TRIAL',
  "subscriptionType" TEXT DEFAULT 'TRIAL',
  is_active BOOLEAN DEFAULT TRUE,
  "isActive" BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.school_subscriptions ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN DEFAULT TRUE;
ALTER TABLE public.school_subscriptions ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE public.school_subscriptions ADD COLUMN IF NOT EXISTS "subscriptionExpiry" TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days');
ALTER TABLE public.school_subscriptions ADD COLUMN IF NOT EXISTS subscription_expiry TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days');
ALTER TABLE public.school_subscriptions ADD COLUMN IF NOT EXISTS "trialStartedAt" TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.school_subscriptions ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.school_subscriptions ADD COLUMN IF NOT EXISTS "subscriptionType" TEXT DEFAULT 'TRIAL';
ALTER TABLE public.school_subscriptions ADD COLUMN IF NOT EXISTS subscription_type TEXT DEFAULT 'TRIAL';
ALTER TABLE public.school_subscriptions ADD COLUMN IF NOT EXISTS "schoolId" TEXT;
ALTER TABLE public.school_subscriptions ADD COLUMN IF NOT EXISTS school_id UUID;

-- SCHOOL ADMINS TABLE
CREATE TABLE IF NOT EXISTS public.school_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'HEADMASTER',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.school_admins ADD COLUMN IF NOT EXISTS school_id UUID;
ALTER TABLE public.school_admins ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.school_admins ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'HEADMASTER';
ALTER TABLE public.school_admins ADD COLUMN IF NOT EXISTS email TEXT;

CREATE TABLE IF NOT EXISTS public.remedial_timetable (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
  day_of_week TEXT NOT NULL,
  period_time TEXT NOT NULL,
  class_name TEXT NOT NULL,
  subject TEXT NOT NULL,
  teacher_name TEXT NOT NULL,
  stream TEXT DEFAULT 'A',
  term TEXT DEFAULT 'Term 1',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.remedial_attendance (
  id TEXT PRIMARY KEY, -- Composite: school_id_date_time_class
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  day_of_week TEXT NOT NULL,
  period_time TEXT NOT NULL,
  class_name TEXT NOT NULL,
  subject TEXT,
  teacher_name TEXT,
  stream TEXT,
  status TEXT DEFAULT 'taught',
  rate_per_period NUMERIC DEFAULT 5000,
  marked_by TEXT,
  marked_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.remedial_payment_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
  class_name TEXT,
  rate_per_period NUMERIC DEFAULT 5000,
  effective_date DATE DEFAULT CURRENT_DATE
);

-- 13. DISCIPLINE RECORDS TABLE
CREATE TABLE IF NOT EXISTS public.discipline_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  student_name TEXT,
  incident_type TEXT,
  description TEXT,
  action_taken TEXT,
  severity TEXT,
  date DATE DEFAULT CURRENT_DATE,
  reported_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. ACTIVITY LOGS TABLE
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
  user_email TEXT,
  action TEXT,
  category TEXT,
  target_name TEXT,
  details TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- 15. GATE PASS LOGS TABLE
CREATE TABLE IF NOT EXISTS public.gate_pass_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id UUID,
  student_name TEXT,
  reg_no TEXT,
  class_name TEXT,
  stream TEXT,
  type TEXT, -- CHECK_IN, CHECK_OUT
  reason TEXT,
  officer_name TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'VALID',
  fee_status TEXT
);

-- 16. ADDITIONAL ESSENTIAL TABLES (classes, periods, subjects, teaching_logs, authorized_staff, contribution_types, student_ledger, period_attendance)
CREATE TABLE IF NOT EXISTS public.classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  level TEXT DEFAULT 'CSEE',
  stream TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  is_break BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.teaching_logs (
  id TEXT PRIMARY KEY,
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
  teacher_id TEXT,
  teacher_name TEXT,
  class_name TEXT,
  subject TEXT,
  date DATE,
  topic TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.authorized_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT DEFAULT 'TEACHER',
  assigned_subjects JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.contribution_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount NUMERIC DEFAULT 0,
  term TEXT,
  academic_year TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.student_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id UUID,
  student_name TEXT,
  contribution_id UUID,
  amount_paid NUMERIC DEFAULT 0,
  balance NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'PENDING',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.period_attendance (
  id TEXT PRIMARY KEY,
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  class_name TEXT NOT NULL,
  stream TEXT,
  period_number INTEGER,
  subject TEXT,
  teacher_name TEXT,
  status TEXT DEFAULT 'present',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 17. ENVIRONMENT EQUIPMENT & USAGE LOGS TABLES
CREATE TABLE IF NOT EXISTS public.environment_equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Usafi',
  quantity INTEGER NOT NULL DEFAULT 1,
  condition TEXT NOT NULL DEFAULT 'Nzuri',
  location TEXT DEFAULT 'Stoo ya Mazingira',
  purchase_date DATE DEFAULT CURRENT_DATE,
  added_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.equipment_usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
  equipment_id UUID REFERENCES public.environment_equipment(id) ON DELETE CASCADE,
  used_by TEXT NOT NULL,
  quantity_used INTEGER NOT NULL DEFAULT 1,
  purpose TEXT,
  date_used DATE DEFAULT CURRENT_DATE,
  returned_date DATE,
  status TEXT DEFAULT 'Imetumika',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.environment_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id TEXT,
  student_name TEXT NOT NULL,
  class TEXT NOT NULL,
  stream TEXT,
  equipment_name TEXT NOT NULL,
  quantity_ordered INTEGER NOT NULL DEFAULT 1,
  order_date DATE DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'Imeagizwa',
  notes TEXT,
  ordered_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.school_purchased_equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
  equipment_name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Kilimo',
  quantity_bought INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(12,2) DEFAULT 0,
  total_cost NUMERIC(12,2) DEFAULT 0,
  supplier TEXT,
  purchase_date DATE DEFAULT CURRENT_DATE,
  receipt_number TEXT,
  condition TEXT DEFAULT 'Nzuri',
  storage_location TEXT,
  added_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ream_paper_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id TEXT,
  student_name TEXT NOT NULL,
  class TEXT NOT NULL,
  stream TEXT,
  reams_brought NUMERIC(5,2) NOT NULL DEFAULT 1,
  date_brought DATE DEFAULT CURRENT_DATE,
  term TEXT DEFAULT 'Muhula 1',
  academic_year TEXT DEFAULT '2026',
  received_by TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure Unique Index on school_subscriptions for school_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_school_subscriptions_school_id ON public.school_subscriptions(school_id);

-- 18. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usal_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sitting_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.remedial_timetable ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.remedial_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.remedial_payment_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discipline_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gate_pass_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teaching_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.authorized_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contribution_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.period_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.environment_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_usage_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.environment_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_purchased_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ream_paper_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public all access on schools" ON public.schools FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all access on users" ON public.users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all access on students" ON public.students FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all access on teachers" ON public.teachers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all access on exams" ON public.exams FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all access on exam_records" ON public.exam_records FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all access on usal_records" ON public.usal_records FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all access on sitting_plans" ON public.sitting_plans FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all access on school_data" ON public.school_data FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all access on school_subscriptions" ON public.school_subscriptions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all access on school_admins" ON public.school_admins FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all access on parents" ON public.parents FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all access on parent_students" ON public.parent_students FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all access on announcements" ON public.announcements FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all access on parent_messages" ON public.parent_messages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all access on remedial_timetable" ON public.remedial_timetable FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all access on remedial_attendance" ON public.remedial_attendance FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all access on remedial_payment_settings" ON public.remedial_payment_settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all access on discipline_records" ON public.discipline_records FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all access on activity_logs" ON public.activity_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all access on gate_pass_logs" ON public.gate_pass_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all access on classes" ON public.classes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all access on periods" ON public.periods FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all access on subjects" ON public.subjects FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all access on teaching_logs" ON public.teaching_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all access on authorized_staff" ON public.authorized_staff FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all access on contribution_types" ON public.contribution_types FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all access on student_ledger" ON public.student_ledger FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all access on period_attendance" ON public.period_attendance FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all access on environment_equipment" ON public.environment_equipment FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all access on equipment_usage_log" ON public.equipment_usage_log FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all access on environment_orders" ON public.environment_orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all access on school_purchased_equipment" ON public.school_purchased_equipment FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all access on ream_paper_records" ON public.ream_paper_records FOR ALL USING (true) WITH CHECK (true);

-- 17. HIGH SPEED PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_students_school ON public.students(school_id);
CREATE INDEX IF NOT EXISTS idx_teachers_school ON public.teachers(school_id);
CREATE INDEX IF NOT EXISTS idx_exams_school ON public.exams(school_id);
CREATE INDEX IF NOT EXISTS idx_exam_records_school ON public.exam_records(school_id);
CREATE INDEX IF NOT EXISTS idx_users_school ON public.users(school_id);
CREATE INDEX IF NOT EXISTS idx_parents_phone ON public.parents(phone);
CREATE INDEX IF NOT EXISTS idx_remedial_tt_school ON public.remedial_timetable(school_id);
CREATE INDEX IF NOT EXISTS idx_remedial_att_school ON public.remedial_attendance(school_id, date);
CREATE INDEX IF NOT EXISTS idx_activity_logs_school ON public.activity_logs(school_id);
CREATE INDEX IF NOT EXISTS idx_discipline_school ON public.discipline_records(school_id);
CREATE INDEX IF NOT EXISTS idx_environment_equipment_school ON public.environment_equipment(school_id);
CREATE INDEX IF NOT EXISTS idx_equipment_usage_log_school ON public.equipment_usage_log(school_id);
CREATE INDEX IF NOT EXISTS idx_environment_orders_school ON public.environment_orders(school_id);
CREATE INDEX IF NOT EXISTS idx_school_purchased_equipment_school ON public.school_purchased_equipment(school_id);
CREATE INDEX IF NOT EXISTS idx_ream_paper_records_school ON public.ream_paper_records(school_id);

-- 18. NOTIFY POSTGREST SCHEMA CACHE RELOAD
NOTIFY pgrst, 'reload schema';
