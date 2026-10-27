import { 
  TimetableAssignment, 
  Teacher, 
  PeriodSetting, 
  StreamSetting, 
  SchoolInfo 
} from '../types';
import { downloadFile, escapeCSV } from './export';
import { exportTimetablePDF } from './timetablePdfExport';
import { exportGeneralTimetableExcel } from './timetableExcelExport';

export interface AdminExportOptions {
  assignments: TimetableAssignment[];
  teachers: Teacher[];
  periodSettings: PeriodSetting[];
  streamSettings: StreamSetting[];
  schoolInfo?: SchoolInfo;
  schoolName?: string;
  selectedClass?: string;
  selectedStream?: string;
  selectedDay?: string;
  orientation?: 'portrait' | 'landscape';
  adminNote?: string;
  academicYear?: string;
}

/**
 * Export Official Administrative Timetable CSV
 */
export function exportAdministrativeTimetableCSV(
  options: AdminExportOptions,
  filename: string = 'Official_School_Timetable_Directory.csv'
) {
  const {
    assignments = [],
    teachers = [],
    periodSettings = [],
    streamSettings = [],
    schoolInfo,
    schoolName = 'HABY EDUPRO ACADEMY',
    adminNote,
    academicYear = `${new Date().getFullYear()}`
  } = options;

  const lines: string[] = [
    escapeCSV((schoolInfo?.name || schoolName || 'HABY EDUPRO ACADEMY').toUpperCase()),
    escapeCSV('OFFICIAL ACADEMIC TIMETABLE & TEACHER DUTY ALLOCATION DIRECTORY'),
    escapeCSV(`Academic Year: ${academicYear} | Issued Date: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`),
    escapeCSV(`Address: ${schoolInfo?.address || 'P.O. BOX 145'} | Phone: ${schoolInfo?.phone || '0717616343'} | Email: ${schoolInfo?.email || 'info@school.ac.tz'}`),
    escapeCSV(`Total Scheduled Periods: ${assignments.length}`),
    adminNote ? escapeCSV(`Note: ${adminNote}`) : '',
    '',
    [
      'Class / Form',
      'Stream',
      'Day',
      'Period Slot',
      'Start Time',
      'End Time',
      'Subject Title',
      'Activity Type',
      'Assigned Teacher',
      'Teacher Initial',
      'Room / Lab Venue',
      'Special Instructions'
    ].map(h => escapeCSV(h)).join(',')
  ];

  const dayOrder: Record<string, number> = {
    'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4, 'Friday': 5, 'Saturday': 6, 'Sunday': 7
  };

  const sortedAssignments = [...assignments].sort((a, b) => {
    const classComp = (a.className || '').localeCompare(b.className || '');
    if (classComp !== 0) return classComp;
    const streamComp = (a.stream || '').localeCompare(b.stream || '');
    if (streamComp !== 0) return streamComp;
    const dayComp = (dayOrder[a.day || 'Monday'] || 99) - (dayOrder[b.day || 'Monday'] || 99);
    if (dayComp !== 0) return dayComp;
    return (a.period || '').localeCompare(b.period || '');
  });

  sortedAssignments.forEach(a => {
    const teacher = teachers.find(t => t.id === a.teacherId);
    
    let start = '';
    let end = '';
    if (a.period) {
      const match = a.period.match(/(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})/);
      if (match) {
        start = match[1];
        end = match[2];
      }
    }

    lines.push([
      escapeCSV(a.className),
      escapeCSV(a.stream),
      escapeCSV(a.day),
      escapeCSV(a.period),
      escapeCSV(start),
      escapeCSV(end),
      escapeCSV(a.subject),
      escapeCSV(a.activityType || 'academic'),
      escapeCSV(teacher ? teacher.name : 'Unassigned / Activity'),
      escapeCSV(teacher ? (teacher.initial || 'T') : '--'),
      escapeCSV(a.room || 'Regular Classroom'),
      escapeCSV(a.customNote || '')
    ].join(','));
  });

  lines.push('');
  lines.push(escapeCSV('OFFICIAL APPROVAL & SIGN-OFF'));
  lines.push(escapeCSV('Prepared By (Academic Master): _______________________ Signature: ____________ Date: _________'));
  lines.push(escapeCSV('Approved By (Headmaster / Principal): __________________ Signature: ____________ Date: _________ Official School Stamp: [  ]'));

  downloadFile(filename, lines.filter(l => l !== null && l !== undefined).join('\n'));
}

/**
 * Export Official Administrative Timetable PDF
 */
export async function exportAdministrativeTimetablePDF(
  options: AdminExportOptions
): Promise<void> {
  await exportTimetablePDF({
    viewMode: 'general',
    assignments: options.assignments,
    teachers: options.teachers,
    periodSettings: options.periodSettings,
    streamSettings: options.streamSettings,
    schoolInfo: options.schoolInfo,
    schoolName: options.schoolName || options.schoolInfo?.name || 'HABY EDUPRO ACADEMY',
    selectedClass: options.selectedClass || 'All',
    selectedStream: options.selectedStream || 'All',
    selectedDay: options.selectedDay || 'All',
    orientation: options.orientation || 'landscape'
  });
}
