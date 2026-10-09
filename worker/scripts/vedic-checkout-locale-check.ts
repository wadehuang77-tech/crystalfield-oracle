import assert from 'node:assert/strict';
import { checkoutItemName, SPREAD_CATALOG } from '../src/ecpay.ts';

assert.equal(
  checkoutItemName(SPREAD_CATALOG.vedic_complete, 'en'),
  'Vedic Astrology | Complete Life Map',
);
assert.equal(
  checkoutItemName(SPREAD_CATALOG.vedic_complete, 'zh-TW'),
  '印度占星｜完整人生地圖',
);

console.log('Vedic checkout item name follows the selected locale.');
