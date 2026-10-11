export interface City {
  name: string;
  country: string;
  latitude: number;
  longitude: number;
}

export const COUNTRY_UR: Record<string, string> = {
  "Afghanistan": "افغانستان",
  "Algeria": "الجزائر",
  "Australia": "آسٹریلیا",
  "Bahrain": "بحرین",
  "Bangladesh": "بنگلہ دیش",
  "Canada": "کینیڈا",
  "Egypt": "مصر",
  "Ethiopia": "ایتھوپیا",
  "France": "فرانس",
  "Germany": "جرمنی",
  "Ghana": "گھانا",
  "India": "بھارت",
  "Indonesia": "انڈونیشیا",
  "Iran": "ایران",
  "Iraq": "عراق",
  "Jordan": "اردن",
  "Kenya": "کینیا",
  "Kuwait": "کویت",
  "Lebanon": "لبنان",
  "Malaysia": "ملائیشیا",
  "Morocco": "مراکش",
  "Nepal": "نیپال",
  "Nigeria": "نائیجیریا",
  "Oman": "عمان",
  "Pakistan": "پاکستان",
  "Palestine": "فلسطین",
  "Philippines": "فلپائن",
  "Qatar": "قطر",
  "Saudi Arabia": "سعودی عرب",
  "Senegal": "سینیگال",
  "Singapore": "سنگاپور",
  "Sri Lanka": "سری لنکا",
  "Sudan": "سوڈان",
  "Syria": "شام",
  "Thailand": "تھائی لینڈ",
  "Tunisia": "تیونس",
  "Turkey": "ترکی",
  "United Arab Emirates": "متحدہ عرب امارات",
  "United Kingdom": "برطانیہ",
  "United States": "امریکہ",
  "Yemen": "یمن",
};

export const COUNTRY_AR: Record<string, string> = {
  "Afghanistan": "أفغانستان", "Algeria": "الجزائر", "Australia": "أستراليا", "Bahrain": "البحرين",
  "Bangladesh": "بنغلاديش", "Canada": "كندا", "Egypt": "مصر", "Ethiopia": "إثيوبيا", "France": "فرنسا",
  "Germany": "ألمانيا", "Ghana": "غانا", "India": "الهند", "Indonesia": "إندونيسيا", "Iran": "إيران",
  "Iraq": "العراق", "Jordan": "الأردن", "Kenya": "كينيا", "Kuwait": "الكويت", "Lebanon": "لبنان",
  "Malaysia": "ماليزيا", "Morocco": "المغرب", "Nepal": "نيبال", "Nigeria": "نيجيريا", "Oman": "عُمان",
  "Pakistan": "باكستان", "Palestine": "فلسطين", "Philippines": "الفلبين", "Qatar": "قطر",
  "Saudi Arabia": "المملكة العربية السعودية", "Senegal": "السنغال", "Singapore": "سنغافورة",
  "Sri Lanka": "سريلانكا", "Sudan": "السودان", "Syria": "سوريا", "Thailand": "تايلاند", "Tunisia": "تونس",
  "Turkey": "تركيا", "United Arab Emirates": "الإمارات العربية المتحدة", "United Kingdom": "المملكة المتحدة",
  "United States": "الولايات المتحدة", "Yemen": "اليمن",
};

export const CITY_NAMES_UR: Record<string, string> = {
  "Dubai": "دبئی", "Abu Dhabi": "ابوظہبی", "Sharjah": "شارجہ", "Riyadh": "ریاض", "Jeddah": "جدہ",
  "Mecca": "مکہ", "Medina": "مدینہ", "Doha": "دوحہ", "Kuwait City": "کویت سٹی", "Manama": "منامہ",
  "Muscat": "مسقط", "Sana'a": "صنعا", "Karachi": "کراچی", "Lahore": "لاہور", "Islamabad": "اسلام آباد",
  "Dhaka": "ڈھاکا", "Chittagong": "چٹاگانگ", "Mumbai": "ممبئی", "Delhi": "دہلی", "Hyderabad": "حیدرآباد",
  "Bangalore": "بنگلور", "Chennai": "چنئی", "Colombo": "کولمبو", "Kathmandu": "کھٹمنڈو", "Kabul": "کابل",
  "Jakarta": "جکارتہ", "Surabaya": "سورابایا", "Bandung": "بانڈونگ", "Kuala Lumpur": "کوالالمپور",
  "Singapore": "سنگاپور", "Manila": "منیلا", "Quezon City": "کویزون سٹی", "Bangkok": "بنکاک", "Cairo": "قاہرہ",
  "Alexandria": "اسکندریہ", "Amman": "عمان", "Beirut": "بیروت", "Damascus": "دمشق", "Baghdad": "بغداد",
  "Istanbul": "استنبول", "Ankara": "انقرہ", "Tehran": "تہران", "Isfahan": "اصفہان", "Mashhad": "مشہد",
  "Jerusalem": "یروشلم", "Gaza": "غزہ", "Lagos": "لاگوس", "Kano": "کانو", "Nairobi": "نیروبی",
  "Casablanca": "کاسابلانکا", "Rabat": "رباط", "Algiers": "الجزائر", "Tunis": "تونس", "Khartoum": "خرطوم",
  "Addis Ababa": "ادیس ابابا", "Accra": "اکرا", "Dakar": "ڈاکار", "New York": "نیویارک", "Chicago": "شکاگو",
  "Houston": "ہیوسٹن", "Los Angeles": "لاس اینجلس", "Washington DC": "واشنگٹن ڈی سی", "Detroit": "ڈیٹرائٹ",
  "London": "لندن", "Paris": "پیرس", "Berlin": "برلن", "Toronto": "ٹورنٹو", "Sydney": "سڈنی",
};

export const CITY_NAMES_AR: Record<string, string> = {
  "Dubai": "دبي", "Abu Dhabi": "أبوظبي", "Sharjah": "الشارقة", "Riyadh": "الرياض", "Jeddah": "جدة",
  "Mecca": "مكة", "Medina": "المدينة المنورة", "Doha": "الدوحة", "Kuwait City": "مدينة الكويت", "Manama": "المنامة",
  "Muscat": "مسقط", "Sana'a": "صنعاء", "Karachi": "كراتشي", "Lahore": "لاهور", "Islamabad": "إسلام آباد",
  "Dhaka": "دكا", "Chittagong": "شيتاغونغ", "Mumbai": "مومباي", "Delhi": "دلهي", "Hyderabad": "حيدر آباد",
  "Bangalore": "بنغالور", "Chennai": "تشيناي", "Colombo": "كولومبو", "Kathmandu": "كاتماندو", "Kabul": "كابل",
  "Jakarta": "جاكرتا", "Surabaya": "سورابايا", "Bandung": "باندونغ", "Kuala Lumpur": "كوالالمبور",
  "Singapore": "سنغافورة", "Manila": "مانيلا", "Quezon City": "مدينة كويزون", "Bangkok": "بانكوك", "Cairo": "القاهرة",
  "Alexandria": "الإسكندرية", "Amman": "عمّان", "Beirut": "بيروت", "Damascus": "دمشق", "Baghdad": "بغداد",
  "Istanbul": "إسطنبول", "Ankara": "أنقرة", "Tehran": "طهران", "Isfahan": "أصفهان", "Mashhad": "مشهد",
  "Jerusalem": "القدس", "Gaza": "غزة", "Lagos": "لاغوس", "Kano": "كانو", "Nairobi": "نيروبي",
  "Casablanca": "الدار البيضاء", "Rabat": "الرباط", "Algiers": "الجزائر", "Tunis": "تونس", "Khartoum": "الخرطوم",
  "Addis Ababa": "أديس أبابا", "Accra": "أكرا", "Dakar": "داكار", "New York": "نيويورك", "Chicago": "شيكاغو",
  "Houston": "هيوستن", "Los Angeles": "لوس أنجلوس", "Washington DC": "واشنطن العاصمة", "Detroit": "ديترويت",
  "London": "لندن", "Paris": "باريس", "Berlin": "برلين", "Toronto": "تورونتو", "Sydney": "سيدني",
};

export const COUNTRY_HI: Record<string, string> = {
  "Afghanistan": "अफ़ग़ानिस्तान", "Algeria": "अल्जीरिया", "Australia": "ऑस्ट्रेलिया", "Bahrain": "बहरीन",
  "Bangladesh": "बांग्लादेश", "Canada": "कनाडा", "Egypt": "मिस्र", "Ethiopia": "इथियोपिया", "France": "फ़्रांस",
  "Germany": "जर्मनी", "Ghana": "घाना", "India": "भारत", "Indonesia": "इंडोनेशिया", "Iran": "ईरान",
  "Iraq": "इराक़", "Jordan": "जॉर्डन", "Kenya": "केन्या", "Kuwait": "कुवैत", "Lebanon": "लेबनान",
  "Malaysia": "मलेशिया", "Morocco": "मोरक्को", "Nepal": "नेपाल", "Nigeria": "नाइजीरिया", "Oman": "ओमान",
  "Pakistan": "पाकिस्तान", "Palestine": "फ़िलिस्तीन", "Philippines": "फ़िलीपींस", "Qatar": "क़तर",
  "Saudi Arabia": "सऊदी अरब", "Senegal": "सेनेगल", "Singapore": "सिंगापुर",
  "Sri Lanka": "श्रीलंका", "Sudan": "सूडान", "Syria": "सीरिया", "Thailand": "थाईलैंड", "Tunisia": "ट्यूनीशिया",
  "Turkey": "तुर्की", "United Arab Emirates": "संयुक्त अरब अमीरात", "United Kingdom": "यूनाइटेड किंगडम",
  "United States": "संयुक्त राज्य अमेरिका", "Yemen": "यमन",
};

export const CITY_NAMES_HI: Record<string, string> = {
  "Dubai": "दुबई", "Abu Dhabi": "अबू धाबी", "Sharjah": "शारजाह", "Riyadh": "रियाद", "Jeddah": "जेद्दा",
  "Mecca": "मक्का", "Medina": "मदीना", "Doha": "दोहा", "Kuwait City": "कुवैत शहर", "Manama": "मनामा",
  "Muscat": "मस्क़त", "Sana'a": "सना", "Karachi": "कराची", "Lahore": "लाहौर", "Islamabad": "इस्लामाबाद",
  "Dhaka": "ढाका", "Chittagong": "चटगाँव", "Mumbai": "मुंबई", "Delhi": "दिल्ली", "Hyderabad": "हैदराबाद",
  "Bangalore": "बैंगलोर", "Chennai": "चेन्नई", "Colombo": "कोलंबो", "Kathmandu": "काठमांडू", "Kabul": "काबुल",
  "Jakarta": "जकार्ता", "Surabaya": "सुरबाया", "Bandung": "बांडुंग", "Kuala Lumpur": "क्वालालंपुर",
  "Singapore": "सिंगापुर", "Manila": "मनीला", "Quezon City": "क्वेज़ोन सिटी", "Bangkok": "बैंकॉक", "Cairo": "काहिरा",
  "Alexandria": "सिकंदरिया", "Amman": "अम्मान", "Beirut": "बेयरूत", "Damascus": "दमिश्क", "Baghdad": "बग़दाद",
  "Istanbul": "इस्तांबुल", "Ankara": "अंकारा", "Tehran": "तेहरान", "Isfahan": "इस्फ़हान", "Mashhad": "मशहद",
  "Jerusalem": "यरूशलेम", "Gaza": "ग़ज़ा", "Lagos": "लागोस", "Kano": "कानो", "Nairobi": "नैरोबी",
  "Casablanca": "कासाब्लांका", "Rabat": "रबात", "Algiers": "अल्जीयर्स", "Tunis": "ट्यूनिस", "Khartoum": "ख़ारतूम",
  "Addis Ababa": "अदीस अबाबा", "Accra": "अक्रा", "Dakar": "डकार", "New York": "न्यूयॉर्क", "Chicago": "शिकागो",
  "Houston": "ह्यूस्टन", "Los Angeles": "लॉस एंजिल्स", "Washington DC": "वाशिंगटन डीसी", "Detroit": "डेट्रायट",
  "London": "लंदन", "Paris": "पेरिस", "Berlin": "बर्लिन", "Toronto": "टोरंटो", "Sydney": "सिडनी",
};

export const COUNTRY_ML: Record<string, string> = {
  "Afghanistan": "അഫ്ഗാനിസ്ഥാൻ", "Algeria": "അൾജീരിയ", "Australia": "ഓസ്ട്രേലിയ", "Bahrain": "ബഹ്റൈൻ",
  "Bangladesh": "ബംഗ്ലാദേശ്", "Canada": "കാനഡ", "Egypt": "ഈജിപ്ത്", "Ethiopia": "എത്യോപ്യ", "France": "ഫ്രാൻസ്",
  "Germany": "ജർമ്മനി", "Ghana": "ഘാന", "India": "ഇന്ത്യ", "Indonesia": "ഇന്തോനേഷ്യ", "Iran": "ഇറാൻ",
  "Iraq": "ഇറാഖ്", "Jordan": "ജോർദാൻ", "Kenya": "കെനിയ", "Kuwait": "കുവൈത്ത്", "Lebanon": "ലെബനൻ",
  "Malaysia": "മലേഷ്യ", "Morocco": "മൊറോക്കോ", "Nepal": "നേപ്പാൾ", "Nigeria": "നൈജീരിയ", "Oman": "ഒമാൻ",
  "Pakistan": "പാക്കിസ്ഥാൻ", "Palestine": "പാലസ്തീൻ", "Philippines": "ഫിലിപ്പീൻസ്", "Qatar": "ഖത്തർ",
  "Saudi Arabia": "സൗദി അറേബ്യ", "Senegal": "സെനഗൽ", "Singapore": "സിംഗപ്പൂർ",
  "Sri Lanka": "ശ്രീലങ്ക", "Sudan": "സുഡാൻ", "Syria": "സിറിയ", "Thailand": "തായ്‌ലൻഡ്", "Tunisia": "ടുണീഷ്യ",
  "Turkey": "തുർക്കി", "United Arab Emirates": "യുണൈറ്റഡ് അറബ് എമിറേറ്റ്സ്", "United Kingdom": "യുണൈറ്റഡ് കിംഗ്ഡം",
  "United States": "യുണൈറ്റഡ് സ്റ്റേറ്റ്സ്", "Yemen": "യമൻ",
};

export const CITY_NAMES_ML: Record<string, string> = {
  "Dubai": "ദുബായ്", "Abu Dhabi": "അബുദാബി", "Sharjah": "ഷാർജ", "Riyadh": "റിയാദ്", "Jeddah": "ജിദ്ദ",
  "Mecca": "മക്ക", "Medina": "മദീന", "Doha": "ദോഹ", "Kuwait City": "കുവൈറ്റ് സിറ്റി", "Manama": "മനാമ",
  "Muscat": "മസ്കറ്റ്", "Sana'a": "സൻആ", "Karachi": "കറാച്ചി", "Lahore": "ലാഹോർ", "Islamabad": "ഇസ്ലാമാബാദ്",
  "Dhaka": "ധാക്ക", "Chittagong": "ചിറ്റഗോംഗ്", "Mumbai": "മുംബൈ", "Delhi": "ഡൽഹി", "Hyderabad": "ഹൈദരാബാദ്",
  "Bangalore": "ബാംഗ്ലൂർ", "Chennai": "ചെന്നൈ", "Colombo": "കൊളംബോ", "Kathmandu": "കാഠ്മണ്ഡു", "Kabul": "കാബൂൾ",
  "Jakarta": "ജക്കാർത്ത", "Surabaya": "സുരബായ", "Bandung": "ബന്ദുങ്", "Kuala Lumpur": "ക്വാലാലംപൂർ",
  "Singapore": "സിംഗപ്പൂർ", "Manila": "മനില", "Quezon City": "ക്വസോൺ സിറ്റി", "Bangkok": "ബാങ്കോക്ക്", "Cairo": "കെയ്റോ",
  "Alexandria": "അലക്സാണ്ട്രിയ", "Amman": "അമ്മാൻ", "Beirut": "ബെയ്റൂട്ട്", "Damascus": "ദമാസ്കസ്", "Baghdad": "ബാഗ്ദാദ്",
  "Istanbul": "ഇസ്താംബുൾ", "Ankara": "അങ്കാറ", "Tehran": "ടെഹ്റാൻ", "Isfahan": "ഇസ്ഫഹാൻ", "Mashhad": "മശ്ഹദ്",
  "Jerusalem": "ജറുസലേം", "Gaza": "ഗാസ", "Lagos": "ലാഗോസ്", "Kano": "കാനോ", "Nairobi": "നെയ്റോബി",
  "Casablanca": "കാസബ്ലാങ്ക", "Rabat": "റബാത്ത്", "Algiers": "അൾജിയേഴ്സ്", "Tunis": "ടുണിസ്", "Khartoum": "ഖാർത്തൂം",
  "Addis Ababa": "അഡിസ് അബാബ", "Accra": "അക്ര", "Dakar": "ഡാകർ", "New York": "ന്യൂയോർക്ക്", "Chicago": "ഷിക്കാഗോ",
  "Houston": "ഹൂസ്റ്റൺ", "Los Angeles": "ലോസ് ആഞ്ചലസ്", "Washington DC": "വാഷിംഗ്ടൺ ഡി.സി.", "Detroit": "ഡെട്രോയിറ്റ്",
  "London": "ലണ്ടൻ", "Paris": "പാരീസ്", "Berlin": "ബെർലിൻ", "Toronto": "ടൊറന്റോ", "Sydney": "സിഡ്നി",
};

export const COUNTRY_SI: Record<string, string> = {
  "Afghanistan": "ඇෆ්ගනිස්ථානය", "Algeria": "ඇල්ජීරියාව", "Australia": "ඕස්ට්‍රේලියාව", "Bahrain": "බහරේනය",
  "Bangladesh": "බංග්ලාදේශය", "Canada": "කැනඩාව", "Egypt": "ඊජිප්තුව", "Ethiopia": "ඉතියෝපියාව", "France": "ප්‍රංශය",
  "Germany": "ජර්මනිය", "Ghana": "ඝානාව", "India": "ඉන්දියාව", "Indonesia": "ඉන්දුනීසියාව", "Iran": "ඉරානය",
  "Iraq": "ඉරාකය", "Jordan": "ජෝර්දානය", "Kenya": "කෙන්යාව", "Kuwait": "කුවේටය", "Lebanon": "ලෙබනනය",
  "Malaysia": "මැලේසියාව", "Morocco": "මොරොක්කෝව", "Nepal": "නේපාලය", "Nigeria": "නයිජීරියාව", "Oman": "ඕමානය",
  "Pakistan": "පාකිස්ථානය", "Palestine": "පලස්තීනය", "Philippines": "පිලිපීනය", "Qatar": "කටාර්",
  "Saudi Arabia": "සවුදි අරාබිය", "Senegal": "සෙනගාලය", "Singapore": "සිංගප්පූරුව",
  "Sri Lanka": "ශ්‍රී ලංකාව", "Sudan": "සුඩානය", "Syria": "සිරියාව", "Thailand": "තායිලන්තය", "Tunisia": "ටියුනීසියාව",
  "Turkey": "තුර්කිය", "United Arab Emirates": "එක්සත් අරාබි එමීර් රාජ්‍යය", "United Kingdom": "එක්සත් රාජධානිය",
  "United States": "ඇමරිකා එක්සත් ජනපදය", "Yemen": "යේමනය",
};

export const CITY_NAMES_SI: Record<string, string> = {
  "Dubai": "ඩුබායි", "Abu Dhabi": "අබුඩාබි", "Sharjah": "සාජා", "Riyadh": "රියාද්", "Jeddah": "ජෙඩා",
  "Mecca": "මක්කා", "Medina": "මදීනා", "Doha": "දෝහා", "Kuwait City": "කුවේට් නගරය", "Manama": "මනාමා",
  "Muscat": "මස්කට්", "Sana'a": "සානා", "Karachi": "කරච්චි", "Lahore": "ලාහෝර්", "Islamabad": "ඉස්ලාමාබාද්",
  "Dhaka": "ඩකා", "Chittagong": "චිතගොං", "Mumbai": "මුම්බායි", "Delhi": "දිල්ලි", "Hyderabad": "හයිද්‍රාබාද්",
  "Bangalore": "බැංගලෝර්", "Chennai": "චෙන්නායි", "Colombo": "කොළඹ", "Kathmandu": "කත්මණ්ඩු", "Kabul": "කාබුල්",
  "Jakarta": "ජකර්තා", "Surabaya": "සුරබායා", "Bandung": "බැන්ඩුං", "Kuala Lumpur": "ක්වාලාලම්පූර්",
  "Singapore": "සිංගප්පූරුව", "Manila": "මැනිලා", "Quezon City": "ක්වෙසොන් සිටි", "Bangkok": "බැංකොක්", "Cairo": "කයිරෝ",
  "Alexandria": "ඇලෙක්සැන්ඩ්‍රියාව", "Amman": "අම්මාන්", "Beirut": "බීරූට්", "Damascus": "දමස්කස්", "Baghdad": "බැග්ඩෑඩ්",
  "Istanbul": "ඉස්තාන්බුල්", "Ankara": "අන්කාරා", "Tehran": "ටෙහෙරාන්", "Isfahan": "ඉස්ෆහාන්", "Mashhad": "මෂ්හාඩ්",
  "Jerusalem": "ජෙරුසලම", "Gaza": "ගාසා", "Lagos": "ලාගෝස්", "Kano": "කානෝ", "Nairobi": "නයිරෝබි",
  "Casablanca": "කැසබ්ලැන්කා", "Rabat": "රබාත්", "Algiers": "ඇල්ජියර්ස්", "Tunis": "ටියුනිස්", "Khartoum": "කාර්ටුම්",
  "Addis Ababa": "අඩිස් අබාබා", "Accra": "අක්රා", "Dakar": "ඩකාර්", "New York": "නිව්යෝර්ක්", "Chicago": "චිකාගෝ",
  "Houston": "හූස්ටන්", "Los Angeles": "ලොස් ඇන්ජලීස්", "Washington DC": "වොෂින්ටන් ඩී.සී.", "Detroit": "ඩෙට්‍රොයිට්",
  "London": "ලන්ඩන්", "Paris": "පැරිස්", "Berlin": "බර්ලින්", "Toronto": "ටොරොන්ටෝ", "Sydney": "සිඩ්නි",
};

export function getLocalizedCountryName(country: string, language: string): string {
  if (language === 'ar') return COUNTRY_AR[country] || country;
  if (language === 'ur') return COUNTRY_UR[country] || country;
  if (language === 'hi') return COUNTRY_HI[country] || country;
  if (language === 'ml') return COUNTRY_ML[country] || country;
  if (language === 'si') return COUNTRY_SI[country] || country;
  return country;
}

export function getLocalizedCityName(city: string, language: string): string {
  if (language === 'ar') return CITY_NAMES_AR[city] || city;
  if (language === 'ur') return CITY_NAMES_UR[city] || city;
  if (language === 'hi') return CITY_NAMES_HI[city] || city;
  if (language === 'ml') return CITY_NAMES_ML[city] || city;
  if (language === 'si') return CITY_NAMES_SI[city] || city;
  return city;
}

export const CITIES: City[] = [
  { name: "Dubai", country: "United Arab Emirates", latitude: 25.20, longitude: 55.27 },
  { name: "Abu Dhabi", country: "United Arab Emirates", latitude: 24.45, longitude: 54.38 },
  { name: "Sharjah", country: "United Arab Emirates", latitude: 25.35, longitude: 55.39 },
  { name: "Riyadh", country: "Saudi Arabia", latitude: 24.71, longitude: 46.68 },
  { name: "Jeddah", country: "Saudi Arabia", latitude: 21.49, longitude: 39.19 },
  { name: "Mecca", country: "Saudi Arabia", latitude: 21.39, longitude: 39.86 },
  { name: "Medina", country: "Saudi Arabia", latitude: 24.47, longitude: 39.61 },
  { name: "Doha", country: "Qatar", latitude: 25.29, longitude: 51.53 },
  { name: "Kuwait City", country: "Kuwait", latitude: 29.38, longitude: 47.98 },
  { name: "Manama", country: "Bahrain", latitude: 26.23, longitude: 50.58 },
  { name: "Muscat", country: "Oman", latitude: 23.59, longitude: 58.38 },
  { name: "Sana'a", country: "Yemen", latitude: 15.37, longitude: 44.19 },
  { name: "Karachi", country: "Pakistan", latitude: 24.86, longitude: 67.01 },
  { name: "Lahore", country: "Pakistan", latitude: 31.55, longitude: 74.36 },
  { name: "Islamabad", country: "Pakistan", latitude: 33.68, longitude: 73.05 },
  { name: "Dhaka", country: "Bangladesh", latitude: 23.81, longitude: 90.41 },
  { name: "Chittagong", country: "Bangladesh", latitude: 22.36, longitude: 91.81 },
  { name: "Mumbai", country: "India", latitude: 19.08, longitude: 72.88 },
  { name: "Delhi", country: "India", latitude: 28.61, longitude: 77.21 },
  { name: "Hyderabad", country: "India", latitude: 17.39, longitude: 78.49 },
  { name: "Bangalore", country: "India", latitude: 12.97, longitude: 77.59 },
  { name: "Chennai", country: "India", latitude: 13.08, longitude: 80.27 },
  { name: "Colombo", country: "Sri Lanka", latitude: 6.93, longitude: 79.86 },
  { name: "Kathmandu", country: "Nepal", latitude: 27.72, longitude: 85.32 },
  { name: "Kabul", country: "Afghanistan", latitude: 34.56, longitude: 69.18 },
  { name: "Jakarta", country: "Indonesia", latitude: -6.21, longitude: 106.85 },
  { name: "Surabaya", country: "Indonesia", latitude: -7.26, longitude: 112.75 },
  { name: "Bandung", country: "Indonesia", latitude: -6.91, longitude: 107.61 },
  { name: "Kuala Lumpur", country: "Malaysia", latitude: 3.14, longitude: 101.69 },
  { name: "Singapore", country: "Singapore", latitude: 1.35, longitude: 103.82 },
  { name: "Manila", country: "Philippines", latitude: 14.60, longitude: 120.98 },
  { name: "Quezon City", country: "Philippines", latitude: 14.68, longitude: 121.05 },
  { name: "Bangkok", country: "Thailand", latitude: 13.76, longitude: 100.50 },
  { name: "Cairo", country: "Egypt", latitude: 30.04, longitude: 31.24 },
  { name: "Alexandria", country: "Egypt", latitude: 31.20, longitude: 29.92 },
  { name: "Amman", country: "Jordan", latitude: 31.95, longitude: 35.91 },
  { name: "Beirut", country: "Lebanon", latitude: 33.89, longitude: 35.50 },
  { name: "Damascus", country: "Syria", latitude: 33.51, longitude: 36.28 },
  { name: "Baghdad", country: "Iraq", latitude: 33.31, longitude: 44.37 },
  { name: "Istanbul", country: "Turkey", latitude: 41.01, longitude: 28.98 },
  { name: "Ankara", country: "Turkey", latitude: 39.93, longitude: 32.86 },
  { name: "Tehran", country: "Iran", latitude: 35.69, longitude: 51.39 },
  { name: "Isfahan", country: "Iran", latitude: 32.65, longitude: 51.67 },
  { name: "Mashhad", country: "Iran", latitude: 36.26, longitude: 59.62 },
  { name: "Jerusalem", country: "Palestine", latitude: 31.77, longitude: 35.22 },
  { name: "Gaza", country: "Palestine", latitude: 31.50, longitude: 34.47 },
  { name: "Lagos", country: "Nigeria", latitude: 6.52, longitude: 3.38 },
  { name: "Kano", country: "Nigeria", latitude: 12.00, longitude: 8.52 },
  { name: "Nairobi", country: "Kenya", latitude: -1.29, longitude: 36.82 },
  { name: "Casablanca", country: "Morocco", latitude: 33.57, longitude: -7.59 },
  { name: "Rabat", country: "Morocco", latitude: 34.02, longitude: -6.84 },
  { name: "Algiers", country: "Algeria", latitude: 36.75, longitude: 3.06 },
  { name: "Tunis", country: "Tunisia", latitude: 36.81, longitude: 10.18 },
  { name: "Khartoum", country: "Sudan", latitude: 15.50, longitude: 32.56 },
  { name: "Addis Ababa", country: "Ethiopia", latitude: 9.03, longitude: 38.74 },
  { name: "Accra", country: "Ghana", latitude: 5.60, longitude: -0.19 },
  { name: "Dakar", country: "Senegal", latitude: 14.72, longitude: -17.47 },
  { name: "New York", country: "United States", latitude: 40.71, longitude: -74.01 },
  { name: "Chicago", country: "United States", latitude: 41.88, longitude: -87.63 },
  { name: "Houston", country: "United States", latitude: 29.76, longitude: -95.37 },
  { name: "Los Angeles", country: "United States", latitude: 34.05, longitude: -118.24 },
  { name: "Washington DC", country: "United States", latitude: 38.91, longitude: -77.04 },
  { name: "Detroit", country: "United States", latitude: 42.33, longitude: -83.05 },
  { name: "London", country: "United Kingdom", latitude: 51.51, longitude: -0.13 },
  { name: "Paris", country: "France", latitude: 48.86, longitude: 2.35 },
  { name: "Berlin", country: "Germany", latitude: 52.52, longitude: 13.41 },
  { name: "Toronto", country: "Canada", latitude: 43.65, longitude: -79.38 },
  { name: "Sydney", country: "Australia", latitude: -33.87, longitude: 151.21 },
];