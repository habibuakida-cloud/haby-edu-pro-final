import React, { useState } from 'react';
import { 
  Users, 
  GraduationCap, 
  Plus, 
  Trash2, 
  Save, 
  CheckCircle2, 
  Edit3, 
  X,
  BookOpen,
  ArrowRight,
  ArrowLeft,
  Check,
  Layers,
  Sparkles
} from 'lucide-react';
import { Teacher, TeacherAssignment, StreamSetting } from '../../types';
import { SUBJECT_LIST, NURSERY_SUBJECTS, PRIMARY_SUBJECTS, SECONDARY_SUBJECTS } from '../../constants/defaults';

interface TeacherAssignmentsTabProps {
  teachers: Teacher[];
  streamSettings: StreamSetting[];
  teacherAssignments: TeacherAssignment[];
  onUpdateTeacherAssignments: (assignments: TeacherAssignment[]) => void;
}

export const TeacherAssignmentsTab: React.FC<TeacherAssignmentsTabProps> = ({
  teachers,
  streamSettings,
  teacherAssignments,
  onUpdateTeacherAssignments
}) => {
  const [localAssignments, setLocalAssignments] = useState<TeacherAssignment[]>(teacherAssignments);
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4>(1);

  // Wizard Form State (One subject after another)
  const [selectedTeacherId, setSelectedTeacherId] = useState<number>(teachers[0]?.id || 101);
  const [selectedLevel, setSelectedLevel] = useState<'NURSERY' | 'PRIMARY' | 'SECONDARY'>('SECONDARY');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedStreams, setSelectedStreams] = useState<string[]>([]);
  const [savedToast, setSavedToast] = useState(false);

  // Edit Modal State
  const [editingAssignment, setEditingAssignment] = useState<TeacherAssignment | null>(null);
  const [editTeacherId, setEditTeacherId] = useState<number>(0);
  const [editLevel, setEditLevel] = useState<'NURSERY' | 'PRIMARY' | 'SECONDARY'>('SECONDARY');
  const [editSubject, setEditSubject] = useState<string>('');
  const [editStreams, setEditStreams] = useState<string[]>([]);

  // Selected teacher details
  const currentTeacher = teachers.find(t => t.id === Number(selectedTeacherId)) || teachers[0];

  // Subject options for current level & teacher
  const teacherSubjects = currentTeacher?.subjects || [];
  const levelSubjects = selectedLevel === 'NURSERY' 
    ? NURSERY_SUBJECTS 
    : selectedLevel === 'PRIMARY' 
    ? PRIMARY_SUBJECTS 
    : SECONDARY_SUBJECTS;
  // Merge teacher's preferred subjects first, then all level subjects
  const availableSubjectOptions = Array.from(new Set([...teacherSubjects, ...levelSubjects]));

  // Streams filtered by the selected level for easy selection
  const relevantStreams = streamSettings
    .filter(ss => {
      if (selectedLevel === 'NURSERY') return ss.level === 'PRE_PRIMARY';
      if (selectedLevel === 'PRIMARY') return ss.level === 'PRIMARY';
      return ss.level === 'CSEE' || ss.level === 'ACSEE';
    })
    .flatMap(ss => ss.streams.map(str => `${ss.className} - ${str}`));

  // All stream options for edit modal
  const allAvailableStreamOptions = streamSettings.flatMap(ss => 
    ss.streams.map(str => `${ss.className} - ${str}`)
  );

  const handleToggleStream = (streamTag: string) => {
    if (selectedStreams.includes(streamTag)) {
      setSelectedStreams(selectedStreams.filter(s => s !== streamTag));
    } else {
      setSelectedStreams([...selectedStreams, streamTag]);
    }
  };

  const handleToggleEditStream = (streamTag: string) => {
    if (editStreams.includes(streamTag)) {
      setEditStreams(editStreams.filter(s => s !== streamTag));
    } else {
      setEditStreams([...editStreams, streamTag]);
    }
  };

  // Add assignment from Wizard (Single subject per assignment)
  const handleAddAssignment = () => {
    if (!currentTeacher || !selectedSubject || selectedStreams.length === 0) return;

    const newAssignment: TeacherAssignment = {
      id: `ta_${currentTeacher.id}_${selectedSubject.replace(/\s+/g, '_')}_${Date.now()}`,
      teacherId: currentTeacher.id,
      teacherName: currentTeacher.name,
      level: selectedLevel,
      subjects: [selectedSubject], // One subject at a time
      streams: selectedStreams
    };

    const next = [...localAssignments, newAssignment];
    setLocalAssignments(next);
    setSelectedStreams([]);
    setSelectedSubject('');
    setWizardStep(3); // Keep on subject step to assign the next subject for this teacher!
  };

  // Open Edit Modal
  const handleOpenEdit = (assignment: TeacherAssignment) => {
    setEditingAssignment(assignment);
    setEditTeacherId(assignment.teacherId);
    setEditLevel(assignment.level);
    setEditSubject(assignment.subjects[0] || '');
    setEditStreams([...assignment.streams]);
  };

  // Save Edit
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAssignment || !editSubject || editStreams.length === 0) return;

    const teacher = teachers.find(t => t.id === Number(editTeacherId));
    const updated: TeacherAssignment = {
      ...editingAssignment,
      teacherId: teacher?.id || editingAssignment.teacherId,
      teacherName: teacher?.name || editingAssignment.teacherName,
      level: editLevel,
      subjects: [editSubject],
      streams: editStreams
    };

    setLocalAssignments(prev => prev.map(a => a.id === editingAssignment.id ? updated : a));
    setEditingAssignment(null);
  };

  const handleDeleteAssignment = (id: string) => {
    if (window.confirm("Are you sure you want to remove this teacher assignment?")) {
      const next = localAssignments.filter(a => a.id !== id);
      setLocalAssignments(next);
    }
  };

  const handleSaveAll = () => {
    onUpdateTeacherAssignments(localAssignments);
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 3500);
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-gradient-to-r from-[#1f4d8b] to-blue-900 text-white p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <h2 className="text-base font-black tracking-tight">Teacher Assignments & Stream Allocations</h2>
            <p className="text-xs text-blue-200">
              Assign teachers to academic levels, individual subjects (one by one), and teaching streams
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSaveAll}
          className="px-4 py-2.5 bg-amber-400 hover:bg-amber-500 text-slate-950 font-black rounded-xl text-xs shadow-md flex items-center gap-2 transition cursor-pointer active:scale-[0.98] w-fit"
        >
          <Save className="w-4 h-4" />
          <span>Save Assignments Ledger</span>
        </button>
      </div>

      {savedToast && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs rounded-xl flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-bold">Teacher assignments successfully synchronized and saved to database!</span>
        </div>
      )}

      {/* Stepper / Wizard Card (One subject after another) */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-blue-600" />
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
              Step-by-Step Teacher Subject Assignment Wizard
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            Assign ONE subject at a time to ensure timetable integrity
          </span>
        </div>

        {/* Wizard Stepper Progress Indicators */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { step: 1, label: '1. Teacher', done: wizardStep > 1, active: wizardStep === 1 },
            { step: 2, label: '2. Level', done: wizardStep > 2, active: wizardStep === 2 },
            { step: 3, label: '3. Subject', done: wizardStep > 3, active: wizardStep === 3 },
            { step: 4, label: '4. Streams', done: false, active: wizardStep === 4 }
          ].map(s => (
            <button
              key={s.step}
              type="button"
              onClick={() => setWizardStep(s.step as any)}
              className={`p-2.5 rounded-xl border text-xs font-bold text-left transition flex items-center justify-between cursor-pointer ${
                s.active 
                  ? 'bg-blue-50 border-blue-400 text-blue-800 ring-2 ring-blue-500/20 shadow-xs' 
                  : s.done 
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800' 
                  : 'bg-slate-50 border-slate-200 text-slate-500'
              }`}
            >
              <span>{s.label}</span>
              {s.done && <Check className="w-3.5 h-3.5 text-emerald-600" />}
            </button>
          ))}
        </div>

        {/* Wizard Step 1: Select Teacher */}
        {wizardStep === 1 && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div>
              <label className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-2">
                Step 1: Choose Faculty Member
              </label>
              <select
                value={selectedTeacherId}
                onChange={(e) => {
                  setSelectedTeacherId(Number(e.target.value));
                  setSelectedSubject('');
                }}
                className="w-full sm:w-96 px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                {teachers.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.schoolRole || 'Teacher'}) &bull; Subjects: {t.subjects?.join(', ') || 'General'}
                  </option>
                ))}
              </select>
            </div>

            {currentTeacher && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 space-y-1">
                <p><strong>Selected Teacher:</strong> {currentTeacher.name}</p>
                <p><strong>Specialized Subjects:</strong> {currentTeacher.subjects?.join(', ') || 'Not specified'}</p>
                <p><strong>Max Periods/Week:</strong> {currentTeacher.maxPeriodsPerWeek || 24}</p>
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setWizardStep(2)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <span>Continue to Level</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Wizard Step 2: Select Teaching Level */}
        {wizardStep === 2 && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <label className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-2">
              Step 2: Select Teaching Academic Level
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { level: 'NURSERY' as const, label: 'NURSERY LEVEL', desc: 'Pre-Primary: Baby, Middle, Pre-Unit' },
                { level: 'PRIMARY' as const, label: 'PRIMARY LEVEL', desc: 'Standard 1 - Standard 7' },
                { level: 'SECONDARY' as const, label: 'SECONDARY LEVEL', desc: 'Form 1 - Form 4 & Form 5 - 6' }
              ].map(opt => (
                <button
                  key={opt.level}
                  type="button"
                  onClick={() => {
                    setSelectedLevel(opt.level);
                    setSelectedSubject('');
                    setSelectedStreams([]);
                  }}
                  className={`p-4 rounded-xl border text-left transition cursor-pointer ${
                    selectedLevel === opt.level 
                      ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-500/20' 
                      : 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100'
                  }`}
                >
                  <div className="font-extrabold text-xs">{opt.label}</div>
                  <div className={`text-[11px] mt-1 ${selectedLevel === opt.level ? 'text-blue-100' : 'text-slate-500'}`}>
                    {opt.desc}
                  </div>
                </button>
              ))}
            </div>

            <div className="flex justify-between pt-2">
              <button
                type="button"
                onClick={() => setWizardStep(1)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
              <button
                type="button"
                onClick={() => setWizardStep(3)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <span>Continue to Subject</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Wizard Step 3: Select ONE Subject at a time */}
        {wizardStep === 3 && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div>
              <label className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-1">
                Step 3: Select ONE Subject to Assign ({currentTeacher?.name})
              </label>
              <p className="text-xs text-slate-500 mb-3">
                Select a single subject to allocate to streams. You can repeat this step for additional subjects.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-56 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-200">
                {availableSubjectOptions.map(subj => {
                  const isSelected = selectedSubject === subj;
                  return (
                    <button
                      key={subj}
                      type="button"
                      onClick={() => setSelectedSubject(subj)}
                      className={`p-2.5 rounded-lg text-xs font-bold text-left transition flex items-center justify-between cursor-pointer ${
                        isSelected 
                          ? 'bg-blue-600 text-white shadow-xs' 
                          : 'bg-white text-slate-800 border border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <span className="truncate">{subj}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-white shrink-0 ml-1" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-between pt-2">
              <button
                type="button"
                onClick={() => setWizardStep(2)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
              <button
                type="button"
                disabled={!selectedSubject}
                onClick={() => setWizardStep(4)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <span>Continue to Streams ({selectedSubject || 'None'})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Wizard Step 4: Select Target Streams & Confirm Assignment */}
        {wizardStep === 4 && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-900">
              <div>
                <strong>Assigning:</strong> {currentTeacher?.name} &bull; <strong>Level:</strong> {selectedLevel} &bull; <strong>Subject:</strong> <span className="underline font-bold">{selectedSubject}</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedStreams(relevantStreams)}
                className="text-[11px] font-bold text-blue-700 hover:underline cursor-pointer"
              >
                Select All {selectedLevel} Streams
              </button>
            </div>

            <div>
              <label className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-2">
                Step 4: Select Streams Taught by {currentTeacher?.name} for {selectedSubject}:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-56 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-200">
                {relevantStreams.map(tag => {
                  const checked = selectedStreams.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleToggleStream(tag)}
                      className={`px-3 py-2 rounded-lg text-xs font-bold text-left transition flex items-center justify-between cursor-pointer ${
                        checked
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <span className="truncate">{tag}</span>
                      {checked && <Check className="w-3.5 h-3.5 text-white shrink-0 ml-1" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-between items-center pt-2">
              <button
                type="button"
                onClick={() => setWizardStep(3)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Subject</span>
              </button>

              <button
                type="button"
                onClick={handleAddAssignment}
                disabled={selectedStreams.length === 0}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-black shadow-md transition flex items-center gap-2 cursor-pointer active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Confirm Assignment: {selectedSubject} ({selectedStreams.length} Streams)</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Assignments Ledger Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-600" />
            <span className="font-black text-slate-900 text-xs uppercase tracking-wider">
              Teacher Assignments Ledger ({localAssignments.length} records)
            </span>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            Saved to school timetable policy database
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#1f4d8b] text-white uppercase text-[10px] tracking-wider">
              <tr>
                <th className="p-3">Teacher</th>
                <th className="p-3">Level</th>
                <th className="p-3">Subject</th>
                <th className="p-3">Assigned Streams</th>
                <th className="p-3 text-center w-28">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {localAssignments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-slate-400">
                    No teacher assignments configured yet. Use the stepper wizard above to assign teachers to subjects and streams.
                  </td>
                </tr>
              ) : (
                localAssignments.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition">
                    <td className="p-3 font-bold text-slate-900 flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center font-black text-xs">
                        {item.teacherName.charAt(0)}
                      </div>
                      <span>{item.teacherName}</span>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded font-black text-[10px] ${
                        item.level === 'NURSERY'
                          ? 'bg-amber-100 text-amber-800'
                          : item.level === 'PRIMARY'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {item.level}
                      </span>
                    </td>
                    <td className="p-3 text-slate-900 font-bold">
                      {item.subjects.join(', ')}
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        {item.streams.map(str => (
                          <span key={str} className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-bold text-[10px]">
                            {str}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {/* Edit Button */}
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(item)}
                          className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                          title="Edit Teacher Assignment"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={() => handleDeleteAssignment(item.id)}
                          className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                          title="Delete Teacher Assignment"
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* Edit Assignment Modal */}
      {editingAssignment && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-black text-slate-900">Edit Teacher Assignment</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingAssignment(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Teacher</label>
                <select
                  value={editTeacherId}
                  onChange={(e) => setEditTeacherId(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800"
                >
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Level</label>
                  <select
                    value={editLevel}
                    onChange={(e) => setEditLevel(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800"
                  >
                    <option value="NURSERY">NURSERY LEVEL</option>
                    <option value="PRIMARY">PRIMARY LEVEL</option>
                    <option value="SECONDARY">SECONDARY LEVEL</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Subject</label>
                  <input
                    type="text"
                    required
                    value={editSubject}
                    onChange={(e) => setEditSubject(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800"
                    placeholder="Subject Name"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Assigned Streams ({editStreams.length} selected):
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-48 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-200">
                  {allAvailableStreamOptions.map(tag => {
                    const checked = editStreams.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => handleToggleEditStream(tag)}
                        className={`px-2 py-1.5 rounded-lg text-[11px] font-bold text-left transition flex items-center justify-between cursor-pointer ${
                          checked
                            ? 'bg-blue-600 text-white'
                            : 'bg-white text-slate-700 border border-slate-200'
                        }`}
                      >
                        <span className="truncate">{tag}</span>
                        {checked && <Check className="w-3 h-3 text-white shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingAssignment(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!editSubject || editStreams.length === 0}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-black shadow-md cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
