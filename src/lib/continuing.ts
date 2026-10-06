import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'quran-last-reading';

export interface ReadingPosition {
  surah: number;
  ayah: number;
  savedAt: number;
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
      typeof parsed.surah === 'number' &&
      typeof parsed.ayah === 'number' &&
      typeof parsed.savedAt === 'number'
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