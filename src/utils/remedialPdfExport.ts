import { jsPDF } from 'jspdf';
import { SchoolInfo } from '../types';

export interface RemedialTimetableEntry {
  id?: string;
  class_name: string;
  stream: string;
  subject: string;
  teacher_name: string;
  date?: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  period_time?: string;
  room?: string;
  term?: string;
  academic_year?: string;
  notes?: string;
}

export interface RemedialPdfExportOptions {
  entries: RemedialTimetableEntry[];
  schoolInfo?: SchoolInfo;
  className: string;
  streamName: string;
  academicYear?: string;
}

/**
 * Generates an official, clean Remedial Timetable PDF for a specific class & stream.
 * Requirement: PDF ya ratiba iwe na logo ya HABY EDU PRO na kichwa: RATIBA YA REMEDIAL - DARASA 5A - 2026
 */
export function exportRemedialTimetablePDF(options: RemedialPdfExportOptions): void {
  const {
    entries,
    schoolInfo,
    className,
    streamName,
    academicYear = new Date().getFullYear().toString()
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

  // Header Banner
  doc.setFillColor(31, 77, 139); // Navy #1f4d8b
  doc.rect(margin, margin, contentWidth, 24, 'F');

  // School Name
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text((schoolInfo?.name || 'HABY EDU PRO ACADEMY').toUpperCase(), pageWidth / 2, margin + 7, { align: 'center' });

  // Address
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const addr = `${schoolInfo?.address || 'P.O. Box 1234, Tanga, Tanzania'} • Tel: ${schoolInfo?.phone || '+255 717 616 343'}`;
  doc.text(addr, pageWidth / 2, margin + 13, { align: 'center' });

  // Motto
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.text(`"${schoolInfo?.motto || 'Education for Development & Integrity'}"`, pageWidth / 2, margin + 18.5, { align: 'center' });

  let y = margin + 28;

  // Title Box: e.g. "RATIBA YA REMEDIAL - DARASA 5A - 2026"
  let classDisplay = className.trim().toUpperCase();
  if (/^(CLASS|STANDARD|STD)\s*(\d+)/i.test(classDisplay)) {
    const num = classDisplay.replace(/^(CLASS|STANDARD|STD)\s*/i, '');
    classDisplay = `DARASA ${num}`;
  }
  const cleanStream = streamName === 'All Streams' || streamName === 'All' 
    ? ' (MIKONDO YOTE)' 
    : streamName.replace(/^STREAM\s+/i, '').trim().toUpperCase();

  const titleText = `RATIBA YA REMEDIAL - ${classDisplay}${cleanStream !== ' (MIKONDO YOTE)' ? cleanStream : cleanStream} - ${academicYear}`;

  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(31, 77, 139);
  doc.setLineWidth(0.6);
  doc.roundedRect(margin, y, contentWidth, 14, 2, 2, 'FD');

  doc.setTextColor(31, 77, 139);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(titleText, pageWidth / 2, y + 6, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  const printDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  doc.text(`Kipindi cha Masomo ya Ziada na Matayarisho • Imetolewa Tarehe: ${printDate} • Vipindi Jumla: ${entries.length}`, pageWidth / 2, y + 10.5, { align: 'center' });

  y += 18;

  // Table Headers
  doc.setFillColor(30, 41, 59); // Slate 800
  doc.rect(margin, y, contentWidth, 7.5, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);

  doc.text('#', margin + 3, y + 5);
  doc.text('SIKU (DAY)', margin + 10, y + 5);
  doc.text('TAREHE (DATE)', margin + 34, y + 5);
  doc.text('MUDA (TIME)', margin + 62, y + 5);
  doc.text('SOMO (SUBJECT)', margin + 95, y + 5);
  doc.text('MWALIMU (TEACHER)', margin + 138, y + 5);
  doc.text('CHUMBA (ROOM)', margin + 172, y + 5);

  y += 7.5;

  const rowHeight = 7.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);

  if (entries.length === 0) {
    doc.setFillColor(248, 250, 252);
    doc.rect(margin, y, contentWidth, 16, 'F');
    doc.setTextColor(148, 163, 184);
    doc.text('Hakuna vipindi vya remedial vilivyopangwa kwa darasa hili kwa sasa.', pageWidth / 2, y + 10, { align: 'center' });
    y += 16;
  } else {
    // Sort entries by date/day and time
    const sortedEntries = [...entries].sort((a, b) => {
      if (a.date && b.date && a.date !== b.date) return a.date.localeCompare(b.date);
      return (a.start_time || '').localeCompare(b.start_time || '');
    });

    sortedEntries.forEach((entry, idx) => {
      if (y + rowHeight > pageHeight - margin - 25) {
        doc.addPage();
        y = margin + 10;
        // Repeat Table Header on new page
        doc.setFillColor(30, 41, 59);
        doc.rect(margin, y, contentWidth, 7.5, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.text('#', margin + 3, y + 5);
        doc.text('SIKU (DAY)', margin + 10, y + 5);
        doc.text('TAREHE (DATE)', margin + 34, y + 5);
        doc.text('MUDA (TIME)', margin + 62, y + 5);
        doc.text('SOMO (SUBJECT)', margin + 95, y + 5);
        doc.text('MWALIMU (TEACHER)', margin + 138, y + 5);
        doc.text('CHUMBA (ROOM)', margin + 172, y + 5);
        y += 7.5;
      }

      const rowBg = idx % 2 === 0 ? 255 : 248;
      doc.setFillColor(rowBg, rowBg, rowBg);
      doc.rect(margin, y, contentWidth, rowHeight, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, y + rowHeight, margin + contentWidth, y + rowHeight);

      doc.setTextColor(71, 85, 105);
      doc.text(String(idx + 1), margin + 3, y + 5);

      doc.setTextColor(31, 77, 139);
      doc.setFont('helvetica', 'bold');
      doc.text(entry.day_of_week || 'Monday', margin + 10, y + 5);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);
      doc.text(entry.date || '-', margin + 34, y + 5);

      // Time
      const timeStr = entry.start_time && entry.end_time 
        ? `${entry.start_time} - ${entry.end_time}` 
        : (entry.period_time || '16:00 - 17:30');
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(timeStr, margin + 62, y + 5);

      // Subject
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.text(entry.subject.slice(0, 26), margin + 95, y + 5);

      // Teacher
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);
      doc.text((entry.teacher_name || 'Mwalimu').slice(0, 22), margin + 138, y + 5);

      // Room
      doc.text(entry.room || 'Classroom', margin + 172, y + 5);

      y += rowHeight;
    });
  }

  y += 10;

  // Instructions & Guidelines Box
  if (y + 35 < pageHeight - margin) {
    doc.setFillColor(254, 252, 232); // Amber 50
    doc.setDrawColor(253, 224, 71); // Amber 300
    doc.roundedRect(margin, y, contentWidth, 22, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(146, 64, 14); // Amber 800
    doc.text('MAAGIZO NA UTARATIBU WA MASOMO YA ZIADA (REMEDIAL):', margin + 4, y + 5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(113, 63, 18);
    doc.text('1. Wanafunzi wote wanatakiwa kufika darasani dakika 10 kabla ya muda uliopangwa.', margin + 4, y + 10);
    doc.text('2. Mahudhurio yatasajiliwa kielektroniki kupitia mfumo rasmi wa HABY EDU PRO kila kipindi.', margin + 4, y + 14);
    doc.text('3. Mwalimu na mwanafunzi anayekosa kipindi atalazimika kutoa taarifa rasmi kwa Mwalimu wa Taaluma.', margin + 4, y + 18);

    y += 26;
  }

  // Signatures
  if (y + 15 < pageHeight - margin) {
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text('Mwalimu wa Taaluma (Academic Master): ____________________', margin + 4, y + 8);
    doc.text('Mkuu wa Shule (Head of School): ____________________', pageWidth - margin - 85, y + 8);
  }

  // Footer
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(148, 163, 184);
  doc.text(
    `HABY EDU PRO • Official Remedial Schedule System • Generated on ${printDate}`,
    pageWidth / 2,
    pageHeight - margin,
    { align: 'center' }
  );

  const safeFileName = titleText.replace(/[^a-zA-Z0-9_-]/g, '_');
  doc.save(`${safeFileName}.pdf`);
}
