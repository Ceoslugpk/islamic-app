/**
 * Quran data via AlQuran Cloud (primary), cached locally.
 * Endpoints (verified):
 *   GET /v1/surah (list of 114)
 *   GET /v1/surah/{n} (full surah, Arabic + translation)
 *   GET /v1/surah/{n}/editions/{...} (multi-edition)
 *   GET /v1/ayah/{n}/{edition} (single ayah + tafsir)
 */
import { saveQuranCache, loadQuranCache } from './db';
import { isAppOnline } from './useConnectivity';
import { SURAHS_114 } from './surahs114';
import { SURAH_NAME_TRANSLATIONS } from './surahTranslationsData';
import { SURAH_AYAH_COUNTS } from './surahAyahCounts';
import { fetchTafsirApi, getCanonicalTafsirSlug, TAFSIR_API_BASE } from './tafsirApi';
import {
  SURAH_START_PAGES,
  TOTAL_MUSHAF_PAGES,
  getSurahStartPage,
  getPrimarySurahForPage,
} from './surahPageData';

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
  page?: number;
  juz?: number;
  manzil?: number;
  ruku?: number;
  hizbQuarter?: number;
  sajda?: boolean | any;
}

export interface MushafPageAyah {
  number: number; // global ayah number (1..6236)
  numberInSurah: number;
  text: string; // Arabic
  surah: {
    number: number;
    name: string;
    englishName: string;
    englishNameTranslation?: string;
    numberOfAyahs?: number;
    revelationType?: 'Meccan' | 'Medinan' | string;
  };
  juz: number;
  manzil?: number;
  page: number;
  ruku?: number;
  hizbQuarter?: number;
  sajda?: boolean | any;
  translation?: string;
}

export interface MushafPageDetail {
  pageNumber: number;
  ayahs: MushafPageAyah[];
  surahs: SurahMeta[];
  juz?: number;
  hizbQuarter?: number;
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

export async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 4000): Promise<Response> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout>;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      try { controller.abort(); } catch {}
      reject(new Error(`Timeout of ${timeoutMs}ms exceeded for ${url}`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([
      fetch(url, { ...options, signal: controller.signal }),
      timeoutPromise,
    ]);
  } finally {
    clearTimeout(timer!);
  }
}

export function getBundledSurahs114(): SurahMeta[] {
  return SURAHS_114.map((s) => ({
    number: s.number,
    name: s.name,
    englishName: s.englishName,
    englishNameTranslation: s.englishName,
    numberOfAyahs: s.numberOfAyahs,
    revelationType: s.revelationType,
  }));
}

let inFlightSurahList: Promise<SurahMeta[]> | null = null;

export async function fetchSurahList(force = false): Promise<SurahMeta[]> {
  if (!force) {
    const cached = loadQuranCache<SurahMeta[]>('surah-list');
    if (cached && Array.isArray(cached) && cached.length > 0) return cached;
    if (!isAppOnline()) {
      const fallbackList = getBundledSurahs114();
      saveQuranCache('surah-list', fallbackList);
      return fallbackList;
    }
  }

  if (inFlightSurahList) {
    return inFlightSurahList;
  }

  const exec = async (): Promise<SurahMeta[]> => {
    try {
      const res = await fetchWithTimeout(`${BASE}/surah`, {}, 4000);
      if (!res.ok) throw new Error('Quran list failed');
      const json = await res.json();
      if (json.code !== 200 || !Array.isArray(json.data)) throw new Error('Quran list non-200');

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
    } catch {
      // If network fails/times out, use cached data if present, or bundled SURAHS_114
      const cached = loadQuranCache<SurahMeta[]>('surah-list');
      if (cached && Array.isArray(cached) && cached.length > 0) return cached;

      const fallbackList = getBundledSurahs114();
      saveQuranCache('surah-list', fallbackList);
      return fallbackList;
    } finally {
      inFlightSurahList = null;
    }
  };

  inFlightSurahList = exec();
  return inFlightSurahList;
}

export async function fetchSurahListForLanguage(
  languageCode: string,
  force = false
): Promise<Record<number, string> | null> {
  if (languageCode === 'en') return null;

  const cacheKey = `surah-names-lang:${languageCode}`;
  if (!force) {
    const cached = loadQuranCache<Record<number, string>>(cacheKey);
    if (cached) return cached;
    if (!isAppOnline()) {
      const localMap = SURAH_NAME_TRANSLATIONS[languageCode];
      if (localMap) {
        saveQuranCache(cacheKey, localMap);
        return localMap;
      }
      return null;
    }
  }

  // Try API: https://api.alquran.cloud/v1/surah/{lang}
  try {
    const res = await fetchWithTimeout(`${BASE}/surah/${languageCode}`, {}, 4000);
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
  
  let res: Response;
  try {
    res = await fetchWithTimeout(`${BASE}/surah/${number}/editions/${edition}`, {}, 4000);
  } catch (err) {
    if (translationEdition !== 'en.sahih') {
      res = await fetchWithTimeout(`${BASE}/surah/${number}/editions/quran-uthmani,en.sahih`, {}, 4000);
    } else {
      throw err;
    }
  }
  if (!res.ok && translationEdition !== 'en.sahih') {
    // Fallback to Saheeh International if selected edition fails
    res = await fetchWithTimeout(`${BASE}/surah/${number}/editions/quran-uthmani,en.sahih`, {}, 4000);
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
      page: a.page,
      juz: a.juz,
      manzil: a.manzil,
      ruku: a.ruku,
      hizbQuarter: a.hizbQuarter,
      sajda: a.sajda,
    })),
  };

  saveQuranCache(key, detail);

  // Also cache Arabic-only key so Arabic reader / Tafsir screens work completely offline
  const arKey = `surah:${number}:ar`;
  if (!loadQuranCache(arKey)) {
    const arDetail: SurahDetail = {
      ...detail,
      ayahs: detail.ayahs.map((a) => ({
        ...a,
        translation: undefined,
      })),
    };
    saveQuranCache(arKey, arDetail);
  }

  return detail;
}

export interface MultiEditionsResult {
  arabic: SurahDetail;
  editions: Record<string, SurahDetail>;
}

export const QURAN_MULTI_EDITION_BATCH_SIZE = 15;

export async function fetchSurahMultiEditions(
  number: number,
  editionIdentifiers: string[],
  force = false
): Promise<MultiEditionsResult> {
  const uniqueEditions = Array.from(
    new Set(editionIdentifiers.filter((e) => e && e !== 'quran-uthmani'))
  );

  const arKey = `surah:${number}:ar`;
  let arDetail = !force ? loadQuranCache<SurahDetail>(arKey) : null;
  const editionsMap: Record<string, SurahDetail> = {};
  const uncachedEditions: string[] = [];

  for (const id of uniqueEditions) {
    if (!force) {
      const edKey = `surah:${number}:${id}`;
      const cached = loadQuranCache<SurahDetail>(edKey);
      if (cached && cached.ayahs && cached.ayahs.length > 0) {
        editionsMap[id] = cached;
        continue;
      }
    }
    uncachedEditions.push(id);
  }

  // If Arabic and all requested editions are already present in cache, return immediately
  if (
    arDetail &&
    arDetail.ayahs &&
    arDetail.ayahs.length > 0 &&
    uncachedEditions.length === 0
  ) {
    return { arabic: arDetail, editions: editionsMap };
  }

  // If all requested translation editions are cached but Arabic is missing, fetch Arabic-only
  if (uncachedEditions.length === 0 && (!arDetail || !arDetail.ayahs || arDetail.ayahs.length === 0)) {
    try {
      const res = await fetchWithTimeout(`${BASE}/surah/${number}/editions/quran-uthmani`, {}, 4000);
      if (res.ok) {
        const json = await res.json();
        const arabicData = json.data?.[0];
        if (arabicData && Array.isArray(arabicData.ayahs)) {
          arDetail = {
            number: arabicData.number || number,
            name: arabicData.name || '',
            englishName: arabicData.englishName || '',
            englishNameTranslation: arabicData.englishNameTranslation || '',
            numberOfAyahs: arabicData.numberOfAyahs || arabicData.ayahs.length,
            ayahs: arabicData.ayahs.map((a: any) => ({
              number: a.number,
              numberInSurah: a.numberInSurah,
              text: a.text,
              surah: {
                number: arabicData.number || number,
                name: arabicData.name || '',
                englishName: arabicData.englishName || '',
              },
              translation: undefined,
              page: a.page,
              juz: a.juz,
              manzil: a.manzil,
              ruku: a.ruku,
              hizbQuarter: a.hizbQuarter,
              sajda: a.sajda,
            })),
          };
          saveQuranCache(arKey, arDetail);
          return { arabic: arDetail, editions: editionsMap };
        }
      }
    } catch {
      // non-fatal, will throw or fallback below
    }
  }

  // Chunk uncached editions into batches of ~15 to avoid excessive URL length and payload sizes
  const batches: string[][] = [];
  for (let i = 0; i < uncachedEditions.length; i += QURAN_MULTI_EDITION_BATCH_SIZE) {
    batches.push(uncachedEditions.slice(i, i + QURAN_MULTI_EDITION_BATCH_SIZE));
  }

  let batchIndex = 0;
  for (const batch of batches) {
    if (batchIndex > 0) {
      // Brief polite delay between multi-edition batches
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    batchIndex++;

    try {
      const editionsParam = `quran-uthmani,${batch.join(',')}`;
      const res = await fetchWithTimeout(`${BASE}/surah/${number}/editions/${editionsParam}`, {}, 4000);
      if (!res.ok) {
        continue;
      }
      const json = await res.json();
      if (json.code !== 200 || !Array.isArray(json.data) || json.data.length === 0) {
        continue;
      }

      const arabicData =
        json.data.find(
          (d: any) => d.edition?.identifier === 'quran-uthmani' || d.edition?.type === 'quran'
        ) || json.data[0];

      if (!arabicData || !Array.isArray(arabicData.ayahs)) {
        continue;
      }

      const arabicAyahsBase = arabicData.ayahs.map((a: any) => ({
        number: a.number,
        numberInSurah: a.numberInSurah,
        text: a.text,
        surah: {
          number: arabicData.number || number,
          name: arabicData.name || '',
          englishName: arabicData.englishName || '',
        },
        page: a.page,
        juz: a.juz,
        manzil: a.manzil,
        ruku: a.ruku,
        hizbQuarter: a.hizbQuarter,
        sajda: a.sajda,
      }));

      if (!arDetail || !arDetail.ayahs || arDetail.ayahs.length === 0) {
        arDetail = {
          number: arabicData.number || number,
          name: arabicData.name || '',
          englishName: arabicData.englishName || '',
          englishNameTranslation: arabicData.englishNameTranslation || '',
          numberOfAyahs: arabicData.numberOfAyahs || arabicAyahsBase.length,
          ayahs: arabicAyahsBase.map((a: any) => ({
            ...a,
            translation: undefined,
          })),
        };
        saveQuranCache(arKey, arDetail);
      }

      for (const item of json.data) {
        const identifier = item.edition?.identifier;
        if (!identifier || identifier === 'quran-uthmani') {
          continue;
        }

        const editionDetail: SurahDetail = {
          number: arabicData.number || number,
          name: arabicData.name || '',
          englishName: arabicData.englishName || '',
          englishNameTranslation: arabicData.englishNameTranslation || '',
          numberOfAyahs: arabicData.numberOfAyahs || arabicAyahsBase.length,
          ayahs: arabicAyahsBase.map((a: any, i: number) => ({
            ...a,
            translation: item.ayahs && item.ayahs[i] ? item.ayahs[i].text : undefined,
          })),
        };

        saveQuranCache(`surah:${number}:${identifier}`, editionDetail);
        editionsMap[identifier] = editionDetail;
      }
    } catch {
      // Partial batch failure, continue to other batches
    }
  }

  if (arDetail && arDetail.ayahs && arDetail.ayahs.length > 0) {
    return {
      arabic: arDetail,
      editions: editionsMap,
    };
  }

  throw new Error(`Multi-edition fetch failed for Surah ${number}`);
}

export async function fetchAyah(
  reference: string, // e.g. "2:255" or "255"
  edition = TRANSLATION
): Promise<Ayah> {
  const key = `ayah:${reference}:${edition}`;
  const cached = loadQuranCache<Ayah>(key);
  if (cached) return cached;

  const res = await fetchWithTimeout(`${BASE}/ayah/${reference}/${edition}`, {}, 4000);
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
  const key = `tafsir:ayah:${surah}:${ayah}:${tafsirIdentifier}:v2`;
  const cached = loadQuranCache<{ text: string; edition: string }>(key);
  if (cached) return cached;

  // PRIMARY tafsir source: tafsir_api (jsDelivr, pinned) — REAL per-ayah text
  // in English/Urdu/Bengali/Arabic. Identifier prefixed `api:<slug>`.
  if (tafsirIdentifier.startsWith('api:')) {
    const slug = tafsirIdentifier.slice('api:'.length);
    const r = await fetchTafsirApi(surah, ayah, slug);
    const result = { text: r.text, edition: r.author };
    saveQuranCache(key, result);
    return result;
  }

  // islamic.app tafsir removed — the API served the surah intro for every
  // ayah (defective). tafsir_api (`api:` prefix) is the tafsir provider now.

  try {
    const res = await fetchWithTimeout(`${BASE}/ayah/${surah}:${ayah}/${tafsirIdentifier}`, {}, 4000);
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

  // Never silently substitute a different-language tafsir (e.g. Arabic) for
  // a requested non-Arabic edition. If the requested identifier is not the
  // default Arabic one, surface unavailability instead of fake content.
  if (tafsirIdentifier !== 'ar.jalalayn') {
    throw new Error('Tafsir unavailable for the selected language');
  }

  const res2 = await fetchWithTimeout(`${BASE}/ayah/${surah}:${ayah}/ar.jalalayn`, {}, 4000);
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

  // tafsir_api (jsDelivr, pinned): REAL per-ayah text — fetch the full surah.
  if (tafsirIdentifier.startsWith('api:')) {
    const slug = tafsirIdentifier.slice('api:'.length);
    // 1. Try single-request full surah JSON from CDN first (fast & complete)
    try {
      const canonical = getCanonicalTafsirSlug(slug);
      const res = await fetchWithTimeout(
        `${TAFSIR_API_BASE}/${canonical}/${surah}.json`,
        {},
        8000
      );
      if (res.ok) {
        const json = await res.json();
        const rawList = Array.isArray(json) ? json : (Array.isArray(json?.ayahs) ? json.ayahs : null);
        if (rawList && rawList.length > 0) {
          const out: Array<{ ayahNumber: number; text: string }> = [];
          for (const item of rawList) {
            const ayahNum = Number(item?.ayah);
            const txt = item?.text;
            if (Number.isFinite(ayahNum) && typeof txt === 'string' && txt.trim()) {
              out.push({ ayahNumber: ayahNum, text: txt });
              saveQuranCache(`tafsir-api:${surah}:${ayahNum}:${slug}`, {
                text: txt,
                author: slug,
                language: '',
              });
              saveQuranCache(`tafsir:ayah:${surah}:${ayahNum}:${tafsirIdentifier}:v2`, {
                text: txt,
                edition: slug,
              });
            }
          }
          if (out.length > 0) {
            saveQuranCache(key, out);
            return out;
          }
        }
      }
    } catch {
      // gap — fall back to per-ayah fetch loop
    }

    const out: Array<{ ayahNumber: number; text: string }> = [];
    const total = SURAH_AYAH_COUNTS[surah - 1] || 7;
    for (let ayah = 1; ayah <= total; ayah++) {
      try {
        const r = await fetchTafsirApi(surah, ayah, slug);
        out.push({ ayahNumber: ayah, text: r.text });
      } catch {
        // gap — skip
      }
    }
    if (!out.length) throw new Error('Tafsir unavailable');
    saveQuranCache(key, out);
    return out;
  }

  // islamic.app tafsir removed (served surah intro for every ayah).

  const res = await fetchWithTimeout(`${BASE}/surah/${surah}/${tafsirIdentifier}`, {}, 4000);
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

  const res = await fetchWithTimeout(`${BASE}/ayah/${surah}:${ayah}/editions/${editions.join(',')}`, {}, 4000);
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

/**
 * Fetch a single real Mushaf page (1..604).
 * Uses real AlQuran Cloud /page/{pageNumber} endpoints and existing cache conventions.
 * Response contains all ayahs on that page with authentic metadata.
 */
export async function fetchMushafPage(
  pageNumber: number,
  withTranslation = true,
  translationEdition = 'en.sahih',
  force = false
): Promise<MushafPageDetail> {
  const safePage = Math.max(1, Math.min(TOTAL_MUSHAF_PAGES, Math.round(pageNumber) || 1));
  const key = `mushaf-page:${safePage}:${withTranslation ? translationEdition : 'ar'}`;

  if (!force) {
    const cached = loadQuranCache<MushafPageDetail>(key);
    if (cached && cached.pageNumber === safePage && Array.isArray(cached.ayahs) && cached.ayahs.length > 0) {
      return cached;
    }
  }

  const editionParam = withTranslation
    ? `quran-uthmani,${translationEdition}`
    : 'quran-uthmani';

  let arabicAyahs: any[] | null = null;
  let translationAyahs: any[] | null = null;
  let surahsFromApi: Record<string, any> = {};

  // Try the multi-editions endpoint if supported by the provider
  try {
    const multiRes = await fetchWithTimeout(
      `${BASE}/page/${safePage}/editions/${editionParam}`,
      {},
      4000
    );
    if (multiRes.ok) {
      const json = await multiRes.json();
      if (json.code === 200 && Array.isArray(json.data) && json.data.length > 0) {
        const arData =
          json.data.find(
            (d: any) => d.edition?.identifier === 'quran-uthmani' || d.edition?.type === 'quran'
          ) || json.data[0];
        const trData =
          json.data.find(
            (d: any) => d.edition?.identifier === translationEdition
          ) || json.data[1];
        if (arData && Array.isArray(arData.ayahs)) {
          arabicAyahs = arData.ayahs;
          translationAyahs = trData?.ayahs || null;
          if (arData.surahs && typeof arData.surahs === 'object') {
            surahsFromApi = arData.surahs;
          }
        }
      }
    }
  } catch {
    // Multi-edition page route not available, proceed to per-edition fetch
  }

  if (!arabicAyahs) {
    try {
      const fetchAr = fetchWithTimeout(`${BASE}/page/${safePage}/quran-uthmani`, {}, 4000);
      const fetchTr = withTranslation
        ? fetchWithTimeout(`${BASE}/page/${safePage}/${translationEdition}`, {}, 4000).catch(
            async () => {
              if (translationEdition !== 'en.sahih') {
                return fetchWithTimeout(`${BASE}/page/${safePage}/en.sahih`, {}, 4000);
              }
              return null;
            }
          )
        : Promise.resolve(null);

      const [arRes, trRes] = await Promise.all([fetchAr, fetchTr]);
      if (!arRes.ok) throw new Error(`Page fetch failed: HTTP ${arRes.status}`);
      const arJson = await arRes.json();
      if (arJson.code !== 200 || !arJson.data || !Array.isArray(arJson.data.ayahs)) {
        throw new Error('Page non-200');
      }
      arabicAyahs = arJson.data.ayahs;
      if (arJson.data.surahs && typeof arJson.data.surahs === 'object') {
        surahsFromApi = arJson.data.surahs;
      }

      if (trRes && trRes.ok) {
        const trJson = await trRes.json();
        if (trJson.code === 200 && trJson.data && Array.isArray(trJson.data.ayahs)) {
          translationAyahs = trJson.data.ayahs;
        }
      }
    } catch (err) {
      // Fallback: Check if cached surahs contain real ayahs with a.page === safePage
      const cachedAyahsForPage: MushafPageAyah[] = [];
      const bundled114 = getBundledSurahs114();
      for (const s of bundled114) {
        const cachedSurah =
          loadQuranCache<SurahDetail>(`surah:${s.number}:${withTranslation ? translationEdition : 'ar'}`) ||
          loadQuranCache<SurahDetail>(`surah:${s.number}:ar`);
        if (cachedSurah && Array.isArray(cachedSurah.ayahs)) {
          for (const a of cachedSurah.ayahs) {
            if (a.page === safePage) {
              cachedAyahsForPage.push({
                number: a.number,
                numberInSurah: a.numberInSurah,
                text: a.text,
                surah: {
                  number: s.number,
                  name: s.name,
                  englishName: s.englishName,
                  englishNameTranslation: s.englishNameTranslation,
                  numberOfAyahs: s.numberOfAyahs,
                  revelationType: s.revelationType,
                },
                juz: a.juz || 1,
                manzil: a.manzil,
                page: safePage,
                ruku: a.ruku,
                hizbQuarter: a.hizbQuarter,
                sajda: a.sajda,
                translation: a.translation,
              });
            }
          }
        }
      }

      if (cachedAyahsForPage.length > 0) {
        cachedAyahsForPage.sort((a, b) => a.number - b.number);
        const surahsMap: Record<number, SurahMeta> = {};
        for (const a of cachedAyahsForPage) {
          const sNum = a.surah.number;
          if (!surahsMap[sNum]) {
            const meta = bundled114.find((m) => m.number === sNum);
            if (meta) surahsMap[sNum] = meta;
          }
        }
        const fallbackDetail: MushafPageDetail = {
          pageNumber: safePage,
          ayahs: cachedAyahsForPage,
          surahs: Object.values(surahsMap),
          juz: cachedAyahsForPage.find((a) => typeof a.juz === 'number')?.juz,
          hizbQuarter: cachedAyahsForPage.find((a) => typeof a.hizbQuarter === 'number')?.hizbQuarter,
        };
        saveQuranCache(key, fallbackDetail);
        return fallbackDetail;
      }

      throw err;
    }
  }

  // Normalize page response
  const surahsMap: Record<number, SurahMeta> = {};
  const ayahs: MushafPageAyah[] = (arabicAyahs || []).map((a: any, i: number) => {
    const sNum = a.surah?.number;
    if (sNum && !surahsMap[sNum]) {
      const fromApi = surahsFromApi[sNum] || surahsFromApi[String(sNum)];
      surahsMap[sNum] = {
        number: sNum,
        name: a.surah.name || fromApi?.name || '',
        englishName: a.surah.englishName || fromApi?.englishName || '',
        englishNameTranslation: a.surah.englishNameTranslation || fromApi?.englishNameTranslation || '',
        numberOfAyahs: a.surah.numberOfAyahs || fromApi?.numberOfAyahs || 0,
        revelationType: a.surah.revelationType || fromApi?.revelationType || 'Meccan',
      };
    }

    return {
      number: a.number,
      numberInSurah: a.numberInSurah,
      text: a.text,
      surah: {
        number: a.surah?.number || 1,
        name: a.surah?.name || '',
        englishName: a.surah?.englishName || '',
        englishNameTranslation: a.surah?.englishNameTranslation,
        numberOfAyahs: a.surah?.numberOfAyahs,
        revelationType: a.surah?.revelationType,
      },
      juz: a.juz,
      manzil: a.manzil,
      page: a.page || safePage,
      ruku: a.ruku,
      hizbQuarter: a.hizbQuarter,
      sajda: a.sajda,
      translation: translationAyahs?.[i]?.text || undefined,
    };
  });

  const detail: MushafPageDetail = {
    pageNumber: safePage,
    ayahs,
    surahs: Object.values(surahsMap),
    juz: ayahs.find((a) => typeof a.juz === 'number')?.juz,
    hizbQuarter: ayahs.find((a) => typeof a.hizbQuarter === 'number')?.hizbQuarter,
  };

  saveQuranCache(key, detail);

  // Also cache Arabic-only page
  const arKey = `mushaf-page:${safePage}:ar`;
  if (!loadQuranCache(arKey)) {
    const arDetail: MushafPageDetail = {
      ...detail,
      ayahs: detail.ayahs.map((a) => ({
        ...a,
        translation: undefined,
      })),
    };
    saveQuranCache(arKey, arDetail);
  }

  return detail;
}

/**
 * Returns the exact Mushaf page number for a given (surah, ayah).
 * Uses real ayah page metadata from cache or canonical Surah start pages.
 * Never calculates page boundaries from proportional global ayah indexes.
 */
export function getMushafPageForAyah(surah: number, ayah: number): number {
  const safeSurah = Math.max(1, Math.min(114, surah || 1));
  const safeAyah = Math.max(1, ayah || 1);
  if (safeAyah === 1) {
    return getSurahStartPage(safeSurah);
  }
  const cached =
    loadQuranCache<SurahDetail>(`surah:${safeSurah}:en.sahih`) ||
    loadQuranCache<SurahDetail>(`surah:${safeSurah}:ar`);
  if (cached && Array.isArray(cached.ayahs)) {
    const found = cached.ayahs.find((a) => a.numberInSurah === safeAyah);
    if (found && typeof found.page === 'number' && found.page >= 1 && found.page <= TOTAL_MUSHAF_PAGES) {
      return found.page;
    }
  }
  return getSurahStartPage(safeSurah);
}

export {
  SURAH_START_PAGES,
  TOTAL_MUSHAF_PAGES,
  getSurahStartPage,
  getPrimarySurahForPage,
};

export {
  fetchSurahWithScript,
  QURAN_SCRIPTS,
  getScriptCacheKey,
  SCRIPT_FIELD_MAP,
} from './quranScripts';
export type { QuranScript, ScriptOption, ScriptAyahMap } from './quranScripts';