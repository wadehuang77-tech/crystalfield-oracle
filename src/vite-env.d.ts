/// <reference types="vite/client" />

interface Window {
  gtag?: (command: string, eventName: string, params?: Record<string, unknown>) => void;
}
