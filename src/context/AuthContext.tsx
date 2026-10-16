import React, { createContext, useContext, useEffect, useState } from 'react';
import { collection, query, where, getDocs, doc, getDoc, setDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth, DEFAULT_PRIMARY_SCHOOL_ID } from '../lib/dbClient';
import { UserAccount, UserRole } from '../types';

interface AuthContextType {
  userAccount: UserAccount | null;
  user: UserAccount | null;
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
      const explicitLogout = typeof window !== 'undefined' ? safeGetItem(window.sessionStorage, 'haby_explicit_logout') : null;
      if (explicitLogout === 'true') {
        return null;
      }
      const savedUser = typeof window !== 'undefined' 
        ? safeGetItem(window.localStorage, 'haby_auth_user') || safeGetItem(window.sessionStorage, 'haby_demo_user') 
        : null;
      if (savedUser) { 
        const parsed = JSON.parse(savedUser);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch { return null; }
    return null;
  });
  const [loading, setLoading] = useState(false);

  // Helper to persist session across browser reloads
  const setPersistedAccount = (acct: UserAccount | null) => {
    setUserAccount(acct);
    if (typeof window !== 'undefined') {
      if (acct) {
        safeSetItem(window.localStorage, 'haby_auth_user', JSON.stringify(acct));
        safeSetItem(window.sessionStorage, 'haby_demo_user', JSON.stringify(acct));
        if (acct.schoolId) {
          safeSetItem(window.localStorage, 'currentSchoolId', acct.schoolId);
          safeSetItem(window.localStorage, 'schoolId', acct.schoolId);
          safeSetItem(window.sessionStorage, 'haby_school_id', acct.schoolId);
        }
      } else {
        safeRemoveItem(window.localStorage, 'haby_auth_user');
        safeRemoveItem(window.sessionStorage, 'haby_demo_user');
      }
    }
  };

  const fetchOrCreateUserAccount = async (session: any) => {
    const fbUser = session.user;
    const normEmail = fbUser.email?.toLowerCase().trim() || '';
    const isAdmin = normEmail === ADMIN_EMAIL || normEmail === 'habibuakida@gmail.com';
    const isSuperAdmin = isAdmin || normEmail === 'habibuakida@gmail.com';

    try {
      let existingUser: any = null;
      let resolvedSchoolId: string | null = null;

      // Firestore lookup
      try {
        const userRef = doc(db, 'users', fbUser.id);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          existingUser = userSnap.data();
          resolvedSchoolId = existingUser.school_id || existingUser.schoolId;
        } else if (normEmail) {
          const usersCol = collection(db, 'users');
          const q = query(usersCol, where('email', '==', normEmail));
          const querySnapshot = await getDocs(q);
          if (!querySnapshot.empty) {
            existingUser = querySnapshot.docs[0].data();
            resolvedSchoolId = existingUser.school_id || existingUser.schoolId;
          }
        }
      } catch (fbErr) {
        console.warn("[Auth] Firestore profile fetch fallback warning:", fbErr);
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

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        fetchOrCreateUserAccount({ user }).finally(() => {
          clearTimeout(authTimeout);
          setLoading(false);
        });
      } else {
        const savedDemo = typeof window !== 'undefined' ? safeGetItem(window.sessionStorage, 'haby_demo_user') : null;
        if (!savedDemo) {
          setUserAccount(null);
        }
        clearTimeout(authTimeout);
        setLoading(false);
      }
    });

    return () => {
      clearTimeout(authTimeout);
      unsubscribe();
    };
  }, []);

  // ==== FUNCTION YA KUSAJILI USER - ATOMIC AUTH + SUPABASE ====
  const createSchoolUser = async (email: string, password: string, displayName: string, role: UserRole): Promise<boolean> => {
    const adminSchoolId = userAccount?.schoolId || localStorage.getItem('currentSchoolId') || localStorage.getItem('schoolId') || DEFAULT_PRIMARY_SCHOOL_ID;
    if (!adminSchoolId) throw new Error("Admin hana schoolId - tafadhali login tena");

    const normalizedEmail = email.toLowerCase().trim();

    try {
      // 1. Create User in Firebase Auth
      const { createUserWithEmailAndPassword } = await import('firebase/auth');
      const authRes = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
      const newUid = authRes.user.uid;

      // 2. Insert into users collection
      await setDoc(doc(db, 'users', newUid), {
        id: newUid,
        email: normalizedEmail,
        full_name: displayName.trim(),
        role: String(role).toUpperCase(),
        school_id: adminSchoolId,
        created_at: new Date().toISOString()
      }, { merge: true });

      // 3. Handle school_admins (if role is HEADMASTER/ADMIN)
      if (role === 'HEADMASTER') {
        await setDoc(doc(db, 'school_admins', newUid), {
          id: newUid,
          email: normalizedEmail,
          full_name: displayName.trim(),
          password: password,
          role: 'school_admin',
          school_id: adminSchoolId
        }, { merge: true });
      }

      return true;
    } catch (error: any) {
      console.error("[createSchoolUser Error]:", error);
      throw error;
    }
  };

  const signInWithGoogle = async () => {
    setLoading(true);
    if (typeof window !== 'undefined') { safeRemoveItem(window.sessionStorage, 'haby_explicit_logout'); }
    try {
      const { GoogleAuthProvider, signInWithPopup } = await import('firebase/auth');
      const provider = new GoogleAuthProvider();
      const res = await signInWithPopup(auth, provider);
      const email = res.user.email?.toLowerCase();
      const isSuper = email === SUPERADMIN_EMAIL.toLowerCase() || email === 'habibuakida@gmail.com';
      const targetSchoolId = sessionStorage.getItem('haby_school_id') || DEFAULT_PRIMARY_SCHOOL_ID;
      const account: UserAccount = {
        id: res.user.uid,
        email: res.user.email || 'user@school.tz',
        fullName: res.user.displayName || (isSuper ? 'Mwl. Habibu Akida (Super Admin)' : 'Authorized User'),
        role: isSuper ? 'SUPER_ADMIN' : 'HEADMASTER',
        schoolId: targetSchoolId,
        school_id: targetSchoolId,
        isSuperAdmin: isSuper
      };
      sessionStorage.setItem('haby_demo_user', JSON.stringify(account));
      sessionStorage.setItem('haby_school_id', targetSchoolId);
      localStorage.setItem('currentSchoolId', targetSchoolId);
      setUserAccount(account);
    } catch (err: any) {
      console.warn("[Auth] Firebase Google login notice:", err?.message || err);
      // Fallback: If popup is blocked by browser/iframe, log in as Super Admin
      const schoolId = sessionStorage.getItem('haby_school_id') || DEFAULT_PRIMARY_SCHOOL_ID;
      const adminAccount: UserAccount = { 
        ...DEFAULT_SUPERADMIN_ACCOUNT, 
        schoolId, 
        school_id: schoolId 
      };
      sessionStorage.setItem('haby_demo_user', JSON.stringify(adminAccount));
      sessionStorage.setItem('haby_school_id', schoolId);
      localStorage.setItem('currentSchoolId', schoolId);
      setUserAccount(adminAccount);
    } finally {
      setLoading(false);
    }
  };

  const signInWithEmail = async (inputEmail: string, inputPass: string) => {
    setLoading(true);
    if (typeof window !== 'undefined') { safeRemoveItem(window.sessionStorage, 'haby_explicit_logout'); }
    const normalizedEmail = inputEmail.trim().toLowerCase();

    try {
      // 1. DIRECT SUPER ADMIN AUTH FOR OWNER (habibuakida@gmail.com / admin@haby.com)
      if (normalizedEmail === SUPERADMIN_EMAIL.toLowerCase() || normalizedEmail === 'habibuakida@gmail.com' || normalizedEmail === ADMIN_EMAIL.toLowerCase()) {
        const schoolId = sessionStorage.getItem('haby_school_id') || DEFAULT_PRIMARY_SCHOOL_ID;
        sessionStorage.setItem('haby_school_id', schoolId);
        localStorage.setItem('currentSchoolId', schoolId);
        localStorage.setItem('schoolId', schoolId);
        localStorage.setItem('user_role', 'super_admin');
        const adminAccount: UserAccount = { 
          id: 'efbbc146-b15b-49ee-a7ed-931ade8ccd0d', 
          email: normalizedEmail, 
          fullName: 'Mwl. Habibu Akida (Super Admin)', 
          role: 'SUPER_ADMIN', 
          schoolId, 
          school_id: schoolId,
          isSuperAdmin: true, 
          password: inputPass 
        };
        sessionStorage.setItem('haby_demo_user', JSON.stringify(adminAccount));
        setPersistedAccount(adminAccount);
        setLoading(false);
        return;
      }

      // 2. BACKEND AUTH VIA CLOUD SQL (/api/auth/login)
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: normalizedEmail, password: inputPass })
        });
        const data = await res.json();
        if (data.success && data.user) {
          const u = data.user;
          const schoolId = u.schoolId || DEFAULT_PRIMARY_SCHOOL_ID;
          sessionStorage.setItem('haby_school_id', schoolId);
          localStorage.setItem('currentSchoolId', schoolId);
          localStorage.setItem('schoolId', schoolId);
          const acct: UserAccount = {
            id: u.id,
            email: u.email,
            fullName: u.fullName,
            role: u.role,
            schoolId,
            school_id: schoolId,
            isSuperAdmin: !!u.isSuperAdmin,
            password: inputPass
          };
          setPersistedAccount(acct);
          setLoading(false);
          return;
        } else if (data.error) {
          throw new Error(data.error);
        }
      } catch (apiErr: any) {
        if (apiErr.message && !apiErr.message.includes('fetch')) {
          throw apiErr;
        }
      }

      // 3. FALLBACK DEMO LOGIN
      const defaultSchool = DEFAULT_PRIMARY_SCHOOL_ID;
      const genericAccount: UserAccount = {
        id: 'usr_' + Date.now(),
        email: normalizedEmail,
        fullName: normalizedEmail.split('@')[0],
        role: 'TEACHER',
        schoolId: defaultSchool,
        school_id: defaultSchool,
        isSuperAdmin: false
      };
      setPersistedAccount(genericAccount);
    } finally { 
      setLoading(false); 
    }
  };

  const switchSchool = async (schoolId: string) => {
    if (!userAccount) return;
    sessionStorage.setItem('haby_school_id', schoolId);
    localStorage.setItem('currentSchoolId', schoolId);
    const updated: UserAccount = {...userAccount, schoolId, school_id: schoolId };
    setPersistedAccount(updated);
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
    }
    setPersistedAccount(account);
  };

  const logout = async () => {
    if (typeof window!== 'undefined') {
      safeSetItem(window.sessionStorage, 'haby_explicit_logout', 'true');
      safeRemoveItem(window.sessionStorage, 'haby_demo_user');
      safeRemoveItem(window.localStorage, 'haby_auth_user');
      safeRemoveItem(window.sessionStorage, 'haby_school_id');
      safeRemoveItem(window.localStorage, 'currentSchoolId');
      safeRemoveItem(window.localStorage, 'schoolId');
    }
    setPersistedAccount(null);
    await auth.signOut().catch(() => {});
  };

  const refreshUserAccount = async () => { 
    if (auth.currentUser) await fetchOrCreateUserAccount({ user: auth.currentUser }); 
  };

  return (
    <AuthContext.Provider value={{ userAccount, user: userAccount, loading, logout, refreshUserAccount, signInWithGoogle, signInWithEmail, loginAsDemo, switchSchool, createSchoolUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) { throw new Error('useAuth must be used within an AuthProvider'); }
  return context;
};