import { TarotAccountLogin } from './TarotAccountLogin';
import type { ReactNode } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { TarotWelcome } from './TarotWelcome';

// Gate before mounting any draw controls, including direct and localized URLs.
export function TarotEntryGate({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (!loading && user) return children;
  return <main className="mx-auto w-full max-w-6xl px-4 py-10">
    <h1 className="mb-6 text-3xl font-bold text-slate-100">塔羅與神諭卡 · Tarot & Oracle</h1>
    {loading && <p className="mb-4 text-slate-100" role="status">登入狀態確認中 / Checking sign-in…</p>}
    <TarotWelcome />
    {!loading && <TarotAccountLogin />}
  </main>;
}
