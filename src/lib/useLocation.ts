import { useEffect, useRef, useState, useCallback } from 'react';
import { Platform } from 'react-native';
import * as Location from 'expo-location';
import { Location as Loc } from './prayerTimes';

export type LocationPermissionStatus = 'pending' | 'granted' | 'denied' | 'unavailable';

export interface UseLocationResult {
  location: Loc | null;
  status: LocationPermissionStatus;
  loading: boolean;
  isDenied: boolean;
  isUnavailable: boolean;
  request: (force?: boolean) => Promise<Loc | null>;
  refresh: () => Promise<Loc | null>;
}

// Module-level cache to share across screens and prevent duplicate native calls
let cachedLocation: Loc | null = null;
let cachedTimestamp: number | null = null;
let cachedStatus: LocationPermissionStatus | null = null;
let inFlightRequest: Promise<Loc | null> | null = null;

export function getCachedLocation(): Loc | null {
  return cachedLocation;
}

export function getCachedStatus(): LocationPermissionStatus | null {
  return cachedStatus;
}

export function getCachedLocationTimestamp(): number | null {
  return cachedTimestamp;
}

export function setCachedLocation(loc: Loc | null, timestamp?: number): void {
  cachedLocation = loc;
  cachedTimestamp = timestamp ?? (loc ? Date.now() : null);
  if (loc && cachedStatus !== 'denied') {
    cachedStatus = 'granted';
  }
}

export function computeDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function getPermissionStatus(): Promise<LocationPermissionStatus> {
  if (Platform.OS === 'web') {
    cachedStatus = 'unavailable';
    return 'unavailable';
  }
  try {
    const perm = await Location.getForegroundPermissionsAsync();
    const status: LocationPermissionStatus = perm.granted
      ? 'granted'
      : perm.status === 'denied'
      ? 'denied'
      : 'pending';
    cachedStatus = status;
    return status;
  } catch {
    cachedStatus = 'unavailable';
    return 'unavailable';
  }
}

/**
 * Silently refreshes GPS in the background without prompting for permission or blocking UI.
 * Used for stale (>24h) auto-location updates.
 */
export async function refreshLocationSilently(): Promise<Loc | null> {
  if (Platform.OS === 'web') return null;

  try {
    const perm = await Location.getForegroundPermissionsAsync();
    if (!perm.granted) {
      if (perm.status === 'denied') {
        cachedStatus = 'denied';
      }
      return null;
    }
    cachedStatus = 'granted';

    let pos = await Location.getLastKnownPositionAsync().catch(() => null);
    if (!pos || Date.now() - pos.timestamp > 3600000) {
      const posPromise = Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Location request timed out')), 5000)
      );
      pos = await Promise.race([posPromise, timeoutPromise]);
    }
    if (!pos) return null;

    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;

    let label = cachedLocation?.label;
    const moved = cachedLocation
      ? computeDistanceKm(cachedLocation.latitude, cachedLocation.longitude, lat, lng) > 10
      : true;

    if (moved || !label) {
      label = await reverseGeocode(lat, lng);
    }

    const newLoc: Loc = { latitude: lat, longitude: lng, label };
    cachedLocation = newLoc;
    cachedTimestamp = Date.now();
    cachedStatus = 'granted';
    return newLoc;
  } catch {
    return null;
  }
}

export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const geoPromise = Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Geocode timed out')), 3500)
    );
    const geo = await Promise.race([geoPromise, timeoutPromise]);
    if (geo && geo.length > 0) {
      const g = geo[0];
      const city = g.city || g.subregion || g.district;
      const parts = [city, g.region, g.country].filter(Boolean);
      return parts.join(', ') || `${lat.toFixed(2)}°, ${lng.toFixed(2)}°`;
    }
  } catch {
    // fall through to coordinate string
  }
  return `${lat.toFixed(2)}°, ${lng.toFixed(2)}°`;
}

/**
 * Central hook for GPS location across the app.
 * - Requests permission once and caches location across screens.
 * - On web, short-circuits to 'unavailable' immediately so screens never hang.
 * - Exposes status, clear isDenied/isUnavailable flags, loading, request(), and refresh().
 */
export function useLocation(askOnMount = false): UseLocationResult {
  const [location, setLocation] = useState<Loc | null>(cachedLocation);
  const [status, setStatus] = useState<LocationPermissionStatus>(() => {
    if (Platform.OS === 'web') return 'unavailable';
    return cachedStatus || 'pending';
  });
  const [loading, setLoading] = useState<boolean>(false);
  const askedRef = useRef(false);

  const performRequest = useCallback(async (force = false): Promise<Loc | null> => {
    // Web environment: use the browser's Geolocation API (asks the permission prompt)
    if (Platform.OS === 'web') {
      return new Promise<Loc | null>((resolve) => {
        if (typeof navigator === 'undefined' || !navigator.geolocation) {
          setStatus('unavailable');
          cachedStatus = 'unavailable';
          setLoading(false);
          resolve(null);
          return;
        }
        setLoading(true);
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            // Best-effort reverse geocode via Nominatim (keyless); fall back to coordinates
            let label = `${lat.toFixed(2)}°, ${lng.toFixed(2)}°`;
            try {
              const res = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`
              );
              if (res.ok) {
                const g = await res.json();
                const city = g.address?.city || g.address?.town || g.address?.village || '';
                const region = g.address?.state || '';
                const country = g.address?.country || '';
                const parts = [city, region, country].filter(Boolean);
                if (parts.length > 0) label = parts.join(', ');
              }
            } catch {
              // keep coordinate label
            }
            const newLoc: Loc = { latitude: lat, longitude: lng, label };
            cachedLocation = newLoc;
            cachedTimestamp = Date.now();
            cachedStatus = 'granted';
            setLocation(newLoc);
            setStatus('granted');
            setLoading(false);
            resolve(newLoc);
          },
          (err) => {
            setStatus(err?.code === 1 ? 'denied' : 'unavailable');
            cachedStatus = err?.code === 1 ? 'denied' : 'unavailable';
            setLoading(false);
            resolve(null);
          },
          { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
        );
      });
    }

    // Return cached location if valid and not forcing a fresh GPS read
    if (!force && cachedLocation && cachedStatus === 'granted') {
      setLocation(cachedLocation);
      setStatus('granted');
      return cachedLocation;
    }

    // Reuse in-flight promise to avoid duplicate concurrent calls
    if (inFlightRequest) {
      setLoading(true);
      try {
        const res = await inFlightRequest;
        if (res) {
          setLocation(res);
          setStatus('granted');
        }
        return res;
      } finally {
        setLoading(false);
      }
    }

    setLoading(true);

    const exec = async (): Promise<Loc | null> => {
      try {
        // Already permanently denied: don't re-prompt — the only path back is
        // the OS settings screen (see LocationPermissionNote "Device Settings").
        if (cachedStatus === 'denied') {
          setStatus('denied');
          return null;
        }

        // Query permission silently first without prompting
        const currentPerm = await Location.getForegroundPermissionsAsync();
        let isGranted = currentPerm.granted;

        if (!isGranted) {
          // Explicit prompt only if not already granted
          const { status: permStatus } = await Location.requestForegroundPermissionsAsync();
          if (permStatus !== 'granted') {
            setStatus('denied');
            cachedStatus = 'denied';
            return null;
          }
          isGranted = true;
        }

        const posPromise = Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Location request timed out')), 5000)
        );
        const pos = await Promise.race([posPromise, timeoutPromise]);

        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const label = await reverseGeocode(lat, lng);

        const newLoc: Loc = {
          latitude: lat,
          longitude: lng,
          label,
        };

        cachedLocation = newLoc;
        cachedTimestamp = Date.now();
        cachedStatus = 'granted';
        setLocation(newLoc);
        setStatus('granted');
        return newLoc;
      } catch (err: any) {
        const msg = String(err?.message || '').toLowerCase();
        if (msg.includes('denied') || msg.includes('permission')) {
          setStatus('denied');
          cachedStatus = 'denied';
        } else {
          setStatus('unavailable');
          cachedStatus = 'unavailable';
        }
        return null;
      } finally {
        setLoading(false);
        inFlightRequest = null;
      }
    };

    inFlightRequest = exec();
    return inFlightRequest;
  }, []);

  const request = useCallback((force?: boolean) => {
    askedRef.current = true;
    return performRequest(Boolean(force));
  }, [performRequest]);

  const refresh = useCallback(() => {
    return performRequest(true);
  }, [performRequest]);

  useEffect(() => {
    let isMounted = true;
    if (Platform.OS === 'web') {
      setStatus('unavailable');
      cachedStatus = 'unavailable';
      return;
    }

    // Silent permission status check on mount (never prompts OS dialog)
    getPermissionStatus().then((newStatus) => {
      if (isMounted) {
        setStatus(newStatus);
        if (cachedLocation) {
          setLocation(cachedLocation);
        }
      }
    });

    if (askOnMount && !askedRef.current) {
      askedRef.current = true;
      performRequest(false);
    }

    return () => {
      isMounted = false;
    };
  }, [askOnMount, performRequest]);

  return {
    location,
    status,
    loading,
    isDenied: status === 'denied',
    isUnavailable: status === 'unavailable',
    request,
    refresh,
  };
}
