import { useEffect, useRef, useState, useCallback } from 'react';
import { Platform } from 'react-native';

const REACHABILITY_URL = 'https://api.islamic.app/v1/timings/today?latitude=25.2048&longitude=55.2708&method=8';
const POLL_INTERVAL_OFFLINE = 15000;
const POLL_INTERVAL_ONLINE = 60000;
const PROBE_TIMEOUT = 5000;

export function useConnectivity(): { isOnline: boolean; isChecking: boolean; refreshKey: number } {
  const [isOnline, setIsOnline] = useState(true);
  const [isChecking, setIsChecking] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);
  const lastKnownOnlineRef = useRef(true);

  const probe = useCallback(async (): Promise<boolean> => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch(REACHABILITY_URL, {
        method: 'HEAD',
        signal: controller.signal,
        cache: 'no-store',
      });
      return res.ok;
    } catch {
      return false;
    }
  }, []);

  const checkAndUpdate = useCallback(async () => {
    if (!mountedRef.current) return;
    setIsChecking(true);
    const online = await probe();
    if (!mountedRef.current) return;
    setIsChecking(false);

    if (online !== lastKnownOnlineRef.current) {
      lastKnownOnlineRef.current = online;
      setIsOnline(online);
      if (online) {
        setRefreshKey((k) => k + 1);
      }
    }
    scheduleNextPoll(online);
  }, [probe]);

  const scheduleNextPoll = useCallback((online: boolean) => {
    if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    const interval = online ? POLL_INTERVAL_ONLINE : POLL_INTERVAL_OFFLINE;
    pollTimerRef.current = setTimeout(checkAndUpdate, interval);
  }, [checkAndUpdate]);

  useEffect(() => {
    mountedRef.current = true;
    lastKnownOnlineRef.current = true;

    if (Platform.OS === 'web') {
      const onOnline = () => {
        lastKnownOnlineRef.current = true;
        setIsOnline(true);
        setRefreshKey((k) => k + 1);
        scheduleNextPoll(true);
      };
      const onOffline = () => {
        lastKnownOnlineRef.current = false;
        setIsOnline(false);
        scheduleNextPoll(false);
      };
      window.addEventListener('online', onOnline);
      window.addEventListener('offline', onOffline);

      if (!navigator.onLine) {
        setIsOnline(false);
        lastKnownOnlineRef.current = false;
        scheduleNextPoll(false);
      } else {
        checkAndUpdate();
      }

      return () => {
        mountedRef.current = false;
        window.removeEventListener('online', onOnline);
        window.removeEventListener('offline', onOffline);
        if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
        if (abortRef.current) abortRef.current.abort();
      };
    } else {
      checkAndUpdate();
      return () => {
        mountedRef.current = false;
        if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
        if (abortRef.current) abortRef.current.abort();
      };
    }
  }, [checkAndUpdate, scheduleNextPoll]);

  return { isOnline, isChecking, refreshKey };
}