import { SURAHS_114, type SurahSummary } from './surahs114';

export interface SurahTile {
  surah: number;
  englishName: string;
  arabicName: string;
  ayahCount: number;
}

function mapToTile(s: SurahSummary): SurahTile {
  return {
    surah: s.number,
    englishName: s.englishName,
    arabicName: s.name,
    ayahCount: s.numberOfAyahs,
  };
}

export function buildSurahGrid(): SurahTile[] {
  return SURAHS_114.map(mapToTile);
}

export function chunkSurahGrid(size: number): SurahTile[][] {
  const normalizedSize = size <= 0 ? 5 : size;
  const grid = buildSurahGrid();
  const chunks: SurahTile[][] = [];
  for (let i = 0; i < grid.length; i += normalizedSize) {
    chunks.push(grid.slice(i, i + normalizedSize));
  }
  return chunks;
}