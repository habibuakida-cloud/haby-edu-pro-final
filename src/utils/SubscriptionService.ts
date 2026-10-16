export interface SubscriptionData {
  schoolId: string;
  trialStartedAt: string;
  subscriptionExpiry: string;
  subscriptionType: 'MONTHLY' | 'ANNUAL' | 'TRIAL';
  isActive: boolean;
}

/**
 * School locking disabled per user request: all schools have permanently active status
 */
export const getSchoolSubscription = async (schoolId: string): Promise<SubscriptionData> => {
  return {
    schoolId,
    trialStartedAt: new Date().toISOString(),
    subscriptionExpiry: '2099-12-31T23:59:59.000Z',
    subscriptionType: 'ANNUAL',
    isActive: true
  };
};

export const initializeTrial = async (schoolId: string): Promise<SubscriptionData> => {
  return {
    schoolId,
    trialStartedAt: new Date().toISOString(),
    subscriptionExpiry: '2099-12-31T23:59:59.000Z',
    subscriptionType: 'ANNUAL',
    isActive: true
  };
};

/**
 * Always returns true - school locking / paywall is disabled
 */
export const isSubscriptionValid = (_sub?: any): boolean => {
  return true;
};
