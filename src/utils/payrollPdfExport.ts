import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { SchoolInfo, StaffPayrollRecord } from '../types';

export function formatMonthYearLabel(monthYear: string): string {
  if (!monthYear || !monthYear.includes('-')) return monthYear || 'October 2026';
  const [year, month] = monthYear.split('-');
  const date = new Date(Number(year), Number(month) - 1, 1);
  if (isNaN(date.getTime())) return monthYear;
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export function formatCurrencyAmount(amount: number, currency = 'TZS'): string {
  const safe = Number.isFinite(amount) ? Math.round(amount) : 0;
  return `${currency} ${safe.toLocaleString('en-US')}`;
}

function numberToWordsEn(n: number): string {
  const num = Math.round(Math.abs(n));
  if (num === 0) return 'Zero';
  const ones = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertHundreds(val: number): string {
    let res = '';
    if (val >= 100) {
      res += ones[Math.floor(val / 100)] + ' Hundred ';
      val %= 100;
    }
    if (val >= 20) {
      res += tens[Math.floor(val / 10)] + (val % 10 !== 0 ? '-' + ones[val % 10] : '') + ' ';
    } else if (val > 0) {
      res += ones[val] + ' ';
    }
    return res.trim();
  }

  let parts: string[] = [];
  let rem = num;
  if (rem >= 1_000_000_000) {
    parts.push(convertHundreds(Math.floor(rem / 1_000_000_000)) + ' Billion');
    rem %= 1_000_000_000;
  }
  if (rem >= 1_000_000) {
    parts.push(convertHundreds(Math.floor(rem / 1_000_000)) + ' Million');
    rem %= 1_000_000;
  }
  if (rem >= 1000) {
    parts.push(convertHundreds(Math.floor(rem / 1000)) + ' Thousand');
    rem %= 1000;
  }
  if (rem > 0) {
    parts.push(convertHundreds(rem));
  }
  return parts.join(' ').trim() + ' Only';
}

function renderSinglePayslipOnDoc(
  doc: jsPDF,
  record: StaffPayrollRecord,
  schoolInfo: SchoolInfo,
  currency = 'TZS'
) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  const periodLabel = formatMonthYearLabel(record.monthYear);

  // Header Banner
  doc.setFillColor(15, 23, 42); // Slate 900
  doc.rect(margin, 12, pageWidth - margin * 2, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text((schoolInfo?.name || 'HABY EDUPRO SCHOOL').toUpperCase(), pageWidth / 2, 22, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const subHeader = [
    schoolInfo?.address || 'P.O. Box 1234, Tanzania',
    schoolInfo?.phone ? `Tel: ${schoolInfo.phone}` : '',
    schoolInfo?.email ? `Email: ${schoolInfo.email}` : ''
  ].filter(Boolean).join('  |  ');
  doc.text(subHeader, pageWidth / 2, 28, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(56, 189, 248); // Sky 400
  doc.text(`OFFICIAL STAFF SALARY SLip — ${periodLabel.toUpperCase()}`, pageWidth / 2, 35.5, { align: 'center' });

  // Staff Metadata Box
  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, 44, pageWidth - margin * 2, 28, 2, 2, 'FD');

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(9);

  // Left Column
  doc.setFont('helvetica', 'bold');
  doc.text('Employee Name:', margin + 4, 51);
  doc.text('Staff ID / Code:', margin + 4, 57.5);
  doc.text('Designation / Role:', margin + 4, 64);
  doc.text('Pay Period:', margin + 4, 70);

  doc.setFont('helvetica', 'normal');
  doc.text(record.teacherName || 'Staff Member', margin + 38, 51);
  doc.text(`STF-${String(record.teacherId).padStart(4, '0')}`, margin + 38, 57.5);
  doc.text(record.schoolRole || 'Subject Teacher', margin + 38, 64);
  doc.text(periodLabel, margin + 38, 70);

  // Right Column
  const rightColX = pageWidth / 2 + 6;
  doc.setFont('helvetica', 'bold');
  doc.text('Payment Status:', rightColX, 51);
  doc.text('Payment Method:', rightColX, 57.5);
  doc.text('Bank / Provider:', rightColX, 64);
  doc.text('Account Number:', rightColX, 70);

  doc.setFont('helvetica', 'normal');
  doc.text(record.paymentStatus || 'PENDING', rightColX + 34, 51);
  doc.text(record.paymentMethod || 'Bank Transfer', rightColX + 34, 57.5);
  doc.text(record.bankName || 'CRDB Bank', rightColX + 34, 64);
  doc.text(record.bankAccount || 'N/A', rightColX + 34, 70);

  // Attendance Summary Strip
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, 76, pageWidth - margin * 2, 16, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  doc.text('MONTHLY ATTENDANCE SUMMARY (LINKED FROM TEACHER ATTENDANCE):', margin + 4, 81.5);

  const attendanceRate = record.workingDays > 0
    ? Math.round(((record.daysPresent + record.daysLate * 0.5 + record.daysExcused) / record.workingDays) * 100)
    : 100;

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  const attLine = [
    `Working Days: ${record.workingDays}`,
    `Present: ${record.daysPresent}`,
    `Late: ${record.daysLate}`,
    `Excused/Leave: ${record.daysExcused}`,
    `Unexcused Absent: ${record.daysAbsent}`,
    `Attendance Score: ${Math.min(100, attendanceRate)}%`
  ].join('    |    ');
  doc.text(attLine, margin + 4, 88.5);

  // Earnings & Deductions Side-by-Side Table
  const earningsRows = [
    ['Basic Monthly Salary', formatCurrencyAmount(record.basicSalary, currency)],
    ['Housing Allowance', formatCurrencyAmount(record.housingAllowance, currency)],
    ['Transport Allowance', formatCurrencyAmount(record.transportAllowance, currency)],
    ['Responsibility Allowance', formatCurrencyAmount(record.responsibilityAllowance, currency)],
    [
      `Performance / Attendance Bonus${record.bonusReason ? ` (${record.bonusReason})` : ''}`,
      formatCurrencyAmount(record.bonusAmount, currency)
    ]
  ];

  const deductionRows = [
    ['PAYE Income Tax (TRA)', formatCurrencyAmount(record.taxDeduction, currency)],
    ['NSSF / PSSSF Pension Contribution', formatCurrencyAmount(record.nssfDeduction, currency)],
    ['NHIF Health Insurance', formatCurrencyAmount(record.healthInsurance, currency)],
    [
      `Attendance Deduction (${record.daysAbsent} Absent, ${record.daysLate} Late)`,
      formatCurrencyAmount(record.attendanceDeduction, currency)
    ],
    ['Salary Advance / Loan Repayment', formatCurrencyAmount(record.loanAdvanceDeduction, currency)]
  ];

  const combinedBody = earningsRows.map((eRow, idx) => {
    const dRow = deductionRows[idx] || ['', ''];
    return [eRow[0], eRow[1], dRow[0], dRow[1]];
  });

  combinedBody.push([
    'TOTAL GROSS EARNINGS',
    formatCurrencyAmount(record.grossSalary, currency),
    'TOTAL DEDUCTIONS',
    formatCurrencyAmount(record.totalDeductions, currency)
  ]);

  autoTable(doc, {
    startY: 96,
    margin: { left: margin, right: margin },
    head: [['EARNINGS & ALLOWANCES', `AMOUNT (${currency})`, 'TAX & STATUTORY DEDUCTIONS', `AMOUNT (${currency})`]],
    body: combinedBody,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontSize: 8.5,
      fontStyle: 'bold'
    },
    styles: {
      fontSize: 8.5,
      cellPadding: 3.2,
      textColor: [15, 23, 42]
    },
    columnStyles: {
      0: { cellWidth: 58 },
      1: { cellWidth: 33, halign: 'right', fontStyle: 'bold' },
      2: { cellWidth: 58 },
      3: { cellWidth: 33, halign: 'right', fontStyle: 'bold' }
    },
    didParseCell: (hookData) => {
      if (hookData.section === 'body' && hookData.row.index === combinedBody.length - 1) {
        hookData.cell.styles.fillColor = [241, 245, 249];
        hookData.cell.styles.fontStyle = 'bold';
      }
    }
  });

  const finalY = (doc as any).lastAutoTable?.finalY || 165;

  // Net Salary Callout Box
  doc.setFillColor(22, 163, 74); // Emerald 600
  doc.roundedRect(margin, finalY + 6, pageWidth - margin * 2, 22, 2, 2, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('NET TAKE-HOME SALARY:', margin + 5, finalY + 15);
  doc.setFontSize(14);
  doc.text(formatCurrencyAmount(record.netSalary, currency), pageWidth - margin - 5, finalY + 15, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(
    `Amount in Words: ${currency} ${numberToWordsEn(record.netSalary)}`,
    margin + 5,
    finalY + 23.5
  );

  // Signatures & Official Stamp Section
  const sigY = finalY + 46;
  doc.setTextColor(51, 65, 85);
  doc.setDrawColor(148, 163, 184);
  doc.setFontSize(8.5);

  // Bursar / Finance Officer
  doc.line(margin, sigY, margin + 52, sigY);
  doc.setFont('helvetica', 'bold');
  doc.text('Prepared By (School Bursar)', margin, sigY + 5);
  doc.setFont('helvetica', 'normal');
  doc.text(`Date: ${new Date().toISOString().split('T')[0]}`, margin, sigY + 10);

  // Headmaster / Principal
  const midX = pageWidth / 2 - 26;
  doc.line(midX, sigY, midX + 52, sigY);
  doc.setFont('helvetica', 'bold');
  doc.text(`Approved By (${schoolInfo?.principal || 'Headmaster'})`, midX, sigY + 5);
  doc.setFont('helvetica', 'normal');
  doc.text('Official Stamp & Signature', midX, sigY + 10);

  // Employee Signature
  const rightSigX = pageWidth - margin - 52;
  doc.line(rightSigX, sigY, pageWidth - margin, sigY);
  doc.setFont('helvetica', 'bold');
  doc.text('Employee Signature', rightSigX, sigY + 5);
  doc.setFont('helvetica', 'normal');
  doc.text(record.teacherName || 'Staff Member', rightSigX, sigY + 10);

  // Footer
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Generated electronically by ${schoolInfo?.name || 'School'} Payroll Management System • Slip ID: ${record.id}`,
    pageWidth / 2,
    sigY + 22,
    { align: 'center' }
  );
}

export function exportIndividualPayslipPDF(
  record: StaffPayrollRecord,
  schoolInfo: SchoolInfo,
  currency = 'TZS'
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  renderSinglePayslipOnDoc(doc, record, schoolInfo, currency);
  const cleanName = (record.teacherName || 'Staff').replace(/[^a-zA-Z0-9_-]/g, '_');
  doc.save(`Payslip_${cleanName}_${record.monthYear}.pdf`);
}

export function exportAllPayslipsBatchPDF(
  records: StaffPayrollRecord[],
  schoolInfo: SchoolInfo,
  monthYear: string,
  currency = 'TZS'
) {
  if (!records || records.length === 0) return;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  records.forEach((rec, index) => {
    if (index > 0) doc.addPage();
    renderSinglePayslipOnDoc(doc, rec, schoolInfo, currency);
  });
  doc.save(`All_Staff_Payslips_${monthYear}.pdf`);
}

export function exportMasterPayrollRegisterPDF(
  records: StaffPayrollRecord[],
  schoolInfo: SchoolInfo,
  monthYear: string,
  currency = 'TZS'
) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const periodLabel = formatMonthYearLabel(monthYear);

  doc.setFillColor(15, 23, 42);
  doc.rect(10, 10, pageWidth - 20, 22, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text((schoolInfo?.name || 'HABY EDUPRO SCHOOL').toUpperCase(), pageWidth / 2, 18, { align: 'center' });

  doc.setFontSize(10);
  doc.setTextColor(56, 189, 248);
  doc.text(`MASTER STAFF PAYROLL REGISTER — ${periodLabel.toUpperCase()}`, pageWidth / 2, 26, { align: 'center' });

  const totalBasic = records.reduce((s, r) => s + r.basicSalary, 0);
  const totalAllowances = records.reduce(
    (s, r) => s + r.housingAllowance + r.transportAllowance + r.responsibilityAllowance,
    0
  );
  const totalBonus = records.reduce((s, r) => s + r.bonusAmount, 0);
  const totalGross = records.reduce((s, r) => s + r.grossSalary, 0);
  const totalAttDed = records.reduce((s, r) => s + r.attendanceDeduction, 0);
  const totalTax = records.reduce((s, r) => s + r.taxDeduction, 0);
  const totalStatutory = records.reduce(
    (s, r) => s + r.nssfDeduction + r.healthInsurance + r.loanAdvanceDeduction,
    0
  );
  const totalNet = records.reduce((s, r) => s + r.netSalary, 0);

  const tableBody = records.map((r, idx) => {
    const allowances = r.housingAllowance + r.transportAllowance + r.responsibilityAllowance;
    const otherDed = r.nssfDeduction + r.healthInsurance + r.loanAdvanceDeduction;
    return [
      String(idx + 1),
      r.teacherName,
      r.schoolRole,
      `${r.daysPresent}P / ${r.daysLate}L / ${r.daysAbsent}A`,
      r.basicSalary.toLocaleString('en-US'),
      allowances.toLocaleString('en-US'),
      r.bonusAmount.toLocaleString('en-US'),
      r.grossSalary.toLocaleString('en-US'),
      r.attendanceDeduction.toLocaleString('en-US'),
      r.taxDeduction.toLocaleString('en-US'),
      otherDed.toLocaleString('en-US'),
      r.netSalary.toLocaleString('en-US'),
      r.paymentStatus
    ];
  });

  tableBody.push([
    '',
    'TOTAL PAYROLL SUMMARY',
    `${records.length} Staff`,
    '-',
    totalBasic.toLocaleString('en-US'),
    totalAllowances.toLocaleString('en-US'),
    totalBonus.toLocaleString('en-US'),
    totalGross.toLocaleString('en-US'),
    totalAttDed.toLocaleString('en-US'),
    totalTax.toLocaleString('en-US'),
    totalStatutory.toLocaleString('en-US'),
    totalNet.toLocaleString('en-US'),
    ''
  ]);

  autoTable(doc, {
    startY: 36,
    margin: { left: 10, right: 10 },
    head: [[
      '#',
      'Staff Name',
      'Role',
      'Attendance',
      `Basic (${currency})`,
      `Allowances`,
      `Bonuses`,
      `Gross Pay`,
      `Att. Ded.`,
      `PAYE Tax`,
      `NSSF/NHIF/Loan`,
      `Net Pay (${currency})`,
      'Status'
    ]],
    body: tableBody,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontSize: 7.5,
      fontStyle: 'bold'
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 2.2
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      4: { halign: 'right' },
      5: { halign: 'right' },
      6: { halign: 'right' },
      7: { halign: 'right', fontStyle: 'bold' },
      8: { halign: 'right' },
      9: { halign: 'right' },
      10: { halign: 'right' },
      11: { halign: 'right', fontStyle: 'bold' },
      12: { halign: 'center' }
    },
    didParseCell: (hookData) => {
      if (hookData.section === 'body' && hookData.row.index === tableBody.length - 1) {
        hookData.cell.styles.fillColor = [226, 232, 240];
        hookData.cell.styles.fontStyle = 'bold';
      }
    }
  });

  const finalY = (doc as any).lastAutoTable?.finalY || 165;
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  doc.text(`Prepared by School Bursar: ___________________________`, 14, finalY + 14);
  doc.text(`Approved by Headmaster (${schoolInfo?.principal || 'Principal'}): ___________________________`, 120, finalY + 14);
  doc.text(`Date: ${new Date().toISOString().split('T')[0]}`, 240, finalY + 14);

  doc.save(`Master_Payroll_Register_${monthYear}.pdf`);
}

export function printPayslipDocument(
  record: StaffPayrollRecord,
  schoolInfo: SchoolInfo,
  currency = 'TZS'
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  renderSinglePayslipOnDoc(doc, record, schoolInfo, currency);
  doc.autoPrint();
  const blobUrl = doc.output('bloburl');
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.src = String(blobUrl);
  document.body.appendChild(iframe);
  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch {}
  }, 500);
}
