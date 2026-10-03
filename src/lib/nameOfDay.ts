import { Name99, NAMES_99 } from './names99';

export type NameItem = Name99;

function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 1);
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / 86400000) + 1;
}

function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}

export function getNameOfDay(): NameItem {
  const dayOfYear = getDayOfYear(new Date());
  const index = mod(dayOfYear, NAMES_99.length);
  return NAMES_99[index];
}

export function getNameForDay(dayOffset: number): NameItem {
  const index = mod(dayOffset, NAMES_99.length);
  return NAMES_99[index];
}

export function getNextNameCountdown(): { name: string; msUntilNext: number } {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  const msUntilNext = tomorrow.getTime() - now.getTime();
  const todayIndex = mod(getDayOfYear(now), NAMES_99.length);
  const nextIndex = mod(todayIndex + 1, NAMES_99.length);

  return {
    name: NAMES_99[nextIndex].transliteration,
    msUntilNext,
  };
}