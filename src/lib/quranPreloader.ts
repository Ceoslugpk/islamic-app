/**
 * Background Quran preloader.
 * Preloads all 114 Surahs (Arabic Uthmani + selected translation edition)
 * sequentially into local storage/cache so opening any Surah is instant and offline-ready.
 */
import { useEffect, useState } from 'react';
import { fetchSurah, fetchSurahList, SurahDetail, SurahMeta } from './quran';
import { fetchSurahTranslations } from './quranMultiLang';
import { loadQuranCache, saveQuranCache, loadLastReadPosition } from './db';
import { getQuranTranslationLanguage, subscribeQuranLanguage } from './quranLanguageState';
import { getEditionForLanguage, QURAN_LANGUAGE_EDITIONS } from './quranLanguages';

export interface QuranPreloadProgress {
  total: number;
  cached: number;
  currentSurah: number | null;
  isRunning: boolean;
  isComplete: boolean;
  languageCode: string;
  editionIdentifier: string;
  error?: string | null;
}

const TOTAL_SURAHS = 114;
const DELAY_BETWEEN_FETCHES_MS = 800;

let isPreloaderRunning = false;
let shouldStopPreloader = false;
let activeRunId = 0;

const listeners = new Set<(progress: QuranPreloadProgress) => void>();

function getActiveEdition(): { languageCode: string; editionIdentifier: string } {
  const languageCode = getQuranTranslationLanguage();
  const edition =
    getEditionForLanguage(languageCode) ||
    getEditionForLanguage('en') ||
    QURAN_LANGUAGE_EDITIONS[1];
  return {
    languageCode,
    editionIdentifier: edition.editionIdentifier,
  };
}

export function getCachedSurahsCount(editionIdentifier: string): number {
  let count = 0;
  for (let i = 1; i <= TOTAL_SURAHS; i++) {
    const key = `surah:${i}:${editionIdentifier}`;
    const cached = loadQuranCache<SurahDetail>(key);
    if (cached && cached.ayahs && cached.ayahs.length > 0) {
      count++;
    }
  }
  return count;
}

let currentProgress: QuranPreloadProgress = (() => {
  const { languageCode, editionIdentifier } = getActiveEdition();
  const cached = getCachedSurahsCount(editionIdentifier);
  return {
    total: TOTAL_SURAHS,
    cached,
    currentSurah: null,
    isRunning: false,
    isComplete: cached >= TOTAL_SURAHS,
    languageCode,
    editionIdentifier,
    error: null,
  };
})();

function emitProgress(update: Partial<QuranPreloadProgress>) {
  currentProgress = { ...currentProgress, ...update };
  listeners.forEach((listener) => {
    try {
      listener(currentProgress);
    } catch {
      // non-fatal
    }
  });
}

export function getQuranPreloadProgress(): QuranPreloadProgress {
  const { languageCode, editionIdentifier } = getActiveEdition();
  if (
    currentProgress.languageCode !== languageCode ||
    currentProgress.editionIdentifier !== editionIdentifier
  ) {
    const cached = getCachedSurahsCount(editionIdentifier);
    currentProgress = {
      ...currentProgress,
      languageCode,
      editionIdentifier,
      cached,
      isComplete: cached >= TOTAL_SURAHS,
    };
  }
  return currentProgress;
}

export function subscribeQuranPreload(
  listener: (progress: QuranPreloadProgress) => void
): () => void {
  listeners.add(listener);
  listener(getQuranPreloadProgress());
  return () => {
    listeners.delete(listener);
  };
}

async function preloadSingleSurah(
  surahNumber: number,
  editionIdentifier: string,
  force = false
): Promise<boolean> {
  const cacheKey = `surah:${surahNumber}:${editionIdentifier}`;
  if (!force) {
    const existing = loadQuranCache<SurahDetail>(cacheKey);
    if (existing && existing.ayahs && existing.ayahs.length > 0) {
      return true;
    }
  }

  try {
    const detail = await fetchSurah(surahNumber, true, editionIdentifier, force);
    if (detail && detail.ayahs && detail.ayahs.length > 0) {
      return true;
    }
  } catch {
    // If standard multi-edition fetch failed, attempt fallback via fetchSurahTranslations
    try {
      const transResult = await fetchSurahTranslations(surahNumber, [editionIdentifier]);
      const arDetail = await fetchSurah(surahNumber, false, 'ar', force);
      if (arDetail && transResult.translations[editionIdentifier]) {
        const transAyahs = transResult.translations[editionIdentifier];
        const combined: SurahDetail = {
          ...arDetail,
          ayahs: arDetail.ayahs.map((a, i) => ({
            ...a,
            translation: transAyahs[i]?.text ?? a.translation,
          })),
        };
        saveQuranCache(cacheKey, combined);
        return true;
      }
    } catch {
      // Fallback failed as well
    }
  }
  return false;
}

/**
 * Start or resume Quran preloader in background.
 * Fetches current/continue-reading surah first, then remaining 1..114 sequentially.
 * Pauses DELAY_BETWEEN_FETCHES_MS between network requests to avoid throttling.
 */
export async function startQuranPreload(options?: {
  force?: boolean;
  initialSurah?: number;
}): Promise<void> {
  const { languageCode, editionIdentifier } = getActiveEdition();

  if (isPreloaderRunning && !options?.force) {
    return;
  }

  shouldStopPreloader = false;
  isPreloaderRunning = true;
  const runId = ++activeRunId;

  // Make sure surah list is cached
  try {
    const listCached = loadQuranCache<SurahMeta[]>('surah-list');
    if (!listCached) {
      await fetchSurahList();
    }
  } catch {
    // ignore non-fatal
  }

  let cachedCount = getCachedSurahsCount(editionIdentifier);
  if (cachedCount >= TOTAL_SURAHS && !options?.force) {
    isPreloaderRunning = false;
    emitProgress({
      isRunning: false,
      isComplete: true,
      currentSurah: null,
      cached: TOTAL_SURAHS,
      languageCode,
      editionIdentifier,
    });
    return;
  }

  emitProgress({
    isRunning: true,
    isComplete: false,
    cached: cachedCount,
    languageCode,
    editionIdentifier,
    error: null,
  });

  // Determine fetch order: last-read position first, then ascending 1..114
  const lastRead = loadLastReadPosition();
  const startSurah = options?.initialSurah ?? lastRead?.surah;
  const order: number[] = [];

  if (startSurah && startSurah >= 1 && startSurah <= TOTAL_SURAHS) {
    order.push(startSurah);
  }
  for (let i = 1; i <= TOTAL_SURAHS; i++) {
    if (!order.includes(i)) {
      order.push(i);
    }
  }

  for (const surahNum of order) {
    if (shouldStopPreloader || runId !== activeRunId) {
      break;
    }

    const cacheKey = `surah:${surahNum}:${editionIdentifier}`;
    const alreadyCached = loadQuranCache<SurahDetail>(cacheKey);

    if (alreadyCached && alreadyCached.ayahs && alreadyCached.ayahs.length > 0 && !options?.force) {
      // Already cached, yield tiny slice without network delay
      cachedCount = getCachedSurahsCount(editionIdentifier);
      emitProgress({
        cached: cachedCount,
        currentSurah: surahNum,
      });
      await new Promise((resolve) => setTimeout(resolve, 10));
      continue;
    }

    emitProgress({
      currentSurah: surahNum,
      cached: cachedCount,
    });

    const success = await preloadSingleSurah(surahNum, editionIdentifier, options?.force);
    if (success) {
      cachedCount = getCachedSurahsCount(editionIdentifier);
      emitProgress({
        cached: cachedCount,
        isComplete: cachedCount >= TOTAL_SURAHS,
      });
    }

    // Politeness pause between API calls
    await new Promise((resolve) => setTimeout(resolve, DELAY_BETWEEN_FETCHES_MS));
  }

  if (runId === activeRunId) {
    isPreloaderRunning = false;
    const finalCached = getCachedSurahsCount(editionIdentifier);
    emitProgress({
      isRunning: false,
      isComplete: finalCached >= TOTAL_SURAHS,
      currentSurah: null,
      cached: finalCached,
    });
  }
}

export function pauseQuranPreload(): void {
  shouldStopPreloader = true;
  isPreloaderRunning = false;
  emitProgress({
    isRunning: false,
    currentSurah: null,
  });
}

export function isQuranPreloadRunning(): boolean {
  return isPreloaderRunning;
}

// Automatically react to language changes
subscribeQuranLanguage((newLang) => {
  const edition = getEditionForLanguage(newLang) || QURAN_LANGUAGE_EDITIONS[1];
  const cached = getCachedSurahsCount(edition.editionIdentifier);
  emitProgress({
    languageCode: newLang,
    editionIdentifier: edition.editionIdentifier,
    cached,
    isComplete: cached >= TOTAL_SURAHS,
    currentSurah: null,
  });

  if (isPreloaderRunning) {
    pauseQuranPreload();
    // Restart preloader for new translation edition after short delay
    setTimeout(() => {
      startQuranPreload();
    }, 500);
  }
});

export function useQuranPreload() {
  const [progress, setProgress] = useState<QuranPreloadProgress>(getQuranPreloadProgress());

  useEffect(() => {
    return subscribeQuranPreload((nextProgress) => {
      setProgress(nextProgress);
    });
  }, []);

  return {
    progress,
    startPreload: (force?: boolean) => startQuranPreload({ force }),
    pausePreload: pauseQuranPreload,
  };
}
