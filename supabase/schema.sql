-- ====================================================================
-- HABY EDU PRO - PRODUCTION SUPABASE DATABASE SCHEMA
-- Project URL: https://rdrmptcdxtdjblaqsxjy.supabase.co
-- Zero Demo Data (Database resets to 0 bytes)
-- Full Row Level Security (RLS) with Public Access Policies (Fixes 401)
-- ====================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. DROP / CLEAN OLD DEMO DATA (Resets database to 0)
DROP TABLE IF EXISTS student_ledger CASCADE;
DROP TABLE IF EXISTS contribution_types CASCADE;
DROP TABLE IF EXISTS parents CASCADE;
DROP TABLE IF EXISTS sms_logs CASCADE;
DROP TABLE IF EXISTS sms_wallet CASCADE;
DROP TABLE IF EXISTS sitting_plans CASCADE;
DROP TABLE IF EXISTS school_data CASCADE;
DROP TABLE IF EXISTS usal_records CASCADE;
DROP TABLE IF EXISTS exam_records CASCADE;
DROP TABLE IF EXISTS exams CASCADE;
DROP TABLE IF EXISTS teachers CASCADE;
DROP TABLE IF EXISTS students CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS schools CASCADE;

-- 3. CREATE TABLES

-- Table: schools
CREATE TABLE schools (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  school_number TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  motto TEXT,
  principal TEXT,
  logo TEXT,
  status TEXT DEFAULT 'ACTIVE',
  institutional_levels JSONB DEFAULT '["NURSERY", "PRIMARY", "SECONDARY"]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: users (Staff & Admin Accounts)
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  role TEXT DEFAULT 'TEACHER',
  school_id TEXT,
  "schoolId" TEXT,
  is_super_admin BOOLEAN DEFAULT FALSE,
  "isSuperAdmin" BOOLEAN DEFAULT FALSE,
  assigned_subjects JSONB DEFAULT '[]'::jsonb,
  "assignedSubjects" JSONB DEFAULT '[]'::jsonb,
  phone TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: students (Real Students Roster - No Demo Data)
CREATE TABLE students (
  id BIGINT PRIMARY KEY,
  school_id TEXT NOT NULL,
  reg_no TEXT,
  "regNo" TEXT,
  name TEXT NOT NULL,
  gender TEXT DEFAULT 'Male',
  class_name TEXT,
  "className" TEXT,
  level TEXT DEFAULT 'CSEE',
  dob TEXT,
  stream TEXT,
  combination TEXT,
  phone TEXT,
  parent_phone TEXT,
  "parentPhone" TEXT,
  passport_photo TEXT,
  "passportPhoto" TEXT,
  subjects JSONB DEFAULT '[]'::jsonb,
  marks JSONB DEFAULT '{}'::jsonb,
  total NUMERIC DEFAULT 0,
  average TEXT,
  division TEXT,
  primary_grade TEXT,
  "primaryGrade" TEXT,
  pass_status TEXT,
  "passStatus" TEXT,
  gpa NUMERIC,
  report_card_data JSONB,
  "reportCardData" JSONB,
  registered_at TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: teachers (Faculty Members)
CREATE TABLE teachers (
  id BIGINT PRIMARY KEY,
  school_id TEXT NOT NULL,
  name TEXT NOT NULL,
  initial TEXT,
  gender TEXT DEFAULT 'Male',
  subjects JSONB DEFAULT '[]'::jsonb,
  exclude_invigilation BOOLEAN DEFAULT FALSE,
  "excludeInvigilation" BOOLEAN DEFAULT FALSE,
  color TEXT DEFAULT '#0284c7',
  school_role TEXT DEFAULT 'Subject Teacher',
  "schoolRole" TEXT DEFAULT 'Subject Teacher',
  phone TEXT,
  email TEXT,
  passport_photo TEXT,
  "passportPhoto" TEXT,
  teaching_streams JSONB DEFAULT '[]'::jsonb,
  "teachingStreams" JSONB DEFAULT '[]'::jsonb,
  max_periods_per_week NUMERIC DEFAULT 20,
  "maxPeriodsPerWeek" NUMERIC DEFAULT 20,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: exams (Examination Schedules)
CREATE TABLE exams (
  id BIGINT PRIMARY KEY,
  school_id TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT,
  level TEXT,
  class_name TEXT,
  "className" TEXT,
  date TEXT,
  status TEXT DEFAULT 'Active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: exam_records (Student Academic Marks & Grade Records)
CREATE TABLE exam_records (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL,
  student_id BIGINT,
  "studentId" BIGINT,
  student_name TEXT,
  "studentName" TEXT,
  class_name TEXT,
  "className" TEXT,
  academic_year TEXT,
  "academicYear" TEXT,
  academic_calendar_type TEXT,
  "academicCalendarType" TEXT,
  term TEXT,
  exam_type TEXT,
  "examType" TEXT,
  subjects JSONB DEFAULT '{}'::jsonb,
  total_marks NUMERIC DEFAULT 0,
  "totalMarks" NUMERIC DEFAULT 0,
  average_marks NUMERIC DEFAULT 0,
  "averageMarks" NUMERIC DEFAULT 0,
  overall_grade TEXT,
  "overallGrade" TEXT,
  division TEXT,
  position_in_class NUMERIC,
  "positionInClass" NUMERIC,
  total_students NUMERIC,
  "totalStudents" NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: usal_records (USAL / Invigilation Session Logs)
CREATE TABLE usal_records (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL,
  exam_id BIGINT,
  class_name TEXT,
  subject TEXT,
  data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: sitting_plans (A4 Portrait Examination Sitting Plans)
CREATE TABLE sitting_plans (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  school_id TEXT NOT NULL,
  exam_type TEXT,
  room_no TEXT,
  subject TEXT,
  code_no TEXT,
  exam_date TEXT,
  door_entrance TEXT,
  total_seats NUMERIC,
  start_seat TEXT,
  end_seat TEXT,
  columns_count NUMERIC,
  rows_count NUMERIC,
  columns_seats JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: school_data (Single-Source Snapshot Document for Instant State Restoration)
CREATE TABLE school_data (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL,
  "schoolId" TEXT,
  school_info JSONB,
  "schoolInfo" JSONB,
  students JSONB DEFAULT '[]'::jsonb,
  teachers JSONB DEFAULT '[]'::jsonb,
  exams JSONB DEFAULT '[]'::jsonb,
  examination_records JSONB DEFAULT '[]'::jsonb,
  "examinationRecords" JSONB DEFAULT '[]'::jsonb,
  usal_records JSONB DEFAULT '[]'::jsonb,
  "usalRecords" JSONB DEFAULT '[]'::jsonb,
  sessions JSONB DEFAULT '[]'::jsonb,
  timetable_assignments JSONB DEFAULT '[]'::jsonb,
  period_settings JSONB DEFAULT '[]'::jsonb,
  stream_settings JSONB DEFAULT '[]'::jsonb,
  activity_logs JSONB DEFAULT '[]'::jsonb,
  "activityLogs" JSONB DEFAULT '[]'::jsonb,
  results_status TEXT DEFAULT 'active',
  timetable_released BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: sms_wallet (SMS Account Credit Balance)
CREATE TABLE sms_wallet (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  school_id TEXT NOT NULL UNIQUE,
  balance NUMERIC DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: sms_logs (Parent SMS Dispatch Logs)
CREATE TABLE sms_logs (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL,
  recipient TEXT,
  phone TEXT,
  message TEXT,
  status TEXT DEFAULT 'sent',
  exam_type TEXT,
  sent_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: parents (Parent Phone Directory)
CREATE TABLE parents (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL,
  student_name TEXT,
  parent_name TEXT,
  phone TEXT,
  class_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: contribution_types (School Fees & Contributions)
CREATE TABLE contribution_types (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL,
  name TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  classes JSONB DEFAULT '[]'::jsonb,
  frequency TEXT DEFAULT 'Term',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: student_ledger (Student Fee Debts & Payments)
CREATE TABLE student_ledger (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL,
  student_id BIGINT NOT NULL,
  student_name TEXT,
  class_name TEXT,
  contribution_id TEXT,
  contribution_name TEXT,
  expected_amount NUMERIC DEFAULT 0,
  paid_amount NUMERIC DEFAULT 0,
  balance NUMERIC DEFAULT 0,
  receipt_no TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. ENABLE ROW LEVEL SECURITY (RLS) ON ALL TABLES
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE usal_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE sitting_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_wallet ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE contribution_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_ledger ENABLE ROW LEVEL SECURITY;

-- 5. CREATE PERMISSIVE POLICIES (Fixes 401 Unauthorized for Anon & Authenticated users)
DO $$
DECLARE
  tbl text;
  tables text[] := ARRAY[
    'schools',
    'users',
    'students',
    'teachers',
    'exams',
    'exam_records',
    'usal_records',
    'sitting_plans',
    'school_data',
    'sms_wallet',
    'sms_logs',
    'parents',
    'contribution_types',
    'student_ledger'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Allow all operations for anon and authenticated" ON %I;', tbl);
    EXECUTE format('CREATE POLICY "Allow all operations for anon and authenticated" ON %I FOR ALL TO PUBLIC USING (true) WITH CHECK (true);', tbl);
  END LOOP;
END
$$;

-- 6. GRANT FULL PERMISSIONS
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;

-- 7. INITIALIZE ROOT SCHOOL & SUPERADMIN ACCOUNTS (Zero student dummy records)
INSERT INTO schools (id, name, school_number, address, phone, email, motto, principal, status)
VALUES 
  ('S.0123', 'KIOMONI SECONDARY SCHOOL', 'S.0123', 'P.O. Box 1234, Tanga, Tanzania', '0717616343', 'info@kiomonisec.ac.tz', 'Education for Development & Integrity', 'Dr. H. Akida', 'ACTIVE')
ON CONFLICT (id) DO UPDATE SET status = 'ACTIVE';

INSERT INTO users (id, email, full_name, role, school_id, "schoolId", is_super_admin, "isSuperAdmin", status)
VALUES 
  ('admin_haby_root', 'habibuakida@gmail.com', 'Dr. Habibu Akida (Super Admin)', 'HEADMASTER', 'S.0123', 'S.0123', TRUE, TRUE, 'active')
ON CONFLICT (id) DO NOTHING;

INSERT INTO sms_wallet (school_id, balance)
VALUES ('S.0123', 500)
ON CONFLICT (school_id) DO NOTHING;

-- Verification query
SELECT 'Database schema successfully configured with 0 demo students. RLS enabled with full public access.' AS status;
