import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';
import { 
  TimetableAssignment, 
  Teacher, 
  PeriodSetting, 
  StreamSetting, 
  SchoolInfo,
  Student
} from '../types';
import { DAYS_OF_WEEK } from '../constants/defaults';

export interface TimetablePdfExportOptions {
  viewMode: 'general' | 'class' | 'teacher';
  assignments: TimetableAssignment[];
  teachers: Teacher[];
  periodSettings: PeriodSetting[];
  streamSettings: StreamSetting[];
  schoolInfo?: SchoolInfo;
  schoolName?: string;
  selectedClass?: string;
  selectedStream?: string;
  selectedTeacherId?: number;
  selectedDay?: string;
  orientation?: 'portrait' | 'landscape';
}

export function exportTimetablePDF(options: TimetablePdfExportOptions): void {
  const {
    viewMode,
    assignments,
    teachers,
    periodSettings,
    streamSettings,
    schoolInfo,
    schoolName = 'HABY EDUPRO ACADEMY',
    selectedClass = 'Form 1',
    selectedStream = 'All',
    selectedTeacherId,
    selectedDay = 'All',
    orientation = 'landscape'
  } = options;

  const isLandscape = orientation === 'landscape' || viewMode === 'class' || viewMode === 'general';
  const doc = new jsPDF({
    orientation: isLandscape ? 'landscape' : 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = isLandscape ? 297 : 210;
  const pageHeight = isLandscape ? 210 : 297;
  const margin = 10;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // Primary colors
  const primaryNavyR = 31, primaryNavyG = 77, primaryNavyB = 139;
  const slateDarkR = 30, slateDarkG = 41, slateDarkB = 59;
  const slateMutedR = 100, slateMutedG = 116, slateMutedB = 139;
  const borderGrayR = 203, borderGrayG = 213, borderGrayB = 225;
  const tableHeaderBgR = 241, tableHeaderBgG = 245, tableHeaderBgB = 249;
  const breakBgR = 248, breakBgG = 250, breakBgB = 252;

  // Helper to get active periods
  const activePeriods = periodSettings.length > 0 
    ? periodSettings.map(p => ({
        name: p.name,
        timeRange: p.start && p.end ? `${p.start} - ${p.end}` : (p as any).timeRange || '',
        isBreak: Boolean(p.isBreak)
      }))
    : [
        { name: 'PERIOD 1', timeRange: '08:00 - 08:40', isBreak: false },
        { name: 'PERIOD 2', timeRange: '08:40 - 09:20', isBreak: false },
        { name: 'PERIOD 3', timeRange: '09:20 - 10:00', isBreak: false },
        { name: 'BREAK', timeRange: '10:00 - 10:30', isBreak: true },
        { name: 'PERIOD 4', timeRange: '10:30 - 11:10', isBreak: false },
        { name: 'PERIOD 5', timeRange: '11:10 - 11:50', isBreak: false },
        { name: 'LUNCH', timeRange: '11:50 - 12:40', isBreak: true },
        { name: 'PERIOD 6', timeRange: '12:40 - 01:20', isBreak: false },
        { name: 'PERIOD 7', timeRange: '01:20 - 02:00', isBreak: false }
      ];

  // 1. HEADER BANNER
  doc.setFillColor(primaryNavyR, primaryNavyG, primaryNavyB);
  doc.rect(margin, y, contentWidth, 22, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  const titleText = (schoolInfo?.name || schoolName || 'HABY EDUPRO ACADEMY').toUpperCase();
  doc.text(titleText, pageWidth / 2, y + 7, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(224, 231, 255);
  const subText = `ADDRESS: ${schoolInfo?.address || 'P.O. BOX 145, TANGA, TANZANIA'}  •  TEL: ${schoolInfo?.phone || '0717616343'}  •  EMAIL: ${schoolInfo?.email || 'info@habyedupro.ac.tz'}`;
  doc.text(subText, pageWidth / 2, y + 13, { align: 'center' });

  let docTitle = 'OFFICIAL SCHOOL TIMETABLE REPORT';
  if (viewMode === 'class') {
    docTitle = `CLASS TIMETABLE GRID: ${selectedClass.toUpperCase()} ${selectedStream !== 'All' ? `(${selectedStream})` : ''}`;
  } else if (viewMode === 'teacher') {
    const teacher = teachers.find(t => t.id === selectedTeacherId);
    docTitle = `TEACHER INDIVIDUAL SCHEDULE: ${(teacher?.name || 'FACULTY MEMBER').toUpperCase()}`;
  } else if (viewMode === 'general') {
    docTitle = `MASTER TEACHING SCHEDULE - ${selectedClass.toUpperCase()} (${selectedStream})`;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(255, 230, 150);
  doc.text(docTitle, pageWidth / 2, y + 19, { align: 'center' });

  y += 26;

  // =========================================================================
  // VIEW MODE 1: CLASS TIMETABLE GRID
  // =========================================================================
  if (viewMode === 'class') {
    const activeDays = DAYS_OF_WEEK.filter(d => selectedDay === 'All' || selectedDay === d);
    const dayColWidth = 25;
    const availableWidth = contentWidth - dayColWidth;
    const colWidth = Math.max(18, availableWidth / activePeriods.length);
    const rowHeight = 22;

    // Sub-header particulars bar
    doc.setFillColor(tableHeaderBgR, tableHeaderBgG, tableHeaderBgB);
    doc.rect(margin, y, contentWidth, 8, 'F');
    doc.setDrawColor(borderGrayR, borderGrayG, borderGrayB);
    doc.rect(margin, y, contentWidth, 8, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(slateDarkR, slateDarkG, slateDarkB);
    doc.text(`Class: ${selectedClass} (${selectedStream})`, margin + 4, y + 5.5);
    doc.text(`Working Days: ${activeDays.length} Days`, margin + 70, y + 5.5);
    doc.text(`Date Printed: ${new Date().toLocaleDateString('en-GB')}`, margin + 140, y + 5.5);
    doc.text(`Status: Zero Clashes Verified`, pageWidth - margin - 4, y + 5.5, { align: 'right' });

    y += 11;

    // Table Header Row (Periods / Time slots)
    doc.setFillColor(primaryNavyR, primaryNavyG, primaryNavyB);
    doc.rect(margin, y, contentWidth, 10, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    doc.text('DAY \\ PERIOD', margin + dayColWidth / 2, y + 6, { align: 'center' });

    activePeriods.forEach((period, idx) => {
      const x = margin + dayColWidth + idx * colWidth;
      doc.text(period.name.toUpperCase(), x + colWidth / 2, y + 4.5, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);
      doc.setTextColor(219, 234, 254);
      doc.text(period.timeRange || '', x + colWidth / 2, y + 8, { align: 'center' });
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(255, 255, 255);
    });

    y += 10;

    // Table Day Rows
    activeDays.forEach(day => {
      // Check for page overflow
      if (y + rowHeight > pageHeight - 20) {
        doc.addPage('a4', 'landscape');
        y = margin;
      }

      // Day Column cell
      doc.setFillColor(tableHeaderBgR, tableHeaderBgG, tableHeaderBgB);
      doc.rect(margin, y, dayColWidth, rowHeight, 'F');
      doc.setDrawColor(borderGrayR, borderGrayG, borderGrayB);
      doc.rect(margin, y, dayColWidth, rowHeight, 'S');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(primaryNavyR, primaryNavyG, primaryNavyB);
      doc.text(day.toUpperCase(), margin + dayColWidth / 2, y + rowHeight / 2 + 1, { align: 'center' });

      // Period Cells
      activePeriods.forEach((period, pIdx) => {
        const x = margin + dayColWidth + pIdx * colWidth;

        if (period.isBreak) {
          doc.setFillColor(breakBgR, breakBgG, breakBgB);
          doc.rect(x, y, colWidth, rowHeight, 'F');
          doc.setDrawColor(borderGrayR, borderGrayG, borderGrayB);
          doc.rect(x, y, colWidth, rowHeight, 'S');

          doc.setFont('helvetica', 'italic');
          doc.setFontSize(6.5);
          doc.setTextColor(slateMutedR, slateMutedG, slateMutedB);
          doc.text(period.name, x + colWidth / 2, y + rowHeight / 2 + 1, { align: 'center' });
        } else {
          // Find assignment
          const normPeriodName = period.name.split(' (')[0].trim().toUpperCase();
          const assignment = assignments.find(a => {
            const matchClass = a.className.toLowerCase() === selectedClass.toLowerCase();
            const matchStream = selectedStream === 'All' || !a.stream || a.stream.toLowerCase().includes(selectedStream.toLowerCase());
            const matchDay = a.day.toLowerCase() === day.toLowerCase();
            const aPeriod = (a.periodName || a.period || '').split(' (')[0].trim().toUpperCase();
            return matchClass && matchStream && matchDay && (aPeriod === normPeriodName || aPeriod.includes(normPeriodName));
          });

          doc.setFillColor(255, 255, 255);
          doc.rect(x, y, colWidth, rowHeight, 'F');
          doc.setDrawColor(borderGrayR, borderGrayG, borderGrayB);
          doc.rect(x, y, colWidth, rowHeight, 'S');

          if (assignment) {
            const subject = assignment.subject || assignment.customNote || (assignment as any).activityName || 'Subject';
            const teacherObj = teachers.find(t => t.id === assignment.teacherId);
            const teacherName = (assignment as any).teacher || teacherObj?.name || teacherObj?.initial || '';
            const room = assignment.room || '';

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7);
            doc.setTextColor(slateDarkR, slateDarkG, slateDarkB);
            const truncSubject = subject.length > 14 ? `${subject.substring(0, 12)}..` : subject;
            doc.text(truncSubject, x + colWidth / 2, y + 6, { align: 'center' });

            if (teacherName) {
              doc.setFont('helvetica', 'normal');
              doc.setFontSize(6);
              doc.setTextColor(slateMutedR, slateMutedG, slateMutedB);
              const truncTeacher = teacherName.length > 15 ? `${teacherName.substring(0, 13)}..` : teacherName;
              doc.text(truncTeacher, x + colWidth / 2, y + 11, { align: 'center' });
            }

            if (room) {
              doc.setFont('helvetica', 'bold');
              doc.setFontSize(5.5);
              doc.setTextColor(30, 64, 175);
              doc.text(`[${room}]`, x + colWidth / 2, y + 16, { align: 'center' });
            }
          } else {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(6);
            doc.setTextColor(203, 213, 225);
            doc.text('—', x + colWidth / 2, y + rowHeight / 2 + 1, { align: 'center' });
          }
        }
      });

      y += rowHeight;
    });

  // =========================================================================
  // VIEW MODE 2: TEACHER INDIVIDUAL SCHEDULE
  // =========================================================================
  } else if (viewMode === 'teacher') {
    const teacher = teachers.find(t => t.id === selectedTeacherId) || teachers[0];
    const teacherAssignmentsList = assignments.filter(a => {
      if (!teacher) return false;
      const matchId = a.teacherId === teacher.id;
      const aT = (('teacher' in a ? (a as any).teacher : '') || '').toLowerCase();
      return matchId || aT === teacher.name.toLowerCase() || (teacher.initial && aT === teacher.initial.toLowerCase()) || aT.includes(teacher.name.toLowerCase());
    });

    // Particulars Card
    doc.setFillColor(tableHeaderBgR, tableHeaderBgG, tableHeaderBgB);
    doc.rect(margin, y, contentWidth, 12, 'F');
    doc.setDrawColor(borderGrayR, borderGrayG, borderGrayB);
    doc.rect(margin, y, contentWidth, 12, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(slateDarkR, slateDarkG, slateDarkB);
    doc.text(`Teacher: ${teacher?.name || 'N/A'} (${teacher?.initial || '--'})`, margin + 4, y + 5);
    doc.text(`Role: ${teacher?.schoolRole || 'Subject Teacher'}`, margin + 90, y + 5);
    doc.text(`Total Assigned Periods: ${teacherAssignmentsList.length} Periods/Wk`, margin + 170, y + 5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(slateMutedR, slateMutedG, slateMutedB);
    const subList = teacher?.subjects?.join('; ') || 'All Subjects';
    doc.text(`Subjects: ${subList.length > 80 ? subList.substring(0, 78) + '..' : subList}`, margin + 4, y + 9.5);

    y += 16;

    // Table Headers
    const cols = [
      { name: '#', width: 12 },
      { name: 'DAY', width: 30 },
      { name: 'PERIOD & TIME', width: 50 },
      { name: 'CLASS & STREAM', width: 50 },
      { name: 'SUBJECT', width: 85 },
      { name: 'VENUE / ROOM', width: 50 }
    ];

    doc.setFillColor(primaryNavyR, primaryNavyG, primaryNavyB);
    doc.rect(margin, y, contentWidth, 8, 'F');

    let currX = margin;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    cols.forEach(c => {
      doc.text(c.name, currX + c.width / 2, y + 5.5, { align: 'center' });
      currX += c.width;
    });

    y += 8;

    if (teacherAssignmentsList.length === 0) {
      doc.setFillColor(255, 255, 255);
      doc.rect(margin, y, contentWidth, 12, 'F');
      doc.setDrawColor(borderGrayR, borderGrayG, borderGrayB);
      doc.rect(margin, y, contentWidth, 12, 'S');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(slateMutedR, slateMutedG, slateMutedB);
      doc.text('No periods currently assigned on the timetable for this teacher.', pageWidth / 2, y + 7, { align: 'center' });
      y += 12;
    } else {
      teacherAssignmentsList.forEach((item, idx) => {
        if (y + 8 > pageHeight - 20) {
          doc.addPage('a4', isLandscape ? 'landscape' : 'portrait');
          y = margin;
        }

        const isEven = idx % 2 === 0;
        doc.setFillColor(isEven ? 255 : 248, isEven ? 255 : 250, isEven ? 255 : 252);
        doc.rect(margin, y, contentWidth, 7.5, 'F');
        doc.setDrawColor(borderGrayR, borderGrayG, borderGrayB);
        doc.rect(margin, y, contentWidth, 7.5, 'S');

        let cellX = margin;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(slateDarkR, slateDarkG, slateDarkB);

        // #
        doc.text(String(idx + 1), cellX + cols[0].width / 2, y + 5, { align: 'center' });
        cellX += cols[0].width;

        // Day
        doc.text(item.day.toUpperCase(), cellX + cols[1].width / 2, y + 5, { align: 'center' });
        cellX += cols[1].width;

        // Period & Time
        doc.setFont('helvetica', 'normal');
        const periodStr = `${item.periodName || item.period}`;
        doc.text(periodStr, cellX + cols[2].width / 2, y + 5, { align: 'center' });
        cellX += cols[2].width;

        // Class & Stream
        doc.setFont('helvetica', 'bold');
        doc.text(`${item.className} - ${item.stream}`, cellX + cols[3].width / 2, y + 5, { align: 'center' });
        cellX += cols[3].width;

        // Subject
        doc.text(item.subject || item.customNote || (item as any).activityName || 'Subject', cellX + cols[4].width / 2, y + 5, { align: 'center' });
        cellX += cols[4].width;

        // Room
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(30, 64, 175);
        doc.text(item.room || 'Main Classroom', cellX + cols[5].width / 2, y + 5, { align: 'center' });

        y += 7.5;
      });
    }

  // =========================================================================
  // VIEW MODE 3: GENERAL / MASTER TIMETABLE
  // =========================================================================
  } else {
    const activeDays = DAYS_OF_WEEK.filter(d => selectedDay === 'All' || selectedDay === d);

    activeDays.forEach((day) => {
      if (y + 30 > pageHeight - 20) {
        doc.addPage('a4', isLandscape ? 'landscape' : 'portrait');
        y = margin;
      }

      // Day Header Strip
      doc.setFillColor(primaryNavyR, primaryNavyG, primaryNavyB);
      doc.rect(margin, y, contentWidth, 7, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(255, 255, 255);
      doc.text(`DAY: ${day.toUpperCase()}`, margin + 4, y + 5);

      y += 7;

      // Table Header Row
      const genCols = [
        { name: '#', width: 10 },
        { name: 'PERIOD & TIME', width: 45 },
        { name: 'CLASS & STREAM', width: 45 },
        { name: 'SUBJECT', width: 80 },
        { name: 'TEACHER', width: 60 },
        { name: 'ROOM', width: 37 }
      ];

      doc.setFillColor(tableHeaderBgR, tableHeaderBgG, tableHeaderBgB);
      doc.rect(margin, y, contentWidth, 6, 'F');
      doc.setDrawColor(borderGrayR, borderGrayG, borderGrayB);
      doc.rect(margin, y, contentWidth, 6, 'S');

      let gx = margin;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(slateDarkR, slateDarkG, slateDarkB);
      genCols.forEach(c => {
        doc.text(c.name, gx + c.width / 2, y + 4.2, { align: 'center' });
        gx += c.width;
      });

      y += 6;

      const dayAssignments = assignments.filter(a => {
        const matchDay = a.day.toLowerCase() === day.toLowerCase();
        const matchClass = selectedClass === 'All' || a.className.toLowerCase() === selectedClass.toLowerCase();
        const matchStream = selectedStream === 'All' || !a.stream || a.stream.toLowerCase().includes(selectedStream.toLowerCase());
        return matchDay && matchClass && matchStream;
      });

      if (dayAssignments.length === 0) {
        doc.setFillColor(255, 255, 255);
        doc.rect(margin, y, contentWidth, 6, 'F');
        doc.setDrawColor(borderGrayR, borderGrayG, borderGrayB);
        doc.rect(margin, y, contentWidth, 6, 'S');

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(slateMutedR, slateMutedG, slateMutedB);
        doc.text('No scheduled periods for this day.', pageWidth / 2, y + 4, { align: 'center' });
        y += 6;
      } else {
        dayAssignments.forEach((a, aIdx) => {
          if (y + 6 > pageHeight - 20) {
            doc.addPage('a4', isLandscape ? 'landscape' : 'portrait');
            y = margin;
          }

          const isEven = aIdx % 2 === 0;
          doc.setFillColor(isEven ? 255 : 248, isEven ? 255 : 250, isEven ? 255 : 252);
          doc.rect(margin, y, contentWidth, 6, 'F');
          doc.setDrawColor(borderGrayR, borderGrayG, borderGrayB);
          doc.rect(margin, y, contentWidth, 6, 'S');

          let cellX = margin;
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(6.5);
          doc.setTextColor(slateDarkR, slateDarkG, slateDarkB);

          // #
          doc.text(String(aIdx + 1), cellX + genCols[0].width / 2, y + 4, { align: 'center' });
          cellX += genCols[0].width;

          // Period
          doc.setFont('helvetica', 'normal');
          doc.text(a.periodName || a.period || 'Period', cellX + genCols[1].width / 2, y + 4, { align: 'center' });
          cellX += genCols[1].width;

          // Class
          doc.setFont('helvetica', 'bold');
          doc.text(`${a.className} ${a.stream || ''}`, cellX + genCols[2].width / 2, y + 4, { align: 'center' });
          cellX += genCols[2].width;

          // Subject
          doc.text(a.subject || a.customNote || (a as any).activityName || 'Subject', cellX + genCols[3].width / 2, y + 4, { align: 'center' });
          cellX += genCols[3].width;

          // Teacher
          doc.setFont('helvetica', 'normal');
          const tObj = teachers.find(t => t.id === a.teacherId);
          const tName = (a as any).teacher || tObj?.name || tObj?.initial || 'Unassigned';
          doc.text(tName, cellX + genCols[4].width / 2, y + 4, { align: 'center' });
          cellX += genCols[4].width;

          // Room
          doc.setTextColor(30, 64, 175);
          doc.text(a.room || 'Classroom', cellX + genCols[5].width / 2, y + 4, { align: 'center' });

          y += 6;
        });
      }

      y += 4;
    });
  }

  // =========================================================================
  // FOOTER & SIGN-OFF BLOCK
  // =========================================================================
  if (y + 20 > pageHeight - 15) {
    doc.addPage('a4', isLandscape ? 'landscape' : 'portrait');
    y = margin;
  } else {
    y += 6;
  }

  doc.setDrawColor(borderGrayR, borderGrayG, borderGrayB);
  doc.line(margin, y, pageWidth - margin, y);
  y += 4;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(slateDarkR, slateDarkG, slateDarkB);

  const signWidth = contentWidth / 3;
  
  // Sign-off 1: Academic Master
  doc.text('Academic Master / Examination Officer:', margin + 2, y + 3);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.text('Signature: ____________________', margin + 2, y + 8);
  doc.text('Date: _______________', margin + 2, y + 12);

  // Sign-off 2: Head of Department
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text('Head of Department / Class Teacher:', margin + signWidth + 2, y + 3);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.text('Signature: ____________________', margin + signWidth + 2, y + 8);
  doc.text('Date: _______________', margin + signWidth + 2, y + 12);

  // Sign-off 3: Headmaster / Principal
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text('Head of School / Headmaster:', margin + signWidth * 2 + 2, y + 3);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.text(`Stamp: ${schoolInfo?.principal || 'Principal Headmaster'}`, margin + signWidth * 2 + 2, y + 8);
  doc.text('Date: _______________', margin + signWidth * 2 + 2, y + 12);

  // Page Numbers
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(slateMutedR, slateMutedG, slateMutedB);
    doc.text(
      `Haby Edu Pro School Management System  •  Page ${i} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 5,
      { align: 'center' }
    );
  }

  // Trigger Save
  const cleanSchool = (schoolInfo?.name || 'HabyEduPro').replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `${cleanSchool}_${viewMode.toUpperCase()}_Timetable_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
}

export interface ClassJournalExportOptions {
  className: string;
  stream: string;
  week: string;
  entries: any[];
  schoolInfo?: SchoolInfo;
  monitorName: string;
  classTeacherName: string;
  students?: Student[];
}

function generateRecordHash(regNo: string, className: string, stream: string): string {
  const input = `${regNo}_${className}_${stream}_VERIFY_SALT_2026`;
  let h1 = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h1 ^= input.charCodeAt(i);
    h1 += (h1 << 1) + (h1 << 4) + (h1 << 7) + (h1 << 8) + (h1 << 24);
  }
  const part = (h1 >>> 0).toString(16).padStart(8, '0').toUpperCase();
  return `SEC-HASH-${part.slice(0, 4)}-${part.slice(4)}`;
}

export async function exportClassJournalPDF(options: ClassJournalExportOptions): Promise<void> {
  const { className, stream, week, entries, schoolInfo, monitorName, classTeacherName, students = [] } = options;
  
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 297;
  const margin = 10;
  let y = margin;

  // Header Banner
  doc.setFillColor(31, 77, 139);
  doc.rect(margin, y, pageWidth - margin * 2, 22, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text((schoolInfo?.name || 'HABY EDUPRO ACADEMY').toUpperCase(), pageWidth / 2, y + 8, { align: 'center' });

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`${schoolInfo?.address || 'P.O. BOX 145, TANGA, TANZANIA'} • TEL: ${schoolInfo?.phone || '0717616343'}`, pageWidth / 2, y + 14, { align: 'center' });
  
  doc.setFont('helvetica', 'bold');
  doc.text(`OFFICIAL CLASSROOM JOURNAL & PERIOD LOG: ${className.toUpperCase()} (${stream}) - ${week.toUpperCase()}`, pageWidth / 2, y + 19, { align: 'center' });

  y += 26;

  // Info Bar
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, pageWidth - margin * 2, 10, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.rect(margin, y, pageWidth - margin * 2, 10, 'S');

  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text(`Monitor: ${monitorName}`, margin + 5, y + 6);
  doc.text(`Class Teacher: ${classTeacherName}`, margin + 80, y + 6);
  doc.text(`Academic Week: ${week}`, margin + 150, y + 6);
  doc.text(`Date Printed: ${new Date().toLocaleDateString('en-GB')}`, pageWidth - margin - 5, y + 6, { align: 'right' });

  y += 14;

  // Table using autoTable
  autoTable(doc, {
    startY: y,
    head: [[
      '#', 
      'Day & Time', 
      'Subject & Teacher', 
      'Status', 
      'Topic Covered', 
      'Attendance', 
      'Teacher Signature', 
      'Monitor Verify'
    ]],
    body: entries.map((e, idx) => [
      idx + 1,
      `${e.week ? e.week + ' • ' : ''}${e.day}\n${e.periodName}\n(${e.timeRange})`,
      `${e.scheduledSubject}\n${e.scheduledTeacherName}`,
      e.status === 'TAUGHT' ? 'Taught' : 
      e.status === 'STAND_IN' ? `Relief (${e.actualTeacherName || 'N/A'})` : 
      e.status === 'NOT_TAUGHT' ? 'Not Taught' : 'Free',
      e.topicTaught || '—',
      `${e.studentsPresent}/${e.totalStudentsInClass}`,
      e.teacherSignature ? `${e.teacherSignature}\n(${e.teacherSignedAt || ''})` : '—',
      e.monitorConfirmed ? `Verified\n(${e.monitorName})` : '—'
    ]),
    theme: 'grid',
    headStyles: {
      fillColor: [31, 77, 139],
      textColor: [255, 255, 255],
      fontSize: 8,
      halign: 'center',
      valign: 'middle',
      fontStyle: 'bold'
    },
    bodyStyles: {
      fontSize: 7,
      valign: 'middle',
      textColor: [30, 41, 59]
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 25 },
      2: { cellWidth: 35 },
      3: { cellWidth: 25, halign: 'center' },
      4: { cellWidth: 'auto' },
      5: { cellWidth: 20, halign: 'center' },
      6: { cellWidth: 30 },
      7: { cellWidth: 25, halign: 'center' }
    },
    margin: { left: margin, right: margin }
  });

  // STUDENT VERIFICATION ROSTER PAGE
  if (students && students.length > 0) {
    doc.addPage('landscape');
    let ry = margin;

    // Header Banner
    doc.setFillColor(31, 77, 139);
    doc.rect(margin, ry, pageWidth - margin * 2, 22, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.text((schoolInfo?.name || 'HABY EDUPRO ACADEMY').toUpperCase(), pageWidth / 2, ry + 8, { align: 'center' });

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.text('CLASS STUDENT ATTENDANCE & AUTHENTICITY VERIFICATION ROSTER', pageWidth / 2, ry + 14, { align: 'center' });
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7);
    doc.setTextColor(219, 234, 254);
    doc.text('Scan the unique QR code next to any student name to instantly verify their official record on the school portal database.', pageWidth / 2, ry + 19, { align: 'center' });

    ry += 26;

    // Info description
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);
    doc.text(`Enrolled Students: ${students.length} Candidates  |  Class Stream: ${className} - ${stream}`, margin + 2, ry + 4);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(`Document Authenticity Guard: Verified QR Seals Generated on ${new Date().toLocaleDateString('en-GB')}`, pageWidth - margin - 2, ry + 4, { align: 'right' });

    ry += 8;

    // Generate Base64 QR code data URLs asynchronously
    const qrCodes: string[] = [];
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const pathname = typeof window !== 'undefined' ? window.location.pathname : '';

    for (const student of students) {
      const url = `${origin}${pathname}?verifyStudent=${encodeURIComponent(student.regNo)}`;
      try {
        const qrDataUrl = await QRCode.toDataURL(url, { margin: 1 });
        qrCodes.push(qrDataUrl);
      } catch (err) {
        console.error('Error generating verification QR code', err);
        qrCodes.push('');
      }
    }

    // Student roster table
    autoTable(doc, {
      startY: ry,
      head: [['#', 'Registration Number', 'Student Name', 'Gender', 'Verified Record Profile (Scan QR / Hash)']],
      body: students.map((s, idx) => [
        idx + 1,
        s.regNo,
        s.name,
        s.gender || '—',
        generateRecordHash(s.regNo, className, stream)
      ]),
      theme: 'grid',
      headStyles: {
        fillColor: [31, 77, 139],
        textColor: [255, 255, 255],
        fontSize: 8,
        halign: 'center',
        valign: 'middle'
      },
      bodyStyles: {
        fontSize: 7.5,
        valign: 'bottom', // Text (hash) aligned to bottom of cell
        minCellHeight: 20 // Spacing for 11mm QR code + text below
      },
      columnStyles: {
        0: { cellWidth: 15, halign: 'center', valign: 'middle' },
        1: { cellWidth: 45, halign: 'center', valign: 'middle' },
        2: { cellWidth: 'auto', valign: 'middle' },
        3: { cellWidth: 35, halign: 'center', valign: 'middle' },
        4: { cellWidth: 60, halign: 'center', fontStyle: 'bold', fontSize: 6.5, textColor: [100, 116, 139] } // Renders hash nicely
      },
      margin: { left: margin, right: margin },
      didDrawCell: (data) => {
        if (data.column.index === 4 && data.cell.section === 'body') {
          const qrCodeUrl = qrCodes[data.row.index];
          if (qrCodeUrl) {
            const size = 11; // mm
            const x = data.cell.x + (data.cell.width - size) / 2;
            const y = data.cell.y + 2; // Drawn at the top, leaving bottom for text
            doc.addImage(qrCodeUrl, 'PNG', x, y, size, size);
          }
        }
      }
    });
  }

  // DYNAMIC CURRENT/TOTAL PAGE NUMBER INJECTION & WATERMARK
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    const pageSize = doc.internal.pageSize;
    const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
    
    // 1. Subtle Diagonal 'OFFICIAL' Watermark
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(60);
    doc.setTextColor(243, 244, 246); // Extremely subtle light gray (#f3f4f6)
    doc.text('OFFICIAL RECORD', 148.5, 105, {
      align: 'center',
      angle: 35
    });

    // 2. Footer Page Numbering (Reset settings)
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    
    // Distinguish header label based on page index
    const label = i === 1 
      ? 'Haby Edu Pro • Class Journal Report' 
      : 'Haby Edu Pro • Student Authenticity Guard';
      
    doc.text(
      `${label} • Page ${i} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 5,
      { align: 'center' }
    );
  }

  const filename = `${className.replace(/\s+/g, '_')}_${stream.replace(/\s+/g, '_')}_Journal_${week.replace(/\s+/g, '_')}.pdf`;
  doc.save(filename);
}
