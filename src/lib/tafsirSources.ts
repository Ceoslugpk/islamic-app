export interface TafsirSource {
  id: string;
  name: string;
  identifier: string;
  language: string;
  languageCode: string;
  author: string;
  note: string;
}

export const TAFSIR_SOURCES: TafsirSource[] = [
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
  // ── islamic.app tafsirs (18, across 6 languages; identifier prefix `islamic:`) ──
  { id: 'islamic-ibn-kathir-en', name: 'Tafsir Ibn Kathir (English)', identifier: 'islamic:en-tafisr-ibn-kathir', language: 'English', languageCode: 'en', author: 'Hafiz Ibn Kathir', note: 'Classic commentary translated to English' },
  { id: 'islamic-maarif', name: "Ma'arif al-Qur'an (English)", identifier: 'islamic:en-tafsir-maarif-ul-quran', language: 'English', languageCode: 'en', author: "Ma'arif al-Qur'an", note: 'English commentary by Mufti Muhammad Shafi' },
  { id: 'islamic-ibn-kathir-urdu', name: 'Tafsir Ibn Kathir (Urdu)', identifier: 'islamic:tafseer-ibn-e-kaseer-urdu', language: 'Urdu', languageCode: 'ur', author: 'Ibn Kathir (Urdu)', note: 'Urdu translation of the classic commentary' },
  { id: 'islamic-bayan-ul-quran', name: 'Tafsir Bayan-ul-Quran (Urdu)', identifier: 'islamic:tafsir-bayan-ul-quran', language: 'Urdu', languageCode: 'ur', author: 'Dr. Israr Ahmad', note: 'Urdu tafsir by Dr. Israr Ahmad' },
  { id: 'islamic-qutb', name: 'Fe-Zalul-Quran (Urdu)', identifier: 'islamic:tafsir-fe-zalul-quran-syed-qatab', language: 'Urdu', languageCode: 'ur', author: 'Sayyid Qutb', note: 'Urdu tafsir of Sayyid Qutb' },
  { id: 'islamic-ibn-kathir-bn', name: 'Tafsir Ibn Kathir (Bengali)', identifier: 'islamic:bn-tafseer-ibn-e-kaseer', language: 'Bengali', languageCode: 'bn', author: 'Tawheed Publication', note: 'Bengali translation of Ibn Kathir' },
  { id: 'islamic-zakaria-bn', name: 'Tafsir Abu Bakr Zakaria (Bengali)', identifier: 'islamic:bn-tafsir-abu-bakr-zakaria', language: 'Bengali', languageCode: 'bn', author: 'King Fahd Quran Printing Complex', note: 'Bengali tafsir by Abu Bakr Zakaria' },
  { id: 'islamic-ahsanul-bn', name: 'Tafsir Ahsanul Bayan (Bengali)', identifier: 'islamic:bn-tafsir-ahsanul-bayaan', language: 'Bengali', languageCode: 'bn', author: 'Bayan Foundation', note: 'Bengali tafsir Ahsanul Bayan' },
  { id: 'islamic-fathul-bn', name: 'Tafsir Fathul Majid (Bengali)', identifier: 'islamic:tafisr-fathul-majid-bn', language: 'Bengali', languageCode: 'bn', author: 'AbdulRahman Bin Hasan', note: 'Bengali tafsir of Fathul Majid' },
  { id: 'islamic-saddi-ru', name: "Tafsir al-Sa'di (Russian)", identifier: 'islamic:ru-tafseer-al-saddi', language: 'Russian', languageCode: 'ru', author: "Al-Sa'di", note: 'Russian tafsir by Sheikh al-Sa\'di' },
  { id: 'islamic-rebar-ku', name: 'Tafsir Rebar (Kurdish)', identifier: 'islamic:kurd-tafsir-rebar', language: 'Kurdish', languageCode: 'ku', author: 'Rebar', note: 'Kurdish tafsir' },
  { id: 'islamic-qurtubi-ar', name: 'Tafsir al-Qurtubi (Arabic)', identifier: 'islamic:ar-tafseer-al-qurtubi', language: 'Arabic', languageCode: 'ar', author: 'Al-Qurtubi', note: 'Classic 13th-century Arabic tafsir' },
  { id: 'islamic-waseet-ar', name: 'Tafsir al-Waseet (Arabic)', identifier: 'islamic:ar-tafsir-al-wasit', language: 'Arabic', languageCode: 'ar', author: 'Al-Wahidi', note: 'Intermediate Arabic tafsir' },
  { id: 'islamic-baghawi-ar', name: 'Tafsir al-Baghawi (Arabic)', identifier: 'islamic:ar-tafsir-al-baghawi', language: 'Arabic', languageCode: 'ar', author: 'Al-Baghawi', note: 'Hadith-based Arabic tafsir' },
  { id: 'islamic-ibn-kathir-ar', name: 'Tafsir Ibn Kathir (Arabic)', identifier: 'islamic:ar-tafsir-ibn-kathir', language: 'Arabic', languageCode: 'ar', author: 'Ibn Kathir', note: 'The most widely studied Arabic tafsir' },
  { id: 'islamic-muyassar-ar', name: 'Tafsir al-Muyassar (Arabic)', identifier: 'islamic:ar-tafsir-muyassar', language: 'Arabic', languageCode: 'ar', author: 'King Fahad Complex', note: 'Simplified modern Arabic tafsir' },
  { id: 'islamic-tabari-ar', name: 'Tafsir al-Tabari (Arabic)', identifier: 'islamic:ar-tafsir-al-tabari', language: 'Arabic', languageCode: 'ar', author: 'Al-Tabari', note: 'The foundational classical Arabic tafsir' },
  { id: 'islamic-saddi-ar', name: "Tafsir al-Sa'di (Arabic)", identifier: 'islamic:ar-tafseer-al-saddi', language: 'Arabic', languageCode: 'ar', author: "Al-Sa'di", note: 'Modern concise Arabic tafsir' },
];

export function getTafsirSourceById(id: string): TafsirSource | undefined {
  return TAFSIR_SOURCES.find((s) => s.id === id);
}

export function getTafsirSourceByIdentifier(identifier: string): TafsirSource | undefined {
  return TAFSIR_SOURCES.find((s) => s.identifier === identifier);
}

export const DEFAULT_TAFSIR_SOURCE_ID = 'jalalayn';