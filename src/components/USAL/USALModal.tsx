import React, { useState, useMemo } from 'react';
import { 
  X, 
  Lock, 
  Unlock, 
  Save, 
  FileSpreadsheet, 
  Printer, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  User, 
  BookOpen, 
  Award, 
  Eye,
  Filter,
  Search
} from 'lucide-react';
import { UsalRecord, UsalCandidateRecord, Student, Teacher, SchoolInfo, UserAccount, Exam } from '../../types';
import { getNectaPolicyForClass, getGradeForScore, calculateNectaLevelResults } from '../../utils/nectaRules';

interface USALModalProps {
  isOpen: boolean;
  onClose: () => void;
  usalRecords: UsalRecord[];
  onSaveUsalRecord: (record: UsalRecord) => void;
  onAutoSaveExaminationRecords?: (records: any[]) => void;
  students: Student[];
  teachers: Teacher[];
  schoolInfo: SchoolInfo;
  currentUser?: UserAccount | null;
  selectedExamName?: string;
}

export const USALModal: React.FC<USALModalProps> = ({
  isOpen,
  onClose,
  usalRecords = [],
  onSaveUsalRecord,
  onAutoSaveExaminationRecords,
  students,
  teachers,
  schoolInfo,
  currentUser,
  selectedExamName
}) => {
  // If teacher, default to their assigned USAL records
  const isTeacher = currentUser?.role === 'TEACHER';

  const accessibleRecords = useMemo(() => {
    if (!isTeacher) return usalRecords;
    const userEmail = currentUser?.email?.toLowerCase();
    const userName = currentUser?.fullName?.toLowerCase();
    const assignedSubs = (currentUser?.assignedSubjects || []).map(s => s.toLowerCase());

    return usalRecords.filter(r => {
      if (r.assignedTeacherId && currentUser?.id && String(r.assignedTeacherId) === String(currentUser.id)) return true;
      if (r.assignedTeacherName && userName && r.assignedTeacherName.toLowerCase().includes(userName)) return true;
      if (assignedSubs.length > 0 && assignedSubs.some(s => s === r.subject.toLowerCase() || r.subject.toLowerCase().includes(s))) return true;
      return false;
    });
  }, [usalRecords, isTeacher, currentUser]);

  const [selectedRecordId, setSelectedRecordId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'usal_sheet' | 'csee_cps'>('usal_sheet');
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Active USAL record
  const currentRecord = useMemo(() => {
    if (selectedRecordId) {
      const found = usalRecords.find(r => r.id === selectedRecordId);
      if (found) return found;
    }
    return accessibleRecords[0] || usalRecords[0] || null;
  }, [selectedRecordId, usalRecords, accessibleRecords]);

  // Local candidate marks editing state
  const [candidateScores, setCandidateScores] = useState<Record<number, { ca: number; exam: number }>>({});

  // Sync candidate scores when current record changes
  React.useEffect(() => {
    if (!currentRecord) return;
    const map: Record<number, { ca: number; exam: number }> = {};
    currentRecord.candidates.forEach(c => {
      map[c.studentId] = {
        ca: c.caMarks || 0,
        exam: c.examMarks || 0
      };
    });
    setCandidateScores(map);
  }, [currentRecord?.id]);

  if (!isOpen) return null;

  const policy = currentRecord ? getNectaPolicyForClass(currentRecord.className) : null;

  const handleScoreChange = (studentId: number, field: 'ca' | 'exam', value: string) => {
    if (currentRecord?.isSealed && isTeacher) {
      alert("This USAL ledger is SEALED. Marks cannot be edited without authorization.");
      return;
    }

    const num = Math.min(field === 'ca' ? 30 : 70, Math.max(0, Number(value) || 0));
    setCandidateScores(prev => ({
      ...prev,
      [studentId]: {
        ca: field === 'ca' ? num : (prev[studentId]?.ca ?? 0),
        exam: field === 'exam' ? num : (prev[studentId]?.exam ?? 0)
      }
    }));
  };

  const handleSaveMarks = () => {
    if (!currentRecord || !policy) return;

    const updatedCandidates: UsalCandidateRecord[] = currentRecord.candidates.map(c => {
      const s = candidateScores[c.studentId] || { ca: c.caMarks, exam: c.examMarks };
      const caMarks = s.ca;
      const examMarks = s.exam;
      const totalMarks = Math.min(100, Math.round(caMarks + examMarks));
      const gradeInfo = getGradeForScore(totalMarks, policy);

      return {
        ...c,
        caMarks,
        examMarks,
        totalMarks,
        grade: gradeInfo.grade as any,
        points: gradeInfo.points,
        remarks: gradeInfo.remark
      };
    });

    const updatedRecord: UsalRecord = {
      ...currentRecord,
      candidates: updatedCandidates,
      updatedAt: new Date().toISOString()
    };

    onSaveUsalRecord(updatedRecord);
    setToastMessage("USAL subject marks successfully saved to database!");
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleToggleSeal = () => {
    if (!currentRecord) return;

    if (currentRecord.isSealed) {
      if (window.confirm("Are you sure you want to UNSEAL this USAL mark sheet? This allows marks to be edited again.")) {
        const updated: UsalRecord = {
          ...currentRecord,
          isSealed: false,
          sealedAt: undefined,
          sealedBy: undefined,
          updatedAt: new Date().toISOString()
        };
        onSaveUsalRecord(updated);
        setToastMessage("USAL mark sheet UNSEALED for revision.");
        setTimeout(() => setToastMessage(null), 3000);
      }
    } else {
      if (window.confirm(`Are you sure you want to SEAL the USAL ledger for ${currentRecord.subject} (${currentRecord.className})? Sealing locks marks against unauthorized modification.`)) {
        // Save first then seal
        handleSaveMarks();
        const updated: UsalRecord = {
          ...currentRecord,
          isSealed: true,
          sealedAt: new Date().toISOString(),
          sealedBy: currentUser?.fullName || 'Subject Teacher',
          updatedAt: new Date().toISOString()
        };
        onSaveUsalRecord(updated);
        setToastMessage(`USAL ${currentRecord.subject} SEALED and locked.`);
        setTimeout(() => setToastMessage(null), 3000);
      }
    }
  };

  const filteredCandidates = (currentRecord?.candidates || []).filter(c => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return c.studentName.toLowerCase().includes(q) || c.regNo.toLowerCase().includes(q);
  });

  // Calculate CSEE / CPS Summary for all students in this class
  const classCandidatesForCPS = useMemo(() => {
    if (!currentRecord) return [];
    const targetClass = currentRecord.className;
    const matchingStudents = students.filter(s => s.className.toLowerCase() === targetClass.toLowerCase());

    return matchingStudents.map((st, idx) => {
      const res = calculateNectaLevelResults(st.marks || {}, targetClass);
      return {
        rank: idx + 1,
        student: st,
        ...res
      };
    }).sort((a, b) => (b.total || 0) - (a.total || 0)).map((item, idx) => ({
      ...item,
      position: idx + 1
    }));
  }, [currentRecord, students]);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in">
      <div className="bg-white rounded-2xl w-full max-w-6xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Top Header */}
        <div className="bg-gradient-to-r from-[#0f2948] via-[#1f4d8b] to-indigo-900 text-white p-5 flex flex-wrap items-center justify-between gap-4 border-b border-blue-900 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black shadow-md">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight">
                  USAL (Sealed Marksheet) & CSEE / CPS Module
                </h2>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  NECTA Standards
                </span>
              </div>
              <p className="text-xs text-blue-200 mt-0.5">
                Ujazaji wa Sampuli za Alama (Continuous Assessment & Sealed Marksheet) with CSEE / CPS Generation
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Sub-header Navigation & Controls */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
          {/* Tab Selection */}
          <div className="flex items-center gap-1.5 bg-slate-200/70 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab('usal_sheet')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'usal_sheet'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>USAL Subject Marksheet</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('csee_cps')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'csee_cps'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              <span>CSEE / CPS Official Summary</span>
            </button>
          </div>

          {/* USAL Selection Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              {isTeacher ? 'My Assigned USAL:' : 'Select USAL Ledger:'}
            </span>
            <select
              value={currentRecord?.id || ''}
              onChange={(e) => setSelectedRecordId(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs cursor-pointer"
            >
              {accessibleRecords.map(rec => (
                <option key={rec.id} value={rec.id}>
                  {rec.subject} &bull; {rec.className} ({rec.stream}) &bull; {rec.examName} {rec.isSealed ? '🔒 [SEALED]' : '✏️ [OPEN]'}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Toast Alert */}
        {toastMessage && (
          <div className="mx-6 mt-3 p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-900 font-bold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Main Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'usal_sheet' ? (
            /* TAB 1: USAL SUBJECT MARKSHEET */
            currentRecord ? (
              <div className="space-y-4">
                {/* Subject Ledger Information Bar */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px] font-bold uppercase">Subject</span>
                      <strong className="text-blue-900 font-black text-sm">{currentRecord.subject}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] font-bold uppercase">Class & Stream</span>
                      <strong className="text-slate-800 font-bold">{currentRecord.className} &bull; {currentRecord.stream}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] font-bold uppercase">Assigned Teacher</span>
                      <strong className="text-slate-800 font-bold">{currentRecord.assignedTeacherName || 'Not Assigned'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] font-bold uppercase">Ledger Status</span>
                      {currentRecord.isSealed ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-100 font-extrabold px-2 py-0.5 rounded text-[11px]">
                          <Lock className="w-3 h-3" />
                          <span>SEALED ({currentRecord.sealedBy || 'Teacher'})</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-100 font-extrabold px-2 py-0.5 rounded text-[11px]">
                          <Unlock className="w-3 h-3" />
                          <span>OPEN FOR ENTRY</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSaveMarks}
                      disabled={currentRecord.isSealed && isTeacher}
                      className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Save USAL Marks</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleToggleSeal}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs ${
                        currentRecord.isSealed
                          ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      }`}
                    >
                      {currentRecord.isSealed ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                      <span>{currentRecord.isSealed ? 'Unseal Ledger' : 'Seal USAL Ledger'}</span>
                    </button>
                  </div>
                </div>

                {/* Candidate Marks Table */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                  <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-xs text-slate-800 uppercase tracking-wider">
                        Enrolled Candidates ({currentRecord.candidates.length})
                      </span>
                    </div>
                    <div className="relative w-64">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search student..."
                        className="w-full pl-8 pr-3 py-1 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 outline-none"
                      />
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-[#1f4d8b] text-white uppercase text-[10px] tracking-wider">
                        <tr>
                          <th className="p-2.5 text-center w-12">#</th>
                          <th className="p-2.5">Candidate Name</th>
                          <th className="p-2.5">Reg Number</th>
                          <th className="p-2.5 text-center">Sex</th>
                          <th className="p-2.5 text-center w-28">CA (30%)</th>
                          <th className="p-2.5 text-center w-28">Exam (70%)</th>
                          <th className="p-2.5 text-center w-24">Total (100)</th>
                          <th className="p-2.5 text-center w-20">Grade</th>
                          <th className="p-2.5 text-center w-20">Points</th>
                          <th className="p-2.5">Remark</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                        {filteredCandidates.length === 0 ? (
                          <tr>
                            <td colSpan={10} className="p-8 text-center text-slate-400">
                              No candidates enrolled in this USAL subject ledger.
                            </td>
                          </tr>
                        ) : (
                          filteredCandidates.map((c, idx) => {
                            const scores = candidateScores[c.studentId] || { ca: c.caMarks, exam: c.examMarks };
                            const total = Math.min(100, Math.round(scores.ca + scores.exam));
                            const gradeInfo = policy ? getGradeForScore(total, policy) : { grade: 'F', points: 5, remark: 'Fail' };

                            return (
                              <tr key={c.studentId} className="hover:bg-blue-50/50 transition">
                                <td className="p-2.5 text-center text-slate-400 font-bold">{idx + 1}</td>
                                <td className="p-2.5 font-bold text-slate-900">{c.studentName}</td>
                                <td className="p-2.5 font-mono text-[11px] text-blue-800">{c.regNo}</td>
                                <td className="p-2.5 text-center font-bold">
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                                    c.gender === 'Female' ? 'bg-pink-100 text-pink-800' : 'bg-blue-100 text-blue-800'
                                  }`}>
                                    {c.gender === 'Female' ? 'F' : 'M'}
                                  </span>
                                </td>
                                <td className="p-2 text-center">
                                  <input
                                    type="number"
                                    min="0"
                                    max="30"
                                    value={scores.ca}
                                    disabled={currentRecord.isSealed && isTeacher}
                                    onChange={(e) => handleScoreChange(c.studentId, 'ca', e.target.value)}
                                    className="w-16 px-2 py-1 text-center font-black text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                  />
                                </td>
                                <td className="p-2 text-center">
                                  <input
                                    type="number"
                                    min="0"
                                    max="70"
                                    value={scores.exam}
                                    disabled={currentRecord.isSealed && isTeacher}
                                    onChange={(e) => handleScoreChange(c.studentId, 'exam', e.target.value)}
                                    className="w-16 px-2 py-1 text-center font-black text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                  />
                                </td>
                                <td className="p-2.5 text-center font-black text-sm text-[#1f4d8b]">
                                  {total}
                                </td>
                                <td className="p-2.5 text-center">
                                  <span className="px-2 py-0.5 rounded font-black text-xs bg-blue-100 text-blue-900">
                                    {gradeInfo.grade}
                                  </span>
                                </td>
                                <td className="p-2.5 text-center font-black text-xs text-slate-800">
                                  {gradeInfo.points}
                                </td>
                                <td className="p-2.5 text-slate-500 text-[11px] truncate max-w-xs">
                                  {gradeInfo.remark}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-12 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                <FileSpreadsheet className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                <p className="font-bold text-slate-600">No USAL records found for current criteria.</p>
                <p className="text-xs text-slate-400 mt-1">When an exam is registered, USAL mark sheets are automatically created for each subject.</p>
              </div>
            )
          ) : (
            /* TAB 2: CSEE / CPS OFFICIAL SUMMARY */
            <div className="space-y-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                    Official Candidate Performance Sheet (CPS) & CSEE Ledger
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Consolidated continuous assessment & examination ranking for {currentRecord?.className} {currentRecord?.stream}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-3.5 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print CPS Sheet</span>
                  </button>
                </div>
              </div>

              {/* Printable CPS Sheet */}
              <div id="csee-cps-printable-sheet" className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
                <div className="text-center border-b border-slate-200 pb-4">
                  <h4 className="text-xs font-black uppercase text-slate-500 tracking-wider">National Examinations Council of Tanzania (NECTA)</h4>
                  <h2 className="text-lg font-black text-[#1f4d8b] uppercase tracking-tight mt-0.5">
                    {schoolInfo.name} &bull; CTR: {schoolInfo.schoolNumber || 'S.1551'}
                  </h2>
                  <p className="text-xs font-bold text-slate-700 mt-1">
                    CANDIDATE PERFORMANCE SHEET (CPS) &bull; {currentRecord?.className} ({currentRecord?.stream}) &bull; {currentRecord?.examName}
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-[#1f4d8b] text-white uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="p-2.5 text-center w-12">Pos</th>
                        <th className="p-2.5">Candidate Name</th>
                        <th className="p-2.5">Reg Number</th>
                        <th className="p-2.5 text-center">Sex</th>
                        <th className="p-2.5 text-center">Total Marks</th>
                        <th className="p-2.5 text-center">Average %</th>
                        <th className="p-2.5 text-center">Grade</th>
                        <th className="p-2.5 text-center">Points</th>
                        <th className="p-2.5 text-center">Division</th>
                        <th className="p-2.5">Performance Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {classCandidatesForCPS.map(item => (
                        <tr key={item.student.id} className="hover:bg-slate-50">
                          <td className="p-2.5 text-center font-black text-[#1f4d8b]">#{item.position}</td>
                          <td className="p-2.5 font-bold text-slate-900">{item.student.name}</td>
                          <td className="p-2.5 font-mono text-[11px] text-blue-800">{item.student.regNo}</td>
                          <td className="p-2.5 text-center font-bold">
                            {item.student.gender === 'Female' ? 'F' : 'M'}
                          </td>
                          <td className="p-2.5 text-center font-bold">{item.total}</td>
                          <td className="p-2.5 text-center font-black text-amber-700">{item.average}%</td>
                          <td className="p-2.5 text-center">
                            <span className="px-2 py-0.5 rounded font-black text-xs bg-blue-100 text-blue-900">
                              {item.overallGrade}
                            </span>
                          </td>
                          <td className="p-2.5 text-center font-bold">{item.points ?? '-'}</td>
                          <td className="p-2.5 text-center font-black text-emerald-800">{item.division}</td>
                          <td className="p-2.5 text-[11px] text-slate-600">{item.remarks}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Signatures */}
                <div className="pt-6 grid grid-cols-2 sm:grid-cols-3 gap-6 text-xs text-slate-700 border-t border-slate-200">
                  <div>
                    <span className="text-slate-400 block text-[10px] font-bold uppercase">Subject Master / Mistress:</span>
                    <div className="h-8 border-b border-slate-300"></div>
                    <span className="text-[11px] font-bold text-slate-800 mt-1 block">Signature & Date</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] font-bold uppercase">Academic Master:</span>
                    <div className="h-8 border-b border-slate-300"></div>
                    <span className="text-[11px] font-bold text-slate-800 mt-1 block">Signature & Date</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] font-bold uppercase">Head of School:</span>
                    <div className="h-8 border-b border-slate-300"></div>
                    <span className="text-[11px] font-bold text-slate-800 mt-1 block">Official Stamp & Date</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
