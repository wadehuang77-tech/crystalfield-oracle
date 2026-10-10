import { positiveModulo } from './dreamspell';
import { mayaSignature, type MayaLocale } from './maya';

export const ORACLE_RULE_VERSION = 'dreamspell-oracle-verified-v1';
export const ORACLE_POSITIONS = ['destiny', 'guide', 'analog', 'antipode', 'occult'] as const;
export type OraclePosition = typeof ORACLE_POSITIONS[number];
export interface OracleKin { kinNumber: number; sealNumber: number; sealName: string; toneNumber: number; toneName: string }
export interface DreamspellOracle {
  ruleVersion: typeof ORACLE_RULE_VERSION;
  positions: Record<OraclePosition, OracleKin>;
}
const canonicalKins = Array.from({ length: 260 }, (_, index) => mayaSignature(index + 1, 'en'));
function findKin(seal: number, tone: number): number {
  const kin = canonicalKins.find(item => item.solar_seal_number === seal && item.tone_number === tone);
  if (!kin) throw new Error('No canonical oracle KIN for seal and tone');
  return kin.kin_number;
}
function payload(kin: number, locale: MayaLocale): OracleKin {
  const data = mayaSignature(kin, locale);
  return { kinNumber: kin, sealNumber: data.solar_seal_number, sealName: data.solar_seal, toneNumber: data.tone_number, toneName: data.galactic_tone };
}
export function calculateDreamspellOracle(kin: number, locale: MayaLocale): DreamspellOracle {
  if (!Number.isInteger(kin) || kin < 1 || kin > 260) throw new Error('Oracle requires KIN 1–260');
  const destiny = mayaSignature(kin, locale);
  const seal = destiny.solar_seal_number;
  const tone = destiny.tone_number;
  // Law of Time tutorial: tone groups 1/6/11, 2/7/12, 3/8/13, 4/9, 5/10.
  const guideOffset = [0, 12, 4, -4, 8][(tone - 1) % 5];
  const guideSeal = positiveModulo(seal - 1 + guideOffset, 20) + 1;
  const analogSeal = positiveModulo(18 - seal, 20) + 1;
  const antipodeSeal = positiveModulo(seal - 1 + 10, 20) + 1;
  return { ruleVersion: ORACLE_RULE_VERSION, positions: {
    destiny: payload(kin, locale),
    guide: payload(findKin(guideSeal, tone), locale),
    analog: payload(findKin(analogSeal, tone), locale),
    antipode: payload(findKin(antipodeSeal, tone), locale),
    occult: payload(261 - kin, locale),
  } };
}
