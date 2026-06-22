import { useState } from 'react';
import { Sparkles } from 'lucide-react';

interface Props {
  onSubmit: (date: string, useOracle: boolean) => void;
  loading: boolean;
}

const currentYear = new Date().getFullYear();

function isValidDate(y: string, m: string, d: string): boolean {
  const yn = parseInt(y), mn = parseInt(m), dn = parseInt(d);
  if (!y || !m || !d) return false;
  if (yn < 1900 || yn > currentYear) return false;
  if (mn < 1 || mn > 12) return false;
  if (dn < 1) return false;
  const daysInMonth = new Date(yn, mn, 0).getDate();
  if (dn > daysInMonth) return false;
  return true;
}

export default function BirthDateForm({ onSubmit, loading }: Props) {
  const [year, setYear]   = useState('');
  const [month, setMonth] = useState('');
  const [day, setDay]     = useState('');
  const [errors, setErrors] = useState({ year: '', month: '', day: '' });

  const valid = isValidDate(year, month, day);

  function validateField(field: 'year' | 'month' | 'day', val: string) {
    const n = parseInt(val);
    if (!val) return '';
    if (field === 'year')  return (n < 1900 || n > currentYear) ? `請輸入 1900–${currentYear}` : '';
    if (field === 'month') return (n < 1 || n > 12) ? '請輸入 1–12' : '';
    if (field === 'day')   return (n < 1 || n > 31) ? '請輸入 1–31' : '';
    return '';
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    const mn = month.padStart(2, '0');
    const dn = day.padStart(2, '0');
    onSubmit(`${year}-${mn}-${dn}`, true);
  };

  const inputStyle = (error: string): React.CSSProperties => ({
    display: 'block',
    width: '100%',
    boxSizing: 'border-box',
    padding: '14px 14px',
    fontSize: 16,
    fontFamily: 'Inter, sans-serif',
    color: '#e9d5ff',
    background: 'rgba(255,255,255,0.04)',
    border: error
      ? '1px solid rgba(248,113,113,0.55)'
      : '1px solid rgba(167,139,250,0.22)',
    borderRadius: 12,
    outline: 'none',
    touchAction: 'manipulation',
    WebkitTapHighlightColor: 'transparent',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    caretColor: '#a78bfa',
  });

  return (
    <div style={{ width: '100%', maxWidth: 448, margin: '0 auto' }}>

      {/* Heading */}
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 60, height: 60, borderRadius: '50%',
          background: 'radial-gradient(circle at 35% 30%, rgba(167,139,250,0.2), rgba(96,165,250,0.06))',
          border: '1px solid rgba(167,139,250,0.25)',
          boxShadow: '0 0 28px rgba(109,40,217,0.2)',
          marginBottom: 14,
        }}>
          <Sparkles style={{ width: 26, height: 26, color: '#a78bfa' }} />
        </div>
        <h2 style={{
          fontFamily: 'Playfair Display, serif', fontSize: 22, marginBottom: 8,
          background: 'linear-gradient(135deg, #a78bfa, #c4b5fd, #fbbf24)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
        }}>解碼你的靈魂數字</h2>
        <p style={{ color: 'rgba(196,181,253,0.55)', fontSize: 14, lineHeight: 1.6 }}>
          輸入你的生日，AI 將為你揭示生命靈數密碼
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Date inputs */}
        <div>
          <div style={{
            fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase',
            color: 'rgba(167,139,250,0.45)', marginBottom: 10, paddingLeft: 2,
          }}>出生日期</div>

          <NumberInput
            label="年份（如：1990）"
            value={year}
            placeholder="西元年（如 1990）"
            min={1900}
            max={currentYear}
            error={errors.year}
            inputStyle={inputStyle(errors.year)}
            onChange={v => { setYear(v); setErrors(e => ({ ...e, year: validateField('year', v) })); }}
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
            <NumberInput
              label="月份（1–12）"
              value={month}
              placeholder="月（1–12）"
              min={1}
              max={12}
              error={errors.month}
              inputStyle={inputStyle(errors.month)}
              onChange={v => { setMonth(v); setErrors(e => ({ ...e, month: validateField('month', v) })); }}
            />
            <NumberInput
              label="日期（1–31）"
              value={day}
              placeholder="日（1–31）"
              min={1}
              max={31}
              error={errors.day}
              inputStyle={inputStyle(errors.day)}
              onChange={v => { setDay(v); setErrors(e => ({ ...e, day: validateField('day', v) })); }}
            />
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={!valid || loading}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            width: '100%', padding: '16px', fontSize: 16, fontWeight: 600,
            fontFamily: 'Playfair Display, serif',
            borderRadius: 12, border: 'none',
            cursor: valid && !loading ? 'pointer' : 'not-allowed',
            touchAction: 'manipulation',
            WebkitTapHighlightColor: 'transparent',
            transition: 'all 0.25s',
            ...(valid && !loading
              ? {
                  background: 'linear-gradient(135deg, #7c3aed, #a78bfa, #6d28d9)',
                  color: '#f3e8ff',
                  boxShadow: '0 4px 24px rgba(109,40,217,0.4), 0 0 0 1px rgba(167,139,250,0.2)',
                  textShadow: '0 0 18px rgba(243,232,255,0.55)',
                }
              : {
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: 'rgba(167,139,250,0.35)',
                }),
          } as React.CSSProperties}
        >
          {loading ? (
            <>
              <span style={{
                display: 'inline-block', width: 16, height: 16, borderRadius: '50%',
                border: '2px solid rgba(243,232,255,0.25)', borderTopColor: '#f3e8ff',
                animation: 'spin 0.7s linear infinite', flexShrink: 0,
              }} />
              解析靈魂密碼與神諭卡中...
            </>
          ) : (
            <>
              <Sparkles style={{ width: 16, height: 16, flexShrink: 0 }} />
              探索我的靈數藍圖
            </>
          )}
        </button>

      </form>
    </div>
  );
}

// ── sub-components ────────────────────────────────────────────────────────────

function NumberInput({
  label, value, placeholder, error, inputStyle, onChange,
}: {
  label: string; value: string; placeholder: string;
  min: number; max: number; error: string;
  inputStyle: React.CSSProperties;
  onChange: (v: string) => void;
}) {
  return (
    <div style={{ marginBottom: 0 }}>
      <label style={{
        display: 'block', fontSize: 10, color: 'rgba(167,139,250,0.45)',
        marginBottom: 4, paddingLeft: 2, letterSpacing: '0.05em',
      }}>{label}</label>
      <input
        type="tel"
        inputMode="numeric"
        pattern="[0-9]*"
        value={value}
        placeholder={placeholder}
        onChange={e => {
          const v = e.target.value.replace(/[^0-9]/g, '');
          onChange(v);
        }}
        style={inputStyle}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
      />
      {error && (
        <span style={{ fontSize: 11, color: '#f87171', paddingLeft: 4, marginTop: 2, display: 'block' }}>
          {error}
        </span>
      )}
    </div>
  );
}
