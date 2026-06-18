import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { authApi, SessionUser } from '../lib/api';

interface UserMetadata {
  age: number;
  gender: string;
  occupation: string;
  healing_interest: string;
}

interface AuthContextType {
  user: SessionUser | null;
  loading: boolean;
  signUp: (email: string, password: string, metadata?: UserMetadata) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<{ error: Error | null }>;
  verifyResetCode: (email: string, code: string) => Promise<{ error: Error | null; reset_token?: string }>;
  resetPassword: (reset_token: string, password: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { user } = await authApi.me();
        setUser(user);
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const signUp = async (email: string, password: string, metadata?: UserMetadata) => {
    try {
      const { user } = await authApi.signUp({ email, password, ...metadata });
      setUser(user);
      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err : new Error('signup failed') };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { user } = await authApi.signIn(email, password);
      setUser(user);
      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err : new Error('signin failed') };
    }
  };

  const signOut = async () => {
    try {
      await authApi.signOut();
    } catch {
    }
    setUser(null);
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
      signUp,
      signIn,
      signOut,
      requestPasswordReset,
      verifyResetCode,
      resetPassword,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
