import AsyncStorage from '@react-native-async-storage/async-storage';
import { QuranGoalConfig } from './settings';

const STORAGE_KEY_PREFIX = 'quran-daily-progress:';

export interface QuranDailyProgress {
  date: string; // YYYY-MM-DD
  minutesRead: number;
  pagesRead: number;
  customCompleted: number; // ayahs or custom units
  completed: boolean;
  completedAt?: number;
}

export function getTodayDateStr(date = new Date()): string {
  const d = date;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export async function loadQuranDailyProgress(dateStr = getTodayDateStr()): Promise<QuranDailyProgress> {
  try {
    const raw = await AsyncStorage.getItem(`${STORAGE_KEY_PREFIX}${dateStr}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        date: dateStr,
        minutesRead: Number(parsed.minutesRead || 0),
        pagesRead: Number(parsed.pagesRead || 0),
        customCompleted: Number(parsed.customCompleted || 0),
        completed: Boolean(parsed.completed),
        completedAt: parsed.completedAt ? Number(parsed.completedAt) : undefined,
      };
    }
  } catch {
    // fallback
  }

  return {
    date: dateStr,
    minutesRead: 0,
    pagesRead: 0,
    customCompleted: 0,
    completed: false,
  };
}

export const MAX_PROGRESS_HISTORY_DAYS = 90;

export async function pruneOldQuranDailyProgress(): Promise<void> {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - MAX_PROGRESS_HISTORY_DAYS);
    const cutoffDate = getTodayDateStr(cutoff);

    const keysToRemove = allKeys.filter((k) => {
      if (!k.startsWith(STORAGE_KEY_PREFIX)) return false;
      const datePart = k.slice(STORAGE_KEY_PREFIX.length);
      return datePart < cutoffDate;
    });

    if (keysToRemove.length > 0) {
      await AsyncStorage.multiRemove(keysToRemove);
    }
  } catch {
    // non-fatal
  }
}

export async function saveQuranDailyProgress(progress: QuranDailyProgress): Promise<void> {
  try {
    await AsyncStorage.setItem(`${STORAGE_KEY_PREFIX}${progress.date}`, JSON.stringify(progress));
    await pruneOldQuranDailyProgress();
  } catch {
    // non-fatal
  }
}

export async function recordQuranReadingSession(
  delta: { minutes?: number; pages?: number; custom?: number },
  goal?: QuranGoalConfig,
  dateStr = getTodayDateStr()
): Promise<QuranDailyProgress> {
  const current = await loadQuranDailyProgress(dateStr);
  const minutesRead = current.minutesRead + Math.max(0, delta.minutes || 0);
  const pagesRead = current.pagesRead + Math.max(0, delta.pages || 0);
  const customCompleted = current.customCompleted + Math.max(0, delta.custom || 0);

  let completed = current.completed;
  if (!completed && goal) {
    if (goal.type === 'minutes' && minutesRead >= goal.target) {
      completed = true;
    } else if (goal.type === 'pages' && pagesRead >= goal.target) {
      completed = true;
    } else if (goal.type === 'custom' && customCompleted >= goal.target) {
      completed = true;
    }
  }

  const updated: QuranDailyProgress = {
    date: dateStr,
    minutesRead,
    pagesRead,
    customCompleted,
    completed,
    completedAt: completed && !current.completed ? Date.now() : current.completedAt,
  };

  await saveQuranDailyProgress(updated);
  return updated;
}

export async function isQuranDailyGoalCompleted(
  goal?: QuranGoalConfig,
  dateStr = getTodayDateStr()
): Promise<boolean> {
  const progress = await loadQuranDailyProgress(dateStr);
  if (progress.completed) return true;
  if (!goal) return false;

  if (goal.type === 'minutes' && progress.minutesRead >= goal.target) return true;
  if (goal.type === 'pages' && progress.pagesRead >= goal.target) return true;
  if (goal.type === 'custom' && progress.customCompleted >= goal.target) return true;

  return false;
}

export async function setQuranDailyGoalCompleted(
  completed: boolean,
  dateStr = getTodayDateStr()
): Promise<QuranDailyProgress> {
  const current = await loadQuranDailyProgress(dateStr);
  const updated: QuranDailyProgress = {
    ...current,
    completed,
    completedAt: completed ? Date.now() : undefined,
  };
  await saveQuranDailyProgress(updated);
  return updated;
}
