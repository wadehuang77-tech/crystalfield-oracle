import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { trackEvent } from '../lib/tracking';

export function usePageViewTracking() {
  const location = useLocation();
  const isInitialPageView = useRef(true);

  useEffect(() => {
    trackEvent('page_view', {
      path: location.pathname,
      search: location.search,
      referrer: document.referrer || null,
    });

    // The initial PageView is sent by index.html. Track subsequent SPA navigations here.
    if (isInitialPageView.current) {
      isInitialPageView.current = false;
    } else {
      window.fbq?.('track', 'PageView');
    }
  }, [location.hash, location.pathname, location.search]);
}
