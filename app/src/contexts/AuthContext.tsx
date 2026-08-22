import { createContext, useContext } from 'react';
import type { SessionUser } from '../lib/api';

export interface UserMetadata {
  name: string;
  phone: string;
  age: number;
  gender: string;
  occupation: string;
  healing_interest: string;
}

export interface AuthContextType {
  user: SessionUser | null;
  loading: boolean;
  signUp: (email: string, password: string, metadata: UserMetadata) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: (credential: string, csrfToken: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<{ error: Error | null }>;
  verifyResetCode: (email: string, code: string) => Promise<{ error: Error | null; reset_token?: string }>;
  resetPassword: (reset_token: string, password: string) => Promise<{ error: Error | null }>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
