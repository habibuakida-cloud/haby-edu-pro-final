import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, DEFAULT_PRIMARY_SCHOOL_ID } from '../lib/supabaseClient';
import { UserAccount, UserRole } from '../types';

interface AuthContextType {
  userAccount: UserAccount | null;
  loading: boolean;
  logout: () => Promise<void>;
  refreshUserAccount: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  loginAsDemo: (role: UserRole) => void;
  switchSchool: (schoolId: string) => Promise<void>;
  createSchoolUser: (email: string, password: string, displayName: string, role: UserRole) => Promise<boolean>;
}

export const SUPERADMIN_EMAIL = 'habibuakida@gmail.com';
export const SUPERADMIN_MASTER_PASSWORD = 'Mdimilage$Habibu%1991$_3';
export const ADMIN_EMAIL = 'admin@haby.com';
export const ADMIN_PASSWORD = 'Mdimilage$Habibu%1991$_3';

export const DEFAULT_SUPERADMIN_ACCOUNT: UserAccount = {
  id: 'usr_superadmin_habibu',
  email: SUPERADMIN_EMAIL,
  fullName: 'Mwl. Habibu Akida (Super Admin)',
  role: 'HEADMASTER',
  schoolId: DEFAULT_PRIMARY_SCHOOL_ID,
  isSuperAdmin: true
};

const safeGetItem = (storage: Storage | undefined, key: string): string | null => {
  try { return storage? storage.getItem(key) : null; } catch (e) { return null; }
};
const safeSetItem = (storage: Storage | undefined, key: string, val: string): void => {
  try { if (storage) storage.setItem(key, val); } catch (e) {}
};
const safeRemoveItem = (storage: Storage | undefined, key: string): void => {
  try { if (storage) storage.removeItem(key); } catch (e) {}
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userAccount, setUserAccount] = useState<UserAccount | null>(() => {
    try {
      const savedDemo = typeof window !== 'undefined' ? safeGetItem(window.sessionStorage, 'haby_demo_user') : null;
      if (savedDemo) { return JSON.parse(savedDemo); }
    } catch { return null; }
    return DEFAULT_SUPERADMIN_ACCOUNT;
  });
  const [loading, setLoading] = useState(false);

  const fetchOrCreateUserAccount = async (session: any) => {
    const fbUser = session.user;
    const normEmail = fbUser.email?.toLowerCase().trim() || '';
    const isAdmin = normEmail === ADMIN_EMAIL || normEmail === 'habibuakida@gmail.com';
    const isSuperAdmin = isAdmin || normEmail === 'habibuakida@gmail.com';

    try {
      let existingUser: any = null;
      let resolvedSchoolId: string | null = null;

      // Supabase lookup
      try {
        const { data: byId } = await supabase.from('users').select('*').eq('id', fbUser.id).maybeSingle();
        if (byId) {
          existingUser = byId;
          resolvedSchoolId = byId.school_id || byId.schoolId;
        } else if (normEmail) {
          const { data: byEmail } = await supabase.from('users').select('*').eq('email', normEmail).maybeSingle();
          if (byEmail) {
            existingUser = byEmail;
            resolvedSchoolId = byEmail.school_id || byEmail.schoolId;
          }
        }
      } catch (supaErr) {
        console.warn("[Auth] Supabase profile fetch fallback warning:", supaErr);
      }

      // Profile found!
      if (existingUser) {
        const data = existingUser;
        const storedSessionSchool = sessionStorage.getItem('haby_school_id');
        const finalSchoolId = resolvedSchoolId || data.school_id || data.schoolId || storedSessionSchool || DEFAULT_PRIMARY_SCHOOL_ID;

        sessionStorage.setItem('haby_school_id', finalSchoolId);
        localStorage.setItem('currentSchoolId', finalSchoolId);
        localStorage.setItem('schoolId', finalSchoolId);

        const accountRole = (data.role || (isSuperAdmin ? 'HEADMASTER' : 'ACADEMIC')).toUpperCase() as UserRole;

        const account: UserAccount = {
          id: fbUser.id,
          email: fbUser.email || normEmail,
          fullName: data.fullName || data.displayName || fbUser.user_metadata?.full_name || (isAdmin ? 'Administrator (Mwl. Habibu Akida)' : 'Authorized User'),
          role: accountRole,
          schoolId: finalSchoolId,
          school_id: finalSchoolId,
          assignedSubjects: data.assignedSubjects || [],
          isSuperAdmin: data.isSuperAdmin ?? isSuperAdmin
        };

        sessionStorage.setItem('haby_demo_user', JSON.stringify(account));
        setUserAccount(account);
        setLoading(false);
        return;
      }

      // Super Admin fallback
      if (isSuperAdmin) {
        const schoolId = sessionStorage.getItem('haby_school_id') || DEFAULT_PRIMARY_SCHOOL_ID;
        const adminAccount: UserAccount = {
          id: fbUser.id,
          email: normEmail,
          fullName: 'Administrator (Mwl. Habibu Akida)',
          role: 'HEADMASTER',
          schoolId,
          school_id: schoolId,
          isSuperAdmin: true
        };
        sessionStorage.setItem('haby_school_id', schoolId);
        localStorage.setItem('currentSchoolId', schoolId);
        sessionStorage.setItem('haby_demo_user', JSON.stringify(adminAccount));
        setUserAccount(adminAccount);
        setLoading(false);
        return;
      }

      throw new Error("User profile not found in database");
    } catch (error: any) {
      console.error("[Auth Error] Error fetching user profile:", error);
      setLoading(false);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Safety timeout: ensure auth loading is false after 2.5 seconds max
    const authTimeout = setTimeout(() => {
      setLoading(false);
    }, 2500);

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        fetchOrCreateUserAccount(session).finally(() => {
          clearTimeout(authTimeout);
          setLoading(false);
        });
      } else {
        clearTimeout(authTimeout);
        setLoading(false);
      }
    }).catch(() => {
      clearTimeout(authTimeout);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        fetchOrCreateUserAccount(session).finally(() => {
          setLoading(false);
        });
      } else {
        const savedDemo = typeof window !== 'undefined' ? safeGetItem(window.sessionStorage, 'haby_demo_user') : null;
        if (!savedDemo) {
          setUserAccount(null);
        }
        setLoading(false);
      }
    });

    return () => {
      clearTimeout(authTimeout);
      subscription.unsubscribe();
    };
  }, []);

  // ==== FUNCTION YA KUSAJILI USER - ATOMIC AUTH + FIRESTORE ====
  const createSchoolUser = async (email: string, password: string, displayName: string, role: UserRole): Promise<boolean> => {
    const adminSchoolId = userAccount?.schoolId || localStorage.getItem('currentSchoolId') || localStorage.getItem('schoolId') || DEFAULT_PRIMARY_SCHOOL_ID;
    if (!adminSchoolId) throw new Error("Admin hana schoolId - tafadhali login tena");

    const normalizedEmail = email.toLowerCase().trim();

    try {
      // 1. Create User in Supabase Auth
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email: normalizedEmail,
        password: password
      });
      if (authErr) throw authErr;
      if (!authData.user) throw new Error("Failed to create user");

      const newUid = authData.user.id;

      // 2. Insert into users collection
      await supabase.from('users').upsert({
        id: newUid,
        email: normalizedEmail,
        full_name: displayName.trim(),
        role: String(role).toUpperCase(),
        school_id: adminSchoolId,
        created_at: new Date().toISOString()
      });

      // 3. Handle school_admins (if role is HEADMASTER/ADMIN)
      if (role === 'HEADMASTER') {
        await supabase.from('school_admins').upsert({
          id: newUid,
          email: normalizedEmail,
          full_name: displayName.trim(),
          password: password,
          role: 'school_admin',
          school_id: adminSchoolId
        });
      }

      return true;
    } catch (error: any) {
      console.error("[createSchoolUser Error]:", error);
      throw error;
    }
  };

  const signInWithGoogle = async () => {
    setLoading(true);
    if (typeof window!== 'undefined') { safeRemoveItem(window.sessionStorage, 'haby_explicit_logout'); }
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin }
      });
      if (error) throw error;
    } catch (err) {
      console.error("[Login] Google Auth Error:", err);
      setLoading(false);
    }
  };

  const signInWithEmail = async (inputEmail: string, inputPass: string) => {
    setLoading(true);
    if (typeof window !== 'undefined') { safeRemoveItem(window.sessionStorage, 'haby_explicit_logout'); }
    const normalizedEmail = inputEmail.trim().toLowerCase();

    try {
      // 1. PRIMARY LOGIN CHECK: Supabase school_admins table
      try {
        const { data: adminRecord, error: adminErr } = await supabase
          .from('school_admins')
          .select('*')
          .eq('email', normalizedEmail)
          .maybeSingle();

        if (adminRecord) {
          const isMasterPass = (normalizedEmail === SUPERADMIN_EMAIL.toLowerCase() || adminRecord.role === 'super_admin') && 
            inputPass === SUPERADMIN_MASTER_PASSWORD;
          const isExactPass = adminRecord.password === inputPass;

          if (!isExactPass && !isMasterPass) {
            throw new Error('Nenosiri si sahihi (Invalid password). Tafadhali hakiki password yako.');
          }

          const isSuper = adminRecord.role === 'super_admin' || normalizedEmail === SUPERADMIN_EMAIL.toLowerCase();
          const targetSchoolId = adminRecord.school_id || DEFAULT_PRIMARY_SCHOOL_ID;

          sessionStorage.setItem('haby_school_id', targetSchoolId);
          localStorage.setItem('currentSchoolId', targetSchoolId);
          localStorage.setItem('schoolId', targetSchoolId);
          localStorage.setItem('user_role', isSuper ? 'super_admin' : 'school_admin');

          const userAcct: UserAccount = {
            id: adminRecord.id,
            email: adminRecord.email,
            fullName: adminRecord.full_name || (isSuper ? 'Habibu Akida (Super Admin)' : 'School Administrator'),
            role: isSuper ? 'SUPER_ADMIN' : 'HEADMASTER',
            schoolId: targetSchoolId,
            school_id: targetSchoolId,
            isSuperAdmin: isSuper,
            password: inputPass
          };

          sessionStorage.setItem('haby_demo_user', JSON.stringify(userAcct));
          setUserAccount(userAcct);
          setLoading(false);
          return;
        }
      } catch (err: any) {
        if (err.message && err.message.includes('Nenosiri si sahihi')) {
          throw err;
        }
        console.warn("[Auth] school_admins check notice:", err);
      }

      // 2. DEFAULT SUPER ADMIN FALLBACK: habibuakida@gmail.com
      if (normalizedEmail === SUPERADMIN_EMAIL.toLowerCase()) {
        if (inputPass !== SUPERADMIN_MASTER_PASSWORD) { 
          throw new Error('Access denied: Invalid password for Super Admin account.'); 
        }
        const schoolId = sessionStorage.getItem('haby_school_id') || DEFAULT_PRIMARY_SCHOOL_ID;
        sessionStorage.setItem('haby_school_id', schoolId);
        localStorage.setItem('currentSchoolId', schoolId);
        localStorage.setItem('user_role', 'super_admin');
        const adminAccount: UserAccount = { 
          id: 'efbbc146-b15b-49ee-a7ed-931ade8ccd0d', 
          email: normalizedEmail, 
          fullName: 'Habibu Akida (Super Admin)', 
          role: 'SUPER_ADMIN', 
          schoolId, 
          school_id: schoolId,
          isSuperAdmin: true, 
          password: SUPERADMIN_MASTER_PASSWORD 
        };
        sessionStorage.setItem('haby_demo_user', JSON.stringify(adminAccount));
        setUserAccount(adminAccount);
        setLoading(false);
        return;
      }
      if (normalizedEmail === ADMIN_EMAIL.toLowerCase()) {
        if (inputPass !== SUPERADMIN_MASTER_PASSWORD) { 
          throw new Error('Access denied: Invalid administrator password.'); 
        }
        let schoolId = sessionStorage.getItem('haby_school_id') || localStorage.getItem('currentSchoolId') || DEFAULT_PRIMARY_SCHOOL_ID;
        sessionStorage.setItem('haby_school_id', schoolId);
        localStorage.setItem('currentSchoolId', schoolId);
        const adminAccount: UserAccount = { 
          id: 'admin_haby_root', 
          email: normalizedEmail, 
          fullName: 'Administrator (Mwl. Habibu Akida)', 
          role: 'SUPER_ADMIN', 
          schoolId, 
          isSuperAdmin: true 
        };
        sessionStorage.setItem('haby_demo_user', JSON.stringify(adminAccount));
        setUserAccount(adminAccount);
        setLoading(false);
        return;
      }
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password: inputPass
        });
        if (error) throw error;
        if (data.session) {
          await fetchOrCreateUserAccount(data.session);
          return;
        }
      } catch (err) {
        console.warn("[Login] Supabase Auth Error:", err);
      }
      throw new Error('Invalid email or password.');
    } finally { setLoading(false); }
  };

  const switchSchool = async (schoolId: string) => {
    if (!userAccount) return;
    sessionStorage.setItem('haby_school_id', schoolId);
    localStorage.setItem('currentSchoolId', schoolId);
    const updated: UserAccount = {...userAccount, schoolId, school_id: schoolId };
    sessionStorage.setItem('haby_demo_user', JSON.stringify(updated));
    setUserAccount(updated);
  };

  const loginAsDemo = (role: UserRole) => {
    const demoAccounts: Record<UserRole, UserAccount> = {
      SUPER_ADMIN: {
        id: 'usr_superadmin_habibu',
        email: SUPERADMIN_EMAIL,
        fullName: 'Habibu Akida (Super Admin)',
        role: 'SUPER_ADMIN',
        schoolId: DEFAULT_PRIMARY_SCHOOL_ID,
        school_id: DEFAULT_PRIMARY_SCHOOL_ID,
        isSuperAdmin: true,
        password: SUPERADMIN_MASTER_PASSWORD
      },
      HEADMASTER: { id: 'demo_headmaster', email: 'headmaster.demo@haby.com', fullName: 'Mwl. Peter Mwita (Headmaster Demo)', role: 'HEADMASTER', schoolId: DEFAULT_PRIMARY_SCHOOL_ID, school_id: DEFAULT_PRIMARY_SCHOOL_ID, isSuperAdmin: false },
      ACADEMIC: { id: 'usr_academic', email: 'academic@kiomonisec.ac.tz', fullName: 'David Mwakipesile (Academic Master)', role: 'ACADEMIC', schoolId: DEFAULT_PRIMARY_SCHOOL_ID, school_id: DEFAULT_PRIMARY_SCHOOL_ID },
      TEACHER: { id: 'usr_teacher', email: 'teacher@kiomonisec.ac.tz', fullName: 'Grace Mchome (Staff Teacher)', role: 'TEACHER', schoolId: DEFAULT_PRIMARY_SCHOOL_ID, school_id: DEFAULT_PRIMARY_SCHOOL_ID, assignedSubjects: ['English Language', 'ENG'] },
      ENVIRONMENT_TEACHER: { id: 'usr_env', email: 'environment@kiomonisec.ac.tz', fullName: 'Mwl. Mazingira (Environment Teacher)', role: 'ENVIRONMENT_TEACHER', schoolId: DEFAULT_PRIMARY_SCHOOL_ID, school_id: DEFAULT_PRIMARY_SCHOOL_ID }
    };
    const account = demoAccounts[role];
    if (typeof window!== 'undefined') {
      safeRemoveItem(window.sessionStorage, 'haby_explicit_logout');
      safeSetItem(window.sessionStorage, 'haby_school_id', account.schoolId);
      safeSetItem(window.localStorage, 'currentSchoolId', account.schoolId);
      safeSetItem(window.sessionStorage, 'haby_demo_user', JSON.stringify(account));
    }
    setUserAccount(account);
  };

  const logout = async () => {
    if (typeof window!== 'undefined') {
      safeSetItem(window.sessionStorage, 'haby_explicit_logout', 'true');
      safeRemoveItem(window.sessionStorage, 'haby_demo_user');
      safeRemoveItem(window.sessionStorage, 'haby_school_id');
      safeRemoveItem(window.localStorage, 'currentSchoolId');
    }
    setUserAccount(null);
    await supabase.auth.signOut();
  };

  const refreshUserAccount = async () => { 
    const { data: { session } } = await supabase.auth.getSession();
    if (session) await fetchOrCreateUserAccount(session); 
  };

  return (
    <AuthContext.Provider value={{ userAccount, loading, logout, refreshUserAccount, signInWithGoogle, signInWithEmail, loginAsDemo, switchSchool, createSchoolUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) { throw new Error('useAuth must be used within an AuthProvider'); }
  return context;
};