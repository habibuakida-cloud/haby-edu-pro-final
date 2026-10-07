import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, Save, RefreshCw, Check, School, Clock, Sliders, Download, Upload, 
  FileCode, ExternalLink, Users, KeyRound, UserPlus, Trash2, Eye, EyeOff, Shield, Globe, 
  Activity, Power, PowerOff, AlertCircle, Info, Search, Filter, History, FileSpreadsheet, 
  UserCheck, FileText, Layers, ArrowUpDown, CheckCircle, ChevronDown, Sparkles, Calendar,
  LogIn, Copy, CheckCheck, BookOpen, Key, Edit, Github
} from 'lucide-react';
import { 
  SchoolInfo, PeriodSetting, TimetableAssignment, UserAccount, Student, Teacher,
  School as SchoolType, SchoolStatus, ActivityLog, ActivityCategory, ActivityAction,
  InstitutionalLevel, StreamSetting
} from '../types';
import { PeriodSettingsManager } from './Timetable/PeriodSettingsManager';
import { ClassStreamManagerModal } from './common/ClassStreamManagerModal';
import { DatabaseHealthWidget } from './common/DatabaseHealthWidget';
import { INITIAL_STREAM_SETTINGS } from '../constants/defaults';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { SUBJECT_LIST, DEFAULT_SCHOOL_LOGO, PRESET_SCHOOL_LOGOS, DEFAULT_APP_DATA } from '../constants/defaults';
import { saveSchoolData } from '../lib/firestoreService';

const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

interface SettingsViewProps {
  schoolInfo: SchoolInfo;
  onSaveSchoolInfo: (info: SchoolInfo) => void;
  onResetToDefaults: () => void;
  periodSettings?: PeriodSetting[];
  onUpdatePeriodSettings?: (settings: PeriodSetting[]) => void;
  streamSettings?: StreamSetting[];
  onUpdateStreamSettings?: (settings: StreamSetting[]) => void;
  assignments?: TimetableAssignment[];
  onUpdateAssignments?: (assignments: TimetableAssignment[]) => void;
  dayThemes?: Record<string, string>;
  teachers?: Teacher[];
  onExportJson?: () => void;
  onImportJson?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  users?: UserAccount[];
  onUpdateUsers?: (users: UserAccount[]) => void;
  currentUser?: UserAccount | null;
  students?: Student[];
  activityLogs?: ActivityLog[];
  onClearActivityLogs?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  schoolInfo,
  onSaveSchoolInfo,
  onResetToDefaults,
  periodSettings = [],
  onUpdatePeriodSettings,
  streamSettings = INITIAL_STREAM_SETTINGS,
  onUpdateStreamSettings,
  assignments = [],
  onUpdateAssignments,
  dayThemes,
  teachers = [],
  onExportJson,
  onImportJson,
  users = [],
  onUpdateUsers,
  currentUser,
  students = [],
  activityLogs = [],
  onClearActivityLogs
}) => {
  const [activeTab, setActiveTab] = useState<'periods' | 'classes' | 'school' | 'users' | 'audit' | 'network' | 'github' | 'backup' | 'dbhealth'>('periods');
  const [allSchools, setAllSchools] = useState<SchoolType[]>([]);
  const { switchSchool } = useAuth();
  const [schoolsLoading, setSchoolsLoading] = useState(false);

  // GitHub Integration State
  const [githubToken, setGithubToken] = useState<string | null>(() => localStorage.getItem('haby_github_token'));
  const [githubRepoName, setGithubRepoName] = useState<string>(() => localStorage.getItem('haby_github_repo') || 'habibuakida-cloud/haby-edu-pro-3A-pro');
  const [pushStatus, setPushStatus] = useState<'idle' | 'pushing' | 'success' | 'error'>('idle');
  const [pushError, setPushError] = useState<string | null>(null);

  // Backup State
  const [backupLoading, setBackupLoading] = useState(false);

  const handleDownloadBackup = async () => {
    setBackupLoading(true);
    try {
      window.location.href = '/api/project/zip';
      setTimeout(() => setBackupLoading(false), 2000);
    } catch (err) {
      console.error(err);
      alert('Failed to trigger backup download');
      setBackupLoading(false);
    }
  };

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'GITHUB_AUTH_SUCCESS' && event.data.token) {
        setGithubToken(event.data.token);
        localStorage.setItem('haby_github_token', event.data.token);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleGithubConnect = async () => {
    try {
      const resp = await fetch(`/api/auth/github/url?origin=${encodeURIComponent(window.location.origin)}`);
      const data = await resp.json();
      if (data.url) {
        window.open(data.url, 'github_oauth', 'width=600,height=700');
      } else {
        alert(data.error || 'Failed to get auth URL');
      }
    } catch (err) {
      console.error(err);
      alert('Network error while connecting to GitHub');
    }
  };

  const handleGithubPush = async () => {
    if (!githubToken) return;
    setPushStatus('pushing');
    setPushError(null);
    localStorage.setItem('haby_github_repo', githubRepoName);

    try {
      const resp = await fetch('/api/github/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: githubToken,
          repoName: githubRepoName,
          commitMessage: `Cloud Backup: ${new Date().toLocaleString()}`
        })
      });
      const data = await resp.json();
      if (data.success) {
        setPushStatus('success');
        setTimeout(() => setPushStatus('idle'), 5000);
      } else {
        setPushStatus('error');
        setPushError(data.error);
      }
    } catch (err: any) {
      setPushStatus('error');
      setPushError(err.message);
    }
  };
  
  // Audit log filters & state
  const [logSearch, setLogSearch] = useState('');
  const [logCategoryFilter, setLogCategoryFilter] = useState<'ALL' | ActivityCategory>('ALL');
  const [logRoleFilter, setLogRoleFilter] = useState<'ALL' | 'HEADMASTER' | 'ACADEMIC' | 'TEACHER'>('ALL');
  const [logSortOrder, setLogSortOrder] = useState<'NEWEST' | 'OLDEST'>('NEWEST');
  
  // New school form state (Super Admin)
  const [newSchoolName, setNewSchoolName] = useState('');
  const [newSchoolAddress, setNewSchoolAddress] = useState('');
  const [newSchoolPhone, setNewSchoolPhone] = useState('');
  const [newSchoolEmail, setNewSchoolEmail] = useState('');
  const [newSchoolPrincipal, setNewSchoolPrincipal] = useState('');
  const [newSchoolMotto, setNewSchoolMotto] = useState('');
  const [creatingSchool, setCreatingSchool] = useState(false);
  const [activeSchoolSuccessMsg, setActiveSchoolSuccessMsg] = useState<string | null>(null);

  // Super Admin: Fetch all schools
  useEffect(() => {
    if (!currentUser?.isSuperAdmin || activeTab !== 'network') return;

    setSchoolsLoading(true);
    const fetchSchools = async () => {
      try {
        const { data } = await supabase.from('schools').select('*');
        if (data && Array.isArray(data)) {
          setAllSchools([...data].sort((a, b) => (a.name || '').localeCompare(b.name || '')));
        }
      } catch (err) {
        console.warn("Error fetching schools from supabase:", err);
      } finally {
        setSchoolsLoading(false);
      }
    };
    fetchSchools();
  }, [currentUser, activeTab]);

  const handleCreateSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSchoolName.trim()) return;

    setCreatingSchool(true);
    try {
      const newSchoolId = generateUUID();
      
      // 1. Insert into Supabase 'schools' table (valid columns only)
      const { error: schoolError } = await supabase.from('schools').insert({
        id: newSchoolId,
        name: newSchoolName.trim(),
        code: `CTR-${Date.now().toString().slice(-4)}`,
        district: newSchoolAddress.trim() || 'Tanzania',
        created_at: new Date().toISOString()
      });

      if (schoolError) throw new Error(`Supabase School Error: ${schoolError.message}`);

      // 2. Initialize school snapshot in Firestore (durable store)
      const fullSchoolData = {
        ...DEFAULT_APP_DATA,
        schoolInfo: {
          name: newSchoolName.trim(),
          address: newSchoolAddress.trim() || 'P.O. Box, Tanzania',
          phone: newSchoolPhone.trim() || '+255',
          email: newSchoolEmail.trim() || 'info@school.ac.tz',
          principal: newSchoolPrincipal.trim() || 'Headmaster',
          motto: newSchoolMotto.trim() || 'Education & Excellence',
          logo: DEFAULT_SCHOOL_LOGO,
          institutionalLevels: ['NURSERY', 'PRIMARY', 'SECONDARY']
        }
      };
      
      await saveSchoolData(newSchoolId, fullSchoolData);

      // 3. Pre-populate Supabase core tables (mapped correctly)
      if (DEFAULT_APP_DATA.students && DEFAULT_APP_DATA.students.length > 0) {
        const mappedStudents = DEFAULT_APP_DATA.students.map(s => ({
          id: generateUUID(),
          school_id: newSchoolId,
          name: s.name,
          class: s.className || 'Form 1',
          stream: s.stream || 'STREAM A',
          gender: s.sex === 'F' ? 'Female' : 'Male',
          created_at: new Date().toISOString()
        }));
        await supabase.from('students').insert(mappedStudents);
      }

      if (DEFAULT_APP_DATA.teachers && DEFAULT_APP_DATA.teachers.length > 0) {
        const mappedTeachers = DEFAULT_APP_DATA.teachers.map(t => ({
          id: generateUUID(),
          school_id: newSchoolId,
          name: t.name,
          subject: t.subjects[0] || 'General',
          created_at: new Date().toISOString()
        }));
        await supabase.from('teachers').insert(mappedTeachers);
      }

      const { data: updatedList } = await supabase.from('schools').select('*');
      if (updatedList) {
        setAllSchools([...updatedList].sort((a, b) => (a.name || '').localeCompare(b.name || '')));
      }

      setNewSchoolName('');
      setNewSchoolAddress('');
      setNewSchoolPhone('');
      setNewSchoolEmail('');
      setNewSchoolPrincipal('');
      setNewSchoolMotto('');
      setUserMsg(`School "${newSchoolName}" registered successfully!`);
      setTimeout(() => setUserMsg(null), 4000);
    } catch (err: any) {
      console.error("Error creating school:", err);
      setUserMsg(`Failed to register school: ${err.message}`);
      setTimeout(() => setUserMsg(null), 5000);
    } finally {
      setCreatingSchool(false);
    }
  };

  const updateSchoolStatus = async (schoolId: string, status: SchoolStatus) => {
    try {
      await supabase.from('schools').update({ code: status }).eq('id', schoolId);
      setAllSchools(prev => prev.map(s => s.id === schoolId ? { ...s, status } : s));
      setUserMsg(`School status updated to ${status}`);
      setTimeout(() => setUserMsg(null), 3000);
    } catch (err) {
      console.error("Error updating school status:", err);
      setUserMsg("Failed to update status");
      setTimeout(() => setUserMsg(null), 3000);
    }
  };

  const handleSuperAdminSwitchSchool = async (school: SchoolType) => {
    try {
      await switchSchool(school.id);
      setActiveSchoolSuccessMsg(`Switched active school to: ${school.name}`);
      setTimeout(() => setActiveSchoolSuccessMsg(null), 4000);
    } catch (err) {
      console.error("Error switching school:", err);
    }
  };

  const [name, setName] = useState(schoolInfo.name || '');
  const [schoolNumber, setSchoolNumber] = useState(schoolInfo.schoolNumber || 'S.0123');
  const [address, setAddress] = useState(schoolInfo.address || '');
  const [phone, setPhone] = useState(schoolInfo.phone || '0717616343');
  const [email, setEmail] = useState(schoolInfo.email || '');
  const [motto, setMotto] = useState(schoolInfo.motto || '');
  const [principal, setPrincipal] = useState(schoolInfo.principal || '');
  const [logo, setLogo] = useState<string>(schoolInfo.logo || DEFAULT_SCHOOL_LOGO);
  const [institutionalLevels, setInstitutionalLevels] = useState<InstitutionalLevel[]>(
    schoolInfo.institutionalLevels || ['NURSERY', 'PRIMARY', 'SECONDARY']
  );
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Sync state when schoolInfo changes
  useEffect(() => {
    if (schoolInfo) {
      setName(schoolInfo.name || '');
      setSchoolNumber(schoolInfo.schoolNumber || 'S.0123');
      setAddress(schoolInfo.address || '');
      setPhone(schoolInfo.phone || '0717616343');
      setEmail(schoolInfo.email || '');
      setMotto(schoolInfo.motto || '');
      setPrincipal(schoolInfo.principal || '');
      setLogo(schoolInfo.logo || DEFAULT_SCHOOL_LOGO);
      setInstitutionalLevels(schoolInfo.institutionalLevels || ['NURSERY', 'PRIMARY', 'SECONDARY']);
    }
  }, [schoolInfo]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file (PNG, JPG, or SVG).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 256;
        let w = img.width;
        let h = img.height;
        if (w > h) {
          if (w > maxDim) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          }
        } else {
          if (h > maxDim) {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL('image/png', 0.9);
        setLogo(dataUrl);
      };
    };
    reader.readAsDataURL(file);
  };

  // Super Admin Register School Administrator (Headmaster) state
  const [targetSchoolId, setTargetSchoolId] = useState<string>('');
  const [adminFullName, setAdminFullName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [adminRegisterMsg, setAdminRegisterMsg] = useState<{ type: 'success' | 'error'; text: string; creds?: { email: string; pass: string; school: string } } | null>(null);
  const [registeringAdmin, setRegisteringAdmin] = useState(false);

  // New user form state
  const [newEmail, setNewEmail] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newRole, setNewRole] = useState<UserAccount['role']>('TEACHER');
  const [newPassword, setNewPassword] = useState('');
  const [showFormPassword, setShowFormPassword] = useState(false);
  const [newAssignedSubjects, setNewAssignedSubjects] = useState<string[]>([]);
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [userMsg, setUserMsg] = useState<string | null>(null);

  const handleGeneratePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let pass = '';
    for (let i = 0; i < 8; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(pass);
    setShowFormPassword(true);
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim() || !newFullName.trim()) {
      alert('Please fill in Full Name and Email.');
      return;
    }

    if (!newPassword.trim() || newPassword.trim().length < 6) {
      alert('Please assign a secure password of at least 6 characters.');
      return;
    }

    if (users.some(u => u.email.toLowerCase() === newEmail.trim().toLowerCase())) {
      alert(`The email "${newEmail.trim()}" is already in use.`);
      return;
    }

    const newUser: UserAccount = {
      id: `usr_${Date.now()}`,
      email: newEmail.trim().toLowerCase(),
      fullName: newFullName.trim(),
      role: newRole,
      password: newPassword.trim(),
      assignedSubjects: newRole === 'TEACHER' ? newAssignedSubjects : undefined,
      schoolId: currentUser?.schoolId || 'DEMO_SCHOOL'
    };

    try {
      await supabase.from('users').insert({
        ...newUser,
        school_id: newUser.schoolId,
        created_at: new Date().toISOString()
      });
    } catch (e) {
      console.warn("Could not save to supabase users table:", e);
    }

    const updated = [...users, newUser];
    if (onUpdateUsers) {
      onUpdateUsers(updated);
      setNewEmail('');
      setNewFullName('');
      setNewPassword('');
      setNewAssignedSubjects([]);
      setUserMsg(`Staff member "${newUser.fullName}" registered with password "${newUser.password}".`);
      setTimeout(() => setUserMsg(null), 5000);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const togglePasswordReveal = (userId: string) => {
    setRevealedPasswords(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  const handleDeleteUser = (userId: string, fullName: string) => {
    if (users.length <= 1) {
      alert('Cannot delete the only remaining account.');
      return;
    }
    if (currentUser && currentUser.id === userId) {
      alert('You cannot delete your own active account.');
      return;
    }
    if (confirm(`Are you sure you want to delete user account for "${fullName}"?`)) {
      const updated = users.filter(u => u.id !== userId);
      if (onUpdateUsers) {
        onUpdateUsers(updated);
      }
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSchoolInfo({
      name: name.trim() || 'HabyEduPro3A',
      schoolNumber: schoolNumber.trim() || 'S.0123',
      address: address.trim(),
      phone: phone.trim() || '0717616343',
      email: email.trim(),
      motto: motto.trim(),
      principal: principal.trim(),
      logo: logo || DEFAULT_SCHOOL_LOGO
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleGenerateAdminPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let pass = '';
    for (let i = 0; i < 8; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setAdminPassword(pass);
    setShowAdminPassword(true);
  };

  const handleSuperAdminRegisterSchoolAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetSchoolId) {
      alert('Please select the target school.');
      return;
    }
    if (!adminFullName.trim() || !adminEmail.trim()) {
      alert('Please fill in Admin Full Name and Email.');
      return;
    }
    if (!adminPassword.trim() || adminPassword.trim().length < 6) {
      alert('Please assign a secure password of at least 6 characters.');
      return;
    }

    setRegisteringAdmin(true);
    try {
      const targetSchool = allSchools.find(s => s.id === targetSchoolId);
      const schoolDisplayName = targetSchool ? targetSchool.name : targetSchoolId;
      const normalizedEmail = adminEmail.trim().toLowerCase();

      const newAdminUserId = generateUUID();
      const newAdminUser = {
        id: newAdminUserId,
        email: normalizedEmail,
        full_name: adminFullName.trim(),
        role: 'HEADMASTER',
        school_id: targetSchoolId,
        created_at: new Date().toISOString()
      };

      const { error: userError } = await supabase.from('users').insert(newAdminUser);
      if (userError) throw new Error(`Supabase User Error: ${userError.message}`);

      await supabase.from('schools').update({
        code: `ADM-${newAdminUserId.slice(0, 4)}`, // Optional: update something if needed
      }).eq('id', targetSchoolId);

      setAdminRegisterMsg({
        type: 'success',
        text: `School Administrator "${adminFullName.trim()}" registered successfully! They can now log in to manage "${schoolDisplayName}" and register their school staff.`,
        creds: {
          email: normalizedEmail,
          pass: adminPassword.trim(),
          school: schoolDisplayName
        }
      });

      setAdminFullName('');
      setAdminEmail('');
      setAdminPassword('');
    } catch (err: any) {
      console.error("Error registering school admin:", err);
      setAdminRegisterMsg({
        type: 'error',
        text: `Failed to register school admin: ${err.message || 'Firestore write error'}`
      });
    } finally {
      setRegisteringAdmin(false);
    }
  };

  // Activity Log Helpers
  const handleExportLogsCsv = () => {
    if (!activityLogs || activityLogs.length === 0) {
      alert('No activity logs to export.');
      return;
    }
    const headers = ['Timestamp', 'Action', 'Category', 'User Name', 'Role', 'Email', 'Title', 'Description'];
    const rows = activityLogs.map(l => [
      `"${new Date(l.timestamp).toLocaleString()}"`,
      `"${l.action || ''}"`,
      `"${l.category || ''}"`,
      `"${(l.userName || '').replace(/"/g, '""')}"`,
      `"${l.userRole || ''}"`,
      `"${l.userEmail || ''}"`,
      `"${(l.title || '').replace(/"/g, '""')}"`,
      `"${(l.description || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `audit_logs_${schoolInfo.name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const filteredLogs = (activityLogs || []).filter(log => {
    if (logCategoryFilter !== 'ALL' && log.category !== logCategoryFilter) return false;
    if (logRoleFilter !== 'ALL' && log.userRole !== logRoleFilter) return false;
    if (logSearch.trim()) {
      const q = logSearch.toLowerCase();
      const matchTitle = log.title?.toLowerCase().includes(q);
      const matchDesc = log.description?.toLowerCase().includes(q);
      const matchUser = log.userName?.toLowerCase().includes(q) || log.userEmail?.toLowerCase().includes(q);
      const matchCat = log.category?.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc && !matchUser && !matchCat) return false;
    }
    return true;
  }).sort((a, b) => {
    const timeA = new Date(a.timestamp).getTime();
    const timeB = new Date(b.timestamp).getTime();
    return logSortOrder === 'NEWEST' ? timeB - timeA : timeA - timeB;
  });

  const timetableCount = (activityLogs || []).filter(l => l.category === 'timetable').length;
  const teacherCount = (activityLogs || []).filter(l => l.category === 'teachers').length;
  const studentCount = (activityLogs || []).filter(l => l.category === 'students').length;
  const examCount = (activityLogs || []).filter(l => l.category === 'exams' || l.category === 'invigilation').length;
  const settingsCount = (activityLogs || []).filter(l => l.category === 'settings').length;

  const getCategoryMeta = (cat: ActivityCategory) => {
    switch (cat) {
      case 'timetable':
        return {
          label: 'Timetable & Schedule',
          badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
          icon: <Clock className="w-3.5 h-3.5 text-blue-600" />
        };
      case 'teachers':
        return {
          label: 'Staff & Teachers',
          badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          icon: <Users className="w-3.5 h-3.5 text-emerald-600" />
        };
      case 'students':
        return {
          label: 'Students & Records',
          badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
          icon: <UserCheck className="w-3.5 h-3.5 text-purple-600" />
        };
      case 'exams':
      case 'invigilation':
        return {
          label: 'Exams & Invigilation',
          badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
          icon: <FileText className="w-3.5 h-3.5 text-amber-600" />
        };
      case 'settings':
      default:
        return {
          label: 'System & Security',
          badgeClass: 'bg-slate-100 text-slate-700 border-slate-300',
          icon: <Sliders className="w-3.5 h-3.5 text-slate-600" />
        };
    }
  };

  return (
    <div className="space-y-6">
      {/* Settings Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('classes')}
          className={`px-4 py-2 text-xs font-bold rounded-lg flex items-center gap-2 transition-colors cursor-pointer ${
            activeTab === 'classes'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Layers className="w-4 h-4 text-amber-500" />
          Classes & Streams Structure
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
            activeTab === 'classes' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
          }`}>
            {streamSettings.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('periods')}
          className={`px-4 py-2 text-xs font-bold rounded-lg flex items-center gap-2 transition-colors cursor-pointer ${
            activeTab === 'periods'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Clock className="w-4 h-4" />
          Period Settings (Time Slots & Periods)
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
            activeTab === 'periods' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
          }`}>
            {periodSettings.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('school')}
          className={`px-4 py-2 text-xs font-bold rounded-lg flex items-center gap-2 transition-colors cursor-pointer ${
            activeTab === 'school'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <School className="w-4 h-4" />
          School Information & Identity
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 text-xs font-bold rounded-lg flex items-center gap-2 transition-colors cursor-pointer ${
            activeTab === 'users'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          User Accounts & Passwords
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
            activeTab === 'users' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
          }`}>
            {users.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2 text-xs font-bold rounded-lg flex items-center gap-2 transition-colors cursor-pointer ${
            activeTab === 'audit'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <History className="w-4 h-4" />
          Activity Log & Audit Trail
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
            activeTab === 'audit' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
          }`}>
            {activityLogs.length}
          </span>
        </button>

        {currentUser?.isSuperAdmin && currentUser?.email?.toLowerCase() === 'habibuakida@gmail.com' && (
          <>
            <button
              type="button"
              onClick={() => setActiveTab('network')}
              className={`px-4 py-2 text-xs font-bold rounded-lg flex items-center gap-2 transition-colors cursor-pointer ${
                activeTab === 'network'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white text-emerald-600 hover:bg-emerald-50 border border-emerald-200'
              }`}
            >
              <Globe className="w-4 h-4" />
              School Network Control
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                activeTab === 'network' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-700'
              }`}>
                {allSchools.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('github')}
              className={`px-4 py-2 text-xs font-bold rounded-lg flex items-center gap-2 transition-colors cursor-pointer ${
                activeTab === 'github'
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              <Github className="w-4 h-4 text-slate-900" />
              GitHub Cloud Sync
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('backup')}
              className={`px-4 py-2 text-xs font-bold rounded-lg flex items-center gap-2 transition-colors cursor-pointer ${
                activeTab === 'backup'
                  ? 'bg-blue-900 text-white shadow-xs'
                  : 'bg-white text-blue-900 hover:bg-blue-50 border border-blue-200'
              }`}
            >
              <Download className="w-4 h-4" />
              Project Source Backup
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('dbhealth')}
              className={`px-4 py-2 text-xs font-bold rounded-lg flex items-center gap-2 transition-colors cursor-pointer ${
                activeTab === 'dbhealth'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                  : 'bg-white text-amber-900 hover:bg-amber-50 border border-amber-200'
              }`}
            >
              <Activity className="w-4 h-4 text-amber-600" />
              Database Health & Diagnostics
            </button>
          </>
        )}
      </div>

      {/* TAB: CLASSES & STREAMS STRUCTURE */}
      {activeTab === 'classes' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
            <div>
              <h2 className="text-xl font-bold text-[#1f4d8b] flex items-center gap-2">
                <Layers className="w-5 h-5 text-amber-500" />
                <span>Classes & Streams Structure Registry</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Manage registered academic classes, levels (Pre-Primary, Primary, O-Level, A-Level) and classroom streams (Stream A, Stream B, PCM, etc.).
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                if (onUpdateStreamSettings) {
                  const modalBtn = document.getElementById('open-class-stream-modal-btn');
                  if (modalBtn) modalBtn.click();
                }
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <Sparkles className="w-4 h-4 text-yellow-300" />
              <span>+ Register New Class / Stream</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {streamSettings.map(setting => {
              const enrolledStudents = students.filter(s => s.className === setting.className);
              return (
                <div 
                  key={setting.className}
                  className="p-4 bg-slate-50 border border-slate-200 rounded-xl hover:border-blue-300 transition-all space-y-3"
                >
                  <div className="flex items-start justify-between gap-2 border-b border-slate-200 pb-2.5">
                    <div>
                      <h3 className="text-sm font-black text-slate-900">{setting.className}</h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800 uppercase mt-0.5 inline-block">
                        {setting.level || 'CSEE'}
                      </span>
                    </div>
                    <span className="text-xs font-mono font-bold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                      {enrolledStudents.length} Students
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Active Streams ({setting.streams.length}):
                      </span>
                      {onUpdateStreamSettings && setting.streams.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const streamToRemove = setting.streams[setting.streams.length - 1];
                            if (confirm(`Punguza mkondo wa mwisho (${streamToRemove}) kutoka ${setting.className}?`)) {
                              const updated = streamSettings.map(s => {
                                if (s.className === setting.className) {
                                  return {
                                    ...s,
                                    streams: s.streams.slice(0, s.streams.length - 1)
                                  };
                                }
                                return s;
                              });
                              onUpdateStreamSettings(updated);
                            }
                          }}
                          className="text-[10px] text-rose-600 hover:text-rose-800 font-bold hover:underline cursor-pointer"
                        >
                          - Punguza Mkondo
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {setting.streams.map(st => (
                        <span key={st} className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-bold bg-white border border-slate-200 rounded-lg text-slate-800 shadow-2xs">
                          <span>{st}</span>
                          {onUpdateStreamSettings && (
                            <button
                              type="button"
                              onClick={() => {
                                if (setting.streams.length <= 1) {
                                  alert(`Darasa la ${setting.className} lina mkondo mmoja tu. Huwezi kufuta mkondo wote.`);
                                  return;
                                }
                                if (confirm(`Una uhakika unataka kufuta mkondo wa "${st}" kutoka ${setting.className}?`)) {
                                  const updated = streamSettings.map(s => {
                                    if (s.className === setting.className) {
                                      return {
                                        ...s,
                                        streams: s.streams.filter(x => x !== st)
                                      };
                                    }
                                    return s;
                                  });
                                  onUpdateStreamSettings(updated);
                                }
                              }}
                              className="text-slate-400 hover:text-rose-600 cursor-pointer p-0.5 rounded"
                              title={`Futa mkondo wa ${st}`}
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 1: PERIOD SETTINGS */}
      {activeTab === 'periods' && onUpdatePeriodSettings && (
        <div className="space-y-4">
          <PeriodSettingsManager
            periodSettings={periodSettings}
            onUpdatePeriodSettings={onUpdatePeriodSettings}
            assignments={assignments}
            onUpdateAssignments={onUpdateAssignments}
            dayThemes={dayThemes}
          />
        </div>
      )}

      {/* TAB 2: SCHOOL INFO */}
      {activeTab === 'school' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-6">
          <div>
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-[#1f4d8b] flex items-center gap-2">
                <SettingsIcon className="w-5 h-5 text-blue-600" />
                School Information & Administrative Settings
              </h2>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm("ARE YOU SURE? This will PERMANENTLY DELETE ALL school data, students, teachers, and timetable settings and reset the application to factory defaults. This action cannot be undone.")) {
                    onResetToDefaults();
                  }
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-2 cursor-pointer transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Factory Reset Database
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Configure school identification, mottos, and contact details that appear on printed timetables, invigilation sheets, and student report cards.
            </p>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-2 mb-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-900 uppercase flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-blue-600" />
                  Your Unique School ID (Share with staff to join)
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (currentUser?.schoolId) {
                      navigator.clipboard.writeText(currentUser.schoolId);
                      alert('School ID copied to clipboard!');
                    }
                  }}
                  className="text-[10px] font-bold text-blue-700 hover:text-blue-900 underline flex items-center gap-1"
                >
                  Copy ID
                </button>
              </div>
              <div className="font-mono text-sm font-bold text-blue-800 bg-white p-2 rounded border border-blue-200 select-all">
                {currentUser?.schoolId || 'UNAVAILABLE'}
              </div>
              <p className="text-[10px] text-blue-700 italic font-medium">
                * Other staff members (Academic Masters, Teachers) need this ID to register and join your school profile.
              </p>
            </div>

            {/* School Branding & Emblem / Logo Card */}
            <div className="p-4 bg-gradient-to-r from-slate-50 via-blue-50/40 to-slate-50 border border-slate-200 rounded-xl space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-2xl bg-white p-1.5 border-2 border-blue-900 shadow-md flex items-center justify-center shrink-0 overflow-hidden relative group">
                    {logo ? (
                      <img src={logo} alt="School Logo" className="w-full h-full object-contain" />
                    ) : (
                      <School className="w-10 h-10 text-slate-400" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      Official School Emblem & Branding
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      This emblem appears on all official School Documents (Photo Entry Forms, ISAL, CAL), Examination Papers, and Student Report Cards.
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <label className="cursor-pointer px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs">
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload Logo</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          className="hidden"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => setLogo(DEFAULT_SCHOOL_LOGO)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors border border-slate-300"
                      >
                        Reset Default
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Preset Logos Picker */}
              <div className="pt-2 border-t border-slate-200/80">
                <span className="text-[11px] font-bold text-slate-600 block mb-2">
                  Or select an accredited school crest template:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {PRESET_SCHOOL_LOGOS.map((preset) => {
                    const isSelected = logo === preset.dataUrl;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setLogo(preset.dataUrl)}
                        className={`p-2 rounded-lg border text-left flex items-center gap-2 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-blue-50 border-blue-600 ring-2 ring-blue-500/20'
                            : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <img src={preset.dataUrl} alt={preset.name} className="w-8 h-8 object-contain shrink-0" />
                        <span className="text-[11px] font-bold text-slate-700 leading-tight">
                          {preset.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase block mb-1">School Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. HabyEduPro3A"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-semibold"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 uppercase block mb-1">School Motto / Tagline</label>
                <input
                  type="text"
                  value={motto}
                  onChange={e => setMotto(e.target.value)}
                  placeholder="e.g. Education for Development & Integrity"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 uppercase block mb-1">Postal Address</label>
                <input
                  type="text"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  placeholder="e.g. P.O. Box 1234, Tanga, Tanzania"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 uppercase block mb-1">Head of School / Principal</label>
                <input
                  type="text"
                  value={principal}
                  onChange={e => setPrincipal(e.target.value)}
                  placeholder="e.g. Mwl. H. Akida"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 uppercase block mb-1">Phone Number</label>
                <input
                  type="text"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="e.g. +255 754 000 111"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 uppercase block mb-1">
                  School Center / Examination Number *
                </label>
                <input
                  type="text"
                  value={schoolNumber}
                  onChange={e => setSchoolNumber(e.target.value)}
                  placeholder="e.g. S.0123 or 0123"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono font-bold"
                  required
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Official NECTA Examination Center code. Used to format student registration tokens.
                </p>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 uppercase block mb-1">
                  Student Token Format Preview
                </label>
                <div className="w-full px-3 py-2 text-sm border border-blue-200 rounded-lg bg-blue-50/70 font-mono font-black text-blue-800 flex items-center justify-between">
                  <span>
                    S.{schoolNumber.trim().replace(/^S\.?/i, '') || '0123'}/0001/{new Date().getFullYear()}
                  </span>
                  <span className="text-[9px] bg-blue-200 text-blue-900 px-1.5 py-0.5 rounded uppercase font-sans font-bold">
                    Official Token
                  </span>
                </div>
                <p className="text-[10px] text-blue-600 mt-1">
                  Format: S + School Number + /0001 + Registration Year
                </p>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 uppercase block mb-1">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="e.g. info@habyedupro3a.ac.tz"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end pt-4 border-t border-slate-200">
              <div className="flex items-center gap-3">
                {savedSuccess && (
                  <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 animate-fade-in">
                    <Check className="w-4 h-4" />
                    School settings saved successfully!
                  </span>
                )}

                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  Save School Settings
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* TAB 3: USER ACCOUNTS & PASSWORDS */}
      {/* TAB 3: STAFF MANAGEMENT ROOM (REGISTERED MEMBERS) */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          {/* Staff Registration Room Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
            <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#1f4d8b] flex items-center gap-2 uppercase tracking-wide">
                  <UserPlus className="w-5 h-5 text-blue-600" />
                  Official Staff Registration & Password Assignment
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Register school staff, assign their login password, and designate teaching subjects. Staff can log in immediately with their credentials.
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="px-2.5 py-1 text-[11px] font-bold bg-blue-50 text-blue-800 rounded-full border border-blue-200">
                  {users.length} Registered Staff
                </span>
                <span className="text-[10px] text-slate-400 font-mono">School ID: {currentUser?.schoolId}</span>
              </div>
            </div>

            <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl space-y-2">
              <h4 className="text-[11px] font-black text-blue-900 uppercase flex items-center gap-2">
                <Info className="w-3.5 h-3.5" />
                Staff Registration & Password Workflow
              </h4>
              <p className="text-xs text-blue-800 leading-relaxed">
                As the School Administrator, you assign each member's <b>Email Address</b>, <b>Password</b>, and <b>Assigned Subjects</b>. Teachers will only see mark entry for their assigned subjects when logged in.
              </p>
            </div>

            {userMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" />
                {userMsg}
              </div>
            )}

            <form onSubmit={handleAddUser} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 items-end">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase mb-1 block tracking-widest">Full Name</label>
                  <input
                    type="text"
                    value={newFullName}
                    onChange={e => setNewFullName(e.target.value)}
                    placeholder="e.g. Grace Mchome"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase mb-1 block tracking-widest">Staff Email</label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={e => setNewEmail(e.target.value)}
                    placeholder="e.g. grace@school.edu"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black text-slate-500 uppercase mb-1 block tracking-widest">Login Password</label>
                    <button
                      type="button"
                      onClick={handleGeneratePassword}
                      className="text-[10px] text-blue-600 hover:underline font-bold cursor-pointer"
                    >
                      Generate
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showFormPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="Min 6 characters"
                      className="w-full px-3 py-2 pr-8 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 transition-all outline-none font-mono"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowFormPassword(!showFormPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showFormPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase mb-1 block tracking-widest">Academic Role</label>
                  <select
                    value={newRole}
                    onChange={e => setNewRole(e.target.value as UserAccount['role'])}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none bg-white capitalize"
                  >
                    <option value="TEACHER">Staff Teacher (Subject Marks Only)</option>
                    <option value="ACADEMIC">Academic Master (Curriculum & Results)</option>
                    <option value="HEADMASTER">Headmaster / Principal (Full Admin)</option>
                  </select>
                </div>
              </div>

              {/* Subject Assignment for Teachers */}
              {newRole === 'TEACHER' && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                      Assign Registered Subjects to Teacher
                    </label>
                    <span className="text-[10px] text-slate-500">
                      Teacher mode will strictly restrict mark entry to these subjects
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                    {SUBJECT_LIST.map(subject => {
                      const isChecked = newAssignedSubjects.includes(subject);
                      return (
                        <label
                          key={subject}
                          className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                            isChecked 
                              ? 'bg-blue-50 border-blue-300 text-blue-900 font-semibold' 
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setNewAssignedSubjects([...newAssignedSubjects, subject]);
                              } else {
                                setNewAssignedSubjects(newAssignedSubjects.filter(s => s !== subject));
                              }
                            }}
                            className="rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                          />
                          <span className="truncate">{subject}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-md flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Authorize & Register Staff</span>
                </button>
              </div>
            </form>
          </div>

          {/* User Accounts List */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
            <h3 className="text-[11px] font-black text-slate-500 uppercase pb-2 border-b border-slate-200 flex items-center gap-2 tracking-widest">
              <KeyRound className="w-4 h-4 text-slate-400" />
              Existing Authorized Staff Accounts & Login Passwords
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-black border-b border-slate-200 uppercase tracking-tighter">
                    <th className="py-2.5 px-3">Staff Identity</th>
                    <th className="py-2.5 px-3">Auth Email</th>
                    <th className="py-2.5 px-3">Role</th>
                    <th className="py-2.5 px-3">Assigned Subjects</th>
                    <th className="py-2.5 px-3">Assigned Password</th>
                    <th className="py-2.5 px-3 text-right">Control</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map(u => {
                    const isCurrent = currentUser?.id === u.id;
                    const isRevealed = revealedPasswords[u.id];
                    const pwd = u.password || '••••••••';

                    return (
                      <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-xl font-bold flex items-center justify-center text-xs bg-slate-100 text-slate-700 border border-slate-200">
                              {u.fullName.charAt(0)}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-900">{u.fullName}</span>
                              {isCurrent && (
                                <span className="text-[9px] text-emerald-600 font-black uppercase tracking-widest">
                                  System Admin (You)
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 font-medium text-slate-600 font-mono text-[11px]">
                          {u.email}
                        </td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                            u.role === 'HEADMASTER' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                            u.role === 'ACADEMIC' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                            'bg-slate-100 text-slate-600 border-slate-200'
                          }`}>
                            {u.role.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          {u.role !== 'TEACHER' ? (
                            <span className="text-[11px] text-slate-500 italic">All Subjects</span>
                          ) : u.assignedSubjects && u.assignedSubjects.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {u.assignedSubjects.map(sub => (
                                <span key={sub} className="px-1.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded text-[10px] font-semibold">
                                  {sub}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-[11px] text-amber-600 italic">No subjects assigned</span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          {u.password ? (
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-slate-800">
                                {isRevealed ? u.password : '••••••••'}
                              </span>
                              <button
                                type="button"
                                onClick={() => togglePasswordReveal(u.id)}
                                title={isRevealed ? "Hide Password" : "Show Password"}
                                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition cursor-pointer"
                              >
                                {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleCopy(u.password || '', u.id)}
                                title="Copy Password"
                                className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition cursor-pointer"
                              >
                                {copiedId === u.id ? <CheckCheck className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">Google Auth / Demo</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(u.id, u.fullName)}
                            disabled={users.length <= 1 || isCurrent}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all disabled:opacity-0 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: ACTIVITY LOGGING & AUDIT TRAIL */}
      {activeTab === 'audit' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          {/* Top Banner & Stats Overview */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <History className="w-5 h-5 text-blue-600" />
                  Institutional Activity Log & Audit Trail
                </h3>
                <p className="text-xs text-slate-500 max-w-2xl">
                  Tamper-evident activity registry tracking timetable adjustments, staff modifications, student record edits, and institutional configurations to promote total accountability.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleExportLogsCsv}
                  className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  Export Audit CSV
                </button>

                {onClearActivityLogs && (
                  <button
                    type="button"
                    onClick={onClearActivityLogs}
                    className="px-3.5 py-2 text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 rounded-lg shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                    Clear Logs
                  </button>
                )}
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <div 
                onClick={() => setLogCategoryFilter('ALL')}
                className={`p-3 rounded-xl border transition-all cursor-pointer ${
                  logCategoryFilter === 'ALL' ? 'bg-blue-50/80 border-blue-300 ring-2 ring-blue-500/20' : 'bg-slate-50/60 border-slate-200 hover:bg-slate-100/60'
                }`}
              >
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Recorded</div>
                <div className="text-xl font-black text-slate-900 mt-1 flex items-baseline gap-1.5">
                  {activityLogs.length}
                  <span className="text-[10px] font-normal text-slate-400">events</span>
                </div>
              </div>

              <div 
                onClick={() => setLogCategoryFilter('timetable')}
                className={`p-3 rounded-xl border transition-all cursor-pointer ${
                  logCategoryFilter === 'timetable' ? 'bg-blue-50/80 border-blue-300 ring-2 ring-blue-500/20' : 'bg-slate-50/60 border-slate-200 hover:bg-slate-100/60'
                }`}
              >
                <div className="text-[10px] font-bold uppercase tracking-wider text-blue-700 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-blue-500" />
                  Timetable
                </div>
                <div className="text-xl font-black text-blue-900 mt-1 flex items-baseline gap-1.5">
                  {timetableCount}
                  <span className="text-[10px] font-normal text-blue-400">updates</span>
                </div>
              </div>

              <div 
                onClick={() => setLogCategoryFilter('teachers')}
                className={`p-3 rounded-xl border transition-all cursor-pointer ${
                  logCategoryFilter === 'teachers' ? 'bg-emerald-50/80 border-emerald-300 ring-2 ring-emerald-500/20' : 'bg-slate-50/60 border-slate-200 hover:bg-slate-100/60'
                }`}
              >
                <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1">
                  <Users className="w-3 h-3 text-emerald-500" />
                  Staff
                </div>
                <div className="text-xl font-black text-emerald-900 mt-1 flex items-baseline gap-1.5">
                  {teacherCount}
                  <span className="text-[10px] font-normal text-emerald-400">changes</span>
                </div>
              </div>

              <div 
                onClick={() => setLogCategoryFilter('students')}
                className={`p-3 rounded-xl border transition-all cursor-pointer ${
                  logCategoryFilter === 'students' ? 'bg-purple-50/80 border-purple-300 ring-2 ring-purple-500/20' : 'bg-slate-50/60 border-slate-200 hover:bg-slate-100/60'
                }`}
              >
                <div className="text-[10px] font-bold uppercase tracking-wider text-purple-700 flex items-center gap-1">
                  <UserCheck className="w-3 h-3 text-purple-500" />
                  Students
                </div>
                <div className="text-xl font-black text-purple-900 mt-1 flex items-baseline gap-1.5">
                  {studentCount}
                  <span className="text-[10px] font-normal text-purple-400">edits</span>
                </div>
              </div>

              <div 
                onClick={() => setLogCategoryFilter('exams')}
                className={`p-3 rounded-xl border transition-all cursor-pointer col-span-2 sm:col-span-1 ${
                  logCategoryFilter === 'exams' ? 'bg-amber-50/80 border-amber-300 ring-2 ring-amber-500/20' : 'bg-slate-50/60 border-slate-200 hover:bg-slate-100/60'
                }`}
              >
                <div className="text-[10px] font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1">
                  <FileText className="w-3 h-3 text-amber-500" />
                  Exams & More
                </div>
                <div className="text-xl font-black text-amber-900 mt-1 flex items-baseline gap-1.5">
                  {examCount + settingsCount}
                  <span className="text-[10px] font-normal text-amber-400">events</span>
                </div>
              </div>
            </div>

            {/* Filter and Search Controls */}
            <div className="p-4 bg-slate-50/80 border border-slate-200 rounded-xl space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                {/* Search Field */}
                <div className="md:col-span-6 relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={logSearch}
                    onChange={e => setLogSearch(e.target.value)}
                    placeholder="Search logs by keyword, user, student, teacher..."
                    className="w-full pl-9 pr-8 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                  />
                  {logSearch && (
                    <button
                      type="button"
                      onClick={() => setLogSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Role filter */}
                <div className="md:col-span-3">
                  <select
                    value={logRoleFilter}
                    onChange={e => setLogRoleFilter(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                  >
                    <option value="ALL">All User Roles</option>
                    <option value="HEADMASTER">Headmaster Only</option>
                    <option value="ACADEMIC">Academic Office Only</option>
                    <option value="TEACHER">Teachers Only</option>
                  </select>
                </div>

                {/* Sort Order */}
                <div className="md:col-span-3 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setLogSortOrder(prev => prev === 'NEWEST' ? 'OLDEST' : 'NEWEST')}
                    className="w-full px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
                    <span>Order: {logSortOrder === 'NEWEST' ? 'Newest First' : 'Oldest First'}</span>
                  </button>
                </div>
              </div>

              {/* Category Pills */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-200/80">
                <span className="text-[11px] font-bold text-slate-500 mr-1 flex items-center gap-1">
                  <Filter className="w-3 h-3" />
                  Category:
                </span>
                {(['ALL', 'timetable', 'teachers', 'students', 'exams', 'invigilation', 'settings'] as const).map(cat => {
                  const isSelected = logCategoryFilter === cat;
                  const label = cat === 'ALL' ? 'All Logs' : cat.charAt(0).toUpperCase() + cat.slice(1);
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setLogCategoryFilter(cat)}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Activity Logs Ledger List */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">Audit History Timeline</h4>
                <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-blue-100 text-blue-800">
                  {filteredLogs.length} Records
                </span>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">
                Real-time Firebase Cloud Storage Sync
              </span>
            </div>

            {filteredLogs.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
                  <History className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-700">No Activity Logs Found</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  {activityLogs.length === 0
                    ? 'No events have been logged yet. Future timetable changes, teacher modifications, and student updates will appear here automatically.'
                    : 'No activity matches your current search keywords or category filters. Try resetting the filter.'}
                </p>
                {activityLogs.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setLogSearch('');
                      setLogCategoryFilter('ALL');
                      setLogRoleFilter('ALL');
                    }}
                    className="px-3.5 py-1.5 text-xs font-bold text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer"
                  >
                    Reset Filters
                  </button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredLogs.map(log => {
                  const meta = getCategoryMeta(log.category);
                  const formattedDate = new Date(log.timestamp).toLocaleString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  });

                  return (
                    <div 
                      key={log.id} 
                      className="p-4 sm:px-6 hover:bg-slate-50/70 transition-colors flex flex-col sm:flex-row sm:items-start justify-between gap-3 group"
                    >
                      <div className="flex items-start gap-3.5">
                        <div className={`p-2 rounded-lg border shrink-0 mt-0.5 ${meta.badgeClass}`}>
                          {meta.icon}
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                              {log.title}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${meta.badgeClass}`}>
                              {meta.label}
                            </span>
                          </div>

                          <p className="text-xs text-slate-600 leading-relaxed">
                            {log.description}
                          </p>

                          {log.details && (
                            <div className="text-[11px] text-slate-500 font-mono bg-slate-100 px-2 py-1 rounded inline-block">
                              {JSON.stringify(log.details)}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex sm:flex-col items-center sm:items-end justify-between gap-1 shrink-0 pt-2 sm:pt-0 border-t sm:border-0 border-slate-100 text-right">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-bold text-slate-800">
                            {log.userName || 'Authorized Staff'}
                          </span>
                          <span className={`text-[9px] font-black px-1.5 py-0.2 rounded uppercase tracking-wider ${
                            log.userRole === 'HEADMASTER' 
                              ? 'bg-amber-100 text-amber-800' 
                              : log.userRole === 'ACADEMIC' 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {log.userRole || 'STAFF'}
                          </span>
                        </div>

                        <div className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          {formattedDate}
                        </div>

                        {log.userEmail && (
                          <div className="text-[10px] text-slate-400 font-mono hidden sm:block">
                            {log.userEmail}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: SUPER ADMIN NETWORK CONTROL */}
      {activeTab === 'network' && currentUser?.isSuperAdmin && currentUser?.email?.toLowerCase() === 'habibuakida@gmail.com' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
          {activeSchoolSuccessMsg && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2 shadow-xs">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              {activeSchoolSuccessMsg}
            </div>
          )}

          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-base font-bold text-emerald-900 flex items-center gap-2">
                  <Globe className="w-5 h-5 text-emerald-600" />
                  HabyEduPro Central School Network & Super Admin Hub
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Exclusive Super Admin authority: register new school profiles, inspect the active school directory, and log in directly to manage any school's data.
                </p>
              </div>
              <Activity className="w-8 h-8 text-emerald-100" />
            </div>

            {/* Create New School Form */}
            <form onSubmit={handleCreateSchool} className="p-5 bg-gradient-to-br from-emerald-50/80 to-blue-50/50 border border-emerald-200 rounded-xl space-y-4">
              <div className="border-b border-emerald-200/60 pb-2">
                <h4 className="text-xs font-black text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                  <School className="w-4 h-4 text-emerald-700" />
                  Register New School (Super Admin Authority Only)
                </h4>
                <p className="text-[11px] text-emerald-800 mt-0.5">
                  Enter school details below to generate a new institutional cloud workspace.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest">School Name *</label>
                  <input
                    type="text"
                    required
                    value={newSchoolName}
                    onChange={(e) => setNewSchoolName(e.target.value)}
                    placeholder="e.g. USAGARA SECONDARY SCHOOL"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Address / Region</label>
                  <input
                    type="text"
                    value={newSchoolAddress}
                    onChange={(e) => setNewSchoolAddress(e.target.value)}
                    placeholder="e.g. P.O. Box 567, Tanga, Tanzania"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Headmaster / Principal</label>
                  <input
                    type="text"
                    value={newSchoolPrincipal}
                    onChange={(e) => setNewSchoolPrincipal(e.target.value)}
                    placeholder="e.g. Mr. J. Mlay"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Contact Phone</label>
                  <input
                    type="text"
                    value={newSchoolPhone}
                    onChange={(e) => setNewSchoolPhone(e.target.value)}
                    placeholder="e.g. +255 712 345 678"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Contact Email</label>
                  <input
                    type="email"
                    value={newSchoolEmail}
                    onChange={(e) => setNewSchoolEmail(e.target.value)}
                    placeholder="e.g. info@usagarasec.ac.tz"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest">School Motto</label>
                  <input
                    type="text"
                    value={newSchoolMotto}
                    onChange={(e) => setNewSchoolMotto(e.target.value)}
                    placeholder="e.g. Strive for Excellence"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={creatingSchool}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs shadow-md flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {creatingSchool ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <UserPlus className="w-4 h-4" />
                  )}
                  <span>Register & Provision School</span>
                </button>
              </div>
            </form>

            {/* Register School Administrator (Headmaster) Form */}
            <form onSubmit={handleSuperAdminRegisterSchoolAdmin} className="p-5 bg-gradient-to-br from-blue-50/90 to-indigo-50/50 border border-blue-200 rounded-xl space-y-4">
              <div className="border-b border-blue-200/70 pb-2 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-black text-blue-950 uppercase tracking-wider flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-blue-700" />
                    Register School Administrator (Headmaster)
                  </h4>
                  <p className="text-[11px] text-blue-800 mt-0.5">
                    Register the institutional Headmaster / Administrator using the standard member registration format. They can then log in to register their academic masters, teachers, and manage the school.
                  </p>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-100 text-blue-800 rounded border border-blue-200 uppercase">
                  Super Admin Provisioning
                </span>
              </div>

              {adminRegisterMsg && (
                <div className={`p-3 rounded-lg text-xs font-medium border flex flex-col gap-2 ${
                  adminRegisterMsg.type === 'success' 
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900' 
                    : 'bg-rose-50 border-rose-300 text-rose-900'
                }`}>
                  <div className="flex items-center gap-2">
                    {adminRegisterMsg.type === 'success' ? <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
                    <span>{adminRegisterMsg.text}</span>
                  </div>
                  {adminRegisterMsg.creds && (
                    <div className="mt-1 p-2.5 bg-white border border-emerald-200 rounded-lg flex flex-wrap items-center justify-between gap-2 font-mono text-[11px]">
                      <div>
                        <div><strong>School:</strong> {adminRegisterMsg.creds.school}</div>
                        <div><strong>Login Email:</strong> {adminRegisterMsg.creds.email}</div>
                        <div><strong>Assigned Password:</strong> {adminRegisterMsg.creds.pass}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(`School: ${adminRegisterMsg.creds?.school}\nLogin Email: ${adminRegisterMsg.creds?.email}\nPassword: ${adminRegisterMsg.creds?.pass}`);
                          alert('School Administrator credentials copied to clipboard!');
                        }}
                        className="px-2.5 py-1 bg-emerald-600 text-white rounded font-sans font-bold text-xs hover:bg-emerald-700 flex items-center gap-1 cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5" /> Copy Credentials
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Select School Workspace *</label>
                  <select
                    value={targetSchoolId}
                    onChange={(e) => setTargetSchoolId(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="">-- Choose School --</option>
                    {allSchools.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.id})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Admin Full Name *</label>
                  <input
                    type="text"
                    required
                    value={adminFullName}
                    onChange={(e) => setAdminFullName(e.target.value)}
                    placeholder="e.g. Mwl. Habibu Akida"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Official Login Email *</label>
                  <input
                    type="email"
                    required
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    placeholder="e.g. headmaster@school.ac.tz"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Password *</label>
                    <button
                      type="button"
                      onClick={handleGenerateAdminPassword}
                      className="text-[9px] font-bold text-blue-600 hover:text-blue-800 underline cursor-pointer"
                    >
                      Auto-Generate
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showAdminPassword ? 'text' : 'password'}
                      required
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      placeholder="Min. 6 chars"
                      className="w-full px-3 py-2 pr-8 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAdminPassword(!showAdminPassword)}
                      className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showAdminPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <div className="text-[11px] text-slate-500">
                  Assigned System Role: <span className="font-bold text-blue-700">HEADMASTER (School Administrator)</span>
                </div>
                <button
                  type="submit"
                  disabled={registeringAdmin}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs shadow-md flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {registeringAdmin ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <UserPlus className="w-4 h-4" />
                  )}
                  <span>Register & Authorize School Admin</span>
                </button>
              </div>
            </form>

            {/* School Directory & 1-Click Login */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                  <School className="w-4 h-4 text-slate-500" />
                  Schools Currently Using HabyEduPro ({allSchools.length})
                </h4>
                <span className="text-[11px] text-slate-500">
                  Click <b>"Enter / Log In"</b> to switch your active workspace
                </span>
              </div>

              {schoolsLoading ? (
                <div className="py-12 text-center text-slate-500 flex flex-col items-center gap-2">
                  <RefreshCw className="w-8 h-8 animate-spin" />
                  <p className="text-xs font-bold">Fetching school list...</p>
                </div>
              ) : allSchools.length === 0 ? (
                <div className="py-8 text-center bg-slate-50 border border-slate-200 rounded-xl text-slate-500 text-xs">
                  No schools registered yet. Register your first school above.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {allSchools.map(school => {
                    const isActiveWorkspace = currentUser?.schoolId === school.id;

                    return (
                      <div 
                        key={school.id} 
                        className={`bg-white border rounded-xl p-4 space-y-3 relative overflow-hidden transition-all shadow-xs group ${
                          isActiveWorkspace ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-md' : 'border-slate-200 hover:border-emerald-300'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <h5 className="font-bold text-slate-900 text-sm">{school.name || 'Unnamed School'}</h5>
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-[10px] text-slate-500 font-bold">ID: {school.id}</span>
                              <button
                                type="button"
                                onClick={() => handleCopy(school.id, school.id)}
                                title="Copy School ID"
                                className="text-slate-400 hover:text-slate-600 p-0.5"
                              >
                                {copiedId === school.id ? <CheckCheck className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                              </button>
                            </div>
                            {school.address && (
                              <p className="text-[11px] text-slate-500 truncate">{school.address}</p>
                            )}
                          </div>

                          <div className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${
                            school.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' :
                            school.status === 'DORMANT' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
                          }`}>
                            {school.status || 'ACTIVE'}
                          </div>
                        </div>

                        {/* Super Admin Direct Login Button */}
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => updateSchoolStatus(school.id, 'ACTIVE')}
                              className={`p-1.5 rounded-md text-xs transition ${
                                school.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700 font-bold' : 'text-slate-400 hover:text-emerald-600'
                              }`}
                              title="Set Active"
                            >
                              <Power className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => updateSchoolStatus(school.id, 'DORMANT')}
                              className={`p-1.5 rounded-md text-xs transition ${
                                school.status === 'DORMANT' ? 'bg-amber-100 text-amber-700 font-bold' : 'text-slate-400 hover:text-amber-600'
                              }`}
                              title="Set Dormant"
                            >
                              <AlertCircle className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => updateSchoolStatus(school.id, 'INACTIVE')}
                              className={`p-1.5 rounded-md text-xs transition ${
                                school.status === 'INACTIVE' ? 'bg-rose-100 text-rose-700 font-bold' : 'text-slate-400 hover:text-rose-600'
                              }`}
                              title="Set Inactive"
                            >
                              <PowerOff className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {isActiveWorkspace ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 font-bold text-xs rounded-lg border border-emerald-200">
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                              Active School
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleSuperAdminSwitchSchool(school)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-2xs transition cursor-pointer"
                            >
                              <LogIn className="w-3.5 h-3.5" />
                              Log In to School
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* TAB: GITHUB CLOUD SYNC */}
      {activeTab === 'github' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
            <div>
              <h2 className="text-xl font-bold text-[#1f4d8b] flex items-center gap-2">
                <Github className="w-6 h-6 text-slate-900" />
                <span>GitHub Repository Cloud Sync</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Push your entire application code and database blueprints to a secure GitHub repository for backup, version control and external deployment.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Connection Status */}
            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
              <h3 className="text-sm font-black uppercase text-slate-700 tracking-wider">1. Authentication Status</h3>
              
              {githubToken ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm">
                    <CheckCircle className="w-5 h-5" />
                    <span>Connected to GitHub</span>
                  </div>
                  <p className="text-[11px] text-slate-500 italic">Token is securely stored in your local session.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setGithubToken(null);
                      localStorage.removeItem('haby_github_token');
                    }}
                    className="px-3 py-1.5 bg-rose-50 text-rose-600 rounded-lg text-[10px] font-bold border border-rose-100 hover:bg-rose-100 transition-colors"
                  >
                    Disconnect Account
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Connecting to GitHub allows the system to push your local workspace directly to a private or public repository.
                  </p>
                  <button
                    type="button"
                    onClick={handleGithubConnect}
                    className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95"
                  >
                    <Github className="w-4 h-4" />
                    Connect your GitHub Account
                  </button>
                </div>
              )}
            </div>

            {/* Sync Controls */}
            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
              <h3 className="text-sm font-black uppercase text-slate-700 tracking-wider">2. Repository Configuration</h3>
              
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Target Repository (Owner/Repo):</label>
                  <input
                    type="text"
                    value={githubRepoName}
                    onChange={e => setGithubRepoName(e.target.value)}
                    placeholder="username/repository-name"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    disabled={!githubToken || pushStatus === 'pushing'}
                    onClick={handleGithubPush}
                    className={`w-full py-3 rounded-xl font-black text-xs flex items-center justify-center gap-2 shadow-md transition-all ${
                      !githubToken || pushStatus === 'pushing'
                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700 text-white active:scale-95'
                    }`}
                  >
                    {pushStatus === 'pushing' ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Pushing Code to GitHub...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        <span>Push Full Project to Cloud</span>
                      </>
                    )}
                  </button>
                </div>

                {pushStatus === 'success' && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in zoom-in-95">
                    <CheckCircle className="w-4 h-4" />
                    <span>Project successfully pushed to GitHub!</span>
                  </div>
                )}

                {pushStatus === 'error' && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-bold space-y-1 animate-in fade-in zoom-in-95">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      <span>Failed to push code</span>
                    </div>
                    {pushError && <p className="text-[10px] opacity-80 break-all">{pushError}</p>}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl flex gap-3">
            <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-[11px] font-bold text-blue-900 uppercase">Developer Notice:</p>
              <p className="text-xs text-blue-800 leading-relaxed">
                Ensure that the target repository exists on your GitHub account or that your token has permissions to create it. 
                Pushing will use the <code>--force</code> flag on the <code>main</code> branch to ensure your cloud backup is an exact mirror of this workspace.
              </p>
            </div>
          </div>
        </div>
      )}
      {/* TAB: PROJECT SOURCE BACKUP */}
      {activeTab === 'backup' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
            <div>
              <h2 className="text-xl font-bold text-[#1f4d8b] flex items-center gap-2">
                <Download className="w-6 h-6 text-blue-600" />
                <span>Project Source Code Backup (ZIP)</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Download a complete, compressed archive of your current project source code, database blueprints, and assets for local development or manual backup.
              </p>
            </div>
          </div>

          <div className="max-w-2xl bg-slate-50 border border-slate-200 rounded-2xl p-8 text-center space-y-6 mx-auto">
            <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
              <FileCode className="w-10 h-10" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-lg font-black text-slate-900 uppercase">Package Entire Project</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                This will bundle all application files (excluding temporary data and dependencies) into a single <code>.zip</code> file. 
                Use this to keep a physical copy of your progress or to import this project into another development environment.
              </p>
            </div>

            <div className="pt-4">
              <button
                type="button"
                disabled={backupLoading}
                onClick={handleDownloadBackup}
                className={`px-10 py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-3 mx-auto shadow-xl transition-all active:scale-95 ${
                  backupLoading
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {backupLoading ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Preparing Archive...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5" />
                    <span>Generate & Download ZIP</span>
                  </>
                )}
              </button>
            </div>

            <div className="pt-4 text-[11px] text-slate-400 font-bold uppercase tracking-widest flex items-center justify-center gap-4">
              <span>Includes Source</span>
              <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
              <span>Includes Blueprints</span>
              <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
              <span>Vite/React Structure</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB: DATABASE HEALTH & LATENCY DIAGNOSTICS */}
      {activeTab === 'dbhealth' && (
        <div className="space-y-6">
          <DatabaseHealthWidget
            schoolId={currentUser?.schoolId || '02dff10d-78fb-4af6-ab5a-db1d275d7e06'}
            currentUserRole={currentUser?.role}
          />
        </div>
      )}
    </div>
  );
};
