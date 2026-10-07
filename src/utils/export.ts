import { TimetableAssignment, Teacher, InvigilationSession, PeriodSetting } from '../types';

/**
 * Download arbitrary content as a file with specified MIME type
 */
export function downloadFile(filename: string, content: string, mimeType: string = 'text/csv;charset=utf-8;') {
  const blob = new Blob([content], { type: mimeType });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Escape CSV string according to RFC 4180 standard
 */
export function escapeCSV(val: any): string {
  if (val === null || val === undefined) return '""';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

/**
 * Export General Timetable to CSV
 */
export function exportTimetableToCSV(
  assignments: TimetableAssignment[],
  teachers: Teacher[],
  filename: string = 'General_Teaching_Timetable.csv'
) {
  const headers = ['Class / Form', 'Stream', 'Day', 'Period / Time', 'Subject', 'Activity Type', 'Teacher Name', 'Teacher Initial', 'Room / Notes'];
  
  const rows = assignments.map(a => {
    const teacher = teachers.find(t => t.id === a.teacherId);
    return [
      escapeCSV(a.className),
      escapeCSV(a.stream),
      escapeCSV(a.day),
      escapeCSV(a.period),
      escapeCSV(a.subject),
      escapeCSV(a.activityType || 'academic'),
      escapeCSV(teacher ? teacher.name : 'Unassigned / Activity'),
      escapeCSV(teacher ? teacher.initial : '--'),
      escapeCSV(a.room || a.customNote || '')
    ].join(',');
  });

  const csvContent = [headers.join(','), ...rows].join('\n');
  downloadFile(filename, csvContent);
}

/**
 * Export Matrix Grid Timetable to CSV (Days across columns, Periods down rows)
 */
export function exportClassTimetableGridToCSV(
  className: string,
  stream: string,
  days: string[],
  periods: PeriodSetting[],
  assignments: TimetableAssignment[],
  teachers: Teacher[]
) {
  const headers = ['Period / Time', ...days.map(d => escapeCSV(d))];
  
  // Unique periods by name and times
  const uniquePeriodKeys = Array.from(new Set(periods.map(p => `${p.name} (${p.start}-${p.end})`)));

  const rows = uniquePeriodKeys.map(periodKey => {
    const row = [escapeCSV(periodKey)];
    days.forEach(day => {
      const match = assignments.find(a => 
        a.className === className &&
        a.stream === stream &&
        a.day === day &&
        a.period === periodKey
      );
      if (match) {
        const teacher = teachers.find(t => t.id === match.teacherId);
        row.push(escapeCSV(`${match.subject} (${teacher?.initial || '--'})`));
      } else {
        row.push(escapeCSV('—'));
      }
    });
    return row.join(',');
  });

  const csvContent = [
    escapeCSV(`TIMETABLE FOR ${className} - ${stream}`),
    headers.join(','),
    ...rows
  ].join('\n');

  downloadFile(`${className.replace(/\s+/g, '_')}_${stream.replace(/\s+/g, '_')}_Timetable.csv`, csvContent);
}

/**
 * Export Invigilation Timetable to CSV
 */
export function exportInvigilationToCSV(
  sessions: InvigilationSession[],
  teachers: Teacher[],
  assignments: Record<string, number>,
  filename: string = 'Invigilation_Schedule.csv'
) {
  const headers = ['Date', 'Day', 'Session', 'Time', 'Exam Title / Subject', 'Class / Form', 'Stream', 'Rooms', 'Assigned Invigilators'];

  const rows = sessions.map(session => {
    const invigilators: string[] = [];
    for (let r = 0; r < session.rooms; r++) {
      const key = `${session.id}_room${r}`;
      const teacherId = assignments[key];
      const teacher = teachers.find(t => t.id === teacherId);
      invigilators.push(`Room ${r + 1}: ${teacher ? `${teacher.name} (${teacher.initial})` : 'Unassigned'}`);
    }

    return [
      escapeCSV(session.date),
      escapeCSV(session.day),
      escapeCSV(session.session),
      escapeCSV(`${session.start} - ${session.end}`),
      escapeCSV(session.subject),
      escapeCSV(session.className),
      escapeCSV(session.stream),
      escapeCSV(session.rooms),
      escapeCSV(invigilators.join('; '))
    ].join(',');
  });

  const csvContent = [headers.join(','), ...rows].join('\n');
  downloadFile(filename, csvContent);
}

/**
 * Export Timetable to iCalendar (.ics / iCal) format
 */
export function exportTimetableToICal(
  assignments: TimetableAssignment[],
  teachers: Teacher[],
  schoolName: string = 'HabyEduPro3A',
  filename: string = 'Teaching_Timetable.ics'
) {
  const dayMap: Record<string, string> = {
    'Monday': 'MO',
    'Tuesday': 'TU',
    'Wednesday': 'WE',
    'Thursday': 'TH',
    'Friday': 'FR',
    'Saturday': 'SA',
    'Sunday': 'SU'
  };

  // Base Monday reference date
  const now = new Date();
  const year = now.getFullYear();
  const pad = (n: number) => String(n).padStart(2, '0');
  const nowStamp = `${year}${pad(now.getMonth() + 1)}${pad(now.getDate())}T${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}Z`;

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//HabyEduPro//School Timetable//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${schoolName.replace(/[,;]/g, ' ')} - Teaching Timetable`,
    `X-WR-TIMEZONE:Africa/Dar_es_Salaam`
  ];

  assignments.forEach((a, idx) => {
    const teacher = teachers.find(t => t.id === a.teacherId);
    const byDay = dayMap[a.day] || 'MO';

    // Parse start and end time from period string e.g. "Period 1 (08:00 - 08:40)"
    let startHour = 8, startMin = 0, endHour = 8, endMin = 40;
    const timeMatch = a.period.match(/(\d{1,2}):(\d{2})\s*[-–]\s*(\d{1,2}):(\d{2})/);
    if (timeMatch) {
      startHour = parseInt(timeMatch[1], 10);
      startMin = parseInt(timeMatch[2], 10);
      endHour = parseInt(timeMatch[3], 10);
      endMin = parseInt(timeMatch[4], 10);
    }

    // Offset day from Monday
    const dayOffsets: Record<string, number> = {
      'Monday': 0, 'Tuesday': 1, 'Wednesday': 2, 'Thursday': 3, 'Friday': 4, 'Saturday': 5, 'Sunday': 6
    };
    const offset = dayOffsets[a.day] || 0;
    const dummyDate = 5 + offset; // Mon Oct 5, 2026

    const dtStart = `202610${pad(dummyDate)}T${pad(startHour)}${pad(startMin)}00`;
    const dtEnd = `202610${pad(dummyDate)}T${pad(endHour)}${pad(endMin)}00`;

    const summary = `${a.subject} [${a.className} - ${a.stream}]`;
    const teacherInfo = teacher ? `${teacher.name} (${teacher.initial})` : 'Unassigned / Activity';
    const description = `Subject: ${a.subject}\\nClass: ${a.className} ${a.stream}\\nTeacher: ${teacherInfo}\\nRoom: ${a.room || 'Regular Classroom'}\\nSchool: ${schoolName}`;

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:tt_${a.id || idx}_${Date.now()}@habyedupro`);
    lines.push(`DTSTAMP:${nowStamp}`);
    lines.push(`DTSTART:${dtStart}`);
    lines.push(`DTEND:${dtEnd}`);
    lines.push(`RRULE:FREQ=WEEKLY;BYDAY=${byDay}`);
    lines.push(`SUMMARY:${summary.replace(/[\n\r]/g, ' ')}`);
    lines.push(`DESCRIPTION:${description.replace(/[\r]/g, '')}`);
    lines.push(`LOCATION:${(a.room || `${a.className} ${a.stream}`).replace(/[\n\r]/g, ' ')}`);
    lines.push('STATUS:CONFIRMED');
    lines.push('END:VEVENT');
  });

  lines.push('END:VCALENDAR');
  downloadFile(filename, lines.join('\r\n'), 'text/calendar;charset=utf-8');
}

/**
 * Export Invigilation Schedule to iCalendar (.ics / iCal) format
 */
export function exportInvigilationToICal(
  sessions: InvigilationSession[],
  teachers: Teacher[],
  assignments: Record<string, number>,
  schoolName: string = 'HabyEduPro3A',
  filename: string = 'Invigilation_Schedule.ics'
) {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const nowStamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}T${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}Z`;

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//HabyEduPro//School Invigilation//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${schoolName.replace(/[,;]/g, ' ')} - Invigilation Duties`,
    `X-WR-TIMEZONE:Africa/Dar_es_Salaam`
  ];

  sessions.forEach(session => {
    // Parse start and end time
    let startHour = 8, startMin = 0, endHour = 10, endMin = 30;
    if (session.start) {
      const [h, m] = session.start.split(':').map(Number);
      if (!isNaN(h)) startHour = h;
      if (!isNaN(m)) startMin = m;
    }
    if (session.end) {
      const [h, m] = session.end.split(':').map(Number);
      if (!isNaN(h)) endHour = h;
      if (!isNaN(m)) endMin = m;
    }

    // Determine event date
    let dateStr = session.rawDate || session.date;
    let cleanDate = '20261015';
    if (dateStr && dateStr.includes('-')) {
      const [y, m, d] = dateStr.split('-');
      cleanDate = `${y}${pad(Number(m))}${pad(Number(d))}`;
    }

    const dtStart = `${cleanDate}T${pad(startHour)}${pad(startMin)}00`;
    const dtEnd = `${cleanDate}T${pad(endHour)}${pad(endMin)}00`;

    const invigList: string[] = [];
    for (let r = 0; r < session.rooms; r++) {
      const key = `${session.id}_room${r}`;
      const teacherId = assignments[key];
      const teacher = teachers.find(t => t.id === teacherId);
      invigList.push(`Room ${r + 1}: ${teacher ? `${teacher.name} (${teacher.initial})` : 'Unassigned'}`);
    }

    const summary = `Invigilation: ${session.subject} [${session.className} ${session.stream}]`;
    const description = `Session: ${session.session}\\nSubject: ${session.subject}\\nClass: ${session.className} ${session.stream}\\nRooms Scheduled: ${session.rooms}\\n\\nInvigilators Assigned:\\n${invigList.join('\\n')}\\n\\nSchool: ${schoolName}`;

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:invig_${session.id}_${Date.now()}@habyedupro`);
    lines.push(`DTSTAMP:${nowStamp}`);
    lines.push(`DTSTART:${dtStart}`);
    lines.push(`DTEND:${dtEnd}`);
    lines.push(`SUMMARY:${summary.replace(/[\n\r]/g, ' ')}`);
    lines.push(`DESCRIPTION:${description.replace(/[\r]/g, '')}`);
    lines.push(`LOCATION:Examination Center - ${session.className}`);
    lines.push('STATUS:CONFIRMED');
    lines.push('END:VEVENT');
  });

  lines.push('END:VCALENDAR');
  downloadFile(filename, lines.join('\r\n'), 'text/calendar;charset=utf-8');
}

/**
 * Print a targeted DOM element with school letterhead formatting and custom orientation (A4 portrait or landscape)
 */
export function printFormattedSection(
  elementId: string, 
  title: string, 
  schoolName: string = 'HabyEduPro3A',
  options?: {
    orientation?: 'portrait' | 'landscape';
    pageSize?: string;
    margin?: string;
    hideLetterhead?: boolean;
    fontSize?: 'normal' | 'large' | 'extralarge';
  }
) {
  const el = document.getElementById(elementId);
  if (!el) {
    window.print();
    return;
  }

  const orientation = options?.orientation || 'landscape';
  const pageSize = options?.pageSize || 'A4';
  const margin = options?.margin || (orientation === 'landscape' ? '6mm' : '8mm');
  const sizeOption = options?.fontSize || 'large';

  // Font size configuration (MUCH larger, crisp, and high-contrast)
  let tableFontSize = '13px';
  let thFontSize = '12px';
  let badgeFontSize = '11px';
  let headerTitleSize = '22px';
  let subTitleSize = '14px';

  if (sizeOption === 'extralarge') {
    tableFontSize = '15px';
    thFontSize = '13px';
    badgeFontSize = '12px';
    headerTitleSize = '25px';
    subTitleSize = '16px';
  } else if (sizeOption === 'normal') {
    tableFontSize = '12px';
    thFontSize = '11px';
    badgeFontSize = '10px';
  }

  // Collect existing stylesheets to preserve tailwind classes in popup
  const styleElements = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
    .map(el => el.outerHTML)
    .join('\n');

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    window.print();
    return;
  }

  printWindow.document.write(`
    <!doctype html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <title>${title} - ${schoolName}</title>
      ${styleElements}
      <style>
        @page {
          size: ${pageSize} ${orientation};
          margin: ${margin};
        }
        *, *::before, *::after {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color-adjust: exact !important;
          box-sizing: border-box !important;
        }
        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          color: #000000;
          margin: 0;
          padding: 0;
          background: #ffffff;
          font-size: ${tableFontSize};
          line-height: 1.25;
          width: 100%;
        }
        #print-root {
          width: 100% !important;
        }
        table {
          width: 100% !important;
          border-collapse: collapse !important;
          table-layout: fixed !important;
          font-size: ${tableFontSize} !important;
          margin-bottom: 12px !important;
          border: 2px solid #000000 !important;
        }
        th, td {
          border: 1px solid #000000 !important;
          padding: 6px 4px !important;
          text-align: left;
          vertical-align: top;
          word-wrap: break-word !important;
          overflow-wrap: break-word !important;
        }
        th {
          background-color: #f1f5f9 !important;
          color: #000000 !important;
          font-weight: 800 !important;
          text-transform: uppercase;
          font-size: ${thFontSize} !important;
          text-align: center;
        }
        tr:nth-child(even) td {
          background-color: #fafafa !important;
        }
        .print-header {
          text-align: center;
          margin-bottom: 24px;
          border-bottom: 4px solid #000000;
          padding-bottom: 12px;
        }
        .print-header h1 {
          margin: 0;
          font-size: ${headerTitleSize};
          font-weight: 900;
          color: #000000;
          text-transform: uppercase;
        }
        .print-header h2 {
          margin: 6px 0 0 0;
          font-size: ${subTitleSize};
          font-weight: 800;
          color: #000000;
          text-transform: uppercase;
        }
        .print-header p {
          margin: 4px 0 0 0;
          font-size: 11px;
          color: #000000;
          font-weight: 600;
        }
        .badge, .tag {
          display: inline-block;
          padding: 3px 7px;
          border-radius: 4px;
          font-size: ${badgeFontSize};
          font-weight: 700;
        }
        .no-print {
          display: none !important;
        }
        .print-avoid-break {
          page-break-inside: avoid !important;
          break-inside: avoid !important;
          margin-bottom: 16px !important;
          display: block !important;
        }
        @media print {
          body { 
            padding: 0; 
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print { display: none !important; }
          
          #print-root {
            width: 100% !important;
          }

          table {
            page-break-inside: auto;
            width: 100% !important;
          }

          /* Clear and legible master timetable on A4 */
          .master-timetable-container table {
            font-size: ${tableFontSize} !important;
          }
          
          .master-timetable-container th, 
          .master-timetable-container td {
            padding: 5px 6px !important;
            border: 1.5px solid #334155 !important;
          }

          /* Bold subject labels and high contrast teacher initials */
          .timetable-subject-text {
            font-size: ${tableFontSize} !important;
            font-weight: 800 !important;
            color: #0f172a !important;
          }
          .timetable-teacher-badge {
            font-size: ${badgeFontSize} !important;
            font-weight: 800 !important;
            padding: 2px 5px !important;
          }
        }
      </style>
    </head>
    <body>
      <div>
        ${options?.hideLetterhead ? '' : `
        <div class="print-header">
          <h1>${schoolName}</h1>
          <h2>${title}</h2>
          <p>Official School Academic Schedule • Generated on ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
        </div>`}
        <div id="print-root">
          ${el.innerHTML}
        </div>
      </div>
    </body>
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 400);
}

/**
 * Specifically print the A4 Report Card Document in either Portrait or Landscape
 */
export function printReportCardDocument(
  elementId: string, 
  orientation: 'portrait' | 'landscape',
  studentName: string,
  schoolName: string = 'HabyEduPro3A'
) {
  printFormattedSection(
    elementId,
    `Student Progress Report Card - ${studentName}`,
    schoolName,
    {
      orientation,
      pageSize: 'A4',
      margin: orientation === 'landscape' ? '6mm' : '8mm',
      hideLetterhead: true // The Report Card document has its own comprehensive official letterhead
    }
  );
}
