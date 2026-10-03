export interface Topic {
  id: number;
  title: string;
  arabic: string;
  summary: string;
  surah: number;
  ayah: number;
  reference: string;
}

export const TOPICS: Topic[] = [
  {
    id: 1,
    title: 'Mercy',
    arabic: 'ar-Raḥmān',
    summary: 'Allah is the Most Merciful, whose mercy encompasses all creation.',
    surah: 55,
    ayah: 1,
    reference: 'Surah ar-Rahman 55:1',
  },
  {
    id: 2,
    title: 'Prayer',
    arabic: 'Ṣalāh',
    summary: 'Establish prayer and give zakah; bow with those who bow.',
    surah: 2,
    ayah: 43,
    reference: 'Surah Al-Baqarah 2:43',
  },
  {
    id: 3,
    title: 'Patience',
    arabic: 'Ṣabr',
    summary: 'Seek help through patience and prayer; indeed, Allah is with the patient.',
    surah: 2,
    ayah: 153,
    reference: 'Surah Al-Baqarah 2:153',
  },
  {
    id: 4,
    title: 'Charity',
    arabic: 'Zakāh / Ṣadaqah',
    summary: 'Establish prayer and give zakah; whatever good you put forward for yourselves, you will find with Allah.',
    surah: 2,
    ayah: 110,
    reference: 'Surah Al-Baqarah 2:110',
  },
  {
    id: 5,
    title: 'Forgiveness',
    arabic: 'Maghfirah',
    summary: 'Let them pardon and overlook. Would you not love for Allah to forgive you? Allah is Forgiving and Merciful.',
    surah: 24,
    ayah: 22,
    reference: 'Surah An-Nur 24:22',
  },
  {
    id: 6,
    title: 'Gratitude',
    arabic: 'Shukr',
    summary: 'If you are grateful, I will surely increase you; but if you deny, indeed, My punishment is severe.',
    surah: 14,
    ayah: 7,
    reference: 'Surah Ibrahim 14:7',
  },
  {
    id: 7,
    title: 'Truthfulness',
    arabic: 'Ṣidq',
    summary: 'O you who have believed, fear Allah and speak words of appropriate justice.',
    surah: 33,
    ayah: 70,
    reference: 'Surah Al-Ahzab 33:70',
  },
  {
    id: 8,
    title: 'Justice',
    arabic: 'ʿAdl',
    summary: 'O you who have believed, be persistently standing firm in justice, witnesses for Allah, even if against yourselves.',
    surah: 4,
    ayah: 135,
    reference: 'Surah An-Nisa 4:135',
  },
  {
    id: 9,
    title: 'The Hereafter',
    arabic: 'Al-Ākhirah',
    summary: 'He who created death and life to test you as to which of you is best in deed.',
    surah: 67,
    ayah: 2,
    reference: 'Surah Al-Mulk 67:2',
  },
  {
    id: 10,
    title: 'Trust in Allah',
    arabic: 'Tawakkul',
    summary: 'And whoever puts their trust in Allah — then He is sufficient for them.',
    surah: 65,
    ayah: 3,
    reference: 'Surah At-Talaq 65:3',
  },
];