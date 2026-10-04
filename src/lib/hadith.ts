export interface Hadith {
  id: number;
  arabic: string;
  transliteration: string;
  translation: string;
  source: string;
  reference?: string;
}

export const HADITHS: Hadith[] = [
  {
    id: 1,
    arabic: "إِنَّمَا الْأَعْمَالُ بِالنِّيَّاتِ",
    transliteration: "Innama al-a'malu bi-an-niyyat",
    translation: "Actions are but by intentions.",
    source: "Sahih al-Bukhari 1",
    reference: "Sahih al-Bukhari 1",
  },
  {
    id: 2,
    arabic: "مَنْ كَانَ يُؤْمِنُ بِاللَّهِ وَالْيَوْمِ الْآخِرِ فَلْيَقُلْ خَيْرًا أَوْ لِيَصْمُتْ",
    transliteration: "Man kana yu'minu billahi wal-yawmil-akhiri fal-yaqul khayran aw li-yasmut",
    translation: "Whoever believes in Allah and the Last Day, let him speak good or remain silent.",
    source: "Sahih al-Bukhari 6136",
    reference: "Sahih al-Bukhari 6136",
  },
  {
    id: 3,
    arabic: "الْمُسْلِمُ مَنْ سَلِمَ الْمُسْلِمُونَ مِنْ لِسَانِهِ وَيَدِهِ",
    transliteration: "Al-Muslimu man salima al-muslimuna min lisanihi wa yadihi",
    translation: "A Muslim is one from whose tongue and hand other Muslims are safe.",
    source: "Sahih al-Bukhari 10",
    reference: "Sahih al-Bukhari 10",
  },
  {
    id: 4,
    arabic: "لَا يُؤْمِنُ أَحَدُكُمْ حَتَّى يُحِبَّ لِأَخِيهِ مَا يُحِبُّ لِنَفْسِهِ",
    transliteration: "La yu'minu ahadukum hatta yuhibba li-akhihi ma yuhibbu li-nafsihi",
    translation: "None of you truly believes until he loves for his brother what he loves for himself.",
    source: "Sahih al-Bukhari 13",
    reference: "Sahih al-Bukhari 13",
  },
  {
    id: 5,
    arabic: "الْمُؤْمِنُ لِلْمُؤْمِنِ كَالْبُنْيَانِ يَشُدُّ بَعْضُهُ بَعْضًا",
    transliteration: "Al-Mu'minu lil-mu'mini kal-bunyani yashuddu ba'duhu ba'dan",
    translation: "The believer to the believer is like a building, parts supporting each other.",
    source: "Sahih al-Bukhari 6011",
    reference: "Sahih al-Bukhari 6011",
  },
  {
    id: 6,
    arabic: "الرَّاحِمُونَ يَرْحَمُهُمُ الرَّحْمَانُ",
    transliteration: "Ar-rahimuna yarhamuhumu ar-Rahman",
    translation: "The merciful are shown mercy by the Most Merciful.",
    source: "Jami at-Tirmidhi 1924",
    reference: "Jami at-Tirmidhi 1924",
  },
  {
    id: 7,
    arabic: "مَنْ لَا يَرْحَمُ لَا يُرْحَمُ",
    transliteration: "Man la yarhamu la yurham",
    translation: "Whoever does not show mercy will not be shown mercy.",
    source: "Sahih al-Bukhari 6013",
    reference: "Sahih al-Bukhari 6013",
  },
  {
    id: 8,
    arabic: "أَحَبُّ الْأَعْمَالِ إِلَى اللَّهِ أَدْوَمُهَا وَإِنْ قَلَّ",
    transliteration: "Ahabbu al-a'mali ila Allahi adwamuha wa in qalla",
    translation: "The most beloved deeds to Allah are the most consistent, even if small.",
    source: "Sahih al-Bukhari 6464",
    reference: "Sahih al-Bukhari 6464",
  },
  {
    id: 9,
    arabic: "الطُّهُورُ شَطْرُ الْإِيمَانِ",
    transliteration: "At-tahuru shatru al-iman",
    translation: "Cleanliness is half of faith.",
    source: "Sahih Muslim 223",
    reference: "Sahih Muslim 223",
  },
  {
    id: 10,
    arabic: "الصَّدَقَةُ تُطْفِئُ الْخَطِيئَةَ كَمَا يُطْفِئُ الْمَاءُ النَّارَ",
    transliteration: "As-sadaqatu tufi'u al-khati'ata kama yutfi'u al-ma'u an-nar",
    translation: "Charity extinguishes sin as water extinguishes fire.",
    source: "Jami at-Tirmidhi 614",
    reference: "Jami at-Tirmidhi 614",
  },
  {
    id: 11,
    transliteration: "Man sarra an yuzada fi rizqihi wa yunsa fi atharihi fa-yasil rahimahu",
    arabic: "مَنْ سَرَّهُ أَنْ يُزَادَ فِي رِزْقِهِ وَيُنْسَأَ فِي أَثَرِهِ فَلْيَصِلْ رَحِمَهُ",
    translation: "Whoever wishes for increased provision and extended lifespan, let him maintain ties of kinship.",
    source: "Sahih al-Bukhari 5986",
    reference: "Sahih al-Bukhari 5986",
  },
  {
    id: 12,
    arabic: "خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ",
    transliteration: "Khayrukum man ta'allama al-Qur'ana wa 'allamahu",
    translation: "The best of you are those who learn the Qur'an and teach it.",
    source: "Sahih al-Bukhari 5027",
    reference: "Sahih al-Bukhari 5027",
  },
  {
    id: 13,
    arabic: "لَا يُؤْمِنُ عَبْدٌ حَتَّى يَكُونَ هَوَاهُ تَبَعًا لِمَا جِئْتُ بِهِ",
    transliteration: "La yu'minu 'abdun hatta yakuna hawahu tab'an lima ji'tu bihi",
    translation: "A servant does not believe until his desires follow what I have brought.",
    source: "Sunan an-Nasa'i 53",
    reference: "Sunan an-Nasa'i 53",
  },
  {
    id: 14,
    arabic: "أَكْمَلُ الْمُؤْمِنِينَ إِيمَانًا أَحْسَنُهُمْ خُلُقًا",
    transliteration: "Akmalu al-mu'minina imanan ahsanuhum khuluqan",
    translation: "The most complete of believers in faith are the best of them in character.",
    source: "Jami at-Tirmidhi 1162",
    reference: "Jami at-Tirmidhi 1162",
  },
  {
    id: 15,
    arabic: "الْحَيَاءُ شُعْبَةٌ مِنَ الْإِيمَانِ",
    transliteration: "Al-haya'u shu'batun min al-iman",
    translation: "Modesty is a branch of faith.",
    source: "Sahih al-Bukhari 9",
    reference: "Sahih al-Bukhari 9",
  },
];