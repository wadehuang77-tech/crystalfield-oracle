# VedAstro and Swiss Ephemeris license review

**Status: LEGAL REVIEW REQUIRED before any public or commercial self-host deployment.**

## VedAstro

- The official repository's `LICENSE.md` is MIT. It permits use, modification, distribution and sale, subject to retaining the copyright and permission notice in copies or substantial portions of the software.
- The official repository's `Library/Library.csproj` identifies the NuGet package as `VedAstro.Library` version `1.2.0` and declares `PackageLicenseExpression` as `MIT`.
- The official project source references `SwissEphNet` version `2.8.0.2`. The source README credits SwissEphNet and Swiss Ephemeris as the astronomy calculation dependency.
- The MIT license on VedAstro does not change the licenses of SwissEphNet, Swiss Ephemeris, or any other third-party package. Each transitive dependency needs its own review before redistribution.

## Swiss Ephemeris / SwissEphNet

Astrodienst's official licensing information states that Swiss Ephemeris is offered under a dual licensing model:

1. GNU Affero General Public License (AGPL); or
2. Swiss Ephemeris Professional License, with a signed contract and purchase.

Astrodienst says the choice must be made before distributing software containing Swiss Ephemeris or activating a public service using it. Its AGPL option requires the whole software project to be under AGPL or a compatible license. A commercial/proprietary product needs its own assessment of the Professional License terms. SwissEphNet is a .NET port of the Swiss Ephemeris source and must not be presumed to remove the underlying licensing obligations.

**Do not treat a separate process, Docker container, API boundary, or microservice as a licensing workaround.** This document does not make a legal determination about the exact derivative-work scope, SaaS obligations, or commercial reporting use.

## Attribution and redistribution notes

- Retain the VedAstro MIT copyright and permission text when redistributing its code or substantial portions.
- Keep applicable Swiss Ephemeris copyright/license notices and follow the selected Swiss Ephemeris license contract.
- Astrodienst's licensing page restricts use of its/authors' names to promote products or services, subject to the specific notice/label exceptions it describes.
- Confirm that the VedAstro NuGet package, SwissEphNet package, runtime image, embedded ephemeris data, and all transitive dependencies may be redistributed in the intended Docker image.
- No API key or other application secret is required by the PoC image.

## Required decision before production

Obtain counsel's review of the AGPL consequences for CrystalField's source, Worker/API, user-facing SaaS and paid astrology reports, or confirm a suitable Professional License directly with Astrodienst. Record the licensing basis and verify its scope for the deployed project before enabling the self-host engine.

## Sources

- [VedAstro MIT license](https://github.com/VedAstro/VedAstro/blob/4d14da8ae07560d5a4d8ba95ea6f5f5cf997e298/LICENSE.md)
- [VedAstro Library package/dependency declaration](https://github.com/VedAstro/VedAstro/blob/4d14da8ae07560d5a4d8ba95ea6f5f5cf997e298/Library/Library.csproj)
- [Astrodienst Swiss Ephemeris licensing information](https://www.astro.com/swisseph/swephinfo_e.htm)
- [Swiss Ephemeris price and ordering information](https://www.astro.com/swisseph/swephprice_e.htm)
- [SwissEphNet source repository](https://github.com/ygrenier/SwissEphNet)
