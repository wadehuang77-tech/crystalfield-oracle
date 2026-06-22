import { publicApi } from './api';

export type TrackEventType = 'page_view' | 'email_submit' | 'pay_success';

export async function trackEvent(
  event_type: TrackEventType,
  meta: Record<string, unknown> = {},
): Promise<void> {
  await publicApi.track(event_type, meta);
}
