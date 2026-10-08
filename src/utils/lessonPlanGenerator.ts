import { LessonPlan, CurriculumType, LessonPlanStep } from '../types/lessonPlan';

export interface SubjectCurriculumData {
  subject: string;
  level: 'NURSERY' | 'PRIMARY' | 'SECONDARY' | 'ADVANCED';
  topics: {
    mainTopic: string;
    subtopics: string[];
    // CBC 2023 metadata
    newCbc: {
      mainCompetence: string;
      specificCompetence: string;
      performanceCriteria: string[];
      materials: string[];
      references: string[];
      introTeacher: string;
      introLearner: string;
      devTeacher: string;
      devLearner: string;
      appTeacher: string;
      appLearner: string;
      conclTeacher: string;
      conclLearner: string;
      evaluation: string;
    };
    // Old Content-Based metadata
    oldContent: {
      generalObjective: string;
      specificObjectives: string[];
      materials: string[];
      references: string[];
      step1Intro: { teacher: string; learner: string };
      step2Presentation: { teacher: string; learner: string };
      step3Practice: { teacher: string; learner: string };
      step4Conclusion: { teacher: string; learner: string };
      evaluation: string;
    };
  }[];
}

export const SYLLABUS_KNOWLEDGE_BASE: Record<string, SubjectCurriculumData> = {
  // --- SECONDARY SUBJECTS ---
  'Physics': {
    subject: 'Physics',
    level: 'SECONDARY',
    topics: [
      {
        mainTopic: 'Force and Motion',
        subtopics: ['Newton\'s First Law of Motion', 'Newton\'s Second Law & Momentum', 'Friction in Daily Life', 'Centripetal Force'],
        newCbc: {
          mainCompetence: 'Applying concepts of force and motion to solve mechanical and safety challenges in daily activities',
          specificCompetence: 'Analyzing Newton’s Laws to determine velocity, acceleration and impact mitigation in transport systems',
          performanceCriteria: [
            'Demonstrates the inertia of stationary and moving objects using simple laboratory apparatus',
            'Calculates acceleration given net force and mass in automotive and sports contexts',
            'Explains the role of seatbelts and helmets using momentum impulse principles'
          ],
          materials: ['Dynamics trolley, inclined ramp, stopwatches, spring balances, standard weights, digital simulations'],
          references: ['TIE Physics for Secondary Schools Form 3 (Competence Based Curriculum 2023)', 'Ministry of Education Syllabus 2023'],
          introTeacher: 'Presents a real-life video scenario of a moving bus stopping abruptly. Prompts learners to hypothesize why passengers lurch forward.',
          introLearner: 'Observe the bus demonstration, engage in think-pair-share, and relate passenger movement to inertia and personal experiences.',
          devTeacher: 'Guides collaborative group stations where learners roll trolleys with varied masses and plot force-acceleration graphs on work cards.',
          devLearner: 'Work in groups of 4-5 to measure force and acceleration, record experimental readings, and calculate momentum.',
          appTeacher: 'Facilitates a design challenge: designing protective packaging for fragile eggs using shock absorption concepts.',
          appLearner: 'Construct protective prototypes, test impact survival from 1.5m height, and present findings linking to crumple zones in vehicles.',
          conclTeacher: 'Conducts interactive diagnostic recap using targeted rubric questions on momentum and force.',
          conclLearner: 'Complete self-assessment checklist and summarize key insights in science portfolios.',
          evaluation: 'Formative assessment rubric evaluating experimental measurement accuracy, graph interpretation, and real-life safety problem-solving.'
        },
        oldContent: {
          generalObjective: 'To understand the fundamental principles governing force, motion, and Newton\'s laws in classical mechanics',
          specificObjectives: [
            'Define force and state its SI unit correctly',
            'State Newton\'s first and second laws of motion precisely',
            'Solve numerical problems using F = ma'
          ],
          materials: ['Chalkboard, chalk, ruler, chart showing Newton\'s laws, spring balance'],
          references: ['TIE Physics Form 3 Traditional Syllabus', 'Principles of Physics by Nelkon & Parker'],
          step1Intro: {
            teacher: 'Reviews the definition of force from Form 2 and writes the day\'s topic on the chalkboard.',
            learner: 'Recall and define force as a push or pull, answering teacher questions orally.'
          },
          step2Presentation: {
            teacher: 'Writes Newton\'s 1st and 2nd laws on chalkboard, explains the mathematical derivation of F = ma with worked examples.',
            learner: 'Copy notes from the chalkboard, listen to teacher explanations, and ask clarifying questions on formula symbols.'
          },
          step3Practice: {
            teacher: 'Writes 3 numerical exercises on chalkboard and moves around classroom marking exercise books.',
            learner: 'Solve the chalkboard exercises individually in exercise books applying the formula F = ma.'
          },
          step4Conclusion: {
            teacher: 'Summarizes key formulas on the board, writes homework assignment of 4 questions from the textbook.',
            learner: 'Copy the homework questions into exercise books and ask for final clarifications.'
          },
          evaluation: 'End of period chalkboard exercise marking and review of assigned textbook homework.'
        }
      }
    ]
  },

  'Chemistry': {
    subject: 'Chemistry',
    level: 'SECONDARY',
    topics: [
      {
        mainTopic: 'Atomic Structure and Bonding',
        subtopics: ['Electronic Configuration', 'Ionic and Covalent Bonding', 'Periodic Table Trends', 'Valency and Oxidation Numbers'],
        newCbc: {
          mainCompetence: 'Applying chemical concepts, atomic structure, and bonding to synthesize eco-friendly substances',
          specificCompetence: 'Analyzing chemical bonding and subatomic particle arrangements',
          performanceCriteria: [
            'Constructs 3D atomic models showing electron shell distribution',
            'Compares conductivity and melting points of ionic vs covalent compounds',
            'Predicts chemical reactivity from periodic table group positions'
          ],
          materials: ['Periodic table charts, atomic model kits, clay, wire, conductivity apparatus, test tubes'],
          references: ['TIE Chemistry for Secondary Schools Form 3 (CBC 2023)', 'MoEST Chemistry Curriculum'],
          introTeacher: 'Displays sodium chloride crystals and sugar granules. Asks why salt dissolves in water and conducts electricity while sugar does not.',
          introLearner: 'Brainstorm differences in structure between salt and sugar and share prior observations.',
          devTeacher: 'Guides laboratory investigation stations testing conductivity and solubility of various compounds.',
          devLearner: 'Work in small groups to test conductivity, record observations, and construct Lewis dot diagrams.',
          appTeacher: 'Facilitates discussion on choosing appropriate chemical containers based on corrosion resistance.',
          appLearner: 'Present findings on ionic lattice strength and chemical stability in daily storage.',
          conclTeacher: 'Conducts quick exit-ticket check on valency and bonding types.',
          conclLearner: 'Fill out self-reflection cards on chemical bonding principles.',
          evaluation: 'Formative practical rubric evaluating experimental conductivity testing and atomic diagram accuracy.'
        },
        oldContent: {
          generalObjective: 'To understand atomic structure, subatomic particles, and chemical bonding principles',
          specificObjectives: [
            'Write electronic configurations for the first 20 elements',
            'Differentiate ionic bonding from covalent bonding',
            'Draw Lewis structure diagrams for simple molecules'
          ],
          materials: ['Chalkboard, periodic table wall chart, molecular models'],
          references: ['TIE Chemistry Form 3 Traditional Syllabus'],
          step1Intro: {
            teacher: 'Reviews atomic number and mass number concepts from Form 2.',
            learner: 'Answer teacher review questions on subatomic particles.'
          },
          step2Presentation: {
            teacher: 'Explains electron transfer in ionic bonds and electron sharing in covalent bonds on chalkboard.',
            learner: 'Copy notes and bonding diagrams into exercise books.'
          },
          step3Practice: {
            teacher: 'Assigns 4 bonding diagram exercises on the chalkboard.',
            learner: 'Draw Lewis structures for NaCl, MgO, H2O, and CH4 in exercise books.'
          },
          step4Conclusion: {
            teacher: 'Summarizes key differences between ionic and covalent compounds.',
            learner: 'Write assigned homework questions from textbook page 52.'
          },
          evaluation: 'Marking student exercise books and reviewing chalkboard exercises.'
        }
      },
      {
        mainTopic: 'Volumetric Analysis and Acids',
        subtopics: ['Acid-Base Titration', 'pH Scale and Indicators', 'Molarity and Concentration', 'Preparation of Salts'],
        newCbc: {
          mainCompetence: 'Synthesizing acids, bases, and salts for agricultural soil conditioning and domestic sanitation',
          specificCompetence: 'Performing volumetric analysis (titration) to determine unknown concentration',
          performanceCriteria: [
            'Reads burette meniscus accurately at eye level to ±0.05 cm³',
            'Calculates molar concentration in mol/dm³ from titration data',
            'Determines soil pH using natural plant indicators'
          ],
          materials: ['Burettes, pipettes, conical flasks, HCl solution, Na2CO3, methyl orange, universal indicator'],
          references: ['TIE Chemistry Form 3 CBC 2023', 'NECTA Chemistry Practical Guide'],
          introTeacher: 'Demonstrates color change during titration. Asks learners why precise measurement is critical in medicine and farming.',
          introLearner: 'Observe color transition at endpoint and discuss consequences of inaccurate chemical dosage.',
          devTeacher: 'Supervises individual/pair titration runs, ensuring correct burette technique and concordant titres.',
          devLearner: 'Pipette 25cm³ solution, titrate against acid until sharp endpoint, and record readings in standard tables.',
          appTeacher: 'Guides application of pH analysis to soil testing for avocado and maize farming.',
          appLearner: 'Calculate lime requirements for acidic soil based on titration readings.',
          conclTeacher: 'Reviews average titre calculations and significant figures.',
          conclLearner: 'Complete titration summary calculations in lab notebooks.',
          evaluation: 'Practical titration mark sheet evaluating burette accuracy and concentration calculations.'
        },
        oldContent: {
          generalObjective: 'To master acid-base titration procedures and molarity calculations',
          specificObjectives: [
            'Record burette readings in standard table format',
            'Calculate molarity using M1V1/n1 = M2V2/n2 formula'
          ],
          materials: ['Chalkboard, titration chart, burettes, pipettes'],
          references: ['TIE Chemistry Form 3'],
          step1Intro: {
            teacher: 'Defines acids, bases, and indicators on the chalkboard.',
            learner: 'Recall definitions of acids and bases from Form 2.'
          },
          step2Presentation: {
            teacher: 'Writes titration table format and worked calculation examples on chalkboard.',
            learner: 'Copy sample titration tables and calculation steps into notebooks.'
          },
          step3Practice: {
            teacher: 'Provides sample titration data and asks students to calculate molarity.',
            learner: 'Calculate concentration in g/dm³ and mol/dm³ individually.'
          },
          step4Conclusion: {
            teacher: 'Summarizes formula steps for volumetric analysis.',
            learner: 'Copy assigned textbook homework.'
          },
          evaluation: 'Notebook review of titration calculations.'
        }
      }
    ]
  },

  'Biology': {
    subject: 'Biology',
    level: 'SECONDARY',
    topics: [
      {
        mainTopic: 'Cell Biology and Physiology',
        subtopics: ['Plant and Animal Cells', 'Microscopy', 'Osmosis and Diffusion', 'Enzyme Activity'],
        newCbc: {
          mainCompetence: 'Investigating cellular structures, physiological processes, and biological diversity',
          specificCompetence: 'Examining cell organelle functions and light microscopy techniques',
          performanceCriteria: [
            'Prepares temporary wet mount slides of plant and animal tissue',
            'Calculates magnification of microscope drawings correctly',
            'Investigates osmosis in potato cylinders across different solution concentrations'
          ],
          materials: ['Light microscopes, glass slides, iodine, onion tissue, potato borers, sucrose solutions, digital balances'],
          references: ['TIE Biology for Secondary Schools Form 3 (CBC 2023)'],
          introTeacher: 'Displays onion epidermal cells under microscope connected to monitor screen.',
          introLearner: 'Observe cellular boundaries and nucleus, comparing with human cheek cell slides.',
          devTeacher: 'Guides potato osmometer experiment stations measuring cylinder mass changes.',
          devLearner: 'Record potato cylinder masses before and after immersion in sucrose solutions.',
          appTeacher: 'Facilitates discussion on why wilted vegetables regain crispness in clean water.',
          appLearner: 'Explain turgor pressure in plant support and crop irrigation.',
          conclTeacher: 'Conducts summary check on cell organelle functions.',
          conclLearner: 'Complete cell drawing label checklist.',
          evaluation: 'Microscopy drawing rubric and osmosis data table evaluation.'
        },
        oldContent: {
          generalObjective: 'To understand cell structures and physiological transport mechanisms',
          specificObjectives: [
            'Identify parts of light microscope',
            'Compare plant and animal cells under microscope'
          ],
          materials: ['Chalkboard, cell charts, microscope model'],
          references: ['TIE Biology Form 3 Traditional Syllabus'],
          step1Intro: {
            teacher: 'Reviews definition of cell as fundamental unit of life.',
            learner: 'Answer oral questions on cell theory.'
          },
          step2Presentation: {
            teacher: 'Draws plant and animal cells on chalkboard and lists organelle functions.',
            learner: 'Copy cell diagrams and notes from chalkboard.'
          },
          step3Practice: {
            teacher: 'Assigns comparison table exercise between plant and animal cells.',
            learner: 'Complete comparison table in exercise books.'
          },
          step4Conclusion: {
            teacher: 'Summarizes key cell organelle functions.',
            learner: 'Copy assigned homework questions.'
          },
          evaluation: 'Marking student cell diagrams and comparison tables.'
        }
      }
    ]
  },

  'Kiswahili': {
    subject: 'Kiswahili',
    level: 'SECONDARY',
    topics: [
      {
        mainTopic: 'Sarufi na Matumizi ya Lugha',
        subtopics: ['Aina za Maneno', 'Ngeli za Nomino', 'Mnyambuliko wa Vitenzi', 'Uchanganuzi wa Sentensi'],
        newCbc: {
          mainCompetence: 'Kutumia mfumo wa sarufi na muundo wa lugha ya Kiswahili katika mawasiliano sanifu',
          specificCompetence: 'Kuchanganua aina 8 za maneno na ngeli za Kiswahili katika vifungu vya habari',
          performanceCriteria: [
            'Aainisha aina za maneno katika kifungu cha habari kwa usahihi',
            'Anapatanisha kiandishi cha ngeli na kivumishi au kitenzi katika sentensi',
            'Ananyambulisha vitenzi katika kauli mbalimbali za Kiswahili'
          ],
          materials: ['Chati ya aina za maneno, chati ya ngeli, Kamusi ya Kiswahili Sanifu, vifungu vya habari'],
          references: ['TET Kiswahili Kidato cha 3 (CBC 2023)', 'BAKITA Miongozo ya Lugha'],
          introTeacher: 'Anasoma sentensi 2 zenye makosa ya kicharazo cha ngeli na kuwauliza wanafunzi kubainisha makosa.',
          introLearner: 'Kubainisha makosa ya ngeli katika sentensi zilizosomwa na kutoa sahisho.',
          devTeacher: 'Anawaongoza wanafunzi katika vikundi kuainisha aina za maneno kwenye kifungu cha habari.',
          devLearner: 'Kufanya kazi katika vikundi, kujaza jedwali la aina za maneno na kuwasilisha.',
          appTeacher: 'Anaongoza utungaji wa insha fupi akisisitiza upatanisho sahihi wa ngeli.',
          appLearner: 'Kutunga sentensi 5 sahihi zikionyesha upatanisho wa ngeli za A-WA, KI-VI, I-ZI.',
          conclTeacher: 'Anafanya muhtasari wa kanuni kuu za ngeli za Kiswahili.',
          conclLearner: 'Kukamilisha kadi ya kujitathmini kuhusu ngeli.',
          evaluation: 'Tathmini ya jedwali la aina za maneno na zoezi la upatanisho wa ngeli.'
        },
        oldContent: {
          generalObjective: 'Kuelewa aina za maneno na mfumo wa ngeli katika lugha ya Kiswahili',
          specificObjectives: [
            'Kutaja aina 8 za maneno ya Kiswahili',
            'Kupanga nomino katika ngeli sahihi'
          ],
          materials: ['Ubao, chaki, kitabu cha kiada cha TET'],
          references: ['TET Kiswahili Kidato cha 3'],
          step1Intro: {
            teacher: 'Anapitia maana ya sarufi na kulinganisha na mada iliyopita.',
            learner: 'Kujibu maswali ya mdomo ya mwalimu.'
          },
          step2Presentation: {
            teacher: 'Anaandika aina 8 za maneno ubaoni na kutoa mifano ya kila aina.',
            learner: 'Kunakili maelezo na mifano kutoka ubaoni.'
          },
          step3Practice: {
            teacher: 'Anatoa zoezi la ubaoni la kuainisha maneno 10.',
            learner: 'Kufanya zoezi la ubaoni katika daftari.'
          },
          step4Conclusion: {
            teacher: 'Anarudia kueleza tofauti kati ya nomino, vivumishi na vitenzi.',
            learner: 'Kunakili maswali ya kazi ya nyumbani.'
          },
          evaluation: 'Kusahihisha daftari za wanafunzi na kukagua majibu.'
        }
      }
    ]
  },

  'English Language': {
    subject: 'English Language',
    level: 'SECONDARY',
    topics: [
      {
        mainTopic: 'Grammar and Writing Skills',
        subtopics: ['Tenses and Agreement', 'Relative Clauses', 'Formal Letters and CVs', 'Argumentative Essays'],
        newCbc: {
          mainCompetence: 'Applying English grammar, vocabulary, and functional writing skills in academic and official communication',
          specificCompetence: 'Constructing error-free complex sentences and official correspondence',
          performanceCriteria: [
            'Writes formal application letters with accurate standard layouts',
            'Uses relative pronouns (who, which, whose, whom) correctly in sentences',
            'Constructs persuasive argumentative essays with clear thesis statements'
          ],
          materials: ['Oxford English Dictionaries, sample CVs, formal letter layout charts, work cards'],
          references: ['TIE English Language for Secondary Schools Form 3 (CBC 2023)'],
          introTeacher: 'Presents two job application letters—one poorly formatted and one professional. Asks learners to critique both.',
          introLearner: 'Compare the two letters, identifying layout flaws, tone differences, and grammatical errors.',
          devTeacher: 'Guides small group workshops drafting formal application letters for advertised positions.',
          devLearner: 'Draft job application cover letters in groups of 4 following formal layout protocols.',
          appTeacher: 'Moderates peer review editing sessions where students evaluate peer letters using a rubric.',
          appLearner: 'Edit and refine personal application letters based on peer feedback.',
          conclTeacher: 'Summarizes key components of formal communication.',
          conclLearner: 'Log writing goals in personal English portfolios.',
          evaluation: 'Writing rubric evaluating formal letter layout, grammar accuracy, and persuasive tone.'
        },
        oldContent: {
          generalObjective: 'To master English grammar rules and formal letter writing formats',
          specificObjectives: [
            'State 5 parts of a formal letter layout',
            'Construct sentences using relative pronouns correctly'
          ],
          materials: ['Chalkboard, chalk, sample letter chart'],
          references: ['TIE English Language Form 3 Traditional Syllabus'],
          step1Intro: {
            teacher: 'Reviews sentence types taught in previous lessons.',
            learner: 'Answer teacher review questions.'
          },
          step2Presentation: {
            teacher: 'Draws formal letter layout on chalkboard, explaining addresses, salutation, subject line, body, and sign-off.',
            learner: 'Copy the chalkboard layout and notes into notebooks.'
          },
          step3Practice: {
            teacher: 'Writes a letter writing prompt on the chalkboard.',
            learner: 'Write a formal letter individually in exercise books.'
          },
          step4Conclusion: {
            teacher: 'Highlights common letter writing errors observed during circulation.',
            learner: 'Copy homework exercise.'
          },
          evaluation: 'Marking written formal letters in exercise books.'
        }
      }
    ]
  }
};

/**
 * Universal dynamic lesson plan generator that works for ANY subject and ANY topic
 * (Chemistry, Biology, Geography, History, Kiswahili, English, Civics, Commerce, Bookkeeping, ICT, Agriculture, Primary subjects, etc.)
 */
export function generateAutoLessonPlan(params: {
  schoolId: string;
  schoolName: string;
  teacherName: string;
  teacherId?: number | string;
  className: string;
  stream?: string;
  subject: string;
  curriculumType: CurriculumType;
  topic: string;
  subtopic?: string;
  durationMinutes?: number;
  date?: string;
  periodNumber?: string;
  registeredStudentsCount?: number;
  presentStudentsCount?: number;
}): LessonPlan {
  const {
    schoolId,
    schoolName,
    teacherName,
    teacherId,
    className,
    stream = 'STREAM A',
    subject,
    curriculumType,
    topic,
    subtopic,
    durationMinutes = 40,
    date = new Date().toISOString().split('T')[0],
    periodNumber = 'Period 2',
    registeredStudentsCount = 45,
    presentStudentsCount = 43
  } = params;

  const normSubject = (subject || 'General Subject').trim();
  const normTopic = (topic || 'Core Subject Topic').trim();
  const resolvedSubtopic = subtopic?.trim() || `Key Concepts of ${normTopic}`;

  // 1. Search knowledge base for subject match or alias
  const subjectData = SYLLABUS_KNOWLEDGE_BASE[normSubject] || 
    Object.values(SYLLABUS_KNOWLEDGE_BASE).find(s => s.subject.toLowerCase() === normSubject.toLowerCase());

  let matchedTopic = subjectData?.topics.find(t => 
    t.mainTopic.toLowerCase().includes(normTopic.toLowerCase()) || 
    normTopic.toLowerCase().includes(t.mainTopic.toLowerCase())
  );

  const isCbc = curriculumType === 'NEW_CBC_2023';

  // 2. Build 100% subject-specific metadata if matched or fallback dynamically
  const mainCompetence = isCbc
    ? matchedTopic?.newCbc.mainCompetence || `Applying core concepts of ${normSubject} (${normTopic}) to investigate and solve real-world problems in school and community environments.`
    : undefined;

  const specificCompetence = isCbc
    ? matchedTopic?.newCbc.specificCompetence || `Analyzing ${resolvedSubtopic} through inquiry, practical investigations, and group collaboration in ${normSubject}.`
    : undefined;

  const generalObjective = !isCbc
    ? matchedTopic?.oldContent.generalObjective || `To provide learners with foundational knowledge and theoretical mastery of ${normTopic} in ${normSubject}.`
    : undefined;

  const specificObjectives = isCbc
    ? matchedTopic?.newCbc.performanceCriteria || [
        `Demonstrates clear understanding of principles governing ${resolvedSubtopic} through active group exploration`,
        `Collaborates in small groups to apply ${normTopic} principles to real-life Tanzanian scenarios`,
        `Evaluates outcomes using subject criteria and presents conclusions with confidence`
      ]
    : matchedTopic?.oldContent.specificObjectives || [
        `Define and state key terminology associated with ${resolvedSubtopic} in ${normSubject}`,
        `Explain fundamental rules, formulas or procedures related to ${normTopic}`,
        `Solve standard exercises and textbook questions accurately in exercise books`
      ];

  const teachingMaterials = isCbc
    ? matchedTopic?.newCbc.materials || [`TIE ${normSubject} textbook, work cards, charts, demonstration models, realia for ${normTopic}`]
    : matchedTopic?.oldContent.materials || [`Chalkboard, chalk, standard ${normSubject} textbook, wall chart`];

  const references = isCbc
    ? matchedTopic?.newCbc.references || [`TIE ${normSubject} for ${className} (Competence Based Curriculum - 2023)`, 'Ministry of Education, Science & Technology Curriculum Guide 2023']
    : matchedTopic?.oldContent.references || [`TIE ${normSubject} for ${className} (Traditional Content-Based Syllabus)`, 'Approved Secondary/Primary Textbook'];

  // Construct stages dynamically ensuring subject relevance
  let steps: LessonPlanStep[] = [];

  if (isCbc) {
    const cbcData = matchedTopic?.newCbc;
    steps = [
      {
        stage: 'Introduction / Utangulizi (Setting the Scene & Prior Knowledge)',
        timeMinutes: Math.round(durationMinutes * 0.15),
        teacherActivities: cbcData?.introTeacher || `Presents an engaging real-life challenge or visual scenario related to ${resolvedSubtopic} in ${normSubject}. Encourages learners to draw upon prior observations.`,
        learnerActivities: cbcData?.introLearner || `Engage in think-pair-share, brainstorm potential causes, and relate ${normTopic} to personal experiences.`,
        assessmentCriteria: `Active participation, recall of prior ${normSubject} concepts, critical curiosity`,
        teachingMedia: `Visual trigger, real object or scenario card for ${normTopic}`
      },
      {
        stage: 'Competence Development / Kujenga Umahiri (Group Inquiry & Activities)',
        timeMinutes: Math.round(durationMinutes * 0.50),
        teacherActivities: cbcData?.devTeacher || `Facilitates structured inquiry stations for ${normSubject}. Circulates among groups, offering scaffolding, targeted prompts on ${resolvedSubtopic}, and monitoring dynamics.`,
        learnerActivities: cbcData?.devLearner || `Work collaboratively in small groups of 4-5 to investigate ${resolvedSubtopic}, test hypotheses, record observations, and construct solutions on task cards.`,
        assessmentCriteria: `Collaborative problem solving in ${normSubject}, empirical data recording, logical deduction`,
        teachingMedia: `Worksheets, task cards, demonstration media for ${normTopic}`
      },
      {
        stage: 'Real-Life Application / Kutumia Umahiri (Practical Synthesis)',
        timeMinutes: Math.round(durationMinutes * 0.25),
        teacherActivities: cbcData?.appTeacher || `Guides learners to apply their newfound ${normSubject} insights to a community or school scenario. Moderates group presentations.`,
        learnerActivities: cbcData?.appLearner || `Present group conclusions, defend methodologies, and explain how ${normTopic} impacts daily community life and safety.`,
        assessmentCriteria: `Clarity of presentation, evidence-based reasoning in ${normSubject}, peer feedback receptivity`,
        teachingMedia: `Presentation charts, mini-whiteboards`
      },
      {
        stage: 'Conclusion & Assessment / Hitimisho na Tathmini Endelevu',
        timeMinutes: Math.round(durationMinutes * 0.10),
        teacherActivities: cbcData?.conclTeacher || `Administers quick exit diagnostic ticket and synthesizes core competencies achieved in ${normSubject}.`,
        learnerActivities: cbcData?.conclLearner || `Complete individual self-assessment checklist and log personal learning reflection in portfolio.`,
        assessmentCriteria: `Diagnostic exit ticket score in ${normSubject}, self-evaluation honesty`,
        teachingMedia: `Exit slips, assessment rubric`
      }
    ];
  } else {
    // Old Content Based Curriculum
    const oldData = matchedTopic?.oldContent;
    steps = [
      {
        stage: 'Step 1: Introduction (Review of Previous Lesson)',
        timeMinutes: Math.round(durationMinutes * 0.15),
        teacherActivities: oldData?.step1Intro.teacher || `Reviews previously taught ${normSubject} concepts and writes the new topic "${normTopic}" on the chalkboard.`,
        learnerActivities: oldData?.step1Intro.learner || `Answer oral review questions asked by the teacher and write the topic title in notebooks.`,
        assessmentCriteria: `Oral recall of previous ${normSubject} lesson facts`
      },
      {
        stage: 'Step 2: Presentation of New Knowledge (Teacher-Led Exposition)',
        timeMinutes: Math.round(durationMinutes * 0.45),
        teacherActivities: oldData?.step2Presentation.teacher || `Explains definitions, fundamental rules, and principles of ${resolvedSubtopic} in ${normSubject}. Writes comprehensive notes and worked examples on the chalkboard.`,
        learnerActivities: oldData?.step2Presentation.learner || `Listen attentively to teacher explanations, observe worked examples, and copy notes from the chalkboard into exercise books.`,
        assessmentCriteria: `Accurate notebook transcription and attentive listening`
      },
      {
        stage: 'Step 3: Supervised Practice & Exercises (Classwork)',
        timeMinutes: Math.round(durationMinutes * 0.25),
        teacherActivities: oldData?.step3Practice.teacher || `Writes 3-4 structured ${normSubject} questions on the board. Moves around the classroom observing students and marking exercise books.`,
        learnerActivities: oldData?.step3Practice.learner || `Solve the chalkboard exercises individually in exercise books following the teacher's model.`,
        assessmentCriteria: `Correctness of written solutions in exercise books`
      },
      {
        stage: 'Step 4: Summary, Conclusion & Homework Assignment',
        timeMinutes: Math.round(durationMinutes * 0.15),
        teacherActivities: oldData?.step4Conclusion.teacher || `Summarizes key definitions in ${normSubject}, clarifies common errors observed, and assigns textbook homework.`,
        learnerActivities: oldData?.step4Conclusion.learner || `Copy homework questions into assignment diaries and ask final clarifying questions.`,
        assessmentCriteria: `Completion of assigned homework`
      }
    ];
  }

  const evaluationStrategy = isCbc
    ? matchedTopic?.newCbc.evaluation || `Continuous formative assessment using rubric assessing: 1) Practical investigation in ${normSubject}, 2) Group collaboration, 3) Real-life contextual application.`
    : matchedTopic?.oldContent.evaluation || `Formative evaluation through marking classroom exercise books and review of assigned ${normSubject} textbook homework.`;

  const teacherRemarks = `Kipindi cha ${normSubject} (${normTopic}) kilikwenda vizuri. Wanafunzi ${presentStudentsCount} kati ya ${registeredStudentsCount} walishiriki kikamilifu. Umahiri uliokusudiwa ulijengwa kwa mafanikio.`;

  return {
    id: `plan_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    schoolId,
    teacherId,
    teacherName: teacherName || 'Subject Teacher',
    className,
    stream,
    subject: normSubject,
    curriculumType,
    date,
    timeSlot: '08:00 - 08:40',
    periodNumber,
    durationMinutes,
    registeredStudentsCount,
    presentStudentsCount,
    mainTopic: normTopic,
    subTopic: resolvedSubtopic,
    mainCompetence,
    specificCompetence,
    generalObjective,
    specificObjectives,
    teachingMaterials,
    references,
    steps,
    evaluationStrategy,
    teacherRemarks,
    isSaved: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}
