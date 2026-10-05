import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { loadQuranCache, saveQuranCache } from './db';
import { getSurahAudioUrl, getSurahBitrate } from './quranAudio';

export interface DownloadedSurahMeta {
  edition: string;
  surah: number;
  bitrate: string;
  size: number;
  date: number;
  localUri: string;
  surahName?: string;
  surahEnglishName?: string;
}

const CACHE_KEY_PREFIX = 'quran-audio';
const DOWNLOADS_STORE_KEY = 'quran-audio-downloads';

export function getSurahCacheKey(
  edition: string,
  surah: number,
  bitrateInput?: string | number
): string {
  const bitrate = String(bitrateInput || getSurahBitrate(edition) || '128');
  return `${CACHE_KEY_PREFIX}:${edition}:${surah}:${bitrate}`;
}

let memStore: Record<string, DownloadedSurahMeta> | null = null;
const webBlobStore = new Map<string, string>();
const activeDownloads = new Map<
  string,
  {
    progress: number;
    task?: any;
    promise?: Promise<DownloadedSurahMeta>;
  }
>();

type DownloadListener = () => void;
const listeners = new Set<DownloadListener>();

export function addDownloadsListener(listener: DownloadListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notifyListeners() {
  for (const listener of Array.from(listeners)) {
    try {
      listener();
    } catch {}
  }
}

function getStore(): Record<string, DownloadedSurahMeta> {
  if (memStore) return memStore;
  const loaded = loadQuranCache<Record<string, DownloadedSurahMeta>>(DOWNLOADS_STORE_KEY);
  memStore = loaded && typeof loaded === 'object' ? loaded : {};
  return memStore;
}

function updateStore(store: Record<string, DownloadedSurahMeta>) {
  memStore = { ...store };
  saveQuranCache(DOWNLOADS_STORE_KEY, memStore);
}

/** Check if a specific surah is downloaded for the given reciter/edition and bitrate */
export function isSurahDownloaded(
  edition: string,
  surah: number,
  bitrateInput?: string | number
): boolean {
  const key = getSurahCacheKey(edition, surah, bitrateInput);
  const store = getStore();
  const meta = store[key];
  if (!meta || !meta.localUri) return false;
  return true;
}

/** Get download progress percentage (0 - 100) or null if not currently downloading */
export function getDownloadProgress(
  edition: string,
  surah: number,
  bitrateInput?: string | number
): number | null {
  const key = getSurahCacheKey(edition, surah, bitrateInput);
  const active = activeDownloads.get(key);
  return active ? active.progress : null;
}

/** Get all currently saved download metadata objects */
export function getDownloadedSurahs(): DownloadedSurahMeta[] {
  const store = getStore();
  return Object.values(store).sort((a, b) => a.surah - b.surah);
}

/** Get sum of file sizes for all downloaded surahs in bytes */
export function getTotalStorageUsed(): number {
  const surahs = getDownloadedSurahs();
  return surahs.reduce((sum, item) => sum + (item.size || 0), 0);
}

/**
 * Resolves local file URI if downloaded, otherwise returns network fallback URL.
 * Automatically makes offline playback seamless.
 */
export function resolveAudioUri(
  edition: string,
  surah: number,
  bitrateInput?: string | number,
  fallbackUrl?: string
): string {
  const bitrate = String(bitrateInput || getSurahBitrate(edition) || '128');
  const key = getSurahCacheKey(edition, surah, bitrate);
  const store = getStore();
  const meta = store[key];

  if (meta && meta.localUri) {
    if (Platform.OS === 'web') {
      const blobUrl = webBlobStore.get(key);
      if (blobUrl) return blobUrl;
      // If web page was refreshed, blob in memory is lost, fallback to remote
      return fallbackUrl || getSurahAudioUrl(edition, surah);
    }
    return meta.localUri;
  }

  return fallbackUrl || getSurahAudioUrl(edition, surah);
}

/**
 * Downloads full surah audio and stores metadata symmetrically.
 * Uses FileSystem on Native and fetch + Blob on Web.
 */
export async function downloadSurah(
  edition: string,
  surah: number,
  bitrateInput?: string | number,
  metaExtra?: { surahName?: string; surahEnglishName?: string },
  onProgress?: (percent: number, written: number, total: number) => void
): Promise<DownloadedSurahMeta> {
  const bitrate = String(bitrateInput || getSurahBitrate(edition) || '128');
  const key = getSurahCacheKey(edition, surah, bitrate);
  const store = getStore();

  // If already downloaded and file exists, return existing
  if (store[key] && store[key].localUri) {
    return store[key];
  }

  // If already downloading, wait for the existing download
  const existingActive = activeDownloads.get(key);
  if (existingActive?.promise) {
    return existingActive.promise;
  }

  const remoteUrl = getSurahAudioUrl(edition, surah);

  const downloadPromise = (async () => {
    activeDownloads.set(key, { progress: 0 });
    notifyListeners();

    try {
      if (Platform.OS === 'web' || !FileSystem.documentDirectory) {
        // Web execution: stream / fetch blob.
        // Bounded watchdog: an unbounded fetch or stream never settles, which would
        // leave QuranReader's download spinner stuck forever. Abort on timeout.
        // ponytail: generous 60s since a full-surah MP3 can legitimately take a while.
        const DOWNLOAD_TIMEOUT_MS = 60000;
        const controller = new AbortController();
        const watchdog = setTimeout(() => {
          try {
            controller.abort();
          } catch {}
        }, DOWNLOAD_TIMEOUT_MS);
        try {
        const response = await fetch(remoteUrl, { signal: controller.signal });
        if (!response.ok) {
          throw new Error(`Failed to fetch surah audio: HTTP ${response.status}`);
        }

        const contentLength = Number(response.headers.get('content-length')) || 0;
        let blob: Blob;

        if (response.body && response.body.getReader) {
          const reader = response.body.getReader();
          const chunks: Uint8Array[] = [];
          let received = 0;

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (value) {
              chunks.push(value);
              received += value.length;
              const percent =
                contentLength > 0 ? Math.min(100, Math.round((received / contentLength) * 100)) : 0;
              activeDownloads.set(key, { progress: percent });
              notifyListeners();
              onProgress?.(percent, received, contentLength);
            }
          }
          blob = new Blob(chunks as unknown as BlobPart[], { type: 'audio/mpeg' });
        } else {
          blob = await response.blob();
        }

        const blobUrl = URL.createObjectURL(blob);
        webBlobStore.set(key, blobUrl);

        const meta: DownloadedSurahMeta = {
          edition,
          surah,
          bitrate,
          size: blob.size || contentLength || 0,
          date: Date.now(),
          localUri: blobUrl,
          surahName: metaExtra?.surahName,
          surahEnglishName: metaExtra?.surahEnglishName,
        };

        const updated = getStore();
        updated[key] = meta;
        updateStore(updated);
        return meta;
        } finally {
          clearTimeout(watchdog);
        }
      } else {
        // Native execution (iOS / Android): FileSystem download to documentDirectory
        const dir = `${FileSystem.documentDirectory}quran-audio/`;
        await FileSystem.makeDirectoryAsync(dir, { intermediates: true }).catch(() => {});

        const safeEdition = edition.replace(/[^a-zA-Z0-9._-]/g, '_');
        const localPath = `${dir}${safeEdition}_${surah}_${bitrate}.mp3`;

        const downloadResumable = FileSystem.createDownloadResumable(
          remoteUrl,
          localPath,
          {},
          (data: FileSystem.DownloadProgressData) => {
            const total = data.totalBytesExpectedToWrite;
            const written = data.totalBytesWritten;
            const percent = total > 0 ? Math.min(100, Math.round((written / total) * 100)) : 0;
            activeDownloads.set(key, { progress: percent, task: downloadResumable });
            notifyListeners();
            onProgress?.(percent, written, total);
          }
        );

        activeDownloads.set(key, { progress: 0, task: downloadResumable });

        const result = await downloadResumable.downloadAsync();
        if (!result || !result.uri) {
          throw new Error('Download completed without valid local URI');
        }

        let fileSize = 0;
        try {
          const info = await FileSystem.getInfoAsync(result.uri);
          if (info.exists && 'size' in info && typeof info.size === 'number') {
            fileSize = info.size;
          }
        } catch {}

        const meta: DownloadedSurahMeta = {
          edition,
          surah,
          bitrate,
          size: fileSize,
          date: Date.now(),
          localUri: result.uri,
          surahName: metaExtra?.surahName,
          surahEnglishName: metaExtra?.surahEnglishName,
        };

        const updated = getStore();
        updated[key] = meta;
        updateStore(updated);
        return meta;
      }
    } finally {
      activeDownloads.delete(key);
      notifyListeners();
    }
  })();

  const activeEntry = activeDownloads.get(key);
  if (activeEntry) {
    activeEntry.promise = downloadPromise;
  }

  return downloadPromise;
}

/** Remove single surah download */
export async function removeSurahDownload(
  edition: string,
  surah: number,
  bitrateInput?: string | number
): Promise<void> {
  const bitrate = String(bitrateInput || getSurahBitrate(edition) || '128');
  const key = getSurahCacheKey(edition, surah, bitrate);
  const store = getStore();
  const meta = store[key];

  if (!meta) return;

  if (Platform.OS === 'web') {
    const blobUrl = webBlobStore.get(key);
    if (blobUrl) {
      try {
        URL.revokeObjectURL(blobUrl);
      } catch {}
      webBlobStore.delete(key);
    }
  } else if (meta.localUri) {
    try {
      await FileSystem.deleteAsync(meta.localUri, { idempotent: true });
    } catch {}
  }

  delete store[key];
  updateStore(store);
  notifyListeners();
}

/** Clear all downloaded surahs and free storage */
export async function clearAllDownloads(): Promise<void> {
  const store = getStore();
  const items = Object.values(store);

  for (const item of items) {
    if (Platform.OS === 'web') {
      const key = getSurahCacheKey(item.edition, item.surah, item.bitrate);
      const blobUrl = webBlobStore.get(key);
      if (blobUrl) {
        try {
          URL.revokeObjectURL(blobUrl);
        } catch {}
        webBlobStore.delete(key);
      }
    } else if (item.localUri) {
      try {
        await FileSystem.deleteAsync(item.localUri, { idempotent: true });
      } catch {}
    }
  }

  if (Platform.OS !== 'web' && FileSystem.documentDirectory) {
    const dir = `${FileSystem.documentDirectory}quran-audio/`;
    try {
      await FileSystem.deleteAsync(dir, { idempotent: true });
    } catch {}
  }

  updateStore({});
  notifyListeners();
}

/** React hook for components to subscribe to downloads changes */
export function useSurahDownloads(): {
  downloadedSurahs: DownloadedSurahMeta[];
  totalStorageUsed: number;
  isDownloaded: (edition: string, surah: number, bitrate?: string | number) => boolean;
  getProgress: (edition: string, surah: number, bitrate?: string | number) => number | null;
} {
  const [, setTick] = useState(0);

  useEffect(() => {
    return addDownloadsListener(() => {
      setTick((t) => t + 1);
    });
  }, []);

  return {
    downloadedSurahs: getDownloadedSurahs(),
    totalStorageUsed: getTotalStorageUsed(),
    isDownloaded: isSurahDownloaded,
    getProgress: getDownloadProgress,
  };
}

export function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const val = bytes / Math.pow(1024, i);
  return `${val.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}
