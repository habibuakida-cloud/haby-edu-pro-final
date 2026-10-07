import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { addMonths, addYears, isAfter } from 'date-fns';

export interface SubscriptionData {
  schoolId: string;
  trialStartedAt: string;
  subscriptionExpiry: string;
  subscriptionType: 'MONTHLY' | 'ANNUAL' | 'TRIAL';
  isActive: boolean;
}

export const getSchoolSubscription = async (schoolId: string): Promise<SubscriptionData | null> => {
  const docRef = doc(db, 'school_subscriptions', schoolId);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    return docSnap.data() as SubscriptionData;
  }
  return null;
};

export const initializeTrial = async (schoolId: string): Promise<SubscriptionData> => {
  const now = new Date().toISOString();
  const expiry = addMonths(new Date(), 1).toISOString();
  const trialData: SubscriptionData = {
    schoolId,
    trialStartedAt: now,
    subscriptionExpiry: expiry,
    subscriptionType: 'TRIAL',
    isActive: true
  };
  
  await setDoc(doc(db, 'school_subscriptions', schoolId), trialData);
  return trialData;
};

export const isSubscriptionValid = (sub: SubscriptionData): boolean => {
  return isAfter(new Date(sub.subscriptionExpiry), new Date());
};
