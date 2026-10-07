import React, { useState } from 'react';
import { 
  Users, 
  Plus, 
  Trash2, 
  Download, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Phone, 
  Mail, 
  BookOpen, 
  Layers, 
  Sparkles,
  Info
} from 'lucide-react';
import { Teacher, SchoolStaffRole, SchoolInfo } from '../../types';
import { STAFF_ROLES_LIST, INVIGILATOR_COLORS, SUBJECT_LIST } from '../../constants/defaults';
import { formatPhoneNumber, getTanzanianCarrier } from '../../utils/phoneUtils';
import { escapeCSV, downloadFile } from '../../utils/export';

interface MultipleTeacherRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBulkAddTeachers: (teachers: Teacher[]) => void;
  existingTeachers: Teacher[];
}

interface TeacherRowDraft {
  id: string;
  name: string;
  gender: 'Male' | 'Female';
  role: string;
  phone: string;
  email: string;
  subjects: string;
  maxPeriods: number;
  excludeInvigilation: boolean;
}

const DEFAULT_SUBJECTS_SUGGESTIONS = [
  'Mathematics',
  'Basic Mathematics',
  'English Language',
  'Kiswahili',
  'Biology',
  'Chemistry',
  'Physics',
  'Geography',
  'History',
  'Civics',
  'Commerce',
  'Book Keeping',
  'ICT / TEHAMA'
];

export const MultipleTeacherRegistrationModal: React.FC<MultipleTeacherRegistrationModalProps> = ({
  isOpen,
  onClose,
  onBulkAddTeachers,
  existingTeachers
}) => {
  // Generate 5 initial blank rows
  const createEmptyRow = (idx: number): TeacherRowDraft => ({
    id: `row-${Date.now()}-${idx}-${Math.random()}`,
    name: '',
    gender: 'Male',
    role: 'Subject Teacher',
    phone: '',
    email: '',
    subjects: '',
    maxPeriods: 20,
    excludeInvigilation: false
  });

  const [rows, setRows] = useState<TeacherRowDraft[]>([
    createEmptyRow(1),
    createEmptyRow(2),
    createEmptyRow(3),
    createEmptyRow(4),
    createEmptyRow(5)
  ]);

  const [csvNotice, setCsvNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  // Add 1 row
  const handleAddRow = () => {
    setRows(prev => [...prev, createEmptyRow(prev.length + 1)]);
  };

  // Add 5 rows
  const handleAdd5Rows = () => {
    setRows(prev => [
      ...prev,
      createEmptyRow(prev.length + 1),
      createEmptyRow(prev.length + 2),
      createEmptyRow(prev.length + 3),
      createEmptyRow(prev.length + 4),
      createEmptyRow(prev.length + 5)
    ]);
  };

  // Remove row
  const handleRemoveRow = (id: string) => {
    if (rows.length <= 1) {
      setRows([createEmptyRow(1)]);
      return;
    }
    setRows(prev => prev.filter(r => r.id !== id));
  };

  // Clear empty rows
  const handleClearEmptyRows = () => {
    const filled = rows.filter(r => r.name.trim().length > 0);
    setRows(filled.length > 0 ? filled : [createEmptyRow(1)]);
  };

  // Update specific field in row
  const updateRow = (id: string, patch: Partial<TeacherRowDraft>) => {
    setRows(prev => prev.map(r => (r.id === id ? { ...r, ...patch } : r)));
  };

  // Generate unique initial for teacher
  const generateUniqueInitial = (fullName: string, assignedInitials: Set<string>): string => {
    const cleaned = fullName.replace(/^(mwl|mwalimu|tr|teacher|mr|mrs|ms|dr|prof)\.?\s+/i, '').trim();
    const parts = cleaned.split(/\s+/).filter(Boolean);
    let base = '';
    if (parts.length >= 2) {
      base = (parts[0][0] + parts[1][0]).toUpperCase();
    } else if (parts.length === 1 && parts[0].length >= 2) {
      base = parts[0].substring(0, 2).toUpperCase();
    } else if (parts.length === 1) {
      base = (parts[0][0] + 'T').toUpperCase();
    } else {
      base = 'TR';
    }

    let result = base;
    let counter = 1;
    while (assignedInitials.has(result)) {
      counter++;
      result = `${base}${counter}`;
    }
    assignedInitials.add(result);
    return result;
  };

  // Download CSV template for teachers
  const handleDownloadTeacherTemplate = () => {
    const headers = [
      'Full Name',
      'Gender',
      'School Role',
      'Phone Number',
      'Email Address',
      'Subjects (semicolon separated)',
      'Max Weekly Periods',
      'Exclude Invigilation (Yes or No)'
    ];

    const samples = [
      [
        'Mwl. Hamisi Ally Bakari',
        'Male',
        'Academic Master',
        '0754111222',
        'hamisi@school.ac.tz',
        'Basic Mathematics; Physics',
        '18',
        'No'
      ],
      [
        'Mwl. Neema Joseph Mwita',
        'Female',
        'Subject Teacher',
        '0784333444',
        'neema@school.ac.tz',
        'Biology; Chemistry',
        '22',
        'No'
      ],
      [
        'Mwl. Godfrey Juma Kimaro',
        'Male',
        'Discipline Master',
        '0714555666',
        'godfrey@school.ac.tz',
        'English Language; History',
        '16',
        'No'
      ]
    ];

    const csvContent = [
      headers.map(escapeCSV).join(','),
      ...samples.map(row => row.map(escapeCSV).join(','))
    ].join('\n');

    downloadFile(
      'teachers_multiple_registration_template.csv',
      csvContent,
      'text/csv;charset=utf-8;'
    );
  };

  // Import teachers from CSV
  const handleImportTeachersCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = String(evt.target?.result || '');
        const lines = text.split(/\r\n|\n/).filter(line => line.trim().length > 0);
        if (lines.length < 2) {
          setCsvNotice('Faili la CSV halina data za kutosha.');
          return;
        }

        const parseLine = (line: string) => {
          const res: string[] = [];
          let cur = '';
          let inQuotes = false;
          for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') inQuotes = !inQuotes;
            else if ((char === ',' || char === ';') && !inQuotes) {
              res.push(cur.trim());
              cur = '';
            } else cur += char;
          }
          res.push(cur.trim());
          return res;
        };

        const importedRows: TeacherRowDraft[] = [];
        lines.slice(1).forEach((line, idx) => {
          const cols = parseLine(line);
          if (cols.length >= 1 && cols[0].trim()) {
            const rawName = cols[0]?.replace(/"/g, '').trim();
            const rawGender = cols[1]?.toLowerCase().startsWith('f') ? 'Female' : 'Male';
            const rawRole = cols[2]?.replace(/"/g, '').trim() || 'Subject Teacher';
            const rawPhone = cols[3]?.replace(/"/g, '').trim() || '';
            const rawEmail = cols[4]?.replace(/"/g, '').trim() || '';
            const rawSubs = cols[5]?.replace(/"/g, '').trim() || '';
            const rawPeriods = parseInt(cols[6], 10) || 20;
            const rawExclude = cols[7]?.toLowerCase().includes('yes') || cols[7]?.toLowerCase().includes('ndio');

            importedRows.push({
              id: `imported-${Date.now()}-${idx}`,
              name: rawName,
              gender: rawGender as 'Male' | 'Female',
              role: rawRole,
              phone: rawPhone ? formatPhoneNumber(rawPhone) : '',
              email: rawEmail,
              subjects: rawSubs,
              maxPeriods: rawPeriods,
              excludeInvigilation: rawExclude
            });
          }
        });

        if (importedRows.length > 0) {
          setRows(importedRows);
          setCsvNotice(`Imepakia walimu ${importedRows.length} kutoka kwenye CSV kwa mafanikio!`);
          setTimeout(() => setCsvNotice(null), 4000);
        } else {
          setCsvNotice('Hakuna walimu waliopatikana kwenye CSV.');
        }
      } catch (err) {
        console.error('Error importing teachers CSV:', err);
        setCsvNotice('Hitilafu wakati wa kusoma faili la CSV.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Submit all valid teacher rows
  const handleSaveAllTeachers = () => {
    const validRows = rows.filter(r => r.name.trim().length > 0);
    if (validRows.length === 0) {
      alert('Tafadhali jaza angalau jina la mwalimu mmoja.');
      return;
    }

    const assignedInitialsSet = new Set(existingTeachers.map(t => t.initial));

    const newTeachersList: Teacher[] = validRows.map((r, idx) => {
      const uniqueInit = generateUniqueInitial(r.name, assignedInitialsSet);
      const colorHex = INVIGILATOR_COLORS[(existingTeachers.length + idx) % INVIGILATOR_COLORS.length].hex;

      const parsedSubjects = r.subjects
        ? r.subjects.split(/[;,]/).map(s => s.trim()).filter(Boolean)
        : [];

      return {
        id: Date.now() + idx + Math.floor(Math.random() * 1000),
        name: r.name.trim(),
        initial: uniqueInit,
        gender: r.gender,
        schoolRole: r.role as SchoolStaffRole,
        subjects: parsedSubjects,
        excludeInvigilation: r.excludeInvigilation,
        color: colorHex,
        phone: r.phone.trim() || undefined,
        email: r.email.trim() || undefined,
        teachingStreams: [],
        maxPeriodsPerWeek: r.maxPeriods || 20
      };
    });

    onBulkAddTeachers(newTeachersList);
    onClose();
  };

  const filledCount = rows.filter(r => r.name.trim().length > 0).length;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-6xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in duration-150">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <Users className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black tracking-wide flex items-center gap-2">
                <span>Multiple Teacher Registration (Usajili wa Walimu Wengi)</span>
                <span className="text-[10px] bg-amber-400 text-slate-950 px-2.5 py-0.5 rounded-full font-black uppercase">
                  Batch Mode
                </span>
              </h3>
              <p className="text-xs text-blue-200 mt-0.5">
                Sajili walimu wengi kwa pamoja kwa kuandika moja kwa moja kwenye jedwali au kupakia faili la CSV.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Toolbar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleAddRow}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg flex items-center gap-1 shadow-2xs cursor-pointer transition active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Ongeza Mstari (+1 Row)</span>
            </button>

            <button
              type="button"
              onClick={handleAdd5Rows}
              className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold border border-indigo-200 rounded-lg flex items-center gap-1 cursor-pointer transition active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+5 Rows</span>
            </button>

            <button
              type="button"
              onClick={handleClearEmptyRows}
              className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg flex items-center gap-1 cursor-pointer transition"
              title="Ondoa mistari isiyo na majina"
            >
              <span>Futa Mistari Mitupu</span>
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Download Template */}
            <button
              type="button"
              onClick={handleDownloadTeacherTemplate}
              className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 font-bold border border-slate-300 rounded-lg shadow-2xs flex items-center gap-1.5 cursor-pointer transition active:scale-95"
              title="Pakua template ya CSV ya kusajili walimu"
            >
              <Download className="w-3.5 h-3.5 text-blue-600" />
              <span>Download CSV Template</span>
            </button>

            {/* Import CSV */}
            <label className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 font-bold border border-slate-300 rounded-lg shadow-2xs flex items-center gap-1.5 cursor-pointer transition active:scale-95">
              <Upload className="w-3.5 h-3.5 text-purple-600" />
              <span>Import Teachers CSV</span>
              <input type="file" accept=".csv" onChange={handleImportTeachersCSV} className="hidden" />
            </label>
          </div>
        </div>

        {/* Notice */}
        {csvNotice && (
          <div className="mx-4 mt-3 p-3 bg-blue-50 border border-blue-200 text-blue-900 rounded-xl text-xs font-bold flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-600 shrink-0" />
            <span>{csvNotice}</span>
          </div>
        )}

        {/* Editable Table Workspace */}
        <div className="p-4 overflow-y-auto overflow-x-auto flex-1 text-xs">
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs min-w-[980px]">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-100 text-slate-800 text-[11px] font-black uppercase sticky top-0 border-b border-slate-200">
                <tr>
                  <th className="p-2.5 w-10 text-center border-r border-slate-200">#</th>
                  <th className="p-2.5 w-60 border-r border-slate-200">
                    Jina la Mwalimu (Teacher Name) <span className="text-rose-600">*</span>
                  </th>
                  <th className="p-2.5 w-28 border-r border-slate-200">Jinsi (Gender)</th>
                  <th className="p-2.5 w-44 border-r border-slate-200">Wadhifa (Role / Title)</th>
                  <th className="p-2.5 w-48 border-r border-slate-200">
                    Namba ya Simu (Phone)
                  </th>
                  <th className="p-2.5 w-44 border-r border-slate-200">Email</th>
                  <th className="p-2.5 w-56 border-r border-slate-200">Masomo (Subjects)</th>
                  <th className="p-2.5 w-24 text-center border-r border-slate-200">Vipindi/Wiki</th>
                  <th className="p-2.5 w-24 text-center border-r border-slate-200">Usimamizi</th>
                  <th className="p-2.5 w-12 text-center">Futa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[11px]">
                {rows.map((row, index) => {
                  const carrier = row.phone ? getTanzanianCarrier(row.phone) : null;
                  return (
                    <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                      {/* Index */}
                      <td className="p-2 text-center font-mono font-bold text-slate-500 border-r border-slate-200 bg-slate-50/50">
                        {index + 1}
                      </td>

                      {/* Name */}
                      <td className="p-2 border-r border-slate-200">
                        <input
                          type="text"
                          value={row.name}
                          onChange={(e) => updateRow(row.id, { name: e.target.value })}
                          placeholder="mf. Mwl. Juma Rashidi"
                          className="w-full p-1.5 text-xs font-bold text-slate-900 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 bg-white"
                        />
                      </td>

                      {/* Gender */}
                      <td className="p-2 border-r border-slate-200">
                        <select
                          value={row.gender}
                          onChange={(e) => updateRow(row.id, { gender: e.target.value as 'Male' | 'Female' })}
                          className="w-full p-1.5 text-xs font-semibold text-slate-800 border border-slate-300 rounded bg-white cursor-pointer"
                        >
                          <option value="Male">Male (Me)</option>
                          <option value="Female">Female (Ke)</option>
                        </select>
                      </td>

                      {/* Role */}
                      <td className="p-2 border-r border-slate-200">
                        <select
                          value={row.role}
                          onChange={(e) => updateRow(row.id, { role: e.target.value })}
                          className="w-full p-1.5 text-xs font-semibold text-slate-800 border border-slate-300 rounded bg-white cursor-pointer"
                        >
                          {STAFF_ROLES_LIST.map(role => (
                            <option key={role} value={role}>{role}</option>
                          ))}
                        </select>
                      </td>

                      {/* Phone Number with plug-in format */}
                      <td className="p-2 border-r border-slate-200">
                        <div className="space-y-0.5">
                          <input
                            type="tel"
                            value={row.phone}
                            onChange={(e) => {
                              const formatted = formatPhoneNumber(e.target.value);
                              updateRow(row.id, { phone: formatted });
                            }}
                            placeholder="0754 000 000"
                            className="w-full p-1.5 text-xs font-mono font-medium text-slate-900 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 bg-white"
                          />
                          {carrier && (
                            <span className={`text-[9px] px-1 py-0.2 rounded font-bold border inline-block ${carrier.bgColor} ${carrier.textColor} ${carrier.borderColor}`}>
                              ● {carrier.name}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Email */}
                      <td className="p-2 border-r border-slate-200">
                        <input
                          type="email"
                          value={row.email}
                          onChange={(e) => updateRow(row.id, { email: e.target.value })}
                          placeholder="email@school.com"
                          className="w-full p-1.5 text-xs text-slate-700 border border-slate-300 rounded bg-white"
                        />
                      </td>

                      {/* Subjects */}
                      <td className="p-2 border-r border-slate-200">
                        <input
                          type="text"
                          value={row.subjects}
                          onChange={(e) => updateRow(row.id, { subjects: e.target.value })}
                          placeholder="mf. Mathematics, Physics"
                          className="w-full p-1.5 text-xs font-medium text-slate-800 border border-slate-300 rounded bg-white"
                        />
                      </td>

                      {/* Max Weekly Periods */}
                      <td className="p-2 text-center border-r border-slate-200">
                        <input
                          type="number"
                          min="1"
                          max="45"
                          value={row.maxPeriods}
                          onChange={(e) => updateRow(row.id, { maxPeriods: parseInt(e.target.value, 10) || 20 })}
                          className="w-16 p-1 text-center font-bold text-xs border border-slate-300 rounded bg-white mx-auto"
                        />
                      </td>

                      {/* Exclude Invigilation */}
                      <td className="p-2 text-center border-r border-slate-200">
                        <label className="inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!row.excludeInvigilation}
                            onChange={(e) => updateRow(row.id, { excludeInvigilation: !e.target.checked })}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                          <span className="text-[10px] ml-1 font-bold text-slate-600">
                            {!row.excludeInvigilation ? 'Simamia' : 'Ondoa'}
                          </span>
                        </label>
                      </td>

                      {/* Delete Row */}
                      <td className="p-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveRow(row.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                          title="Futa mstari huu"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 text-xs">
          <div className="text-slate-600 font-medium">
            Walimu <strong>{filledCount}</strong> kati ya {rows.length} wapo tayari kusajiliwa.
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-200 rounded-lg cursor-pointer"
            >
              Ghairi / Cancel
            </button>

            <button
              type="button"
              onClick={handleSaveAllTeachers}
              disabled={filledCount === 0}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black rounded-xl shadow-sm flex items-center gap-1.5 cursor-pointer transition active:scale-95"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Sajili Walimu Wote {filledCount > 0 ? `(${filledCount})` : ''}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
