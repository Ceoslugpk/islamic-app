import { useMemo, useSyncExternalStore } from 'react';
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
let bootstrapError: Error | null = null;
const defaultStorage = (AsyncStorage as any)?.default || AsyncStorage;

let storageBackend: {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
} = defaultStorage;

export function _setQuranLanguageStorageForTesting(custom: any) {
  storageBackend = custom || defaultStorage;
}

export function _resetQuranLanguageStateForTesting(customStorage?: any) {
  currentLanguage = DEFAULT_QURAN_LANGUAGE;
  listeners.clear();
  bootstrapError = null;
  storageBackend = customStorage || defaultStorage;
}

export function getQuranLanguageBootstrapError(): Error | null {
  return bootstrapError;
}

/**
 * Initializes Quran translation language from storage on app bootstrap.
 * Legitimate missing key returns default ('en') without error.
 * Storage read failure records bootstrapError and propagates rejection to caller.
 */
export async function bootstrapQuranLanguage(): Promise<string> {
  try {
    const saved = await storageBackend.getItem(QURAN_TRANSLATION_LANG_KEY);
    bootstrapError = null;
    if (saved && QURAN_LANGUAGE_EDITIONS.some((e) => e.languageCode === saved)) {
      currentLanguage = saved;
      listeners.forEach((fn) => fn(saved));
      return saved;
    }
    return currentLanguage;
  } catch (err: any) {
    const error = err instanceof Error ? err : new Error(String(err));
    bootstrapError = error;
    throw error;
  }
}

// Initialize from storage on app bootstrap
bootstrapQuranLanguage().catch(() => {});

export function getQuranTranslationLanguage(): string {
  return currentLanguage;
}

export async function setQuranTranslationLanguage(langCode: string): Promise<void> {
  const valid = QURAN_LANGUAGE_EDITIONS.some((e) => e.languageCode === langCode);
  const next = valid ? langCode : DEFAULT_QURAN_LANGUAGE;
  const prev = currentLanguage;
  let prevPersisted: string | null = null;
  try {
    prevPersisted = await storageBackend.getItem(QURAN_TRANSLATION_LANG_KEY);
  } catch (readErr: any) {
    const error = readErr instanceof Error ? readErr : new Error(String(readErr));
    throw new Error(`Failed to read prior Quran translation language state: ${error.message}`);
  }

  currentLanguage = next;
  listeners.forEach((fn) => fn(next));
  try {
    await storageBackend.setItem(QURAN_TRANSLATION_LANG_KEY, next);
    const readback = await storageBackend.getItem(QURAN_TRANSLATION_LANG_KEY);
    if (readback !== next) {
      throw new Error(`Quran translation language read-back failed: expected "${next}", got "${readback}"`);
    }
  } catch (err) {
    let rollbackError: Error | null = null;
    try {
      if (prevPersisted !== null) {
        await storageBackend.setItem(QURAN_TRANSLATION_LANG_KEY, prevPersisted);
      } else {
        await storageBackend.removeItem(QURAN_TRANSLATION_LANG_KEY);
      }
    } catch (rbErr: any) {
      rollbackError = rbErr instanceof Error ? rbErr : new Error(String(rbErr));
    }
    currentLanguage = prev;
    listeners.forEach((fn) => fn(prev));

    if (rollbackError) {
      const structuredError = new Error(
        `Quran translation language persistence failed: ${err instanceof Error ? err.message : String(err)}. ` +
        `Rollback incomplete: ${rollbackError.message}`
      );
      (structuredError as any).originalError = err;
      (structuredError as any).rollbackError = rollbackError;
      (structuredError as any).rollbackIncomplete = true;
      throw structuredError;
    }
    throw err;
  }
}

export function subscribeQuranLanguage(listener: (lang: string) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useQuranLanguage() {
  const language = useSyncExternalStore(
    subscribeQuranLanguage,
    getQuranTranslationLanguage,
    getQuranTranslationLanguage
  );

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
