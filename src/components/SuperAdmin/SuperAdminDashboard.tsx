import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  ShieldCheck, 
  Plus, 
  Users, 
  Search, 
  ExternalLink, 
  Trash2, 
  RefreshCw, 
  KeyRound, 
  Mail, 
  Phone, 
  CheckCircle2, 
  AlertCircle, 
  Copy, 
  Check, 
  Eye, 
  EyeOff, 
  School as SchoolIcon,
  Sparkles,
  ArrowRight,
  Shield,
  Layers,
  Database,
  Table as TableIcon,
  LayoutGrid
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { School, SchoolAdminRecord, UserAccount } from '../../types';

export interface SupabaseSchoolRecord {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  created_at?: string | null;
}

interface SuperAdminDashboardProps {
  currentUser?: UserAccount | null;
  currentSchoolId: string;
  onSelectSchool: (schoolId: string, schoolName: string) => void;
  onNavigateToView?: (view: any) => void;
}

export const SuperAdminDashboard: React.FC<SuperAdminDashboardProps> = ({
  currentUser,
  currentSchoolId,
  onSelectSchool,
  onNavigateToView
}) => {
  const [schools, setSchools] = useState<SupabaseSchoolRecord[]>([]);
  const [schoolAdmins, setSchoolAdmins] = useState<SchoolAdminRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'schools' | 'admins'>('schools');
  const [schoolsViewMode, setSchoolsViewMode] = useState<'table' | 'grid'>('table');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isAddSchoolOpen, setIsAddSchoolOpen] = useState(false);
  const [isAddAdminOpen, setIsAddAdminOpen] = useState(false);

  // Form states - School
  const [newSchoolName, setNewSchoolName] = useState('');
  const [newSchoolEmail, setNewSchoolEmail] = useState('');
  const [newSchoolPhone, setNewSchoolPhone] = useState('');
  const [savingSchool, setSavingSchool] = useState(false);
  const [schoolError, setSchoolError] = useState<string | null>(null);

  // Form states - Admin
  const [adminFullName, setAdminFullName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminSchoolId, setAdminSchoolId] = useState('');
  const [adminRole, setAdminRole] = useState<'school_admin' | 'super_admin'>('school_admin');
  const [savingAdmin, setSavingAdmin] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);

  // Copy feedback and password reveals
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const ROOT_SUPER_ADMIN: SchoolAdminRecord = {
    id: 'efbbc146-b15b-49ee-a7ed-931ade8ccd0d',
    school_id: null,
    full_name: 'Habibu Akida',
    email: 'habibuakida@gmail.com',
    password: 'Mdimilage$Habibu%1991$_3',
    role: 'super_admin',
    created_at: new Date().toISOString()
  };

  const fetchEcosystemData = async () => {
    setLoading(true);
    try {
      // 1. Fetch schools using exact requested query: supabase.from('schools').select('*')
      let fetchedSchools: SupabaseSchoolRecord[] = [];
      try {
        const { data: schoolsData, error: sErr } = await supabase
          .from('schools')
          .select('*');

        if (!sErr && Array.isArray(schoolsData)) {
          fetchedSchools = [...schoolsData].sort((a: any, b: any) => 
            (a.name || '').localeCompare(b.name || '')
          ) as SupabaseSchoolRecord[];
        } else {
          console.warn("[SuperAdmin] Schools fetch notice:", sErr);
          // If query failed, keep existing schools or fallback
          fetchedSchools = schools.length > 0 ? schools : [
            { id: '02dff10d-78fb-4af6-ab5a-db1d275d7e06', name: 'HABY EDU SCHOOL' }
          ];
        }
      } catch (err) {
        console.warn("[SuperAdmin] Schools query exception:", err);
        fetchedSchools = schools.length > 0 ? schools : [
          { id: '02dff10d-78fb-4af6-ab5a-db1d275d7e06', name: 'HABY EDU SCHOOL' }
        ];
      }
      setSchools(fetchedSchools);

      // 2. Fetch school admins
      let fetchedAdmins: SchoolAdminRecord[] = [];
      try {
        // Try with created_at order first
        const res1 = await supabase
          .from('school_admins')
          .select('*')
          .order('created_at', { ascending: false });

        if (!res1.error && Array.isArray(res1.data)) {
          fetchedAdmins = res1.data as any;
        } else {
          // Fallback to select without order in case created_at column is missing or indexing
          const res2 = await supabase
            .from('school_admins')
            .select('*');

          if (!res2.error && Array.isArray(res2.data)) {
            fetchedAdmins = res2.data as any;
          } else {
            console.warn("[SuperAdmin] school_admins fetch notice:", res2.error?.message || res1.error?.message);
          }
        }
      } catch (adminErr) {
        console.warn("[SuperAdmin] Exception fetching school_admins:", adminErr);
      }

      // Guarantee Root Super Admin is always visible in the ecosystem
      const hasRoot = fetchedAdmins.some(
        a => a.email?.trim().toLowerCase() === ROOT_SUPER_ADMIN.email.toLowerCase()
      );
      if (!hasRoot) {
        fetchedAdmins = [ROOT_SUPER_ADMIN, ...fetchedAdmins];
      }

      setSchoolAdmins(fetchedAdmins);
    } catch (err: any) {
      console.warn("[SuperAdmin] Error in fetchEcosystemData:", err);
      // Ensure we still have the Root Super Admin even if a global error occurred
      setSchoolAdmins(prev => prev.length > 0 ? prev : [ROOT_SUPER_ADMIN]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEcosystemData();
  }, []);

  // Handle Add School
  const handleAddSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSchoolName.trim()) {
      setSchoolError('Tafadhali weka jina la shule.');
      return;
    }

    setSavingSchool(true);
    setSchoolError(null);

    try {
      let insertResult: any = null;

      // Check if email or phone is provided
      if (newSchoolEmail.trim() || newSchoolPhone.trim()) {
        const fullInsert = await supabase
          .from('schools')
          .insert({
            name: newSchoolName.trim(),
            email: newSchoolEmail.trim() || null,
            phone: newSchoolPhone.trim() || null
          })
          .select();

        // If schema doesn't have email/phone columns, fallback to name only
        if (fullInsert.error && (fullInsert.error.code === 'PGRST204' || fullInsert.error.message?.includes('column'))) {
          insertResult = await supabase
            .from('schools')
            .insert({ name: newSchoolName.trim() })
            .select();
        } else {
          insertResult = fullInsert;
        }
      } else {
        insertResult = await supabase
          .from('schools')
          .insert({ name: newSchoolName.trim() })
          .select();
      }

      if (insertResult?.error) {
        throw insertResult.error;
      }

      showNotification('success', `Shule ya "${newSchoolName.trim()}" imesajiliwa kikamilifu kwenye Supabase!`);
      setNewSchoolName('');
      setNewSchoolEmail('');
      setNewSchoolPhone('');
      setIsAddSchoolOpen(false);
      await fetchEcosystemData();
    } catch (err: any) {
      console.error("[SuperAdmin] Error creating school:", err);
      setSchoolError(err.message || 'Hitilafu wakati wa kusajili shule.');
    } finally {
      setSavingSchool(false);
    }
  };

  // Handle Create School Admin
  const handleCreateSchoolAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminFullName.trim() || !adminEmail.trim() || !adminPassword.trim()) {
      setAdminError('Tafadhali jaza taarifa zote zinazohitajika.');
      return;
    }

    if (adminRole === 'school_admin' && !adminSchoolId) {
      setAdminError('Tafadhali chagua shule ya kuunganisha na mtawala huyu.');
      return;
    }

    setSavingAdmin(true);
    setAdminError(null);

    try {
      const payload: Record<string, any> = {
        full_name: adminFullName.trim(),
        email: adminEmail.trim().toLowerCase(),
        password: adminPassword.trim(),
        role: adminRole,
        school_id: adminRole === 'super_admin' ? (adminSchoolId || null) : adminSchoolId
      };

      const { data, error } = await supabase
        .from('school_admins')
        .insert(payload)
        .select();

      if (error) {
        if (error.code === '23505') {
          throw new Error(`Barua pepe "${adminEmail.trim()}" tayari imesajiliwa kwa mtawala mwingine.`);
        }
        throw error;
      }

      showNotification(
        'success', 
        `Mtawala ${adminFullName.trim()} (${adminEmail.trim()}) amesajiliwa kwenye school_admins!`
      );
      setAdminFullName('');
      setAdminEmail('');
      setAdminPassword('');
      setAdminSchoolId('');
      setAdminRole('school_admin');
      setIsAddAdminOpen(false);
      await fetchEcosystemData();
    } catch (err: any) {
      console.error("[SuperAdmin] Error creating school admin:", err);
      setAdminError(err.message || 'Hitilafu wakati wa kusajili admin.');
    } finally {
      setSavingAdmin(false);
    }
  };

  // Handle Delete School
  const handleDeleteSchool = async (schoolId: string, schoolName: string) => {
    if (!window.confirm(`Je, una uhakika unataka kufuta shule ya "${schoolName}"? Hii itafuta kumbukumbu zote za shule hii.`)) {
      return;
    }

    try {
      const { error } = await supabase.from('schools').delete().eq('id', schoolId);
      if (error) throw error;
      showNotification('success', `Shule ya "${schoolName}" imefutwa.`);
      await fetchEcosystemData();
    } catch (err: any) {
      showNotification('error', err.message || 'Hitilafu wakati wa kufuta shule.');
    }
  };

  // Handle Delete Admin
  const handleDeleteAdmin = async (adminId: string, adminEmail: string) => {
    if (adminEmail === 'habibuakida@gmail.com') {
      alert('Huwezi kufuta akaunti kuu ya Root Super Admin.');
      return;
    }

    if (!window.confirm(`Je, una uhakika unataka kufuta mtawala "${adminEmail}"?`)) {
      return;
    }

    try {
      const { error } = await supabase.from('school_admins').delete().eq('id', adminId);
      if (error) throw error;
      showNotification('success', `Mtawala "${adminEmail}" amefutwa.`);
      await fetchEcosystemData();
    } catch (err: any) {
      showNotification('error', err.message || 'Hitilafu wakati wa kufuta mtawala.');
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const togglePasswordVisibility = (adminId: string) => {
    setRevealedPasswords(prev => ({
      ...prev,
      [adminId]: !prev[adminId]
    }));
  };

  // Filtering
  const filteredSchools = schools.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredAdmins = schoolAdmins.filter(a => 
    a.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const schoolMap = new Map<string, string>();
  schools.forEach(s => schoolMap.set(s.id, s.name));

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Toast Notification */}
      {notification && (
        <div className={`p-4 rounded-xl shadow-lg border flex items-center justify-between gap-3 transition-all ${
          notification.type === 'success' 
            ? 'bg-emerald-600 text-white border-emerald-500' 
            : 'bg-rose-600 text-white border-rose-500'
        }`}>
          <div className="flex items-center gap-2 text-sm font-semibold">
            {notification.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <span>{notification.message}</span>
          </div>
          <button 
            onClick={() => setNotification(null)}
            className="text-white/80 hover:text-white text-xs font-bold px-2 py-1 bg-black/20 rounded cursor-pointer"
          >
            Funga
          </button>
        </div>
      )}

      {/* Hero Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-[#0f2948] to-[#1e3a8a] text-white rounded-2xl p-6 sm:p-8 shadow-xl border border-slate-700/50 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Building2 className="w-64 h-64 text-white" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-400/30 text-purple-300 text-xs font-extrabold uppercase tracking-widest">
              <ShieldCheck className="w-4 h-4 text-purple-400" />
              <span>Super Admin Master Control</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              HABY EDU PRO Multi-School Ecosystem
            </h1>
            <p className="text-xs sm:text-sm text-blue-200 max-w-2xl leading-relaxed">
              Kituo kikuu cha usimamizi wa shule zote, watawala wa shule (<code className="bg-black/30 px-1.5 py-0.5 rounded text-amber-300">school_admins</code>), 
              na ugawaji wa maeneo ya shule (<code className="bg-black/30 px-1.5 py-0.5 rounded text-amber-300">schools</code>) kwa njia salama ya Supabase.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-2 text-xs text-slate-300">
              <span className="flex items-center gap-1.5 bg-black/30 px-3 py-1 rounded-lg border border-white/10">
                <Database className="w-3.5 h-3.5 text-emerald-400" /> Supabase: <span className="text-emerald-400 font-mono font-bold">tqazqaqdzqpbftdcekzb</span>
              </span>
              <span className="flex items-center gap-1.5 bg-black/30 px-3 py-1 rounded-lg border border-white/10">
                <Shield className="w-3.5 h-3.5 text-blue-400" /> Mtumiaji: <span className="text-white font-bold">{currentUser?.email || 'habibuakida@gmail.com'}</span>
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={() => setIsAddSchoolOpen(true)}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs shadow-lg shadow-emerald-900/30 flex items-center gap-2 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Ongeza Shule (Add School)</span>
            </button>
            <button
              onClick={() => setIsAddAdminOpen(true)}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs shadow-lg shadow-blue-900/30 flex items-center gap-2 transition cursor-pointer"
            >
              <Users className="w-4 h-4" />
              <span>+ Sajili Mtawala (Create Admin)</span>
            </button>
            <button
              onClick={fetchEcosystemData}
              disabled={loading}
              className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition cursor-pointer"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Stats Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Shule Zilizosajiliwa</span>
            <span className="text-2xl sm:text-3xl font-black text-slate-900 mt-1 block">{schools.length}</span>
            <span className="text-[11px] text-emerald-600 font-semibold mt-0.5 block">Kwenye table ya schools</span>
          </div>
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
            <SchoolIcon className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Watawala wa Shule</span>
            <span className="text-2xl sm:text-3xl font-black text-slate-900 mt-1 block">{schoolAdmins.length}</span>
            <span className="text-[11px] text-blue-600 font-semibold mt-0.5 block">Kwenye table ya school_admins</span>
          </div>
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Super Admin Accounts</span>
            <span className="text-2xl sm:text-3xl font-black text-purple-700 mt-1 block">
              {schoolAdmins.filter(a => a.role === 'super_admin').length}
            </span>
            <span className="text-[11px] text-purple-600 font-semibold mt-0.5 block">Nguvu kamili ya mtandao</span>
          </div>
          <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Shule Inayosimamiwa Sasa</span>
            <span className="text-sm font-black text-slate-800 mt-1 block truncate max-w-[160px]">
              {schoolMap.get(currentSchoolId) || 'HABY EDU SCHOOL'}
            </span>
            <span className="text-[11px] text-slate-400 font-mono mt-0.5 block truncate max-w-[160px]">
              {currentSchoolId}
            </span>
          </div>
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center">
            <Layers className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Tab Switcher & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('schools')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'schools' 
                ? 'bg-blue-600 text-white shadow-xs' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <SchoolIcon className="w-4 h-4" />
            <span>Orodha ya Shule ({schools.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('admins')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'admins' 
                ? 'bg-blue-600 text-white shadow-xs' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Watawala (school_admins) ({schoolAdmins.length})</span>
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={activeTab === 'schools' ? "Tafuta shule kwa jina au ID..." : "Tafuta mtawala kwa jina au email..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition"
          />
        </div>
      </div>

      {/* TAB 1: SCHOOLS DIRECTORY & TABLE */}
      {activeTab === 'schools' && (
        <div className="space-y-4">
          {/* Header Bar with Query Indicator & View Mode Switcher */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-blue-50/80 via-indigo-50/60 to-slate-50 p-4 rounded-2xl border border-blue-100 shadow-xs">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <SchoolIcon className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-black text-slate-800 tracking-wide uppercase">
                  Jedwali la Shule Zote (Supabase: schools table)
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-blue-600 text-white shadow-2xs">
                  {filteredSchools.length} {filteredSchools.length === 1 ? 'Shule' : 'Shule'}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 pt-0.5">
                <span className="font-semibold text-slate-600">Query Inayotumika:</span>
                <code className="bg-white px-2 py-0.5 rounded-md font-mono text-[11px] font-bold text-blue-700 border border-blue-200 shadow-2xs flex items-center gap-1.5">
                  <Database className="w-3 h-3 text-blue-500" />
                  supabase.from('schools').select('*')
                </code>
                <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Imeunganishwa Moja kwa Moja
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 self-start sm:self-center shrink-0">
              {/* View Switcher: Table vs Grid */}
              <div className="flex items-center bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
                <button
                  onClick={() => setSchoolsViewMode('table')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                    schoolsViewMode === 'table'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                  title="Onyesha kama Table (Jedwali)"
                >
                  <TableIcon className="w-3.5 h-3.5" />
                  <span>Table View</span>
                </button>
                <button
                  onClick={() => setSchoolsViewMode('grid')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                    schoolsViewMode === 'grid'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                  title="Onyesha kama Kadi (Grid Cards)"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Cards View</span>
                </button>
              </div>

              <button
                onClick={() => setIsAddSchoolOpen(true)}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Ongeza Shule</span>
              </button>
            </div>
          </div>

          {filteredSchools.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-2xl border border-dashed border-slate-300 space-y-3">
              <SchoolIcon className="w-12 h-12 text-slate-300 mx-auto" />
              <h4 className="text-sm font-bold text-slate-700">Hakuna shule iliyopatikana</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Bofya kitufe cha "+ Ongeza Shule" ili kuanza kusajili shule mpya kwenye mfumo.
              </p>
              <button
                onClick={() => setIsAddSchoolOpen(true)}
                className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                + Ongeza Shule ya Kwanza
              </button>
            </div>
          ) : schoolsViewMode === 'table' ? (
            /* DEDICATED TABLE VIEW FOR SCHOOLS (Requested) */
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold uppercase tracking-wider text-[11px]">
                      <th className="py-3.5 px-4 w-12 text-center">#</th>
                      <th className="py-3.5 px-4 min-w-[220px]">Jina la Shule (School Name)</th>
                      <th className="py-3.5 px-4 min-w-[210px]">School ID (UUID)</th>
                      <th className="py-3.5 px-4 min-w-[180px]">Mawasiliano (Email / Phone)</th>
                      <th className="py-3.5 px-4 min-w-[210px]">Watawala (school_admins)</th>
                      <th className="py-3.5 px-4 min-w-[120px] text-center">Hali</th>
                      <th className="py-3.5 px-4 min-w-[170px] text-right">Vitendo (Actions)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredSchools.map((s, idx) => {
                      const assignedAdmins = schoolAdmins.filter(a => a.school_id === s.id);
                      const isCurrentlyActive = s.id === currentSchoolId;

                      return (
                        <tr 
                          key={s.id} 
                          className={`transition hover:bg-blue-50/40 ${isCurrentlyActive ? 'bg-blue-50/20' : ''}`}
                        >
                          {/* Index */}
                          <td className="py-3.5 px-4 text-center font-bold text-slate-400">
                            {idx + 1}
                          </td>

                          {/* School Name */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                                isCurrentlyActive ? 'bg-blue-600 text-white shadow-xs' : 'bg-blue-100 text-blue-700'
                              }`}>
                                <SchoolIcon className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <div className="font-black text-slate-900 text-sm truncate flex items-center gap-1.5">
                                  <span>{s.name}</span>
                                  {isCurrentlyActive && (
                                    <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-black uppercase">
                                      <Sparkles className="w-2.5 h-2.5 text-blue-600" /> Active
                                    </span>
                                  )}
                                </div>
                                <span className="text-[11px] text-slate-400 block">Shule iliyosajiliwa Supabase</span>
                              </div>
                            </div>
                          </td>

                          {/* School ID */}
                          <td className="py-3.5 px-4">
                            <div className="inline-flex items-center gap-1.5 font-mono text-[11px] bg-slate-50 hover:bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 transition">
                              <span className="text-slate-700 truncate max-w-[140px] font-semibold">{s.id}</span>
                              <button
                                onClick={() => handleCopy(s.id, s.id)}
                                className="text-slate-400 hover:text-blue-600 transition p-0.5 rounded cursor-pointer"
                                title="Nakili School ID"
                              >
                                {copiedId === s.id ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          </td>

                          {/* Contact Info (Email / Phone) */}
                          <td className="py-3.5 px-4">
                            <div className="space-y-0.5">
                              {s.email ? (
                                <div className="flex items-center gap-1.5 text-slate-700 font-medium truncate max-w-[180px]">
                                  <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                                  <span className="truncate">{s.email}</span>
                                </div>
                              ) : null}
                              {s.phone ? (
                                <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                                  <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                                  <span>{s.phone}</span>
                                </div>
                              ) : null}
                              {!s.email && !s.phone && (
                                <span className="text-slate-400 text-[11px] italic">Bila mawasiliano</span>
                              )}
                            </div>
                          </td>

                          {/* Admins (school_admins) */}
                          <td className="py-3.5 px-4">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                                  assignedAdmins.length > 0 
                                    ? 'bg-blue-100 text-blue-800' 
                                    : 'bg-amber-100 text-amber-800'
                                }`}>
                                  {assignedAdmins.length} {assignedAdmins.length === 1 ? 'Mtawala' : 'Watawala'}
                                </span>
                                <button
                                  onClick={() => {
                                    setAdminSchoolId(s.id);
                                    setIsAddAdminOpen(true);
                                  }}
                                  className="text-[11px] text-blue-600 hover:text-blue-800 font-bold hover:underline cursor-pointer"
                                  title="Weka mtawala kwa shule hii"
                                >
                                  + Weka Admin
                                </button>
                              </div>
                              {assignedAdmins.length > 0 && (
                                <div className="space-y-0.5">
                                  {assignedAdmins.slice(0, 2).map(adm => (
                                    <div key={adm.id} className="text-[11px] text-slate-600 flex items-center gap-1 truncate max-w-[180px]">
                                      <Users className="w-3 h-3 text-slate-400 shrink-0" />
                                      <span className="font-semibold text-slate-800 truncate">{adm.full_name}</span>
                                    </div>
                                  ))}
                                  {assignedAdmins.length > 2 && (
                                    <span className="text-[10px] text-slate-400 font-bold block">
                                      +{assignedAdmins.length - 2} wengine...
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4 text-center">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Ipo Active
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  onSelectSchool(s.id, s.name);
                                  if (onNavigateToView) onNavigateToView('dashboard');
                                }}
                                className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition cursor-pointer ${
                                  isCurrentlyActive
                                    ? 'bg-slate-900 hover:bg-slate-800 text-white shadow-2xs'
                                    : 'bg-blue-600 hover:bg-blue-500 text-white shadow-2xs'
                                }`}
                                title={isCurrentlyActive ? 'Shule hii ipo wazi sasa' : 'Fungua na kusimamia shule hii'}
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                                <span>{isCurrentlyActive ? 'Inatumika' : 'Fungua'}</span>
                              </button>

                              <button
                                onClick={() => handleDeleteSchool(s.id, s.name)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                title={`Futa shule ya ${s.name}`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* ALTERNATIVE GRID CARDS VIEW */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSchools.map((s) => {
                const assignedAdmins = schoolAdmins.filter(a => a.school_id === s.id);
                const isCurrentlyActive = s.id === currentSchoolId;

                return (
                  <div
                    key={s.id}
                    className={`bg-white rounded-2xl border transition-all p-5 shadow-xs flex flex-col justify-between gap-4 ${
                      isCurrentlyActive 
                        ? 'border-blue-500 ring-2 ring-blue-500/20' 
                        : 'border-slate-200 hover:border-slate-300 hover:shadow-md'
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <h4 className="text-base font-black text-slate-900 leading-snug">
                            {s.name}
                          </h4>
                          {isCurrentlyActive && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[10px] font-extrabold uppercase">
                              <Sparkles className="w-3 h-3 text-blue-600" /> Active School
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => handleDeleteSchool(s.id, s.name)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                          title="Futa shule hii"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="space-y-1.5 text-xs text-slate-600 pt-1 border-t border-slate-100">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-400">School ID:</span>
                          <div className="flex items-center gap-1 font-mono text-[11px] bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                            <span className="truncate max-w-[150px]">{s.id}</span>
                            <button
                              onClick={() => handleCopy(s.id, s.id)}
                              className="text-slate-400 hover:text-slate-700 cursor-pointer"
                              title="Copy ID"
                            >
                              {copiedId === s.id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[11px] font-bold text-slate-400">Watawala (Admins):</span>
                          <span className="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-full text-[11px]">
                            {assignedAdmins.length} Waliosajiliwa
                          </span>
                        </div>

                        {assignedAdmins.length > 0 && (
                          <div className="pt-1 space-y-1">
                            {assignedAdmins.slice(0, 2).map(adm => (
                              <div key={adm.id} className="text-[11px] text-slate-600 truncate flex items-center gap-1.5">
                                <Users className="w-3 h-3 text-slate-400 shrink-0" />
                                <span className="font-semibold text-slate-800">{adm.full_name}</span>
                                <span className="text-slate-400 font-mono">({adm.email})</span>
                              </div>
                            ))}
                            {assignedAdmins.length > 2 && (
                              <div className="text-[10px] text-blue-600 font-bold">
                                + {assignedAdmins.length - 2} wengine...
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <button
                        onClick={() => {
                          onSelectSchool(s.id, s.name);
                          if (onNavigateToView) onNavigateToView('dashboard');
                        }}
                        className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                          isCurrentlyActive
                            ? 'bg-slate-900 hover:bg-slate-800 text-white shadow-xs'
                            : 'bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white border border-blue-200 hover:border-transparent'
                        }`}
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>{isCurrentlyActive ? 'Tazama Dashboard ya Shule Hii' : 'Fungua Shule Hii (Switch)'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: SCHOOL ADMINS ROSTER */}
      {activeTab === 'admins' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-600" />
              <span>Orodha ya Watawala (school_admins table) ({filteredAdmins.length})</span>
            </h3>
            <button
              onClick={() => setIsAddAdminOpen(true)}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Sajili Mtawala Mpya
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Jina Kamili</th>
                    <th className="py-3 px-4">Email ya Kuingia</th>
                    <th className="py-3 px-4">Wadhifa (Role)</th>
                    <th className="py-3 px-4">Shule Aliyopangiwa</th>
                    <th className="py-3 px-4">Nenosiri (Password)</th>
                    <th className="py-3 px-4 text-right">Vitendo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAdmins.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        Hakuna mtawala aliyepatikana.
                      </td>
                    </tr>
                  ) : (
                    filteredAdmins.map((adm) => {
                      const schoolName = adm.school_id ? schoolMap.get(adm.school_id) || adm.school_id : 'N/A (All Schools)';
                      const isSuper = adm.role === 'super_admin';
                      const isVisible = revealedPasswords[adm.id];

                      return (
                        <tr key={adm.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 font-bold text-slate-900">
                            {adm.full_name || 'N/A'}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-700">
                            {adm.email}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                              isSuper 
                                ? 'bg-purple-100 text-purple-800 border border-purple-200' 
                                : 'bg-blue-100 text-blue-800 border border-blue-200'
                            }`}>
                              {isSuper ? <ShieldCheck className="w-3 h-3 text-purple-600" /> : <Users className="w-3 h-3 text-blue-600" />}
                              <span>{adm.role}</span>
                            </span>
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-700">
                            {schoolName}
                          </td>
                          <td className="py-3 px-4 font-mono">
                            <div className="flex items-center gap-2">
                              <span>{isVisible ? adm.password : '••••••••••••'}</span>
                              <button
                                onClick={() => togglePasswordVisibility(adm.id)}
                                className="text-slate-400 hover:text-slate-600 cursor-pointer"
                                title={isVisible ? "Ficha" : "Onyesha"}
                              >
                                {isVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right">
                            {adm.email !== 'habibuakida@gmail.com' ? (
                              <button
                                onClick={() => handleDeleteAdmin(adm.id, adm.email)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                title="Futa mtawala"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            ) : (
                              <span className="text-[10px] text-slate-400 font-bold uppercase">Root Super</span>
                            )}
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
      )}

      {/* MODAL 1: ADD SCHOOL */}
      {isAddSchoolOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <SchoolIcon className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900">Sajili Shule Mpya (Add School)</h3>
              </div>
              <button
                onClick={() => setIsAddSchoolOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {schoolError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{schoolError}</span>
              </div>
            )}

            <form onSubmit={handleAddSchool} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">Jina la Shule (School Name) *</label>
                <input
                  type="text"
                  required
                  placeholder="mf. KIOMONI SECONDARY SCHOOL"
                  value={newSchoolName}
                  onChange={(e) => setNewSchoolName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">Email ya Shule (Optional)</label>
                  <input
                    type="email"
                    placeholder="info@school.ac.tz"
                    value={newSchoolEmail}
                    onChange={(e) => setNewSchoolEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">Simu ya Shule (Optional)</label>
                  <input
                    type="text"
                    placeholder="+255 712 345 678"
                    value={newSchoolPhone}
                    onChange={(e) => setNewSchoolPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none"
                  />
                </div>
              </div>

              <p className="text-[11px] text-slate-500 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200">
                Data hii itahifadhiwa moja kwa moja kwenye table ya <code className="font-bold text-slate-800">schools</code> ya Supabase na itatengenezewa kitambulisho cha kipekee (UUID).
              </p>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddSchoolOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Ghairi
                </button>
                <button
                  type="submit"
                  disabled={savingSchool}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
                >
                  {savingSchool ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  <span>{savingSchool ? 'Inasajili...' : 'Hifadhi Shule'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CREATE SCHOOL ADMIN */}
      {isAddAdminOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900">Sajili Mtawala (Create School Admin)</h3>
              </div>
              <button
                onClick={() => setIsAddAdminOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {adminError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{adminError}</span>
              </div>
            )}

            <form onSubmit={handleCreateSchoolAdmin} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">Jina Kamili la Mtawala *</label>
                <input
                  type="text"
                  required
                  placeholder="mf. Mwl. Juma Mwinyi"
                  value={adminFullName}
                  onChange={(e) => setAdminFullName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">Email ya Kuingia *</label>
                  <input
                    type="email"
                    required
                    placeholder="admin@school.ac.tz"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">Nenosiri (Password) *</label>
                  <input
                    type="text"
                    required
                    placeholder="Password ya kuingilia"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">Wadhifa (Role) *</label>
                  <select
                    value={adminRole}
                    onChange={(e) => setAdminRole(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none"
                  >
                    <option value="school_admin">School Admin (Mwalimu Mkuu)</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">
                    Shule Anayosimamia {adminRole === 'school_admin' ? '*' : '(Optional)'}
                  </label>
                  <select
                    value={adminSchoolId}
                    onChange={(e) => setAdminSchoolId(e.target.value)}
                    required={adminRole === 'school_admin'}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none"
                  >
                    <option value="">-- Chagua Shule --</option>
                    {schools.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <p className="text-[11px] text-slate-500 leading-relaxed bg-blue-50/50 p-3 rounded-xl border border-blue-200">
                Taarifa hizi zitaingizwa moja kwa moja kwenye table ya <code className="font-bold text-blue-900">school_admins</code> ya Supabase.
                Mtawala huyu akishaingia kwenye mfumo, atatazama tu data za shule aliyopangiwa (<code className="font-bold">school_id</code>).
              </p>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddAdminOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Ghairi
                </button>
                <button
                  type="submit"
                  disabled={savingAdmin}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
                >
                  {savingAdmin ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  <span>{savingAdmin ? 'Inasajili...' : 'Hifadhi Mtawala'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
