/**
 * Background Quran preloader.
 * Preloads all 114 Surahs (Arabic Uthmani + selected translation edition)
 * sequentially into local storage/cache so opening any Surah is instant and offline-ready.
 */
import { useEffect, useState } from 'react';
import { fetchSurah, fetchSurahList, fetchSurahMultiEditions, fetchWithTimeout, SurahDetail, SurahMeta } from './quran';
import { fetchTajweedSurah } from './tajweed';
import { fetchSurahWithScript } from './quranScripts';
import { fetchSurahTranslations } from './quranMultiLang';
import { loadQuranCache, saveQuranCache, loadLastReadPosition, isQuranCacheKeyPresent, getCachedQuranKeys } from './db';
import { DEFAULT_QURAN_LANGUAGE, getQuranTranslationLanguage, subscribeQuranLanguage } from './quranLanguageState';
import { getEditionForLanguage, QURAN_LANGUAGE_EDITIONS } from './quranLanguages';
import { getQuranPreloadRequested } from './settings';
import { SURAHS_114 } from './surahs114';
import { isAppOnline } from './useConnectivity';
import { t } from './i18n';

export interface QuranPreloadProgress {
  total: number;
  cached: number;
  currentSurah: number | null;
  isRunning: boolean;
  isComplete: boolean;
  languageCode: string;
  editionIdentifier: string;
  error?: string | null;
  saveFailure?: boolean;
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

export function getSelectedLanguageEditions(languageCode: string, targetEdition?: string): string[] {
  const matching = QURAN_LANGUAGE_EDITIONS
    .filter((e) => e.languageCode === languageCode && e.editionIdentifier && e.editionIdentifier !== 'quran-uthmani')
    .map((e) => e.editionIdentifier);

  const list = [...matching];
  if (targetEdition && targetEdition !== 'quran-uthmani' && !list.includes(targetEdition)) {
    list.unshift(targetEdition);
  }
  return Array.from(new Set(list));
}

export function isSurahCached(surahNumber: number, activeEdition: string): boolean {
  if (isQuranCacheKeyPresent(`surah:${surahNumber}:${activeEdition}`)) {
    return true;
  }
  if (isQuranCacheKeyPresent(`surah:${surahNumber}:ar`)) {
    for (const ed of QURAN_LANGUAGE_EDITIONS) {
      if (isQuranCacheKeyPresent(`surah:${surahNumber}:${ed.editionIdentifier}`)) {
        return true;
      }
    }
  }
  return false;
}

export function areAllEditionsCached(
  surahNumber: number,
  editionIdentifiers: string[],
  cachedKeys?: Set<string>
): boolean {
  const keys = cachedKeys;
  if (keys) {
    if (!keys.has(`surah:${surahNumber}:ar`)) return false;
    for (const ed of editionIdentifiers) {
      if (!keys.has(`surah:${surahNumber}:${ed}`)) return false;
    }
    return true;
  }
  if (!isQuranCacheKeyPresent(`surah:${surahNumber}:ar`)) {
    return false;
  }
  for (const ed of editionIdentifiers) {
    if (!isQuranCacheKeyPresent(`surah:${surahNumber}:${ed}`)) {
      return false;
    }
  }
  return true;
}

export function areAllSurahsFullyCached(editionIdentifiers: string[]): boolean {
  const keys = getCachedQuranKeys();
  for (let i = 1; i <= TOTAL_SURAHS; i++) {
    if (!areAllEditionsCached(i, editionIdentifiers, keys)) {
      return false;
    }
  }
  return true;
}

export function getCachedSurahsCount(editionIdentifier: string): number {
  const keys = getCachedQuranKeys();
  let count = 0;
  for (let i = 1; i <= TOTAL_SURAHS; i++) {
    if (keys.has(`surah:${i}:${editionIdentifier}`)) {
      count++;
    } else if (keys.has(`surah:${i}:ar`)) {
      for (const ed of QURAN_LANGUAGE_EDITIONS) {
        if (keys.has(`surah:${i}:${ed.editionIdentifier}`)) {
          count++;
          break;
        }
      }
    }
  }
  return count;
}

/* ─── Offline cache verification ─────────────────────────────────────────── */

export interface QuranPreloadVerification {
  editionIdentifier: string;
  total: number;
  /** Surahs whose translation-edition entry is present AND structurally valid. */
  valid: number;
  /** Surahs whose Arabic (Uthmani) entry is present AND structurally valid. */
  arabicValid: number;
  /** Present but malformed / empty / missing translation text. */
  invalidSurahs: number[];
  /** No entry at all for the active edition. */
  missingSurahs: number[];
  ok: boolean;
  checkedAt: number;
}

/**
 * Shape check for a locally cached surah: non-empty ayah array, expected ayah
 * count, non-empty Arabic text for every ayah and (for translation editions)
 * a non-empty translation for every ayah.
 */
export function isValidCachedSurah(
  detail: SurahDetail | null | undefined,
  surahNumber: number,
  requireTranslation: boolean
): boolean {
  if (!detail || !Array.isArray(detail.ayahs) || detail.ayahs.length === 0) return false;
  const expected = SURAHS_114[surahNumber - 1]?.numberOfAyahs;
  if (expected && detail.ayahs.length !== expected) return false;
  if (detail.numberOfAyahs > 0 && detail.ayahs.length !== detail.numberOfAyahs) return false;

  let translated = 0;
  for (const ayah of detail.ayahs) {
    if (!ayah || typeof ayah.text !== 'string' || ayah.text.trim().length === 0) return false;
    if (typeof ayah.translation === 'string' && ayah.translation.trim().length > 0) translated++;
  }
  if (requireTranslation && translated < detail.ayahs.length) return false;
  return true;
}

/**
 * Verifies the local Quran text cache WITHOUT touching the network — the
 * offline-readiness proof. Reads only `loadQuranCache`, yields to the event
 * loop every 8 surahs so the UI thread stays free.
 */
export async function verifyQuranPreloadCache(options?: {
  editionIdentifier?: string;
  onProgress?: (checked: number, total: number) => void;
}): Promise<QuranPreloadVerification> {
  const editionIdentifier = options?.editionIdentifier || getActiveEdition().editionIdentifier;
  const invalidSurahs: number[] = [];
  const missingSurahs: number[] = [];
  let valid = 0;
  let arabicValid = 0;

  for (let i = 1; i <= TOTAL_SURAHS; i++) {
    const arDetail = loadQuranCache<SurahDetail>(`surah:${i}:ar`);
    const arOk = isValidCachedSurah(arDetail, i, false);
    if (arOk) arabicValid++;

    const edDetail = loadQuranCache<SurahDetail>(`surah:${i}:${editionIdentifier}`);
    if (!edDetail) {
      missingSurahs.push(i);
    } else if (!isValidCachedSurah(edDetail, i, true)) {
      invalidSurahs.push(i);
    } else {
      valid++;
    }

    options?.onProgress?.(i, TOTAL_SURAHS);
    if (i % 8 === 0) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  return {
    editionIdentifier,
    total: TOTAL_SURAHS,
    valid,
    arabicValid,
    invalidSurahs,
    missingSurahs,
    ok: valid >= TOTAL_SURAHS && arabicValid >= TOTAL_SURAHS,
    checkedAt: Date.now(),
  };
}

/**
 * Re-download only the surahs that failed verification (missing or malformed).
 * Uses the normal preloader path with `force` limited to those surahs, so
 * already-good data is never refetched.
 */
export function repairQuranPreloadCache(
  verification: Pick<QuranPreloadVerification, 'invalidSurahs' | 'missingSurahs' | 'editionIdentifier'>
): Promise<void> {
  const surahs = Array.from(
    new Set([...verification.missingSurahs, ...verification.invalidSurahs])
  ).filter((n) => Number.isInteger(n) && n >= 1 && n <= TOTAL_SURAHS);

  if (surahs.length === 0) return Promise.resolve();

  return startQuranPreload({
    force: true,
    surahs,
    targetEdition: verification.editionIdentifier,
  }).catch(() => {});
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
  const chapterRes = await fetchWithTimeout(
    `https://api.quran.com/api/v4/chapters/${surahNumber}?language=en`,
    {},
    4000
  );
  if (!chapterRes.ok) throw new Error('quran.com chapter failed');
  const chapterJson = await chapterRes.json();
  const chapter = chapterJson?.chapter;
  if (!chapter) throw new Error('quran.com no chapter');

  const versesRes = await fetchWithTimeout(
    `https://api.quran.com/api/v4/quran/verses/uthmani?chapter_number=${surahNumber}`,
    {},
    4000
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

/**
 * Preload everything needed for offline Quran reading per surah:
 * 1. Tajweed text (islamic.app uthmani_tajweed) — full surah.
 * 2. Imlaei + Indo-Pak script text (islamic.app) — full surah (cheap: one
 *    by_chapter call each; cached via quranScripts).
 * Failures are non-fatal (never block the main preload loop).
 */
async function preloadTafsirAndTajweed(surahNumber: number): Promise<void> {
  // 1. Tajweed text — cached by fetchTajweedSurah (full surah).
  try {
    await fetchTajweedSurah(surahNumber);
  } catch {
    // non-fatal
  }

  // 2. Imlaei + Indo-Pak script text (uthmani is already covered by the
  //    quran editions preload). One by_chapter call each, cached.
  try {
    await fetchSurahWithScript(surahNumber, 'imlaei');
  } catch {
    // non-fatal
  }
  try {
    await fetchSurahWithScript(surahNumber, 'indopak');
  } catch {
    // non-fatal
  }
}

export async function preloadSingleSurah(
  surahNumber: number,
  editionIdentifier?: string,
  force = false
): Promise<boolean> {
  const active = getActiveEdition();
  const targetEdition = editionIdentifier || active.editionIdentifier;
  const targetLang =
    QURAN_LANGUAGE_EDITIONS.find((e) => e.editionIdentifier === targetEdition)?.languageCode ||
    active.languageCode;
  const selectedEditions = getSelectedLanguageEditions(targetLang, targetEdition);

  // Ensure target edition is first, followed only by editions for the selected language
  const prioritizedEditions = targetEdition
    ? [targetEdition, ...selectedEditions.filter((e) => e !== targetEdition)]
    : selectedEditions;

  if (!force && areAllEditionsCached(surahNumber, prioritizedEditions)) {
    return true;
  }

  // 1. Primary: multi-edition fetch of Arabic (quran-uthmani) + selected language editions in batched calls
  try {
    const result = await fetchSurahMultiEditions(surahNumber, prioritizedEditions, force);
    if (result && result.arabic && result.arabic.ayahs && result.arabic.ayahs.length > 0) {
      if (isQuranCacheKeyPresent(`surah:${surahNumber}:${targetEdition}`)) {
        return true;
      }
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
      return isQuranCacheKeyPresent(cacheKey);
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
        const ok = saveQuranCache(cacheKey, combined);
        return ok && isQuranCacheKeyPresent(cacheKey);
      }
    } catch {
      // Fallback failed as well
    }
    // SECOND PROVIDER: AlQuran Cloud is down/failing — pull Arabic text from Quran.com v4
    try {
      const detail = await fetchSurahFromQuranCom(surahNumber);
      if (detail && detail.ayahs && detail.ayahs.length > 0) {
        const ok = saveQuranCache(cacheKey, detail);
        const arKey = `surah:${surahNumber}:ar`;
        if (!loadQuranCache(arKey)) {
          saveQuranCache(arKey, detail);
        }
        return ok && isQuranCacheKeyPresent(cacheKey);
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
  /** Restrict the run to these surahs (repair/verification flow). Ignored when empty. */
  surahs?: number[];
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
  const targetLang =
    QURAN_LANGUAGE_EDITIONS.find((e) => e.editionIdentifier === editionIdentifier)?.languageCode ||
    languageCode;
  const selectedEditions = getSelectedLanguageEditions(targetLang, editionIdentifier);

  const prioritizedEditions = [
    editionIdentifier,
    ...selectedEditions.filter((e) => e !== editionIdentifier),
  ];

  if (
    isPreloaderRunning &&
    !options?.force &&
    !options?.initialSurah &&
    !options?.targetEdition &&
    !options?.surahs?.length
  ) {
    return;
  }

  shouldStopPreloader = false;
  isPreloaderRunning = true;
  const runId = ++activeRunId;

  if (!isAppOnline()) {
    isPreloaderRunning = false;
    const count = getCachedSurahsCount(editionIdentifier);
    emitProgress({
      isRunning: false,
      isComplete: count >= TOTAL_SURAHS,
      currentSurah: null,
      cached: count,
      languageCode,
      editionIdentifier,
    });
    return;
  }

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

  const explicitSurahs = (options?.surahs || []).filter(
    (n) => Number.isInteger(n) && n >= 1 && n <= TOTAL_SURAHS
  );

  if (
    cachedCount >= TOTAL_SURAHS &&
    allFullyCached &&
    !options?.force &&
    explicitSurahs.length === 0
  ) {
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

  // Determine fetch order: explicit subset (repair), then last-read position
  // first, then ascending 1..114
  const lastRead = loadLastReadPosition();
  const startSurah = options?.initialSurah ?? lastRead?.surah;
  const order: number[] = [];

  if (explicitSurahs.length > 0) {
    for (const n of explicitSurahs) {
      if (!order.includes(n)) order.push(n);
    }
  } else {
    if (startSurah && startSurah >= 1 && startSurah <= TOTAL_SURAHS) {
      order.push(startSurah);
    }
    for (let i = 1; i <= TOTAL_SURAHS; i++) {
      if (!order.includes(i)) {
        order.push(i);
      }
    }
  }

  const failedSurahs = new Set<number>();
  let consecutiveFailures = 0;
  let consecutiveSaveFailures = 0;
  const MAX_CONSECUTIVE_SAVE_FAILURES = 3;

  for (const surahNum of order) {
    if (shouldStopPreloader || runId !== activeRunId) {
      break;
    }
    if (!isAppOnline()) {
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
    const actuallySaved = isQuranCacheKeyPresent(`surah:${surahNum}:${editionIdentifier}`);

    if (success && actuallySaved) {
      consecutiveFailures = 0;
      consecutiveSaveFailures = 0;
      // Also preload tafsir + tajweed text for this surah so Tafsir and
      // Tajweed screens work fully offline (cached via quranCache).
      await preloadTafsirAndTajweed(surahNum);
      cachedCount = getCachedSurahsCount(editionIdentifier);
      emitProgress({
        cached: cachedCount,
        isComplete: cachedCount >= TOTAL_SURAHS,
      });
    } else {
      consecutiveFailures++;
      failedSurahs.add(surahNum);

      if (isAppOnline() && !actuallySaved) {
        consecutiveSaveFailures++;
      }

      if (consecutiveSaveFailures >= MAX_CONSECUTIVE_SAVE_FAILURES) {
        console.warn(`[quranPreloader] Stopping preload loop: ${consecutiveSaveFailures} consecutive save failures (SQLITE_FULL / disk full)`);
        isPreloaderRunning = false;
        emitProgress({
          isRunning: false,
          isComplete: false,
          saveFailure: true,
          error: t('Storage full: cannot save Quran cache'),
          currentSurah: null,
          cached: cachedCount,
        });
        return;
      }

      if (consecutiveFailures >= 3 || !isAppOnline()) {
        break;
      }
    }

    // Politeness pause between API calls
    await new Promise((resolve) => setTimeout(resolve, DELAY_BETWEEN_FETCHES_MS));
  }

  // Retry up to 2 passes for any failed surahs only if online
  if (isAppOnline() && consecutiveFailures < 3 && consecutiveSaveFailures < MAX_CONSECUTIVE_SAVE_FAILURES) {
    for (let retryPass = 1; retryPass <= 2 && failedSurahs.size > 0; retryPass++) {
      if (shouldStopPreloader || runId !== activeRunId || !isAppOnline()) break;
      await new Promise((resolve) => setTimeout(resolve, 500 * retryPass));

      for (const surahNum of Array.from(failedSurahs)) {
        if (shouldStopPreloader || runId !== activeRunId || !isAppOnline()) break;
        emitProgress({ currentSurah: surahNum });
        const success = await preloadSingleSurah(surahNum, editionIdentifier, options?.force);
        const actuallySaved = isQuranCacheKeyPresent(`surah:${surahNum}:${editionIdentifier}`);

        if (success && actuallySaved) {
          consecutiveSaveFailures = 0;
          failedSurahs.delete(surahNum);
          cachedCount = getCachedSurahsCount(editionIdentifier);
          emitProgress({
            cached: cachedCount,
            isComplete: cachedCount >= TOTAL_SURAHS,
          });
        } else {
          if (isAppOnline() && !actuallySaved) {
            consecutiveSaveFailures++;
          }
          if (consecutiveSaveFailures >= MAX_CONSECUTIVE_SAVE_FAILURES) {
            console.warn(`[quranPreloader] Stopping preload retries: ${consecutiveSaveFailures} consecutive save failures`);
            isPreloaderRunning = false;
            emitProgress({
              isRunning: false,
              isComplete: false,
              saveFailure: true,
              error: t('Storage full: cannot save Quran cache'),
              currentSurah: null,
              cached: cachedCount,
            });
            return;
          }
        }
        await new Promise((resolve) => setTimeout(resolve, DELAY_BETWEEN_FETCHES_MS));
      }
    }
  }

  // Final pass: check for any remaining uncached surahs across 1..114
  if (!shouldStopPreloader && runId === activeRunId && failedSurahs.size > 0 && consecutiveSaveFailures < MAX_CONSECUTIVE_SAVE_FAILURES) {
    for (const surahNum of Array.from(failedSurahs)) {
      if (shouldStopPreloader || runId !== activeRunId) break;
      emitProgress({ currentSurah: surahNum });
      const success = await preloadSingleSurah(surahNum, editionIdentifier, options?.force);
      const actuallySaved = isQuranCacheKeyPresent(`surah:${surahNum}:${editionIdentifier}`);

      if (success && actuallySaved) {
        consecutiveSaveFailures = 0;
        failedSurahs.delete(surahNum);
        cachedCount = getCachedSurahsCount(editionIdentifier);
        emitProgress({
          cached: cachedCount,
          isComplete: cachedCount >= TOTAL_SURAHS,
        });
      } else {
        if (isAppOnline() && !actuallySaved) {
          consecutiveSaveFailures++;
        }
        if (consecutiveSaveFailures >= MAX_CONSECUTIVE_SAVE_FAILURES) {
          console.warn(`[quranPreloader] Stopping final preload pass: ${consecutiveSaveFailures} consecutive save failures`);
          isPreloaderRunning = false;
          emitProgress({
            isRunning: false,
            isComplete: false,
            saveFailure: true,
            error: t('Storage full: cannot save Quran cache'),
            currentSurah: null,
            cached: cachedCount,
          });
          return;
        }
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
 * when a user opens an uncached surah. Respects the user's "Preload Quran"
 * setting: when disabled, only the opened surah is fetched on demand.
 */
export function preloadRemainingSurahsForEdition(
  surahNumber: number,
  editionIdentifier: string
): void {
  if (!getQuranPreloadRequested()) return;
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
