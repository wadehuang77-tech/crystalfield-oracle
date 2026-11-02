# VedAstro self-host PoC: current integration audit

This audit records the existing Cloudflare Worker path from the working tree at the time of the PoC. The pre-existing modifications to `worker/src/vedicAstrology.ts` and `worker/scripts/vedic-astrology-check.ts` were left untouched.

## Current production path

1. `POST /api/vedic-astrology/charts` is routed by `worker/src/index.ts` to `createVedicChart` in `worker/src/vedicAstrology.ts`.
2. The Worker requires a signed-in session, limits chart creation to 12 requests per client IP per hour, reads the request body, and requires consent. Its public input currently contains birth date, local time, and a place name rather than fixed coordinates.
3. `resolveBirthLocation` in `worker/src/vedicGeocoding.ts` geocodes the place. The Worker uses `tz-lookup` to derive an IANA timezone and calculates the local UTC offset for the birth date/time; the production path therefore combines geocoding, timezone resolution, and astrology calculation.
4. The Worker creates VedAstro `Time` data in the form `StdTime: "HH:mm dd/MM/yyyy ±HH:mm"` with a `Location` object containing name, latitude and longitude.
5. Calculation uses the official API base `https://api.vedastro.org/api`. D1 calls are made to `AllPlanetLongitude`, `MoonConstellation` and `AllHouseLongitudes`. D9/D10 calls use `AllPlanetNavamshaSign`, `AllHouseNavamshaSign`, `AllPlanetDashamamshaSign` and `AllHouseDashamamshaSign`. Dasha uses `DasaAtRange` with two levels and a 168-hour precision setting.
6. All eight calls are started in parallel. The client applies a 12-second per-request timeout and retries HTTP 5xx failures up to three attempts with exponential delays. It classifies upstream auth/rate-limit/method/payload/response failures. The API key is optional to the client, but no secret value was read or displayed for this audit.
7. The request builder explicitly adds `Ayanamsa/LAHIRI` to GET calculation paths; POST payloads for divisional charts and Dasha specify `Ayanamsa: "LAHIRI"`.
8. `normalizeVedicChart` converts API payloads into the existing `VedicChartData`, verifies nine planets, D1 houses, D9/D10 sign maps and Dasha data, derives house placements, and rejects incomplete responses. The public chart omits internal longitude/divisional-only fields.
9. The Worker stores the normalized chart and free result in D1 and returns a chart token. Paid interpretation is a later flow: `generatePaidReportPart` calls the OpenAI Responses API. It is not part of this self-host PoC and was not called.

## Existing Worker GET-path validation note

The pre-existing `buildVedAstroGetTimePath` in [vedicAstrology.ts](../worker/src/vedicAstrology.ts) emits `Location/{latitude,longitude}` and a single `dd-MM-yyyy` path segment. The official API's `GeoLocation.FromUrl` and `Time.FromUrl` parser contract instead expects `Location/{name}/Time/{HH:mm}/{dd}/{MM}/{yyyy}/{offset}`. A direct request using the pre-existing shape was echoed by the live API with its default time and `GeoLocation.Empty`, rather than the supplied fixture. This PoC leaves the two pre-existing Worker files untouched; the current working-tree production caller must be corrected and separately revalidated before relying on those GET results.

## Official API and local PoC boundary

- The official repository describes a .NET library and an Azure Functions REST API. The checked official API project targets .NET 7 isolated Functions; its Dockerfile is an Azure Functions image, not an ASP.NET Core calculation service.
- The published NuGet 1.2.0 assembly was inspected during implementation and does not expose the official `Calculate` and `VimshottariDasa` calculation entry points needed by this PoC. The service therefore references the official library project source from pinned repository commit `40763952742f76369a505d8db2e9e9fa67f75d78`; the source is fetched into an ignored, PoC-only `vendor` directory for local builds and during the Docker build. It is not added to the Worker. This source builds as a .NET 7 library referenced by the .NET 10 service, but it does not implement the native D9/D10 sign-map methods listed by the official API.
- The official API has a reflection-based `Calculate/{method}` route. URL parameters are parsed into VedAstro library types, and an optional `Ayanamsa` URL segment sets `Calculate.Ayanamsa`.
- Official library `Time` input uses the same standard-time string and `GeoLocation(name, longitude, latitude)` constructor semantics. The PoC takes the simpler external schema in `scripts/test-vedastro-selfhost.mjs` and does not geocode or call a timezone service.
- The new service is isolated under `services/vedastro-selfhost`. No Worker, frontend route, production API binding, D1 schema/data, OpenAI call, payment flow, Google login, or Cloudflare secret was changed.
- The service currently has no production engine flag. The proposed future selection is `VEDIC_ENGINE=official` (current production default), `selfhost` (only after comparison and legal review), and optionally `auto` (self-host then official, followed by a controlled error). That selection must remain disabled until a separate migration change is approved.

## Main compatibility and operational risks

- The official library project targets .NET 7 and the PoC service targets .NET 10. Release build and local D1/Dasha fixture tests pass with the tracked cache-persistence compatibility patch; Docker validation remains unavailable in this environment.
- The adapter now calls the pinned library's `Calculate.DasaAtRange` with the same two levels and 168-hour precision as the official API request. The live fixture comparison still returns different current Maha/Antardasha lords, so this path is not equivalent to the deployed API.
- The stable source includes a generic `DivisionalLongitude` helper, but it returns a within-sign degree and does not provide the D9/D10 sign assignment. No native `AllPlanetNavamshaSign`, `AllHouseNavamshaSign`, `AllPlanetDashamamshaSign`, or `AllHouseDashamamshaSign` implementation exists in the pinned Library source. The PoC returns HTTP 501 for those charts rather than inventing a formula or treating that helper as equivalent.
- The official API and self-hosted library may differ by version, timezone parsing, ephemeris data/runtime, ayanamsa selection, house handling, or Dasha event generation. Only measured comparison results can justify migration.
- The calculator methods are synchronous and do not accept cancellation. The PoC limits concurrent calculations and request duration, but a timed-out library calculation may continue in its worker task until the underlying call returns.
- The Docker port is bound to loopback for local PoC use only. An internet-facing deployment would require a separate authentication, rate-limit, transport, monitoring, and data-protection design.
- No geocoder, timezone API, OpenAI service, Worker production endpoint, or production credential is used by this PoC.

## Sources

- [VedAstro source repository](https://github.com/VedAstro/VedAstro)
- [VedAstro Library project file](https://github.com/VedAstro/VedAstro/blob/40763952742f76369a505d8db2e9e9fa67f75d78/Library/Library.csproj)
- [VedAstro API project file](https://github.com/VedAstro/VedAstro/blob/40763952742f76369a505d8db2e9e9fa67f75d78/API/API.csproj)
- [VedAstro official API documentation](https://vedastro.github.io/)
- [VedAstro official API handler](https://github.com/VedAstro/VedAstro/blob/40763952742f76369a505d8db2e9e9fa67f75d78/API/FrontDesk/OpenAPI.cs)
- [VedAstro Time type](https://github.com/VedAstro/VedAstro/blob/40763952742f76369a505d8db2e9e9fa67f75d78/Library/Data/Time.cs)
