# GA4 SPA page-view verification

Verified on 2026-10-08. Scope: analytics initialization and duplicate GA4
page views only. No production deployment or remote Google configuration change.

## Identified sources

Repository audit covered `gtag`, `dataLayer`, `page_view`, `send_page_view`,
Measurement IDs, Google tag loading, analytics utilities, router/location
listeners, and history operations.

| Source | Behavior before this fix |
|---|---|
| `app/index.html` | Loads `G-FY6V8NJNHW` once; configures it once with `send_page_view: false`. |
| `app/src/App.tsx` / `app/src/hooks/usePageViewTracking.ts` | One RouterBody tracking hook manually emits GA4 `page_view` on the initial render and pathname/search changes. Its ref guard already prevents effect duplicates. |
| Downloaded Google tag for the same Measurement ID | `__ccd_em_page_view` has `vtp_historyEvents: true`, listens for `gtm.historyChange-v2`, and emits a second page view after history navigation. |
| `app/src/lib/tracking.ts` / `app/src/hooks/useConversionTracking.ts` | Separate first-party KPI/conversion API events, not GA4 collection requests. Worker source has no Google collection forwarding. |
| `app/src/lib/ga4.ts`, promo/share components | Other named GA4 funnel, conversion, reminder, and share events; no second manual GA4 page-view emitter. |
| React root, SEO metadata, layout, locale and scroll listeners | No additional GA4 initialization or page-view emitter. |

### Browser isolation evidence on unchanged production

The initialization config appeared once. A real React Link navigation from `/`
to `/oracle` produced:

1. Sequence 2: manual Router event, collection `dp=/oracle`.
2. Sequence 3: Enhanced Measurement event, same collection page location,
   without the manual `dp` parameter.

Then `history.pushState` to `/numerology`, without dispatching a React Router
update, produced sequence 4 through Enhanced Measurement alone. The displayed
H1 remained the oracle H1 and the manual dataLayer page-view paths remained
`/` and `/oracle`. This isolates the automatic history source from the React
listener. The tag's history event source was `pushState`.

**Root cause:** manual Router tracking and enabled Enhanced Measurement history
tracking both own SPA page views. `send_page_view: false` suppressed the config
page view, but did not suppress the enabled history listener. This is not a
second hook mount, repeated config call, or prerender/hydration duplicate.

## Minimal fix

- Google tag / Enhanced Measurement is the single GA4 page-view strategy.
- Enable the config page view for initial non-admin visits.
- Preserve the previous initial admin exclusion for `/admin`, `/en/admin`,
  and their children.
- Remove only the hook's manual GA4 page-view block. Preserve first-party KPI,
  Meta Pixel, route deduplication and admin guards.
- Keep Measurement ID `G-FY6V8NJNHW` unchanged.
- Retain all unrelated GA4 event helpers.
- Update analytics-specific verifier assertions and add isolated initialization
  checks for both languages, utility routes and admin exclusions.

The existing remote Enhanced Measurement history setting must remain enabled;
turning it off would stop SPA page views under this strategy. No remote setting
was edited. Automatic history tracking of admin navigation already existed;
this fix does not introduce a new history listener or change its remote policy.

HTML scripts do not execute during SSR/prerender. Initialization unit checks run
in a sandbox without loading Google's script or sending analytics.

## New preview evidence

Preview: <https://ba2eda00.bolt-tarot-5ek.pages.dev>

Project: `bolt-tarot`; branch: `analytics-ga4-preview-20261008`; environment:
`preview`. The preview was uploaded from the verified working tree based on
SEO commit `88c6d592b6d0375649dcff311c991fe59144a3dd`, before the separate local
analytics commit. Its upload metadata marks the tree dirty; it is not a claim
that the SEO commit includes this fix.

Collection instrumentation wrapped browser `fetch` and `sendBeacon`, parsed
actual outgoing `/collect` URLs and batch bodies, and forwarded calls to the
original transports. It recorded only event name, route path and sequence.
It did not replace Google's script or synthesize collection events.

| Route step | Chinese cumulative page views | English cumulative page views |
|---|---|---|
| `/`, `/en/` | 1 | 1 |
| `/oracle`, `/en/oracle` | 2 | 2 |
| `/numerology`, `/en/numerology` | 3 | 3 |
| `/human-design`, `/en/human-design` | 4 | 4 |
| `/vedic-astrology`, `/en/vedic-astrology` | 5 | 5 |

The first two transitions used existing React Links. The remaining transitions
used History API changes with `popstate` to update the actual React Router.
Document identity remained unchanged at every step, ruling out hard loads.
Each destination rendered one H1 and one JSON-LD block. The manual GA4
dataLayer page-view count was zero.

Also verified:

- All ten listed routes independently hard-loaded: exactly one collection
  page view each.
- Back, forward, and a search/query navigation: one additional page view each.
- Ten direct loads: zero hydration warnings/errors, original parser-created
  H1 node preserved, one H1 and one JSON-LD block.
- Both numerology forms rendered nonempty content and interactive controls;
  no blank screen.
- 43/43 raw SEO routes, sitemap, robots, hreflang, canonical redirects: PASS.
- Four unknown-route real HTTP 404 checks: PASS.
- Six login/admin/payment-return HTTP routes: 200, no external redirect.
- Browser login forms and localized unauthenticated admin guards: PASS.
- Chinese/English payment-return `orderId=TEST123` remained in the browser URL.
  Existing localized missing-order handling rendered; this did not create an
  order. Raw HTTP checks also preserved existing `order_id`/`order_token`/
  `return_to` query parameters.

The integrated browser aborts Google collection delivery (`net::ERR_ABORTED`).
Outgoing network-call counts are verified, not just dataLayer entries;
successful ingestion into GA4 reports is **NOT VERIFIED**. Preview API CORS
remains intentionally blocked. No security settings were weakened, and no
paid checkout or authenticated backend E2E was performed in this round.

## Regression commands

All passed:

```text
npm.cmd --prefix app run typecheck
npm.cmd --prefix app run build
npm.cmd --prefix app run test:hydration
npm.cmd --prefix app run test:auth
npm.cmd --prefix app run test:payment-return
npm.cmd --prefix app run test:ga4
npm.cmd --prefix app run test:tarot-deep-analysis
npm.cmd --prefix app run lint
npm.cmd --prefix app run seo:http:verify -- https://ba2eda00.bolt-tarot-5ek.pages.dev --allow-preview-noindex
```

Build includes the 43-route prerender/SEO verifier. Existing bundle-size and
three lint warnings remain; there are no lint errors.

## Protected production state

Cloudflare project readback confirmed canonical production deployment remains
`a2b1474a-40f8-47c1-8aad-56e83f345e51`, production branch remains `main`, and
custom domains are unchanged. No rollback, production upload, push, Worker
deployment, secret/configuration change, direct D1 modification, payment change,
card-record edit, translation edit, or prerender architecture change occurred.
Existing VedAstro working-tree changes and the prior uncommitted SEO report
remain outside the analytics commit.

Recommendation: **GO for the analytics fix verified in preview**. Production
rollout requires separate authorization; accepted production is unchanged.
