import React from 'react';
import { NectaNumberStudio } from './NectaNumberStudio';
import { SchoolInfo, Student, UserAccount } from '../../types';

interface NectaRegistrationViewProps {
  schoolInfo?: SchoolInfo;
  students?: Student[];
  currentUser?: UserAccount | null;
}

export const NectaRegistrationView: React.FC<NectaRegistrationViewProps> = ({
  schoolInfo,
  students = [],
  currentUser
}) => {
  return (
    <div className="p-6 max-w-7xl mx-auto font-sans bg-slate-50 min-h-screen">
      <NectaNumberStudio schoolInfo={schoolInfo} students={students} />
    </div>
  );
};
