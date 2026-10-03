import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DayTimings, Location } from './prayerTimes';
import { markSalahCompleted } from './db';
import { buildDeepLink } from './deeplinks';

const FINGERPRINT_KEY = 'notification-fingerprint';

export interface NotificationFingerprint {
  location: Location;
  methodId: number;
  remindersEnabled: boolean;
  reminderOffsetMinutes: number;
  quranReminderEnabled: boolean;
}

export interface NotificationHealth {
  status: 'active' | 'paused' | 'permission-needed';
  nextPrayer: { name: string; time: string } | null;
  scheduledCounts: { today: number; tomorrow: number };
  fingerprint: NotificationFingerprint | null;
}

// Configure notification presentation and Android channel
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
      importance: Notifications.AndroidImportance.MAX,
      sound: 'adhan_chime.wav',
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#D97706',
      enableVibrate: true,
      showBadge: true,
    });
  }

  // Define notification category with "Mark Complete" action
  await Notifications.setNotificationCategoryAsync('prayer', [
    {
      identifier: 'mark-complete',
      buttonTitle: 'Mark Complete',
      options: { opensAppToForeground: false },
    },
  ]);
}

function computeFingerprint(
  location: Location,
  methodId: number,
  remindersEnabled: boolean,
  reminderOffsetMinutes: number,
  quranReminderEnabled: boolean
): NotificationFingerprint {
  return {
    location: { latitude: location.latitude, longitude: location.longitude, label: location.label },
    methodId,
    remindersEnabled,
    reminderOffsetMinutes,
    quranReminderEnabled,
  };
}

function fingerprintToString(fp: NotificationFingerprint): string {
  return `${fp.location.latitude.toFixed(4)},${fp.location.longitude.toFixed(4)}|${fp.methodId}|${fp.remindersEnabled ? 1 : 0}|${fp.reminderOffsetMinutes}|${fp.quranReminderEnabled ? 1 : 0}`;
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
    const nowTotalMin = now.getHours() * 60 + now.getMinutes();
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
      } else if (trigger?.hour !== undefined && trigger?.minute !== undefined) {
        // Daily repeating trigger: fires tomorrow for sure
        tomorrow++;
        const trigMin = trigger.hour * 60 + trigger.minute;
        // Fires today if its trigger time hasn't passed yet
        if (trigMin > nowTotalMin) {
          today++;
        }
      } else {
        today++;
        tomorrow++;
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
  try {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        const perm = Notification.permission;
        if (perm === 'granted') return 'granted';
        if (perm === 'denied') return 'denied';
        return 'undetermined';
      }
      return 'undetermined';
    }
    const { status } = await Notifications.getPermissionsAsync();
    return status;
  } catch {
    return 'undetermined';
  }
}

/**
 * Reschedule prayer notifications if the fingerprint (location/method/reminders) has changed.
 * Call on app start and when relevant settings change.
 */
export async function rescheduleIfNeeded(
  location: Location,
  methodId: number,
  remindersEnabled: boolean,
  reminderOffsetMinutes: number,
  quranReminderEnabled: boolean
): Promise<boolean> {
  if (!remindersEnabled && !quranReminderEnabled) {
    await cancelPrayerNotifications();
    await cancelQuranReminder();
    await clearStoredFingerprint();
    return false;
  }

  const currentFp = computeFingerprint(location, methodId, remindersEnabled, reminderOffsetMinutes, quranReminderEnabled);
  const currentFpStr = fingerprintToString(currentFp);
  const storedFpStr = await getStoredFingerprint();

  if (currentFpStr === storedFpStr) {
    // Fingerprint matches, check if we actually have notifications scheduled
    const { today, tomorrow } = await getScheduledNotificationsHealth();
    if (today > 0 || tomorrow > 0) {
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
    await cancelQuranReminder();
    if (remindersEnabled) {
      await schedulePrayerNotifications(data, reminderOffsetMinutes, location.label);
    }
    if (quranReminderEnabled) {
      await scheduleQuranReminder();
    }
    await storeFingerprint(currentFp);
    return true;
  } catch {
    return false;
  }
}

/**
 * Schedule TWO notifications per prayer as daily repeat triggers:
 * - Before prayer (at offset minutes before): "🕌 Maghrib in 15 minutes" / "Dubai · 18:21"
 * - At prayer time: "🕌 Maghrib" / "It's time for Maghrib."
 * Uses the high-priority Android channel with sound and bundled adhan chime.
 * Handles midnight rollover safely for early Fajr reminders.
 */
export async function schedulePrayerNotifications(
  timings: DayTimings,
  reminderOffsetMinutes = 15,
  locationLabel?: string
): Promise<string[]> {
  const ids: string[] = [];

  const prayers: { name: string; time: string }[] = [
    { name: 'Fajr', time: timings.timings.Fajr },
    { name: 'Dhuhr', time: timings.timings.Dhuhr },
    { name: 'Asr', time: timings.timings.Asr },
    { name: 'Maghrib', time: timings.timings.Maghrib },
    { name: 'Isha', time: timings.timings.Isha },
  ];

  const label = locationLabel || 'Your Location';

  for (const p of prayers) {
    if (!p.time || !p.time.includes(':')) continue;
    const [h, m] = p.time.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) continue;

    // 1. Before prayer notification (daily repeating trigger at offset minutes before)
    let beforeTotalMin = h * 60 + m - reminderOffsetMinutes;
    while (beforeTotalMin < 0) beforeTotalMin += 1440;
    beforeTotalMin = beforeTotalMin % 1440;
    const beforeHour = Math.floor(beforeTotalMin / 60);
    const beforeMinute = beforeTotalMin % 60;

    try {
      const beforeId = await Notifications.scheduleNotificationAsync({
        content: {
          title: `🕌 ${p.name} in ${reminderOffsetMinutes} minutes`,
          body: `${label} · ${p.time}`,
          sound: 'adhan_chime.wav',
          data: { prayer: p.name, type: 'prayer-before', url: buildDeepLink({ type: 'tracker' }) },
          categoryIdentifier: 'prayer',
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: beforeHour,
          minute: beforeMinute,
          channelId: Platform.OS === 'android' ? 'prayer-times' : undefined,
        },
      });
      ids.push(beforeId);
    } catch (e) {
      // skip on scheduling failure
    }

    // 2. At prayer time notification (daily repeating trigger at prayer time)
    try {
      const atId = await Notifications.scheduleNotificationAsync({
        content: {
          title: `🕌 ${p.name}`,
          body: `It's time for ${p.name}.`,
          sound: 'adhan_chime.wav',
          data: { prayer: p.name, type: 'prayer-at', url: buildDeepLink({ type: 'tracker' }) },
          categoryIdentifier: 'prayer',
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: h,
          minute: m,
          channelId: Platform.OS === 'android' ? 'prayer-times' : undefined,
        },
      });
      ids.push(atId);
    } catch (e) {
      // skip on scheduling failure
    }
  }

  return ids;
}

/** Cancel all previously scheduled prayer notifications. */
export async function cancelPrayerNotifications() {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {
    // ignore
  }
}

/** Schedule daily Quran reminder notification at 20:00. */
export async function scheduleQuranReminder(): Promise<string | null> {
  try {
    const { getReadingPosition } = await import('./continuing');
    const { SURAHS_114 } = await import('./surahs114');

    const position = await getReadingPosition();
    if (!position) return null;

    const surah = SURAHS_114.find((s) => s.number === position.surah);
    const surahName = surah?.englishName || `Surah ${position.surah}`;

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: '📖 Continue your Quran',
        body: `You stopped at ${surahName} ${position.surah}:${position.ayah}.`,
        sound: 'default',
        data: { type: 'quran-reminder', url: buildDeepLink({ type: 'quran', surah: position.surah, ayah: position.ayah }) },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 20,
        minute: 0,
        channelId: Platform.OS === 'android' ? 'prayer-times' : undefined,
      },
    });
    return id;
  } catch {
    return null;
  }
}

/** Cancel Quran reminder notification. */
export async function cancelQuranReminder() {
  // Canceling and rescheduling is handled in rescheduleIfNeeded
}

/** Notification response listener setup - call once at app startup. */
export function setupNotificationResponseHandler() {
  Notifications.addNotificationResponseReceivedListener((response) => {
    const { actionIdentifier, notification } = response;
    const data = notification.request.content.data as { url?: string } | undefined;

    // Handle deep link from notification tap (when user taps notification body, not action button)
    if (actionIdentifier === 'default' && data?.url) {
      return;
    }

    if (actionIdentifier === 'mark-complete') {
      const prayerData = notification.request.content.data as { prayer?: string; date?: string } | undefined;
      if (prayerData?.prayer) {
        const currentDate = new Date();
        const dateStr = prayerData.date || `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
        markSalahCompleted(dateStr, prayerData.prayer, true);
        try {
          const { Haptics } = require('expo-haptics');
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {
          // haptics not available
        }
      }
    }
  });
}

/** Request notification permission with platform options. */
export async function requestNotificationPermission(): Promise<boolean> {
  try {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        const perm = await Notification.requestPermission();
        return perm === 'granted';
      }
      return false;
    }
    const { status } = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
      },
    });
    return status === 'granted';
  } catch {
    return false;
  }
}

/** Get comprehensive notification health status for UI. */
export async function getNotificationHealth(
  timings: DayTimings | null,
  location: Location,
  methodId: number,
  remindersEnabled: boolean,
  reminderOffsetMinutes: number = 15,
  quranReminderEnabled: boolean = false
): Promise<NotificationHealth> {
  const permission = await checkNotificationPermission();
  let status: 'active' | 'paused' | 'permission-needed' = 'paused';

  if (!remindersEnabled && !quranReminderEnabled) {
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
    if (parts.length === 5) {
      const [latLon, methodStr, remindersStr, offsetStr, quranStr] = parts;
      const [lat, lon] = latLon.split(',').map(Number);
      fingerprint = {
        location: { latitude: lat, longitude: lon, label: '' },
        methodId: parseInt(methodStr, 10),
        remindersEnabled: remindersStr === '1',
        reminderOffsetMinutes: parseInt(offsetStr, 10),
        quranReminderEnabled: quranStr === '1',
      };
    } else if (parts.length === 3) {
      // Legacy format support
      const [latLon, methodStr, remindersStr] = parts;
      const [lat, lon] = latLon.split(',').map(Number);
      fingerprint = {
        location: { latitude: lat, longitude: lon, label: '' },
        methodId: parseInt(methodStr, 10),
        remindersEnabled: remindersStr === '1',
        reminderOffsetMinutes: 15,
        quranReminderEnabled: false,
      };
    }
  }

  return { status, nextPrayer, scheduledCounts, fingerprint };
}
