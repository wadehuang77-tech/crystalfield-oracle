import { mayaSignature, type MayaLocale, type MayaReport } from './maya';
import { validateLifeBlueprintV2, type LifeBlueprintV2 } from './mayaLifeBlueprint';
import type { VersionedLifeBlueprintReport } from './mayaLifeBlueprintStorage';

export type BlueprintDisplay =
  | { kind: 'empty' }
  | { kind: 'invalid' }
  | { kind: 'legacy'; report: MayaReport }
  | { kind: 'v2'; report: LifeBlueprintV2 };

// The caller supplies only reports returned by the existing authorized API.
// This adapter validates display compatibility; it never grants report access.
export function adaptLifeBlueprint(report: VersionedLifeBlueprintReport | null, locale: MayaLocale): BlueprintDisplay {
  if (!report) return { kind: 'empty' };
  if (report.locale !== locale) return { kind: 'invalid' };
  if ('reportVersion' in report) {
    if (!Number.isInteger(report.kinNumber) || report.kinNumber < 1 || report.kinNumber > 260) return { kind: 'invalid' };
    return validateLifeBlueprintV2(report, mayaSignature(report.kinNumber, locale), locale)
      ? { kind: 'v2', report } : { kind: 'invalid' };
  }
  if (report.product_code !== 'MAYA_FULL_499') return { kind: 'invalid' };
  return { kind: 'legacy', report };
}
