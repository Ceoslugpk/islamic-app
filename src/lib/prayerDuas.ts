export interface PrayerDua {
  id: number;
  occasion: string;
  arabic: string;
  transliteration: string;
  translation: string;
  source: string;
}

export const PRAYER_DUAS: PrayerDua[] = [
  {
    id: 1,
    occasion: 'Before Wudu (Niyyah)',
    arabic: 'بِسْمِ اللَّهِ',
    transliteration: 'Bismillah',
    translation: 'In the name of Allah',
    source: 'Abu Dawud 101'
  },
  {
    id: 2,
    occasion: 'After Wudu (Testimony)',
    arabic: 'أَشْهَدُ أَنْ لَا إِلَٰهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، وَأَشْهَدُ أَنَّ مُحَمَّدًا عَبْدُهُ وَرَسُولُهُ',
    transliteration: 'Ashhadu an la ilaha illallah wahdahu la sharika lahu, wa ashhadu anna Muhammadan abduhu wa rasuluh',
    translation: 'I bear witness that there is no deity but Allah alone, with no partner, and I bear witness that Muhammad is His servant and Messenger',
    source: 'Muslim 234'
  },
  {
    id: 3,
    occasion: 'After Wudu (Dhikr)',
    arabic: 'اللَّهُمَّ اجْعَلْنِي مِنَ التَّوَّابِينَ وَاجْعَلْنِي مِنَ الْمُتَطَهِّرِينَ',
    transliteration: 'Allahumma ij\'alni minat-tawwabina waj\'alni minal-mutatahhirin',
    translation: 'O Allah, make me among those who repent and make me among those who purify themselves',
    source: 'Tirmidhi 55'
  },
  {
    id: 4,
    occasion: 'Opening Salah (Istiftah)',
    arabic: 'سُبْحَانَكَ اللَّهُمَّ وَبِحَمْدِكَ، وَتَبَارَكَ اسْمُكَ، وَتَعَالَى جَدُّكَ، وَلَا إِلَٰهَ غَيْرُكَ',
    transliteration: 'Subhanaka Allahumma wa bihamdika, wa tabaraka ismuka, wa ta\'ala jadduka, wa la ilaha ghayruk',
    translation: 'Glory be to You, O Allah, and praise be to You. Blessed is Your Name, exalted is Your Majesty, and there is no deity but You',
    source: 'Abu Dawud 775, Tirmidhi 243'
  },
  {
    id: 5,
    occasion: 'In Sujood (Prostration)',
    arabic: 'سُبْحَانَ رَبِّيَ الْأَعْلَى',
    transliteration: 'Subhana Rabbiya al-A\'la',
    translation: 'Glory be to my Lord, the Most High',
    source: 'Bukhari 761'
  },
  {
    id: 6,
    occasion: 'Between Sujoods',
    arabic: 'رَبِّ اغْفِرْ لِي',
    transliteration: 'Rabbighfir li',
    translation: 'My Lord, forgive me',
    source: 'Abu Dawud 874'
  },
  {
    id: 7,
    occasion: 'After Tashahhud (Before Salam)',
    arabic: 'اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنْ عَذَابِ الْقَبْرِ، وَمِنْ عَذَابِ جَهَنَّمَ، وَمِنْ فِتْنَةِ الْمَحْيَا وَالْمَمَاتِ، وَمِنْ شَرِّ فِتْنَةِ الْمَسِيحِ الدَّجَّالِ',
    transliteration: 'Allahumma inni a\'udhu bika min \'adhabi al-qabr, wa min \'adhabi Jahannam, wa min fitnati al-mahya wa al-mamat, wa min sharri fitnati al-Masih al-Dajjal',
    translation: 'O Allah, I seek refuge in You from the punishment of the grave, the punishment of Hellfire, the trials of life and death, and the evil of the trial of the False Messiah',
    source: 'Muslim 588'
  },
  {
    id: 8,
    occasion: 'Qunoot during Witr',
    arabic: 'اللَّهُمَّ اهْدِنِي فِيمَنْ هَدَيْتَ، وَعَافِنِي فِيمَنْ عَافَيْتَ، وَتَوَلَّنِي فِيمَنْ تَوَلَّيْتَ، وَبَارِكْ لِي فِيمَا أَعْطَيْتَ، وَقِنِي شَرَّ مَا قَضَيْتَ، فَإِنَّكَ تَقْضِي وَلَا يُقْضَى عَلَيْكَ، إِنَّهُ لَا يَذِلُّ مَنْ وَالَيْتَ، تَبَارَكْتَ رَبَّنَا وَتَعَالَيْتَ',
    transliteration: 'Allahumma ihdini fiman hadayta, wa \'afini fiman \'afayta, wa tawallani fiman tawallayta, wa barik li fima a\'tayta, wa qini sharra ma qadayta, fa innaka taqdi wa la yuqda \'alayk, innahu la yadhillu man walayta, tabarakta Rabbana wa ta\'alayta',
    translation: 'O Allah, guide me among those You have guided, pardon me among those You have pardoned, befriend me among those You have befriended, bless me in what You have given, and save me from the evil of what You have decreed. For You decree and none can decree over You. He whom You befriend is not humbled. Blessed are You, our Lord, and Exalted',
    source: 'Abu Dawud 1425, Tirmidhi 464'
  },
  {
    id: 9,
    occasion: 'For Parents (Optional in Salah)',
    arabic: 'رَبِّ ارْحَمْهُمَا كَمَا رَبَّيَانِي صَغِيرًا',
    transliteration: 'Rabb irhamhuma kama rabbayani saghira',
    translation: 'My Lord, have mercy upon them as they raised me when I was small',
    source: 'Quran 17:24'
  },
  {
    id: 10,
    occasion: 'After Salah (Closing)',
    arabic: 'أَسْتَغْفِرُ اللَّهَ، أَسْتَغْفِرُ اللَّهَ، أَسْتَغْفِرُ اللَّهَ. اللَّهُمَّ أَنْتَ السَّلَامُ وَمِنْكَ السَّلَامُ، تَبَارَكْتَ يَا ذَا الْجَلَالِ وَالْإِكْرَامِ',
    transliteration: 'Astaghfirullah, Astaghfirullah, Astaghfirullah. Allahumma Antas-Salam wa minkas-Salam, tabarakta Ya Dhal-Jalali wal-Ikram',
    translation: 'I seek forgiveness from Allah (3x). O Allah, You are Peace and from You comes Peace. Blessed are You, O Possessor of Majesty and Honor',
    source: 'Muslim 591'
  },
  {
    id: 11,
    occasion: 'Entering Masjid',
    arabic: 'اللَّهُمَّ افْتَحْ لِي أَبْوَابَ رَحْمَتِكَ',
    transliteration: 'Allahumma iftah li abwaba rahmatik',
    translation: 'O Allah, open for me the doors of Your mercy',
    source: 'Muslim 713'
  },
  {
    id: 12,
    occasion: 'Leaving Masjid',
    arabic: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ مِنْ فَضْلِكَ',
    transliteration: 'Allahumma inni as\'aluka min fadlik',
    translation: 'O Allah, I ask You from Your bounty',
    source: 'Muslim 713'
  }
];