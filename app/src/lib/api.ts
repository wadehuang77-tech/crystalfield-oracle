import { trackBeginCheckout, trackUnlockClick } from './ga4';

const BASE = import.meta.env.VITE_API_BASE
  || (import.meta.env.PROD ? 'https://api.crystalfield101.com' : '');

interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | undefined>;
  timeoutMs?: number;
}

async function req<T = unknown>(path: string, opts: ApiOptions = {}): Promise<T> {
  const { method = 'GET', body, query, timeoutMs } = opts;

  let url = `${BASE}${path}`;
  if (query) {
    const qs = Object.entries(query)
      .filter(([, v]) => v !== undefined && v !== null)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join('&');
    if (qs) url += `?${qs}`;
  }

  const controller = timeoutMs ? new AbortController() : null;
  const timeoutId = controller
    ? window.setTimeout(() => controller.abort(), timeoutMs)
    : 0;

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      credentials: 'include',
      headers: body ? { 'Content-Type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined,
      signal: controller?.signal,
    });
  } catch (err) {
    if (controller?.signal.aborted) {
      throw new Error('請求逾時，請稍後再試');
    }
    throw err;
  } finally {
    if (timeoutId) window.clearTimeout(timeoutId);
  }

  const contentType = res.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await res.json() : await res.text();

  if (!res.ok) {
    const message = (typeof data === 'object' && data && 'error' in data)
      ? String((data as { error: unknown }).error)
      : `HTTP ${res.status}`;
    const err = new Error(message) as Error & { status: number; body: unknown };
    err.status = res.status;
    err.body = data;
    throw err;
  }

  return data as T;
}

export interface SessionUser {
  id: string;
  email: string;
  name?: string | null;
  pictureUrl?: string | null;
  tarotUsageCount?: number;
}

export interface Profile {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  age: number | null;
  gender: string | null;
  occupation: string | null;
  healing_interest: string | null;
  purchased_spreads: string[];
  membership?: MembershipSubscription | null;
  created_at: string;
  updated_at: string;
}

export interface MembershipSubscription {
  id: string;
  item_id: string;
  amount: number;
  period_type: string;
  frequency: number;
  exec_times: number;
  status: 'pending' | 'active' | 'cancelling' | 'cancelled' | 'completed' | 'past_due' | 'expired';
  is_active: boolean;
  cancel_at_period_end: boolean;
  total_success_times: number;
  total_success_amount: number;
  current_period_started_at: string | null;
  current_period_ends_at: string | null;
  first_paid_at: string | null;
  last_paid_at: string | null;
  cancel_requested_at: string | null;
  cancelled_at: string | null;
  completed_at: string | null;
  last_charge_status: string | null;
  last_error_message: string | null;
  card_last4: string | null;
  card_first6: string | null;
  merchant_trade_no: string;
  last_synced_at: string | null;
}

export interface AdminRow {
  id: string;
  email: string;
  created_at: string;
}

export interface GuestEmail {
  id: string;
  email: string;
  source: string;
  created_at: string;
  status?: string;
}

export interface GoogleFormAdmin {
  id: string;
  name: string;
  url: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  display_name?: string | null;
  picture_url?: string | null;
  tarot_usage_count?: number;
  deleted_at: string | null;
}

export interface ButtonLinkSetting {
  button_key: string;
  label: string;
  google_form_id: string | null;
  selected_form: {
    id: string;
    name: string | null;
    url: string | null;
    is_active: boolean;
    deleted_at: string | null;
  } | null;
  warning: string | null;
  updated_at: string | null;
}

export interface PublicButtonLink {
  button_key: string;
  available: boolean;
  form: {
    id: string;
    name: string | null;
    url: string | null;
  } | null;
  label: string | null;
}

export const authApi = {
  signUp: (body: {
    name: string;
    email: string;
    phone: string;
    password: string;
    age?: number;
    gender?: string;
    occupation?: string;
    healing_interest?: string;
  }) => req<{ user: SessionUser }>('/api/auth/signup', { method: 'POST', body }),

  signIn: (email: string, password: string) =>
    req<{ user: SessionUser }>('/api/auth/signin', { method: 'POST', body: { email, password } }),

  googleConfig: () =>
    req<{ client_id: string | null; csrf_token: string }>('/api/auth/google/config'),

  signInWithGoogle: (credential: string, csrf_token: string) =>
    req<{ authenticated: true; user: SessionUser }>('/api/auth/google', {
      method: 'POST',
      body: { credential, csrf_token },
    }),

  signOut: () => req<{ ok: true }>('/api/auth/signout', { method: 'POST' }),

  me: () => req<{ authenticated: boolean; user: SessionUser | null }>('/api/auth/me'),

  requestPasswordReset: (email: string) =>
    req<{ ok: true }>('/api/auth/request-password-reset', {
      method: 'POST',
      body: { email },
    }),

  verifyResetCode: (email: string, code: string) =>
    req<{ reset_token: string }>('/api/auth/verify-reset-code', {
      method: 'POST',
      body: { email, code },
    }),

  resetPassword: (reset_token: string, password: string) =>
    req<{ ok: true }>('/api/auth/reset-password', {
      method: 'POST',
      body: { reset_token, password },
    }),
};

export const profileApi = {
  me: () => req<{ profile: Profile | null }>('/api/profile/me'),
};

export const membershipApi = {
  me: () => req<{ membership: MembershipSubscription | null }>('/api/membership/me'),
  refresh: () => req<{ membership: MembershipSubscription | null }>('/api/membership/refresh', { method: 'POST' }),
  cancel: () => req<{ membership: MembershipSubscription | null }>('/api/membership/cancel', { method: 'POST' }),
};

export interface EcpayForm {
  endpoint: string;
  fields: Record<string, string>;
}

export interface GuestOrderAccess {
  guest_email?: string;
  order_token?: string;
  context_id?: string;
  context_token?: string;
}

export interface OrderPick {
  card_key: string;
  position: number;
  reversed?: boolean;
}

export interface Order {
  id: string;
  merchant_trade_no: string;
  item_type: string;
  item_id: string;
  item_name: string;
  amount: number;
  status: 'pending' | 'paid' | 'failed' | 'cancelled';
  ecpay_payment_type: string | null;
  created_at: string;
  paid_at: string | null;
  picks: OrderPick[] | null;
}

export const checkoutApi = {
  createOrder: async (spread_id: string, picks?: OrderPick[], guest?: GuestOrderAccess) => {
    trackUnlockClick(spread_id);
    const result = await req<{ order_id: string; merchant_trade_no: string; item_name: string; amount: number; ecpay: EcpayForm | null; admin_unlocked?: boolean; order_token?: string | null }>(
      '/api/checkout/create-order',
      { method: 'POST', body: { spread_id, picks, ...guest } },
    );
    if (!result.admin_unlocked) {
      trackBeginCheckout(spread_id, result.merchant_trade_no, result.amount, result.item_name);
    }
    return result;
  },

  getOrder: (orderId: string, orderToken?: string | null) =>
    req<{ order: Order }>(`/api/orders/${encodeURIComponent(orderId)}`, {
      query: orderToken ? { order_token: orderToken } : {},
    }),

  catalog: () =>
    req<{ catalog: Record<string, { id: string; name: string; amount: number }> }>(
      '/api/checkout/catalog',
    ),
};

export interface BundleCredits {
  three_card: number;
  ten_card:   number;
  pastlife:   number;
}

export const bundleApi = {
  getCredits: () =>
    req<{ credits: BundleCredits | null }>('/api/bundle-credits'),

  consume: (category: 'three_card' | 'ten_card' | 'pastlife') =>
    req<{ ok: boolean; remaining: number; error?: string }>(
      '/api/bundle-credits/consume',
      { method: 'POST', body: { category } },
    ),

  unlockSpread: (
    spread_id: string,
    picks: OrderPick[],
    reading_id: string,
  ) => req<{
    spread_id: string;
    cards: UnlockedCard[];
    category: 'three_card' | 'ten_card' | 'pastlife';
    remaining: number;
    already_consumed: boolean;
  }>('/api/cards/bundle-unlock-spread', {
    method: 'POST',
    body: { spread_id, picks, reading_id },
  }),
};

export interface VedicChartData {
  ayanamsa: 'LAHIRI';
  lagna: string;
  sunSign: string;
  moonSign: string;
  moonNakshatra: string;
  planets: Record<string, string>;
  mahaDasha: string;
  antarDasha: string | null;
  dashaTimeline: Array<{
    lord: string;
    start: string;
    end: string;
    subPeriods: Array<{ lord: string; start: string; end: string }>;
  }>;
  housePlacements: Record<string, number>;
  houseLords: Record<string, string>;
  karmaAspects: Array<{
    source: 'Rahu' | 'Ketu';
    target: string;
    relationship: 'conjunction' | 'opposition';
  }>;
  timezone: string;
  timezoneOffset: string;
}

export interface VedicFreeResults {
  archetype: { title: string; body: string };
  talents: { title: string; items: string[]; body: string };
  currentCycle: { title: string; body: string };
  challenge: { title: string; body: string };
  nextYear: { title: string; body: string; lockedPrompts: string[] };
}

export interface VedicReport {
  formatVersion?: number;
  title: string;
  introduction: string;
  consultationQuestion?: string;
  sections: Array<{
    heading: string;
    consultation: string;
    evidence: Array<{ factor: string; value: string; relevance: string }>;
    timeline?: Array<{
      id: string;
      mahaDasha: string;
      antarDasha: string;
      startDate: string;
      endDate: string;
      displayLabel: string;
      analysisStartDate?: string;
      analysisEndDate?: string;
      interpretation: {
        consultation: string;
        evidence: Array<{ factor: string; value: string; relevance: string }>;
      };
    }>;
  }>;
  closing: string;
}

export interface VedicChartResponse {
  chart_id: string;
  chart_token: string;
  chart: VedicChartData;
  free_results: VedicFreeResults;
  expires_at: string;
  calculation: { provider: 'VedAstro'; ayanamsa: 'Lahiri' };
}

export const vedicAstrologyApi = {
  createChart: (body: { birth_date: string; birth_time: string; birth_place: string; consent: boolean }) =>
    req<VedicChartResponse>('/api/vedic-astrology/charts', {
      method: 'POST', body, timeoutMs: 45000,
    }),

  getPaidReport: (body: { chart_id: string; chart_token: string; order_id: string; order_token: string }) =>
    req<{ scope: string; report: VedicReport; cached: boolean }>('/api/vedic-astrology/reports', {
      method: 'POST', body, timeoutMs: 150000,
    }),
};

export const publicApi = {
  saveEmail: (email: string, source: string) =>
    req<{ success: boolean; message?: string }>('/api/save-email', {
      method: 'POST',
      body: { email, source },
    }),

  track: (event_type: 'page_view' | 'email_submit' | 'pay_success', meta: Record<string, unknown> = {}) =>
    req<{ ok: true }>('/api/track', { method: 'POST', body: { event_type, meta } }).catch(() => {
    }),

  conversionEvent: (event_type: string, event_data: Record<string, unknown> = {}, email?: string | null) =>
    req<{ ok: true }>('/api/conversion-events', {
      method: 'POST',
      body: { event_type, event_data, email: email ?? null },
    }).catch(() => {}),

  buttonLink: (buttonKey: string) =>
    req<PublicButtonLink>(`/api/button-links/${encodeURIComponent(buttonKey)}`),
};

export interface PublicShareCard {
  name: string;
  position?: string;
}

export interface CreateShareResultInput {
  deck_id: string;
  deck_name: string;
  spread_name: string;
  cards: PublicShareCard[];
  summary: string;
  image_base64: string;
}

export const shareApi = {
  create: (body: CreateShareResultInput) =>
    req<{ id: string; url: string; expires_at: string }>('/api/share-results', {
      method: 'POST',
      body,
      timeoutMs: 30000,
    }),

  cardImageUrl: (deckId: string, cardKey: string) =>
    `${BASE}/api/share-card-image?deck_id=${encodeURIComponent(deckId)}&card_key=${encodeURIComponent(cardKey)}`,
};

export interface NumerologyShareProof {
  order_id: string;
  order_token: string;
}

export type NumerologyShareGroup = 'profile' | 'missing' | 'grid' | 'oracle' | 'forecast' | 'bracelet' | 'summary';

export interface NumerologyShareAccess {
  groups: NumerologyShareGroup[];
  plan_names: string[];
  plan_for: Partial<Record<NumerologyShareGroup, string>>;
  issued_capabilities: string[];
}

export interface CreateNumerologyShareInput {
  section_key: string;
  numerology_number: number;
  section_name: string;
  share_scope: 'single_section' | 'report_summary';
  summary: string;
  guidance: string;
  highlights?: string[];
  image_base64: string;
  proofs: NumerologyShareProof[];
  capabilities: string[];
}

export const numerologyShareApi = {
  access: (body: { proofs: NumerologyShareProof[]; capabilities: string[] }) =>
    req<NumerologyShareAccess>('/api/numerology-share-access', { method: 'POST', body }),
  create: (body: CreateNumerologyShareInput) =>
    req<{ id: string; url: string; revoke_token: string; expires_at: string; issued_capabilities: string[] }>(
      '/api/numerology-share-results',
      { method: 'POST', body, timeoutMs: 30000 },
    ),
  revoke: (id: string, revokeToken: string) =>
    req<{ ok: true }>(`/api/numerology-share-results/${encodeURIComponent(id)}`, {
      method: 'DELETE', body: { revoke_token: revokeToken },
    }),
};

export interface HumanDesignChartInput {
  birth_date: string;
  birth_time: string;
  birth_city: string;
  hd_type: string;
  hd_profile: string;
  hd_authority: string;
  chart_data: unknown;
  user_name?: string;
  user_email?: string;
}

export interface HumanDesignFullReportSection {
  id: string;
  title: string;
  icon: string;
  body: string;
}

export const humanDesignApi = {
  saveChart: (body: HumanDesignChartInput) =>
    req<{ chart_id: string; session_id: string }>('/api/human-design/charts', {
      method: 'POST',
      body,
      timeoutMs: 20000,
    }),

  updateAnswers: (chart_id: string, chat_answers: number[]) =>
    req<{ ok: true }>(`/api/human-design/charts/${encodeURIComponent(chart_id)}/answers`, {
      method: 'POST',
      body: { chat_answers },
    }),

  getFullReport: (chart_id: string, auth: { proofs: HumanDesignShareProof[]; capabilities: string[] }) =>
    req<{ report_version: string; sections: HumanDesignFullReportSection[]; cached: boolean }>(
      `/api/human-design/charts/${encodeURIComponent(chart_id)}/full-report`,
      { method: 'POST', body: auth, timeoutMs: 70000 },
    ),
};

export interface ReadingPick {
  position: number;
  position_label: string;
  card_key: string;
  card_name: string;
  card_name_secondary: string | null;
  reversed?: boolean;
  gated: unknown | null;
}

export interface ReadingRow {
  id: string;
  reading_type: string;
  unlocked_at: string;
  picks: ReadingPick[];
  raw_card_data: unknown;
}

export interface AdminOrder {
  id: string;
  merchant_trade_no: string;
  user_id: string | null;
  email: string;
  item_type: string;
  item_id: string;
  item_name: string;
  amount: number;
  status: 'pending' | 'paid' | 'failed' | 'cancelled';
  ecpay_trade_no: string | null;
  ecpay_payment_type: string | null;
  created_at: string;
  paid_at: string | null;
}

export type AdminMemberSort = 'last_login_at' | 'created_at' | 'tarot_usage_count';
export type AdminMemberOrder = 'asc' | 'desc';

export interface AdminMember {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  pictureUrl: string | null;
  emailVerified: boolean;
  googleBound: boolean;
  googleSubMasked: string | null;
  tarotUsageCount: number;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
  loginProvider: 'Google';
}

export interface AdminMembersResponse {
  members: AdminMember[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AdminMemberStats {
  totalMembers: number;
  newToday: number;
  newLast7Days: number;
  activeLast30Days: number;
  tarotUsage: {
    zero: number;
    one: number;
    twoOrMore: number;
  };
}

export const adminApi = {
  check:  () => req<{ isAdmin: boolean }>('/api/admin/check'),
  users:  () => req<{ users: Profile[] }>('/api/admin/users'),
  members: (query: {
    page?: number;
    limit?: number;
    search?: string;
    sort?: AdminMemberSort;
    order?: AdminMemberOrder;
  } = {}) => req<AdminMembersResponse>('/api/admin/members', { query }),
  member: (id: string) =>
    req<{ member: AdminMember }>(`/api/admin/members/${encodeURIComponent(id)}`),
  memberStats: () => req<AdminMemberStats>('/api/admin/members/stats'),
  guests: () => req<{ guests: GuestEmail[] }>('/api/admin/guest-emails'),
  admins: () => req<{ admins: AdminRow[] }>('/api/admin/admins'),
  addAdmin:    (email: string) => req<{ ok: true }>('/api/admin/admins', { method: 'POST', body: { email } }),
  removeAdmin: (id: string)    => req<{ ok: true }>(`/api/admin/admins/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  metricsDaily: (days: number) => req<MetricsResponse>('/api/metrics/daily', { query: { days } }),
  orders: (status?: string) =>
    req<{ orders: AdminOrder[]; summary: { paid_count: number; revenue: number } }>(
      '/api/admin/orders',
      { query: status ? { status } : {} },
    ),
  deleteOrder: (id: string) =>
    req<{ ok: true }>(`/api/admin/orders/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  bulkDeleteOrders: (ids: string[]) =>
    req<{ ok: true; deleted: number; failed: number }>(`/api/admin/orders/bulk-delete`, {
      method: 'POST',
      body: { ids },
    }),
  orderReading: (id: string) =>
    req<{
      order: {
        id: string;
        merchant_trade_no: string;
        user_id: string | null;
        email: string;
        item_id: string;
        item_name: string;
        status: string;
        paid_at: string | null;
        created_at: string;
      };
      accessGranted: boolean;
      readings: {
        advanced: ReadingRow[];
        single: ReadingRow[];
      };
    }>(`/api/admin/orders/${encodeURIComponent(id)}/reading`),

  repairOrderAccess: (id: string) =>
    req<{ ok: true; alreadyGranted: boolean }>(`/api/admin/orders/${encodeURIComponent(id)}/repair-access`, {
      method: 'POST',
    }),
  googleForms: () =>
    req<{ forms: GoogleFormAdmin[] }>('/api/admin/google-forms'),
  createGoogleForm: (body: { name: string; url: string; is_active: boolean }) =>
    req<{ form: GoogleFormAdmin }>('/api/admin/google-forms', { method: 'POST', body }),
  updateGoogleForm: (id: string, body: { name: string; url: string; is_active: boolean }) =>
    req<{ form: GoogleFormAdmin }>(`/api/admin/google-forms/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body,
    }),
  deleteGoogleForm: (id: string) =>
    req<{ ok: true; affected_buttons: Array<{ button_key: string; label: string }> }>(
      `/api/admin/google-forms/${encodeURIComponent(id)}`,
      { method: 'DELETE', body: { confirm: true } },
    ),
  buttonLinkSettings: () =>
    req<{ settings: ButtonLinkSetting[] }>('/api/admin/button-link-settings'),
  updateButtonLinkSetting: (buttonKey: string, googleFormId: string) =>
    req<{ ok: true; setting: { button_key: string; google_form_id: string } }>(
      `/api/admin/button-link-settings/${encodeURIComponent(buttonKey)}`,
      { method: 'PUT', body: { google_form_id: googleFormId } },
    ),
};

export interface HumanDesignShareProof {
  order_id: string;
  order_token: string;
}

export type HumanDesignShareGroup = 'identity' | 'core' | 'full' | 'summary';

export interface HumanDesignShareAccess {
  groups: HumanDesignShareGroup[];
  plan_names: string[];
  plan_for: Partial<Record<HumanDesignShareGroup, string>>;
  issued_capabilities: string[];
}

export const humanDesignShareApi = {
  access: (body: { chart_id: string; proofs: HumanDesignShareProof[]; capabilities: string[] }) =>
    req<HumanDesignShareAccess>('/api/human-design-share-access', { method: 'POST', body }),
  create: (body: {
    chart_id: string;
    section_key: string;
    image_base64: string;
    proofs: HumanDesignShareProof[];
    capabilities: string[];
  }) => req<{ id: string; url: string; revoke_token: string; expires_at: string; issued_capabilities: string[] }>(
    '/api/human-design-share-results', { method: 'POST', body, timeoutMs: 30000 },
  ),
  revoke: (id: string, revokeToken: string) =>
    req<{ ok: true }>(`/api/human-design-share-results/${encodeURIComponent(id)}`, {
      method: 'DELETE', body: { revoke_token: revokeToken },
    }),
};

export type DeckId =
  | 'tarot' | 'osho' | 'lightworker' | 'unicorns'
  | 'egyptian_gods' | 'work_your_light' | 'dragons';

export interface DeckSummary {
  id: DeckId;
  name: string;
  card_count: number;
}

export interface CardPreview {
  id: string;
  deck_id: DeckId;
  card_key: string;
  position: number;
  name: string;
  name_secondary: string | null;
  image: string | null;
  preview: Record<string, unknown>;
  preview_excerpt?: string;
  upright_excerpt?: string;
  reversed_excerpt?: string;
}

export interface UnlockedCard extends CardPreview {
  gated: Record<string, unknown>;
  reversed?: boolean;
}

export const cardsApi = {
  decks: () => req<{ decks: DeckSummary[] }>('/api/decks'),

  deckPreview: (deckId: DeckId) =>
    req<{ deck_id: DeckId; cards: CardPreview[] }>(`/api/decks/${encodeURIComponent(deckId)}/preview`),

  freeUnlockSingle: (spread_id: string, card_key: string, reversed = false, reading_id?: string) =>
    req<{ card: UnlockedCard; free_readings_remaining: number | null }>('/api/cards/free-unlock-single', {
      method: 'POST',
      body: { spread_id, card_key, reversed, reading_id },
    }),

  freeUnlockSpread: (
    spread_id: string,
    picks: Array<{ card_key: string; position: number; reversed?: boolean }>,
    reading_id?: string,
    email?: string,
  ) =>
    req<{ spread_id: string; cards: UnlockedCard[]; free_readings_remaining: number }>('/api/cards/free-unlock-spread', {
      method: 'POST',
      body: { spread_id, picks, reading_id, email },
    }),

  unlockSingle: (spread_id: string, card_key: string, email: string, reversed = false) =>
    req<{ card: UnlockedCard }>('/api/cards/single-unlock', {
      method: 'POST',
      body: { spread_id, card_key, email, reversed },
    }),

  unlockSpread: (
    spread_id: string,
    picks: Array<{ card_key: string; position: number; reversed?: boolean }>,
    order_id: string,
    order_token?: string | null,
  ) =>
    req<{ spread_id: string; cards: UnlockedCard[] }>('/api/cards/spread-unlock', {
      method: 'POST',
      body: { spread_id, picks, order_id, order_token: order_token ?? undefined },
    }),
};

export const oracleFreeApi = {
  status: () => req<{ completed_free_readings: number; remaining_free_readings: number }>(
    '/api/oracle/free-reading-status',
  ),
  start: (spread_id: string) => req<{ reading_id: string; remaining_free_readings: number }>(
    '/api/oracle/free-reading-start', { method: 'POST', body: { spread_id } },
  ),
  complete: (reading_id: string) => req<{
    free_reading_number: 1 | 2;
    completed_free_readings: number;
    remaining_free_readings: number;
  }>('/api/oracle/free-reading-complete', { method: 'POST', body: { reading_id } }),
};

export interface DailyRow {
  date: string;
  page_view: number;
  email_submit: number;
  pay_success: number;
  revenue: number;
  email_conversion_rate: number;
  pay_conversion_rate: number;
  payments: PaymentDetail[];
}
export interface PaymentDetail {
  paid_at: string;
  email: string;
  item_id: string;
  item_name: string;
  deck_name: string;
  spread_name: string;
  amount: number;
}
export interface MetricsResponse {
  today: DailyRow;
  totals: DailyRow;
  daily: DailyRow[];
}
