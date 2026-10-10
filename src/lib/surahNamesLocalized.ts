/**
 * Localized Surah names and Islamic metadata display names.
 *
 * Surah names in Urdu use the standard Urdu transliterations widely used
 * in Pakistani Quran publications (e.g. Jalandhry, Mufti Taqi Usmani).
 * These are NOT translations of meanings — they are the proper Urdu script
 * representations of the Arabic surah names.
 *
 * For proper nouns (reciter names, scholar names) we keep the original name
 * since translating proper nouns is inappropriate. Language names get Urdu
 * equivalents for UI display.
 */
import { getCurrentLanguage } from './i18n';

// ── Urdu Surah Names (1-114) ──
// Standard Urdu transliterations matching published Pakistani Quran editions.
export const SURAH_NAMES_UR: readonly string[] = [
  'الفاتحہ',        // 1
  'البقرہ',         // 2
  'آل عمران',       // 3
  'النساء',         // 4
  'المائدہ',        // 5
  'الانعام',        // 6
  'الاعراف',        // 7
  'الانفال',        // 8
  'التوبہ',         // 9
  'یونس',          // 10
  'ہود',           // 11
  'یوسف',          // 12
  'الرعد',          // 13
  'ابراہیم',        // 14
  'الحجر',          // 15
  'النحل',          // 16
  'بنی اسرائیل',     // 17
  'الکہف',          // 18
  'مریم',           // 19
  'طٰہٰ',           // 20
  'الانبیاء',        // 21
  'الحج',           // 22
  'المؤمنون',       // 23
  'النور',          // 24
  'الفرقان',        // 25
  'الشعراء',        // 26
  'النمل',          // 27
  'القصص',          // 28
  'العنکبوت',       // 29
  'الروم',          // 30
  'لقمان',          // 31
  'السجدہ',         // 32
  'الاحزاب',        // 33
  'سبا',            // 34
  'فاطر',           // 35
  'یٰسین',          // 36
  'الصّٰفّٰت',       // 37
  'ص',              // 38
  'الزمر',          // 39
  'المؤمن',         // 40
  'حٰم السجدہ',     // 41
  'الشوریٰ',        // 42
  'الزخرف',         // 43
  'الدخان',         // 44
  'الجاثیہ',        // 45
  'الاحقاف',        // 46
  'محمد',           // 47
  'الفتح',          // 48
  'الحجرات',        // 49
  'ق',              // 50
  'الذاریات',       // 51
  'الطور',          // 52
  'النجم',          // 53
  'القمر',          // 54
  'الرحمٰن',        // 55
  'الواقعہ',        // 56
  'الحدید',         // 57
  'المجادلہ',       // 58
  'الحشر',          // 59
  'الممتحنہ',       // 60
  'الصف',           // 61
  'الجمعہ',         // 62
  'المنافقون',      // 63
  'التغابن',        // 64
  'الطلاق',         // 65
  'التحریم',        // 66
  'الملک',          // 67
  'القلم',          // 68
  'الحاقّہ',        // 69
  'المعارج',        // 70
  'نوح',            // 71
  'الجن',           // 72
  'المزمل',         // 73
  'المدثر',         // 74
  'القیامہ',        // 75
  'الدھر',          // 76
  'المرسلات',       // 77
  'النبا',          // 78
  'النازعات',       // 79
  'عبس',            // 80
  'التکویر',        // 81
  'الانفطار',       // 82
  'المطفّفین',      // 83
  'الانشقاق',       // 84
  'البروج',         // 85
  'الطارق',         // 86
  'الاعلیٰ',        // 87
  'الغاشیہ',        // 88
  'الفجر',          // 89
  'البلد',          // 90
  'الشمس',          // 91
  'اللیل',          // 92
  'الضحیٰ',         // 93
  'الانشراح',       // 94
  'التین',          // 95
  'العلق',          // 96
  'القدر',          // 97
  'البیّنہ',        // 98
  'الزلزال',        // 99
  'العادیات',       // 100
  'القارعہ',        // 101
  'التکاثر',        // 102
  'العصر',          // 103
  'الہمزہ',         // 104
  'الفیل',          // 105
  'قریش',           // 106
  'الماعون',        // 107
  'الکوثر',         // 108
  'الکافرون',       // 109
  'النصر',          // 110
  'اللہب',          // 111
  'الاخلاص',        // 112
  'الفلق',          // 113
  'الناس',          // 114
] as const;

/**
 * Returns the localized surah name for the current app language.
 * - `ur` → Urdu script name from SURAH_NAMES_UR
 * - `en` → English transliteration (e.g. "Al-Fatihah")
 *
 * @param surahNumber 1-based surah number (1–114)
 * @param englishFallback English name to use when lang is `en` (from data)
 */
export function getLocalizedSurahName(
  surahNumber: number,
  englishFallback: string
): string {
  const lang = getCurrentLanguage();
  if (lang === 'ur') {
    const idx = surahNumber - 1;
    if (idx >= 0 && idx < SURAH_NAMES_UR.length) {
      return SURAH_NAMES_UR[idx];
    }
  }
  return englishFallback;
}

// ── Localized language display names (for quranLanguages UI) ──
export const LANGUAGE_NAMES_UR: Record<string, string> = {
  Arabic: 'عربی',
  English: 'انگریزی',
  Urdu: 'اردو',
  Indonesian: 'انڈونیشیائی',
  Turkish: 'ترکی',
  French: 'فرانسیسی',
  German: 'جرمن',
  Spanish: 'ہسپانوی',
  Russian: 'روسی',
  Bengali: 'بنگالی',
  Malay: 'ملائی',
  Swahili: 'سواحلی',
  Persian: 'فارسی',
  Somali: 'صومالی',
  Tamil: 'تامل',
  Hindi: 'ہندی',
  Hausa: 'ہاؤسا',
  Uzbek: 'ازبک',
  Swedish: 'سویڈش',
  Amharic: 'امہری',
  Azerbaijani: 'آذربائیجانی',
  'Bosnian (Mehanović)': 'بوسنیائی',
  Berber: 'بربر',
  Bulgarian: 'بلغاریائی',
  'Bosnian (Mlivo)': 'بوسنیائی',
  Chechen: 'چیچن',
  Czech: 'چیک',
  Dhivehi: 'ديويہی',
  Italian: 'اطالوی',
  Japanese: 'جاپانی',
  Korean: 'کوریائی',
  Kurdish: 'کردی',
  Malayalam: 'ملیالم',
  Burmese: 'برمی',
  Dutch: 'ڈچ',
  Norwegian: 'ناروے',
  Polish: 'پولش',
  Pashto: 'پشتو',
  Portuguese: 'پرتگالی',
  Romanian: 'رومانیائی',
  Sindhi: 'سندھی',
  Sinhala: 'سنہالا',
  Albanian: 'البانوی',
  Tajik: 'تاجک',
  Thai: 'تھائی',
  Tatar: 'تاتاری',
  Uyghur: 'ایغور',
  Chinese: 'چینی',
};

export const LANGUAGE_NAMES_AR: Record<string, string> = {
  Arabic: 'العربية',
  English: 'الإنجليزية',
  Urdu: 'الأردية',
  Indonesian: 'الإندونيسية',
  Turkish: 'التركية',
  French: 'الفرنسية',
  German: 'الألمانية',
  Spanish: 'الإسبانية',
  Russian: 'الروسية',
  Bengali: 'البنغالية',
  Malay: 'الملايو',
  Swahili: 'السواحيلية',
  Persian: 'الفارسية',
  Somali: 'الصومالية',
  Tamil: 'التاميلية',
  Hindi: 'الهندية',
  Hausa: 'الهوسا',
  Uzbek: 'الأوزبكية',
  Swedish: 'السويدية',
  Amharic: 'الأمهرية',
  Azerbaijani: 'الأذربيجانية',
  'Bosnian (Mehanović)': 'البوسنية',
  Berber: 'الأمازيغية',
  Bulgarian: 'البلغارية',
  'Bosnian (Mlivo)': 'البوسنية',
  Chechen: 'الشيشانية',
  Czech: 'التشيكية',
  Dhivehi: 'الديفيهية',
  Italian: 'الإيطالية',
  Japanese: 'اليابانية',
  Korean: 'الكورية',
  Kurdish: 'الكردية',
  Malayalam: 'الماليالامية',
  Burmese: 'البورمية',
  Dutch: 'الهولندية',
  Norwegian: 'النرويجية',
  Polish: 'البولندية',
  Pashto: 'البشتوية',
  Portuguese: 'البرتغالية',
  Romanian: 'الرومانية',
  Sindhi: 'السندية',
  Sinhala: 'السنهالية',
  Albanian: 'الألبانية',
  Tajik: 'الطاجيكية',
  Thai: 'التايلاندية',
  Tatar: 'التتارية',
  Uyghur: 'الأويغورية',
  Chinese: 'الصينية',
  Kazakh: 'القازاقية',
  Bosnian: 'البوسنية',
};

/**
 * Returns the localized display name for a language.
 * - Arabic UI (`ar`): returns the Arabic name
 * - Urdu UI (`ur`): returns the Urdu name
 * - English / other UI: returns the English name
 */
export function getLocalizedLanguageName(englishName: string): string {
  const lang = getCurrentLanguage();
  if (lang === 'ar' && LANGUAGE_NAMES_AR[englishName]) {
    return LANGUAGE_NAMES_AR[englishName];
  }
  if (lang === 'ur' && LANGUAGE_NAMES_UR[englishName]) {
    return LANGUAGE_NAMES_UR[englishName];
  }
  return englishName;
}

/**
 * Shared search normalizer for Arabic, Urdu, and English Surah/Islamic search.
 * - Unicode NFKD normalization
 * - Lowercases Latin characters
 * - Strips all Arabic/Urdu diacritics, harakat, tashkeel, dagger alif (\u0670), tatweel (\u0640),
 *   and Quranic annotation marks.
 * - Normalizes letter variants:
 *   - Alif variants [آأإٱ] -> ا
 *   - Teh Marbuta and Heh variants [ةهھہۃ] -> ہ
 *   - Yeh variants [يىی] -> ی
 *   - Kaf variants [ك] -> ک
 *   - Waw variants [ؤ] -> و
 *   - Hamza on yeh [ئ] -> ی
 * - Trims and collapses whitespace.
 */
export function normalizeSearchText(text: string): string {
  if (!text) return '';
  return text
    .normalize('NFKD')
    .toLowerCase()
    // Strip Arabic & Urdu diacritics, harakat, dagger alif, tatweel, Quranic marks
    .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g, '')
    // Normalize Alif forms
    .replace(/[آأإٱ]/g, 'ا')
    // Normalize Teh Marbuta and Heh forms to standard Urdu Choti Heh
    .replace(/[ةهھہۃ]/g, 'ہ')
    // Normalize Arabic Yeh and Alif Maqsura to Urdu Choti Yeh
    .replace(/[يىی]/g, 'ی')
    // Normalize Arabic Kaf to Urdu Keheh
    .replace(/[ك]/g, 'ک')
    // Normalize Waw with Hamza
    .replace(/[ؤ]/g, 'و')
    // Normalize Yeh with Hamza
    .replace(/[ئ]/g, 'ی')
    // Collapse whitespace
    .replace(/\s+/g, ' ')
    .trim();
}
