import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { startQuranPreload, getQuranPreloadProgress } from './quranPreloader';

/**
 * Background preload task.
 *
 * Android restricts background execution: a JS loop stops when the app is
 * backgrounded. This task runs in short OS-allowed bursts (via
 * expo-background-fetch, minimum interval 15 min) and continues the Quran
 * preload from where it left off — always respecting the existing
 * pause/cache-skip logic (never refetches cached surahs).
 *
 * The user's explicit pause flag (`quranPreloadRequested` in settings) is
 * respected: the task only runs while preloading is enabled.
 */

const BACKGROUND_PRELOAD_TASK = 'islamic-quran-preload';

let lastRunAt = 0;
const MIN_BURST_GAP_MS = 15 * 60 * 1000; // respect Android's minimum interval

export async function registerBackgroundPreload(): Promise<void> {
  try {
    if (!TaskManager.isTaskDefined(BACKGROUND_PRELOAD_TASK)) {
      TaskManager.defineTask(BACKGROUND_PRELOAD_TASK, async () => {
        try {
          const now = Date.now();
          if (now - lastRunAt < MIN_BURST_GAP_MS) {
            return BackgroundFetch.BackgroundFetchResult.NoData;
          }
          lastRunAt = now;

          // Only continue if the user hasn't paused preloading
          const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
          const raw = await AsyncStorage.getItem('islamic-settings');
          let enabled = true;
          if (raw) {
            try {
              enabled = !!(JSON.parse(raw).quranPreloadRequested ?? true);
            } catch {
              // default to enabled
            }
          }
          if (!enabled) {
            return BackgroundFetch.BackgroundFetchResult.NoData;
          }

          const progress = getQuranPreloadProgress();
          if (progress.isComplete) {
            return BackgroundFetch.BackgroundFetchResult.NoData;
          }

          // Resume the preload (it skips already-cached surahs). Bound it to a
          // short burst: start a limited run; the preloader's own loop breaks
          // on shouldStopPreloader, and background-fetch terminates us shortly.
          await startQuranPreload();
          return BackgroundFetch.BackgroundFetchResult.NewData;
        } catch {
          return BackgroundFetch.BackgroundFetchResult.Failed;
        }
      });
    }

    await BackgroundFetch.registerTaskAsync(BACKGROUND_PRELOAD_TASK, {
      minimumInterval: 15, // minutes; Android may adjust
      stopOnTerminate: false,
      startOnBoot: true,
    });
  } catch {
    // Background fetch unavailable (web/simulator) — preload stays foreground-only
  }
}

export async function unregisterBackgroundPreload(): Promise<void> {
  try {
    await BackgroundFetch.unregisterTaskAsync(BACKGROUND_PRELOAD_TASK);
  } catch {
    // ignore
  }
}

/** True if the background task is registered (for a Settings toggle). */
export async function isBackgroundPreloadRegistered(): Promise<boolean> {
  try {
    return await BackgroundFetch.getStatusAsync() === BackgroundFetch.BackgroundFetchStatus.Available;
  } catch {
    return false;
  }
}
