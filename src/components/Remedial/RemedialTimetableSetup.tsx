import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar, 
  Clock, 
  Plus, 
  Trash2, 
  Edit3, 
  Printer, 
  Download, 
  Search, 
  Filter, 
  AlertTriangle, 
  CheckCircle2, 
  Bell, 
  X, 
  User, 
  BookOpen, 
  Building, 
  GraduationCap, 
  Layers, 
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { 
  saveRemedialTimetable, 
  getRemedialTimetable, 
  deleteRemedialTimetableEntry,
  checkRemedialConflict,
  RemedialTimetableEntry 
} from '../../lib/remedialService';
import { 
  NURSERY_CLASSES, 
  PRIMARY_CLASSES, 
  SECONDARY_CLASSES,
  NURSERY_SUBJECTS_LIST,
  LOWER_PRIMARY_SUBJECTS_LIST,
  UPPER_PRIMARY_SUBJECTS_LIST,
  SECONDARY_SUBJECTS
} from '../../constants/defaults';
import { Teacher, SchoolInfo, Student } from '../../types';
import { exportRemedialTimetablePDF } from '../../utils/remedialPdfExport';
import { isSameClass } from '../../utils/reportCardUtils';
import { RemedialDashboardSummary } from './RemedialDashboardSummary';

interface RemedialTimetableSetupProps {
  schoolId: string;
  teachers: Teacher[];
  schoolInfo?: SchoolInfo;
  students?: Student[];
  onAddActivityLog?: (log: any) => void;
}

const REMEDIAL_NURSERY_CLASSES = ['Baby Class', 'Middle', 'Pre-Unit'];
const REMEDIAL_PRIMARY_CLASSES = [
  'Class 1',
  'Class 2',
  'Class 3',
  'Class 4',
  'Class 5',
  'Class 6',
  'Class 7'
];
const REMEDIAL_SECONDARY_CLASSES = ['Form 1', 'Form 2', 'Form 3', 'Form 4'];

const ALL_REMEDIAL_CLASSES = [
  ...REMEDIAL_NURSERY_CLASSES,
  ...REMEDIAL_PRIMARY_CLASSES,
  ...REMEDIAL_SECONDARY_CLASSES
];

const STREAM_OPTIONS = ['A', 'B', 'C', 'D', 'E', 'All Streams'];

export const RemedialTimetableSetup: React.FC<RemedialTimetableSetupProps> = ({ 
  schoolId, 
  teachers = [],
  schoolInfo,
  students = [],
  onAddActivityLog
}) => {
  const [entries, setEntries] = useState<RemedialTimetableEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);

  // Filters
  const [classFilter, setClassFilter] = useState<string>('ALL');
  const [streamFilter, setStreamFilter] = useState<string>('ALL');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Toast / Alert Notification State
  const [alertNotice, setAlertNotice] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    class_name: 'Class 5',
    stream: 'A',
    subject: 'Mathematics (Hisabati)',
    teacher_name: '',
    date: new Date().toISOString().split('T')[0],
    start_time: '16:00',
    end_time: '17:30',
    room: 'Room 5A',
    notify_students: true,
    term: 'Term 1',
    academic_year: new Date().getFullYear().toString()
  });

  // Calculate day of week automatically from date
  const selectedDayOfWeek = useMemo(() => {
    if (!formData.date) return 'Monday';
    const d = new Date(formData.date);
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return dayNames[d.getDay()] || 'Monday';
  }, [formData.date]);

  // Dynamic subjects based on chosen class
  const dynamicSubjects = useMemo(() => {
    const c = formData.class_name;
    if (NURSERY_CLASSES.includes(c)) {
      return NURSERY_SUBJECTS_LIST;
    }
    if (c === 'Standard 1' || c === 'Standard 2' || c === 'Class 1' || c === 'Class 2') {
      return LOWER_PRIMARY_SUBJECTS_LIST;
    }
    if (PRIMARY_CLASSES.includes(c) || c.toLowerCase().includes('class') || c.toLowerCase().includes('std')) {
      return UPPER_PRIMARY_SUBJECTS_LIST;
    }
    return SECONDARY_SUBJECTS;
  }, [formData.class_name]);

  // Keep selected subject valid when class level changes
  useEffect(() => {
    if (dynamicSubjects.length > 0 && !dynamicSubjects.includes(formData.subject)) {
      setFormData(prev => ({ ...prev, subject: dynamicSubjects[0] }));
    }
  }, [dynamicSubjects]);

  useEffect(() => {
    loadTimetable();
  }, [schoolId]);

  const loadTimetable = async () => {
    setLoading(true);
    try {
      const { data } = await getRemedialTimetable(schoolId);
      if (data) setEntries(data);
    } catch (err) {
      console.error("Error loading remedial timetable:", err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      class_name: classFilter !== 'ALL' ? classFilter : 'Class 5',
      stream: streamFilter !== 'ALL' && streamFilter !== 'All Streams' ? streamFilter : 'A',
      subject: UPPER_PRIMARY_SUBJECTS_LIST[0] || 'Mathematics (Hisabati)',
      teacher_name: teachers[0]?.name || '',
      date: new Date().toISOString().split('T')[0],
      start_time: '16:00',
      end_time: '17:30',
      room: 'Room 5A',
      notify_students: true,
      term: 'Term 1',
      academic_year: new Date().getFullYear().toString()
    });
    setEditingEntryId(null);
  };

  const handleOpenAdd = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenEdit = (entry: RemedialTimetableEntry) => {
    setEditingEntryId(entry.id || null);
    const times = entry.period_time ? entry.period_time.split('-') : [];
    setFormData({
      class_name: entry.class_name || 'Class 5',
      stream: entry.stream || 'A',
      subject: entry.subject || '',
      teacher_name: entry.teacher_name || '',
      date: entry.date || new Date().toISOString().split('T')[0],
      start_time: entry.start_time || times[0] || '16:00',
      end_time: entry.end_time || times[1] || '17:30',
      room: entry.room || '',
      notify_students: !!entry.notify_students,
      term: entry.term || 'Term 1',
      academic_year: entry.academic_year || new Date().getFullYear().toString()
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.class_name) {
      setAlertNotice({ type: 'warning', message: 'Tafadhali chagua darasa (Class is required).' });
      return;
    }
    if (!formData.stream) {
      setAlertNotice({ type: 'warning', message: 'Tafadhali chagua mkondo (Stream is required).' });
      return;
    }
    if (!formData.subject) {
      setAlertNotice({ type: 'warning', message: 'Tafadhali chagua somo (Subject is required).' });
      return;
    }
    if (!formData.teacher_name) {
      setAlertNotice({ type: 'warning', message: 'Tafadhali chagua mwalimu (Teacher is required).' });
      return;
    }
    if (!formData.date) {
      setAlertNotice({ type: 'warning', message: 'Tafadhali chagua tarehe ya kipindi (Date is required).' });
      return;
    }
    if (!formData.start_time || !formData.end_time) {
      setAlertNotice({ type: 'warning', message: 'Tafadhali weka muda wa kuanza na kuisha (Start and end times are required).' });
      return;
    }

    const payload: RemedialTimetableEntry = {
      ...(editingEntryId ? { id: editingEntryId } : {}),
      class_name: formData.class_name,
      stream: formData.stream,
      subject: formData.subject,
      teacher_name: formData.teacher_name,
      date: formData.date,
      day_of_week: selectedDayOfWeek,
      start_time: formData.start_time,
      end_time: formData.end_time,
      period_time: `${formData.start_time}-${formData.end_time}`,
      room: formData.room || `${formData.class_name} Classroom`,
      term: formData.term,
      academic_year: formData.academic_year,
      notify_students: formData.notify_students
    };

    // Conflict Checking (Conflict Prevention logic)
    const conflictCheck = checkRemedialConflict(entries, payload, editingEntryId || undefined);
    if (conflictCheck.hasConflict) {
      setAlertNotice({
        type: 'error',
        message: conflictCheck.message || 'Mgongano wa ratiba umepatikana kwa mwalimu huyu!'
      });
      return;
    }

    setSaving(true);
    try {
      await saveRemedialTimetable(schoolId, payload);

      // Notification broadcast if selected
      if (formData.notify_students) {
        const classStudents = students.filter(s => 
          isSameClass(s.className, formData.class_name) && 
          (formData.stream === 'All Streams' || !s.stream || s.stream.toUpperCase().includes(formData.stream.toUpperCase()))
        );

        if (onAddActivityLog) {
          onAddActivityLog({
            action: 'REMEDIAL_SCHEDULED',
            category: 'timetable',
            title: `Remedial Timetable Scheduled: ${formData.class_name} ${formData.stream}`,
            description: `Kipindi cha ${formData.subject} kimepangwa kwa Mwl. ${formData.teacher_name} tarehe ${formData.date} (${formData.start_time}-${formData.end_time}) kwa wanafunzi ${classStudents.length}.`
          });
        }
      }

      setAlertNotice({
        type: 'success',
        message: `Ratiba ya Remedial ya ${formData.class_name} (${formData.stream}) imehifadhiwa kikamilifu!`
      });
      setIsModalOpen(false);
      resetForm();
      loadTimetable();
    } catch (err: any) {
      console.error("Save remedial error:", err);
      setAlertNotice({ type: 'error', message: err.message || 'Hitilafu imetokea wakati wa kuhifadhi.' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id?: string) => {
    if (!id) return;
    if (!window.confirm('Una uhakika unataka kufuta kipindi hiki cha remedial kwenye ratiba?')) return;
    try {
      await deleteRemedialTimetableEntry(schoolId, id);
      setEntries(prev => prev.filter(e => e.id !== id));
      setAlertNotice({ type: 'success', message: 'Kipindi kimefutwa kwenye ratiba.' });
    } catch (err: any) {
      setAlertNotice({ type: 'error', message: 'Hitilafu wakati wa kufuta kipindi.' });
    }
  };

  // Filtered entries for table
  const filteredEntries = useMemo(() => {
    return entries.filter(item => {
      const matchClass = classFilter === 'ALL' || isSameClass(item.class_name, classFilter);
      const matchStream = streamFilter === 'ALL' || 
        item.stream === 'All Streams' || 
        item.stream.toUpperCase() === streamFilter.toUpperCase();
      const matchDate = !dateFilter || item.date === dateFilter;
      const matchSearch = !searchQuery || 
        item.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.teacher_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.room && item.room.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchClass && matchStream && matchDate && matchSearch;
    });
  }, [entries, classFilter, streamFilter, dateFilter, searchQuery]);

  // Handle PDF Export for current class & stream selection
  const handleExportPDF = () => {
    const targetClass = classFilter !== 'ALL' ? classFilter : 'Class 5';
    const targetStream = streamFilter !== 'ALL' ? streamFilter : 'A';
    
    // Get entries matching target class & stream
    const targetEntries = entries.filter(e => 
      isSameClass(e.class_name, targetClass) &&
      (targetStream === 'ALL' || e.stream === 'All Streams' || e.stream.toUpperCase() === targetStream.toUpperCase())
    );

    exportRemedialTimetablePDF({
      entries: targetEntries.length > 0 ? targetEntries : filteredEntries,
      schoolInfo,
      className: targetClass,
      streamName: targetStream,
      academicYear: new Date().getFullYear().toString()
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Header Banner */}
      <div className="bg-gradient-to-r from-[#0f2948] via-[#1f4d8b] to-slate-900 rounded-2xl p-6 text-white shadow-md border border-blue-900/50">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-xs border border-white/20 flex items-center justify-center text-amber-300 shadow-xs">
              <Calendar className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white">
                  REMEDIAL TIMETABLE SETUP
                </h2>
                <span className="px-2.5 py-0.5 bg-amber-400 text-slate-900 font-extrabold text-[10px] rounded-full uppercase">
                  Class &amp; Stream Specific
                </span>
              </div>
              <p className="text-xs text-blue-200 mt-1 font-medium max-w-2xl">
                Sanidi ratiba ya masomo ya ziada asubuhi na jioni kwa kila darasa na mkondo wake kuzuia migongano ya walimu na kurahisisha malipo.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleExportPDF}
              className="px-4 py-2 bg-white text-slate-800 hover:bg-slate-100 font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
              title="Download or Print official Remedial Timetable PDF for selected class"
            >
              <Download className="w-4 h-4 text-blue-700" />
              <span>Print Timetable PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* Remedial Key Executive Dashboard Summary */}
      <RemedialDashboardSummary
        schoolId={schoolId}
        onQuickAddSchedule={() => {
          window.scrollTo({ top: 300, behavior: 'smooth' });
        }}
      />

      {/* Alert / Toast message */}
      {alertNotice && (
        <div className={`p-4 rounded-xl border flex items-center justify-between text-xs font-bold animate-in fade-in duration-200 ${
          alertNotice.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-800' :
          alertNotice.type === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-800' :
          'bg-emerald-50 border-emerald-200 text-emerald-800'
        }`}>
          <div className="flex items-center gap-2">
            {alertNotice.type === 'error' ? <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" /> :
             alertNotice.type === 'warning' ? <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" /> :
             <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
            <span>{alertNotice.message}</span>
          </div>
          <button onClick={() => setAlertNotice(null)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* MAIN TWO-COLUMN WORKSPACE: LEFT FORM & RIGHT TIMETABLE TABLE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: + ONGEZA KIPINDI KIPYA (Direct Form with Chagua Mkondo) */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl shadow-xs p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Plus className="w-4 h-4 text-blue-700" />
            <h3 className="font-black text-sm uppercase text-slate-900 tracking-tight">
              + ONGEZA KIPINDI KIPYA
            </h3>
          </div>

          <form onSubmit={handleSave} className="space-y-3.5">
            {/* SIKU YA WIKI & TAREHE */}
            <div>
              <label className="block text-[11px] font-black text-slate-700 uppercase mb-1">
                TAREHE NA SIKU YA WIKI <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={e => setFormData({ ...formData, date: e.target.value })}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500"
                required
              />
              <span className="text-[10px] text-blue-700 font-bold mt-0.5 block">
                Siku: {selectedDayOfWeek}
              </span>
            </div>

            {/* MUDA WA KIPINDI (START & END) */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-black text-slate-700 uppercase mb-1">
                  MUDA KUANZA <span className="text-rose-500">*</span>
                </label>
                <input
                  type="time"
                  value={formData.start_time}
                  onChange={e => setFormData({ ...formData, start_time: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold font-mono text-slate-800 focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-black text-slate-700 uppercase mb-1">
                  MUDA KUICHA <span className="text-rose-500">*</span>
                </label>
                <input
                  type="time"
                  value={formData.end_time}
                  onChange={e => setFormData({ ...formData, end_time: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold font-mono text-slate-800 focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            {/* KIDATO / DARASA */}
            <div>
              <label className="block text-[11px] font-black text-slate-700 uppercase mb-1">
                KIDATO (CLASS) / DARASA <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.class_name}
                onChange={e => setFormData({ ...formData, class_name: e.target.value })}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500"
                required
              >
                <optgroup label="Pre-Primary / Nursery">
                  {REMEDIAL_NURSERY_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                </optgroup>
                <optgroup label="Primary School">
                  {REMEDIAL_PRIMARY_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                </optgroup>
                <optgroup label="Secondary School">
                  {REMEDIAL_SECONDARY_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                </optgroup>
              </select>
            </div>

            {/* CHAGUA MKONDO (STREAM) - PROMINENT & EXPLICIT */}
            <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl space-y-1">
              <label className="block text-[11px] font-black text-blue-950 uppercase flex items-center justify-between">
                <span>CHAGUA MKONDO (STREAM) <span className="text-rose-500">*</span></span>
                <span className="text-[10px] text-blue-700 font-bold">Class-Specific</span>
              </label>
              <select
                value={formData.stream}
                onChange={e => setFormData({ ...formData, stream: e.target.value })}
                className="w-full p-2 bg-white border border-blue-300 rounded-lg text-xs font-black text-slate-900 focus:ring-2 focus:ring-blue-500"
                required
              >
                {STREAM_OPTIONS.map(s => (
                  <option key={s} value={s}>
                    {s === 'All Streams' ? 'Mikondo Yote (All Streams: A, B, C, D)' : `Stream ${s} (Mkondo ${s})`}
                  </option>
                ))}
              </select>
              <span className="text-[10px] text-blue-800 font-semibold block mt-1">
                {formData.stream === 'All Streams'
                  ? `Inahifadhiwa kwa mikondo yote ya ${formData.class_name}.`
                  : `Inahifadhiwa tu kwa ${formData.class_name} Mkondo ${formData.stream}, sio shule nzima.`}
              </span>
            </div>

            {/* SOMO (SUBJECT) */}
            <div>
              <label className="block text-[11px] font-black text-slate-700 uppercase mb-1">
                SOMO (SUBJECT) <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.subject}
                onChange={e => setFormData({ ...formData, subject: e.target.value })}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500"
                required
              >
                {dynamicSubjects.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* MWALIMU (TEACHER) */}
            <div>
              <label className="block text-[11px] font-black text-slate-700 uppercase mb-1">
                MWALIMU (TEACHER) <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.teacher_name}
                onChange={e => setFormData({ ...formData, teacher_name: e.target.value })}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">-- Chagua Mwalimu --</option>
                {teachers.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
              </select>
            </div>

            {/* CHUMBA / ROOM */}
            <div>
              <label className="block text-[11px] font-black text-slate-700 uppercase mb-1">
                CHUMBA / VENUE (OPTIONAL)
              </label>
              <input
                type="text"
                placeholder="e.g. Room 5A, Hall 1"
                value={formData.room}
                onChange={e => setFormData({ ...formData, room: e.target.value })}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* TUMA NOTIFICATION */}
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-2">
              <input
                type="checkbox"
                id="inline_notify_students"
                checked={formData.notify_students}
                onChange={e => setFormData({ ...formData, notify_students: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
              />
              <label htmlFor="inline_notify_students" className="text-[11px] font-bold text-slate-700 cursor-pointer flex items-center gap-1">
                <Bell className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>Tuma arifa kwa wanafunzi wa {formData.class_name} ({formData.stream})</span>
              </label>
            </div>

            {/* SUBMIT BUTTON */}
            <button
              type="submit"
              disabled={saving}
              className="w-full py-2.5 bg-gradient-to-r from-blue-700 to-indigo-800 hover:from-blue-800 hover:to-indigo-900 text-white font-black text-xs rounded-xl shadow-md cursor-pointer transition flex items-center justify-center gap-2"
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              <span>+ HIFADHI KWENYE RATIBA</span>
            </button>
          </form>
        </div>

        {/* RIGHT COLUMN: RATIBA YA REMEDIAL ILIYOPO */}
        <div className="lg:col-span-8 space-y-4">
          {/* Big Filter & Search Bar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 flex-1">
                {/* Filter by Darasa */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Darasa:</span>
                  <select
                    value={classFilter}
                    onChange={e => setClassFilter(e.target.value)}
                    className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="ALL">Madarasa Yote</option>
                    <optgroup label="Pre-Primary / Nursery">
                      {REMEDIAL_NURSERY_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                    </optgroup>
                    <optgroup label="Primary School">
                      {REMEDIAL_PRIMARY_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                    </optgroup>
                    <optgroup label="Secondary School">
                      {REMEDIAL_SECONDARY_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                    </optgroup>
                  </select>
                </div>

                {/* Filter by Mkondo */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Mkondo:</span>
                  <select
                    value={streamFilter}
                    onChange={e => setStreamFilter(e.target.value)}
                    className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="ALL">Mikondo Yote</option>
                    {STREAM_OPTIONS.map(s => <option key={s} value={s}>Stream {s}</option>)}
                  </select>
                </div>

                {/* Filter by Date */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tarehe:</span>
                  <input
                    type="date"
                    value={dateFilter}
                    onChange={e => setDateFilter(e.target.value)}
                    className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500"
                  />
                  {dateFilter && (
                    <button
                      onClick={() => setDateFilter('')}
                      className="text-[11px] font-bold text-rose-600 hover:underline cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Search Input */}
              <div className="relative w-full md:w-56">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search subject, teacher..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Main Big Timetable Table */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                <h3 className="font-extrabold text-xs sm:text-sm text-slate-900 uppercase">
                  RATIBA YA REMEDIAL ILIYOPO ({filteredEntries.length} VIPINDI)
                </h3>
              </div>

              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                <span>Viewing:</span>
                <span className="px-2 py-0.5 bg-blue-100 text-blue-800 font-bold rounded">
                  {classFilter !== 'ALL' ? classFilter : 'All Classes'} {streamFilter !== 'ALL' ? `(Stream ${streamFilter})` : ''}
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead className="bg-slate-100/80 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <tr>
                    <th className="p-3 border-r border-slate-200 w-10 text-center">#</th>
                    <th className="p-3 border-r border-slate-200">Siku &amp; Tarehe</th>
                    <th className="p-3 border-r border-slate-200">Muda (Time)</th>
                    <th className="p-3 border-r border-slate-200">Darasa &amp; Mkondo</th>
                    <th className="p-3 border-r border-slate-200">Somo (Subject)</th>
                    <th className="p-3 border-r border-slate-200">Mwalimu (Teacher)</th>
                    <th className="p-3 border-r border-slate-200">Chumba</th>
                    <th className="p-3 text-center w-24">Hatua</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400 font-bold">
                        Inapakia ratiba ya remedial...
                      </td>
                    </tr>
                  ) : filteredEntries.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-12 text-center text-slate-400">
                        <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="font-bold text-slate-600">Hakuna vipindi vilivyopangwa bado.</p>
                        <p className="text-xs text-slate-400 mt-1">Tumia fomu ya kushoto kuweka kipindi kipya cha darasa na mkondo wake.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredEntries.map((item, idx) => (
                      <tr key={item.id || idx} className="hover:bg-blue-50/40 transition-colors">
                        <td className="p-3 border-r border-slate-200 text-center font-bold text-slate-400">
                          {idx + 1}
                        </td>
                        <td className="p-3 border-r border-slate-200">
                          <div className="font-extrabold text-[#1f4d8b] uppercase">{item.day_of_week}</div>
                          <div className="text-[11px] text-slate-500 font-mono">{item.date || '-'}</div>
                        </td>
                        <td className="p-3 border-r border-slate-200">
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-900 border border-blue-200 rounded font-mono font-bold text-xs">
                            {item.start_time && item.end_time ? `${item.start_time} - ${item.end_time}` : item.period_time}
                          </span>
                        </td>
                        <td className="p-3 border-r border-slate-200">
                          <div className="font-extrabold text-slate-900">{item.class_name}</div>
                          <span className="text-[10px] font-black text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                            {item.stream === 'All Streams' ? 'Mikondo Yote' : `Mkondo ${item.stream}`}
                          </span>
                        </td>
                        <td className="p-3 border-r border-slate-200">
                          <div className="font-extrabold text-slate-900 flex items-center gap-1.5">
                            <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                            <span>{item.subject}</span>
                          </div>
                        </td>
                        <td className="p-3 border-r border-slate-200">
                          <div className="font-bold text-slate-800 flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-slate-500" />
                            <span>{item.teacher_name}</span>
                          </div>
                        </td>
                        <td className="p-3 border-r border-slate-200">
                          <span className="text-slate-600 font-medium">
                            {item.room || `${item.class_name} Room`}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleOpenEdit(item)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                              title="Edit"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(item.id)}
                              className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>

      {/* EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden my-8">
            <div className="bg-[#1f4d8b] text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Calendar className="w-5 h-5 text-amber-400" />
                <h3 className="font-black text-sm uppercase tracking-wide">
                  {editingEntryId ? 'Hariri Kipindi cha Remedial (Edit Session)' : 'Weka Ratiba Mpya ya Remedial'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-white/70 hover:text-white cursor-pointer p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Chagua Darasa */}
                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase mb-1">
                    Chagua Darasa <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.class_name}
                    onChange={e => setFormData({ ...formData, class_name: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <optgroup label="Pre-Primary / Nursery">
                      {REMEDIAL_NURSERY_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                    </optgroup>
                    <optgroup label="Primary School">
                      {REMEDIAL_PRIMARY_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                    </optgroup>
                    <optgroup label="Secondary School">
                      {REMEDIAL_SECONDARY_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                    </optgroup>
                  </select>
                </div>

                {/* Chagua Mkondo */}
                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase mb-1">
                    Chagua Mkondo (Stream) <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.stream}
                    onChange={e => setFormData({ ...formData, stream: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    {STREAM_OPTIONS.map(s => <option key={s} value={s}>Stream {s}</option>)}
                  </select>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    {formData.stream === 'All Streams' 
                      ? 'Inahifadhiwa kwa mikondo yote ya darasa hili.' 
                      : `Inahifadhiwa tu kwa ${formData.class_name} Mkondo ${formData.stream}.`}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Chagua Somo */}
                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase mb-1">
                    Chagua Somo (Subject) <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.subject}
                    onChange={e => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    {dynamicSubjects.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                {/* Chagua Mwalimu */}
                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase mb-1">
                    Chagua Mwalimu <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.teacher_name}
                    onChange={e => setFormData({ ...formData, teacher_name: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">-- Chagua Mwalimu --</option>
                    {teachers.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Tarehe */}
                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase mb-1">
                    Tarehe (Date) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <span className="text-[10px] text-blue-700 font-bold mt-0.5 block">
                    Siku: {selectedDayOfWeek}
                  </span>
                </div>

                {/* Muda Kuanza */}
                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase mb-1">
                    Muda Kuanza <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="time"
                    value={formData.start_time}
                    onChange={e => setFormData({ ...formData, start_time: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 font-mono"
                    required
                  />
                </div>

                {/* Muda Kuisha */}
                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase mb-1">
                    Muda Kuisha <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="time"
                    value={formData.end_time}
                    onChange={e => setFormData({ ...formData, end_time: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 font-mono"
                    required
                  />
                </div>
              </div>

              {/* Chumba / Room */}
              <div>
                <label className="block text-xs font-black text-slate-700 uppercase mb-1">
                  Chumba / Venue (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Room 5A, Science Lab 2, Main Hall"
                  value={formData.room}
                  onChange={e => setFormData({ ...formData, room: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Notification Checkbox */}
              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl flex items-center gap-2.5">
                <input
                  type="checkbox"
                  id="modal_notify_students"
                  checked={formData.notify_students}
                  onChange={e => setFormData({ ...formData, notify_students: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                />
                <label htmlFor="modal_notify_students" className="text-xs font-bold text-blue-900 cursor-pointer flex items-center gap-1.5">
                  <Bell className="w-3.5 h-3.5 text-blue-600" />
                  <span>Tuma taarifa kwa wanafunzi wa {formData.class_name} ({formData.stream}) ratiba inapowekwa</span>
                </label>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
                >
                  Ghairi (Cancel)
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 bg-gradient-to-r from-blue-700 to-indigo-800 hover:from-blue-800 hover:to-indigo-900 text-white font-black text-xs rounded-xl shadow-md cursor-pointer flex items-center gap-2"
                >
                  {saving ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  <span>Hifadhi Mabadiliko</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

