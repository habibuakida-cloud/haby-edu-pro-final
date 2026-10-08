import React, { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  Search, 
  DollarSign, 
  FileSpreadsheet, 
  Download, 
  Users, 
  CreditCard, 
  Receipt, 
  CheckCircle2, 
  AlertCircle, 
  Building2, 
  Layers, 
  X,
  RefreshCw,
  Wallet
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

import { saveSchoolData, getSchoolData } from '../lib/firestoreService';

const AVAILABLE_CLASS_LEVELS = [
  'Form 1',
  'Form 2',
  'Form 3',
  'Form 4',
  'Form 5',
  'Form 6',
  'Standard 1',
  'Standard 2',
  'Standard 3',
  'Standard 4',
  'Standard 5',
  'Standard 6',
  'Standard 7',
  'Baby Class',
  'Middle Class',
  'Pre-Unit'
];

/**
 * @param {{ schoolId?: string, currentUser?: any, students?: any[] }} props
 */
export default function SaasFinance({ schoolId = 'DEMO_SCHOOL', currentUser = null, students = [] }) {
  const [activeTab, setActiveTab] = useState('settings'); // 'settings' (Page A) | 'payments' (Page B) | 'reports' (Page C)

  // Contribution Types (PAGE A)
  const [contributionTypes, setContributionTypes] = useState([]);
  const [loadingTypes, setLoadingTypes] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingType, setEditingType] = useState(null);
  const [deletingType, setDeletingType] = useState(null);

  // Form State for Contribution Type
  const [formName, setFormName] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formClasses, setFormClasses] = useState(['Form 1', 'Form 2', 'Form 3', 'Form 4']);
  const [formTerm, setFormTerm] = useState('Term 1 / 2026');

  // Student Ledger (PAGE B)
  const [ledger, setLedger] = useState([]);
  const [loadingLedger, setLoadingLedger] = useState(false);
  const [selectedStudentSearch, setSelectedStudentSearch] = useState('');
  const [selectedStudentCno, setSelectedStudentCno] = useState('');

  // Payment Recording Modal
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentTargetLedger, setPaymentTargetLedger] = useState(null);
  const [paymentAmountInput, setPaymentAmountInput] = useState('');

  // Toast / Notification
  const [toastMsg, setToastMsg] = useState(null);
  const [toastError, setToastError] = useState(null);

  const showToast = (msg, isErr = false) => {
    if (isErr) {
      setToastError(msg);
      setTimeout(() => setToastError(null), 4000);
    } else {
      setToastMsg(msg);
      setTimeout(() => setToastMsg(null), 4000);
    }
  };

  const typesStorageKey = `haby_contribution_types_${schoolId}`;
  const ledgerStorageKey = `haby_student_ledger_${schoolId}`;

  // Fetch Contribution Types with Firestore & Supabase directly
  const loadContributionTypes = async () => {
    setLoadingTypes(true);

    // 1. Fetch from Supabase directly (primary relational source)
    try {
      const res = await supabase
        .from('contribution_types')
        .select('*')
        .eq('school_id', schoolId);

      if (res.data && res.data.length > 0) {
        setContributionTypes(res.data);
        setLoadingTypes(false);
        return;
      }
    } catch (err) {
      console.warn('Error loading contribution_types from Supabase:', err);
    }

    // 2. Fallback to Firestore snapshot
    try {
      const fsData = await getSchoolData(schoolId);
      if (fsData && Array.isArray(fsData.contributionTypes) && fsData.contributionTypes.length > 0) {
        setContributionTypes(fsData.contributionTypes);
      }
    } catch (e) {}

    setLoadingTypes(false);
  };

  // Fetch Student Ledger with Firestore & Supabase directly
  const loadStudentLedger = async () => {
    setLoadingLedger(true);

    // 1. Fetch from Supabase directly (primary relational source)
    try {
      const res = await supabase
        .from('student_ledger')
        .select('*')
        .eq('school_id', schoolId);

      if (res.data && res.data.length > 0) {
        setLedger(res.data);
        setLoadingLedger(false);
        return;
      }
    } catch (err) {
      console.warn('Error loading student_ledger from Supabase:', err);
    }

    // 2. Fallback to Firestore snapshot
    try {
      const fsData = await getSchoolData(schoolId);
      if (fsData && Array.isArray(fsData.studentLedger) && fsData.studentLedger.length > 0) {
        setLedger(fsData.studentLedger);
      }
    } catch (e) {}

    setLoadingLedger(false);
  };

  useEffect(() => {
    loadContributionTypes();
    loadStudentLedger();
  }, [schoolId]);

  // Handle saving new or edited contribution type
  const handleSaveContributionType = async (e) => {
    e.preventDefault();
    if (!formName.trim()) {
      showToast('Tafadhali weka jina la mchango (e.g. ADA, CHAKULA, Gesi ya Maabara)', true);
      return;
    }

    const defaultAmt = parseFloat(formAmount) || 0;
    if (defaultAmt < 0) {
      showToast('Kiasi cha mchango hakiwezi kuwa hasi', true);
      return;
    }

    try {
      let updatedTypes = [...contributionTypes];
      let updatedLedger = [...ledger];

      if (editingType) {
        // Update existing type locally
        const targetId = editingType.id;
        updatedTypes = updatedTypes.map(t => {
          if (t.id === targetId) {
            return {
              ...t,
              name: formName.trim(),
              amount_default: defaultAmt,
              class_levels: formClasses,
              academic_year: formTerm
            };
          }
          return t;
        });

        // Supabase async update
        try {
          await supabase
            .from('contribution_types')
            .update({
              name: formName.trim(),
              amount_default: defaultAmt,
              class_levels: formClasses,
              academic_year: formTerm
            })
            .eq('id', targetId);
        } catch (e) {}

        showToast(`Mchango wa "${formName}" umesasishwa kikamilifu!`);
      } else {
        // Create new contribution type
        const newTypeId = `type_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const newType = {
          id: newTypeId,
          school_id: schoolId,
          name: formName.trim(),
          amount_default: defaultAmt,
          class_levels: formClasses,
          academic_year: formTerm,
          created_by: currentUser?.fullName || 'Super Admin'
        };

        updatedTypes = [newType, ...updatedTypes];

        // Try Supabase insert
        let createdTypeId = newTypeId;
        try {
          const insertRes = await supabase.from('contribution_types').insert(newType).select();
          if (insertRes.data && insertRes.data[0]?.id) {
            createdTypeId = insertRes.data[0].id;
          }
        } catch (e) {}

        // SAAS AUTO-CREATION:
        // When school adds a new contribution type, auto-create debts for all students in those class_levels
        const targetStudents = students.filter(s => {
          if (!s.className) return false;
          return formClasses.some(c => c.toLowerCase() === s.className.toLowerCase() || s.className.toLowerCase().includes(c.toLowerCase()));
        });

        if (targetStudents.length > 0) {
          const newLedgerEntries = targetStudents.map(st => {
            const cno = st.regNo || String(st.id);
            return {
              id: `ledg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              school_id: schoolId,
              student_cno: cno,
              student_name: st.name,
              class_level: st.className,
              contribution_type_id: createdTypeId,
              contribution_name: formName.trim(),
              required_amount: defaultAmt,
              paid_amount: 0,
              balance: defaultAmt,
              status: defaultAmt === 0 ? 'PAID' : 'PENDING'
            };
          });

          updatedLedger = [...newLedgerEntries, ...updatedLedger];

          try {
            await supabase.from('student_ledger').insert(newLedgerEntries);
          } catch (e) {}
        }

        showToast(`Mchango mpya wa "${formName}" umeongezwa na kuunganishwa kwa wanafunzi ${targetStudents.length}!`);
      }

      // Sync state and Firestore
      setContributionTypes(updatedTypes);
      setLedger(updatedLedger);
      await saveSchoolData(schoolId, {
        contributionTypes: updatedTypes,
        studentLedger: updatedLedger
      }).catch(() => {});

      setIsModalOpen(false);
      setEditingType(null);
      setFormName('');
      setFormAmount('');
    } catch (err) {
      console.error('Error saving contribution type:', err);
      showToast('Hitilafu ya kuhifadhi mchango: ' + (err.message || 'Error'), true);
    }
  };

  // Delete Contribution Type
  const confirmDeleteType = async () => {
    if (!deletingType) return;
    try {
      const updatedTypes = contributionTypes.filter(t => t.id !== deletingType.id);
      setContributionTypes(updatedTypes);

      try {
        await supabase.from('contribution_types').delete().eq('id', deletingType.id);
      } catch (e) {}

      await saveSchoolData(schoolId, { contributionTypes: updatedTypes }).catch(() => {});
      showToast(`Mchango wa "${deletingType.name}" umefutwa.`);
      setDeletingType(null);
    } catch (err) {
      console.error('Delete error:', err);
      showToast('Hitilafu wakati wa kufuta: ' + (err.message || 'Error'), true);
    }
  };

  // Record student payment
  const handleRecordPayment = async () => {
    if (!paymentTargetLedger) return;
    const payment = parseFloat(paymentAmountInput) || 0;
    if (payment <= 0) {
      showToast('Tafadhali ingiza kiasi sahihi cha malipo', true);
      return;
    }

    const currentPaid = paymentTargetLedger.paid_amount || 0;
    const newPaid = currentPaid + payment;
    const required = paymentTargetLedger.required_amount || 0;
    const newBalance = Math.max(0, required - newPaid);
    const newStatus = newBalance === 0 ? 'PAID' : 'PARTIAL';

    try {
      const updatedLedger = ledger.map(l => {
        if (l.id === paymentTargetLedger.id || (l.student_cno === paymentTargetLedger.student_cno && l.contribution_name === paymentTargetLedger.contribution_name)) {
          return {
            ...l,
            paid_amount: newPaid,
            balance: newBalance,
            status: newStatus
          };
        }
        return l;
      });

      // If record didn't exist in ledger array yet, add it
      const exists = updatedLedger.some(l => l.id === paymentTargetLedger.id || (l.student_cno === paymentTargetLedger.student_cno && l.contribution_name === paymentTargetLedger.contribution_name));
      if (!exists && paymentTargetLedger.type) {
        updatedLedger.push({
          id: `ledg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          school_id: schoolId,
          student_cno: selectedStudentCno,
          student_name: currentViewingStudent?.name || 'Student',
          class_level: currentViewingStudent?.className || '',
          contribution_type_id: paymentTargetLedger.type.id,
          contribution_name: paymentTargetLedger.type.name,
          required_amount: required,
          paid_amount: newPaid,
          balance: newBalance,
          status: newStatus
        });
      }

      setLedger(updatedLedger);

      try {
        if (paymentTargetLedger.id && typeof paymentTargetLedger.id === 'string' && !paymentTargetLedger.id.startsWith('ledg_')) {
          await supabase
            .from('student_ledger')
            .update({
              paid_amount: newPaid,
              balance: newBalance,
              status: newStatus
            })
            .eq('id', paymentTargetLedger.id);
        } else {
          await supabase.from('student_ledger').upsert({
            school_id: schoolId,
            student_cno: selectedStudentCno,
            student_name: currentViewingStudent?.name || 'Student',
            class_level: currentViewingStudent?.className || '',
            contribution_type_id: paymentTargetLedger.type?.id || 'type_default',
            contribution_name: paymentTargetLedger.type?.name || paymentTargetLedger.contribution_name,
            required_amount: required,
            paid_amount: newPaid,
            balance: newBalance,
            status: newStatus
          });
        }
      } catch (e) {}

      await saveSchoolData(schoolId, { studentLedger: updatedLedger }).catch(() => {});

      showToast(`Malipo ya TZS ${payment.toLocaleString()} yamepokelewa kikamilifu! Salio: TZS ${newBalance.toLocaleString()}`);
      setPaymentModalOpen(false);
      setPaymentTargetLedger(null);
      setPaymentAmountInput('');
    } catch (err) {
      console.error('Error recording payment:', err);
      showToast('Hitilafu wakati wa kuweka malipo: ' + (err.message || 'Error'), true);
    }
  };

  // Filter students for Page B
  const matchedStudents = useMemo(() => {
    if (!selectedStudentSearch.trim()) return students.slice(0, 10);
    const term = selectedStudentSearch.toLowerCase().trim();
    return students.filter(s => 
      s.name?.toLowerCase().includes(term) || 
      s.regNo?.toLowerCase().includes(term) ||
      s.className?.toLowerCase().includes(term)
    );
  }, [students, selectedStudentSearch]);

  const currentViewingStudent = useMemo(() => {
    if (!selectedStudentCno) return null;
    return students.find(s => (s.regNo || String(s.id)) === selectedStudentCno) || null;
  }, [students, selectedStudentCno]);

  // Current student's dynamic ledger rows
  const currentStudentLedgerRows = useMemo(() => {
    if (!selectedStudentCno) return [];
    return contributionTypes.map(type => {
      const record = ledger.find(l => 
        String(l.student_cno) === String(selectedStudentCno) && 
        (String(l.contribution_type_id) === String(type.id) || l.contribution_name === type.name)
      );

      return {
        type,
        ledgerId: record?.id,
        required: record ? record.required_amount : type.amount_default,
        paid: record ? record.paid_amount : 0,
        balance: record ? record.balance : type.amount_default,
        status: record ? record.status : 'PENDING',
        rawRecord: record
      };
    });
  }, [selectedStudentCno, contributionTypes, ledger]);

  // PAGE C: DYNAMIC EXCEL REPORT EXPORT
  const handleExportDynamicReport = () => {
    if (contributionTypes.length === 0) {
      showToast('Hakuna aina za michango zilizowekwa. Ongeza michango kwanza.', true);
      return;
    }

    try {
      // Dynamic Headers based on contribution_types of that school:
      // CNO | Name | Class | [Dynamic Contribution Names...] | TOTAL REQUIRED | TOTAL PAID | TOTAL BALANCE
      const dynamicHeaders = [
        'CNO',
        'STUDENT NAME',
        'CLASS',
        ...contributionTypes.map(t => t.name.toUpperCase()),
        'TOTAL REQUIRED',
        'TOTAL PAID',
        'TOTAL BALANCE'
      ];

      const rows = students.map(st => {
        const cno = st.regNo || String(st.id);
        let totalReq = 0;
        let totalPaid = 0;
        let totalBal = 0;

        const dynamicCols = contributionTypes.map(t => {
          const rec = ledger.find(l => 
            String(l.student_cno) === String(cno) && 
            (String(l.contribution_type_id) === String(t.id) || l.contribution_name === t.name)
          );
          const paid = rec ? rec.paid_amount : 0;
          const req = rec ? rec.required_amount : t.amount_default;
          const bal = rec ? rec.balance : t.amount_default;

          totalReq += req;
          totalPaid += paid;
          totalBal += bal;

          return paid;
        });

        return [
          cno,
          st.name,
          st.className || '-',
          ...dynamicCols,
          totalReq,
          totalPaid,
          totalBal
        ];
      });

      const wsData = [dynamicHeaders, ...rows];
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'MICHANGO_SUMMARY');
      XLSX.writeFile(wb, `RIPOTI_YA_MICHANGO_${schoolId}.xlsx`);
      showToast('Ripoti ya Excel imepakuliwa kikamilifu!');
    } catch (err) {
      console.error('Export error:', err);
      showToast('Hitilafu ya kuhamisha ripoti: ' + (err.message || 'Error'), true);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg text-xs font-black uppercase tracking-wider">
              SaaS Dynamic Contributions
            </span>
            <span className="text-xs text-slate-500 font-semibold">School ID: {schoolId}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
            Usimamizi wa Michango ya Shule (Dynamic Contributions)
          </h1>
          <p className="text-xs text-slate-500">
            Mfumo unaoweza kubadilika kulingana na michango ya shule yako (ADA, CHAKULA, REMEDIAL, GESI, n.k.)
          </p>
        </div>

        {/* Action Button: + Ongeza Mchango Mpya (in green as requested) */}
        <button
          type="button"
          onClick={() => {
            setEditingType(null);
            setFormName('');
            setFormAmount('');
            setIsModalOpen(true);
          }}
          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-2 cursor-pointer shadow-md transition active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>+ Ongeza Mchango Mpya</span>
        </button>
      </div>

      {toastMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {toastError && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm animate-in fade-in">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{toastError}</span>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'settings'
              ? 'bg-[#1f4d8b] text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>PAGE A: Mipangilio ya Michango ({contributionTypes.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('payments')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'payments'
              ? 'bg-[#1f4d8b] text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>PAGE B: Malipo ya Mwanafunzi (Dynamic Columns)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('reports')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'reports'
              ? 'bg-[#1f4d8b] text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>PAGE C: Ripoti - Dynamic Excel</span>
        </button>
      </div>

      {/* ================= PAGE A: MIPANGILIO YA MICHANGO ================= */}
      {activeTab === 'settings' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-black text-slate-800">
              Aina za Michango za Shule Yako ({contributionTypes.length})
            </h2>
            <button
              type="button"
              onClick={loadContributionTypes}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
          </div>

          {loadingTypes ? (
            <div className="p-8 text-center text-xs text-slate-500">Inapakia aina za michango...</div>
          ) : contributionTypes.length === 0 ? (
            <div className="bg-white border-2 border-dashed border-slate-300 rounded-2xl p-10 text-center space-y-3">
              <Wallet className="w-12 h-12 text-slate-400 mx-auto" />
              <h3 className="font-bold text-slate-700 text-sm">Hakuna Michango Iliyowekwa Bado</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Bofya kitufe cha "+ Ongeza Mchango Mpya" kuweka aina za michango za shule yako (kama ADA, CHAKULA, GESI YA MAABARA, BUS, n.k.)
              </p>
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                + Ongeza Mchango wa Kwanza
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {contributionTypes.map((type) => (
                <div key={type.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs hover:shadow-sm transition space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-[10px] font-black uppercase">
                        {type.academic_year || '2026'}
                      </span>
                      <h3 className="text-base font-black text-slate-900 mt-1">{type.name}</h3>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block font-bold">Kiasi Cha Awali</span>
                      <span className="text-base font-black text-emerald-700">
                        TZS {Number(type.amount_default || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div>
                    <span className="text-[11px] font-bold text-slate-500 block mb-1.5">Madarasa Yanayohusika:</span>
                    <div className="flex flex-wrap gap-1">
                      {Array.isArray(type.class_levels) && type.class_levels.map((cls) => (
                        <span key={cls} className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-semibold">
                          {cls}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-[10px] text-slate-400">
                      Imeundwa: {type.created_by || 'Admin'}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingType(type);
                          setFormName(type.name);
                          setFormAmount(String(type.amount_default));
                          setFormClasses(type.class_levels || []);
                          setFormTerm(type.academic_year || 'Term 1 / 2026');
                          setIsModalOpen(true);
                        }}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer"
                        title="Badili mchango"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingType(type)}
                        className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                        title="Futa mchango"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ================= PAGE B: MALIPO YA MWANAFUNZI (DYNAMIC COLUMNS) ================= */}
      {activeTab === 'payments' && (
        <div className="space-y-6">
          {/* Student Selector Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <h2 className="text-base font-black text-slate-800">Tafuta Mwanafunzi Kulipia Michango</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Andika jina la mwanafunzi au CNO / Reg No..."
                  value={selectedStudentSearch}
                  onChange={(e) => setSelectedStudentSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 bg-slate-50"
                />
              </div>

              <div>
                <select
                  value={selectedStudentCno}
                  onChange={(e) => setSelectedStudentCno(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 bg-slate-50 focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="">-- Chagua Mwanafunzi --</option>
                  {matchedStudents.map((st) => (
                    <option key={st.regNo || st.id} value={st.regNo || st.id}>
                      {st.name} ({st.className || 'Form 1'}) - {st.regNo || st.id}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {currentViewingStudent && (
              <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 flex flex-wrap items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] text-blue-600 font-black uppercase block">Mwanafunzi Aliyechaguliwa</span>
                  <span className="font-black text-slate-900 text-sm">{currentViewingStudent.name}</span>
                  <span className="text-slate-500 ml-2 font-mono">({currentViewingStudent.regNo || currentViewingStudent.id})</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-bold text-slate-700">Darasa: {currentViewingStudent.className || 'Form 1'}</span>
                  <span className="font-bold text-slate-700">Jinsia: {currentViewingStudent.gender || 'F'}</span>
                </div>
              </div>
            )}
          </div>

          {/* Dynamic Columns Payment Table */}
          {currentViewingStudent ? (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    Orodha ya Michango ya {currentViewingStudent.name}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Inaonyesha aina zote za michango zilizowekwa na shule bila kubadili kodi!
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-black uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="p-3">Aina ya Mchango</th>
                      <th className="p-3">Kiasi Kinachotakiwa</th>
                      <th className="p-3">Kiasi Kilicholipwa</th>
                      <th className="p-3">Deni / Baki</th>
                      <th className="p-3">Hali</th>
                      <th className="p-3 text-right">Hatua</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {currentStudentLedgerRows.map((row) => (
                      <tr key={row.type.id} className="hover:bg-slate-50/60">
                        <td className="p-3">
                          <span className="font-black text-slate-900 block">{row.type.name}</span>
                          <span className="text-[10px] text-slate-400">{row.type.academic_year || 'Term 1'}</span>
                        </td>
                        <td className="p-3 font-bold text-slate-700">
                          TZS {Number(row.required).toLocaleString()}
                        </td>
                        <td className="p-3 font-bold text-emerald-700">
                          TZS {Number(row.paid).toLocaleString()}
                        </td>
                        <td className="p-3 font-black text-rose-700">
                          TZS {Number(row.balance).toLocaleString()}
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                            row.balance === 0
                              ? 'bg-emerald-100 text-emerald-800'
                              : row.paid > 0
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}>
                            {row.balance === 0 ? 'Amemaliza' : row.paid > 0 ? 'Kiasi' : 'Deni'}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              const target = row.rawRecord || {
                                id: `ledger_${schoolId}_${currentViewingStudent.regNo}_${row.type.id}`,
                                school_id: schoolId,
                                student_cno: currentViewingStudent.regNo || String(currentViewingStudent.id),
                                student_name: currentViewingStudent.name,
                                class_level: currentViewingStudent.className,
                                contribution_type_id: row.type.id,
                                contribution_name: row.type.name,
                                required_amount: row.type.amount_default,
                                paid_amount: 0,
                                balance: row.type.amount_default
                              };
                              setPaymentTargetLedger(target);
                              setPaymentAmountInput('');
                              setPaymentModalOpen(true);
                            }}
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold cursor-pointer"
                          >
                            Lipa Sasa
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-slate-400 bg-white border border-slate-200 rounded-xl">
              Tafadhali chagua mwanafunzi hapo juu ili kuona na kulipia michango yake.
            </div>
          )}
        </div>
      )}

      {/* ================= PAGE C: RIPOTI - DYNAMIC EXCEL ================= */}
      {activeTab === 'reports' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
            <div>
              <h2 className="text-base font-black text-slate-900">
                Ripoti ya Michango Yote (Dynamic Headers Export)
              </h2>
              <p className="text-xs text-slate-500">
                Majedwali ya Excel yanatengenezwa kiotomatiki kulingana na michango iliyopo shuleni kwako.
              </p>
            </div>

            <button
              type="button"
              onClick={handleExportDynamicReport}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-2 cursor-pointer shadow-md transition active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>Pakua Ripoti ya Excel (.xlsx)</span>
            </button>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
            <span className="font-bold text-slate-700 block">Safu Zitakazokuwa kwenye Excel:</span>
            <div className="flex flex-wrap gap-2">
              <span className="px-2.5 py-1 bg-white border border-slate-300 rounded font-mono font-bold text-slate-800">CNO</span>
              <span className="px-2.5 py-1 bg-white border border-slate-300 rounded font-mono font-bold text-slate-800">STUDENT NAME</span>
              <span className="px-2.5 py-1 bg-white border border-slate-300 rounded font-mono font-bold text-slate-800">CLASS</span>
              {contributionTypes.map(t => (
                <span key={t.id} className="px-2.5 py-1 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded font-mono font-bold">
                  {t.name.toUpperCase()}
                </span>
              ))}
              <span className="px-2.5 py-1 bg-blue-50 border border-blue-300 text-blue-800 rounded font-mono font-bold">TOTAL REQUIRED</span>
              <span className="px-2.5 py-1 bg-blue-50 border border-blue-300 text-blue-800 rounded font-mono font-bold">TOTAL PAID</span>
              <span className="px-2.5 py-1 bg-rose-50 border border-rose-300 text-rose-800 rounded font-mono font-bold">TOTAL BALANCE</span>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      {deletingType && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <h3 className="text-base font-black text-slate-900">Uhakika wa Kufuta Mchango?</h3>
            <p className="text-xs text-slate-600">
              Je, una uhakika unataka kufuta mchango wa <span className="font-bold text-slate-900">"{deletingType.name}"</span>?
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setDeletingType(null)}
                className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                Ghairi
              </button>
              <button
                type="button"
                onClick={confirmDeleteType}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Futa Mchango
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: + ONGEZA MCHANGO MPYA / EDIT */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-black text-slate-900">
                {editingType ? 'Badilisha Mchango' : '+ Ongeza Mchango Mpya'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveContributionType} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Jina la Mchango (e.g. Gesi ya Maabara, Chakula, Remedial) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Gesi ya Maabara"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 bg-slate-50"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Kiasi cha Mchango (TZS) *
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  placeholder="5000"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl font-mono font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 bg-slate-50"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Muhula na Mwaka
                </label>
                <input
                  type="text"
                  placeholder="Term 1 / 2026"
                  value={formTerm}
                  onChange={(e) => setFormTerm(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl font-semibold text-slate-800 bg-slate-50"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Inahusu Madarasa Gani:
                </label>
                <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl max-h-40 overflow-y-auto">
                  {AVAILABLE_CLASS_LEVELS.map((cls) => {
                    const isChecked = formClasses.includes(cls);
                    return (
                      <label key={cls} className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            if (isChecked) {
                              setFormClasses(formClasses.filter(c => c !== cls));
                            } else {
                              setFormClasses([...formClasses, cls]);
                            }
                          }}
                          className="rounded text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className="text-[11px] font-semibold text-slate-700">{cls}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl font-bold cursor-pointer hover:bg-slate-100"
                >
                  Ghairi
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black cursor-pointer shadow-md"
                >
                  {editingType ? 'Hifadhi Mabadiliko' : '+ Hifadhi Mchango Mpya'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REKODI MALIPO YA MWANAFUNZI */}
      {paymentModalOpen && paymentTargetLedger && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-base font-black text-slate-900">Rekodi Malipo</h3>
                <span className="text-xs text-slate-500">{paymentTargetLedger.contribution_name}</span>
              </div>
              <button
                type="button"
                onClick={() => setPaymentModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Mwanafunzi:</span>
                <span className="font-bold text-slate-800">{paymentTargetLedger.student_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Kiasi Kinachotakiwa:</span>
                <span className="font-bold text-slate-800">TZS {Number(paymentTargetLedger.required_amount).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Kiasi Kilicholipwa:</span>
                <span className="font-bold text-emerald-700">TZS {Number(paymentTargetLedger.paid_amount || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-1">
                <span className="font-bold text-slate-700">Baki / Deni:</span>
                <span className="font-black text-rose-700">TZS {Number(paymentTargetLedger.balance).toLocaleString()}</span>
              </div>
            </div>

            <div className="space-y-1 text-xs">
              <label className="block font-bold text-slate-700">Kiasi Anacholipa Sasa (TZS) *</label>
              <input
                type="number"
                min="100"
                max={paymentTargetLedger.balance}
                placeholder={`Hadi TZS ${paymentTargetLedger.balance}`}
                value={paymentAmountInput}
                onChange={(e) => setPaymentAmountInput(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-xl font-mono font-black text-slate-900 bg-slate-50 text-sm focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setPaymentModalOpen(false)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl font-bold text-xs cursor-pointer hover:bg-slate-100"
              >
                Ghairi
              </button>
              <button
                type="button"
                onClick={handleRecordPayment}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs cursor-pointer shadow-md"
              >
                Pokea Malipo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
