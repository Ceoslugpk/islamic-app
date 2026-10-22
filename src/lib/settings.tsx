import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Location } from './prayerTimes';
import { AccentKey, ACCENT_KEYS, DEFAULT_ACCENT } from './accents';
import { NamesLanguage } from './names99';
import {
  setAudioTranslationEnabled,
  setAudioTranslationEdition,
  AUDIO_TRANSLATION_EDITION_KEY,
} from './quranAudio';
import { getQuranTranslationLanguage, setAutoLinkedQuranTranslationLanguage } from './quranLanguageState';
import {
  AppLanguage,
  setAppLanguage,
  getBootLanguage,
  isAppLanguage,
  markLanguageDurable,
  recordRequestedLanguage,
} from './i18n';
import { setActiveAdhanReciterId } from './audio';
import { setCachedLocation } from './useLocation';
import { TAFSIR_SOURCES } from './tafsirSources';
import {
  createSerializedSettingsWriter,
  SettingsStorageTimeoutError,
  SettingsWriteState,
  StoredValueVerifier,
  StringStorage,
} from './settingsWriteQueue';

export type { AppLanguage };

export type TimeFormat = '12h' | '24h';
export type LocationMode = 'auto' | 'manual';
export type ThemeMode = 'system' | 'ink' | 'paper';
export type QuranArabicFont = 'amiri' | 'notonaskh';
export type QuranScript = 'uthmani' | 'imlaei' | 'indopak' | 'tajweed';
export type TafsirSourceId = string;
export type Madhab = 'shafi' | 'hanafi';

// Quran reader display ranges (shared by Settings UI + reader)
export const QURAN_FONT_SIZE_MIN = 18;
export const QURAN_FONT_SIZE_MAX = 40;
export const QURAN_FONT_SIZE_STEP = 2;
export const QURAN_FONT_SIZE_DEFAULT = 30;
export const QURAN_LINE_HEIGHT_MIN = 1.8;
export const QURAN_LINE_HEIGHT_MAX = 3.0;
export const QURAN_LINE_HEIGHT_STEP = 0.1;
export const QURAN_LINE_HEIGHT_DEFAULT = 2.2;

// Legacy AsyncStorage keys used by QuranReaderScreen before settings owned them
const LEGACY_QURAN_FONT_SIZE = 'quran-font-size';
const LEGACY_QURAN_SHOW_TRANSLATION = 'quran-show-translation';

export function clampQuranFontSize(value: number): number {
  if (!Number.isFinite(value)) return QURAN_FONT_SIZE_DEFAULT;
  return Math.max(QURAN_FONT_SIZE_MIN, Math.min(QURAN_FONT_SIZE_MAX, Math.round(value)));
}

export function clampQuranLineHeight(value: number): number {
  if (!Number.isFinite(value)) return QURAN_LINE_HEIGHT_DEFAULT;
  const rounded = Math.round(value * 10) / 10;
  return Math.max(QURAN_LINE_HEIGHT_MIN, Math.min(QURAN_LINE_HEIGHT_MAX, rounded));
}

export type PrayerNameKey = 'Fajr' | 'Dhuhr' | 'Asr' | 'Maghrib' | 'Isha';

export interface PrayerReminderConfig {
  enabled: boolean;
  adhan: boolean;
  vibration: boolean;
}

export type PrayerConfigs = Record<PrayerNameKey, PrayerReminderConfig>;

export type QuranGoalType = 'minutes' | 'pages' | 'custom';

export interface QuranGoalConfig {
  type: QuranGoalType;
  target: number;
}

export const DEFAULT_PRAYER_CONFIGS: PrayerConfigs = {
  Fajr: { enabled: true, adhan: true, vibration: true },
  Dhuhr: { enabled: true, adhan: true, vibration: true },
  Asr: { enabled: true, adhan: true, vibration: true },
  Maghrib: { enabled: true, adhan: true, vibration: true },
  Isha: { enabled: true, adhan: true, vibration: true },
};

export const DEFAULT_QURAN_GOAL: QuranGoalConfig = {
  type: 'minutes',
  target: 15,
};

export interface AppSettings {
  settingsVersion?: number;
  methodId: number;
  madhab: Madhab;
  timeFormat: TimeFormat;
  locationMode: LocationMode;
  manualLocation: Location;
  autoLocation: Location | null;
  autoLocationTimestamp: number | null;
  remindersEnabled: boolean;
  reminderOffsetMinutes: number;
  prayerConfigs: PrayerConfigs;
  quranReminderEnabled: boolean;
  quranReminderTime: string;
  quranGoal: QuranGoalConfig;
  adhanReciterId: string;
  themeMode: ThemeMode;
  accentKey: AccentKey;
  translationAudioEnabled: boolean;
  namesLanguage: NamesLanguage;
  womenWorshipEnabled: boolean;
  womenPinHash: string | null;
  womenLockEnabled: boolean;
  hapticsEnabled: boolean;
  quranArabicFont: QuranArabicFont;
  quranScript: QuranScript;
  quranFontSize: number;
  quranLineHeight: number;
  quranShowTranslation: boolean;
  tafsirSourceId: TafsirSourceId;
  /** User wants Quran text/translation preloaded in the background (offline reading). */
  quranPreloadRequested: boolean;
  language: AppLanguage;
}

interface SettingsContextValue {
  settings: AppSettings;
  updateSettings: (updater: (current: AppSettings) => AppSettings) => AppSettings;
  setMethod: (id: number) => void;
  setMadhab: (m: Madhab) => void;
  setTimeFormat: (f: TimeFormat) => void;
  setLocationMode: (m: LocationMode) => void;
  setManualLocation: (loc: Location) => void;
  setAutoLocation: (loc: Location, timestamp?: number) => void;
  setReminders: (enabled: boolean) => void;
  setReminderOffsetMinutes: (minutes: number) => void;
  setPrayerConfig: (prayer: PrayerNameKey, config: Partial<PrayerReminderConfig>) => void;
  setPrayerConfigs: (configs: PrayerConfigs) => void;
  setQuranReminderEnabled: (enabled: boolean) => void;
  setQuranReminderTime: (time: string) => void;
  setQuranGoal: (goal: QuranGoalConfig) => void;
  setAdhanReciterId: (id: string) => void;
  setThemeMode: (m: ThemeMode) => void;
  setAccentKey: (key: AccentKey) => void;
  setTranslationAudioEnabled: (enabled: boolean) => void;
  setNamesLanguage: (lang: NamesLanguage) => void;
  setWomenWorship: (enabled: boolean) => void;
  setWomenPinHash: (hash: string | null) => void;
  setWomenLockEnabled: (enabled: boolean) => void;
  setHapticsEnabled: (enabled: boolean) => void;
  setQuranArabicFont: (font: QuranArabicFont) => void;
  setQuranScript: (script: QuranScript) => void;
  setQuranFontSize: (size: number | ((prev: number) => number)) => void;
  setQuranLineHeight: (multiplier: number | ((prev: number) => number)) => void;
  setQuranShowTranslation: (enabled: boolean) => void;
  setTafsirSourceId: (sourceId: TafsirSourceId) => void;
  setQuranPreloadRequested: (requested: boolean) => void;
  setLanguage: (lang: AppLanguage) => Promise<void> | void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export const SETTINGS_VERSION = 2;

const DEFAULTS: AppSettings = {
  settingsVersion: SETTINGS_VERSION,
  methodId: 16,
  madhab: 'shafi',
  timeFormat: '12h',
  locationMode: 'auto',
  manualLocation: { latitude: 21.4225, longitude: 39.8262, label: 'Makkah, Saudi Arabia' },
  autoLocation: null,
  autoLocationTimestamp: null,
  remindersEnabled: false,
  reminderOffsetMinutes: 15,
  prayerConfigs: DEFAULT_PRAYER_CONFIGS,
  quranReminderEnabled: false,
  quranReminderTime: '20:00',
  quranGoal: DEFAULT_QURAN_GOAL,
  adhanReciterId: 'alafasy',
  themeMode: 'system',
  accentKey: DEFAULT_ACCENT,
  translationAudioEnabled: true,
  namesLanguage: 'en',
  womenWorshipEnabled: false,
  womenPinHash: null,
  womenLockEnabled: false,
  hapticsEnabled: true,
  quranArabicFont: 'amiri',
  quranScript: 'uthmani',
  quranFontSize: QURAN_FONT_SIZE_DEFAULT,
  quranLineHeight: QURAN_LINE_HEIGHT_DEFAULT,
  quranShowTranslation: true,
  tafsirSourceId: 'jalalayn',
  quranPreloadRequested: true,
  language: 'en',
};

const STORAGE_KEY = 'islamic-settings';
export const METHOD_MIGRATION_KEY = 'islamic-settings-method-migrated-v16';

// AsyncStorage normally settles quickly, but a native bridge can leave a Promise
// pending after an activity/configuration transition. Reject the caller at the
// timeout; the writer lane closes immediately and observes native settlement detached.
const SETTINGS_STORAGE_OPERATION_TIMEOUT_MS = 10_000;

type SettingsWriter = ReturnType<typeof createSerializedSettingsWriter<AppSettings>>;

function withStorageOperationTimeout<T>(operation: Promise<T>, operationName: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      settled = true;
      reject(new SettingsStorageTimeoutError(operationName as 'read' | 'write'));
    }, SETTINGS_STORAGE_OPERATION_TIMEOUT_MS);

    operation.then(
      (value) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

interface TimedStorageFence {
  pending: number;
  unresolved: boolean;
}

// Symbol-backed process registry survives a JS bundle reload when the native
// AsyncStorage module identity survives with it; it is intentionally not a
// persisted settings field and disappears with a brand-new app process.
const timedStorageFenceRegistryKey = Symbol.for('islamic.settings.timed-storage-fences');
const timedStorageFenceGlobal = globalThis as typeof globalThis & { [key: symbol]: unknown };
const timedStorageFences =
  (timedStorageFenceGlobal[timedStorageFenceRegistryKey] as WeakMap<object, TimedStorageFence> | undefined) ??
  new WeakMap<object, TimedStorageFence>();
timedStorageFenceGlobal[timedStorageFenceRegistryKey] = timedStorageFences;

function createTimedStorage(storage: StringStorage): StringStorage {
  const owner = storage as object;
  const fence = timedStorageFences.get(owner) ?? { pending: 0, unresolved: false };
  timedStorageFences.set(owner, fence);

  function track<T>(operation: Promise<T>, operationName: 'read' | 'write'): Promise<T> {
    fence.pending += 1;
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      fence.pending -= 1;
      if (fence.pending === 0) fence.unresolved = false;
    };
    operation.then(finish, finish);
    return withStorageOperationTimeout(operation, operationName).catch((error) => {
      if (error instanceof SettingsStorageTimeoutError) fence.unresolved = true;
      throw error;
    });
  }

  return {
    setItem: (key, value) => track(storage.setItem(key, value), 'write'),
    getItem: (key) => track(storage.getItem(key), 'read'),
    isUnresolvedOperation: () => fence.unresolved,
    markUnresolvedOperation: () => { fence.unresolved = true; },
  };
}

const timedAsyncStorage = createTimedStorage(AsyncStorage);

export const VALID_ACCENTS: Set<string> = new Set<string>(ACCENT_KEYS);

export const LEGACY_ACCENT_MAP: Record<string, AccentKey> = {
  sapphire: 'cobalt',
  ruby: 'crimson',
  gold: 'amber',
  amethyst: 'violet',
  bronze: 'copper',
  slate: 'sky',
};

export function normalizeAccentKey(raw: unknown): AccentKey {
  if (typeof raw !== 'string') return DEFAULT_ACCENT;
  if (VALID_ACCENTS.has(raw)) return raw as AccentKey;
  if (raw in LEGACY_ACCENT_MAP) return LEGACY_ACCENT_MAP[raw];
  return DEFAULT_ACCENT;
}

export function isAccentKey(value: unknown): value is AccentKey {
  return typeof value === 'string' && VALID_ACCENTS.has(value);
}

const VALID_NAMES_LANGS: Set<string> = new Set(['en', 'fr', 'tr', 'es', 'de', 'id', 'bn', 'ru', 'ur']);

const VALID_TAFSIR_SOURCES: Set<string> = new Set(TAFSIR_SOURCES.map((s) => s.id));

/**
 * Validates, clamps, and sanitizes every settings field against schema constraints.
 * Strips unknown keys from arbitrary or untrusted inputs (e.g. backup imports).
 */
export function sanitizeSettings(raw: unknown): AppSettings {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ...DEFAULTS };
  }
  const p = raw as Record<string, unknown>;

  // 1. settingsVersion
  const settingsVersion =
    typeof p.settingsVersion === 'number' && Number.isFinite(p.settingsVersion)
      ? p.settingsVersion
      : DEFAULTS.settingsVersion;

  // 2. methodId (range 1-21)
  const methodId =
    typeof p.methodId === 'number' && Number.isInteger(p.methodId) && p.methodId >= 1 && p.methodId <= 21
      ? p.methodId
      : DEFAULTS.methodId;

  // 3. madhab ('shafi' | 'hanafi')
  const madhab: Madhab =
    p.madhab === 'shafi' || p.madhab === 'hanafi' ? p.madhab : DEFAULTS.madhab;

  // 4. timeFormat ('12h' | '24h')
  const timeFormat: TimeFormat =
    p.timeFormat === '12h' || p.timeFormat === '24h' ? p.timeFormat : DEFAULTS.timeFormat;

  // 5. locationMode ('auto' | 'manual')
  const locationMode: LocationMode =
    p.locationMode === 'auto' || p.locationMode === 'manual' ? p.locationMode : DEFAULTS.locationMode;

  // 6. manualLocation ({ latitude, longitude, label })
  let manualLocation = DEFAULTS.manualLocation;
  if (p.manualLocation && typeof p.manualLocation === 'object' && !Array.isArray(p.manualLocation)) {
    const ml = p.manualLocation as Record<string, unknown>;
    if (
      typeof ml.latitude === 'number' &&
      Number.isFinite(ml.latitude) &&
      typeof ml.longitude === 'number' &&
      Number.isFinite(ml.longitude)
    ) {
      const lat = Math.max(-90, Math.min(90, ml.latitude));
      const lng = Math.max(-180, Math.min(180, ml.longitude));
      const lbl = typeof ml.label === 'string' ? ml.label.slice(0, 120) : 'Custom Location';
      manualLocation = { latitude: lat, longitude: lng, label: lbl };
    }
  }

  // 7. autoLocation ({ latitude, longitude, label } | null)
  let autoLocation: Location | null = null;
  if (p.autoLocation && typeof p.autoLocation === 'object' && !Array.isArray(p.autoLocation)) {
    const al = p.autoLocation as Record<string, unknown>;
    if (
      typeof al.latitude === 'number' &&
      Number.isFinite(al.latitude) &&
      typeof al.longitude === 'number' &&
      Number.isFinite(al.longitude)
    ) {
      const lat = Math.max(-90, Math.min(90, al.latitude));
      const lng = Math.max(-180, Math.min(180, al.longitude));
      const lbl = typeof al.label === 'string' ? al.label.slice(0, 120) : `${lat.toFixed(2)}°, ${lng.toFixed(2)}°`;
      autoLocation = { latitude: lat, longitude: lng, label: lbl };
    }
  }

  // 8. autoLocationTimestamp
  let autoLocationTimestamp: number | null = null;
  if (typeof p.autoLocationTimestamp === 'number' && Number.isFinite(p.autoLocationTimestamp) && p.autoLocationTimestamp > 0) {
    autoLocationTimestamp = p.autoLocationTimestamp;
  } else if (autoLocation) {
    autoLocationTimestamp = Date.now();
  }

  // 9. remindersEnabled
  const remindersEnabled =
    typeof p.remindersEnabled === 'boolean' ? p.remindersEnabled : DEFAULTS.remindersEnabled;

  // 10. reminderOffsetMinutes
  const reminderOffsetMinutes =
    typeof p.reminderOffsetMinutes === 'number' && Number.isFinite(p.reminderOffsetMinutes)
      ? Math.max(0, Math.min(120, Math.round(p.reminderOffsetMinutes)))
      : DEFAULTS.reminderOffsetMinutes;

  // 11. prayerConfigs
  const prayerConfigs: PrayerConfigs = { ...DEFAULT_PRAYER_CONFIGS };
  if (p.prayerConfigs && typeof p.prayerConfigs === 'object' && !Array.isArray(p.prayerConfigs)) {
    const pc = p.prayerConfigs as Record<string, unknown>;
    const prayers: PrayerNameKey[] = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
    for (const prayer of prayers) {
      if (pc[prayer] && typeof pc[prayer] === 'object') {
        const item = pc[prayer] as Record<string, unknown>;
        prayerConfigs[prayer] = {
          enabled: typeof item.enabled === 'boolean' ? item.enabled : DEFAULT_PRAYER_CONFIGS[prayer].enabled,
          adhan: typeof item.adhan === 'boolean' ? item.adhan : DEFAULT_PRAYER_CONFIGS[prayer].adhan,
          vibration: typeof item.vibration === 'boolean' ? item.vibration : DEFAULT_PRAYER_CONFIGS[prayer].vibration,
        };
      }
    }
  }

  // 12. quranReminderEnabled
  const quranReminderEnabled =
    typeof p.quranReminderEnabled === 'boolean' ? p.quranReminderEnabled : DEFAULTS.quranReminderEnabled;

  // 13. quranReminderTime (strict HH:MM format)
  const quranReminderTime =
    typeof p.quranReminderTime === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(p.quranReminderTime.trim())
      ? p.quranReminderTime.trim()
      : DEFAULTS.quranReminderTime;

  // 14. quranGoal ({ type, target })
  let quranGoal = DEFAULT_QURAN_GOAL;
  if (p.quranGoal && typeof p.quranGoal === 'object' && !Array.isArray(p.quranGoal)) {
    const qg = p.quranGoal as Record<string, unknown>;
    const type: QuranGoalType =
      qg.type === 'minutes' || qg.type === 'pages' || qg.type === 'custom' ? qg.type : DEFAULT_QURAN_GOAL.type;
    const target =
      typeof qg.target === 'number' && Number.isFinite(qg.target)
        ? Math.max(1, Math.min(1000, Math.round(qg.target)))
        : DEFAULT_QURAN_GOAL.target;
    quranGoal = { type, target };
  }

  // 15. adhanReciterId
  const adhanReciterId =
    typeof p.adhanReciterId === 'string' && /^[a-zA-Z0-9._-]{1,64}$/.test(p.adhanReciterId.trim())
      ? p.adhanReciterId.trim()
      : DEFAULTS.adhanReciterId;

  // 16. themeMode
  const themeMode: ThemeMode =
    p.themeMode === 'system' || p.themeMode === 'ink' || p.themeMode === 'paper'
      ? p.themeMode
      : DEFAULTS.themeMode;

  // 17. accentKey
  const accentKey: AccentKey = normalizeAccentKey(p.accentKey);

  // 18. translationAudioEnabled
  const translationAudioEnabled =
    typeof p.translationAudioEnabled === 'boolean'
      ? p.translationAudioEnabled
      : DEFAULTS.translationAudioEnabled;

  // 19. namesLanguage
  const namesLanguage: NamesLanguage =
    typeof p.namesLanguage === 'string' && VALID_NAMES_LANGS.has(p.namesLanguage)
      ? (p.namesLanguage as NamesLanguage)
      : DEFAULTS.namesLanguage;

  // 20. womenWorshipEnabled
  const womenWorshipEnabled =
    typeof p.womenWorshipEnabled === 'boolean' ? p.womenWorshipEnabled : DEFAULTS.womenWorshipEnabled;

  // 21. womenPinHash (must be string of valid hash format or null; reject arbitrary objects)
  let womenPinHash: string | null = null;
  if (
    typeof p.womenPinHash === 'string' &&
    /^[a-zA-Z0-9_$-]{6,128}$/.test(p.womenPinHash.trim())
  ) {
    womenPinHash = p.womenPinHash.trim();
  }

  // 22. womenLockEnabled
  const womenLockEnabled =
    typeof p.womenLockEnabled === 'boolean' ? p.womenLockEnabled : DEFAULTS.womenLockEnabled;

  // 23. hapticsEnabled
  const hapticsEnabled =
    typeof p.hapticsEnabled === 'boolean' ? p.hapticsEnabled : DEFAULTS.hapticsEnabled;

  // 24. quranArabicFont
  const quranArabicFont: QuranArabicFont =
    p.quranArabicFont === 'amiri' || p.quranArabicFont === 'notonaskh'
      ? p.quranArabicFont
      : DEFAULTS.quranArabicFont;

  // 25. quranScript
  const quranScript: QuranScript =
    p.quranScript === 'uthmani' ||
    p.quranScript === 'imlaei' ||
    p.quranScript === 'indopak' ||
    p.quranScript === 'tajweed'
      ? p.quranScript
      : DEFAULTS.quranScript;

  // 26. quranFontSize
  const quranFontSize = clampQuranFontSize(
    typeof p.quranFontSize === 'number' ? p.quranFontSize : DEFAULTS.quranFontSize
  );

  // 27. quranLineHeight
  const quranLineHeight = clampQuranLineHeight(
    typeof p.quranLineHeight === 'number' ? p.quranLineHeight : DEFAULTS.quranLineHeight
  );

  // 28. quranShowTranslation
  const quranShowTranslation =
    typeof p.quranShowTranslation === 'boolean' ? p.quranShowTranslation : DEFAULTS.quranShowTranslation;

  // 29. tafsirSourceId
  const tafsirSourceId: TafsirSourceId =
    typeof p.tafsirSourceId === 'string' && VALID_TAFSIR_SOURCES.has(p.tafsirSourceId)
      ? (p.tafsirSourceId as TafsirSourceId)
      : DEFAULTS.tafsirSourceId;

  // 30. quranPreloadRequested
  const quranPreloadRequested =
    typeof p.quranPreloadRequested === 'boolean' ? p.quranPreloadRequested : DEFAULTS.quranPreloadRequested;

  // 31. App language is validated by the same registry used at boot.
  const language: AppLanguage = isAppLanguage(p.language) ? p.language : DEFAULTS.language;

  return {
    settingsVersion,
    methodId,
    madhab,
    timeFormat,
    locationMode,
    manualLocation,
    autoLocation,
    autoLocationTimestamp,
    remindersEnabled,
    reminderOffsetMinutes,
    prayerConfigs,
    quranReminderEnabled,
    quranReminderTime,
    quranGoal,
    adhanReciterId,
    themeMode,
    accentKey,
    translationAudioEnabled,
    namesLanguage,
    womenWorshipEnabled,
    womenPinHash,
    womenLockEnabled,
    hapticsEnabled,
    quranArabicFont,
    quranScript,
    quranFontSize,
    quranLineHeight,
    quranShowTranslation,
    tafsirSourceId,
    quranPreloadRequested,
    language,
  };
}

export const CANONICAL_AUTO_LINKED_QURAN_LANGS: ReadonlySet<string> = new Set([
  'en',
  'ur',
  'ar',
  'hi',
  'ml',
  'si',
  'bn',
  'ms',
  'ta',
  'id',
  'ps',
]);

/**
 * Pure helper: computes next AppSettings when changing language.
 * Guarantees all existing settings fields are preserved and sanitized.
 * The tafsir edition is intentionally preserved: there is no reliable
 * explicit-vs-auto evidence, so silently remapping it is not allowed.
 */
export function computeNextLanguageSettings(
  prev: AppSettings,
  nextLang: AppLanguage
): AppSettings {
  return sanitizeSettings({
    ...prev,
    language: nextLang,
  });
}


/**
 * One idempotent linked-language policy used by BOTH live same-direction
 * switches and direction-changing restarts.
 *
 * - Quran translation changes only through the explicit-preserving auto-link
 *   guard, and only while the current choice is still app-language-linked.
 * - Audio is auto-linked only when no edition is stored yet. Without a reliable
 *   explicit-vs-auto schema, an existing audio choice is preserved.
 * - Tafsir is always preserved: without reliable explicit-vs-auto evidence the
 *   current edition is never silently remapped.
 * - No bulk Quran download is triggered here.
 */
async function applyLinkedLanguageEffects(nextLang: AppLanguage): Promise<void> {
  if (nextLang === 'ur') {
    try {
      const currentQuranLang = getQuranTranslationLanguage();
      if (CANONICAL_AUTO_LINKED_QURAN_LANGS.has(currentQuranLang)) {
        await setAutoLinkedQuranTranslationLanguage('ur');
      }
    } catch {}

    try {
      const savedAudioEdition = await AsyncStorage.getItem(AUDIO_TRANSLATION_EDITION_KEY);
      if (!savedAudioEdition) {
        await setAudioTranslationEdition('ur.everyayah-shamshad');
      }
    } catch {}
  } else if (nextLang === 'ar') {
    try {
      const currentQuranLang = getQuranTranslationLanguage();
      if (CANONICAL_AUTO_LINKED_QURAN_LANGS.has(currentQuranLang)) {
        await setAutoLinkedQuranTranslationLanguage('ar');
      }
    } catch {}
  } else if (nextLang === 'hi') {
    try {
      const currentQuranLang = getQuranTranslationLanguage();
      if (CANONICAL_AUTO_LINKED_QURAN_LANGS.has(currentQuranLang)) {
        await setAutoLinkedQuranTranslationLanguage('hi');
      }
    } catch {}
  } else if (nextLang === 'ml') {
    try {
      const currentQuranLang = getQuranTranslationLanguage();
      if (CANONICAL_AUTO_LINKED_QURAN_LANGS.has(currentQuranLang)) {
        await setAutoLinkedQuranTranslationLanguage('ml');
      }
    } catch {}
  } else if (nextLang === 'si') {
    try {
      const currentQuranLang = getQuranTranslationLanguage();
      if (CANONICAL_AUTO_LINKED_QURAN_LANGS.has(currentQuranLang)) {
        await setAutoLinkedQuranTranslationLanguage('si');
      }
    } catch {}
  } else if (nextLang === 'bn' || nextLang === 'ms' || nextLang === 'ta' || nextLang === 'id' || nextLang === 'ps') {
    try {
      const currentQuranLang = getQuranTranslationLanguage();
      if (CANONICAL_AUTO_LINKED_QURAN_LANGS.has(currentQuranLang)) {
        await setAutoLinkedQuranTranslationLanguage(nextLang);
      }
    } catch {}
  } else {
    // Switching back to English from an app language with a linked Quran translation.
    try {
      const currentQuranLang = getQuranTranslationLanguage();
      if (CANONICAL_AUTO_LINKED_QURAN_LANGS.has(currentQuranLang)) {
        await setAutoLinkedQuranTranslationLanguage('en');
      }
    } catch {}
  }
}


/**
 * Pure helper: writes sanitized settings to storage with durability.
 * Throws on failure — callers MUST NOT reload if this throws.
 */
export async function persistLanguageChange(
  currentSettings: AppSettings,
  nextLang: AppLanguage,
  storage: {
    setItem: (key: string, value: string) => Promise<void>;
    getItem?: (key: string) => Promise<string | null>;
  } = AsyncStorage
): Promise<AppSettings> {
  const verify: StoredValueVerifier<AppSettings> = (raw) => {
    const parsed = raw ? JSON.parse(raw) : null;
    if (!parsed || parsed.language !== nextLang) {
      throw new Error(`Persisted language verification mismatch: expected "${nextLang}", got "${parsed?.language}"`);
    }
  };

  if (storage === AsyncStorage) {
    // Compute from the latest persisted snapshot inside the shared operation lane.
    // The caller's render snapshot can be older than a theme/toggle write already
    // queued ahead of this language switch.
    const persisted = await enqueueSharedSettingsMutation(
      (latest) => computeNextLanguageSettings(latest, nextLang),
      currentSettings,
      verify,
    );
    markLanguageDurable?.(nextLang);
    // Linked side effects run only after the durable language + readback.
    await applyLinkedLanguageEffects(nextLang);
    return persisted;
  }

  const nextSettings = computeNextLanguageSettings(currentSettings, nextLang);
  {
    const stringStorage: StringStorage = {
      setItem: (key: string, value: string) => storage.setItem(key, value),
      getItem: storage.getItem ? (key: string) => storage.getItem!(key) : async () => null,
    };
    const writer = getSettingsWriter(stringStorage, storage as object);
    await writer.reconcile();
    await writer(nextSettings, storage.getItem ? verify : undefined);
    if (storage.getItem) markLanguageDurable?.(nextLang);
  }
  return nextSettings;
}


/**
 * In-memory mirror of `quranPreloadRequested` so non-React callers (background
 * preloader, warmup, app bootstrap) can honour the user's choice synchronously.
 * `null` means "storage not read yet" and falls back to the default (enabled).
 */
let preloadRequestedMem: boolean | null = null;

const defaultSharedSettingsWriter = createSerializedSettingsWriter<AppSettings>(
  timedAsyncStorage,
  STORAGE_KEY,
  () => {},
  { requireReconciliation: true },
);

const customSettingsWriters = new WeakMap<object, SettingsWriter>();

function getSettingsWriter(storage: StringStorage, cacheKey: object = storage as object): SettingsWriter {
  const key = cacheKey;
  const existing = customSettingsWriters.get(key);
  if (existing) return existing;
  const writer = createSerializedSettingsWriter<AppSettings>(
    createTimedStorage(storage),
    STORAGE_KEY,
    () => {},
    { requireReconciliation: true },
  );
  customSettingsWriters.set(key, writer);
  return writer;
}

function verifySettingsReadback(raw: string, expected: AppSettings): void {
  let actual: unknown;
  try {
    actual = JSON.parse(raw);
  } catch {
    throw new Error('Settings storage readback verification mismatch: invalid JSON');
  }
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error('Settings storage readback verification mismatch');
  }
}

let sharedSettingsOperationTail: Promise<void> = Promise.resolve();

function enqueueSharedSettingsOperation<T>(operation: () => Promise<T>): Promise<T> {
  const task = sharedSettingsOperationTail.then(operation, operation);
  sharedSettingsOperationTail = task.then(() => undefined, () => undefined);
  return task;
}

async function readLatestSettings(fallback?: AppSettings): Promise<AppSettings> {
  const raw = await timedAsyncStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return sanitizeSettings(parsed);
      }
    } catch {
      // Treat malformed persisted settings as the caller's already-sanitized snapshot.
    }
  }
  return sanitizeSettings(fallback ?? { ...DEFAULTS, language: getBootLanguage() });
}

function enqueueSharedSettingsMutation(
  updater: (current: AppSettings) => AppSettings,
  fallback?: AppSettings,
  verify?: StoredValueVerifier<AppSettings>,
): Promise<AppSettings> {
  return enqueueSharedSettingsOperation(async () => {
    await defaultSharedSettingsWriter.reconcile();
    const latest = await readLatestSettings(fallback);
    const nextClean = sanitizeSettings(updater(latest));
    return defaultSharedSettingsWriter(nextClean, verify ?? verifySettingsReadback);
  });
}

type SettingsUpdater = (update: (current: AppSettings) => AppSettings) => AppSettings;
let activeSettingsUpdater: SettingsUpdater | null = null;

let standaloneQueue: Promise<unknown> = Promise.resolve();

/**
 * Routes standalone settings updates through the production settings provider/queue
 * without losing newer fields or racing concurrent writes.
 * Serializes the complete read -> compute -> write/read-back operation for standalone callers.
 */
export async function enqueueSettingsUpdate(
  updater: (current: AppSettings) => AppSettings,
  storage: StringStorage = AsyncStorage,
): Promise<AppSettings> {
  if (activeSettingsUpdater && storage === AsyncStorage) {
    return activeSettingsUpdater(updater);
  }

  if (storage === AsyncStorage) {
    return enqueueSharedSettingsMutation(updater);
  }

  const op = async (): Promise<AppSettings> => {
    if (activeSettingsUpdater && storage === AsyncStorage) {
      return activeSettingsUpdater(updater);
    }
    let latestRaw: string | null = null;
    const timedStorage = createTimedStorage(storage);
    try {
      latestRaw = await timedStorage.getItem(STORAGE_KEY);
    } catch {}
    const parsed = latestRaw ? JSON.parse(latestRaw) : {};
    const current = sanitizeSettings(parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {});
    const nextClean = sanitizeSettings(updater(current));
    const writer = getSettingsWriter(storage);
    await writer.reconcile();
    const persisted = await writer(nextClean, (raw) => {
      const stored = raw ? JSON.parse(raw) : null;
      if (!stored || typeof stored !== 'object') {
        throw new Error('Storage readback failed: invalid settings object');
      }
    });
    preloadRequestedMem = persisted.quranPreloadRequested;
    return persisted;
  };

  const task = standaloneQueue.then(op, op);
  standaloneQueue = task.then(() => undefined, () => undefined);
  return task;
}

/** Current storage lifecycle; `unresolved` is never treated as durable success. */
export function getSettingsWriteState(storage: StringStorage = AsyncStorage): SettingsWriteState<unknown> {
  if (storage === AsyncStorage) return defaultSharedSettingsWriter.getState();
  const writer = customSettingsWriters.get(storage as object);
  if (writer) return writer.getState();
  return {
    status: 'idle',
    generation: 0,
    value: null,
    error: null,
    reconciliationRequired: true,
  };
}

/** Synchronous read for background callers. Defaults to enabled before storage loads. */
export function getQuranPreloadRequested(): boolean {
  return preloadRequestedMem ?? DEFAULTS.quranPreloadRequested;
}

/** Async read straight from storage — for launch-time guards before the provider hydrates. */
export async function loadQuranPreloadRequested(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed: Partial<AppSettings> = JSON.parse(raw);
      if (typeof parsed.quranPreloadRequested === 'boolean') {
        preloadRequestedMem = parsed.quranPreloadRequested;
        return parsed.quranPreloadRequested;
      }
    }
  } catch {
    // fall through to default
  }
  preloadRequestedMem = DEFAULTS.quranPreloadRequested;
  return DEFAULTS.quranPreloadRequested;
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(() => ({
    ...DEFAULTS,
    language: getBootLanguage(),
  }));
  const hydrationBaselineRef = useRef<AppSettings>(settings);
  const [ready, setReady] = useState(false);
  const settingsRef = useRef<AppSettings>(settings);
  const lastPersistedRef = useRef<AppSettings>(settings);
  const settingsGenerationRef = useRef(0);
  const settingsFieldGenerationRef = useRef<Partial<Record<keyof AppSettings, number>>>({});
  const locationMutatedDuringHydrationRef = useRef(false);
  const languageSwitchGenerationRef = useRef(0);
  const writeSettings = defaultSharedSettingsWriter;

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const enqueueWrite = useCallback(
    (
      nextClean: AppSettings,
      verify?: StoredValueVerifier<AppSettings>,
      generation = settingsGenerationRef.current,
    ): Promise<AppSettings> => {
      return enqueueSharedSettingsOperation(async () => {
        await writeSettings.reconcile();
        return writeSettings(nextClean, verify ?? verifySettingsReadback);
      })
        .then((persisted) => {
          lastPersistedRef.current = persisted;
          return persisted;
        })
        .catch((err) => {
          if (settingsGenerationRef.current === generation) {
            const rollback = lastPersistedRef.current;
            settingsRef.current = rollback;
            preloadRequestedMem = rollback.quranPreloadRequested;
            setSettings(rollback);
          }
          throw err;
        });
    },
    [writeSettings],
  );

  const enqueueMutation = useCallback(
    (
      updater: (current: AppSettings) => AppSettings,
      optimistic: AppSettings,
      verify?: StoredValueVerifier<AppSettings>,
      generation = settingsGenerationRef.current,
    ): Promise<AppSettings> => {
      return enqueueSharedSettingsMutation(updater, optimistic, verify ?? verifySettingsReadback)
        .then((persisted) => {
          lastPersistedRef.current = persisted;
          return persisted;
        })
        .catch((err) => {
          if (settingsGenerationRef.current === generation) {
            const rollback = lastPersistedRef.current;
            settingsRef.current = rollback;
            preloadRequestedMem = rollback.quranPreloadRequested;
            setSettings(rollback);
          }
          throw err;
        });
    },
    [],
  );

  useEffect(() => {
    const hydrationStartGeneration = settingsGenerationRef.current;
    const hydrationStartFieldGenerations = { ...settingsFieldGenerationRef.current };
    (async () => {
      try {
        const read = (key: string) => timedAsyncStorage.getItem(key).then(
          (value) => ({ ok: true as const, value }),
          () => ({ ok: false as const, value: null }),
        );
        const [rawRead, legacyFontRead, legacyShowRead, methodMigratedRead] = await Promise.all([
          read(STORAGE_KEY),
          read(LEGACY_QURAN_FONT_SIZE),
          read(LEGACY_QURAN_SHOW_TRANSLATION),
          read(METHOD_MIGRATION_KEY),
        ]);
        const raw = rawRead.ok ? rawRead.value : null;
        let parsedRaw: unknown = {};
        let persistedSettingsKnown = rawRead.ok;
        if (raw) {
          try {
            parsedRaw = JSON.parse(raw);
          } catch {
            persistedSettingsKnown = false;
          }
        }
        const next: AppSettings = persistedSettingsKnown
          ? sanitizeSettings(parsedRaw)
          : { ...hydrationBaselineRef.current };
        const parsed = (persistedSettingsKnown && parsedRaw && typeof parsedRaw === 'object' && !Array.isArray(parsedRaw))
          ? (parsedRaw as Record<string, unknown>)
          : {};

        preloadRequestedMem = next.quranPreloadRequested;

        // If storage did not explicitly specify a valid language, preserve boot language
        if (!isAppLanguage(parsed.language)) {
          next.language = getBootLanguage();
        }

        // Keep the confirmed durable snapshot separate from migrations and live
        // hydration changes. A failed hydration write must roll back to this
        // snapshot, including its nested settings fields.
        const confirmedHydrationBaseline = sanitizeSettings(next);

        // Adopt legacy QuranReaderScreen AsyncStorage values once, when settings
        // don't own them yet — settings become the source of truth from here on.
        let migrated = false;
        let methodMigrationPending = false;

        // One-time migration: bump persisted methodId to 16 (Dubai official calculation)
        // if still on the legacy default (8). Does not touch custom methods or other user settings.
        const methodMigrated = methodMigratedRead.ok ? methodMigratedRead.value : null;
        const legacyFontSize = legacyFontRead.ok ? legacyFontRead.value : null;
        const legacyShowTranslation = legacyShowRead.ok ? legacyShowRead.value : null;
        if (persistedSettingsKnown && methodMigratedRead.ok && !methodMigrated && (!parsed.settingsVersion || Number(parsed.settingsVersion) < SETTINGS_VERSION)) {
          if (parsed.methodId === 8) {
            next.methodId = 16;
            migrated = true;
          }
          next.settingsVersion = SETTINGS_VERSION;
          migrated = true;
          methodMigrationPending = true;
        } else if (persistedSettingsKnown && methodMigratedRead.ok && !methodMigrated) {
          AsyncStorage.setItem(METHOD_MIGRATION_KEY, 'true').catch(() => {});
        }
        if (legacyFontRead.ok && typeof parsed.quranFontSize !== 'number' && legacyFontSize) {
          const legacy = parseInt(legacyFontSize, 10);
          if (!isNaN(legacy)) {
            next.quranFontSize = clampQuranFontSize(legacy);
            migrated = true;
          }
        }
        if (legacyShowRead.ok && typeof parsed.quranShowTranslation !== 'boolean' && legacyShowTranslation !== null) {
          next.quranShowTranslation = legacyShowTranslation === 'true';
          migrated = true;
        }

        if (next.autoLocation) {
          setCachedLocation(next.autoLocation, next.autoLocationTimestamp ?? Date.now());
        }

        // Guard the hydration-vs-grant race: if the user already changed location
        // during hydration (e.g. granted location via the setup popup), keep their
        // live changes. On a fresh install the storage snapshot can be empty
        // (DEFAULTS), and a blind setSettings(next) would clobber the just-saved
        // autoLocation/locationMode back to manual — "allowed but nothing changed".
        // Security-audit M4: only carry the location fields the grant actually
        // writes; never spread the whole live state (which on a fresh install is
        // DEFAULTS and would clobber a stored PIN/lock from `next`).
        // Preserve controls changed while AsyncStorage was hydrating. Without this,
        // a fast Quran reader tap is overwritten by the older storage snapshot.
        const live = settingsRef.current;
        const changedDuringHydration = Object.keys(DEFAULTS).reduce((merged, key) => {
          const typedKey = key as keyof AppSettings;
          const fieldGeneration = settingsFieldGenerationRef.current[typedKey] ?? 0;
          const startFieldGeneration = hydrationStartFieldGenerations[typedKey] ?? 0;
          if (fieldGeneration > startFieldGeneration) {
            (merged as AppSettings)[typedKey] = live[typedKey] as never;
          }
          return merged;
        }, { ...next } as AppSettings);
        const hasLiveChanges = Object.keys(DEFAULTS).some((key) => {
          const typedKey = key as keyof AppSettings;
          return (settingsFieldGenerationRef.current[typedKey] ?? 0) >
            (hydrationStartFieldGenerations[typedKey] ?? 0);
        });
        settingsRef.current = changedDuringHydration;
        if (persistedSettingsKnown) {
          lastPersistedRef.current = migrated || hasLiveChanges
            ? confirmedHydrationBaseline
            : next;
        }
        setSettings((prev) => {
          const locationChangedDuringHydration = locationMutatedDuringHydrationRef.current;
          if (!locationChangedDuringHydration) return changedDuringHydration;
          return {
            ...changedDuringHydration,
            autoLocation: prev.autoLocation,
            autoLocationTimestamp: prev.autoLocationTimestamp,
            locationMode: prev.locationMode,
          };
        });
        setAudioTranslationEnabled(changedDuringHydration.translationAudioEnabled);
        setActiveAdhanReciterId(changedDuringHydration.adhanReciterId || 'alafasy');
        setAppLanguage(changedDuringHydration.language);
        if (migrated || hasLiveChanges) {
          enqueueWrite(changedDuringHydration, undefined, hydrationStartGeneration)
            .then(() => {
              if (methodMigrationPending) {
                AsyncStorage.setItem(METHOD_MIGRATION_KEY, 'true').catch(() => {});
              }
            })
            .catch(() => {});
        }
      } catch {
        // fall back to defaults, preserving boot language
        preloadRequestedMem = DEFAULTS.quranPreloadRequested;
        setAudioTranslationEnabled(DEFAULTS.translationAudioEnabled);
        setActiveAdhanReciterId(DEFAULTS.adhanReciterId);
        setAppLanguage(getBootLanguage());
      } finally {
        setReady(true);
      }
    })();
  }, [enqueueWrite]);

  const updateSettings = useCallback((update: (current: AppSettings) => AppSettings): AppSettings => {
    const previous = settingsRef.current;
    const clean = sanitizeSettings(update(previous));
    const generation = ++settingsGenerationRef.current;
    for (const key of Object.keys(DEFAULTS) as (keyof AppSettings)[]) {
      if (!Object.is(previous[key], clean[key])) settingsFieldGenerationRef.current[key] = generation;
    }
    settingsRef.current = clean;
    preloadRequestedMem = clean.quranPreloadRequested;
    setSettings(clean);
    enqueueMutation(update, clean, undefined, generation).catch(() => {});
    return clean;
  }, [enqueueMutation]);

  useEffect(() => {
    activeSettingsUpdater = (fn) => updateSettings(fn);
    return () => {
      activeSettingsUpdater = null;
    };
  }, [updateSettings]);

  const setThemeMode = useCallback(
    (themeMode: ThemeMode) => updateSettings((prev) => ({ ...prev, themeMode })),
    [updateSettings],
  );
  const setAccentKey = useCallback(
    (accentKey: AccentKey) => updateSettings((prev) => ({ ...prev, accentKey })),
    [updateSettings],
  );

  const value: SettingsContextValue = {
    settings,
    updateSettings,
    setMethod: (methodId) => updateSettings((prev) => ({ ...prev, methodId })),
    setMadhab: (madhab) => updateSettings((prev) => ({ ...prev, madhab })),
    setTimeFormat: (timeFormat) => updateSettings((prev) => ({ ...prev, timeFormat })),
    setLocationMode: (locationMode) => {
      locationMutatedDuringHydrationRef.current = true;
      updateSettings((prev) => ({ ...prev, locationMode }));
    },
    setManualLocation: (manualLocation) => updateSettings((prev) => ({ ...prev, manualLocation })),
    setAutoLocation: (autoLocation, timestamp = Date.now()) => {
      locationMutatedDuringHydrationRef.current = true;
      setCachedLocation(autoLocation, timestamp);
      updateSettings((prev) => ({ ...prev, autoLocation, autoLocationTimestamp: timestamp }));
    },
    setReminders: (remindersEnabled) => updateSettings((prev) => ({ ...prev, remindersEnabled })),
    setReminderOffsetMinutes: (reminderOffsetMinutes) => updateSettings((prev) => ({ ...prev, reminderOffsetMinutes })),
    setPrayerConfig: (prayer, config) =>
      updateSettings((prev) => ({
          ...prev,
          prayerConfigs: {
            ...prev.prayerConfigs,
            [prayer]: {
              ...(prev.prayerConfigs?.[prayer] || DEFAULT_PRAYER_CONFIGS[prayer]),
              ...config,
            },
          },
        })),
    setPrayerConfigs: (prayerConfigs) => updateSettings((prev) => ({ ...prev, prayerConfigs })),
    setQuranReminderEnabled: (quranReminderEnabled) => updateSettings((prev) => ({ ...prev, quranReminderEnabled })),
    setQuranReminderTime: (quranReminderTime) => updateSettings((prev) => ({ ...prev, quranReminderTime })),
    setQuranGoal: (quranGoal) => updateSettings((prev) => ({ ...prev, quranGoal })),
    setAdhanReciterId: (adhanReciterId) => {
      setActiveAdhanReciterId(adhanReciterId);
      updateSettings((prev) => ({ ...prev, adhanReciterId }));
    },
    setThemeMode,
    setAccentKey,
    setTranslationAudioEnabled: (translationAudioEnabled) => {
      setAudioTranslationEnabled(translationAudioEnabled);
      updateSettings((prev) => ({ ...prev, translationAudioEnabled }));
    },
    setNamesLanguage: (namesLanguage) => updateSettings((prev) => ({ ...prev, namesLanguage })),
    setWomenWorship: (womenWorshipEnabled) => updateSettings((prev) => ({ ...prev, womenWorshipEnabled })),
    setWomenPinHash: (womenPinHash) => updateSettings((prev) => ({ ...prev, womenPinHash })),
    setWomenLockEnabled: (womenLockEnabled) => updateSettings((prev) => ({ ...prev, womenLockEnabled })),
    setHapticsEnabled: (hapticsEnabled) => updateSettings((prev) => ({ ...prev, hapticsEnabled })),
    setQuranArabicFont: (quranArabicFont) => updateSettings((prev) => ({ ...prev, quranArabicFont })),
    setQuranScript: (quranScript) => updateSettings((prev) => ({ ...prev, quranScript })),
    setQuranFontSize: (quranFontSize: number | ((prev: number) => number)) =>
      updateSettings((prev) => {
        const current = typeof prev.quranFontSize === 'number' ? prev.quranFontSize : QURAN_FONT_SIZE_DEFAULT;
        const nextVal = typeof quranFontSize === 'function' ? quranFontSize(current) : quranFontSize;
        return { ...prev, quranFontSize: clampQuranFontSize(nextVal) };
      }),
    setQuranLineHeight: (quranLineHeight: number | ((prev: number) => number)) =>
      updateSettings((prev) => {
        const current = typeof prev.quranLineHeight === 'number' ? prev.quranLineHeight : QURAN_LINE_HEIGHT_DEFAULT;
        const nextVal = typeof quranLineHeight === 'function' ? quranLineHeight(current) : quranLineHeight;
        return { ...prev, quranLineHeight: clampQuranLineHeight(nextVal) };
      }),
    setQuranShowTranslation: (quranShowTranslation) =>
      updateSettings((prev) => ({ ...prev, quranShowTranslation })),
    setTafsirSourceId: (tafsirSourceId) =>
      updateSettings((prev) => ({ ...prev, tafsirSourceId })),
    setQuranPreloadRequested: (quranPreloadRequested) =>
      updateSettings((prev) => ({ ...prev, quranPreloadRequested })),
    setLanguage: async (nextLang: AppLanguage) => {
      const prevLang = settingsRef.current.language;
      if (nextLang === prevLang) {
        return;
      }

      const generation = ++languageSwitchGenerationRef.current;

      // Snapshot settings and compute sanitized clean state once.
      const currentSnapshot = settingsRef.current;
      const nextClean = computeNextLanguageSettings(currentSnapshot, nextLang);
      const settingsGeneration = ++settingsGenerationRef.current;
      if (!Object.is(currentSnapshot.language, nextClean.language)) {
        settingsFieldGenerationRef.current.language = settingsGeneration;
      }
      recordRequestedLanguage?.(nextLang);

      // Make optimistic React state and ref reflect nextClean before awaiting the language queue,
      // so any subsequent setter snapshot includes the target language.
      settingsRef.current = nextClean;
      preloadRequestedMem = nextClean.quranPreloadRequested;
      setSettings(nextClean);

      try {
        // Enqueue through the shared write queue and await completion
        await enqueueMutation((latest) => computeNextLanguageSettings(latest, nextLang), nextClean, (raw) => {
          const parsed = JSON.parse(raw);
          if (!parsed || parsed.language !== nextLang) {
            throw new Error(
              `Storage readback verification mismatch: expected "${nextLang}", got "${parsed?.language}"`
            );
          }
        }, settingsGeneration);
      } catch (err) {
        // On failure: preserve any newer unrelated fields while restoring the previous language,
        // and ensure a queued newer selection cannot silently leave disk on the failed target language.
        if (generation === languageSwitchGenerationRef.current) {
          const currentLang = settingsRef.current.language;
          if (currentLang === nextLang) {
            const restored = sanitizeSettings({ ...settingsRef.current, language: prevLang });
            settingsRef.current = restored;
            preloadRequestedMem = restored.quranPreloadRequested;
            setSettings((prev) => (prev.language === nextLang ? sanitizeSettings({ ...prev, language: prevLang }) : prev));
            setAppLanguage(prevLang);
            enqueueWrite(restored).catch(() => {});
          } else if (currentLang === prevLang) {
            setAppLanguage(prevLang);
          }
        }
        throw err;
      }

      if (generation !== languageSwitchGenerationRef.current) {
        return;
      }

      // Readback succeeded: enqueueWrite already maintains lastPersistedRef and optimistic state
      // already reflects nextClean. Do not redundantly reassign state or ref so newer concurrent appearance changes are never overwritten.
      if (settingsRef.current.language === nextLang) {
        setAppLanguage(nextLang);
      }
      markLanguageDurable?.(nextLang);

      // Side-effects run ONLY AFTER the main verified language write.
      // The same idempotent policy is shared with the direction-changing path.
      // Tafsir is deliberately absent here: the edition choice is preserved.
      await applyLinkedLanguageEffects(nextLang);
    },
  };

  if (!ready) return null;

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
