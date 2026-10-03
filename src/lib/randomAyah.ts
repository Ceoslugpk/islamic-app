import { SURAH_AYAH_COUNTS } from './quranAudio';

const TOTAL_AYAHS = 6236;

function getSurahAyahFromGlobal(globalAyah: number): { surah: number; ayah: number } {
  let remaining = globalAyah;
  for (let i = 0; i < SURAH_AYAH_COUNTS.length; i++) {
    const count = SURAH_AYAH_COUNTS[i];
    if (remaining <= count) {
      return { surah: i + 1, ayah: remaining };
    }
    remaining -= count;
  }
  return { surah: 1, ayah: 1 };
}

export function getRandomAyah(): { surah: number; ayah: number } {
  const globalAyah = Math.floor(Math.random() * TOTAL_AYAHS) + 1;
  return getSurahAyahFromGlobal(globalAyah);
}

export function getRandomAyahInSurah(surah: number): number {
  const count = getAyahCount(surah);
  if (count === 0) return 1;
  return Math.floor(Math.random() * count) + 1;
}

export function getAyahCount(surah: number): number {
  if (surah < 1 || surah > 114) return 0;
  return SURAH_AYAH_COUNTS[surah - 1] ?? 0;
}

export function getTotalAyahs(): number {
  return TOTAL_AYAHS;
}