export type ElectionStatus = 
  | 'DRAFT' 
  | 'NOMINATION_OPEN' 
  | 'VOTING_OPEN' 
  | 'CLOSED' 
  | 'RESULTS_PUBLISHED'
  | 'Draft' 
  | 'Nomination Open' 
  | 'Voting Open' 
  | 'Closed' 
  | 'Results Published';

export type GenderRule = 'ALL' | 'BOYS_ONLY' | 'GIRLS_ONLY';

export type ClassRule = 'ALL' | 'FORM_3_4' | 'FORM_1_2' | 'FORM_5_6' | string;

export type CandidateStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'pending' | 'approved' | 'rejected';

export interface ElectionEvent {
  id: string;
  schoolId: string;
  title: string;
  academicYear: string;
  nominationStart: string; // ISO string
  nominationEnd: string;
  votingStart: string;
  votingEnd: string;
  status: ElectionStatus;
  createdByDisciplineHead?: string;
  resultsPublishedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ElectionPosition {
  id: string;
  electionId: string;
  title: string;
  description?: string;
  genderRule: GenderRule;
  classRule: ClassRule;
  orderNumber: number;
  isCustom: boolean;
  photoRequired: boolean;
  manifestoRequired: boolean;
  createdAt?: string;
}

export interface ElectionCandidate {
  id: string;
  electionId: string;
  positionId: string;
  studentId: string; // regNo or student UUID
  studentName: string;
  studentClass: string;
  className?: string; // alias
  studentReg?: string; // alias
  studentGender: 'Male' | 'Female';
  manifestoText?: string;
  manifestoVideoUrl?: string;
  photoUrl?: string;
  status: CandidateStatus;
  rejectionReason?: string;
  reviewedBy?: string;
  votesCount: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ElectionPositionResult {
  position: ElectionPosition;
  candidates: ElectionCandidate[];
  totalVotes: number;
  winner: ElectionCandidate | null;
  isTie: boolean;
}

export interface ElectionSummary {
  totalVoters: number;
  totalVotesCast: number;
  turnoutPercentage: number;
  positionsCount: number;
  candidatesCount: number;
  status: ElectionStatus;
}

export interface StudentVoterSession {
  studentId: string;
  studentReg: string;
  studentName: string;
  className: string;
  gender: 'Male' | 'Female';
}

export interface ElectionVote {
  id: string;
  electionId: string;
  voterStudentId: string;
  positionId: string;
  candidateId: string;
  votedAt: string;
  ipAddress?: string;
  deviceId?: string;
  verificationMethod: 'PIN' | 'FINGERPRINT' | 'PORTAL_AUTH';
}

export interface CandidateResult {
  candidateId: string;
  candidateName: string;
  candidateClass: string;
  candidateGender: string;
  photoUrl?: string;
  votesCount: number;
  percentage: number;
  isWinner: boolean;
}

export interface PositionResult {
  positionId: string;
  positionTitle: string;
  genderRule: GenderRule;
  classRule: ClassRule;
  totalVotes: number;
  winner?: CandidateResult | null;
  candidates: CandidateResult[];
}

export interface ElectionResultsSummary {
  election: ElectionEvent;
  totalVoters: number;
  totalVotesCast: number;
  turnoutPercentage: number;
  positions: PositionResult[];
  winners: {
    positionTitle: string;
    candidate: CandidateResult;
  }[];
}

// 15 Default Tanzanian Secondary School Student Government Positions
export const DEFAULT_ELECTION_POSITIONS: Array<Omit<ElectionPosition, 'id' | 'electionId' | 'createdAt'>> = [
  {
    title: 'Rais wa Serikali ya Wanafunzi (Head Prefect / President)',
    description: 'Kiongozi Mkuu wa Serikali ya Wanafunzi, mwakilishi mkuu mbele ya Uongozi wa Shule na Bodi.',
    genderRule: 'ALL',
    classRule: 'FORM_3_4',
    orderNumber: 1,
    isCustom: false,
    photoRequired: true,
    manifestoRequired: true
  },
  {
    title: 'Makamu wa Rais (Deputy Head Prefect / Vice President)',
    description: 'Msaidizi Mkuu wa Rais na mratibu wa shughuli za Mawaziri na Viranja wote.',
    genderRule: 'ALL',
    classRule: 'FORM_3_4',
    orderNumber: 2,
    isCustom: false,
    photoRequired: true,
    manifestoRequired: true
  },
  {
    title: 'Waziri Mkuu (Prime Minister)',
    description: 'Kiongozi wa shughuli za kila siku za Baraza la Mawaziri wa wanafunzi.',
    genderRule: 'ALL',
    classRule: 'FORM_3_4',
    orderNumber: 3,
    isCustom: false,
    photoRequired: true,
    manifestoRequired: true
  },
  {
    title: 'Spika wa Bunge la Wanafunzi (Speaker)',
    description: 'Msimamizi wa mikutano ya Bunge la Wanafunzi, sheria ndogo na mijadala ya maazimio.',
    genderRule: 'ALL',
    classRule: 'ALL',
    orderNumber: 4,
    isCustom: false,
    photoRequired: true,
    manifestoRequired: true
  },
  {
    title: 'Waziri wa Elimu (Academic Minister)',
    description: 'Kusimamia masomo ya jioni (prep), klabu za kitaaluma, mijadala na kusaidia idara ya taaluma.',
    genderRule: 'ALL',
    classRule: 'ALL',
    orderNumber: 5,
    isCustom: false,
    photoRequired: true,
    manifestoRequired: true
  },
  {
    title: 'Waziri wa Nidhamu na Maadili (Discipline Minister)',
    description: 'Kushirikiana na Mkuu wa Nidhamu kusimamia utulivu, sare za shule, heshima na kuzuia utoro.',
    genderRule: 'ALL',
    classRule: 'ALL',
    orderNumber: 6,
    isCustom: false,
    photoRequired: true,
    manifestoRequired: true
  },
  {
    title: 'Waziri wa Michezo na Burudani (Sports & Entertainment Minister)',
    description: 'Kuratibu mashindano ya michezo (UMISSETA), sanaa, ngoma na burudani za shule.',
    genderRule: 'ALL',
    classRule: 'ALL',
    orderNumber: 7,
    isCustom: false,
    photoRequired: true,
    manifestoRequired: true
  },
  {
    title: 'Waziri wa Afya na Mazingira (Health & Environment Minister)',
    description: 'Kusimamia usafi wa mazingira ya shule, zahanati ya kwanza (First Aid) na bustani.',
    genderRule: 'ALL',
    classRule: 'ALL',
    orderNumber: 8,
    isCustom: false,
    photoRequired: true,
    manifestoRequired: true
  },
  {
    title: 'Waziri wa Habari na Mawasiliano (Information Minister)',
    description: 'Kutoa matangazo ya shule, ubao wa matangazo (Notice Board) na uandishi wa habari za shule.',
    genderRule: 'ALL',
    classRule: 'ALL',
    orderNumber: 9,
    isCustom: false,
    photoRequired: true,
    manifestoRequired: true
  },
  {
    title: 'Katibu Mkuu (Secretary General)',
    description: 'Mwandishi na mtunzaji wa kumbukumbu zote za mikutano ya serikali ya wanafunzi.',
    genderRule: 'ALL',
    classRule: 'ALL',
    orderNumber: 10,
    isCustom: false,
    photoRequired: true,
    manifestoRequired: true
  },
  {
    title: 'Mweka Hazina (Treasurer / Finance Minister)',
    description: 'Kusimamia michango ya wanafunzi, mfuko wa dharura wa wanafunzi na kumbukumbu za fedha.',
    genderRule: 'ALL',
    classRule: 'ALL',
    orderNumber: 11,
    isCustom: false,
    photoRequired: true,
    manifestoRequired: true
  },
  {
    title: 'Kiongozi wa Bweni - Wavulana (Boys Dorm Captain)',
    description: 'Kusimamia nidhamu, ukaguzi wa vitanda na utulivu katika mabweni ya wavulana.',
    genderRule: 'BOYS_ONLY',
    classRule: 'ALL',
    orderNumber: 12,
    isCustom: false,
    photoRequired: true,
    manifestoRequired: true
  },
  {
    title: 'Kiongozi wa Bweni - Wasichana (Girls Dorm Captain)',
    description: 'Kusimamia nidhamu, ukaguzi wa vitanda na ustawi wa wanafunzi katika mabweni ya wasichana.',
    genderRule: 'GIRLS_ONLY',
    classRule: 'ALL',
    orderNumber: 13,
    isCustom: false,
    photoRequired: true,
    manifestoRequired: true
  },
  {
    title: 'Kiongozi wa Chakula (Food / Dining Captain)',
    description: 'Kusimamia utaratibu wa chakula bwalo, foleni za dining hall na usafi wa vyombo.',
    genderRule: 'ALL',
    classRule: 'ALL',
    orderNumber: 14,
    isCustom: false,
    photoRequired: true,
    manifestoRequired: true
  },
  {
    title: 'Kiongozi wa Usafi (Cleanliness Captain)',
    description: 'Kugawanya maeneo ya usafi (plots), usafi wa vyoo, madarasa na ukaguzi wa kila asubuhi.',
    genderRule: 'ALL',
    classRule: 'ALL',
    orderNumber: 15,
    isCustom: false,
    photoRequired: true,
    manifestoRequired: true
  }
];
