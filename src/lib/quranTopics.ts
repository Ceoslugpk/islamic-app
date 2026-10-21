import { t } from './i18n';

export interface TopicVerse {
  surah: number;
  ayah: number;
  surahName: string;
  arabicExcerpt: string;
  translation: string;
}

export interface QuranTopic {
  id: string;
  title: string;
  arabicTitle: string;
  description: string;
  icon: string;
  verses: TopicVerse[];
}

export const QURAN_TOPICS: QuranTopic[] = [
  {
    id: 'patience',
    title: 'Patience & Perseverance',
    arabicTitle: 'الصبر والمصابرة',
    description: 'Steadfastness during difficulties, enduring hardship with dignity, and holding onto faith.',
    icon: 'hourglass-outline',
    verses: [
      {
        surah: 2,
        ayah: 153,
        surahName: 'Al-Baqarah',
        arabicExcerpt: 'يَـٰٓأَيُّهَا ٱلَّذِينَ ءَامَنُوا۟ ٱسْتَعِينُوا۟ بِٱلصَّبْرِ وَٱلصَّلَوٰةِ ۚ إِنَّ ٱللَّهَ مَعَ ٱلصَّـٰبِرِينَ',
        get translation() {
          return t('O you who have believed, seek help through patience and prayer. Indeed, Allah is with the patient.');
        },
      },
      {
        surah: 3,
        ayah: 200,
        surahName: "Ali 'Imran",
        arabicExcerpt: 'يَـٰٓأَيُّهَا ٱلَّذِينَ ءَامَنُوا۟ ٱصْبِرُوا۟ وَصَابِرُوا۟ وَرَابِطُوا۟ وَٱتَّقُوا۟ ٱللَّهَ لَعَلَّكُمْ تُفْلِحُونَ',
        get translation() {
          return t('O you who have believed, persevere and endure and remain stationed and fear Allah that you may be successful.');
        },
      },
      {
        surah: 39,
        ayah: 10,
        surahName: 'Az-Zumar',
        arabicExcerpt: 'إِنَّمَا يُوَفَّى ٱلصَّـٰبِرُونَ أَجْرَهُم بِغَيْرِ حِسَابٍ',
        get translation() {
          return t('Only those who are patient will receive their reward without measure.');
        },
      },
      {
        surah: 94,
        ayah: 5,
        surahName: 'Ash-Sharh',
        arabicExcerpt: 'فَإِنَّ مَعَ ٱلْعُسْرِ يُسْرًا • إِنَّ مَعَ ٱلْعُسْرِ يُسْرًا',
        get translation() {
          return t('For indeed, with hardship [will be] ease. Indeed, with hardship [will be] ease.');
        },
      },
    ],
  },
  {
    id: 'mercy',
    title: 'Mercy & Forgiveness',
    arabicTitle: 'الرحمة والمغفرة',
    description: 'The boundless compassion and pardoning nature of Allah for those who turn back to Him.',
    icon: 'heart-outline',
    verses: [
      {
        surah: 39,
        ayah: 53,
        surahName: 'Az-Zumar',
        arabicExcerpt: 'قُلْ يَـٰعِبَادِىَ ٱلَّذِينَ أَسْرَفُوا۟ عَلَىٰٓ أَنفُسِهِمْ لَا تَقْنَطُوا۟ مِن رَّحْمَةِ ٱللَّهِ ۚ إِنَّ ٱللَّهَ يَغْفِرُ ٱلذُّنُوبَ جَمِيعًا',
        get translation() {
          return t('Say, "O My servants who have transgressed against themselves, do not despair of the mercy of Allah. Indeed, Allah forgives all sins."');
        },
      },
      {
        surah: 7,
        ayah: 156,
        surahName: "Al-A'raf",
        arabicExcerpt: 'وَرَحْمَتِى وَسِعَتْ كُلَّ شَىْءٍۢ',
        get translation() {
          return t('And My mercy encompasses all things.');
        },
      },
      {
        surah: 15,
        ayah: 49,
        surahName: 'Al-Hijr',
        arabicExcerpt: '۞ نَبِّئْ عِبَادِىٓ أَنِّىٓ أَنَا ٱلْغَفُورُ ٱلرَّحِيمُ',
        get translation() {
          return t('Inform My servants that it is I who am the Forgiving, the Merciful.');
        },
      },
      {
        surah: 3,
        ayah: 133,
        surahName: "Ali 'Imran",
        arabicExcerpt: '۞ وَسَارِعُوٓا۟ إِلَىٰ مَغْفِرَةٍۢ مِّن رَّبِّكُمْ وَجَنَّةٍ عَرْضُهَا ٱلسَّمَـٰوَٰتُ وَٱلْأَرْضُ أُعِدَّتْ لِلْمُتَّقِينَ',
        get translation() {
          return t('And hasten to forgiveness from your Lord and a garden as wide as the heavens and earth, prepared for the righteous.');
        },
      },
    ],
  },
  {
    id: 'prayer',
    title: 'Prayer & Remembrance',
    arabicTitle: 'الصلاة والذكر',
    description: 'Establishing regular prayer and sustaining consciousness of Allah throughout the day.',
    icon: 'fitness-outline',
    verses: [
      {
        surah: 20,
        ayah: 14,
        surahName: 'Ta-Ha',
        arabicExcerpt: 'إِنَّنِىٓ أَنَا ٱللَّهُ لَآ إِلَـٰهَ إِلَّآ أَنَا۠ فَٱعْبُدْنِى وَأَقِمِ ٱلصَّلَوٰةَ لِذِكْرِىٓ',
        get translation() {
          return t('Indeed, I am Allah. There is no deity except Me, so worship Me and establish prayer for My remembrance.');
        },
      },
      {
        surah: 29,
        ayah: 45,
        surahName: "Al-'Ankabut",
        arabicExcerpt: 'إِنَّ ٱلصَّلَوٰةَ تَنْهَىٰ عَنِ ٱلْفَحْشَآءِ وَٱلْمُنكَرِ ۗ وَلَذِكْرُ ٱللَّهِ أَكْبَرُ',
        get translation() {
          return t('Indeed, prayer prohibits immorality and wrongdoing, and the remembrance of Allah is greater.');
        },
      },
      {
        surah: 13,
        ayah: 28,
        surahName: "Ar-Ra'd",
        arabicExcerpt: 'أَلَا بِذِكْرِ ٱللَّهِ تَطْمَئِنُّ ٱلْقُلُوبُ',
        get translation() {
          return t('Unquestionably, by the remembrance of Allah hearts are assured.');
        },
      },
      {
        surah: 2,
        ayah: 152,
        surahName: 'Al-Baqarah',
        arabicExcerpt: 'فَٱذْكُرُونِىٓ أَذْكُرْكُمْ وَٱشْكُرُوا۟ لِى وَلَا تَكْفُرُونِ',
        get translation() {
          return t('So remember Me; I will remember you. And be grateful to Me and do not deny Me.');
        },
      },
    ],
  },
  {
    id: 'charity',
    title: 'Charity & Generosity',
    arabicTitle: 'الصدقة والإنفاق',
    description: 'Giving willingly for the sake of Allah, aiding the needy, and detaching from greed.',
    icon: 'gift-outline',
    verses: [
      {
        surah: 2,
        ayah: 261,
        surahName: 'Al-Baqarah',
        arabicExcerpt: 'مَّثَلُ ٱلَّذِينَ يُنفِقُونَ أَمْوَٰلَهُمْ فِى سَبِيلِ ٱللَّهِ كَمَثَلِ حَبَّةٍ أَنۢبَتَتْ سَبْعَ سَنَابِلَ فِى كُلِّ سُنۢبُلَةٍۢ مِّا۟ئَةُ حَبَّةٍۢ',
        get translation() {
          return t('The example of those who spend their wealth in the way of Allah is like a seed of grain which grows seven spikes; in each spike is a hundred grains.');
        },
      },
      {
        surah: 2,
        ayah: 274,
        surahName: 'Al-Baqarah',
        arabicExcerpt: 'ٱلَّذِينَ يُنفِقُونَ أَمْوَٰلَهُم بِٱلَّيْلِ وَٱلنَّهَارِ سِرًّا وَعَلَانِيَةً فَلَهُمْ أَجْرُهُمْ عِندَ رَبِّهِمْ',
        get translation() {
          return t('Those who spend their wealth [in Allah\'s way] by night and by day, secretly and publicly - they will have their reward with their Lord.');
        },
      },
      {
        surah: 3,
        ayah: 92,
        surahName: "Ali 'Imran",
        arabicExcerpt: 'لَن تَنَالُوا۟ ٱلْبِرَّ حَتَّىٰ تُنفِقُوا۟ مِمَّا تُحِبُّونَ',
        get translation() {
          return t('Never will you attain good [reward] until you spend [in the way of Allah] from that which you love.');
        },
      },
    ],
  },
  {
    id: 'tawakkul',
    title: 'Trust in Allah (Tawakkul)',
    arabicTitle: 'التوكل على الله',
    description: 'Relying upon Allah\'s wisdom, divine decree, and seeking His guidance in all affairs.',
    icon: 'shield-checkmark-outline',
    verses: [
      {
        surah: 65,
        ayah: 3,
        surahName: 'At-Talaq',
        arabicExcerpt: 'وَمَن يَتَوَكَّلْ عَلَى ٱللَّهِ فَهُوَ حَسْبُهُۥٓ ۚ إِنَّ ٱللَّهَ بَـٰلِغُ أَمْرِهِۦ',
        get translation() {
          return t('And whoever relies upon Allah - then He is sufficient for him. Indeed, Allah will accomplish His purpose.');
        },
      },
      {
        surah: 3,
        ayah: 159,
        surahName: "Ali 'Imran",
        arabicExcerpt: 'فَإِذَا عَزَمْتَ فَتَوَكَّلْ عَلَى ٱللَّهِ ۚ إِنَّ ٱللَّهَ يُحِبُّ ٱلْمُتَوَكِّلِينَ',
        get translation() {
          return t('And when you have decided, then rely upon Allah. Indeed, Allah loves those who rely [upon Him].');
        },
      },
      {
        surah: 9,
        ayah: 129,
        surahName: 'At-Tawbah',
        arabicExcerpt: 'حَسْبِىَ ٱللَّهُ لَآ إِلَـٰهَ إِلَّا هُوَ ۖ عَلَيْهِ تَوَكَّلْتُ ۖ وَهُوَ رَبُّ ٱلْعَرْشِ ٱلْعَظِيمِ',
        get translation() {
          return t('Sufficient for me is Allah; there is no deity except Him. On Him I have relied, and He is the Lord of the Great Throne.');
        },
      },
    ],
  },
  {
    id: 'justice',
    title: 'Justice & Integrity',
    arabicTitle: 'العدل والقسط',
    description: 'Standing firmly for fairness, honest dealing, and upholding equity regardless of relation.',
    icon: 'scale-outline',
    verses: [
      {
        surah: 4,
        ayah: 135,
        surahName: 'An-Nisa',
        arabicExcerpt: '۞ يَـٰٓأَيُّهَا ٱلَّذِينَ ءَامَنُوا۟ كُونُوا۟ قَوَّٰمِينَ بِٱلْقِسْطِ شُهَدَآءَ لِلَّهِ وَلَوْ عَلَىٰٓ أَنفُسِكُمْ أَوِ ٱلْوَٰلِدَيْنِ وَٱلْأَقْرَبِينَ',
        get translation() {
          return t('O you who have believed, be persistently standing firm in justice, witnesses for Allah, even if it be against yourselves or parents and relatives.');
        },
      },
      {
        surah: 5,
        ayah: 8,
        surahName: "Al-Ma'idah",
        arabicExcerpt: 'وَلَا يَجْرِمَنَّكُمْ شَنَـَٔانُ قَوْمٍ عَلَىٰٓ أَلَّا تَعْدِلُوا۟ ۚ ٱعْدِلُوا۟ هُوَ أَقْرَبُ لِلتَّقْوَىٰ',
        get translation() {
          return t('And do not let the hatred of a people prevent you from being just. Be just; that is nearer to righteousness.');
        },
      },
      {
        surah: 16,
        ayah: 90,
        surahName: 'An-Nahl',
        arabicExcerpt: '۞ إِنَّ ٱللَّهَ يَأْمُرُ بِٱلْعَدْلِ وَٱلْإِحْسَـٰنِ وَإِيتَآىِٕ ذِى ٱلْقُرْبَىٰ',
        get translation() {
          return t('Indeed, Allah orders justice and good conduct and giving to relatives.');
        },
      },
    ],
  },
  {
    id: 'parents',
    title: 'Kindness to Parents',
    arabicTitle: 'بر الوالدين',
    description: 'Honoring mothers and fathers, speaking gently to them, and supplicating for their well-being.',
    icon: 'people-outline',
    verses: [
      {
        surah: 17,
        ayah: 23,
        surahName: 'Al-Isra',
        arabicExcerpt: '۞ وَقَضَىٰ رَبُّكَ أَلَّا تَعْبُدُوٓا۟ إِلَّآ إِيَّاهُ وَبِٱلْوَٰلِدَيْنِ إِحْسَـٰنًا ۚ إِمَّا يَبْلُغَنَّ عِندَكَ ٱلْكِبَرَ أَحَدُهُمَآ أَوْ كِلَاهُمَا فَلَا تَقُل لَّهُمَآ أُفٍّۢ وَلَا تَنْهَرْهُمَا',
        get translation() {
          return t('And your Lord has decreed that you not worship except Him, and to parents, good treatment. Whether one or both of them reach old age with you, say not to them [so much as], "uff," and do not repel them.');
        },
      },
      {
        surah: 17,
        ayah: 24,
        surahName: 'Al-Isra',
        arabicExcerpt: 'وَٱخْفِضْ لَهُمَا جَنَاحَ ٱلذُّلِّ مِنَ ٱلرَّحْمَةِ وَقُل رَّبِّ ٱرْحَمْهُمَا كَمَا رَبَّيَانِى صَغِيرًا',
        get translation() {
          return t('And lower to them the wing of humility out of mercy and say, "My Lord, have mercy upon them as they brought me up [when I was] small."');
        },
      },
      {
        surah: 31,
        ayah: 14,
        surahName: 'Luqman',
        arabicExcerpt: 'وَوَصَّيْنَا ٱلْإِنسَـٰنَ بِوَٰلِدَيْهِ حَمَلَتْهُ أُمُّهُۥ وَهْنًا عَلَىٰ وَهْنٍۢ وَفِصَـٰلُهُۥ فِى عَامَيْنِ أَنِ ٱشْكُرْ لِى وَلِوَٰلِدَيْكَ',
        get translation() {
          return t('And We have enjoined upon man [care] for his parents. His mother carried him, [increasing her] in weakness upon weakness, and his weaning is in two years. Be grateful to Me and to your parents.');
        },
      },
    ],
  },
  {
    id: 'creation',
    title: 'Creation & Reflection',
    arabicTitle: 'التفكر في خلق الله',
    description: 'Contemplating the cosmos, natural signs, and marvels of creation pointing to the Divine.',
    icon: 'planet-outline',
    verses: [
      {
        surah: 3,
        ayah: 190,
        surahName: "Ali 'Imran",
        arabicExcerpt: 'إِنَّ فِى خَلْقِ ٱلسَّمَـٰوَٰتِ وَٱلْأَرْضِ وَٱخْتِلَـٰفِ ٱلَّيْلِ وَٱلنَّهَارِ لَـَٔايَـٰتٍۢ لِّأُو۟لِى ٱلْأَلْبَـٰبِ',
        get translation() {
          return t('Indeed, in the creation of the heavens and the earth and the alternation of the night and the day are signs for those of understanding.');
        },
      },
      {
        surah: 67,
        ayah: 3,
        surahName: 'Al-Mulk',
        arabicExcerpt: 'ٱلَّذِى خَلَقَ سَبْعَ سَمَـٰوَٰتٍۢ طِبَاقًا ۖ مَّا تَرَىٰ فِى خَلْقِ ٱلرَّحْمَـٰنِ مِن تَفَـٰوُتٍۢ ۖ فَٱرْجِعِ ٱلْبَصَرَ هَلْ تَرَىٰ مِن فُطُورٍۢ',
        get translation() {
          return t('[And] who created seven heavens in layers. You see not in the creation of the Most Merciful any inconsistency. So return [your] vision; do you see any breaks?');
        },
      },
      {
        surah: 88,
        ayah: 17,
        surahName: 'Al-Ghashiyah',
        arabicExcerpt: 'أَفَلَا يَنظُرُونَ إِلَى ٱلْإِبِلِ كَيْفَ خُلِقَتْ • وَإِلَى ٱلسَّمَآءِ كَيْفَ رُفِعَتْ',
        get translation() {
          return t('Then do they not look at the camels - how they are created? And at the sky - how it is raised?');
        },
      },
    ],
  },
  {
    id: 'trials',
    title: 'Trials & Hope',
    arabicTitle: 'الابتلاء والرجاء',
    description: 'Understanding life tests as opportunities for spiritual growth, expiation, and drawing closer to Allah.',
    icon: 'sunny-outline',
    verses: [
      {
        surah: 2,
        ayah: 155,
        surahName: 'Al-Baqarah',
        arabicExcerpt: 'وَلَنَبْلُوَنَّكُم بِشَىْءٍۢ مِّنَ ٱلْخَوْفِ وَٱلْجُوعِ وَنَقْصٍۢ مِّنَ ٱلْأَمْوَٰلِ وَٱلْأَنفُسِ وَٱلثَّمَرَٰتِ ۗ وَبَشِّرِ ٱلصَّـٰبِرِينَ',
        get translation() {
          return t('And We will surely test you with something of fear and hunger and a loss of wealth and lives and fruits, but give good tidings to the patient.');
        },
      },
      {
        surah: 2,
        ayah: 286,
        surahName: 'Al-Baqarah',
        arabicExcerpt: 'لَا يُكَلِّفُ ٱللَّهُ نَفْسًا إِلَّا وُسْعَهَا ۚ لَهَا مَا كَسَبَتْ وَعَلَيْهَا مَا ٱكْتَسَبَتْ',
        get translation() {
          return t('Allah does not burden a soul beyond that it can bear. It will have [the consequence of] what [good] it has gained, and it will bear [the consequence of] what [evil] it has earned.');
        },
      },
      {
        surah: 67,
        ayah: 2,
        surahName: 'Al-Mulk',
        arabicExcerpt: 'ٱلَّذِى خَلَقَ ٱلْمَوْتَ وَٱلْحَيَوٰةَ لِيَبْلُوَكُمْ أَيُّكُمْ أَحْسَنُ عَمَلًا',
        get translation() {
          return t('[He] who created death and life to test you [as to] which of you is best in deed - and He is the Exalted in Might, the Forgiving.');
        },
      },
    ],
  },
  {
    id: 'hereafter',
    title: 'The Hereafter & Accountability',
    arabicTitle: 'اليوم الآخر والحساب',
    description: 'Remembering the Day of Resurrection, eternal accountability, and the gardens of Paradise.',
    icon: 'sparkles-outline',
    verses: [
      {
        surah: 99,
        ayah: 7,
        surahName: 'Az-Zalzalah',
        arabicExcerpt: 'فَمَن يَعْمَلْ مِثْقَالَ ذَرَّةٍ خَيْرًا يَرَهُۥ • وَمَن يَعْمَلْ مِثْقَالَ ذَرَّةٍۢ شَرًّا يَرَهُۥ',
        get translation() {
          return t('So whoever does an atom\'s weight of good will see it, and whoever does an atom\'s weight of evil will see it.');
        },
      },
      {
        surah: 21,
        ayah: 47,
        surahName: 'Al-Anbiya',
        arabicExcerpt: 'وَنَضَعُ ٱلْمَوَٰزِينَ ٱلْقِسْطَ لِيَوْمِ ٱلْقِيَـٰمَةِ فَلَا تُظْلَمُ نَفْسٌ شَيْـًٔا',
        get translation() {
          return t('And We place the scales of justice for the Day of Resurrection, so no soul will be treated unjustly at all.');
        },
      },
      {
        surah: 82,
        ayah: 13,
        surahName: 'Al-Infitar',
        arabicExcerpt: 'إِنَّ ٱلْأَبْرَارَ لَفِى نَعِيمٍۢ',
        get translation() {
          return t('Indeed, the righteous will be in pleasure.');
        },
      },
    ],
  },
];
