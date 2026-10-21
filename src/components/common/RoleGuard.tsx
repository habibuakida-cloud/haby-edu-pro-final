import React, { useEffect } from 'react';
import { UserAccount } from '../../types';

interface RoleGuardProps {
  currentUser?: UserAccount | null;
  currentView: string;
  onRedirect: (view: string) => void;
  children: React.ReactNode;
}

const ALLOWED_TEACHER_VIEWS = [
  'teacherportal',
  'markentry',
  'classjournal',
  'lessonplans',
  'schemes',
  'timetable',
  'invigilation',
  'attendance',
  'attendance-scan',
  'academiccalendar',
  'studentid',
  'dailytracker',
  'discipline'
];

const RESTRICTED_SUPER_ADMIN_VIEWS = ['network', 'github', 'backup', 'multischool'];

export const RoleGuard: React.FC<RoleGuardProps> = ({
  currentUser,
  currentView,
  onRedirect,
  children
}) => {
  const role = (currentUser?.role || 'TEACHER').toUpperCase();
  const isSuperAdmin = currentUser?.isSuperAdmin || role === 'SUPER_ADMIN' || currentUser?.email === 'habibuakida@gmail.com';

  const shouldRedirectTeacher = role === 'TEACHER' && !isSuperAdmin && !ALLOWED_TEACHER_VIEWS.includes(currentView);
  const shouldRedirectAdmin = (role === 'HEADMASTER' || role === 'ACADEMIC') && !isSuperAdmin && RESTRICTED_SUPER_ADMIN_VIEWS.includes(currentView);

  useEffect(() => {
    if (shouldRedirectTeacher) {
      onRedirect('teacherportal');
    } else if (shouldRedirectAdmin) {
      onRedirect('dashboard');
    }
  }, [shouldRedirectTeacher, shouldRedirectAdmin, onRedirect]);

  if (shouldRedirectTeacher || shouldRedirectAdmin) {
    return null;
  }

  return <>{children}</>;
};

