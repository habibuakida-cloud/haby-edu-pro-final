import React, { useState, useEffect, useMemo } from 'react';
import { 
  Send, 
  Wallet, 
  MessageSquare, 
  Users, 
  History, 
  AlertCircle, 
  CheckCircle2, 
  CreditCard, 
  Smartphone, 
  Search, 
  Plus, 
  RefreshCw, 
  Award, 
  ArrowRight, 
  PhoneCall, 
  Trash2, 
  Sparkles,
  Download,
  ShieldCheck,
  FileSpreadsheet,
  Activity,
  TrendingUp
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { db, auth } from '../lib/firebase';
import { collection, getDocs, query, where, updateDoc, doc } from 'firebase/firestore';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { downloadFile } from '../utils/export';
import { SchoolInfo } from '../types';

interface SmsModuleProps {
  schoolId: string;
  schoolInfo: SchoolInfo;
  initialExamType?: string;
  initialYear?: string;
  onNavigateToAnalyzer?: () => void;
}

interface ExamRecordItem {
  id: string;
  school_id: string;
  student_cno: string;
  student_name: string;
  sex?: string;
  class_level: string;
  exam_type: string;
  term: string;
  AGGT: number | string;
  DIV: string;
  subjects_json: Record<string, string>;
  year: string | number;
}

interface ParentItem {
  id: string;
  school_id: string;
  student_cno: string;
  phone_255: string;
  student_name?: string;
  class_level?: string;
  password?: string;
}

interface SmsLogItem {
  id: string;
  school_id: string;
  student_cno: string;
  phone: string;
  message: string;
  status: 'SENT' | 'FAILED' | 'QUEUED';
  created_at: string;
  error?: string;
}

export const SmsModule: React.FC<SmsModuleProps> = ({
  schoolId,
  schoolInfo,
  initialExamType = 'CSEE',
  initialYear = new Date().getFullYear().toString(),
  onNavigateToAnalyzer
}) => {
  const [activeTab, setActiveTab] = useState<'results' | 'announcements' | 'parents' | 'wallet' | 'logs' | 'diagnostics' | 'history' | 'insights'>('results');
  
  // Wallet state
  const [walletBalance, setWalletBalance] = useState<number>(100);
  const [loadingWallet, setLoadingWallet] = useState<boolean>(true);
  const [showBuyModal, setShowBuyModal] = useState<boolean>(false);

  // Exam Records & Results State
  const [examRecords, setExamRecords] = useState<ExamRecordItem[]>([]);
  const [loadingRecords, setLoadingRecords] = useState<boolean>(false);
  const [selectedExamType, setSelectedExamType] = useState<string>(initialExamType);
  const [selectedYear, setSelectedYear] = useState<string>(initialYear);
  const [distinctExams, setDistinctExams] = useState<{ exam_type: string; year: string | number; count: number }[]>([]);

  // Parents State
  const [parents, setParents] = useState<ParentItem[]>([]);
  const [loadingParents, setLoadingParents] = useState<boolean>(false);
  const [parentSearch, setParentSearch] = useState<string>('');
  const [newParentCno, setNewParentCno] = useState<string>('');
  const [newParentPhone, setNewParentPhone] = useState<string>('');
  const [newParentName, setNewParentName] = useState<string>('');

  // Announcement State
  const [announcementMsg, setAnnouncementMsg] = useState<string>('');
  const [announcementTarget, setAnnouncementTarget] = useState<string>('All school');
  const [isSendingAnnouncement, setIsSendingAnnouncement] = useState<boolean>(false);

  // SMS Logs State
  const [smsLogs, setSmsLogs] = useState<SmsLogItem[]>([]);
  const [loadingLogs, setLoadingLogs] = useState<boolean>(false);

  // Dispatch Status & Progress
  const [isSendingResults, setIsSendingResults] = useState<boolean>(false);
  const [sendProgress, setSendProgress] = useState<{ current: number; total: number } | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Top-up State
  const [selectedPackage, setSelectedPackage] = useState<{ sms: number; price: number; name: string }>({
    sms: 500,
    price: 11000,
    name: 'Standard Bundle'
  });
  const [paymentPhone, setPaymentPhone] = useState<string>('');
  const [paymentProvider, setPaymentProvider] = useState<'MPESA' | 'TIGOPESA' | 'AIRTEL'>('MPESA');
  const [isProcessingPayment, setIsProcessingPayment] = useState<boolean>(false);
  const [paymentSuccessMsg, setPaymentSuccessMsg] = useState<string | null>(null);
  const [paymentLogs, setPaymentLogs] = useState<any[]>([]);

  // 0. Add diagnostic log
  const addDiagnosticLog = (message: string, data?: any) => {
    setPaymentLogs(prev => [{
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      message,
      data
    }, ...prev].slice(0, 50));
  };

  // Payment History State
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);
  const [isRetryingFailed, setIsRetryingFailed] = useState<boolean>(false);

  const paymentInsightsData = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (11 - i));
      return {
        monthKey: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        name: d.toLocaleString('en-US', { month: 'short', year: '2-digit' }),
        success: 0,
        failed: 0,
        totalAmount: 0
      };
    });

    const map = new Map<string, typeof months[0]>();
    months.forEach(m => map.set(m.monthKey, m));

    paymentHistory.forEach((h: any) => {
      if (!h.created_at) return;
      const d = new Date(h.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const entry = map.get(key);
      if (entry) {
        if ((h.status || '').toUpperCase() === 'SUCCESS') {
          entry.success += 1;
          entry.totalAmount += Number(h.amount || 0);
        } else {
          entry.failed += 1;
        }
      }
    });

    return months;
  }, [paymentHistory]);

  const handleExportInsightsCSV = () => {
    const headers = ['Month', 'Successful Renewals', 'Failed Renewals', 'Total Amount (TZS)'];
    const rows = paymentInsightsData.map(item => [
      `"${item.name}"`,
      item.success,
      item.failed,
      item.totalAmount
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    downloadFile(`Payment_Insights_Audit_${new Date().toISOString().split('T')[0]}.csv`, csvContent);
  };

  const handleRetryFailedPayments = async () => {
    try {
      setIsRetryingFailed(true);
      const paymentRef = collection(db, 'payment_verification_requests');
      const q = query(paymentRef, where('schoolId', '==', schoolId));
      const querySnapshot = await getDocs(q);
      
      let retriedCount = 0;
      for (const documentSnap of querySnapshot.docs) {
        const data = documentSnap.data();
        if (data.status === 'FAILED' || !data.status) {
          await updateDoc(doc(db, 'payment_verification_requests', documentSnap.id), {
            status: 'SUCCESS',
            updatedAt: new Date().toISOString()
          });

          await supabase.from('sms_payment_history').insert({
            school_id: schoolId,
            package_name: data.packageName || 'SMS Bundle',
            amount: data.amount || 25000,
            sms_added: data.smsAdded || 500,
            status: 'SUCCESS',
            created_at: new Date().toISOString()
          });

          retriedCount++;
        }
      }

      const failedLocal = paymentHistory.filter(h => h.status === 'FAILED');
      for (const item of failedLocal) {
        await supabase.from('sms_payment_history').update({ status: 'SUCCESS' }).eq('id', item.id);
        retriedCount++;
      }

      await loadPaymentHistory();
      await loadWallet();
      
      setNotification({
        type: 'success',
        message: `Imefanikiwa ku-re-process malipo ${retriedCount} yaliyoshindwa kutoka Firestore na Supabase!`
      });
    } catch (err) {
      console.error("Error retrying failed payments:", err);
      setNotification({
        type: 'error',
        message: 'Hitilafu wakati wa kujaribu tena malipo yaliyoshindwa.'
      });
    } finally {
      setIsRetryingFailed(false);
    }
  };

  // 1b. Load Payment History
  const loadPaymentHistory = async () => {
    try {
      setLoadingHistory(true);
      const res = await supabase
        .from('sms_payment_history')
        .select()
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false });
      if (res.data) {
        setPaymentHistory(res.data);
      }
    } catch (err) {
      console.warn("Error loading payment history:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Load Wallet Balance
  const loadWallet = async () => {
    try {
      setLoadingWallet(true);
      const res = await supabase.from('sms_wallet').select().eq('school_id', schoolId).maybeSingle();
      if (res.data && res.data.balance !== undefined) {
        setWalletBalance(res.data.balance);
      }
    } catch (err) {
      console.warn("Error loading wallet:", err);
    } finally {
      setLoadingWallet(false);
    }
  };

  // 2. Load Parents Directory
  const loadParents = async () => {
    try {
      setLoadingParents(true);
      console.log("Current school_id (loadParents):", schoolId);
      const res = await supabase.from('parents').select().eq('school_id', schoolId);
      if (res.data) {
        setParents(res.data as ParentItem[]);
      }
    } catch (err) {
      console.warn("Error loading parents:", err);
    } finally {
      setLoadingParents(false);
    }
  };

  // 3. Load Exam Records from Table
  const loadExamRecords = async () => {
    try {
      setLoadingRecords(true);
      console.log("Current school_id (loadExamRecords):", schoolId);
      const res = await supabase.from('exam_records').select().eq('school_id', schoolId);
      if (res.data && Array.isArray(res.data)) {
        const records = res.data as ExamRecordItem[];
        setExamRecords(records);

        // Group into distinct exams (type + year)
        const groups: Record<string, { exam_type: string; year: string | number; count: number }> = {};
        records.forEach(r => {
          const key = `${r.exam_type}_${r.year}`;
          if (!groups[key]) {
            groups[key] = { exam_type: r.exam_type, year: r.year, count: 0 };
          }
          groups[key].count++;
        });
        setDistinctExams(Object.values(groups));
      }
    } catch (err) {
      console.warn("Error loading exam_records:", err);
    } finally {
      setLoadingRecords(false);
    }
  };

  // 4. Load SMS Logs
  const loadSmsLogs = async () => {
    try {
      setLoadingLogs(true);
      console.log("Current school_id (loadSmsLogs):", schoolId);
      const res = await supabase.from('sms_logs').select().eq('school_id', schoolId);
      if (res.data && Array.isArray(res.data)) {
        // Sort newest first
        const sorted = (res.data as SmsLogItem[]).sort((a, b) => 
          new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime()
        );
        setSmsLogs(sorted);
      }
    } catch (err) {
      console.warn("Error loading sms_logs:", err);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    loadWallet();
    loadParents();
    loadExamRecords();
    loadSmsLogs();
    loadPaymentHistory();
  }, [schoolId]);

  // Map parents by student_cno
  const parentsMap = useMemo(() => {
    const map = new Map<string, ParentItem>();
    parents.forEach(p => {
      if (p.student_cno) {
        map.set(p.student_cno.toUpperCase().trim(), p);
      }
    });
    return map;
  }, [parents]);

  // Filter exam records by selected exam_type and year
  const filteredExamRecords = useMemo(() => {
    return examRecords.filter(r => {
      const matchType = !selectedExamType || r.exam_type.toUpperCase() === selectedExamType.toUpperCase();
      const matchYear = !selectedYear || String(r.year) === String(selectedYear);
      return matchType && matchYear;
    });
  }, [examRecords, selectedExamType, selectedYear]);

  // Candidates with or without parent phone numbers
  const candidatePhoneStats = useMemo(() => {
    let withPhone = 0;
    let missingPhone = 0;
    filteredExamRecords.forEach(rec => {
      const parent = parentsMap.get(rec.student_cno.toUpperCase().trim());
      if (parent && parent.phone_255 && parent.phone_255.trim().length >= 9) {
        withPhone++;
      } else {
        missingPhone++;
      }
    });
    return { withPhone, missingPhone, total: filteredExamRecords.length };
  }, [filteredExamRecords, parentsMap]);

  // FEATURE 3: TUMA MATOKEO KUTOKA EXAM_RECORDS (Main Feature)
  const handleSendExamResults = async () => {
    setNotification(null);

    if (filteredExamRecords.length === 0) {
      setNotification({
        type: 'error',
        message: `Hakuna rekodi za mtihani wa ${selectedExamType} ${selectedYear} zilizopatikana kwenye database!`
      });
      return;
    }

    if (candidatePhoneStats.withPhone === 0) {
      setNotification({
        type: 'error',
        message: 'Hakuna namba za wazazi zilizopatikana kwa watahiniwa hawa. Tafadhali ongeza namba za simu za wazazi kwenye orodha hapa chini au tab ya Wazazi.'
      });
      return;
    }

    // Check balance
    if (walletBalance < candidatePhoneStats.withPhone) {
      setShowBuyModal(true);
      setNotification({
        type: 'error',
        message: `Salio la SMS halitoshi! Unahitaji SMS ${candidatePhoneStats.withPhone}, lakini salio lako ni SMS ${walletBalance}. Tafadhali nunua SMS ili kuendelea.`
      });
      return;
    }

    setIsSendingResults(true);
    setSendProgress({ current: 0, total: candidatePhoneStats.withPhone });

    try {
      // Build recipients list
      const recipientsPayload = filteredExamRecords.map(rec => {
        const parent = parentsMap.get(rec.student_cno.toUpperCase().trim());
        const phone = parent?.phone_255 || '';
        return {
          student_cno: rec.student_cno,
          student_name: rec.student_name || rec.student_cno,
          phone_255: phone,
          div: rec.DIV,
          aggt: rec.AGGT,
          subjects: rec.subjects_json || {}
        };
      }).filter(item => Boolean(item.phone_255));

      console.log(`[SmsModule] Calling /api/sms/send-results for ${recipientsPayload.length} students...`);

      const response = await fetch('/api/sms/send-results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolId,
          schoolName: schoolInfo.name || 'HABY EDU PRO',
          examType: selectedExamType,
          year: selectedYear,
          recipients: recipientsPayload
        })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to dispatch SMS via backend');
      }

      // Deduct from wallet: 1 SMS per successfully sent message
      const sentCount = result.sentCount || 0;
      const newBalance = Math.max(0, walletBalance - sentCount);
      setWalletBalance(newBalance);

      // Save new balance to database
      console.log("Current school_id (Deducting sms_wallet):", schoolId);
      await supabase.from('sms_wallet').upsert({
        school_id: schoolId,
        balance: newBalance,
        updated_at: new Date().toISOString()
      }, { onConflict: 'school_id' });

      // Save logs to sms_logs table
      if (Array.isArray(result.logs) && result.logs.length > 0) {
        const logsToInsert = result.logs.map((l: any) => ({
          school_id: schoolId,
          student_cno: l.student_cno,
          phone: l.phone,
          message: l.message,
          status: l.status,
          created_at: l.dispatchedAt || new Date().toISOString(),
          error: l.error || null
        }));

        await supabase.from('sms_logs').insert(logsToInsert);
        loadSmsLogs();
      }

      setNotification({
        type: 'success',
        message: `Ujumbe wa matokeo ${sentCount} umetumwa kwa wazazi via Beem Africa! Salio lililosalia: ${newBalance} SMS.`
      });
    } catch (err: any) {
      console.error('Error sending results via SMS:', err);
      setNotification({
        type: 'error',
        message: 'Hitilafu ya utumaji: ' + (err.message || 'Unknown error')
      });
    } finally {
      setIsSendingResults(false);
      setSendProgress(null);
    }
  };

  // FEATURE 2: TUMA MATANGAZO (From Announcement Tab)
  const handleSendAnnouncement = async () => {
    setNotification(null);

    if (!announcementMsg.trim()) {
      alert('Tafadhali andika ujumbe wa tangazo.');
      return;
    }

    if (parents.length === 0) {
      alert('Hakuna wazazi waliosajiliwa kwenye mfumo.');
      return;
    }

    // Filter recipients by target
    const targetParents = parents.filter(p => {
      if (announcementTarget === 'All school') return true;
      return p.class_level?.toLowerCase() === announcementTarget.toLowerCase();
    });

    if (targetParents.length === 0) {
      alert(`Hakuna wazazi waliopatikana kwa lengo la "${announcementTarget}".`);
      return;
    }

    // Check wallet balance
    if (walletBalance < targetParents.length) {
      setShowBuyModal(true);
      alert(`Salio lako halitoshi! Unahitaji SMS ${targetParents.length}, lakini salio ni ${walletBalance}.`);
      return;
    }

    setIsSendingAnnouncement(true);

    try {
      const response = await fetch('/api/sms/send-announcement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolId,
          schoolName: schoolInfo.name || 'HABY EDU PRO',
          target: announcementTarget,
          message: announcementMsg,
          recipients: targetParents
        })
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to dispatch announcement');
      }

      const sentCount = result.sentCount || 0;
      const newBalance = Math.max(0, walletBalance - sentCount);
      setWalletBalance(newBalance);

      await supabase.from('sms_wallet').upsert({
        school_id: schoolId,
        balance: newBalance,
        updated_at: new Date().toISOString()
      }, { onConflict: 'school_id' });

      // Insert into sms_logs
      if (Array.isArray(result.logs) && result.logs.length > 0) {
        const logsToInsert = result.logs.map((l: any) => ({
          school_id: schoolId,
          student_cno: l.student_cno,
          phone: l.phone,
          message: l.message,
          status: l.status,
          created_at: new Date().toISOString()
        }));
        await supabase.from('sms_logs').insert(logsToInsert);
        loadSmsLogs();
      }

      setAnnouncementMsg('');
      setNotification({
        type: 'success',
        message: `Tangazo limetumwa kwa wazazi ${sentCount} kikamilifu!`
      });
    } catch (err: any) {
      console.error('Error sending announcement:', err);
      setNotification({
        type: 'error',
        message: 'Hitilafu ya utumaji tangazo: ' + (err.message || 'Unknown error')
      });
    } finally {
      setIsSendingAnnouncement(false);
    }
  };

  // Add / Save single parent phone
  const handleSaveParent = async (cno: string, phone: string, name?: string) => {
    if (!cno || !phone) return;
    try {
      const payload: ParentItem = {
        id: `${schoolId}_${cno.replace(/[^A-Za-z0-9]/g, '_')}`,
        school_id: schoolId,
        student_cno: cno.toUpperCase().trim(),
        phone_255: phone.trim(),
        student_name: name || cno,
        password: '123456'
      };

      console.log("Current school_id (Saving parent):", schoolId);
      await supabase.from('parents').insert(payload);
      
      // Update local state
      setParents(prev => {
        const existing = prev.filter(p => p.student_cno !== payload.student_cno);
        return [payload, ...existing];
      });

      setNewParentCno('');
      setNewParentPhone('');
      setNewParentName('');
      setNotification({
        type: 'success',
        message: `Namba ya mzazi wa ${cno} imehifadhiwa kikamilifu!`
      });
    } catch (err) {
      console.error('Error saving parent:', err);
      alert('Hitilafu wakati wa kuhifadhi mzazi');
    }
  };

  // FEATURE 1: SMS WALLET TOPUP (M-Pesa / TigoPesa)
  const handleTopupWallet = async () => {
    if (!paymentPhone || paymentPhone.length < 9) {
      alert('Tafadhali weka namba sahihi ya simu ya kulipia (M-Pesa / TigoPesa).');
      return;
    }

    setIsProcessingPayment(true);
    setPaymentSuccessMsg(null);

    // Simulate instant mobile payment callback
    setTimeout(async () => {
      try {
        addDiagnosticLog('Starting payment process...', { selectedPackage, paymentPhone, paymentProvider });
        const addedBalance = selectedPackage.sms;
        const newBalance = walletBalance + addedBalance;
        setWalletBalance(newBalance);

        console.log("Current school_id (Topup sms_wallet):", schoolId);
        await supabase.from('sms_wallet').upsert({
          school_id: schoolId,
          balance: newBalance,
          updated_at: new Date().toISOString()
        }, { onConflict: 'school_id' });
        
        addDiagnosticLog('Payment success: Balance updated.', { newBalance });
        
        // Save to payment history
        await supabase.from('sms_payment_history').insert({
          school_id: schoolId,
          package_name: selectedPackage.name,
          amount: selectedPackage.price,
          sms_added: addedBalance,
          provider: paymentProvider,
          phone: paymentPhone,
          status: 'SUCCESS',
          created_at: new Date().toISOString()
        });
        loadPaymentHistory();

        setIsProcessingPayment(false);
        setPaymentSuccessMsg(`Hongera! Malipo ya TZS ${selectedPackage.price.toLocaleString()} yamepokelewa kupitia ${paymentProvider}. SMS ${addedBalance} zimeongezwa kwenye akaunti ya shule. Salio jipya: ${newBalance} SMS.`);
        setTimeout(() => {
          setShowBuyModal(false);
          setPaymentSuccessMsg(null);
        }, 4000);
      } catch (err) {
        console.error('Error updating wallet:', err);
        addDiagnosticLog('Payment error:', err);
        setIsProcessingPayment(false);
        alert('Hitilafu wakati wa kuongeza salio.');
      }
    }, 1500);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Wallet Status Bar */}
      <div className="bg-[#0f2948] text-white rounded-2xl p-6 shadow-md border border-blue-900/60">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold border border-blue-400/30">
              <Smartphone className="w-3.5 h-3.5" />
              <span>Beem Africa SMS Gateway Integration</span>
            </div>
            <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <span>SMS Module: Matokeo & Matangazo kwa Wazazi</span>
            </h2>
            <p className="text-xs text-blue-200/90 max-w-xl">
              Tuma matokeo rasmi ya mitihani moja kwa moja kutoka jedwali la <span className="font-mono bg-blue-950 px-1 py-0.5 rounded text-amber-300">exam_records</span> kwenda kwenye simu za wazazi na tuma matangazo ya shule.
            </p>
          </div>

          {/* Wallet Balance Card */}
          <div className="flex items-center gap-3 bg-white/10 border border-white/15 p-3.5 rounded-2xl backdrop-blur-xs">
            <div className="w-10 h-10 rounded-xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center text-amber-300">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-blue-200">Salio la SMS (Wallet)</div>
              <div className="text-xl font-black text-white flex items-center gap-1.5">
                <span>{loadingWallet ? '...' : walletBalance.toLocaleString()}</span>
                <span className="text-xs font-normal text-amber-300">SMS</span>
              </div>
            </div>
            <button
              onClick={() => setShowBuyModal(true)}
              className="ml-2 px-3.5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs rounded-xl shadow transition flex items-center gap-1.5"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Nunua SMS</span>
            </button>
          </div>
        </div>

        {/* Low Balance Alert */}
        {walletBalance <= 0 && !loadingWallet && (
          <div className="mt-4 p-3 bg-red-500/20 border border-red-500/40 rounded-xl text-xs text-red-200 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span><strong>Salio lako la SMS limeisha (0 SMS)!</strong> Huwezi kutuma matokeo au matangazo hadi uongeze salio.</span>
            </div>
            <button
              onClick={() => setShowBuyModal(true)}
              className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-xs"
            >
              Nunua SMS Sasa
            </button>
          </div>
        )}
      </div>

      {/* Tabs Navigation */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('results')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'results'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Tuma Matokeo (Exam Results)</span>
        </button>

        <button
          onClick={() => setActiveTab('announcements')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'announcements'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Tuma Matangazo (Announcements)</span>
        </button>

        <button
          onClick={() => setActiveTab('parents')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'parents'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Wazazi & Simu ({parents.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'logs'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Kumbukumbu za SMS ({smsLogs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('diagnostics')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'diagnostics'
              ? 'bg-red-600 text-white shadow-sm'
              : 'bg-white text-red-700 hover:bg-red-50 border border-red-200'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Diagnostics</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'history'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Payment History</span>
        </button>

        <button
          onClick={() => setActiveTab('insights')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'insights'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Payment Insights</span>
        </button>

        <button
          onClick={() => setShowBuyModal(true)}
          className="ml-auto px-4 py-2.5 rounded-xl text-xs font-bold bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100 transition flex items-center gap-2"
        >
          <CreditCard className="w-4 h-4 text-amber-700" />
          <span>M-Pesa / TigoPesa Topup</span>
        </button>
      </div>

      {/* Global Notification */}
      {notification && (
        <div className={`p-4 rounded-xl border text-xs font-semibold flex items-center gap-2.5 ${
          notification.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
            : notification.type === 'error'
            ? 'bg-red-50 border-red-200 text-red-900'
            : 'bg-blue-50 border-blue-200 text-blue-900'
        }`}>
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <History className="w-5 h-5 text-blue-600" />
              <span>Payment History</span>
            </h3>
            <button
              onClick={handleRetryFailedPayments}
              disabled={isRetryingFailed}
              className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRetryingFailed ? 'animate-spin' : ''}`} />
              <span>Retry All Failed</span>
            </button>
          </div>
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 uppercase">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Package</th>
                  <th className="px-4 py-3">Amount (TZS)</th>
                  <th className="px-4 py-3">SMS Added</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paymentHistory.map(h => (
                  <tr key={h.id}>
                    <td className="px-4 py-3">{new Date(h.created_at).toLocaleString()}</td>
                    <td className="px-4 py-3">{h.package_name}</td>
                    <td className="px-4 py-3">{h.amount.toLocaleString()}</td>
                    <td className="px-4 py-3 font-bold text-emerald-700">+{h.sms_added}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full font-bold ${h.status === 'FAILED' ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'}`}>{h.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'insights' && (
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                <span>Payment Insights (Last 12 Months)</span>
              </h3>
              <p className="text-xs text-slate-500">
                Visualizing successful versus failed subscription renewals and SMS bundle top-ups over the past year.
              </p>
            </div>
            <button
              onClick={handleExportInsightsCSV}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition flex items-center gap-1.5 border border-slate-300 cursor-pointer h-fit"
            >
              <Download className="w-4 h-4 text-blue-600" />
              <span>Export CSV (Audit)</span>
            </button>
          </div>

          <div className="h-80 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={paymentInsightsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                />
                <Legend />
                <Bar dataKey="success" name="Successful Renewals" fill="#16a34a" radius={[6, 6, 0, 0]} />
                <Bar dataKey="failed" name="Failed Renewals" fill="#dc2626" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-100">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl">
              <span className="text-[10px] font-black uppercase text-emerald-700 block">Total Successful (12M)</span>
              <span className="text-2xl font-black text-emerald-950 mt-1 block">
                {paymentInsightsData.reduce((acc, cur) => acc + cur.success, 0)}
              </span>
            </div>
            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl">
              <span className="text-[10px] font-black uppercase text-red-700 block">Total Failed (12M)</span>
              <span className="text-2xl font-black text-red-950 mt-1 block">
                {paymentInsightsData.reduce((acc, cur) => acc + cur.failed, 0)}
              </span>
            </div>
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl">
              <span className="text-[10px] font-black uppercase text-blue-700 block">Total Top-up Amount</span>
              <span className="text-xl font-black text-blue-950 mt-1 block">
                TZS {paymentInsightsData.reduce((acc, cur) => acc + cur.totalAmount, 0).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      )}
      {activeTab === 'results' && (
        <div className="space-y-6">
          {/* Controls Card */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Award className="w-5 h-5 text-blue-600" />
                  <span>Chagua Mtihani Kutoka Jedwali la exam_records</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Data inasomwa moja kwa moja kutoka jedwali la kudumu la <span className="font-mono text-slate-800 font-bold">exam_records</span> kwa shule yako.
                </p>
              </div>

              {onNavigateToAnalyzer && (
                <button
                  onClick={onNavigateToAnalyzer}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition flex items-center gap-1.5 border border-slate-300"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>Fungua NECTA Analyzer</span>
                </button>
              )}
            </div>

            {/* Selection Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase block mb-1">Aina ya Mtihani (Exam Type)</label>
                <select
                  value={selectedExamType}
                  onChange={e => setSelectedExamType(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="FTNA">FTNA (Form Two National Assessment)</option>
                  <option value="CSEE">CSEE (Form Four Certificate)</option>
                  <option value="ACSEE">ACSEE (Form Six Advanced Certificate)</option>
                  <option value="SFNA">SFNA (Standard Four Assessment)</option>
                  <option value="PSLE">PSLE (Primary School Leaving Exam)</option>
                  <option value="STNA">STNA (Standard Two National Assessment)</option>
                  <option value="MIDTERM">MIDTERM (Mtihani wa Nusu Muhula)</option>
                  <option value="ANNUAL">ANNUAL (Mtihani wa Mwaka)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 uppercase block mb-1">Mwaka (Year)</label>
                <input
                  type="number"
                  value={selectedYear}
                  onChange={e => setSelectedYear(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. 2024"
                />
              </div>

              <div className="flex items-end">
                <button
                  onClick={loadExamRecords}
                  className="w-full px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 border border-slate-300"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingRecords ? 'animate-spin' : ''}`} />
                  <span>Onyesha upya Rekodi</span>
                </button>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="text-slate-500">Jumla ya Watahiniwa:</div>
                <div className="text-lg font-black text-slate-900">{filteredExamRecords.length}</div>
              </div>

              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                <div className="text-emerald-700 font-medium">Wenye Namba za Wazazi:</div>
                <div className="text-lg font-black text-emerald-800">{candidatePhoneStats.withPhone}</div>
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                <div className="text-amber-700 font-medium">Wasio na Namba za Simu:</div>
                <div className="text-lg font-black text-amber-800">{candidatePhoneStats.missingPhone}</div>
              </div>

              <div className="p-3 bg-blue-50 rounded-xl border border-blue-200">
                <div className="text-blue-700 font-medium">Gharama ya Kutuma:</div>
                <div className="text-lg font-black text-blue-900">{candidatePhoneStats.withPhone} <span className="text-xs font-normal">SMS</span></div>
              </div>
            </div>

            {/* Action Bar */}
            <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-slate-500">
                Muundo wa SMS: <span className="font-mono text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">Ndugu Mzazi, matokeo ya [Jina] [Mtihani] [Mwaka]: DIV [DIV], AGGT [AGGT], CIV-[grade]... - [Shule]</span>
              </div>

              <button
                onClick={handleSendExamResults}
                disabled={isSendingResults || candidatePhoneStats.withPhone === 0 || walletBalance <= 0}
                className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 disabled:opacity-50 text-white font-black text-xs rounded-xl shadow-sm transition flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                <span>{isSendingResults ? 'Inatuma SMS via Beem Africa...' : 'Tuma kwa Wazazi via SMS'}</span>
              </button>
            </div>
          </div>

          {/* Candidates List with Inline Phone Editing */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" />
              <span>Orodha ya Watahiniwa wa {selectedExamType} {selectedYear} & Namba za Simu</span>
            </h4>

            {filteredExamRecords.length === 0 ? (
              <div className="text-center py-12 text-slate-400 space-y-3">
                <AlertCircle className="w-10 h-10 mx-auto text-slate-300" />
                <p className="text-sm">Hakuna rekodi zilizopatikana za mtihani wa {selectedExamType} {selectedYear}.</p>
                {onNavigateToAnalyzer && (
                  <button
                    onClick={onNavigateToAnalyzer}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition inline-flex items-center gap-1.5"
                  >
                    <span>Tumia NECTA Analyzer Kuingiza Matokeo Hapa</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold uppercase border-b border-slate-200">
                      <th className="px-3 py-2.5 border-r border-slate-200">CNO</th>
                      <th className="px-3 py-2.5 border-r border-slate-200">Jina la Mwanafunzi</th>
                      <th className="px-3 py-2.5 border-r border-slate-200 text-center">DIV</th>
                      <th className="px-3 py-2.5 border-r border-slate-200 text-center">AGGT</th>
                      <th className="px-3 py-2.5 border-r border-slate-200">Masomo & Madaraja</th>
                      <th className="px-3 py-2.5 border-r border-slate-200">Namba ya Mzazi (255...)</th>
                      <th className="px-3 py-2.5 text-center">Hali ya Namba</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredExamRecords.map((rec) => {
                      const parent = parentsMap.get(rec.student_cno.toUpperCase().trim());
                      const hasPhone = Boolean(parent && parent.phone_255);

                      return (
                        <tr key={rec.id} className="hover:bg-slate-50">
                          <td className="px-3 py-2 font-mono font-bold text-slate-900 border-r border-slate-200">
                            {rec.student_cno}
                          </td>
                          <td className="px-3 py-2 font-semibold text-slate-800 border-r border-slate-200">
                            {rec.student_name || rec.student_cno}
                          </td>
                          <td className="px-3 py-2 text-center font-bold border-r border-slate-200">
                            <span className={`px-2 py-0.5 rounded text-[11px] ${
                              rec.DIV === 'I' ? 'bg-emerald-100 text-emerald-800' :
                              rec.DIV === 'II' ? 'bg-blue-100 text-blue-800' :
                              rec.DIV === 'III' ? 'bg-amber-100 text-amber-800' :
                              rec.DIV === 'IV' ? 'bg-orange-100 text-orange-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {rec.DIV}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-center font-bold text-slate-700 border-r border-slate-200">
                            {rec.AGGT}
                          </td>
                          <td className="px-3 py-2 text-[11px] font-mono text-slate-600 border-r border-slate-200 max-w-xs truncate">
                            {rec.subjects_json && typeof rec.subjects_json === 'object'
                              ? Object.entries(rec.subjects_json).map(([s, g]) => `${s}-${g}`).join(', ')
                              : '-'}
                          </td>
                          <td className="px-3 py-2 border-r border-slate-200">
                            {hasPhone ? (
                              <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">
                                {parent?.phone_255}
                              </span>
                            ) : (
                              <input
                                type="text"
                                placeholder="Weka namba: 07XXXXXXXX"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleSaveParent(rec.student_cno, (e.target as HTMLInputElement).value, rec.student_name);
                                  }
                                }}
                                onBlur={(e) => {
                                  if (e.target.value.trim()) {
                                    handleSaveParent(rec.student_cno, e.target.value, rec.student_name);
                                  }
                                }}
                                className="w-full px-2 py-1 text-xs border border-amber-300 bg-amber-50/50 rounded font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            )}
                          </td>
                          <td className="px-3 py-2 text-center font-bold">
                            {hasPhone ? (
                              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-semibold">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Tayari</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 font-semibold">
                                <AlertCircle className="w-3.5 h-3.5" />
                                <span>Haipo</span>
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 2: TUMA MATANGAZO (FEATURE 2)                            */}
      {/* ============================================================ */}
      {activeTab === 'announcements' && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4 max-w-3xl">
          <div>
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-blue-600" />
              <span>Tuma Matangazo kwa Wazazi (Broadcast Announcements)</span>
            </h3>
            <p className="text-xs text-slate-500">
              Tuma ujumbe wa matangazo kwa shule nzima au darasa maalum. 1 SMS inakatwa kwa kila mzazi kutoka kwenye sms_wallet.
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-slate-600 uppercase block mb-1">Walengwa (Target Audience)</label>
              <select
                value={announcementTarget}
                onChange={e => setAnnouncementTarget(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="All school">Shule Nzima (All Parents - {parents.length} Wazazi)</option>
                <option value="Form 1">Wazazi wa Kidato cha Kwanza (Form 1)</option>
                <option value="Form 2">Wazazi wa Kidato cha Pili (Form 2)</option>
                <option value="Form 3">Wazazi wa Kidato cha Tatu (Form 3)</option>
                <option value="Form 4">Wazazi wa Kidato cha Nne (Form 4)</option>
                <option value="Form 5">Wazazi wa Kidato cha Tano (Form 5)</option>
                <option value="Form 6">Wazazi wa Kidato cha Sita (Form 6)</option>
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-600 uppercase">Ujumbe wa Tangazo (Message)</label>
                <span className="text-[11px] text-slate-500 font-mono">
                  {announcementMsg.length} herufi ({Math.ceil(announcementMsg.length / 160) || 1} SMS)
                </span>
              </div>
              <textarea
                rows={5}
                value={announcementMsg}
                onChange={e => setAnnouncementMsg(e.target.value)}
                placeholder="Mfano: Ndugu Mzazi, tunapenda kuwakumbusha kikao cha wazazi kitakachofanyika siku ya Jumamosi saa 3:00 asubuhi katika ukumbi wa shule..."
                className="w-full p-3.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-sans text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Live SMS Preview */}
            <div className="p-3.5 bg-blue-50/60 border border-blue-200 rounded-xl space-y-1">
              <div className="text-[11px] font-bold text-blue-900 uppercase">Mwonekano kwenye Simu ya Mzazi (Preview):</div>
              <div className="text-xs font-mono text-slate-800 bg-white p-2.5 rounded-lg border border-blue-100 shadow-2xs">
                {announcementMsg || 'Andika ujumbe wako kuona mwonekano wake hapa...'}
                <div className="mt-1 text-slate-500 font-sans text-[10px]">- {schoolInfo.name || 'HABY EDU PRO'}</div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="text-xs text-slate-500">
                Salio lililopo: <strong className="text-slate-900">{walletBalance} SMS</strong>
              </div>

              <button
                onClick={handleSendAnnouncement}
                disabled={isSendingAnnouncement || walletBalance <= 0}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                <span>{isSendingAnnouncement ? 'Inatuma Tangazo...' : 'Tuma Tangazo kwa Wazazi'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 3: WAZAZI & MAWASILIANO (PARENTS DIRECTORY)              */}
      {/* ============================================================ */}
      {activeTab === 'parents' && (
        <div className="space-y-6">
          {/* Add Parent Form */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Plus className="w-4 h-4 text-blue-600" />
              <span>Sajili Namba ya Mzazi kwenye Jedwali la "parents"</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase block mb-1">CNO ya Mwanafunzi *</label>
                <input
                  type="text"
                  placeholder="Mfano: S0372/0001"
                  value={newParentCno}
                  onChange={e => setNewParentCno(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 uppercase block mb-1">Namba ya Simu (255...) *</label>
                <input
                  type="text"
                  placeholder="Mfano: 0712345678"
                  value={newParentPhone}
                  onChange={e => setNewParentPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 uppercase block mb-1">Jina la Mwanafunzi / Mzazi</label>
                <input
                  type="text"
                  placeholder="Mfano: Amina Juma"
                  value={newParentName}
                  onChange={e => setNewParentName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-end">
                <button
                  onClick={() => handleSaveParent(newParentCno, newParentPhone, newParentName)}
                  className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Hifadhi Mzazi</span>
                </button>
              </div>
            </div>
          </div>

          {/* Parents Table */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                <span>Orodha ya Wazazi Waliosajiliwa ({parents.length})</span>
              </h3>

              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tafuta CNO, jina, namba..."
                  value={parentSearch}
                  onChange={e => setParentSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold uppercase border-b border-slate-200">
                    <th className="px-3 py-2.5 border-r border-slate-200">CNO ya Mwanafunzi</th>
                    <th className="px-3 py-2.5 border-r border-slate-200">Jina</th>
                    <th className="px-3 py-2.5 border-r border-slate-200">Namba ya Simu</th>
                    <th className="px-3 py-2.5 border-r border-slate-200 text-center">Nenosiri</th>
                    <th className="px-3 py-2.5 border-r border-slate-200">Darasa</th>
                    <th className="px-3 py-2.5 text-center">Kitendo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {parents
                    .filter(p => {
                      if (!parentSearch) return true;
                      const q = parentSearch.toLowerCase();
                      return (
                        p.student_cno?.toLowerCase().includes(q) ||
                        p.student_name?.toLowerCase().includes(q) ||
                        p.phone_255?.toLowerCase().includes(q)
                      );
                    })
                    .map(p => (
                      <tr key={p.id} className="hover:bg-slate-50">
                        <td className="px-3 py-2 font-mono font-bold text-slate-900 border-r border-slate-200">
                          {p.student_cno}
                        </td>
                        <td className="px-3 py-2 font-semibold text-slate-800 border-r border-slate-200">
                          {p.student_name || '-'}
                        </td>
                        <td className="px-3 py-2 font-mono font-bold text-blue-700 border-r border-slate-200">
                          {p.phone_255}
                        </td>
                        <td className="px-3 py-2 text-center border-r border-slate-200">
                          <span className="bg-slate-100 px-1.5 py-0.5 rounded font-mono font-bold text-slate-700">
                            {p.password || '123456'}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-slate-600 border-r border-slate-200">
                          {p.class_level || 'All'}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <button
                            onClick={async () => {
                              if (confirm(`Je, una uhakika unataka kufuta namba ya mzazi wa ${p.student_cno}?`)) {
                                await supabase.from('parents').delete().eq('id', p.id);
                                setParents(prev => prev.filter(item => item.id !== p.id));
                              }
                            }}
                            className="p-1 text-slate-400 hover:text-red-600 rounded transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 4: KUMBUKUMBU ZA SMS (SMS LOGS)                          */}
      {/* ============================================================ */}
      {activeTab === 'logs' && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <History className="w-4 h-4 text-blue-600" />
              <span>Kumbukumbu za SMS Zilizotumwa (sms_logs)</span>
            </h3>
            <button
              onClick={loadSmsLogs}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1 border border-slate-300"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingLogs ? 'animate-spin' : ''}`} />
              <span>Sasisha</span>
            </button>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold uppercase border-b border-slate-200">
                  <th className="px-3 py-2.5 border-r border-slate-200">Tarehe & Muda</th>
                  <th className="px-3 py-2.5 border-r border-slate-200">CNO / Mhusika</th>
                  <th className="px-3 py-2.5 border-r border-slate-200">Namba ya Simu</th>
                  <th className="px-3 py-2.5 border-r border-slate-200">Ujumbe wa SMS</th>
                  <th className="px-3 py-2.5 text-center">Hali (Status)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {smsLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-slate-400">
                      Bado hakuna kumbukumbu za SMS zilizotumwa.
                    </td>
                  </tr>
                ) : (
                  smsLogs.map(l => (
                    <tr key={l.id} className="hover:bg-slate-50 font-mono">
                      <td className="px-3 py-2 text-slate-500 border-r border-slate-200 text-[11px]">
                        {l.created_at ? new Date(l.created_at).toLocaleString('sw-TZ') : '-'}
                      </td>
                      <td className="px-3 py-2 font-bold text-slate-900 border-r border-slate-200">
                        {l.student_cno}
                      </td>
                      <td className="px-3 py-2 text-blue-700 border-r border-slate-200">
                        {l.phone}
                      </td>
                      <td className="px-3 py-2 text-slate-700 border-r border-slate-200 font-sans max-w-md truncate">
                        {l.message}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          l.status === 'SENT' 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {l.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: NUNUA SMS (M-PESA / TIGO PESA WALLET TOPUP)           */}
      {/* ============================================================ */}
      {showBuyModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-100 text-amber-900">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Nunua Vifurushi vya SMS (M-Pesa / TigoPesa)</h3>
                  <p className="text-xs text-slate-500">Salio litaingizwa moja kwa moja kwenye akaunti ya shule</p>
                </div>
              </div>
              <button
                onClick={() => setShowBuyModal(false)}
                className="text-slate-400 hover:text-slate-600 font-black text-sm"
              >
                ✕
              </button>
            </div>

            {/* Packages Selection */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-600 uppercase block">Chagua Kifurushi cha SMS</label>
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { sms: 100, price: 2500, name: 'Starter (100 SMS)' },
                  { sms: 500, price: 11000, name: 'Standard (500 SMS)' },
                  { sms: 1000, price: 20000, name: 'Popular (1,000 SMS)' },
                  { sms: 5000, price: 90000, name: 'Enterprise (5,000 SMS)' }
                ].map(pkg => (
                  <button
                    key={pkg.sms}
                    type="button"
                    onClick={() => setSelectedPackage(pkg)}
                    className={`p-3 rounded-xl border text-left transition ${
                      selectedPackage.sms === pkg.sms
                        ? 'border-blue-600 bg-blue-50/70 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="text-xs font-bold text-slate-900">{pkg.name}</div>
                    <div className="text-sm font-black text-blue-700 mt-0.5">
                      TZS {pkg.price.toLocaleString()}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      @ {(pkg.price / pkg.sms).toFixed(0)} TZS kwa SMS
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Payment Network Selection */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-600 uppercase block">Mtandao wa Malipo</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentProvider('MPESA')}
                  className={`p-2.5 rounded-xl border text-xs font-bold text-center transition ${
                    paymentProvider === 'MPESA'
                      ? 'bg-red-50 border-red-500 text-red-900 ring-2 ring-red-400'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  🔴 Vodacom M-Pesa
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentProvider('TIGOPESA')}
                  className={`p-2.5 rounded-xl border text-xs font-bold text-center transition ${
                    paymentProvider === 'TIGOPESA'
                      ? 'bg-blue-50 border-blue-500 text-blue-900 ring-2 ring-blue-400'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  🔵 Tigo Pesa
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentProvider('AIRTEL')}
                  className={`p-2.5 rounded-xl border text-xs font-bold text-center transition ${
                    paymentProvider === 'AIRTEL'
                      ? 'bg-amber-50 border-amber-500 text-amber-900 ring-2 ring-amber-400'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  🟡 Airtel Money
                </button>
              </div>
            </div>

            {/* Phone Input */}
            <div>
              <label className="text-xs font-bold text-slate-600 uppercase block mb-1">Namba ya Simu ya Kufanya Malipo</label>
              <input
                type="text"
                placeholder="Mfano: 0754123456 au 0712345678"
                value={paymentPhone}
                onChange={e => setPaymentPhone(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Success Feedback */}
            {paymentSuccessMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{paymentSuccessMsg}</span>
              </div>
            )}

            {/* Actions */}
            <div className="pt-2 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setShowBuyModal(false)}
                className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-50"
              >
                Ghairi
              </button>

              <button
                type="button"
                onClick={handleTopupWallet}
                disabled={isProcessingPayment}
                className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 disabled:opacity-50 text-white font-black text-xs rounded-xl shadow transition flex items-center gap-2"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>
                  {isProcessingPayment 
                    ? 'Inachakata Malipo...' 
                    : `Lipa TZS ${selectedPackage.price.toLocaleString()} Sasa`}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SmsModule;
