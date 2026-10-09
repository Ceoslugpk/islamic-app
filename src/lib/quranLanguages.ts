import { getCurrentLanguage } from './i18n';
import { LANGUAGE_NAMES_UR } from './surahNamesLocalized';

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

export interface LocalizedEditionMeta {
  title: string;
  translator: string;
  language: string;
}

export const EDITION_METADATA_UR: Record<string, { title: string; translator: string; language: string }> = {
  // ── 48 Text Translations (keyed by stable editionIdentifier) ──
  'ar.muyassar': {
    title: 'تفسیر المیسر',
    translator: 'المیسر',
    language: 'عربی',
  },
  'en.sahih': {
    title: 'صحیح انٹرنیشنل',
    translator: 'صحیح انٹرنیشنل',
    language: 'انگریزی',
  },
  'ur.jalandhry': {
    title: 'فتح محمد جالندھری',
    translator: 'مولانا فتح محمد جالندھری',
    language: 'اردو',
  },
  'id.indonesian': {
    title: 'انڈونیشیائی ترجمہ',
    translator: 'وزارت مذہبی امور انڈونیشیا',
    language: 'انڈونیشیائی',
  },
  'tr.diyanet': {
    title: 'دیانت اشلری',
    translator: 'دیانت اشلری صدارت',
    language: 'ترکی',
  },
  'fr.hamidullah': {
    title: 'محمد حمید اللہ',
    translator: 'ڈاکٹر محمد حمید اللہ',
    language: 'فرانسیسی',
  },
  'de.aburida': {
    title: 'ابو ریدہ',
    translator: 'ابو ریدہ محمد بن احمد',
    language: 'جرمن',
  },
  'es.cortes': {
    title: 'جولیو کورٹس',
    translator: 'جولیو کورٹس',
    language: 'ہسپانوی',
  },
  'ru.kuliev': {
    title: 'ایلمیر قلیئیف',
    translator: 'ایلمیر قلیئیف',
    language: 'روسی',
  },
  'bn.bengali': {
    title: 'محی الدین خان',
    translator: 'مولانا محی الدین خان',
    language: 'بنگالی',
  },
  'ms.basmeih': {
    title: 'عبد اللہ محمد باسمیہ',
    translator: 'عبد اللہ محمد باسمیہ',
    language: 'ملائی',
  },
  'sw.barwani': {
    title: 'علی محسن البروانی',
    translator: 'علی محسن البروانی',
    language: 'سواحلی',
  },
  'fa.ansarian': {
    title: 'حسین انصاریان',
    translator: 'حسین انصاریان',
    language: 'فارسی',
  },
  'so.abduh': {
    title: 'محمود محمد عبدہ',
    translator: 'محمود محمد عبدہ',
    language: 'صومالی',
  },
  'ta.tamil': {
    title: 'جان ٹرسٹ فاؤنڈیشن',
    translator: 'جان ٹرسٹ فاؤنڈیشن',
    language: 'تامل',
  },
  'hi.hindi': {
    title: 'سہیل فاروق خان و ندوی',
    translator: 'سہیل فاروق خان و مفتی عزیز الرحمٰن ندوی',
    language: 'ہندی',
  },
  'ha.gumi': {
    title: 'ابوبکر محمود گومی',
    translator: 'شیخ ابوبکر محمود گومی',
    language: 'ہاؤسا',
  },
  'uz.sodik': {
    title: 'محمد صادق محمد یوسف',
    translator: 'شیخ محمد صادق محمد یوسف',
    language: 'ازبک',
  },
  'sv.bernstrom': {
    title: 'کنوٹ برنسٹروم',
    translator: 'کنوٹ برنسٹروم',
    language: 'سویڈش',
  },
  'am.sadiq': {
    title: 'صادق و ثانی حبیب',
    translator: 'صادق اور ثانی حبیب',
    language: 'امہری',
  },
  'az.mammadaliyev': {
    title: 'ممد علیئیف و بنیادوف',
    translator: 'واصف ممد علیئیف و ضیاء بنیادوف',
    language: 'آذربائیجانی',
  },
  'ba.mehanovic': {
    title: 'محمد میہانووچ',
    translator: 'محمد میہانووچ',
    language: 'بوسنیائی',
  },
  'ber.mensur': {
    title: 'آت منصور',
    translator: 'رمضان آت منصور',
    language: 'بربر',
  },
  'bg.theophanov': {
    title: 'تسویطان تھیوفانوف',
    translator: 'پروفیسر تسویطان تھیوفانوف',
    language: 'بلغاریائی',
  },
  'bs.mlivo': {
    title: 'مصطفیٰ ملیوو',
    translator: 'مصطفیٰ ملیوو',
    language: 'بوسنیائی',
  },
  'ce.magomedov': {
    title: 'مگومیدوف',
    translator: 'مگومیدوف',
    language: 'چیچن',
  },
  'cs.hrbek': {
    title: 'ایوان ہربیک',
    translator: 'ایوان ہربیک',
    language: 'چیک',
  },
  'dv.divehi': {
    title: 'صدارتی دفتر مالدیپ',
    translator: 'دفترِ صدر مالدیپ',
    language: 'ديويہی',
  },
  'it.piccardo': {
    title: 'حمزہ رابرٹو پیکارڈو',
    translator: 'حمزہ رابرٹو پیکارڈو',
    language: 'اطالوی',
  },
  'ja.japanese': {
    title: 'ریوئیچی میتا',
    translator: 'عمر ریوئیچی میتا',
    language: 'جاپانی',
  },
  'ko.korean': {
    title: 'کورین مسلم فیڈریشن',
    translator: 'کورین مسلم فیڈریشن',
    language: 'کوریائی',
  },
  'ku.asan': {
    title: 'برہان محمد امین',
    translator: 'برہان محمد امین',
    language: 'کردی',
  },
  'ml.abdulhameed': {
    title: 'عبد الحمید و پرپور',
    translator: 'عبد الحمید اور پرپور',
    language: 'ملیالم',
  },
  'my.ghazi': {
    title: 'غازی محمد ہاشم',
    translator: 'غازی محمد ہاشم',
    language: 'برمی',
  },
  'nl.keyzer': {
    title: 'سالومو کیزر',
    translator: 'سالومو کیزر',
    language: 'ڈچ',
  },
  'no.berg': {
    title: 'اینار برگ',
    translator: 'اینار برگ',
    language: 'ناروے',
  },
  'pl.bielawskiego': {
    title: 'جوزف بیلاوسکی',
    translator: 'پروفیسر جوزف بیلاوسکی',
    language: 'پولش',
  },
  'ps.abdulwali': {
    title: 'عبد الولی',
    translator: 'عبد الولی خاں',
    language: 'پشتو',
  },
  'pt.elhayek': {
    title: 'سمیر الحایک',
    translator: 'سمیر الحایک',
    language: 'پرتگالی',
  },
  'ro.grigore': {
    title: 'جارج گریگورے',
    translator: 'جارج گریگورے',
    language: 'رومانیائی',
  },
  'sd.amroti': {
    title: 'تاج محمود امروٹی',
    translator: 'مولانا تاج محمود امروٹی',
    language: 'سندھی',
  },
  'si.naseemismail': {
    title: 'نسیم اسماعیل و مسور مولانا',
    translator: 'نسیم اسماعیل و مسور مولانا',
    language: 'سنہالا',
  },
  'sq.ahmeti': {
    title: 'شریف احمدی',
    translator: 'شریف احمدی',
    language: 'البانوی',
  },
  'tg.ayati': {
    title: 'عبد المحمد آیاتی',
    translator: 'عبد المحمد آیاتی',
    language: 'تاجک',
  },
  'th.thai': {
    title: 'شاہ فہد قرآن کمپلیکس',
    translator: 'شاہ فہد قرآن پرنٹنگ کمپلیکس',
    language: 'تھائی',
  },
  'tt.nugman': {
    title: 'یعقوب ابن نعمان',
    translator: 'یعقوب ابن نعمان',
    language: 'تاتاری',
  },
  'ug.saleh': {
    title: 'محمد صالح',
    translator: 'محمد صالح کاشغری',
    language: 'ایغور',
  },
  'zh.jian': {
    title: 'ما جیان',
    translator: 'محمد ما جیان',
    language: 'چینی',
  },

  // ── Audio Translations (keyed by reciter identifier) ──
  'en.everyayah-walk': {
    title: 'صحیح انٹرنیشنل (ابراہیم والک)',
    translator: 'ابراہیم والک',
    language: 'انگریزی',
  },
  'ur.everyayah-shamshad': {
    title: 'شمشاد علی خان',
    translator: 'شمشاد علی خان',
    language: 'اردو',
  },
  'ur.everyayah-farhathashmi': {
    title: 'ڈاکٹر فرحت ہاشمی',
    translator: 'ڈاکٹر فرحت ہاشمی',
    language: 'اردو',
  },
  'zh.chinese': {
    title: 'چینی ترجمہ',
    translator: 'چینی ترجمہ',
    language: 'چینی',
  },
  'fr.leclerc': {
    title: 'یوسف لےکلرک',
    translator: 'یوسف لےکلرک',
    language: 'فرانسیسی',
  },
  'ru.kuliev-audio': {
    title: 'ایلمیر قلیئیف',
    translator: 'ایلمیر قلیئیف',
    language: 'روسی',
  },
  'tr.vakfi-audio': {
    title: 'دیانت وقفی',
    translator: 'دیانت وقفی',
    language: 'ترکی',
  },
  'fa.everyayah-kabiri': {
    title: 'مکارم شیرازی (کبیری)',
    translator: 'مکارم شیرازی (کبیری)',
    language: 'فارسی',
  },
  'fa.everyayah-hedayatfar': {
    title: 'فولادوند (ہدایت فر)',
    translator: 'فولادوند (ہدایت فر)',
    language: 'فارسی',
  },
  'az.everyayah-balayev': {
    title: 'راسم بالایف',
    translator: 'راسم بالایف',
    language: 'آذربائیجانی',
  },
  'kk.khalifahaltai-audio': {
    title: 'خلیفہ التائی',
    translator: 'خلیفہ التائی',
    language: 'قازق',
  },
  'uz.sodik-audio': {
    title: 'محمد صادق',
    translator: 'محمد صادق',
    language: 'ازبک',
  },
  'bs.everyayah-korkut': {
    title: 'بیسم کورکوت',
    translator: 'بیسم کورکوت',
    language: 'بوسنیائی',
  },
};

/**
 * Returns localized translator / author display name for the current language.
 * - Urdu (`ur`): returns localized Urdu translator name if available in map.
 * - English (`en`): returns fallbackName unchanged.
 * - Remote unknown editions safely fall back to fallbackName or identifier.
 */
export function getLocalizedTranslatorName(identifier: string, fallbackName?: string): string {
  const lang = getCurrentLanguage();
  if (lang === 'ur') {
    const meta = EDITION_METADATA_UR[identifier];
    if (meta?.translator) {
      return meta.translator;
    }
  }
  return fallbackName || identifier;
}

/**
 * Returns localized translation title for the current language.
 */
export function getLocalizedTranslationTitle(identifier: string, fallbackTitle?: string): string {
  const lang = getCurrentLanguage();
  if (lang === 'ur') {
    const meta = EDITION_METADATA_UR[identifier];
    if (meta?.title) {
      return meta.title;
    }
  }
  return fallbackTitle || identifier;
}

/**
 * Returns full localized edition metadata (title, translator, language) for current language.
 */
export function getLocalizedEditionMeta(
  identifier: string,
  fallbackName?: string,
  fallbackLang?: string
): LocalizedEditionMeta {
  const lang = getCurrentLanguage();
  const rawEdition = QURAN_LANGUAGE_EDITIONS.find((e) => e.editionIdentifier === identifier);
  const defName = fallbackName || rawEdition?.name || identifier;
  const defLang = fallbackLang || rawEdition?.language || '';

  if (lang === 'ur') {
    const meta = EDITION_METADATA_UR[identifier];
    return {
      title: meta?.title || defName,
      translator: meta?.translator || defName,
      language: meta?.language || (defLang ? (LANGUAGE_NAMES_UR[defLang] || defLang) : ''),
    };
  }

  return {
    title: defName,
    translator: defName,
    language: defLang,
  };
}