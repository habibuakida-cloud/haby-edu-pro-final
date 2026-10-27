import React, { useState, useMemo, useEffect } from 'react';
import { 
  FileEdit, 
  Plus, 
  Save, 
  Trash2, 
  CheckCircle2, 
  Award, 
  Search, 
  Printer, 
  Download, 
  FileSpreadsheet, 
  AlertCircle, 
  Sparkles, 
  BookOpen, 
  Clock, 
  BarChart2, 
  HelpCircle,
  Eye
} from 'lucide-react';
import { Student, Teacher, SchoolInfo, StreamSetting } from '../../types';

export interface PrivateTestRecord {
  id: string;
  testTitle: string; // e.g. "Weekly English Quiz 1"
  date: string;
  className: string;
  stream: string;
  subject: string;
  totalMarks: number;
  educationLevel: 'PRIMARY' | 'CSEE' | 'ACSEE'; // Primary, O-Level, A-Level
  studentScores: Record<number, number | string>; // studentId -> rawScore
  teacherNotes?: string;
  createdAt: string;
  updatedAt: string;
}

interface TeacherIndividualTestBankProps {
  currentTeacher: Teacher;
  students: Student[];
  schoolInfo: SchoolInfo;
  streamSettings?: StreamSetting[];
  selectedClass: string;
  selectedStream: string;
  selectedSubject: string;
  schoolId?: string;
}

// Grading Rule Calculators based on Education Level
export function calculateGradeAndRemark(
  score: number,
  totalMarks: number,
  level: 'PRIMARY' | 'CSEE' | 'ACSEE'
): { grade: string; remark: string; badgeBg: string; textCol: string } {
  if (totalMarks <= 0) return { grade: 'F', remark: 'Haitoshelezi', badgeBg: 'bg-rose-100', textCol: 'text-rose-800' };
  const percentage = (score / totalMarks) * 100;

  if (level === 'PRIMARY') {
    if (percentage >= 81) return { grade: 'A', remark: 'Bora Sana', badgeBg: 'bg-emerald-100', textCol: 'text-emerald-800' };
    if (percentage >= 61) return { grade: 'B', remark: 'Vizuri', badgeBg: 'bg-blue-100', textCol: 'text-blue-800' };
    if (percentage >= 41) return { grade: 'C', remark: 'Wastani', badgeBg: 'bg-amber-100', textCol: 'text-amber-800' };
    if (percentage >= 21) return { grade: 'D', remark: 'Dhaifu', badgeBg: 'bg-orange-100', textCol: 'text-orange-800' };
    return { grade: 'E', remark: 'Mbaya Sana', badgeBg: 'bg-rose-100', textCol: 'text-rose-800' };
  }

  if (level === 'ACSEE') { // A-Level Secondary (Form 5 - Form 6)
    if (percentage >= 80) return { grade: 'A', remark: 'Excellent', badgeBg: 'bg-emerald-100', textCol: 'text-emerald-800' };
    if (percentage >= 70) return { grade: 'B', remark: 'Very Good', badgeBg: 'bg-blue-100', textCol: 'text-blue-800' };
    if (percentage >= 60) return { grade: 'C', remark: 'Good', badgeBg: 'bg-cyan-100', textCol: 'text-cyan-800' };
    if (percentage >= 50) return { grade: 'D', remark: 'Average', badgeBg: 'bg-amber-100', textCol: 'text-amber-800' };
    if (percentage >= 40) return { grade: 'E', remark: 'Satisfactory', badgeBg: 'bg-orange-100', textCol: 'text-orange-800' };
    if (percentage >= 35) return { grade: 'S', remark: 'Subsidiary Pass', badgeBg: 'bg-purple-100', textCol: 'text-purple-800' };
    return { grade: 'F', remark: 'Fail', badgeBg: 'bg-rose-100', textCol: 'text-rose-800' };
  }

  // CSEE (Ordinary Secondary Form 1 - Form 4)
  if (percentage >= 75) return { grade: 'A', remark: 'Bora Sana (Excellent)', badgeBg: 'bg-emerald-100', textCol: 'text-emerald-800' };
  if (percentage >= 65) return { grade: 'B', remark: 'Vizuri Sana (Very Good)', badgeBg: 'bg-blue-100', textCol: 'text-blue-800' };
  if (percentage >= 45) return { grade: 'C', remark: 'Vizuri (Good)', badgeBg: 'bg-cyan-100', textCol: 'text-cyan-800' };
  if (percentage >= 30) return { grade: 'D', remark: 'Inaridhisha (Satisfactory)', badgeBg: 'bg-amber-100', textCol: 'text-amber-800' };
  return { grade: 'F', remark: 'Haitoshelezi (Fail)', badgeBg: 'bg-rose-100', textCol: 'text-rose-800' };
}

export const TeacherIndividualTestBank: React.FC<TeacherIndividualTestBankProps> = ({
  currentTeacher,
  students,
  schoolInfo,
  selectedClass,
  selectedStream,
  selectedSubject,
  schoolId = '02dff10d-78fb-4af6-ab5a-db1d275d7e06'
}) => {
  const storageKey = `haby_teacher_private_tests_${schoolId}_${currentTeacher?.id || 1}`;

  // Saved Private Tests List
  const [savedTests, setSavedTests] = useState<PrivateTestRecord[]>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.error("Error reading teacher private tests:", e);
    }
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(savedTests));
    } catch (e) {
      console.error("Error saving teacher private tests:", e);
    }
  }, [savedTests, storageKey]);

  // Active Selected / Editing Test
  const [activeTestId, setActiveTestId] = useState<string | null>(null);

  // Determine Level based on Class
  const computedLevel = useMemo<'PRIMARY' | 'CSEE' | 'ACSEE'>(() => {
    const cLower = selectedClass.toLowerCase();
    if (cLower.includes('form 5') || cLower.includes('form 6')) return 'ACSEE';
    if (cLower.includes('form') || cLower.includes('csee')) return 'CSEE';
    return 'PRIMARY';
  }, [selectedClass]);

  // Form State for creating a new test
  const [testTitle, setTestTitle] = useState('Weekly Continuous Assessment Quiz');
  const [testDate, setTestDate] = useState(new Date().toISOString().slice(0, 10));
  const [totalMarks, setTotalMarks] = useState<number>(50);
  const [educationLevel, setEducationLevel] = useState<'PRIMARY' | 'CSEE' | 'ACSEE'>(computedLevel);
  const [teacherNotes, setTeacherNotes] = useState('');
  const [scoresState, setScoresState] = useState<Record<number, number | string>>({});
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setEducationLevel(computedLevel);
  }, [computedLevel]);

  // Filter students for the active class and stream
  const classStudents = useMemo(() => {
    return students.filter(s => {
      const matchClass = (s.className || '').toLowerCase().trim() === selectedClass.toLowerCase().trim();
      const sStream = (s.stream || '').toLowerCase().trim().replace(/^stream\s+/i, '');
      const selStream = selectedStream.toLowerCase().trim().replace(/^stream\s+/i, '');
      const matchStream = !selectedStream || selectedStream === 'ALL' || sStream === selStream || sStream.includes(selStream);
      return matchClass && matchStream;
    });
  }, [students, selectedClass, selectedStream]);

  // Filter class students by search
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return classStudents;
    const q = searchQuery.toLowerCase().trim();
    return classStudents.filter(s => s.name.toLowerCase().includes(q) || s.regNo.toLowerCase().includes(q));
  }, [classStudents, searchQuery]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Create New Test Sheet
  const handleStartNewTest = () => {
    setActiveTestId(null);
    setTestTitle(`Test ya ${selectedSubject} - ${selectedClass} (${new Date().toLocaleDateString('sw-TZ')})`);
    setTestDate(new Date().toISOString().slice(0, 10));
    setTotalMarks(50);
    setTeacherNotes('');
    setScoresState({});
  };

  // Select an existing test to edit / view
  const handleSelectTest = (test: PrivateTestRecord) => {
    setActiveTestId(test.id);
    setTestTitle(test.testTitle);
    setTestDate(test.date);
    setTotalMarks(test.totalMarks);
    setEducationLevel(test.educationLevel || 'CSEE');
    setTeacherNotes(test.teacherNotes || '');
    setScoresState({ ...(test.studentScores || {}) });
  };

  // Save active test to teacher's private bank
  const handleSaveTest = () => {
    if (!testTitle.trim()) {
      alert('Tafadhali weka kichwa cha habari cha Test (Test Title).');
      return;
    }

    const testRecord: PrivateTestRecord = {
      id: activeTestId || `test_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      testTitle: testTitle.trim(),
      date: testDate,
      className: selectedClass,
      stream: selectedStream,
      subject: selectedSubject,
      totalMarks: Number(totalMarks) || 50,
      educationLevel,
      studentScores: scoresState,
      teacherNotes: teacherNotes.trim(),
      createdAt: activeTestId ? (savedTests.find(t => t.id === activeTestId)?.createdAt || new Date().toISOString()) : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (activeTestId) {
      setSavedTests(prev => prev.map(t => t.id === activeTestId ? testRecord : t));
    } else {
      setSavedTests(prev => [testRecord, ...prev]);
      setActiveTestId(testRecord.id);
    }

    showToast(`Test ya "${testTitle}" imehifadhiwa kwa mafanikio kwenye Bank ya Mwalimu!`);
  };

  // Delete test
  const handleDeleteTest = (id: string) => {
    if (window.confirm("Je, una uhakika unataka kufuta rekodi hii ya test?")) {
      setSavedTests(prev => prev.filter(t => t.id !== id));
      if (activeTestId === id) {
        handleStartNewTest();
      }
      showToast('Rekodi ya test imefutwa.');
    }
  };

  // Summary Metrics
  const metrics = useMemo(() => {
    const validScores: number[] = [];
    Object.values(scoresState).forEach(val => {
      const num = Number(val);
      if (!isNaN(num) && num >= 0) validScores.push(num);
    });

    const count = validScores.length;
    if (count === 0) return { totalStudents: classStudents.length, gradedCount: 0, avgPct: '0.0', maxScore: 0, minScore: 0, passRate: '0.0' };

    const sum = validScores.reduce((a, b) => a + b, 0);
    const avgScore = sum / count;
    const avgPct = ((avgScore / totalMarks) * 100).toFixed(1);
    const maxScore = Math.max(...validScores);
    const minScore = Math.min(...validScores);
    
    // Pass threshold = 30% for Secondary CSEE, 35% for A-Level, 41% for Primary
    const passMin = educationLevel === 'PRIMARY' ? totalMarks * 0.41 : educationLevel === 'ACSEE' ? totalMarks * 0.35 : totalMarks * 0.30;
    const passCount = validScores.filter(s => s >= passMin).length;
    const passRate = ((passCount / count) * 100).toFixed(1);

    return {
      totalStudents: classStudents.length,
      gradedCount: count,
      avgPct,
      maxScore,
      minScore,
      passRate
    };
  }, [scoresState, classStudents, totalMarks, educationLevel]);

  // Export Marksheet to CSV
  const handleExportCSV = () => {
    const headers = ['#', 'Namba ya Usajili', 'Jina la Mwanafunzi', 'Alama za Raw', 'Jumla ya Test', 'Asilimia (%)', 'Daraja (Grade)', 'Tathmini / Maelezo'];
    const rows = classStudents.map((st, idx) => {
      const score = Number(scoresState[st.id]);
      const hasScore = !isNaN(score) && score >= 0;
      const pct = hasScore ? ((score / totalMarks) * 100).toFixed(1) : '-';
      const evalRes = hasScore ? calculateGradeAndRemark(score, totalMarks, educationLevel) : { grade: '-', remark: 'Bila Alama' };

      return [
        idx + 1,
        `"${st.regNo || ''}"`,
        `"${st.name.replace(/"/g, '""')}"`,
        hasScore ? score : '-',
        totalMarks,
        pct,
        evalRes.grade,
        `"${evalRes.remark}"`
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Test_Binafsi_${selectedSubject}_${selectedClass}_${testDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white rounded-2xl p-6 shadow-md border border-indigo-800/40 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <span className="px-3 py-1 bg-amber-400 text-slate-950 text-[10px] font-black uppercase rounded-full tracking-wider flex items-center gap-1.5 w-fit">
              <Sparkles className="w-3.5 h-3.5" />
              RECORD SHEET YA MWALIMU • PRIVATE TEST BANK
            </span>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">
              Test Binafsi za Somo ({selectedSubject} - {selectedClass} {selectedStream})
            </h2>
            <p className="text-xs text-blue-200 font-medium max-w-xl">
              Rekodi alama za Test zako za darasani kwa ajili ya kufuatilia maendeleo ya kila mwanafunzi binafsi. Alama hizi zinakaa kwenye akiba yako ya mwalimu.
            </p>
          </div>

          <button
            type="button"
            onClick={handleStartNewTest}
            className="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl font-black text-xs flex items-center gap-2 shadow-lg transition cursor-pointer shrink-0 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Anzisha Test Mpya (New Test)</span>
          </button>
        </div>
      </div>

      {toastMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-950 font-bold text-xs rounded-xl flex items-center gap-2 shadow-xs animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Main Layout: Saved Tests Sidebar + Active Test Entry Sheet */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left Column: Saved Tests Bank List */}
        <div className="lg:col-span-1 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-indigo-600" />
              <span>Test Zilizohifadhiwa ({savedTests.length})</span>
            </h3>
          </div>

          {savedTests.length === 0 ? (
            <div className="p-6 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 space-y-2">
              <HelpCircle className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-xs text-slate-500 font-medium">
                Bado hujatengeneza Test binafsi. Bonyeza kitufe cha "Anzisha Test Mpya" kuanza.
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {savedTests.map(t => {
                const isActive = activeTestId === t.id;
                return (
                  <div
                    key={t.id}
                    onClick={() => handleSelectTest(t)}
                    className={`p-3 rounded-xl border transition cursor-pointer text-xs space-y-1 ${
                      isActive
                        ? 'bg-indigo-50 border-indigo-300 ring-2 ring-indigo-400/30 font-bold text-indigo-950'
                        : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold truncate text-slate-900">{t.testTitle}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTest(t.id);
                        }}
                        className="text-slate-400 hover:text-rose-600 p-1 transition cursor-pointer"
                        title="Futa Test Hii"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium">
                      <span>{t.className} {t.stream} • {t.subject}</span>
                      <span className="font-mono text-indigo-600 font-bold">{t.date}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Active Test Marks Sheet */}
        <div className="lg:col-span-3 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
          
          {/* Active Test Configuration Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">
                Kichwa cha Habari cha Test (Test Title):
              </label>
              <input
                type="text"
                value={testTitle}
                onChange={e => setTestTitle(e.target.value)}
                placeholder="k.m. Quiz ya Wiki ya 2"
                className="w-full px-3 py-2 text-xs font-bold bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">
                Tarehe ya Test (Date):
              </label>
              <input
                type="date"
                value={testDate}
                onChange={e => setTestDate(e.target.value)}
                className="w-full px-3 py-2 text-xs font-bold bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">
                Jumla ya Alama (Total Marks):
              </label>
              <input
                type="number"
                value={totalMarks}
                onChange={e => setTotalMarks(Math.max(1, Number(e.target.value)))}
                className="w-full px-3 py-2 text-xs font-bold bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">
                Kiwango cha Elimu (Grading Rules):
              </label>
              <select
                value={educationLevel}
                onChange={e => setEducationLevel(e.target.value as any)}
                className="w-full px-3 py-2 text-xs font-bold bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden cursor-pointer"
              >
                <option value="CSEE">Ordinary Secondary (Form 1 - 4: A 75%+)</option>
                <option value="ACSEE">A-Level Secondary (Form 5 - 6: A 80%+)</option>
                <option value="PRIMARY">Shule ya Msingi / Primary (Std 1 - 7: A 81%+)</option>
              </select>
            </div>
          </div>

          {/* Performance Summary Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-center space-y-0.5">
              <span className="text-[10px] uppercase font-bold text-blue-600 block">Wanafunzi Waliojazwa</span>
              <span className="text-base font-black text-blue-900">{metrics.gradedCount} / {metrics.totalStudents}</span>
            </div>
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-0.5">
              <span className="text-[10px] uppercase font-bold text-emerald-600 block">Wastani wa Asilimia</span>
              <span className="text-base font-black text-emerald-900">{metrics.avgPct}%</span>
            </div>
            <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-center space-y-0.5">
              <span className="text-[10px] uppercase font-bold text-purple-600 block">Kiwango cha Ufaulu</span>
              <span className="text-base font-black text-purple-900">{metrics.passRate}%</span>
            </div>
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-center space-y-0.5">
              <span className="text-[10px] uppercase font-bold text-amber-600 block">Highest / Lowest Score</span>
              <span className="text-base font-black text-amber-900">{metrics.maxScore} / {metrics.minScore}</span>
            </div>
          </div>

          {/* Action Bar & Search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Tafuta mwanafunzi..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleExportCSV}
                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-xs"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span className="hidden sm:inline">Export CSV</span>
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span className="hidden sm:inline">Chapa Test</span>
              </button>

              <button
                type="button"
                onClick={handleSaveTest}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl shadow-md transition cursor-pointer flex items-center gap-1.5 active:scale-95"
              >
                <Save className="w-4 h-4" />
                <span>Hifadhi Test (Save)</span>
              </button>
            </div>
          </div>

          {/* Students Marksheet Table */}
          {classStudents.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300 space-y-2">
              <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
              <h4 className="text-sm font-bold text-slate-800">Hakuna wanafunzi waliopatikana kwa {selectedClass} {selectedStream}</h4>
              <p className="text-xs text-slate-500">Chagua darasa lingine au usajili wanafunzi kwanza.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 font-black uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">#</th>
                    <th className="py-3 px-4">Jina Kamili la Mwanafunzi</th>
                    <th className="py-3 px-4">Namba ya Usajili</th>
                    <th className="py-3 px-4 text-center">Alama iliyopatkana (Out of {totalMarks})</th>
                    <th className="py-3 px-4 text-center">Asilimia (%)</th>
                    <th className="py-3 px-4 text-center">Daraja (Grade)</th>
                    <th className="py-3 px-4">Maelezo (Remark)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                  {filteredStudents.map((st, idx) => {
                    const rawVal = scoresState[st.id] !== undefined ? scoresState[st.id] : '';
                    const numVal = Number(rawVal);
                    const hasVal = rawVal !== '' && !isNaN(numVal) && numVal >= 0;
                    const pct = hasVal ? ((numVal / totalMarks) * 100).toFixed(1) : '-';
                    const evalRes = hasVal
                      ? calculateGradeAndRemark(numVal, totalMarks, educationLevel)
                      : { grade: '-', remark: 'Bado', badgeBg: 'bg-slate-100', textCol: 'text-slate-500' };

                    return (
                      <tr key={st.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 text-slate-400 font-bold">{idx + 1}</td>
                        <td className="py-3 px-4 font-bold text-slate-900 flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-black text-xs shrink-0">
                            {st.name.charAt(0)}
                          </div>
                          <span>{st.name}</span>
                        </td>
                        <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">{st.regNo || '-'}</td>
                        <td className="py-2 px-4 text-center">
                          <input
                            type="number"
                            min={0}
                            max={totalMarks}
                            value={rawVal}
                            onChange={e => {
                              const val = e.target.value;
                              setScoresState(prev => ({
                                ...prev,
                                [st.id]: val === '' ? '' : Math.min(totalMarks, Math.max(0, Number(val)))
                              }));
                            }}
                            placeholder={`0 - ${totalMarks}`}
                            className="w-24 px-2 py-1.5 text-center text-xs font-black bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:outline-hidden"
                          />
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-bold text-slate-700">
                          {pct !== '-' ? `${pct}%` : '-'}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2.5 py-1 rounded-full font-black text-xs border ${evalRes.badgeBg} ${evalRes.textCol}`}>
                            {evalRes.grade}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600 text-[11px] font-medium">
                          {evalRes.remark}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Teacher Remarks / Notes Box */}
          <div className="space-y-1.5 pt-2">
            <label className="block text-xs font-black uppercase text-slate-700">
              Maelezo au Muhtasari wa Mwalimu (Teacher Test Notes / Observations):
            </label>
            <textarea
              rows={2}
              value={teacherNotes}
              onChange={e => setTeacherNotes(e.target.value)}
              placeholder="Weka maelezo ya maeneo ya kurekebisha au mada zilizowasumbua wanafunzi..."
              className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
          </div>

        </div>
      </div>

    </div>
  );
};
