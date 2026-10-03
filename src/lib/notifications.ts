import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { DayTimings } from './prayerTimes';

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
