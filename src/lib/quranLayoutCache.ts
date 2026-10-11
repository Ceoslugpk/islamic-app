export interface QuranLayoutStorageAdapter {
  loadQuranCache: <T>(key: string) => T | null;
  saveQuranCache: (key: string, data: any) => void;
}

let activeStorageAdapter: QuranLayoutStorageAdapter | null = null;

export function configureQuranLayoutStorage(adapter: QuranLayoutStorageAdapter): void {
  activeStorageAdapter = adapter;
}

export interface QuranLayoutCacheKeyParams {
  surah: number;
  readingMode: string;
  fontSize: number;
  translationEdition: string;
  appLanguage: string;
}

export interface AyahLayoutRecord {
  headerHeight: number;
  heights: Record<number, number>;
  updatedAt: number;
}

/**
 * Builds a deterministic layout cache key that includes all layout-affecting dimensions:
 * surah, reading mode, font size, translation edition, and app language.
 * Stale dimensions across language, font size, or edition changes are never reused.
 */
export function getQuranLayoutCacheKey(
  surahOrParams: number | QuranLayoutCacheKeyParams,
  readingMode?: string,
  fontSize?: number,
  translationEdition?: string,
  appLanguage?: string
): string {
  if (typeof surahOrParams === 'object') {
    const { surah, readingMode: mode, fontSize: size, translationEdition: edition, appLanguage: lang } = surahOrParams;
    return `quran-layout:${surah}:${mode}:${size}:${edition || 'default'}:${lang || 'en'}`;
  }
  return `quran-layout:${surahOrParams}:${readingMode || 'cards'}:${fontSize || 28}:${translationEdition || 'default'}:${appLanguage || 'en'}`;
}

// In-memory cache for fast zero-latency frame access
const layoutMemoryCache = new Map<string, AyahLayoutRecord>();
const pendingSaveTimers = new Map<string, ReturnType<typeof setTimeout>>();

export function getAyahLayoutCache(cacheKey: string): AyahLayoutRecord {
  const inMemory = layoutMemoryCache.get(cacheKey);
  if (inMemory) return inMemory;

  if (activeStorageAdapter) {
    try {
      const persisted = activeStorageAdapter.loadQuranCache<AyahLayoutRecord>(cacheKey);
      if (persisted && typeof persisted === 'object' && persisted.heights) {
        const record: AyahLayoutRecord = {
          headerHeight: typeof persisted.headerHeight === 'number' ? persisted.headerHeight : 0,
          heights: { ...persisted.heights },
          updatedAt: persisted.updatedAt || Date.now(),
        };
        layoutMemoryCache.set(cacheKey, record);
        return record;
      }
    } catch {}
  }

  const defaultRecord: AyahLayoutRecord = {
    headerHeight: 0,
    heights: {},
    updatedAt: 0,
  };
  layoutMemoryCache.set(cacheKey, defaultRecord);
  return defaultRecord;
}

function scheduleCachePersist(cacheKey: string, record: AyahLayoutRecord): void {
  const existingTimer = pendingSaveTimers.get(cacheKey);
  if (existingTimer) clearTimeout(existingTimer);

  const timer = setTimeout(() => {
    pendingSaveTimers.delete(cacheKey);
    if (activeStorageAdapter) {
      try {
        activeStorageAdapter.saveQuranCache(cacheKey, record);
      } catch {}
    }
  }, 600);
  pendingSaveTimers.set(cacheKey, timer);
}

export function recordAyahLayout(cacheKey: string, ayahNumber: number, height: number): void {
  if (!cacheKey || !ayahNumber || ayahNumber < 1 || !height || height <= 0) return;
  const roundedHeight = Math.round(height);
  const record = getAyahLayoutCache(cacheKey);

  if (record.heights[ayahNumber] === roundedHeight) return;

  record.heights[ayahNumber] = roundedHeight;
  record.updatedAt = Date.now();
  scheduleCachePersist(cacheKey, record);
}

export function recordHeaderLayout(cacheKey: string, height: number): void {
  if (!cacheKey || !height || height <= 0) return;
  const roundedHeight = Math.round(height);
  const record = getAyahLayoutCache(cacheKey);

  if (record.headerHeight === roundedHeight) return;

  record.headerHeight = roundedHeight;
  record.updatedAt = Date.now();
  scheduleCachePersist(cacheKey, record);
}

export function flushAyahLayoutCache(cacheKey?: string): void {
  if (cacheKey) {
    const timer = pendingSaveTimers.get(cacheKey);
    if (timer) {
      clearTimeout(timer);
      pendingSaveTimers.delete(cacheKey);
    }
    const record = layoutMemoryCache.get(cacheKey);
    if (record && activeStorageAdapter) {
      try {
        activeStorageAdapter.saveQuranCache(cacheKey, record);
      } catch {}
    }
  } else {
    for (const [key, timer] of pendingSaveTimers.entries()) {
      clearTimeout(timer);
      const record = layoutMemoryCache.get(key);
      if (record && activeStorageAdapter) {
        try {
          activeStorageAdapter.saveQuranCache(key, record);
        } catch {}
      }
    }
    pendingSaveTimers.clear();
  }
}

export function clearAyahLayoutMemoryCache(): void {
  for (const timer of pendingSaveTimers.values()) {
    clearTimeout(timer);
  }
  pendingSaveTimers.clear();
  layoutMemoryCache.clear();
}

export interface CachedOrEstimatedOffsetResult {
  offset: number;
  isExact: boolean;
  measuredAyahsCount: number;
  averageAyahHeight: number;
}

/**
 * Calculates a direct jump offset for a target ayah:
 * Uses measured header + measured ayah heights when available in cache.
 * For unmeasured ayahs, estimates using the measured average (or fallback average).
 */
export function getCachedOrEstimatedOffset(
  cacheKey: string,
  targetAyah: number,
  fallbackAverageItemLength?: number
): CachedOrEstimatedOffsetResult {
  if (targetAyah <= 1) {
    return {
      offset: 0,
      isExact: true,
      measuredAyahsCount: 0,
      averageAyahHeight: fallbackAverageItemLength || 180,
    };
  }

  const record = getAyahLayoutCache(cacheKey);
  const measuredHeights = Object.values(record.heights).filter((h) => typeof h === 'number' && h > 0);
  const averageAyahHeight =
    measuredHeights.length > 0
      ? measuredHeights.reduce((a, b) => a + b, 0) / measuredHeights.length
      : fallbackAverageItemLength && fallbackAverageItemLength > 0
      ? fallbackAverageItemLength
      : 180;

  const header = record.headerHeight > 0 ? record.headerHeight : 0;
  let totalOffset = header;
  let isExact = record.headerHeight > 0;
  let measuredAyahsCount = 0;

  for (let i = 1; i < targetAyah; i++) {
    const h = record.heights[i];
    if (typeof h === 'number' && h > 0) {
      totalOffset += h;
      measuredAyahsCount++;
    } else {
      totalOffset += averageAyahHeight;
      isExact = false;
    }
  }

  return {
    offset: Math.round(totalOffset),
    isExact,
    measuredAyahsCount,
    averageAyahHeight: Math.round(averageAyahHeight),
  };
}
