import { GoogleGenAI, ThinkingLevel } from '@google/genai';

function getAiClient() {
  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY || 'PLACEHOLDER_KEY',
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
}

/**
 * Robust Gemini generation with valid models according to gemini-api guidelines.
 * Uses gemini-3.8-flash for high quality text generation, with gemini-flash-latest and gemini-3.1-flash-lite as fallbacks.
 */
async function generateWithFallback(config: {
  contents: string;
  systemInstruction?: string;
  responseMimeType?: string;
  temperature?: number;
}) {
  const ai = getAiClient();
  const models = ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite'];
  let lastError = null;

  for (const model of models) {
    try {
      console.log(`[Gemini Client] Attempting scheme generation with model: ${model}`);
      const response = await ai.models.generateContent({
        model: model,
        contents: config.contents,
        config: {
          systemInstruction: config.systemInstruction,
          responseMimeType: config.responseMimeType as any,
          temperature: config.temperature ?? 0.3,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        }
      });
      if (response && response.text) {
        console.log(`[Gemini Client] Successfully generated scheme content using model: ${model}`);
        return response;
      }
    } catch (err: any) {
      console.warn(`[Gemini Client] Model ${model} failed with message:`, err?.message || err);
      lastError = err;
    }
  }
  throw lastError || new Error('All Gemini models in fallback sequence failed to generate content');
}

export interface AISchemeRequest {
  subject: string;
  className: string;
  stream?: string;
  curriculumType: 'NEW_CBC_2023' | 'OLD_CONTENT_2019';
  academicYear: string;
  term: 'Term 1' | 'Term 2';
  teacherName?: string;
  schoolName?: string;
  periodsPerWeek?: number;
  topics?: string[];
  language: 'Kiswahili' | 'English';
}

export interface AILessonPlanRequest {
  subject: string;
  className: string;
  stream?: string;
  topic: string;
  subtopic?: string;
  curriculumType: 'NEW_CBC_2023' | 'OLD_CONTENT_2019';
  durationMinutes?: number;
  teacherName?: string;
  schoolName?: string;
  registeredStudentsCount?: number;
  presentStudentsCount?: number;
  language: 'Kiswahili' | 'English';
}

export async function generateAISchemeOfWork(req: AISchemeRequest) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is missing on server');
  }

  const isSwahili = req.language === 'Kiswahili' || req.subject.toLowerCase().includes('kiswahili');
  const isCbc = req.curriculumType === 'NEW_CBC_2023';

  const systemInstruction = `You are a Tanzanian Senior Academic Master, National Curriculum Developer, and Chief Inspector of Schools specializing in Taasisi ya Elimu Tanzania (TIE) and NECTA curriculum frameworks.
You generate 100% authentic, realistic, detailed Tanzanian Schemes of Work (Azimio la Kazi) and Teaching Log Book entries (Daftari la Kumbukumbu ya Kazi ya Kufundisha).

CRITICAL AUTHENTICITY RULES:
1. CURRICULUM SYLLABUS ALIGNMENT:
   - For secondary schools (Form 1 - Form 4): Strictly follow the official TIE syllabus for ${req.subject} at ${req.className} level for ${req.term}.
   - For primary schools (Standard 1 - 7): Strictly follow the TIE primary syllabus guidelines (Wizara ya Elimu, Sayansi na Teknolojia).
   - If curriculum is Competence-Based (NEW_CBC_2023), use authentic "Main Competence / Umahiri Mkuu" and "Specific Competence / Umahiri Mahususi".
   - If curriculum is Traditional Content-Based (OLD_CONTENT_2019), use authentic "Main Topic / Mada Kuu" and "Subtopic / Mada Ndogo" with specific instructional objectives.
2. NO GENERIC OR REPETITIVE PLACEHOLDERS:
   - Every single week (Weeks 1 to 12) MUST have real, non-duplicate, logically progressing topics from the official Tanzanian syllabus for that specific Form/Class and Term.
   - Week 8 is typically Midterm Assessment / Examination and revision.
   - Week 12 is Terminal Assessment / Examination and closure.
   - DO NOT copy Physics or other subjects' topics when generating for Mathematics, Kiswahili, English, Biology, Chemistry, Geography, History, Civics, Commerce, or Bookkeeping!
3. AUTHENTIC LOCAL MATERIALS & REAL REFERENCES:
   - Use real Tanzanian teaching aids (e.g. geometric sets, local soil samples, maps of Tanzania, LUKU receipts, TIE wall charts, microscopes, red cabbage indicator, dictionary of Kiswahili Sanifu).
   - Official TIE textbook references must cite real books: e.g. "Kitabu cha Mwanafunzi cha ${req.subject} Kidato cha ${req.className.replace(/[^0-9]/g, '') || '1'} (TET)", "TIE ${req.subject} for Secondary Schools Form ${req.className.replace(/[^0-9]/g, '') || '1'}", "NECTA Syllabus Guidelines".
4. LANGUAGE:
   - If language is "Kiswahili", ALL fields (competences, activities, materials, assessment, remarks, logbook entries) MUST be written in natural, grammatically correct Tanzanian educational Kiswahili.
   - If language is "English", write in professional pedagogical English adhering to Tanzanian syllabus standards.
5. STRICT JSON OUTPUT ONLY:
   - Output valid JSON only, without markdown backticks or commentary outside JSON.`;

  const prompt = `Generate a complete, 100% realistic 12-week Tanzanian Scheme of Work and Teaching Log Book for:
- Subject: ${req.subject}
- Class Level: ${req.className}
- Stream: ${req.stream || 'STREAM A'}
- Curriculum System: ${isCbc ? 'Competence-Based Curriculum (New CBC 2023)' : 'Traditional Content-Based Curriculum'}
- Academic Term: ${req.term} (${req.academicYear})
- Periods Per Week: ${req.periodsPerWeek || 4}
- Teacher Name: ${req.teacherName || 'Subject Teacher'}
- School Name: ${req.schoolName || 'Tanzania Secondary School'}
- Language Required: ${req.language}
${req.topics && req.topics.length > 0 ? `- Specific Topics Requested to Cover: ${req.topics.join(', ')}` : '- Cover the official TIE syllabus sequence for this subject and term.'}

Return JSON with exact structure:
{
  "department": "Science & Mathematics / Lugha na Fasihi / Sayansi za Jamii / Biashara",
  "competenceSummary": "Detailed summary of core competence goals for ${req.subject} in ${req.className} ${req.term}",
  "items": [
    {
      "weekNumber": 1,
      "datesOrMonth": "Week 1 (12 Jan - 16 Jan)",
      "mainTopicOrCompetence": "Realistic Main Competence / Topic from TIE syllabus",
      "subTopicOrSpecificCompetence": "Realistic Specific Competence / Subtopic",
      "learningActivitiesOrObjectives": "Concrete student-centred learner activities",
      "teachingActivities": "Concrete pedagogical teacher activities",
      "teachingMaterials": "Realistic Tanzanian teaching aids and materials",
      "assessmentMethods": "Authentic assessment methods (e.g. rubriki, zoezi la darasani, kazi ya nyumbani)",
      "references": "Official TIE textbook title and page/unit for ${req.subject} ${req.className}",
      "periodsCount": ${req.periodsPerWeek || 4},
      "remarks": "Imefundishwa kama ilivyopangwa / Covered as scheduled"
    }
  ],
  "logBookEntries": [
    {
      "weekNumber": 1,
      "date": "2026-01-12",
      "periodTime": "Period 2 & 3 (08:40 - 10:00)",
      "subTopicTaught": "Subtopic taught during this session",
      "workCoveredSummary": "Realistic summary of concepts delivered and students' classroom engagement",
      "studentsPresent": 43,
      "studentsTotal": 45,
      "comprehensionEvaluation": "EXCELLENT",
      "teacherSignature": "TR"
    }
  ]
}
Provide exactly 12 weekly items (Week 1 through Week 12) and 12 corresponding weekly log book entries.`;

  const response = await generateWithFallback({
    contents: prompt,
    systemInstruction,
    responseMimeType: 'application/json'
  });

  const text = (response.text || '').trim();
  // Strip code block fences if present
  const cleanJson = text.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
  const parsed = JSON.parse(cleanJson);

  return {
    success: true,
    data: parsed
  };
}

export async function generateAILessonPlan(req: AILessonPlanRequest) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is missing on server');
  }

  const prompt = `You are a Tanzanian Master Teacher and NECTA Curriculum Specialist.
Generate a complete, highly detailed Tanzanian Lesson Plan for:
- Subject: ${req.subject}
- Class Level: ${req.className}
- Topic: ${req.topic}
- Subtopic: ${req.subtopic || 'General Subtopic'}
- Curriculum System: ${req.curriculumType === 'NEW_CBC_2023' ? 'Competence-Based Curriculum (CBC 2023)' : 'Traditional Content-Based Curriculum'}
- Duration: ${req.durationMinutes || 40} minutes
- Teacher Name: ${req.teacherName || 'Subject Teacher'}
- School Name: ${req.schoolName || 'Tanzania School'}

CRITICAL REQUIREMENT:
- Content MUST be 100% SPECIFIC TO ${req.subject.toUpperCase()} and topic "${req.topic}".
- DO NOT return Physics content for non-Physics subjects.
- Use official TIE (Tanzania Institute of Education) textbook references for ${req.subject}.
- If ${req.subject} is Kiswahili, write the lesson plan details in Kiswahili. If English or Science, write in English.

Return a JSON object matching this structure:
{
  "mainCompetence": "Main competence statement",
  "specificCompetence": "Specific competence statement",
  "generalObjective": "General objective if old curriculum",
  "specificObjectives": ["Objective 1", "Objective 2", "Objective 3"],
  "teachingMaterials": ["Material 1", "Material 2"],
  "references": ["TIE ${req.subject} for ${req.className}"],
  "evaluationStrategy": "Evaluation strategy and rubrics",
  "teacherRemarks": "Kipindi kilikwenda vizuri...",
  "steps": [
    {
      "stage": "Introduction / Utangulizi",
      "timeMinutes": 6,
      "teacherActivities": "Teacher activity...",
      "learnerActivities": "Learner activity...",
      "assessmentCriteria": "Assessment criteria...",
      "teachingMedia": "Media..."
    },
    {
      "stage": "Competence Development / Kujenga Umahiri",
      "timeMinutes": 20,
      "teacherActivities": "Teacher activity...",
      "learnerActivities": "Learner activity...",
      "assessmentCriteria": "Assessment criteria...",
      "teachingMedia": "Media..."
    },
    {
      "stage": "Real-Life Application / Kutumia Umahiri",
      "timeMinutes": 10,
      "teacherActivities": "Teacher activity...",
      "learnerActivities": "Learner activity...",
      "assessmentCriteria": "Assessment criteria...",
      "teachingMedia": "Media..."
    },
    {
      "stage": "Conclusion & Assessment / Hitimisho",
      "timeMinutes": 4,
      "teacherActivities": "Teacher activity...",
      "learnerActivities": "Learner activity...",
      "assessmentCriteria": "Assessment criteria...",
      "teachingMedia": "Media..."
    }
  ]
}`;

  const response = await generateWithFallback({
    contents: prompt,
    systemInstruction: 'You are an expert Tanzanian educator producing strict JSON lesson plans adhering to TIE and NECTA curriculum standards.',
    responseMimeType: 'application/json'
  });

  const text = (response.text || '').trim();
  const cleanJson = text.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
  const parsed = JSON.parse(cleanJson);

  return {
    success: true,
    data: parsed
  };
}
