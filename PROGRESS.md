# Bilingual Rollout Progress

Last updated: 2026-10-02
Current branch at handoff: `main`

## Goal

Make crystalfield101.com available in Traditional Chinese and English while preserving existing Chinese URLs, prices, trial limits, membership entitlements, ECPay payments, Google sign-in, and access controls. Work in this handoff is local-only: do not deploy production or run a production database migration. Do not call paid AI translation/generation services for bulk translation.

## Completed

- Route locale detection, `/en` route variants, language switcher, document `lang`, shared header/footer, and translation dictionary scaffolding.
- English copy for the landing entry, Oracle directory flow and long page, privacy policy, Tarot entry and some result labels, and the main introductions/forms for Lightworker, Unicorn, Dragon, Egyptian, Osho, Work Your Light, Numerology, Human Design, and Vedic Astrology.
- Runtime English SEO metadata for selected service pages; untranslated article routes are `noindex`. `sitemap.xml` now has 42 URLs and 44 reciprocal language alternate links covering 11 English service routes. `prerender.mjs` generates English metadata and a minimal English heading/intro for those 11 routes.
- Locale is sent with deck preview/unlock requests. The card Worker reads `card_localizations` and `deck_localizations` from the separate cards D1. Missing English payloads no longer return Chinese card preview/gated text: previews are marked unavailable and unlock endpoints return `CARD_TRANSLATION_UNAVAILABLE`.
- Card Worker now accepts `locale=en` / `locale=zh-TW` alongside the existing `language` query/body parameter. The localization generator compares translations with the seeded inventory, rejects unknown card IDs, and prints every missing English card ID.
- Human Design paid English reports use an independent report version and request all sections in English. English requests do not receive the Chinese fixed fallback. HD full-section sharing reads the locale-specific report version, and core share summary labels have English variants.
- Vedic report requests carry locale; the existing order row stores locale-specific report/draft JSON. English headings, word-count validation, retry locale propagation, and explicit no-provider behavior are wired.
- Vedic English free-result UI now localizes the result heading, key chart badges, D1 chart labels, house labels, planet names, and Lahiri calculation note; the Chinese route remains unchanged.
- Vedic paid-report fixed UI, timeline/evidence labels, loading states, and review form now switch between Traditional Chinese and English; locale-specific report prose continues to come from the Worker report version.
- Human Design full-report loading/error states now switch between Traditional Chinese and English, while the report page keeps the locale-aware Worker report request.
- Human Design local free-report content now has an English generator for the eight free core sections and English locked-section titles; the Traditional Chinese generator remains unchanged.
- Human Design now has a separate English dataset and `/en` article selection for all 9 article slugs; the original Traditional Chinese article dataset remains unchanged.
- `/en` audit fixes now cover Human Design SEO/FAQ content and report-shell labels, plus Vedic paid-option cards, life-map cards, and public review headings; Chinese routes remain unchanged.
- Vedic Astrology now has a separate English dataset and `/en` article selection for all 10 article slugs; the original Traditional Chinese article dataset remains unchanged.
- Added an audit at `docs/i18n-translation-audit.md` and an additive cards-D1 migration at `d1/cards-migrations/001_card_localizations.sql`.

## Card Translation Progress

The actual seeded inventory was verified from `d1/cards-seed.sql` in an isolated local Wrangler D1 database:

| Deck ID | Chinese name | English name | Cards | English complete | Remaining |
| --- | --- | --- | ---: | ---: | ---: |
| `tarot` | 韋特塔羅 | Rider-Waite Tarot | 22 | 22 | 0 |
| `osho` | 奧修禪卡 | Osho Zen Tarot | 45 | 6 | 39 |
| `lightworker` | 光行者神諭卡 | Lightworker Oracle | 43 | 0 | 43 |
| `unicorns` | 獨角獸神諭卡 | Unicorn Oracle | 44 | 0 | 44 |
| `egyptian_gods` | 埃及神諭卡 | Egyptian Oracle | 36 | 0 | 36 |
| `work_your_light` | Work Your Light 神諭卡 | Work Your Light Oracle | 44 | 0 | 44 |
| `dragons` | 龍族神諭卡 | Dragon Oracle | 44 | 0 | 44 |
| **Total** |  |  | **278** | **28** | **250** |

- Total cards: 278
- English completed: 28
- Remaining: 250
- Current deck: `osho`
- Last completed: `osho:6`
- Next: `osho:7`
- Last verification time: 2026-10-02
- Validator: PASS
- TypeScript: PASS (frontend and Worker)
- Build: PASS (Vite and prerender; existing large-chunk warning)

Translated stable IDs: all 22 `tarot` cards, from `tarot:0-fool` through `tarot:21-world`, and `osho:1` through `osho:6`.

The full translations are in `d1/card-localizations-en.json`. `d1/build-card-localizations-seed.ts` validates source IDs, duplicates, empty strings, and required per-deck fields, then produces idempotent SQLite upserts at `d1/cards-localizations-seed.sql` and lists untranslated stable IDs. The remaining 250 complete payloads are not translated. Names in `name_secondary` are not counted as full card translations. The original TypeScript deck source paths referenced by `d1/build-cards-seed.ts` are absent from this workspace; the seeded SQL is the only available full Chinese source.

## Still Incomplete

- 250 card payloads, including complete previews, meanings, keywords, and deck-specific interpretation fields.
- Complete Oracle/Tarot spread/result/restore/error/paywall/share screens; only entry copy and selected result labels are localized.
- Numerology calculated reports, daily energy, forecast, crystal and oracle readings, AI advisor, checkout/unlock/share states.
- Human Design fixed knowledge, chart labels/free report, article content, checkout states, and public share-page content.
- Human Design paid-report prose fallback/content audit and checkout/share states.
- Vedic free chart result prose, paid report body content, and end-to-end English report generation.
- Human Design and Vedic article JSON datasets remain Traditional Chinese. Authentication, membership, checkout, emails, and other transactional screens need a full locale audit.
- English prerender currently contains only heading/intro content for the 11 listed routes; `prerender.mjs` and sitemap do not yet include English article pages.
- Full English search/content scan and end-to-end checks for every deck, spread, and paid report remain outstanding.

Do not describe the site as fully bilingual until these gaps are closed.

## Files Changed

- Root: `.gitignore`, `PROGRESS.md`
- App routing/shared UI: `app/src/App.tsx`, `app/src/components/LanguageSwitcher.tsx`, `app/src/components/PageHeader.tsx`, `app/src/components/SiteFooter.tsx`, `app/src/components/SeoMetadata.tsx`, `app/src/lib/i18n.ts`, `app/src/lib/api.ts`, `app/src/hooks/useDeck.ts`
- App pages: `app/src/pages/LandingPage.tsx`, `HomePage.tsx`, `PrivacyPage.tsx`, `TarotPage.tsx`, `LightworkerPage.tsx`, `UnicornsPage.tsx`, `DragonsPage.tsx`, `EgyptianGodsPage.tsx`, `WorkYourLightPage.tsx`, `OshoPage.tsx`, `NumerologyPage.tsx`, `HumanDesignPage.tsx`, `VedicAstrologyPage.tsx`, `app/src/pages/human-design/LandingPage.tsx`, `app/src/components/numerology/BirthDateForm.tsx`
- Static output: `app/public/sitemap.xml`, `app/scripts/prerender.mjs`
- Worker: `worker/src/cards.ts`, `humanDesign.ts`, `humanDesignReport.ts`, `humanDesignShareResults.ts`, `index.ts`, `vedicAstrology.ts`
- D1/localization: `d1/migrations/023_i18n_content.sql`, `d1/cards-migrations/001_card_localizations.sql`, `d1/card-localizations-en.json`, `d1/build-card-localizations-seed.ts`, `d1/cards-localizations-seed.sql`
- Docs: `docs/i18n-translation-audit.md`

No `.env`, API key, password, or credential file is intended for the commit. The isolated local Wrangler test database lives under ignored `worker/.wrangler-i18n-test/` and is not committed.

## Checks And Operations

- App TypeScript check: passed.
- Worker TypeScript check: passed.
- Card localization generator/validator: passed for 28 complete translations; verified all IDs against the 278-card seed, rejected unknown IDs, regenerated the SQL upserts, and listed the 250 remaining stable IDs.
- Frontend TypeScript check: passed.
- Worker TypeScript check: passed.
- Vite production build and prerender: passed; existing main bundle exceeds the 500 kB advisory threshold.
- Isolated local cards D1: base schema, 278-card seed, and localization migration executed successfully. Inventory query confirmed 278 rows, 278 unique IDs, zero blank required names/keys, and declared per-deck counts match actual counts.
- Local Worker API smoke test: the English Fool payload was returned in English; untranslated cards returned empty previews, `content_locale: "zh-Hant"`, and `translation_available: false`.
- Sitemap XML browser parse: valid; 42 URL entries and 44 hreflang alternate links.
- Vite build: `npm.cmd --prefix app run build` completed successfully with exit code `0`, including generated English prerender output. Existing Vite warning: the main JS chunk exceeds 500 kB.
- Production D1 migration: **not executed**.
- Production Worker deployment: completed for commit `53f7461`; frontend deployment is triggered by the `main` push workflow.
- Paid AI translation/report-generation calls: **none**.

## Next Steps

1. Translate `tarot:5-hierophant` and continue the remaining Tarot IDs in stable `card_key` order. Preserve all source fields and structure; regenerate `cards-localizations-seed.sql` after each reviewed batch and validate with the generator.
2. Add translations for the other six decks in seed order, keeping original IDs and Chinese rows unchanged.
3. Run the repeatable seed against a local/test cards D1, verify all 278 translated rows and field completeness, and smoke-test both preview and unlock APIs for translated and untranslated cards.
4. Continue route-by-route UI localization for all spread, report, auth, membership, checkout, sharing, and error states. Add missing English Human Design/Vedic article content.
5. Complete locale-aware report/share end-to-end checks, scan `/en` flows for residual Chinese, and align English prerender, canonical/hreflang, and sitemap with actually translated routes.
6. Apply the cards-D1 migration/seed separately only after review; it remains **not executed**. Continue `/en` browser-flow verification and review the frontend deployment result.
