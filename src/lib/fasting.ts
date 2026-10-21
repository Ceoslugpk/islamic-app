/**
 * Fasting utilities, voluntary fast recommendations, Hijri calculations, and streak logic.
 */

import { FastingEntry } from './db';
import { gregorianToHijri, HIJRI_MONTHS } from './hijri';
import { t } from './i18n';

export type FastingType = 'ramadan' | 'voluntary' | 'qada';

export interface VoluntaryFastRecommendation {
  id: string;
  name: string;
  arabicName: string;
  description: string;
  virtue: string;
  type: 'weekly' | 'monthly' | 'annual';
  isActiveToday: boolean;
  upcomingDateLabel: string;
}

export const VOLUNTARY_FASTS_CATALOG = [
  {
    id: 'mon_thu',
    get name() { return t('Mondays & Thursdays'); },
    arabicName: 'صيام الإثنين والخميس',
    get description() { return t('Weekly Sunnah fasts observed on Monday and Thursday.'); },
    get virtue() { return t("The Messenger of Allah ﷺ said: 'Deeds are presented on Monday and Thursday, and I love that my deeds be presented while I am fasting.' (Tirmidhi)"); },
    type: 'weekly' as const,
  },
  {
    id: 'ayyam_beed',
    get name() { return t('Ayyam al-Beed (White Days)'); },
    arabicName: 'أيام البيض',
    get description() { return t('The 13th, 14th, and 15th of every lunar Hijri month during the full moon.'); },
    get virtue() { return t('Fasting three days of each month is equivalent to fasting the entire lifetime. (Sahih al-Bukhari)'); },
    type: 'monthly' as const,
  },
  {
    id: 'ashura',
    get name() { return t('Day of Ashura & Tasu’a'); },
    arabicName: 'عاشوراء وتاسوعاء',
    get description() { return t('10th of Muharram (Ashura), recommended to fast alongside the 9th (Tasu’a).'); },
    get virtue() { return t('Fasting the day of Ashura expiates the sins of the previous year. (Sahih Muslim)'); },
    type: 'annual' as const,
  },
  {
    id: 'arafah',
    get name() { return t('Day of Arafah'); },
    arabicName: 'يوم عرفة',
    get description() { return t('9th of Dhu al-Hijjah for non-pilgrims on the pinnacle day of Hajj.'); },
    get virtue() { return t('Fasting on the Day of Arafah expiates sins of the previous year and the coming year. (Sahih Muslim)'); },
    type: 'annual' as const,
  },
  {
    id: 'shawwal',
    get name() { return t('Six Days of Shawwal'); },
    arabicName: 'ستة من شوال',
    get description() { return t('Any six days during the month of Shawwal following Eid al-Fitr.'); },
    get virtue() { return t('Whoever fasts Ramadan then follows it with six days of Shawwal, it is as if he fasted the whole year. (Sahih Muslim)'); },
    type: 'annual' as const,
  },
  {
    id: 'shaban',
    get name() { return t('Month of Sha’ban'); },
    arabicName: 'صيام شعبان',
    get description() { return t('Voluntary fasting during the month of Sha’ban before Ramadan begins.'); },
    get virtue() { return t('The Prophet ﷺ used to fast most of Sha’ban in spiritual preparation for Ramadan. (Sahih al-Bukhari)'); },
    type: 'annual' as const,
  },
];

/* ─── Hijri helper ─────────────────────────────────────────────── */


export function getHijriDate(date: Date = new Date()): { day: number; month: number; year: number } {
  const h = gregorianToHijri(date.getFullYear(), date.getMonth() + 1, date.getDate());
  return { day: h.day, month: h.month, year: h.year };
}

export const HIJRI_MONTH_NAMES = HIJRI_MONTHS.slice();
HIJRI_MONTHS.forEach((month, index) => {
  Object.defineProperty(HIJRI_MONTH_NAMES, index, {
    enumerable: true,
    get: () => t(month),
  });
});

/** Format YYYY-MM-DD */
export function toDateString(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Check voluntary recommendations against a given date */
export function getVoluntaryRecommendations(date: Date = new Date()): VoluntaryFastRecommendation[] {
  const weekday = date.getDay(); // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
  const hijri = getHijriDate(date);

  const isMonday = weekday === 1;
  const isThursday = weekday === 4;
  const isAyyamBeed = hijri.day >= 13 && hijri.day <= 15;
  const isAshuraSeason = hijri.month === 1 && (hijri.day === 9 || hijri.day === 10);
  const isArafah = hijri.month === 12 && hijri.day === 9;
  const isShawwal = hijri.month === 10;
  const isShaban = hijri.month === 8;

  return VOLUNTARY_FASTS_CATALOG.map((item) => {
    let isActiveToday = false;
    let upcomingDateLabel = '';

    if (item.id === 'mon_thu') {
      isActiveToday = isMonday || isThursday;
      upcomingDateLabel = isActiveToday
        ? t('Active Today')
        : weekday < 1 || weekday > 4
        ? t('Next: Monday')
        : t('Next: Thursday');
    } else if (item.id === 'ayyam_beed') {
      isActiveToday = isAyyamBeed;
      upcomingDateLabel = isActiveToday
        ? t('Day {{day}} of 15 (Active)', { day: hijri.day })
        : hijri.day < 13
        ? t('{{count}} days left ({{month}} 13-15)', { count: 13 - hijri.day, month: HIJRI_MONTH_NAMES[hijri.month - 1] })
        : t('Next month (13-15 {{month}})', { month: HIJRI_MONTH_NAMES[hijri.month % 12] });
    } else if (item.id === 'ashura') {
      isActiveToday = isAshuraSeason;
      upcomingDateLabel = isActiveToday
        ? t('Active Today (Muharram)')
        : hijri.month === 1 && hijri.day < 9
        ? t('In {{count}} days (9-10 Muharram)', { count: 9 - hijri.day })
        : t('10 Muharram');
    } else if (item.id === 'arafah') {
      isActiveToday = isArafah;
      upcomingDateLabel = isActiveToday ? t('Active Today (9 Dhu al-Hijjah)') : t('9 Dhu al-Hijjah');
    } else if (item.id === 'shawwal') {
      isActiveToday = isShawwal;
      upcomingDateLabel = isActiveToday ? t('Active this month (Shawwal)') : t('Month of Shawwal (post-Ramadan)');
    } else if (item.id === 'shaban') {
      isActiveToday = isShaban;
      upcomingDateLabel = isActiveToday ? t('Active this month (Sha’ban)') : t('Month of Sha’ban');
    }

    return {
      ...item,
      isActiveToday,
      upcomingDateLabel,
    };
  });
}

/** Compute consecutive fasting streak ending today or yesterday */
export function computeFastingStreak(entries: FastingEntry[]): number {
  if (!entries || entries.length === 0) return 0;
  const fastingDates = new Set(
    entries.filter((e) => e.fasting).map((e) => e.date)
  );

  const today = new Date();
  const todayStr = toDateString(today);
  const yesterday = new Date(today.getTime() - 86400000);
  const yesterdayStr = toDateString(yesterday);

  // If fasted today, start from today. If not fasted today, check if yesterday was fasted.
  let currentCheckDate: Date;
  if (fastingDates.has(todayStr)) {
    currentCheckDate = today;
  } else if (fastingDates.has(yesterdayStr)) {
    currentCheckDate = yesterday;
  } else {
    return 0;
  }

  let streak = 0;
  while (true) {
    const dStr = toDateString(currentCheckDate);
    if (fastingDates.has(dStr)) {
      streak += 1;
      currentCheckDate = new Date(currentCheckDate.getTime() - 86400000);
    } else {
      break;
    }
  }

  return streak;
}

/** Calculate time remaining until suhoor end or iftar */
export function getFastingCountdown(
  suhoorTimeStr: string, // Fajr
  iftarTimeStr: string // Maghrib
): { phase: 'fasting' | 'eating' | 'unknown'; remainingMinutes: number; label: string } {
  if (!suhoorTimeStr || !iftarTimeStr) {
    return { phase: 'unknown', remainingMinutes: 0, label: '--' };
  }

  const [sH, sM] = suhoorTimeStr.split(':').map(Number);
  const [iH, iM] = iftarTimeStr.split(':').map(Number);

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const suhoorMinutes = sH * 60 + sM;
  const iftarMinutes = iH * 60 + iM;

  if (currentMinutes >= suhoorMinutes && currentMinutes < iftarMinutes) {
    // Currently fasting, waiting for Iftar
    const diff = iftarMinutes - currentMinutes;
    const hours = Math.floor(diff / 60);
    const mins = diff % 60;
    return {
      phase: 'fasting',
      remainingMinutes: diff,
      label: hours > 0 ? t('{{hours}}h {{minutes}}m until Iftar', { hours, minutes: mins }) : t('{{minutes}}m until Iftar', { minutes: mins }),
    };
  } else {
    // Eating window, waiting for Suhoor
    let diff = 0;
    if (currentMinutes < suhoorMinutes) {
      diff = suhoorMinutes - currentMinutes;
    } else {
      // after iftar, waiting for tomorrow's suhoor
      diff = 24 * 60 - currentMinutes + suhoorMinutes;
    }
    const hours = Math.floor(diff / 60);
    const mins = diff % 60;
    return {
      phase: 'eating',
      remainingMinutes: diff,
      label: hours > 0 ? t('{{hours}}h {{minutes}}m until Suhoor ends', { hours, minutes: mins }) : t('{{minutes}}m until Suhoor ends', { minutes: mins }),
    };
  }
}
