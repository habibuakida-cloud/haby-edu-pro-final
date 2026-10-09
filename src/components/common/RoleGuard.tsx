import React from 'react';
import { UserAccount } from '../../types';

interface RoleGuardProps {
  currentUser?: UserAccount | null;
  currentView: string;
  onRedirect: (view: string) => void;
  children: React.ReactNode;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({
  currentUser,
  currentView,
  onRedirect,
  children
}) => {
  const role = (currentUser?.role || 'TEACHER').toUpperCase();
  const isSuperAdmin = currentUser?.isSuperAdmin || role === 'SUPER_ADMIN' || currentUser?.email === 'habibuakida@gmail.com';

  // 1. TEACHER role: allowed only teacherportal / teacher related views (/teacher)
  if (role === 'TEACHER' && !isSuperAdmin) {
    const allowedTeacherViews = ['teacherportal', 'markentry', 'classjournal', 'lessonplans', 'schemes', 'timetable', 'invigilation'];
    if (!allowedTeacherViews.includes(currentView)) {
      onRedirect('teacherportal');
      return null;
    }
  }

  // 2. HEADMASTER / ACADEMIC role: allowed /school-admin and /teacher routes, but not super admin network
  if ((role === 'HEADMASTER' || role === 'ACADEMIC') && !isSuperAdmin) {
    const restrictedSuperAdminViews = ['network', 'github', 'backup', 'multischool'];
    if (restrictedSuperAdminViews.includes(currentView)) {
      onRedirect('dashboard');
      return null;
    }
  }

  return <>{children}</>;
};
