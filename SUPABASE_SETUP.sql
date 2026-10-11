-- ==============================================================================
-- HABY EDU PRO - COMPLETE MASTER SUPABASE DATABASE SCHEMA
-- This script creates tables for EVERY SINGLE MODULE in the system.
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/tqazqaqdzqpbftdcekzb/sql
-- ==============================================================================

-- 1. SCHOOL DATA TABLE (CRITICAL: Central engine for timetable, periods, streams & settings)
CREATE TABLE IF NOT EXISTS public.school_data (
    id TEXT PRIMARY KEY,
    school_id TEXT UNIQUE NOT NULL,
    school_info JSONB DEFAULT '{}'::jsonb,
    timetable_assignments JSONB DEFAULT '[]'::jsonb,
    timetableAssignments JSONB DEFAULT '[]'::jsonb,
    period_settings JSONB DEFAULT '[]'::jsonb,
    periodSettings JSONB DEFAULT '[]'::jsonb,
    stream_settings JSONB DEFAULT '[]'::jsonb,
    streamSettings JSONB DEFAULT '[]'::jsonb,
    institutional_policy JSONB DEFAULT '{}'::jsonb,
    sessions JSONB DEFAULT '[]'::jsonb,
    supervisors JSONB DEFAULT '[]'::jsonb,
    selected_invigilators JSONB DEFAULT '[]'::jsonb,
    invigilation_assignments JSONB DEFAULT '{}'::jsonb,
    daily_attendance JSONB DEFAULT '{}'::jsonb,
    journal_records JSONB DEFAULT '{}'::jsonb,
    schemes_of_work JSONB DEFAULT '[]'::jsonb,
    schemesOfWork JSONB DEFAULT '[]'::jsonb,
    lesson_plans JSONB DEFAULT '[]'::jsonb,
    lessonPlans JSONB DEFAULT '[]'::jsonb,
    teacher_evaluations JSONB DEFAULT '[]'::jsonb,
    teacherEvaluations JSONB DEFAULT '[]'::jsonb,
    saved_timetable_records JSONB DEFAULT '[]'::jsonb,
    savedTimetableRecords JSONB DEFAULT '[]'::jsonb,
    saved_invigilation_records JSONB DEFAULT '[]'::jsonb,
    savedInvigilationRecords JSONB DEFAULT '[]'::jsonb,
    grade_cutoffs JSONB DEFAULT '{}'::jsonb,
    gradeCutoffs JSONB DEFAULT '{}'::jsonb,
    ledger_subject_keys JSONB DEFAULT '{}'::jsonb,
    ledgerSubjectKeys JSONB DEFAULT '{}'::jsonb,
    subject_period_allocations JSONB DEFAULT '[]'::jsonb,
    subjectPeriodAllocations JSONB DEFAULT '[]'::jsonb,
    teacher_assignments JSONB DEFAULT '[]'::jsonb,
    teacherAssignments JSONB DEFAULT '[]'::jsonb,
    subject_paper_configs JSONB DEFAULT '{}'::jsonb,
    subjectPaperConfigs JSONB DEFAULT '{}'::jsonb,
    bubble_settings JSONB DEFAULT '{}'::jsonb,
    bubbleSettings JSONB DEFAULT '{}'::jsonb,
    students JSONB DEFAULT '[]'::jsonb,
    teachers JSONB DEFAULT '[]'::jsonb,
    exams JSONB DEFAULT '[]'::jsonb,
    examination_records JSONB DEFAULT '[]'::jsonb,
    examinationRecords JSONB DEFAULT '[]'::jsonb,
    contributionTypes JSONB DEFAULT '[]'::jsonb,
    studentLedger JSONB DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. SCHOOL SUBSCRIPTIONS
CREATE TABLE IF NOT EXISTS public.school_subscriptions (
    id TEXT PRIMARY KEY,
    school_id TEXT UNIQUE NOT NULL,
    plan_tier TEXT DEFAULT 'PRO_ENTERPRISE',
    status TEXT DEFAULT 'ACTIVE',
    started_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '365 days'),
    is_trial BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. SCHOOLS TABLE
CREATE TABLE IF NOT EXISTS public.schools (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL,
    motto TEXT DEFAULT 'Elimu Ni Nguvu na Maadili Mema',
    phone TEXT,
    email TEXT,
    address TEXT,
    logo_url TEXT,
    status TEXT DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. STUDENTS TABLE
CREATE TABLE IF NOT EXISTS public.students (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    school_id TEXT NOT NULL,
    reg_token TEXT,
    full_name TEXT NOT NULL,
    gender TEXT DEFAULT 'Male',
    class_name TEXT NOT NULL DEFAULT 'Form 1',
    stream_name TEXT DEFAULT 'STREAM A',
    level_name TEXT DEFAULT 'CSEE',
    parent_phone TEXT,
    parent_full_name TEXT,
    passport_photo_url TEXT,
    dob DATE DEFAULT '2010-01-01',
    subjects JSONB DEFAULT '[]'::jsonb,
    marks JSONB DEFAULT '{}'::jsonb,
    total NUMERIC DEFAULT 0,
    average TEXT DEFAULT '0.0',
    division TEXT DEFAULT '-',
    status TEXT DEFAULT 'Active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TEACHERS TABLE
CREATE TABLE IF NOT EXISTS public.teachers (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    school_id TEXT NOT NULL,
    full_name TEXT NOT NULL,
    gender TEXT DEFAULT 'Male',
    staff_role_name TEXT DEFAULT 'Subject Teacher',
    phone TEXT,
    email TEXT,
    initial_preview TEXT DEFAULT 'MWL',
    color_identity TEXT DEFAULT '#1E88E5',
    weekly_period_quota INTEGER DEFAULT 20,
    invigilation_availability TEXT DEFAULT 'Available for Invigilation',
    passport_photo_url TEXT,
    subjects JSONB DEFAULT '["Basic Mathematics"]'::jsonb,
    teaching_streams JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. EXAMS TABLE
CREATE TABLE IF NOT EXISTS public.exams (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    school_id TEXT NOT NULL,
    name TEXT NOT NULL,
    exam_type TEXT DEFAULT 'Terminal',
    level TEXT DEFAULT 'CSEE',
    class_name TEXT DEFAULT 'All',
    status TEXT DEFAULT 'active',
    start_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. EXAM RECORDS TABLE (Master Results Marksheet)
CREATE TABLE IF NOT EXISTS public.exam_records (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    school_id TEXT NOT NULL,
    exam_id TEXT,
    student_id TEXT,
    reg_no TEXT,
    student_name TEXT,
    class_name TEXT,
    exam_name TEXT,
    subject_marks JSONB DEFAULT '{}'::jsonb,
    total_marks NUMERIC DEFAULT 0,
    average_score NUMERIC DEFAULT 0,
    division TEXT DEFAULT 'Division I',
    points INTEGER DEFAULT 15,
    rank INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. EXAM MARKS TABLE (Detailed per-subject scores)
CREATE TABLE IF NOT EXISTS public.exam_marks (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    school_id TEXT NOT NULL,
    exam_id TEXT NOT NULL,
    student_id TEXT,
    reg_no TEXT,
    subject_name TEXT NOT NULL,
    score NUMERIC DEFAULT 0,
    grade TEXT DEFAULT 'F',
    remarks TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. CLASSES TABLE
CREATE TABLE IF NOT EXISTS public.classes (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    school_id TEXT,
    name TEXT NOT NULL,
    level TEXT DEFAULT 'CSEE',
    stream TEXT DEFAULT 'STREAM A',
    capacity INTEGER DEFAULT 45,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. PERIODS TABLE
CREATE TABLE IF NOT EXISTS public.periods (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    school_id TEXT,
    name TEXT NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_break BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. SUBJECTS TABLE
CREATE TABLE IF NOT EXISTS public.subjects (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    school_id TEXT,
    name TEXT NOT NULL,
    code TEXT,
    department TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. ATTENDANCE TABLES
CREATE TABLE IF NOT EXISTS public.attendance (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    school_id TEXT NOT NULL,
    student_id TEXT,
    reg_no TEXT,
    attendance_date DATE DEFAULT CURRENT_DATE,
    status TEXT DEFAULT 'Present',
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.period_attendance (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    school_id TEXT NOT NULL,
    date DATE NOT NULL,
    class_name TEXT NOT NULL,
    stream TEXT,
    period_number INTEGER,
    subject TEXT,
    teacher_name TEXT,
    status TEXT DEFAULT 'Present',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. DISCIPLINE RECORDS
CREATE TABLE IF NOT EXISTS public.discipline_records (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    school_id TEXT NOT NULL,
    reg_no TEXT,
    student_name TEXT,
    incident_date DATE DEFAULT CURRENT_DATE,
    incident_type TEXT,
    severity TEXT DEFAULT 'Minor',
    action_taken TEXT,
    reported_by TEXT,
    status TEXT DEFAULT 'Open',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. ENVIRONMENT & ESTATE TABLES
CREATE TABLE IF NOT EXISTS public.environment_equipment (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    school_id TEXT NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    quantity INTEGER DEFAULT 1,
    condition TEXT DEFAULT 'Nzuri',
    location TEXT DEFAULT 'Stoo Kuu ya Mazingira',
    purchase_date DATE DEFAULT CURRENT_DATE,
    added_by TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.equipment_usage_log (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    school_id TEXT NOT NULL,
    equipment_id TEXT,
    equipment_name TEXT,
    used_by TEXT,
    quantity_used INTEGER DEFAULT 1,
    purpose TEXT,
    date_used DATE DEFAULT CURRENT_DATE,
    returned_date DATE,
    status TEXT DEFAULT 'Imetumika',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.equipment_usage_logs (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    school_id TEXT NOT NULL,
    equipment_id TEXT,
    equipment_name TEXT,
    used_by TEXT,
    quantity_used INTEGER DEFAULT 1,
    purpose TEXT,
    date_used DATE DEFAULT CURRENT_DATE,
    returned_date DATE,
    status TEXT DEFAULT 'Imetumika',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.environment_orders (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    school_id TEXT NOT NULL,
    student_id TEXT,
    student_name TEXT,
    class_name TEXT,
    equipment_name TEXT,
    quantity INTEGER DEFAULT 1,
    status TEXT DEFAULT 'Pending',
    order_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.school_purchased_equipment (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    school_id TEXT NOT NULL,
    equipment_name TEXT NOT NULL,
    quantity INTEGER DEFAULT 1,
    cost_per_unit NUMERIC DEFAULT 0,
    total_cost NUMERIC DEFAULT 0,
    supplier TEXT,
    invoice_number TEXT,
    purchased_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. FINANCE & STUDENT LEDGER TABLES
CREATE TABLE IF NOT EXISTS public.contribution_types (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    school_id TEXT NOT NULL,
    name TEXT NOT NULL,
    amount_default NUMERIC DEFAULT 0,
    class_levels JSONB DEFAULT '[]'::jsonb,
    academic_year TEXT DEFAULT '2026',
    term TEXT DEFAULT 'Term 1 / 2026',
    created_by TEXT DEFAULT 'Super Admin',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.student_ledger (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    school_id TEXT NOT NULL,
    student_cno TEXT NOT NULL,
    student_name TEXT NOT NULL,
    class_level TEXT NOT NULL,
    contribution_type_id TEXT,
    contribution_name TEXT NOT NULL,
    required_amount NUMERIC DEFAULT 0,
    paid_amount NUMERIC DEFAULT 0,
    balance_amount NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'UNPAID',
    last_payment_date DATE,
    receipt_number TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 16. SITTING PLANS (Exam Hall Seating)
CREATE TABLE IF NOT EXISTS public.sitting_plans (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    school_id TEXT NOT NULL,
    hall_name TEXT NOT NULL,
    desk_number INTEGER NOT NULL,
    reg_no TEXT NOT NULL,
    student_name TEXT NOT NULL,
    class_name TEXT NOT NULL,
    exam_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 17. REAM PAPER MODULE
CREATE TABLE IF NOT EXISTS public.ream_paper_records (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    school_id TEXT NOT NULL,
    student_id TEXT,
    student_cno TEXT,
    student_name TEXT NOT NULL,
    class_name TEXT NOT NULL,
    stream TEXT,
    quantity INTEGER DEFAULT 1,
    brand TEXT DEFAULT 'Double A',
    received_date DATE DEFAULT CURRENT_DATE,
    received_by TEXT,
    term TEXT DEFAULT 'Term 1',
    year TEXT DEFAULT '2026',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 18. REMEDIAL PROGRAM TABLES
CREATE TABLE IF NOT EXISTS public.remedial_timetable (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    school_id TEXT NOT NULL,
    day TEXT NOT NULL,
    period_number INTEGER NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    class_name TEXT NOT NULL,
    stream TEXT,
    subject TEXT NOT NULL,
    teacher_name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.remedial_attendance (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    school_id TEXT NOT NULL,
    timetable_id TEXT,
    date DATE NOT NULL,
    class_name TEXT NOT NULL,
    stream TEXT,
    subject TEXT NOT NULL,
    teacher_name TEXT NOT NULL,
    status TEXT DEFAULT 'taught',
    students_present INTEGER DEFAULT 0,
    notes TEXT,
    marked_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.remedial_payment_settings (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    school_id TEXT NOT NULL,
    class_name TEXT NOT NULL,
    rate_per_period NUMERIC DEFAULT 5000,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 19. TEACHING LOGS & TRACKER
CREATE TABLE IF NOT EXISTS public.teaching_logs (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    school_id TEXT NOT NULL,
    date DATE NOT NULL,
    teacher_name TEXT NOT NULL,
    class_name TEXT NOT NULL,
    subject TEXT NOT NULL,
    period_number INTEGER NOT NULL,
    topic TEXT,
    status TEXT DEFAULT 'Taught',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 20. GATE PASS LOGS
CREATE TABLE IF NOT EXISTS public.gate_pass_logs (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    school_id TEXT NOT NULL,
    student_id TEXT,
    student_name TEXT NOT NULL,
    reg_no TEXT NOT NULL,
    class_name TEXT NOT NULL,
    stream TEXT,
    photo TEXT,
    type TEXT NOT NULL, -- 'CHECK_IN' | 'CHECK_OUT'
    reason TEXT NOT NULL,
    officer_name TEXT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'VALID',
    fee_status TEXT DEFAULT 'PAID'
);

-- 21. SMS & COMMUNICATION TABLES
CREATE TABLE IF NOT EXISTS public.sms_logs (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    school_id TEXT NOT NULL,
    recipient_phone TEXT NOT NULL,
    recipient_name TEXT,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'Sent',
    sent_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.sms_wallet (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    school_id TEXT UNIQUE NOT NULL,
    balance NUMERIC DEFAULT 0,
    rate_per_sms NUMERIC DEFAULT 30,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.sms_payment_history (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    school_id TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    sms_count INTEGER NOT NULL,
    payment_reference TEXT,
    payment_method TEXT,
    status TEXT DEFAULT 'Completed',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.parent_messages (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    school_id TEXT NOT NULL,
    parent_phone TEXT NOT NULL,
    parent_name TEXT,
    student_reg_no TEXT,
    message TEXT NOT NULL,
    reply TEXT,
    status TEXT DEFAULT 'Unread',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.parents (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    school_id TEXT NOT NULL,
    phone TEXT NOT NULL,
    phone_255 TEXT,
    full_name TEXT NOT NULL,
    password_hash TEXT DEFAULT '123456',
    student_cno TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.parent_students (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    parent_id TEXT NOT NULL,
    student_id TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.announcements (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    school_id TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    target_audience TEXT DEFAULT 'All',
    created_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 22. USERS, ADMINS & STAFF
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    school_id TEXT,
    email TEXT UNIQUE,
    full_name TEXT,
    display_name TEXT,
    role TEXT DEFAULT 'ADMIN',
    assigned_subjects JSONB DEFAULT '[]'::jsonb,
    is_super_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.authorized_staff (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    school_id TEXT NOT NULL,
    staff_identity TEXT NOT NULL,
    auth_email TEXT NOT NULL,
    assigned_password TEXT NOT NULL,
    role TEXT DEFAULT 'HEADMASTER',
    assigned_subjects JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.school_admins (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    school_id TEXT NOT NULL,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT DEFAULT 'HEADMASTER',
    status TEXT DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.activity_logs (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    school_id TEXT NOT NULL,
    user_email TEXT,
    action TEXT,
    category TEXT,
    target_name TEXT,
    details TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.payment_verification_requests (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    school_id TEXT NOT NULL,
    plan_tier TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    payment_reference TEXT NOT NULL,
    phone_number TEXT,
    status TEXT DEFAULT 'PENDING',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 23. TIMETABLE ENGINE TABLES (Master Timetable, Periods, Streams, & Assignments)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.timetables (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    school_id TEXT NOT NULL,
    class_id TEXT NOT NULL,
    stream TEXT DEFAULT 'STREAM A',
    day_of_week TEXT NOT NULL, -- 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'
    period_number INTEGER NOT NULL,
    subject_id TEXT NOT NULL,
    teacher_id INTEGER,
    time_start TIME,
    time_end TIME,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.timetable_assignments (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    school_id TEXT NOT NULL,
    class_name TEXT NOT NULL,
    stream TEXT DEFAULT 'STREAM A',
    day TEXT NOT NULL, -- 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'
    period TEXT NOT NULL, -- e.g. 'Period 1 (08:00-08:40)'
    period_name TEXT,
    teacher_id INTEGER,
    teacher_name TEXT,
    subject TEXT NOT NULL,
    room TEXT DEFAULT 'Classroom',
    activity_type TEXT DEFAULT 'academic',
    custom_note TEXT,
    is_locked BOOLEAN DEFAULT FALSE,
    allocation_mode TEXT DEFAULT 'manual',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.period_settings (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    school_id TEXT NOT NULL,
    day TEXT DEFAULT 'Monday',
    name TEXT NOT NULL, -- 'Period 1', 'Period 2', 'Break'
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_break BOOLEAN DEFAULT FALSE,
    assigned_teacher_id INTEGER,
    default_subject TEXT,
    class_name TEXT DEFAULT 'All Classes',
    stream_name TEXT DEFAULT 'All Streams',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.stream_settings (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    school_id TEXT NOT NULL,
    class_name TEXT NOT NULL,
    level TEXT DEFAULT 'CSEE',
    streams JSONB DEFAULT '["STREAM A", "STREAM B"]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.subject_period_allocations (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    school_id TEXT NOT NULL,
    class_name TEXT NOT NULL,
    subject_name TEXT NOT NULL,
    periods_per_week INTEGER DEFAULT 4,
    double_periods BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.teacher_assignments (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    school_id TEXT NOT NULL,
    teacher_id INTEGER NOT NULL,
    teacher_name TEXT,
    class_name TEXT NOT NULL,
    stream TEXT,
    subject_name TEXT NOT NULL,
    periods_count INTEGER DEFAULT 4,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.saved_timetable_records (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    school_id TEXT NOT NULL,
    name TEXT NOT NULL, -- e.g. 'Timetable Term 1 2026'
    academic_year TEXT DEFAULT '2026',
    term TEXT DEFAULT 'Term 1',
    timetable_data JSONB DEFAULT '[]'::jsonb,
    status TEXT DEFAULT 'Published',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.institutional_policies (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    school_id TEXT NOT NULL,
    policy_name TEXT NOT NULL,
    rules JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 24. INVIGILATION & EXAM SUPERVISION ENGINE TABLES
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.invigilation_sessions (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    school_id TEXT NOT NULL,
    raw_date TEXT,
    date DATE NOT NULL,
    day TEXT NOT NULL,
    session TEXT NOT NULL, -- 'SESSION I', 'SESSION II', 'SESSION III'
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    time_slot TEXT,
    subject TEXT NOT NULL,
    level TEXT DEFAULT 'CSEE',
    class_name TEXT NOT NULL,
    stream TEXT,
    rooms_count INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.invigilation_assignments (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    school_id TEXT NOT NULL,
    session_id TEXT,
    exam_name TEXT,
    date DATE NOT NULL,
    room_number INTEGER DEFAULT 1,
    teacher_id INTEGER,
    teacher_name TEXT NOT NULL,
    role TEXT DEFAULT 'Invigilator', -- 'Chief Supervisor' | 'Invigilator' | 'Relief'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.invigilation_supervisors (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    school_id TEXT NOT NULL,
    teacher_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    initial TEXT,
    phone TEXT,
    role TEXT DEFAULT 'Chief Supervisor',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.selected_invigilators (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    school_id TEXT NOT NULL,
    teacher_id INTEGER NOT NULL,
    teacher_name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.saved_invigilation_records (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    school_id TEXT NOT NULL,
    exam_name TEXT NOT NULL,
    academic_year TEXT DEFAULT '2026',
    term TEXT DEFAULT 'Term 1',
    duty_roster JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- ENABLE UNRESTRICTED PERMISSIVE ACCESS POLICIES FOR ALL TABLES
-- (Guarantees no 401 / 403 or RLS permission denial on any operation)
-- ==============================================================================
DO $$
DECLARE
    tbl text;
    tables text[] := ARRAY[
        'school_data', 'school_subscriptions', 'schools', 'students', 'teachers',
        'exams', 'exam_records', 'exam_marks', 'classes', 'periods', 'subjects',
        'attendance', 'period_attendance', 'discipline_records', 'environment_equipment',
        'equipment_usage_log', 'equipment_usage_logs', 'environment_orders',
        'school_purchased_equipment', 'contribution_types', 'student_ledger',
        'sitting_plans', 'ream_paper_records', 'remedial_timetable',
        'remedial_attendance', 'remedial_payment_settings', 'teaching_logs',
        'gate_pass_logs', 'sms_logs', 'sms_wallet', 'sms_payment_history',
        'parent_messages', 'parents', 'parent_students', 'announcements',
        'users', 'authorized_staff', 'school_admins', 'activity_logs',
        'payment_verification_requests',
        'timetable_assignments', 'timetables', 'period_settings', 'stream_settings',
        'subject_period_allocations', 'teacher_assignments',
        'saved_timetable_records', 'institutional_policies',
        'invigilation_sessions', 'invigilation_assignments',
        'invigilation_supervisors', 'selected_invigilators',
        'saved_invigilation_records'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);
        EXECUTE format('DROP POLICY IF EXISTS "Public full access policy" ON public.%I;', tbl);
        EXECUTE format('CREATE POLICY "Public full access policy" ON public.%I FOR ALL USING (true) WITH CHECK (true);', tbl);
    END LOOP;
END $$;

-- Reload Supabase PostgREST Schema Cache
NOTIFY pgrst, 'reload schema';
