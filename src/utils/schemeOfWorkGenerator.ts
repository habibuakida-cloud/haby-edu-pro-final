import { SchemeOfWork, SchemeOfWorkItem, TeachingLogBookEntry } from '../types/schemeOfWork';
import { CurriculumType } from '../types/lessonPlan';

export interface SubjectSchemeTemplate {
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
          learningActivities: 'Measure pulling forces on diverse surfaces using digital/analog spring balances',
          teachingActivities: 'Guide experimental error analysis and facilitate discussions on brake pad wear in Tanzanian roads',
          materials: 'Wooden blocks with hooks, weights, horizontal testing boards, lubricating oil',
          assessment: 'Lab report assessing accuracy in computing coefficient of friction μ = F/R',
          references: 'TIE Physics Form 3 CBC 2023'
        },
        old: {
          mainTopic: 'Friction',
          subTopic: 'Types and Laws of Friction',
          specificObjectives: 'By the end of the week, the student should be able to distinguish static and dynamic friction',
          teachingActivities: 'Define friction on board, list laws of solid friction, give advantages and disadvantages',
          materials: 'Chalkboard, wooden block, hanging masses, pulley system',
          assessment: 'Short essay on methods of reducing friction in machines; exercise questions',
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
          materials: 'Dry cells, ammeters, voltmeters, rheostats, constantan & nichrome wires',
          assessment: 'Practical rubric on V-I data collection and gradient computation for resistance',
          references: 'TIE Secondary Physics Form 3 (CBC 2023)'
        },
        old: {
          mainTopic: 'Current Electricity',
          subTopic: 'Ohm\'s Law and Electrical Resistance',
          specificObjectives: 'By the end of the week, the student should be able to state Ohm\'s Law and verify it experimentally',
          teachingActivities: 'Draw circuit diagram on chalkboard, explain V = IR formula, guide verification experiment',
          materials: 'Chalkboard, dry cells, torch bulbs, switches, analog voltmeter',
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
          materials: 'Miniature breadboards, LED bulbs, toggle switches, solar PV cell demo',
          assessment: 'Design portfolio rubric, peer assessment on circuit feasibility and safety fuses',
          references: 'TIE Secondary Physics Form 3 (CBC 2023)'
        },
        old: {
          mainTopic: 'Current Electricity',
          subTopic: 'Series and Parallel Resistors',
          specificObjectives: 'By the end of the week, the student should be able to calculate equivalent resistance',
          teachingActivities: 'Derive equivalent resistance formulas R = R1+R2 and 1/R = 1/R1+1/R2 on chalkboard',
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
          materials: 'Sample LUKU receipts, 3-pin plugs, fuse wires, earth wire samples',
          assessment: 'Authentic task: Energy conservation plan with cost savings calculation in TZS',
          references: 'TIE Physics CBC 2023, TANESCO Consumer Guidelines'
        },
        old: {
          mainTopic: 'Current Electricity',
          subTopic: 'Electrical Power and Domestic Installation',
          specificObjectives: 'By the end of the week, the student should be able to calculate electrical energy in kWh',
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
          learningActivities: 'Undertake multi-station practical exam (mechanics trolley + circuit assembly)',
          teachingActivities: 'Administer standardized rubric-based assessment; provide constructive feedback on learner portfolios',
          materials: 'NECTA-standardized experimental apparatus, rubrics, feedback forms',
          assessment: 'Midterm Examination (Theory 60% + Practical Performance 40%)',
          references: 'NECTA Assessment Guidelines 2023/2024'
        },
        old: {
          mainTopic: 'MIDTERM EVALUATION & REVIEW',
          subTopic: 'Terminal Revision of Force, Motion and Electricity',
          specificObjectives: 'Evaluate student retention and problem-solving skills across Topics 1 and 2',
          teachingActivities: 'Administer midterm written test; mark papers and conduct chalkboard revision',
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
          materials: 'Ball and ring apparatus, bimetallic strips, Bunsen burners, tongs',
          assessment: 'Demonstration rubric, written explanation of bimetallic strip bending mechanisms',
          references: 'TIE Secondary Physics Form 3 (CBC 2023)'
        },
        old: {
          mainTopic: 'Thermal Physics',
          subTopic: 'Thermal Expansion of Solids',
          specificObjectives: 'By the end of the week, the student should be able to explain expansion using kinetic theory',
          teachingActivities: 'Draw ball and ring on chalkboard; define linear expansivity α = ΔL / (L₀ · ΔT)',
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
          learningActivities: 'Design insulated vacuum flasks or evaporative pot-in-pot cooler prototypes (zeer pots)',
          teachingActivities: 'Facilitate design showcase; connect heat transfer to energy-efficient architectural roof designs',
          materials: 'Clay pots, sand, thermometer, radiant heat sensor, colored flasks',
          assessment: 'Engineering prototype evaluation rubric; temperature drop documentation',
          references: 'TIE Secondary Physics Form 3 (CBC 2023)'
        },
        old: {
          mainTopic: 'Thermal Physics',
          subTopic: 'Modes of Heat Transfer',
          specificObjectives: 'By the end of the week, the student should be able to explain conduction, convection, and radiation',
          teachingActivities: 'List 3 modes on board; draw vacuum flask (Thermos) diagram; explain vacuum and silvered glass',
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
          specificCompetence: 'Integrating physics principles into community STEM projects',
          learningActivities: 'Teams exhibit completed STEM projects, demonstrate working prototypes to peers',
          teachingActivities: 'Coordinate peer review gallery walk, moderate assessment rubrics, record achievements',
          materials: 'Project display boards, student prototypes, evaluation score sheets',
          assessment: 'Summative STEM project exhibition rubric',
          references: 'TIE Competence-Based Assessment Framework 2023'
        },
        old: {
          mainTopic: 'GENERAL REVISION & PAST PAPER DRILLS',
          subTopic: 'NECTA Format Examination Preparation',
          specificObjectives: 'Review all core syllabus areas; practice time management for Section A, B, and C',
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
          learningActivities: 'Sit terminal examination; conduct self-assessment checklist and set learning goals',
          teachingActivities: 'Supervise terminal examination; evaluate and enter student scores into academic ledger',
          materials: 'Official examination papers, answer booklets, academic record sheets',
          assessment: 'Terminal Examination (NECTA Format) + Portfolio Assessment Mark Entry',
          references: 'Ministry of Education & NECTA Terminal Standards'
        },
        old: {
          mainTopic: 'TERMINAL EXAMINATION & CLOSURE',
          subTopic: 'End of Term Assessment and Mark Compilation',
          specificObjectives: 'Summative evaluation of student mastery of Term 1 syllabus',
          teachingActivities: 'Invigilate terminal exam, mark scripts according to marking scheme',
          materials: 'Examination papers, answer sheets, report cards',
          assessment: 'Formal Terminal Examination marked out of 100%',
          references: 'School Academic Examination Regulations'
        }
      }
    ]
  },

  'Chemistry': {
    subject: 'Chemistry',
    department: 'Science & Mathematics',
    defaultPeriodsPerWeek: 4,
    weeks: [
      {
        week: 1,
        dates: 'Week 1 (12 Jan - 16 Jan)',
        cbc: {
          mainCompetence: 'Applying chemical concepts, atomic structure, and bonding to synthesize eco-friendly substances',
          specificCompetence: 'Investigating matter, atomic structure, subatomic particles, and electronic configuration',
          learningActivities: 'Learners construct 3D atomic models using local clay and beads to illustrate proton/neutron/electron arrangements',
          teachingActivities: 'Guide atomic model construction, demonstrate flame tests for alkali metals, and facilitate atomic theory discussions',
          materials: 'Periodic table charts, atomic model kits, clay, wire, Bunsen burners, metal salt solutions',
          assessment: 'Practical rubric on model accuracy, atomic notation quiz (Z and A numbers)',
          references: 'TIE Chemistry for Secondary Schools Form 3 (CBC 2023), MoEST Chemistry Syllabus'
        },
        old: {
          mainTopic: 'Atomic Structure',
          subTopic: 'Subatomic Particles and Electronic Configuration',
          specificObjectives: 'Define atomic number, mass number, and write electronic configurations for first 20 elements',
          teachingActivities: 'Draw atomic shell diagrams on chalkboard, explain s and p orbitals, write electron arrangements (2:8:8)',
          materials: 'Chalkboard, periodic table wall chart, textbook',
          assessment: 'Chalkboard drill writing electronic configurations, short written test',
          references: 'TIE Chemistry Form 3 (Traditional Syllabus), Certificate Chemistry by Holderness'
        }
      },
      {
        week: 2,
        dates: 'Week 2 (19 Jan - 23 Jan)',
        cbc: {
          mainCompetence: 'Applying chemical concepts, atomic structure, and bonding to synthesize eco-friendly substances',
          specificCompetence: 'Analyzing chemical bonding (ionic, covalent, and metallic) and compound properties',
          learningActivities: 'Test conductivity and melting points of salt vs sugar vs paraffin wax in laboratory stations',
          teachingActivities: 'Monitor electrical safety during melting point testing; facilitate comparative property analysis',
          materials: 'Electrodes, battery packs, bulbs, sodium chloride, sucrose, wax, crucibles, Bunsen burners',
          assessment: 'Lab investigation rubric comparing ionic and covalent substance properties',
          references: 'TIE Chemistry for Secondary Schools Form 3 (CBC 2023)'
        },
        old: {
          mainTopic: 'Chemical Bonding',
          subTopic: 'Ionic and Covalent Bonding',
          specificObjectives: 'Explain electron transfer in ionic bonding and electron sharing in covalent bonding',
          teachingActivities: 'Illustrate Lewis dot-and-cross diagrams on chalkboard for NaCl, H2O, CH4 and NH3',
          materials: 'Chalkboard, colored chalk, molecular models',
          assessment: 'Diagram drawing exercises in student exercise books; homework assignment',
          references: 'TIE Chemistry Form 3'
        }
      },
      {
        week: 3,
        dates: 'Week 3 (26 Jan - 30 Jan)',
        cbc: {
          mainCompetence: 'Applying chemical stoichiometry and mole concept in industrial chemical formulation',
          specificCompetence: 'Calculating molar mass, Avogadro\'s number, and percentage composition of compounds',
          learningActivities: 'Weigh molar samples of carbon, copper, and salt; compute particle numbers using Avogadro\'s constant',
          teachingActivities: 'Demonstrate digital balance calibration; guide mole formula derivations n = m/M',
          materials: 'Digital balance, copper turnings, salt, water, calculators, mass worksheets',
          assessment: 'Stoichiometry problem-solving worksheet; molar mass calculations',
          references: 'TIE Chemistry Form 3 CBC 2023'
        },
        old: {
          mainTopic: 'Formulae, Equations and Mole Concept',
          subTopic: 'The Mole as a Unit of Measurement',
          specificObjectives: 'State Avogadro\'s law, define the mole, and convert mass to moles for given compounds',
          teachingActivities: 'Derive mole formulas on chalkboard with 4 worked numerical examples',
          materials: 'Chalkboard, scientific calculators, log tables',
          assessment: '10 calculation exercises marked in student exercise books',
          references: 'TIE Chemistry Form 3'
        }
      },
      {
        week: 4,
        dates: 'Week 4 (02 Feb - 06 Feb)',
        cbc: {
          mainCompetence: 'Applying chemical stoichiometry and mole concept in industrial chemical formulation',
          specificCompetence: 'Determining empirical and molecular formulae of organic and inorganic compounds',
          learningActivities: 'Heat magnesium ribbon in crucible to determine empirical formula of magnesium oxide experimentally',
          teachingActivities: 'Supervise crucible handling safety with tongs; guide empirical formula ratio computation from mass gain',
          materials: 'Crucibles, tongs, magnesium ribbon, pipe-clay triangles, Bunsen burners, balances',
          assessment: 'Experimental lab report assessing percentage error and empirical formula calculation',
          references: 'TIE Chemistry Form 3 CBC 2023, Practical Chemistry Guide'
        },
        old: {
          mainTopic: 'Formulae, Equations and Mole Concept',
          subTopic: 'Empirical and Molecular Formulae',
          specificObjectives: 'Calculate empirical formula from percentage composition data and molecular formula given molar mass',
          teachingActivities: 'Demonstrate step-by-step table method (element, mass, moles, ratio, simple ratio) on chalkboard',
          materials: 'Chalkboard, textbook worked examples',
          assessment: 'Classwork calculations of 5 empirical formula problems',
          references: 'TIE Chemistry Form 3'
        }
      },
      {
        week: 5,
        dates: 'Week 5 (09 Feb - 13 Feb)',
        cbc: {
          mainCompetence: 'Synthesizing acids, bases, and salts for agricultural soil conditioning and domestic sanitation',
          specificCompetence: 'Investigating pH scale, acid-base indicators, and volumetric acid-base titrations',
          learningActivities: 'Extract natural pH indicators from red cabbage/hibiscus flowers; test local soil pH samples',
          teachingActivities: 'Demonstrate plant pigment extraction with ethanol; guide pH scale interpretation for soil fertility',
          materials: 'Hibiscus petals, red cabbage, mortar & pestle, ethanol, test tubes, soil samples, universal indicator',
          assessment: 'Practical rubric on indicator extraction efficiency and soil acidity diagnosis',
          references: 'TIE Secondary Chemistry Form 3 (CBC 2023)'
        },
        old: {
          mainTopic: 'Acids, Bases and Salts',
          subTopic: 'Acidity, Alkalinity and pH Scale',
          specificObjectives: 'Define acids and bases according to Arrhenius, list properties, and explain pH scale 0-14',
          teachingActivities: 'List properties of acids and bases on chalkboard, demonstrate litmus paper and universal indicator tests',
          materials: 'Chalkboard, dilute HCl, NaOH, litmus papers, pH charts',
          assessment: 'Short test on properties of acids and bases; notebook review',
          references: 'TIE Chemistry Form 3 Traditional'
        }
      },
      {
        week: 6,
        dates: 'Week 6 (16 Feb - 20 Feb)',
        cbc: {
          mainCompetence: 'Synthesizing acids, bases, and salts for agricultural soil conditioning and domestic sanitation',
          specificCompetence: 'Performing volumetric analysis (titration) to determine molar concentration and purity',
          learningActivities: 'Pipette 25cm³ HCl, titrate against Na₂CO₃ using methyl orange indicator until sharp endpoint colour change',
          teachingActivities: 'Demonstrate correct burette reading at eye level; monitor titration technique and meniscus alignment',
          materials: 'Burettes, pipettes, conical flasks, retort stands, HCl solution, Na₂CO₃, methyl orange',
          assessment: 'Volumetric analysis practical mark sheet assessing concordant titre values (within ±0.2cm³)',
          references: 'TIE Secondary Chemistry Form 3 (CBC 2023), NECTA Practical Guide'
        },
        old: {
          mainTopic: 'Volumetric Analysis',
          subTopic: 'Acid-Base Titration Calculations',
          specificObjectives: 'Record titration readings in standard table format and calculate molarity of unknown solution',
          teachingActivities: 'Draw titration table on chalkboard, explain formula M1V1/n1 = M2V2/n2 with 3 examples',
          materials: 'Chalkboard, sample titration data charts',
          assessment: 'Classwork calculation of molarity and concentration in g/dm³ from titration data',
          references: 'TIE Chemistry Form 3'
        }
      },
      {
        week: 7,
        dates: 'Week 7 (23 Feb - 27 Feb)',
        cbc: {
          mainCompetence: 'Synthesizing acids, bases, and salts for agricultural soil conditioning and domestic sanitation',
          specificCompetence: 'Preparing soluble and insoluble salts through neutralization, precipitation, and crystallization',
          learningActivities: 'Prepare copper(II) sulphate crystals from CuO and dilute H₂SO₄; filter, evaporate and crystallise',
          teachingActivities: 'Guide evaporation and filtration techniques; explain solubility rules and ionic precipitation equations',
          materials: 'Beakers, filter paper, funnels, evaporating dishes, copper oxide, dilute sulphuric acid, tripod stands',
          assessment: 'Salt preparation practical rubric, purity observation of blue CuSO4·5H2O crystals',
          references: 'TIE Chemistry CBC 2023'
        },
        old: {
          mainTopic: 'Salts',
          subTopic: 'Methods of Preparing Salts',
          specificObjectives: 'Describe 4 methods of preparing soluble salts and double decomposition for insoluble salts',
          teachingActivities: 'Write salt preparation chemical equations on chalkboard; list solubility rules for nitrates, sulfates, chlorides',
          materials: 'Chalkboard, chart of solubility rules',
          assessment: 'Written exercise on writing balanced ionic equations for salt precipitation',
          references: 'TIE Chemistry Form 3'
        }
      },
      {
        week: 8,
        dates: 'Week 8 (02 Mar - 06 Mar)',
        cbc: {
          mainCompetence: 'MIDTERM ASSESSMENT & PRACTICAL TITRATION EVALUATION',
          specificCompetence: 'Evaluating mastery in chemical bonding, mole concept, and volumetric analysis',
          learningActivities: 'Perform individual volumetric titration exam task; answer theoretical stoichiometry paper',
          teachingActivities: 'Supervise standardized NECTA-style practical titration exam; mark burette accuracy',
          materials: 'Burettes, pipettes, standardized solutions, exam question papers',
          assessment: 'Midterm Examination (Practical Titration 40% + Theory 60%)',
          references: 'NECTA Assessment Guidelines 2023/2024'
        },
        old: {
          mainTopic: 'MIDTERM EVALUATION & REVIEW',
          subTopic: 'Revision on Atomic Structure, Mole Concept and Titration',
          specificObjectives: 'Evaluate student problem-solving speed and accuracy in chemistry calculations',
          teachingActivities: 'Administer midterm written test; conduct chalkboard correction of common errors',
          materials: 'Printed exam papers, answer booklets',
          assessment: 'Formal Midterm Examination marked out of 100%',
          references: 'School Past Examination Papers'
        }
      },
      {
        week: 9,
        dates: 'Week 9 (09 Mar - 13 Mar)',
        cbc: {
          mainCompetence: 'Managing environmental chemical hazards, pollution, and water treatment technologies',
          specificCompetence: 'Analyzing chemical energetics, exothermic/endothermic reactions, and bond energy',
          learningActivities: 'Measure temperature changes during dissolution of NH₄Cl vs NaOH in polystyrene cup calorimeters',
          teachingActivities: 'Demonstrate simple calorimetry setup; guide energy level diagram construction (ΔH negative vs positive)',
          materials: 'Polystyrene cups, digital thermometers, ammonium chloride, sodium hydroxide, distilled water',
          assessment: 'Lab report evaluating experimental heat of solution calculation ΔQ = mcΔT',
          references: 'TIE Secondary Chemistry Form 3 (CBC 2023)'
        },
        old: {
          mainTopic: 'Chemical Energetics',
          subTopic: 'Exothermic and Endothermic Reactions',
          specificObjectives: 'Define exothermic and endothermic reactions and draw energy profile diagrams',
          teachingActivities: 'Draw energy level diagrams on chalkboard, define enthalpy change ΔH with combustion examples',
          materials: 'Chalkboard, chart showing energy profile curves',
          assessment: 'Diagram drawing quiz in exercise books; numerical exercise on heat changes',
          references: 'TIE Chemistry Form 3'
        }
      },
      {
        week: 10,
        dates: 'Week 10 (16 Mar - 20 Mar)',
        cbc: {
          mainCompetence: 'Managing environmental chemical hazards, pollution, and water treatment technologies',
          specificCompetence: 'Investigating chemical equilibrium, Le Chatelier\'s principle, and reaction rates',
          learningActivities: 'Investigate effect of concentration and temperature on iodine clock reaction rates in group stations',
          teachingActivities: 'Facilitate rate graph plotting (volume vs time); guide deduction of surface area and catalyst effects',
          materials: 'Sodium thiosulphate, HCl, stopwatches, conical flasks, cross paper, water baths',
          assessment: 'Reaction rate graph analysis rubric and Le Chatelier principle application test',
          references: 'TIE Secondary Chemistry Form 3 (CBC 2023)'
        },
        old: {
          mainTopic: 'Rates of Chemical Reactions',
          subTopic: 'Factors Affecting Reaction Rate',
          specificObjectives: 'List 5 factors affecting reaction rates and explain collision theory',
          teachingActivities: 'Explain concentration, temperature, catalyst, surface area on chalkboard with collision diagrams',
          materials: 'Chalkboard, rate charts',
          assessment: '5 short answer questions on factors affecting chemical reaction rates',
          references: 'TIE Chemistry Form 3'
        }
      },
      {
        week: 11,
        dates: 'Week 11 (23 Mar - 27 Mar)',
        cbc: {
          mainCompetence: 'SUSTAINABLE CHEMISTRY PROJECT & EXHIBITION',
          specificCompetence: 'Synthesizing chemistry concepts into eco-friendly products (soap / water filter / fertilizer)',
          learningActivities: 'Teams fabricate homemade soaps using local seed oils and ash lye or water purification filters',
          teachingActivities: 'Coordinate green chemistry product exhibition; judge product quality and saponification process',
          materials: 'Coconut oil, NaOH, essential oils, water filter media, pH strips',
          assessment: 'Green chemistry product design and lab report rubric',
          references: 'TIE Competence-Based Assessment Framework 2023'
        },
        old: {
          mainTopic: 'GENERAL REVISION & PAST PAPER DRILLS',
          subTopic: 'NECTA Chemistry Paper 1 & Paper 2 Format Drills',
          specificObjectives: 'Review stoichiometry, volumetric analysis, and organic chemistry principles',
          teachingActivities: 'Solve past NECTA national exam questions on chalkboard with student participation',
          materials: 'Chalkboard, NECTA past papers 2018-2023',
          assessment: 'Timed mock drill on Section A and B questions',
          references: 'NECTA Chemistry Review Series'
        }
      },
      {
        week: 12,
        dates: 'Week 12 (30 Mar - 03 Apr)',
        cbc: {
          mainCompetence: 'TERMINAL COMPETENCE EVALUATION & REFLECTION',
          specificCompetence: 'Summative terminal examination covering Term 1 chemistry competences',
          learningActivities: 'Sit terminal chemistry examination; log areas for Term 2 practical skill growth',
          teachingActivities: 'Invigilate terminal examination; mark scripts according to standardized scheme; record in ledger',
          materials: 'Official examination papers, answer booklets, periodic tables',
          assessment: 'Terminal Examination (NECTA Format)',
          references: 'Ministry of Education & NECTA Terminal Standards'
        },
        old: {
          mainTopic: 'TERMINAL EXAMINATION & CLOSURE',
          subTopic: 'End of Term Assessment and Mark Compilation',
          specificObjectives: 'Summative evaluation of student mastery of Term 1 chemistry syllabus',
          teachingActivities: 'Invigilate terminal exam, mark scripts, enter marks into ledger',
          materials: 'Examination papers, answer sheets, report cards',
          assessment: 'Formal Terminal Examination marked out of 100%',
          references: 'School Academic Examination Regulations'
        }
      }
    ]
  },

  'Biology': {
    subject: 'Biology',
    department: 'Science & Mathematics',
    defaultPeriodsPerWeek: 4,
    weeks: [
      {
        week: 1,
        dates: 'Week 1 (12 Jan - 16 Jan)',
        cbc: {
          mainCompetence: 'Investigating cellular structures, physiological processes, and biological diversity',
          specificCompetence: 'Examining cell structure, organelle functions, and light microscopy techniques',
          learningActivities: 'Prepare wet mount slides of onion epidermal cells and human cheek cells; observe under light microscope',
          teachingActivities: 'Demonstrate light microscope handling and mirror alignment; guide cell diagram drawing rules (magnification, labels)',
          materials: 'Light microscopes, glass slides, cover slips, iodine solution, onion bulbs, mounted needles',
          assessment: 'Biological drawing rubric (clear lines, magnification calculation, accurate labels)',
          references: 'TIE Biology for Secondary Schools Form 3 (CBC 2023), MoEST Biology Guide'
        },
        old: {
          mainTopic: 'Cell Biology',
          subTopic: 'Cell Structure and Microscopy',
          specificObjectives: 'Identify parts of a light microscope and compare plant and animal cells under microscope',
          teachingActivities: 'Draw plant and animal cell diagrams on chalkboard, list organelle functions (nucleus, mitochondrion, chloroplast)',
          materials: 'Chalkboard, cell charts, microscope model',
          assessment: 'Labeling test on cell diagrams; written exercise in exercise books',
          references: 'TIE Biology Form 3 Traditional Syllabus'
        }
      },
      {
        week: 2,
        dates: 'Week 2 (19 Jan - 23 Jan)',
        cbc: {
          mainCompetence: 'Investigating cellular structures, physiological processes, and biological diversity',
          specificCompetence: 'Analyzing cell physiology: diffusion, osmosis, and active transport mechanisms',
          learningActivities: 'Investigate osmosis using potato osmometers in concentrated salt/sugar solutions vs distilled water',
          teachingActivities: 'Guide potato cylinder mass/length measurements before and after immersion; facilitate turgor pressure discussion',
          materials: 'Irish potatoes, cork borers, sucrose solutions, petri dishes, electronic balances, scalpels',
          assessment: 'Lab report evaluating percentage change in mass and osmosis graph interpretation',
          references: 'TIE Biology Form 3 CBC 2023'
        },
        old: {
          mainTopic: 'Cell Physiology',
          subTopic: 'Diffusion and Osmosis',
          specificObjectives: 'Define diffusion and osmosis and describe their importance in living organisms',
          teachingActivities: 'Explain diffusion in air/water and osmosis across semi-permeable membranes on chalkboard',
          materials: 'Chalkboard, potassium permanganate crystals, beaker, water',
          assessment: 'Class exercise defining turgidity, plasmolysis, and wilting',
          references: 'TIE Biology Form 3'
        }
      },
      {
        week: 3,
        dates: 'Week 3 (26 Jan - 30 Jan)',
        cbc: {
          mainCompetence: 'Evaluating human nutrition, digestive health, and metabolic enzyme efficiency',
          specificCompetence: 'Investigating macronutrients, food tests, and enzyme activity factors (pH, temperature)',
          learningActivities: 'Conduct qualitative food tests for starch (iodine), reducing sugars (Benedict\'s), proteins (Biuret), fats (emulsion)',
          teachingActivities: 'Supervise hot water bath safety; guide color change recording (blue to brick-red, pale blue to violet)',
          materials: 'Test tubes, Benedict\'s reagent, Iodine, Biuret reagent, ethanol, food samples (bread, milk, egg white)',
          assessment: 'Practical food test result table accuracy and chemical deduction rubric',
          references: 'TIE Biology Form 3 CBC 2023, Practical Biology Manual'
        },
        old: {
          mainTopic: 'Nutrition',
          subTopic: 'Food Substances and Food Tests',
          specificObjectives: 'List classes of food, state functions, and carry out standard food tests for starch, sugar, protein, fat',
          teachingActivities: 'Draw food test summary table on chalkboard; explain reagents and expected observation changes',
          materials: 'Chalkboard, food test reagents, chart of balanced diets',
          assessment: 'Marked food test table in student practical notebooks',
          references: 'TIE Biology Form 3'
        }
      },
      {
        week: 4,
        dates: 'Week 4 (02 Feb - 06 Feb)',
        cbc: {
          mainCompetence: 'Evaluating human nutrition, digestive health, and metabolic enzyme efficiency',
          specificCompetence: 'Analyzing human alimentary canal, digestive enzymes, absorption, and liver functions',
          learningActivities: 'Trace food passage through digestive system using 3D torsos and organ models; investigate salivary amylase action',
          teachingActivities: 'Demonstrate starch breakdown by saliva over time; explain villi structural adaptations for absorption',
          materials: 'Human digestive torso model, starch solution, iodine, spot plates, warm water baths',
          assessment: 'Organ adaptation chart and enzyme rate curve interpretation',
          references: 'TIE Biology Form 3 CBC 2023'
        },
        old: {
          mainTopic: 'Human Digestion',
          subTopic: 'The Alimentary Canal and Digestive Enzymes',
          specificObjectives: 'Identify parts of human digestive system and state enzymes in mouth, stomach, pancreas, small intestine',
          teachingActivities: 'Draw digestive system on chalkboard, write enzyme summary table (substrate -> enzyme -> product)',
          materials: 'Chalkboard, wall chart of human digestive system',
          assessment: 'Labeling quiz of digestive system diagram; homework questions',
          references: 'TIE Biology Form 3'
        }
      },
      {
        week: 5,
        dates: 'Week 5 (09 Feb - 13 Feb)',
        cbc: {
          mainCompetence: 'Designing respiratory health interventions and investigating gas exchange mechanisms',
          specificCompetence: 'Comparing mammalian lung structure, gaseous exchange mechanisms, and respiratory diseases',
          learningActivities: 'Dissect mammalian lungs (bovine/caprine); inflate using tube to observe pleural expansion and bronchial tree',
          teachingActivities: 'Demonstrate lung dissection safely; guide observation of cartilaginous rings and alveolar vascularization',
          materials: 'Fresh goat/ox lungs with trachea, dissection trays, scalpel, magnifying glasses, hand pumps',
          assessment: 'Dissection drawing rubric and respiratory surface adaptation checklist',
          references: 'TIE Secondary Biology Form 3 (CBC 2023)'
        },
        old: {
          mainTopic: 'Gaseous Exchange',
          subTopic: 'Human Respiratory System',
          specificObjectives: 'Describe structure of trachea, bronchi, alveoli and mechanism of breathing (inhalation & exhalation)',
          teachingActivities: 'Draw bell-jar model of breathing on chalkboard, explain diaphragm and intercostal muscle movement',
          materials: 'Chalkboard, bell-jar breathing model, respiratory wall chart',
          assessment: 'Comparison table exercise between inhaled and exhaled air',
          references: 'TIE Biology Form 3 Traditional'
        }
      },
      {
        week: 6,
        dates: 'Week 6 (16 Feb - 20 Feb)',
        cbc: {
          mainCompetence: 'Analyzing transport systems in plants and animals for health and agricultural productivity',
          specificCompetence: 'Investigating human circulatory system, heart anatomy, blood vessels, and blood groups',
          learningActivities: 'Dissect mammalian heart to identify atria, ventricles, coronary arteries, valves; test blood pressure with sphygmomanometer',
          teachingActivities: 'Demonstrate heart dissection; guide pulse rate measurement before and after exercise',
          materials: 'Fresh mammalian hearts, dissection kits, digital sphygmomanometers, stopwatches, heart charts',
          assessment: 'Heart anatomy practical rubric, cardiac cycle flowchart accuracy',
          references: 'TIE Secondary Biology Form 3 (CBC 2023)'
        },
        old: {
          mainTopic: 'Transport of Substances',
          subTopic: 'Mammalian Circulatory System and Heart Anatomy',
          specificObjectives: 'Identify 4 chambers of heart, explain double circulation, and list functions of blood components',
          teachingActivities: 'Draw internal heart diagram on chalkboard, trace blood flow path (pulmonary & systemic)',
          materials: 'Chalkboard, circulatory system chart, heart model',
          assessment: 'Diagram labeling test of heart; homework on ABO blood groups',
          references: 'TIE Biology Form 3'
        }
      },
      {
        week: 7,
        dates: 'Week 7 (23 Feb - 27 Feb)',
        cbc: {
          mainCompetence: 'Analyzing transport systems in plants and animals for health and agricultural productivity',
          specificCompetence: 'Investigating plant transport: xylem, phloem, transpiration rate factors, and potometer experiments',
          learningActivities: 'Measure transpiration rates of leafy shoots under fan/light/humid conditions using bubble potometers',
          teachingActivities: 'Guide potometer setup avoiding air bubbles; explain transpiration pull, cohesion, and adhesion forces',
          materials: 'Bubble potometers, leafy shoots (Eucalyptus/Hibiscus), capillary tubes, Vaseline, electric fans, lamps',
          assessment: 'Transpiration rate experimental graph rubric and stomatal adaptation analysis',
          references: 'TIE Biology CBC 2023'
        },
        old: {
          mainTopic: 'Transport in Plants',
          subTopic: 'Transpiration and Vascular Bundles',
          specificObjectives: 'Define transpiration, list 4 external factors affecting rate, and describe xylem/phloem functions',
          teachingActivities: 'Draw stem cross-section showing vascular bundles on chalkboard; explain transpiration stream',
          materials: 'Chalkboard, cobalt chloride paper, potted plant, plastic bag',
          assessment: 'Written exercise on factors affecting transpiration rate',
          references: 'TIE Biology Form 3'
        }
      },
      {
        week: 8,
        dates: 'Week 8 (02 Mar - 06 Mar)',
        cbc: {
          mainCompetence: 'MIDTERM ASSESSMENT & BIOLOGICAL DISSECTION EVALUATION',
          specificCompetence: 'Synthesizing cell physiology, nutrition, gas exchange, and circulatory system mastery',
          learningActivities: 'Perform practical heart/lung dissection task and complete theoretical biology examination paper',
          teachingActivities: 'Administer standardized NECTA format practical + theory midterm exam',
          materials: 'Dissection specimens, microscopes, food test reagents, exam papers',
          assessment: 'Midterm Examination (Practical Performance 40% + Theory 60%)',
          references: 'NECTA Assessment Guidelines 2023/2024'
        },
        old: {
          mainTopic: 'MIDTERM EVALUATION & REVIEW',
          subTopic: 'Revision on Cell Biology, Digestion, Respiration and Transport',
          specificObjectives: 'Evaluate student retention of biological concepts and practical diagram skills',
          teachingActivities: 'Administer midterm written test; conduct chalkboard review of challenging questions',
          materials: 'Printed exam papers, answer booklets',
          assessment: 'Formal Midterm Examination marked out of 100%',
          references: 'School Past Examination Papers'
        }
      },
      {
        week: 9,
        dates: 'Week 9 (09 Mar - 13 Mar)',
        cbc: {
          mainCompetence: 'Promoting community health through understanding disease transmission and immunology',
          specificCompetence: 'Investigating infectious vs non-infectious diseases, vectors, pathogens, and immune response',
          learningActivities: 'Conduct community health audit on malaria vector breeding sites around school grounds; design control interventions',
          teachingActivities: 'Guide mosquito larva collection; explain parasite life cycle (Plasmodium) and vaccination mechanics',
          materials: 'Magnifying glasses, dipping nets, specimen jars, disease life-cycle charts, health posters',
          assessment: 'Community health audit report and disease prevention poster presentation',
          references: 'TIE Secondary Biology Form 3 (CBC 2023), Ministry of Health Guidelines'
        },
        old: {
          mainTopic: 'Health and Immunity',
          subTopic: 'Infectious Diseases and Vector Control',
          specificObjectives: 'State causes, signs, symptoms, transmission, and prevention of Malaria, Cholera, Tuberculosis, HIV/AIDS',
          teachingActivities: 'List major tropical diseases on chalkboard; write transmission and prevention table',
          materials: 'Chalkboard, health charts showing disease vectors',
          assessment: 'Table completion test on diseases, pathogens, vectors and control measures',
          references: 'TIE Biology Form 3'
        }
      },
      {
        week: 10,
        dates: 'Week 10 (16 Mar - 20 Mar)',
        cbc: {
          mainCompetence: 'Conserving ecological ecosystems, biodiversity, and managing environmental sustainability',
          specificCompetence: 'Analyzing food chains, food webs, trophic levels, energy flow, and ecological pyramids',
          learningActivities: 'Construct local Tanzanian park ecosystem food webs (Serengeti/Mikumi) using organism cards and yarn connections',
          teachingActivities: 'Facilitate food web disruption simulation (e.g., removing top predator); explain 10% energy transfer rule',
          materials: 'Ecosystem organism cards, yarn rolls, poster boards, biodiversity charts',
          assessment: 'Food web construction rubric and ecological impact analysis essay',
          references: 'TIE Secondary Biology Form 3 (CBC 2023)'
        },
        old: {
          mainTopic: 'Ecology',
          subTopic: 'Ecosystems, Food Chains and Energy Flow',
          specificObjectives: 'Define ecosystem, producer, consumer, decomposer and construct a food chain with 4 trophic levels',
          teachingActivities: 'Draw food chain and pyramid of numbers on chalkboard; explain energy loss at each trophic level',
          materials: 'Chalkboard, ecosystem wall charts',
          assessment: 'Classwork drawing food webs and identifying primary vs secondary consumers',
          references: 'TIE Biology Form 3'
        }
      },
      {
        week: 11,
        dates: 'Week 11 (23 Mar - 27 Mar)',
        cbc: {
          mainCompetence: 'COMMUNITY HEALTH & ECOLOGY EXHIBITION',
          specificCompetence: 'Synthesizing biological concepts into community health or conservation projects',
          learningActivities: 'Student teams present community disease prevention plans or school garden compost projects',
          teachingActivities: 'Coordinate science gallery walk; judge student health/conservation project portfolios',
          materials: 'Project display boards, student models, evaluation rubrics',
          assessment: 'Summative Biology Project Exhibition Rubric',
          references: 'TIE Competence-Based Assessment Framework 2023'
        },
        old: {
          mainTopic: 'GENERAL REVISION & NECTA DRILLS',
          subTopic: 'NECTA Biology Paper 1, Paper 2 & Paper 3 Drills',
          specificObjectives: 'Review core biological diagrams, food tests, and specimen classification skills',
          teachingActivities: 'Solve past NECTA national exam questions on chalkboard with active student participation',
          materials: 'Chalkboard, NECTA past papers 2018-2023',
          assessment: 'Timed mock drill on Section A, B and C questions',
          references: 'NECTA Biology Review Series'
        }
      },
      {
        week: 12,
        dates: 'Week 12 (30 Mar - 03 Apr)',
        cbc: {
          mainCompetence: 'TERMINAL COMPETENCE EVALUATION & REFLECTION',
          specificCompetence: 'Summative terminal examination covering Term 1 biology competences',
          learningActivities: 'Sit terminal biology examination; reflect on portfolio milestones and set Term 2 goals',
          teachingActivities: 'Invigilate terminal examination; mark scripts according to standardized marking scheme; record in ledger',
          materials: 'Official examination papers, answer booklets, specimen guides',
          assessment: 'Terminal Examination (NECTA Format)',
          references: 'Ministry of Education & NECTA Terminal Standards'
        },
        old: {
          mainTopic: 'TERMINAL EXAMINATION & CLOSURE',
          subTopic: 'End of Term Assessment and Ledger Entry',
          specificObjectives: 'Summative evaluation of student mastery of Term 1 biology syllabus',
          teachingActivities: 'Invigilate terminal exam, mark scripts, enter marks into academic ledger',
          materials: 'Examination papers, answer sheets, report cards',
          assessment: 'Formal Terminal Examination marked out of 100%',
          references: 'School Academic Examination Regulations'
        }
      }
    ]
  },

  'Kiswahili': {
    subject: 'Kiswahili',
    department: 'Lugha na Fasihi',
    defaultPeriodsPerWeek: 4,
    weeks: [
      {
        week: 1,
        dates: 'Wiki ya 1 (12 Jan - 16 Jan)',
        cbc: {
          mainCompetence: 'Kutumia mfumo wa sarufi na muundo wa lugha ya Kiswahili katika mawasiliano sanifu',
          specificCompetence: 'Kuchanganua aina za maneno (Nomino, Vivumishi, Vitenzi, Viwakilishi) na ngeli za Kiswahili',
          learningActivities: 'Wanafunzi wanasoma vifungu vya habari na kuainisha aina za maneno katika jedwali kwa kazi za kikundi',
          teachingActivities: 'Kuelekeza uainishaji wa aina 8 za maneno, kuongoza mifano ubaoni na kusimamia mijadala ya ngeli (A-WA, KI-VI, I-ZI)',
          materials: 'Chati ya aina za maneno, chati ya ngeli za Kiswahili, kamusi ya Kiswahili Sanifu, vifungu vya habari',
          assessment: 'Rubriki ya kazi za kikundi kwenye uainishaji wa maneno, zoezi la kuandika sentensi katika ngeli mbalimbali',
          references: 'TET Kiswahili Kidato cha 3 (Mtaala Mpya wa Umahiri 2023), Kamusi ya Kiswahili Sanifu (TUKI)'
        },
        old: {
          mainTopic: 'Sarufi na Matumizi ya Lugha',
          subTopic: 'Aina za Maneno na Ngeli za Nomino',
          specificObjectives: 'Kufikia mwisho wa wiki, mwanafunzi aweze kutaja aina 8 za maneno na kupanga nomino katika ngeli sahihi',
          teachingActivities: 'Kuandika maana na mifano ya aina za maneno ubaoni, kueleza ngeli za Kiswahili na kutoa mazoezi ubaoni',
          materials: 'Ubao, chaki, kitabu cha kiada cha TET Kidato cha 3',
          assessment: 'Zoezi la ubaoni la kuainisha maneno 10, kukagua daftari za wanafunzi',
          references: 'TET Kiswahili Kidato cha 3 (Mtaala wa Zamani)'
        }
      },
      {
        week: 2,
        dates: 'Wiki ya 2 (19 Jan - 23 Jan)',
        cbc: {
          mainCompetence: 'Kutumia mfumo wa sarufi na muundo wa lugha ya Kiswahili katika mawasiliano sanifu',
          specificCompetence: 'Kuchanganua muundo wa sentensi (Sentensi Sahili, Ambatanifu na Changamano) na mnyambuliko wa vitenzi',
          learningActivities: 'Wanafunzi wanatunga na kuchanganua sentensi changamano kwa kutumia matawi au jedwali ubaoni',
          teachingActivities: 'Kufundisha viambishi awali na tamati katika mnyambuliko wa vitenzi (Kutenda, Kutendewa, Kutendesha, Kutendana)',
          materials: 'Kadi za viambishi, chati za muundo wa sentensi, vielelezo vya mnyambuliko',
          assessment: 'Upimaji wa uchanganuzi wa sentensi, zoezi la mnyambuliko wa vitenzi',
          references: 'TET Kiswahili Kidato cha 3 (CBC 2023)'
        },
        old: {
          mainTopic: 'Sarufi na Matumizi ya Lugha',
          subTopic: 'Mnyambuliko wa Vitenzi na Muundo wa Sentensi',
          specificObjectives: 'Kunyambulisha vitenzi katika kauli 5 za Kiswahili na kutofautisha sentensi sahili na ambatanifu',
          teachingActivities: 'Kuandika mifano ya kauli za vitenzi ubaoni, kueleza kiwambo cha sentensi (KN + KT)',
          materials: 'Ubao, chaki, chati za sarufi',
          assessment: 'Zoezi la nyumbani la kunyambulisha vitenzi 10 na kuchanganua sentensi 5',
          references: 'TET Kiswahili Kidato cha 3'
        }
      },
      {
        week: 3,
        dates: 'Wiki ya 3 (26 Jan - 30 Jan)',
        cbc: {
          mainCompetence: 'Kuhakiki na kutathmini kazi za Fasihi Simulizi na Fasihi Andishi katika jamii',
          specificCompetence: 'Kuchanganua utanzu na vipera vya Fasihi SimulIZING (Hadithi, Methali, Misemo, Vitendawili, Nyimbo)',
          learningActivities: 'Wanafunzi wanawasilisha igizo fupi la hadithi za kijadi au nyimbo za jamii na kubainisha maudhui na maadili',
          teachingActivities: 'Kushajiisha igizo la utamaduni, kuongoza uchambuzi wa fani na maudhui katika vipera vya fasihi simulizi',
          materials: 'Vifaa vya igizo la utamaduni, vinasa sauti, chati za utanzu wa fasihi simulizi',
          assessment: 'Rubriki ya uwasilishaji wa sanaa ya maonyesho, dodoso la uchambuzi wa methali na misemo',
          references: 'TET Kiswahili Kidato cha 3 CBC 2023, Misingi ya Fasihi Simulizi'
        },
        old: {
          mainTopic: 'Fasihi Simulizi',
          subTopic: 'Utanzu na Vipera vya Fasihi Simulizi',
          specificObjectives: 'Kueleza maana ya fasihi simulizi, kutaja tanzu 4 kuu na kueleza sifa za kila kipera',
          teachingActivities: 'Kuandika mchoro wa matawi wa tanzu za fasihi simulizi ubaoni, kueleza tofauti kati ya fasihi simulizi na andishi',
          materials: 'Ubao, kitabu cha fasihi simulizi',
          assessment: 'Maswali ya mdomo na zoezi la kuandika sifa 5 za hadithi za kijadi',
          references: 'TET Kiswahili Kidato cha 3'
        }
      },
      {
        week: 4,
        dates: 'Wiki ya 4 (02 Feb - 06 Feb)',
        cbc: {
          mainCompetence: 'Kuhakiki na kutathmini kazi za Fasihi Simulizi na Fasihi Andishi katika jamii',
          specificCompetence: 'Kuhakiki riwaya na tamthiliya teule za Kiswahili: Fani (Maudhui, Dhamira, Anwani, Wahusika, Mtindo)',
          learningActivities: 'Vikundi vya wanafunzi vinahakiki riwaya teule za TET na kuwasilisha uchambuzi wa wahusika wakuu na wadogo',
          teachingActivities: 'Kuelekeza mbinu za uhakiki wa Fasihi Andishi, kusimamia mijadala ya dhamira kuu na migogoro katika riwaya',
          materials: 'Riwaya teule za Kidato cha 3/4 (Takadini/Kiumbe cha Ajabu/Nguvu ya Sala), chati za uhakiki',
          assessment: 'Rubriki ya uchambuzi wa riwaya, insha ya uhakiki wa wahusika',
          references: 'TET Vitabu Teule vya Riwaya na Tamthiliya Kidato cha 3/4'
        },
        old: {
          mainTopic: 'Fasihi Andishi',
          subTopic: 'Uhakiki wa Riwaya na Tamthiliya',
          specificObjectives: 'Kueleza vipengele vya fani na maudhui na kubainisha dhamira 3 kutoka katika riwaya teule',
          teachingActivities: 'Kueleza maana ya fani na maudhui ubaoni, kufanya uchambuzi wa sura kwa sura na wanafunzi',
          materials: 'Ubao, vitabu teule vya riwaya',
          assessment: 'Insha fupi ya uchambuzi wa dhamira kuu katika riwaya teule',
          references: 'TET Kiswahili Kidato cha 3'
        }
      },
      {
        week: 5,
        dates: 'Wiki ya 5 (09 Feb - 13 Feb)',
        cbc: {
          mainCompetence: 'Kuhakiki na kutathmini kazi za Fasihi Simulizi na Fasihi Andishi katika jamii',
          specificCompetence: 'Kuhakiki ushairi wa Kiswahili: Mashairi ya Arudhi na Mashairi ya Gondo/Hurudhi (Muundo, Vizio, Tamathali za Semi)',
          learningActivities: 'Wanafunzi wanasoma na kuimba mashairi teule, kubainisha urari wa vina na mizani, ubeti, mshororo na kituo',
          teachingActivities: 'Kuelekeza muundo wa shairi la arudhi (mizani, vina, vituo) na bahari za mashairi (Tarbia, Takhmisa, Ukonfi)',
          materials: 'Diwani teule za mashairi (Diwani ya Amri/Wasakatonge), chati ya bahari za mashairi',
          assessment: 'Zoezi la kuchanganua mizani na vina vya shairi teule, uandishi wa shairi fupi',
          references: 'TET Kiswahili Kidato cha 3 CBC 2023'
        },
        old: {
          mainTopic: 'Fasihi Andishi',
          subTopic: 'Uhakiki wa Mashairi',
          specificObjectives: 'Kueleza maana ya vina, mizani, ubeti, mshororo na kutaja sifa za shairi la arudhi',
          teachingActivities: 'Kuandika shairi ubaoni, kuhesabu mizani na kuonyesha vina vya kati na vya mwisho ubaoni',
          materials: 'Ubao, diwani ya mashairi',
          assessment: 'Zoezi la kuhesabu mizani na kubainisha vina vya shairi ubaoni',
          references: 'TET Kiswahili Kidato cha 3'
        }
      },
      {
        week: 6,
        dates: 'Wiki ya 6 (16 Feb - 20 Feb)',
        cbc: {
          mainCompetence: 'Kukuza stadi za Ufahamu, Ufupisho, na Uandishi wa Insha za Kiumbifu na Kazi',
          specificCompetence: 'Kusoma vifungu vya ufahamu kwa ufasaha na kuandika ufupisho sanifu wa maneno 100-150',
          learningActivities: 'Wanafunzi wanasoma makala ya kijamii, wanatoa mawazo kuu na kuandika ufupisho wa aya moja',
          teachingActivities: 'Kuelekeza hatua za uandishi wa ufupisho (kusoma, kupiga mstari hoja kuu, kuunganisha kwa viunganishi)',
          materials: 'Makala za magazeti sanifu, vifungu vya ufahamu, chati za kanuni za ufupisho',
          assessment: 'Tathmini ya kifungu cha ufahamu na zoezi la uandishi wa ufupisho sanifu',
          references: 'TET Kiswahili Kidato cha 3 CBC 2023'
        },
        old: {
          mainTopic: 'Ufahamu na Ufupisho',
          subTopic: 'Mbinu za Kusoma na Kuandika Ufupisho',
          specificObjectives: 'Kujibu maswali ya kifungu cha ufahamu na kuandika muhtasari wa kifungu kwa maneno yasiyozidi 100',
          teachingActivities: 'Kusoma kifungu ubaoni au kwenye kiada, kuandika maswali ya ufahamu na kueleza kanuni za ufupisho',
          materials: 'Ubao, vitabu vya kiada',
          assessment: 'Maswali 5 ya ufahamu na zoezi la kuandika ufupisho',
          references: 'TET Kiswahili Kidato cha 3'
        }
      },
      {
        week: 7,
        dates: 'Wiki ya 7 (23 Feb - 27 Feb)',
        cbc: {
          mainCompetence: 'Kukuza stadi za Ufahamu, Ufupisho, na Uandishi wa Insha za Kiumbifu na Kazi',
          specificCompetence: 'Kuandika barua rasmi, barua za kirafiki, Kumbukumbu za Mkutano, na Risala za Kiofisi',
          learningActivities: 'Wanafunzi wanaandaa na kuandika kumbukumbu za mkutano wa darasa na barua rasmi ya kuomba nafasi ya kazi',
          teachingActivities: 'Kuelekeza muundo sahihi wa barua rasmi (anwani 2, kichwa cha habari, mwili, saini) na kumbukumbu za mkutano',
          materials: 'Sampuli za barua rasmi, vielelezo vya kumbukumbu za mkutano, chati za uandishi rasmi',
          assessment: 'Rubriki ya muundo na lugha katika uandishi wa barua rasmi na kumbukumbu za mkutano',
          references: 'TET Kiswahili Kidato cha 3 CBC 2023'
        },
        old: {
          mainTopic: 'Uandishi wa Insha na Barua',
          subTopic: 'Uandishi wa Barua Rasmi na Kumbukumbu',
          specificObjectives: 'Kuandika barua rasmi yenye muundo sahihi na kueleza vipengele 6 vya kumbukumbu za mkutano',
          teachingActivities: 'Kuchora muundo wa barua rasmi ubaoni, kueleza sehemu za kumbukumbu (Waliohudhuria, Ajenda, Maazimio)',
          materials: 'Ubao, chaki, sampuli za barua',
          assessment: 'Zoezi la kuandika barua rasmi ya kuomba ruhusa au kazi',
          references: 'TET Kiswahili Kidato cha 3'
        }
      },
      {
        week: 8,
        dates: 'Wiki ya 8 (02 Mar - 06 Mar)',
        cbc: {
          mainCompetence: 'PIMHO LA KATIKATI YA MUHULA NA TATHMINI YA KAZI ZA SANAA',
          specificCompetence: 'Kupima umahiri wa sarufi, fasihi simulizi, fasihi andishi na uandishi wa barua/insha',
          learningActivities: 'Fanya mtihani wa katikati ya muhula wa mbinu za NECTA na kujadili marekebisho',
          teachingActivities: 'Kusimamia mtihani wa katikati ya muhula, kusahihisha na kutoa mrejesho wa kina kwa wanafunzi',
          materials: 'Karatasi za mtihani wa NECTA, vitabu vya majibu',
          assessment: 'Mtihani wa Katikati ya Muhula (Lugha 50% + Fasihi 50%)',
          references: 'Mwongozo wa Tathmini wa NECTA 2023/2024'
        },
        old: {
          mainTopic: 'MARUDIO NA MTIHANI WA KATIKATI YA MUHULA',
          subTopic: 'Mtihani wa Sarufi, Fasihi na Ufahamu',
          specificObjectives: 'Kutathmini uelewa wa wanafunzi katika mada zote zilizofundishwa',
          teachingActivities: 'Kusimamia mtihani, kusahihisha na kufanya marudio ubaoni',
          materials: 'Karatasi za mtihani zilizopigwa chapa',
          assessment: 'Mtihani Rasmi wa Katikati ya Muhula (Alama 100)',
          references: 'Mitihani ya Nyuma ya Shule'
        }
      },
      {
        week: 9,
        dates: 'Wiki ya 9 (09 Mar - 13 Mar)',
        cbc: {
          mainCompetence: 'Kutathmini Historia, Maendeleo, na Ukuaji wa Kiswahili Nchini Tanzania na Duniani',
          specificCompetence: 'Kuchanganua chimbuko la Kiswahili, dhima ya Kiswahili kabla na baada ya Uhuru, na mashirika ya Kiswahili (BAKITA, TATAKI)',
          learningActivities: 'Wanafunzi wanajadili katika vikundi dhima ya BAKITA na Kiswahili kama lugha ya Taifa na Afrika Mashariki (EAC)',
          teachingActivities: 'Kueleza mabadiliko ya Kiswahili kutoka lugha ya biashara hadi lugha ya kimataifa (UNESCO Kiswahili Day)',
          materials: 'Ramani ya Afrika Mashariki, makala za historia ya Kiswahili, chati za BAKITA/TATAKI',
          assessment: 'Insha ya historia na ukuaji wa Kiswahili, majadiliano ya vikundi',
          references: 'TET Kiswahili Kidato cha 3 CBC 2023, BAKITA Miongozo'
        },
        old: {
          mainTopic: 'Ukuaji na Maendeleo ya Kiswahili',
          subTopic: 'Chimbuko la Kiswahili na Vyombo vya Kukuza Kiswahili',
          specificObjectives: 'Kueleza nadharia za chimbuko la Kiswahili na kutaja majukumu 4 ya BAKITA',
          teachingActivities: 'Kuandika nadharia 3 za chimbuko la Kiswahili ubaoni (Kiarabu, Kigozi, Kibantu), kueleza majukumu ya BAKITA',
          materials: 'Ubao, chati za vyombo vya Kiswahili',
          assessment: 'Maswali ya insha kuhusu majukumu ya BAKITA na TATAKI',
          references: 'TET Kiswahili Kidato cha 3'
        }
      },
      {
        week: 10,
        dates: 'Wiki ya 10 (16 Mar - 20 Mar)',
        cbc: {
          mainCompetence: 'Kutumia Mbinu za Mawasiliano ya Kimtandao na Vyombo vya Habari katika Lugha ya Kiswahili',
          specificCompetence: 'Kuhakiki matumizi ya Kiswahili katika vyombo vya habari (Magazeti, Redio, Televisheni, Mtandao)',
          learningActivities: 'Wanafunzi wanahakiki makosa ya kisarufi katika magazeti ya Kiswahili na kuandika makala fupi ya habari',
          teachingActivities: 'Kuelekeza lugha ya waandishi wa habari (Lugha ya Mtaani vs Lugha Sanifu), kusimamia uandishi wa habari',
          materials: 'Magazeti ya Kiswahili (Mwananchi, HabariLeo, Nipashe), vielelezo vya mtandao',
          assessment: 'Rubriki ya uchambuzi wa makosa ya kisarufi katika magazeti',
          references: 'TET Kiswahili Kidato cha 3 CBC 2023'
        },
        old: {
          mainTopic: 'Matumizi ya Lugha',
          subTopic: 'Lugha ya Vyombo vya Habari na Makosa ya Kisarufi',
          specificObjectives: 'Kutaja sifa za lugha ya magazeti na kurekebisha makosa 5 ya kisarufi kutoka magazetini',
          teachingActivities: 'Kuandika sentensi zenye makosa ubaoni, kuongoza wanafunzi kurekebisha makosa ubaoni',
          materials: 'Ubao, magazeti ya Kiswahili',
          assessment: 'Zoezi la kurekebisha makosa ya kisarufi katika sentensi 10',
          references: 'TET Kiswahili Kidato cha 3'
        }
      },
      {
        week: 11,
        dates: 'Wiki ya 11 (23 Mar - 27 Mar)',
        cbc: {
          mainCompetence: 'ONYESHO LA FASIHI NA TATHMINI YA KISWAHILI',
          specificCompetence: 'Kuonyesha umahiri wa fasihi simulizi na kughani mashairi ya Kiswahili',
          learningActivities: 'Wanafunzi wanafanya festivali fupi ya sanaa ya Kiswahili (Kughani mashairi, ngonjera, hotuba na igizo)',
          teachingActivities: 'Kuratibu Tamasha la Lugha na Fasihi ya Kiswahili shuleni, kutathmini kazi za wanafunzi',
          materials: 'Jukwaa la sanaa, mavazi ya utamaduni, vyeti vya ushiriki',
          assessment: 'Rubriki ya Tamasha la Lugha na Fasihi ya Kiswahili',
          references: 'Mwongozo wa Mtaala Mpya wa CBC 2023'
        },
        old: {
          mainTopic: 'MARUDIO YA JUMLA NA MAZOEZI YA NECTA',
          subTopic: 'Mazoezi ya Karatasi ya 1 na Karatasi ya 2 ya Kiswahili',
          specificObjectives: 'Kufanya marudio ya sarufi, ufahamu, uandishi na fasihi kulingana na muundo wa NECTA',
          teachingActivities: 'Kutatua maswali ya mitihani ya kitaifa ya nyuma ubaoni kwa kushirikisha wanafunzi',
          materials: 'Ubao, mitihani ya NECTA 2018-2023',
          assessment: 'Jaribio la kupima muda wa kujibu maswali ya NECTA',
          references: 'Mfululizo wa Mitihani ya NECTA ya Kiswahili'
        }
      },
      {
        week: 12,
        dates: 'Wiki ya 12 (30 Mar - 03 Apr)',
        cbc: {
          mainCompetence: 'TATHMINI YA MWISHO WA MUHULA NA TATHMINI NA TATHMINI NA NIFU',
          specificCompetence: 'Mtihani wa mwisho wa muhula wa Kiswahili',
          learningActivities: 'Fanya mtihani wa mwisho wa muhula; kujaza daftari la mabadiliko na malengo ya Muhula wa 2',
          teachingActivities: 'Kusimamia mtihani, kusahihisha na kuingiza alama katika daftari la matokeo ya shule',
          materials: 'Karatasi za mitihani, daftari la matokeo',
          assessment: 'Mtihani wa Mwisho wa Muhula (Muundo wa NECTA)',
          references: 'Miongozo ya Wizara ya Elimu na NECTA'
        },
        old: {
          mainTopic: 'MTIHANI WA MWISHO WA MUHULA NA FUNGA SHULE',
          subTopic: 'Usimamizi wa Mtihani na Ujazaji wa Ripoti',
          specificObjectives: 'Kutathmini uelewa wa jumla wa muhula wa kwanza katika somo la Kiswahili',
          teachingActivities: 'Kusimamia mtihani, kusahihisha na kujaza ripoti za maendeleo za wanafunzi',
          materials: 'Karatasi za mitihani, kadi za ripoti',
          assessment: 'Mtihani Rasmi wa Mwisho wa Muhula (Alama 100)',
          references: 'Kanuni za Mitihani ya Shule'
        }
      }
    ]
  }
};

/**
 * Dynamic subject generator that guarantees 100% subject-relevant schemes
 * for ANY subject (Chemistry, Biology, Geography, History, Kiswahili, English, Civics,
 * Commerce, Bookkeeping, ICT, Agriculture, Primary subjects, etc.) without falling back to Physics!
 */
export const getSubjectSchemeTemplate = (
  subject: string,
  className: string,
  term: string,
  curriculumType: CurriculumType
): SubjectSchemeTemplate => {
  const normSubject = (subject || 'General Studies').trim();

  // 1. Direct or alias match from knowledge base
  if (TANZANIA_SCHEMES_KNOWLEDGE_BASE[normSubject]) {
    return TANZANIA_SCHEMES_KNOWLEDGE_BASE[normSubject];
  }

  const normLower = normSubject.toLowerCase();

  if (normLower.includes('physic')) return TANZANIA_SCHEMES_KNOWLEDGE_BASE['Physics'];
  if (normLower.includes('chem') || normLower.includes('kemia')) return TANZANIA_SCHEMES_KNOWLEDGE_BASE['Chemistry'];
  if (normLower.includes('bio') || normLower.includes('biolojia')) return TANZANIA_SCHEMES_KNOWLEDGE_BASE['Biology'];
  if (normLower.includes('kiswahili') || normLower.includes('swahili')) return TANZANIA_SCHEMES_KNOWLEDGE_BASE['Kiswahili'];

  // 2. Build customized 12-week progression dynamically for ANY other subject!
  const isPrimary = className.toLowerCase().includes('std') || className.toLowerCase().includes('primary') || className.toLowerCase().includes('darasa');
  const isCbc = curriculumType === 'NEW_CBC_2023';

  // Dynamic modules per subject type
  let department = 'General Studies';
  let defaultPeriods = 4;
  let topicProgression: { topic: string; subtopic: string; cbcCompetence: string; oldObj: string; materials: string; ref: string }[] = [];

  if (normLower.includes('math') || normLower.includes('hisabati') || normLower.includes('hesabu')) {
    department = 'Mathematics';
    defaultPeriods = 6;
    topicProgression = [
      { topic: 'Algebra & Equations', subtopic: 'Linear & Quadratic Equations', cbcCompetence: 'Applying algebraic models to solve financial and structural engineering problems', oldObj: 'Solve linear and quadratic equations accurately', materials: 'Graph paper, geometric models, algebra tiles, calculators', ref: `TIE ${normSubject} for ${className} (2023)` },
      { topic: 'Trigonometry & Geometry', subtopic: 'Trigonometric Ratios & Elevation', cbcCompetence: 'Applying right-angled trigonometry and bearings in land surveying and architecture', oldObj: 'Calculate heights and distances using sine, cosine, tangent', materials: 'Protractors, clinometers, measuring tapes, 4-figure tables', ref: `TIE ${normSubject} for ${className}` },
      { topic: 'Statistics & Data Handling', subtopic: 'Grouped Data & Measures of Central Tendency', cbcCompetence: 'Interpreting statistical frequency distributions for demographic and economic decisions', oldObj: 'Calculate mean, median, mode and construct histograms', materials: 'Graph books, demographic charts, calculators', ref: `TIE ${normSubject} for ${className}` },
      { topic: 'Transformations & Vectors', subtopic: 'Coordinate Transformations & Scale Factors', cbcCompetence: 'Applying geometric reflection, rotation and enlargement in graphic design', oldObj: 'Find images under reflection, translation and enlargement', materials: 'Grid paper, tracing paper, geometry sets', ref: `TIE ${normSubject} for ${className}` }
    ];
  } else if (normLower.includes('geog') || normLower.includes('jiografia') || normLower.includes('maarifa ya jamii')) {
    department = 'Social Sciences';
    defaultPeriods = 4;
    topicProgression = [
      { topic: 'Map Reading & Cartography', subtopic: 'Topographic Maps & Grid References', cbcCompetence: 'Interpreting topographic contours, gradient, and landforms for spatial planning', oldObj: 'Read 6-figure grid references and calculate ground distances from scale', materials: 'NECTA topographic map sheets, magnifying glasses, dividers, compasses', ref: `TIE ${normSubject} for ${className} (2023)` },
      { topic: 'Climate & Weather Systems', subtopic: 'Meteorological Data & Climate Change Mitigation', cbcCompetence: 'Analyzing weather station instruments, rainfall graphs, and climate adaptation in East Africa', oldObj: 'State functions of minimum-maximum thermometer, hygrometer, rain gauge', materials: 'Weather station instruments, thermographs, climate charts', ref: `TIE ${normSubject} for ${className}` },
      { topic: 'Agriculture & Forestry', subtopic: 'Sustainable Farming Systems in Tanzania', cbcCompetence: 'Evaluating cash crop farming, soil conservation, and agro-forestry initiatives', oldObj: 'Describe small-scale and large-scale farming with Tanzanian case studies', materials: 'Soil testing kits, crop maps of Tanzania, agricultural posters', ref: `TIE ${normSubject} for ${className}` },
      { topic: 'Mining & Environmental Management', subtopic: 'Mineral Extraction & Environmental Impact', cbcCompetence: 'Analyzing economic benefits of tanzanite/gold mining against ecological degradation', oldObj: 'Identify major mining regions in Tanzania and environmental hazards', materials: 'Mineral rock samples, environmental impact assessment reports', ref: `TIE ${normSubject} for ${className}` }
    ];
  } else if (normLower.includes('hist') || normLower.includes('uraia') || normLower.includes('civic') || normLower.includes('general studies')) {
    department = 'Social Sciences';
    defaultPeriods = 3;
    topicProgression = [
      { topic: 'Sources of History & Heritage', subtopic: 'Archaeology, Oral Traditions & Museums', cbcCompetence: 'Evaluating historical evidence, radiocarbon dating, and Olduvai Gorge heritage preservation', oldObj: 'Explain advantages and limitations of oral tradition and archaeological excavations', materials: 'Artifact replicas, historical timelines, museum posters, primary documents', ref: `TIE ${normSubject} for ${className} (2023)` },
      { topic: 'Colonialism & Pan-Africanism', subtopic: 'Scramble for Africa & Liberation Struggles', cbcCompetence: 'Analyzing the Berlin Conference, colonial administrative systems, and TANU independence drive', oldObj: 'State causes of partition of Africa and direct vs indirect rule systems', materials: 'Historical maps of colonial Africa, archival independence speeches', ref: `TIE ${normSubject} for ${className}` },
      { topic: 'Governance & Human Rights', subtopic: 'Tanzanian Constitution, Democracy & Civic Responsibility', cbcCompetence: 'Promoting constitutionalism, rule of law, anti-corruption, and active youth citizenship', oldObj: 'Explain the 3 pillars of Tanzanian government and fundamental human rights', materials: 'Tanzanian Constitution booklets, Human Rights charters, anti-corruption posters', ref: `TIE ${normSubject} for ${className}` },
      { topic: 'International Relations', subtopic: 'EAC, SADC, African Union & Global Cooperation', cbcCompetence: 'Evaluating East African Community integration and Tanzanian foreign policy principles', oldObj: 'List member states of EAC and SADC and their economic objectives', materials: 'EAC flags, regional economic trade maps, diplomacy charters', ref: `TIE ${normSubject} for ${className}` }
    ];
  } else if (normLower.includes('engl') || normLower.includes('lit')) {
    department = 'Languages & Literature';
    defaultPeriods = 4;
    topicProgression = [
      { topic: 'Grammar & Functional Syntax', subtopic: 'Tenses, Relative Clauses & Active/Passive Voice', cbcCompetence: 'Constructing error-free complex sentences and formal discourse for academic communication', oldObj: 'Convert direct speech to indirect speech and active voice to passive voice', materials: 'Grammar charts, oxford English dictionaries, work cards', ref: `TIE English Language for ${className} (2023)` },
      { topic: 'Reading Comprehension & Vocabulary', subtopic: 'Contextual Analysis & Inferential Skills', cbcCompetence: 'Extracting implicit meaning, analyzing authorial tone, and summarizing complex texts', oldObj: 'Answer literal and inferential comprehension questions accurately', materials: 'Graded reading passages, newspaper editorials, vocabulary cards', ref: `TIE English Language for ${className}` },
      { topic: 'Literature in English', subtopic: 'Poetry, Novels & Plays Analysis', cbcCompetence: 'Critiquing literary themes, character development, imagery, and socio-cultural messages', oldObj: 'Identify figures of speech (simile, metaphor, personification) in poems', materials: 'Selected set books (Unanswered Cries / Passed Like a Shadow / The Lion and the Jewel)', ref: `TIE Approved Literature Set Books` },
      { topic: 'Formal Writing & Communication', subtopic: 'Official Letters, CVs & Argumentative Essays', cbcCompetence: 'Writing persuasive speeches, formal employment cover letters, and analytical essays', oldObj: 'Write a 250-word formal letter using standard layout and polite language', materials: 'Sample CVs, formal letter templates, debate rubrics', ref: `TIE English Language for ${className}` }
    ];
  } else if (normLower.includes('comm') || normLower.includes('book') || normLower.includes('biashara') || normLower.includes('uhasibu') || normLower.includes('econ')) {
    department = 'Commercial Studies';
    defaultPeriods = 4;
    topicProgression = [
      { topic: 'Introduction to Business & Trade', subtopic: 'Home Trade, Wholesaling & Retailing', cbcCompetence: 'Analyzing commerce supply chains, e-commerce platforms, and Tanzanian trade channels', oldObj: 'Differentiate home trade and foreign trade and list functions of wholesalers', materials: 'Sample trade documents (invoices, receipts, delivery notes), trade flowcharts', ref: `TIE ${normSubject} for ${className} (2023)` },
      { topic: 'Banking & Financial Services', subtopic: 'Commercial Banking, NMB/CRDB & Mobile Money (M-Pesa)', cbcCompetence: 'Utilizing modern banking, interest calculations, and mobile payment gateways in small enterprise', oldObj: 'List services offered by commercial banks and Central Bank (BOT)', materials: 'Sample bank deposit slips, cheque books, BOT financial reports', ref: `TIE ${normSubject} for ${className}` },
      { topic: 'Accounting & Double Entry System', subtopic: 'Ledger Posting, Trial Balance & Cash Book', cbcCompetence: 'Maintaining double-entry ledgers, preparing triple-column cash books, and trial balance reconciliation', oldObj: 'Apply debit and credit rules to record transactions and extract a trial balance', materials: 'Ledger paper, cash book templates, calculators, transaction vouchers', ref: `TIE ${normSubject} for ${className}` },
      { topic: 'Financial Statements & Profitability', subtopic: 'Trading, Profit & Loss Account and Balance Sheet', cbcCompetence: 'Constructing final financial statements to evaluate business solvency, gross profit, and net profit', oldObj: 'Calculate cost of goods sold, gross profit and net profit from trial balance', materials: 'Balance sheet templates, annual company financial reports', ref: `TIE ${normSubject} for ${className}` }
    ];
  } else if (normLower.includes('comp') || normLower.includes('ict') || normLower.includes('tehama') || normLower.includes('sayansi na teknolojia')) {
    department = 'Information Technology';
    defaultPeriods = 3;
    topicProgression = [
      { topic: 'Computer Systems & Architecture', subtopic: 'Hardware, Memory & Operating Systems', cbcCompetence: 'Diagnosing CPU components, RAM/ROM storage, peripheral devices, and OS configuration', oldObj: 'List input, output and storage devices and explain system software', materials: 'Disassembled desktop computer, motherboard, RAM sticks, OS installation media', ref: `TIE ${normSubject} for ${className} (2023)` },
      { topic: 'Word Processing & Spreadsheets', subtopic: 'Document Formatting & Data Formulas in Excel', cbcCompetence: 'Designing professional school reports and executing mathematical formulas (=SUM, =AVERAGE, =IF) in spreadsheets', oldObj: 'Create, format and print a word document and spreadsheet table', materials: 'Computer lab computers, office software suites, project briefs', ref: `TIE ${normSubject} for ${className}` },
      { topic: 'Networking & Internet Safety', subtopic: 'LAN/WAN, Web Browsing & Cybersecurity', cbcCompetence: 'Configuring network sharing, practicing safe internet browsing, and protecting data from malware', oldObj: 'Define internet, search engines, email and state 3 computer security threats', materials: 'Network switches, Ethernet cables, internet connectivity, antivirus software', ref: `TIE ${normSubject} for ${className}` },
      { topic: 'Database & Basics of Coding', subtopic: 'Relational Tables & Introductory Programming', cbcCompetence: 'Designing database tables with primary keys and constructing simple algorithms/flowcharts', oldObj: 'Define database terms (field, record, query) and draw flowchart symbols', materials: 'Database software, flowchart stencils, pseudo-code exercises', ref: `TIE ${normSubject} for ${className}` }
    ];
  } else {
    // Universal fallback for any custom or specialized subject (e.g., Agricultural Science, Food & Nutrition, Bible Knowledge, EDK, French, Music, etc.)
    department = 'Specialized Subjects';
    defaultPeriods = 4;
    topicProgression = [
      { topic: `Foundations of ${normSubject}`, subtopic: `Core Principles & Key Terminology in ${normSubject}`, cbcCompetence: `Applying foundational principles of ${normSubject} to solve practical challenges in school and community settings`, oldObj: `Define core terminology and explain fundamental concepts in ${normSubject}`, materials: `Reference books, charts, work cards, demonstration media for ${normSubject}`, ref: `TIE Approved Textbook for ${normSubject}` },
      { topic: `Practical Applications of ${normSubject}`, subtopic: `Methodology & Hands-on Techniques in ${normSubject}`, cbcCompetence: `Executing practical investigations and empirical methods related to ${normSubject}`, oldObj: `Demonstrate standard procedures and techniques in ${normSubject} correctly`, materials: `Practical equipment, task sheets, field materials for ${normSubject}`, ref: `TIE ${normSubject} Guide` },
      { topic: `Advanced Analysis in ${normSubject}`, subtopic: `Problem Solving & Critical Inquiry in ${normSubject}`, cbcCompetence: `Analyzing complex case studies and applying critical thinking in ${normSubject}`, oldObj: `Analyze problems and evaluate outcomes in ${normSubject}`, materials: `Case study worksheets, analytical charts, student portfolios`, ref: `TIE ${normSubject} Module` },
      { topic: `Synthesis & Project Execution in ${normSubject}`, subtopic: `Community Connection & Synthesis Project`, cbcCompetence: `Synthesizing learning in ${normSubject} to construct community-focused solutions`, oldObj: `Synthesize core topics and complete assigned project tasks in ${normSubject}`, materials: `Project display materials, evaluation rubrics`, ref: `TIE ${normSubject} Assessment Manual` }
    ];
  }

  // Generate 12 full weeks using topicProgression repeated/expanded across 12 weeks
  const weeks = Array.from({ length: 12 }, (_, i) => {
    const weekNum = i + 1;
    const module = topicProgression[i % topicProgression.length];

    // Special weeks: Midterm (Week 8) and Terminal (Week 12)
    if (weekNum === 8) {
      return {
        week: 8,
        dates: `Week 8 (Midterm Assessment)`,
        cbc: {
          mainCompetence: `MIDTERM COMPETENCE ASSESSMENT IN ${normSubject.toUpperCase()}`,
          specificCompetence: `Synthesizing Weeks 1-7 competences in ${normSubject}`,
          learningActivities: `Undertake standardized midterm assessment task and reflect on personal portfolio milestone`,
          teachingActivities: `Administer standardized rubric-based assessment; evaluate learner performance and offer constructive feedback`,
          materials: `Exam question papers, rubrics, portfolio evaluation sheets`,
          assessment: `Midterm Examination (Theory 60% + Practical/Task 40%)`,
          references: `NECTA Assessment Guidelines for ${normSubject}`
        },
        old: {
          mainTopic: `MIDTERM EVALUATION & REVISION`,
          subTopic: `Review of Topics 1-3 in ${normSubject}`,
          specificObjectives: `Evaluate student retention and problem-solving skills across initial syllabus topics`,
          teachingActivities: `Administer midterm written test; mark scripts and conduct chalkboard review`,
          materials: `Printed examination papers, answer booklets`,
          assessment: `Formal Midterm Examination marked out of 100%`,
          references: `School Past Examination Papers`
        }
      };
    }

    if (weekNum === 12) {
      return {
        week: 12,
        dates: `Week 12 (Terminal Evaluation)`,
        cbc: {
          mainCompetence: `TERMINAL EVALUATION & CLOSING REFLECTION IN ${normSubject.toUpperCase()}`,
          specificCompetence: `Summative evaluation of Term 1 competences in ${normSubject}`,
          learningActivities: `Sit terminal examination; conduct self-assessment checklist and set Term 2 learning goals`,
          teachingActivities: `Supervise terminal examination; evaluate and enter student scores into academic ledger`,
          materials: `Official examination papers, answer booklets, academic ledger`,
          assessment: `Terminal Examination (NECTA Standard Format)`,
          references: `Ministry of Education & NECTA Terminal Standards`
        },
        old: {
          mainTopic: `TERMINAL EXAMINATION & CLOSURE`,
          subTopic: `End of Term Assessment and Ledger Entry`,
          specificObjectives: `Summative evaluation of student mastery of Term 1 ${normSubject} syllabus`,
          teachingActivities: `Invigilate terminal exam, mark scripts according to marking scheme, compile results`,
          materials: `Examination papers, answer sheets, report cards`,
          assessment: `Formal Terminal Examination marked out of 100%`,
          references: `School Academic Examination Regulations`
        }
      };
    }

    const dayStart = 12 + ((i % 4) * 7);
    const month = i < 4 ? 'Jan' : i < 8 ? 'Feb' : 'Mar';
    const datesStr = `Week ${weekNum} (${String(dayStart).padStart(2, '0')} ${month} - ${String(dayStart + 4).padStart(2, '0')} ${month})`;

    return {
      week: weekNum,
      dates: datesStr,
      cbc: {
        mainCompetence: module.cbcCompetence,
        specificCompetence: `Analyzing ${module.subtopic} through inquiry and collaborative task cards`,
        learningActivities: `Learners work in collaborative groups to investigate ${module.subtopic} and present findings on work cards`,
        teachingActivities: `Facilitate group inquiry stations, guide safe material handling, and moderate class presentations`,
        materials: module.materials,
        assessment: `Practical task rubric, peer presentation evaluation, workbook review`,
        references: module.ref
      },
      old: {
        mainTopic: module.topic,
        subTopic: module.subtopic,
        specificObjectives: `By the end of the week, the student should be able to: ${module.oldObj}`,
        teachingActivities: `Explain concepts of ${module.subtopic} on chalkboard with 3 worked examples and guide student notes`,
        materials: `Chalkboard, chalk, standard textbook for ${normSubject}`,
        assessment: `Chalkboard drill exercises, notebook review, marked homework assignment`,
        references: module.ref
      }
    };
  });

  return {
    subject: normSubject,
    department,
    defaultPeriodsPerWeek: defaultPeriods,
    weeks
  };
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
  // Never default blindly to Physics! Use smart subject template matcher.
  const template = getSubjectSchemeTemplate(subject, className, term, curriculumType);

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
    remedialOrUncoveredReason: idx % 4 === 0 ? `Brief recap provided for students needing extra practice on ${subject}.` : undefined,
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
      ? `Focuses on 21st-century competence development in ${subject}, practical hands-on investigations, critical thinking, and socio-economic problem solving aligned with NECTA 2023/2024 standards.`
      : `Focuses on structured syllabus mastery in ${subject}, definition clarity, systematic formula/concept derivation, and chalkboard exercise verification.`,
    items,
    logBookEntries,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
};
