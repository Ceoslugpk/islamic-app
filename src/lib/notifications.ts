import * as Notifications from 'expo-notifications';
import { Platform, Linking, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DayTimings, Location } from './prayerTimes';
import { markSalahCompleted } from './db';
import * as Haptics from 'expo-haptics';
import { buildDeepLink } from './deeplinks';
import {
  PrayerConfigs,
  DEFAULT_PRAYER_CONFIGS,
  PrayerNameKey,
  QuranGoalConfig,
} from './settings';
import { stopAdhan } from './audio';
import { isQuranDailyGoalCompleted } from './quranProgress';

const FINGERPRINT_KEY = 'notification-fingerprint';

/**
 * Local notification scheduling (permissions, categories, scheduling, cancel) is
 * native-only: on web, expo-notifications ships a stub scheduler whose methods
 * throw `UnavailabilityError`. Callers must use this to skip the scheduling flow
 * instead of letting an unhandled rejection abort their state updates.
 */
export function isNotificationSchedulingSupported(): boolean {
  return Platform.OS !== 'web';
}

export interface NotificationFingerprint {
  location: Location;
  methodId: number;
  remindersEnabled: boolean;
  reminderOffsetMinutes: number;
  quranReminderEnabled: boolean;
  madhab?: string;
  timezone?: string;
  dateStr?: string;
  prayerConfigsStr?: string;
  quranReminderTime?: string;
}

export interface NotificationHealth {
  status: 'active' | 'paused' | 'permission-needed';
  nextPrayer: { name: string; time: string } | null;
  scheduledCounts: { today: number; tomorrow: number };
  fingerprint: NotificationFingerprint | null;
}

// Configure notification presentation and Android channel.
// Never throws: a failed/partial configuration must not abort the caller
// (e.g. a settings toggle that awaits this before updating its state).
export async function configureNotifications() {
  if (!isNotificationSchedulingSupported()) return;

  try {
    Notifications.setNotificationHandler({
      handleNotification: async (notification) => {
        const isNowPlaying = notification?.request?.content?.data?.nowPlaying === true;
        const isQuranReminder = notification?.request?.content?.data?.type === 'quran-reminder';

        // Suppress Quran reminder if today's goal was already completed
        if (isQuranReminder) {
          try {
            const completed = await isQuranDailyGoalCompleted();
            if (completed) {
              return {
                shouldShowBanner: false,
                shouldShowList: false,
                shouldPlaySound: false,
                shouldSetBadge: false,
              };
            }
          } catch {
            // ignore
          }
        }

        return {
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: isNowPlaying ? false : true,
          shouldSetBadge: false,
        };
      },
    });
  } catch {
    // presentation handler unsupported on this platform
  }

  if (Platform.OS === 'android') {
    try {
      // 1. Full adhan sound + vibration (default high priority)
      await Notifications.setNotificationChannelAsync('prayer-times-adhan', {
        name: 'Prayer times (Adhan & Vibration)',
        importance: Notifications.AndroidImportance.MAX,
        sound: 'default',
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#D97706',
        enableVibrate: true,
        showBadge: true,
      });

      // 2. Sound only channel (no vibration)
      await Notifications.setNotificationChannelAsync('prayer-times-sound-only', {
        name: 'Prayer times (Sound only)',
        importance: Notifications.AndroidImportance.HIGH,
        sound: 'default',
        enableVibrate: false,
        lightColor: '#D97706',
        showBadge: true,
      });

      // 3. Vibration only channel (silent sound)
      await Notifications.setNotificationChannelAsync('prayer-times-vibrate-only', {
        name: 'Prayer times (Vibration only)',
        importance: Notifications.AndroidImportance.HIGH,
        sound: null as any,
        vibrationPattern: [0, 250, 250, 250],
        enableVibrate: true,
        lightColor: '#D97706',
        showBadge: true,
      });

      // 4. Silent channel
      await Notifications.setNotificationChannelAsync('prayer-times-silent', {
        name: 'Prayer times (Silent)',
        importance: Notifications.AndroidImportance.DEFAULT,
        sound: null as any,
        enableVibrate: false,
        showBadge: true,
      });

      // 5. Quran reminder channel
      await Notifications.setNotificationChannelAsync('quran-reminders', {
        name: 'Quran Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        sound: 'default',
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#10B981',
        enableVibrate: true,
        showBadge: true,
      });
    } catch {
      // channel registration failed; fall through to categories
    }
  }

  // Define notification categories with actionable buttons
  try {
    // At-prayer notification category: Mark Prayed, Stop Adhan, Snooze 10m
    await Notifications.setNotificationCategoryAsync('prayer-at', [
      {
        identifier: 'mark-complete',
        buttonTitle: 'Mark Prayed',
        options: { opensAppToForeground: false },
      },
      {
        identifier: 'stop-adhan',
        buttonTitle: 'Stop Adhan',
        options: { opensAppToForeground: false },
      },
      {
        identifier: 'prayer-snooze',
        buttonTitle: 'Snooze (10m)',
        options: { opensAppToForeground: false },
      },
    ]);

    // Pre-prayer countdown category: Open Prayer, Snooze 10m
    await Notifications.setNotificationCategoryAsync('prayer-before', [
      {
        identifier: 'open-prayer',
        buttonTitle: 'Open Prayer',
        options: { opensAppToForeground: true },
      },
      {
        identifier: 'prayer-snooze',
        buttonTitle: 'Snooze (10m)',
        options: { opensAppToForeground: false },
      },
    ]);

    // Unified prayer category (supports mark-complete, stop-adhan, snooze, open-prayer)
    await Notifications.setNotificationCategoryAsync('prayer', [
      {
        identifier: 'mark-complete',
        buttonTitle: 'Mark Prayed',
        options: { opensAppToForeground: false },
      },
      {
        identifier: 'stop-adhan',
        buttonTitle: 'Stop Adhan',
        options: { opensAppToForeground: false },
      },
      {
        identifier: 'prayer-snooze',
        buttonTitle: 'Snooze (10m)',
        options: { opensAppToForeground: false },
      },
      {
        identifier: 'open-prayer',
        buttonTitle: 'Open Prayer',
        options: { opensAppToForeground: true },
      },
    ]);

    // Quran reminder category: Read Now, Snooze 10m, Dismiss
    await Notifications.setNotificationCategoryAsync('quran', [
      {
        identifier: 'read-now',
        buttonTitle: 'Read Now',
        options: { opensAppToForeground: true },
      },
      {
        identifier: 'quran-snooze',
        buttonTitle: 'Snooze (10m)',
        options: { opensAppToForeground: false },
      },
      {
        identifier: 'quran-dismiss',
        buttonTitle: 'Dismiss',
        options: { opensAppToForeground: false },
      },
    ]);
  } catch {
    // categories unsupported (throws UnavailabilityError on web)
  }
}

function getDeviceTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

function todayDdmmyyyy(d = new Date()): string {
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}-${month}-${d.getFullYear()}`;
}

function prayerConfigsToString(pcfg: PrayerConfigs): string {
  const keys: PrayerNameKey[] = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
  return keys
    .map((k) => {
      const c = pcfg[k] || { enabled: true, adhan: true, vibration: true };
      return `${k}:${c.enabled ? 1 : 0}${c.adhan ? 1 : 0}${c.vibration ? 1 : 0}`;
    })
    .join(';');
}

function computeFingerprint(
  location: Location,
  methodId: number,
  remindersEnabled: boolean,
  reminderOffsetMinutes: number,
  quranReminderEnabled: boolean,
  madhab: string = 'shafi',
  prayerConfigs: PrayerConfigs = DEFAULT_PRAYER_CONFIGS,
  quranReminderTime: string = '20:00'
): NotificationFingerprint {
  return {
    location: { latitude: location.latitude, longitude: location.longitude, label: location.label },
    methodId,
    remindersEnabled,
    reminderOffsetMinutes,
    quranReminderEnabled,
    madhab,
    timezone: getDeviceTimezone(),
    dateStr: todayDdmmyyyy(),
    prayerConfigsStr: prayerConfigsToString(prayerConfigs),
    quranReminderTime,
  };
}

function fingerprintToString(fp: NotificationFingerprint): string {
  return `${fp.location.latitude.toFixed(4)},${fp.location.longitude.toFixed(4)}|${fp.methodId}|${fp.remindersEnabled ? 1 : 0}|${fp.reminderOffsetMinutes}|${fp.quranReminderEnabled ? 1 : 0}|${fp.madhab || 'shafi'}|${fp.timezone || 'UTC'}|${fp.dateStr || ''}|${fp.prayerConfigsStr || ''}|${fp.quranReminderTime || '20:00'}`;
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

/**
 * Whether exact alarms are permitted on this device (Android 12+ requires the
 * SCHEDULE_EXACT_ALARM / USE_EXACT_ALARM permission declared in the manifest;
 * older Android allows it by default). expo-notifications DAILY triggers use
 * AlarmManager — when the permission is held they fire precisely; without it
 * they still fire but possibly within a window. We bind the channel here and
 * let scheduling succeed either way (graceful inexact fallback).
 */
export async function canScheduleExactAlarms(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  try {
    // expo-notifications exposes exact-alarm status through the permission response
    // on Android 13+ (USE_EXACT_ALARM). On 12 (API 31-32) SCHEDULE_EXACT_ALARM is
    // requested via the OS settings; we check the notification permission status
    // which reflects the grant.
    const perms = await Notifications.getPermissionsAsync();
    if (perms.status === 'granted') return true;
    return false;
  } catch {
    return true; // unknown — assume granted, scheduling failures degrade gracefully
  }
}

/**
 * Request exact-alarm scheduling permission on Android 12+ (API 31-32 needs the
 * runtime SCHEDULE_EXACT_ALARM grant; API 33+ grants USE_EXACT_ALARM via the
 * notification permission request). Best-effort: on failure the daily triggers
 * still fire inexactly (graceful degradation), and Settings guides the user.
 */
export async function requestExactAlarmPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

/**
 * Build a daily repeating trigger bound to the prayer-times-adhan channel.
 * expo-notifications DAILY triggers are delivered via AlarmManager; with
 * SCHEDULE_EXACT_ALARM declared they are exact on Android 12+.
 */
export async function buildDailyTrigger(
  hour: number,
  minute: number
): Promise<Notifications.NotificationTriggerInput> {
  return {
    type: Notifications.SchedulableTriggerInputTypes.DAILY,
    hour,
    minute,
    channelId: Platform.OS === 'android' ? 'prayer-times-adhan' : undefined,
  } as Notifications.NotificationTriggerInput;
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

export const MEDIA_NOTIFICATION_PERMISSION_ASKED_KEY = 'media-notification-permission-asked-v1';

let isMediaPermissionRequestInFlight = false;

/**
 * Checks if media notification permission was previously asked for Quran audio.
 */
export async function hasAskedMediaNotificationPermission(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(MEDIA_NOTIFICATION_PERMISSION_ASKED_KEY);
    return raw === 'true';
  } catch {
    return false;
  }
}

/**
 * Resets media notification permission asked state (for testing).
 */
export async function resetMediaNotificationPermissionAsked(): Promise<void> {
  try {
    await AsyncStorage.removeItem(MEDIA_NOTIFICATION_PERMISSION_ASKED_KEY);
  } catch {}
}

/**
 * Ensures notification permission for Quran audio playback / lock-screen controls.
 * - Only prompts on platforms where notification permission is required for media controls (Android 13+).
 * - On iOS and web, native lock-screen / Control Center / MediaSession work without notification permission.
 * - If permission is undetermined and not previously asked:
 *     Shows a clear rationale Alert explaining that it is needed for lock-screen & background playback controls.
 *     If user accepts, requests permission.
 *     If user declines or dismisses, marks asked so they are NEVER repeatedly prompted.
 * - If previously denied, does NOT prompt with system dialog (Settings UI provides a link to app settings).
 * - Fire-and-forget safe: will never block playback start.
 */
export async function ensureNotificationPermissionForPlayback(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return true;
  }

  if (isMediaPermissionRequestInFlight) {
    return false;
  }

  try {
    isMediaPermissionRequestInFlight = true;

    const alreadyAsked = await hasAskedMediaNotificationPermission();
    if (alreadyAsked) {
      const current = await checkNotificationPermission();
      return current === 'granted';
    }

    const currentStatus = await checkNotificationPermission();
    if (currentStatus === 'granted') {
      await AsyncStorage.setItem(MEDIA_NOTIFICATION_PERMISSION_ASKED_KEY, 'true').catch(() => {});
      return true;
    }

    if (currentStatus === 'denied') {
      // Previously denied in OS: never repeatedly prompt
      await AsyncStorage.setItem(MEDIA_NOTIFICATION_PERMISSION_ASKED_KEY, 'true').catch(() => {});
      return false;
    }

    // Undetermined: show rationale alert explaining background & lock-screen media controls
    const proceed = await new Promise<boolean>((resolve) => {
      Alert.alert(
        'Playback & Lock Screen Controls',
        'Enable notifications to control Quran recitation from your lock screen, notification shade, and headphones while listening in the background.',
        [
          {
            text: 'Not now',
            style: 'cancel',
            onPress: () => resolve(false),
          },
          {
            text: 'Enable controls',
            onPress: () => resolve(true),
          },
        ],
        { cancelable: true, onDismiss: () => resolve(false) }
      );
    });

    // Mark that we have prompted, regardless of user choice (do not badger)
    await AsyncStorage.setItem(MEDIA_NOTIFICATION_PERMISSION_ASKED_KEY, 'true').catch(() => {});

    if (!proceed) {
      return false;
    }

    const granted = await requestNotificationPermission();
    if (granted) {
      await configureNotifications().catch(() => {});
    }
    return granted;
  } catch {
    return false;
  } finally {
    isMediaPermissionRequestInFlight = false;
  }
}

/**
 * Reschedule prayer notifications if the fingerprint (location/method/reminders/timezone/date) has changed.
 * Call on app start, AppState active, and when relevant settings change.
 */
export async function rescheduleIfNeeded(
  location: Location,
  methodId: number,
  remindersEnabled: boolean,
  reminderOffsetMinutes: number,
  quranReminderEnabled: boolean,
  madhab: string = 'shafi',
  prayerConfigs: PrayerConfigs = DEFAULT_PRAYER_CONFIGS,
  quranReminderTime: string = '20:00',
  quranGoal?: QuranGoalConfig
): Promise<boolean> {
  if (!remindersEnabled && !quranReminderEnabled) {
    await cancelPrayerNotifications();
    await cancelQuranReminder();
    await clearStoredFingerprint();
    return false;
  }

  if (!isNotificationSchedulingSupported()) {
    // Web cannot schedule — don't store a fingerprint that claims otherwise.
    return false;
  }

  const currentFp = computeFingerprint(
    location,
    methodId,
    remindersEnabled,
    reminderOffsetMinutes,
    quranReminderEnabled,
    madhab,
    prayerConfigs,
    quranReminderTime
  );
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
    // Ensure exact-alarm permission on Android 12+ so DAILY triggers fire on time
    // (pre-prayer 5/10/15-min notices depend on this). Best-effort — inexact fallback
    // still works, just possibly delayed.
    if (Platform.OS === 'android') {
      await requestExactAlarmPermission();
    }
    const { fetchPrayerTimes } = await import('./prayerTimes');
    // fetchPrayerTimes is cache-aware: serves cached schedule without network when offline
    const data = await fetchPrayerTimes(location, methodId, new Date(), { madhab: madhab as any });
    await cancelPrayerNotifications();
    await cancelQuranReminder();
    if (remindersEnabled) {
      await schedulePrayerNotifications(data, reminderOffsetMinutes, location.label, prayerConfigs);
    }
    if (quranReminderEnabled) {
      await scheduleQuranReminder(quranReminderTime, quranGoal);
    }
    await storeFingerprint(currentFp);
    return true;
  } catch {
    return false;
  }
}

/**
 * Schedule notifications per prayer as daily repeat triggers:
 * - Before prayer (at offset minutes before): "🕌 Maghrib in 15 minutes" / "Dubai · 18:21"
 * - At prayer time: "🕌 Maghrib" / "It's time for Maghrib."
 * Uses channels with sound and vibration per user preferences.
 * Pre-prayer notification is skipped when reminderOffsetMinutes === 0 (Off).
 */
export async function schedulePrayerNotifications(
  timings: DayTimings,
  reminderOffsetMinutes = 15,
  locationLabel?: string,
  prayerConfigs: PrayerConfigs = DEFAULT_PRAYER_CONFIGS
): Promise<string[]> {
  const ids: string[] = [];

  if (!isNotificationSchedulingSupported()) return ids;

  const prayers: { name: PrayerNameKey; time: string }[] = [
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

    const config = prayerConfigs[p.name] ?? { enabled: true, adhan: true, vibration: true };
    if (!config.enabled) {
      continue; // Per-prayer toggle is OFF
    }

    // Determine Android channel based on adhan (sound) and vibration toggles
    let channelId = 'prayer-times-adhan';
    if (config.adhan && config.vibration) {
      channelId = 'prayer-times-adhan';
    } else if (config.adhan && !config.vibration) {
      channelId = 'prayer-times-sound-only';
    } else if (!config.adhan && config.vibration) {
      channelId = 'prayer-times-vibrate-only';
    } else {
      channelId = 'prayer-times-silent';
    }

    // 1. Before prayer notification (daily repeating trigger at offset minutes before)
    // Only scheduled when reminderOffsetMinutes > 0 (Off = 0)
    if (reminderOffsetMinutes > 0) {
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
            data: { prayer: p.name, type: 'prayer-before', url: buildDeepLink({ type: 'tracker' }) },
            categoryIdentifier: 'prayer-before',
            sound: config.adhan ? 'default' : undefined,
            vibrate: config.vibration ? [0, 250, 250, 250] : undefined,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour: beforeHour,
            minute: beforeMinute,
            channelId: Platform.OS === 'android' ? channelId : undefined,
          } as Notifications.NotificationTriggerInput,
        });
        ids.push(beforeId);
      } catch {
        // skip on scheduling failure
      }
    }

    // 2. At prayer time notification (daily repeating trigger at prayer time)
    try {
      const atId = await Notifications.scheduleNotificationAsync({
        content: {
          title: `🕌 ${p.name}`,
          body: `It's time for ${p.name}.`,
          data: {
            prayer: p.name,
            type: 'prayer-at',
            url: buildDeepLink({ type: 'tracker' }),
            playAdhan: config.adhan,
          },
          categoryIdentifier: 'prayer-at',
          sound: config.adhan ? 'default' : undefined,
          vibrate: config.vibration ? [0, 250, 250, 250] : undefined,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: h,
          minute: m,
          channelId: Platform.OS === 'android' ? channelId : undefined,
        } as Notifications.NotificationTriggerInput,
      });
      ids.push(atId);
    } catch {
      // skip on scheduling failure
    }
  }

  return ids;
}

/**
 * Cancel scheduled prayer notifications.
 * The Quran reminder is intentionally preserved — it has its own toggle and is
 * cancelled by `cancelQuranReminder()`. Anything else (legacy prayer payloads,
 * notifications from older builds) is cancelled.
 */
export async function cancelPrayerNotifications() {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const n of scheduled) {
      const data = n.content.data as { type?: string } | undefined;
      if (data?.type === 'quran-reminder') continue;
      await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
  } catch {
    // ignore (unsupported platform or nothing scheduled)
  }
}

/** Schedule daily Quran reminder notification with configurable time (default 20:00). */
export async function scheduleQuranReminder(
  timeStr: string = '20:00',
  goal?: QuranGoalConfig
): Promise<string | null> {
  try {
    if (!isNotificationSchedulingSupported()) return null;

    // Suppress reminder if today's goal was already completed
    if (goal) {
      const completed = await isQuranDailyGoalCompleted(goal);
      if (completed) {
        return null;
      }
    }

    const { getReadingPosition } = await import('./continuing');
    const { SURAHS_114 } = await import('./surahs114');

    const position = await getReadingPosition();
    const surah = position ? SURAHS_114.find((s) => s.number === position.surah) : undefined;
    const title = '📖 Continue your Quran';
    const body =
      position && surah
        ? `You stopped at ${surah.englishName} ${position.surah}:${position.ayah}.`
        : 'Open the Quran and keep your daily reading habit alive.';
    const data: Record<string, unknown> = { type: 'quran-reminder' };
    if (position) {
      data.url = buildDeepLink({ type: 'quran', surah: position.surah, ayah: position.ayah });
    }

    const [hStr, mStr] = timeStr.split(':');
    const hour = parseInt(hStr || '20', 10);
    const minute = parseInt(mStr || '0', 10);

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: 'default',
        data,
        categoryIdentifier: 'quran',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: isNaN(hour) ? 20 : hour,
        minute: isNaN(minute) ? 0 : minute,
        channelId: Platform.OS === 'android' ? 'quran-reminders' : undefined,
      },
    });
    return id;
  } catch {
    return null;
  }
}

/**
 * Cancel only the daily Quran reminder.
 */
export async function cancelQuranReminder() {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const n of scheduled) {
      const data = n.content.data as { type?: string } | undefined;
      if (data?.type !== 'quran-reminder') continue;
      await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
  } catch {
    // ignore (unsupported platform or nothing scheduled)
  }
}

/** Notification response listener setup - call once at app startup. */
export function setupNotificationResponseHandler() {
  Notifications.addNotificationResponseReceivedListener((response) => {
    const { actionIdentifier, notification } = response;
    const data = notification.request.content.data as
      | { url?: string; prayer?: string; date?: string; type?: string }
      | undefined;

    // Handle deep link from notification tap (when user taps notification body)
    if (actionIdentifier === 'default') {
      if (data?.url) {
        Linking.openURL(data.url).catch(() => {});
      }
      return;
    }

    // Action: Open Prayer / Salah tracker
    if (actionIdentifier === 'open-prayer') {
      Linking.openURL('salah://tracker').catch(() => {});
      return;
    }

    // Action: Mark Prayed / Mark Complete
    if (actionIdentifier === 'mark-complete' || actionIdentifier === 'mark-prayed') {
      if (data?.prayer) {
        const currentDate = new Date();
        const dateStr =
          data.date ||
          `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
        markSalahCompleted(dateStr, data.prayer, true);
        stopAdhan().catch(() => {});
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        } catch {
          // haptics not available
        }
      }
      return;
    }

    // Action: Stop Adhan
    if (actionIdentifier === 'stop-adhan') {
      stopAdhan().catch(() => {});
      return;
    }

    // Action: Snooze 10 min for prayer
    if (actionIdentifier === 'prayer-snooze') {
      stopAdhan().catch(() => {});
      const prayerName = data?.prayer || 'Prayer';
      Notifications.scheduleNotificationAsync({
        content: {
          title: `🕌 ${prayerName} (Snoozed 10m)`,
          body: `Reminder for ${prayerName} prayer.`,
          data: { prayer: prayerName, type: 'prayer-snooze', url: buildDeepLink({ type: 'tracker' }) },
          categoryIdentifier: 'prayer',
          sound: 'default',
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: 600,
        },
      }).catch(() => {});
      return;
    }

    // Action: Read Now (Quran)
    if (actionIdentifier === 'read-now') {
      if (data?.url) {
        Linking.openURL(data.url).catch(() => {});
      } else {
        Linking.openURL('salah://quran/1').catch(() => {});
      }
      return;
    }

    // Action: Snooze Quran Reminder (10m)
    if (actionIdentifier === 'quran-snooze') {
      Notifications.scheduleNotificationAsync({
        content: {
          title: '📖 Continue your Quran (Snoozed 10m)',
          body: 'Open the Quran and keep your daily reading habit alive.',
          data: { ...data, type: 'quran-reminder' },
          categoryIdentifier: 'quran',
          sound: 'default',
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: 600,
        },
      }).catch(() => {});
      return;
    }

    // Action: Dismiss Quran Reminder
    if (actionIdentifier === 'quran-dismiss') {
      Notifications.dismissNotificationAsync(notification.request.identifier).catch(() => {});
      return;
    }
  });
}

/** Stop Adhan helper for UI and background handlers */
export async function stopAdhanPlayback(): Promise<void> {
  await stopAdhan();
}

/** Snooze prayer reminder for N minutes (default 10) */
export async function snoozePrayer(prayerName?: string, minutes = 10): Promise<void> {
  await stopAdhan();
  const name = prayerName || 'Prayer';
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `🕌 ${name} (Snoozed ${minutes}m)`,
      body: `Reminder for ${name} prayer.`,
      data: { prayer: name, type: 'prayer-snooze', url: buildDeepLink({ type: 'tracker' }) },
      categoryIdentifier: 'prayer',
      sound: 'default',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: minutes * 60,
    },
  });
}

/** Send immediate test prayer alert (sound & vibration test per channel) */
export async function sendTestPrayerNotification(
  prayerName: PrayerNameKey = 'Fajr',
  channelId: string = 'prayer-times-adhan'
): Promise<string | null> {
  if (!isNotificationSchedulingSupported()) return null;
  const permission = await checkNotificationPermission();
  if (permission !== 'granted') return null;
  await configureNotifications();
  return await Notifications.scheduleNotificationAsync({
    content: {
      title: `🕌 Test: ${prayerName} Prayer Alert`,
      body: `This is a test notification for ${prayerName} to verify sound, vibration & action buttons.`,
      data: { prayer: prayerName, type: 'prayer-at', url: buildDeepLink({ type: 'tracker' }) },
      categoryIdentifier: 'prayer-at',
      sound: channelId === 'prayer-times-silent' || channelId === 'prayer-times-vibrate-only' ? undefined : 'default',
      vibrate: channelId === 'prayer-times-silent' || channelId === 'prayer-times-sound-only' ? undefined : [0, 250, 250, 250],
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 1,
      channelId: Platform.OS === 'android' ? channelId : undefined,
    },
  });
}

/** Send immediate test pre-prayer countdown alert */
export async function sendTestPrePrayerNotification(
  prayerName: PrayerNameKey = 'Maghrib',
  offsetMinutes = 15
): Promise<string | null> {
  if (!isNotificationSchedulingSupported()) return null;
  const permission = await checkNotificationPermission();
  if (permission !== 'granted') return null;
  await configureNotifications();
  return await Notifications.scheduleNotificationAsync({
    content: {
      title: `🕌 Test: ${prayerName} in ${offsetMinutes} minutes`,
      body: 'Upcoming prayer notice to prepare for Salah.',
      data: { prayer: prayerName, type: 'prayer-before', url: buildDeepLink({ type: 'tracker' }) },
      categoryIdentifier: 'prayer-before',
      sound: 'default',
      vibrate: [0, 250, 250, 250],
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 1,
      channelId: Platform.OS === 'android' ? 'prayer-times-adhan' : undefined,
    },
  });
}

/** Send immediate test Quran reading reminder */
export async function sendTestQuranNotification(): Promise<string | null> {
  if (!isNotificationSchedulingSupported()) return null;
  const permission = await checkNotificationPermission();
  if (permission !== 'granted') return null;
  await configureNotifications();
  const { getReadingPosition } = await import('./continuing');
  const { SURAHS_114 } = await import('./surahs114');
  const position = await getReadingPosition();
  const surah = position ? SURAHS_114.find((s) => s.number === position.surah) : undefined;
  const body =
    position && surah
      ? `You stopped at ${surah.englishName} ${position.surah}:${position.ayah}.`
      : 'Open the Quran and keep your daily reading habit alive.';
  const data: Record<string, unknown> = { type: 'quran-reminder' };
  if (position) {
    data.url = buildDeepLink({ type: 'quran', surah: position.surah, ayah: position.ayah });
  }
  return await Notifications.scheduleNotificationAsync({
    content: {
      title: '📖 Test: Quran Reading Reminder',
      body,
      data,
      categoryIdentifier: 'quran',
      sound: 'default',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 1,
      channelId: Platform.OS === 'android' ? 'quran-reminders' : undefined,
    },
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
  } else if (!isNotificationSchedulingSupported()) {
    // Web can't schedule local notifications — report "paused" (not "active" or
    // "permission needed") and let the UI explain that reminders run on device.
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
    if (parts.length >= 6) {
      const [latLon, methodStr, remindersStr, offsetStr, quranStr, madhabStr, tzStr, dStr, pcfgStr, qTimeStr] = parts;
      const [lat, lon] = latLon.split(',').map(Number);
      fingerprint = {
        location: { latitude: lat, longitude: lon, label: '' },
        methodId: parseInt(methodStr, 10),
        remindersEnabled: remindersStr === '1',
        reminderOffsetMinutes: parseInt(offsetStr, 10),
        quranReminderEnabled: quranStr === '1',
        madhab: madhabStr || 'shafi',
        timezone: tzStr,
        dateStr: dStr,
        prayerConfigsStr: pcfgStr,
        quranReminderTime: qTimeStr,
      };
    } else if (parts.length === 5) {
      const [latLon, methodStr, remindersStr, offsetStr, quranStr] = parts;
      const [lat, lon] = latLon.split(',').map(Number);
      fingerprint = {
        location: { latitude: lat, longitude: lon, label: '' },
        methodId: parseInt(methodStr, 10),
        remindersEnabled: remindersStr === '1',
        reminderOffsetMinutes: parseInt(offsetStr, 10),
        quranReminderEnabled: quranStr === '1',
        madhab: 'shafi',
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
        madhab: 'shafi',
      };
    }
  }

  return { status, nextPrayer, scheduledCounts, fingerprint };
}
