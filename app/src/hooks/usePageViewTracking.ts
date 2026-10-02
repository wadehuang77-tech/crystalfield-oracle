import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { trackEvent } from '../lib/tracking';

export function usePageViewTracking() {
  const location = useLocation();
  const lastPageKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const pageKey = `${location.pathname}${location.search}`;

    if (lastPageKeyRef.current === pageKey) {
      return;
    }

    lastPageKeyRef.current = pageKey;

    const isAdminPath =
      location.pathname === '/admin' ||
      location.pathname.startsWith('/admin/') ||
      location.pathname === '/en/admin' ||
      location.pathname.startsWith('/en/admin/');

    if (isAdminPath) {
      return;
    }

    const pagePath = `${location.pathname}${location.search}`;

    if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
      window.gtag('event', 'page_view', {
        page_path: pagePath,
        page_location: window.location.href,
        page_title: document.title,
      });
    }

    trackEvent('page_view', {
      path: location.pathname,
      search: location.search,
      referrer: document.referrer || null,
    });

    window.fbq?.('track', 'PageView');
  }, [location.pathname, location.search]);
}
