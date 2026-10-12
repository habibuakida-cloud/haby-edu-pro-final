export * from './lib/supabaseClient';
import { supabase, auth as supabaseAuth, DEFAULT_PRIMARY_SCHOOL_ID } from './lib/supabaseClient';

export const db = supabase;
export const auth = supabaseAuth;
export const app = supabase;
export { DEFAULT_PRIMARY_SCHOOL_ID };

export default supabase;
