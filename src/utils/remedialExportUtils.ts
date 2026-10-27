import { SchoolInfo } from '../types';
import { RemedialTimetableEntry } from '../lib/remedialService';

interface ExportCSVOptions {
  entries: RemedialTimetableEntry[];
  schoolInfo?: SchoolInfo;
  className?: string;
  streamName?: string;
  academicYear?: string;
}

/**
 * Exports remedial timetable sessions to an Excel-compatible CSV file.
 */
export function exportRemedialTimetableCSV(
  optionsOrEntries: ExportCSVOptions | RemedialTimetableEntry[],
  optionalFileNameOrClass?: string,
  optionalSchoolInfo?: SchoolInfo
): void {
  let entries: RemedialTimetableEntry[];
  let schoolInfo: SchoolInfo | undefined;
  let className = 'All';
  let streamName = 'All';
  let academicYear = new Date().getFullYear().toString();
  let customFilename: string | undefined;

  if (Array.isArray(optionsOrEntries)) {
    entries = optionsOrEntries;
    schoolInfo = optionalSchoolInfo;
    if (optionalFileNameOrClass) {
      customFilename = optionalFileNameOrClass;
      className = optionalFileNameOrClass;
    }
  } else {
    entries = optionsOrEntries.entries;
    schoolInfo = optionsOrEntries.schoolInfo;
    className = optionsOrEntries.className || 'All';
    streamName = optionsOrEntries.streamName || 'All';
    academicYear = optionsOrEntries.academicYear || new Date().getFullYear().toString();
  }

  const schoolName = schoolInfo?.name || 'HABY SECONDARY SCHOOL';
  const title = `RATIBA YA REMEDIAL - ${schoolName.toUpperCase()} - ${academicYear}`;

  const headers = [
    'Tarehe',
    'Siku ya Wiki',
    'Darasa',
    'Mkondo (Stream)',
    'Somo',
    'Mwalimu Mhusika',
    'Muda wa Kuanza',
    'Muda wa Kuisha',
    'Muda (Dakika)',
    'Chumba / Eneo (Venue)',
    'Walengwa (Wanafunzi)',
    'Muhula'
  ];

  const rows = entries.map(e => {
    const startM = e.start_time ? parseInt(e.start_time.split(':')[0], 10) * 60 + parseInt(e.start_time.split(':')[1] || '0', 10) : 0;
    const endM = e.end_time ? parseInt(e.end_time.split(':')[0], 10) * 60 + parseInt(e.end_time.split(':')[1] || '0', 10) : 0;
    const duration = endM > startM ? endM - startM : (e.duration_minutes || 60);

    const targetDesc = e.target_type === 'TARGETED_STUDENTS' 
      ? `Wanafunzi Maalum (${e.target_student_ids?.length || 0})`
      : 'Darasa Zima';

    return [
      `"${e.date || 'Inayojirudia'}"`,
      `"${e.day_of_week}"`,
      `"${e.class_name}"`,
      `"${e.stream}"`,
      `"${e.subject}"`,
      `"${e.teacher_name}"`,
      `"${e.start_time}"`,
      `"${e.end_time}"`,
      `"${duration}"`,
      `"${e.room || 'Classroom'}"`,
      `"${targetDesc}"`,
      `"${e.term || 'Term 1'}"`
    ].join(',');
  });

  const csvContent = [
    `"${title}"`,
    `"Darasa: ${className} | Mkondo: ${streamName} | Tarehe ya Kutolewa: ${new Date().toLocaleDateString('sw-TZ')}"`,
    '',
    headers.join(','),
    ...rows
  ].join('\r\n');

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  const cleanClassName = (customFilename || `Ratiba_ya_Remedial_${className}_${academicYear}`).replace(/\s+/g, '_');
  link.setAttribute('download', cleanClassName.endsWith('.csv') ? cleanClassName : `${cleanClassName}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
