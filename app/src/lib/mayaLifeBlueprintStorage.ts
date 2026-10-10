import { validateMayaReport, type MayaLocale, type MayaReport, type MayaSignature } from './maya';
import { blueprintEvidence, LIFE_BLUEPRINT_VERSION, validateLifeBlueprintV2, type LifeBlueprintV2 } from './mayaLifeBlueprint';

export type VersionedLifeBlueprintReport = MayaReport | LifeBlueprintV2;

export function readVersionedLifeBlueprint(json: string, signature: MayaSignature, locale: MayaLocale, legacyExpected: MayaReport): VersionedLifeBlueprintReport {
  const value: unknown = JSON.parse(json);
  if (value && typeof value === 'object' && 'reportVersion' in value) {
    if (value.reportVersion !== LIFE_BLUEPRINT_VERSION || !validateLifeBlueprintV2(value, signature, locale)) {
      throw new Error('Invalid or unsupported life blueprint version');
    }
    return value;
  }
  if (legacyExpected.product_code !== 'MAYA_FULL_499' || legacyExpected.locale !== locale
    || JSON.stringify(blueprintEvidence(legacyExpected.signature, locale)) !== JSON.stringify(blueprintEvidence(signature, locale))
    || !validateMayaReport(value, legacyExpected)) {
    throw new Error('Invalid legacy life blueprint');
  }
  return value;
}

export function serializeLifeBlueprint(report: LifeBlueprintV2, signature: MayaSignature): string {
  if (!validateLifeBlueprintV2(report, signature, report.locale)) throw new Error('Invalid life blueprint content');
  return JSON.stringify(report);
}
