/**
 * Tajweed color rendering — real data from islamic.app.
 *
 * islamic.app serves `text_uthmani_tajweed` (verified live on /v1/verses/*):
 * HTML-tagged Uthmani text with `<tajweed class=...>` spans covering the
 * standard tajweed rules across the whole Quran. We parse those spans into
 * colored segments. This replaces the earlier curated set with full-Quran
 * real data.
 *
 * Verified classes (live): ham_wasl, laam_shamsiyah, madda_normal,
 * madda_permissible, idgham_wo_ghunnah, qalaqah, + <end> ayah markers.
 */
import { loadQuranCache, saveQuranCache } from './db';

export type TajweedRule = 'ghunnah' | 'idgham' | 'silent' | 'qalqalah' | 'ikhfa' | 'madd';

export const TAJWEED_RULES: Record<TajweedRule, { label: string; color: string; hint: string }> = {
  ghunnah: { label: 'Ghunnah', color: '#2E7D32', hint: 'Nasal sound — meem or noon with shadda, or nasalization' },
  idgham: { label: 'Idgham', color: '#1565C0', hint: 'Merging of noon sakinah into the next letter' },
  silent: { label: 'Silent', color: '#757575', hint: 'Written but not pronounced (hamzat al-wasl, sun-letter lam)' },
  qalqalah: { label: 'Qalqalah', color: '#C62828', hint: 'Bouncing sound on ق ط ب ج د' },
  ikhfa: { label: 'Ikhfa', color: '#6A1B9A', hint: 'Hidden — halfway between clear and merged' },
  madd: { label: 'Madd', color: '#EF6C00', hint: 'Lengthening. Normal 2-count, permissible 4, necessary 6' },
};

/** Map islamic.app tajweed classes → display rules. */
const CLASS_MAP: Record<string, TajweedRule> = {
  ham_wasl: 'silent',
  laam_shamsiyah: 'silent',
  qalaqah: 'qalqalah',
  madda_normal: 'madd',
  madda_permissible: 'madd',
  madda_necessary: 'madd',
  idgham_wo_ghunnah: 'idgham',
  idgham_with_ghunnah: 'idgham',
  ghunnah: 'ghunnah',
  ikhfa: 'ikhfa',
};

export interface TajweedSpan {
  text: string;
  rule?: TajweedRule;
}

/** Parse islamic.app tajweed HTML into renderable spans.
 * Handles: <tajweed class=...>…</tajweed> spans, <span class=end>…</span>
 * ayah-end markers (dropped — the app renders ۝N separately), and plain text.
 */
export function parseTajweedHtml(text: string): TajweedSpan[] {
  const spans: TajweedSpan[] = [];
  // Match tajweed spans first; end-markers and all other tags are skipped;
  // plain text (anything not inside a tag) is captured.
  const regex = /<tajweed class=([a-z_]+)>([^<]*)<\/tajweed>|<\/?span class=end>|<\/?end[^>]*>|<[^>]+>|([^<]+)/g;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(text)) !== null) {
    if (m[1]) {
      const rule = CLASS_MAP[m[1]];
      spans.push(rule ? { text: m[2] || '', rule } : { text: m[2] || '' });
    } else if (m[3]) {
      // Plain text: trim the ayah-end marker digits if they slipped here
      const clean = m[3].replace(/[\u0660-\u0669]+$/g, '').trim();
      if (clean) spans.push({ text: clean });
    }
    // m[2] (end marker contents) is intentionally dropped
  }
  return spans.length ? spans : [{ text }];
}

/** QuranHub (Qurani.ai) tajweed marker codes → our rules. */
const QURANHUB_CLASS_MAP: Record<string, TajweedRule> = {
  h: 'silent', // ham_wasl
  l: 'silent', // laam shamsiyah
  q: 'qalqalah',
  n: 'madd', // madda normal
  p: 'madd', // madda permissible
  g: 'ghunnah',
  i: 'ikhfa',
  d: 'idgham',
};

/** Parse QuranHub bracket tajweed (`[h:8078[ٱ]`) into renderable spans. */
export function parseQuranhubTajweed(text: string): TajweedSpan[] {
  const spans: TajweedSpan[] = [];
  const regex = /\[([a-z])(?::[0-9]+)?\[([^]]*)\]|([^\[]+)/g;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(text)) !== null) {
    if (m[1]) {
      const rule = QURANHUB_CLASS_MAP[m[1]];
      spans.push(rule ? { text: m[2] || '', rule } : { text: m[2] || '' });
    } else if (m[3]) {
      spans.push({ text: m[3] });
    }
  }
  return spans.length ? spans : [{ text }];
}

/** Auto-detect + parse either islamic.app HTML or QuranHub bracket tajweed. */
export function parseTajweedAny(text: string): TajweedSpan[] {
  if (text.includes('<tajweed')) return parseTajweedHtml(text);
  if (/\[[a-z](?::[0-9]+)?\[/.test(text)) return parseQuranhubTajweed(text);
  return [{ text }];
}

/** Strip all tajweed tags to plain Uthmani text. */
export function stripTajweedHtml(text: string): string {
  return text
    .replace(/<tajweed class=[a-z_]+>([^<]*)<\/tajweed>/g, '$1')
    .replace(/<span class=end>[^<]*<\/span>/g, '')
    .replace(/<end[^>]*\/?>/g, '')
    .trim();
}

const BASE = 'https://api.islamic.app/v1/verses';

async function fetchWithTimeout(url: string, timeoutMs = 10000): Promise<Response> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(t);
  }
}

export interface TajweedAyah {
  numberInSurah: number;
  verseKey: string;
  html: string; // raw tajweed HTML
}

/** Fetch tajweed-colored text for an entire surah from islamic.app (cached). */
export async function fetchTajweedSurah(surah: number): Promise<TajweedAyah[]> {
  const key = `islamic-tajweed:surah:${surah}`;
  const cached = loadQuranCache<TajweedAyah[]>(key);
  if (cached && cached.length) return cached;

  const res = await fetchWithTimeout(`${BASE}/by_chapter/${surah}?fields=text_uthmani_tajweed&per_page=300`);
  if (!res.ok) throw new Error('Tajweed fetch failed');
  const json = await res.json();
  const verses = json?.data?.verses || json?.data?.ayahs || [];
  if (!verses.length) throw new Error('No tajweed verses');

  const out: TajweedAyah[] = verses
    .filter((v: { text_uthmani_tajweed?: string }) => v.text_uthmani_tajweed)
    .map((v: { verse_key: string; verse_number: number; text_uthmani_tajweed: string }) => {
      const parts = (v.verse_key || '').split(':');
      const numInSurah = parts.length > 1 ? parseInt(parts[1], 10) : v.verse_number;
      return {
        numberInSurah: !isNaN(numInSurah) ? numInSurah : v.verse_number,
        verseKey: v.verse_key,
        html: v.text_uthmani_tajweed,
      };
    });

  saveQuranCache(key, out);
  return out;
}
