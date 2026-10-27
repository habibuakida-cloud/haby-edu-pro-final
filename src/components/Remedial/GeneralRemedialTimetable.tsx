import React, { useState, useEffect, useMemo } from 'react';
import { 
  Building, 
  Calendar, 
  Clock, 
  User, 
  MapPin, 
  BookOpen, 
  Filter, 
  Search, 
  Printer, 
  FileSpreadsheet, 
  GraduationCap, 
  CheckCircle2, 
  Layers,
  Sun,
  Moon,
  Coffee
} from 'lucide-react';
import { RemedialTimetableEntry, getRemedialTimetable } from '../../lib/remedialService';
import { SchoolInfo, Teacher, TeacherAssignment, TimetableAssignment } from '../../types';
import { exportRemedialTimetablePDF } from '../../utils/remedialPdfExport';
import { exportRemedialTimetableCSV } from '../../utils/remedialExportUtils';

interface GeneralRemedialTimetableProps {
  schoolId: string;
  teachers?: Teacher[];
  schoolInfo?: SchoolInfo;
  teacherAssignments?: TeacherAssignment[];
  timetableAssignments?: TimetableAssignment[];
}

export const GeneralRemedialTimetable: React.FC<GeneralRemedialTimetableProps> = ({
  schoolId,
  teachers = [],
  schoolInfo,
  teacherAssignments = [],
  timetableAssignments = []
}) => {
  const [entries, setEntries] = useState<RemedialTimetableEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSessionType, setSelectedSessionType] = useState<string>('ALL'); // Morning, Evening, Weekend, ALL
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDay, setSelectedDay] = useState<string>('ALL');

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const { data } = await getRemedialTimetable(schoolId);
        if (data && data.length > 0) {
          setEntries(data);
        } else {
          // Fallback or dynamic generation from teacherAssignments / timetableAssignments if no entries saved yet
          const dynamicFallback: RemedialTimetableEntry[] = (timetableAssignments || []).slice(0, 20).map((ta, idx) => ({
            id: `auto_${idx}`,
            class_name: ta.className || 'Form 2',
            stream: ta.stream || 'A',
            subject: ta.subject || 'Mathematics',
            teacher_name: (ta as any).teacherName || teachers[idx % Math.max(1, teachers.length)]?.name || 'Mwalimu Mkuu',
            date: new Date().toISOString().split('T')[0],
            day_of_week: ta.day || 'Monday',
            start_time: '15:40',
            end_time: '17:00',
            period_time: '15:40-17:00',
            room: `${ta.className || 'Form 2'} Room`,
            session_type: idx % 2 === 0 ? 'Evening' : 'Morning',
            academic_year: new Date().getFullYear().toString()
          }));
          setEntries(dynamicFallback);
        }
      } catch (err) {
        console.error('Failed to load general remedial timetable:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [schoolId, teacherAssignments, timetableAssignments, teachers]);

  // Filter sessions by session type (Morning / Evening / Weekend) and day & search
  const filteredEntries = useMemo(() => {
    return entries.filter(item => {
      const matchSession = selectedSessionType === 'ALL' || !item.session_type || item.session_type.toLowerCase() === selectedSessionType.toLowerCase();
      const matchDay = selectedDay === 'ALL' || (item.day_of_week || '').toLowerCase() === selectedDay.toLowerCase();
      const matchSearch = !searchQuery || 
        item.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.teacher_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.class_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.room && item.room.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchSession && matchDay && matchSearch;
    });
  }, [entries, selectedSessionType, selectedDay, searchQuery]);

  const handleExportPDF = () => {
    exportRemedialTimetablePDF({
      entries: filteredEntries,
      schoolInfo,
      title: `RATIBA YA JUMLA YA REMEDIAL (${selectedSessionType.toUpperCase()}) - ${new Date().getFullYear()}`,
      subtitle: `Muhtasari wa Vipindi, Walimu na Vyumba • Jumla: ${filteredEntries.length} Vipindi`,
      showClassColumn: true,
      academicYear: new Date().getFullYear().toString()
    });
  };

  const handleExportExcel = () => {
    exportRemedialTimetableCSV({
      entries: filteredEntries,
      schoolInfo,
      className: 'ALL',
      streamName: 'ALL',
      academicYear: new Date().getFullYear().toString()
    });
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-6 rounded-3xl shadow-xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black text-xl shadow-md">
            <Building className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-amber-400 text-slate-950 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full">
                Unified School-Wide View
              </span>
              <span className="text-slate-400 text-xs">• Dynamic Timetable</span>
            </div>
            <h2 className="text-xl font-black text-white mt-1">
              Ratiba ya Jumla ya Remedial (General Remedial Timetable)
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              Inaonyesha vipindi vyote vya ziada vya shule nzima na kuleta Mwalimu na Ukumbi/Venue sambamba (Side-by-Side).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleExportPDF}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 cursor-pointer transition"
          >
            <Printer className="w-4 h-4" />
            <span>Print PDF</span>
          </button>
          <button
            type="button"
            onClick={handleExportExcel}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 cursor-pointer transition"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Excel (CSV)</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Session Type Filter (Morning / Evening / Weekend) */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Aina ya Kipindi (Session):</span>
            <select
              value={selectedSessionType}
              onChange={e => setSelectedSessionType(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-black text-slate-900 focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="ALL">Sessions Zote (All Sessions)</option>
              <option value="Morning">Asubuhi (Morning Pre-Prep)</option>
              <option value="Evening">Jioni (Evening Tuition)</option>
              <option value="Weekend">Wikendi (Weekend Intensive)</option>
            </select>
          </div>

          {/* Day Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Siku:</span>
            <select
              value={selectedDay}
              onChange={e => setSelectedDay(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-black text-slate-900 focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="ALL">Siku Zote (All Days)</option>
              <option value="Monday">Jumatatu</option>
              <option value="Tuesday">Jumanne</option>
              <option value="Wednesday">Jumatano</option>
              <option value="Thursday">Alhamisi</option>
              <option value="Friday">Ijumaa</option>
              <option value="Saturday">Jumamosi</option>
              <option value="Sunday">Jumapili</option>
            </select>
          </div>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Tafuta somo, mwalimu, darasa..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-semibold"
          />
        </div>
      </div>

      {/* Unified Table View with Teacher and Venue Side-by-Side */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-xs font-bold text-slate-600">
            Inapakia ratiba ya jumla ya remedial...
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="p-16 text-center">
            <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-700">Hakuna vipindi vya remedial vilivyopatikana kwa machaguo haya.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-slate-900 text-white font-black uppercase tracking-wider text-[11px]">
                  <th className="px-4 py-3.5 border-r border-slate-800">Siku &amp; Muda (Day &amp; Time)</th>
                  <th className="px-3 py-3.5 border-r border-slate-800">Darasa &amp; Mkondo</th>
                  <th className="px-3 py-3.5 border-r border-slate-800">Somo (Subject)</th>
                  <th className="px-4 py-3.5 border-r border-slate-800 bg-blue-950 text-blue-200">Mwalimu Anayefundisha (Teacher)</th>
                  <th className="px-4 py-3.5 border-r border-slate-800 bg-emerald-950 text-emerald-200">Ukumbi / Venue (Room)</th>
                  <th className="px-3 py-3.5 text-center">Aina ya Kipindi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredEntries.map((item, idx) => (
                  <tr key={item.id || idx} className="hover:bg-slate-50/80 transition">
                    {/* Day & Time */}
                    <td className="px-4 py-3 border-r border-slate-200">
                      <div className="font-black text-slate-900">{item.day_of_week || 'Jumatatu'}</div>
                      <div className="text-[11px] font-mono text-blue-700 font-bold mt-0.5">
                        {item.start_time && item.end_time ? `${item.start_time} - ${item.end_time}` : (item.period_time || '15:40-17:00')}
                      </div>
                    </td>

                    {/* Class & Stream */}
                    <td className="px-3 py-3 border-r border-slate-200">
                      <span className="inline-block bg-slate-100 text-slate-800 font-black px-2 py-1 rounded-md text-xs">
                        {item.class_name} {item.stream ? `(${item.stream})` : ''}
                      </span>
                    </td>

                    {/* Subject */}
                    <td className="px-3 py-3 border-r border-slate-200 font-black text-slate-900">
                      {item.subject}
                    </td>

                    {/* Teacher (Side-by-Side Column 1) */}
                    <td className="px-4 py-3 border-r border-slate-200 bg-blue-50/40">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                          <User className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <span className="font-black text-slate-900 block">{item.teacher_name || 'Mwalimu wa Somo'}</span>
                          <span className="text-[10px] text-blue-700 font-bold">Mwalimu wa Ziada</span>
                        </div>
                      </div>
                    </td>

                    {/* Venue / Room (Side-by-Side Column 2) */}
                    <td className="px-4 py-3 border-r border-slate-200 bg-emerald-50/40">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                          <MapPin className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <span className="font-black text-slate-900 block">{item.room || `${item.class_name} Room`}</span>
                          <span className="text-[10px] text-emerald-700 font-bold">Ukumbi Rasmi</span>
                        </div>
                      </div>
                    </td>

                    {/* Session Type */}
                    <td className="px-3 py-3 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase inline-block ${
                        item.session_type === 'Morning' ? 'bg-amber-100 text-amber-900 border border-amber-300' :
                        item.session_type === 'Weekend' ? 'bg-purple-100 text-purple-900 border border-purple-300' :
                        'bg-blue-100 text-blue-900 border border-blue-300'
                      }`}>
                        {item.session_type || 'Evening'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
