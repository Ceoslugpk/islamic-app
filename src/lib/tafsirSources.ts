export interface TafsirSource {
  id: string;
  name: string;
  identifier: string;
  language: string;
  author: string;
  note: string;
}

export const TAFSIR_SOURCES: TafsirSource[] = [
  {
    id: 'jalalayn',
    name: 'Tafsir al-Jalalayn',
    identifier: 'quran-tafsir-tafsir-jalalayn',
    language: 'arabic',
    author: 'Jalal ad-Din al-Mahalli & as-Suyuti',
    note: 'Classic 15th-century concise tafsir, widely studied for its clarity',
  },
  {
    id: 'ibn-kathir',
    name: 'Tafsir Ibn Kathir',
    identifier: 'quran-tafsir-tafsir-ibn-kathir',
    language: 'arabic',
    author: 'Ibn Kathir',
    note: '14th-century masterwork using hadith and companion narrations',
  },
  {
    id: 'muyassar',
    name: 'Tafsir al-Muyassar',
    identifier: 'quran-tafsir-tafsir-muyassar',
    language: 'arabic',
    author: 'King Fahad Quran Complex',
    note: 'Modern simplified tafsir for accessibility and ease of understanding',
  },
  {
    id: 'baghawi',
    name: 'Ma\'alim at-Tanzil',
    identifier: 'quran-tafsir-tafsir-baghawi',
    language: 'arabic',
    author: 'Al-Baghawi',
    note: '12th-century hadith-based tafsir emphasizing prophetic traditions',
  },
  {
    id: 'qurtubi',
    name: 'Al-Jami\' li-Ahkam al-Quran',
    identifier: 'quran-tafsir-tafsir-qurtubi',
    language: 'arabic',
    author: 'Al-Qurtubi',
    note: '13th-century legal-focused tafsir deriving rulings from verses',
  },
  {
    id: 'tabari',
    name: 'Jami\' al-Bayan',
    identifier: 'quran-tafsir-tafsir-tabari',
    language: 'arabic',
    author: 'At-Tabari',
    note: '9th-century foundational tafsir compiling early scholarly opinions',
  },
  {
    id: 'waseet',
    name: 'Tafsir al-Waseet',
    identifier: 'quran-tafsir-tafsir-waseet',
    language: 'arabic',
    author: 'Al-Wahidi',
    note: '11th-century intermediate tafsir balancing brevity and depth',
  },
  {
    id: 'maarif',
    name: 'Ma\'arif-ul-Quran',
    identifier: 'en-tafsir-maarif-ul-quran',
    language: 'english',
    author: 'Mufti Muhammad Shafi',
    note: '20th-century comprehensive Urdu tafsir translated to English',
  },
];