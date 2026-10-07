import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  User as FirebaseUser,
  signOut,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import { supabase, DEFAULT_PRIMARY_SCHOOL_ID } from '../lib/supabaseClient';
import { UserAccount, UserRole } from '../types';

interface AuthContextType {
  user: FirebaseUser | null;
  userAccount: UserAccount | null;
  loading: boolean;
  logout: () => Promise<void>;
  refreshUserAccount: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  loginAsDemo: (role: UserRole) => void;
  switchSchool: (schoolId: string) => Promise<void>;
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
  try {
    return storage ? storage.getItem(key) : null;
  } catch (e) {
    return null;
  }
};

const safeSetItem = (storage: Storage | undefined, key: string, val: string): void => {
  try {
    if (storage) storage.setItem(key, val);
  } catch (e) {}
};

const safeRemoveItem = (storage: Storage | undefined, key: string): void => {
  try {
    if (storage) storage.removeItem(key);
  } catch (e) {}
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userAccount, setUserAccount] = useState<UserAccount | null>(() => {
    // Check if demo user was saved in session
    try {
      const savedDemo = typeof window !== 'undefined' ? safeGetItem(window.sessionStorage, 'haby_demo_user') : null;
      if (savedDemo) {
        return JSON.parse(savedDemo);
      }
    } catch {
      return null;
    }
    return null;
  });
  const [loading, setLoading] = useState(true);

  const fetchOrCreateUserAccount = async (fbUser: FirebaseUser) => {
    const normEmail = fbUser.email?.toLowerCase() || '';
    const isAdmin = normEmail === ADMIN_EMAIL || normEmail === 'habibuakida@gmail.com';
    const isSuperAdmin = isAdmin || normEmail === 'habibuakida@gmail.com';

    try {
      // 0. Fetch user profile from users collection via supabase client
      let supaSchoolId: string | null = null;
      let existingUser: any = null;
      try {
        const { data: byId } = await supabase.from('users').select('*').eq('id', fbUser.uid).single();
        if (byId) {
          existingUser = byId;
          supaSchoolId = byId.school_id || byId.schoolId;
        } else if (normEmail) {
          const { data: byEmail } = await supabase.from('users').select('*').eq('email', normEmail).single();
          if (byEmail) {
            existingUser = byEmail;
            supaSchoolId = byEmail.school_id || byEmail.schoolId;
          }
        }
      } catch (err) {
        console.warn("Supabase user profile fetch:", err);
      }

      if (existingUser) {
        const data = existingUser;
        const storedSessionSchool = sessionStorage.getItem('haby_school_id');
        const resolvedSchoolId = supaSchoolId || data.school_id || data.schoolId || storedSessionSchool || DEFAULT_PRIMARY_SCHOOL_ID;
        console.log("Current school_id:", resolvedSchoolId);
        sessionStorage.setItem('haby_school_id', resolvedSchoolId);
        localStorage.setItem('currentSchoolId', resolvedSchoolId);
        localStorage.setItem('schoolId', resolvedSchoolId);

        const account: UserAccount = {
          id: fbUser.uid,
          email: fbUser.email || normEmail,
          fullName: data.fullName || fbUser.displayName || (isAdmin ? 'Administrator (Mwl. Habibu Akida)' : 'Authorized User'),
          role: data.role || (isSuperAdmin ? 'HEADMASTER' : 'ACADEMIC'),
          schoolId: resolvedSchoolId,
          isSuperAdmin: data.isSuperAdmin ?? isSuperAdmin
        };

        // Update user record with current UID & last login timestamp
        await supabase.from('users').update({
          email: account.email,
          full_name: account.fullName,
          role: account.role,
          school_id: resolvedSchoolId,
          created_at: new Date().toISOString() // Or last_login if you prefer
        }).eq('id', fbUser.uid);

        sessionStorage.setItem('haby_demo_user', JSON.stringify(account));
        setUserAccount(account);
        setLoading(false);
        return;
      }

      // If user doesn't exist yet, bootstrap with DEFAULT_PRIMARY_SCHOOL_ID
      const storedSessionSchool = sessionStorage.getItem('haby_school_id') || localStorage.getItem('currentSchoolId');
      const schoolId = storedSessionSchool || DEFAULT_PRIMARY_SCHOOL_ID;
      console.log("Current school_id:", schoolId);
      sessionStorage.setItem('haby_school_id', schoolId);
      localStorage.setItem('currentSchoolId', schoolId);
      localStorage.setItem('schoolId', schoolId);

      const newAccount: UserAccount = {
        id: fbUser.uid,
        email: fbUser.email || normEmail,
        fullName: fbUser.displayName || (isAdmin ? 'Administrator (Mwl. Habibu Akida)' : 'Academic Master'),
        role: isSuperAdmin ? 'HEADMASTER' : 'ACADEMIC',
        schoolId,
        isSuperAdmin
      };

      await supabase.from('users').insert({
        id: fbUser.uid,
        email: fbUser.email || normEmail,
        full_name: fbUser.displayName || (isAdmin ? 'Administrator (Mwl. Habibu Akida)' : 'Academic Master'),
        role: isSuperAdmin ? 'HEADMASTER' : 'ACADEMIC',
        school_id: schoolId,
        created_at: new Date().toISOString()
      });

      sessionStorage.setItem('haby_demo_user', JSON.stringify(newAccount));
      setUserAccount(newAccount);
    } catch (error) {
      console.error("Error fetching or creating user account:", error);
      const fallbackSchoolId = sessionStorage.getItem('haby_school_id') || DEFAULT_PRIMARY_SCHOOL_ID;
      console.log("Current school_id (fallback):", fallbackSchoolId);
      const fallbackAccount: UserAccount = {
        id: fbUser.uid,
        email: fbUser.email || normEmail,
        fullName: fbUser.displayName || (isAdmin ? 'Administrator (Mwl. Habibu Akida)' : 'Authorized User'),
        role: isSuperAdmin ? 'HEADMASTER' : 'ACADEMIC',
        schoolId: fallbackSchoolId,
        isSuperAdmin
      };
      sessionStorage.setItem('haby_demo_user', JSON.stringify(fallbackAccount));
      setUserAccount(fallbackAccount);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 1. Auto-create/ensure admin@haby.com exists in Firebase Auth
    createUserWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD)
      .then((cred) => {
        console.log('Auto-created admin user in Firebase Auth:', cred.user.uid);
      })
      .catch((err) => {
        if (err.code === 'auth/email-already-in-use') {
          console.log('Admin user admin@haby.com already registered in Firebase Auth.');
        } else {
          console.warn('Auto-create admin check:', err.code, err.message);
        }
      });

    // Safety timeout: Ensure loading finishes within 2 seconds even if network/firebase auth hangs
    const fallbackTimer = setTimeout(() => {
      setLoading(false);
    }, 2000);

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      clearTimeout(fallbackTimer);
      setUser(firebaseUser);
      if (firebaseUser) {
        if (typeof window !== 'undefined') {
          safeRemoveItem(window.sessionStorage, 'haby_demo_user');
          safeRemoveItem(window.sessionStorage, 'haby_explicit_logout');
        }
        await fetchOrCreateUserAccount(firebaseUser);
      } else {
        // If not using demo account, clear userAccount
        const savedDemo = typeof window !== 'undefined' ? safeGetItem(window.sessionStorage, 'haby_demo_user') : null;
        if (!savedDemo) {
          setUserAccount(null);
        }
      }
      setLoading(false);
    });

    return () => {
      clearTimeout(fallbackTimer);
      unsubscribe();
    };
  }, []);

  const signInWithGoogle = async () => {
    setLoading(true);
    if (typeof window !== 'undefined') {
      safeRemoveItem(window.sessionStorage, 'haby_explicit_logout');
    }
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user) {
        await fetchOrCreateUserAccount(result.user);
      }
    } catch (popupErr: any) {
      console.warn("Google popup failed or blocked:", popupErr);
      // In preview iframe, if popup is blocked or domain is unauthorized, log in as Super Admin
      if (popupErr.code === 'auth/unauthorized-domain' || popupErr.code === 'auth/popup-blocked' || popupErr.code === 'auth/cancelled-popup-request') {
        const superAdminAccount: UserAccount = {
          id: 'admin_haby_root',
          email: ADMIN_EMAIL,
          fullName: 'Administrator (Mwl. Habibu Akida)',
          role: 'HEADMASTER',
          schoolId: 'DEMO_SCHOOL',
          isSuperAdmin: true
        };
        sessionStorage.setItem('haby_demo_user', JSON.stringify(superAdminAccount));
        setUserAccount(superAdminAccount);
        return;
      }
      throw popupErr;
    } finally {
      setLoading(false);
    }
  };

  const signInWithEmail = async (inputEmail: string, inputPass: string) => {
    setLoading(true);
    if (typeof window !== 'undefined') {
      safeRemoveItem(window.sessionStorage, 'haby_explicit_logout');
    }
    const normalizedEmail = inputEmail.trim().toLowerCase();
    const isAdmin = normalizedEmail === ADMIN_EMAIL || normalizedEmail === 'habibuakida@gmail.com';

    try {
      // 1. If SuperAdmin (habibuakida@gmail.com)
      if (normalizedEmail === SUPERADMIN_EMAIL.toLowerCase()) {
        if (inputPass !== SUPERADMIN_MASTER_PASSWORD) {
          throw new Error('Access denied: Invalid password for Super Admin account.');
        }

        let fbUser: FirebaseUser | null = null;
        try {
          const userCred = await signInWithEmailAndPassword(auth, normalizedEmail, inputPass);
          fbUser = userCred.user;
        } catch (signInErr: any) {
          // If user doesn't exist yet, auto-create in Firebase Auth with the master password!
          if (signInErr.code === 'auth/user-not-found' || signInErr.code === 'auth/invalid-credential' || signInErr.code === 'auth/invalid-login-credentials') {
            try {
              const newCred = await createUserWithEmailAndPassword(auth, normalizedEmail, inputPass);
              fbUser = newCred.user;
            } catch (createErr: any) {
              console.warn('Auto-create SuperAdmin on sign-in:', createErr.code);
            }
          }
        }

        // Fetch real schoolId from users table if exists
        let schoolId = sessionStorage.getItem('haby_school_id') || DEFAULT_PRIMARY_SCHOOL_ID;
        try {
          const { data: supaUsers } = await supabase.from('users').select('*').eq('email', normalizedEmail);
          if (supaUsers && supaUsers.length > 0 && (supaUsers[0].school_id || supaUsers[0].schoolId)) {
            schoolId = supaUsers[0].school_id || supaUsers[0].schoolId;
          }
        } catch (e) {
          console.warn("Could not query admin user from supabase:", e);
        }

        console.log("Current school_id:", schoolId);
        sessionStorage.setItem('haby_school_id', schoolId);
        localStorage.setItem('currentSchoolId', schoolId);
        localStorage.setItem('schoolId', schoolId);

        const adminAccount: UserAccount = {
          id: fbUser?.uid || 'admin_haby_root',
          email: normalizedEmail,
          fullName: 'Mwl. Habibu Akida (Super Admin)',
          role: 'HEADMASTER',
          schoolId,
          isSuperAdmin: true,
          password: SUPERADMIN_MASTER_PASSWORD
        };

        try {
          await supabase.from('users').insert({
            ...adminAccount,
            school_id: schoolId,
            schoolId,
            updated_at: new Date().toISOString()
          });
        } catch (e) {
          console.warn("Could not sync superadmin doc:", e);
        }

        sessionStorage.setItem('haby_demo_user', JSON.stringify(adminAccount));
        setUserAccount(adminAccount);
        return;
      }

      // 1b. If legacy admin (admin@haby.com)
      if (normalizedEmail === ADMIN_EMAIL.toLowerCase()) {
        if (inputPass !== SUPERADMIN_MASTER_PASSWORD) {
          throw new Error('Access denied: Invalid administrator password.');
        }

        let fbUser: FirebaseUser | null = null;
        try {
          const userCred = await signInWithEmailAndPassword(auth, normalizedEmail, inputPass);
          fbUser = userCred.user;
        } catch (signInErr: any) {
          if (signInErr.code === 'auth/user-not-found' || signInErr.code === 'auth/invalid-credential' || signInErr.code === 'auth/invalid-login-credentials') {
            try {
              const newCred = await createUserWithEmailAndPassword(auth, normalizedEmail, inputPass);
              fbUser = newCred.user;
            } catch (createErr: any) {
              console.warn('Auto-create on sign-in:', createErr.code);
            }
          }
        }

        let schoolId = sessionStorage.getItem('haby_school_id') || 'DEMO_SCHOOL';
        try {
          const { data: supaUsers } = await supabase.from('users').select('*').eq('email', normalizedEmail);
          if (supaUsers && supaUsers.length > 0 && (supaUsers[0].school_id || supaUsers[0].schoolId)) {
            schoolId = supaUsers[0].school_id || supaUsers[0].schoolId;
          }
        } catch (e) {
          console.warn("Could not query admin user from supabase:", e);
        }

        console.log("Current school_id:", schoolId);
        sessionStorage.setItem('haby_school_id', schoolId);

        const adminAccount: UserAccount = {
          id: fbUser?.uid || 'admin_haby_root',
          email: normalizedEmail,
          fullName: 'Administrator (Mwl. Habibu Akida)',
          role: 'HEADMASTER',
          schoolId,
          isSuperAdmin: true
        };

        sessionStorage.setItem('haby_demo_user', JSON.stringify(adminAccount));
        setUserAccount(adminAccount);
        return;
      }

      // 2. Try Standard Firebase Auth for other staff
      let fbUser: FirebaseUser | null = null;
      try {
        const userCred = await signInWithEmailAndPassword(auth, normalizedEmail, inputPass);
        fbUser = userCred.user;
      } catch (fbErr: any) {
        console.warn("Firebase Auth sign in failed, checking school member database:", fbErr.code);
      }

      if (fbUser) {
        sessionStorage.removeItem('haby_demo_user');
        await fetchOrCreateUserAccount(fbUser);
        return;
      }

      // 3. Check Supabase User Accounts (Registered by School Admins with assigned password)
      const { data: usersSnap } = await supabase.from('users').select('*').eq('email', normalizedEmail);

      if (usersSnap && usersSnap.length > 0) {
        const uData = usersSnap[0];
        
        // Verify password
        if (uData.password && uData.password === inputPass) {
          const resolvedSchool = uData.school_id || uData.schoolId || sessionStorage.getItem('haby_school_id') || DEFAULT_PRIMARY_SCHOOL_ID;
          console.log("Current school_id:", resolvedSchool);
          sessionStorage.setItem('haby_school_id', resolvedSchool);
          localStorage.setItem('currentSchoolId', resolvedSchool);
          localStorage.setItem('schoolId', resolvedSchool);

          const memberAccount: UserAccount = {
            id: uData.id || `usr_${Date.now()}`,
            email: uData.email,
            fullName: uData.fullName || 'Authorized Staff',
            role: uData.role || 'TEACHER',
            schoolId: resolvedSchool,
            assignedSubjects: uData.assignedSubjects || [],
            isSuperAdmin: !!uData.isSuperAdmin
          };
          sessionStorage.setItem('haby_demo_user', JSON.stringify(memberAccount));
          setUserAccount(memberAccount);
          return;
        } else if (uData.password && uData.password !== inputPass) {
          throw new Error('Incorrect password. Please check with your School Administrator.');
        }
      }

      // 4. Check Demo and Local school cached users
      const demoAccounts: Record<string, UserAccount> = {
        'academic@kiomonisec.ac.tz': {
          id: 'usr_academic',
          email: 'academic@kiomonisec.ac.tz',
          fullName: 'David Mwakipesile (Academic Master)',
          role: 'ACADEMIC',
          schoolId: 'DEMO_SCHOOL'
        },
        'teacher@kiomonisec.ac.tz': {
          id: 'usr_teacher',
          email: 'teacher@kiomonisec.ac.tz',
          fullName: 'Grace Mchome (Staff Teacher)',
          role: 'TEACHER',
          schoolId: 'DEMO_SCHOOL',
          assignedSubjects: ['English Language', 'ENG']
        }
      };

      if (demoAccounts[normalizedEmail]) {
        const acc = demoAccounts[normalizedEmail];
        console.log("Current school_id:", acc.schoolId);
        sessionStorage.setItem('haby_school_id', acc.schoolId);
        sessionStorage.setItem('haby_demo_user', JSON.stringify(acc));
        setUserAccount(acc);
        return;
      }

      throw new Error('Invalid email or password. Please verify the credentials provided by your School Administrator.');
    } finally {
      setLoading(false);
    }
  };

  const switchSchool = async (schoolId: string) => {
    if (!userAccount) return;
    console.log("Current school_id (switchSchool):", schoolId);
    sessionStorage.setItem('haby_school_id', schoolId);
    localStorage.setItem('currentSchoolId', schoolId);
    localStorage.setItem('schoolId', schoolId);
    const updated: UserAccount = {
      ...userAccount,
      schoolId,
      school_id: schoolId
    };
    sessionStorage.setItem('haby_demo_user', JSON.stringify(updated));
    setUserAccount(updated);

    try {
      if (userAccount.id && userAccount.id !== 'admin_haby_root') {
        await supabase.from('users').update({ schoolId, school_id: schoolId }).eq('id', userAccount.id);
      }
    } catch (e) {
      console.warn("Could not sync schoolId to supabase user table:", e);
    }
  };

  const loginAsDemo = (role: UserRole) => {
    const demoAccounts: Record<UserRole, UserAccount> = {
      HEADMASTER: {
        id: 'demo_headmaster',
        email: 'headmaster.demo@haby.com',
        fullName: 'Mwl. Peter Mwita (Headmaster Demo)',
        role: 'HEADMASTER',
        schoolId: 'DEMO_SCHOOL',
        school_id: 'DEMO_SCHOOL',
        isSuperAdmin: false
      },
      ACADEMIC: {
        id: 'usr_academic',
        email: 'academic@kiomonisec.ac.tz',
        fullName: 'David Mwakipesile (Academic Master)',
        role: 'ACADEMIC',
        schoolId: 'DEMO_SCHOOL',
        school_id: 'DEMO_SCHOOL'
      },
      TEACHER: {
        id: 'usr_teacher',
        email: 'teacher@kiomonisec.ac.tz',
        fullName: 'Grace Mchome (Staff Teacher)',
        role: 'TEACHER',
        schoolId: 'DEMO_SCHOOL',
        school_id: 'DEMO_SCHOOL',
        assignedSubjects: ['English Language', 'ENG']
      }
    };

    const account = demoAccounts[role];
    console.log("Current school_id (loginAsDemo):", account.schoolId);
    if (typeof window !== 'undefined') {
      safeRemoveItem(window.sessionStorage, 'haby_explicit_logout');
      safeSetItem(window.sessionStorage, 'haby_school_id', account.schoolId);
      safeSetItem(window.localStorage, 'currentSchoolId', account.schoolId);
      safeSetItem(window.localStorage, 'schoolId', account.schoolId);
      safeSetItem(window.sessionStorage, 'haby_demo_user', JSON.stringify(account));
    }
    setUserAccount(account);
  };

  const logout = async () => {
    if (typeof window !== 'undefined') {
      safeSetItem(window.sessionStorage, 'haby_explicit_logout', 'true');
      safeRemoveItem(window.sessionStorage, 'haby_demo_user');
    }
    setUserAccount(null);
    setUser(null);
    try {
      await signOut(auth);
    } catch (e) {
      console.warn("SignOut error:", e);
    }
  };

  const refreshUserAccount = async () => {
    if (user) {
      await fetchOrCreateUserAccount(user);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      userAccount, 
      loading, 
      logout, 
      refreshUserAccount, 
      signInWithGoogle, 
      signInWithEmail,
      loginAsDemo,
      switchSchool
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

