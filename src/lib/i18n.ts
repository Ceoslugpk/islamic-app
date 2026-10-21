import i18n, { use as i18nextUse, changeLanguage, t as i18nT } from 'i18next';
import { initReactI18next, useTranslation } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { I18nManager, Platform } from 'react-native';
import { loadQuranCache, saveQuranCache } from './db';
import en from '../locales/en.json';
import ur from '../locales/ur.json';
import ar from '../locales/ar.json';
import hi from '../locales/hi.json';
import ml from '../locales/ml.json';
import si from '../locales/si.json';
import bn from '../locales/bn.json';
import ms from '../locales/ms.json';
import ta from '../locales/ta.json';
import id from '../locales/id.json';
import ps from '../locales/ps.json';

export type AppLanguage = 'en' | 'ur' | 'ar' | 'hi' | 'ml' | 'si' | 'bn' | 'ms' | 'ta' | 'id' | 'ps';

function matchesLanguageTag(code: string, language: string): boolean {
  return code === language || code.startsWith(`${language}-`) || code.startsWith(`${language}_`);
}

export function isRtlLanguage(lang: AppLanguage | string | null | undefined): boolean {
  if (!lang) return false;
  const normalized = lang.toLowerCase().trim();
  return ['ur', 'ar', 'ps'].some((language) => matchesLanguageTag(normalized, language)) ||
    ['ckb', 'fa', 'ug', 'he', 'sd', 'dv'].some((language) => matchesLanguageTag(normalized, language)) ||
    normalized === 'ku-arab';
}

export function isAppLanguage(value: unknown): value is AppLanguage {
  return value === 'en' || value === 'ur' || value === 'ar' || value === 'hi' || value === 'ml' || value === 'si' ||
    value === 'bn' || value === 'ms' || value === 'ta' || value === 'id' || value === 'ps';
}

const locales = Localization.getLocales();
const deviceLanguageCode = locales && locales.length > 0 ? locales[0].languageCode : 'en';

export function resolveDeviceAppLanguage(code: string | null | undefined): AppLanguage {
  if (!code) return 'en';
  const lower = code.toLowerCase();
  if (matchesLanguageTag(lower, 'ar')) return 'ar';
  if (matchesLanguageTag(lower, 'ur')) return 'ur';
  if (matchesLanguageTag(lower, 'hi')) return 'hi';
  if (matchesLanguageTag(lower, 'ml')) return 'ml';
  if (matchesLanguageTag(lower, 'si')) return 'si';
  if (matchesLanguageTag(lower, 'bn')) return 'bn';
  if (matchesLanguageTag(lower, 'ms')) return 'ms';
  if (matchesLanguageTag(lower, 'ta')) return 'ta';
  if (matchesLanguageTag(lower, 'id')) return 'id';
  if (matchesLanguageTag(lower, 'ps')) return 'ps';
  return 'en';
}

// The persisted app language is the single source of truth for the UI language.
// The native boot path needs a synchronous copy because AsyncStorage is async.
// The verified switch path updates this mirror before reload, and it is read
// synchronously before i18n/native views initialize.
const PERSISTED_LANGUAGE_KEY = 'islamic-settings'; // same key as settings.tsx
const SYNC_LANGUAGE_CACHE_KEY = 'app-language';

function readSynchronousLanguageMirror(): AppLanguage | null {
  try {
    const cached = loadQuranCache<unknown>(SYNC_LANGUAGE_CACHE_KEY);
    if (isAppLanguage(cached)) return cached;
    if (cached && typeof cached === 'object' && !Array.isArray(cached)) {
      const language = (cached as { language?: unknown }).language;
      return isAppLanguage(language) ? language : null;
    }
  } catch {
    // A cache failure must not prevent the app from booting.
  }
  return null;
}

function writeSynchronousLanguageMirror(language: AppLanguage): boolean {
  try {
    return saveQuranCache(SYNC_LANGUAGE_CACHE_KEY, { language }) !== false;
  } catch {
    return false;
  }
}

const synchronousLanguageAtBoot = readSynchronousLanguageMirror();
let persistedLanguage: AppLanguage | null = synchronousLanguageAtBoot;
let languageResolved = false;

export async function resolvePersistedLanguage(forceFresh = false): Promise<AppLanguage> {
  if (!forceFresh && languageResolved && persistedLanguage) return persistedLanguage;
  try {
    const raw = await AsyncStorage.getItem(PERSISTED_LANGUAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && isAppLanguage(parsed.language)) {
        persistedLanguage = parsed.language;
        if (!writeSynchronousLanguageMirror(parsed.language)) {
          console.warn('[i18n] Could not refresh the language mirror; durable storage remains authoritative.');
        }
      }
    }
  } catch {
    // ignore — fall through to device default
  }
  if (!persistedLanguage) {
    persistedLanguage = resolveDeviceAppLanguage(deviceLanguageCode);
  }
  languageResolved = true;
  return persistedLanguage;
}

/** Synchronously readable current language (module-level cache, set at boot). */
export function getBootLanguage(): AppLanguage {
  if (persistedLanguage) return persistedLanguage;
  return resolveDeviceAppLanguage(deviceLanguageCode);
}

const initialLanguage: AppLanguage = getBootLanguage();

i18nextUse(initReactI18next).init({
  resources: {
    en: { translation: en },
    ur: { translation: ur },
    ar: { translation: ar },
    hi: { translation: hi },
    ml: { translation: ml },
    si: { translation: si },
    bn: { translation: bn },
    ms: { translation: ms },
    ta: { translation: ta },
    id: { translation: id },
    ps: { translation: ps },
  },
  lng: initialLanguage,
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
  keySeparator: false,
  nsSeparator: false,
  compatibilityJSON: 'v4',
});

let nativeDirectionApplied: boolean | null = null;
let nativeDirectionLocked = false;

/**
 * Configure RTL layout direction for React Native and Web.
 * At boot, force the direction before any screens mount so the native view tree
 * inherits the direction for its full lifetime. Language changes persist their
 * target direction with prepareNativeLayoutDirection() and then use an app reload.
 *
 * Enforces a single source of truth: once the durable boot language is resolved,
 * native allowRTL/forceRTL is locked for the process before UI mounts. A stale
 * provisional mirror may be corrected once in that pre-mount window; runtime
 * direction changes after the lock trigger Android configuration loops and detached
 * touch targets.
 */
export function applyRTL(isRTL: boolean): void {
  if (Platform.OS !== 'web') {
    if (nativeDirectionLocked || nativeDirectionApplied === isRTL) {
      return;
    }
    nativeDirectionApplied = isRTL;
    try {
      I18nManager.allowRTL(isRTL);
      I18nManager.forceRTL(isRTL);
    } catch {
      // Ignore native module errors in environments where not supported
    }
  }
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = getCurrentLanguage();
  }
}

/** Reset flag for isolated runtime testing. Internal / test use only. */
export function __resetNativeDirectionAppliedForTest(): void {
  nativeDirectionApplied = null;
  nativeDirectionLocked = false;
}

/** Lock the one-shot native direction after the durable boot language is resolved. */
export function lockNativeDirectionForUI(): void {
  if (Platform.OS !== 'web') {
    nativeDirectionLocked = true;
  }
}

// On native, a first boot without a mirror must wait for App's async storage
// gate before writing direction. When a mirror exists, it is only provisional:
// App applies the durable value before locking the one-shot native direction and
// mounting child views, allowing one stale-mirror correction in that window.
if (Platform.OS === 'web' || synchronousLanguageAtBoot) {
  applyRTL(isRtlLanguage(initialLanguage));
}

/**
 * Switch preparation helper called AFTER persistent storage is verified and
 * IMMEDIATELY BEFORE the app reload.
 *
 * On native: stage the language mirror for the NEXT process. Native direction
 * writes are deliberately not performed here: this helper is called from a
 * mounted screen, and forceRTL/allowRTL at that point can recreate Android's
 * activity. The next process applies the staged value through applyRTL() before
 * mounting its native view tree. On web, update document direction immediately.
 * Does NOT trigger reload itself.
 */
export function prepareNativeLayoutDirection(lang: AppLanguage): void {
  const isRtl = isRtlLanguage(lang);
  if (!writeSynchronousLanguageMirror(lang)) {
    throw new Error('Failed to write the language mirror for the next native boot');
  }
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }
}

/**
 * Switch app UI language and flip layout direction.
 * The caller (settings) is responsible for persisting + triggering the native
 * reload; the reload re-boots with the persisted language + direction. On web
 * (no reload) we flip the document direction immediately.
 */
export function setAppLanguage(lang: AppLanguage): void {
  persistedLanguage = lang;
  languageResolved = true;
  if (!writeSynchronousLanguageMirror(lang)) {
    console.warn('[i18n] Could not refresh the language mirror; durable storage remains authoritative.');
  }
  changeLanguage(lang);
  const isRtl = isRtlLanguage(lang);
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }
  // Native: layout direction changes take effect on the NEXT native/JS reload.
  // SettingsScreen calls prepareNativeLayoutDirection(lang) after storage is verified
  // and immediately before Updates.reloadAsync().
}

export function getCurrentLanguage(): AppLanguage | string {
  const lng = i18n.language;
  if (!lng) return 'en';
  const normalized = lng.toLowerCase();
  if (matchesLanguageTag(normalized, 'ar')) return 'ar';
  if (matchesLanguageTag(normalized, 'ur')) return 'ur';
  if (matchesLanguageTag(normalized, 'hi')) return 'hi';
  if (matchesLanguageTag(normalized, 'ml')) return 'ml';
  if (matchesLanguageTag(normalized, 'si')) return 'si';
  if (matchesLanguageTag(normalized, 'bn')) return 'bn';
  if (matchesLanguageTag(normalized, 'ms')) return 'ms';
  if (matchesLanguageTag(normalized, 'ta')) return 'ta';
  if (matchesLanguageTag(normalized, 'id')) return 'id';
  if (matchesLanguageTag(normalized, 'ps')) return 'ps';
  if (matchesLanguageTag(normalized, 'en')) return 'en';
  return normalized;
}

export function isRTL(): boolean {
  return isRtlLanguage(i18n.language) || isRtlLanguage(getCurrentLanguage());
}

/**
 * Reactive hook for React components to subscribe to layout direction changes.
 * Components reading this re-render whenever the active i18n language changes.
 */
export function useIsRTL(): boolean {
  const { i18n: i18nInstance } = useTranslation();
  return isRtlLanguage(i18nInstance.language) || isRtlLanguage(getCurrentLanguage());
}

/**
 * Pure-JS translation helper that respects the current active language.
 * Supports standard i18next `{{var}}` placeholders as well as single-brace `{var}` / `{ن}` tokens.
 */
export const t = (key: string, options?: any): string => {
  let res = String(i18nT(key, options as any));
  if (options && typeof options === 'object') {
    for (const [k, v] of Object.entries(options)) {
      if (k !== 'defaultValue' && k !== 'lng' && v !== undefined && v !== null) {
        res = res.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
        if (k === 'n') {
          res = res.replace(/\{ن\}/g, String(v));
        }
      }
    }
  }
  return res;
};

export { useTranslation };
export default i18n;
