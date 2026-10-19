import { Student } from '../types';
import { normalizeTzPhone } from './phoneUtils';

export const DEFAULT_PARENT_PIN = '123456';

export const getStoredParentPins = (): Record<string, string> => {
  try {
    const raw = localStorage.getItem('haby_parent_pins');
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return {};
};

export const saveParentPin = (phone: string, pin: string): void => {
  try {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const normPhone = normalizeTzPhone(phone).replace(/[^0-9]/g, '');
    const current = getStoredParentPins();
    if (cleanPhone) current[cleanPhone] = pin.trim();
    if (normPhone) current[normPhone] = pin.trim();
    localStorage.setItem('haby_parent_pins', JSON.stringify(current));
  } catch (e) {}
};

export const getParentPinForPhone = (phone: string, students: Student[] = []): string => {
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  const normPhone = normalizeTzPhone(phone).replace(/[^0-9]/g, '');
  const stored = getStoredParentPins();

  if (cleanPhone && stored[cleanPhone]) return stored[cleanPhone];
  if (normPhone && stored[normPhone]) return stored[normPhone];

  // Check if any student linked to this phone has a custom parentPin
  const linked = students.filter(s => {
    const sPhone = (s.parentPhone || s.phone || '').replace(/[^0-9]/g, '');
    const sNorm = normalizeTzPhone(s.parentPhone || s.phone || '').replace(/[^0-9]/g, '');
    return (
      (cleanPhone && sPhone === cleanPhone) ||
      (normPhone && sNorm === normPhone) ||
      (cleanPhone.length >= 9 && sPhone.length >= 9 && sPhone.endsWith(cleanPhone.slice(-9))) ||
      (sPhone.length >= 9 && cleanPhone.length >= 9 && cleanPhone.endsWith(sPhone.slice(-9)))
    );
  });

  const studentWithPin = linked.find(s => s.parentPin && s.parentPin.trim());
  if (studentWithPin && studentWithPin.parentPin) {
    return studentWithPin.parentPin.trim();
  }

  return DEFAULT_PARENT_PIN;
};

export const isParentPhoneMatch = (inputPhone: string, targetPhone?: string): boolean => {
  if (!inputPhone || !targetPhone) return false;
  const c1 = inputPhone.replace(/[^0-9]/g, '');
  const c2 = targetPhone.replace(/[^0-9]/g, '');
  if (!c1 || !c2) return false;
  if (c1 === c2) return true;
  const n1 = normalizeTzPhone(inputPhone).replace(/[^0-9]/g, '');
  const n2 = normalizeTzPhone(targetPhone).replace(/[^0-9]/g, '');
  if (n1 === n2) return true;
  if (c1.length >= 9 && c2.length >= 9) {
    return c1.slice(-9) === c2.slice(-9);
  }
  return false;
};

export const verifyParentCredentials = (
  inputPhone: string,
  inputPassword: string,
  students: Student[] = []
): {
  success: boolean;
  error?: string;
  matchedStudents: Student[];
  parentName: string;
  parentPhone: string;
} => {
  const cleanPhone = inputPhone.trim();
  const enteredPass = inputPassword.trim();

  if (!cleanPhone) {
    return {
      success: false,
      error: 'Tafadhali jaza namba ya simu ya mzazi.',
      matchedStudents: [],
      parentName: '',
      parentPhone: ''
    };
  }
  if (!enteredPass) {
    return {
      success: false,
      error: 'Tafadhali jaza nenosiri au PIN.',
      matchedStudents: [],
      parentName: '',
      parentPhone: ''
    };
  }

  // Find students linked to this phone
  const matched = students.filter(s =>
    isParentPhoneMatch(cleanPhone, s.parentPhone) || isParentPhoneMatch(cleanPhone, s.phone)
  );

  if (matched.length === 0) {
    return {
      success: false,
      error: `Namba hii ya simu (${cleanPhone}) haijasajiliwa kwa mwanafunzi yeyote. Tafadhali wasiliana na utawala wa shule kusajili namba yako ya simu.`,
      matchedStudents: [],
      parentName: '',
      parentPhone: cleanPhone
    };
  }

  // Expected PIN
  const expectedPin = getParentPinForPhone(cleanPhone, students);
  const normalizedPass = enteredPass.toUpperCase();

  // Valid if matches expected PIN, default 123456, or any matched student's regNo
  const isMatch = (
    enteredPass === expectedPin ||
    enteredPass === DEFAULT_PARENT_PIN ||
    matched.some(s => s.regNo && s.regNo.trim().toUpperCase() === normalizedPass) ||
    matched.some(s => s.parentPin && s.parentPin.trim() === enteredPass)
  );

  if (!isMatch) {
    return {
      success: false,
      error: `Nenosiri si sahihi. Namba ya siri ya awali ni ${DEFAULT_PARENT_PIN} au namba ya usajili ya mwanafunzi (mfano: ${matched[0]?.regNo || 'S0123/0001/2026'}).`,
      matchedStudents: [],
      parentName: '',
      parentPhone: cleanPhone
    };
  }

  const parentName = matched.find(s => s.parentName)?.parentName || `Mzazi wa ${matched[0]?.name || 'Mwanafunzi'}`;

  return {
    success: true,
    matchedStudents: matched,
    parentName,
    parentPhone: cleanPhone
  };
};
