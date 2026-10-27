import React, { useEffect } from 'react';
import { UserAccount } from '../../types';

interface RoleGuardProps {
  currentUser?: UserAccount | null;
  currentView: string;
  onRedirect: (view: string) => void;
  children: React.ReactNode;
}

const ALLOWED_TEACHER_VIEWS = [
  'dashboard',
  'teacherportal',
  'teachers',
  'monitordashboard',
  'journalreport',
  'markentry',
  'classjournal',
  'lessonplans',
  'schemes',
  'timetable',
  'invigilation',
  'attendance',
  'attendance-scan',
  'teacher-attendance',
  'staff-payroll',
  'academiccalendar',
  'studentid',
  'dailytracker',
  'discipline',
  'sms',
  'officialletters',
  'sittingplan',
  'nectaexamreports',
  'jointexams',
  'envelope-cover',
  'invigilation-calendar'
];

const RESTRICTED_SUPER_ADMIN_VIEWS = ['network', 'github', 'backup', 'multischool'];

export const RoleGuard: React.FC<RoleGuardProps> = ({
  currentUser,
  currentView,
  onRedirect,
  children
}) => {
  const rawRole = String(currentUser?.role || 'TEACHER').trim().toUpperCase().replace(/[\s_-]+/g, '_');
  const isSuperAdmin = currentUser?.isSuperAdmin || rawRole === 'SUPER_ADMIN' || currentUser?.email === 'habibuakida@gmail.com';
  const isTeacher = !isSuperAdmin && (rawRole.includes('TEACHER') || rawRole === 'MWALIMU');
  const isMonitor = !isSuperAdmin && (rawRole.includes('MONITOR') || rawRole.includes('MONITRESS'));

  const ALLOWED_MONITOR_VIEWS = ['monitordashboard', 'journalreport'];
  const shouldRedirectMonitor = isMonitor && !ALLOWED_MONITOR_VIEWS.includes(currentView);
  const shouldRedirectTeacher = isTeacher && !ALLOWED_TEACHER_VIEWS.includes(currentView);
  const shouldRedirectAdmin = (rawRole === 'HEADMASTER' || rawRole === 'ACADEMIC') && !isSuperAdmin && RESTRICTED_SUPER_ADMIN_VIEWS.includes(currentView);

  useEffect(() => {
    if (shouldRedirectMonitor) {
      onRedirect('monitordashboard');
    } else if (shouldRedirectTeacher) {
      onRedirect('teacherportal');
    } else if (shouldRedirectAdmin) {
      onRedirect('dashboard');
    }
  }, [shouldRedirectMonitor, shouldRedirectTeacher, shouldRedirectAdmin, onRedirect]);

  // Never return blank null permanently; allow child view to render cleanly
  if (shouldRedirectMonitor || shouldRedirectTeacher || shouldRedirectAdmin) {
    return null;
  }

  return <>{children}</>;
};
