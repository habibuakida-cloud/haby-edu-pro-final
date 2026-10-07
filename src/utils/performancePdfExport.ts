import { jsPDF } from 'jspdf';
import { SchoolInfo } from '../types';

export interface GradeCounts {
  A: number;
  B: number;
  C: number;
  D: number;
  E?: number;
  F?: number;
}

export interface SubjectPerformanceItem {
  subjectName: string;
  subjectKey: string;
  testedCount: number;
  testedBoys: number;
  testedGirls: number;
  meanScore: number | string;
  meanScoreBoys: number | string;
  meanScoreGirls: number | string;
  highest: number;
  lowest: number;
  passRate: number | string;
  passRateBoys: number | string;
  passRateGirls: number | string;
  grades: GradeCounts;
  gradesBoys: GradeCounts;
  gradesGirls: GradeCounts;
}

export interface CandidatePerformanceItem {
  rank: number;
  regNo: string;
  name: string;
  gender: string;
  total: number;
  average: string;
  divisionOrGrade: string;
  passStatus?: string;
}

export interface PerformancePdfExportData {
  schoolInfo?: SchoolInfo;
  className: string;
  stream: string;
  examName: string;
  academicYear?: string;
  totalCandidates: number;
  noSubjectCount?: number;
  satCandidatesCount?: number;
  noSubjectRate?: string;
  classAverage: string | number;
  passRate: string | number;
  gradeDistribution: GradeCounts;
  gradeDistributionBoys: GradeCounts;
  gradeDistributionGirls: GradeCounts;
  divisionDistribution?: {
    divI: number;
    divII: number;
    divIII: number;
    divIV: number;
    div0: number;
    incomplete: number;
  };
  schoolGPA?: string;
  isPrimary: boolean;
  subjectPerformances: SubjectPerformanceItem[];
  topCandidates: CandidatePerformanceItem[];
}

export function exportGradeDistributionAndPerformancePDF(data: PerformancePdfExportData): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  let y = 14;

  // Helper colors
  const primaryNavy = [31, 77, 139] as const;
  const slateDark = [30, 41, 59] as const;
  const slateMuted = [100, 116, 139] as const;
  const borderGray = [226, 232, 240] as const;

  // ==========================================
  // 1. HEADER SECTION
  // ==========================================
  doc.setFillColor(...primaryNavy);
  doc.rect(margin, y, contentWidth, 22, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  const schoolTitle = (data.schoolInfo?.name || 'HABY EDUPRO ACADEMY').toUpperCase();
  doc.text(schoolTitle, pageWidth / 2, y + 8, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(224, 231, 255);
  const subtitle = `REG NO: ${data.schoolInfo?.schoolNumber || 'S.0123'}  •  TEL: ${data.schoolInfo?.phone || '0717616343'}  •  OFFICIAL EXAMINATION PERFORMANCE REPORT`;
  doc.text(subtitle, pageWidth / 2, y + 14, { align: 'center' });

  const motto = data.schoolInfo?.motto ? `"${data.schoolInfo.motto}"` : 'EXCELLENCE • CHARACTER • DISCIPLINE';
  doc.setFontSize(7.5);
  doc.setTextColor(199, 210, 254);
  doc.text(motto, pageWidth / 2, y + 18.5, { align: 'center' });

  y += 26;

  // ==========================================
  // 2. EXAM METADATA STRIP
  // ==========================================
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(...borderGray);
  doc.roundedRect(margin, y, contentWidth, 14, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...slateDark);
  doc.text(`EXAMINATION: ${data.examName.toUpperCase()}`, margin + 4, y + 5.5);
  doc.text(`CLASS / LEVEL: ${data.className.toUpperCase()} (${data.stream.toUpperCase()})`, margin + 4, y + 10.5);

  const curDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...slateMuted);
  doc.text(`Level: ${data.isPrimary ? 'Primary Education (NECTA Scale)' : 'Secondary Education (NECTA O-Level)'}`, pageWidth - margin - 4, y + 5.5, { align: 'right' });
  doc.text(`Report Date: ${curDate}  |  Year: ${data.academicYear || new Date().getFullYear()}`, pageWidth - margin - 4, y + 10.5, { align: 'right' });

  y += 18;

  // ==========================================
  // 3. EXECUTIVE KPI METRICS (Including Absent / Zero Subjects)
  // ==========================================
  const kpiBoxWidth = (contentWidth - 12) / 5;
  const satCount = data.satCandidatesCount ?? (data.totalCandidates - (data.noSubjectCount || 0));
  const noSubCount = data.noSubjectCount ?? 0;

  const kpis = [
    { label: 'REGISTERED', val: String(data.totalCandidates), color: [30, 41, 59] as const, bg: [241, 245, 249] as const },
    { label: 'SAT EXAM', val: String(satCount), color: [5, 150, 105] as const, bg: [236, 253, 245] as const },
    { label: 'DID NOT SIT (ABS)', val: String(noSubCount), color: [225, 29, 72] as const, bg: [255, 241, 242] as const },
    { label: 'CLASS AVERAGE', val: `${data.classAverage}%`, color: [37, 99, 235] as const, bg: [239, 246, 255] as const },
    { label: 'OVERALL PASS RATE', val: `${data.passRate}%`, color: [16, 185, 129] as const, bg: [236, 253, 245] as const }
  ];

  kpis.forEach((kpi, idx) => {
    const kx = margin + idx * (kpiBoxWidth + 3);
    doc.setFillColor(kpi.bg[0], kpi.bg[1], kpi.bg[2]);
    doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
    doc.roundedRect(kx, y, kpiBoxWidth, 15, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
    doc.text(kpi.label, kx + kpiBoxWidth / 2, y + 4.5, { align: 'center' });

    doc.setFontSize(12);
    doc.setTextColor(kpi.color[0], kpi.color[1], kpi.color[2]);
    doc.text(kpi.val, kx + kpiBoxWidth / 2, y + 11.5, { align: 'center' });
  });

  y += 19;

  // ==========================================
  // 4. GRADE DISTRIBUTION SUMMARY TABLE & BARS
  // ==========================================
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...primaryNavy);
  doc.text('1. OVERALL GRADE DISTRIBUTION SUMMARY', margin, y + 4);

  y += 6;

  // Table header
  const grades = data.isPrimary 
    ? [
        { label: 'Grade A (81 - 100%)', count: data.gradeDistribution.A, desc: 'Bora Sana / Excellent' },
        { label: 'Grade B (61 - 80%)', count: data.gradeDistribution.B, desc: 'Vizuri Sana / Very Good' },
        { label: 'Grade C (41 - 60%)', count: data.gradeDistribution.C, desc: 'Wastani / Average (Pass)' },
        { label: 'Grade D (21 - 40%)', count: data.gradeDistribution.D, desc: 'Hafifu / Unsatisfactory' },
        { label: 'Grade E (0 - 20%)', count: data.gradeDistribution.E ?? data.gradeDistribution.F ?? 0, desc: 'Hafifu Sana / Fail' }
      ]
    : [
        { label: 'Grade A (75 - 100%)', count: data.gradeDistribution.A, desc: 'Distinction / Excellent' },
        { label: 'Grade B (65 - 74%)', count: data.gradeDistribution.B, desc: 'Credit / Very Good' },
        { label: 'Grade C (45 - 64%)', count: data.gradeDistribution.C, desc: 'Good / Satisfactory' },
        { label: 'Grade D (30 - 44%)', count: data.gradeDistribution.D, desc: 'Pass / Subsidiary' },
        { label: 'Grade F (0 - 29%)', count: data.gradeDistribution.F ?? 0, desc: 'Fail / Unclassified' }
      ];

  const totalGraded = grades.reduce((acc, curr) => acc + (typeof curr.count === 'number' ? curr.count : 0), 0) || 1;

  // Table Header row
  doc.setFillColor(31, 77, 139);
  doc.rect(margin, y, contentWidth, 6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('Grade Range', margin + 3, y + 4.2);
  doc.text('Classification / Standing (M & F)', margin + 55, y + 4.2);
  doc.text('Pupils', margin + 115, y + 4.2, { align: 'right' });
  doc.text('Percentage (%)', margin + 145, y + 4.2, { align: 'right' });
  doc.text('Distribution Visual Ratio', margin + 155, y + 4.2);

  y += 6;

  grades.forEach((g, gIdx) => {
    const rowBg = gIdx % 2 === 0 ? 255 : 248;
    doc.setFillColor(rowBg, rowBg, rowBg);
    doc.rect(margin, y, contentWidth, 6.2, 'F');

    const totalC = typeof g.count === 'number' ? g.count : 0;
    const gradeKey = gIdx === 0 ? 'A' : gIdx === 1 ? 'B' : gIdx === 2 ? 'C' : gIdx === 3 ? 'D' : (data.isPrimary ? 'E' : 'F');
    const maleC = (data.gradeDistributionBoys as any)?.[gradeKey] || 0;
    const femaleC = (data.gradeDistributionGirls as any)?.[gradeKey] || 0;
    const pct = Number(((totalC / totalGraded) * 100).toFixed(1));

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...slateDark);
    doc.text(g.label, margin + 3, y + 4.3);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...slateMuted);
    doc.text(`${g.desc} (M: ${maleC}, F: ${femaleC})`, margin + 55, y + 4.3);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...slateDark);
    doc.text(String(totalC), margin + 115, y + 4.3, { align: 'right' });
    doc.text(`${pct}%`, margin + 145, y + 4.3, { align: 'right' });

    // Mini visual bar
    const barWidth = 32;
    const fillBar = Math.max(1, Math.min(barWidth, (pct / 100) * barWidth));
    doc.setFillColor(226, 232, 240);
    doc.roundedRect(margin + 152, y + 1.8, barWidth, 2.6, 1, 1, 'F');

    const barColor = g.label.includes('Grade A') ? [16, 185, 129] :
      g.label.includes('Grade B') ? [59, 130, 246] :
      g.label.includes('Grade C') ? [245, 158, 11] :
      g.label.includes('Grade D') ? [249, 115, 22] : [239, 68, 68];
    doc.setFillColor(barColor[0], barColor[1], barColor[2]);
    doc.roundedRect(margin + 152, y + 1.8, fillBar, 2.6, 1, 1, 'F');

    y += 6.2;
  });

  // Table bottom border
  doc.setDrawColor(...borderGray);
  doc.line(margin, y, pageWidth - margin, y);

  y += 5;

  // Secondary Division row if applicable
  if (!data.isPrimary && data.divisionDistribution) {
    const div = data.divisionDistribution;
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(margin, y, contentWidth, 9, 1.5, 1.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...slateDark);
    doc.text('NECTA Division Standing (Best 7):', margin + 3, y + 5.5);

    const divTexts = [
      `Div I: ${div.divI}`,
      `Div II: ${div.divII}`,
      `Div III: ${div.divIII}`,
      `Div IV: ${div.divIV}`,
      `Div 0: ${div.div0}`,
      `Incomplete: ${div.incomplete}`
    ];
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(37, 99, 235);
    doc.text(divTexts.join('   |   '), margin + 46, y + 5.5);

    y += 12;
  } else {
    y += 3;
  }

  // ==========================================
  // 5. SUBJECT PERFORMANCE BREAKDOWN (GENDER-WISE)
  // ==========================================
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...primaryNavy);
  doc.text('2. SUBJECT MEAN PERFORMANCE & GRADE BREAKDOWN (BY GENDER)', margin, y + 4);

  y += 6;

  // Table header
  doc.setFillColor(31, 77, 139);
  doc.rect(margin, y, contentWidth, 6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  doc.text('Subject Title & Gender', margin + 3, y + 4.2);
  doc.text('Tested', margin + 58, y + 4.2, { align: 'right' });
  doc.text('Mean (%)', margin + 74, y + 4.2, { align: 'right' });
  doc.text('A', margin + 88, y + 4.2, { align: 'center' });
  doc.text('B', margin + 99, y + 4.2, { align: 'center' });
  doc.text('C', margin + 110, y + 4.2, { align: 'center' });
  doc.text('D', margin + 121, y + 4.2, { align: 'center' });
  doc.text(data.isPrimary ? 'E' : 'F', margin + 132, y + 4.2, { align: 'center' });
  doc.text('High', margin + 147, y + 4.2, { align: 'right' });
  doc.text('Low', margin + 160, y + 4.2, { align: 'right' });
  doc.text('Pass %', margin + 178, y + 4.2, { align: 'right' });

  y += 6;

  const displaySubs = data.subjectPerformances.slice(0, 8);
  displaySubs.forEach((sub, sIdx) => {
    const rowBg = sIdx % 2 === 0 ? 255 : 248;

    // Boys sub-row
    doc.setFillColor(rowBg, rowBg, rowBg);
    doc.rect(margin, y, contentWidth, 4.8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(...slateDark);
    const subTitleM = `${sub.subjectName} [Boys]`;
    doc.text(subTitleM.length > 28 ? `${subTitleM.slice(0, 26)}...` : subTitleM, margin + 3, y + 3.4);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...slateMuted);
    doc.text(String(sub.testedBoys || 0), margin + 58, y + 3.4, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(37, 99, 235);
    doc.text(`${sub.meanScoreBoys || 0}%`, margin + 74, y + 3.4, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...slateDark);
    doc.text(String(sub.gradesBoys?.A || 0), margin + 88, y + 3.4, { align: 'center' });
    doc.text(String(sub.gradesBoys?.B || 0), margin + 99, y + 3.4, { align: 'center' });
    doc.text(String(sub.gradesBoys?.C || 0), margin + 110, y + 3.4, { align: 'center' });
    doc.text(String(sub.gradesBoys?.D || 0), margin + 121, y + 3.4, { align: 'center' });
    doc.text(String(data.isPrimary ? (sub.gradesBoys?.E || 0) : (sub.gradesBoys?.F || 0)), margin + 132, y + 3.4, { align: 'center' });

    doc.text(String(sub.highest || '-'), margin + 147, y + 3.4, { align: 'right' });
    doc.text(String(sub.lowest || '-'), margin + 160, y + 3.4, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(16, 185, 129);
    doc.text(`${sub.passRateBoys || 0}%`, margin + 178, y + 3.4, { align: 'right' });

    y += 4.8;

    // Girls sub-row
    doc.setFillColor(rowBg, rowBg, rowBg);
    doc.rect(margin, y, contentWidth, 4.8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(190, 24, 93);
    const subTitleF = `${sub.subjectName} [Girls]`;
    doc.text(subTitleF.length > 28 ? `${subTitleF.slice(0, 26)}...` : subTitleF, margin + 3, y + 3.4);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...slateMuted);
    doc.text(String(sub.testedGirls || 0), margin + 58, y + 3.4, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(37, 99, 235);
    doc.text(`${sub.meanScoreGirls || 0}%`, margin + 74, y + 3.4, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...slateDark);
    doc.text(String(sub.gradesGirls?.A || 0), margin + 88, y + 3.4, { align: 'center' });
    doc.text(String(sub.gradesGirls?.B || 0), margin + 99, y + 3.4, { align: 'center' });
    doc.text(String(sub.gradesGirls?.C || 0), margin + 110, y + 3.4, { align: 'center' });
    doc.text(String(sub.gradesGirls?.D || 0), margin + 121, y + 3.4, { align: 'center' });
    doc.text(String(data.isPrimary ? (sub.gradesGirls?.E || 0) : (sub.gradesGirls?.F || 0)), margin + 132, y + 3.4, { align: 'center' });

    doc.text('-', margin + 147, y + 3.4, { align: 'right' });
    doc.text('-', margin + 160, y + 3.4, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(16, 185, 129);
    doc.text(`${sub.passRateGirls || 0}%`, margin + 178, y + 3.4, { align: 'right' });

    y += 5.5;
  });

  // ==========================================
  // 6. TOP RANKING CANDIDATES (MERIT LIST)
  // ==========================================
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...primaryNavy);
  doc.text('3. TOP PERFORMING CANDIDATES (MERIT LIST)', margin, y + 4);

  y += 6;

  // Table header
  doc.setFillColor(31, 77, 139);
  doc.rect(margin, y, contentWidth, 6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  doc.text('Rank', margin + 3, y + 4.2);
  doc.text('Reg No', margin + 15, y + 4.2);
  doc.text('Full Candidate Name', margin + 40, y + 4.2);
  doc.text('Sex', margin + 105, y + 4.2, { align: 'center' });
  doc.text('Total Marks', margin + 128, y + 4.2, { align: 'right' });
  doc.text('Average (%)', margin + 150, y + 4.2, { align: 'right' });
  doc.text(data.isPrimary ? 'Daraja / Grade' : 'Division', margin + 178, y + 4.2, { align: 'right' });

  y += 6;

  const topTen = data.topCandidates.slice(0, 6);
  topTen.forEach((cand, cIdx) => {
    const rowBg = cIdx % 2 === 0 ? 255 : 248;
    doc.setFillColor(rowBg, rowBg, rowBg);
    doc.rect(margin, y, contentWidth, 5.5, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(cIdx === 0 ? 217 : 30, cIdx === 0 ? 119 : 41, cIdx === 0 ? 6 : 59);
    doc.text(`#${cand.rank}`, margin + 3, y + 3.8);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...slateMuted);
    doc.text(cand.regNo, margin + 15, y + 3.8);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...slateDark);
    doc.text(cand.name, margin + 40, y + 3.8);

    doc.setFont('helvetica', 'normal');
    doc.text(cand.gender ? cand.gender.slice(0, 1) : '-', margin + 105, y + 3.8, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.text(String(cand.total), margin + 128, y + 3.8, { align: 'right' });

    doc.setTextColor(37, 99, 235);
    doc.text(`${cand.average}%`, margin + 150, y + 3.8, { align: 'right' });

    doc.setTextColor(16, 185, 129);
    doc.text(cand.divisionOrGrade, margin + 178, y + 3.8, { align: 'right' });

    y += 5.5;
  });

  doc.setDrawColor(...borderGray);
  doc.line(margin, y, pageWidth - margin, y);

  y += 7;

  // ==========================================
  // 7. SIGNATURES & OFFICIAL VERIFICATION
  // ==========================================
  const sigBoxW = (contentWidth - 10) / 3;
  const sigY = pageHeight - margin - 22;

  // Box 1: Academic Master
  doc.setDrawColor(...borderGray);
  doc.line(margin, sigY + 11, margin + sigBoxW, sigY + 11);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...slateDark);
  doc.text('ACADEMIC MASTER / DEAN', margin + sigBoxW / 2, sigY + 15, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...slateMuted);
  doc.text('Signature & Date', margin + sigBoxW / 2, sigY + 18.5, { align: 'center' });

  // Box 2: Head of School
  const b2X = margin + sigBoxW + 5;
  doc.line(b2X, sigY + 11, b2X + sigBoxW, sigY + 11);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...slateDark);
  doc.text('HEAD OF SCHOOL / PRINCIPAL', b2X + sigBoxW / 2, sigY + 15, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...slateMuted);
  doc.text('Signature & Official Stamp', b2X + sigBoxW / 2, sigY + 18.5, { align: 'center' });

  // Box 3: Stamp & Verification
  const b3X = margin + (sigBoxW + 5) * 2;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(b3X, sigY, sigBoxW, 20, 1.5, 1.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...primaryNavy);
  doc.text('OFFICIAL CERTIFICATION', b3X + sigBoxW / 2, sigY + 6, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(...slateMuted);
  doc.text('Verified via HABY EDUPRO', b3X + sigBoxW / 2, sigY + 11, { align: 'center' });
  doc.text(`Generated: ${new Date().toLocaleTimeString('en-GB')}`, b3X + sigBoxW / 2, sigY + 15.5, { align: 'center' });

  // Save the PDF
  const cleanClassName = data.className.replace(/\s+/g, '_');
  const cleanExamName = data.examName.replace(/\s+/g, '_');
  doc.save(`${cleanClassName}_${cleanExamName}_Grade_Distribution_Summary.pdf`);
}
