import { useMemo, useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getEditionForLanguage,
  getLanguageFlag,
  QuranLanguageEdition,
  QURAN_LANGUAGE_EDITIONS,
} from './quranLanguages';

export const QURAN_TRANSLATION_LANG_KEY = 'quran-translation-language';
export const QURAN_TRANSLATION_LANG_SELECTION_MODE_KEY = 'quran-translation-language-mode';
export const DEFAULT_QURAN_LANGUAGE = 'en';

export type QuranTranslationLanguageSelectionMode = 'auto' | 'explicit';

let currentLanguage = DEFAULT_QURAN_LANGUAGE;
let currentSelectionMode: QuranTranslationLanguageSelectionMode = 'auto';
let stateVersion = 0;
let quranLanguageWriteQueue: Promise<void> = Promise.resolve();
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
  currentSelectionMode = 'auto';
  stateVersion = 0;
  quranLanguageWriteQueue = Promise.resolve();
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
  const versionAtStart = stateVersion;
  try {
    const saved = await storageBackend.getItem(QURAN_TRANSLATION_LANG_KEY);
    bootstrapError = null;
    if (stateVersion !== versionAtStart) {
      return currentLanguage;
    }
    if (saved && QURAN_LANGUAGE_EDITIONS.some((e) => e.languageCode === saved)) {
      currentLanguage = saved;
      const savedMode = await storageBackend.getItem(QURAN_TRANSLATION_LANG_SELECTION_MODE_KEY);
      if (stateVersion !== versionAtStart) {
        return currentLanguage;
      }
      currentSelectionMode = savedMode === 'explicit' ? 'explicit' : 'auto';
      listeners.forEach((fn) => fn(saved));
      return saved;
    }
    currentSelectionMode = 'auto';
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

export function getQuranTranslationSelectionMode(): QuranTranslationLanguageSelectionMode {
  return currentSelectionMode;
}

export function isQuranTranslationLanguageExplicit(): boolean {
  return currentSelectionMode === 'explicit';
}

async function persistQuranTranslationLanguage(
  langCode: string,
  selectionMode: QuranTranslationLanguageSelectionMode,
): Promise<void> {
  const valid = QURAN_LANGUAGE_EDITIONS.some((e) => e.languageCode === langCode);
  const next = valid ? langCode : DEFAULT_QURAN_LANGUAGE;
  const prev = currentLanguage;
  const prevMode = currentSelectionMode;
  let prevPersisted: string | null = null;
  let prevPersistedMode: string | null = null;
  try {
    prevPersisted = await storageBackend.getItem(QURAN_TRANSLATION_LANG_KEY);
    prevPersistedMode = await storageBackend.getItem(QURAN_TRANSLATION_LANG_SELECTION_MODE_KEY);
  } catch (readErr: any) {
    const error = readErr instanceof Error ? readErr : new Error(String(readErr));
    throw new Error(`Failed to read prior Quran translation language state: ${error.message}`);
  }

  currentLanguage = next;
  currentSelectionMode = selectionMode;
  stateVersion += 1;
  listeners.forEach((fn) => fn(next));
  try {
    await storageBackend.setItem(QURAN_TRANSLATION_LANG_KEY, next);
    await storageBackend.setItem(QURAN_TRANSLATION_LANG_SELECTION_MODE_KEY, selectionMode);
    const readback = await storageBackend.getItem(QURAN_TRANSLATION_LANG_KEY);
    const modeReadback = await storageBackend.getItem(QURAN_TRANSLATION_LANG_SELECTION_MODE_KEY);
    if (readback !== next || modeReadback !== selectionMode) {
      throw new Error(
        `Quran translation language read-back failed: expected "${next}"/"${selectionMode}", ` +
        `got "${readback}"/"${modeReadback}"`
      );
    }
  } catch (err) {
    let rollbackError: Error | null = null;
    try {
      if (prevPersisted !== null) {
        await storageBackend.setItem(QURAN_TRANSLATION_LANG_KEY, prevPersisted);
      } else {
        await storageBackend.removeItem(QURAN_TRANSLATION_LANG_KEY);
      }
      if (prevPersistedMode !== null) {
        await storageBackend.setItem(QURAN_TRANSLATION_LANG_SELECTION_MODE_KEY, prevPersistedMode);
      } else {
        await storageBackend.removeItem(QURAN_TRANSLATION_LANG_SELECTION_MODE_KEY);
      }
    } catch (rbErr: any) {
      rollbackError = rbErr instanceof Error ? rbErr : new Error(String(rbErr));
    }
    currentLanguage = prev;
    currentSelectionMode = prevMode;
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

function enqueueQuranLanguageWrite(operation: () => Promise<void>): Promise<void> {
  const next = quranLanguageWriteQueue.then(operation, operation);
  quranLanguageWriteQueue = next.catch(() => {});
  return next;
}

/** A direct picker/API selection is explicit and must survive app-language changes. */
export async function setQuranTranslationLanguage(langCode: string): Promise<void> {
  return enqueueQuranLanguageWrite(() => persistQuranTranslationLanguage(langCode, 'explicit'));
}

/** Link to the app language unless an explicit picker choice is persisted. */
export async function setAutoLinkedQuranTranslationLanguage(langCode: string): Promise<void> {
  return enqueueQuranLanguageWrite(async () => {
    let persistedMode: string | null = null;
    try {
      persistedMode = await storageBackend.getItem(QURAN_TRANSLATION_LANG_SELECTION_MODE_KEY);
    } catch (readErr: any) {
      const error = readErr instanceof Error ? readErr : new Error(String(readErr));
      throw new Error(`Failed to read prior Quran translation selection mode: ${error.message}`);
    }
    if (currentSelectionMode === 'explicit' || persistedMode === 'explicit') {
      return;
    }
    return persistQuranTranslationLanguage(langCode, 'auto');
  });
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
