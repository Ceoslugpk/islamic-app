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

// ── Malayalam Surah Names (1-114) ──
export const SURAH_NAMES_ML: readonly string[] = [
  'അൽ ഫാത്തിഹ',        /* 1 */
  'അൽ ബഖറ',         /* 2 */
  'ആലു ഇംറാൻ',       /* 3 */
  'അന്നിസാഅ്',         /* 4 */
  'അൽ മാഇദ',        /* 5 */
  'അൽ അൻആം',        /* 6 */
  'അൽ അഅ്റാഫ്',        /* 7 */
  'അൽ അൻഫാൽ',        /* 8 */
  'അത്തൗബ',         /* 9 */
  'യൂനുസ്',          /* 10 */
  'ഹൂദ്',           /* 11 */
  'യൂസുഫ്',          /* 12 */
  'അർറഅ്ദ്',          /* 13 */
  'ഇബ്രാഹീം',        /* 14 */
  'അൽ ഹിജ്ർ',          /* 15 */
  'അന്നഹ്ൽ',          /* 16 */
  'അൽ ഇസ്റാഅ്',     /* 17 */
  'അൽ കഹ്ഫ്',          /* 18 */
  'മർയം',           /* 19 */
  'ത്വാഹാ',           /* 20 */
  'അൽ അൻബിയാഅ്',        /* 21 */
  'അൽ ഹജ്ജ്',           /* 22 */
  'അൽ മുഅ്മിനൂൻ',       /* 23 */
  'അന്നൂർ',          /* 24 */
  'അൽ ഫുർഖാൻ',      /* 25 */
  'അശ്ശുഅറാഅ്',        /* 26 */
  'അന്നംല്',          /* 27 */
  'അൽ ഖസ്വസ്വ്',          /* 28 */
  'അൽ അൻകബൂത്ത്',       /* 29 */
  'അറൂം',          /* 30 */
  'ലുഖ്മാൻ',          /* 31 */
  'അസ്സജ്ദ',         /* 32 */
  'അൽ അഹ്സാബ്',        /* 33 */
  'സബഅ്',            /* 34 */
  'ഫാത്വിർ',           /* 35 */
  'യാസീൻ',          /* 36 */
  'അസ്സ്വാഫാത്ത്',       /* 37 */
  'സ്വാദ്',              /* 38 */
  'അസ്സുമർ',          /* 39 */
  'ഗാഫിർ',         /* 40 */
  'ഫുസ്സിലത്ത്',     /* 41 */
  'അശ്ശൂറാ',        /* 42 */
  'അസ്സുഖ്റുഫ്',         /* 43 */
  'അദ്ദുഖാൻ',         /* 44 */
  'അൽ ജാഥിയ',        /* 45 */
  'അൽ അഹ്ഖാഫ്',        /* 46 */
  'മുഹമ്മദ്',           /* 47 */
  'അൽ ഫത്ഹ്',          /* 48 */
  'അൽ ഹുജുറാത്ത്',        /* 49 */
  'ഖാഫ്',              /* 50 */
  'അദ്ദാരിയാത്ത്',       /* 51 */
  'അത്ത്വൂർ',          /* 52 */
  'അന്നജ്മ്',          /* 53 */
  'അൽ ഖമർ',          /* 54 */
  'അർറഹ്മാൻ',        /* 55 */
  'അൽ വാഖിഅ',        /* 56 */
  'അൽ ഹദീദ്',         /* 57 */
  'അൽ മുജാദില',       /* 58 */
  'അൽ ഹശ്ർ',          /* 59 */
  'അൽ മുംതഹന',       /* 60 */
  'അസ്സ്വഫ്ഫ്',           /* 61 */
  'അൽ ജുമുഅ',         /* 62 */
  'അൽ മുനാഫിഖൂൻ',      /* 63 */
  'അത്തഗാബുൻ',        /* 64 */
  'അത്ത്വലാഖ്',         /* 65 */
  'അത്തഹ്രീം',        /* 66 */
  'അൽ മുൽക്',          /* 67 */
  'അൽ ഖലം',          /* 68 */
  'അൽ ഹാഖ്ഖ',        /* 69 */
  'അൽ മആരിജ്',        /* 70 */
  'നൂഹ്',            /* 71 */
  'അൽ ജിന്ന്',           /* 72 */
  'അൽ മുസ്സമ്മിൽ',         /* 73 */
  'അൽ മുദ്ദഥ്ഥിർ',         /* 74 */
  'അൽ ഖിയാമ',        /* 75 */
  'അൽ ഇൻസാൻ',          /* 76 */
  'അൽ മുർസലാത്ത്',       /* 77 */
  'അന്നബഅ്',          /* 78 */
  'അന്നാസിആത്ത്',       /* 79 */
  'അബസ',            /* 80 */
  'അത്തക്വീർ',        /* 81 */
  'അൽ ഇൻഫിത്വാർ',       /* 82 */
  'അൽ മുത്വഫ്ഫിഫീൻ',      /* 83 */
  'അൽ ഇൻശിഖാഖ്',       /* 84 */
  'അൽ ബുറൂജ്',         /* 85 */
  'അത്ത്വാരിഖ്',         /* 86 */
  'അൽ അഅ്ലാ',          /* 87 */
  'അൽ ഗാശിയ',        /* 88 */
  'അൽ ഫജ്ർ',          /* 89 */
  'അൽ ബലദ്',          /* 90 */
  'അശ്ശംസ്',          /* 91 */
  'അൽ ലൈൽ',          /* 92 */
  'അള്ളുഹാ',         /* 93 */
  'അശ്ശർഹ്',       /* 94 */
  'അത്തീൻ',          /* 95 */
  'അൽ അലഖ്',          /* 96 */
  'അൽ ഖദ്ർ',          /* 97 */
  'അൽ ബയ്യിന',        /* 98 */
  'അസ്സൽസല',        /* 99 */
  'അൽ ആദിയാത്ത്',       /* 100 */
  'അൽ ഖാരിഅ',        /* 101 */
  'അത്തകാഥുർ',        /* 102 */
  'അൽ അസ്വർ',          /* 103 */
  'അൽ ഹുമസ',         /* 104 */
  'അൽ ഫീൽ',          /* 105 */
  'ഖുറൈശ്',           /* 106 */
  'അൽ മാഊൻ',        /* 107 */
  'അൽ കൗഥർ',         /* 108 */
  'അൽ കാഫിറൂൻ',       /* 109 */
  'അന്നസ്വർ',          /* 110 */
  'അൽ മസദ്',          /* 111 */
  'അൽ ഇഖ്ലാസ്വ്',        /* 112 */
  'അൽ ഫലഖ്',          /* 113 */
  'അന്നാസ്',          /* 114 */
] as const;

// ── Sinhala Surah Names (1-114) ──
export const SURAH_NAMES_SI: readonly string[] = [
  'අල්-ෆාතිහා',        /* 1 */
  'අල්-බකරා',         /* 2 */
  'ආලි ඉම්රාන්',       /* 3 */
  'අන්-නිසා',         /* 4 */
  'අල්-මාඉදා',        /* 5 */
  'අල්-අන්ආම්',        /* 6 */
  'අල්-අඃරාෆ්',        /* 7 */
  'අල්-අන්ෆාල්',        /* 8 */
  'අත්-තව්බා',         /* 9 */
  'යූනුස්',          /* 10 */
  'හූද්',           /* 11 */
  'යූසුෆ්',          /* 12 */
  'අර්-රඃද්',          /* 13 */
  'ඉබ්‍රාහීම්',        /* 14 */
  'අල්-හිජ්ර්',          /* 15 */
  'අන්-නහ්ල්',          /* 16 */
  'අල්-ඉස්රා',         /* 17 */
  'අල්-කහ්ෆ්',          /* 18 */
  'මර්යම්',           /* 19 */
  'තාහා',           /* 20 */
  'අල්-අන්බියා',        /* 21 */
  'අල්-හජ්',           /* 22 */
  'අල්-මුඃමිනූන්',       /* 23 */
  'අන්-නූර්',          /* 24 */
  'අල්-ෆුර්කාන්',      /* 25 */
  'අෂ්-ෂුඅරා',        /* 26 */
  'අන්-නම්ල්',          /* 27 */
  'අල්-කසස්',          /* 28 */
  'අල්-අන්කබූත්',       /* 29 */
  'අර්-රූම්',          /* 30 */
  'ලුක්මාන්',          /* 31 */
  'අස්-සජ්දා',         /* 32 */
  'අල්-අහ්සාබ්',        /* 33 */
  'සබා',            /* 34 */
  'ෆාතිර්',           /* 35 */
  'යාසීන්',          /* 36 */
  'අස්-සාෆ්ෆාත්',       /* 37 */
  'සාද්',              /* 38 */
  'අස්-සුමර්',          /* 39 */
  'ගාෆිර්',         /* 40 */
  'ෆුස්සිලත්',     /* 41 */
  'අෂ්-ෂූරා',        /* 42 */
  'අස්-සුඛ්රුෆ්',         /* 43 */
  'අද්-දුඛාන්',         /* 44 */
  'අල්-ජාසියා',        /* 45 */
  'අල්-අහ්කාෆ්',        /* 46 */
  'මුහම්මද්',           /* 47 */
  'අල්-ෆත්හ්',          /* 48 */
  'අල්-හුජුරාත්',        /* 49 */
  'කාෆ්',              /* 50 */
  'අද්-දාරියාත්',       /* 51 */
  'අත්-තූර්',          /* 52 */
  'අන්-නජ්ම්',          /* 53 */
  'අල්-කමර්',          /* 54 */
  'අර්-රහ්මාන්',        /* 55 */
  'අල්-වාකියා',        /* 56 */
  'අල්-හදීද්',         /* 57 */
  'අල්-මුජාදිලා',       /* 58 */
  'අල්-හෂ්ර්',          /* 59 */
  'අල්-මුම්තහිනා',       /* 60 */
  'අස්-සෆ්',           /* 61 */
  'අල්-ජුමුආ',         /* 62 */
  'අල්-මුනාෆිකූන්',      /* 63 */
  'අත්-තගාබුන්',        /* 64 */
  'අත්-තලාක්',         /* 65 */
  'අත්-තහ්රීම්',        /* 66 */
  'අල්-මුල්ක්',          /* 67 */
  'අල්-කලම්',          /* 68 */
  'අල්-හාක්කා',        /* 69 */
  'අල්-මආරිජ්',        /* 70 */
  'නූහ්',            /* 71 */
  'අල්-ජින්',           /* 72 */
  'අල්-මුස්සම්මිල්',         /* 73 */
  'අල්-මුද්දස්සිර්',         /* 74 */
  'අල්-කියාමා',        /* 75 */
  'අල්-ඉන්සාන්',          /* 76 */
  'අල්-මුර්සලාත්',       /* 77 */
  'අන්-නබා',          /* 78 */
  'අන්-නාසිආත්',       /* 79 */
  'අබස',            /* 80 */
  'අත්-තක්වීර්',        /* 81 */
  'අල්-ඉන්ෆිතාර්',       /* 82 */
  'අල්-මුතෆ්ෆිෆීන්',      /* 83 */
  'අල්-ඉන්ෂිකාක්',       /* 84 */
  'අල්-බුරූජ්',         /* 85 */
  'අත්-තාරික්',         /* 86 */
  'අල්-අඃලා',          /* 87 */
  'අල්-ගාෂියා',        /* 88 */
  'අල්-ෆජ්ර්',          /* 89 */
  'අල්-බලද්',          /* 90 */
  'අෂ්-ෂම්ස්',          /* 91 */
  'අල්-ලයිල්',          /* 92 */
  'අද්-දුහා',         /* 93 */
  'අෂ්-ෂර්හ්',       /* 94 */
  'අත්-තීන්',          /* 95 */
  'අල්-අලක්',          /* 96 */
  'අල්-කද්ර්',          /* 97 */
  'අල්-බය්යිනා',        /* 98 */
  'අස්-සල්සලා',        /* 99 */
  'අල්-ආදියාත්',       /* 100 */
  'අල්-කාරිආ',        /* 101 */
  'අත්-තකාසුර්',        /* 102 */
  'අල්-අස්ර්',          /* 103 */
  'අල්-හුමසා',         /* 104 */
  'අල්-ෆීൽ',          /* 105 */
  'කුරෙයිෂ්',           /* 106 */
  'අල්-මාඌන්',        /* 107 */
  'අල්-කව්සර්',         /* 108 */
  'අල්-කාෆිරූන්',       /* 109 */
  'අන්-නස්ර්',          /* 110 */
  'අල්-මසද්',          /* 111 */
  'අල්-ඉක්ලාස්',        /* 112 */
  'අල්-ෆලක්',          /* 113 */
  'අන්-නාස්',          /* 114 */
] as const;

/**
 * Returns the localized surah name for the current app language.
 * - `ur` → Urdu script name from SURAH_NAMES_UR
 * - `hi` → Hindi Devanagari script name from SURAH_NAMES_HI
 * - `ml` → Malayalam script name from SURAH_NAMES_ML
 * - `si` → Sinhala script name from SURAH_NAMES_SI
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
  if (lang === 'ml') {
    const idx = surahNumber - 1;
    if (idx >= 0 && idx < SURAH_NAMES_ML.length) {
      return SURAH_NAMES_ML[idx];
    }
  }
  if (lang === 'si') {
    const idx = surahNumber - 1;
    if (idx >= 0 && idx < SURAH_NAMES_SI.length) {
      return SURAH_NAMES_SI[idx];
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

export const LANGUAGE_NAMES_ML: Record<string, string> = {
  Arabic: 'അറബിക്',
  English: 'ഇംഗ്ലീഷ്',
  Urdu: 'ഉർദു',
  Indonesian: 'ഇന്തോനേഷ്യൻ',
  Turkish: 'ടർക്കിഷ്',
  French: 'ഫ്രഞ്ച്',
  German: 'ജർമ്മൻ',
  Spanish: 'സ്പാനിഷ്',
  Russian: 'റഷ്യൻ',
  Bengali: 'ബംഗാളി',
  Malay: 'മലായ്',
  Swahili: 'സ്വഹിലി',
  Persian: 'പേർഷ്യൻ',
  Somali: 'സൊമാലി',
  Tamil: 'തമിഴ്',
  Hindi: 'ഹിന്ദി',
  Hausa: 'ഹൗസ',
  Uzbek: 'ഉസ്ബെക്',
  Swedish: 'സ്വീഡിഷ്',
  Amharic: 'അംഹാറിക്',
  Azerbaijani: 'അസർബൈജാനി',
  'Bosnian (Mehanović)': 'ബോസ്നിയൻ',
  Berber: 'ബെർബർ',
  Bulgarian: 'ബൾഗേറിയൻ',
  'Bosnian (Mlivo)': 'ബോസ്നിയൻ',
  Chechen: 'ചെച്ചൻ',
  Czech: 'ചെക്ക്',
  Dhivehi: 'ദിവെഹി',
  Italian: 'ഇറ്റാലിയൻ',
  Japanese: 'ജാപ്പനീസ്',
  Korean: 'കൊറിയൻ',
  Kurdish: 'കുർദിഷ്',
  Malayalam: 'മലയാളം',
  Burmese: 'ബർമീസ്',
  Dutch: 'ഡച്ച്',
  Norwegian: 'നോർവീജിയൻ',
  Polish: 'പോളിഷ്',
  Pashto: 'പഷ്തോ',
  Portuguese: 'പോർച്ചുഗീസ്',
  Romanian: 'റൊമാനിയൻ',
  Sindhi: 'സിന്ധി',
  Sinhala: 'സിംഹള',
  Albanian: 'അൽബേനിയൻ',
  Tajik: 'താജിക്',
  Thai: 'തായ്',
  Tatar: 'താതാർ',
  Uyghur: 'ഉയ്ഗുർ',
  Chinese: 'ചൈനീസ്',
  Kazakh: 'കസാഖ്',
  Bosnian: 'ബോസ്നിയൻ',
};

export const LANGUAGE_NAMES_SI: Record<string, string> = {
  Arabic: 'අරාබි',
  English: 'ඉංග්‍රීසි',
  Urdu: 'උර්දු',
  Indonesian: 'ඉන්දුනීසියානු',
  Turkish: 'තුර්කි',
  French: 'ප්‍රංශ',
  German: 'ජර්මානු',
  Spanish: 'ස්පාඤ්ඤ',
  Russian: 'රුසියානු',
  Bengali: 'බෙංගාලි',
  Malay: 'මැලේ',
  Swahili: 'ස්වාහිලි',
  Persian: 'පර්සියානු',
  Somali: 'සෝමාලි',
  Tamil: 'දෙමළ',
  Hindi: 'හින්දි',
  Hausa: 'හවුසා',
  Uzbek: 'උස්බෙක්',
  Swedish: 'ස්වීඩන්',
  Amharic: 'අම්හාරික්',
  Azerbaijani: 'අසර්බයිජානි',
  'Bosnian (Mehanović)': 'බොස්නියානු',
  Berber: 'බර්බර්',
  Bulgarian: 'බල්ගේරියානු',
  'Bosnian (Mlivo)': 'බොස්නියානු',
  Chechen: 'චෙචන්',
  Czech: 'චෙක්',
  Dhivehi: 'දිවෙහි',
  Italian: 'ඉතාලි',
  Japanese: 'ජපන්',
  Korean: 'කොරියානු',
  Kurdish: 'කුර්දි',
  Malayalam: 'මලයාලම්',
  Burmese: 'බර්මීස්',
  Dutch: 'ලන්දේසි',
  Norwegian: 'නෝර්වීජියානු',
  Polish: 'පෝලන්ත',
  Pashto: 'පෂ්තෝ',
  Portuguese: 'පෘතුගීසි',
  Romanian: 'රුමේනියානු',
  Sindhi: 'සින්ධි',
  Sinhala: 'සිංහල',
  Albanian: 'ඇල්බේනියානු',
  Tajik: 'තාජික්',
  Thai: 'තායි',
  Tatar: 'ටාටාර්',
  Uyghur: 'උයිගුර්',
  Chinese: 'චීන',
  Kazakh: 'කසාක්',
  Bosnian: 'බොස්නියානු',
};

/**
 * Returns the localized display name for a language.
 * - Arabic UI (`ar`): returns the Arabic name
 * - Urdu UI (`ur`): returns the Urdu name
 * - Hindi UI (`hi`): returns the Hindi name
 * - Malayalam UI (`ml`): returns the Malayalam name
 * - Sinhala UI (`si`): returns the Sinhala name
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
  if (lang === 'ml' && LANGUAGE_NAMES_ML[englishName]) {
    return LANGUAGE_NAMES_ML[englishName];
  }
  if (lang === 'si' && LANGUAGE_NAMES_SI[englishName]) {
    return LANGUAGE_NAMES_SI[englishName];
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
