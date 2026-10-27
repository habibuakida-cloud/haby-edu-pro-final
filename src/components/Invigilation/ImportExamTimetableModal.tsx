import React, { useState } from 'react';
import { 
  X, 
  Upload, 
  FileSpreadsheet, 
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  HelpCircle,
  FileText,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Info
} from 'lucide-react';
import { InvigilationSession, Teacher } from '../../types';
import { parseCSVLines, escapeCSV, downloadFile } from '../../utils/export';
import { getDayAndFormattedDate } from './SessionEditModal';

interface ImportExamTimetableModalProps {
  existingTeachers: Teacher[];
  onImport: (
    importedSessions: InvigilationSession[], 
    importedAssignments: Record<string, number>,
    replaceExisting: boolean
  ) => void;
  onClose: () => void;
}

export function downloadExamTimetableSampleCSV() {
  const sampleData = [
    ['Date', 'Day', 'Session', 'Start Time', 'End Time', 'Subject / Exam Title', 'Class / Form', 'Stream', 'Rooms', 'Assigned Invigilators'],
    ['2026-10-15', 'Thursday', 'SESSION I', '08:00', '10:30', 'Mathematics Paper 1', 'Form 4', 'STREAM A', '3', 'Room 1: J. Mwangi; Room 2: S. Bakari; Room 3: A. Juma'],
    ['2026-10-15', 'Thursday', 'SESSION II', '13:00', '15:30', 'English Language Paper 2', 'Form 4', 'STREAM A', '3', 'Room 1: M. Hassan; Room 2: K. Issa; Room 3: R. Dennis'],
    ['2026-10-16', 'Friday', 'SESSION I', '08:00', '10:30', 'Biology Paper 1', 'Form 2', 'ALL STREAMS', '2', 'Room 1: E. Joseph; Room 2: N. Rose'],
    ['2026-10-16', 'Friday', 'SESSION II', '13:00', '15:30', 'Geography Paper 1', 'Form 2', 'ALL STREAMS', '2', 'Room 1: L. Said; Room 2: T. Amina'],
    ['2026-10-19', 'Monday', 'SESSION I', '08:00', '11:00', 'Chemistry Practical Paper 3', 'Form 4', 'SCIENCE', '2', 'Room 1: D. Peter; Room 2: B. Ally']
  ];

  const csvContent = sampleData.map(row => row.map(cell => escapeCSV(cell)).join(',')).join('\n');
  downloadFile('Exam_Timetable_Import_Template.csv', csvContent, 'text/csv;charset=utf-8;');
}

export const ImportExamTimetableModal: React.FC<ImportExamTimetableModalProps> = ({
  existingTeachers,
  onImport,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [pastedText, setPastedText] = useState('');
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileName, setFileName] = useState('');

  // Parsed results
  const [parsedSessions, setParsedSessions] = useState<InvigilationSession[]>([]);
  const [parsedAssignments, setParsedAssignments] = useState<Record<string, number>>({});
  const [warnings, setWarnings] = useState<string[]>([]);
  const [errors, setErrors] = useState<string[]>([]);

  // Find teacher matching fuzzy name or initial
  const findTeacher = (query: string): Teacher | undefined => {
    if (!query) return undefined;
    const clean = query.trim().toLowerCase();
    return existingTeachers.find(t => 
      t.name.toLowerCase() === clean ||
      t.initial.toLowerCase() === clean ||
      t.name.toLowerCase().includes(clean) ||
      clean.includes(t.name.toLowerCase()) ||
      (t.initial && clean.includes(t.initial.toLowerCase()))
    );
  };

  const processCSVContent = (content: string) => {
    setIsProcessing(true);
    setWarnings([]);
    setErrors([]);

    try {
      const rows = parseCSVLines(content);
      if (rows.length < 2) {
        setErrors(['CSV content is empty or contains no data rows.']);
        setIsProcessing(false);
        return;
      }

      // Find column indices from header
      const header = rows[0].map(h => h.toLowerCase());
      
      const idxDate = header.findIndex(h => h.includes('date'));
      const idxDay = header.findIndex(h => h.includes('day'));
      const idxSession = header.findIndex(h => h.includes('session'));
      const idxStart = header.findIndex(h => h.includes('start') || h === 'from');
      const idxEnd = header.findIndex(h => h.includes('end') || h === 'to');
      const idxTime = header.findIndex(h => h.includes('time') && idxStart === -1);
      const idxSubject = header.findIndex(h => h.includes('subject') || h.includes('exam') || h.includes('paper') || h.includes('title'));
      const idxClass = header.findIndex(h => h.includes('class') || h.includes('form') || h.includes('level'));
      const idxStream = header.findIndex(h => h.includes('stream'));
      const idxRooms = header.findIndex(h => h.includes('room') || h.includes('capacity'));
      const idxInvigilators = header.findIndex(h => h.includes('invigilator') || h.includes('teacher') || h.includes('assigned'));

      const newSessions: InvigilationSession[] = [];
      const newAssignments: Record<string, number> = {};
      const newWarnings: string[] = [];
      const newErrors: string[] = [];

      let sessionAutoId = Date.now();

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row.length === 0 || row.every(cell => !cell.trim())) continue;

        // Parse Date & Day
        let rawDateVal = idxDate !== -1 && row[idxDate] ? row[idxDate].trim() : '';
        // Format YYYY-MM-DD
        if (rawDateVal.includes('/')) {
          const parts = rawDateVal.split('/');
          if (parts.length === 3) {
            // Check if DD/MM/YYYY
            if (parts[2].length === 4) {
              rawDateVal = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
            } else if (parts[0].length === 4) {
              rawDateVal = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
            }
          }
        }

        if (!rawDateVal) {
          rawDateVal = new Date().toISOString().split('T')[0];
          newWarnings.push(`Row ${i + 1}: Missing date, defaulted to today (${rawDateVal}).`);
        }

        const { day: computedDay, formattedDate: computedFormattedDate } = getDayAndFormattedDate(rawDateVal);
        const dayVal = idxDay !== -1 && row[idxDay] ? row[idxDay].trim() : computedDay;

        // Parse Session
        let sessionVal = idxSession !== -1 && row[idxSession] ? row[idxSession].trim().toUpperCase() : 'SESSION I';
        if (sessionVal.includes('II') || sessionVal.includes('2') || sessionVal.includes('AFTERNOON')) {
          sessionVal = 'SESSION II';
        } else if (sessionVal.includes('III') || sessionVal.includes('3') || sessionVal.includes('EVENING')) {
          sessionVal = 'SESSION III';
        } else if (!['SESSION I', 'SESSION II', 'SESSION III'].includes(sessionVal)) {
          sessionVal = 'SESSION I';
        }

        // Parse Time
        let startVal = '08:00';
        let endVal = '10:30';

        if (idxStart !== -1 && row[idxStart]) startVal = row[idxStart].trim();
        if (idxEnd !== -1 && row[idxEnd]) endVal = row[idxEnd].trim();
        
        if (idxTime !== -1 && row[idxTime] && (idxStart === -1 || !row[idxStart])) {
          const timeStr = row[idxTime];
          const timeParts = timeStr.split(/[-–to]/i);
          if (timeParts.length >= 2) {
            startVal = timeParts[0].trim();
            endVal = timeParts[1].trim();
          }
        }

        // Subject, Class, Stream, Rooms
        const subjectVal = idxSubject !== -1 && row[idxSubject] ? row[idxSubject].trim() : `General Examination #${i}`;
        const classVal = idxClass !== -1 && row[idxClass] ? row[idxClass].trim() : 'Form 1';
        const streamVal = idxStream !== -1 && row[idxStream] ? row[idxStream].trim() : 'STREAM A';
        const roomsCount = idxRooms !== -1 && row[idxRooms] ? Math.max(1, Math.min(10, parseInt(row[idxRooms], 10) || 1)) : 2;

        sessionAutoId += 1;
        const sessionObj: InvigilationSession = {
          id: sessionAutoId,
          rawDate: rawDateVal,
          date: computedFormattedDate || rawDateVal,
          day: dayVal || computedDay,
          session: sessionVal as any,
          start: startVal,
          end: endVal,
          time: `${startVal}-${endVal}`,
          subject: subjectVal,
          level: classVal.toLowerCase().includes('form 5') || classVal.toLowerCase().includes('form 6') ? 'ACSEE' : 'CSEE',
          className: classVal,
          stream: streamVal,
          rooms: roomsCount
        };

        newSessions.push(sessionObj);

        // Parse Assigned Invigilators if present
        if (idxInvigilators !== -1 && row[idxInvigilators]) {
          const invigCell = row[idxInvigilators].trim();
          // E.g. "Room 1: John Doe; Room 2: Jane Smith" OR "John Doe, Jane Smith"
          const invigParts = invigCell.split(/[;|\n]/);

          invigParts.forEach((part, roomIdx) => {
            if (roomIdx >= roomsCount) return;

            let cleanName = part.replace(/Room\s*\d+\s*:\s*/i, '').trim();
            if (cleanName) {
              const matchedTeacher = findTeacher(cleanName);
              if (matchedTeacher) {
                newAssignments[`${sessionObj.id}_room${roomIdx}`] = matchedTeacher.id;
              } else if (cleanName.toLowerCase() !== 'unassigned') {
                newWarnings.push(`Row ${i + 1}: Could not find matching teacher for "${cleanName}". Room left unassigned.`);
              }
            }
          });
        }
      }

      setParsedSessions(newSessions);
      setParsedAssignments(newAssignments);
      setWarnings(newWarnings);
      setErrors(newErrors);
    } catch (err: any) {
      setErrors([`Failed to parse CSV file: ${err.message || 'Invalid CSV syntax.'}`]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        processCSVContent(content);
      }
    };
    reader.readAsText(file);
  };

  const handleTextPaste = () => {
    if (!pastedText.trim()) return;
    setFileName('Pasted CSV Data');
    processCSVContent(pastedText);
  };

  const handleConfirmImport = () => {
    if (parsedSessions.length === 0) return;
    onImport(parsedSessions, parsedAssignments, replaceExisting);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-[#1f4d8b] to-[#153460] text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-white/10 text-white shadow-inner">
              <FileSpreadsheet className="w-6 h-6 text-emerald-400" />
            </span>
            <div>
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                Import Examination Timetable & Directory (CSV)
              </h3>
              <p className="text-xs text-blue-200">
                Bulk upload exam sessions, dates, times, subjects, classes & invigilator assignments from Excel or CSV
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50">

          {/* Action Header Banner */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-blue-50 text-blue-700">
                <Info className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Need a CSV Template?
                </h4>
                <p className="text-xs text-slate-600">
                  Download our pre-formatted CSV template with example examination session rows.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={downloadExamTimetableSampleCSV}
              className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer shadow-2xs"
            >
              <Download className="w-4 h-4 text-emerald-600" />
              <span>Download CSV Template</span>
            </button>
          </div>

          {/* Mode Tabs */}
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
            <button
              onClick={() => setActiveTab('upload')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'upload' 
                  ? 'bg-[#1f4d8b] text-white shadow-xs' 
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Upload className="w-4 h-4" />
              Upload CSV File
            </button>

            <button
              onClick={() => setActiveTab('paste')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'paste' 
                  ? 'bg-[#1f4d8b] text-white shadow-xs' 
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <FileText className="w-4 h-4" />
              Paste CSV / Excel Text
            </button>
          </div>

          {/* Tab 1: File Upload */}
          {activeTab === 'upload' && (
            <div className="bg-white border-2 border-dashed border-blue-200 rounded-2xl p-8 text-center hover:border-blue-500 transition-all">
              <input
                type="file"
                accept=".csv,.txt"
                onChange={handleFileUpload}
                id="exam-csv-file-input"
                className="hidden"
              />
              <label htmlFor="exam-csv-file-input" className="cursor-pointer flex flex-col items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200 shadow-inner">
                  <Upload className="w-7 h-7 animate-bounce" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">
                    Click to browse or drop your Examination CSV file here
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Supports .CSV and .TXT files exported from Excel or Google Sheets
                  </p>
                </div>
                {fileName && (
                  <span className="mt-2 px-3 py-1 bg-blue-100 text-blue-900 rounded-full text-xs font-bold flex items-center gap-1.5">
                    <FileSpreadsheet className="w-3.5 h-3.5 text-blue-700" />
                    {fileName}
                  </span>
                )}
              </label>
            </div>
          )}

          {/* Tab 2: Text Paste */}
          {activeTab === 'paste' && (
            <div className="space-y-3 bg-white p-4 border border-slate-200 rounded-xl">
              <label className="text-xs font-bold text-slate-700 block">
                Paste raw CSV or Tab-Separated content from Excel:
              </label>
              <textarea
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder={`Date,Day,Session,Start Time,End Time,Subject / Exam Title,Class / Form,Stream,Rooms,Assigned Invigilators\n2026-10-15,Thursday,SESSION I,08:00,10:30,Mathematics Paper 1,Form 4,STREAM A,3,Room 1: J. Mwangi; Room 2: S. Bakari`}
                rows={6}
                className="w-full font-mono text-xs p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleTextPaste}
                disabled={!pastedText.trim()}
                className="px-4 py-2 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-xs"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>Parse CSV Text</span>
              </button>
            </div>
          )}

          {/* Parsed Sessions Preview */}
          {parsedSessions.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <h4 className="text-sm font-black text-slate-900">
                    Preview Parsed Exam Sessions ({parsedSessions.length})
                  </h4>
                </div>
                <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full">
                  {Object.keys(parsedAssignments).length} Invigilator Duties Mapped
                </span>
              </div>

              {/* Warnings List */}
              {warnings.length > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1">
                  <p className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>Import Warnings ({warnings.length}):</span>
                  </p>
                  <ul className="text-[11px] text-amber-800 space-y-0.5 list-disc list-inside max-h-24 overflow-y-auto">
                    {warnings.map((w, idx) => (
                      <li key={idx}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Table Preview */}
              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-slate-100 text-slate-700 uppercase font-black text-[10px] tracking-wider sticky top-0">
                    <tr>
                      <th className="px-3 py-2 border-b">#</th>
                      <th className="px-3 py-2 border-b">Date & Day</th>
                      <th className="px-3 py-2 border-b">Session</th>
                      <th className="px-3 py-2 border-b">Time</th>
                      <th className="px-3 py-2 border-b">Subject / Exam</th>
                      <th className="px-3 py-2 border-b">Class / Stream</th>
                      <th className="px-3 py-2 border-b">Rooms</th>
                      <th className="px-3 py-2 border-b">Mapped Invigilators</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-medium text-slate-800">
                    {parsedSessions.map((s, idx) => {
                      const roomDuties: string[] = [];
                      for (let r = 0; r < s.rooms; r++) {
                        const tid = parsedAssignments[`${s.id}_room${r}`];
                        const teacherObj = existingTeachers.find(t => t.id === tid);
                        if (teacherObj) {
                          roomDuties.push(`R${r + 1}: ${teacherObj.initial || teacherObj.name}`);
                        }
                      }

                      return (
                        <tr key={s.id} className="hover:bg-blue-50/50 transition-colors">
                          <td className="px-3 py-2 text-slate-400 font-bold">{idx + 1}</td>
                          <td className="px-3 py-2 font-bold text-slate-900">
                            {s.date} <span className="text-[10px] text-slate-500 font-medium">({s.day})</span>
                          </td>
                          <td className="px-3 py-2 font-bold text-blue-800">{s.session}</td>
                          <td className="px-3 py-2 text-slate-600">{s.start} - {s.end}</td>
                          <td className="px-3 py-2 font-bold text-slate-900">{s.subject}</td>
                          <td className="px-3 py-2 text-slate-700">{s.className} ({s.stream})</td>
                          <td className="px-3 py-2 font-bold text-slate-900">{s.rooms} Rooms</td>
                          <td className="px-3 py-2">
                            {roomDuties.length > 0 ? (
                              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                {roomDuties.join(', ')}
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400 italic">Unassigned</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Import Options */}
              <div className="p-4 bg-slate-100 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-900 flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={replaceExisting}
                      onChange={(e) => setReplaceExisting(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <span>Replace all existing examination sessions</span>
                  </label>
                  <p className="text-[11px] text-slate-500 pl-6">
                    {replaceExisting 
                      ? '⚠️ Warning: Existing exam sessions will be completely replaced with this CSV data.' 
                      : 'Append mode: New CSV exam sessions will be added alongside your existing sessions.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Errors List */}
          {errors.length > 0 && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-1 text-rose-900 text-xs">
              <p className="font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>Errors during CSV Parsing:</span>
              </p>
              <ul className="list-disc list-inside space-y-0.5 pl-2">
                {errors.map((e, idx) => (
                  <li key={idx}>{e}</li>
                ))}
              </ul>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="bg-slate-100 px-6 py-4 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 text-xs font-bold transition-all cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleConfirmImport}
            disabled={parsedSessions.length === 0}
            className="px-6 py-2.5 rounded-xl bg-[#1f4d8b] hover:bg-[#153460] disabled:opacity-50 text-white text-xs font-black transition-all flex items-center gap-2 cursor-pointer shadow-md"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Import {parsedSessions.length} Examination Sessions</span>
          </button>
        </div>

      </div>
    </div>
  );
};
