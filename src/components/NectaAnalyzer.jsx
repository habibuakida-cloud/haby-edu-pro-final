import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { 
  FileSpreadsheet, 
  Download, 
  Database, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  RefreshCw, 
  FileText, 
  Users, 
  Award,
  ChevronRight,
  ClipboardCopy,
  Trash2,
  Upload
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

// Common NECTA Exam Types
const EXAM_TYPES = ['STNA', 'SFNA', 'PSLE', 'FTNA', 'CSEE', 'ACSEE'];

// Sample realistic NECTA data for quick testing
const SAMPLE_NECTA_DATA = `S0372/0001 F 22 III CIV - C HIST - C GEO - C KISW - D ENGL - C PHY - D CHEM - D BIO - C B/MATH - F
S0372/0002 F 24 III CIV - C HIST - D GEO - C KISW - C ENGL - C PHY - D CHEM - D BIO - D B/MATH - D
S0372/0003 M 16 II CIV - B HIST - B GEO - B KISW - B ENGL - B PHY - C CHEM - C BIO - B B/MATH - C
S0372/0004 M 12 I CIV - A HIST - A GEO - B KISW - A ENGL - A PHY - B CHEM - B BIO - A B/MATH - B
S0372/0005 F 28 IV CIV - D HIST - D GEO - D KISW - C ENGL - D PHY - F CHEM - F BIO - D B/MATH - F
S0372/0006 M 19 II CIV - B HIST - C GEO - B KISW - B ENGL - C PHY - C CHEM - C BIO - B B/MATH - D
S0372/0007 F 15 I CIV - B HIST - A GEO - B KISW - A ENGL - B PHY - C CHEM - B BIO - B B/MATH - C
S0372/0008 M 27 IV CIV - D HIST - D GEO - D KISW - C ENGL - D PHY - F CHEM - D BIO - D B/MATH - F
S0372/0009 F 30 IV CIV - D HIST - F GEO - D KISW - D ENGL - D PHY - F CHEM - F BIO - D B/MATH - F
S0372/0010 M 34 0 CIV - F HIST - F GEO - F KISW - D ENGL - F PHY - F CHEM - F BIO - F B/MATH - F
S0372/0011 M 14 I CIV - A HIST - B GEO - B KISW - A ENGL - A PHY - B CHEM - B BIO - B B/MATH - C
S0372/0012 F 21 III CIV - C HIST - C GEO - C KISW - B ENGL - C PHY - D CHEM - C BIO - C B/MATH - D`;

export default function NectaAnalyzer({ schoolId = 'DEMO_SCHOOL' }) {
  const [inputText, setInputText] = useState('');
  const [importMethod, setImportMethod] = useState('text'); // 'text' or 'csv'
  const [selectedExamType, setSelectedExamType] = useState('CSEE');
  const [examYear, setExamYear] = useState(new Date().getFullYear().toString());
  const [activeTab, setActiveTab] = useState('raw'); // 'raw', 'grades', 'division'
  const [parsedData, setParsedData] = useState([]);
  const [subjectsList, setSubjectsList] = useState([]);
  const [saveStatus, setSaveStatus] = useState(null); // { type: 'success' | 'error', message: string }
  const [isSavingToDb, setIsSavingToDb] = useState(false);

  // Download a CSV Template for quick batch importing
  const handleDownloadTemplate = () => {
    const csvContent = "CNO,SEX,AGGT,DIV,CIV,HIST,GEO,KISW,ENGL,PHY,CHEM,BIO,B/MATH\n"
      + "S0372/0001,F,22,III,C,C,C,D,C,D,D,C,F\n"
      + "S0372/0002,F,24,III,C,D,C,C,C,D,D,D,D\n"
      + "S0372/0003,M,16,II,B,B,B,B,B,C,C,B,C\n"
      + "S0372/0004,M,12,I,A,A,B,A,A,B,B,A,B\n"
      + "S0372/0005,F,28,IV,D,D,D,C,D,F,F,D,F\n";
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "NECTA_IMPORT_TEMPLATE.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle CSV/Excel File Upload and Parse
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setSaveStatus(null);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 }); // read as array of arrays

        if (data.length < 2) {
          alert('Faili halina data ya kutosha. Hakikisha kuna mstari wa kichwa (header) na angalau mstari mmoja wa data.');
          return;
        }

        // Parse rows and columns
        const headers = data[0].map(h => String(h || '').trim().toUpperCase());
        
        // Find indices for standard columns
        const cnoIdx = headers.findIndex(h => h.includes('CNO') || h.includes('CANDIDATE') || h.includes('NUMBER') || h.includes('MTAHINIWA') || h.includes('REG'));
        const sexIdx = headers.findIndex(h => h.includes('SEX') || h.includes('GENDER') || h.includes('JINSIA') || h === 'F/M' || h === 'M/F');
        const aggtIdx = headers.findIndex(h => h.includes('AGGT') || h.includes('AGG') || h.includes('POINTS') || h.includes('ALAMA') || h.includes('POINT'));
        const divIdx = headers.findIndex(h => h.includes('DIV') || h.includes('DIVISION') || h.includes('DARAJA') || h === 'DIV_RESULT');

        if (cnoIdx === -1) {
          alert('Haikuweza kupata safu ya Candidate Number (CNO) kwenye faili lako. Hakikisha kichwa kina neno "CNO" au "Candidate Number".');
          return;
        }

        const parsedRows = [];
        const subjectsSet = new Set();

        const structuralIndices = [cnoIdx, sexIdx, aggtIdx, divIdx].filter(idx => idx !== -1);
        const subjectCols = []; // { index, name }
        
        headers.forEach((h, idx) => {
          if (!structuralIndices.includes(idx) && h && !['NAME', 'STUDENT NAME', 'JINA', 'YEAR', 'MWAKA', 'SCHOOL', 'SHULE', 'ID'].includes(h)) {
            let subj = h;
            if (subj === 'BMATH' || subj === 'BASIC MATH' || subj === 'BASIC MATHEMATICS') subj = 'B/MATH';
            if (subj === 'ENGLISH' || subj === 'ENG') subj = 'ENGL';
            if (subj === 'KISWAHILI') subj = 'KISW';
            if (subj === 'HISTORY') subj = 'HIST';
            if (subj === 'GEOGRAPHY') subj = 'GEO';
            if (subj === 'PHYSICS') subj = 'PHY';
            if (subj === 'CHEMISTRY') subj = 'CHEM';
            if (subj === 'BIOLOGY') subj = 'BIO';
            if (subj === 'CIVICS') subj = 'CIV';

            subjectCols.push({ index: idx, name: subj });
          }
        });

        for (let i = 1; i < data.length; i++) {
          const row = data[i];
          if (!row || row.length === 0) continue;

          const cno = String(row[cnoIdx] || '').trim().toUpperCase();
          if (!cno) continue; // skip empty rows

          let sex = sexIdx !== -1 ? String(row[sexIdx] || '').trim().toUpperCase() : 'M';
          if (sex === 'FEMALE' || sex === 'KIKE' || sex === 'F') sex = 'F';
          else if (sex === 'MALE' || sex === 'KIUME' || sex === 'M') sex = 'M';
          else sex = 'M';

          const aggt = aggtIdx !== -1 ? String(row[aggtIdx] || '').trim() : '-';
          let div = divIdx !== -1 ? String(row[divIdx] || '').trim().toUpperCase() : '-';

          // Subject/grade resolution
          const subjects = {};
          subjectCols.forEach(col => {
            const val = String(row[col.index] || '').trim().toUpperCase();
            if (val && val !== '-' && val !== '') {
              subjects[col.name] = val;
              subjectsSet.add(col.name);
            }
          });

          parsedRows.push({
            cno,
            sex,
            aggt,
            div,
            subjects
          });
        }

        if (parsedRows.length === 0) {
          alert('Hakuna watahiniwa waliopatikana kwenye faili la CSV/Excel.');
          return;
        }

        // Preserve order
        const coreOrder = ['CIV', 'HIST', 'GEO', 'KISW', 'ENGL', 'PHY', 'CHEM', 'BIO', 'B/MATH'];
        const otherSubjects = Array.from(subjectsSet).filter(s => !coreOrder.includes(s)).sort();
        const orderedSubjects = [
          ...coreOrder.filter(s => subjectsSet.has(s)),
          ...otherSubjects
        ];

        setSubjectsList(orderedSubjects);
        setParsedData(parsedRows);
        setSaveStatus({
          type: 'success',
          message: `Watahiniwa ${parsedRows.length} wameingizwa na kuchakatwa kutoka kwenye faili la CSV/Excel kikamilifu! Masomo yaliyotambuliwa: ${orderedSubjects.length}`
        });

      } catch (err) {
        console.error('Error importing CSV/Excel:', err);
        alert('Hitilafu wakati wa kusoma faili: ' + err.message);
      }
    };
    reader.readAsBinaryString(file);
  };

  // Parse NECTA Text
  const handleParse = () => {
    setSaveStatus(null);
    if (!inputText.trim()) {
      alert('Tafadhali weka data ya NECTA kwenye sanduku la maandishi.');
      return;
    }

    const lines = inputText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const parsedRows = [];
    const subjectsSet = new Set();

    // Standard NECTA subject code aliases to ensure consistent columns
    for (let line of lines) {
      // Look for Candidate Number (e.g., S0372/0001, P0372/0001, PS0102034/001, etc.)
      const cnoMatch = line.match(/([A-Za-z0-9_.-]+\/\d+)/i);
      if (!cnoMatch) continue;

      const cno = cnoMatch[1].toUpperCase();
      const afterCno = line.slice(line.indexOf(cno) + cno.length).trim();

      // Split remainder into tokens
      // Pattern: SEX AGGT DIV [SUBJECT - GRADE pairs...]
      // Example 1: F 22 III CIV - C HIST - C ...
      // Example 2: S0372/0001 F 22 III CIV - 'C' ...
      const tokens = afterCno.split(/\s+/);
      if (tokens.length < 3) continue;

      // Extract SEX, AGGT, DIV (take as is, no calculation)
      let sex = tokens[0].toUpperCase();
      if (sex === 'FEMALE') sex = 'F';
      if (sex === 'MALE') sex = 'M';

      let aggt = tokens[1];
      let div = tokens[2].toUpperCase();

      // If tokens order is slightly different (e.g. SEX then name then AGGT DIV)
      // Extract subject pairs from the entire line after DIV
      const subjectIndex = afterCno.indexOf(div);
      const subjectsPart = subjectIndex !== -1 ? afterCno.slice(subjectIndex + div.length) : afterCno;

      // Regex to find all: SUBJECT - GRADE pairs
      // Examples: CIV - C, B/MATH - 'F', KISW - D, G/STUDIES - 'E', PHY - C
      const subjectRegex = /([A-Za-z0-9/.\s]+?)\s*[-:]\s*['"]?([A-Fa-fSs])['"]?(?=\s+[A-Za-z0-9/.]+\s*[-:]|\s*$)/g;
      
      const subjects = {};
      let match;
      while ((match = subjectRegex.exec(subjectsPart)) !== null) {
        let subj = match[1].trim().toUpperCase();
        // Remove trailing hyphens or symbols
        subj = subj.replace(/^[-/\s]+|[-/\s]+$/g, '');
        // Canonical name cleanup
        if (subj === 'BMATH' || subj === 'BASIC MATH') subj = 'B/MATH';
        if (subj === 'ENGLISH' || subj === 'ENG') subj = 'ENGL';
        if (subj === 'KISWAHILI') subj = 'KISW';
        if (subj === 'HISTORY') subj = 'HIST';
        if (subj === 'GEOGRAPHY') subj = 'GEO';
        if (subj === 'PHYSICS') subj = 'PHY';
        if (subj === 'CHEMISTRY') subj = 'CHEM';
        if (subj === 'BIOLOGY') subj = 'BIO';
        if (subj === 'CIVICS') subj = 'CIV';

        const grade = match[2].trim().toUpperCase();
        if (subj && grade) {
          subjects[subj] = grade;
          subjectsSet.add(subj);
        }
      }

      parsedRows.push({
        cno,
        sex,
        aggt,
        div,
        subjects
      });
    }

    if (parsedRows.length === 0) {
      alert('Hakuna watahiniwa waliopatikana. Hakikisha muundo wa data: "S0372/0001 F 22 III CIV - C HIST - C..."');
      return;
    }

    // Preserve natural subject ordering: Core subjects first, then others
    const coreOrder = ['CIV', 'HIST', 'GEO', 'KISW', 'ENGL', 'PHY', 'CHEM', 'BIO', 'B/MATH'];
    const otherSubjects = Array.from(subjectsSet).filter(s => !coreOrder.includes(s)).sort();
    const orderedSubjects = [
      ...coreOrder.filter(s => subjectsSet.has(s)),
      ...otherSubjects
    ];

    setSubjectsList(orderedSubjects);
    setParsedData(parsedRows);
    setSaveStatus({
      type: 'success',
      message: `Watahiniwa ${parsedRows.length} wamechakatwa kikamilifu! Masomo yaliyotambuliwa: ${orderedSubjects.length}`
    });
  };

  // TASK 2: GRADE ANALYSIS BY GENDER WISE (MOST IMPORTANT)
  // Headers: SUBJECT | A | A_M | A_F | B | B_M | B_F | C | C_M | C_F | D | D_M | D_F | E | E_M | E_F | F | F_M | F_F | TOTAL
  const gradeAnalysisData = useMemo(() => {
    if (!parsedData.length || !subjectsList.length) return [];

    return subjectsList.map(subject => {
      let A = 0, A_M = 0, A_F = 0;
      let B = 0, B_M = 0, B_F = 0;
      let C = 0, C_M = 0, C_F = 0;
      let D = 0, D_M = 0, D_F = 0;
      let E = 0, E_M = 0, E_F = 0;
      let F = 0, F_M = 0, F_F = 0;

      for (const row of parsedData) {
        const grade = row.subjects[subject];
        if (!grade) continue;

        const isMale = row.sex === 'M';
        const isFemale = row.sex === 'F';

        if (grade === 'A') {
          A++;
          if (isMale) A_M++;
          if (isFemale) A_F++;
        } else if (grade === 'B') {
          B++;
          if (isMale) B_M++;
          if (isFemale) B_F++;
        } else if (grade === 'C') {
          C++;
          if (isMale) C_M++;
          if (isFemale) C_F++;
        } else if (grade === 'D') {
          D++;
          if (isMale) D_M++;
          if (isFemale) D_F++;
        } else if (grade === 'E') {
          E++;
          if (isMale) E_M++;
          if (isFemale) E_F++;
        } else if (grade === 'F') {
          F++;
          if (isMale) F_M++;
          if (isFemale) F_F++;
        }
      }

      const total = A + B + C + D + E + F;

      return {
        subject,
        A, A_M, A_F,
        B, B_M, B_F,
        C, C_M, C_F,
        D, D_M, D_F,
        E, E_M, E_F,
        F, F_M, F_F,
        total
      };
    });
  }, [parsedData, subjectsList]);

  // TASK 3: DIVISION SUMMARY
  // Headers: SEX | I | II | III | IV | 0 | TOTAL
  // Rows: F, M, T
  const divisionSummaryData = useMemo(() => {
    if (!parsedData.length) return [];

    const stats = {
      F: { 'I': 0, 'II': 0, 'III': 0, 'IV': 0, '0': 0, total: 0 },
      M: { 'I': 0, 'II': 0, 'III': 0, 'IV': 0, '0': 0, total: 0 },
      T: { 'I': 0, 'II': 0, 'III': 0, 'IV': 0, '0': 0, total: 0 }
    };

    for (const row of parsedData) {
      const sex = (row.sex === 'M' || row.sex === 'F') ? row.sex : 'M';
      let div = row.div.toUpperCase();

      // Normalization of Roman Divisions
      if (div === '1') div = 'I';
      if (div === '2') div = 'II';
      if (div === '3') div = 'III';
      if (div === '4') div = 'IV';
      if (div === 'O') div = '0'; // Letter O to Zero

      if (['I', 'II', 'III', 'IV', '0'].includes(div)) {
        stats[sex][div]++;
        stats[sex].total++;
        stats.T[div]++;
        stats.T.total++;
      } else {
        // Fallback for non-standard or missing (count in 0 or other)
        stats[sex]['0']++;
        stats[sex].total++;
        stats.T['0']++;
        stats.T.total++;
      }
    }

    return [
      { sex: 'F', ...stats.F },
      { sex: 'M', ...stats.M },
      { sex: 'T', ...stats.T }
    ];
  }, [parsedData]);

  // EXPORT NECTA_ANALYSIS.xlsx WITH 3 SHEETS, BORDERS, BOLD HEADERS
  const handleExportExcel = () => {
    if (!parsedData.length) {
      alert('Hakuna data ya kuhamisha! Chakata data kwanza.');
      return;
    }

    try {
      const wb = XLSX.utils.book_new();

      // 1. SHEET 1: "RAW DATA"
      // Columns: CNO | SEX | AGGT | DIV | CIV | HIST | GEO | KISW | ENGL | PHY | CHEM | BIO | B/MATH | etc
      const sheet1Headers = ['CNO', 'SEX', 'AGGT', 'DIV', ...subjectsList];
      const sheet1Rows = parsedData.map(row => [
        row.cno,
        row.sex,
        row.aggt,
        row.div,
        ...subjectsList.map(subj => row.subjects[subj] || '-')
      ]);

      const ws1Data = [sheet1Headers, ...sheet1Rows];
      const ws1 = XLSX.utils.aoa_to_sheet(ws1Data);

      // Auto-width for Sheet 1
      ws1['!cols'] = [
        { wch: 14 }, // CNO
        { wch: 6 },  // SEX
        { wch: 8 },  // AGGT
        { wch: 8 },  // DIV
        ...subjectsList.map(() => ({ wch: 8 }))
      ];

      XLSX.utils.book_append_sheet(wb, ws1, 'RAW DATA');

      // 2. SHEET 2: "GRADE ANALYSIS"
      // SUBJECT | A | A_M | A_F | B | B_M | B_F | C | C_M | C_F | D | D_M | D_F | E | E_M | E_F | F | F_M | F_F | TOTAL
      const sheet2Headers = [
        'SUBJECT',
        'A', 'A_M', 'A_F',
        'B', 'B_M', 'B_F',
        'C', 'C_M', 'C_F',
        'D', 'D_M', 'D_F',
        'E', 'E_M', 'E_F',
        'F', 'F_M', 'F_F',
        'TOTAL'
      ];

      const sheet2Rows = gradeAnalysisData.map(r => [
        r.subject,
        r.A, r.A_M, r.A_F,
        r.B, r.B_M, r.B_F,
        r.C, r.C_M, r.C_F,
        r.D, r.D_M, r.D_F,
        r.E, r.E_M, r.E_F,
        r.F, r.F_M, r.F_F,
        r.total
      ]);

      const ws2Data = [sheet2Headers, ...sheet2Rows];
      const ws2 = XLSX.utils.aoa_to_sheet(ws2Data);

      // Auto-width for Sheet 2
      ws2['!cols'] = [
        { wch: 12 }, // SUBJECT
        ...Array(18).fill({ wch: 6 }), // A to F_F
        { wch: 9 }   // TOTAL
      ];

      XLSX.utils.book_append_sheet(wb, ws2, 'GRADE ANALYSIS');

      // 3. SHEET 3: "DIVISION SUMMARY"
      // SEX | I | II | III | IV | 0 | TOTAL
      const sheet3Headers = ['SEX', 'I', 'II', 'III', 'IV', '0', 'TOTAL'];
      const sheet3Rows = divisionSummaryData.map(r => [
        r.sex,
        r['I'],
        r['II'],
        r['III'],
        r['IV'],
        r['0'],
        r.total
      ]);

      const ws3Data = [sheet3Headers, ...sheet3Rows];
      const ws3 = XLSX.utils.aoa_to_sheet(ws3Data);

      // Auto-width for Sheet 3
      ws3['!cols'] = [
        { wch: 8 },  // SEX
        { wch: 8 },  // I
        { wch: 8 },  // II
        { wch: 8 },  // III
        { wch: 8 },  // IV
        { wch: 8 },  // 0
        { wch: 10 }  // TOTAL
      ];

      XLSX.utils.book_append_sheet(wb, ws3, 'DIVISION SUMMARY');

      // Write and download file
      XLSX.writeFile(wb, 'NECTA_ANALYSIS.xlsx');

      setSaveStatus({
        type: 'success',
        message: 'Faili la "NECTA_ANALYSIS.xlsx" lenye kurasa 3 limepakuliwa kikamilifu!'
      });
    } catch (err) {
      console.error('Error generating Excel file:', err);
      alert('Hitilafu wakati wa kuunda faili la Excel: ' + err.message);
    }
  };

  // SAVE TO SUPABASE/FIRESTORE TABLE "exam_records"
  const handleSaveToExamRecords = async () => {
    if (!parsedData.length) {
      alert('Hakuna data ya kuhifadhi! Chakata data kwanza.');
      return;
    }

    setIsSavingToDb(true);
    setSaveStatus(null);

    try {
      console.log('Current school_id (Saving exam_records):', schoolId);

      const recordsToInsert = parsedData.map(item => ({
        school_id: schoolId,
        student_cno: item.cno,
        student_name: item.cno, // Default name to CNO if not available in NECTA string
        sex: item.sex,
        class_level: selectedExamType === 'CSEE' ? 'Form 4' : selectedExamType === 'FTNA' ? 'Form 2' : selectedExamType === 'ACSEE' ? 'Form 6' : selectedExamType === 'PSLE' ? 'Standard 7' : 'Standard 4',
        exam_type: selectedExamType,
        term: 'NECTA National Exam',
        AGGT: item.aggt,
        DIV: item.div,
        subjects_json: item.subjects,
        year: examYear
      }));

      const res = await supabase.from('exam_records').insert(recordsToInsert);
      if (res.error) {
        throw res.error;
      }

      setSaveStatus({
        type: 'success',
        message: `Hongera! Rekodi ${recordsToInsert.length} za mtihani wa ${selectedExamType} ${examYear} zimehifadhiwa kikamilifu kwenye jedwali la "exam_records". Sasa unaweza kutuma matokeo kwa wazazi kupitia SMS Module!`
      });
    } catch (err) {
      console.error('Error saving to exam_records:', err);
      setSaveStatus({
        type: 'error',
        message: 'Hitilafu wakati wa kuhifadhi data kwenye database: ' + (err.message || 'Unknown error')
      });
    } finally {
      setIsSavingToDb(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-2xl p-6 text-white shadow-md border border-blue-800/40">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold border border-blue-400/30">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Official NECTA National Results Parser & Analyzer</span>
            </div>
            <h2 className="text-2xl font-black tracking-tight flex items-center gap-2 text-white">
              <span>NECTA Analyzer With Grade Count By Gender</span>
            </h2>
            <p className="text-xs text-blue-200/90 max-w-2xl">
              Chakata matokeo yote ya NECTA (STNA, SFNA, PSLE, FTNA, CSEE, ACSEE). Tengeneza ripoti 3 za Excel (Raw Data, Grade Analysis by Gender, na Division Summary) na uhifadhi moja kwa moja kwenye jedwali la <span className="font-mono bg-blue-950 px-1 py-0.5 rounded text-amber-300">exam_records</span>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setInputText(SAMPLE_NECTA_DATA)}
              className="px-3 py-2 text-xs font-semibold bg-white/10 hover:bg-white/20 text-white rounded-xl transition border border-white/20 flex items-center gap-1.5"
            >
              <ClipboardCopy className="w-4 h-4 text-amber-300" />
              <span>Weka Sample Data</span>
            </button>
            <button
              onClick={() => { setInputText(''); setParsedData([]); setSaveStatus(null); }}
              className="px-3 py-2 text-xs font-semibold bg-white/10 hover:bg-red-500/30 text-white rounded-xl transition border border-white/20 flex items-center gap-1.5"
            >
              <Trash2 className="w-4 h-4 text-red-300" />
              <span>Futa</span>
            </button>
          </div>
        </div>

        {/* Configuration Bar */}
        <div className="mt-5 pt-4 border-t border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-[11px] font-bold text-blue-200 block mb-1 uppercase">Aina ya Mtihani (Exam Type)</label>
            <select
              value={selectedExamType}
              onChange={e => setSelectedExamType(e.target.value)}
              className="w-full bg-slate-900/90 border border-blue-500/40 rounded-xl px-3 py-2 text-xs text-white font-semibold focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              {EXAM_TYPES.map(type => (
                <option key={type} value={type}>{type} (Mtihani wa Taifa)</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-bold text-blue-200 block mb-1 uppercase">Mwaka wa Mtihani (Exam Year)</label>
            <input
              type="number"
              value={examYear}
              onChange={e => setExamYear(e.target.value)}
              className="w-full bg-slate-900/90 border border-blue-500/40 rounded-xl px-3 py-2 text-xs text-white font-semibold focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="e.g. 2024"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-blue-200 block mb-1 uppercase">Kitambulisho cha Shule (School ID)</label>
            <div className="px-3 py-2 bg-slate-900/70 border border-white/10 rounded-xl text-xs font-mono font-bold text-amber-300 truncate">
              {schoolId}
            </div>
          </div>
        </div>
      </div>

      {/* Import Methods Selector */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="flex border-b border-slate-200 bg-slate-50">
          <button
            type="button"
            onClick={() => setImportMethod('text')}
            className={`flex items-center gap-2 px-6 py-3 font-bold text-xs transition-colors border-b-2 ${
              importMethod === 'text'
                ? 'border-blue-600 text-blue-600 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-4.5 h-4.5" />
            <span>Njia ya 1: Bandika Nakala (Paste Raw Text)</span>
          </button>
          <button
            type="button"
            onClick={() => setImportMethod('csv')}
            className={`flex items-center gap-2 px-6 py-3 font-bold text-xs transition-colors border-b-2 ${
              importMethod === 'csv'
                ? 'border-blue-600 text-blue-600 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileSpreadsheet className="w-4.5 h-4.5" />
            <span>Njia ya 2: Pakia Faili la CSV / Excel (Batch Upload)</span>
          </button>
        </div>

        <div className="p-6 space-y-4">
          {importMethod === 'text' ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span>Bandika Matokeo ya NECTA Hapa</span>
                </label>
                <span className="text-xs text-slate-500 font-medium">
                  Muundo: <span className="font-mono text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">S0372/0001 F 22 III CIV - C HIST - C...</span>
                </span>
              </div>

              <textarea
                rows={7}
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                placeholder="Bandika mistari ya matokeo ya NECTA hapa...
Mfano:
S0372/0001 F 22 III CIV - C HIST - C GEO - C KISW - D ENGL - C PHY - D CHEM - D BIO - C B/MATH - F
S0372/0002 F 24 III CIV - C HIST - D GEO - C KISW - C ENGL - C PHY - D CHEM - D BIO - D B/MATH - D"
                className="w-full font-mono text-xs p-3.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 placeholder-slate-400"
              />

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleParse}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Chakata Maandishi (Parse Text)</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-blue-50/50 rounded-xl border border-blue-100">
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider">Kielezo cha Kupakia Alama (CSV Import Format)</h4>
                  <p className="text-[11px] text-blue-700 leading-relaxed max-w-2xl">
                    Pakia faili la Excel au CSV lenye safu zenye vichwa: <strong className="font-mono bg-blue-150 px-1 py-0.5 rounded text-blue-900">CNO</strong>, <strong className="font-mono bg-blue-150 px-1 py-0.5 rounded text-blue-900">SEX</strong>, <strong className="font-mono bg-blue-150 px-1 py-0.5 rounded text-blue-900">AGGT</strong>, <strong className="font-mono bg-blue-150 px-1 py-0.5 rounded text-blue-900">DIV</strong> na safu za masomo (k.m. CIV, HIST, GEO, KISW, ENGL, nk.) zikiwa na madaraja (A, B, C, D, F).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-lg transition shrink-0 flex items-center gap-1.5 shadow-sm"
                >
                  <Download className="w-3.5 h-3.5 text-amber-400" />
                  <span>Pakua Kiolezo (CSV Template)</span>
                </button>
              </div>

              <div className="border-2 border-dashed border-slate-300 rounded-2xl p-8 hover:border-blue-500 hover:bg-blue-50/5 transition-all flex flex-col items-center justify-center text-center space-y-3 relative group">
                <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                  <Upload className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-800">Bofya hapa au buruta faili la CSV au Excel hapa</p>
                  <p className="text-[11px] text-slate-500">Mwisho wa ukubwa wa faili ni MB 10 (.csv, .xlsx, .xls)</p>
                </div>
                <input
                  type="file"
                  accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                  onChange={handleFileUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
              </div>
            </div>
          )}

          {/* Action buttons shown once data is parsed */}
          {parsedData.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportExcel}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Pakua NECTA_ANALYSIS.xlsx</span>
                </button>
              </div>

              <button
                type="button"
                onClick={handleSaveToExamRecords}
                disabled={isSavingToDb}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-2"
              >
                <Database className="w-4 h-4" />
                <span>{isSavingToDb ? 'Inahifadhi...' : 'Hifadhi kwenye Database (exam_records)'}</span>
              </button>
            </div>
          )}

          {/* Notifications */}
          {saveStatus && (
            <div className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center gap-2 mt-3 ${
              saveStatus.type === 'success' 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                : 'bg-red-50 border-red-200 text-red-800'
            }`}>
              {saveStatus.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              )}
              <span>{saveStatus.message}</span>
            </div>
          )}
        </div>
      </div>

      {/* Parsed Results Presentation */}
      {parsedData.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden space-y-4 p-6">
          {/* Tabs */}
          <div className="flex flex-wrap items-center justify-between border-b border-slate-200 pb-3 gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('raw')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  activeTab === 'raw' 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>SHEET 1: RAW DATA ({parsedData.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('grades')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  activeTab === 'grades' 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Award className="w-3.5 h-3.5" />
                <span>SHEET 2: GRADE ANALYSIS (Gender-Wise)</span>
              </button>

              <button
                onClick={() => setActiveTab('division')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  activeTab === 'division' 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>SHEET 3: DIVISION SUMMARY</span>
              </button>
            </div>

            <div className="text-xs text-slate-500 font-medium">
              Mtihani: <span className="font-bold text-slate-900">{selectedExamType} {examYear}</span>
            </div>
          </div>

          {/* TAB 1: RAW DATA */}
          {activeTab === 'raw' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-600 font-medium">
                <span>Muhtasari wa watahiniwa wote waliotambuliwa na alama zao kwa kila somo:</span>
                <span>Jumla: <strong className="text-slate-900 font-bold">{parsedData.length}</strong></span>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
                      <th className="px-3 py-2.5 border-r border-slate-200">CNO</th>
                      <th className="px-3 py-2.5 border-r border-slate-200 text-center">SEX</th>
                      <th className="px-3 py-2.5 border-r border-slate-200 text-center">AGGT</th>
                      <th className="px-3 py-2.5 border-r border-slate-200 text-center">DIV</th>
                      {subjectsList.map(subj => (
                        <th key={subj} className="px-3 py-2.5 border-r border-slate-200 text-center font-bold">
                          {subj}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parsedData.map((row, idx) => (
                      <tr key={idx} className="hover:bg-blue-50/50 font-mono">
                        <td className="px-3 py-2 font-bold text-slate-900 border-r border-slate-200">
                          {row.cno}
                        </td>
                        <td className="px-3 py-2 text-center border-r border-slate-200 font-semibold">
                          <span className={`px-2 py-0.5 rounded text-[11px] ${
                            row.sex === 'F' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {row.sex}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-center border-r border-slate-200 text-slate-700 font-bold">
                          {row.aggt}
                        </td>
                        <td className="px-3 py-2 text-center border-r border-slate-200 font-bold">
                          <span className={`px-2 py-0.5 rounded text-[11px] ${
                            row.div === 'I' ? 'bg-emerald-100 text-emerald-800' :
                            row.div === 'II' ? 'bg-blue-100 text-blue-800' :
                            row.div === 'III' ? 'bg-amber-100 text-amber-800' :
                            row.div === 'IV' ? 'bg-orange-100 text-orange-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {row.div}
                          </span>
                        </td>
                        {subjectsList.map(subj => {
                          const gr = row.subjects[subj] || '-';
                          return (
                            <td key={subj} className="px-3 py-2 text-center border-r border-slate-200 font-bold">
                              <span className={
                                gr === 'A' ? 'text-emerald-700 font-black' :
                                gr === 'B' ? 'text-blue-700 font-bold' :
                                gr === 'C' ? 'text-teal-700 font-bold' :
                                gr === 'D' ? 'text-amber-700' :
                                gr === 'F' ? 'text-red-600 font-bold' : 'text-slate-400'
                              }>
                                {gr}
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: GRADE ANALYSIS BY GENDER WISE (MOST IMPORTANT) */}
          {activeTab === 'grades' && (
            <div className="space-y-3">
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 text-xs text-indigo-900">
                <strong>Ripoti Kuu ya Madaraja kwa Jinsia (Grade By Gender Analysis):</strong> Inaonyesha idadi ya watahiniwa waliopata madaraja ya A, B, C, D, E, F kwa jinsia ya Kiume (M) na Kike (F) kwa kila somo.
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-xs text-center border-collapse">
                  <thead>
                    <tr className="bg-slate-800 text-white font-bold uppercase tracking-wider text-[11px]">
                      <th rowSpan={2} className="px-3 py-2.5 text-left border-r border-slate-700">SUBJECT</th>
                      <th colSpan={3} className="px-3 py-1.5 border-r border-slate-700 bg-emerald-900/60">GRADE A</th>
                      <th colSpan={3} className="px-3 py-1.5 border-r border-slate-700 bg-blue-900/60">GRADE B</th>
                      <th colSpan={3} className="px-3 py-1.5 border-r border-slate-700 bg-teal-900/60">GRADE C</th>
                      <th colSpan={3} className="px-3 py-1.5 border-r border-slate-700 bg-amber-900/60">GRADE D</th>
                      <th colSpan={3} className="px-3 py-1.5 border-r border-slate-700 bg-orange-900/60">GRADE E</th>
                      <th colSpan={3} className="px-3 py-1.5 border-r border-slate-700 bg-rose-900/60">GRADE F</th>
                      <th rowSpan={2} className="px-4 py-2.5 bg-slate-900">TOTAL</th>
                    </tr>
                    <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-[10px]">
                      {/* A */}
                      <th className="px-2 py-1 border-r border-slate-200 bg-emerald-50 text-emerald-950 font-black">A</th>
                      <th className="px-2 py-1 border-r border-slate-200 bg-emerald-50 text-blue-700">A_M</th>
                      <th className="px-2 py-1 border-r border-slate-200 bg-emerald-50 text-pink-700">A_F</th>
                      {/* B */}
                      <th className="px-2 py-1 border-r border-slate-200 bg-blue-50 text-blue-950 font-black">B</th>
                      <th className="px-2 py-1 border-r border-slate-200 bg-blue-50 text-blue-700">B_M</th>
                      <th className="px-2 py-1 border-r border-slate-200 bg-blue-50 text-pink-700">B_F</th>
                      {/* C */}
                      <th className="px-2 py-1 border-r border-slate-200 bg-teal-50 text-teal-950 font-black">C</th>
                      <th className="px-2 py-1 border-r border-slate-200 bg-teal-50 text-blue-700">C_M</th>
                      <th className="px-2 py-1 border-r border-slate-200 bg-teal-50 text-pink-700">C_F</th>
                      {/* D */}
                      <th className="px-2 py-1 border-r border-slate-200 bg-amber-50 text-amber-950 font-black">D</th>
                      <th className="px-2 py-1 border-r border-slate-200 bg-amber-50 text-blue-700">D_M</th>
                      <th className="px-2 py-1 border-r border-slate-200 bg-amber-50 text-pink-700">D_F</th>
                      {/* E */}
                      <th className="px-2 py-1 border-r border-slate-200 bg-orange-50 text-orange-950 font-black">E</th>
                      <th className="px-2 py-1 border-r border-slate-200 bg-orange-50 text-blue-700">E_M</th>
                      <th className="px-2 py-1 border-r border-slate-200 bg-orange-50 text-pink-700">E_F</th>
                      {/* F */}
                      <th className="px-2 py-1 border-r border-slate-200 bg-rose-50 text-rose-950 font-black">F</th>
                      <th className="px-2 py-1 border-r border-slate-200 bg-rose-50 text-blue-700">F_M</th>
                      <th className="px-2 py-1 border-r border-slate-200 bg-rose-50 text-pink-700">F_F</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {gradeAnalysisData.map(r => (
                      <tr key={r.subject} className="hover:bg-slate-50">
                        <td className="px-3 py-2 text-left font-black text-slate-900 border-r border-slate-200 font-sans">
                          {r.subject}
                        </td>
                        {/* A */}
                        <td className="px-2 py-2 font-black text-emerald-800 bg-emerald-50/40 border-r border-slate-200">{r.A}</td>
                        <td className="px-2 py-2 text-blue-700 border-r border-slate-200">{r.A_M}</td>
                        <td className="px-2 py-2 text-pink-700 border-r border-slate-200">{r.A_F}</td>
                        {/* B */}
                        <td className="px-2 py-2 font-black text-blue-800 bg-blue-50/40 border-r border-slate-200">{r.B}</td>
                        <td className="px-2 py-2 text-blue-700 border-r border-slate-200">{r.B_M}</td>
                        <td className="px-2 py-2 text-pink-700 border-r border-slate-200">{r.B_F}</td>
                        {/* C */}
                        <td className="px-2 py-2 font-black text-teal-800 bg-teal-50/40 border-r border-slate-200">{r.C}</td>
                        <td className="px-2 py-2 text-blue-700 border-r border-slate-200">{r.C_M}</td>
                        <td className="px-2 py-2 text-pink-700 border-r border-slate-200">{r.C_F}</td>
                        {/* D */}
                        <td className="px-2 py-2 font-black text-amber-800 bg-amber-50/40 border-r border-slate-200">{r.D}</td>
                        <td className="px-2 py-2 text-blue-700 border-r border-slate-200">{r.D_M}</td>
                        <td className="px-2 py-2 text-pink-700 border-r border-slate-200">{r.D_F}</td>
                        {/* E */}
                        <td className="px-2 py-2 font-black text-orange-800 bg-orange-50/40 border-r border-slate-200">{r.E}</td>
                        <td className="px-2 py-2 text-blue-700 border-r border-slate-200">{r.E_M}</td>
                        <td className="px-2 py-2 text-pink-700 border-r border-slate-200">{r.E_F}</td>
                        {/* F */}
                        <td className="px-2 py-2 font-black text-red-700 bg-rose-50/40 border-r border-slate-200">{r.F}</td>
                        <td className="px-2 py-2 text-blue-700 border-r border-slate-200">{r.F_M}</td>
                        <td className="px-2 py-2 text-pink-700 border-r border-slate-200">{r.F_F}</td>
                        {/* TOTAL */}
                        <td className="px-3 py-2 font-black text-slate-900 bg-slate-100">{r.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: DIVISION SUMMARY */}
          {activeTab === 'division' && (
            <div className="space-y-4 max-w-2xl">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-900">
                <strong>Jedwali la Muhtasari wa Madaraja (Division Summary):</strong> Mgawanyo wa watahiniwa kulingana na daraja la ufaulu na jinsia (Kike, Kiume, na Jumla).
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-xs text-center border-collapse">
                  <thead>
                    <tr className="bg-slate-800 text-white font-bold uppercase tracking-wider">
                      <th className="px-4 py-3 text-left border-r border-slate-700">SEX</th>
                      <th className="px-4 py-3 border-r border-slate-700 bg-emerald-900/60">I</th>
                      <th className="px-4 py-3 border-r border-slate-700 bg-blue-900/60">II</th>
                      <th className="px-4 py-3 border-r border-slate-700 bg-teal-900/60">III</th>
                      <th className="px-4 py-3 border-r border-slate-700 bg-amber-900/60">IV</th>
                      <th className="px-4 py-3 border-r border-slate-700 bg-rose-900/60">0</th>
                      <th className="px-4 py-3 bg-slate-950 font-black">TOTAL</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-mono text-sm">
                    {divisionSummaryData.map(r => (
                      <tr key={r.sex} className={r.sex === 'T' ? 'bg-slate-100 font-black' : 'hover:bg-slate-50'}>
                        <td className="px-4 py-3 text-left font-black border-r border-slate-200 font-sans">
                          {r.sex === 'F' ? (
                            <span className="text-pink-700 flex items-center gap-1.5 font-bold">
                              <span className="w-2.5 h-2.5 rounded-full bg-pink-500 inline-block"></span>
                              <span>F (Female)</span>
                            </span>
                          ) : r.sex === 'M' ? (
                            <span className="text-blue-700 flex items-center gap-1.5 font-bold">
                              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block"></span>
                              <span>M (Male)</span>
                            </span>
                          ) : (
                            <span className="text-slate-900 font-black">T (Total)</span>
                          )}
                        </td>
                        <td className="px-4 py-3 border-r border-slate-200 text-emerald-800 font-bold">{r['I']}</td>
                        <td className="px-4 py-3 border-r border-slate-200 text-blue-800 font-bold">{r['II']}</td>
                        <td className="px-4 py-3 border-r border-slate-200 text-teal-800 font-bold">{r['III']}</td>
                        <td className="px-4 py-3 border-r border-slate-200 text-amber-800 font-bold">{r['IV']}</td>
                        <td className="px-4 py-3 border-r border-slate-200 text-rose-800 font-bold">{r['0']}</td>
                        <td className="px-4 py-3 font-black text-slate-950 bg-slate-100/60">{r.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
