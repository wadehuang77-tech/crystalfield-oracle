/// <reference types="vite/client" />

interface Window {
  gtag?: (...args: unknown[]) => void;
  fbq?: (command: 'track', eventName: string, params?: Record<string, unknown>) => void;
}
