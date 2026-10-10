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
  Building2
} from 'lucide-react';
import { SchoolInfo, UserAccount } from '../types';
import { HabyEduProLogo } from './common/HabyEduProLogo';
import { ActiveView, MAIN_MODULE_GROUPS, MainModuleGroup } from '../routes';

export type { ActiveView };

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
      <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40 shadow-md">
        <div className="px-3 sm:px-5 py-2.5 flex items-center justify-between gap-3">
          {/* Left branding & sidebar toggle */}
          <div className="flex items-center gap-3 min-w-0">
            {/* Desktop Collapse Toggle */}
            <button
              type="button"
              onClick={onToggleSidebar}
              className="hidden lg:flex p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
              title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Mobile Drawer Trigger */}
            <button
              type="button"
              onClick={() => setIsMobileDrawerOpen(true)}
              className="lg:hidden p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
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
                <p className="text-[9px] font-extrabold text-blue-400 uppercase tracking-widest truncate">
                  Enterprise ERP &amp; Academic Management
                </p>
              </div>
            </div>
          </div>

          {/* Right Status Badges & User Profile Actions */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Real-time Save Status */}
            {saveStatus === 'saving' && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/20 text-amber-300 rounded-full border border-amber-400/30 text-[10px] font-black uppercase animate-pulse">
                <RotateCw className="w-3 h-3 animate-spin" />
                <span className="hidden xs:inline">Saving</span>
              </div>
            )}
            {saveStatus === 'saved' && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/20 text-emerald-300 rounded-full border border-emerald-400/30 text-[10px] font-black uppercase">
                <Save className="w-3 h-3 text-emerald-400" />
                <span className="hidden xs:inline">Synced</span>
              </div>
            )}

            {/* User Profile Pill */}
            <div className="flex items-center gap-2 bg-slate-800/90 px-3 py-1 rounded-xl border border-slate-700 shadow-2xs">
              <div className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black text-xs shadow-xs">
                {(currentUser?.fullName || 'U').charAt(0).toUpperCase()}
              </div>
              <div className="hidden sm:block text-left min-w-0">
                <p className="text-[11px] font-black text-slate-100 truncate leading-tight">{currentUser?.fullName || 'Authorized User'}</p>
                <p className="text-[9px] text-blue-400 font-bold uppercase truncate leading-tight">{currentUser?.role || 'ACADEMIC'}</p>
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
        className={`hidden lg:flex flex-col fixed left-0 top-[53px] bottom-0 z-30 bg-gradient-to-br from-emerald-950 via-emerald-900 to-slate-950 border-r border-emerald-900/50 text-slate-200 transition-all duration-300 ${
          isSidebarCollapsed ? 'w-20' : 'w-72'
        }`}
      >
        {/* Searchable Input Field at top of Sidebar */}
        {!isSidebarCollapsed && (
          <div className="p-3 border-b border-slate-800/80 bg-slate-900/90 space-y-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-blue-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search 9 modules & pages..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-1.5 text-xs bg-slate-800/90 text-white border border-slate-700/80 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/50 placeholder:text-slate-500 font-medium transition-all"
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
                <span className="absolute right-2.5 top-2 text-[9px] font-mono text-slate-500 bg-slate-800 px-1 rounded border border-slate-700">
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
                const borderClass = group.iconColor.replace('text-', 'border-');

                return (
                  <div 
                    key={group.id} 
                    className={`rounded-2xl border transition-all duration-300 ${
                      hasActiveChild 
                        ? `${borderClass} bg-emerald-900/20` 
                        : 'border-transparent bg-transparent hover:bg-emerald-800/20 hover:border-emerald-800/30'
                    }`}
                  >
                    {/* Group Header Button */}
                    <button
                      type="button"
                      onClick={() => toggleGroup(group.id)}
                      className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all cursor-pointer ${
                        hasActiveChild ? 'text-white font-black' : 'text-slate-200 hover:text-emerald-100'
                      }`}
                      title={group.title}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`p-2 rounded-xl bg-emerald-950/50 border border-emerald-900/30 shrink-0 ${group.iconColor}`}>
                          {group.icon}
                        </span>
                        {!isSidebarCollapsed && (
                          <div className="min-w-0">
                            <span className="text-xs font-black tracking-tight block truncate uppercase">
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
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
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

        {/* Sidebar Footer */}
        {!isSidebarCollapsed && (
          <div className="p-3 border-t border-slate-800 text-[10px] font-bold text-slate-400 text-center flex flex-col items-center gap-0.5 bg-slate-950/40">
            <span>Haby Edu Pro v3.0 • 9 Modules Active</span>
            <span className="text-blue-400 font-semibold">Mwalimu Habibu Akida • +255 717 616 343</span>
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
          <div className="relative w-80 max-w-[85vw] bg-slate-900 text-white flex flex-col h-full shadow-2xl z-10 border-r border-slate-800">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
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
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer"
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
    </>
  );
};
