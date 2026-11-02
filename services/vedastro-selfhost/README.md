# VedAstro self-host PoC

This is an isolated calculation service. It does not replace the production Worker integration and does not call OpenAI, geocoding, or a timezone API.

## Local .NET build/run

From the repository root, fetch the pinned official source and run the service:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\fetch-vedastro-source.ps1
dotnet run --project services\vedastro-selfhost\VedAstro.SelfHost.csproj
```

The HTTP service listens on `http://127.0.0.1:8080` by default. `GET /health` does not need a request body.

## Docker Compose

From this directory:

```sh
docker compose up
```

The image build downloads the exact official VedAstro source commit pinned in `Dockerfile`, builds the library with the ASP.NET Core service, and exposes port 8080 on the local machine only. Check `http://127.0.0.1:8080/health`.

## Endpoints

Each POST endpoint accepts the same normalized input:

```json
{
  "date": "1968-09-06",
  "time": "20:00",
  "timezone": "+08:00",
  "latitude": 25.033,
  "longitude": 121.5654,
  "locationName": "Taipei, Taiwan",
  "ayanamsa": "Lahiri"
}
```

- `GET /health`
- `POST /api/d1`
- `POST /api/dasha`
- `POST /api/d9` — returns HTTP 501 until a native VedAstro D9 calculator is available.
- `POST /api/d10` — returns HTTP 501 until a native VedAstro D10 calculator is available.
- `POST /api/chart` — returns HTTP 501 because the complete chart requires both unsupported divisional charts.

Only Lahiri is accepted. The service validates input, limits request bodies to 8 KiB, limits calculation concurrency, and returns sanitized error responses. The fixed fixture is a regression-test input, not production user data.

## Validation scripts

With the service running, from the repository root:

```powershell
node scripts\test-vedastro-selfhost.mjs
node scripts\compare-vedastro-engines.mjs
node scripts\benchmark-vedastro-selfhost.mjs
```

The integration tests exercise D1 and Dasha and assert that unsupported chart endpoints return 501. The comparison script builds the official coordinate-based GET path independently of the Worker, validates Official response input metadata and the D1 match before making the Dasha request, and exits non-zero for the observed Dasha mismatch and unverified D9/D10 charts. The benchmark measures ten D1 and Dasha requests separately; it does not include process/container startup time.

## Source and licensing

The PoC uses the official source at commit `40763952742f76369a505d8db2e9e9fa67f75d78`. The published NuGet 1.2.0 assembly was inspected and does not expose the calculation entry points (`Calculate` / `VimshottariDasa`) needed here, so the source project is referenced directly. This source supports the tested D1 and Dasha methods, but does not expose native D9/D10 sign-map calculators; the generic divisional-degree helper is not treated as a complete chart implementation. The fetched local `vendor` directory is ignored by Git. Review [../../docs/vedastro-license.md](../../docs/vedastro-license.md) before distributing or exposing the service.
