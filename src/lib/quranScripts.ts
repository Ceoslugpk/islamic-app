/**
 * Quran script support: Uthmani, Imlaei, Indo-Pak, and Tajweed.
 * Data source: islamic.app (/v1/verses/by_chapter/:surah).
 *
 * Each script has its own orthography / markup:
 * - uthmani: Madinah mushaf convention (default)
 * - imlaei: Modern Arabic spelling
 * - indopak: South Asia / Persian-Arabic convention
 * - tajweed: HTML-tagged Uthmani with <tajweed class=...> spans
 */

import { loadQuranCache, saveQuranCache } from './db';
import { fetchWithTimeout } from './quran';
import { SURAH_AYAH_COUNTS } from './surahAyahCounts';
import { fetchTajweedSurah } from './tajweed';
import type { QuranScript } from './settings';

export type { QuranScript };

export interface ScriptOption {
  id: QuranScript;
  label: string;
  description: string;
}

export const QURAN_SCRIPTS: ScriptOption[] = [
  {
    id: 'uthmani',
    label: 'Uthmani',
    description: 'Madinah mushaf (default)',
  },
  {
    id: 'imlaei',
    label: 'Imlaei',
    description: 'Modern Arabic spelling',
  },
  {
    id: 'indopak',
    label: 'Indo-Pak',
    description: 'South Asia conventions',
  },
  {
    id: 'tajweed',
    label: 'Tajweed',
    description: 'Colored recitation rules (islamic.app)',
  },
];

export const SCRIPT_FIELD_MAP: Record<QuranScript, string> = {
  uthmani: 'text_uthmani',
  imlaei: 'text_imlaei',
  indopak: 'text_indopak',
  tajweed: 'text_uthmani_tajweed',
};

export function getScriptCacheKey(surah: number, script: QuranScript): string {
  return `surah-script:${surah}:${script}`;
}

export type ScriptAyahMap = Record<number, string>;

const ISLAMIC_APP_BASE = 'https://api.islamic.app/v1/verses';
// QuranHub (Qurani.ai / misraj-ai/quranhub) — open-source second provider.
// Serves quran-uthmani + quran-tajweed editions (verified live). Used as a
// side-by-side fallback when islamic.app fails, for the scripts it covers.
const QURANHUB_BASE = 'https://api.quranhub.com/v1/ayah';

/** Map our scripts → QuranHub edition identifiers (only the ones it serves). */
const QURANHUB_EDITION_MAP: Partial<Record<QuranScript, string>> = {
  uthmani: 'quran-uthmani',
  tajweed: 'quran-tajweed',
};

/** QuranHub tajweed markers: [h:1[...] [l[...] [n[...] [p[...] etc. → our rules. */

/** Fetch a surah's verses from QuranHub for a script it supports (uthmani/tajweed). */
async function fetchFromQuranHub(surah: number, script: QuranScript): Promise<ScriptAyahMap | null> {
  const edition = QURANHUB_EDITION_MAP[script];
  if (!edition) return null; // imlaei/indopak not served by QuranHub
  try {
    // QuranHub serves tajweed/uthmani per-ayah (its surah route drops
    // markers). Fetch a bounded per-ayah loop (cap at 30 to stay fast);
    // the caller only reaches here when islamic.app failed.
    const map: ScriptAyahMap = {};
    const maxAyah = Math.min(30, SURAH_AYAH_COUNTS[surah - 1] || 7);
    for (let ayah = 1; ayah <= maxAyah; ayah++) {
      const res = await fetchWithTimeout(
        `${QURANHUB_BASE}/${surah}:${ayah}/editions/${edition}`,
        {},
        6000
      );
      if (!res.ok) continue;
      const json = await res.json();
      const data = json?.data;
      if (Array.isArray(data) && data[0]?.text) map[ayah] = data[0].text;
    }
    return Object.keys(map).length > 0 ? map : null;
  } catch {
    return null;
  }
}

/**
 * Fetch surah verses in the chosen script from islamic.app.
 * Cached locally via loadQuranCache/saveQuranCache (`surah-script:{surah}:{script}`).
 * Returns a map of numberInSurah -> script text (or HTML for tajweed).
 * Gracefully falls back to null on failure (caller falls back to standard Uthmani).
 */
export async function fetchSurahWithScript(
  surah: number,
  script: QuranScript,
  force = false
): Promise<ScriptAyahMap | null> {
  const cacheKey = getScriptCacheKey(surah, script);

  if (!force) {
    const cached = loadQuranCache<ScriptAyahMap>(cacheKey);
    if (cached && Object.keys(cached).length > 0) {
      return cached;
    }
  }

  // Tajweed script path: reuse fetchTajweedSurah (already caches and handles by_chapter)
  if (script === 'tajweed') {
    try {
      const tajweedAyahs = await fetchTajweedSurah(surah);
      if (tajweedAyahs && tajweedAyahs.length > 0) {
        const map: ScriptAyahMap = {};
        for (const a of tajweedAyahs) {
          map[a.numberInSurah] = a.html;
        }
        saveQuranCache(cacheKey, map);
        return map;
      }
    } catch {
      const cached = loadQuranCache<ScriptAyahMap>(cacheKey);
      if (cached && Object.keys(cached).length > 0) return cached;
    }
    // islamic.app tajweed failed → QuranHub fallback (real tajweed markers).
    const hub = await fetchFromQuranHub(surah, 'tajweed');
    if (hub && Object.keys(hub).length > 0) {
      saveQuranCache(cacheKey, hub);
      return hub;
    }
    return null;
  }

  // Text scripts (uthmani, imlaei, indopak) via islamic.app by_chapter
  const field = SCRIPT_FIELD_MAP[script];
  try {
    const res = await fetchWithTimeout(
      `${ISLAMIC_APP_BASE}/by_chapter/${surah}?fields=${field}&per_page=300`,
      {},
      8000
    );
    if (!res.ok) throw new Error(`Script fetch HTTP ${res.status}`);
    const json = await res.json();
    const verses = json?.data?.verses || json?.data?.ayahs || [];
    if (!Array.isArray(verses) || verses.length === 0) {
      throw new Error('No verses returned for script');
    }

    const map: ScriptAyahMap = {};
    for (const v of verses) {
      const text = v[field];
      if (typeof text === 'string') {
        const parts = (v.verse_key || '').split(':');
        const numInSurah = parts.length > 1 ? parseInt(parts[1], 10) : v.verse_number;
        const ayahNum = !isNaN(numInSurah) ? numInSurah : v.verse_number;
        if (typeof ayahNum === 'number') {
          map[ayahNum] = text;
        }
      }
    }

    if (Object.keys(map).length > 0) {
      saveQuranCache(cacheKey, map);
      return map;
    }
  } catch {
    // If network fails/offline, check if cache is present
    const cached = loadQuranCache<ScriptAyahMap>(cacheKey);
    if (cached && Object.keys(cached).length > 0) return cached;
  }

  // islamic.app failed for uthmani → QuranHub fallback (uthmani only).
  if (script === 'uthmani') {
    const hub = await fetchFromQuranHub(surah, 'uthmani');
    if (hub && Object.keys(hub).length > 0) {
      saveQuranCache(cacheKey, hub);
      return hub;
    }
  }

  return null;
}
