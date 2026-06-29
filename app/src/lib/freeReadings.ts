// Free reading credits tracked in localStorage.
// Rules:
//   - Total 3 free readings per browser
//   - 1st: guest (no registration)
//   - 2nd & 3rd: require registration (user must be logged in)

const GUEST_KEY  = 'cf_free_guest';   // '0' | '1'
const MEMBER_KEY = 'cf_free_member';  // '0' | '1' | '2'

function readInt(key: string): number {
  try { return Math.max(0, parseInt(localStorage.getItem(key) ?? '0', 10) || 0); } catch { return 0; }
}
function writeInt(key: string, n: number) {
  try { localStorage.setItem(key, String(n)); } catch {}
}

export function getGuestFreeUsed(): number  { return Math.min(readInt(GUEST_KEY), 1); }
export function getMemberFreeUsed(): number { return Math.min(readInt(MEMBER_KEY), 2); }
export function totalFreeUsed(): number { return getGuestFreeUsed() + getMemberFreeUsed(); }

/** Guest has NOT yet used their 1 no-registration free read. */
export function canUseAsFreeGuest(): boolean { return getGuestFreeUsed() < 1; }

/** Registered user has remaining free reads (up to 2 after registration). */
export function canUseAsFreeUser(): boolean { return getGuestFreeUsed() >= 1 && getMemberFreeUsed() < 2; }

/** Guest has used their 1 free read but hasn't registered yet — show registration modal. */
export function needsRegistrationForFree(): boolean { return getGuestFreeUsed() >= 1 && getMemberFreeUsed() < 2; }

export function consumeGuestFree(): void { if (canUseAsFreeGuest()) writeInt(GUEST_KEY, 1); }
export function consumeMemberFree(): void { writeInt(MEMBER_KEY, getMemberFreeUsed() + 1); }

/** How many free reads remain (counting both guest and member allowances). */
export function freeReadsLeft(): number { return 3 - totalFreeUsed(); }
