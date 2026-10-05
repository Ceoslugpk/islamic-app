import { useEffect, useRef, useState, useCallback } from 'react';
import { Platform } from 'react-native';

const REACHABILITY_URL = 'https://api.islamic.app/v1/timings/today?latitude=25.2048&longitude=55.2708&method=8';
const POLL_INTERVAL_OFFLINE = 15000;
const POLL_INTERVAL_ONLINE = 60000;
const PROBE_TIMEOUT = 3000;

// Module-level singleton state shared across all components and libraries
let globalIsOnline = true;
let globalIsChecking = false;
let globalRefreshKey = 0;
let globalInFlightProbe: Promise<boolean> | null = null;
let pollTimer: ReturnType<typeof setTimeout> | null = null;
let probeAbortController: AbortController | null = null;
const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // non-fatal
    }
  });
}

/** Synchronous connectivity check for data/background libraries (warmup, preloader, prayerTimes). */
export function isAppOnline(): boolean {
  return globalIsOnline;
}

export function subscribeConnectivity(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export async function checkConnectivity(): Promise<boolean> {
  if (globalInFlightProbe) {
    return globalInFlightProbe;
  }

  if (probeAbortController) {
    try { probeAbortController.abort(); } catch {}
  }
  const controller = new AbortController();
  probeAbortController = controller;

  globalIsChecking = true;
  notifyListeners();

  const exec = async (): Promise<boolean> => {
    let timer: ReturnType<typeof setTimeout>;
    try {
      const timeoutPromise = new Promise<boolean>((resolve) => {
        timer = setTimeout(() => {
          try { controller.abort(); } catch {}
          resolve(false);
        }, PROBE_TIMEOUT);
      });

      const fetchPromise = fetch(REACHABILITY_URL, {
        method: 'HEAD',
        signal: controller.signal,
        cache: 'no-store',
      })
        .then((res) => res.ok)
        .catch(() => false);

      const online = await Promise.race([fetchPromise, timeoutPromise]);
      const prevOnline = globalIsOnline;
      globalIsOnline = online;
      globalIsChecking = false;

      if (online && !prevOnline) {
        globalRefreshKey++;
      }

      notifyListeners();
      scheduleNextGlobalPoll(online);
      return online;
    } finally {
      clearTimeout(timer!);
      globalIsChecking = false;
      globalInFlightProbe = null;
    }
  };

  globalInFlightProbe = exec();
  return globalInFlightProbe;
}

function scheduleNextGlobalPoll(online: boolean) {
  if (pollTimer) clearTimeout(pollTimer);
  const interval = online ? POLL_INTERVAL_ONLINE : POLL_INTERVAL_OFFLINE;
  pollTimer = setTimeout(() => {
    checkConnectivity().catch(() => {});
  }, interval);
}

// Initial probe setup
if (Platform.OS === 'web') {
  if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
      globalIsOnline = true;
      globalRefreshKey++;
      notifyListeners();
      scheduleNextGlobalPoll(true);
    });
    window.addEventListener('offline', () => {
      globalIsOnline = false;
      notifyListeners();
      scheduleNextGlobalPoll(false);
    });
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      globalIsOnline = false;
    }
  }
}

// Start initial probe immediately
checkConnectivity().catch(() => {});

export function useConnectivity(): { isOnline: boolean; isChecking: boolean; refreshKey: number } {
  const [, setTick] = useState(0);

  useEffect(() => {
    return subscribeConnectivity(() => {
      setTick((t) => t + 1);
    });
  }, []);

  return {
    isOnline: globalIsOnline,
    isChecking: globalIsChecking,
    refreshKey: globalRefreshKey,
  };
}