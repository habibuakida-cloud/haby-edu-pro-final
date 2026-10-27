import { jsPDF } from 'jspdf';
import { SchoolInfo } from '../types';

export interface ClassJournalPdfExportOptions {
  journals: any[];
  schoolInfo?: SchoolInfo;
  className?: string;
  streamName?: string;
  selectedDate?: string;
  academicWeekInfo?: { term: string; week: number; label: string };
}

/**
 * Generates an official, professional Class Journal PDF document for the selected class and date.
 */
export function exportClassJournalPDF(options: ClassJournalPdfExportOptions): void {
  const {
    journals,
    schoolInfo,
    className = 'Form 1',
    streamName = 'STREAM A',
    selectedDate = new Date().toISOString().split('T')[0],
    academicWeekInfo
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

  // Title Box
  const titleText = `CLASS JOURNAL (REKODI YA KUFUNDISHA) - ${className.toUpperCase()} (${streamName.toUpperCase()})`;
  
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(31, 77, 139);
  doc.setLineWidth(0.6);
  doc.roundedRect(margin, y, contentWidth, 16, 2, 2, 'FD');

  doc.setTextColor(31, 77, 139);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text(titleText, pageWidth / 2, y + 6, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  const printDate = new Date(selectedDate).toLocaleDateString('sw-TZ', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const weekLabel = academicWeekInfo ? ` • ${academicWeekInfo.label}` : '';
  const subText = `Tarehe: ${printDate}${weekLabel} • Jumla ya Vipindi Vilivyosainiwa: ${journals.length}`;
  doc.text(subText, pageWidth / 2, y + 12, { align: 'center' });

  y += 20;

  // Table Headers
  const drawHeaders = (atY: number) => {
    doc.setFillColor(30, 41, 59); // Slate 800
    doc.rect(margin, atY, contentWidth, 7.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);

    doc.text('#', margin + 3, atY + 5);
    doc.text('KIPINDI (PERIOD)', margin + 10, atY + 5);
    doc.text('SOMO (SUBJECT)', margin + 38, atY + 5);
    doc.text('MWALIMU (TEACHER)', margin + 78, atY + 5);
    doc.text('MADA KUU & NDOGO (TOPICS)', margin + 115, atY + 5);
    doc.text('MAHUDHURIO', margin + 172, atY + 5);
  };

  drawHeaders(y);
  y += 7.5;

  const rowHeight = 9;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);

  if (journals.length === 0) {
    doc.setFillColor(248, 250, 252);
    doc.rect(margin, y, contentWidth, 16, 'F');
    doc.setTextColor(148, 163, 184);
    doc.text('Hakuna rekodi za journal zilizosainiwa kwa tarehe hii.', pageWidth / 2, y + 10, { align: 'center' });
    y += 16;
  } else {
    journals.forEach((j, idx) => {
      if (y + rowHeight > pageHeight - margin - 25) {
        doc.addPage();
        y = margin + 10;
        drawHeaders(y);
        y += 7.5;
      }

      const rowBg = idx % 2 === 0 ? 255 : 248;
      doc.setFillColor(rowBg, rowBg, rowBg);
      doc.rect(margin, y, contentWidth, rowHeight, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, y + rowHeight, margin + contentWidth, y + rowHeight);

      doc.setTextColor(71, 85, 105);
      doc.text(String(idx + 1), margin + 3, y + 5.5);

      // Period
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(31, 77, 139);
      doc.text((j.periodName || j.period || 'Period').toString().slice(0, 14), margin + 10, y + 5.5);

      // Subject
      doc.setTextColor(15, 23, 42);
      doc.text((j.subject || 'Somo').toString().slice(0, 20), margin + 38, y + 5.5);

      // Teacher
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);
      doc.text((j.teacherName || j.teacher_name || 'Mwalimu').toString().slice(0, 18), margin + 78, y + 5.5);

      // Topics (Main Topic / Sub Topic)
      doc.setTextColor(15, 23, 42);
      const mainT = j.mainTopic || j.main_topic || '';
      const subT = j.subTopic || j.sub_topic || '';
      const topicsStr = mainT ? `${mainT}${subT ? ' > ' + subT : ''}` : '(Hazijajazwa)';
      doc.text(topicsStr.toString().slice(0, 38), margin + 115, y + 5.5);

      // Attendance (Present / Absent)
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(16, 185, 129); // Emerald
      const attStr = `W:${j.presentCount ?? j.present_count ?? '--'} W/H:${j.absentCount ?? j.absent_count ?? 0}`;
      doc.text(attStr, margin + 172, y + 5.5);

      y += rowHeight;
    });
  }

  y += 10;

  // Signatures
  if (y + 15 < pageHeight - margin) {
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text('Sahihi ya Monitor: ____________________', margin + 4, y + 8);
    doc.text('Sahihi ya Mwalimu wa Darasa: ____________________', pageWidth - margin - 85, y + 8);
  }

  // Footer
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(148, 163, 184);
  doc.text(
    `HABY EDU PRO • Official Class Journal PDF • Generated on ${new Date().toLocaleDateString()}`,
    pageWidth / 2,
    pageHeight - margin,
    { align: 'center' }
  );

  const safeFileName = `Class_Journal_${className}_${streamName}_${selectedDate}`.replace(/[^a-zA-Z0-9_-]/g, '_');
  doc.save(`${safeFileName}.pdf`);
}
