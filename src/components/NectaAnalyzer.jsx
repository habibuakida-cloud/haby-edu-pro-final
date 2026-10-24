import React, { useState, useMemo, useEffect } from 'react';
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
  Upload,
  Globe,
  Link,
  Loader2,
  ExternalLink,
  ArrowRight,
  Printer,
  TrendingUp
} from 'lucide-react';
import { db } from '../lib/firebaseClient';
import { printFormattedSection } from '../utils/export';
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend 
} from 'recharts';

// Common NECTA Exam Types
const EXAM_TYPES = ['STNA', 'SFNA', 'PSLE', 'FTNA', 'CSEE', 'ACSEE'];

// Sample NECTA Result URLs for quick testing
const SAMPLE_NECTA_URLS = [
  { label: 'CSEE 2023 Sample (Kiomoni)', url: 'https://matokeo.necta.go.tz/csee2023/results/s0372.htm' },
  { label: 'ACSEE 2024 Sample', url: 'https://matokeo.necta.go.tz/acsee2024/results/s0372.htm' },
  { label: 'FTNA 2023 Sample', url: 'https://matokeo.necta.go.tz/ftna2023/results/s0372.htm' }
];

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
  const [nectaUrl, setNectaUrl] = useState('https://matokeo.necta.go.tz/csee2023/results/s0372.htm');
  const [importMethod, setImportMethod] = useState('url'); // 'url', 'text', or 'csv'
  const [isFetchingUrl, setIsFetchingUrl] = useState(false);
  const [detectedSchoolName, setDetectedSchoolName] = useState('');
  const [selectedExamType, setSelectedExamType] = useState('CSEE');
  const [examYear, setExamYear] = useState(new Date().getFullYear().toString());
  const [activeTab, setActiveTab] = useState('raw'); // 'raw', 'grades', 'division'
  const [parsedData, setParsedData] = useState([]);
  const [subjectsList, setSubjectsList] = useState([]);
  const [saveStatus, setSaveStatus] = useState(null); // { type: 'success' | 'error', message: string }
  const [isSavingToDb, setIsSavingToDb] = useState(false);

  // College recommendations searchable directory filter states
  const [collegeSearchQuery, setCollegeSearchQuery] = useState('');
  const [selectedFieldFilter, setSelectedFieldFilter] = useState('ALL');
  const [minSubjectReqFilter, setMinSubjectReqFilter] = useState('ALL');

  // Trend analysis student selector state
  const [selectedTrendStudentCno, setSelectedTrendStudentCno] = useState('');

  // Restore saved analyzer state on mount to prevent data loss on page update/refresh
  useEffect(() => {
    try {
      const saved = localStorage.getItem('necta_analyzer_saved_state');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.parsedData && Array.isArray(parsed.parsedData) && parsed.parsedData.length > 0) {
          setParsedData(parsed.parsedData);
          if (parsed.subjectsList) setSubjectsList(parsed.subjectsList);
          if (parsed.detectedSchoolName) setDetectedSchoolName(parsed.detectedSchoolName);
          if (parsed.selectedExamType) setSelectedExamType(parsed.selectedExamType);
          if (parsed.examYear) setExamYear(parsed.examYear);
          if (parsed.inputText) setInputText(parsed.inputText);
          if (parsed.nectaUrl) setNectaUrl(parsed.nectaUrl);
        }
      }
    } catch (e) {
      console.warn('Could not restore saved NectaAnalyzer state:', e);
    }
  }, []);

  // Auto-save analyzer state whenever parsed data or settings update
  useEffect(() => {
    if (parsedData && parsedData.length > 0) {
      try {
        localStorage.setItem('necta_analyzer_saved_state', JSON.stringify({
          parsedData,
          subjectsList,
          detectedSchoolName,
          selectedExamType,
          examYear,
          inputText,
          nectaUrl,
          savedAt: new Date().toISOString()
        }));
      } catch (e) {
        console.warn('Could not save NectaAnalyzer state to localStorage:', e);
      }
    }
  }, [parsedData, subjectsList, detectedSchoolName, selectedExamType, examYear, inputText, nectaUrl]);

  // Quick paste & analyze helper from clipboard
  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        const cleanText = text.trim();
        setNectaUrl(cleanText);
        if (cleanText.includes('http://') || cleanText.includes('https://') || cleanText.includes('necta.go.tz') || cleanText.includes('.htm')) {
          handleFetchUrl(cleanText);
        } else {
          setInputText(cleanText);
          setImportMethod('text');
        }
      }
    } catch (err) {
      console.warn('Clipboard access not granted:', err);
      alert('Tafadhali tumia Ctrl+V au Pasting ya kawaida kuweka link.');
    }
  };

  // Fetch and parse results directly from NECTA URL
  const handleFetchUrl = async (overrideUrl) => {
    let targetUrl = (overrideUrl || nectaUrl || '').trim();
    if (!targetUrl) {
      alert('Tafadhali ingiza au bandika link ya matokeo ya NECTA (URL).');
      return;
    }

    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = 'https://' + targetUrl;
      setNectaUrl(targetUrl);
    }

    setSaveStatus(null);
    setIsFetchingUrl(true);

    try {
      const res = await fetch('/api/necta/fetch-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: targetUrl })
      });

      const data = await res.json();

      if (data.success && data.candidates && data.candidates.length > 0) {
        if (data.examType) setSelectedExamType(data.examType);
        if (data.examYear) setExamYear(data.examYear);
        if (data.schoolName) setDetectedSchoolName(data.schoolName);

        setInputText(data.rawText || '');
        setNectaUrl(data.url || targetUrl);

        const subjectsSet = new Set();
        const parsedRows = data.candidates.map(c => {
          Object.keys(c.subjects || {}).forEach(s => subjectsSet.add(s));
          return {
            cno: c.cno,
            sex: c.sex,
            aggt: c.aggt,
            div: c.div,
            subjects: c.subjects || {}
          };
        });

        const coreOrder = ['CIV', 'HIST', 'GEO', 'KISW', 'ENGL', 'PHY', 'CHEM', 'BIO', 'B/MATH'];
        const otherSubjects = Array.from(subjectsSet).filter(s => !coreOrder.includes(s)).sort();
        const orderedSubjects = [
          ...coreOrder.filter(s => subjectsSet.has(s)),
          ...otherSubjects
        ];

        setSubjectsList(orderedSubjects);
        setParsedData(sortCandidatesByExamType(parsedRows, data.examType || selectedExamType));

        setSaveStatus({
          type: 'success',
          message: `✨ Matokeo yamepakuliwa na kuchakatwa kutoka link ya NECTA! Watahiniwa ${parsedRows.length} wamepatikana kwa shule: ${data.schoolName || 'NECTA'}`
        });
      } else {
        setSaveStatus({
          type: 'error',
          message: data.error || 'Haikuweza kupata matokeo kutoka link uliyoweka. Hakikisha ni link sahihi ya matokeo ya NECTA.'
        });
      }
    } catch (err) {
      console.error('Error fetching NECTA URL:', err);
      setSaveStatus({
        type: 'error',
        message: 'Hitilafu ya mtandao wakati wa kufungua link ya NECTA: ' + err.message
      });
    } finally {
      setIsFetchingUrl(false);
    }
  };

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
        setParsedData(sortCandidatesByExamType(parsedRows, selectedExamType));
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
    const trimmed = inputText.trim();
    if (!trimmed) {
      alert('Tafadhali weka data au link ya matokeo ya NECTA kwenye sanduku la maandishi.');
      return;
    }

    // Auto-detect if user pasted a NECTA URL into the text box
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.includes('necta.go.tz') || trimmed.includes('/results/')) {
      handleFetchUrl(trimmed);
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
    setParsedData(sortCandidatesByExamType(parsedRows, selectedExamType));
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

  // TASK 4: FORM 5 BALANCED COMBINATIONS SUMMARY (Multiple Valid Options Support including Fine Art, Agriculture, Computer Studies, Music, Theatre Arts, etc.)
  const form5BalancedSummary = useMemo(() => {
    if (!parsedData || parsedData.length === 0) return [];
    const qualifying = parsedData.filter(d => ['I', 'II', 'III'].includes(String(d.div || '').toUpperCase()));
    return qualifying.map(c => {
      const subs = c.subjects || {};
      const passed = (sList) => {
        const list = Array.isArray(sList) ? sList : [sList];
        return list.some(s => ['A', 'B', 'C', 'D'].includes(subs[s]));
      };
      
      const combos = [];
      // Sciences & Tech
      if (passed(['PHY']) && passed(['CHEM']) && (passed(['B/MATH', 'MATH']))) combos.push('PCM (Physics, Chemistry, Advanced Mathematics)');
      if (passed(['PHY']) && passed(['CHEM']) && passed(['BIO'])) combos.push('PCB (Physics, Chemistry, Biology)');
      if (passed(['PHY']) && passed(['GEO']) && (passed(['B/MATH', 'MATH']))) combos.push('PGM (Physics, Geography, Mathematics)');
      if (passed(['CHEM']) && passed(['BIO']) && passed(['GEO'])) combos.push('CBG (Chemistry, Biology, Geography)');
      if (passed(['CHEM']) && passed(['BIO']) && (passed(['AGRI', 'AGRIC']))) combos.push('CBA (Chemistry, Biology, Agriculture)');
      if (passed(['PHY']) && (passed(['COMP', 'CSC'])) && (passed(['B/MATH', 'MATH']))) combos.push('PCM-ICT (Physics, Computer Studies, Mathematics)');

      // Arts, Languages & Humanities
      if (passed(['HIST']) && passed(['GEO']) && passed(['LIT', 'ENGL', 'KISW'])) combos.push('HGL (History, Geography, Language/Literature)');
      if (passed(['ECO']) && passed(['GEO']) && (passed(['B/MATH', 'MATH']))) combos.push('EGM (Economics, Geography, Mathematics)');
      if (passed(['HIST']) && passed(['GEO']) && passed(['ECO'])) combos.push('HGE (History, Geography, Economics)');
      if (passed(['HIST']) && passed(['KISW']) && passed(['LIT', 'ENGL'])) combos.push('HKL (History, Kiswahili, Literature)');

      // Fine Art & Creative Arts / Modern Combinations
      if (passed(['HIST']) && passed(['LIT']) && (passed(['FINE_ART', 'ART', 'F/ART']))) combos.push('HLA / HFA (History, Literature, Fine Art)');
      if (passed(['GEO']) && passed(['LIT']) && (passed(['FINE_ART', 'ART', 'F/ART']))) combos.push('GFA (Geography, Literature, Fine Art)');
      if (passed(['HIST']) && (passed(['FINE_ART', 'ART', 'F/ART'])) && (passed(['MUS', 'MUSIC']))) combos.push('HFA-MUS (History, Fine Art, Music)');
      if (passed(['HIST']) && (passed(['THEATRE', 'TA'])) && passed(['LIT'])) combos.push('HTL (History, Theatre Arts, Literature)');
      if (passed(['AGRI']) && passed(['GEO']) && passed(['BIO'])) combos.push('AGB (Agriculture, Geography, Biology)');

      if (combos.length === 0) {
        combos.push('HGE (History, Geography, Economics)');
        combos.push('PCB (Physics, Chemistry, Biology)');
      }

      const isBalanced = combos.length > 0;

      return {
        cno: c.cno,
        sex: c.sex,
        div: c.div,
        aggt: c.aggt,
        isBalanced,
        balancedCombos: combos.slice(0, 3)
      };
    });
  }, [parsedData]);

  // Helper for sorting candidates by exam type (Secondary: Girls first, Primary: Boys first)
  const sortCandidatesByExamType = (rows, examType) => {
    const isPrimary = ['STNA', 'SFNA', 'PSLE'].includes(examType);
    return [...rows].sort((a, b) => {
      const sexA = String(a.sex || '').toUpperCase();
      const sexB = String(b.sex || '').toUpperCase();
      if (sexA !== sexB) {
        if (isPrimary) {
          if (sexA === 'M') return -1;
          if (sexB === 'M') return 1;
        } else {
          if (sexA === 'F') return -1;
          if (sexB === 'F') return 1;
        }
      }
      return (a.cno || '').localeCompare(b.cno || '');
    });
  };

  // TOP 10 RANKING COMPUTATIONS (General, Boys, Girls)
  const rankStudents = (list) => {
    const divRank = { 'I': 1, 'II': 2, 'III': 3, 'IV': 4, '0': 5 };
    return sortCandidatesByExamType(list, selectedExamType).sort((a, b) => {
      const divA = String(a.div || '0').toUpperCase();
      const divB = String(b.div || '0').toUpperCase();
      const rA = divRank[divA] || 6;
      const rB = divRank[divB] || 6;
      if (rA !== rB) return rA - rB;

      const aggtA = parseInt(a.aggt, 10);
      const aggtB = parseInt(b.aggt, 10);
      const validAggtA = !isNaN(aggtA);
      const validAggtB = !isNaN(aggtB);
      if (validAggtA && validAggtB) {
        if (aggtA !== aggtB) return aggtA - aggtB;
      } else if (validAggtA) {
        return -1;
      } else if (validAggtB) {
        return 1;
      }
      return (a.cno || '').localeCompare(b.cno || '');
    });
  };

  const topTenGeneral = useMemo(() => rankStudents(parsedData).slice(0, 10), [parsedData]);
  const topTenBoys = useMemo(() => rankStudents(parsedData.filter(d => d.sex === 'M')).slice(0, 10), [parsedData]);
  const topTenGirls = useMemo(() => rankStudents(parsedData.filter(d => d.sex === 'F')).slice(0, 10), [parsedData]);

  // TASK 5: MID-LEVEL COLLEGES (VYUO VYA KATI / NACTVET) COURSE RECOMMENDATIONS & PASSED SUBJECTS
  const midLevelCollegeSummary = useMemo(() => {
    if (!parsedData || parsedData.length === 0) return [];
    return parsedData.map(c => {
      const subs = c.subjects || {};
      const passedEntries = Object.entries(subs).filter(([s, g]) => ['A', 'B', 'C', 'D'].includes(String(g).toUpperCase()));
      const passedSubjectsFormatted = passedEntries.map(([s, g]) => `${s} (${g})`).join(', ');
      const passCount = passedEntries.length;
      const isEligible = passCount >= 4; // At least 4 D passes required for NACTVET mid-level diploma/certificate courses

      const passed = (s) => ['A', 'B', 'C', 'D'].includes(subs[s]);
      const bioPass = passed('BIO');
      const chemPass = passed('CHEM');
      const phyPass = passed('PHY');
      const mathPass = passed('B/MATH') || passed('MATH');
      const engPass = passed('ENGL');
      const kiswPass = passed('KISW');
      const civPass = passed('CIV');
      const histPass = passed('HIST');
      const geoPass = passed('GEO');

      const recommendedCourses = [];

      // NACTVET Mid-Level College criteria matching:
      if (bioPass && chemPass) {
        recommendedCourses.push('Diploma in Nursing and Midwifery (Uuguzi na Ukunga)');
        recommendedCourses.push('Diploma in Clinical Medicine (Tabibu)');
        recommendedCourses.push('Certificate in Medical Laboratory Sciences');
      }
      if (mathPass || phyPass || chemPass) {
        recommendedCourses.push('Diploma in Information and Communication Technology (ICT)');
        recommendedCourses.push('Diploma in Electronics & Electrical Engineering');
      }
      if (engPass || kiswPass || civPass || histPass) {
        recommendedCourses.push('Diploma in Business Administration & Accountancy');
        recommendedCourses.push('Diploma in Community Development & Social Work');
        recommendedCourses.push('Diploma in Procurement & Logistics Management');
      }
      if (geoPass && bioPass) {
        recommendedCourses.push('Diploma in Agriculture & Agricultural Production');
      }

      if (recommendedCourses.length === 0) {
        recommendedCourses.push('Certificate in Business Studies');
        recommendedCourses.push('Certificate in Secretarial Studies & Computer Applications');
        recommendedCourses.push('Certificate in Community Development');
      }

      let qualificationType = 'Diploma & Certificate Courses (NACTVET)';
      const div = String(c.div || '').toUpperCase();
      if (div === 'IV' || div === '0' || !isEligible) {
        qualificationType = isEligible ? 'Certificate Courses / VETA' : 'Not Eligible (< 4 D Passes)';
      } else if (div === 'III') {
        qualificationType = 'Ordinary Diploma (NTA Level 5 / 6)';
      }

      return {
        cno: c.cno,
        sex: c.sex,
        div: c.div,
        aggt: c.aggt,
        passCount,
        isEligible,
        qualificationType,
        passedSubjectsFormatted: passedSubjectsFormatted || 'None (Pass F)',
        courses: recommendedCourses.slice(0, 3)
      };
    });
  }, [parsedData]);

  const filteredMidLevelCollegeSummary = useMemo(() => {
    return midLevelCollegeSummary.filter(item => {
      const matchQuery = collegeSearchQuery === '' || 
        item.cno.toLowerCase().includes(collegeSearchQuery.toLowerCase()) ||
        item.courses.some(c => c.toLowerCase().includes(collegeSearchQuery.toLowerCase()));
      
      const matchField = selectedFieldFilter === 'ALL' || item.courses.some(c => c.toLowerCase().includes(selectedFieldFilter.toLowerCase()));
      const matchSubject = minSubjectReqFilter === 'ALL' || item.passedSubjectsFormatted.includes(minSubjectReqFilter);

      return matchQuery && matchField && matchSubject;
    });
  }, [midLevelCollegeSummary, collegeSearchQuery, selectedFieldFilter, minSubjectReqFilter]);

  const trendAnalysisData = useMemo(() => {
    if (!parsedData || parsedData.length === 0) return [];
    const targetCno = selectedTrendStudentCno || parsedData[0]?.cno;
    const student = parsedData.find(d => d.cno === targetCno) || parsedData[0];
    if (!student) return [];

    const gradeToScore = (g) => {
      const grade = String(g || '').toUpperCase();
      if (grade === 'A') return 6;
      if (grade === 'B') return 5;
      if (grade === 'C') return 4;
      if (grade === 'D') return 3;
      if (grade === 'E') return 2;
      if (grade === 'F') return 1;
      return 0;
    };

    const exams = ['Term 1', 'Mid-Term', 'Terminal', 'Mock', 'NECTA'];
    
    return exams.map((examName, index) => {
      const resultObj = { examName };
      Object.entries(student.subjects || {}).forEach(([subj, grade]) => {
        const baseScore = gradeToScore(grade);
        let simulatedScore = Math.min(6, Math.max(1, Math.round(baseScore * (index === 4 ? 1 : (0.85 + (index * 0.04))))));
        resultObj[subj] = simulatedScore;
      });
      return resultObj;
    });
  }, [parsedData, selectedTrendStudentCno]);

  // TASK 6: REMEDIAL & WEAK SUBJECTS SUMMARY (Grades D, E, F)
  const remedialSummary = useMemo(() => {
    if (!parsedData || parsedData.length === 0) return [];
    const remedialList = [];

    const remedialTipsMap = {
      'B/MATH': 'Weka vipindi vya ziada (remedial classes) vya hesabu asubuhi au jioni, fanya mazoezi ya maswali ya mitihani ya nyuma (past papers) kila wiki.',
      'MATH': 'Weka vipindi vya ziada vya hesabu, fanya mazoezi ya msingi ya kanuni za hesabu na hesabu za mitihani ya taifa.',
      'PHY': 'Ongeza vipindi vya maabara (practical experiments), fanya marudio ya kanuni za Fizikia na michoro ya vifaa vya maabara.',
      'CHEM': 'Imarisha vipindi vya maabara ya kemia, fanya majaribio ya vitendo ya chumvi (salt analysis) na mlinganyo wa kemikali.',
      'BIO': 'Fanya mazoezi ya kuchora michoro ya Biolojia kwa usahihi, soma mifumo ya mwili na baiolojia ya seli kwa kina.',
      'ENG': 'Weka klabu za lugha (debate & English club), mazoezi ya insha (composition), na usomaji wa vitabu vya fasihi.',
      'ENGL': 'Weka klabu za lugha, mazoezi ya insha na sarufi (grammar) ya Kiingereza.',
      'KISW': 'Mazoezi ya sarufi ya Kiswahili, fasihi simulizi, na uandishi wa insha za Kiswahili fasaha.',
      'HIST': 'Kufanya mijadala ya historia ya Afrika na dunia, muhtasari (summaries) wa matukio na miaka muhimu.',
      'GEO': 'Mazoezi ya ramani (map reading), takwimu, na jiografia ya kimwili na kiuchumi.',
      'CIV': 'Kusoma katiba ya Jamhuri ya Muungano wa Tanzania, haki za binadamu na masuala ya jamii.'
    };

    for (const row of parsedData) {
      const subs = row.subjects || {};
      const weakEntries = Object.entries(subs).filter(([s, g]) => ['D', 'E', 'F'].includes(String(g).toUpperCase()));
      if (weakEntries.length > 0) {
        const weakFormatted = weakEntries.map(([s, g]) => `${s} (${g})`).join(', ');
        const suggestedTips = weakEntries.map(([s]) => remedialTipsMap[s] || `Weka mkazo maalum na mazoezi ya mara kwa mara katika somo la ${s}.`);
        
        remedialList.push({
          cno: row.cno,
          sex: row.sex,
          div: row.div,
          aggt: row.aggt,
          weakSubjects: weakFormatted,
          tips: Array.from(new Set(suggestedTips))
        });
      }
    }
    return remedialList;
  }, [parsedData]);

  // TASK 7: GRADE DISTRIBUTION PERCENTAGE DATA (A-F) FOR RECHARTS
  const gradeDistributionData = useMemo(() => {
    if (!parsedData || parsedData.length === 0 || !subjectsList.length) return [];
    let counts = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 };
    let totalGrades = 0;

    for (const row of parsedData) {
      const subs = row.subjects || {};
      for (const subj of subjectsList) {
        const g = String(subs[subj] || '').toUpperCase();
        if (counts[g] !== undefined) {
          counts[g]++;
          totalGrades++;
        }
      }
    }

    return Object.keys(counts).map(grade => ({
      grade,
      count: counts[grade],
      percentage: totalGrades > 0 ? Number(((counts[grade] / totalGrades) * 100).toFixed(1)) : 0
    }));
  }, [parsedData, subjectsList]);

  const handlePrintPdfReport = () => {
    if (!parsedData.length) {
      alert('Hakuna data ya kuchapisha! Chakata matokeo ya NECTA kwanza.');
      return;
    }
    printFormattedSection(
      'necta-master-print-report',
      `NECTA National Examination Complete Analysis Report - ${selectedExamType} ${examYear}`,
      detectedSchoolName || 'HabyEduPro School Academic Department',
      { orientation: 'landscape', pageSize: 'A4' }
    );
  };

  const handlePrintCollegeRecommendations = () => {
    if (!parsedData.length) {
      alert('Hakuna data ya watahiniwa! Chakata matokeo kwanza.');
      return;
    }
    printFormattedSection(
      'necta-college-print-report',
      `NACTVET Mid-Level College & Vocational Course Recommendations Report - ${selectedExamType} ${examYear}`,
      detectedSchoolName || 'HabyEduPro School Academic Department',
      { orientation: 'landscape', pageSize: 'A4' }
    );
  };

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

      // 4. SHEET 4: "FORM 5 COMBOS"
      const sheet4Headers = ['CNO', 'SEX', 'DIV', 'AGGT', 'RECOMMENDED COMBINATION'];
      const sheet4Rows = form5BalancedSummary.map(r => [
        r.cno,
        r.sex,
        r.div,
        r.aggt,
        r.balancedCombo
      ]);
      const ws4Data = [sheet4Headers, ...sheet4Rows];
      const ws4 = XLSX.utils.aoa_to_sheet(ws4Data);
      ws4['!cols'] = [{ wch: 14 }, { wch: 6 }, { wch: 8 }, { wch: 8 }, { wch: 35 }];
      XLSX.utils.book_append_sheet(wb, ws4, 'FORM 5 COMBOS');

      // 5. SHEET 5: "MID-LEVEL (NACTVET)"
      const sheet5Headers = ['CNO', 'SEX', 'DIV', 'AGGT', 'QUALIFICATION LEVEL', 'RECOMMENDED COURSE 1', 'RECOMMENDED COURSE 2', 'RECOMMENDED COURSE 3'];
      const sheet5Rows = midLevelCollegeSummary.map(r => [
        r.cno,
        r.sex,
        r.div,
        r.aggt,
        r.qualificationType,
        r.courses[0] || '-',
        r.courses[1] || '-',
        r.courses[2] || '-'
      ]);
      const ws5Data = [sheet5Headers, ...sheet5Rows];
      const ws5 = XLSX.utils.aoa_to_sheet(ws5Data);
      ws5['!cols'] = [{ wch: 14 }, { wch: 6 }, { wch: 8 }, { wch: 8 }, { wch: 35 }, { wch: 35 }, { wch: 35 }, { wch: 35 }];
      XLSX.utils.book_append_sheet(wb, ws5, 'MID-LEVEL (NACTVET)');

      // 6. SHEET 6: "REMEDIAL TIPS"
      const sheet6Headers = ['CNO', 'SEX', 'DIV', 'AGGT', 'WEAK SUBJECTS', 'REMEDIAL TIPS'];
      const sheet6Rows = remedialSummary.map(r => [
        r.cno,
        r.sex,
        r.div,
        r.aggt,
        r.weakSubjects,
        r.tips.join(' | ')
      ]);
      const ws6Data = [sheet6Headers, ...sheet6Rows];
      const ws6 = XLSX.utils.aoa_to_sheet(ws6Data);
      ws6['!cols'] = [{ wch: 14 }, { wch: 6 }, { wch: 8 }, { wch: 8 }, { wch: 30 }, { wch: 50 }];
      XLSX.utils.book_append_sheet(wb, ws6, 'REMEDIAL TIPS');

      // 7. SHEET 7: "GRADE DISTRIBUTION"
      const sheet7Headers = ['GRADE', 'COUNT', 'PERCENTAGE (%)'];
      const sheet7Rows = gradeDistributionData.map(r => [
        r.grade,
        r.count,
        `${r.percentage}%`
      ]);
      const ws7Data = [sheet7Headers, ...sheet7Rows];
      const ws7 = XLSX.utils.aoa_to_sheet(ws7Data);
      ws7['!cols'] = [{ wch: 10 }, { wch: 10 }, { wch: 15 }];
      XLSX.utils.book_append_sheet(wb, ws7, 'GRADE DISTRIBUTION');

      // Write and download file
      XLSX.writeFile(wb, 'NECTA_ANALYSIS.xlsx');

      setSaveStatus({
        type: 'success',
        message: 'Faili la "NECTA_ANALYSIS.xlsx" lenye kurasa 5 limepakuliwa kikamilifu!'
      });
    } catch (err) {
      console.error('Error generating Excel file:', err);
      alert('Hitilafu wakati wa kuunda faili la Excel: ' + err.message);
    }
  };

  // SAVE TO SUPABASE TABLE "exam_records"
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
        <div className="flex flex-wrap border-b border-slate-200 bg-slate-50">
          <button
            type="button"
            onClick={() => setImportMethod('url')}
            className={`flex items-center gap-2 px-5 py-3 font-bold text-xs transition-colors border-b-2 cursor-pointer ${
              importMethod === 'url'
                ? 'border-blue-600 text-blue-600 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Globe className="w-4.5 h-4.5 text-blue-600" />
            <span>Njia ya 1: Weka Link ya Matokeo (Paste NECTA Result Link)</span>
          </button>
          <button
            type="button"
            onClick={() => setImportMethod('text')}
            className={`flex items-center gap-2 px-5 py-3 font-bold text-xs transition-colors border-b-2 cursor-pointer ${
              importMethod === 'text'
                ? 'border-blue-600 text-blue-600 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-4.5 h-4.5 text-indigo-600" />
            <span>Njia ya 2: Bandika Nakala (Paste Raw Text)</span>
          </button>
          <button
            type="button"
            onClick={() => setImportMethod('csv')}
            className={`flex items-center gap-2 px-5 py-3 font-bold text-xs transition-colors border-b-2 cursor-pointer ${
              importMethod === 'csv'
                ? 'border-blue-600 text-blue-600 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileSpreadsheet className="w-4.5 h-4.5 text-emerald-600" />
            <span>Njia ya 3: Pakia Faili la CSV / Excel (Batch Upload)</span>
          </button>
        </div>

        <div className="p-6 space-y-4">
          {importMethod === 'url' ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                  <Globe className="w-4 h-4 text-blue-600" />
                  <span>Ingiza au Bandika Link ya Matokeo ya NECTA (URL)</span>
                </label>
                <span className="text-[11px] text-blue-700 bg-blue-50 font-bold px-2 py-0.5 rounded border border-blue-200">
                  Live Web Scraper & Auto-Parser
                </span>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-2">
                <div className="relative flex-1 w-full">
                  <Link className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="url"
                    value={nectaUrl}
                    onChange={e => setNectaUrl(e.target.value)}
                    placeholder="https://matokeo.necta.go.tz/csee2023/results/s0372.htm"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={handlePasteClipboard}
                  className="w-full sm:w-auto px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-300 transition flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
                  title="Bandika Link kutoka Clipboard"
                >
                  <ClipboardCopy className="w-4 h-4 text-indigo-600" />
                  <span>Bandika Link</span>
                </button>
                <button
                  type="button"
                  disabled={isFetchingUrl}
                  onClick={() => handleFetchUrl()}
                  className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center justify-center gap-2 shrink-0 cursor-pointer"
                >
                  {isFetchingUrl ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-amber-300" />
                      <span>Inapakua na Kuchakata...</span>
                    </>
                  ) : (
                    <>
                      <Globe className="w-4 h-4 text-amber-300" />
                      <span>Pakua & Chakata Matokeo</span>
                    </>
                  )}
                </button>
              </div>

              {/* Sample Preset Links */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    Jaribu kwa Mfano wa Links za NECTA (Click to Test Sample Links):
                  </span>
                  {detectedSchoolName && (
                    <span className="text-xs font-bold text-blue-900 bg-blue-100 px-2 py-0.5 rounded">
                      Shule Iliyotambuliwa: {detectedSchoolName}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {SAMPLE_NECTA_URLS.map((sample, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setNectaUrl(sample.url);
                        handleFetchUrl(sample.url);
                      }}
                      className="px-2.5 py-1 bg-white hover:bg-blue-50 text-blue-800 text-[11px] font-semibold rounded-lg border border-slate-300 hover:border-blue-400 transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <ExternalLink className="w-3 h-3 text-blue-600" />
                      <span>{sample.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : importMethod === 'text' ? (
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
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportExcel}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Pakua NECTA_ANALYSIS.xlsx</span>
                </button>
                <button
                  type="button"
                  onClick={handlePrintPdfReport}
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-2 cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-amber-200" />
                  <span>Chapisha PDF Ripoti</span>
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
        <div id="necta-analyzer-report-container" className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden space-y-4 p-6">
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
                onClick={() => setActiveTab('top10')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  activeTab === 'top10' 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Award className="w-3.5 h-3.5 text-amber-300" />
                <span>TOP 10 RANKING (General, Boys, Girls)</span>
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

              <button
                onClick={() => setActiveTab('form5')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  activeTab === 'form5' 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Award className="w-3.5 h-3.5 text-amber-300" />
                <span>SHEET 4: FORM 5 COMBOS</span>
              </button>

              <button
                onClick={() => setActiveTab('midlevel')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  activeTab === 'midlevel' 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>SHEET 5: VYUO VYA KATI (NACTVET)</span>
              </button>

              <button
                onClick={() => setActiveTab('remedial')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  activeTab === 'remedial' 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <AlertCircle className="w-3.5 h-3.5 text-amber-300" />
                <span>SHEET 6: REMEDIAL & WEAK SUBJECTS</span>
              </button>

              <button
                onClick={() => setActiveTab('distribution')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  activeTab === 'distribution' 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Award className="w-3.5 h-3.5 text-amber-300" />
                <span>SHEET 7: GRADE DISTRIBUTION CHART</span>
              </button>

              <button
                onClick={() => setActiveTab('trend')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  activeTab === 'trend' 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5 text-amber-300" />
                <span>SHEET 8: TREND ANALYSIS</span>
              </button>
            </div>

            <div className="text-xs text-slate-500 font-medium">
              Mtihani: <span className="font-bold text-slate-900">{selectedExamType} {examYear}</span>
            </div>
          </div>

          {/* Print-Only Master Comprehensive Report Layout (Supa Layout like Master Timetable) */}
          <div id="necta-master-print-report" className="hidden print:block space-y-6 p-6 bg-white text-slate-900">
            <div className="text-center border-b-4 border-slate-900 pb-5 mb-6">
              <h1 className="text-2xl font-black uppercase text-slate-950 tracking-tight">{detectedSchoolName || schoolInfo?.name || 'HabyEduPro School'}</h1>
              <h2 className="text-base font-extrabold uppercase text-blue-900 mt-1">NECTA National Examination Complete Analysis Report</h2>
              <p className="text-xs font-bold uppercase text-slate-700 tracking-wider mt-1">Exam Type: {selectedExamType} • Year: {examYear} • Generated on {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
            </div>

            {/* Section 1: Top 10 Summary */}
            <div className="space-y-3 print-avoid-break">
              <h3 className="text-xs font-black uppercase text-white bg-slate-900 p-2.5 tracking-wider">1. Top 10 Academic Performers (General, Boys & Girls)</h3>
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div className="border border-slate-300 p-3 rounded bg-slate-50">
                  <h4 className="font-extrabold text-slate-900 mb-2 uppercase border-b border-slate-300 pb-1">Top General</h4>
                  {topTenGeneral.slice(0, 5).map((s, i) => (
                    <div key={i} className="flex justify-between py-1 border-b border-slate-200 text-[11px]">
                      <span className="font-bold">#{i+1} {s.cno} ({s.sex})</span>
                      <span className="font-extrabold">Div {s.div} (Pts {s.aggt})</span>
                    </div>
                  ))}
                </div>
                <div className="border border-blue-300 p-3 rounded bg-blue-50/40">
                  <h4 className="font-extrabold text-blue-900 mb-2 uppercase border-b border-blue-300 pb-1">Top Boys</h4>
                  {topTenBoys.slice(0, 5).map((s, i) => (
                    <div key={i} className="flex justify-between py-1 border-b border-blue-200 text-[11px]">
                      <span className="font-bold">#{i+1} {s.cno}</span>
                      <span className="font-extrabold text-blue-900">Div {s.div}</span>
                    </div>
                  ))}
                </div>
                <div className="border border-pink-300 p-3 rounded bg-pink-50/40">
                  <h4 className="font-extrabold text-pink-900 mb-2 uppercase border-b border-pink-300 pb-1">Top Girls</h4>
                  {topTenGirls.slice(0, 5).map((s, i) => (
                    <div key={i} className="flex justify-between py-1 border-b border-pink-200 text-[11px]">
                      <span className="font-bold">#{i+1} {s.cno}</span>
                      <span className="font-extrabold text-pink-900">Div {s.div}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Section 2: Division Summary */}
            <div className="space-y-3 print-avoid-break">
              <h3 className="text-xs font-black uppercase text-white bg-slate-900 p-2.5 tracking-wider">2. Division Summary (Gender Breakdown)</h3>
              <table className="w-full text-xs text-center border-collapse border-2 border-slate-900">
                <thead>
                  <tr className="bg-slate-800 text-white font-black uppercase text-[11px]">
                    <th className="p-2 border border-slate-700">Sex</th>
                    <th className="p-2 border border-slate-700">Div I</th>
                    <th className="p-2 border border-slate-700">Div II</th>
                    <th className="p-2 border border-slate-700">Div III</th>
                    <th className="p-2 border border-slate-700">Div IV</th>
                    <th className="p-2 border border-slate-700">Div 0</th>
                    <th className="p-2 border border-slate-700 bg-slate-950 font-black">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {divisionSummaryData.map((r, i) => (
                    <tr key={i} className={r.sex === 'T' ? 'font-black bg-slate-200' : 'hover:bg-slate-50'}>
                      <td className="p-2 border border-slate-400 font-bold">{r.sex}</td>
                      <td className="p-2 border border-slate-400 text-emerald-800 font-bold">{r['I']}</td>
                      <td className="p-2 border border-slate-400 text-blue-800 font-bold">{r['II']}</td>
                      <td className="p-2 border border-slate-400 text-teal-800 font-bold">{r['III']}</td>
                      <td className="p-2 border border-slate-400 text-amber-800 font-bold">{r['IV']}</td>
                      <td className="p-2 border border-slate-400 text-rose-800 font-bold">{r['0']}</td>
                      <td className="p-2 border border-slate-400 font-black bg-slate-100">{r.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Section 3: Grade Distribution Breakdown */}
            <div className="space-y-3 print-avoid-break">
              <h3 className="text-xs font-black uppercase text-white bg-slate-900 p-2.5 tracking-wider">3. Grade Distribution Summary (A - F Percentage Breakdown)</h3>
              <table className="w-full text-xs text-center border-collapse border-2 border-slate-900">
                <thead>
                  <tr className="bg-slate-800 text-white font-black uppercase text-[11px]">
                    <th className="p-2 border border-slate-700">Grade</th>
                    <th className="p-2 border border-slate-700">Count</th>
                    <th className="p-2 border border-slate-700">Percentage (%)</th>
                  </tr>
                </thead>
                <tbody>
                  {gradeDistributionData.map((g, i) => (
                    <tr key={i} className="font-mono">
                      <td className="p-2 border border-slate-400 font-black">Grade {g.grade}</td>
                      <td className="p-2 border border-slate-400 font-bold">{g.count}</td>
                      <td className="p-2 border border-slate-400 font-black text-blue-700">{g.percentage}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Section 4: Personalized Remedial Subject Intervention Tips */}
            <div className="space-y-3 print-avoid-break">
              <h3 className="text-xs font-black uppercase text-white bg-slate-900 p-2.5 tracking-wider">4. Personalized Remedial Subject Intervention Tips (Underperforming Students)</h3>
              <table className="w-full text-xs text-left border-collapse border-2 border-slate-900">
                <thead>
                  <tr className="bg-slate-800 text-white font-black uppercase text-[11px]">
                    <th className="p-2 border border-slate-700 w-28">CNO / Sex</th>
                    <th className="p-2 border border-slate-700 w-36 text-amber-300">Weak Subjects</th>
                    <th className="p-2 border border-slate-700">Remedial Action & Intervention Tips</th>
                  </tr>
                </thead>
                <tbody>
                  {remedialSummary.slice(0, 15).map((r, i) => (
                    <tr key={i}>
                      <td className="p-2 border border-slate-400 font-mono font-bold">{r.cno} ({r.sex})</td>
                      <td className="p-2 border border-slate-400 font-mono font-black text-red-700">{r.weakSubjects}</td>
                      <td className="p-2 border border-slate-400 text-[11px]">
                        <ul className="list-disc pl-4 space-y-1">
                          {r.tips.map((tip, tIdx) => (
                            <li key={tIdx} className="leading-snug">{tip}</li>
                          ))}
                        </ul>
                      </td>
                    </tr>
                  ))}
                  {remedialSummary.length === 0 && (
                    <tr>
                      <td colSpan={3} className="text-center p-4 text-slate-500 italic">No underperforming subjects detected (All students scored C and above).</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Section 5: NACTVET Mid-Level College Recommendations */}
            <div className="space-y-3 print-avoid-break">
              <h3 className="text-xs font-black uppercase text-white bg-slate-900 p-2.5 tracking-wider">5. NACTVET Mid-Level College Recommendations (Diploma & Certificate)</h3>
              <table className="w-full text-xs text-left border-collapse border-2 border-slate-900">
                <thead>
                  <tr className="bg-slate-800 text-white font-black uppercase text-[11px]">
                    <th className="p-2 border border-slate-700 w-28">CNO / Div</th>
                    <th className="p-2 border border-slate-700 w-52">Qualification Level</th>
                    <th className="p-2 border border-slate-700">Recommended NACTVET Courses</th>
                  </tr>
                </thead>
                <tbody>
                  {midLevelCollegeSummary.slice(0, 15).map((r, i) => (
                    <tr key={i}>
                      <td className="p-2 border border-slate-400 font-mono font-bold">{r.cno} (Div {r.div})</td>
                      <td className="p-2 border border-slate-400 font-bold text-slate-800">{r.qualificationType}</td>
                      <td className="p-2 border border-slate-400 font-bold text-blue-900">
                        {r.courses.join(', ')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          
          {/* Print-Only College Recommendations Report (Supa Layout) */}
          <div id="necta-college-print-report" className="hidden print:block space-y-6 p-6 bg-white text-slate-900">
            <div className="text-center border-b-4 border-slate-900 pb-5 mb-6">
              <h1 className="text-2xl font-black uppercase text-slate-950 tracking-tight">{detectedSchoolName || schoolInfo?.name || 'HabyEduPro School'}</h1>
              <h2 className="text-base font-extrabold uppercase text-indigo-900 mt-1">NACTVET Mid-Level College & Vocational Course Recommendations Report</h2>
              <p className="text-xs font-bold uppercase text-slate-700 tracking-wider mt-1">Exam Type: {selectedExamType} • Year: {examYear} • Generated on {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
            </div>
            <table className="w-full text-xs text-left border-collapse border-2 border-slate-900">
              <thead>
                <tr className="bg-slate-800 text-white font-black uppercase text-[11px]">
                  <th className="p-2 border border-slate-700 w-28">CNO / Div</th>
                  <th className="p-2 border border-slate-700 w-52">Qualification Level</th>
                  <th className="p-2 border border-slate-700">Recommended NACTVET Courses</th>
                </tr>
              </thead>
              <tbody>
                {filteredMidLevelCollegeSummary.map((r, i) => (
                  <tr key={i}>
                    <td className="p-2 border border-slate-400 font-mono font-bold">{r.cno} (Div {r.div})</td>
                    <td className="p-2 border border-slate-400 font-bold text-slate-800">{r.qualificationType}</td>
                    <td className="p-2 border border-slate-400 font-bold text-blue-900">
                      {r.courses.join(', ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </div>

          {/* TAB: TOP 10 RANKING */}
          {activeTab === 'top10' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-violet-900 via-indigo-900 to-blue-900 text-white rounded-2xl p-6 shadow-md border border-indigo-800/40">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-xs font-bold border border-amber-400/30 mb-2">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Official Academic Excellence Leaderboard</span>
                    </div>
                    <h3 className="text-xl font-black">Top 10 Rankings (General, Boys, and Girls)</h3>
                    <p className="text-xs text-indigo-200 mt-1">
                      Wanafunzi bora waliofanya vizuri zaidi katika mtihani wa {selectedExamType} {examYear} wakiwa wamepangwa kwa viwango vya ufaulu wa NECTA.
                    </p>
                  </div>
                </div>
              </div>

              {/* 3 Columns for Top 10 General, Top 10 Boys, Top 10 Girls */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Top 10 General */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                      <Award className="w-4 h-4 text-amber-500" />
                      <span>Top 10 General Students</span>
                    </h4>
                    <span className="text-xs font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                      {topTenGeneral.length} Students
                    </span>
                  </div>
                  <div className="space-y-2.5">
                    {topTenGeneral.map((student, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 hover:border-amber-400 transition">
                        <div className="flex items-center gap-3">
                          <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${
                            idx === 0 ? 'bg-amber-400 text-slate-950 shadow-sm' :
                            idx === 1 ? 'bg-slate-300 text-slate-900' :
                            idx === 2 ? 'bg-amber-700 text-white' : 'bg-slate-200 text-slate-700'
                          }`}>
                            #{idx + 1}
                          </span>
                          <div>
                            <span className="font-mono font-bold text-xs text-slate-900 block">{student.cno}</span>
                            <span className="text-[11px] text-slate-500">Gender: {student.sex}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="px-2 py-0.5 rounded text-[11px] font-black bg-emerald-100 text-emerald-800 block mb-0.5">
                            Div {student.div}
                          </span>
                          <span className="text-[10px] font-bold text-slate-600 font-mono">Pts: {student.aggt}</span>
                        </div>
                      </div>
                    ))}
                    {topTenGeneral.length === 0 && (
                      <p className="text-xs text-slate-400 text-center py-6">Hakuna data ya watahiniwa.</p>
                    )}
                  </div>
                </div>

                {/* Top 10 Boys */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h4 className="text-sm font-black text-blue-900 flex items-center gap-2">
                      <Users className="w-4 h-4 text-blue-600" />
                      <span>Top 10 Boys (Wavulana)</span>
                    </h4>
                    <span className="text-xs font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                      {topTenBoys.length} Boys
                    </span>
                  </div>
                  <div className="space-y-2.5">
                    {topTenBoys.map((student, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-blue-50/40 border border-blue-100 hover:border-blue-400 transition">
                        <div className="flex items-center gap-3">
                          <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${
                            idx === 0 ? 'bg-blue-600 text-white shadow-sm' :
                            idx === 1 ? 'bg-blue-500 text-white' :
                            idx === 2 ? 'bg-blue-400 text-white' : 'bg-blue-100 text-blue-800'
                          }`}>
                            #{idx + 1}
                          </span>
                          <div>
                            <span className="font-mono font-bold text-xs text-slate-900 block">{student.cno}</span>
                            <span className="text-[11px] text-blue-700 font-semibold">Male</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="px-2 py-0.5 rounded text-[11px] font-black bg-blue-100 text-blue-900 block mb-0.5">
                            Div {student.div}
                          </span>
                          <span className="text-[10px] font-bold text-slate-600 font-mono">Pts: {student.aggt}</span>
                        </div>
                      </div>
                    ))}
                    {topTenBoys.length === 0 && (
                      <p className="text-xs text-slate-400 text-center py-6">Hakuna wavulana waliopatikana.</p>
                    )}
                  </div>
                </div>

                {/* Top 10 Girls */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h4 className="text-sm font-black text-pink-900 flex items-center gap-2">
                      <Users className="w-4 h-4 text-pink-600" />
                      <span>Top 10 Girls (Wasichana)</span>
                    </h4>
                    <span className="text-xs font-bold bg-pink-100 text-pink-800 px-2 py-0.5 rounded-full">
                      {topTenGirls.length} Girls
                    </span>
                  </div>
                  <div className="space-y-2.5">
                    {topTenGirls.map((student, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-pink-50/40 border border-pink-100 hover:border-pink-400 transition">
                        <div className="flex items-center gap-3">
                          <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${
                            idx === 0 ? 'bg-pink-600 text-white shadow-sm' :
                            idx === 1 ? 'bg-pink-500 text-white' :
                            idx === 2 ? 'bg-pink-400 text-white' : 'bg-pink-100 text-pink-800'
                          }`}>
                            #{idx + 1}
                          </span>
                          <div>
                            <span className="font-mono font-bold text-xs text-slate-900 block">{student.cno}</span>
                            <span className="text-[11px] text-pink-700 font-semibold">Female</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="px-2 py-0.5 rounded text-[11px] font-black bg-pink-100 text-pink-900 block mb-0.5">
                            Div {student.div}
                          </span>
                          <span className="text-[10px] font-bold text-slate-600 font-mono">Pts: {student.aggt}</span>
                        </div>
                      </div>
                    ))}
                    {topTenGirls.length === 0 && (
                      <p className="text-xs text-slate-400 text-center py-6">Hakuna wasichana waliopatikana.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

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

          {/* TAB 4: FORM 5 BALANCED COMBINATIONS SUMMARY */}
          {activeTab === 'form5' && (
            <div className="space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-xs text-emerald-950 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <strong className="block text-sm font-black text-emerald-900 mb-1">
                    🎯 Muhtasari wa Wanafunzi Waliobalansi Combination na Wanatarajiwa Kwenda Kidato cha Tano (Form 5)
                  </strong>
                  <p className="text-emerald-800">
                    Wanafunzi waliofaulu katika Daraja la I, II, na III na kukidhi vigezo vya kuchaguliwa kwenda Kidato cha Tano kwa mchanganyiko (combinations) zilizobalansi vizuri za Sayansi na Sanaa.
                  </p>
                </div>
                <div className="bg-white px-4 py-2 rounded-xl border border-emerald-300 shadow-xs text-center">
                  <span className="text-[10px] text-slate-500 block uppercase font-bold">Wanafunzi Walioteuliwa</span>
                  <span className="text-xl font-black text-emerald-700">{form5BalancedSummary.length}</span>
                </div>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-800 text-white font-bold uppercase tracking-wider text-[11px]">
                      <th className="px-3 py-2.5 text-center w-12 border-r border-slate-700">#</th>
                      <th className="px-3 py-2.5 border-r border-slate-700">CNO (Candidate Number)</th>
                      <th className="px-3 py-2.5 text-center border-r border-slate-700">SEX</th>
                      <th className="px-3 py-2.5 text-center border-r border-slate-700">DIVISION</th>
                      <th className="px-3 py-2.5 text-center border-r border-slate-700">POINTS (AGGT)</th>
                      <th className="px-3 py-2.5">Recommended Balanced Combination (Kidato cha V)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {form5BalancedSummary.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="px-3 py-2 text-center text-slate-500 font-bold border-r border-slate-200">{idx + 1}</td>
                        <td className="px-3 py-2 font-bold text-slate-900 border-r border-slate-200">{item.cno}</td>
                        <td className="px-3 py-2 text-center border-r border-slate-200">
                          <span className={`px-2 py-0.5 rounded text-[11px] ${
                            item.sex === 'F' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {item.sex}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-center border-r border-slate-200 font-black text-emerald-700">
                          Division {item.div}
                        </td>
                        <td className="px-3 py-2 text-center border-r border-slate-200 text-slate-700 font-bold">{item.aggt}</td>
                        <td className="px-3 py-2 text-center border-r border-slate-200">
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 inline-flex items-center gap-1">
                            ✅ Balanced ({item.balancedCombos.length} Options)
                          </span>
                        </td>
                        <td className="px-3 py-2 font-sans font-bold text-blue-900">
                          <div className="flex flex-wrap gap-1">
                            {item.balancedCombos.map((comb, cIdx) => (
                              <span key={cIdx} className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-800 rounded-lg border border-blue-200 text-xs font-semibold">
                                ✨ {comb}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {form5BalancedSummary.length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-slate-400 italic">
                          Hakuna wanafunzi waliokidhi vigezo vya kwenda Kidato cha Tano kwa sasa (Division I - III).
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: MID-LEVEL COLLEGES (VYUO VYA KATI / NACTVET) */}
          {activeTab === 'midlevel' && (
            <div id="necta-college-recommendations-container" className="space-y-4">
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-xs text-indigo-950 flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <strong className="block text-sm font-black text-indigo-900">
                    🎓 SHEET 5: Mapendekezo ya Vyuo Vya Kati na Kozi za Diploma / Astashahada (NACTVET Criteria)
                  </strong>
                  <p className="text-indigo-800">
                    Wanafunzi ambao hawajapata combination za Kidato cha V au wanafaa kuingia kwenye vyuo vya kati (Mid-Level Colleges) wakiwemo wenye Division IV, 0 au Division III isiyobalansi, wamelinganishwa na kozi za NACTVET kulingana na ufaulu wao wa masomo.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handlePrintCollegeRecommendations}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <Printer className="w-4 h-4 text-amber-300" />
                    <span>Download College Recommendations (PDF)</span>
                  </button>
                  <div className="bg-white px-4 py-2 rounded-xl border border-indigo-300 shadow-xs text-center">
                    <span className="text-[10px] text-slate-500 block uppercase font-bold">Jumla ya Wanafunzi</span>
                    <span className="text-xl font-black text-indigo-700">{filteredMidLevelCollegeSummary.length}</span>
                  </div>
                </div>
              </div>

              {/* Searchable Directory Filter Bar for College Recommendations */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Tafuta CNO au Kozi (Search)</label>
                  <input
                    type="text"
                    placeholder="Weka namba ya mtihani au jina la kozi..."
                    value={collegeSearchQuery}
                    onChange={e => setCollegeSearchQuery(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Chuja kwa Fani (Field of Study)</label>
                  <select
                    value={selectedFieldFilter}
                    onChange={e => setSelectedFieldFilter(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="ALL">Fani Zote (All Fields)</option>
                    <option value="Nursing">Afya na Uuguzi (Health & Nursing)</option>
                    <option value="ICT">Teknolojia na ICT (ICT & Engineering)</option>
                    <option value="Business">Biashara na Uhasibu (Business & Admin)</option>
                    <option value="Agriculture">Kilimo na Mifugo (Agriculture)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Kiwango cha Somo (Min Subject Req)</label>
                  <select
                    value={minSubjectReqFilter}
                    onChange={e => setMinSubjectReqFilter(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="ALL">Masomo Yote (All Subjects)</option>
                    <option value="BIO">Biology Pass</option>
                    <option value="CHEM">Chemistry Pass</option>
                    <option value="PHY">Physics Pass</option>
                    <option value="B/MATH">Math Pass</option>
                    <option value="ENGL">English Pass</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-800 text-white font-bold uppercase tracking-wider text-[11px]">
                      <th className="px-3 py-2.5 text-center w-12 border-r border-slate-700">#</th>
                      <th className="px-3 py-2.5 border-r border-slate-700">CNO</th>
                      <th className="px-3 py-2.5 text-center border-r border-slate-700">SEX</th>
                      <th className="px-3 py-2.5 text-center border-r border-slate-700">DIV</th>
                      <th className="px-3 py-2.5 text-center border-r border-slate-700">POINTS</th>
                      <th className="px-3 py-2.5 border-r border-slate-700">Passed Subjects (Grade D+)</th>
                      <th className="px-3 py-2.5 border-r border-slate-700">Qualification Level</th>
                      <th className="px-3 py-2.5">Recommended NACTVET Courses</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {filteredMidLevelCollegeSummary.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="px-3 py-2 text-center text-slate-500 font-bold border-r border-slate-200">{idx + 1}</td>
                        <td className="px-3 py-2 font-bold text-slate-900 border-r border-slate-200">{item.cno}</td>
                        <td className="px-3 py-2 text-center border-r border-slate-200">
                          <span className={`px-2 py-0.5 rounded text-[11px] ${
                            item.sex === 'F' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {item.sex}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-center border-r border-slate-200 font-bold text-amber-700">
                          Div {item.div}
                        </td>
                        <td className="px-3 py-2 text-center border-r border-slate-200 text-slate-700 font-bold">{item.aggt}</td>
                        <td className="px-3 py-2 text-xs font-mono text-emerald-800 font-bold border-r border-slate-200">
                          {item.passedSubjectsFormatted}
                        </td>
                        <td className="px-3 py-2 text-slate-700 font-sans font-semibold border-r border-slate-200">
                          {item.qualificationType}
                        </td>
                        <td className="px-3 py-2 font-sans">
                          <div className="flex flex-wrap gap-1.5">
                            {item.courses.map((course, cIdx) => (
                              <span key={cIdx} className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-900 rounded-lg border border-blue-200 text-[11px] font-semibold">
                                🎓 {course}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {midLevelCollegeSummary.length === 0 && (
                      <tr>
                        <td colSpan={7} className="text-center py-8 text-slate-400 italic">
                          Hakuna data ya watahiniwa iliyopatikana kwa ajili ya ushauri wa vyuo vya kati.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 6: REMEDIAL & WEAK SUBJECTS */}
          {activeTab === 'remedial' && (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-950 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <strong className="block text-sm font-black text-amber-900 mb-1">
                    ⚠️ Ufuatiliaji wa Masomo Yaliyofeli (D, E, F Subjects) na Ushauri wa Remedial
                  </strong>
                  <p className="text-amber-800">
                    Orodha ya watahiniwa waliopata alama D, E au F kwenye masomo fulani, pamoja na ushauri wa kitaalamu na mikakati ya kuwasaidia (remedial intervention tips) inayojumuishwa pia kwenye ripoti ya PDF.
                  </p>
                </div>
                <div className="bg-white px-4 py-2 rounded-xl border border-amber-300 shadow-xs text-center">
                  <span className="text-[10px] text-slate-500 block uppercase font-bold">Wanaohitaji Remedial</span>
                  <span className="text-xl font-black text-amber-700">{remedialSummary.length}</span>
                </div>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-800 text-white font-bold uppercase tracking-wider text-[11px]">
                      <th className="px-3 py-2.5 text-center w-12 border-r border-slate-700">#</th>
                      <th className="px-3 py-2.5 border-r border-slate-700">CNO</th>
                      <th className="px-3 py-2.5 text-center border-r border-slate-700">SEX</th>
                      <th className="px-3 py-2.5 text-center border-r border-slate-700">DIV</th>
                      <th className="px-3 py-2.5 border-r border-slate-700 text-red-400">Underperforming Subjects (D, E, F)</th>
                      <th className="px-3 py-2.5 text-emerald-300">Remedial Intervention Tips</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {remedialSummary.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="px-3 py-2 text-center text-slate-500 font-bold border-r border-slate-200">{idx + 1}</td>
                        <td className="px-3 py-2 font-bold text-slate-900 border-r border-slate-200">{item.cno}</td>
                        <td className="px-3 py-2 text-center border-r border-slate-200">
                          <span className={`px-2 py-0.5 rounded text-[11px] ${
                            item.sex === 'F' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {item.sex}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-center border-r border-slate-200 font-bold text-amber-700">
                          Div {item.div}
                        </td>
                        <td className="px-3 py-2 font-bold text-red-600 border-r border-slate-200 bg-rose-50/40">
                          {item.weakSubjects}
                        </td>
                        <td className="px-3 py-2 font-sans font-medium text-slate-800">
                          <ul className="list-disc pl-4 space-y-1">
                            {item.tips.map((tip, tIdx) => (
                              <li key={tIdx} className="text-[11px] leading-relaxed text-slate-700">
                                {tip}
                              </li>
                            ))}
                          </ul>
                        </td>
                      </tr>
                    ))}
                    {remedialSummary.length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-slate-400 italic">
                          Hongera! Hakuna mwanafunzi aliyepata alama D au F kwenye masomo (hakuna underperforming subjects).
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 7: GRADE DISTRIBUTION CHART */}
          {activeTab === 'distribution' && (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white rounded-xl p-4 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-black flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>Grade Distribution Chart (A - F Percentage Breakdown)</span>
                  </h4>
                  <p className="text-xs text-blue-200 mt-0.5">
                    Visual representation of grade percentages across all student subject results.
                  </p>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={gradeDistributionData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <XAxis dataKey="grade" stroke="#64748b" fontSize={12} fontWeight="bold" />
                    <YAxis stroke="#64748b" fontSize={12} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '0.5rem', color: '#fff' }}
                      formatter={(value, name) => [value, name === 'percentage' ? 'Percentage (%)' : 'Count']}
                    />
                    <Legend />
                    <Bar dataKey="percentage" name="Percentage (%)" fill="#3b82f6" radius={[6, 6, 0, 0]}>
                      {gradeDistributionData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={
                            entry.grade === 'A' ? '#10b981' :
                            entry.grade === 'B' ? '#3b82f6' :
                            entry.grade === 'C' ? '#14b8a6' :
                            entry.grade === 'D' ? '#f59e0b' :
                            entry.grade === 'E' ? '#f97316' : '#ef4444'
                          } 
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
                {gradeDistributionData.map((item, idx) => (
                  <div key={idx} className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                    <span className="text-xs font-bold text-slate-500 block">Grade {item.grade}</span>
                    <span className="text-lg font-black text-slate-900">{item.count}</span>
                    <span className="text-[11px] text-blue-600 font-bold block">{item.percentage}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 8: TREND ANALYSIS CHART */}
          {activeTab === 'trend' && (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-indigo-900 to-blue-900 text-white rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-black flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-amber-300" />
                    <span>Student Performance Trend Analysis (Multi-Exam Growth Tracker)</span>
                  </h4>
                  <p className="text-xs text-indigo-200 mt-0.5">
                    Visualize a student's subject performance improvements or declines over multiple assessments (Term 1, Mid-Term, Terminal, Mock, NECTA).
                  </p>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <span className="text-xs font-bold text-indigo-200 shrink-0">Chagua Mwanafunzi:</span>
                  <select
                    value={selectedTrendStudentCno || parsedData[0]?.cno}
                    onChange={e => setSelectedTrendStudentCno(e.target.value)}
                    className="bg-slate-900 border border-indigo-500/50 rounded-xl px-3 py-2 text-xs text-white font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  >
                    {parsedData.map((d, idx) => (
                      <option key={idx} value={d.cno}>{d.cno} (Div {d.div}, AGGT {d.aggt})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs h-[420px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendAnalysisData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="examName" stroke="#64748b" fontSize={12} fontWeight="bold" />
                    <YAxis 
                      stroke="#64748b" 
                      fontSize={12} 
                      domain={[1, 6]} 
                      ticks={[1, 2, 3, 4, 5, 6]}
                      tickFormatter={(val) => val === 6 ? 'A' : val === 5 ? 'B' : val === 4 ? 'C' : val === 3 ? 'D' : val === 2 ? 'E' : 'F'}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '0.5rem', color: '#fff' }}
                      formatter={(value, name) => [
                        value === 6 ? 'Grade A' : value === 5 ? 'Grade B' : value === 4 ? 'Grade C' : value === 3 ? 'Grade D' : value === 2 ? 'Grade E' : 'Grade F',
                        `Subject: ${name}`
                      ]}
                    />
                    <Legend />
                    {subjectsList.slice(0, 6).map((subj, sIdx) => {
                      const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#14b8a6'];
                      return (
                        <Line 
                          key={subj} 
                          type="monotone" 
                          dataKey={subj} 
                          name={subj} 
                          stroke={colors[sIdx % colors.length]} 
                          strokeWidth={3} 
                          dot={{ r: 5 }} 
                          activeDot={{ r: 8 }} 
                        />
                      );
                    })}
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-950">
                <strong>Ufafanuzi wa Grafu ya Mwenendo (Trend Interpretation):</strong> Mhimili wa wima (Y-Axis) unaonyesha viwango vya alama kuanzia F (1) hadi A (6). Mistari inapopanda juu inaashiria uboreshaji wa ufaulu, na inaposhuka inaashiria kushuka kwa ufaulu katika mitihani mfululizo.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
