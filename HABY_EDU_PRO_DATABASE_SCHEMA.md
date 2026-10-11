# DATABASE SCHEMA PROMPT: HABY EDU PRO

You are the lead database architect for **HABY EDU PRO**. This document outlines the PostgreSQL schema currently deployed on Supabase. Every new feature implementation must adhere to this structure to ensure data consistency.

## 1. Core Tables (Multi-tenancy via `school_id`)

| Table Name | Description | Key Columns |
| :--- | :--- | :--- |
| `schools` | Registry of all active schools | `id`, `name`, `code`, `district` |
| `school_admins` | Authentication/Staff management | `id`, `school_id`, `email`, `full_name`, `role` |
| `users` | Global user directory (mirrors auth) | `id`, `school_id`, `email`, `full_name`, `role` |
| `authorized_staff` | Staff directory | `id`, `school_id`, `name`, `email`, `role` |

## 2. Academic & Student Data

| Table Name | Description | Key Columns |
| :--- | :--- | :--- |
| `students` | Student profile directory | `id`, `school_id`, `full_name`, `class_name`, `stream_name` |
| `teachers` | Staff profile & teaching load | `id`, `school_id`, `full_name`, `subjects`, `staff_role` |

## 3. Operations & Logs

| Table Name | Description | Key Columns |
| :--- | :--- | :--- |
| `activity_logs` | Audit trail of all system actions | `id`, `school_id`, `action`, `category`, `user_email`, `details` |
| `discipline` | Incident management | `id`, `school_id`, `student_id`, `incident_type`, `severity` |
| `gate_pass` | Student movement tracking | `id`, `school_id`, `student_id`, `reason`, `timestamp` |

## 4. Operational Rules for Schema Integration
1.  **Multi-tenancy:** All tables (except those in `TABLES_WITHOUT_SCHOOL_ID`) MUST include a `school_id` column to isolate data per school.
2.  **Schema Resilience:** Use `resilientUpsert` when inserting/updating data to handle PostgreSQL schema cache mismatches automatically.
3.  **Offline Support:** Always use `insertRecord`, `updateRecord`, `upsertRecord`, and `deleteRecord` instead of raw `supabase.from()` calls to support offline data synchronization.
4.  **Tables Without `school_id`:** `schools`, `students`, `teachers`, `classes`, `subjects`, `periods`, `timetable`, `attendance`, `exams`, `exam_results`, `profiles`, `settings`.
