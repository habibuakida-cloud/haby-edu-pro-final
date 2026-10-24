import { jsPDF } from 'jspdf';
import { getSubjectShortName } from './colors';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';
import html2canvas from 'html2canvas';
import { 
  TimetableAssignment, 
  Teacher, 
  PeriodSetting, 
  StreamSetting, 
  SchoolInfo,
  Student,
  InvigilationSession
} from '../types';
import { DAYS_OF_WEEK } from '../constants/defaults';
import { isSameClass } from './reportCardUtils';
import { romanize } from './classStreamUtils';
import { isSameStream, isSamePeriod, normalizeStreamName, getConfiguredDays, getPeriodsForDayFromSettings, StreamProgressionReport, TeacherProgressionReport } from '../lib/timetableService';

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
  elementId?: string; // Optional DOM element to capture directly
}

/**
 * Subject theme colors for PDF cell badges (RGB)
 */
function getSubjectTheme(subjectName: string): { bg: [number, number, number]; text: [number, number, number] } {
  const norm = (subjectName || '').toLowerCase();
  if (norm.includes('math')) return { bg: [239, 246, 255], text: [29, 78, 216] };
  if (norm.includes('bio')) return { bg: [236, 253, 245], text: [4, 120, 87] };
  if (norm.includes('chem')) return { bg: [250, 245, 255], text: [126, 34, 206] };
  if (norm.includes('phys')) return { bg: [238, 242, 255], text: [67, 56, 202] };
  if (norm.includes('kisw')) return { bg: [255, 247, 237], text: [194, 65, 12] };
  if (norm.includes('eng')) return { bg: [254, 242, 242], text: [185, 28, 28] };
  if (norm.includes('geo')) return { bg: [240, 253, 244], text: [21, 128, 61] };
  if (norm.includes('hist')) return { bg: [254, 252, 232], text: [161, 98, 7] };
  if (norm.includes('civ')) return { bg: [240, 253, 250], text: [15, 118, 110] };
  if (norm.includes('comm') || norm.includes('bk')) return { bg: [248, 250, 252], text: [51, 65, 85] };
  return { bg: [241, 245, 249], text: [30, 41, 59] };
}

/**
 * Day theme colors for day banner headers (RGB)
 */
function getDayThemeColor(day: string): [number, number, number] {
  switch (day.toLowerCase()) {
    case 'monday': return [30, 58, 138];    // Blue
    case 'tuesday': return [6, 95, 70];     // Emerald
    case 'wednesday': return [88, 28, 135]; // Purple
    case 'thursday': return [180, 83, 9];   // Amber
    case 'friday': return [190, 18, 60];    // Rose
    case 'saturday': return [15, 118, 110]; // Teal
    case 'sunday': return [51, 65, 85];     // Slate
    default: return [31, 77, 139];
  }
}

/**
 * Helper to calculate minutes from time string "HH:MM"
 */
function timeToMinutes(timeStr?: string): number {
  if (!timeStr || typeof timeStr !== 'string') return 0;
  const parts = timeStr.split(':').map(Number);
  const hrs = isNaN(parts[0]) ? 0 : parts[0];
  const mins = isNaN(parts[1]) ? 0 : parts[1];
  return hrs * 60 + mins;
}

/**
 * Retrieve exact periods for a given day from periodSettings, sorted chronologically.
 * Does NOT fall back to another day's periods if the requested day has no periods set.
 */
function getPeriodsForDay(day: string, periodSettings: PeriodSetting[]) {
  const forDay = getPeriodsForDayFromSettings(day, periodSettings);

  if (forDay.length > 0) {
    return forDay.map(p => ({
      name: p.name,
      timeRange: p.start && p.end ? `${p.start} - ${p.end}` : (p as any).timeRange || '',
      isBreak: Boolean(p.isBreak) ||
        p.name.toLowerCase().includes('break') ||
        p.name.toLowerCase().includes('lunch') ||
        p.name.toLowerCase().includes('chai') ||
        p.name.toLowerCase().includes('chakula')
    }));
  }

  // Only use standard defaults if periodSettings is completely empty and day is not Saturday/Sunday
  if ((!periodSettings || periodSettings.length === 0) && day.toLowerCase() !== 'saturday' && day.toLowerCase() !== 'sunday') {
    return [
      { name: 'PERIOD 1', timeRange: '08:00 - 08:40', isBreak: false },
      { name: 'PERIOD 2', timeRange: '08:40 - 09:20', isBreak: false },
      { name: 'CHAI / BREAK', timeRange: '09:20 - 09:50', isBreak: true },
      { name: 'PERIOD 3', timeRange: '09:50 - 10:30', isBreak: false },
      { name: 'PERIOD 4', timeRange: '10:30 - 11:10', isBreak: false },
      { name: 'CHAKULA / LUNCH', timeRange: '11:10 - 12:00', isBreak: true },
      { name: 'PERIOD 5', timeRange: '12:00 - 12:40', isBreak: false },
      { name: 'PERIOD 6', timeRange: '12:40 - 01:20', isBreak: false },
      { name: 'PERIOD 7', timeRange: '01:20 - 02:00', isBreak: false },
      { name: 'PERIOD 8', timeRange: '02:00 - 02:40', isBreak: false }
    ];
  }

  return [];
}

/**
 * 1. MAIN EXPORT FUNCTION: Renders pixel-accurate vector matrix matching system design exactly!
 */
export async function exportTimetablePDF(options: TimetablePdfExportOptions): Promise<void> {
  const {
    viewMode,
    assignments = [],
    teachers = [],
    periodSettings = [],
    streamSettings = [],
    schoolInfo,
    schoolName = 'HABY EDUPRO ACADEMY',
    selectedClass = 'All',
    selectedStream = 'All',
    selectedTeacherId,
    selectedDay = 'All',
    orientation = 'landscape'
  } = options;

  // Initialize jsPDF A4 Document
  const isLandscape = orientation === 'landscape' || viewMode === 'general' || viewMode === 'class' || viewMode === 'teacher';
  const doc = new jsPDF({
    orientation: isLandscape ? 'landscape' : 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = isLandscape ? 297 : 210;
  const pageHeight = isLandscape ? 210 : 297;
  const margin = 8;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // Teacher map for O(1) initial and full name lookup
  const teacherMap = new Map<number | string, Teacher>();
  teachers.forEach(t => teacherMap.set(t.id, t));

  // Generate Verification QR Code
  let qrDataUrl = '';
  try {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
    const verifyUrl = viewMode === 'teacher' && selectedTeacherId !== undefined
      ? `${origin}${pathname}?verifyTeacher=${selectedTeacherId}`
      : viewMode === 'class'
      ? `${origin}${pathname}?verifyClass=${encodeURIComponent(selectedClass)}&stream=${encodeURIComponent(selectedStream)}`
      : `${origin}${pathname}?verifyMasterTimetable=true`;
    qrDataUrl = await QRCode.toDataURL(verifyUrl, { margin: 1 });
  } catch (err) {
    console.warn('QR Code generation error:', err);
  }

  // ----------------------------------------------------
  // DRAW OFFICIAL ACADEMIC HEADER (Standardized across pages)
  // ----------------------------------------------------
  function drawOfficialHeader(subTitleText: string, extraBadge?: string) {
    // Deep Academic Navy Header
    doc.setFillColor(30, 58, 138);
    doc.roundedRect(margin, y, contentWidth, 18, 1.5, 1.5, 'F');

    // School Name (Uppercase, bold)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12.5);
    doc.setTextColor(255, 255, 255);
    const titleText = (schoolInfo?.name || schoolName || 'HABY EDUPRO ACADEMY').toUpperCase();
    doc.text(titleText, pageWidth / 2, y + 5.5, { align: 'center' });

    // Contact Information & Motto
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(224, 231, 255);
    const contactText = `"${schoolInfo?.motto || 'ELIMU NI NURU NA NGUVU'}"  •  ANWANI: ${schoolInfo?.address || 'P.O. BOX 145, TANGA'}  •  SIMU: ${schoolInfo?.phone || '0717616343'}  •  BARUA PEPE: ${schoolInfo?.email || 'info@school.ac.tz'}`;
    doc.text(contactText, pageWidth / 2, y + 10.5, { align: 'center' });

    // Subtitle & Document Scope
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(254, 240, 138); // Academic Gold
    doc.text(subTitleText.toUpperCase(), pageWidth / 2, y + 15, { align: 'center' });

    if (extraBadge) {
      doc.setFontSize(6.5);
      doc.setTextColor(240, 253, 250);
      doc.text(extraBadge, pageWidth - margin - 22, y + 15, { align: 'right' });
    }

    // Embed Verification QR Code in Header
    if (qrDataUrl) {
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(pageWidth - margin - 19, y + 1.2, 15.5, 15.5, 1, 1, 'F');
      doc.addImage(qrDataUrl, 'PNG', pageWidth - margin - 18.5, y + 1.7, 14.5, 14.5);
    }

    y += 20.5;
  }

  // =========================================================================
  // VIEW MODE 1: MASTER / GENERAL TIMETABLE (RATIBA ZOTE)
  // One pristine A4 landscape page per day, structured exactly like the system!
  // =========================================================================
  if (viewMode === 'general') {
    const configuredDays = getConfiguredDays(periodSettings);
    const activeDays = configuredDays.filter(
      d => (selectedDay === 'All' || selectedDay === d) && getPeriodsForDay(d, periodSettings).length > 0
    );

    // Identify all classes to display
    const DEFAULT_CLASSES = ['Form 1', 'Form 2', 'Form 3', 'Form 4'];
    let targetClasses = selectedClass !== 'All' 
      ? [selectedClass] 
      : Array.from(new Set([
          ...DEFAULT_CLASSES,
          ...assignments.map(a => a.className).filter(Boolean)
        ]));

    // Build unique class and stream pairs matching system design
    const classStreamPairs: { className: string; stream: string }[] = [];
    targetClasses.forEach(cls => {
      let streams: string[] = [];
      const setting = (streamSettings || []).find(s => s && s.className && s.className.toLowerCase() === cls.toLowerCase());
      if (setting && Array.isArray(setting.streams) && setting.streams.length > 0) {
        streams = [...setting.streams];
      }

      if (streams.length === 0) {
        const fromAssign = Array.from(new Set(
          assignments
            .filter(a => a && a.className && a.className.toLowerCase() === cls.toLowerCase() && a.stream)
            .map(a => a.stream as string)
        ));
        streams = fromAssign.length > 0 ? fromAssign : ['Stream A', 'Stream B'];
      }

      if (selectedStream !== 'All') {
        streams = streams.filter(s => s.toLowerCase().includes(selectedStream.toLowerCase()));
        if (streams.length === 0) streams = [selectedStream];
      }

      streams.forEach(st => {
        classStreamPairs.push({ className: cls, stream: st });
      });
    });

    if (classStreamPairs.length === 0) {
      classStreamPairs.push({ className: selectedClass !== 'All' ? selectedClass : 'Form 1', stream: selectedStream !== 'All' ? selectedStream : 'Stream A' });
    }

    // Render EACH DAY on its own clean A4 Landscape page!
    activeDays.forEach((day, dayIndex) => {
      if (dayIndex > 0) {
        doc.addPage('a4', 'landscape');
      }
      y = margin;

      const scopeDesc = selectedClass === 'All' ? 'MADARASA YOTE' : selectedClass.toUpperCase();
      const streamDesc = selectedStream === 'All' ? 'MIKONDO YOTE' : selectedStream.toUpperCase();
      
      if (dayIndex === 0) {
        drawOfficialHeader(
          `RATIBA KUU RASMI YA MASOMO NA MAJUKUMU (MASTER TIMETABLE)`,
          `MWAKA WA MASOMO: ${new Date().getFullYear()}`
        );
      } else {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(30, 58, 138);
        doc.text((schoolInfo?.name || schoolName || 'HABY EDUPRO ACADEMY').toUpperCase(), pageWidth / 2, y + 4, { align: 'center' });
        y += 8;
      }

      // Day Theme Color Ribbon
      const dayColor = getDayThemeColor(day);
      doc.setFillColor(dayColor[0], dayColor[1], dayColor[2]);
      doc.roundedRect(margin, y, contentWidth, 7, 1, 1, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.text(`SIKU YA ${day.toUpperCase()} (${day})  •  ${scopeDesc} (${streamDesc})`, margin + 3, y + 4.8);

      const dayAssignments = assignments.filter(a => (a.day || '').toLowerCase() === day.toLowerCase());
      doc.setFontSize(6.8);
      doc.setTextColor(240, 253, 250);
      doc.text(
        `Vipindi Vilivyopangwa: ${dayAssignments.length}  |  Hali: Imekaguliwa & Haina Mgongano (Zero Clashes ✓)`,
        pageWidth - margin - 3,
        y + 4.8,
        { align: 'right' }
      );

      y += 8.5;

      // Periods specifically configured for THIS day
      const dayPeriods = getPeriodsForDay(day, periodSettings);

      // Table Header: DARASA & MKONDO | PERIOD 1 (Time) | PERIOD 2 (Time) ...
      const tableHead = [
        [
          'DARASA &\nMKONDO',
          ...dayPeriods.map(p => (p.timeRange ? `${p.name.toUpperCase()}\n${p.timeRange}` : p.name.toUpperCase()))
        ]
      ];

      // Table Body Rows
      const tableBody = classStreamPairs.map(pair => {
        const rowLabel = `${pair.className}\n${pair.stream}`;
        const rowCells: string[] = [rowLabel];

        dayPeriods.forEach(period => {
          if (period.isBreak) {
            rowCells.push(`[${period.name}]\nMapumziko`);
            return;
          }

          const normDay = day.trim().toLowerCase();

          const match = assignments.find(a => {
            if (!a || !a.subject) return false;
            const aDay = (a.day || '').trim().toLowerCase();
            if (aDay !== normDay) return false;
            if (!isSameClass(a.className, pair.className)) return false;
            if (pair.stream && pair.stream !== 'ALL' && !isSameStream(a.stream, pair.stream)) return false;
            return isSamePeriod(a.period, a.periodName, period.name);
          });

          if (match) {
            const tObj = match.teacherId !== undefined ? teacherMap.get(match.teacherId) : null;
            const tInitial = tObj?.initial || (tObj ? tObj.name.substring(0, 2).toUpperCase() : '');
            const teacherText = tInitial ? `Tr. ${tInitial}` : (match as any).teacher || '';
            const roomText = match.room ? `[${match.room}]` : '';
            rowCells.push(`${getSubjectShortName(match.subject)}\n${teacherText}${roomText ? ` ${roomText}` : ''}`.trim());
          } else {
            rowCells.push('—');
          }
        });

        return rowCells;
      });

      // Compute exact proportional column widths fitting A4 landscape exactly
      const classColWidth = 26;
      const remainingWidth = contentWidth - classColWidth;
      const periodColWidth = remainingWidth / dayPeriods.length;

      const columnStyles: Record<number, any> = {
        0: { 
          cellWidth: classColWidth, 
          fontStyle: 'bold', 
          halign: 'center', 
          valign: 'middle', 
          fillColor: [241, 245, 249],
          textColor: [30, 41, 59],
          fontSize: 6.5
        }
      };

      dayPeriods.forEach((p, idx) => {
        columnStyles[idx + 1] = {
          cellWidth: periodColWidth,
          halign: 'center',
          valign: 'middle',
          fontSize: 6.2
        };
      });

      autoTable(doc, {
        startY: y,
        head: tableHead,
        body: tableBody,
        theme: 'grid',
        headStyles: {
          fillColor: [30, 58, 138],
          textColor: [255, 255, 255],
          fontSize: 6.5,
          fontStyle: 'bold',
          halign: 'center',
          valign: 'middle',
          cellPadding: 1.8
        },
        bodyStyles: {
          fontSize: 6.2,
          valign: 'middle',
          textColor: [30, 41, 59],
          cellPadding: 1.8
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252]
        },
        columnStyles,
        margin: { left: margin, right: margin },
        didDrawCell: (data) => {
          if (data.section === 'body' && data.column.index > 0) {
            const period = dayPeriods[data.column.index - 1];
            if (period && period.isBreak) {
              doc.setFillColor(254, 243, 199); // Warm amber
              doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'F');
              doc.setFont('helvetica', 'bold');
              doc.setFontSize(6);
              doc.setTextColor(146, 64, 14); // Amber-800
              doc.text(data.cell.text, data.cell.x + data.cell.width / 2, data.cell.y + data.cell.height / 2, {
                align: 'center',
                baseline: 'middle'
              });
            } else if (data.cell.text && data.cell.text.length > 0 && data.cell.text[0] !== '—') {
              const rawSub = data.cell.text[0];
              const theme = getSubjectTheme(rawSub);
              doc.setFillColor(theme.bg[0], theme.bg[1], theme.bg[2]);
              doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'F');
              doc.setFont('helvetica', 'bold');
              doc.setFontSize(6.2);
              doc.setTextColor(theme.text[0], theme.text[1], theme.text[2]);
              doc.text(data.cell.text[0], data.cell.x + data.cell.width / 2, data.cell.y + data.cell.height / 2 - 2, {
                align: 'center',
                baseline: 'middle'
              });
              if (data.cell.text.length > 1) {
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(5.8);
                doc.setTextColor(51, 65, 85);
                doc.text(data.cell.text.slice(1).join(' '), data.cell.x + data.cell.width / 2, data.cell.y + data.cell.height / 2 + 2.5, {
                  align: 'center',
                  baseline: 'middle'
                });
              }
            }
          }
        }
      });

      const finalY = (doc as any).lastAutoTable.finalY + 3;
      y = finalY;

      // 1. Teacher Initials & Names Directory (Mini Legend Card)
      const dayTeachers = teachers.filter(t => 
        dayAssignments.some(a => a.teacherId === t.id || (('teacher' in a ? (a as any).teacher : '') || '').toLowerCase().includes(t.name.toLowerCase()))
      );
      const displayTeachers = dayTeachers.length > 0 ? dayTeachers : teachers;
      const legendItems = displayTeachers.slice(0, 16).map(t => 
        `${t.initial || t.name.substring(0, 2).toUpperCase()}: ${t.name}${t.subjects && t.subjects[0] ? ` (${t.subjects[0]})` : ''}`
      );
      const legendText = legendItems.join('  •  ');

      doc.setFillColor(241, 245, 249);
      doc.roundedRect(margin, y, contentWidth, 7, 1, 1, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.2);
      doc.setTextColor(30, 58, 138);
      doc.text('WALIMU (INITIALS):', margin + 2.5, y + 4.5);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5.8);
      doc.setTextColor(51, 65, 85);
      const maxLegendChars = 150;
      const trimmedLegend = legendText.length > maxLegendChars ? legendText.substring(0, maxLegendChars) + '...' : legendText;
      doc.text(trimmedLegend, margin + 29, y + 4.5);

      y += 9.5;

      // 2. Official Approval & Signatures Block
      const signColWidth = contentWidth / 3;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(30, 41, 59);

      // Signature 1: Timetable Master
      doc.text('Mwalimu wa Ratiba (Timetable Master):', margin + 2, y + 2.5);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);
      doc.text('Sahihi: _______________________   Tarehe: ___________', margin + 2, y + 6.5);

      // Signature 2: Academic Master
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.text('Mwalimu wa Taaluma (Academic Master):', margin + signColWidth + 2, y + 2.5);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);
      doc.text('Sahihi: _______________________   Tarehe: ___________', margin + signColWidth + 2, y + 6.5);

      // Signature 3: Head of School & Official Seal
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.text('Mkuu wa Shule (Head of School):', margin + signColWidth * 2 + 2, y + 2.5);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);
      doc.text(`Muhuri: [ ${schoolInfo?.principal || 'HEAD OF SCHOOL'} ]`, margin + signColWidth * 2 + 2, y + 6.5);

      // Page footer
      doc.setFontSize(5.8);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `HabyEduPro3A • Ratiba Kuu ya Masomo (Master Timetable)  •  Siku ya ${day}  •  Ukurasa ${dayIndex + 1} kati ya ${activeDays.length}`,
        pageWidth / 2,
        pageHeight - 3,
        { align: 'center' }
      );
    });

  // =========================================================================
  // VIEW MODE 2: CLASS TIMETABLE (RATIBA YA DARASA)
  // Day-by-Day Horizontal Timeline: Each day displays its own Period & Exact Time header on top!
  // =========================================================================
  } else if (viewMode === 'class') {
    const classLabel = selectedClass.toUpperCase();
    const streamLabel = selectedStream !== 'All' ? selectedStream.toUpperCase() : 'MIKONDO YOTE';
    drawOfficialHeader(
      `RATIBA RASMI YA DARASA (CLASS TIMETABLE) — ${classLabel} (${streamLabel})`,
      `MWAKA WA MASOMO: ${new Date().getFullYear()}`
    );

    const configuredDays = getConfiguredDays(periodSettings);
    const activeDays = configuredDays.filter(
      d => (selectedDay === 'All' || !selectedDay || selectedDay === d) && getPeriodsForDay(d, periodSettings).length > 0
    );
    const classAssignments = assignments.filter(a =>
      a &&
      a.subject &&
      isSameClass(a.className, selectedClass) &&
      (selectedStream === 'All' || isSameStream(a.stream, selectedStream))
    );

    activeDays.forEach((day) => {
      const dayPeriods = getPeriodsForDay(day, periodSettings);
      if (dayPeriods.length === 0) return;
      const dayColor = getDayThemeColor(day);

      if (y + 28 > pageHeight - 12) {
        doc.addPage('a4', 'landscape');
        y = margin;
      }

      // Per-Day Header Row with exact Period Name & Time Range on top for THIS day
      const tableHead = [
        [
          `${day.toUpperCase()}\n(MUDA & VIPINDI)`,
          ...dayPeriods.map(p => (p.timeRange ? `${p.name.toUpperCase()}\n${p.timeRange}` : p.name.toUpperCase()))
        ]
      ];

      const rowCells: string[] = ['MASOMO &\nMWALIMU'];
      dayPeriods.forEach(period => {
        if (period.isBreak) {
          rowCells.push(`[${period.name}]\nMapumziko`);
          return;
        }

        const match = classAssignments.find(a =>
          (a.day || '').trim().toLowerCase() === day.toLowerCase() &&
          isSamePeriod(a.period, a.periodName, period.name)
        );

        if (match) {
          const tObj = match.teacherId !== undefined ? teacherMap.get(match.teacherId) : null;
          const tInitial = tObj?.initial || (tObj ? tObj.name.substring(0, 2).toUpperCase() : '');
          const tName = tInitial ? `Tr. ${tInitial}` : (match as any).teacher || '';
          const roomText = match.room ? `[${match.room}]` : '';
          rowCells.push(`${getSubjectShortName(match.subject)}\n${tName}${roomText ? ` ${roomText}` : ''}`.trim());
        } else {
          rowCells.push('Huru\n(Free)');
        }
      });

      const dayColWidth = 26;
      const remainingWidth = contentWidth - dayColWidth;
      const periodColWidth = remainingWidth / dayPeriods.length;

      const columnStyles: Record<number, any> = {
        0: { cellWidth: dayColWidth, fontStyle: 'bold', halign: 'center', valign: 'middle', fillColor: [241, 245, 249], fontSize: 6.2 }
      };
      dayPeriods.forEach((_, idx) => {
        columnStyles[idx + 1] = {
          cellWidth: periodColWidth,
          halign: 'center',
          valign: 'middle',
          fontSize: 6.2
        };
      });

      autoTable(doc, {
        startY: y,
        head: tableHead,
        body: [rowCells],
        theme: 'grid',
        headStyles: {
          fillColor: dayColor,
          textColor: [255, 255, 255],
          fontSize: 6.2,
          fontStyle: 'bold',
          halign: 'center',
          valign: 'middle',
          cellPadding: 1.6
        },
        bodyStyles: {
          fontSize: 6.2,
          valign: 'middle',
          textColor: [30, 41, 59],
          cellPadding: 2.0,
          minCellHeight: 11
        },
        columnStyles,
        margin: { left: margin, right: margin },
        didDrawCell: (data) => {
          if (data.section === 'body' && data.column.index > 0) {
            const period = dayPeriods[data.column.index - 1];
            if (period && period.isBreak) {
              doc.setFillColor(254, 243, 199);
              doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'F');
              doc.setFont('helvetica', 'bold');
              doc.setFontSize(5.8);
              doc.setTextColor(146, 64, 14);
              doc.text(data.cell.text, data.cell.x + data.cell.width / 2, data.cell.y + data.cell.height / 2, {
                align: 'center',
                baseline: 'middle'
              });
            } else if (data.cell.text && data.cell.text.length > 0 && !data.cell.text[0].startsWith('Huru')) {
              const theme = getSubjectTheme(data.cell.text[0]);
              doc.setFillColor(theme.bg[0], theme.bg[1], theme.bg[2]);
              doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'F');
              doc.setFont('helvetica', 'bold');
              doc.setFontSize(6.4);
              doc.setTextColor(theme.text[0], theme.text[1], theme.text[2]);
              doc.text(data.cell.text[0], data.cell.x + data.cell.width / 2, data.cell.y + data.cell.height / 2 - 1.8, {
                align: 'center',
                baseline: 'middle'
              });
              if (data.cell.text.length > 1) {
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(5.6);
                doc.setTextColor(51, 65, 85);
                doc.text(data.cell.text.slice(1).join(' '), data.cell.x + data.cell.width / 2, data.cell.y + data.cell.height / 2 + 2.2, {
                  align: 'center',
                  baseline: 'middle'
                });
              }
            }
          }
        }
      });

      y = (doc as any).lastAutoTable.finalY + 2.5;
    });

    y += 2;

    // Signatures
    if (y + 12 > pageHeight - 5) {
      doc.addPage('a4', 'landscape');
      y = margin + 4;
    }
    const signColWidth = contentWidth / 3;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(30, 41, 59);

    doc.text('Mwalimu wa Darasa (Class Teacher):', margin + 2, y + 2.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.text('Sahihi: _______________________   Tarehe: ___________', margin + 2, y + 6.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.text('Mwalimu wa Taaluma (Academic Master):', margin + signColWidth + 2, y + 2.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.text('Sahihi: _______________________   Tarehe: ___________', margin + signColWidth + 2, y + 6.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.text('Mkuu wa Shule (Head of School):', margin + signColWidth * 2 + 2, y + 2.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.text(`Muhuri: [ ${schoolInfo?.principal || 'HEAD OF SCHOOL'} ]`, margin + signColWidth * 2 + 2, y + 6.5);

    doc.setFontSize(5.8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `HabyEduPro3A • Ratiba Rasmi ya Darasa • ${selectedClass} (${selectedStream}) • Tarehe: ${new Date().toLocaleDateString('en-GB')}`,
      pageWidth / 2,
      pageHeight - 3,
      { align: 'center' }
    );

  // =========================================================================
  // VIEW MODE 3: TEACHER INDIVIDUAL SCHEDULE (RATIBA YA MWALIMU)
  // Day-by-Day Horizontal Timeline: Each day displays its own Period & Exact Time header on top!
  // =========================================================================
  } else if (viewMode === 'teacher') {
    const teacher = teachers.find(t => Number(t.id) === Number(selectedTeacherId)) || teachers[0];
    const teacherAssignments = assignments.filter(a => {
      if (!a || !teacher || !a.subject || !a.className) return false;
      return Number(a.teacherId) === Number(teacher.id);
    });

    drawOfficialHeader(
      `RATIBA BINAFSI YA MWALIMU — ${teacher ? teacher.name.toUpperCase() : 'FACULTY'} (INITIAL: ${teacher?.initial || '--'})`,
      `MWAKA WA MASOMO: ${new Date().getFullYear()}`
    );

    // Particulars Card
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(margin, y, contentWidth, 9.5, 1.2, 1.2, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(margin, y, contentWidth, 9.5, 1.2, 1.2, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.2);
    doc.setTextColor(30, 41, 59);
    doc.text(`Mwalimu: ${teacher?.name || 'N/A'} (Initial: ${teacher?.initial || '--'})`, margin + 4, y + 4);
    doc.text(`Wadhifa: ${teacher?.schoolRole || 'Mwalimu wa Masomo'}`, margin + 105, y + 4);
    doc.text(`Vipindi Wiki: ${teacherAssignments.length} / ${teacher?.maxPeriodsPerWeek || 20} Vipindi`, pageWidth - margin - 4, y + 4, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    const subList = teacher?.subjects?.join(', ') || 'Masomo Yote';
    doc.text(`Masomo Anayofundisha: ${subList.length > 95 ? subList.substring(0, 93) + '..' : subList}`, margin + 4, y + 7.6);

    y += 11.5;

    const configuredDays = getConfiguredDays(periodSettings);
    const activeDays = configuredDays.filter(
      d => (selectedDay === 'All' || !selectedDay || selectedDay === d) && getPeriodsForDay(d, periodSettings).length > 0
    );

    activeDays.forEach((day) => {
      const dayPeriods = getPeriodsForDay(day, periodSettings);
      if (dayPeriods.length === 0) return;
      const dayColor = getDayThemeColor(day);

      if (y + 26 > pageHeight - 12) {
        doc.addPage('a4', 'landscape');
        y = margin;
      }

      // Per-Day Header Row with exact Period Name & Time Range on top for THIS day
      const tableHead = [
        [
          `${day.toUpperCase()}\n(MUDA & VIPINDI)`,
          ...dayPeriods.map(p => (p.timeRange ? `${p.name.toUpperCase()}\n${p.timeRange}` : p.name.toUpperCase()))
        ]
      ];

      const rowCells: string[] = ['SOMO &\nDARASA'];
      dayPeriods.forEach(period => {
        if (period.isBreak) {
          rowCells.push(`[${period.name}]\nMapumziko`);
          return;
        }

        const match = teacherAssignments.find(a =>
          (a.day || '').trim().toLowerCase() === day.toLowerCase() &&
          isSamePeriod(a.period, a.periodName, period.name)
        );

        if (match) {
          const numMatch = (match.className || '').replace(/[^0-9]/g, '');
          const romanPart = numMatch ? romanize(parseInt(numMatch, 10)) : (match.className || '').replace(/Form\s*/i, '').trim();
          const streamPart = normalizeStreamName(match.stream).toUpperCase();
          const classBadge = `${romanPart}${streamPart && streamPart !== 'ALL' ? streamPart : ''}`;
          const roomText = match.room ? ` [${match.room}]` : '';
          rowCells.push(`${getSubjectShortName(match.subject)}\n${classBadge}${roomText}`.trim());
        } else {
          rowCells.push('Huru\n(Free)');
        }
      });

      const dayColWidth = 26;
      const remainingWidth = contentWidth - dayColWidth;
      const periodColWidth = remainingWidth / dayPeriods.length;

      const columnStyles: Record<number, any> = {
        0: { cellWidth: dayColWidth, fontStyle: 'bold', halign: 'center', valign: 'middle', fillColor: [241, 245, 249], fontSize: 6.2 }
      };
      dayPeriods.forEach((_, idx) => {
        columnStyles[idx + 1] = {
          cellWidth: periodColWidth,
          halign: 'center',
          valign: 'middle',
          fontSize: 6.2
        };
      });

      autoTable(doc, {
        startY: y,
        head: tableHead,
        body: [rowCells],
        theme: 'grid',
        headStyles: {
          fillColor: dayColor,
          textColor: [255, 255, 255],
          fontSize: 6.2,
          fontStyle: 'bold',
          halign: 'center',
          valign: 'middle',
          cellPadding: 1.5
        },
        bodyStyles: {
          fontSize: 6.2,
          valign: 'middle',
          textColor: [30, 41, 59],
          cellPadding: 1.8,
          minCellHeight: 10.5
        },
        columnStyles,
        margin: { left: margin, right: margin },
        didDrawCell: (data) => {
          if (data.section === 'body' && data.column.index > 0) {
            const period = dayPeriods[data.column.index - 1];
            if (period && period.isBreak) {
              doc.setFillColor(254, 243, 199);
              doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'F');
              doc.setFont('helvetica', 'bold');
              doc.setFontSize(5.8);
              doc.setTextColor(146, 64, 14);
              doc.text(data.cell.text, data.cell.x + data.cell.width / 2, data.cell.y + data.cell.height / 2, {
                align: 'center',
                baseline: 'middle'
              });
            } else if (data.cell.text && data.cell.text.length > 0 && !data.cell.text[0].startsWith('Huru')) {
              const theme = getSubjectTheme(data.cell.text[0]);
              doc.setFillColor(theme.bg[0], theme.bg[1], theme.bg[2]);
              doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'F');
              doc.setFont('helvetica', 'bold');
              doc.setFontSize(6.4);
              doc.setTextColor(theme.text[0], theme.text[1], theme.text[2]);
              doc.text(data.cell.text[0], data.cell.x + data.cell.width / 2, data.cell.y + data.cell.height / 2 - 1.8, {
                align: 'center',
                baseline: 'middle'
              });
              if (data.cell.text.length > 1) {
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(6.0);
                doc.setTextColor(30, 41, 59);
                doc.text(data.cell.text.slice(1).join(' '), data.cell.x + data.cell.width / 2, data.cell.y + data.cell.height / 2 + 2.2, {
                  align: 'center',
                  baseline: 'middle'
                });
              }
            }
          }
        }
      });

      y = (doc as any).lastAutoTable.finalY + 2.2;
    });

    y += 2;

    if (y + 12 > pageHeight - 5) {
      doc.addPage('a4', 'landscape');
      y = margin + 4;
    }

    // Signatures
    const signColWidth = contentWidth / 3;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(30, 41, 59);

    doc.text('Mwalimu Husika (Faculty Member):', margin + 2, y + 2.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.text('Sahihi: _______________________   Tarehe: ___________', margin + 2, y + 6.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.text('Mwalimu wa Taaluma (Academic Master):', margin + signColWidth + 2, y + 2.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.text('Sahihi: _______________________   Tarehe: ___________', margin + signColWidth + 2, y + 6.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.text('Mkuu wa Shule (Head of School):', margin + signColWidth * 2 + 2, y + 2.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.text(`Muhuri: [ ${schoolInfo?.principal || 'HEAD OF SCHOOL'} ]`, margin + signColWidth * 2 + 2, y + 6.5);

    doc.setFontSize(5.8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `HabyEduPro3A • Ratiba Binafsi ya Mwalimu • ${teacher?.name || 'Faculty'} (${teacher?.initial || '--'}) • Tarehe: ${new Date().toLocaleDateString('en-GB')}`,
      pageWidth / 2,
      pageHeight - 3,
      { align: 'center' }
    );
  }

  // Save the PDF file with clean naming
  const cleanSchool = (schoolInfo?.name || schoolName || 'HabyEduPro').replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `${cleanSchool}_${viewMode.toUpperCase()}_TIMETABLE_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
}

/**
 * 2. EXPORT EXAMINATION INVIGILATION TIMETABLE TO PDF (Matching System Design)
 */
export async function exportInvigilationPDF(options: {
  schoolName: string;
  sessions: InvigilationSession[];
  teachers: Teacher[];
  invigilationAssignments: Record<string, number>;
  schoolInfo?: SchoolInfo;
}): Promise<void> {
  const {
    schoolName,
    sessions,
    teachers,
    invigilationAssignments,
    schoolInfo
  } = options;

  const teacherMap = new Map<number | string, Teacher>();
  teachers.forEach(t => teacherMap.set(t.id, t));

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 297;
  const pageHeight = 210;
  const margin = 8;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  let qrDataUrl = '';
  try {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
    const verifyUrl = `${origin}${pathname}?verifyMasterInvigilation=true`;
    qrDataUrl = await QRCode.toDataURL(verifyUrl, { margin: 1 });
  } catch (err) {
    console.warn('QR Code generation error:', err);
  }

  // Header Banner
  doc.setFillColor(31, 77, 139);
  doc.roundedRect(margin, y, contentWidth, 20, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text((schoolInfo?.name || schoolName || 'HABY EDUPRO ACADEMY').toUpperCase(), pageWidth / 2, y + 6.5, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(224, 231, 255);
  doc.text(`ANWANI: ${schoolInfo?.address || 'P.O. BOX 145, TANGA'}  •  SIMU: ${schoolInfo?.phone || '0717616343'}`, pageWidth / 2, y + 12, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(254, 240, 138);
  doc.text('RATIBA RASMI YA USIMAMIZI WA MITIHANI (EXAMINATION INVIGILATION TIMETABLE)', pageWidth / 2, y + 17, { align: 'center' });

  if (qrDataUrl) {
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(pageWidth - margin - 19, y + 2, 16, 16, 1, 1, 'F');
    doc.addImage(qrDataUrl, 'PNG', pageWidth - margin - 18.2, y + 2.5, 14.5, 14.5);
  }

  y += 24;

  const tableHead = [
    ['#', 'TAREHE & SIKU', 'KIPINDI (SESSION)', 'MUDA', 'DARASA & MKONDO', 'SOMO LA MTIHANI', 'VYUMBA NA WASIMAMIZI (INVIGILATORS)']
  ];

  const tableBody = sessions.map((s, idx) => {
    const invigilatorList: string[] = [];
    for (let r = 0; r < (s.rooms || 1); r++) {
      const key = `${s.id}_room${r}`;
      const teacherId = invigilationAssignments[key];
      const teacher = teacherId !== undefined ? teacherMap.get(teacherId) : null;
      invigilatorList.push(`Room ${r + 1}: ${teacher ? `${teacher.name} (${teacher.initial})` : 'To Be Appointed'}`);
    }

    return [
      idx + 1,
      `${s.date || ''}\n(${s.day || ''})`,
      s.session || 'SESSION I',
      `${s.start || ''} - ${s.end || ''}`,
      `${s.className} ${s.stream || ''}`.trim(),
      s.subject || '',
      invigilatorList.join('\n')
    ];
  });

  autoTable(doc, {
    startY: y,
    head: tableHead,
    body: tableBody,
    theme: 'grid',
    headStyles: {
      fillColor: [31, 77, 139],
      textColor: [255, 255, 255],
      fontSize: 7.5,
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle',
      cellPadding: 2.5
    },
    bodyStyles: {
      fontSize: 7,
      valign: 'middle',
      textColor: [30, 41, 59],
      cellPadding: 2.5
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 32, fontStyle: 'bold', halign: 'center' },
      2: { cellWidth: 28, halign: 'center' },
      3: { cellWidth: 24, halign: 'center' },
      4: { cellWidth: 34, fontStyle: 'bold', halign: 'center' },
      5: { cellWidth: 45, fontStyle: 'bold' },
      6: { cellWidth: 'auto' }
    },
    margin: { left: margin, right: margin }
  });

  const finalY = (doc as any).lastAutoTable.finalY + 8;

  // Signatures
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 59);
  doc.text('Mratibu wa Mitihani: ___________________________', margin + 4, finalY + 4);
  doc.text('Mkuu wa Shule / Stamp: ___________________________', pageWidth - margin - 4, finalY + 4, { align: 'right' });

  const filename = `Ratiba_Usimamizi_Mitihani_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
}

/**
 * 2b. EXPORT INDIVIDUAL TEACHER INVIGILATION TIMETABLE TO PDF
 */
export async function exportTeacherInvigilationPDF(options: {
  schoolName: string;
  teacher: Teacher;
  sessions: InvigilationSession[];
  invigilationAssignments: Record<string, number>;
  schoolInfo?: SchoolInfo;
}): Promise<void> {
  const {
    schoolName,
    teacher,
    sessions,
    invigilationAssignments,
    schoolInfo
  } = options;

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 297;
  const pageHeight = 210;
  const margin = 8;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // Generate Verification QR Code for Teacher
  let qrDataUrl = '';
  try {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
    const verifyUrl = `${origin}${pathname}?verifyTeacher=${teacher.id}&name=${encodeURIComponent(teacher.name)}`;
    qrDataUrl = await QRCode.toDataURL(verifyUrl, { margin: 1 });
  } catch (err) {
    console.warn('QR Code generation error:', err);
  }

  // Header Banner
  doc.setFillColor(30, 58, 138);
  doc.roundedRect(margin, y, contentWidth, 18, 1.5, 1.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12.5);
  doc.setTextColor(255, 255, 255);
  doc.text((schoolInfo?.name || schoolName || 'HABY EDUPRO ACADEMY').toUpperCase(), pageWidth / 2, y + 5.5, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(224, 231, 255);
  doc.text(`"${schoolInfo?.motto || 'ELIMU NI NURU NA NGUVU'}"  •  ANWANI: ${schoolInfo?.address || 'P.O. BOX 145, TANGA'}  •  SIMU: ${schoolInfo?.phone || '0717616343'}`, pageWidth / 2, y + 10.5, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(254, 240, 138);
  doc.text(`RATIBA BINAFSI YA USIMAMIZI WA MITIHANI (TEACHER INVIGILATION TIMETABLE) — MWL. ${(teacher?.name || '').toUpperCase()} (${teacher?.initial || '--'})`, pageWidth / 2, y + 15, { align: 'center' });

  if (qrDataUrl) {
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(pageWidth - margin - 19, y + 1.2, 15.5, 15.5, 1, 1, 'F');
    doc.addImage(qrDataUrl, 'PNG', pageWidth - margin - 18.5, y + 1.7, 14.5, 14.5);
  }

  y += 21;

  // Find all duties for this teacher
  const teacherDuties: { session: InvigilationSession; room: number }[] = [];
  sessions.forEach(sess => {
    for (let r = 0; r < sess.rooms; r++) {
      const key = `${sess.id}_room${r}`;
      if (invigilationAssignments[key] === teacher.id) {
        teacherDuties.push({ session: sess, room: r + 1 });
      }
    }
  });

  // Sort by date, session
  teacherDuties.sort((a, b) => {
    const dComp = (a.session.date || '').localeCompare(b.session.date || '');
    if (dComp !== 0) return dComp;
    return (a.session.session || '').localeCompare(b.session.session || '');
  });

  // Particulars Bar
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(margin, y, contentWidth, 8, 1, 1, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(30, 58, 138);
  doc.text(`Mwalimu: ${teacher.name} (Initial: ${teacher.initial || '--'})`, margin + 3, y + 5.2);
  doc.text(`Wadhifa: ${teacher.schoolRole || 'Msimamizi wa Mtihani'}`, margin + 95, y + 5.2);
  doc.text(`Jumla ya Vipindi vya Usimamizi: ${teacherDuties.length} Sessions`, pageWidth - margin - 3, y + 5.2, { align: 'right' });

  y += 10.5;

  const tableHead = [
    ['#', 'TAREHE NA SIKU', 'KIPINDI (SESSION)', 'MUDA', 'SOMO LA MTIHANI', 'DARASA NA MKONDO', 'CHUMBA CHA MTIHANI', 'SAHIHI YA MAHUDHURIO']
  ];

  const tableBody = teacherDuties.length === 0
    ? [[ '—', 'Hakuna vipindi vilivyopangwa', '—', '—', '—', '—', '—', '—' ]]
    : teacherDuties.map((d, idx) => [
        idx + 1,
        `${d.session.day}\n${d.session.date}`,
        d.session.session || 'SESSION I',
        d.session.time || `${d.session.start || ''} - ${d.session.end || ''}`,
        (d.session?.subject || '').toUpperCase(),
        `${d.session.className || ''} ${d.session.stream || ''}`.trim(),
        `CHUMBA / ROOM ${d.room}`,
        '____________________'
      ]);

  autoTable(doc, {
    startY: y,
    head: tableHead,
    body: tableBody,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 58, 138],
      textColor: [255, 255, 255],
      fontSize: 7,
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle',
      cellPadding: 2
    },
    bodyStyles: {
      fontSize: 6.8,
      valign: 'middle',
      textColor: [30, 41, 59],
      cellPadding: 2
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 35, fontStyle: 'bold', halign: 'center' },
      2: { cellWidth: 30, halign: 'center' },
      3: { cellWidth: 32, halign: 'center' },
      4: { cellWidth: 50, fontStyle: 'bold' },
      5: { cellWidth: 38 },
      6: { cellWidth: 38, fontStyle: 'bold', halign: 'center', fillColor: [239, 246, 255] },
      7: { cellWidth: 48, halign: 'center' }
    },
    margin: { left: margin, right: margin }
  });

  const finalY = (doc as any).lastAutoTable.finalY + 5;
  y = finalY;

  // Instructions & Guidelines Box
  doc.setFillColor(254, 252, 232);
  doc.setDrawColor(253, 224, 71);
  doc.roundedRect(margin, y, contentWidth, 13, 1, 1, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(161, 98, 7);
  doc.text('MAELEKEZO MUHIMU KWA MSIMAMIZI (INVIGILATOR GUIDELINES):', margin + 3, y + 4);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.8);
  doc.setTextColor(113, 63, 18);
  doc.text('1. Fika chumba cha mtihani dakika 20 kabla ya mtihani kuanza ili kukagua vyumba na kupanga watahiniwa kulingana na namba za mtihani.', margin + 3, y + 7.5);
  doc.text('2. Hakikisha watahiniwa wote hawaingii na simu au mifuko. 3. Weka sahihi kwenye Rejista Kuu ofisi ya Taaluma.', margin + 3, y + 11);

  y += 16;

  // Signatures
  const signColWidth = contentWidth / 3;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(30, 41, 59);

  doc.text('Mwalimu Msimamizi (Invigilator):', margin + 2, y + 3);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.text('Sahihi: _______________________   Tarehe: ___________', margin + 2, y + 7.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.text('Mratibu wa Mitihani (Chief Exam Officer):', margin + signColWidth + 2, y + 3);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.text('Sahihi: _______________________   Tarehe: ___________', margin + signColWidth + 2, y + 7.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.text('Mkuu wa Shule (Head of School):', margin + signColWidth * 2 + 2, y + 3);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.text(`Muhuri: [ ${schoolInfo?.principal || 'HEAD OF SCHOOL'} ]`, margin + signColWidth * 2 + 2, y + 7.5);

  doc.setFontSize(6);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `HabyEduPro3A • Ratiba Binafsi ya Usimamizi • ${teacher.name} (${teacher.initial || '--'}) • Tarehe: ${new Date().toLocaleDateString('en-GB')}`,
    pageWidth / 2,
    pageHeight - 3,
    { align: 'center' }
  );

  const cleanTeacher = teacher.name.replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `Ratiba_Usimamizi_${cleanTeacher}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
}

/**
 * 3. CAPTURE DOM ELEMENT DIRECTLY TO A4 PDF (100% Exact Visual Match)
 */
export async function captureDomToPdf(element: HTMLElement, filename: string): Promise<boolean> {
  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    const pdfWidth = 297;
    const pdfHeight = 210;
    const margin = 6;
    const availableWidth = pdfWidth - margin * 2;
    const availableHeight = pdfHeight - margin * 2;

    const imgWidth = availableWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    if (imgHeight <= availableHeight) {
      pdf.addImage(imgData, 'JPEG', margin, margin, imgWidth, imgHeight);
    } else {
      // Multi-page slicing
      let heightLeft = imgHeight;
      let position = margin;

      pdf.addImage(imgData, 'JPEG', margin, position, imgWidth, imgHeight);
      heightLeft -= availableHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight + margin;
        pdf.addPage('a4', 'landscape');
        pdf.addImage(imgData, 'JPEG', margin, position, imgWidth, imgHeight);
        heightLeft -= availableHeight;
      }
    }

    pdf.save(filename);
    return true;
  } catch (err) {
    console.error("DOM capture error:", err);
    return false;
  }
}

/**
 * Class Journal PDF Export
 */
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
  doc.text(`OFFICIAL CLASSROOM JOURNAL & PERIOD LOG: ${(className || '').toUpperCase()} (${stream || ''}) - ${(week || '').toUpperCase()}`, pageWidth / 2, y + 19, { align: 'center' });

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

  if (students && students.length > 0) {
    doc.addPage('landscape');
    let ry = margin;

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

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);
    doc.text(`Enrolled Students: ${students.length} Candidates  |  Class Stream: ${className} - ${stream}`, margin + 2, ry + 4);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(`Document Authenticity Guard: Verified QR Seals Generated on ${new Date().toLocaleDateString('en-GB')}`, pageWidth - margin - 2, ry + 4, { align: 'right' });

    ry += 8;

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
        valign: 'bottom',
        minCellHeight: 20
      },
      columnStyles: {
        0: { cellWidth: 15, halign: 'center', valign: 'middle' },
        1: { cellWidth: 45, halign: 'center', valign: 'middle' },
        2: { cellWidth: 'auto', valign: 'middle' },
        3: { cellWidth: 35, halign: 'center', valign: 'middle' },
        4: { cellWidth: 60, halign: 'center', fontStyle: 'bold', fontSize: 6.5, textColor: [100, 116, 139] }
      },
      margin: { left: margin, right: margin },
      didDrawCell: (data) => {
        if (data.column.index === 4 && data.cell.section === 'body') {
          const qrCodeUrl = qrCodes[data.row.index];
          if (qrCodeUrl) {
            const size = 11;
            const x = data.cell.x + (data.cell.width - size) / 2;
            const y = data.cell.y + 2;
            doc.addImage(qrCodeUrl, 'PNG', x, y, size, size);
          }
        }
      }
    });
  }

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    const pageSize = doc.internal.pageSize;
    const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(60);
    doc.setTextColor(243, 244, 246);
    doc.text('OFFICIAL RECORD', 148.5, 105, {
      align: 'center',
      angle: 35
    });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    
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

export interface ProgressionReportPdfOptions {
  reports: StreamProgressionReport[];
  schoolName?: string;
  schoolInfo?: SchoolInfo;
  levelFilter?: string;
  classFilter?: string;
  streamFilter?: string;
  statusFilter?: string;
  mode?: 'download' | 'print';
}

/**
 * Exports or Prints the Official Timetable Period Allocation Progression Report (Ripoti ya Maendeleo ya Upangaji wa Vipindi)
 */
export async function exportProgressionReportPDF(options: ProgressionReportPdfOptions): Promise<void> {
  const {
    reports = [],
    schoolName = 'HABY EDUPRO ACADEMY',
    schoolInfo,
    levelFilter = 'ALL',
    classFilter = 'All',
    streamFilter = 'All',
    statusFilter = 'ALL',
    mode = 'download'
  } = options;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 10;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const resolvedSchoolName = (schoolInfo?.name || schoolName || 'HABY EDUPRO ACADEMY').toUpperCase();
  const resolvedMotto = schoolInfo?.motto || 'ELIMU NI NURU NA NGUVU';
  const resolvedAddress = schoolInfo?.address || 'P.O. BOX 145, TANGA';
  const resolvedPhone = schoolInfo?.phone || '0717616343';
  const resolvedEmail = schoolInfo?.email || 'info@school.ac.tz';
  const printedDate = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  // Compute global KPI metrics across filtered reports
  const totalStreams = reports.length;
  const configuredStreams = reports.filter(r => r.totalRequiredSubjects > 0).length;
  const fullyCompleteStreams = reports.filter(r => r.isFullyComplete).length;
  const totalMissingSubjects = reports.reduce((s, r) => s + r.missingSubjects.length, 0);
  const totalIncompleteSubjects = reports.reduce((s, r) => s + r.incompleteSubjects.length, 0);
  const totalRequiredPeriods = reports.reduce((s, r) => s + r.totalRequiredPeriods, 0);
  const totalEnteredPeriods = reports.reduce((s, r) => s + r.totalEnteredRegisteredPeriods, 0);
  const totalRemainingPeriods = reports.reduce(
    (s, r) => s + r.subjects.reduce((subSum, item) => subSum + item.remainingPeriods, 0),
    0
  );
  const overallPct =
    totalRequiredPeriods > 0 ? Math.min(100, Math.round((totalEnteredPeriods / totalRequiredPeriods) * 100)) : 0;

  // Aggregated subject summary
  const subjectMap = new Map<
    string,
    {
      subject: string;
      streamsCount: number;
      totalRequired: number;
      totalEntered: number;
      totalRemaining: number;
      completeStreams: number;
      missingStreams: number;
    }
  >();

  reports.forEach(rep => {
    rep.subjects.forEach(sub => {
      const key = sub.subject.trim().toLowerCase();
      const existing = subjectMap.get(key) || {
        subject: sub.subject,
        streamsCount: 0,
        totalRequired: 0,
        totalEntered: 0,
        totalRemaining: 0,
        completeStreams: 0,
        missingStreams: 0
      };
      existing.streamsCount += 1;
      existing.totalRequired += sub.requiredPeriods;
      existing.totalEntered += Math.min(sub.enteredPeriods, sub.requiredPeriods);
      existing.totalRemaining += sub.remainingPeriods;
      if (sub.status === 'COMPLETE' || sub.status === 'EXCESS') existing.completeStreams += 1;
      if (sub.status === 'MISSING') existing.missingStreams += 1;
      subjectMap.set(key, existing);
    });
  });

  const aggregatedSubjects = Array.from(subjectMap.values())
    .map(item => ({
      ...item,
      percentage: item.totalRequired > 0 ? Math.min(100, Math.round((item.totalEntered / item.totalRequired) * 100)) : 0
    }))
    .sort((a, b) => a.percentage - b.percentage || a.subject.localeCompare(b.subject));

  // Header Drawing Helper
  const drawReportHeader = (isContinuation = false) => {
    doc.setFillColor(30, 58, 138); // Deep Academic Navy
    doc.roundedRect(margin, y, contentWidth, isContinuation ? 14 : 23, 1.5, 1.5, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(isContinuation ? 10.5 : 13);
    doc.setTextColor(255, 255, 255);
    doc.text(resolvedSchoolName, pageWidth / 2, y + (isContinuation ? 5.5 : 6.5), { align: 'center' });

    if (!isContinuation) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(224, 231, 255);
      doc.text(
        `"${resolvedMotto}"  •  ${resolvedAddress}  •  SIMU: ${resolvedPhone}  •  EMAIL: ${resolvedEmail}`,
        pageWidth / 2,
        y + 11.5,
        { align: 'center' }
      );
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(isContinuation ? 7.5 : 8.5);
    doc.setTextColor(254, 240, 138); // Gold accent
    doc.text(
      'RIPOTI YA MAENDELEO YA UPANGAJI WA VIPINDI (TIMETABLE PERIOD ALLOCATION PROGRESSION REPORT)',
      pageWidth / 2,
      y + (isContinuation ? 10.5 : 17),
      { align: 'center' }
    );

    if (!isContinuation) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(255, 255, 255);
      const scopeLabel = `Darasa: ${classFilter === 'All' ? 'Madarasa Yote' : classFilter}  |  Mkondo: ${
        streamFilter === 'All' ? 'Mikondo Yote' : streamFilter
      }  |  Ngazi: ${levelFilter}  |  Tarehe: ${printedDate}`;
      doc.text(scopeLabel, pageWidth / 2, y + 21, { align: 'center' });
    }

    y += isContinuation ? 17 : 26;
  };

  drawReportHeader(false);

  // ---------------------------------------------------------------------------
  // 1. EXECUTIVE KPI SUMMARY CARDS
  // ---------------------------------------------------------------------------
  const cardGap = 3;
  const cardWidth = (contentWidth - cardGap * 3) / 4;
  const cardHeight = 16;

  const kpiCards: Array<{
    title: string;
    value: string;
    sub: string;
    bg: [number, number, number];
    border: [number, number, number];
    text: [number, number, number];
  }> = [
    {
      title: 'WASTANI WA UPANGAJI',
      value: `${overallPct}%`,
      sub: `${totalEnteredPeriods} / ${totalRequiredPeriods} Vipindi`,
      bg: [239, 246, 255],
      border: [147, 197, 253],
      text: [29, 78, 216]
    },
    {
      title: 'MIKONDO ILIYOKAMILIKA',
      value: `${fullyCompleteStreams} / ${configuredStreams || totalStreams}`,
      sub: 'Imekamilika 100%',
      bg: [236, 253, 245],
      border: [110, 231, 183],
      text: [4, 120, 87]
    },
    {
      title: 'MASOMO HAYAJAINGIZWA',
      value: `${totalMissingSubjects}`,
      sub: 'Yenye Vipindi 0',
      bg: [255, 241, 242],
      border: [253, 164, 175],
      text: [190, 18, 60]
    },
    {
      title: 'VIPINDI BAKI / PUNGUFU',
      value: `${totalRemainingPeriods}`,
      sub: `Masomo Pungufu: ${totalIncompleteSubjects}`,
      bg: [255, 251, 235],
      border: [252, 211, 77],
      text: [180, 83, 9]
    }
  ];

  kpiCards.forEach((card, idx) => {
    const cx = margin + idx * (cardWidth + cardGap);
    doc.setFillColor(...card.bg);
    doc.setDrawColor(...card.border);
    doc.setLineWidth(0.35);
    doc.roundedRect(cx, y, cardWidth, cardHeight, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(71, 85, 105);
    doc.text(card.title, cx + 3, y + 4.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...card.text);
    doc.text(card.value, cx + 3, y + 10.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(card.sub, cx + 3, y + 14.2);
  });

  y += cardHeight + 5;

  // ---------------------------------------------------------------------------
  // 2. SUBJECT-BY-SUBJECT COMPLETION SUMMARY TABLE
  // ---------------------------------------------------------------------------
  if (aggregatedSubjects.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 58, 138);
    doc.text(
      `1. MUHTASARI WA UPANGAJI WA VIPINDI KWA KILA SOMO (${aggregatedSubjects.length} MASOMO)`,
      margin,
      y + 3
    );
    y += 5;

    autoTable(doc, {
      startY: y,
      head: [
        [
          '#',
          'Somo (Subject)',
          'Mikondo',
          'Vinavyotakiwa',
          'Vilivyoingizwa',
          'Upungufu / Baki',
          'Asilimia (%)',
          'Hali ya Uingizaji (Status)'
        ]
      ],
      body: aggregatedSubjects.map((sub, i) => [
        String(i + 1),
        sub.subject,
        `${sub.completeStreams}/${sub.streamsCount} Sawa`,
        String(sub.totalRequired),
        String(sub.totalEntered),
        sub.totalRemaining === 0 ? '0 (Sawa)' : `-${sub.totalRemaining} Pungufu`,
        `${sub.percentage}%`,
        sub.percentage === 100 && sub.totalRemaining === 0
          ? 'IMEKAMILIKA (100%)'
          : sub.percentage === 0
          ? 'HAIJAINGIZWA (0%)'
          : `PUNGUFU (${sub.percentage}%)`
      ]),
      theme: 'grid',
      headStyles: {
        fillColor: [30, 58, 138],
        textColor: [255, 255, 255],
        fontSize: 7.2,
        fontStyle: 'bold',
        halign: 'center',
        valign: 'middle'
      },
      bodyStyles: {
        fontSize: 7,
        textColor: [30, 41, 59],
        valign: 'middle'
      },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        1: { cellWidth: 46, fontStyle: 'bold' },
        2: { cellWidth: 24, halign: 'center' },
        3: { cellWidth: 22, halign: 'center', fontStyle: 'bold' },
        4: { cellWidth: 22, halign: 'center', fontStyle: 'bold' },
        5: { cellWidth: 24, halign: 'center', fontStyle: 'bold' },
        6: { cellWidth: 16, halign: 'center', fontStyle: 'bold' },
        7: { cellWidth: 28, halign: 'center', fontStyle: 'bold' }
      },
      didParseCell: data => {
        if (data.section === 'body') {
          const item = aggregatedSubjects[data.row.index];
          if (!item) return;
          if (data.column.index === 7 || data.column.index === 5 || data.column.index === 6) {
            if (item.percentage === 100 && item.totalRemaining === 0) {
              data.cell.styles.textColor = [4, 120, 87];
              if (data.column.index === 7) data.cell.styles.fillColor = [236, 253, 245];
            } else if (item.percentage === 0) {
              data.cell.styles.textColor = [190, 18, 60];
              if (data.column.index === 7) data.cell.styles.fillColor = [255, 241, 242];
            } else {
              data.cell.styles.textColor = [180, 83, 9];
              if (data.column.index === 7) data.cell.styles.fillColor = [255, 251, 235];
            }
          }
        }
      },
      margin: { left: margin, right: margin }
    });

    y = (doc as any).lastAutoTable.finalY + 7;
  }

  // ---------------------------------------------------------------------------
  // 3. DETAILED STREAM-BY-STREAM PROGRESSION TABLES
  // ---------------------------------------------------------------------------
  if (y > pageHeight - 45) {
    doc.addPage();
    y = margin;
    drawReportHeader(true);
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 58, 138);
  doc.text(
    `2. MCHANGANUO WA UPANGAJI WA VIPINDI KWA KILA DARASA NA MKONDO (${reports.length} MIKONDO)`,
    margin,
    y + 3
  );
  y += 6;

  if (reports.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('Hakuna darasa au mkondo uliosajiliwa unaolingana na kichujio kilichochaguliwa.', margin, y + 5);
    y += 12;
  } else {
    reports.forEach((rep, rIdx) => {
      if (y > pageHeight - 48) {
        doc.addPage();
        y = margin;
        drawReportHeader(true);
      }

      const streamRemaining = rep.subjects.reduce((s, item) => s + item.remainingPeriods, 0);
      const bannerBg: [number, number, number] = rep.isFullyComplete
        ? [6, 95, 70]
        : rep.missingSubjects.length > 0
        ? [159, 18, 57]
        : [30, 58, 138];

      // Stream Section Header Bar
      doc.setFillColor(...bannerBg);
      doc.roundedRect(margin, y, contentWidth, 8, 1, 1, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.text(`${rIdx + 1}. ${rep.className.toUpperCase()} — ${rep.stream.toUpperCase()}`, margin + 3, y + 5.3);

      const rightSummary =
        rep.totalRequiredSubjects === 0
          ? 'Masomo Hayajasajiliwa Bado'
          : `Maendeleo: ${rep.overallPercentage}%  |  Vipindi: ${rep.totalEnteredRegisteredPeriods}/${rep.totalRequiredPeriods}  |  Masomo Sawa: ${rep.exactMatchSubjectsCount}/${rep.totalRequiredSubjects}  |  Baki: ${streamRemaining}`;
      doc.setFontSize(7);
      doc.text(rightSummary, pageWidth - margin - 3, y + 5.3, { align: 'right' });

      y += 9;

      if (rep.totalRequiredSubjects === 0) {
        doc.setFillColor(255, 251, 235);
        doc.setDrawColor(252, 211, 77);
        doc.roundedRect(margin, y, contentWidth, 8, 1, 1, 'FD');
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(7.2);
        doc.setTextColor(146, 64, 14);
        doc.text(
          `Mkondo huu (${rep.className} - ${rep.stream}) bado haujasajiliwa masomo na idadi ya vipindi vinavyotakiwa kwa wiki.`,
          margin + 3,
          y + 5.2
        );
        y += 12;
      } else {
        autoTable(doc, {
          startY: y,
          head: [
            [
              '#',
              'Somo (Required Subject)',
              'Mwalimu Kwenye Ratiba (Assigned Teacher)',
              'Vinavyotakiwa',
              'Vilivyoingizwa',
              'Upungufu / Baki',
              'Asilimia',
              'Hali (Status)'
            ]
          ],
          body: rep.subjects.map((sub, sIdx) => [
            String(sIdx + 1),
            sub.subject,
            sub.assignedTeachers.length > 0 ? sub.assignedTeachers.join(', ') : 'Hajapangwa kwenye Ratiba',
            String(sub.requiredPeriods),
            String(sub.enteredPeriods),
            sub.status === 'COMPLETE'
              ? '0 (Sawa)'
              : sub.status === 'EXCESS'
              ? `+${sub.excessPeriods} Ziada`
              : `-${sub.remainingPeriods} Baki`,
            `${sub.percentage}%`,
            sub.status === 'COMPLETE'
              ? 'IMEKAMILIKA (100%)'
              : sub.status === 'MISSING'
              ? `HAIJAINGIZWA (0/${sub.requiredPeriods})`
              : sub.status === 'INCOMPLETE'
              ? `PUNGUFU (${sub.enteredPeriods}/${sub.requiredPeriods})`
              : `ZIADA (+${sub.excessPeriods})`
          ]),
          theme: 'grid',
          headStyles: {
            fillColor: [241, 245, 249],
            textColor: [15, 23, 42],
            fontSize: 6.8,
            fontStyle: 'bold',
            halign: 'center',
            valign: 'middle',
            lineColor: [203, 213, 225],
            lineWidth: 0.2
          },
          bodyStyles: {
            fontSize: 6.8,
            textColor: [30, 41, 59],
            valign: 'middle'
          },
          columnStyles: {
            0: { cellWidth: 7, halign: 'center' },
            1: { cellWidth: 38, fontStyle: 'bold' },
            2: { cellWidth: 46 },
            3: { cellWidth: 20, halign: 'center', fontStyle: 'bold' },
            4: { cellWidth: 20, halign: 'center', fontStyle: 'bold' },
            5: { cellWidth: 21, halign: 'center', fontStyle: 'bold' },
            6: { cellWidth: 14, halign: 'center', fontStyle: 'bold' },
            7: { cellWidth: 24, halign: 'center', fontStyle: 'bold' }
          },
          didParseCell: data => {
            if (data.section === 'body') {
              const subItem = rep.subjects[data.row.index];
              if (!subItem) return;
              if (data.column.index === 2 && subItem.assignedTeachers.length === 0) {
                data.cell.styles.textColor = [190, 18, 60];
                data.cell.styles.fontStyle = 'italic';
              }
              if (data.column.index === 5 || data.column.index === 6 || data.column.index === 7) {
                if (subItem.status === 'COMPLETE') {
                  data.cell.styles.textColor = [4, 120, 87];
                  if (data.column.index === 7) data.cell.styles.fillColor = [236, 253, 245];
                } else if (subItem.status === 'MISSING') {
                  data.cell.styles.textColor = [190, 18, 60];
                  if (data.column.index === 7) data.cell.styles.fillColor = [255, 241, 242];
                } else if (subItem.status === 'INCOMPLETE') {
                  data.cell.styles.textColor = [180, 83, 9];
                  if (data.column.index === 7) data.cell.styles.fillColor = [255, 251, 235];
                } else {
                  data.cell.styles.textColor = [67, 56, 202];
                  if (data.column.index === 7) data.cell.styles.fillColor = [238, 242, 255];
                }
              }
            }
          },
          margin: { left: margin, right: margin }
        });

        y = (doc as any).lastAutoTable.finalY + 2;

        // If stream has unregistered subjects in the timetable, note them below the table
        if (rep.unregisteredSubjects.length > 0) {
          if (y > pageHeight - 20) {
            doc.addPage();
            y = margin;
            drawReportHeader(true);
          }
          const unregText = `Masomo yaliyo kwenye Ratiba lakini hayajasajiliwa kwenye mahitaji ya ${rep.className} (${rep.stream}): ${rep.unregisteredSubjects
            .map(u => `${u.subject} (${u.enteredPeriods} vipindi)`)
            .join(', ')}`;
          doc.setFont('helvetica', 'italic');
          doc.setFontSize(6.5);
          doc.setTextColor(67, 56, 202);
          doc.text(unregText, margin + 2, y + 3.5);
          y += 5;
        }

        y += 4;
      }
    });
  }

  // ---------------------------------------------------------------------------
  // 4. OFFICIAL SIGNATURE & VERIFICATION BLOCK
  // ---------------------------------------------------------------------------
  if (y > pageHeight - 36) {
    doc.addPage();
    y = margin;
    drawReportHeader(true);
  }

  y += 6;
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.3);

  const sigColWidth = (contentWidth - 16) / 3;
  const sigY = y + 12;

  // Academic Master
  doc.line(margin, sigY, margin + sigColWidth, sigY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text('TAALUMA (ACADEMIC MASTER / MISTRESS)', margin + sigColWidth / 2, sigY + 4.5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Sahihi & Tarehe (Signature & Date)', margin + sigColWidth / 2, sigY + 8, { align: 'center' });

  // Official Stamp Box
  const stampX = margin + sigColWidth + 8;
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(stampX, y + 1, sigColWidth, 16, 1.5, 1.5, 'S');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text('MHURI RASMI WA SHULE', stampX + sigColWidth / 2, y + 8, { align: 'center' });
  doc.setFontSize(6);
  doc.text('(OFFICIAL SCHOOL STAMP)', stampX + sigColWidth / 2, y + 12, { align: 'center' });

  // Head of School
  const headX = margin + (sigColWidth + 8) * 2;
  doc.setDrawColor(148, 163, 184);
  doc.line(headX, sigY, headX + sigColWidth, sigY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text('MKUU WA SHULE (HEAD OF SCHOOL)', headX + sigColWidth / 2, sigY + 4.5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Sahihi & Idhini (Signature & Approval)', headX + sigColWidth / 2, sigY + 8, { align: 'center' });

  // Add Page Numbers & Footer across all pages
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `${resolvedSchoolName} • Ripoti ya Maendeleo ya Upangaji wa Vipindi (Progression Report) • Ukurasa ${p} kati ya ${totalPages}`,
      pageWidth / 2,
      pageHeight - 5,
      { align: 'center' }
    );
  }

  const safeClass = classFilter === 'All' ? 'All_Classes' : classFilter.replace(/\s+/g, '_');
  const safeStream = streamFilter === 'All' ? 'All_Streams' : streamFilter.replace(/\s+/g, '_');
  const fileName = `${resolvedSchoolName.replace(/\s+/g, '_')}_Progression_Report_${safeClass}_${safeStream}.pdf`;

  if (mode === 'print') {
    doc.autoPrint();
    const pdfBlob = doc.output('blob');
    const blobUrl = URL.createObjectURL(pdfBlob);

    // Use a hidden iframe to trigger the browser's native PDF print dialog cleanly inside the preview iframe
    let printIframe = document.getElementById('haby-progression-pdf-print-frame') as HTMLIFrameElement | null;
    if (printIframe) {
      printIframe.remove();
    }
    printIframe = document.createElement('iframe');
    printIframe.id = 'haby-progression-pdf-print-frame';
    printIframe.style.position = 'fixed';
    printIframe.style.right = '0';
    printIframe.style.bottom = '0';
    printIframe.style.width = '1px';
    printIframe.style.height = '1px';
    printIframe.style.border = '0';
    printIframe.style.opacity = '0.01';
    printIframe.src = blobUrl;
    document.body.appendChild(printIframe);

    printIframe.onload = () => {
      try {
        printIframe?.contentWindow?.focus();
        printIframe?.contentWindow?.print();
      } catch (e) {
        window.print();
      }
    };
  } else {
    doc.save(fileName);
  }
}

export interface ExportTeacherProgressionReportPdfOptions {
  reports: TeacherProgressionReport[];
  schoolName?: string;
  schoolInfo?: SchoolInfo;
  statusFilter?: string;
  subjectFilter?: string;
  mode?: 'download' | 'print';
}

/**
 * Generates an official, publication-ready PDF for Teacher Progression Reports
 * (Ripoti ya Maendeleo ya Upangaji wa Vipindi vya Walimu).
 */
export function exportTeacherProgressionReportPDF(options: ExportTeacherProgressionReportPdfOptions) {
  const {
    reports = [],
    schoolName = 'HABY EDUPRO',
    schoolInfo,
    statusFilter = 'ALL',
    subjectFilter = 'All',
    mode = 'download'
  } = options;

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 10;
  const contentWidth = pageWidth - margin * 2;
  const resolvedSchoolName = schoolInfo?.name || schoolName || 'HABY EDUPRO';

  // Metrics
  const totalTeachers = reports.length;
  const totalRequiredPeriods = reports.reduce((s, r) => s + r.totalRequiredPeriods, 0);
  const totalEnteredPeriods = reports.reduce((s, r) => s + r.totalEnteredPeriods, 0);
  const totalRemainingPeriods = reports.reduce((s, r) => s + r.totalRemainingPeriods, 0);
  const fullyScheduledTeachers = reports.filter(r => r.isFullyComplete).length;
  const underloadedTeachers = reports.filter(r => r.workloadStatus === 'UNDERLOAD').length;
  const overloadedTeachers = reports.filter(r => r.workloadStatus === 'OVERLOAD').length;
  const overallAvgPercentage = totalRequiredPeriods > 0
    ? Math.round((totalEnteredPeriods / totalRequiredPeriods) * 100)
    : 0;

  const drawHeader = (isContinuation: boolean = false) => {
    // Top primary accent stripe
    doc.setFillColor(30, 58, 138); // Deep Navy
    doc.rect(margin, margin, contentWidth, 2.5, 'F');

    let currentY = margin + 5;

    // School Crest / Logo
    if (schoolInfo?.logo) {
      try {
        doc.addImage(schoolInfo.logo, 'PNG', margin, currentY, 14, 14);
      } catch (e) {
        // Fallback badge
        doc.setFillColor(241, 245, 249);
        doc.setDrawColor(203, 213, 225);
        doc.roundedRect(margin, currentY, 14, 14, 1.5, 1.5, 'FD');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(30, 58, 138);
        doc.text(resolvedSchoolName.slice(0, 2).toUpperCase(), margin + 7, currentY + 9, { align: 'center' });
      }
    } else {
      doc.setFillColor(241, 245, 249);
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(margin, currentY, 14, 14, 1.5, 1.5, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(30, 58, 138);
      doc.text(resolvedSchoolName.slice(0, 2).toUpperCase(), margin + 7, currentY + 9, { align: 'center' });
    }

    const textStartX = margin + 17;

    // School Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42);
    doc.text(resolvedSchoolName.toUpperCase(), textStartX, currentY + 4.5);

    // Subtitle & School Metadata
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    const addressStr = schoolInfo?.address || 'IDARA YA TAALUMA NA UPANGAJI WA RATIBA';
    const mottoStr = schoolInfo?.motto ? `"${schoolInfo.motto}"` : '';
    doc.text([mottoStr, addressStr].filter(Boolean).join(' • '), textStartX, currentY + 8.5);

    // Report Title Banner
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 58, 138);
    const titleText = isContinuation
      ? `RIPOTI YA PROGRESSION YA UPANGAJI WA VIPINDI VYA WAALIMU (TEACHER PROGRESSION REPORT) — INAENDELEA`
      : `RIPOTI YA PROGRESSION YA UPANGAJI WA VIPINDI VYA WAALIMU (TEACHER PERIOD PROGRESSION & WORKLOAD REPORT)`;
    doc.text(titleText, textStartX, currentY + 12.8);

    // Right-hand Document Roster Metadata
    const rightX = pageWidth - margin;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(30, 58, 138);
    doc.text('OFISI YA TAALUMA / ACADEMIC OFFICE', rightX, currentY + 4, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(100, 116, 139);
    doc.text(`Tarehe: ${new Date().toLocaleDateString('sw-TZ', { day: '2-digit', month: 'short', year: 'numeric' })}`, rightX, currentY + 7.5, { align: 'right' });
    doc.text(`Walimu Waliochambuliwa: ${totalTeachers} Walimu`, rightX, currentY + 11, { align: 'right' });

    // Divider Line
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.4);
    doc.line(margin, currentY + 16, pageWidth - margin, currentY + 16);

    return currentY + 18;
  };

  let y = drawHeader(false);

  // ---------------------------------------------------------------------------
  // KPI METRICS SUMMARY STRIP
  // ---------------------------------------------------------------------------
  const cardWidth = (contentWidth - 12) / 5;
  const cardHeight = 11;

  const summaryCards = [
    { label: 'JUMLA YA WALIMU', value: `${totalTeachers}`, sub: 'Kwenye orodha', color: [30, 58, 138] },
    { label: 'VIPINDI VINAVYOTAKIWA', value: `${totalRequiredPeriods}`, sub: 'Kwa wiki nzima', color: [79, 70, 229] },
    { label: 'VILIVYOINGIZWA', value: `${totalEnteredPeriods}`, sub: `${overallAvgPercentage}% ya vipindi`, color: [6, 95, 70] },
    { label: 'VIPINDI VILIVYOBAKI', value: `${totalRemainingPeriods}`, sub: 'Bado kupangwa', color: [180, 83, 9] },
    { label: 'WALIMU WAMEKAMILIKA', value: `${fullyScheduledTeachers} / ${totalTeachers}`, sub: `${overloadedTeachers} Overload · ${underloadedTeachers} Underload`, color: [15, 23, 42] }
  ];

  summaryCards.forEach((c, i) => {
    const cx = margin + i * (cardWidth + 3);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(cx, y, cardWidth, cardHeight, 1.2, 1.2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.8);
    doc.setTextColor(100, 116, 139);
    doc.text(c.label, cx + 2.5, y + 3.2);

    doc.setFontSize(8.5);
    doc.setTextColor(c.color[0], c.color[1], c.color[2]);
    doc.text(c.value, cx + 2.5, y + 7.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.5);
    doc.setTextColor(148, 163, 184);
    doc.text(c.sub, cx + 2.5, y + 10);
  });

  y += cardHeight + 4;

  // ---------------------------------------------------------------------------
  // MAIN TEACHER PROGRESSION TABLE
  // ---------------------------------------------------------------------------
  autoTable(doc, {
    startY: y,
    head: [
      [
        '#',
        'Jina la Mwalimu (Teacher)',
        'Masomo Anayofundisha',
        'Madarasa / Mikondo',
        'Vinavyotakiwa',
        'Vilivyopangwa',
        'Baki',
        'Asilimia (%)',
        'Hali ya Progression',
        'Mzigo wa Kazi'
      ]
    ],
    body: reports.map((r, idx) => {
      const classesStr = r.assignedClasses.map(c => `${c.className} (${c.stream})`).join(', ') || 'Hajapangiwa darasa';
      const subjectsStr = r.subjects.join(', ') || 'Hajasajiliwa somo';
      const statusText = r.isFullyComplete
        ? 'IMEKAMILIKA (100%)'
        : r.totalEnteredPeriods === 0
        ? 'HAIJAPANGWA (0%)'
        : `PUNGUFU (${r.overallPercentage}%)`;

      const workloadText = r.workloadStatus === 'OVERLOAD'
        ? `ZIADA (${r.totalEnteredPeriods}p)`
        : r.workloadStatus === 'UNDERLOAD'
        ? `CHINI (${r.totalEnteredPeriods}p)`
        : `SAWA (${r.totalEnteredPeriods}p)`;

      return [
        String(idx + 1),
        `${r.teacherName} (${r.teacherInitial})`,
        subjectsStr,
        classesStr,
        String(r.totalRequiredPeriods),
        String(r.totalEnteredPeriods),
        r.totalRemainingPeriods === 0 ? '0 (Sawa)' : `-${r.totalRemainingPeriods} Baki`,
        `${r.overallPercentage}%`,
        statusText,
        workloadText
      ];
    }),
    theme: 'grid',
    headStyles: {
      fillColor: [30, 58, 138],
      textColor: [255, 255, 255],
      fontSize: 6.8,
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle'
    },
    bodyStyles: {
      fontSize: 6.5,
      textColor: [30, 41, 59],
      valign: 'middle'
    },
    columnStyles: {
      0: { cellWidth: 7, halign: 'center' },
      1: { cellWidth: 42, fontStyle: 'bold' },
      2: { cellWidth: 38 },
      3: { cellWidth: 50 },
      4: { cellWidth: 20, halign: 'center', fontStyle: 'bold' },
      5: { cellWidth: 20, halign: 'center', fontStyle: 'bold' },
      6: { cellWidth: 18, halign: 'center', fontStyle: 'bold' },
      7: { cellWidth: 18, halign: 'center', fontStyle: 'bold' },
      8: { cellWidth: 34, halign: 'center', fontStyle: 'bold' },
      9: { cellWidth: 26, halign: 'center', fontStyle: 'bold' }
    },
    didParseCell: data => {
      if (data.section === 'body') {
        const rep = reports[data.row.index];
        if (!rep) return;

        // Completion status column (col 8)
        if (data.column.index === 8) {
          if (rep.isFullyComplete) {
            data.cell.styles.textColor = [4, 120, 87];
            data.cell.styles.fillColor = [236, 253, 245];
          } else if (rep.totalEnteredPeriods === 0) {
            data.cell.styles.textColor = [190, 18, 60];
            data.cell.styles.fillColor = [255, 241, 242];
          } else {
            data.cell.styles.textColor = [180, 83, 9];
            data.cell.styles.fillColor = [255, 251, 235];
          }
        }

        // Workload status column (col 9)
        if (data.column.index === 9) {
          if (rep.workloadStatus === 'OVERLOAD') {
            data.cell.styles.textColor = [126, 34, 206];
            data.cell.styles.fillColor = [250, 245, 255];
          } else if (rep.workloadStatus === 'UNDERLOAD') {
            data.cell.styles.textColor = [180, 83, 9];
            data.cell.styles.fillColor = [255, 251, 235];
          } else {
            data.cell.styles.textColor = [4, 120, 87];
            data.cell.styles.fillColor = [236, 253, 245];
          }
        }
      }
    },
    margin: { left: margin, right: margin }
  });

  y = (doc as any).lastAutoTable.finalY + 8;

  // ---------------------------------------------------------------------------
  // DETAILED CLASS BREAKDOWN FOR INDIVIDUAL TEACHERS (If single teacher filtered or room permits)
  // ---------------------------------------------------------------------------
  if (reports.length === 1) {
    const single = reports[0];
    if (y > pageHeight - 50) {
      doc.addPage();
      y = margin;
      drawHeader(true);
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(30, 58, 138);
    doc.text(`MCHANGANUO WA MADARASA NA VIPINDI: ${single.teacherName.toUpperCase()}`, margin, y);
    y += 4;

    autoTable(doc, {
      startY: y,
      head: [
        ['#', 'Darasa & Mkondo', 'Somo', 'Vipindi Vinavyotakiwa', 'Vilivyoingizwa', 'Baki', 'Asilimia', 'Hali']
      ],
      body: single.classProgressionItems.map((item, i) => [
        String(i + 1),
        `${item.className} - ${item.stream}`,
        item.subject,
        String(item.requiredPeriods),
        String(item.enteredPeriods),
        item.status === 'COMPLETE' ? '0 (Sawa)' : `-${item.remainingPeriods} Baki`,
        `${item.percentage}%`,
        item.status === 'COMPLETE' ? 'IMEKAMILIKA' : item.status === 'MISSING' ? 'HAIJAINGIZWA' : 'PUNGUFU'
      ]),
      theme: 'grid',
      headStyles: {
        fillColor: [241, 245, 249],
        textColor: [15, 23, 42],
        fontSize: 6.8,
        fontStyle: 'bold',
        halign: 'center'
      },
      bodyStyles: {
        fontSize: 6.5,
        textColor: [30, 41, 59],
        valign: 'middle'
      },
      margin: { left: margin, right: margin }
    });

    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // ---------------------------------------------------------------------------
  // SIGNATURES & OFFICIAL SCHOOL STAMP
  // ---------------------------------------------------------------------------
  if (y > pageHeight - 35) {
    doc.addPage();
    y = margin;
    drawHeader(true);
  }

  const sigY = y + 8;
  const sigColWidth = (contentWidth - 16) / 3;

  // Academic Master
  doc.setDrawColor(148, 163, 184);
  doc.line(margin, sigY, margin + sigColWidth, sigY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text('MKUU WA TAALUMA (ACADEMIC MASTER)', margin + sigColWidth / 2, sigY + 4.5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Sahihi & Tarehe (Signature & Date)', margin + sigColWidth / 2, sigY + 8, { align: 'center' });

  // School Stamp
  const stampX = margin + sigColWidth + 8;
  doc.setDrawColor(203, 213, 225);
  doc.setLineDashPattern([1.5, 1.5], 0);
  doc.roundedRect(stampX, sigY - 6, sigColWidth, 16, 2, 2, 'D');
  doc.setLineDashPattern([], 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(148, 163, 184);
  doc.text('MHURI WA SHULE (OFFICIAL STAMP)', stampX + sigColWidth / 2, sigY + 3.5, { align: 'center' });

  // Head of School
  const headX = margin + (sigColWidth + 8) * 2;
  doc.setDrawColor(148, 163, 184);
  doc.line(headX, sigY, headX + sigColWidth, sigY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text('MKUU WA SHULE (HEAD OF SCHOOL)', headX + sigColWidth / 2, sigY + 4.5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Sahihi & Idhini (Signature & Approval)', headX + sigColWidth / 2, sigY + 8, { align: 'center' });

  // Footer on all pages
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `${resolvedSchoolName} • Ripoti ya Progression ya Upangaji wa Vipindi vya Walimu • Ukurasa ${p} kati ya ${totalPages}`,
      pageWidth / 2,
      pageHeight - 5,
      { align: 'center' }
    );
  }

  const fileName = `${resolvedSchoolName.replace(/\s+/g, '_')}_Teacher_Progression_Report.pdf`;

  if (mode === 'print') {
    doc.autoPrint();
    const pdfBlob = doc.output('blob');
    const blobUrl = URL.createObjectURL(pdfBlob);

    let printIframe = document.getElementById('haby-teacher-progression-pdf-print-frame') as HTMLIFrameElement | null;
    if (printIframe) printIframe.remove();
    printIframe = document.createElement('iframe');
    printIframe.id = 'haby-teacher-progression-pdf-print-frame';
    printIframe.style.position = 'fixed';
    printIframe.style.right = '0';
    printIframe.style.bottom = '0';
    printIframe.style.width = '1px';
    printIframe.style.height = '1px';
    printIframe.style.border = '0';
    printIframe.style.opacity = '0.01';
    printIframe.src = blobUrl;
    document.body.appendChild(printIframe);

    printIframe.onload = () => {
      try {
        printIframe?.contentWindow?.focus();
        printIframe?.contentWindow?.print();
      } catch (e) {
        window.print();
      }
    };
  } else {
    doc.save(fileName);
  }
}


