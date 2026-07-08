const STORAGE_KEY = 'cf_multi_spread_email';
const GUEST_CHECKOUT_EMAIL = 'guest-order@crystalfield.local';

export function readSavedMultiSpreadEmail(): string {
  if (typeof window === 'undefined') return '';
  try {
    return localStorage.getItem(STORAGE_KEY) ?? '';
  } catch {
    return '';
  }
}

export function getMultiSpreadCheckoutGuestEmail(): string {
  return readSavedMultiSpreadEmail() || GUEST_CHECKOUT_EMAIL;
}

export function saveMultiSpreadEmail(email: string): void {
  if (typeof window === 'undefined') return;
  const trimmed = email.trim().toLowerCase();
  if (!trimmed) return;
  try {
    localStorage.setItem(STORAGE_KEY, trimmed);
  } catch {}
}
