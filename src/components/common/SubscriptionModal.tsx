import React from 'react';
import { SubscriptionData } from '../../utils/SubscriptionService';

interface SubscriptionModalProps {
  subscription: SubscriptionData;
  onVerify: (ref: string) => void;
}

// Subscription modal / paywall is disabled per admin request
export const SubscriptionModal: React.FC<SubscriptionModalProps> = () => {
  return null;
};
