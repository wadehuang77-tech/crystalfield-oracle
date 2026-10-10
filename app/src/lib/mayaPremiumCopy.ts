import type { MayaLocale } from './maya';
import { MAYA_PRO_PRODUCT } from './mayaPro';
import { MAYA_RELATIONSHIP_PRODUCT } from './mayaRelationship';

export function mayaPremiumCopy(kind: 'pro' | 'relationship', locale: MayaLocale) {
  const en = locale === 'en';
  const pair = kind === 'relationship';
  const product = pair ? MAYA_RELATIONSHIP_PRODUCT : MAYA_PRO_PRODUCT;
  return {
    title: en ? product.en : product.zh,
    price: `NT$${product.price}`,
    cta: `${pair
      ? en ? 'Unlock Our Relationship Blueprint' : '解鎖雙人關係藍圖'
      : en ? 'Unlock My Galactic Life Blueprint' : '解鎖我的星際生命藍圖'} · NT$${product.price}`,
    subtitle: pair
      ? en ? 'Understand each other more deeply. Find new ways to connect and grow together.' : '看見彼此的特質與需要，探索更理解、更有共鳴的相處方式。'
      : en ? 'Explore your strengths, reflect on your purpose, and bring your insights into everyday life.' : '探索你的天賦與生命方向，把對自己的理解化為日常行動。',
    features: pair
      ? en ? ['12 relationship insights', 'Two-person galactic resonance visuals', 'Five-force oracle insights', 'Life wavespell comparison', 'Your perspective, their perspective, and your shared connection', '90-day shared practice plan']
        : ['12 大關係解析', '雙人星際共振圖', '五大神諭解讀', '生命波符比較', 'A 視角、B 視角與共同關係視角', '90 天共振計畫']
      : en ? ['15 life insights', 'Personal galactic identity chart', 'Five-force oracle insights', '13-stage wavespell journey', '90-day life practice plan']
        : ['15 大生命解析', '個人星際身份圖', '五大神諭解讀', '13 階段生命波符', '90 天生命實踐計畫'],
    unavailable: en ? 'The full report is not available yet. Any available purchase grants access only; the report cannot be delivered now.'
      : '完整報告尚未開放。目前若可購買，僅取得商品權限，尚無法交付完整報告。',
    checking: en ? 'Checking report availability…' : '正在確認報告開放狀態…',
    disclaimer: en ? 'Dreamspell is a modern symbolic system for self-exploration, not a traditional Maya calendar or a scientific prediction of relationships or future events.'
      : 'Dreamspell 是現代象徵性自我探索系統，並非傳統馬雅曆法，也不是關係或未來事件的科學預測。',
  };
}
