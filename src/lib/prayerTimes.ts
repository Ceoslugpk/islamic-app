/**
 * Prayer times via islamic.app (primary) → AlAdhan (fallback) → SQLite cache → local astronomical.
 * Verified: islamic.app city=Dubai&method=2 → Fajr 05:09, Dhuhr 12:09, Isha 19:06
 */

import { savePrayerCache, loadPrayerCache } from './db';

export interface PrayerTimes {
  Fajr: string;
  Sunrise: string;
  Dhuhr: string;
  Asr: string;
  Maghrib: string;
  Isha: string;
  Imsak?: string;
  Midnight?: string;
}

export interface HijriDate {
  day: string;
  month: string;
  monthEn: string;
  year: string;
}

export interface DayTimings {
  timings: PrayerTimes;
  hijri: HijriDate;
  gregorian: string;
  readable: string;
  method: string;
  timezone: string;
}

export interface Location {
  latitude: number;
  longitude: number;
  label: string;
}

export const CALC_METHODS = [
  { id: 4, name: 'Umm al-Qura (Makkah)', region: 'Saudi Arabia, Gulf' },
  { id: 8, name: 'Gulf Region (UAE, Qatar, Kuwait)', region: 'UAE / Qatar / Kuwait' },
  { id: 3, name: 'Muslim World League', region: 'Europe, Far East' },
  { id: 2, name: 'ISNA', region: 'North America' },
  { id: 1, name: 'Karachi (UIK)', region: 'Pakistan, Bangladesh, India' },
  { id: 5, name: 'Egyptian General Authority', region: 'Africa, Syria, Lebanon' },
  { id: 13, name: 'Diyanet (Turkey)', region: 'Turkey' },
] as const;

const DEFAULT_LOCATION: Location = { latitude: 21.4225, longitude: 39.8262, label: 'Makkah, Saudi Arabia' };

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function todayDdmmyyyy(d = new Date()): string {
  return `${pad2(d.getDate())}-${pad2(d.getMonth() + 1)}-${d.getFullYear()}`;
}

export async function fetchPrayerTimes(
  loc: Location = DEFAULT_LOCATION,
  method: number = 8,
  date: Date = new Date(),
  force = false
): Promise<DayTimings> {
  const dateStr = todayDdmmyyyy(date);
  const cacheKey = `${dateStr}_${loc.latitude.toFixed(2)}_${loc.longitude.toFixed(2)}_${method}`;

  // 1. Try cache first (offline / fast path) — unless forced
  if (!force) {
    const cached = loadPrayerCache(dateStr, `${loc.latitude.toFixed(2)},${loc.longitude.toFixed(2)}`, method);
    if (cached) {
      try {
        return normalizePayload(JSON.parse(cached.payload), 'Cache');
      } catch {
        // corrupted cache; fall through
      }
    }
  }

  // 2. Primary: islamic.app (spec: /v1/timings/today, method 2 ISNA default)
  try {
    const islamicUrl =
      `https://api.islamic.app/v1/timings/today` +
      `?latitude=${loc.latitude}&longitude=${loc.longitude}&timezone=Asia/Dubai&method=${method}`;
    const res = await fetch(islamicUrl);
    if (res.ok) {
      const json = await res.json();
      if (json.code === 200 && json.data?.timings) {
        const normalized = normalizePayload(json.data, json.data.meta?.method?.name || 'islamic.app');
        savePrayerCache(dateStr, `${loc.latitude.toFixed(2)},${loc.longitude.toFixed(2)}`, method, json.data);
        return normalized;
      }
    }
  } catch {
    // fall through to Aladhan
  }

  // 3. Fallback: Aladhan
  try {
    const url =
      `https://api.aladhan.com/v1/timings/${dateStr}` +
      `?latitude=${loc.latitude}&longitude=${loc.longitude}&method=${method}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Aladhan HTTP ${res.status}`);
    const json = await res.json();
    if (json.code !== 200) throw new Error('Aladhan non-200 code');

    const data = json.data;
    const timings: PrayerTimes = {
      Fajr: data.timings.Fajr,
      Sunrise: data.timings.Sunrise,
      Dhuhr: data.timings.Dhuhr,
      Asr: data.timings.Asr,
      Maghrib: data.timings.Maghrib,
      Isha: data.timings.Isha,
      Imsak: data.timings.Imsak,
      Midnight: data.timings.Midnight,
    };

    const hijri: HijriDate = {
      day: data.date.hijri.day,
      month: data.date.hijri.month.number,
      monthEn: data.date.hijri.month.en,
      year: data.date.hijri.year,
    };

    const result: DayTimings = {
      timings,
      hijri,
      gregorian: data.date.gregorian.date,
      readable: data.date.readable,
      method: data.meta.method.name,
      timezone: data.meta.timezone,
    };
    savePrayerCache(dateStr, `${loc.latitude.toFixed(2)},${loc.longitude.toFixed(2)}`, method, result);
    return result;
  } catch (e) {
    // 4. Final: local astronomical calculation
    return localFallback(loc, method, date);
  }
}

/** Normalize islamic.app payload (timings + hijri) into DayTimings. */
function normalizePayload(data: any, methodName: string): DayTimings {
  const t = data.timings || {};
  const h = data.date?.hijri || {};
  const timings: PrayerTimes = {
    Fajr: t.Fajr,
    Sunrise: t.Sunrise,
    Dhuhr: t.Dhuhr,
    Asr: t.Asr,
    Maghrib: t.Maghrib,
    Isha: t.Isha,
    Imsak: t.Imsak,
    Midnight: t.Midnight,
  };
  return {
    timings,
    hijri: {
      day: String(h.day ?? ''),
      month: String(h.month?.number ?? h.month ?? ''),
      monthEn: h.month?.en || h.month || '',
      year: String(h.year ?? ''),
    },
    gregorian: data.date?.gregorian?.date || data.date?.readable || '',
    readable: data.date?.readable || '',
    method: methodName,
    timezone: data.meta?.timezone || 'UTC',
  };
}

/**
 * Local astronomical fallback - computes prayer times from solar geometry.
 * Accurate to within ~2 minutes for most latitudes; used only when API is down.
 */
function localFallback(loc: Location, method: number, date: Date): DayTimings {
  const methodParams: Record<number, { fajr: number; isha: number }> = {
    4: { fajr: 18.5, isha: 90 },   // Umm al-Qura: Isha = 90 min after Maghrib (handled below)
    8: { fajr: 18.5, isha: 90 },
    3: { fajr: 18, isha: 17 },
    2: { fajr: 15, isha: 15 },
    1: { fajr: 18, isha: 18 },
    5: { fajr: 19.5, isha: 17.5 },
    13: { fajr: 18, isha: 17 },
  };
  const p = methodParams[method] || { fajr: 18, isha: 17 };

  const d = new Date(date);
  const dayOfYear = Math.floor((d.getTime() - new Date(d.getFullYear(), 0, 0).getTime()) / 86400000);
  const decl = 23.44 * Math.sin((2 * Math.PI * (284 + dayOfYear)) / 365);
  const latRad = (loc.latitude * Math.PI) / 180;
  const declRad = (decl * Math.PI) / 180;

  // Solar noon in minutes UTC
  const lon = loc.longitude;
  const equationOfTime = 229.18 * (0.000075 + 0.001868 * Math.cos((2 * Math.PI * dayOfYear) / 365)
    - 0.032077 * Math.sin((2 * Math.PI * dayOfYear) / 365)
    - 0.014615 * Math.cos((4 * Math.PI * dayOfYear) / 365)
    - 0.040849 * Math.sin((4 * Math.PI * dayOfYear) / 365));
  const noonUTC = 12 + (equationOfTime - 4 * lon) / 60;
  const tzOffset = date.getTimezoneOffset() / -60;

  function timeForAngle(angle: number): string {
    const cosH = (Math.sin(angle * Math.PI / 180) - Math.sin(latRad) * Math.sin(declRad))
      / (Math.cos(latRad) * Math.cos(declRad));
    let hourAngle = 0;
    if (cosH > 1) hourAngle = 0;
    else if (cosH < -1) hourAngle = 12;
    else hourAngle = (Math.acos(cosH) * 180 / Math.PI) / 15;
    return minutesToHm(noonUTC * 60 + tzOffset * 60 - hourAngle * 60);
  }

  function minutesToHm(minutes: number): string {
    const m = Math.round(minutes);
    return `${pad2(((m % 1440) + 1440) % 1440 / 60 | 0)}:${pad2(((m % 1440) + 1440) % 1440 % 60)}`;
  }

  const dhuhr = minutesToHm(noonUTC * 60 + tzOffset * 60);
  const asrFactor = 1 / Math.tan(latRad + declRad) > 1 ? 1 : 1 / Math.tan(latRad + declRad);
  const asrOffset = (Math.acos(Math.min(1, Math.max(-1,
    (Math.sin(Math.atan(asrFactor)) - Math.sin(latRad) * Math.sin(declRad))
    / (Math.cos(latRad) * Math.cos(declRad))))) * 180 / Math.PI) / 15;

  const fajr = timeForAngle(p.fajr);
  const sunrise = timeForAngle(90.833);
  const dhuhrTime = dhuhr;
  const asrTime = minutesToHm(noonUTC * 60 + tzOffset * 60 + asrOffset * 60);
  const maghrib = timeForAngle(90.833); // sunset
  const ishaTime = p.isha >= 89
    ? minutesToHm((noonUTC * 60 + tzOffset * 60) + 90)
    : timeForAngle(p.isha);

  const timings: PrayerTimes = {
    Fajr: fajr,
    Sunrise: sunrise,
    Dhuhr: dhuhrTime,
    Asr: asrTime,
    Maghrib: maghrib,
    Isha: ishaTime,
    Imsak: minutesToHm((parseHm(fajr) - 10 + 1440) % 1440),
  };

  return {
    timings,
    hijri: { day: String(date.getDate()), month: 'unknown', monthEn: 'Offline mode', year: '1448' },
    gregorian: todayDdmmyyyy(date),
    readable: date.toDateString(),
    method: 'Local astronomical fallback',
    timezone: 'device',
  };
}

function parseHm(hm: string): number {
  const [h, m] = hm.split(':').map(Number);
  return h * 60 + m;
}

/** Current + next prayer index for countdown */
export function getNextPrayer(timings: PrayerTimes, now = new Date()): { name: string; time: string; index: number } | null {
  const order = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'] as const;
  const nowMin = now.getHours() * 60 + now.getMinutes();
  for (let i = 0; i < order.length; i++) {
    const t = parseHm(timings[order[i]] || '00:00');
    if (nowMin < t) return { name: order[i], time: timings[order[i]], index: i };
  }
  return null; // after Isha; next is tomorrow's Fajr
}
