import { useEffect, useState } from 'react';

type Track = { id:string; title:string; description:string; durationSeconds:number; isFree:boolean };
const fallback: Track[] = Array.from({length:13},(_,i)=>({id:String(i+1).padStart(2,'0'),title:`冥想練習 ${String(i+1).padStart(2,'0')}`,description:i<3?'免費體驗音頻':'會員專屬深度練習',durationSeconds:0,isFree:i<3}));

export default function MeditationPage() {
  const [tracks,setTracks]=useState<Track[]>(fallback);
  useEffect(()=>{ fetch('/api/meditation/tracks').then(r=>r.ok?r.json():null).then(v=>v?.tracks&&setTracks(v.tracks)).catch(()=>{}); },[]);
  return <main className="min-h-screen bg-[#faf8f3] text-[#302b3d] px-4 py-12 sm:px-8"><div className="mx-auto max-w-6xl">
    <header className="mb-12 text-center"><p className="mb-3 text-sm tracking-[0.3em] text-[#71836f]">CRYSTAL FIELD · MEDITATION</p><h1 className="text-4xl font-semibold text-[#443b58] sm:text-5xl">讓心靈慢下來，找回內在平靜</h1><p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-[#5e5868]">透過聲音與冥想，釋放壓力、安定情緒，重新連結內在力量。</p></header>
    <section aria-labelledby="tracks" className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"><h2 id="tracks" className="sr-only">冥想音頻課程</h2>{tracks.map(t=><article key={t.id} className="rounded-3xl border border-[#ddd5e5] bg-white/80 p-6 shadow-sm"><div className="mb-5 flex items-center justify-between"><span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#e7e0ee] text-lg font-semibold text-[#5b4b72]">{t.id}</span><span className={`rounded-full px-3 py-1 text-xs font-medium ${t.isFree?'bg-[#e2f0e2] text-[#35633b]':'bg-[#eee8f5] text-[#66527a]'}`}>{t.isFree?'免費體驗':'會員專屬'}</span></div><h3 className="text-xl font-semibold text-[#443b58]">{t.title}</h3><p className="mt-2 min-h-12 text-sm leading-6 text-[#655f6e]">{t.description}</p><div className="mt-5"><audio controls preload="none" className="w-full" src={`/api/meditation/audio/${t.id}`}><track kind="captions" /></audio></div></article>)}</section>
    <p className="mt-10 text-center text-sm text-[#716b78]">目前僅開放免費音頻；其餘課程尚未販售，待方案確定後再開放。</p>
  </div></main>;
}
