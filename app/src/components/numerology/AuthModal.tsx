import { useState } from 'react';
import { X, Mail, Lock, User, Sparkles, AlertCircle } from 'lucide-react';

interface Props {
  onClose: () => void;
  onSignIn: (email: string, password: string) => Promise<void>;
  onSignUp: (email: string, password: string, name: string) => Promise<void>;
}

type Mode = 'signin' | 'signup';

export default function AuthModal({ onClose, onSignIn, onSignUp }: Props) {
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'signup') {
        await onSignUp(email, password, name);
      } else {
        await onSignIn(email, password);
      }
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '發生錯誤，請再試一次';
      if (msg.includes('Invalid login credentials')) setError('電子郵件或密碼錯誤');
      else if (msg.includes('User already registered')) setError('此電子郵件已註冊，請直接登入');
      else if (msg.includes('Password should be at least')) setError('密碼至少需要 6 個字元');
      else setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    display: 'block', width: '100%', boxSizing: 'border-box',
    padding: '13px 14px 13px 42px',
    fontSize: 15, fontFamily: 'Inter, sans-serif',
    color: '#e9d5ff',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(167,139,250,0.22)',
    borderRadius: 12, outline: 'none',
    transition: 'border-color 0.2s',
    caretColor: '#a78bfa',
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
        background: 'rgba(7,4,15,0.85)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          width: '100%', maxWidth: 420,
          background: 'linear-gradient(135deg, rgba(20,10,40,0.98), rgba(10,5,25,0.98))',
          border: '1px solid rgba(167,139,250,0.2)',
          borderRadius: 24,
          padding: '32px 28px',
          boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(167,139,250,0.06)',
          position: 'relative',
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 16, right: 16,
            width: 32, height: 32, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)',
            color: 'rgba(196,181,253,0.5)', cursor: 'pointer',
          }}
        >
          <X style={{ width: 14, height: 14 }} />
        </button>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 52, height: 52, borderRadius: '50%',
            background: 'radial-gradient(circle at 35% 30%, rgba(167,139,250,0.2), rgba(96,165,250,0.06))',
            border: '1px solid rgba(167,139,250,0.25)',
            boxShadow: '0 0 24px rgba(109,40,217,0.2)',
            marginBottom: 14,
          }}>
            <Sparkles style={{ width: 22, height: 22, color: '#a78bfa' }} />
          </div>
          <h2 style={{
            fontFamily: 'Playfair Display, serif', fontSize: 22, marginBottom: 6,
            background: 'linear-gradient(135deg, #a78bfa, #c4b5fd)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>
            {mode === 'signin' ? '歡迎回來' : '創建靈魂帳號'}
          </h2>
          <p style={{ color: 'rgba(196,181,253,0.45)', fontSize: 13 }}>
            {mode === 'signin'
              ? '登入以查看你的靈數記錄與訂閱方案'
              : '一個帳號，跨越所有靈性應用程式'}
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {mode === 'signup' && (
            <div style={{ position: 'relative' }}>
              <User style={{
                position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)',
                width: 16, height: 16, color: 'rgba(167,139,250,0.45)', pointerEvents: 'none',
              }} />
              <input
                type="text"
                placeholder="顯示名稱（選填）"
                value={name}
                onChange={e => setName(e.target.value)}
                style={inputStyle}
                autoComplete="name"
              />
            </div>
          )}

          <div style={{ position: 'relative' }}>
            <Mail style={{
              position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)',
              width: 16, height: 16, color: 'rgba(167,139,250,0.45)', pointerEvents: 'none',
            }} />
            <input
              type="email"
              placeholder="電子郵件"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              style={inputStyle}
              autoComplete="email"
            />
          </div>

          <div style={{ position: 'relative' }}>
            <Lock style={{
              position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)',
              width: 16, height: 16, color: 'rgba(167,139,250,0.45)', pointerEvents: 'none',
            }} />
            <input
              type="password"
              placeholder="密碼（至少 6 個字元）"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
              style={inputStyle}
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            />
          </div>

          {error && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 14px', borderRadius: 10,
              background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)',
              color: '#fca5a5', fontSize: 13,
            }}>
              <AlertCircle style={{ width: 14, height: 14, flexShrink: 0 }} />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: 4,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '14px', fontSize: 15, fontWeight: 600,
              fontFamily: 'Playfair Display, serif',
              borderRadius: 12, border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              background: loading
                ? 'rgba(255,255,255,0.04)'
                : 'linear-gradient(135deg, #7c3aed, #a78bfa, #6d28d9)',
              color: loading ? 'rgba(167,139,250,0.35)' : '#f3e8ff',
              boxShadow: loading ? 'none' : '0 4px 24px rgba(109,40,217,0.35)',
              textShadow: loading ? 'none' : '0 0 16px rgba(243,232,255,0.5)',
              transition: 'all 0.2s',
            } as React.CSSProperties}
          >
            {loading ? (
              <>
                <span style={{
                  display: 'inline-block', width: 14, height: 14, borderRadius: '50%',
                  border: '2px solid rgba(167,139,250,0.25)', borderTopColor: '#a78bfa',
                  animation: 'spin 0.7s linear infinite', flexShrink: 0,
                }} />
                處理中...
              </>
            ) : (
              mode === 'signin' ? '登入' : '創建帳號'
            )}
          </button>
        </form>

        <div style={{ marginTop: 20, textAlign: 'center' }}>
          <span style={{ fontSize: 13, color: 'rgba(196,181,253,0.4)' }}>
            {mode === 'signin' ? '還沒有帳號？' : '已有帳號？'}
          </span>
          {' '}
          <button
            onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); }}
            style={{
              fontSize: 13, fontWeight: 600, background: 'none', border: 'none',
              color: '#a78bfa', cursor: 'pointer', padding: 0,
            }}
          >
            {mode === 'signin' ? '立即註冊' : '返回登入'}
          </button>
        </div>
      </div>
    </div>
  );
}
