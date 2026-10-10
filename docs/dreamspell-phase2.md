# CrystalField101 Dreamspell Phase 2 — local delivery

## Scope and safety

This is a local, Mock-AI implementation, not authorization for Phase 3.
No commit, push, deployment, remote D1 migration, real payment, live payment
configuration change or paid AI request was performed. Existing unrelated
worktree changes were left untouched.

The runnable local subset is implemented and tested. Complete release
acceptance remains BLOCKED by reference verification, browser acceptance and
live integration checks listed below.

## Audit and integration decisions

- React/Vite uses one route table with shared `/en` localization. Maya routes
  use the same auth context, login page, Google button flow and API transport.
- Worker routing retains the existing CORS/origin guard. Maya uses existing
  session/JWT verification with a new opt-in fail-closed parameter; default
  behavior for other services is unchanged.
- Existing member identity is `profiles.id`; payments use `orders.id`,
  `item_id`, `amount`, `status` and `paid_at`. No replacement member/order/payment
  system was added.
- Maya does not enter the existing ECPay checkout catalog or callback grant
  flow. Existing Tarot/Numerology/Human Design/Vedic prices and calculations
  were not changed by this task.
- Existing report generation remains untouched. Maya imports no paid-model
  client and supports only deterministic local mock generation.
- Existing SEO/prerender/sitemap manifests are extended for the two public
  Maya introductions only.
- First-phase solar-seal data had real errors despite passing epoch-only
  tests. The KIN/date algorithm is preserved; the seal table/index and tone 5
  name were corrected and covered exhaustively. See [calculation specification](dreamspell-spec.md).

## Database

Migration: [025_maya_dreamspell.sql](../d1/migrations/025_maya_dreamspell.sql).
It is additive and repeatable, with no DROP/reset operation.

| Table | Responsibility and constraints |
| --- | --- |
| `maya_kin_profiles` | Own-member birth data, numeric calculation fields, version, personal/relationship role; unique member/role |
| `maya_kin_content` | 260 KIN in zh-TW and en; unique KIN/locale/content version |
| `maya_daily_energy` | Separate free/premium fields; unique date/locale/content/calculation versions |
| `maya_reports` | Owner, product, locale, profile links, order/entitlement, immutable calculation snapshot, status, retry lease, model/prompt/version and token/cost counters |
| `maya_entitlements` | Existing member and order foreign keys, exact product, status, start/expiry and local-mock/verified-payment source |
| `maya_rate_limits` | Additional atomic, fail-closed per-member request counters |

Reports have unique `(user_id, idempotency_key)` and `(order_id, locale)`.
One order cannot mint unlimited reports by varying request keys. Each purchased
product can have a Chinese and an English report. Changed inputs on an already
bound order return 409. Ownership is checked before accessing profile data;
report retrieval rechecks ownership and current entitlement/order validity.

The atomic Maya limiter is intentionally separate from the legacy rate-limit
helper, which tolerates database errors. No legacy caller was changed.

Seeds:

- [maya-local-fixtures.sql](../d1/maya-local-fixtures.sql): only dummy
  `example.test` accounts, three mock paid orders and mock entitlements.
- [maya-kin-content-seed.sql](../d1/maya-kin-content-seed.sql): 520 bilingual
  reflection entries, generated without AI or personal data.
- [build-maya-content.ts](../d1/build-maya-content.ts): reproducible seed generator.

The tests apply the existing order migration and the Maya migration in a fresh
Miniflare D1 with an isolated database identifier and no production bindings.
No existing local or remote member/order database is modified by the tests.
The discarded Phase 2 draft schema contained DROP statements and the draft
migration had a conflicting 005 sequence; those untracked drafts were replaced
with the single 025 migration.

## APIs

All endpoints require a valid existing member session. Responses are
`private, no-store`; D1 supplies shared daily-content caching without an
authenticated HTTP response being publicly cached.

| Method / path | Behavior |
| --- | --- |
| POST `/api/maya/calculate` | Validate date/locale/role, persist own profile, return free calculation/summary |
| GET `/api/maya/profile` | Own personal and relationship profiles; no arbitrary member selector |
| DELETE `/api/maya/profile` | Authenticated explicit deletion of own Maya profiles/reports only |
| GET `/api/maya/daily` | Date-only deterministic KIN, bilingual free summary, Taipei timezone and July markers |
| GET `/api/maya/daily/premium` | 403: daily premium remains a future product |
| GET `/api/maya/entitlements` | Own currently valid product entitlements only |
| POST `/api/maya/reports` | Exact product/owned profile/order authorization, idempotency, persisted Mock report |
| GET `/api/maya/reports` | Own history metadata and payment status, no paid report bodies |
| GET `/api/maya/reports/:id` | Owner plus current entitlement/order authorization and validated report schema |

Report POST takes `locale`, `product_code`, `profile_id`,
`relationship_profile_id` for relationship reports, `entitlement_id` and
`idempotency_key`. It rejects client KIN, `user_id`, `paid`, arbitrary order IDs
and unknown keys. Session, date, ownership, payment and database errors have
explicit status responses; logs contain only fixed event/error codes.

Mock generation requires both `ENV=dev` and `MAYA_AI_MODE=mock`. Mock
entitlements are rejected outside that mode. There is no HTTP endpoint for
granting test entitlements or simulating a successful payment.

## Bilingual frontend

- Public: `/maya-calendar`, `/en/maya-calendar`.
- Private suffixes in both languages: `/member`, `/results`, `/daily`,
  `/reports`, `/reports/:id`.
- Shared page includes the introduction, all 20 seals and 13 tones, existing
  locale-aware Google login entry, date forms, personal/partner KIN results,
  daily free guidance, future-premium entry, three plan displays, mock report
  generation/retry, report history/payment status and explicit own-data deletion.
- Plans are NT$199 personal gifts, NT$499 full blueprint and NT$699
  relationship. Real checkout is disabled.
- Language changes refetch localized member data. Opposite-language report
  access resolves an already-generated same-order language counterpart or
  returns an explicit error requesting that version, never mixed-language text.
- React renders report text without HTML injection. Public share text contains
  KIN/seal/tone and an introduction URL, never birth dates or member identifiers.
- In-flight profile/report actions are guarded against account/locale changes.
- Private views require auth at both frontend and backend; noindex is not
  treated as an authorization mechanism.
- Public introductions include localized titles/descriptions, canonical,
  hreflang, Open Graph, JSON-LD and sitemap entries. Member/report routes receive
  noindex metadata/headers and are excluded from sitemap.

GA4 is disabled for the page lifetime on entry to any Maya route, including
before SPA history mutation. Maya routes also skip first-party KPI and Meta
page-view hooks. This conservative privacy boundary avoids sending private
report URLs or accidental personal query data to analytics. A reload on a
non-Maya page restores existing GA4 behavior. The unrelated analytics consent
architecture was not replaced.

## AI mock contract and cost controls

The bilingual typed schema and validator are in [maya.ts](../app/src/lib/maya.ts).
The mock receives deterministic signatures rather than personal birth data.
Different products select 3 or 7 structured sections; relationship output
includes both deterministic signatures, not invented compatibility scores.

Validation rejects changed KIN/tone/seal data, wrong product/locale, HTML,
oversized/incomplete sections and Chinese text in English output.
Mock token and cost counters are zero and persisted; no key or paid-model
request is involved. Generation is limited to six claims per member/day,
20 calculations/hour and 120 API requests/hour. Completed idempotent replays
do not regenerate content or consume generation quota. Failed reports retain
retryable state; processing uses a two-minute lease and at most three attempts.
Production prompts/segmented paid generation remain a future, separately
authorized integration rather than a hidden fallback.

## Executed acceptance

| Check | Result |
| --- | --- |
| App TypeScript | PASS |
| Worker TypeScript | PASS |
| New Worker test TypeScript | PASS |
| App ESLint | PASS, zero errors; five pre-existing warnings |
| Worker ESLint | PASS |
| Dreamspell/Mock unit tests | PASS, 7 tests including all 260 KIN and both languages/all products |
| Worker/real local D1 tests | PASS, 12 tests |
| Repeatable local migration, FK/unique constraints, 520 content rows | PASS |
| Anonymous/tampered/expired/revoked sessions | PASS |
| Own-member profile/report isolation | PASS |
| Free member, fake paid flag, unknown callback, wrong product/amount, pending/failed payment | PASS: access denied |
| Expired/revoked/not-yet-active entitlement | PASS: access denied |
| Idempotency/concurrent claims/failed-generation retry | PASS |
| English report purity and language counterpart | PASS |
| Rate-limit concurrency, SQL injection rejection, no leaked internal errors | PASS |
| Actual bilingual page SSR/route manifest/safe login redirects | PASS |
| Existing auth return and payment-return checks | PASS |
| Existing GA4 regression/privacy checks | PASS, 26 funnel events preserved |
| Existing health, calculation-auth, Tarot subscription, ECPay recurring, Human Design report locale, Vedic locale tests | PASS |
| Frontend build and prerender SEO | PASS, 45 public routes; existing large-chunk warning |
| Hydration structure | PASS, 45 routes |
| Live Google credential/browser login/logout journey | NOT RUN |
| Browser-tool connection to local preview | FAIL: both 127.0.0.1 and localhost timed out, although the local HTTP probe returned 200 |
| Actual mobile/browser interaction and visual accessibility | NOT RUN: browser could not reach the local preview via either loopback address; HTTP probe succeeded |
| Maya signed ECPay callback / browser payment return | NOT RUN: deliberately not wired to live checkout |
| Paid AI / remote D1 / production deployment | NOT RUN, prohibited in this phase |
| Second independent complete Dreamspell reference lock | BLOCKED |

Dependency installation reported six existing Worker dependency advisories
(one low, five high). No unrelated `audit fix` or forced dependency upgrades
were performed; this is not a claim that an exploitability audit passed.

Reproduce from the repository root, without production operations:

```powershell
node app\node_modules\tsx\dist\cli.mjs d1\build-maya-content.ts
npm.cmd --prefix app run test:dreamspell
npm.cmd --prefix worker run test:maya
npm.cmd --prefix worker run typecheck:maya-tests
npm.cmd --prefix app run test:maya-routes
npm.cmd --prefix app run test:auth
npm.cmd --prefix app run test:payment-return
npm.cmd --prefix app run test:ga4
```

Run the existing local build task before route/sitemap/hydration checks. These
test commands do not create commits, deploy, or migrate remote D1.

## Remaining BLOCKED work / Phase 3 readiness

**Not ready for production authorization.**

1. Lock two independently reproducible reference sources/golden fixtures.
   Resolve full fifth-force oracle, castle symbolic mapping, the legacy
   13-versus-28-day moon-date output and Feb 29 birth-time/noon policy.
   The relevant API/report output remains disabled; Feb 29 calculation returns 422.
2. Verify real Google credentials, language-preserving browser return,
   session logout and mobile interactions in an accessible local/test browser.
3. Separately authorize sandbox ECPay integration: signed callbacks, exact
   amount/product verification, grant/revoke/refund behavior and bilingual
   returns. Do not reuse the existing admin instant-unlock shortcut for Maya.
   NT$199/499 reports do not unlock the future daily-premium product.
4. Authorize a production report design: localized reviewed prompts,
   segmented schema-validated generation, token/cost budgets and secret setup.
5. Review deployment configuration, database backup/migration order,
   consent/privacy/retention and dependency advisories before any deployment.

The temporary preview was stopped after testing. Work is left uncommitted,
awaiting user confirmation; no Phase 3 operation was performed.

## Changed file inventory

- [dreamspell.ts](../app/src/lib/dreamspell.ts), [dreamspell.test.ts](../app/src/lib/dreamspell.test.ts)
- [Shared Maya data/report contract](../app/src/lib/maya.ts)
- [MayaCalendarPage.tsx](../app/src/pages/MayaCalendarPage.tsx), [App.tsx](../app/src/App.tsx), [API client](../app/src/lib/api.ts)
- [Worker Maya service](../worker/src/maya.ts), [Worker router](../worker/src/index.ts), [Worker session helper](../worker/src/utils.ts)
- [Migration](../d1/migrations/025_maya_dreamspell.sql), [local fixtures](../d1/maya-local-fixtures.sql), [content generator](../d1/build-maya-content.ts), [content seed](../d1/maya-kin-content-seed.sql)
- [Worker tests](../worker/scripts/maya-phase2-check.ts), [test tsconfig](../worker/tsconfig.maya-tests.json), [bilingual route checks](../app/scripts/maya-route-check.ts)
- [SEO metadata](../app/src/components/SeoMetadata.tsx), [prerender](../app/scripts/prerender.mjs), [SEO routes](../app/seo/prerender-routes.mjs), [headers](../app/public/_headers), [robots](../app/public/robots.txt)
- [Analytics bootstrap](../app/index.html), [page tracking guard](../app/src/hooks/usePageViewTracking.ts), [GA4 checks](../app/scripts/ga4-event-check.ts)
- [App package](../app/package.json)/[lock](../app/package-lock.json), [Worker package](../worker/package.json)/[lock](../worker/package-lock.json)
- [Specification](dreamspell-spec.md), this delivery report
