import { openDB, IDBPDatabase } from 'idb';

export interface FailedVerificationLog {
  id?: number;
  teacherId: string;
  teacherName: string;
  method: string;
  reason: string;
  timestamp: string;
  schoolId: string;
  monitorId: string;
  className: string;
  subject: string;
  action: 'in' | 'out';
  deviceId: string;
  mainTopic?: string;
  subTopic?: string;
  presentCount?: number;
  absentCount?: number;
  sickCount?: number;
  permittedCount?: number;
  periodName?: string;
  term?: string;
  academicWeek?: number;
  synced: boolean;
}

const DB_NAME = 'haby_offline_db';
const STORE_NAME = 'verification_logs';

let dbPromise: Promise<IDBPDatabase> | null = null;

export const getDB = () => {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, {
            keyPath: 'id',
            autoIncrement: true,
          });
          store.createIndex('synced', 'synced');
        }
      },
    });
  }
  return dbPromise;
};

export const addFailedLog = async (log: Omit<FailedVerificationLog, 'id' | 'synced'>) => {
  const db = await getDB();
  await db.add(STORE_NAME, {
    ...log,
    synced: false,
  });
};

export const getUnsyncedLogs = async () => {
  const db = await getDB();
  return db.getAllFromIndex(STORE_NAME, 'synced', 0);
};

export const markAsSynced = async (id: number) => {
  const db = await getDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  const log = await store.get(id);
  if (log) {
    log.synced = 1; // using 1/0 for boolean index compatibility if needed, but true/false is fine usually. Let's use boolean.
    log.synced = true;
    await store.put(log);
  }
  await tx.done;
};

export const syncLogsWithServer = async () => {
  if (!navigator.onLine) return;

  const unsyncedLogs = await getUnsyncedLogs();
  if (unsyncedLogs.length === 0) return;

  console.log(`Attempting to sync ${unsyncedLogs.length} logs...`);

  for (const log of unsyncedLogs) {
    try {
      const response = await fetch('/api/sync-failed-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(log),
      });

      if (response.ok) {
        await markAsSynced(log.id!);
        console.log(`Synced log ${log.id}`);
      }
    } catch (err) {
      console.error(`Failed to sync log ${log.id}`, err);
    }
  }
};
