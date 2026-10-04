import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchPrayerTimes, Location } from './prayerTimes';
import { startQuranPreload, isQuranPreloadRunning } from './quranPreloader';
import { fetchReciters } from './quranAudio';
import { fetchHadithCollections } from './hadithApi';
import { getQuranTranslationLanguage } from './quranLanguageState';

const WARMUP_DONE_KEY = 'warmup-done-v1';
const WARMUP_VERSION = 1;

export interface WarmupProgress {
  step: string;
  completed: string[];
  total: number;
  currentIndex: number;
  isComplete: boolean;
  error?: string;
}

let warmupInProgress = false;
const progressListeners = new Set<(progress: WarmupProgress) => void>();

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

export function getWarmupProgress(): WarmupProgress {
  return {
    step: 'idle',
    completed: [],
    total: 5,
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
    await AsyncStorage.setItem(WARMUP_DONE_KEY, JSON.stringify({ version: WARMUP_VERSION, done: true, timestamp: Date.now() }));
  } catch {
    // non-fatal
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function runFirstLaunchWarmup(options?: {
  location?: Location;
  methodId?: number;
  onProgress?: (progress: WarmupProgress) => void;
}): Promise<void> {
  if (warmupInProgress) {
    return;
  }

  const alreadyDone = await hasWarmupRun();
  if (alreadyDone) {
    return;
  }

  warmupInProgress = true;
  const steps = [
    { key: 'prayer', label: 'Prayer Times' },
    { key: 'quran', label: 'Quran (Arabic + Translation)' },
    { key: 'reciters', label: 'Reciters List' },
    { key: 'hadith-collections', label: 'Hadith Collections' },
    { key: 'hadith-day', label: 'Hadith of the Day' },
  ];

  const completed: string[] = [];

  const updateProgress = (stepIndex: number, stepLabel: string, error?: string) => {
    const progress: WarmupProgress = {
      step: stepLabel,
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
      const loc = options?.location || { latitude: 25.2048, longitude: 55.2708, label: 'Dubai, UAE' };
      const method = options?.methodId || 8;
      await fetchPrayerTimes(loc, method, new Date(), false);
      completed.push(steps[0].key);
    } catch {
      // Non-fatal: offline first launch, skip
    }
    await sleep(300);

    // Step 2: Quran Preload (kick off background preloader)
    updateProgress(1, steps[1].label);
    try {
      if (!isQuranPreloadRunning()) {
        startQuranPreload();
      }
      completed.push(steps[1].key);
    } catch {
      // Non-fatal
    }
    await sleep(300);

    // Step 3: Reciters
    updateProgress(2, steps[2].label);
    try {
      await fetchReciters();
      completed.push(steps[2].key);
    } catch {
      // Non-fatal
    }
    await sleep(300);

    // Step 4: Hadith Collections (cache the list)
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
      // The useHadithOfDay hook caches automatically on fetch
      // We can't call the hook here, but the Home screen will trigger it
      // Just ensure the API is reachable by doing a lightweight fetch
      const response = await fetch('https://api.islamic.app/v1/hadith/today', { method: 'HEAD' });
      if (response.ok) {
        completed.push(steps[4].key);
      }
    } catch {
      // Non-fatal
    }

    await markWarmupDone();
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

export function isWarmupDone(): Promise<boolean> {
  return hasWarmupRun();
}

export function resetWarmup(): Promise<void> {
  return AsyncStorage.removeItem(WARMUP_DONE_KEY).catch(() => {});
}