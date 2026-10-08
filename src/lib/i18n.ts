import i18n from 'i18next';
import { initReactI18next, useTranslation } from 'react-i18next';
import * as Localization from 'expo-localization';
import { I18nManager, Platform } from 'react-native';
import en from '../locales/en.json';
import ur from '../locales/ur.json';

export type AppLanguage = 'en' | 'ur';

const locales = Localization.getLocales();
const deviceLanguageCode = locales && locales.length > 0 ? locales[0].languageCode : 'en';
const initialLanguage: AppLanguage = deviceLanguageCode === 'ur' ? 'ur' : 'en';

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

applyRTL(initialLanguage === 'ur');

/**
 * Configure RTL layout direction for React Native and Web.
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
 */
export function setAppLanguage(lang: AppLanguage): void {
  i18n.changeLanguage(lang);
  applyRTL(lang === 'ur');
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
