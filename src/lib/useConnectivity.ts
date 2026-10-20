import { useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';

const REACHABILITY_URL = 'https://api.islamic.app/v1/timings/today?latitude=25.2048&longitude=55.2708&method=16';
const POLL_INTERVAL_OFFLINE = 15000;
const POLL_INTERVAL_ONLINE = 60000;
const PROBE_TIMEOUT = 3000;

// Module-level singleton state shared across all components and libraries
let globalIsOnline = true;
let globalRefreshKey = 0;
let globalInFlightProbe: Promise<boolean> | null = null;
let pollTimer: ReturnType<typeof setTimeout> | null = null;
let probeAbortController: AbortController | null = null;
let appStateSubscription: { remove: () => void } | null = null;
let isAppActive = true;
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

function getSnapshot() {
  return {
    isOnline: globalIsOnline,
    refreshKey: globalRefreshKey,
  };
}

function notifyIfChanged(previous: ReturnType<typeof getSnapshot>) {
  if (
    previous.isOnline !== globalIsOnline
    || previous.refreshKey !== globalRefreshKey
  ) {
    notifyListeners();
  }
}

/** Synchronous connectivity check for data/background libraries (warmup, preloader, prayerTimes). */
export function isAppOnline(): boolean {
  return globalIsOnline;
}

export function subscribeConnectivity(listener: () => void): () => void {
  listeners.add(listener);
  if (listeners.size === 1) {
    startAppStateObservation();
    stopGlobalPoll();
    if (isAppActive) checkConnectivity().catch(() => {});
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      stopGlobalPoll();
      stopAppStateObservation();
    }
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
      const beforeResult = getSnapshot();
      const prevOnline = globalIsOnline;
      // Probe failure (timeout / HEAD not-ok) NEVER declares the app
      // offline — a cold-start probe can flake (network stack not warmed).
      // Only a confirmed reachable response proves online; otherwise we
      // stay optimistic and the OS-level offline listeners (NetInfo /
      // window 'offline') are the authoritative offline signal. This
      // prevents the first-open "offline" flash when the app is fine.
      if (online) {
        globalIsOnline = true;
      }

      if (online && !prevOnline) {
        globalRefreshKey++;
      }

      notifyIfChanged(beforeResult);
      scheduleNextGlobalPoll(online);
      return online;
    } finally {
      clearTimeout(timer!);
      globalInFlightProbe = null;
    }
  };

  globalInFlightProbe = exec();
  return globalInFlightProbe;
}

function scheduleNextGlobalPoll(online: boolean) {
  stopGlobalPoll();
  if (listeners.size === 0 || !isAppActive) return;
  const interval = online ? POLL_INTERVAL_ONLINE : POLL_INTERVAL_OFFLINE;
  pollTimer = setTimeout(() => {
    pollTimer = null;
    if (listeners.size === 0 || !isAppActive) return;
    checkConnectivity().catch(() => {});
  }, interval);
}

function stopGlobalPoll() {
  if (pollTimer !== null) clearTimeout(pollTimer);
  pollTimer = null;
}

function startAppStateObservation() {
  if (appStateSubscription || typeof AppState?.addEventListener !== 'function') return;
  isAppActive = !AppState.currentState || AppState.currentState === 'active';
  appStateSubscription = AppState.addEventListener('change', (nextState) => {
    const nextIsActive = nextState === 'active';
    if (nextIsActive === isAppActive) return;
    isAppActive = nextIsActive;
    if (!isAppActive) {
      stopGlobalPoll();
    } else if (listeners.size > 0) {
      checkConnectivity().catch(() => {});
    }
  });
}

function stopAppStateObservation() {
  appStateSubscription?.remove();
  appStateSubscription = null;
  isAppActive = true;
}

// Initial probe setup
if (Platform.OS === 'web') {
  if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
      const previous = getSnapshot();
      globalIsOnline = true;
      if (!previous.isOnline) globalRefreshKey++;
      notifyIfChanged(previous);
      scheduleNextGlobalPoll(true);
    });
    window.addEventListener('offline', () => {
      const previous = getSnapshot();
      globalIsOnline = false;
      notifyIfChanged(previous);
      scheduleNextGlobalPoll(false);
    });
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      globalIsOnline = false;
    }
  }
}

// Start initial probe immediately
checkConnectivity().catch(() => {});

export function useConnectivity(): { isOnline: boolean; refreshKey: number } {
  const [, setTick] = useState(0);

  useEffect(() => {
    return subscribeConnectivity(() => {
      setTick((t) => t + 1);
    });
  }, []);

  return {
    isOnline: globalIsOnline,
    refreshKey: globalRefreshKey,
  };
}
