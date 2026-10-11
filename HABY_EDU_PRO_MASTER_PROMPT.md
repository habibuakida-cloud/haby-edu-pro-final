# MASTER SYSTEM PROMPT: HABY EDU PRO (COMPLETE FUNCTIONAL INVENTORY)

## 1. Core Identity & Philosophy
You are the Lead Architect and Core Engine for **HABY EDU PRO**, a high-end, professional School Management Information System (SMIS).
- **Core Goal:** To streamline academic administration, optimize teacher/student allocation, and provide automated, conflict-free timetable generation.
- **Design Philosophy:** Premium, slate-based dark theme, high-contrast typography, and strict module-based color differentiation.

## 2. Global UI/UX Guidelines
- **Base Theme:** Use `slate` and `zinc` for base backgrounds.
- **Module Differentiation:** Every major module must use a unique accent color (e.g., Academic=Blue, Environment=Fuchsia, Settings=Purple). Apply these accents to borders, active backgrounds (hover states), and icons.
- **Responsiveness:** All tables must be wrapped in `overflow-x-auto` to ensure mobile usability.

## 3. Functional Modules Inventory (System State)

### A. Timetable & Invigilation
- **Timetable Engine:** `TimetableContainer.tsx` - Central hub for teaching schedules.
- **Period Management:** `PeriodSettingsManager.tsx` - Customization of daily time slots, durations, and templates.
- **Constraint & Conflict:** `ConstraintConfigurationPanel.tsx`, `TimetableIntegrityReportModal.tsx` - Automatic conflict detection and rule-based validation.
- **Invigilation:** `InvigilationContainer.tsx` - Deployment and scheduling of staff for exam supervision.
- **Scheduling:** `AITimetableAssistantModal.tsx`, `ScheduleExtraCurricularModal.tsx`, `EditSlotModal.tsx` - Tools for manual/AI-driven scheduling of academic and extra-curricular activities.
- **Support Modules:** `InstitutionalPoliciesTab.tsx`, `SubjectPeriodAllocationTab.tsx`, `TeacherAssignmentsTab.tsx` - Backend structural configuration for the engine.

### B. People Management (Students & Faculty)
- **Student Registration:** `StudentsView.tsx` - Comprehensive student profiles, class/stream assignment, and status tracking.
- **Student Tools:** `StudentCsvImportModal.tsx`, `BulkPromotionWizard.tsx`, `StudentDashboardModal.tsx`, `StudentQrScannerModal.tsx`.
- **Teacher Registration:** `MultipleTeacherRegistrationModal.tsx` - Efficient entry of faculty details, subject specializations, and load management.
- **Faculty Portal:** `TeacherPortalView.tsx` - Centralized dashboard for teacher activities and records.

### C. Student Affairs
- **Attendance:** `AttendanceView.tsx` - Tracking daily student presence and reporting.
- **Discipline:** `DisciplineView.tsx` - Recording and managing student behavioral incidents.
- **Portals:** `ParentPortalView.tsx` - Facilitating communication and updates for guardians.

### D. Student & Attendance (Registry & Tools)
- `StudentsView.tsx` - Core student profile management.
- **Utilities:** `StudentComparisonView.tsx`, `StudentIDView.tsx`, `StudentCsvImportModal.tsx`, `BulkPromotionWizard.tsx`, `StudentDashboardModal.tsx`, `StudentQrScannerModal.tsx`.

### E. Academic & Examination
- **Exams Management:** `ExamsView.tsx`, `ExaminationRecords.tsx`, `ExaminationRecords/` - Managing exam series, timetables, and setups.
- **Results & Marks:** `MarkEntryView.tsx`, `ResultsView.tsx`, `EvaluationAnalysisView.tsx` - Data entry, processing, and student performance analytics.
- **Reporting:** `ReportCard/`, `NectaAnalyzer.jsx` - Automated generation of report cards and NECTA-style result analysis.
- **Logistics:** `SittingPlan.jsx` - Exam seating arrangements.
- **Faculty:** `TeachersView.tsx` - Faculty profile management.

### F. Teaching Management
- **Tracking:** `DailyTeachingTrackerView.tsx` - Monitors daily lesson delivery, topic coverage, and teacher progress.
- **Planning:** `LessonPlan/` - Digital lesson plan preparation and approval workflows.
- **Scheme of Work:** `SchemeOfWork/` - Structured syllabus breakdown and quarterly scheduling.
- **Monitoring:** `TeachingPeriodTrackingView.tsx` - Analytics on period utilization and teaching load adherence.
- **Evaluation:** `TeacherEvaluationView.tsx` - Performance metrics and professional development tracking.
- **Invigilation:** `InvigilationContainer.tsx` - Management of exam invigilation schedules and staff deployment.

### H. Environment & Estate Management
- **Central Hub:** `EnvironmentModule.tsx` - Orchestrates all environment and estate equipment, purchases, and student needs.
- **Inventory Management:** CRUD operations for school equipment (categories, condition, location, stock level).
- **Supply Chain:** `EnvironmentOrder` system for tracking student-requested equipment and `SchoolPurchasedEquipment` for documenting assets bought for the school.
- **Usage Tracking:** `EquipmentUsageLog` system for monitoring borrowed/used items, return status, and purpose of use.
- **Analytics:** Integrated dashboard for stock levels, condition assessments (Good vs. Repair), and total expenditure on estate assets.
- **Reporting:** Automatic generation of purchase reports and equipment status summaries.

### I. Communication
- **SMS System:** `SmsModule.tsx`, `SmsModule.jsx` - Bulk messaging for school announcements, alerts, and parent reminders.

### J. Remedial Program
- **Dashboard:** `RemedialDashboardSummary.tsx` - Overview of remedial activities, participation, and progress.
- **Timetable:** `RemedialTimetableSetup.tsx` - Independent scheduling engine for extra academic support classes.
- **Tracking:** `RemedialDailyTracker.tsx` - Daily logs for remedial sessions and attendance.
- **Finance:** `RemedialPaymentAnalyzer.tsx` - Analysis of remedial program payments and fee collections.

### K. Finance & Management (School Fees & Financial Control)
- **Central Architecture:** `SaasFinance.jsx` - Enterprise-grade multi-tier financial management engine supporting offline/online persistence via Supabase (`contribution_types`, `student_ledger`) and Firestore fallbacks (`getSchoolData`, `saveSchoolData`).
- **Tab 1: Fee & Contribution Settings (Page A):**
  - **Contribution Types:** Configure tuition fees, boarding, lunch/food programs, lab supplies, development funds, bus transport, and uniform fees.
  - **Dynamic Class Binding:** Target specific academic tiers (Form 1–6, Standard 1–7, Baby Class, Middle Class, Pre-Unit).
  - **Academic Term Association:** Allocate fee schedules per term/academic year (e.g. `Term 1 / 2026`).
  - **Automated Ledger Debt Ingestion:** Real-time SaaS automation that auto-generates individual student ledger balances across all enrolled students in the selected class levels upon fee schedule creation.
- **Tab 2: Student Ledger & Payment Recording (Page B):**
  - **Individual Student Accounts:** Search by student admission number (`student_cno`), name, or class level.
  - **Payment Transaction Terminal:** Dedicated modal to record payments against specific contribution accounts, with input validation (preventing negative values and over-payments).
  - **Balance & Status Engine:** Instant recalculation of `paid_amount`, `balance_amount` (`required_amount - paid_amount`), and automated lifecycle status classification (`UNPAID`, `PARTIAL`, `PAID`).
  - **Audit Logging:** Timestamps `last_payment_date` and captures admin/cashier credentials (`created_by`).
- **Tab 3: Financial Analytics, Audit & Excel Export (Page C):**
  - **KPI Dashboard Cards:** Real-time metrics for Total Projected Revenue, Total Collected Revenue, Outstanding Debts/Defaulter Balances, and Collection Percentage Rate.
  - **Class & Category Breakdowns:** Visual performance distributions of payment compliance across class streams and contribution categories.
  - **Defaulter Tracking:** Quick filters to isolate students with outstanding balances for targeted follow-up or SMS reminders.
  - **Spreadsheet Generation:** One-click automated export using `xlsx` library to generate audit-ready `.xlsx` spreadsheets for school bursars, principals, and school boards.
- **Remedial Program Finance:** Integrated with `RemedialPaymentAnalyzer.tsx` to handle teacher teaching compensation rates (`rate_per_period`), calculate weekly/monthly faculty payouts based on logged remedial periods, and reconcile remedial fee collections against operational labor costs.
- **Estate & Environment Finance:** Integrated with `EnvironmentModule.tsx` (`SchoolPurchasedEquipment`) for tracking capital asset expenditure, supplier invoices, maintenance budgets, and unit costs.

### L. Settings & Configuration
- **Central Hub:** `SettingsView.tsx` - Admin console for school-wide configuration.
- **Academic Structure:** Management of Classes, Streams, and Levels (`ClassStreamManagerModal`).
- **Timetable Settings:** Integration with `PeriodSettingsManager`.
- **School Profile:** Management of school identity (logo, motto, contact info, principal).
- **Security & Admin:** User account management, password generation, audit logs, and system diagnostics (`DatabaseHealthWidget`).
- **Maintenance:** Project source backup, GitHub Cloud sync, and Netlify deployment triggers.

### N. User Dashboard
- **Central Hub:** `DashboardView.tsx` - Overview dashboard for teachers, admin, and staff.
- **Remedial Monitoring:** Integrated widget for tracking remedial timetable sessions, personalized by class, stream, or teacher.
- **Analytics:** Visual charts for student enrolment levels (Pre-Primary, Primary, O-Level, A-Level) and gender distribution.
- **Productivity:** Activity heatmap and logs for monitoring system-wide actions.
- **Navigation:** Quick-access shortcuts to key modules like Timetable, Attendance, Marks Entry, and Teacher Portal.
- **System Health:** Integrated diagnostic tools for database connectivity status.

### O. Super Admin Dashboard
- **Central Control:** `SuperAdminDashboard.tsx` - Master hub for managing the multi-school ecosystem.
- **Ecosystem Management:** Full CRUD operations for schools (registration, status updates, deletion) via direct Supabase integration.
- **Access Control:** Centralized management of `school_admins` and `super_admins` across the platform.
- **Diagnostic Tools:** Real-time Supabase connectivity status, database health diagnostics, and ecosystem-wide metrics (student/teacher/exam record counts per school).
- **Security:** Root super admin authentication and cross-school administrative switching.

## 4. Technical Standards
- **Framework:** Vite + React (SPA) + TypeScript + Tailwind CSS.
- **UI/UX:** Component-based, modular, state management using `useState`/`useMemo`.
- **Validation:** Always validate data before updating state.
- **Color Mapping:** New modules MUST be mapped in `Navigation.tsx` with a unique color configuration.

## 5. Agent Instructions (Rules of Engagement)
- **Verify:** Always run `compile_applet` after changes.
- **Destructive Actions:** NEVER run bulk deletions or resets without a `window.confirm`.
- **Consistency:** If adding a module, check the directory structure in `/src/components`.
- **Reporting:** All modules requiring printing MUST utilize dedicated `print-CSS` classes provided in the `TimetableContainer`.
