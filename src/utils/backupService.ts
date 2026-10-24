import { supabase, DEFAULT_PRIMARY_SCHOOL_ID } from '../lib/dbClient';

export type BackupMode = 'json_download' | 'supabase_snapshot' | 'both';

export interface AutoBackupConfig {
  enabled: boolean;
  scheduledTime: string; // "HH:MM" in 24h format, e.g. "16:30"
  backupMode: BackupMode;
  retentionCount: number; // e.g. 14 snapshots
  lastBackupDate?: string | null; // "YYYY-MM-DD"
  lastJsonDownloadDate?: string | null; // "YYYY-MM-DD"
  lastSupabaseSnapshotDate?: string | null; // "YYYY-MM-DD"
  lastBackupTimestamp?: string | null; // ISO timestamp
  lastBackupStatus?: 'success' | 'error' | null;
  lastBackupMessage?: string | null;
}

export interface BackupSnapshotMeta {
  id: string;
  schoolId: string;
  filename: string;
  storagePath: string;
  bucket: string;
  createdAt: string;
  dateKey: string; // "YYYY-MM-DD"
  triggerType: 'scheduled' | 'manual';
  mode: BackupMode | string;
  sizeBytes: number;
  counts: {
    students: number;
    teachers: number;
    exams: number;
    classes: number;
    timetableAssignments: number;
    examinationRecords: number;
  };
}

export const DEFAULT_AUTO_BACKUP_CONFIG: AutoBackupConfig = {
  enabled: true,
  scheduledTime: '17:00',
  backupMode: 'both',
  retentionCount: 14,
  lastBackupDate: null,
  lastJsonDownloadDate: null,
  lastSupabaseSnapshotDate: null,
  lastBackupTimestamp: null,
  lastBackupStatus: null,
  lastBackupMessage: null,
};

export function getLocalDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getLocalTimeHHMM(date: Date = new Date()): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

const getStorageKey = (schoolId: string) =>
  `haby_auto_backup_config_${schoolId || DEFAULT_PRIMARY_SCHOOL_ID}`;

export function getCachedAutoBackupConfig(schoolId: string): AutoBackupConfig {
  if (typeof window === 'undefined') return DEFAULT_AUTO_BACKUP_CONFIG;
  try {
    const raw = localStorage.getItem(getStorageKey(schoolId));
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_AUTO_BACKUP_CONFIG, ...parsed };
    }
  } catch (e) {
    console.warn('Error reading cached auto backup config:', e);
  }
  return DEFAULT_AUTO_BACKUP_CONFIG;
}

export async function loadAutoBackupConfig(schoolId: string): Promise<AutoBackupConfig> {
  const targetSchoolId = schoolId || DEFAULT_PRIMARY_SCHOOL_ID;
  const local = getCachedAutoBackupConfig(targetSchoolId);
  try {
    const res = await fetch(`/api/backups/config?schoolId=${encodeURIComponent(targetSchoolId)}`, {
      cache: 'no-store'
    });
    if (res.ok) {
      const json = await res.json();
      if (json && json.config) {
        const merged: AutoBackupConfig = {
          ...DEFAULT_AUTO_BACKUP_CONFIG,
          ...local,
          ...json.config,
          lastJsonDownloadDate:
            local.lastJsonDownloadDate &&
            (!json.config.lastJsonDownloadDate || local.lastJsonDownloadDate > json.config.lastJsonDownloadDate)
              ? local.lastJsonDownloadDate
              : json.config.lastJsonDownloadDate || local.lastJsonDownloadDate || null,
        };
        if (typeof window !== 'undefined') {
          localStorage.setItem(getStorageKey(targetSchoolId), JSON.stringify(merged));
        }
        return merged;
      }
    }
  } catch (err) {
    console.warn('Fallback to local auto backup config:', err);
  }
  return local;
}

export async function saveAutoBackupConfig(
  schoolId: string,
  config: Partial<AutoBackupConfig>
): Promise<AutoBackupConfig> {
  const targetSchoolId = schoolId || DEFAULT_PRIMARY_SCHOOL_ID;
  const current = getCachedAutoBackupConfig(targetSchoolId);
  const updated: AutoBackupConfig = {
    ...DEFAULT_AUTO_BACKUP_CONFIG,
    ...current,
    ...config,
  };

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(getStorageKey(targetSchoolId), JSON.stringify(updated));
    } catch (e) {
      console.warn('Error saving auto backup config to localStorage:', e);
    }
  }

  try {
    const res = await fetch('/api/backups/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ schoolId: targetSchoolId, config: updated }),
    });
    if (res.ok) {
      const json = await res.json();
      if (json && json.config) {
        const finalConfig = { ...updated, ...json.config };
        if (typeof window !== 'undefined') {
          localStorage.setItem(getStorageKey(targetSchoolId), JSON.stringify(finalConfig));
        }
        return finalConfig;
      }
    }
  } catch (err) {
    console.warn('Could not sync auto backup config to server:', err);
  }

  return updated;
}

/**
 * Triggers a browser JSON download of the school's complete data
 */
export function triggerJsonDownloadBackup(
  schoolId: string,
  schoolData: any,
  triggerType: 'scheduled' | 'manual' = 'manual'
): { filename: string; sizeBytes: number } {
  const now = new Date();
  const dateKey = getLocalDateKey(now);
  const timeKey = getLocalTimeHHMM(now).replace(':', '-');
  const rawSchoolName = schoolData?.schoolInfo?.name || 'haby_edu_pro';
  const safeSchoolName = rawSchoolName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 32) || 'school';

  const filename = `${safeSchoolName}_${triggerType}_backup_${dateKey}_${timeKey}.json`;

  const backupEnvelope = {
    _backupMeta: {
      schoolId: schoolId || DEFAULT_PRIMARY_SCHOOL_ID,
      schoolName: rawSchoolName,
      createdAt: now.toISOString(),
      dateKey,
      triggerType,
      version: '3.0',
      counts: {
        students: Array.isArray(schoolData?.students) ? schoolData.students.length : 0,
        teachers: Array.isArray(schoolData?.teachers) ? schoolData.teachers.length : 0,
        exams: Array.isArray(schoolData?.exams) ? schoolData.exams.length : 0,
        classes: Array.isArray(schoolData?.streamSettings) ? schoolData.streamSettings.length : 0,
        timetableAssignments: Array.isArray(schoolData?.timetableAssignments) ? schoolData.timetableAssignments.length : 0,
        examinationRecords: Array.isArray(schoolData?.examinationRecords) ? schoolData.examinationRecords.length : 0,
      },
    },
    ...schoolData,
  };

  const jsonString = JSON.stringify(backupEnvelope, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
  const sizeBytes = blob.size;

  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  return { filename, sizeBytes };
}

/**
 * Triggers a Supabase Storage & Cloud SQL snapshot of the school's complete data
 */
export async function triggerSupabaseStorageSnapshot(
  schoolId: string,
  schoolData: any,
  triggerType: 'scheduled' | 'manual' = 'manual'
): Promise<BackupSnapshotMeta> {
  const targetSchoolId = schoolId || DEFAULT_PRIMARY_SCHOOL_ID;
  const now = new Date();
  const dateKey = getLocalDateKey(now);
  const timeKey = getLocalTimeHHMM(now).replace(':', '-');
  const storagePath = `${targetSchoolId}/snapshot_${dateKey}_${timeKey}_${triggerType}.json`;

  const uploadRes = await supabase.storage
    .from('school-backups')
    .upload(storagePath, schoolData, {
      contentType: 'application/json',
      upsert: true,
      metadata: {
        schoolId: targetSchoolId,
        triggerType,
        dateKey,
      },
    });

  if (uploadRes.error) {
    throw new Error(typeof uploadRes.error === 'string' ? uploadRes.error : uploadRes.error.message || 'Failed to upload snapshot');
  }

  return uploadRes.data as BackupSnapshotMeta;
}

/**
 * Fetches all stored Supabase Storage snapshots for the school
 */
export async function fetchBackupSnapshots(schoolId: string): Promise<BackupSnapshotMeta[]> {
  const targetSchoolId = schoolId || DEFAULT_PRIMARY_SCHOOL_ID;
  try {
    const res = await fetch(`/api/backups/list?schoolId=${encodeURIComponent(targetSchoolId)}`, {
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const json = await res.json();
    return Array.isArray(json.snapshots) ? json.snapshots : [];
  } catch (err) {
    console.warn('Error fetching backup snapshots:', err);
    return [];
  }
}

/**
 * Fetches the full JSON payload of a specific stored snapshot for restoration
 */
export async function fetchSnapshotPayload(schoolId: string, snapshotId: string): Promise<any> {
  const targetSchoolId = schoolId || DEFAULT_PRIMARY_SCHOOL_ID;
  const res = await fetch(
    `/api/backups/download/${encodeURIComponent(snapshotId)}?schoolId=${encodeURIComponent(targetSchoolId)}`,
    { cache: 'no-store' }
  );
  if (!res.ok) {
    throw new Error('Failed to load snapshot data from storage');
  }
  return await res.json();
}

/**
 * Downloads a stored Supabase snapshot to the user's computer as a .json file
 */
export async function downloadSnapshotFile(
  schoolId: string,
  snapshotId: string,
  filename?: string
): Promise<void> {
  const payload = await fetchSnapshotPayload(schoolId, snapshotId);
  const jsonString = JSON.stringify(payload, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `snapshot_${snapshotId}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

/**
 * Deletes a stored Supabase snapshot
 */
export async function deleteBackupSnapshot(schoolId: string, snapshotId: string): Promise<boolean> {
  const targetSchoolId = schoolId || DEFAULT_PRIMARY_SCHOOL_ID;
  try {
    const res = await fetch(
      `/api/backups/${encodeURIComponent(snapshotId)}?schoolId=${encodeURIComponent(targetSchoolId)}`,
      { method: 'DELETE' }
    );
    return res.ok;
  } catch (err) {
    console.warn('Error deleting backup snapshot:', err);
    return false;
  }
}
