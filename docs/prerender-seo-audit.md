# Prerender SEO architecture audit

## Snapshot

- Repository: `wadehuang77-tech/crystalfield-oracle`
- Branch: `main`
- HEAD at audit start: `6019f37b399bf5b104d32e99c5727eb631ca1fd0`
- Frontend root: `app/`
- Vite: `5.4.21`; React / React DOM: `18.3.1`; React Router DOM: `7.18.0`
- No prerender/SSG dependency is installed. The existing build used a Node script after `vite build`.
- Existing local Worker changes and VedAstro PoC files were present before this task and were left untouched.

## Before

- `app/src/App.tsx` uses `BrowserRouter`, a literal `routeConfig`, and client-side React routes. English routes are produced by mapping the Chinese route configuration through `getLocalizedPath`.
- `app/src/main.tsx` uses `createRoot`; it does not use `hydrateRoot`.
- `app/src/components/SeoMetadata.tsx` applies title, description, robots, canonical, language alternates, Open Graph and JSON-LD from `useEffect`. This metadata is not present in the initial HTML unless another build step writes it.
- `app/index.html` contains the shared app shell, the GA4 config with `send_page_view: false`, and Meta Pixel bootstrap.
- `app/scripts/prerender.mjs` already wrote manually composed SEO content into route-specific `dist/**/index.html` files after Vite build. The Chinese and English metadata lived in that script, not in a route manifest. `/` and `/en/` were not generated as SEO pages.
- `app/public/sitemap.xml` was maintained separately from the prerender route list.
- `app/public/robots.txt` has one sitemap declaration and allows the public app and assets; it disallows `/admin` and selected utility paths.
- `app/public/_redirects` rewrites all unmatched paths to `/index.html` with status 200. This preserves SPA navigation but gives unknown URLs a soft 404.
- Private routes are represented in `App.tsx` and marked `noindex, follow` by the client SEO component. They were not in the prerender list or sitemap.

## After

- `app/seo/prerender-routes.mjs` is the build-time route inventory. It contains the Chinese and English public landing routes and derives article paths from the existing Human Design and Vedic article data.
- The existing no-dependency static HTML generator consumes/checks that inventory, produces route HTML and writes `dist/sitemap.xml` from the same inventory. Build fails if its generated paths drift from the manifest.
- `app/package.json` runs the generated-HTML verifier as part of `npm run build`; `npm run seo:verify` can rerun verification against the current `dist`.
- The 43 generated routes comprise 31 Chinese URLs (home, 11 public landing pages, 19 articles) and 12 English URLs (home and 11 public landing pages).
- Bilingual routes emit reciprocal `zh-Hant` and `en` alternates plus an `x-default` pointing to the Chinese URL. Article pages without a paired English prerender do not claim an English alternate.
- The generated initial document contains route-specific title, description, robots, canonical, Open Graph/Twitter metadata, JSON-LD, one H1, main text and crawlable internal links. Private/utility paths are excluded from the manifest and sitemap.
- Dates and author/publisher properties were removed from the static article schema because the prerender input has no route-level publication-date/author data. Existing client SEO structured data still contains some author/date claims and should be verified against editorial records before relying on it.
- `app/public/_headers` adds Cloudflare Pages `X-Robots-Tag: noindex, nofollow` rules for admin, login, registration, auth, membership, checkout and payment utility URLs. The existing application metadata also marks its protected routes noindex.
- No new runtime framework or package was added. No Worker, API, authentication, payment or database implementation was changed.

## Important limitation: mounting is not hydration

The generated SEO content is inserted into `#root`, but `app/src/main.tsx` still calls `createRoot`. On JavaScript startup React replaces that static subtree with the client-rendered application; it does not hydrate the generated markup. The local browser smoke check showed the Vedic page subsequently rendering with one H1 and its chart form, and no hydration warning was observed, but that is not proof of hydration. This does not satisfy a requirement for actual React hydration and is a release blocker until the app is rendered from the same React tree and hydrated safely on prerendered routes.

## 404 and Cloudflare behavior

The local Vite production preview returned HTTP 200 for a nonexistent path. The current Cloudflare Pages catch-all rewrite also maps unknown paths to the SPA shell, so search engines can receive soft 404s. It was not changed because the same fallback currently supports valid client-only routes; replacing it without an explicit allowlist would risk authentication, payment-return and interactive routes. A follow-up should generate explicit SPA rewrites for valid non-prerendered routes and serve a real 404 response for the remainder.

Cloudflare Pages `_headers` rules are source configuration only. Their deployed response behavior cannot be confirmed without a Pages deployment, which was prohibited.

## Prerender side effects and analytics

The build generator reads local article JSON and writes static files only; it does not import or execute the application, call APIs, create orders, consume readings, write to D1, or send analytics. GA4 configuration disables automatic initial `page_view`; the existing route tracker deduplicates the current location key. The GA4 event test and the generated-output verifier passed. A local browser load attempted the existing `/api/track` call, but the cross-origin preflight was blocked; no successful production tracking request was observed.
