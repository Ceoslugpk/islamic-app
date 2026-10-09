import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchWithTimeout } from './quran';
import { isAppOnline } from './useConnectivity';

export interface HadithCollection {
  slug: string;
  type: string;
  name: {
    en: string;
    ar: string;
  };
  intro: {
    en: string | null;
    ar: string | null;
  };
  hasBooks: boolean;
  hasChapters: boolean;
  totalHadith: number;
  totalAvailable: number;
}

export interface HadithBook {
  collection: string;
  bookNumber: string;
  name: {
    en: string;
    ar: string;
  };
  intro: {
    en: string | null;
    ar: string | null;
  };
  hadithStartNumber: number;
  hadithEndNumber: number;
  hadithCount: number;
}

export interface HadithGrade {
  graded_by: string | null;
  grade: string;
}

export interface HadithContent {
  urn?: number;
  body?: string;
  text?: string;
  grades?: HadithGrade[];
}

export interface HadithItem {
  collection: string;
  bookNumber: string;
  hadithNumber: string;
  chapterId?: string;
  chapterNumber?: string;
  chapterTitle?: {
    en: string;
    ar: string;
  };
  en?: HadithContent;
  ar?: HadithContent;
}

export interface HadithListResponse {
  total: number;
  limit: number;
  offset: number;
  hadiths: HadithItem[];
}

const API_BASE = 'https://api.islamic.app/v1/hadith';

export const FALLBACK_COLLECTIONS: HadithCollection[] = [
  {
    slug: 'bukhari',
    type: 'hadith',
    name: { en: 'Sahih al-Bukhari', ar: 'صحيح البخاري' },
    intro: {
      en: 'Sahih al-Bukhari is recognized by the overwhelming majority of the Muslim world to be the most authentic collection of reports of the Sunnah of the Prophet Muhammad (ﷺ). It contains over 7500 hadith in 97 books.',
      ar: null,
    },
    hasBooks: true,
    hasChapters: true,
    totalHadith: 7291,
    totalAvailable: 7277,
  },
  {
    slug: 'muslim',
    type: 'hadith',
    name: { en: 'Sahih Muslim', ar: 'صحيح مسلم' },
    intro: {
      en: 'Sahih Muslim is considered to be one of the most authentic collections of the Sunnah of the Prophet (ﷺ), along with Sahih al-Bukhari forming the Sahihain.',
      ar: null,
    },
    hasBooks: true,
    hasChapters: true,
    totalHadith: 7500,
    totalAvailable: 7470,
  },
  {
    slug: 'nasai',
    type: 'hadith',
    name: { en: "Sunan an-Nasa'i", ar: 'سنن النسائي' },
    intro: {
      en: "Sunan an-Nasa'i is one of the six canonical collections (Kutub as-Sittah). It contains roughly 5700 hadith in 52 books.",
      ar: null,
    },
    hasBooks: true,
    hasChapters: true,
    totalHadith: 5766,
    totalAvailable: 5768,
  },
  {
    slug: 'abudawud',
    type: 'hadith',
    name: { en: 'Sunan Abi Dawud', ar: 'سنن أبي داود' },
    intro: {
      en: 'Sunan Abi Dawud is widely considered among the six canonical collections of hadith, consisting of 5274 ahadith in 43 books.',
      ar: null,
    },
    hasBooks: true,
    hasChapters: true,
    totalHadith: 5276,
    totalAvailable: 5276,
  },
  {
    slug: 'tirmidhi',
    type: 'hadith',
    name: { en: 'Jami` at-Tirmidhi', ar: 'جامع الترمذي' },
    intro: {
      en: 'Jami` at-Tirmidhi is one of the six canonical collections of hadith, containing roughly 4400 hadith in 46 books.',
      ar: null,
    },
    hasBooks: true,
    hasChapters: true,
    totalHadith: 3956,
    totalAvailable: 4053,
  },
  {
    slug: 'ibnmajah',
    type: 'hadith',
    name: { en: 'Sunan Ibn Majah', ar: 'سنن ابن ماجه' },
    intro: {
      en: 'Sunan Ibn Majah is widely considered to be the sixth of the six canonical collections of hadith, consisting of 4341 ahadith in 37 books.',
      ar: null,
    },
    hasBooks: true,
    hasChapters: true,
    totalHadith: 4341,
    totalAvailable: 4345,
  },
  {
    slug: 'malik',
    type: 'hadith',
    name: { en: 'Muwatta Malik', ar: 'موطأ مالك' },
    intro: {
      en: "Imam Malik's Muwatta is one of the earliest written collections of Hadith, comprising subjects of Islamic law.",
      ar: null,
    },
    hasBooks: true,
    hasChapters: true,
    totalHadith: 1973,
    totalAvailable: 1973,
  },
  {
    slug: 'riyadussalihin',
    type: 'hadith',
    name: { en: 'Riyad as-Salihin', ar: 'رياض الصالحين' },
    intro: {
      en: 'Compiled by Imam Yahya ibn Sharaf an-Nawawi, containing approximately 1,900 carefully chosen hadith on ethics, manners, and worship.',
      ar: null,
    },
    hasBooks: true,
    hasChapters: true,
    totalHadith: 1895,
    totalAvailable: 1896,
  },
  {
    slug: 'mishkat',
    type: 'hadith',
    name: { en: 'Mishkat al-Masabih', ar: 'مشكاة المصابيح' },
    intro: {
      en: 'Compiled by Imam Khatib at-Tabrizi, containing approximately 6,000 hadith chosen from the Six Books and Musnad Ahmad.',
      ar: null,
    },
    hasBooks: true,
    hasChapters: true,
    totalHadith: 6285,
    totalAvailable: 5319,
  },
  {
    slug: 'bulugh',
    type: 'hadith',
    name: { en: 'Bulugh al-Maram', ar: 'بلوغ المرام' },
    intro: {
      en: 'Compiled by Ibn Hajar al-Asqalani, focusing on traditions from which Islamic jurisprudence rulings are derived.',
      ar: null,
    },
    hasBooks: true,
    hasChapters: true,
    totalHadith: 1582,
    totalAvailable: 1767,
  },
  {
    slug: 'adab',
    type: 'hadith',
    name: { en: 'Al-Adab Al-Mufrad', ar: 'الأدب المفرد' },
    intro: {
      en: 'Compiled by Imam al-Bukhari addressing the question of perfecting Muslim manners and character.',
      ar: null,
    },
    hasBooks: true,
    hasChapters: true,
    totalHadith: 1322,
    totalAvailable: 1326,
  },
  {
    slug: 'shamail',
    type: 'hadith',
    name: { en: "Ash-Shama'il Al-Muhammadiyah", ar: 'الشمائل المحمدية' },
    intro: {
      en: 'Compiled by Imam at-Tirmidhi detailing the physical appearance, characteristics, and noble habits of Prophet Muhammad (ﷺ).',
      ar: null,
    },
    hasBooks: true,
    hasChapters: true,
    totalHadith: 398,
    totalAvailable: 402,
  },
  {
    slug: 'hisn',
    type: 'hadith',
    name: { en: 'Hisn al-Muslim', ar: 'حصن المسلم' },
    intro: {
      en: 'Fortress of the Muslim: Invocations from the Quran and Sunnah by Sa’id bin Ali bin Wahf Al-Qahtani.',
      ar: null,
    },
    hasBooks: true,
    hasChapters: true,
    totalHadith: 268,
    totalAvailable: 268,
  },
  {
    slug: 'forty',
    type: 'hadith',
    name: { en: 'Collections of Forty', ar: 'الأربعينات' },
    intro: {
      en: 'Famous 40 Hadith compilations including Imam an-Nawawi’s Forty Hadith.',
      ar: null,
    },
    hasBooks: true,
    hasChapters: true,
    totalHadith: 122,
    totalAvailable: 122,
  },
  {
    slug: 'virtues',
    type: 'hadith',
    name: { en: "Virtues of Qur'an Chapters", ar: 'فضائل القرآن' },
    intro: {
      en: 'Authentic ahadith on the special virtues of the Quran chapters and verses.',
      ar: null,
    },
    hasBooks: true,
    hasChapters: true,
    totalHadith: 60,
    totalAvailable: 93,
  },
  {
    slug: 'ahmad',
    type: 'hadith',
    name: { en: 'Musnad Ahmad', ar: 'مسند أحمد' },
    intro: {
      en: 'Compiled by Imam Ahmad ibn Hanbal. It is the largest of the main books of hadith containing reports of the Sunnah.',
      ar: null,
    },
    hasBooks: true,
    hasChapters: true,
    totalHadith: 28199,
    totalAvailable: 1359,
  },
  {
    slug: 'darimi',
    type: 'hadith',
    name: { en: 'Sunan ad-Darimi', ar: 'سنن الدارمي' },
    intro: {
      en: 'Sunan ad-Darimi is an important collection of reports of the Sunnah typically included in the Nine Books.',
      ar: null,
    },
    hasBooks: true,
    hasChapters: true,
    totalHadith: 3406,
    totalAvailable: 0,
  },
];

export function cleanHadithText(text?: string, body?: string): string {
  const raw = text && text.trim().length > 0 ? text : body || '';
  if (!raw) return '';
  return raw
    .replace(/\[\/?(narrator|prematn|matn)[^\]]*\]/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

export function getHadithGrade(item: HadithItem): string | undefined {
  if (item.en?.grades && item.en.grades.length > 0 && item.en.grades[0]?.grade) {
    const g = item.en.grades[0];
    return g.graded_by ? `${g.grade} (${g.graded_by})` : g.grade;
  }
  if (item.ar?.grades && item.ar.grades.length > 0 && item.ar.grades[0]?.grade) {
    const g = item.ar.grades[0];
    return g.grade;
  }
  return undefined;
}

export async function fetchHadithCollections(force = false): Promise<HadithCollection[]> {
  const cacheKey = 'hadith:cache:collections';
  if (!force) {
    try {
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
  }

  if (!isAppOnline()) {
    try {
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return FALLBACK_COLLECTIONS;
  }

  try {
    const response = await fetchWithTimeout(`${API_BASE}/collections`, {}, 4000);
    if (response.ok) {
      const json = await response.json();
      if (json.code === 200 && Array.isArray(json.data) && json.data.length > 0) {
        await AsyncStorage.setItem(cacheKey, JSON.stringify(json.data)).catch(() => {});
        return json.data;
      }
    }
  } catch {
    // API failed, try cache
  }

  try {
    const cached = await AsyncStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // ignore
  }

  return FALLBACK_COLLECTIONS;
}

export async function fetchHadithBooks(collectionSlug: string, force = false): Promise<HadithBook[]> {
  const cacheKey = `hadith:cache:books:${collectionSlug}`;
  if (!force || !isAppOnline()) {
    try {
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
  }

  if (!isAppOnline()) {
    throw new Error(`Offline: books not cached for ${collectionSlug}`);
  }

  try {
    const response = await fetchWithTimeout(`${API_BASE}/collections/${collectionSlug}/books`, {}, 4000);
    if (response.ok) {
      const json = await response.json();
      if (json.code === 200 && Array.isArray(json.data)) {
        await AsyncStorage.setItem(cacheKey, JSON.stringify(json.data)).catch(() => {});
        return json.data;
      }
    }
  } catch {
    // API failed, try cache
  }

  try {
    const cached = await AsyncStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // ignore
  }

  throw new Error(`Failed to load books for ${collectionSlug}`);
}

export const MAX_HADITH_LIST_PAGES_PER_BOOK = 20;
export const MAX_HADITH_SINGLE_CACHE = 200;

export async function pruneHadithCaches(): Promise<void> {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const listPrefix = 'hadith:cache:list:';
    const singlePrefix = 'hadith:cache:single:';

    const listKeysByBook: Record<string, { key: string; offset: number }[]> = {};
    const singleKeys: string[] = [];

    for (const key of allKeys) {
      if (key.startsWith(listPrefix)) {
        const rest = key.slice(listPrefix.length);
        const parts = rest.split(':');
        if (parts.length >= 3) {
          const bookKey = `${parts[0]}:${parts[1]}`;
          const offset = parseInt(parts[2], 10) || 0;
          if (!listKeysByBook[bookKey]) {
            listKeysByBook[bookKey] = [];
          }
          listKeysByBook[bookKey].push({ key, offset });
        }
      } else if (key.startsWith(singlePrefix)) {
        singleKeys.push(key);
      }
    }

    const keysToRemove: string[] = [];

    for (const bookKey of Object.keys(listKeysByBook)) {
      const items = listKeysByBook[bookKey];
      if (items.length > MAX_HADITH_LIST_PAGES_PER_BOOK) {
        items.sort((a, b) => a.offset - b.offset);
        const excess = items.slice(0, items.length - MAX_HADITH_LIST_PAGES_PER_BOOK);
        for (const item of excess) {
          keysToRemove.push(item.key);
        }
      }
    }

    if (singleKeys.length > MAX_HADITH_SINGLE_CACHE) {
      const excess = singleKeys.slice(0, singleKeys.length - MAX_HADITH_SINGLE_CACHE);
      keysToRemove.push(...excess);
    }

    if (keysToRemove.length > 0) {
      await AsyncStorage.multiRemove(keysToRemove);
    }
  } catch {
    // non-fatal
  }
}

export async function fetchHadithsInBook(
  collectionSlug: string,
  bookNumber: string,
  limit = 20,
  offset = 0,
  force = false
): Promise<HadithListResponse> {
  const cacheKey = `hadith:cache:list:${collectionSlug}:${bookNumber}:${offset}`;
  if (!force || !isAppOnline()) {
    try {
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && Array.isArray(parsed.hadiths)) return parsed;
      }
    } catch {
      // ignore
    }
  }

  if (!isAppOnline()) {
    throw new Error(`Offline: hadiths not cached for ${collectionSlug} book ${bookNumber}`);
  }

  try {
    const response = await fetchWithTimeout(
      `${API_BASE}/collections/${collectionSlug}/books/${bookNumber}/hadiths?limit=${limit}&offset=${offset}`,
      {},
      4000
    );
    if (response.ok) {
      const json = await response.json();
      if (json.code === 200 && json.data && Array.isArray(json.data.hadiths)) {
        await AsyncStorage.setItem(cacheKey, JSON.stringify(json.data)).catch(() => {});
        // Also cache individual hadiths for instant offline single-hadith lookups
        for (const item of json.data.hadiths) {
          if (item && item.hadithNumber) {
            const singleKey = `hadith:cache:single:${collectionSlug}:${bookNumber}:${item.hadithNumber}`;
            AsyncStorage.setItem(singleKey, JSON.stringify(item)).catch(() => {});
          }
        }
        pruneHadithCaches().catch(() => {});
        return json.data;
      }
    }
  } catch {
    // API failed, try cache below
  }

  if (!force) {
    try {
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && Array.isArray(parsed.hadiths)) return parsed;
      }
    } catch {
      // ignore
    }
  }

  throw new Error(`Failed to load hadiths for book ${bookNumber}`);
}

export async function isHadithPageCached(
  collectionSlug: string,
  bookNumber: string,
  offset: number
): Promise<boolean> {
  const cacheKey = `hadith:cache:list:${collectionSlug}:${bookNumber}:${offset}`;
  try {
    const cached = await AsyncStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      return !!(parsed && Array.isArray(parsed.hadiths));
    }
  } catch {
    // ignore
  }
  return false;
}

export async function saveHadithPageCache(
  collectionSlug: string,
  bookNumber: string,
  offset: number,
  data: HadithListResponse
): Promise<void> {
  const cacheKey = `hadith:cache:list:${collectionSlug}:${bookNumber}:${offset}`;
  try {
    await AsyncStorage.setItem(cacheKey, JSON.stringify(data));
    pruneHadithCaches().catch(() => {});
  } catch {
    // ignore
  }
}

export async function fetchSingleHadith(
  collectionSlug: string,
  bookNumber: string,
  hadithNumber: string,
  force = false
): Promise<HadithItem> {
  const cacheKey = `hadith:cache:single:${collectionSlug}:${bookNumber}:${hadithNumber}`;
  if (!force || !isAppOnline()) {
    try {
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed) return parsed;
      }
    } catch {
      // ignore
    }
  }

  if (!isAppOnline()) {
    throw new Error(`Offline: hadith ${hadithNumber} not cached`);
  }

  try {
    const response = await fetchWithTimeout(
      `${API_BASE}/collections/${collectionSlug}/books/${bookNumber}/hadiths/${hadithNumber}`,
      {},
      4000
    );
    if (response.ok) {
      const json = await response.json();
      if (json.code === 200 && json.data) {
        await AsyncStorage.setItem(cacheKey, JSON.stringify(json.data)).catch(() => {});
        pruneHadithCaches().catch(() => {});
        return json.data;
      }
    }
  } catch {
    // API failed, try cache
  }

  try {
    const cached = await AsyncStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed) return parsed;
    }
  } catch {
    // ignore
  }

  throw new Error(`Failed to load hadith ${hadithNumber}`);
}
