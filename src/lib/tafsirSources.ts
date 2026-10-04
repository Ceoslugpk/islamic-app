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
];

export function getTafsirSourceById(id: string): TafsirSource | undefined {
  return TAFSIR_SOURCES.find((s) => s.id === id);
}

export function getTafsirSourceByIdentifier(identifier: string): TafsirSource | undefined {
  return TAFSIR_SOURCES.find((s) => s.identifier === identifier);
}

export const DEFAULT_TAFSIR_SOURCE_ID = 'jalalayn';