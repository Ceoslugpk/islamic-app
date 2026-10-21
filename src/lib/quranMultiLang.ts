import { fetchWithTimeout } from './quran';
import { isAppOnline } from './useConnectivity';
import { SURAH_AYAH_COUNTS } from './surahAyahCounts';

const BASE = 'https://api.alquran.cloud/v1';

export interface TranslationAyah {
  number: number;
  surah: number;
  ayahInSurah: number;
  text: string;
  edition: { identifier: string; language: string; name: string };
}

export interface SurahTranslationsResult {
  surahNumber: number;
  translations: Record<string, TranslationAyah[]>;
}

export async function fetchSurahTranslations(
  surahNumber: number,
  editionIdentifiers: string[]
): Promise<SurahTranslationsResult> {
  if (editionIdentifiers.length === 0) {
    throw new Error('At least one edition identifier is required');
  }

  if (!isAppOnline()) {
    throw new Error(`Device offline: cannot fetch translations for surah ${surahNumber}`);
  }

  const editionsParam = editionIdentifiers.join(',');
  const url = `${BASE}/surah/${surahNumber}/editions/${editionsParam}`;

  const res = await fetchWithTimeout(url, {}, 4000);
  if (!res.ok) {
    throw new Error(`Failed to fetch surah ${surahNumber} translations: ${res.status} ${res.statusText}`);
  }

  const json = await res.json();
  if (json.code !== 200 || !Array.isArray(json.data)) {
    throw new Error('Invalid response from AlQuran Cloud API');
  }

  const translations: Record<string, TranslationAyah[]> = {};

  for (const editionData of json.data) {
    const identifier = editionData.edition?.identifier;
    if (!identifier) continue;

    const editionInfo = {
      identifier: editionData.edition.identifier,
      language: editionData.edition.language || '',
      name: editionData.edition.name || editionData.edition.englishName || identifier,
    };

    const ayahs: TranslationAyah[] = (editionData.ayahs || []).map((a: any) => ({
      number: a.number,
      surah: a.surah?.number || surahNumber,
      ayahInSurah: a.numberInSurah,
      text: a.text || '',
      edition: editionInfo,
    }));

    translations[identifier] = ayahs;
  }

  const expectedAyahCount = SURAH_AYAH_COUNTS[surahNumber - 1];
  for (const requestedEdition of editionIdentifiers) {
    const ayahs = translations[requestedEdition];
    if (
      !ayahs ||
      ayahs.length === 0 ||
      (expectedAyahCount && ayahs.length !== expectedAyahCount) ||
      ayahs.some((ayah) => typeof ayah.text !== 'string' || !ayah.text.trim())
    ) {
      throw new Error(`Translation edition "${requestedEdition}" is unavailable for surah ${surahNumber}`);
    }
  }

  return {
    surahNumber,
    translations,
  };
}
