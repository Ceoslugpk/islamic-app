import { t } from './i18n';

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
    get title() {
      return t('Mercy');
    },
    arabic: 'ar-Raḥmān',
    get summary() {
      return t('Allah is the Most Merciful, whose mercy encompasses all creation.');
    },
    surah: 55,
    ayah: 1,
    get reference() {
      return t('Surah ar-Rahman 55:1');
    },
  },
  {
    id: 2,
    get title() {
      return t('Prayer');
    },
    arabic: 'Ṣalāh',
    get summary() {
      return t('Establish prayer and give zakah; bow with those who bow.');
    },
    surah: 2,
    ayah: 43,
    get reference() {
      return t('Surah Al-Baqarah 2:43');
    },
  },
  {
    id: 3,
    get title() {
      return t('Patience');
    },
    arabic: 'Ṣabr',
    get summary() {
      return t('Seek help through patience and prayer; indeed, Allah is with the patient.');
    },
    surah: 2,
    ayah: 153,
    get reference() {
      return t('Surah Al-Baqarah 2:153');
    },
  },
  {
    id: 4,
    get title() {
      return t('Charity');
    },
    arabic: 'Zakāh / Ṣadaqah',
    get summary() {
      return t('Establish prayer and give zakah; whatever good you put forward for yourselves, you will find with Allah.');
    },
    surah: 2,
    ayah: 110,
    get reference() {
      return t('Surah Al-Baqarah 2:110');
    },
  },
  {
    id: 5,
    get title() {
      return t('Forgiveness');
    },
    arabic: 'Maghfirah',
    get summary() {
      return t('Let them pardon and overlook. Would you not love for Allah to forgive you? Allah is Forgiving and Merciful.');
    },
    surah: 24,
    ayah: 22,
    get reference() {
      return t('Surah An-Nur 24:22');
    },
  },
  {
    id: 6,
    get title() {
      return t('Gratitude');
    },
    arabic: 'Shukr',
    get summary() {
      return t('If you are grateful, I will surely increase you; but if you deny, indeed, My punishment is severe.');
    },
    surah: 14,
    ayah: 7,
    get reference() {
      return t('Surah Ibrahim 14:7');
    },
  },
  {
    id: 7,
    get title() {
      return t('Truthfulness');
    },
    arabic: 'Ṣidq',
    get summary() {
      return t('O you who have believed, fear Allah and speak words of appropriate justice.');
    },
    surah: 33,
    ayah: 70,
    get reference() {
      return t('Surah Al-Ahzab 33:70');
    },
  },
  {
    id: 8,
    get title() {
      return t('Justice');
    },
    arabic: 'ʿAdl',
    get summary() {
      return t('O you who have believed, be persistently standing firm in justice, witnesses for Allah, even if against yourselves.');
    },
    surah: 4,
    ayah: 135,
    get reference() {
      return t('Surah An-Nisa 4:135');
    },
  },
  {
    id: 9,
    get title() {
      return t('The Hereafter');
    },
    arabic: 'Al-Ākhirah',
    get summary() {
      return t('He who created death and life to test you as to which of you is best in deed.');
    },
    surah: 67,
    ayah: 2,
    get reference() {
      return t('Surah Al-Mulk 67:2');
    },
  },
  {
    id: 10,
    get title() {
      return t('Trust in Allah');
    },
    arabic: 'Tawakkul',
    get summary() {
      return t('And whoever puts their trust in Allah — then He is sufficient for them.');
    },
    surah: 65,
    ayah: 3,
    get reference() {
      return t('Surah At-Talaq 65:3');
    },
  },
];