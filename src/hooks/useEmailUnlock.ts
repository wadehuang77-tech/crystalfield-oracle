import { useState } from 'react';
import { trackEvent } from '../lib/tracking';
import { publicApi } from '../lib/api';

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

interface UseEmailUnlockOptions {
  readingType: string;
  cardData?: Record<string, unknown>;
}

interface UseEmailUnlockResult {
  isUnlocked: boolean;
  isSubmitting: boolean;
  error: string;
  submitEmail: (email: string) => Promise<boolean>;
  reset: () => void;
}

export function useEmailUnlock({ readingType }: UseEmailUnlockOptions): UseEmailUnlockResult {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const submitEmail = async (email: string): Promise<boolean> => {
    const trimmed = email.trim().toLowerCase();

    if (!isValidEmail(trimmed)) {
      setError('請輸入有效的 Email 地址');
      return false;
    }

    if (isSubmitting) return false;

    setIsSubmitting(true);
    setError('');

    try {
      const data = await publicApi.saveEmail(trimmed, readingType);

      if (!data.success) {
        setError(data.message || '提交失敗，請稍後再試');
        return false;
      }

      setIsUnlocked(true);
      trackEvent('email_submit', { source: readingType, email: trimmed });
      return true;
    } catch {
      setError('系統錯誤，請稍後再試');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const reset = () => {
    setIsUnlocked(false);
    setError('');
  };

  return { isUnlocked, isSubmitting, error, submitEmail, reset };
}
