export interface Dhikr {
  id: number;
  time: 'morning' | 'evening';
  arabic: string;
  transliteration: string;
  translation: string;
  source: string;
  count?: number;
}

export const ADHKAR: Dhikr[] = [
  {
    id: 1,
    time: 'morning',
    arabic: 'آيَةُ الْكُرْسِيِّ',
    transliteration: 'Ayat al-Kursi',
    translation: 'Allah! There is no deity except Him, the Ever-Living, the Sustainer of existence...',
    source: 'Quran 2:255',
  },
  {
    id: 2,
    time: 'morning',
    arabic: 'قُلْ هُوَ اللَّهُ أَحَدٌ',
    transliteration: 'Qul Huwa Allahu Ahad (Surah al-Ikhlas)',
    translation: 'Say: He is Allah, the One and Only...',
    source: 'Quran 112:1-4',
    count: 3,
  },
  {
    id: 3,
    time: 'morning',
    arabic: 'قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ',
    transliteration: 'Qul A\'udhu bi Rabbil-Falaq (Surah al-Falaq)',
    translation: 'Say: I seek refuge in the Lord of the daybreak...',
    source: 'Quran 113:1-5',
    count: 3,
  },
  {
    id: 4,
    time: 'morning',
    arabic: 'قُلْ أَعُوذُ بِرَبِّ النَّاسِ',
    transliteration: 'Qul A\'udhu bi Rabbil-Nas (Surah an-Nas)',
    translation: 'Say: I seek refuge in the Lord of mankind...',
    source: 'Quran 114:1-6',
    count: 3,
  },
  {
    id: 5,
    time: 'morning',
    arabic: 'أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ',
    transliteration: 'Asbahna wa asbahal-mulku lillah',
    translation: 'We have reached the morning, and the dominion belongs to Allah...',
    source: 'Muslim 2723, Tirmidhi 3391',
  },
  {
    id: 6,
    time: 'morning',
    arabic: 'اللَّهُمَّ بِكَ أَصْبَحْنَا وَبِكَ أَمْسَيْنَا',
    transliteration: 'Allahumma bika asbahna wa bika amsayna',
    translation: 'O Allah, by You we enter the morning, and by You we enter the evening...',
    source: 'Abu Dawud 5068, Tirmidhi 3392',
  },
  {
    id: 7,
    time: 'morning',
    arabic: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ',
    transliteration: 'Subhan Allahi wa bihamdihi',
    translation: 'Glory and praise be to Allah',
    source: 'Bukhari 6406, Muslim 2691',
    count: 100,
  },
  {
    id: 8,
    time: 'evening',
    arabic: 'آيَةُ الْكُرْسِيِّ',
    transliteration: 'Ayat al-Kursi',
    translation: 'Allah! There is no deity except Him, the Ever-Living, the Sustainer of existence...',
    source: 'Quran 2:255',
  },
  {
    id: 9,
    time: 'evening',
    arabic: 'قُلْ هُوَ اللَّهُ أَحَدٌ',
    transliteration: 'Qul Huwa Allahu Ahad (Surah al-Ikhlas)',
    translation: 'Say: He is Allah, the One and Only...',
    source: 'Quran 112:1-4',
    count: 3,
  },
  {
    id: 10,
    time: 'evening',
    arabic: 'قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ',
    transliteration: 'Qul A\'udhu bi Rabbil-Falaq (Surah al-Falaq)',
    translation: 'Say: I seek refuge in the Lord of the daybreak...',
    source: 'Quran 113:1-5',
    count: 3,
  },
  {
    id: 11,
    time: 'evening',
    arabic: 'قُلْ أَعُوذُ بِرَبِّ النَّاسِ',
    transliteration: 'Qul A\'udhu bi Rabbil-Nas (Surah an-Nas)',
    translation: 'Say: I seek refuge in the Lord of mankind...',
    source: 'Quran 114:1-6',
    count: 3,
  },
  {
    id: 12,
    time: 'evening',
    arabic: 'أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ',
    transliteration: 'Amsayna wa amsal-mulku lillah',
    translation: 'We have reached the evening, and the dominion belongs to Allah...',
    source: 'Muslim 2723, Tirmidhi 3391',
  },
  {
    id: 13,
    time: 'evening',
    arabic: 'اللَّهُمَّ مَا أَمْسَى بِي مِنْ نِعْمَةٍ',
    transliteration: 'Allahumma ma amsa bi min ni\'mah',
    translation: 'O Allah, whatever blessing has reached me by evening...',
    source: 'Abu Dawud 5073, Nasa\'i 10401',
  },
  {
    id: 14,
    time: 'evening',
    arabic: 'حَسْبِيَ اللَّهُ لَا إِلَهَ إِلَّا هُوَ',
    transliteration: 'Hasbi Allah la ilaha illa Huwa',
    translation: 'Allah is sufficient for me; there is no deity except Him...',
    source: 'Quran 9:129, Bukhari 5670',
    count: 7,
  },
];