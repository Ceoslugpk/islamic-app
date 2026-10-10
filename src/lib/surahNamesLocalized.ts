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

// ── Hindi Surah Names (1-114) ──
export const SURAH_NAMES_HI: readonly string[] = [
  'अल-फ़ातिहा',        /* 1 */
  'अल-बक़रह',         /* 2 */
  'आल-इमरान',       /* 3 */
  'अन-निसा',         /* 4 */
  'अल-माइदा',        /* 5 */
  'अल-अनआम',        /* 6 */
  'अल-अअराफ़',        /* 7 */
  'अल-अनफ़ाल',        /* 8 */
  'अत-तौबा',         /* 9 */
  'यूनुस',          /* 10 */
  'हूद',           /* 11 */
  'यूसुफ़',          /* 12 */
  'अर-रअद',          /* 13 */
  'इब्राहीम',        /* 14 */
  'अल-हिज्र',          /* 15 */
  'अन-नह्ल',          /* 16 */
  'बनी इसराइल',     /* 17 */
  'अल-कहफ़',          /* 18 */
  'मरयम',           /* 19 */
  'ताहा',           /* 20 */
  'अल-अंबिया',        /* 21 */
  'अल-हज्ज',           /* 22 */
  'अल-मोमिनून',       /* 23 */
  'अन-नूर',          /* 24 */
  'अल-फ़ुरक़ान',      /* 25 */
  'अश-शुअरा',        /* 26 */
  'अन-नम्ल',          /* 27 */
  'अल-क़सस',          /* 28 */
  'अल-अनकबूत',       /* 29 */
  'अर-रूम',          /* 30 */
  'लुक़मान',          /* 31 */
  'अस-सजदा',         /* 32 */
  'अल-अहज़ाब',        /* 33 */
  'सबा',            /* 34 */
  'फ़ातिर',           /* 35 */
  'यासीन',          /* 36 */
  'अस-साफ़्फ़ात',       /* 37 */
  'साद',              /* 38 */
  'अज़-ज़ुमर',          /* 39 */
  'अल-मोमिन',         /* 40 */
  'हामीम अस-सजदा',     /* 41 */
  'अश-शूरा',        /* 42 */
  'अज़-ज़ुख़रुफ़',         /* 43 */
  'अद-दुख़ान',         /* 44 */
  'अल-जासिया',        /* 45 */
  'अल-अहक़ाफ़',        /* 46 */
  'मुहम्मद',           /* 47 */
  'अल-फ़तह',          /* 48 */
  'अल-हुजुरात',        /* 49 */
  'क़ाफ़',              /* 50 */
  'अज़-ज़ारियात',       /* 51 */
  'अत-तूर',          /* 52 */
  'अन-नज्म',          /* 53 */
  'अल-क़मर',          /* 54 */
  'अर-रहमान',        /* 55 */
  'अल-वाक़िआ',        /* 56 */
  'अल-हदीद',         /* 57 */
  'अल-मुजादिला',       /* 58 */
  'अल-हश्र',          /* 59 */
  'अल-मुमतहिना',       /* 60 */
  'अस-सफ़',           /* 61 */
  'अल-जुमुआ',         /* 62 */
  'अल-मुनाफ़िक़ून',      /* 63 */
  'अत-तग़ाबुन',        /* 64 */
  'अत-तलाक़',         /* 65 */
  'अत-तहरीम',        /* 66 */
  'अल-मुल्क',          /* 67 */
  'अल-क़लम',          /* 68 */
  'अल-हाक़्क़ा',        /* 69 */
  'अल-मआरिज',        /* 70 */
  'नूह',            /* 71 */
  'अल-जिन्न',           /* 72 */
  'अल-मुज़्ज़म्मिल',         /* 73 */
  'अल-मुद्दस्सिर',         /* 74 */
  'अल-क़ियामा',        /* 75 */
  'अल-इंसान',          /* 76 */
  'अल-मुरसलात',       /* 77 */
  'अन-नबा',          /* 78 */
  'अन-नाज़िआत',       /* 79 */
  'अबस',            /* 80 */
  'अत-तकवीर',        /* 81 */
  'अल-इन्फ़ितार',       /* 82 */
  'अल-मुतफ़्फ़िफ़ीन',      /* 83 */
  'अल-इन्शिक़ाक़',       /* 84 */
  'अल-बुरूज',         /* 85 */
  'अत-तारिक़',         /* 86 */
  'अल-आला',          /* 87 */
  'अल-ग़ाशिया',        /* 88 */
  'अल-फ़ज्र',          /* 89 */
  'अल-बलद',          /* 90 */
  'अश-शम्स',          /* 91 */
  'अल-लैल',          /* 92 */
  'अद-दुहा',         /* 93 */
  'अल-इन्शिराह',       /* 94 */
  'अत-तीन',          /* 95 */
  'अल-अलक़',          /* 96 */
  'अल-क़द्र',          /* 97 */
  'अल-बय्यिना',        /* 98 */
  'अज़-ज़लज़ला',        /* 99 */
  'अल-आदियात',       /* 100 */
  'अल-क़ारिआ',        /* 101 */
  'अत-तकासुर',        /* 102 */
  'अल-असर',          /* 103 */
  'अल-हुमज़ा',         /* 104 */
  'अल-फ़ील',          /* 105 */
  'क़ुरैश',           /* 106 */
  'अल-माऊन',        /* 107 */
  'अल-कौसर',         /* 108 */
  'अल-काफ़िरून',       /* 109 */
  'अन-नस्र',          /* 110 */
  'अल-लहब',          /* 111 */
  'अल-इख़्लास',        /* 112 */
  'अल-फ़लक़',          /* 113 */
  'अन-नास',          /* 114 */
] as const;

/**
 * Returns the localized surah name for the current app language.
 * - `ur` → Urdu script name from SURAH_NAMES_UR
 * - `hi` → Hindi Devanagari script name from SURAH_NAMES_HI
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
  if (lang === 'hi') {
    const idx = surahNumber - 1;
    if (idx >= 0 && idx < SURAH_NAMES_HI.length) {
      return SURAH_NAMES_HI[idx];
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

export const LANGUAGE_NAMES_HI: Record<string, string> = {
  Arabic: 'अरबी',
  English: 'अंग्रेज़ी',
  Urdu: 'उर्दू',
  Indonesian: 'इंडोनेशियाई',
  Turkish: 'तुर्की',
  French: 'फ़्रांसीसी',
  German: 'जर्मन',
  Spanish: 'स्पैनिश',
  Russian: 'रूसी',
  Bengali: 'बंगाली',
  Malay: 'मलय',
  Swahili: 'स्वाहिली',
  Persian: 'फ़ारसी',
  Somali: 'सोमाली',
  Tamil: 'तमिल',
  Hindi: 'हिन्दी',
  Hausa: 'हौसा',
  Uzbek: 'उज़्बेक',
  Swedish: 'स्वीडिश',
  Amharic: 'अम्हारिक',
  Azerbaijani: 'अज़रबैजानी',
  'Bosnian (Mehanović)': 'बोस्नियाई',
  Berber: 'बर्बर',
  Bulgarian: 'बुल्गारियाई',
  'Bosnian (Mlivo)': 'बोस्नियाई',
  Chechen: 'चेचन',
  Czech: 'चेक',
  Dhivehi: 'धिवेही',
  Italian: 'इतालवी',
  Japanese: 'जापानी',
  Korean: 'कोरियाई',
  Kurdish: 'कुर्दिश',
  Malayalam: 'मलयालम',
  Burmese: 'बर्मी',
  Dutch: 'डच',
  Norwegian: 'नॉर्वेजियाई',
  Polish: 'पोलिश',
  Pashto: 'पश्तो',
  Portuguese: 'पुर्तगाली',
  Romanian: 'रोमानियाई',
  Sindhi: 'सिंधी',
  Sinhala: 'सिंहली',
  Albanian: 'अल्बानियाई',
  Tajik: 'ताजिक',
  Thai: 'थाई',
  Tatar: 'तातार',
  Uyghur: 'उइघुर',
  Chinese: 'चीनी',
  Kazakh: 'कज़ाख़',
  Bosnian: 'बोस्नियाई',
};

/**
 * Returns the localized display name for a language.
 * - Arabic UI (`ar`): returns the Arabic name
 * - Urdu UI (`ur`): returns the Urdu name
 * - Hindi UI (`hi`): returns the Hindi name
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
  if (lang === 'hi' && LANGUAGE_NAMES_HI[englishName]) {
    return LANGUAGE_NAMES_HI[englishName];
  }
  return englishName;
}

/**
 * Shared search normalizer for Arabic, Urdu, Hindi, and English Surah/Islamic search.
 * - Unicode NFKD normalization
 * - Lowercases Latin characters
 * - Strips all Arabic/Urdu diacritics, harakat, tashkeel, dagger alif (\u0670), tatweel (\u0640),
 *   and Quranic annotation marks.
 * - Strips Devanagari nukta (\u093C) for flexible Hindi search.
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
    // Strip Devanagari nukta
    .replace(/\u093C/g, '')
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
