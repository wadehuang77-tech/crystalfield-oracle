# Progressive Vedic reports: implementation and local verification

## Authorization boundary

The initial implementation was local-only. The subsequently authorized production
rollout is recorded below. No database migration, new production chart, paid AI
report, fake order, paid-flag modification, order rebinding, or entitlement bypass
was used. Existing unrelated VedAstro and documentation WIP remains preserved.

The production calculation layer is unchanged: Prokerala, six astrology requests,
430 credits per new chart, and no VedAstro fallback. Neither report generation nor
saved-report reopening adds a Prokerala request.

## Delivery architecture

1. The existing chart endpoint calculates and saves the chart independently of AI.
2. Its additive presentation whitelist exposes stored Ascendant longitude,
   Moon Nakshatra/Pada, D1 positions/houses, D9/D10 positions, and current Dasha.
   It does not calculate new positions or expose raw upstream responses.
3. The existing paid-report POST continues to validate the order token, paid
   product and chart association. Complete reports additionally require the
   existing authenticated owner/admin authorization.
4. A deterministic Workflow instance generates the existing nine sections using
   at most three concurrent AI calls **per instance**.
5. Each AI result is validated and checkpointed before an independent atomic D1
   save. Other sections do not have to finish first.
6. Authorized GET polling reads saved sections without triggering AI.
7. Reload restores the saved language slot. Existing completed sections are
   retained during retries, poll errors, and same-report refreshes.

The existing prompt, section headings, evidence construction, forecast logic,
length thresholds, duplicate detection and final validator are retained.
Non-complete legacy products retain their existing generation path. The separate
admin smoke helper is not the new paid-report Workflow path.

### Binding and entrypoint

```toml
main = "src/entry.ts"

[[workflows]]
name = "vedic-report-generation"
binding = "VEDIC_REPORT_WORKFLOW"
class_name = "VedicReportWorkflow"
```

The thin entry module exports the existing HTTP Worker and the Workflow class.
This keeps existing Node-based HTTP regression tests independent of the
`cloudflare:workers` runtime module.

Workflow parameters contain only report/chart/order identifiers, language,
deterministic job ID, and an optional explicit retry section index. Credentials,
browser sessions, authorization headers and payment tokens are not parameters.
The entrypoint obtains the existing OpenAI binding from its runtime environment.

### Idempotency and persistence

- Initial ID: `vedic-{reportId}-{language}`.
- Explicit section retry ID: `vedic-{reportId}-{language}-retry-{1..9}`.
- `Workflow.createBatch` skips already-existing instance IDs.
- D1 launch markers prevent reopening completed reports from recreating an
  instance after Cloudflare's completed-instance retention expires.
- A failed resource launch keeps a recoverable launch marker. An authorized
  start POST resumes the **same** deterministic ID, not another report.
- Section writes use `json_set` on one language and one section, conditional on
  the owning job ID and generating status.
- Retry reservations and final assembly use a language-slot CAS. Other language
  updates cannot invalidate that CAS or be overwritten.
- CAS compares SQLite's raw JSON snapshot, not a JS reserialization. Local D1
  demonstrated that bound numbers can become `1.0`; reserializing them as `1`
  would cause a false conflict.
- Final assembly runs after the lanes finish. Immediate GET progress counts are
  derived directly from persisted section states.
- No new tables, columns, or schema migrations are required.

Normal double clicks, duplicate POSTs, reloads and checkpoint replay are tested
not to duplicate generation. This is **not** a claim of exactly-once external
OpenAI billing across an infrastructure crash between an upstream response and
its durable checkpoint. Cloudflare checkpoints cannot make an external API
transaction atomic with D1.

### Retry ownership and bounds

The single-call section helper does not retry. Workflow owns at most one retry
for a transient error. AI steps have native retries disabled; DB-only steps may
retry twice without rerunning a checkpointed AI result.

- Normal successful report: 9 AI requests.
- Initial generation ceiling: 18 attempts.
- Permanent request/authentication/schema/validation errors: no automatic retry.
- Network errors, timeout, HTTP 429 and 5xx: one controlled retry.
- Retry-After is honored with a durable sleep; a delay over 60 seconds is not
  retried within that section cycle.
- Explicit retry is allowed only for a failed section in a terminal report.
  Pending, generating and completed sections cannot be retried.
- Each section permits one explicit manual cycle, also at most two attempts.
  The aggregate nominal ceiling including all nine manual retries is 36.
- A manual cycle runs only its selected section, not the entire report.
- Retry reservation is deduplicated and rate-limited to nine requests per
  report/language/hour using the existing limiter.

The three-lane limit is per Workflow instance, not an account-wide cap across
different users or simultaneous localized reports.

### APIs and privacy

- Existing start: `POST /api/vedic-astrology/reports`.
- Read-only lookup: `GET /api/vedic-astrology/reports/status?order_id=...&language=...`.
- Read-only status: `GET /api/vedic-astrology/reports/{id}/status?language=...`.
- Explicit retry: `POST /api/vedic-astrology/reports/{id}/sections/{1..9}/retry`,
  body `{ "language": "zh-Hant" }` or `{ "language": "en" }`.

GET URLs contain no order token. Session, paid order, chart association, and
owner/admin checks precede content access. Status responses whitelist completed
prose/timeline and safe metadata; internal evidence, prompts, credentials,
raw OpenAI errors and stacks are excluded. The existing completed POST report
shape is retained for older clients, alongside the additive progressive shape.

The frontend uses three-second foreground polling and twelve-second background
polling, never overlapping requests. Terminal states stop polling; effect cleanup
aborts requests and clears timers. Account, chart and locale changes isolate
display state, and late retry responses cannot replace another context's report.
Completed reports retain the existing review form.

## Cloudflare capability, limits and pricing

Checked against official references:

- [Pricing](https://developers.cloudflare.com/workflows/reference/pricing/)
  (updated September 21, 2026).
- [Limits](https://developers.cloudflare.com/workflows/reference/limits/).
- [Workers API / createBatch](https://developers.cloudflare.com/workflows/build/workers-api/).

Wrangler 4.105.0 supports the configuration. `wrangler deploy --dry-run` passes
without creating a remote resource. The authenticated Workflow inventory command
succeeds, establishing read access. **Resource creation permission and the
account's actual Workers billing plan were NOT VERIFIED** during local preparation.
During the authorized rollout, the user confirmed Workers Paid/Standard in the
Dashboard and the Workflow creation request succeeded. The subscriptions API
returned 403, so the plan confirmation is user-supplied, not an API billing
verification. Prokerala Ruby is not a Cloudflare Workers subscription.

Workflows are included in Workers Free and Paid, but are not cost-free without
limits. Steps/storage billing started August 10, 2026.

| Dimension | Workers Free | Workers Paid |
| --- | --- | --- |
| Requests | 100,000/day shared with Workers | 10 million/month included; then $0.30/million |
| CPU | 10 ms/invocation | 30 million ms/month included; then $0.02/million ms |
| Storage | 1 GB-month | 1 GB-month included; then $0.20/GB-month |
| Steps | 3,000/day | 500,000/month included; then $0.80/100,000 |
| Active compute limit | 10 ms | 30 seconds default, configurable to five minutes |
| Step wall-clock duration | Unlimited | Unlimited |
| Non-stream step result / input | 1 MiB | 1 MiB |
| Instance state | 100 MB | 1 GB |
| Steps/instance | 1,024 | 10,000 default |
| Concurrent instances | 100 | 50,000 |
| Completed-state retention | 3 days | 30 days |

Network waits and sleeps do not consume active CPU. A 90–180 second network-heavy
report is supported by the wall-clock model, but JSON validation and serialization
consume CPU. Confirm an appropriate Workers plan before production deployment;
do not assume the Free CPU budget is adequate.

The normal implementation uses approximately 30 durable steps: authorization,
attempt baseline, nine claim/AI/persist triplets, and final validation. One
transient retry for every section raises this to approximately 66 steps including
cooldowns. These are design counts, not measured production billing.

## Local verification

All new AI responses and failures were synthetic. D1 atomic tests used real local
SQLite through Miniflare; they did not write the production databases.
The Workflow integration test used the actual local workerd Workflow class,
binding, durable steps and idempotent `createBatch`, not only a step mock.

| Required cases | Evidence / result |
| --- | --- |
| 1–3 unpaid, paid, duplicate POST | PASS: unpaid creates zero jobs; repeated paid starts create one ID |
| 4 chart before AI completion | PASS: independent chart serializer and UI core render while report is partial |
| 5–9 immediate section, 1/9, 3/9, 9/9, persisted count | PASS: local D1 reads and frozen final validator |
| 10–11 A/B/C and different orders | PASS: concurrent saves and all six explicitly sequenced completion orders preserve all three |
| 12–13 language writes | PASS: independent zh-Hant/en content survives both directions |
| 14–17 reload, no new job, completed zero AI, saved chart zero Prokerala | PASS: D1 lookup/checkpoint tests and synthetic browser request counters |
| 18–20 partial failure, bounded transient retry, permanent no retry | PASS: one or two calls as appropriate; saved content retained |
| 21–22 selected retry and duplicate retry | PASS: one selected section; duplicate returns conflict without a second cycle |
| 23–27 authentication, ownership, guessed ID, redaction | PASS: denied requests and safe status/error contracts |
| 28–29 chart/progressive rendering | PASS: component SSR and local browser fixture |
| 30–31 terminal/unmount polling | PASS: injected timers, no overlap, terminal stop, abort, late-response suppression |
| 32–34 mobile, ZH, EN | PASS: 390×844 local browser, three visible saved sections, no horizontal page overflow |

Browser fixture reload and language navigation made zero report POSTs and zero
chart POSTs; only mocked status GETs were used. These fixtures are not real chart
or real AI performance measurements.

Tests are in:

- [Worker atomic/API/orchestration tests](../worker/scripts/vedic-progress-check.ts).
- [Actual local Workflow runtime tests](../worker/scripts/vedic-workflow-runtime-check.ts).
- [Frontend component/polling/timing tests](../app/scripts/vedic-progress-check.ts).

### Regressions

PASS:

- Worker typecheck, lint, health, calculation authorization, Prokerala offline
  contracts, existing Vedic/report quality tests, and new progressive/runtime tests.
- Tarot subscriptions/quota/deep analysis, ECPay recurring and payment return,
  Oracle quota, member metadata/admin/registration checks, Human Design locale.
- All 278 existing English card previews.
- Frontend typecheck, lint of the changed frontend files, build, 43 prerender
  routes, existing hydration-structure checks, bilingual auth, and 26 GA4 events.

Numerology is covered by the unchanged code and bilingual build/prerender/form
checks; no new dedicated numerology calculation test is claimed.

The browser preview reports React hydration warning #418. An isolated build of
unchanged `HEAD` reproduced the same warning, so it is not introduced by this
progressive change. Structural hydration regressions pass; a warning-free
runtime hydration result is **not** claimed. No unrelated SEO/hydration code
was changed to hide the warning.

The existing frontend bundle-size warning also remains.

### Timing

Safe T1 logging measures submit to chart visibility. The chart-visible timestamp
is retained with the user-scoped saved chart for payment-return navigation.
T2/T3/T4 use the first, fifth and ninth persisted section `generatedAt` timestamps,
not an invented percentage or poll-arrival timestamp. Per-section metadata/logs
include attempts and AI latency, without prompts, birth data, credentials or full
report content.

Real T1/T2/T3/T4 values are **NOT MEASURED** in this local-only round. Timestamp
arithmetic and threshold behavior are unit-tested with synthetic values.

## Changed implementation files

Worker:

- [entry.ts](../worker/src/entry.ts)
- [index.ts](../worker/src/index.ts)
- [utils.ts](../worker/src/utils.ts)
- [vedicAstrology.ts](../worker/src/vedicAstrology.ts)
- [vedicReportJobs.ts](../worker/src/vedicReportJobs.ts)
- [vedicReportStore.ts](../worker/src/vedicReportStore.ts)
- [vedicReportWorkflow.ts](../worker/src/vedicReportWorkflow.ts)
- [vedicReportWorkflowRunner.ts](../worker/src/vedicReportWorkflowRunner.ts)
- [wrangler.toml](../worker/wrangler.toml)
- [package.json](../worker/package.json)
- [vedic-astrology-check.ts](../worker/scripts/vedic-astrology-check.ts)
- [vedic-progress-check.ts](../worker/scripts/vedic-progress-check.ts)
- [vedic-workflow-runtime-check.ts](../worker/scripts/vedic-workflow-runtime-check.ts)

Frontend:

- [VedicAstrologyPage.tsx](../app/src/pages/VedicAstrologyPage.tsx)
- [VedicReportProgress.tsx](../app/src/components/VedicReportProgress.tsx)
- [api.ts](../app/src/lib/api.ts)
- [vedicReportPolling.ts](../app/src/lib/vedicReportPolling.ts)
- [vedic-progress-check.ts](../app/scripts/vedic-progress-check.ts)
- [package.json](../app/package.json)

Documentation: this implementation report.

Existing VedAstro URL WIP in the shared Worker source/test files is not part of
this implementation. Existing SEO/GA4 documentation and unrelated untracked
files must not be included in a future commit.

Frozen SHA-256 values remain:

- Prokerala transport:
  `B848F4A7B629E183E9EBAFF05EA81F288F85B011C141E8B6CEE2207DB2FE7C85`.
- Prokerala Vedic adapter:
  `D7365D0904E73C9C14C2997E4BD713A58E89C12E04CAB2AB86242CCF7FADFF21`.

## Rollout procedure

The user separately authorized resource registration, Worker deployment, Pages
deployment after Worker gates, and a dedicated commit/main push after verification.
Paid production E2E is explicitly deferred, not a deployment failure.

1. Confirm Workers plan/CPU budget and Workflow creation permission. Record
   current active Worker version and Pages deployment as rollback baselines.
2. Re-run the local validations and narrowly review all staged hunks, excluding
   unrelated WIP. Do not blindly stage the shared VedAstro files.
3. Review the existing production bindings and run:

   ```powershell
   Set-Location C:\Users\wadeh\Downloads\crystalfield-oracle\worker
   npx.cmd wrangler deployments list
   npx.cmd wrangler workflows list
   npx.cmd wrangler deploy --dry-run
   ```

4. **Only after authorization**, this standard deployment registers the Workflow
   class, creates/updates `vedic-report-generation`, attaches
   `VEDIC_REPORT_WORKFLOW`, and updates `bolt-tarot-api`:

   ```powershell
   npx.cmd wrangler deploy
   ```

   No separate guessed Workflow creation command, secret rotation, D1 migration,
   Queue or application Durable Object is required.

5. The new progressive frontend requires a Pages release, also separately
   authorized. Build and deploy the existing project:

   ```powershell
   Set-Location C:\Users\wadeh\Downloads\crystalfield-oracle\app
   npm.cmd run build
   Set-Location C:\Users\wadeh\Downloads\crystalfield-oracle\worker
   npx.cmd wrangler pages deploy ..\app\dist --project-name bolt-tarot --branch main
   ```

6. Validate one authorized report using an already-saved chart, partial reload,
   a failed-section retry if appropriate, and actual T1–T4/section metrics.
   Do not create an unnecessary second Prokerala chart.
7. Roll back the Worker if the report pipeline has a critical failure. Preserve
   already-saved sections; do not fall back to VedAstro or change the DB schema.
8. A separately authorized main push triggers the existing CI deployment of
   **both Worker and Pages**. Choose a deliberate rollout path rather than
   unintentionally deploying twice.

## Authorized production rollout — October 8, 2026

### Revised production gate

There is no legitimate paid entitlement for the saved Prokerala chart
`2927fcf0-1b08-46e5-9d54-7a0170cf74d4`. The user authorized deployment without
paid AI E2E and explicitly prohibited fake payment, paid-flag changes, old-order
rebinding, and new payment/test bypasses. None were performed.

- **Paid production E2E: DEFERRED — awaiting the first legitimate paid order.**
- Other-user live authorization testing is deferred with user approval because
  all shared sessions are the same existing administrator. Existing admin access
  is not equivalent to a denied non-admin session. Local/workerd other-user
  denial tests remain PASS.
- Live saved-session chart/report UI testing is deferred with user approval
  because no shared browser has the original saved chart/token session. Production
  authorized report API evidence and same-build local UI evidence are used
  instead. No fake chart token or new calculation was introduced.

### Rollback baselines and direct deployment

| Item | Baseline | Direct authorized rollout |
| --- | --- | --- |
| Worker version | `9475d457-3494-4a80-9a55-4666146f1a59` | `344319d7-cde0-4594-9818-2816382cec62`, 100% |
| Pages deployment | `1ca48e78-eba2-46f8-8f51-320619c3d7dd` | `93127a89-af78-4d67-b3f5-0472b41da38f`, success |
| Git HEAD before commit | `5dc757bc9c4429678c04d5eb038cb4dca7aeca01` | Dedicated progressive commit follows verification |

An isolated deployment snapshot excluded all unrelated WIP, including VedAstro
URL changes in the shared source/test files. The exact snapshot passed Worker
typecheck/lint/health/Prokerala/Vedic/progressive/workerd tests and frontend
typecheck/progressive/build/hydration/auth/payment/GA4 checks before deployment.

Workflow registration used the official
`PUT /accounts/{account_id}/workflows/vedic-report-generation` with
`script_name=bolt-tarot-api` and `class_name=VedicReportWorkflow`.
HTTP 200 confirmed creation permission before updating live Worker traffic.
Resource ID: `b6148b04-d76b-4df5-b37b-aa1f1be4e284`.
Worker deployment used `wrangler deploy --keep-vars`. Its active-version metadata
contains the `VEDIC_REPORT_WORKFLOW` binding. No instance was triggered to test
binding availability.

Pages deployed only after Worker/auth/unpaid/legacy-report gates passed.
The direct Pages deployment served `index-DhClF6B1.js`.
The dedicated main push will cause CI to deploy the same committed scope again;
final deployment IDs must be checked from the completed CI run, not assumed to
equal these direct-deployment IDs.

### Production verification results before commit

| Gate | Evidence |
| --- | --- |
| Worker health | HTTP 200, minimal `{"ok":true}` |
| Existing auth/admin session | HTTP 200; authenticated existing administrator |
| Existing payment catalogue/order | HTTP 200; catalogue contains 18 products; existing order is paid |
| Existing Vedic chart authorization | Unauthenticated chart POST denied HTTP 401, without calculation |
| New status authorization | No session: HTTP 401 `AUTH_REQUIRED` |
| New retry authorization | No session: HTTP 401 `AUTH_REQUIRED`, no retry/job |
| Unpaid saved chart report start | HTTP 400 under the existing missing-order-authorization contract |
| Unpaid lookup | HTTP 403 `REPORT_ACCESS_DENIED` |
| Unpaid DB relationship | Read-only query: zero paid entitlements and zero reports for the chart |
| Workflow inventory after tests | All instance counters zero; no queued/running/completed/failed instance |
| Existing completed legacy report | HTTP 200, `completed`, 9/9, all nine consultation contents present |
| Legacy completed reopen | GET remains 9/9; no Workflow created |
| ZH/EN public production UI | Correct headings/forms; no fake progressive section state without a report |
| Mobile | Configured 390×844 viewport; no horizontal page overflow |
| Regression routes | Tarot/Numerology/Human Design/Vedic/ZH/EN/Login/checkout-return return HTTP 200 |
| SEO/GA4 | Prerender H1/form structure as appropriate; GA4 script present and `gtag` loaded |
| Prokerala calculation | Frozen file hashes unchanged; six requests / 430 credits remain |
| Credentials exposed | No credential/token values in test outputs |

The unpaid start intentionally supplied no order authorization: the saved chart
has no order token and the existing API rejects it before AI/provider calls.
This proves that contract rejection, not a valid unpaid-order-token scenario.
Local tests additionally cover a real pending-order entitlement denial.
No production payment credential was fabricated for stronger coverage.

These requests did not start a Workflow, call OpenAI, or call Prokerala. This is
established by rejection/read-only code paths and the zero-instance inventory,
not by claiming provider-wide billing telemetry. VedAstro production paths were
not restored; calls from this rollout are zero.

No rollback was required. Hydration #418 remains PRE-EXISTING / OUT OF SCOPE.
No real AI latency/T1–T4 production measurements are claimed.

### First legitimate paid order: observation-only follow-up

Do not create or rerun a report for this checklist. When the first ordinary
legitimate new Vedic paid order runs, observe its existing execution:

1. Verify paid entitlement and exactly one deterministic Workflow instance.
2. Observe persisted/displayed progress from 1/9 to 9/9, with at most three AI
   requests concurrently and nine normal calls.
3. Record safe section latency/attempts and actual T1–T4 timestamps.
4. Confirm no additional Prokerala calculation during report generation.
5. Observe one normal partial reload using the same report/job without duplication.
6. Verify completed reopen makes zero new Workflow/OpenAI/Prokerala calls.
7. Any manual retry must be an explicit user action for one terminal failed section;
   each such operation has at most two attempts. The initial automatic generation
   budget is 9 normal / 18 worst case, never 36.
8. Do not fabricate errors, restart the report, or repeat the user's AI execution
   solely for verification.
