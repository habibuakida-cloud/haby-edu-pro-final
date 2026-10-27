import React, { useState, useMemo, useRef } from 'react';
import {
  Users,
  UserPlus,
  BookOpen,
  CheckCircle2,
  Check,
  Save,
  Sparkles,
  FileSpreadsheet,
  Building2,
  Trash2,
  Edit3,
  Layers,
  ShieldCheck,
  AlertTriangle,
  Plus,
} from 'lucide-react';
import { JointExam, JointSchool } from './JointExamModuleView';
import {
  computeNectaGradeAndPoints,
  generateRealisticStudentName,
} from './jointExamGpaUtils';

export interface DraftJointStudentRow {
  id?: string;
  studentName: string;
  regNo: string;
  gender: string;
  stream: string;
  subjectMarks: Record<string, string>;
  registeredSubjects?: string[];
  expectedGrade?: string;
}

interface JointBulkRegistrationAndMarksProps {
  currentExam: JointExam;
  schools: JointSchool[];
  entrySchoolId: string;
  onSelectEntrySchool: (schoolId: string) => void;
  draftRows: DraftJointStudentRow[];
  setDraftRows: React.Dispatch<React.SetStateAction<DraftJointStudentRow[]>>;
  examSubjects: string[];
  isPrimary: boolean;
  saving: boolean;
  onSaveSchoolMarks: (customRows?: DraftJointStudentRow[]) => Promise<void>;
  onImportHostSchoolStudents: () => void;
  onOpenSchoolsTab: () => void;
}

export const JointBulkRegistrationAndMarks: React.FC<JointBulkRegistrationAndMarksProps> = ({
  currentExam,
  schools,
  entrySchoolId,
  onSelectEntrySchool,
  draftRows,
  setDraftRows,
  examSubjects,
  isPrimary,
  saving,
  onSaveSchoolMarks,
  onImportHostSchoolStudents,
  onOpenSchoolsTab,
}) => {
  // Sub-workflow mode:
  // 'SUBJECT_MARK_ENTRY' -> Mfumo wa Kuingiza Marks Kulingana na Usajili wa Wanafunzi Ki-Masomo (10 -> List 10, 100 -> List 100)
  // 'BULK_REGISTRATION'  -> Fomu ya Kusajili Multiple Student Each School & Usajili Ki-Masomo
  const [workflowMode, setWorkflowMode] = useState<'SUBJECT_MARK_ENTRY' | 'BULK_REGISTRATION'>(
    'SUBJECT_MARK_ENTRY'
  );

  const [selectedSubject, setSelectedSubject] = useState<string>(() => examSubjects[0] || 'KISWAHILI');
  const [customCountInput, setCustomCountInput] = useState<string>('10');
  const [showBulkPasteModal, setShowBulkPasteModal] = useState<boolean>(false);
  const [bulkPasteText, setBulkPasteText] = useState<string>('');
  const [showPasteMarksModal, setShowPasteMarksModal] = useState<boolean>(false);
  const [bulkMarksText, setBulkMarksText] = useState<string>('');

  const markInputRefs = useRef<Record<number, HTMLInputElement | null>>({});

  const activeSchool = useMemo(
    () => schools.find((s) => s.id === entrySchoolId) || schools[0] || null,
    [schools, entrySchoolId]
  );

  const activeSubject = useMemo(() => {
    if (examSubjects.includes(selectedSubject)) return selectedSubject;
    return examSubjects[0] || 'KISWAHILI';
  }, [examSubjects, selectedSubject]);

  // Helper to check if a draft row is registered for a given subject
  const isRowRegisteredForSubject = (row: DraftJointStudentRow, subj: string): boolean => {
    if (!row.registeredSubjects || row.registeredSubjects.length === 0) {
      return true; // Default: registered for all exam subjects
    }
    return row.registeredSubjects.some((s) => s.toUpperCase() === subj.toUpperCase());
  };

  // Count of students registered per subject in the active school
  const subjectRegistrationCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    const namedOrAllRows =
      draftRows.filter((r) => r.studentName.trim() !== '').length > 0
        ? draftRows.filter((r) => r.studentName.trim() !== '')
        : draftRows;

    for (const subj of examSubjects) {
      counts[subj] = namedOrAllRows.filter((r) => isRowRegisteredForSubject(r, subj)).length;
    }
    return counts;
  }, [draftRows, examSubjects]);

  // Filtered list of students registered for `activeSubject`
  // If 10 students are registered for this subject -> returns 10 students
  // If 100 students are registered for this subject -> returns 100 students
  const registeredStudentsForActiveSubject = useMemo(() => {
    return draftRows
      .map((row, originalIndex) => ({ row, originalIndex }))
      .filter(({ row }) => isRowRegisteredForSubject(row, activeSubject));
  }, [draftRows, activeSubject]);

  // Generate / ensure N students in the active school and optionally register exactly N students for `targetSubject`
  const handleGenerateMultipleStudentsList = (
    targetCount: number,
    forSpecificSubject?: string,
    autoFillNames = true
  ) => {
    const count = Math.max(1, Math.min(500, targetCount));
    const codePrefix =
      activeSchool?.schoolCode || (isPrimary ? 'PS0101' : 'S0101');

    setDraftRows((prev) => {
      // Keep existing named rows first
      const existingNamed = prev.filter((r) => r.studentName.trim() !== '');
      const nextRows: DraftJointStudentRow[] = [...existingNamed];

      // If we need more rows to reach `count`, generate them with sequential RegNos and realistic names
      while (nextRows.length < count) {
        const idx = nextRows.length;
        const gender: 'M' | 'F' = idx % 2 === 0 ? 'M' : 'F';
        const regNo = `${codePrefix}/${String(idx + 1).padStart(4, '0')}`;
        const studentName = autoFillNames
          ? generateRealisticStudentName(idx, gender)
          : '';
        nextRows.push({
          studentName,
          regNo,
          gender,
          stream: 'A',
          subjectMarks: {},
          registeredSubjects: [...examSubjects],
          expectedGrade: 'AUTO',
        });
      }

      // Also fill blank names in existing rows if autoFillNames is true
      const filledRows = nextRows.map((r, idx) => {
        const gender: 'M' | 'F' = r.gender === 'F' ? 'F' : 'M';
        return {
          ...r,
          regNo: r.regNo || `${codePrefix}/${String(idx + 1).padStart(4, '0')}`,
          studentName:
            r.studentName.trim() || (autoFillNames ? generateRealisticStudentName(idx, gender) : ''),
          registeredSubjects:
            Array.isArray(r.registeredSubjects) && r.registeredSubjects.length > 0
              ? r.registeredSubjects
              : [...examSubjects],
        };
      });

      // If a specific subject was targeted (e.g. "Toa List ya Wanafunzi 10" or "Toa List ya Wanafunzi 100" for `activeSubject`),
      // register the first `count` students for `forSpecificSubject` and unregister any rows beyond `count` for that subject
      // so the subject's registered list has EXACTLY `count` students!
      if (forSpecificSubject) {
        return filledRows.map((r, idx) => {
          const currentRegs = new Set(
            (r.registeredSubjects && r.registeredSubjects.length > 0
              ? r.registeredSubjects
              : examSubjects
            ).map((s) => s.toUpperCase())
          );
          if (idx < count) {
            currentRegs.add(forSpecificSubject.toUpperCase());
          } else {
            currentRegs.delete(forSpecificSubject.toUpperCase());
          }
          const updatedRegs = examSubjects.filter((s) => currentRegs.has(s.toUpperCase()));
          return {
            ...r,
            registeredSubjects: updatedRegs,
          };
        });
      }

      return filledRows;
    });
  };

  // Toggle subject registration for a single student row
  const handleToggleStudentSubject = (rowIndex: number, subject: string) => {
    setDraftRows((prev) =>
      prev.map((row, idx) => {
        if (idx !== rowIndex) return row;
        const currentList =
          row.registeredSubjects && row.registeredSubjects.length > 0
            ? row.registeredSubjects
            : [...examSubjects];
        const exists = currentList.some((s) => s.toUpperCase() === subject.toUpperCase());
        const nextList = exists
          ? currentList.filter((s) => s.toUpperCase() !== subject.toUpperCase())
          : [...currentList, subject];
        return {
          ...row,
          registeredSubjects: nextList,
        };
      })
    );
  };

  // Toggle a subject for ALL students in the school
  const handleToggleSubjectForAllStudents = (subject: string) => {
    setDraftRows((prev) => {
      const allHaveIt = prev.every((r) => isRowRegisteredForSubject(r, subject));
      return prev.map((r) => {
        const currentList =
          r.registeredSubjects && r.registeredSubjects.length > 0
            ? r.registeredSubjects
            : [...examSubjects];
        const nextList = allHaveIt
          ? currentList.filter((s) => s.toUpperCase() !== subject.toUpperCase())
          : Array.from(new Set([...currentList, subject]));
        return {
          ...r,
          registeredSubjects: nextList.length > 0 ? nextList : [examSubjects[0] || subject],
        };
      });
    });
  };

  // Bulk Paste Students (Names or CSV lines)
  const handleApplyBulkPasteStudents = () => {
    const lines = bulkPasteText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) return;

    const codePrefix = activeSchool?.schoolCode || (isPrimary ? 'PS0101' : 'S0101');

    setDraftRows((prev) => {
      const existingNamed = prev.filter((r) => r.studentName.trim() !== '');
      const startIdx = existingNamed.length;

      const newRows: DraftJointStudentRow[] = lines.map((line, i) => {
        const parts = line.split(/[\t,;]+/).map((p) => p.trim()).filter(Boolean);
        let regNo = `${codePrefix}/${String(startIdx + i + 1).padStart(4, '0')}`;
        let studentName = line;
        let gender = i % 2 === 0 ? 'M' : 'F';
        let stream = 'A';

        if (parts.length >= 2) {
          if (/\d/.test(parts[0]) && parts[0].length <= 15) {
            regNo = parts[0].toUpperCase();
            studentName = parts[1].toUpperCase();
            if (parts[2]) gender = parts[2].toUpperCase().startsWith('F') ? 'F' : 'M';
            if (parts[3]) stream = parts[3].toUpperCase();
          } else {
            studentName = parts[0].toUpperCase();
            if (parts[1]) gender = parts[1].toUpperCase().startsWith('F') ? 'F' : 'M';
            if (parts[2]) stream = parts[2].toUpperCase();
          }
        } else {
          studentName = studentName.toUpperCase();
        }

        return {
          studentName,
          regNo,
          gender,
          stream,
          subjectMarks: {},
          registeredSubjects: [...examSubjects],
          expectedGrade: 'AUTO',
        };
      });

      return [...existingNamed, ...newRows];
    });

    setBulkPasteText('');
    setShowBulkPasteModal(false);
  };

  // Bulk Paste Marks for `activeSubject` across the registered students list
  const handleApplyBulkPasteMarksForSubject = () => {
    const tokens = bulkMarksText
      .split(/[\r\n,\t;]+/)
      .map((t) => t.trim())
      .filter(Boolean);
    if (tokens.length === 0) return;

    const targetOriginalIndices = registeredStudentsForActiveSubject.map((item) => item.originalIndex);

    setDraftRows((prev) =>
      prev.map((row, idx) => {
        const posInSubjectList = targetOriginalIndices.indexOf(idx);
        if (posInSubjectList === -1 || posInSubjectList >= tokens.length) return row;
        return {
          ...row,
          subjectMarks: {
            ...row.subjectMarks,
            [activeSubject]: tokens[posInSubjectList],
          },
        };
      })
    );

    setBulkMarksText('');
    setShowPasteMarksModal(false);
  };

  // Auto-fill realistic marks for the active subject across all students registered for that subject
  const handleAutoFillSubjectMarksDemo = () => {
    setDraftRows((prev) =>
      prev.map((row, idx) => {
        if (!isRowRegisteredForSubject(row, activeSubject)) return row;
        const gender: 'M' | 'F' = row.gender === 'F' ? 'F' : 'M';
        const ensuredName =
          row.studentName.trim() || generateRealisticStudentName(idx, gender);
        // Deterministic realistic score between 42 and 94
        const score = 44 + ((idx * 17 + activeSubject.length * 11) % 51);
        return {
          ...row,
          studentName: ensuredName,
          subjectMarks: {
            ...row.subjectMarks,
            [activeSubject]: String(score),
          },
        };
      })
    );
  };

  return (
    <div className="space-y-5">
      {/* ===================================================================
          TOP WORKFLOW SWITCHER & SCHOOL SELECTOR BAR
         =================================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 block">
              MULTIPLE STUDENT REGISTRATION &amp; SUBJECT-BASED BULK MARK ENTRY
            </span>
            <h2 className="text-base sm:text-lg font-black text-slate-900">
              Usajili wa Wanafunzi Wengi Ki-Shule &amp; Uingizaji Alama Ki-Masomo
            </h2>
            <p className="text-xs text-slate-500">
              Sajili wanafunzi wengi kwa kila shule (mf. wanafunzi 10, 50, au 100) pamoja na masomo yao, kisha ingiza alama kulingana na orodha halisi ya waliosajiliwa kwenye kila somo.
            </p>
          </div>

          {/* 2-MODE SEGMENTED SWITCHER */}
          <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200 shrink-0">
            <button
              type="button"
              onClick={() => setWorkflowMode('SUBJECT_MARK_ENTRY')}
              className={`px-3.5 py-2 rounded-lg text-xs font-black flex items-center gap-1.5 transition cursor-pointer ${
                workflowMode === 'SUBJECT_MARK_ENTRY'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>1. Ingiza Marks Ki-Masomo (List ya 10 / 100)</span>
            </button>
            <button
              type="button"
              onClick={() => setWorkflowMode('BULK_REGISTRATION')}
              className={`px-3.5 py-2 rounded-lg text-xs font-black flex items-center gap-1.5 transition cursor-pointer ${
                workflowMode === 'BULK_REGISTRATION'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>2. Fomu ya Kusajili Multiple Students &amp; Masomo</span>
            </button>
          </div>
        </div>

        {/* PARTICIPATING SCHOOL PILLS */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase text-slate-700">
              Chagua Shule Husika (Select Participating School):
            </span>
            <button
              type="button"
              onClick={onOpenSchoolsTab}
              className="text-xs font-black text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Ongeza Shule Nyingine</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {schools.map((sch) => {
              const isSelected = sch.id === entrySchoolId;
              return (
                <button
                  key={sch.id}
                  type="button"
                  onClick={() => onSelectEntrySchool(sch.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition cursor-pointer border-2 ${
                    isSelected
                      ? 'text-white shadow-sm'
                      : 'bg-white text-slate-800 hover:bg-slate-50'
                  }`}
                  style={{
                    backgroundColor: isSelected ? sch.hexColor : '#ffffff',
                    borderColor: sch.hexColor,
                  }}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0 border border-white/60"
                    style={{ backgroundColor: isSelected ? '#ffffff' : sch.hexColor }}
                  />
                  <span>
                    {sch.schoolCode} — {sch.schoolName}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ===================================================================
          MODE 1: SUBJECT-BASED DYNAMIC STUDENT LIST & MULTIPLE MARK ENTRY
          ("Kama ni wanafunzi 10 basi toa list ya wanafunzi 10; kama ni 100 toa list ya 100")
         =================================================================== */}
      {workflowMode === 'SUBJECT_MARK_ENTRY' && activeSchool && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden space-y-0">
          {/* SUBJECT SELECTOR PILLS WITH REGISTERED COUNTS */}
          <div className="p-5 bg-slate-50 border-b border-slate-200 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 block">
                  HATUA YA 2: CHAGUA SOMO KUONA ORODHA YA WANAFUNZI WALIOSAJILIWA SOMO HILO
                </span>
                <h3 className="text-sm font-black text-slate-900">
                  Chagua Somo — Mfumo Unatoa Orodha Kulingana na Idadi ya Wanafunzi Waliosajiliwa Somo Hilo
                </h3>
              </div>
              <span className="text-xs font-bold text-slate-600">
                Shule: <strong className="text-slate-900">{activeSchool.schoolCode} — {activeSchool.schoolName}</strong>
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {examSubjects.map((subj) => {
                const isSubjActive = subj === activeSubject;
                const regCount = subjectRegistrationCounts[subj] ?? 0;
                return (
                  <button
                    key={subj}
                    type="button"
                    onClick={() => setSelectedSubject(subj)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-2 border-2 transition cursor-pointer ${
                      isSubjActive
                        ? 'bg-slate-900 border-slate-900 text-white shadow-sm'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-slate-400'
                    }`}
                  >
                    <BookOpen className="w-3.5 h-3.5 shrink-0" />
                    <span>{subj}</span>
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-black ${
                        isSubjActive
                          ? 'bg-emerald-500 text-slate-950'
                          : 'bg-slate-100 text-slate-800'
                      }`}
                    >
                      Wanafunzi {regCount}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* QUICK DYNAMIC LIST GENERATOR BAR (10 STUDENTS / 50 STUDENTS / 100 STUDENTS / CUSTOM N) */}
            <div className="p-3.5 rounded-xl bg-blue-50/90 border border-blue-200 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3">
              <div className="space-y-0.5">
                <span className="text-[10px] font-black uppercase text-blue-900 block">
                  USAJILI WA HARAKA WA IDADI YA WANAFUNZI WA SOMO LA {activeSubject} ({activeSchool.schoolName})
                </span>
                <p className="text-xs text-blue-950">
                  Kama somo la <strong>{activeSubject}</strong> lina wanafunzi <strong>10</strong> bonyeza{' '}
                  <strong>&ldquo;Toa List ya Wanafunzi 10&rdquo;</strong>; kama lina wanafunzi <strong>100</strong> bonyeza{' '}
                  <strong>&ldquo;Toa List ya Wanafunzi 100&rdquo;</strong> au weka idadi yoyote:
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleGenerateMultipleStudentsList(10, activeSubject, true)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black border transition cursor-pointer ${
                    registeredStudentsForActiveSubject.length === 10
                      ? 'bg-blue-700 border-blue-800 text-white shadow-2xs'
                      : 'bg-white hover:bg-blue-100 border-blue-300 text-blue-900'
                  }`}
                >
                  Toa List ya Wanafunzi 10
                </button>
                <button
                  type="button"
                  onClick={() => handleGenerateMultipleStudentsList(25, activeSubject, true)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black border transition cursor-pointer ${
                    registeredStudentsForActiveSubject.length === 25
                      ? 'bg-blue-700 border-blue-800 text-white shadow-2xs'
                      : 'bg-white hover:bg-blue-100 border-blue-300 text-blue-900'
                  }`}
                >
                  Toa List ya Wanafunzi 25
                </button>
                <button
                  type="button"
                  onClick={() => handleGenerateMultipleStudentsList(50, activeSubject, true)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black border transition cursor-pointer ${
                    registeredStudentsForActiveSubject.length === 50
                      ? 'bg-blue-700 border-blue-800 text-white shadow-2xs'
                      : 'bg-white hover:bg-blue-100 border-blue-300 text-blue-900'
                  }`}
                >
                  Toa List ya Wanafunzi 50
                </button>
                <button
                  type="button"
                  onClick={() => handleGenerateMultipleStudentsList(100, activeSubject, true)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black border transition cursor-pointer ${
                    registeredStudentsForActiveSubject.length === 100
                      ? 'bg-blue-700 border-blue-800 text-white shadow-2xs'
                      : 'bg-white hover:bg-blue-100 border-blue-300 text-blue-900'
                  }`}
                >
                  Toa List ya Wanafunzi 100
                </button>

                {/* Custom student count input */}
                <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-blue-300">
                  <input
                    type="number"
                    min={1}
                    max={500}
                    value={customCountInput}
                    onChange={(e) => setCustomCountInput(e.target.value)}
                    className="w-14 text-center font-mono text-xs font-black text-slate-900 focus:outline-hidden"
                    placeholder="Idadi"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const n = parseInt(customCountInput, 10);
                      if (!Number.isNaN(n) && n > 0) {
                        handleGenerateMultipleStudentsList(n, activeSubject, true);
                      }
                    }}
                    className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[11px] font-black cursor-pointer"
                  >
                    Toa List ({customCountInput || 0})
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* SUBJECT MARK ENTRY TABLE HEADER BANNER */}
          <div
            className="px-5 py-3.5 text-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
            style={{ backgroundColor: activeSchool.hexColor }}
          >
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-black/30 text-[10px] font-black uppercase">
                  SOMO: {activeSubject}
                </span>
                <span className="px-2 py-0.5 rounded bg-white text-slate-950 text-[10px] font-black uppercase font-mono">
                  ORODHA YA WANAFUNZI {registeredStudentsForActiveSubject.length} WALIOSAJILIWA
                </span>
              </div>
              <h4 className="text-sm font-black uppercase mt-1">
                Fomu ya Kuingiza Alama za {activeSubject} — {activeSchool.schoolCode} ({activeSchool.schoolName})
              </h4>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleAutoFillSubjectMarksDemo}
                className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg text-xs font-black flex items-center gap-1.5 cursor-pointer"
                title="Jaza alama za mfano kwa wanafunzi wote walio kwenye orodha hii"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Jaza Alama za Mfano ({registeredStudentsForActiveSubject.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setShowPasteMarksModal(true)}
                className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg text-xs font-black flex items-center gap-1.5 cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Bandika Alama (Paste Marks)</span>
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => onSaveSchoolMarks()}
                className="px-4 py-1.5 bg-white text-slate-950 hover:bg-slate-100 rounded-lg text-xs font-black flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5 text-emerald-700" />
                <span>
                  {saving
                    ? 'Inahifadhi...'
                    : `Hifadhi Alama za ${activeSubject} (${registeredStudentsForActiveSubject.length})`}
                </span>
              </button>
            </div>
          </div>

          {/* SUBJECT-FILTERED STUDENT LIST TABLE */}
          <div className="overflow-x-auto max-h-[560px] overflow-y-auto">
            <table className="w-full text-left border-collapse text-xs tabular-nums">
              <thead className="sticky top-0 z-10 bg-slate-100 border-b-2 border-slate-300 text-[11px] font-black text-slate-800 uppercase">
                <tr>
                  <th className="py-2.5 px-3 text-center w-12 border-r border-slate-200">#</th>
                  <th className="py-2.5 px-3 w-40 border-r border-slate-200">Namba ya Mtahiniwa</th>
                  <th className="py-2.5 px-3 min-w-[220px] border-r border-slate-200">
                    Jina Kamili la Mwanafunzi (Waliosajiliwa {activeSubject})
                  </th>
                  <th className="py-2.5 px-2 text-center w-20 border-r border-slate-200">Jinsia</th>
                  <th className="py-2.5 px-3 text-center w-44 bg-emerald-50 text-emerald-950 border-r border-slate-200">
                    Alama ya {activeSubject} (0–100)
                  </th>
                  <th className="py-2.5 px-3 text-center w-28 border-r border-slate-200">
                    Grade (NECTA)
                  </th>
                  <th className="py-2.5 px-3 text-center w-28 border-r border-slate-200">
                    Pointi (G.P.A)
                  </th>
                  <th className="py-2.5 px-3 text-center w-32">Hali (Status)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {registeredStudentsForActiveSubject.map(({ row, originalIndex }, listIdx) => {
                  const rawScore = row.subjectMarks[activeSubject] ?? '';
                  const numScore = rawScore !== '' ? Number(rawScore) : null;
                  const isOut =
                    numScore !== null && (Number.isNaN(numScore) || numScore < 0 || numScore > 100);
                  const gp =
                    numScore !== null && !isOut
                      ? computeNectaGradeAndPoints(numScore, isPrimary)
                      : null;

                  return (
                    <tr
                      key={row.id || originalIndex}
                      className={isOut ? 'bg-rose-50/60' : 'hover:bg-slate-50/80'}
                    >
                      <td className="py-2 px-3 text-center font-mono font-black text-slate-600 border-r border-slate-200">
                        {listIdx + 1}
                      </td>
                      <td className="py-2 px-2.5 border-r border-slate-200">
                        <input
                          type="text"
                          value={row.regNo}
                          onChange={(e) => {
                            const val = e.target.value;
                            setDraftRows((prev) =>
                              prev.map((it, i) => (i === originalIndex ? { ...it, regNo: val } : it))
                            );
                          }}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-mono text-xs font-bold text-slate-800"
                        />
                      </td>
                      <td className="py-2 px-2.5 border-r border-slate-200">
                        <input
                          type="text"
                          value={row.studentName}
                          onChange={(e) => {
                            const val = e.target.value;
                            setDraftRows((prev) =>
                              prev.map((it, i) =>
                                i === originalIndex ? { ...it, studentName: val } : it
                              )
                            );
                          }}
                          placeholder={`Jina la Mwanafunzi #${listIdx + 1}...`}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-bold text-slate-900 text-xs"
                        />
                      </td>
                      <td className="py-2 px-2 text-center border-r border-slate-200">
                        <select
                          value={row.gender}
                          onChange={(e) => {
                            const val = e.target.value;
                            setDraftRows((prev) =>
                              prev.map((it, i) =>
                                i === originalIndex ? { ...it, gender: val } : it
                              )
                            );
                          }}
                          className="px-2 py-1.5 rounded-lg border border-slate-300 text-xs font-bold"
                        >
                          <option value="M">M</option>
                          <option value="F">F</option>
                        </select>
                      </td>
                      <td className="py-2 px-3 bg-emerald-50/30 border-r border-slate-200">
                        <input
                          ref={(el) => {
                            markInputRefs.current[listIdx] = el;
                          }}
                          type="text"
                          inputMode="numeric"
                          value={rawScore}
                          placeholder="0 - 100"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === 'ArrowDown') {
                              e.preventDefault();
                              const nextInput = markInputRefs.current[listIdx + 1];
                              if (nextInput) {
                                nextInput.focus();
                                nextInput.select();
                              }
                            } else if (e.key === 'ArrowUp') {
                              e.preventDefault();
                              const prevInput = markInputRefs.current[listIdx - 1];
                              if (prevInput) {
                                prevInput.focus();
                                prevInput.select();
                              }
                            }
                          }}
                          onChange={(e) => {
                            const val = e.target.value;
                            setDraftRows((prev) =>
                              prev.map((it, i) =>
                                i === originalIndex
                                  ? {
                                      ...it,
                                      subjectMarks: {
                                        ...it.subjectMarks,
                                        [activeSubject]: val,
                                      },
                                    }
                                  : it
                              )
                            );
                          }}
                          className={`w-full px-3 py-1.5 text-center font-mono text-sm font-black rounded-lg border-2 focus:outline-hidden ${
                            isOut
                              ? 'border-rose-600 bg-rose-100 text-rose-950'
                              : rawScore !== ''
                              ? 'border-emerald-500 bg-white text-slate-950'
                              : 'border-slate-300 bg-white text-slate-900'
                          }`}
                        />
                      </td>
                      <td className="py-2 px-3 text-center border-r border-slate-200">
                        {isOut ? (
                          <span className="px-2 py-0.5 rounded bg-rose-600 text-white text-[10px] font-black">
                            ERR &gt;100
                          </span>
                        ) : gp ? (
                          <span
                            className={`px-2.5 py-0.5 rounded text-xs font-black ${
                              gp.grade === 'A'
                                ? 'bg-emerald-600 text-white'
                                : gp.grade === 'B'
                                ? 'bg-blue-600 text-white'
                                : gp.grade === 'C'
                                ? 'bg-amber-500 text-slate-950'
                                : gp.grade === 'D'
                                ? 'bg-orange-500 text-white'
                                : 'bg-rose-600 text-white'
                            }`}
                          >
                            Grade {gp.grade}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-center font-mono font-bold text-slate-700 border-r border-slate-200">
                        {gp ? `${gp.points} pt` : '-'}
                      </td>
                      <td className="py-2 px-3 text-center">
                        {isOut ? (
                          <span className="text-[10px] font-black text-rose-700">Rekebisha</span>
                        ) : gp ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-700">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Imejazwa</span>
                          </span>
                        ) : (
                          <span className="text-[11px] font-semibold text-slate-400">Bado</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===================================================================
          MODE 2: FOMU YA KUSAJILI MULTIPLE STUDENT EACH SCHOOL & MASOMO YAO
         =================================================================== */}
      {workflowMode === 'BULK_REGISTRATION' && activeSchool && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden space-y-0">
          <div className="p-5 bg-slate-50 border-b border-slate-200 space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 block">
                  FOMU YA KUSAJILI MULTIPLE STUDENTS KWA KILA SHULE (BULK STUDENT &amp; SUBJECT REGISTRATION)
                </span>
                <h3 className="text-base font-black text-slate-900">
                  Usajili wa Wanafunzi wa {activeSchool.schoolCode} — {activeSchool.schoolName} ({draftRows.length} Wanafunzi)
                </h3>
                <p className="text-xs text-slate-600">
                  Tengeneza orodha ya wanafunzi wengi kwa mpigo (10, 25, 50, 100+) na chagua masomo ambayo kila mwanafunzi amesajiliwa kufanya.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleGenerateMultipleStudentsList(10, undefined, true)}
                  className="px-3 py-2 bg-white hover:bg-blue-50 text-blue-900 border border-blue-300 rounded-xl text-xs font-black cursor-pointer"
                >
                  + Wanafunzi 10
                </button>
                <button
                  type="button"
                  onClick={() => handleGenerateMultipleStudentsList(50, undefined, true)}
                  className="px-3 py-2 bg-white hover:bg-blue-50 text-blue-900 border border-blue-300 rounded-xl text-xs font-black cursor-pointer"
                >
                  + Wanafunzi 50
                </button>
                <button
                  type="button"
                  onClick={() => handleGenerateMultipleStudentsList(100, undefined, true)}
                  className="px-3 py-2 bg-white hover:bg-blue-50 text-blue-900 border border-blue-300 rounded-xl text-xs font-black cursor-pointer"
                >
                  + Wanafunzi 100
                </button>
                <button
                  type="button"
                  onClick={() => setShowBulkPasteModal(true)}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Bandika Majina Mengi (Paste CSV/Excel)</span>
                </button>
                <button
                  type="button"
                  onClick={onImportHostSchoolStudents}
                  className="px-3.5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-black cursor-pointer"
                >
                  Pakia Kutoka Darasani
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => onSaveSchoolMarks()}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Hifadhi Usajili ({draftRows.length})</span>
                </button>
              </div>
            </div>
          </div>

          {/* STUDENT REGISTRATION & SUBJECT MATRIX TABLE */}
          <div className="overflow-x-auto max-h-[560px] overflow-y-auto">
            <table className="w-full text-left border-collapse text-xs tabular-nums">
              <thead className="sticky top-0 z-10 bg-slate-100 border-b-2 border-slate-300 text-[11px] font-black text-slate-800 uppercase">
                <tr>
                  <th className="py-2.5 px-2.5 text-center w-10 border-r border-slate-200">#</th>
                  <th className="py-2.5 px-2.5 w-36 border-r border-slate-200">Reg No</th>
                  <th className="py-2.5 px-2.5 min-w-[200px] border-r border-slate-200">
                    Jina Kamili la Mwanafunzi
                  </th>
                  <th className="py-2.5 px-2 text-center w-16 border-r border-slate-200">Sex</th>
                  {examSubjects.map((subj) => {
                    const count = subjectRegistrationCounts[subj] ?? 0;
                    return (
                      <th
                        key={subj}
                        className="py-2 px-2 text-center border-r border-slate-200 min-w-[92px]"
                      >
                        <button
                          type="button"
                          onClick={() => handleToggleSubjectForAllStudents(subj)}
                          className="w-full text-center hover:text-blue-700 cursor-pointer"
                          title={`Bonyeza kuwasajili au kuwaondoa wanafunzi wote kwenye somo la ${subj}`}
                        >
                          <span className="block truncate">{subj.slice(0, 10)}</span>
                          <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded bg-blue-100 text-blue-900 text-[9px] font-mono font-black">
                            Waliosajiliwa: {count}
                          </span>
                        </button>
                      </th>
                    );
                  })}
                  <th className="py-2.5 px-2 text-center w-14">Futa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {draftRows.map((row, rIdx) => (
                  <tr key={row.id || rIdx} className="hover:bg-slate-50">
                    <td className="py-1.5 px-2.5 text-center font-mono font-bold text-slate-500 border-r border-slate-200">
                      {rIdx + 1}
                    </td>
                    <td className="py-1.5 px-2 border-r border-slate-200">
                      <input
                        type="text"
                        value={row.regNo}
                        onChange={(e) => {
                          const val = e.target.value;
                          setDraftRows((prev) =>
                            prev.map((it, i) => (i === rIdx ? { ...it, regNo: val } : it))
                          );
                        }}
                        className="w-full px-2 py-1 rounded border border-slate-300 font-mono text-xs font-bold"
                      />
                    </td>
                    <td className="py-1.5 px-2 border-r border-slate-200">
                      <input
                        type="text"
                        value={row.studentName}
                        onChange={(e) => {
                          const val = e.target.value;
                          setDraftRows((prev) =>
                            prev.map((it, i) => (i === rIdx ? { ...it, studentName: val } : it))
                          );
                        }}
                        placeholder={`Jina la Mwanafunzi #${rIdx + 1}...`}
                        className="w-full px-2 py-1 rounded border border-slate-300 font-bold text-slate-900 text-xs"
                      />
                    </td>
                    <td className="py-1.5 px-1.5 text-center border-r border-slate-200">
                      <select
                        value={row.gender}
                        onChange={(e) => {
                          const val = e.target.value;
                          setDraftRows((prev) =>
                            prev.map((it, i) => (i === rIdx ? { ...it, gender: val } : it))
                          );
                        }}
                        className="px-1.5 py-1 rounded border border-slate-300 text-xs font-bold"
                      >
                        <option value="M">M</option>
                        <option value="F">F</option>
                      </select>
                    </td>
                    {examSubjects.map((subj) => {
                      const isReg = isRowRegisteredForSubject(row, subj);
                      return (
                        <td
                          key={subj}
                          className="py-1.5 px-2 text-center border-r border-slate-200"
                        >
                          <button
                            type="button"
                            onClick={() => handleToggleStudentSubject(rIdx, subj)}
                            className={`px-2 py-1 rounded-md text-[10px] font-black inline-flex items-center gap-1 transition cursor-pointer ${
                              isReg
                                ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                : 'bg-slate-100 text-slate-400 border border-slate-200'
                            }`}
                          >
                            {isReg ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-700" />
                                <span>Ndio</span>
                              </>
                            ) : (
                              <span>Hapana</span>
                            )}
                          </button>
                        </td>
                      );
                    })}
                    <td className="py-1.5 px-2 text-center">
                      <button
                        type="button"
                        onClick={() =>
                          setDraftRows((prev) => prev.filter((_, idx) => idx !== rIdx))
                        }
                        className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
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
      )}

      {/* MODAL: BULK PASTE MULTIPLE STUDENTS */}
      {showBulkPasteModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-sm font-black text-slate-900 uppercase">
                Bandika Orodha ya Wanafunzi Wengi ({activeSchool?.schoolName})
              </h3>
              <button
                type="button"
                onClick={() => setShowBulkPasteModal(false)}
                className="text-xs font-bold text-slate-500 hover:text-slate-900 cursor-pointer"
              >
                Funga (X)
              </button>
            </div>
            <p className="text-xs text-slate-600">
              Bandika majina ya wanafunzi (kila mwanafunzi kwenye mstari wake, mf. 10, 50, au 100). Unaweza kuweka jina pekee au <code>RegNo, Jina Kamili, Jinsia</code>:
            </p>
            <textarea
              rows={8}
              value={bulkPasteText}
              onChange={(e) => setBulkPasteText(e.target.value)}
              placeholder={`JUMA BAKARI MWAKASEGE, M\nNEEMA JOSEPH KILEO, F\nBARAKA ALLY MSUYA, M`}
              className="w-full p-3 rounded-xl border border-slate-300 font-mono text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowBulkPasteModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 cursor-pointer"
              >
                Ghairi
              </button>
              <button
                type="button"
                onClick={handleApplyBulkPasteStudents}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black cursor-pointer"
              >
                Ingiza Wanafunzi Kwenye Orodha
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: BULK PASTE MARKS FOR ACTIVE SUBJECT */}
      {showPasteMarksModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-sm font-black text-slate-900 uppercase">
                Bandika Alama za Somo la {activeSubject} ({registeredStudentsForActiveSubject.length} Wanafunzi)
              </h3>
              <button
                type="button"
                onClick={() => setShowPasteMarksModal(false)}
                className="text-xs font-bold text-slate-500 hover:text-slate-900 cursor-pointer"
              >
                Funga (X)
              </button>
            </div>
            <p className="text-xs text-slate-600">
              Bandika alama (0–100) kutoka Excel au zikiwa zimetenganishwa kwa mstari mpya au koma kwa mfuatano wa wanafunzi {registeredStudentsForActiveSubject.length} waliosajiliwa somo la <strong>{activeSubject}</strong>:
            </p>
            <textarea
              rows={8}
              value={bulkMarksText}
              onChange={(e) => setBulkMarksText(e.target.value)}
              placeholder={`84\n76\n91\n68\n72`}
              className="w-full p-3 rounded-xl border border-slate-300 font-mono text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowPasteMarksModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 cursor-pointer"
              >
                Ghairi
              </button>
              <button
                type="button"
                onClick={handleApplyBulkPasteMarksForSubject}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black cursor-pointer"
              >
                Jaza Alama Kwenye Orodha
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
