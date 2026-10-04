/**
 * Background Quran preloader.
 * Preloads all 114 Surahs (Arabic Uthmani + selected translation edition)
 * sequentially into local storage/cache so opening any Surah is instant and offline-ready.
 */
import { useEffect, useState } from 'react';
import { fetchSurah, fetchSurahList, fetchSurahMultiEditions, SurahDetail, SurahMeta } from './quran';
import { fetchSurahTranslations } from './quranMultiLang';
import { loadQuranCache, saveQuranCache, loadLastReadPosition } from './db';
import { DEFAULT_QURAN_LANGUAGE, getQuranTranslationLanguage, subscribeQuranLanguage } from './quranLanguageState';
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
const DELAY_BETWEEN_FETCHES_MS = 250;

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

export function getAllQuranEditionIdentifiers(): string[] {
  return Array.from(
    new Set(
      QURAN_LANGUAGE_EDITIONS.map((e) => e.editionIdentifier).filter(
        (id): id is string => Boolean(id) && id !== 'quran-uthmani'
      )
    )
  );
}

export function isSurahCached(surahNumber: number, activeEdition: string): boolean {
  const activeKey = `surah:${surahNumber}:${activeEdition}`;
  const activeCached = loadQuranCache<SurahDetail>(activeKey);
  if (activeCached && activeCached.ayahs && activeCached.ayahs.length > 0) {
    return true;
  }
  const arCached = loadQuranCache<SurahDetail>(`surah:${surahNumber}:ar`);
  if (arCached && arCached.ayahs && arCached.ayahs.length > 0) {
    for (const ed of QURAN_LANGUAGE_EDITIONS) {
      const edCached = loadQuranCache<SurahDetail>(`surah:${surahNumber}:${ed.editionIdentifier}`);
      if (edCached && edCached.ayahs && edCached.ayahs.length > 0) {
        return true;
      }
    }
  }
  return false;
}

export function areAllEditionsCached(
  surahNumber: number,
  editionIdentifiers: string[]
): boolean {
  const arCached = loadQuranCache<SurahDetail>(`surah:${surahNumber}:ar`);
  if (!arCached || !arCached.ayahs || arCached.ayahs.length === 0) {
    return false;
  }
  for (const ed of editionIdentifiers) {
    const cached = loadQuranCache<SurahDetail>(`surah:${surahNumber}:${ed}`);
    if (!cached || !cached.ayahs || cached.ayahs.length === 0) {
      return false;
    }
  }
  return true;
}

export function areAllSurahsFullyCached(editionIdentifiers: string[]): boolean {
  for (let i = 1; i <= TOTAL_SURAHS; i++) {
    if (!areAllEditionsCached(i, editionIdentifiers)) {
      return false;
    }
  }
  return true;
}

export function getCachedSurahsCount(editionIdentifier: string): number {
  let count = 0;
  for (let i = 1; i <= TOTAL_SURAHS; i++) {
    if (isSurahCached(i, editionIdentifier)) {
      count++;
    }
  }
  return count;
}

let currentProgress: QuranPreloadProgress = {
  total: TOTAL_SURAHS,
  cached: 0,
  currentSurah: null,
  isRunning: false,
  isComplete: false,
  languageCode: DEFAULT_QURAN_LANGUAGE,
  editionIdentifier: 'en.sahih',
  error: null,
};

let hasInitializedCachedCount = false;

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
    !hasInitializedCachedCount ||
    currentProgress.languageCode !== languageCode ||
    currentProgress.editionIdentifier !== editionIdentifier
  ) {
    try {
      const cached = getCachedSurahsCount(editionIdentifier);
      hasInitializedCachedCount = true;
      currentProgress = {
        ...currentProgress,
        languageCode,
        editionIdentifier,
        cached,
        isComplete: cached >= TOTAL_SURAHS,
      };
    } catch {
      // non-fatal if database is not yet initialized
    }
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

/**
 * SECOND PROVIDER fallback: fetch a surah's Arabic (Uthmani) text from
 * Quran.com v4 (keyless, CORS-safe) — used when AlQuran Cloud fails.
 */
async function fetchSurahFromQuranCom(surahNumber: number): Promise<SurahDetail | null> {
  const chapterRes = await fetch(`https://api.quran.com/api/v4/chapters/${surahNumber}?language=en`);
  if (!chapterRes.ok) throw new Error('quran.com chapter failed');
  const chapterJson = await chapterRes.json();
  const chapter = chapterJson?.chapter;
  if (!chapter) throw new Error('quran.com no chapter');

  const versesRes = await fetch(
    `https://api.quran.com/api/v4/quran/verses/uthmani?chapter_number=${surahNumber}`
  );
  if (!versesRes.ok) throw new Error('quran.com verses failed');
  const versesJson = await versesRes.json();
  const verses = versesJson?.verses;
  if (!verses || verses.length === 0) throw new Error('quran.com no verses');

  const ayahs = verses
    .filter((v: any) => v?.text_uthmani)
    .map((v: any, i: number) => {
      const keyParts = String(v.verse_key || '').split(':');
      const numberInSurah = Number(keyParts[1]) || i + 1;
      const globalNumber = Number(v.id) || 0;
      return {
        number: globalNumber,
        numberInSurah,
        text: v.text_uthmani,
        surah: {
          number: surahNumber,
          name: chapter.name_arabic || `Surah ${surahNumber}`,
          englishName: chapter.name_simple || `Surah ${surahNumber}`,
        },
        translation: undefined,
      };
    });

  return {
    number: surahNumber,
    name: chapter.name_arabic || '',
    englishName: chapter.name_simple || '',
    englishNameTranslation: '',
    numberOfAyahs: chapter.verses_count || ayahs.length,
    ayahs,
  };
}

export async function preloadSingleSurah(
  surahNumber: number,
  editionIdentifier?: string,
  force = false
): Promise<boolean> {
  const active = getActiveEdition();
  const targetEdition = editionIdentifier || active.editionIdentifier;
  const allEditions = getAllQuranEditionIdentifiers();
  if (targetEdition && !allEditions.includes(targetEdition)) {
    allEditions.push(targetEdition);
  }

  // Ensure target edition is first so it is processed in Batch 1 of multi-edition requests
  const prioritizedEditions = targetEdition
    ? [targetEdition, ...allEditions.filter((e) => e !== targetEdition)]
    : allEditions;

  if (!force && areAllEditionsCached(surahNumber, prioritizedEditions)) {
    return true;
  }

  // 1. Primary: multi-edition fetch of Arabic (quran-uthmani) + ALL translations in batched calls (~15 per batch)
  try {
    const result = await fetchSurahMultiEditions(surahNumber, prioritizedEditions, force);
    if (result && result.arabic && result.arabic.ayahs && result.arabic.ayahs.length > 0) {
      return true;
    }
  } catch {
    // Multi-edition fetch failed: fall back to single-edition behavior
  }

  // 2. Single-edition fallback: active edition + Arabic
  const cacheKey = `surah:${surahNumber}:${targetEdition}`;
  try {
    const detail = await fetchSurah(surahNumber, true, targetEdition, force);
    if (detail && detail.ayahs && detail.ayahs.length > 0) {
      // Also cache Arabic-only key so Arabic reader / Tafsir screens work completely offline
      const arKey = `surah:${surahNumber}:ar`;
      if (!loadQuranCache(arKey)) {
        const arDetail: SurahDetail = {
          ...detail,
          ayahs: detail.ayahs.map((a) => ({
            ...a,
            translation: undefined,
          })),
        };
        saveQuranCache(arKey, arDetail);
      }
      return true;
    }
  } catch {
    // If standard multi-edition fetch failed, attempt fallback via fetchSurahTranslations
    try {
      const transResult = await fetchSurahTranslations(surahNumber, [targetEdition]);
      const arDetail = await fetchSurah(surahNumber, false, 'ar', force);
      if (arDetail && transResult.translations[targetEdition]) {
        const transAyahs = transResult.translations[targetEdition];
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
    // SECOND PROVIDER: AlQuran Cloud is down/failing — pull Arabic text from Quran.com v4
    try {
      const detail = await fetchSurahFromQuranCom(surahNumber);
      if (detail && detail.ayahs && detail.ayahs.length > 0) {
        saveQuranCache(cacheKey, detail);
        const arKey = `surah:${surahNumber}:ar`;
        if (!loadQuranCache(arKey)) {
          saveQuranCache(arKey, detail);
        }
        return true;
      }
    } catch {
      // Both providers failed — the outer retry loop will re-attempt
    }
  }
  return false;
}

export interface QuranPreloadOptions {
  force?: boolean;
  initialSurah?: number;
  targetEdition?: string;
}

/**
 * Start or resume Quran preloader in background.
 * Preloads all 114 Surahs in Arabic + all ~48 translation editions using multi-edition batches.
 * Fetches current/continue-reading surah first, then remaining 1..114 sequentially.
 * Pauses DELAY_BETWEEN_FETCHES_MS between network requests to avoid throttling.
 */
export async function startQuranPreload(options?: QuranPreloadOptions): Promise<void> {
  const active = getActiveEdition();
  const editionIdentifier = options?.targetEdition || active.editionIdentifier;
  const languageCode = active.languageCode;
  const allEditions = getAllQuranEditionIdentifiers();
  if (editionIdentifier && !allEditions.includes(editionIdentifier)) {
    allEditions.push(editionIdentifier);
  }

  const prioritizedEditions = [
    editionIdentifier,
    ...allEditions.filter((e) => e !== editionIdentifier),
  ];

  if (isPreloaderRunning && !options?.force && !options?.initialSurah && !options?.targetEdition) {
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
  const allFullyCached = areAllSurahsFullyCached(prioritizedEditions);

  if (cachedCount >= TOTAL_SURAHS && allFullyCached && !options?.force) {
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

  const failedSurahs = new Set<number>();

  for (const surahNum of order) {
    if (shouldStopPreloader || runId !== activeRunId) {
      break;
    }

    const alreadyFullyCached = areAllEditionsCached(surahNum, prioritizedEditions);

    if (alreadyFullyCached && !options?.force) {
      // Already fully cached in all editions, yield tiny slice without network delay
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
    } else {
      failedSurahs.add(surahNum);
    }

    // Politeness pause between API calls
    await new Promise((resolve) => setTimeout(resolve, DELAY_BETWEEN_FETCHES_MS));
  }

  // Retry up to 3 passes for any failed surahs
  for (let retryPass = 1; retryPass <= 3 && failedSurahs.size > 0; retryPass++) {
    if (shouldStopPreloader || runId !== activeRunId) break;
    await new Promise((resolve) => setTimeout(resolve, 500 * retryPass));

    for (const surahNum of Array.from(failedSurahs)) {
      if (shouldStopPreloader || runId !== activeRunId) break;
      emitProgress({ currentSurah: surahNum });
      const success = await preloadSingleSurah(surahNum, editionIdentifier, options?.force);
      if (success) {
        failedSurahs.delete(surahNum);
        cachedCount = getCachedSurahsCount(editionIdentifier);
        emitProgress({
          cached: cachedCount,
          isComplete: cachedCount >= TOTAL_SURAHS,
        });
      }
      await new Promise((resolve) => setTimeout(resolve, DELAY_BETWEEN_FETCHES_MS));
    }
  }

  // Final pass: check for any remaining uncached surahs across 1..114
  if (!shouldStopPreloader && runId === activeRunId && failedSurahs.size > 0) {
    for (const surahNum of Array.from(failedSurahs)) {
      if (shouldStopPreloader || runId !== activeRunId) break;
      emitProgress({ currentSurah: surahNum });
      const success = await preloadSingleSurah(surahNum, editionIdentifier, options?.force);
      if (success) {
        failedSurahs.delete(surahNum);
        cachedCount = getCachedSurahsCount(editionIdentifier);
        emitProgress({
          cached: cachedCount,
          isComplete: cachedCount >= TOTAL_SURAHS,
        });
      }
      await new Promise((resolve) => setTimeout(resolve, DELAY_BETWEEN_FETCHES_MS));
    }
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

/**
 * Trigger background preload of remaining surahs for a translation edition
 * when a user opens an uncached surah.
 */
export function preloadRemainingSurahsForEdition(
  surahNumber: number,
  editionIdentifier: string
): void {
  setTimeout(() => {
    startQuranPreload({
      initialSurah: surahNumber,
      targetEdition: editionIdentifier,
    }).catch(() => {});
  }, 100);
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

export function isQuranPreloadComplete(): boolean {
  const { editionIdentifier } = getActiveEdition();
  return getCachedSurahsCount(editionIdentifier) >= TOTAL_SURAHS;
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
