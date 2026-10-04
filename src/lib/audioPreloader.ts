import { AudioPlayer, createAudioPlayer, preload } from 'expo-audio';

export interface PreloadCacheEntry {
  player: AudioPlayer;
  url: string;
  lastAccessedAt: number;
}

export interface AudioPreloadStats {
  cachedCount: number;
  inFlightCount: number;
  pendingCount: number;
  cachedUrls: string[];
}

const MAX_CACHE_SIZE = 6;
const MAX_CONCURRENT_PRELOADS = 2;
const IN_FLIGHT_TIMEOUT_MS = 3000;

// LRU Cache of loaded AudioPlayer objects keyed by audio URL
const cache = new Map<string, PreloadCacheEntry>();

// Active in-flight preload promises
const inFlight = new Map<string, Promise<AudioPlayer | null>>();

// Queue of URLs waiting to be preloaded
let pendingQueue: string[] = [];

// Worker state
let activeWorkers = 0;
let isPaused = false;
let isStopped = false;

/**
 * Take a preloaded sound for the given URL.
 * If present in the LRU cache, it is removed from the cache and returned immediately.
 * If currently downloading in-flight, it awaits the in-flight download (up to 3000ms).
 * Returns null if not preloaded or if loading failed.
 */
export async function takePreloadedSound(url: string): Promise<AudioPlayer | null> {
  // Remove from pending queue if it hasn't started yet
  pendingQueue = pendingQueue.filter((u) => u !== url);

  // 1. Direct hit in LRU cache
  const cached = cache.get(url);
  if (cached) {
    cache.delete(url);
    return cached.player;
  }

  // 2. Currently downloading in-flight
  const inFlightPromise = inFlight.get(url);
  if (inFlightPromise) {
    try {
      const timeoutPromise = new Promise<null>((resolve) =>
        setTimeout(() => resolve(null), IN_FLIGHT_TIMEOUT_MS)
      );
      const player = await Promise.race([inFlightPromise, timeoutPromise]);
      if (player) {
        cache.delete(url);
        return player;
      }
    } catch {
      return null;
    }
  }

  return null;
}

/**
 * Check if a URL is currently cached and ready for instant playback.
 */
export function hasPreloadedSound(url: string): boolean {
  return cache.has(url);
}

/**
 * Enqueue a list of upcoming URLs to be preloaded.
 * Any cached URLs that are NOT in the incoming URLs list are unloaded
 * and evicted to immediately free audio decoder resources.
 */
export function enqueuePreloadUrls(urls: string[]): void {
  if (isStopped) {
    isStopped = false;
  }

  // Deduplicate and filter out empty strings
  const targetUrls = Array.from(new Set(urls.filter(Boolean)));
  if (targetUrls.length === 0) return;

  // Prune cache entries that are no longer in the upcoming list
  const targetSet = new Set(targetUrls);
  for (const [cachedUrl, entry] of cache.entries()) {
    if (!targetSet.has(cachedUrl)) {
      cache.delete(cachedUrl);
      try {
        entry.player.remove();
      } catch {}
    }
  }

  // Update lastAccessedAt for existing cached entries to preserve them in LRU
  for (const url of targetUrls) {
    const existing = cache.get(url);
    if (existing) {
      existing.lastAccessedAt = Date.now();
    }
  }

  // Build the new pending queue (URLs not already cached and not currently in-flight)
  pendingQueue = targetUrls.filter((url) => !cache.has(url) && !inFlight.has(url));

  // Dispatch workers up to MAX_CONCURRENT_PRELOADS
  pumpPreloadQueue();
}

function pumpPreloadQueue(): void {
  if (isPaused || isStopped) return;
  while (activeWorkers < MAX_CONCURRENT_PRELOADS && pendingQueue.length > 0) {
    runWorker();
  }
}

async function runWorker(): Promise<void> {
  activeWorkers++;
  try {
    while (!isPaused && !isStopped && pendingQueue.length > 0) {
      const url = pendingQueue.shift();
      if (!url) break;
      if (cache.has(url) || inFlight.has(url)) continue;

      const preloadPromise = (async () => {
        try {
          // Warm native buffer
          preload({ uri: url }).catch(() => {});

          const player = createAudioPlayer({ uri: url }, { updateInterval: 250 });
          player.volume = 1.0;

          if (isStopped) {
            try {
              player.remove();
            } catch {}
            return null;
          }

          // LRU eviction if cache exceeds max capacity
          if (cache.size >= MAX_CACHE_SIZE) {
            let oldestKey: string | null = null;
            let oldestTime = Infinity;
            for (const [k, v] of cache.entries()) {
              if (v.lastAccessedAt < oldestTime) {
                oldestTime = v.lastAccessedAt;
                oldestKey = k;
              }
            }
            if (oldestKey) {
              const evicted = cache.get(oldestKey);
              cache.delete(oldestKey);
              if (evicted) {
                try {
                  evicted.player.remove();
                } catch {}
              }
            }
          }

          cache.set(url, {
            player,
            url,
            lastAccessedAt: Date.now(),
          });
          return player;
        } catch {
          // Preload network or decoding error — silent fallback to on-demand playback
          return null;
        }
      })();

      inFlight.set(url, preloadPromise);
      try {
        await preloadPromise;
      } finally {
        inFlight.delete(url);
      }
    }
  } finally {
    activeWorkers--;
  }
}

/**
 * Pause preloading (e.g. when user pauses playback).
 */
export function pauseAudioPreloading(): void {
  isPaused = true;
}

/**
 * Resume preloading (e.g. when user resumes playback).
 */
export function resumeAudioPreloading(): void {
  if (isPaused) {
    isPaused = false;
    pumpPreloadQueue();
  }
}

/**
 * Stop preloading and clear all cached/pending audio resources.
 */
export async function stopAudioPreloading(): Promise<void> {
  isStopped = true;
  isPaused = false;
  pendingQueue = [];

  const entries = Array.from(cache.values());
  cache.clear();
  for (const entry of entries) {
    try {
      entry.player.remove();
    } catch {}
  }
}

/**
 * Clear the LRU audio cache without changing pause/stop state.
 */
export async function clearAudioPreloadCache(): Promise<void> {
  pendingQueue = [];
  const entries = Array.from(cache.values());
  cache.clear();
  for (const entry of entries) {
    try {
      entry.player.remove();
    } catch {}
  }
}

/**
 * Get current stats of the audio preloader for diagnostics.
 */
export function getAudioPreloadStats(): AudioPreloadStats {
  return {
    cachedCount: cache.size,
    inFlightCount: inFlight.size,
    pendingCount: pendingQueue.length,
    cachedUrls: Array.from(cache.keys()),
  };
}
