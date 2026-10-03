/**
 * Hijri calendar.
 * Primary: Aladhan /v1/gToHCalendar/{gregMonth}/{gregYear} (authoritative, verified).
 * Fallback: corrected Umm al-Qura tabular approximation (offline only).
 */

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
  'Muharram', 'Safar', "Rabi' al-awwal", "Rabi' al-thani",
  'Jumada al-awwal', 'Jumada al-thani', 'Rajab', "Sha'ban",
  'Ramadan', 'Shawwal', "Dhu al-Qi'dah", 'Dhu al-Hijjah',
];

/** Fetch Hijri month grid from Aladhan, fall back to local tabular calc. */
export async function fetchHijriMonth(
  gregorianYear: number,
  gregorianMonth: number
): Promise<HijriMonthData> {
  try {
    const res = await fetch(
      `https://api.aladhan.com/v1/gToHCalendar/${gregorianMonth}/${gregorianYear}`
    );
    if (!res.ok) throw new Error(`Aladhan HTTP ${res.status}`);
    const json = await res.json();
    if (json.code !== 200 || !Array.isArray(json.data)) throw new Error('bad payload');

    const daysInMonth = new Date(gregorianYear, gregorianMonth, 0).getDate();
    const firstWeekday = new Date(gregorianYear, gregorianMonth - 1, 1).getDay();
    const days: HijriDay[] = [];

    for (const item of json.data) {
      const g = item.gregorian || {};
      const h = item.hijri || {};
      const gregDay = parseInt(g.day || '0', 10);
      if (!gregDay || gregDay > daysInMonth) continue;
      days.push({
        gregorianDay: gregDay,
        hijriDay: parseInt(h.day || '0', 10),
        hijriMonth: parseInt(h.month?.number || '1', 10),
        hijriYear: parseInt(h.year || '1448', 10),
        weekday: new Date(gregorianYear, gregorianMonth - 1, gregDay).getDay(),
      });
    }

    const firstH = days[0];
    return {
      gregorianMonth,
      gregorianYear,
      hijriMonth: firstH.hijriMonth,
      hijriMonthName: HIJRI_MONTHS[(firstH.hijriMonth - 1) % 12],
      hijriYear: firstH.hijriYear,
      days,
      leadingBlanks: firstWeekday,
      source: 'api',
    };
  } catch {
    return buildHijriMonthLocal(gregorianYear, gregorianMonth);
  }
}

/* ------------------ Local tabular fallback (offline) ------------------ */

// Local tabular fallback: day-of-month is reliable (verified: Oct 1 = day 20, Oct 31 = day 20),
// but the month can drift ±1 vs official Umm al-Qura (irregular month lengths).
// Used ONLY offline; the API is authoritative online.
const HIJRI_EPOCH_JDN = 2461237;

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
  let days = jdn - HIJRI_EPOCH_JDN;
  let year = 1448;
  // Walk backward to find year
  while (days < 0) { year -= 1; days += 354 + (isLeap(year) ? 1 : 0); }
  let remaining = days;
  // Find year by subtracting year lengths
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

  for (let d = 1; d <= daysInMonth; d++) {
    const jdn = gregorianToJdn(year, gregorianMonth, d);
    const h = jdnToHijri(jdn);
    days.push({
      gregorianDay: d,
      hijriDay: h.day,
      hijriMonth: h.month,
      hijriYear: h.year,
      weekday: new Date(year, gregorianMonth - 1, d).getDay(),
    });
  }

  const first = days[0];
  return {
    gregorianMonth,
    gregorianYear: year,
    hijriMonth: first.hijriMonth,
    hijriMonthName: HIJRI_MONTHS[(first.hijriMonth - 1) % 12],
    hijriYear: first.hijriYear,
    days,
    leadingBlanks: firstWeekday,
    source: 'local',
  };
}

export function gregorianToHijriString(year: number, month: number, day: number): string {
  const jdn = gregorianToJdn(year, month, day);
  const h = jdnToHijri(jdn);
  return `${h.day} ${HIJRI_MONTHS[(h.month - 1) % 12]} ${h.year} AH`;
}

export { HIJRI_MONTHS };
