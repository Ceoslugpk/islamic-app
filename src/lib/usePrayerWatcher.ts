import { useEffect, useRef } from 'react';
import { playAdhan } from './audio';
import type { DayTimings } from './prayerTimes';
import { useSettings } from './settings';
import type { PrayerNameKey, PrayerReminderConfig } from './settings';

export interface PrayerFireMarker {
  name: string;
  dateKey: string;
}

export function getPrayerDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function shouldFirePrayer(
  prayer: { name: string; time: string },
  now: Date,
  lastFired: PrayerFireMarker | null,
  config: PrayerReminderConfig,
): boolean {
  if (!config.enabled || !config.adhan || !prayer.time || !prayer.time.includes(':')) return false;

  const nowMin = now.getHours() * 60 + now.getMinutes();
  const [h, m] = prayer.time.split(':').map(Number);
  const prayerMin = h * 60 + m;
  if (Math.abs(nowMin - prayerMin) > 1) return false;

  const dateKey = getPrayerDateKey(now);
  return lastFired?.name !== prayer.name || lastFired.dateKey !== dateKey;
}

/**
 * Watches the clock and plays the adhan when a prayer time arrives.
 * Triggers once per prayer: tracks the last prayer that fired.
 * Must be mounted while HomeScreen is visible; notifications cover background.
 */
export function usePrayerWatcher(timings: DayTimings | null, enabled: boolean) {
  const lastFiredRef = useRef<PrayerFireMarker | null>(null);
  const { settings } = useSettings();

  useEffect(() => {
    if (!enabled || !timings) return;

    const check = () => {
      const now = new Date();

      const prayers: { name: string; time: string }[] = [
        { name: 'Fajr', time: timings.timings.Fajr },
        { name: 'Dhuhr', time: timings.timings.Dhuhr },
        { name: 'Asr', time: timings.timings.Asr },
        { name: 'Maghrib', time: timings.timings.Maghrib },
        { name: 'Isha', time: timings.timings.Isha },
      ];

      for (const p of prayers) {
        if (!p.time || !p.time.includes(':')) continue;

        const config = settings.prayerConfigs[p.name as PrayerNameKey] ?? {
          enabled: true,
          adhan: true,
          vibration: true,
        };

        // Fire once per prayer and local calendar date, honoring per-prayer adhan settings.
        if (shouldFirePrayer(p, now, lastFiredRef.current, config)) {
          lastFiredRef.current = { name: p.name, dateKey: getPrayerDateKey(now) };
          void Promise.resolve(playAdhan(settings.adhanReciterId)).catch(() => {});
        }
      }
    };

    check();
    const id = setInterval(check, 30000);
    return () => clearInterval(id);
  }, [timings, enabled, settings.prayerConfigs, settings.adhanReciterId]);
}
