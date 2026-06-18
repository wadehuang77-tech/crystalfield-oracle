import { useEffect, useRef, useState } from 'react';
import { X, Loader2, BookOpen, ShieldAlert, ShieldCheck, Wrench } from 'lucide-react';
import { adminApi, type ReadingRow, type ReadingPick } from '../lib/api';

interface OrderReadingResponse {
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
  readings: { advanced: ReadingRow[]; single: ReadingRow[] };
}

export function OrderReadingModal({
  orderId,
  onClose,
}: {
  orderId: string;
  onClose: () => void;
}) {
  const [data, setData] = useState<OrderReadingResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [repairing, setRepairing] = useState(false);
  const [repairResult, setRepairResult] = useState<string | null>(null);
  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;
    adminApi.orderReading(orderId)
      .then((res) => { if (!cancelledRef.current) setData(res); })
      .catch((err) => { if (!cancelledRef.current) setError(err instanceof Error ? err.message : '載入失敗'); });
    return () => { cancelledRef.current = true; };
  }, [orderId]);

  const handleRepair = async () => {
    if (!data || repairing) return;
    if (!confirm(`確定要把「${data.order.item_id}」加進 ${data.order.email} 的 purchased_spreads 嗎？\n(舊版相容路徑;單次付費模式下不影響新訂單的解鎖驗證)`)) return;
    setRepairing(true);
    setRepairResult(null);
    try {
      const res = await adminApi.repairOrderAccess(orderId);
      if (cancelledRef.current) return;
      setRepairResult(res.alreadyGranted ? '此用戶本來就已有解鎖權限,無需修復' : '已修復:用戶現在可以查看牌陣內容');
      const fresh = await adminApi.orderReading(orderId);
      if (cancelledRef.current) return;
      setData(fresh);
    } catch (err) {
      if (cancelledRef.current) return;
      setRepairResult(err instanceof Error ? `修復失敗:${err.message}` : '修復失敗');
    } finally {
      if (!cancelledRef.current) setRepairing(false);
    }
  };

  const fmt = (s: string) =>
    new Date(s).toLocaleString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-md border-2 border-blue-500/30 rounded-2xl p-6 shadow-xl w-full max-w-3xl max-h-[88vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 pb-5 mb-5 border-b border-blue-500/15">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 border border-blue-500/40 flex items-center justify-center text-blue-400 flex-shrink-0">
              <BookOpen className="w-4 h-4" strokeWidth={1.4} />
            </div>
            <div className="min-w-0">
              <h2 className="font-serif text-lg sm:text-xl text-blue-100 tracking-[0.22em]">解 讀 紀 錄</h2>
              <p className="text-xs text-blue-300/70 tracking-wide mt-1">用戶遺忘付費結果時，可在此找回</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-blue-400/70 hover:text-blue-100 transition-colors"
            aria-label="關閉"
          >
            <X className="w-5 h-5" strokeWidth={1.6} />
          </button>
        </div>

        {!data && !error && (
          <div className="flex justify-center py-14">
            <Loader2 className="w-7 h-7 text-blue-400 animate-spin" />
          </div>
        )}

        {error && (
          <div className="border border-red-500/40 bg-red-500/8 px-4 py-3 text-blue-200 text-sm tracking-wide">
            {error}
          </div>
        )}

        {data && (
          <div className="space-y-7">
            <section className="border border-blue-500/20 px-4 py-4">
              <div className="grid sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <Row k="訂單號" v={<span className="font-mono text-xs text-blue-300/85">{data.order.merchant_trade_no}</span>} />
                <Row k="Email" v={data.order.email} />
                <Row k="商品" v={data.order.item_name} />
                <Row k="牌陣 ID" v={<span className="font-mono text-xs">{data.order.item_id}</span>} />
                <Row k="付款狀態" v={data.order.status} />
                <Row k="付款時間" v={data.order.paid_at ? fmt(data.order.paid_at) : '—'} />
              </div>
            </section>

            {data.order.status === 'paid' && (
              data.accessGranted ? (
                <section className="border border-blue-500/35 bg-blue-500/5 px-4 py-3 flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-blue-300 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
                  <div className="text-sm">
                    <p className="text-blue-100 tracking-wide">用戶已有解鎖權限</p>
                    <p className="text-blue-400/70 text-xs mt-1 tracking-wide">
                      {data.readings.advanced.length === 0 && data.readings.single.length === 0
                        ? '尚未抽牌。請用戶從「付款成功」頁的按鈕、或下方「立刻查看完整解析」連結回到牌陣頁,系統會用 order_id 還原同一組牌並載入完整解讀。'
                        : '已抽過牌,下方為解讀紀錄。'}
                    </p>
                  </div>
                </section>
              ) : (
                <section className="border border-red-500/45 bg-red-500/8 px-4 py-3 space-y-3">
                  <div className="flex items-start gap-3">
                    <ShieldAlert className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
                    <div className="text-sm">
                      <p className="text-blue-100 tracking-wide">⚠ 訂單付款狀態異常</p>
                      <p className="text-blue-300/80 text-xs mt-1 tracking-wide leading-relaxed">
                        此訂單沒有對應的 user_id(未登入結帳的歷史訂單),無法走單次付費模式驗證。
                        如果客服需要救援,可點「補進 purchased_spreads」走舊版相容路徑。
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleRepair}
                    disabled={repairing}
                    className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-slate-800/60 border-2 border-blue-500/30 rounded-xl hover:bg-slate-700/60 hover:border-blue-400/50 transition-all text-blue-200 !text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Wrench className="w-3.5 h-3.5" strokeWidth={1.5} />
                    {repairing ? '處理中…' : '補進 purchased_spreads'}
                  </button>
                  {repairResult && (
                    <p className="text-xs text-blue-200 tracking-wide pl-8">{repairResult}</p>
                  )}
                </section>
              )
            )}

            <ReadingSection title="完整牌陣紀錄" rows={data.readings.advanced} fmt={fmt} />
            <ReadingSection title="單張解鎖紀錄" rows={data.readings.single} fmt={fmt} />

            {data.readings.advanced.length === 0 && data.readings.single.length === 0 && data.accessGranted && (
              <div className="text-center py-9 border border-dashed border-blue-500/15">
                <p className="text-blue-300/60 text-sm tracking-wide">
                  尚未抽牌
                </p>
                <p className="text-blue-400/50 text-xs tracking-wide mt-2">
                  用戶已有解鎖權限,但還沒回到牌陣頁面抽牌。請用戶回到「{data.order.item_name}」頁面,系統會自動載入完整解讀並寫入紀錄。
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-3">
      <span className="text-blue-400/85 text-xs tracking-[0.18em] min-w-[5.5rem]">{k}</span>
      <span className="text-blue-100 break-all">{v}</span>
    </div>
  );
}

function ReadingSection({
  title,
  rows,
  fmt,
}: {
  title: string;
  rows: ReadingRow[];
  fmt: (s: string) => string;
}) {
  if (rows.length === 0) return null;
  const parseErrored = (raw: unknown): raw is { _parseError: true; _raw?: string } =>
    !!raw && typeof raw === 'object' && (raw as { _parseError?: boolean })._parseError === true;
  return (
    <section>
      <h3 className="font-serif text-sm text-blue-100 tracking-[0.22em] mb-3">{title}（{rows.length}）</h3>
      <div className="space-y-3">
        {rows.map((row) => (
          <ReadingRowCard
            key={row.id}
            row={row}
            fmt={fmt}
            parseErrored={parseErrored(row.raw_card_data)}
          />
        ))}
      </div>
    </section>
  );
}

function ReadingRowCard({
  row,
  fmt,
  parseErrored,
}: {
  row: ReadingRow;
  fmt: (s: string) => string;
  parseErrored: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="border border-blue-500/20 px-4 py-3">
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <span className="text-xs text-blue-400/85 tracking-[0.18em]">{fmt(row.unlocked_at)}</span>
        <span className="font-mono text-[10px] text-blue-400/55">{row.id.slice(0, 8)}</span>
      </div>
      {parseErrored ? (
        <div className="border border-red-500/45 bg-red-500/10 px-3 py-3 text-xs text-blue-200 tracking-wide">
          <p className="mb-2">⚠ 此筆資料 JSON 無法解析(歷史資料格式)</p>
          <pre className="text-[11px] text-blue-300/85 whitespace-pre-wrap break-words max-h-48 overflow-y-auto">
            {(row.raw_card_data as { _raw?: string })?._raw ?? ''}
          </pre>
        </div>
      ) : row.picks.length === 0 ? (
        <p className="text-xs text-blue-300/60 tracking-wide italic">— (無牌資料)</p>
      ) : (
        <>
          <div className="space-y-1.5">
            {row.picks.map((p) => (
              <PickRow key={`${p.position}-${p.card_key}`} pick={p} />
            ))}
          </div>
          {row.picks.some((p) => p.gated) && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="mt-3 text-xs text-blue-300/85 hover:text-blue-100 tracking-[0.2em] transition-colors"
            >
              {expanded ? '▴ 收 起 完 整 牌 義' : '▾ 展 開 完 整 牌 義（與 用 戶 看 到 的 內 容 一 致）'}
            </button>
          )}
          {expanded && (
            <div className="mt-3 space-y-4 pt-3 border-t border-blue-500/15">
              {row.picks.map((p) => (
                <PickGatedDetail key={`gated-${p.position}-${p.card_key}`} pick={p} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function PickRow({ pick }: { pick: ReadingPick }) {
  return (
    <div className="flex items-baseline gap-3 text-sm">
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-500/15 border border-blue-500/40 text-blue-300 text-xs font-mono shrink-0">
        {pick.position}
      </span>
      {pick.position_label && (
        <span className="text-blue-400/75 text-xs tracking-[0.18em] min-w-[5.5rem] shrink-0">
          {pick.position_label}
        </span>
      )}
      <span className="text-blue-100 font-medium">{pick.card_name}</span>
      {pick.card_name_secondary && (
        <span className="text-blue-300/60 text-xs">{pick.card_name_secondary}</span>
      )}
      {pick.reversed && (
        <span className="text-red-300/85 text-xs px-1.5 py-0.5 border border-red-500/40 rounded">逆位</span>
      )}
    </div>
  );
}

const FIELD_LABELS: Record<string, string> = {
  coreMeaning:        '牌卡訊息',
  actionGuidance:     '行動指引',
  inquiryPrompt:      '深入探問',
  activationPrayer:   '啟動祈禱文',
  transmissionPrayer: '傳遞祈禱文',
  cosmicMessage:      '宇宙訊息',
  currentSituation:   '當下狀況',
  deeperMeaning:      '深層意義',
  energyHealing:      '能量療癒',
  soulQuestion:       '靈魂提問',
  message:            '訊息',
  guidance:           '指引',
  energy:             '能量',
  uprightMeaning:     '正位含義',
  reversedMeaning:    '逆位含義',
  detailedInterpretation: '深度解讀',
  meanings:           '含義',
  currentEnergy:      '當下能量',
  dailyGuidance:      '今日指引',
  emotionalInsight:   '情緒與潛意識',
  blockageAnalysis:   '卡關點解析',
  meditationEntry:    '冥想入口',
  symbol:             '符號',
};

function fieldLabel(key: string): string {
  return FIELD_LABELS[key] ?? key;
}

function PickGatedDetail({ pick }: { pick: ReadingPick }) {
  const gated = pick.gated;
  return (
    <div className="bg-slate-900/40 border border-blue-500/15 rounded p-3">
      <p className="text-blue-100 text-sm mb-2 tracking-wide">
        <span className="font-mono text-blue-400/70 text-xs mr-2">{pick.position}.</span>
        {pick.position_label && <span className="text-blue-300/85 text-xs mr-2">{pick.position_label}</span>}
        <span className="font-medium">{pick.card_name}</span>
        {pick.card_name_secondary && <span className="text-blue-300/60 text-xs ml-2">{pick.card_name_secondary}</span>}
        {pick.reversed && <span className="text-red-300/85 text-xs ml-2 px-1.5 py-0.5 border border-red-500/40 rounded">逆位</span>}
      </p>
      {!gated ? (
        <p className="text-xs text-blue-300/60 italic">— (找不到完整牌義,可能是牌組資料問題)</p>
      ) : (
        <GatedBlock gated={gated} reversed={pick.reversed === true} />
      )}
    </div>
  );
}

function GatedBlock({ gated, reversed }: { gated: Record<string, unknown>; reversed: boolean }) {
  return (
    <div className="space-y-2 text-sm">
      {Object.entries(gated).map(([key, value]) => {
        const isOppositePosition =
          (reversed && key === 'uprightMeaning') ||
          (!reversed && key === 'reversedMeaning');
        return (
          <FieldRow
            key={key}
            label={fieldLabel(key)}
            value={value}
            dimmed={isOppositePosition}
            note={isOppositePosition ? '(用戶看到的是另一面,僅供參考)' : null}
          />
        );
      })}
    </div>
  );
}

function FieldRow({
  label,
  value,
  dimmed,
  note,
}: {
  label: string;
  value: unknown;
  dimmed: boolean;
  note: string | null;
}) {
  if (value == null || value === '') return null;
  const baseColor = dimmed ? 'text-blue-300/40' : 'text-blue-100/90';
  if (typeof value === 'string') {
    return (
      <div>
        <p className={`text-xs ${dimmed ? 'text-blue-400/50' : 'text-blue-400/85'} tracking-[0.16em] mb-0.5`}>
          {label}{note && <span className="ml-2 italic">{note}</span>}
        </p>
        <p className={`${baseColor} text-xs leading-relaxed whitespace-pre-line`}>{value}</p>
      </div>
    );
  }
  if (Array.isArray(value)) {
    return (
      <div>
        <p className={`text-xs ${dimmed ? 'text-blue-400/50' : 'text-blue-400/85'} tracking-[0.16em] mb-0.5`}>
          {label}{note && <span className="ml-2 italic">{note}</span>}
        </p>
        <ul className={`${baseColor} text-xs leading-relaxed list-disc pl-5`}>
          {value.map((item, i) => (
            <li key={i}>{typeof item === 'string' ? item : JSON.stringify(item)}</li>
          ))}
        </ul>
      </div>
    );
  }
  if (value && typeof value === 'object') {
    return (
      <div>
        <p className={`text-xs ${dimmed ? 'text-blue-400/50' : 'text-blue-400/85'} tracking-[0.16em] mb-0.5`}>
          {label}{note && <span className="ml-2 italic">{note}</span>}
        </p>
        <div className="pl-3 border-l border-blue-500/20 space-y-1.5">
          {Object.entries(value as Record<string, unknown>).map(([k, v]) => (
            <FieldRow key={k} label={fieldLabel(k)} value={v} dimmed={dimmed} note={null} />
          ))}
        </div>
      </div>
    );
  }
  return (
    <div>
      <p className={`text-xs ${dimmed ? 'text-blue-400/50' : 'text-blue-400/85'} tracking-[0.16em] mb-0.5`}>{label}</p>
      <p className={`${baseColor} text-xs`}>{String(value)}</p>
    </div>
  );
}
