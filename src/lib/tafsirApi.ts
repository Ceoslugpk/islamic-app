/**
 * Tafsir API provider — spa5k/tafsir_api (GitHub) served via jsDelivr CDN.
 * Verified live: REAL per-ayah tafsir in English / Urdu / Bengali / Arabic
 * (2:254 ≠ 2:255), free, no auth, no rate limits. Version PINNED to v1.2.2
 * (never @latest — protects against force-pushes).
 *
 * Used as the PRIMARY tafsir source (islamic.app only serves surah intros);
 * islamic.app remains as a fallback for tafsirs this API doesn't cover.
 */
import { loadQuranCache, saveQuranCache } from './db';
import { fetchWithTimeout } from './quran';

const BASE = 'https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@v1.2.2/tafsir';

export interface TafsirApiEntry {
  slug: string;
  language: string;
  languageCode: string;
  author: string;
  direction: 'rtl' | 'ltr';
}

export const TAFSIR_API_TAFSIRS: TafsirApiEntry[] = [
  // English
  { slug: 'en-tafisr-ibn-kathir', language: 'English', languageCode: 'en', author: 'Ibn Kathir (English)', direction: 'ltr' },
  { slug: 'tafsir-al-jalalayn', language: 'English', languageCode: 'en', author: 'Al-Jalalayn (English)', direction: 'ltr' },
  // Urdu
  { slug: 'tafseer-ibn-e-kaseer-urdu', language: 'Urdu', languageCode: 'ur', author: 'Ibn Kathir (Urdu)', direction: 'rtl' },
  { slug: 'ur-tafsir-as-saadi-urdu', language: 'Urdu', languageCode: 'ur', author: "As-Sa'di (Urdu)", direction: 'rtl' },
  { slug: 'tazkiru-quran-ur', language: 'Urdu', languageCode: 'ur', author: 'Tazkirul Quran (Urdu)', direction: 'rtl' },
  // Bengali
  { slug: 'bengali-mokhtasar', language: 'Bengali', languageCode: 'bn', author: 'Bengali Mokhtasar', direction: 'ltr' },
  // Arabic
  { slug: 'tafsir-ibn-kathir', language: 'Arabic', languageCode: 'ar', author: 'Ibn Kathir (Arabic)', direction: 'rtl' },
  { slug: 'tafsir-al-tabari', language: 'Arabic', languageCode: 'ar', author: 'Al-Tabari (Arabic)', direction: 'rtl' },
  { slug: 'tafsir-al-qurtubi', language: 'Arabic', languageCode: 'ar', author: 'Al-Qurtubi (Arabic)', direction: 'rtl' },
  { slug: 'tafsir-al-baghawi', language: 'Arabic', languageCode: 'ar', author: 'Al-Baghawi (Arabic)', direction: 'rtl' },
  { slug: 'tafsir-al-muyassar', language: 'Arabic', languageCode: 'ar', author: 'Al-Muyassar (Arabic)', direction: 'rtl' },
];

export interface TafsirApiResult {
  text: string;
  author: string;
  language: string;
}

/** Fetch REAL per-ayah tafsir text (cached; falls back to islamic.app on failure). */
export async function fetchTafsirApi(
  surah: number,
  ayah: number,
  slug: string
): Promise<TafsirApiResult> {
  const key = `tafsir-api:${surah}:${ayah}:${slug}`;
  const cached = loadQuranCache<TafsirApiResult>(key);
  if (cached) return cached;

  const meta = TAFSIR_API_TAFSIRS.find((t) => t.slug === slug);
  try {
    const res = await fetchWithTimeout(`${BASE}/${slug}/${surah}/${ayah}.json`, {}, 8000);
    if (!res.ok) throw new Error(`Tafsir API HTTP ${res.status}`);
    const json = await res.json();
    const text = json?.text;
    if (typeof text !== 'string' || !text.trim()) throw new Error('Empty tafsir text');

    const result: TafsirApiResult = {
      text,
      author: meta?.author || 'Tafsir',
      language: meta?.language || 'en',
    };
    saveQuranCache(key, result);
    return result;
  } catch {
    throw new Error('Tafsir unavailable');
  }
}
