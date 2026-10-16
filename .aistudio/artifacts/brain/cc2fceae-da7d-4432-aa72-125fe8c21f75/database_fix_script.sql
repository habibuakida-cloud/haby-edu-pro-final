-- ==============================================================================
-- HABY EDU PRO - SUPABASE PRODUCTION DATABASE SCHEMA & MIGRATION
-- ==============================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. SCHOOLS TABLE
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

-- 3. USERS TABLE
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  role TEXT DEFAULT 'TEACHER',
  school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS school_id UUID;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS password TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT FALSE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS assigned_subjects JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

-- 4. STUDENTS TABLE
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

-- 5. TEACHERS TABLE
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

-- 10. SCHOOL DATA (Complete state snapshot for durable multi-tenant sync)
CREATE TABLE IF NOT EXISTS public.school_data (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL UNIQUE,
  school_info JSONB DEFAULT '{}'::jsonb,
  bubble_settings JSONB DEFAULT '{"count":12,"opacity":0.35,"colorPalette":"vibrant","enabled":true}'::jsonb,
  students JSONB DEFAULT '[]'::jsonb,
  teachers JSONB DEFAULT '[]'::jsonb,
  exams JSONB DEFAULT '[]'::jsonb,
  examination_records JSONB DEFAULT '[]'::jsonb,
  timetable_assignments JSONB DEFAULT '[]'::jsonb,
  period_settings JSONB DEFAULT '[]'::jsonb,
  stream_settings JSONB DEFAULT '[]'::jsonb,
  institutional_policy JSONB DEFAULT '{}'::jsonb,
  sessions JSONB DEFAULT '[]'::jsonb,
  supervisors JSONB DEFAULT '[]'::jsonb,
  selected_invigilators JSONB DEFAULT '[]'::jsonb,
  invigilation_assignments JSONB DEFAULT '{}'::jsonb,
  activity_logs JSONB DEFAULT '[]'::jsonb,
  discipline_records JSONB DEFAULT '[]'::jsonb,
  daily_attendance JSONB DEFAULT '{}'::jsonb,
  schemes_of_work JSONB DEFAULT '[]'::jsonb,
  lesson_plans JSONB DEFAULT '[]'::jsonb,
  teacher_evaluations JSONB DEFAULT '[]'::jsonb,
  saved_timetable_records JSONB DEFAULT '[]'::jsonb,
  saved_invigilation_records JSONB DEFAULT '[]'::jsonb,
  grade_cutoffs JSONB DEFAULT '{}'::jsonb,
  ledger_subject_keys JSONB DEFAULT '{}'::jsonb,
  subject_period_allocations JSONB DEFAULT '[]'::jsonb,
  teacher_assignments JSONB DEFAULT '[]'::jsonb,
  subject_paper_configs JSONB DEFAULT '{}'::jsonb,
  data JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. SUBSCRIPTIONS
CREATE TABLE IF NOT EXISTS public.school_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
  subscription_expiry TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
  subscription_type TEXT DEFAULT 'TRIAL',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
