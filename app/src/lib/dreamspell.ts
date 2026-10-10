export const DREAMSPELL_EPOCH = Object.freeze({
  iso: '1987-07-26',
  utc: '1987-07-26T00:00:00Z',
} as const);

export const DREAMSPELL_KIN_COUNT = 260;
export const DREAMSPELL_TONE_COUNT = 13;
export const DREAMSPELL_SOLAR_TOTEM_COUNT = 20;
export const DREAMSPELL_WAVE_COUNT = 20;
export const DREAMSPELL_CASTLE_COUNT = 5;

export interface DreamspellToneInfo {
  number: number;
  nameEn: string;
  nameZh: string;
  color: string;
  keyword: string;
}

export interface DreamspellTotemInfo {
  number: number;
  nameEn: string;
  nameZh: string;
  keyword: string;
}

export interface DreamspellWaveInfo {
  number: number;
  nameEn: string;
  nameZh: string;
}

export interface DreamspellCastleInfo {
  number: number;
  nameEn: string;
  nameZh: string;
}

export interface DreamspellGuidingArchetypeInfo {
  key: string;
  nameEn: string;
  nameZh: string;
  description: string;
}

export interface DreamspellMoonInfo {
  lunarDay: number;
  isDayOutOfTime: boolean;
  isNewYear: boolean;
  isLeapDay: boolean;
  yearAnchor: string;
}

export interface DreamspellCalculation {
  epoch: string;
  dayDifferenceExcludingLeapDays: number;
  formula: string;
}

export interface DreamspellDateInput {
  year: number;
  month: number;
  day: number;
  timezoneOffsetMinutes?: number;
}

export interface DreamspellResult {
  date: string;
  kin: number;
  tone: DreamspellToneInfo;
  solarTotem: DreamspellTotemInfo;
  wave: DreamspellWaveInfo;
  castle: DreamspellCastleInfo;
  guidingArchetype: DreamspellGuidingArchetypeInfo;
  moonCalendar: DreamspellMoonInfo;
  calculation: DreamspellCalculation;
}

export const DREAMSPELL_TONES: DreamspellToneInfo[] = [
  { number: 1, nameEn: 'Magnetic', nameZh: '磁性', color: 'Red', keyword: 'Initiation' },
  { number: 2, nameEn: 'Lunar', nameZh: '月亮', color: 'White', keyword: 'Flow' },
  { number: 3, nameEn: 'Electric', nameZh: '電性', color: 'Blue', keyword: 'Spark' },
  { number: 4, nameEn: 'Self-Existing', nameZh: '自存', color: 'Yellow', keyword: 'Stability' },
  { number: 5, nameEn: 'Overtone', nameZh: '超頻', color: 'No Color', keyword: 'Balance' },
  { number: 6, nameEn: 'Rhythmic', nameZh: '節奏', color: 'White', keyword: 'Movement' },
  { number: 7, nameEn: 'Resonant', nameZh: '共振', color: 'Blue', keyword: 'Alignment' },
  { number: 8, nameEn: 'Galactic', nameZh: '銀河', color: 'Yellow', keyword: 'Expansion' },
  { number: 9, nameEn: 'Solar', nameZh: '太陽', color: 'Red', keyword: 'Illumination' },
  { number: 10, nameEn: 'Planetary', nameZh: '行星', color: 'White', keyword: 'Structure' },
  { number: 11, nameEn: 'Spectral', nameZh: '光譜', color: 'Blue', keyword: 'Synchronicity' },
  { number: 12, nameEn: 'Crystal', nameZh: '水晶', color: 'Yellow', keyword: 'Clarity' },
  { number: 13, nameEn: 'Cosmic', nameZh: '宇宙', color: 'White', keyword: 'Completion' },
];

export const DREAMSPELL_SOLAR_TOTEMS: DreamspellTotemInfo[] = [
  { number: 1, nameEn: 'Red Dragon', nameZh: '紅色龍', keyword: 'Nurture' },
  { number: 2, nameEn: 'White Wind', nameZh: '白色風', keyword: 'Spirit' },
  { number: 3, nameEn: 'Blue Night', nameZh: '藍色夜', keyword: 'Dreaming' },
  { number: 4, nameEn: 'Yellow Seed', nameZh: '黃色種子', keyword: 'Awareness' },
  { number: 5, nameEn: 'Red Serpent', nameZh: '紅色蛇', keyword: 'Life Force' },
  { number: 6, nameEn: 'White Worldbridger', nameZh: '白色橋接者', keyword: 'Equality' },
  { number: 7, nameEn: 'Blue Hand', nameZh: '藍色手', keyword: 'Accomplishment' },
  { number: 8, nameEn: 'Yellow Star', nameZh: '黃色星', keyword: 'Art' },
  { number: 9, nameEn: 'Red Moon', nameZh: '紅色月亮', keyword: 'Purification' },
  { number: 10, nameEn: 'White Dog', nameZh: '白色犬', keyword: 'Love' },
  { number: 11, nameEn: 'Blue Monkey', nameZh: '藍色猴', keyword: 'Magic' },
  { number: 12, nameEn: 'Yellow Human', nameZh: '黃色人', keyword: 'Free Will' },
  { number: 13, nameEn: 'Red Skywalker', nameZh: '紅色天行者', keyword: 'Space' },
  { number: 14, nameEn: 'White Wizard', nameZh: '白色巫師', keyword: 'Timelessness' },
  { number: 15, nameEn: 'Blue Eagle', nameZh: '藍色鷹', keyword: 'Vision' },
  { number: 16, nameEn: 'Yellow Warrior', nameZh: '黃色戰士', keyword: 'Intelligence' },
  { number: 17, nameEn: 'Red Earth', nameZh: '紅色地球', keyword: 'Navigation' },
  { number: 18, nameEn: 'White Mirror', nameZh: '白色鏡', keyword: 'Endlessness' },
  { number: 19, nameEn: 'Blue Storm', nameZh: '藍色風暴', keyword: 'Self-generation' },
  { number: 20, nameEn: 'Yellow Sun', nameZh: '黃色太陽', keyword: 'Universal Fire' },
];

export const DREAMSPELL_WAVES: DreamspellWaveInfo[] = [
  { number: 1, nameEn: 'Wave 1', nameZh: '波符 1' },
  { number: 2, nameEn: 'Wave 2', nameZh: '波符 2' },
  { number: 3, nameEn: 'Wave 3', nameZh: '波符 3' },
  { number: 4, nameEn: 'Wave 4', nameZh: '波符 4' },
  { number: 5, nameEn: 'Wave 5', nameZh: '波符 5' },
  { number: 6, nameEn: 'Wave 6', nameZh: '波符 6' },
  { number: 7, nameEn: 'Wave 7', nameZh: '波符 7' },
  { number: 8, nameEn: 'Wave 8', nameZh: '波符 8' },
  { number: 9, nameEn: 'Wave 9', nameZh: '波符 9' },
  { number: 10, nameEn: 'Wave 10', nameZh: '波符 10' },
  { number: 11, nameEn: 'Wave 11', nameZh: '波符 11' },
  { number: 12, nameEn: 'Wave 12', nameZh: '波符 12' },
  { number: 13, nameEn: 'Wave 13', nameZh: '波符 13' },
  { number: 14, nameEn: 'Wave 14', nameZh: '波符 14' },
  { number: 15, nameEn: 'Wave 15', nameZh: '波符 15' },
  { number: 16, nameEn: 'Wave 16', nameZh: '波符 16' },
  { number: 17, nameEn: 'Wave 17', nameZh: '波符 17' },
  { number: 18, nameEn: 'Wave 18', nameZh: '波符 18' },
  { number: 19, nameEn: 'Wave 19', nameZh: '波符 19' },
  { number: 20, nameEn: 'Wave 20', nameZh: '波符 20' },
];

export const DREAMSPELL_CASTLES: DreamspellCastleInfo[] = [
  { number: 1, nameEn: 'Castle 1', nameZh: '城堡 1' },
  { number: 2, nameEn: 'Castle 2', nameZh: '城堡 2' },
  { number: 3, nameEn: 'Castle 3', nameZh: '城堡 3' },
  { number: 4, nameEn: 'Castle 4', nameZh: '城堡 4' },
  { number: 5, nameEn: 'Castle 5', nameZh: '城堡 5' },
];

export const DREAMSPELL_GUIDING_ARCHETYPES: DreamspellGuidingArchetypeInfo[] = [
  { key: 'earth', nameEn: 'Earth Wisdom', nameZh: '地之智慧', description: 'Grounding and form-building guidance.' },
  { key: 'air', nameEn: 'Air Wisdom', nameZh: '風之智慧', description: 'Movement, clarity, and perspective.' },
  { key: 'fire', nameEn: 'Fire Wisdom', nameZh: '火之智慧', description: 'Catalysis, courage, and transformation.' },
  { key: 'water', nameEn: 'Water Wisdom', nameZh: '水之智慧', description: 'Flow, intuition, and emotional truth.' },
  { key: 'ether', nameEn: 'Ether Wisdom', nameZh: '以太之智慧', description: 'Integration and transcendence.' },
];

export function positiveModulo(value: number, modulus: number): number {
  if (modulus <= 0) {
    throw new Error('modulus must be greater than zero');
  }
  return ((value % modulus) + modulus) % modulus;
}

export function getDayDifferenceExcludingLeapDays(startDate: Date, endDate: Date): number {
  const normalizedStart = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate()));
  const normalizedEnd = new Date(Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate()));

  if (normalizedEnd.getTime() < normalizedStart.getTime()) {
    return -getDayDifferenceExcludingLeapDays(normalizedEnd, normalizedStart);
  }

  const cursor = new Date(normalizedStart.getTime());
  let dayCount = 0;

  while (cursor.getTime() < normalizedEnd.getTime()) {
    const month = cursor.getUTCMonth() + 1;
    const day = cursor.getUTCDate();
    if (!(month === 2 && day === 29)) {
      dayCount += 1;
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return dayCount;
}

export function calculateKinFromDayDifference(dayDifference: number): number {
  return positiveModulo(33 + dayDifference, DREAMSPELL_KIN_COUNT) + 1;
}

export function normalizeDreamspellInput(
  input: string | Date | DreamspellDateInput,
  timezoneOffsetMinutes = 0,
): Date {
  if (typeof input === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(input.trim())) {
      const [year, month, day] = input.split('-').map(Number);
      return new Date(Date.UTC(year, month - 1, day) - timezoneOffsetMinutes * 60 * 1000);
    }
    const parsed = new Date(input);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
    throw new Error(`Unsupported Dreamspell date string: ${input}`);
  }

  if (input instanceof Date) {
    return input;
  }

  const { year, month, day } = input;
  const offsetMs = (input.timezoneOffsetMinutes ?? timezoneOffsetMinutes) * 60 * 1000;
  return new Date(Date.UTC(year, month - 1, day) - offsetMs);
}

export function getMoonCalendarForDate(date: Date): DreamspellMoonInfo {
  const month = date.getUTCMonth();
  const day = date.getUTCDate();
  const isLeapDay = month === 1 && day === 29;
  const isDayOutOfTime = month === 6 && day === 25;
  const isNewYear = month === 6 && day === 26;

  const currentYear = date.getUTCFullYear();
  const anchorDate = new Date(Date.UTC(currentYear, 6, 26));
  const cycleStart = date.getTime() < anchorDate.getTime()
    ? new Date(Date.UTC(currentYear - 1, 6, 26))
    : anchorDate;

  const dayDifference = getDayDifferenceExcludingLeapDays(cycleStart, date);
  const lunarDay = positiveModulo(dayDifference, 13) + 1;

  return {
    lunarDay,
    isDayOutOfTime,
    isNewYear,
    isLeapDay,
    yearAnchor: `${cycleStart.getUTCFullYear()}-07-26`,
  };
}

export function calculateDreamspellKin(
  input: string | Date | DreamspellDateInput,
  timezoneOffsetMinutes = 0,
): DreamspellResult {
  const date = normalizeDreamspellInput(input, timezoneOffsetMinutes);
  const isoDate = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
  const dayDifference = getDayDifferenceExcludingLeapDays(new Date(Date.UTC(1987, 6, 26)), date);
  const kin = calculateKinFromDayDifference(dayDifference);

  const tone = getToneByKin(kin);
  const solarTotem = getSolarTotemByKin(kin);
  const wave = getWaveByKin(kin);
  const castle = getCastleByKin(kin);
  const moonCalendar = getMoonCalendarForDate(date);
  const guidingArchetype = getGuidingArchetypeByCastle(castle.number);

  return {
    date: isoDate,
    kin,
    tone,
    solarTotem,
    wave,
    castle,
    guidingArchetype,
    moonCalendar,
    calculation: {
      epoch: DREAMSPELL_EPOCH.iso,
      dayDifferenceExcludingLeapDays: dayDifference,
      formula: 'KIN = positiveModulo(33 + D, 260) + 1',
    },
  };
}

export function getToneByKin(kin: number): DreamspellToneInfo {
  const toneNumber = positiveModulo(kin - 1, DREAMSPELL_TONE_COUNT) + 1;
  return { ...DREAMSPELL_TONES[toneNumber - 1], number: toneNumber };
}

export function getSolarTotemByKin(kin: number): DreamspellTotemInfo {
  const offset = positiveModulo(kin - 1, DREAMSPELL_SOLAR_TOTEM_COUNT);
  return { ...DREAMSPELL_SOLAR_TOTEMS[offset], number: offset + 1 };
}

export function getWaveByKin(kin: number): DreamspellWaveInfo {
  const index = positiveModulo(Math.floor((kin - 1) / DREAMSPELL_TONE_COUNT), DREAMSPELL_WAVE_COUNT);
  return { ...DREAMSPELL_WAVES[index], number: index + 1 };
}

export function getCastleByKin(kin: number): DreamspellCastleInfo {
  const index = positiveModulo(Math.floor((kin - 1) / 52), DREAMSPELL_CASTLE_COUNT);
  return { ...DREAMSPELL_CASTLES[index], number: index + 1 };
}

export function getGuidingArchetypeByCastle(castleNumber: number): DreamspellGuidingArchetypeInfo {
  const safeIndex = positiveModulo(castleNumber - 1, DREAMSPELL_GUIDING_ARCHETYPES.length);
  return DREAMSPELL_GUIDING_ARCHETYPES[safeIndex];
}
