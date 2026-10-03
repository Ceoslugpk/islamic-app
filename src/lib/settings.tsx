import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Location } from './prayerTimes';
import { AccentKey } from './accents';
import { NamesLanguage } from './names99';
import { setAudioTranslationEnabled } from './quranAudio';

export type TimeFormat = '12h' | '24h';
export type LocationMode = 'auto' | 'manual';
export type ThemeMode = 'system' | 'ink' | 'paper';

export interface AppSettings {
  methodId: number;
  timeFormat: TimeFormat;
  locationMode: LocationMode;
  manualLocation: Location;
  autoLocation: Location | null;
  remindersEnabled: boolean;
  themeMode: ThemeMode;
  accentKey: AccentKey;
  translationAudioEnabled: boolean;
  namesLanguage: NamesLanguage;
  womenWorshipEnabled: boolean;
  womenPinHash: string | null;
  womenLockEnabled: boolean;
}

interface SettingsContextValue {
  settings: AppSettings;
  setMethod: (id: number) => void;
  setTimeFormat: (f: TimeFormat) => void;
  setLocationMode: (m: LocationMode) => void;
  setManualLocation: (loc: Location) => void;
  setAutoLocation: (loc: Location) => void;
  setReminders: (enabled: boolean) => void;
  setThemeMode: (m: ThemeMode) => void;
  setAccentKey: (key: AccentKey) => void;
  setTranslationAudioEnabled: (enabled: boolean) => void;
  setNamesLanguage: (lang: NamesLanguage) => void;
  setWomenWorship: (enabled: boolean) => void;
  setWomenPinHash: (hash: string | null) => void;
  setWomenLockEnabled: (enabled: boolean) => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

const DEFAULTS: AppSettings = {
  methodId: 8,
  timeFormat: '12h',
  locationMode: 'auto',
  manualLocation: { latitude: 25.2048, longitude: 55.2708, label: 'Dubai, UAE' },
  autoLocation: null,
  remindersEnabled: false,
  themeMode: 'system',
  accentKey: 'amber',
  translationAudioEnabled: true,
  namesLanguage: 'en',
  womenWorshipEnabled: false,
  womenPinHash: null,
  womenLockEnabled: false,
};

const STORAGE_KEY = 'islamic-settings';

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULTS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          const next = { ...DEFAULTS, ...parsed };
          setSettings(next);
          setAudioTranslationEnabled(next.translationAudioEnabled);
        } else {
          setAudioTranslationEnabled(DEFAULTS.translationAudioEnabled);
        }
      } catch {
        // fall back to defaults
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
  };

  if (!ready) return null;

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}