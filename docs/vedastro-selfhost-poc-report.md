# VedAstro self-host PoC report

## A. Current architecture

See [vedastro-selfhost-audit.md](./vedastro-selfhost-audit.md). The Cloudflare Worker continues to use the official API, with no production integration or frontend change in this PoC.

The pre-existing Worker GET-path builder was not modified. A live API probe showed its current path shape is parsed as default time/location values; see the audit's request-path validation note. That caller needs a separate fix and revalidation.

## B. Proposed architecture

`local caller or test script -> ASP.NET Core PoC -> VedAstro.Library -> D1 or Dasha response`. Fixed coordinates and UTC offset are supplied directly; there is no geocoding, timezone lookup, OpenAI interpretation, or automatic fallback. Docker Compose binds the service to `127.0.0.1`. D9, D10, and full-chart routes return HTTP 501 until native official calculators are available.

## C. VedAstro source/library used

- Official repository: `VedAstro/VedAstro`, source pinned at `40763952742f76369a505d8db2e9e9fa67f75d78`.
- The official Library project declares package version `1.2.0`, targets .NET 7, and references `SwissEphNet` `2.8.0.2`. The published NuGet assembly was inspected and does not expose the `Calculate`/`VimshottariDasa` entry points required by the service, so the PoC builds against the pinned source in an ignored vendor directory or Docker build stage.
- The .NET 10 service builds against the .NET 7 Library. A tracked compatibility patch defers the Library's private `MemoryCache.EntriesCollection` reflection until its cache-persistence method is called; this PoC does not call that method. Build succeeds, with 205 Library/compiler/package warnings including NU1903 for `Microsoft.Extensions.Caching.Memory` 6.0.1.

## D. License findings

VedAstro declares MIT. Retain attribution and license text when redistributing. This MIT license does not automatically apply to third-party dependencies. See [vedastro-license.md](./vedastro-license.md).

## E. Docker architecture

Multi-stage .NET 10 ASP.NET Core image; no API key is baked into the image. Docker Compose publishes port 8080 on loopback only. Docker CLI is absent, so container build/start status: **NOT VERIFIED**.

## F–I. D1, D9, D10 and Dasha results

| Test | Result | Notes |
|---|---|---|
| D1 fixture calculation | PASS | Nine planet longitudes/signs/houses and Moon nakshatra/pada returned by pinned Library source. |
| D9 fixture calculation | NOT VERIFIED | No native Navamsa planet/house sign-map implementation exists in the pinned Library source; route returns HTTP 501. |
| D10 fixture calculation | NOT VERIFIED | No native Dasamsa planet/house sign-map implementation exists in the pinned Library source; route returns HTTP 501. |
| Current Vimshottari Maha/Antardasha | PASS locally; comparison FAIL | Native `Calculate.DasaAtRange` returned structured periods; current Lords do not match deployed official API. |
| Full chart | NOT VERIFIED | Route returns HTTP 501 because D9 and D10 are not implemented by the pinned Library source. |

## J. Official API vs self-host comparison

| Test | Official API | Self-host | Difference | Result |
|---|---|---|---|---|
| Ascendant longitude | 359.768333° | 359.768333° | 0° | PASS |
| Sun longitude | 140.521944° | 140.521944° | 0° | PASS |
| Moon longitude | 315.311111° | 315.311111° | 0° | PASS |
| Mars longitude | 116.939167° | 116.939167° | 0° | PASS |
| Mercury longitude | 163.527778° | 163.527778° | 0° | PASS |
| Jupiter longitude | 142.421111° | 142.421111° | 0° | PASS |
| Venus longitude | 161.774167° | 161.774167° | 0° | PASS |
| Saturn longitude | 1.355000° | 1.355000° | 0° | PASS |
| Rahu longitude | 347.363056° | 347.363056° | 0° | PASS |
| Ketu longitude | 167.363056° | 167.363056° | 0° | PASS |
| D9 signs | NOT VERIFIED | NOT VERIFIED | NOT VERIFIED | NOT VERIFIED |
| D10 signs | NOT VERIFIED | NOT VERIFIED | NOT VERIFIED | NOT VERIFIED |
| Mahadasha | Ketu | Mercury | — | FAIL |
| Antardasha | Venus | Saturn | — | FAIL |

The maximum D1 absolute longitude difference with exact coordinates is `0°`, within the `0.01°` threshold. The official GET response metadata echoed `20:00 06/09/1968 +08:00`, latitude `25.033`, longitude `121.5654`, and Ayanamsa enum `1` (`LAHIRI`). The Self-host request was the same fixed fixture and the adapter constructs `Time` directly from those fields.

The verified Dasha request metadata likewise echoed the exact birth `Time`, Taipei name, coordinates, `Ayanamsa=1`, plus `Levels=2` and `PrecisionHours=168`. At the captured range start `07/10/2026 13:00 +08:00`, Official returned Ketu/Venus (Maha end `26/01/2033 13:00 +08:00`; Antar end `22/09/2027 13:00 +08:00`). Self-host returned Mercury/Saturn (both periods started `07/10/2026 13:00 +08:00`; both ended `06/01/2027 13:00 +08:00`). Dasha acceptance is **FAIL**.

For the ordered divergence checks, Moon longitude (`315.311111°`), Moon constellation (`Satabhisha`), pada (`3`), timezone (`+08:00`), and Lahiri (`1`) match. The first observed divergence is the output of the Dasha period-generation call (`Calculate.DasaAtRange`) itself: its first Maha/Antar lords and boundaries differ for the verified input and request range. The Official API does not expose its internal starting balance, year-length setting, deployed Library revision, or engine revision in the response. Those internal causes are **NOT VERIFIED**; no particular one is inferred from the observed mismatch.

The current Worker-shaped GET path was replayed directly (without invoking its URL-builder function). Official response metadata was `00:00 01/01/2000 +08:00` at `Empty` location (longitude `101.0`, latitude `4.59`), with Sun `255.666111°`, Moon `189.395278°`, and Ascendant `146.299167°`. This confirms **CURRENT WORKER URL BUILDER BUG CONFIRMED**: the combined `dd-MM-yyyy` path component fails the official parser's separate `dd/MM/yyyy` components, and the library falls back to `Time.Empty`.

## K. Performance

Ten requests per implemented endpoint, against an already-running process (container/process startup excluded):

| Endpoint | Warm p50 | Warm p95 | Warm average | All-ten p50 |
|---|---:|---:|---:|---:|
| `/api/d1` | 13.94 ms | 16.67 ms | 12.55 ms | 13.94 ms |
| `/api/dasha` | 176.18 ms | 303.09 ms | 177.88 ms | 176.18 ms |

This does not measure complete-chart latency because D9/D10 remain unsupported.

## L. Risks

- **LEGAL REVIEW REQUIRED:** Swiss Ephemeris dual licensing; see [vedastro-license.md](./vedastro-license.md).
- .NET 7 Library source has 205 reported warnings, including a known high-severity advisory for `Microsoft.Extensions.Caching.Memory` 6.0.1. The local cache compatibility patch does not remediate dependency vulnerabilities.
- The D1 comparison passes, but the pinned source's `Calculate.DasaAtRange` lords and period boundaries differ from the deployed API's current output. The API's internal version and starting-balance/year convention are not exposed, so the code-level cause is NOT VERIFIED.
- The pre-existing Worker GET-path shape was echoed by the live API as default time/location input; do not rely on that working-tree caller until separately corrected and verified.
- Native D9/D10 calculators are absent in the pinned source and must not be replaced by the generic within-sign divisional-degree helper.
- The library's synchronous calls cannot be cancelled mid-calculation; a timed-out calculation may continue in its serialized worker.
- This unauthenticated PoC is for loopback/local testing only, not production exposure.
- An official API rate limit, unavailable API, or inconsistent result can prevent comparison; such an outcome is not a pass.

## M. Production migration recommendation

**NO-GO.** D9/D10 are unavailable, the measured Dasha Lords do not match the official API, the dependency graph raises a high-severity warning, and Swiss Ephemeris requires a licensing decision before public or commercial use. No production code was integrated, deployed, or committed.

## Test commands and current environment

- `node scripts/test-vedastro-comparison.mjs` tests comparison thresholds locally without contacting either engine.
- `node scripts/test-vedastro-selfhost.mjs` checks the running PoC endpoints against the fixed regression fixture.
- `node scripts/compare-vedastro-engines.mjs` performs the actual live comparison; it does not read or send an API key.
- `node scripts/benchmark-vedastro-selfhost.mjs` measures ten D1 and ten Dasha requests separately.
- .NET SDK 10.0.401 was installed only under `%TEMP%\crystalfield-dotnet-sdk-poc` for validation. Service build, local D1/Dasha endpoints, threshold tests, live official comparison, and implemented-endpoint benchmark were run. Docker CLI is absent, so container build/start remain **NOT VERIFIED**.
- No secret was read or displayed. The pre-existing modifications in `worker/src/vedicAstrology.ts` and `worker/scripts/vedic-astrology-check.ts` were left untouched. No commit was created because the core D9/D10 and Dasha acceptance checks did not pass.
