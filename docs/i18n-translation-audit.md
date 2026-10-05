# Bilingual Translation Audit

Last reviewed: 2026-10-05

This document records implemented locale plumbing separately from translated content. A page or data set is not marked translated merely because it has an `/en` route.

## Verified Card Inventory

The `d1/cards-seed.sql` data was loaded with the existing card schema and the new localization migration into an isolated local Wrangler D1 store at `worker/.wrangler-i18n-test`. No remote database was contacted.

| Deck ID | Declared | Seeded | Unique card keys | Fully localized English cards |
| --- | ---: | ---: | ---: | ---: |
| `tarot` | 22 | 22 | 22 | 22 |
| `osho` | 45 | 45 | 45 | 45 |
| `lightworker` | 43 | 43 | 43 | 43 |
| `unicorns` | 44 | 44 | 44 | 44 |
| `egyptian_gods` | 36 | 36 | 36 | 36 |
| `work_your_light` | 44 | 44 | 44 | 44 |
| `dragons` | 44 | 44 | 44 | 44 |
| **Total** | **278** | **278** | **278** | **278** |

All 278 full English card payloads across seven decks are present in `d1/card-localizations-en.json`; `d1/build-card-localizations-seed.ts` validates the translations and emits idempotent SQLite upserts in `d1/cards-localizations-seed.sql`. The seed includes seven English deck names. Apply `d1/cards-migrations/001_card_localizations.sql` and then `d1/cards-localizations-seed.sql` to the separate cards D1 for production English previews and unlocks. Until those are applied remotely, English card previews may be empty and unlock requests may return `CARD_TRANSLATION_UNAVAILABLE`.

The original TypeScript deck source paths referenced by `d1/build-cards-seed.ts` are not present in this workspace. `d1/cards-seed.sql` is the only available source of the full Chinese card payloads.

## Page Coverage

| Area | Current status | Remaining work |
| --- | --- | --- |
| Shared route language detection, switcher, header, footer | Implemented | Audit every edge route and redirect with query strings. |
| Landing page `/en` | English entry copy exists | Verify all lower-page sections and SEO/prerender output. |
| Oracle directory `/en/oracle` | Main reading flow, deck directory, FAQs, and links translated | Expand browser interaction checks and verify the expanded question form and all status combinations. |
| Privacy `/en/privacy` | Full English policy copy added | Legal review of the English translation. |
| Rider-Waite `/en/tarot` | Entry, spread chooser, and selected result labels translated | Full single/three/Celtic Cross/past-life UI, position copy, unlock/payment states, and all 22 card payloads. |
| Lightworker, Unicorn, Dragon, Egyptian, Osho, Work Your Light | Main service introductions and some spread controls translated | Draw/restore/error/paywall screens, complete spread pages, deck libraries, sharing, and all card payloads. |
| Cosmic Cross, Tarot Single, Lightworker Celtic Cross, Work Your Light Single, Osho Single/Three | English routes exist | Most user-visible copy and result UI remains Traditional Chinese. |
| Numerology | Birth-date form, entry copy, explanatory SEO article, FAQ, and tabs translated | Calculated report, crystal recommendations, daily energy, forecast, oracle reading, AI advisor, unlock/checkout modals, and share output remain largely Chinese. |
| Human Design | Birth form, progress screen, and entry copy translated. English report version is separated from the Chinese cache; English generation requests all sections and refuses Chinese fallback when the provider is unavailable. Share section reads use the locale-specific report version; core share labels/summaries are translated. | Fixed knowledge, chart labels, free report, article pages, checkout/result states, public share-page locale flow, and authorized English report generation need testing. No paid report generation call was made. |
| Vedic Astrology | Birth form, top-level intro, disclaimer, and English generation prompt added. Order cache stores per-locale reports/drafts. Section headings, word-count checks, retries, and no-Chinese-fallback behavior use the locale. | Free chart labels/results, paid report UI/review copy, timeline evidence labels, article pages, and authorized end-to-end English generation need testing. No paid report generation call was made. |
| Human Design articles | English routes exist | `articles.json` and article UI are Traditional Chinese only. |
| Vedic Astrology articles | English routes exist | `articles.json` and article UI are Traditional Chinese only. |
| Authentication, membership, checkout, share pages, other public UI | English route variants exist | Most screens, errors, emails, share pages, and transactional states remain untranslated. |

## SEO And Static Output

- Runtime `SeoMetadata` has English title/description entries for the main public service routes; routes without English SEO metadata are `noindex` and do not emit language alternates.
- `app/public/sitemap.xml` lists 42 URLs and 44 reciprocal `xhtml:link` language alternates covering 11 public English routes. Chinese-only article routes are not paired.
- `app/scripts/prerender.mjs` emits English title, description, canonical, hreflang, Open Graph, `lang="en"`, structured data, and heading/intro HTML for those 11 routes. Article translations and article-specific English SEO metadata remain missing.
- The actual article translations and article-specific English metadata are missing.

## Validation Record

- Local Wrangler D1 cards schema: applied successfully to isolated local persistence.
- Existing cards seed: loaded successfully; all declared counts and unique `card_key` counts matched (278 total).
- `001_card_localizations.sql`: applied twice to the isolated local database; both runs succeeded, confirming idempotent table creation.
- `cards-localizations-seed.sql`: generated from all 278 English translations; upserts remain idempotent.
- Inventory query: 278 rows, 278 distinct IDs, no blank card keys/names, declared and actual deck counts match; English payload coverage is 278/278.
- Worker API test: `npm run test:english-card-previews` seeds an isolated D1 from repository data and verifies that all 278 English cards expose 30% excerpts without login while withholding full gated content.
- Frontend TypeScript check: passed.
- Worker TypeScript check: passed.
- Vite production build/prerender: completed successfully; latest output reported `✓ built in 15.96s` and generated `app/dist/en/oracle/index.html`. The terminal wrapper did not reliably expose an npm process exit marker. Existing >500 kB chunk warning remains.
- No live D1 migration or production deployment was run; the remote cards D1 could not be queried in the current Cloudflare CLI session due to account authorization.

## Translation Completion Gate

Do not call the site fully bilingual until each user-visible route and state has been reviewed in English, all 278 card localizations are applied to production and verified there, both article collections have English copy, numerology/Human Design/Vedic results have locale-correct source and cache behavior, English share/report flows are checked, and the prerendered HTML plus sitemap contain matching canonical and language alternates.
