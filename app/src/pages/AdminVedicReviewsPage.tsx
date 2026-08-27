import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { adminApi, type VedicReview, type VedicReviewStats } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

const LABELS: Record<string,string> = { past_karma:'前世業力',life_lesson:'今生人生課題',soul_mission:'靈魂使命',talents:'天賦與能力',relationship:'感情與關係',career:'工作與事業',wealth:'財富與金錢',spiritual_growth:'靈性成長',future_timeline:'未來 3～5 年' };
const ACCURACY: Record<string,string> = { very_inaccurate:'很不符合',partly_accurate:'部分符合',mostly_accurate:'大致準確',very_accurate:'非常準確',exactly_me:'像在說我本人' };

export default function AdminVedicReviewsPage() {
  const { user } = useAuth(); const navigate = useNavigate();
  const [reviews,setReviews]=useState<VedicReview[]>([]); const [stats,setStats]=useState<VedicReviewStats|null>(null);
  const [page,setPage]=useState(1); const [pages,setPages]=useState(1); const [status,setStatus]=useState(''); const [message,setMessage]=useState('');
  const load=useCallback(async()=>{ const [list,s]=await Promise.all([adminApi.vedicReviews(page,status),adminApi.vedicReviewStats()]); setReviews(list.reviews); setPages(list.pagination.totalPages); setStats(s); },[page,status]);
  useEffect(()=>{ if(!user){navigate('/auth?redirect=%2Fadmin%2Fvedic-reviews');return;} adminApi.check().then((x)=>x.isAdmin?load():navigate('/admin')).catch(()=>navigate('/admin')); },[load,navigate,user]);
  const update=async(id:string,next:'pending'|'approved'|'rejected')=>{await adminApi.updateVedicReview(id,next);setMessage('狀態已更新');await load();};
  const remove=async(id:string)=>{if(!window.confirm('確定刪除這則評價？'))return;await adminApi.deleteVedicReview(id);await load();};
  return <main className="min-h-screen bg-slate-950 px-4 py-10 text-blue-100"><div className="mx-auto max-w-7xl"><Link to="/admin" className="text-sm text-blue-300">← 返回管理後台</Link><h1 className="mt-4 font-serif text-3xl">印度占星評價</h1>
    {stats&&<div className="mt-6 grid gap-3 sm:grid-cols-4">{[['平均星級',stats.averageRating.toFixed(2)],['評價總數',stats.total],['5 星比例',`${stats.fiveStarPercent.toFixed(1)}%`],['高精準度',`${stats.highAccuracyPercent.toFixed(1)}%`]].map(([l,v])=><div key={l} className="rounded-xl border border-blue-500/20 bg-slate-900 p-4"><p className="text-xs text-blue-300/60">{l}</p><p className="mt-2 text-2xl">{v}</p></div>)}</div>}
    {stats&&<div className="mt-4 rounded-xl border border-blue-500/20 bg-slate-900 p-4"><h2>最有共鳴項目</h2><div className="mt-3 flex flex-wrap gap-2">{stats.resonance.map((x)=><span key={x.section} className="rounded-full bg-blue-500/10 px-3 py-1 text-sm">{LABELS[x.section]||x.section}：{x.count}</span>)}</div></div>}
    <div className="mt-6 flex gap-3"><select value={status} onChange={(e)=>{setStatus(e.target.value);setPage(1);}} className="rounded-lg border border-blue-500/30 bg-slate-900 px-3 py-2"><option value="">全部狀態</option><option value="pending">待審核</option><option value="approved">已核准</option><option value="rejected">已隱藏</option></select>{message&&<span className="py-2 text-emerald-300">{message}</span>}</div>
    <div className="mt-5 space-y-4">{reviews.map((r)=><article key={r.id} className="rounded-xl border border-blue-500/20 bg-slate-900/70 p-5"><div className="flex flex-wrap justify-between gap-3"><div><span className="text-amber-300">{'★'.repeat(r.rating)}</span><span className="ml-3 text-sm">{ACCURACY[r.accuracyRating]||r.accuracyRating}</span></div><span className="text-xs text-blue-300/50">{new Date(r.createdAt).toLocaleString('zh-TW',{timeZone:'Asia/Taipei'})}</span></div><p className="mt-3 text-sm text-blue-200/60">使用者：{r.user||r.displayName}｜公開授權：{r.allowPublic?'是':'否'}｜狀態：{r.status}</p><p className="mt-3 whitespace-pre-line leading-7">{r.reviewContent}</p><div className="mt-3 flex flex-wrap gap-2">{r.mostResonantSections.map((s)=><span key={s} className="rounded-full bg-violet-500/10 px-2 py-1 text-xs">{LABELS[s]||s}</span>)}</div><div className="mt-4 flex flex-wrap gap-2"><button onClick={()=>update(r.id,'approved')} className="rounded-lg bg-emerald-600 px-3 py-2 text-sm">核准公開</button><button onClick={()=>update(r.id,'rejected')} className="rounded-lg bg-slate-700 px-3 py-2 text-sm">隱藏</button><button onClick={()=>remove(r.id)} className="rounded-lg bg-rose-700 px-3 py-2 text-sm">刪除</button></div></article>)}</div>
    <div className="mt-6 flex justify-center gap-3"><button disabled={page<=1} onClick={()=>setPage((p)=>p-1)} className="rounded-lg bg-slate-800 px-4 py-2 disabled:opacity-40">上一頁</button><span className="py-2">{page} / {pages}</span><button disabled={page>=pages} onClick={()=>setPage((p)=>p+1)} className="rounded-lg bg-slate-800 px-4 py-2 disabled:opacity-40">下一頁</button></div>
  </div></main>;
}
