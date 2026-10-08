import axios from 'axios';
import https from 'https';
import { GoogleGenAI } from '@google/genai';

export interface NectaFetchResult {
  success: boolean;
  url: string;
  schoolName?: string;
  examType?: string;
  examYear?: string;
  rawText?: string;
  candidatesCount?: number;
  candidates?: Array<{
    cno: string;
    sex: string;
    aggt: string;
    div: string;
    subjects: Record<string, string>;
  }>;
  error?: string;
}

// Initialize Gemini on server for intelligent fallback parsing
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

/**
 * Clean HTML tags and entities to plain text
 */
function cleanHtmlText(html: string): string {
  return html
    .replace(/<script\b[^<]*>([\s\S]*?)<\/script>/gi, '')
    .replace(/<style\b[^<]*>([\s\S]*?)<\/style>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/tr>/gi, '\n')
    .replace(/<\/td>/gi, '  ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/[ \t]+/g, ' ')
    .trim();
}

/**
 * Normalize NECTA Division values
 */
function normalizeDivision(rawDiv: string): string {
  if (!rawDiv) return '-';
  const u = rawDiv.trim().toUpperCase();

  if (u.includes('DIVISION ONE') || u.includes('DIV I') || u === 'DIVISION 1' || u === 'I') return 'I';
  if (u.includes('DIVISION TWO') || u.includes('DIV II') || u === 'DIVISION 2' || u === 'II') return 'II';
  if (u.includes('DIVISION THREE') || u.includes('DIV III') || u === 'DIVISION 3' || u === 'III') return 'III';
  if (u.includes('DIVISION FOUR') || u.includes('DIV IV') || u === 'DIVISION 4' || u === 'IV') return 'IV';
  if (u.includes('DIVISION ZERO') || u.includes('DIV 0') || u === 'DIVISION 0' || u === '0' || u === 'FAILED' || u === 'FAIL') return '0';
  if (u.includes('DISTINCTION')) return 'DISTINCTION';
  if (u.includes('MERIT')) return 'MERIT';
  if (u.includes('CREDIT')) return 'CREDIT';
  if (u.includes('PASS') || u.includes('PASSED')) return 'PASS';

  return u;
}

/**
 * Detect Exam Type and Year from URL or page text
 */
function detectExamTypeAndYear(url: string, text: string): { examType: string; examYear: string } {
  let examType = 'CSEE';
  let examYear = new Date().getFullYear().toString();

  const urlLower = url.toLowerCase();
  const textUpper = text.toUpperCase();

  if (urlLower.includes('acsee') || textUpper.includes('ADVANCED CERTIFICATE OF SECONDARY EDUCATION') || textUpper.includes('ACSEE')) {
    examType = 'ACSEE';
  } else if (urlLower.includes('csee') || textUpper.includes('CERTIFICATE OF SECONDARY EDUCATION') || textUpper.includes('CSEE')) {
    examType = 'CSEE';
  } else if (urlLower.includes('ftna') || textUpper.includes('FORM TWO NATIONAL ASSESSMENT') || textUpper.includes('FTNA')) {
    examType = 'FTNA';
  } else if (urlLower.includes('sfna') || textUpper.includes('STANDARD FOUR NATIONAL ASSESSMENT') || textUpper.includes('SFNA')) {
    examType = 'SFNA';
  } else if (urlLower.includes('psle') || textUpper.includes('PRIMARY SCHOOL LEAVING') || textUpper.includes('PSLE')) {
    examType = 'PSLE';
  } else if (urlLower.includes('stna') || textUpper.includes('STANDARD TWO NATIONAL ASSESSMENT') || textUpper.includes('STNA')) {
    examType = 'STNA';
  }

  const yearMatchInUrl = url.match(/(20\d{2})/);
  if (yearMatchInUrl) {
    examYear = yearMatchInUrl[1];
  } else {
    const yearMatchInText = text.match(/(202[0-9]|201[0-9])/);
    if (yearMatchInText) {
      examYear = yearMatchInText[1];
    }
  }

  return { examType, examYear };
}

/**
 * Extract School Name from NECTA text/HTML
 */
function extractSchoolName(text: string): string {
  const schoolMatch = text.match(/([PSs]\d{4}\s+[^.\n\r<]{3,60}(?:SECONDARY|PRIMARY|SCHOOL|SEKONDARI|SHULE|ACADEMY|HIGH SCHOOL|CENTRE|CENTER))/i);
  if (schoolMatch) {
    return schoolMatch[1].trim().toUpperCase();
  }

  const altMatch = text.match(/(([A-Z0-9_.-]{4,10})\s+[A-Z\s]{4,40}(?:SCHOOL|SEKONDARI|SHULE))/i);
  if (altMatch) {
    return altMatch[1].trim().toUpperCase();
  }

  return 'NECTA SCHOOL RESULTS';
}

/**
 * Extract subjects dictionary from string part
 */
function parseSubjectsString(subjectsPart: string): Record<string, string> {
  const subjectRegex = /([A-Za-z0-9/.\s]+?)\s*[-:]\s*['"]?([A-Fa-fSs])['"]?(?=\s+[A-Za-z0-9/.]+\s*[-:]|\s*$)/g;
  const subjects: Record<string, string> = {};
  let match: RegExpExecArray | null;

  while ((match = subjectRegex.exec(subjectsPart)) !== null) {
    let subj = match[1].trim().toUpperCase().replace(/^[-/\s]+|[-/\s]+$/g, '');
    if (subj === 'BMATH' || subj === 'BASIC MATH' || subj === 'MATHEMATICS') subj = 'B/MATH';
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
    }
  }

  return subjects;
}

/**
 * HTML Table Direct Cell Extraction Parser
 */
function parseCandidatesFromHtmlTables(html: string): Array<{ cno: string; sex: string; aggt: string; div: string; subjects: Record<string, string> }> {
  const candidates: Array<{ cno: string; sex: string; aggt: string; div: string; subjects: Record<string, string> }> = [];

  // Match <tr> elements
  const trMatches = html.match(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi);
  if (!trMatches) return candidates;

  for (const trHtml of trMatches) {
    // Match <td> cells
    const tdMatches = trHtml.match(/<td\b[^>]*>([\s\S]*?)<\/td>/gi);
    if (!tdMatches || tdMatches.length < 3) continue;

    const cells = tdMatches.map(cell => cleanHtmlText(cell).trim());

    // Find candidate number cell
    const cnoIndex = cells.findIndex(c => /[PSs]\d{3,5}\/\d{3,4}|[A-Za-z0-9_.-]+\/\d{3,4}/i.test(c));
    if (cnoIndex === -1) continue;

    const cnoMatch = cells[cnoIndex].match(/([PSs]\d{3,5}\/\d{3,4}|[A-Za-z0-9_.-]+\/\d{3,4})/i);
    if (!cnoMatch) continue;

    const cno = cnoMatch[1].toUpperCase();

    let sex = 'F';
    if (cells[cnoIndex + 1]) {
      const sVal = cells[cnoIndex + 1].toUpperCase();
      if (sVal === 'M' || sVal === 'MALE' || sVal === 'KIUME') sex = 'M';
      else if (sVal === 'F' || sVal === 'FEMALE' || sVal === 'KIKE') sex = 'F';
    }

    let aggt = '-';
    if (cells[cnoIndex + 2]) {
      aggt = cells[cnoIndex + 2].trim();
    }

    let rawDiv = '-';
    if (cells[cnoIndex + 3]) {
      rawDiv = cells[cnoIndex + 3].trim();
    }
    const div = normalizeDivision(rawDiv);

    let subjectsStr = '';
    if (cells[cnoIndex + 4]) {
      subjectsStr = cells.slice(cnoIndex + 4).join(' ');
    } else {
      subjectsStr = cells.join(' ');
    }

    const subjects = parseSubjectsString(subjectsStr);

    candidates.push({
      cno,
      sex,
      aggt,
      div,
      subjects
    });
  }

  return candidates;
}

/**
 * Gemini AI Parser Fallback if regex parsing fails
 */
async function parseWithGeminiAI(
  cleanText: string,
  url: string
): Promise<{ candidates: Array<{ cno: string; sex: string; aggt: string; div: string; subjects: Record<string, string> }>; schoolName?: string; examType?: string; examYear?: string }> {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return { candidates: [] };
    }

    console.log('[NECTA Fetcher] Invoking Gemini AI fallback for url:', url);

    const prompt = `You are a NECTA (National Examinations Council of Tanzania) result page parser.
Analyze this raw NECTA text/HTML and extract all candidate results, school name, exam type, and year.

URL: ${url}
RAW CONTENT TRUNCATED:
${cleanText.slice(0, 15000)}

Return ONLY a valid JSON object matching this structure:
{
  "schoolName": "S0372 KIOMONI SECONDARY SCHOOL",
  "examType": "CSEE",
  "examYear": "2023",
  "candidates": [
    {
      "cno": "S0372/0001",
      "sex": "F",
      "aggt": "22",
      "div": "III",
      "subjects": {
        "CIV": "C",
        "HIST": "C",
        "GEO": "C",
        "KISW": "D",
        "ENGL": "C",
        "PHY": "D",
        "CHEM": "D",
        "BIO": "C",
        "B/MATH": "F"
      }
    }
  ]
}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.1
      }
    });

    const respText = response.text || '';
    const parsed = JSON.parse(respText);
    if (parsed && Array.isArray(parsed.candidates) && parsed.candidates.length > 0) {
      return {
        schoolName: parsed.schoolName,
        examType: parsed.examType,
        examYear: parsed.examYear,
        candidates: parsed.candidates
      };
    }
  } catch (err: any) {
    console.error('[NECTA Gemini Fallback Error]:', err?.message || err);
  }

  return { candidates: [] };
}

/**
 * Main function: Fetch NECTA web page and parse candidates
 */
export async function fetchAndParseNectaUrl(targetUrl: string): Promise<NectaFetchResult> {
  let url = targetUrl.trim();
  if (!url) {
    return { success: false, url: '', error: 'URL link is empty' };
  }

  // Normalize URL
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }

  // Create HTTPS agent that accepts self-signed or expired certs from NECTA server
  const httpsAgent = new https.Agent({
    rejectUnauthorized: false
  });

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9,sw;q=0.8'
  };

  let htmlContent = '';

  try {
    console.log(`[NECTA Fetcher] Attempting HTTPS fetch: ${url}`);
    const response = await axios.get(url, {
      headers,
      httpsAgent,
      timeout: 18000,
      responseType: 'text'
    });
    htmlContent = response.data;
  } catch (err1: any) {
    console.warn(`[NECTA Fetcher] HTTPS failed (${err1.message}), retrying HTTP...`);
    if (url.startsWith('https://')) {
      const httpUrl = url.replace('https://', 'http://');
      try {
        const response2 = await axios.get(httpUrl, {
          headers,
          timeout: 18000,
          responseType: 'text'
        });
        htmlContent = response2.data;
        url = httpUrl;
      } catch (err2: any) {
        console.error(`[NECTA Fetcher] HTTP fetch also failed:`, err2.message);
        return {
          success: false,
          url,
          error: `Haikuweza kufungua link ya NECTA (${err2.message}). Hakikisha server ya NECTA ipo hewani au jaribu kucopy maandishi ya matokeo kwenye ukurasa wa NECTA na kuyabandika (Paste) kwenye 'Njia ya 2: Bandika Nakala'.`
        };
      }
    } else {
      return {
        success: false,
        url,
        error: `Haikuweza kufungua link ya NECTA (${err1.message}). Hakikisha server ya NECTA ipo hewani au tumia 'Njia ya 2: Bandika Nakala'.`
      };
    }
  }

  if (!htmlContent || typeof htmlContent !== 'string') {
    return { success: false, url, error: 'Empty HTML content returned from NECTA server' };
  }

  // 1. Clean HTML
  const cleanText = cleanHtmlText(htmlContent);

  // 2. Detect details
  const { examType, examYear } = detectExamTypeAndYear(url, cleanText);
  const schoolName = extractSchoolName(cleanText);

  // 3. Try parsing HTML Table cells directly
  let candidates = parseCandidatesFromHtmlTables(htmlContent);

  // 4. If table parser found nothing, try line-by-line regex parser
  if (candidates.length === 0) {
    const lines = cleanText.split('\n').map(l => l.trim()).filter(Boolean);

    for (const line of lines) {
      const cnoMatch = line.match(/([PSs]\d{3,5}\/\d{3,4}|[A-Za-z0-9_.-]+\/\d{3,4})/i);
      if (!cnoMatch) continue;

      const cno = cnoMatch[1].toUpperCase();
      const afterCno = line.slice(line.indexOf(cnoMatch[0]) + cnoMatch[0].length).trim();

      const tokens = afterCno.split(/\s+/);
      if (tokens.length < 3) continue;

      let sex = tokens[0].toUpperCase();
      if (sex === 'FEMALE' || sex === 'KIKE') sex = 'F';
      if (sex === 'MALE' || sex === 'KIUME') sex = 'M';
      if (sex !== 'F' && sex !== 'M') sex = 'F';

      let aggt = tokens[1] || '-';
      let rawDiv = tokens[2] || '-';

      // Check if division token is compound e.g. "DIVISION THREE"
      if (rawDiv.toUpperCase() === 'DIVISION' && tokens[3]) {
        rawDiv = `DIVISION ${tokens[3]}`;
      }
      const div = normalizeDivision(rawDiv);

      const subjects = parseSubjectsString(afterCno);

      candidates.push({
        cno,
        sex,
        aggt,
        div,
        subjects
      });
    }
  }

  // 5. If both regex parsers returned 0 candidates, fallback to Gemini AI
  if (candidates.length === 0) {
    const aiResult = await parseWithGeminiAI(cleanText, url);
    if (aiResult.candidates && aiResult.candidates.length > 0) {
      candidates = aiResult.candidates;
    }
  }

  if (candidates.length === 0) {
    return {
      success: false,
      url,
      schoolName,
      examType,
      examYear,
      error: 'Haikuweza kupata orodha ya watahiniwa kutoka kwenye link uliyoweka. Hakikisha ni link ya matokeo ya shule NECTA (k.m. https://matokeo.necta.go.tz/csee2023/results/s0372.htm).'
    };
  }

  // Format canonical raw text for UI display
  const formattedRawLines = candidates.map(c => {
    const subjStr = Object.entries(c.subjects).map(([s, g]) => `${s} - ${g}`).join(' ');
    return `${c.cno} ${c.sex} ${c.aggt} ${c.div}${subjStr ? ' ' + subjStr : ''}`;
  });

  return {
    success: true,
    url,
    schoolName,
    examType,
    examYear,
    candidatesCount: candidates.length,
    rawText: formattedRawLines.join('\n'),
    candidates
  };
}
