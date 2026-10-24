import React from 'react';
import { NectaNumberStudio } from './NectaNumberStudio';
import { SchoolInfo, Student, UserAccount } from '../../types';

interface NectaRegistrationViewProps {
  schoolId?: string;
  schoolInfo?: SchoolInfo;
  students?: Student[];
  currentUser?: UserAccount | null;
  onUpdateStudents?: (students: Student[]) => void;
  onSaveSchoolInfo?: (schoolInfo: SchoolInfo) => void;
}

export const NectaRegistrationView: React.FC<NectaRegistrationViewProps> = ({
  schoolId,
  schoolInfo,
  students = [],
  currentUser,
  onUpdateStudents,
  onSaveSchoolInfo
}) => {
  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto font-sans bg-slate-50 min-h-screen">
      <NectaNumberStudio
        schoolId={schoolId}
        schoolInfo={schoolInfo}
        students={students}
        onUpdateStudents={onUpdateStudents}
        onSaveSchoolInfo={onSaveSchoolInfo}
      />
    </div>
  );
};

