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
  am: '🇪🇹',
  az: '🇦🇿',
  ba: '🇧🇦',
  ber: '🇩🇿',
  bg: '🇧🇬',
  bs: '🇧🇦',
  ce: '🇷🇺',
  cs: '🇨🇿',
  dv: '🇲🇻',
  it: '🇮🇹',
  ja: '🇯🇵',
  ko: '🇰🇷',
  ku: '🇮🇶',
  ml: '🇮🇳',
  my: '🇲🇲',
  nl: '🇳🇱',
  no: '🇳🇴',
  pl: '🇵🇱',
  ps: '🇦🇫',
  pt: '🇵🇹',
  ro: '🇷🇴',
  sd: '🇵🇰',
  si: '🇱🇰',
  sq: '🇦🇱',
  tg: '🇹🇯',
  th: '🇹🇭',
  tt: '🇷🇺',
  ug: '🇨🇳',
  zh: '🇨🇳',
};

export const QURAN_LANGUAGE_EDITIONS: QuranLanguageEdition[] = [
  // Primary / commonly used languages
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
  // Additional translations supported by AlQuran Cloud
  { language: 'Amharic', languageCode: 'am', editionIdentifier: 'am.sadiq', name: 'Sadiq & Sani Habib', flag: '🇪🇹' },
  { language: 'Azerbaijani', languageCode: 'az', editionIdentifier: 'az.mammadaliyev', name: 'Məmmədəliyev & Bünyadov', flag: '🇦🇿' },
  { language: 'Bosnian (Mehanović)', languageCode: 'ba', editionIdentifier: 'ba.mehanovic', name: 'Muhamed Mehanović', flag: '🇧🇦' },
  { language: 'Berber', languageCode: 'ber', editionIdentifier: 'ber.mensur', name: 'At Mensur', flag: '🇩🇿' },
  { language: 'Bulgarian', languageCode: 'bg', editionIdentifier: 'bg.theophanov', name: 'Tzvetan Theophanov', flag: '🇧🇬' },
  { language: 'Bosnian (Mlivo)', languageCode: 'bs', editionIdentifier: 'bs.mlivo', name: 'Mustafa Mlivo', flag: '🇧🇦' },
  { language: 'Chechen', languageCode: 'ce', editionIdentifier: 'ce.magomedov', name: 'Magomedov', flag: '🇷🇺' },
  { language: 'Czech', languageCode: 'cs', editionIdentifier: 'cs.hrbek', name: 'Ivan Hrbek', flag: '🇨🇿' },
  { language: 'Dhivehi', languageCode: 'dv', editionIdentifier: 'dv.divehi', name: 'Office of the President', flag: '🇲🇻' },
  { language: 'Italian', languageCode: 'it', editionIdentifier: 'it.piccardo', name: 'Hamza Roberto Piccardo', flag: '🇮🇹' },
  { language: 'Japanese', languageCode: 'ja', editionIdentifier: 'ja.japanese', name: 'Ryoichi Mita', flag: '🇯🇵' },
  { language: 'Korean', languageCode: 'ko', editionIdentifier: 'ko.korean', name: 'Korean Muslim Federation', flag: '🇰🇷' },
  { language: 'Kurdish', languageCode: 'ku', editionIdentifier: 'ku.asan', name: 'Burhan Muhammad-Amin', flag: '🇮🇶' },
  { language: 'Malayalam', languageCode: 'ml', editionIdentifier: 'ml.abdulhameed', name: 'Abdul Hameed & Parappoor', flag: '🇮🇳' },
  { language: 'Burmese', languageCode: 'my', editionIdentifier: 'my.ghazi', name: 'Ghazi Muhammed Hashim', flag: '🇲🇲' },
  { language: 'Dutch', languageCode: 'nl', editionIdentifier: 'nl.keyzer', name: 'Salomo Keyzer', flag: '🇳🇱' },
  { language: 'Norwegian', languageCode: 'no', editionIdentifier: 'no.berg', name: 'Einar Berg', flag: '🇳🇴' },
  { language: 'Polish', languageCode: 'pl', editionIdentifier: 'pl.bielawskiego', name: 'Józef Bielawski', flag: '🇵🇱' },
  { language: 'Pashto', languageCode: 'ps', editionIdentifier: 'ps.abdulwali', name: 'Abdul Wali', flag: '🇦🇫' },
  { language: 'Portuguese', languageCode: 'pt', editionIdentifier: 'pt.elhayek', name: 'Samir El-Hayek', flag: '🇵🇹' },
  { language: 'Romanian', languageCode: 'ro', editionIdentifier: 'ro.grigore', name: 'George Grigore', flag: '🇷🇴' },
  { language: 'Sindhi', languageCode: 'sd', editionIdentifier: 'sd.amroti', name: 'Taj Mehmood Amroti', flag: '🇵🇰' },
  { language: 'Sinhala', languageCode: 'si', editionIdentifier: 'si.naseemismail', name: 'Naseem Ismail & Masoor Maulana', flag: '🇱🇰' },
  { language: 'Albanian', languageCode: 'sq', editionIdentifier: 'sq.ahmeti', name: 'Sherif Ahmeti', flag: '🇦🇱' },
  { language: 'Tajik', languageCode: 'tg', editionIdentifier: 'tg.ayati', name: 'AbdolMohammad Ayati', flag: '🇹🇯' },
  { language: 'Thai', languageCode: 'th', editionIdentifier: 'th.thai', name: 'King Fahad Quran Complex', flag: '🇹🇭' },
  { language: 'Tatar', languageCode: 'tt', editionIdentifier: 'tt.nugman', name: 'Yakub Ibn Nugman', flag: '🇷🇺' },
  { language: 'Uyghur', languageCode: 'ug', editionIdentifier: 'ug.saleh', name: 'Muhammad Saleh', flag: '🇨🇳' },
  { language: 'Chinese', languageCode: 'zh', editionIdentifier: 'zh.jian', name: 'Ma Jian', flag: '🇨🇳' },
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

export function getQuranLanguages(): QuranLanguageEdition[] {
  return QURAN_LANGUAGE_EDITIONS;
}