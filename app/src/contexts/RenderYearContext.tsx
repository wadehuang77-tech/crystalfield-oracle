import { createContext, useContext, type ReactNode } from 'react';

const RenderYearContext = createContext<number | null>(null);

export function RenderYearProvider({ year, children }: { year: number; children: ReactNode }) {
  return <RenderYearContext.Provider value={year}>{children}</RenderYearContext.Provider>;
}

export function useRenderYear() {
  const year = useContext(RenderYearContext);
  if (year === null) {
    throw new Error('useRenderYear must be used within a RenderYearProvider');
  }
  return year;
}
