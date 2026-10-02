import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, CheckCircle, Mail, Lock, Sparkles } from 'lucide-react';
import { GoogleSignInButton } from '../components/GoogleSignInButton';
import { getLanguageFromPath } from '../lib/i18n';
import { authModeForPath, authPathFor, isSafeAuthRedirect, localizeAuthError } from '../lib/authLocale';

type Mode = 'login' | 'signup' | 'forgot-email' | 'forgot-code' | 'forgot-password';

const AUTH_COPY = {
  en: {
    backHome: 'Back to Home',
    heading: { login: 'Sign In', signup: 'Create Account', 'forgot-email': 'Reset Password', 'forgot-code': 'Enter Verification Code', 'forgot-password': 'Set a New Password' },
    subheading: { login: 'Welcome Back', signup: 'Create an account to begin your journey', 'forgot-email': 'Enter your email address and we will send you a verification code.', 'forgot-code': 'Check your email and enter the 6-digit verification code.', 'forgot-password': 'Choose a new password for your account.' },
    name: 'Name', namePlaceholder: 'Enter your name', email: 'Email', emailPlaceholder: 'you@example.com',
    phone: 'Phone Number', phonePlaceholder: 'Enter your phone number', password: 'Password',
    passwordSignupPlaceholder: 'At least 8 characters, including a letter and a number',
    passwordLoginPlaceholder: 'Enter your password', age: 'Age', agePlaceholder: 'Enter your age',
    gender: 'Gender', genderPlaceholder: 'Select your gender', genderLabels: ['Male', 'Female', 'Other'],
    occupation: 'Occupation', occupationPlaceholder: 'Select your occupation',
    occupationLabels: ['Wellness', 'Design', 'Information Technology', 'Electronics', 'Manufacturing', 'Service', 'Freelance', 'Other'],
    healingInterest: 'Healing Interest', healingInterestPlaceholder: 'Select an area of interest',
    healingInterestLabels: ['Sound Bath', 'Reiki', 'Crystals', 'Shamanism', 'Magic'],
    emailPasswordRequired: 'Please enter your email address and password.',
    registrationRequired: 'Please complete all registration fields.',
    nameTooLong: 'Name must be 100 characters or fewer.',
    phoneInvalid: 'Please enter a valid phone number.',
    ageInvalid: 'Please enter an age between 1 and 120.',
    emailInvalid: 'Please enter a valid email address.',
    passwordShort: 'Password must be at least 8 characters long.',
    passwordRequirements: 'Password must include at least one letter and one number.',
    loginFailed: 'Sign-in failed. Please check your details and try again.',
    registrationFailed: 'Registration failed. Please try again.',
    googleFailed: 'Google sign-in failed. Please try again.',
    genericError: 'Something went wrong. Please try again later.',
    processing: 'Signing in…', creatingAccount: 'Creating account…',
    sendCode: 'Send Verification Code', sending: 'Sending…',
    verifying: 'Verifying…', verify: 'Verify Code', resendCode: 'Resend Code',
    resendIn: 'Resend in', seconds: 's', otherEmail: 'Use a different email address',
    newPassword: 'New Password', updatePassword: 'Update Password', updating: 'Updating…',
    backToSignIn: 'Back to Sign In', forgotPassword: 'Forgot Password?',
    noAccount: "Don't have an account?", createAccount: 'Create an Account',
    createAccountButton: 'Create Account', hasAccount: 'Already have an account?', signIn: 'Sign In',
    signupSuccessTitle: 'Account Created', signupSuccessBody: 'Your account is ready, and you are signed in.',
    resetSuccessTitle: 'Password Updated', resetSuccessBody: 'Sign in with your new password.', enter: 'Continue',
    resetDone: 'Back to Sign In', codeSent: (email: string) => `A verification code was sent to ${email}. It expires in 15 minutes. Check your inbox and spam folder.`,
    codeResent: (email: string) => `A new verification code was sent to ${email}.`,
    codeInvalid: 'The verification code is incorrect.', verifyFailed: 'Verification failed. Please try again.',
    sendFailed: 'Could not send the verification code. Please try again.',
    resendFailed: 'Could not resend the verification code. Please try again.',
    resetFailed: 'Password reset failed. Please try again.',
  },
  'zh-Hant': {
    backHome: '返回首頁',
    heading: { login: '登入', signup: '註冊', 'forgot-email': '忘記密碼', 'forgot-code': '輸入驗證碼', 'forgot-password': '設定新密碼' },
    subheading: { login: '歡迎回來，進入你的靈性旅程', signup: '開啟你的靈性覺醒之旅', 'forgot-email': '輸入註冊時使用的電子郵件，我們會寄送驗證碼', 'forgot-code': '請查看信箱，將 6 位數驗證碼填入下方', 'forgot-password': '為這個帳號設定新密碼' },
    name: '姓名', namePlaceholder: '請輸入姓名', email: '電子郵件', emailPlaceholder: 'your@email.com',
    phone: '手機號碼', phonePlaceholder: '請輸入手機號碼', password: '密碼',
    passwordSignupPlaceholder: '至少八字元，需含英數字', passwordLoginPlaceholder: '輸入密碼',
    age: '年齡', agePlaceholder: '請輸入年齡', gender: '性別', genderPlaceholder: '請選擇性別',
    genderLabels: ['男性', '女性', '其他'], occupation: '工作類型', occupationPlaceholder: '請選擇工作類型',
    occupationLabels: ['身心靈相關', '設計相關工作', '資訊工作', '電子業', '製造業', '服務業', '自由業', '其他'],
    healingInterest: '最想學什麼療癒', healingInterestPlaceholder: '請選擇想學的療癒方式',
    healingInterestLabels: ['頌缽', '靈氣', '水晶', '薩滿', '魔法'],
    emailPasswordRequired: '請輸入電子郵件和密碼', registrationRequired: '請填寫所有註冊資料',
    nameTooLong: '姓名不可超過 100 個字元', phoneInvalid: '手機號碼格式錯誤', ageInvalid: '請輸入有效年齡',
    emailInvalid: '電子郵件格式錯誤', passwordShort: '密碼長度至少 8 個字元',
    passwordRequirements: '密碼需包含至少一個英文字母和一個數字',
    loginFailed: '電子郵件或密碼錯誤', registrationFailed: '註冊失敗', googleFailed: 'Google 登入失敗',
    genericError: '發生錯誤,請稍後再試', processing: '處理中...', creatingAccount: '建立帳號中...',
    sendCode: '寄送驗證碼', sending: '寄送中...', verifying: '驗證中...', verify: '驗證',
    resendCode: '重新寄送驗證碼', resendIn: '秒後可重新寄送', seconds: '秒', otherEmail: '改用其他 Email',
    newPassword: '新密碼', updatePassword: '設定新密碼', updating: '更新中...', backToSignIn: '返回登入',
    forgotPassword: '忘了密碼？', noAccount: '還沒有帳號？', createAccount: '立即註冊',
    createAccountButton: '註冊', hasAccount: '已有帳號？', signIn: '返回登入', signupSuccessTitle: '註冊完成',
    signupSuccessBody: '你的帳號已建立，並已自動登入。', resetSuccessTitle: '密碼已更新',
    resetSuccessBody: '請用新密碼登入。', enter: '進入', resetDone: '返回登入',
    codeSent: (email: string) => `驗證碼已寄至 ${email}(15 分鐘內有效,請檢查信箱與垃圾信件夾)`,
    codeResent: (email: string) => `已重新寄出驗證碼至 ${email}`,
    codeInvalid: '驗證碼錯誤', verifyFailed: '驗證失敗,請稍後再試',
    sendFailed: '寄送失敗,請稍後再試', resendFailed: '重送失敗,請稍後再試', resetFailed: '重設失敗,請稍後再試',
  },
} as const;

const STARS_BG_URL =
  "url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0ic3RhcnMiIHg9IjAiIHk9IjAiIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48Y2lyY2xlIGN4PSIxIiBjeT0iMSIgcj0iMSIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjMpIi8+PGNpcmNsZSBjeD0iNTAiIGN5PSI4MCIgcj0iMC41IiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMikiLz48Y2lyY2xlIGN4PSIxMzAiIGN5PSI0MCIgcj0iMS41IiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuNCkiLz48Y2lyY2xlIGN4PSIxODAiIGN5PSIxNjAiIHI9IjAuOCIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjMpIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI3N0YXJzKSIvPjwvc3ZnPg==')";

function validPhone(value: string): boolean {
  const trimmed = value.trim();
  const digitCount = trimmed.replace(/\D/g, '').length;
  return trimmed.length <= 32
    && /^\+?[0-9\s().-]+$/.test(trimmed)
    && digitCount >= 7
    && digitCount <= 20;
}

function validEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export default function AuthPage() {
  const {
    user,
    loading: authLoading,
    signUp, signIn, signInWithGoogle,
    requestPasswordReset, verifyResetCode, resetPassword,
  } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const language = getLanguageFromPath(location.pathname);
  const isEnglish = language === 'en';
  const copy = AUTH_COPY[language];
  const rawRedirect = searchParams.get('redirect');
  const redirectTo = isSafeAuthRedirect(rawRedirect) ? rawRedirect : null;
  const returnTo = redirectTo ?? (isEnglish ? '/en' : '/');
  const returnState = (location.state as { returnState?: unknown } | null)?.returnState;

  const [mode, setMode] = useState<Mode>(
    authModeForPath(location.pathname, searchParams.get('mode'))
  );
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
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

  useEffect(() => {
    if (resendCountdown <= 0) return;
    const t = setTimeout(() => setResendCountdown((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCountdown]);

  useEffect(() => {
    if (user && !showSuccessModal && !resetDoneModal) {
      navigate(returnTo, { replace: true, state: returnState });
    }
  }, [user, returnTo, returnState, navigate, showSuccessModal, resetDoneModal]);

  const switchMode = (next: Mode) => {
    setMode(next);
    setError('');
    setInfo('');
    if (next === 'login' || next === 'signup') {
      setCode('');
      setResetToken('');
      setPassword('');
      const path = authPathFor(location.pathname, next);
      const query = redirectTo ? `?${new URLSearchParams({ redirect: redirectTo })}` : '';
      navigate(`${path}${query}`, { state: location.state });
    }
  };

  const handleLoginSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'login') {
        if (!email.trim() || !password) {
          setError(copy.emailPasswordRequired);
          setLoading(false);
          return;
        }
        if (!validEmail(email)) {
          setError(copy.emailInvalid);
          setLoading(false);
          return;
        }
        if (password.length < 6) {
          setError(copy.passwordShort);
          setLoading(false);
          return;
        }
        const { error } = await signIn(email, password);
        if (error) setError(localizeAuthError(error.message, language, copy.loginFailed));
        else navigate(returnTo, { state: returnState });
      } else if (mode === 'signup') {
        if (!name.trim() || !phone.trim() || !age || !gender || !occupation || !healingInterest) {
          setError(copy.registrationRequired);
          setLoading(false);
          return;
        }
        if (!validEmail(email)) {
          setError(copy.emailInvalid);
          setLoading(false);
          return;
        }
        if (name.trim().length > 100) {
          setError(copy.nameTooLong);
          setLoading(false);
          return;
        }
        if (!validPhone(phone)) {
          setError(copy.phoneInvalid);
          setLoading(false);
          return;
        }
        const ageNumber = Number(age);
        if (!Number.isInteger(ageNumber) || ageNumber < 1 || ageNumber > 120) {
          setError(copy.ageInvalid);
          setLoading(false);
          return;
        }
        if (password.length < 8) {
          setError(copy.passwordShort);
          setLoading(false);
          return;
        }
        if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
          setError(copy.passwordRequirements);
          setLoading(false);
          return;
        }
        const { error } = await signUp(email, password, {
          name: name.trim(),
          phone: phone.trim(),
          age: parseInt(age),
          gender,
          occupation,
          healing_interest: healingInterest,
        });
        if (error) setError(localizeAuthError(error.message, language, copy.registrationFailed));
        else setShowSuccessModal(true);
      }
    } catch (cause) {
      setError(localizeAuthError(cause instanceof Error ? cause.message : '', language, copy.genericError));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async (credential: string, csrfToken: string) => {
    setError('');
    const { error } = await signInWithGoogle(credential, csrfToken);
    if (error) {
      setError(localizeAuthError(error.message, language, copy.googleFailed));
      throw error;
    }
    navigate(returnTo, { state: returnState });
  };

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);
    try {
      if (!validEmail(email)) {
        setError(copy.emailInvalid);
        setLoading(false);
        return;
      }
      const { error } = await requestPasswordReset(email);
      if (error) {
        setError(localizeAuthError(error.message, language, copy.sendFailed));
      } else {
        setInfo(copy.codeSent(email));
        setMode('forgot-code');
        setResendCountdown(60);
      }
    } catch (cause) {
      setError(localizeAuthError(cause instanceof Error ? cause.message : '', language, copy.sendFailed));
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
      if (error) setError(localizeAuthError(error.message, language, copy.resendFailed));
      else {
        setInfo(copy.codeResent(email));
        setResendCountdown(60);
      }
    } catch (cause) {
      setError(localizeAuthError(cause instanceof Error ? cause.message : '', language, copy.resendFailed));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (code.length !== 6) {
      setError(copy.codeInvalid);
      return;
    }
    setLoading(true);
    try {
      const { error, reset_token } = await verifyResetCode(email, code);
      if (error || !reset_token) {
        setError(localizeAuthError(error?.message, language, copy.codeInvalid));
      } else {
        setResetToken(reset_token);
        setMode('forgot-password');
        setInfo('');
      }
    } catch (cause) {
      setError(localizeAuthError(cause instanceof Error ? cause.message : '', language, copy.verifyFailed));
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError(copy.passwordShort);
      return;
    }
    if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      setError(copy.passwordRequirements);
      return;
    }
    setLoading(true);
    try {
      const { error } = await resetPassword(resetToken, password);
      if (error) setError(localizeAuthError(error.message, language, copy.resetFailed));
      else setResetDoneModal(true);
    } catch (cause) {
      setError(localizeAuthError(cause instanceof Error ? cause.message : '', language, copy.resetFailed));
    } finally {
      setLoading(false);
    }
  };

  const goBackToLogin = () => {
    const registrationSucceeded = showSuccessModal;
    setShowSuccessModal(false);
    setResetDoneModal(false);
    setMode('login');
    setEmail('');
    setName('');
    setPhone('');
    setPassword('');
    setCode('');
    setResetToken('');
    setAge('');
    setGender('');
    setOccupation('');
    setHealingInterest('');
    if (registrationSucceeded) navigate(returnTo, { replace: true, state: returnState });
    else switchMode('login');
  };

  const heading = copy.heading[mode];
  const subheading = copy.subheading[mode];

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 flex items-center justify-center">
        <div className="flex items-center gap-3 text-blue-200/70">
          <Sparkles className="w-8 h-8 text-blue-300 opacity-40 animate-pulse" />
          <span>{isEnglish ? 'Loading account…' : '載入帳號中…'}</span>
        </div>
      </div>
    );
  }

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
          to={isEnglish ? '/en' : '/'}
          className="inline-flex items-center gap-2 px-4 py-2 mb-6 bg-blue-900/40 backdrop-blur-sm border-2 border-blue-500/30 rounded-lg hover:bg-blue-800/40 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {copy.backHome}
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
            <form onSubmit={handleLoginSignup} noValidate className="space-y-5">
              {mode === 'signup' && (
                <PlainField label={copy.name}>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    maxLength={100}
                    autoComplete="name"
                    className="auth-input"
                    placeholder={copy.namePlaceholder}
                  />
                </PlainField>
              )}

              <Field label={copy.email} icon={<Mail className="w-5 h-5 text-blue-400" />}>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="auth-input pl-11"
                  placeholder={copy.emailPlaceholder}
                />
              </Field>

              {mode === 'signup' && (
                <PlainField label={copy.phone}>
                  <input
                    type="tel"
                    inputMode="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    maxLength={32}
                    autoComplete="tel"
                    className="auth-input"
                    placeholder={copy.phonePlaceholder}
                  />
                </PlainField>
              )}

              <Field label={copy.password} icon={<Lock className="w-5 h-5 text-blue-400" />}>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={mode === 'signup' ? 8 : 6}
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  className="auth-input pl-11"
                  placeholder={mode === 'signup' ? copy.passwordSignupPlaceholder : copy.passwordLoginPlaceholder}
                />
              </Field>

              {mode === 'signup' && (
                <>
                  <PlainField label={copy.age}>
                    <input
                      type="number"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      required
                      min="1"
                      max="120"
                      className="auth-input"
                      placeholder={copy.agePlaceholder}
                    />
                  </PlainField>
                  <SelectField label={copy.gender} value={gender} onChange={setGender}
                    placeholder={copy.genderPlaceholder} options={['男性', '女性', '其他']} optionLabels={copy.genderLabels} />
                  <SelectField label={copy.occupation} value={occupation} onChange={setOccupation}
                    placeholder={copy.occupationPlaceholder}
                    options={['身心靈相關', '設計相關工作', '資訊工作', '電子業', '製造業', '服務業', '自由業', '其他']} optionLabels={copy.occupationLabels} />
                  <SelectField label={copy.healingInterest} value={healingInterest} onChange={setHealingInterest}
                    placeholder={copy.healingInterestPlaceholder}
                    options={['頌缽', '靈氣', '水晶', '薩滿', '魔法']} optionLabels={copy.healingInterestLabels} />
                </>
              )}

              {error && <ErrorBox message={error} />}

              <button type="submit" disabled={loading} className="auth-submit-btn">
                {loading ? (mode === 'login' ? copy.processing : copy.creatingAccount) : mode === 'login' ? copy.signIn : copy.createAccountButton}
              </button>

              <GoogleSignInButton onCredential={handleGoogleSignIn} />
            </form>
          )}

          {mode === 'forgot-email' && (
            <form onSubmit={handleRequestReset} noValidate className="space-y-5">
              <Field label={copy.email} icon={<Mail className="w-5 h-5 text-blue-400" />}>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="auth-input pl-11"
                  placeholder={copy.emailPlaceholder}
                />
              </Field>

              {error && <ErrorBox message={error} />}

              <button type="submit" disabled={loading} className="auth-submit-btn">
                {loading ? copy.sending : copy.sendCode}
              </button>

              <button
                type="button"
                onClick={() => switchMode('login')}
                className="block mx-auto text-blue-300 hover:text-blue-200 text-sm transition-colors"
              >
                {copy.backToSignIn}
              </button>
            </form>
          )}

          {mode === 'forgot-code' && (
            <form onSubmit={handleVerifyCode} noValidate className="space-y-5">
              {info && <InfoBox message={info} />}

              <PlainField label={isEnglish ? 'Verification Code' : '驗證碼'}>
                <CodeInput value={code} onChange={setCode} />
              </PlainField>

              {error && <ErrorBox message={error} />}

              <button
                type="submit"
                disabled={loading || code.length !== 6}
                className="auth-submit-btn"
              >
                {loading ? copy.verifying : copy.verify}
              </button>

              <div className="flex flex-col items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={loading || resendCountdown > 0}
                  className="text-blue-300 hover:text-blue-200 text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {resendCountdown > 0
                    ? isEnglish ? `${copy.resendIn} ${resendCountdown}${copy.seconds}` : `${resendCountdown} ${copy.resendIn}`
                    : copy.resendCode}
                </button>
                <button
                  type="button"
                  onClick={() => switchMode('forgot-email')}
                  className="text-blue-300 hover:text-blue-200 text-sm transition-colors"
                >
                  {copy.otherEmail}
                </button>
              </div>
            </form>
          )}

          {mode === 'forgot-password' && (
            <form onSubmit={handleResetPassword} noValidate className="space-y-5">
              <Field label={copy.newPassword} icon={<Lock className="w-5 h-5 text-blue-400" />}>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className="auth-input pl-11"
                  placeholder={copy.passwordSignupPlaceholder}
                />
              </Field>

              {error && <ErrorBox message={error} />}

              <button
                type="submit"
                disabled={loading || password.length < 8}
                className="auth-submit-btn"
              >
                {loading ? copy.updating : copy.updatePassword}
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
                  {copy.forgotPassword}
                </button>
              )}
              <button
                onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')}
                className="text-blue-300 hover:text-blue-200 text-sm transition-colors"
              >
                {mode === 'login' ? `${copy.noAccount} ${copy.createAccount}` : `${copy.hasAccount} ${copy.signIn}`}
              </button>
            </div>
          )}
        </div>
      </div>

      {showSuccessModal && (
        <SuccessModal
          icon={<CheckCircle className="w-16 h-16 text-green-400" />}
          accentColor="green"
          title={copy.signupSuccessTitle}
          body={copy.signupSuccessBody}
          onClose={goBackToLogin}
          buttonText={copy.enter}
        />
      )}

      {resetDoneModal && (
        <SuccessModal
          icon={<Mail className="w-16 h-16 text-blue-400" />}
          accentColor="blue"
          title={copy.resetSuccessTitle}
          body={copy.resetSuccessBody}
          onClose={goBackToLogin}
          buttonText={copy.resetDone}
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
  label, value, onChange, options, optionLabels, placeholder,
}: {
  label: string; value: string; onChange: (v: string) => void; options: readonly string[]; optionLabels?: readonly string[]; placeholder: string;
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
        {options.map((o, index) => (
          <option key={o} value={o} className="bg-slate-900">{optionLabels?.[index] ?? o}</option>
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
