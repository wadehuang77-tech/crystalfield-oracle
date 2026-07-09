import { useState, useEffect } from 'react';
import { ArrowRight, Sparkles, MapPin, Calendar, Clock } from 'lucide-react';

interface LandingPageProps {
  onCalculate: (birthDate: string, birthTime: string, birthCity: string) => void;
}

export default function LandingPage({ onCalculate }: LandingPageProps) {
  const [visible, setVisible] = useState(false);
  const [form, setForm] = useState({ birthDate: '', birthTime: '', birthCity: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.birthDate) e.birthDate = '請選擇出生日期';
    if (!form.birthTime) e.birthTime = '請輸入出生時間';
    if (!form.birthCity.trim()) e.birthCity = '請輸入出生城市';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onCalculate(form.birthDate, form.birthTime, form.birthCity.trim());
    }
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

          <h1 className="text-3xl md:text-4xl font-bold text-white leading-tight mb-3">
            發現你的<br />
            <span className="bg-gradient-to-r from-blue-300 via-cyan-300 to-teal-300 bg-clip-text text-transparent">
              人類圖能量設計
            </span>
          </h1>
          <p className="text-white/40 text-sm leading-relaxed">
            輸入你的出生資料，<br />AI 在幾秒內完成你的人類圖計算。
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
              <div>
                <label className="flex items-center gap-2 text-xs text-white/40 font-medium mb-2">
                  <Calendar className="w-3.5 h-3.5" />
                  出生日期
                </label>
                <input
                  type="date"
                  value={form.birthDate}
                  onChange={e => setForm({ ...form, birthDate: e.target.value })}
                  className={`${inputBase} ${errors.birthDate ? 'border-rose-400/50' : ''}`}
                  max={new Date().toISOString().split('T')[0]}
                />
                {errors.birthDate && (
                  <p className="text-rose-400/80 text-xs mt-1.5">{errors.birthDate}</p>
                )}
              </div>

              {/* Birth Time */}
              <div>
                <label className="flex items-center gap-2 text-xs text-white/40 font-medium mb-2">
                  <Clock className="w-3.5 h-3.5" />
                  出生時間
                </label>
                <input
                  type="time"
                  value={form.birthTime}
                  onChange={e => setForm({ ...form, birthTime: e.target.value })}
                  className={`${inputBase} ${errors.birthTime ? 'border-rose-400/50' : ''}`}
                />
                {errors.birthTime && (
                  <p className="text-rose-400/80 text-xs mt-1.5">{errors.birthTime}</p>
                )}
                <p className="text-white/20 text-xs mt-1.5">
                  出生時間影響你的人生角色計算，請盡量精確
                </p>
              </div>

              {/* Birth City */}
              <div>
                <label className="flex items-center gap-2 text-xs text-white/40 font-medium mb-2">
                  <MapPin className="w-3.5 h-3.5" />
                  出生城市
                </label>
                <input
                  type="text"
                  placeholder="例：台北市、Tokyo、New York"
                  value={form.birthCity}
                  onChange={e => setForm({ ...form, birthCity: e.target.value })}
                  className={`w-full border rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:border-white/30 transition-all duration-200 bg-[#6B7280] text-white placeholder-white/50 ${errors.birthCity ? 'border-rose-400/50' : 'border-white/10'}`}
                />
                {errors.birthCity && (
                  <p className="text-rose-400/80 text-xs mt-1.5">{errors.birthCity}</p>
                )}
              </div>

              {/* Submit */}
              <button
                type="submit"
                className="group relative w-full py-4 rounded-2xl text-sm font-semibold overflow-hidden mt-2"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500" />
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500 blur-xl opacity-40 group-hover:opacity-60 transition-opacity" />
                <div className="relative flex items-center justify-center gap-2 text-white">
                  <Sparkles className="w-4 h-4" />
                  立即計算我的人類圖
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </button>
            </form>
          </div>
        </div>

        {/* Trust signals */}
        <div
          className={`mt-6 flex justify-center gap-6 transition-all duration-700 delay-400 ease-out ${visible ? 'opacity-100' : 'opacity-0'}`}
        >
          {['即時計算', '5 種能量類型', 'AI 深度解析'].map(t => (
            <div key={t} className="flex items-center gap-1.5 text-white/25 text-xs">
              <div className="w-1 h-1 rounded-full bg-cyan-400/50" />
              {t}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
