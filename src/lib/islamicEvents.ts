/**
 * Major Islamic events with fixed Hijri dates.
 * Used for calendar markers, countdowns, and event listings.
 */

import { t } from './i18n';
export interface IslamicEvent {
  hijriMonth: number; // 1-12
  hijriDay: number;   // 1-30
  name: string;
  arabic: string;
  significance: string;
  type: 'major' | 'minor' | 'observance'; // for icon selection
}

export const ISLAMIC_EVENTS: IslamicEvent[] = [
  // Muharram
  {
    hijriMonth: 1,
    hijriDay: 1,
    name: 'Islamic New Year',
    arabic: 'رأس السنة الهجرية',
    get significance() { return t('First day of Muharram, marking the Hijri new year.'); },
    type: 'major',
  },
  {
    hijriMonth: 1,
    hijriDay: 10,
    name: 'Ashura',
    arabic: 'عاشوراء',
    get significance() { return t('Day of fasting; commemorates Musa\'s victory and Husayn\'s martyrdom at Karbala.'); },
    type: 'major',
  },

  // Rabi' al-Awwal
  {
    hijriMonth: 3,
    hijriDay: 12,
    name: 'Mawlid al-Nabi',
    arabic: 'المولد النبوي',
    get significance() { return t('Birth anniversary of the Prophet Muhammad ﷺ (observed on 12th by most).'); },
    type: 'major',
  },

  // Rajab
  {
    hijriMonth: 7,
    hijriDay: 27,
    name: 'Isra and Mi\'raj',
    arabic: 'الإسراء والمعراج',
    get significance() { return t('Night journey and ascension of the Prophet ﷺ to the heavens.'); },
    type: 'major',
  },

  // Sha'ban
  {
    hijriMonth: 8,
    hijriDay: 15,
    name: 'Nisf Sha\'ban (Laylat al-Bara\'ah)',
    arabic: 'ليلة النصف من شعبان',
    get significance() { return t('Night of forgiveness; many observe prayers and fasting the next day.'); },
    type: 'observance',
  },

  // Ramadan
  {
    hijriMonth: 9,
    hijriDay: 1,
    name: 'Ramadan Begins',
    arabic: 'بدء رمضان',
    get significance() { return t('First day of the month of fasting.'); },
    type: 'major',
  },
  {
    hijriMonth: 9,
    hijriDay: 27,
    name: 'Laylat al-Qadr',
    arabic: 'ليلة القدر',
    get significance() { return t('Night of Power; better than a thousand months. Often observed on the 27th night.'); },
    type: 'major',
  },

  // Shawwal
  {
    hijriMonth: 10,
    hijriDay: 1,
    name: 'Eid al-Fitr',
    arabic: 'عيد الفطر',
    get significance() { return t('Festival of breaking the fast; marks the end of Ramadan.'); },
    type: 'major',
  },

  // Dhu al-Qi'dah
  // (no major fixed events)

  // Dhu al-Hijjah
  {
    hijriMonth: 12,
    hijriDay: 9,
    name: 'Day of Arafah',
    arabic: 'يوم عرفة',
    get significance() { return t('Hajj pilgrims gather at Arafat; highly recommended fast for non-pilgrims.'); },
    type: 'major',
  },
  {
    hijriMonth: 12,
    hijriDay: 10,
    name: 'Eid al-Adha',
    arabic: 'عيد الأضحى',
    get significance() { return t('Festival of Sacrifice; coincides with Hajj rites.'); },
    type: 'major',
  },
  {
    hijriMonth: 12,
    hijriDay: 11,
    name: 'Days of Tashriq (1st)',
    arabic: 'أيام التشريق',
    get significance() { return t('Three days following Eid al-Adha; continuation of celebration and sacrifice.'); },
    type: 'observance',
  },
  {
    hijriMonth: 12,
    hijriDay: 12,
    name: 'Days of Tashriq (2nd)',
    arabic: 'أيام التشريق',
    get significance() { return t('Three days following Eid al-Adha; continuation of celebration and sacrifice.'); },
    type: 'observance',
  },
  {
    hijriMonth: 12,
    hijriDay: 13,
    name: 'Days of Tashriq (3rd)',
    arabic: 'أيام التشريق',
    get significance() { return t('Three days following Eid al-Adha; continuation of celebration and sacrifice.'); },
    type: 'observance',
  },

  // Additional notable observance
  {
    hijriMonth: 9,
    hijriDay: 15,
    name: 'Nuzul al-Quran',
    arabic: 'نزول القرآن',
    get significance() { return t('Commemorates the first revelation of the Quran to the Prophet ﷺ.'); },
    type: 'observance',
  },
];

const HIJRI_MONTH_NAME_KEYS = [
  'Muharram', 'Safar', "Rabi' al-Awwal", "Rabi' al-Thani",
  'Jumada al-Awwal', 'Jumada al-Thani', 'Rajab', "Sha'ban",
  'Ramadan', 'Shawwal', "Dhu al-Qi'dah", 'Dhu al-Hijjah',
];

export const HIJRI_MONTH_NAMES = HIJRI_MONTH_NAME_KEYS.slice();
HIJRI_MONTH_NAME_KEYS.forEach((month, index) => {
  Object.defineProperty(HIJRI_MONTH_NAMES, index, {
    enumerable: true,
    get: () => t(month),
  });
});

/** Get events for a specific hijri month */
export function getEventsForMonth(hijriMonth: number): IslamicEvent[] {
  return ISLAMIC_EVENTS.filter((e) => e.hijriMonth === hijriMonth);
}

/** Get the next upcoming Islamic event from a given Hijri date */
export function getNextEvent(
  currentHijriYear: number,
  currentHijriMonth: number,
  currentHijriDay: number
): { event: IslamicEvent; daysUntil: number; hijriYear: number } | null {
  const currentOrdinal = hijriToOrdinal(currentHijriYear, currentHijriMonth, currentHijriDay);

  let best: { event: IslamicEvent; daysUntil: number; hijriYear: number } | null = null;

  for (const event of ISLAMIC_EVENTS) {
    // Check this year
    const thisYearOrdinal = hijriToOrdinal(currentHijriYear, event.hijriMonth, event.hijriDay);
    let daysUntil = thisYearOrdinal - currentOrdinal;
    let targetYear = currentHijriYear;

    if (daysUntil < 0) {
      // Check next year
      const nextYearOrdinal = hijriToOrdinal(currentHijriYear + 1, event.hijriMonth, event.hijriDay);
      daysUntil = nextYearOrdinal - currentOrdinal;
      targetYear = currentHijriYear + 1;
    }

    if (daysUntil >= 0 && (best === null || daysUntil < best.daysUntil)) {
      best = { event, daysUntil, hijriYear: targetYear };
    }
  }

  return best;
}

/** Simple ordinal day count for Hijri date (approximate, 354/355 days per year) */
function hijriToOrdinal(year: number, month: number, day: number): number {
  let ordinal = day;
  for (let m = 1; m < month; m++) {
    ordinal += getHijriMonthLength(year, m);
  }
  // Add years
  for (let y = 1400; y < year; y++) {
    ordinal += isHijriLeapYear(y) ? 355 : 354;
  }
  return ordinal;
}

function isHijriLeapYear(year: number): boolean {
  const cycle = year % 30;
  return [2, 5, 7, 10, 13, 16, 18, 21, 24, 26, 29].includes(cycle);
}

function getHijriMonthLength(year: number, month: number): number {
  const base = month % 2 === 1 ? 30 : 29;
  return month === 12 && isHijriLeapYear(year) ? 30 : base;
}

/** Format a hijri date as "20 Rabi' al-Thani 1448 AH" */
export function formatHijriDate(day: number, month: number, year: number): string {
  const safeMonth = Math.max(1, Math.min(12, month || 1));
  return t('{{day}} {{month}} {{year}} AH', {
    day,
    month: HIJRI_MONTH_NAMES[safeMonth - 1],
    year,
  });
}
