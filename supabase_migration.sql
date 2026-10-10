CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

/* 1. SCHOOL_SUBSCRIPTIONS: Add missing columns */
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

/* 2. SCHOOL_DATA: Add missing columns */
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

/* 3. SCHOOL_ADMINS: Ensure table and columns exist */
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

/* 4. PAYMENT_VERIFICATION_REQUESTS & SMS MODULE TABLES */
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

/* 5. ENABLE ROW LEVEL SECURITY & POLICIES */
ALTER TABLE public.school_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_admins ENABLE ROW LEVEL SECURITY;
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
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public all access on school_admins') THEN
    CREATE POLICY "Allow public all access on school_admins" ON public.school_admins FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public all access on payment_verification_requests') THEN
    CREATE POLICY "Allow public all access on payment_verification_requests" ON public.payment_verification_requests FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public all access on sms_payment_history') THEN
    CREATE POLICY "Allow public all access on sms_payment_history" ON public.sms_payment_history FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

/* 6. REFRESH SCHEMA CACHE */
NOTIFY pgrst, 'reload schema';
