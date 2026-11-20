import { Link } from 'react-router-dom';

export function getRecommendedEgyptianGods(resultTextOrCategory = '') {
  const text = resultTextOrCategory.toLowerCase();
  if (/感情|人際|關係|love|relationship/.test(text)) return { category: '情感、人際課題', gods: ['艾希斯', '哈索爾'] };
  if (/事業|工作|方向|迷惘|career|direction/.test(text)) return { category: '事業抉擇、方向迷惘', gods: ['托特', '荷魯斯'] };
  if (/低谷|挫敗|轉折|壓力|low|stress|transition/.test(text)) return { category: '流年低谷、轉折壓力', gods: ['歐西里斯', '阿努比斯'] };
  return { category: '能量透支、界線模糊', gods: ['拉', '瑪特'] };
}

export default function EgyptianMeditationRecommendation({ language = 'zh-Hant', resultTextOrCategory = '' }: { language?: 'zh-Hant' | 'en'; resultTextOrCategory?: string }) {
  const en = language === 'en';
  const recommendation = getRecommendedEgyptianGods(resultTextOrCategory);
  return <section className="mt-8 rounded-2xl border border-amber-400/25 bg-slate-900/70 p-5 shadow-lg backdrop-blur-md sm:p-6" aria-label={en ? 'Egyptian deity meditation recommendation' : '埃及十神冥想引導推薦'}>
    <p className="text-xs tracking-[.18em] text-amber-300">{en ? 'EGYPTIAN MEDITATION · 10 MINUTES' : '埃及十神冥想 · 每段 10 分鐘獨立引導'}</p>
    <h2 className="mt-2 font-serif text-2xl text-amber-50">{en ? 'Settle into a guided meditation after your reading' : '解讀後，給自己一段安靜沉澱的時間'}</h2>
    <p className="mt-3 leading-7 text-slate-200/85">{en ? `Detected theme: ${recommendation.category}. Recommended: ${recommendation.gods.join(' or ')}. Ten Egyptian deities are independent ten-minute meditations; choose one at your own pace.` : `偵測到的課題：${recommendation.category}。為你推薦：${recommendation.gods.join(' 或 ')} 10 分鐘獨立冥想。十位古埃及神祇各自對應一段獨立引導，可自由挑選一位免費試聽。`}</p>
    <Link to="/meditation?source=reading" className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-gradient-to-r from-amber-300 to-yellow-200 px-5 py-3 font-semibold text-slate-950 transition hover:brightness-110">{en ? 'Try a free meditation preview →' : '前往埃及十神免費試聽 →'}</Link>
  </section>;
}
