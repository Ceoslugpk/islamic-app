export interface Translation {
  identifier: string;
  name: string;
  language: string;
}

export const TRANSLATIONS: Translation[] = [
  {
    identifier: 'en.sahih',
    name: 'Saheeh International',
    language: 'english',
  },
  {
    identifier: 'en.pickthall',
    name: 'Marmaduke Pickthall',
    language: 'english',
  },
  {
    identifier: 'en.yusufali',
    name: 'Abdullah Yusuf Ali',
    language: 'english',
  },
  {
    identifier: 'en.asad',
    name: 'Muhammad Asad',
    language: 'english',
  },
  {
    identifier: 'ur.jalandhry',
    name: 'Fateh Muhammad Jalandhry',
    language: 'urdu',
  },
];