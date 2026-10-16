import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Sparkles, 
  UserPlus, 
  Users, 
  Calendar, 
  FileText, 
  CheckCircle2, 
  Megaphone, 
  CreditCard, 
  Wallet, 
  BookOpen, 
  Building2, 
  ArrowRight,
  Command,
  X
} from 'lucide-react';
import { ActiveView } from '../../routes';

export interface CommandPaletteAction {
  id: string;
  title: string;
  category: 'Wanafunzi' | 'Academics & Timetable' | 'Finance & Admin' | 'General';
  icon: any;
  view: ActiveView | string;
  keywords: string[];
  description: string;
}

interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectView: (view: any) => void;
  schoolName?: string;
}

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({
  isOpen,
  onClose,
  onSelectView,
  schoolName
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const actions: CommandPaletteAction[] = [
    {
      id: 'add-student',
      title: 'Add Student / Usajili wa Wanafunzi',
      category: 'Wanafunzi',
      icon: UserPlus,
      view: 'students',
      keywords: ['student', 'mwanafunzi', 'usajili', 'add student', 'regno'],
      description: 'Sajili mwanafunzi mpya, hariri taarifa au angalia orodha.'
    },
    {
      id: 'quick-search-student',
      title: 'Quick Search Student & Profiles',
      category: 'Wanafunzi',
      icon: Search,
      view: 'students',
      keywords: ['search', 'tafuta', 'mwanafunzi', 'profile', 'verify'],
      description: 'Tafuta mwanafunzi kwa haraka kwa jina au namba ya usajili.'
    },
    {
      id: 'view-attendance',
      title: 'View Attendance / Mahudhurio ya Vipindi',
      category: 'Wanafunzi',
      icon: CheckCircle2,
      view: 'dailytracker',
      keywords: ['attendance', 'mahudhurio', 'hudhurio', 'daily', 'tracker'],
      description: 'Angalia na urekodi mahudhurio ya wanafunzi darasani.'
    },
    {
      id: 'generate-timetable',
      title: 'Generate & Edit Timetable (Ratiba)',
      category: 'Academics & Timetable',
      icon: Calendar,
      view: 'timetable',
      keywords: ['timetable', 'ratiba', 'periods', 'vipindi', 'generate'],
      description: 'Tengeneza, hariri au chapisha ratiba ya masomo ya shule.'
    },
    {
      id: 'schedule-exam',
      title: 'Schedule Exam & Enter Marks (Matokeo)',
      category: 'Academics & Timetable',
      icon: FileText,
      view: 'results',
      keywords: ['exam', 'mitihani', 'marks', 'results', 'matokeo', 'schedule'],
      description: 'Weka mitihani mipya, ingiza alama na chapisha ripoti card.'
    },
    {
      id: 'remedial-timetable',
      title: 'Remedial Timetable (Masomo ya Ziada)',
      category: 'Academics & Timetable',
      icon: Calendar,
      view: 'remedialtimetable',
      keywords: ['remedial', 'ziada', 'jioni', 'asubuhi', 'weekend'],
      description: 'Panga ratiba za masomo ya ziada na usimamizi wake.'
    },
    {
      id: 'issue-notice',
      title: 'Issue Notice / Matangazo na SMS',
      category: 'General',
      icon: Megaphone,
      view: 'sms',
      keywords: ['notice', 'announcement', 'sms', 'matangazo', 'broadcast'],
      description: 'Tuma matangazo au ujumbe mfupi wa SMS kwa wazazi na walimu.'
    },
    {
      id: 'add-teacher',
      title: 'Add Teacher / Walimu na Watumishi',
      category: 'Finance & Admin',
      icon: Users,
      view: 'teachers',
      keywords: ['teacher', 'mwalimu', 'staff', 'faculty'],
      description: 'Simamia walimu, idhini ya usimamizi wa mitihani na majukumu.'
    },
    {
      id: 'saas-finance',
      title: 'SaaS Finance & Fee Ledger (Ada)',
      category: 'Finance & Admin',
      icon: Wallet,
      view: 'finance',
      keywords: ['finance', 'ada', 'fees', 'michango', 'ledger', 'payment'],
      description: 'Fuatilia malipo ya ada, michango na matumizi ya shule.'
    },
    {
      id: 'student-id',
      title: 'Student ID Card Generator',
      category: 'Wanafunzi',
      icon: CreditCard,
      view: 'studentid',
      keywords: ['id', 'card', 'vitambulisho', 'generator'],
      description: 'Tengeneza na uchapishe vitambulisho vya wanafunzi.'
    },
    {
      id: 'scheme-of-work',
      title: 'Scheme of Work & Lesson Plans',
      category: 'Academics & Timetable',
      icon: BookOpen,
      view: 'schemeofwork',
      keywords: ['scheme', 'work', 'lesson', 'plan', 'maandalizi'],
      description: 'Angalia na unda mipango ya kazi na maandalizi ya masomo.'
    },
    {
      id: 'multischool-portal',
      title: 'Multi-School Admin Portal',
      category: 'Finance & Admin',
      icon: Building2,
      view: 'multischool',
      keywords: ['multischool', 'superadmin', 'schools', 'shule'],
      description: 'Simamia shule zote zilizo chini ya mfumo (Super Admin).'
    }
  ];

  const filteredActions = actions.filter(action => {
    const q = query.toLowerCase().trim();
    if (!q) return true;
    return (
      action.title.toLowerCase().includes(q) ||
      action.description.toLowerCase().includes(q) ||
      action.category.toLowerCase().includes(q) ||
      action.keywords.some(kw => kw.toLowerCase().includes(q))
    );
  });

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  if (!isOpen) return null;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % Math.max(1, filteredActions.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + filteredActions.length) % Math.max(1, filteredActions.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredActions[selectedIndex]) {
        onSelectView(filteredActions[selectedIndex].view);
        onClose();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-start justify-center pt-20 px-4 animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onKeyDown={handleKeyDown}
      >
        {/* Search Header */}
        <div className="p-4 border-b border-slate-100 flex items-center gap-3 bg-slate-50/70">
          <Command className="w-5 h-5 text-blue-600 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search actions, students, timetable, exams, fees... (Type anything)"
            className="w-full bg-transparent text-slate-900 font-bold text-sm outline-none placeholder:text-slate-400 placeholder:font-normal"
          />
          {query && (
            <button 
              onClick={() => setQuery('')}
              className="text-xs font-bold text-slate-400 hover:text-slate-600 px-2 py-1 rounded-lg bg-slate-200/60 cursor-pointer"
            >
              Clear
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-200/60 text-slate-500 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Actions List */}
        <div className="max-h-[380px] overflow-y-auto p-3 space-y-1">
          {filteredActions.length === 0 ? (
            <div className="py-12 text-center text-slate-500 space-y-2">
              <Sparkles className="w-8 h-8 text-slate-300 mx-auto animate-pulse" />
              <p className="text-sm font-bold">Hakuna matokeo yaliyopatikana kwa "{query}"</p>
              <p className="text-xs text-slate-400">Jaribu kutafuta neno lingine kama "student", "mitihani", au "ratiba".</p>
            </div>
          ) : (
            filteredActions.map((action, idx) => {
              const IconComp = action.icon;
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={action.id}
                  onClick={() => {
                    onSelectView(action.view);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between p-3 rounded-2xl transition cursor-pointer ${
                    isSelected ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-slate-100 text-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-blue-600'
                    }`}>
                      <IconComp className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-sm">{action.title}</span>
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                        }`}>
                          {action.category}
                        </span>
                      </div>
                      <p className={`text-xs mt-0.5 ${isSelected ? 'text-blue-100' : 'text-slate-500'}`}>
                        {action.description}
                      </p>
                    </div>
                  </div>

                  <ArrowRight className={`w-4 h-4 shrink-0 transition-transform ${isSelected ? 'translate-x-1 text-white' : 'text-slate-400'}`} />
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-medium">
          <div className="flex items-center gap-3">
            <span>Navigation: <strong className="text-slate-600">↑↓</strong> Navigate</span>
            <span>Select: <strong className="text-slate-600">Enter ↵</strong></span>
            <span>Close: <strong className="text-slate-600">Esc</strong></span>
          </div>
          {schoolName && <span className="font-bold text-slate-600">{schoolName}</span>}
        </div>
      </div>
    </div>
  );
};
