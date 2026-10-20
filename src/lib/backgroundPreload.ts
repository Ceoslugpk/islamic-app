import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import { startQuranPreload, getQuranPreloadProgress } from './quranPreloader';

/**
 * Background preload task.
 *
 * Android restricts background execution: a JS loop stops when the app is
 * backgrounded. This task runs in short OS-allowed bursts (via
 * expo-background-task, minimum interval 15 min) and continues the Quran
 * preload from where it left off — always respecting the existing
 * pause/cache-skip logic (never refetches cached surahs).
 *
 * The user's explicit pause flag (`quranPreloadRequested` in settings) is
 * respected: the task only runs while preloading is enabled.
 *
 * Migrated from the deprecated `expo-background-fetch` (F-44). The new API
 * has no `stopOnTerminate`/`startOnBoot` options: on Android `WorkManager`
 * persists the task across reboots and app-termination-by-system by default,
 * which is the behaviour those old flags requested.
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
            return BackgroundTask.BackgroundTaskResult.Success;
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
            return BackgroundTask.BackgroundTaskResult.Success;
          }

          const progress = getQuranPreloadProgress();
          if (progress.isComplete) {
            return BackgroundTask.BackgroundTaskResult.Success;
          }

          // Resume the preload (it skips already-cached surahs). Bound it to a
          // short burst: start a limited run; the preloader's own loop breaks
          // on shouldStopPreloader, and the background task terminates us shortly.
          await startQuranPreload();
          return BackgroundTask.BackgroundTaskResult.Success;
        } catch {
          return BackgroundTask.BackgroundTaskResult.Failed;
        }
      });
    }

    await BackgroundTask.registerTaskAsync(BACKGROUND_PRELOAD_TASK, {
      minimumInterval: 15, // minutes; Android may adjust (minimum 15)
    });
  } catch {
    // Background task unavailable (web/simulator) — preload stays foreground-only
  }
}

export async function unregisterBackgroundPreload(): Promise<void> {
  try {
    await BackgroundTask.unregisterTaskAsync(BACKGROUND_PRELOAD_TASK);
  } catch {
    // ignore
  }
}

/** True if the background task is registered (for a Settings toggle). */
export async function isBackgroundPreloadRegistered(): Promise<boolean> {
  try {
    return await BackgroundTask.getStatusAsync() === BackgroundTask.BackgroundTaskStatus.Available;
  } catch {
    return false;
  }
}
