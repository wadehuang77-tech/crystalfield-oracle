import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  authModeForPath,
  authPathFor,
  authUrlFor,
  calculationLoginRedirect,
  googleButtonLocale,
  isSafeAuthRedirect,
  localizeAuthError,
} from '../src/lib/authLocale';
import { resolveHumanDesignAccess } from '../src/lib/humanDesignShareAuth';
import { getCheckoutLocaleFromPath, getLanguageFromPath } from '../src/lib/i18n';

assert.equal(authPathFor('/oracle', 'login'), '/login');
assert.equal(authPathFor('/en/oracle', 'login'), '/en/login');
assert.equal(authPathFor('/en/numerology', 'signup'), '/en/register');
assert.equal(authPathFor('/human-design', 'signup'), '/register');
assert.equal(authModeForPath('/login'), 'login');
assert.equal(authModeForPath('/register'), 'signup');
assert.equal(authModeForPath('/en/login'), 'login');
assert.equal(authModeForPath('/en/register'), 'signup');
assert.equal(authModeForPath('/auth', 'signup'), 'signup');
assert.equal(googleButtonLocale('/en/login'), 'en');
assert.equal(googleButtonLocale('/en/oracle'), 'en');
assert.equal(googleButtonLocale('/login'), 'zh_TW');
assert.equal(getLanguageFromPath('/en/human-design/'), 'en');
assert.equal(getCheckoutLocaleFromPath('/en/human-design/'), 'en');
assert.equal(getCheckoutLocaleFromPath('/human-design/'), 'zh-TW');
const humanDesignAccessCases = [
  { groups: ['identity', 'core', 'summary'], access: 'basic' },
  { groups: ['identity', 'full', 'summary'], access: 'full' },
  { groups: ['identity', 'core', 'full', 'summary'], access: 'bundle' },
  { groups: ['identity', 'summary'], access: 'locked' },
  { groups: [], access: 'locked' },
] as const;
for (const { groups, access } of humanDesignAccessCases) {
  for (const locale of ['zh-Hant', 'en'] as const) {
    assert.equal(resolveHumanDesignAccess(groups), access, `${locale} uses server-confirmed groups`);
  }
}

const originalEnglishUrl = '/en/oracle?spread=celtic#reading';
const loginUrl = new URL(authUrlFor('/en/oracle', 'login', originalEnglishUrl), 'https://crystalfield101.com');
assert.equal(loginUrl.pathname, '/en/login');
assert.equal(loginUrl.searchParams.get('redirect'), originalEnglishUrl);
const registerUrl = new URL(authUrlFor('/en/login', 'signup', originalEnglishUrl), 'https://crystalfield101.com');
assert.equal(registerUrl.pathname, '/en/register');
assert.equal(registerUrl.searchParams.get('redirect'), originalEnglishUrl);
const signInUrl = new URL(authUrlFor('/en/register', 'login', '/en/register'), 'https://crystalfield101.com');
assert.equal(signInUrl.pathname, '/en/login');
assert.equal(isSafeAuthRedirect(originalEnglishUrl), true);
assert.equal(isSafeAuthRedirect('//attacker.example'), false);
assert.equal(isSafeAuthRedirect('/en/login'), false);

for (const path of ['/numerology', '/human-design', '/vedic-astrology']) {
  const url = new URL(calculationLoginRedirect(false, path)!, 'https://crystalfield101.com');
  assert.equal(url.pathname, '/login');
  assert.equal(url.searchParams.get('redirect'), path);
  assert.equal(isSafeAuthRedirect(url.searchParams.get('redirect')), true);
  assert.equal(calculationLoginRedirect(true, path), null);
}
for (const path of ['/en/numerology', '/en/human-design', '/en/vedic-astrology']) {
  const url = new URL(calculationLoginRedirect(false, path)!, 'https://crystalfield101.com');
  assert.equal(url.pathname, '/en/login');
  assert.equal(url.searchParams.get('redirect'), path);
  assert.equal(isSafeAuthRedirect(url.searchParams.get('redirect')), true);
  assert.equal(calculationLoginRedirect(true, path), null);
}
assert.equal(
  calculationLoginRedirect(false, '/en/human-design', '?step=chart', '#form'),
  '/en/login?redirect=%2Fen%2Fhuman-design%3Fstep%3Dchart%23form',
);

const appRoutes = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
for (const [path, page] of [
  ['/numerology', 'NumerologyPage'],
  ['/human-design', 'HumanDesignPage'],
  ['/vedic-astrology', 'VedicAstrologyPage'],
] as const) {
  assert.match(appRoutes, new RegExp(`path: '${path}', element: <${page} \\/>`), `${path} must be public`);
}
const numerologyPage = readFileSync(new URL('../src/pages/NumerologyPage.tsx', import.meta.url), 'utf8');
const humanDesignPage = readFileSync(new URL('../src/pages/HumanDesignPage.tsx', import.meta.url), 'utf8');
const vedicPage = readFileSync(new URL('../src/pages/VedicAstrologyPage.tsx', import.meta.url), 'utf8');
for (const pageSource of [numerologyPage, humanDesignPage, vedicPage]) {
  assert.match(pageSource, /calculationLoginRedirect\(!!user, location\.pathname, location\.search, location\.hash\)/);
}
assert.ok(numerologyPage.indexOf('const loginUrl = calculationLoginRedirect') < numerologyPage.indexOf('calculateNumerology(date)'));
assert.ok(humanDesignPage.indexOf('const loginUrl = calculationLoginRedirect') < humanDesignPage.indexOf('calculateHDChart('));
assert.ok(vedicPage.indexOf('const loginUrl = calculationLoginRedirect') < vedicPage.indexOf('vedicAstrologyApi.createChart('));
const authPage = readFileSync(new URL('../src/pages/AuthPage.tsx', import.meta.url), 'utf8');
assert.match(authPage, /navigate\(returnTo, \{ replace: true, state: returnState \}\)/);
const humanDesignReport = readFileSync(new URL('../src/pages/human-design/ReportPage.tsx', import.meta.url), 'utf8');
assert.match(humanDesignPage, /<ReportPage\s+language=\{language\}/);
assert.match(humanDesignReport, /language: Language/);
assert.match(humanDesignReport, /isEnglish \? 'Unlock your personal energy blueprint NT\$399'/);
assert.match(humanDesignReport, /isEnglish \? 'Unlock Human Design core \+ personal energy blueprint NT\$489'/);
assert.match(humanDesignReport, /fullReportFailureMessage\(err, isEnglish\)/);
assert.match(humanDesignReport, /HD_REPORT_GENERATION_TIMEOUT/);
assert.match(humanDesignReport, /HD_REPORT_INVALID_RESPONSE/);
assert.match(humanDesignReport, /Unable to generate your Human Design report\. Please try again later\./);
assert.match(humanDesignReport, /HD_REPORT_CACHE_ERROR/);
assert.match(humanDesignReport, /paidContent\.map\(s =>/);
assert.match(humanDesignReport, /displayFullReportTitle\(s\.title\)/);
assert.match(humanDesignReport, /typeof s\.body === 'string'/);
assert.match(humanDesignReport, /humanDesignApi\.getFullReport\([\s\S]*?language,/);
assert.match(humanDesignReport, /Nine Energy Centers: Inner Light and Open Windows/);
assert.match(humanDesignReport, /Prepare your complete report/);
assert.match(humanDesignReport, /type: isEnglish \? typeNames\[chart\.type\] : chart\.typeName/);
assert.match(humanDesignReport, /authority: isEnglish \? authorityNames\[chart\.authority\]/);
assert.match(humanDesignReport, /language=\{language\}/);
assert.match(humanDesignReport, /isEnglish \? 'Download PDF' : '下載報告 PDF'/);
const apiSource = readFileSync(new URL('../src/lib/api.ts', import.meta.url), 'utf8');
assert.match(humanDesignPage, /resolveHumanDesignAccess\(shareAccess\?\.groups \?\? \[\]\)/);
assert.doesNotMatch(humanDesignPage, /resolveHumanDesignAccess\(access,/);
assert.doesNotMatch(humanDesignPage, /const effectiveAccess = access/);
assert.match(humanDesignPage, /isFullUnlocked = effectiveAccess === 'full' \|\| effectiveAccess === 'bundle'/);
assert.match(humanDesignPage, /access=\{effectiveAccess\}/);
assert.match(apiSource, /locale: getCheckoutLocaleFromPath\(window\.location\.pathname\)/);
assert.match(apiSource, /body: \{ \.\.\.auth, language \}/);
assert.match(apiSource, /timeoutMs: 90000/);
assert.match(humanDesignPage, /'human_design_full'/);
assert.match(humanDesignPage, /'human_design_bundle'/);
assert.doesNotMatch(humanDesignPage, /human_design_(?:full|bundle)-en/);
assert.match(apiSource, /access: \(body: \{ chart_id: string; proofs: HumanDesignShareProof\[\]; capabilities: string\[\] \}\)/);
assert.match(humanDesignPage, /humanDesignShareApi\.access\(\{ chart_id: chartId, proofs, capabilities \}\)/);
assert.match(humanDesignPage, /setShareAccess\(nextAccess\)/);
const humanDesignShareWorker = readFileSync(new URL('../../worker/src/humanDesignShareResults.ts', import.meta.url), 'utf8');
assert.match(humanDesignShareWorker, /human_design_full: \['identity', 'full', 'summary'\]/);
assert.match(humanDesignShareWorker, /human_design_bundle: \['identity', 'core', 'full', 'summary'\]/);
const workerRoutes = readFileSync(new URL('../../worker/src/index.ts', import.meta.url), 'utf8');
assert.match(workerRoutes, /hasHumanDesignPaidGroup\(req, env, id, accessBody, 'full'\)/);

assert.equal(localizeAuthError('電子郵件或密碼錯誤', 'en', 'Sign-in failed.'), 'Incorrect email or password.');
assert.equal(localizeAuthError('此電子郵件已經註冊', 'en', 'Registration failed.'), 'This email is already registered.');
assert.equal(localizeAuthError('請輸入姓名', 'en', 'Registration failed.'), 'Please enter your name.');
assert.equal(localizeAuthError('此 Email 尚未註冊,請先註冊帳號', 'en', 'Password reset failed.'), 'This email is not registered. Please create an account first.');
assert.equal(localizeAuthError('Google 登入服務載入失敗', 'en', 'Google sign-in failed.'), 'Google sign-in could not load. Please try again.');
assert.equal(localizeAuthError('HTTP 500', 'en', 'Google sign-in is temporarily unavailable.'), 'Google sign-in is temporarily unavailable.');
assert.equal(localizeAuthError('unavailable', 'en', 'Sign-in failed.'), 'unavailable');
assert.equal(localizeAuthError('未知中文錯誤', 'en', 'Sign-in failed.'), 'Sign-in failed.');
assert.equal(localizeAuthError('電子郵件或密碼錯誤', 'zh-Hant', '登入失敗'), '電子郵件或密碼錯誤');

console.log('Bilingual auth routes, return URLs, redirect safety, and error localization: passed');
