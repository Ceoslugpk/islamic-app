/**
 * Hijri calendar.
 * Primary: Aladhan /v1/gToHCalendar/{gregMonth}/{gregYear} (authoritative, verified).
 * Fallback: corrected Umm al-Qura tabular approximation (offline only).
 */

import { fetchWithTimeout } from './quran';
import { isAppOnline } from './useConnectivity';

export interface HijriDay {
  gregorianDay: number;
  hijriDay: number;
  hijriMonth: number;
  hijriYear: number;
  weekday: number; // 0=Sunday .. 6=Saturday
}

export interface HijriMonthData {
  gregorianMonth: number;
  gregorianYear: number;
  hijriMonth: number;
  hijriMonthName: string;
  hijriYear: number;
  days: HijriDay[];
  leadingBlanks: number;
  source: 'api' | 'local';
}

const HIJRI_MONTHS = [
  'Muharram', 'Safar', "Rabi' al-Awwal", "Rabi' al-Thani",
  'Jumada al-Awwal', 'Jumada al-Thani', 'Rajab', "Sha'ban",
  'Ramadan', 'Shawwal', "Dhu al-Qi'dah", 'Dhu al-Hijjah',
];

/* ─── Standard Library Intl Umm al-Qura conversion ─── */
let umalquraFormatter: Intl.DateTimeFormat | null = null;
try {
  const fmt = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
  });
  if (fmt.resolvedOptions().calendar?.includes('islamic')) {
    umalquraFormatter = fmt;
  }
} catch {
  umalquraFormatter = null;
}

function getIntlHijriDate(
  year: number,
  month: number,
  day: number
): { day: number; month: number; year: number } | null {
  if (!umalquraFormatter) return null;
  try {
    const d = new Date(year, month - 1, day);
    const parts = umalquraFormatter.formatToParts(d);
    let hd = 0;
    let hm = 0;
    let hy = 0;
    for (const p of parts) {
      if (p.type === 'day') hd = parseInt(p.value, 10);
      else if (p.type === 'month') hm = parseInt(p.value, 10);
      else if (p.type === 'year') hy = parseInt(p.value, 10);
    }
    if (hd > 0 && hm > 0 && hy > 0) {
      return { day: hd, month: hm, year: hy };
    }
  } catch {
    // fallback to tabular
  }
  return null;
}

/* ─── Corrected tabular calculation (offline / fallback) ─── */
// Epoch anchor: 1 Muharram 1448 AH = 2026-06-16 (JDN 2461208).
// Previously misanchored to 2461237 (2026-07-15 = 1 Safar 1448 AH), which shifted months off by -1.
const HIJRI_1448_EPOCH_JDN = 2461208;

function isLeap(year: number): boolean {
  const cycle = year % 30;
  return [2, 5, 7, 10, 13, 16, 18, 21, 24, 26, 29].includes(cycle);
}

function monthLength(year: number, month: number): number {
  const base = month % 2 === 1 ? 30 : 29;
  return month === 12 && isLeap(year) ? 30 : base;
}

function gregorianToJdn(y: number, m: number, d: number): number {
  let yy = y, mm = m;
  if (mm <= 2) { yy -= 1; mm += 12; }
  const A = Math.floor(yy / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (yy + 4716)) + Math.floor(30.6001 * (mm + 1)) + d + B - 1524;
}

function jdnToHijri(jdn: number): { day: number; month: number; year: number } {
  let days = jdn - HIJRI_1448_EPOCH_JDN;
  let year = 1448;
  // Walk backward to find year
  while (days < 0) {
    year -= 1;
    days += 354 + (isLeap(year) ? 1 : 0);
  }
  let remaining = days;
  let y = year;
  while (remaining >= 354 + (isLeap(y) ? 1 : 0)) {
    remaining -= 354 + (isLeap(y) ? 1 : 0);
    y += 1;
  }
  let month = 1;
  while (remaining >= monthLength(y, month)) {
    remaining -= monthLength(y, month);
    month += 1;
  }
  return { day: remaining + 1, month, year: y };
}

function daysInGregorianMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function buildHijriMonthLocal(year: number, gregorianMonth: number): HijriMonthData {
  const daysInMonth = daysInGregorianMonth(year, gregorianMonth);
  const firstWeekday = new Date(year, gregorianMonth - 1, 1).getDay();
  const days: HijriDay[] = [];
  const monthCounts: Record<number, number> = {};

  for (let d = 1; d <= daysInMonth; d++) {
    const h = gregorianToHijri(year, gregorianMonth, d);
    monthCounts[h.month] = (monthCounts[h.month] || 0) + 1;
    days.push({
      gregorianDay: d,
      hijriDay: h.day,
      hijriMonth: h.month,
      hijriYear: h.year,
      weekday: new Date(year, gregorianMonth - 1, d).getDay(),
    });
  }

  // Primary Hijri month is the one that covers the majority of days in this Gregorian month
  let primaryMonth = days[0].hijriMonth;
  let maxCount = 0;
  for (const [mStr, count] of Object.entries(monthCounts)) {
    const m = Number(mStr);
    if (count > maxCount) {
      maxCount = count;
      primaryMonth = m;
    }
  }
  const primaryYear = days.find((d) => d.hijriMonth === primaryMonth)?.hijriYear ?? days[0].hijriYear;

  return {
    gregorianMonth,
    gregorianYear: year,
    hijriMonth: primaryMonth,
    hijriMonthName: HIJRI_MONTHS[(primaryMonth - 1) % 12],
    hijriYear: primaryYear,
    days,
    leadingBlanks: firstWeekday,
    source: 'local',
  };
}

/** Fetch Hijri month grid from Aladhan, fall back to local tabular calc. */
export async function fetchHijriMonth(
  gregorianYear: number,
  gregorianMonth: number,
  force = false
): Promise<HijriMonthData> {
  if (!isAppOnline()) {
    return buildHijriMonthLocal(gregorianYear, gregorianMonth);
  }

  try {
    const res = await fetchWithTimeout(
      `https://api.aladhan.com/v1/gToHCalendar/${gregorianMonth}/${gregorianYear}`,
      {},
      4000
    );
    if (!res.ok) throw new Error(`Aladhan HTTP ${res.status}`);
    const json = await res.json();
    if (json.code !== 200 || !Array.isArray(json.data)) throw new Error('bad payload');

    const daysInMonth = new Date(gregorianYear, gregorianMonth, 0).getDate();
    const firstWeekday = new Date(gregorianYear, gregorianMonth - 1, 1).getDay();
    const days: HijriDay[] = [];
    const monthCounts: Record<number, number> = {};

    for (const item of json.data) {
      const g = item.gregorian || {};
      const h = item.hijri || {};
      const gregDay = parseInt(g.day || '0', 10);
      if (!gregDay || gregDay > daysInMonth) continue;
      const hMonth = parseInt(h.month?.number || '1', 10);
      monthCounts[hMonth] = (monthCounts[hMonth] || 0) + 1;
      days.push({
        gregorianDay: gregDay,
        hijriDay: parseInt(h.day || '0', 10),
        hijriMonth: hMonth,
        hijriYear: parseInt(h.year || '1448', 10),
        weekday: new Date(gregorianYear, gregorianMonth - 1, gregDay).getDay(),
      });
    }

    let primaryMonth = days[0]?.hijriMonth ?? 1;
    let maxCount = 0;
    for (const [mStr, count] of Object.entries(monthCounts)) {
      const m = Number(mStr);
      if (count > maxCount) {
        maxCount = count;
        primaryMonth = m;
      }
    }
    const primaryYear = days.find((d) => d.hijriMonth === primaryMonth)?.hijriYear ?? days[0]?.hijriYear ?? 1448;

    return {
      gregorianMonth,
      gregorianYear,
      hijriMonth: primaryMonth,
      hijriMonthName: HIJRI_MONTHS[(primaryMonth - 1) % 12],
      hijriYear: primaryYear,
      days,
      leadingBlanks: firstWeekday,
      source: 'api',
    };
  } catch {
    return buildHijriMonthLocal(gregorianYear, gregorianMonth);
  }
}

export function gregorianToHijri(
  year: number,
  month: number,
  day: number,
  offsetDays = 0
): { day: number; month: number; year: number; monthName: string } {
  let targetYear = year;
  let targetMonth = month;
  let targetDay = day;
  if (offsetDays !== 0) {
    const adjusted = new Date(year, month - 1, day + offsetDays);
    targetYear = adjusted.getFullYear();
    targetMonth = adjusted.getMonth() + 1;
    targetDay = adjusted.getDate();
  }

  const intlResult = getIntlHijriDate(targetYear, targetMonth, targetDay);
  const h = intlResult || jdnToHijri(gregorianToJdn(targetYear, targetMonth, targetDay));
  const safeMonth = Math.max(1, Math.min(12, h.month));
  return {
    day: h.day,
    month: safeMonth,
    year: h.year,
    monthName: HIJRI_MONTHS[(safeMonth - 1) % 12],
  };
}

export function gregorianToHijriString(year: number, month: number, day: number, offsetDays = 0): string {
  const h = gregorianToHijri(year, month, day, offsetDays);
  return `${h.day} ${h.monthName} ${h.year} AH`;
}

export { HIJRI_MONTHS };
