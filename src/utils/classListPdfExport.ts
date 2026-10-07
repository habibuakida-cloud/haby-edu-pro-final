import { jsPDF } from 'jspdf';
import { Student, SchoolInfo } from '../types';

export interface ClassListPdfOptions {
  className: string;
  streamName: string;
  students: Student[];
  schoolInfo?: SchoolInfo;
  classTeacherName?: string;
  academicYear?: string;
}

export function exportClassListPDF(options: ClassListPdfOptions): void {
  const {
    className,
    streamName,
    students,
    schoolInfo,
    classTeacherName = 'Class Teacher',
    academicYear = '2026/2027'
  } = options;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const sName = schoolInfo?.name || 'HABYEDU PRO ACADEMY';
  const sAddress = schoolInfo?.address || 'P.O. BOX 1234, TANZANIA';
  const sPhone = schoolInfo?.phone || '';

  // Header Banner
  doc.setFillColor(31, 77, 139); // Navy #1f4d8b
  doc.rect(10, 10, 190, 24, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(sName.toUpperCase(), 105, 17, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(`OFFICIAL CLASS NOMINAL ROLL & REGISTER • ${sAddress}`, 105, 23, { align: 'center' });
  if (sPhone) {
    doc.text(`Contact: ${sPhone}`, 105, 28, { align: 'center' });
  }

  // Class & Stream Details Header Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(10, 37, 190, 18, 2, 2, 'FD');

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text(`CLASS: ${className.toUpperCase()} ${streamName !== 'All' && streamName !== 'ALL' ? `- ${streamName.toUpperCase()}` : '(ALL STREAMS)'}`, 14, 44);

  const boysCount = students.filter(s => !(s.gender || '').toLowerCase().startsWith('f') && s.sex !== 'F').length;
  const girlsCount = students.filter(s => (s.gender || '').toLowerCase().startsWith('f') || s.sex === 'F').length;
  const total = students.length;

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`Session: ${academicYear}  |  Class Teacher: ${classTeacherName}`, 14, 50);
  doc.text(`Total: ${total}  |  Boys: ${boysCount} (${total ? Math.round((boysCount/total)*100) : 0}%)  |  Girls: ${girlsCount} (${total ? Math.round((girlsCount/total)*100) : 0}%)`, 196, 44, { align: 'right' });

  // Table Headers
  let y = 58;
  doc.setFillColor(30, 41, 59);
  doc.rect(10, y, 190, 7.5, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);

  doc.text('#', 13, y + 5);
  doc.text('REG NO', 22, y + 5);
  doc.text('STUDENT FULL NAME', 52, y + 5);
  doc.text('SEX', 110, y + 5);
  doc.text('PARENT PHONE', 122, y + 5);
  doc.text('SUBJ', 158, y + 5);
  doc.text('SIGNATURE / REMARK', 170, y + 5);

  y += 7.5;

  // Table Rows
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);

  students.forEach((s, idx) => {
    if (y > 270) {
      doc.addPage();
      y = 15;
      // Repeat Table Header on new page
      doc.setFillColor(30, 41, 59);
      doc.rect(10, y, 190, 7.5, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.text('#', 13, y + 5);
      doc.text('REG NO', 22, y + 5);
      doc.text('STUDENT FULL NAME', 52, y + 5);
      doc.text('SEX', 110, y + 5);
      doc.text('PARENT PHONE', 122, y + 5);
      doc.text('SUBJ', 158, y + 5);
      doc.text('SIGNATURE / REMARK', 170, y + 5);
      y += 7.5;
      doc.setFont('helvetica', 'normal');
    }

    if (idx % 2 === 1) {
      doc.setFillColor(241, 245, 249);
      doc.rect(10, y, 190, 6.5, 'F');
    }

    doc.setDrawColor(226, 232, 240);
    doc.line(10, y + 6.5, 200, y + 6.5);

    doc.setTextColor(51, 65, 85);
    doc.text(String(idx + 1), 13, y + 4.5);
    doc.setFont('helvetica', 'bold');
    doc.text(s.regNo || `S${String(idx + 1).padStart(4, '0')}`, 22, y + 4.5);
    doc.setFont('helvetica', 'normal');

    const nameText = s.name.length > 28 ? s.name.substring(0, 26) + '..' : s.name;
    doc.text(nameText, 52, y + 4.5);

    const isGirl = (s.gender || '').toLowerCase().startsWith('f') || s.sex === 'F';
    doc.text(isGirl ? 'F' : 'M', 112, y + 4.5);

    const parentPhone = s.parentPhone || s.phone || '-';
    doc.text(parentPhone, 122, y + 4.5);

    const subjCount = s.subjects ? String(s.subjects.length) : '0';
    doc.text(subjCount, 160, y + 4.5);

    // Empty signature line
    doc.setDrawColor(148, 163, 184);
    doc.line(170, y + 4.5, 197, y + 4.5);

    y += 6.5;
  });

  // Footer Signatures
  if (y > 250) {
    doc.addPage();
    y = 20;
  } else {
    y += 8;
  }

  doc.setDrawColor(148, 163, 184);
  doc.line(15, y + 12, 75, y + 12);
  doc.line(125, y + 12, 185, y + 12);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text('Class Teacher Signature & Date', 15, y + 16);
  doc.text('Academic Master Signature & Stamp', 125, y + 16);

  doc.save(`${className.replace(/\s+/g, '_')}_${streamName.replace(/\s+/g, '_')}_Nominal_Roll.pdf`);
}
