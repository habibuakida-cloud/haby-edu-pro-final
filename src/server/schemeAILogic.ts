import { GoogleGenAI } from '@google/genai';

// Initialize Gemini client on server
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

/**
 * Robust Gemini generation with automated fallback models to prevent 503 Service Unavailable errors.
 */
async function generateWithFallback(config: {
  contents: string;
  systemInstruction?: string;
  responseMimeType?: string;
  temperature?: number;
}) {
  const models = ['gemini-3.5-flash', 'gemini-3.8-flash', 'gemini-2.5-flash', 'gemini-flash-latest'];
  let lastError = null;

  for (const model of models) {
    try {
      console.log(`[Gemini Fallback Client] Attempting generation with model: ${model}`);
      const response = await ai.models.generateContent({
        model: model,
        contents: config.contents,
        config: {
          systemInstruction: config.systemInstruction,
          responseMimeType: config.responseMimeType as any,
          temperature: config.temperature,
        }
      });
      if (response && response.text) {
        console.log(`[Gemini Fallback Client] Successfully generated content using model: ${model}`);
        return response;
      }
    } catch (err: any) {
      console.warn(`[Gemini Fallback Client] Model ${model} failed with message:`, err?.message || err);
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
  term: 'Term 1' | 'Term 2' | 'Term 3';
  teacherName?: string;
  schoolName?: string;
  periodsPerWeek?: number;
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
}

export async function generateAISchemeOfWork(req: AISchemeRequest) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is missing on server');
  }

  const prompt = `You are a Tanzanian Senior Academic Master and NECTA Curriculum Specialist.
Generate a complete, 100% authentic, highly detailed 12-week Tanzanian Scheme of Work and Teaching Log Book entries for:
- Subject: ${req.subject}
- Class Level: ${req.className}
- Curriculum System: ${req.curriculumType === 'NEW_CBC_2023' ? 'Competence-Based Curriculum (CBC 2023)' : 'Traditional Content-Based Curriculum'}
- Academic Term: ${req.term} (${req.academicYear})
- Periods Per Week: ${req.periodsPerWeek || 4}
- Teacher Name: ${req.teacherName || 'Subject Teacher'}
- School Name: ${req.schoolName || 'Tanzania Secondary School'}

CRITICAL REQUIREMENT:
- All topics, subtopics, competences, learning activities, teaching activities, materials, assessment methods, and references MUST be 100% SPECIFIC TO ${req.subject.toUpperCase()} FOR ${req.className}.
- DO NOT return Physics topics or generic templates if the subject is ${req.subject}.
- Use official TIE (Tanzania Institute of Education) textbook references for ${req.subject}.
- If ${req.subject} is Kiswahili, write the scheme details in Kiswahili. If ${req.subject} is English or Science, write in English.

Return a JSON object matching this structure:
{
  "department": "Science & Mathematics / Languages / Social Sciences / Commercial",
  "competenceSummary": "Brief overview of 12-week competence goals for ${req.subject}",
  "items": [
    {
      "weekNumber": 1,
      "datesOrMonth": "Week 1 (12 Jan - 16 Jan)",
      "mainTopicOrCompetence": "Main competence or main topic",
      "subTopicOrSpecificCompetence": "Specific competence or subtopic",
      "learningActivitiesOrObjectives": "Learner activities or specific objectives",
      "teachingActivities": "Teacher activities and instructions",
      "teachingMaterials": "Materials, equipment, and charts",
      "assessmentMethods": "Assessment rubric or exercise",
      "references": "TIE ${req.subject} for ${req.className}",
      "periodsCount": 4,
      "remarks": "Covered as scheduled"
    }
  ],
  "logBookEntries": [
    {
      "weekNumber": 1,
      "date": "2026-01-12",
      "periodTime": "Period 2 & 3 (08:40 - 10:00)",
      "subTopicTaught": "Subtopic taught",
      "workCoveredSummary": "Summary of work covered and student engagement",
      "studentsPresent": 43,
      "studentsTotal": 45,
      "comprehensionEvaluation": "EXCELLENT",
      "teacherSignature": "TR"
    }
  ]
}`;

  const response = await generateWithFallback({
    contents: prompt,
    systemInstruction: 'You are an expert Tanzanian educator producing strict JSON schemes of work adhering to TIE and NECTA curriculum standards.',
    responseMimeType: 'application/json'
  });

  const text = response.text || '';
  const parsed = JSON.parse(text);

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

  const text = response.text || '';
  const parsed = JSON.parse(text);

  return {
    success: true,
    data: parsed
  };
}
