import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'quran-recent-surahs';
const MAX_ENTRIES = 10;

export interface RecentSurah {
  surah: number;
  name: string;
  arabicName: string;
  lastReadAt: number;
}

export async function recordSurahVisit(
  surah: number,
  name: string,
  arabicName: string
): Promise<void> {
  try {
    const existing = await getRecentSurahs();
    const now = Date.now();
    const filtered = existing.filter((s) => s.surah !== surah);
    const updated: RecentSurah[] = [
      { surah, name, arabicName, lastReadAt: now },
      ...filtered,
    ].slice(0, MAX_ENTRIES);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // ignore storage errors
  }
}

export async function getRecentSurahs(limit = MAX_ENTRIES): Promise<RecentSurah[]> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    const valid = parsed.filter(
      (item): item is RecentSurah =>
        item &&
        typeof item.surah === 'number' &&
        typeof item.name === 'string' &&
        typeof item.arabicName === 'string' &&
        typeof item.lastReadAt === 'number'
    );
    return valid.slice(0, limit);
  } catch {
    return [];
  }
}

export async function clearRecentSurahs(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore storage errors
  }
}