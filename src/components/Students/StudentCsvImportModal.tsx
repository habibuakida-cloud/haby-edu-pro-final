import React, { useState } from 'react';
import { 
  Upload, 
  Download, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Users, 
  Phone, 
  Smartphone,
  Sparkles,
  Info
} from 'lucide-react';
import { Student, SchoolInfo } from '../../types';
import { formatPhoneNumber, isValidTanzanianPhone, getTanzanianCarrier } from '../../utils/phoneUtils';
import { formatStudentRegNo } from '../../utils/studentRegUtils';
import { PRIMARY_CLASSES, NURSERY_CLASSES } from '../../constants/defaults';
import { escapeCSV, downloadFile } from '../../utils/export';

interface StudentCsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportStudents: (students: Student[]) => void;
  existingStudentsCount: number;
  schoolInfo?: SchoolInfo;
}

interface ParsedStudentRow {
  name: string;
  gender: 'Male' | 'Female';
  className: string;
  level: 'PRE_PRIMARY' | 'PRIMARY' | 'CSEE' | 'ACSEE';
  stream?: string;
  parentPhone?: string;
  dob?: string;
  subjects: string[];
  regNo?: string;
  isValid: boolean;
  errors: string[];
}

export const StudentCsvImportModal: React.FC<StudentCsvImportModalProps> = ({
  isOpen,
  onClose,
  onImportStudents,
  existingStudentsCount,
  schoolInfo
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedStudentRow[]>([]);
  const [parsingError, setParsingError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  // Download official CSV template with phone column
  const handleDownloadTemplate = () => {
    const headers = [
      'Full Name',
      'Gender',
      'Class',
      'Level',
      'Stream or Combination',
      'Parent Phone Number',
      'Date of Birth',
      'Subjects (semicolon separated)',
      'Assigned Reg No (Optional)'
    ];

    const samples = [
      [
        'Juma Ally Mrisho',
        'Male',
        'Form 1',
        'CSEE',
        'STREAM A',
        '0754123456',
        '2010-05-14',
        'English Language; Kiswahili; Mathematics; Physics; Chemistry; Biology',
        formatStudentRegNo(schoolInfo?.schoolNumber, existingStudentsCount + 1)
      ],
      [
        'Amina Hassan Bakari',
        'Female',
        'Form 1',
        'CSEE',
        'STREAM B',
        '0784987654',
        '2010-08-20',
        'English Language; Kiswahili; Mathematics; Physics; Chemistry; Biology; Geography; History',
        formatStudentRegNo(schoolInfo?.schoolNumber, existingStudentsCount + 2)
      ]
    ];

    const csvContent = [
      headers.map(escapeCSV).join(','),
      ...samples.map(row => row.map(escapeCSV).join(','))
    ].join('\n');

    downloadFile(
      'student_registration_with_phone_template.csv',
      csvContent,
      'text/csv;charset=utf-8;'
    );
  };

  // Parse CSV File with flexible header matching
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setParsingError(null);
    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = String(evt.target?.result || '');
        const lines = text.split(/\r\n|\n/).filter(line => line.trim().length > 0);

        if (lines.length < 2) {
          setParsingError('Faili la CSV halina data za kutosha. Angalau kichwa na mstari mmoja vinahitajika.');
          setIsProcessing(false);
          return;
        }

        // Determine delimiter (comma or semicolon)
        const firstLine = lines[0];
        const delimiter = (firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length ? ';' : ',';

        // Split CSV row with quotes handling
        const parseCSVLine = (textLine: string) => {
          const result: string[] = [];
          let cur = '';
          let inQuotes = false;
          for (let i = 0; i < textLine.length; i++) {
            const char = textLine[i];
            if (char === '"') {
              inQuotes = !inQuotes;
            } else if (char === delimiter && !inQuotes) {
              result.push(cur.trim());
              cur = '';
            } else {
              cur += char;
            }
          }
          result.push(cur.trim());
          return result;
        };

        const headerTokens = parseCSVLine(lines[0]).map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));

        // Identify column indices
        const nameIdx = headerTokens.findIndex(h => h.includes('name') || h.includes('jina') || h.includes('student'));
        const genderIdx = headerTokens.findIndex(h => h.includes('gender') || h.includes('jinsi') || h.includes('sex'));
        const classIdx = headerTokens.findIndex(h => h.includes('class') || h.includes('darasa') || h.includes('grade'));
        const levelIdx = headerTokens.findIndex(h => h.includes('level') || h.includes('ngazi'));
        const streamIdx = headerTokens.findIndex(h => h.includes('stream') || h.includes('mkondo') || h.includes('combination'));
        const phoneIdx = headerTokens.findIndex(h => h.includes('phone') || h.includes('simu') || h.includes('contact') || h.includes('mobile'));
        const dobIdx = headerTokens.findIndex(h => h.includes('dob') || h.includes('birth') || h.includes('kuzaliwa') || h.includes('tarehe'));
        const subsIdx = headerTokens.findIndex(h => h.includes('subject') || h.includes('masomo'));
        const regIdx = headerTokens.findIndex(h => h.includes('reg') || h.includes('token') || h.includes('namba') || h.includes('id'));

        const parsed: ParsedStudentRow[] = [];

        lines.slice(1).forEach((line, idx) => {
          if (!line.trim()) return;
          const cols = parseCSVLine(line);

          // Fallback to position if headers not mapped
          const rawName = (nameIdx >= 0 ? cols[nameIdx] : cols[0]) || '';
          const rawGender = (genderIdx >= 0 ? cols[genderIdx] : cols[1]) || 'Male';
          const rawClass = (classIdx >= 0 ? cols[classIdx] : cols[2]) || 'Form 1';
          const rawLevel = (levelIdx >= 0 ? cols[levelIdx] : cols[3]) || 'CSEE';
          const rawStream = (streamIdx >= 0 ? cols[streamIdx] : cols[4]) || 'STREAM A';
          const rawPhone = (phoneIdx >= 0 ? cols[phoneIdx] : cols[5]) || '';
          const rawDob = (dobIdx >= 0 ? cols[dobIdx] : cols[6]) || '2010-01-01';
          const rawSubs = (subsIdx >= 0 ? cols[subsIdx] : cols[7]) || '';
          const rawReg = (regIdx >= 0 ? cols[regIdx] : cols[8]) || '';

          const errors: string[] = [];
          if (!rawName.trim()) {
            errors.push('Jina linakosekana');
          }

          // Gender formatting
          const normGender: 'Male' | 'Female' = 
            rawGender.toLowerCase().startsWith('f') || rawGender.toLowerCase().startsWith('k') 
              ? 'Female' 
              : 'Male';

          // Level formatting
          let normLevel: 'PRE_PRIMARY' | 'PRIMARY' | 'CSEE' | 'ACSEE' = 'CSEE';
          const upperLevel = rawLevel.toUpperCase();
          if (upperLevel.includes('ACSEE') || upperLevel.includes('ADVANCED') || upperLevel.includes('FORM 5') || upperLevel.includes('FORM 6')) {
            normLevel = 'ACSEE';
          } else if (upperLevel.includes('PRIMARY') || PRIMARY_CLASSES.includes(rawClass)) {
            normLevel = 'PRIMARY';
          } else if (upperLevel.includes('NURSERY') || upperLevel.includes('PRE') || NURSERY_CLASSES.includes(rawClass)) {
            normLevel = 'PRE_PRIMARY';
          }

          // Phone formatting
          const formattedPhone = rawPhone ? formatPhoneNumber(rawPhone) : '';

          // Subjects parsing
          const parsedSubjects = rawSubs
            ? rawSubs.split(/[;,]/).map(s => s.trim()).filter(Boolean)
            : ['English Language', 'Kiswahili', 'Mathematics', 'Biology', 'Chemistry', 'Physics'];

          parsed.push({
            name: rawName.trim(),
            gender: normGender,
            className: rawClass.trim() || 'Form 1',
            level: normLevel,
            stream: rawStream.trim() || undefined,
            parentPhone: formattedPhone || undefined,
            dob: rawDob.trim() || '2010-01-01',
            subjects: parsedSubjects,
            regNo: rawReg.trim() || undefined,
            isValid: errors.length === 0,
            errors
          });
        });

        if (parsed.length === 0) {
          setParsingError('Hakuna rekodi za wanafunzi zilizopatikana kwenye faili hili.');
        } else {
          setParsedRows(parsed);
        }
      } catch (err) {
        console.error('CSV Parsing Error:', err);
        setParsingError('Hitilafu wakati wa kusoma faili la CSV. Tafadhali hakikisha muundo wa faili ni sahihi.');
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsText(selectedFile);
  };

  const handleConfirmImport = () => {
    const validRows = parsedRows.filter(r => r.isValid);
    if (validRows.length === 0) {
      alert('Hakuna wanafunzi halali wa kuingiza.');
      return;
    }

    const studentsToCreate: Student[] = validRows.map((r, idx) => {
      const isPrimary = r.level === 'PRIMARY' || r.level === 'PRE_PRIMARY' || 
        PRIMARY_CLASSES.includes(r.className) || NURSERY_CLASSES.includes(r.className);

      const assignedRegNo = r.regNo || formatStudentRegNo(
        schoolInfo?.schoolNumber,
        existingStudentsCount + idx + 1,
        undefined,
        isPrimary
      );

      return {
        id: Date.now() + idx,
        regNo: assignedRegNo,
        name: r.name,
        gender: r.gender,
        className: r.className,
        level: r.level,
        stream: r.level === 'CSEE' || r.level === 'PRIMARY' ? r.stream : undefined,
        combination: r.level === 'ACSEE' ? r.stream : undefined,
        parentPhone: r.parentPhone,
        phone: r.parentPhone,
        dob: r.dob || '2010-01-01',
        subjects: r.subjects,
        marks: {},
        total: 0,
        average: '0.0',
        division: '-',
        registeredAt: new Date().toISOString()
      };
    });

    onImportStudents(studentsToCreate);
    onClose();
  };

  const validCount = parsedRows.filter(r => r.isValid).length;
  const withPhoneCount = parsedRows.filter(r => r.isValid && r.parentPhone).length;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-150">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <FileSpreadsheet className="w-5 h-5 text-blue-300" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black tracking-wide flex items-center gap-2">
                <span>Ingiza Wanafunzi kwa CSV (Import Students)</span>
                <span className="text-[10px] bg-emerald-500/30 text-emerald-300 border border-emerald-400/40 px-2 py-0.5 rounded-full font-bold">
                  Includes Phone Plugin
                </span>
              </h3>
              <p className="text-xs text-blue-200 mt-0.5">
                Pakia orodha ya wanafunzi pamoja na namba za simu za wazazi moja kwa moja kutoka kwenye CSV / Excel.
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

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1 text-xs">
          {/* Step 1: Download Template Notice */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <Info className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-blue-950 block">Je, unahitaji muundo sahihi wa CSV?</span>
                <span className="text-blue-800 text-[11px]">
                  Pakua template yenye nguzo zote ikiwemo <strong>Parent Phone Number</strong>, Jina, Darasa na Masomo.
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="px-3.5 py-2 bg-white hover:bg-blue-100 text-blue-800 font-bold border border-blue-300 rounded-lg shadow-2xs flex items-center gap-1.5 shrink-0 cursor-pointer transition active:scale-95"
            >
              <Download className="w-4 h-4 text-blue-600" />
              <span>Download CSV Template</span>
            </button>
          </div>

          {/* Step 2: Upload Input */}
          <div className="space-y-2">
            <label className="block font-black text-slate-800 uppercase tracking-wider text-[11px]">
              Chagua Faili la CSV (Upload CSV File)
            </label>
            <label className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer bg-slate-50 hover:bg-blue-50/50 transition">
              <Upload className="w-8 h-8 text-blue-600" />
              <div className="text-center">
                <span className="font-bold text-slate-800 text-sm block">
                  {file ? file.name : 'Bonyeza hapa kuchagua faili la CSV'}
                </span>
                <span className="text-slate-500 text-[11px]">
                  Faili la .csv kutoka Microsoft Excel, Google Sheets, au Apple Numbers
                </span>
              </div>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

          {/* Error Message */}
          {parsingError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center gap-2 font-bold">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{parsingError}</span>
            </div>
          )}

          {/* Step 3: Live Preview Table */}
          {parsedRows.length > 0 && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  <span className="font-black text-slate-800 text-xs">
                    Muhtasari wa Wanafunzi ({parsedRows.length} Wamepatikana):
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full font-bold text-[11px]">
                    ✓ {validCount} Halali
                  </span>
                  <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full font-bold text-[11px] flex items-center gap-1">
                    <Smartphone className="w-3 h-3 text-blue-600" />
                    {withPhoneCount} Wana Namba ya Simu
                  </span>
                </div>
              </div>

              {/* Table Preview */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs max-h-60 overflow-y-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-100 text-slate-700 text-[11px] font-black uppercase sticky top-0 border-b border-slate-200">
                    <tr>
                      <th className="p-2.5 border-r border-slate-200">#</th>
                      <th className="p-2.5 border-r border-slate-200">Jina Kamili</th>
                      <th className="p-2.5 border-r border-slate-200">Jinsi</th>
                      <th className="p-2.5 border-r border-slate-200">Darasa &amp; Mkondo</th>
                      <th className="p-2.5 border-r border-slate-200">Namba ya Simu (Parent Phone)</th>
                      <th className="p-2.5 border-r border-slate-200">Tarehe ya Kuzaliwa</th>
                      <th className="p-2.5">Hali</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[11px]">
                    {parsedRows.map((r, i) => {
                      const carrier = r.parentPhone ? getTanzanianCarrier(r.parentPhone) : null;
                      return (
                        <tr key={i} className={r.isValid ? 'hover:bg-slate-50' : 'bg-rose-50/50'}>
                          <td className="p-2 border-r border-slate-200 font-mono text-slate-500">{i + 1}</td>
                          <td className="p-2 border-r border-slate-200 font-bold text-slate-900">{r.name || '---'}</td>
                          <td className="p-2 border-r border-slate-200">{r.gender}</td>
                          <td className="p-2 border-r border-slate-200 text-slate-700">
                            {r.className} {r.stream ? `(${r.stream})` : ''}
                          </td>
                          <td className="p-2 border-r border-slate-200 font-mono">
                            {r.parentPhone ? (
                              <div className="flex items-center gap-1 font-bold text-slate-900">
                                <span>{r.parentPhone}</span>
                                {carrier && (
                                  <span className={`text-[9px] px-1 py-0.2 rounded font-sans border ${carrier.bgColor} ${carrier.textColor} ${carrier.borderColor}`}>
                                    {carrier.name}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">-- Haina simu --</span>
                            )}
                          </td>
                          <td className="p-2 border-r border-slate-200 text-slate-600">{r.dob}</td>
                          <td className="p-2">
                            {r.isValid ? (
                              <span className="text-emerald-700 font-bold flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Tayari</span>
                              </span>
                            ) : (
                              <span className="text-rose-600 font-bold">
                                {r.errors.join(', ')}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-lg cursor-pointer"
          >
            Ghairi / Cancel
          </button>

          <button
            type="button"
            onClick={handleConfirmImport}
            disabled={validCount === 0 || isProcessing}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-sm transition active:scale-95"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Ingiza Wanafunzi {validCount > 0 ? `(${validCount})` : ''} Kikamilifu</span>
          </button>
        </div>
      </div>
    </div>
  );
};
