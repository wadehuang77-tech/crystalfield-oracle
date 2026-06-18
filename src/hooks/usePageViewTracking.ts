import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackEvent } from '../lib/tracking';

export function usePageViewTracking() {
  const location = useLocation();

  useEffect(() => {
    trackEvent('page_view', {
      path: location.pathname,
      search: location.search,
      referrer: document.referrer || null,
    });
  }, [location.pathname, location.search]);
}
