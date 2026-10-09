import { supabase } from '../lib/supabaseClient';
import { addMonths, addYears, isAfter } from 'date-fns';

export interface SubscriptionData {
  schoolId: string;
  trialStartedAt: string;
  subscriptionExpiry: string;
  subscriptionType: 'MONTHLY' | 'ANNUAL' | 'TRIAL';
  isActive: boolean;
}

export const getSchoolSubscription = async (schoolId: string): Promise<SubscriptionData | null> => {
  const { data, error } = await supabase.from('school_subscriptions').select('*').eq('schoolId', schoolId).maybeSingle();
  if (data) return data as SubscriptionData;
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
  
  await supabase.from('school_subscriptions').upsert(trialData);
  return trialData;
};

export const isSubscriptionValid = (sub: SubscriptionData): boolean => {
  return isAfter(new Date(sub.subscriptionExpiry), new Date());
};
