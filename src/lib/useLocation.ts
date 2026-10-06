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

type Listener = () => void;
const listeners = new Set<Listener>();

function notifyListeners() {
  listeners.forEach((l) => {
    try {
      l();
    } catch {}
  });
}

export function getCachedLocation(): Loc | null {
  return cachedLocation;
}

export function getCachedStatus(): LocationPermissionStatus | null {
  return cachedStatus;
}

export function getCachedLocationTimestamp(): number | null {
  return cachedTimestamp;
}

/**
 * Sanitizes and caps a location label:
 * - Strips control characters (including \x00-\x1F, \x7F-\x9F).
 * - Collapses repeated whitespace.
 * - Caps length at 120 characters.
 */
export function sanitizeLocationLabel(raw: string | undefined | null): string {
  if (typeof raw !== 'string' || !raw) return '';
  const cleaned = raw.replace(/[\x00-\x1F\x7F-\x9F]/g, ' ').replace(/\s+/g, ' ').trim();
  return cleaned.slice(0, 120);
}

export function setCachedLocation(loc: Loc | null, timestamp?: number): void {
  cachedLocation = loc
    ? {
        ...loc,
        label: sanitizeLocationLabel(loc.label) || `${loc.latitude.toFixed(2)}°, ${loc.longitude.toFixed(2)}°`,
      }
    : null;
  cachedTimestamp = timestamp ?? (loc ? Date.now() : null);
  if (loc) {
    cachedStatus = 'granted';
  }
  notifyListeners();
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
    notifyListeners();
    return 'unavailable';
  }
  try {
    const perm = await Location.getForegroundPermissionsAsync();
    const status: LocationPermissionStatus = perm.granted
      ? 'granted'
      : perm.status === 'denied' && !perm.canAskAgain
      ? 'denied'
      : 'pending';
    cachedStatus = status;
    notifyListeners();
    return status;
  } catch {
    cachedStatus = 'unavailable';
    notifyListeners();
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
      if (perm.status === 'denied' && !perm.canAskAgain) {
        cachedStatus = 'denied';
        notifyListeners();
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
    notifyListeners();
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
      const joined = parts.join(', ');
      return sanitizeLocationLabel(joined) || `${lat.toFixed(2)}°, ${lng.toFixed(2)}°`;
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
                if (parts.length > 0) label = sanitizeLocationLabel(parts.join(', ')) || label;
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
            notifyListeners();
            setLoading(false);
            resolve(newLoc);
          },
          (err) => {
            setStatus(err?.code === 1 ? 'denied' : 'unavailable');
            cachedStatus = err?.code === 1 ? 'denied' : 'unavailable';
            notifyListeners();
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

    // Handle in-flight request:
    // If NOT forcing, reuse in-flight promise to avoid duplicate concurrent calls.
    // If FORCING, await existing in-flight first; if it yielded a valid location, return it,
    // but if it returned null (e.g. from an unprompted background check), DO NOT give up —
    // proceed to run our own forced request with explicit prompt!
    if (inFlightRequest) {
      if (!force) {
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
      } else {
        try {
          const res = await inFlightRequest;
          if (res) {
            setLocation(res);
            setStatus('granted');
            return res;
          }
        } catch {
          // ignore and proceed with force request
        }
      }
    }

    setLoading(true);

    const exec = async (): Promise<Loc | null> => {
      try {
        // Query permission silently first without prompting
        const currentPerm = await Location.getForegroundPermissionsAsync();
        let isGranted = currentPerm.granted;

        if (!isGranted) {
          // If NOT forcing, do not prompt if permanently denied
          if (!force && (cachedStatus === 'denied' || !currentPerm.canAskAgain)) {
            setStatus('denied');
            cachedStatus = 'denied';
            notifyListeners();
            return null;
          }

          // Explicit prompt for user
          const { status: permStatus, granted } = await Location.requestForegroundPermissionsAsync();
          if (!granted && permStatus !== 'granted') {
            setStatus('denied');
            cachedStatus = 'denied';
            notifyListeners();
            return null;
          }
          isGranted = true;
        }

        const posPromise = Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Location request timed out')), 8000)
        );
        // Robust: try last-known first (fast, works indoors), then current.
        const lastKnown = await Location.getLastKnownPositionAsync().catch(() => null);
        let pos = lastKnown;
        if (!pos || Date.now() - pos.timestamp > 3600000) {
          try {
            pos = await Promise.race([posPromise, timeoutPromise]);
          } catch {
            if (lastKnown) {
              pos = lastKnown;
            } else {
              throw new Error('Location request timed out');
            }
          }
        }
        if (!pos) return null;

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
        notifyListeners();
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
        notifyListeners();
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

  // Multi-hook instance synchronization: listen for module cache updates
  useEffect(() => {
    const onChange = () => {
      setLocation(cachedLocation);
      if (Platform.OS !== 'web') {
        setStatus(cachedStatus || 'pending');
      }
    };
    listeners.add(onChange);
    return () => {
      listeners.delete(onChange);
    };
  }, []);

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
