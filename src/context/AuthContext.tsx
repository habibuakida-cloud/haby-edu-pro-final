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
    const normEmail = fbUser.email?.toLowerCase() || '';
    const isAdmin = normEmail === ADMIN_EMAIL || normEmail === 'habibuakida@gmail.com';
    const isSuperAdmin = isAdmin || normEmail === 'habibuakida@gmail.com';
    try {
      console.log("Fetching user profile from Firestore for UID:", fbUser.uid, "email:", normEmail);
      let existingUser: any = null;
      let resolvedSchoolId: string | null = null;
      try {
        const userDocRef = doc(db, "users", fbUser.uid);
        const userDoc = await getDoc(userDocRef);
        if (!userDoc.exists() || userDoc.data().isActive === false) {
          if (!isSuperAdmin) { throw new Error("User profile not found or inactive"); }
        }
        if (userDoc.exists()) {
          const data = userDoc.data();
          if (!data.schoolId &&!isSuperAdmin) { throw new Error("User schoolId missing"); }
          existingUser = data;
          resolvedSchoolId = data.schoolId || data.school_id;
        } else {
          const q = query(collection(db, 'users'), where('email', '==', normEmail));
          const qSnap = await getDocs(q);
          if (!qSnap.empty) {
            existingUser = qSnap.docs[0].data();
            resolvedSchoolId = existingUser.schoolId || existingUser.school_id;
          }
        }
      } catch (firestoreErr: any) {
        console.warn("Firestore user fetch warning:", firestoreErr);
        if (!isSuperAdmin && firestoreErr.message && firestoreErr.message.includes("missing")) { throw firestoreErr; }
      }
      if (!existingUser) {
        try {
          const { data: byId } = await supabase.from('users').select('*').eq('id', fbUser.uid).single();
          if (byId) { existingUser = byId; resolvedSchoolId = byId.school_id || byId.schoolId; }
          else if (normEmail) {
            const { data: byEmail } = await supabase.from('users').select('*').eq('email', normEmail).single();
            if (byEmail) { existingUser = byEmail; resolvedSchoolId = byEmail.school_id || byEmail.schoolId; }
          }
        } catch (err) { console.warn("Supabase user profile fetch warning:", err); }
      }
      if (existingUser) {
        const data = existingUser;
        const storedSessionSchool = sessionStorage.getItem('haby_school_id');
        const finalSchoolId = resolvedSchoolId || data.school_id || data.schoolId || storedSessionSchool || DEFAULT_PRIMARY_SCHOOL_ID;
        sessionStorage.setItem('haby_school_id', finalSchoolId);
        localStorage.setItem('currentSchoolId', finalSchoolId);
        localStorage.setItem('schoolId', finalSchoolId);
        const account: UserAccount = {
          id: fbUser.uid,
          email: fbUser.email || normEmail,
          fullName: data.fullName || data.displayName || fbUser.displayName || (isAdmin? 'Administrator (Mwl. Habibu Akida)' : 'Authorized User'),
          role: data.role || (isSuperAdmin? 'HEADMASTER' : 'ACADEMIC'),
          schoolId: finalSchoolId,
          assignedSubjects: data.assignedSubjects || [],
          isSuperAdmin: data.isSuperAdmin?? isSuperAdmin
        };
        sessionStorage.setItem('haby_demo_user', JSON.stringify(account));
        setUserAccount(account);
        setLoading(false);
        return;
      }
      if (isSuperAdmin) {
        const schoolId = sessionStorage.getItem('haby_school_id') || DEFAULT_PRIMARY_SCHOOL_ID;
        const adminAccount: UserAccount = { id: fbUser.uid, email: normEmail, fullName: 'Administrator (Mwl. Habibu Akida)', role: 'HEADMASTER', schoolId, isSuperAdmin: true };
        sessionStorage.setItem('haby_school_id', schoolId);
        localStorage.setItem('currentSchoolId', schoolId);
        sessionStorage.setItem('haby_demo_user', JSON.stringify(adminAccount));
        setUserAccount(adminAccount);
        setLoading(false);
        return;
      }
      throw new Error("User profile not found in Firestore");
    } catch (error: any) {
      console.error("Error fetching user profile:", error);
      setLoading(false);
      throw error;
    } finally { setLoading(false); }
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
      setUser(firebaseUser);
      if (firebaseUser) {
        if (typeof window!== 'undefined') {
          safeRemoveItem(window.sessionStorage, 'haby_demo_user');
          safeRemoveItem(window.sessionStorage, 'haby_explicit_logout');
        }
        await fetchOrCreateUserAccount(firebaseUser);
      } else {
        const savedDemo = typeof window!== 'undefined'? safeGetItem(window.sessionStorage, 'haby_demo_user') : null;
        if (!savedDemo) { setUserAccount(null); }
      }
      setLoading(false);
    });
    return () => { clearTimeout(fallbackTimer); unsubscribe(); };
  }, []);

  // ==== FUNCTION MPYA YA KUSAJILI USER - HII NDIO FIX ====
  const createSchoolUser = async (email: string, password: string, displayName: string, role: UserRole): Promise<boolean> => {
    const adminSchoolId = userAccount?.schoolId || localStorage.getItem('currentSchoolId') || localStorage.getItem('schoolId') || DEFAULT_PRIMARY_SCHOOL_ID;
    if (!adminSchoolId) throw new Error("Admin hana schoolId - tafadhali login tena");

    console.log("Creating user for schoolId:", adminSchoolId);
    const secondaryApp = initializeApp(firebaseConfig, `secondary-${Date.now()}`);
    const secondaryAuth = getAuth(secondaryApp);

    try {
      const cred = await createUserWithEmailAndPassword(secondaryAuth, email.toLowerCase().trim(), password);
      const newUid = cred.user.uid;

      // 1. Kwa LOGIN - users/{uid} - LAZIMA
      await setDoc(doc(db, "users", newUid), {
        uid: newUid,
        email: email.toLowerCase().trim(),
        displayName: displayName,
        fullName: displayName,
        role: role,
        schoolId: adminSchoolId,
        school_id: adminSchoolId,
        isActive: true,
        isSuperAdmin: false,
        createdAt: serverTimestamp(),
        createdBy: auth.currentUser?.uid || userAccount?.id
      });

      // 2. Kwa TABLE KUONEKANA - schools/{schoolId}/authorizedStaff/{uid}
      await setDoc(doc(db, `schools/${adminSchoolId}/authorizedStaff`, newUid), {
        uid: newUid,
        staffIdentity: displayName,
        authEmail: email.toLowerCase().trim(),
        email: email.toLowerCase().trim(),
        role: role,
        assignedPassword: password,
        assignedSubjects: [],
        isAuthorized: true,
        createdAt: serverTimestamp()
      });

      await signOut(secondaryAuth);
      await deleteApp(secondaryApp);
      return true;
    } catch (error: any) {
      await deleteApp(secondaryApp).catch(()=>{});
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
      try {
        const userCred = await signInWithEmailAndPassword(auth, normalizedEmail, inputPass);
        fbUser = userCred.user;
      } catch (fbErr: any) {}
      if (fbUser) {
        sessionStorage.removeItem('haby_demo_user');
        await fetchOrCreateUserAccount(fbUser);
        return;
      }
      const { data: usersSnap } = await supabase.from('users').select('*').eq('email', normalizedEmail);
      if (usersSnap && usersSnap.length > 0) {
        const uData = usersSnap[0];
        if (uData.password && uData.password === inputPass) {
          const resolvedSchool = uData.school_id || uData.schoolId || DEFAULT_PRIMARY_SCHOOL_ID;
          sessionStorage.setItem('haby_school_id', resolvedSchool);
          localStorage.setItem('currentSchoolId', resolvedSchool);
          const memberAccount: UserAccount = { id: uData.id, email: uData.email, fullName: uData.fullName || 'Authorized Staff', role: uData.role || 'TEACHER', schoolId: resolvedSchool, assignedSubjects: uData.assignedSubjects || [], isSuperAdmin:!!uData.isSuperAdmin };
          sessionStorage.setItem('haby_demo_user', JSON.stringify(memberAccount));
          setUserAccount(memberAccount);
          return;
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