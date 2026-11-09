import { useEffect, useRef } from 'react';
import { TarotAccountLogin } from './TarotAccountLogin';

export function TarotReadingLoginDialog({ open, onClose, english }: { open: boolean; onClose: () => void; english: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (open) dialog.current?.showModal();
    else dialog.current?.close();
  }, [open]);
  return <dialog ref={dialog} onCancel={onClose} onClose={onClose} aria-label={english ? 'Sign in to continue this reading' : '登入後接續本次解讀'} className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-xl overflow-y-auto rounded-2xl bg-slate-950 p-3 text-white backdrop:bg-black/70">
    <button type="button" onClick={onClose} className="mb-2 min-h-11 px-4 underline">{english ? 'Back to my cards' : '返回原牌卡解讀'}</button>
    <p className="mb-3 px-3">{english ? 'Your cards stay here. Sign in to reveal the remaining 50%.' : '保留本次牌卡，登入成功後直接顯示剩餘 50%，不需重新抽牌。'}</p>
    {open && <TarotAccountLogin />}
  </dialog>;
}
