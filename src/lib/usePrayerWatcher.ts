import { useEffect, useRef } from 'react';
import { DayTimings, getNextPrayer } from './prayerTimes';
import { playAdhan } from './audio';

/**
 * Watches the clock and plays the adhan when a prayer time arrives.
 * Triggers once per prayer: tracks the last prayer that fired.
 * Must be mounted while HomeScreen is visible; notifications cover background.
 */
export function usePrayerWatcher(timings: DayTimings | null, enabled: boolean) {
  const lastFiredRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled || !timings) return;

    const check = () => {
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

        // Fire if within 60 seconds after the prayer time
        if (Math.abs(nowMin - prayerMin) <= 1 && lastFiredRef.current !== p.name) {
          lastFiredRef.current = p.name;
          playAdhan();
        }
      }

      // Reset the fired-marker when a new prayer becomes the "next" one
      getNextPrayer(timings.timings, now);
    };

    check();
    const id = setInterval(check, 30000);
    return () => clearInterval(id);
  }, [timings, enabled]);
}
