import assert from 'node:assert/strict';
import {
  authModeForPath,
  authPathFor,
  authUrlFor,
  googleButtonLocale,
  isSafeAuthRedirect,
  localizeAuthError,
} from '../src/lib/authLocale';

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
