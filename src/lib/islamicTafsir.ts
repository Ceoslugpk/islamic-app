/**
 * islamic.app Tafsir catalogue — 18 tafsirs across 6 languages.
 * Fetched from api.islamic.app (verified live: /v1/quran/tafsirs/:slug).
 */
import { loadQuranCache, saveQuranCache } from './db';

export interface IslamicTafsir {
  slug: string;
  language: string;
  languageCode: string;
  author: string;
  direction: 'rtl' | 'ltr';
}

export const ISLAMIC_TAFSIRS: IslamicTafsir[] = [
  // Arabic (7)
  { slug: 'ar-tafseer-al-qurtubi', language: 'Arabic', languageCode: 'ar', author: 'Al-Qurtubi', direction: 'rtl' },
  { slug: 'ar-tafsir-al-wasit', language: 'Arabic', languageCode: 'ar', author: 'Al-Wahidi (Waseet)', direction: 'rtl' },
  { slug: 'ar-tafsir-al-baghawi', language: 'Arabic', languageCode: 'ar', author: 'Al-Baghawi', direction: 'rtl' },
  { slug: 'ar-tafsir-ibn-kathir', language: 'Arabic', languageCode: 'ar', author: 'Ibn Kathir', direction: 'rtl' },
  { slug: 'ar-tafsir-muyassar', language: 'Arabic', languageCode: 'ar', author: 'Al-Muyassar', direction: 'rtl' },
  { slug: 'ar-tafsir-al-tabari', language: 'Arabic', languageCode: 'ar', author: 'Al-Tabari', direction: 'rtl' },
  { slug: 'ar-tafseer-al-saddi', language: 'Arabic', languageCode: 'ar', author: 'Al-Sa\'di', direction: 'rtl' },
  // English (2)
  { slug: 'en-tafisr-ibn-kathir', language: 'English', languageCode: 'en', author: 'Ibn Kathir (Eng)', direction: 'ltr' },
  { slug: 'en-tafsir-maarif-ul-quran', language: 'English', languageCode: 'en', author: "Ma'arif al-Qur'an", direction: 'ltr' },
  // Urdu (3 + 1 in Others)
  { slug: 'tafseer-ibn-e-kaseer-urdu', language: 'Urdu', languageCode: 'ur', author: 'Ibn Kathir (Urdu)', direction: 'rtl' },
  { slug: 'tafsir-bayan-ul-quran', language: 'Urdu', languageCode: 'ur', author: 'Dr. Israr Ahmad', direction: 'rtl' },
  { slug: 'tafsir-fe-zalul-quran-syed-qatab', language: 'Urdu', languageCode: 'ur', author: 'Sayyid Qutb', direction: 'rtl' },
  // Bengali (4)
  { slug: 'bn-tafseer-ibn-e-kaseer', language: 'Bengali', languageCode: 'bn', author: 'Ibn Kathir (Tawheed)', direction: 'ltr' },
  { slug: 'bn-tafsir-abu-bakr-zakaria', language: 'Bengali', languageCode: 'bn', author: 'Abu Bakr Zakaria', direction: 'ltr' },
  { slug: 'bn-tafsir-ahsanul-bayaan', language: 'Bengali', languageCode: 'bn', author: 'Ahsanul Bayan', direction: 'ltr' },
  { slug: 'tafisr-fathul-majid-bn', language: 'Bengali', languageCode: 'bn', author: 'Fathul Majid', direction: 'ltr' },
  // Russian (1) + Kurdish (1)
  { slug: 'ru-tafseer-al-saddi', language: 'Russian', languageCode: 'ru', author: "Al-Sa'di (Rus)", direction: 'ltr' },
  { slug: 'kurd-tafsir-rebar', language: 'Kurdish', languageCode: 'ku', author: 'Rebar', direction: 'rtl' },
];

export interface IslamicTafsirResult {
  text: string;
  editionName: string;
  language: string;
}

const BASE = 'https://api.islamic.app/v1/quran/tafsirs';

async function fetchWithTimeout(url: string, timeoutMs = 8000): Promise<Response> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(t);
  }
}

/** Fetch tafsir text for an ayah from islamic.app (cached in SQLite/quran-cache). */
export async function fetchIslamicTafsir(
  surah: number,
  ayah: number,
  slug: string
): Promise<IslamicTafsirResult> {
  const key = `islamic-tafsir:${surah}:${ayah}:${slug}`;
  const cached = loadQuranCache<IslamicTafsirResult>(key);
  if (cached) return cached;

  const meta = ISLAMIC_TAFSIRS.find((t) => t.slug === slug);
  const res = await fetchWithTimeout(`${BASE}/${slug}?number=${surah}&ayah=${ayah}`);
  if (!res.ok) throw new Error('Tafsir fetch failed');

  const json = await res.json();
  const ayahs = json?.data?.ayahs;
  if (!Array.isArray(ayahs) || !ayahs.length || !ayahs[0].text) {
    // Some tafsirs don't cover every ayah — throw so the UI shows a graceful gap.
    throw new Error('Tafsir not available for this ayah');
  }

  const result: IslamicTafsirResult = {
    text: ayahs[0].text,
    editionName: json?.data?.edition?.englishName || json?.data?.edition?.name || meta?.author || 'Tafsir',
    language: meta?.language || json?.data?.edition?.language || 'en',
  };
  saveQuranCache(key, result);
  return result;
}

/** Group tafsirs by language for the picker UI. */
export function groupIslamicTafsirs(): { language: string; tafsirs: IslamicTafsir[] }[] {
  const groups = new Map<string, IslamicTafsir[]>();
  for (const t of ISLAMIC_TAFSIRS) {
    if (!groups.has(t.language)) groups.set(t.language, []);
    groups.get(t.language)!.push(t);
  }
  return [...groups.entries()].map(([language, tafsirs]) => ({ language, tafsirs }));
}
