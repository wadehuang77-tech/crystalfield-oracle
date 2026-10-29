export type VedicAnnualLanguage = 'zh-Hant' | 'en';
export const VEDIC_ANNUAL_PRODUCT = 'vedic_annual';
export const VEDIC_ANNUAL_VERSION = 'calendar-year-v1';
export const VEDIC_ANNUAL_PROMPT_VERSION = 'annual-consultation-v1';
export const VEDIC_ANNUAL_CHAPTERS = [
  ['年度總覽', 'Your year at a glance'], ['大運與小運', 'Mahadasha and Antardasha'],
  ['工作與事業', 'Work and career'], ['金錢與資源', 'Money and resources'],
  ['感情與人際', 'Relationships and communication'], ['家庭與生活安排', 'Home and daily life'],
  ['身心節奏', 'Rest and daily rhythms'], ['年度重要時段', 'Key periods'],
  ['三項年度行動', 'Three annual actions'], ['給你的年度提醒', 'A reminder for your year'],
] as const;
export interface AnnualDashaFact {
  id: string; kind: 'mahadasha' | 'antardasha'; lord: string; parent: string | null;
  sourceStart: string; sourceEndExclusive: string; start: string; endExclusive: string;
  startsWithinYear: boolean; endsWithinYear: boolean;
}
export interface VedicAnnualFacts {
  version: typeof VEDIC_ANNUAL_VERSION;
  year: number; startDate: string; endDate: string; start: string; endExclusive: string; timezone: string;
  birth: {date: string; time: string; location: string; latitude: number; longitude: number; timezone: string; utcOffset: string};
  settings: {provider: 'prokerala'; zodiac: 'sidereal'; ayanamsa: 'lahiri'; houses: 'provider-d1-unverified'; nodes: 'provider-default-unverified'; dashaYearDays: 365.25};
  natal: {moonSign: string; ascendantSign: string; housePlacements: Record<string,number>};
  dasha: AnnualDashaFact[]; dashaCoverage: {mahadasha: boolean; antardasha: boolean};
  transits: AnnualTransitData | null;
  limitations: string[];
}
export interface VedicAnnualPreview {
  id: string; chartId: string; status: 'awaiting_data'; createdAt: string;
  facts: VedicAnnualFacts;
}
export interface VedicAnnualConfig {
  transitEnabled?: boolean;
  adminFree?: boolean;
  product: string; price: number | null; currency: 'TWD'; purchaseEnabled: boolean; generationEnabled: boolean;
  reasons: string[];
}
export interface AnnualReportState {
 authorized:boolean;status:string;error:string|null;
 report:{sections:Array<{key:number;body:string;evidenceIds:string[];actions:string[]}>}|null;
 facts:VedicAnnualFacts|null;
}
export const ANNUAL_TRANSIT_PLANETS=['Jupiter','Saturn','Rahu','Ketu'] as const;
export type AnnualTransitPlanet=typeof ANNUAL_TRANSIT_PLANETS[number];
export interface AnnualTransitPosition {
  planet:AnnualTransitPlanet; sign:string; longitude:number; retrograde:boolean;
  signFromMoon:number; signFromAscendant:number;
}
export interface AnnualTransitSample {at:string; positions:AnnualTransitPosition[]}
export interface AnnualTransitEvent {
  id:string; planet:AnnualTransitPlanet; kind:'sign'|'motion'; from:string; to:string;
  after:string; by:string;
}
export interface AnnualTransitData {
  version:'prokerala-sampled-v1'; provider:'prokerala'; ayanamsa:'lahiri'; nodes:'provider-default-unverified';
  start:string; endExclusive:string; timezone:string; samples:AnnualTransitSample[];
  events:AnnualTransitEvent[]; maxGapDays:number; precision:'sampled-intervals';
}
export interface AnnualTransitState {
  status:'pending'|'collecting'|'completed'|'failed'; callsUsed:number; callLimit:number;
  samplesCollected:number; baselineTotal:number; baselineCollected:number;
  retryAt:string|null; errorCode:string|null; data:AnnualTransitData|null;
}
export function annualVedicMessage(code:string, en:boolean):string {
  const messages:Record<string,[string,string]> = {
    DASHA_SECOND_PRECISION:['來源大運相鄰時段有至多 1 秒的精度差異；保留原始時間，不將此差異解讀為空白運勢。','Adjacent source Dasha periods differ by up to one second. Original timestamps are retained; this precision gap is not interpreted as a missing life phase.'],
    ORDER_REVIEW:['此訂單需確認狀態，請聯絡客服；不會建立另一筆重複付款。','This order needs review. Contact support; another charge will not be created.'],
    GENERATION_BUSY:['已有報告正在處理，請稍後重新讀取。','A report is already processing. Please reload shortly.'],
    GENERATION_FAILED:['生成中斷，已保留資料與權限。請重試，不需再次付款。','Generation stopped. Data and access are retained. Retry without paying again.'],
    AI_FAILED:['AI 服務暫時無法完成解讀，請稍後重試。','The AI service could not finish this reading. Please retry later.'],
    AI_INCOMPLETE:['AI 回應尚未完整，未顯示半份報告。請重試，已購權限保留。','The AI response was incomplete. No partial report is displayed. Retry with your existing access.'],
    AI_OUTCOME_UNKNOWN:['AI 回應中斷，尚未取得可保存內容。可手動重試，已購權限保留。','The AI response was interrupted before content could be saved. You may retry manually; purchase access is retained.'],
    REPORT_INVALID:['解讀未通過完整性驗證，未顯示不完整報告。請重試。','The reading failed validation. No incomplete report is shown. Please retry.'],
    AI_BUDGET:['此份報告已達生成次數或成本上限，請聯絡客服協助；不需再次購買。','This report reached its generation or cost limit. Contact support; do not purchase again.'],
    TRANSITS_SAMPLED:['全年行運採每 8 日取樣，並細分觀察到的變化；可能漏掉短暫往返，轉換日期只表示觀測區間。','Annual transits are sampled every eight days with observed changes refined. Brief reversals may be missed; transition dates represent observation intervals.'],
    PROKERALA_TRANSPORT_OR_JSON_ERROR:['星位服務連線或回應格式異常，已保留樣本。請稍後重試，不需再次付款。','Position service connection or response failed. Samples are retained. Retry later without paying again.'],
    TRANSITS_DISABLED:['年度星位收集尚未啟用，請聯絡管理員確認服務設定。','Annual position collection is not enabled. Contact the administrator.'],
    TRANSIT_INVALID:['行運回傳資料未通過驗證，未用於報告。','Transit data failed validation and was not used in a report.'],
    TRANSIT_INCOMPLETE:['全年取樣尚未完成，請繼續收集。','Annual sampling is incomplete. Continue collection.'],
    TRANSIT_BUDGET:['已達本份年度資料 64 次請求上限，請聯絡管理員；不會自動增加費用。','This case has reached its 64-request limit. Contact the administrator; no further calls will be made automatically.'],
    TRANSIT_FAILED:['星位收集未成功，已保留完成的樣本，可重試。','Collection failed. Completed samples are retained for retry.'],
    PROKERALA_RATE_LIMITED:['星位服務暫時限流，請等候下方時間後重試。','The position provider is rate limited. Retry after the time shown below.'],
    PROKERALA_AUTH_FAILED:['星位服務認證或方案權限不足，請聯絡管理員。','Provider credentials or plan access need administrator attention.'],
    PROKERALA_INVALID_RESPONSE:['星位服務回傳資料不完整，未用於報告。','The provider returned incomplete data; it was not used in a report.'],
    PROKERALA_TIMEOUT:['星位服務逾時，已完成樣本保留，可重試。','The provider timed out. Completed samples are retained; retry is available.'],
    LOGIN_REQUIRED:['請先登入，選取已儲存的出生盤。','Sign in to select a saved birth chart.'],
    NOT_FOUND:['找不到你的資料，或你沒有存取權限。','This record is unavailable or belongs to another account.'],
    INVALID_INPUT:['請選擇有效的出生盤與 1900–2100 年份。','Select a valid birth chart and a year between 1900 and 2100.'],
    BIRTH_INCOMPLETE:['出生時間、地點或歷史時區資料不完整；無法可靠判讀上升、宮位與精確大運時間。請回出生盤頁確認資料。','Birth time, location or historical timezone data is incomplete. Ascendant, houses and precise Dasha timing cannot be used reliably. Review the birth chart.'],
    PROVIDER_UNSUPPORTED:['這份舊出生盤沒有可核對的 Prokerala 計算資料；不會混用其他 provider 推測流年。','This older chart has no verifiable Prokerala calculation data. Annual analysis will not mix providers.'],
    DASHA_INVALID:['大運資料日期、順序或小運範圍不完整，暫時無法整理年度時間軸。','Dasha dates, ordering or sub-period ranges are invalid. The annual timeline cannot be prepared.'],
    DASHA_COVERAGE:['現有大運或小運資料未完整涵蓋全年；只呈現已有資料的時段。','Saved Dasha periods do not cover the entire year. Only supported intervals are shown.'],
    TRANSITS_UNAVAILABLE:['年度行運資料尚未接妥，不會以單日星位推論全年或產生月份吉凶。','Annual transit data is not connected. A single planetary snapshot will not be treated as a full-year forecast.'],
    SETTINGS_UNVERIFIED:['目前沿用出生盤的 Lahiri；provider 的宮位及 Rahu／Ketu 算法細節仍待核實。','Lahiri is retained from the birth chart. Provider house-system and Rahu/Ketu method details still need verification.'],
    PRICE_REQUIRED:['價格待設定，尚未開放購買。','Price is not configured. Purchasing is closed.'],
    RELEASE_PENDING:['完整流年解讀尚未開放；目前可查看與保存年度大運資料，不會扣款或呼叫 AI。','Full annual readings are not available yet. You can review and save annual Dasha data without payment or AI calls.'],
    STORAGE_NOT_READY:['年度資料儲存尚未啟用，請稍後再試。','Annual storage is not enabled yet. Please try again later.'],
    CLAIM_INVALID:['這份訪客出生盤已過期或無法認領；請回出生盤頁確認登入狀態。','This guest chart has expired or cannot be claimed. Return to the birth chart page.'],
    PAYMENT_REQUIRED:['尚未取得這份年度報告的有效購買權限。','There is no valid purchase entitlement for this annual report.'],
    INTERNAL_ERROR:['目前無法讀取年度資料，請稍後重試。','Annual data could not be loaded. Please retry later.'],
    BAD_ORIGIN:['請從本站操作。','Please use this feature from the website.'],
    TOO_MANY_REQUESTS:['操作過於頻繁，請稍後再試。','Too many requests. Please try again later.'],
  };
  return messages[code]?.[en?1:0] ?? messages.INTERNAL_ERROR[en?1:0];
}
export function annualPlanet(name:string,en:boolean) {
  const names:Record<string,string>={Sun:'太陽',Moon:'月亮',Mars:'火星',Mercury:'水星',Jupiter:'木星',Venus:'金星',Saturn:'土星',Rahu:'Rahu 北交點',Ketu:'Ketu 南交點'};
  return en?name:names[name]??name;
}
