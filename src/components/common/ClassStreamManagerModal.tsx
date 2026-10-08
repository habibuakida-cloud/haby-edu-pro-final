import React, { useState } from 'react';
import { 
  Layers, 
  Plus, 
  Trash2, 
  X, 
  CheckCircle, 
  School, 
  Save, 
  Sparkles, 
  Edit3,
  AlertCircle,
  Users
} from 'lucide-react';
import { EducationLevel, StreamSetting, Student } from '../../types';
import { inferEducationLevel, normalizeStreamName, getNextLogicalStream } from '../../utils/classStreamUtils';
import { TANZANIAN_TEMPLATE_STREAM_SETTINGS } from '../../constants/defaults';

interface ClassStreamManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  streamSettings: StreamSetting[];
  onUpdateStreamSettings: (settings: StreamSetting[]) => void;
  students?: Student[];
}

export const ClassStreamManagerModal: React.FC<ClassStreamManagerModalProps> = ({
  isOpen,
  onClose,
  streamSettings,
  onUpdateStreamSettings,
  students = []
}) => {
  const [selectedClassToEdit, setSelectedClassToEdit] = useState<string | null>(null);
  
  // New Class Form State
  const [newClassName, setNewClassName] = useState('');
  const [newLevel, setNewLevel] = useState<EducationLevel>('CSEE');
  const [newStreamInput, setNewStreamInput] = useState('STREAM A, STREAM B');
  
  // Add Stream to Existing Class State
  const [newStreamForClass, setNewStreamForClass] = useState('');
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [errorToast, setErrorToast] = useState<string | null>(null);

  if (!isOpen) return null;

  const showSuccess = (msg: string) => {
    setSuccessToast(msg);
    setErrorToast(null);
    setTimeout(() => setSuccessToast(null), 4000);
  };

  const showError = (msg: string) => {
    setErrorToast(msg);
    setSuccessToast(null);
    setTimeout(() => setErrorToast(null), 4000);
  };

  const handleAddNewClass = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newClassName.trim();
    if (!cleanName) {
      showError("Tafadhali ingiza jina la darasa (Please enter a class name).");
      return;
    }

    const exists = streamSettings.some(
      s => s.className.toLowerCase().trim() === cleanName.toLowerCase()
    );

    if (exists) {
      showError(`Darasa la "${cleanName}" tayari limesajiliwa (Class already exists).`);
      return;
    }

    const rawStreams = newStreamInput
      .split(/[,;|\n]/)
      .map(s => s.trim())
      .filter(Boolean);

    const formattedStreams = rawStreams.length > 0 
      ? rawStreams.map(st => st.toUpperCase().startsWith('STREAM ') || st.length <= 3 ? st.toUpperCase() : `STREAM ${st.toUpperCase()}`)
      : ['STREAM A', 'STREAM B'];

    const newSetting: StreamSetting = {
      id: Date.now(),
      className: cleanName,
      level: newLevel,
      streams: Array.from(new Set(formattedStreams))
    };

    const updated = [...streamSettings, newSetting];
    onUpdateStreamSettings(updated);
    setNewClassName('');
    setNewStreamInput('STREAM A, STREAM B');
    showSuccess(`✓ Darasa la "${cleanName}" na mikondo (${formattedStreams.join(', ')}) vimesajiliwa kikamilifu!`);
  };

  const handleAddStreamToClass = (className: string) => {
    const cleanStream = newStreamForClass.trim();
    if (!cleanStream) return;

    const formatted = normalizeStreamName(cleanStream);
    const exists = streamSettings.some(s => s.className.toLowerCase().trim() === className.toLowerCase().trim());

    let updated: StreamSetting[];
    if (exists) {
      updated = streamSettings.map(setting => {
        if (setting.className.toLowerCase().trim() === className.toLowerCase().trim()) {
          if (setting.streams.includes(formatted)) return setting;
          return {
            ...setting,
            streams: [...setting.streams, formatted]
          };
        }
        return setting;
      });
    } else {
      updated = [
        ...streamSettings,
        {
          id: Date.now(),
          className,
          level: inferEducationLevel(className),
          streams: ['STREAM A', 'STREAM B', formatted]
        }
      ];
    }

    onUpdateStreamSettings(updated);
    setNewStreamForClass('');
    showSuccess(`✓ Mkondo "${formatted}" umeongezwa kwenye ${className}!`);
  };

  const handleAutoIncreaseStream = (className: string) => {
    const setting = streamSettings.find(s => s.className.toLowerCase().trim() === className.toLowerCase().trim());
    const existing = setting ? setting.streams : ['STREAM A', 'STREAM B'];
    const nextStream = getNextLogicalStream(existing);

    let updated: StreamSetting[];
    if (setting) {
      updated = streamSettings.map(s => {
        if (s.className.toLowerCase().trim() === className.toLowerCase().trim()) {
          if (s.streams.includes(nextStream)) return s;
          return {
            ...s,
            streams: [...s.streams, nextStream]
          };
        }
        return s;
      });
    } else {
      updated = [
        ...streamSettings,
        {
          id: Date.now(),
          className,
          level: inferEducationLevel(className),
          streams: [...existing, nextStream]
        }
      ];
    }

    onUpdateStreamSettings(updated);
    showSuccess(`✓ Mkondo mpya wa "${nextStream}" umeongezwa kwenye ${className}!`);
  };

  const handleDeleteStream = (className: string, streamName: string) => {
    console.log(`[DEBUG] handleDeleteStream called for class: ${className}, stream: ${streamName}`);
    
    // Normalize to ensure consistent comparison
    const normalizedTarget = normalizeStreamName(streamName);
    
    // Check if students exist in this stream
    const studentCount = students.filter(
      s => s.className === className && (normalizeStreamName(s.stream || '') === normalizedTarget || normalizeStreamName(s.combination || '') === normalizedTarget)
    ).length;
    console.log(`[DEBUG] studentCount for normalized target ${normalizedTarget}: ${studentCount}`);

    // Delete stream directly without blocking window.confirm in iframe
    const updated = streamSettings.map(setting => {
      if (setting.className === className) {
        // Normalize streams in list for comparison during filter
        const filtered = setting.streams.filter(st => normalizeStreamName(st) !== normalizedTarget);
        return {
          ...setting,
          streams: filtered
        };
      }
      return setting;
    });

    onUpdateStreamSettings(updated);
    showSuccess(`Mkondo "${streamName}" umefutwa kutoka ${className}.`);
  };

  const handleDeleteClass = (className: string) => {
    // Delete class directly without blocking window.confirm in iframe
    const updated = streamSettings.filter(setting => setting.className !== className);
    onUpdateStreamSettings(updated);
    showSuccess(`Darasa la "${className}" limefutwa kikamilifu.`);
  };

  const handleClearAllClasses = () => {
    onUpdateStreamSettings([]);
    showSuccess('Madarasa na mikondo yote yamefutwa! Unaweza kuanza upya kusajili madarasa yako.');
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-md">
              <Layers className="w-6 h-6 text-yellow-300" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
                <span>Usajili na Muundo wa Madarasa & Mikondo</span>
                <span className="text-[10px] uppercase font-bold bg-yellow-400 text-blue-950 px-2 py-0.5 rounded-full">
                  Central Registry
                </span>
              </h2>
              <p className="text-xs text-blue-100 mt-0.5">
                Madarasa na mikondo yote unayosajili hapa yanaonekana moja kwa moja kwenye Usajili, Ratiba, Matokeo, Mahudhurio, na Malipo.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notifications */}
        {successToast && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-2.5 text-xs font-bold text-emerald-800 flex items-center gap-2 shrink-0">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successToast}</span>
          </div>
        )}
        {errorToast && (
          <div className="bg-rose-50 border-b border-rose-200 px-4 py-2.5 text-xs font-bold text-rose-800 flex items-center gap-2 shrink-0">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorToast}</span>
          </div>
        )}

        {/* Modal Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* Section 1: Form to Add New Class & Streams */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-5">
            <h3 className="text-sm font-black text-slate-900 mb-3 flex items-center gap-2">
              <Plus className="w-4 h-4 text-blue-600" />
              <span>Sajili Darasa Jipya na Mikondo Yake (Register New Class & Streams)</span>
            </h3>
            
            <form onSubmit={handleAddNewClass} className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
              <div className="sm:col-span-4">
                <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">
                  Jina la Darasa (Class Name) *
                </label>
                <input
                  type="text"
                  placeholder="mf. Form 1, Standard 1, Baby Class, Grade 5..."
                  value={newClassName}
                  onChange={e => {
                    setNewClassName(e.target.value);
                    setNewLevel(inferEducationLevel(e.target.value));
                  }}
                  className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 bg-white"
                  required
                />
              </div>

              <div className="sm:col-span-3">
                <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">
                  Ngazi ya Elimu (Level) *
                </label>
                <select
                  value={newLevel}
                  onChange={e => setNewLevel(e.target.value as EducationLevel)}
                  className="w-full px-3 py-2 text-xs font-bold rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="PRE_PRIMARY">Awali / Nursery (Pre-Primary)</option>
                  <option value="PRIMARY">Msingi / Primary (Std 1 - 7)</option>
                  <option value="CSEE">Sekondari O-Level (Form 1 - 4)</option>
                  <option value="ACSEE">Sekondari A-Level (Form 5 - 6)</option>
                </select>
              </div>

              <div className="sm:col-span-3">
                <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">
                  Mikondo (Streams / Combinations)
                </label>
                <input
                  type="text"
                  placeholder="STREAM A, STREAM B, PCM..."
                  value={newStreamInput}
                  onChange={e => setNewStreamInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 bg-white"
                />
                <span className="text-[10px] text-slate-400 block mt-0.5">Tenganisha kwa mkato (comma)</span>
              </div>

              <div className="sm:col-span-2 flex items-end">
                <button
                  type="submit"
                  className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Sajili Darasa</span>
                </button>
              </div>
            </form>
          </div>

          {/* Section 2: Directory of All Registered Classes & Streams */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <div>
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <School className="w-4 h-4 text-indigo-600" />
                  <span>Orodha ya Madarasa Yote Yaliyosajiliwa ({streamSettings.length})</span>
                </h3>
                <span className="text-xs text-slate-500 font-medium">
                  Jumla ya Wanafunzi Waliosajiliwa: <strong className="text-slate-900">{students.length}</strong>
                </span>
              </div>

              <div className="flex items-center gap-2">
                {streamSettings.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAllClasses}
                    className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    title="Futa madarasa yote ili kuanza upya"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Futa Madarasa Yote (Anza Upya)</span>
                  </button>
                )}
                {streamSettings.length === 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      onUpdateStreamSettings(TANZANIAN_TEMPLATE_STREAM_SETTINGS);
                      showSuccess('Sampuli ya kawaida ya madarasa ya Tanzania imepakiwa!');
                    }}
                    className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                    <span>Pakia Sampuli ya Tanzania</span>
                  </button>
                )}
              </div>
            </div>

            {streamSettings.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl space-y-2">
                <School className="w-10 h-10 text-slate-300 mx-auto" />
                <h4 className="text-sm font-bold text-slate-700">Hakuna Madarasa au Mikondo Iliyosajiliwa</h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Mfumo uko safi. Tumia fomu iliyo juu kusajili darasa na mikondo unayotaka mwenyewe (mfano: "Form 1", "Standard 1", "Nursery", au mikondo maalum).
                </p>
              </div>
            ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {streamSettings.map(setting => {
                const classStudents = students.filter(s => s.className === setting.className);
                const isEditing = selectedClassToEdit === setting.className;

                return (
                  <div 
                    key={setting.className}
                    className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs hover:border-blue-300 transition-all space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-black text-slate-900">{setting.className}</h4>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                            {setting.level === 'PRE_PRIMARY' ? 'Nursery' : setting.level === 'PRIMARY' ? 'Primary' : setting.level === 'ACSEE' ? 'A-Level' : 'O-Level'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                          <Users className="w-3 h-3 text-slate-400" />
                          <span>{classStudents.length} wanafunzi waliosajiliwa</span>
                        </p>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleAutoIncreaseStream(setting.className)}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-all cursor-pointer text-xs font-black flex items-center gap-1 shadow-2xs active:scale-95"
                          title="Ongeza mkondo unaofuata kiotomatiki (mf. STREAM C, STREAM D)"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>+ Ongeza Mkondo</span>
                        </button>
                        {setting.streams.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const lastStream = setting.streams[setting.streams.length - 1];
                              handleDeleteStream(setting.className, lastStream);
                            }}
                            className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg transition-all cursor-pointer text-xs font-black flex items-center gap-1 shadow-2xs active:scale-95"
                            title={`Punguza mkondo wa mwisho (${setting.streams[setting.streams.length - 1]})`}
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                            <span>- Punguza Mkondo</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setSelectedClassToEdit(isEditing ? null : setting.className)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer text-xs font-bold flex items-center gap-1"
                          title="Ongeza kwa kuandika au rekebisha mikondo"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>{isEditing ? 'Funga' : 'Badili'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteClass(setting.className)}
                          className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Futa darasa hili"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Streams Tags List */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Mikondo / Streams ({setting.streams.length}):
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {setting.streams.map(st => {
                          const streamStudentsCount = classStudents.filter(
                            s => (s.stream || '').toUpperCase().includes(st.toUpperCase().replace(/^STREAM\s+/i, '')) ||
                                 (s.combination || '').toUpperCase() === st.toUpperCase()
                          ).length;

                          return (
                            <span
                              key={st}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200 group"
                            >
                              <span>{st}</span>
                              <span className="text-[10px] font-black text-slate-500 bg-white px-1.5 py-0.2 rounded border border-slate-200">
                                {streamStudentsCount}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleDeleteStream(setting.className, st)}
                                className="text-slate-400 hover:text-rose-600 ml-0.5 cursor-pointer"
                                title={`Futa ${st}`}
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    {/* Inline Form to Add Stream to this Class */}
                    {isEditing && (
                      <div className="pt-2.5 border-t border-slate-100 flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Jina la mkondo mpya (mf. STREAM C, PCB)..."
                          value={newStreamForClass}
                          onChange={e => setNewStreamForClass(e.target.value)}
                          className="flex-1 px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddStreamToClass(setting.className);
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => handleAddStreamToClass(setting.className)}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg cursor-pointer shrink-0"
                        >
                          Ongeza
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            )}
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500 font-medium">
            Usajili unaohifadhiwa hapa unahifadhiwa kwenye Cloud (Firestore & Supabase) papo hapo.
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
          >
            Funga / Done
          </button>
        </div>

      </div>
    </div>
  );
};
