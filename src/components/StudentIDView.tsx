import React, { useState, useMemo, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { 
  Search, 
  Printer, 
  CreditCard, 
  User, 
  QrCode, 
  ShieldCheck, 
  Calendar, 
  BookOpen, 
  Sparkles, 
  Download, 
  Filter,
  CheckCircle2,
  ExternalLink,
  Eye,
  X,
  Palette,
  RotateCcw,
  FlipHorizontal,
  Layers,
  Phone,
  HeartPulse,
  Award,
  Check,
  Building,
  Sliders,
  FileEdit,
  Scissors,
  Share2,
  RefreshCw,
  Info,
  Shield,
  HelpCircle,
  Pipette,
  Copy
} from 'lucide-react';
import { Student, SchoolInfo } from '../types';
import { 
  NURSERY_CLASSES, 
  PRIMARY_CLASSES, 
  SECONDARY_CLASSES 
} from '../constants/defaults';
import { HabyEduProLogo } from './common/HabyEduProLogo';

interface StudentIDViewProps {
  students: Student[];
  schoolInfo: SchoolInfo;
}

export interface IdCardThemePreset {
  id: string;
  name: string;
  headerColor: string;
  borderColor: string;
  accentColor: string;
  accentTextColor: string;
  headerTextColor: string;
  bodyGradient: string;
}

export const ID_CARD_PRESETS: IdCardThemePreset[] = [
  {
    id: 'navy_gold',
    name: 'Royal Navy & Gold',
    headerColor: '#1f4d8b',
    borderColor: '#1f4d8b',
    accentColor: '#f59e0b',
    accentTextColor: '#0f172a',
    headerTextColor: '#ffffff',
    bodyGradient: 'from-white via-slate-50 to-blue-50/40'
  },
  {
    id: 'emerald_gold',
    name: 'Emerald Green & Gold',
    headerColor: '#065f46',
    borderColor: '#065f46',
    accentColor: '#fbbf24',
    accentTextColor: '#0f172a',
    headerTextColor: '#ffffff',
    bodyGradient: 'from-white via-emerald-50/30 to-emerald-50/60'
  },
  {
    id: 'burgundy_rose',
    name: 'Burgundy & Rose Gold',
    headerColor: '#881337',
    borderColor: '#881337',
    accentColor: '#fcd34d',
    accentTextColor: '#881337',
    headerTextColor: '#ffffff',
    bodyGradient: 'from-white via-rose-50/30 to-rose-50/60'
  },
  {
    id: 'purple_amber',
    name: 'Imperial Purple & Amber',
    headerColor: '#581c87',
    borderColor: '#581c87',
    accentColor: '#fbbf24',
    accentTextColor: '#581c87',
    headerTextColor: '#ffffff',
    bodyGradient: 'from-white via-purple-50/30 to-purple-50/60'
  },
  {
    id: 'ocean_teal',
    name: 'Ocean Teal & Cyan',
    headerColor: '#115e59',
    borderColor: '#115e59',
    accentColor: '#38bdf8',
    accentTextColor: '#0f172a',
    headerTextColor: '#ffffff',
    bodyGradient: 'from-white via-teal-50/30 to-teal-50/60'
  },
  {
    id: 'executive_onyx',
    name: 'Executive Onyx & Blue',
    headerColor: '#0f172a',
    borderColor: '#0f172a',
    accentColor: '#3b82f6',
    accentTextColor: '#ffffff',
    headerTextColor: '#ffffff',
    bodyGradient: 'from-white via-slate-50 to-slate-100/60'
  },
  {
    id: 'warm_bronze',
    name: 'Warm Bronze & Navy',
    headerColor: '#92400e',
    borderColor: '#92400e',
    accentColor: '#2563eb',
    accentTextColor: '#ffffff',
    headerTextColor: '#ffffff',
    bodyGradient: 'from-white via-amber-50/30 to-amber-50/60'
  },
  {
    id: 'sapphire_sky',
    name: 'Sapphire & Sky Blue',
    headerColor: '#1d4ed8',
    borderColor: '#1d4ed8',
    accentColor: '#38bdf8',
    accentTextColor: '#0f172a',
    headerTextColor: '#ffffff',
    bodyGradient: 'from-white via-blue-50/40 to-sky-50/60'
  },
  {
    id: 'forest_lime',
    name: 'Forest Pine & Lime',
    headerColor: '#14532d',
    borderColor: '#14532d',
    accentColor: '#84cc16',
    accentTextColor: '#0f172a',
    headerTextColor: '#ffffff',
    bodyGradient: 'from-white via-green-50/30 to-lime-50/50'
  },
  {
    id: 'sunset_orange',
    name: 'Sunset Orange & Amber',
    headerColor: '#c2410c',
    borderColor: '#c2410c',
    accentColor: '#fbbf24',
    accentTextColor: '#0f172a',
    headerTextColor: '#ffffff',
    bodyGradient: 'from-white via-orange-50/30 to-amber-50/40'
  },
  {
    id: 'classic_maroon',
    name: 'Classic Maroon & Gold',
    headerColor: '#701a75',
    borderColor: '#701a75',
    accentColor: '#facc15',
    accentTextColor: '#0f172a',
    headerTextColor: '#ffffff',
    bodyGradient: 'from-white via-fuchsia-50/30 to-fuchsia-50/60'
  },
  {
    id: 'crimson_slate',
    name: 'Crimson Red & Slate',
    headerColor: '#991b1b',
    borderColor: '#991b1b',
    accentColor: '#1e293b',
    accentTextColor: '#ffffff',
    headerTextColor: '#ffffff',
    bodyGradient: 'from-white via-red-50/30 to-slate-50/60'
  }
];

export interface BackPageSettings {
  language: 'swahili' | 'english' | 'bilingual';
  motto: string;
  emergencyPhone: string;
  bloodGroup: string;
  medicalNote: string;
  issueDate: string;
  validUntil: string;
  principalName: string;
  principalTitle: string;
  customRules: string[];
  showBarcode: boolean;
  showHologram: boolean;
  showHealthInfo: boolean;
}

export const StudentIDView: React.FC<StudentIDViewProps> = ({
  students,
  schoolInfo
}) => {
  const [searchReg, setSearchReg] = useState<string>('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(students[0] || null);
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('All');
  const [selectedStreamFilter, setSelectedStreamFilter] = useState<string>('All');
  const [batchPrintMode, setBatchPrintMode] = useState<boolean>(false);
  const [previewModalStudent, setPreviewModalStudent] = useState<Student | null>(null);

  // Dynamic Color State controlling CSS Variables on both Front and Back card templates
  const [headerColor, setHeaderColor] = useState<string>('#1f4d8b');
  const [borderColor, setBorderColor] = useState<string>('#1f4d8b');
  const [accentColor, setAccentColor] = useState<string>('#f59e0b');
  const [headerTextColor, setHeaderTextColor] = useState<string>('#ffffff');
  const [accentTextColor, setAccentTextColor] = useState<string>('#0f172a');
  const [selectedPresetId, setSelectedPresetId] = useState<string>('navy_gold');
  const [syncBorderWithHeader, setSyncBorderWithHeader] = useState<boolean>(true);

  // Display Mode state
  const [activeSideView, setActiveSideView] = useState<'both' | 'front' | 'back' | 'flip'>('both');
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [showSettingsDrawer, setShowSettingsDrawer] = useState<boolean>(false);
  const [showColorPickerPanel, setShowColorPickerPanel] = useState<boolean>(true);

  // Back Page Customizable Content Settings
  const [backSettings, setBackSettings] = useState<BackPageSettings>({
    language: 'swahili',
    motto: 'Elimu ni Nuru na Msingi wa Maendeleo',
    emergencyPhone: schoolInfo.phone || '+255 717 616 343',
    bloodGroup: 'O+ (Positive)',
    medicalNote: 'Hakuna mzio unaojulikana (No known allergies)',
    issueDate: '01 JAN 2026',
    validUntil: '31 DEC 2028',
    principalName: schoolInfo.principal || 'Mwl. Habibu Akida',
    principalTitle: 'Head of School / Mkuu wa Shule',
    customRules: [
      'Kitambulisho hiki ni mali ya shule. Mwanafunzi lazima awe nacho wakati wote awapo shuleni.',
      'Ni marufuku kumpa mtu mwingine, kufanya ughushi au kukiharibu.',
      'Ukikiokota, tafadhali kirudishe ofisi ya mkuu wa shule au piga namba ya dharura.',
      'Kinatakiwa kuonyeshwa wakati wa kuingia getini, maktaba na vyumba vya mitihani.'
    ],
    showBarcode: true,
    showHologram: true,
    showHealthInfo: true
  });

  // Apply a Preset theme
  const applyPreset = (preset: IdCardThemePreset) => {
    setSelectedPresetId(preset.id);
    setHeaderColor(preset.headerColor);
    setBorderColor(preset.borderColor);
    setAccentColor(preset.accentColor);
    setHeaderTextColor(preset.headerTextColor);
    setAccentTextColor(preset.accentTextColor);
  };

  // Change Header Color and optionally sync Border Color
  const handleHeaderColorChange = (color: string) => {
    setHeaderColor(color);
    if (syncBorderWithHeader) {
      setBorderColor(color);
    }
    setSelectedPresetId('custom');
  };

  // Dynamic streams collected from all registered students
  const availableStreams = useMemo(() => {
    const set = new Set<string>();
    students.forEach(s => {
      if (s.stream && s.stream.trim()) {
        const clean = s.stream.trim().replace(/^STREAM\s+/i, '');
        if (clean) set.add(clean.toUpperCase());
      }
    });
    ['A', 'B', 'C', 'D', 'E'].forEach(st => set.add(st));
    return Array.from(set).sort();
  }, [students]);

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchSearch = !searchReg.trim() ||
        s.name.toLowerCase().includes(searchReg.trim().toLowerCase()) ||
        s.regNo.toLowerCase().includes(searchReg.trim().toLowerCase());
      const matchClass = selectedClassFilter === 'All' || s.className.toLowerCase() === selectedClassFilter.toLowerCase();
      const matchStream = selectedStreamFilter === 'All' ||
        (s.stream ? (
          s.stream.toUpperCase().replace(/^STREAM\s+/i, '') === selectedStreamFilter.toUpperCase() ||
          s.stream.toUpperCase().includes(selectedStreamFilter.toUpperCase())
        ) : true);
      return matchSearch && matchClass && matchStream;
    });
  }, [students, searchReg, selectedClassFilter, selectedStreamFilter]);

  // Keep selected student synced with filtered results
  useEffect(() => {
    if (filteredStudents.length > 0 && (!selectedStudent || !filteredStudents.some(s => s.id === selectedStudent.id))) {
      setSelectedStudent(filteredStudents[0]);
    }
  }, [filteredStudents, selectedStudent]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchReg.trim()) {
      return;
    }
    const found = students.find(s => 
      s.regNo.toLowerCase().includes(searchReg.trim().toLowerCase()) ||
      s.name.toLowerCase().includes(searchReg.trim().toLowerCase())
    );
    if (found) {
      setSelectedStudent(found);
    } else {
      alert(`No student found with registration number or name containing "${searchReg.trim()}".`);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const getStudentProfileUrl = (st: Student) => {
    const baseUrl = typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}` : '';
    return `${baseUrl}?verifyStudent=${encodeURIComponent(st.regNo)}`;
  };

  // Language preset switcher
  const handleLanguagePreset = (lang: 'swahili' | 'english' | 'bilingual') => {
    if (lang === 'swahili') {
      setBackSettings(prev => ({
        ...prev,
        language: 'swahili',
        customRules: [
          'Kitambulisho hiki ni mali ya shule. Mwanafunzi lazima awe nacho wakati wote awapo shuleni.',
          'Ni marufuku kumpa mtu mwingine, kufanya ughushi au kukiharibu.',
          'Ukikiokota, tafadhali kirudishe ofisi ya mkuu wa shule au piga namba ya dharura.',
          'Kinatakiwa kuonyeshwa wakati wa kuingia getini, maktaba na vyumba vya mitihani.'
        ]
      }));
    } else if (lang === 'english') {
      setBackSettings(prev => ({
        ...prev,
        language: 'english',
        customRules: [
          'This card remains the property of the school and must be carried at all times on campus.',
          'Card is non-transferable. Alteration or misuse is strictly prohibited.',
          'If found, please return immediately to the Head of School office or call the emergency contact.',
          'Required for school gate entry, examinations, and library borrowing services.'
        ]
      }));
    } else {
      setBackSettings(prev => ({
        ...prev,
        language: 'bilingual',
        customRules: [
          'Mali ya shule / Property of school - Lazima uwe nacho shuleni wakati wote.',
          'Marufuku kukikopesha au kughushi / Non-transferable and strictly prohibited to alter.',
          'Ukikiokota kirudishe ofisi ya mkuu wa shule / If found please return to School Principal.',
          'Kinatumika getini, mitihani na maktaba / Required for campus, exams & library.'
        ]
      }));
    }
  };

  // CSS Variables object applied to Card Template Root
  const cardCssVariables: React.CSSProperties = {
    ['--id-header-bg' as string]: headerColor,
    ['--id-border-color' as string]: borderColor,
    ['--id-accent-bg' as string]: accentColor,
    ['--id-accent-text' as string]: accentTextColor,
    ['--id-header-text' as string]: headerTextColor,
    borderColor: 'var(--id-border-color)'
  };

  // Reusable Front ID Card Component
  const renderFrontCard = (student: Student, isCompact = false) => {
    return (
      <div 
        style={cardCssVariables}
        className={`bg-white rounded-2xl border-2 shadow-xl overflow-hidden relative flex flex-col justify-between transition-all duration-300 shrink-0 ${
          isCompact ? 'w-[360px] h-[228px]' : 'w-[420px] h-[265px]'
        }`}
      >
        {/* Top School Header (uses CSS var --id-header-bg, --id-header-text, --id-accent-bg) */}
        <div 
          style={{ 
            backgroundColor: 'var(--id-header-bg)', 
            color: 'var(--id-header-text)',
            borderBottomColor: 'var(--id-accent-bg)' 
          }}
          className="p-3.5 text-center border-b-2 relative overflow-hidden"
        >
          {/* Subtle Decorative Pattern */}
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:8px_8px] pointer-events-none" />

          <div className="flex items-center justify-center gap-3 relative z-10">
            <div className="p-1 rounded-lg bg-white/15 shrink-0 shadow-xs backdrop-blur-xs">
              {schoolInfo.logo ? (
                <img src={schoolInfo.logo} alt="School Logo" className="w-9 h-9 object-contain rounded" />
              ) : (
                <HabyEduProLogo theme="dark" size="sm" variant="icon" />
              )}
            </div>
            <div className="text-left min-w-0">
              <h3 className="font-black text-sm tracking-wide uppercase leading-tight line-clamp-2" title={schoolInfo.name || 'HABY EDU PRO SCHOOL'}>
                {schoolInfo.name || 'HABY EDU PRO SCHOOL'}
              </h3>
              <p className="text-[10px] opacity-90 font-medium truncate max-w-[280px]">
                {schoolInfo.address || 'P.O. Box 1234, Tanga, Tanzania'} • {schoolInfo.phone || '+255 717 616 343'}
              </p>
            </div>
          </div>

          <div 
            style={{ 
              backgroundColor: 'var(--id-accent-bg)', 
              color: 'var(--id-accent-text)' 
            }}
            className="inline-block mt-2 font-black text-[10px] px-3 py-0.5 rounded-full uppercase tracking-wider shadow-2xs"
          >
            OFFICIAL STUDENT IDENTITY CARD
          </div>
        </div>

        {/* ID Body */}
        <div className="p-3.5 sm:p-4 bg-gradient-to-b from-white via-slate-50 to-blue-50/30 flex-1 flex flex-col justify-between">
          <div className="flex gap-4">
            {/* Photo Avatar */}
            <div className="w-28 flex flex-col items-center shrink-0">
              <div 
                style={{ borderColor: 'var(--id-border-color)' }}
                className="w-24 h-28 bg-slate-100 border-2 rounded-xl flex flex-col items-center justify-center overflow-hidden shadow-inner relative"
              >
                {student.passportPhoto ? (
                  <img
                    src={student.passportPhoto}
                    alt={student.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <>
                    <User className="w-12 h-12 text-slate-400" />
                    <span className="text-[9px] font-bold text-slate-400 uppercase mt-1">Photo</span>
                  </>
                )}
              </div>
              <div className="mt-2 text-center w-full">
                <span 
                  style={{ borderColor: 'var(--id-border-color)' }}
                  className="inline-block px-2 py-0.5 bg-blue-50 text-slate-900 rounded-md font-mono font-bold text-[10px] border w-full shadow-2xs break-all"
                >
                  {student.regNo}
                </span>
              </div>
            </div>

            {/* Student Attributes */}
            <div className="flex-1 space-y-1.5 text-xs min-w-0">
              <div>
                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Student Full Name</div>
                <div className="font-black text-slate-900 text-sm leading-tight truncate" title={student.name}>{student.name}</div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Class &amp; Stream</div>
                    <span className="font-extrabold text-xs text-slate-900 block truncate" title={student.className + " " + (student.stream || 'A')}>
                      {student.className} {student.stream || 'A'}
                    </span>
                </div>
                <div>
                  <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Level</div>
                    <span className="font-bold text-blue-700 block truncate" title={student.level}>{student.level}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Gender</div>
                  <div className="font-bold text-slate-800">{student.gender || 'Not specified'}</div>
                </div>
                <div>
                  <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Date of Birth</div>
                  <div className="font-mono text-slate-700 font-semibold">{student.dob || '2010-01-01'}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Parent Phone</div>
                  <div className="font-mono text-blue-900 font-bold text-[11px] truncate">
                    {student.parentPhone || student.phone || '0754 000 111'}
                  </div>
                </div>
                <div>
                  <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Valid Until</div>
                  <div className="font-bold text-rose-600 font-mono">{backSettings.validUntil}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Barcode, QR Code & Signatures */}
          <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between gap-2">
            {/* Scannable QR Code */}
            <div 
              onClick={() => setPreviewModalStudent(student)}
              style={{ borderColor: 'var(--id-border-color)' }}
              className="p-1 bg-white border rounded-lg shadow-2xs flex flex-col items-center cursor-pointer hover:ring-2 hover:ring-blue-500/20 transition shrink-0"
              title="Scan or click to view Digital Profile Record"
            >
              <QRCodeSVG 
                value={getStudentProfileUrl(student)} 
                size={40} 
                level="M" 
                bgColor="#ffffff"
                fgColor="#0f172a"
              />
              <span className="text-[6.5px] font-black text-blue-900 uppercase tracking-tighter mt-0.5">SCAN PROFILE</span>
            </div>

            {/* Barcode */}
            <div>
              <div className="flex items-center gap-0.5 h-6">
                {[4, 2, 6, 1, 3, 5, 2, 7, 3, 1, 4, 6, 2, 5, 1, 3, 4].map((h, i) => (
                  <div key={i} className="bg-slate-900 w-1 rounded-xs" style={{ height: `${h * 3.2}px` }} />
                ))}
              </div>
              <div className="text-[8px] font-mono text-slate-500 mt-0.5 tracking-wider">
                *{student.regNo}*
              </div>
            </div>

            {/* Stamp / Signature */}
            <div className="text-right shrink-0">
              <div className="text-[9px] text-slate-600 font-serif italic mb-0.5">
                {backSettings.principalName}
              </div>
              <div className="text-[8px] font-bold text-slate-600 uppercase border-t border-slate-400 pt-0.5 tracking-tighter">
                Head of School Stamp
              </div>
            </div>
          </div>
        </div>

        {/* Front Bottom Strip */}
        <div 
          style={{ backgroundColor: '#0f172a', color: '#ffffff' }}
          className="px-4 py-1.5 text-center text-[9px] font-medium tracking-wide flex items-center justify-between"
        >
          <span className="font-mono text-slate-400">ID: {student.regNo}</span>
          <span 
            style={{ color: 'var(--id-accent-bg)' }}
            className="font-black tracking-widest uppercase"
          >
            FRONT SIDE • MBELE
          </span>
          <span className="font-mono text-slate-400">{student.className}</span>
        </div>
      </div>
    );
  };

  // Reusable Back ID Card Component (uses same CSS variables for Header & Border)
  const renderBackCard = (student: Student, isCompact = false) => {
    return (
      <div 
        style={cardCssVariables}
        className={`bg-white rounded-2xl border-2 shadow-xl overflow-hidden relative flex flex-col justify-between transition-all duration-300 shrink-0 ${
          isCompact ? 'w-[360px] h-[228px]' : 'w-[420px] h-[265px]'
        }`}
      >
        {/* Top Header of Back Page (uses CSS var --id-header-bg, --id-header-text, --id-accent-bg) */}
        <div 
          style={{ 
            backgroundColor: 'var(--id-header-bg)', 
            color: 'var(--id-header-text)',
            borderBottomColor: 'var(--id-accent-bg)' 
          }}
          className="p-3.5 text-center border-b-2 relative overflow-hidden"
        >
          <div className="flex items-center justify-center gap-2">
            <Shield 
              style={{ color: 'var(--id-accent-bg)' }} 
              className="w-4 h-4 shrink-0" 
            />
            <h4 className="font-black text-xs tracking-wider uppercase">
              {backSettings.language === 'english' ? 'TERMS OF USE & CODE OF CONDUCT' : 'MASHARTI NA KANUNI ZA KITAMBULISHO'}
            </h4>
          </div>
          <p className="text-[10px] opacity-90 font-medium px-2">
            {schoolInfo.name || 'HABY EDU PRO SCHOOL'} • OFFICIAL PROPERTY
          </p>
        </div>

        {/* Back Page Body */}
        <div className="p-3.5 sm:p-4 bg-gradient-to-b from-white via-slate-50 to-blue-50/30 flex-1 flex flex-col justify-between">
          {/* Rules List */}
          <div className="space-y-1.5 text-[10.5px] text-slate-700 bg-white/90 p-3 rounded-xl border border-slate-200/90 shadow-2xs">
            {backSettings.customRules.slice(0, 4).map((rule, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <span 
                  style={{ 
                    backgroundColor: 'var(--id-accent-bg)', 
                    color: 'var(--id-accent-text)' 
                  }}
                  className="w-4 h-4 rounded-full text-[9.5px] font-black flex items-center justify-center shrink-0 mt-0.5 shadow-2xs"
                >
                  {idx + 1}
                </span>
                <p className="leading-snug text-slate-800 font-medium">
                  {rule}
                </p>
              </div>
            ))}
          </div>

          {/* Emergency Contacts & Medical Info Grid */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 bg-white/95 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[8.5px] font-black text-slate-500 uppercase flex items-center gap-1">
                <Phone className="w-3 h-3 text-emerald-600" />
                Dharura / Emergency
              </span>
              <p className="font-mono font-bold text-slate-900 text-[11px] mt-0.5">
                {backSettings.emergencyPhone}
              </p>
              <span className="text-[8px] text-slate-400 block">Ofisi ya Mkuu wa Shule</span>
            </div>

            {backSettings.showHealthInfo && (
              <div className="p-2.5 bg-white/95 rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-[8.5px] font-black text-slate-500 uppercase flex items-center gap-1">
                  <HeartPulse className="w-3 h-3 text-rose-600" />
                  Kundi la Damu / Blood
                </span>
                <p className="font-bold text-slate-900 text-[11px] mt-0.5">
                  Group: <span className="text-rose-700 font-black">{backSettings.bloodGroup}</span>
                </p>
                <span className="text-[8px] text-slate-400 block">{backSettings.medicalNote}</span>
              </div>
            )}
          </div>

          {/* School Motto & Security Hologram Seal (uses CSS var --id-header-bg & --id-accent-bg) */}
          <div 
            style={{ 
              backgroundColor: 'var(--id-header-bg)', 
              color: 'var(--id-header-text)',
              borderColor: 'var(--id-accent-bg)'
            }}
            className="p-2.5 text-white rounded-xl flex items-center justify-between gap-3 shadow-xs relative overflow-hidden border"
          >
            <div className="space-y-0.5 min-w-0 z-10">
              <span 
                style={{ color: 'var(--id-accent-bg)' }}
                className="text-[8.5px] font-black uppercase tracking-widest block"
              >
                SCHOOL MOTTO / WAZO LA SHULE:
              </span>
              <p className="text-[11px] font-serif italic text-white leading-tight">
                "{backSettings.motto}"
              </p>
            </div>

            {backSettings.showHologram && (
              <div 
                style={{ borderColor: 'var(--id-accent-bg)' }}
                className="w-9 h-9 rounded-full bg-white/15 border-2 border-dashed flex items-center justify-center shrink-0 shadow-inner"
              >
                <ShieldCheck 
                  style={{ color: 'var(--id-accent-bg)' }} 
                  className="w-5 h-5" 
                />
              </div>
            )}
          </div>

          {/* Official Signatures, Dates & Library Barcode */}
          <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs gap-2">
            <div>
              <span className="text-[8.5px] text-slate-400 block uppercase font-bold">Issue / Valid Dates:</span>
              <div className="font-mono font-bold text-slate-700 text-[10px]">
                {backSettings.issueDate} - <span className="text-rose-600">{backSettings.validUntil}</span>
              </div>
            </div>

            {/* Back mini QR / Barcode for Library */}
            {backSettings.showBarcode && (
              <div className="hidden sm:flex flex-col items-center">
                <div className="flex items-center gap-0.5 h-4">
                  {[3, 1, 4, 2, 5, 1, 3, 2, 4, 1, 3].map((h, i) => (
                    <div key={i} className="bg-slate-800 w-0.5 rounded-xs" style={{ height: `${h * 2.8}px` }} />
                  ))}
                </div>
                <span className="text-[7px] font-mono text-slate-500">LIB-PASS</span>
              </div>
            )}

            <div className="text-right">
              <div className="font-serif italic text-slate-700 text-xs font-bold">
                {backSettings.principalName}
              </div>
              <span className="text-[8px] font-bold text-slate-500 uppercase border-t border-slate-400 pt-0.5 block tracking-tighter">
                {backSettings.principalTitle}
              </span>
            </div>
          </div>
        </div>

        {/* Back Bottom Strip */}
        <div 
          style={{ backgroundColor: '#0f172a', color: '#ffffff' }}
          className="px-4 py-1.5 text-center text-[9px] font-medium tracking-wide flex items-center justify-between"
        >
          <span className="font-mono text-slate-400">ID: {student.regNo}</span>
          <span 
            style={{ color: 'var(--id-accent-bg)' }}
            className="font-black tracking-widest uppercase"
          >
            BACK SIDE • NYUMA
          </span>
          <span className="font-mono text-slate-400">{student.className}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Print Stylesheet for Flawless A4 & Cut Lines */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #student-id-printable-area, #student-id-printable-area * {
            visibility: visible;
          }
          #student-id-printable-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 10px;
            background: white !important;
          }
          .no-print {
            display: none !important;
          }
          .print-cut-guide {
            border: 1px dashed #94a3b8 !important;
            padding: 12px !important;
            margin-bottom: 24px !important;
            page-break-inside: avoid !important;
          }
        }
      `}</style>

      {/* Top Search & Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold shadow-xs">
              <CreditCard className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#1f4d8b] flex items-center gap-2">
                <span>Student Identity Card Generator</span>
                <span className="text-xs bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full font-bold border border-amber-300">
                  Front &amp; Back Double-Sided
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Generate, customize colors &amp; CSS variables, configure back page rules and print official verified double-sided student ID cards.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Search Form */}
          <form onSubmit={handleSearch} className="flex items-center gap-2">
            <div className="relative">
              <input
                type="text"
                placeholder="Search candidate / Reg No..."
                value={searchReg}
                onChange={e => setSearchReg(e.target.value)}
                className="px-3.5 py-2 text-xs font-semibold bg-slate-50 border border-slate-300 rounded-xl w-48 sm:w-56 focus:ring-2 focus:ring-blue-500 outline-none shadow-2xs"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Search</span>
            </button>
          </form>

          {/* Customize Back Settings Button */}
          <button
            type="button"
            onClick={() => setShowSettingsDrawer(!showSettingsDrawer)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs ${
              showSettingsDrawer 
                ? 'bg-purple-600 text-white border-purple-600' 
                : 'bg-white border-purple-200 text-purple-800 hover:bg-purple-50'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Customize Back Page</span>
          </button>

          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Cards</span>
          </button>

          <button
            onClick={() => setBatchPrintMode(!batchPrintMode)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
              batchPrintMode 
                ? 'bg-emerald-600 text-white border-emerald-600' 
                : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
            }`}
          >
            {batchPrintMode ? 'Single Card View' : 'Batch All Cards'}
          </button>
        </div>
      </div>

      {/* DEDICATED COLOR PICKER COMPONENT (Updates CSS variables & style properties for both Front & Back) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-50 text-blue-700 rounded-xl">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-sm uppercase tracking-wider text-slate-900">
                Identity Card Color &amp; Style Customizer (CSS Variables)
              </h3>
              <p className="text-xs text-slate-500">
                Updates <code className="text-blue-700 bg-blue-50 px-1 py-0.5 rounded font-mono font-bold">--id-header-bg</code>, <code className="text-purple-700 bg-purple-50 px-1 py-0.5 rounded font-mono font-bold">--id-border-color</code>, and <code className="text-amber-700 bg-amber-50 px-1 py-0.5 rounded font-mono font-bold">--id-accent-bg</code> in real-time across both front &amp; back templates.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => applyPreset(ID_CARD_PRESETS[0])}
              className="px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100 cursor-pointer flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Default</span>
            </button>
          </div>
        </div>

        {/* Color Inputs Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200">
          {/* 1. Header Background Color Picker */}
          <div className="space-y-1.5 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-xs">
              <span className="font-black text-slate-700 flex items-center gap-1.5">
                <Pipette className="w-3.5 h-3.5 text-blue-600" />
                Header Background:
              </span>
              <span className="font-mono font-bold text-[11px] text-slate-500 uppercase">{headerColor}</span>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <input
                type="color"
                value={headerColor}
                onChange={e => handleHeaderColorChange(e.target.value)}
                className="w-10 h-10 rounded-xl border-2 border-slate-300 cursor-pointer shadow-xs p-0.5"
                title="Pick Header Background Color"
              />
              <input
                type="text"
                value={headerColor}
                onChange={e => handleHeaderColorChange(e.target.value)}
                className="flex-1 px-2.5 py-2 text-xs font-mono font-bold bg-slate-50 border border-slate-300 rounded-lg uppercase text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          {/* 2. Border Color Picker */}
          <div className="space-y-1.5 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-xs">
              <span className="font-black text-slate-700 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-purple-600" />
                Card Border Color:
              </span>
              <span className="font-mono font-bold text-[11px] text-slate-500 uppercase">{borderColor}</span>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <input
                type="color"
                value={borderColor}
                onChange={e => {
                  setBorderColor(e.target.value);
                  setSyncBorderWithHeader(false);
                  setSelectedPresetId('custom');
                }}
                className="w-10 h-10 rounded-xl border-2 border-slate-300 cursor-pointer shadow-xs p-0.5"
                title="Pick Card Border Color"
              />
              <input
                type="text"
                value={borderColor}
                onChange={e => {
                  setBorderColor(e.target.value);
                  setSyncBorderWithHeader(false);
                  setSelectedPresetId('custom');
                }}
                className="flex-1 px-2.5 py-2 text-xs font-mono font-bold bg-slate-50 border border-slate-300 rounded-lg uppercase text-slate-800 focus:ring-2 focus:ring-purple-500 outline-none"
              />
            </div>
          </div>

          {/* 3. Accent / Badge Color Picker */}
          <div className="space-y-1.5 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-xs">
              <span className="font-black text-slate-700 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Accent &amp; Badge Color:
              </span>
              <span className="font-mono font-bold text-[11px] text-slate-500 uppercase">{accentColor}</span>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <input
                type="color"
                value={accentColor}
                onChange={e => {
                  setAccentColor(e.target.value);
                  setSelectedPresetId('custom');
                }}
                className="w-10 h-10 rounded-xl border-2 border-slate-300 cursor-pointer shadow-xs p-0.5"
                title="Pick Accent Color"
              />
              <input
                type="text"
                value={accentColor}
                onChange={e => {
                  setAccentColor(e.target.value);
                  setSelectedPresetId('custom');
                }}
                className="flex-1 px-2.5 py-2 text-xs font-mono font-bold bg-slate-50 border border-slate-300 rounded-lg uppercase text-slate-800 focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>
          </div>

          {/* 4. Header Text Color & Sync Options */}
          <div className="space-y-2 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs">
              <span className="font-black text-slate-700">Header Text Contrast:</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setHeaderTextColor('#ffffff')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition border cursor-pointer ${
                  headerTextColor === '#ffffff' 
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs' 
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                White Text
              </button>
              <button
                type="button"
                onClick={() => setHeaderTextColor('#0f172a')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition border cursor-pointer ${
                  headerTextColor === '#0f172a' 
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs' 
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Dark Text
              </button>
            </div>
            <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 cursor-pointer pt-0.5">
              <input
                type="checkbox"
                checked={syncBorderWithHeader}
                onChange={e => {
                  setSyncBorderWithHeader(e.target.checked);
                  if (e.target.checked) setBorderColor(headerColor);
                }}
                className="rounded text-blue-600 focus:ring-blue-500"
              />
              <span>Sync Border with Header</span>
            </label>
          </div>
        </div>

        {/* Preset Palettes Quick Switcher */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase text-slate-600">
              Quick School Theme Presets:
            </span>
            <span className="text-[11px] font-bold text-slate-400">
              {ID_CARD_PRESETS.length} Official Schemes
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {ID_CARD_PRESETS.map(preset => {
              const isSelected = selectedPresetId === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer border ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50 text-blue-900 ring-2 ring-blue-500/20 shadow-xs'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center -space-x-1 shrink-0">
                    <span 
                      className="w-3.5 h-3.5 rounded-full shadow-2xs border border-white" 
                      style={{ backgroundColor: preset.headerColor }}
                    />
                    <span 
                      className="w-3.5 h-3.5 rounded-full shadow-2xs border border-white" 
                      style={{ backgroundColor: preset.accentColor }}
                    />
                  </div>
                  <span className="truncate">{preset.name}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 ml-0.5 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Card Controls & Layout Options Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          {/* Front / Back / Both Sides / 3D Flip View Switcher */}
          <div className="space-y-2 shrink-0 w-full lg:w-auto">
            <div className="flex items-center gap-1.5 text-xs font-black uppercase text-slate-700">
              <FlipHorizontal className="w-4 h-4 text-purple-600" />
              <span>Card Sides to Display:</span>
            </div>

            <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => { setActiveSideView('both'); setIsFlipped(false); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  activeSideView === 'both' ? 'bg-blue-600 text-white shadow-xs font-black' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Side-by-Side (Both)
              </button>
              <button
                type="button"
                onClick={() => { setActiveSideView('flip'); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                  activeSideView === 'flip' ? 'bg-purple-600 text-white shadow-xs font-black' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <RefreshCw className="w-3 h-3" />
                <span>3D Flip View</span>
              </button>
              <button
                type="button"
                onClick={() => { setActiveSideView('front'); setIsFlipped(false); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  activeSideView === 'front' ? 'bg-blue-600 text-white shadow-xs font-black' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Front Only
              </button>
              <button
                type="button"
                onClick={() => { setActiveSideView('back'); setIsFlipped(true); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  activeSideView === 'back' ? 'bg-blue-600 text-white shadow-xs font-black' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Back Only
              </button>
            </div>
          </div>

          {/* Class Quick Selection & Student Picker */}
          <div className="flex flex-wrap items-center gap-3 text-xs w-full lg:w-auto justify-start lg:justify-end">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-500 uppercase tracking-wider text-[11px]">Class:</span>
              <select
                value={selectedClassFilter}
                onChange={e => setSelectedClassFilter(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 font-bold text-slate-700 shadow-2xs cursor-pointer"
              >
                <option value="All">All Classes</option>
                <optgroup label="Pre-Primary / Nursery">
                  {NURSERY_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                </optgroup>
                <optgroup label="Primary School (Std 1 - 7)">
                  {PRIMARY_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                </optgroup>
                <optgroup label="Secondary School (Form 1 - 6)">
                  {SECONDARY_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                </optgroup>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-500 uppercase tracking-wider text-[11px]">Stream:</span>
              <select
                value={selectedStreamFilter}
                onChange={e => setSelectedStreamFilter(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 font-bold text-slate-700 shadow-2xs cursor-pointer"
              >
                <option value="All">All Streams</option>
                {availableStreams.map(str => (
                  <option key={str} value={str}>Stream {str}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-500 uppercase tracking-wider text-[11px]">
                Candidate:
              </span>
              <select
                value={selectedStudent?.regNo || ''}
                onChange={e => {
                  const st = students.find(s => s.regNo === e.target.value);
                  if (st) setSelectedStudent(st);
                }}
                className="bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 font-bold text-slate-800 max-w-[240px] shadow-2xs cursor-pointer"
              >
                {filteredStudents.length === 0 ? (
                  <option value="">No matching candidates</option>
                ) : (
                  filteredStudents.map(s => (
                    <option key={s.id} value={s.regNo}>{s.regNo} - {s.name} ({s.className})</option>
                  ))
                )}
              </select>
            </div>
          </div>
        </div>

        {/* Customizable Back Page Configuration Accordion / Drawer */}
        {showSettingsDrawer && (
          <div className="p-4 bg-purple-50/70 border-2 border-purple-200 rounded-2xl space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-purple-200 pb-2">
              <div className="flex items-center gap-2">
                <FileEdit className="w-4 h-4 text-purple-700" />
                <h3 className="font-black text-xs uppercase tracking-wider text-purple-950">
                  Customize Back Page Terms, Motto, Dates &amp; Emergency Rules
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSettingsDrawer(false)}
                className="text-purple-600 hover:text-purple-900 text-xs font-bold cursor-pointer"
              >
                Done / Close Panel
              </button>
            </div>

            {/* Language Preset Selector */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-700">Language Preset:</span>
              <button
                type="button"
                onClick={() => handleLanguagePreset('swahili')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer border ${
                  backSettings.language === 'swahili'
                    ? 'bg-purple-700 text-white border-purple-700'
                    : 'bg-white text-slate-700 border-purple-200 hover:bg-purple-100'
                }`}
              >
                Kiswahili (Masharti ya Shule)
              </button>
              <button
                type="button"
                onClick={() => handleLanguagePreset('english')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer border ${
                  backSettings.language === 'english'
                    ? 'bg-purple-700 text-white border-purple-700'
                    : 'bg-white text-slate-700 border-purple-200 hover:bg-purple-100'
                }`}
              >
                English (Code of Conduct)
              </button>
              <button
                type="button"
                onClick={() => handleLanguagePreset('bilingual')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer border ${
                  backSettings.language === 'bilingual'
                    ? 'bg-purple-700 text-white border-purple-700'
                    : 'bg-white text-slate-700 border-purple-200 hover:bg-purple-100'
                }`}
              >
                Bilingual (Kiswahili &amp; English)
              </button>
            </div>

            {/* Form Inputs Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">School Motto / Wazo la Shule:</label>
                <input
                  type="text"
                  value={backSettings.motto}
                  onChange={e => setBackSettings(prev => ({ ...prev, motto: e.target.value }))}
                  className="w-full px-3 py-1.5 bg-white border border-purple-200 rounded-xl font-medium text-slate-800 focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Emergency Phone / Simu ya Dharura:</label>
                <input
                  type="text"
                  value={backSettings.emergencyPhone}
                  onChange={e => setBackSettings(prev => ({ ...prev, emergencyPhone: e.target.value }))}
                  className="w-full px-3 py-1.5 bg-white border border-purple-200 rounded-xl font-mono font-medium text-slate-800 focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Authorized Signatory / Jina la Mkuu:</label>
                <input
                  type="text"
                  value={backSettings.principalName}
                  onChange={e => setBackSettings(prev => ({ ...prev, principalName: e.target.value }))}
                  className="w-full px-3 py-1.5 bg-white border border-purple-200 rounded-xl font-medium text-slate-800 focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Issue Date / Tarehe ya Kutolewa:</label>
                <input
                  type="text"
                  value={backSettings.issueDate}
                  onChange={e => setBackSettings(prev => ({ ...prev, issueDate: e.target.value }))}
                  className="w-full px-3 py-1.5 bg-white border border-purple-200 rounded-xl font-mono font-medium text-slate-800 focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Valid Until / Mwisho wa Matumizi:</label>
                <input
                  type="text"
                  value={backSettings.validUntil}
                  onChange={e => setBackSettings(prev => ({ ...prev, validUntil: e.target.value }))}
                  className="w-full px-3 py-1.5 bg-white border border-purple-200 rounded-xl font-mono font-medium text-slate-800 focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Blood Group &amp; Health Note:</label>
                <input
                  type="text"
                  value={backSettings.bloodGroup}
                  onChange={e => setBackSettings(prev => ({ ...prev, bloodGroup: e.target.value }))}
                  className="w-full px-3 py-1.5 bg-white border border-purple-200 rounded-xl font-medium text-slate-800 focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>
            </div>

            {/* Editable Rules Text Area */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 block text-xs">
                Rules &amp; Regulations Bullets (1 per line):
              </label>
              <textarea
                rows={3}
                value={backSettings.customRules.join('\n')}
                onChange={e => setBackSettings(prev => ({
                  ...prev,
                  customRules: e.target.value.split('\n').filter(r => r.trim().length > 0)
                }))}
                className="w-full p-2.5 bg-white border border-purple-200 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-purple-500 outline-none"
              />
            </div>
          </div>
        )}
      </div>

      {/* Printable ID Area */}
      <div id="student-id-printable-area">
        {!batchPrintMode && selectedStudent ? (
          <div className="flex flex-col items-center justify-center py-6">
            {activeSideView === 'both' ? (
              /* DUAL SIDE-BY-SIDE VIEW (Front & Back for easy printing and cutting) */
              <div className="flex flex-col items-center gap-6 w-full max-w-5xl">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500 no-print">
                  <Scissors className="w-4 h-4 text-slate-400" />
                  <span>Dual Side-by-Side View (Mbele na Nyuma - tayari kwa uchapaji na ukataji)</span>
                </div>

                <div className="flex flex-col lg:flex-row items-center justify-center gap-8 w-full print-cut-guide rounded-3xl bg-slate-50/50 p-6 border border-slate-200">
                  {/* Front Side */}
                  <div className="w-full max-w-[420px] flex flex-col items-center">
                    <p className="text-center text-xs font-black text-slate-500 uppercase mb-2 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: headerColor }} />
                      Front Side (Mbele ya Kitambulisho)
                    </p>
                    {renderFrontCard(selectedStudent)}
                  </div>

                  {/* Cut Line Indicator */}
                  <div className="hidden lg:flex flex-col items-center justify-center text-slate-400 px-2">
                    <div className="w-0.5 h-64 border-r-2 border-dashed border-slate-300" />
                    <Scissors className="w-4 h-4 text-slate-400 my-1 rotate-90" />
                    <div className="w-0.5 h-64 border-r-2 border-dashed border-slate-300" />
                  </div>

                  {/* Back Side */}
                  <div className="w-full max-w-[420px] flex flex-col items-center">
                    <p className="text-center text-xs font-black text-slate-500 uppercase mb-2 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: borderColor }} />
                      Back Side (Nyuma - Kanuni, Wazo &amp; Dharura)
                    </p>
                    {renderBackCard(selectedStudent)}
                  </div>
                </div>
              </div>
            ) : activeSideView === 'flip' ? (
              /* 3D INTERACTIVE FLIP CARD */
              <div className="flex flex-col items-center gap-6">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsFlipped(!isFlipped)}
                    className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl text-xs font-black transition cursor-pointer flex items-center gap-2 shadow-md hover:scale-105 active:scale-95"
                  >
                    <RefreshCw className={`w-4 h-4 transition-transform duration-500 ${isFlipped ? 'rotate-180' : ''}`} />
                    <span>{isFlipped ? 'Geuza Kuangalia MBELE (Show Front)' : 'Geuza Kuangalia NYUMA (Show Back)'}</span>
                  </button>
                  <span className="text-xs text-slate-500 font-medium">
                    Currently Viewing: <strong className="text-slate-900">{isFlipped ? 'BACK SIDE (Nyuma)' : 'FRONT SIDE (Mbele)'}</strong>
                  </span>
                </div>

                <div className="w-full max-w-[420px] transition-all duration-300">
                  {isFlipped ? renderBackCard(selectedStudent) : renderFrontCard(selectedStudent)}
                </div>
              </div>
            ) : activeSideView === 'front' ? (
              /* Front Side Only */
              <div className="w-full max-w-[420px]">
                <p className="text-center text-xs font-black text-slate-500 uppercase mb-2">
                  Front Side Only (Mbele Tu)
                </p>
                {renderFrontCard(selectedStudent)}
              </div>
            ) : (
              /* Back Side Only */
              <div className="w-full max-w-[420px]">
                <p className="text-center text-xs font-black text-slate-500 uppercase mb-2">
                  Back Side Only (Nyuma Tu - Kanuni &amp; Mawasiliano)
                </p>
                {renderBackCard(selectedStudent)}
              </div>
            )}
          </div>
        ) : (
          /* BATCH GRID OF CARDS (Double sided or selected side for whole class) */
          <div className="space-y-6">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs text-emerald-900 font-bold no-print">
              <span>Batch Print Ready: {filteredStudents.length} candidates in selection.</span>
              <span>Click "Print Cards" at the top to print official ID sheet.</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-4">
              {filteredStudents.map(st => (
                <div key={st.id} className="space-y-4 p-5 bg-white rounded-3xl border-2 border-slate-200 shadow-sm print-cut-guide">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="font-black text-xs text-slate-900">{st.name} ({st.regNo})</span>
                    <span className="text-[10px] text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                      {st.className} {st.stream || 'A'}
                    </span>
                  </div>

                  {activeSideView === 'both' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <span className="text-[9px] font-black text-slate-400 uppercase block mb-1">Mbele / Front</span>
                        {renderFrontCard(st, true)}
                      </div>
                      <div>
                        <span className="text-[9px] font-black text-slate-400 uppercase block mb-1">Nyuma / Back</span>
                        {renderBackCard(st, true)}
                      </div>
                    </div>
                  ) : activeSideView === 'front' ? (
                    renderFrontCard(st, true)
                  ) : (
                    renderBackCard(st, true)
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Digital Profile Record Preview Modal */}
      {previewModalStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl relative animate-in fade-in zoom-in-95">
            <button 
              onClick={() => setPreviewModalStudent(null)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center border-b border-slate-100 pb-4">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto mb-2 font-bold shadow-xs">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">Verified Digital Profile Record</h3>
              <p className="text-xs text-slate-500 mt-0.5">Scanned QR Code Digital Verification for Candidate</p>
            </div>

            <div className="flex items-center gap-4 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
              <div className="w-16 h-20 bg-slate-200 rounded-xl overflow-hidden shrink-0 border border-slate-300 flex items-center justify-center">
                {previewModalStudent.passportPhoto ? (
                  <img src={previewModalStudent.passportPhoto} alt={previewModalStudent.name} className="w-full h-full object-cover" />
                ) : (
                  <User className="w-8 h-8 text-slate-400" />
                )}
              </div>
              <div className="space-y-1 min-w-0">
                <span className="px-2 py-0.5 bg-blue-100 text-blue-900 font-mono font-bold text-[10px] rounded border border-blue-200 inline-block">
                  {previewModalStudent.regNo}
                </span>
                <h4 className="font-black text-slate-900 text-base leading-snug truncate">{previewModalStudent.name}</h4>
                <p className="text-xs font-semibold text-slate-600">{previewModalStudent.className} {previewModalStudent.stream || 'A'} • {previewModalStudent.level}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Gender</span>
                <p className="font-bold text-slate-800 mt-0.5">{previewModalStudent.gender || 'Not specified'}</p>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Date of Birth</span>
                <p className="font-mono font-bold text-slate-800 mt-0.5">{previewModalStudent.dob || '2010-01-01'}</p>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 col-span-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Parent / Guardian Contact</span>
                <p className="font-mono font-bold text-blue-900 mt-0.5">{previewModalStudent.parentPhone || previewModalStudent.phone || '0754 000 111'}</p>
              </div>
            </div>

            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-900 font-bold">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                Official Active Candidate Status
              </span>
              <span className="text-[9px] bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded uppercase font-black">VERIFIED</span>
            </div>

            <div className="p-3 bg-slate-100 rounded-xl text-[10px] font-mono text-slate-600 break-all select-all flex items-center justify-between gap-2">
              <span className="truncate">{getStudentProfileUrl(previewModalStudent)}</span>
              <button 
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(getStudentProfileUrl(previewModalStudent));
                  alert("Digital Profile Verification URL copied to clipboard!");
                }}
                className="px-2.5 py-1 bg-slate-800 text-white rounded font-sans font-bold text-[10px] shrink-0 cursor-pointer hover:bg-slate-900"
              >
                Copy Link
              </button>
            </div>

            <button
              type="button"
              onClick={() => setPreviewModalStudent(null)}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition cursor-pointer"
            >
              Close Digital Record
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
