import { supabase, resilientUpsert } from '../lib/supabaseClient';
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
    // Try querying with school_id first, then schoolId fallback
    let res = await supabase.from('school_subscriptions').select('*').eq('school_id', schoolId).maybeSingle();
    if (res.error || !res.data) {
      res = await supabase.from('school_subscriptions').select('*').eq('schoolId', schoolId).maybeSingle();
    }
    if (res.data) {
      const d: any = res.data;
      return {
        schoolId: d.school_id || d.schoolId || schoolId,
        trialStartedAt: d.trial_started_at || d.trialStartedAt || new Date().toISOString(),
        subscriptionExpiry: d.subscription_expiry || d.subscriptionExpiry || addMonths(new Date(), 1).toISOString(),
        subscriptionType: (d.subscription_type || d.subscriptionType || 'TRIAL') as any,
        isActive: d.is_active !== undefined ? Boolean(d.is_active) : (d.isActive !== undefined ? Boolean(d.isActive) : true)
      };
    }
    return null;
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
    // Check if subscription already exists
    let existingId: string | undefined;
    try {
      const { data: existing } = await supabase
        .from('school_subscriptions')
        .select('id')
        .eq('school_id', schoolId)
        .maybeSingle();
      if (existing?.id) {
        existingId = existing.id;
      }
    } catch {
      // Ignore
    }

    const payload: any = {
      school_id: schoolId,
      trial_started_at: now,
      subscription_expiry: expiry,
      subscription_type: 'TRIAL',
      is_active: true
    };
    if (existingId) {
      payload.id = existingId;
    }

    // Try upserting by primary key or school_id
    const { error } = await resilientUpsert('school_subscriptions', payload, { onConflict: existingId ? 'id' : 'school_id' });
    if (error && !error.message?.includes('Could not find the table')) {
      console.warn("school_subscriptions upsert notice:", error.message);
    }
  } catch (err: any) {
    console.warn("school_subscriptions upsert exception:", err?.message || err);
  }
  return trialData;
};

export const isSubscriptionValid = (sub: SubscriptionData): boolean => {
  return isAfter(new Date(sub.subscriptionExpiry), new Date());
};
