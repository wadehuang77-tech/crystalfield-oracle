import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { authApi, type SessionUser } from '../lib/api';
import { AuthContext, type UserMetadata } from './AuthContext';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<Error | null>(null);
  const authRevision = useRef(0);
  const channel = useRef<BroadcastChannel | null>(null);
  const acceptSession = (nextUser: SessionUser | null) => {
    authRevision.current++;
    setUser(nextUser);
    setLoading(false);
    setAuthError(null);
    // Only a notification crosses tabs; cookies and the server remain authoritative.
    channel.current?.postMessage('session-changed');
  };

  const refreshAuth = useCallback(async () => {
    const revision = ++authRevision.current;
    // Background checks must not unmount an active tool or erase its inputs.
    setAuthError(null);
    try {
      const { user } = await authApi.me();
      if (revision !== authRevision.current) return;
      setUser(user);
    } catch (error) {
      if (revision !== authRevision.current) return;
      // A network failure is not a confirmed logout. APIs still enforce access.
      setAuthError(error instanceof Error ? error : new Error('Unable to verify your sign-in status.'));
    } finally {
      if (revision === authRevision.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshAuth();
    const sync = typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel('crystalfield-session');
    channel.current = sync;
    if (sync) sync.onmessage = () => { void refreshAuth(); };
    const onVisible = () => { if (document.visibilityState === 'visible') void refreshAuth(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      authRevision.current++;
      document.removeEventListener('visibilitychange', onVisible);
      sync?.close();
      channel.current = null;
    };
  }, [refreshAuth]);

  const signUp = async (email: string, password: string, metadata: UserMetadata) => {
    try {
      const { user } = await authApi.signUp({ email, password, ...metadata });
      acceptSession(user);
      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err : new Error('signup failed') };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { user } = await authApi.signIn(email, password);
      acceptSession(user);
      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err : new Error('signin failed') };
    }
  };

  const signInWithGoogle = async (credential: string, csrfToken: string) => {
    try {
      const { user } = await authApi.signInWithGoogle(credential, csrfToken);
      acceptSession(user);
      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err : new Error('Google 登入失敗') };
    }
  };

  const signOut = async () => {
    try {
      await authApi.signOut();
    } catch {
      // Clear local auth state even when the remote session is already unavailable.
    }
    acceptSession(null);
  };

  const requestPasswordReset = async (email: string) => {
    try {
      await authApi.requestPasswordReset(email);
      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err : new Error('寄送驗證碼失敗') };
    }
  };

  const verifyResetCode = async (email: string, code: string) => {
    try {
      const { reset_token } = await authApi.verifyResetCode(email, code);
      return { error: null, reset_token };
    } catch (err) {
      return { error: err instanceof Error ? err : new Error('驗證碼錯誤') };
    }
  };

  const resetPassword = async (reset_token: string, password: string) => {
    try {
      await authApi.resetPassword(reset_token, password);
      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err : new Error('重設密碼失敗') };
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      authError,
      refreshAuth,
      signUp,
      signIn,
      signInWithGoogle,
      signOut,
      requestPasswordReset,
      verifyResetCode,
      resetPassword,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
