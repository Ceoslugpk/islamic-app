import { t } from './i18n';

export interface TafsirSource {
  id: string;
  name: string;
  identifier: string;
  language: string;
  languageCode: string;
  author: string;
  note: string;
}

const RAW_TAFSIR_SOURCES: TafsirSource[] = [
  {
    id: 'jalalayn',
    name: 'Tafsir al-Jalalayn',
    identifier: 'ar.jalalayn',
    language: 'Arabic',
    languageCode: 'ar',
    author: 'Jalal ad-Din al-Mahalli & as-Suyuti',
    note: 'Classic 15th-century concise tafsir, widely studied for its clarity',
  },
  {
    id: 'qurtubi',
    name: "Tafsir al-Qurtubi",
    identifier: 'ar.qurtubi',
    language: 'Arabic',
    languageCode: 'ar',
    author: 'Al-Qurtubi',
    note: '13th-century legal-focused tafsir deriving rulings from verses',
  },
  {
    id: 'miqbas',
    name: "Tanwir al-Miqbas",
    identifier: 'ar.miqbas',
    language: 'Arabic',
    languageCode: 'ar',
    author: 'Ibn Abbas',
    note: 'Early companion-era tafsir attributed to Ibn Abbas',
  },
  {
    id: 'waseet',
    name: 'Tafsir al-Waseet',
    identifier: 'ar.waseet',
    language: 'Arabic',
    languageCode: 'ar',
    author: 'Al-Wahidi',
    note: '11th-century intermediate tafsir balancing brevity and depth',
  },
  {
    id: 'baghawi',
    name: "Ma'alim at-Tanzil (Al-Baghawi)",
    identifier: 'ar.baghawi',
    language: 'Arabic',
    languageCode: 'ar',
    author: 'Al-Baghawi',
    note: '12th-century hadith-based tafsir emphasizing prophetic traditions',
  },
  {
    id: 'muyassar',
    name: 'Tafsir al-Muyassar',
    identifier: 'ar.muyassar',
    language: 'Arabic',
    languageCode: 'ar',
    author: 'King Fahad Quran Complex',
    note: 'Modern simplified tafsir for accessibility and ease of understanding',
  },
  // ── tafsir_api (jsDelivr, pinned v1.2.2) — REAL per-ayah tafsir in 6 languages ──
  { id: 'api-ibn-kathir-en', name: 'Tafsir Ibn Kathir (English)', identifier: 'api:en-tafisr-ibn-kathir', language: 'English', languageCode: 'en', author: 'Ibn Kathir', note: 'Classic commentary, real per-ayah text' },
  { id: 'api-jalalayn-en', name: 'Tafsir al-Jalalayn (English)', identifier: 'api:tafsir-al-jalalayn', language: 'English', languageCode: 'en', author: 'Al-Jalalayn', note: 'Concise classic tafsir in English' },
  { id: 'api-ibn-kathir-urdu', name: 'Tafsir Ibn Kathir (Urdu)', identifier: 'api:tafseer-ibn-e-kaseer-urdu', language: 'Urdu', languageCode: 'ur', author: 'Ibn Kathir', note: 'Real per-ayah Urdu tafsir' },
  { id: 'api-saadi-urdu', name: "Tafsir As-Sa'di (Urdu)", identifier: 'api:ur-tafsir-as-saadi-urdu', language: 'Urdu', languageCode: 'ur', author: "As-Sa'di", note: 'Urdu tafsir by As-Sa\'di' },
  { id: 'api-tazkirul-urdu', name: 'Tazkirul Quran (Urdu)', identifier: 'api:tazkiru-quran-ur', language: 'Urdu', languageCode: 'ur', author: 'Maulana Wahiduddin Khan', note: 'Contemporary Urdu tafsir' },
  { id: 'api-bayan-ul-quran', name: 'Tafsir Bayan-ul-Quran (Dr. Israr Ahmad)', identifier: 'api:ur-tafsir-bayan-ul-quran', language: 'Urdu', languageCode: 'ur', author: 'Dr. Israr Ahmad', note: 'Urdu tafsir by Dr. Israr Ahmad, per ayah' },
  { id: 'api-mokhtasar-bn', name: 'Bengali Mokhtasar', identifier: 'api:bengali-mokhtasar', language: 'Bengali', languageCode: 'bn', author: 'Mokhtasar', note: 'Bengali abridged tafsir' },
  { id: 'api-ibn-kathir-ar', name: 'Tafsir Ibn Kathir (Arabic)', identifier: 'api:tafsir-ibn-kathir', language: 'Arabic', languageCode: 'ar', author: 'Ibn Kathir', note: 'The classic Arabic tafsir, per ayah' },
  { id: 'api-tabari-ar', name: 'Tafsir al-Tabari (Arabic)', identifier: 'api:tafsir-al-tabari', language: 'Arabic', languageCode: 'ar', author: 'Al-Tabari', note: 'Foundational classical Arabic tafsir' },
  { id: 'api-qurtubi-ar', name: 'Tafsir al-Qurtubi (Arabic)', identifier: 'api:tafsir-al-qurtubi', language: 'Arabic', languageCode: 'ar', author: 'Al-Qurtubi', note: 'Classic legal-focused Arabic tafsir' },
];

function localizeTafsirSource(source: TafsirSource): TafsirSource {
  return {
    ...source,
    get name() {
      return t(source.name);
    },
    get language() {
      return t(source.language);
    },
    get author() {
      return t(source.author);
    },
  };
}

export const TAFSIR_SOURCES: TafsirSource[] = RAW_TAFSIR_SOURCES.map(localizeTafsirSource);

export function getTafsirSourceById(id: string): TafsirSource | undefined {
  return TAFSIR_SOURCES.find((s) => s.id === id);
}

export function getTafsirSourceByIdentifier(identifier: string): TafsirSource | undefined {
  return TAFSIR_SOURCES.find((s) => s.identifier === identifier);
}

export const DEFAULT_TAFSIR_SOURCE_ID = 'jalalayn';
