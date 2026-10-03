import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio, AVPlaybackStatus } from 'expo-av';
import {
  AudioSettings,
  loadAudioQueue,
  loadAudioSettings,
  PlaylistItem,
  saveAudioQueue,
  saveAudioSettings,
  saveRecentlyPlayed,
} from './db';

export interface PlaybackStatus {
  isPlaying: boolean;
  positionMillis: number;
  durationMillis: number;
  isLoaded: boolean;
  isBuffering: boolean;
  didJustFinish: boolean;
}

export interface Reciter {
  identifier: string;
  name: string;
  englishName: string;
  language: string;
}

const RECITERS_CACHE_KEY = 'reciters-cache';

/** Ayah counts for all 114 surahs to compute global ayah indices (1..6236). */
export const SURAH_AYAH_COUNTS = [
  7, 286, 200, 176, 120, 165, 206, 75, 129, 109,
  123, 111, 43, 52, 99, 128, 111, 110, 98, 135,
  112, 78, 118, 64, 77, 227, 93, 88, 69, 60,
  34, 30, 73, 54, 45, 83, 182, 88, 75, 85,
  54, 53, 89, 59, 37, 35, 38, 29, 18, 45,
  60, 49, 62, 55, 78, 96, 29, 22, 24, 13,
  14, 11, 11, 18, 12, 12, 30, 52, 52, 44,
  28, 28, 20, 56, 40, 31, 50, 40, 46, 42,
  29, 19, 36, 25, 22, 17, 19, 26, 30, 20,
  15, 21, 11, 8, 8, 19, 5, 8, 8, 11,
  11, 8, 3, 9, 5, 4, 7, 3, 6, 3,
  5, 4, 5, 6,
];

/** Aliases for deprecated or alternate edition identifiers. */
export const ALIAS_MAP: Record<string, string> = {
  'en.walk': 'en.everyayah-walk',
  'ur.khan': 'ur.everyayah-shamshad',
  'fa.hedayatfarfooladvand': 'fa.everyayah-hedayatfar',
  'ru.kuliev-audio-2': 'ru.kuliev-audio',
};

export interface EveryAyahConfig {
  subfolder: string;
  bitrate?: string;
}

/** Verified EveryAyah non-Arabic recitation/translation editions (3+3 surah+ayah pattern). */
export const EVERYAYAH_EDITIONS: Record<string, EveryAyahConfig> = {
  'en.everyayah-walk': {
    subfolder: 'English/Sahih_Intnl_Ibrahim_Walk_192kbps',
    bitrate: '192',
  },
  'fa.everyayah-kabiri': {
    subfolder: 'translations/Makarem_Kabiri_16Kbps',
    bitrate: '16',
  },
  'fa.everyayah-hedayatfar': {
    subfolder: 'translations/Fooladvand_Hedayatfar_40Kbps',
    bitrate: '40',
  },
  'az.everyayah-balayev': {
    subfolder: 'translations/azerbaijani/balayev',
    bitrate: '46',
  },
  'ur.everyayah-shamshad': {
    subfolder: 'translations/urdu_shamshad_ali_khan_46kbps',
    bitrate: '46',
  },
  'bs.everyayah-korkut': {
    subfolder: 'translations/besim_korkut_ajet_po_ajet',
    bitrate: '32',
  },
  'ur.everyayah-farhathashmi': {
    subfolder: 'translations/urdu_farhat_hashmi',
    bitrate: '32',
  },
};

/**
 * 13 verified non-Arabic audio editions (AlQuran Cloud CDN + EveryAyah).
 * Covers: English, Urdu, Chinese, French, Russian, Kazakh, Turkish, Uzbek, Persian, Azerbaijani, Bosnian.
 */
export const VERIFIED_NON_ARABIC_EDITIONS: Reciter[] = [
  // English (EveryAyah - Sahih International)
  {
    identifier: 'en.everyayah-walk',
    name: 'ابراہیم والک (انگریزی)',
    englishName: 'Sahih International (Ibrahim Walk)',
    language: 'en',
  },
  // Urdu (EveryAyah - Shamshad Ali Khan)
  {
    identifier: 'ur.everyayah-shamshad',
    name: 'شمشاد علی خان',
    englishName: 'Shamshad Ali Khan (Urdu)',
    language: 'ur',
  },
  // Urdu (EveryAyah - Farhat Hashmi word-for-word)
  {
    identifier: 'ur.everyayah-farhathashmi',
    name: 'ڈاکٹر فرحت ہاشمی',
    englishName: 'Dr. Farhat Hashmi (Urdu)',
    language: 'ur',
  },
  // Chinese (AlQuran Cloud CDN)
  {
    identifier: 'zh.chinese',
    name: '中文',
    englishName: 'Chinese Translation',
    language: 'zh',
  },
  // French (AlQuran Cloud CDN)
  {
    identifier: 'fr.leclerc',
    name: 'Youssouf Leclerc',
    englishName: 'Youssouf Leclerc (French)',
    language: 'fr',
  },
  // Russian (AlQuran Cloud CDN)
  {
    identifier: 'ru.kuliev-audio',
    name: 'Эльмир Кулиев',
    englishName: 'Elmir Kuliev (Russian)',
    language: 'ru',
  },
  // Turkish (AlQuran Cloud CDN)
  {
    identifier: 'tr.vakfi-audio',
    name: 'Diyanet Vakfı',
    englishName: 'Diyanet Vakfı (Turkish)',
    language: 'tr',
  },
  // Persian (EveryAyah - Makarem Kabiri)
  {
    identifier: 'fa.everyayah-kabiri',
    name: 'مکارم شیرازی (کبیری)',
    englishName: 'Makarem Shirazi - Kabiri (Persian)',
    language: 'fa',
  },
  // Persian (EveryAyah - Fooladvand Hedayatfar)
  {
    identifier: 'fa.everyayah-hedayatfar',
    name: 'فولادوند (هدایت‌فر)',
    englishName: 'Fooladvand - Hedayatfar (Persian)',
    language: 'fa',
  },
  // Azerbaijani (EveryAyah - Balayev)
  {
    identifier: 'az.everyayah-balayev',
    name: 'Rasim Balayev',
    englishName: 'Rasim Balayev (Azerbaijani)',
    language: 'az',
  },
  // Kazakh (AlQuran Cloud CDN)
  {
    identifier: 'kk.khalifahaltai-audio',
    name: 'Халифа Алтай',
    englishName: 'Khalifah Altai (Kazakh)',
    language: 'kk',
  },
  // Uzbek (AlQuran Cloud CDN)
  {
    identifier: 'uz.sodik-audio',
    name: 'Muhammad Sodik',
    englishName: 'Muhammad Sodik (Uzbek)',
    language: 'uz',
  },
  // Bosnian (EveryAyah - Besim Korkut)
  {
    identifier: 'bs.everyayah-korkut',
    name: 'Besim Korkut',
    englishName: 'Besim Korkut (Bosnian)',
    language: 'bs',
  },
];

/** Offline fallback reciters including prominent Arabic reciters and all 13 verified non-Arabic reciters. */
export const DEFAULT_RECITERS: Reciter[] = [
  { identifier: 'ar.alafasy', name: 'مشاري العفاسي', englishName: 'Mishari Rashid al-Afasy', language: 'ar' },
  { identifier: 'ar.abdulbasitmurattal', name: 'عبد الباسط عبد الصمد', englishName: 'Abdul Basit (Murattal)', language: 'ar' },
  { identifier: 'ar.abdullahbasfar', name: 'عبد الله بصفر', englishName: 'Abdullah Basfar', language: 'ar' },
  { identifier: 'ar.abdurrahmaansudais', name: 'عبد الرحمن السديس', englishName: 'Abdurrahmaan As-Sudais', language: 'ar' },
  { identifier: 'ar.abdulsamad', name: 'عبد الباسط عبد الصمد', englishName: 'Abdul Samad', language: 'ar' },
  { identifier: 'ar.hanirifai', name: 'هاني الرفاعي', englishName: 'Hani ar-Rifai', language: 'ar' },
  { identifier: 'ar.husary', name: 'محمود خليل الحصري', englishName: 'Mahmoud Khalil Al-Husary', language: 'ar' },
  { identifier: 'ar.minshawi', name: 'محمد صديق المنشاوي', englishName: 'Mohamed Siddiq Al-Minshawi', language: 'ar' },
  { identifier: 'ar.hudhaify', name: 'علي الحذيفي', englishName: 'Ali Al-Hudhaify', language: 'ar' },
  ...VERIFIED_NON_ARABIC_EDITIONS,
];

/** Specific non-128kbps editions hosted on AlQuran Cloud CDN or EveryAyah. */
const KNOWN_BITRATES: Record<string, string> = {
  'ar.abdulbasitmurattal': '192',
  'ar.abdullahbasfar': '192',
  'ar.abdurrahmaansudais': '192',
  'ar.abdulsamad': '64',
  'ar.hanirifai': '192',
  'ar.aymanswoaid': '64',
  'ru.kuliev-audio-2': '320',
  'en.everyayah-walk': '192',
  'en.walk': '192',
  'fa.everyayah-kabiri': '16',
  'fa.everyayah-hedayatfar': '40',
  'fa.hedayatfarfooladvand': '40',
  'az.everyayah-balayev': '46',
  'ur.everyayah-shamshad': '46',
  'ur.khan': '46',
  'bs.everyayah-korkut': '32',
  'ur.everyayah-farhathashmi': '32',
};

/** Editions on AlQuran Cloud API that return 403 on CDN and should be excluded in favor of verified sources. */
const BLOCKED_EDITIONS = new Set([
  'en.walk',
  'fa.hedayatfarfooladvand',
  'ur.khan',
  'ru.kuliev-audio-2',
  'en.misharyrashidalafasyenglishtranslationsaheehibrahimwalk',
  'en.muhammadayyubenglishtranslationmuhsinkhanmikaalwaters',
  'en.sudaisandshuraymenglishtranslationpickthallaslamathar',
  'my.hashimtinmyint',
]);

/** Convert 1-based (surah, ayah) to global Quranic ayah number (1..6236). */
export function getGlobalAyahNumber(surah: number, ayah: number): number {
  if (surah < 1 || surah > 114) return ayah;
  let offset = 0;
  for (let i = 0; i < surah - 1; i++) {
    offset += SURAH_AYAH_COUNTS[i];
  }
  return offset + ayah;
}

/** Check if an edition is verse-by-verse recitation / translation (all non-Arabic editions). */
export function isVerseByVerseEdition(identifier: string): boolean {
  const resolved = ALIAS_MAP[identifier] || identifier;
  if (EVERYAYAH_EDITIONS[resolved]) return true;
  return (
    resolved === 'zh.chinese' ||
    resolved === 'fr.leclerc' ||
    resolved === 'ru.kuliev-audio' ||
    resolved === 'kk.khalifahaltai-audio' ||
    resolved === 'tr.vakfi-audio' ||
    resolved === 'uz.sodik-audio'
  );
}

/**
 * Fetch reciters from AlQuran Cloud audio editions endpoint and merge with verified non-Arabic editions.
 * Arabic editions are prioritized first (default alafasy at index 0), followed by verified non-Arabic editions.
 * Results are cached in AsyncStorage under 'reciters-cache'.
 */
export async function fetchReciters(): Promise<Reciter[]> {
  let cachedReciters: Reciter[] | null = null;
  try {
    const rawCache = await AsyncStorage.getItem(RECITERS_CACHE_KEY);
    if (rawCache) {
      const parsed = JSON.parse(rawCache);
      if (Array.isArray(parsed) && parsed.length > 0) {
        cachedReciters = parsed;
      }
    }
  } catch {
    // Cache read failed; proceed to network request
  }

  try {
    const res = await fetch('https://api.alquran.cloud/v1/edition/format/audio');
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const json = await res.json();
    if (json.code !== 200 || !Array.isArray(json.data)) {
      throw new Error('Invalid API response');
    }

    const recitersFromApi: Reciter[] = json.data
      .filter((item: any) => !BLOCKED_EDITIONS.has(String(item.identifier ?? '')))
      .map((item: any) => ({
        identifier: String(item.identifier ?? ''),
        name: String(item.name ?? ''),
        englishName: String(item.englishName ?? ''),
        language: String(item.language ?? ''),
      }));

    // Split Arabic reciters
    const arabicReciters = recitersFromApi.filter((r) => r.language === 'ar');
    // Ensure default reciter ar.alafasy is at index 0
    const alafasyIdx = arabicReciters.findIndex((r) => r.identifier === 'ar.alafasy');
    if (alafasyIdx > 0) {
      const [alafasy] = arabicReciters.splice(alafasyIdx, 1);
      arabicReciters.unshift(alafasy);
    }

    // Merge non-Arabic: all verified non-Arabic editions
    const verifiedIds = new Set(VERIFIED_NON_ARABIC_EDITIONS.map((e) => e.identifier));
    const otherNonArabicFromApi = recitersFromApi.filter(
      (r) => r.language !== 'ar' && !verifiedIds.has(r.identifier)
    );

    const mergedReciters: Reciter[] = [
      ...arabicReciters,
      ...VERIFIED_NON_ARABIC_EDITIONS,
      ...otherNonArabicFromApi,
    ];

    try {
      await AsyncStorage.setItem(RECITERS_CACHE_KEY, JSON.stringify(mergedReciters));
    } catch {
      // Non-fatal write failure
    }

    return mergedReciters;
  } catch (err) {
    if (cachedReciters && cachedReciters.length > 0) {
      return cachedReciters;
    }
    return DEFAULT_RECITERS;
  }
}

/**
 * Get single ayah playback URL.
 * Handles EveryAyah editions (surah 3-digit + ayah 3-digit) and AlQuran Cloud CDN (global ayah number).
 */
export function getAyahAudioUrl(identifier: string, surah: number, ayah: number): string {
  const resolved = ALIAS_MAP[identifier] || identifier;
  const everyAyah = EVERYAYAH_EDITIONS[resolved];
  if (everyAyah) {
    const s = String(surah).padStart(3, '0');
    const a = String(ayah).padStart(3, '0');
    return `https://everyayah.com/data/${everyAyah.subfolder}/${s}${a}.mp3`;
  }

  const bitrate = KNOWN_BITRATES[resolved] || '128';
  const globalAyah = getGlobalAyahNumber(surah, ayah);
  return `https://cdn.islamic.network/quran/audio/${bitrate}/${resolved}/${globalAyah}.mp3`;
}

/**
 * Full-surah playback URL pattern from AlQuran Cloud CDN.
 * For verse-by-verse / EveryAyah editions without a full surah MP3, returns the first ayah URL.
 */
export function getSurahAudioUrl(identifier: string, surah: number): string {
  const resolved = ALIAS_MAP[identifier] || identifier;
  if (isVerseByVerseEdition(resolved)) {
    return getAyahAudioUrl(resolved, surah, 1);
  }
  const known = KNOWN_BITRATES[resolved];
  // audio-surah on AlQuran Cloud CDN is hosted at 128kbps (or 64 for 64-only editions)
  const bitrate = known && known !== '192' && known !== '320' ? known : '128';
  return `https://cdn.islamic.network/quran/audio-surah/${bitrate}/${resolved}/${surah}.mp3`;
}

// Audio singleton management
export interface CurrentPlayback {
  identifier: string;
  reciterName: string;
  title: string;
  url: string;
  isPlaying: boolean;
  type?: 'ayah' | 'surah';
  surah?: number;
  ayah?: number;
}

let currentSound: Audio.Sound | null = null;
let currentPlaybackUrl: string | null = null;
let currentPlayback: CurrentPlayback | null = null;
const listeners = new Set<(isPlaying: boolean) => void>();
const statusListeners = new Set<(status: PlaybackStatus) => void>();
const queueListeners = new Set<(queue: PlaylistItem[], currentIndex: number) => void>();

let currentStatus: PlaybackStatus = {
  isPlaying: false,
  positionMillis: 0,
  durationMillis: 0,
  isLoaded: false,
  isBuffering: false,
  didJustFinish: false,
};

// Queue state
let currentQueue: PlaylistItem[] = [];
let currentQueueIndex = -1;
let isQueueLoaded = false;

function safeLoadQueue(): PlaylistItem[] {
  try {
    return loadAudioQueue();
  } catch {
    return [];
  }
}

export function safeLoadSettings(): AudioSettings {
  try {
    return loadAudioSettings();
  } catch {
    return {
      reciter: 'ar.alafasy',
      autoplayNext: true,
      repeatMode: 'none',
    };
  }
}

export function updateAudioSettings(newSettings: Partial<AudioSettings>): AudioSettings {
  const current = safeLoadSettings();
  const merged = { ...current, ...newSettings };
  try {
    saveAudioSettings(merged);
  } catch {}
  return merged;
}

export function getAudioQueue(): PlaylistItem[] {
  if (!isQueueLoaded) {
    currentQueue = safeLoadQueue();
    isQueueLoaded = true;
  }
  return currentQueue;
}

export function getQueueIndex(): number {
  return currentQueueIndex;
}

export function setAudioQueue(queue: PlaylistItem[], startIndex = -1): void {
  currentQueue = [...queue];
  currentQueueIndex = startIndex;
  isQueueLoaded = true;
  try {
    saveAudioQueue(currentQueue);
  } catch {}
  notifyQueueListeners();
}

export function addToAudioQueue(item: PlaylistItem): void {
  getAudioQueue();
  currentQueue = [...currentQueue, item];
  try {
    saveAudioQueue(currentQueue);
  } catch {}
  notifyQueueListeners();
}

export function removeQueueItem(index: number): void {
  getAudioQueue();
  if (index < 0 || index >= currentQueue.length) return;
  currentQueue = currentQueue.filter((_, i) => i !== index);
  if (currentQueueIndex === index) {
    currentQueueIndex = -1;
  } else if (currentQueueIndex > index) {
    currentQueueIndex -= 1;
  }
  try {
    saveAudioQueue(currentQueue);
  } catch {}
  notifyQueueListeners();
}

export function clearAudioQueue(): void {
  currentQueue = [];
  currentQueueIndex = -1;
  isQueueLoaded = true;
  try {
    saveAudioQueue([]);
  } catch {}
  notifyQueueListeners();
}

export function addQueueListener(
  listener: (queue: PlaylistItem[], index: number) => void
): () => void {
  queueListeners.add(listener);
  listener(getAudioQueue(), currentQueueIndex);
  return () => {
    queueListeners.delete(listener);
  };
}

function notifyQueueListeners(): void {
  queueListeners.forEach((listener) => {
    try {
      listener(currentQueue, currentQueueIndex);
    } catch {
      // ignore
    }
  });
}

const KNOWN_RECITER_NAMES: Record<string, string> = {
  'ar.alafasy': 'Mishari Rashid al-Afasy',
  'ar.abdulbasitmurattal': 'Abdul Basit (Murattal)',
  'ar.abdullahbasfar': 'Abdullah Basfar',
  'ar.abdurrahmaansudais': 'Abdurrahmaan As-Sudais',
  'ar.abdulsamad': 'Abdul Samad',
  'ar.hanirifai': 'Hani ar-Rifai',
  'ar.aymanswoaid': 'Ayman Sowaid',
  'ar.hudhaify': 'Ali Al-Hudhaify',
  'ar.husary': 'Mahmoud Khalil Al-Husary',
  'ar.minshawi': 'Mohamed Siddiq Al-Minshawi',
  'en.everyayah-walk': 'Sahih International (Ibrahim Walk)',
  'en.walk': 'Sahih International (Ibrahim Walk)',
  'ur.everyayah-shamshad': 'Shamshad Ali Khan (Urdu)',
  'ur.khan': 'Shamshad Ali Khan (Urdu)',
  'ur.everyayah-farhathashmi': 'Dr. Farhat Hashmi (Urdu)',
  'zh.chinese': 'Chinese Translation',
  'fr.leclerc': 'Youssouf Leclerc (French)',
  'ru.kuliev-audio': 'Elmir Kuliev (Russian)',
  'kk.khalifahaltai-audio': 'Khalifah Altai (Kazakh)',
  'tr.vakfi-audio': 'Diyanet Vakfı (Turkish)',
  'uz.sodik-audio': 'Muhammad Sodik (Uzbek)',
  'fa.everyayah-kabiri': 'Makarem Shirazi - Kabiri (Persian)',
  'fa.everyayah-hedayatfar': 'Fooladvand - Hedayatfar (Persian)',
  'fa.hedayatfarfooladvand': 'Fooladvand - Hedayatfar (Persian)',
  'az.everyayah-balayev': 'Rasim Balayev (Azerbaijani)',
  'bs.everyayah-korkut': 'Besim Korkut (Bosnian)',
};

export function resolveReciterName(identifier: string): string {
  const resolved = ALIAS_MAP[identifier] || identifier;
  if (KNOWN_RECITER_NAMES[resolved]) return KNOWN_RECITER_NAMES[resolved];
  const found = VERIFIED_NON_ARABIC_EDITIONS.find((e) => e.identifier === resolved);
  if (found) return found.englishName;
  const clean = resolved.replace(/^(ar|en|ru|zh|fr|kk|tr|uz|fa|az|bs)\./, '').replace(/[-_]/g, ' ');
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

function resolveAyahFromGlobal(globalAyah: number): { surah: number; ayah: number } {
  let remaining = globalAyah;
  for (let i = 0; i < SURAH_AYAH_COUNTS.length; i++) {
    const count = SURAH_AYAH_COUNTS[i];
    if (remaining <= count) {
      return { surah: i + 1, ayah: remaining };
    }
    remaining -= count;
  }
  return { surah: 1, ayah: 1 };
}

/** Get currently active playback metadata or null if nothing played this session. */
export function getCurrentPlayback(): CurrentPlayback | null {
  return currentPlayback;
}

/** Explicitly update or override current playback state. */
export function setCurrentPlayback(item: CurrentPlayback | null): void {
  currentPlayback = item;
  notifyListeners(item?.isPlaying ?? false);
}

/** Clear the session playback item completely. */
export function clearPlayback(): void {
  currentPlayback = null;
  notifyListeners(false);
}

/** Register a callback for audio playback state changes. Returns an unsubscribe function. */
export function addPlaybackListener(listener: (isPlaying: boolean) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Register a callback for rich audio playback status updates. Returns an unsubscribe function. */
export function addPlaybackStatusListener(listener: (status: PlaybackStatus) => void): () => void {
  statusListeners.add(listener);
  // Immediately call with current status
  listener(currentStatus);
  return () => {
    statusListeners.delete(listener);
  };
}

/** Get the current full playback status. */
export function getPlaybackStatus(): PlaybackStatus {
  return currentStatus;
}

/** Seek to a specific position in milliseconds. */
export async function seekTo(positionMillis: number): Promise<void> {
  try {
    if (currentSound) {
      await currentSound.setPositionAsync(positionMillis);
    }
  } catch {
    // ignore
  }
}

function notifyListeners(isPlaying: boolean): void {
  listeners.forEach((listener) => {
    try {
      listener(isPlaying);
    } catch {
      // ignore
    }
  });
}

function notifyStatusListeners(status: PlaybackStatus): void {
  currentStatus = status;
  statusListeners.forEach((listener) => {
    try {
      listener(status);
    } catch {
      // ignore
    }
  });
  // Also notify legacy boolean listeners for backward compatibility
  notifyListeners(status.isPlaying);
}

function handlePlaybackStatusUpdate(status: AVPlaybackStatus): void {
  if (!status.isLoaded) {
    if (status.error) {
      if (currentPlayback) currentPlayback.isPlaying = false;
      notifyStatusListeners({
        isPlaying: false,
        positionMillis: 0,
        durationMillis: 0,
        isLoaded: false,
        isBuffering: false,
        didJustFinish: false,
      });
    } else {
      // Still loading/buffering
      notifyStatusListeners({
        isPlaying: false,
        positionMillis: 0,
        durationMillis: 0,
        isLoaded: false,
        isBuffering: true,
        didJustFinish: false,
      });
    }
    return;
  }

  const newStatus: PlaybackStatus = {
    isPlaying: status.isPlaying,
    positionMillis: status.positionMillis ?? 0,
    durationMillis: status.durationMillis ?? 0,
    isLoaded: true,
    isBuffering: status.isBuffering ?? false,
    didJustFinish: status.didJustFinish ?? false,
  };

  if (status.didJustFinish) {
    const settings = safeLoadSettings();
    if (settings.repeatMode === 'one') {
      if (currentPlayback?.url) {
        playAudioUrl(currentPlayback.url).catch(() => {});
        return;
      }
    } else if (settings.repeatMode === 'all' || settings.autoplayNext) {
      playNext()
        .then((advanced) => {
          if (!advanced) {
            if (currentPlayback) currentPlayback.isPlaying = false;
            notifyStatusListeners(newStatus);
          }
        })
        .catch(() => {
          if (currentPlayback) currentPlayback.isPlaying = false;
          notifyStatusListeners(newStatus);
        });
      return;
    }

    if (currentPlayback) currentPlayback.isPlaying = false;
    notifyStatusListeners(newStatus);
  } else {
    if (currentPlayback) currentPlayback.isPlaying = status.isPlaying;
    notifyStatusListeners(newStatus);
  }
}

async function playAudioUrl(url: string): Promise<void> {
  await Audio.setAudioModeAsync({
    playsInSilentModeIOS: true,
    staysActiveInBackground: false,
    shouldDuckAndroid: true,
  }).catch(() => {});

  if (currentSound && currentPlaybackUrl === url) {
    try {
      await currentSound.replayAsync();
      if (currentPlayback) currentPlayback.isPlaying = true;
      notifyStatusListeners({
        ...currentStatus,
        isPlaying: true,
      });
      return;
    } catch {
      await currentSound.unloadAsync().catch(() => {});
      currentSound = null;
      currentPlaybackUrl = null;
    }
  }

  if (currentSound) {
    await currentSound.unloadAsync().catch(() => {});
    currentSound = null;
    currentPlaybackUrl = null;
  }

  // Notify buffering state while loading
  notifyStatusListeners({
    isPlaying: false,
    positionMillis: 0,
    durationMillis: 0,
    isLoaded: false,
    isBuffering: true,
    didJustFinish: false,
  });

  try {
    const { sound } = await Audio.Sound.createAsync(
      { uri: url },
      { shouldPlay: true, volume: 1.0 },
      handlePlaybackStatusUpdate
    );
    currentSound = sound;
    currentPlaybackUrl = url;
    if (currentPlayback) currentPlayback.isPlaying = true;
  } catch (err) {
    // If the provided url fails (e.g. bitrate mismatch), attempt 128kbps fallback
    if (!url.includes('/128/')) {
      const fallbackUrl = url.replace(/\/(192|64|48|40|32|320)\//, '/128/');
      if (fallbackUrl !== url) {
        try {
          const { sound: fallbackSound } = await Audio.Sound.createAsync(
            { uri: fallbackUrl },
            { shouldPlay: true, volume: 1.0 },
            handlePlaybackStatusUpdate
          );
          currentSound = fallbackSound;
          currentPlaybackUrl = fallbackUrl;
          if (currentPlayback) currentPlayback.isPlaying = true;
          return;
        } catch {
          // ignore fallback error and propagate original
        }
      }
    }
    if (currentPlayback) currentPlayback.isPlaying = false;
    notifyStatusListeners({
      isPlaying: false,
      positionMillis: 0,
      durationMillis: 0,
      isLoaded: false,
      isBuffering: false,
      didJustFinish: false,
    });
    throw err;
  }
}

/** Play a specific Ayah using expo-av Audio singleton. */
export async function playAyah(
  identifier: string,
  url?: string,
  title?: string,
  reciterName?: string,
  surah?: number,
  ayah?: number
): Promise<void> {
  const resolvedId = ALIAS_MAP[identifier] || identifier;
  const resolvedReciter = reciterName || resolveReciterName(resolvedId);
  let resolvedSurah = surah;
  let resolvedAyah = ayah;

  const playbackUrl =
    url ||
    (resolvedSurah && resolvedAyah
      ? getAyahAudioUrl(resolvedId, resolvedSurah, resolvedAyah)
      : getAyahAudioUrl(resolvedId, 1, 1));

  if (!resolvedSurah || !resolvedAyah) {
    const match = playbackUrl.match(/\/audio\/\d+\/[^\/]+\/(\d+)\.mp3/);
    if (match) {
      const globalAyah = parseInt(match[1], 10);
      const res = resolveAyahFromGlobal(globalAyah);
      resolvedSurah = res.surah;
      resolvedAyah = res.ayah;
    } else {
      const everyAyahMatch = playbackUrl.match(/\/(\d{3})(\d{3})\.mp3$/);
      if (everyAyahMatch) {
        resolvedSurah = parseInt(everyAyahMatch[1], 10);
        resolvedAyah = parseInt(everyAyahMatch[2], 10);
      } else {
        resolvedSurah = 1;
        resolvedAyah = 1;
      }
    }
  }

  let resolvedTitle = title;
  if (!resolvedTitle) {
    resolvedTitle = `Surah ${resolvedSurah}:${resolvedAyah}`;
  }

  currentPlayback = {
    identifier: resolvedId,
    reciterName: resolvedReciter,
    title: resolvedTitle,
    url: playbackUrl,
    isPlaying: true,
    type: 'ayah',
    surah: resolvedSurah,
    ayah: resolvedAyah,
  };

  // Sync queue index if this matches an item in the queue
  const queue = getAudioQueue();
  const matchIdx = queue.findIndex(
    (item) => item.surah === resolvedSurah && item.ayah === resolvedAyah
  );
  if (matchIdx >= 0) {
    currentQueueIndex = matchIdx;
    notifyQueueListeners();
  }

  // Save to recently played
  try {
    saveRecentlyPlayed({
      type: 'ayah',
      identifier: resolvedId,
      reciterName: resolvedReciter,
      surah: resolvedSurah,
      ayah: resolvedAyah,
      title: resolvedTitle,
    });
  } catch {}

  await playAudioUrl(playbackUrl);
}

/** Play a full Surah using expo-av Audio singleton. */
export async function playSurah(
  identifier: string,
  url?: string,
  title?: string,
  reciterName?: string,
  surah?: number
): Promise<void> {
  const resolvedId = ALIAS_MAP[identifier] || identifier;
  const resolvedReciter = reciterName || resolveReciterName(resolvedId);
  let resolvedSurah = surah;

  // Non-Arabic / verse-by-verse editions do not have a single combined surah MP3.
  // Play Ayah 1 so that autoplayNext sequentially advances through the surah verse-by-verse.
  if (isVerseByVerseEdition(resolvedId)) {
    const targetSurah = resolvedSurah || 1;
    const ayahUrl = url || getAyahAudioUrl(resolvedId, targetSurah, 1);
    const resolvedTitle = title || `Surah ${targetSurah}`;
    await playAyah(resolvedId, ayahUrl, resolvedTitle, resolvedReciter, targetSurah, 1);
    return;
  }

  const playbackUrl =
    url || (resolvedSurah ? getSurahAudioUrl(resolvedId, resolvedSurah) : getSurahAudioUrl(resolvedId, 1));

  if (!resolvedSurah) {
    const match = playbackUrl.match(/\/audio-surah\/\d+\/[^\/]+\/(\d+)\.mp3/);
    if (match) {
      resolvedSurah = parseInt(match[1], 10);
    } else {
      resolvedSurah = 1;
    }
  }

  let resolvedTitle = title;
  if (!resolvedTitle) {
    resolvedTitle = `Surah ${resolvedSurah}`;
  }

  currentPlayback = {
    identifier: resolvedId,
    reciterName: resolvedReciter,
    title: resolvedTitle,
    url: playbackUrl,
    isPlaying: true,
    type: 'surah',
    surah: resolvedSurah,
  };

  // Sync queue index if this matches an item in the queue
  const queue = getAudioQueue();
  const matchIdx = queue.findIndex(
    (item) => item.surah === resolvedSurah && (item.ayah === undefined || item.ayah === null)
  );
  if (matchIdx >= 0) {
    currentQueueIndex = matchIdx;
    notifyQueueListeners();
  }

  // Save to recently played
  try {
    saveRecentlyPlayed({
      type: 'surah',
      identifier: resolvedId,
      reciterName: resolvedReciter,
      surah: resolvedSurah,
      title: resolvedTitle,
    });
  } catch {}

  try {
    await playAudioUrl(playbackUrl);
  } catch (err) {
    // If full-surah audio fails, fallback to verse-by-verse starting at ayah 1
    if (resolvedSurah) {
      const fallbackAyahUrl = getAyahAudioUrl(resolvedId, resolvedSurah, 1);
      await playAyah(
        resolvedId,
        fallbackAyahUrl,
        resolvedTitle,
        resolvedReciter,
        resolvedSurah,
        1
      );
      return;
    }
    throw err;
  }
}

/** Play a specific item from the audio queue by index. */
export async function playQueueItem(index: number): Promise<void> {
  const queue = getAudioQueue();
  if (index < 0 || index >= queue.length) return;
  currentQueueIndex = index;
  notifyQueueListeners();

  const item = queue[index];
  const settings = safeLoadSettings();
  const reciter = settings.reciter || currentPlayback?.identifier || 'ar.alafasy';
  const reciterName = resolveReciterName(reciter);

  if (item.ayah !== undefined && item.ayah !== null) {
    const url = getAyahAudioUrl(reciter, item.surah, item.ayah);
    await playAyah(reciter, url, item.title, reciterName, item.surah, item.ayah);
  } else {
    const url = getSurahAudioUrl(reciter, item.surah);
    await playSurah(reciter, url, item.title, reciterName, item.surah);
  }
}

/** Advance to next track (in queue, or next ayah/surah in Quran). */
export async function playNext(): Promise<boolean> {
  const queue = getAudioQueue();
  const settings = safeLoadSettings();

  // 1. Advance in queue if active
  if (queue.length > 0 && currentQueueIndex >= 0) {
    if (currentQueueIndex + 1 < queue.length) {
      await playQueueItem(currentQueueIndex + 1);
      return true;
    }
    // End of queue reached
    if (settings.repeatMode === 'all') {
      await playQueueItem(0);
      return true;
    }
    return false;
  }

  // 2. If queue exists but not started, start at item 0
  if (queue.length > 0 && currentQueueIndex === -1 && (settings.repeatMode === 'all' || settings.autoplayNext)) {
    await playQueueItem(0);
    return true;
  }

  // 3. Fallback: Sequential Quran advancement
  if (!currentPlayback) return false;
  const reciter = currentPlayback.identifier || settings.reciter || 'ar.alafasy';
  const reciterName = currentPlayback.reciterName || resolveReciterName(reciter);

  if (currentPlayback.type === 'ayah' && currentPlayback.surah && currentPlayback.ayah) {
    const surah = currentPlayback.surah;
    const ayah = currentPlayback.ayah;
    const maxAyahs = SURAH_AYAH_COUNTS[surah - 1] || 7;

    if (ayah < maxAyahs) {
      const nextAyah = ayah + 1;
      const url = getAyahAudioUrl(reciter, surah, nextAyah);
      await playAyah(reciter, url, `Surah ${surah}:${nextAyah}`, reciterName, surah, nextAyah);
      return true;
    } else if (surah < 114) {
      const nextSurah = surah + 1;
      const url = getAyahAudioUrl(reciter, nextSurah, 1);
      await playAyah(reciter, url, `Surah ${nextSurah}:1`, reciterName, nextSurah, 1);
      return true;
    } else if (settings.repeatMode === 'all') {
      const url = getAyahAudioUrl(reciter, 1, 1);
      await playAyah(reciter, url, `Surah 1:1`, reciterName, 1, 1);
      return true;
    }
    return false;
  }

  if (currentPlayback.type === 'surah' && currentPlayback.surah) {
    const surah = currentPlayback.surah;
    if (surah < 114) {
      const nextSurah = surah + 1;
      const url = getSurahAudioUrl(reciter, nextSurah);
      await playSurah(reciter, url, `Surah ${nextSurah}`, reciterName, nextSurah);
      return true;
    } else if (settings.repeatMode === 'all') {
      const url = getSurahAudioUrl(reciter, 1);
      await playSurah(reciter, url, `Surah 1`, reciterName, 1);
      return true;
    }
    return false;
  }

  return false;
}

/** Go to previous track (or rewind to 0 if >3s into track). */
export async function playPrevious(): Promise<boolean> {
  // If playing and more than 3 seconds in, restart track
  if (currentStatus.positionMillis > 3000) {
    await seekTo(0);
    return true;
  }

  const queue = getAudioQueue();
  const settings = safeLoadSettings();

  // In queue
  if (queue.length > 0 && currentQueueIndex > 0) {
    await playQueueItem(currentQueueIndex - 1);
    return true;
  }

  // Sequential previous in Quran
  if (currentPlayback) {
    const reciter = currentPlayback.identifier || settings.reciter || 'ar.alafasy';
    const reciterName = currentPlayback.reciterName || resolveReciterName(reciter);

    if (currentPlayback.type === 'ayah' && currentPlayback.surah && currentPlayback.ayah) {
      const surah = currentPlayback.surah;
      const ayah = currentPlayback.ayah;

      if (ayah > 1) {
        const prevAyah = ayah - 1;
        const url = getAyahAudioUrl(reciter, surah, prevAyah);
        await playAyah(reciter, url, `Surah ${surah}:${prevAyah}`, reciterName, surah, prevAyah);
        return true;
      } else if (surah > 1) {
        const prevSurah = surah - 1;
        const maxAyahs = SURAH_AYAH_COUNTS[prevSurah - 1] || 1;
        const url = getAyahAudioUrl(reciter, prevSurah, maxAyahs);
        await playAyah(reciter, url, `Surah ${prevSurah}:${maxAyahs}`, reciterName, prevSurah, maxAyahs);
        return true;
      }
    } else if (currentPlayback.type === 'surah' && currentPlayback.surah) {
      const surah = currentPlayback.surah;
      if (surah > 1) {
        const prevSurah = surah - 1;
        const url = getSurahAudioUrl(reciter, prevSurah);
        await playSurah(reciter, url, `Surah ${prevSurah}`, reciterName, prevSurah);
        return true;
      }
    }
  }

  await seekTo(0);
  return true;
}

export function canPlayNext(): boolean {
  const queue = getAudioQueue();
  const settings = safeLoadSettings();
  if (queue.length > 0) {
    if (currentQueueIndex + 1 < queue.length) return true;
    if (settings.repeatMode === 'all') return true;
  }
  if (!currentPlayback) return false;
  if (settings.repeatMode === 'all') return true;
  if (currentPlayback.type === 'ayah' && currentPlayback.surah && currentPlayback.ayah) {
    return (
      currentPlayback.surah < 114 ||
      currentPlayback.ayah < (SURAH_AYAH_COUNTS[currentPlayback.surah - 1] || 7)
    );
  }
  if (currentPlayback.type === 'surah' && currentPlayback.surah) {
    return currentPlayback.surah < 114;
  }
  return false;
}

export function canPlayPrevious(): boolean {
  if (currentStatus.positionMillis > 3000) return true;
  if (getAudioQueue().length > 0 && currentQueueIndex > 0) return true;
  if (!currentPlayback) return false;
  if (currentPlayback.type === 'ayah' && currentPlayback.surah && currentPlayback.ayah) {
    return currentPlayback.surah > 1 || currentPlayback.ayah > 1;
  }
  if (currentPlayback.type === 'surah' && currentPlayback.surah) {
    return currentPlayback.surah > 1;
  }
  return true;
}

/** Pause currently playing sound. */
export async function pause(): Promise<void> {
  try {
    if (currentSound) {
      await currentSound.pauseAsync();
      if (currentPlayback) currentPlayback.isPlaying = false;
      notifyStatusListeners({
        ...currentStatus,
        isPlaying: false,
      });
    }
  } catch {
    // ignore
  }
}

/** Resume playback or replay current URL. */
export async function resume(): Promise<void> {
  try {
    if (currentSound) {
      await currentSound.playAsync();
      if (currentPlayback) currentPlayback.isPlaying = true;
      notifyStatusListeners({
        ...currentStatus,
        isPlaying: true,
      });
    } else if (currentPlayback?.url) {
      await playAudioUrl(currentPlayback.url);
    }
  } catch {
    // ignore
  }
}

/** Get currently playing audio URL or null if stopped. */
export function getCurrentPlaybackUrl(): string | null {
  return currentPlaybackUrl;
}

/** Stop playback and release the sound. */
export async function stop(clearSession = false): Promise<void> {
  try {
    if (currentSound) {
      await currentSound.stopAsync();
      await currentSound.unloadAsync();
      currentSound = null;
      currentPlaybackUrl = null;
    }
  } catch {
    currentSound = null;
    currentPlaybackUrl = null;
  } finally {
    if (currentPlayback) {
      currentPlayback.isPlaying = false;
      if (clearSession) {
        currentPlayback = null;
      }
    }
    notifyStatusListeners({
      isPlaying: false,
      positionMillis: 0,
      durationMillis: 0,
      isLoaded: false,
      isBuffering: false,
      didJustFinish: false,
    });
  }
}

/** Unload current sound if cached. */
export async function unload(): Promise<void> {
  try {
    if (currentSound) {
      await currentSound.unloadAsync();
      currentSound = null;
      currentPlaybackUrl = null;
    }
  } catch {
    currentSound = null;
    currentPlaybackUrl = null;
  } finally {
    if (currentPlayback) {
      currentPlayback.isPlaying = false;
    }
    notifyStatusListeners({
      isPlaying: false,
      positionMillis: 0,
      durationMillis: 0,
      isLoaded: false,
      isBuffering: false,
      didJustFinish: false,
    });
  }
}
