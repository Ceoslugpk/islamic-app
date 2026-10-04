import { ISLAMIC_EVENTS } from './islamicEvents';

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
  fullText?: boolean;
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
    id: "fasting-rules",
    title: "Fasting Rules (Ahkam al-Siyam)",
    arabicTitle: "أحكام الصيام",
    items: [
      {
        id: "intention",
        title: "Intention (Niyyah) Before Dawn",
        arabic: "أَخْبَرَنَا إِسْحَاقُ بْنُ إِبْرَاهِيمَ، قَالَ أَنْبَأَنَا سُفْيَانُ، عَنِ الزُّهْرِيِّ، عَنْ حَمْزَةَ بْنِ عَبْدِ اللَّهِ بْنِ عُمَرَ، عَنْ حَفْصَةَ، قَالَتْ لاَ صِيَامَ لِمَنْ لَمْ يُجْمِعِ الصِّيَامَ قَبْلَ الْفَجْرِ ‏.‏",
        translation: "It was narrated that Hafsah said: \"There is no fast for the one who does not intend to fast before dawn.",
        reference: "Sunan an-Nasa'i 2339",
        collection: "nasai",
        bookNumber: "22",
        hadithNumber: "2339",
        grades: "Sahih (Darussalam)",
        fullText: true,
      },
      {
        id: "suhoor",
        title: "Suhoor is a Blessed Sunnah",
        arabic: "حَدَّثَنَا آدَمُ بْنُ أَبِي إِيَاسٍ، حَدَّثَنَا شُعْبَةُ، حَدَّثَنَا عَبْدُ الْعَزِيزِ بْنُ صُهَيْبٍ، قَالَ سَمِعْتُ أَنَسَ بْنَ مَالِكٍ ـ رضى الله عنه ـ قَالَ قَالَ النَّبِيُّ صلى الله عليه وسلم ‏\"‏ تَسَحَّرُوا فَإِنَّ فِي السَّحُورِ بَرَكَةً ‏\"‏‏.‏",
        translation: "Narrated Anas bin Malik: The Prophet (ﷺ) said, \"Take Suhur as there is a blessing in it.\"",
        reference: "Sahih al-Bukhari 1923",
        collection: "bukhari",
        bookNumber: "30",
        hadithNumber: "1923",
        grades: "Sahih",
        fullText: true,
      },
      {
        id: "iftar-hasten",
        title: "Hasten to Break the Fast",
        arabic: "حَدَّثَنَا عَبْدُ اللَّهِ بْنُ يُوسُفَ، أَخْبَرَنَا مَالِكٌ، عَنْ أَبِي حَازِمٍ، عَنْ سَهْلِ بْنِ سَعْدٍ، أَنَّ رَسُولَ اللَّهِ صلى الله عليه وسلم قَالَ ‏\"‏ لاَ يَزَالُ النَّاسُ بِخَيْرٍ مَا عَجَّلُوا الْفِطْرَ ‏\"‏‏.‏",
        translation: "Narrated Sahl bin Sa`d: Allah's Messenger (ﷺ) said, \"The people will remain on the right path as long as they hasten the breaking of the fast.\"",
        reference: "Sahih al-Bukhari 1957",
        collection: "bukhari",
        bookNumber: "30",
        hadithNumber: "1957",
        grades: "Sahih",
        fullText: true,
      },
      {
        id: "iftar-dua",
        title: "Dua Upon Breaking the Fast",
        arabic: "حَدَّثَنَا عَبْدُ اللَّهِ بْنُ مُحَمَّدِ بْنِ يَحْيَى أَبُو مُحَمَّدٍ، حَدَّثَنَا عَلِيُّ بْنُ الْحَسَنِ، أَخْبَرَنِي الْحُسَيْنُ بْنُ وَاقِدٍ، حَدَّثَنَا مَرْوَانُ، - يَعْنِي ابْنَ سَالِمٍ - الْمُقَفَّعُ - قَالَ رَأَيْتُ ابْنَ عُمَرَ يَقْبِضُ عَلَى لِحْيَتِهِ فَيَقْطَعُ مَا زَادَ عَلَى الْكَفِّ وَقَالَ كَانَ رَسُولُ اللَّهِ صلى الله عليه وسلم إِذَا أَفْطَرَ قَالَ ‏\"‏ ذَهَبَ الظَّمَأُ وَابْتَلَّتِ الْعُرُوقُ وَثَبَتَ الأَجْرُ إِنْ شَاءَ اللَّهُ ‏\"‏ ‏.‏",
        translation: "Marwan ibn Salim al-Muqaffa' said: I saw Ibn Umar holding his beard with his hand and cutting what exceeded the handful of it. He (Ibn Umar) said that the Prophet (ﷺ) said when he broke his fast: Thirst has gone, the arteries are moist, and the reward is sure, if Allah wills.",
        reference: "Sunan Abi Dawud 2357",
        collection: "abudawud",
        bookNumber: "14",
        hadithNumber: "2357",
        grades: "Hasan (Al-Albani)",
        fullText: true,
      },
      {
        id: "iftar-dua-mercy",
        title: "Dua: Ask by Allah's Mercy at Iftar",
        arabic: "اللّهُـمَّ إِنَّـي أَسْـأَلُـكَ بِرَحْمَـتِكَ الّتي وَسِـعَت كُلَّ شيء، أَنْ تَغْـفِرَ لي",
        transliteration: "Allāhumma innī as'aluka bi raḥmatika ‘l-latī wasi`at kulla shay' an taghfira lī.",
        translation: "O Allah, I ask You by Your mercy, which encompasses all things, that You forgive me.",
        reference: "Hisn al-Muslim (dhikr 177) · Ibn Majah 1/557 from a supplication of Abdullah bin 'Amr",
        collection: "hisn",
        bookNumber: "1",
        hadithNumber: "177",
        grades: "Hasan (Al-Hafidh)",
      },
      {
        id: "missed-fasts",
        title: "Making Up Missed Fasts (Qada)",
        arabic: "شَهْرُ رَمَضَانَ ٱلَّذِىٓ أُنزِلَ فِيهِ ٱلْقُرْءَانُ هُدًى لِّلنَّاسِ وَبَيِّنَـٰتٍ مِّنَ ٱلْهُدَىٰ وَٱلْفُرْقَانِ ۚ فَمَن شَهِدَ مِنكُمُ ٱلشَّهْرَ فَلْيَصُمْهُ ۖ وَمَن كَانَ مَرِيضًا أَوْ عَلَىٰ سَفَرٍ فَعِدَّةٌ مِّنْ أَيَّامٍ أُخَرَ ۗ يُرِيدُ ٱللَّهُ بِكُمُ ٱلْيُسْرَ وَلَا يُرِيدُ بِكُمُ ٱلْعُسْرَ وَلِتُكْمِلُوا۟ ٱلْعِدَّةَ وَلِتُكَبِّرُوا۟ ٱللَّهَ عَلَىٰ مَا هَدَىٰكُمْ وَلَعَلَّكُمْ تَشْكُرُونَ",
        translation: "The month of Ramaḍān [is that] in which was revealed the Qur’ān, a guidance for the people and clear proofs of guidance and criterion. So whoever sights [the crescent of] the month, let him fast it; and whoever is ill or on a journey - then an equal number of other days. Allāh intends for you ease and does not intend for you hardship and [wants] for you to complete the period and to glorify Allāh for that [to] which He has guided you; and perhaps you will be grateful.",
        reference: "Qur'an 2:185 · quran.com (Saheeh International)",
        collection: "quran",
        grades: "Quran",
      },
      {
        id: "fast-of-deceased",
        title: "Fasts Vowed by the Deceased",
        arabic: "مَنْ مَاتَ وَعَلَيْهِ صِيَامٌ صَامَ عَنْهُ وَلِيُّهُ",
        translation: "If anyone dies when some fast is due from him (i.e. which he could not keep) his heir must fast on his behalf.",
        reference: "Sunan Abi Dawud 2400",
        collection: "abudawud",
        bookNumber: "14",
        hadithNumber: "2400",
        grades: "Sahih (Al-Albani)",
      },
    ],
  },
  {
    id: "laylatul-qadr",
    title: "Laylatul Qadr (Night of Decree)",
    arabicTitle: "ليلة القدر",
    items: [
      {
        id: "seek-last-seven",
        title: "Seek It in the Last Seven Nights",
        arabic: "حَدَّثَنَا عَبْدُ اللَّهِ بْنُ يُوسُفَ، أَخْبَرَنَا مَالِكٌ، عَنْ نَافِعٍ، عَنِ ابْنِ عُمَرَ ـ رضى الله عنهما ـ أَنَّ رِجَالاً، مِنْ أَصْحَابِ النَّبِيِّ صلى الله عليه وسلم أُرُوا لَيْلَةَ الْقَدْرِ فِي الْمَنَامِ فِي السَّبْعِ الأَوَاخِرِ، فَقَالَ رَسُولُ اللَّهِ صلى الله عليه وسلم ‏\"‏ أَرَى رُؤْيَاكُمْ قَدْ تَوَاطَأَتْ فِي السَّبْعِ الأَوَاخِرِ، فَمَنْ كَانَ مُتَحَرِّيَهَا فَلْيَتَحَرَّهَا فِي السَّبْعِ الأَوَاخِرِ ‏\"‏‏.‏",
        translation: "Narrated Ibn `Umar: Some men amongst the companions of the Prophet (ﷺ) were shown in their dreams that the night of Qadr was in the last seven nights of Ramadan. Allah's Messenger (ﷺ) said, \"It seems that all your dreams agree that (the Night of Qadr) is in the last seven nights, and whoever wants to search for it (i.e. the Night of Qadr) should search in the last seven (nights of Ramadan).",
        reference: "Sahih al-Bukhari 2015",
        collection: "bukhari",
        bookNumber: "32",
        hadithNumber: "2015",
        grades: "Sahih",
        fullText: true,
      },
      {
        id: "odd-nights",
        title: "Seek It on the Odd Nights",
        arabic: "حَدَّثَنَا قُتَيْبَةُ بْنُ سَعِيدٍ، حَدَّثَنَا إِسْمَاعِيلُ بْنُ جَعْفَرٍ، حَدَّثَنَا أَبُو سُهَيْلٍ، عَنْ أَبِيهِ، عَنْ عَائِشَةَ ـ رضى الله عنها ـ أَنَّ رَسُولَ اللَّهِ صلى الله عليه وسلم قَالَ ‏\"‏ تَحَرَّوْا لَيْلَةَ الْقَدْرِ فِي الْوِتْرِ مِنَ الْعَشْرِ الأَوَاخِرِ مِنْ رَمَضَانَ ‏\"‏‏.‏",
        translation: "Narrated `Aisha: Allah's Messenger (ﷺ) said, \"Search for the Night of Qadr in the odd nights of the last ten days of Ramadan.\"",
        reference: "Sahih al-Bukhari 2017 · Sahih Muslim 1169",
        collection: "bukhari",
        bookNumber: "32",
        hadithNumber: "2017",
        grades: "Sahih",
        fullText: true,
      },
      {
        id: "forgiveness",
        title: "Forgiveness for Standing on Laylatul Qadr",
        arabic: "حَدَّثَنَا مُسْلِمُ بْنُ إِبْرَاهِيمَ، حَدَّثَنَا هِشَامٌ، حَدَّثَنَا يَحْيَى، عَنْ أَبِي سَلَمَةَ، عَنْ أَبِي هُرَيْرَةَ ـ رضى الله عنه ـ عَنِ النَّبِيِّ صلى الله عليه وسلم قَالَ ‏\"‏ مَنْ قَامَ لَيْلَةَ الْقَدْرِ إِيمَانًا وَاحْتِسَابًا غُفِرَ لَهُ مَا تَقَدَّمَ مِنْ ذَنْبِهِ، وَمَنْ صَامَ رَمَضَانَ إِيمَانًا وَاحْتِسَابًا غُفِرَ لَهُ مَا تَقَدَّمَ مِنْ ذَنْبِهِ ‏\"‏‏.‏",
        translation: "Narrated Abu Huraira: The Prophet (ﷺ) said, \"Whoever established prayers on the night of Qadr out of sincere faith and hoping for a reward from Allah, then all his previous sins will be forgiven; and whoever fasts in the month of Ramadan out of sincere faith, and hoping for a reward from Allah, then all his previous sins will be forgiven.\"",
        reference: "Sahih al-Bukhari 1901",
        collection: "bukhari",
        bookNumber: "30",
        hadithNumber: "1901",
        grades: "Sahih",
        fullText: true,
      },
      {
        id: "lq-dua",
        title: "Dua of Aishah for Laylatul Qadr",
        arabic: "حَدَّثَنَا عَلِيُّ بْنُ مُحَمَّدٍ، حَدَّثَنَا وَكِيعٌ، عَنْ كَهْمَسِ بْنِ الْحَسَنِ، عَنْ عَبْدِ اللَّهِ بْنِ بُرَيْدَةَ، عَنْ عَائِشَةَ، أَنَّهَا قَالَتْ يَا رَسُولَ اللَّهِ أَرَأَيْتَ إِنْ وَافَقْتُ لَيْلَةَ الْقَدْرِ مَا أَدْعُو قَالَ ‏\"‏ تَقُولِينَ اللَّهُمَّ إِنَّكَ عَفُوٌّ تُحِبُّ الْعَفْوَ فَاعْفُ عَنِّي ‏\"‏ ‏.‏",
        translation: "It was narrated from 'Aishah that she said: \"O Messenger of Allah, what do you think I should say in my supplication, if I come upon Laylatul-Qadr?\" He said: \"Say: 'Allahumma innaka 'afuwwun tuhibbul-'afwa, fa'fu 'anni (O Allah, You are Forgiving and love forgiveness, so forgive me).'\"",
        reference: "Sunan Ibn Majah 3850 · Jami at-Tirmidhi 3513 · Riyad as-Salihin 1195",
        collection: "ibnmajah",
        bookNumber: "34",
        hadithNumber: "3850",
        grades: "Sahih (Darussalam)",
        fullText: true,
      },
    ],
  },
  {
    id: "taraweeh",
    title: "Taraweeh & Qiyam al-Layl",
    arabicTitle: "قيام الليل",
    items: [
      {
        id: "congregation-origin",
        title: "Umar Gathered the People Behind One Reciter",
        arabic: "حَدَّثَنِي مَالِكٌ، عَنِ ابْنِ شِهَابٍ، عَنْ عُرْوَةَ بْنِ الزُّبَيْرِ، عَنْ عَبْدِ الرَّحْمَنِ بْنِ عَبْدٍ الْقَارِيِّ، أَنَّهُ قَالَ خَرَجْتُ مَعَ عُمَرَ بْنِ الْخَطَّابِ فِي رَمَضَانَ إِلَى الْمَسْجِدِ فَإِذَا النَّاسُ أَوْزَاعٌ مُتَفَرِّقُونَ يُصَلِّي الرَّجُلُ لِنَفْسِهِ وَيُصَلِّي الرَّجُلُ فَيُصَلِّي بِصَلاَتِهِ الرَّهْطُ فَقَالَ عُمَرُ وَاللَّهِ إِنِّي لأَرَانِي لَوْ جَمَعْتُ هَؤُلاَءِ عَلَى قَارِئٍ وَاحِدٍ لَكَانَ أَمْثَلَ ‏.‏ فَجَمَعَهُمْ عَلَى أُبَىِّ بْنِ كَعْبٍ - قَالَ - ثُمَّ خَرَجْتُ مَعَهُ لَيْلَةً أُخْرَى وَالنَّاسُ يُصَلُّونَ بِصَلاَةِ قَارِئِهِمْ فَقَالَ عُمَرُ نِعْمَتِ الْبِدْعَةُ هَذِهِ وَالَّتِي تَنَامُونَ عَنْهَا أَفْضَلُ مِنَ الَّتِي تَقُومُونَ ‏.‏ يَعْنِي آخِرَ اللَّيْلِ وَكَانَ النَّاسُ يَقُومُونَ أَوَّلَهُ ‏.‏",
        translation: "Malik related to me from Ibn Shihab from Urwa ibn az-Zubayr that Abd ar-Rahman ibn Abd al-Qari said, \"I went out with Umar ibn alKhattab in Ramadan to the mosque and the people there were spread out in groups. Some men were praying by themselves, whilst others were praying in small groups. Umar said, 'By Allah! It would be better in my opinion if these people gathered behind one reciter.' So he gathered them behind Ubayy ibn Kab. Then I went out with him another night and the people were praying behind their Qur'an reciter. Umar said, 'How excellent this new way is, but what you miss while you are asleep is better than what you watch in prayer.' He meant the end of the night, and people used to watch the beginning of the night in prayer.\"",
        reference: "Muwatta Malik 6.3",
        collection: "malik",
        bookNumber: "6",
        hadithNumber: "3",
        fullText: true,
      },
      {
        id: "virtue",
        title: "Night Prayer: Best After the Obligatory",
        arabic: "أَخْبَرَنَا سُوَيْدُ بْنُ نَصْرٍ، قَالَ أَنْبَأَنَا عَبْدُ اللَّهِ، قَالَ حَدَّثَنَا شُعْبَةُ، عَنْ أَبِي بِشْرٍ، جَعْفَرِ بْنِ أَبِي وَحْشِيَّةَ أَنَّهُ سَمِعَ حُمَيْدَ بْنَ عَبْدِ الرَّحْمَنِ، يَقُولُ قَالَ رَسُولُ اللَّهِ صلى الله عليه وسلم ‏\"‏ أَفْضَلُ الصَّلاَةِ بَعْدَ الْفَرِيضَةِ قِيَامُ اللَّيْلِ وَأَفْضَلُ الصِّيَامِ بَعْدَ رَمَضَانَ الْمُحَرَّمُ ‏\"‏ ‏.‏ أَرْسَلَهُ شُعْبَةُ بْنُ الْحَجَّاجِ ‏.‏",
        translation: "It was narrated from Abu Bishr Ja'far bin Abi Wahshiyyah that: He heard Humaid bin 'Abdur-Rahman say: \"The Messenger of Allah (ﷺ) said: 'The best prayer after the obligatory (fard) prayers is prayer at night and the best fasting after the month of Ramadan is Al-Muharram.'\" Shu'bah bin Al-Hajjaj narrated it in Mursal form.",
        reference: "Sunan an-Nasa'i 1614",
        collection: "nasai",
        bookNumber: "20",
        hadithNumber: "1614",
        grades: "Sahih (Darussalam)",
        fullText: true,
      },
    ],
  },
  {
    id: "itikaf",
    title: "Itikaf (Spiritual Retreat)",
    arabicTitle: "الاعتكاف",
    items: [
      {
        id: "prophet-itikaf",
        title: "Prophet's ﷺ Itikaf in the Middle Ten",
        arabic: "يَعْتَكِفُ الْعَشْرَ الْوُسُطَ مِنْ رَمَضَانَ",
        translation: "The Messenger of Allah, may Allah bless him and grant him peace, used to do itikaf in the middle ten days of Ramadan.",
        reference: "Muwatta Malik 19.10",
        collection: "malik",
        bookNumber: "19",
        hadithNumber: "10",
      },
      {
        id: "itikaf-last-ten",
        title: "Continue in the Last Ten; Seek the Night",
        arabic: "مَنْ كَانَ اعْتَكَفَ مَعِي فَلْيَعْتَكِفِ الْعَشْرَ الأَوَاخِرَ وَقَدْ رَأَيْتُ هَذِهِ اللَّيْلَةَ ثُمَّ أُنْسِيتُهَا وَقَدْ رَأَيْتُنِي أَسْجُدُ مِنْ صَبِيحَتِهَا فِي مَاءٍ وَطِينٍ فَالْتَمِسُوهَا فِي الْعَشْرِ الأَوَاخِرِ وَالْتَمِسُوهَا فِي كُلِّ وِتْرٍ",
        translation: "He who has engaged himself in devotion along with me should do so during the last ten days; I saw that night, that was caused to forget it, but I have seen myself prostrating in water and mud on the morning following (that night), so seek it in the last ten days and seek it every night with an odd number.",
        reference: "Sunan Abi Dawud 1382 · Sahih al-Bukhari 2015",
        collection: "abudawud",
        bookNumber: "6",
        hadithNumber: "1382",
        grades: "Sahih (Al-Albani)",
      },
      {
        id: "itikaf-rules",
        title: "The Mu'takif Does Not Leave the Mosque Except for Need",
        arabic: "حَدَّثَنَا قُتَيْبَةُ، حَدَّثَنَا لَيْثٌ، عَنِ ابْنِ شِهَابٍ، عَنْ عُرْوَةَ، وَعَمْرَةَ بِنْتِ عَبْدِ الرَّحْمَنِ، أَنَّ عَائِشَةَ ـ رضى الله عنها ـ زَوْجَ النَّبِيِّ صلى الله عليه وسلم قَالَتْ وَإِنْ كَانَ رَسُولُ اللَّهِ صلى الله عليه وسلم لَيُدْخِلُ عَلَىَّ رَأْسَهُ وَهْوَ فِي الْمَسْجِدِ فَأُرَجِّلُهُ، وَكَانَ لاَ يَدْخُلُ الْبَيْتَ إِلاَّ لِحَاجَةٍ، إِذَا كَانَ مُعْتَكِفًا",
        translation: "Narrated `Aisha: (the wife of the Prophet) Allah's Messenger (ﷺ) used to let his head in (the house) while he was in the mosque and I would comb and oil his hair. When in I`tikaf he used not to enter the house except for a need.",
        reference: "Sahih al-Bukhari 2029",
        collection: "bukhari",
        bookNumber: "33",
        hadithNumber: "2029",
        grades: "Sahih",
        fullText: true,
      },
    ],
  },
  {
    id: "zakat-al-fitr",
    title: "Zakat al-Fitr (Fitrana)",
    arabicTitle: "زكاة الفطر",
    items: [
      {
        id: "obligation-timing",
        title: "Obligation & Paying Before the Eid Prayer",
        arabic: "حَدَّثَنَا يَحْيَى بْنُ مُحَمَّدِ بْنِ السَّكَنِ، حَدَّثَنَا مُحَمَّدُ بْنُ جَهْضَمٍ، حَدَّثَنَا إِسْمَاعِيلُ بْنُ جَعْفَرٍ، عَنْ عُمَرَ بْنِ نَافِعٍ، عَنْ أَبِيهِ، عَنِ ابْنِ عُمَرَ ـ رضى الله عنهما ـ قَالَ فَرَضَ رَسُولُ اللَّهِ صلى الله عليه وسلم زَكَاةَ الْفِطْرِ صَاعًا مِنْ تَمْرٍ، أَوْ صَاعًا مِنْ شَعِيرٍ عَلَى الْعَبْدِ وَالْحُرِّ، وَالذَّكَرِ وَالأُنْثَى، وَالصَّغِيرِ وَالْكَبِيرِ مِنَ الْمُسْلِمِينَ، وَأَمَرَ بِهَا أَنْ تُؤَدَّى قَبْلَ خُرُوجِ النَّاسِ إِلَى الصَّلاَةِ‏.‏",
        translation: "Narrated Ibn `Umar: Allah's Messenger (ﷺ) enjoined the payment of one Sa' of dates or one Sa' of barley as Zakat-ul-Fitr on every Muslim slave or free, male or female, young or old, and he ordered that it be paid before the people went out to offer the `Id prayer. (One Sa' = 3 Kilograms approx.)",
        reference: "Sahih al-Bukhari 1503",
        collection: "bukhari",
        bookNumber: "24",
        hadithNumber: "1503",
        grades: "Sahih",
        fullText: true,
      },
      {
        id: "amounts",
        title: "Permissible Amounts of Fitrana",
        arabic: "حَدَّثَنَا عَبْدُ اللَّهِ بْنُ يُوسُفَ، أَخْبَرَنَا مَالِكٌ، عَنْ زَيْدِ بْنِ أَسْلَمَ، عَنْ عِيَاضِ بْنِ عَبْدِ اللَّهِ بْنِ سَعْدِ بْنِ أَبِي سَرْحٍ الْعَامِرِيِّ، أَنَّهُ سَمِعَ أَبَا سَعِيدٍ الْخُدْرِيَّ ـ رضى الله عنه ـ يَقُولُ كُنَّا نُخْرِجُ زَكَاةَ الْفِطْرِ صَاعًا مِنْ طَعَامٍ، أَوْ صَاعًا مِنْ شَعِيرٍ، أَوْ صَاعًا مِنْ تَمْرٍ، أَوْ صَاعًا مِنْ أَقِطٍ، أَوْ صَاعًا مِنْ زَبِيبٍ‏.‏",
        translation: "Narrated Abu Sa`id Al-Khudri: We used to give one Sa' of meal or one Sa' of barley or one Sa' of dates, or one Sa' of cottage cheese or one Sa' of Raisins (dried grapes) as Zakat-ul-Fitr.",
        reference: "Sahih al-Bukhari 1506 · Sahih Muslim 985",
        collection: "bukhari",
        bookNumber: "24",
        hadithNumber: "1506",
        grades: "Sahih",
        fullText: true,
      },
    ],
  },
  {
    id: "eid-salah",
    title: "Eid Salah (Prayer)",
    arabicTitle: "صلاة العيد",
    items: [
      {
        id: "prayer-before-khutbah",
        title: "Prayer Before the Khutbah",
        arabic: "يَخْرُجُ يَوْمَ الْفِطْرِ وَالأَضْحَى إِلَى الْمُصَلَّى، فَأَوَّلُ شَىْءٍ يَبْدَأُ بِهِ الصَّلاَةُ ثُمَّ يَنْصَرِفُ",
        translation: "The Prophet (ﷺ) used to proceed to the Musalla on the days of Id-ul-Fitr and Id-ul-Adha; the first thing to begin with was the prayer and after that he would stand in front of the people and the people would keep sitting in their rows. Then he would preach to them, advise them and give them orders, (i.e. Khutba). And after that if he wished to send an army for an expedition, he would do so; or if he wanted to give and order, he would do so, and then depart.",
        reference: "Sahih al-Bukhari 956",
        collection: "bukhari",
        bookNumber: "13",
        hadithNumber: "956",
        grades: "Sahih",
      },
      {
        id: "takbir-count",
        title: "Takbirat: Seven in the First Rakah, Five in the Second",
        arabic: "حَدَّثَنَا هِشَامُ بْنُ عَمَّارٍ، حَدَّثَنَا عَبْدُ الرَّحْمَنِ بْنُ سَعْدِ بْنِ عَمَّارِ بْنِ سَعْدٍ، مُؤَذِّنِ رَسُولِ اللَّهِ ـ صلى الله عليه وسلم ـ حَدَّثَنِي أَبِي عَنْ أَبِيهِ عَنْ جَدِّهِ أَنَّ رَسُولَ اللَّهِ ـ صلى الله عليه وسلم ـ كَانَ يُكَبِّرُ فِي الْعِيدَيْنِ فِي الأُولَى سَبْعًا قَبْلَ الْقِرَاءَةِ وَفِي الآخِرَةِ خَمْسًا قَبْلَ الْقِرَاءَةِ ‏.‏",
        translation: "‘Abdur-Rahman bin Sa’d bin ‘Ammar bin Sa’d, the Mu’adhdhin of the Messenger of Allah (ﷺ), narrated from his father, from his father, from his grandfather, that the Messenger of Allah (ﷺ) used to say the Takbir in the ‘Eid prayer, seven times in the first (Rak’ah) before reciting Qur’an, and five times in the second before reciting Qur’an.",
        reference: "Sunan Ibn Majah 1277",
        collection: "ibnmajah",
        bookNumber: "5",
        hadithNumber: "1277",
        grades: "Hasan (Darussalam)",
        fullText: true,
      },
      {
        id: "recitation",
        title: "Surahs Recited in the Eid Prayer",
        arabic: "حَدَّثَنَا قُتَيْبَةُ، حَدَّثَنَا أَبُو عَوَانَةَ، عَنْ إِبْرَاهِيمَ بْنِ مُحَمَّدِ بْنِ الْمُنْتَشِرِ، عَنْ أَبِيهِ، عَنْ حَبِيبِ بْنِ سَالِمٍ، عَنِ النُّعْمَانِ بْنِ بَشِيرٍ، قَالَ كَانَ النَّبِيُّ صلى الله عليه وسلم يَقْرَأُ فِي الْعِيدَيْنِ وَفِي الْجُمُعَةِ بِـ ‏ (‏ سَبِّحِ اسْمَ رَبِّكَ الأَعْلَى ‏) ‏ وَ ‏ (‏هَلْ أَتَاكَ حَدِيثُ الْغَاشِيَةِ ‏) ‏ وَرُبَّمَا اجْتَمَعَا فِي يَوْمٍ وَاحِدٍ فَيَقْرَأُ بِهِمَا ‏.‏ قَالَ وَفِي الْبَابِ عَنْ أَبِي وَاقِدٍ وَسَمُرَةَ بْنِ جُنْدَبٍ وَابْنِ عَبَّاسٍ ‏.‏ قَالَ أَبُو عِيسَى حَدِيثُ النُّعْمَانِ بْنِ بَشِيرٍ حَدِيثٌ حَسَنٌ صَحِيحٌ ‏.‏ وَهَكَذَا رَوَى سُفْيَانُ الثَّوْرِيُّ وَمِسْعَرٌ عَنْ إِبْرَاهِيمَ بْنِ مُحَمَّدِ بْنِ الْمُنْتَشِرِ نَحْوَ حَدِيثِ أَبِي عَوَانَةَ ‏.‏ وَأَمَّا سُفْيَانُ بْنُ عُيَيْنَةَ فَيُخْتَلَفُ عَلَيْهِ فِي الرِّوَايَةِ يُرْوَى عَنْهُ عَنْ إِبْرَاهِيمَ بْنِ مُحَمَّدِ بْنِ الْمُنْتَشِرِ عَنْ أَبِيهِ عَنْ حَبِيبِ بْنِ سَالِمٍ عَنْ أَبِيهِ عَنِ النُّعْمَانِ بْنِ بَشِيرٍ ‏.‏ وَلاَ نَعْرِفُ لِحَبِيبِ بْنِ سَالِمٍ رِوَايَةً عَنْ أَبِيهِ ‏.‏ وَحَبِيبُ بْنُ سَالِمٍ هُوَ مَوْلَى النُّعْمَانِ بْنِ بَشِيرٍ وَرَوَى عَنِ النُّعْمَانِ بْنِ بَشِيرٍ أَحَادِيثَ ‏.‏ وَقَدْ رُوِيَ عَنِ ابْنِ عُيَيْنَةَ عَنْ إِبْرَاهِيمَ بْنِ مُحَمَّدِ بْنِ الْمُنْتَشِرِ نَحْوُ رِوَايَةِ هَؤُلاَءِ ‏.‏ وَرُوِيَ عَنِ النَّبِيِّ صلى الله عليه وسلم أَنَّهُ كَانَ يَقْرَأُ فِي صَلاَةِ الْعِيدَيْنِ بِـ ‏(‏اقْتَرَبَتِ السَّاعَةُ ‏)‏ وَبِهِ يَقُولُ الشَّافِعِيُّ ‏.‏",
        translation: "An-Numan bin Bashir narrated: \"For the two Eid and the Friday prayer, the Prophet (ﷺ) would recite: Glorify the Name of your Lord, the Most High, and Has there come to you the narration of the overwhelming? And sometimes they would occur on he same day, so he would recite the two of them.\"",
        reference: "Jami at-Tirmidhi 533",
        collection: "tirmidhi",
        bookNumber: "5",
        hadithNumber: "533",
        grades: "Sahih (Darussalam)",
        fullText: true,
      },
      {
        id: "no-fasting",
        title: "No Fasting on the Two Days of Eid",
        arabic: "وَحَدَّثَنَا يَحْيَى بْنُ يَحْيَى، قَالَ قَرَأْتُ عَلَى مَالِكٍ عَنْ مُحَمَّدِ بْنِ يَحْيَى بْنِ حَبَّانَ، عَنِ الأَعْرَجِ، عَنْ أَبِي هُرَيْرَةَ، - رضى الله عنه - أَنَّ رَسُولَ اللَّهِ صلى الله عليه وسلم نَهَى عَنْ صِيَامِ يَوْمَيْنِ يَوْمِ الأَضْحَى وَيَوْمِ الْفِطْرِ ‏.‏",
        translation: "Abu Huraira (Allah be pleased with him) reported that the Messenger of Allah (ﷺ) forbade fasting on these two days. 'Id-ul-Adha and 'Id-ul-Fitr.",
        reference: "Sahih Muslim 1138",
        collection: "muslim",
        bookNumber: "13",
        hadithNumber: "1138",
        grades: "Sahih",
        fullText: true,
      },
      {
        id: "eid-joy",
        title: "Eid: Days of Joy for Muslims",
        arabic: "أَخْبَرَنَا عَلِيُّ بْنُ حُجْرٍ، قَالَ أَنْبَأَنَا إِسْمَاعِيلُ، قَالَ حَدَّثَنَا حُمَيْدٌ، عَنْ أَنَسِ بْنِ مَالِكٍ، قَالَ كَانَ لأَهْلِ الْجَاهِلِيَّةِ يَوْمَانِ فِي كُلِّ سَنَةٍ يَلْعَبُونَ فِيهِمَا فَلَمَّا قَدِمَ النَّبِيُّ صلى الله عليه وسلم الْمَدِينَةَ قَالَ ‏\"‏ كَانَ لَكُمْ يَوْمَانِ تَلْعَبُونَ فِيهِمَا وَقَدْ أَبْدَلَكُمُ اللَّهُ بِهِمَا خَيْرًا مِنْهُمَا يَوْمَ الْفِطْرِ وَيَوْمَ الأَضْحَى ‏\"‏ ‏.‏",
        translation: "It was narrated that Anas bin Malik said: \"The people of the Jahiliyyah had two days each year when they would play. When the Messenger of Allah (ﷺ) came to Al-Madinah he said: 'You had two days when you would play, but Allah (SWT) has given Muslims something instead that is better than them: the day of Al-Fitr and the day of Al-Adha.'\"",
        reference: "Sunan an-Nasa'i 1556",
        collection: "nasai",
        bookNumber: "19",
        hadithNumber: "1556",
        grades: "Sahih (Darussalam)",
        fullText: true,
      },
    ],
  },
  {
    id: "tashriq",
    title: "Days of Tashriq",
    arabicTitle: "أيام التشريق",
    items: [
      {
        id: "festival-days",
        title: "The Days of Tashriq Are Our Festival Days",
        arabic: "حَدَّثَنَا الْحَسَنُ بْنُ عَلِيٍّ، حَدَّثَنَا وَهْبٌ، حَدَّثَنَا مُوسَى بْنُ عُلَىٍّ، ح وَحَدَّثَنَا عُثْمَانُ بْنُ أَبِي شَيْبَةَ، حَدَّثَنَا وَكِيعٌ، عَنْ مُوسَى بْنِ عُلَىٍّ، - وَالإِخْبَارُ فِي حَدِيثِ وَهْبٍ - قَالَ سَمِعْتُ أَبِي أَنَّهُ، سَمِعَ عُقْبَةَ بْنَ عَامِرٍ، قَالَ قَالَ رَسُولُ اللَّهِ صلى الله عليه وسلم ‏\"‏ يَوْمُ عَرَفَةَ وَيَوْمُ النَّحْرِ وَأَيَّامُ التَّشْرِيقِ عِيدُنَا أَهْلَ الإِسْلاَمِ وَهِيَ أَيَّامُ أَكْلٍ وَشُرْبٍ ‏\"‏ ‏.‏",
        translation: "Narrated Uqbah ibn Amir: The Prophet (ﷺ) said: The day of Arafah, the day of sacrifice, the days of tashriq are (the days of) our festival, O people of Islam. These are the days of eating and drinking.",
        reference: "Sunan Abi Dawud 2419",
        collection: "abudawud",
        bookNumber: "14",
        hadithNumber: "2419",
        grades: "Sahih (Al-Albani)",
        fullText: true,
      },
      {
        id: "takbir-after-prayer",
        title: "Takbir After Every Prayer During Tashriq",
        arabic: "قَالَ مَالِكٌ الأَمْرُ عِنْدَنَا أَنَّ التَّكْبِيرَ فِي أَيَّامِ التَّشْرِيقِ دُبُرَ الصَّلَوَاتِ وَأَوَّلُ ذَلِكَ تَكْبِيرُ الإِمَامِ وَالنَّاسُ مَعَهُ دُبُرَ صَلاَةِ الظُّهْرِ مِنْ يَوْمِ النَّحْرِ وَآخِرُ ذَلِكَ تَكْبِيرُ الإِمَامِ وَالنَّاسُ مَعَهُ دُبُرَ صَلاَةِ الصُّبْحِ مِنْ آخِرِ أَيَّامِ التَّشْرِيقِ ثُمَّ يَقْطَعُ التَّكْبِيرَ",
        translation: "Malik said, \"What we do here (in Madina) is to say the takbir during the days of tashriq after each prayer. The first time is when the imam and everyone with him says the takbir after the dhuhr prayer on the day of sacrifice, and the last is when the imam and everyone with him says the takbir after subh on the last of the days of tashriq, after which he stops saying the takbir.",
        reference: "Muwatta Malik 20.214",
        collection: "malik",
        bookNumber: "20",
        hadithNumber: "214",
      },
    ],
  },
  {
    id: "moon-sighting",
    title: "Moon Sighting (Ru'ya)",
    arabicTitle: "رؤية الهلال",
    items: [
      {
        id: "crescent-dua",
        title: "Upon Sighting the Crescent",
        arabic: "اللهُ أَكْـبَر، اللّهُمَّ أَهِلَّـهُ عَلَيْـنا بِالأمْـنِ وَالإيمـان، والسَّلامَـةِ والإسْلام، وَالتَّـوْفيـقِ لِما تُحِـبُّ رَبَّنـا وَتَـرْضـى، رَبُّنـا وَرَبُّكَ الله",
        transliteration: "Allāhu Akbar, Allāhumma ahillahu `alayna bi ‘l-amni wa ‘l-īmān, was-salāmati wa ‘l-'Islām, wat-tawfīqi limā tuḥibbu Rabbanā wa tarḍā, Rabbunā wa Rabbukallāh.",
        translation: "Allah is the Most Great. O Allah, bring us the new moon with security and Faith, with peace and in Islam, and in harmony with what our Lord loves and what pleases Him. Our Lord and your Lord is Allah.",
        reference: "Hisn al-Muslim (dhikr 175) · At-Tirmidhi 5/504, Ad-Darimi 1/336",
        collection: "hisn",
        bookNumber: "1",
        hadithNumber: "175",
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
  "fasting-rules": "restaurant-outline",
  "laylatul-qadr": "star-outline",
  taraweeh: "flame-outline",
  itikaf: "home-outline",
  "zakat-al-fitr": "cash-outline",
  "eid-salah": "hand-left-outline",
  tashriq: "megaphone-outline",
  "moon-sighting": "moon-outline",
};
