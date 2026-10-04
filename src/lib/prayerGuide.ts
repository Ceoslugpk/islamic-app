import {
  cleanHadithText,
  fetchSingleHadith,
  getHadithGrade,
  type HadithItem,
} from './hadithApi';
import type { RamadanGuideItem, RamadanGuideSection } from './ramadanGuide';

export type PrayerGuideSection = RamadanGuideSection;
export type PrayerGuideItem = RamadanGuideItem;

export interface GuideUpdate {
  arabic?: string;
  translation?: string;
  grades?: string;
}

export const PRAYER_GUIDE_SECTIONS: PrayerGuideSection[] = [
  {
    id: "wudu",
    title: "Purification: Wudu",
    arabicTitle: "الوضوء",
    items: [
      {
        id: "bismillah",
        title: "Say Bismillah When Starting Wudu",
        arabic: "حَدَّثَنَا قُتَيْبَةُ بْنُ سَعِيدٍ، حَدَّثَنَا مُحَمَّدُ بْنُ مُوسَى، عَنْ يَعْقُوبَ بْنِ سَلَمَةَ، عَنْ أَبِيهِ، عَنْ أَبِي هُرَيْرَةَ، قَالَ قَالَ رَسُولُ اللَّهِ صلى الله عليه وسلم ‏\"‏ لاَ صَلاَةَ لِمَنْ لاَ وُضُوءَ لَهُ وَلاَ وُضُوءَ لِمَنْ لَمْ يَذْكُرِ اسْمَ اللَّهِ تَعَالَى عَلَيْهِ ‏\"‏ ‏.‏",
        translation: "Narrated AbuHurayrah: The Messenger of Allah (ﷺ) said: The prayer of a person who does not perform ablution is not valid, and the ablution of a person who does not mention the name of Allah (in the beginning) is not valid.",
        reference: "Sunan Abi Dawud 101 · Jami at-Tirmidhi 25",
        collection: "abudawud",
        bookNumber: "1",
        hadithNumber: "101",
        grades: "Sahih (Al-Albani)",
        fullText: true,
      },
      {
        id: "wudu-description",
        title: "The Description of the Prophet's Wudu",
        arabic: "حَدَّثَنَا عَبْدُ الْعَزِيزِ بْنُ عَبْدِ اللَّهِ الأُوَيْسِيُّ، قَالَ حَدَّثَنِي إِبْرَاهِيمُ بْنُ سَعْدٍ، عَنِ ابْنِ شِهَابٍ، أَنَّ عَطَاءَ بْنَ يَزِيدَ، أَخْبَرَهُ أَنَّ حُمْرَانَ مَوْلَى عُثْمَانَ أَخْبَرَهُ أَنَّهُ، رَأَى عُثْمَانَ بْنَ عَفَّانَ دَعَا بِإِنَاءٍ، فَأَفْرَغَ عَلَى كَفَّيْهِ ثَلاَثَ مِرَارٍ فَغَسَلَهُمَا، ثُمَّ أَدْخَلَ يَمِينَهُ فِي الإِنَاءِ فَمَضْمَضَ، وَاسْتَنْشَقَ، ثُمَّ غَسَلَ وَجْهَهُ ثَلاَثًا، وَيَدَيْهِ إِلَى الْمِرْفَقَيْنِ ثَلاَثَ مِرَارٍ، ثُمَّ مَسَحَ بِرَأْسِهِ، ثُمَّ غَسَلَ رِجْلَيْهِ ثَلاَثَ مِرَارٍ إِلَى الْكَعْبَيْنِ، ثُمَّ قَالَ قَالَ رَسُولُ اللَّهِ صلى الله عليه وسلم ‏\"‏ مَنْ تَوَضَّأَ نَحْوَ وُضُوئِي هَذَا، ثُمَّ صَلَّى رَكْعَتَيْنِ، لاَ يُحَدِّثُ فِيهِمَا نَفْسَهُ، غُفِرَ لَهُ مَا تَقَدَّمَ مِنْ ذَنْبِهِ ‏\"‏‏.‏",
        translation: "I saw 'Uthman bin 'Affan asking for a tumbler of water (and when it was brought) he poured water over his hands and washed them thrice and then put his right hand in the water container and rinsed his mouth, washed his nose by putting water in it and then blowing it out. then he washed his face and forearms up to the elbows thrice, passed his wet hands over his head and washed his feet up to the ankles thrice. Then he said, \"Allah's Messenger (ﷺ) said 'If anyone performs ablution like that of mine and offers a two-rak'at prayer during which he does not think of anything else (not related to the present prayer) then his past sins will be forgiven.'",
        reference: "Sahih al-Bukhari 159",
        collection: "bukhari",
        bookNumber: "4",
        hadithNumber: "159",
        grades: "Sahih",
      },
      {
        id: "nose",
        title: "Rinsing the Nose With Water",
        arabic: "حَدَّثَنَا عَبْدَانُ، قَالَ أَخْبَرَنَا عَبْدُ اللَّهِ، قَالَ أَخْبَرَنَا يُونُسُ، عَنِ الزُّهْرِيِّ، قَالَ أَخْبَرَنِي أَبُو إِدْرِيسَ، أَنَّهُ سَمِعَ أَبَا هُرَيْرَةَ، عَنِ النَّبِيِّ صلى الله عليه وسلم أَنَّهُ قَالَ ‏\"‏ مَنْ تَوَضَّأَ فَلْيَسْتَنْثِرْ، وَمَنِ اسْتَجْمَرَ فَلْيُوتِرْ ‏\"‏‏.‏",
        translation: "Narrated Abu Huraira: The Prophet (ﷺ) said, \"Whoever performs ablution should clean his nose with water by putting the water in it and then blowing it out, and whoever cleans his private parts with stones should do it with odd number of stones.\"",
        reference: "Sahih al-Bukhari 161",
        collection: "bukhari",
        bookNumber: "4",
        hadithNumber: "161",
        grades: "Sahih",
        fullText: true,
      },
      {
        id: "fingers",
        title: "Pass Water Between the Fingers and Toes",
        arabic: "حَدَّثَنَا إِبْرَاهِيمُ بْنُ سَعِيدٍ، هُوَ الْجَوْهَرِيُّ حَدَّثَنَا سَعْدُ بْنُ عَبْدِ الْحَمِيدِ بْنِ جَعْفَرٍ، حَدَّثَنَا عَبْدُ الرَّحْمَنِ بْنُ أَبِي الزِّنَادِ، عَنْ مُوسَى بْنِ عُقْبَةَ، عَنْ صَالِحٍ، مَوْلَى التَّوْأَمَةِ عَنِ ابْنِ عَبَّاسٍ، أَنَّ رَسُولَ اللَّهِ صلى الله عليه وسلم قَالَ ‏\"‏ إِذَا تَوَضَّأْتَ فَخَلِّلْ بَيْنَ أَصَابِعِ يَدَيْكَ وَرِجْلَيْكَ ‏\"‏ ‏.‏ قَالَ أَبُو عِيسَى هَذَا حَدِيثٌ حَسَنٌ غَرِيبٌ ‏.‏",
        translation: "Ibn Abbas narrated that : Allah's Messenger (ﷺ) said: \"When performing Wudu go between the fingers of your hands and (toes of) your feet.\"",
        reference: "Jami at-Tirmidhi 39",
        collection: "tirmidhi",
        bookNumber: "1",
        hadithNumber: "39",
        grades: "Hasan (Darussalam)",
        fullText: true,
      },
      {
        id: "after-wudu-dua",
        title: "Dua After Completing Wudu",
        arabic: "اللّهُـمَّ اجْعَلنـي مِنَ التَّـوّابينَ وَاجْعَـلْني مِنَ المتَطَهّـرين.",
        transliteration: "Allāhummaj`alnī minat-tawwābīna waj`alnī minal-mutaṭahhirīn.",
        translation: "O Allah, make me among those who turn to You in repentance, and make me among those who are purified.",
        reference: "Hisn al-Muslim (dhikr 14) · At-Tirmidhi 1/78",
        collection: "hisn",
        bookNumber: "1",
        hadithNumber: "14",
      },
    ],
  },
  {
    id: "salah",
    title: "The Prayer (Salah)",
    arabicTitle: "الصلاة",
    items: [
      {
        id: "intention",
        title: "Actions Are But by Intentions",
        arabic: "أَخْبَرَنَا إِسْحَاقُ بْنُ إِبْرَاهِيمَ، قَالَ أَنْبَأَنَا سُلَيْمَانُ بْنُ حَيَّانَ، قَالَ حَدَّثَنَا يَحْيَى بْنُ سَعِيدٍ، عَنْ مُحَمَّدِ بْنِ إِبْرَاهِيمَ، عَنْ عَلْقَمَةَ بْنِ وَقَّاصٍ، عَنْ عُمَرَ بْنِ الْخَطَّابِ، عَنِ النَّبِيِّ صلى الله عليه وسلم قَالَ ‏\"‏ إِنَّمَا الأَعْمَالُ بِالنِّيَّةِ وَإِنَّمَا لاِمْرِئٍ مَا نَوَى فَمَنْ كَانَتْ هِجْرَتُهُ إِلَى اللَّهِ وَرَسُولِهِ فَهِجْرَتُهُ إِلَى اللَّهِ وَرَسُولِهِ وَمَنْ كَانَتْ هِجْرَتُهُ لِدُنْيَا يُصِيبُهَا أَوِ امْرَأَةٍ يَتَزَوَّجُهَا فَهِجْرَتُهُ إِلَى مَا هَاجَرَ إِلَيْهِ ‏\"‏ ‏.‏",
        translation: "It was narrated from 'Umar bin Al-Khattab that the Prophet (ﷺ) said: \"Actions are but by intentions, and each person will have but that which he intended. Thus, he whose emigration was for the sake of Allah and His Messenger, his emigration was for the sake of Allah and His Messenger, and he whose emigration was to achieve some worldly gain or to take some woman in marriage, his emigration was for that for which he emigrated.\"",
        reference: "Sunan an-Nasa'i 3794",
        collection: "nasai",
        bookNumber: "35",
        hadithNumber: "3794",
        grades: "sahih (Darussalam)",
        fullText: true,
      },
      {
        id: "opening-takbir-hands",
        title: "Opening Takbir & Placing Right Over Left",
        arabic: "حَدَّثَنَا زُهَيْرُ بْنُ حَرْبٍ، حَدَّثَنَا عَفَّانُ، حَدَّثَنَا هَمَّامٌ، حَدَّثَنَا مُحَمَّدُ بْنُ جُحَادَةَ، حَدَّثَنِي عَبْدُ الْجَبَّارِ بْنُ وَائِلٍ، عَنْ عَلْقَمَةَ بْنِ وَائِلٍ، وَمَوْلًى، لَهُمْ أَنَّهُمَا حَدَّثَاهُ عَنْ أَبِيهِ، وَائِلِ بْنِ حُجْرٍ، أَنَّهُ رَأَى النَّبِيَّ صلى الله عليه وسلم رَفَعَ يَدَيْهِ حِينَ دَخَلَ فِي الصَّلاَةِ كَبَّرَ - وَصَفَ هَمَّامٌ حِيَالَ أُذُنَيْهِ - ثُمَّ الْتَحَفَ بِثَوْبِهِ ثُمَّ وَضَعَ يَدَهُ الْيُمْنَى عَلَى الْيُسْرَى فَلَمَّا أَرَادَ أَنْ يَرْكَعَ أَخْرَجَ يَدَيْهِ مِنَ الثَّوْبِ ثُمَّ رَفَعَهُمَا ثُمَّ كَبَّرَ فَرَكَعَ فَلَمَّا قَالَ ‏\"‏ سَمِعَ اللَّهُ لِمَنْ حَمِدَهُ ‏\"‏ ‏.‏ رَفَعَ يَدَيْهِ فَلَمَّا سَجَدَ سَجَدَ بَيْنَ كَفَّيْهِ ‏.‏",
        translation: "Wa'il b. Hujr reported: He saw the Messenger of Allah (ﷺ) raising his hands at the time of beginning the prayer and reciting takbir, and according to Hammam (the narrator), the hands were lifted opposite to ears. He (the Holy Prophet) then wrapped his hands in his cloth and placed his right hand over his left hand.",
        reference: "Sahih Muslim 401",
        collection: "muslim",
        bookNumber: "4",
        hadithNumber: "401",
        grades: "Sahih",
      },
      {
        id: "istiftah",
        title: "Opening Supplication (Istiftah)",
        arabic: "سُبْـحانَكَ اللّهُـمَّ وَبِحَمْـدِكَ وَتَبارَكَ اسْمُـكَ وَتَعـالى جَـدُّكَ وَلا إِلهَ غَيْرُك",
        transliteration: "Subhānaka Allāhumma wa biḥamdika, wa tabāraka 'smuka, wa ta'ālā jadduka, wa lā 'ilāha ghayruk.",
        translation: "Glory is to You O Allah, and praise. Blessed is Your Name and Exalted is Your Majesty. There is none worthy of worship but You",
        reference: "Hisn al-Muslim (dhikr 28) · Abu Dawud, Ibn Majah, An-Nasa'i, At-Tirmidhi",
        collection: "hisn",
        bookNumber: "1",
        hadithNumber: "28",
      },
      {
        id: "fatiha",
        title: "Al-Fatihah Is Required in Every Rakah",
        arabic: "حَدَّثَنَا عَلِيُّ بْنُ عَبْدِ اللَّهِ، قَالَ حَدَّثَنَا سُفْيَانُ، قَالَ حَدَّثَنَا الزُّهْرِيُّ، عَنْ مَحْمُودِ بْنِ الرَّبِيعِ، عَنْ عُبَادَةَ بْنِ الصَّامِتِ، أَنَّ رَسُولَ اللَّهِ صلى الله عليه وسلم قَالَ ‏\"‏ لاَ صَلاَةَ لِمَنْ لَمْ يَقْرَأْ بِفَاتِحَةِ الْكِتَابِ ‏\"‏‏.‏",
        translation: "Narrated 'Ubada bin As-Samit: Allah's Messenger (ﷺ) said, \"Whoever does not recite Al-Fatiha in his prayer, his prayer is invalid.\"",
        reference: "Sahih al-Bukhari 756",
        collection: "bukhari",
        bookNumber: "10",
        hadithNumber: "756",
        grades: "Sahih",
        fullText: true,
      },
      {
        id: "ruku-sujud",
        title: "Remembrances in Ruku and Sujud",
        arabic: "أَخْبَرَنَا إِسْحَاقُ بْنُ إِبْرَاهِيمَ، قَالَ أَنْبَأَنَا أَبُو مُعَاوِيَةَ، عَنِ الأَعْمَشِ، عَنْ سَعْدِ بْنِ عُبَيْدَةَ، عَنِ الْمُسْتَوْرِدِ بْنِ الأَحْنَفِ، عَنْ صِلَةَ بْنِ زُفَرَ، عَنْ حُذَيْفَةَ، قَالَ صَلَّيْتُ مَعَ رَسُولِ اللَّهِ صلى الله عليه وسلم فَرَكَعَ فَقَالَ فِي رُكُوعِهِ ‏\"‏ سُبْحَانَ رَبِّيَ الْعَظِيمِ ‏\"‏ ‏.‏ وَفِي سُجُودِهِ ‏\"‏ سُبْحَانَ رَبِّيَ الأَعْلَى ‏\"‏ ‏.‏",
        translation: "It was narrated that Hudhaifah said: \"I prayed with the Messenger of Allah (ﷺ), and he bowed and said when bowing: 'Subhana Rabbial-azim (Glory be to my Lord Almighty).' And when prostrating: 'Subhana Rabbial-'Ala (Glory be to my Lord Most High).'\"",
        reference: "Sunan an-Nasa'i 1046",
        collection: "nasai",
        bookNumber: "12",
        hadithNumber: "1046",
        grades: "Sahih (Darussalam)",
        fullText: true,
      },
      {
        id: "between-sujud",
        title: "Between the Two Prostrations",
        arabic: "رَبِّ اغْفِـرْ لي ، رَبِّ اغْفِـرْ لي",
        transliteration: "Rabbi’ghfir lī, Rabbi’ghfir lī.",
        translation: "Lord, forgive me. My Lord, forgive me.",
        reference: "Hisn al-Muslim (dhikr 48) · Abu Dawud 1/231",
        collection: "hisn",
        bookNumber: "1",
        hadithNumber: "48",
      },
      {
        id: "tashahhud",
        title: "The Tashahhud",
        arabic: "التَّحِيّـاتُ للهِ وَالصَّلَـواتُ والطَّيِّـبات ، السَّلامُ عَلَيـكَ أَيُّهـا النَّبِـيُّ وَرَحْمَـةُ اللهِ وَبَرَكـاتُه ، السَّلامُ عَلَيْـناوَعَلـى عِبـادِ للهِ الصَّـالِحـين . أَشْـهَدُ أَنْ لا إِلـهَ إِلاّ الله ، وَأَشْـهَدُ أَنَّ مُحَمّـداً عَبْـدُهُ وَرَسـولُه",
        transliteration: "Attaḥiyyātu lillāhi waṣṣalawātu, waṭṭayyibāt, assalāmu `alayka 'ayyuhan-Nabiyyu wa raḥmatullāhi wa barakātuh, assalāmu `alaynā wa `alā ‘ibādillāhiṣ-ṣāliḥīn. 'Ash-hadu 'an lā 'ilāha 'illallāh wa 'ash-hadu 'anna Muḥammadan `abduhu wa rasūluh.",
        translation: "All greetings of humility are for Allah, and all prayers and goodness. Peace be upon you, O Prophet, and the mercy of Allah and His blessings. Peace be upon us and upon the righteous slaves of Allah. I bear witness that there is none worthy of worship but Allah, and I bear witness that Muhammad is His slave and His Messenger.",
        reference: "Hisn al-Muslim (dhikr 52) · Al-Bukhari, Muslim 1/301",
        collection: "hisn",
        bookNumber: "1",
        hadithNumber: "52",
      },
      {
        id: "salawat",
        title: "Salawat Upon the Prophet ﷺ",
        arabic: "اللّهُـمَّ صَلِّ عَلـى مُحمَّـد، وَعَلـى آلِ مُحمَّد، كَمـا صَلَّيـتَ عَلـى إبْراهـيمَ وَعَلـى آلِ إبْراهـيم، إِنَّكَ حَمـيدٌ مَجـيد ، اللّهُـمَّ بارِكْ عَلـى مُحمَّـد، وَعَلـى آلِ مُحمَّـد، كَمـا بارِكْتَ عَلـى إبْراهـيمَ وَعَلـى آلِ إبْراهيم، إِنَّكَ حَمـيدٌ مَجـيد",
        transliteration: "Allāhumma ṣalli `alā Muḥammadinwa `alā ’āli Muḥammadin, kamā ṣallayta `alā 'Ibrāhīma wa `alā ’āli 'Ibrāhīma, 'innaka ḥamīdum-majīd. Allāhumma bārik `alā Muḥammadin wa `alā ’āli Muḥammadin, kamā bārakta `alā 'Ibrāhīma wa `alā 'āli 'Ibrāhīma, 'innaka ḥamīdum-majīd.",
        translation: "O Allah, bestow Your favor on Muhammad and on the family of Muhammad as You have bestowed Your favor on Ibrahim and on the family of Ibrahim, You are Praiseworthy, Most Glorious. O Allah, bless Muhammad and the family of Muhammad as You have blessed Ibrahim and the family of Ibrahim, You are Praiseworthy, Most Glorious.",
        reference: "Hisn al-Muslim (dhikr 53) · Al-Bukhari",
        collection: "hisn",
        bookNumber: "1",
        hadithNumber: "53",
      },
      {
        id: "before-salam",
        title: "Supplication Before the Salam",
        arabic: "اللّهُـمَّ اغْـفِرْ لي ما قَدَّمْـتُ وَما أَخَّرْت ، وَما أَسْـرَرْتُ وَما أَعْلَـنْت ، وَما أَسْـرَفْت ، وَما أَنْتَ أَعْـلَمُ بِهِ مِنِّي . أَنْتَ المُقَـدِّمُ، وَأَنْتَ المُـؤَخِّـرُ لا إِلهَ إِلاّ أَنْـت",
        transliteration: "Allāhummagh’fir lī mā qaddamtu, wa mā ‘akhkhartu, wa mā ‘asrartu, wa mā ‘a`lantu, wa mā ‘asraftu, wa mā 'anta ‘a`lamu bihi minnī. ‘anta ‘l-Muqaddimu, wa 'anta ‘l-Mu‘akhkhiru lā 'ilāha 'illā 'anta.",
        translation: "O Allah, forgive me what I have sent before me and what I have left behind me, what I have concealed and what I have done openly, what I have done in excess, and what You are better aware of than I. You are the One Who sends forth and You are the One Who delays. There is none worthy of worship but You.",
        reference: "Hisn al-Muslim (dhikr 58) · Muslim 1/534",
        collection: "hisn",
        bookNumber: "1",
        hadithNumber: "58",
      },
      {
        id: "tasleem",
        title: "The Salam to the Right and Left",
        arabic: "حَدَّثَنَا عَبْدَةُ بْنُ عَبْدِ اللَّهِ، حَدَّثَنَا يَحْيَى بْنُ آدَمَ، حَدَّثَنَا مُوسَى بْنُ قَيْسٍ الْحَضْرَمِيُّ، عَنْ سَلَمَةَ بْنِ كُهَيْلٍ، عَنْ عَلْقَمَةَ بْنِ وَائِلٍ، عَنْ أَبِيهِ، قَالَ صَلَّيْتُ مَعَ النَّبِيِّ صلى الله عليه وسلم فَكَانَ يُسَلِّمُ عَنْ يَمِينِهِ ‏\"‏ السَّلاَمُ عَلَيْكُمْ وَرَحْمَةُ اللَّهِ وَبَرَكَاتُهُ ‏\"‏ ‏.‏ وَعَنْ شِمَالِهِ ‏\"‏ السَّلاَمُ عَلَيْكُمْ وَرَحْمَةُ اللَّهِ ‏\"‏ ‏.‏",
        translation: "Narrated Wa'il ibn Hujr: I offered prayer along with the Prophet (ﷺ). He would give the salutation to his right side (saying): Peace be upon you and the mercy of Allah and His blessings; and to his left side (saying): Peace be upon you and mercy of Allah.",
        reference: "Sunan Abi Dawud 997",
        collection: "abudawud",
        bookNumber: "2",
        hadithNumber: "997",
        grades: "Sahih (Al-Albani)",
        fullText: true,
      },
      {
        id: "after-salam",
        title: "Istighfar After the Salam",
        arabic: "أَسْـتَغْفِرُ الله (ثَلاثاً) اللّهُـمَّ أَنْـتَ السَّلامُ وَمِـنْكَ السَّلام تَبارَكْتَ يا ذا الجَـلالِ وَالإِكْـرام",
        translation: "I seek the forgiveness of Allah (three times). O Allah, You are Peace and from You comes peace. Blessed are You, O Owner of majesty and honor.",
        reference: "Hisn al-Muslim (dhikr 66) · Muslim 1/414",
        collection: "hisn",
        bookNumber: "1",
        hadithNumber: "66",
      },
      {
        id: "after-salam-33",
        title: "Thirty-Three After Every Prayer",
        arabic: "سُـبْحانَ اللهِ والحَمْـدُ لله واللهُ أكْـبَر (ثلاثاً وثلاثين) لا إلهَ إلاّ اللّهُ وَحْـدَهُ لا شريكَ لهُ لهُ الملكُ ولهُ الحَمْد وهُوَ على كُلّ شَيءٍ قَـدير",
        translation: "Glory is to Allah, and praise is to Allah, and Allah is the Most Great. (each said thirty-three times) None has the right to be worshiped but Allah alone, He has no partner, His is the dominion and His is the praise and He is Able to do all things.",
        reference: "Hisn al-Muslim (dhikr 69) · Muslim 1/418",
        collection: "hisn",
        bookNumber: "1",
        hadithNumber: "69",
      },
    ],
  },
  {
    id: "congregation",
    title: "Praying in Congregation",
    arabicTitle: "صلاة الجماعة",
    items: [
      {
        id: "follow-imam",
        title: "Straighten the Rows & Follow the Imam",
        arabic: "إِذَا صَلَّيْتُمْ فَأَقِيمُوا صُفُوفَكُمْ ثُمَّ لْيَؤُمَّكُمْ أَحَدُكُمْ فَإِذَا كَبَّرَ الإِمَامُ فَكَبِّرُوا وَإِذَا قَرَأَ ‏ {‏ غَيْرِ الْمَغْضُوبِ عَلَيْهِمْ وَلاَ الضَّالِّينَ ‏} ‏ فَقُولُوا آمِينَ يُجِبْكُمُ اللَّهُ وَإِذَا كَبَّرَ وَرَكَعَ فَكَبِّرُوا وَارْكَعُوا فَإِنَّ الإِمَامَ يَرْكَعُ قَبْلَكُمْ وَيَرْفَعُ قَبْلَكُمْ",
        translation: "When you pray, make your rows straight and let one of you lead you in prayer. When the Imam says the takbir, then say the takbir. When he recites 'Not (the way) of those who earned Your anger, nor those who went astray' then say: \"Amin\" and Allah will answer you. When he says the takbir and bows, then say the takbir and bow. The Imam bows before you do and stands up before you do.",
        reference: "Sunan an-Nasa'i 1064",
        collection: "nasai",
        bookNumber: "12",
        hadithNumber: "1064",
        grades: "Sahih (Darussalam)",
      },
      {
        id: "dont-leave",
        title: "Do Not Leave Before the Imam",
        arabic: "إِنِّي إِمَامُكُمْ فَلاَ تُبَادِرُونِي بِالرُّكُوعِ وَلاَ بِالسُّجُودِ وَلاَ بِالْقِيَامِ وَلاَ بِالاِنْصِرَافِ فَإِنِّي أَرَاكُمْ مِنْ أَمَامِي وَمِنْ خَلْفِي",
        translation: "I am now your imam, so do not hasten to bow or prostrate or stand or leave before I do. I can see you in front of me and behind me.",
        reference: "Sunan an-Nasa'i 1363",
        collection: "nasai",
        bookNumber: "13",
        hadithNumber: "1363",
        grades: "Sahih (Darussalam)",
      },
    ],
  },
  {
    id: "janazah",
    title: "Funeral Prayer (Salat al-Janazah)",
    arabicTitle: "صلاة الجنازة",
    items: [
      {
        id: "four-takbirs",
        title: "Four Takbirs in the Funeral Prayer",
        arabic: "حَدَّثَنَا عَبْدُ اللَّهِ بْنُ يُوسُفَ، أَخْبَرَنَا مَالِكٌ، عَنِ ابْنِ شِهَابٍ، عَنْ سَعِيدِ بْنِ الْمُسَيَّبِ، عَنْ أَبِي هُرَيْرَةَ ـ رضى الله عنه ـ أَنَّ رَسُولَ اللَّهِ صلى الله عليه وسلم نَعَى النَّجَاشِيَّ فِي الْيَوْمِ الَّذِي مَاتَ فِيهِ، وَخَرَجَ بِهِمْ إِلَى الْمُصَلَّى فَصَفَّ بِهِمْ، وَكَبَّرَ عَلَيْهِ أَرْبَعَ تَكْبِيرَاتٍ‏.‏",
        translation: "Narrated Abu Huraira: Allah's Messenger (ﷺ) informed about the news of the death of An-Najash on the day he died. He went out with us to the Musalla and we aligned in rows and he said four Takbirs for An-Najashi's funeral prayer.",
        reference: "Sahih al-Bukhari 1333",
        collection: "bukhari",
        bookNumber: "23",
        hadithNumber: "1333",
        grades: "Sahih",
        fullText: true,
      },
      {
        id: "dua-for-deceased",
        title: "Dua for the Deceased",
        arabic: "اللهُـمِّ اغْفِـرْ لَهُ وَارْحَمْـه ، وَعافِهِ وَاعْفُ عَنْـه ، وَأَكْـرِمْ نُزُلَـه ، وَوَسِّـعْ مُدْخَـلَه ، وَاغْسِلْـهُ بِالْمـاءِ وَالثَّـلْجِ وَالْبَـرَدْ ، وَنَقِّـهِ مِنَ الْخطـايا كَما نَـقّيْتَ الـثَّوْبَ الأَبْيَـضَ مِنَ الدَّنَـسْ ، وَأَبْـدِلْهُ داراً خَـيْراً مِنْ دارِه ، وَأَهْلاً خَـيْراً مِنْ أَهْلِـه ، وَزَوْجَـاً خَـيْراً مِنْ زَوْجِه ، وَأَدْخِـلْهُ الْجَـنَّة ، وَأَعِـذْهُ مِنْ عَذابِ القَـبْر [وَعَذابِ النّـار]",
        transliteration: "Allāhumma’ghfir lahu warḥamh, wa `āfihi, wa`fu `anh, wa akrim nuzulah, wa wassi` mudkhalah, wagh’silhu bi ‘lmā'i wath-thalji walbarad, wa naqqihi mina ‘l-khaṭāyā kamā naqqaytath-thawba ‘l-abyaḍa minad-danas, wa abdilhu dāran khayran min dārih, wa ahlan khayran min ahlih, wa zawjan khayran min zawjih, wa adkhilhu ‘l-jannah, wa a`idhhu min `adhābi ‘l-qabri [wa `adhābin-nār].",
        translation: "O Allah, forgive him and have mercy on him, and give him strength and pardon him. Be generous to him, and cause his entrance to be wide, and wash him with water and snow and hail. Cleanse him of his transgressions as white cloth is cleansed of stains. Give him an abode better than his home, and a family better than his family, and a wife better than his wife. Take him into Paradise, and protect him from the punishment of the grave [and from the punishment of Hell-fire].",
        reference: "Hisn al-Muslim (dhikr 156) · Muslim 2/663",
        collection: "hisn",
        bookNumber: "1",
        hadithNumber: "156",
      },
      {
        id: "dua-for-community",
        title: "Dua for the Living and the Dead",
        arabic: "اللهُـمِّ اغْفِـرْ لِحَيِّـنا وَمَيِّتِـنا، وَشـاهِدِنا وَغائِبِـنا ، وَصَغيـرِنا وَكَبيـرِنا ، وَذَكَـرِنا وَأُنْثـانا . اللهُـمِّ مَنْ أَحْيَيْـتَهُ مِنّا فَأَحْيِـهِ عَلى الإِسْلام ، وَمَنْ تَوَفَّـيْتَهُ مِنّا فَتَوَفَّـهُ عَلى الإِيـمان ، اللهُـمِّ لا تَحْـرِمْنـا أَجْـرَه ، وَلا تُضِـلَّنا بَعْـدَه",
        transliteration: "Allāhumma’ghfir liḥayyinā, wa mayyitinā, wa shāhidinā, wa ghā'ibinā, wa ṣaghīrinā wa kabīrinā, wa dhakarinā wa unthānā. Allāhumma man aḥyaytahu minnā fa aḥyihi `ala ‘l-Islām, wa man tawaffaytahu minnā fatawaffahu `alal-īmān, Allāhumma lā taḥrimnā ajrah wa lā tuḍillanā ba`dah.",
        translation: "O Allah forgive our living and our dead, those who are with us and those who are absent, our young and our old, our menfolk and our womenfolk. O Allah, whomever you give life from among us give him life in Islam, and whomever you take away from us take him away in Faith. O Allah, do not forbid us their reward and do not send us astray after them.",
        reference: "Hisn al-Muslim (dhikr 157) · Ibn Majah 1/480, Ahmad 2/368",
        collection: "hisn",
        bookNumber: "1",
        hadithNumber: "157",
      },
    ],
  },
  {
    id: "istikhara",
    title: "Seeking Guidance (Istikhara)",
    arabicTitle: "الاستخارة",
    items: [
      {
        id: "method",
        title: "How the Prophet ﷺ Taught Istikhara",
        arabic: "يُعَلِّمُنَا الاِسْتِخَارَةَ فِي الأُمُورِ كَمَا يُعَلِّمُنَا السُّورَةَ مِنَ الْقُرْآنِ",
        translation: "The Prophet (p.b.u.h) used to teach us the way of doing Istikhara (Istikhara means to ask Allah to guide one to the right sort of action concerning any job or a deed), in all matters as he taught us the Suras of the Qur'an.",
        reference: "Sahih al-Bukhari 1166 · Sunan Abi Dawud 1538",
        collection: "bukhari",
        bookNumber: "19",
        hadithNumber: "1166",
        grades: "Sahih",
      },
      {
        id: "istikhara-dua",
        title: "The Istikhara Supplication",
        arabic: "اللهم إني أستخيرك بعلمك ، وأستقدرك بقدرتك ، وأسألك من فضلك العظيم فإنك تقدِرُ ولا أقدِرُ ، وتعلم ولا أعلم ، وأنت علام الغيوب ، اللهم إن كنت تعلم أن هذا الأمر - يسمي حاجته - خير لي في ديني ومعاشي وعاقبة أمري - أو قال : عاجله وآجله - فاقدره لي ويسره لي ، ثم بارك لي فيه ، وإن كنت تعلم أن هذا الأمر شر لي في ديني ومعاشي وعاقبة أمري - أو قال : عاجله وآجله - فاصرفه عني واصرفني عنه ، واقدر لي الخير حيث كان ، ثم ارضني به",
        transliteration: "Allāhumma innī astakhīruka bi `ilmik, wa astaqdiruka biqudratik, wa as'aluka min faḍlika ‘l-`Aẓīm, fa'innaka taqdiru wa lā aqdir, wa ta`lamu wa lā a`lam, wa anta `allāmu ‘l-ghuyūb, Allāhumma in kunta ta`lamu anna hādha ‘l-amra - [then mention the thing to be decided] Khayrun lī fī dīnī wa ma`āshī wa `āqibati amrī - [or say] `ājilihi wa ājilih - faqdurhu lī wa yassirhu lī thumma bārik lī fīh, wa in kunta ta`lamu anna hādha ‘l-amra sharrun lī fī dīnī wa ma`āshī wa `āqibati 'amrī - [or say] `ājilihi wa 'ājilihi - faṣrifhu `annī waṣrifnī `anh, waqdur liya ‘l-khayra ḥaythu kān, thumma arḍinī bih.",
        translation: "O Allah, I seek the counsel of Your Knowledge, and I seek the help of Your Omnipotence, and I beseech You for Your Magnificent Grace. Surely, You are Capable and I am not. You know and I know not, and You are the Knower of the unseen. O Allah, if You know that this matter [then mention the thing to be decided] is good for me in my religion and in my life and for my welfare in the life to come, - [or say: in this life and the afterlife] - then ordain it for me and make it easy for me, then bless me in it. And if You know that this matter is bad for me in my religion and in my life and for my welfare in the life to come, - [or say: in this life and the afterlife] - then distance it from me, and distance me from it, and ordain for me what is good wherever it may be, and help me to be content with it.",
        reference: "Hisn al-Muslim (dhikr 74) · Al-Bukhari 7/162",
        collection: "hisn",
        bookNumber: "1",
        hadithNumber: "74",
      },
    ],
  },
  {
    id: "eid-prayer",
    title: "Eid Prayer",
    arabicTitle: "صلاة العيد",
    items: [
      {
        id: "order",
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
        title: "Takbirat of Eid",
        arabic: "حَدَّثَنَا هِشَامُ بْنُ عَمَّارٍ، حَدَّثَنَا عَبْدُ الرَّحْمَنِ بْنُ سَعْدِ بْنِ عَمَّارِ بْنِ سَعْدٍ، مُؤَذِّنِ رَسُولِ اللَّهِ ـ صلى الله عليه وسلم ـ حَدَّثَنِي أَبِي عَنْ أَبِيهِ عَنْ جَدِّهِ أَنَّ رَسُولَ اللَّهِ ـ صلى الله عليه وسلم ـ كَانَ يُكَبِّرُ فِي الْعِيدَيْنِ فِي الأُولَى سَبْعًا قَبْلَ الْقِرَاءَةِ وَفِي الآخِرَةِ خَمْسًا قَبْلَ الْقِرَاءَةِ ‏.‏",
        translation: "‘Abdur-Rahman bin Sa’d bin ‘Ammar bin Sa’d, the Mu’adhdhin of the Messenger of Allah (ﷺ), narrated from his father, from his father, from his grandfather, that the Messenger of Allah (ﷺ) used to say the Takbir in the ‘Eid prayer, seven times in the first (Rak’ah) before reciting Qur’an, and five times in the second before reciting Qur’an.",
        reference: "Sunan Ibn Majah 1277",
        collection: "ibnmajah",
        bookNumber: "5",
        hadithNumber: "1277",
        grades: "Hasan (Darussalam)",
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
        id: "stand-with-imam",
        title: "Whoever Stands With the Imam",
        arabic: "مَنْ قَامَ مَعَ الإِمَامِ حَتَّى يَنْصَرِفَ كُتِبَ لَهُ قِيَامُ لَيْلَةٍ",
        translation: "Indeed, whoever stands (praying) with the Imam until he finished, then it is recorded for him that he prayed the whole night.",
        reference: "Jami at-Tirmidhi 806",
        collection: "tirmidhi",
        bookNumber: "8",
        hadithNumber: "806",
        grades: "Sahih (Darussalam)",
      },
      {
        id: "prophetic-pattern",
        title: "The Prophet's ﷺ Pattern in the Last Ten",
        arabic: "صُمْنَا مَعَ رَسُولِ اللَّهِ ـ صلى الله عليه وسلم ـ رَمَضَانَ فَلَمْ يَقُمْ بِنَا شَيْئًا مِنْهُ حَتَّى بَقِيَ سَبْعُ لَيَالٍ فَقَامَ بِنَا لَيْلَةَ السَّابِعَةِ حَتَّى مَضَى نَحْوٌ مِنْ ثُلُثِ اللَّيْلِ",
        translation: "We fasted Ramadan with the Messenger of Allah (ﷺ) and he did not lead us in praying Qiyam (prayers at night) during any part of it, until there were seven nights left. He led us in praying Qiyam on the seventh night until approximately one third of the night had passed.",
        reference: "Sunan Ibn Majah 1327",
        collection: "ibnmajah",
        bookNumber: "5",
        hadithNumber: "1327",
        grades: "Sahih (Darussalam)",
      },
    ],
  },
];

export const SECTION_ICONS: Record<string, string> = {
  wudu: "water-outline",
  salah: "hand-left-outline",
  congregation: "people-outline",
  janazah: "heart-outline",
  istikhara: "navigate-outline",
  "eid-prayer": "sparkles-outline",
  taraweeh: "flame-outline",
};

async function mapLimit<T>(items: T[], limit: number, fn: (item: T) => Promise<void>): Promise<void> {
  let next = 0;
  async function worker(): Promise<void> {
    while (next < items.length) {
      const idx = next++;
      await fn(items[idx]);
    }
  }
  const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker());
  await Promise.all(workers);
}

/**
 * Silently re-fetches bundled guide hadiths from the hadith API (AsyncStorage-cached,
 * offline-safe). Updates grades always; Arabic/translation only for items bundled in full.
 */
export async function refreshGuideItems(items: RamadanGuideItem[]): Promise<Record<string, GuideUpdate>> {
  const out: Record<string, GuideUpdate> = {};
  await mapLimit(items, 6, async (item) => {
    if (item.collection === 'quran') return;
    if (!item.bookNumber || !item.hadithNumber) return;
    if (!/^\d+$/.test(item.bookNumber) || !/^\d+$/.test(item.hadithNumber)) return;
    try {
      const h: HadithItem = await fetchSingleHadith(item.collection, item.bookNumber, item.hadithNumber);
      const update: GuideUpdate = {};
      const grade = getHadithGrade(h);
      if (grade) update.grades = grade;
      if (item.fullText) {
        const ar = cleanHadithText(h.ar?.text, h.ar?.body);
        const en = cleanHadithText(h.en?.text, h.en?.body);
        if (ar) update.arabic = ar;
        if (en) update.translation = en;
      }
      if (update.grades || update.arabic || update.translation) out[item.id] = update;
    } catch {
      // offline or API unavailable — keep bundled content
    }
  });
  return out;
}
