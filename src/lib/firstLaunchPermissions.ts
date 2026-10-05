import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Platform } from 'react-native';
import * as Location from 'expo-location';
import {
  requestNotificationPermission,
  configureNotifications,
  checkNotificationPermission,
} from './notifications';
import { Location as Loc } from './prayerTimes';
import { getCachedLocation, getCachedStatus } from './useLocation';

export const PERMISSIONS_ASKED_KEY = 'permissions-asked-v1';
export const PERMISSIONS_VERSION = 1;
export const LOCATION_SETUP_DISMISSED_KEY = 'location-setup-dismissed-v1';

/**
 * Prompts the user with a real choice ('Enable reminders' vs 'Not now') before OS prompt on Android.
 * On iOS and web, returns true immediately so OS/browser handles rationale natively.
 * If user taps 'Not now' or dismisses, resolves false and never triggers OS prompt.
 */
export function promptNotificationRationale(): Promise<boolean> {
  if (Platform.OS === 'web' || Platform.OS === 'ios') return Promise.resolve(true);
  return new Promise<boolean>((resolve) => {
    Alert.alert(
      'Prayer reminders',
      'Notifications let Islamic play the Adhan at prayer time and remind you to read the Quran daily.\n\nYou can change or turn these off anytime in Settings.',
      [
        {
          text: 'Not now',
          style: 'cancel',
          onPress: () => resolve(false),
        },
        {
          text: 'Enable reminders',
          onPress: () => resolve(true),
        },
      ],
      { cancelable: true, onDismiss: () => resolve(false) }
    );
  });
}

/**
 * Prompts the user with a real choice ('Use location' vs 'Not now') before OS prompt on Android.
 * On iOS and web, returns true immediately so OS/browser handles rationale natively.
 * If user taps 'Not now' or dismisses, resolves false and never triggers OS prompt.
 */
export function promptLocationRationale(): Promise<boolean> {
  if (Platform.OS === 'web' || Platform.OS === 'ios') return Promise.resolve(true);
  return new Promise<boolean>((resolve) => {
    Alert.alert(
      'Your location for prayer times',
      'Islamic uses your location only to calculate accurate prayer times and the Qibla direction for where you are.\n\nIf you prefer, you can skip this and choose a city instead — you can change this anytime in Settings.',
      [
        {
          text: 'Not now',
          style: 'cancel',
          onPress: () => resolve(false),
        },
        {
          text: 'Use location',
          onPress: () => resolve(true),
        },
      ],
      { cancelable: true, onDismiss: () => resolve(false) }
    );
  });
}

/** @deprecated Replaced by promptNotificationRationale() with real choice actions ('Enable reminders' / 'Not now') */
export function explainNotifications(): void {
  // no-op: replaced by non-blocking promptNotificationRationale()
}

/** @deprecated Replaced by promptLocationRationale() with real choice actions ('Use location' / 'Not now') */
export function explainLocation(): void {
  // no-op: replaced by non-blocking promptLocationRationale()
}

/** Check if location setup was previously dismissed or completed by user. */
export async function hasDismissedLocationSetup(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(LOCATION_SETUP_DISMISSED_KEY);
    return raw === 'true';
  } catch {
    return false;
  }
}

/** Record that location setup has been dismissed or completed. */
export async function markLocationSetupDismissed(): Promise<void> {
  try {
    await AsyncStorage.setItem(LOCATION_SETUP_DISMISSED_KEY, 'true');
  } catch {
    // non-fatal write error
  }
}

/** Reset location setup marker (for testing or debugging). */
export async function resetLocationSetupDismissed(): Promise<void> {
  try {
    await AsyncStorage.removeItem(LOCATION_SETUP_DISMISSED_KEY);
  } catch {
    // non-fatal
  }
}

/** Helper to check if a valid saved location exists (manual mode or saved auto location). */
export function hasValidSavedLocation(settings?: {
  locationMode?: string;
  manualLocation?: Loc | null;
  autoLocation?: Loc | null;
}): boolean {
  if (!settings) return false;
  if (settings.locationMode === 'manual') return true;
  if (
    settings.autoLocation &&
    typeof settings.autoLocation.latitude === 'number' &&
    typeof settings.autoLocation.longitude === 'number' &&
    !isNaN(settings.autoLocation.latitude) &&
    !isNaN(settings.autoLocation.longitude) &&
    Boolean(settings.autoLocation.label)
  ) {
    return true;
  }
  return false;
}

export interface FirstLaunchPermissionsOptions {
  /** Optional custom location requester, e.g. from useLocation().request */
  requestLocation?: (force?: boolean) => Promise<Loc | null>;
  /** Callback if location is granted and retrieved */
  onLocationGranted?: (location: Loc) => void;
  /** Gap in milliseconds between notification and location prompts (default 600ms) */
  promptGapMs?: number;
  /** Whether to skip location permission request entirely during first launch */
  skipLocation?: boolean;
  /** Whether prayer or Quran reminders are enabled in settings (default false) */
  remindersEnabled?: boolean;
  /** Whether a usable location already exists (e.g. from saved autoLocation or manual location) */
  hasUsableLocation?: boolean;
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

/** Fallback helper to inspect stored settings for reminders if not passed in options. */
async function resolveRemindersEnabled(options?: FirstLaunchPermissionsOptions): Promise<boolean> {
  if (typeof options?.remindersEnabled === 'boolean') {
    return options.remindersEnabled;
  }
  try {
    const raw = await AsyncStorage.getItem('islamic-settings');
    if (raw) {
      const parsed = JSON.parse(raw);
      return Boolean(parsed.remindersEnabled || parsed.quranReminderEnabled);
    }
  } catch {
    // ignore read error
  }
  return false;
}

/** Fallback helper to inspect stored/cached state for usable location if not passed in options. */
async function resolveHasUsableLocation(options?: FirstLaunchPermissionsOptions): Promise<boolean> {
  if (typeof options?.hasUsableLocation === 'boolean') {
    return options.hasUsableLocation;
  }
  if (options?.skipLocation) {
    return true;
  }
  const cached = getCachedLocation();
  if (cached && typeof cached.latitude === 'number' && typeof cached.longitude === 'number' && Boolean(cached.label)) {
    return true;
  }
  try {
    const raw = await AsyncStorage.getItem('islamic-settings');
    if (raw) {
      const parsed = JSON.parse(raw);
      return hasValidSavedLocation(parsed);
    }
  } catch {
    // ignore read error
  }
  return false;
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
 * - NON-BLOCKING: Notifications permission is only asked when reminders are enabled in settings.
 *   If reminders are off (default on fresh install), zero notification prompts appear.
 * - When reminders are enabled and permission is undetermined, asks with a real choice
 *   ('Enable reminders' vs 'Not now' on Android, native OS prompt on iOS). Never a vague 'OK'.
 * - If permission was previously denied, never re-prompts on launch (Settings banner handles it).
 * - If permission is already granted, configures notifications silently without rationale.
 * - Location setup only fires when no usable location exists AND user hasn't opted out.
 *   If location setup is needed, prompts with real choice ('Use location' vs 'Not now').
 * - Users with everything off or saved location get ZERO blocking dialogs — Home opens clean.
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

  const [remindersActive, hasUsableLoc] = await Promise.all([
    resolveRemindersEnabled(options),
    resolveHasUsableLocation(options),
  ]);

  let notificationsGranted = false;
  let didPromptNotifications = false;
  let userDeclinedNotifications = false;

  // Step 1: Notifications permission
  // NON-BLOCKING: Only asked if user has reminders enabled in settings.
  // If reminders are disabled, do NOT show rationale Alert, do NOT request OS permission.
  if (remindersActive) {
    try {
      const notifStatus = await checkNotificationPermission();
      if (notifStatus === 'granted') {
        notificationsGranted = true;
        await configureNotifications().catch(() => {});
      } else if (notifStatus === 'undetermined') {
        const proceedNotif = await promptNotificationRationale();
        if (proceedNotif) {
          didPromptNotifications = true;
          notificationsGranted = await requestNotificationPermission();
          if (notificationsGranted) {
            await configureNotifications().catch(() => {});
          }
        } else {
          userDeclinedNotifications = true;
        }
      }
      // If notifStatus === 'denied': never re-trigger rationale Alert or re-request on launch;
      // user re-enables from Settings banner.
    } catch {
      notificationsGranted = false;
    }
  }

  // Step 2: Location permission
  // NON-BLOCKING: Setup only fires when no usable location exists.
  // If user opted out of notifications ('Not now'), do not badger with location prompt.
  let locationGranted = false;
  let locationResult: Loc | null = null;
  const shouldSkipLocation = Boolean(options?.skipLocation || hasUsableLoc || userDeclinedNotifications);

  if (!shouldSkipLocation) {
    // Gap between prompts only if notifications prompt was actually shown
    const gap = options?.promptGapMs ?? 600;
    if (didPromptNotifications && gap > 0) {
      await new Promise((resolve) => setTimeout(resolve, gap));
    }

    try {
      let locStatus = getCachedStatus();
      if (!locStatus || locStatus === 'pending') {
        if (Platform.OS === 'web') {
          locStatus = 'unavailable';
        } else {
          const perm = await Location.getForegroundPermissionsAsync().catch(() => null);
          locStatus = perm?.granted ? 'granted' : perm?.status === 'denied' ? 'denied' : 'pending';
        }
      }

      if (locStatus === 'granted') {
        // Permission already granted: silently retrieve location without rationale or prompt
        if (options?.requestLocation) {
          locationResult = await options.requestLocation(false);
        } else {
          locationResult = await requestLocationPermissionDirectly();
        }
        if (locationResult) {
          locationGranted = true;
          options?.onLocationGranted?.(locationResult);
        }
      } else if (locStatus === 'pending') {
        // Undetermined: offer real choice ('Use location' vs 'Not now') — never vague OK
        const proceedLoc = await promptLocationRationale();
        if (proceedLoc) {
          if (options?.requestLocation) {
            locationResult = await options.requestLocation(false);
          } else {
            locationResult = await requestLocationPermissionDirectly();
          }
          if (locationResult) {
            locationGranted = true;
            options?.onLocationGranted?.(locationResult);
          }
        }
      }
      // If locStatus === 'denied' or 'unavailable': do NOT prompt; Settings banner handles it.
    } catch {
      locationGranted = false;
      locationResult = null;
    }
  }

  return {
    alreadyAsked: false,
    notificationsGranted,
    locationGranted,
    location: locationResult,
  };
}
