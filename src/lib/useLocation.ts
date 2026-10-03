import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import * as Location from 'expo-location';
import { Location as Loc } from './prayerTimes';

interface UseLocationResult {
  location: Loc | null;
  status: 'pending' | 'granted' | 'denied' | 'unavailable';
  request: () => Promise<void>;
}

/**
 * Request GPS location once and cache it. On web, GPS isn't reliable in all
 * environments, so we skip the permission ask and report 'pending' (callers
 * fall back to manual). On native, full permission flow.
 */
export function useLocation(askOnMount = false): UseLocationResult {
  const [location, setLocation] = useState<Loc | null>(null);
  const [status, setStatus] = useState<UseLocationResult['status']>('pending');
  const askedRef = useRef(false);

  async function request() {
    if (askedRef.current) return;
    askedRef.current = true;
    if (Platform.OS === 'web') {
      setStatus('unavailable'); // web: no reliable GPS prompt in this build
      return;
    }
    try {
      const { status: perm } = await Location.requestForegroundPermissionsAsync();
      if (perm !== 'granted') {
        setStatus('denied');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const label = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
      setLocation({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        label,
      });
      setStatus('granted');
    } catch (e) {
      setStatus('unavailable');
    }
  }

  useEffect(() => {
    if (askOnMount) request();
  }, [askOnMount]);

  return { location, status, request };
}

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const geo = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
    if (geo && geo.length > 0) {
      const g = geo[0];
      return [g.city, g.region, g.country].filter(Boolean).join(', ') || `${lat.toFixed(2)}, ${lng.toFixed(2)}`;
    }
  } catch {
    // fall through
  }
  return `${lat.toFixed(2)}, ${lng.toFixed(2)}`;
}
