const BASE = import.meta.env.VITE_API_BASE || '';

interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | undefined>;
}

async function req<T = unknown>(path: string, opts: ApiOptions = {}): Promise<T> {
  const { method = 'GET', body, query } = opts;

  let url = `${BASE}${path}`;
  if (query) {
    const qs = Object.entries(query)
      .filter(([, v]) => v !== undefined && v !== null)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join('&');
    if (qs) url += `?${qs}`;
  }

  const res = await fetch(url, {
    method,
    credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });

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
}

export interface Profile {
  id: string;
  email: string;
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

export const authApi = {
  signUp: (body: {
    email: string;
    password: string;
    age?: number;
    gender?: string;
    occupation?: string;
    healing_interest?: string;
  }) => req<{ user: SessionUser }>('/api/auth/signup', { method: 'POST', body }),

  signIn: (email: string, password: string) =>
    req<{ user: SessionUser }>('/api/auth/signin', { method: 'POST', body: { email, password } }),

  signOut: () => req<{ ok: true }>('/api/auth/signout', { method: 'POST' }),

  me: () => req<{ user: SessionUser | null }>('/api/auth/me'),

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
  createOrder: (spread_id: string, picks?: OrderPick[], guest?: GuestOrderAccess) =>
    req<{ order_id: string; merchant_trade_no: string; ecpay: EcpayForm | null; admin_unlocked?: boolean; order_token?: string | null }>(
      '/api/checkout/create-order',
      { method: 'POST', body: { spread_id, picks, ...guest } },
    ),

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
    }),

  updateAnswers: (chart_id: string, chat_answers: number[]) =>
    req<{ ok: true }>(`/api/human-design/charts/${encodeURIComponent(chart_id)}/answers`, {
      method: 'POST',
      body: { chat_answers },
    }),

  getFullReport: (chart_id: string) =>
    req<{ report_version: string; sections: HumanDesignFullReportSection[]; cached: boolean }>(
      `/api/human-design/charts/${encodeURIComponent(chart_id)}/full-report`,
    ),
};

export interface ReadingPick {
  position: number;
  position_label: string;
  card_key: string;
  card_name: string;
  card_name_secondary: string | null;
  reversed?: boolean;
  gated: Record<string, unknown> | null;
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

export const adminApi = {
  check:  () => req<{ isAdmin: boolean }>('/api/admin/check'),
  users:  () => req<{ users: Profile[] }>('/api/admin/users'),
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
  position?: number;
}

export const cardsApi = {
  decks: () => req<{ decks: DeckSummary[] }>('/api/decks'),

  deckPreview: (deckId: DeckId) =>
    req<{ deck_id: DeckId; cards: CardPreview[] }>(`/api/decks/${encodeURIComponent(deckId)}/preview`),

  freeUnlockSingle: (spread_id: string, card_key: string, reversed = false) =>
    req<{ card: UnlockedCard }>('/api/cards/free-unlock-single', {
      method: 'POST',
      body: { spread_id, card_key, reversed },
    }),

  freeUnlockSpread: (
    spread_id: string,
    picks: Array<{ card_key: string; position: number; reversed?: boolean }>,
  ) =>
    req<{ spread_id: string; cards: UnlockedCard[] }>('/api/cards/free-unlock-spread', {
      method: 'POST',
      body: { spread_id, picks },
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
