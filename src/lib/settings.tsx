import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Location } from './prayerTimes';
import { AccentKey } from './accents';
import { NamesLanguage } from './names99';
import { setAudioTranslationEnabled } from './quranAudio';
import { setActiveAdhanReciterId } from './audio';

export type TimeFormat = '12h' | '24h';
export type LocationMode = 'auto' | 'manual';
export type ThemeMode = 'system' | 'ink' | 'paper';
export type QuranArabicFont = 'amiri' | 'notonaskh';
export type TafsirSourceId = 'jalalayn' | 'qurtubi' | 'miqbas' | 'waseet' | 'baghawi' | 'muyassar';

// Quran reader display ranges (shared by Settings UI + reader)
export const QURAN_FONT_SIZE_MIN = 18;
export const QURAN_FONT_SIZE_MAX = 40;
export const QURAN_FONT_SIZE_STEP = 2;
export const QURAN_FONT_SIZE_DEFAULT = 24;
export const QURAN_LINE_HEIGHT_MIN = 1.4;
export const QURAN_LINE_HEIGHT_MAX = 2.2;
export const QURAN_LINE_HEIGHT_STEP = 0.1;
export const QURAN_LINE_HEIGHT_DEFAULT = 1.6;

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

export interface AppSettings {
  methodId: number;
  timeFormat: TimeFormat;
  locationMode: LocationMode;
  manualLocation: Location;
  autoLocation: Location | null;
  remindersEnabled: boolean;
  reminderOffsetMinutes: number;
  quranReminderEnabled: boolean;
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
  quranFontSize: number;
  quranLineHeight: number;
  quranShowTranslation: boolean;
  tafsirSourceId: TafsirSourceId;
}

interface SettingsContextValue {
  settings: AppSettings;
  setMethod: (id: number) => void;
  setTimeFormat: (f: TimeFormat) => void;
  setLocationMode: (m: LocationMode) => void;
  setManualLocation: (loc: Location) => void;
  setAutoLocation: (loc: Location) => void;
  setReminders: (enabled: boolean) => void;
  setReminderOffsetMinutes: (minutes: number) => void;
  setQuranReminderEnabled: (enabled: boolean) => void;
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
  setQuranFontSize: (size: number) => void;
  setQuranLineHeight: (multiplier: number) => void;
  setQuranShowTranslation: (enabled: boolean) => void;
  setTafsirSourceId: (sourceId: TafsirSourceId) => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

const DEFAULTS: AppSettings = {
  methodId: 8,
  timeFormat: '12h',
  locationMode: 'auto',
  manualLocation: { latitude: 25.2048, longitude: 55.2708, label: 'Dubai, UAE' },
  autoLocation: null,
  remindersEnabled: false,
  reminderOffsetMinutes: 15,
  quranReminderEnabled: false,
  adhanReciterId: 'default',
  themeMode: 'system',
  accentKey: 'amber',
  translationAudioEnabled: true,
  namesLanguage: 'en',
  womenWorshipEnabled: false,
  womenPinHash: null,
  womenLockEnabled: false,
  hapticsEnabled: true,
  quranArabicFont: 'amiri',
  quranFontSize: QURAN_FONT_SIZE_DEFAULT,
  quranLineHeight: QURAN_LINE_HEIGHT_DEFAULT,
  quranShowTranslation: true,
  tafsirSourceId: 'jalalayn',
};

const STORAGE_KEY = 'islamic-settings';

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULTS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [raw, legacyFontSize, legacyShowTranslation] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY),
          AsyncStorage.getItem(LEGACY_QURAN_FONT_SIZE),
          AsyncStorage.getItem(LEGACY_QURAN_SHOW_TRANSLATION),
        ]);
        const parsed: Partial<AppSettings> = raw ? JSON.parse(raw) : {};
        const next: AppSettings = { ...DEFAULTS, ...parsed };

        if (next.quranArabicFont !== 'amiri' && next.quranArabicFont !== 'notonaskh') {
          next.quranArabicFont = DEFAULTS.quranArabicFont;
        }
        next.quranFontSize = clampQuranFontSize(next.quranFontSize);
        next.quranLineHeight = clampQuranLineHeight(next.quranLineHeight);
        next.quranShowTranslation =
          typeof next.quranShowTranslation === 'boolean'
            ? next.quranShowTranslation
            : DEFAULTS.quranShowTranslation;

        // Adopt legacy QuranReaderScreen AsyncStorage values once, when settings
        // don't own them yet — settings become the source of truth from here on.
        let migrated = false;
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

        setSettings(next);
        setAudioTranslationEnabled(next.translationAudioEnabled);
        setActiveAdhanReciterId(next.adhanReciterId || 'default');
        if (migrated) {
          AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
        }
      } catch {
        // fall back to defaults
        setAudioTranslationEnabled(DEFAULTS.translationAudioEnabled);
        setActiveAdhanReciterId(DEFAULTS.adhanReciterId);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  function persist(next: AppSettings) {
    setSettings(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
    return next;
  }

  const value: SettingsContextValue = {
    settings,
    setMethod: (methodId) => setSettings((prev) => persist({ ...prev, methodId })),
    setTimeFormat: (timeFormat) => setSettings((prev) => persist({ ...prev, timeFormat })),
    setLocationMode: (locationMode) => setSettings((prev) => persist({ ...prev, locationMode })),
    setManualLocation: (manualLocation) => setSettings((prev) => persist({ ...prev, manualLocation })),
    setAutoLocation: (autoLocation) => setSettings((prev) => persist({ ...prev, autoLocation })),
    setReminders: (remindersEnabled) => setSettings((prev) => persist({ ...prev, remindersEnabled })),
    setReminderOffsetMinutes: (reminderOffsetMinutes) => setSettings((prev) => persist({ ...prev, reminderOffsetMinutes })),
    setQuranReminderEnabled: (quranReminderEnabled) => setSettings((prev) => persist({ ...prev, quranReminderEnabled })),
    setAdhanReciterId: (adhanReciterId) => {
      setActiveAdhanReciterId(adhanReciterId);
      setSettings((prev) => persist({ ...prev, adhanReciterId }));
    },
    setThemeMode: (themeMode) => setSettings((prev) => persist({ ...prev, themeMode })),
    setAccentKey: (accentKey) => setSettings((prev) => persist({ ...prev, accentKey })),
    setTranslationAudioEnabled: (translationAudioEnabled) => {
      setAudioTranslationEnabled(translationAudioEnabled);
      setSettings((prev) => persist({ ...prev, translationAudioEnabled }));
    },
    setNamesLanguage: (namesLanguage) => setSettings((prev) => persist({ ...prev, namesLanguage })),
    setWomenWorship: (womenWorshipEnabled) => setSettings((prev) => persist({ ...prev, womenWorshipEnabled })),
    setWomenPinHash: (womenPinHash) => setSettings((prev) => persist({ ...prev, womenPinHash })),
    setWomenLockEnabled: (womenLockEnabled) => setSettings((prev) => persist({ ...prev, womenLockEnabled })),
    setHapticsEnabled: (hapticsEnabled) => setSettings((prev) => persist({ ...prev, hapticsEnabled })),
    setQuranArabicFont: (quranArabicFont) => setSettings((prev) => persist({ ...prev, quranArabicFont })),
    setQuranFontSize: (quranFontSize) =>
      setSettings((prev) => persist({ ...prev, quranFontSize: clampQuranFontSize(quranFontSize) })),
    setQuranLineHeight: (quranLineHeight) =>
      setSettings((prev) => persist({ ...prev, quranLineHeight: clampQuranLineHeight(quranLineHeight) })),
    setQuranShowTranslation: (quranShowTranslation) =>
      setSettings((prev) => persist({ ...prev, quranShowTranslation })),
    setTafsirSourceId: (tafsirSourceId) =>
      setSettings((prev) => persist({ ...prev, tafsirSourceId })),
  };

  if (!ready) return null;

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}