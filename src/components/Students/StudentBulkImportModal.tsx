import React, { useState, useRef, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { 
  Upload, 
  Download, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  X, 
  Users, 
  Phone, 
  Smartphone,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Check,
  RefreshCw,
  Search,
  Filter,
  FileText,
  SlidersHorizontal,
  Info,
  Edit2,
  Trash2,
  Database
} from 'lucide-react';
import { Student, SchoolInfo, EducationLevel } from '../../types';
import { formatPhoneNumber, isValidTanzanianPhone, getTanzanianCarrier } from '../../utils/phoneUtils';
import { formatStudentRegNo, getNextStudentRegNo } from '../../utils/studentRegUtils';
import { PRIMARY_CLASSES, NURSERY_CLASSES, SECONDARY_CLASSES } from '../../constants/defaults';
import { escapeCSV, downloadFile } from '../../utils/export';

export interface StudentBulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportStudents: (students: Student[]) => void;
  existingStudentsCount?: number;
  existingStudents?: Student[];
  schoolInfo?: SchoolInfo;
}

// Target schema fields that can be mapped
export interface TargetFieldDef {
  key: keyof TargetRow;
  label: string;
  required: boolean;
  description: string;
  synonyms: string[];
  example: string;
}

export interface TargetRow {
  name: string;
  gender: 'Male' | 'Female' | '';
  className: string;
  level: EducationLevel;
  stream?: string;
  parentPhone?: string;
  parentName?: string;
  dob?: string;
  regNo?: string;
  combination?: string;
  subjects?: string[];
}

export interface ValidatedRow extends TargetRow {
  originalIndex: number;
  rawRecord: Record<string, any>;
  isValid: boolean;
  errors: string[];
  warnings: string[];
  isSelected: boolean;
}

export const TARGET_FIELDS: TargetFieldDef[] = [
  {
    key: 'name',
    label: 'Student Full Name (Jina Kamili)',
    required: true,
    description: 'First, middle, and last name of the student',
    synonyms: ['name', 'full name', 'student name', 'jina', 'jina la mwanafunzi', 'pupil name', 'student', 'first name', 'jina kamili'],
    example: 'Juma Ally Mrisho'
  },
  {
    key: 'gender',
    label: 'Gender / Sex (Jinsi)',
    required: true,
    description: 'Male / Female (or M / F / Mvulana / Msichana)',
    synonyms: ['gender', 'sex', 'jinsi', 'me/ke', 'm/f', 'jinsia'],
    example: 'Male or Female'
  },
  {
    key: 'className',
    label: 'Class / Grade (Darasa)',
    required: true,
    description: 'Grade or level (e.g. Form 1, Standard 4, Baby Class)',
    synonyms: ['class', 'darasa', 'grade', 'form', 'class name', 'level class', 'standard'],
    example: 'Form 1, Standard 3'
  },
  {
    key: 'stream',
    label: 'Stream / Section (Mkondo)',
    required: false,
    description: 'Section e.g. Stream A, Blue, Science, North',
    synonyms: ['stream', 'mkondo', 'section', 'stream name', 'mkondo wa darasa'],
    example: 'Stream A, Stream B'
  },
  {
    key: 'parentPhone',
    label: 'Parent Phone Number (Simu ya Mzazi)',
    required: false,
    description: 'Tanzanian phone number for SMS notifications and fees',
    synonyms: ['parent phone', 'phone', 'simu', 'namba ya simu', 'parent mobile', 'contact', 'mobile', 'namba ya mzazi', 'simu ya mzazi'],
    example: '0754123456 or 0684123456'
  },
  {
    key: 'parentName',
    label: 'Parent / Guardian Name (Jina la Mzazi)',
    required: false,
    description: 'Full name of parent, guardian or sponsor',
    synonyms: ['parent name', 'guardian', 'mzazi', 'jina la mzazi', 'guardian name', 'sponsor'],
    example: 'Mzee Ally Mrisho'
  },
  {
    key: 'dob',
    label: 'Date of Birth (Tarehe ya Kuzaliwa)',
    required: false,
    description: 'Format YYYY-MM-DD or standard date',
    synonyms: ['dob', 'date of birth', 'birth date', 'tarehe ya kuzaliwa', 'kuzaliwa', 'birth'],
    example: '2010-05-14'
  },
  {
    key: 'regNo',
    label: 'Admission / Reg No (Namba ya Usajili)',
    required: false,
    description: 'School admission number. If empty, auto-generated sequentially',
    synonyms: ['reg no', 'admission no', 'admission number', 'namba ya usajili', 'token', 'student id', 'roll no', 'id'],
    example: 'S.0123/0001/2026'
  },
  {
    key: 'combination',
    label: 'Combination / Mchepuo (A-Level)',
    required: false,
    description: 'For Form 5 and Form 6 (e.g. PCB, PCM, HGL, CBG)',
    synonyms: ['combination', 'mchepuo', 'comb', 'acsee combination'],
    example: 'PCB, PCM, HGL'
  },
  {
    key: 'subjects',
    label: 'Subjects (Masomo)',
    required: false,
    description: 'Semicolon or comma separated list of subjects',
    synonyms: ['subjects', 'masomo', 'subject list', 'courses'],
    example: 'English; Kiswahili; Basic Mathematics'
  }
];

export const StudentBulkImportModal: React.FC<StudentBulkImportModalProps> = ({
  isOpen,
  onClose,
  onImportStudents,
  existingStudentsCount = 0,
  existingStudents = [],
  schoolInfo
}) => {
  // Stepper state: 1 = upload, 2 = mapping, 3 = validation & preview, 4 = complete
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // File state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [availableSheets, setAvailableSheets] = useState<string[]>([]);
  const [activeSheetName, setActiveSheetName] = useState<string>('');
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, any>[]>([]);
  const [parsingError, setParsingError] = useState<string | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);

  // Column mapping state: targetFieldKey -> rawHeaderName
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});

  // Global fallbacks if column is omitted
  const [defaultClassFallback, setDefaultClassFallback] = useState<string>('Form 1');
  const [defaultStreamFallback, setDefaultStreamFallback] = useState<string>('');
  const [skipInvalidRows, setSkipInvalidRows] = useState<boolean>(true);

  // Validation results
  const [validatedData, setValidatedData] = useState<ValidatedRow[]>([]);
  const [filterMode, setFilterMode] = useState<'ALL' | 'VALID' | 'ERRORS'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Editing row modal inside step 3
  const [editingRow, setEditingRow] = useState<ValidatedRow | null>(null);

  // Import execution state
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importedSummary, setImportedSummary] = useState<{ total: number; boys: number; girls: number; classesCount: number } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // -------------------------------------------------------------
  // Template Download Handlers (.xlsx and .csv)
  // -------------------------------------------------------------
  const handleDownloadExcelTemplate = () => {
    const templateData = [
      {
        'Full Name': 'Juma Ally Mrisho',
        'Gender': 'Male',
        'Class': 'Form 1',
        'Stream': 'Stream A',
        'Parent Phone': '0754123456',
        'Parent Name': 'Ally Mrisho',
        'Date of Birth': '2010-05-14',
        'Reg No': formatStudentRegNo(schoolInfo?.schoolNumber, existingStudentsCount + 1),
        'Combination': '',
        'Subjects': 'English Language; Kiswahili; Basic Mathematics; Physics; Chemistry; Biology'
      },
      {
        'Full Name': 'Amina Hassan Bakari',
        'Gender': 'Female',
        'Class': 'Form 1',
        'Stream': 'Stream B',
        'Parent Phone': '0784987654',
        'Parent Name': 'Hassan Bakari',
        'Date of Birth': '2010-08-20',
        'Reg No': formatStudentRegNo(schoolInfo?.schoolNumber, existingStudentsCount + 2),
        'Combination': '',
        'Subjects': 'English Language; Kiswahili; Basic Mathematics; Physics; Chemistry; Biology; Geography; History'
      },
      {
        'Full Name': 'Kelvin Peter Mrema',
        'Gender': 'Male',
        'Class': 'Form 5',
        'Stream': 'Science',
        'Parent Phone': '0767112233',
        'Parent Name': 'Peter Mrema',
        'Date of Birth': '2008-01-12',
        'Reg No': formatStudentRegNo(schoolInfo?.schoolNumber, existingStudentsCount + 3),
        'Combination': 'PCB',
        'Subjects': 'Physics; Chemistry; Biology; General Studies; Basic Applied Mathematics'
      },
      {
        'Full Name': 'Neema Emmanuel Masawe',
        'Gender': 'Female',
        'Class': 'Standard 4',
        'Stream': 'Blue',
        'Parent Phone': '0655334455',
        'Parent Name': 'Emmanuel Masawe',
        'Date of Birth': '2013-11-04',
        'Reg No': formatStudentRegNo(schoolInfo?.schoolNumber, existingStudentsCount + 4, undefined, true),
        'Combination': '',
        'Subjects': 'Kiswahili; English Language; Mathematics (Hisabati); Science and Technology; Social Studies'
      }
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(templateData);

    // Set column widths for elegance
    ws['!cols'] = [
      { wch: 26 }, // Full Name
      { wch: 10 }, // Gender
      { wch: 14 }, // Class
      { wch: 14 }, // Stream
      { wch: 16 }, // Parent Phone
      { wch: 22 }, // Parent Name
      { wch: 14 }, // Date of Birth
      { wch: 20 }, // Reg No
      { wch: 14 }, // Combination
      { wch: 45 }  // Subjects
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Students_Template');
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'haby_students_import_template.xlsx';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadCsvTemplate = () => {
    const headers = [
      'Full Name',
      'Gender',
      'Class',
      'Stream',
      'Parent Phone',
      'Parent Name',
      'Date of Birth',
      'Reg No',
      'Combination',
      'Subjects'
    ];

    const rows = [
      [
        'Juma Ally Mrisho',
        'Male',
        'Form 1',
        'Stream A',
        '0754123456',
        'Ally Mrisho',
        '2010-05-14',
        formatStudentRegNo(schoolInfo?.schoolNumber, existingStudentsCount + 1),
        '',
        'English Language; Kiswahili; Basic Mathematics; Physics; Chemistry; Biology'
      ],
      [
        'Amina Hassan Bakari',
        'Female',
        'Form 1',
        'Stream B',
        '0784987654',
        'Hassan Bakari',
        '2010-08-20',
        formatStudentRegNo(schoolInfo?.schoolNumber, existingStudentsCount + 2),
        '',
        'English Language; Kiswahili; Basic Mathematics; Physics; Chemistry; Biology'
      ]
    ];

    const csvContent = [
      headers.map(escapeCSV).join(','),
      ...rows.map(r => r.map(escapeCSV).join(','))
    ].join('\n');

    downloadFile(
      'haby_students_import_template.csv',
      csvContent,
      'text/csv;charset=utf-8;'
    );
  };

  // -------------------------------------------------------------
  // File Parsing Logic (Supports .xlsx, .xls, .csv)
  // -------------------------------------------------------------
  const parseWorkbookSheet = (wb: XLSX.WorkBook, sheetName: string) => {
    const ws = wb.Sheets[sheetName];
    if (!ws) {
      setParsingError(`Sheet "${sheetName}" haikupatikana.`);
      return;
    }

    const data: Record<string, any>[] = XLSX.utils.sheet_to_json(ws, { defval: '' });
    if (data.length === 0) {
      setParsingError(`Sheet "${sheetName}" haina data za kutosha au mistari iko tupu.`);
      setRawHeaders([]);
      setRawRows([]);
      return;
    }

    // Extract headers from first row
    const headers = Object.keys(data[0] || {}).map(h => h.trim());
    setRawHeaders(headers);
    setRawRows(data);
    setParsingError(null);

    // Auto-map headers
    const autoMap: Record<string, string> = {};
    TARGET_FIELDS.forEach(field => {
      // Find matching raw header
      const match = headers.find(h => {
        const clean = h.toLowerCase().replace(/[^a-z0-9]/g, ' ').trim();
        return field.synonyms.some(syn => clean.includes(syn) || syn.includes(clean));
      });
      if (match) {
        autoMap[field.key] = match;
      }
    });

    setColumnMapping(autoMap);
  };

  const processFile = async (file: File) => {
    setSelectedFile(file);
    setParsingError(null);
    setIsProcessingFile(true);

    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });
      setWorkbook(wb);
      setAvailableSheets(wb.SheetNames);

      const firstSheet = wb.SheetNames[0] || '';
      setActiveSheetName(firstSheet);
      parseWorkbookSheet(wb, firstSheet);
    } catch (err: any) {
      console.error('File parsing error:', err);
      setParsingError(`Hitilafu ya kusoma faili: ${err?.message || 'Muundo wa faili si sahihi'}`);
    } finally {
      setIsProcessingFile(false);
    }
  };

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleSheetChange = (sheetName: string) => {
    setActiveSheetName(sheetName);
    if (workbook) {
      parseWorkbookSheet(workbook, sheetName);
    }
  };

  // -------------------------------------------------------------
  // Validation Logic (Step 3)
  // -------------------------------------------------------------
  const inferEducationLevel = (className: string): EducationLevel => {
    const upper = (className || '').toUpperCase().trim();
    if (upper.includes('ACSEE') || upper.includes('FORM 5') || upper.includes('FORM 6') || upper.includes('ADVANCED')) {
      return 'ACSEE';
    }
    if (upper.includes('PRIMARY') || upper.includes('STANDARD') || upper.includes('STD') || PRIMARY_CLASSES.includes(className)) {
      return 'PRIMARY';
    }
    if (upper.includes('NURSERY') || upper.includes('BABY') || upper.includes('PRE') || NURSERY_CLASSES.includes(className)) {
      return 'PRE_PRIMARY';
    }
    return 'CSEE';
  };

  const normalizeGenderValue = (raw: string): 'Male' | 'Female' | '' => {
    if (!raw) return '';
    const clean = raw.toString().trim().toLowerCase();
    if (['m', 'male', 'mvulana', 'me', 'boy'].includes(clean) || clean.startsWith('m') || clean.startsWith('b')) {
      return 'Male';
    }
    if (['f', 'female', 'msichana', 'ke', 'girl'].includes(clean) || clean.startsWith('f') || clean.startsWith('k') || clean.startsWith('g')) {
      return 'Female';
    }
    return '';
  };

  const runDataValidation = () => {
    if (rawRows.length === 0) {
      setParsingError('Hakuna data ya kuhakiki.');
      return;
    }

    const validated: ValidatedRow[] = [];
    const usedRegNos = new Set<string>();

    // Seed existing registration numbers
    existingStudents.forEach(s => {
      if (s.regNo) usedRegNos.add(s.regNo.trim().toUpperCase());
    });

    rawRows.forEach((row, idx) => {
      // Extract mapped values
      const rawName = columnMapping.name ? String(row[columnMapping.name] || '').trim() : '';
      const rawGender = columnMapping.gender ? String(row[columnMapping.gender] || '').trim() : '';
      const rawClass = columnMapping.className ? String(row[columnMapping.className] || '').trim() : '';
      const rawStream = columnMapping.stream ? String(row[columnMapping.stream] || '').trim() : '';
      const rawPhone = columnMapping.parentPhone ? String(row[columnMapping.parentPhone] || '').trim() : '';
      const rawParentName = columnMapping.parentName ? String(row[columnMapping.parentName] || '').trim() : '';
      const rawDob = columnMapping.dob ? String(row[columnMapping.dob] || '').trim() : '';
      const rawReg = columnMapping.regNo ? String(row[columnMapping.regNo] || '').trim() : '';
      const rawComb = columnMapping.combination ? String(row[columnMapping.combination] || '').trim() : '';
      const rawSubs = columnMapping.subjects ? String(row[columnMapping.subjects] || '').trim() : '';

      const errors: string[] = [];
      const warnings: string[] = [];

      // 1. Name validation
      if (!rawName) {
        errors.push('Jina la mwanafunzi linakosekana (Missing Name)');
      } else if (rawName.length < 3) {
        errors.push('Jina ni fupi sana (Name too short)');
      }

      // 2. Gender validation
      const normGender = normalizeGenderValue(rawGender);
      if (!normGender) {
        if (!rawGender) {
          warnings.push('Jinsi haijawekwa (Gender empty, itachukua "Male" kwa chaguo-msingi)');
        } else {
          warnings.push(`Jinsi "${rawGender}" haitambuliki vizuri`);
        }
      }

      // 3. Class Name validation
      const finalClass = rawClass || defaultClassFallback || 'Form 1';
      if (!rawClass) {
        warnings.push(`Darasa halikuwekwa; linatumia darasa la msingi "${defaultClassFallback}"`);
      }

      // 4. Level inference
      const finalLevel = inferEducationLevel(finalClass);

      // 5. Parent Phone validation
      let finalPhone = '';
      if (rawPhone) {
        finalPhone = formatPhoneNumber(rawPhone);
        if (!isValidTanzanianPhone(finalPhone)) {
          warnings.push(`Namba ya simu (${rawPhone}) haina muundo wa kawaida wa Tanzania (e.g. 0754...)`);
        }
      } else {
        warnings.push('Namba ya simu ya mzazi haijawekwa');
      }

      // 6. Registration Number check & auto-generation
      let finalRegNo = rawReg;
      if (finalRegNo) {
        const cleanReg = finalRegNo.trim().toUpperCase();
        if (usedRegNos.has(cleanReg)) {
          warnings.push(`Namba ya usajili "${finalRegNo}" tayari ipo; itapangiwa namba mpya kiotomatiki`);
          finalRegNo = '';
        } else {
          usedRegNos.add(cleanReg);
        }
      }

      // 7. Combination check for ACSEE
      const finalComb = finalLevel === 'ACSEE' ? (rawComb || rawStream || 'General') : undefined;

      // 8. Subjects parsing
      const finalSubjects = rawSubs
        ? rawSubs.split(/[;,]/).map(s => s.trim()).filter(Boolean)
        : finalLevel === 'PRIMARY'
          ? ['Kiswahili', 'English Language', 'Mathematics (Hisabati)', 'Science and Technology', 'Social Studies']
          : ['English Language', 'Kiswahili', 'Basic Mathematics', 'Physics', 'Chemistry', 'Biology'];

      // Date of Birth normalization
      let finalDob = rawDob || '2010-01-01';
      if (rawDob) {
        // Try to handle Excel numeric serial date e.g. 44256
        if (!isNaN(Number(rawDob)) && Number(rawDob) > 20000 && Number(rawDob) < 60000) {
          try {
            const excelDate = new Date((Number(rawDob) - 25569) * 86400 * 1000);
            finalDob = excelDate.toISOString().split('T')[0];
          } catch (e) {
            finalDob = '2010-01-01';
          }
        }
      }

      validated.push({
        originalIndex: idx,
        rawRecord: row,
        name: rawName,
        gender: normGender || 'Male',
        className: finalClass,
        level: finalLevel,
        stream: rawStream || defaultStreamFallback || undefined,
        parentPhone: finalPhone || undefined,
        parentName: rawParentName || undefined,
        dob: finalDob,
        regNo: finalRegNo || undefined,
        combination: finalComb,
        subjects: finalSubjects,
        isValid: errors.length === 0,
        errors,
        warnings,
        isSelected: errors.length === 0
      });
    });

    setValidatedData(validated);
    setCurrentStep(3);
  };

  // -------------------------------------------------------------
  // Filter and Summary Helpers
  // -------------------------------------------------------------
  const filteredValidatedRows = useMemo(() => {
    return validatedData.filter(row => {
      // Step filter
      if (filterMode === 'VALID' && !row.isValid) return false;
      if (filterMode === 'ERRORS' && row.isValid) return false;

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = row.name.toLowerCase().includes(q);
        const matchClass = row.className.toLowerCase().includes(q);
        const matchPhone = (row.parentPhone || '').includes(q);
        const matchReg = (row.regNo || '').toLowerCase().includes(q);
        return matchName || matchClass || matchPhone || matchReg;
      }
      return true;
    });
  }, [validatedData, filterMode, searchQuery]);

  const stats = useMemo(() => {
    const total = validatedData.length;
    const valid = validatedData.filter(r => r.isValid).length;
    const errors = validatedData.filter(r => !r.isValid).length;
    const withWarnings = validatedData.filter(r => r.warnings.length > 0 && r.isValid).length;
    const selected = validatedData.filter(r => r.isSelected).length;
    return { total, valid, errors, withWarnings, selected };
  }, [validatedData]);

  const handleToggleSelectRow = (originalIndex: number) => {
    setValidatedData(prev => prev.map(r => 
      r.originalIndex === originalIndex ? { ...r, isSelected: !r.isSelected } : r
    ));
  };

  const handleSelectAll = (select: boolean) => {
    setValidatedData(prev => prev.map(r => {
      if (!r.isValid && select && skipInvalidRows) {
        return r; // Don't select invalid if skipping
      }
      return { ...r, isSelected: select };
    }));
  };

  // -------------------------------------------------------------
  // Inline Editing Row
  // -------------------------------------------------------------
  const handleSaveEditedRow = (updated: ValidatedRow) => {
    // Re-validate row
    const errors: string[] = [];
    if (!updated.name.trim()) errors.push('Jina linakosekana');
    if (!updated.className.trim()) errors.push('Darasa linakosekana');

    const newRow: ValidatedRow = {
      ...updated,
      isValid: errors.length === 0,
      errors,
      isSelected: errors.length === 0
    };

    setValidatedData(prev => prev.map(r => r.originalIndex === updated.originalIndex ? newRow : r));
    setEditingRow(null);
  };

  // -------------------------------------------------------------
  // Final Import Action (Step 4)
  // -------------------------------------------------------------
  const handleExecuteImport = async () => {
    const rowsToImport = validatedData.filter(r => r.isSelected && (r.isValid || !skipInvalidRows));
    if (rowsToImport.length === 0) {
      alert('Hakuna rekodi zilizochaguliwa kwa ajili ya kuingizwa.');
      return;
    }

    setIsImporting(true);
    setImportProgress(10);

    const isPrimarySchool = schoolInfo?.institutionalLevels?.includes('PRIMARY') || false;

    // Construct full Student entities
    const createdStudents: Student[] = rowsToImport.map((r, i) => {
      const isPrimary = r.level === 'PRIMARY' || r.level === 'PRE_PRIMARY' || PRIMARY_CLASSES.includes(r.className) || NURSERY_CLASSES.includes(r.className);

      const assignedRegNo = r.regNo || formatStudentRegNo(
        schoolInfo?.schoolNumber,
        existingStudentsCount + i + 1,
        undefined,
        isPrimary
      );

      return {
        id: Date.now() + i,
        regNo: assignedRegNo,
        name: r.name,
        fullName: r.name,
        gender: r.gender,
        className: r.className,
        level: r.level,
        stream: r.stream,
        combination: r.combination,
        parentPhone: r.parentPhone,
        phone: r.parentPhone,
        parentName: r.parentName,
        dob: r.dob || '2010-01-01',
        subjects: r.subjects || ['English Language', 'Kiswahili', 'Mathematics'],
        marks: {},
        total: 0,
        average: '0.0',
        division: '-',
        registeredAt: new Date().toISOString()
      };
    });

    setImportProgress(60);

    // Call callback to add students into Supabase and App state
    try {
      await onImportStudents(createdStudents);
      setImportProgress(100);

      // Summarize imported batch
      const boys = createdStudents.filter(s => s.gender === 'Male').length;
      const girls = createdStudents.filter(s => s.gender === 'Female').length;
      const uniqueClasses = new Set(createdStudents.map(s => s.className)).size;

      setImportedSummary({
        total: createdStudents.length,
        boys,
        girls,
        classesCount: uniqueClasses
      });

      setCurrentStep(4);
    } catch (err: any) {
      console.error('Import error:', err);
      alert(`Hitilafu wakati wa kuhifadhi wanafunzi: ${err?.message || 'Angalia muunganisho wa database'}`);
    } finally {
      setIsImporting(false);
    }
  };

  const handleResetImport = () => {
    setSelectedFile(null);
    setWorkbook(null);
    setRawHeaders([]);
    setRawRows([]);
    setColumnMapping({});
    setValidatedData([]);
    setImportedSummary(null);
    setCurrentStep(1);
  };

  // -------------------------------------------------------------
  // Render Stepper Bar
  // -------------------------------------------------------------
  const renderStepper = () => (
    <div className="flex items-center justify-between px-6 py-3 bg-slate-50 border-b border-slate-200 text-xs">
      {[
        { step: 1, label: '1. Pakia Faili (Upload)', icon: Upload },
        { step: 2, label: '2. Sawazisha Safu (Map Columns)', icon: SlidersHorizontal },
        { step: 3, label: '3. Hakiki na Kagua (Validate)', icon: CheckCircle2 },
        { step: 4, label: '4. Kamilisha (Done)', icon: Database }
      ].map((item, idx) => {
        const isActive = currentStep === item.step;
        const isDone = currentStep > item.step;
        const Icon = item.icon;

        return (
          <React.Fragment key={item.step}>
            <div className={`flex items-center gap-2 font-bold transition-colors ${
              isActive 
                ? 'text-blue-700' 
                : isDone 
                  ? 'text-emerald-600' 
                  : 'text-slate-400'
            }`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                isActive 
                  ? 'bg-blue-600 text-white shadow-xs' 
                  : isDone 
                    ? 'bg-emerald-600 text-white' 
                    : 'bg-slate-200 text-slate-500'
              }`}>
                {isDone ? <Check className="w-3.5 h-3.5" /> : item.step}
              </div>
              <span className="hidden sm:inline">{item.label}</span>
            </div>
            {idx < 3 && (
              <div className={`flex-1 h-0.5 mx-3 ${isDone ? 'bg-emerald-400' : 'bg-slate-200'}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-5xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in duration-150">
        
        {/* Modal Header */}
        <div className="p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-300 flex items-center justify-center border border-blue-400/30 shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black tracking-wide text-white">
                  Bulk Student Import (Excel & CSV)
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-500/30 text-blue-200 border border-blue-400/30">
                  Smart Mapper & Validator
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Ingiza wanafunzi kwa wingi kutoka Excel au CSV, sawazisha safu za data (columns) na hakiki kabla ya kuongeza kwenye database ya Supabase.
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

        {/* Stepper Navigation */}
        {renderStepper()}

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto flex-1 text-xs space-y-4">
          
          {/* ======================================================== */}
          {/* STEP 1: UPLOAD FILE                                      */}
          {/* ======================================================== */}
          {currentStep === 1 && (
            <div className="space-y-5">
              
              {/* Template Download Hero */}
              <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-slate-50 rounded-2xl p-4 sm:p-5 border border-blue-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Download className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900">
                      Pakua Kiolezo Rasmi cha Excel / CSV (Download Template)
                    </h4>
                    <p className="text-slate-600 mt-0.5 text-xs">
                      Tumia kiolezo hiki kilichowekwa tayari na safu za Jina, Darasa, Jinsi, Namba ya Simu ya Mzazi na Masomo kwa uingizaji sahihi wa 100%.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                  <button
                    type="button"
                    onClick={handleDownloadExcelTemplate}
                    className="flex-1 sm:flex-initial px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
                    <span>Pakua Excel (.xlsx)</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadCsvTemplate}
                    className="flex-1 sm:flex-initial px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-800 font-bold rounded-xl border border-slate-300 flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer"
                  >
                    <FileText className="w-4 h-4 text-slate-500" />
                    <span>Pakua CSV (.csv)</span>
                  </button>
                </div>
              </div>

              {/* Drag and Drop Upload Area */}
              <div
                onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 ${
                  isDragging 
                    ? 'border-blue-500 bg-blue-50/70 scale-[0.99]' 
                    : selectedFile 
                      ? 'border-emerald-400 bg-emerald-50/40' 
                      : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel, text/csv"
                  onChange={handleFileInputChange}
                  className="hidden"
                />

                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-transform ${
                  selectedFile 
                    ? 'bg-emerald-100 text-emerald-700' 
                    : 'bg-blue-100 text-blue-600 hover:scale-105'
                }`}>
                  {isProcessingFile ? (
                    <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
                  ) : selectedFile ? (
                    <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                  ) : (
                    <Upload className="w-8 h-8" />
                  )}
                </div>

                <div>
                  <h4 className="text-sm sm:text-base font-black text-slate-900">
                    {selectedFile 
                      ? selectedFile.name 
                      : 'Bofya hapa au buruta faili la Excel au CSV (Drag & Drop)'}
                  </h4>
                  <p className="text-slate-500 mt-1 text-xs">
                    Inakubali miundo yote ya <strong>.xlsx</strong>, <strong>.xls</strong>, na <strong>.csv</strong> (hadi rekodi 2,000 mara moja).
                  </p>
                </div>

                {selectedFile && (
                  <div className="flex items-center gap-2 mt-2">
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      Ukubwa: {(selectedFile.size / 1024).toFixed(1)} KB
                    </span>
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
                      {rawRows.length} Mistari Imesomwa
                    </span>
                  </div>
                )}
              </div>

              {/* Error Message */}
              {parsingError && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 flex items-start gap-3 animate-in fade-in">
                  <AlertTriangle className="w-5 h-5 shrink-0 text-rose-500 mt-0.5" />
                  <div>
                    <h5 className="font-bold text-xs">Hitilafu ya Faili</h5>
                    <p className="text-[11px] mt-0.5">{parsingError}</p>
                  </div>
                </div>
              )}

              {/* Sheet Selector (If multiple sheets in Excel) */}
              {availableSheets.length > 1 && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                    <span className="font-bold text-slate-800 text-xs">
                      Faili hili lina Sheet {availableSheets.length}:
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 text-[11px]">Chagua Sheet ya kuingiza:</span>
                    <select
                      value={activeSheetName}
                      onChange={e => handleSheetChange(e.target.value)}
                      className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:outline-blue-500"
                    >
                      {availableSheets.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Raw Preview of First 3 rows */}
              {rawRows.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-slate-700 uppercase tracking-wider text-[11px]">
                      Mwonekano wa Awali (First 3 Rows Preview):
                    </span>
                    <span className="text-slate-500 text-[11px]">
                      Safu {rawHeaders.length} zilizotambuliwa
                    </span>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-x-auto bg-white shadow-xs">
                    <table className="w-full text-left border-collapse text-[11px]">
                      <thead>
                        <tr className="bg-slate-100 text-slate-700 font-black border-b border-slate-200">
                          {rawHeaders.map((h, i) => (
                            <th key={i} className="p-2.5 whitespace-nowrap">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium text-slate-600">
                        {rawRows.slice(0, 3).map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/70">
                            {rawHeaders.map((h, cIdx) => (
                              <td key={cIdx} className="p-2.5 whitespace-nowrap">
                                {String(row[h] || '-')}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* ======================================================== */}
          {/* STEP 2: COLUMN MAPPING                                   */}
          {/* ======================================================== */}
          {currentStep === 2 && (
            <div className="space-y-5">
              
              <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3.5 flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div className="text-[11px] text-blue-900 leading-relaxed">
                  <strong>Sawazisha Safu (Column Mapping):</strong> Chagua ni safu gani kutoka kwenye faili lako la Excel/CSV inayolingana na kila sifa ya mwanafunzi. Mfumo tayari umelinganisha baadhi ya safu kiotomatiki.
                </div>
              </div>

              {/* Mapping Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {TARGET_FIELDS.map(field => {
                  const mappedHeader = columnMapping[field.key] || '';
                  const sampleValues = mappedHeader 
                    ? rawRows.slice(0, 3).map(r => r[mappedHeader]).filter(Boolean)
                    : [];

                  return (
                    <div 
                      key={field.key}
                      className={`p-3.5 rounded-xl border transition-all ${
                        mappedHeader 
                          ? 'border-emerald-300 bg-emerald-50/20' 
                          : field.required 
                            ? 'border-amber-300 bg-amber-50/30' 
                            : 'border-slate-200 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-900 text-xs">{field.label}</span>
                          {field.required && (
                            <span className="px-1.5 py-0.2 bg-rose-100 text-rose-700 font-black rounded-md text-[9px] uppercase">
                              Required
                            </span>
                          )}
                        </div>
                        {mappedHeader && (
                          <span className="flex items-center gap-1 text-emerald-700 font-bold text-[10px]">
                            <Check className="w-3 h-3" /> Mapped
                          </span>
                        )}
                      </div>

                      <p className="text-slate-500 text-[10px] mb-2">{field.description}</p>

                      <div className="space-y-1.5">
                        <select
                          value={mappedHeader}
                          onChange={e => {
                            const val = e.target.value;
                            setColumnMapping(prev => ({
                              ...prev,
                              [field.key]: val
                            }));
                          }}
                          className={`w-full px-3 py-1.5 rounded-lg border text-xs font-semibold focus:outline-blue-500 cursor-pointer ${
                            mappedHeader 
                              ? 'border-emerald-400 bg-white text-emerald-900' 
                              : 'border-slate-300 bg-white text-slate-600'
                          }`}
                        >
                          <option value="">-- Hakuna (Do Not Map) --</option>
                          {rawHeaders.map((header, hIdx) => (
                            <option key={hIdx} value={header}>
                              Safu: {header}
                            </option>
                          ))}
                        </select>

                        {/* Live sample preview */}
                        {sampleValues.length > 0 ? (
                          <div className="text-[10px] text-slate-600 bg-slate-100/70 p-1.5 rounded-md truncate">
                            <span className="font-bold text-slate-700">Mfano wa data: </span>
                            {sampleValues.slice(0, 3).map((v, i) => `"${v}"`).join(', ')}
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-400 italic">
                            Chagua safu ili kuona mifano ya data
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Fallback Defaults Section */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <h4 className="font-black text-slate-800 text-xs flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-blue-600" />
                  <span>Mipangilio ya Ziada (Default Fallbacks):</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-600 text-[11px] font-bold mb-1">
                      Darasa la Msingi (Kama halijaandikwa kwenye faili):
                    </label>
                    <select
                      value={defaultClassFallback}
                      onChange={e => setDefaultClassFallback(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800"
                    >
                      {[...SECONDARY_CLASSES, ...PRIMARY_CLASSES, ...NURSERY_CLASSES].map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-600 text-[11px] font-bold mb-1">
                      Mkondo wa Msingi (Default Stream / Section):
                    </label>
                    <input
                      type="text"
                      value={defaultStreamFallback}
                      onChange={e => setDefaultStreamFallback(e.target.value)}
                      placeholder="e.g. Stream A, Blue, Science..."
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 placeholder-slate-400"
                    />
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* ======================================================== */}
          {/* STEP 3: VALIDATION & REVIEW                              */}
          {/* ======================================================== */}
          {currentStep === 3 && (
            <div className="space-y-4">
              
              {/* Summary Metric Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs">
                  <div className="text-[10px] text-slate-500 font-bold uppercase">Jumla ya Mistari</div>
                  <div className="text-xl font-black text-slate-900 mt-0.5">{stats.total}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Rekodi zilizosomwa</div>
                </div>

                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 shadow-xs">
                  <div className="text-[10px] text-emerald-700 font-bold uppercase">Safi & Halali</div>
                  <div className="text-xl font-black text-emerald-700 mt-0.5">{stats.valid}</div>
                  <div className="text-[10px] text-emerald-600 mt-0.5">Tayari kuingizwa</div>
                </div>

                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 shadow-xs">
                  <div className="text-[10px] text-amber-700 font-bold uppercase">Tahadhari (Warnings)</div>
                  <div className="text-xl font-black text-amber-700 mt-0.5">{stats.withWarnings}</div>
                  <div className="text-[10px] text-amber-600 mt-0.5">Kama vile simu kukosekana</div>
                </div>

                <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 shadow-xs">
                  <div className="text-[10px] text-rose-700 font-bold uppercase">Makosa (Errors)</div>
                  <div className="text-xl font-black text-rose-700 mt-0.5">{stats.errors}</div>
                  <div className="text-[10px] text-rose-600 mt-0.5">Jina/darasa limekosekana</div>
                </div>
              </div>

              {/* Table Controls Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                {/* Search */}
                <div className="relative flex-1 max-w-sm">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Tafuta kwa jina, darasa, simu..."
                    className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:outline-blue-500 placeholder-slate-400"
                  />
                </div>

                {/* Filter Tabs */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setFilterMode('ALL')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                      filterMode === 'ALL' 
                        ? 'bg-slate-900 text-white' 
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Wote ({stats.total})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterMode('VALID')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                      filterMode === 'VALID' 
                        ? 'bg-emerald-600 text-white' 
                        : 'bg-white text-emerald-800 border border-emerald-200 hover:bg-emerald-50'
                    }`}
                  >
                    Halali Tu ({stats.valid})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterMode('ERRORS')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                      filterMode === 'ERRORS' 
                        ? 'bg-rose-600 text-white' 
                        : 'bg-white text-rose-800 border border-rose-200 hover:bg-rose-50'
                    }`}
                  >
                    Makosa ({stats.errors})
                  </button>
                </div>

                {/* Selection Helpers */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSelectAll(true)}
                    className="px-2.5 py-1 text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md border border-blue-200 cursor-pointer"
                  >
                    Chagua Wote
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectAll(false)}
                    className="px-2.5 py-1 text-[11px] font-bold text-slate-600 bg-white hover:bg-slate-100 rounded-md border border-slate-200 cursor-pointer"
                  >
                    Ondoa Uchaguzi
                  </button>
                </div>
              </div>

              {/* Data Review Table */}
              <div className="border border-slate-200 rounded-xl overflow-x-auto bg-white shadow-xs max-h-80">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="sticky top-0 bg-slate-100 z-10 border-b border-slate-200">
                    <tr className="text-slate-700 font-black text-[11px] uppercase tracking-wider">
                      <th className="p-2.5 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={stats.selected === stats.total && stats.total > 0}
                          onChange={e => handleSelectAll(e.target.checked)}
                          className="rounded text-blue-600 cursor-pointer"
                        />
                      </th>
                      <th className="p-2.5">#</th>
                      <th className="p-2.5">Jina la Mwanafunzi</th>
                      <th className="p-2.5">Jinsi</th>
                      <th className="p-2.5">Darasa</th>
                      <th className="p-2.5">Mkondo</th>
                      <th className="p-2.5">Simu ya Mzazi</th>
                      <th className="p-2.5">Tarehe ya Kuzaliwa</th>
                      <th className="p-2.5">Hali (Status)</th>
                      <th className="p-2.5 text-center">Rekebisha</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredValidatedRows.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="p-8 text-center text-slate-400">
                          Hakuna rekodi zilizopatikana kwenye kichujio hiki.
                        </td>
                      </tr>
                    ) : (
                      filteredValidatedRows.map(row => {
                        const carrier = row.parentPhone ? getTanzanianCarrier(row.parentPhone) : null;

                        return (
                          <tr 
                            key={row.originalIndex}
                            className={`hover:bg-slate-50 transition-colors ${
                              !row.isValid 
                                ? 'bg-rose-50/40' 
                                : row.warnings.length > 0 
                                  ? 'bg-amber-50/20' 
                                  : ''
                            }`}
                          >
                            <td className="p-2.5 text-center">
                              <input
                                type="checkbox"
                                checked={row.isSelected}
                                onChange={() => handleToggleSelectRow(row.originalIndex)}
                                className="rounded text-blue-600 cursor-pointer"
                              />
                            </td>
                            <td className="p-2.5 text-slate-400 text-[10px] font-mono">
                              {row.originalIndex + 1}
                            </td>
                            <td className="p-2.5 font-bold text-slate-900">
                              {row.name || <span className="text-rose-500 italic">[Jina Halipo]</span>}
                            </td>
                            <td className="p-2.5">
                              <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                                row.gender === 'Female' 
                                  ? 'bg-pink-100 text-pink-700' 
                                  : 'bg-blue-100 text-blue-700'
                              }`}>
                                {row.gender}
                              </span>
                            </td>
                            <td className="p-2.5 font-bold text-slate-800">
                              {row.className}
                            </td>
                            <td className="p-2.5 text-slate-600">
                              {row.stream || '-'}
                            </td>
                            <td className="p-2.5">
                              {row.parentPhone ? (
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono text-slate-800">{row.parentPhone}</span>
                                  {carrier && (
                                    <span 
                                      className={`px-1.5 py-0.2 rounded text-[9px] font-black border ${carrier.bgColor} ${carrier.textColor} ${carrier.borderColor}`}
                                    >
                                      {carrier.name}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-400 italic text-[11px]">-</span>
                              )}
                            </td>
                            <td className="p-2.5 font-mono text-slate-600 text-[11px]">
                              {row.dob || '-'}
                            </td>
                            <td className="p-2.5">
                              {row.isValid ? (
                                row.warnings.length > 0 ? (
                                  <div className="flex items-center gap-1 text-amber-700 text-[10px] font-bold" title={row.warnings.join(', ')}>
                                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-500" />
                                    <span>Warning</span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1 text-emerald-700 text-[10px] font-bold">
                                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
                                    <span>Halali</span>
                                  </div>
                                )
                              ) : (
                                <div className="flex items-center gap-1 text-rose-700 text-[10px] font-bold" title={row.errors.join(', ')}>
                                  <XCircle className="w-3.5 h-3.5 shrink-0 text-rose-500" />
                                  <span>Kosa: {row.errors[0]}</span>
                                </div>
                              )}
                            </td>
                            <td className="p-2.5 text-center">
                              <button
                                type="button"
                                onClick={() => setEditingRow(row)}
                                className="p-1 hover:bg-slate-200 rounded text-slate-600 hover:text-blue-600 transition cursor-pointer"
                                title="Hariri Rekodi Hii"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Skip invalid rows option */}
              <div className="flex items-center justify-between text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <label className="flex items-center gap-2 cursor-pointer font-bold">
                  <input
                    type="checkbox"
                    checked={skipInvalidRows}
                    onChange={e => setSkipInvalidRows(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-0 cursor-pointer"
                  />
                  <span>Ruka rekodi zenye makosa (Skip invalid rows automatically during import)</span>
                </label>
                <span className="text-slate-500">
                  {stats.selected} kati ya {stats.total} rekodi zitapelekwa Supabase.
                </span>
              </div>

            </div>
          )}

          {/* ======================================================== */}
          {/* STEP 4: IMPORT COMPLETED                                 */}
          {/* ======================================================== */}
          {currentStep === 4 && importedSummary && (
            <div className="py-8 text-center space-y-5 animate-in fade-in">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-10 h-10 text-emerald-600" />
              </div>

              <div>
                <h3 className="text-xl font-black text-slate-900">
                  Uingizaji Umekamilika Kikamilifu!
                </h3>
                <p className="text-xs text-slate-600 max-w-md mx-auto mt-1">
                  Wanafunzi {importedSummary.total} wameongezwa kwa mafanikio kwenye database ya Supabase na kuunganishwa kwenye mfumo.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3 max-w-md mx-auto">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[10px] text-slate-500 font-bold uppercase">Wavulana</div>
                  <div className="text-lg font-black text-blue-700">{importedSummary.boys}</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[10px] text-slate-500 font-bold uppercase">Wasichana</div>
                  <div className="text-lg font-black text-pink-700">{importedSummary.girls}</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[10px] text-slate-500 font-bold uppercase">Madarasa</div>
                  <div className="text-lg font-black text-slate-800">{importedSummary.classesCount}</div>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white font-black text-xs rounded-xl shadow-md transition cursor-pointer"
                >
                  Tazama Orodha ya Wanafunzi (View Students)
                </button>
                <button
                  type="button"
                  onClick={handleResetImport}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  Ingiza Faili Lingine (Import Another)
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer Controls */}
        {currentStep !== 4 && (
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
            <div>
              {currentStep > 1 && (
                <button
                  type="button"
                  onClick={() => setCurrentStep((currentStep - 1) as any)}
                  disabled={isImporting}
                  className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-xl border border-slate-300 flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Rudi Nyuma (Back)</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isImporting}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl transition cursor-pointer disabled:opacity-50"
              >
                Ghairi (Cancel)
              </button>

              {currentStep === 1 && (
                <button
                  type="button"
                  onClick={() => {
                    if (!selectedFile || rawRows.length === 0) {
                      setParsingError('Tafadhali chagua faili la Excel au CSV lenye data kwanza.');
                      return;
                    }
                    setCurrentStep(2);
                  }}
                  disabled={!selectedFile || rawRows.length === 0}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-black rounded-xl flex items-center gap-2 shadow-xs transition cursor-pointer disabled:opacity-50"
                >
                  <span>Endelea: Sawazisha Safu (Next)</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}

              {currentStep === 2 && (
                <button
                  type="button"
                  onClick={runDataValidation}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-black rounded-xl flex items-center gap-2 shadow-xs transition cursor-pointer"
                >
                  <span>Endelea: Hakiki Data (Validate)</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}

              {currentStep === 3 && (
                <button
                  type="button"
                  onClick={handleExecuteImport}
                  disabled={isImporting || stats.selected === 0}
                  className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 active:scale-95 text-white font-black rounded-xl flex items-center gap-2 shadow-md transition cursor-pointer disabled:opacity-50"
                >
                  {isImporting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-white" />
                      <span>Inahifadhi kwenye Supabase ({importProgress}%)...</span>
                    </>
                  ) : (
                    <>
                      <Database className="w-4 h-4 text-emerald-200" />
                      <span>Hifadhi Wanafunzi ({stats.selected}) Kwenye Database</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )}

      </div>

      {/* ======================================================== */}
      {/* INLINE EDIT RECORD MODAL                                 */}
      {/* ======================================================== */}
      {editingRow && (
        <div className="fixed inset-0 z-60 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-blue-600" />
                <span>Hariri Taarifa ya Mstari #{editingRow.originalIndex + 1}</span>
              </h4>
              <button 
                type="button" 
                onClick={() => setEditingRow(null)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Jina Kamili la Mwanafunzi *</label>
                <input
                  type="text"
                  value={editingRow.name}
                  onChange={e => setEditingRow({ ...editingRow, name: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Jinsi (Gender)</label>
                  <select
                    value={editingRow.gender}
                    onChange={e => setEditingRow({ ...editingRow, gender: e.target.value as any })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-bold"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Darasa (Class)</label>
                  <select
                    value={editingRow.className}
                    onChange={e => setEditingRow({ ...editingRow, className: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-bold"
                  >
                    {[...SECONDARY_CLASSES, ...PRIMARY_CLASSES, ...NURSERY_CLASSES].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Mkondo (Stream)</label>
                  <input
                    type="text"
                    value={editingRow.stream || ''}
                    onChange={e => setEditingRow({ ...editingRow, stream: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                    placeholder="e.g. Stream A"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Simu ya Mzazi</label>
                  <input
                    type="text"
                    value={editingRow.parentPhone || ''}
                    onChange={e => setEditingRow({ ...editingRow, parentPhone: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                    placeholder="0754XXXXXX"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Tarehe ya Kuzaliwa (YYYY-MM-DD)</label>
                <input
                  type="date"
                  value={editingRow.dob || ''}
                  onChange={e => setEditingRow({ ...editingRow, dob: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setEditingRow(null)}
                className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg cursor-pointer"
              >
                Ghairi
              </button>
              <button
                type="button"
                onClick={() => handleSaveEditedRow(editingRow)}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg cursor-pointer"
              >
                Hifadhi Mabadiliko
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
