import { mayaSignature, type MayaLocale } from './maya';
import { galacticToneVisual } from './mayaVisualization';

export const WAVESPELL_RULE_VERSION = 'dreamspell-wavespell-verified-v1';
export function calculateDreamspellWavespell(kin: number, locale: MayaLocale) {
  if (!Number.isInteger(kin) || kin < 1 || kin > 260) throw new Error('Wavespell requires KIN 1–260');
  const signature = mayaSignature(kin, locale);
  const number = signature.wavespell;
  const startKin = (number - 1) * 13 + 1;
  return {
    ruleVersion: WAVESPELL_RULE_VERSION, number, position: signature.tone_number, startKin, endKin: startKin + 12,
    stages: Array.from({ length: 13 }, (_, index) => {
      const data = mayaSignature(startKin + index, locale);
      return { kinNumber: data.kin_number, sealNumber: data.solar_seal_number, sealName: data.solar_seal,
        toneNumber: data.tone_number, toneName: data.galactic_tone,
        growthKeyword: galacticToneVisual(data.tone_number, locale).keywordLabel };
    }),
  };
}
export type DreamspellWavespell = ReturnType<typeof calculateDreamspellWavespell>;
