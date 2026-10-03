import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DayTimings, Location } from './prayerTimes';

const FINGERPRINT_KEY = 'notification-fingerprint';
const LAST_SCHEDULE_KEY = 'last-notification-schedule';

export interface NotificationFingerprint {
  location: Location;
  methodId: number;
  remindersEnabled: boolean;
}

export interface NotificationHealth {
  status: 'active' | 'paused' | 'permission-needed';
  nextPrayer: { name: string; time: string } | null;
  scheduledCounts: { today: number; tomorrow: number };
  fingerprint: NotificationFingerprint | null;
}

// Configure notification presentation (Android channel)
export async function configureNotifications() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('prayer-times', {
      name: 'Prayer times',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'adhan_chime.wav',
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#D97706',
    });
  }
}

function computeFingerprint(location: Location, methodId: number, remindersEnabled: boolean): NotificationFingerprint {
  return {
    location: { latitude: location.latitude, longitude: location.longitude, label: location.label },
    methodId,
    remindersEnabled,
  };
}

function fingerprintToString(fp: NotificationFingerprint): string {
  return `${fp.location.latitude.toFixed(4)},${fp.location.longitude.toFixed(4)}|${fp.methodId}|${fp.remindersEnabled ? 1 : 0}`;
}

export async function getStoredFingerprint(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(FINGERPRINT_KEY);
  } catch {
    return null;
  }
}

export async function storeFingerprint(fp: NotificationFingerprint): Promise<void> {
  try {
    await AsyncStorage.setItem(FINGERPRINT_KEY, fingerprintToString(fp));
  } catch {
    // ignore
  }
}

export async function clearStoredFingerprint(): Promise<void> {
  try {
    await AsyncStorage.removeItem(FINGERPRINT_KEY);
  } catch {
    // ignore
  }
}

export async function getScheduledNotificationsHealth(): Promise<{ today: number; tomorrow: number }> {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrowStart = new Date(todayStart.getTime() + 86400000);
    const dayAfterTomorrow = new Date(tomorrowStart.getTime() + 86400000);

    let today = 0;
    let tomorrow = 0;

    for (const n of scheduled) {
      const trigger = n.trigger as any;
      if (trigger?.date) {
        const triggerDate = new Date(trigger.date);
        if (triggerDate >= todayStart && triggerDate < tomorrowStart) {
          today++;
        } else if (triggerDate >= tomorrowStart && triggerDate < dayAfterTomorrow) {
          tomorrow++;
        }
      }
    }

    return { today, tomorrow };
  } catch {
    return { today: 0, tomorrow: 0 };
  }
}

export function getNextPrayerFromTimings(timings: DayTimings): { name: string; time: string } | null {
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();

  const prayers: { name: string; time: string }[] = [
    { name: 'Fajr', time: timings.timings.Fajr },
    { name: 'Dhuhr', time: timings.timings.Dhuhr },
    { name: 'Asr', time: timings.timings.Asr },
    { name: 'Maghrib', time: timings.timings.Maghrib },
    { name: 'Isha', time: timings.timings.Isha },
  ];

  for (const p of prayers) {
    if (!p.time || !p.time.includes(':')) continue;
    const [h, m] = p.time.split(':').map(Number);
    const prayerMin = h * 60 + m;
    if (nowMin < prayerMin) {
      return { name: p.name, time: p.time };
    }
  }

  // After Isha, next is tomorrow's Fajr
  if (timings.timings.Fajr && timings.timings.Fajr.includes(':')) {
    return { name: 'Fajr (tomorrow)', time: timings.timings.Fajr };
  }
  return null;
}

export async function checkNotificationPermission(): Promise<'granted' | 'denied' | 'undetermined'> {
  const { status } = await Notifications.getPermissionsAsync();
  return status;
}

/**
 * Reschedule prayer notifications if the fingerprint (location/method/reminders) has changed.
 * Call on app start and when relevant settings change.
 */
export async function rescheduleIfNeeded(
  location: Location,
  methodId: number,
  remindersEnabled: boolean,
  hourBeforeMinutes: number
): Promise<boolean> {
  if (!remindersEnabled) {
    await cancelPrayerNotifications();
    await clearStoredFingerprint();
    return false;
  }

  const currentFp = computeFingerprint(location, methodId, remindersEnabled);
  const currentFpStr = fingerprintToString(currentFp);
  const storedFpStr = await getStoredFingerprint();

  if (currentFpStr === storedFpStr) {
    // Fingerprint matches, check if we actually have notifications scheduled
    const { today } = await getScheduledNotificationsHealth();
    if (today > 0) {
      return false; // Already scheduled and up to date
    }
    // No notifications scheduled despite matching fingerprint - reschedule
  }

  // Fingerprint changed or no notifications - reschedule
  const permission = await checkNotificationPermission();
  if (permission !== 'granted') {
    return false;
  }

  await configureNotifications();
  try {
    const { fetchPrayerTimes } = await import('./prayerTimes');
    const data = await fetchPrayerTimes(location, methodId);
    await cancelPrayerNotifications();
    await schedulePrayerNotifications(data, hourBeforeMinutes);
    await storeFingerprint(currentFp);
    return true;
  } catch {
    return false;
  }
}

/**
 * Schedule a notification for each prayer time today.
 * Returns the notification IDs so callers can cancel/reschedule.
 */
export async function schedulePrayerNotifications(
  timings: DayTimings,
  hourBeforeMinutes = 10
): Promise<string[]> {
  const ids: string[] = [];
  const now = Date.now();

  const prayers: { name: string; time: string }[] = [
    { name: 'Fajr', time: timings.timings.Fajr },
    { name: 'Dhuhr', time: timings.timings.Dhuhr },
    { name: 'Asr', time: timings.timings.Asr },
    { name: 'Maghrib', time: timings.timings.Maghrib },
    { name: 'Isha', time: timings.timings.Isha },
  ];

  for (const p of prayers) {
    if (!p.time || !p.time.includes(':')) continue;
    const [h, m] = p.time.split(':').map(Number);
    const prayerDate = new Date();
    prayerDate.setHours(h, m - hourBeforeMinutes, 0, 0);

    if (prayerDate.getTime() <= now) continue; // already passed

    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: `${p.name} prayer in ${hourBeforeMinutes} minutes`,
          body: `${p.name} at ${p.time}. ${timings.hijri.day} ${timings.hijri.monthEn} ${timings.hijri.year} AH`,
          sound: 'default',
          data: { prayer: p.name },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: prayerDate,
          channelId: Platform.OS === 'android' ? 'prayer-times' : undefined,
        },
      });
      ids.push(id);
    } catch (e) {
      // notification scheduling failed; skip this prayer
    }
  }

  return ids;
}

/** Cancel all previously scheduled prayer notifications. */
export async function cancelPrayerNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/** Request notification permission. */
export async function requestNotificationPermission(): Promise<boolean> {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

/** Get comprehensive notification health status for UI. */
export async function getNotificationHealth(
  timings: DayTimings | null,
  location: Location,
  methodId: number,
  remindersEnabled: boolean
): Promise<NotificationHealth> {
  const permission = await checkNotificationPermission();
  let status: 'active' | 'paused' | 'permission-needed' = 'paused';

  if (!remindersEnabled) {
    status = 'paused';
  } else if (permission !== 'granted') {
    status = 'permission-needed';
  } else {
    status = 'active';
  }

  const nextPrayer = timings ? getNextPrayerFromTimings(timings) : null;
  const scheduledCounts = await getScheduledNotificationsHealth();
  const storedFpStr = await getStoredFingerprint();
  let fingerprint: NotificationFingerprint | null = null;
  if (storedFpStr) {
    const parts = storedFpStr.split('|');
    if (parts.length === 3) {
      const [latLon, methodStr, remindersStr] = parts;
      const [lat, lon] = latLon.split(',').map(Number);
      fingerprint = {
        location: { latitude: lat, longitude: lon, label: '' },
        methodId: parseInt(methodStr, 10),
        remindersEnabled: remindersStr === '1',
      };
    }
  }

  return { status, nextPrayer, scheduledCounts, fingerprint };
}
