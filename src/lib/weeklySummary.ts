/**
 * Weekly summary — gentle on-device recap of the last 7 days.
 * Aggregates: Quran reading (ayahs/time), Salah completion, Hifz progress,
 * notes added. All computed locally, no backend.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSalahHistory, computeStreak, loadHifzStatuses } from './db';
import { getNotes } from './study';

export interface WeeklySummary {
  weekStart: string; // YYYY-MM-DD (7 days ago)
  weekEnd: string; // YYYY-MM-DD (today)
  daysRead: number; // days with any Quran reading
  totalAyahsRead: number;
  totalReadingMinutes: number;
  salahDays: number; // days with at least one salah marked
  salahStreak: number;
  hifzMemorized: number; // surahs memorized total
  hifzNewThisWeek: number;
  notesAdded: number;
}

const PROGRESS_PREFIX = 'quran-daily-progress-';

export async function buildWeeklySummary(now = new Date()): Promise<WeeklySummary> {
  const today = new Date(now);
  const dayStrings: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    dayStrings.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    );
  }

  let daysRead = 0;
  let totalAyahsRead = 0;
  let totalReadingMinutes = 0;

  for (const day of dayStrings) {
    try {
      const raw = await AsyncStorage.getItem(`${PROGRESS_PREFIX}${day}`);
      if (!raw) continue;
      const p = JSON.parse(raw);
      if (p.ayahsRead > 0) daysRead++;
      totalAyahsRead += p.ayahsRead || 0;
      totalReadingMinutes += Math.round((p.secondsPlayed || 0) / 60);
    } catch {
      // skip unparseable day
    }
  }

  const salahHistory = getSalahHistory(7);
  const salahDays = Object.keys(salahHistory).filter((d) =>
    Object.values(salahHistory[d] || {}).some(Boolean)
  ).length;
  const salahStreak = computeStreak(salahHistory);

  const hifz = loadHifzStatuses();
  const hifzMemorized = Object.values(hifz).filter((s) => s === 'memorized').length;

  let notesAdded = 0;
  try {
    const allNotes = getNotes();
    const weekStart = new Date(dayStrings[0] + 'T00:00:00');
    notesAdded = allNotes.filter((n) => {
      const t = n.createdAt || 0;
      return t >= weekStart.getTime();
    }).length;
  } catch {
    // notes unavailable — report 0
  }

  return {
    weekStart: dayStrings[0],
    weekEnd: dayStrings[6],
    daysRead,
    totalAyahsRead,
    totalReadingMinutes,
    salahDays,
    salahStreak,
    hifzMemorized,
    hifzNewThisWeek: 0, // hifz entries don't carry timestamps; keep 0 to stay honest
    notesAdded,
  };
}
