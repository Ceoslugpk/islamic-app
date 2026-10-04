/**
 * ============================================================================
 * HOME-SCREEN WIDGETS DATA LAYER (Android & iOS)
 * ============================================================================
 * 
 * Pure, read-only data layer producing snapshots for home-screen widgets.
 * Designed to feed native iOS WidgetKit extensions and Android AppWidgetProvider
 * / Jetpack Glance widgets without altering the core app runtime or requiring
 * new npm dependencies.
 * 
 * NATIVE ARCHITECTURE OVERVIEW:
 * -----------------------------
 * 1. iOS (WidgetKit):
 *    - Real home-screen widgets execute in a separate process (`WidgetExtension`).
 *    - App Groups (`group.com.islamic.app`) share a directory container.
 *    - The main React Native app writes `WidgetBundle` JSON to `NSUserDefaults(suiteName: "group.com.islamic.app")`
 *      or shared file container whenever prayer cache updates or app backgrounds.
 *    - SwiftUI `TimelineProvider` reads this snapshot and builds timeline entries
 *      scheduled at prayer times.
 *    - Deep links use `widgetURL(URL(string: "salah://..."))`.
 * 
 * 2. Android (AppWidgetProvider / Jetpack Glance):
 *    - Android widgets run as RemoteViews in the SystemUI launcher process.
 *    - App writes `WidgetBundle` JSON to multi-process `SharedPreferences` or
 *      a local SQLite/file cache.
 *    - An `AppWidgetProvider` broadcast receiver responds to update broadcasts,
 *      midnight roll-overs, and WorkManager periodic alarms (circumventing the
 *      system 30-min minimum update clamp).
 *    - RemoteViews use PendingIntents to launch deep links (`salah://...`).
 * 
 * THE 4 WIDGETS:
 * --------------
 * 1. Next Prayer: Big time (Instrument Serif), uppercase prayer name (e.g. MAGHRIB),
 *    and live countdown ("in 42 min" / "Now").
 * 2. Prayer Progress: "TODAY" header + 5 rows with ✓/○ (Fajr, Dhuhr, Asr, Maghrib, Isha)
 *    and completion count / streak.
 * 3. Quran — Continue Reading: Last read position ("Al-Baqarah · 2:255") + "Continue →".
 * 4. Hijri Calendar: Big day number, month name ("Rabi' al-Awwal"), and year ("1448 AH").
 * 
 * See `docs/widgets.md` for full native implementation details and Swift/Kotlin code.
 * ============================================================================
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadPrayerCache, getSalahEntries, getSalahHistory, computeStreak } from './db';
import { PrayerTimes, Location, getNextPrayer } from './prayerTimes';
import { formatTime } from './timeFormat';
import { getReadingPosition } from './continuing';
import { SURAHS_114 } from './surahs114';
import { gregorianToHijriString, HIJRI_MONTHS } from './hijri';

/* -------------------------------------------------------------------------- */
/*                                  Types                                     */
/* -------------------------------------------------------------------------- */

export interface NextPrayerWidgetData {
  /** Uppercase prayer name, e.g. "MAGHRIB", "FAJR" */
  name: string;
  /** Title-case prayer name, e.g. "Maghrib", "Fajr" */
  rawName: string;
  /** Formatted time for display (e.g. "6:14 PM" or "18:14") */
  time: string;
  /** Raw HH:MM string */
  rawTime: string;
  /** Remaining milliseconds until this prayer */
  countdownMs: number;
  /** Human-readable countdown string (e.g. "in 42 min", "in 1h 15m", "Now") */
  countdownText: string;
  /** True if this is tomorrow's Fajr (after Isha) */
  isTomorrow: boolean;
  /** True if valid prayer timings were loaded from cache */
  hasData: boolean;
  /** Fallback message when data is missing ("Open app to load times") */
  fallbackText?: string;
  /** Location display string */
  locationLabel: string;
  /** Fraction (0..1) of the current prayer interval elapsed */
  progressFraction: number;
}

export interface PrayerProgressItem {
  name: 'Fajr' | 'Dhuhr' | 'Asr' | 'Maghrib' | 'Isha';
  completed: boolean;
  symbol: '✓' | '○';
}

export interface PrayerProgressWidgetData {
  label: 'TODAY';
  dateIso: string;
  completedCount: number;
  totalCount: number;
  prayers: PrayerProgressItem[];
  streak: number;
  allCompleted: boolean;
}

export interface ContinueReadingWidgetData {
  surahNumber: number;
  ayahNumber: number;
  surahEnglishName: string;
  surahArabicName: string;
  /** E.g. "Al-Baqarah · 2:255" or "Start reading" */
  reference: string;
  actionText: string;
  hasPosition: boolean;
  fallbackText?: string;
  savedAt: number;
  /** Deep link URL to open this ayah in the reader */
  deepLink: string;
}

export interface HijriWidgetData {
  /** Day of Hijri month as big display number (e.g. "4" or "20") */
  day: string;
  /** Hijri month name (e.g. "Rabi' al-Awwal") */
  month: string;
  /** Hijri year with AH suffix (e.g. "1448 AH") */
  year: string;
  /** Combined label, e.g. "4 Rabi' al-Awwal 1448 AH" */
  fullString: string;
  /** English day of week, e.g. "Sunday" */
  weekday: string;
  /** Gregorian date string, e.g. "4 October 2026" */
  gregorianDate: string;
}

export interface WidgetBundle {
  nextPrayer: NextPrayerWidgetData;
  prayerProgress: PrayerProgressWidgetData;
  continueReading: ContinueReadingWidgetData;
  hijri: HijriWidgetData;
  generatedAt: number;
}

export interface WidgetPrayerOptions {
  now?: Date;
  location?: Location;
  method?: number;
  timeFormat?: '12h' | '24h';
  timings?: PrayerTimes;
}

export interface WidgetProgressOptions {
  now?: Date;
  entries?: Record<string, boolean>;
}

export interface WidgetOptions extends WidgetPrayerOptions {
  salahEntries?: Record<string, boolean>;
  cachedHijri?: { day: string; month: string; monthEn: string; year: string };
}

/* -------------------------------------------------------------------------- */
/*                                  Helpers                                   */
/* -------------------------------------------------------------------------- */

const DEFAULT_LOCATION: Location = {
  latitude: 25.2048,
  longitude: 55.2708,
  label: 'Dubai, UAE',
};

const DAILY_PRAYERS: ('Fajr' | 'Dhuhr' | 'Asr' | 'Maghrib' | 'Isha')[] = [
  'Fajr',
  'Dhuhr',
  'Asr',
  'Maghrib',
  'Isha',
];

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function todayDdmmyyyy(d = new Date()): string {
  return `${pad2(d.getDate())}-${pad2(d.getMonth() + 1)}-${d.getFullYear()}`;
}

function parseHm(hm: string): number {
  if (!hm || !hm.includes(':')) return 0;
  const [h, m] = hm.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

/** Formats remaining milliseconds into a user-friendly widget countdown text */
export function formatWidgetCountdown(ms: number): string {
  const totalMin = Math.floor(Math.max(0, ms) / 60000);
  if (totalMin < 1) return 'Now';
  const hours = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  if (hours > 0) {
    return mins > 0 ? `in ${hours}h ${mins}m` : `in ${hours}h`;
  }
  return `in ${mins} min`;
}

/* -------------------------------------------------------------------------- */
/*                        1. Next Prayer Widget Data                          */
/* -------------------------------------------------------------------------- */

/**
 * Produces the snapshot for Widget 1: Next Prayer.
 * Reads cached prayer timings from SQLite/localStorage (`loadPrayerCache`)
 * and calculates the upcoming prayer and live countdown.
 * Read-only — never executes network calls or writes to storage.
 */
export async function getNextPrayerWidgetData(
  options: WidgetPrayerOptions = {}
): Promise<NextPrayerWidgetData> {
  const now = options.now || new Date();
  const dateStr = todayDdmmyyyy(now);

  let method = options.method ?? 8;
  let loc = options.location || DEFAULT_LOCATION;
  let timeFormat = options.timeFormat ?? '12h';

  // Read stored preferences from AsyncStorage if options not provided
  try {
    const rawSettings = await AsyncStorage.getItem('islamic-settings');
    if (rawSettings) {
      const s = JSON.parse(rawSettings);
      if (!options.method && typeof s.methodId === 'number') {
        method = s.methodId;
      }
      if (!options.location) {
        if (s.locationMode === 'auto' && s.autoLocation) {
          loc = s.autoLocation;
        } else if (s.manualLocation) {
          loc = s.manualLocation;
        }
      }
      if (!options.timeFormat && (s.timeFormat === '12h' || s.timeFormat === '24h')) {
        timeFormat = s.timeFormat;
      }
    }
  } catch {
    // Ignore storage parse issues; fallback to defaults
  }

  let timings: PrayerTimes | null = options.timings || null;

  // If timings weren't passed directly, look up the cache
  if (!timings) {
    const locKey = `${loc.latitude.toFixed(2)},${loc.longitude.toFixed(2)}`;
    let cached = loadPrayerCache(dateStr, locKey, method);

    // Fallback: try default Dubai coordinates if custom location is not cached
    if (!cached && locKey !== '25.20,55.27') {
      cached = loadPrayerCache(dateStr, '25.20,55.27', method) || loadPrayerCache(dateStr, '25.20,55.27', 8);
    }

    if (cached) {
      try {
        let payload: any = cached.payload;
        if (typeof payload === 'string') {
          payload = JSON.parse(payload);
        }
        if (payload?.timings) {
          timings = payload.timings;
        } else if (payload?.data?.timings) {
          timings = payload.data.timings;
        }
      } catch {
        timings = null;
      }
    }
  }

  // Fallback empty state when no cache is available
  if (!timings || !timings.Fajr) {
    return {
      name: '',
      rawName: '',
      time: '--:--',
      rawTime: '',
      countdownMs: 0,
      countdownText: 'Open app to load times',
      isTomorrow: false,
      hasData: false,
      fallbackText: 'Open app to load times',
      locationLabel: loc.label || 'Location',
      progressFraction: 0,
    };
  }

  // Calculate upcoming prayer
  const next = getNextPrayer(timings, now);
  const isTomorrow = !next;
  const rawName = next ? next.name : 'Fajr';
  const rawTime = next ? next.time : timings.Fajr;
  const name = rawName.toUpperCase();

  const nowMin = now.getHours() * 60 + now.getMinutes();
  const targetMinFromHm = parseHm(rawTime);
  let targetMin = targetMinFromHm;
  if (isTomorrow || targetMin <= nowMin) {
    targetMin += 1440;
  }

  const diffMs = Math.max(0, (targetMin - nowMin) * 60000 - now.getSeconds() * 1000);
  const countdownText = formatWidgetCountdown(diffMs);
  const formattedTime = formatTime(rawTime, timeFormat);

  // Calculate progress fraction of current interval
  let progressFraction = 0;
  const order: (keyof PrayerTimes)[] = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
  if (next) {
    let prevMin = 0;
    const nextMin = parseHm(next.time);
    if (next.index > 0) {
      const prevKey = order[next.index - 1];
      prevMin = parseHm(timings[prevKey] || '00:00');
    } else {
      prevMin = parseHm(timings.Isha || '00:00') - 1440;
    }
    const interval = nextMin - prevMin;
    if (interval > 0) {
      progressFraction = Math.min(1, Math.max(0, (nowMin - prevMin) / interval));
    }
  } else {
    // After Isha: interval is from Isha to tomorrow's Fajr
    const prevMin = parseHm(timings.Isha || '00:00');
    const nextMin = parseHm(timings.Fajr || '00:00') + 1440;
    const interval = nextMin - prevMin;
    if (interval > 0) {
      progressFraction = Math.min(1, Math.max(0, (nowMin - prevMin) / interval));
    }
  }

  return {
    name,
    rawName,
    time: formattedTime,
    rawTime,
    countdownMs: diffMs,
    countdownText,
    isTomorrow,
    hasData: true,
    locationLabel: loc.label || 'Dubai, UAE',
    progressFraction: Math.round(progressFraction * 100) / 100,
  };
}

/* -------------------------------------------------------------------------- */
/*                      2. Prayer Progress Widget Data                        */
/* -------------------------------------------------------------------------- */

/**
 * Produces the snapshot for Widget 2: Prayer Progress.
 * Reads today's 5 prayer completions from `salah_entries` via `getSalahEntries`.
 * Synchronous pure read from SQLite / localStorage cache.
 */
export function getPrayerProgressWidgetData(
  options: WidgetProgressOptions = {}
): PrayerProgressWidgetData {
  const now = options.now || new Date();
  const iso = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
  const entries = options.entries || getSalahEntries(iso);

  const prayers: PrayerProgressItem[] = DAILY_PRAYERS.map((name) => {
    const completed = !!entries[name];
    return {
      name,
      completed,
      symbol: completed ? '✓' : '○',
    };
  });

  const completedCount = prayers.filter((p) => p.completed).length;

  let streak = 0;
  try {
    const history = getSalahHistory(30);
    streak = computeStreak(history);
  } catch {
    streak = 0;
  }

  return {
    label: 'TODAY',
    dateIso: iso,
    completedCount,
    totalCount: 5,
    prayers,
    streak,
    allCompleted: completedCount === 5,
  };
}

/* -------------------------------------------------------------------------- */
/*                    3. Quran Continue Reading Widget Data                   */
/* -------------------------------------------------------------------------- */

/**
 * Produces the snapshot for Widget 3: Quran Continue Reading.
 * Reads the latest reading position from `continuing.ts` (`quran-last-reading`).
 * Looks up English and Arabic Surah names from `SURAHS_114`.
 */
export async function getContinueReadingWidgetData(): Promise<ContinueReadingWidgetData> {
  const position = await getReadingPosition();

  if (
    position &&
    typeof position.surah === 'number' &&
    position.surah >= 1 &&
    position.surah <= 114
  ) {
    const surah = SURAHS_114.find((s) => s.number === position.surah);
    const surahEnglishName = surah?.englishName || `Surah ${position.surah}`;
    const surahArabicName = surah?.name || '';
    const reference = `${surahEnglishName} · ${position.surah}:${position.ayah}`;
    const deepLink = `salah://quran/${position.surah}/${position.ayah}`;

    return {
      surahNumber: position.surah,
      ayahNumber: position.ayah,
      surahEnglishName,
      surahArabicName,
      reference,
      actionText: 'Continue →',
      hasPosition: true,
      savedAt: position.savedAt,
      deepLink,
    };
  }

  // Fallback empty state when user hasn't started reading yet
  return {
    surahNumber: 1,
    ayahNumber: 1,
    surahEnglishName: 'Al-Fatihah',
    surahArabicName: 'الفَاتِحة',
    reference: 'Start reading',
    actionText: 'Continue →',
    hasPosition: false,
    fallbackText: 'Start reading',
    savedAt: 0,
    deepLink: 'salah://quran/1/1',
  };
}

/* -------------------------------------------------------------------------- */
/*                         4. Hijri Widget Data                               */
/* -------------------------------------------------------------------------- */

/**
 * Produces the snapshot for Widget 4: Hijri Calendar.
 * Uses cached Hijri data if available or computes offline tabular calculation
 * via `gregorianToHijriString`.
 */
export function getHijriWidgetData(
  date = new Date(),
  cachedHijri?: { day: string; month: string; monthEn: string; year: string }
): HijriWidgetData {
  const weekdayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const weekday = weekdayNames[date.getDay()];
  const gregorianDate = `${date.getDate()} ${monthNames[date.getMonth()]} ${date.getFullYear()}`;

  // If authoritative cached Hijri date exists from islamic.app / aladhan
  if (cachedHijri && cachedHijri.day && (cachedHijri.monthEn || cachedHijri.month)) {
    const rawMonth = cachedHijri.monthEn || cachedHijri.month;
    const month = rawMonth.replace(/\b\w/g, (c) => c.toUpperCase());
    const yearStr = cachedHijri.year ? (cachedHijri.year.includes('AH') ? cachedHijri.year : `${cachedHijri.year} AH`) : '1448 AH';
    const day = String(cachedHijri.day);
    return {
      day,
      month,
      year: yearStr,
      fullString: `${day} ${month} ${yearStr}`,
      weekday,
      gregorianDate,
    };
  }

  // Fallback: tabular calculation from hijri.ts
  const rawStr = gregorianToHijriString(date.getFullYear(), date.getMonth() + 1, date.getDate());
  // rawStr e.g. "4 Rabi' al-awwal 1448 AH"
  const parts = rawStr.split(' ');
  const day = parts[0] || String(date.getDate());
  const year = parts.slice(-2).join(' ') || '1448 AH';
  const rawMonthName = parts.slice(1, -2).join(' ') || HIJRI_MONTHS[0];
  const month = rawMonthName.replace(/\b\w/g, (c) => c.toUpperCase());

  return {
    day,
    month,
    year,
    fullString: `${day} ${month} ${year}`,
    weekday,
    gregorianDate,
  };
}

/* -------------------------------------------------------------------------- */
/*                      5. All-in-One Widget Bundle                           */
/* -------------------------------------------------------------------------- */

/**
 * Returns snapshots for all four widgets at once.
 * Suitable for refreshing the WidgetPreviewScreen and for writing to
 * shared native containers (App Groups UserDefaults on iOS, SharedPreferences on Android).
 */
export async function getWidgetBundle(options: WidgetOptions = {}): Promise<WidgetBundle> {
  const now = options.now || new Date();

  const [nextPrayer, continueReading] = await Promise.all([
    getNextPrayerWidgetData(options),
    getContinueReadingWidgetData(),
  ]);

  const prayerProgress = getPrayerProgressWidgetData({
    now,
    entries: options.salahEntries,
  });

  const hijri = getHijriWidgetData(now, options.cachedHijri);

  return {
    nextPrayer,
    prayerProgress,
    continueReading,
    hijri,
    generatedAt: Date.now(),
  };
}
