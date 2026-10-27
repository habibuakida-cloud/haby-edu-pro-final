import React, { useState, useEffect, useMemo } from 'react';
import { 
  FileCheck, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Search, 
  Filter, 
  User, 
  Building, 
  Printer, 
  FileSpreadsheet, 
  RefreshCw, 
  Send, 
  PackageCheck, 
  ArrowRightLeft, 
  ShieldCheck, 
  AlertCircle,
  ChevronRight,
  Sparkles,
  Layers,
  Check,
  Calendar,
  Download
} from 'lucide-react';
import { Teacher, SchoolInfo, Student, ExaminationRecord } from '../../types';
import { SUBJECT_LIST, DEFAULT_CLASSES } from '../../constants/defaults';
import { getSchoolData, saveSchoolData } from '../../lib/dataService';
import { downloadFile, escapeCSV } from '../../utils/export';
import { ExamDispatchRecord, ExamSettingStatusRecord, ExamScriptMarkingRecord } from '../Invigilation/ExamControlLogForms';

interface ExamMaterialFlowDashboardProps {
  schoolId: string;
  teachers?: Teacher[];
  schoolInfo?: SchoolInfo;
  students?: Student[];
  examinationRecords?: ExaminationRecord[];
  onNavigateToInvigilation?: () => void;
}

export interface MaterialFlowItem {
  id: string;
  examName: string;
  className: string;
  stream?: string;
  subject: string;
  teacherName: string;
  
  // Paper Setting Status
  paperStatus: 'NOT_SET' | 'IN_PROGRESS' | 'SUBMITTED' | 'VETTED' | 'PRINTED_AND_SEALED';
  paperDeadline?: string;
  vettedBy?: string;
  
  // Dispatch Status (Exam Room)
  dispatchStatus: 'NOT_DISPATCHED' | 'CHECKED_OUT' | 'IN_EXAM_ROOM' | 'RETURNED';
  roomVenue?: string;
  invigilatorName?: string;
  
  // Script Status
  scriptStatus: 'PENDING_COLLECTION' | 'COLLECTED' | 'MISSING' | 'SENT_FOR_MARKING' | 'MARKING_COMPLETED';
  scriptsCount: number;
  expectedScriptsCount: number;
  markingDeadline?: string;
  markingTeacherName?: string;
  
  updatedAt: string;
}

export const ExamMaterialFlowDashboard: React.FC<ExamMaterialFlowDashboardProps> = ({
  schoolId,
  teachers = [],
  schoolInfo,
  students = [],
  examinationRecords = [],
  onNavigateToInvigilation
}) => {
  const [loading, setLoading] = useState(true);
  const [dispatchRecords, setDispatchRecords] = useState<ExamDispatchRecord[]>([]);
  const [settingRecords, setSettingRecords] = useState<ExamSettingStatusRecord[]>([]);
  const [scriptRecords, setScriptRecords] = useState<ExamScriptMarkingRecord[]>([]);

  // Filters
  const [selectedExam, setSelectedExam] = useState<string>('All');
  const [selectedClass, setSelectedClass] = useState<string>('All');
  const [selectedPaperStatus, setSelectedPaperStatus] = useState<string>('All');
  const [selectedScriptStatus, setSelectedScriptStatus] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  const [actionNotice, setActionNotice] = useState<{ type: 'success' | 'info' | 'warning'; msg: string } | null>(null);

  // Load records from local storage & backend
  useEffect(() => {
    loadControlData();
  }, [schoolId]);

  const loadControlData = async () => {
    setLoading(true);
    try {
      const localDisp = localStorage.getItem(`haby_exam_dispatch_${schoolId}`);
      const localSett = localStorage.getItem(`haby_exam_setting_${schoolId}`);
      const localScrp = localStorage.getItem(`haby_exam_scripts_${schoolId}`);

      let dRecs: ExamDispatchRecord[] = localDisp ? JSON.parse(localDisp) : [];
      let sRecs: ExamSettingStatusRecord[] = localSett ? JSON.parse(localSett) : [];
      let kRecs: ExamScriptMarkingRecord[] = localScrp ? JSON.parse(localScrp) : [];

      const schoolData = await getSchoolData(schoolId);
      if (schoolData) {
        if (Array.isArray(schoolData.examDispatchRecords) && schoolData.examDispatchRecords.length > 0) {
          dRecs = schoolData.examDispatchRecords;
        }
        if (Array.isArray(schoolData.examSettingRecords) && schoolData.examSettingRecords.length > 0) {
          sRecs = schoolData.examSettingRecords;
        }
        if (Array.isArray(schoolData.examScriptRecords) && schoolData.examScriptRecords.length > 0) {
          kRecs = schoolData.examScriptRecords;
        }
      }

      setDispatchRecords(dRecs);
      setSettingRecords(sRecs);
      setScriptRecords(kRecs);
    } catch (e) {
      console.error('Error loading exam material flow data:', e);
    } finally {
      setLoading(false);
    }
  };

  // Build Unified Material Flow Grid Items
  const flowItems = useMemo<MaterialFlowItem[]>(() => {
    // Collect unique subject & class combinations from existing logs + defaults
    const mapKey = (exam: string, cls: string, sub: string) => `${exam}___${cls}___${sub}`.toLowerCase();
    const itemMap = new Map<string, MaterialFlowItem>();

    // 1. Map Setting Records first
    settingRecords.forEach(s => {
      const key = mapKey(s.examName || 'Midterm 2026', s.className, s.subject);
      
      let paperSt = s.status || 'NOT_SET';
      
      itemMap.set(key, {
        id: s.id,
        examName: s.examName || 'Midterm 2026',
        className: s.className,
        subject: s.subject,
        teacherName: s.teacherName || 'Subject Teacher',
        paperStatus: paperSt,
        paperDeadline: s.deadlineDate,
        vettedBy: s.vettedBy,
        dispatchStatus: 'NOT_DISPATCHED',
        scriptStatus: 'PENDING_COLLECTION',
        scriptsCount: 0,
        expectedScriptsCount: 35,
        updatedAt: s.updatedAt || new Date().toISOString()
      });
    });

    // 2. Map Dispatch Records into itemMap
    dispatchRecords.forEach(d => {
      const key = mapKey(d.examName || 'Midterm 2026', d.className, d.subject);
      const existing = itemMap.get(key);

      let dStatus: MaterialFlowItem['dispatchStatus'] = 'NOT_DISPATCHED';
      if (d.status === 'CHECKED_OUT') dStatus = 'CHECKED_OUT';
      else if (d.status === 'IN_EXAM_ROOM') dStatus = 'IN_EXAM_ROOM';
      else if (d.status === 'RETURNED') dStatus = 'RETURNED';

      let sStatus: MaterialFlowItem['scriptStatus'] = 'PENDING_COLLECTION';
      if (d.status === 'RETURNED') {
        sStatus = d.scriptsReturnedCount && d.scriptsReturnedCount > 0 ? 'COLLECTED' : 'MISSING';
      }

      if (existing) {
        existing.dispatchStatus = dStatus;
        existing.roomVenue = d.roomVenue;
        existing.invigilatorName = d.invigilatorName;
        if (d.scriptsReturnedCount && d.scriptsReturnedCount > 0) {
          existing.scriptsCount = d.scriptsReturnedCount;
          existing.scriptStatus = 'COLLECTED';
        }
      } else {
        itemMap.set(key, {
          id: d.id,
          examName: d.examName || 'Midterm 2026',
          className: d.className,
          stream: d.stream,
          subject: d.subject,
          teacherName: d.invigilatorName || 'Invigilator',
          paperStatus: 'PRINTED_AND_SEALED',
          dispatchStatus: dStatus,
          roomVenue: d.roomVenue,
          invigilatorName: d.invigilatorName,
          scriptStatus: sStatus,
          scriptsCount: d.scriptsReturnedCount || 0,
          expectedScriptsCount: 35,
          updatedAt: d.updatedAt || new Date().toISOString()
        });
      }
    });

    // 3. Map Script Marking Records into itemMap
    scriptRecords.forEach(sc => {
      const key = mapKey(sc.examName || 'Midterm 2026', sc.className, sc.subject);
      const existing = itemMap.get(key);

      let scStatus: MaterialFlowItem['scriptStatus'] = 'SENT_FOR_MARKING';
      if (sc.status === 'COMPLETED_AND_RETURNED') scStatus = 'MARKING_COMPLETED';
      else if (sc.status === 'MARKING_IN_PROGRESS') scStatus = 'SENT_FOR_MARKING';
      else if (sc.status === 'CHECKED_OUT') scStatus = 'SENT_FOR_MARKING';

      if (existing) {
        existing.scriptStatus = scStatus;
        existing.scriptsCount = sc.scriptsCount || existing.scriptsCount;
        existing.markingTeacherName = sc.teacherName;
        existing.markingDeadline = sc.markingDeadline;
      } else {
        itemMap.set(key, {
          id: sc.id,
          examName: sc.examName || 'Midterm 2026',
          className: sc.className,
          stream: sc.stream,
          subject: sc.subject,
          teacherName: sc.teacherName || 'Subject Teacher',
          paperStatus: 'PRINTED_AND_SEALED',
          dispatchStatus: 'RETURNED',
          scriptStatus: scStatus,
          scriptsCount: sc.scriptsCount || 0,
          expectedScriptsCount: sc.scriptsCount || 35,
          markingTeacherName: sc.teacherName,
          markingDeadline: sc.markingDeadline,
          updatedAt: sc.updatedAt || new Date().toISOString()
        });
      }
    });

    // 4. If empty or missing subjects, auto-populate sample standard matrix from school subjects & classes
    if (itemMap.size === 0) {
      const examName = 'Midterm Examination 2026';
      const sampleClasses = ['Form 1', 'Form 2', 'Form 3', 'Form 4'];
      const sampleSubjects = ['Mathematics', 'English Language', 'Kiswahili', 'Biology', 'Chemistry', 'Physics'];

      sampleClasses.forEach((cls, cIdx) => {
        sampleSubjects.forEach((sub, sIdx) => {
          const key = mapKey(examName, cls, sub);
          const teacher = teachers[(cIdx + sIdx) % (teachers.length || 1)]?.name || `Mwalimu wa ${sub}`;
          
          let paperSt: MaterialFlowItem['paperStatus'] = 'PRINTED_AND_SEALED';
          let dispSt: MaterialFlowItem['dispatchStatus'] = 'RETURNED';
          let scriptSt: MaterialFlowItem['scriptStatus'] = 'COLLECTED';

          if (sIdx % 4 === 0) {
            paperSt = 'NOT_SET';
            dispSt = 'NOT_DISPATCHED';
            scriptSt = 'PENDING_COLLECTION';
          } else if (sIdx % 4 === 1) {
            paperSt = 'IN_PROGRESS';
            dispSt = 'NOT_DISPATCHED';
            scriptSt = 'PENDING_COLLECTION';
          } else if (sIdx % 4 === 2) {
            paperSt = 'VETTED';
            dispSt = 'CHECKED_OUT';
            scriptSt = 'PENDING_COLLECTION';
          } else {
            paperSt = 'PRINTED_AND_SEALED';
            dispSt = 'RETURNED';
            scriptSt = 'SENT_FOR_MARKING';
          }

          // Count expected students for class
          const clsStudentsCount = students.filter(st => st.className === cls).length || 38;

          itemMap.set(key, {
            id: `flow_auto_${cIdx}_${sIdx}`,
            examName,
            className: cls,
            subject: sub,
            teacherName: teacher,
            paperStatus: paperSt,
            paperDeadline: '2026-04-10',
            vettedBy: 'Academic Master',
            dispatchStatus: dispSt,
            roomVenue: `Hall ${cIdx + 1}`,
            invigilatorName: teacher,
            scriptStatus: scriptSt,
            scriptsCount: scriptSt === 'PENDING_COLLECTION' ? 0 : clsStudentsCount,
            expectedScriptsCount: clsStudentsCount,
            markingTeacherName: teacher,
            markingDeadline: '2026-04-18',
            updatedAt: new Date().toISOString()
          });
        });
      });
    }

    return Array.from(itemMap.values());
  }, [settingRecords, dispatchRecords, scriptRecords, teachers, students]);

  // Available Exams dropdown
  const availableExams = useMemo(() => {
    const set = new Set<string>();
    flowItems.forEach(i => set.add(i.examName));
    return Array.from(set);
  }, [flowItems]);

  // Filtered Flow Items
  const filteredItems = useMemo(() => {
    return flowItems.filter(item => {
      const matchExam = selectedExam === 'All' || item.examName === selectedExam;
      const matchClass = selectedClass === 'All' || item.className === selectedClass;
      
      let matchPaper = true;
      if (selectedPaperStatus !== 'All') {
        matchPaper = item.paperStatus === selectedPaperStatus;
      }

      let matchScript = true;
      if (selectedScriptStatus !== 'All') {
        matchScript = item.scriptStatus === selectedScriptStatus;
      }

      const matchSearch = !searchQuery.trim() || 
        item.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.className.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.teacherName.toLowerCase().includes(searchQuery.toLowerCase());

      return matchExam && matchClass && matchPaper && matchScript && matchSearch;
    });
  }, [flowItems, selectedExam, selectedClass, selectedPaperStatus, selectedScriptStatus, searchQuery]);

  // Stats Calculations
  const stats = useMemo(() => {
    const total = flowItems.length;
    
    // Paper stats
    const papersSet = flowItems.filter(i => i.paperStatus === 'PRINTED_AND_SEALED' || i.paperStatus === 'VETTED' || i.paperStatus === 'SUBMITTED').length;
    const papersNotSet = flowItems.filter(i => i.paperStatus === 'NOT_SET' || i.paperStatus === 'IN_PROGRESS').length;

    // Script stats
    const scriptsCollected = flowItems.filter(i => i.scriptStatus === 'COLLECTED' || i.scriptStatus === 'SENT_FOR_MARKING' || i.scriptStatus === 'MARKING_COMPLETED').length;
    const scriptsMissing = flowItems.filter(i => i.scriptStatus === 'MISSING').length;
    const scriptsSentForMarking = flowItems.filter(i => i.scriptStatus === 'SENT_FOR_MARKING').length;
    const scriptsCompleted = flowItems.filter(i => i.scriptStatus === 'MARKING_COMPLETED').length;

    return {
      total,
      papersSet,
      papersNotSet,
      scriptsCollected,
      scriptsMissing,
      scriptsSentForMarking,
      scriptsCompleted
    };
  }, [flowItems]);

  // Quick Action to simulate toggle paper setting status
  const handleQuickTogglePaperStatus = (item: MaterialFlowItem) => {
    const nextStatusMap: Record<MaterialFlowItem['paperStatus'], MaterialFlowItem['paperStatus']> = {
      'NOT_SET': 'IN_PROGRESS',
      'IN_PROGRESS': 'VETTED',
      'VETTED': 'PRINTED_AND_SEALED',
      'SUBMITTED': 'VETTED',
      'PRINTED_AND_SEALED': 'NOT_SET'
    };

    const nextSt = nextStatusMap[item.paperStatus] || 'PRINTED_AND_SEALED';
    
    // Update setting records
    const existingIdx = settingRecords.findIndex(r => r.subject.toLowerCase() === item.subject.toLowerCase() && r.className.toLowerCase() === item.className.toLowerCase());
    let updatedSett = [...settingRecords];
    if (existingIdx >= 0) {
      updatedSett[existingIdx] = {
        ...updatedSett[existingIdx],
        status: nextSt === 'PRINTED_AND_SEALED' ? 'PRINTED_AND_SEALED' : (nextSt === 'VETTED' ? 'VETTED' : (nextSt === 'IN_PROGRESS' ? 'IN_PROGRESS' : 'NOT_SET')),
        updatedAt: new Date().toISOString()
      };
    } else {
      updatedSett.push({
        id: `sett_${Date.now()}`,
        examName: item.examName,
        term: 'Term 1',
        subject: item.subject,
        className: item.className,
        teacherName: item.teacherName,
        deadlineDate: item.paperDeadline || new Date().toISOString().split('T')[0],
        status: nextSt === 'PRINTED_AND_SEALED' ? 'PRINTED_AND_SEALED' : (nextSt === 'VETTED' ? 'VETTED' : (nextSt === 'IN_PROGRESS' ? 'IN_PROGRESS' : 'NOT_SET')),
        updatedAt: new Date().toISOString()
      });
    }

    setSettingRecords(updatedSett);
    localStorage.setItem(`haby_exam_setting_${schoolId}`, JSON.stringify(updatedSett));

    setActionNotice({
      type: 'success',
      msg: `Hali ya karatasi ya ${item.subject} (${item.className}) imesasishwa kuwa: ${nextSt}`
    });

    setTimeout(() => setActionNotice(null), 3000);
  };

  // Handler to update teacher when multiple teachers are registered (Requirement 2)
  const handleUpdateTeacherForPaper = (item: MaterialFlowItem, newTeacherName: string) => {
    const existingIdx = settingRecords.findIndex(r => r.subject.toLowerCase() === item.subject.toLowerCase() && r.className.toLowerCase() === item.className.toLowerCase());
    let updatedSett = [...settingRecords];

    if (existingIdx >= 0) {
      updatedSett[existingIdx] = {
        ...updatedSett[existingIdx],
        teacherName: newTeacherName,
        updatedAt: new Date().toISOString()
      };
    } else {
      updatedSett.push({
        id: `sett_${Date.now()}`,
        examName: item.examName,
        term: 'Term 1',
        subject: item.subject,
        className: item.className,
        teacherName: newTeacherName,
        deadlineDate: item.paperDeadline || new Date().toISOString().split('T')[0],
        status: item.paperStatus === 'PRINTED_AND_SEALED' ? 'PRINTED_AND_SEALED' : (item.paperStatus === 'VETTED' ? 'VETTED' : 'IN_PROGRESS'),
        updatedAt: new Date().toISOString()
      });
    }

    setSettingRecords(updatedSett);
    localStorage.setItem(`haby_exam_setting_${schoolId}`, JSON.stringify(updatedSett));
    saveSchoolData(schoolId, { examSettingRecords: updatedSett }).catch(e => console.warn('DataService sync error:', e));

    setActionNotice({
      type: 'success',
      msg: `Mwalimu mhusika wa somo la ${item.subject} (${item.className}) amebadilishwa kuwa: ${newTeacherName}`
    });
    setTimeout(() => setActionNotice(null), 3000);
  };

  // Direct toggle for Exam Paper Set / Not Set via Checkbox
  const handleDirectSetPaperStatus = (item: MaterialFlowItem, isSet: boolean) => {
    const nextSt: MaterialFlowItem['paperStatus'] = isSet ? 'PRINTED_AND_SEALED' : 'NOT_SET';
    const existingIdx = settingRecords.findIndex(r => r.subject.toLowerCase() === item.subject.toLowerCase() && r.className.toLowerCase() === item.className.toLowerCase());
    let updatedSett = [...settingRecords];
    if (existingIdx >= 0) {
      updatedSett[existingIdx] = {
        ...updatedSett[existingIdx],
        status: nextSt,
        updatedAt: new Date().toISOString()
      };
    } else {
      updatedSett.push({
        id: `sett_${Date.now()}`,
        examName: item.examName,
        term: 'Term 1',
        subject: item.subject,
        className: item.className,
        teacherName: item.teacherName,
        deadlineDate: item.paperDeadline || new Date().toISOString().split('T')[0],
        status: nextSt,
        updatedAt: new Date().toISOString()
      });
    }

    setSettingRecords(updatedSett);
    localStorage.setItem(`haby_exam_setting_${schoolId}`, JSON.stringify(updatedSett));

    // Persist updates to data service / backend
    saveSchoolData(schoolId, { examSettingRecords: updatedSett }).catch(e => console.warn('DataService sync error:', e));

    setActionNotice({
      type: isSet ? 'success' : 'warning',
      msg: `Mtihani wa ${item.subject} (${item.className}) umewasilishwa kama: ${isSet ? 'SET' : 'NOT SET'}`
    });

    setTimeout(() => setActionNotice(null), 3000);
  };

  // Direct toggle for Script Status (Collected / Missing / Sent for Marking)
  const handleDirectSetScriptStatus = (item: MaterialFlowItem, targetStatus: 'COLLECTED' | 'MISSING' | 'SENT_FOR_MARKING' | 'MARKING_COMPLETED') => {
    const existingIdx = scriptRecords.findIndex(r => r.subject.toLowerCase() === item.subject.toLowerCase() && r.className.toLowerCase() === item.className.toLowerCase());
    let updatedScrp = [...scriptRecords];

    let backendStatus: ExamScriptMarkingRecord['status'] = 'CHECKED_OUT';
    if (targetStatus === 'MARKING_COMPLETED') backendStatus = 'COMPLETED_AND_RETURNED';
    else if (targetStatus === 'SENT_FOR_MARKING') backendStatus = 'MARKING_IN_PROGRESS';

    if (existingIdx >= 0) {
      updatedScrp[existingIdx] = {
        ...updatedScrp[existingIdx],
        status: backendStatus,
        updatedAt: new Date().toISOString()
      };
    } else {
      updatedScrp.push({
        id: `script_${Date.now()}`,
        examName: item.examName,
        subject: item.subject,
        className: item.className,
        teacherName: item.teacherName,
        checkoutDate: new Date().toISOString().split('T')[0],
        checkoutTime: '10:00',
        scriptsCount: item.expectedScriptsCount || 35,
        markingDeadline: item.markingDeadline || new Date().toISOString().split('T')[0],
        issuedBy: 'Exam Master',
        status: backendStatus,
        updatedAt: new Date().toISOString()
      });
    }

    setScriptRecords(updatedScrp);
    localStorage.setItem(`haby_exam_scripts_${schoolId}`, JSON.stringify(updatedScrp));

    // Persist updates to data service / backend
    saveSchoolData(schoolId, { examScriptRecords: updatedScrp }).catch(e => console.warn('DataService sync error:', e));

    setActionNotice({
      type: 'info',
      msg: `Script za ${item.subject} (${item.className}) zimesasishwa kuwa: ${targetStatus}`
    });

    setTimeout(() => setActionNotice(null), 3000);
  };

  // Quick Action to simulate toggle script marking status
  const handleQuickToggleScriptStatus = (item: MaterialFlowItem) => {
    const nextScriptMap: Record<MaterialFlowItem['scriptStatus'], MaterialFlowItem['scriptStatus']> = {
      'PENDING_COLLECTION': 'COLLECTED',
      'COLLECTED': 'SENT_FOR_MARKING',
      'MISSING': 'COLLECTED',
      'SENT_FOR_MARKING': 'MARKING_COMPLETED',
      'MARKING_COMPLETED': 'PENDING_COLLECTION'
    };

    const nextSt = nextScriptMap[item.scriptStatus] || 'COLLECTED';

    const existingIdx = scriptRecords.findIndex(r => r.subject.toLowerCase() === item.subject.toLowerCase() && r.className.toLowerCase() === item.className.toLowerCase());
    let updatedScrp = [...scriptRecords];

    let backendStatus: ExamScriptMarkingRecord['status'] = 'CHECKED_OUT';
    if (nextSt === 'MARKING_COMPLETED') backendStatus = 'COMPLETED_AND_RETURNED';
    else if (nextSt === 'SENT_FOR_MARKING') backendStatus = 'MARKING_IN_PROGRESS';

    if (existingIdx >= 0) {
      updatedScrp[existingIdx] = {
        ...updatedScrp[existingIdx],
        status: backendStatus,
        updatedAt: new Date().toISOString()
      };
    } else {
      updatedScrp.push({
        id: `script_${Date.now()}`,
        examName: item.examName,
        subject: item.subject,
        className: item.className,
        teacherName: item.teacherName,
        checkoutDate: new Date().toISOString().split('T')[0],
        checkoutTime: '10:00',
        scriptsCount: item.expectedScriptsCount || 35,
        markingDeadline: item.markingDeadline || new Date().toISOString().split('T')[0],
        issuedBy: 'Exam Master',
        status: backendStatus,
        updatedAt: new Date().toISOString()
      });
    }

    setScriptRecords(updatedScrp);
    localStorage.setItem(`haby_exam_scripts_${schoolId}`, JSON.stringify(updatedScrp));

    setActionNotice({
      type: 'info',
      msg: `Hali ya Script za ${item.subject} (${item.className}) imesasishwa kuwa: ${nextSt}`
    });

    setTimeout(() => setActionNotice(null), 3000);
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      'Mitihani (Exam Name)',
      'Darasa (Class)',
      'Somo (Subject)',
      'Mwalimu (Teacher)',
      'Hali ya Karatasi (Paper Status)',
      'Mtihani Vyumbani (Dispatch Status)',
      'Chumba / Hall',
      'Msimamizi (Invigilator)',
      'Hali ya Script (Script Status)',
      'Idadi ya Script (Scripts Count)',
      'Muda wa Kusahihisha (Marking Deadline)'
    ];

    const rows = filteredItems.map(item => [
      item.examName,
      item.className,
      item.subject,
      item.teacherName,
      item.paperStatus,
      item.dispatchStatus,
      item.roomVenue || '-',
      item.invigilatorName || '-',
      item.scriptStatus,
      `${item.scriptsCount}/${item.expectedScriptsCount}`,
      item.markingDeadline || '-'
    ]);

    const csvContent = [
      headers.map(escapeCSV).join(','),
      ...rows.map(row => row.map(escapeCSV).join(','))
    ].join('\n');

    downloadFile(csvContent, `RIPOTI_UDHIBITI_MITIHANI_NA_SCRIPT_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
  };

  // Render Status Badges
  const renderPaperBadge = (status: MaterialFlowItem['paperStatus']) => {
    switch (status) {
      case 'PRINTED_AND_SEALED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Imetungwa & Imepigwa Chapa (Set & Sealed)</span>
          </span>
        );
      case 'VETTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
            <span>Imekaguliwa (Vetted)</span>
          </span>
        );
      case 'SUBMITTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-300">
            <FileCheck className="w-3.5 h-3.5 text-indigo-600" />
            <span>Imewasilishwa (Submitted)</span>
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
            <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
            <span>Inatungwa (In Progress)</span>
          </span>
        );
      case 'NOT_SET':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black bg-rose-100 text-rose-800 border border-rose-300">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
            <span>HAJATUNGWA (Not Set)</span>
          </span>
        );
    }
  };

  const renderScriptBadge = (status: MaterialFlowItem['scriptStatus'], count: number, expected: number) => {
    switch (status) {
      case 'MARKING_COMPLETED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Usahihishaji Umekamilika ({count}/{expected})</span>
          </span>
        );
      case 'SENT_FOR_MARKING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-300">
            <Send className="w-3.5 h-3.5 text-indigo-600" />
            <span>Zimetolewa Kusahihisha ({count}/{expected})</span>
          </span>
        );
      case 'COLLECTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
            <PackageCheck className="w-3.5 h-3.5 text-blue-600" />
            <span>Zimekusanywa Chumba cha Mtihani ({count})</span>
          </span>
        );
      case 'MISSING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black bg-red-100 text-red-800 border border-red-400 animate-pulse">
            <AlertCircle className="w-3.5 h-3.5 text-red-600" />
            <span>ZIMEKOSEKANA / HAZIJAKUSANYWA!</span>
          </span>
        );
      case 'PENDING_COLLECTION':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-300">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>Inasubiri Mtihani UFanyike</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-2xl p-6 shadow-md border border-slate-800 relative overflow-hidden">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-3">
              <span className="p-2.5 bg-gradient-to-br from-indigo-500 to-blue-600 text-white rounded-xl shadow-md">
                <Layers className="w-6 h-6" />
              </span>
              <div>
                <h2 className="text-xl font-black tracking-tight flex items-center gap-2">
                  Summary Dashboard: Exam Material Flow & Control
                  <span className="px-2 py-0.5 bg-amber-400 text-slate-950 font-black text-[10px] uppercase rounded-full tracking-wider">
                    Live Tracking Matrix
                  </span>
                </h2>
                <p className="text-slate-300 text-xs mt-0.5">
                  Fuatilia mzunguko wa Mitihani (Kutunga, Kuchapa, Vyumbani) na Script za Watahiniwa (Kukusanya, Kusahihisha na Kuingiza Alama)
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={loadControlData}
              className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold border border-white/20 flex items-center gap-1.5 transition cursor-pointer backdrop-blur-xs"
              title="Pakia tena takwimu mpya kutoka mfomoni"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Matrix</span>
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-xs flex items-center gap-1.5 transition cursor-pointer border border-emerald-500"
              title="Pakua Ripoti katika Excel/CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV Status Report</span>
            </button>

            {onNavigateToInvigilation && (
              <button
                type="button"
                onClick={onNavigateToInvigilation}
                className="px-4 py-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 font-black rounded-xl text-xs shadow-sm flex items-center gap-2 transition cursor-pointer active:scale-[0.98]"
              >
                <span>Nenda Udhibiti wa Mitihani & Script</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Action Notice Alert */}
      {actionNotice && (
        <div className={`p-4 rounded-xl text-xs font-bold flex items-center justify-between border ${
          actionNotice.type === 'success' ? 'bg-emerald-50 text-emerald-900 border-emerald-200' :
          actionNotice.type === 'info' ? 'bg-blue-50 text-blue-900 border-blue-200' :
          'bg-amber-50 text-amber-900 border-amber-200'
        }`}>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <span>{actionNotice.msg}</span>
          </div>
        </div>
      )}

      {/* Stat Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Paper Setting Status */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Mitihani Iliyotungwa (Set Papers)
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-slate-900">{stats.papersSet}</span>
              <span className="text-xs font-semibold text-slate-500">/ {stats.total} Masomo</span>
            </div>
            <div className="mt-2 text-[11px] flex items-center gap-1 font-bold">
              {stats.papersNotSet > 0 ? (
                <span className="text-rose-600 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {stats.papersNotSet} Hazijatungwa bado
                </span>
              ) : (
                <span className="text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Karatasi zote zimetungwa
                </span>
              )}
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
            <FileCheck className="w-6 h-6" />
          </div>
        </div>

        {/* Metric 2: Answer Scripts Collected */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Script Zilizokusanywa (Collected)
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-slate-900">{stats.scriptsCollected}</span>
              <span className="text-xs font-semibold text-slate-500">/ {stats.total} Sessions</span>
            </div>
            <div className="mt-2 text-[11px] flex items-center gap-1 font-bold">
              {stats.scriptsMissing > 0 ? (
                <span className="text-red-600 flex items-center gap-1 animate-pulse">
                  <AlertCircle className="w-3 h-3" />
                  {stats.scriptsMissing} Script zimekosekana!
                </span>
              ) : (
                <span className="text-blue-600 flex items-center gap-1">
                  <PackageCheck className="w-3 h-3" />
                  Ziko salama kwenye store
                </span>
              )}
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <PackageCheck className="w-6 h-6" />
          </div>
        </div>

        {/* Metric 3: Sent for Marking */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Zimetolewa Kusahihishwa
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-slate-900">{stats.scriptsSentForMarking}</span>
              <span className="text-xs font-semibold text-slate-500">kwa walimu</span>
            </div>
            <div className="mt-2 text-[11px] text-indigo-600 font-bold flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Hazijarudishwa baada ya kusahihishwa
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
            <Send className="w-6 h-6" />
          </div>
        </div>

        {/* Metric 4: Marking Completed */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Usahihishaji Umekamilika
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-emerald-600">{stats.scriptsCompleted}</span>
              <span className="text-xs font-semibold text-slate-500">ziko tayari</span>
            </div>
            <div className="mt-2 text-[11px] text-emerald-700 font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              Alama tayari kuingizwa Ledger
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-500" />
            <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
              Chuja Matrix ya Udhibiti wa Mitihani
            </span>
          </div>

          <span className="text-xs text-slate-500 font-bold">
            Inaonyesha records <strong className="text-slate-900">{filteredItems.length}</strong> kati ya {flowItems.length}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Tafuta Somo / Mwalimu / Darasa..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          {/* Exam Selector */}
          <div>
            <select
              value={selectedExam}
              onChange={(e) => setSelectedExam(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
            >
              <option value="All">Mitihani Yote (All Exams)</option>
              {availableExams.map(ex => (
                <option key={ex} value={ex}>{ex}</option>
              ))}
            </select>
          </div>

          {/* Class Selector */}
          <div>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
            >
              <option value="All">Madarasa Yote (All Classes)</option>
              {DEFAULT_CLASSES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Paper Status Filter */}
          <div>
            <select
              value={selectedPaperStatus}
              onChange={(e) => setSelectedPaperStatus(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
            >
              <option value="All">Hali ya Karatasi (Paper Status - Yote)</option>
              <option value="NOT_SET">Haijatungwa (Not Set)</option>
              <option value="IN_PROGRESS">Inatungwa (In Progress)</option>
              <option value="VETTED">Imekaguliwa (Vetted)</option>
              <option value="PRINTED_AND_SEALED">Imetungwa & Kuchapishwa (Set & Sealed)</option>
            </select>
          </div>

          {/* Script Status Filter */}
          <div>
            <select
              value={selectedScriptStatus}
              onChange={(e) => setSelectedScriptStatus(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
            >
              <option value="All">Hali ya Script (Script Status - Yote)</option>
              <option value="PENDING_COLLECTION">Inasubiri Kuwekwa</option>
              <option value="COLLECTED">Zimekusanywa (Collected)</option>
              <option value="MISSING font-bold">ZIMEKOSEKANA (Missing)</option>
              <option value="SENT_FOR_MARKING">Zimetolewa Kusahihisha (Sent)</option>
              <option value="MARKING_COMPLETED">Usahihishaji Umekamilika (Completed)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Status Grid / Matrix Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white text-[11px] font-black uppercase tracking-wider">
                <th className="py-3.5 px-4 border-b border-slate-800">Somo & Darasa</th>
                <th className="py-3.5 px-4 border-b border-slate-800">Mwalimu wa Somo</th>
                <th className="py-3.5 px-4 border-b border-slate-800">Exam Paper Status (Set / Not Set)</th>
                <th className="py-3.5 px-4 border-b border-slate-800">Answer Scripts Status</th>
                <th className="py-3.5 px-4 border-b border-slate-800">Mtihani Vyumbani</th>
                <th className="py-3.5 px-4 border-b border-slate-800 text-right">Quick Cycle Toggle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-medium">
                    <AlertCircle className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    Hakuna kumbukumbu za udhibiti wa mitihani zinazofanana na vigezo ulivyochagua.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const isPaperSet = item.paperStatus === 'PRINTED_AND_SEALED' || item.paperStatus === 'VETTED' || item.paperStatus === 'SUBMITTED';

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Somo & Darasa */}
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 shrink-0"></span>
                          <div>
                            <div className="font-black text-slate-900 text-sm">{item.subject}</div>
                            <div className="text-[11px] text-slate-500 font-medium">
                              {item.className} {item.stream ? `(Mkondo ${item.stream})` : ''} • {item.examName}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Mwalimu wa Somo with Option to Select Registered Teacher (Requirement 2) */}
                      <td className="py-3.5 px-4 font-semibold text-slate-700">
                        {(() => {
                          const regTeachers = teachers.filter(t => 
                            Array.isArray(t.subjects) && t.subjects.some(s => 
                              s.toLowerCase().trim() === item.subject.toLowerCase().trim() || 
                              s.toLowerCase().includes(item.subject.toLowerCase().trim()) || 
                              item.subject.toLowerCase().includes(s.toLowerCase().trim())
                            )
                          );

                          if (regTeachers.length >= 2) {
                            return (
                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs">
                                  <User className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                  <span>{item.teacherName}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className="text-[9px] bg-amber-100 text-amber-900 border border-amber-300 px-1.5 py-0.5 rounded-full font-black shrink-0">
                                    Waalimu {regTeachers.length}
                                  </span>
                                  <select
                                    value={item.teacherName}
                                    onChange={(e) => handleUpdateTeacherForPaper(item, e.target.value)}
                                    className="text-[11px] font-bold py-0.5 px-1 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-lg outline-none cursor-pointer text-amber-950 max-w-[130px] truncate"
                                    title="Chagua mwalimu mhusika anayetunga au kuwasilisha mtihani huu"
                                  >
                                    {regTeachers.map(t => (
                                      <option key={t.id} value={t.name}>{t.name}</option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                            );
                          }

                          return (
                            <div className="flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>{item.teacherName}</span>
                            </div>
                          );
                        })()}
                      </td>

                      {/* Hali ya Karatasi (Exam Paper: Set / Not Set with Checkbox) */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1.5">
                          <label className="flex items-center gap-2 cursor-pointer font-bold select-none text-slate-900">
                            <input
                              type="checkbox"
                              checked={isPaperSet}
                              onChange={(e) => handleDirectSetPaperStatus(item, e.target.checked)}
                              className="w-4 h-4 rounded accent-emerald-600 cursor-pointer"
                            />
                            <span>{isPaperSet ? 'Paper Set (Imetungwa)' : 'Not Set (Haijatungwa)'}</span>
                          </label>

                          <div>{renderPaperBadge(item.paperStatus)}</div>

                          {item.paperDeadline && (
                            <div className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              Deadline: {item.paperDeadline}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Hali ya Script za Watahiniwa (Answer Scripts: Collected / Missing / Sent for Marking) */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <label className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-[11px] font-bold cursor-pointer transition select-none ${
                              item.scriptStatus === 'COLLECTED' ? 'bg-blue-100 text-blue-900 border-blue-400' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                            }`}>
                              <input
                                type="checkbox"
                                checked={item.scriptStatus === 'COLLECTED'}
                                onChange={(e) => e.target.checked && handleDirectSetScriptStatus(item, 'COLLECTED')}
                                className="w-3.5 h-3.5 accent-blue-600 cursor-pointer"
                              />
                              <span>Collected</span>
                            </label>

                            <label className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-[11px] font-bold cursor-pointer transition select-none ${
                              item.scriptStatus === 'MISSING' ? 'bg-red-100 text-red-900 border-red-400' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                            }`}>
                              <input
                                type="checkbox"
                                checked={item.scriptStatus === 'MISSING'}
                                onChange={(e) => e.target.checked && handleDirectSetScriptStatus(item, 'MISSING')}
                                className="w-3.5 h-3.5 accent-red-600 cursor-pointer"
                              />
                              <span>Missing</span>
                            </label>

                            <label className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-[11px] font-bold cursor-pointer transition select-none ${
                              item.scriptStatus === 'SENT_FOR_MARKING' ? 'bg-indigo-100 text-indigo-900 border-indigo-400' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                            }`}>
                              <input
                                type="checkbox"
                                checked={item.scriptStatus === 'SENT_FOR_MARKING'}
                                onChange={(e) => e.target.checked && handleDirectSetScriptStatus(item, 'SENT_FOR_MARKING')}
                                className="w-3.5 h-3.5 accent-indigo-600 cursor-pointer"
                              />
                              <span>Sent for Marking</span>
                            </label>
                          </div>

                          <div>
                            {renderScriptBadge(item.scriptStatus, item.scriptsCount, item.expectedScriptsCount)}
                          </div>

                          {item.markingTeacherName && item.scriptStatus === 'SENT_FOR_MARKING' && (
                            <div className="text-[10px] text-indigo-700 font-bold">
                              Kwa: {item.markingTeacherName} (Deadline: {item.markingDeadline || 'Mara moja'})
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Mtihani Vyumbani */}
                      <td className="py-3.5 px-4 font-medium text-slate-700">
                        <div className="space-y-0.5">
                          <div className="font-bold text-slate-800">
                            {item.roomVenue ? item.roomVenue : 'Bado Mtihani Haijatolewa'}
                          </div>
                          {item.invigilatorName && (
                            <div className="text-[11px] text-slate-500">
                              Msimamizi: {item.invigilatorName}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Quick Cycle Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleQuickTogglePaperStatus(item)}
                            className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-[11px] font-bold border border-blue-200 transition cursor-pointer"
                            title="Cycle Paper Status (Not Set -> In Progress -> Vetted -> Printed)"
                          >
                            Cycle Paper
                          </button>
                          <button
                            type="button"
                            onClick={() => handleQuickToggleScriptStatus(item)}
                            className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[11px] font-bold border border-indigo-200 transition cursor-pointer"
                            title="Cycle Script Status (Pending -> Collected -> Sent -> Done)"
                          >
                            Cycle Script
                          </button>
                        </div>
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
  );
};
