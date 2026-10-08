import axios from 'axios';

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

/**
 * Clean HTML tags and entities
 */
function cleanHtmlText(html: string): string {
  return html
    .replace(/<script\b[^<]*>([\s\S]*?)<\/script>/gi, '')
    .replace(/<style\b[^<]*>([\s\S]*?)<\/style>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/tr>/gi, '\n')
    .replace(/<\/td>/gi, ' ')
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
 * Detect Exam Type and Year from URL or page text
 */
function detectExamTypeAndYear(url: string, text: string): { examType: string; examYear: string } {
  let examType = 'CSEE';
  let examYear = new Date().getFullYear().toString();

  const urlLower = url.toLowerCase();
  const textUpper = text.toUpperCase();

  // Detect exam type
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

  // Detect year (4 digits e.g. 2023, 2024, 2022, 2025)
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
  // Common NECTA formats:
  // "S0372 KIOMONI SECONDARY SCHOOL"
  // "P0372 MBEYA SECONDARY SCHOOL"
  // "S1234 MAENDELEO SECONDARY SCHOOL RESULTS"
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
 * Main function: Fetch NECTA web page and parse candidates
 */
export async function fetchAndParseNectaUrl(targetUrl: string): Promise<NectaFetchResult> {
  let url = targetUrl.trim();
  if (!url) {
    return { success: false, url: '', error: 'URL link is empty' };
  }

  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }

  try {
    console.log(`[NECTA Fetcher] Fetching URL: ${url}`);

    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,sw;q=0.8'
      },
      timeout: 20000,
      responseType: 'text'
    });

    const htmlContent = response.data;
    if (!htmlContent || typeof htmlContent !== 'string') {
      return { success: false, url, error: 'Empty response returned from NECTA server' };
    }

    // Clean HTML to text
    const cleanText = cleanHtmlText(htmlContent);

    // Detect details
    const { examType, examYear } = detectExamTypeAndYear(url, cleanText);
    const schoolName = extractSchoolName(cleanText);

    // Parse candidate lines
    const lines = cleanText.split('\n').map(l => l.trim()).filter(Boolean);
    const candidates: Array<{ cno: string; sex: string; aggt: string; div: string; subjects: Record<string, string> }> = [];
    const formattedRawLines: string[] = [];

    for (const line of lines) {
      // Look for candidate number e.g. S0372/0001, P0372/0001, PS0102034/001
      const cnoMatch = line.match(/([PSs]\d{3,5}\/\d{3,4}|[A-Za-z0-9_.-]+\/\d{3,4})/i);
      if (!cnoMatch) continue;

      const cno = cnoMatch[1].toUpperCase();
      const afterCno = line.slice(line.indexOf(cnoMatch[0]) + cnoMatch[0].length).trim();

      const tokens = afterCno.split(/\s+/);
      if (tokens.length < 3) continue;

      let sex = tokens[0].toUpperCase();
      if (sex === 'FEMALE' || sex === 'KIKE') sex = 'F';
      if (sex === 'MALE' || sex === 'KIUME') sex = 'M';
      if (sex !== 'F' && sex !== 'M') sex = 'F'; // fallback

      let aggt = tokens[1] || '-';
      let div = tokens[2]?.toUpperCase() || '-';

      // Extract subjects
      const subjectIndex = afterCno.indexOf(div);
      const subjectsPart = subjectIndex !== -1 ? afterCno.slice(subjectIndex + div.length) : afterCno;

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

      // Format canonical line
      const subjStr = Object.entries(subjects).map(([s, g]) => `${s} - ${g}`).join(' ');
      const rawLine = `${cno} ${sex} ${aggt} ${div}${subjStr ? ' ' + subjStr : ''}`;

      candidates.push({
        cno,
        sex,
        aggt,
        div,
        subjects
      });

      formattedRawLines.push(rawLine);
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

  } catch (error: any) {
    console.error(`[NECTA Fetcher Error] Failed to fetch ${url}:`, error.message);
    return {
      success: false,
      url,
      error: `Hitilafu wakati wa kufungua link ya NECTA: ${error.message || 'Network timeout or NECTA server unreachable'}. Jaribu kucopy maandishi ya ukurasa na kuyabandika (Paste) kwenye sehemu ya Maandishi.`
    };
  }
}
