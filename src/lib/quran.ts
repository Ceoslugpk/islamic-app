/**
 * Quran data via AlQuran Cloud (primary), cached locally.
 * Endpoints (verified):
 *   GET /v1/surah (list of 114)
 *   GET /v1/surah/{n} (full surah, Arabic + translation)
 *   GET /v1/surah/{n}/editions/{...} (multi-edition)
 *   GET /v1/ayah/{n}/{edition} (single ayah + tafsir)
 */
import { saveQuranCache, loadQuranCache } from './db';

export interface SurahMeta {
  number: number;
  name: string; // Arabic
  englishName: string;
  englishNameTranslation: string;
  numberOfAyahs: number;
  revelationType: 'Meccan' | 'Medinan';
}

export interface Ayah {
  number: number; // global ayah number
  numberInSurah: number;
  text: string; // Arabic
  surah: { number: number; name: string; englishName: string };
  translation?: string; // when requested
}

export interface SurahDetail {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  numberOfAyahs: number;
  ayahs: Ayah[];
}

const BASE = 'https://api.alquran.cloud/v1';
// Saheeh International translation edition
const TRANSLATION = 'en.sahih';

export async function fetchSurahList(force = false): Promise<SurahMeta[]> {
  if (!force) {
    const cached = loadQuranCache<SurahMeta[]>('surah-list');
    if (cached) return cached;
  }

  const res = await fetch(`${BASE}/surah`);
  if (!res.ok) throw new Error('Quran list failed');
  const json = await res.json();
  if (json.code !== 200) throw new Error('Quran list non-200');

  const list: SurahMeta[] = json.data.map((s: any) => ({
    number: s.number,
    name: s.name,
    englishName: s.englishName,
    englishNameTranslation: s.englishNameTranslation,
    numberOfAyahs: s.numberOfAyahs,
    revelationType: s.revelationType,
  }));

  saveQuranCache('surah-list', list);
  return list;
}

import { SURAH_NAME_TRANSLATIONS } from './surahTranslationsData';

export async function fetchSurahListForLanguage(
  languageCode: string,
  force = false
): Promise<Record<number, string> | null> {
  if (languageCode === 'en') return null;

  const cacheKey = `surah-names-lang:${languageCode}`;
  if (!force) {
    const cached = loadQuranCache<Record<number, string>>(cacheKey);
    if (cached) return cached;
  }

  // Try API: https://api.alquran.cloud/v1/surah/{lang}
  try {
    const res = await fetch(`${BASE}/surah/${languageCode}`);
    if (res.ok) {
      const json = await res.json();
      if (json.code === 200 && Array.isArray(json.data)) {
        const mapping: Record<number, string> = {};
        for (const item of json.data) {
          if (item.number && (item.translation || item.englishNameTranslation || item.name)) {
            mapping[item.number] = item.translation || item.englishNameTranslation || item.name;
          }
        }
        if (Object.keys(mapping).length > 0) {
          saveQuranCache(cacheKey, mapping);
          return mapping;
        }
      }
    }
  } catch {
    // API failed, fallback below
  }

  // Fallback to offline translations dictionary
  const localMap = SURAH_NAME_TRANSLATIONS[languageCode];
  if (localMap) {
    saveQuranCache(cacheKey, localMap);
    return localMap;
  }

  return null;
}

export async function fetchSurah(
  number: number,
  withTranslation = true,
  translationEdition = 'en.sahih',
  force = false
): Promise<SurahDetail> {
  const key = `surah:${number}:${withTranslation ? translationEdition : 'ar'}`;
  if (!force) {
    const cached = loadQuranCache<SurahDetail>(key);
    if (cached) return cached;
  }

  const edition = withTranslation
    ? `quran-uthmani,${translationEdition}`
    : 'quran-uthmani';
  
  let res = await fetch(`${BASE}/surah/${number}/editions/${edition}`);
  if (!res.ok && translationEdition !== 'en.sahih') {
    // Fallback to Saheeh International if selected edition fails
    res = await fetch(`${BASE}/surah/${number}/editions/quran-uthmani,en.sahih`);
  }
  if (!res.ok) throw new Error('Surah fetch failed');
  const json = await res.json();
  if (json.code !== 200 || !Array.isArray(json.data) || json.data.length === 0) {
    throw new Error('Surah non-200');
  }

  const arabic = json.data[0];
  const translation = json.data[1] || null;

  const detail: SurahDetail = {
    number: arabic.number,
    name: arabic.name,
    englishName: arabic.englishName,
    englishNameTranslation: arabic.englishNameTranslation,
    numberOfAyahs: arabic.numberOfAyahs,
    ayahs: arabic.ayahs.map((a: any, i: number) => ({
      number: a.number,
      numberInSurah: a.numberInSurah,
      text: a.text,
      surah: { number: arabic.number, name: arabic.name, englishName: arabic.englishName },
      translation: translation ? translation.ayahs[i]?.text : undefined,
    })),
  };

  saveQuranCache(key, detail);
  return detail;
}

export async function fetchAyah(
  reference: string, // e.g. "2:255" or "255"
  edition = TRANSLATION
): Promise<Ayah> {
  const key = `ayah:${reference}:${edition}`;
  const cached = loadQuranCache<Ayah>(key);
  if (cached) return cached;

  const res = await fetch(`${BASE}/ayah/${reference}/${edition}`);
  if (!res.ok) throw new Error('Ayah fetch failed');
  const json = await res.json();
  if (json.code !== 200) throw new Error('Ayah non-200');

  const d = json.data;
  const ayah: Ayah = {
    number: d.number,
    numberInSurah: d.numberInSurah,
    text: d.text,
    surah: { number: d.surah.number, name: d.surah.name, englishName: d.surah.englishName },
    translation: d.text,
  };
  saveQuranCache(key, ayah);
  return ayah;
}

export async function fetchAyahTafsir(
  surah: number,
  ayah: number,
  tafsirIdentifier = 'ar.jalalayn'
): Promise<{ text: string; edition: string }> {
  const key = `tafsir:ayah:${surah}:${ayah}:${tafsirIdentifier}`;
  const cached = loadQuranCache<{ text: string; edition: string }>(key);
  if (cached) return cached;

  try {
    const res = await fetch(`${BASE}/ayah/${surah}:${ayah}/${tafsirIdentifier}`);
    if (res.ok) {
      const json = await res.json();
      if (json.code === 200 && json.data && json.data.edition?.type === 'tafsir') {
        const result = { text: json.data.text, edition: json.data.edition?.name || 'Tafsir' };
        saveQuranCache(key, result);
        return result;
      }
    }
  } catch {
    // fallback below
  }

  const res2 = await fetch(`${BASE}/ayah/${surah}:${ayah}/ar.jalalayn`);
  if (!res2.ok) throw new Error('Tafsir fetch failed');
  const json2 = await res2.json();
  if (json2.code !== 200 || !json2.data) throw new Error('Tafsir non-200');

  const result = {
    text: json2.data.text,
    edition: json2.data.edition?.name || 'تفسير الجلالين',
  };
  saveQuranCache(key, result);
  return result;
}

export async function fetchSurahTafsir(
  surah: number,
  tafsirIdentifier = 'ar.jalalayn'
): Promise<Array<{ ayahNumber: number; text: string }>> {
  const key = `tafsir:surah:${surah}:${tafsirIdentifier}`;
  const cached = loadQuranCache<Array<{ ayahNumber: number; text: string }>>(key);
  if (cached) return cached;

  const res = await fetch(`${BASE}/surah/${surah}/${tafsirIdentifier}`);
  if (!res.ok) throw new Error('Surah tafsir fetch failed');
  const json = await res.json();
  if (json.code !== 200 || !json.data || !Array.isArray(json.data.ayahs)) {
    throw new Error('Surah tafsir non-200');
  }

  const list = json.data.ayahs.map((a: any) => ({
    ayahNumber: a.numberInSurah,
    text: a.text,
  }));
  saveQuranCache(key, list);
  return list;
}

export async function fetchAyahEditions(
  surah: number,
  ayah: number,
  editions: string[]
): Promise<Record<string, string>> {
  const key = `ayah:editions:${surah}:${ayah}:${editions.join(',')}`;
  const cached = loadQuranCache<Record<string, string>>(key);
  if (cached) return cached;

  const res = await fetch(`${BASE}/ayah/${surah}:${ayah}/editions/${editions.join(',')}`);
  if (!res.ok) throw new Error('Ayah editions fetch failed');
  const json = await res.json();
  if (json.code !== 200 || !Array.isArray(json.data)) throw new Error('Editions non-200');

  const out: Record<string, string> = {};
  for (const item of json.data) {
    if (item.edition?.identifier && item.text) {
      out[item.edition.identifier] = item.text;
    }
  }
  saveQuranCache(key, out);
  return out;
}