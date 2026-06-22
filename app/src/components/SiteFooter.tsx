import { Mail } from 'lucide-react';

export default function SiteFooter() {
  return (
    <footer className="w-full bg-slate-950 border-t border-blue-500/15">
      <div className="max-w-[920px] mx-auto px-6 sm:px-10 py-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
        <div className="flex flex-col items-center sm:items-start gap-2">
          <span className="font-serif text-base text-blue-100 tracking-[0.3em]">晶域心語</span>
          <p className="text-xs text-blue-300/70 tracking-wider">「透過占卜看見方向,在療癒中回到內在平衡。」</p>
        </div>
        <a
          href="mailto:wadehuang77@gmail.com"
          className="inline-flex items-center gap-2 text-sm text-blue-300/75 hover:text-blue-300 transition-colors"
        >
          <Mail className="w-4 h-4" strokeWidth={1.4} />
          wadehuang77@gmail.com
        </a>
      </div>
      <div className="border-t border-blue-500/10">
        <p className="text-center text-xs text-blue-400/50 tracking-[0.2em] py-3">
          © {new Date().getFullYear()} 晶域心語
        </p>
      </div>
    </footer>
  );
}
