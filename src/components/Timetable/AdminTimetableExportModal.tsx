import React, { useState } from 'react';
import { 
  X, 
  FileText, 
  Download, 
  FileSpreadsheet, 
  CheckCircle2, 
  Printer, 
  ShieldCheck, 
  Sparkles,
  Building,
  Calendar,
  Layers,
  Info
} from 'lucide-react';
import { 
  TimetableAssignment, 
  Teacher, 
  PeriodSetting, 
  StreamSetting, 
  SchoolInfo 
} from '../../types';
import { 
  exportAdministrativeTimetableCSV, 
  exportAdministrativeTimetablePDF 
} from '../../utils/adminTimetableExport';

interface AdminTimetableExportModalProps {
  assignments: TimetableAssignment[];
  teachers: Teacher[];
  periodSettings: PeriodSetting[];
  streamSettings: StreamSetting[];
  schoolInfo?: SchoolInfo;
  schoolName?: string;
  onClose: () => void;
}

export const AdminTimetableExportModal: React.FC<AdminTimetableExportModalProps> = ({
  assignments,
  teachers,
  periodSettings,
  streamSettings,
  schoolInfo,
  schoolName = 'HABY EDUPRO ACADEMY',
  onClose
}) => {
  const [selectedClass, setSelectedClass] = useState('All');
  const [selectedStream, setSelectedStream] = useState('All');
  const [selectedDay, setSelectedDay] = useState('All');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('landscape');
  const [adminNote, setAdminNote] = useState('Official Academic Timetable approved for school usage.');
  const [academicYear, setAcademicYear] = useState(`${new Date().getFullYear()}`);

  const [downloadSuccessNotice, setDownloadSuccessNotice] = useState<string | null>(null);

  const handleDownloadPDF = async () => {
    try {
      await exportAdministrativeTimetablePDF({
        assignments,
        teachers,
        periodSettings,
        streamSettings,
        schoolInfo,
        schoolName,
        selectedClass,
        selectedStream,
        selectedDay,
        orientation,
        adminNote,
        academicYear
      });
      setDownloadSuccessNotice('Official Administrative Timetable PDF downloaded successfully!');
      setTimeout(() => setDownloadSuccessNotice(null), 5000);
    } catch (err: any) {
      alert(`PDF Export Error: ${err.message || 'Failed to generate PDF document.'}`);
    }
  };

  const handleDownloadCSV = () => {
    try {
      const scopeTag = selectedClass === 'All' ? 'Whole_School' : selectedClass.replace(/\s+/g, '_');
      const filename = `${scopeTag}_Official_Timetable_Directory_${academicYear}.csv`;
      exportAdministrativeTimetableCSV(
        {
          assignments,
          teachers,
          periodSettings,
          streamSettings,
          schoolInfo,
          schoolName,
          selectedClass,
          selectedStream,
          selectedDay,
          orientation,
          adminNote,
          academicYear
        },
        filename
      );
      setDownloadSuccessNotice('Official Administrative Timetable CSV downloaded successfully!');
      setTimeout(() => setDownloadSuccessNotice(null), 5000);
    } catch (err: any) {
      alert(`CSV Export Error: ${err.message || 'Failed to generate CSV directory.'}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-white/10 text-white shadow-inner">
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
            </span>
            <div>
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                Export Administrative School Timetable
              </h3>
              <p className="text-xs text-blue-200">
                Generate official PDF document & CSV directory formatted for school administrative usage
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

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 bg-slate-50">

          {/* Success Notification */}
          {downloadSuccessNotice && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl text-xs font-bold text-emerald-900 flex items-center justify-between animate-in fade-in">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                {downloadSuccessNotice}
              </span>
              <button onClick={() => setDownloadSuccessNotice(null)} className="text-slate-500 hover:text-slate-800 cursor-pointer">✕</button>
            </div>
          )}

          {/* School Letterhead Badge */}
          <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-2 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wider">
                <Building className="w-4 h-4 text-blue-700" />
                {schoolInfo?.name || schoolName}
              </span>
              <span className="text-[10px] font-extrabold px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full">
                Administrative Format
              </span>
            </div>
            <p className="text-xs text-slate-600">
              Documents include official letterhead, QR verification code, breakdown of {assignments.length} scheduled periods across {teachers.length} teachers, and signature lines for Academic Master & Headmaster approval.
            </p>
          </div>

          {/* Controls Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white p-4 border border-slate-200 rounded-xl">
            {/* Scope / Class */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Class / Form Scope:
              </label>
              <select
                value={selectedClass}
                onChange={e => setSelectedClass(e.target.value)}
                className="w-full text-xs font-bold p-2.5 border border-slate-300 rounded-xl bg-slate-50 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="All">🏫 Whole School (All Classes)</option>
                <option value="Form 1">Form 1</option>
                <option value="Form 2">Form 2</option>
                <option value="Form 3">Form 3</option>
                <option value="Form 4">Form 4</option>
                <option value="Form 5">Form 5</option>
                <option value="Form 6">Form 6</option>
              </select>
            </div>

            {/* Academic Year */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Academic Year / Term:
              </label>
              <input
                type="text"
                value={academicYear}
                onChange={e => setAcademicYear(e.target.value)}
                className="w-full text-xs font-bold p-2.5 border border-slate-300 rounded-xl bg-slate-50 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="2026"
              />
            </div>

            {/* Document Orientation */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                PDF Layout Orientation:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setOrientation('landscape')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    orientation === 'landscape'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Landscape (A4)
                </button>
                <button
                  type="button"
                  onClick={() => setOrientation('portrait')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    orientation === 'portrait'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Portrait (A4)
                </button>
              </div>
            </div>

            {/* Custom Admin Note */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Approval Note / Instructions:
              </label>
              <input
                type="text"
                value={adminNote}
                onChange={e => setAdminNote(e.target.value)}
                className="w-full text-xs font-medium p-2.5 border border-slate-300 rounded-xl bg-slate-50 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="Official Academic Timetable approved for school usage."
              />
            </div>
          </div>

          {/* Download Action Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            {/* PDF Card */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between space-y-3 hover:border-red-300 transition-all shadow-xs">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-red-50 text-red-600 shrink-0">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                    Official PDF Document
                  </h4>
                  <p className="text-[11px] text-slate-500 leading-tight mt-0.5">
                    Vector A4 Printable format with official school letterhead, signature lines & QR verification.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleDownloadPDF}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-95"
              >
                <Download className="w-4 h-4 text-white" />
                <span>Download Administrative PDF</span>
              </button>
            </div>

            {/* CSV Card */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between space-y-3 hover:border-emerald-300 transition-all shadow-xs">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 shrink-0">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                    Administrative CSV Directory
                  </h4>
                  <p className="text-[11px] text-slate-500 leading-tight mt-0.5">
                    Structured CSV file compatible with Excel, Google Sheets, & Ministry MIS systems.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleDownloadCSV}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-95"
              >
                <Download className="w-4 h-4 text-white" />
                <span>Download Administrative CSV</span>
              </button>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="bg-slate-100 px-6 py-4 border-t border-slate-200 flex items-center justify-between">
          <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-blue-600" />
            Formatted specifically for school administrative usage
          </span>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 text-xs font-bold transition-all cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
