import { Student, StreamSetting, EducationLevel } from '../types';
import { 
  ALL_SCHOOL_CLASSES, 
  NURSERY_CLASSES, 
  PRIMARY_CLASSES, 
  SECONDARY_CLASSES 
} from '../constants/defaults';

/**
 * Normalizes class name string (trims and standardizes case)
 */
export const normalizeClassName = (name: string): string => {
  if (!name) return 'Form 1';
  const trimmed = name.trim();
  // Standardize Form names
  if (/^form\s*(\d+)$/i.test(trimmed)) {
    const num = trimmed.match(/^form\s*(\d+)$/i)![1];
    return `Form ${num}`;
  }
  // Standardize Standard / Std names
  if (/^(std|standard)\s*(\d+)$/i.test(trimmed)) {
    const num = trimmed.match(/^(std|standard)\s*(\d+)$/i)![2];
    return `Standard ${num}`;
  }
  return trimmed;
};

/**
 * Normalizes stream name string (trims and converts to uppercase e.g. "STREAM A")
 */
export const normalizeStreamName = (name: string): string => {
  if (!name) return 'STREAM A';
  const trimmed = name.trim();
  if (/^stream\s*([a-z0-9])$/i.test(trimmed)) {
    const char = trimmed.match(/^stream\s*([a-z0-9])$/i)![1].toUpperCase();
    return `STREAM ${char}`;
  }
  return trimmed.toUpperCase();
};

/**
 * Returns complete list of all registered and available classes in the school
 */
export const getAvailableSchoolClasses = (
  students: Student[] = [],
  streamSettings: StreamSetting[] = []
): string[] => {
  const classSet = new Set<string>();

  // 1. Stream settings configured classes (User's active setting)
  if (Array.isArray(streamSettings) && streamSettings.length > 0) {
    streamSettings.forEach(s => {
      if (s.className && s.className.trim()) {
        classSet.add(normalizeClassName(s.className));
      }
    });
  }

  // 2. Registered students classes
  if (Array.isArray(students) && students.length > 0) {
    students.forEach(st => {
      if (st.className && st.className.trim()) {
        classSet.add(normalizeClassName(st.className));
      }
    });
  }

  // Sort logically: Nursery -> Primary -> Secondary O-Level -> Secondary A-Level -> Other
  const standardOrder = [
    'Baby Class', 'Nursery', 'Pre-Unit',
    'Standard 1', 'Standard 2', 'Standard 3', 'Standard 4', 'Standard 5', 'Standard 6', 'Standard 7',
    'Form 1', 'Form 2', 'Form 3', 'Form 4', 'Form 5', 'Form 6'
  ];

  return Array.from(classSet).sort((a, b) => {
    const idxA = standardOrder.indexOf(a);
    const idxB = standardOrder.indexOf(b);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.localeCompare(b);
  });
};

/**
 * Returns complete list of all registered streams for a given class or overall
 */
export const getAvailableSchoolStreams = (
  students: Student[] = [],
  streamSettings: StreamSetting[] = [],
  targetClass?: string
): string[] => {
  const streamSet = new Set<string>();

  // From streamSettings
  if (Array.isArray(streamSettings)) {
    streamSettings.forEach(s => {
      if (!targetClass || targetClass === 'All' || targetClass === 'ALL' || normalizeClassName(s.className) === normalizeClassName(targetClass)) {
        if (Array.isArray(s.streams)) {
          s.streams.forEach(st => {
            if (st && st.trim()) streamSet.add(normalizeStreamName(st));
          });
        }
      }
    });
  }

  // From registered students
  if (Array.isArray(students)) {
    students.forEach(st => {
      if (!targetClass || targetClass === 'All' || targetClass === 'ALL' || normalizeClassName(st.className) === normalizeClassName(targetClass)) {
        if (st.stream && st.stream.trim()) {
          streamSet.add(normalizeStreamName(st.stream));
        }
      }
    });
  }

  return Array.from(streamSet).sort();
};

/**
 * Returns all active "Class - Stream" pairs for teacher subject allocations, timetables, and period trackers
 */
export const getTeachingStreamAllocationsList = (
  students: Student[] = [],
  streamSettings: StreamSetting[] = []
): string[] => {
  const classes = getAvailableSchoolClasses(students, streamSettings);
  const result: string[] = [];

  classes.forEach(c => {
    const streams = getAvailableSchoolStreams(students, streamSettings, c);
    streams.forEach(s => {
      result.push(`${c} - ${s}`);
    });
  });

  return result;
};

/**
 * Infers education level from class name
 */
export const inferEducationLevel = (className: string): EducationLevel => {
  const normalized = normalizeClassName(className);
  if (NURSERY_CLASSES.includes(normalized) || normalized.toLowerCase().includes('nursery') || normalized.toLowerCase().includes('baby')) {
    return 'PRE_PRIMARY';
  }
  if (PRIMARY_CLASSES.includes(normalized) || normalized.toLowerCase().includes('standard') || normalized.toLowerCase().includes('std')) {
    return 'PRIMARY';
  }
  if (['Form 5', 'Form 6'].includes(normalized)) {
    return 'ACSEE';
  }
  return 'CSEE';
};
