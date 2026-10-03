export interface SurahVirtue {
  surah: number;
  name: string;
  arabicName: string;
  virtue: string;
  source: string;
}

export const SURAH_VIRTUES: SurahVirtue[] = [
  {
    surah: 1,
    name: 'Al-Fatiha',
    arabicName: 'الفاتحة',
    virtue: 'The greatest surah in the Quran; nothing equals it in excellence.',
    source: 'Sahih al-Bukhari 4474'
  },
  {
    surah: 2,
    name: 'Al-Baqarah',
    arabicName: 'البقرة',
    virtue: 'Reciting the last two verses at night suffices the believer; Shaytan flees from the house where Surah Al-Baqarah is recited.',
    source: 'Sahih al-Bukhari 5009, Sahih Muslim 807'
  },
  {
    surah: 18,
    name: 'Al-Kahf',
    arabicName: 'الكهف',
    virtue: 'Whoever memorizes the first ten verses is protected from the Dajjal; reciting it on Friday brings light between the two Fridays.',
    source: 'Sahih Muslim 809, Sunan al-Tirmidhi 3057'
  },
  {
    surah: 36,
    name: 'Ya-Sin',
    arabicName: 'يس',
    virtue: 'Reported as the heart of the Quran; reciting it seeking Allah\'s pleasure brings forgiveness.',
    source: 'Jami\' at-Tirmidhi 2887'
  },
  {
    surah: 44,
    name: 'Ad-Dukhan',
    arabicName: 'الدخان',
    virtue: 'Reciting it at night brings seventy thousand angels seeking forgiveness for the reciter until morning.',
    source: 'Sunan Ibn Majah 1327'
  },
  {
    surah: 55,
    name: 'Ar-Rahman',
    arabicName: 'الرحمن',
    virtue: 'The bride of the Quran; reciting it brings intercession and relieves hardship on the Day of Judgment.',
    source: 'Sunan al-Tirmidhi 2898, Musnad Ahmad 22841'
  },
  {
    surah: 56,
    name: 'Al-Waqi\'ah',
    arabicName: 'الواقعة',
    virtue: 'Reciting it every night protects from poverty; it is the surah of wealth and provision.',
    source: 'Shu\'ab al-Iman 3267, Musnad Ahmad 22841'
  },
  {
    surah: 59,
    name: 'Al-Hashr',
    arabicName: 'الحشر',
    virtue: 'Reciting the last three verses in the morning and evening appoints seventy thousand angels to seek forgiveness until the next period.',
    source: 'Sunan al-Tirmidhi 2922, Sunan Abu Dawud 5085'
  },
  {
    surah: 67,
    name: 'Al-Mulk',
    arabicName: 'الملك',
    virtue: 'A surah of thirty verses that intercedes for its reader until forgiven; protects from the punishment of the grave.',
    source: 'Jami\' at-Tirmidhi 2891, Sunan Abu Dawud 1400'
  },
  {
    surah: 112,
    name: 'Al-Ikhlas',
    arabicName: 'الإخلاص',
    virtue: 'Equals one-third of the Quran in reward; reciting it three times equals the reward of reciting the entire Quran.',
    source: 'Sahih al-Bukhari 5013, Sahih Muslim 811'
  },
  {
    surah: 113,
    name: 'Al-Falaq',
    arabicName: 'الفلق',
    virtue: 'One of the two refuge surahs (Mu\'awwidhatayn); seeking refuge with it protects from all evil, envy, and magic.',
    source: 'Sahih al-Bukhari 5016, Jami\' at-Tirmidhi 3576'
  },
  {
    surah: 114,
    name: 'An-Nas',
    arabicName: 'الناس',
    virtue: 'One of the two refuge surahs (Mu\'awwidhatayn); seeking refuge with it protects from the whisperings of devils and evil of creation.',
    source: 'Sahih al-Bukhari 5016, Jami\' at-Tirmidhi 3576'
  }
];