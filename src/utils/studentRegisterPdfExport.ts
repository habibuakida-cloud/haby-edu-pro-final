import { jsPDF } from 'jspdf';
import { Student, SchoolInfo } from '../types';

export interface StudentRegisterPdfOptions {
  students: Student[];
  schoolInfo?: SchoolInfo;
  className?: string;
  streamName?: string;
  title?: string;
}

/**
 * Exports official Registered Students nominal roll list as PDF.
 * Requirement: PDF must contain Logo, Photo, Name, Class, Reg No, Date.
 */
export function exportRegisteredStudentsPDF(options: StudentRegisterPdfOptions): void {
  const {
    students,
    schoolInfo,
    className = 'All Classes',
    streamName = 'All Streams',
    title = 'OFFICIAL REGISTERED STUDENTS LIST'
  } = options;

  if (!students || students.length === 0) return;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 10;
  const contentWidth = pageWidth - margin * 2;
  const currentDate = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  const boysCount = students.filter(s => !(s.gender || '').toLowerCase().startsWith('f') && s.sex !== 'F').length;
  const girlsCount = students.filter(s => (s.gender || '').toLowerCase().startsWith('f') || s.sex === 'F').length;
  const total = students.length;

  let pageNum = 1;

  const drawHeader = (docInstance: jsPDF) => {
    let y = margin;

    // Header Navy Box
    docInstance.setFillColor(31, 77, 139); // Navy #1f4d8b
    docInstance.rect(margin, y, contentWidth, 24, 'F');

    // School Name & Meta
    docInstance.setTextColor(255, 255, 255);
    docInstance.setFont('helvetica', 'bold');
    docInstance.setFontSize(13);
    docInstance.text((schoolInfo?.name || 'HABY EDU PRO ACADEMY').toUpperCase(), pageWidth / 2, y + 7, { align: 'center' });

    docInstance.setFont('helvetica', 'normal');
    docInstance.setFontSize(8);
    const addr = `${schoolInfo?.address || 'P.O. Box 1234, Tanga, Tanzania'}  •  Tel: ${schoolInfo?.phone || '+255 717 616 343'}`;
    docInstance.text(addr, pageWidth / 2, y + 13, { align: 'center' });

    docInstance.setFont('helvetica', 'italic');
    docInstance.setFontSize(7.5);
    docInstance.text(`"${schoolInfo?.motto || 'Education for Development & Integrity'}"`, pageWidth / 2, y + 18.5, { align: 'center' });

    y += 27;

    // Subheader Box: Title, Class, and Print Date
    docInstance.setFillColor(248, 250, 252);
    docInstance.setDrawColor(203, 213, 225);
    docInstance.roundedRect(margin, y, contentWidth, 14, 1.5, 1.5, 'FD');

    docInstance.setTextColor(15, 23, 42);
    docInstance.setFont('helvetica', 'bold');
    docInstance.setFontSize(9.5);
    docInstance.text(`${title.toUpperCase()} • ${className.toUpperCase()}`, margin + 4, y + 5.5);

    docInstance.setFont('helvetica', 'normal');
    docInstance.setFontSize(8);
    docInstance.setTextColor(71, 85, 105);
    docInstance.text(`Generation Date: ${currentDate}`, margin + 4, y + 10.5);

    // Summary Badge on Right
    docInstance.setFont('helvetica', 'bold');
    docInstance.setTextColor(31, 77, 139);
    docInstance.text(
      `Total: ${total}  |  Boys: ${boysCount} (${total ? Math.round((boysCount / total) * 100) : 0}%)  |  Girls: ${girlsCount} (${total ? Math.round((girlsCount / total) * 100) : 0}%)`,
      pageWidth - margin - 4,
      y + 8,
      { align: 'right' }
    );

    y += 17;

    // Table Header Row
    docInstance.setFillColor(30, 41, 59); // Slate 800
    docInstance.rect(margin, y, contentWidth, 7, 'F');

    docInstance.setTextColor(255, 255, 255);
    docInstance.setFont('helvetica', 'bold');
    docInstance.setFontSize(7.5);

    docInstance.text('#', margin + 3, y + 4.8);
    docInstance.text('PHOTO', margin + 11, y + 4.8);
    docInstance.text('REG NO', margin + 28, y + 4.8);
    docInstance.text('STUDENT FULL NAME', margin + 55, y + 4.8);
    docInstance.text('CLASS & STREAM', margin + 120, y + 4.8);
    docInstance.text('GENDER', margin + 155, y + 4.8);
    docInstance.text('DATE', margin + 175, y + 4.8);

    return y + 7;
  };

  let currentY = drawHeader(doc);
  const rowHeight = 9.5;

  students.forEach((student, index) => {
    if (currentY + rowHeight > pageHeight - margin - 8) {
      // Add Footer on current page
      doc.setFontSize(7);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(148, 163, 184);
      doc.text(`Page ${pageNum} • HABY EDU PRO Official Nominal Roll Register`, pageWidth / 2, pageHeight - margin, { align: 'center' });

      doc.addPage();
      pageNum++;
      currentY = drawHeader(doc);
    }

    const rowBg = index % 2 === 0 ? 255 : 248;
    doc.setFillColor(rowBg, rowBg, rowBg);
    doc.rect(margin, currentY, contentWidth, rowHeight, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, currentY + rowHeight, margin + contentWidth, currentY + rowHeight);

    // 1. Index
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text(String(index + 1), margin + 3, currentY + 6);

    // 2. Photo Box / Thumbnail
    const photoBoxX = margin + 11;
    const photoBoxY = currentY + 1;
    const photoW = 7.5;
    const photoH = 7.5;
    doc.setDrawColor(203, 213, 225);
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(photoBoxX, photoBoxY, photoW, photoH, 1, 1, 'FD');

    if (student.passportPhoto && student.passportPhoto.startsWith('data:image')) {
      try {
        doc.addImage(student.passportPhoto, 'JPEG', photoBoxX, photoBoxY, photoW, photoH);
      } catch {
        // Fallback photo placeholder icon text
        doc.setFontSize(5.5);
        doc.setTextColor(148, 163, 184);
        doc.text('IMG', photoBoxX + photoW / 2, photoBoxY + 5, { align: 'center' });
      }
    } else {
      doc.setFontSize(5.5);
      doc.setTextColor(148, 163, 184);
      doc.text('PHOTO', photoBoxX + photoW / 2, photoBoxY + 5, { align: 'center' });
    }

    // 3. Reg No
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(30, 41, 59);
    doc.text(student.regNo || '-', margin + 28, currentY + 6);

    // 4. Student Full Name
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(student.name.toUpperCase().slice(0, 36), margin + 55, currentY + 6);

    // 5. Class & Stream
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    const clsStr = `${student.className || '-'} ${student.stream ? `(${student.stream})` : ''}`;
    doc.text(clsStr.slice(0, 22), margin + 120, currentY + 6);

    // 6. Gender
    const isGirl = (student.gender || '').toLowerCase().startsWith('f') || student.sex === 'F';
    doc.setFont('helvetica', 'bold');
    if (isGirl) {
      doc.setTextColor(190, 18, 60); // Rose for female
      doc.text('Female', margin + 155, currentY + 6);
    } else {
      doc.setTextColor(30, 64, 175); // Blue for male
      doc.text('Male', margin + 155, currentY + 6);
    }

    // 7. Date of Registration
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    const rawDate = student.registeredAt || (student as any).created_at;
    const regDate = rawDate
      ? new Date(rawDate).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
      : currentDate;
    doc.text(regDate, margin + 175, currentY + 6);

    currentY += rowHeight;
  });

  // Footer on final page
  doc.setFontSize(7);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(148, 163, 184);
  doc.text(`Page ${pageNum} • HABY EDU PRO Official Nominal Roll Register • Total: ${total} Students`, pageWidth / 2, pageHeight - margin, { align: 'center' });

  const cleanTitle = (className || 'Registered_Students').replace(/[^a-zA-Z0-9_-]/g, '_');
  doc.save(`Registered_Students_${cleanTitle}_${new Date().toISOString().split('T')[0]}.pdf`);
}
