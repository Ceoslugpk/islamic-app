import i18n, { use as i18nextUse, changeLanguage, t as i18nT } from 'i18next';
import { initReactI18next, useTranslation } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { I18nManager, Platform } from 'react-native';
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
// It is resolved BEFORE i18n initializes so the app never boots in a stale
// language/direction combo (e.g. language=en while native layout is RTL).
const PERSISTED_LANGUAGE_KEY = 'islamic-settings'; // same key as settings.tsx
let persistedLanguage: AppLanguage | null = null;
let languageResolved = false;

export async function resolvePersistedLanguage(forceFresh = false): Promise<AppLanguage> {
  if (!forceFresh && languageResolved && persistedLanguage) return persistedLanguage;
  try {
    const raw = await AsyncStorage.getItem(PERSISTED_LANGUAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && isAppLanguage(parsed.language)) {
        persistedLanguage = parsed.language;
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
  if (Platform.OS !== 'web') {
    if (I18nManager.isRTL) {
      const detected = resolveDeviceAppLanguage(deviceLanguageCode);
      return isRtlLanguage(detected) ? detected : 'ur';
    }
    return 'en';
  }
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

// Set the native layout direction ONCE at module load from the boot language.
// forceRTL is only reliable when called before the UI mounts, and calling it
// repeatedly (or after mount) is what leaves RTL stuck on Android.
applyRTL(isRtlLanguage(initialLanguage));

/**
 * Configure RTL layout direction for React Native and Web.
 * At boot, force the direction before any screens mount so the native view tree
 * inherits the direction for its full lifetime. Language changes persist their
 * target direction with prepareNativeLayoutDirection() and then use an app reload.
 */
export function applyRTL(isRTL: boolean): void {
  try {
    I18nManager.allowRTL(isRTL);
    I18nManager.forceRTL(isRTL);
  } catch {
    // Ignore native module errors in environments where not supported
  }
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = getCurrentLanguage();
  }
}

/**
 * Switch preparation helper called AFTER persistent storage is verified and
 * IMMEDIATELY BEFORE the app reload.
 *
 * On native: layout direction changes only take effect on the NEXT native/JS reload.
 * Calling allowRTL(isRtl) and forceRTL(isRtl) writes the preference into
 * native storage (SharedPreferences / NSUserDefaults) before reloadAsync restarts the JS engine,
 * guaranteeing the next reload boots directly into the correct layout direction (RTL vs LTR).
 * On web: updates document element dir/lang immediately.
 * Does NOT trigger reload itself.
 */
export function prepareNativeLayoutDirection(lang: AppLanguage): void {
  const isRtl = isRtlLanguage(lang);
  try {
    I18nManager.allowRTL(isRtl);
    I18nManager.forceRTL(isRtl);
  } catch {
    // Ignore native module errors in environments where not supported
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

export function getCurrentLanguage(): AppLanguage {
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
  return 'en';
}

export function isRTL(): boolean {
  return isRtlLanguage(getCurrentLanguage());
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
