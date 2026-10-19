import { useState, useEffect } from 'react';
import { ArrowRight, Sparkles, MapPin, Calendar, Clock } from 'lucide-react';
import HumanDesignSeoContent from './HumanDesignSeoContent';
import HumanDesignTypesSection from './HumanDesignTypesSection';
import { useRouteLanguage } from '../../hooks/useRouteLanguage';
import { t } from '../../lib/i18n';
import { AuthRequiredBirthDate } from '../../components/AuthRequiredBirthDate';

interface LandingPageProps {
  onCalculate: (birthDate: string, birthTime: string, birthCity: string) => void;
  disabled?: boolean;
}

function parseEnglishBirthDate(value: string): string | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());
  if (!match) return null;

  const [, monthText, dayText, yearText] = match;
  const month = Number(monthText);
  const day = Number(dayText);
  const year = Number(yearText);
  if (year < 1000 || month < 1 || month > 12 || day < 1 || day > 31) return null;

  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  if (
    date.getUTCFullYear() !== year
    || date.getUTCMonth() !== month - 1
    || date.getUTCDate() !== day
  ) return null;

  const isoDate = `${yearText}-${monthText}-${dayText}`;
  return isoDate <= new Date().toISOString().slice(0, 10) ? isoDate : null;
}

export default function LandingPage({ onCalculate, disabled = false }: LandingPageProps) {
  const language = useRouteLanguage();
  const copy = (key: string, fallback: string) => language === 'en' ? t(`humanDesign.${key}`, language) : fallback;
  const [visible, setVisible] = useState(false);
  const [form, setForm] = useState({ birthDate: '', birthTime: '', birthCity: '' });
  const [timeParts, setTimeParts] = useState({ hour: '', minute: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [timeConfirmed, setTimeConfirmed] = useState(false);
  const en = language === 'en';
  const hourOptions = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  const minuteOptions = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const birthDate = language === 'en'
      ? parseEnglishBirthDate(form.birthDate)
      : form.birthDate;
    const nextErrors: Record<string, string> = {};
    if (!birthDate) nextErrors.birthDate = copy('dateError', '請選擇出生日期');
    if (!timeParts.hour || !timeParts.minute) nextErrors.birthTime = copy('timeError', '請輸入出生時間');
    if (!timeConfirmed) nextErrors.timeConfirmed = en ? 'Please confirm the birth time and read the calculation limitation.' : '請確認出生時間並閱讀目前計算限制';
    if (!form.birthCity.trim()) nextErrors.birthCity = copy('cityError', '請輸入出生城市');
    setErrors(nextErrors);
    if (birthDate && Object.keys(nextErrors).length === 0) {
      onCalculate(birthDate, `${timeParts.hour}:${timeParts.minute}`, form.birthCity.trim());
    }
  };

  const updateBirthTime = (part: 'hour' | 'minute', value: string) => {
    const next = { ...timeParts, [part]: value };
    setTimeParts(next);
    setTimeConfirmed(false);
    setForm({ ...form, birthTime: next.hour && next.minute ? `${next.hour}:${next.minute}` : '' });
  };

  const inputBase =
    'w-full bg-white/4 border border-white/10 rounded-2xl px-4 py-3.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/30 focus:bg-white/7 transition-all duration-200';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-5 py-16 relative">
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-cyan-600/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Brand */}
        <div
          className={`text-center mb-10 transition-all duration-700 ease-out ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
        >
          <div className="inline-flex items-center gap-2 mb-8">
            <div className="relative">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-400 to-cyan-400 blur-lg opacity-40" />
            </div>
            <span className="text-white font-semibold text-lg tracking-wide">
              Soul<span className="text-cyan-400">Mirror</span>
            </span>
          </div>

          <h1 className="text-3xl md:text-4xl font-bold text-white leading-tight mb-3">{copy('title', '免費人類圖計算：看懂你的能量類型、人生角色與內在權威')}</h1>
          <p className="text-white/40 text-sm leading-relaxed">
            {copy('description', '輸入出生年月日、出生時間與出生地點，建立你的人類圖能量藍圖，了解自己的能量類型、策略、內在權威、人生角色與定義。結果適合作為自我覺察與生活實驗的參考，不是對人生的絕對定論。')}
          </p>
        </div>

        {/* Form card */}
        <div
          className={`transition-all duration-700 delay-200 ease-out ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
        >
          <div className="relative rounded-3xl overflow-hidden">
            <div className="absolute inset-0 bg-white/3 backdrop-blur-sm" />
            <div className="absolute inset-0 border border-white/8 rounded-3xl" />

            <form onSubmit={handleSubmit} className="relative p-7 space-y-5">
              {/* Birth Date */}
              <AuthRequiredBirthDate>
              <div>
                <label className="flex items-center gap-2 text-xs text-white/40 font-medium mb-2">
                  <Calendar className="w-3.5 h-3.5" />
                  {copy('birthDate', '出生日期')}
                </label>
                <input
                  type={language === 'en' ? 'text' : 'date'}
                  inputMode={language === 'en' ? 'numeric' : undefined}
                  placeholder={language === 'en' ? 'MM/DD/YYYY' : undefined}
                  value={form.birthDate}
                  onChange={e => setForm({ ...form, birthDate: e.target.value })}
                  className={`${inputBase} ${errors.birthDate ? 'border-rose-400/50' : ''}`}
                />
                {errors.birthDate && (
                  <p className="text-rose-400/80 text-xs mt-1.5">{errors.birthDate}</p>
                )}
              </div>
              </AuthRequiredBirthDate>

              {/* Birth Time */}
              <div>
                <label htmlFor="hd-birth-hour" className="flex items-center gap-2 text-sm text-white/70 font-medium mb-2">
                  <Clock className="w-3.5 h-3.5" />
                  {en ? 'Local birth time (24-hour clock)' : '出生當地時間（24 小時制）'}
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <select
                    id="hd-birth-hour"
                    aria-label={en ? 'Birth hour' : '出生時'}
                    aria-describedby="hd-time-hint hd-timezone-hint hd-time-error"
                    aria-invalid={!!errors.birthTime}
                    value={timeParts.hour}
                    onChange={e => updateBirthTime('hour', e.target.value)}
                    className={`${inputBase} ${errors.birthTime ? 'border-rose-400/50' : ''}`}
                  >
                    <option value="">{en ? 'Select hour' : '請選擇時（必填）'}</option>
                    {hourOptions.map(hour => (
                      <option key={hour} value={hour}>{hour}</option>
                    ))}
                  </select>
                  <select
                    aria-label={en ? 'Birth minute' : '出生分'}
                    aria-describedby="hd-time-hint hd-timezone-hint hd-time-error"
                    aria-invalid={!!errors.birthTime}
                    value={timeParts.minute}
                    onChange={e => updateBirthTime('minute', e.target.value)}
                    className={`${inputBase} ${errors.birthTime ? 'border-rose-400/50' : ''}`}
                  >
                    <option value="">{en ? 'Select minute' : '請選擇分（必填）'}</option>
                    {minuteOptions.map(minute => (
                      <option key={minute} value={minute}>{minute}</option>
                    ))}
                  </select>
                </div>
                {errors.birthTime && (
                  <p id="hd-time-error" role="alert" className="text-rose-300 text-sm mt-1.5">{errors.birthTime}</p>
                )}
                <p id="hd-time-hint" className="text-slate-300 text-sm leading-6 mt-2">
                  {en ? 'No time is preselected. Midnight is 00:00, noon is 12:00, and 8 PM is 20:00. Select the actual minute; do not assume :00.' : '預設尚未選擇時間。凌晨 12 點為 00:00、中午為 12:00、晚上 8 點為 20:00；分鐘請依紀錄選擇，不要直接假設為整點。'}
                </p>
                <div id="hd-timezone-hint" className="mt-3 rounded-xl border border-cyan-300/20 bg-cyan-300/5 p-4 text-sm leading-6 text-slate-200">
                  <p className="font-semibold text-cyan-200">{en ? 'Taiwan time reference: UTC+8 (Asia/Taipei)' : '台灣時間參考：UTC+8（Asia/Taipei）'}</p>
                  <p className="mt-1">{en ? 'Enter the local time recorded at your birthplace, not your current device time. For births outside Taiwan or historical daylight-saving dates, the correct timezone must be verified separately.' : '請填出生地紀錄的當地時間，不是目前手機或電腦的時間。海外出生或涉及歷史夏令時間時，需另外核對出生當日的時區。'}</p>
                </div>
                <p className="mt-3 text-sm leading-6 text-amber-200">{en ? 'If the time is unknown, check a reliable birth record first. An estimated time can change the chart; a noon estimate is not an accurate substitute.' : '若不確定時、分，建議先查閱可靠的出生紀錄；估計時間可能影響圖表，中午 12:00 不能當作準確時間的替代值。'}</p>
              </div>

              {/* Birth City */}
              <div>
                <label className="flex items-center gap-2 text-xs text-white/40 font-medium mb-2">
                  <MapPin className="w-3.5 h-3.5" />
                  {copy('birthCity', '出生城市')}
                </label>
                <input
                  type="text"
                  placeholder={copy('cityPlaceholder', '例：台北市、Tokyo、New York')}
                  value={form.birthCity}
                  onChange={e => setForm({ ...form, birthCity: e.target.value })}
                  className={`w-full border rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:border-white/30 transition-all duration-200 bg-[#6B7280] text-white placeholder-white/50 ${errors.birthCity ? 'border-rose-400/50' : 'border-white/10'}`}
                />
                {errors.birthCity && (
                  <p className="text-rose-400/80 text-xs mt-1.5">{errors.birthCity}</p>
                )}
              </div>

              {/* Submit */}
              <div className="rounded-xl border border-amber-300/30 bg-amber-300/5 p-4 text-sm leading-6 text-amber-100">
                <p id="hd-calculation-limit">{en ? 'Current limitation: this tool generates a simulated chart from your inputs. It does not yet perform timezone conversion or astronomical calculations, so it cannot provide an accurate Human Design chart.' : '目前計算限制：此工具依輸入資料產生模擬圖表，尚未進行時區換算與天文計算，因此不能提供準確的人類圖排盤。'}</p>
                <label className="mt-3 flex cursor-pointer items-start gap-3">
                  <input type="checkbox" checked={timeConfirmed} onChange={event => setTimeConfirmed(event.target.checked)} aria-describedby="hd-calculation-limit" className="mt-1 h-5 w-5 shrink-0 accent-cyan-300" />
                  <span>{en ? 'I have checked the local birth hour and minute and understand this is a simulated chart.' : '我已核對出生當地的時、分，並了解目前結果為模擬圖表。'}</span>
                </label>
                {errors.timeConfirmed && <p role="alert" className="mt-2 text-rose-300">{errors.timeConfirmed}</p>}
              </div>
              <button
                type="submit"
                disabled={disabled}
                className="group relative mt-2 w-full overflow-hidden rounded-2xl py-4 text-sm font-semibold disabled:opacity-50"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500" />
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500 blur-xl opacity-40 group-hover:opacity-60 transition-opacity" />
                <div className="relative flex items-center justify-center gap-2 text-white">
                  <Sparkles className="w-4 h-4" />
                  {copy('calculate', '立即計算我的人類圖')}
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </button>
            </form>
          </div>
          <HumanDesignTypesSection />
          <HumanDesignSeoContent />
        </div>

        {/* Trust signals */}
        <div
          className={`mt-6 flex justify-center gap-6 transition-all duration-700 delay-400 ease-out ${visible ? 'opacity-100' : 'opacity-0'}`}
        >
          {(language === 'en' ? ['Instant chart calculation', '5 energy types', 'Personal energy insights'] : ['即時計算', '5 種能量類型', '靈魂能量解析']).map((signal) => (
            <div key={signal} className="flex items-center gap-1.5 text-white/25 text-xs">
              <div className="w-1 h-1 rounded-full bg-cyan-400/50" />
              {signal}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
