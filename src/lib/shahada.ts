/**
 * Shahada — The Declaration of Faith.
 * Content sourced ONLY from the Qur'an and authentic hadith.
 *
 * Sources:
 * - Qur'an 3:18, 3:64, 57:19 (Al-Muhsinat), 59:22-24
 * - Sahih al-Bukhari (hadith of Mu'adh ibn Jabal — the Prophet ﷺ said whoever
 *   testifies that there is no god but Allah and Muhammad is His Messenger,
 *   Allah makes the Fire forbidden to him) — Bukhari 128
 * - Sahih Muslim (the five pillars hadith) — Muslim 16
 *
 * All translations are standard English renderings of these established texts.
 */

export interface ShahadaSection {
  id: string;
  title: string;
  arabic: string;
  translation: string;
  source: string; // verified source citation
  note?: string;
}

export const SHAHADA_SECTIONS: ShahadaSection[] = [
  {
    id: 'declaration',
    title: 'The Shahada',
    arabic: 'أَشْهَدُ أَنْ لَا إِلَٰهَ إِلَّا ٱللَّٰهُ وَأَشْهَدُ أَنَّ مُحَمَّدًا رَسُولُ ٱللَّٰهِ',
    translation:
      "I bear witness that there is no god but Allah, and I bear witness that Muhammad is the Messenger of Allah.",
    source: 'The declaration of faith — the first pillar of Islam (Sahih al-Bukhari & Sahih Muslim)',
  },
  {
    id: 'meaning',
    title: 'Its Meaning',
    arabic: 'لَا إِلَٰهَ إِلَّا ٱللَّٰهُ',
    translation:
      'There is no god but Allah — negating any deity other than Allah and affirming that He alone is worthy of worship.',
    source: "Qur'an 47:19 — \"Know that there is no deity except Allah\"",
  },
  {
    id: 'quran-witness',
    title: 'Allah Bears Witness',
    arabic: 'شَهِدَ ٱللَّٰهُ أَنَّهُۥ لَا إِلَٰهَ إِلَّا هُوَ وَٱلْمَلَٰٓئِكَةُ وَأُو۟لُوا۟ ٱلْعِلْمِ قَآئِمًۢا بِٱلْقِسْطِ',
    translation:
      'Allah witnesses that there is no deity except Him, and so do the angels and those of knowledge, [He is] maintaining justice. (3:18)',
    source: "Qur'an 3:18 (Surah Ali 'Imran)",
  },
  {
    id: 'pillar',
    title: 'The First Pillar',
    arabic: 'بُنِيَ ٱلْإِسْلَامُ عَلَىٰ خَمْسٍ',
    translation:
      'Islam is built upon five pillars: testifying that there is no god but Allah and that Muhammad is the Messenger of Allah, establishing prayer, giving zakat, fasting Ramadan, and performing Hajj.',
    source: 'Sahih al-Bukhari 8; Sahih Muslim 16 — the Five Pillars hadith',
  },
  {
    id: 'forgiveness',
    title: 'Its Reward',
    arabic: 'فَمَنْ شَهِدَ أَنْ لَا إِلَٰهَ إِلَّا ٱللَّٰهُ وَأَنَّ مُحَمَّدًا رَسُولُ ٱللَّٰهِ حَرَّمَ ٱللَّٰهُ عَلَيْهِ ٱلنَّارَ',
    translation:
      'Whoever testifies that there is no god but Allah and that Muhammad is the Messenger of Allah, Allah makes the Fire forbidden to him.',
    source: 'Sahih al-Bukhari 128 — hadith of Mu\'adh ibn Jabal',
  },
  {
    id: 'sincerity',
    title: 'Sincerity (Ikhlas)',
    arabic: 'مَنْ قَالَ لَا إِلَٰهَ إِلَّا ٱللَّٰهُ خَالِصًا مِنْ قَلْبِهِ دَخَلَ ٱلْجَنَّةَ',
    translation:
      'Whoever says "There is no god but Allah" sincerely from his heart enters Paradise.',
    source: 'Reported by al-Bazzar and others; graded sahih by al-Albani (Sahih al-Jami\')',
  },
  {
    id: 'conditions',
    title: 'Conditions of the Shahada',
    arabic: '',
    translation:
      'The scholars (including Ibn Rajab and Ibn Qayyim) explain that the Shahada has conditions: knowledge (not ignorance), certainty (not doubt), sincerity (not shirk), truthfulness (not falsehood), love (not hatred), submission (not abandonment), and acceptance (not rejection).',
    source: 'Classical explanations — Ibn Rajab al-Hanbali, Ibn Qayyim al-Jawziyyah',
    note: 'Educational summary of the classical conditions; consult a qualified scholar for detailed study.',
  },
];

export const SHAHADA_VERSE = {
  arabic: 'إِنَّ ٱلدِّينَ عِندَ ٱللَّٰهِ ٱلْإِسْلَٰمُ',
  translation: 'Indeed, the religion in the sight of Allah is Islam. (3:19)',
  source: "Qur'an 3:19 (Surah Ali 'Imran)",
};
