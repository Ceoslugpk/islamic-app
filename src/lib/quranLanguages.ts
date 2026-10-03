export interface QuranLanguageEdition {
  language: string;
  languageCode: string;
  editionIdentifier: string;
  name: string;
  flag: string;
}

export const LANGUAGE_FLAGS: Record<string, string> = {
  ar: '🇸🇦',
  en: '🇬🇧',
  ur: '🇵🇰',
  id: '🇮🇩',
  tr: '🇹🇷',
  fr: '🇫🇷',
  de: '🇩🇪',
  es: '🇪🇸',
  ru: '🇷🇺',
  bn: '🇧🇩',
  ms: '🇲🇾',
  sw: '🇹🇿',
  fa: '🇮🇷',
  so: '🇸🇴',
  ta: '🇮🇳',
  hi: '🇮🇳',
  ha: '🇳🇬',
  uz: '🇺🇿',
  sv: '🇸🇪',
};

export const QURAN_LANGUAGE_EDITIONS: QuranLanguageEdition[] = [
  { language: 'Arabic', languageCode: 'ar', editionIdentifier: 'ar.muyassar', name: 'الميسر', flag: '🇸🇦' },
  { language: 'English', languageCode: 'en', editionIdentifier: 'en.sahih', name: 'Saheeh International', flag: '🇬🇧' },
  { language: 'Urdu', languageCode: 'ur', editionIdentifier: 'ur.jalandhry', name: 'Fateh Muhammad Jalandhry', flag: '🇵🇰' },
  { language: 'Indonesian', languageCode: 'id', editionIdentifier: 'id.indonesian', name: 'Bahasa Indonesia', flag: '🇮🇩' },
  { language: 'Turkish', languageCode: 'tr', editionIdentifier: 'tr.diyanet', name: 'Diyanet İşleri', flag: '🇹🇷' },
  { language: 'French', languageCode: 'fr', editionIdentifier: 'fr.hamidullah', name: 'Muhammad Hamidullah', flag: '🇫🇷' },
  { language: 'German', languageCode: 'de', editionIdentifier: 'de.aburida', name: 'Abu Rida', flag: '🇩🇪' },
  { language: 'Spanish', languageCode: 'es', editionIdentifier: 'es.cortes', name: 'Julio Cortes', flag: '🇪🇸' },
  { language: 'Russian', languageCode: 'ru', editionIdentifier: 'ru.kuliev', name: 'Elmir Kuliev', flag: '🇷🇺' },
  { language: 'Bengali', languageCode: 'bn', editionIdentifier: 'bn.bengali', name: 'Muhiuddin Khan', flag: '🇧🇩' },
  { language: 'Malay', languageCode: 'ms', editionIdentifier: 'ms.basmeih', name: 'Abdullah Muhammad Basmeih', flag: '🇲🇾' },
  { language: 'Swahili', languageCode: 'sw', editionIdentifier: 'sw.barwani', name: 'Ali Muhsin Al-Barwani', flag: '🇹🇿' },
  { language: 'Persian', languageCode: 'fa', editionIdentifier: 'fa.ansarian', name: 'Hussain Ansarian', flag: '🇮🇷' },
  { language: 'Somali', languageCode: 'so', editionIdentifier: 'so.abduh', name: 'Mahmud Muhammad Abduh', flag: '🇸🇴' },
  { language: 'Tamil', languageCode: 'ta', editionIdentifier: 'ta.tamil', name: 'Jan Turst Foundation', flag: '🇮🇳' },
  { language: 'Hindi', languageCode: 'hi', editionIdentifier: 'hi.hindi', name: 'Suhel Farooq Khan & Nadwi', flag: '🇮🇳' },
  { language: 'Hausa', languageCode: 'ha', editionIdentifier: 'ha.gumi', name: 'Abubakar Mahmoud Gumi', flag: '🇳🇬' },
  { language: 'Uzbek', languageCode: 'uz', editionIdentifier: 'uz.sodik', name: 'Muhammad Sodik Muhammad Yusuf', flag: '🇺🇿' },
  { language: 'Swedish', languageCode: 'sv', editionIdentifier: 'sv.bernstrom', name: 'Knut Bernström', flag: '🇸🇪' },
];

export function getLanguageFlag(code: string): string {
  return LANGUAGE_FLAGS[code] || '🌐';
}

export function getEditionForLanguage(code: string): QuranLanguageEdition | undefined {
  return QURAN_LANGUAGE_EDITIONS.find((e) => e.languageCode === code);
}

export function getLanguages(): QuranLanguageEdition[] {
  return QURAN_LANGUAGE_EDITIONS;
}