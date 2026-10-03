import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DayTimings, Location } from './prayerTimes';
import { markSalahCompleted } from './db';
import { buildDeepLink } from './deeplinks';

const FINGERPRINT_KEY = 'notification-fingerprint';
const LAST_SCHEDULE_KEY = 'last-notification-schedule';

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

  // Define notification category with "Mark Complete" action
  await Notifications.setNotificationCategoryAsync('prayer', [
    {
      identifier: 'mark-complete',
      buttonTitle: 'Mark Complete',
      options: { opensAppToForeground: false },
    },
  ]);
}

function computeFingerprint(location: Location, methodId: number, remindersEnabled: boolean, reminderOffsetMinutes: number, quranReminderEnabled: boolean): NotificationFingerprint {
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
 * Schedule TWO notifications per prayer:
 * - Before prayer (at offset minutes before): countdown style "🕌 Maghrib in 15 minutes" / "Dubai · 18:21"
 * - At prayer time: "🕌 Maghrib" / "It's time for Maghrib."
 * Returns the notification IDs so callers can cancel/reschedule.
 */
export async function schedulePrayerNotifications(
  timings: DayTimings,
  reminderOffsetMinutes = 15,
  locationLabel?: string
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

  const prayerDate = new Date();
  const dateStr = prayerDate.toISOString().slice(0, 10);
  const label = locationLabel || 'Unknown';

  for (const p of prayers) {
    if (!p.time || !p.time.includes(':')) continue;
    const [h, m] = p.time.split(':').map(Number);
    
    // Before prayer notification (at offset minutes before)
    const beforeTriggerDate = new Date();
    beforeTriggerDate.setHours(h, m - reminderOffsetMinutes, 0, 0);
    
    if (beforeTriggerDate.getTime() > now) {
      try {
        const id = await Notifications.scheduleNotificationAsync({
          content: {
            title: `🕌 ${p.name} in ${reminderOffsetMinutes} minutes`,
            body: `${label} · ${p.time}`,
            sound: 'default',
            data: { prayer: p.name, date: dateStr, type: 'prayer-before', url: buildDeepLink({ type: 'tracker' }) },
            categoryIdentifier: 'prayer',
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: beforeTriggerDate,
            channelId: Platform.OS === 'android' ? 'prayer-times' : undefined,
          },
        });
        ids.push(id);
      } catch (e) {
        // notification scheduling failed; skip this prayer
      }
    }

    // At prayer time notification
    const atTriggerDate = new Date();
    atTriggerDate.setHours(h, m, 0, 0);
    
    if (atTriggerDate.getTime() > now) {
      try {
        const id = await Notifications.scheduleNotificationAsync({
          content: {
            title: `🕌 ${p.name}`,
            body: `It's time for ${p.name}.`,
            sound: 'default',
            data: { prayer: p.name, date: dateStr, type: 'prayer-at', url: buildDeepLink({ type: 'tracker' }) },
            categoryIdentifier: 'prayer',
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: atTriggerDate,
            channelId: Platform.OS === 'android' ? 'prayer-times' : undefined,
          },
        });
        ids.push(id);
      } catch (e) {
        // notification scheduling failed; skip this prayer
      }
    }
  }

  return ids;
}

/** Cancel all previously scheduled prayer notifications. */
export async function cancelPrayerNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/** Schedule daily Quran reminder notification at 20:00. */
export async function scheduleQuranReminder(): Promise<string | null> {
  try {
    const { getReadingPosition } = await import('./continuing');
    const { SURAHS_114 } = await import('./surahs114');
    
    const position = await getReadingPosition();
    if (!position) return null;
    
    const surah = SURAHS_114.find(s => s.number === position.surah);
    const surahName = surah?.englishName || `Surah ${position.surah}`;
    
    const now = new Date();
    const triggerDate = new Date();
    triggerDate.setHours(20, 0, 0, 0); // 8:00 PM daily
    
    // If 20:00 has already passed today, schedule for tomorrow
    if (triggerDate.getTime() <= now.getTime()) {
      triggerDate.setDate(triggerDate.getDate() + 1);
    }
    
    // Use a repeating trigger for daily reminder
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
  // We can't easily cancel just the quran reminder without knowing its ID,
  // so we cancel all and reschedule prayers if needed. 
  // The rescheduleIfNeeded handles this by canceling all and re-scheduling.
}

/** Notification response listener setup - call once at app startup. */
export function setupNotificationResponseHandler() {
  Notifications.addNotificationResponseReceivedListener((response) => {
    const { actionIdentifier, notification } = response;
    const data = notification.request.content.data as { url?: string } | undefined;
    
    // Handle deep link from notification tap (when user taps notification body, not action button)
    if (actionIdentifier === 'default' && data?.url) {
      // The URL will be handled by the Linking event listener in App.tsx
      // We just need to ensure the app opens; Expo handles opening the URL
      return;
    }
    
    if (actionIdentifier === 'mark-complete') {
      const prayerData = notification.request.content.data as { prayer?: string; date?: string } | undefined;
      if (prayerData?.prayer && prayerData?.date) {
        markSalahCompleted(prayerData.date, prayerData.prayer, true);
        // Haptic feedback
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
