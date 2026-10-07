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
      },
      {
        mainTopic: 'Current Electricity',
        subtopics: ['Ohm\'s Law & Electrical Resistance', 'Series and Parallel Circuits', 'Electric Power and Domestic Heating', 'Electrical Safety Devices'],
        newCbc: {
          mainCompetence: 'Designing and diagnosing sustainable electrical circuits and power management systems',
          specificCompetence: 'Constructing series and parallel circuits to optimize power consumption in domestic and rural environments',
          performanceCriteria: [
            'Assembles operational domestic lighting circuits with switches, fuses, and bulbs',
            'Investigates the relationship between voltage, current, and resistance experimentally',
            'Calculates monthly electricity consumption and costs based on kilowatt-hour tariffs'
          ],
          materials: ['Dry cells, ammeters, voltmeters, rheostats, connecting wires, bulbs, fuses, digital multimeters'],
          references: ['TIE Secondary Physics Form 3 (CBC 2023)', 'Tanzania National Energy Policy & School Science Guide 2023'],
          introTeacher: 'Demonstrates a flashlight that fails to light. Asks learners to diagnose possible faults collaboratively.',
          introLearner: 'Suggest diagnostic steps (battery polarity, broken filament, open switch) based on prior circuit knowledge.',
          devTeacher: 'Facilitates a hands-on circuit workshop. Instructs groups to wire series vs parallel configurations and record bulb brightness and currents.',
          devLearner: 'Assemble circuit boards, connect multimeters, record V-I readings, and graph current versus voltage.',
          appTeacher: 'Challenges groups to design a low-cost solar-powered wiring scheme for a 3-room rural home with independent light switches.',
          appLearner: 'Draft wiring blueprints, justify parallel wiring over series for independent switching, and present to class.',
          conclTeacher: 'Synthesizes circuit rules through a peer assessment gallery walk.',
          conclLearner: 'Review peers\' solar circuit designs, offer constructive feedback, and log reflections.',
          evaluation: 'Practical circuit construction rubric, accurate multimeter data recording, and oral defense of solar domestic design.'
        },
        oldContent: {
          generalObjective: 'To understand the laws of electrical current, resistance, and circuit configurations',
          specificObjectives: [
            'State Ohm\'s law in words and formula (V = IR)',
            'Distinguish between series and parallel connection of resistors',
            'Calculate equivalent resistance in series and parallel networks'
          ],
          materials: ['Chalkboard, colored chalk, circuit diagram charts, textbook'],
          references: ['TIE Physics Book 3 (Old Syllabus)', 'Secondary School Physics Syllabus 2010'],
          step1Intro: {
            teacher: 'Writes title on the board and asks pupils to define electric current.',
            learner: 'Pupils state definition of current as rate of flow of electric charges.'
          },
          step2Presentation: {
            teacher: 'Explains Ohm\'s law, writes formula V = IR, and derives formulas for equivalent resistances R_eq = R1 + R2 and 1/R_eq = 1/R1 + 1/R2.',
            learner: 'Listen attentively, take structured notes, and copy circuit diagrams.'
          },
          step3Practice: {
            teacher: 'Assigns 4 calculation problems on chalkboard involving parallel resistors.',
            learner: 'Solve problems individually in exercise books using the chalkboard formulas.'
          },
          step4Conclusion: {
            teacher: 'Solves problem 1 on the board and assigns textbook questions 5 to 8 for homework.',
            learner: 'Verify their steps against the chalkboard solution and copy homework.'
          },
          evaluation: 'Teacher marks 10 exercise books in class and assigns grades.'
        }
      }
    ]
  },

  'Basic Mathematics': {
    subject: 'Basic Mathematics',
    level: 'SECONDARY',
    topics: [
      {
        mainTopic: 'Linear Equations and Inequalities',
        subtopics: ['Formulating Linear Equations from Word Problems', 'Solving Simultaneous Equations', 'Linear Inequalities in One Unknown', 'Graphical Representation of Inequalities'],
        newCbc: {
          mainCompetence: 'Applying algebraic reasoning to optimize budgeting, commercial trade, and resource distribution',
          specificCompetence: 'Modeling everyday commercial transactions as linear equations and graphical feasible regions',
          performanceCriteria: [
            'Translates market purchasing scenarios into multi-variable linear equations',
            'Solves simultaneous equations using elimination, substitution, and graphical methods',
            'Interprets inequality boundary lines in terms of resource limits and budget caps'
          ],
          materials: ['Graph paper, rulers, commercial case study cards, market price lists, tablets/smartphones with GeoGebra'],
          references: ['TIE Basic Mathematics for Secondary Schools (CBC 2023)', 'NECTA Mathematics Learning Competencies 2023'],
          introTeacher: 'Presents a local market scenario: buying pens and exercise books with 15,000 TZS. Asks how many of each can be purchased.',
          introLearner: 'Brainstorm combinations of pens and books that fit within the budget, sharing varied solutions.',
          devTeacher: 'Guides learners through step-by-step mathematical formalization into algebraic expressions (e.g. 500x + 1200y <= 15000).',
          devLearner: 'Collaborate in pairs to write equations, substitute test values, and construct coordinate graphs representing allowable purchase zones.',
          appTeacher: 'Sets a school tuck shop optimization task: balancing stock purchases to maximize student satisfaction under budget.',
          appLearner: 'Calculate break-even point and optimal inventory pairs using simultaneous equation elimination.',
          conclTeacher: 'Facilitates a quick 3-question peer diagnostic exit ticket.',
          conclLearner: 'Solve exit ticket problem on mini-whiteboards and display answers simultaneously.',
          evaluation: 'Rubric evaluating accurate algebraic translation of real-world contexts, algebraic solving steps, and graphical interpretation.'
        },
        oldContent: {
          generalObjective: 'To master the algebraic methods for solving linear and simultaneous equations',
          specificObjectives: [
            'Define a linear equation in two variables',
            'Solve pairs of simultaneous linear equations by substitution method',
            'Solve pairs of simultaneous linear equations by elimination method'
          ],
          materials: ['Chalkboard, chalk, geometrical instruments, textbook'],
          references: ['TIE Basic Mathematics Form 2', 'Secondary School Mathematics Syllabus 2005'],
          step1Intro: {
            teacher: 'Writes topic on board and reviews solving simple linear equations in one unknown (e.g., 2x + 4 = 10).',
            learner: 'Solve 2x + 4 = 10 on the chalkboard when called upon by the teacher.'
          },
          step2Presentation: {
            teacher: 'Explains substitution method step-by-step: making one variable the subject and substituting into the second equation.',
            learner: 'Follow teacher explanations and copy worked examples 1 and 2 into notebooks.'
          },
          step3Practice: {
            teacher: 'Assigns 3 simultaneous equations on the board for learners to solve using substitution.',
            learner: 'Work silently in exercise books solving the given equations.'
          },
          step4Conclusion: {
            teacher: 'Summarizes common errors noted in learners\' notebooks and assigns Exercises 4.2 questions 1-5.',
            learner: 'Note corrective remarks and write down the assigned homework numbers.'
          },
          evaluation: 'Check learners\' notebooks and mark homework submissions.'
        }
      },
      {
        mainTopic: 'Statistics and Data Presentation',
        subtopics: ['Data Collection and Frequency Distribution Tables', 'Mean, Median and Mode for Grouped Data', 'Histograms and Frequency Polygons', 'Cumulative Frequency Curve (Ogive)'],
        newCbc: {
          mainCompetence: 'Collecting, interpreting, and communicating data to make informed social and economic decisions',
          specificCompetence: 'Analyzing community demographic and environmental data to recommend interventions',
          performanceCriteria: [
            'Designs structured survey tools to gather school or community health and attendance data',
            'Constructs accurate grouped frequency distributions and histograms',
            'Interprets measures of central tendency to evaluate school performance trends'
          ],
          materials: ['Real school attendance registers, graph sheets, survey questionnaires, rulers, calculators'],
          references: ['TIE Secondary Mathematics CBC 2023', 'National Bureau of Statistics (NBS) Educational Data Guide'],
          introTeacher: 'Shares anonymous exam scores of two classes. Asks: Which class performed better and how do you justify it mathematically?',
          introLearner: 'Analyze the datasets, realizing that simple averages do not tell the full story without looking at spread and median.',
          devTeacher: 'Directs group inquiry where each group receives authentic school attendance data to group into intervals and calculate median and modal classes.',
          devLearner: 'Compute class intervals, calculate frequency densities, draw histograms on graph paper, and determine modal values.',
          appTeacher: 'Asks groups to act as District Education Officers: prepare a 2-minute visual briefing on student attendance drop-off during harvest seasons.',
          appLearner: 'Present statistical graphs and policy recommendations to the classroom acting as municipal education committee.',
          conclTeacher: 'Reviews key statistical misconceptions and facilitates reflective feedback.',
          conclLearner: 'State one key takeaway on how data prevents bias in decision-making.',
          evaluation: 'Assessment of data grouping accuracy, precision of graphical presentation, and evidence-based analytical conclusions.'
        },
        oldContent: {
          generalObjective: 'To understand the methods of computing central tendencies from statistical distributions',
          specificObjectives: [
            'Define mean, median, and mode for grouped data',
            'Compute the assumed mean and actual mean of grouped data',
            'Draw a histogram and use it to estimate the mode'
          ],
          materials: ['Chalkboard, chalk, ruler, graph board, statistical tables'],
          references: ['TIE Basic Mathematics Form 4', 'Traditional Mathematics Curriculum Guide'],
          step1Intro: {
            teacher: 'Reviews calculation of mean for ungrouped data from Form 1.',
            learner: 'Calculate mean of 5 numbers orally.'
          },
          step2Presentation: {
            teacher: 'Draws a frequency distribution table on board, explains the formula Mean = Sum(fx) / Sum(f) with detailed columns.',
            learner: 'Copy the frequency table and formulas into exercise books.'
          },
          step3Practice: {
            teacher: 'Writes a grouped data table on board and instructs pupils to calculate the mean.',
            learner: 'Compute fx values and calculate the mean in their notebooks.'
          },
          step4Conclusion: {
            teacher: 'Recaps calculation steps and assigns 3 questions from textbook Exercise 6.1.',
            learner: 'Copy homework questions into notebooks.'
          },
          evaluation: 'Inspection of student calculations on chalkboard and marking homework.'
        }
      }
    ]
  },

  'English Language': {
    subject: 'English Language',
    level: 'SECONDARY',
    topics: [
      {
        mainTopic: 'Expressing Opinions and Debating',
        subtopics: ['Formulating Arguments with Evidence', 'Agreeing and Disagreeing Politely', 'Formal Debate Procedures', 'Writing Argumentative Essays'],
        newCbc: {
          mainCompetence: 'Communicating critically and persuasively in formal, social, and academic settings',
          specificCompetence: 'Engaging in constructive oral debates and writing coherent persuasive texts on contemporary issues',
          performanceCriteria: [
            'Uses discourse markers (Furthermore, However, On the contrary) appropriately in spoken and written speech',
            'Formulates well-grounded points supported by evidence rather than emotion',
            'Employs polite expressions to challenge differing viewpoints respectfully'
          ],
          materials: ['Debate topic cue cards, audio recording of parliamentary debate, speech transcript worksheets'],
          references: ['TIE English for Secondary Schools Form 3 (CBC 2023)', 'Curriculum Development Framework 2023'],
          introTeacher: 'Plays a 1-minute audio clip of an effective speech. Asks: What makes this speaker convincing?',
          introLearner: 'Listen actively, identify tone, word choice, and structure, and share observations.',
          devTeacher: 'Structures a parliamentary mini-debate: "Artificial Intelligence in Education: Catalyst or Hindrance?" Assigns Proposition and Opposition.',
          devLearner: 'Collaborate in teams of 4 to draft opening arguments, counter-arguments, and concluding remarks using debate scaffolds.',
          appTeacher: 'Moderates a 15-minute structured classroom debate with student timekeepers and peer judges using a rubric.',
          appLearner: 'Deliver 2-minute floor speeches, offer points of information, and refute opposing arguments politely.',
          conclTeacher: 'Provides formative feedback highlighting persuasive language techniques and constructive speech delivery.',
          conclLearner: 'Self-assess speech delivery against the rubric and write a 5-sentence personal summary.',
          evaluation: 'Oral debate rubric assessing vocabulary range, grammatical accuracy, respectful disagreement, and logical coherence.'
        },
        oldContent: {
          generalObjective: 'To develop student vocabulary and grammatical competence in expressing opinions',
          specificObjectives: [
            'List at least 5 phrases used to express agreement and disagreement',
            'Construct 6 sentences using connectors of contrast (however, although, in spite of)',
            'Write a 3-paragraph composition expressing an opinion on a chosen topic'
          ],
          materials: ['Chalkboard, chalk, English textbook, flashcards'],
          references: ['TIE English for Secondary Schools Book 3', 'Secondary English Syllabus 2005'],
          step1Intro: {
            teacher: 'Writes phrases on the chalkboard: "In my opinion...", "I strongly believe..." and asks pupils to complete them.',
            learner: 'Read the sentence stems aloud and provide oral examples.'
          },
          step2Presentation: {
            teacher: 'Explains grammar rules for contrast connectors (although + clause, despite + noun phrase). Writes model sentences on the board.',
            learner: 'Copy model sentences into notebooks and note the punctuation rules.'
          },
          step3Practice: {
            teacher: 'Writes 5 sentences on the board with blanks for pupils to fill in the correct connector.',
            learner: 'Complete the exercise in their notebooks individually.'
          },
          step4Conclusion: {
            teacher: 'Reads the correct answers for self-marking and assigns a 150-word argumentative composition for homework.',
            learner: 'Mark their own books and write the composition topic in their assignment diaries.'
          },
          evaluation: 'Classwork notebook marking and correction of composition drafts.'
        }
      }
    ]
  },

  'Kiswahili': {
    subject: 'Kiswahili',
    level: 'SECONDARY',
    topics: [
      {
        mainTopic: 'Uandishi wa Insha na Mawasiliano Rasmi',
        subtopics: ['Insha ya Mdahalo na Hoja', 'Barua Rasmi ya Kikazi', 'Tawasifu na Wasifu Kazi (CV)', 'Hotuba Rasmi'],
        newCbc: {
          mainCompetence: 'Kutumia Kiswahili fasaha katika mawasiliano rasmi, uongozi na utetezi wa kijamii',
          specificCompetence: 'Kubuni na kuandika barua rasmi na tawasifu zenye viwango vya kitaalamu kwa ajili ya fursa za kimaendeleo',
          performanceCriteria: [
            'Anaandika barua rasmi yenye muundo sahihi (anwani, kumbukumbu, kichwa cha habari, hitimisho)',
            'Anatumia lugha ya staha, kauli thabiti na msamiati unaofaa muktadha wa kiofisi',
            'Anabuni wasifu kazi (CV) unaoakisi ujuzi na umahiri wake kwa ufasaha'
          ],
          materials: ['Sampuli za barua rasmi za wizara, kadi za uchambuzi wa miundo ya barua, chati za kanuni za uandishi'],
          references: ['Taasisi ya Elimu Tanzania (TET) - Kiswahili Kidato cha 3 (Mtaala wa Umahiri 2023)', 'Mwongozo wa Uandishi Fasaha wa Kiswahili'],
          introTeacher: 'Anasambaza sampuli mbili za barua: moja yenye makosa mengi ya kimuundo na nyingine fasaha. Anawauliza wanafunzi wazitathmini.',
          introLearner: 'Wanasoma sampuli hizo kwa makundi madogo, wanabainisha tofauti na kueleza ni barua ipi itakayokubalika na mwajiri.',
          devTeacher: 'Anaongoza uchambuzi wa sehemu 8 muhimu za barua rasmi kupitia mbinu shirikishi ya mti wa mawazo (concept mapping).',
          devLearner: 'Wanafunzi wanajadili katika jozi na kujaza sehemu za barua kwenye kadi za kazi zilizotolewa.',
          appTeacher: 'Anatoa hali halisi: Shule inahitaji ukarabati wa maabara ya sayansi. Andika barua rasmi kwa Mkurugenzi wa Halmashauri kuomba ufadhili.',
          appLearner: 'Kila mwanafunzi anaandika barua rasmi kulingana na kanuni zilizojadiliwa na kubadilishana na mwenzake kwa uhariri (peer review).',
          conclTeacher: 'Anakusanya hoja kuu na kutoa mwongozo wa marekebisho ya makosa yaliyojitokeza mara kwa mara.',
          conclLearner: 'Wanafunzi wanarekebisha kazi zao kulingana na mrejesho na kuhifadhi nakala kwenye jalada la somo.',
          evaluation: 'Kigezo cha tathmini (rubric) kinachopima muundo, usahihi wa sarufi na uakifishaji, na ushawishi wa ujumbe.'
        },
        oldContent: {
          generalObjective: 'Kumwezesha mwanafunzi kuelewa muundo na kanuni za uandishi wa barua rasmi',
          specificObjectives: [
            'Kutaja sehemu nane za barua rasmi',
            'Kueleza umuhimu wa anwani mbili na kumbukumbu namba',
            'Kuandika barua rasmi ya kuomba kazi kwa kufuata kanuni'
          ],
          materials: ['Ubao wa chaki, chaki za rangi, chati ya muundo wa barua rasmi, kitabu cha kiada'],
          references: ['TET Kiswahili Kidato cha Tatu (Mtaala wa Zamani)', 'Sarufi na Fasihi ya Sekondari'],
          step1Intro: {
            teacher: 'Mwalimu anaandika kichwa cha somo ubaoni na kuuliza tofauti kati ya barua ya kirafiki na barua rasmi.',
            learner: 'Wanafunzi wanajibu kwa kutoa sifa za barua ya kirafiki walizojifunza kidato cha kwanza.'
          },
          step2Presentation: {
            teacher: 'Mwalimu anachora muundo wa barua rasmi ubaoni na kufafanua kila sehemu kuanzia anwani hadi saini.',
            learner: 'Wanafunzi wanasikiliza maelezo na kunakili muundo kwenye madaftari yao.'
          },
          step3Practice: {
            teacher: 'Mwalimu anawaagiza wanafunzi waandike barua rasmi ya kuomba ruhusa ya likizo fupi darasani.',
            learner: 'Wanafunzi wanaandika barua hiyo kimya kimya kwenye madaftari yao.'
          },
          step4Conclusion: {
            teacher: 'Mwalimu anapitia madaftari kadhaa na kutoa kazi ya nyumbani ya kuandika barua ya kuomba nafasi ya kidato cha tano.',
            learner: 'Wanafunzi wanakili kazi ya nyumbani kwenye madaftari.'
          },
          evaluation: 'Kusahihisha madaftari darasani na kutoa alama za insha.'
        }
      }
    ]
  },

  // --- PRIMARY SUBJECTS ---
  'Science and Technology': {
    subject: 'Science and Technology',
    level: 'PRIMARY',
    topics: [
      {
        mainTopic: 'Living Things and Environment',
        subtopics: ['Plant Structure and Photosynthesis', 'Animals and Their Habitats', 'Waste Management and Recycling', 'Clean Water Purification'],
        newCbc: {
          mainCompetence: 'Kutunza mazingira na kutumia rasilimali asilia kwa uendelevu na ubunifu',
          specificCompetence: 'Kubuni mbinu za kusafisha maji na kutengeneza mboji kutokana na taka za nyumbani',
          performanceCriteria: [
            'Anatambua sehemu kuu za mmea na kazi zake kwa kutumia mimea halisi ya shuleni',
            'Anatengeneza chujio rahisi la maji kwa kutumia mchanga, mawe madogo na mkaa',
            'Anashiriki kupanga taka kulingana na zile zinazooza na zisizooza'
          ],
          materials: ['Chupa za plastiki zilizokatwa, mchanga safi, kokoto, mkaa uliosagwa, maji machafu ya mfano, mimea michanga'],
          references: ['TET Sayansi na Teknolojia Darasa la 5 (Mtaala Mpya 2023)', 'Mwongozo wa Walimu wa Umahiri wa Shule za Msingi'],
          introTeacher: 'Mwalimu anaonesha bilauri mbili: moja ina maji safi na nyingine maji ya tope. Anauliza: Ungewezaje kufanya maji haya yafae kwa matumizi?',
          introLearner: 'Wanafunzi wanajadili kwa msisimko na kupendekeza njia kama kuchuja na kuchemsha.',
          devTeacher: 'Mwalimu anaongoza vikundi kutengeneza chujio la asili kwa kupanga tabaka za mawe, mchanga na mkaa ndani ya nusu-chupa.',
          devLearner: 'Wanafunzi wanapanga tabaka, wanamimina maji ya tope, na wanashangaa kuona maji safi yakitoka chini ya chupa.',
          appTeacher: 'Anawahimiza wanafunzi kueleza jinsi mbinu hii inavyoweza kusaidia kaya zao wakati wa mvua za mafuriko.',
          appLearner: 'Wanafunzi wanajaza jedwali la kulinganisha matokeo na kubuni kanuni za usafi wa mazingira ya shule.',
          conclTeacher: 'Anaratibu usafi wa maabara/darasa na kutathmini uelewa kupitia maswali ya papo kwa papo.',
          conclLearner: 'Kila mwanafunzi anataja hatua moja atakayochukua nyumbani kulinda vyanzo vya maji.',
          evaluation: 'Upimaji wa utendaji wa vitendo: usahihi wa kutengeneza chujio, ushirikiano katika kikundi, na utunzaji wa mazingira.'
        },
        oldContent: {
          generalObjective: 'Kuelewa vyanzo vya maji na njia za kusafisha maji',
          specificObjectives: [
            'Kutaja vyanzo vitatu vya maji',
            'Kueleza maana ya kuchuja maji',
            'Kutaja vifaa vinavyotumika kusafisha maji'
          ],
          materials: ['Ubao, chaki, chati ya mzunguko wa maji, kitabu cha kiada'],
          references: ['TET Sayansi Darasa la 5 (Toleo la Zamani)'],
          step1Intro: {
            teacher: 'Mwalimu anasalimia darasa na kuuliza wanafunzi wapi wanapata maji nyumbani.',
            learner: 'Wanafunzi wanajibu: bombani, mtoni, kisimani.'
          },
          step2Presentation: {
            teacher: 'Mwalimu anafundisha maana ya maji safi na salama na kuandika ubaoni njia za kusafisha maji: kuchemsha na kuchuja.',
            learner: 'Wanafunzi wanasikiliza na kuandika maelezo kwenye madaftari.'
          },
          step3Practice: {
            teacher: 'Mwalimu anatoa maswali 4 ubaoni ili wanafunzi wayajibu.',
            learner: 'Wanafunzi wanakili maswali na kuandika majibu kwenye madaftari.'
          },
          step4Conclusion: {
            teacher: 'Mwalimu anapitia majibu na kutoa kazi ya nyumbani ya kuchora mmea.',
            learner: 'Wanafunzi wanarekebisha makosa na kuandika kazi ya nyumbani.'
          },
          evaluation: 'Kusahihisha madaftari ya darasa.'
        }
      }
    ]
  },

  // --- NURSERY / PRE-PRIMARY ---
  'Kuhesabu na Namba': {
    subject: 'Kuhesabu na Namba',
    level: 'NURSERY',
    topics: [
      {
        mainTopic: 'Kutambua na Kuhesabu Namba 1 hadi 10',
        subtopics: ['Kutambua Maumbo ya Namba 1-5', 'Kuhesabu Vitu Halisi 1-10', 'Kulinganisha Vingi na Vichache', 'Kupanga Namba kwa Mfuatano'],
        newCbc: {
          mainCompetence: 'Kutumia stadi za awali za kihesabu na mantiki katika shughuli za kila siku za mchezo na ujifunzaji',
          specificCompetence: 'Kutambua, kuhesabu na kuunganisha namba 1 hadi 10 na vitu halisi vilivyopo katika mazingira yake',
          performanceCriteria: [
            'Anatamka namba 1 hadi 10 kwa wimbo na mdundo kwa furaha',
            'Anahesabu vifaa halisi (vifuniko, vijiti, mbegu) kulingana na tarakimu iliyooneshwa',
            'Anatengeneza namba kwa kutumia udongo wa mfinyanzi au kamba'
          ],
          materials: ['Vifuniko vya chupa vyenye rangi, mbegu kubwa, kadi za namba zenye michoro ya wanyama, udongo wa kuchezea, kete'],
          references: ['TET Mwongozo wa Elimu ya Awali (Mtaala Mpya 2023)', 'Kadi za Michezo ya Kihesabu ya Awali'],
          introTeacher: 'Mwalimu anaanza kwa kuimba wimbo wa namba wenye makofi na kuruka: "Moja, mbili, tatu... tano tano!"',
          introLearner: 'Watoto wanaimba, wanapiga makofi, na kurukaruka kwa tabasamu na uchangamfu mkubwa.',
          devTeacher: 'Mwalimu anaonesha kadi yenye namba 3 na picha ya ndizi 3. Anawaalika watoto kuweka vifuniko 3 juu ya dawati.',
          devLearner: 'Watoto wanahesabu vifuniko vitatu kwa mikono yao: "Moja, mbili, tatu!" na kuonesha vidole vitatu juu.',
          appTeacher: 'Mchezo wa sokoni: Mwalimu anamwambia mtoto "Ninunulie machungwa 4".',
          appLearner: 'Mtoto anahesabu mbegu 4 na kumkabidhi mwalimu huku darasa likishangilia.',
          conclTeacher: 'Mwalimu anapongeza watoto wote kwa makofi ya shule (makofi ya nyuki) na kupitia namba kwa kadi.',
          conclLearner: 'Watoto wanapiga makofi ya nyuki na kutaja namba inayoinuliwa kwa sauti ya pamoja.',
          evaluation: 'Upimaji wa uchunguzi wa maendeleo ya mtoto: utambuzi wa namba, ustadi wa kuhesabu kwa vitendo, na ari ya ushiriki.'
        },
        oldContent: {
          generalObjective: 'Kumwezesha mtoto kutambua namba 1 hadi 5',
          specificObjectives: [
            'Kutamka namba 1 hadi 5',
            'Kuandika namba 1, 2, na 3',
            'Kuhesabu vitu kuanzia 1 hadi 5'
          ],
          materials: ['Ubao, chaki, chati ya namba 1-10, vijiti vya kuhesabia'],
          references: ['Mwongozo wa Malezi ya Awali (Wa Zamani)'],
          step1Intro: {
            teacher: 'Mwalimu anaandika namba 1, 2, 3 ubaoni na kutamka.',
            learner: 'Watoto wanarudia kutamka baada ya mwalimu.'
          },
          step2Presentation: {
            teacher: 'Mwalimu anaonesha jinsi ya kushika penseli na kuchora namba 1 na 2 ubaoni.',
            learner: 'Watoto wanatazama ubaoni.'
          },
          step3Practice: {
            teacher: 'Mwalimu anasambaza vijiti na kuagiza watoto wahesabu vitano vitano.',
            learner: 'Watoto wanahesabu vijiti mezani.'
          },
          step4Conclusion: {
            teacher: 'Mwalimu anasifu watoto na kuwaambia waimbe wimbo wa kufunga darasa.',
            learner: 'Watoto wanaimba wimbo na kuweka vifaa kwenye mikoba.'
          },
          evaluation: 'Kuangalia uwezo wa mtoto kushika penseli na kuhesabu vijiti.'
        }
      }
    ]
  }
};

/**
 * Generate a complete, ready-to-use lesson plan for any Tanzanian subject,
 * class level, and curriculum type.
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

  // Search if we have exact match in syllabus knowledge base
  const subjectData = SYLLABUS_KNOWLEDGE_BASE[subject] || 
    Object.values(SYLLABUS_KNOWLEDGE_BASE).find(s => s.subject.toLowerCase() === subject.toLowerCase());

  let matchedTopic = subjectData?.topics.find(t => 
    t.mainTopic.toLowerCase().includes(topic.toLowerCase()) || 
    topic.toLowerCase().includes(t.mainTopic.toLowerCase())
  ) || subjectData?.topics[0];

  const resolvedSubtopic = subtopic?.trim() || matchedTopic?.subtopics[0] || `Introduction to ${topic}`;

  const isCbc = curriculumType === 'NEW_CBC_2023';

  // Fallback generation if topic is custom
  const mainCompetence = isCbc
    ? matchedTopic?.newCbc.mainCompetence || `Applying concepts of ${subject} (${topic}) to investigate and solve real-world problems in school and community environments.`
    : undefined;

  const specificCompetence = isCbc
    ? matchedTopic?.newCbc.specificCompetence || `Analyzing ${resolvedSubtopic} through inquiry, experiments, and group collaboration to demonstrate practical mastery.`
    : undefined;

  const generalObjective = !isCbc
    ? matchedTopic?.oldContent.generalObjective || `To provide learners with foundational knowledge and theoretical understanding of ${topic} in ${subject}.`
    : undefined;

  const specificObjectives = isCbc
    ? matchedTopic?.newCbc.performanceCriteria || [
        `Demonstrates clear understanding of key principles of ${resolvedSubtopic} through learner-centered exploration`,
        `Collaborates in small groups to examine practical applications of ${topic} in daily life`,
        `Evaluates solutions using appropriate criteria and presents findings with confidence`
      ]
    : matchedTopic?.oldContent.specificObjectives || [
        `Define and state the key terminology of ${resolvedSubtopic} accurately`,
        `Explain the fundamental rules and procedures associated with ${topic}`,
        `Solve standard exercises and textbook questions correctly in exercise books`
      ];

  const teachingMaterials = isCbc
    ? matchedTopic?.newCbc.materials || ['Real-life artifacts, charts, laboratory apparatus, group work cards, digital models']
    : matchedTopic?.oldContent.materials || ['Chalkboard, chalk, standard textbook, wall chart'];

  const references = isCbc
    ? matchedTopic?.newCbc.references || [`TIE ${subject} for ${className} (Competence Based Curriculum - 2023)`, 'Ministry of Education, Science & Technology Curriculum Guide 2023']
    : matchedTopic?.oldContent.references || [`TIE ${subject} for ${className} (Traditional Content-Based Syllabus)`, 'Approved Secondary/Primary Textbook'];

  // Construct stages based on curriculum type
  let steps: LessonPlanStep[] = [];

  if (isCbc) {
    const cbcData = matchedTopic?.newCbc;
    steps = [
      {
        stage: 'Introduction / Utangulizi (Setting the Scene & Prior Knowledge)',
        timeMinutes: Math.round(durationMinutes * 0.15),
        teacherActivities: cbcData?.introTeacher || `Presents an engaging real-life challenge related to ${resolvedSubtopic}. Encourages learners to draw upon prior personal observations.`,
        learnerActivities: cbcData?.introLearner || `Engage in think-pair-share, brainstorm causes, and formulate questions they wish to answer in this lesson.`,
        assessmentCriteria: 'Active participation, activation of relevant prior knowledge, critical curiosity',
        teachingMedia: 'Visual trigger, real object or scenario card'
      },
      {
        stage: 'Competence Development / Kujenga Umahiri (Group Inquiry & Activities)',
        timeMinutes: Math.round(durationMinutes * 0.50),
        teacherActivities: cbcData?.devTeacher || `Facilitates structured inquiry stations. Circulates among groups, offering scaffolding, targeted prompts, and assessing group dynamics.`,
        learnerActivities: cbcData?.devLearner || `Work collaboratively in small groups of 4-5 to investigate, test hypotheses, record observations, and construct solutions on work cards.`,
        assessmentCriteria: 'Collaborative problem solving, empirical data recording, logical deduction',
        teachingMedia: 'Experiment kit, task cards, student worksheets'
      },
      {
        stage: 'Real-Life Application / Kutumia Umahiri (Practical Synthesis)',
        timeMinutes: Math.round(durationMinutes * 0.25),
        teacherActivities: cbcData?.appTeacher || `Guides learners to apply their newfound insights to a community or school-based scenario. Moderates peer presentations.`,
        learnerActivities: cbcData?.appLearner || `Present group conclusions, defend methodologies, and explain how ${topic} impacts daily community life and safety.`,
        assessmentCriteria: 'Clarity of presentation, evidence-based reasoning, peer feedback receptivity',
        teachingMedia: 'Presentation charts, mini-whiteboards'
      },
      {
        stage: 'Conclusion & Assessment / Hitimisho na Tathmini Endelevu',
        timeMinutes: Math.round(durationMinutes * 0.10),
        teacherActivities: cbcData?.conclTeacher || `Administers quick exit diagnostic ticket and synthesizes core competencies achieved.`,
        learnerActivities: cbcData?.conclLearner || `Complete individual self-assessment checklist and log personal learning reflection in portfolio.`,
        assessmentCriteria: 'Diagnostic exit ticket score, self-evaluation honesty',
        teachingMedia: 'Exit slips, assessment rubric'
      }
    ];
  } else {
    // Old Content Based Curriculum
    const oldData = matchedTopic?.oldContent;
    steps = [
      {
        stage: 'Step 1: Introduction (Review of Previous Lesson)',
        timeMinutes: Math.round(durationMinutes * 0.15),
        teacherActivities: oldData?.step1Intro.teacher || `Reviews previously taught concepts and writes the new topic "${topic}" on the chalkboard.`,
        learnerActivities: oldData?.step1Intro.learner || `Answer oral review questions asked by the teacher and write the topic title in notebooks.`,
        assessmentCriteria: 'Oral recall of previous lesson facts'
      },
      {
        stage: 'Step 2: Presentation of New Knowledge (Teacher-Led Exposition)',
        timeMinutes: Math.round(durationMinutes * 0.45),
        teacherActivities: oldData?.step2Presentation.teacher || `Explains definitions, fundamental laws, and rules of ${resolvedSubtopic}. Writes comprehensive notes and worked examples on the chalkboard.`,
        learnerActivities: oldData?.step2Presentation.learner || `Listen attentively to teacher explanations, observe worked examples, and copy notes from the chalkboard into exercise books.`,
        assessmentCriteria: 'Accurate notebook transcription and attentive listening'
      },
      {
        stage: 'Step 3: Supervised Practice & Exercises (Classwork)',
        timeMinutes: Math.round(durationMinutes * 0.25),
        teacherActivities: oldData?.step3Practice.teacher || `Writes 3-4 structured questions on the board. Moves around the classroom observing students and marking exercise books.`,
        learnerActivities: oldData?.step3Practice.learner || `Solve the chalkboard exercises individually in exercise books following the teacher's model.`,
        assessmentCriteria: 'Correctness of written solutions in exercise books'
      },
      {
        stage: 'Step 4: Summary, Conclusion & Homework Assignment',
        timeMinutes: Math.round(durationMinutes * 0.15),
        teacherActivities: oldData?.step4Conclusion.teacher || `Summarizes key definitions, clarifies common errors observed, and assigns textbook homework.`,
        learnerActivities: oldData?.step4Conclusion.learner || `Copy homework questions into assignment diaries and ask final clarifying questions.`,
        assessmentCriteria: 'Completion of assigned homework'
      }
    ];
  }

  const evaluationStrategy = isCbc
    ? matchedTopic?.newCbc.evaluation || `Continuous formative assessment using rubric assessing: 1) Practical investigation mastery, 2) Group collaboration, 3) Real-life contextual application.`
    : matchedTopic?.oldContent.evaluation || `Formative evaluation through marking classroom exercise books and review of assigned textbook homework.`;

  const teacherRemarks = `Kipindi kilikwenda vizuri. Wanafunzi ${presentStudentsCount} kati ya ${registeredStudentsCount} walishiriki kikamilifu. Umahiri uliokusudiwa ulijengwa kwa mafanikio.`;

  return {
    id: `plan_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    schoolId,
    teacherId,
    teacherName: teacherName || 'Subject Teacher',
    className,
    stream,
    subject,
    curriculumType,
    date,
    timeSlot: '08:00 - 08:40',
    periodNumber,
    durationMinutes,
    registeredStudentsCount,
    presentStudentsCount,
    mainTopic: topic,
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
