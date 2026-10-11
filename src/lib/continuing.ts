import AsyncStorage from '@react-native-async-storage/async-storage';
import { SURAH_AYAH_COUNTS } from './surahAyahCounts';
import { getMushafPageForAyah } from './quran';

const STORAGE_KEY = 'quran-last-reading';
const MARKER_KEY = 'quran-reading-marker';

export interface ReadingPosition {
  surah: number;
  ayah: number;
  page: number;
  savedAt: number;
}

export interface ReadingMarker extends ReadingPosition {
  /** True when the user explicitly set this marker (manual). */
  manual: true;
}

/** Validate a stored position against the Quran's real bounds (1-114 surahs, per-surah ayah count). */
export function isValidReadingPosition(pos: { surah: number; ayah: number; page?: number }): boolean {
  const surah = pos?.surah;
  const ayah = pos?.ayah;
  if (typeof surah !== 'number' || typeof ayah !== 'number') return false;
  if (surah < 1 || surah > 114) return false;
  const maxAyah = SURAH_AYAH_COUNTS[surah - 1];
  if (typeof maxAyah !== 'number') return false;
  if (pos.page !== undefined) {
    if (typeof pos.page !== 'number' || pos.page < 1 || pos.page > 604) return false;
  }
  return ayah >= 1 && ayah <= maxAyah;
}

type ReadingPositionListener = () => void;
const listeners = new Set<ReadingPositionListener>();

export function addReadingPositionListener(listener: ReadingPositionListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notifyPositionListeners(): void {
  listeners.forEach((fn) => {
    try {
      fn();
    } catch {}
  });
}

let inMemoryMarker: ReadingMarker | null | undefined = undefined;
let inMemoryPosition: ReadingPosition | null | undefined = undefined;

export function getReadingMarkerSync(): ReadingMarker | null {
  if (inMemoryMarker !== undefined) return inMemoryMarker;
  if (typeof localStorage !== 'undefined') {
    try {
      const stored = localStorage.getItem(MARKER_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed.savedAt === 'number' && isValidReadingPosition(parsed)) {
          const page =
            typeof parsed.page === 'number' && parsed.page >= 1 && parsed.page <= 604
              ? parsed.page
              : getMushafPageForAyah(parsed.surah, parsed.ayah);
          const marker = { ...parsed, page, manual: true } as ReadingMarker;
          inMemoryMarker = marker;
          return marker;
        }
      }
    } catch {}
  }
  return null;
}

export function getReadingPositionSync(): ReadingPosition | null {
  if (inMemoryPosition !== undefined) return inMemoryPosition;
  if (typeof localStorage !== 'undefined') {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed.savedAt === 'number' && isValidReadingPosition(parsed)) {
          const page =
            typeof parsed.page === 'number' && parsed.page >= 1 && parsed.page <= 604
              ? parsed.page
              : getMushafPageForAyah(parsed.surah, parsed.ayah);
          const pos: ReadingPosition = { ...parsed, page };
          inMemoryPosition = pos;
          return pos;
        }
      }
    } catch {}
  }
  return null;
}

export function _resetReadingMemoryStateForTest(): void {
  inMemoryMarker = undefined;
  inMemoryPosition = undefined;
  listeners.clear();
}

export async function saveReadingPosition(surah: number, ayah: number, page?: number): Promise<boolean> {
  const resolvedPage =
    typeof page === 'number' && page >= 1 && page <= 604
      ? page
      : getMushafPageForAyah(surah, ayah);
  if (!isValidReadingPosition({ surah, ayah, page: resolvedPage })) return false;
  const position: ReadingPosition = {
    surah,
    ayah,
    page: resolvedPage,
    savedAt: Date.now(),
  };
  inMemoryPosition = position;
  notifyPositionListeners();
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(position));
    return true;
  } catch {
    return false;
  }
}

export async function getReadingPosition(): Promise<ReadingPosition | null> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (!stored) {
      if (inMemoryPosition === undefined) inMemoryPosition = null;
      return inMemoryPosition ?? null;
    }
    const parsed = JSON.parse(stored);
    if (
      parsed &&
      typeof parsed.savedAt === 'number' &&
      isValidReadingPosition(parsed)
    ) {
      const page =
        typeof parsed.page === 'number' && parsed.page >= 1 && parsed.page <= 604
          ? parsed.page
          : getMushafPageForAyah(parsed.surah, parsed.ayah);
      const pos: ReadingPosition = {
        ...parsed,
        page,
      };
      if (!inMemoryPosition || inMemoryPosition.savedAt <= pos.savedAt) {
        inMemoryPosition = pos;
      }
      return inMemoryPosition;
    }
    return inMemoryPosition ?? null;
  } catch {
    return inMemoryPosition ?? null;
  }
}

export async function clearReadingPosition(): Promise<boolean> {
  inMemoryPosition = null;
  notifyPositionListeners();
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}

/**
 * Manual reading marker — the user explicitly says "this is where I stopped".
 * Exactly one active marker; setting a new one replaces the old.
 */
export async function saveReadingMarker(surah: number, ayah: number, page?: number): Promise<boolean> {
  const resolvedPage =
    typeof page === 'number' && page >= 1 && page <= 604
      ? page
      : getMushafPageForAyah(surah, ayah);
  if (!isValidReadingPosition({ surah, ayah, page: resolvedPage })) return false;
  const marker: ReadingMarker = {
    surah,
    ayah,
    page: resolvedPage,
    savedAt: Date.now(),
    manual: true,
  };
  inMemoryMarker = marker;
  notifyPositionListeners();
  try {
    await AsyncStorage.setItem(MARKER_KEY, JSON.stringify(marker));
    return true;
  } catch {
    // If storage write fails (e.g. disk full), optimistic inMemoryMarker is retained
    return false;
  }
}

export async function getReadingMarker(): Promise<ReadingMarker | null> {
  try {
    const stored = await AsyncStorage.getItem(MARKER_KEY);
    if (!stored) {
      if (inMemoryMarker === undefined) inMemoryMarker = null;
      return inMemoryMarker ?? null;
    }
    const parsed = JSON.parse(stored);
    if (
      parsed &&
      typeof parsed.savedAt === 'number' &&
      isValidReadingPosition(parsed)
    ) {
      const page =
        typeof parsed.page === 'number' && parsed.page >= 1 && parsed.page <= 604
          ? parsed.page
          : getMushafPageForAyah(parsed.surah, parsed.ayah);
      const marker = { ...parsed, page, manual: true } as ReadingMarker;
      if (!inMemoryMarker || inMemoryMarker.savedAt <= marker.savedAt) {
        inMemoryMarker = marker;
      }
      return inMemoryMarker;
    }
    return inMemoryMarker ?? null;
  } catch {
    return inMemoryMarker ?? null;
  }
}

export async function clearReadingMarker(): Promise<boolean> {
  inMemoryMarker = null;
  notifyPositionListeners();
  try {
    await AsyncStorage.removeItem(MARKER_KEY);
    return true;
  } catch {
    return false;
  }
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
