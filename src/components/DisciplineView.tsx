import React, { useState, useMemo } from 'react';
import { 
  ShieldAlert, 
  Plus, 
  Search, 
  Filter, 
  CheckCircle2, 
  AlertTriangle, 
  Award, 
  Trash2, 
  Clock, 
  User,
  X,
  FileText,
  Printer
} from 'lucide-react';
import { DisciplineRecord, Student, UserAccount } from '../types';
import { 
  NURSERY_CLASSES, 
  PRIMARY_CLASSES, 
  SECONDARY_CLASSES 
} from '../constants/defaults';

interface DisciplineViewProps {
  records: DisciplineRecord[];
  students: Student[];
  currentUser?: UserAccount | null;
  onAddRecord: (record: DisciplineRecord) => void;
  onUpdateRecord: (record: DisciplineRecord) => void;
  onDeleteRecord: (id: string) => void;
}

export const DisciplineView: React.FC<DisciplineViewProps> = ({
  records,
  students,
  currentUser,
  onAddRecord,
  onUpdateRecord,
  onDeleteRecord
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState<string>('All');
  const [streamFilter, setStreamFilter] = useState<string>('All');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [isModalOpen, setIsModalOpen] = useState(false);

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

  // Form state
  const [studentReg, setStudentReg] = useState(students[0]?.regNo || '');
  const [category, setCategory] = useState<DisciplineRecord['category']>('Infraction');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [actionTaken, setActionTaken] = useState('');
  const [status, setStatus] = useState<DisciplineRecord['status']>('Open');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      const matchSearch = !searchQuery || 
        r.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.regNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCategory = categoryFilter === 'All' || r.category === categoryFilter;
      const matchStatus = statusFilter === 'All' || r.status === statusFilter;
      const matchClass = classFilter === 'All' || r.className?.toLowerCase() === classFilter.toLowerCase();
      
      const st = students.find(s => s.regNo === r.regNo || s.id === r.studentId);
      const studentStream = st?.stream ? st.stream.toUpperCase().replace(/^STREAM\s+/i, '') : '';
      const matchStream = streamFilter === 'All' || studentStream === streamFilter.toUpperCase();

      return matchSearch && matchCategory && matchStatus && matchClass && matchStream;
    });
  }, [records, searchQuery, categoryFilter, statusFilter, classFilter, streamFilter, students]);

  const stats = useMemo(() => {
    const total = records.length;
    const merits = records.filter(r => r.category === 'Merit').length;
    const infractions = records.filter(r => r.category === 'Infraction').length;
    const openCases = records.filter(r => r.status === 'Open' || r.status === 'Under Review').length;
    const resolved = records.filter(r => r.status === 'Resolved').length;
    return { total, merits, infractions, openCases, resolved };
  }, [records]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const st = students.find(s => s.regNo === studentReg);
    if (!st) {
      alert('Please select a valid student.');
      return;
    }
    if (!title.trim() || !description.trim()) {
      alert('Please fill in title and description.');
      return;
    }

    const newRec: DisciplineRecord = {
      id: `disc_${Date.now()}`,
      studentId: st.id,
      studentName: st.name,
      regNo: st.regNo,
      className: st.className,
      date,
      category,
      title: title.trim(),
      description: description.trim(),
      actionTaken: actionTaken.trim() || 'Pending administrative review',
      reportedBy: currentUser?.fullName || 'Duty Teacher',
      status
    };

    onAddRecord(newRec);
    setIsModalOpen(false);
    setTitle('');
    setDescription('');
    setActionTaken('');
  };

  const handleToggleStatus = (rec: DisciplineRecord) => {
    const nextStatus = rec.status === 'Resolved' ? 'Open' : 'Resolved';
    onUpdateRecord({
      ...rec,
      status: nextStatus
    });
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 text-blue-700 rounded-xl flex items-center justify-center shrink-0">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Records</div>
            <div className="text-2xl font-black text-slate-900 mt-0.5">{stats.total}</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-xl flex items-center justify-center shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pending / Open</div>
            <div className="text-2xl font-black text-amber-600 mt-0.5">{stats.openCases}</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-xl flex items-center justify-center shrink-0">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Merits & Commendations</div>
            <div className="text-2xl font-black text-emerald-600 mt-0.5">{stats.merits}</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-100 text-indigo-700 rounded-xl flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Resolved Cases</div>
            <div className="text-2xl font-black text-indigo-600 mt-0.5">{stats.resolved}</div>
          </div>
        </div>
      </div>

      {/* Action Bar & Filters */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Log Conduct Incident</span>
          </button>

          <div className="flex items-center gap-1.5">
            <span className="font-bold text-slate-500 uppercase text-[11px]">Class:</span>
            <select
              value={classFilter}
              onChange={e => setClassFilter(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold text-slate-700"
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
            <span className="font-bold text-slate-500 uppercase text-[11px]">Stream:</span>
            <select
              value={streamFilter}
              onChange={e => setStreamFilter(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold text-slate-700"
            >
              <option value="All">All Streams</option>
              {availableStreams.map(str => (
                <option key={str} value={str}>Stream {str}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="font-bold text-slate-500 uppercase text-[11px]">Category:</span>
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold text-slate-700"
            >
              <option value="All">All Categories</option>
              <option value="Infraction">Infraction</option>
              <option value="Merit">Merit / Award</option>
              <option value="Attendance">Attendance</option>
              <option value="Academic">Academic</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="font-bold text-slate-500 uppercase text-[11px]">Status:</span>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold text-slate-700"
            >
              <option value="All">All Statuses</option>
              <option value="Open">Open</option>
              <option value="Under Review">Under Review</option>
              <option value="Resolved">Resolved</option>
            </select>
          </div>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search incident, student or reg no..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg w-56 sm:w-64 focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
      </div>

      {/* Discipline Ledger Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <h3 className="text-base font-bold text-[#1f4d8b]">
            Student Conduct & Discipline Ledger ({filteredRecords.length})
          </h3>
          <span className="text-xs text-slate-500 font-medium">
            Official Disciplinary Record Log
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                <th className="p-3 border-r border-slate-200">Date</th>
                <th className="p-3 border-r border-slate-200">Reg No</th>
                <th className="p-3 border-r border-slate-200">Student Name</th>
                <th className="p-3 border-r border-slate-200 text-center">Class</th>
                <th className="p-3 border-r border-slate-200 text-center">Type</th>
                <th className="p-3 border-r border-slate-200 min-w-[180px]">Incident / Commendation</th>
                <th className="p-3 border-r border-slate-200 min-w-[160px]">Action Taken</th>
                <th className="p-3 border-r border-slate-200">Reported By</th>
                <th className="p-3 border-r border-slate-200 text-center">Status</th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-400 font-medium">
                    No disciplinary records found. Click "+ Log Conduct Incident" to record student behavior or commendations.
                  </td>
                </tr>
              ) : (
                filteredRecords.map(rec => (
                  <tr key={rec.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 border-r border-slate-200 font-mono text-slate-600 whitespace-nowrap">
                      {rec.date}
                    </td>
                    <td className="p-3 border-r border-slate-200 font-mono font-bold text-slate-800">
                      {rec.regNo}
                    </td>
                    <td className="p-3 border-r border-slate-200 font-bold text-slate-900">
                      {rec.studentName}
                    </td>
                    <td className="p-3 border-r border-slate-200 text-center font-medium text-slate-700">
                      {rec.className}
                    </td>
                    <td className="p-3 border-r border-slate-200 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full font-bold text-[10px] ${
                        rec.category === 'Merit' 
                          ? 'bg-emerald-100 text-emerald-800' 
                          : rec.category === 'Attendance' 
                          ? 'bg-amber-100 text-amber-800' 
                          : 'bg-rose-100 text-rose-800'
                      }`}>
                        {rec.category}
                      </span>
                    </td>
                    <td className="p-3 border-r border-slate-200">
                      <div className="font-bold text-slate-800">{rec.title}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{rec.description}</div>
                    </td>
                    <td className="p-3 border-r border-slate-200 text-slate-700 font-medium">
                      {rec.actionTaken}
                    </td>
                    <td className="p-3 border-r border-slate-200 text-slate-600 font-medium whitespace-nowrap">
                      {rec.reportedBy}
                    </td>
                    <td className="p-3 border-r border-slate-200 text-center">
                      <button
                        onClick={() => handleToggleStatus(rec)}
                        title="Click to toggle status"
                        className={`px-2 py-0.5 rounded-md font-bold text-[10px] cursor-pointer transition-colors ${
                          rec.status === 'Resolved' 
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                            : 'bg-amber-100 text-amber-800 border border-amber-300'
                        }`}
                      >
                        {rec.status}
                      </button>
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => {
                          if (confirm(`Delete record for ${rec.studentName}?`)) {
                            onDeleteRecord(rec.id);
                          }
                        }}
                        className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Incident Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-black text-lg text-[#1f4d8b] flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-blue-600" />
                <span>Log Conduct Incident / Merit</span>
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 uppercase block mb-1">Select Candidate *</label>
                <select
                  value={studentReg}
                  onChange={e => setStudentReg(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-bold"
                  required
                >
                  {students.map(s => (
                    <option key={s.id} value={s.regNo}>{s.regNo} - {s.name} ({s.className})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 uppercase block mb-1">Category *</label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value as DisciplineRecord['category'])}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-bold"
                  >
                    <option value="Infraction">Infraction / Misconduct</option>
                    <option value="Merit">Merit / Commendation</option>
                    <option value="Attendance">Attendance Infraction</option>
                    <option value="Academic">Academic Neglect</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 uppercase block mb-1">Date *</label>
                  <input
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-bold"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 uppercase block mb-1">Incident / Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Uniform violation or Peer Tutoring Excellence"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 uppercase block mb-1">Full Description *</label>
                <textarea
                  rows={3}
                  placeholder="Provide detailed context regarding the behavior or achievement..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 uppercase block mb-1">Action Taken / Resolution</label>
                <input
                  type="text"
                  placeholder="e.g. Verbal warning, Detention, Commendation letter issued"
                  value={actionTaken}
                  onChange={e => setActionTaken(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 uppercase block mb-1">Initial Status</label>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value as DisciplineRecord['status'])}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-bold"
                >
                  <option value="Open">Open</option>
                  <option value="Under Review">Under Review</option>
                  <option value="Resolved">Resolved</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg font-bold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-xs"
                >
                  Save Incident
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
