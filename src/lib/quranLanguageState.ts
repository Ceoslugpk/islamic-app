import { useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getEditionForLanguage,
  getLanguageFlag,
  QuranLanguageEdition,
  QURAN_LANGUAGE_EDITIONS,
} from './quranLanguages';

export const QURAN_TRANSLATION_LANG_KEY = 'quran-translation-language';
export const DEFAULT_QURAN_LANGUAGE = 'en';

let currentLanguage = DEFAULT_QURAN_LANGUAGE;
const listeners = new Set<(lang: string) => void>();

// Initialize from storage on app bootstrap
AsyncStorage.getItem(QURAN_TRANSLATION_LANG_KEY)
  .then((saved) => {
    if (saved && QURAN_LANGUAGE_EDITIONS.some((e) => e.languageCode === saved)) {
      currentLanguage = saved;
      listeners.forEach((fn) => fn(saved));
    }
  })
  .catch(() => {});

export function getQuranTranslationLanguage(): string {
  return currentLanguage;
}

export async function setQuranTranslationLanguage(langCode: string): Promise<void> {
  const valid = QURAN_LANGUAGE_EDITIONS.some((e) => e.languageCode === langCode);
  const next = valid ? langCode : DEFAULT_QURAN_LANGUAGE;
  currentLanguage = next;
  listeners.forEach((fn) => fn(next));
  try {
    await AsyncStorage.setItem(QURAN_TRANSLATION_LANG_KEY, next);
  } catch {
    // ignore persistence errors
  }
}

export function subscribeQuranLanguage(listener: (lang: string) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useQuranLanguage() {
  const [language, setLanguageState] = useState<string>(getQuranTranslationLanguage());

  useEffect(() => {
    setLanguageState(getQuranTranslationLanguage());
    return subscribeQuranLanguage((nextLang) => {
      setLanguageState(nextLang);
    });
  }, []);

  const edition: QuranLanguageEdition = useMemo(() => {
    return (
      getEditionForLanguage(language) ||
      getEditionForLanguage(DEFAULT_QURAN_LANGUAGE) ||
      QURAN_LANGUAGE_EDITIONS[1]
    );
  }, [language]);

  const flag = useMemo(() => getLanguageFlag(language), [language]);

  return {
    language,
    setLanguage: setQuranTranslationLanguage,
    edition,
    flag,
  };
}
