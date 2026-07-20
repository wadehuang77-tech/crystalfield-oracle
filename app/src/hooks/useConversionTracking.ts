import { useCallback, useEffect } from 'react';
import { publicApi } from '../lib/api';

export function useConversionTracking() {
  const trackEvent = useCallback(async (
    eventType: string,
    eventData?: Record<string, unknown>,
    email?: string
  ) => {
    try {
      await publicApi.conversionEvent(eventType, eventData || {}, email ?? null);
    } catch {
      // Analytics failures must not interrupt the user's reading flow.
    }
  }, []);

  return { trackEvent };
}

export function usePageView(pageName: string) {
  const { trackEvent } = useConversionTracking();

  useEffect(() => {
    trackEvent('page_view', { page: pageName });
  }, [pageName, trackEvent]);
}
