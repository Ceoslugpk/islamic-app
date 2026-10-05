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
 * AUTHORITATIVE CACHE CONTRACT:
 * - Widgets MUST use the SAME cached prayer data (date/location/timezone/method/
 *   madhab/adjustments) as Today + notifications.
 * - No second calculation system. No remote network calls inside widget refresh.
 * - Graceful fallback / offline handling with zero synthetic or fake verses.
 * ============================================================================
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadPrayerCache, getSalahEntries, getSalahHistory, computeStreak, loadQuranCache, loadLatestPrayerCache } from './db';
import { PrayerTimes, Location, getNextPrayer, getCachedPrayerTimes, normalizePayload, Madhab, DEFAULT_LOCATION } from './prayerTimes';
import { formatTime } from './timeFormat';
import { getReadingPosition } from './continuing';
import { SURAHS_114 } from './surahs114';
import { gregorianToHijriString, HIJRI_MONTHS } from './hijri';
import { qiblaBearing, distanceToKaabaKm } from './qibla';
import { DUAS_DATA, DuaItem } from './duas';

/* -------------------------------------------------------------------------- */
/*                                  Types                                     */
/* -------------------------------------------------------------------------- */

export interface PrayerScheduleItem {
  name: string;
  time: string;
  rawTime: string;
  isNext: boolean;
  isPassed: boolean;
}

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
  /** 5-prayer daily schedule for medium/large widgets */
  prayers: PrayerScheduleItem[];
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

export interface QuranVerseWidgetData {
  surahNumber: number;
  ayahNumber: number;
  surahEnglishName: string;
  surahArabicName: string;
  reference: string;
  arabicText: string;
  translationText: string;
  hasData: boolean;
  fallbackText?: string;
  deepLink: string;
}

export interface QiblaWidgetData {
  hasLocation: boolean;
  bearingDeg: number;
  bearingText: string;
  distanceKm: number;
  distanceText: string;
  locationLabel: string;
  statusText: string;
  deepLink: string;
}

export interface DuaWidgetData {
  id: string;
  title: string;
  category: string;
  arabicText: string;
  translationText: string;
  reference: string;
  deepLink: string;
}

export interface WidgetBundle {
  nextPrayer: NextPrayerWidgetData;
  prayerProgress: PrayerProgressWidgetData;
  continueReading: ContinueReadingWidgetData;
  hijri: HijriWidgetData;
  quranVerse: QuranVerseWidgetData;
  qibla: QiblaWidgetData;
  dua: DuaWidgetData;
  generatedAt: number;
}

export interface WidgetPrayerOptions {
  now?: Date;
  location?: Location;
  method?: number;
  timeFormat?: '12h' | '24h';
  timings?: PrayerTimes;
  madhab?: Madhab;
  adjustments?: Record<string, number>;
}

export interface WidgetProgressOptions {
  now?: Date;
  entries?: Record<string, boolean>;
}

export interface WidgetOptions extends WidgetPrayerOptions {
  salahEntries?: Record<string, boolean>;
  cachedHijri?: { day: string; month: string; monthEn: string; year: string };
  duaId?: string;
}

/* -------------------------------------------------------------------------- */
/*                                  Helpers                                   */
/* -------------------------------------------------------------------------- */


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

function getCompassDirection(bearing: number): string {
  const normalized = (bearing + 360) % 360;
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(normalized / 22.5) % 16;
  return directions[index] || 'N';
}

/* -------------------------------------------------------------------------- */
/*                        1. Next Prayer Widget Data                          */
/* -------------------------------------------------------------------------- */

/**
 * Produces the snapshot for Widget 1: Next Prayer & 5-Prayer Medium Schedule.
 * Reads cached prayer timings from SQLite/localStorage (`loadPrayerCache`)
 * using the SAME authoritative cache as Today + notifications.
 * Read-only — never executes network calls.
 */
export async function getNextPrayerWidgetData(
  options: WidgetPrayerOptions = {}
): Promise<NextPrayerWidgetData> {
  const now = options.now || new Date();
  const dateStr = todayDdmmyyyy(now);

  let method = options.method ?? 16;
  let loc = options.location || DEFAULT_LOCATION;
  let timeFormat = options.timeFormat ?? '12h';
  let madhab: Madhab = options.madhab ?? 'shafi';
  let adjustments = options.adjustments;

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
      if (!options.madhab && (s.madhab === 'shafi' || s.madhab === 'hanafi')) {
        madhab = s.madhab;
      }
      if (!options.adjustments && s.adjustments) {
        adjustments = s.adjustments;
      }
    }
  } catch {
    // Ignore storage parse issues; fallback to defaults
  }

  let timings: PrayerTimes | null = options.timings || null;

  // Look up authoritative cache if timings not passed directly
  if (!timings) {
    // 1. Authoritative primary lookup: exact same function & composite key as HomeScreen & notifications
    const cachedDay = getCachedPrayerTimes(loc, method, now, madhab, adjustments);
    if (cachedDay && cachedDay.timings && cachedDay.timings.Fajr) {
      timings = cachedDay.timings;
    }

    // 2. Date rollover / offline fallback: try latest cached prayer timings for this location or any location
    if (!timings) {
      const locKey = `${Number(loc.latitude).toFixed(4)},${Number(loc.longitude).toFixed(4)}`;
      const latest = loadLatestPrayerCache(locKey, method, madhab) || loadLatestPrayerCache(undefined, method, madhab) || loadLatestPrayerCache();
      if (latest) {
        try {
          const parsed = JSON.parse(latest.payload);
          const normalized = normalizePayload(parsed, parsed.method || 'Islamic.app');
          if (normalized && normalized.timings?.Fajr) {
            timings = normalized.timings;
          }
        } catch {}
      }
    }

    // 3. Fallback: try default Dubai coordinates if custom location is not cached
    if (!timings) {
      const dubaiCached = getCachedPrayerTimes(DEFAULT_LOCATION, 16, now, 'shafi');
      if (dubaiCached && dubaiCached.timings && dubaiCached.timings.Fajr) {
        timings = dubaiCached.timings;
      }
    }
  }

  // Fallback empty state when truly no cache is available (first install, never opened)
  if (!timings || !timings.Fajr) {
    const emptyPrayers: PrayerScheduleItem[] = DAILY_PRAYERS.map((p) => ({
      name: p,
      time: '--:--',
      rawTime: '',
      isNext: false,
      isPassed: false,
    }));

    return {
      name: 'ISLAMIC',
      rawName: 'Islamic',
      time: 'Open App',
      rawTime: '',
      countdownMs: 0,
      countdownText: 'Tap to load times',
      isTomorrow: false,
      hasData: false,
      fallbackText: 'Add prayer times by opening Islamic once',
      locationLabel: loc.label || 'Set Location',
      progressFraction: 0,
      prayers: emptyPrayers,
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
    const prevMin = parseHm(timings.Isha || '00:00');
    const nextMin = parseHm(timings.Fajr || '00:00') + 1440;
    const interval = nextMin - prevMin;
    if (interval > 0) {
      progressFraction = Math.min(1, Math.max(0, (nowMin - prevMin) / interval));
    }
  }

  // Build 5-prayer daily schedule with active / passed flags
  const prayers: PrayerScheduleItem[] = DAILY_PRAYERS.map((p) => {
    const pTime = timings ? timings[p] : '--:--';
    const pMin = parseHm(pTime || '');
    const isThisNext = next
      ? next.name.toLowerCase() === p.toLowerCase()
      : p === 'Fajr' && isTomorrow;
    const isPassed = !isTomorrow && nowMin > pMin;
    return {
      name: p,
      time: formatTime(pTime || '--:--', timeFormat),
      rawTime: pTime || '',
      isNext: isThisNext,
      isPassed,
    };
  });

  return {
    name,
    rawName,
    time: formattedTime,
    rawTime,
    countdownMs: diffMs,
    countdownText,
    isTomorrow,
    hasData: true,
    locationLabel: loc.label || 'Makkah, Saudi Arabia',
    progressFraction: Math.round(progressFraction * 100) / 100,
    prayers,
  };
}

/* -------------------------------------------------------------------------- */
/*                      2. Prayer Progress Widget Data                        */
/* -------------------------------------------------------------------------- */

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

  const rawStr = gregorianToHijriString(date.getFullYear(), date.getMonth() + 1, date.getDate());
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
/*                    5. Quran Verse of the Day Widget Data                   */
/* -------------------------------------------------------------------------- */

export async function getQuranVerseWidgetData(): Promise<QuranVerseWidgetData> {
  // Check reading position first
  const pos = await getReadingPosition();
  const surahNum = pos?.surah && pos.surah >= 1 && pos.surah <= 114 ? pos.surah : 1;
  const ayahNum = pos?.ayah && pos.ayah >= 1 ? pos.ayah : 1;

  // Try to load cached surah from local SQLite / web cache
  let cachedSurah = loadQuranCache<any>(`surah:${surahNum}:en.sahih`);
  if (!cachedSurah && surahNum !== 1) {
    cachedSurah = loadQuranCache<any>('surah:1:en.sahih');
  }

  const surahMeta = SURAHS_114.find((s) => s.number === surahNum) || SURAHS_114[0];

  if (cachedSurah?.ayahs && Array.isArray(cachedSurah.ayahs) && cachedSurah.ayahs.length > 0) {
    const match = cachedSurah.ayahs.find((a: any) => a.numberInSurah === ayahNum) || cachedSurah.ayahs[0];
    const actualAyah = match.numberInSurah || 1;
    return {
      surahNumber: surahMeta.number,
      ayahNumber: actualAyah,
      surahEnglishName: surahMeta.englishName,
      surahArabicName: surahMeta.name,
      reference: `${surahMeta.englishName} ${surahMeta.number}:${actualAyah}`,
      arabicText: match.text || '',
      translationText: match.translation || '',
      hasData: true,
      deepLink: `salah://quran/${surahMeta.number}/${actualAyah}`,
    };
  }

  // Graceful initial state — Al-Fatihah 1:1 (Bismillah) is always authentic
  return {
    surahNumber: 1,
    ayahNumber: 1,
    surahEnglishName: 'Al-Fatihah',
    surahArabicName: 'الفَاتِحة',
    reference: 'Al-Fatihah 1:1',
    arabicText: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',
    translationText: 'In the name of Allah, the Entirely Merciful, the Especially Merciful.',
    hasData: true,
    fallbackText: 'Read Quran',
    deepLink: 'salah://quran/1/1',
  };
}

/* -------------------------------------------------------------------------- */
/*                         6. Qibla Widget Data                               */
/* -------------------------------------------------------------------------- */

export async function getQiblaWidgetData(options: WidgetPrayerOptions = {}): Promise<QiblaWidgetData> {
  let loc = options.location;

  if (!loc) {
    try {
      const rawSettings = await AsyncStorage.getItem('islamic-settings');
      if (rawSettings) {
        const s = JSON.parse(rawSettings);
        if (s.locationMode === 'auto' && s.autoLocation) {
          loc = s.autoLocation;
        } else if (s.manualLocation) {
          loc = s.manualLocation;
        }
      }
    } catch {
      // ignore
    }
  }

  if (!loc || typeof loc.latitude !== 'number' || typeof loc.longitude !== 'number') {
    return {
      hasLocation: false,
      bearingDeg: 0,
      bearingText: '--°',
      distanceKm: 0,
      distanceText: 'Location unavailable',
      locationLabel: 'Set Location in App',
      statusText: 'Open app to align Qibla',
      deepLink: 'salah://qibla',
    };
  }

  const rawBearing = qiblaBearing(loc.latitude, loc.longitude);
  const bearing = Math.round(rawBearing);
  const dir = getCompassDirection(bearing);
  const dist = Math.round(distanceToKaabaKm(loc.latitude, loc.longitude));

  return {
    hasLocation: true,
    bearingDeg: bearing,
    bearingText: `${bearing}° ${dir}`,
    distanceKm: dist,
    distanceText: `${dist.toLocaleString()} km to Makkah`,
    locationLabel: loc.label || 'Your Location',
    statusText: 'Qibla Direction',
    deepLink: 'salah://qibla',
  };
}

/* -------------------------------------------------------------------------- */
/*                         7. Dua & Adhkar Widget Data                        */
/* -------------------------------------------------------------------------- */

export function getDuaWidgetData(options: WidgetOptions = {}): DuaWidgetData {
  const now = options.now || new Date();
  const hour = now.getHours();

  let selected: DuaItem = DUAS_DATA[0];

  if (options.duaId) {
    const found = DUAS_DATA.find((d) => d.id === options.duaId);
    if (found) selected = found;
  } else if (hour >= 5 && hour < 12) {
    // Morning Remembrance
    selected = DUAS_DATA.find((d) => d.category === 'Morning') || DUAS_DATA[0];
  } else if (hour >= 16 && hour < 22) {
    // Evening Remembrance
    selected = DUAS_DATA.find((d) => d.category === 'Evening') || DUAS_DATA[1];
  } else {
    // Distress / Protection / Daily
    selected = DUAS_DATA.find((d) => d.id === 'after-salah') || DUAS_DATA[0];
  }

  return {
    id: selected.id,
    title: selected.title,
    category: selected.category,
    arabicText: selected.arabic,
    translationText: selected.translation,
    reference: selected.reference,
    deepLink: `salah://duas/${selected.id}`,
  };
}

/* -------------------------------------------------------------------------- */
/*                      8. All-in-One Widget Bundle                           */
/* -------------------------------------------------------------------------- */

export async function getWidgetBundle(options: WidgetOptions = {}): Promise<WidgetBundle> {
  const now = options.now || new Date();

  const [nextPrayer, continueReading, quranVerse, qibla] = await Promise.all([
    getNextPrayerWidgetData(options),
    getContinueReadingWidgetData(),
    getQuranVerseWidgetData(),
    getQiblaWidgetData(options),
  ]);

  const prayerProgress = getPrayerProgressWidgetData({
    now,
    entries: options.salahEntries,
  });

  const hijri = getHijriWidgetData(now, options.cachedHijri);
  const dua = getDuaWidgetData(options);

  return {
    nextPrayer,
    prayerProgress,
    continueReading,
    hijri,
    quranVerse,
    qibla,
    dua,
    generatedAt: Date.now(),
  };
}
