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
  created_at: string;
  updated_at: string;
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

export interface EcpayForm {
  endpoint: string;
  fields: Record<string, string>;
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
  createOrder: (spread_id: string, picks?: OrderPick[]) =>
    req<{ order_id: string; merchant_trade_no: string; ecpay: EcpayForm | null; admin_unlocked?: boolean }>(
      '/api/checkout/create-order',
      { method: 'POST', body: { spread_id, picks } },
    ),

  getOrder: (orderId: string) =>
    req<{ order: Order }>(`/api/orders/${encodeURIComponent(orderId)}`),

  catalog: () =>
    req<{ catalog: Record<string, { id: string; name: string; amount: number }> }>(
      '/api/checkout/catalog',
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

  unlockSingle: (spread_id: string, card_key: string, email: string, reversed = false) =>
    req<{ card: UnlockedCard }>('/api/cards/single-unlock', {
      method: 'POST',
      body: { spread_id, card_key, email, reversed },
    }),

  unlockSpread: (
    spread_id: string,
    picks: Array<{ card_key: string; position: number; reversed?: boolean }>,
    order_id: string,
  ) =>
    req<{ spread_id: string; cards: UnlockedCard[] }>('/api/cards/spread-unlock', {
      method: 'POST',
      body: { spread_id, picks, order_id },
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
}
export interface MetricsResponse {
  today: DailyRow;
  totals: DailyRow;
  daily: DailyRow[];
}
