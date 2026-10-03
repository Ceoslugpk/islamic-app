import AsyncStorage from '@react-native-async-storage/async-storage';

export type NamesLanguage = 'en' | 'fr' | 'tr';

export interface NameVerseRef {
  surah: number;
  ayah: number;
}

export interface Name99 {
  number: number;
  arabic: string;
  transliteration: string;
  meaning: string;
  /** Localized name title (e.g. "Le Tout-Miséricordieux") when available. */
  name?: string;
  slug?: string;
  /** Absolute recitation URL (https://esmaulhusna.org/audio/{slug}.mp3). */
  audioUrl?: string;
  /** Up to two Quran references for this name, e.g. Quran 55:1. */
  verses?: NameVerseRef[];
}

export const NAMES_99: Name99[] = [
  { number: 1, arabic: 'الرَّحْمَنُ', transliteration: 'Ar-Rahman', meaning: 'The Most Gracious' },
  { number: 2, arabic: 'الرَّحِيمُ', transliteration: 'Ar-Raheem', meaning: 'The Most Merciful' },
  { number: 3, arabic: 'الْمَلِكُ', transliteration: 'Al-Malik', meaning: 'The Sovereign / King' },
  { number: 4, arabic: 'الْقُدُّوسُ', transliteration: 'Al-Quddus', meaning: 'The Most Holy' },
  { number: 5, arabic: 'السَّلَامُ', transliteration: 'As-Salam', meaning: 'The Source of Peace' },
  { number: 6, arabic: 'الْمُؤْمِنُ', transliteration: 'Al-Mu’min', meaning: 'The Guardian of Faith' },
  { number: 7, arabic: 'الْمُهَيْمِنُ', transliteration: 'Al-Muhaymin', meaning: 'The Protector' },
  { number: 8, arabic: 'الْعَزِيزُ', transliteration: 'Al-Aziz', meaning: 'The All-Mighty' },
  { number: 9, arabic: 'الْجَبَّارُ', transliteration: 'Al-Jabbar', meaning: 'The Compeller' },
  { number: 10, arabic: 'الْمُتَكَبِّرُ', transliteration: 'Al-Mutakabbir', meaning: 'The Supreme' },
  { number: 11, arabic: 'الْخَالِقُ', transliteration: 'Al-Khaliq', meaning: 'The Creator' },
  { number: 12, arabic: 'الْبَارِئُ', transliteration: 'Al-Bari’', meaning: 'The Maker of Order' },
  { number: 13, arabic: 'الْمُصَوِّرُ', transliteration: 'Al-Musawwir', meaning: 'The Fashioner of Forms' },
  { number: 14, arabic: 'الْغَفَّارُ', transliteration: 'Al-Ghaffar', meaning: 'The Ever-Forgiving' },
  { number: 15, arabic: 'الْقَهَّارُ', transliteration: 'Al-Qahhar', meaning: 'The All-Subduing' },
  { number: 16, arabic: 'الْوَهَّابُ', transliteration: 'Al-Wahhab', meaning: 'The Bestower' },
  { number: 17, arabic: 'الرَّزَّاقُ', transliteration: 'Ar-Razzaq', meaning: 'The Provider' },
  { number: 18, arabic: 'الْفَتَّاحُ', transliteration: 'Al-Fattah', meaning: 'The Opener' },
  { number: 19, arabic: 'الْعَلِيمُ', transliteration: 'Al-Alim', meaning: 'The All-Knowing' },
  { number: 20, arabic: 'الْقَابِضُ', transliteration: 'Al-Qabid', meaning: 'The Withholder' },
  { number: 21, arabic: 'الْبَاسِطُ', transliteration: 'Al-Basit', meaning: 'The Expander' },
  { number: 22, arabic: 'الْخَافِضُ', transliteration: 'Al-Khafid', meaning: 'The Abaser' },
  { number: 23, arabic: 'الرَّافِعُ', transliteration: 'Ar-Rafi’', meaning: 'The Exalter' },
  { number: 24, arabic: 'الْمُعِزُّ', transliteration: 'Al-Mu’izz', meaning: 'The Bestower of Honor' },
  { number: 25, arabic: 'الْمُذِلُّ', transliteration: 'Al-Mudhill', meaning: 'The Humiliator' },
  { number: 26, arabic: 'السَّمِيعُ', transliteration: 'As-Sami’', meaning: 'The All-Hearing' },
  { number: 27, arabic: 'الْبَصِيرُ', transliteration: 'Al-Basir', meaning: 'The All-Seeing' },
  { number: 28, arabic: 'الْحَكَمُ', transliteration: 'Al-Hakam', meaning: 'The Impartial Judge' },
  { number: 29, arabic: 'الْعَدْلُ', transliteration: 'Al-Adl', meaning: 'The Utterly Just' },
  { number: 30, arabic: 'اللَّطِيفُ', transliteration: 'Al-Latif', meaning: 'The Subtle One' },
  { number: 31, arabic: 'الْخَبِيرُ', transliteration: 'Al-Khabir', meaning: 'The All-Aware' },
  { number: 32, arabic: 'الْحَلِيمُ', transliteration: 'Al-Halim', meaning: 'The Forbearing' },
  { number: 33, arabic: 'الْعَظِيمُ', transliteration: 'Al-Azim', meaning: 'The Magnificent' },
  { number: 34, arabic: 'الْغَفُورُ', transliteration: 'Al-Ghafur', meaning: 'The All-Forgiving' },
  { number: 35, arabic: 'الشَّكُورُ', transliteration: 'Ash-Shakur', meaning: 'The Most Appreciative' },
  { number: 36, arabic: 'الْعَلِيُّ', transliteration: 'Al-Aliyy', meaning: 'The Most High' },
  { number: 37, arabic: 'الْكَبِيرُ', transliteration: 'Al-Kabir', meaning: 'The Greatest' },
  { number: 38, arabic: 'الْحَفِيظُ', transliteration: 'Al-Hafiz', meaning: 'The Preserver' },
  { number: 39, arabic: 'الْمُقِيتُ', transliteration: 'Al-Muqit', meaning: 'The Sustainer' },
  { number: 40, arabic: 'الْحَسِيبُ', transliteration: 'Al-Hasib', meaning: 'The Reckoner' },
  { number: 41, arabic: 'الْجَلِيلُ', transliteration: 'Al-Jalil', meaning: 'The Majestic' },
  { number: 42, arabic: 'الْكَرِيمُ', transliteration: 'Al-Karim', meaning: 'The Most Generous' },
  { number: 43, arabic: 'الرَّقِيبُ', transliteration: 'Ar-Raqib', meaning: 'The Watchful' },
  { number: 44, arabic: 'الْمُجِيبُ', transliteration: 'Al-Mujib', meaning: 'The Responsive' },
  { number: 45, arabic: 'الْوَاسِعُ', transliteration: 'Al-Wasi’', meaning: 'The Boundless' },
  { number: 46, arabic: 'الْحَكِيمُ', transliteration: 'Al-Hakim', meaning: 'The All-Wise' },
  { number: 47, arabic: 'الْوَدُودُ', transliteration: 'Al-Wadud', meaning: 'The Most Loving' },
  { number: 48, arabic: 'الْمَجِيدُ', transliteration: 'Al-Majid', meaning: 'The Glorious' },
  { number: 49, arabic: 'الْبَاعِثُ', transliteration: 'Al-Ba’ith', meaning: 'The Resurrector' },
  { number: 50, arabic: 'الشَّهِيدُ', transliteration: 'Ash-Shahid', meaning: 'The Universal Witness' },
  { number: 51, arabic: 'الْحَقُّ', transliteration: 'Al-Haqq', meaning: 'The Absolute Truth' },
  { number: 52, arabic: 'الْوَكِيلُ', transliteration: 'Al-Wakil', meaning: 'The Trustee' },
  { number: 53, arabic: 'الْقَوِيُّ', transliteration: 'Al-Qawiyy', meaning: 'The Most Strong' },
  { number: 54, arabic: 'الْمَتِينُ', transliteration: 'Al-Matin', meaning: 'The Firm' },
  { number: 55, arabic: 'الْوَلِيُّ', transliteration: 'Al-Waliyy', meaning: 'The Protecting Associate' },
  { number: 56, arabic: 'الْحَمِيدُ', transliteration: 'Al-Hamid', meaning: 'The All-Praiseworthy' },
  { number: 57, arabic: 'الْمُحْصِي', transliteration: 'Al-Muhsi', meaning: 'The Accounter' },
  { number: 58, arabic: 'الْمُبْدِئُ', transliteration: 'Al-Mubdi’', meaning: 'The Originator' },
  { number: 59, arabic: 'الْمُعِيدُ', transliteration: 'Al-Mu’id', meaning: 'The Restorer' },
  { number: 60, arabic: 'الْمُحْيِي', transliteration: 'Al-Muhyi', meaning: 'The Giver of Life' },
  { number: 61, arabic: 'الْمُمِيتُ', transliteration: 'Al-Mumit', meaning: 'The Bringer of Death' },
  { number: 62, arabic: 'الْحَيُّ', transliteration: 'Al-Hayy', meaning: 'The Ever-Living' },
  { number: 63, arabic: 'الْقَيُّومُ', transliteration: 'Al-Qayyum', meaning: 'The Self-Existing Sustainer' },
  { number: 64, arabic: 'الْوَاجِدُ', transliteration: 'Al-Wajid', meaning: 'The Perceiver' },
  { number: 65, arabic: 'الْمَاجِدُ', transliteration: 'Al-Majid', meaning: 'The Illustrious' },
  { number: 66, arabic: 'الْوَاحِدُ', transliteration: 'Al-Wahid', meaning: 'The One' },
  { number: 67, arabic: 'الْأَحَدُ', transliteration: 'Al-Ahad', meaning: 'The Unique Indivisible' },
  { number: 68, arabic: 'الصَّمَدُ', transliteration: 'As-Samad', meaning: 'The Eternal Refuge' },
  { number: 69, arabic: 'الْقَادِرُ', transliteration: 'Al-Qadir', meaning: 'The All-Capable' },
  { number: 70, arabic: 'الْمُقْتَدِرُ', transliteration: 'Al-Muqtadir', meaning: 'The Determiner' },
  { number: 71, arabic: 'الْمُقَدِّمُ', transliteration: 'Al-Muqaddim', meaning: 'The Expediter' },
  { number: 72, arabic: 'الْمُؤَخِّرُ', transliteration: 'Al-Mu’akhkhir', meaning: 'The Delayer' },
  { number: 73, arabic: 'الْأَوَّلُ', transliteration: 'Al-Awwal', meaning: 'The First' },
  { number: 74, arabic: 'الْآخِرُ', transliteration: 'Al-Akhir', meaning: 'The Last' },
  { number: 75, arabic: 'الظَّاهِرُ', transliteration: 'Az-Zahir', meaning: 'The Manifest' },
  { number: 76, arabic: 'الْبَاطِنُ', transliteration: 'Al-Batin', meaning: 'The Hidden' },
  { number: 77, arabic: 'الْوَالِي', transliteration: 'Al-Wali', meaning: 'The Sole Governor' },
  { number: 78, arabic: 'الْمُتَعَالِي', transliteration: 'Al-Muta’ali', meaning: 'The Self-Exalted' },
  { number: 79, arabic: 'الْبَرُّ', transliteration: 'Al-Barr', meaning: 'The Source of All Goodness' },
  { number: 80, arabic: 'التَّوَّابُ', transliteration: 'At-Tawwab', meaning: 'The Ever-Acceptor of Repentance' },
  { number: 81, arabic: 'الْمُنْتَقِمُ', transliteration: 'Al-Muntaqim', meaning: 'The Just Avenger' },
  { number: 82, arabic: 'الْعَفُوُّ', transliteration: 'Al-Afuww', meaning: 'The Pardoner' },
  { number: 83, arabic: 'الرَّءُوفُ', transliteration: 'Ar-Ra’uf', meaning: 'The Most Kind' },
  { number: 84, arabic: 'مَالِكُ الْمُلْكِ', transliteration: 'Malik-ul-Mulk', meaning: 'The Owner of All Sovereignty' },
  { number: 85, arabic: 'ذُو الْجَلَالِ وَالْإِكْرَامِ', transliteration: 'Dhul-Jalali wal-Ikram', meaning: 'Lord of Majesty and Generosity' },
  { number: 86, arabic: 'الْمُقْسِطُ', transliteration: 'Al-Muqsit', meaning: 'The Equitable' },
  { number: 87, arabic: 'الْجَامِعُ', transliteration: 'Al-Jami’', meaning: 'The Gatherer' },
  { number: 88, arabic: 'الْغَنِيُّ', transliteration: 'Al-Ghaniyy', meaning: 'The Self-Sufficient' },
  { number: 89, arabic: 'الْمُغْنِي', transliteration: 'Al-Mughni', meaning: 'The Enricher' },
  { number: 90, arabic: 'الْمَانِعُ', transliteration: 'Al-Mani’', meaning: 'The Preventer of Harm' },
  { number: 91, arabic: 'الضَّارُّ', transliteration: 'Ad-Darr', meaning: 'The Creator of the Harmful' },
  { number: 92, arabic: 'النَّافِعُ', transliteration: 'An-Nafi’', meaning: 'The Creator of Good' },
  { number: 93, arabic: 'النُّورُ', transliteration: 'An-Nur', meaning: 'The Illuminating Light' },
  { number: 94, arabic: 'الْهَادِي', transliteration: 'Al-Hadi', meaning: 'The Guide' },
  { number: 95, arabic: 'الْبَدِيعُ', transliteration: 'Al-Badi’', meaning: 'The Incomparable Originator' },
  { number: 96, arabic: 'الْبَاقِي', transliteration: 'Al-Baqi', meaning: 'The Everlasting' },
  { number: 97, arabic: 'الْوَارِثُ', transliteration: 'Al-Warith', meaning: 'The Supreme Inheritor' },
  { number: 98, arabic: 'الرَّشِيدُ', transliteration: 'Ar-Rashid', meaning: 'The Infallible Teacher' },
  { number: 99, arabic: 'الصَّبُورُ', transliteration: 'As-Sabur', meaning: 'The Timeless Patient' },
];

/* ─── EsmaulHusna.org fetch layer (keyless) ───────────────────── */

export const NAMES_API_BASE = 'https://esmaulhusna.org';
export const NAMES_API_URL = `${NAMES_API_BASE}/esmas/`;

export const NAMES_LANGUAGES: { code: NamesLanguage; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Français' },
  { code: 'tr', label: 'Türkçe' },
];

const CACHE_PREFIX = 'names99:cache:';
const FETCH_TIMEOUT_MS = 12000;
const MIN_EXPECTED_NAMES = 90;

interface EsmaRecord {
  id?: number;
  slug?: string;
  ar?: string;
  'ar-enhanced'?: string;
  audio?: string;
  transliteration?: { iso?: string; popular?: Partial<Record<NamesLanguage, string>> };
  name?: Partial<Record<NamesLanguage, string>>;
  explanation?: { short?: Partial<Record<NamesLanguage, string>> };
  verse?: Record<string, number[]>;
}

const STATIC_BY_NUMBER = new Map<number, Name99>(NAMES_99.map((item) => [item.number, item]));

function nonEmpty(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

/** Map the API `verse` object ({ "55": [1, 2], "1": [2] }) into up to two sorted references. */
function mapVerseRefs(verse: Record<string, number[]> | undefined): NameVerseRef[] {
  if (!verse || typeof verse !== 'object') return [];
  const refs: NameVerseRef[] = [];
  const surahs = Object.keys(verse)
    .map((key) => Number.parseInt(key, 10))
    .filter((surah) => Number.isFinite(surah) && surah >= 1 && surah <= 114)
    .sort((a, b) => a - b);

  for (const surah of surahs) {
    const ayahs = verse[String(surah)];
    const ayah = Array.isArray(ayahs) ? ayahs.find((value) => Number.isFinite(value) && value > 0) : undefined;
    if (ayah !== undefined) refs.push({ surah, ayah });
    if (refs.length >= 2) break;
  }
  return refs;
}

/** Map one API record onto the app's Name99 shape, falling back to the static entry per field. */
function mapEsmaItem(item: EsmaRecord, language: NamesLanguage): Name99 | null {
  const number = Number(item?.id);
  if (!Number.isFinite(number)) return null;
  const fallback = STATIC_BY_NUMBER.get(number);
  if (!fallback) return null;

  const arabic = nonEmpty(item['ar-enhanced']) || nonEmpty(item.ar) || fallback.arabic;
  const transliteration =
    nonEmpty(item.transliteration?.popular?.[language]) ||
    nonEmpty(item.transliteration?.iso) ||
    fallback.transliteration;
  const meaning =
    nonEmpty(item.explanation?.short?.[language]) ||
    nonEmpty(item.explanation?.short?.['en']) ||
    fallback.meaning;

  const localized = nonEmpty(item.name?.[language]);
  const slug = nonEmpty(item.slug);
  const audioPath = nonEmpty(item.audio);
  const verses = mapVerseRefs(item.verse);

  const mapped: Name99 = { number, arabic, transliteration, meaning };
  if (localized && localized !== meaning) mapped.name = localized;
  if (slug) mapped.slug = slug;
  if (audioPath) mapped.audioUrl = `${NAMES_API_BASE}${audioPath}`;
  if (verses.length > 0) mapped.verses = verses;
  return mapped;
}

function isValidCachedName(item: unknown): item is Name99 {
  if (!item || typeof item !== 'object') return false;
  const candidate = item as Partial<Name99>;
  return (
    typeof candidate.number === 'number' &&
    typeof candidate.arabic === 'string' &&
    typeof candidate.transliteration === 'string' &&
    typeof candidate.meaning === 'string'
  );
}

/** Read previously cached names for a language (instant offline render). */
export async function loadCachedNames(language: NamesLanguage): Promise<Name99[] | null> {
  try {
    const raw = await AsyncStorage.getItem(`${CACHE_PREFIX}${language}`);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const items = parsed.filter(isValidCachedName);
      if (items.length >= MIN_EXPECTED_NAMES) return items;
    }
  } catch {
    // Cache read failed; caller decides the fallback
  }
  return null;
}

async function fetchJsonWithTimeout(url: string): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as unknown;
  } finally {
    clearTimeout(timer);
  }
}

function extractList(json: unknown): unknown[] | null {
  if (Array.isArray(json)) return json;
  if (json && typeof json === 'object') {
    const data = (json as { data?: unknown }).data;
    if (Array.isArray(data)) return data;
  }
  return null;
}

/**
 * Fetch the 99 names for a language from EsmaulHusna.org (keyless), map them to the app
 * shape, and cache them in AsyncStorage. Falls back to the cached list, then to the static
 * English NAMES_99 array when offline (audio/verse fields are then absent).
 */
export async function fetchNames(language: NamesLanguage): Promise<Name99[]> {
  try {
    const json = await fetchJsonWithTimeout(NAMES_API_URL);
    const list = extractList(json);
    if (!list) throw new Error('Invalid EsmaulHusna response');

    const items: Name99[] = [];
    for (const entry of list) {
      const mapped = mapEsmaItem(entry as EsmaRecord, language);
      if (mapped) items.push(mapped);
    }
    if (items.length < MIN_EXPECTED_NAMES) throw new Error('Incomplete EsmaulHusna payload');
    items.sort((a, b) => a.number - b.number);

    try {
      await AsyncStorage.setItem(`${CACHE_PREFIX}${language}`, JSON.stringify(items));
    } catch {
      // Non-fatal cache write failure
    }
    return items;
  } catch {
    const cached = await loadCachedNames(language);
    if (cached) return cached;
    return NAMES_99;
  }
}
