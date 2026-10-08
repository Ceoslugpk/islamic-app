import i18n from 'i18next';
import { initReactI18next, useTranslation } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { I18nManager, Platform } from 'react-native';
import en from '../locales/en.json';
import ur from '../locales/ur.json';

export type AppLanguage = 'en' | 'ur';

const locales = Localization.getLocales();
const deviceLanguageCode = locales && locales.length > 0 ? locales[0].languageCode : 'en';

// The persisted app language is the single source of truth for the UI language.
// It is resolved BEFORE i18n initializes so the app never boots in a stale
// language/direction combo (e.g. language=en while native layout is RTL).
const PERSISTED_LANGUAGE_KEY = 'islamic-settings'; // same key as settings.tsx
let persistedLanguage: AppLanguage | null = null;
let languageResolved = false;

export async function resolvePersistedLanguage(): Promise<AppLanguage> {
  if (languageResolved && persistedLanguage) return persistedLanguage;
  try {
    const raw = await AsyncStorage.getItem(PERSISTED_LANGUAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && (parsed.language === 'en' || parsed.language === 'ur')) {
        persistedLanguage = parsed.language;
      }
    }
  } catch {
    // ignore — fall through to device default
  }
  if (!persistedLanguage) {
    persistedLanguage = deviceLanguageCode === 'ur' ? 'ur' : 'en';
  }
  languageResolved = true;
  return persistedLanguage;
}

/** Synchronously readable current language (module-level cache, set at boot). */
export function getBootLanguage(): AppLanguage {
  return persistedLanguage || (deviceLanguageCode === 'ur' ? 'ur' : 'en');
}

const initialLanguage: AppLanguage = getBootLanguage();

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ur: { translation: ur },
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
applyRTL(initialLanguage === 'ur');

/**
 * Configure RTL layout direction for React Native and Web.
 * Force unconditionally — call ONLY at boot (module load + App bootstrap) where
 * forceRTL is reliable. Calling it after UI mount (e.g. during a live language
 * switch) is what leaves RTL stuck on Android; live switches rely on the
 * expo-updates reload to re-boot with the persisted language + direction.
 */
export function applyRTL(isRTL: boolean): void {
  try {
    I18nManager.allowRTL(true);
    I18nManager.forceRTL(isRTL);
  } catch {
    // Ignore native module errors in environments where not supported
  }
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = isRTL ? 'ur' : 'en';
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
  i18n.changeLanguage(lang);
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    document.documentElement.dir = lang === 'ur' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang === 'ur' ? 'ur' : 'en';
  }
  // Native: direction is applied at boot (module load / App bootstrap). Do NOT
  // forceRTL here — calling it after UI mount leaves RTL stuck on Android.
}

export function getCurrentLanguage(): AppLanguage {
  return (i18n.language === 'ur' ? 'ur' : 'en') as AppLanguage;
}

export function isRTL(): boolean {
  return i18n.language === 'ur';
}

/**
 * Pure-JS translation helper that respects the current active language.
 */
export const t = (key: string, options?: any): string => {
  return String(i18n.t(key, options as any));
};

export { useTranslation };
export default i18n;
