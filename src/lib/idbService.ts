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

