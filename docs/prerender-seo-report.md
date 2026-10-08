# Prerender SEO implementation report

**Latest acceptance (2026-10-08, second preview): CONDITIONAL GO.** The two code blockers are fixed and verified at https://ddefc7c9.bolt-tarot-5ek.pages.dev. Public SEO, direct SPA routes, payment-query preservation, homepage hreflang, true 404, hydration and GA4 pass. Full authenticated/API/payment E2E remains NOT VERIFIED because preview CORS is blocked. The first-preview findings below are historical; the final section records the current results.

## Before

The app was a Vite 5 / React 18 SPA using React Router 7 `BrowserRouter` and `createRoot`. A post-build script already wrote hand-composed SEO fragments to many route files, but the root Chinese and English home pages were not prerendered, the static sitemap was maintained separately, and the prerender script did not have an independent output verifier. The complete baseline architecture is recorded in [prerender-seo-audit.md](./prerender-seo-audit.md).

## After

- Added a manifest in `app/seo/prerender-routes.mjs`; the build checks its generated page set and derives `dist/sitemap.xml` from it.
- Added the Chinese `/` and English `/en/` home pages to prerender output.
- Added reciprocal `zh-Hant`, `en`, and `x-default` alternates for routes with actual English and Chinese pages.
- Removed the separately maintained `app/public/sitemap.xml`; the build now creates the sitemap.
- Added `scripts/verify-prerender-seo.mjs` to the build and as `npm run seo:verify`.
- Added Cloudflare Pages `X-Robots-Tag: noindex, nofollow` rules for utility/private routes.
- No framework or dependency was added. No Worker or API code was modified by this task.

## Routes

| Language | Successfully generated routes |
|---|---|
| Chinese (31) | `/`, `/oracle`, `/tarot`, `/lightworker`, `/unicorns`, `/dragons`, `/egyptian-gods`, `/work-your-light`, `/osho`, `/numerology`, `/human-design`, `/vedic-astrology`, all 9 Human Design articles, all 10 Vedic astrology articles |
| English (12) | `/en/`, `/en/oracle`, `/en/tarot`, `/en/lightworker`, `/en/unicorns`, `/en/dragons`, `/en/egyptian-gods`, `/en/work-your-light`, `/en/osho`, `/en/numerology`, `/en/human-design`, `/en/vedic-astrology` |

The manifest and output verifier confirm all 43 HTML files exist. Private routes, checkout/payment utilities, user reports and `/admin` are not in the prerender manifest or sitemap.

## First-preview verification (historical)

The final production build verifier passed across all 43 routes:

- One non-empty, unique title per route.
- One description, one canonical, one H1, and more than the minimum main-content text.
- Crawlable `<a href>` links in the prerendered main content.
- Valid in-source JSON-LD.
- The original local verifier reported reciprocal hreflang, but skipped the English homepage because its alternate path is the empty-string root path. Preview verification exposed missing `zh-Hant`, `en`, and `x-default` tags on `/en/`; all other paired pages passed.
- No invented `lastmod` values and no private utility URLs in the sitemap.
- `test:hydration` verified all 43 generated routes and `404.html`. A production-build browser check loaded the ten requested Chinese and English routes; all retained the prerender marker and content, had exactly one H1 and one JSON-LD script, and produced zero hydration-related console warnings/errors or page errors.
- The browser check also confirmed one initial `page_view` on each direct load. A client-side language navigation emitted exactly one additional `page_view` while retaining one H1 and one JSON-LD script.
- On 2026-10-08, the HTTP verifier checked the actual Pages preview. All 43 public prerender routes returned HTTP 200 with HTML SEO content; the four requested unknown routes returned HTTP 404. Utility-route and homepage-hreflang failures are detailed below.

### Feature and platform verification

| Area | Result | Evidence / limits |
|---|---|---|
| Production build | PASS | Final build ran Vite, prerendered 43 routes, and passed the output verifier |
| Type check | PASS | `npm --prefix app run typecheck` |
| Prerender/hydration | PASS on preview | Ten requested routes had zero hydration warnings/errors or page errors; their parser-created H1 node and text survived hydration, with one H1 and one JSON-LD |
| Lint | PASS with existing warnings | No lint errors; existing hook dependency and Fast Refresh warnings |
| Auth | NOT VERIFIED end-to-end; direct-route FAIL | `test:auth` passed; preview `/api/auth/me` and `/api/auth/google/config` were blocked by CORS. Direct `/login` and `/en/login` redirect to `/` |
| Payment | FAIL for direct return routes | Safe browser loads of both return routes redirected to the Chinese homepage. `test:payment-return` passed local storage restoration; no real charge or successful payment was attempted |
| Tarot | NOT VERIFIED end-to-end | Chinese/English entry, deck selection and spread controls worked. Deck-preview CORS failure prevented card/result retrieval; clicking draw did not yield a result |
| Numerology | NOT VERIFIED end-to-end | Chinese/English form inputs and submission worked but redirected to localized sign-in; auth CORS blocked the calculation/result flow |
| Human Design | NOT VERIFIED end-to-end | Chinese/English form inputs and submission worked but redirected to localized sign-in; auth CORS blocked the chart/result flow |
| Vedic Astrology | NOT VERIFIED end-to-end | Chinese/English form inputs and submission worked but redirected to localized sign-in; auth CORS blocked the request/result flow |
| English | PASS for core static HTML; hreflang FAIL on homepage | Title/content/canonical/H1/English internal links passed. `/en/` raw HTML lacks all three alternate-language tags |
| GA4 duplicate `page_view` | PASS on preview | One initial event on each of ten direct loads; event totals 1, 2, 3, 4 across initial load and three SPA navigations. This verifies emission, not GA4 reporting ingestion |
| Cloudflare response headers | PASS for public SEO pages | HTML type and revalidation cache policy correct; preview-specific `noindex` is expected, and existing production homepage responses have no noindex header |
| robots.txt | PASS | One sitemap directive; verifier found no rules blocking public routes or render assets |
| 404 behavior | PASS on Pages | All four requested unknown URLs return actual HTTP 404, not an HTTP 200 React error screen |
| Hydration | PASS on preview | `hydrateRoot` preserves the prerendered nodes; no duplicate H1/JSON-LD or blank content |

Existing app checks executed: `test:hydration`, `seo:verify`, `test:auth`, `test:payment-return`, `test:ga4`, and `test:tarot-deep-analysis` all passed. The enhanced `seo:http:verify` exits with code 1 for the live hreflang and SPA utility-route regressions. Browser form submissions were stopped by existing authentication gates; no real account, report, order, or payment action was initiated.

## Sitemap, robots, structured data

- The generated sitemap contains exactly the 43 manifest URLs, all using the same canonical URL shape, and includes reciprocal alternates where both languages exist.
- `robots.txt` declares the sitemap once and permits public routes and static assets.
- Cloudflare Pages utility rules attach `X-Robots-Tag: noindex, nofollow` to the tested utility responses, but those responses redirect to `/` instead of serving the intended SPA shell.
- Public preview pages receive Cloudflare's automatic `X-Robots-Tag: noindex`, while their HTML retains `index, follow`. This is [documented preview behavior](https://developers.cloudflare.com/pages/configuration/preview-deployments/#preview-indexing-by-search-engines), not a blanket production `_headers` rule. No security or indexing setting was changed.
- Preview `/sitemap.xml` returned application/xml and parsed with zero XML errors, 43 public URLs and no private URLs. `/robots.txt` matched the intended local file and points to `https://www.crystalfield101.com/sitemap.xml`.
- Static JSON-LD is embedded in the initial HTML and reuses the existing `data-seo-jsonld` element so the client SEO effect updates rather than appending a second JSON-LD script.
- The static article schema omits author/publisher and publication-date claims that are not supplied by the prerender data. Existing client-generated schemas still include some author/date data; editorial accuracy remains to be confirmed.

## Performance (original implementation measurements)

| Metric | Before | After | Notes |
|---|---:|---:|---|
| `dist` total bytes | 5,683,612 | 5,696,630 | +13,018 bytes; 43 HTML outputs |
| Main JS | 1,621,037 bytes | 1,621,575 bytes | +538 bytes; approximately 0.03% |
| CSS | 150,115 bytes | 150,115 bytes | unchanged |
| HTML files | 42 | 43 | Added `/en/`; root now contains SEO HTML |
| Vite build phase | 7.55 s | 6.78 s | Single-run measurements, subject to cache/system variance |

The main JS remains approximately 1.317 MB minified, above Vite's 500 kB warning threshold. No chunking refactor was made.

## First-preview risks and recommendation (historical, superseded below)

**Recommendation: NO-GO for production deployment.** The real preview passes public-route HTTP, raw prerender content, true 404, hydration, sitemap, robots and GA4 checks. However, directly requested SPA-only routes redirect to the homepage, breaking sign-in and payment returns; `/en/` also lacks hreflang. These are actual failures, not merely preview CORS limitations.

Before production: fix and reverify exact SPA-only rewrites on another preview, restore the English homepage alternates, and complete safe feature/auth/payment checks in an appropriately authorized environment. Do not broaden production CORS or OAuth configuration solely to make this preview pass.

## Change controls

- Baseline and current HEAD: `6019f37b399bf5b104d32e99c5727eb631ca1fd0`; no commit created.
- Existing Worker/VedAstro changes were preserved.
- No production deployment, push, migration, payment action, or production database write was performed.
- This verification round modified only the HTTP verifier and this report. The deployed app assets, 278 English card records, translations, algorithms, Worker settings, secrets, OAuth settings and DNS were not modified.

## Cloudflare Pages preview deployment evidence

- Existing authenticated project: `bolt-tarot` (direct upload, no Git provider), confirmed by the Pages project API and its `crystalfield101.com` / `www.crystalfield101.com` domains; production branch is `main`.
- Uploaded the existing verified `app/dist` without rebuilding or changing its app assets. Typecheck, local SEO and hydration structure checks were repeated successfully before upload.
- Preview branch: `seo-preview-20261008`.
- Preview deployment ID: `40cf4bf0-310b-420b-a627-0bb5d38d8b9c`; Cloudflare API confirms environment `preview`, deployment stage `success`.
- Unique URL: https://40cf4bf0.bolt-tarot-5ek.pages.dev
- Branch alias: https://seo-preview-20261008.bolt-tarot-5ek.pages.dev
- Production canonical deployment remained `90560580-b325-4d1c-a93d-8cd0dc475305` before and after upload and at final verification. Both production custom domains stayed attached to the same project and continued returning HTTP 200 with the original production JS asset `/assets/index-Ba-pmJ1u.js`.
- Raw full-response hashes differed between production GETs, so they are not used as proof of unchanged deployment. The unchanged canonical deployment ID, domain mappings, and production asset identity are the evidence.
- Reproduction: `npm --prefix app run seo:http:verify -- https://40cf4bf0.bolt-tarot-5ek.pages.dev --allow-preview-noindex`.

### HTTP findings

All 43 canonical public pages: HTTP 200, `text/html; charset=utf-8`, `Cache-Control: public, max-age=0, must-revalidate`. Slashless public URLs return 308 to the corresponding trailing-slash path, then HTTP 200. Canonicals remain `https://www.crystalfield101.com/`, not the preview hostname. Raw HTML contains title, description, canonical, H1, main content and crawlable internal links; English pages contain English internal links.

| Unknown path | Status | Location | Cache-Control |
|---|---|---|---|
| `/this-page-does-not-exist-987654` | 404 | absent | no-store |
| `/foo/bar/not-real` | 404 | absent | no-store |
| `/en/not-real` | 404 | absent | no-store |
| `/oracle/not-real` | 404 | absent | no-store |

| Failure | Evidence |
|---|---|
| SPA-only direct URL handling | `/login`, `/en/login`, `/admin`, `/en/admin`, `/checkout/return`, `/en/checkout/return` all return 308 with `Location: /`. Browser payment-return loads end on the Chinese homepage. Tested trailing-slash variants return 404 |
| Homepage hreflang | `/en/` raw HTML has no `zh-Hant`, `en` or `x-default` alternate tags. The root alternate is represented as `''`; the prerender helper's falsy check omits it. The previous local verifier also skipped this case |
| PREVIEW CORS BLOCKED | Auth, Google configuration and deck-preview browser fetches are blocked. OPTIONS responses for this exact preview Origin return 200 but no `Access-Control-Allow-Origin` or `Access-Control-Allow-Credentials` |

No production CORS change was made. Google sign-in configuration cannot be fetched from this preview, so OAuth-origin authorization itself was NOT VERIFIED; do not label it unauthorized without testing it. No successful payment callback or paid-result flow was tested.

## First-preview acceptance report (historical, 2026-10-08)

| Item | Result |
|---|---|
| A. Preview URL | https://40cf4bf0.bolt-tarot-5ek.pages.dev |
| B. Production unchanged | YES |
| C. Build | PASS (existing verified build output; not rebuilt in this verification round) |
| D. Typecheck | PASS |
| E. Preview deployment | PASS |
| F. 43 prerender HTTP routes | 43/43 PASS for HTTP and core SEO content; separate homepage hreflang failure |
| G. Real routes HTTP 200 | PASS (canonical URLs; slashless URLs redirect correctly) |
| H. Unknown routes HTTP 404 | PASS |
| I. Soft 404 | PASS (fixed on tested unknown URLs) |
| J. Cloudflare headers | PASS for public SEO pages; preview-specific noindex confirmed |
| K. Raw HTTP HTML contains SEO content | PASS |
| L. Hydration on Preview | PASS |
| M. Sitemap | PASS |
| N. robots.txt | PASS |
| O. Chinese Tarot | NOT VERIFIED end-to-end - deck-preview CORS prevents draw/result |
| P. English Tarot | NOT VERIFIED end-to-end - deck-preview CORS prevents draw/result |
| Q. Numerology ZH/EN | NOT VERIFIED - auth CORS; submission reaches localized login gate |
| R. Human Design ZH/EN | NOT VERIFIED - auth CORS; submission reaches localized login gate |
| S. Vedic Astrology ZH/EN | NOT VERIFIED - auth CORS; submission reaches localized login gate |
| T. CORS | FAIL - PREVIEW CORS BLOCKED |
| U. Google Login | NOT VERIFIED - Google configuration fetch blocked by preview CORS; OAuth authorization not reached |
| V. Payment return | FAIL - both direct return URLs redirect to homepage; automated storage tests passed, paid flow NOT VERIFIED |
| W. GA4 | PASS for browser page_view emission |
| X. 278 English cards modified | NO |
| Y. Existing translations modified | NO |
| Z. VedAstro changes preserved | YES |
| AA. Production deployed | NO |
| AB. Recommendation | NO-GO |
| AC. Remaining blockers | Fix and reverify SPA-only direct-route rewrites and English homepage hreflang. Complete feature/auth/payment E2E in a safely authorized test environment without weakening production security |

## Second-preview blocker fixes and final acceptance

### Surgical fixes

- Saved the built, non-prerendered Vite template as `dist/app-shell.html`, with an empty React root and `noindex, nofollow`. It contains no private-page content or SEO prerender output. Client startup uses the existing `createRoot` branch.
- Exact SPA-only rewrites now target `/app-shell`, not `/index.html`. This avoids Cloudflare's `index.html` normalization to `/` and avoids hydrating the homepage at a different URL. Both trailing-slash variants are covered; unknown paths still fall through to `404.html`. No global SPA fallback was added.
- Public prerender routes still use their existing HTML and `hydrateRoot`; private/utility routes and the shell are excluded from the 43-route sitemap.
- Hreflang generation and the local verifier now test `alternatePath !== undefined`. The existing empty-string Chinese homepage path is valid, yielding reciprocal `zh-Hant` and `x-default` links to `https://www.crystalfield101.com/` and `en` links to `https://www.crystalfield101.com/en/`.
- Added local assertions for empty shell/noindex/exact rewrites and live checks for slash variants, JSON-LD, H1 uniqueness and payment-query preservation.
- No auth, payment, pricing, membership, astrology or translation logic was changed in this round.

### Local validation and preview isolation

`typecheck`, `build`, `seo:verify`, `test:hydration`, `test:auth`, `test:payment-return`, `test:ga4`, and `test:tarot-deep-analysis` passed. The build verifier covers the generated 404 and no-catch-all policy. Targeted ESLint for the three edited scripts passed; full app lint reported zero errors and three warnings (Fast Refresh exports in `App.tsx` and `RenderYearContext.tsx`, and the existing `HomePage.tsx` hook dependency). Vite retains its existing large-bundle warning.

New deployment:

- Project: `bolt-tarot`; production branch remains `main`.
- Branch: `seo-spa-hreflang-20261008`.
- Deployment: `ddefc7c9-3447-45cc-92a5-e6c263c463d7`; Cloudflare API reports environment `preview`.
- Unique URL: https://ddefc7c9.bolt-tarot-5ek.pages.dev
- Alias: https://seo-spa-hreflang-20261008.bolt-tarot-5ek.pages.dev
- Production canonical deployment remains `90560580-b325-4d1c-a93d-8cd0dc475305`; custom-domain mappings are unchanged.
- No production deployment, promotion, push, DNS/custom-domain change, Worker deployment, secret modification, migration, production data write or charge was performed.

### Exact direct-route evidence

Base URL in this table is `https://ddefc7c9.bolt-tarot-5ek.pages.dev`. All responses were `text/html`, all `Location` headers were absent, and utility noindex was preserved. Trailing-slash variants also returned 200 with no redirect.

| Requested path | HTTP | Location | Final HTTP URL path | React behavior after startup |
|---|---|---|---|---|
| `/login` | 200 | absent | `/login` | Chinese sign-in |
| `/en/login` | 200 | absent | `/en/login` | English sign-in |
| `/admin` | 200 | absent | `/admin` | Existing auth guard navigates to `/login?redirect=%2Fadmin`; admin authentication itself NOT VERIFIED |
| `/en/admin` | 200 | absent | `/en/admin` | Existing auth guard navigates to `/en/login?redirect=%2Fen%2Fadmin`; admin authentication itself NOT VERIFIED |
| `/checkout/return` | 200 | absent | `/checkout/return` | Chinese return UI with expected missing-order message |
| `/en/checkout/return` | 200 | absent | `/en/checkout/return` | English return UI with expected missing-order message |
| `/checkout/return?orderId=TEST123` | 200 | absent | unchanged | Query preserved after React startup |
| `/en/checkout/return?orderId=TEST123` | 200 | absent | unchanged | Query preserved after React startup |

The existing payment component consumes `order_id`, not `orderId`; its existing behavior was intentionally unchanged. The requested camel-case example remains in the URL but correctly displays the existing missing-order message. Separate synthetic `order_id=SEO_PREVIEW_TEST123`, `order_token=TEST_ONLY`, and encoded `return_to` tests preserved every parameter through HTTP routing and React startup on both languages. They reached the return component's confirming state; actual order verification was CORS-blocked, so no successful payment result is claimed.

### SEO, hydration and GA4 revalidation

The full HTTP verifier passed with:

`npm --prefix app run seo:http:verify -- https://ddefc7c9.bolt-tarot-5ek.pages.dev --allow-preview-noindex`

- 43/43 public routes: 200, correct title, description, production canonical, H1, main content, internal links and one valid JSON-LD.
- Public slashless URLs redirect 308 only to the corresponding canonical trailing-slash path.
- All paired routes, including `/` and `/en/`, contain correct reciprocal raw-HTML hreflang.
- Four specified unknown paths: actual HTTP 404.
- Sitemap and robots exactly match the intended generated/local files; no private sitemap URLs.
- Public `Cache-Control` remains `public, max-age=0, must-revalidate`; Cloudflare's preview-only `X-Robots-Tag: noindex` is explicitly distinguished from production policy.
- Ten requested browser routes: zero hydration warnings/errors and zero page errors; original parser-created H1 node/text preserved, one H1, one JSON-LD, no blank content.
- Each of ten direct loads emits one `page_view`. Three SPA navigations yield event totals 1, 2, 3, 4, without prerender/hydration duplicates. GA4 server-side reporting ingestion is not part of this assertion.

### Remaining preview limitations and change protection

PREVIEW CORS BLOCKED remains confirmed for the new exact origin. Auth, Google configuration and deck-preview OPTIONS responses have no allowed-origin/credentials headers. Chinese/English calculation forms submit and reach their existing localized sign-in guards, but calculation/result E2E cannot proceed. Full Tarot, Google login and payment E2E remain NOT VERIFIED.

The repository uses an exact `ALLOWED_ORIGINS` list; it has no automatic `pages.dev` preview-origin mechanism. Allowing this preview would require changing a Worker origin binding/configuration and applying it to the Worker, which is outside scope. Nothing was activated or loosened; no wildcard CORS, production secret or OAuth change was made.

Existing VedAstro working-tree hashes remained:

- `worker/src/vedicAstrology.ts`: `B1CF5C3A24913BC696511407C2FFA69C79356420F068F3266211ECAC721D1902`
- `worker/scripts/vedic-astrology-check.ts`: `31908C868D70497AEAEF137A612735BBFD0F6E99AFC3DA0C7630CB609A574885`

The user approved including the prior related, verified prerender/hydration/404 work in the local commit, while excluding Worker/VedAstro and content data. Commit message: `SEO: fix SPA fallback routes and English hreflang`. No push is permitted.

### Final report

| Item | Result |
|---|---|
| A. New Preview URL | https://ddefc7c9.bolt-tarot-5ek.pages.dev |
| B. Production unchanged | YES |
| C. Build | PASS |
| D. Typecheck | PASS |
| E. 43 prerender routes | 43/43 |
| F. /login direct load | PASS |
| G. /en/login direct load | PASS |
| H. /admin direct load | PASS - existing unauthenticated guard preserved |
| I. /en/admin direct load | PASS - existing unauthenticated guard preserved |
| J. /checkout/return direct load | PASS |
| K. /en/checkout/return direct load | PASS |
| L. Payment query parameters preserved | PASS |
| M. English homepage hreflang | PASS |
| N. Chinese homepage reciprocal hreflang | PASS |
| O. Unknown routes HTTP 404 | PASS |
| P. Raw SEO HTML | PASS |
| Q. Hydration | PASS |
| R. Sitemap | PASS |
| S. robots.txt | PASS |
| T. GA4 | PASS for browser page_view emission |
| U. Preview CORS | FAIL - documented preview-origin restriction, unchanged |
| V. Tarot E2E | NOT VERIFIED - deck/auth CORS |
| W. Numerology E2E | NOT VERIFIED - auth CORS |
| X. Human Design E2E | NOT VERIFIED - auth CORS |
| Y. Vedic Astrology E2E | NOT VERIFIED - auth CORS |
| Z. Google Login | NOT VERIFIED - config fetch CORS; OAuth authorization not reached |
| AA. Payment E2E | NOT VERIFIED - order fetch CORS, no real charge |
| AB. 278 English cards modified | NO |
| AC. Existing translations modified | NO |
| AD. VedAstro changes preserved | YES |
| AE. Production deployed | NO |
| AF. Local commit | `SEO: fix SPA fallback routes and English hreflang` (hash reported after creation) |
| AG. Recommendation | CONDITIONAL GO |
| AH. Remaining blockers | Complete authenticated/API feature, Google login and safe payment E2E in an authorized test environment before production. No remaining failures in this round's two code-fix objectives |
