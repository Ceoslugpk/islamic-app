import { getCurrentLanguage, t } from './i18n';
import { LANGUAGE_NAMES_UR, LANGUAGE_NAMES_AR, LANGUAGE_NAMES_HI, LANGUAGE_NAMES_ML, LANGUAGE_NAMES_SI } from './surahNamesLocalized';

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

const RAW_QURAN_LANGUAGE_EDITIONS: QuranLanguageEdition[] = [
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

function localizeEditionText(item: QuranLanguageEdition): QuranLanguageEdition {
  return {
    ...item,
    get language() {
      return t(item.language);
    },
    get name() {
      return /[A-Za-z]/.test(item.name) ? t(item.name) : item.name;
    },
  };
}

export const QURAN_LANGUAGE_EDITIONS: QuranLanguageEdition[] = RAW_QURAN_LANGUAGE_EDITIONS.map(localizeEditionText);

export function getLanguageFlag(code: string): string {
  return LANGUAGE_FLAGS[code] || '🌐';
}

export function getEditionForLanguage(code: string): QuranLanguageEdition | undefined {
  return QURAN_LANGUAGE_EDITIONS.find((e) => e.languageCode === code.toLowerCase());
}

/** Returns the registered Quran language recommended for an app language. */
export function getRecommendedQuranLanguage(appLanguage: string): string {
  return getEditionForLanguage(appLanguage)?.languageCode || 'en';
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

export const EDITION_METADATA_AR: Record<string, { title: string; translator: string; language: string }> = {
  // ── 48 Text Translations (keyed by stable editionIdentifier) ──
  'ar.muyassar': {
    title: 'التفسير الميسر',
    translator: 'نخبة من العلماء',
    language: 'العربية',
  },
  'en.sahih': {
    title: 'صحيح إنترناشونال',
    translator: 'صحيح إنترناشونال',
    language: 'الإنجليزية',
  },
  'ur.jalandhry': {
    title: 'فتح محمد جالندهري',
    translator: 'مولانا فتح محمد جالندهري',
    language: 'الأردية',
  },
  'id.indonesian': {
    title: 'الترجمة الإندونيسية',
    translator: 'وزارة الشؤون الدينية الإندونيسية',
    language: 'الإندونيسية',
  },
  'tr.diyanet': {
    title: 'رئاسة الشؤون الدينية التركية',
    translator: 'ديانت إيشلري',
    language: 'التركية',
  },
  'fr.hamidullah': {
    title: 'محمد حميد الله',
    translator: 'د. محمد حميد الله',
    language: 'الفرنسية',
  },
  'de.aburida': {
    title: 'أبو رضا',
    translator: 'أبو رضا محمد بن أحمد',
    language: 'الألمانية',
  },
  'es.cortes': {
    title: 'خوليو كورتيس',
    translator: 'خوليو كورتيس',
    language: 'الإسبانية',
  },
  'ru.kuliev': {
    title: 'إلمير كولييف',
    translator: 'إلمير كولييف',
    language: 'الروسية',
  },
  'bn.bengali': {
    title: 'محيي الدين خان',
    translator: 'مولانا محيي الدين خان',
    language: 'البنغالية',
  },
  'ms.basmeih': {
    title: 'عبد الله محمد باسميح',
    translator: 'عبد الله محمد باسميح',
    language: 'الملايو',
  },
  'sw.barwani': {
    title: 'علي محسن البرواني',
    translator: 'علي محسن البرواني',
    language: 'السواحيلية',
  },
  'fa.ansarian': {
    title: 'حسين أنصاريان',
    translator: 'الشيخ حسين أنصاريان',
    language: 'الفارسية',
  },
  'so.abduh': {
    title: 'محمود محمد عبده',
    translator: 'محمود محمد عبده',
    language: 'الصومالية',
  },
  'ta.tamil': {
    title: 'مؤسسة جان ترست',
    translator: 'مؤسسة جان ترست',
    language: 'التاميلية',
  },
  'hi.hindi': {
    title: 'سهيل فاروق خان والندوي',
    translator: 'سهيل فاروق خان وعزيز الرحمن الندوي',
    language: 'الهندية',
  },
  'ha.gumi': {
    title: 'أبو بكر محمود غومي',
    translator: 'الشيخ أبو بكر محمود غومي',
    language: 'الهوسا',
  },
  'uz.sodik': {
    title: 'محمد صادق محمد يوسف',
    translator: 'الشيخ محمد صادق محمد يوسف',
    language: 'الأوزبكية',
  },
  'sv.bernstrom': {
    title: 'كنوت برنستروم',
    translator: 'كنوت برنستروم',
    language: 'السويدية',
  },
  'am.sadiq': {
    title: 'صادق وثاني حبيب',
    translator: 'صادق وثاني حبيب',
    language: 'الأمهرية',
  },
  'az.mammadaliyev': {
    title: 'محمد علييف وبنيادوف',
    translator: 'واصف محمد علييف وضياء بنيادوف',
    language: 'الأذربيجانية',
  },
  'ba.mehanovic': {
    title: 'محمد ميهانوفيتش',
    translator: 'محمد ميهانوفيتش',
    language: 'البوسنية',
  },
  'ber.mensur': {
    title: 'رمضان آت منصور',
    translator: 'رمضان آت منصور',
    language: 'الأمازيغية',
  },
  'bg.theophanov': {
    title: 'تسفيتان تيوفانوف',
    translator: 'البروفيسور تسفيتان تيوفانوف',
    language: 'البلغارية',
  },
  'bs.mlivo': {
    title: 'مصطفى مليفو',
    translator: 'مصطفى مليفو',
    language: 'البوسنية',
  },
  'ce.magomedov': {
    title: 'ماغوميدوف',
    translator: 'ماغوميدوف',
    language: 'الشيشانية',
  },
  'cs.hrbek': {
    title: 'إيفان هربك',
    translator: 'إيفان هربك',
    language: 'التشيكية',
  },
  'dv.divehi': {
    title: 'مكتب الرئاسة المالديفية',
    translator: 'مكتب رئيس المالديف',
    language: 'الديفيهية',
  },
  'it.piccardo': {
    title: 'حمزة روبرتو بيكاردو',
    translator: 'حمزة روبرتو بيكاردو',
    language: 'الإيطالية',
  },
  'ja.japanese': {
    title: 'ريوتشي ميتا',
    translator: 'عمر ريوتشي ميتا',
    language: 'اليابانية',
  },
  'ko.korean': {
    title: 'الاتحاد الإسلامي الكوري',
    translator: 'الاتحاد الإسلامي الكوري',
    language: 'الكورية',
  },
  'ku.asan': {
    title: 'برهان محمد أمين',
    translator: 'برهان محمد أمين',
    language: 'الكردية',
  },
  'ml.abdulhameed': {
    title: 'عبد الحميد وبارابور',
    translator: 'عبد الحميد ومحمد بارابور',
    language: 'الماليالامية',
  },
  'my.ghazi': {
    title: 'غازي محمد هاشم',
    translator: 'غازي محمد هاشم',
    language: 'البورمية',
  },
  'nl.keyzer': {
    title: 'سالومو كيزر',
    translator: 'سالومو كيزر',
    language: 'الهولندية',
  },
  'no.berg': {
    title: 'إينار بيرغ',
    translator: 'إينار بيرغ',
    language: 'النرويجية',
  },
  'pl.bielawskiego': {
    title: 'يوزف بيلافسكي',
    translator: 'البروفيسور يوزف بيلافسكي',
    language: 'البولندية',
  },
  'ps.abdulwali': {
    title: 'عبد الولي',
    translator: 'عبد الولي خان',
    language: 'البشتوية',
  },
  'pt.elhayek': {
    title: 'سمير الحايك',
    translator: 'سمير الحايك',
    language: 'البرتغالية',
  },
  'ro.grigore': {
    title: 'جورج جريجوري',
    translator: 'جورج جريجوري',
    language: 'الرومانية',
  },
  'sd.amroti': {
    title: 'تاج محمود أمروتي',
    translator: 'مولانا تاج محمود أمروتي',
    language: 'السندية',
  },
  'si.naseemismail': {
    title: 'نسيم إسماعيل ومسور مولانا',
    translator: 'نسيم إسماعيل ومسور مولانا',
    language: 'السنهالية',
  },
  'sq.ahmeti': {
    title: 'شريف أحمدي',
    translator: 'شريف أحمدي',
    language: 'الألبانية',
  },
  'tg.ayati': {
    title: 'عبد المحمد آيتي',
    translator: 'عبد المحمد آيتي',
    language: 'الطاجيكية',
  },
  'th.thai': {
    title: 'مجمع الملك فهد لطباعة المصحف الشريف',
    translator: 'مجمع الملك فهد',
    language: 'التايلاندية',
  },
  'tt.nugman': {
    title: 'يعقوب بن نعمان',
    translator: 'يعقوب بن نعمان',
    language: 'التتارية',
  },
  'ug.saleh': {
    title: 'محمد صالح',
    translator: 'محمد صالح الكاشغري',
    language: 'الأويغورية',
  },
  'zh.jian': {
    title: 'محمد ما جيان',
    translator: 'محمد ما جيان',
    language: 'الصينية',
  },

  // ── Audio Translations (keyed by reciter identifier) ──
  'en.everyayah-walk': {
    title: 'صحيح إنترناشونال (إبراهيم والك)',
    translator: 'إبراهيم والك',
    language: 'الإنجليزية',
  },
  'ur.everyayah-shamshad': {
    title: 'شمشاد علي خان',
    translator: 'شمشاد علي خان',
    language: 'الأردية',
  },
  'ur.everyayah-farhathashmi': {
    title: 'د. فرحت هاشمي',
    translator: 'د. فرحت هاشمي',
    language: 'الأردية',
  },
  'zh.chinese': {
    title: 'الترجمة الصينية',
    translator: 'الترجمة الصينية',
    language: 'الصينية',
  },
  'fr.leclerc': {
    title: 'يوسف لوكليرك',
    translator: 'يوسف لوكليرك',
    language: 'الفرنسية',
  },
  'ru.kuliev-audio': {
    title: 'إلمير كولييف',
    translator: 'إلمير كولييف',
    language: 'الروسية',
  },
  'tr.vakfi-audio': {
    title: 'وقف الديانة التركي',
    translator: 'وقف الديانة',
    language: 'التركية',
  },
  'fa.everyayah-kabiri': {
    title: 'مكارم الشيرازي (كبيري)',
    translator: 'مكارم الشيرازي (كبيري)',
    language: 'الفارسية',
  },
  'fa.everyayah-hedayatfar': {
    title: 'فولادفند (هدايت فر)',
    translator: 'فولادفند (هدايت فر)',
    language: 'الفارسية',
  },
  'az.everyayah-balayev': {
    title: 'راسم بالايف',
    translator: 'راسم بالايف',
    language: 'الأذربيجانية',
  },
  'kk.khalifahaltai-audio': {
    title: 'خليفة ألتاي',
    translator: 'خليفة ألتاي',
    language: 'القازاقية',
  },
  'uz.sodik-audio': {
    title: 'محمد صادق',
    translator: 'محمد صادق',
    language: 'الأوزبكية',
  },
  'bs.everyayah-korkut': {
    title: 'بزيم كوركوت',
    translator: 'بزيم كوركوت',
    language: 'البوسنية',
  },
};

export const EDITION_METADATA_HI: Record<string, { title: string; translator: string; language: string }> = {
  // ── 48 Text Translations (keyed by stable editionIdentifier) ──
  'ar.muyassar': {
    title: 'तफ़्सीर अल-मुयस्सर',
    translator: 'अल-मुयस्सर',
    language: 'अरबी',
  },
  'en.sahih': {
    title: 'सहीह इंटरनेशनल',
    translator: 'सहीह इंटरनेशनल',
    language: 'अंग्रेज़ी',
  },
  'ur.jalandhry': {
    title: 'फ़तह मुहम्मद जालंधरी',
    translator: 'मौलाना फ़तह मुहम्मद जालंधरी',
    language: 'उर्दू',
  },
  'id.indonesian': {
    title: 'इंडोनेशियाई अनुवाद',
    translator: 'धार्मिक मामलों का मंत्रालय इंडोनेशिया',
    language: 'इंडोनेशियाई',
  },
  'tr.diyanet': {
    title: 'दियानत इशलेरी',
    translator: 'दियानत इशलेरी प्रेसीडेंसी',
    language: 'तुर्की',
  },
  'fr.hamidullah': {
    title: 'मुहम्मद हमीदुल्लाह',
    translator: 'डॉ. मुहम्मद हमीदुल्लाह',
    language: 'फ़्रांसीसी',
  },
  'de.aburida': {
    title: 'अबू रिदा',
    translator: 'अबू रिदा मुहम्मद इब्न अहमद',
    language: 'जर्मन',
  },
  'es.cortes': {
    title: 'जूलियो कोर्टेस',
    translator: 'जूलियो कोर्टेस',
    language: 'स्पैनिश',
  },
  'ru.kuliev': {
    title: 'एल्मिर कुलिएव',
    translator: 'एल्मिर कुलिएव',
    language: 'रूसी',
  },
  'bn.bengali': {
    title: 'मुहिउद्दीन ख़ान',
    translator: 'मौलाना मुहिउद्दीन ख़ान',
    language: 'बंगाली',
  },
  'ms.basmeih': {
    title: 'अब्दुल्लाह मुहम्मद बासमिया',
    translator: 'अब्दुल्लाह मुहम्मद बासमिया',
    language: 'मलय',
  },
  'sw.barwani': {
    title: 'अली मुहसिन अल-बरवानी',
    translator: 'अली मुहसिन अल-बरवानी',
    language: 'स्वाहिली',
  },
  'fa.ansarian': {
    title: 'हुसैन अंसारियान',
    translator: 'हुसैन अंसारियान',
    language: 'फ़ारसी',
  },
  'so.abduh': {
    title: 'महमूद मुहम्मद अब्दूह',
    translator: 'महमूद मुहम्मद अब्दूह',
    language: 'सोमाली',
  },
  'ta.tamil': {
    title: 'जान ट्रस्ट फ़ाउंडेशन',
    translator: 'जान ट्रस्ट फ़ाउंडेशन',
    language: 'तमिल',
  },
  'hi.hindi': {
    title: 'सुहेल फ़ारूक़ ख़ान व नदवी',
    translator: 'सुहेल फ़ारूक़ ख़ान व मुफ़्ती अज़ीज़ुर्रहमान नदवी',
    language: 'हिन्दी',
  },
  'ha.gumi': {
    title: 'अबू बकर महमूद गूमी',
    translator: 'शेख़ अबू बकर महमूद गूमी',
    language: 'हौसा',
  },
  'uz.sodik': {
    title: 'मुहम्मद सोदिक़ मुहम्मद यूसुफ़',
    translator: 'शेख़ मुहम्मद सोदिक़ मुहम्मद यूसुफ़',
    language: 'उज़्बेक',
  },
  'sv.bernstrom': {
    title: 'नट बर्नस्ट्रॉम',
    translator: 'नट बर्नस्ट्रॉम',
    language: 'स्वीडिश',
  },
  'am.sadiq': {
    title: 'सादिक़ व सानी हबीब',
    translator: 'सादिक़ और सानी हबीब',
    language: 'अम्हारिक',
  },
  'az.mammadaliyev': {
    title: 'मम्मादालियेव व बुनियादोव',
    translator: 'वासिफ़ मम्मादालियेव व ज़िया बुनियादोव',
    language: 'अज़रबैजानी',
  },
  'ba.mehanovic': {
    title: 'मुहामेद मेहानोविच',
    translator: 'मुहामेद मेहानोविच',
    language: 'बोस्नियाई',
  },
  'ber.mensur': {
    title: 'अत मंसूर',
    translator: 'रमादान अत मंसूर',
    language: 'बर्बर',
  },
  'bg.theophanov': {
    title: 'वेतान थियोफ़ानोव',
    translator: 'प्रोफ़ेसर वेतान थियोफ़ानोव',
    language: 'बुल्गारियाई',
  },
  'bs.mlivo': {
    title: 'मुस्तफ़ा म्लिवो',
    translator: 'मुस्तफ़ा म्लिवो',
    language: 'बोस्नियाई',
  },
  'ce.magomedov': {
    title: 'मागोमेदोव',
    translator: 'मागोमेदोव',
    language: 'चेचन',
  },
  'cs.hrbek': {
    title: 'इवान हरबेक',
    translator: 'इवान हरबेक',
    language: 'चेक',
  },
  'dv.divehi': {
    title: 'राष्ट्रपति कार्यालय मालदीव',
    translator: 'मालदीव राष्ट्रपति कार्यालय',
    language: 'धिवेही',
  },
  'it.piccardo': {
    title: 'हमज़ा रॉबर्टो पिकार्डो',
    translator: 'हमज़ा रॉबर्टो पिकार्डो',
    language: 'इतालवी',
  },
  'ja.japanese': {
    title: 'रियोइची मीता',
    translator: 'उमर रियोइची मीता',
    language: 'जापानी',
  },
  'ko.korean': {
    title: 'कोरियन मुस्लिम फेडरेशन',
    translator: 'कोरियन मुस्लिम फेडरेशन',
    language: 'कोरियाई',
  },
  'ku.asan': {
    title: 'बुरहान मुहम्मद-अमीन',
    translator: 'बुरहान मुहम्मद-अमीन',
    language: 'कुर्दिश',
  },
  'ml.abdulhameed': {
    title: 'अब्दुल हमीद व पराप्पूर',
    translator: 'अब्दुल हमीद और पराप्पूर',
    language: 'मलयालम',
  },
  'my.ghazi': {
    title: 'ग़ाज़ी मुहम्मद हाशिम',
    translator: 'ग़ाज़ी मुहम्मद हाशिम',
    language: 'बर्मी',
  },
  'nl.keyzer': {
    title: 'सालोमो काइज़र',
    translator: 'सालोमो काइज़र',
    language: 'डच',
  },
  'no.berg': {
    title: 'एनार बर्ग',
    translator: 'एनार बर्ग',
    language: 'नॉर्वेजियाई',
  },
  'pl.bielawskiego': {
    title: 'जोज़ेफ़ बिएलावस्की',
    translator: 'प्रोफ़ेसर जोज़ेफ़ बिएलावस्की',
    language: 'पोलिश',
  },
  'ps.abdulwali': {
    title: 'अब्दुल वली',
    translator: 'अब्दुल वली ख़ान',
    language: 'पश्तो',
  },
  'pt.elhayek': {
    title: 'समीर अल-हायेक',
    translator: 'समीर अल-हायेक',
    language: 'पुर्तगाली',
  },
  'ro.grigore': {
    title: 'जॉर्ज ग्रिगोर',
    translator: 'जॉर्ज ग्रिगोर',
    language: 'रोमानियाई',
  },
  'sd.amroti': {
    title: 'ताज महमूद अमरोटी',
    translator: 'मौलाना ताज महमूद अमरोटी',
    language: 'सिंधी',
  },
  'si.naseemismail': {
    title: 'नसीम इस्माइल व मसरूर मौलाना',
    translator: 'नसीम इस्माइल व मसरूर मौलाना',
    language: 'सिंहली',
  },
  'sq.ahmeti': {
    title: 'शरीफ़ अहमेती',
    translator: 'शरीफ़ अहमेती',
    language: 'अल्बानियाई',
  },
  'tg.ayati': {
    title: 'अब्दुल मुहम्मद अयाती',
    translator: 'अब्दुल मुहम्मद अयाती',
    language: 'ताजिक',
  },
  'th.thai': {
    title: 'शाह फ़हद क़ुरआन कॉम्प्लेक्स',
    translator: 'शाह फ़हद क़ुरआन प्रिंटिंग कॉम्प्लेक्स',
    language: 'थाई',
  },
  'tt.nugman': {
    title: 'याकूब इब्न नुग़मान',
    translator: 'याकूब इब्न नुग़मान',
    language: 'तातार',
  },
  'ug.saleh': {
    title: 'मुहम्मद सालेह',
    translator: 'मुहम्मद सालेह काशग़री',
    language: 'उइघुर',
  },
  'zh.jian': {
    title: 'मा जियान',
    translator: 'मुहम्मद मा जियान',
    language: 'चीनी',
  },

  // ── Audio Translations (keyed by reciter identifier) ──
  'en.everyayah-walk': {
    title: 'सहीह इंटरनेशनल (इब्राहीम वॉक)',
    translator: 'इब्राहीम वॉक',
    language: 'अंग्रेज़ी',
  },
  'ur.everyayah-shamshad': {
    title: 'शमशाद अली ख़ान',
    translator: 'शमशाद अली ख़ान',
    language: 'उर्दू',
  },
  'ur.everyayah-farhathashmi': {
    title: 'डॉ. फ़रहत हाशमी',
    translator: 'डॉ. फ़रहत हाशमी',
    language: 'उर्दू',
  },
  'zh.chinese': {
    title: 'चीनी अनुवाद',
    translator: 'चीनी अनुवाद',
    language: 'चीनी',
  },
  'fr.leclerc': {
    title: 'यूसुफ़ लेक्लर्क',
    translator: 'यूसुफ़ लेक्लर्क',
    language: 'फ़्रांसीसी',
  },
  'ru.kuliev-audio': {
    title: 'एल्मिर कुलिएव',
    translator: 'एल्मिर कुलिएव',
    language: 'रूसी',
  },
  'tr.vakfi-audio': {
    title: 'दियानत वक़्फ़',
    translator: 'दियानत वक़्फ़',
    language: 'तुर्की',
  },
  'fa.everyayah-kabiri': {
    title: 'मकारिम शिराज़ी (कबीरी)',
    translator: 'मकारिम शिराज़ी (कबीरी)',
    language: 'फ़ारसी',
  },
  'fa.everyayah-hedayatfar': {
    title: 'फ़ौलादवंद (हेदायतफ़र)',
    translator: 'फ़ौलादवंद (हेदायतफ़र)',
    language: 'फ़ारसी',
  },
  'az.everyayah-balayev': {
    title: 'रासिम बाबायेव',
    translator: 'रासिम बाबायेव',
    language: 'अज़रबैजानी',
  },
  'kk.khalifahaltai-audio': {
    title: 'ख़लीफ़ा अल्ताई',
    translator: 'ख़लीफ़ा अल्ताई',
    language: 'कज़ाख़',
  },
  'uz.sodik-audio': {
    title: 'मुहम्मद सोदिक़',
    translator: 'मुहम्मद सोदिक़',
    language: 'उज़्बेक',
  },
  'bs.everyayah-korkut': {
    title: 'बेसिम कोरकुत',
    translator: 'बेसिम कोरकुत',
    language: 'बोस्नियाई',
  },
};

export const EDITION_METADATA_ML: Record<string, { title: string; translator: string; language: string }> = {
  // ── 48 Text Translations (keyed by stable editionIdentifier) ──
  'ar.muyassar': {
    title: 'തഫ്സീർ അൽ-മുയസ്സർ',
    translator: 'അൽ-മുയസ്സർ',
    language: 'അറബിക്',
  },
  'en.sahih': {
    title: 'സ്വഹീഹ് ഇന്റർനാഷണൽ',
    translator: 'സ്വഹീഹ് ഇന്റർനാഷണൽ',
    language: 'ഇംഗ്ലീഷ്',
  },
  'ur.jalandhry': {
    title: 'ഫതഹ് മുഹമ്മദ് ജലന്ധരി',
    translator: 'മൗലാനാ ഫതഹ് മുഹമ്മദ് ജലന്ധരി',
    language: 'ഉർദു',
  },
  'id.indonesian': {
    title: 'ഇന്തോനേഷ്യൻ വിവർത്തനം',
    translator: 'മതകാര്യ മന്ത്രാലയം ഇന്തോനേഷ്യ',
    language: 'ഇന്തോനേഷ്യൻ',
  },
  'tr.diyanet': {
    title: 'ദിയാനത്ത് ഇഷ്‌ലേരി',
    translator: 'ദിയാനത്ത് ഇഷ്‌ലേരി പ്രസിഡൻസി',
    language: 'ടർക്കിഷ്',
  },
  'fr.hamidullah': {
    title: 'മുഹമ്മദ് ഹമീദുള്ള',
    translator: 'ഡോ. മുഹമ്മദ് ഹമീദുള്ള',
    language: 'ഫ്രഞ്ച്',
  },
  'de.aburida': {
    title: 'അബൂ റിദ',
    translator: 'അബൂ റിദ മുഹമ്മദ് ഇബ്നു അഹമ്മദ്',
    language: 'ജർമ്മൻ',
  },
  'es.cortes': {
    title: 'ജൂലിയോ കോർട്ടസ്',
    translator: 'ജൂലിയോ കോർട്ടസ്',
    language: 'സ്പാനിഷ്',
  },
  'ru.kuliev': {
    title: 'എൽമിർ കുലിയേവ്',
    translator: 'എൽമിർ കുലിയേവ്',
    language: 'റഷ്യൻ',
  },
  'bn.bengali': {
    title: 'മുഹിയുദ്ദീൻ ഖാൻ',
    translator: 'മൗലാനാ മുഹിയുദ്ദീൻ ഖാൻ',
    language: 'ബംഗാളി',
  },
  'ms.basmeih': {
    title: 'അബ്ദുല്ല മുഹമ്മദ് ബാസ്മൈഹ്',
    translator: 'അബ്ദുല്ല മുഹമ്മദ് ബാസ്മൈഹ്',
    language: 'മലായ്',
  },
  'sw.barwani': {
    title: 'അലി മുഹ്സിൻ അൽ-ബർവാനി',
    translator: 'അലി മുഹ്സിൻ അൽ-ബർവാനി',
    language: 'സ്വഹിലി',
  },
  'fa.ansarian': {
    title: 'ഹുസൈൻ അൻസാരിയൻ',
    translator: 'ഹുസൈൻ അൻസാരിയൻ',
    language: 'പേർഷ്യൻ',
  },
  'so.abduh': {
    title: 'മഹ്മൂദ് മുഹമ്മദ് അബ്ദുഹ്',
    translator: 'മഹ്മൂദ് മുഹമ്മദ് അബ്ദുഹ്',
    language: 'സൊമാലി',
  },
  'ta.tamil': {
    title: 'ജാൻ ട്രസ്റ്റ് ഫൗണ്ടേഷൻ',
    translator: 'ജാൻ ട്രസ്റ്റ് ഫൗണ്ടേഷൻ',
    language: 'തമിഴ്',
  },
  'hi.hindi': {
    title: 'സുഹൈൽ ഫാറൂഖ് ഖാൻ & നദ്‌വി',
    translator: 'സുഹൈൽ ഫാറൂഖ് ഖാൻ & മുഫ്തി അസീസുർ റഹ്മാൻ നദ്‌വി',
    language: 'ഹിന്ദി',
  },
  'ha.gumi': {
    title: 'അബൂബക്കർ മഹ്മൂദ് ഗുമി',
    translator: 'ശൈഖ് അബൂബക്കർ മഹ്മൂദ് ഗുമി',
    language: 'ഹൗസ',
  },
  'uz.sodik': {
    title: 'മുഹമ്മദ് സാദിഖ് മുഹമ്മദ് യൂസുഫ്',
    translator: 'ശൈഖ് മുഹമ്മദ് സാദിഖ് മുഹമ്മദ് യൂസുഫ്',
    language: 'ഉസ്ബെക്',
  },
  'sv.bernstrom': {
    title: 'ക്നൂട്ട് ബേൺസ്ട്രോം',
    translator: 'ക്നൂട്ട് ബേൺസ്ട്രോം',
    language: 'സ്വീഡിഷ്',
  },
  'am.sadiq': {
    title: 'സാദിഖ് & സാനി ഹബീബ്',
    translator: 'സാദിഖ് & സാനി ഹബീബ്',
    language: 'അംഹാറിക്',
  },
  'az.mammadaliyev': {
    title: 'മമ്മദലിയേവ് & ബുന്യാദോവ്',
    translator: 'വാസിഫ് മമ്മദലിയേവ് & സിയ ബുന്യാദോവ്',
    language: 'അസർബൈജാനി',
  },
  'ba.mehanovic': {
    title: 'മുഹമ്മദ് മെഹാനോവിച്ച്',
    translator: 'മുഹമ്മദ് മെഹാനോവിച്ച്',
    language: 'ബോസ്നിയൻ',
  },
  'ber.mensur': {
    title: 'അത് മൻസൂർ',
    translator: 'റമദാൻ അത് മൻസൂർ',
    language: 'ബെർബർ',
  },
  'bg.theophanov': {
    title: 'സ്വെറ്റാൻ തിയോഫാനോവ്',
    translator: 'പ്രൊഫസർ സ്വെറ്റാൻ തിയോഫാനോവ്',
    language: 'ബൾഗേറിയൻ',
  },
  'bs.mlivo': {
    title: 'മുസ്തഫ മ്ലിവോ',
    translator: 'മുസ്തഫ മ്ലിവോ',
    language: 'ബോസ്നിയൻ',
  },
  'ce.magomedov': {
    title: 'മഗോമെദോവ്',
    translator: 'മഗോമെദോവ്',
    language: 'ചെച്ചൻ',
  },
  'cs.hrbek': {
    title: 'ഇവാൻ ഹ്ര്ബെക്',
    translator: 'ഇവാൻ ഹ്ര്ബെക്',
    language: 'ചെക്ക്',
  },
  'dv.divehi': {
    title: 'പ്രസിഡന്റിന്റെ ഓഫീസ് മാലിദ്വീപ്',
    translator: 'മാലിദ്വീപ് പ്രസിഡന്റിന്റെ ഓഫീസ്',
    language: 'ദിവെഹി',
  },
  'it.piccardo': {
    title: 'ഹംസ റോബർട്ടോ പിക്കാർഡോ',
    translator: 'ഹംസ റോബർട്ടോ പിക്കാർഡോ',
    language: 'ഇറ്റാലിയൻ',
  },
  'ja.japanese': {
    title: 'റിയോയിച്ചി മിത',
    translator: 'ഉമർ റിയോയിച്ചി മിത',
    language: 'ജാപ്പനീസ്',
  },
  'ko.korean': {
    title: 'കൊറിയൻ മുസ്ലിം ഫെഡറേഷൻ',
    translator: 'കൊറിയൻ മുസ്ലിം ഫെഡറേഷൻ',
    language: 'കൊറിയൻ',
  },
  'ku.asan': {
    title: 'ബുർഹാൻ മുഹമ്മദ്-അമീൻ',
    translator: 'ബുർഹാൻ മുഹമ്മദ്-അമീൻ',
    language: 'കുർദിഷ്',
  },
  'ml.abdulhameed': {
    title: 'അബ്ദുൽ ഹമീദ് & പറപ്പൂർ',
    translator: 'ചെറിയമുണ്ടം അബ്ദുൽ ഹമീദ് & കുഞ്ഞിമുഹമ്മദ് പറപ്പൂർ',
    language: 'മലയാളം',
  },
  'my.ghazi': {
    title: 'ഗാസി മുഹമ്മദ് ഹാഷിം',
    translator: 'ഗാസി മുഹമ്മദ് ഹാഷിം',
    language: 'ബർമീസ്',
  },
  'nl.keyzer': {
    title: 'സലോമോ കീസർ',
    translator: 'സലോമോ കീസർ',
    language: 'ഡച്ച്',
  },
  'no.berg': {
    title: 'ഐനാർ ബെർഗ്',
    translator: 'ഐനാർ ബെർഗ്',
    language: 'നോർവീജിയൻ',
  },
  'pl.bielawskiego': {
    title: 'ജോസഫ് ബീലാവ്സ്കി',
    translator: 'പ്രൊഫസർ ജോസഫ് ബീലാവ്സ്കി',
    language: 'പോളിഷ്',
  },
  'ps.abdulwali': {
    title: 'അബ്ദുൽ വലി',
    translator: 'അബ്ദുൽ വലി ഖാൻ',
    language: 'പഷ്തോ',
  },
  'pt.elhayek': {
    title: 'സമീർ എൽ-ഹായെക്',
    translator: 'സമീർ എൽ-ഹായെക്',
    language: 'പോർച്ചുഗീസ്',
  },
  'ro.grigore': {
    title: 'ജോർജ്ജ് ഗ്രിഗോറെ',
    translator: 'ജോർജ്ജ് ഗ്രിഗോറെ',
    language: 'റൊമാനിയൻ',
  },
  'sd.amroti': {
    title: 'താജ് മഹ്മൂദ് അമ്രോട്ടി',
    translator: 'മൗലാനാ താജ് മഹ്മൂദ് അമ്രോട്ടി',
    language: 'സിന്ധി',
  },
  'si.naseemismail': {
    title: 'നസീം ഇസ്മാഈൽ & മസൂർ മൗലാന',
    translator: 'എച്ച്. എം. നസീം ഇസ്മാഈൽ & എം. എം. മസൂർ മൗലാന',
    language: 'സിംഹള',
  },
  'sq.ahmeti': {
    title: 'ഷെരീഫ് അഹ്മതി',
    translator: 'ഷെരീഫ് അഹ്മതി',
    language: 'അൽബേനിയൻ',
  },
  'tg.ayati': {
    title: 'അബ്ദുൽ മുഹമ്മദ് ആയതി',
    translator: 'അബ്ദുൽ മുഹമ്മദ് ആയതി',
    language: 'താജിക്',
  },
  'th.thai': {
    title: 'കിംഗ് ഫഹദ് ഖുർആൻ കോംപ്ലക്സ്',
    translator: 'കിംഗ് ഫഹദ് ഖുർആൻ പ്രിന്റിംഗ് കോംപ്ലക്സ്',
    language: 'തായ്',
  },
  'tt.nugman': {
    title: 'യാക്കൂബ് ഇബ്നു നുഗ്മാൻ',
    translator: 'യാക്കൂബ് ഇബ്നു നുഗ്മാൻ',
    language: 'താതാർ',
  },
  'ug.saleh': {
    title: 'മുഹമ്മദ് സാലിഹ്',
    translator: 'മുഹമ്മദ് സാലിഹ് കാഷ്ഗരി',
    language: 'ഉയ്ഗുർ',
  },
  'zh.jian': {
    title: 'മാ ജിയാൻ',
    translator: 'മുഹമ്മദ് മാ ജിയാൻ',
    language: 'ചൈനീസ്',
  },

  // ── Audio Translations (keyed by reciter identifier) ──
  'en.everyayah-walk': {
    title: 'സ്വഹീഹ് ഇന്റർനാഷണൽ (ഇബ്രാഹിം വോക്ക്)',
    translator: 'ഇബ്രാഹിം വോക്ക്',
    language: 'ഇംഗ്ലീഷ്',
  },
  'ur.everyayah-shamshad': {
    title: 'ഷംഷാദ് അലി ഖാൻ',
    translator: 'ഷംഷാദ് അലി ഖാൻ',
    language: 'ഉർദു',
  },
  'ur.everyayah-farhathashmi': {
    title: 'ഡോ. ഫർഹത്ത് ഹാഷ്മി',
    translator: 'ഡോ. ഫർഹത്ത് ഹാഷ്മി',
    language: 'ഉർദു',
  },
  'zh.chinese': {
    title: 'ചൈനീസ് വിവർത്തനം',
    translator: 'ചൈനീസ് വിവർത്തനം',
    language: 'ചൈനീസ്',
  },
  'fr.leclerc': {
    title: 'യൂസഫ് ലെക്ലർക്ക്',
    translator: 'യൂസഫ് ലെക്ലർക്ക്',
    language: 'ഫ്രഞ്ച്',
  },
  'ru.kuliev-audio': {
    title: 'എൽമിർ കുലിയേവ്',
    translator: 'എൽമിർ കുലിയേവ്',
    language: 'റഷ്യൻ',
  },
  'tr.vakfi-audio': {
    title: 'ദിയാനത്ത് വഖ്ഫ്',
    translator: 'ദിയാനത്ത് വഖ്ഫ്',
    language: 'ടർക്കിഷ്',
  },
  'fa.everyayah-kabiri': {
    title: 'മകാരിം ഷിറാസി (കബീരി)',
    translator: 'മകാരിം ഷിറാസി (കബീരി)',
    language: 'പേർഷ്യൻ',
  },
  'fa.everyayah-hedayatfar': {
    title: 'ഫൗലാദ്വന്ദ് (ഹിദായത്ത്ഫർ)',
    translator: 'ഫൗലാദ്വന്ദ് (ഹിദായത്ത്ഫർ)',
    language: 'പേർഷ്യൻ',
  },
  'az.everyayah-balayev': {
    title: 'റാസിം ബാലയേവ്',
    translator: 'റാസിം ബാലയേവ്',
    language: 'അസർബൈജാനി',
  },
  'kk.khalifahaltai-audio': {
    title: 'ഖലീഫ അൽതായ്',
    translator: 'ഖലീഫ അൽതായ്',
    language: 'കസാഖ്',
  },
  'uz.sodik-audio': {
    title: 'മുഹമ്മദ് സാദിഖ്',
    translator: 'മുഹമ്മദ് സാദിഖ്',
    language: 'ഉസ്ബെക്',
  },
  'bs.everyayah-korkut': {
    title: 'ബെസിം കോർകുട്ട്',
    translator: 'ബെസിം കോർകുട്ട്',
    language: 'ബോസ്നിയൻ',
  },
};

export const EDITION_METADATA_SI: Record<string, { title: string; translator: string; language: string }> = {
  // ── 48 Text Translations (keyed by stable editionIdentifier) ──
  'ar.muyassar': {
    title: 'තෆ්සීර් අල්-මුයස්සර්',
    translator: 'අල්-මුයස්සර්',
    language: 'අරාබි',
  },
  'en.sahih': {
    title: 'සහීහ් ඉන්ටර්නැෂනල්',
    translator: 'සහීහ් ඉන්ටර්නැෂනල්',
    language: 'ඉංග්‍රීසි',
  },
  'ur.jalandhry': {
    title: 'ෆතහ් මුහම්මද් ජලන්ධරි',
    translator: 'මවුලානා ෆතහ් මුහම්මද් ජලන්ධරි',
    language: 'උර්දු',
  },
  'id.indonesian': {
    title: 'ඉන්දුනීසියානු පරිවර්තනය',
    translator: 'ආගමික කටයුතු අමාත්‍යාංශය ඉන්දුනීසියාව',
    language: 'ඉන්දුනීසියානු',
  },
  'tr.diyanet': {
    title: 'දියානත් ඉෂ්ලෙරි',
    translator: 'දියානත් ඉෂ්ලෙරි සභාපතිත්වය',
    language: 'තුර්කි',
  },
  'fr.hamidullah': {
    title: 'මුහම්මද් හමීදුල්ලාහ්',
    translator: 'ආචාර්ය මුහම්මද් හමීදුල්ලාහ්',
    language: 'ප්‍රංශ',
  },
  'de.aburida': {
    title: 'අබූ රිදා',
    translator: 'අබූ රිදා මුහම්මද් ඉබ්න් අහ්මඩ්',
    language: 'ජර්මානු',
  },
  'es.cortes': {
    title: 'ජුලියෝ කෝර්ටස්',
    translator: 'ජුලියෝ කෝර්ටස්',
    language: 'ස්පාඤ්ඤ',
  },
  'ru.kuliev': {
    title: 'එල්මීර් කුලියෙව්',
    translator: 'එල්මීර් කුලියෙව්',
    language: 'රුසියානු',
  },
  'bn.bengali': {
    title: 'මුහියුද්දීන් ඛාන්',
    translator: 'මවුලානා මුහියුද්දීන් ඛාන්',
    language: 'බෙංගාලි',
  },
  'ms.basmeih': {
    title: 'අබ්දුල්ලාහ් මුහම්මද් බස්මෙයිහ්',
    translator: 'අබ්දුල්ලාහ් මුහම්මද් බස්මෙයිහ්',
    language: 'මැලේ',
  },
  'sw.barwani': {
    title: 'අලි මුහ්සින් අල්-බර්වානි',
    translator: 'අලි මුහ්සින් අල්-බර්වානි',
    language: 'ස්වාහිලි',
  },
  'fa.ansarian': {
    title: 'හුසේන් අන්සාරියන්',
    translator: 'හුසේන් අන්සාරියන්',
    language: 'පර්සියානු',
  },
  'so.abduh': {
    title: 'මහ්මූද් මුහම්මද් අබ්දුහ්',
    translator: 'මහ්මූද් මුහම්මද් අබ්දුහ්',
    language: 'සෝමාලි',
  },
  'ta.tamil': {
    title: 'ජාන් ට්‍රස්ට් පදනම',
    translator: 'ජාන් ට්‍රස්ට් පදනම',
    language: 'දෙමළ',
  },
  'hi.hindi': {
    title: 'සුහෙල් ෆාරූක් ඛාන් සහ නද්වී',
    translator: 'සුහෙල් ෆාරූක් ඛාන් සහ මුෆ්ති අසීසුර් රහ්මාන් නද්වී',
    language: 'හින්දි',
  },
  'ha.gumi': {
    title: 'අබුබක්කර් මහ්මූද් ගුමී',
    translator: 'ෂෙයික් අබුබක්කර් මහ්මූද් ගුමී',
    language: 'හවුසා',
  },
  'uz.sodik': {
    title: 'මුහම්මද් සෝදික් මුහම්මද් යූසුෆ්',
    translator: 'ෂෙයික් මුහම්මද් සෝදික් මුහම්මද් යූසුෆ්',
    language: 'උස්බෙක්',
  },
  'sv.bernstrom': {
    title: 'නට් බර්න්ස්ට්‍රෝම්',
    translator: 'නට් බර්න්ස්ට්‍රෝම්',
    language: 'ස්වීඩන්',
  },
  'am.sadiq': {
    title: 'සාදික් සහ සානි හබීබ්',
    translator: 'සාදික් සහ සානි හබීබ්',
    language: 'අම්හාරික්',
  },
  'az.mammadaliyev': {
    title: 'මම්මදලියේව් සහ බුන්යාදොව්',
    translator: 'වාසිෆ් මම්මදලියේව් සහ සියා බුන්යාදොව්',
    language: 'අසර්බයිජානි',
  },
  'ba.mehanovic': {
    title: 'මුහම්මද් මෙහානොවිච්',
    translator: 'මුහම්මද් මෙහානොවිච්',
    language: 'බොස්නියානු',
  },
  'ber.mensur': {
    title: 'අත් මන්සූර්',
    translator: 'රමදාන් අත් මන්සූර්',
    language: 'බර්බර්',
  },
  'bg.theophanov': {
    title: 'ස්වෙතාන් තියෝෆනොව්',
    translator: 'මහාචාර්ය ස්වෙතාන් තියෝෆනොව්',
    language: 'බල්ගේරියානු',
  },
  'bs.mlivo': {
    title: 'මුස්තෆා ම්ලිවෝ',
    translator: 'මුස්තෆා ම්ලිවෝ',
    language: 'බොස්නියානු',
  },
  'ce.magomedov': {
    title: 'මගෝමෙදොව්',
    translator: 'මගෝමෙදොව්',
    language: 'චෙචන්',
  },
  'cs.hrbek': {
    title: 'ඉවාන් හර්බෙක්',
    translator: 'ඉවාන් හර්බෙක්',
    language: 'චෙක්',
  },
  'dv.divehi': {
    title: 'මාලදිවයින් ජනාධිපති කාර්යාලය',
    translator: 'මාලදිවයින් ජනාධිපති කාර්යාලය',
    language: 'දිවෙහි',
  },
  'it.piccardo': {
    title: 'හම්සා රොබර්ටෝ පිකාර්ඩෝ',
    translator: 'හම්සා රොබර්ටෝ පිකාර්ඩෝ',
    language: 'ඉතාලි',
  },
  'ja.japanese': {
    title: 'ර්යොයිචි මිතා',
    translator: 'උමර් ර්යොයිචි මිතා',
    language: 'ජපන්',
  },
  'ko.korean': {
    title: 'කොරියානු මුස්ලිම් සම්මේලනය',
    translator: 'කොරියානු මුස්ලිම් සම්මේලනය',
    language: 'කොරියානු',
  },
  'ku.asan': {
    title: 'බුර්හාන් මුහම්මද්-අමීන්',
    translator: 'බුර්හාන් මුහම්මද්-අමීන්',
    language: 'කුර්දි',
  },
  'ml.abdulhameed': {
    title: 'අබ්දුල් හමීඩ් සහ පරප්පූර්',
    translator: 'චෙරියමුන්ඩම් අබ්දුල් හමීඩ් සහ කුඤ්ඤි මුහම්මද් පරප්පූර්',
    language: 'මලයාලම්',
  },
  'my.ghazi': {
    title: 'ගාසි මුහම්මද් හාෂිම්',
    translator: 'ගාසි මුහම්මද් හාෂිම්',
    language: 'බර්මීස්',
  },
  'nl.keyzer': {
    title: 'සැලමෝ කීසර්',
    translator: 'සැලමෝ කීසර්',
    language: 'ලන්දේසි',
  },
  'no.berg': {
    title: 'අයිනර් බර්ග්',
    translator: 'අයිනර් බර්ග්',
    language: 'නෝර්වීජියානු',
  },
  'pl.bielawskiego': {
    title: 'ජෝසෆ් බියෙලව්ස්කි',
    translator: 'මහාචාර්ය ජෝසෆ් බියෙලව්ස්කි',
    language: 'පෝලන්ත',
  },
  'ps.abdulwali': {
    title: 'අබ්දුල් වලී',
    translator: 'අබ්දුල් වලී ඛාන්',
    language: 'පෂ්තෝ',
  },
  'pt.elhayek': {
    title: 'සමීර් එල්-හයේක්',
    translator: 'සමීර් එල්-හයේක්',
    language: 'පෘතුගීසි',
  },
  'ro.grigore': {
    title: 'ජෝර්ජ් ග්‍රිගෝරේ',
    translator: 'ජෝර්ජ් ග්‍රිගෝරේ',
    language: 'රුමේනියානු',
  },
  'sd.amroti': {
    title: 'තාජ් මහ්මූද් අම්රෝටි',
    translator: 'මවුලානා තාජ් මහ්මූද් අම්රෝටි',
    language: 'සින්ධි',
  },
  'si.naseemismail': {
    title: 'නසීම් ඉස්මායිල් සහ මසූර් මවුලානා',
    translator: 'එච්. එම්. නසීම් ඉස්මායිල් සහ එම්. එම්. මසූර් මවුලානා',
    language: 'සිංහල',
  },
  'sq.ahmeti': {
    title: 'ෂෙරිෆ් අහ්මෙටි',
    translator: 'ෂෙරිෆ් අහ්මෙටි',
    language: 'ඇල්බේනියානු',
  },
  'tg.ayati': {
    title: 'අබ්දුල් මුහම්මද් ආයති',
    translator: 'අබ්දුල් මුහම්මද් ආයති',
    language: 'තාජික්',
  },
  'th.thai': {
    title: 'ෆහද් රජුගේ කුර්ආන් සංකීර්ණය',
    translator: 'ෆහද් රජුගේ කුර්ආන් මුද්‍රණ සංකීර්ණය',
    language: 'තායි',
  },
  'tt.nugman': {
    title: 'යාකුබ් ඉබ්න් නුග්මාන්',
    translator: 'යාකුබ් ඉබ්න් නුග්මාන්',
    language: 'ටාටාර්',
  },
  'ug.saleh': {
    title: 'මුහම්මද් සාලිහ්',
    translator: 'මුහම්මද් සාලිහ් කාෂ්ගරී',
    language: 'උයිගුර්',
  },
  'zh.jian': {
    title: 'මා ජියාන්',
    translator: 'මුහම්මද් මා ජියාන්',
    language: 'චීන',
  },

  // ── Audio Translations (keyed by reciter identifier) ──
  'en.everyayah-walk': {
    title: 'සහීහ් ඉන්ටර්නැෂනල් (ඉබ්‍රාහිම් වෝක්)',
    translator: 'ඉබ්‍රාහිම් වෝක්',
    language: 'ඉංග්‍රීසි',
  },
  'ur.everyayah-shamshad': {
    title: 'ෂම්ෂාඩ් අලි ඛාන්',
    translator: 'ෂම්ෂාඩ් අලි ඛාන්',
    language: 'උර්දු',
  },
  'ur.everyayah-farhathashmi': {
    title: 'ආචාර්ය ෆර්හත් හෂ්මි',
    translator: 'ආචාර්ය ෆර්හත් හෂ්මි',
    language: 'උර්දු',
  },
  'zh.chinese': {
    title: 'චීන පරිවර්තනය',
    translator: 'චීන පරිවර්තනය',
    language: 'චීන',
  },
  'fr.leclerc': {
    title: 'යූසුෆ් ලෙක්ලර්ක්',
    translator: 'යූසුෆ් ලෙක්ලර්ක්',
    language: 'ප්‍රංශ',
  },
  'ru.kuliev-audio': {
    title: 'එල්මීර් කුලියෙව්',
    translator: 'එල්මීර් කුලියෙව්',
    language: 'රුසියානු',
  },
  'tr.vakfi-audio': {
    title: 'දියානත් වක්ෆ්',
    translator: 'දියානත් වක්ෆ්',
    language: 'තුර්කි',
  },
  'fa.everyayah-kabiri': {
    title: 'මකාරිම් ෂිරාසි (කබීරි)',
    translator: 'මකාරිම් ෂිරාසි (කබීරි)',
    language: 'පර්සියානු',
  },
  'fa.everyayah-hedayatfar': {
    title: 'ෆවුලාද්වන්ද් (හෙදායත්ෆර්)',
    translator: 'ෆවුලාද්වන්ද් (හෙදායත්ෆර්)',
    language: 'පර්සියානු',
  },
  'az.everyayah-balayev': {
    title: 'රාසිම් බාලායෙව්',
    translator: 'රාසිම් බාලායෙව්',
    language: 'අසර්බයිජානි',
  },
  'kk.khalifahaltai-audio': {
    title: 'ඛලීෆා අල්තායි',
    translator: 'ඛලීෆා අල්තායි',
    language: 'කසාක්',
  },
  'uz.sodik-audio': {
    title: 'මුහම්මද් සෝදික්',
    translator: 'මුහම්මද් සෝදික්',
    language: 'උස්බෙක්',
  },
  'bs.everyayah-korkut': {
    title: 'බෙසිම් කෝර්කුට්',
    translator: 'බෙසිම් කෝර්කුට්',
    language: 'බොස්නියානු',
  },
};

/**
 * Returns localized translator / author display name for the current language.
 * - Arabic (`ar`): returns localized Arabic translator name if available.
 * - Urdu (`ur`): returns localized Urdu translator name if available in map.
 * - Hindi (`hi`): returns localized Hindi translator name if available in map.
 * - Malayalam (`ml`): returns localized Malayalam translator name if available in map.
 * - Sinhala (`si`): returns localized Sinhala translator name if available in map.
 * - English (`en`): returns fallbackName unchanged.
 * - Remote unknown editions safely fall back to fallbackName or identifier.
 */
export function getLocalizedTranslatorName(identifier: string, fallbackName?: string): string {
  const lang = getCurrentLanguage();
  if (lang === 'ar') {
    const meta = EDITION_METADATA_AR[identifier];
    if (meta?.translator) {
      return meta.translator;
    }
  } else if (lang === 'ur') {
    const meta = EDITION_METADATA_UR[identifier];
    if (meta?.translator) {
      return meta.translator;
    }
  } else if (lang === 'hi') {
    const meta = EDITION_METADATA_HI[identifier];
    if (meta?.translator) {
      return meta.translator;
    }
  } else if (lang === 'ml') {
    const meta = EDITION_METADATA_ML[identifier];
    if (meta?.translator) {
      return meta.translator;
    }
  } else if (lang === 'si') {
    const meta = EDITION_METADATA_SI[identifier];
    if (meta?.translator) {
      return meta.translator;
    }
  }
  return fallbackName || identifier;
}

/**
 * Returns localized translation title for the current language.
 * - Arabic (`ar`): returns localized Arabic translation title if available.
 * - Urdu (`ur`): returns localized Urdu translation title if available.
 * - Hindi (`hi`): returns localized Hindi translation title if available.
 * - Malayalam (`ml`): returns localized Malayalam translation title if available.
 * - Sinhala (`si`): returns localized Sinhala translation title if available.
 * - English (`en`): returns fallbackTitle unchanged.
 */
export function getLocalizedTranslationTitle(identifier: string, fallbackTitle?: string): string {
  const lang = getCurrentLanguage();
  if (lang === 'ar') {
    const meta = EDITION_METADATA_AR[identifier];
    if (meta?.title) {
      return meta.title;
    }
  } else if (lang === 'ur') {
    const meta = EDITION_METADATA_UR[identifier];
    if (meta?.title) {
      return meta.title;
    }
  } else if (lang === 'hi') {
    const meta = EDITION_METADATA_HI[identifier];
    if (meta?.title) {
      return meta.title;
    }
  } else if (lang === 'ml') {
    const meta = EDITION_METADATA_ML[identifier];
    if (meta?.title) {
      return meta.title;
    }
  } else if (lang === 'si') {
    const meta = EDITION_METADATA_SI[identifier];
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

  if (lang === 'ar') {
    const meta = EDITION_METADATA_AR[identifier];
    return {
      title: meta?.title || defName,
      translator: meta?.translator || defName,
      language: meta?.language || (defLang ? (LANGUAGE_NAMES_AR[defLang] || defLang) : ''),
    };
  }

  if (lang === 'ur') {
    const meta = EDITION_METADATA_UR[identifier];
    return {
      title: meta?.title || defName,
      translator: meta?.translator || defName,
      language: meta?.language || (defLang ? (LANGUAGE_NAMES_UR[defLang] || defLang) : ''),
    };
  }

  if (lang === 'hi') {
    const meta = EDITION_METADATA_HI[identifier];
    return {
      title: meta?.title || defName,
      translator: meta?.translator || defName,
      language: meta?.language || (defLang ? (LANGUAGE_NAMES_HI[defLang] || defLang) : ''),
    };
  }

  if (lang === 'ml') {
    const meta = EDITION_METADATA_ML[identifier];
    return {
      title: meta?.title || defName,
      translator: meta?.translator || defName,
      language: meta?.language || (defLang ? (LANGUAGE_NAMES_ML[defLang] || defLang) : ''),
    };
  }

  if (lang === 'si') {
    const meta = EDITION_METADATA_SI[identifier];
    return {
      title: meta?.title || defName,
      translator: meta?.translator || defName,
      language: meta?.language || (defLang ? (LANGUAGE_NAMES_SI[defLang] || defLang) : ''),
    };
  }

  return {
    title: defName,
    translator: defName,
    language: defLang,
  };
}
