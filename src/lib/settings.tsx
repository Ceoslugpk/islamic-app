import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Location } from './prayerTimes';
import { AccentKey, ACCENT_KEYS, DEFAULT_ACCENT } from './accents';
import { NamesLanguage } from './names99';
import {
  setAudioTranslationEnabled,
  setAudioTranslationEdition,
  DEFAULT_AUDIO_TRANSLATION_EDITION_ID,
  AUDIO_TRANSLATION_EDITION_KEY,
} from './quranAudio';
import { getQuranTranslationLanguage, setQuranTranslationLanguage } from './quranLanguageState';
import { AppLanguage, setAppLanguage, getBootLanguage } from './i18n';
import { setActiveAdhanReciterId } from './audio';
import { setCachedLocation } from './useLocation';
import { TAFSIR_SOURCES } from './tafsirSources';
import { createSerializedSettingsWriter, StoredValueVerifier } from './settingsWriteQueue';

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
export const QURAN_FONT_SIZE_DEFAULT = 24;
export const QURAN_LINE_HEIGHT_MIN = 1.4;
export const QURAN_LINE_HEIGHT_MAX = 2.2;
export const QURAN_LINE_HEIGHT_STEP = 0.1;
export const QURAN_LINE_HEIGHT_DEFAULT = 1.8;

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
  setQuranFontSize: (size: number) => void;
  setQuranLineHeight: (multiplier: number) => void;
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
  accentKey: 'amber',
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

  // 31. language ('en' | 'ur' | 'ar' | 'hi')
  const language: AppLanguage =
    p.language === 'ur' || p.language === 'ar' || p.language === 'hi' || p.language === 'en' ? p.language : DEFAULTS.language;

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

export const CANONICAL_AUTO_LINKED_TAFSIR_IDS: ReadonlySet<string> = new Set([
  'jalalayn',
  'api-ibn-kathir-urdu',
  'api-ibn-kathir-ar',
]);

export const CANONICAL_AUTO_LINKED_QURAN_LANGS: ReadonlySet<string> = new Set([
  'en',
  'ur',
  'ar',
  'hi',
]);

/**
 * Pure helper: returns the auto-linked tafsir source ID for a given target language,
 * or undefined if the current tafsir is a custom user selection that must be preserved.
 */
export function getAutoLinkedTafsir(currentTafsirId: string, nextLang: AppLanguage): string | undefined {
  if (!CANONICAL_AUTO_LINKED_TAFSIR_IDS.has(currentTafsirId)) {
    return undefined;
  }
  if (nextLang === 'ar') {
    return 'api-ibn-kathir-ar';
  }
  if (nextLang === 'ur') {
    return 'api-ibn-kathir-urdu';
  }
  if (nextLang === 'en' || nextLang === 'hi') {
    return 'jalalayn';
  }
  return undefined;
}

/**
 * Pure helper: computes next AppSettings when changing language.
 * Guarantees all existing settings fields are preserved and sanitized,
 * while auto-linking canonical tafsir sources symmetrically.
 */
export function computeNextLanguageSettings(
  prev: AppSettings,
  nextLang: AppLanguage
): AppSettings {
  const targetTafsir = getAutoLinkedTafsir(prev.tafsirSourceId, nextLang);
  return sanitizeSettings({
    ...prev,
    language: nextLang,
    ...(targetTafsir ? { tafsirSourceId: targetTafsir } : {}),
  });
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
  const nextSettings = computeNextLanguageSettings(currentSettings, nextLang);
  await storage.setItem(STORAGE_KEY, JSON.stringify(nextSettings));
  if (storage.getItem) {
    const raw = await storage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (!parsed || parsed.language !== nextLang) {
      throw new Error(`Persisted language verification mismatch: expected "${nextLang}", got "${parsed?.language}"`);
    }
  }
  return nextSettings;
}


/**
 * In-memory mirror of `quranPreloadRequested` so non-React callers (background
 * preloader, warmup, app bootstrap) can honour the user's choice synchronously.
 * `null` means "storage not read yet" and falls back to the default (enabled).
 */
let preloadRequestedMem: boolean | null = null;

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
  const [ready, setReady] = useState(false);
  const settingsRef = useRef<AppSettings>(settings);
  const lastPersistedRef = useRef<AppSettings>(settings);
  const locationMutatedDuringHydrationRef = useRef(false);
  const [writeSettings] = useState(() =>
    createSerializedSettingsWriter<AppSettings>(
      AsyncStorage,
      STORAGE_KEY,
      () => {},
    )
  );

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  function enqueueWrite(
    nextClean: AppSettings,
    verify?: StoredValueVerifier<AppSettings>,
  ): Promise<AppSettings> {
    return writeSettings(nextClean, verify)
      .then((persisted) => {
        lastPersistedRef.current = persisted;
        return persisted;
      })
      .catch((err) => {
        if (settingsRef.current === nextClean) {
          const rollback = lastPersistedRef.current;
          settingsRef.current = rollback;
          preloadRequestedMem = rollback.quranPreloadRequested;
          setSettings(rollback);
        }
        throw err;
      });
  }

  useEffect(() => {
    (async () => {
      try {
        const [raw, legacyFontSize, legacyShowTranslation, methodMigrated] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY),
          AsyncStorage.getItem(LEGACY_QURAN_FONT_SIZE),
          AsyncStorage.getItem(LEGACY_QURAN_SHOW_TRANSLATION),
          AsyncStorage.getItem(METHOD_MIGRATION_KEY),
        ]);
        const parsedRaw = raw ? JSON.parse(raw) : {};
        const next: AppSettings = sanitizeSettings(parsedRaw);
        const parsed = (parsedRaw && typeof parsedRaw === 'object' && !Array.isArray(parsedRaw))
          ? (parsedRaw as Record<string, unknown>)
          : {};

        preloadRequestedMem = next.quranPreloadRequested;

        // If storage did not explicitly specify a valid language, preserve boot language
        if (parsed.language !== 'en' && parsed.language !== 'ur' && parsed.language !== 'ar' && parsed.language !== 'hi') {
          next.language = getBootLanguage();
        }

        // Adopt legacy QuranReaderScreen AsyncStorage values once, when settings
        // don't own them yet — settings become the source of truth from here on.
        let migrated = false;

        // One-time migration: bump persisted methodId to 16 (Dubai official calculation)
        // if still on the legacy default (8). Does not touch custom methods or other user settings.
        if (!methodMigrated && (!parsed.settingsVersion || Number(parsed.settingsVersion) < SETTINGS_VERSION)) {
          if (parsed.methodId === 8) {
            next.methodId = 16;
            migrated = true;
          }
          next.settingsVersion = SETTINGS_VERSION;
          migrated = true;
          AsyncStorage.setItem(METHOD_MIGRATION_KEY, 'true').catch(() => {});
        } else if (!methodMigrated) {
          AsyncStorage.setItem(METHOD_MIGRATION_KEY, 'true').catch(() => {});
        }
        if (typeof parsed.quranFontSize !== 'number' && legacyFontSize) {
          const legacy = parseInt(legacyFontSize, 10);
          if (!isNaN(legacy)) {
            next.quranFontSize = clampQuranFontSize(legacy);
            migrated = true;
          }
        }
        if (typeof parsed.quranShowTranslation !== 'boolean' && legacyShowTranslation !== null) {
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
        settingsRef.current = next;
        lastPersistedRef.current = next;
        setSettings((prev) => {
          const locationChangedDuringHydration = locationMutatedDuringHydrationRef.current;
          if (!locationChangedDuringHydration) return next;
          return {
            ...next,
            autoLocation: prev.autoLocation,
            autoLocationTimestamp: prev.autoLocationTimestamp,
            locationMode: prev.locationMode,
          };
        });
        setAudioTranslationEnabled(next.translationAudioEnabled);
        setActiveAdhanReciterId(next.adhanReciterId || 'alafasy');
        setAppLanguage(next.language);
        if (migrated) {
          enqueueWrite(next).catch(() => {});
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
  }, []);

  function updateSettings(update: (current: AppSettings) => AppSettings): AppSettings {
    const clean = sanitizeSettings(update(settingsRef.current));
    settingsRef.current = clean;
    preloadRequestedMem = clean.quranPreloadRequested;
    setSettings(clean);
    enqueueWrite(clean).catch(() => {});
    return clean;
  }

  const value: SettingsContextValue = {
    settings,
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
    setThemeMode: (themeMode) => updateSettings((prev) => ({ ...prev, themeMode })),
    setAccentKey: (accentKey) => updateSettings((prev) => ({ ...prev, accentKey })),
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
    setQuranFontSize: (quranFontSize) =>
      updateSettings((prev) => ({ ...prev, quranFontSize: clampQuranFontSize(quranFontSize) })),
    setQuranLineHeight: (quranLineHeight) =>
      updateSettings((prev) => ({ ...prev, quranLineHeight: clampQuranLineHeight(quranLineHeight) })),
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

      // Snapshot settings and compute sanitized clean state once.
      const currentSnapshot = settingsRef.current;
      const nextClean = computeNextLanguageSettings(currentSnapshot, nextLang);

      // Make optimistic React state and ref reflect nextClean before awaiting the language queue,
      // so any subsequent setter snapshot includes the target language.
      settingsRef.current = nextClean;
      preloadRequestedMem = nextClean.quranPreloadRequested;
      setSettings(nextClean);

      try {
        // Enqueue through the shared write queue and await completion
        await enqueueWrite(nextClean, (raw) => {
          const parsed = JSON.parse(raw);
          if (!parsed || parsed.language !== nextLang) {
            throw new Error(
              `Storage readback verification mismatch: expected "${nextLang}", got "${parsed?.language}"`
            );
          }
        });
      } catch (err) {
        // On failure: preserve any newer unrelated fields while restoring the previous language,
        // and ensure a queued newer selection cannot silently leave disk on the failed target language.
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
        throw err;
      }

      // Readback succeeded: enqueueWrite already maintains lastPersistedRef and optimistic state
      // already reflects nextClean. Do not redundantly reassign state or ref so newer concurrent appearance changes are never overwritten.
      if (settingsRef.current.language === nextLang) {
        setAppLanguage(nextLang);
      }

      // Side-effects run ONLY AFTER the main verified language write.
      // Side-effect write failures are trapped locally so the main language write is never lost.
      let nextTafsir: string | undefined;
      if (nextLang === 'ur') {
        try {
          const currentQuranLang = getQuranTranslationLanguage();
          if (currentQuranLang === 'en') {
            await setQuranTranslationLanguage('ur');
          } else if (currentQuranLang === 'ar') {
            await setQuranTranslationLanguage('ur');
          } else if (currentQuranLang === 'hi') {
            await setQuranTranslationLanguage('ur');
          }
        } catch {}

        if (currentSnapshot.tafsirSourceId === 'jalalayn' || currentSnapshot.tafsirSourceId === 'api-ibn-kathir-ar') {
          nextTafsir = 'api-ibn-kathir-urdu';
        }

        try {
          const savedAudioEdition = await AsyncStorage.getItem(AUDIO_TRANSLATION_EDITION_KEY);
          if (!savedAudioEdition || savedAudioEdition === DEFAULT_AUDIO_TRANSLATION_EDITION_ID) {
            await setAudioTranslationEdition('ur.everyayah-shamshad');
          }
        } catch {}
      } else if (nextLang === 'ar') {
        try {
          const currentQuranLang = getQuranTranslationLanguage();
          if (currentQuranLang === 'en' || currentQuranLang === 'ur' || currentQuranLang === 'hi') {
            await setQuranTranslationLanguage('ar');
          }
        } catch {}

        if (currentSnapshot.tafsirSourceId === 'jalalayn' || currentSnapshot.tafsirSourceId === 'api-ibn-kathir-urdu') {
          nextTafsir = 'api-ibn-kathir-ar';
        }

        try {
          const savedAudioEdition = await AsyncStorage.getItem(AUDIO_TRANSLATION_EDITION_KEY);
          if (savedAudioEdition === 'ur.everyayah-shamshad') {
            await setAudioTranslationEdition(DEFAULT_AUDIO_TRANSLATION_EDITION_ID);
          }
        } catch {}
      } else if (nextLang === 'hi') {
        try {
          const currentQuranLang = getQuranTranslationLanguage();
          if (currentQuranLang === 'en' || currentQuranLang === 'ur' || currentQuranLang === 'ar') {
            await setQuranTranslationLanguage('hi');
          }
        } catch {}

        if (currentSnapshot.tafsirSourceId === 'api-ibn-kathir-urdu' || currentSnapshot.tafsirSourceId === 'api-ibn-kathir-ar') {
          nextTafsir = 'jalalayn';
        }

        try {
          const savedAudioEdition = await AsyncStorage.getItem(AUDIO_TRANSLATION_EDITION_KEY);
          if (savedAudioEdition === 'ur.everyayah-shamshad') {
            await setAudioTranslationEdition(DEFAULT_AUDIO_TRANSLATION_EDITION_ID);
          }
        } catch {}
      } else {
        // Switching back to English (from ur, ar, or hi)
        try {
          const currentQuranLang = getQuranTranslationLanguage();
          if (currentQuranLang === 'ur') {
            await setQuranTranslationLanguage('en');
          } else if (currentQuranLang === 'ar') {
            await setQuranTranslationLanguage('en');
          } else if (currentQuranLang === 'hi') {
            await setQuranTranslationLanguage('en');
          }
        } catch {}

        if (currentSnapshot.tafsirSourceId === 'api-ibn-kathir-urdu' || currentSnapshot.tafsirSourceId === 'api-ibn-kathir-ar') {
          nextTafsir = 'jalalayn';
        }

        try {
          const savedAudioEdition = await AsyncStorage.getItem(AUDIO_TRANSLATION_EDITION_KEY);
          if (savedAudioEdition === 'ur.everyayah-shamshad') {
            await setAudioTranslationEdition(DEFAULT_AUDIO_TRANSLATION_EDITION_ID);
          }
        } catch {}
      }

      if (nextTafsir && settingsRef.current.tafsirSourceId !== nextTafsir) {
        // Ensure subsequent tafsir update preserves nextLang and cannot overwrite it with old language
        updateSettings((prev) => ({
          ...prev,
          language: nextLang,
          tafsirSourceId: nextTafsir,
        }));
      }
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