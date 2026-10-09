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
  try {
    const { data, error } = await supabase.from('school_subscriptions').select('*').eq('schoolId', schoolId).maybeSingle();
    if (error) {
      console.warn("school_subscriptions table fetch warning (table may not exist or 404):", error.message);
      return null;
    }
    return data as SubscriptionData;
  } catch (err: any) {
    console.warn("school_subscriptions fetch exception:", err?.message || err);
    return null;
  }
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
  
  try {
    const { error } = await supabase.from('school_subscriptions').upsert(trialData);
    if (error) {
      console.warn("school_subscriptions upsert warning:", error.message);
    }
  } catch (err: any) {
    console.warn("school_subscriptions upsert exception:", err?.message || err);
  }
  return trialData;
};

export const isSubscriptionValid = (sub: SubscriptionData): boolean => {
  return isAfter(new Date(sub.subscriptionExpiry), new Date());
};
