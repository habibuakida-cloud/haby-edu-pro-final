import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  User as FirebaseUser,
  signOut,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  getAuth
} from 'firebase/auth';
import { doc, getDoc, getDocs, collection, query, where, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, googleProvider, firebaseConfig } from '../lib/firebase';
import { supabase, DEFAULT_PRIMARY_SCHOOL_ID } from '../lib/supabaseClient';
import { UserAccount, UserRole } from '../types';
import { initializeApp, deleteApp } from 'firebase/app';

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
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userAccount, setUserAccount] = useState<UserAccount | null>(() => {
    try {
      const savedDemo = typeof window!== 'undefined'? safeGetItem(window.sessionStorage, 'haby_demo_user') : null;
      if (savedDemo) { return JSON.parse(savedDemo); }
    } catch { return DEFAULT_SUPERADMIN_ACCOUNT; }
    return DEFAULT_SUPERADMIN_ACCOUNT;
  });
  const [loading, setLoading] = useState(false);

  const fetchOrCreateUserAccount = async (fbUser: FirebaseUser) => {
    const normEmail = fbUser.email?.toLowerCase().trim() || '';
    const isAdmin = normEmail === ADMIN_EMAIL || normEmail === 'habibuakida@gmail.com';
    const isSuperAdmin = isAdmin || normEmail === 'habibuakida@gmail.com';

    console.log("[Auth] Step 2: Fetching user profile from Firestore for UID:", fbUser.uid, "email:", normEmail);

    try {
      let existingUser: any = null;
      let resolvedSchoolId: string | null = null;

      // 1. Primary lookup: Firestore users collection using Auth UID
      try {
        const userDocRef = doc(db, "users", fbUser.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          const data = userDoc.data();
          console.log("[Auth] Found user document in Firestore 'users' by UID:", fbUser.uid, data);
          if (data.isActive === false) {
            throw new Error("Akaunti yako imezimwa (Account is inactive). Wasiliana na uongozi wa shule.");
          }
          existingUser = data;
          resolvedSchoolId = data.schoolId || data.school_id;
        }
      } catch (docErr: any) {
        if (docErr.message && docErr.message.includes("Akaunti yako imezimwa")) {
          throw docErr;
        }
        console.warn("[Auth] Direct UID lookup in 'users' errored/failed:", docErr);
      }

      // 2. Secondary lookup: Firestore schoolAdmins collection using Auth UID
      if (!existingUser) {
        try {
          const adminDocRef = doc(db, "schoolAdmins", fbUser.uid);
          const adminDoc = await getDoc(adminDocRef);
          if (adminDoc.exists()) {
            const data = adminDoc.data();
            console.log("[Auth] Found user in 'schoolAdmins' collection by UID:", fbUser.uid, data);
            existingUser = data;
            resolvedSchoolId = data.schoolId || data.school_id;
            // Backfill into users collection for fast direct UID lookup next time
            await setDoc(doc(db, "users", fbUser.uid), {
              ...data,
              uid: fbUser.uid,
              id: fbUser.uid
            }, { merge: true }).catch(() => {});
          }
        } catch (admErr) {
          console.warn("[Auth] Direct UID lookup in 'schoolAdmins' errored:", admErr);
        }
      }

      // 3. Fallback: Search Firestore users collection by email query
      if (!existingUser && normEmail) {
        try {
          console.log("[Auth] Searching 'users' collection by email query:", normEmail);
          const q = query(collection(db, 'users'), where('email', '==', normEmail));
          const qSnap = await getDocs(q);
          if (!qSnap.empty) {
            const data = qSnap.docs[0].data();
            console.log("[Auth] Found user document in 'users' by email:", data);
            existingUser = data;
            resolvedSchoolId = data.schoolId || data.school_id;
            // Link UID document so future lookups by UID succeed instantly!
            await setDoc(doc(db, "users", fbUser.uid), {
              ...data,
              uid: fbUser.uid,
              id: fbUser.uid
            }, { merge: true }).catch(() => {});
          }
        } catch (emailErr) {
          console.warn("[Auth] Email query lookup in 'users' errored:", emailErr);
        }
      }

      // 4. Fallback: Search Supabase users table
      if (!existingUser) {
        try {
          const { data: byId } = await supabase.from('users').select('*').eq('id', fbUser.uid).maybeSingle();
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
          id: fbUser.uid,
          email: fbUser.email || normEmail,
          fullName: data.fullName || data.displayName || fbUser.displayName || (isAdmin ? 'Administrator (Mwl. Habibu Akida)' : 'Authorized User'),
          role: accountRole,
          schoolId: finalSchoolId,
          school_id: finalSchoolId,
          assignedSubjects: data.assignedSubjects || [],
          isSuperAdmin: data.isSuperAdmin ?? isSuperAdmin
        };

        sessionStorage.setItem('haby_demo_user', JSON.stringify(account));
        setUserAccount(account);
        console.log("[Auth] Profile established successfully:", account);
        setLoading(false);
        return;
      }

      // Super Admin fallback
      if (isSuperAdmin) {
        const schoolId = sessionStorage.getItem('haby_school_id') || DEFAULT_PRIMARY_SCHOOL_ID;
        const adminAccount: UserAccount = {
          id: fbUser.uid,
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

      // Required error if document is missing in Firestore
      console.error("[Auth Error] User profile not found in Firestore for UID:", fbUser.uid, "email:", normEmail);
      throw new Error("User profile not found in Firestore");
    } catch (error: any) {
      console.error("[Auth Error] Error fetching user profile:", error);
      setLoading(false);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    createUserWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD).then((cred) => {
      console.log('Auto-created admin user in Firebase Auth:', cred.user.uid);
    }).catch((err) => {
      if (err.code === 'auth/email-already-in-use') { console.log('Admin user already registered'); }
    });

    const fallbackTimer = setTimeout(() => { setLoading(false); }, 2000);

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      clearTimeout(fallbackTimer);
      if (firebaseUser) {
        setUser(firebaseUser);
        if (typeof window !== 'undefined') {
          safeRemoveItem(window.sessionStorage, 'haby_demo_user');
          safeRemoveItem(window.sessionStorage, 'haby_explicit_logout');
        }
        try {
          await fetchOrCreateUserAccount(firebaseUser);
        } catch (fetchErr: any) {
          console.error("[Auth] onAuthStateChanged profile load failed:", fetchErr);
          // Crucial: Sign out so the user isn't stuck with a broken/empty session
          await signOut(auth).catch(() => {});
          setUser(null);
          setUserAccount(null);
        }
      } else {
        setUser(null);
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

  // ==== FUNCTION YA KUSAJILI USER - ATOMIC AUTH + FIRESTORE ====
  const createSchoolUser = async (email: string, password: string, displayName: string, role: UserRole): Promise<boolean> => {
    const adminSchoolId = userAccount?.schoolId || localStorage.getItem('currentSchoolId') || localStorage.getItem('schoolId') || DEFAULT_PRIMARY_SCHOOL_ID;
    if (!adminSchoolId) throw new Error("Admin hana schoolId - tafadhali login tena");

    const normalizedEmail = email.toLowerCase().trim();
    console.log("[createSchoolUser] Registering user in Firebase Auth & Firestore:", { email: normalizedEmail, role, adminSchoolId });

    const secondaryApp = initializeApp(firebaseConfig, `secondary-user-${Date.now()}`);
    const secondaryAuth = getAuth(secondaryApp);

    try {
      let newUid: string;
      try {
        const cred = await createUserWithEmailAndPassword(secondaryAuth, normalizedEmail, password);
        newUid = cred.user.uid;
        console.log("[createSchoolUser] Created Firebase Auth user with UID:", newUid);
      } catch (authErr: any) {
        if (authErr.code === 'auth/email-already-in-use') {
          try {
            const existingCred = await signInWithEmailAndPassword(secondaryAuth, normalizedEmail, password);
            newUid = existingCred.user.uid;
            console.log("[createSchoolUser] Email in use, retrieved existing UID:", newUid);
          } catch (signInErr: any) {
            const q = query(collection(db, 'users'), where('email', '==', normalizedEmail));
            const qSnap = await getDocs(q);
            if (!qSnap.empty) {
              newUid = qSnap.docs[0].id;
            } else {
              throw new Error(`Email "${normalizedEmail}" is already registered in Firebase Authentication. Please use a different email or provide the existing password.`);
            }
          }
        } else {
          throw authErr;
        }
      }

      const userDocData = {
        uid: newUid,
        id: newUid,
        email: normalizedEmail,
        displayName: displayName.trim(),
        fullName: displayName.trim(),
        role: String(role).toUpperCase(),
        schoolId: adminSchoolId,
        school_id: adminSchoolId,
        isActive: true,
        isSuperAdmin: false,
        password: password.trim(),
        createdAt: serverTimestamp(),
        createdBy: auth.currentUser?.uid || userAccount?.id || 'admin'
      };

      // 1. users collection: ID MUST be newUid
      await setDoc(doc(db, "users", newUid), userDocData);
      console.log("[createSchoolUser] Created Firestore users document:", newUid);

      // 2. schoolAdmins collection if role is HEADMASTER or ADMIN
      if (role === 'HEADMASTER') {
        await setDoc(doc(db, "schoolAdmins", newUid), userDocData);
      }

      // 3. schools/{schoolId}/authorizedStaff/{newUid}
      await setDoc(doc(db, `schools/${adminSchoolId}/authorizedStaff`, newUid), {
        uid: newUid,
        id: newUid,
        staffIdentity: displayName.trim(),
        fullName: displayName.trim(),
        authEmail: normalizedEmail,
        email: normalizedEmail,
        role: String(role).toUpperCase(),
        assignedPassword: password.trim(),
        assignedSubjects: [],
        schoolId: adminSchoolId,
        isAuthorized: true,
        isActive: true,
        createdAt: serverTimestamp()
      });

      // 4. Mirror to Supabase
      try {
        await supabase.from('users').upsert({
          id: newUid,
          email: normalizedEmail,
          full_name: displayName.trim(),
          role: String(role).toUpperCase(),
          school_id: adminSchoolId,
          schoolId: adminSchoolId,
          created_at: new Date().toISOString()
        });
      } catch (e) {
        console.warn("Supabase user insert warning:", e);
      }

      await signOut(secondaryAuth);
      await deleteApp(secondaryApp);
      return true;
    } catch (error: any) {
      await deleteApp(secondaryApp).catch(() => {});
      console.error("[createSchoolUser Error]:", error);
      throw error;
    }
  };

  const signInWithGoogle = async () => {
    setLoading(true);
    if (typeof window!== 'undefined') { safeRemoveItem(window.sessionStorage, 'haby_explicit_logout'); }
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user) { await fetchOrCreateUserAccount(result.user); }
    } catch (popupErr: any) {
      if (popupErr.code === 'auth/unauthorized-domain' || popupErr.code === 'auth/popup-blocked') {
        const superAdminAccount: UserAccount = { id: 'admin_haby_root', email: ADMIN_EMAIL, fullName: 'Administrator (Mwl. Habibu Akida)', role: 'HEADMASTER', schoolId: DEFAULT_PRIMARY_SCHOOL_ID, isSuperAdmin: true };
        sessionStorage.setItem('haby_school_id', DEFAULT_PRIMARY_SCHOOL_ID);
        localStorage.setItem('currentSchoolId', DEFAULT_PRIMARY_SCHOOL_ID);
        sessionStorage.setItem('haby_demo_user', JSON.stringify(superAdminAccount));
        setUserAccount(superAdminAccount);
        return;
      }
      throw popupErr;
    } finally { setLoading(false); }
  };

  const signInWithEmail = async (inputEmail: string, inputPass: string) => {
    setLoading(true);
    if (typeof window!== 'undefined') { safeRemoveItem(window.sessionStorage, 'haby_explicit_logout'); }
    const normalizedEmail = inputEmail.trim().toLowerCase();
    try {
      if (normalizedEmail === SUPERADMIN_EMAIL.toLowerCase()) {
        if (inputPass!== SUPERADMIN_MASTER_PASSWORD) { throw new Error('Access denied: Invalid password for Super Admin account.'); }
        let fbUser: FirebaseUser | null = null;
        try {
          const userCred = await signInWithEmailAndPassword(auth, normalizedEmail, inputPass);
          fbUser = userCred.user;
        } catch (signInErr: any) {
          if (signInErr.code === 'auth/user-not-found' || signInErr.code === 'auth/invalid-credential') {
            const newCred = await createUserWithEmailAndPassword(auth, normalizedEmail, inputPass);
            fbUser = newCred.user;
          }
        }
        let schoolId = sessionStorage.getItem('haby_school_id') || DEFAULT_PRIMARY_SCHOOL_ID;
        try {
          const { data: supaUsers } = await supabase.from('users').select('*').eq('email', normalizedEmail);
          if (supaUsers && supaUsers.length > 0) { schoolId = supaUsers[0].school_id || supaUsers[0].schoolId; }
        } catch (e) {}
        sessionStorage.setItem('haby_school_id', schoolId);
        localStorage.setItem('currentSchoolId', schoolId);
        const adminAccount: UserAccount = { id: fbUser?.uid || 'admin_haby_root', email: normalizedEmail, fullName: 'Mwl. Habibu Akida (Super Admin)', role: 'HEADMASTER', schoolId, isSuperAdmin: true, password: SUPERADMIN_MASTER_PASSWORD };
        sessionStorage.setItem('haby_demo_user', JSON.stringify(adminAccount));
        setUserAccount(adminAccount);
        return;
      }
      if (normalizedEmail === ADMIN_EMAIL.toLowerCase()) {
        if (inputPass!== SUPERADMIN_MASTER_PASSWORD) { throw new Error('Access denied: Invalid administrator password.'); }
        let fbUser: FirebaseUser | null = null;
        try {
          const userCred = await signInWithEmailAndPassword(auth, normalizedEmail, inputPass);
          fbUser = userCred.user;
        } catch (signInErr: any) {
          if (signInErr.code === 'auth/user-not-found' || signInErr.code === 'auth/invalid-credential') {
            const newCred = await createUserWithEmailAndPassword(auth, normalizedEmail, inputPass);
            fbUser = newCred.user;
          }
        }
        let schoolId = sessionStorage.getItem('haby_school_id') || localStorage.getItem('currentSchoolId') || DEFAULT_PRIMARY_SCHOOL_ID;
        sessionStorage.setItem('haby_school_id', schoolId);
        localStorage.setItem('currentSchoolId', schoolId);
        const adminAccount: UserAccount = { id: fbUser?.uid || 'admin_haby_root', email: normalizedEmail, fullName: 'Administrator (Mwl. Habibu Akida)', role: 'HEADMASTER', schoolId, isSuperAdmin: true };
        sessionStorage.setItem('haby_demo_user', JSON.stringify(adminAccount));
        setUserAccount(adminAccount);
        return;
      }
      let fbUser: FirebaseUser | null = null;
      let fbAuthError: any = null;
      try {
        console.log("[Login] Step 1: Attempting signInWithEmailAndPassword for:", normalizedEmail);
        const userCred = await signInWithEmailAndPassword(auth, normalizedEmail, inputPass);
        fbUser = userCred.user;
        console.log("[Login] Step 1 Success: Firebase Auth signed in, UID:", fbUser.uid);
      } catch (fbErr: any) {
        fbAuthError = fbErr;
        console.warn("[Login] Firebase Auth signIn error:", fbErr.code, fbErr.message);
      }

      if (fbUser) {
        sessionStorage.removeItem('haby_demo_user');
        try {
          console.log("[Login] Step 2: Fetching user profile from Firestore for UID:", fbUser.uid);
          await fetchOrCreateUserAccount(fbUser);
          console.log("[Login] Step 2 Success: User profile loaded and authorized!");
          return;
        } catch (fetchErr: any) {
          console.error("[Login Error] Profile fetch failed for UID:", fbUser.uid, fetchErr);
          // Sign out immediately so Firebase Auth session isn't left hanging in limbo
          await signOut(auth).catch(() => {});
          setUser(null);
          setUserAccount(null);
          throw fetchErr;
        }
      }

      // Check fallback user in Supabase if not found in Firebase Auth
      try {
        const { data: usersSnap } = await supabase.from('users').select('*').eq('email', normalizedEmail);
        if (usersSnap && usersSnap.length > 0) {
          const uData = usersSnap[0];
          if (uData.password && uData.password === inputPass) {
            const resolvedSchool = uData.school_id || uData.schoolId || DEFAULT_PRIMARY_SCHOOL_ID;
            sessionStorage.setItem('haby_school_id', resolvedSchool);
            localStorage.setItem('currentSchoolId', resolvedSchool);
            const memberAccount: UserAccount = {
              id: uData.id,
              email: uData.email,
              fullName: uData.fullName || uData.full_name || 'Authorized Staff',
              role: (uData.role || 'TEACHER').toUpperCase(),
              schoolId: resolvedSchool,
              school_id: resolvedSchool,
              assignedSubjects: uData.assignedSubjects || [],
              isSuperAdmin: !!uData.isSuperAdmin
            };
            sessionStorage.setItem('haby_demo_user', JSON.stringify(memberAccount));
            setUserAccount(memberAccount);
            return;
          }
        }
      } catch (supaErr) {
        console.warn("[Login] Supabase lookup error:", supaErr);
      }

      if (fbAuthError) {
        if (fbAuthError.code === 'auth/invalid-credential' || fbAuthError.code === 'auth/wrong-password') {
          throw new Error('Invalid email or password.');
        } else if (fbAuthError.code === 'auth/user-not-found') {
          throw new Error('No user account found with this email.');
        } else if (fbAuthError.code === 'auth/too-many-requests') {
          throw new Error('Too many failed login attempts. Please try again in a few minutes.');
        } else {
          throw new Error(fbAuthError.message || 'Authentication failed. Please verify your credentials.');
        }
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
      HEADMASTER: { id: 'demo_headmaster', email: 'headmaster.demo@haby.com', fullName: 'Mwl. Peter Mwita (Headmaster Demo)', role: 'HEADMASTER', schoolId: DEFAULT_PRIMARY_SCHOOL_ID, school_id: DEFAULT_PRIMARY_SCHOOL_ID, isSuperAdmin: false },
      ACADEMIC: { id: 'usr_academic', email: 'academic@kiomonisec.ac.tz', fullName: 'David Mwakipesile (Academic Master)', role: 'ACADEMIC', schoolId: DEFAULT_PRIMARY_SCHOOL_ID, school_id: DEFAULT_PRIMARY_SCHOOL_ID },
      TEACHER: { id: 'usr_teacher', email: 'teacher@kiomonisec.ac.tz', fullName: 'Grace Mchome (Staff Teacher)', role: 'TEACHER', schoolId: DEFAULT_PRIMARY_SCHOOL_ID, school_id: DEFAULT_PRIMARY_SCHOOL_ID, assignedSubjects: ['English Language', 'ENG'] }
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
    setUser(null);
    try { await signOut(auth); } catch (e) {}
  };

  const refreshUserAccount = async () => { if (user) { await fetchOrCreateUserAccount(user); } };

  return (
    <AuthContext.Provider value={{ user, userAccount, loading, logout, refreshUserAccount, signInWithGoogle, signInWithEmail, loginAsDemo, switchSchool, createSchoolUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) { throw new Error('useAuth must be used within an AuthProvider'); }
  return context;
};