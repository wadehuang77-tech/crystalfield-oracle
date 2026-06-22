import { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { publicApi } from '../lib/api';

export function useConversionTracking() {
  const { user } = useAuth();

  const trackEvent = async (
    eventType: string,
    eventData?: Record<string, unknown>,
    email?: string
  ) => {
    try {
      await publicApi.conversionEvent(eventType, eventData || {}, email ?? null);
      void user;
    } catch {
    }
  };

  return { trackEvent };
}

export function usePageView(pageName: string) {
  const { trackEvent } = useConversionTracking();

  useEffect(() => {
    trackEvent('page_view', { page: pageName });
  }, [pageName]);
}
