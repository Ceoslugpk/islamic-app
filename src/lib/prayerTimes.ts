/**
 * Prayer times via Islamic.app (authoritative single provider) → SQLite cache (offline fallback).
 * NO AlAdhan for prayer times. NO local astronomical fallback in production.
 */

import { savePrayerCache, loadPrayerCache } from './db';
import { isAppOnline } from './useConnectivity';
import type { Madhab } from './settings';

export { Madhab };

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

export const DEFAULT_LOCATION: Location = { latitude: 21.4225, longitude: 39.8262, label: 'Makkah, Saudi Arabia' };

export function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export function todayDdmmyyyy(d = new Date()): string {
  return `${pad2(d.getDate())}-${pad2(d.getMonth() + 1)}-${d.getFullYear()}`;
}

export function buildPrayerCacheKey(
  dateStr: string,
  loc: Location,
  method: number,
  madhab: Madhab = 'shafi',
  adjustments?: Record<string, number> | string
): string {
  const latStr = Number(loc.latitude).toFixed(4);
  const lngStr = Number(loc.longitude).toFixed(4);
  const labelStr = (loc.label || '').trim().toLowerCase();
  const madhabStr = (madhab || 'shafi').toLowerCase();
  const adjStr = typeof adjustments === 'string'
    ? adjustments
    : adjustments ? JSON.stringify(adjustments) : '';
  return `prayer:${dateStr}:${labelStr}:${latStr},${lngStr}:${method}:${madhabStr}:${adjStr}`;
}

function getDeviceTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

function isValidTime(t: any): boolean {
  if (typeof t !== 'string') return false;
  return /^\d{1,2}:\d{2}/.test(t.trim());
}

function cleanTime(t: string): string {
  const match = t.trim().match(/^(\d{1,2}:\d{2})/);
  return match ? match[1] : t.trim();
}

/** Normalize and strictly validate Islamic.app payload or cached DayTimings into DayTimings. */
export function normalizePayload(data: any, methodName = 'Islamic.app'): DayTimings | null {
  if (!data || typeof data !== 'object') {
    return null;
  }

  // 1. If data is already a normalized DayTimings object (e.g. loaded from cache)
  if (data.timings && data.hijri && (data.hijri.day !== undefined || data.hijri.monthEn !== undefined)) {
    const t = data.timings;
    if (isValidTime(t.Fajr) && isValidTime(t.Dhuhr) && isValidTime(t.Asr) && isValidTime(t.Maghrib) && isValidTime(t.Isha)) {
      return {
        timings: {
          Fajr: cleanTime(t.Fajr),
          Sunrise: cleanTime(t.Sunrise || '06:00'),
          Dhuhr: cleanTime(t.Dhuhr),
          Asr: cleanTime(t.Asr),
          Maghrib: cleanTime(t.Maghrib),
          Isha: cleanTime(t.Isha),
          Imsak: t.Imsak ? cleanTime(t.Imsak) : undefined,
          Midnight: t.Midnight ? cleanTime(t.Midnight) : undefined,
        },
        hijri: {
          day: String(data.hijri.day ?? ''),
          month: String(data.hijri.month?.number ?? data.hijri.month ?? ''),
          monthEn: String(data.hijri.month?.en ?? data.hijri.monthEn ?? ''),
          year: String(data.hijri.year ?? ''),
        },
        gregorian: String(data.gregorian || data.readable || ''),
        readable: String(data.readable || data.gregorian || ''),
        method: String(data.method || methodName),
        timezone: String(data.timezone || 'UTC'),
      };
    }
    return null;
  }

  // 2. Raw islamic.app API payload
  const root = data.data ? data.data : data;
  const t = root.timings;
  if (!t || !isValidTime(t.Fajr) || !isValidTime(t.Dhuhr) || !isValidTime(t.Asr) || !isValidTime(t.Maghrib) || !isValidTime(t.Isha)) {
    return null;
  }

  const h = root.date?.hijri || root.hijri || {};
  const dayVal = h.day !== undefined ? String(h.day) : '';
  const monthNum = h.month ? String(h.month.number ?? h.month) : '';
  const monthEn = h.month?.en ? String(h.month.en) : typeof h.month === 'string' ? h.month : '';
  const yearVal = h.year !== undefined ? String(h.year) : '';
  const greg = root.date?.readable || root.date?.gregorian?.date || root.gregorian || '';

  return {
    timings: {
      Fajr: cleanTime(t.Fajr),
      Sunrise: cleanTime(t.Sunrise || '06:00'),
      Dhuhr: cleanTime(t.Dhuhr),
      Asr: cleanTime(t.Asr),
      Maghrib: cleanTime(t.Maghrib),
      Isha: cleanTime(t.Isha),
      Imsak: t.Imsak ? cleanTime(t.Imsak) : undefined,
      Midnight: t.Midnight ? cleanTime(t.Midnight) : undefined,
    },
    hijri: {
      day: dayVal,
      month: monthNum,
      monthEn: monthEn,
      year: yearVal,
    },
    gregorian: String(greg),
    readable: String(root.date?.readable || greg || ''),
    method: String(root.meta?.school ? `Islamic.app (${root.meta.school})` : methodName),
    timezone: String(root.meta?.timezone || 'UTC'),
  };
}

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 5000): Promise<Response> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout>;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      try { controller.abort(); } catch {}
      reject(new Error(`Timeout of ${timeoutMs}ms exceeded for ${url}`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([
      fetch(url, { ...options, signal: controller.signal }),
      timeoutPromise,
    ]);
  } finally {
    clearTimeout(timer!);
  }
}

/** Check SQLite/local cache for the exact day's schedule matching config */
export function getCachedPrayerTimes(
  loc: Location = DEFAULT_LOCATION,
  method: number = 8,
  date: Date = new Date(),
  madhab: Madhab = 'shafi',
  adjustments?: Record<string, number>
): DayTimings | null {
  const dateStr = todayDdmmyyyy(date);
  const cacheKey = buildPrayerCacheKey(dateStr, loc, method, madhab, adjustments);
  const cached = loadPrayerCache(cacheKey);
  if (cached) {
    try {
      const parsed = JSON.parse(cached.payload);
      const normalized = normalizePayload(parsed, parsed.method || 'Islamic.app');
      if (normalized && normalized.timings?.Fajr) {
        return normalized;
      }
    } catch {
      // corrupted entry
    }
  }

  // Backwards compatibility for legacy cache format
  const locKey = `${loc.latitude.toFixed(2)},${loc.longitude.toFixed(2)}`;
  const legacyCached = loadPrayerCache(dateStr, locKey, method, madhab);
  if (legacyCached) {
    try {
      const parsed = JSON.parse(legacyCached.payload);
      const normalized = normalizePayload(parsed, parsed.method || 'Islamic.app');
      if (normalized && normalized.timings?.Fajr) {
        return normalized;
      }
    } catch {}
  }
  return null;
}

export interface FetchPrayerTimesOptions {
  madhab?: Madhab;
  adjustments?: Record<string, number>;
  force?: boolean;
}

/**
 * Fetch prayer times from Islamic.app (ONLY authoritative remote provider) with SQLite offline cache.
 * NO AlAdhan. NO local astronomical fallback in production.
 */
export async function fetchPrayerTimes(
  loc: Location = DEFAULT_LOCATION,
  method: number = 8,
  date: Date = new Date(),
  forceOrOptions: boolean | FetchPrayerTimesOptions = false
): Promise<DayTimings> {
  const force = typeof forceOrOptions === 'boolean' ? forceOrOptions : !!forceOrOptions.force;
  const madhab: Madhab = typeof forceOrOptions === 'object' && forceOrOptions.madhab ? forceOrOptions.madhab : 'shafi';
  const adjustments = typeof forceOrOptions === 'object' ? forceOrOptions.adjustments : undefined;

  const dateStr = todayDdmmyyyy(date);
  const cacheKey = buildPrayerCacheKey(dateStr, loc, method, madhab, adjustments);
  const locKey = `${loc.latitude.toFixed(4)},${loc.longitude.toFixed(4)}`;

  // 1. Try cache first (offline / fast path) — unless forced
  if (!force) {
    const cached = getCachedPrayerTimes(loc, method, date, madhab, adjustments);
    if (cached) {
      return cached;
    }
  }

  // 2. Fast offline shortcut: if device is offline and not forced, return cached if exists, else error immediately (0ms)
  if (!force && !isAppOnline()) {
    const cached = getCachedPrayerTimes(loc, method, date, madhab, adjustments);
    if (cached) {
      return cached;
    }
    throw new Error('Prayer times unavailable offline');
  }

  // 3. Primary & ONLY remote provider: Islamic.app
  try {
    const tz = getDeviceTimezone();
    const schoolParam = madhab === 'hanafi' ? 1 : 0;
    const islamicUrl = `https://api.islamic.app/v1/timings/${dateStr}?latitude=${loc.latitude}&longitude=${loc.longitude}&method=${method}&timezone=${encodeURIComponent(tz)}&school=${schoolParam}`;

    const res = await fetchWithTimeout(islamicUrl, {}, 5000);
    if (res.ok) {
      const json = await res.json();
      if (json.code === 200 && json.data?.timings) {
        const normalized = normalizePayload(
          json.data,
          json.data.meta?.school ? `Islamic.app (${json.data.meta.school})` : 'Islamic.app'
        );
        if (normalized) {
          savePrayerCache(cacheKey, normalized, {
            date: dateStr,
            location: locKey,
            method,
            madhab,
          });
          return normalized;
        }
      }
    }
  } catch {
    // Network failure: fall through to cache
  }

  // 4. On failure: check today's cache immediately
  const fallbackCached = getCachedPrayerTimes(loc, method, date, madhab, adjustments);
  if (fallbackCached) {
    return fallbackCached;
  }

  // 5. No cache available -> unavailable offline error. Never substitute another provider.
  throw new Error('Prayer times unavailable offline');
}

export function parseHm(hm: string): number {
  const [h, m] = hm.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
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
