import { SchemeOfWork, SchemeOfWorkItem, TeachingLogBookEntry } from '../types/schemeOfWork';
import { CurriculumType } from '../types/lessonPlan';
import { SYLLABUS_KNOWLEDGE_BASE } from './lessonPlanGenerator';

interface SubjectSchemeTemplate {
  subject: string;
  department: string;
  defaultPeriodsPerWeek: number;
  weeks: {
    week: number;
    dates: string;
    cbc: {
      mainCompetence: string;
      specificCompetence: string;
      learningActivities: string;
      teachingActivities: string;
      materials: string;
      assessment: string;
      references: string;
    };
    old: {
      mainTopic: string;
      subTopic: string;
      specificObjectives: string;
      teachingActivities: string;
      materials: string;
      assessment: string;
      references: string;
    };
  }[];
}

export const TANZANIA_SCHEMES_KNOWLEDGE_BASE: Record<string, SubjectSchemeTemplate> = {
  'Physics': {
    subject: 'Physics',
    department: 'Science & Mathematics',
    defaultPeriodsPerWeek: 4,
    weeks: [
      {
        week: 1,
        dates: 'Week 1 (12 Jan - 16 Jan)',
        cbc: {
          mainCompetence: 'Applying concepts of force and motion to solve mechanical and transport safety challenges',
          specificCompetence: 'Analyzing Newton\'s First Law of Motion and inertial reference frames',
          learningActivities: 'Learners conduct hands-on trolley experiments to demonstrate inertia and record findings on work cards',
          teachingActivities: 'Facilitate think-pair-share, guide safe apparatus handling, and prompt discussion on seatbelt mechanics',
          materials: 'Dynamics trolleys, inclined ramps, stopwatches, standard masses, safety demonstration video',
          assessment: 'Practical rubric on measuring motion, oral presentation on vehicular safety features',
          references: 'TIE Physics for Secondary Schools Form 3 (CBC 2023), MoEST Curriculum Guidelines'
        },
        old: {
          mainTopic: 'Force and Motion',
          subTopic: 'Newton\'s First Law of Motion',
          specificObjectives: 'By the end of the week, the student should be able to define inertia and state Newton\'s First Law correctly',
          teachingActivities: 'Review definition of force on chalkboard, write law statement, demonstrate coin-card experiment',
          materials: 'Chalkboard, chalk, glass tumbler, card, coin, spring balance',
          assessment: 'Oral question-and-answer, chalkboard summary quiz, marked exercise questions',
          references: 'TIE Physics Form 3 (Traditional Syllabus), Principles of Physics by Nelkon & Parker'
        }
      },
      {
        week: 2,
        dates: 'Week 2 (19 Jan - 23 Jan)',
        cbc: {
          mainCompetence: 'Applying concepts of force and motion to solve mechanical and transport safety challenges',
          specificCompetence: 'Analyzing Newton\'s Second Law, linear momentum, and impulsive forces',
          learningActivities: 'Measure change in momentum using light gates or ticker timers; graph force versus acceleration',
          teachingActivities: 'Guide mathematical model derivation F = ma and oversee graph analysis groups',
          materials: 'Ticker timers, carbon paper discs, ticker tapes, 12V AC power supply, slotted weights',
          assessment: 'Graph interpretation rubric, calculation checklist, peer evaluation of group graphs',
          references: 'TIE Physics for Secondary Schools Form 3 (CBC 2023), TIE Science Practical Guide'
        },
        old: {
          mainTopic: 'Force and Motion',
          subTopic: 'Newton\'s Second Law and Momentum',
          specificObjectives: 'By the end of the week, the student should be able to state Newton\'s Second Law and calculate force using F = ma',
          teachingActivities: 'Derive formula F = (mv - mu)/t on chalkboard, solve 3 sample numerical problems with learners',
          materials: 'Chalkboard, textbook diagrams, charts showing momentum in collisions',
          assessment: 'Homework exercise of 5 calculation problems from TIE textbook page 45',
          references: 'TIE Physics Form 3, Nelkon & Parker Physics for Secondary Schools'
        }
      },
      {
        week: 3,
        dates: 'Week 3 (26 Jan - 30 Jan)',
        cbc: {
          mainCompetence: 'Applying concepts of force and motion to solve mechanical and transport safety challenges',
          specificCompetence: 'Investigating Newton\'s Third Law and conservation of linear momentum',
          learningActivities: 'Construct model water/balloon rockets to observe action-reaction pairs; formulate conservation laws',
          teachingActivities: 'Challenge students to design impact mitigation prototypes; evaluate rocket launch demonstrations',
          materials: 'Balloons, plastic bottles, bicycle valves, foot pumps, spring balances pair',
          assessment: 'Prototype performance test, group lab report documenting action-reaction vectors',
          references: 'TIE Physics Form 3 CBC 2023, UNESCO STEM Secondary Physics Handbook'
        },
        old: {
          mainTopic: 'Force and Motion',
          subTopic: 'Newton\'s Third Law and Rocket Propulsion',
          specificObjectives: 'By the end of the week, the student should be able to state Newton\'s Third Law and explain rocket action',
          teachingActivities: 'Illustrate opposing force pairs with two spring balances pulled together; write notes on chalkboard',
          materials: 'Two spring balances, chalkboard chart of rocket combustion chamber',
          assessment: 'Class test on Newton\'s 3 laws; individual student note checking',
          references: 'TIE Physics Form 3 Traditional Syllabus'
        }
      },
      {
        week: 4,
        dates: 'Week 4 (02 Feb - 06 Feb)',
        cbc: {
          mainCompetence: 'Applying concepts of force and motion to solve mechanical and transport safety challenges',
          specificCompetence: 'Analyzing friction, coefficient of dynamic/static friction, and lubrication',
          learningActivities: 'Measure pulling forces on diverse surfaces (wood, glass, sandpaper) using digital/analog spring balances',
          teachingActivities: 'Guide experimental error analysis and facilitate discussions on brake pad wear in Tanzanian roads',
          materials: 'Wooden blocks with hooks, weights, horizontal testing boards, lubricating oil, graphite powder',
          assessment: 'Lab report assessing accuracy in computing coefficient of friction μ = F/R',
          references: 'TIE Physics Form 3 CBC 2023, National Vocational Science Standards'
        },
        old: {
          mainTopic: 'Friction',
          subTopic: 'Types and Laws of Friction',
          specificObjectives: 'By the end of the week, the student should be able to distinguish static and dynamic friction and list 4 laws of friction',
          teachingActivities: 'Define friction on board, list laws of solid friction, give advantages and disadvantages in daily life',
          materials: 'Chalkboard, wooden block, hanging masses, pulley system',
          assessment: 'Short essay on 5 methods of reducing friction in machines; exercise questions',
          references: 'TIE Physics Form 3, Longman Physics'
        }
      },
      {
        week: 5,
        dates: 'Week 5 (09 Feb - 13 Feb)',
        cbc: {
          mainCompetence: 'Designing and diagnosing sustainable electrical circuits and domestic power systems',
          specificCompetence: 'Investigating Ohm\'s Law, electrical potential difference, and conductor resistance',
          learningActivities: 'Assemble circuit boards with variable rheostats, record V and I values, and plot Ohm\'s Law linear graphs',
          teachingActivities: 'Demonstrate digital multimeter setup, monitor electrical safety, and guide slope gradient calculation',
          materials: 'Dry cells, ammeters, voltmeters, rheostats, constantan & nichrome wires, connecting leads',
          assessment: 'Practical rubric on V-I data collection and gradient computation for resistance',
          references: 'TIE Secondary Physics Form 3 (CBC 2023), Tanzania National Energy Guide'
        },
        old: {
          mainTopic: 'Current Electricity',
          subTopic: 'Ohm\'s Law and Electrical Resistance',
          specificObjectives: 'By the end of the week, the student should be able to state Ohm\'s Law and verify it experimentally',
          teachingActivities: 'Draw circuit diagram on chalkboard, explain V = IR formula, guide verification experiment',
          materials: 'Chalkboard, 2 dry cells, torch bulbs, switches, analog voltmeter',
          assessment: 'Marked circuit diagrams in student practical notebooks; numerical quiz',
          references: 'TIE Physics Form 3 Traditional Syllabus'
        }
      },
      {
        week: 6,
        dates: 'Week 6 (16 Feb - 20 Feb)',
        cbc: {
          mainCompetence: 'Designing and diagnosing sustainable electrical circuits and domestic power systems',
          specificCompetence: 'Comparing series and parallel circuit configurations for domestic efficiency',
          learningActivities: 'Construct 3-room home lighting circuits with independent branch switches; measure branch currents',
          teachingActivities: 'Facilitate design sprint on energy-efficient home solar installation; review peer circuit layouts',
          materials: 'Miniature breadboards, LED bulbs, toggle switches, solar PV cell demo, resistors',
          assessment: 'Design portfolio rubric, peer assessment on circuit feasibility and safety fuses',
          references: 'TIE Secondary Physics Form 3 (CBC 2023), Rural Energy Agency (REA) Guidelines'
        },
        old: {
          mainTopic: 'Current Electricity',
          subTopic: 'Series and Parallel Resistors',
          specificObjectives: 'By the end of the week, the student should be able to calculate equivalent resistance for series and parallel circuits',
          teachingActivities: 'Derive equivalent resistance formulas R = R1+R2 and 1/R = 1/R1+1/R2 on chalkboard with 4 examples',
          materials: 'Chalkboard, resistor charts, color code diagrams',
          assessment: 'Class test on series and parallel circuit calculations',
          references: 'TIE Physics Form 3'
        }
      },
      {
        week: 7,
        dates: 'Week 7 (23 Feb - 27 Feb)',
        cbc: {
          mainCompetence: 'Designing and diagnosing sustainable electrical circuits and domestic power systems',
          specificCompetence: 'Calculating electrical power consumption, domestic wiring safety, and tariff costs',
          learningActivities: 'Audit school or home appliance wattages; compute kWh electricity bills under TANESCO tariff bands',
          teachingActivities: 'Provide genuine electricity bills (LUKU token slips); lead discussion on electrical fire hazards',
          materials: 'Sample LUKU receipts, 3-pin plugs, fuse wires, earth wire samples, electric kettle label',
          assessment: 'Authentic task: Energy conservation plan with cost savings calculation in TZS',
          references: 'TIE Physics CBC 2023, TANESCO Consumer Guidelines 2023'
        },
        old: {
          mainTopic: 'Current Electricity',
          subTopic: 'Electrical Power and Domestic Installation',
          specificObjectives: 'By the end of the week, the student should be able to calculate electrical energy in kWh and describe 3-pin plug wiring',
          teachingActivities: 'Explain P = IV = I²R = V²/R; draw domestic consumer unit and 3-pin plug on chalkboard',
          materials: 'Chalkboard, sample 3-pin plug with live, neutral, earth wires',
          assessment: 'Labeling test on 3-pin plug; written homework on calculating monthly LUKU units',
          references: 'TIE Physics Form 3'
        }
      },
      {
        week: 8,
        dates: 'Week 8 (02 Mar - 06 Mar)',
        cbc: {
          mainCompetence: 'MIDTERM ASSESSMENT & PRACTICAL PORTFOLIO EVALUATION',
          specificCompetence: 'Synthesizing mechanics and current electricity competences through practical tasks',
          learningActivities: 'Undertake multi-station practical exam (mechanics trolley + circuit assembly); reflect on learning log',
          teachingActivities: 'Administer standardized rubric-based assessment; provide constructive feedback on learner portfolios',
          materials: 'NECTA-standardized experimental apparatus, rubrics, feedback forms',
          assessment: 'Midterm Examination (Theory 60% + Practical Performance 40%)',
          references: 'NECTA Assessment Guidelines 2023/2024'
        },
        old: {
          mainTopic: 'MIDTERM EVALUATION & REVIEW',
          subTopic: 'Terminal Revision of Force, Motion and Electricity',
          specificObjectives: 'Evaluate student retention and problem-solving skills across Topics 1 and 2',
          teachingActivities: 'Administer midterm written test; mark papers and conduct chalkboard revision of challenging questions',
          materials: 'Printed exam papers, answer booklets, marking schemes',
          assessment: 'Formal Midterm Examination marked out of 100%',
          references: 'School Past Examination Papers'
        }
      },
      {
        week: 9,
        dates: 'Week 9 (09 Mar - 13 Mar)',
        cbc: {
          mainCompetence: 'Harnessing thermal energy principles to enhance environmental sustainability',
          specificCompetence: 'Investigating thermal expansion in solids, liquids, and gases and bimetallic applications',
          learningActivities: 'Conduct ball-and-ring experiment; build prototype bimetallic fire alarm and thermostat switch',
          teachingActivities: 'Oversee Bunsen burner safety; guide inquiry into railway line expansion gaps and bridges',
          materials: 'Ball and ring apparatus, bimetallic strips, Bunsen burners, tongs, heat sources',
          assessment: 'Demonstration rubric, written explanation of bimetallic strip bending mechanisms',
          references: 'TIE Secondary Physics Form 3 (CBC 2023)'
        },
        old: {
          mainTopic: 'Thermal Physics',
          subTopic: 'Thermal Expansion of Solids',
          specificObjectives: 'By the end of the week, the student should be able to explain expansion using kinetic theory and describe linear expansivity',
          teachingActivities: 'Draw ball and ring on chalkboard; define linear expansivity α = ΔL / (L₀ · ΔT); solve 2 numerical problems',
          materials: 'Chalkboard, ball and ring demonstration set',
          assessment: 'Marked homework on linear and cubical expansivity formulas',
          references: 'TIE Physics Form 3'
        }
      },
      {
        week: 10,
        dates: 'Week 10 (16 Mar - 20 Mar)',
        cbc: {
          mainCompetence: 'Harnessing thermal energy principles to enhance environmental sustainability',
          specificCompetence: 'Applying heat transfer mechanisms (conduction, convection, radiation) in passive cooling',
          learningActivities: 'Design insulated vacuum flasks or evaporative pot-in-pot cooler prototypes (zeer pots) for food preservation',
          teachingActivities: 'Facilitate design showcase; connect heat transfer to energy-efficient architectural roof designs in Tanzania',
          materials: 'Clay pots, sand, thermometer, radiant heat sensor, colored flasks (silver, black)',
          assessment: 'Engineering prototype evaluation rubric; temperature drop documentation',
          references: 'TIE Secondary Physics Form 3 (CBC 2023), Appropriate Technology Handbook'
        },
        old: {
          mainTopic: 'Thermal Physics',
          subTopic: 'Modes of Heat Transfer',
          specificObjectives: 'By the end of the week, the student should be able to explain conduction, convection, and radiation with examples',
          teachingActivities: 'List 3 modes on board; draw vacuum flask (Thermos) diagram; explain vacuum, silvered glass, and cork stopper functions',
          materials: 'Chalkboard, cut-away diagram of vacuum flask, Leslie cube',
          assessment: 'Diagram labeling test of Thermos flask; 5 short-answer questions',
          references: 'TIE Physics Form 3'
        }
      },
      {
        week: 11,
        dates: 'Week 11 (23 Mar - 27 Mar)',
        cbc: {
          mainCompetence: 'COMPETENCE CONSOLIDATION & PROJECT PRESENTATIONS',
          specificCompetence: 'Integrating physics principles into community STEM projects (solar cooker / alarm / water filter)',
          learningActivities: 'Teams exhibit completed STEM projects, demonstrate working prototypes to peers and faculty judges',
          teachingActivities: 'Coordinate peer review gallery walk, moderate assessment rubrics, record competence achievements',
          materials: 'Project display boards, student prototypes, evaluation score sheets',
          assessment: 'Summative STEM project exhibition rubric (Problem Definition, Innovation, Practical execution)',
          references: 'TIE Competence-Based Assessment Framework 2023'
        },
        old: {
          mainTopic: 'GENERAL REVISION & PAST PAPER DRILLS',
          subTopic: 'NECTA Format Examination Preparation',
          specificObjectives: 'Review all core syllabus areas; practice time management for Section A, B, and C questions',
          teachingActivities: 'Solve past NECTA national exam questions on chalkboard; clarify common student pitfalls',
          materials: 'Chalkboard, NECTA past papers booklets 2018-2023',
          assessment: 'Timed mock drill: 10 multiple-choice and 4 structured calculation questions',
          references: 'NECTA Physics Review Series'
        }
      },
      {
        week: 12,
        dates: 'Week 12 (30 Mar - 03 Apr)',
        cbc: {
          mainCompetence: 'TERMINAL COMPETENCE EVALUATION & CLOSING REFLECTION',
          specificCompetence: 'Summative terminal examination covering Term 1 competences',
          learningActivities: 'Sit terminal examination; conduct self-assessment checklist and set learning goals for Term 2',
          teachingActivities: 'Supervise terminal examination; evaluate and enter student scores into academic ledger',
          materials: 'Official examination papers, answer booklets, academic record sheets',
          assessment: 'Terminal Examination (NECTA Format) + Portfolio Assessment Mark Entry',
          references: 'Ministry of Education & NECTA Terminal Standards'
        },
        old: {
          mainTopic: 'TERMINAL EXAMINATION & CLOSURE',
          subTopic: 'End of Term Assessment and Mark Compilation',
          specificObjectives: 'Summative evaluation of student mastery of Term 1 syllabus',
          teachingActivities: 'Invigilate terminal exam, mark scripts according to marking scheme, enter marks into ledger',
          materials: 'Examination papers, answer sheets, report cards',
          assessment: 'Formal Terminal Examination marked out of 100%',
          references: 'School Academic Examination Regulations'
        }
      }
    ]
  },
  'Basic Mathematics': {
    subject: 'Basic Mathematics',
    department: 'Mathematics',
    defaultPeriodsPerWeek: 6,
    weeks: [
      {
        week: 1,
        dates: 'Week 1 (12 Jan - 16 Jan)',
        cbc: {
          mainCompetence: 'Applying algebraic and numerical relationships to solve real-world economic challenges',
          specificCompetence: 'Manipulating quadratic equations and algebraic modeling',
          learningActivities: 'Formulate quadratic models from perimeter/area problems in agricultural plots; solve by factorization',
          teachingActivities: 'Guide step-by-step factoring protocols; demonstrate graphical intersection roots using dynamic tools',
          materials: 'Graph paper, algebraic tiles, geometrical models, digital math worksheets',
          assessment: 'Task rubric on formulating equations from word problems and computing roots accurately',
          references: 'TIE Basic Mathematics for Secondary Schools Form 3 (CBC 2023)'
        },
        old: {
          mainTopic: 'Algebra',
          subTopic: 'Quadratic Equations by Factorization',
          specificObjectives: 'By the end of the week, the student should be able to solve quadratic equations of the form ax² + bx + c = 0 by factoring',
          teachingActivities: 'Explain standard form on chalkboard, demonstrate splitting middle term with 4 worked examples',
          materials: 'Chalkboard, chalk, ruler, textbook',
          assessment: '10 chalkboard drill exercises; homework assignment from TIE textbook page 18',
          references: 'TIE Basic Mathematics Form 3 (Traditional Syllabus)'
        }
      },
      {
        week: 2,
        dates: 'Week 2 (19 Jan - 23 Jan)',
        cbc: {
          mainCompetence: 'Applying algebraic and numerical relationships to solve real-world economic challenges',
          specificCompetence: 'Solving quadratics using completing the square and quadratic formula',
          learningActivities: 'Derive quadratic formula x = (-b ± √(b² - 4ac)) / (2a) collaboratively; analyze discriminant values',
          teachingActivities: 'Facilitate formula derivation steps; highlight interpretation of real vs complex roots',
          materials: 'Mathematical formula charts, scientific calculators, group work cards',
          assessment: 'Problem-solving quiz assessing accurate substitution and square root extraction',
          references: 'TIE Basic Mathematics Form 3 CBC 2023'
        },
        old: {
          mainTopic: 'Algebra',
          subTopic: 'Quadratic Formula and Completing the Square',
          specificObjectives: 'By the end of the week, the student should be able to solve quadratic equations using the general quadratic formula',
          teachingActivities: 'Write formula on board, illustrate substitution protocol with positive and negative coefficients',
          materials: 'Chalkboard, textbook',
          assessment: 'Classwork exercise of 6 quadratic equations; marked notebooks',
          references: 'TIE Basic Mathematics Form 3'
        }
      },
      {
        week: 3,
        dates: 'Week 3 (26 Jan - 30 Jan)',
        cbc: {
          mainCompetence: 'Applying geometric and trigonometric principles in architectural and navigational surveying',
          specificCompetence: 'Applying Pythagorean theorem and trigonometric ratios (sin, cos, tan) to elevation problems',
          learningActivities: 'Construct simple clinometers using protractors and straws; measure school flagpole height using tan θ',
          teachingActivities: 'Demonstrate clinometer fabrication; supervise outdoor field survey and trigonometric calculations',
          materials: 'Protractors, straws, plumb lines/weights, measuring tapes (30m), clinometer kits',
          assessment: 'Field survey report assessing height measurement accuracy and error justification',
          references: 'TIE Basic Mathematics Form 3 (CBC 2023)'
        },
        old: {
          mainTopic: 'Trigonometry',
          subTopic: 'Trigonometric Ratios of Acute Angles',
          specificObjectives: 'By the end of the week, the student should be able to define sine, cosine, and tangent in right-angled triangles',
          teachingActivities: 'Define SOHCAHTOA on chalkboard, solve for unknown sides in 5 right triangles',
          materials: 'Chalkboard, geometrical instruments set, 4-figure mathematical tables',
          assessment: 'Oral drill on trigonometric ratios; written exercise in exercise books',
          references: 'TIE Basic Mathematics Form 3 Traditional'
        }
      },
      {
        week: 4,
        dates: 'Week 4 (02 Feb - 06 Feb)',
        cbc: {
          mainCompetence: 'Applying geometric and trigonometric principles in architectural and navigational surveying',
          specificCompetence: 'Solving angles of elevation, depression, and basic 3-figure bearings',
          learningActivities: 'Map compass directions across school grounds; calculate true bearings between points',
          teachingActivities: 'Facilitate map-reading exercises; guide conversion between quadrant bearings and true bearings',
          materials: 'Magnetic compasses, drawing boards, meter rulers, protractors',
          assessment: 'Bearing plotting rubric and elevation calculation accuracy',
          references: 'TIE Basic Mathematics Form 3 CBC 2023'
        },
        old: {
          mainTopic: 'Trigonometry',
          subTopic: 'Angles of Elevation and Depression',
          specificObjectives: 'By the end of the week, the student should be able to calculate heights and distances using angles of elevation',
          teachingActivities: 'Draw observer and target diagrams on chalkboard, apply tan θ = opp/adj to solve word problems',
          materials: 'Chalkboard, 4-figure tables',
          assessment: 'Class test of 4 word problems on elevation and depression',
          references: 'TIE Basic Mathematics Form 3'
        }
      },
      {
        week: 5,
        dates: 'Week 5 (09 Feb - 13 Feb)',
        cbc: {
          mainCompetence: 'Interpreting statistical data to make informed socio-economic and demographic decisions',
          specificCompetence: 'Constructing grouped frequency distribution tables, histograms, and frequency polygons',
          learningActivities: 'Collect real school data (student heights, commute times); organize into optimal class intervals',
          teachingActivities: 'Guide determination of class boundaries, midpoints, and histogram bar widths',
          materials: 'Graph books, meter rules, collected demographic datasets, spreadsheets',
          assessment: 'Statistical chart construction rubric; peer review of histogram scales',
          references: 'TIE Basic Mathematics Form 3 CBC 2023, National Bureau of Statistics (NBS) Youth Data'
        },
        old: {
          mainTopic: 'Statistics',
          subTopic: 'Grouped Frequency Distribution and Histograms',
          specificObjectives: 'By the end of the week, the student should be able to prepare a frequency distribution table and draw a histogram',
          teachingActivities: 'Present raw marks data on chalkboard, demonstrate tallying and drawing histogram on board',
          materials: 'Chalkboard, chalkboard graph grid, rulers',
          assessment: 'Marked graph exercise books; homework on drawing frequency polygon',
          references: 'TIE Basic Mathematics Form 3'
        }
      },
      {
        week: 6,
        dates: 'Week 6 (16 Feb - 20 Feb)',
        cbc: {
          mainCompetence: 'Interpreting statistical data to make informed socio-economic and demographic decisions',
          specificCompetence: 'Calculating measures of central tendency (Mean, Median, Mode) for grouped data',
          learningActivities: 'Compute mean using assumed mean method (A + (Σfd / Σf)); determine modal class from histograms',
          teachingActivities: 'Demonstrate assumed mean shortcut algorithms; lead discussion on statistical bias in real reports',
          materials: 'Calculators, statistical tables, sample agricultural yield reports',
          assessment: 'Grouped data calculation worksheet evaluating accuracy of formula execution',
          references: 'TIE Basic Mathematics Form 3 CBC 2023'
        },
        old: {
          mainTopic: 'Statistics',
          subTopic: 'Mean and Median of Grouped Data',
          specificObjectives: 'By the end of the week, the student should be able to calculate the mean and median of grouped data using formulas',
          teachingActivities: 'Derive Mean = Σfx / Σf; write step-by-step procedures on chalkboard with worked example',
          materials: 'Chalkboard, textbook',
          assessment: 'Classwork exercise calculating mean of 40 exam marks; marked books',
          references: 'TIE Basic Mathematics Form 3'
        }
      },
      {
        week: 7,
        dates: 'Week 7 (23 Feb - 27 Feb)',
        cbc: {
          mainCompetence: 'Interpreting statistical data to make informed socio-economic and demographic decisions',
          specificCompetence: 'Constructing cumulative frequency curves (Ogive) and estimating percentiles/quartiles',
          learningActivities: 'Plot cumulative frequency ogive curves; read median (Q2), lower quartile (Q1), and upper quartile (Q3)',
          teachingActivities: 'Oversee accurate ogive plotting; clarify upper boundary vs midpoint plotting rules',
          materials: 'Graph books, fine-tipped pencils, long rulers, past data tables',
          assessment: 'Ogive curve accuracy rubric and quartile extraction verification',
          references: 'TIE Basic Mathematics Form 3 CBC 2023'
        },
        old: {
          mainTopic: 'Statistics',
          subTopic: 'Cumulative Frequency Curve (Ogive)',
          specificObjectives: 'By the end of the week, the student should be able to draw an ogive and estimate the median mark',
          teachingActivities: 'Explain cumulative frequency calculation on chalkboard; demonstrate plotting curve by freehand',
          materials: 'Chalkboard graph board, colored chalk',
          assessment: 'Marked homework on drawing an ogive and determining interquartile range',
          references: 'TIE Basic Mathematics Form 3'
        }
      },
      {
        week: 8,
        dates: 'Week 8 (02 Mar - 06 Mar)',
        cbc: {
          mainCompetence: 'MIDTERM ASSESSMENT & MATHEMATICAL REASONING REVIEW',
          specificCompetence: 'Evaluating mastery in algebra, trigonometry, and grouped statistics',
          learningActivities: 'Sit standardized midterm assessment; analyze problem-solving errors and develop correction logs',
          teachingActivities: 'Administer assessment; conduct item analysis to identify learning gaps for targeted remediation',
          materials: 'Midterm question papers, answer booklets, mathematical tables',
          assessment: 'Midterm Examination (Paper 1 format, 100 marks)',
          references: 'NECTA Assessment Guidelines 2023/2024'
        },
        old: {
          mainTopic: 'MIDTERM EXAMINATION & REVIEW',
          subTopic: 'Terminal Revision on Algebra and Statistics',
          specificObjectives: 'Assess student understanding and speed in solving basic mathematics questions',
          teachingActivities: 'Administer midterm test; mark scripts and solve difficult questions on chalkboard',
          materials: 'Printed exam papers, answer booklets',
          assessment: 'Formal Midterm Examination marked out of 100%',
          references: 'School Past Examination Papers'
        }
      },
      {
        week: 9,
        dates: 'Week 9 (09 Mar - 13 Mar)',
        cbc: {
          mainCompetence: 'Applying geometric transformations in computer graphics, fabric design, and cartography',
          specificCompetence: 'Performing reflection, rotation, and translation on Cartesian coordinate planes',
          learningActivities: 'Design traditional Kitenge fabric patterns using combinations of reflection and translation vectors',
          teachingActivities: 'Guide coordinate transformation rules (x, y) → (-x, y), (y, -x); facilitate design showcase',
          materials: 'Grid paper, tracing paper, geometry sets, traditional textile samples',
          assessment: 'Fabric pattern transformation portfolio rubric and coordinate mapping accuracy',
          references: 'TIE Basic Mathematics Form 3 CBC 2023, African Geometric Art Guide'
        },
        old: {
          mainTopic: 'Transformations',
          subTopic: 'Reflection and Translation',
          specificObjectives: 'By the end of the week, the student should be able to find the image of a point or figure under reflection and translation',
          teachingActivities: 'Draw Cartesian plane on board, illustrate reflection in y-axis and x-axis; write vector addition formulas',
          materials: 'Chalkboard, geometry compass and ruler set',
          assessment: '6 chalkboard transformation exercises; individual note checking',
          references: 'TIE Basic Mathematics Form 3'
        }
      },
      {
        week: 10,
        dates: 'Week 10 (16 Mar - 20 Mar)',
        cbc: {
          mainCompetence: 'Applying geometric transformations in computer graphics, fabric design, and cartography',
          specificCompetence: 'Investigating enlargement, scale factor, and area/volume factor ratios',
          learningActivities: 'Enlarge blueprints of school buildings; investigate ratio of areas (k²) and volumes (k³)',
          teachingActivities: 'Challenge students with scaling architectural plans; lead discovery of dimensional scaling laws',
          materials: 'Grid paper, scaling rulers, architectural floor plans, model cubes',
          assessment: 'Scale factor calculation rubric and model proportion verification',
          references: 'TIE Basic Mathematics Form 3 CBC 2023'
        },
        old: {
          mainTopic: 'Transformations',
          subTopic: 'Enlargement and Scale Factor',
          specificObjectives: 'By the end of the week, the student should be able to enlarge a figure given center of enlargement and scale factor',
          teachingActivities: 'Demonstrate enlargement with positive and fractional scale factors on chalkboard',
          materials: 'Chalkboard, ruler, compass',
          assessment: 'Exercise drawing enlargements in graph exercise books',
          references: 'TIE Basic Mathematics Form 3'
        }
      },
      {
        week: 11,
        dates: 'Week 11 (23 Mar - 27 Mar)',
        cbc: {
          mainCompetence: 'MATHEMATICAL MODELING & PRACTICAL PROBLEM SOLVING',
          specificCompetence: 'Integrating algebraic, trigonometric, and statistical tools in financial/business plans',
          learningActivities: 'Teams formulate a small school canteen business model; calculate profit margins, break-even graphs',
          teachingActivities: 'Facilitate peer presentations; prompt critique of mathematical assumptions and risk factors',
          materials: 'Calculators, presentation charts, business simulation case studies',
          assessment: 'Applied mathematics business model presentation and report rubric',
          references: 'TIE Financial Mathematics Module 2023'
        },
        old: {
          mainTopic: 'GENERAL REVISION & NECTA DRILLS',
          subTopic: 'Section A & Section B Practice',
          specificObjectives: 'Review all core mathematical formulas and practice speed under NECTA timing constraints',
          teachingActivities: 'Solve 10 past NECTA Paper questions on chalkboard with active student participation',
          materials: 'Chalkboard, NECTA past papers 2017-2023',
          assessment: 'Timed mock test under strict exam conditions',
          references: 'NECTA Basic Mathematics Review Series'
        }
      },
      {
        week: 12,
        dates: 'Week 12 (30 Mar - 03 Apr)',
        cbc: {
          mainCompetence: 'TERMINAL COMPETENCE EVALUATION & REFLECTION',
          specificCompetence: 'Summative evaluation of Term 1 mathematics competences',
          learningActivities: 'Sit terminal examination; conduct self-assessment checklist and log areas for Term 2 growth',
          teachingActivities: 'Invigilate terminal examination; mark according to standardized marking scheme; enter scores in ledger',
          materials: 'Official examination papers, graph papers, mathematical tables, answer booklets',
          assessment: 'Terminal Examination (NECTA Standard Form 3 Paper)',
          references: 'Ministry of Education & NECTA Terminal Regulations'
        },
        old: {
          mainTopic: 'TERMINAL EXAMINATION & CLOSURE',
          subTopic: 'End of Term Assessment and Ledger Entry',
          specificObjectives: 'Summative evaluation of student mastery of Term 1 syllabus',
          teachingActivities: 'Administer terminal exam, mark scripts according to marking scheme, compile results for report cards',
          materials: 'Examination papers, answer sheets, report cards',
          assessment: 'Formal Terminal Examination marked out of 100%',
          references: 'School Academic Examination Regulations'
        }
      }
    ]
  }
};

/**
 * Generate a complete 12-week Scheme of Work automatically
 */
export const generateAutoSchemeOfWork = (
  subject: string,
  className: string,
  stream: string,
  curriculumType: CurriculumType,
  academicYear: string,
  term: 'Term 1' | 'Term 2' | 'Term 3',
  teacherName: string,
  schoolId = 'DEMO_SCHOOL',
  periodsPerWeek = 5
): SchemeOfWork => {
  const template = TANZANIA_SCHEMES_KNOWLEDGE_BASE[subject] || TANZANIA_SCHEMES_KNOWLEDGE_BASE['Physics'];

  const items: SchemeOfWorkItem[] = template.weeks.map(w => {
    if (curriculumType === 'NEW_CBC_2023') {
      return {
        id: `scheme_item_${w.week}_${Date.now()}`,
        weekNumber: w.week,
        datesOrMonth: w.dates,
        mainTopicOrCompetence: w.cbc.mainCompetence,
        subTopicOrSpecificCompetence: w.cbc.specificCompetence,
        learningActivitiesOrObjectives: w.cbc.learningActivities,
        teachingActivities: w.cbc.teachingActivities,
        teachingMaterials: w.cbc.materials,
        assessmentMethods: w.cbc.assessment,
        references: w.cbc.references,
        periodsCount: periodsPerWeek,
        remarks: 'Covered as scheduled; competencies observed'
      };
    } else {
      return {
        id: `scheme_item_${w.week}_${Date.now()}`,
        weekNumber: w.week,
        datesOrMonth: w.dates,
        mainTopicOrCompetence: w.old.mainTopic,
        subTopicOrSpecificCompetence: w.old.subTopic,
        learningActivitiesOrObjectives: w.old.specificObjectives,
        teachingActivities: w.old.teachingActivities,
        teachingMaterials: w.old.materials,
        assessmentMethods: w.old.assessment,
        references: w.old.references,
        periodsCount: periodsPerWeek,
        remarks: 'Lesson taught successfully; notes given'
      };
    }
  });

  // Generate matching Teaching Log Book entries for each week!
  const logBookEntries: TeachingLogBookEntry[] = items.map((item, idx) => ({
    id: `log_entry_${item.weekNumber}_${Date.now() + idx}`,
    schemeItemId: item.id,
    date: `2026-0${Math.min(1 + Math.floor(idx / 4), 4)}-${String(12 + (idx % 4) * 7).padStart(2, '0')}`,
    className,
    stream: stream || 'Stream A',
    periodTime: `Period 2 & 3 (08:40 - 10:00)`,
    subTopicTaught: item.subTopicOrSpecificCompetence,
    workCoveredSummary: `Delivered practical & theoretical session on ${item.subTopicOrSpecificCompetence}. Covered learning activities and assessment exercises.`,
    studentsPresent: 42,
    studentsTotal: 45,
    comprehensionEvaluation: idx % 3 === 0 ? 'EXCELLENT' : 'GOOD',
    remedialOrUncoveredReason: idx % 4 === 0 ? 'Two students needed brief recap on calculations during office hours.' : undefined,
    teacherSignature: teacherName ? teacherName.split(' ').map(n => n[0]).join('.') : 'TR.'
  }));

  return {
    id: `scheme_${Date.now()}`,
    schoolId,
    teacherName,
    className,
    stream: stream || 'All Streams',
    subject,
    curriculumType,
    academicYear,
    term,
    periodsPerWeek,
    totalWeeks: items.length,
    department: template.department,
    competenceSummary: curriculumType === 'NEW_CBC_2023' 
      ? 'Focuses on 21st-century competence development, practical hands-on investigations, critical thinking, and socio-economic problem solving aligned with NECTA 2023/2024 standards.'
      : 'Focuses on structured syllabus mastery, definition clarity, systematic formula derivation, and chalkboard exercise verification.',
    items,
    logBookEntries,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
};
