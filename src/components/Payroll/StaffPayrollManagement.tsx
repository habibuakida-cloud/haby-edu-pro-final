import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  DollarSign,
  FileText,
  Download,
  Printer,
  Save,
  CheckCircle2,
  AlertCircle,
  Search,
  Settings,
  Edit3,
  UserCheck,
  RefreshCw,
  Check,
  Building2,
  CreditCard,
  Award,
  X,
  Eye
} from 'lucide-react';
import {
  Teacher,
  SchoolInfo,
  UserAccount,
  TeacherAttendanceEntry,
  TeacherSalaryConfig,
  StaffPayrollRecord,
  StaffPayrollSettings,
  StaffPayrollData
} from '../../types';
import { supabase, DEFAULT_PRIMARY_SCHOOL_ID, getCurrentSchoolId } from '../../lib/dbClient';
import {
  exportIndividualPayslipPDF,
  exportAllPayslipsBatchPDF,
  exportMasterPayrollRegisterPDF,
  printPayslipDocument,
  formatMonthYearLabel,
  formatCurrencyAmount
} from '../../utils/payrollPdfExport';

interface StaffPayrollManagementProps {
  teachers: Teacher[];
  schoolInfo: SchoolInfo;
  currentUser?: UserAccount | null;
  schoolId?: string;
  teacherAttendance?: Record<string, Record<number, TeacherAttendanceEntry>>;
  staffPayroll?: StaffPayrollData;
  onSaveStaffPayroll?: (payrollData: StaffPayrollData) => void;
  onNavigateToTeacherAttendance?: () => void;
}

const DEFAULT_PAYROLL_SETTINGS: StaffPayrollSettings = {
  standardWorkingDays: 22,
  absencePenaltyMode: 'PRORATED_BASIC',
  fixedAbsencePenaltyPerDay: 25000,
  latePenaltyPerDay: 5000,
  perfectAttendanceBonus: 30000,
  taxCalculationMode: 'TRA_BRACKETS',
  flatTaxRatePercent: 11,
  nssfRatePercent: 10,
  nhifRatePercent: 3,
  currency: 'TZS'
};

/**
 * Tanzanian Mainland (TRA) Monthly PAYE Tax Calculator (TZS)
 * Brackets on Taxable Income (Gross - NSSF):
 * 0 - 270,000: NIL
 * 270,001 - 520,000: 8% of amount above 270,000
 * 520,001 - 760,000: 20,000 + 20% of amount above 520,000
 * 760,001 - 1,000,000: 68,000 + 25% of amount above 760,000
 * Above 1,000,000: 128,000 + 30% of amount above 1,000,000
 */
function calculateTraPayeTax(taxableIncome: number): number {
  if (taxableIncome <= 270000) return 0;
  if (taxableIncome <= 520000) return Math.round((taxableIncome - 270000) * 0.08);
  if (taxableIncome <= 760000) return Math.round(20000 + (taxableIncome - 520000) * 0.2);
  if (taxableIncome <= 1000000) return Math.round(68000 + (taxableIncome - 760000) * 0.25);
  return Math.round(128000 + (taxableIncome - 1000000) * 0.3);
}

function getDefaultSalaryByRole(role?: string): {
  basic: number;
  housing: number;
  transport: number;
  responsibility: number;
} {
  const r = (role || '').toLowerCase();
  if (r.includes('head') || r.includes('principal') || r.includes('mkuu')) {
    return { basic: 1450000, housing: 200000, transport: 120000, responsibility: 180000 };
  }
  if (r.includes('academic') || r.includes('second') || r.includes('taaluma')) {
    return { basic: 1150000, housing: 150000, transport: 90000, responsibility: 120000 };
  }
  if (r.includes('discipline') || r.includes('nidhamu') || r.includes('bursar') || r.includes('hasibu')) {
    return { basic: 980000, housing: 120000, transport: 80000, responsibility: 90000 };
  }
  return { basic: 820000, housing: 100000, transport: 60000, responsibility: 40000 };
}

export const StaffPayrollManagement: React.FC<StaffPayrollManagementProps> = ({
  teachers = [],
  schoolInfo,
  currentUser,
  schoolId: propSchoolId,
  teacherAttendance = {},
  staffPayroll,
  onSaveStaffPayroll,
  onNavigateToTeacherAttendance
}) => {
  const effectiveSchoolId = useMemo(
    () => propSchoolId || currentUser?.schoolId || getCurrentSchoolId() || DEFAULT_PRIMARY_SCHOOL_ID,
    [propSchoolId, currentUser?.schoolId]
  );

  const [activeTab, setActiveTab] = useState<'payroll_sheet' | 'payslip_preview' | 'salary_settings'>('payroll_sheet');
  const [selectedMonth, setSelectedMonth] = useState<string>(() => new Date().toISOString().slice(0, 7));
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PAID' | 'PENDING'>('ALL');

  const [settings, setSettings] = useState<StaffPayrollSettings>(() => ({
    ...DEFAULT_PAYROLL_SETTINGS,
    ...(staffPayroll?.settings || {})
  }));

  const [salaryConfigs, setSalaryConfigs] = useState<Record<number, TeacherSalaryConfig>>(
    () => staffPayroll?.configs || {}
  );

  const [monthlyOverrides, setMonthlyOverrides] = useState<Record<string, Record<number, Partial<StaffPayrollRecord>>>>(
    () => (staffPayroll?.records as any) || {}
  );

  const [liveAttendanceMap, setLiveAttendanceMap] = useState<Record<string, Record<number, TeacherAttendanceEntry>>>(
    () => teacherAttendance || {}
  );

  const [previewTeacherId, setPreviewTeacherId] = useState<number>(() => teachers[0]?.id || 101);
  const [editingRecord, setEditingRecord] = useState<StaffPayrollRecord | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = useCallback((text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(prev => (prev?.text === text ? null : prev));
    }, 4000);
  }, []);

  // Sync incoming teacherAttendance prop
  useEffect(() => {
    if (teacherAttendance && Object.keys(teacherAttendance).length > 0) {
      setLiveAttendanceMap(prev => ({ ...prev, ...teacherAttendance }));
    }
  }, [teacherAttendance]);

  // Also load teacher_attendance & staff_payroll from Supabase on mount so payroll always has fresh DB attendance
  useEffect(() => {
    let mounted = true;
    async function loadFromDb() {
      try {
        const [attRes, payRes] = await Promise.all([
          supabase.from('teacher_attendance').select('*').eq('school_id', effectiveSchoolId),
          supabase.from('staff_payroll').select('*').eq('school_id', effectiveSchoolId)
        ]);

        if (!mounted) return;

        if (!attRes.error && Array.isArray(attRes.data) && attRes.data.length > 0) {
          setLiveAttendanceMap(prev => {
            const next = { ...prev };
            attRes.data.forEach((row: any) => {
              const dKey = String(row.date || '').split('T')[0];
              const tId = Number(row.teacher_id ?? row.teacherId);
              if (!dKey || !tId) return;
              if (!next[dKey]) next[dKey] = {};
              next[dKey][tId] = {
                id: row.id,
                teacherId: tId,
                teacherName: row.teacher_name || row.teacherName || '',
                schoolRole: row.school_role || row.schoolRole || 'Subject Teacher',
                date: dKey,
                status: row.status || 'PRESENT',
                checkInTime: row.check_in_time || row.checkInTime || '07:30',
                checkOutTime: row.check_out_time || row.checkOutTime || '15:30',
                remarks: row.remarks || ''
              };
            });
            return next;
          });
        }

        if (!payRes.error && Array.isArray(payRes.data) && payRes.data.length > 0) {
          setMonthlyOverrides(prev => {
            const next = { ...prev };
            payRes.data.forEach((row: any) => {
              const mKey = String(row.month_year || row.monthYear || '');
              const tId = Number(row.teacher_id ?? row.teacherId);
              if (!mKey || !tId) return;
              if (!next[mKey]) next[mKey] = {};
              if (!next[mKey][tId]) {
                next[mKey][tId] = {
                  basicSalary: Number(row.basic_salary ?? row.basicSalary ?? 0),
                  housingAllowance: Number(row.housing_allowance ?? row.housingAllowance ?? 0),
                  transportAllowance: Number(row.transport_allowance ?? row.transportAllowance ?? 0),
                  responsibilityAllowance: Number(row.responsibility_allowance ?? row.responsibilityAllowance ?? 0),
                  bonusAmount: Number(row.bonus_amount ?? row.bonusAmount ?? 0),
                  bonusReason: row.bonus_reason || row.bonusReason || '',
                  loanAdvanceDeduction: Number(row.loan_advance_deduction ?? row.loanAdvanceDeduction ?? 0),
                  paymentStatus: (row.payment_status || row.paymentStatus || 'PENDING') as any,
                  paymentMethod: (row.payment_method || row.paymentMethod || 'Bank Transfer') as any,
                  bankName: row.bank_name || row.bankName || 'CRDB Bank',
                  bankAccount: row.bank_account || row.bankAccount || '',
                  paidAt: row.paid_at || row.paidAt || undefined
                };
              }
            });
            return next;
          });
        }
      } catch (e) {
        console.warn('Payroll DB sync notice:', e);
      }
    }
    loadFromDb();
    return () => {
      mounted = false;
    };
  }, [effectiveSchoolId]);

  // Compute full monthly payroll records for all teachers
  const computedPayrollRecords = useMemo<StaffPayrollRecord[]>(() => {
    const datesInMonth = Object.keys(liveAttendanceMap).filter(d => d.startsWith(selectedMonth));
    const workingDays = Math.max(1, settings.standardWorkingDays || 22);
    const overridesForMonth = monthlyOverrides[selectedMonth] || {};

    return teachers.map((teacher, idx) => {
      const roleDefaults = getDefaultSalaryByRole(teacher.schoolRole);
      const cfg: TeacherSalaryConfig = salaryConfigs[teacher.id] || {
        teacherId: teacher.id,
        basicSalary: roleDefaults.basic,
        housingAllowance: roleDefaults.housing,
        transportAllowance: roleDefaults.transport,
        responsibilityAllowance: roleDefaults.responsibility,
        defaultBonus: 0,
        loanAdvanceDeduction: 0,
        bankName: idx % 2 === 0 ? 'CRDB Bank' : 'NMB Bank',
        bankAccount: `0152${String(teacher.id).padStart(4, '0')}88900`,
        paymentMethod: 'Bank Transfer'
      };

      const monthPatch = overridesForMonth[teacher.id] || {};

      // Count attendance from liveAttendanceMap for selectedMonth
      let loggedPresent = 0;
      let loggedLate = 0;
      let loggedExcused = 0;
      let loggedAbsent = 0;

      datesInMonth.forEach(dKey => {
        const entry = liveAttendanceMap[dKey]?.[teacher.id];
        if (!entry) return;
        if (entry.status === 'PRESENT') loggedPresent++;
        else if (entry.status === 'LATE') loggedLate++;
        else if (entry.status === 'EXCUSED') loggedExcused++;
        else if (entry.status === 'ABSENT') loggedAbsent++;
      });

      const totalLogged = loggedPresent + loggedLate + loggedExcused + loggedAbsent;
      const daysAbsent = monthPatch.daysAbsent !== undefined ? monthPatch.daysAbsent : loggedAbsent;
      const daysLate = monthPatch.daysLate !== undefined ? monthPatch.daysLate : loggedLate;
      const daysExcused = monthPatch.daysExcused !== undefined ? monthPatch.daysExcused : loggedExcused;
      const daysPresent =
        monthPatch.daysPresent !== undefined
          ? monthPatch.daysPresent
          : totalLogged > 0
          ? Math.max(0, workingDays - daysAbsent - daysLate - daysExcused)
          : workingDays;

      const basicSalary = monthPatch.basicSalary ?? cfg.basicSalary;
      const housingAllowance = monthPatch.housingAllowance ?? cfg.housingAllowance;
      const transportAllowance = monthPatch.transportAllowance ?? cfg.transportAllowance;
      const responsibilityAllowance = monthPatch.responsibilityAllowance ?? cfg.responsibilityAllowance;

      // Perfect attendance bonus check (if 0 absences & 0 lates)
      const autoAttendanceBonus =
        daysAbsent === 0 && daysLate === 0 ? settings.perfectAttendanceBonus || 0 : 0;

      const bonusAmount =
        monthPatch.bonusAmount !== undefined
          ? monthPatch.bonusAmount
          : (cfg.defaultBonus || 0) + autoAttendanceBonus;

      const bonusReason =
        monthPatch.bonusReason !== undefined
          ? monthPatch.bonusReason
          : autoAttendanceBonus > 0
          ? '100% Attendance Bonus'
          : '';

      const grossSalary =
        basicSalary + housingAllowance + transportAllowance + responsibilityAllowance + bonusAmount;

      // Attendance Deduction calculation
      let computedAbsenceDeduction = 0;
      if (settings.absencePenaltyMode === 'PRORATED_BASIC') {
        const dailyRate = basicSalary / workingDays;
        computedAbsenceDeduction = Math.round(dailyRate * daysAbsent + (settings.latePenaltyPerDay || 0) * daysLate);
      } else if (settings.absencePenaltyMode === 'FIXED_PER_DAY') {
        computedAbsenceDeduction = Math.round(
          (settings.fixedAbsencePenaltyPerDay || 0) * daysAbsent + (settings.latePenaltyPerDay || 0) * daysLate
        );
      }

      const attendanceDeduction =
        monthPatch.attendanceDeduction !== undefined
          ? monthPatch.attendanceDeduction
          : computedAbsenceDeduction;

      // Statutory Deductions (NSSF, PAYE, NHIF)
      const nssfDeduction =
        monthPatch.nssfDeduction !== undefined
          ? monthPatch.nssfDeduction
          : Math.round(grossSalary * ((settings.nssfRatePercent || 10) / 100));

      const taxableIncome = Math.max(0, grossSalary - nssfDeduction - attendanceDeduction);

      const taxDeduction =
        monthPatch.taxDeduction !== undefined
          ? monthPatch.taxDeduction
          : settings.taxCalculationMode === 'TRA_BRACKETS'
          ? calculateTraPayeTax(taxableIncome)
          : Math.round(taxableIncome * ((settings.flatTaxRatePercent || 11) / 100));

      const healthInsurance =
        monthPatch.healthInsurance !== undefined
          ? monthPatch.healthInsurance
          : Math.round(basicSalary * ((settings.nhifRatePercent || 3) / 100));

      const loanAdvanceDeduction =
        monthPatch.loanAdvanceDeduction !== undefined
          ? monthPatch.loanAdvanceDeduction
          : cfg.loanAdvanceDeduction || 0;

      const totalDeductions =
        attendanceDeduction + taxDeduction + nssfDeduction + healthInsurance + loanAdvanceDeduction;

      const netSalary = Math.max(0, grossSalary - totalDeductions);

      return {
        id: `pay_${effectiveSchoolId}_${selectedMonth}_${teacher.id}`,
        schoolId: effectiveSchoolId,
        teacherId: teacher.id,
        teacherName: teacher.name,
        schoolRole: teacher.schoolRole || 'Subject Teacher',
        monthYear: selectedMonth,
        basicSalary,
        housingAllowance,
        transportAllowance,
        responsibilityAllowance,
        bonusAmount,
        bonusReason,
        workingDays,
        daysPresent,
        daysLate,
        daysExcused,
        daysAbsent,
        attendanceDeduction,
        taxDeduction,
        nssfDeduction,
        healthInsurance,
        loanAdvanceDeduction,
        grossSalary,
        totalDeductions,
        netSalary,
        paymentStatus: monthPatch.paymentStatus || 'PENDING',
        paymentMethod: monthPatch.paymentMethod || cfg.paymentMethod || 'Bank Transfer',
        bankName: monthPatch.bankName || cfg.bankName || 'CRDB Bank',
        bankAccount: monthPatch.bankAccount || cfg.bankAccount || '',
        paidAt: monthPatch.paidAt,
        updatedAt: new Date().toISOString()
      };
    });
  }, [
    teachers,
    liveAttendanceMap,
    selectedMonth,
    settings,
    salaryConfigs,
    monthlyOverrides,
    effectiveSchoolId
  ]);

  // Filtered payroll rows
  const filteredRecords = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return computedPayrollRecords.filter(r => {
      const matchesSearch =
        !q ||
        r.teacherName.toLowerCase().includes(q) ||
        r.schoolRole.toLowerCase().includes(q) ||
        r.bankName.toLowerCase().includes(q);
      const matchesStatus = statusFilter === 'ALL' || r.paymentStatus === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [computedPayrollRecords, searchQuery, statusFilter]);

  // Summary KPIs
  const payrollTotals = useMemo(() => {
    const gross = computedPayrollRecords.reduce((s, r) => s + r.grossSalary, 0);
    const bonuses = computedPayrollRecords.reduce((s, r) => s + r.bonusAmount, 0);
    const taxAndStatutory = computedPayrollRecords.reduce(
      (s, r) => s + r.taxDeduction + r.nssfDeduction + r.healthInsurance,
      0
    );
    const attDeductions = computedPayrollRecords.reduce((s, r) => s + r.attendanceDeduction, 0);
    const net = computedPayrollRecords.reduce((s, r) => s + r.netSalary, 0);
    const paidCount = computedPayrollRecords.filter(r => r.paymentStatus === 'PAID').length;
    return {
      gross,
      bonuses,
      taxAndStatutory,
      attDeductions,
      net,
      paidCount,
      totalCount: computedPayrollRecords.length
    };
  }, [computedPayrollRecords]);

  // Persist payroll to Supabase `staff_payroll` table + AppData
  const persistPayrollState = async (
    nextSettings = settings,
    nextConfigs = salaryConfigs,
    nextOverrides = monthlyOverrides,
    recordsToUpsert = computedPayrollRecords
  ) => {
    setIsSaving(true);
    try {
      const dbPayload = recordsToUpsert.map(r => ({
        id: r.id,
        school_id: effectiveSchoolId,
        teacher_id: r.teacherId,
        teacher_name: r.teacherName,
        school_role: r.schoolRole,
        month_year: r.monthYear,
        basic_salary: String(r.basicSalary),
        housing_allowance: String(r.housingAllowance),
        transport_allowance: String(r.transportAllowance),
        responsibility_allowance: String(r.responsibilityAllowance),
        bonus_amount: String(r.bonusAmount),
        bonus_reason: r.bonusReason || '',
        working_days: r.workingDays,
        days_present: r.daysPresent,
        days_late: r.daysLate,
        days_excused: r.daysExcused,
        days_absent: r.daysAbsent,
        attendance_deduction: String(r.attendanceDeduction),
        tax_deduction: String(r.taxDeduction),
        nssf_deduction: String(r.nssfDeduction),
        health_insurance: String(r.healthInsurance),
        loan_advance_deduction: String(r.loanAdvanceDeduction),
        gross_salary: String(r.grossSalary),
        total_deductions: String(r.totalDeductions),
        net_salary: String(r.netSalary),
        payment_status: r.paymentStatus,
        payment_method: r.paymentMethod,
        bank_name: r.bankName,
        bank_account: r.bankAccount,
        paid_at: r.paidAt || null,
        updated_at: new Date().toISOString()
      }));

      await supabase.from('staff_payroll').upsert(dbPayload);

      if (onSaveStaffPayroll) {
        onSaveStaffPayroll({
          settings: nextSettings,
          configs: nextConfigs,
          records: nextOverrides as any
        });
      }

      showToast(
        `Saved ${recordsToUpsert.length} payroll records for ${formatMonthYearLabel(selectedMonth)} to Supabase!`,
        'success'
      );
    } catch (err: any) {
      console.error('Error saving payroll:', err);
      showToast(`Error saving payroll: ${err?.message || 'Unknown error'}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle Paid / Pending for a single staff member
  const handleTogglePaymentStatus = (record: StaffPayrollRecord) => {
    const nextStatus = record.paymentStatus === 'PAID' ? 'PENDING' : 'PAID';
    const paidAt = nextStatus === 'PAID' ? new Date().toISOString().split('T')[0] : undefined;
    const nextOverrides: Record<string, Record<number, Partial<StaffPayrollRecord>>> = {
      ...monthlyOverrides,
      [selectedMonth]: {
        ...(monthlyOverrides[selectedMonth] || {}),
        [record.teacherId]: {
          ...(monthlyOverrides[selectedMonth]?.[record.teacherId] || {}),
          paymentStatus: nextStatus,
          paidAt
        }
      }
    };
    setMonthlyOverrides(nextOverrides);
    showToast(`${record.teacherName} marked as ${nextStatus}.`);
  };

  // Mark all staff as Paid
  const handleMarkAllPaid = () => {
    const today = new Date().toISOString().split('T')[0];
    const monthMap: Record<number, Partial<StaffPayrollRecord>> = {
      ...(monthlyOverrides[selectedMonth] || {})
    };
    computedPayrollRecords.forEach(r => {
      monthMap[r.teacherId] = {
        ...(monthMap[r.teacherId] || {}),
        paymentStatus: 'PAID',
        paidAt: today
      };
    });
    const nextOverrides = {
      ...monthlyOverrides,
      [selectedMonth]: monthMap
    };
    setMonthlyOverrides(nextOverrides);
    showToast(`Marked all ${computedPayrollRecords.length} staff salaries as PAID for ${formatMonthYearLabel(selectedMonth)}.`);
  };

  // Save edited modal record
  const handleSaveEditedRecord = () => {
    if (!editingRecord) return;
    const tId = editingRecord.teacherId;

    // Also update base config for future months
    const nextConfigs: Record<number, TeacherSalaryConfig> = {
      ...salaryConfigs,
      [tId]: {
        teacherId: tId,
        basicSalary: editingRecord.basicSalary,
        housingAllowance: editingRecord.housingAllowance,
        transportAllowance: editingRecord.transportAllowance,
        responsibilityAllowance: editingRecord.responsibilityAllowance,
        defaultBonus: editingRecord.bonusAmount,
        loanAdvanceDeduction: editingRecord.loanAdvanceDeduction,
        bankName: editingRecord.bankName,
        bankAccount: editingRecord.bankAccount,
        paymentMethod: editingRecord.paymentMethod
      }
    };

    const nextOverrides = {
      ...monthlyOverrides,
      [selectedMonth]: {
        ...(monthlyOverrides[selectedMonth] || {}),
        [tId]: {
          basicSalary: editingRecord.basicSalary,
          housingAllowance: editingRecord.housingAllowance,
          transportAllowance: editingRecord.transportAllowance,
          responsibilityAllowance: editingRecord.responsibilityAllowance,
          bonusAmount: editingRecord.bonusAmount,
          bonusReason: editingRecord.bonusReason,
          daysPresent: editingRecord.daysPresent,
          daysLate: editingRecord.daysLate,
          daysExcused: editingRecord.daysExcused,
          daysAbsent: editingRecord.daysAbsent,
          loanAdvanceDeduction: editingRecord.loanAdvanceDeduction,
          bankName: editingRecord.bankName,
          bankAccount: editingRecord.bankAccount,
          paymentMethod: editingRecord.paymentMethod,
          paymentStatus: editingRecord.paymentStatus
        }
      }
    };

    setSalaryConfigs(nextConfigs);
    setMonthlyOverrides(nextOverrides);
    setEditingRecord(null);
    showToast(`Updated salary, bonus & deduction parameters for ${editingRecord.teacherName}.`);
  };

  const activePreviewRecord = useMemo(() => {
    return (
      computedPayrollRecords.find(r => r.teacherId === previewTeacherId) ||
      computedPayrollRecords[0] ||
      null
    );
  }, [computedPayrollRecords, previewTeacherId]);

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border text-sm font-medium transition-all ${
            toastMessage.type === 'success'
              ? 'bg-emerald-950 text-emerald-100 border-emerald-700'
              : 'bg-rose-950 text-rose-100 border-rose-700'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Top Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-white flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-400 mb-1">
            <DollarSign className="w-4 h-4" />
            <span>Finance & HR Management / Staff Payroll Engine</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            Staff Payroll Management (Usimamizi wa Mishahara ya Walimu)
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Automated monthly salary calculation based on daily teacher attendance, TRA PAYE tax, NSSF/NHIF deductions, and bonuses with PDF Payslip export.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {onNavigateToTeacherAttendance && (
            <button
              onClick={onNavigateToTeacherAttendance}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-colors cursor-pointer"
            >
              <UserCheck className="w-4 h-4 text-sky-400" />
              <span>Teacher Attendance</span>
            </button>
          )}
          <button
            onClick={() =>
              exportMasterPayrollRegisterPDF(
                computedPayrollRecords,
                schoolInfo,
                selectedMonth,
                settings.currency
              )
            }
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 text-xs font-semibold transition-colors cursor-pointer"
          >
            <FileText className="w-4 h-4 text-amber-400" />
            <span>Master Register PDF</span>
          </button>
          <button
            onClick={() =>
              exportAllPayslipsBatchPDF(
                computedPayrollRecords,
                schoolInfo,
                selectedMonth,
                settings.currency
              )
            }
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export All Payslips (PDF)</span>
          </button>
          <button
            onClick={() => persistPayrollState()}
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
          >
            {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{isSaving ? 'Saving...' : 'Save Payroll'}</span>
          </button>
        </div>
      </div>

      {/* Sub-Navigation Tabs & Period Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveTab('payroll_sheet')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === 'payroll_sheet'
                ? 'bg-slate-900 text-white'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Monthly Payroll Sheet</span>
          </button>
          <button
            onClick={() => setActiveTab('payslip_preview')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === 'payslip_preview'
                ? 'bg-slate-900 text-white'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Payslip Preview & PDF Studio</span>
          </button>
          <button
            onClick={() => setActiveTab('salary_settings')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === 'salary_settings'
                ? 'bg-slate-900 text-white'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Tax, Attendance & Salary Rules</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-600">Payroll Period:</label>
          <input
            type="month"
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-bold text-slate-900 tabular-nums"
          />
        </div>
      </div>

      {/* KPI Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-[11px] font-semibold uppercase text-slate-500">Total Gross Payroll</div>
          <div className="text-lg font-bold text-slate-900 font-mono tabular-nums mt-1">
            {formatCurrencyAmount(payrollTotals.gross, settings.currency)}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Basic + Allowances + Bonuses ({payrollTotals.totalCount} staff)
          </div>
        </div>

        <div className="bg-white border border-emerald-200 rounded-xl p-4">
          <div className="text-[11px] font-semibold uppercase text-emerald-700">Total Bonuses</div>
          <div className="text-lg font-bold text-emerald-600 font-mono tabular-nums mt-1">
            {formatCurrencyAmount(payrollTotals.bonuses, settings.currency)}
          </div>
          <div className="text-[11px] text-emerald-600 mt-0.5">
            Includes 100% attendance rewards
          </div>
        </div>

        <div className="bg-white border border-amber-200 rounded-xl p-4">
          <div className="text-[11px] font-semibold uppercase text-amber-700">Tax & Statutory (PAYE/NSSF)</div>
          <div className="text-lg font-bold text-amber-600 font-mono tabular-nums mt-1">
            {formatCurrencyAmount(payrollTotals.taxAndStatutory, settings.currency)}
          </div>
          <div className="text-[11px] text-amber-600 mt-0.5">
            TRA PAYE + NSSF ({settings.nssfRatePercent}%) + NHIF ({settings.nhifRatePercent}%)
          </div>
        </div>

        <div className="bg-white border border-rose-200 rounded-xl p-4">
          <div className="text-[11px] font-semibold uppercase text-rose-700">Attendance Deductions</div>
          <div className="text-lg font-bold text-rose-600 font-mono tabular-nums mt-1">
            {formatCurrencyAmount(payrollTotals.attDeductions, settings.currency)}
          </div>
          <div className="text-[11px] text-rose-600 mt-0.5">
            From unexcused absences & late logs
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-white">
          <div className="text-[11px] font-semibold uppercase text-slate-400">Total Net Disbursed</div>
          <div className="text-lg font-bold text-emerald-400 font-mono tabular-nums mt-1">
            {formatCurrencyAmount(payrollTotals.net, settings.currency)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5 tabular-nums">
            {payrollTotals.paidCount} Paid / {payrollTotals.totalCount - payrollTotals.paidCount} Pending
          </div>
        </div>
      </div>

      {/* TAB 1: MONTHLY PAYROLL SHEET */}
      {activeTab === 'payroll_sheet' && (
        <div className="space-y-4">
          {/* Filter & Action Toolbar */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search staff name, role, bank..."
                  className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-900 w-60 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as any)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-medium text-slate-800 bg-white"
              >
                <option value="ALL">All Payment Statuses</option>
                <option value="PAID">Paid Only</option>
                <option value="PENDING">Pending Only</option>
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleMarkAllPaid}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-semibold transition-colors cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Mark All Paid</span>
              </button>
            </div>
          </div>

          {/* High-Density Financial Table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    <th className="py-3 px-3">Staff Member</th>
                    <th className="py-3 px-2.5 text-center">Attendance</th>
                    <th className="py-3 px-2.5 text-right">Basic Salary</th>
                    <th className="py-3 px-2.5 text-right">Allowances</th>
                    <th className="py-3 px-2.5 text-right">Bonuses</th>
                    <th className="py-3 px-2.5 text-right">Gross Pay</th>
                    <th className="py-3 px-2.5 text-right">Att. Ded.</th>
                    <th className="py-3 px-2.5 text-right">PAYE Tax</th>
                    <th className="py-3 px-2.5 text-right">NSSF/NHIF/Loan</th>
                    <th className="py-3 px-2.5 text-right">Net Salary</th>
                    <th className="py-3 px-2.5 text-center">Status</th>
                    <th className="py-3 px-3 text-right">Actions & PDF</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs">
                  {filteredRecords.map(rec => {
                    const totalAllowances =
                      rec.housingAllowance + rec.transportAllowance + rec.responsibilityAllowance;
                    const statutoryAndLoans =
                      rec.nssfDeduction + rec.healthInsurance + rec.loanAdvanceDeduction;

                    return (
                      <tr key={rec.teacherId} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-slate-900">{rec.teacherName}</div>
                          <div className="text-[11px] text-slate-500">
                            {rec.schoolRole} • {rec.bankName}
                          </div>
                        </td>
                        <td className="py-2.5 px-2.5 text-center font-mono tabular-nums">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px]">
                            <span className="text-emerald-600 font-bold">{rec.daysPresent}P</span>/
                            <span className="text-amber-600 font-bold">{rec.daysLate}L</span>/
                            <span className="text-rose-600 font-bold">{rec.daysAbsent}A</span>
                          </span>
                        </td>
                        <td className="py-2.5 px-2.5 text-right font-mono tabular-nums text-slate-800">
                          {rec.basicSalary.toLocaleString('en-US')}
                        </td>
                        <td className="py-2.5 px-2.5 text-right font-mono tabular-nums text-slate-700">
                          {totalAllowances.toLocaleString('en-US')}
                        </td>
                        <td className="py-2.5 px-2.5 text-right font-mono tabular-nums text-emerald-600 font-medium">
                          +{rec.bonusAmount.toLocaleString('en-US')}
                        </td>
                        <td className="py-2.5 px-2.5 text-right font-mono tabular-nums font-semibold text-slate-900">
                          {rec.grossSalary.toLocaleString('en-US')}
                        </td>
                        <td className="py-2.5 px-2.5 text-right font-mono tabular-nums text-rose-600">
                          -{rec.attendanceDeduction.toLocaleString('en-US')}
                        </td>
                        <td className="py-2.5 px-2.5 text-right font-mono tabular-nums text-amber-700">
                          -{rec.taxDeduction.toLocaleString('en-US')}
                        </td>
                        <td className="py-2.5 px-2.5 text-right font-mono tabular-nums text-slate-600">
                          -{statutoryAndLoans.toLocaleString('en-US')}
                        </td>
                        <td className="py-2.5 px-2.5 text-right font-mono tabular-nums font-bold text-emerald-700 bg-emerald-50/40">
                          {rec.netSalary.toLocaleString('en-US')}
                        </td>
                        <td className="py-2.5 px-2.5 text-center">
                          <button
                            onClick={() => handleTogglePaymentStatus(rec)}
                            className={`px-2.5 py-0.5 rounded text-[11px] font-bold border transition-colors cursor-pointer ${
                              rec.paymentStatus === 'PAID'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}
                          >
                            {rec.paymentStatus}
                          </button>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="inline-flex items-center justify-end gap-1">
                            <button
                              onClick={() => setEditingRecord({ ...rec })}
                              title="Edit Salary, Bonuses & Deductions"
                              className="p-1.5 rounded hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                setPreviewTeacherId(rec.teacherId);
                                setActiveTab('payslip_preview');
                              }}
                              title="Preview Payslip"
                              className="p-1.5 rounded hover:bg-slate-100 text-blue-600 hover:text-blue-700 transition-colors cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() =>
                                exportIndividualPayslipPDF(rec, schoolInfo, settings.currency)
                              }
                              title="Download PDF Payslip"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-semibold transition-colors cursor-pointer"
                            >
                              <Download className="w-3 h-3" />
                              <span>PDF</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PAYSLIP PREVIEW & PDF STUDIO */}
      {activeTab === 'payslip_preview' && activePreviewRecord && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Staff Selector Sidebar */}
          <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-4 space-y-3 h-fit">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Select Staff Member ({computedPayrollRecords.length})
            </h3>
            <div className="max-h-[520px] overflow-y-auto divide-y divide-slate-100">
              {computedPayrollRecords.map(r => {
                const isSelected = r.teacherId === activePreviewRecord.teacherId;
                return (
                  <button
                    key={r.teacherId}
                    onClick={() => setPreviewTeacherId(r.teacherId)}
                    className={`w-full text-left p-3 rounded-lg flex items-center justify-between transition-colors cursor-pointer ${
                      isSelected ? 'bg-slate-900 text-white' : 'hover:bg-slate-50 text-slate-800'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-semibold">{r.teacherName}</div>
                      <div
                        className={`text-[11px] ${
                          isSelected ? 'text-slate-300' : 'text-slate-500'
                        }`}
                      >
                        {r.schoolRole}
                      </div>
                    </div>
                    <div className="text-right font-mono tabular-nums">
                      <div
                        className={`text-xs font-bold ${
                          isSelected ? 'text-emerald-400' : 'text-emerald-700'
                        }`}
                      >
                        {formatCurrencyAmount(r.netSalary, settings.currency)}
                      </div>
                      <div
                        className={`text-[10px] ${
                          isSelected ? 'text-slate-400' : 'text-slate-400'
                        }`}
                      >
                        {r.paymentStatus}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Payslip Document Preview */}
          <div className="lg:col-span-8 space-y-4">
            <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Official Payslip — {activePreviewRecord.teacherName}
                </h3>
                <p className="text-xs text-slate-500">
                  Period: {formatMonthYearLabel(activePreviewRecord.monthYear)} • Slip ID:{' '}
                  <code className="font-mono">{activePreviewRecord.id}</code>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    printPayslipDocument(activePreviewRecord, schoolInfo, settings.currency)
                  }
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-colors cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Slip</span>
                </button>
                <button
                  onClick={() =>
                    exportIndividualPayslipPDF(activePreviewRecord, schoolInfo, settings.currency)
                  }
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download PDF Payslip</span>
                </button>
              </div>
            </div>

            {/* Visual Payslip Card */}
            <div className="bg-white border border-slate-300 rounded-xl overflow-hidden shadow-sm">
              <div className="bg-slate-900 text-white p-6 text-center border-b border-slate-800">
                <h2 className="text-lg font-bold tracking-wide uppercase">
                  {schoolInfo?.name || 'HABY EDUPRO SCHOOL'}
                </h2>
                <p className="text-xs text-slate-300 mt-0.5">
                  {schoolInfo?.address || 'P.O. Box 1234, Tanzania'} • Tel: {schoolInfo?.phone || 'N/A'}
                </p>
                <div className="inline-block mt-3 px-3 py-1 rounded bg-sky-500/20 border border-sky-400/30 text-sky-300 text-xs font-bold uppercase tracking-wider">
                  Monthly Staff Salary Slip — {formatMonthYearLabel(activePreviewRecord.monthYear)}
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Employee Info Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200 text-xs">
                  <div>
                    <div className="text-slate-500 font-medium">Employee Name</div>
                    <div className="font-bold text-slate-900 mt-0.5">{activePreviewRecord.teacherName}</div>
                  </div>
                  <div>
                    <div className="text-slate-500 font-medium">Designation / Role</div>
                    <div className="font-bold text-slate-900 mt-0.5">{activePreviewRecord.schoolRole}</div>
                  </div>
                  <div>
                    <div className="text-slate-500 font-medium">Bank / Account</div>
                    <div className="font-bold text-slate-900 font-mono tabular-nums mt-0.5">
                      {activePreviewRecord.bankName} ({activePreviewRecord.bankAccount})
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500 font-medium">Attendance Summary</div>
                    <div className="font-bold text-slate-900 font-mono tabular-nums mt-0.5">
                      {activePreviewRecord.daysPresent}P / {activePreviewRecord.daysLate}L /{' '}
                      {activePreviewRecord.daysExcused}E / {activePreviewRecord.daysAbsent}A
                    </div>
                  </div>
                </div>

                {/* Earnings vs Deductions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Earnings */}
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <div className="bg-slate-100 px-4 py-2.5 text-xs font-bold uppercase text-slate-700 border-b border-slate-200">
                      Earnings & Allowances
                    </div>
                    <div className="divide-y divide-slate-100 text-xs">
                      <div className="flex justify-between px-4 py-2.5">
                        <span className="text-slate-600">Basic Monthly Salary</span>
                        <span className="font-mono font-semibold tabular-nums">
                          {formatCurrencyAmount(activePreviewRecord.basicSalary, settings.currency)}
                        </span>
                      </div>
                      <div className="flex justify-between px-4 py-2.5">
                        <span className="text-slate-600">Housing Allowance</span>
                        <span className="font-mono font-semibold tabular-nums">
                          {formatCurrencyAmount(activePreviewRecord.housingAllowance, settings.currency)}
                        </span>
                      </div>
                      <div className="flex justify-between px-4 py-2.5">
                        <span className="text-slate-600">Transport Allowance</span>
                        <span className="font-mono font-semibold tabular-nums">
                          {formatCurrencyAmount(activePreviewRecord.transportAllowance, settings.currency)}
                        </span>
                      </div>
                      <div className="flex justify-between px-4 py-2.5">
                        <span className="text-slate-600">Responsibility Allowance</span>
                        <span className="font-mono font-semibold tabular-nums">
                          {formatCurrencyAmount(
                            activePreviewRecord.responsibilityAllowance,
                            settings.currency
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between px-4 py-2.5">
                        <span className="text-emerald-700 font-medium">
                          Bonuses {activePreviewRecord.bonusReason ? `(${activePreviewRecord.bonusReason})` : ''}
                        </span>
                        <span className="font-mono font-bold text-emerald-600 tabular-nums">
                          +{formatCurrencyAmount(activePreviewRecord.bonusAmount, settings.currency)}
                        </span>
                      </div>
                      <div className="flex justify-between px-4 py-3 bg-slate-50 font-bold text-slate-900">
                        <span>GROSS EARNINGS</span>
                        <span className="font-mono tabular-nums">
                          {formatCurrencyAmount(activePreviewRecord.grossSalary, settings.currency)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Deductions */}
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <div className="bg-slate-100 px-4 py-2.5 text-xs font-bold uppercase text-slate-700 border-b border-slate-200">
                      Tax & Statutory Deductions
                    </div>
                    <div className="divide-y divide-slate-100 text-xs">
                      <div className="flex justify-between px-4 py-2.5">
                        <span className="text-slate-600">PAYE Income Tax (TRA)</span>
                        <span className="font-mono font-semibold text-rose-600 tabular-nums">
                          -{formatCurrencyAmount(activePreviewRecord.taxDeduction, settings.currency)}
                        </span>
                      </div>
                      <div className="flex justify-between px-4 py-2.5">
                        <span className="text-slate-600">
                          NSSF / PSSSF Pension ({settings.nssfRatePercent}%)
                        </span>
                        <span className="font-mono font-semibold text-rose-600 tabular-nums">
                          -{formatCurrencyAmount(activePreviewRecord.nssfDeduction, settings.currency)}
                        </span>
                      </div>
                      <div className="flex justify-between px-4 py-2.5">
                        <span className="text-slate-600">
                          NHIF Health Insurance ({settings.nhifRatePercent}%)
                        </span>
                        <span className="font-mono font-semibold text-rose-600 tabular-nums">
                          -{formatCurrencyAmount(activePreviewRecord.healthInsurance, settings.currency)}
                        </span>
                      </div>
                      <div className="flex justify-between px-4 py-2.5">
                        <span className="text-slate-600">
                          Attendance Deduction ({activePreviewRecord.daysAbsent}A, {activePreviewRecord.daysLate}L)
                        </span>
                        <span className="font-mono font-semibold text-rose-600 tabular-nums">
                          -{formatCurrencyAmount(activePreviewRecord.attendanceDeduction, settings.currency)}
                        </span>
                      </div>
                      <div className="flex justify-between px-4 py-2.5">
                        <span className="text-slate-600">Salary Advance / Loan</span>
                        <span className="font-mono font-semibold text-rose-600 tabular-nums">
                          -{formatCurrencyAmount(activePreviewRecord.loanAdvanceDeduction, settings.currency)}
                        </span>
                      </div>
                      <div className="flex justify-between px-4 py-3 bg-slate-50 font-bold text-rose-700">
                        <span>TOTAL DEDUCTIONS</span>
                        <span className="font-mono tabular-nums">
                          -{formatCurrencyAmount(activePreviewRecord.totalDeductions, settings.currency)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Net Pay Banner */}
                <div className="bg-emerald-600 text-white rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-emerald-100">
                      Net Take-Home Salary
                    </div>
                    <div className="text-xs text-emerald-100 mt-0.5">
                      Disbursed via {activePreviewRecord.paymentMethod} • Status: {activePreviewRecord.paymentStatus}
                    </div>
                  </div>
                  <div className="text-2xl font-bold font-mono tabular-nums">
                    {formatCurrencyAmount(activePreviewRecord.netSalary, settings.currency)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SALARY & TAX CONFIGURATION */}
      {activeTab === 'salary_settings' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Payroll Calculation Rules, Attendance Penalties & Tax Rates
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Configure how monthly attendance records, TRA PAYE income tax, NSSF pension, and bonuses are calculated across all staff.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Standard Working Days / Month
              </label>
              <input
                type="number"
                min={1}
                max={31}
                value={settings.standardWorkingDays}
                onChange={e =>
                  setSettings(prev => ({
                    ...prev,
                    standardWorkingDays: Number(e.target.value) || 22
                  }))
                }
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-mono tabular-nums"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Unexcused Absence Deduction Mode
              </label>
              <select
                value={settings.absencePenaltyMode}
                onChange={e =>
                  setSettings(prev => ({
                    ...prev,
                    absencePenaltyMode: e.target.value as any
                  }))
                }
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white"
              >
                <option value="PRORATED_BASIC">Pro-rated Daily Basic Salary (Basic / Working Days)</option>
                <option value="FIXED_PER_DAY">Fixed Penalty Amount per Absent Day</option>
                <option value="NONE">No Automatic Absence Deduction</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Fixed Absence Penalty / Day ({settings.currency})
              </label>
              <input
                type="number"
                value={settings.fixedAbsencePenaltyPerDay}
                onChange={e =>
                  setSettings(prev => ({
                    ...prev,
                    fixedAbsencePenaltyPerDay: Number(e.target.value) || 0
                  }))
                }
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-mono tabular-nums"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Late Arrival Penalty / Day ({settings.currency})
              </label>
              <input
                type="number"
                value={settings.latePenaltyPerDay}
                onChange={e =>
                  setSettings(prev => ({
                    ...prev,
                    latePenaltyPerDay: Number(e.target.value) || 0
                  }))
                }
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-mono tabular-nums"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                100% Perfect Attendance Bonus ({settings.currency})
              </label>
              <input
                type="number"
                value={settings.perfectAttendanceBonus}
                onChange={e =>
                  setSettings(prev => ({
                    ...prev,
                    perfectAttendanceBonus: Number(e.target.value) || 0
                  }))
                }
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-mono tabular-nums"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Income Tax (PAYE) Calculation Mode
              </label>
              <select
                value={settings.taxCalculationMode}
                onChange={e =>
                  setSettings(prev => ({
                    ...prev,
                    taxCalculationMode: e.target.value as any
                  }))
                }
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white"
              >
                <option value="TRA_BRACKETS">Official Tanzania TRA PAYE Tax Brackets</option>
                <option value="FLAT_RATE">Flat Percentage Tax Rate</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Flat Tax Rate (%) (if Flat Rate selected)
              </label>
              <input
                type="number"
                value={settings.flatTaxRatePercent}
                onChange={e =>
                  setSettings(prev => ({
                    ...prev,
                    flatTaxRatePercent: Number(e.target.value) || 0
                  }))
                }
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-mono tabular-nums"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                NSSF / PSSSF Pension Rate (%)
              </label>
              <input
                type="number"
                value={settings.nssfRatePercent}
                onChange={e =>
                  setSettings(prev => ({
                    ...prev,
                    nssfRatePercent: Number(e.target.value) || 0
                  }))
                }
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-mono tabular-nums"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                NHIF Health Insurance Rate (%)
              </label>
              <input
                type="number"
                value={settings.nhifRatePercent}
                onChange={e =>
                  setSettings(prev => ({
                    ...prev,
                    nhifRatePercent: Number(e.target.value) || 0
                  }))
                }
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-mono tabular-nums"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 flex justify-end">
            <button
              onClick={() => persistPayrollState(settings, salaryConfigs, monthlyOverrides)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Save Global Payroll Settings</span>
            </button>
          </div>
        </div>
      )}

      {/* EDIT INDIVIDUAL STAFF SALARY MODAL */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-2xl w-full overflow-hidden shadow-xl">
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold">
                  Edit Salary, Attendance & Deductions — {editingRecord.teacherName}
                </h3>
                <p className="text-xs text-slate-400">
                  {editingRecord.schoolRole} • Period: {formatMonthYearLabel(editingRecord.monthYear)}
                </p>
              </div>
              <button
                onClick={() => setEditingRecord(null)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Basic Monthly Salary ({settings.currency})
                  </label>
                  <input
                    type="number"
                    value={editingRecord.basicSalary}
                    onChange={e =>
                      setEditingRecord({ ...editingRecord, basicSalary: Number(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono tabular-nums"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Housing Allowance ({settings.currency})
                  </label>
                  <input
                    type="number"
                    value={editingRecord.housingAllowance}
                    onChange={e =>
                      setEditingRecord({
                        ...editingRecord,
                        housingAllowance: Number(e.target.value) || 0
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono tabular-nums"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Transport Allowance ({settings.currency})
                  </label>
                  <input
                    type="number"
                    value={editingRecord.transportAllowance}
                    onChange={e =>
                      setEditingRecord({
                        ...editingRecord,
                        transportAllowance: Number(e.target.value) || 0
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono tabular-nums"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Responsibility Allowance ({settings.currency})
                  </label>
                  <input
                    type="number"
                    value={editingRecord.responsibilityAllowance}
                    onChange={e =>
                      setEditingRecord({
                        ...editingRecord,
                        responsibilityAllowance: Number(e.target.value) || 0
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono tabular-nums"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-emerald-700 mb-1">
                    Monthly Bonus Amount ({settings.currency})
                  </label>
                  <input
                    type="number"
                    value={editingRecord.bonusAmount}
                    onChange={e =>
                      setEditingRecord({
                        ...editingRecord,
                        bonusAmount: Number(e.target.value) || 0
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-emerald-300 font-mono tabular-nums"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-emerald-700 mb-1">
                    Bonus Reason / Note
                  </label>
                  <input
                    type="text"
                    value={editingRecord.bonusReason}
                    onChange={e =>
                      setEditingRecord({ ...editingRecord, bonusReason: e.target.value })
                    }
                    placeholder="e.g., 100% Attendance / Remedial Bonus"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-rose-700 mb-1">
                    Salary Advance / Loan Deduction ({settings.currency})
                  </label>
                  <input
                    type="number"
                    value={editingRecord.loanAdvanceDeduction}
                    onChange={e =>
                      setEditingRecord({
                        ...editingRecord,
                        loanAdvanceDeduction: Number(e.target.value) || 0
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-rose-300 font-mono tabular-nums"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Unexcused Absent Days (This Month)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={31}
                    value={editingRecord.daysAbsent}
                    onChange={e =>
                      setEditingRecord({
                        ...editingRecord,
                        daysAbsent: Number(e.target.value) || 0
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono tabular-nums"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Bank Name</label>
                  <input
                    type="text"
                    value={editingRecord.bankName}
                    onChange={e =>
                      setEditingRecord({ ...editingRecord, bankName: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Bank Account Number
                  </label>
                  <input
                    type="text"
                    value={editingRecord.bankAccount}
                    onChange={e =>
                      setEditingRecord({ ...editingRecord, bankAccount: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono tabular-nums"
                  />
                </div>
              </div>
            </div>

            <div className="bg-slate-50 border-t border-slate-200 px-5 py-3 flex items-center justify-end gap-2">
              <button
                onClick={() => setEditingRecord(null)}
                className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEditedRecord}
                className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer"
              >
                Apply Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
