import { SURAHS_114, SurahSummary } from './surahs114';
import { HADITHS, Hadith } from './hadith';
import { DUAS_DATA, DuaItem } from './duas';
import { NAMES_99, Name99 } from './names99';
import { TOPICS, Topic } from './topics';

export type SearchCategory = 'quran' | 'hadith' | 'duas' | 'names' | 'topics';

export interface SearchResult {
  category: SearchCategory;
  id: string;
  title: string;
  subtitle: string;
  match: string;
}

const SURAH_TRANSLATIONS: Record<number, string> = {
  1: 'The Opening',
  2: 'The Cow',
  3: 'The Family of Imran',
  4: 'The Women',
  5: 'The Table Spread',
  6: 'The Cattle',
  7: 'The Heights',
  8: 'The Spoils of War',
  9: 'The Repentance',
  10: 'Jonah',
  11: 'Hud',
  12: 'Joseph',
  13: 'The Thunder',
  14: 'Abraham',
  15: 'The Rocky Tract',
  16: 'The Bee',
  17: 'The Night Journey',
  18: 'The Cave',
  19: 'Mary',
  20: 'Ta-Ha',
  21: 'The Prophets',
  22: 'The Pilgrimage',
  23: 'The Believers',
  24: 'The Light',
  25: 'The Criterion',
  26: 'The Poets',
  27: 'The Ant',
  28: 'The Stories',
  29: 'The Spider',
  30: 'The Romans',
  31: 'Luqman',
  32: 'The Prostration',
  33: 'The Combined Forces',
  34: 'Sheba',
  35: 'The Originator',
  36: 'Ya-Sin',
  37: 'Those Who Set the Ranks',
  38: 'Sad',
  39: 'The Groups',
  40: 'The Forgiver',
  41: 'Explained in Detail',
  42: 'The Consultation',
  43: 'The Gold Adornments',
  44: 'The Smoke',
  45: 'The Kneeling',
  46: 'The Wind-Curved Sandhills',
  47: 'Muhammad',
  48: 'The Victory',
  49: 'The Rooms',
  50: 'Qaf',
  51: 'The Scatterers',
  52: 'The Mount',
  53: 'The Star',
  54: 'The Moon',
  55: 'The Most Merciful',
  56: 'The Event',
  57: 'The Iron',
  58: 'The Dispute',
  59: 'The Exile',
  60: 'The Woman to be Examined',
  61: 'The Ranks',
  62: 'The Friday',
  63: 'The Hypocrites',
  64: 'The Mutual Disillusion',
  65: 'The Divorce',
  66: 'The Prohibition',
  67: 'The Sovereignty',
  68: 'The Pen',
  69: 'The Reality',
  70: 'The Ascending Stairways',
  71: 'Noah',
  72: 'The Jinn',
  73: 'The Enshrouded One',
  74: 'The Cloaked One',
  75: 'The Resurrection',
  76: 'The Human',
  77: 'The Emissaries',
  78: 'The Great News',
  79: 'Those Who Drag Forth',
  80: 'He Frowned',
  81: 'The Overthrowing',
  82: 'The Cleaving',
  83: 'The Defrauders',
  84: 'The Sundering',
  85: 'The Constellations',
  86: 'The Nightcomer',
  87: 'The Most High',
  88: 'The Overwhelming',
  89: 'The Dawn',
  90: 'The City',
  91: 'The Sun',
  92: 'The Night',
  93: 'The Morning Hours',
  94: 'The Relief',
  95: 'The Fig',
  96: 'The Clot',
  97: 'The Decree',
  98: 'The Clear Evidence',
  99: 'The Earthquake',
  100: 'The Courser',
  101: 'The Calamity',
  102: 'The Rivalry in World Increase',
  103: 'The Declining Day',
  104: 'The Traducer',
  105: 'The Elephant',
  106: 'Quraysh',
  107: 'The Small Kindnesses',
  108: 'The Abundance',
  109: 'The Disbelievers',
  110: 'The Help',
  111: 'The Palm Fiber',
  112: 'The Sincerity',
  113: 'The Daybreak',
  114: 'The Mankind',
};

function truncate(str: string, max: number): string {
  if (str.length <= max) return str;
  return str.slice(0, max).trimEnd() + '…';
}

function matches(query: string, ...fields: (string | undefined)[]): string | null {
  const q = query.toLowerCase();
  for (const field of fields) {
    if (field && field.toLowerCase().includes(q)) {
      return field;
    }
  }
  return null;
}

function searchQuran(query: string, limit: number): SearchResult[] {
  const results: SearchResult[] = [];
  for (const surah of SURAHS_114) {
    const translation = SURAH_TRANSLATIONS[surah.number] || '';
    const match = matches(query, surah.englishName, translation);
    if (match) {
      results.push({
        category: 'quran',
        id: `quran:${surah.number}`,
        title: `Surah ${surah.englishName}`,
        subtitle: `${translation} · ${surah.numberOfAyahs} ayahs`,
        match,
      });
      if (results.length >= limit) break;
    }
  }
  return results;
}

function searchHadith(query: string, limit: number): SearchResult[] {
  const results: SearchResult[] = [];
  for (const hadith of HADITHS) {
    const match = matches(query, hadith.translation, hadith.source);
    if (match) {
      results.push({
        category: 'hadith',
        id: `hadith:${hadith.id}`,
        title: `Hadith · ${hadith.source}`,
        subtitle: truncate(hadith.translation, 80),
        match,
      });
      if (results.length >= limit) break;
    }
  }
  return results;
}

function searchDuas(query: string, limit: number): SearchResult[] {
  const results: SearchResult[] = [];
  for (const dua of DUAS_DATA) {
    const match = matches(query, dua.translation, dua.transliteration, dua.title, dua.category);
    if (match) {
      results.push({
        category: 'duas',
        id: `duas:${dua.id}`,
        title: dua.title,
        subtitle: truncate(dua.translation, 80),
        match,
      });
      if (results.length >= limit) break;
    }
  }
  return results;
}

function searchNames(query: string, limit: number): SearchResult[] {
  const results: SearchResult[] = [];
  for (const name of NAMES_99) {
    const match = matches(query, name.transliteration, name.meaning);
    if (match) {
      results.push({
        category: 'names',
        id: `names:${name.number}`,
        title: name.transliteration,
        subtitle: name.meaning,
        match,
      });
      if (results.length >= limit) break;
    }
  }
  return results;
}

function searchTopics(query: string, limit: number): SearchResult[] {
  const results: SearchResult[] = [];
  for (const topic of TOPICS) {
    const match = matches(query, topic.title, topic.summary);
    if (match) {
      results.push({
        category: 'topics',
        id: `topics:${topic.id}`,
        title: topic.title,
        subtitle: topic.summary,
        match,
      });
      if (results.length >= limit) break;
    }
  }
  return results;
}

export function searchAll(query: string, categories?: SearchCategory[]): SearchResult[] {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const allCategories: SearchCategory[] = ['quran', 'hadith', 'duas', 'names', 'topics'];
  const activeCategories = categories?.length ? categories : allCategories;
  const perCategoryLimit = 5;
  const totalLimit = 25;

  const results: SearchResult[] = [];

  for (const cat of activeCategories) {
    if (results.length >= totalLimit) break;

    let catResults: SearchResult[] = [];
    switch (cat) {
      case 'quran':
        catResults = searchQuran(trimmed, perCategoryLimit);
        break;
      case 'hadith':
        catResults = searchHadith(trimmed, perCategoryLimit);
        break;
      case 'duas':
        catResults = searchDuas(trimmed, perCategoryLimit);
        break;
      case 'names':
        catResults = searchNames(trimmed, perCategoryLimit);
        break;
      case 'topics':
        catResults = searchTopics(trimmed, perCategoryLimit);
        break;
    }
    results.push(...catResults);
  }

  return results.slice(0, totalLimit);
}