import * as XLSX from 'xlsx';
import { 
  TimetableAssignment, 
  Teacher, 
  PeriodSetting, 
  StreamSetting, 
  SchoolInfo,
  InvigilationSession
} from '../types';
import { DAYS_OF_WEEK } from '../constants/defaults';

interface ExcelGeneralTimetableOptions {
  schoolName: string;
  selectedClass: string;
  selectedStream: string;
  selectedDay: string;
  assignments: TimetableAssignment[];
  teachers: Teacher[];
  periodSettings: PeriodSetting[];
  streamSettings: StreamSetting[];
  schoolInfo?: SchoolInfo;
}

/**
 * Cleanly format periods list
 */
function getNormalizedPeriods(periodSettings: PeriodSetting[]) {
  if (periodSettings && periodSettings.length > 0) {
    return periodSettings.map(p => ({
      name: p.name,
      time: p.start && p.end ? `${p.start} - ${p.end}` : '',
      isBreak: Boolean(p.isBreak)
    }));
  }
  return [
    { name: 'PERIOD 1', time: '08:00 - 08:40', isBreak: false },
    { name: 'PERIOD 2', time: '08:40 - 09:20', isBreak: false },
    { name: 'PERIOD 3', time: '09:20 - 10:00', isBreak: false },
    { name: 'BREAK', time: '10:00 - 10:30', isBreak: true },
    { name: 'PERIOD 4', time: '10:30 - 11:10', isBreak: false },
    { name: 'PERIOD 5', time: '11:10 - 11:50', isBreak: false },
    { name: 'LUNCH', time: '11:50 - 12:40', isBreak: true },
    { name: 'PERIOD 6', time: '12:40 - 01:20', isBreak: false },
    { name: 'PERIOD 7', time: '01:20 - 02:00', isBreak: false },
    { name: 'PERIOD 8', time: '02:00 - 02:40', isBreak: false }
  ];
}

/**
 * 1. Export Master / General Timetable to XLSX
 */
export function exportGeneralTimetableExcel(options: ExcelGeneralTimetableOptions): void {
  const {
    schoolName = 'HABY EDUPRO ACADEMY',
    selectedClass = 'All',
    selectedStream = 'All',
    selectedDay = 'All',
    assignments,
    teachers,
    periodSettings,
    schoolInfo
  } = options;

  const periods = getNormalizedPeriods(periodSettings);
  const teacherMap = new Map<number | string, Teacher>();
  teachers.forEach(t => teacherMap.set(t.id, t));

  const wb = XLSX.utils.book_new();

  // ----------------------------------------------------
  // SHEET 1: MASTER TIMETABLE GRID (Exactly like the system design)
  // ----------------------------------------------------
  const gridRows: (string | number)[][] = [];

  // Header Title Banners
  gridRows.push([`${(schoolInfo?.name || schoolName).toUpperCase()} - RATIBA RASMI YA MASOMO`]);
  gridRows.push([`ANWANI: ${schoolInfo?.address || 'P.O. BOX 145, TANGA'} | SIMU: ${schoolInfo?.phone || '0717616343'} | BARUA PEPE: ${schoolInfo?.email || 'info@school.ac.tz'}`]);
  gridRows.push([`DARASA: ${selectedClass.toUpperCase()} | MKONDO: ${selectedStream.toUpperCase()} | SIKU: ${selectedDay.toUpperCase()} | TAREHE: ${new Date().toLocaleDateString('en-GB')}`]);
  gridRows.push([]); // blank separator

  // Table Column Headers: SIKU | DARASA & MKONDO | [PERIOD 1 (Time)] | ...
  const tableHeaderRow: string[] = ['SIKU (DAY)', 'DARASA & MKONDO'];
  periods.forEach(p => {
    tableHeaderRow.push(p.time ? `${p.name} (${p.time})` : p.name);
  });
  gridRows.push(tableHeaderRow);

  // Group assignments by Day and Class/Stream
  const activeDays = DAYS_OF_WEEK.filter(d => selectedDay === 'All' || selectedDay === d);
  
  // Find all unique classes/streams in assignments or defaults
  const classStreamPairs: { className: string; stream: string }[] = [];
  const seenPairKeys = new Set<string>();

  assignments.forEach(a => {
    if (!a.className) return;
    if (selectedClass !== 'All' && a.className.toLowerCase() !== selectedClass.toLowerCase()) return;
    if (selectedStream !== 'All' && a.stream && !a.stream.toLowerCase().includes(selectedStream.toLowerCase())) return;

    const key = `${a.className}_${a.stream || 'ALL'}`;
    if (!seenPairKeys.has(key)) {
      seenPairKeys.add(key);
      classStreamPairs.push({ className: a.className, stream: a.stream || 'ALL' });
    }
  });

  // Sort pairs logically (Form 1 -> Form 4)
  classStreamPairs.sort((a, b) => a.className.localeCompare(b.className) || a.stream.localeCompare(b.stream));

  if (classStreamPairs.length === 0) {
    classStreamPairs.push({ className: selectedClass !== 'All' ? selectedClass : 'Form 1', stream: selectedStream !== 'All' ? selectedStream : 'STREAM A' });
  }

  activeDays.forEach(day => {
    classStreamPairs.forEach((pair, pairIdx) => {
      const rowData: (string | number)[] = [
        pairIdx === 0 ? day.toUpperCase() : '', // Merge visual or blank for clean look
        `${pair.className} ${pair.stream !== 'ALL' ? pair.stream : ''}`.trim()
      ];

      periods.forEach(period => {
        if (period.isBreak) {
          rowData.push(`[${period.name}]`);
          return;
        }

        const normPeriod = period.name.split(' (')[0].trim().toLowerCase();
        const match = assignments.find(a => {
          if (!a) return false;
          const matchDay = (a.day || '').toLowerCase() === day.toLowerCase();
          const matchClass = (a.className || '').toLowerCase() === pair.className.toLowerCase();
          const matchStream = pair.stream === 'ALL' || !a.stream || a.stream.toLowerCase().includes(pair.stream.toLowerCase());
          const aPeriod = (a.periodName || a.period || '').split(' (')[0].trim().toLowerCase();
          return matchDay && matchClass && matchStream && (aPeriod === normPeriod || aPeriod.includes(normPeriod));
        });

        if (match) {
          const tObj = match.teacherId !== undefined ? teacherMap.get(match.teacherId) : null;
          const tInitial = tObj?.initial || (tObj ? tObj.name.substring(0, 2).toUpperCase() : '');
          const label = tInitial ? `${match.subject} (${tInitial})` : match.subject;
          rowData.push(label);
        } else {
          rowData.push('—');
        }
      });

      gridRows.push(rowData);
    });
    gridRows.push([]); // visual spacing between days
  });

  const wsGrid = XLSX.utils.aoa_to_sheet(gridRows);

  // Set column widths
  const colWidths = [
    { wch: 15 }, // Siku
    { wch: 22 }, // Darasa & Mkondo
    ...periods.map(p => ({ wch: Math.max(16, p.name.length + 8) }))
  ];
  wsGrid['!cols'] = colWidths;
  XLSX.utils.book_append_sheet(wb, wsGrid, 'Ratiba Kuu (Grid)');

  // ----------------------------------------------------
  // SHEET 2: TEACHING LOADS (Mzigo wa Walimu)
  // ----------------------------------------------------
  const loadRows: (string | number)[][] = [
    [`${schoolName.toUpperCase()} - UCHAMBUZI WA MZIGO WA WALIMU (TEACHING WORKLOAD)`],
    [`TAREHE: ${new Date().toLocaleDateString('en-GB')}`],
    [],
    ['#', 'JINA LA MWALIMU', 'INITIAL', 'CHEO CHA SHULE', 'MASOMO ANAYOFUNDISHA', 'VIPINDI VILIVYOPANGWA', 'KIWANGO CHA WIKI', 'HALI']
  ];

  teachers.forEach((t, idx) => {
    const assignedCount = assignments.filter(a => {
      if (a.teacherId === t.id) return true;
      const aName = ((a as any).teacher || '').toLowerCase();
      return aName === t.name.toLowerCase() || (t.initial && aName === t.initial.toLowerCase());
    }).length;

    const maxPeriods = t.maxPeriodsPerWeek || 20;
    const status = assignedCount === maxPeriods ? 'Kamili (Optimum)' : assignedCount > maxPeriods ? 'Imezidi Kiwango' : 'Inapatikana';

    loadRows.push([
      idx + 1,
      t.name,
      t.initial || '--',
      t.schoolRole || 'Teacher',
      t.subjects?.join(', ') || 'N/A',
      assignedCount,
      maxPeriods,
      status
    ]);
  });

  const wsLoads = XLSX.utils.aoa_to_sheet(loadRows);
  wsLoads['!cols'] = [
    { wch: 6 },
    { wch: 28 },
    { wch: 10 },
    { wch: 22 },
    { wch: 35 },
    { wch: 22 },
    { wch: 18 },
    { wch: 20 }
  ];
  XLSX.utils.book_append_sheet(wb, wsLoads, 'Mzigo wa Walimu');

  // ----------------------------------------------------
  // SHEET 3: ORODHA YA VIPINDI VYOTE (Itemized Schedule)
  // ----------------------------------------------------
  const listRows: (string | number)[][] = [
    [`${schoolName.toUpperCase()} - ORODHA KAMILI YA VIPINDI VYOTE VILIVYOPANGWA`],
    [`JUMLA YA VIPINDI: ${assignments.length}`],
    [],
    ['#', 'SIKU', 'MUDA NA KIPINDI', 'DARASA', 'MKONDO', 'SOMO', 'MWALIMU', 'INITIAL YA MWALIMU', 'CHUMBA / ENEO']
  ];

  assignments.forEach((a, idx) => {
    const tObj = a.teacherId !== undefined ? teacherMap.get(a.teacherId) : null;
    listRows.push([
      idx + 1,
      a.day || '',
      a.periodName || a.period || '',
      a.className || '',
      a.stream || '',
      a.subject || '',
      tObj?.name || (a as any).teacher || 'Unassigned',
      tObj?.initial || '--',
      a.room || 'Classroom'
    ]);
  });

  const wsList = XLSX.utils.aoa_to_sheet(listRows);
  wsList['!cols'] = [
    { wch: 6 },
    { wch: 14 },
    { wch: 24 },
    { wch: 16 },
    { wch: 14 },
    { wch: 24 },
    { wch: 28 },
    { wch: 12 },
    { wch: 18 }
  ];
  XLSX.utils.book_append_sheet(wb, wsList, 'Orodha ya Vipindi');

  const fileName = `Ratiba_Kuu_Timetable_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

/**
 * 2. Export Class Timetable to XLSX
 */
export function exportClassTimetableExcel(options: {
  schoolName: string;
  className: string;
  stream: string;
  assignments: TimetableAssignment[];
  teachers: Teacher[];
  periodSettings: PeriodSetting[];
  schoolInfo?: SchoolInfo;
}): void {
  const {
    schoolName,
    className,
    stream,
    assignments,
    teachers,
    periodSettings,
    schoolInfo
  } = options;

  const periods = getNormalizedPeriods(periodSettings);
  const teacherMap = new Map<number | string, Teacher>();
  teachers.forEach(t => teacherMap.set(t.id, t));

  const wb = XLSX.utils.book_new();
  const rows: (string | number)[][] = [
    [`${(schoolInfo?.name || schoolName).toUpperCase()} - RATIBA YA DARASA`],
    [`DARASA: ${className.toUpperCase()} - MKONDO: ${stream.toUpperCase()}`],
    [`TAREHE: ${new Date().toLocaleDateString('en-GB')}`],
    [],
    ['SIKU (DAY)', ...periods.map(p => (p.time ? `${p.name}\n(${p.time})` : p.name))]
  ];

  DAYS_OF_WEEK.forEach(day => {
    const row: (string | number)[] = [day.toUpperCase()];
    periods.forEach(p => {
      if (p.isBreak) {
        row.push(`[${p.name}]`);
        return;
      }
      const normPeriod = p.name.split(' (')[0].trim().toLowerCase();
      const match = assignments.find(a => {
        if (!a) return false;
        const matchDay = (a.day || '').toLowerCase() === day.toLowerCase();
        const matchClass = (a.className || '').toLowerCase() === className.toLowerCase();
        const matchStream = stream === 'All' || !a.stream || a.stream.toLowerCase().includes(stream.toLowerCase());
        const aPeriod = (a.periodName || a.period || '').split(' (')[0].trim().toLowerCase();
        return matchDay && matchClass && matchStream && (aPeriod === normPeriod || aPeriod.includes(normPeriod));
      });

      if (match) {
        const tObj = match.teacherId !== undefined ? teacherMap.get(match.teacherId) : null;
        const tName = tObj ? `${tObj.name} (${tObj.initial})` : (match as any).teacher || '';
        row.push(tName ? `${match.subject}\nTr: ${tName}` : match.subject);
      } else {
        row.push('—');
      }
    });
    rows.push(row);
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [
    { wch: 16 },
    ...periods.map(p => ({ wch: Math.max(18, p.name.length + 8) }))
  ];

  XLSX.utils.book_append_sheet(wb, ws, `${className}_${stream}`);
  XLSX.writeFile(wb, `Ratiba_Darasa_${className}_${stream}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

/**
 * 3. Export Teacher Individual Schedule to XLSX
 */
export function exportTeacherTimetableExcel(options: {
  schoolName: string;
  teacher: Teacher;
  assignments: TimetableAssignment[];
  periodSettings: PeriodSetting[];
  schoolInfo?: SchoolInfo;
}): void {
  const {
    schoolName,
    teacher,
    assignments,
    periodSettings,
    schoolInfo
  } = options;

  const periods = getNormalizedPeriods(periodSettings);
  const teacherAssignments = assignments.filter(a => {
    if (a.teacherId === teacher.id) return true;
    const aT = ((a as any).teacher || '').toLowerCase();
    return aT === teacher.name.toLowerCase() || (teacher.initial && aT === teacher.initial.toLowerCase());
  });

  const wb = XLSX.utils.book_new();

  // Sheet 1: Matrix view
  const matrixRows: (string | number)[][] = [
    [`${(schoolInfo?.name || schoolName).toUpperCase()} - RATIBA BINAFSI YA MWALIMU`],
    [`MWALIMU: ${teacher.name.toUpperCase()} (INITIAL: ${teacher.initial || '--'}) | CHEO: ${teacher.schoolRole || 'Teacher'}`],
    [`MASOMO: ${teacher.subjects?.join(', ') || 'N/A'} | JUMLA YA VIPINDI: ${teacherAssignments.length} / ${teacher.maxPeriodsPerWeek || 20} KWA WIKI`],
    [],
    ['SIKU (DAY)', ...periods.map(p => (p.time ? `${p.name}\n(${p.time})` : p.name))]
  ];

  DAYS_OF_WEEK.forEach(day => {
    const row: (string | number)[] = [day.toUpperCase()];
    periods.forEach(p => {
      if (p.isBreak) {
        row.push(`[${p.name}]`);
        return;
      }
      const normPeriod = p.name.split(' (')[0].trim().toLowerCase();
      const match = teacherAssignments.find(a => {
        const matchDay = (a.day || '').toLowerCase() === day.toLowerCase();
        const aPeriod = (a.periodName || a.period || '').split(' (')[0].trim().toLowerCase();
        return matchDay && (aPeriod === normPeriod || aPeriod.includes(normPeriod));
      });

      if (match) {
        row.push(`${match.subject}\n${match.className} ${match.stream || ''}\n${match.room ? `[${match.room}]` : ''}`);
      } else {
        row.push('—');
      }
    });
    matrixRows.push(row);
  });

  const wsMatrix = XLSX.utils.aoa_to_sheet(matrixRows);
  wsMatrix['!cols'] = [
    { wch: 16 },
    ...periods.map(p => ({ wch: Math.max(18, p.name.length + 8) }))
  ];
  XLSX.utils.book_append_sheet(wb, wsMatrix, 'Ratiba ya Mwalimu');

  // Sheet 2: Itemized List
  const listRows: (string | number)[][] = [
    [`${schoolName.toUpperCase()} - ORODHA YA VIPINDI VYA ${teacher.name.toUpperCase()}`],
    [],
    ['#', 'SIKU', 'KIPINDI NA MUDA', 'DARASA NA MKONDO', 'SOMO', 'CHUMBA']
  ];

  teacherAssignments.forEach((a, idx) => {
    listRows.push([
      idx + 1,
      a.day || '',
      a.periodName || a.period || '',
      `${a.className} ${a.stream || ''}`.trim(),
      a.subject || '',
      a.room || 'Classroom'
    ]);
  });

  const wsList = XLSX.utils.aoa_to_sheet(listRows);
  wsList['!cols'] = [{ wch: 6 }, { wch: 15 }, { wch: 25 }, { wch: 20 }, { wch: 25 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, wsList, 'Orodha ya Vipindi');

  const fileName = `Ratiba_Mwalimu_${teacher.initial || 'TR'}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

/**
 * 4. Export Invigilation Timetable to XLSX
 */
export function exportInvigilationTimetableExcel(options: {
  schoolName: string;
  sessions: InvigilationSession[];
  teachers: Teacher[];
  invigilationAssignments: Record<string, number>;
  schoolInfo?: SchoolInfo;
}): void {
  const {
    schoolName,
    sessions,
    teachers,
    invigilationAssignments,
    schoolInfo
  } = options;

  const teacherMap = new Map<number | string, Teacher>();
  teachers.forEach(t => teacherMap.set(t.id, t));

  const wb = XLSX.utils.book_new();
  const rows: (string | number)[][] = [
    [`${(schoolInfo?.name || schoolName).toUpperCase()} - RATIBA YA USIMAMIZI WA MITIHANI (INVIGILATION TIMETABLE)`],
    [`TAREHE YA KUTOLEWA: ${new Date().toLocaleDateString('en-GB')}`],
    [],
    ['#', 'TAREHE', 'SIKU', 'KIPINDI (SESSION)', 'DARASA', 'MKONDO', 'SOMO', 'VYUMBA (ROOMS)', 'WASIMAMIZI (INVIGILATORS)']
  ];

  sessions.forEach((s, idx) => {
    const invigilatorNames: string[] = [];
    for (let r = 0; r < (s.rooms || 1); r++) {
      const key = `${s.id}_room${r}`;
      const teacherId = invigilationAssignments[key];
      const teacher = teacherId !== undefined ? teacherMap.get(teacherId) : null;
      invigilatorNames.push(teacher ? `Rm ${r + 1}: ${teacher.name} (${teacher.initial})` : `Rm ${r + 1}: Unassigned`);
    }

    rows.push([
      idx + 1,
      s.date || '',
      s.day || '',
      s.session || '',
      s.className || '',
      s.stream || '',
      s.subject || '',
      s.rooms || 1,
      invigilatorNames.join('; ')
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [
    { wch: 6 },
    { wch: 14 },
    { wch: 14 },
    { wch: 22 },
    { wch: 14 },
    { wch: 14 },
    { wch: 24 },
    { wch: 12 },
    { wch: 45 }
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Usimamizi wa Mitihani');
  XLSX.writeFile(wb, `Ratiba_Usimamizi_Mitihani_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

/**
 * 5. Export Individual Teacher Invigilation Schedule to XLSX
 */
export function exportTeacherInvigilationExcel(options: {
  schoolName: string;
  teacher: Teacher;
  sessions: InvigilationSession[];
  invigilationAssignments: Record<string, number>;
  schoolInfo?: SchoolInfo;
}): void {
  const {
    schoolName = 'HABY EDUPRO ACADEMY',
    teacher,
    sessions,
    invigilationAssignments,
    schoolInfo
  } = options;

  const teacherDuties: { session: InvigilationSession; room: number }[] = [];
  sessions.forEach(sess => {
    for (let r = 0; r < sess.rooms; r++) {
      const key = `${sess.id}_room${r}`;
      if (invigilationAssignments[key] === teacher.id) {
        teacherDuties.push({ session: sess, room: r + 1 });
      }
    }
  });

  teacherDuties.sort((a, b) => {
    const dComp = (a.session.date || '').localeCompare(b.session.date || '');
    if (dComp !== 0) return dComp;
    return (a.session.session || '').localeCompare(b.session.session || '');
  });

  const wb = XLSX.utils.book_new();
  const rows: (string | number)[][] = [];

  rows.push([`${(schoolInfo?.name || schoolName).toUpperCase()} - RATIBA BINAFSI YA USIMAMIZI WA MTIHANI`]);
  rows.push([`MWALIMU: ${teacher.name.toUpperCase()} (INITIAL: ${teacher.initial || '--'}) | WADHIFA: ${teacher.schoolRole || 'Msimamizi wa Mtihani'}`]);
  rows.push([`JUMLA YA VIPINDI VYA USIMAMIZI: ${teacherDuties.length} | TAREHE: ${new Date().toLocaleDateString('en-GB')}`]);
  rows.push([]);

  rows.push([
    '#',
    'TAREHE & SIKU',
    'KIPINDI (SESSION)',
    'MUDA',
    'SOMO LA MTIHANI',
    'DARASA & MKONDO',
    'CHUMBA CHA MTIHANI',
    'SAHIHI YA MAHUDHURIO'
  ]);

  if (teacherDuties.length === 0) {
    rows.push(['—', 'Hakuna vipindi vilivyopangwa', '—', '—', '—', '—', '—', '—']);
  } else {
    teacherDuties.forEach((d, idx) => {
      rows.push([
        idx + 1,
        `${d.session.day} (${d.session.date})`,
        d.session.session || 'SESSION I',
        d.session.time || `${d.session.start || ''} - ${d.session.end || ''}`,
        d.session.subject,
        `${d.session.className} ${d.session.stream || ''}`.trim(),
        `Room ${d.room}`,
        ''
      ]);
    });
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [
    { wch: 6 },
    { wch: 22 },
    { wch: 18 },
    { wch: 18 },
    { wch: 28 },
    { wch: 20 },
    { wch: 18 },
    { wch: 24 }
  ];

  XLSX.utils.book_append_sheet(wb, ws, `${teacher.initial || 'Teacher'}_Invigilation`);
  const cleanName = teacher.name.replace(/[^a-zA-Z0-9]/g, '_');
  XLSX.writeFile(wb, `Ratiba_Usimamizi_${cleanName}.xlsx`);
}

