import React, { useState, useEffect, useMemo } from 'react';
import { 
  FlaskConical, 
  Atom, 
  Dna, 
  Plus, 
  Search, 
  Filter, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  AlertTriangle, 
  MapPin, 
  Layers, 
  User, 
  RefreshCw, 
  ShieldAlert, 
  Sliders,
  Check,
  X,
  Sparkles,
  Info
} from 'lucide-react';
import { db, getCurrentSchoolId } from '../../lib/dbClient';
import { collection, query, where, getDocs, doc, setDoc, deleteDoc, onSnapshot, orderBy } from 'firebase/firestore';
import { UserAccount, SchoolInfo } from '../../types';

export interface LaboratoryApparatus {
  id: string;
  subject: 'Physics' | 'Chemistry' | 'Biology';
  teacher_name: string;
  teacher_id: string;
  apparatus_name: string;
  category: 'Glassware' | 'Chemicals' | 'Equipment' | 'Specimens' | 'Other';
  quantity_available: number;
  quantity_broken: number;
  condition: 'Good' | 'Fair' | 'Needs Repair' | 'Broken';
  location: string;
  last_updated: string;
  school_id: string;
}

interface LaboratoryInventoryViewProps {
  currentUser?: UserAccount | null;
  schoolInfo?: SchoolInfo;
}

const CATEGORIES = ['Glassware', 'Chemicals', 'Equipment', 'Specimens', 'Other'] as const;
const CONDITIONS = ['Good', 'Fair', 'Needs Repair', 'Broken'] as const;
const LOCATIONS = ['Lab 1 (Physics)', 'Lab 2 (Chemistry)', 'Lab 3 (Biology)', 'Main Science Store'] as const;

export const LaboratoryInventoryView: React.FC<LaboratoryInventoryViewProps> = ({
  currentUser,
  schoolInfo
}) => {
  const schoolId = getCurrentSchoolId();
  const [apparatusList, setApparatusList] = useState<LaboratoryApparatus[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeSubjectTab, setActiveSubjectTab] = useState<'All' | 'Physics' | 'Chemistry' | 'Biology'>('Physics');
  
  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedCondition, setSelectedCondition] = useState<string>('All');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<LaboratoryApparatus | null>(null);

  // Form state
  const [formSubject, setFormSubject] = useState<'Physics' | 'Chemistry' | 'Biology'>('Physics');
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState<'Glassware' | 'Chemicals' | 'Equipment' | 'Specimens' | 'Other'>('Equipment');
  const [formQtyAvailable, setFormQtyAvailable] = useState<number>(1);
  const [formQtyBroken, setFormQtyBroken] = useState<number>(0);
  const [formCondition, setFormCondition] = useState<'Good' | 'Fair' | 'Needs Repair' | 'Broken'>('Good');
  const [formLocation, setFormLocation] = useState('Lab 1 (Physics)');
  const [submitting, setSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Role check
  const isHodOrAdmin = currentUser?.role === 'HEADMASTER' || currentUser?.role === 'ACADEMIC' || currentUser?.role === 'SUPER_ADMIN' || currentUser?.isSuperAdmin;

  // Fetch data from Firestore
  const fetchApparatus = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'laboratory_apparatus'),
        where('school_id', '==', schoolId),
        orderBy('last_updated', 'desc')
      );
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LaboratoryApparatus));
      setApparatusList(data);
    } catch (err) {
      console.warn('Exception fetching lab apparatus:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Setup Realtime subscription
    try {
      const q = query(
        collection(db, 'laboratory_apparatus'),
        where('school_id', '==', schoolId)
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LaboratoryApparatus));
        setApparatusList(data);
        setLoading(false);
      });

      return () => {
        unsubscribe();
      };
    } catch (err) {
      console.warn('Realtime subscription error:', err);
      fetchApparatus();
    }
  }, [schoolId]);

  // Filtered Apparatus list
  const filteredApparatus = useMemo(() => {
    return apparatusList.filter(item => {
      // Subject filter (if user selected Physics/Chemistry/Biology tab)
      if (activeSubjectTab !== 'All' && item.subject !== activeSubjectTab) {
        return false;
      }
      // Search term
      if (searchTerm.trim() !== '') {
        const q = searchTerm.toLowerCase();
        const matchesName = (item.apparatus_name || '').toLowerCase().includes(q);
        const matchesTeacher = (item.teacher_name || '').toLowerCase().includes(q);
        const matchesLoc = (item.location || '').toLowerCase().includes(q);
        if (!matchesName && !matchesTeacher && !matchesLoc) return false;
      }
      // Category filter
      if (selectedCategory !== 'All' && item.category !== selectedCategory) {
        return false;
      }
      // Condition filter
      if (selectedCondition !== 'All' && item.condition !== selectedCondition) {
        return false;
      }
      return true;
    });
  }, [apparatusList, activeSubjectTab, searchTerm, selectedCategory, selectedCondition]);

  // Statistics for active subject
  const stats = useMemo(() => {
    const list = activeSubjectTab === 'All' ? apparatusList : apparatusList.filter(i => i.subject === activeSubjectTab);
    const totalItems = list.length;
    const totalAvailable = list.reduce((sum, i) => sum + (Number(i.quantity_available) || 0), 0);
    const totalBroken = list.reduce((sum, i) => sum + (Number(i.quantity_broken) || 0), 0);
    return { totalItems, totalAvailable, totalBroken };
  }, [apparatusList, activeSubjectTab]);

  const handleOpenAddModal = () => {
    setEditingItem(null);
    setFormSubject(activeSubjectTab === 'All' ? 'Physics' : activeSubjectTab);
    setFormName('');
    setFormCategory('Equipment');
    setFormQtyAvailable(10);
    setFormQtyBroken(0);
    setFormCondition('Good');
    setFormLocation('Lab 1 (Physics)');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: LaboratoryApparatus) => {
    // Check permission
    if (!isHodOrAdmin && item.teacher_id && currentUser?.id && item.teacher_id !== currentUser.id) {
      alert('Unaweza kuhariri au kufuta vifaa ulivyoviweka wewe mwenyewe pekee, isipokuwa kama wewe ni HOD au Admin.');
      return;
    }
    setEditingItem(item);
    setFormSubject(item.subject);
    setFormName(item.apparatus_name);
    setFormCategory(item.category);
    setFormQtyAvailable(item.quantity_available);
    setFormQtyBroken(item.quantity_broken);
    setFormCondition(item.condition);
    setFormLocation(item.location);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      alert('Tafadhali jaza jina la kifaa.');
      return;
    }

    setSubmitting(true);
    const teacherName = currentUser?.fullName || currentUser?.email || 'Mwalimu wa Maabara';
    const teacherId = currentUser?.id || 'unknown_teacher';

    const payload = {
      subject: formSubject,
      teacher_name: teacherName,
      teacher_id: teacherId,
      apparatus_name: formName.trim(),
      category: formCategory,
      quantity_available: Number(formQtyAvailable) || 0,
      quantity_broken: Number(formQtyBroken) || 0,
      condition: formCondition,
      location: formLocation.trim() || 'Science Lab',
      last_updated: new Date().toISOString(),
      school_id: schoolId
    };

    try {
      const docId = editingItem ? editingItem.id : (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()));
      await setDoc(doc(db, 'laboratory_apparatus', docId), payload, { merge: true });
      
      showToast(editingItem ? `Kifaa "${formName}" kimesasishwa kwa mafanikio!` : `Kifaa kipya "${formName}" kimeongezwa kwenye maabara!`);
      setIsModalOpen(false);
    } catch (err: any) {
      console.error('Error saving apparatus:', err);
      alert(`Imeshindikana kuhifadhi: ${err.message || 'Angalia muunganisho'}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, itemTeacherId: string, itemName: string) => {
    if (!isHodOrAdmin && itemTeacherId && currentUser?.id && itemTeacherId !== currentUser.id) {
      alert('Unaweza kufuta vifaa ulivyoviweka wewe mwenyewe pekee, isipokuwa kama wewe ni HOD au Admin.');
      return;
    }

    if (!window.confirm(`Una uhakika unataka kufuta kifaa "${itemName}"?`)) return;

    try {
      await deleteDoc(doc(db, 'laboratory_apparatus', id));
      showToast(`Kifaa "${itemName}" kimefutwa.`);
    } catch (err: any) {
      console.error('Error deleting apparatus:', err);
      alert(`Imeshindikana kufuta: ${err.message}`);
    }
  };

  const getSubjectIcon = (subj: string) => {
    switch (subj) {
      case 'Physics': return <Atom className="w-4 h-4 text-blue-500" />;
      case 'Chemistry': return <FlaskConical className="w-4 h-4 text-emerald-500" />;
      case 'Biology': return <Dna className="w-4 h-4 text-purple-500" />;
      default: return <FlaskConical className="w-4 h-4 text-slate-500" />;
    }
  };

  const getConditionBadge = (cond: string) => {
    switch (cond) {
      case 'Good':
        return <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full text-[11px] font-bold flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-600" /> Nzuri (Good)</span>;
      case 'Fair':
        return <span className="px-2.5 py-1 bg-blue-100 text-blue-800 rounded-full text-[11px] font-bold flex items-center gap-1">Wastani (Fair)</span>;
      case 'Needs Repair':
        return <span className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full text-[11px] font-bold flex items-center gap-1"><AlertTriangle className="w-3 h-3 text-amber-600" /> Inahitaji Matengenezo</span>;
      case 'Broken':
        return <span className="px-2.5 py-1 bg-rose-100 text-rose-800 rounded-full text-[11px] font-bold flex items-center gap-1"><ShieldAlert className="w-3 h-3 text-rose-600" /> Kimevunjika / Kibovu</span>;
      default:
        return <span className="px-2.5 py-1 bg-slate-100 text-slate-800 rounded-full text-[11px] font-bold">{cond}</span>;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-xl border border-slate-700 flex items-center gap-3 animate-in slide-in-from-top duration-300">
          <Sparkles className="w-5 h-5 text-emerald-400 shrink-0 animate-spin" />
          <span className="text-xs font-bold">{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 rounded-2xl shadow-xl border border-slate-800 relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="absolute -right-12 -top-12 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="space-y-2 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md border border-emerald-400/30">
              <FlaskConical className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                <span>Laboratory Inventory (Vifaa vya Maabara)</span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-400 text-slate-950 uppercase">
                  LIVE SUPABASE
                </span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 font-medium">
                Usimamizi wa Vifaa, Kemikali na Vyombo vya Fizikia, Kemia na Biolojia
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 relative z-10 w-full md:w-auto">
          <button
            type="button"
            onClick={fetchApparatus}
            disabled={loading}
            className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl border border-white/20 flex items-center gap-2 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 text-emerald-300 ${loading ? 'animate-spin' : ''}`} />
            <span>Sasisha (Sync)</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAddModal}
            className="flex-1 md:flex-none px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white text-xs font-black rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Ongeza Kifaa Kipya</span>
          </button>
        </div>
      </div>

      {/* Subject Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        {(['Physics', 'Chemistry', 'Biology', 'All'] as const).map(subj => {
          const isActive = activeSubjectTab === subj;
          return (
            <button
              key={subj}
              onClick={() => setActiveSubjectTab(subj)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                isActive
                  ? 'bg-slate-900 text-white shadow-sm border border-slate-800'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
              }`}
            >
              {subj !== 'All' && getSubjectIcon(subj)}
              <span>{subj === 'All' ? 'Vifaa Vyote (All)' : `${subj} Lab`}</span>
            </button>
          );
        })}
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Jumla ya Vifaa</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">{stats.totalItems}</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Aina / Rekodi zilizosajiliwa</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200">
            <Layers className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Vyote Vinavyofanya Kazi</p>
            <h3 className="text-2xl font-black text-emerald-600 mt-1">{stats.totalAvailable}</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Vipo tayari kwa majaribio</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Vilivyovunjika / Vyovu</p>
            <h3 className="text-2xl font-black text-rose-600 mt-1">{stats.totalBroken}</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Vinahitaji uingizwaji au matengenezo</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-200">
            <ShieldAlert className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Tafuta kifaa, mwalimu au eneo..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 text-xs font-bold border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="px-3 py-2 bg-slate-50 text-xs font-bold border border-slate-200 rounded-xl focus:outline-hidden"
            >
              <option value="All">Aina Zote (Categories)</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Sliders className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedCondition}
              onChange={e => setSelectedCondition(e.target.value)}
              className="px-3 py-2 bg-slate-50 text-xs font-bold border border-slate-200 rounded-xl focus:outline-hidden"
            >
              <option value="All">Hali Zote (Conditions)</option>
              {CONDITIONS.map(cond => <option key={cond} value={cond}>{cond}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Apparatus Table / Grid */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin mx-auto" />
            <p className="text-xs font-bold text-slate-500">Inapakua vifaa vya maabara kutoka Supabase...</p>
          </div>
        ) : filteredApparatus.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Info className="w-8 h-8 text-slate-400 mx-auto" />
            <p className="text-sm font-bold text-slate-700">Hakuna vifaa vilivyopatikana.</p>
            <p className="text-xs text-slate-400">Bofya "Ongeza Kifaa Kipya" kuanzisha hesabu ya maabara.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-[11px] font-black text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <th className="py-3 px-4">Kifaa & Somo</th>
                  <th className="py-3 px-4">Aina (Category)</th>
                  <th className="py-3 px-4 text-center">Idadi Inayofanya Kazi</th>
                  <th className="py-3 px-4 text-center">Idadi Iliyovunjika</th>
                  <th className="py-3 px-4">Hali (Condition)</th>
                  <th className="py-3 px-4">Eneo (Location)</th>
                  <th className="py-3 px-4">Mwalimu Mhusika</th>
                  <th className="py-3 px-4 text-right">Vitendo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                {filteredApparatus.map(item => {
                  const canEdit = isHodOrAdmin || (currentUser?.id && item.teacher_id === currentUser.id);
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 flex items-center gap-2">
                          {getSubjectIcon(item.subject)}
                          <span>{item.apparatus_name}</span>
                        </div>
                        <span className="text-[10px] text-slate-400">{item.subject} Lab</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-[11px] font-bold">
                          {item.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-emerald-600">
                        {item.quantity_available}
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-rose-600">
                        {item.quantity_broken}
                      </td>
                      <td className="py-3 px-4">
                        {getConditionBadge(item.condition)}
                      </td>
                      <td className="py-3 px-4 text-slate-600 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        <span>{item.location}</span>
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        <div className="flex items-center gap-1.5 font-bold text-slate-800">
                          <User className="w-3 h-3 text-slate-400" />
                          <span>{item.teacher_name || 'Mwalimu'}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {canEdit ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenEditModal(item)}
                              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer"
                              title="Hariri"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(item.id, item.teacher_id, item.apparatus_name)}
                              className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-colors cursor-pointer"
                              title="Futa"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">Huwezi kuhariri</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center">
                  <FlaskConical className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    {editingItem ? 'Hariri Kifaa cha Maabara' : 'Ongeza Kifaa Kipya cha Maabara'}
                  </h3>
                  <p className="text-xs text-slate-500">Jaza maelezo sahihi ya vifaa au kemikali</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Somo (Subject) *</label>
                <select
                  value={formSubject}
                  onChange={e => setFormSubject(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 text-xs font-bold border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="Physics">Physics Lab</option>
                  <option value="Chemistry">Chemistry Lab</option>
                  <option value="Biology">Biology Lab</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Jina la Kifaa (Apparatus Name) *</label>
                <input
                  type="text"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="Mf. Microscope, Beaker (250ml), Bunsen Burner"
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 text-xs font-bold border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Aina (Category)</label>
                  <select
                    value={formCategory}
                    onChange={e => setFormCategory(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 text-xs font-bold border border-slate-200 rounded-xl focus:outline-hidden"
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Hali (Condition)</label>
                  <select
                    value={formCondition}
                    onChange={e => setFormCondition(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 text-xs font-bold border border-slate-200 rounded-xl focus:outline-hidden"
                  >
                    {CONDITIONS.map(cond => <option key={cond} value={cond}>{cond}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Idadi Inayofanya Kazi</label>
                  <input
                    type="number"
                    min="0"
                    value={formQtyAvailable}
                    onChange={e => setFormQtyAvailable(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 text-xs font-bold border border-slate-200 rounded-xl focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Idadi Iliyovunjika / Bovu</label>
                  <input
                    type="number"
                    min="0"
                    value={formQtyBroken}
                    onChange={e => setFormQtyBroken(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 text-xs font-bold border border-slate-200 rounded-xl focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Eneo / Stoo (Location)</label>
                <select
                  value={formLocation}
                  onChange={e => setFormLocation(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 text-xs font-bold border border-slate-200 rounded-xl focus:outline-hidden"
                >
                  {LOCATIONS.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Ghairi
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow-md transition-colors cursor-pointer flex items-center gap-2 disabled:opacity-50"
                >
                  {submitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingItem ? 'Sasisha Kifaa' : 'Hifadhi Kifaa'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
