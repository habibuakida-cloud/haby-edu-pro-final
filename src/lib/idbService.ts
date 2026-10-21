import { openDB, IDBPDatabase } from 'idb';

const DB_NAME = 'HabyEduDB';
const DB_VERSION = 1;
const STORE_NAME = 'schoolData';

let dbPromise: Promise<IDBPDatabase<unknown> | null> | null = null;

const getDB = async () => {
  if (typeof window === 'undefined' || typeof indexedDB === 'undefined' || !window.indexedDB) {
    return null;
  }
  if (!dbPromise) {
    try {
      dbPromise = openDB(DB_NAME, DB_VERSION, {
        upgrade(db) {
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME);
          }
        },
      }).catch(err => {
        console.warn('IndexedDB unavailable or blocked:', err);
        return null;
      });
    } catch (err) {
      console.warn('IndexedDB open error:', err);
      return null;
    }
  }
  return dbPromise;
};

export const setCachedData = async (key: string, val: any) => {
  try {
    const db = await getDB();
    if (!db) return;
    if (typeof window !== 'undefined' && key !== '__health_ping__') {
      try {
        localStorage.setItem('haby_idb_last_sync', new Date().toISOString());
      } catch (e) {}
    }
    return await db.put(STORE_NAME, val, key);
  } catch (err) {
    console.warn('IndexedDB set error:', err);
  }
};

export const getCachedData = async (key: string) => {
  try {
    const db = await getDB();
    if (!db) return null;
    return await db.get(STORE_NAME, key);
  } catch (err) {
    console.warn('IndexedDB get error:', err);
    return null;
  }
};

export const deleteCachedData = async (key: string) => {
  try {
    const db = await getDB();
    if (!db) return;
    return await db.delete(STORE_NAME, key);
  } catch (err) {
    console.warn('IndexedDB delete error:', err);
  }
};

export const clearAllCachedData = async () => {
  try {
    const db = await getDB();
    if (db) {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      await tx.objectStore(STORE_NAME).clear();
      await tx.done;
    }
    // Also clean localStorage cache keys starting with haby_
    if (typeof window !== 'undefined' && window.localStorage) {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k.startsWith('haby_') || k.startsWith('school_data_') || k.includes('cached'))) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
    }
  } catch (err) {
    console.warn('IndexedDB clearAll error:', err);
  }
};

export const measureIDBLatency = async (): Promise<{ latencyMs: number; ok: boolean }> => {
  const start = performance.now();
  try {
    const testKey = '__health_ping__';
    await setCachedData(testKey, { ping: Date.now() });
    await getCachedData(testKey);
    await deleteCachedData(testKey);
    const end = performance.now();
    return { latencyMs: Math.round(end - start), ok: true };
  } catch (err) {
    return { latencyMs: -1, ok: false };
  }
};

export interface IDBDetails {
  connected: boolean;
  dbName: string;
  storeName: string;
  latencyMs: number;
  lastSync: string | null;
  storageEstimate?: { usage: number; quota: number };
  totalKeys: number;
  counts: {
    students: number;
    teachers: number;
    classes: number;
    subjects: number;
    exams: number;
    timetableAssignments: number;
    parents: number;
    periodSettings: number;
    streamSettings: number;
    activityLogs: number;
  };
}

export const getIdbStats = async (): Promise<IDBDetails> => {
  const ping = await measureIDBLatency();
  let storageEstimate: { usage: number; quota: number } | undefined;
  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
    try {
      const est = await navigator.storage.estimate();
      storageEstimate = {
        usage: est.usage || 0,
        quota: est.quota || 0,
      };
    } catch (e) {}
  }

  const lastSync = typeof window !== 'undefined' ? localStorage.getItem('haby_idb_last_sync') : null;

  try {
    const db = await getDB();
    if (!db) {
      return {
        connected: false,
        dbName: DB_NAME,
        storeName: STORE_NAME,
        latencyMs: ping.latencyMs,
        lastSync,
        storageEstimate,
        totalKeys: 0,
        counts: {
          students: 0, teachers: 0, classes: 0, subjects: 0, exams: 0,
          timetableAssignments: 0, parents: 0, periodSettings: 0, streamSettings: 0, activityLogs: 0
        }
      };
    }

    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const allKeys = await store.getAllKeys();
    
    // Look for school data snapshot
    let schoolSnapshot: any = null;
    for (const key of allKeys) {
      if (String(key).includes('haby_school_data') || String(key).includes('02dff10d')) {
        schoolSnapshot = await store.get(key);
        break;
      }
    }
    if (!schoolSnapshot && allKeys.length > 0) {
      schoolSnapshot = await store.get(allKeys[0]);
    }

    // Also fallback to localStorage snapshot if idb snapshot is being populated
    if (!schoolSnapshot && typeof window !== 'undefined') {
      try {
        const snapRaw = localStorage.getItem('haby_school_data_snapshot_02dff10d-78fb-4af6-ab5a-db1d275d7e06');
        if (snapRaw) schoolSnapshot = JSON.parse(snapRaw);
      } catch (e) {}
    }

    const counts = {
      students: Array.isArray(schoolSnapshot?.students) ? schoolSnapshot.students.length : 0,
      teachers: Array.isArray(schoolSnapshot?.teachers) ? schoolSnapshot.teachers.length : 0,
      classes: Array.isArray(schoolSnapshot?.classes) 
        ? schoolSnapshot.classes.length 
        : (Array.isArray(schoolSnapshot?.streamSettings) ? new Set(schoolSnapshot.streamSettings.map((s: any) => s.className)).size : 0),
      subjects: Array.isArray(schoolSnapshot?.subjects) ? schoolSnapshot.subjects.length : 0,
      exams: Array.isArray(schoolSnapshot?.exams) ? schoolSnapshot.exams.length : 0,
      timetableAssignments: Array.isArray(schoolSnapshot?.timetableAssignments) ? schoolSnapshot.timetableAssignments.length : 0,
      parents: Array.isArray(schoolSnapshot?.parents) ? schoolSnapshot.parents.length : 0,
      periodSettings: Array.isArray(schoolSnapshot?.periodSettings) ? schoolSnapshot.periodSettings.length : 0,
      streamSettings: Array.isArray(schoolSnapshot?.streamSettings) ? schoolSnapshot.streamSettings.length : 0,
      activityLogs: Array.isArray(schoolSnapshot?.activityLogs) ? schoolSnapshot.activityLogs.length : 0,
    };

    return {
      connected: ping.ok,
      dbName: DB_NAME,
      storeName: STORE_NAME,
      latencyMs: ping.latencyMs,
      lastSync,
      storageEstimate,
      totalKeys: allKeys.length,
      counts
    };
  } catch (err) {
    return {
      connected: false,
      dbName: DB_NAME,
      storeName: STORE_NAME,
      latencyMs: -1,
      lastSync,
      storageEstimate,
      totalKeys: 0,
      counts: {
        students: 0, teachers: 0, classes: 0, subjects: 0, exams: 0,
        timetableAssignments: 0, parents: 0, periodSettings: 0, streamSettings: 0, activityLogs: 0
      }
    };
  }
};


