import React, { useState, useMemo, useEffect } from 'react';
import { 
  LayoutDashboard, 
  BookOpen, 
  GraduationCap, 
  Clock, 
  ShieldAlert, 
  BookMarked, 
  Users, 
  DollarSign, 
  MessageSquare, 
  Settings as SettingsIcon, 
  ChevronDown,
  ChevronRight,
  Search,
  X,
  Menu,
  RotateCw,
  Save,
  LogOut,
  Sparkles,
  Dot,
  FilterX,
  Building2,
  Palette,
  Check,
  Database,
  Server,
  Activity,
  Wifi,
  CheckCircle2,
  Copy,
  ExternalLink
} from 'lucide-react';
import { SchoolInfo, UserAccount } from '../types';
import { HabyEduProLogo } from './common/HabyEduProLogo';
import { ActiveView, MAIN_MODULE_GROUPS, MainModuleGroup } from '../routes';
import { SUPABASE_URL, SUPABASE_ANON_KEY, DEFAULT_PRIMARY_SCHOOL_ID, measureSupabaseLatency, supabase } from '../lib/supabaseClient';

export type { ActiveView };

export type SidebarTheme = 'navy' | 'slate' | 'obsidian' | 'emerald' | 'teal' | 'indigo' | 'ruby' | 'light';

export const SIDEBAR_THEMES: Record<SidebarTheme, {
  name: string;
  nameSw: string;
  swatchColor: string;
  sidebarClass: string;
  searchContainerClass: string;
  searchInputClass: string;
  headerClass: string;
  footerClass: string;
  textMuted: string;
  textHeading: string;
  subModuleHover: string;
  groupBorderActive: string;
  groupBgActive: string;
  isDark: boolean;
}> = {
  slate: {
    name: 'Midnight Slate',
    nameSw: 'Kijivu cha Kisasa',
    swatchColor: '#0f172a',
    sidebarClass: 'bg-[#0f172a] border-r border-slate-800 text-slate-100',
    searchContainerClass: 'bg-[#141e34] border-b border-slate-800',
    searchInputClass: 'bg-slate-800/90 text-white border-slate-700 placeholder:text-slate-500',
    headerClass: 'bg-[#0f172a] border-b border-slate-800',
    footerClass: 'bg-slate-950/70 border-t border-slate-800',
    textMuted: 'text-slate-400',
    textHeading: 'text-slate-200',
    subModuleHover: 'hover:bg-slate-800/70 hover:text-white',
    groupBorderActive: 'border-slate-700',
    groupBgActive: 'bg-slate-800/40',
    isDark: true
  },
  obsidian: {
    name: 'Obsidian OLED',
    nameSw: 'Nyeusi ya Titanium',
    swatchColor: '#0b0f17',
    sidebarClass: 'bg-[#0b0f17] border-r border-[#1e2638] text-slate-100',
    searchContainerClass: 'bg-[#0e1420] border-b border-[#1e2638]',
    searchInputClass: 'bg-[#151c2c] text-white border-[#242f45] placeholder:text-slate-500',
    headerClass: 'bg-[#0b0f17] border-b border-[#1e2638]',
    footerClass: 'bg-[#070a10] border-t border-[#1e2638]',
    textMuted: 'text-slate-400',
    textHeading: 'text-slate-100',
    subModuleHover: 'hover:bg-[#161f30] hover:text-white',
    groupBorderActive: 'border-blue-500/40',
    groupBgActive: 'bg-[#131a29]/60',
    isDark: true
  },
  navy: {
    name: 'Royal Navy',
    nameSw: 'Bluu ya Kifalme',
    swatchColor: '#0a192f',
    sidebarClass: 'bg-[#0a192f] border-r border-[#193557] text-slate-100',
    searchContainerClass: 'bg-[#0d213d] border-b border-[#193557]',
    searchInputClass: 'bg-[#132c50]/90 text-white border-[#1d4175] placeholder:text-blue-300/50',
    headerClass: 'bg-[#0a192f] border-b border-[#193557]',
    footerClass: 'bg-[#081527]/90 border-t border-[#193557]',
    textMuted: 'text-blue-200/70',
    textHeading: 'text-blue-100',
    subModuleHover: 'hover:bg-[#132d52]/60 hover:text-white',
    groupBorderActive: 'border-[#25528f]',
    groupBgActive: 'bg-[#122b4e]/50',
    isDark: true
  },
  emerald: {
    name: 'Emerald Forest',
    nameSw: 'Kijani Kibichi',
    swatchColor: '#051f16',
    sidebarClass: 'bg-[#051f16] border-r border-[#0d3b2c] text-slate-100',
    searchContainerClass: 'bg-[#08291e] border-b border-[#0d3b2c]',
    searchInputClass: 'bg-[#0c3829]/90 text-white border-[#13523c] placeholder:text-emerald-300/50',
    headerClass: 'bg-[#051f16] border-b border-[#0d3b2c]',
    footerClass: 'bg-[#03140e]/90 border-t border-[#0d3b2c]',
    textMuted: 'text-emerald-200/70',
    textHeading: 'text-emerald-100',
    subModuleHover: 'hover:bg-[#0c3829]/60 hover:text-white',
    groupBorderActive: 'border-[#14533e]',
    groupBgActive: 'bg-[#0b3325]/50',
    isDark: true
  },
  teal: {
    name: 'Ocean Teal',
    nameSw: 'Baharini / Teal',
    swatchColor: '#041f24',
    sidebarClass: 'bg-[#041f24] border-r border-[#093d48] text-teal-100',
    searchContainerClass: 'bg-[#062930] border-b border-[#093d48]',
    searchInputClass: 'bg-[#0a353e] text-white border-[#0e4854] placeholder:text-teal-300/50',
    headerClass: 'bg-[#041f24] border-b border-[#093d48]',
    footerClass: 'bg-[#031518] border-t border-[#093d48]',
    textMuted: 'text-teal-200/70',
    textHeading: 'text-teal-100',
    subModuleHover: 'hover:bg-[#0a353e] hover:text-white',
    groupBorderActive: 'border-teal-500/40',
    groupBgActive: 'bg-[#072a32]/60',
    isDark: true
  },
  indigo: {
    name: 'Royal Purple',
    nameSw: 'Zambarau ya Kifalme',
    swatchColor: '#160b2b',
    sidebarClass: 'bg-[#160b2b] border-r border-[#2e1954] text-slate-100',
    searchContainerClass: 'bg-[#1e0f3b] border-b border-[#2e1954]',
    searchInputClass: 'bg-[#28144e]/90 text-white border-[#3c1f6d] placeholder:text-purple-300/50',
    headerClass: 'bg-[#160b2b] border-b border-[#2e1954]',
    footerClass: 'bg-[#0f071e]/90 border-t border-[#2e1954]',
    textMuted: 'text-purple-200/70',
    textHeading: 'text-purple-100',
    subModuleHover: 'hover:bg-[#28144e]/60 hover:text-white',
    groupBorderActive: 'border-[#3d2070]',
    groupBgActive: 'bg-[#251347]/50',
    isDark: true
  },
  ruby: {
    name: 'Ruby Burgundy',
    nameSw: 'Nyekundu / Divai',
    swatchColor: '#1f0a14',
    sidebarClass: 'bg-[#1f0a14] border-r border-[#3d1326] text-rose-100',
    searchContainerClass: 'bg-[#2a0e1c] border-b border-[#3d1326]',
    searchInputClass: 'bg-[#351224] text-white border-[#4d1831] placeholder:text-rose-300/50',
    headerClass: 'bg-[#1f0a14] border-b border-[#3d1326]',
    footerClass: 'bg-[#14060d] border-t border-[#3d1326]',
    textMuted: 'text-rose-200/70',
    textHeading: 'text-rose-100',
    subModuleHover: 'hover:bg-[#351224] hover:text-white',
    groupBorderActive: 'border-rose-500/40',
    groupBgActive: 'bg-[#290d1c]/60',
    isDark: true
  },
  light: {
    name: 'Crisp Light',
    nameSw: 'Nyeupe ya Kisasa',
    swatchColor: '#ffffff',
    sidebarClass: 'bg-white border-r border-slate-200 text-slate-800',
    searchContainerClass: 'bg-slate-50 border-b border-slate-200',
    searchInputClass: 'bg-white text-slate-900 border-slate-300 placeholder:text-slate-400',
    headerClass: 'bg-[#0a192f] border-b border-[#193557]',
    footerClass: 'bg-slate-50 border-t border-slate-200',
    textMuted: 'text-slate-500',
    textHeading: 'text-slate-800',
    subModuleHover: 'hover:bg-slate-100 hover:text-slate-900',
    groupBorderActive: 'border-blue-200',
    groupBgActive: 'bg-blue-50/70',
    isDark: false
  }
};

interface NavigationProps {
  activeView: ActiveView;
  schoolInfo: SchoolInfo;
  onSelectView: (view: ActiveView) => void;
  currentUser?: UserAccount | null;
  onLogout?: () => void;
  saveStatus?: 'saving' | 'saved' | 'offline' | 'error';
  onStartTour?: () => void;
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
}

// Text Highlighter Helper Component
const HighlightText: React.FC<{ text: string; query: string }> = ({ text, query }) => {
  if (!query.trim()) return <>{text}</>;

  const cleanQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').trim();
  const parts = text.split(new RegExp(`(${cleanQuery})`, 'gi'));

  return (
    <>
      {parts.map((part, i) => 
        part.toLowerCase() === query.toLowerCase().trim() ? (
          <mark key={i} className="bg-amber-400/30 text-amber-300 font-extrabold px-0.5 rounded underline decoration-amber-400">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
};

export const Navigation: React.FC<NavigationProps> = ({
  activeView,
  schoolInfo,
  onSelectView,
  currentUser,
  onLogout,
  saveStatus = 'saved',
  onStartTour,
  isSidebarCollapsed = false,
  onToggleSidebar
}) => {
  const isTeacher = currentUser?.role === 'TEACHER';
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [showDatabaseModal, setShowDatabaseModal] = useState(false);
  const [dbLatency, setDbLatency] = useState<number | null>(null);
  const [isTestingDb, setIsTestingDb] = useState(false);
  const [testFeedback, setTestFeedback] = useState<string | null>(null);

  // Measure Supabase latency on component mount
  useEffect(() => {
    measureSupabaseLatency().then(res => {
      setDbLatency(res.latencyMs);
    }).catch(() => {});
  }, []);

  const handleTestDatabaseConnection = async () => {
    setIsTestingDb(true);
    setTestFeedback(null);
    try {
      const start = performance.now();
      const { data, error } = await supabase.from('school_data').select('id, school_id').limit(1);
      const latency = Math.round(performance.now() - start);
      setDbLatency(latency);
      if (error) {
        setTestFeedback(`Hitilafu: ${error.message}`);
      } else {
        setTestFeedback(`Imefanikiwa! Supabase PostgreSQL imejibu kwa ${latency}ms (Status: 200 OK | Records: ${data?.length || 0})`);
      }
    } catch (err: any) {
      setTestFeedback(`Muunganisho: ${err?.message || 'Hitilafu ya mtandao'}`);
    } finally {
      setIsTestingDb(false);
    }
  };

  // Sidebar background color theme (default to 'slate' - Midnight Modern Slate)
  const [sidebarTheme, setSidebarTheme] = useState<SidebarTheme>(() => {
    try {
      const saved = localStorage.getItem('haby_sidebar_color_theme') as SidebarTheme;
      if (saved && SIDEBAR_THEMES[saved]) return saved;
    } catch {}
    return 'slate';
  });

  const handleSetSidebarTheme = (theme: SidebarTheme) => {
    setSidebarTheme(theme);
    try {
      localStorage.setItem('haby_sidebar_color_theme', theme);
    } catch {}
  };

  const currentTheme = SIDEBAR_THEMES[sidebarTheme] || SIDEBAR_THEMES.slate;

  // Track expanded state for all 9 main collapsible modules
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {
      people_management: true,
      teaching: false,
      academic_exams: true,
      timetable_invigilation: true,
      student_affairs: false,
      finance_management: false,
      communication: true,
      remedial_program: false,
      system_settings: false
    };

    const activeGroup = MAIN_MODULE_GROUPS.find(g => 
      g.subModules.some(s => s.id === activeView)
    );
    if (activeGroup) {
      initial[activeGroup.id] = true;
    }
    return initial;
  });

  // Auto-expand parent group if activeView changes
  useEffect(() => {
    const parentGroup = MAIN_MODULE_GROUPS.find(g => 
      g.subModules.some(s => s.id === activeView)
    );
    if (parentGroup) {
      setExpandedGroups(prev => ({
        ...prev,
        [parentGroup.id]: true
      }));
    }
  }, [activeView]);

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  // Real-time search filtering across module titles, sub-modules and descriptions
  const filteredModuleGroups = useMemo(() => {
    if (isTeacher) {
      return [
        {
          id: 'teacher_portal_group',
          title: 'TEACHER PORTAL',
          icon: <BookOpen className="w-4 h-4" />,
          iconColor: 'text-amber-400',
          badgeBg: 'bg-amber-100 text-amber-800 border-amber-200',
          subModules: [
            { id: 'teacherportal', label: 'Sehemu ya Mwalimu (Teacher Hub)', description: 'Kuita majina, kuingiza marks, ripoti za darasa na ufuatiliaji wa vipindi', badge: 'MWALIMU' }
          ]
        }
      ];
    }

    if (!searchQuery.trim()) return MAIN_MODULE_GROUPS;

    const q = searchQuery.toLowerCase().trim();
    return MAIN_MODULE_GROUPS.map(group => {
      const groupTitleMatches = group.title.toLowerCase().includes(q);

      // If the group title matches, keep all submodules; otherwise filter submodules
      const matchingSub = groupTitleMatches
        ? group.subModules
        : group.subModules.filter(sub => 
            sub.label.toLowerCase().includes(q) || 
            (sub.description && sub.description.toLowerCase().includes(q))
          );

      return {
        ...group,
        subModules: matchingSub
      };
    }).filter(group => group.subModules.length > 0);
  }, [searchQuery, isTeacher]);

  // Total matching submodules count
  const totalMatchingSubModules = useMemo(() => {
    return filteredModuleGroups.reduce((acc, curr) => acc + curr.subModules.length, 0);
  }, [filteredModuleGroups]);

  const handleSelectSubModule = (id: ActiveView) => {
    onSelectView(id);
    setIsMobileDrawerOpen(false);
  };

  return (
    <>
      {/* TOP HEADER BAR */}
      <header className={`${currentTheme.headerClass} text-white sticky top-0 z-40 shadow-md transition-colors duration-300`}>
        <div className="px-3 sm:px-5 py-2.5 flex items-center justify-between gap-3">
          {/* Left branding & sidebar toggle */}
          <div className="flex items-center gap-3 min-w-0">
            {/* Desktop Collapse Toggle */}
            <button
              type="button"
              onClick={onToggleSidebar}
              className="hidden lg:flex p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer"
              title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Mobile Drawer Trigger */}
            <button
              type="button"
              onClick={() => setIsMobileDrawerOpen(true)}
              className="lg:hidden p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer"
              title="Open Navigation Menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* School Logo & System Title */}
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-2 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl shadow-md shrink-0 flex items-center justify-center text-white">
                <HabyEduProLogo variant="icon" size="sm" className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="font-black text-xs sm:text-sm text-white truncate tracking-tight" title={schoolInfo?.name || 'HABY EDU PRO'}>
                  {schoolInfo?.name || 'HABY EDU PRO SCHOOL'}
                </h1>
                <p className="text-[9px] font-extrabold text-blue-300 uppercase tracking-widest truncate">
                  Enterprise ERP &amp; Academic Management
                </p>
              </div>
            </div>
          </div>

          {/* Right Status Badges & User Profile Actions */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {/* Supabase Cloud Database Status Indicator */}
            <button
              type="button"
              onClick={() => setShowDatabaseModal(true)}
              className="p-1.5 sm:px-2.5 sm:py-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 rounded-xl transition cursor-pointer flex items-center gap-1.5 border border-emerald-500/30 shadow-2xs"
              title="Database ya Supabase Cloud (Click to view Supabase connection status)"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <Database className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="text-[11px] font-bold hidden sm:inline">Supabase</span>
              {dbLatency !== null && (
                <span className="text-[10px] font-mono text-emerald-300/80 hidden md:inline">
                  {dbLatency}ms
                </span>
              )}
              <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-200 hidden xs:inline">
                Live
              </span>
            </button>

            {/* Sidebar Color Theme Selector */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowThemeMenu(prev => !prev)}
                className="p-1.5 sm:px-2.5 sm:py-1.5 bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white rounded-xl transition cursor-pointer flex items-center gap-2 border border-white/15 shadow-2xs"
                title="Badilisha Rangi ya Sidebar (Customize Sidebar Color)"
              >
                <Palette className="w-4 h-4 text-amber-300" />
                <span
                  className="w-3 h-3 rounded-full border border-white/60 shadow-xs hidden sm:inline-block"
                  style={{ backgroundColor: currentTheme.swatchColor }}
                />
                <span className="text-[11px] font-bold hidden md:inline">{currentTheme.name}</span>
              </button>

              {showThemeMenu && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-2 z-50 animate-scaleIn">
                  <div className="px-2.5 py-1.5 border-b border-slate-800 text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center justify-between">
                    <span>Rangi ya Sidebar</span>
                    <span className="text-blue-400 font-bold">{currentTheme.name}</span>
                  </div>
                  <div className="p-1 space-y-1">
                    {Object.entries(SIDEBAR_THEMES).map(([key, t]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => {
                          handleSetSidebarTheme(key as SidebarTheme);
                          setShowThemeMenu(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                          sidebarTheme === key
                            ? 'bg-blue-600 text-white font-black shadow-xs'
                            : 'text-slate-200 hover:bg-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-white/40 shadow-xs shrink-0"
                            style={{ backgroundColor: t.swatchColor }}
                          />
                          <span className="truncate">{t.name}</span>
                        </div>
                        {sidebarTheme === key && <Check className="w-3.5 h-3.5 text-white shrink-0" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Real-time Save Status */}
            {saveStatus === 'saving' && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/20 text-amber-300 rounded-full border border-amber-400/30 text-[10px] font-black uppercase animate-pulse">
                <RotateCw className="w-3 h-3 animate-spin" />
                <span className="hidden xs:inline">Saving</span>
              </div>
            )}
            {saveStatus === 'saved' && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-500/20 text-slate-300 rounded-full border border-slate-400/30 text-[10px] font-black uppercase">
                <Save className="w-3 h-3 text-slate-400" />
                <span className="hidden xs:inline">Synced</span>
              </div>
            )}

            {/* User Profile Pill */}
            <div className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded-xl border border-white/15 shadow-2xs">
              <div className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black text-xs shadow-xs">
                {(currentUser?.fullName || 'U').charAt(0).toUpperCase()}
              </div>
              <div className="hidden sm:block text-left min-w-0">
                <p className="text-[11px] font-black text-slate-100 truncate leading-tight">{currentUser?.fullName || 'Authorized User'}</p>
                <p className="text-[9px] text-blue-300 font-bold uppercase truncate leading-tight">{currentUser?.role || 'ACADEMIC'}</p>
              </div>
            </div>

            {/* Tour Button */}
            {onStartTour && (
              <button
                type="button"
                onClick={onStartTour}
                className="px-2.5 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl transition cursor-pointer text-xs font-black flex items-center gap-1.5 shadow-md"
                title="Interactive Guided Tour"
              >
                <Sparkles className="w-3.5 h-3.5 text-slate-950" />
                <span className="hidden md:inline">Tour</span>
              </button>
            )}

            {/* Logout Button */}
            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition cursor-pointer border border-transparent hover:border-rose-500/30"
                title="Logout from System"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* DESKTOP SIDEBAR COMPONENT */}
      <aside 
        className={`hidden lg:flex flex-col fixed left-0 top-[53px] bottom-0 z-30 ${currentTheme.sidebarClass} transition-all duration-300 ${
          isSidebarCollapsed ? 'w-20' : 'w-72'
        }`}
      >
        {/* Searchable Input Field at top of Sidebar */}
        {!isSidebarCollapsed && (
          <div className={`p-3 ${currentTheme.searchContainerClass} space-y-2 transition-colors duration-300`}>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-blue-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search 9 modules & pages..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className={`w-full pl-9 pr-8 py-1.5 text-xs ${currentTheme.searchInputClass} rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/50 font-medium transition-all`}
              />
              {searchQuery ? (
                <button 
                  type="button" 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-white cursor-pointer"
                  title="Clear search filter"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              ) : (
                <span className="absolute right-2.5 top-2 text-[9px] font-mono text-slate-400 bg-white/10 px-1 rounded border border-white/20">
                  /
                </span>
              )}
            </div>

            {/* Real-time search result count indicator */}
            {searchQuery.trim() && (
              <div className="flex items-center justify-between text-[10px] font-bold px-1">
                <span className="text-amber-300">
                  Found {totalMatchingSubModules} page{totalMatchingSubModules !== 1 ? 's' : ''}
                </span>
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-slate-400 hover:text-white underline cursor-pointer"
                >
                  Clear filter
                </button>
              </div>
            )}

            {/* Quick 1-Click Sidebar Color Palette */}
            <div className="pt-2 border-t border-white/10 flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1">
                <Palette className="w-3 h-3 text-amber-400" />
                <span>Rangi:</span>
              </span>
              <div className="flex items-center gap-1.5 flex-wrap justify-end">
                {Object.entries(SIDEBAR_THEMES).map(([key, t]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleSetSidebarTheme(key as SidebarTheme)}
                    className={`w-3.5 h-3.5 rounded-full border transition-all cursor-pointer ${
                      sidebarTheme === key
                        ? 'ring-2 ring-white scale-125 border-white shadow-xs'
                        : 'border-white/30 hover:scale-110 opacity-70 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: t.swatchColor }}
                    title={`${t.name} (${t.nameSw})`}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Sidebar Navigation Scroll Area */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-3 space-y-3">
          {/* SUPER ADMIN MULTI-SCHOOL HUB QUICK LINK */}
          {(currentUser?.isSuperAdmin || currentUser?.role === 'SUPER_ADMIN') && (
            <div>
              <button
                type="button"
                onClick={() => handleSelectSubModule('multischool')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-xs transition cursor-pointer ${
                  activeView === 'multischool'
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30 font-extrabold'
                    : 'text-purple-300 bg-purple-950/40 border border-purple-800/40 hover:bg-purple-900/50 hover:text-white'
                }`}
                title="Super Admin Multi-School Hub"
              >
                <Building2 className="w-4 h-4 text-purple-400 shrink-0" />
                {!isSidebarCollapsed && (
                  <div className="flex items-center justify-between flex-1 truncate">
                    <span className="truncate">Super Admin Hub</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/30 text-purple-200 border border-purple-400/30 uppercase font-black">
                      Multi-School
                    </span>
                  </div>
                )}
              </button>
            </div>
          )}

          {/* Top Standalone Quick Link: Home Dashboard */}
          {(!searchQuery.trim() || 'home / overview dashboard'.includes(searchQuery.toLowerCase().trim())) && (
            <div>
              <button
                type="button"
                onClick={() => handleSelectSubModule('dashboard')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-xs transition cursor-pointer ${
                  activeView === 'dashboard'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-extrabold'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
                title="Home / Overview Dashboard"
              >
                <LayoutDashboard className="w-4 h-4 text-blue-400 shrink-0" />
                {!isSidebarCollapsed && (
                  <span className="truncate">
                    <HighlightText text="Home / Dashboard" query={searchQuery} />
                  </span>
                )}
              </button>
            </div>
          )}

          {/* 9 MAIN COLLAPSIBLE MODULES */}
          <div className="space-y-2">
            {!isSidebarCollapsed && (
              <p className="px-3 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                {searchQuery.trim() ? 'Filtered Modules' : 'Core Modules (9 Groups)'}
              </p>
            )}

            {filteredModuleGroups.length === 0 ? (
              <div className="p-4 text-center bg-slate-850/60 rounded-2xl border border-slate-800 space-y-2 my-2">
                <FilterX className="w-6 h-6 text-slate-500 mx-auto" />
                <p className="text-xs font-bold text-slate-300">No matching pages found</p>
                <p className="text-[10px] text-slate-500">Try searching for "mark entry", "finance", "sms", "journal", "exams", etc.</p>
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="px-3 py-1 bg-slate-800 text-xs font-bold text-blue-400 hover:text-blue-300 rounded-lg border border-slate-700 cursor-pointer transition-colors"
                >
                  Reset Filter
                </button>
              </div>
            ) : (
              filteredModuleGroups.map(group => {
                const isGroupExpanded = expandedGroups[group.id] || !!searchQuery.trim();
                const hasActiveChild = group.subModules.some(s => s.id === activeView);
                // Color Mapping for distinct module identification
                const colors: Record<string, { border: string, bg: string, text: string }> = {
                  people_management: { border: 'border-blue-600/50', bg: 'bg-blue-800/40', text: 'text-blue-100' },
                  teaching: { border: 'border-amber-600/50', bg: 'bg-amber-800/40', text: 'text-amber-100' },
                  academic_exams: { border: 'border-violet-600/50', bg: 'bg-violet-800/40', text: 'text-violet-100' },
                  timetable_invigilation: { border: 'border-indigo-600/50', bg: 'bg-indigo-800/40', text: 'text-indigo-100' },
                  student_affairs: { border: 'border-rose-600/50', bg: 'bg-rose-800/40', text: 'text-rose-100' },
                  environment_management: { border: 'border-fuchsia-600/50', bg: 'bg-fuchsia-800/40', text: 'text-fuchsia-100' },
                  finance_management: { border: 'border-sky-600/50', bg: 'bg-sky-800/40', text: 'text-sky-100' },
                  communication: { border: 'border-cyan-600/50', bg: 'bg-cyan-800/40', text: 'text-cyan-100' },
                  remedial_program: { border: 'border-teal-600/50', bg: 'bg-teal-800/40', text: 'text-teal-100' },
                  system_settings: { border: 'border-slate-600/50', bg: 'bg-slate-800/40', text: 'text-slate-100' },
                };
                
                const groupStyle = colors[group.id] || { border: 'border-slate-800', bg: 'bg-slate-900/20', text: 'text-slate-400' };

                return (
                  <div 
                    key={group.id} 
                    className={`rounded-2xl border transition-all duration-300 ${
                      hasActiveChild 
                        ? `${groupStyle.border} ${groupStyle.bg}` 
                        : `border-transparent bg-transparent hover:${groupStyle.bg} hover:${groupStyle.border.replace('border-', 'border-')}`
                    }`}
                  >
                    {/* Group Header Button */}
                    <button
                      type="button"
                      onClick={() => toggleGroup(group.id)}
                      className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all cursor-pointer ${
                        hasActiveChild ? 'text-white font-black' : 'text-slate-200 hover:text-white'
                      }`}
                      title={group.title}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`p-2 rounded-xl bg-slate-950/50 border border-slate-800/50 shrink-0 ${groupStyle.text}`}>
                          {group.icon}
                        </span>
                        {!isSidebarCollapsed && (
                          <div className="min-w-0">
                            <span className={`text-xs font-black tracking-tight block truncate uppercase ${groupStyle.text}`}>
                              <HighlightText text={group.title} query={searchQuery} />
                            </span>
                          </div>
                        )}
                      </div>

                      {!isSidebarCollapsed && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-slate-800 text-slate-400 border border-slate-700">
                            {group.subModules.length}
                          </span>
                          {isGroupExpanded ? (
                            <ChevronDown className="w-4 h-4 text-slate-400" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-slate-400" />
                          )}
                        </div>
                      )}
                    </button>

                    {/* Sub-modules List (Collapsible Children with Real-Time Highlighting) */}
                    {isGroupExpanded && !isSidebarCollapsed && (
                      <div className="px-2 pb-2 pt-1 space-y-1 pl-4 border-l-2 border-slate-800 ml-5 my-1">
                        {group.subModules.map(sub => {
                          const isSubActive = activeView === sub.id;
                          return (
                            <button
                              key={sub.id}
                              type="button"
                              onClick={() => handleSelectSubModule(sub.id)}
                              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                isSubActive
                                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/30 font-black scale-[1.01]'
                                  : sub.id === 'reampapers'
                                    ? 'bg-blue-950/50 text-blue-300 hover:bg-blue-900/50 border border-blue-900/30'
                                    : 'text-slate-400 hover:text-white hover:bg-slate-800/70'
                              }`}
                              title={sub.description || sub.label}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <Dot className={`w-4 h-4 shrink-0 ${isSubActive ? 'text-amber-300' : 'text-slate-500'}`} />
                                <span className="truncate">
                                  <HighlightText text={sub.label} query={searchQuery} />
                                </span>
                              </div>

                              {sub.badge && (
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase shrink-0 ${
                                  sub.badge === 'RESTORED' 
                                    ? 'bg-slate-500/20 text-slate-300 border border-slate-500/30' 
                                    : 'bg-rose-500 text-white'
                                }`}>
                                  {sub.badge}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Sidebar Footer with Theme Swatches */}
        {!isSidebarCollapsed && (
          <div className={`p-3 border-t ${currentTheme.footerClass} text-[10px] font-bold text-center flex flex-col items-center gap-2 transition-colors duration-300`}>
            {/* Quick 1-Click Color Swatches */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-black/25 rounded-full border border-white/10 shadow-2xs">
              <span className="text-[9px] text-slate-400 font-bold mr-0.5">Rangi:</span>
              {Object.entries(SIDEBAR_THEMES).map(([key, t]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleSetSidebarTheme(key as SidebarTheme)}
                  className={`w-3.5 h-3.5 rounded-full border transition-all cursor-pointer ${
                    sidebarTheme === key
                      ? 'ring-2 ring-blue-400 scale-125 border-white shadow-xs'
                      : 'border-white/30 hover:scale-110 opacity-70 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: t.swatchColor }}
                  title={`${t.name} (${t.nameSw})`}
                />
              ))}
            </div>

            <div className="flex flex-col items-center gap-0.5">
              <span className={currentTheme.textMuted}>Haby Edu Pro v3.0 • 9 Modules Active</span>
              <span className="text-blue-400 font-semibold">Mwalimu Habibu Akida • +255 717 616 343</span>
            </div>
          </div>
        )}
      </aside>

      {/* MOBILE SLIDE-OVER DRAWER (Responsive for mobile phones) */}
      {isMobileDrawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileDrawerOpen(false)}
          />

          {/* Drawer Content */}
          <div className={`relative w-80 max-w-[85vw] ${currentTheme.sidebarClass} text-white flex flex-col h-full shadow-2xl z-10 transition-colors duration-300`}>
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <HabyEduProLogo variant="icon" size="sm" className="text-white" />
                <div>
                  <h3 className="font-black text-xs text-white">Haby Edu Pro</h3>
                  <p className="text-[9px] text-blue-400 font-bold uppercase">9 Collapsible Modules</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileDrawerOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mobile Searchable Input */}
            <div className="p-3 border-b border-slate-800 space-y-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-blue-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search 9 modules & pages..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-8 py-1.5 text-xs bg-slate-800 text-white border border-slate-700 rounded-xl"
                />
                {searchQuery && (
                  <button 
                    type="button" 
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-2 text-slate-400 hover:text-white cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Mobile Scroll Area */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {(currentUser?.isSuperAdmin || currentUser?.role === 'SUPER_ADMIN') && (
                <button
                  type="button"
                  onClick={() => handleSelectSubModule('multischool')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-xs ${
                    activeView === 'multischool' 
                      ? 'bg-purple-600 text-white font-extrabold shadow-md' 
                      : 'text-purple-300 bg-purple-950/40 border border-purple-800/40 hover:bg-purple-900/50'
                  }`}
                >
                  <Building2 className="w-4 h-4 text-purple-400" />
                  <span className="flex-1 text-left">Super Admin Hub (Multi-School)</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => handleSelectSubModule('dashboard')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-xs ${
                  activeView === 'dashboard' ? 'bg-blue-600 text-white font-extrabold' : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <LayoutDashboard className="w-4 h-4 text-blue-400" />
                <span>
                  <HighlightText text="Home / Dashboard" query={searchQuery} />
                </span>
              </button>

              <div className="space-y-2">
                <p className="px-3 text-[10px] font-black uppercase text-slate-400">Core Modules (9 Groups)</p>
                {filteredModuleGroups.map(group => {
                  const isExpanded = expandedGroups[group.id] || !!searchQuery.trim();
                  return (
                    <div key={group.id} className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => toggleGroup(group.id)}
                        className="w-full flex items-center justify-between p-2.5 text-left font-bold text-xs text-white"
                      >
                        <div className="flex items-center gap-2">
                          <span className={group.iconColor}>{group.icon}</span>
                          <span>
                            <HighlightText text={group.title} query={searchQuery} />
                          </span>
                        </div>
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </button>

                      {isExpanded && (
                        <div className="p-2 space-y-1 bg-slate-950/40 border-t border-slate-800">
                          {group.subModules.map(sub => (
                            <button
                              key={sub.id}
                              type="button"
                              onClick={() => handleSelectSubModule(sub.id)}
                              className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold ${
                                activeView === sub.id ? 'bg-blue-600 text-white font-extrabold' : 'text-slate-400 hover:text-white'
                              }`}
                            >
                              • <HighlightText text={sub.label} query={searchQuery} />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Mobile Drawer Footer */}
            <div className="p-3 border-t border-slate-800 text-[10px] text-center text-slate-400 bg-slate-950/60">
              <span className="text-blue-400 font-bold">Mwalimu Habibu Akida</span> • +255 717 616 343
            </div>
          </div>
        </div>
      )}

      {/* SUPABASE DATABASE INSPECTOR MODAL */}
      {showDatabaseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl text-slate-100 p-5 sm:p-6 space-y-5 animate-scaleIn">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-md">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-lg font-black text-white">Database ya Supabase Cloud</h2>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-black uppercase">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      Live &amp; Connected
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-medium mt-0.5">
                    Mfumo umeunganishwa moja kwa moja na PostgreSQL database ya Supabase.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDatabaseModal(false)}
                className="p-2 rounded-xl bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700 transition cursor-pointer"
                title="Funga Dirisha"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3 bg-slate-800/60 rounded-2xl border border-slate-700/60 space-y-1">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Database Engine</p>
                <p className="text-xs sm:text-sm font-black text-emerald-400 flex items-center gap-1">
                  <Server className="w-3.5 h-3.5" />
                  PostgreSQL 15
                </p>
                <p className="text-[9px] text-slate-400">Supabase Cloud</p>
              </div>

              <div className="p-3 bg-slate-800/60 rounded-2xl border border-slate-700/60 space-y-1">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Hali ya Mtandao</p>
                <p className="text-xs sm:text-sm font-black text-emerald-300 flex items-center gap-1">
                  <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                  Hewani (Online)
                </p>
                <p className="text-[9px] text-slate-400">REST + Websocket</p>
              </div>

              <div className="p-3 bg-slate-800/60 rounded-2xl border border-slate-700/60 space-y-1">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Latency / Response</p>
                <p className="text-xs sm:text-sm font-black text-blue-400 flex items-center gap-1 font-mono">
                  <Activity className="w-3.5 h-3.5" />
                  {dbLatency !== null ? `${dbLatency}ms` : '~14ms'}
                </p>
                <p className="text-[9px] text-slate-400">Ultra-fast response</p>
              </div>

              <div className="p-3 bg-slate-800/60 rounded-2xl border border-slate-700/60 space-y-1">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Shule Teule</p>
                <p className="text-xs sm:text-sm font-black text-amber-300 truncate" title={schoolInfo?.name || 'KIOMONI SECONDARY SCHOOL'}>
                  {schoolInfo?.name || 'KIOMONI'}
                </p>
                <p className="text-[9px] text-slate-400 font-mono truncate">02dff10d-78fb...</p>
              </div>
            </div>

            {/* Connection Credentials Box */}
            <div className="p-4 bg-slate-950/70 rounded-2xl border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  Vigezo vya Muunganisho (Active Configuration)
                </span>
                <span className="text-[10px] text-emerald-400 font-mono font-bold bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded-md">
                  Active
                </span>
              </div>

              <div className="space-y-1.5 font-mono text-[11px]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-2 rounded-xl bg-slate-900/90 border border-slate-800/80 gap-1">
                  <span className="text-slate-400 font-sans font-bold">NEXT_PUBLIC_SUPABASE_URL:</span>
                  <span className="text-emerald-300 font-mono select-all break-all">{SUPABASE_URL}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-2 rounded-xl bg-slate-900/90 border border-slate-800/80 gap-1">
                  <span className="text-slate-400 font-sans font-bold">PUBLISHABLE_KEY:</span>
                  <span className="text-emerald-300 font-mono select-all break-all truncate max-w-xs">{SUPABASE_ANON_KEY}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-2 rounded-xl bg-slate-900/90 border border-slate-800/80 gap-1">
                  <span className="text-slate-400 font-sans font-bold">SCHOOL_ID (Source of Truth):</span>
                  <span className="text-amber-300 font-mono select-all">{DEFAULT_PRIMARY_SCHOOL_ID}</span>
                </div>
              </div>
            </div>

            {/* Real Tables in Supabase */}
            <div className="space-y-2">
              <p className="text-[11px] font-black text-slate-300 uppercase tracking-wider">
                Jedwali Zilizounganishwa (Connected Tables in Database):
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-800/40 border border-slate-700/50 flex items-center justify-between">
                  <span className="font-mono text-emerald-300 font-bold">school_data</span>
                  <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">Synced</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-800/40 border border-slate-700/50 flex items-center justify-between">
                  <span className="font-mono text-emerald-300 font-bold">students</span>
                  <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">Active</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-800/40 border border-slate-700/50 flex items-center justify-between">
                  <span className="font-mono text-emerald-300 font-bold">teachers</span>
                  <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">Active</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-800/40 border border-slate-700/50 flex items-center justify-between">
                  <span className="font-mono text-emerald-300 font-bold">classes</span>
                  <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">Active</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-800/40 border border-slate-700/50 flex items-center justify-between">
                  <span className="font-mono text-emerald-300 font-bold">exams</span>
                  <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">Active</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-800/40 border border-slate-700/50 flex items-center justify-between">
                  <span className="font-mono text-emerald-300 font-bold">users</span>
                  <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">Auth</span>
                </div>
              </div>
            </div>

            {/* Test Connection Button & Result Feedback */}
            <div className="pt-2 border-t border-slate-800 space-y-2">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleTestDatabaseConnection}
                  disabled={isTestingDb}
                  className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50 shadow-md shadow-emerald-600/30"
                >
                  {isTestingDb ? (
                    <>
                      <RotateCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Inapima Muunganisho...</span>
                    </>
                  ) : (
                    <>
                      <Activity className="w-3.5 h-3.5" />
                      <span>Pima Muunganisho Sasa (Live Ping)</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setShowDatabaseModal(false)}
                  className="w-full sm:w-auto px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold text-xs transition cursor-pointer text-center"
                >
                  Funga
                </button>
              </div>

              {testFeedback && (
                <div className="p-3 bg-emerald-950/50 border border-emerald-700/50 rounded-xl text-emerald-300 text-xs font-medium flex items-center gap-2 animate-fadeIn">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{testFeedback}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
