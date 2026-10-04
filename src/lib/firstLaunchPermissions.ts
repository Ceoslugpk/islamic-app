import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as Location from 'expo-location';
import { requestNotificationPermission, configureNotifications } from './notifications';
import { Location as Loc } from './prayerTimes';

export const PERMISSIONS_ASKED_KEY = 'permissions-asked-v1';
export const PERMISSIONS_VERSION = 1;

export interface FirstLaunchPermissionsOptions {
  /** Optional custom location requester, e.g. from useLocation().request */
  requestLocation?: (force?: boolean) => Promise<Loc | null>;
  /** Callback if location is granted and retrieved */
  onLocationGranted?: (location: Loc) => void;
  /** Gap in milliseconds between notification and location prompts (default 600ms) */
  promptGapMs?: number;
}

export interface FirstLaunchPermissionsResult {
  alreadyAsked: boolean;
  notificationsGranted: boolean;
  locationGranted: boolean;
  location: Loc | null;
}

/** Check if the first-launch permission onboarding has already executed. */
export async function hasAskedPermissions(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(PERMISSIONS_ASKED_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return parsed.version === PERMISSIONS_VERSION && parsed.asked === true;
    }
  } catch {
    // ignore read error
  }
  return false;
}

/** Record that the first-launch permission onboarding has executed. */
export async function markPermissionsAsked(): Promise<void> {
  try {
    await AsyncStorage.setItem(
      PERMISSIONS_ASKED_KEY,
      JSON.stringify({ version: PERMISSIONS_VERSION, asked: true, timestamp: Date.now() })
    );
  } catch {
    // non-fatal write error
  }
}

/** Reset permission-asked marker (for testing or debugging). */
export async function resetPermissionsAsked(): Promise<void> {
  try {
    await AsyncStorage.removeItem(PERMISSIONS_ASKED_KEY);
  } catch {
    // non-fatal
  }
}

/** Direct fallback requester for location permissions when useLocation hook is not available. */
async function requestLocationPermissionDirectly(): Promise<Loc | null> {
  if (Platform.OS === 'web') {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      return null;
    }
    return new Promise((resolve) => {
      try {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            resolve({
              latitude: lat,
              longitude: lng,
              label: `${lat.toFixed(2)}°, ${lng.toFixed(2)}°`,
            });
          },
          () => resolve(null),
          { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
        );
      } catch {
        resolve(null);
      }
    });
  }

  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;
    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;
    return {
      latitude: lat,
      longitude: lng,
      label: `${lat.toFixed(2)}°, ${lng.toFixed(2)}°`,
    };
  } catch {
    return null;
  }
}

/**
 * First-launch permission onboarding orchestrator.
 * - Runs once per install (tracked by 'permissions-asked-v1').
 * - Asks Notifications permission first via OS prompt.
 * - If granted, configures notification handlers/channels while leaving reminder toggles as-is.
 * - Pauses for a brief gap (600ms) to prevent overlapping OS dialogs.
 * - Asks Location permission second via useLocation request (or direct fallback).
 * - If granted, invokes onLocationGranted callback.
 * - Graceful fallback on denial or platform unavailability (never throws or crashes).
 */
export async function runFirstLaunchPermissions(
  options?: FirstLaunchPermissionsOptions
): Promise<FirstLaunchPermissionsResult> {
  const alreadyAsked = await hasAskedPermissions();
  if (alreadyAsked) {
    return {
      alreadyAsked: true,
      notificationsGranted: false,
      locationGranted: false,
      location: null,
    };
  }

  // Mark asked immediately so concurrent calls or fast restarts don't prompt twice
  await markPermissionsAsked();

  // Step 1: Notifications permission
  let notificationsGranted = false;
  try {
    notificationsGranted = await requestNotificationPermission();
    if (notificationsGranted) {
      await configureNotifications();
    }
  } catch {
    notificationsGranted = false;
  }

  // Step 2: Brief gap between prompts to prevent OS dialog collisions
  const gap = options?.promptGapMs ?? 600;
  if (gap > 0) {
    await new Promise((resolve) => setTimeout(resolve, gap));
  }

  // Step 3: Location permission
  let locationGranted = false;
  let locationResult: Loc | null = null;
  try {
    if (options?.requestLocation) {
      locationResult = await options.requestLocation(false);
    } else {
      locationResult = await requestLocationPermissionDirectly();
    }
    if (locationResult) {
      locationGranted = true;
      options?.onLocationGranted?.(locationResult);
    }
  } catch {
    locationGranted = false;
    locationResult = null;
  }

  return {
    alreadyAsked: false,
    notificationsGranted,
    locationGranted,
    location: locationResult,
  };
}
