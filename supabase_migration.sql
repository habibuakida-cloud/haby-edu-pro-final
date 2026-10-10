CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

/* 1. SCHOOL_SUBSCRIPTIONS */
CREATE TABLE IF NOT EXISTS public.school_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
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
ALTER TABLE public.school_subscriptions ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE;

/* 2. SCHOOL_DATA */
CREATE TABLE IF NOT EXISTS public.school_data (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.school_data ADD COLUMN IF NOT EXISTS "bubbleSettings" JSONB DEFAULT '{"count":12,"opacity":0.35,"colorPalette":"vibrant","enabled":true}'::jsonb;
ALTER TABLE public.school_data ADD COLUMN IF NOT EXISTS bubble_settings JSONB DEFAULT '{"count":12,"opacity":0.35,"colorPalette":"vibrant","enabled":true}'::jsonb;
ALTER TABLE public.school_data ADD COLUMN IF NOT EXISTS "timetableAssignments" JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.school_data ADD COLUMN IF NOT EXISTS timetable_assignments JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.school_data ADD COLUMN IF NOT EXISTS "periodSettings" JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.school_data ADD COLUMN IF NOT EXISTS period_settings JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.school_data ADD COLUMN IF NOT EXISTS "streamSettings" JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.school_data ADD COLUMN IF NOT EXISTS stream_settings JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.school_data ADD COLUMN IF NOT EXISTS "institutionalPolicy" JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.school_data ADD COLUMN IF NOT EXISTS institutional_policy JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.school_data ADD COLUMN IF NOT EXISTS "dailyAttendance" JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.school_data ADD COLUMN IF NOT EXISTS daily_attendance JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.school_data ADD COLUMN IF NOT EXISTS "journalRecords" JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.school_data ADD COLUMN IF NOT EXISTS journal_records JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.school_data ADD COLUMN IF NOT EXISTS "schemesOfWork" JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.school_data ADD COLUMN IF NOT EXISTS schemes_of_work JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.school_data ADD COLUMN IF NOT EXISTS "lessonPlans" JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.school_data ADD COLUMN IF NOT EXISTS lesson_plans JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.school_data ADD COLUMN IF NOT EXISTS "teacherEvaluations" JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.school_data ADD COLUMN IF NOT EXISTS teacher_evaluations JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.school_data ADD COLUMN IF NOT EXISTS "savedTimetableRecords" JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.school_data ADD COLUMN IF NOT EXISTS saved_timetable_records JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.school_data ADD COLUMN IF NOT EXISTS "savedInvigilationRecords" JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.school_data ADD COLUMN IF NOT EXISTS saved_invigilation_records JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.school_data ADD COLUMN IF NOT EXISTS "gradeCutoffs" JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.school_data ADD COLUMN IF NOT EXISTS grade_cutoffs JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.school_data ADD COLUMN IF NOT EXISTS "ledgerSubjectKeys" JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.school_data ADD COLUMN IF NOT EXISTS ledger_subject_keys JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.school_data ADD COLUMN IF NOT EXISTS "subjectPeriodAllocations" JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.school_data ADD COLUMN IF NOT EXISTS subject_period_allocations JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.school_data ADD COLUMN IF NOT EXISTS "teacherAssignments" JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.school_data ADD COLUMN IF NOT EXISTS teacher_assignments JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.school_data ADD COLUMN IF NOT EXISTS "subjectPaperConfigs" JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.school_data ADD COLUMN IF NOT EXISTS subject_paper_configs JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.school_data ADD COLUMN IF NOT EXISTS school_info JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.school_data ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{}'::jsonb;

/* 3. CLASSES, PERIODS & SUBJECTS */
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

/* 4. SCHOOL_ADMINS & AUTHORIZED_STAFF */
CREATE TABLE IF NOT EXISTS public.school_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'HEADMASTER',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.school_admins ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE;
ALTER TABLE public.school_admins ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.school_admins ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'HEADMASTER';
ALTER TABLE public.school_admins ADD COLUMN IF NOT EXISTS email TEXT;

CREATE TABLE IF NOT EXISTS public.authorized_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
  name TEXT,
  full_name TEXT,
  email TEXT,
  role TEXT DEFAULT 'TEACHER',
  assigned_subjects JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

/* 5. REMEDIAL MODULE TABLES */
CREATE TABLE IF NOT EXISTS public.remedial_timetable (
  id TEXT PRIMARY KEY,
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
  day_of_week TEXT,
  period_time TEXT,
  start_time TEXT,
  end_time TEXT,
  class_name TEXT,
  subject TEXT,
  teacher_name TEXT,
  stream TEXT DEFAULT 'A',
  term TEXT DEFAULT 'Term 1',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.remedial_attendance (
  id TEXT PRIMARY KEY,
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
  date DATE,
  day_of_week TEXT,
  period_time TEXT,
  class_name TEXT,
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

/* 6. EXAM_RECORDS, USAL_RECORDS & SITTING_PLANS */
CREATE TABLE IF NOT EXISTS public.exam_records (
  id TEXT PRIMARY KEY,
  school_id TEXT,
  student_id TEXT,
  reg_no TEXT,
  student_name TEXT,
  class_name TEXT,
  level TEXT,
  exam_id TEXT,
  exam_name TEXT,
  exam_type TEXT,
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

CREATE TABLE IF NOT EXISTS public.usal_records (
  id TEXT PRIMARY KEY,
  school_id TEXT,
  student_id TEXT,
  exam_id TEXT,
  subject TEXT,
  test_1 NUMERIC,
  test_2 NUMERIC,
  midterm NUMERIC,
  project NUMERIC,
  terminal NUMERIC,
  final_score NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.sitting_plans (
  id TEXT PRIMARY KEY,
  school_id TEXT,
  name TEXT,
  exam_id TEXT,
  exam_name TEXT,
  exam_date DATE,
  exam_session TEXT,
  total_candidates INTEGER DEFAULT 0,
  grid_layout JSONB DEFAULT '{}'::jsonb,
  theme TEXT DEFAULT 'navy',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

/* 7. PAYMENT & SMS TABLES */
CREATE TABLE IF NOT EXISTS public.payment_verification_requests (
  id TEXT PRIMARY KEY,
  school_id TEXT,
  "schoolId" TEXT,
  reference TEXT,
  status TEXT DEFAULT 'PENDING',
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.payment_verification_requests ADD COLUMN IF NOT EXISTS "schoolId" TEXT;
ALTER TABLE public.payment_verification_requests ADD COLUMN IF NOT EXISTS school_id TEXT;
ALTER TABLE public.payment_verification_requests ADD COLUMN IF NOT EXISTS reference TEXT;
ALTER TABLE public.payment_verification_requests ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'PENDING';

CREATE TABLE IF NOT EXISTS public.sms_payment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id TEXT,
  package_name TEXT,
  amount NUMERIC,
  sms_added INTEGER,
  status TEXT DEFAULT 'SUCCESS',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

/* 8. ROW LEVEL SECURITY (RLS) & PUBLIC POLICIES */
ALTER TABLE public.school_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.authorized_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.remedial_timetable ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.remedial_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.remedial_payment_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usal_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sitting_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_verification_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_payment_history ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public all access on school_subscriptions') THEN
    CREATE POLICY "Allow public all access on school_subscriptions" ON public.school_subscriptions FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public all access on school_data') THEN
    CREATE POLICY "Allow public all access on school_data" ON public.school_data FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public all access on classes') THEN
    CREATE POLICY "Allow public all access on classes" ON public.classes FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public all access on periods') THEN
    CREATE POLICY "Allow public all access on periods" ON public.periods FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public all access on subjects') THEN
    CREATE POLICY "Allow public all access on subjects" ON public.subjects FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public all access on school_admins') THEN
    CREATE POLICY "Allow public all access on school_admins" ON public.school_admins FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public all access on authorized_staff') THEN
    CREATE POLICY "Allow public all access on authorized_staff" ON public.authorized_staff FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public all access on remedial_timetable') THEN
    CREATE POLICY "Allow public all access on remedial_timetable" ON public.remedial_timetable FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public all access on remedial_attendance') THEN
    CREATE POLICY "Allow public all access on remedial_attendance" ON public.remedial_attendance FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public all access on remedial_payment_settings') THEN
    CREATE POLICY "Allow public all access on remedial_payment_settings" ON public.remedial_payment_settings FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public all access on exam_records') THEN
    CREATE POLICY "Allow public all access on exam_records" ON public.exam_records FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public all access on usal_records') THEN
    CREATE POLICY "Allow public all access on usal_records" ON public.usal_records FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public all access on sitting_plans') THEN
    CREATE POLICY "Allow public all access on sitting_plans" ON public.sitting_plans FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public all access on payment_verification_requests') THEN
    CREATE POLICY "Allow public all access on payment_verification_requests" ON public.payment_verification_requests FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public all access on sms_payment_history') THEN
    CREATE POLICY "Allow public all access on sms_payment_history" ON public.sms_payment_history FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

/* 9. REFRESH SCHEMA CACHE */
NOTIFY pgrst, 'reload schema';
