import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchPrayerTimes, Location } from './prayerTimes';
import {
  startQuranPreload,
  isQuranPreloadRunning,
  isQuranPreloadComplete,
} from './quranPreloader';
import { fetchReciters } from './quranAudio';
import {
  fetchHadithCollections,
  fetchHadithBooks,
  fetchHadithsInBook,
  isHadithPageCached,
  HadithCollection,
  HadithBook,
} from './hadithApi';
import { fetchSurahList, fetchSurahListForLanguage, fetchWithTimeout } from './quran';
import { getQuranTranslationLanguage } from './quranLanguageState';
import { loadQuranPreloadRequested } from './settings';
import { isAppOnline } from './useConnectivity';
import { t } from './i18n';

const WARMUP_DONE_KEY = 'warmup-done-v1';
const WARMUP_VERSION = 1;
export const HADITH_WARMUP_PROGRESS_KEY = 'hadith-warmup-progress';

const HADITH_PAGE_LIMIT = 20;
const HADITH_REQUEST_DELAY_MS = 350; // 350ms delay between requests (~170 req/min, islamic.app limit is 600/min)
const PRIORITY_COLLECTIONS = ['bukhari', 'muslim'];
const MAIN_LANGUAGES = ['ar', 'ur', 'id', 'tr', 'fr', 'de', 'es', 'ru', 'bn', 'ms', 'ta', 'ps', 'fa', 'hi', 'ml', 'si'];

export interface WarmupProgress {
  step: string;
  completed: string[];
  total: number;
  currentIndex: number;
  isComplete: boolean;
  error?: string;
}

export interface HadithWarmupProgress {
  collectionIndex: number;
  collectionSlug: string;
  collectionName: string;
  bookIndex: number;
  bookNumber: string;
  bookName: string;
  offset: number;
  totalHadithsInBook: number;
  completedCollections: string[];
  totalCollections: number;
  totalHadithsCached: number;
  isRunning: boolean;
  isComplete: boolean;
  lastUpdated: number;
  error?: string | null;
}

interface StoredHadithWarmupProgress {
  version: number;
  collectionIndex: number;
  collectionSlug: string;
  bookIndex: number;
  bookNumber: string;
  offset: number;
  completedCollections: string[];
  totalHadithsCached: number;
  isComplete: boolean;
  lastUpdated: number;
}

let warmupInProgress = false;
const progressListeners = new Set<(progress: WarmupProgress) => void>();

let hadithWarmupRunning = false;
let shouldStopHadithWarmup = false;
let activeHadithRunId = 0;
const hadithProgressListeners = new Set<(progress: HadithWarmupProgress) => void>();

let currentHadithProgress: HadithWarmupProgress = {
  collectionIndex: 0,
  collectionSlug: '',
  collectionName: '',
  bookIndex: 0,
  bookNumber: '',
  bookName: '',
  offset: 0,
  totalHadithsInBook: 0,
  completedCollections: [],
  totalCollections: 17,
  totalHadithsCached: 0,
  isRunning: false,
  isComplete: false,
  lastUpdated: 0,
  error: null,
};

function emitProgress(update: Partial<WarmupProgress>) {
  const current = getWarmupProgress();
  const next = { ...current, ...update };
  progressListeners.forEach((listener) => {
    try {
      listener(next);
    } catch {
      // non-fatal
    }
  });
}

function emitHadithProgress(update: Partial<HadithWarmupProgress>) {
  currentHadithProgress = { ...currentHadithProgress, ...update };
  hadithProgressListeners.forEach((listener) => {
    try {
      listener(currentHadithProgress);
    } catch {
      // non-fatal
    }
  });
}

export function getWarmupProgress(): WarmupProgress {
  return {
    step: 'idle',
    completed: [],
    total: 6,
    currentIndex: 0,
    isComplete: false,
  };
}

export function subscribeWarmup(listener: (progress: WarmupProgress) => void): () => void {
  progressListeners.add(listener);
  listener(getWarmupProgress());
  return () => {
    progressListeners.delete(listener);
  };
}

export function getHadithWarmupProgress(): HadithWarmupProgress {
  return currentHadithProgress;
}

export function subscribeHadithWarmup(listener: (progress: HadithWarmupProgress) => void): () => void {
  hadithProgressListeners.add(listener);
  listener(getHadithWarmupProgress());
  return () => {
    hadithProgressListeners.delete(listener);
  };
}

export function isHadithWarmupRunning(): boolean {
  return hadithWarmupRunning;
}

export function pauseHadithWarmup(): void {
  shouldStopHadithWarmup = true;
  hadithWarmupRunning = false;
  emitHadithProgress({ isRunning: false });
}

async function loadHadithWarmupState(): Promise<StoredHadithWarmupProgress | null> {
  try {
    const raw = await AsyncStorage.getItem(HADITH_WARMUP_PROGRESS_KEY);
    if (raw) {
      return JSON.parse(raw) as StoredHadithWarmupProgress;
    }
  } catch {
    // ignore
  }
  return null;
}

async function saveHadithWarmupState(state: StoredHadithWarmupProgress): Promise<void> {
  try {
    await AsyncStorage.setItem(HADITH_WARMUP_PROGRESS_KEY, JSON.stringify(state));
  } catch {
    // non-fatal
  }
}

export async function isHadithWarmupComplete(): Promise<boolean> {
  const state = await loadHadithWarmupState();
  return state?.isComplete === true;
}

export async function resetHadithWarmup(): Promise<void> {
  shouldStopHadithWarmup = true;
  hadithWarmupRunning = false;
  try {
    await AsyncStorage.removeItem(HADITH_WARMUP_PROGRESS_KEY);
  } catch {
    // non-fatal
  }
  emitHadithProgress({
    collectionIndex: 0,
    collectionSlug: '',
    collectionName: '',
    bookIndex: 0,
    bookNumber: '',
    bookName: '',
    offset: 0,
    totalHadithsInBook: 0,
    completedCollections: [],
    totalHadithsCached: 0,
    isRunning: false,
    isComplete: false,
    lastUpdated: Date.now(),
    error: null,
  });
}

/**
 * Resumable Hadith books & text preloader.
 * Starts with Bukhari + Muslim fully (the two most widely used), then remaining 15 collections.
 * Caches every book's hadiths paginated by 20 and records progress in AsyncStorage.
 * Paces at 350ms between live network requests (polite).
 */
export async function startHadithWarmup(options?: {
  force?: boolean;
  onProgress?: (progress: HadithWarmupProgress) => void;
}): Promise<void> {
  if (!isAppOnline()) {
    hadithWarmupRunning = false;
    return;
  }
  if (hadithWarmupRunning && !options?.force) {
    return;
  }

  const stored = await loadHadithWarmupState();
  if (stored?.isComplete && !options?.force) {
    hadithWarmupRunning = false;
    emitHadithProgress({
      isRunning: false,
      isComplete: true,
      completedCollections: stored.completedCollections,
      totalHadithsCached: stored.totalHadithsCached,
    });
    return;
  }

  shouldStopHadithWarmup = false;
  hadithWarmupRunning = true;
  const runId = ++activeHadithRunId;

  try {
    const rawCollections = await fetchHadithCollections(false);
    if (!rawCollections || rawCollections.length === 0) {
      hadithWarmupRunning = false;
      return;
    }

    // Priority ordering: Sahih al-Bukhari & Sahih Muslim first, then remainder
    const orderedCollections: HadithCollection[] = [
      ...rawCollections.filter((c) => c.slug === 'bukhari'),
      ...rawCollections.filter((c) => c.slug === 'muslim'),
      ...rawCollections.filter((c) => !PRIORITY_COLLECTIONS.includes(c.slug)),
    ];

    const totalCollections = orderedCollections.length;
    let startColIdx = stored?.collectionIndex ?? 0;
    let startBookIdx = stored?.bookIndex ?? 0;
    let startOffset = stored?.offset ?? 0;
    const completedCols: string[] = stored?.completedCollections ? [...stored.completedCollections] : [];
    let totalCached = stored?.totalHadithsCached ?? 0;

    if (startColIdx >= totalCollections) {
      await saveHadithWarmupState({
        version: 1,
        collectionIndex: totalCollections,
        collectionSlug: '',
        bookIndex: 0,
        bookNumber: '',
        offset: 0,
        completedCollections: orderedCollections.map((c) => c.slug),
        totalHadithsCached: totalCached,
        isComplete: true,
        lastUpdated: Date.now(),
      });
      hadithWarmupRunning = false;
      emitHadithProgress({
        isRunning: false,
        isComplete: true,
        totalHadithsCached: totalCached,
        totalCollections,
      });
      return;
    }

    emitHadithProgress({
      isRunning: true,
      isComplete: false,
      totalCollections,
      totalHadithsCached: totalCached,
      completedCollections: completedCols,
    });

    for (let cIdx = startColIdx; cIdx < totalCollections; cIdx++) {
      if (shouldStopHadithWarmup || runId !== activeHadithRunId) break;

      const col = orderedCollections[cIdx];
      let books: HadithBook[] = [];

      try {
        books = await fetchHadithBooks(col.slug, false);
      } catch {
        // Network failure loading books; save progress and exit gracefully
        await saveHadithWarmupState({
          version: 1,
          collectionIndex: cIdx,
          collectionSlug: col.slug,
          bookIndex: 0,
          bookNumber: '',
          offset: 0,
          completedCollections: completedCols,
          totalHadithsCached: totalCached,
          isComplete: false,
          lastUpdated: Date.now(),
        });
        break;
      }

      if (!books || books.length === 0) {
        if (!completedCols.includes(col.slug)) completedCols.push(col.slug);
        continue;
      }

      const bookStart = cIdx === startColIdx ? startBookIdx : 0;

      for (let bIdx = bookStart; bIdx < books.length; bIdx++) {
        if (shouldStopHadithWarmup || runId !== activeHadithRunId) break;

        const book = books[bIdx];
        if (book.hadithCount === 0) {
          continue;
        }

        const offsetStart = (cIdx === startColIdx && bIdx === startBookIdx) ? startOffset : 0;
        let offset = offsetStart;
        let bookDone = false;
        let consecutiveErrors = 0;

        while (!bookDone) {
          if (shouldStopHadithWarmup || runId !== activeHadithRunId) break;

          const progressUpdate: Partial<HadithWarmupProgress> = {
            collectionIndex: cIdx,
            collectionSlug: col.slug,
            collectionName: col.name?.en || col.slug,
            bookIndex: bIdx,
            bookNumber: book.bookNumber,
            bookName: book.name?.en || t('Book {{number}}', { number: book.bookNumber }),
            offset,
            totalHadithsInBook: book.hadithCount,
            completedCollections: completedCols,
            totalCollections,
            totalHadithsCached: totalCached,
            isRunning: true,
            isComplete: false,
          };
          emitHadithProgress(progressUpdate);
          options?.onProgress?.(currentHadithProgress);

          // Fast path: Check if page is already cached
          const alreadyCached = await isHadithPageCached(col.slug, book.bookNumber, offset);
          if (alreadyCached) {
            try {
              const cachedData = await fetchHadithsInBook(col.slug, book.bookNumber, HADITH_PAGE_LIMIT, offset, false);
              const isEnd =
                cachedData.hadiths.length < HADITH_PAGE_LIMIT ||
                (cachedData.total > 0 && offset + cachedData.hadiths.length >= cachedData.total) ||
                cachedData.hadiths.length === 0;

              if (isEnd) {
                bookDone = true;
              } else {
                offset += HADITH_PAGE_LIMIT;
              }
              // Skip sleep for cached items
              continue;
            } catch {
              // Non-fatal, fallback to live fetch
            }
          }

          // Network fetch
          try {
            const data = await fetchHadithsInBook(col.slug, book.bookNumber, HADITH_PAGE_LIMIT, offset, false);
            consecutiveErrors = 0;
            totalCached += data.hadiths.length;

            const isEnd =
              data.hadiths.length < HADITH_PAGE_LIMIT ||
              (data.total > 0 && offset + data.hadiths.length >= data.total) ||
              data.hadiths.length === 0;

            if (isEnd) {
              bookDone = true;
            } else {
              offset += HADITH_PAGE_LIMIT;
            }

            // Persist progress after each page
            await saveHadithWarmupState({
              version: 1,
              collectionIndex: cIdx,
              collectionSlug: col.slug,
              bookIndex: bIdx,
              bookNumber: book.bookNumber,
              offset: isEnd ? 0 : offset,
              completedCollections: completedCols,
              totalHadithsCached: totalCached,
              isComplete: false,
              lastUpdated: Date.now(),
            });

            // Politeness pause between API calls (~170 req/min, limit is 600/min)
            await sleep(HADITH_REQUEST_DELAY_MS);
          } catch {
            consecutiveErrors++;
            await saveHadithWarmupState({
              version: 1,
              collectionIndex: cIdx,
              collectionSlug: col.slug,
              bookIndex: bIdx,
              bookNumber: book.bookNumber,
              offset,
              completedCollections: completedCols,
              totalHadithsCached: totalCached,
              isComplete: false,
              lastUpdated: Date.now(),
            });

            if (consecutiveErrors >= 2) {
              // Network is unavailable or server error; pause gracefully
              shouldStopHadithWarmup = true;
              break;
            }
            await sleep(1000);
          }
        } // while (!bookDone)

        if (shouldStopHadithWarmup || runId !== activeHadithRunId) break;

        // Book completed
        await saveHadithWarmupState({
          version: 1,
          collectionIndex: cIdx,
          collectionSlug: col.slug,
          bookIndex: bIdx + 1,
          bookNumber: '',
          offset: 0,
          completedCollections: completedCols,
          totalHadithsCached: totalCached,
          isComplete: false,
          lastUpdated: Date.now(),
        });
      } // for books

      if (shouldStopHadithWarmup || runId !== activeHadithRunId) break;

      // Collection completed!
      if (!completedCols.includes(col.slug)) {
        completedCols.push(col.slug);
      }
      await saveHadithWarmupState({
        version: 1,
        collectionIndex: cIdx + 1,
        collectionSlug: '',
        bookIndex: 0,
        bookNumber: '',
        offset: 0,
        completedCollections: completedCols,
        totalHadithsCached: totalCached,
        isComplete: cIdx + 1 >= totalCollections,
        lastUpdated: Date.now(),
      });
    } // for collections

    if (runId === activeHadithRunId && !shouldStopHadithWarmup) {
      const finalStored = await loadHadithWarmupState();
      const allDone = (finalStored?.collectionIndex ?? 0) >= totalCollections;
      if (allDone) {
        await saveHadithWarmupState({
          version: 1,
          collectionIndex: totalCollections,
          collectionSlug: '',
          bookIndex: 0,
          bookNumber: '',
          offset: 0,
          completedCollections: orderedCollections.map((c) => c.slug),
          totalHadithsCached: totalCached,
          isComplete: true,
          lastUpdated: Date.now(),
        });
      }
      hadithWarmupRunning = false;
      emitHadithProgress({
        isRunning: false,
        isComplete: allDone,
        totalHadithsCached: totalCached,
      });
    }
  } catch {
    // Non-fatal, unhandled errors caught cleanly
  } finally {
    if (runId === activeHadithRunId) {
      hadithWarmupRunning = false;
    }
  }
}

async function hasWarmupRun(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(WARMUP_DONE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return parsed.version === WARMUP_VERSION && parsed.done === true;
    }
  } catch {
    // ignore
  }
  return false;
}

async function markWarmupDone(): Promise<void> {
  try {
    await AsyncStorage.setItem(
      WARMUP_DONE_KEY,
      JSON.stringify({ version: WARMUP_VERSION, done: true, timestamp: Date.now() })
    );
  } catch {
    // non-fatal
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Main application warm-up.
 * On first launch:
 *   1. Prayer times (location + method)
 *   2. Full Quran text (Arabic + user translation), surah list, & per-language surah names
 *   3. Reciters list
 *   4. Hadith collections list
 *   5. Hadith of the day
 *   6. Starts resumable background crawling of all Hadith books (Bukhari + Muslim fully first, then rest)
 * On subsequent launches:
 *   Resumes Quran preloader (all 114 surahs) and Hadith preloader (all books/pages) until 100% complete.
 */
export async function runFirstLaunchWarmup(options?: {
  location?: Location;
  methodId?: number;
  onProgress?: (progress: WarmupProgress) => void;
}): Promise<void> {
  if (!isAppOnline()) {
    try {
      const loc = options?.location || { latitude: 21.4225, longitude: 39.8262, label: 'Makkah, Saudi Arabia' };
      const method = options?.methodId || 16;
      await fetchPrayerTimes(loc, method, new Date(), false);
      await fetchSurahList();
      await markWarmupDone();
    } catch {
      // non-fatal
    }
    return;
  }

  const quickDone = await hasWarmupRun();
  const preloadRequested = await loadQuranPreloadRequested();

  if (quickDone) {
    // Quick steps already done on an earlier launch.
    // Ensure progressive background downloaders are resumed until fully cached
    // (Quran text only when the user hasn't turned preloading off).
    if (preloadRequested && !isQuranPreloadRunning() && !isQuranPreloadComplete()) {
      startQuranPreload();
    }
    const hadithDone = await isHadithWarmupComplete();
    if (!isHadithWarmupRunning() && !hadithDone) {
      startHadithWarmup();
    }
    return;
  }

  if (warmupInProgress) {
    return;
  }

  warmupInProgress = true;
  const steps = [
    { key: 'prayer', label: 'Prayer Times' },
    { key: 'quran', label: 'Quran (Arabic + Translations)' },
    { key: 'reciters', label: 'Reciters List' },
    { key: 'hadith-collections', label: 'Hadith Collections' },
    { key: 'hadith-day', label: 'Hadith of the Day' },
    { key: 'hadith-all', label: 'Hadith Books & Texts' },
  ];

  const completed: string[] = [];

  const updateProgress = (stepIndex: number, stepLabel: string, error?: string) => {
    const progress: WarmupProgress = {
      step: t(stepLabel),
      completed: [...completed],
      total: steps.length,
      currentIndex: stepIndex,
      isComplete: stepIndex >= steps.length - 1,
      error,
    };
    emitProgress(progress);
    options?.onProgress?.(progress);
  };

  try {
    // Step 1: Prayer Times
    updateProgress(0, steps[0].label);
    try {
      const loc = options?.location || { latitude: 21.4225, longitude: 39.8262, label: 'Makkah, Saudi Arabia' };
      const method = options?.methodId || 16;
      await fetchPrayerTimes(loc, method, new Date(), false);
      completed.push(steps[0].key);
    } catch {
      // Non-fatal: offline first launch, skip
    }
    await sleep(300);

    // Step 2: Full Quran (Surah list + per-language translation name maps + start full 114 surah preload)
    updateProgress(1, steps[1].label);
    try {
      await fetchSurahList();

      const languagesToCache = [...MAIN_LANGUAGES];
      const userLang = getQuranTranslationLanguage();
      if (userLang && !languagesToCache.includes(userLang)) {
        languagesToCache.push(userLang);
      }

      for (const lang of languagesToCache) {
        try {
          await fetchSurahListForLanguage(lang);
        } catch {
          // non-fatal, local dictionary fallback handles offline
        }
      }

      if (preloadRequested && !isQuranPreloadRunning()) {
        startQuranPreload();
      }
      completed.push(steps[1].key);
    } catch {
      // Non-fatal
    }
    await sleep(300);

    // Step 3: Reciters List
    updateProgress(2, steps[2].label);
    try {
      await fetchReciters();
      completed.push(steps[2].key);
    } catch {
      // Non-fatal
    }
    await sleep(300);

    // Step 4: Hadith Collections
    updateProgress(3, steps[3].label);
    try {
      await fetchHadithCollections(false);
      completed.push(steps[3].key);
    } catch {
      // Non-fatal
    }
    await sleep(300);

    // Step 5: Hadith of the Day
    updateProgress(4, steps[4].label);
    try {
      const response = await fetchWithTimeout('https://api.islamic.app/v1/hadith/today', { method: 'HEAD' }, 3000);
      if (response.ok) {
        completed.push(steps[4].key);
      }
    } catch {
      // Non-fatal
    }

    // Mark the quick launch steps done so subsequent app launches don't re-run them
    await markWarmupDone();

    // Step 6: Hadith Books & Texts (background resumable crawl: Bukhari & Muslim fully, then rest)
    updateProgress(5, steps[5].label);
    try {
      if (!isHadithWarmupRunning()) {
        startHadithWarmup();
      }
      completed.push(steps[5].key);
    } catch {
      // Non-fatal
    }

    emitProgress({
      step: 'complete',
      completed,
      total: steps.length,
      currentIndex: steps.length,
      isComplete: true,
    });
    options?.onProgress?.({
      step: 'complete',
      completed,
      total: steps.length,
      currentIndex: steps.length,
      isComplete: true,
    });
  } catch (err) {
    emitProgress({
      step: 'error',
      completed,
      total: steps.length,
      currentIndex: completed.length,
      isComplete: false,
      error: String(err),
    });
  } finally {
    warmupInProgress = false;
  }
}

export async function isWarmupDone(): Promise<boolean> {
  const quickDone = await hasWarmupRun();
  const hadithDone = await isHadithWarmupComplete();
  const quranComplete = isQuranPreloadComplete();
  return quickDone && hadithDone && quranComplete;
}

export async function resetWarmup(): Promise<void> {
  await AsyncStorage.removeItem(WARMUP_DONE_KEY).catch(() => {});
  await resetHadithWarmup();
}
