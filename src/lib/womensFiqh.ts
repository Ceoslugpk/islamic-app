/**
 * Women's Fiqh, Purity, and Worship Guidance.
 * Static curated content based on mainstream authentic Islamic jurisprudence.
 */

import { t } from './i18n';

function localize<const T extends Record<string, unknown>>(source: T, fields: readonly (keyof T)[]): T {
  const result = { ...source };
  for (const field of fields) {
    const value = source[field];
    if (typeof value === 'string') {
      Object.defineProperty(result, field, {
        enumerable: true,
        get: () => t(value),
      });
    }
  }
  return result;
}

export interface GhuslStep {
  id: string;
  type: 'obligatory' | 'sunnah';
  title: string;
  arabic?: string;
  transliteration?: string;
  description: string;
}

export interface FiqhResource {
  id: string;
  title: string;
  author: string;
  description: string;
  category: 'Fiqh' | 'Spirituality' | 'Hadith';
}

export interface WorshipRule {
  id: string;
  topic: string;
  status: 'restricted' | 'permitted' | 'recommended';
  ruling: string;
  details: string;
  evidence: string;
}

/** Conditions that require Ghusl (Full Ritual Purification) */
export const GHUSL_REASONS = [
  {
    id: 'hayd',
    title: 'Cessation of Menstruation (Hayd)',
    description: 'Obligatory once bleeding completely stops, confirmed by the white discharge (al-qassah al-bayda) or complete dryness (jufuf).',
    reference: 'Surah Al-Baqarah (2:222)',
  },
  {
    id: 'nifas',
    title: 'Cessation of Postpartum Bleeding (Nifas)',
    description: 'Obligatory when bleeding ceases following childbirth, or upon reaching the standard 40-day mark.',
    reference: 'Sunan at-Tirmidhi (139)',
  },
  {
    id: 'janabah',
    title: 'State of Janabah (Intimacy)',
    description: 'Obligatory following marital relations or nocturnal emission.',
    reference: 'Surah An-Nisa (4:43)',
  },
];

/** Step-by-Step Ghusl method according to the Sunnah of the Prophet ﷺ */
export const GHUSL_STEPS: GhuslStep[] = [
  {
    id: 'niyyah',
    type: 'obligatory',
    title: '1. Intention (Niyyah) in the Heart',
    arabic: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',
    transliteration: 'Bismillahir-Rahmanir-Rahim',
    description: 'Intend in your heart to lift the state of major ritual impurity (Hadath Akbar) to resume prayer and worship. Mentioning Bismillah is recommended.',
  },
  {
    id: 'wash_hands',
    type: 'sunnah',
    title: '2. Wash Hands Three Times',
    description: 'Wash both hands up to the wrists thoroughly three times before immersing into water.',
  },
  {
    id: 'cleanse_private',
    type: 'sunnah',
    title: '3. Cleanse Impurities',
    description: 'Use the left hand to thoroughly wash away any impurities or residual blood from the private areas.',
  },
  {
    id: 'wudu',
    type: 'sunnah',
    title: '4. Perform Complete Wudu (Ablution)',
    description: 'Perform regular ablution (washing face, arms, wiping head, washing feet) just as done before Salah.',
  },
  {
    id: 'wash_head',
    type: 'obligatory',
    title: '5. Wash the Head & Scalp Roots (3x)',
    description: 'Pour three handfuls of water over the head, massaging water thoroughly into the roots of the hair so it reaches the scalp. Braided hair does not need to be unbraided if water reaches roots.',
  },
  {
    id: 'wash_body',
    type: 'obligatory',
    title: '6. Wash the Entire Body with Water',
    description: 'Pour water over the entire body, beginning with the right side from shoulder to foot, then the left side, ensuring water reaches all skin folds, navel, and underarms.',
  },
];

/** Permitted and restricted acts during Menstruation & Postnatal bleeding */
export const WORSHIP_GUIDELINES: WorshipRule[] = [
  localize({
    id: 'salah',
    topic: 'Obligatory & Voluntary Prayers (Salah)',
    status: 'restricted',
    ruling: 'Exempt from praying. Prayers missed are NOT made up.',
    details: 'A menstruating woman is exempted out of Allah’s mercy. She does not pray and is not required to make up any missed prayers after purification.',
    evidence: 'Aisha (RA) narrated: "We were ordered to make up missed fasts, but not missed prayers." (Sahih Muslim 335)',
  }, ['topic', 'ruling', 'details', 'evidence']),
  localize({
    id: 'fasting',
    topic: 'Fasting (Ramadan & Voluntary)',
    status: 'restricted',
    ruling: 'Exempt from fasting. Missed Ramadan days MUST be made up.',
    details: 'Fasting during active bleeding is invalid. Ramadan days missed must be made up (Qada) at any time before the subsequent Ramadan.',
    evidence: 'Sahih al-Bukhari (304), Sahih Muslim (335)',
  }, ['topic', 'ruling', 'details', 'evidence']),
  localize({
    id: 'dhikr',
    topic: 'Dhikr, Tasbih & Morning/Evening Adhkar',
    status: 'recommended',
    ruling: 'Fully permitted and highly encouraged.',
    details: 'Remembering Allah, reciting Tasbih, Tahmid, Takbir, seeking forgiveness (Istighfar), and reading daily morning and evening protections are deeply rewarding.',
    evidence: 'Prophetic consensus; no restriction on dhikr during ritual impurity.',
  }, ['topic', 'ruling', 'details', 'evidence']),
  localize({
    id: 'dua',
    topic: 'Du’a (Supplication)',
    status: 'recommended',
    ruling: 'Fully permitted anytime.',
    details: 'Personal supplication in any language or authentic Prophetic wordings is always welcomed and rewarded.',
    evidence: 'Quran: "Call upon Me, I will respond to you." (40:60)',
  }, ['topic', 'ruling', 'details', 'evidence']),
  localize({
    id: 'quran_digital',
    topic: 'Reading Quran (Digital Apps / Memory)',
    status: 'permitted',
    ruling: 'Permitted from memory or electronic devices.',
    details: 'According to the strong contemporary scholarly position (including Ibn Taymiyyah and modern committees), women may recite Quran from memory or read from phone screens without directly touching physical paper Mushaf.',
    evidence: 'Fatwa of Permanent Committee (Majmoo al-Fatawa 21/460)',
  }, ['topic', 'ruling', 'details', 'evidence']),
  localize({
    id: 'quran_audio',
    topic: 'Listening to Quran Recitation & Tafsir',
    status: 'recommended',
    ruling: 'Fully permitted and spiritually uplifting.',
    details: 'Listening to audio recitations, pondering the meanings, and studying Tafsir or Islamic lectures maintain a strong spiritual connection.',
    evidence: 'Prophetic tradition; the Prophet ﷺ would recite while resting with Aisha (RA).',
  }, ['topic', 'ruling', 'details', 'evidence']),
  localize({
    id: 'charity',
    topic: 'Charity (Sadaqah) & Community Service',
    status: 'recommended',
    ruling: 'Fully permitted with great reward.',
    details: 'Feeding the needy, financial charity, helping family, and acts of kindness are boundless righteous deeds during this period.',
    evidence: 'Surah Al-Baqarah (2:261)',
  }, ['topic', 'ruling', 'details', 'evidence']),
];

/** Comparison: Hayd vs Nifas vs Istihadha */
export interface BleedingTypeInfo {
  name: string;
  arabic: string;
  definition: string;
  duration: string;
  rulings: string;
}

export const BLEEDING_TYPES: BleedingTypeInfo[] = [
  localize({
    name: 'Hayd (Menstruation)',
    arabic: 'حيض',
    definition: 'Natural, regular monthly bleeding that occurs from the womb in healthy adult women.',
    duration: 'Commonly 5–7 days. Classical limits: Shafi’i & Hanbali: 1–15 days; Hanafi: 3–10 days.',
    rulings: 'Salah and fasting cease. Complete ghusl required upon cessation. Missed fasts are made up later; prayers are not.',
  }, ['name', 'definition', 'duration', 'rulings']),
  localize({
    name: 'Nifas (Postpartum Bleeding)',
    arabic: 'نفاس',
    definition: 'Bleeding following childbirth (natural or cesarean) from the womb.',
    duration: 'Standard Sunnah maximum is 40 days (majority). Shafi’i jurists note it may extend up to 60 days.',
    rulings: 'Same exemptions as Hayd. If bleeding extends past the maximum, it is treated as Istihadha unless coinciding with regular cycle.',
  }, ['name', 'definition', 'duration', 'rulings']),
  localize({
    name: 'Istihadha (Irregular Bleeding)',
    arabic: 'استحاضة',
    definition: 'Non-menstrual bleeding resulting from a ruptured blood vessel or medical condition, beyond regular cycle limits.',
    duration: 'Occurs irregularly, or continuous bleeding exceeding the maximum Hayd limit.',
    rulings: 'Ghusl is performed once when the regular menstrual period ends. Thereafter, the woman washes, makes wudu for EACH obligatory prayer, and prays/fasts normally.',
  }, ['name', 'definition', 'duration', 'rulings']),
];

/** Curated Women's Fiqh Resources */
export const WOMENS_FIQH_RESOURCES: FiqhResource[] = [
  localize({
    id: 'uthaymeen_rulings',
    title: 'Natural Blood of Women (Rulings on Hayd, Nifas & Istihadha)',
    author: 'Shaykh Muhammad ibn Salih al-Uthaymeen',
    description: 'An authoritative, evidence-based treatise explaining menstrual cycles, irregular bleeding, and when ghusl becomes binding.',
    category: 'Fiqh',
  }, ['title', 'author', 'description', 'category']),
  localize({
    id: 'four_madhhabs',
    title: 'Fiqh of Hayd in the Four Madhhabs',
    author: 'Classical Jurisprudence Consensus',
    description: 'Clear breakdown of minimum, maximum, and purity intervals across the Hanafi, Maliki, Shafi’i, and Hanbali schools of thought.',
    category: 'Fiqh',
  }, ['title', 'author', 'description', 'category']),
  localize({
    id: 'ideal_muslimah',
    title: 'The Ideal Muslimah',
    author: 'Dr. Muhammad Ali al-Hashimi',
    description: 'A comprehensive guide to the Muslim woman’s spiritual character, devotional life, intellect, and balanced worship.',
    category: 'Spirituality',
  }, ['title', 'author', 'description', 'category']),
  localize({
    id: 'aisha_hadith',
    title: 'Aisha (RA) on Hajj & Worship During Hayd',
    author: 'Sahih al-Bukhari & Sahih Muslim',
    description: 'Prophetic reassurance to the Mother of the Believers: "This is a matter Allah has decreed for the daughters of Adam. Do everything a pilgrim does except Tawaf."',
    category: 'Hadith',
  }, ['title', 'author', 'description', 'category']),
  localize({
    id: 'fawzan_guide',
    title: 'A Summary of Islamic Jurisprudence for Women',
    author: 'Dr. Salih al-Fawzan',
    description: 'Practical handbook on prayer purification, modern contraceptive impacts, medical procedures, and makeup fasts.',
    category: 'Fiqh',
  }, ['title', 'author', 'description', 'category']),
];

/* ─── Cycle & Date Calculation Helpers ──────────────────────── */

/** Format Date object as YYYY-MM-DD */
export function formatYMD(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Timezone-safe parse for YYYY-MM-DD strings.
 * Avoids the standard JS UTC midnight parsing bug where new Date("YYYY-MM-DD")
 * shifts by 1 day in western timezones.
 */
export function parseYMD(dateStr: string): Date {
  if (!dateStr) return new Date();
  const parts = dateStr.split('-').map((p) => parseInt(p, 10));
  if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }
  return new Date();
}

/** Validate whether a string is a valid calendar date in YYYY-MM-DD format */
export function isValidYMD(dateStr: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr.trim())) return false;
  const [y, m, d] = dateStr.trim().split('-').map(Number);
  if (!y || !m || !d || m < 1 || m > 12 || d < 1 || d > 31) return false;
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

/** Calculate days between two YYYY-MM-DD dates */
export function daysBetween(d1: string, d2: string): number {
  const dt1 = parseYMD(d1).getTime();
  const dt2 = parseYMD(d2).getTime();
  return Math.round(Math.abs(dt2 - dt1) / (1000 * 60 * 60 * 24));
}

/** Compute average cycle length from previous period entries */
export function computeAverageCycleLength(
  entries: { startDate: string }[],
  fallbackDays: number = 28
): number {
  if (!entries || entries.length < 2) return fallbackDays;
  const sorted = [...entries].sort((a, b) => a.startDate.localeCompare(b.startDate));
  const intervals: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const diff = daysBetween(sorted[i - 1].startDate, sorted[i].startDate);
    // Typical cycle length is between 20 and 45 days
    if (diff >= 20 && diff <= 45) {
      intervals.push(diff);
    }
  }
  if (intervals.length === 0) return fallbackDays;
  const sum = intervals.reduce((acc, curr) => acc + curr, 0);
  return Math.round(sum / intervals.length);
}

/** Predict next period start date given the latest start date and cycle length */
export function predictNextPeriod(
  latestStartDate: string,
  avgCycleLength: number = 28
): { nextDate: string; daysRemaining: number } {
  const start = parseYMD(latestStartDate);
  start.setHours(0, 0, 0, 0);
  const next = new Date(start.getTime() + avgCycleLength * 86400000);
  const nextDate = formatYMD(next);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  next.setHours(0, 0, 0, 0);
  const diffDays = Math.round((next.getTime() - today.getTime()) / 86400000);
  return {
    nextDate,
    daysRemaining: diffDays,
  };
}

/** Get elapsed cycle day relative to period start date (1-indexed) */
export function getCycleDay(startDate: string, targetDate?: string): number {
  const start = parseYMD(startDate);
  start.setHours(0, 0, 0, 0);
  const target = targetDate ? parseYMD(targetDate) : new Date();
  target.setHours(0, 0, 0, 0);
  const diff = Math.round((target.getTime() - start.getTime()) / 86400000);
  return Math.max(1, diff + 1);
}

/**
 * Approximate fertile window calculation.
 * Medical disclaimer: Rough estimate for general tracking only, not for contraception.
 */
export function getFertileWindow(
  latestStartDate: string,
  avgCycleLength: number = 28
): { start: string; end: string } {
  const start = parseYMD(latestStartDate);
  start.setHours(0, 0, 0, 0);
  // Estimated ovulation: ~14 days before next period
  const ovulationDay = Math.max(12, avgCycleLength - 14);
  const fertileStart = new Date(start.getTime() + (ovulationDay - 4) * 86400000);
  const fertileEnd = new Date(start.getTime() + (ovulationDay + 1) * 86400000);
  return {
    start: formatYMD(fertileStart),
    end: formatYMD(fertileEnd),
  };
}
