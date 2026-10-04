/**
 * After-prayer adhkar from the keyless islamic.app dhikr API.
 *
 * Verified (2026-10-04):
 *   GET https://api.islamic.app/v1/dhikr/after-prayer   → HTTP 200, CORS `*`
 *   → { code: 200, status: "OK",
 *       data: { shortcut: "after-prayer", label: "After-prayer adhkar", count: 8, duas: [...] } }
 *   each dua: { number, category: { number, en, ar }, slug?, transliteration?,
 *               en: { body: <html>, text: <plain> }, ar: { body: <html>, text: <plain> } }
 *
 * The English body carries the transliteration, translation and reference inside
 * `<span class="transliteration|translation|hisn_english_reference">` tags, so the
 * HTML is parsed here into a plain { arabic, transliteration, translation, source }.
 * Result is cached in AsyncStorage; the static DUAS_DATA entry is the offline fallback.
 */
import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DUAS_DATA } from './duas';

export interface AfterPrayerDua {
  id: string;
  arabic: string;
  transliteration: string;
  translation: string;
  source: string;
  reference?: string;
}

const ENDPOINT = 'https://api.islamic.app/v1/dhikr/after-prayer';
const CACHE_KEY = 'after-prayer-duas:v1';
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 12000;

const PRAYER_ORDER = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'] as const;
const ANY_PRAYER_RE = /\b(fajr|dhuhr|asr|maghrib|isha)\b/i;

/** Static offline fallback: the "After Prayer" entry already bundled with the app. */
export const FALLBACK_AFTER_PRAYER_DUAS: AfterPrayerDua[] = DUAS_DATA.filter(
  (dua) => dua.category === 'After Prayer'
).map((dua) => ({
  id: dua.id,
  arabic: dua.arabic,
  transliteration: dua.transliteration,
  translation: dua.translation,
  source: dua.reference,
  reference: dua.reference,
}));

interface RawDua {
  number?: string | number;
  slug?: string;
  transliteration?: string | { en?: string };
  en?: { body?: string; text?: string };
  ar?: { body?: string; text?: string };
}

interface RawPayload {
  code?: number;
  data?: { duas?: RawDua[] };
}

interface CacheEntry {
  fetchedAt: number;
  duas: AfterPrayerDua[];
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  lsquo: '\u2018',
  rsquo: '\u2019',
  ldquo: '\u201c',
  rdquo: '\u201d',
  ndash: '\u2013',
  mdash: '\u2014',
  hellip: '\u2026',
};

function decodeEntities(text: string): string {
  return text.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, body: string) => {
    if (body[0] === '#') {
      const code =
        body[1] === 'x' || body[1] === 'X'
          ? parseInt(body.slice(2), 16)
          : parseInt(body.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff
        ? String.fromCodePoint(code)
        : match;
    }
    return NAMED_ENTITIES[body.toLowerCase()] ?? match;
  });
}

/** HTML → plain text, keeping block breaks as newlines. */
function stripHtml(html: string): string {
  const withBreaks = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6])>/gi, '\n');
  const text = withBreaks.replace(/<[^>]*>/g, '');
  return decodeEntities(text)
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function spanByClass(html: string, className: string): string {
  const pattern = new RegExp(
    `<span[^>]*class=["'][^"']*\\b${className}\\b[^"']*["'][^>]*>([\\s\\S]*?)<\\/span>`,
    'i'
  );
  const match = html.match(pattern);
  return match ? stripHtml(match[1]) : '';
}

function removeSpansByClass(html: string, classNames: string[]): string {
  return classNames.reduce((out, className) => {
    const pattern = new RegExp(
      `<span[^>]*class=["'][^"']*\\b${className}\\b[^"']*["'][^>]*>[\\s\\S]*?<\\/span>`,
      'gi'
    );
    return out.replace(pattern, '');
  }, html);
}

function mapRawDua(raw: RawDua, index: number): AfterPrayerDua | null {
  const enBody = raw.en?.body ?? '';
  const arabic = stripHtml(raw.ar?.body ?? '') || (raw.ar?.text ?? '').trim();
  const translation = spanByClass(enBody, 'translation') || (raw.en?.text ?? '').trim();
  // Everything left after dropping translation/reference spans: transliteration
  // plus the recitation instructions ("three times", "after Fajr and Maghrib", …).
  const transliteration =
    stripHtml(
      removeSpansByClass(enBody, ['translation', 'reference_label', 'hisn_english_reference'])
    ) ||
    (typeof raw.transliteration === 'string'
      ? stripHtml(raw.transliteration)
      : stripHtml(raw.transliteration?.en ?? ''));
  const source = spanByClass(enBody, 'hisn_english_reference');

  if (!arabic || !translation) return null;
  return {
    id: String(raw.number ?? raw.slug ?? index),
    arabic,
    transliteration,
    translation,
    source,
    reference: source,
  };
}

async function requestAfterPrayerDuas(): Promise<AfterPrayerDua[]> {
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = controller
    ? setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
    : null;
  try {
    const response = await fetch(ENDPOINT, {
      headers: {
        Accept: 'application/json',
      },
      ...(controller ? { signal: controller.signal } : {}),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = (await response.json()) as RawPayload;
    const raw = payload?.data?.duas;
    if (payload?.code !== 200 || !Array.isArray(raw)) {
      throw new Error('Malformed dhikr payload');
    }
    const duas = raw
      .map(mapRawDua)
      .filter((dua): dua is AfterPrayerDua => dua !== null);
    if (!duas.length) throw new Error('Empty after-prayer list');
    return duas;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function readCache(): Promise<CacheEntry | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry;
    if (!Array.isArray(parsed?.duas) || !parsed.duas.length) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Fresh cache → network → stale cache → bundled static entry. */
export async function loadAfterPrayerDuas(): Promise<AfterPrayerDua[]> {
  const cached = await readCache();
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) return cached.duas;
  try {
    const fresh = await requestAfterPrayerDuas();
    const entry: CacheEntry = { fetchedAt: Date.now(), duas: fresh };
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(entry)).catch(() => {});
    return fresh;
  } catch {
    if (cached) return cached.duas;
    return FALLBACK_AFTER_PRAYER_DUAS;
  }
}

export function useAfterPrayerDuas() {
  const [duas, setDuas] = useState<AfterPrayerDua[]>(FALLBACK_AFTER_PRAYER_DUAS);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setDuas(await loadAfterPrayerDuas());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { duas, loading, refresh };
}

function searchable(dua: AfterPrayerDua): string {
  return `${dua.transliteration}\n${dua.translation}\n${dua.source}`;
}

/**
 * Picks the single dua shown under the prayer card: one that names the given
 * prayer when islamic.app tags one (e.g. "after the Maghrib and Fajr prayers"),
 * otherwise a rotating entry from the prayer-agnostic ones.
 */
export function selectAfterPrayerDua(
  duas: AfterPrayerDua[],
  prayer?: string | null
): AfterPrayerDua | null {
  if (!duas.length) return null;
  if (!prayer) return duas[0];

  const prayerRe = new RegExp(`\\b${prayer}\\b`, 'i');
  const tagged = duas.find((dua) => prayerRe.test(searchable(dua)));
  if (tagged) return tagged;

  const general = duas.filter((dua) => !ANY_PRAYER_RE.test(searchable(dua)));
  const pool = general.length ? general : duas;
  const position = PRAYER_ORDER.indexOf(
    prayer as (typeof PRAYER_ORDER)[number]
  );
  return pool[(position >= 0 ? position : 0) % pool.length];
}
