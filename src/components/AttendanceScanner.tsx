import React, { useState } from 'react';
import { QrReader } from 'react-qr-reader';
import { logAttendance } from '../services/attendanceService';
import { useAuth } from '../context/AuthContext';

export const AttendanceScanner: React.FC = () => {
  const [data, setData] = useState<string | null>(null);
  const { user } = useAuth();

  const handleScan = async (result: any) => {
    if (result) {
      const studentId = result?.text;
      setData(studentId);
      if (user && studentId) {
        try {
          await logAttendance({
            studentId,
            teacherId: (user as any).uid || user.id || 'staff',
            schoolId: user.schoolId || '02dff10d-78fb-4af6-ab5a-db1d275d7e06',
            status: 'PRESENT'
          });
          alert('Attendance logged for ' + studentId);
        } catch (err) {
          console.error(err);
          alert('Failed to log attendance');
        }
      }
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Scan Student ID</h2>
      <QrReader
        onResult={(result, error) => {
          if (result) {
            handleScan(result);
          }
          if (error) {
            console.info(error);
          }
        }}
        constraints={{ facingMode: 'environment' }}
      />
      {data && <p>Last Scanned: {data}</p>}
    </div>
  );
};
