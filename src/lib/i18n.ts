import i18n from 'i18next';
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

export type AppLanguage = 'en' | 'ur' | 'ar' | 'hi' | 'ml' | 'si';

export function isRtlLanguage(lang: AppLanguage | string | null | undefined): boolean {
  return lang === 'ur' || lang === 'ar';
}

export function isAppLanguage(value: unknown): value is AppLanguage {
  return value === 'en' || value === 'ur' || value === 'ar' || value === 'hi' || value === 'ml' || value === 'si';
}

const locales = Localization.getLocales();
const deviceLanguageCode = locales && locales.length > 0 ? locales[0].languageCode : 'en';

export function resolveDeviceAppLanguage(code: string | null | undefined): AppLanguage {
  if (!code) return 'en';
  const lower = code.toLowerCase();
  if (lower === 'ar' || lower.startsWith('ar-') || lower.startsWith('ar_')) return 'ar';
  if (lower === 'ur' || lower.startsWith('ur-') || lower.startsWith('ur_')) return 'ur';
  if (lower === 'hi' || lower.startsWith('hi-') || lower.startsWith('hi_')) return 'hi';
  if (lower === 'ml' || lower.startsWith('ml-') || lower.startsWith('ml_')) return 'ml';
  if (lower === 'si' || lower.startsWith('si-') || lower.startsWith('si_')) return 'si';
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

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ur: { translation: ur },
    ar: { translation: ar },
    hi: { translation: hi },
    ml: { translation: ml },
    si: { translation: si },
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
 * Force unconditionally — call ONLY at boot (module load + App bootstrap) where
 * forceRTL is reliable. Calling it after UI mount (e.g. during a live language
 * switch) is what leaves RTL stuck on Android; live switches rely on the
 * expo-updates reload to re-boot with the persisted language + direction.
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
    const current = getCurrentLanguage();
    document.documentElement.lang = isRTL ? (isRtlLanguage(current) ? current : getBootLanguage()) : 'en';
  }
}

/**
 * Switch preparation helper called AFTER persistent storage is verified and
 * IMMEDIATELY BEFORE Updates.reloadAsync().
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
  i18n.changeLanguage(lang);
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
  if (lng === 'ar') return 'ar';
  if (lng === 'ur') return 'ur';
  if (lng === 'hi') return 'hi';
  if (lng === 'ml') return 'ml';
  if (lng === 'si') return 'si';
  return 'en';
}

export function isRTL(): boolean {
  return isRtlLanguage(i18n.language);
}

/**
 * Pure-JS translation helper that respects the current active language.
 * Supports standard i18next `{{var}}` placeholders as well as single-brace `{var}` / `{ن}` tokens.
 */
export const t = (key: string, options?: any): string => {
  let res = String(i18n.t(key, options as any));
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
