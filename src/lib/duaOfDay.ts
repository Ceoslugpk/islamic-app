import { DUAS_DATA, type DuaItem } from './duas';

function dayOfYear(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
}

export function getDuaOfDay(): DuaItem {
  const index = dayOfYear() % DUAS_DATA.length;
  return DUAS_DATA[index];
}

export function getDuasByCategory(category: string): DuaItem[] {
  const lowerCategory = category.toLowerCase();
  return DUAS_DATA.filter((dua) => dua.category.toLowerCase() === lowerCategory);
}

export function getCategories(): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const dua of DUAS_DATA) {
    if (!seen.has(dua.category)) {
      seen.add(dua.category);
      result.push(dua.category);
    }
  }
  return result;
}