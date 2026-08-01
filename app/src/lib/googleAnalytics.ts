const DEFAULT_MEASUREMENT_ID = 'G-FY6V8NJNHW';

export const GA_MEASUREMENT_ID =
  import.meta.env.VITE_GA_MEASUREMENT_ID?.trim() || DEFAULT_MEASUREMENT_ID;

let initialized = false;
let lastPageViewKey: string | null = null;

export function initGoogleAnalytics(): void {
  if (initialized || !GA_MEASUREMENT_ID || typeof window === 'undefined') return;
  initialized = true;

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function gtag(...args: unknown[]) {
    window.dataLayer?.push(args);
  };

  const existingScript = document.querySelector<HTMLScriptElement>(
    `script[data-ga4-measurement-id="${GA_MEASUREMENT_ID}"]`,
  );
  if (!existingScript) {
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_MEASUREMENT_ID)}`;
    script.dataset.ga4MeasurementId = GA_MEASUREMENT_ID;
    document.head.appendChild(script);
  }

  window.gtag('js', new Date());
  window.gtag('config', GA_MEASUREMENT_ID, { send_page_view: false });
}

export function trackGoogleAnalyticsPageView(pagePath: string): void {
  if (!GA_MEASUREMENT_ID || typeof window === 'undefined') return;
  if (lastPageViewKey === pagePath) return;
  lastPageViewKey = pagePath;

  initGoogleAnalytics();
  window.gtag?.('event', 'page_view', {
    page_path: pagePath,
    page_location: window.location.href,
    page_title: document.title,
  });
}
