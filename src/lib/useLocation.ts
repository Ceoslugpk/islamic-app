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
let cachedStatus: LocationPermissionStatus | null = null;
let inFlightRequest: Promise<Loc | null> | null = null;

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
        const { status: permStatus } = await Location.requestForegroundPermissionsAsync();
        if (permStatus !== 'granted') {
          setStatus('denied');
          cachedStatus = 'denied';
          return null;
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
    if (askOnMount && !askedRef.current) {
      askedRef.current = true;
      if (Platform.OS === 'web') {
        setStatus('unavailable');
        cachedStatus = 'unavailable';
      } else {
        performRequest(false);
      }
    }
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
