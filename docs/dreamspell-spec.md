# Dreamspell calculation specification (Phase 1)

## 1. Scope

This phase implements the deterministic Dreamspell calculation rules requested for the CrystalField Oracle project without invoking any paid AI calls or production migrations.

## 2. Functional baseline

- Base reference: `1987-07-26 = Kin 34`
- Rule: `KIN = positiveModulo(33 + D, 260) + 1`
- `D` is the day difference excluding February 29 from the count.
- The standard year boundary is `July 26` and the Day Out of Time is `July 25`.

## 3. Data structures

```ts
interface DreamspellResult {
  date: string;
  kin: number;
  tone: {
    number: number;
    nameEn: string;
    nameZh: string;
  };
  solarTotem: {
    number: number;
    nameEn: string;
    nameZh: string;
  };
  wave: {
    number: number;
    nameEn: string;
    nameZh: string;
  };
  castle: {
    number: number;
    nameEn: string;
    nameZh: string;
  };
  moonCalendar: {
    lunarDay: number;
    isDayOutOfTime: boolean;
    isNewYear: boolean;
    isLeapDay: boolean;
  };
  calculation: {
    epoch: string;
    dayDifferenceExcludingLeapDays: number;
    formula: string;
  };
}
```

## 4. Reference validation and Phase 2 correction

The epoch and day-difference formula above are the requested project baseline.
Passing arithmetic tests is not proof of independent historical/source verification.
The earlier note naming Space Station Plaza and LifeMoment did not include
reproducible URLs or a complete golden reference table, and must not be treated
as two-source verification of every calculation rule.

The [Foundation for the Law of Time tutorial](https://lawoftime.org/thirteenmoon/tutorial.html)
was retrieved during Phase 2. It confirms a 13-by-28-day calendar, July 26 as
the new year, and the first five signatures beginning with Red Magnetic Dragon,
White Lunar Wind, Blue Electric Night, Yellow Self-existing Seed and Red
Overtone Serpent. It also identifies the final seals as Red Earth, White Mirror,
Blue Storm and Yellow Sun.

This exposed errors in the earlier engine's solar-seal numbering/order and
tone 5 name. Phase 2 corrected those tables and the solar-seal index to
`positiveModulo(kin - 1, 20) + 1`, while preserving the epoch, KIN formula and
date-difference algorithm. KIN 34 remains White Galactic Wizard, with seal
number 14, not seal number 1. Tone 5 is Overtone.

Attempts to retrieve [13moon.com FAQ](https://www.13moon.com/faq.htm) and
[the staging decoder](https://staging.lawoftime.org/decode/) returned generic
testimonial/donation text rather than reproducible complete rules. The second
independent reference lock is **BLOCKED**, not PASS. Do not present search
summaries as independently verified source tables.

## 5. Open questions for Phase 2

- Exact canonical naming of the 20 Solar Totems and 20 Waves from the authoritative reference set needs a final source lock.
- Exact symbolic mapping for the 5 Castle and 5 Guiding Wisdom pairs may vary by source edition.
- Final AI interpretation schema should be aligned with the reporting and SEO requirements for the front-end app.

Phase 2 status:

- Fifth-force oracle and the legacy guiding-archetype mapping are not exposed
  by the Maya API or reports.
- Castle/wavespell numbers are exposed; unverified symbolic interpretation is disabled.
- The legacy `moonCalendar.lunarDay` uses a 13-day remainder and is not a valid
  28-day moon-date implementation. It is not exposed by the Phase 2 API.
- February 29 birth signatures are rejected with 422 pending an agreed
  birth-time/noon policy and complete reference verification. The original
  deterministic leap-day regression remains tested, but is not an authorized
  February 29 birthday result.
- API inputs must be valid date-only strings between 1900-01-01 and today.
  Daily boundaries use Asia/Taipei (UTC+08:00), not the browser timezone.
- July 25/26 calendar markers are available without speculative interpretation.
- API/report `calculation_version` is `dreamspell-2026.2`.
- See [Phase 2 delivery and acceptance](dreamspell-phase2.md) and the
  [Phase 2.5 acceptance](dreamspell-phase-2-5-acceptance.md).

### Phase 2.5 external evidence update (2026-10-10)

The earlier second-source blocker is resolved **for ordinary date signatures**:
the original Law of Time decoder and the independently implemented Galactic
Ark calculator were replayed without project code, using 301 fictional dates.
Both external outputs agree with each other on all 301 dates. The existing
engine agrees on all 296 non-February-29 dates, covering all 260 KIN, 20 seals,
13 tones and 20 wavespells. LifeMoment additionally publishes the numeric
five-castle/52-KIN grouping. See the acceptance report for source URLs,
implementation independence, hashes, factual fixtures and date cases.

The five February 29 examples disagree with the legacy engine by one KIN.
The Law of Time calculator returns February 28's signature although its
explanatory note distinguishes before/after noon; Galactic Ark also returns
February 28's signature, while LifeMoment labels it 0.0 Hunab Ku. The exact
birthday/noon policy is **BLOCKED**. Do not change the preserved engine or
remove the API's 422 gate on the basis of calculator agreement alone.
Oracle, castle symbolism and legacy moon-date output remain disabled.

## 6. Implementation note

All calculations are deterministic and free of AI inference. They are implemented in `app/src/lib/dreamspell.ts` and verified with `app/src/lib/dreamspell.test.ts`.
