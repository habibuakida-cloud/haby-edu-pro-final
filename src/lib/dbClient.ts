import { auth, db } from './firebaseClient';

export { auth, db };

export {
  DEFAULT_PRIMARY_SCHOOL_ID,
  getCurrentSchoolId,
  toSupabaseStudent,
  fromSupabaseStudent,
  toSupabaseTeacher,
  fromSupabaseTeacher,
  toSupabaseExam,
  fromSupabaseExam,
  toSupabaseDiscipline,
  toSupabaseParent,
  toSupabaseActivityLog,
  processSyncQueue,
  upsertRecord,
  insertRecord,
  deleteRecord,
  getAll,
  supabase
} from './dbBridge';
