import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Sparkles } from 'lucide-react';
import { createServer } from 'vite';
import { englishVedicFreeResults } from '../src/lib/vedicFreeReading';
import { VEDIC_LIFE_QUESTIONS_EN } from '../src/lib/vedicEnglishCopy';
import type { VedicChartResponse } from '../src/lib/api';
import type * as Page from '../src/pages/VedicAstrologyPage';

const chinese = /[\u3400-\u9fff]/;
const chart: VedicChartResponse = {
  chart_id: 'saved-chart', chart_token: 'saved-token', expires_at: '2099-01-01',
  calculation: { provider: 'prokerala', ayanamsa: 'Lahiri' },
  chart: {
    ayanamsa: 'LAHIRI', lagna: 'Aries', sunSign: 'Capricorn', moonSign: 'Libra',
    moonNakshatra: 'Swati Pada 2', mahaDasha: 'Sun', antarDasha: 'Saturn',
    planets: { Mercury: 'Pisces', Jupiter: 'Aquarius', Sun: 'Capricorn' },
    housePlacements: { Sun: 10 }, houseLords: {}, dashaTimeline: [],
  },
  free_results: {
    archetype: { title: '開創型引路者', body: '中文人格解讀' },
    talents: { title: '今生最重要的天賦', items: ['直覺想像'], body: '中文天賦解讀' },
    currentCycle: { title: '自我定位與發光期', body: '中文週期解讀' },
    challenge: { title: '課題', body: '中文課題' },
    nextYear: { title: '未來', body: '中文未來', lockedPrompts: ['提示'] },
  },
};
for (const sign of ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces']) {
  for (const lord of ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu']) {
    const reading = englishVedicFreeResults({ ...chart.chart, lagna: sign, mahaDasha: lord }, 2026);
    assert.doesNotMatch(JSON.stringify(reading), chinese);
    assert.match(reading.archetype.body, new RegExp(sign));
    assert.match(reading.currentCycle.body, new RegExp(lord));
    for (const part of [reading.archetype, reading.talents, reading.currentCycle]) {
      assert.ok(part.body.split(/\s+/).length >= 100, 'English readings retain substantive detail');
    }
  }
}
const original = JSON.stringify(chart);
const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
  const { FreeResults, LifeQuestionCard, PaidOption } = await vite.ssrLoadModule('/src/pages/VedicAstrologyPage.tsx') as typeof Page;
  const english = renderToStaticMarkup(React.createElement(FreeResults, { chart, language: 'en' }));
  assert.doesNotMatch(english, chinese, 'Saved Chinese API readings must not leak into English cards');
  assert.match(english, /Pioneering Guide/);
  assert.match(english, /Intuitive imagination/);
  assert.match(english, /Self-Definition and Expression/);
  assert.match(english, /Swati Nakshatra/);
  const zh = renderToStaticMarkup(React.createElement(FreeResults, { chart, language: 'zh-Hant' }));
  assert.match(zh, /中文人格解讀/);
  assert.match(zh, /中文天賦解讀/);
  assert.match(zh, /中文週期解讀/);
  assert.equal(JSON.stringify(chart), original, 'Language switching must not mutate the cached chart');
  assert.equal(Object.keys(VEDIC_LIFE_QUESTIONS_EN).length, 9);
  for (const number of Object.keys(VEDIC_LIFE_QUESTIONS_EN)) {
    const props = { number, title: '中文標題', prompt: '中文問題', description: '中文說明', points: ['中文重點'], badge: number === '03' ? '印度占星核心' : number === '09' ? '高價核心' : '主打', icon: Sparkles };
    const en = renderToStaticMarkup(React.createElement(LifeQuestionCard, { ...props, language: 'en' }));
    assert.doesNotMatch(en, chinese);
    assert.match(en, new RegExp(VEDIC_LIFE_QUESTIONS_EN[number].title));
    assert.match(renderToStaticMarkup(React.createElement(LifeQuestionCard, { ...props, language: 'zh-Hant' })), /中文標題/);
  }
  const option = { id: 'vedic_complete', title: '完整人生地圖', subtitle: '中文副標題', description: '中文說明', bullets: ['中文特色'], price: 699, originalPrice: 999, featured: true, icon: Sparkles, disabled: false, loading: false, onClick: () => {} };
  const paid = renderToStaticMarkup(React.createElement(PaidOption, { ...option, language: 'en' }));
  assert.doesNotMatch(paid, chinese);
  assert.match(paid, /Complete Life Map/);
  assert.match(paid, /Nine In-Depth Vedic Astrology Readings/);
  assert.match(paid, /NT\$699/);
  assert.match(paid, /NT\$999/);
  assert.match(paid, /Unlock this guidance/);
  assert.match(renderToStaticMarkup(React.createElement(PaidOption, { ...option, language: 'zh-Hant' })), /完整人生地圖/);
  console.log('Vedic EN/ZH free readings, saved-chart switching, all nine cards, and paid offer PASS; no astrology requests.');
} finally {
  await vite.close();
}
