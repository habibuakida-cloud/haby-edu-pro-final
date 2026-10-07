import { EducationLevel, StreamSetting, Student } from '../types';
import { 
  NURSERY_CLASSES, 
  PRIMARY_CLASSES, 
  SECONDARY_CLASSES,
  INITIAL_STREAM_SETTINGS 
} from '../constants/defaults';

/**
 * Infer the standard Tanzanian education level from a class name.
 */
export const inferEducationLevel = (className: string): EducationLevel => {
  if (!className) return 'CSEE';
  const lower = className.toLowerCase().trim();

  // Nursery / Pre-primary
  if (
    NURSERY_CLASSES.some(c => c.toLowerCase() === lower) ||
    lower.includes('baby') || 
    lower.includes('nursery') || 
    lower.includes('pre-unit') || 
    lower.includes('awali') ||
    lower.includes('middle class') ||
    lower.includes('kg') ||
    lower.includes('kindergarten')
  ) {
    return 'PRE_PRIMARY';
  }

  // Primary
  if (
    PRIMARY_CLASSES.some(c => c.toLowerCase() === lower) ||
    lower.startsWith('std') || 
    lower.startsWith('standard') || 
    lower.startsWith('darasa') || 
    lower.startsWith('grade') ||
    lower.startsWith('class') ||
    lower.startsWith('pr')
  ) {
    return 'PRIMARY';
  }

  // High school / Advanced level
  if (
    lower.includes('form 5') || 
    lower.includes('form 6') || 
    lower.includes('form v') || 
    lower.includes('form vi') ||
    lower.includes('a-level') ||
    lower.includes('advanced')
  ) {
    return 'ACSEE';
  }

  // Secondary O-Level default
  return 'CSEE';
};

/**
 * Get the next logical class for academic student promotion.
 */
export const getNextLogicalClass = (className: string): string => {
  const map: Record<string, string> = {
    'Baby Class': 'Middle Class',
    'Middle Class': 'Pre-Unit',
    'Pre-Unit': 'Std 1',
    'Std 1': 'Std 2',
    'Std 2': 'Std 3',
    'Std 3': 'Std 4',
    'Std 4': 'Std 5',
    'Std 5': 'Std 6',
    'Std 6': 'Std 7',
    'Std 7': 'Form 1',
    'Form 1': 'Form 2',
    'Form 2': 'Form 3',
    'Form 3': 'Form 4',
    'Form 4': 'Form 5',
    'Form 5': 'Form 6',
    'Form 6': 'Graduated Alumni'
  };

  return map[className] || `${className} (Advanced)`;
};

/**
 * Get all available classes merged from streamSettings, default standard classes, and registered students.
 */
export const getAllAvailableClasses = (
  streamSettings?: StreamSetting[],
  students?: Student[]
): string[] => {
  const classOrderMap = new Map<string, number>();
  
  // Standard Tanzanian Curriculum Order
  const defaultOrderedList = [
    ...NURSERY_CLASSES,
    ...PRIMARY_CLASSES,
    ...SECONDARY_CLASSES
  ];

  defaultOrderedList.forEach((c, index) => {
    classOrderMap.set(c, index);
  });

  const uniqueClasses = new Set<string>();

  // 1. Add all from streamSettings
  if (streamSettings && streamSettings.length > 0) {
    streamSettings.forEach(s => {
      if (s.className && s.className.trim()) {
        uniqueClasses.add(s.className.trim());
      }
    });
  } else {
    defaultOrderedList.forEach(c => uniqueClasses.add(c));
  }

  // 2. Add any classes from students
  if (students && students.length > 0) {
    students.forEach(st => {
      if (st.className && st.className.trim()) {
        uniqueClasses.add(st.className.trim());
      }
    });
  }

  // 3. Ensure baseline classes are present
  defaultOrderedList.forEach(c => uniqueClasses.add(c));

  // Sort logically according to curriculum progression
  return Array.from(uniqueClasses).sort((a, b) => {
    const orderA = classOrderMap.has(a) ? classOrderMap.get(a)! : 999;
    const orderB = classOrderMap.has(b) ? classOrderMap.get(b)! : 999;
    if (orderA !== orderB) return orderA - orderB;
    return a.localeCompare(b, undefined, { numeric: true });
  });
};

/**
 * Normalizes a stream name string into standard uppercase canonical format.
 * Examples: 'a' -> 'STREAM A', 'stream b' -> 'STREAM B', '3' -> 'STREAM 3', 'PCM' -> 'PCM'
 */
export const normalizeStreamName = (input: string): string => {
  if (!input || !input.trim()) return 'STREAM A';
  const clean = input.trim().toUpperCase();
  if (clean.startsWith('STREAM ')) return clean;
  if (/^[A-Z]$/.test(clean)) return `STREAM ${clean}`;
  if (/^\d+$/.test(clean)) return `STREAM ${clean}`;
  return clean;
};

/**
 * Predicts and generates the next logical stream name for a given list of streams.
 * Example: ['STREAM A', 'STREAM B'] -> 'STREAM C'
 * Example: ['STREAM A', 'STREAM B', 'STREAM C'] -> 'STREAM D'
 */
export const getNextLogicalStream = (existingStreams: string[] = []): string => {
  if (!existingStreams || existingStreams.length === 0) return 'STREAM A';

  const normalized = existingStreams.map(normalizeStreamName);
  const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];

  for (const letter of letters) {
    const candidate = `STREAM ${letter}`;
    if (!normalized.some(s => s === candidate)) {
      return candidate;
    }
  }

  return `STREAM ${normalized.length + 1}`;
};

/**
 * Get all registered streams for a specific class.
 */
export const getStreamsForClass = (
  className: string,
  streamSettings?: StreamSetting[],
  students?: Student[]
): string[] => {
  const streamsSet = new Set<string>();

  // Check streamSettings first
  if (streamSettings && streamSettings.length > 0) {
    const found = streamSettings.find(
      s => s.className.toLowerCase().trim() === className.toLowerCase().trim()
    );
    if (found && Array.isArray(found.streams)) {
      found.streams.forEach(st => {
        if (st && st.trim()) streamsSet.add(normalizeStreamName(st));
      });
    }
  }

  // Check students in that class
  if (students && students.length > 0) {
    students.forEach(st => {
      if (st.className && st.className.toLowerCase().trim() === className.toLowerCase().trim()) {
        if (st.stream && st.stream.trim()) {
          streamsSet.add(normalizeStreamName(st.stream));
        }
        if (st.combination && st.combination.trim()) {
          streamsSet.add(normalizeStreamName(st.combination));
        }
      }
    });
  }

  // Default fallback if empty
  if (streamsSet.size === 0) {
    if (['Form 5', 'Form 6'].includes(className)) {
      return ['PCM', 'PCB', 'CBG', 'HGE', 'HKL', 'EGM'];
    }
    return ['STREAM A', 'STREAM B'];
  }

  return Array.from(streamsSet).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
};

/**
 * Automatically ensure a registered class and stream exist in StreamSetting[] and returns updated array if changed.
 */
export const syncClassAndStreamToSettings = (
  className: string,
  streamName: string | undefined,
  currentSettings: StreamSetting[] = []
): { updatedSettings: StreamSetting[]; wasChanged: boolean } => {
  if (!className || !className.trim()) {
    return { updatedSettings: currentSettings, wasChanged: false };
  }

  const cleanClass = className.trim();
  const cleanStream = (streamName || 'STREAM A').trim();
  const existing = [...(currentSettings.length > 0 ? currentSettings : INITIAL_STREAM_SETTINGS)];
  
  const classIndex = existing.findIndex(
    s => s.className.toLowerCase().trim() === cleanClass.toLowerCase()
  );

  let wasChanged = false;

  if (classIndex === -1) {
    // Add new class entry
    const newLevel = inferEducationLevel(cleanClass);
    existing.push({
      id: Date.now() + Math.floor(Math.random() * 1000),
      className: cleanClass,
      level: newLevel,
      streams: [cleanStream]
    });
    wasChanged = true;
  } else {
    const classSetting = existing[classIndex];
    const streamExists = classSetting.streams.some(
      st => st.toLowerCase().trim() === cleanStream.toLowerCase()
    );
    if (!streamExists) {
      existing[classIndex] = {
        ...classSetting,
        streams: [...classSetting.streams, cleanStream]
      };
      wasChanged = true;
    }
  }

  return { updatedSettings: existing, wasChanged };
};
