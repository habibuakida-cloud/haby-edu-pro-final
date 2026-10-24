import React, { useState, useMemo, useEffect } from 'react';
import { 
  Sparkles, 
  Printer, 
  Check, 
  Palette, 
  Layers, 
  Hash, 
  Award, 
  Copy, 
  Users,
  Download,
  Save,
  RefreshCw,
  X,
  CheckCircle2,
  Database
} from 'lucide-react';
import { SchoolInfo, Student } from '../../types';
import { downloadFile, escapeCSV } from '../../utils/export';

interface NectaNumberStudioProps {
  schoolId?: string;
  schoolInfo?: SchoolInfo;
  students?: Student[];
  onUpdateStudents?: (students: Student[]) => void;
  onSaveSchoolInfo?: (schoolInfo: SchoolInfo) => void;
}

type BorderStyleOption = 
  | 'report-card-tz' 
  | 'report-card-navy' 
  | 'report-card-certificate' 
  | 'tanzania-flag' 
  | 'gradient-glow' 
  | 'royal-ribbon' 
  | 'diamond-double' 
  | 'gold-double' 
  | 'solid' 
  | 'double' 
  | 'dashed' 
  | 'dotted' 
  | 'groove' 
  | 'ridge' 
  | 'neon' 
  | 'shadow-3d';
type FontFamilyOption = 'font-sans' | 'font-serif' | 'font-mono' | 'font-display' | 'font-georgia' | 'font-impact' | 'font-courier';

const nectaStudioMemoryCache = new Map<string, any>();

export const NectaNumberStudio: React.FC<NectaNumberStudioProps> = ({
  schoolId = 'DEMO_SCHOOL',
  schoolInfo,
  students = [],
  onUpdateStudents,
  onSaveSchoolInfo
}) => {
  const storageKey = `haby_necta_studio_${schoolId}`;

  const initialSaved = useMemo(() => {
    if (nectaStudioMemoryCache.has(schoolId)) {
      return nectaStudioMemoryCache.get(schoolId);
    }
    const fromSchoolInfo = (schoolInfo as any)?.nectaStudioConfig;
    if (fromSchoolInfo && typeof fromSchoolInfo === 'object') {
      nectaStudioMemoryCache.set(schoolId, fromSchoolInfo);
      return fromSchoolInfo;
    }
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(storageKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object') {
            nectaStudioMemoryCache.set(schoolId, parsed);
            return parsed;
          }
        }
      } catch (e) {
        console.warn('Could not load saved NECTA studio config:', e);
      }
    }
    return null;
  }, [schoolId, storageKey]);

  const rawSchoolNum = schoolInfo?.schoolNumber || 'S1551';
  const defaultPrefix = rawSchoolNum.startsWith('S') || rawSchoolNum.startsWith('P')
    ? rawSchoolNum
    : `S${rawSchoolNum}`;
  const defaultStart = schoolInfo?.nectaStartNumber || '0001';
  const defaultEnd = schoolInfo?.nectaEndNumber || String(Math.max(students.length, 50)).padStart(4, '0');

  const [prefix, setPrefix] = useState<string>(() => initialSaved?.prefix || defaultPrefix);
  const [startNum, setStartNum] = useState<string>(() => initialSaved?.startNum || defaultStart);
  const [endNum, setEndNum] = useState<string>(() => initialSaved?.endNum || defaultEnd);
  const [includeYearSuffix, setIncludeYearSuffix] = useState<boolean>(() => initialSaved?.includeYearSuffix ?? false);
  const [regYear, setRegYear] = useState<string>(() => initialSaved?.regYear || String(new Date().getFullYear()));

  // Generation Mode State: 'students' | 'range' | 'custom' | 'isal'
  const [genMode, setGenMode] = useState<'students' | 'range' | 'custom' | 'isal'>(() => initialSaved?.genMode || (students.length > 0 ? 'students' : 'range'));
  const [selectedClass, setSelectedClass] = useState<string>(() => initialSaved?.selectedClass || 'ALL');
  const [selectedStream, setSelectedStream] = useState<string>(() => initialSaved?.selectedStream || 'ALL');
  const [studentSortOrder, setStudentSortOrder] = useState<'girls_first' | 'boys_first' | 'alpha' | 'existing'>(() => initialSaved?.studentSortOrder || 'girls_first');

  const [customListText, setCustomListText] = useState<string>(() => initialSaved?.customListText || 'S1551/0001, S1551/0002, S1551/0003');
  const [isalInputText, setIsalInputText] = useState<string>(() => initialSaved?.isalInputText || '');
  
  // Styling State
  const [borderStyle, setBorderStyle] = useState<BorderStyleOption>(() => initialSaved?.borderStyle || 'report-card-tz');
  const [borderColor, setBorderColor] = useState<string>(() => initialSaved?.borderColor || '#D4AF37');
  const [fontFamily, setFontFamily] = useState<FontFamilyOption>(() => initialSaved?.fontFamily || 'font-serif');
  const [fontSize, setFontSize] = useState<string>(() => initialSaved?.fontSize || 'text-4xl');
  const [isBold, setIsBold] = useState<boolean>(() => initialSaved?.isBold ?? true);
  const [isItalic, setIsItalic] = useState<boolean>(() => initialSaved?.isItalic ?? false);
  const [textColor, setTextColor] = useState<string>(() => initialSaved?.textColor || '#1E293B');
  const [cardBg, setCardBg] = useState<string>(() => initialSaved?.cardBg || '#FFFDF9');
  const [borderWidth, setBorderWidth] = useState<number>(() => initialSaved?.borderWidth || 3);
  const [cardSize, setCardSize] = useState<'normal' | 'large' | 'compact'>(() => initialSaved?.cardSize || 'normal');

  // Student assignments (numberString -> studentId)
  const [assignments, setAssignments] = useState<Record<string, string>>(() => {
    if (initialSaved?.assignments && typeof initialSaved.assignments === 'object' && Object.keys(initialSaved.assignments).length > 0) {
      return initialSaved.assignments;
    }
    const autoMap: Record<string, string> = {};
    students.forEach(s => {
      if (s.regNo) {
        autoMap[s.regNo] = String(s.id);
      }
    });
    return autoMap;
  });

  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [isSavingToDb, setIsSavingToDb] = useState<boolean>(false);

  // Available classes and streams from students
  const availableClasses = useMemo(() => {
    const set = new Set<string>(['Form 1', 'Form 2', 'Form 3', 'Form 4', 'Form 5', 'Form 6', 'Standard 4', 'Standard 7']);
    students.forEach(s => {
      if (s.className && s.className.trim()) set.add(s.className.trim());
    });
    return Array.from(set);
  }, [students]);

  const availableStreams = useMemo(() => {
    const set = new Set<string>(['A', 'B', 'C']);
    students.forEach(s => {
      const st = (s.stream || s.combination || '').trim().replace(/^STREAM\s+/i, '');
      if (st) set.add(st.toUpperCase());
    });
    return Array.from(set).sort();
  }, [students]);

  // Filtered & sorted students for 'students' mode
  const filteredSortedStudents = useMemo(() => {
    const list = students.filter(s => {
      if (selectedClass !== 'ALL' && s.className !== selectedClass) return false;
      if (selectedStream !== 'ALL') {
        const st = (s.stream || s.combination || '').trim().replace(/^STREAM\s+/i, '').toUpperCase();
        if (st !== selectedStream.toUpperCase()) return false;
      }
      return true;
    });

    return [...list].sort((a, b) => {
      const aName = (a.name || a.fullName || '').trim();
      const bName = (b.name || b.fullName || '').trim();
      const aIsGirl = (a.gender || '').toLowerCase().startsWith('f') || a.sex === 'F';
      const bIsGirl = (b.gender || '').toLowerCase().startsWith('f') || b.sex === 'F';

      if (studentSortOrder === 'girls_first') {
        if (aIsGirl && !bIsGirl) return -1;
        if (!aIsGirl && bIsGirl) return 1;
        return aName.localeCompare(bName);
      }
      if (studentSortOrder === 'boys_first') {
        if (!aIsGirl && bIsGirl) return -1;
        if (aIsGirl && !bIsGirl) return 1;
        return aName.localeCompare(bName);
      }
      if (studentSortOrder === 'alpha') {
        return aName.localeCompare(bName);
      }
      return (a.regNo || '').localeCompare(b.regNo || '', undefined, { numeric: true });
    });
  }, [students, selectedClass, selectedStream, studentSortOrder]);

  // Format a single candidate number given index
  const formatCandidateNumber = (seqIndex: number, padLen: number = 4) => {
    const cleanPrefix = (prefix || 'S1551').trim().replace(/\/+$/, '');
    const padded = String(Math.max(1, seqIndex)).padStart(padLen, '0');
    if (includeYearSuffix && regYear.trim()) {
      return `${cleanPrefix}/${padded}/${regYear.trim()}`;
    }
    return `${cleanPrefix}/${padded}`;
  };

  // Auto-persist studio configuration to memory & localStorage whenever settings change
  useEffect(() => {
    const snapshot = {
      prefix,
      startNum,
      endNum,
      includeYearSuffix,
      regYear,
      genMode,
      selectedClass,
      selectedStream,
      studentSortOrder,
      customListText,
      isalInputText,
      borderStyle,
      borderColor,
      fontFamily,
      fontSize,
      isBold,
      isItalic,
      textColor,
      cardBg,
      borderWidth,
      cardSize,
      assignments,
      updatedAt: new Date().toISOString()
    };
    nectaStudioMemoryCache.set(schoolId, snapshot);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(storageKey, JSON.stringify(snapshot));
      } catch (e) {
        console.warn('Could not save NECTA studio config to localStorage:', e);
      }
    }
  }, [
    schoolId,
    storageKey,
    prefix,
    startNum,
    endNum,
    includeYearSuffix,
    regYear,
    genMode,
    selectedClass,
    selectedStream,
    studentSortOrder,
    customListText,
    isalInputText,
    borderStyle,
    borderColor,
    fontFamily,
    fontSize,
    isBold,
    isItalic,
    textColor,
    cardBg,
    borderWidth,
    cardSize,
    assignments
  ]);

  const handleIsalFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      if (content) {
        setIsalInputText(content);
        setGenMode('isal');
        setCopiedText(`ISAL faili "${file.name}" limesomwa kikamilifu!`);
        setTimeout(() => setCopiedText(null), 4000);
      }
    };
    reader.readAsText(file);
  };

  // Generate numbers array
  const generatedNumbers = useMemo(() => {
    if (genMode === 'custom') {
      return customListText
        .split(/[\n,]+/)
        .map(s => s.trim())
        .filter(Boolean);
    }
    if (genMode === 'isal') {
      const regex = /[A-Z0-9.\/_-]+/g;
      const rawTokens = isalInputText.match(regex) || [];
      const filtered = rawTokens.filter(t => t.includes('/') && t.length >= 6);
      return filtered.length > 0 ? Array.from(new Set(filtered)) : [formatCandidateNumber(1, 4)];
    }
    if (genMode === 'students') {
      const start = Math.max(1, parseInt(startNum, 10) || 1);
      const padLength = Math.max(startNum.length, 4);
      if (filteredSortedStudents.length === 0) {
        return [formatCandidateNumber(start, padLength)];
      }
      return filteredSortedStudents.map((_, idx) => formatCandidateNumber(start + idx, padLength));
    }

    const start = Math.max(1, parseInt(startNum, 10) || 1);
    const rawEnd = Math.max(start, parseInt(endNum, 10) || 200);
    // Cap range at 1000 cards at once to prevent UI freeze
    const safeEnd = Math.min(rawEnd, start + 999);
    const list: string[] = [];
    const padLength = Math.max(startNum.length, endNum.length, 4);

    for (let i = start; i <= safeEnd; i++) {
      list.push(formatCandidateNumber(i, padLength));
    }
    return list;
  }, [genMode, customListText, isalInputText, prefix, startNum, endNum, includeYearSuffix, regYear, filteredSortedStudents]);

  // Auto-generate and assign numbers to filtered students + save to database
  const handleGenerateAndAssignToStudents = () => {
    const start = Math.max(1, parseInt(startNum, 10) || 1);
    const padLength = Math.max(startNum.length, 4);

    const targetStudents = genMode === 'students' ? filteredSortedStudents : students;
    if (targetStudents.length === 0) {
      setCopiedText('Hakuna wanafunzi waliopatikana kwenye darasa lililochaguliwa!');
      setTimeout(() => setCopiedText(null), 4000);
      return;
    }

    setIsSavingToDb(true);
    const newAssignments: Record<string, string> = { ...assignments };
    const updatedStudentMap = new Map<string, string>();

    targetStudents.forEach((student, idx) => {
      const generatedNo = genMode === 'students'
        ? formatCandidateNumber(start + idx, padLength)
        : (generatedNumbers[idx] || formatCandidateNumber(start + idx, padLength));
      newAssignments[generatedNo] = String(student.id);
      updatedStudentMap.set(String(student.id), generatedNo);
    });

    setAssignments(newAssignments);

    const lastIndex = start + targetStudents.length - 1;
    const formattedEnd = String(lastIndex).padStart(padLength, '0');
    setEndNum(formattedEnd);

    if (onUpdateStudents) {
      const updatedAllStudents = students.map(s => {
        const assignedNo = updatedStudentMap.get(String(s.id));
        if (assignedNo) {
          return {
            ...s,
            regNo: assignedNo
          };
        }
        return s;
      });
      onUpdateStudents(updatedAllStudents);
    }

    if (onSaveSchoolInfo && schoolInfo) {
      onSaveSchoolInfo({
        ...schoolInfo,
        schoolNumber: prefix,
        nectaStartNumber: startNum,
        nectaEndNumber: formattedEnd,
        ...({
          nectaStudioConfig: {
            prefix,
            startNum,
            endNum: formattedEnd,
            includeYearSuffix,
            regYear,
            genMode,
            selectedClass,
            selectedStream,
            studentSortOrder,
            borderStyle,
            borderColor,
            fontFamily,
            fontSize,
            isBold,
            isItalic,
            textColor,
            cardBg,
            borderWidth,
            cardSize,
            assignments: newAssignments
          }
        } as any)
      });
    }

    setTimeout(() => {
      setIsSavingToDb(false);
      setCopiedText(
        `Namba ${targetStudents.length} za usajili (${formatCandidateNumber(start, padLength)} hadi ${formatCandidateNumber(lastIndex, padLength)}) zimezalishwa na kuhifadhiwa kwenye Database kwa wanafunzi!`
      );
      setTimeout(() => setCopiedText(null), 5000);
    }, 300);
  };

  // Save current studio settings & manual card assignments to database
  const handleSaveStudioToDatabase = () => {
    setIsSavingToDb(true);

    // Sync any manual card assignments to student.regNo if onUpdateStudents is available
    if (onUpdateStudents && Object.keys(assignments).length > 0) {
      const studentToRegMap = new Map<string, string>();
      Object.entries(assignments).forEach(([numStr, stId]) => {
        if (stId) {
          studentToRegMap.set(String(stId), numStr);
        }
      });

      if (studentToRegMap.size > 0) {
        const updatedStudents = students.map(s => {
          const newReg = studentToRegMap.get(String(s.id));
          return newReg ? { ...s, regNo: newReg } : s;
        });
        onUpdateStudents(updatedStudents);
      }
    }

    if (onSaveSchoolInfo && schoolInfo) {
      onSaveSchoolInfo({
        ...schoolInfo,
        schoolNumber: prefix,
        nectaStartNumber: startNum,
        nectaEndNumber: endNum,
        ...({
          nectaStudioConfig: {
            prefix,
            startNum,
            endNum,
            includeYearSuffix,
            regYear,
            genMode,
            selectedClass,
            selectedStream,
            studentSortOrder,
            customListText,
            isalInputText,
            borderStyle,
            borderColor,
            fontFamily,
            fontSize,
            isBold,
            isItalic,
            textColor,
            cardBg,
            borderWidth,
            cardSize,
            assignments
          }
        } as any)
      });
    }

    setTimeout(() => {
      setIsSavingToDb(false);
      setCopiedText('Mpangilio wa Namba za NECTA na Kadi umehifadhiwa kikamilifu kwenye Database!');
      setTimeout(() => setCopiedText(null), 4000);
    }, 250);
  };

  const handleExportCSV = () => {
    const headers = ['S/N', 'NECTA Index / Reg No', 'Student Full Name', 'Gender', 'Class', 'Stream'];
    const rows = generatedNumbers.map((numStr, idx) => {
      const assignedId = assignments[numStr];
      const studentObj =
        students.find(s => String(s.id) === String(assignedId)) ||
        (genMode === 'students' ? filteredSortedStudents[idx] : students.find(s => s.regNo === numStr));
      return [
        String(idx + 1),
        numStr,
        studentObj ? (studentObj.name || studentObj.fullName || '') : '',
        studentObj ? (studentObj.gender || '') : '',
        studentObj ? (studentObj.className || '') : '',
        studentObj ? (studentObj.stream || studentObj.combination || '') : ''
      ];
    });
    const csvContent = [headers.map(escapeCSV).join(','), ...rows.map(r => r.map(escapeCSV).join(','))].join('\n');
    downloadFile(`NECTA_Registration_Numbers_${prefix.replace(/[^a-zA-Z0-9]/g, '_')}.csv`, csvContent, 'text/csv;charset=utf-8');
    setCopiedText('Faili la CSV la Namba za NECTA limepakuliwa kikamilifu!');
    setTimeout(() => setCopiedText(null), 4000);
  };

  const borderOptions: { id: BorderStyleOption; label: string; desc: string }[] = [
    { id: 'report-card-tz', label: '🎓 Boda ya Ripoti za Wanafunzi (Official Flag Gradient)', desc: 'Boda halisi ya taifa inayotumika kwenye ripoti za matokeo za wanafunzi' },
    { id: 'report-card-navy', label: '📜 Boda ya Ripoti ya Kifalme (Royal Navy & Gold)', desc: 'Boda ya ripoti yenye bluu ya kifalme na mstari wa dhahabu' },
    { id: 'report-card-certificate', label: '🏅 Boda ya Cheti cha Taaluma (Academic Diploma Frame)', desc: 'Boda ya cheti chenye muundo wa kiofisi wa mitihani' },
    { id: 'tanzania-flag', label: '🇹🇿 Rangi za Taifa (Tanzania Flag Border)', desc: 'Gorgeous Green, Gold, Black & Blue national colors framing' },
    { id: 'gradient-glow', label: 'Radiant Gradient Glow', desc: 'Glowing multi-color gradient border' },
    { id: 'royal-ribbon', label: 'Royal Ribbon Gold', desc: 'Regal ribbon framing' },
    { id: 'diamond-double', label: 'Diamond Double Frame', desc: 'Double sharp frame' },
    { id: 'gold-double', label: 'Classic Gold Double', desc: 'Double border with rich metallic framing' },
    { id: 'solid', label: 'Solid Elegant', desc: 'Clean single solid border' },
    { id: 'double', label: 'Standard Double', desc: 'Traditional Necta exam double border' },
    { id: 'dashed', label: 'Dashed Modern', desc: 'Dashed border style' },
    { id: 'dotted', label: 'Dotted Luxury', desc: 'Fine dotted border frame' },
    { id: 'groove', label: 'Groove 3D', desc: 'Beveled 3D groove effect' },
    { id: 'ridge', label: 'Ridge 3D', desc: 'Embossed ridge effect' },
    { id: 'neon', label: 'Neon Glow', desc: 'Glowing radiant border highlight' },
    { id: 'shadow-3d', label: 'Floating 3D Card', desc: 'Soft elevated shadow card' },
  ];

  const colorPalette = [
    { name: 'Tanzania Green', hex: '#1EB53A' },
    { name: 'Tanzania Gold', hex: '#FCD116' },
    { name: 'Tanzania Blue', hex: '#00A3DD' },
    { name: 'Tanzania Black', hex: '#000000' },
    { name: 'Classic Gold', hex: '#D4AF37' },
    { name: 'Royal Blue', hex: '#1E3A8A' },
    { name: 'Emerald Green', hex: '#065F46' },
    { name: 'Ruby Crimson', hex: '#991B1B' },
    { name: 'Imperial Purple', hex: '#581C87' },
    { name: 'Midnight Navy', hex: '#0F172A' },
    { name: 'Rose Gold', hex: '#BE185D' },
    { name: 'Teal Cyan', hex: '#0E7490' },
    { name: 'Charcoal', hex: '#334155' },
    { name: 'Bronze', hex: '#854D0E' }
  ];

  const fontOptions: { id: FontFamilyOption; label: string; styleClass: string }[] = [
    { id: 'font-serif', label: 'Playfair / Elegant Serif', styleClass: 'font-serif tracking-wide' },
    { id: 'font-sans', label: 'Inter / Modern Clean Sans', styleClass: 'font-sans tracking-tight' },
    { id: 'font-display', label: 'Cinzel / Formal Roman Display', styleClass: 'font-serif tracking-widest uppercase' },
    { id: 'font-mono', label: 'Fira Code / Technical Mono', styleClass: 'font-mono tracking-wider' },
    { id: 'font-georgia', label: 'Georgia Classic Serif', styleClass: 'font-serif tracking-normal' },
    { id: 'font-impact', label: 'Impact Bold Header', styleClass: 'font-sans tracking-tighter uppercase' },
    { id: 'font-courier', label: 'Courier Typewriter', styleClass: 'font-mono tracking-widest' }
  ];

  const backgroundOptions = [
    { name: 'Parchment Cream', hex: '#FFFDF9' },
    { name: 'Pure White', hex: '#FFFFFF' },
    { name: 'Soft Gold Tint', hex: '#FEFCE8' },
    { name: 'Ice Blue Tint', hex: '#F0F9FF' },
    { name: 'Soft Mint', hex: '#F0FDF4' },
    { name: 'Lavender Blush', hex: '#FAF5FF' }
  ];

  const getCardStyle = (style: BorderStyleOption, color: string, width: number, bg: string): React.CSSProperties => {
    switch (style) {
      case 'report-card-tz':
        return {
          backgroundColor: bg,
          border: '7px solid',
          borderImage: 'linear-gradient(135deg, #1EB53A 0% 33%, #FCD116 33% 38%, #000000 38% 62%, #FCD116 62% 67%, #00A3E0 67% 100%) 1',
          boxShadow: '0 4px 14px rgba(0, 0, 0, 0.08)'
        };
      case 'report-card-navy':
        return {
          backgroundColor: bg,
          border: '5px double #1f4d8b',
          boxShadow: '0 0 0 2px #FCD116, 0 4px 12px rgba(31, 77, 139, 0.25)'
        };
      case 'report-card-certificate':
        return {
          backgroundColor: bg,
          border: '6px groove #1f4d8b',
          boxShadow: 'inset 0 0 0 2px #D4AF37, 0 4px 10px rgba(0, 0, 0, 0.1)'
        };
      case 'tanzania-flag':
        return {
          backgroundColor: bg,
          border: '4px solid #1EB53A',
          boxShadow: '0 0 0 3px #FCD116, 0 0 0 6px #00A3DD, 0 4px 12px rgba(30, 181, 58, 0.3)'
        };
      case 'gradient-glow':
        return {
          backgroundColor: bg,
          border: '3px solid #FCD116',
          boxShadow: '0 0 15px rgba(252, 209, 22, 0.7), inset 0 0 10px rgba(30, 181, 58, 0.5)'
        };
      case 'royal-ribbon':
        return {
          backgroundColor: bg,
          border: '4px double #1EB53A',
          boxShadow: '0 0 0 2px #1EB53A, 0 4px 10px rgba(0, 0, 0, 0.15)'
        };
      case 'diamond-double':
        return {
          backgroundColor: bg,
          border: '3px double #00A3DD',
          boxShadow: '0 0 0 2px #00A3DD, inset 0 0 0 2px #FCD116'
        };
      case 'gold-double':
        return {
          backgroundColor: bg,
          border: `4px double ${color}`,
          boxShadow: `0 0 0 1px ${color}40, 0 4px 12px rgba(0, 0, 0, 0.05)`
        };
      case 'double':
        return {
          backgroundColor: bg,
          border: `4px double ${color}`,
          boxShadow: '0 2px 6px rgba(0, 0, 0, 0.05)'
        };
      case 'dashed':
        return {
          backgroundColor: bg,
          border: `${width}px dashed ${color}`
        };
      case 'dotted':
        return {
          backgroundColor: bg,
          border: `${width}px dotted ${color}`
        };
      case 'groove':
        return {
          backgroundColor: bg,
          border: `${Math.max(width, 4)}px groove ${color}`
        };
      case 'ridge':
        return {
          backgroundColor: bg,
          border: `${Math.max(width, 4)}px ridge ${color}`
        };
      case 'neon':
        return {
          backgroundColor: bg,
          border: `2px solid ${color}`,
          boxShadow: `0 0 12px ${color}80, inset 0 0 8px ${color}40`
        };
      case 'shadow-3d':
        return {
          backgroundColor: bg,
          border: `1px solid ${color}40`,
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)'
        };
      case 'solid':
      default:
        return {
          backgroundColor: bg,
          border: `${width}px solid ${color}`,
          boxShadow: '0 2px 6px rgba(0, 0, 0, 0.05)'
        };
    }
  };

  const handleCopyAll = () => {
    const text = generatedNumbers.join('\n');
    navigator.clipboard.writeText(text);
    setCopiedText(`Namba zote (${generatedNumbers.length}) zimenakiliwa!`);
    setTimeout(() => setCopiedText(null), 3000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-12 print:p-0 print:m-0">
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 10mm;
          }
          body {
            background: white !important;
            color: black !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          .grid {
            display: grid !important;
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 12px !important;
          }
          div[title="Kipande cha kukata (Cutting line)"] {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            border: 2px dashed #000 !important;
            background: #fff !important;
            margin-bottom: 8px !important;
          }
        }
      `}</style>

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-amber-900 via-amber-800 to-amber-950 text-white rounded-3xl p-6 md:p-8 shadow-xl print:hidden">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 text-amber-300 font-bold text-xs uppercase tracking-widest mb-1">
              <Sparkles className="w-4 h-4" /> NECTA Exam Center Registration &amp; Index Studio
            </div>
            <h1 className="text-2xl md:text-3xl font-black font-serif text-amber-100">
              Jenereta ya Namba za Usajili na Mpangilio wa Boda
            </h1>
            <p className="text-amber-200 text-sm mt-1 max-w-2xl">
              Zalisha namba za mtihani/usajili za NECTA (Mfano: {formatCandidateNumber(1, 4)} hadi {formatCandidateNumber(generatedNumbers.length || 200, 4)}), kabidhi wanafunzi wa darasa husika kiotomatiki (Wasichana Kwanza A–Z kisha Wavulana A–Z), na hifadhi moja kwa moja kwenye Database.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleSaveStudioToDatabase}
              disabled={isSavingToDb}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black text-xs sm:text-sm flex items-center gap-2 transition shadow-md cursor-pointer"
            >
              <Database className="w-4 h-4" />
              <span>{isSavingToDb ? 'Inahifadhi...' : 'Hifadhi Database'}</span>
            </button>
            <button
              type="button"
              onClick={handleExportCSV}
              className="px-4 py-2.5 bg-amber-700/80 hover:bg-amber-600 text-white rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition shadow-md cursor-pointer"
            >
              <Download className="w-4 h-4" /> Export CSV
            </button>
            <button
              type="button"
              onClick={handleCopyAll}
              className="px-4 py-2.5 bg-amber-700/80 hover:bg-amber-600 text-white rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition shadow-md cursor-pointer"
            >
              <Copy className="w-4 h-4" /> Nakili Namba
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-5 py-2.5 bg-amber-400 hover:bg-amber-300 text-amber-950 rounded-xl font-black text-xs sm:text-sm flex items-center gap-2 transition shadow-lg cursor-pointer"
            >
              <Printer className="w-4 h-4" /> Chapisha Kadi (A4)
            </button>
          </div>
        </div>
      </div>

      {copiedText && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 px-4 py-3 rounded-2xl flex items-center justify-between gap-2 font-bold text-xs sm:text-sm shadow-sm animate-fade-in print:hidden">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{copiedText}</span>
          </div>
          <button
            type="button"
            onClick={() => setCopiedText(null)}
            className="text-emerald-700 hover:text-emerald-950 p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Configuration & Styling Control Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:hidden">
        {/* Box 1: Range, Class Auto-Generator, Custom Feed & ISAL Parser */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-amber-900 font-bold text-base border-b border-slate-100 pb-3">
            <Hash className="w-5 h-5 text-amber-700" /> 1. Chanzo cha Namba (Generation Source)
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 bg-slate-100 p-1.5 rounded-xl">
            <button
              type="button"
              onClick={() => setGenMode('students')}
              className={`py-1.5 px-2 text-[11px] font-bold rounded-lg transition cursor-pointer ${genMode === 'students' ? 'bg-amber-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Wanafunzi ({students.length})
            </button>
            <button
              type="button"
              onClick={() => setGenMode('range')}
              className={`py-1.5 px-2 text-[11px] font-bold rounded-lg transition cursor-pointer ${genMode === 'range' ? 'bg-amber-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Range
            </button>
            <button
              type="button"
              onClick={() => setGenMode('custom')}
              className={`py-1.5 px-2 text-[11px] font-bold rounded-lg transition cursor-pointer ${genMode === 'custom' ? 'bg-amber-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Custom
            </button>
            <button
              type="button"
              onClick={() => setGenMode('isal')}
              className={`py-1.5 px-2 text-[11px] font-bold rounded-lg transition cursor-pointer ${genMode === 'isal' ? 'bg-amber-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              ISAL File
            </button>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Namba ya Kituo (Prefix)
              </label>
              <input
                type="text"
                value={prefix}
                onChange={e => setPrefix(e.target.value)}
                placeholder="Mf: S1551 au S.0123"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Kuanzia Namba (Start)
              </label>
              <input
                type="text"
                value={startNum}
                onChange={e => setStartNum(e.target.value)}
                placeholder="0001"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Optional Year Suffix Toggle */}
          <div className="flex items-center justify-between gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200/80">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={includeYearSuffix}
                onChange={e => setIncludeYearSuffix(e.target.checked)}
                className="w-4 h-4 rounded text-amber-900 focus:ring-amber-500"
              />
              <span>Ongeza Mwaka Mwishoni (Mf: /{regYear})</span>
            </label>
            {includeYearSuffix && (
              <input
                type="text"
                value={regYear}
                onChange={e => setRegYear(e.target.value)}
                className="w-20 px-2 py-1 text-xs font-mono font-bold bg-white border border-slate-300 rounded-lg text-center"
                placeholder="2026"
              />
            )}
          </div>

          {genMode === 'students' && (
            <div className="space-y-3 animate-fade-in bg-amber-50/50 p-3.5 rounded-2xl border border-amber-200/70">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                    Chagua Darasa (Class)
                  </label>
                  <select
                    value={selectedClass}
                    onChange={e => setSelectedClass(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                  >
                    <option value="ALL">Wanafunzi Wote ({students.length})</option>
                    {availableClasses.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                    Mkondo (Stream)
                  </label>
                  <select
                    value={selectedStream}
                    onChange={e => setSelectedStream(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                  >
                    <option value="ALL">Mikondo Yote</option>
                    {availableStreams.map(st => (
                      <option key={st} value={st}>Stream {st}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                  Mpangilio wa Majina (NECTA Sequencing Order)
                </label>
                <select
                  value={studentSortOrder}
                  onChange={e => setStudentSortOrder(e.target.value as any)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                >
                  <option value="girls_first">Wasichana Kwanza A–Z, kisha Wavulana A–Z (NECTA Standard)</option>
                  <option value="boys_first">Wavulana Kwanza A–Z, kisha Wasichana A–Z</option>
                  <option value="alpha">Alfabeti A–Z (Changanya Jinsia)</option>
                  <option value="existing">Mpangilio wa Sasa wa Usajili</option>
                </select>
              </div>

              <button
                type="button"
                onClick={handleGenerateAndAssignToStudents}
                disabled={isSavingToDb}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-amber-800 to-amber-950 hover:from-amber-700 hover:to-amber-900 text-white rounded-xl font-black text-xs flex items-center justify-center gap-2 shadow-md transition cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${isSavingToDb ? 'animate-spin' : ''}`} />
                <span>Zalisha &amp; Hifadhi Namba kwa Wanafunzi ({filteredSortedStudents.length})</span>
              </button>
            </div>
          )}

          {genMode === 'range' && (
            <div className="space-y-3 animate-fade-in">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Mpaka Namba (End Number)
                </label>
                <input
                  type="text"
                  value={endNum}
                  onChange={e => setEndNum(e.target.value)}
                  placeholder="0200"
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              {students.length > 0 && (
                <button
                  type="button"
                  onClick={handleGenerateAndAssignToStudents}
                  className="w-full py-2 px-3 bg-amber-100 hover:bg-amber-200 text-amber-950 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Gawa Namba Hizi kwa Wanafunzi &amp; Hifadhi Database</span>
                </button>
              )}
            </div>
          )}

          {genMode === 'custom' && (
            <div className="animate-fade-in space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                Ingiza Namba (Tenganisha kwa comma au mistari):
              </label>
              <textarea
                value={customListText}
                onChange={e => setCustomListText(e.target.value)}
                rows={4}
                placeholder="S1551/0001, S1551/0003, S1551/0010..."
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          )}

          {genMode === 'isal' && (
            <div className="animate-fade-in space-y-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Upload ISAL Document (TXT / CSV):
                </label>
                <input
                  type="file"
                  accept=".txt,.csv,.json,.doc,.docx,.rtf"
                  onChange={handleIsalFileUpload}
                  className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-amber-100 file:text-amber-900 hover:file:bg-amber-200 cursor-pointer"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Au Bandika ISAL Maandishi Hapa:
                </label>
                <textarea
                  value={isalInputText}
                  onChange={e => setIsalInputText(e.target.value)}
                  rows={3}
                  placeholder="Paste ISAL text containing registration numbers..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
          )}

          <div className="pt-2 text-xs text-slate-600 bg-amber-50/60 p-3 rounded-xl border border-amber-200/50 flex items-center justify-between">
            <span>
              Jumla ya namba: <strong className="font-black text-amber-900">{generatedNumbers.length}</strong>{' '}
              {generatedNumbers.length > 0 ? `(${generatedNumbers[0]} → ${generatedNumbers[generatedNumbers.length - 1]})` : ''}
            </span>
          </div>
        </div>

        {/* Box 2: Border Style & Color */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-amber-900 font-bold text-base border-b border-slate-100 pb-3">
            <Layers className="w-5 h-5 text-amber-700" /> 2. Mtindo na Rangi ya Boda
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Aina ya Boda (Border Style)
            </label>
            <select
              value={borderStyle}
              onChange={e => setBorderStyle(e.target.value as BorderStyleOption)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              {borderOptions.map(opt => (
                <option key={opt.id} value={opt.id}>{opt.label} — {opt.desc}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Rangi ya Boda (Border Color)
            </label>
            <div className="grid grid-cols-5 gap-2 pt-1">
              {colorPalette.map(c => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => setBorderColor(c.hex)}
                  title={c.name}
                  className={`h-9 rounded-xl transition cursor-pointer flex items-center justify-center border-2 ${borderColor === c.hex ? 'scale-110 shadow-md border-slate-900' : 'border-transparent hover:scale-105'}`}
                  style={{ backgroundColor: c.hex }}
                >
                  {borderColor === c.hex && <Check className="w-4 h-4 text-white drop-shadow-md" />}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3 mt-3">
              <span className="text-xs text-slate-500">Hex Custom:</span>
              <input
                type="color"
                value={borderColor}
                onChange={e => setBorderColor(e.target.value)}
                className="w-8 h-8 rounded-lg border border-slate-300 cursor-pointer p-0.5 bg-white"
              />
              <span className="text-xs font-mono font-bold text-slate-700">{borderColor}</span>
            </div>
          </div>
        </div>

        {/* Box 3: Font & Background Color */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-amber-900 font-bold text-base border-b border-slate-100 pb-3">
            <Palette className="w-5 h-5 text-amber-700" /> 3. Fonti na Rangi ya Maandishi
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Mtindo wa Fonti (Font Family)
            </label>
            <select
              value={fontFamily}
              onChange={e => setFontFamily(e.target.value as FontFamilyOption)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              {fontOptions.map(f => (
                <option key={f.id} value={f.id}>{f.label}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Ukubwa wa Fonti (Size)
              </label>
              <select
                value={fontSize}
                onChange={e => setFontSize(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
              >
                <option value="text-2xl">Ndogo (2XL)</option>
                <option value="text-3xl">Wastani (3XL)</option>
                <option value="text-4xl">Kubwa (4XL)</option>
                <option value="text-5xl">Kubwa Zaidi (5XL)</option>
                <option value="text-6xl">Kubwa Sana (6XL)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Herufi (Bold / Italic)
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsBold(!isBold)}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl border transition cursor-pointer ${isBold ? 'bg-amber-900 text-white border-amber-900' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'}`}
                >
                  Bold
                </button>
                <button
                  type="button"
                  onClick={() => setIsItalic(!isItalic)}
                  className={`flex-1 py-2 text-xs font-bold italic rounded-xl border transition cursor-pointer ${isItalic ? 'bg-amber-900 text-white border-amber-900' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'}`}
                >
                  Italic
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Rangi ya Namba
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={textColor}
                  onChange={e => setTextColor(e.target.value)}
                  className="w-8 h-8 rounded-lg border border-slate-300 cursor-pointer p-0.5 bg-white"
                />
                <span className="text-xs font-mono font-bold">{textColor}</span>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Rangi ya Nyuma (Card BG)
              </label>
              <select
                value={cardBg}
                onChange={e => setCardBg(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
              >
                {backgroundOptions.map(bg => (
                  <option key={bg.hex} value={bg.hex}>{bg.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Ukubwa wa Kadi (Card Size)
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['compact', 'normal', 'large'] as const).map(sz => (
                <button
                  key={sz}
                  type="button"
                  onClick={() => setCardSize(sz)}
                  className={`py-2 text-xs font-bold rounded-xl border transition cursor-pointer capitalize ${cardSize === sz ? 'bg-amber-900 text-white border-amber-900 shadow-sm' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'}`}
                >
                  {sz === 'compact' ? 'Ndogo' : sz === 'normal' ? 'Wastani' : 'Kubwa'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Live Preview Grid Section */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-700" />
              Orodha na Kadi Zilizopambwa ({generatedNumbers.length} Namba)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Kila namba imeundwa kwa mtindo wa kipekee wa boda na fonti uliochagua. Mabadiliko yote yanahifadhiwa moja kwa moja.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            {Object.keys(assignments).length > 0 && onUpdateStudents && (
              <button
                type="button"
                onClick={handleSaveStudioToDatabase}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer transition"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Sawazisha Namba Kwenye Daftari la Wanafunzi</span>
              </button>
            )}
            <div className="text-xs font-bold text-amber-900 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200">
              Shule: {schoolInfo?.name || 'Tanzania Secondary School'}
            </div>
          </div>
        </div>

        {/* Cards Grid - 2 columns with cutting guide dotted lines and large numbers */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 print:grid-cols-2 print:gap-6">
          {generatedNumbers.map((numStr, idx) => {
            const fontClass = fontOptions.find(f => f.id === fontFamily)?.styleClass || 'font-serif';
            const explicitStudentId = assignments[numStr];
            const autoStudent = genMode === 'students' ? filteredSortedStudents[idx] : students.find(s => s.regNo === numStr);
            const studentObj = explicitStudentId
              ? students.find(s => String(s.id) === String(explicitStudentId))
              : autoStudent;

            return (
              <div
                key={`${numStr}-${idx}`}
                className="p-3 bg-slate-100/70 border-2 border-dashed border-slate-400 rounded-3xl print:border-black print:bg-white"
                title="Kipande cha kukata (Cutting line)"
              >
                <div
                  className={`relative rounded-2xl flex flex-col items-center justify-center transition-all shadow-sm ${
                    cardSize === 'compact' ? 'py-6 px-4' : cardSize === 'large' ? 'py-12 px-8' : 'py-8 px-6'
                  }`}
                  style={getCardStyle(borderStyle, borderColor, borderWidth, cardBg)}
                >
                  {/* Cutting scissors hint indicator */}
                  <div className="absolute top-2 left-3 text-[10px] text-slate-400 font-mono tracking-widest print:hidden flex items-center gap-1">
                    ✂️ Kata Hapa (#{idx + 1})
                  </div>

                  {/* Index tag */}
                  <span className="absolute top-2 right-3 text-xs font-mono font-bold text-slate-500 print:text-black">
                    #{idx + 1}
                  </span>

                  {/* The Registration Number */}
                  <div 
                    className={`${fontClass} ${isBold ? 'font-black' : 'font-normal'} ${isItalic ? 'italic' : ''} ${fontSize} text-center select-all tracking-wider my-3`}
                    style={{ color: textColor }}
                  >
                    {numStr}
                  </div>

                  {/* Assigned Student info or selector */}
                  <div className="mt-3 w-full pt-3 border-t border-slate-200/60 text-center">
                    {studentObj ? (
                      <div className="flex items-center justify-between gap-2 px-2">
                        <div className="text-xs font-bold text-slate-800 truncate flex-1 text-center" title={studentObj.name || studentObj.fullName}>
                          {studentObj.name || studentObj.fullName}{' '}
                          <span className="text-[10px] font-semibold text-slate-500">
                            ({studentObj.className || 'Form'}{studentObj.gender ? ` • ${studentObj.gender.charAt(0)}` : ''})
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setAssignments(prev => {
                              const next = { ...prev };
                              next[numStr] = '';
                              return next;
                            });
                          }}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded print:hidden cursor-pointer"
                          title="Badilisha au ondoa mwanafunzi huyu"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <select
                        value={explicitStudentId || ''}
                        onChange={e => {
                          const val = e.target.value;
                          setAssignments(prev => ({ ...prev, [numStr]: val }));
                        }}
                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-slate-600 focus:outline-none print:hidden font-medium"
                        title="Mkabidhi mwanafunzi"
                      >
                        <option value="">+ Mkabidhi Mwanafunzi...</option>
                        {students.map(s => (
                          <option key={s.id} value={s.id}>
                            {s.name || s.fullName} ({s.className || 'Form'} • {s.regNo || 'No Reg'})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

