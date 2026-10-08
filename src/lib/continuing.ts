import AsyncStorage from '@react-native-async-storage/async-storage';
import { SURAH_AYAH_COUNTS } from './surahAyahCounts';

const STORAGE_KEY = 'quran-last-reading';
const MARKER_KEY = 'quran-reading-marker';

export interface ReadingPosition {
  surah: number;
  ayah: number;
  savedAt: number;
}

export interface ReadingMarker extends ReadingPosition {
  /** True when the user explicitly set this marker (manual). */
  manual: true;
}

/** Validate a stored position against the Quran's real bounds (1-114 surahs, per-surah ayah count). */
export function isValidReadingPosition(pos: { surah: number; ayah: number }): boolean {
  const surah = pos?.surah;
  const ayah = pos?.ayah;
  if (typeof surah !== 'number' || typeof ayah !== 'number') return false;
  if (surah < 1 || surah > 114) return false;
  const maxAyah = SURAH_AYAH_COUNTS[surah - 1];
  if (typeof maxAyah !== 'number') return false;
  return ayah >= 1 && ayah <= maxAyah;
}

export function saveReadingPosition(surah: number, ayah: number): void {
  const position: ReadingPosition = {
    surah,
    ayah,
    savedAt: Date.now(),
  };
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(position))
    .catch(() => {});
}

export async function getReadingPosition(): Promise<ReadingPosition | null> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    if (
      parsed &&
      typeof parsed.savedAt === 'number' &&
      isValidReadingPosition(parsed)
    ) {
      return parsed as ReadingPosition;
    }
    return null;
  } catch {
    return null;
  }
}

export function clearReadingPosition(): void {
  AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
}

/**
 * Manual reading marker — the user explicitly says "this is where I stopped".
 * Exactly one active marker; setting a new one replaces the old.
 */
export function saveReadingMarker(surah: number, ayah: number): void {
  const marker: ReadingMarker = {
    surah,
    ayah,
    savedAt: Date.now(),
    manual: true,
  };
  AsyncStorage.setItem(MARKER_KEY, JSON.stringify(marker))
    .catch(() => {});
}

export async function getReadingMarker(): Promise<ReadingMarker | null> {
  try {
    const stored = await AsyncStorage.getItem(MARKER_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    if (
      parsed &&
      typeof parsed.savedAt === 'number' &&
      isValidReadingPosition(parsed)
    ) {
      return { ...parsed, manual: true } as ReadingMarker;
    }
    return null;
  } catch {
    return null;
  }
}

export function clearReadingMarker(): void {
  AsyncStorage.removeItem(MARKER_KEY).catch(() => {});
}

/**
 * Canonical "where to continue" position.
 * Precedence: manual marker first, then automatic last-read position.
 * Guaranteed to be in-bounds or null (callers fall back to Surah 1, Ayah 1).
 */
export async function getContinueReadingPosition(): Promise<ReadingPosition | null> {
  const marker = await getReadingMarker();
  if (marker) return marker;
  return getReadingPosition();
}
