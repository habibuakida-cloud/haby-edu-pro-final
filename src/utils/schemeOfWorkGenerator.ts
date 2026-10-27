import { SchemeOfWork, SchemeOfWorkItem, TeachingLogBookEntry } from '../types/schemeOfWork';
import { CurriculumType } from '../types/lessonPlan';
import { AcademicTermDates } from '../types';

export interface SubjectSchemeWeek {
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
}

export interface SubjectSchemeTemplate {
  subject: string;
  department: string;
  defaultPeriodsPerWeek: number;
  weeks: SubjectSchemeWeek[];
}

// Helper to normalize class level into canonical form
export function resolveClassKey(className: string): 'form_1' | 'form_2' | 'form_3' | 'form_4' | 'primary' {
  const c = String(className || '').toLowerCase();
  if (c.includes('form 1') || c.includes('kidato 1') || c.includes('form i') || c.includes('form one')) return 'form_1';
  if (c.includes('form 2') || c.includes('kidato 2') || c.includes('form ii') || c.includes('form two')) return 'form_2';
  if (c.includes('form 3') || c.includes('kidato 3') || c.includes('form iii') || c.includes('form three')) return 'form_3';
  if (c.includes('form 4') || c.includes('kidato 4') || c.includes('form iv') || c.includes('form four')) return 'form_4';
  if (c.includes('std') || c.includes('standard') || c.includes('darasa') || c.includes('primary')) return 'primary';
  return 'form_3';
}

export function resolveTermKey(term: string): 'term_1' | 'term_2' {
  const t = String(term || '').toLowerCase();
  if (t.includes('2') || t.includes('two') || t.includes('pili')) return 'term_2';
  return 'term_1';
}

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatShortDate(d: Date): string {
  const day = String(d.getDate()).padStart(2, '0');
  const mon = MONTHS_SHORT[d.getMonth()] || 'Jan';
  return `${day} ${mon}`;
}

function addDays(base: Date, days: number): Date {
  const copy = new Date(base.getTime());
  copy.setDate(copy.getDate() + days);
  return copy;
}

// Format realistic date range for 12 weeks of school terms in Tanzania using configured AcademicTermDates (Mihula)
export function getTanzanianTermDates(
  weekNum: number,
  termKey: 'term_1' | 'term_2',
  language: 'Kiswahili' | 'English',
  academicTermDates?: AcademicTermDates
): string {
  const isSwahili = language === 'Kiswahili';

  if (academicTermDates) {
    if (termKey === 'term_1' && academicTermDates.yearOpeningDate) {
      const termStart = new Date(academicTermDates.yearOpeningDate);
      const midBreakStart = academicTermDates.midTerm1BreakStart ? new Date(academicTermDates.midTerm1BreakStart) : null;
      const midBreakEnd = academicTermDates.midTerm1BreakEnd ? new Date(academicTermDates.midTerm1BreakEnd) : null;
      const termEnd = academicTermDates.terminalBreakStart ? new Date(academicTermDates.terminalBreakStart) : null;

      if (!isNaN(termStart.getTime())) {
        let weekStart = addDays(termStart, (weekNum - 1) * 7);
        // After week 8 (Midterm), shift subsequent weeks past the midterm break if configured
        if (weekNum > 8 && midBreakStart && midBreakEnd && !isNaN(midBreakStart.getTime()) && !isNaN(midBreakEnd.getTime())) {
          const breakDays = Math.max(0, Math.round((midBreakEnd.getTime() - midBreakStart.getTime()) / (1000 * 60 * 60 * 24)));
          weekStart = addDays(weekStart, breakDays);
        }
        let weekEnd = addDays(weekStart, 4);
        if (weekNum === 12 && termEnd && !isNaN(termEnd.getTime()) && termEnd > weekStart) {
          weekEnd = termEnd;
        }
        const tag = weekNum === 8
          ? (isSwahili ? ' - Mtihani wa Nusu Muhula I' : ' - Midterm I')
          : weekNum === 12
          ? (isSwahili ? ' - Mtihani wa Muhula I' : ' - Terminal Exam')
          : '';
        const rangeStr = `${formatShortDate(weekStart)} - ${formatShortDate(weekEnd)}${tag}`;
        return isSwahili ? `Muhula I • Wiki ya ${weekNum} (${rangeStr})` : `Term 1 • Week ${weekNum} (${rangeStr})`;
      }
    }

    if (termKey === 'term_2' && academicTermDates.terminalBreakEnd) {
      // Term 2 starts right after terminalBreakEnd
      const term2Open = addDays(new Date(academicTermDates.terminalBreakEnd), 1);
      const mid2Start = academicTermDates.midTerm2BreakStart ? new Date(academicTermDates.midTerm2BreakStart) : null;
      const mid2End = academicTermDates.midTerm2BreakEnd ? new Date(academicTermDates.midTerm2BreakEnd) : null;
      const annualStart = academicTermDates.annualBreakStart ? new Date(academicTermDates.annualBreakStart) : null;

      if (!isNaN(term2Open.getTime())) {
        let weekStart = addDays(term2Open, (weekNum - 1) * 7);
        if (weekNum > 8 && mid2Start && mid2End && !isNaN(mid2Start.getTime()) && !isNaN(mid2End.getTime())) {
          const breakDays = Math.max(0, Math.round((mid2End.getTime() - mid2Start.getTime()) / (1000 * 60 * 60 * 24)));
          weekStart = addDays(weekStart, breakDays);
        }
        let weekEnd = addDays(weekStart, 4);
        if (weekNum === 12 && annualStart && !isNaN(annualStart.getTime()) && annualStart > weekStart) {
          weekEnd = annualStart;
        }
        const tag = weekNum === 8
          ? (isSwahili ? ' - Mtihani wa Nusu Muhula II' : ' - Midterm II')
          : weekNum === 12
          ? (isSwahili ? ' - Mtihani wa Mwaka' : ' - Annual Exam')
          : '';
        const rangeStr = `${formatShortDate(weekStart)} - ${formatShortDate(weekEnd)}${tag}`;
        return isSwahili ? `Muhula II • Wiki ya ${weekNum} (${rangeStr})` : `Term 2 • Week ${weekNum} (${rangeStr})`;
      }
    }
  }

  if (termKey === 'term_1') {
    // Term 1: Jan to April (12 Weeks)
    const dates = [
      { start: '12 Jan', end: '16 Jan', sw: '12 Jan - 16 Jan' },
      { start: '19 Jan', end: '23 Jan', sw: '19 Jan - 23 Jan' },
      { start: '26 Jan', end: '30 Jan', sw: '26 Jan - 30 Jan' },
      { start: '02 Feb', end: '06 Feb', sw: '02 Feb - 06 Feb' },
      { start: '09 Feb', end: '13 Feb', sw: '09 Feb - 13 Feb' },
      { start: '16 Feb', end: '20 Feb', sw: '16 Feb - 20 Feb' },
      { start: '23 Feb', end: '27 Feb', sw: '23 Feb - 27 Feb' },
      { start: '02 Mar', end: '06 Mar', sw: '02 Mar - 06 Mar (Midterm)' },
      { start: '09 Mar', end: '13 Mar', sw: '09 Mar - 13 Mar' },
      { start: '16 Mar', end: '20 Mar', sw: '16 Mar - 20 Mar' },
      { start: '23 Mar', end: '27 Mar', sw: '23 Mar - 27 Mar' },
      { start: '30 Mar', end: '03 Apr', sw: '30 Mar - 03 Apr (Terminal)' },
    ];
    const d = dates[weekNum - 1] || { start: `Week ${weekNum}`, end: '', sw: `Wiki ya ${weekNum}` };
    return isSwahili ? `Wiki ya ${weekNum} (${d.sw})` : `Week ${weekNum} (${d.start} - ${d.end})`;
  } else {
    // Term 2: July to October (12 Weeks)
    const dates = [
      { start: '06 Jul', end: '10 Jul', sw: '06 Jul - 10 Jul' },
      { start: '13 Jul', end: '17 Jul', sw: '13 Jul - 17 Jul' },
      { start: '20 Jul', end: '24 Jul', sw: '20 Jul - 24 Jul' },
      { start: '27 Jul', end: '31 Jul', sw: '27 Jul - 31 Jul' },
      { start: '03 Aug', end: '07 Aug', sw: '03 Aug - 07 Aug' },
      { start: '10 Aug', end: '14 Aug', sw: '10 Aug - 14 Aug' },
      { start: '17 Aug', end: '21 Aug', sw: '17 Aug - 21 Aug' },
      { start: '24 Aug', end: '28 Aug', sw: '24 Aug - 28 Aug (Midterm)' },
      { start: '31 Aug', end: '04 Sep', sw: '31 Aug - 04 Sep' },
      { start: '07 Sep', end: '11 Sep', sw: '07 Sep - 11 Sep' },
      { start: '14 Sep', end: '18 Sep', sw: '14 Sep - 18 Sep' },
      { start: '21 Sep', end: '25 Sep', sw: '21 Sep - 25 Sep (Annual)' },
    ];
    const d = dates[weekNum - 1] || { start: `Week ${weekNum}`, end: '', sw: `Wiki ya ${weekNum}` };
    return isSwahili ? `Wiki ya ${weekNum} (${d.sw})` : `Week ${weekNum} (${d.start} - ${d.end})`;
  }
}

// -------------------------------------------------------------------------------------------------
// COMPREHENSIVE TANZANIAN TIE CURRICULUM SYLLABUS TOPIC PROGRESSIONS
// -------------------------------------------------------------------------------------------------

interface SyllabusTopicEntry {
  mainTopic: string;
  subTopic: string;
  cbcMainCompetence: string;
  cbcSpecificCompetence: string;
  learningActivities: string;
  teachingActivities: string;
  materials: string;
  assessment: string;
  references: string;
}

// Raw mapping of authentic TIE syllabi for Tanzanian Primary and Secondary classes
const TIE_SYLLABUS_REGISTRY: Record<string, Record<string, SyllabusTopicEntry[]>> = {
  'mathematics': {
    'form_1_term_1': [
      {
        mainTopic: 'Numbers',
        subTopic: 'Natural Numbers, Place Values and Operations',
        cbcMainCompetence: 'Applying concepts of numbers and operations to solve real-life quantitative problems',
        cbcSpecificCompetence: 'Analyzing place values, performing operations on natural numbers, and solving word problems',
        learningActivities: 'Learners write numbers up to billions in words and numerals, calculate using abacus and place value charts',
        teachingActivities: 'Guide place value drill using number cards, demonstrate regrouping in addition and subtraction on board',
        materials: 'Abacus, number cards, place value chart, chalk, counters',
        assessment: 'Chalkboard drill, class exercise of 10 computational problems, peer verification',
        references: 'TIE Basic Mathematics for Secondary Schools Form 1 (CBC 2023), MoEST Guidelines'
      },
      {
        mainTopic: 'Numbers',
        subTopic: 'Divisibility Rules, Prime Numbers and Factors',
        cbcMainCompetence: 'Applying concepts of numbers and operations to solve real-life quantitative problems',
        cbcSpecificCompetence: 'Testing divisibility of numbers by 2, 3, 4, 5, 6, 9, 10, 11 and finding prime factors',
        learningActivities: 'Work in pairs to test divisibility rules on 4-digit numbers and draw factor trees',
        teachingActivities: 'Facilitate inquiry on patterns in digits, guide factor tree construction and index notation',
        materials: 'Multiplication tables, flash cards of integers, chart of prime numbers up to 100',
        assessment: 'Divisibility speed quiz, marked exercises on prime factorisation in index form',
        references: 'TIE Basic Mathematics Form 1, MoEST Guidelines'
      },
      {
        mainTopic: 'Numbers',
        subTopic: 'Greatest Common Factor (GCF) and Lowest Common Multiple (LCM)',
        cbcMainCompetence: 'Applying concepts of numbers and operations to solve real-life quantitative problems',
        cbcSpecificCompetence: 'Computing GCF and LCM of sets of numbers and applying to practical scheduling and division problems',
        learningActivities: 'Solve real-life word problems involving synchronized traffic lights, bell schedules and packaging',
        teachingActivities: 'Demonstrate prime factorisation method and ladder method for GCF and LCM on board',
        materials: 'Chalkboard, worked example cards, real-life word problem scenario worksheets',
        assessment: 'Word problem rubric, homework of 5 practical LCM and GCF application questions',
        references: 'TIE Basic Mathematics Form 1'
      },
      {
        mainTopic: 'Fractions',
        subTopic: 'Types of Fractions, Equivalence and Basic Operations',
        cbcMainCompetence: 'Using rational numbers and proportional reasoning in resource distribution and trade',
        cbcSpecificCompetence: 'Performing addition, subtraction, multiplication and division of proper, improper and mixed fractions',
        learningActivities: 'Fold paper strips and cut circular cardboards into fractional sectors to model fraction operations',
        teachingActivities: 'Guide finding common denominators using LCM, demonstrate reciprocals in fraction division',
        materials: 'Paper strips, fraction discs, scissors, colored markers, chart of equivalent fractions',
        assessment: 'Fraction modeling rubric, computational speed test on mixed fractions',
        references: 'TIE Basic Mathematics Form 1 CBC 2023'
      },
      {
        mainTopic: 'Decimals and Percentages',
        subTopic: 'Terminating and Recurring Decimals, Percentage Conversions',
        cbcMainCompetence: 'Using rational numbers and proportional reasoning in resource distribution and trade',
        cbcSpecificCompetence: 'Converting between fractions, decimals and percentages and calculating percentage profit, discount and tax',
        learningActivities: 'Calculate VAT (18%) and trade discounts on simulated Tanzanian supermarket shopping receipts',
        teachingActivities: 'Provide genuine TRA EFD receipts, guide percentage increase and decrease formula derivations',
        materials: 'Sample EFD receipts, supermarket price lists, calculators, conversion charts',
        assessment: 'Financial transaction worksheet, homework on calculating commercial percentage markups',
        references: 'TIE Basic Mathematics Form 1, TRA Tax Education Series'
      },
      {
        mainTopic: 'Units of Measurement',
        subTopic: 'SI Units of Length, Mass, Time and Capacity',
        cbcMainCompetence: 'Applying measurement tools and dimensional conversions in construction and trade',
        cbcSpecificCompetence: 'Converting SI units and solving composite unit problems involving metric and imperial measures',
        learningActivities: 'Measure classroom dimensions using tape measures, weigh objects on beam balance, convert mm to m',
        teachingActivities: 'Supervise practical measuring stations, guide conversion factor tables (km, m, cm, mm; kg, g, tonnes)',
        materials: 'Meter rules, measuring tapes, beam balances, stopwatches, 1-litre measuring cylinders',
        assessment: 'Practical measurement accuracy rubric, conversion exercises in student notebooks',
        references: 'TIE Basic Mathematics Form 1'
      },
      {
        mainTopic: 'Approximations',
        subTopic: 'Rounding Off, Significant Figures and Decimal Places',
        cbcMainCompetence: 'Applying estimation and scientific rounding to engineering and financial data',
        cbcSpecificCompetence: 'Rounding numbers to specified significant figures and estimating numerical results',
        learningActivities: 'Round national census population figures and national budget figures to 3 significant figures',
        teachingActivities: 'Explain rules of significant figures with leading/trailing zeros, demonstrate error in estimation',
        materials: 'National census data sheets, budget tables, chalkboard worksheets',
        assessment: '10-question speed quiz on significant figures and decimal places',
        references: 'TIE Basic Mathematics Form 1'
      },
      {
        mainTopic: 'MIDTERM EVALUATION & REVISION',
        subTopic: 'Comprehensive Midterm Review of Numbers, Fractions and Measurement',
        cbcMainCompetence: 'MIDTERM COMPETENCE ASSESSMENT IN BASIC MATHEMATICS',
        cbcSpecificCompetence: 'Synthesizing Weeks 1-7 mathematical competences and problem-solving speed',
        learningActivities: 'Sit standardized midterm examination covering Weeks 1 to 7 syllabus topics',
        teachingActivities: 'Administer standardized NECTA-format midterm test, mark scripts and conduct revision',
        materials: 'Printed examination question papers, answer booklets, marking schemes',
        assessment: 'Standardized Midterm Examination marked out of 100%',
        references: 'NECTA Basic Mathematics Assessment Guidelines'
      },
      {
        mainTopic: 'Geometry',
        subTopic: 'Points, Lines, Rays, Angles and Angle Properties',
        cbcMainCompetence: 'Applying spatial concepts and geometric reasoning in architectural and land surveying tasks',
        cbcSpecificCompetence: 'Constructing and measuring acute, obtuse, right, reflex, supplementary and complementary angles',
        learningActivities: 'Use mathematical sets (compass, protractor, ruler) to construct angles 60°, 90°, 45°, 30° without protractor',
        teachingActivities: 'Demonstrate compass angle bisection on chalkboard using large chalkboard drawing instruments',
        materials: 'Chalkboard compass and protractor set, student geometric mathematical sets, white paper',
        assessment: 'Geometric construction accuracy rubric (sharp pencil lines, exact angle arcs)',
        references: 'TIE Basic Mathematics Form 1 CBC 2023'
      },
      {
        mainTopic: 'Geometry',
        subTopic: 'Triangles, Quadrilaterals and Polygons Angle Sum',
        cbcMainCompetence: 'Applying spatial concepts and geometric reasoning in architectural and land surveying tasks',
        cbcSpecificCompetence: 'Investigating interior and exterior angle sums of triangles and regular polygons: (n - 2) * 180°',
        learningActivities: 'Tear paper triangle vertices to prove interior angles form 180° on straight line; tabulate polygon sums',
        teachingActivities: 'Guide mathematical induction formula for polygon interior and exterior angles (360°)',
        materials: 'Cut-out paper shapes, scissors, protractors, polygon classification charts',
        assessment: 'Polygon angle calculation exercises, proof evaluation rubric',
        references: 'TIE Basic Mathematics Form 1'
      },
      {
        mainTopic: 'Algebra',
        subTopic: 'Algebraic Expressions, Substitution and Like Terms',
        cbcMainCompetence: 'Formulating algebraic models to represent real-life quantities and relationships',
        cbcSpecificCompetence: 'Simplifying algebraic expressions, factorising common factors, and evaluating expressions',
        learningActivities: 'Use algebra tiles to represent x, x², and constants; translate word statements into algebraic terms',
        teachingActivities: 'Demonstrate grouping like terms and distributive law: a(b + c) = ab + ac on board',
        materials: 'Algebra tiles, flash cards with algebraic expressions, chalkboard',
        assessment: 'Classwork on simplifying algebraic expressions, homework assignment',
        references: 'TIE Basic Mathematics Form 1'
      },
      {
        mainTopic: 'TERMINAL EVALUATION & CLOSURE',
        subTopic: 'Summative Terminal Examination and Term 1 Academic Audit',
        cbcMainCompetence: 'TERMINAL COMPETENCE EVALUATION IN BASIC MATHEMATICS',
        cbcSpecificCompetence: 'Evaluating mastery of Form 1 Term 1 syllabus and setting goals for Term 2',
        learningActivities: 'Sit terminal examination, review script marks, reflect on academic strengths and weaknesses',
        teachingActivities: 'Invigilate terminal examination, mark papers, enter grades in academic ledger and report cards',
        materials: 'Official examination papers, answer sheets, academic ledger',
        assessment: 'Terminal Examination (NECTA Standard CSEE Format, 100 Marks)',
        references: 'Ministry of Education & NECTA Terminal Standards'
      }
    ],
    'form_1_term_2': [
      {
        mainTopic: 'Algebra',
        subTopic: 'Linear Equations in One Variable and Word Problems',
        cbcMainCompetence: 'Formulating algebraic models to solve practical challenges in resource distribution',
        cbcSpecificCompetence: 'Solving single-variable linear equations and translating real-world problems into equations',
        learningActivities: 'Formulate balance scales to represent equations: ax + b = c; solve age and perimeter word problems',
        teachingActivities: 'Demonstrate balance principle (operations on both sides) on chalkboard with 4 worked examples',
        materials: 'Balance scale model, flash cards, chalkboard, worksheets',
        assessment: 'Step-by-step equation solving rubric, classwork exercise of 6 word problems',
        references: 'TIE Basic Mathematics Form 1 Book (CBC 2023)'
      },
      {
        mainTopic: 'Coordinate Geometry',
        subTopic: 'The Cartesian Coordinate System, Points and Quadrants',
        cbcMainCompetence: 'Applying coordinate mapping and navigation techniques in geographic and digital layouts',
        cbcSpecificCompetence: 'Plotting ordered pairs (x, y) on Cartesian plane and identifying 4 quadrants and axes',
        learningActivities: 'Plot landmark locations on grid paper representing school map; play coordinate treasure hunt game',
        teachingActivities: 'Demonstrate x-axis (abscissa) and y-axis (ordinate) plotting on grid chalkboard',
        materials: 'Graph paper, colored pencils, grid chalkboard, school layout map',
        assessment: 'Grid plotting accuracy rubric, graph book checking',
        references: 'TIE Basic Mathematics Form 1'
      },
      {
        mainTopic: 'Coordinate Geometry',
        subTopic: 'Linear Graphs of Equations y = mx + c',
        cbcMainCompetence: 'Applying coordinate mapping and navigation techniques in geographic and digital layouts',
        cbcSpecificCompetence: 'Constructing table of values for linear functions and plotting straight-line graphs',
        learningActivities: 'Generate tables of values for y = 2x + 1 and y = -x + 3, plot points and join with straight lines',
        teachingActivities: 'Explain slope/gradient concept and y-intercept; guide scale selection on graph axes',
        materials: 'Graph exercise books, 30cm transparent rulers, sharp pencils',
        assessment: 'Graph rubric (clear title, appropriate scale, plotted points with crosses, straight lines)',
        references: 'TIE Basic Mathematics Form 1'
      },
      {
        mainTopic: 'Perimeters and Areas',
        subTopic: 'Perimeter of Triangles, Rectangles, Parallelograms and Circles',
        cbcMainCompetence: 'Applying geometric measurement in agriculture, fencing, and construction projects',
        cbcSpecificCompetence: 'Calculating perimeters of plane shapes and circumference of circle C = 2πr or πd',
        learningActivities: 'Measure circular tin circumferences with string and diameter with ruler to estimate value of π ≈ 3.14',
        teachingActivities: 'Guide derivation of perimeter formulas, explain relationship between diameter and circumference',
        materials: 'Circular tins, strings, rulers, cardboard shapes, calculators',
        assessment: 'Perimeter calculation exercises, experimental π discovery report',
        references: 'TIE Basic Mathematics Form 1 CBC 2023'
      },
      {
        mainTopic: 'Perimeters and Areas',
        subTopic: 'Area of Rectangles, Triangles, Trapeziums and Circles',
        cbcMainCompetence: 'Applying geometric measurement in agriculture, fencing, and construction projects',
        cbcSpecificCompetence: 'Computing surface areas of composite plane figures: Area = ½(a+b)h, Area = πr²',
        learningActivities: 'Calculate cost of tiling a classroom floor and roofing corrugated sheets in TZS',
        teachingActivities: 'Derive area of trapezium by cutting into triangles; demonstrate composite area decomposition',
        materials: 'Grid paper, cut-out cardboard trapeziums, classroom architectural blueprints',
        assessment: 'Authentic task rubric: Cost estimation of floor tiling and agricultural plot sizing',
        references: 'TIE Basic Mathematics Form 1'
      },
      {
        mainTopic: 'Volume and Surface Area',
        subTopic: 'Cuboids, Cubes and Triangular Prisms',
        cbcMainCompetence: 'Applying geometric measurement in agriculture, fencing, and construction projects',
        cbcSpecificCompetence: 'Calculating volume V = l * w * h and total surface area of right rectangular prisms',
        learningActivities: 'Build 3D rectangular prism nets from cardstock, calculate volume in cm³ and capacity in litres',
        teachingActivities: 'Demonstrate connection between 1000 cm³ and 1 litre of water using measuring jugs',
        materials: 'Cardboard net templates, scissors, tape, water measuring containers',
        assessment: '3D net construction rubric, volume computation worksheet',
        references: 'TIE Basic Mathematics Form 1'
      },
      {
        mainTopic: 'Ratio, Profit and Loss',
        subTopic: 'Simplifying Ratios, Dividing in Ratios and Commercial Profit/Loss',
        cbcMainCompetence: 'Applying financial mathematics to small business entrepreneurship in Tanzania',
        cbcSpecificCompetence: 'Calculating cost price, selling price, percentage profit and loss in agribusiness',
        learningActivities: 'Simulate crop harvest sales at Kariakoo market; calculate gross profit and transport expenditure',
        teachingActivities: 'Introduce commercial terminology (Cost Price, Selling Price, Overhead, Net Profit) on board',
        materials: 'Sample business ledger sheets, Kariakoo agricultural price indices',
        assessment: 'Commercial arithmetic class test, student business plan calculations',
        references: 'TIE Basic Mathematics Form 1'
      },
      {
        mainTopic: 'MIDTERM EVALUATION & REVISION',
        subTopic: 'Term 2 Midterm Examination and Remedial Intervention',
        cbcMainCompetence: 'MIDTERM COMPETENCE ASSESSMENT IN BASIC MATHEMATICS',
        cbcSpecificCompetence: 'Evaluating student mastery of linear equations, coordinates, area and ratios',
        learningActivities: 'Complete midterm examination paper, review results and formulate improvement plan',
        teachingActivities: 'Administer midterm test, analyze item difficulty, conduct targeted remedial teaching',
        materials: 'Midterm test papers, answer keys, performance analysis sheets',
        assessment: 'Midterm Examination marked out of 100%',
        references: 'NECTA Basic Mathematics Assessment Guidelines'
      },
      {
        mainTopic: 'Statistics',
        subTopic: 'Collection, Organization and Tabulation of Data',
        cbcMainCompetence: 'Interpreting demographic and scientific data for informed community decision making',
        cbcSpecificCompetence: 'Collecting raw data, constructing tally charts and frequency distribution tables',
        learningActivities: 'Collect class attendance and shoe size data; construct tally charts and frequency tables',
        teachingActivities: 'Demonstrate tally marking (groups of 5), explain frequency f and total sample size Σf',
        materials: 'Survey data sheets, ruler, graph books, chalkboard',
        assessment: 'Data tabulation rubric, homework on summarizing local rainfall data',
        references: 'TIE Basic Mathematics Form 1 CBC 2023'
      },
      {
        mainTopic: 'Statistics',
        subTopic: 'Pictograms, Bar Charts, Line Graphs and Pie Charts',
        cbcMainCompetence: 'Interpreting demographic and scientific data for informed community decision making',
        cbcSpecificCompetence: 'Constructing and interpreting bar charts, line graphs and computing pie chart angles: (f / N) * 360°',
        learningActivities: 'Draw bar charts of student favourite subjects; calculate sector angles and draw pie charts',
        teachingActivities: 'Demonstrate protractor sector measurement on circular diagrams on chalkboard',
        materials: 'Protractors, compasses, colored pencils, graph paper',
        assessment: 'Statistical chart drawing rubric (correct angles, titles, legends, axis scales)',
        references: 'TIE Basic Mathematics Form 1'
      },
      {
        mainTopic: 'ANNUAL REVISION & PAST PAPER DRILLS',
        subTopic: 'Comprehensive Form 1 NECTA Format Examination Review',
        cbcMainCompetence: 'CONSOLIDATION OF FORM 1 MATHEMATICAL COMPETENCES',
        cbcSpecificCompetence: 'Synthesizing all Form 1 syllabus topics for annual examination readiness',
        learningActivities: 'Solve timed past national Form 1 and Form 2 review questions in small groups',
        teachingActivities: 'Review common pitfalls in algebraic manipulation, geometrical proofs and word problems',
        materials: 'NECTA compilation question booklets, chalkboard, calculators',
        assessment: 'Timed mock drill: Section A (10 short questions) and Section B (4 structured questions)',
        references: 'NECTA Past Papers and Review Series'
      },
      {
        mainTopic: 'ANNUAL EXAMINATION & CLOSURE',
        subTopic: 'Summative Annual Examination and Promotion Mark Compilation',
        cbcMainCompetence: 'ANNUAL COMPETENCE EVALUATION IN BASIC MATHEMATICS',
        cbcSpecificCompetence: 'Summative assessment for promotion to Form 2',
        learningActivities: 'Sit annual examination paper; verify script marks; receive vacation assignment',
        teachingActivities: 'Invigilate annual examination; mark scripts according to standardized scheme; compile Form 1 ledger',
        materials: 'Official examination papers, answer booklets, academic ledger and report cards',
        assessment: 'Annual Examination (NECTA Standard Format, 100 Marks)',
        references: 'Ministry of Education & NECTA Promotion Regulations'
      }
    ],
    'form_2_term_1': [
      {
        mainTopic: 'Exponents and Radicals',
        subTopic: 'Laws of Exponents and Negative/Fractional Indices',
        cbcMainCompetence: 'Applying powers and roots in scientific notation and compound growth calculations',
        cbcSpecificCompetence: 'Applying laws of indices: aᵐ * aⁿ = aᵐ⁺ⁿ, (aᵐ)ⁿ = aᵐⁿ, a⁰ = 1, a⁻ⁿ = 1/aⁿ to simplify expressions',
        learningActivities: 'Simplify complex algebraic exponential terms; express atomic sizes in scientific notation',
        teachingActivities: 'Derive laws of exponents on chalkboard with clear inductive number patterns',
        materials: 'Chalkboard, exponent flash cards, scientific calculators',
        assessment: 'Chalkboard drill, 10-item simplification quiz, homework assignment',
        references: 'TIE Basic Mathematics for Secondary Schools Form 2 (CBC 2023)'
      },
      {
        mainTopic: 'Exponents and Radicals',
        subTopic: 'Radicals, Surds and Rationalizing the Denominator',
        cbcMainCompetence: 'Applying powers and roots in scientific notation and compound growth calculations',
        cbcSpecificCompetence: 'Simplifying square roots and rationalizing binomial denominators: a / (√b + c)',
        learningActivities: 'Work in pairs to simplify surds: √50 = 5√2 and multiply conjugate pairs to remove radicals from denominator',
        teachingActivities: 'Demonstrate difference of two squares technique for conjugate surds on chalkboard',
        materials: 'Worksheets with surd problems, chalkboard, square roots table',
        assessment: 'Surd simplification rubric, marked homework exercises',
        references: 'TIE Basic Mathematics Form 2'
      },
      {
        mainTopic: 'Algebra',
        subTopic: 'Simultaneous Linear Equations in Two Variables (Elimination & Substitution)',
        cbcMainCompetence: 'Constructing simultaneous equations to resolve commercial supply, demand, and pricing issues',
        cbcSpecificCompetence: 'Solving simultaneous equations using elimination and substitution methods and applying to business',
        learningActivities: 'Set up simultaneous equations for purchasing books and pens at stationary shop; solve for unit costs',
        teachingActivities: 'Demonstrate step-by-step elimination method and substitution method with 3 detailed examples',
        materials: 'Chalkboard, problem cards, market price scenario worksheets',
        assessment: 'Simultaneous equation solving speed test, word problem evaluation rubric',
        references: 'TIE Basic Mathematics Form 2'
      },
      {
        mainTopic: 'Algebra',
        subTopic: 'Graphical Solution of Simultaneous Linear Equations',
        cbcMainCompetence: 'Constructing simultaneous equations to resolve commercial supply, demand, and pricing issues',
        cbcSpecificCompetence: 'Plotting two linear graphs on the same Cartesian plane to find intersection point (x, y)',
        learningActivities: 'Plot lines on graph paper, locate intersection coordinates, verify by algebraic substitution',
        teachingActivities: 'Guide accurate scale selection and straight-edge drafting; explain parallel lines (no solution)',
        materials: 'Graph paper, sharp pencils, long transparent rulers, grid chalkboard',
        assessment: 'Graph rubric assessing line labeling, intersection point accuracy to 1 decimal place',
        references: 'TIE Basic Mathematics Form 2 CBC 2023'
      },
      {
        mainTopic: 'Quadratic Equations',
        subTopic: 'Factorisation of Quadratic Expressions: ax² + bx + c',
        cbcMainCompetence: 'Applying quadratic modeling in trajectory physics, projectile motion, and revenue maximization',
        cbcSpecificCompetence: 'Factorising quadratic trinomials by splitting middle term and difference of two squares',
        learningActivities: 'Identify product and sum numbers for trinomial factorisation; construct factor brackets',
        teachingActivities: 'Demonstrate product-sum table method on chalkboard for a = 1 and a > 1',
        materials: 'Chalkboard, factorisation card game, worked example charts',
        assessment: 'Factorisation drill of 10 quadratic expressions, notebook checking',
        references: 'TIE Basic Mathematics Form 2'
      },
      {
        mainTopic: 'Quadratic Equations',
        subTopic: 'Solving Quadratic Equations by Factorisation and Completing the Square',
        cbcMainCompetence: 'Applying quadratic modeling in trajectory physics, projectile motion, and revenue maximization',
        cbcSpecificCompetence: 'Solving equations of form ax² + bx + c = 0 and interpreting real-world roots',
        learningActivities: 'Solve projectile height equations to determine when a ball strikes the ground (height = 0)',
        teachingActivities: 'Explain zero product property (if AB = 0 then A=0 or B=0); introduce completing square steps',
        materials: 'Chalkboard, quadratic worksheets, projectile trajectory diagrams',
        assessment: 'Quadratic equation solution rubric, classwork exercises',
        references: 'TIE Basic Mathematics Form 2'
      },
      {
        mainTopic: 'Logarithms',
        subTopic: 'Laws of Logarithms to Base 10 and Standard Form',
        cbcMainCompetence: 'Utilizing logarithmic scales and four-figure tables in scientific and financial calculations',
        cbcSpecificCompetence: 'Applying log(AB) = logA + logB, log(A/B) = logA - logB, log(Aⁿ) = n*logA to simplify computations',
        learningActivities: 'Convert exponential statements to logarithmic form and vice-versa; prove basic log rules',
        teachingActivities: 'Derive laws of logarithms from laws of indices on chalkboard; explain characteristic and mantissa',
        materials: 'Chalkboard, four-figure mathematical tables, log charts',
        assessment: 'Logarithm simplification exercises, chalkboard speed drill',
        references: 'TIE Basic Mathematics Form 2'
      },
      {
        mainTopic: 'MIDTERM EVALUATION & REVISION',
        subTopic: 'Form 2 Term 1 Midterm Examination (NECTA Format)',
        cbcMainCompetence: 'MIDTERM COMPETENCE ASSESSMENT IN FORM 2 MATHEMATICS',
        cbcSpecificCompetence: 'Evaluating mastery of exponents, simultaneous equations, quadratics and logarithms',
        learningActivities: 'Sit standardized midterm examination paper under strict examination conditions',
        teachingActivities: 'Administer standardized midterm test, mark scripts according to marking scheme, compile marks',
        materials: 'Printed exam papers, answer booklets, marking schemes',
        assessment: 'Standardized Midterm Examination marked out of 100%',
        references: 'NECTA Form 2 National Assessment (FTNA) Guidelines'
      },
      {
        mainTopic: 'Logarithms',
        subTopic: 'Computation Using Four-Figure Mathematical Tables',
        cbcMainCompetence: 'Utilizing logarithmic scales and four-figure tables in scientific and financial calculations',
        cbcSpecificCompetence: 'Performing multiplication, division, powers and roots of complex numbers using log tables',
        learningActivities: 'Calculate compound arithmetic expressions using 4-figure tables with mean differences',
        teachingActivities: 'Guide step-by-step table lookup for mantissa and antilogarithm determination on board',
        materials: 'Four-figure mathematical tables (TIE/NECTA approved), calculation worksheets',
        assessment: 'Table computation accuracy rubric, homework of 5 multi-step log calculations',
        references: 'TIE Basic Mathematics Form 2 CBC 2023'
      },
      {
        mainTopic: 'Congruence and Similarity',
        subTopic: 'Conditions for Congruence of Triangles (SSS, SAS, ASA, RHS)',
        cbcMainCompetence: 'Applying geometric scale factors and congruence in civil engineering and structural design',
        cbcSpecificCompetence: 'Proving triangle congruence and applying congruent corresponding parts to solve unknown lengths',
        learningActivities: 'Construct triangles from given criteria to discover why SSA is not a congruence condition',
        teachingActivities: 'Demonstrate formal geometric two-column proof (Statement and Reason) on chalkboard',
        materials: 'Geometric instruments, cut-out cardboard triangles, chalkboard proof diagrams',
        assessment: 'Geometric proof rubric, marked textbook exercises',
        references: 'TIE Basic Mathematics Form 2'
      },
      {
        mainTopic: 'Congruence and Similarity',
        subTopic: 'Similar Figures, Scale Factor, Area and Volume Ratios',
        cbcMainCompetence: 'Applying geometric scale factors and congruence in civil engineering and structural design',
        cbcSpecificCompetence: 'Calculating linear scale factor k, area scale factor k², and volume scale factor k³ in architectural models',
        learningActivities: 'Build scaled architectural models of school structures; compute model volume vs actual volume',
        teachingActivities: 'Derive area ratio k² and volume ratio k³ using cube models on chalkboard',
        materials: 'Architectural scale drawings, building models, 3D unit cubes, calculators',
        assessment: 'Scale factor calculation rubric, student model presentation',
        references: 'TIE Basic Mathematics Form 2'
      },
      {
        mainTopic: 'TERMINAL EVALUATION & CLOSURE',
        subTopic: 'Summative Terminal Examination and FTNA Readiness Evaluation',
        cbcMainCompetence: 'TERMINAL COMPETENCE EVALUATION IN BASIC MATHEMATICS',
        cbcSpecificCompetence: 'Summative evaluation of Form 2 Term 1 syllabus and FTNA national exam preparation',
        learningActivities: 'Sit terminal examination, review script corrections, identify weak topics for Term 2',
        teachingActivities: 'Invigilate terminal exam, mark scripts according to standardized scheme, compile ledger records',
        materials: 'Official examination papers, answer sheets, academic ledger',
        assessment: 'Terminal Examination (NECTA FTNA Format, 100 Marks)',
        references: 'Ministry of Education & NECTA FTNA Standards'
      }
    ]
  },

  'kiswahili': {
    'form_1_term_1': [
      {
        mainTopic: 'Dhana ya Lugha na Mawasiliano',
        subTopic: 'Maana ya Lugha, Sifa za Lugha na Dhima ya Lugha katika Jamii',
        cbcMainCompetence: 'Kutumia lugha ya Kiswahili kwa ufasaha katika kuwasiliana na kueleza hisia na maarifa',
        cbcSpecificCompetence: 'Kueleza maana ya lugha, kubainisha sifa 6 za lugha ya binadamu na umuhimu wa mawasiliano',
        learningActivities: 'Wanafunzi wanajadili katika vikundi na kuorodhesha sifa za lugha (sauti nasibu, inajitosheleza, inakua)',
        teachingActivities: 'Kuongoza mjadala darasani, kufafanua tofauti kati ya mawasiliano ya binadamu na wanyama ubaoni',
        materials: 'Chati ya sifa za lugha, vielelezo vya mawasiliano, Kamusi Kuu ya Kiswahili',
        assessment: 'Maswali ya mdomo, zoezi la kuandika sifa 5 za lugha katika daftari',
        references: 'TET Kiswahili Kitabu cha Mwanafunzi Kidato cha 1 (Mtaala Mpya wa Umahiri 2023)'
      },
      {
        mainTopic: 'Sauti za Kiswahili',
        subTopic: 'Irabu (Vokali) na Konsonanti za Kiswahili',
        cbcMainCompetence: 'Kutumia mfumo wa kifonetiki na kifonolojia kutamka na kuandika maneno kwa ufasaha',
        cbcSpecificCompetence: 'Kutamka irabu 5 (a, e, i, o, u) na konsonanti 25 za Kiswahili kulingana na mahali na namna ya utamkaji',
        learningActivities: 'Wanafunzi wanashika koo na midomo ili kuhisi mtetemo na mkazo wakati wa kutamka sauti mbalimbali',
        teachingActivities: 'Kuchora mchoro wa ala za sauti ubaoni; kufundisha sauti ghuna na sighuna kwa mifano halisi',
        materials: 'Mchoro wa ala za sauti (midomo, meno, ufizi, kaakaa gumu/laini), kadi za sauti',
        assessment: 'Jaribio la kutamka sauti kwa usahihi, zoezi la kubainisha sauti ghuna na sighuna',
        references: 'TET Kiswahili Kidato cha 1 (2023), Fonolojia ya Kiswahili Sanifu'
      },
      {
        mainTopic: 'Silabi na Maneno',
        subTopic: 'Muundo wa Silabi za Kiswahili (I, KI, KKI, KKKI)',
        cbcMainCompetence: 'Kutumia mfumo wa kifonetiki na kifonolojia kutamka na kuandika maneno kwa ufasaha',
        cbcSpecificCompetence: 'Kugawa maneno katika silabi na kutambua miundo ya silabi wazi na silabi funge',
        learningActivities: 'Wanafunzi wanapiga makofi kuhesabu silabi katika maneno marefu (k.m. wa-li-o-m-pi-ga) na kuandika ubaoni',
        teachingActivities: 'Kufafanua muundo wa silabi za Kiswahili ambazo nyingi huishia na irabu (silabi wazi)',
        materials: 'Kadi za silabi, chati ya muundo wa silabi, ubao',
        assessment: 'Zoezi la kutenganisha silabi katika maneno 15, kukagua daftari za wanafunzi',
        references: 'TET Kiswahili Kidato cha 1'
      },
      {
        mainTopic: 'Aina za Maneno',
        subTopic: 'Nomino (N) na Vivumishi (V)',
        cbcMainCompetence: 'Kuchanganua aina za maneno na kutunga sentensi sahihi kimuundo na kimaana',
        cbcSpecificCompetence: 'Kutambua aina za nomino (Pekee, Za Kawaida, Jamii, Dhahania) na aina za vivumishi katika tungo',
        learningActivities: 'Wanafunzi wanataja vitu vilivyomo darasani na kuvipatia sifa zake (k.m. Meza ndefu, Mwanafunzi mtiifu)',
        teachingActivities: 'Kuongoza uainishaji wa nomino na vivumishi ubaoni kwa kutumia jedwali na sentensi za mfano',
        materials: 'Vitu halisi darasani, kadi za maneno, chati ya aina za nomino na vivumishi',
        assessment: 'Zoezi la ubaoni la kubainisha nomino na vivumishi kutoka katika aya fupi',
        references: 'TET Kiswahili Kidato cha 1 CBC 2023'
      },
      {
        mainTopic: 'Aina za Maneno',
        subTopic: 'Vitenzi (T) na Vielezi (E)',
        cbcMainCompetence: 'Kuchanganua aina za maneno na kutunga sentensi sahihi kimuundo na kimaana',
        cbcSpecificCompetence: 'Kutofautisha vitenzi vikuu, vitenzi visaidizi na vitenzi vishirikishi; kubainisha vielezi vya namna, wakati, mahali',
        learningActivities: 'Wanafunzi wanaigiza vitendo darasani (kimbia haraka, imba kwa sauti) na kuandika sentensi zake',
        teachingActivities: 'Kufundisha muundo wa vitenzi na jinsi kielezi kinavyofafanua kitenzi, kivumishi au kielezi kingine',
        materials: 'Kadi za vitenzi na vielezi, ubao, vielelezo vya vitendo',
        assessment: 'Kutunga sentensi 5 zenye vitenzi na vielezi vya aina mbalimbali, tathmini ya marika',
        references: 'TET Kiswahili Kidato cha 1'
      },
      {
        mainTopic: 'Aina za Maneno',
        subTopic: 'Viwakilishi (W), Viunganishi (U), Vihusishi (H) na Vihisishi (I)',
        cbcMainCompetence: 'Kuchanganua aina za maneno na kutunga sentensi sahihi kimuundo na kimaana',
        cbcSpecificCompetence: 'Kutambua na kutumia aina zote 8 za maneno ya Kiswahili katika mawasiliano sanifu',
        learningActivities: 'Kukamilisha jedwali la aina 8 za maneno kutoka katika hadithi fupi waliyopewa',
        teachingActivities: 'Kutoa muhtasari wa aina zote 8 za maneno ubaoni na kufafanua dhima ya kila aina ya neno',
        materials: 'Vifungu vya habari, chati ya aina 8 za maneno, kadi za majaribio',
        assessment: 'Zoezi la kutambua aina za maneno lililopigiwa mstari katika aya 2',
        references: 'TET Kiswahili Kidato cha 1'
      },
      {
        mainTopic: 'Uakifishaji na Maandishi Sanifu',
        subTopic: 'Alama za Uakifishaji (Nukta, Mkato, Nukta Mkato, Alama ya Kushangaa, Alama ya Ulizo)',
        cbcMainCompetence: 'Kutumia kanuni za uandishi sanifu na uakifishaji sahihi katika insha na barua',
        cbcSpecificCompetence: 'Kutumia alama zote kuu za uakifishaji kuleta maana iliyokusudiwa na kuepuka utata',
        learningActivities: 'Kusoma sentensi yenye alama tofauti na kuona jinsi sauti na maana zinavyobadilika; kuakifisha aya isiyo na alama',
        teachingActivities: 'Kufundisha matumizi sahihi ya kila alama ubaoni kwa mifano dhahiri ya kisheria na kijamii',
        materials: 'Chati ya alama za uakifishaji, vifungu vya mazoezi ya kuakifisha, ubao',
        assessment: 'Zoezi la kuweka alama sahihi katika aya fupi ya maneno 100',
        references: 'TET Kiswahili Kidato cha 1 CBC 2023'
      },
      {
        mainTopic: 'PIMHO LA KATIKATI YA MUHULA (MIDTERM)',
        subTopic: 'Mtihani wa Tathmini ya Umahiri wa Katikati ya Muhula wa 1',
        cbcMainCompetence: 'UPIMAJI WA UMAHIRI WA SARUFI NA MATUMIZI YA LUGHA',
        cbcSpecificCompetence: 'Kupima uelewa na umahiri katika lugha, sauti, silabi na aina 8 za maneno',
        learningActivities: 'Kufanya mtihani wa katikati ya muhula kwa umakini na utulivu',
        teachingActivities: 'Kusimamia mtihani kulingana na miongozo ya NECTA, kusahihisha na kuchanganua matokeo',
        materials: 'Karatasi za mtihani zilizochapishwa, vitabu vya majibu, mwongozo wa usahihishaji',
        assessment: 'Mtihani Rasmi wa Katikati ya Muhula (Alama 100)',
        references: 'Mwongozo wa Upimaji wa NECTA Kidato cha Kwanza'
      },
      {
        mainTopic: 'Fasihi kwa Ujumla',
        subTopic: 'Maana ya Fasihi, Dhima ya Fasihi na Tofauti kati ya Fasihi na Sanaa Nyingine',
        cbcMainCompetence: 'Kuthamini kazi za sanaa na fasihi katika kuhifadhi utamaduni na kuelimisha jamii',
        cbcSpecificCompetence: 'Kufafanua dhana ya fasihi, kueleza tanzu mbili kuu (Simulizi na Andishi) na umuhimu wake kijamii',
        learningActivities: 'Wanafunzi wanajadili nyimbo za asili za makabila yao na maadili yanayofundishwa kwa jamii',
        teachingActivities: 'Kuongoza uchambuzi wa fasihi kama kioo cha jamii; kueleza fani na maudhui kwa ujumla',
        materials: 'Kanda za sauti za nyimbo za asili, picha za sanaa za maonyesho, vitabu vya fasihi',
        assessment: 'Insha fupi kuhusu "Nafasi ya Fasihi katika Maadili ya Vijana Tanzania"',
        references: 'TET Kiswahili Kidato cha 1 CBC 2023, Misingi ya Fasihi'
      },
      {
        mainTopic: 'Fasihi Simulizi',
        subTopic: 'Dhana ya Fasihi Simulizi, Sifa Zake na Tanzu Nne Kuu',
        cbcMainCompetence: 'Kuhakiki na kutenda vipera vya fasihi simulizi kwa kuzingatia muktadha wa kitamaduni',
        cbcSpecificCompetence: 'Kutofautisha Hadithi, Ushairi Simulizi, Semi (Methali, Vitendawili, Misemo) na Sanaa za Maonyesho',
        learningActivities: 'Wanafunzi wanategeana vitendawili na kueleza maana fiche na mafunzo yake katika maisha',
        teachingActivities: 'Kuainisha matawi ya fasihi simulizi ubaoni na kufafanua sifa ya upekee (mdomo, hadhira hai, kubadilika)',
        materials: 'Mchoro wa matawi ya tanzu za fasihi simulizi, vitabu vya hadithi na methali',
        assessment: 'Mashindano ya kutegua vitendawili darasani, zoezi la kuandika sifa 5 za fasihi simulizi',
        references: 'TET Kiswahili Kidato cha 1'
      },
      {
        mainTopic: 'MARUDIO YA JUMLA YA MUHULA WA KWANZA',
        subTopic: 'Marudio ya Mada Zote za Sarufi, Uakifishaji na Fasihi Simulizi',
        cbcMainCompetence: 'UUNGANISHAJI WA UMAHIRI WA KISWAHILI KIDATO CHA KWANZA',
        cbcSpecificCompetence: 'Kujibu maswali ya mitihani ya NECTA kwa usahihi na kasi stahiki',
        learningActivities: 'Kufanya mazoezi ya mitihani ya miaka ya nyuma katika vikundi vidogo vidogo',
        teachingActivities: 'Kusahihisha makosa ya mara kwa mara ya kisarufi na kuweka mkazo kwenye mbinu za kujibu maswali',
        materials: 'Karatasi za mitihani ya nyuma ya shule, ubao, vielelezo vya majibu bora',
        assessment: 'Jaribio la marudio lenye maswali ya kuchagua na maswali ya insha',
        references: 'Mfululizo wa Mitihani ya NECTA Kidato cha Kwanza'
      },
      {
        mainTopic: 'MTIHANI WA MWISHO WA MUHULA WA KWANZA NA FUNGA SHULE',
        subTopic: 'Tathmini ya Mwisho wa Muhula na Kujaza Daftari la Maendeleo ya Kitaaluma',
        cbcMainCompetence: 'TATHMINI YA MWISHO WA MUHULA WA KISWAHILI',
        cbcSpecificCompetence: 'Kutathmini kiwango cha mafanikio ya ujifunzaji kwa Muhula wa Kwanza',
        learningActivities: 'Kufanya mtihani wa mwisho wa muhula, kuangalia masahihisho na kupanga malengo ya Muhula wa Pili',
        teachingActivities: 'Kusimamia mtihani, kusahihisha, kuingiza alama kwenye rejesta na kadi za ripoti za maendeleo',
        materials: 'Karatasi rasmi za mitihani, vitabu vya majibu, rejesta ya alama, ripoti za wanafunzi',
        assessment: 'Mtihani Rasmi wa Mwisho wa Muhula (Alama 100)',
        references: 'Miongozo ya Wizara ya Elimu na Baraza la Mitihani la Taifa (NECTA)'
      }
    ]
  },

  'english': {
    'form_1_term_1': [
      {
        mainTopic: 'Listening and Speaking',
        subTopic: 'Greetings, Courteous Language and Self-Introduction',
        cbcMainCompetence: 'Demonstrating communicative competence in social interactions and formal school contexts',
        cbcSpecificCompetence: 'Using appropriate formal and informal greetings, courteous expressions, and introducing self and others',
        learningActivities: 'Learners role-play greeting headmaster vs greeting a classmate, practice self-introductions in pairs',
        teachingActivities: 'Model polite speech patterns (Excuse me, Pardon, Please, Thank you) and supervise peer role-plays',
        materials: 'Dialogue scripts, audio recordings of standard English greetings, flashcards',
        assessment: 'Speaking rubric assessing pronunciation, tone, vocabulary, and confidence',
        references: 'TIE English for Secondary Schools Form 1 (CBC 2023), MoEST Guidelines'
      },
      {
        mainTopic: 'Listening and Speaking',
        subTopic: 'Classroom Language, Giving Instructions and Following Directions',
        cbcMainCompetence: 'Demonstrating communicative competence in social interactions and formal school contexts',
        cbcSpecificCompetence: 'Interpreting classroom commands, asking for clarification, and giving directional instructions',
        learningActivities: 'Simon Says game for listening comprehension; guide a blindfolded partner through classroom obstacle course',
        teachingActivities: 'Demonstrate imperative sentence structures (Stand up, Turn left, Open your book at page 20) on board',
        materials: 'Classroom maps, instruction cards, directional signage',
        assessment: 'Listening task rubric, oral response evaluation',
        references: 'TIE English Form 1'
      },
      {
        mainTopic: 'Reading Comprehension',
        subTopic: 'Dictionary Skills, Alphabetical Ordering and Pronunciation Symbols',
        cbcMainCompetence: 'Utilizing reading strategies and reference tools to expand vocabulary and comprehend authentic texts',
        cbcSpecificCompetence: 'Locating words quickly using guide words, interpreting phonemic transcriptions and part of speech labels',
        learningActivities: 'Dictionary treasure hunt: race in pairs to find word definitions, syllabification, and stress marks',
        teachingActivities: 'Explain guide words at top of dictionary pages; guide phonetic symbols for long and short vowels',
        materials: 'Oxford Advanced Learner\'s Dictionaries, dictionary task cards, chalkboard',
        assessment: 'Dictionary speed and accuracy worksheet, vocabulary matching quiz',
        references: 'TIE English Form 1 CBC 2023'
      },
      {
        mainTopic: 'Grammar and Syntax',
        subTopic: 'Nouns (Countable and Uncountable) and Determiners (A, An, Some, Any)',
        cbcMainCompetence: 'Constructing grammatically correct sentences using appropriate parts of speech',
        cbcSpecificCompetence: 'Distinguishing countable vs uncountable nouns and applying appropriate quantifiers (much, many, few, little)',
        learningActivities: 'Sort market items into countable (apples, eggs) and uncountable (rice, milk, sugar); write sentences',
        teachingActivities: 'Demonstrate rules for irregular plural nouns (child/children, sheep/sheep, foot/feet) on chalkboard',
        materials: 'Real objects (pens, sugar, water bottle), noun sorting chart, grammar worksheets',
        assessment: 'Classroom grammar exercise of 15 sentences, peer error correction',
        references: 'TIE English Form 1'
      },
      {
        mainTopic: 'Grammar and Syntax',
        subTopic: 'Pronouns (Personal, Possessive, Demonstrative, Reflexive)',
        cbcMainCompetence: 'Constructing grammatically correct sentences using appropriate parts of speech',
        cbcSpecificCompetence: 'Replacing nouns with correct subjective, objective and possessive pronouns to avoid repetition',
        learningActivities: 'Rewrite a repetitive passage replacing repeated names with appropriate pronouns in small groups',
        teachingActivities: 'Draw comprehensive pronoun declension table (I, me, my, mine, myself) on chalkboard with examples',
        materials: 'Chalkboard, pronoun classification table, narrative excerpt worksheets',
        assessment: 'Pronoun substitution exercises in exercise books, short diagnostic quiz',
        references: 'TIE English Form 1'
      },
      {
        mainTopic: 'Grammar and Syntax',
        subTopic: 'Tense and Aspect: Present Simple and Present Continuous',
        cbcMainCompetence: 'Expressing habitual actions, universal truths, and ongoing events using accurate verb tenses',
        cbcSpecificCompetence: 'Formulating affirmative, negative, and interrogative sentences in Simple Present and Present Continuous',
        learningActivities: 'Write daily routine schedules using simple present; mime actions for classmates to describe in continuous tense',
        teachingActivities: 'Explain 3rd person singular "-s/-es" rule and spelling rules for "-ing" participles on chalkboard',
        materials: 'Verb flash cards, daily routine pictures, grammar charts',
        assessment: 'Verb tense transformation worksheet, short descriptive paragraph writing',
        references: 'TIE English Form 1 CBC 2023'
      },
      {
        mainTopic: 'Reading Comprehension',
        subTopic: 'Reading for Main Ideas, Scanning and Skimming Informational Texts',
        cbcMainCompetence: 'Utilizing reading strategies and reference tools to expand vocabulary and comprehend authentic texts',
        cbcSpecificCompetence: 'Skimming for gist, scanning for specific factual dates/names, and making logical inferences',
        learningActivities: 'Read news article on environmental conservation in Tanzania; highlight main topic sentence in each paragraph',
        teachingActivities: 'Model skimming vs scanning reading techniques; guide answering WH-questions (Who, What, Where, When, Why)',
        materials: 'Graded reading passages on Serengeti wildlife, comprehension question sheets',
        assessment: 'Reading comprehension test assessing literal, inferential, and vocabulary-in-context questions',
        references: 'TIE English Form 1'
      },
      {
        mainTopic: 'MIDTERM ASSESSMENT & PORTFOLIO REVIEW',
        subTopic: 'Form 1 Term 1 Standardized Midterm Examination',
        cbcMainCompetence: 'MIDTERM COMPETENCE ASSESSMENT IN ENGLISH LANGUAGE',
        cbcSpecificCompetence: 'Evaluating student listening, grammar, vocabulary, reading comprehension and writing proficiency',
        learningActivities: 'Complete standardized midterm examination paper covering Weeks 1 to 7 modules',
        teachingActivities: 'Administer standardized NECTA-style examination, mark scripts, provide individualized feedback',
        materials: 'Printed exam papers, answer booklets, marking guide',
        assessment: 'Standardized Midterm Examination (Grammar 40% + Reading 40% + Writing 20%)',
        references: 'NECTA English Assessment Framework'
      },
      {
        mainTopic: 'Writing Skills',
        subTopic: 'Writing Informal Letters to Friends and Family Members',
        cbcMainCompetence: 'Communicating effectively through written correspondence following standard formats',
        cbcSpecificCompetence: 'Structuring an informal letter: Sender\'s address, Date, Salutation, Body paragraphs, Sign-off',
        learningActivities: 'Draft a friendly letter to a primary school friend describing life and new subjects in secondary school',
        teachingActivities: 'Display annotated friendly letter template on chalkboard; review informal idioms and conversational tone',
        materials: 'Sample friendly letters, address layout templates, letter writing paper',
        assessment: 'Letter writing rubric assessing format, paragraph coherence, grammatical accuracy, and tone',
        references: 'TIE English Form 1 CBC 2023'
      },
      {
        mainTopic: 'Introduction to Literature',
        subTopic: 'Oral Literature: Folk Tales, Proverbs and Simple Lyric Poems',
        cbcMainCompetence: 'Appreciating imaginative literary expressions and analyzing moral values in simple literary genres',
        cbcSpecificCompetence: 'Identifying characters, setting, plot, conflict, moral lesson in African folk tales and poetic rhymes',
        learningActivities: 'Read and dramatize an East African traditional folk tale (Hare and Hyena); discuss character traits',
        teachingActivities: 'Introduce literary elements: protagonist, antagonist, setting, theme, moral message on chalkboard',
        materials: 'Selected Tanzanian folk tale readers, poetry anthologies, character mask props',
        assessment: 'Literary analysis worksheet identifying characters and theme in given short story',
        references: 'TIE English Form 1, Approved Literature Anthologies'
      },
      {
        mainTopic: 'REVISION & PAST PAPERS',
        subTopic: 'Comprehensive Term 1 Examination Preparation and Drills',
        cbcMainCompetence: 'CONSOLIDATION OF ENGLISH LANGUAGE COMPETENCES',
        cbcSpecificCompetence: 'Reviewing core grammatical structures, comprehension strategies and letter writing layout',
        learningActivities: 'Practice timed past paper sections in cooperative teams with peer correction',
        teachingActivities: 'Review common spelling, punctuation and subject-verb agreement errors observed in student work',
        materials: 'Past exam papers, chalkboard, revision question booklets',
        assessment: 'Timed practice drill on Section A (Grammar) and Section B (Reading Comprehension)',
        references: 'NECTA Past Examination Question Series'
      },
      {
        mainTopic: 'TERMINAL EXAMINATION & CLOSURE',
        subTopic: 'Summative Terminal Examination and Term 1 Academic Records',
        cbcMainCompetence: 'TERMINAL COMPETENCE EVALUATION IN ENGLISH LANGUAGE',
        cbcSpecificCompetence: 'Summative evaluation of Form 1 Term 1 English language mastery',
        learningActivities: 'Sit terminal examination paper; receive evaluated papers and log personal growth goals',
        teachingActivities: 'Invigilate terminal examination; mark scripts according to standardized rubric; enter ledger grades',
        materials: 'Official examination papers, answer sheets, academic ledger and report cards',
        assessment: 'Terminal Examination (NECTA Standard Format, 100 Marks)',
        references: 'Ministry of Education & NECTA Terminal Standards'
      }
    ]
  }
};

// -------------------------------------------------------------------------------------------------
// DYNAMIC INTELLIGENT SCHEME BUILDER
// -------------------------------------------------------------------------------------------------

export function getSubjectSchemeTemplate(
  subject: string,
  className: string,
  term: string,
  curriculumType: CurriculumType,
  language: 'Kiswahili' | 'English' = 'English',
  academicTermDates?: AcademicTermDates,
  customTopics?: string[]
): SubjectSchemeTemplate {
  const normSub = String(subject || 'General Studies').trim().toLowerCase();
  const classKey = resolveClassKey(className);
  const termKey = resolveTermKey(term);
  const isCbc = curriculumType === 'NEW_CBC_2023';
  const isSwahili = language === 'Kiswahili' || normSub.includes('kiswahili');

  // 1. Direct registry lookup if exact match exists
  let registryKey = '';
  if (normSub.includes('math') || normSub.includes('hisabati')) registryKey = 'mathematics';
  else if (normSub.includes('kiswahili') || normSub.includes('swahili')) registryKey = 'kiswahili';
  else if (normSub.includes('engl') || normSub.includes('lit')) registryKey = 'english';

  const lookupKey = `${classKey}_${termKey}`;
  const foundEntries = registryKey && TIE_SYLLABUS_REGISTRY[registryKey]?.[lookupKey];

  if (foundEntries && foundEntries.length >= 10) {
    const weeks: SubjectSchemeWeek[] = foundEntries.slice(0, 12).map((item, idx) => ({
      week: idx + 1,
      dates: getTanzanianTermDates(idx + 1, termKey, isSwahili ? 'Kiswahili' : 'English'),
      cbc: {
        mainCompetence: item.cbcMainCompetence,
        specificCompetence: item.cbcSpecificCompetence,
        learningActivities: item.learningActivities,
        teachingActivities: item.teachingActivities,
        materials: item.materials,
        assessment: item.assessment,
        references: item.references,
      },
      old: {
        mainTopic: item.mainTopic,
        subTopic: item.subTopic,
        specificObjectives: item.cbcSpecificCompetence,
        teachingActivities: item.teachingActivities,
        materials: item.materials,
        assessment: item.assessment,
        references: item.references,
      }
    }));

    return {
      subject,
      department: registryKey === 'mathematics' ? (isSwahili ? 'Hisabati na Sayansi' : 'Science & Mathematics') : (isSwahili ? 'Lugha na Fasihi' : 'Languages & Literature'),
      defaultPeriodsPerWeek: registryKey === 'mathematics' ? 6 : 4,
      weeks
    };
  }

  // 2. Intelligent Real Curriculum Map for Science, Humanities, Commercial, and Primary Subjects!
  let department = 'General Studies';
  let defaultPeriods = 4;
  let weeklyTopics: {
    mainTopic: string;
    subTopic: string;
    cbcMain: string;
    cbcSpec: string;
    learning: string;
    teaching: string;
    materials: string;
    assessment: string;
    references: string;
  }[] = [];

  const classNumStr = className.replace(/[^0-9]/g, '') || '1';

  if (normSub.includes('physic') || normSub.includes('fizikia')) {
    department = isSwahili ? 'Sayansi na Maabara' : 'Science & Mathematics';
    defaultPeriods = 4;
    const f1Topics = [
      { m: 'Concept of Physics', s: 'Meaning and Applications in Daily Life', r: `TIE Physics Form ${classNumStr}` },
      { m: 'Measurement', s: 'Physical Quantities and Fundamental SI Units', r: `TIE Physics Form ${classNumStr}` },
      { m: 'Measurement', s: 'Length and Area Measurement (Vernier Caliper)', r: `TIE Physics Form ${classNumStr}` },
      { m: 'Measurement', s: 'Mass, Volume and Density Calculations', r: `TIE Physics Form ${classNumStr}` },
      { m: 'Force', s: 'Concept, Types and Effects of Forces', r: `TIE Physics Form ${classNumStr}` },
      { m: 'Archimedes Principle', s: 'Upthrust and Floating Bodies', r: `TIE Physics Form ${classNumStr}` },
      { m: 'Structure of Matter', s: 'Kinetic Theory of Matter and States', r: `TIE Physics Form ${classNumStr}` },
      { m: 'MIDTERM EVALUATION', s: 'Formative Midterm Assessment and Review', r: `NECTA Physics Guidelines` },
      { m: 'Pressure', s: 'Solid Pressure and Hydraulic Lift Principle', r: `TIE Physics Form ${classNumStr}` },
      { m: 'Work, Energy and Power', s: 'Mechanical Work and Conservation of Energy', r: `TIE Physics Form ${classNumStr}` },
      { m: 'REVISION & DRILLS', s: 'NECTA Past Papers and Practical Review', r: `NECTA Physics Series` },
      { m: 'TERMINAL EXAMINATION', s: 'Summative Terminal Examination and Audit', r: `Ministry of Education Standards` }
    ];
    weeklyTopics = f1Topics.map(t => ({
      mainTopic: t.m,
      subTopic: t.s,
      cbcMain: `Applying fundamental principles of ${t.m.toLowerCase()} to design sustainable engineering and mechanical solutions`,
      cbcSpec: `Investigating ${t.s.toLowerCase()} through collaborative lab inquiry and apparatus measurement`,
      learning: `Learners conduct practical station experiments on ${t.s.toLowerCase()}, record measurements and analyze errors in work cards`,
      teaching: `Demonstrate apparatus safety, guide formula derivations and monitor experimental group stations`,
      materials: `Laboratory apparatus, spring balances, stopwatches, calipers, measuring cylinders, digital simulations`,
      assessment: `Practical laboratory rubric, calculation check, marked workbook questions`,
      references: t.r
    }));
  } else if (normSub.includes('chem') || normSub.includes('kemia')) {
    department = isSwahili ? 'Sayansi na Maabara' : 'Science & Mathematics';
    defaultPeriods = 4;
    const chemTopics = [
      { m: 'Introduction to Chemistry', s: 'Importance, Products and Careers', r: `TIE Chemistry Form ${classNumStr}` },
      { m: 'Laboratory Safety and Apparatus', s: 'Warning Signs, First Aid and Apparatus Handling', r: `TIE Chemistry Form ${classNumStr}` },
      { m: 'Scientific Procedures', s: 'Hypothesis, Variables and Scientific Method', r: `TIE Chemistry Form ${classNumStr}` },
      { m: 'Matter', s: 'States of Matter, Physical and Chemical Changes', r: `TIE Chemistry Form ${classNumStr}` },
      { m: 'Elements, Compounds and Mixtures', s: 'Classification and Chemical Symbols', r: `TIE Chemistry Form ${classNumStr}` },
      { m: 'Separation of Mixtures', s: 'Filtration, Evaporation, Distillation and Chromatography', r: `TIE Chemistry Form ${classNumStr}` },
      { m: 'Air and Combustion', s: 'Composition of Air, Oxygen and Flame Tests', r: `TIE Chemistry Form ${classNumStr}` },
      { m: 'MIDTERM EVALUATION', s: 'Midterm Practical and Theory Assessment', r: `NECTA Chemistry Guidelines` },
      { m: 'Rusting and Corrosion', s: 'Conditions for Rusting and Prevention Methods', r: `TIE Chemistry Form ${classNumStr}` },
      { m: 'Water and Hydrogen', s: 'Water Treatment, Soft and Hard Water', r: `TIE Chemistry Form ${classNumStr}` },
      { m: 'REVISION & DRILLS', s: 'NECTA Past Paper Drills and Practical Review', r: `NECTA Chemistry Series` },
      { m: 'TERMINAL EXAMINATION', s: 'Summative Terminal Examination and Records', r: `Ministry of Education Standards` }
    ];
    weeklyTopics = chemTopics.map(t => ({
      mainTopic: t.m,
      subTopic: t.s,
      cbcMain: `Applying chemical concepts and properties of substances to solve environmental and manufacturing problems`,
      cbcSpec: `Analyzing ${t.s.toLowerCase()} through safe laboratory experiments and observation`,
      learning: `Learners carry out test-tube investigations on ${t.s.toLowerCase()}, observe color/temperature changes and record in lab sheets`,
      teaching: `Demonstrate chemical handling safety, explain underlying chemical mechanisms and supervise Bunsen burner usage`,
      materials: `Test tubes, beakers, Bunsen burners, chemical reagents, safety goggles, filter paper, tripod stands`,
      assessment: `Laboratory observation rubric, chemical equation quiz, practical report mark sheet`,
      references: t.r
    }));
  } else if (normSub.includes('bio') || normSub.includes('biolojia')) {
    department = isSwahili ? 'Sayansi ya Biolojia' : 'Science & Mathematics';
    defaultPeriods = 4;
    const bioTopics = [
      { m: 'Introduction to Biology', s: 'Branches, Characteristics of Living Things and Importance', r: `TIE Biology Form ${classNumStr}` },
      { m: 'Safety in the Environment', s: 'First Aid, Waste Disposal and Biological Warning Signs', r: `TIE Biology Form ${classNumStr}` },
      { m: 'Cell Structure and Organization', s: 'Plant vs Animal Cells and Light Microscopy', r: `TIE Biology Form ${classNumStr}` },
      { m: 'Cell Physiology', s: 'Diffusion, Osmosis and Turgor Pressure in Plants', r: `TIE Biology Form ${classNumStr}` },
      { m: 'Classification of Living Things', s: 'Five Kingdoms and Binomial Nomenclature', r: `TIE Biology Form ${classNumStr}` },
      { m: 'Viruses and Bacteria', s: 'Structure, Transmission and Disease Prevention', r: `TIE Biology Form ${classNumStr}` },
      { m: 'Human Nutrition', s: 'Food Substances, Balanced Diet and Malnutrition', r: `TIE Biology Form ${classNumStr}` },
      { m: 'MIDTERM EVALUATION', s: 'Midterm Dissection and Food Test Assessment', r: `NECTA Biology Guidelines` },
      { m: 'Food Tests', s: 'Qualitative Tests for Starch, Reducing Sugars, Proteins and Lipids', r: `TIE Biology Form ${classNumStr}` },
      { m: 'Human Digestive System', s: 'Alimentary Canal, Enzymes and Villi Absorption', r: `TIE Biology Form ${classNumStr}` },
      { m: 'REVISION & DRILLS', s: 'NECTA Practical Specimen Drills and Theory Papers', r: `NECTA Biology Series` },
      { m: 'TERMINAL EXAMINATION', s: 'Summative Terminal Examination and Records', r: `Ministry of Education Standards` }
    ];
    weeklyTopics = bioTopics.map(t => ({
      mainTopic: t.m,
      subTopic: t.s,
      cbcMain: `Investigating biological systems, cellular organization, and physiological adaptations for health sustainability`,
      cbcSpec: `Examining ${t.s.toLowerCase()} using biological specimens and diagnostic procedures`,
      learning: `Learners observe specimens with hand lenses or light microscope, draw labeled biological diagrams, and conduct tests`,
      teaching: `Demonstrate proper microscope alignment, guide biological drawing rules (no shading, clear labels), supervise testing`,
      materials: `Light microscopes, glass slides, iodine, Benedict's solution, onion epidermis, food samples, dissection models`,
      assessment: `Biological drawing rubric (clear lines, magnification factor), practical test-tube evaluation, written test`,
      references: t.r
    }));
  } else if (normSub.includes('geog') || normSub.includes('jiografia') || normSub.includes('maarifa ya jamii')) {
    department = isSwahili ? 'Sayansi za Jamii' : 'Social Sciences';
    defaultPeriods = 4;
    const geoTopics = [
      { m: 'Concept of Geography', s: 'Branches, Earth in Space and Economic Importance', r: `TIE Geography Form ${classNumStr}` },
      { m: 'The Solar System', s: 'Planets, Sun, Earth Rotation and Revolution (Seasons)', r: `TIE Geography Form ${classNumStr}` },
      { m: 'Major Features of the Earth', s: 'Continents, Ocean Basins and Relief Features', r: `TIE Geography Form ${classNumStr}` },
      { m: 'Weather and Climate', s: 'Weather Elements, Instruments and Station Layout', r: `TIE Geography Form ${classNumStr}` },
      { m: 'Map Work', s: 'Types of Maps, Scales, Grid References and Distance Measurement', r: `TIE Geography Form ${classNumStr}` },
      { m: 'Map Work', s: 'Contours, Gradient, Relief Representation and Cross Sections', r: `TIE Geography Form ${classNumStr}` },
      { m: 'Agricultural Systems', s: 'Small-scale Agriculture and Cash Crop Farming in Tanzania', r: `TIE Geography Form ${classNumStr}` },
      { m: 'MIDTERM EVALUATION', s: 'Midterm Map Reading and Climate Assessment', r: `NECTA Geography Guidelines` },
      { m: 'Water Management', s: 'Irrigation Schemes and Hydroelectric Power Generation (JNHPP)', r: `TIE Geography Form ${classNumStr}` },
      { m: 'Mining and Sustainable Development', s: 'Mineral Extraction in Tanzania (Gold, Tanzanite, Gas)', r: `TIE Geography Form ${classNumStr}` },
      { m: 'REVISION & DRILLS', s: 'NECTA Topographic Map Work and Past Paper Review', r: `NECTA Geography Series` },
      { m: 'TERMINAL EXAMINATION', s: 'Summative Terminal Examination and Ledger Entry', r: `Ministry of Education Standards` }
    ];
    weeklyTopics = geoTopics.map(t => ({
      mainTopic: t.m,
      subTopic: t.s,
      cbcMain: `Interpreting spatial geographic data, environmental processes, and sustainable economic resource management`,
      cbcSpec: `Analyzing ${t.s.toLowerCase()} using topographic sheets, climatic graphs, and regional case studies`,
      learning: `Learners analyze topographic map sheets using dividers and compasses, calculate gradients and plot cross-sections`,
      teaching: `Demonstrate 6-figure grid reference reading, explain seasonal shift of Inter-Tropical Convergence Zone (ITCZ)`,
      materials: `NECTA 1:50,000 topographic maps, pair of dividers, magnifying glasses, weather station instruments, globe`,
      assessment: 'Map interpretation accuracy rubric, climate graph analysis worksheet, classwork exercises',
      references: t.r
    }));
  } else if (normSub.includes('hist') || normSub.includes('historia')) {
    department = isSwahili ? 'Sayansi za Jamii' : 'Social Sciences';
    defaultPeriods = 3;
    const histTopics = [
      { m: 'Meaning and Sources of History', s: 'Oral Traditions, Archaeology, Archives and Museums', r: `TIE History Form ${classNumStr}` },
      { m: 'Human Evolution', s: 'Stages of Human Evolution and Olduvai Gorge Heritage', r: `TIE History Form ${classNumStr}` },
      { m: 'Development of Early Technology', s: 'Stone Age to Iron Age and Socio-Economic Impact', r: `TIE History Form ${classNumStr}` },
      { m: 'Pre-Colonial African Societies', s: 'Communalism and Feudalism in Interlacustrine Region', r: `TIE History Form ${classNumStr}` },
      { m: 'Trade in Pre-Colonial Africa', s: 'Trans-Saharan and Long Distance Trade in East Africa', r: `TIE History Form ${classNumStr}` },
      { m: 'Africa and the External World', s: 'Early Contacts with Arabs and Portuguese along Swahili Coast', r: `TIE History Form ${classNumStr}` },
      { m: 'The Slave Trade in East Africa', s: 'Triangular Trade, Caravan Routes and Abolition Treaties', r: `TIE History Form ${classNumStr}` },
      { m: 'MIDTERM EVALUATION', s: 'Midterm Historical Sources and Pre-Colonial Essay Assessment', r: `NECTA History Guidelines` },
      { m: 'Scramble for and Partition of Africa', s: 'Berlin Conference (1884-85) and Imperialist Motives', r: `TIE History Form ${classNumStr}` },
      { m: 'African Resistance to Colonial Rule', s: 'Maji Maji War, Abushiri and Hehe Resistance Under Mkwawa', r: `TIE History Form ${classNumStr}` },
      { m: 'REVISION & DRILLS', s: 'NECTA Essay Writing and Document-Based Question Drills', r: `NECTA History Series` },
      { m: 'TERMINAL EXAMINATION', s: 'Summative Terminal Examination and Records', r: `Ministry of Education Standards` }
    ];
    weeklyTopics = histTopics.map(t => ({
      mainTopic: t.m,
      subTopic: t.s,
      cbcMain: `Analyzing historical transformations, African heritage, and anti-colonial liberation struggles for national consciousness`,
      cbcSpec: `Evaluating causes, course, and socio-economic consequences of ${t.s.toLowerCase()}`,
      learning: `Learners analyze archival documents and historical maps in groups, debate historical perspectives, and write essays`,
      teaching: `Facilitate historiographical source critique, trace migration/trade routes on wall map, guide essay structure`,
      materials: `Historical maps of Africa, primary source document excerpts, Olduvai Gorge artifacts photographs`,
      assessment: `Essay structure rubric (introduction, logical body paragraphs, historical evidence, conclusion), timeline test`,
      references: t.r
    }));
  } else if (normSub.includes('civic') || normSub.includes('uraia')) {
    department = isSwahili ? 'Sayansi za Jamii na Maadili' : 'Social Sciences';
    defaultPeriods = 3;
    const civTopics = [
      { m: 'Our Nation and National Identity', s: 'Tanzanian National Symbols, Constitution and Currency', r: `TIE Civics Form ${classNumStr}` },
      { m: 'Promotion of Life Skills', s: 'Self-Awareness, Assertiveness, Decision Making and Empathy', r: `TIE Civics Form ${classNumStr}` },
      { m: 'Human Rights', s: 'Universal Declaration of Human Rights and Constitutional Rights', r: `TIE Civics Form ${classNumStr}` },
      { m: 'Responsible Citizenship', s: 'Acquisition of Citizenship, Rights and Civic Responsibilities', r: `TIE Civics Form ${classNumStr}` },
      { m: 'Work and Development', s: 'Types of Work, Dignity of Labour and Economic Growth', r: `TIE Civics Form ${classNumStr}` },
      { m: 'Family and Gender Relations', s: 'Family Roles, Gender Equity and Combating Gender-Based Violence', r: `TIE Civics Form ${classNumStr}` },
      { m: 'Government of Tanzania', s: 'Pillars of Government: Executive, Legislature, Judiciary and LGA', r: `TIE Civics Form ${classNumStr}` },
      { m: 'MIDTERM EVALUATION', s: 'Midterm Governance and Human Rights Assessment', r: `NECTA Civics Guidelines` },
      { m: 'Democracy and Elections', s: 'Democratic Principles, Multi-Party System and NEC/INEC Elections', r: `TIE Civics Form ${classNumStr}` },
      { m: 'Anti-Corruption and Good Governance', s: 'Role of PCCB (TAKUKURU), Ethics Secretariat and Rule of Law', r: `TIE Civics Form ${classNumStr}` },
      { m: 'REVISION & DRILLS', s: 'NECTA Past Papers and Current Affairs Analysis', r: `NECTA Civics Series` },
      { m: 'TERMINAL EXAMINATION', s: 'Summative Terminal Examination and Records', r: `Ministry of Education Standards` }
    ];
    weeklyTopics = civTopics.map(t => ({
      mainTopic: t.m,
      subTopic: t.s,
      cbcMain: `Promoting constitutionalism, civic engagement, democratic principles, and ethical leadership in Tanzanian society`,
      cbcSpec: `Critiquing ${t.s.toLowerCase()} and formulating practical civic action plans`,
      learning: `Learners stage mock parliament sessions, debate civic responsibilities, and analyze TAKUKURU public anti-corruption cases`,
      teaching: `Explain constitutional articles, guide case-study discussions on civil rights and civic responsibilities`,
      materials: `Constitution of Tanzania booklets, TAKUKURU flyers, democratic election ballot samples, human rights posters`,
      assessment: `Debate presentation rubric, essay on good governance and anti-corruption, classwork exercises`,
      references: t.r
    }));
  } else if (normSub.includes('comm') || normSub.includes('book') || normSub.includes('biashara') || normSub.includes('uhasibu')) {
    department = isSwahili ? 'Masomo ya Biashara' : 'Commercial Studies';
    defaultPeriods = 4;
    const commTopics = [
      { m: 'Scope of Commerce', s: 'Meaning, Importance, Branches and Aid to Trade', r: `TIE Commerce & Bookkeeping Form ${classNumStr}` },
      { m: 'Production', s: 'Direct and Indirect Production, Factors and Rewards', r: `TIE Commerce & Bookkeeping Form ${classNumStr}` },
      { m: 'Home Trade', s: 'Retail Trade, Types of Retailers and Modern Supermarkets', r: `TIE Commerce & Bookkeeping Form ${classNumStr}` },
      { m: 'Wholesale Trade', s: 'Functions of Wholesalers in Distribution Channels', r: `TIE Commerce & Bookkeeping Form ${classNumStr}` },
      { m: 'Commercial Documents', s: 'Invoices, Receipts, Delivery Notes, Credit/Debit Notes', r: `TIE Commerce & Bookkeeping Form ${classNumStr}` },
      { m: 'Double Entry Bookkeeping', s: 'Ledger Accounts, Rules of Debit and Credit', r: `TIE Commerce & Bookkeeping Form ${classNumStr}` },
      { m: 'The Trial Balance', s: 'Extracting Trial Balance and Locating Errors', r: `TIE Commerce & Bookkeeping Form ${classNumStr}` },
      { m: 'MIDTERM EVALUATION', s: 'Midterm Commercial Documents and Ledger Accounts Exam', r: `NECTA Commercial Guidelines` },
      { m: 'The Cash Book', s: 'Single and Double Column Cash Books with Bank Reconciliation', r: `TIE Commerce & Bookkeeping Form ${classNumStr}` },
      { m: 'Petty Cash and Imprest System', s: 'Petty Cash Book Preparation and Vouchers', r: `TIE Commerce & Bookkeeping Form ${classNumStr}` },
      { m: 'REVISION & DRILLS', s: 'NECTA Past Papers and Financial Ledger Practice', r: `NECTA Commercial Series` },
      { m: 'TERMINAL EXAMINATION', s: 'Summative Terminal Examination and Compilation', r: `Ministry of Education Standards` }
    ];
    weeklyTopics = commTopics.map(t => ({
      mainTopic: t.m,
      subTopic: t.s,
      cbcMain: `Applying commercial systems, accounting ledgers, and entrepreneurial financial management in Tanzanian enterprises`,
      cbcSpec: `Recording financial transactions and evaluating ${t.s.toLowerCase()} in business operations`,
      learning: `Learners enter business transactions into ledger accounts, balance off T-accounts, and extract trial balance`,
      teaching: `Demonstrate dual entry bookkeeping principle on chalkboard with clear debit/credit transaction analysis`,
      materials: `Commercial ledger paper, sample TRA tax invoices, receipts, calculators, cash books`,
      assessment: `Ledger balancing rubric, transaction entry accuracy test, marked homework assignments`,
      references: t.r
    }));
  } else {
    // Universal curriculum engine for any custom or primary subject
    department = isSwahili ? 'Masomo Teule' : 'General & Special Studies';
    defaultPeriods = 4;
    const genericTopics = [
      { m: `Foundations of ${subject}`, s: `Key Principles, Scope and Terminology` },
      { m: `Core Methodology in ${subject}`, s: `Standard Procedures and Empirical Tools` },
      { m: `Applied Concepts in ${subject}`, s: `Practical Investigation and Field Application` },
      { m: `Diagnostic Problem Solving`, s: `Case Studies and Critical Data Analysis` },
      { m: `Technological Integration`, s: `Modern Tools and Computational Media` },
      { m: `Ethical and Environmental Standards`, s: `Safety, Sustainability and Community Value` },
      { m: `Collaborative Project Sprint`, s: `Team Prototype and Investigation Design` },
      { m: `MIDTERM EVALUATION`, s: `Midterm Competence Assessment and Review` },
      { m: `Advanced In-depth Modules`, s: `Complex Problem Analysis and Synthesis` },
      { m: `Community Application Project`, s: `Exhibition and Local Impact Testing` },
      { m: `REVISION & NECTA DRILLS`, s: `Consolidation and Examination Techniques` },
      { m: `TERMINAL EXAMINATION`, s: `Summative Terminal Examination and Records` }
    ];
    weeklyTopics = genericTopics.map(t => ({
      mainTopic: t.m,
      subTopic: t.s,
      cbcMain: `Applying core competences in ${subject} to solve real-world problems in school and Tanzanian communities`,
      cbcSpec: `Investigating ${t.s.toLowerCase()} through collaborative inquiry and practical tasks`,
      learning: `Learners engage in collaborative group investigations on ${t.s.toLowerCase()}, solve tasks, and present findings`,
      teaching: `Facilitate inquiry stations, demonstrate core procedures, oversee student safety, and evaluate understanding`,
      materials: `Approved TIE textbooks, work cards, local instructional media, charts, evaluation rubrics`,
      assessment: `Practical task rubric, classwork verification, peer evaluation, homework exercises`,
      references: `TIE Approved Syllabus and Textbooks for ${subject} ${className}`
    }));
  }

  // If teacher specified custom topics, weave them into non-exam weeks
  if (customTopics && customTopics.length > 0) {
    weeklyTopics = weeklyTopics.map((wt, idx) => {
      const weekNum = idx + 1;
      if (weekNum === 8 || weekNum === 12) return wt;
      const customTopic = customTopics[idx % customTopics.length];
      if (!customTopic) return wt;
      return {
        ...wt,
        mainTopic: customTopic,
        subTopic: `${customTopic} — ${wt.subTopic}`,
        cbcMain: isSwahili
          ? `Kutumia umahiri wa ${customTopic} katika somo la ${subject} kutatua changamoto za kijamii`
          : `Applying competences in ${customTopic} (${subject}) to solve real-world problems`,
        cbcSpec: isSwahili
          ? `Kuchambua na kufanya vitendo kuhusu ${customTopic}`
          : `Analyzing and performing practical activities on ${customTopic}`
      };
    });
  }

  // Construct 12 weeks of structured items
  const weeks: SubjectSchemeWeek[] = weeklyTopics.slice(0, 12).map((t, idx) => {
    const weekNum = idx + 1;
    const isMidterm = weekNum === 8;
    const isTerminal = weekNum === 12;

    return {
      week: weekNum,
      dates: getTanzanianTermDates(weekNum, termKey, isSwahili ? 'Kiswahili' : 'English', academicTermDates),
      cbc: {
        mainCompetence: isMidterm
          ? (isSwahili ? `PIMHO LA KATIKATI YA MUHULA KATIKA SOMO LA ${subject.toUpperCase()}` : `MIDTERM COMPETENCE ASSESSMENT IN ${subject.toUpperCase()}`)
          : isTerminal
          ? (isSwahili ? `TATHMINI YA MWISHO WA MUHULA KATIKA SOMO LA ${subject.toUpperCase()}` : `TERMINAL COMPETENCE EVALUATION IN ${subject.toUpperCase()}`)
          : t.cbcMain,
        specificCompetence: isMidterm
          ? (isSwahili ? `Kupima umahiri wa wiki 1 hadi 7 katika somo la ${subject}` : `Evaluating Weeks 1 to 7 competences and problem solving in ${subject}`)
          : isTerminal
          ? (isSwahili ? `Kutathmini uelewa wa jumla wa muhula mzima katika somo la ${subject}` : `Summative evaluation of full term syllabus mastery in ${subject}`)
          : t.cbcSpec,
        learningActivities: isMidterm
          ? (isSwahili ? 'Kufanya mtihani wa katikati ya muhula na kutathmini maendeleo binafsi ya kitaaluma' : 'Sit standardized midterm examination and review personal learning portfolio milestones')
          : isTerminal
          ? (isSwahili ? 'Kufanya mtihani wa mwisho wa muhula, kuangalia masahihisho na kujiwekea malengo ya muhula unaofuata' : 'Sit terminal examination, review corrections, and record personal targets for the next term')
          : t.learning,
        teachingActivities: isMidterm
          ? (isSwahili ? 'Kusimamia mtihani wa katikati ya muhula, kusahihisha na kutoa mrejesho wa kina kwa wanafunzi' : 'Supervise standardized midterm examination, mark scripts, and provide constructive learner feedback')
          : isTerminal
          ? (isSwahili ? 'Kusimamia mtihani wa mwisho wa muhula, kusahihisha na kuingiza alama kwenye daftari la matokeo' : 'Invigilate terminal examination, mark papers, and enter student records into the academic ledger')
          : t.teaching,
        materials: isMidterm || isTerminal
          ? (isSwahili ? 'Karatasi za mitihani, vitabu vya majibu, mwongozo wa usahihishaji' : 'Official examination papers, answer sheets, marking guides')
          : t.materials,
        assessment: isMidterm
          ? (isSwahili ? 'Mtihani wa Katikati ya Muhula (Nadharia 60% + Vitendo 40%)' : 'Midterm Examination (Theory 60% + Practical/Task 40%)')
          : isTerminal
          ? (isSwahili ? 'Mtihani wa Mwisho wa Muhula (Muundo Rasmi wa NECTA, Alama 100)' : 'Terminal Examination (Official NECTA Format, 100 Marks)')
          : t.assessment,
        references: t.references,
      },
      old: {
        mainTopic: t.mainTopic,
        subTopic: t.subTopic,
        specificObjectives: t.cbcSpec,
        teachingActivities: t.teaching,
        materials: t.materials,
        assessment: t.assessment,
        references: t.references,
      }
    };
  });

  return {
    subject,
    department,
    defaultPeriodsPerWeek: defaultPeriods,
    weeks
  };
}

// -------------------------------------------------------------------------------------------------
// EXPORTED MAIN GENERATION FUNCTION
// -------------------------------------------------------------------------------------------------

export const generateAutoSchemeOfWork = (
  subject: string,
  className: string,
  stream: string,
  curriculumType: CurriculumType,
  academicYear: string,
  term: 'Term 1' | 'Term 2' | 'Full Year',
  teacherName: string,
  schoolId = 'DEMO_SCHOOL',
  periodsPerWeek = 5,
  language: 'Kiswahili' | 'English' = 'English',
  academicTermDates?: AcademicTermDates,
  customTopics?: string[]
): SchemeOfWork => {
  const isSwahili = language === 'Kiswahili' || String(subject).toLowerCase().includes('kiswahili');

  if (term === 'Full Year') {
    const t1Topics = customTopics && customTopics.length > 0 ? customTopics.slice(0, Math.ceil(customTopics.length / 2)) : undefined;
    const t2Topics = customTopics && customTopics.length > 1 ? customTopics.slice(Math.ceil(customTopics.length / 2)) : customTopics;

    const t1 = generateAutoSchemeOfWork(subject, className, stream, curriculumType, academicYear, 'Term 1', teacherName, schoolId, periodsPerWeek, language, academicTermDates, t1Topics);
    const t2 = generateAutoSchemeOfWork(subject, className, stream, curriculumType, academicYear, 'Term 2', teacherName, schoolId, periodsPerWeek, language, academicTermDates, t2Topics);

    const t2Items = t2.items.map(item => ({
      ...item,
      id: `${item.id}_full`,
      weekNumber: item.weekNumber + t1.items.length,
      datesOrMonth: item.datesOrMonth
        .replace(/Wiki ya (\d+)/i, (_, n) => `Wiki ya ${Number(n) + t1.items.length}`)
        .replace(/Week (\d+)/i, (_, n) => `Week ${Number(n) + t1.items.length}`)
    }));

    const t2Logs = t2.logBookEntries.map(log => ({
      ...log,
      id: `${log.id}_full`,
      schemeItemId: `${log.schemeItemId}_full`
    }));

    return {
      ...t1,
      id: `scheme_full_${Date.now()}`,
      term: 'Full Year',
      periodsPerWeek,
      totalWeeks: t1.items.length + t2.items.length,
      items: [...t1.items, ...t2Items],
      logBookEntries: [...t1.logBookEntries, ...t2Logs]
    };
  }

  // Resolve template using exact subject, exact class level, exact term, and configured AcademicTermDates
  const template = getSubjectSchemeTemplate(
    subject,
    className,
    term,
    curriculumType,
    isSwahili ? 'Kiswahili' : 'English',
    academicTermDates,
    customTopics
  );

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
        remarks: isSwahili ? 'Imefundishwa kama ilivyopangwa; umahiri umefikiwa' : 'Covered as scheduled; competencies observed'
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
        remarks: isSwahili ? 'Kipindi kimefundishwa vizuri; madokezo yametolewa' : 'Lesson taught successfully; notes given'
      };
    }
  });

  // Generate authentic Teaching Log Book entries for each week
  const logBookEntries: TeachingLogBookEntry[] = items.map((item, idx) => ({
    id: `log_entry_${item.weekNumber}_${Date.now() + idx}`,
    schemeItemId: item.id,
    date: `2026-0${Math.min(1 + Math.floor(idx / 4), 4)}-${String(12 + (idx % 4) * 7).padStart(2, '0')}`,
    className,
    stream: stream || 'Stream A',
    periodTime: isSwahili ? 'Kipindi cha 2 & 3 (08:40 - 10:00)' : 'Period 2 & 3 (08:40 - 10:00)',
    subTopicTaught: item.subTopicOrSpecificCompetence,
    workCoveredSummary: isSwahili
      ? `Kipindi cha nadharia na vitendo kuhusu ${item.subTopicOrSpecificCompetence} kimekamilika. Wanafunzi wameshiriki kikamilifu katika majadiliano na mazoezi ya upimaji.`
      : `Delivered practical & theoretical session on ${item.subTopicOrSpecificCompetence}. Covered learning activities and assessment exercises.`,
    studentsPresent: 43,
    studentsTotal: 45,
    comprehensionEvaluation: idx % 3 === 0 ? 'EXCELLENT' : 'GOOD',
    remedialOrUncoveredReason: idx % 4 === 0
      ? (isSwahili ? `Marudio mafupi ya uimarishaji yametolewa kwa wanafunzi waliohitaji ufafanuzi zaidi katika somo la ${subject}.` : `Brief recap provided for students needing extra practice on ${subject}.`)
      : undefined,
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
      ? (isSwahili
          ? `Inajenga umahiri wa karne ya 21 katika somo la ${subject}, uchunguzi wa vitendo, fikra tunduizi, na utatuzi wa matatizo ya kijamii kulingana na miongozo ya TET na NECTA 2023/2024.`
          : `Focuses on 21st-century competence development in ${subject}, practical hands-on investigations, critical thinking, and socio-economic problem solving aligned with TIE and NECTA standards.`)
      : (isSwahili
          ? `Inalenga uelewa thabiti wa muhtasari wa ${subject}, uwazi wa maana za dhana, uundaji wa kanuni, na mazoezi ya ubaoni kulingana na mtaala wa NECTA.`
          : `Focuses on structured syllabus mastery in ${subject}, definition clarity, systematic formula/concept derivation, and chalkboard exercise verification.`),
    items,
    logBookEntries,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
};

export const TANZANIA_SCHEMES_KNOWLEDGE_BASE: Record<string, SubjectSchemeTemplate> = {};
