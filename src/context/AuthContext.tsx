import React, { createContext, useContext, useEffect, useState } from 'react';
import { collection, query, where, getDocs, doc, getDoc, setDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth, supabase, DEFAULT_PRIMARY_SCHOOL_ID } from '../lib/dbClient';
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
  createSchoolUser: (email: string, password: string, displayName: string, role: UserRole, assignedSubjects?: string[], overrideSchoolId?: string) => Promise<boolean>;
  loginWithFingerprint: (teacherId: string | number) => Promise<void>;
}

export const SUPERADMIN_EMAIL = 'habibuakida@gmail.com';
export const SUPERADMIN_MASTER_PASSWORD = '';
export const ADMIN_EMAIL = 'admin@haby.com';
export const ADMIN_PASSWORD = '';

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

  // Helper to persist session across browser reloads (without storing plaintext passwords)
  const setPersistedAccount = (acct: UserAccount | null, token?: string) => {
    if (acct) {
      const sanitizedAcct = { ...acct };
      delete (sanitizedAcct as any).password;
      setUserAccount(sanitizedAcct);
      if (typeof window !== 'undefined') {
        safeSetItem(window.localStorage, 'haby_auth_user', JSON.stringify(sanitizedAcct));
        safeSetItem(window.sessionStorage, 'haby_demo_user', JSON.stringify(sanitizedAcct));
        if (token) {
          safeSetItem(window.sessionStorage, 'haby_auth_token', token);
        }
        if (sanitizedAcct.schoolId) {
          safeSetItem(window.localStorage, 'currentSchoolId', sanitizedAcct.schoolId);
          safeSetItem(window.localStorage, 'schoolId', sanitizedAcct.schoolId);
          safeSetItem(window.sessionStorage, 'haby_school_id', sanitizedAcct.schoolId);
        }
      }
    } else {
      setUserAccount(null);
      if (typeof window !== 'undefined') {
        safeRemoveItem(window.localStorage, 'haby_auth_user');
        safeRemoveItem(window.sessionStorage, 'haby_demo_user');
        safeRemoveItem(window.sessionStorage, 'haby_auth_token');
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

      // Auto-create default user account if profile not explicitly in database
      const schoolId = sessionStorage.getItem('haby_school_id') || DEFAULT_PRIMARY_SCHOOL_ID;
      const defaultAccount: UserAccount = {
        id: fbUser.id,
        email: normEmail,
        fullName: fbUser.user_metadata?.full_name || fbUser.email?.split('@')[0] || 'Authorized User',
        role: isAdmin || isSuperAdmin ? 'HEADMASTER' : 'TEACHER',
        schoolId,
        school_id: schoolId,
        isSuperAdmin: isSuperAdmin || isAdmin
      };
      sessionStorage.setItem('haby_school_id', schoolId);
      localStorage.setItem('currentSchoolId', schoolId);
      sessionStorage.setItem('haby_demo_user', JSON.stringify(defaultAccount));
      setUserAccount(defaultAccount);
      setLoading(false);
      return;
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
        const savedDemo = typeof window !== 'undefined'
          ? safeGetItem(window.sessionStorage, 'haby_demo_user') || safeGetItem(window.localStorage, 'haby_auth_user')
          : null;
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

  // ==== FUNCTION YA KUSAJILI USER - BACKEND DATABASE + FALLBACK ====
  const createSchoolUser = async (
    email: string,
    password: string,
    displayName: string,
    role: UserRole,
    assignedSubjects: string[] = [],
    overrideSchoolId?: string
  ): Promise<boolean> => {
    const adminSchoolId = overrideSchoolId || userAccount?.schoolId || localStorage.getItem('currentSchoolId') || localStorage.getItem('schoolId') || DEFAULT_PRIMARY_SCHOOL_ID;
    if (!adminSchoolId) throw new Error("Admin hana schoolId - tafadhali ingia (login) tena");

    const normalizedEmail = email.toLowerCase().trim();
    const roleUpper = String(role || 'TEACHER').toUpperCase();

    try {
      // 1. Save directly to Cloud SQL via /api/db/users (which also syncs school_admins & authorized_staff)
      const response = await fetch('/api/db/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: normalizedEmail,
          password: password || '123456',
          fullName: displayName.trim(),
          full_name: displayName.trim(),
          role: roleUpper,
          schoolId: adminSchoolId,
          school_id: adminSchoolId,
          assignedSubjects: assignedSubjects || [],
          assigned_subjects: assignedSubjects || [],
        }),
      });

      const resData = await response.json().catch(() => ({}));
      const savedUid = resData?.user?.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `usr_${Date.now()}`);

      // 2. Also sync to Firestore as non-blocking backup if available
      try {
        await setDoc(doc(db, 'users', savedUid), {
          id: savedUid,
          email: normalizedEmail,
          full_name: displayName.trim(),
          fullName: displayName.trim(),
          role: roleUpper,
          school_id: adminSchoolId,
          schoolId: adminSchoolId,
          assigned_subjects: assignedSubjects || [],
          assignedSubjects: assignedSubjects || [],
          created_at: new Date().toISOString()
        }, { merge: true });

        if (roleUpper === 'HEADMASTER') {
          await setDoc(doc(db, 'school_admins', savedUid), {
            id: savedUid,
            email: normalizedEmail,
            full_name: displayName.trim(),
            fullName: displayName.trim(),
            role: 'HEADMASTER',
            school_id: adminSchoolId,
            schoolId: adminSchoolId
          }, { merge: true });
        }
      } catch (_fbIgnore) {
        // Ignore Firestore errors when Cloud SQL is primary
      }

      if (!response.ok) {
        throw new Error(resData?.error || resData?.details || 'Imeshindikana kusajili mtumiaji kwenye hifadhidata.');
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
      const email = res.user.email?.toLowerCase().trim() || '';
      const isSuper = email === SUPERADMIN_EMAIL.toLowerCase() || email === 'habibuakida@gmail.com' || email === ADMIN_EMAIL.toLowerCase();
      const targetSchoolId = sessionStorage.getItem('haby_school_id') || DEFAULT_PRIMARY_SCHOOL_ID;
      
      let userRole: UserRole = isSuper ? 'SUPER_ADMIN' : 'TEACHER';
      let fullName = res.user.displayName || (isSuper ? 'Mwl. Habibu Akida (Super Admin)' : 'Authorized Teacher');
      
      try {
        const snapRaw = localStorage.getItem(`haby_school_data_${targetSchoolId}`) || localStorage.getItem(`haby_school_data_snapshot_${targetSchoolId}`);
        if (snapRaw) {
          const snapData = JSON.parse(snapRaw);
          const teachersList: any[] = Array.isArray(snapData.teachers) ? snapData.teachers : [];
          const matchedTch = teachersList.find((t: any) => (t.email || '').toLowerCase().trim() === email);
          if (matchedTch) {
            fullName = matchedTch.name || fullName;
            if (matchedTch.schoolRole === 'Headmaster' || matchedTch.schoolRole === 'Headmistress') {
              userRole = 'HEADMASTER';
            } else if (matchedTch.schoolRole === 'Academic Master' || matchedTch.schoolRole === 'Academic Mistress') {
              userRole = 'ACADEMIC';
            } else if (matchedTch.schoolRole === 'Class Teacher / Master' || matchedTch.isClassTeacher) {
              userRole = 'CLASS_TEACHER';
            } else {
              userRole = 'TEACHER';
            }
          }
        }
      } catch (_e) {}

      const account: UserAccount = {
        id: res.user.uid,
        email: res.user.email || 'user@school.tz',
        fullName,
        role: userRole,
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
      alert('Uingiaji wa Google umefungwa na kivinjari au kubatilishwa. Tafadhali ingia kwa kutumia barua pepe na nywila yako au chagua Mwalimu wako kwenye Mfumo.');
    } finally {
      setLoading(false);
    }
  };

  const signInWithEmail = async (inputEmail: string, inputPass: string) => {
    setLoading(true);
    if (typeof window !== 'undefined') { safeRemoveItem(window.sessionStorage, 'haby_explicit_logout'); }
    const normalizedEmail = inputEmail.trim().toLowerCase();
    let lastError: Error | null = null;

    try {
      // 1. BACKEND AUTH VIA CLOUD SQL (/api/auth/login) WITH BCRYPT & SIGNED SESSION TOKEN
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ email: normalizedEmail, password: inputPass })
        });
        const data = await res.json();
        if (data.success && data.user) {
          const u = data.user;
          const schoolId = u.schoolId || sessionStorage.getItem('haby_school_id') || DEFAULT_PRIMARY_SCHOOL_ID;
          sessionStorage.setItem('haby_school_id', schoolId);
          localStorage.setItem('currentSchoolId', schoolId);
          localStorage.setItem('schoolId', schoolId);
          if (u.isSuperAdmin) {
            localStorage.setItem('user_role', 'super_admin');
          }
          const acct: UserAccount = {
            id: u.id,
            email: u.email,
            fullName: u.fullName,
            role: u.role,
            schoolId,
            school_id: schoolId,
            assignedSubjects: Array.isArray(u.assignedSubjects) ? u.assignedSubjects : [],
            isSuperAdmin: !!u.isSuperAdmin,
          };
          setPersistedAccount(acct, data.token);
          setLoading(false);
          return;
        } else if (data.error) {
          lastError = new Error(data.error);
        }
      } catch (apiErr: any) {
        if (apiErr.message && !apiErr.message.includes('fetch')) {
          lastError = apiErr;
        }
      }

      // 2. OFFLINE FALLBACK FOR OWNER IF NETWORK IS UNREACHABLE
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
        };
        setPersistedAccount(adminAccount);
        setLoading(false);
        return;
      }

      // 3. FIRESTORE FALLBACK FOR REGISTERED USERS
      try {
        const { collection, query, where, getDocs } = await import('firebase/firestore');
        const usersCol = collection(db, 'users');
        const qSnap = await getDocs(query(usersCol, where('email', '==', normalizedEmail)));
        if (!qSnap.empty) {
          const docData = qSnap.docs[0].data();
          const targetSchool = docData.schoolId || docData.school_id || DEFAULT_PRIMARY_SCHOOL_ID;
          const rawRole = String(docData.role || 'TEACHER').toUpperCase();
          const userRole = (rawRole === 'HEADMASTER' || rawRole === 'ACADEMIC' || rawRole === 'MONITOR' ? rawRole : 'TEACHER') as UserRole;
          const fsAccount: UserAccount = {
            id: qSnap.docs[0].id,
            email: normalizedEmail,
            fullName: docData.fullName || docData.full_name || docData.name || normalizedEmail.split('@')[0],
            role: userRole,
            schoolId: targetSchool,
            school_id: targetSchool,
            assignedSubjects: docData.assignedSubjects || docData.assigned_subjects || [],
            isSuperAdmin: Boolean(docData.isSuperAdmin || userRole === 'SUPER_ADMIN')
          };
          setPersistedAccount(fsAccount);
          setLoading(false);
          return;
        }
      } catch (_fbErr) {
        // Non-blocking Firestore lookup
      }

      // 4. LOCAL SCHOOL DATA ROSTER FALLBACK
      try {
        const storedSchoolId = localStorage.getItem('currentSchoolId') || localStorage.getItem('schoolId') || DEFAULT_PRIMARY_SCHOOL_ID;
        const snapRaw = localStorage.getItem(`haby_school_data_${storedSchoolId}`) || localStorage.getItem(`haby_school_data_snapshot_${storedSchoolId}`);
        if (snapRaw) {
          const snapData = JSON.parse(snapRaw);
          const teachersList: any[] = Array.isArray(snapData.teachers) ? snapData.teachers : [];
          const digitsOnly = normalizedEmail.replace(/[^0-9]/g, '');
          const matchedTch = teachersList.find((t: any) => {
            const tEm = (t.email || '').toLowerCase().trim();
            const tName = (t.name || '').toLowerCase().trim();
            const tPhone = (t.phone || '').replace(/[^0-9]/g, '');
            return (
              (tEm && tEm === normalizedEmail) ||
              (tEm && tEm.startsWith(normalizedEmail + '@')) ||
              (tName && tName === normalizedEmail) ||
              (digitsOnly.length >= 7 && tPhone.endsWith(digitsOnly.slice(-7)))
            );
          });
          if (matchedTch) {
            const role = (matchedTch.schoolRole === 'Headmaster' ? 'HEADMASTER' : matchedTch.schoolRole === 'Academic Master' ? 'ACADEMIC' : 'TEACHER') as UserRole;
            const tchAccount: UserAccount = {
              id: String(matchedTch.id || `tch_${Date.now()}`),
              email: matchedTch.email || normalizedEmail,
              fullName: matchedTch.name || 'Mwalimu',
              role,
              schoolId: storedSchoolId,
              school_id: storedSchoolId,
              assignedSubjects: Array.isArray(matchedTch.subjects) ? matchedTch.subjects : [],
              isSuperAdmin: false
            };
            setPersistedAccount(tchAccount);
            setLoading(false);
            return;
          }
        }
      } catch (_localErr) {}

      // If password was incorrect or user not found, throw descriptive error
      if (lastError) {
        throw lastError;
      }

      throw new Error('Mtumiaji hajapatikana kwenye mfumo. Tafadhali hakikisha barua pepe, jina au namba ya simu uliyoingiza ni sahihi.');
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
      },
      HEADMASTER: { id: 'demo_headmaster', email: 'headmaster.demo@haby.com', fullName: 'Mwl. Peter Mwita (Headmaster Demo)', role: 'HEADMASTER', schoolId: DEFAULT_PRIMARY_SCHOOL_ID, school_id: DEFAULT_PRIMARY_SCHOOL_ID, isSuperAdmin: false },
      ACADEMIC: { id: 'usr_academic', email: 'academic@kiomonisec.ac.tz', fullName: 'David Mwakipesile (Academic Master)', role: 'ACADEMIC', schoolId: DEFAULT_PRIMARY_SCHOOL_ID, school_id: DEFAULT_PRIMARY_SCHOOL_ID },
      TEACHER: { id: 'usr_teacher', email: 'teacher@kiomonisec.ac.tz', fullName: 'Grace Mchome (Staff Teacher)', role: 'TEACHER', schoolId: DEFAULT_PRIMARY_SCHOOL_ID, school_id: DEFAULT_PRIMARY_SCHOOL_ID, assignedSubjects: ['English Language', 'ENG'] },
      ENVIRONMENT_TEACHER: { id: 'usr_env', email: 'environment@kiomonisec.ac.tz', fullName: 'Mwl. Mazingira (Environment Teacher)', role: 'ENVIRONMENT_TEACHER', schoolId: DEFAULT_PRIMARY_SCHOOL_ID, school_id: DEFAULT_PRIMARY_SCHOOL_ID },
      MONITOR: { id: 'usr_monitor', email: 'monitor.demo@haby.com', fullName: 'John Doe (Class Monitor)', role: 'MONITOR', schoolId: DEFAULT_PRIMARY_SCHOOL_ID, school_id: DEFAULT_PRIMARY_SCHOOL_ID },
      ADMIN: { id: 'usr_admin', email: 'admin@haby.com', fullName: 'Admin User', role: 'ADMIN', schoolId: DEFAULT_PRIMARY_SCHOOL_ID, school_id: DEFAULT_PRIMARY_SCHOOL_ID },
      CLASS_TEACHER: { id: 'usr_class_teacher', email: 'classteacher@haby.com', fullName: 'Mwl. Habibu (Class Teacher Form 1 A)', role: 'CLASS_TEACHER', schoolId: DEFAULT_PRIMARY_SCHOOL_ID, school_id: DEFAULT_PRIMARY_SCHOOL_ID, isClassTeacher: true, classTeacherOf: 'Form 1 - STREAM A' }
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
    if (typeof window !== 'undefined') {
      const activeSchool = safeGetItem(window.localStorage, 'currentSchoolId') || safeGetItem(window.localStorage, 'schoolId');
      if (activeSchool) {
        safeSetItem(window.localStorage, 'haby_last_school_id', activeSchool);
      }
      safeSetItem(window.sessionStorage, 'haby_explicit_logout', 'true');
      safeRemoveItem(window.sessionStorage, 'haby_demo_user');
      safeRemoveItem(window.sessionStorage, 'haby_auth_token');
      safeRemoveItem(window.localStorage, 'haby_auth_user');
      safeRemoveItem(window.sessionStorage, 'haby_school_id');
      safeRemoveItem(window.localStorage, 'currentSchoolId');
      safeRemoveItem(window.localStorage, 'schoolId');
    }
    setPersistedAccount(null);
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => {});
    await auth.signOut().catch(() => {});
  };

  const refreshUserAccount = async () => {
    if (auth.currentUser) await fetchOrCreateUserAccount({ user: auth.currentUser });
  };

  const loginWithFingerprint = async (teacherId: string | number) => {
    const schoolId = sessionStorage.getItem('haby_school_id') || localStorage.getItem('currentSchoolId') || DEFAULT_PRIMARY_SCHOOL_ID;
    const { data: teacherRows } = await supabase
      .from('teachers')
      .select('*')
      .eq('school_id', schoolId);

    const match = (teacherRows || []).find((t: any) => String(t.id) === String(teacherId) || String(t.numeric_id || t.numericId) === String(teacherId));
    if (!match) {
      throw new Error("Mwalimu hakupatikana kwenye mfumo wa shule.");
    }
    if (!match.fingerprint_enrolled && !match.fingerprintEnrolled && !match.has_biometric && !match.hasBiometric) {
      throw new Error("Alama ya vidole haijasajiliwa na Mkuu wa Shule (Admin Fingerprint Enrollment required). Tafadhali mwambie Admin akusajili.");
    }

    // Record / Update Teacher Attendance (Arrival vs Departure time via Fingerprint Scan)
    try {
      const now = new Date();
      const todayDateStr = now.toISOString().split('T')[0];
      const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
      const dayName = now.toLocaleDateString('en-US', { weekday: 'long' });

      const { data: existingAttendance } = await supabase
        .from('teacher_attendance')
        .select('*')
        .eq('school_id', schoolId)
        .eq('teacher_id', match.id)
        .eq('date', todayDateStr);

      if (existingAttendance && existingAttendance.length > 0) {
        // Record already exists for today -> Update Departure (Check-Out) Time
        const recordId = existingAttendance[0].id;
        await supabase
          .from('teacher_attendance')
          .update({
            check_out_time: timeStr,
            remarks: `Biometric Check-Out (Departure Time: ${timeStr})`,
            updated_at: new Date().toISOString()
          })
          .eq('id', recordId);
      } else {
        // No record for today -> Record Arrival (Check-In) Time
        const newAttId = `tatt_${schoolId}_${todayDateStr}_${match.id}`;
        await supabase
          .from('teacher_attendance')
          .upsert({
            id: newAttId,
            school_id: schoolId,
            teacher_id: match.id,
            teacher_name: match.name,
            school_role: match.school_role || match.schoolRole || 'Subject Teacher',
            date: todayDateStr,
            day_of_week: dayName,
            status: 'PRESENT',
            check_in_time: timeStr,
            check_out_time: '15:30',
            remarks: `Biometric Check-In (Arrival Time: ${timeStr})`,
            marked_by: 'Biometric Kiosk'
          }, { onConflict: 'id' });
      }
    } catch (attErr) {
      console.warn("Error logging teacher biometric attendance:", attErr);
    }

    const teacherAccount: UserAccount = {
      id: match.id,
      email: match.email || `${match.name.toLowerCase().replace(/\s+/g, '')}@school.ac.tz`,
      fullName: match.name,
      role: 'TEACHER',
      schoolId: schoolId,
      school_id: schoolId,
      assignedSubjects: match.subjects || []
    };

    if (typeof window !== 'undefined') {
      safeRemoveItem(window.sessionStorage, 'haby_explicit_logout');
      safeSetItem(window.sessionStorage, 'haby_school_id', schoolId);
      safeSetItem(window.localStorage, 'currentSchoolId', schoolId);
    }
    setPersistedAccount(teacherAccount);
  };

  return (
    <AuthContext.Provider value={{ userAccount, user: userAccount, loading, logout, refreshUserAccount, signInWithGoogle, signInWithEmail, loginAsDemo, switchSchool, createSchoolUser, loginWithFingerprint }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) { throw new Error('useAuth must be used within an AuthProvider'); }
  return context;
};