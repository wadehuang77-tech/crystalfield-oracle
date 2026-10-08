# Prokerala production adapter

## Rollout status: ACTIVE (Ruby)

On 2026-10-08, the Ruby-plan rollout deployed Worker
`7e81b2d2-485f-444f-95fa-8fe3bbec93ba` and confirmed it active at 100%.
Rollback target remains `d9d046ab-40fb-41b5-890f-51ee2e866ab2`.
Pages remains `100b4856-15c7-4a5c-a24f-c6957c72898f`; no Pages deployment.

The single production chart succeeded with HTTP 201:
`2927fcf0-1b08-46e5-9d54-7a0170cf74d4`. Birth input was exactly
`1968-09-06T20:00:00+08:00`, `25.0330,121.5654`, `Asia/Taipei`, Lahiri.
Ascendant Pisces; Moon Aquarius, Shatabhisha pada 3; current dasha
Mercury/Saturn. D9 and D10 supplied ten structured positions each, including
their ascendants. All six astrology requests returned 200; no retries, 429,
5xx, SVG, or VedAstro calls occurred in the migration path.

| Request | Latency (ms) |
| --- | ---: |
| OAuth | 438 |
| planet-position | 193 |
| birth-details | 175 |
| lagna divisional positions | 180 |
| navamsa divisional positions | 166 |
| dasamsa divisional positions | 169 |
| dasha-periods | 573 |
| Total calculation, including OAuth | 1894 |

Official request mapping totals 430 credits. Actual account-balance debit was
not independently inspected. Browser round-trip including persistence was
2944 ms, distinct from calculation latency.

One admin-only execution of the existing complete AI builder succeeded:
9 sections, 8 forecast periods, 130328 ms, zero additional astrology requests.
The unchanged production report validator passed. Its separate heuristic
wording audit returned advisory findings (for example executable-solution and
talent-shadow phrases); this is not a clean heuristic audit. No validator was
weakened and no second report was generated.
The test report was not persisted or linked to a payment order.

Both production-language pages restored this same real chart through the
existing session-storage path, rendered the expected localized sign/dasha
labels, and made zero chart requests or direct Prokerala requests. This checks
bilingual presentation and the shared calculation contract, not a second
English AI report or paid checkout.

All existing offline Worker suites, Worker typecheck/lint, frontend
typecheck/build, 43-route prerender/hydration, GA4, auth, payment-return,
Tarot, and HD locale checks passed. No live retired-provider smoke was run.

## Previous Free-plan attempt: ROLLED BACK

On 2026-10-08, the tested migration was deployed as Worker version
`29972847-fc51-4e47-b7cf-fd3b27811f30`. The one authorized production chart
returned HTTP 429, `PROKERALA_RATE_LIMITED`, with a 60-second retry hint.
Request ID: `c3ffd6d2-75c1-4840-bd66-8a630db9da23`.
Browser request latency was 2,364 ms; this is not a successful full-chart
calculation latency. The failing response did not expose per-endpoint timings
or request count, so the exact endpoint, consumed requests, and charged credits
are NOT VERIFIED. No chart was returned or persisted.

The Worker was immediately rolled back to
`d9d046ab-40fb-41b5-890f-51ee2e866ab2`, confirmed active at 100% with healthy
`/api/health`. No chart retry, extra verification chart, or AI report was called.
Pages remained `100b4856-15c7-4a5c-a24f-c6957c72898f`. No migration commit or
GitHub push was made because the production gate failed.

Offline Worker typecheck/lint/contracts/report/auth/quota/payment/HD checks,
the local 278-card regression, frontend typecheck/build, GA4, 43-route
prerender/hydration, auth, payment-return, and Tarot checks passed. The local
278-card Miniflare check passed on retry after an initial socket closure.
The existing HTTP verifier is preview-only; it passed against the approved
preview, not the production custom domain.

That rollback was superseded by the successful Ruby rollout above.

## Ruby-plan retry rollout

The user confirmed the Ruby upgrade and again approved the sixth lagna request
after the static request-count review. Normal successful charts still cost
430 credits for six astrology requests, not 380 for five. No new verification
flow or SVG request is added.

Production scheduling remains serial (concurrency one). Across the entire
chart, at most one 429 request may be retried. A supplied `Retry-After` is
respected only if it is at most ten seconds and leaves a full 25-second
upstream request allowance inside the 60-second OAuth-plus-calculation budget.
Unknown or longer cooldowns immediately return `PROKERALA_RATE_LIMITED`.
A retry that returns 429 also fails explicitly; no provider fallback.
Verification/diagnostic runs remain non-retrying. Public request counts include
any attempted retry, not just successful endpoints. Credits are estimates;
upstream billing for failed attempts is not asserted.

The prepared production Vedic path uses Prokerala, with no VedAstro fallback.
VedAstro helpers remain reference code and are covered by offline contract tests.
Current transits are unavailable in this migration: reports receive `null`, not
an extra request to the retired provider.

## Request contract

OAuth uses `POST https://api.prokerala.com/token`, form-encoded with
`URLSearchParams`, and client credentials exclusively in the body. Runtime
bindings supply the credentials; responses and logs never include credentials,
authorization headers, tokens, or raw OAuth responses. Successful tokens are
reused until their expiry margin. Basic authentication exists only in the
protected, explicit OAuth diagnostic, not as a production fallback.

All astrology requests use `ayanamsa=1` (Lahiri) and `language=en`.
The birth datetime includes its date-specific timezone offset.

| Official GET endpoint | Extra parameters | Credits |
| --- | --- | ---: |
| `/v2/astrology/planet-position` | IDs 0-6, 100-102 | 30 |
| `/v2/astrology/birth-details` | None | 50 |
| `/v2/astrology/divisional-planet-position` | `chart_type=lagna` | 50 |
| `/v2/astrology/divisional-planet-position` | `chart_type=navamsa` | 50 |
| `/v2/astrology/divisional-planet-position` | `chart_type=dasamsa` | 50 |
| `/v2/astrology/dasha-periods` | `year_length=1` | 200 |

The sixth, explicitly approved lagna request supplies real D1 house placements.
`planet-position.position` is not a house number. Total: six astrology requests,
430 credits per new chart, plus one OAuth request on a cold token cache. OAuth
is not counted as astrology credits. No SVG requests; only the bounded
production 429 retry described above.
Free-plan theoretical capacity is 11 charts per 5,000 credits; Ruby is 232 per
100,000 credits. Request-rate limits can further restrict capacity.

## Normalization and compatibility

Stored charts identify `provider=prokerala`, `ayanamsa=lahiri`, and include
whitelisted structured D1, D9, D10, ascendants, Moon nakshatra/pada, and dasha
balance/periods. D1 houses are cross-checked against planet signs/longitudes.
No cusp angles, divisional retrograde, or missing pada values are invented.
The AI receives structured positions alongside existing report-compatible
maps. It interprets these facts and must not calculate missing chart fields.

The public API retains legacy `chart.ayanamsa=LAHIRI` and
`calculation.ayanamsa=Lahiri`; `calculation.provider` identifies Prokerala.
Optional numeric `latitude` and `longitude` allow exact coordinates; both must
be finite and in range. Without them, existing geocoding is unchanged.
Astronomical inputs do not depend on report/UI language.

## Operations and checks

Upstream failures are explicit safe errors, not fabricated charts. Failed charts
are not persisted. The existing chart/report tables and payment rules are
unchanged; there is no schema migration.

The admin verification, OAuth diagnosis, and `/api/admin/prokerala/report-smoke`
require the existing admin session, exact Origin, a runtime enable flag, and
a native Cloudflare limiter. The report smoke reads a saved Prokerala chart,
uses the existing complete report builder, and does not create orders, charge
payments, or persist test reports. It permits one attempted report per isolate;
this is not a globally distributed once-only guarantee. Operators must invoke
it once, not retry. Production smoke operations are separate from synthetic
offline tests.

Reopening a saved paid report reads its stored report/chart. If interpretation
must be regenerated or translated, it uses the saved chart, not six new
astrology calls. Submitting the birth form again creates a new chart and does
consume credits. No cross-chart birth-input cache is added in this phase.

Deploy only the Worker, retaining runtime variables/secrets. Pages needs no
deployment for the frontend provider type-only update. Capture the active Worker
version immediately before deployment and roll back that Worker alone if the
single production chart or complete AI report fails.

Source: [official OpenAPI](https://api.prokerala.com/spec/astrology.v2.yaml).
