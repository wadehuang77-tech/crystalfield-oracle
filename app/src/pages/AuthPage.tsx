import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, CheckCircle, Mail, Lock, Sparkles } from 'lucide-react';

type Mode = 'login' | 'signup' | 'forgot-email' | 'forgot-code' | 'forgot-password';

const STARS_BG_URL =
  "url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0ic3RhcnMiIHg9IjAiIHk9IjAiIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48Y2lyY2xlIGN4PSIxIiBjeT0iMSIgcj0iMSIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjMpIi8+PGNpcmNsZSBjeD0iNTAiIGN5PSI4MCIgcj0iMC41IiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMikiLz48Y2lyY2xlIGN4PSIxMzAiIGN5PSI0MCIgcj0iMS41IiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuNCkiLz48Y2lyY2xlIGN4PSIxODAiIGN5PSIxNjAiIHI9IjAuOCIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjMpIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI3N0YXJzKSIvPjwvc3ZnPg==')";

export default function AuthPage() {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [occupation, setOccupation] = useState('');
  const [healingInterest, setHealingInterest] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [resetDoneModal, setResetDoneModal] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);

  const {
    user,
    signUp, signIn,
    requestPasswordReset, verifyResetCode, resetPassword,
  } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const rawRedirect = searchParams.get('redirect');
  const redirectTo = (() => {
    if (!rawRedirect) return null;
    if (!rawRedirect.startsWith('/')) return null;
    if (rawRedirect.startsWith('//')) return null;
    if (rawRedirect.startsWith('/\\')) return null;
    if (rawRedirect === '/auth' || rawRedirect.startsWith('/auth?')) return null;
    return rawRedirect;
  })();

  useEffect(() => {
    if (resendCountdown <= 0) return;
    const t = setTimeout(() => setResendCountdown((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCountdown]);

  useEffect(() => {
    if (user && !showSuccessModal && !resetDoneModal) {
      navigate(redirectTo || '/', { replace: true });
    }
  }, [user, redirectTo, navigate, showSuccessModal, resetDoneModal]);

  const switchMode = (next: Mode) => {
    setMode(next);
    setError('');
    setInfo('');
    if (next === 'login' || next === 'signup') {
      setCode('');
      setResetToken('');
      setPassword('');
    }
  };

  const handleLoginSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'login') {
        const { error } = await signIn(email, password);
        if (error) setError(error.message || '電子郵件或密碼錯誤');
        else navigate(redirectTo || '/');
      } else if (mode === 'signup') {
        if (!age || !gender || !occupation || !healingInterest) {
          setError('請填寫所有註冊資料');
          setLoading(false);
          return;
        }
        const { error } = await signUp(email, password, {
          age: parseInt(age),
          gender,
          occupation,
          healing_interest: healingInterest,
        });
        if (error) setError(error.message || '註冊失敗');
        else setShowSuccessModal(true);
      }
    } catch {
      setError('發生錯誤,請稍後再試');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);
    try {
      const { error } = await requestPasswordReset(email);
      if (error) {
        setError(error.message);
      } else {
        setInfo(`驗證碼已寄至 ${email}(15 分鐘內有效,請檢查信箱與垃圾信件夾)`);
        setMode('forgot-code');
        setResendCountdown(60);
      }
    } catch {
      setError('寄送失敗,請稍後再試');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (resendCountdown > 0) return;
    setError('');
    setLoading(true);
    try {
      const { error } = await requestPasswordReset(email);
      if (error) setError(error.message);
      else {
        setInfo(`已重新寄出驗證碼至 ${email}`);
        setResendCountdown(60);
      }
    } catch {
      setError('重送失敗,請稍後再試');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { error, reset_token } = await verifyResetCode(email, code);
      if (error || !reset_token) {
        setError(error?.message || '驗證碼錯誤');
      } else {
        setResetToken(reset_token);
        setMode('forgot-password');
        setInfo('');
      }
    } catch {
      setError('驗證失敗,請稍後再試');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { error } = await resetPassword(resetToken, password);
      if (error) setError(error.message);
      else setResetDoneModal(true);
    } catch {
      setError('重設失敗,請稍後再試');
    } finally {
      setLoading(false);
    }
  };

  const goBackToLogin = () => {
    setShowSuccessModal(false);
    setResetDoneModal(false);
    switchMode('login');
    setEmail('');
    setPassword('');
    setCode('');
    setResetToken('');
    setAge('');
    setGender('');
    setOccupation('');
    setHealingInterest('');
    if (showSuccessModal) navigate(redirectTo || '/');
  };

  const heading = (() => {
    switch (mode) {
      case 'login':           return '登入';
      case 'signup':          return '註冊';
      case 'forgot-email':    return '忘記密碼';
      case 'forgot-code':     return '輸入驗證碼';
      case 'forgot-password': return '設定新密碼';
    }
  })();

  const subheading = (() => {
    switch (mode) {
      case 'login':           return '歡迎回來，進入你的靈性旅程';
      case 'signup':          return '開啟你的靈性覺醒之旅';
      case 'forgot-email':    return '輸入註冊時使用的電子郵件，我們會寄送驗證碼';
      case 'forgot-code':     return '請查看信箱，將 6 位數驗證碼填入下方';
      case 'forgot-password': return '為這個帳號設定新密碼';
    }
  })();

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 text-white relative overflow-hidden flex items-center justify-center px-4 py-12"
    >
      <div
        className="absolute inset-0 opacity-40"
        style={{ backgroundImage: STARS_BG_URL }}
      />

      <div className="relative w-full max-w-md">
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-4 py-2 mb-6 bg-blue-900/40 backdrop-blur-sm border-2 border-blue-500/30 rounded-lg hover:bg-blue-800/40 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          返回首頁
        </Link>

        <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-xl border-2 border-blue-500/30 rounded-3xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <Sparkles className="w-12 h-12 text-blue-300 opacity-80" />
            </div>
            <h1 className="text-3xl font-serif text-blue-100 mb-2">{heading}</h1>
            <p className="text-blue-200/70 text-sm">{subheading}</p>
          </div>

          {(mode === 'login' || mode === 'signup') && (
            <form onSubmit={handleLoginSignup} className="space-y-5">
              <Field label="電子郵件" icon={<Mail className="w-5 h-5 text-blue-400" />}>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="auth-input pl-11"
                  placeholder="your@email.com"
                />
              </Field>

              <Field label="密碼" icon={<Lock className="w-5 h-5 text-blue-400" />}>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={mode === 'signup' ? 8 : 6}
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  className="auth-input pl-11"
                  placeholder={mode === 'signup' ? '至少八字元，需含英數字' : '輸入密碼'}
                />
              </Field>

              {mode === 'signup' && (
                <>
                  <PlainField label="年齡">
                    <input
                      type="number"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      required
                      min="1"
                      max="120"
                      className="auth-input"
                      placeholder="請輸入年齡"
                    />
                  </PlainField>
                  <SelectField label="性別" value={gender} onChange={setGender}
                    placeholder="請選擇性別"
                    options={['男性', '女性', '其他']} />
                  <SelectField label="工作類型" value={occupation} onChange={setOccupation}
                    placeholder="請選擇工作類型"
                    options={['身心靈相關', '設計相關工作', '資訊工作', '電子業', '製造業', '服務業', '自由業', '其他']} />
                  <SelectField label="最想學什麼療癒" value={healingInterest} onChange={setHealingInterest}
                    placeholder="請選擇想學的療癒方式"
                    options={['頌缽', '靈氣', '水晶', '薩滿', '魔法']} />
                </>
              )}

              {error && <ErrorBox message={error} />}

              <button type="submit" disabled={loading} className="auth-submit-btn">
                {loading ? '處理中...' : mode === 'login' ? '登入' : '註冊'}
              </button>
            </form>
          )}

          {mode === 'forgot-email' && (
            <form onSubmit={handleRequestReset} className="space-y-5">
              <Field label="電子郵件" icon={<Mail className="w-5 h-5 text-blue-400" />}>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="auth-input pl-11"
                  placeholder="your@email.com"
                />
              </Field>

              {error && <ErrorBox message={error} />}

              <button type="submit" disabled={loading} className="auth-submit-btn">
                {loading ? '寄送中...' : '寄送驗證碼'}
              </button>

              <button
                type="button"
                onClick={() => switchMode('login')}
                className="block mx-auto text-blue-300 hover:text-blue-200 text-sm transition-colors"
              >
                返回登入
              </button>
            </form>
          )}

          {mode === 'forgot-code' && (
            <form onSubmit={handleVerifyCode} className="space-y-5">
              {info && <InfoBox message={info} />}

              <PlainField label="驗證碼">
                <CodeInput value={code} onChange={setCode} />
              </PlainField>

              {error && <ErrorBox message={error} />}

              <button
                type="submit"
                disabled={loading || code.length !== 6}
                className="auth-submit-btn"
              >
                {loading ? '驗證中...' : '驗證'}
              </button>

              <div className="flex flex-col items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={loading || resendCountdown > 0}
                  className="text-blue-300 hover:text-blue-200 text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {resendCountdown > 0 ? `${resendCountdown} 秒後可重新寄送` : '重新寄送驗證碼'}
                </button>
                <button
                  type="button"
                  onClick={() => switchMode('forgot-email')}
                  className="text-blue-300 hover:text-blue-200 text-sm transition-colors"
                >
                  改用其他 Email
                </button>
              </div>
            </form>
          )}

          {mode === 'forgot-password' && (
            <form onSubmit={handleResetPassword} className="space-y-5">
              <Field label="新密碼" icon={<Lock className="w-5 h-5 text-blue-400" />}>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className="auth-input pl-11"
                  placeholder="至少八字元，需含英數字"
                />
              </Field>

              {error && <ErrorBox message={error} />}

              <button
                type="submit"
                disabled={loading || password.length < 8}
                className="auth-submit-btn"
              >
                {loading ? '更新中...' : '設定新密碼'}
              </button>
            </form>
          )}

          {(mode === 'login' || mode === 'signup') && (
            <div className="mt-6 pt-6 border-t border-blue-500/20 flex flex-col items-center gap-3">
              {mode === 'login' && (
                <button
                  onClick={() => switchMode('forgot-email')}
                  className="text-blue-300 hover:text-blue-200 text-sm transition-colors"
                >
                  忘了密碼？
                </button>
              )}
              <button
                onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')}
                className="text-blue-300 hover:text-blue-200 text-sm transition-colors"
              >
                {mode === 'login' ? '還沒有帳號？立即註冊' : '已有帳號？返回登入'}
              </button>
            </div>
          )}
        </div>
      </div>

      {showSuccessModal && (
        <SuccessModal
          icon={<CheckCircle className="w-16 h-16 text-green-400" />}
          accentColor="green"
          title="註冊完成"
          body="你的帳號已建立，並已自動登入。"
          onClose={goBackToLogin}
          buttonText="進入"
        />
      )}

      {resetDoneModal && (
        <SuccessModal
          icon={<Mail className="w-16 h-16 text-blue-400" />}
          accentColor="blue"
          title="密碼已更新"
          body="請用新密碼登入。"
          onClose={goBackToLogin}
          buttonText="返回登入"
        />
      )}

      <style>{`
        .auth-input {
          width: 100%;
          padding: 0.75rem 1rem;
          background-color: rgba(15, 23, 42, 0.5);
          border: 2px solid rgba(59, 130, 246, 0.3);
          border-radius: 0.5rem;
          color: #dbeafe;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .auth-input::placeholder { color: rgba(96, 165, 250, 0.5); }
        .auth-input:focus {
          outline: none;
          border-color: #60a5fa;
          box-shadow: 0 0 0 2px #60a5fa;
        }
        .auth-input.pl-11 { padding-left: 2.75rem; }
        .auth-submit-btn {
          width: 100%;
          background-image: linear-gradient(to right, #3b82f6, #06b6d4);
          color: white;
          font-weight: 500;
          padding: 0.75rem;
          border-radius: 0.5rem;
          transition: all 0.3s;
          box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
        }
        .auth-submit-btn:hover:not(:disabled) {
          background-image: linear-gradient(to right, #60a5fa, #22d3ee);
          box-shadow: 0 10px 15px -3px rgba(59, 130, 246, 0.5);
        }
        .auth-submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }
      `}</style>
    </div>
  );
}

function CodeInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <input
      ref={ref}
      type="text"
      inputMode="numeric"
      pattern="\d{6}"
      maxLength={6}
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
      autoFocus
      autoComplete="one-time-code"
      className="auth-input text-center font-mono"
      style={{ letterSpacing: '0.6em', fontSize: '1.4rem', paddingLeft: '0.6em' }}
      placeholder="—　—　—　—　—　—"
    />
  );
}

function Field({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-blue-200 text-sm font-medium mb-2">{label}</label>
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">{icon}</div>
        {children}
      </div>
    </div>
  );
}

function PlainField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-blue-200 text-sm font-medium mb-2">{label}</label>
      {children}
    </div>
  );
}

function SelectField({
  label, value, onChange, options, placeholder,
}: {
  label: string; value: string; onChange: (v: string) => void; options: string[]; placeholder: string;
}) {
  return (
    <PlainField label={label}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        className="auth-input"
      >
        <option value="" className="bg-slate-900">{placeholder}</option>
        {options.map((o) => (
          <option key={o} value={o} className="bg-slate-900">{o}</option>
        ))}
      </select>
    </PlainField>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-3 text-red-200 text-sm">
      {message}
    </div>
  );
}

function InfoBox({ message }: { message: string }) {
  return (
    <div className="bg-blue-900/30 border border-blue-500/50 rounded-lg p-3 text-blue-200 text-sm leading-relaxed">
      {message}
    </div>
  );
}

function SuccessModal({
  icon, accentColor, title, body, onClose, buttonText,
}: {
  icon: React.ReactNode;
  accentColor: 'green' | 'blue';
  title: string;
  body: string;
  onClose: () => void;
  buttonText: string;
}) {
  const borderClass = accentColor === 'green' ? 'border-green-500/50' : 'border-blue-500/50';
  const iconBg = accentColor === 'green' ? 'bg-green-500/20' : 'bg-blue-500/20';
  const titleColor = accentColor === 'green' ? 'text-green-100' : 'text-blue-100';
  const btnGrad =
    accentColor === 'green'
      ? 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 hover:shadow-green-500/50'
      : 'bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-400 hover:to-cyan-400 hover:shadow-blue-500/50';

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div className={`bg-gradient-to-br from-slate-800 to-slate-900 border-2 ${borderClass} rounded-2xl shadow-2xl max-w-md w-full p-8 text-center`}>
        <div className="flex justify-center mb-6">
          <div className={`${iconBg} rounded-full p-4`}>{icon}</div>
        </div>
        <h2 className={`text-2xl font-serif ${titleColor} mb-3`}>{title}</h2>
        <p className="text-blue-200/80 mb-6">{body}</p>
        <button
          onClick={onClose}
          className={`w-full ${btnGrad} text-white font-medium py-3 rounded-lg transition-all duration-300 shadow-lg`}
        >
          {buttonText}
        </button>
      </div>
    </div>
  );
}
