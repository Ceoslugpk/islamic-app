import { ISLAMIC_EVENTS, getNextEvent } from './islamicEvents';

export interface RamadanGuideSection {
  id: string;
  title: string;
  arabicTitle?: string;
  items: RamadanGuideItem[];
}

export interface RamadanGuideItem {
  id: string;
  title: string;
  arabic?: string;
  transliteration?: string;
  translation: string;
  reference: string;
  collection: string;
  bookNumber?: string;
  hadithNumber?: string;
  grades?: string;
}

export interface SeasonalBanner {
  isRamadan: boolean;
  isEidAlFitr: boolean;
  isEidAlAdha: boolean;
  daysUntilRamadan?: number;
  daysUntilEidAlFitr?: number;
  daysUntilEidAlAdha?: number;
  daysUntilLaylatulQadr?: number;
  currentHijriMonth?: number;
  currentHijriDay?: number;
}

export const RAMADAN_GUIDE_SECTIONS: RamadanGuideSection[] = [
  {
    id: 'fasting-rules',
    title: 'Fasting Rules (Ahkam al-Siyam)',
    arabicTitle: 'أحكام الصيام',
    items: [
      {
        id: 'intention',
        title: 'Intention (Niyyah) for Fasting',
        arabic: 'وَبِصَوْمِ غَدٍ نَوَيْتُ مِنْ شَهْرِ رَمَضَانَ',
        transliteration: 'Wa bi-sawmi ghadin nawaytu min shahri Ramadan',
        translation: 'And I intend to fast tomorrow for the month of Ramadan.',
        reference: 'Sunan Abi Dawood 2454',
        collection: 'abudawud',
        bookNumber: '13',
        hadithNumber: '2454',
        grades: 'Sahih (Al-Albani)',
      },
      {
        id: 'suhoor',
        title: 'Suhoor (Pre-dawn Meal) is Blessed',
        arabic: 'تَسَحَّرُوا فَإِنَّ فِي السُّحُورِ بَرَكَةً',
        transliteration: 'Tasahharu fa-inna fi as-suhuri barakah',
        translation: 'Eat suhoor, for in suhoor there is blessing.',
        reference: 'Sahih al-Bukhari 1923 · Sahih Muslim 1095',
        collection: 'bukhari',
        bookNumber: '30',
        hadithNumber: '1923',
        grades: 'Muttafaqun Alayh',
      },
      {
        id: 'iftar',
        title: 'Hasten to Break the Fast (Iftar)',
        arabic: 'لَا يَزَالُ النَّاسُ بِخَيْرٍ مَا عَجَّلُوا الْفِطْرَ',
        transliteration: 'La yazalu an-nasu bi-khayrin ma \'ajjalu al-fitr',
        translation: 'The people will remain upon goodness as long as they hasten to break the fast.',
        reference: 'Sahih al-Bukhari 1957 · Sahih Muslim 1098',
        collection: 'bukhari',
        bookNumber: '30',
        hadithNumber: '1957',
        grades: 'Muttafaqun Alayh',
      },
      {
        id: 'iftar-dua',
        title: 'Dua upon Breaking the Fast',
        arabic: 'ذَهَبَ الظَّمَأُ وَابْتَلَّتِ الْعُرُوقُ وَثَبَتَ الْأَجْرُ إِنْ شَاءَ اللَّهُ',
        transliteration: 'Dhahabadh-dhama\'u wabtallatil-\'urooqu wa thabatal-ajru in sha Allah',
        translation: 'The thirst has gone, the veins are moistened, and the reward is confirmed, if Allah wills.',
        reference: 'Sunan Abi Dawood 2357',
        collection: 'abudawud',
        bookNumber: '13',
        hadithNumber: '2357',
        grades: 'Sahih (Al-Albani)',
      },
      {
        id: 'iftar-dua-2',
        title: 'Alternative Iftar Dua',
        arabic: 'اللَّهُمَّ إِنِّي لَكَ صُمْتُ وَعَلَىٰ رِزْقِكَ أَفْطَرْتُ',
        transliteration: 'Allahumma innee laka sumtu wa \'ala rizqika aftartu',
        translation: 'O Allah, for You I fasted and upon Your provision I have broken my fast.',
        reference: 'Sunan Abi Dawood 2358',
        collection: 'abudawud',
        bookNumber: '13',
        hadithNumber: '2358',
        grades: 'Sahih (Al-Albani)',
      },
      {
        id: 'missed-fasts',
        title: 'Making Up Missed Fasts (Qada)',
        arabic: 'مَنْ أَفْطَرَ يَوْمًا مِنْ رَمَضَانَ مِنْ غَيْرِ عُذْرٍ وَلَا مَرَضٍ لَمْ يَقْضِهِ صِيَامُ الدَّهْرِ كُلِّهِ وَإِنْ صَامَهُ',
        transliteration: 'Man aftara yawman min Ramadana min ghayri \'udhrin wa la maradin lam yaqdhihi siyamu ad-dahri kullihi wa in samahu',
        translation: 'Whoever breaks a day of Ramadan without a valid excuse or illness, fasting the entire lifetime will not make up for it, even if he fasts it.',
        reference: 'Sunan Abi Dawood 2396 · Jami at-Tirmidhi 712',
        collection: 'abudawud',
        bookNumber: '13',
        hadithNumber: '2396',
        grades: 'Sahih (Al-Albani)',
      },
    ],
  },
  {
    id: 'laylatul-qadr',
    title: 'Laylatul Qadr (Night of Decree)',
    arabicTitle: 'ليلة القدر',
    items: [
      {
        id: 'seek-last-10',
        title: 'Seek it in the Last Ten Nights',
        arabic: 'أَرَى رُؤْيَاكُمْ قَدْ تَوَاطَأَتْ فِي السَّبْعِ الأَوَاخِرِ، فَمَنْ كَانَ مُتَحَرِّيَهَا فَلْيَتَحَرَّهَا فِي السَّبْعِ الأَوَاخِرِ',
        transliteration: 'Ara ru\'yakum qad tawata\'at fi as-sab\'i al-awakhir, faman kana mutaharriyaha falyataharrha fi as-sab\'i al-awakhir',
        translation: 'I see that your dreams agree upon the last seven nights, so whoever seeks it should seek it in the last seven nights.',
        reference: 'Sahih al-Bukhari 2015',
        collection: 'bukhari',
        bookNumber: '32',
        hadithNumber: '2015',
        grades: 'Sahih',
      },
      {
        id: 'odd-nights',
        title: 'Seek on Odd Nights (21, 23, 25, 27, 29)',
        arabic: 'الْتَمِسُوهَا فِي الْعَشْرِ الأَوَاخِرِ وَالْتَمِسُوهَا فِي كُلِّ وِتْرٍ',
        transliteration: 'Altamisuha fi al-\'ashri al-awakhiri waltamisuha fi kulli witr',
        translation: 'Seek it in the last ten nights, and seek it on every odd night.',
        reference: 'Sahih al-Bukhari 2017 · Sahih Muslim 1169',
        collection: 'bukhari',
        bookNumber: '32',
        hadithNumber: '2017',
        grades: 'Muttafaqun Alayh',
      },
      {
        id: 'laylatul-qadr-dua',
        title: 'Dua for Laylatul Qadr (from Aisha)',
        arabic: 'اللَّهُمَّ إِنَّكَ عَفُوٌّ تُحِبُّ الْعَفْوَ فَاعْفُ عَنِّي',
        transliteration: 'Allahumma innaka \'Afuwwun tuhibbul-\'afwa fa\'fu \'annee',
        translation: 'O Allah, indeed You are Pardoning and love pardon, so pardon me.',
        reference: 'Jami at-Tirmidhi 3513 · Sunan Ibn Majah 3850',
        collection: 'tirmidhi',
        bookNumber: '8',
        hadithNumber: '3513',
        grades: 'Sahih (Darussalam)',
      },
      {
        id: 'forgiveness-lq',
        title: 'Forgiveness for Standing in Prayer on LQ',
        arabic: 'مَنْ قَامَ لَيْلَةَ الْقَدْرِ إِيمَانًا وَاحْتِسَابًا غُفِرَ لَهُ مَا تَقَدَّمَ مِنْ ذَنْبِهِ',
        transliteration: 'Man qama laylatal-qadri imanan wa ihtisaban ghufira lahu ma taqaddama min dhanbihi',
        translation: 'Whoever stands (in prayer) on the Night of Decree with faith and seeking reward, his previous sins will be forgiven.',
        reference: 'Sahih al-Bukhari 1901 · Sahih Muslim 760',
        collection: 'bukhari',
        bookNumber: '32',
        hadithNumber: '1901',
        grades: 'Muttafaqun Alayh',
      },
    ],
  },
  {
    id: 'itikaf',
    title: 'Itikaf (Spiritual Retreat)',
    arabicTitle: 'الاعتكاف',
    items: [
      {
        id: 'prophet-itikaf',
        title: 'Prophet ﷺ Performed Itikaf in Last Ten Days',
        arabic: 'كَانَ رَسُولُ اللَّهِ صلى الله عليه وسلم يَعْتَكِفُ الْعَشْرَ الْوُسُطَ مِنْ رَمَضَانَ... فَقَالَ: مَنِ اعْتَكَفَ مَعِي فَلْيَعْتَكِفِ الْعَشْرَ الأَوَاخِرَ',
        transliteration: 'Kana rasulullahi sallallahu alayhi wa sallam ya\'takifu al-\'ashra al-wusta min Ramadan... faqala: mani i\'takafa ma\'i falya\'takif al-\'ashra al-awakhir',
        translation: 'The Messenger of Allah ﷺ used to perform itikaf in the middle ten days of Ramadan... then he said: "Whoever performed itikaf with me should perform itikaf for the last ten days."',
        reference: 'Muwatta Malik 19.10 · Sahih al-Bukhari 2026',
        collection: 'malik',
        bookNumber: '19',
        hadithNumber: '10',
        grades: 'Sahih',
      },
      {
        id: 'itikaf-rules',
        title: 'Rules of Itikaf: Stay in Mosque, Only Leave for Necessity',
        arabic: 'كَانَ رَسُولُ اللَّهِ صلى الله عليه وسلم إِذَا اعْتَكَفَ لاَ يَدْخُلُ الْبَيْتَ إِلاَّ لِحَاجَةِ الإِنْسَانِ',
        transliteration: 'Kana rasulullahi sallallahu alayhi wa sallam idha i\'takafa la yadkhulu al-bayta illa li-hajati al-insan',
        translation: 'When the Messenger of Allah ﷺ performed itikaf, he would not enter the house except for the need of a human being (to relieve oneself).',
        reference: 'Sahih al-Bukhari 2029 · Sahih Muslim 297',
        collection: 'bukhari',
        bookNumber: '33',
        hadithNumber: '2029',
        grades: 'Muttafaqun Alayh',
      },
      {
        id: 'itikaf-fasting',
        title: 'Itikaf Requires Fasting',
        arabic: 'لَا اعْتِكَافَ إِلَّا بِصِيَامٍ',
        transliteration: 'La i\'tikafa illa bi-siyam',
        translation: 'There is no itikaf except with fasting.',
        reference: 'Muwatta Malik 19.4 · Quran 2:187',
        collection: 'malik',
        bookNumber: '19',
        hadithNumber: '4',
        grades: 'Authentic (Malik)',
      },
    ],
  },
  {
    id: 'zakat-al-fitr',
    title: 'Zakat al-Fitr (Fitrana)',
    arabicTitle: 'زكاة الفطر',
    items: [
      {
        id: 'obligation',
        title: 'Obligation of Zakat al-Fitr',
        arabic: 'فَرَضَ رَسُولُ اللَّهِ صلى الله عليه وسلم زَكَاةَ الْفِطْرِ صَاعًا مِنْ تَمْرٍ، أَوْ صَاعًا مِنْ شَعِيرٍ عَلَى الْعَبْدِ وَالْحُرِّ، وَالذَّكَرِ وَالأُنْثَى، وَالصَّغِيرِ وَالْكَبِيرِ مِنَ الْمُسْلِمِينَ',
        transliteration: 'Farada rasulullahi sallallahu alayhi wa sallam zakata al-fitri sa\'an min tamrin, aw sa\'an min sha\'irin \'ala al-abdi wal-hurri, wadh-dhakari wal-untha, was-saghiri wal-kabiri minal-muslimin',
        translation: 'The Messenger of Allah ﷺ enjoined Zakat al-Fitr as one sa\' of dates or one sa\' of barley upon the slave and free, male and female, young and old among the Muslims.',
        reference: 'Sahih al-Bukhari 1503 · Sahih Muslim 984',
        collection: 'bukhari',
        bookNumber: '24',
        hadithNumber: '1503',
        grades: 'Muttafaqun Alayh',
      },
      {
        id: 'timing',
        title: 'Pay Before Eid Prayer',
        arabic: 'وَأَمَرَ بِهَا أَنْ تُؤَدَّى قَبْلَ خُرُوجِ النَّاسِ إِلَى الصَّلَاةِ',
        transliteration: 'Wa amara biha an tu\'adda qabla khurujin-nasi ilas-salah',
        translation: 'And he ordered that it be paid before the people go out to the (Eid) prayer.',
        reference: 'Sahih al-Bukhari 1503 · Jami at-Tirmidhi 673',
        collection: 'bukhari',
        bookNumber: '24',
        hadithNumber: '1503',
        grades: 'Muttafaqun Alayh',
      },
      {
        id: 'amounts',
        title: 'Permissible Amounts (Sa\' of Food)',
        arabic: 'كُنَّا نُخْرِجُ زَكَاةَ الْفِطْرِ صَاعًا مِنْ طَعَامٍ، أَوْ صَاعًا مِنْ شَعِيرٍ، أَوْ صَاعًا مِنْ تَمْرٍ، أَوْ صَاعًا مِنْ أَقِطٍ، أَوْ صَاعًا مِنْ زَبِيبٍ',
        transliteration: 'Kunna nukhriju zakata al-fitri sa\'an min ta\'amin, aw sa\'an min sha\'irin, aw sa\'an min tamrin, aw sa\'an min aqitin, aw sa\'an min zabib',
        translation: 'We used to give Zakat al-Fitr as one sa\' of food, or one sa\' of barley, or one sa\' of dates, or one sa\' of dried yogurt, or one sa\' of raisins.',
        reference: 'Sahih al-Bukhari 1506 · Sahih Muslim 985',
        collection: 'bukhari',
        bookNumber: '24',
        hadithNumber: '1506',
        grades: 'Muttafaqun Alayh',
      },
    ],
  },
  {
    id: 'eid-salah',
    title: 'Eid Salah (Prayer)',
    arabicTitle: 'صلاة العيد',
    items: [
      {
        id: 'prayer-before-khutbah',
        title: 'Prayer Before Khutbah (Sermon)',
        arabic: 'شَهِدْتُ الصَّلَاةَ مَعَ رَسُولِ اللَّهِ صلى الله عليه وسلم فِي يَوْمِ عِيدٍ فَبَدَأَ بِالصَّلَاةِ قَبْلَ الْخُطْبَةِ بِغَيْرِ أَذَانٍ وَلاَ إِقَامَةٍ',
        transliteration: 'Shahidtu as-salata ma\'a rasulillahi sallallahu alayhi wa sallam fi yawmi \'idin fabada\'a bis-salah qabla al-khutbati bighayri adhani wa la iqamah',
        translation: 'I attended the prayer with the Messenger of Allah ﷺ on the day of Eid. He started with the prayer before the khutbah, without adhan or iqamah.',
        reference: 'Sahih al-Bukhari 956 · Sahih Muslim 885 · Sunan an-Nasa\'i 1575',
        collection: 'bukhari',
        bookNumber: '13',
        hadithNumber: '956',
        grades: 'Muttafaqun Alayh',
      },
      {
        id: 'takbirat-eid',
        title: 'Takbirat in Eid Prayer (7 in First, 5 in Second)',
        arabic: 'كَانَ يُكَبِّرُ فِي الْعِيدَيْنِ فِي الأُولَى سَبْعًا قَبْلَ الْقِرَاءَةِ وَفِي الآخِرَةِ خَمْسًا قَبْلَ الْقِرَاءَةِ',
        transliteration: 'Kana yukabbiru fi al-\'idayni fi al-ula sab\'an qabla al-qira\'ati wa fil-akhirati khamsan qabla al-qira\'ah',
        translation: 'He used to say takbir in the two Eids: seven times in the first (rak\'ah) before recitation, and five times in the second before recitation.',
        reference: 'Sunan Ibn Majah 1277',
        collection: 'ibnmajah',
        bookNumber: '5',
        hadithNumber: '1277',
        grades: 'Hasan (Darussalam)',
      },
      {
        id: 'recitation-eid',
        title: 'Recitation in Eid Prayer (Surah Al-A\'la & Al-Ghashiyah)',
        arabic: 'كَانَ النَّبِيُّ صلى الله عليه وسلم يَقْرَأُ فِي الْعِيدَيْنِ وَفِي الْجُمُعَةِ بِـ ﴿سَبِّحِ اسْمَ رَبِّكَ الأَعْلَى﴾ وَ ﴿هَلْ أَتَاكَ حَدِيثُ الْغَاشِيَةِ﴾',
        transliteration: 'Kana an-nabiyyu sallallahu alayhi wa sallam yaqra\'u fi al-\'idayni wa fil-jumu\'ati bi-Sabbih isma rabbikal-a\'la wa Hal ataka hadithul-ghashiyah',
        translation: 'The Prophet ﷺ used to recite in the two Eids and Friday prayer: "Glorify the Name of your Lord, the Most High" and "Has there come to you the narration of the Overwhelming?"',
        reference: 'Jami at-Tirmidhi 533',
        collection: 'tirmidhi',
        bookNumber: '5',
        hadithNumber: '533',
        grades: 'Sahih (Darussalam)',
      },
      {
        id: 'no-fasting-eid',
        title: 'Prohibition of Fasting on Eid Days',
        arabic: 'نَهَى عَنْ صِيَامِ هَذَيْنِ الْيَوْمَيْنِ، يَوْمِ الْفِطْرِ وَيَوْمِ الأَضْحَى',
        transliteration: 'Naha \'an siyami hazayni al-yawmayni, yawmil-fitri wa yawmil-adha',
        translation: 'He forbade fasting on these two days: the Day of Fitr and the Day of Adha.',
        reference: 'Sahih al-Bukhari 1992 · Sahih Muslim 1969 · Sunan Ibn Majah 1722',
        collection: 'bukhari',
        bookNumber: '30',
        hadithNumber: '1992',
        grades: 'Muttafaqun Alayh',
      },
    ],
  },
  {
    id: 'takbirat-tashriq',
    title: 'Takbirat al-Tashriq (Days of Tashriq)',
    arabicTitle: 'تكبيرات التشريق',
    items: [
      {
        id: 'takbir-text',
        title: 'The Takbir Text',
        arabic: 'اللَّهُ أَكْبَرُ، اللَّهُ أَكْبَرُ، لَا إِلَٰهَ إِلَّا اللَّهُ، وَاللَّهُ أَكْبَرُ، اللَّهُ أَكْبَرُ، وَلِلَّهِ الْحَمْدُ',
        transliteration: 'Allahu Akbar, Allahu Akbar, la ilaha illa Allah, wa Allahu Akbar, Allahu Akbar, wa lillahil-hamd',
        translation: 'Allah is Greatest, Allah is Greatest, there is no deity except Allah, and Allah is Greatest, Allah is Greatest, and to Allah belongs all praise.',
        reference: 'Quran 2:185 · Sahih al-Bukhari 974 (Chapter on Takbir)',
        collection: 'quran',
        grades: 'Quranic / Authentic Sunnah',
      },
      {
        id: 'when-to-say',
        title: 'When to Recite (After Every Fard Prayer)',
        arabic: 'مِنْ صَلَاةِ الْفَجْرِ يَوْمَ عَرَفَةَ إِلَى صَلَاةِ الْعَصْرِ آخِرَ أَيَّامِ التَّشْرِيقِ',
        transliteration: 'Min salatil-fajri yawma \'Arafata ila salatil-\'asri akhiri ayyami at-tashriq',
        translation: 'From Fajr prayer on the Day of Arafah until Asr prayer on the last day of Tashriq (13th Dhul Hijjah).',
        reference: 'Muwatta Malik 15.5 · Musannaf Ibn Abi Shaybah',
        collection: 'malik',
        bookNumber: '15',
        hadithNumber: '5',
        grades: 'Authentic (Companions\' Practice)',
      },
    ],
  },
  {
    id: 'eid-duas',
    title: 'Eid Duas & Adhkar',
    arabicTitle: 'أدعية العيد والأذكار',
    items: [
      {
        id: 'eid-greeting',
        title: 'Eid Greeting (Companions\' Practice)',
        arabic: 'تَقَبَّلَ اللَّهُ مِنَّا وَمِنْكُمْ',
        transliteration: 'Taqabbalallahu minna wa minkum',
        translation: 'May Allah accept (good deeds) from us and from you.',
        reference: 'Musannaf Ibn Abi Shaybah 2/346 · Authentic chain from Companions',
        collection: 'companions',
        grades: 'Authentic (Sahih chain)',
      },
      {
        id: 'morning-eid',
        title: 'Morning Adhkar on Eid Day',
        arabic: 'أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ، لَا إِلَٰهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ',
        transliteration: 'Asbahna wa asbahal-mulku lillah, wal-hamdu lillah, la ilaha illallahu wahdahu la shareeka lah',
        translation: 'We have entered the morning and the dominion belongs to Allah, and all praise is due to Allah. None has the right to be worshipped except Allah alone without partner.',
        reference: 'Sahih Muslim 2723 · Hisn al-Muslim #27',
        collection: 'hisn',
        grades: 'Sahih',
      },
    ],
  },
];

export function getSeasonalBanner(
  hijriYear: number,
  hijriMonth: number,
  hijriDay: number
): SeasonalBanner {
  const ramadanEvent = ISLAMIC_EVENTS.find(e => e.hijriMonth === 9 && e.hijriDay === 1);
  const laylatulQadrEvent = ISLAMIC_EVENTS.find(e => e.hijriMonth === 9 && e.hijriDay === 27);
  const eidFitrEvent = ISLAMIC_EVENTS.find(e => e.hijriMonth === 10 && e.hijriDay === 1);
  const eidAdhaEvent = ISLAMIC_EVENTS.find(e => e.hijriMonth === 12 && e.hijriDay === 10);

  const currentOrdinal = hijriToOrdinal(hijriYear, hijriMonth, hijriDay);

  const ramadanOrdinal = ramadanEvent ? hijriToOrdinal(hijriYear, 9, 1) : 0;
  const laylatulQadrOrdinal = laylatulQadrEvent ? hijriToOrdinal(hijriYear, 9, 27) : 0;
  const eidFitrOrdinal = eidFitrEvent ? hijriToOrdinal(hijriYear, 10, 1) : 0;
  const eidAdhaOrdinal = eidAdhaEvent ? hijriToOrdinal(hijriYear, 12, 10) : 0;

  const isRamadan = hijriMonth === 9;
  const isEidAlFitr = hijriMonth === 10 && hijriDay === 1;
  const isEidAlAdha = hijriMonth === 12 && hijriDay === 10;

  let daysUntilRamadan: number | undefined;
  let daysUntilEidAlFitr: number | undefined;
  let daysUntilEidAlAdha: number | undefined;
  let daysUntilLaylatulQadr: number | undefined;

  if (!isRamadan) {
    daysUntilRamadan = ramadanOrdinal - currentOrdinal;
    if (daysUntilRamadan < 0) {
      daysUntilRamadan = hijriToOrdinal(hijriYear + 1, 9, 1) - currentOrdinal;
    }
  }

  if (!isEidAlFitr) {
    daysUntilEidAlFitr = eidFitrOrdinal - currentOrdinal;
    if (daysUntilEidAlFitr < 0) {
      daysUntilEidAlFitr = hijriToOrdinal(hijriYear + 1, 10, 1) - currentOrdinal;
    }
  }

  if (!isEidAlAdha) {
    daysUntilEidAlAdha = eidAdhaOrdinal - currentOrdinal;
    if (daysUntilEidAlAdha < 0) {
      daysUntilEidAlAdha = hijriToOrdinal(hijriYear + 1, 12, 10) - currentOrdinal;
    }
  }

  if (isRamadan && hijriDay <= 27) {
    daysUntilLaylatulQadr = laylatulQadrOrdinal - currentOrdinal;
    if (daysUntilLaylatulQadr < 0) daysUntilLaylatulQadr = 0;
  }

  return {
    isRamadan,
    isEidAlFitr,
    isEidAlAdha,
    daysUntilRamadan,
    daysUntilEidAlFitr,
    daysUntilEidAlAdha,
    daysUntilLaylatulQadr,
    currentHijriMonth: hijriMonth,
    currentHijriDay: hijriDay,
  };
}

function hijriToOrdinal(year: number, month: number, day: number): number {
  let ordinal = day;
  for (let m = 1; m < month; m++) {
    ordinal += getHijriMonthLength(year, m);
  }
  for (let y = 1400; y < year; y++) {
    ordinal += isHijriLeapYear(y) ? 355 : 354;
  }
  return ordinal;
}

function isHijriLeapYear(year: number): boolean {
  const cycle = year % 30;
  return [2, 5, 7, 10, 13, 16, 18, 21, 24, 26, 29].includes(cycle);
}

function getHijriMonthLength(year: number, month: number): number {
  const base = month % 2 === 1 ? 30 : 29;
  return month === 12 && isHijriLeapYear(year) ? 30 : base;
}

export const SECTION_ICONS: Record<string, string> = {
  'fasting-rules': 'restaurant-outline',
  'laylatul-qadr': 'star-outline',
  'itikaf': 'mosque-outline',
  'zakat-al-fitr': 'cash-outline',
  'eid-salah': 'hand-left-outline',
  'takbirat-tashriq': 'megaphone-outline',
  'eid-duas': 'heart-outline',
};