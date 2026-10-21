import * as Notifications from 'expo-notifications';
import { Platform, Linking, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DayTimings, Location } from './prayerTimes';
import { markSalahCompleted } from './db';
import * as Haptics from 'expo-haptics';
import { buildDeepLink, parseDeepLink } from './deeplinks';
import { sanitizeLocationLabel } from './useLocation';
import {
  PrayerConfigs,
  DEFAULT_PRAYER_CONFIGS,
  PrayerNameKey,
  QuranGoalConfig,
} from './settings';
import { stopAdhan } from './audio';
import { isQuranDailyGoalCompleted } from './quranProgress';
import { t } from './i18n';
import { getLocalDateKey } from './dateKey';
import type { EventSubscription } from 'expo-notifications';

const FINGERPRINT_KEY = 'notification-fingerprint';
const SNOOZE_TARGET_EPOCH_MS_KEY = 'snoozeTargetEpochMs';

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
  prayerTimesStr?: string;
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
        name: t('Notification channel — Prayer times (Adhan & Vibration)'),
        importance: Notifications.AndroidImportance.MAX,
        sound: 'default',
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#D97706',
        enableVibrate: true,
        showBadge: true,
      });

      // 2. Sound only channel (no vibration)
      await Notifications.setNotificationChannelAsync('prayer-times-sound-only', {
        name: t('Notification channel — Prayer times (Sound only)'),
        importance: Notifications.AndroidImportance.HIGH,
        sound: 'default',
        enableVibrate: false,
        lightColor: '#D97706',
        showBadge: true,
      });

      // 3. Vibration only channel (silent sound)
      await Notifications.setNotificationChannelAsync('prayer-times-vibrate-only', {
        name: t('Notification channel — Prayer times (Vibration only)'),
        importance: Notifications.AndroidImportance.HIGH,
        sound: null as any,
        vibrationPattern: [0, 250, 250, 250],
        enableVibrate: true,
        lightColor: '#D97706',
        showBadge: true,
      });

      // 4. Silent channel
      await Notifications.setNotificationChannelAsync('prayer-times-silent', {
        name: t('Notification channel — Prayer times (Silent)'),
        importance: Notifications.AndroidImportance.DEFAULT,
        sound: null as any,
        enableVibrate: false,
        showBadge: true,
      });

      // 5. Quran reminder channel
      await Notifications.setNotificationChannelAsync('quran-reminders', {
        name: t('Notification channel — Quran reminders'),
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
        buttonTitle: t('Mark Prayed'),
        options: { opensAppToForeground: false },
      },
      {
        identifier: 'stop-adhan',
        buttonTitle: t('Stop Adhan'),
        options: { opensAppToForeground: false },
      },
      {
        identifier: 'prayer-snooze',
        buttonTitle: t('Snooze 10m'),
        options: { opensAppToForeground: false },
      },
    ]);

    // Pre-prayer countdown category: Open Prayer, Snooze 10m
    await Notifications.setNotificationCategoryAsync('prayer-before', [
      {
        identifier: 'open-prayer',
        buttonTitle: t('Open Prayer'),
        options: { opensAppToForeground: true },
      },
      {
        identifier: 'prayer-snooze',
        buttonTitle: t('Snooze 10m'),
        options: { opensAppToForeground: false },
      },
    ]);

    // Unified prayer category (supports mark-complete, stop-adhan, snooze, open-prayer)
    await Notifications.setNotificationCategoryAsync('prayer', [
      {
        identifier: 'mark-complete',
        buttonTitle: t('Mark Prayed'),
        options: { opensAppToForeground: false },
      },
      {
        identifier: 'stop-adhan',
        buttonTitle: t('Stop Adhan'),
        options: { opensAppToForeground: false },
      },
      {
        identifier: 'prayer-snooze',
        buttonTitle: t('Snooze 10m'),
        options: { opensAppToForeground: false },
      },
      {
        identifier: 'open-prayer',
        buttonTitle: t('Open Prayer'),
        options: { opensAppToForeground: true },
      },
    ]);

    // Quran reminder category: Read Now, Snooze 10m, Dismiss
    await Notifications.setNotificationCategoryAsync('quran', [
      {
        identifier: 'read-now',
        buttonTitle: t('Read Now'),
        options: { opensAppToForeground: true },
      },
      {
        identifier: 'quran-snooze',
        buttonTitle: t('Snooze 10m'),
        options: { opensAppToForeground: false },
      },
      {
        identifier: 'quran-dismiss',
        buttonTitle: t('Dismiss'),
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

function prayerConfigsToString(pcfg: PrayerConfigs): string {
  const keys: PrayerNameKey[] = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
  return keys
    .map((k) => {
      const c = pcfg[k] || { enabled: true, adhan: true, vibration: true };
      return `${k}:${c.enabled ? 1 : 0}${c.adhan ? 1 : 0}${c.vibration ? 1 : 0}`;
    })
    .join(';');
}

function prayerTimesToString(timings: DayTimings | null | undefined): string {
  const keys: PrayerNameKey[] = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
  return keys
    .map((key) => {
      const raw = timings?.timings?.[key];
      if (typeof raw !== 'string') return '-';
      const match = raw.trim().match(/^(\d{1,2}):(\d{1,2})/);
      if (!match) return raw.trim() || '-';
      const hour = Number(match[1]);
      const minute = Number(match[2]);
      if (!Number.isInteger(hour) || !Number.isInteger(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
        return raw.trim() || '-';
      }
      return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    })
    .join(',');
}

function computeFingerprint(
  location: Location,
  methodId: number,
  remindersEnabled: boolean,
  reminderOffsetMinutes: number,
  quranReminderEnabled: boolean,
  madhab: string = 'shafi',
  prayerConfigs: PrayerConfigs = DEFAULT_PRAYER_CONFIGS,
  quranReminderTime: string = '20:00',
  timings?: DayTimings | null,
): NotificationFingerprint {
  return {
    location: { latitude: location.latitude, longitude: location.longitude, label: location.label },
    methodId,
    remindersEnabled,
    reminderOffsetMinutes,
    quranReminderEnabled,
    madhab,
    timezone: getDeviceTimezone(),
    prayerTimesStr: prayerTimesToString(timings),
    prayerConfigsStr: prayerConfigsToString(prayerConfigs),
    quranReminderTime,
  };
}

function fingerprintToString(fp: NotificationFingerprint): string {
  return `${fp.location.latitude.toFixed(4)},${fp.location.longitude.toFixed(4)}|${fp.methodId}|${fp.remindersEnabled ? 1 : 0}|${fp.reminderOffsetMinutes}|${fp.quranReminderEnabled ? 1 : 0}|${fp.madhab || 'shafi'}|${fp.timezone || 'UTC'}|times=${fp.prayerTimesStr || ''}|${fp.prayerConfigsStr || ''}|${fp.quranReminderTime || '20:00'}`;
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
  if (!isNotificationSchedulingSupported()) {
    return { today: 0, tomorrow: 0 };
  }
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
        // Time-interval, unknown, and malformed triggers do not establish
        // daily coverage. In particular, a snooze must not make the health
        // check look healthy when a daily reminder is missing.
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
    return { name: t('Fajr (tomorrow)'), time: timings.timings.Fajr };
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
        t('Playback & Lock Screen Controls'),
        t('Enable notifications to control Quran recitation from your lock screen, notification shade, and headphones while listening in the background.'),
        [
          {
            text: t('Not now'),
            style: 'cancel',
            onPress: () => resolve(false),
          },
          {
            text: t('Enable controls'),
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
 * Reschedule prayer notifications if the fingerprint (location/method/reminders/timezone/times) has changed.
 * Call on app start, AppState active, and when relevant settings change.
 */
export const NOTIFICATION_RESCHEDULE_TIMEOUT_MS = 10_000;

interface RescheduleRun {
  cancelled: boolean;
  destructiveStarted: boolean;
}

function withRescheduleTimeout<T>(
  operation: Promise<T>,
  onTimeout: () => void,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      onTimeout();
      reject(new Error('Notification reschedule timed out'));
    }, NOTIFICATION_RESCHEDULE_TIMEOUT_MS);

    operation.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

let rescheduleTail: Promise<void> = Promise.resolve();

export function rescheduleIfNeeded(
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
  const run: RescheduleRun = { cancelled: false, destructiveStarted: false };
  let releaseBeforeNativeWork: (() => void) | null = null;
  const abandonedBeforeNativeWork = new Promise<void>((resolve) => {
    releaseBeforeNativeWork = resolve;
  });
  const previousTail = rescheduleTail;
  const internal = previousTail.then(() => rescheduleIfNeededInternal(
    location,
    methodId,
    remindersEnabled,
    reminderOffsetMinutes,
    quranReminderEnabled,
    madhab,
    prayerConfigs,
    quranReminderTime,
    quranGoal,
    run,
  ));
  const task = previousTail.then(() => withRescheduleTimeout(
    internal,
    () => {
      run.cancelled = true;
      // A run that has not started scheduled-notification mutation is safe to
      // abandon from the queue. Once mutation starts, keep the tail blocked
      // until cancel → schedule reconciliation has completed.
      if (!run.destructiveStarted) releaseBeforeNativeWork?.();
    },
  ));
  // The timeout only bounds the caller's wait. The queue remains serialized
  // across all native state mutation, even after a caller has timed out.
  rescheduleTail = Promise.race([
    internal.then(() => undefined, () => undefined),
    abandonedBeforeNativeWork,
  ]);
  return task;
}

async function rescheduleIfNeededInternal(
  location: Location,
  methodId: number,
  remindersEnabled: boolean,
  reminderOffsetMinutes: number,
  quranReminderEnabled: boolean,
  madhab: string = 'shafi',
  prayerConfigs: PrayerConfigs = DEFAULT_PRAYER_CONFIGS,
  quranReminderTime: string = '20:00',
  quranGoal?: QuranGoalConfig,
  run: RescheduleRun = { cancelled: false, destructiveStarted: false },
): Promise<boolean> {
  if (run.cancelled) return false;

  if (!remindersEnabled && !quranReminderEnabled) {
    run.destructiveStarted = true;
    await cancelPrayerNotifications();
    await cancelQuranReminder();
    await clearStoredFingerprint();
    return false;
  }

  if (!isNotificationSchedulingSupported()) {
    // Web cannot schedule — don't store a fingerprint that claims otherwise.
    return false;
  }

  const permission = await checkNotificationPermission();
  if (permission !== 'granted') {
    return false;
  }

  let prayerData: DayTimings | null = null;
  try {
    if (remindersEnabled) {
      const { fetchPrayerTimes } = await import('./prayerTimes');
      // Fetch once for both the fingerprint and the schedule. The prayer-time
      // values, rather than the calendar date, decide whether DAILY triggers
      // need to be replaced.
      prayerData = await fetchPrayerTimes(location, methodId, new Date(), { madhab: madhab as any });
      if (run.cancelled) return false;
    }

    const currentFp = computeFingerprint(
      location,
      methodId,
      remindersEnabled,
      reminderOffsetMinutes,
      quranReminderEnabled,
      madhab,
      prayerConfigs,
      quranReminderTime,
      prayerData,
    );
    const currentFpStr = fingerprintToString(currentFp);
    const storedFpStr = await getStoredFingerprint();
    if (run.cancelled) return false;

    if (currentFpStr === storedFpStr) {
      // Fingerprint matches, check if we actually have notifications scheduled
      const { today, tomorrow } = await getScheduledNotificationsHealth();
      if (run.cancelled) return false;
      if (today > 0 || tomorrow > 0) {
        return false; // Already scheduled and up to date
      }
      // No notifications scheduled despite matching fingerprint - reschedule
    }

    // Fingerprint changed or no notifications - reschedule
    await configureNotifications();
    if (run.cancelled) return false;
    // Ensure exact-alarm permission on Android 12+ so DAILY triggers fire on time
    // (pre-prayer 5/10/15-min notices depend on this). Best-effort — inexact fallback
    // still works, just possibly delayed.
    if (Platform.OS === 'android') {
      await requestExactAlarmPermission();
      if (run.cancelled) return false;
    }
    // Snapshot pending user-initiated snoozes before reschedule cycle
    const pendingSnoozes = (await Notifications.getAllScheduledNotificationsAsync().catch(() => [])).filter(
      (n) => {
        const type = (n.content?.data as { type?: string } | undefined)?.type;
        return type === 'prayer-snooze' || type === 'quran-snooze';
      }
    );
    if (run.cancelled) return false;

    // From this point the native notification set is being replaced. Do not
    // abort between cancel and schedule: the timeout caller may stop waiting,
    // but the in-flight native work must finish and reconcile the set.
    run.destructiveStarted = true;
    await cancelPrayerNotifications();
    await cancelQuranReminder();
    if (remindersEnabled && prayerData) {
      await schedulePrayerNotifications(prayerData, reminderOffsetMinutes, location.label, prayerConfigs);
    }
    if (quranReminderEnabled) {
      await scheduleQuranReminder(quranReminderTime, quranGoal);
    }

    // Explicitly ensure any pending snooze remains scheduled after reschedule
    const afterScheduled = await Notifications.getAllScheduledNotificationsAsync().catch(() => []);
    const scheduledIds = new Set(afterScheduled.map((n) => n.identifier));
    for (const snooze of pendingSnoozes) {
      if (!scheduledIds.has(snooze.identifier)) {
        const trigger = snooze.trigger as any;
        const snoozeData = snooze.content?.data as { [SNOOZE_TARGET_EPOCH_MS_KEY]?: unknown } | undefined;
        const targetEpochMs = Number(snoozeData?.[SNOOZE_TARGET_EPOCH_MS_KEY]);
        const fallbackSeconds = typeof trigger?.seconds === 'number' ? trigger.seconds : 600;
        const seconds = Number.isFinite(targetEpochMs)
          ? Math.ceil((targetEpochMs - Date.now()) / 1000)
          : fallbackSeconds;
        if (seconds <= 0) continue;
        await Notifications.scheduleNotificationAsync({
          content: {
            title: snooze.content.title ?? undefined,
            subtitle: snooze.content.subtitle ?? undefined,
            body: snooze.content.body ?? undefined,
            data: snooze.content.data,
            categoryIdentifier: snooze.content.categoryIdentifier ?? undefined,
            sound: snooze.content.sound ?? 'default',
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds: Math.max(1, seconds),
          },
        }).catch(() => {});
      }
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
  prayerConfigs: PrayerConfigs = DEFAULT_PRAYER_CONFIGS,
  shouldContinue?: () => boolean,
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

  const label = sanitizeLocationLabel(locationLabel) || t('Your Location');

  for (const p of prayers) {
    if (shouldContinue && !shouldContinue()) return ids;
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
            title: t('🕌 {{prayer}} in {{minutes}} minutes', {
              prayer: t(p.name),
              minutes: reminderOffsetMinutes,
            }),
            body: t('{{location}} · {{time}}', { location: label, time: p.time }),
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
        if (shouldContinue && !shouldContinue()) return ids;
      } catch {
        // skip on scheduling failure
      }
    }

    // 2. At prayer time notification (daily repeating trigger at prayer time)
    try {
      const atId = await Notifications.scheduleNotificationAsync({
        content: {
          title: t('🕌 {{prayer}}', { prayer: t(p.name) }),
          body: t("It's time for {{prayer}}.", { prayer: t(p.name) }),
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
      if (shouldContinue && !shouldContinue()) return ids;
    } catch {
      // skip on scheduling failure
    }
  }

  return ids;
}

export const OWNED_PRAYER_NOTIFICATION_TYPES = new Set([
  'prayer-reminder',
  'prayer-before',
  'prayer-at',
  'prayer-adhan',
]);

/**
 * Cancel scheduled prayer notifications.
 * Preserves user-set prayer snooze notifications ('prayer-snooze') and Quran reminders
 * ('quran-reminder', 'quran-snooze'). Cancels only the types owned by the prayer times scheduler,
 * plus legacy typeless notifications from older app builds.
 */
export async function cancelPrayerNotifications(shouldContinue?: () => boolean) {
  if (!isNotificationSchedulingSupported()) return;
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const n of scheduled) {
      if (shouldContinue && !shouldContinue()) return;
      const data = n.content?.data as { type?: string; nowPlaying?: boolean } | undefined;
      const type = data?.type;
      const isLegacyTypeless = !type && !data?.nowPlaying && n.identifier !== 'quran-now-playing';
      if ((type && OWNED_PRAYER_NOTIFICATION_TYPES.has(type)) || isLegacyTypeless) {
        await Notifications.cancelScheduledNotificationAsync(n.identifier);
      }
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

    const { getContinueReadingPosition } = await import('./continuing');
    const { SURAHS_114 } = await import('./surahs114');

    const position = await getContinueReadingPosition();
    const surah = position ? SURAHS_114.find((s) => s.number === position.surah) : undefined;
    const title = t('📖 Continue your Quran');
    const body =
      position && surah
        ? t('You stopped at {{surah}} {{reference}}.', {
            surah: surah.englishName,
            reference: `${position.surah}:${position.ayah}`,
          })
        : t('Open the Quran and keep your daily reading habit alive.');
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

export const OWNED_QURAN_NOTIFICATION_TYPES = new Set([
  'quran-reminder',
]);

/**
 * Cancel only the daily Quran reminder.
 * Preserves user-set Quran snooze notifications ('quran-snooze').
 */
export async function cancelQuranReminder() {
  if (!isNotificationSchedulingSupported()) return;
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const n of scheduled) {
      const data = n.content?.data as { type?: string } | undefined;
      const type = data?.type;
      if (type && OWNED_QURAN_NOTIFICATION_TYPES.has(type)) {
        await Notifications.cancelScheduledNotificationAsync(n.identifier);
      }
    }
  } catch {
    // ignore (unsupported platform or nothing scheduled)
  }
}

/**
 * Validate that an incoming notification URL is a safe, valid app deep link.
 * Rejects tel:, file:, intent:, javascript:, data:, and custom unknown schemes.
 * Only allows salah://, islamic://, or relative paths that parse to a valid DeepLinkTarget.
 */
export function isValidNotificationUrl(url: unknown): boolean {
  if (typeof url !== 'string' || !url) return false;
  const trimmed = url.trim();
  // Reject dangerous or external schemes
  if (/^(javascript|tel|sms|mailto|file|intent|content|data|blob):/i.test(trimmed)) {
    return false;
  }
  // Must be salah:, islamic:, or an app-relative path / route
  const isAllowedScheme = /^(salah:\/\/|salah:|islamic:\/\/|islamic:|\/)/i.test(trimmed);
  if (!isAllowedScheme) {
    return false;
  }
  const target = parseDeepLink(trimmed);
  return target !== null;
}

export interface NotificationResponseData {
  url?: string;
  prayer?: string;
  date?: string;
  type?: string;
  nowPlaying?: boolean;
  [key: string]: unknown;
}

export type NowPlayingResponseDispatcher = (
  actionIdentifier: string,
  data: NotificationResponseData,
) => void;

const NOW_PLAYING_ACTION_IDENTIFIERS = new Set([
  'play-pause',
  'next',
  'previous',
  'stop',
  'skipForward',
  'skipBackward',
  'skip-forward',
  'skip-backward',
]);

let activeResponseSubscription: EventSubscription | null = null;

/** Notification response listener setup - call once at app startup. */
export function setupNotificationResponseHandler(
  onNowPlayingResponse?: NowPlayingResponseDispatcher,
): EventSubscription | null {
  if (!isNotificationSchedulingSupported()) return null;
  if (activeResponseSubscription) return activeResponseSubscription;
  try {
    const nativeSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const { actionIdentifier, notification } = response;
      const data = notification.request.content.data as
        | NotificationResponseData
        | undefined;
      const isDefaultAction =
        actionIdentifier === 'default' || actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER;

      // Media controls share this single response subscription with prayer and
      // Quran reminders. Type and standard media action identifiers are the
      // routing boundary; prayer actions keep their own identifiers.
      if (onNowPlayingResponse && (
        data?.type === 'now-playing' ||
        data?.nowPlaying === true ||
        NOW_PLAYING_ACTION_IDENTIFIERS.has(actionIdentifier) ||
        (isDefaultAction && !data?.url)
      )) {
        onNowPlayingResponse(actionIdentifier, data || {});
        return;
      }

      // Handle deep link from notification tap (when user taps notification body)
      if (isDefaultAction) {
        if (data?.url && isValidNotificationUrl(data.url)) {
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
          const dateStr = data.date || getLocalDateKey(currentDate);
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
        const snoozeTargetEpochMs = Date.now() + 600_000;
        Notifications.scheduleNotificationAsync({
          content: {
            title: t('🕌 {{prayer}} (Snoozed {{minutes}}m)', { prayer: t(prayerName), minutes: 10 }),
            body: t('Reminder for {{prayer}} prayer.', { prayer: t(prayerName) }),
            data: {
              prayer: prayerName,
              type: 'prayer-snooze',
              url: buildDeepLink({ type: 'tracker' }),
              [SNOOZE_TARGET_EPOCH_MS_KEY]: snoozeTargetEpochMs,
            },
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
        const snoozeTargetEpochMs = Date.now() + 600_000;
        Notifications.scheduleNotificationAsync({
          content: {
            title: t('📖 Continue your Quran (Snoozed 10m)'),
            body: t('Open the Quran and keep your daily reading habit alive.'),
            data: { ...data, type: 'quran-snooze', [SNOOZE_TARGET_EPOCH_MS_KEY]: snoozeTargetEpochMs },
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
      }
    });
    let removed = false;
    const managedSubscription = {
      remove: () => {
        if (removed) return;
        removed = true;
        nativeSubscription.remove();
        if (activeResponseSubscription === managedSubscription) {
          activeResponseSubscription = null;
        }
      },
    } as EventSubscription;
    activeResponseSubscription = managedSubscription;
    return managedSubscription;
  } catch {
    // ignore
    return null;
  }
}

/** Stop Adhan helper for UI and background handlers */
export async function stopAdhanPlayback(): Promise<void> {
  await stopAdhan();
}

/** Snooze prayer reminder for N minutes (default 10) */
export async function snoozePrayer(prayerName?: string, minutes = 10): Promise<boolean> {
  await stopAdhan();
  if (!isNotificationSchedulingSupported()) return false;
  try {
    const name = prayerName || 'Prayer';
    const snoozeTargetEpochMs = Date.now() + Math.max(1, minutes * 60) * 1000;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: t('🕌 {{prayer}} (Snoozed {{minutes}}m)', { prayer: t(name), minutes }),
        body: t('Reminder for {{prayer}} prayer.', { prayer: t(name) }),
        data: {
          prayer: name,
          type: 'prayer-snooze',
          url: buildDeepLink({ type: 'tracker' }),
          [SNOOZE_TARGET_EPOCH_MS_KEY]: snoozeTargetEpochMs,
        },
        categoryIdentifier: 'prayer',
        sound: 'default',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: minutes * 60,
      },
    });
    return true;
  } catch {
    return false;
  }
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
  try {
    return await Notifications.scheduleNotificationAsync({
      content: {
        title: t('Test: {{prayer}} Prayer Alert', { prayer: t(prayerName) }),
        body: t('This is a test notification for {{prayer}} to verify sound, vibration & action buttons.', {
          prayer: t(prayerName),
        }),
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
  } catch {
    return null;
  }
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
  try {
    return await Notifications.scheduleNotificationAsync({
      content: {
        title: t('🕌 Test: {{prayer}} in {{minutes}} minutes', {
          prayer: t(prayerName),
          minutes: offsetMinutes,
        }),
        body: t('Upcoming prayer notice to prepare for Salah.'),
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
  } catch {
    return null;
  }
}

/** Send immediate test Quran reading reminder */
export async function sendTestQuranNotification(): Promise<string | null> {
  if (!isNotificationSchedulingSupported()) return null;
  const permission = await checkNotificationPermission();
  if (permission !== 'granted') return null;
  await configureNotifications();
  try {
    const { getContinueReadingPosition } = await import('./continuing');
    const { SURAHS_114 } = await import('./surahs114');
    const position = await getContinueReadingPosition();
    const surah = position ? SURAHS_114.find((s) => s.number === position.surah) : undefined;
    const body =
      position && surah
        ? t('You stopped at {{surah}} {{reference}}.', {
            surah: surah.englishName,
            reference: `${position.surah}:${position.ayah}`,
          })
        : t('Open the Quran and keep your daily reading habit alive.');
    const data: Record<string, unknown> = { type: 'quran-reminder' };
    if (position) {
      data.url = buildDeepLink({ type: 'quran', surah: position.surah, ayah: position.ayah });
    }
    return await Notifications.scheduleNotificationAsync({
      content: {
        title: t('📖 Test: Quran Reading Reminder'),
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
  } catch {
    return null;
  }
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
    if (parts.length >= 9) {
      const [latLon, methodStr, remindersStr, offsetStr, quranStr, madhabStr, tzStr] = parts;
      const hasPrayerTimes = parts.length >= 10 && parts[7].startsWith('times=');
      const hasLegacyDate = parts.length >= 10 && !hasPrayerTimes;
      const pcfgStr = hasPrayerTimes ? parts[8] : hasLegacyDate ? parts[8] : parts[7];
      const qTimeStr = hasPrayerTimes ? parts[9] : hasLegacyDate ? parts[9] : parts[8];
      const [lat, lon] = latLon.split(',').map(Number);
      fingerprint = {
        location: { latitude: lat, longitude: lon, label: '' },
        methodId: parseInt(methodStr, 10),
        remindersEnabled: remindersStr === '1',
        reminderOffsetMinutes: parseInt(offsetStr, 10),
        quranReminderEnabled: quranStr === '1',
        madhab: madhabStr || 'shafi',
        timezone: tzStr,
        prayerTimesStr: hasPrayerTimes ? parts[7].slice('times='.length) : undefined,
        prayerConfigsStr: pcfgStr,
        quranReminderTime: qTimeStr,
      };
    } else if (parts.length >= 6) {
      const [latLon, methodStr, remindersStr, offsetStr, quranStr, madhabStr, tzStr] = parts;
      const [lat, lon] = latLon.split(',').map(Number);
      fingerprint = {
        location: { latitude: lat, longitude: lon, label: '' },
        methodId: parseInt(methodStr, 10),
        remindersEnabled: remindersStr === '1',
        reminderOffsetMinutes: parseInt(offsetStr, 10),
        quranReminderEnabled: quranStr === '1',
        madhab: madhabStr || 'shafi',
        timezone: tzStr,
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
