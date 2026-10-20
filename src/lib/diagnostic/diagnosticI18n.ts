import i18n, { t, getCurrentLanguage, isRtlLanguage } from '../i18n';

/**
 * Diagnostic-specific technical localization dictionary.
 * Provides authentic translations for technical diagnostic terms across supported languages,
 * preventing hardcoded English from appearing in the diagnostic UI.
 * Canonical locale files (src/locales/*.json) remain 100% intact with exact 2,470 key parity.
 */
const DIAGNOSTIC_TRANSLATIONS: Record<string, Record<string, string>> = {
  'Runtime Layout': {
    en: 'Runtime Layout',
    ur: 'رن ٹائم لے آؤٹ',
    ar: 'تخطيط وقت التشغيل',
    hi: 'रनटाइम लेआउट',
    bn: 'রানটাইম লেআউট',
    ms: 'Susun Atur Masa Nyata',
    id: 'Tata Letak Runtime',
    ps: 'د رن ټایم بڼه',
    ta: 'ரன்டைம் தளவமைப்பு',
    ml: 'റൺടൈം ലേഔട്ട്',
    si: 'ධාවන කාල පිරිසැලසුම',
  },
  'Environment & Direction': {
    en: 'Environment & Direction',
    ur: 'ماحول اور سمت',
    ar: 'البيئة والاتجاه',
    hi: 'पर्यावरण और दिशा',
    bn: 'পরিবেশ ও দিকনির্দেশনা',
    ms: 'Persekitaran & Arah',
    id: 'Lingkungan & Arah',
    ps: 'چاپېریال او لوری',
    ta: 'சுற்றுச்சூழல் & திசை',
    ml: 'പരിസ്ഥിതിയും ദിശയും',
    si: 'පරිසරය සහ දිශාව',
  },
  'Diagnostic Build ID': {
    en: 'Diagnostic Build ID',
    ur: 'تشخیصی بلڈ شناختی کوڈ',
    ar: 'معرّف إصدار التشخيص',
    hi: 'डायग्नोस्टिक बिल्ड आईडी',
    bn: 'ডায়াগনস্টিক বিল্ড আইডি',
    ms: 'ID Binaan Diagnostik',
    id: 'ID Build Diagnostik',
    ps: 'د تشخیص بِلډ پېژندنه',
    ta: 'கண்டறிதல் உருவாக்க ஐடி',
    ml: 'ഡയഗ്നോസ്റ്റിക് ബിൽഡ് ഐഡി',
    si: 'රෝග විනිශ්චය ගොඩනැගීමේ හැඳුනුම්පත',
  },
  'Direction Result': {
    en: 'Direction Result',
    ur: 'سمت کا نتیجہ',
    ar: 'نتيجة الاتجاه',
    hi: 'दिशा परिणाम',
    bn: 'দিক ফলাফল',
    ms: 'Keputusan Arah',
    id: 'Hasil Arah',
    ps: 'د لوري پایله',
    ta: 'திசை முடிவு',
    ml: 'ദിശ ഫലം',
    si: 'දිශා ප්‍රතිඵලය',
  },
  'I18nManager.isRTL': {
    en: 'I18nManager.isRTL (Native)',
    ur: 'I18nManager.isRTL (مقامی)',
    ar: 'I18nManager.isRTL (الأصلي)',
    hi: 'I18nManager.isRTL (मूल)',
    bn: 'I18nManager.isRTL (নেটিভ)',
    ms: 'I18nManager.isRTL (Asli)',
    id: 'I18nManager.isRTL (Asli)',
    ps: 'I18nManager.isRTL (اصلي)',
    ta: 'I18nManager.isRTL (நேட்டிவ்)',
    ml: 'I18nManager.isRTL (നേറ്റീവ്)',
    si: 'I18nManager.isRTL (දේශීය)',
  },
  'Measured natively': {
    en: 'Measured natively',
    ur: 'مقامی طور پر پیمائش شدہ',
    ar: 'تم القياس أصلياً',
    hi: 'मूल रूप से मापा गया',
    bn: 'স্থানীয়ভাবে পরিমাপ করা হয়েছে',
    ms: 'Diukur secara asli',
    id: 'Diukur secara native',
    ps: 'په اصلي بڼه اندازه شوی',
    ta: 'நேட்டிவ் முறையில் அளவிடப்பட்டது',
    ml: 'നേറ്റീവ് ആയി അളന്നു',
    si: 'දේශීයව මනිනු ලැබේ',
  },
  'Alignment & Direction': {
    en: 'Alignment & Direction',
    ur: 'سیدھ اور سمت',
    ar: 'المحاذاة والاتجاه',
    hi: 'संरेखण और दिशा',
    bn: 'প্রান্তিককরণ ও দিক',
    ms: 'Penjajaran & Arah',
    id: 'Penyelarasan & Arah',
    ps: 'برابرول او لوری',
    ta: 'சீரமைப்பு & திசை',
    ml: 'വിന്യാസവും ദിശയും',
    si: 'පෙළගැස්ම සහ දිශාව',
  },
  'Native Computed Style': {
    en: 'Native Computed Style',
    ur: 'مقامی حسابی انداز',
    ar: 'النمط المحسوب الأصلي',
    hi: 'मूल परिकलित शैली',
    bn: 'নেটিভ গণনা করা শৈলী',
    ms: 'Gaya Pengiraan Asli',
    id: 'Gaya Komputasi Asli',
    ps: 'اصلي حساب شوی سټایل',
    ta: 'நேட்டிவ் கணக்கிடப்பட்ட பாணி',
    ml: 'നേറ്റീവ് കമ്പ്യൂട്ടഡ് സ്റ്റൈൽ',
    si: 'ස්වදේශීය ගණනය කළ විලාසය',
  },
  'Unavailable (JS probe only)': {
    en: 'Unavailable (JS probe only)',
    ur: 'دستیاب نہیں (صرف جاوا اسکرپٹ پروب)',
    ar: 'غير متاح (فحص JS فقط)',
    hi: 'अनुपलब्ध (केवल जेएस जांच)',
    bn: 'অনুপলব্ধ (শুধুমাত্র জেএস প্রোব)',
    ms: 'Tidak tersedia (hanya siasatan JS)',
    id: 'Tidak tersedia (hanya probe JS)',
    ps: 'د لاسرسي وړ نه دی (یوازې JS پلټنه)',
    ta: 'கிடைக்கவில்லை (JS ஆய்வு மட்டுமே)',
    ml: 'ലഭ്യമല്ല (JS പ്രോബ് മാത്രം)',
    si: 'ලබා ගත නොහැක (JS පරීක්ෂණය පමණි)',
  },
  'Available': {
    en: 'Available',
    ur: 'دستیاب',
    ar: 'متاح',
    hi: 'उपलब्ध',
    bn: 'উপলব্ধ',
    ms: 'Tersedia',
    id: 'Tersedia',
    ps: 'شته',
    ta: 'கிடைக்கும்',
    ml: 'ലഭ്യമാണ്',
    si: 'ලබා ගත හැක',
  },
  'No Overflow (Bounded)': {
    en: 'No Overflow (Bounded)',
    ur: 'کوئی اوور فلو نہیں (محدود)',
    ar: 'لا يوجد تجاوز (محدود)',
    hi: 'कोई ओवरफ्लो नहीं (सीमित)',
    bn: 'কোন ওভারফ্লো নেই (সীমাবদ্ধ)',
    ms: 'Tiada Limpahan (Terikat)',
    id: 'Tidak Ada Luapan (Terikat)',
    ps: 'اوورفلو نشته (محدود)',
    ta: 'ஓவர்ஃப்ளோ இல்லை (வரம்புக்குட்பட்டது)',
    ml: 'ഓവർഫ്ലോ ഇല്ല (പരിമിതപ്പെടുത്തിയത്)',
    si: 'උතුරා යාමක් නැත (සීමා සහිතයි)',
  },
  'Width Overflow': {
    en: 'WIDTH OVERFLOW',
    ur: 'چوڑائی میں اوور فلو',
    ar: 'تجاوز العرض',
    hi: 'चौड़ाई ओवरफ्लो',
    bn: 'প্রস্থ ওভারফ্লো',
    ms: 'LIMPAHAN LEBAR',
    id: 'LUAPAN LEBAR',
    ps: 'د پلنوالي اوورفلو',
    ta: 'அகல ஓவர்ஃப்ளோ',
    ml: 'വീതി ഓവർഫ്ലോ',
    si: 'පළල උතුරා යාම',
  },
  'Height Overflow': {
    en: 'HEIGHT OVERFLOW',
    ur: 'اونچائی میں اوور فلو',
    ar: 'تجاوز الارتفاع',
    hi: 'ऊंचाई ओवरफ्लो',
    bn: 'উচ্চতা ওভারফ্লো',
    ms: 'LIMPAHAN TINGGI',
    id: 'LUAPAN TINGGI',
    ps: 'د لوړوالي اوورفلو',
    ta: 'உயர ஓவர்ஃப்ளோ',
    ml: 'ഉയരം ഓവർഫ്ലോ',
    si: 'උස උතුරා යාම',
  },
  'Navigate to': {
    en: 'Navigate to',
    ur: 'پر جائیں',
    ar: 'الانتقال إلى',
    hi: 'पर जाएं',
    bn: 'নেভিগেট করুন',
    ms: 'Navigasi ke',
    id: 'Arahkan ke',
    ps: 'ته لاړ شئ',
    ta: 'இதற்கு செல்லவும்',
    ml: 'ഇതിലേക്ക് നാവിഗേറ്റ് ചെയ്യുക',
    si: 'වෙත සංචාලනය කරන්න',
  },
  'Exports runtime layout geometry and styles without user content.': {
    en: 'Exports runtime layout geometry and styles without user content.',
    ur: 'صارف کے مواد کے بغیر رن ٹائم لے آؤٹ جیومیٹری اور اسٹائل برآمد کرتا ہے۔',
    ar: 'يصدّر هندسة وأنماط تخطيط وقت التشغيل بدون محتوى المستخدم.',
    hi: 'उपयोगकर्ता सामग्री के बिना रनटाइम लेआउट ज्यामिति और शैलियों का निर्यात करता है।',
    bn: 'ব্যবহারকারীর সামগ্রী ছাড়াই রানটাইم লেআউট জ্যামিতি এবং শৈলী রপ্তানি করে।',
    ms: 'Mengeksport geometri dan susun atur masa nyata tanpa kandungan pengguna.',
    id: 'Mengekspor geometri dan gaya tata letak runtime tanpa konten pengguna.',
    ps: 'د کاروونکي منځپانګې پرته د رن ټایم بڼه او سټایلونه صادروي.',
    ta: 'பயனர் உள்ளடக்கம் இல்லாமல் ரன்டைம் தளவமைப்பு வடிவியல் மற்றும் பாணிகளை ஏற்றுமதி செய்கிறது.',
    ml: 'ഉപയോക്തൃ ഉള്ളടക്കമില്ലാതെ റൺടൈം ലേഔട്ട് ജ്യാമിതിയും ശൈലികളും എക്സ്പോർട്ട് ചെയ്യുന്നു.',
    si: 'පරිශීලක අන්තර්ගතයකින් තොරව ධාවන කාල පිරිසැලසුම් ජ්‍යාමිතිය සහ විලාස අපනයනය කරයි.',
  },
  'Report saved locally. Share result unknown (chooser may have been dismissed).': {
    en: 'Report saved locally. Share result unknown (chooser may have been dismissed).',
    ur: 'رپورٹ فائل میں محفوظ ہو گئی۔ شیئر کا نتیجہ نامعلوم ہے (شیئر مکالمہ بند ہو سکتا ہے)۔',
    ar: 'تم حفظ التقرير محلياً. نتيجة المشاركة غير معروفة (ربما تم إغلاق مربع المشاركة).',
    hi: 'रिपोर्ट स्थानीय रूप से सहेजी गई। शेयर परिणाम अज्ञात (संवाद बंद हो सकता है)।',
    bn: 'প্রতিবেদন স্থানীয়ভাবে সংরক্ষিত হয়েছে। শেয়ারের ফলাফল অজানা (ডায়ালগ বাতিল হতে পারে)।',
    ms: 'Laporan disimpan secara setempat. Keputusan kongsi tidak diketahui (pemilih mungkin ditolak).',
    id: 'Laporan disimpan secara lokal. Hasil berbagi tidak diketahui (pemilih mungkin telah ditutup).',
    ps: 'راپور په محلي بڼه خوندي شو. د شریکولو پایله نامعلومه ده (ښايي ډیالوګ بند شوی وي).',
    ta: 'அறிக்கை உள்நாட்டில் சேமிக்கப்பட்டது. பகிர்வு முடிவு தெரியவில்லை (தேர்வி நிராகரிக்கப்பட்டிருக்கலாம்).',
    ml: 'റിപ്പോർട്ട് ലോക്കലായി സേവ് ചെയ്തു. പങ്കിടൽ ഫലം അജ്ഞാതമാണ് (ഡയലോഗ് റദ്ദാക്കിയിരിക്കാം).',
    si: 'වාර්තාව දේශීයව සුරකින ලදී. බෙදාගැනීමේ ප්‍රතිඵලය නොදනී (තෝරාගැනීම ප්‍රතික්ෂේප කර තිබිය හැක).',
  },
  'Share cancelled or unconfirmed.': {
    en: 'Share cancelled or unconfirmed.',
    ur: 'شیئر منسوخ یا غیر مصدقہ ہے۔',
    ar: 'تم إلغاء المشاركة أو لم يتم تأكيدها.',
    hi: 'साझाकरण रद्द या अपुष्ट।',
    bn: 'শেয়ার বাতিল বা নিশ্চিত নয়।',
    ms: 'Perkongsian dibatalkan atau tidak disahkan.',
    id: 'Berbagi dibatalkan atau belum dikonfirmasi.',
    ps: 'شریکول لغوه شول یا تایید نشول.',
    ta: 'பகிர்வு ரத்து செய்யப்பட்டது அல்லது உறுதிப்படுத்தப்படவில்லை.',
    ml: 'പങ്കിടൽ റദ്ദാക്കി അല്ലെങ്കിൽ സ്ഥിരീകരിച്ചിട്ടില്ല.',
    si: 'බෙදාගැනීම අවලංගු කර ඇත හෝ තහවුරු කර නොමැත.',
  },
  'File saved locally': {
    en: 'File saved locally',
    ur: 'فائل مقامی طور پر محفوظ ہو گئی',
    ar: 'تم حفظ الملف محلياً',
    hi: 'फ़ाइल स्थानीय रूप से सहेजी गई',
    bn: 'ফাইল স্থানীয়ভাবে সংরক্ষিত হয়েছে',
    ms: 'Fail disimpan secara setempat',
    id: 'File disimpan secara lokal',
    ps: 'فایل په محلي توګه خوندي شو',
    ta: 'கோப்பு உள்நாட்டில் சேமிக்கப்பட்டது',
    ml: 'ഫയൽ ലോക്കലായി സേവ് ചെയ്തു',
    si: 'ගොනුව දේශීයව සුරකින ලදී',
  },
  'Sharing is unavailable on this device.': {
    en: 'Sharing is unavailable on this device.',
    ur: 'اس ڈیوائس پر شیئرنگ دستیاب نہیں ہے۔',
    ar: 'المشاركة غير متاحة على هذا الجهاز.',
    hi: 'इस डिवाइस पर शेयरिंग उपलब्ध नहीं है।',
    bn: 'এই ডিভাইসে শেয়ারিং উপলব্ধ নেই।',
    ms: 'Perkongsian tidak tersedia pada peranti ini.',
    id: 'Berbagi tidak tersedia di perangkat ini.',
    ps: 'په دې وسیله شریکول شتون نلري.',
    ta: 'இந்த சாதனத்தில் பகிர்வு கிடைக்கவில்லை.',
    ml: 'ഈ ഉപകരണത്തിൽ പങ്കിടൽ ലഭ്യമല്ല.',
    si: 'මෙම උපාංගයේ බෙදාගැනීම ලබා ගත නොහැක.',
  },
  'Screen': {
    en: 'Screen',
    ur: 'اسکرین',
    ar: 'شاشة',
    hi: 'स्क्रीन',
    bn: 'স্ক্রিন',
    ms: 'Skrin',
    id: 'Layar',
    ps: 'پرده',
    ta: 'திரை',
    ml: 'സ്ക്രീൻ',
    si: 'තිරය',
  },
  'Parent': {
    en: 'Parent',
    ur: 'پیرنٹ کنٹینر',
    ar: 'العنصر الأصل',
    hi: 'पैरेंट कंटेनर',
    bn: 'প্যারেন্ট কন্টেইনার',
    ms: 'Induk',
    id: 'Induk',
    ps: 'اصلي کانتینر',
    ta: 'முதன்மை',
    ml: 'പേരന്റ്',
    si: 'ප්‍රධාන කන්ටේනරය',
  },
  'Overflow': {
    en: 'Overflow',
    ur: 'اوور فلو',
    ar: 'تجاوز',
    hi: 'ओवरफ्लो',
    bn: 'ওভারফ্লো',
    ms: 'Limpahan',
    id: 'Luapan',
    ps: 'اوورفلو',
    ta: 'ஓவர்ஃப்ளோ',
    ml: 'ഓവർഫ്ലോ',
    si: 'උතුරා යාම',
  },
  'Build': {
    en: 'Build',
    ur: 'بلڈ',
    ar: 'الإصدار',
    hi: 'बिल्ड',
    bn: 'বিল্ড',
    ms: 'Binaan',
    id: 'Build',
    ps: 'بِلډ',
    ta: 'உருவாக்கம்',
    ml: 'ബിൽഡ്',
    si: 'ගොඩනැගීම',
  },
  'Unavailable': {
    en: 'Unavailable',
    ur: 'دستیاب نہیں',
    ar: 'غير متاح',
    hi: 'अनुपलब्ध',
    bn: 'অনুপলব্ধ',
    ms: 'Tidak tersedia',
    id: 'Tidak tersedia',
    ps: 'د لاسرسي وړ نه دی',
    ta: 'கிடைக்கவில்லை',
    ml: 'ലഭ്യമല്ല',
    si: 'ලබා ගත නොහැක',
  },
  'Measured': {
    en: 'Measured',
    ur: 'پیمائش شدہ',
    ar: 'تم القياس',
    hi: 'मापा गया',
    bn: 'পরিমাপ করা হয়েছে',
    ms: 'Diukur',
    id: 'Terukur',
    ps: 'اندازه شوی',
    ta: 'அளவிடப்பட்டது',
    ml: 'അളന്നു',
    si: 'මනිනු ලැබේ',
  },
  'Measurement Unavailable': {
    en: 'Measurement Unavailable',
    ur: 'پیمائش دستیاب نہیں',
    ar: 'القياس غير متاح',
    hi: 'माप अनुपलब्ध',
    bn: 'পরিমাপ অনুপলব্ধ',
    ms: 'Pengukuran Tidak Tersedia',
    id: 'Pengukuran Tidak Tersedia',
    ps: 'اندازه شتون نلري',
    ta: 'அளவீடு கிடைக்கவில்லை',
    ml: 'അളവ് ലഭ്യമല്ല',
    si: 'මිනුම් ලබා ගත නොහැක',
  },
  'Share Result Unknown': {
    en: 'Share Result Unknown',
    ur: 'شیئر کا نتیجہ نامعلوم',
    ar: 'نتيجة المشاركة غير معروفة',
    hi: 'साझाकरण परिणाम अज्ञात',
    bn: 'শেয়ারের ফলাফল অজানা',
    ms: 'Keputusan Kongsi Tidak Diketahui',
    id: 'Hasil Berbagi Tidak Diketahui',
    ps: 'د شریکولو پایله نامعلومه ده',
    ta: 'பகிர்வு முடிவு தெரியவில்லை',
    ml: 'പങ്കിടൽ ഫലം അജ്ഞാതമാണ്',
    si: 'බෙදාගැනීමේ ප්‍රතිඵලය නොදනී',
  },
  'Ready (File Generated)': {
    en: 'Ready (File Generated)',
    ur: 'تیار (فائل تیار ہو گئی)',
    ar: 'جاهز (تم إنشاء الملف)',
    hi: 'तैयार (फ़ाइल जनरेट की गई)',
    bn: 'প্রস্তুত (ফাইল তৈরি হয়েছে)',
    ms: 'Sedia (Fail Dijana)',
    id: 'Siap (Berkas Dibuat)',
    ps: 'تیار دی (فایل جوړ شو)',
    ta: 'தயார் (கோப்பு உருவாக்கப்பட்டது)',
    ml: 'തയ്യാറാണ് (ഫയൽ ജനറേറ്റ് ചെയ്തു)',
    si: 'සූදානම් (ගොනුව ජනනය කරන ලදී)',
  },
  'Cancelled': {
    en: 'Cancelled',
    ur: 'منسوخ',
    ar: 'تم الإلغاء',
    hi: 'रद्द किया गया',
    bn: 'বাতিল',
    ms: 'Dibatalkan',
    id: 'Dibatalkan',
    ps: 'لغوه شو',
    ta: 'ரத்து செய்யப்பட்டது',
    ml: 'റദ്ദാക്കി',
    si: 'අවලංගු කරන ලදී',
  },
  'Action Required': {
    en: 'Action Required',
    ur: 'کارروائی درکار ہے',
    ar: 'إجراء مطلوب',
    hi: 'कार्रवाई आवश्यक',
    bn: 'পদক্ষেপ প্রয়োজন',
    ms: 'Tindakan Diperlukan',
    id: 'Tindakan Diperlukan',
    ps: 'اقدام ته اړتیا ده',
    ta: 'செயல் தேவை',
    ml: 'നടപടി ആവശ്യമാണ്',
    si: 'ක්‍රියාමාර්ගයක් අවශ්‍යයි',
  },
  'RTL Diagnostic Report': {
    en: 'RTL Diagnostic Report',
    ur: 'آر ٹی ایل تشخیصی رپورٹ',
    ar: 'تقرير تشخيص RTL',
    hi: 'आरटीएल डायग्नोस्टिक रिपोर्ट',
    bn: 'আরটিএল ডায়াগনস্টিক রিপোর্ট',
    ms: 'Laporan Diagnostik RTL',
    id: 'Laporan Diagnostik RTL',
    ps: 'د RTL تشخیصی راپور',
    ta: 'RTL கண்டறிதல் அறிக்கை',
    ml: 'RTL ഡയഗ്നോസ്റ്റിക് റിപ്പോർട്ട്',
    si: 'RTL රෝග විනිශ්චය වාර්තාව',
  },
  'Export RTL Diagnostic Report': {
    en: 'Export RTL Diagnostic Report',
    ur: 'آر ٹی ایل تشخیصی رپورٹ برآمد کریں',
    ar: 'تصدير تقرير تشخيص RTL',
    hi: 'आरटीएल डायग्नोस्टिक रिपोर्ट निर्यात करें',
    bn: 'আরটিএল ডায়াগনস্টিক রিপোর্ট রপ্তানি করুন',
    ms: 'Eksport Laporan Diagnostik RTL',
    id: 'Ekspor Laporan Diagnostik RTL',
    ps: 'د RTL تشخیصی راپور صادر کړئ',
    ta: 'RTL கண்டறிதல் அறிக்கையை ஏற்றுமதி செய்',
    ml: 'RTL ഡയഗ്നോസ്റ്റിക് റിപ്പോർട്ട് എക്സ്പോർട്ട് ചെയ്യുക',
    si: 'RTL රෝග විනිශ්චය වාර්තාව අපනයනය කරන්න',
  },
  'Parent dimensions reported <= 0': {
    en: 'Parent container dimensions unavailable',
    ur: 'پیرنٹ کنٹینر کے پیمائش دستیاب نہیں',
    ar: 'أبعاد الحاوية الأصل غير متاحة',
    hi: 'पैरेंट कंटेनर आयाम अनुपलब्ध',
    bn: 'প্যারেন্ট কন্টেইনারের মাত্রা অনুপলব্ধ',
    ms: 'Dimensi bekas induk tidak tersedia',
    id: 'Dimensi kontainer induk tidak tersedia',
    ps: 'د اصلي کانټینر ابعاد شتون نلري',
    ta: 'முதன்மை கொள்கலன் பரிமாணங்கள் கிடைக்கவில்லை',
    ml: 'പേരന്റ് കണ്ടെയ്നർ അളവുകൾ ലഭ്യമല്ല',
    si: 'ප්‍රධාන බහාලුම් මානයන් ලබා ගත නොහැක',
  },
  'Target dimensions reported <= 0': {
    en: 'Target dimensions unavailable',
    ur: 'ہدف کے پیمائش دستیاب نہیں',
    ar: 'أبعاد الهدف غير متاحة',
    hi: 'लक्ष्य आयाम अनुपलब्ध',
    bn: 'লক্ষ্য মাত্রা অনুপলব্ধ',
    ms: 'Dimensi sasaran tidak tersedia',
    id: 'Dimensi target tidak tersedia',
    ps: 'د هدف ابعاد شتون نلري',
    ta: 'இலக்கு பரிமாணங்கள் கிடைக்கவில்லை',
    ml: 'ടാർഗെറ്റ് അളവുകൾ ലഭ്യമല്ല',
    si: 'ඉලක්කගත මානයන් ලබා ගත නොහැක',
  },
  'Empty layout event on parent': {
    en: 'Layout event unavailable on parent',
    ur: 'پیرنٹ پر لے آؤٹ ایونٹ دستیاب نہیں',
    ar: 'حدث التخطيط غير متاح في الحاوية الأصل',
    hi: 'पैरेंट पर लेआउट इवेंट अनुपलब्ध',
    bn: 'প্যারেন্টে লেআউট ইভেন্ট অনুপলব্ধ',
    ms: 'Peristiwa susun atur tidak tersedia pada induk',
    id: 'Peristiwa tata letak tidak tersedia pada induk',
    ps: 'په اصلي کانتینر کې د بڼې پېښه نشته',
    ta: 'முதன்மை உறுப்பில் தளவமைப்பு நிகழ்வு இல்லை',
    ml: 'പേരന്റിൽ ലേഔട്ട് ഇവന്റ് ലഭ്യമല്ല',
    si: 'ප්‍රධාන බහාලුමේ පිරිසැලසුම් සිදුවීමක් නොමැත',
  },
  'Empty layout event on target': {
    en: 'Layout event unavailable on target',
    ur: 'ہدف پر لے آؤٹ ایونٹ دستیاب نہیں',
    ar: 'حدث التخطيط غير متاح في الهدف',
    hi: 'लक्ष्य पर लेआउट इवेंट अनुपलब्ध',
    bn: 'লক্ষ্যে লেআউট ইভেন্ট অনুপলব্ধ',
    ms: 'Peristiwa susun atur tidak tersedia pada sasaran',
    id: 'Peristiwa tata letak tidak tersedia pada target',
    ps: 'په هدف کې د بڼې پېښه نشته',
    ta: 'இலக்கில் தளவமைப்பு நிகழ்வு இல்லை',
    ml: 'ടാർഗെറ്റിൽ ലേഔട്ട് ഇവന്റ് ലഭ്യമല്ല',
    si: 'ඉලක්කයේ පිරිසැලසුම් සිදුවීමක් නොමැත',
  },
  'Native measurement could not be obtained': {
    en: 'Native measurement could not be obtained',
    ur: 'مقامی پیمائش حاصل نہیں کی جا سکی',
    ar: 'تعذر الحصول على القياس الأصلي',
    hi: 'मूल माप प्राप्त नहीं किया जा सका',
    bn: 'নেটিভ পরিমাপ পাওয়া যায়নি',
    ms: 'Pengukuran asli tidak dapat diperoleh',
    id: 'Pengukuran native tidak dapat diperoleh',
    ps: 'اصلي اندازه ترلاسه نشوه',
    ta: 'நேட்டிவ் அளவீட்டைப் பெற முடியவில்லை',
    ml: 'നേറ്റീവ് അളവ് നേടാനായില്ല',
    si: 'ස්වදේශීය මිනුම් ලබා ගැනීමට නොහැකි විය',
  },
  'Empty or invalid layout event on parent': {
    en: 'Invalid layout event on parent',
    ur: 'پیرنٹ پر ناقص لے آؤٹ ایونٹ',
    ar: 'حدث تخطيط غير صالح في الحاوية الأصل',
    hi: 'पैरेंट पर अमान्य लेआउट इवेंट',
    bn: 'প্যারেন্টে অবৈধ লেআউট ইভেন্ট',
    ms: 'Peristiwa susun atur tidak sah pada induk',
    id: 'Peristiwa tata letak tidak valid pada induk',
    ps: 'په اصلي کانتینر کې ناسم بڼه پېښه',
    ta: 'முதன்மை உறுப்பில் தவறான தளவமைப்பு நிகழ்வு',
    ml: 'പേരന്റിൽ അസാധുവായ ലേഔട്ട് ഇവന്റ്',
    si: 'ප්‍රධාන බහාලුමේ අවලංගු පිරිසැලසුම් සිදුවීමක්',
  },
  'Empty or invalid layout event on target': {
    en: 'Invalid layout event on target',
    ur: 'ہدف پر ناقص لے آؤٹ ایونٹ',
    ar: 'حدث تخطيط غير صالح في الهدف',
    hi: 'लक्ष्य पर अमान्य लेआउट इवेंट',
    bn: 'লক্ষ্যে অবৈধ লেআউট ইভেন্ট',
    ms: 'Peristiwa susun atur tidak sah pada sasaran',
    id: 'Peristiwa tata letak tidak valid pada target',
    ps: 'په هدف کې ناسم بڼه پېښه',
    ta: 'இலக்கில் தவறான தளவமைப்பு நிகழ்வு',
    ml: 'ടാർഗെറ്റിൽ അസാധുവായ ലേഔട്ട് ഇവന്റ്',
    si: 'ඉලක්කයේ අවලංගු පිරිසැලසුම් සිදුවීමක්',
  },
  'Share dialog dismissed.': {
    en: 'Share dialog dismissed',
    ur: 'شیئر کا مکالمہ بند کر دیا گیا',
    ar: 'تم إغلاق نافذة المشاركة',
    hi: 'साझाकरण संवाद खारिज कर दिया गया',
    bn: 'শেয়ার ডায়ালগ বাতিল করা হয়েছে',
    ms: 'Dialog perkongsian ditutup',
    id: 'Dialog berbagi ditutup',
    ps: 'د شریکولو ډیالوګ بند شو',
    ta: 'பகிர்வு உரையாடல் நிராகரிக்கப்பட்டது',
    ml: 'പങ്കിടൽ ഡയലോഗ് നിരസിച്ചു',
    si: 'බෙදාගැනීමේ සංවාදය ඉවත් කරන ලදී',
  },
  'No writable directory found on device.': {
    en: 'No writable directory found on device',
    ur: 'ڈیوائس پر قابل تحریر فولڈر نہیں ملا',
    ar: 'لم يتم العثور على دليل قابل للكتابة على الجهاز',
    hi: 'डिवाइस पर कोई लिखने योग्य डायरेक्टरी नहीं मिली',
    bn: 'ডিভাইসে কোনো লেখার উপযোগী ডিরেক্টরি পাওয়া যায়নি',
    ms: 'Tiada direktori boleh tulis ditemui pada peranti',
    id: 'Tidak ada direktori yang dapat ditulis di perangkat',
    ps: 'په وسیله کې د لیکلو وړ فولډر ونه موندل شو',
    ta: 'சாதனத்தில் எழுதக்கூடிய கோப்பகம் கிடைக்கவில்லை',
    ml: 'ഉപകരണത്തിൽ റൈറ്റബിൾ ഡയറക്ടറി കണ്ടെത്തിയില്ല',
    si: 'උපාංගයේ ලිවිය හැකි ඩිරෙක්ටරියක් හමු නොවීය',
  },
  'Probes': {
    en: 'Probes',
    ur: 'پروبز',
    ar: 'المجسات',
    hi: 'प्रोब्स',
    bn: 'প্রোবসমূহ',
    ms: 'Kuar',
    id: 'Probe',
    ps: 'پروبونه',
    ta: 'ஆய்வுகள்',
    ml: 'പ്രോബുകൾ',
    si: 'පරීක්ෂණ',
  },
  'Screen Coverage': {
    en: 'Screen Coverage',
    ur: 'اسکرین کوریج',
    ar: 'تغطية الشاشات',
    hi: 'स्क्रीन कवरेज',
    bn: 'স্ক্রিন কভারেজ',
    ms: 'Liputan Skrin',
    id: 'Cakupan Layar',
    ps: 'د پردې پوښښ',
    ta: 'திரை கவரேஜ்',
    ml: 'സ്ക്രീൻ കവറേജ്',
    si: 'තිර ආවරණය',
  },
  'Visited': {
    en: 'Visited',
    ur: 'دیکھی گئی',
    ar: 'تمت زيارتها',
    hi: 'देखी गई',
    bn: 'পরিদর্শিত',
    ms: 'Dilawati',
    id: 'Dikunjungi',
    ps: 'لیدل شوی',
    ta: 'பார்வையிடப்பட்டது',
    ml: 'സന്ദർശിച്ചത്',
    si: 'පැමිණි',
  },
  'Unvisited': {
    en: 'Unvisited',
    ur: 'غیر وزٹ شدہ',
    ar: 'لم تتم زيارتها',
    hi: 'अनदेखी',
    bn: 'অপরিক্রমি',
    ms: 'Belum Dilawati',
    id: 'Belum Dikunjungi',
    ps: 'نه لیدل شوی',
    ta: 'பார்வையிடப்படாதது',
    ml: 'സന്ദർശിക്കാത്തത്',
    si: 'නොපැමිණි',
  },
  'No primitive probes recorded yet.': {
    en: 'No primitive probes recorded yet.',
    ur: 'ابھی تک کوئی پروب ریکارڈ نہیں ہوئی',
    ar: 'لم يتم تسجيل أي مجسات بعد',
    hi: 'अभी तक कोई प्रिमिटिव प्रोब रिकॉर्ड नहीं हुआ',
    bn: 'এখনও কোনো প্রোব রেকর্ড করা হয়নি',
    ms: 'Tiada kuar primitif direkodkan lagi',
    id: 'Belum ada probe primitif yang terekam',
    ps: 'تر اوسه کوم لومړنی پروب نه دی ثبت شوی',
    ta: 'இதுவரை எந்த ஆய்வுகளும் பதிவு செய்யப்படவில்லை',
    ml: 'ഇതുവരെ പ്രോബുകളൊന്നും രേഖപ്പെടുത്തിയിട്ടില്ല',
    si: 'තවම කිසිදු පරීක්ෂණයක් සටහන් කර නොමැත',
  },
  'Unknown': {
    en: 'Unknown',
    ur: 'نامعلوم',
    ar: 'غير معروف',
    hi: 'अज्ञात',
    bn: 'অজানা',
    ms: 'Tidak Diketahui',
    id: 'Tidak Diketahui',
    ps: 'نامعلوم',
    ta: 'தெரியாதது',
    ml: 'അജ്ഞാതം',
    si: 'නොදනී',
  },
  'No overflow': {
    en: 'No overflow',
    ur: 'کوئی اوور فلو نہیں',
    ar: 'لا يوجد تجاوز',
    hi: 'कोई ओवरफ्लो नहीं',
    bn: 'কোনো ওভারফ্লো নেই',
    ms: 'Tiada limpahan',
    id: 'Tidak ada luapan',
    ps: 'اوورفلو نشته',
    ta: 'ஓவர்ஃப்ளோ இல்லை',
    ml: 'ഓവർഫ്ലോ ഇല്ല',
    si: 'උතුරා යාමක් නැත',
  },
  'Stale': {
    en: 'Stale',
    ur: 'پرانا',
    ar: 'قديم',
    hi: 'पुराना',
    bn: 'পুরোনো',
    ms: 'Lapuk',
    id: 'Basi',
    ps: 'زوړ',
    ta: 'பழையது',
    ml: 'പഴയത്',
    si: 'පරණ',
  },
  'Report file could not be verified on disk.': {
    en: 'Report file could not be verified on disk',
    ur: 'ڈسک پر رپورٹ فائل کی تصدیق نہیں ہو سکی',
    ar: 'تعذر التحقق من ملف التقرير على القرص',
    hi: 'डिस्क पर रिपोर्ट फ़ाइल सत्यापित नहीं की जा सकी',
    bn: 'ডিস্কে রিপোর্ট ফাইল যাচাই করা যায়নি',
    ms: 'Fail laporan tidak dapat disahkan pada cakera',
    id: 'Berkas laporan tidak dapat diverifikasi di disk',
    ps: 'په ډیسک کې د راپور فایل تصدیق نشو',
    ta: 'வட்டில் அறிக்கை கோப்பை சரிபார்க்க முடியவில்லை',
    ml: 'ഡിസ്കിൽ റിപ്പോർട്ട് ഫയൽ പരിശോധിക്കാനായില്ല',
    si: 'තැටියේ වාර්තා ගොනුව තහවුරු කිරීමට නොහැකි විය',
  },
  'Web document environment is unavailable.': {
    en: 'Web document environment is unavailable',
    ur: 'ویب دستاویز کا ماحول دستیاب نہیں ہے',
    ar: 'بيئة مستند الويب غير متاحة',
    hi: 'वेब दस्तावेज़ वातावरण अनुपलब्ध है',
    bn: 'ওয়েব নথি পরিবেশ উপলব্ধ নেই',
    ms: 'Persekitaran dokumen web tidak tersedia',
    id: 'Lingkungan dokumen web tidak tersedia',
    ps: 'د ویب سند چاپېریال شتون نلري',
    ta: 'வலை ஆவண சூழல் கிடைக்கவில்லை',
    ml: 'വെബ് ഡോക്യുമെന്റ് പരിസ്ഥിതി ലഭ്യമല്ല',
    si: 'වෙබ් ලේඛන පරිසරය ලබා ගත නොහැක',
  },
};

/**
 * Diagnostic translation helper.
 * 1. Resolves against the production i18next catalog if the key exists there.
 * 2. If not found in production catalog, checks the bounded diagnostic dictionary.
 * 3. Falls back gracefully to English diagnostic text or the raw key.
 */
export function diagT(key: string, options?: Record<string, any>): string {
  // If the production catalog already has an exact translation for this key, use it!
  const translated = t(key, options);
  if (translated !== key) {
    return translated;
  }

  const currentLang = (i18n.language || getCurrentLanguage() || 'en').toLowerCase().split('-')[0].split('_')[0];
  const entry = DIAGNOSTIC_TRANSLATIONS[key];

  if (entry) {
    let result = entry[currentLang] || entry['en'] || key;
    if (options && typeof options === 'object') {
      for (const [k, v] of Object.entries(options)) {
        result = result.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v));
        result = result.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
      }
    }
    return result;
  }

  return translated;
}

/**
 * Localized measurement status label.
 * Maps internal machine enum codes ('measured' | 'pending' | 'measurementUnavailable')
 * to localized production UI strings.
 */
export function getLocalizedMeasurementStatus(status: string): string {
  switch (status) {
    case 'measured':
      return diagT('Measured');
    case 'measurementUnavailable':
      return diagT('Measurement Unavailable');
    case 'pending':
    default:
      return t('Pending');
  }
}

/**
 * Localized export / share status label.
 * Maps internal machine enum codes to localized production UI strings.
 */
export function getLocalizedExportStatus(status: string): string {
  switch (status) {
    case 'userActionRequired':
    case 'unknown':
    case 'shareInvoked':
      return diagT('Share Result Unknown');
    case 'cancelled':
    case 'cancelledOrUnknown':
      return diagT('Cancelled');
    case 'failed':
    case 'error':
      return t('Export failed');
    case 'fileReady':
    case 'ready':
      return diagT('Ready (File Generated)');
    case 'success':
      return t('Backup exported');
    default:
      return diagT(status) || status;
  }
}

/**
 * Localized unavailability or failure reason string.
 */
export function getLocalizedUnavailabilityReason(reason?: string): string {
  if (!reason) return diagT('Measurement Unavailable');
  return diagT(reason);
}

/**
 * Localized, privacy-safe native share title.
 */
export function getDiagnosticShareTitle(): string {
  return diagT('RTL Diagnostic Report');
}

/**
 * Localized, privacy-safe native share dialog title.
 */
export function getDiagnosticShareDialogTitle(): string {
  return diagT('Export RTL Diagnostic Report');
}

export { t, isRtlLanguage };
