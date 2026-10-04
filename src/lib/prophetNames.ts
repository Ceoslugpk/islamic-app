/**
 * The 99 traditional names & titles of the Prophet Muhammad ﷺ (Shama'il / Asma un-Nabi).
 *
 * Curated from the classical compilations of the Prophet's ﷺ names and attributes —
 * scholars (e.g. Imam al-Jazuli) compiled these collections so that remembering his ﷺ
 * noble names would match the devotional practice of the 99 Names of Allah.
 *
 * Static-only: EsmaulHusna.org serves the Names of Allah exclusively (`/esmas/`) and has
 * no Prophet-names endpoint (verified), so no fetch layer is used here.
 */

export interface ProphetName {
  number: number;
  /** Vocalized Arabic (RTL). */
  arabic: string;
  transliteration: string;
  /** English meaning / translation. */
  meaning: string;
  /** Optional one-line note (source, context, or hadith reference). */
  note?: string;
}

export const PROPHET_NAMES_99: ProphetName[] = [
  { number: 1, arabic: 'مُحَمَّدٌ', transliteration: 'Muhammad', meaning: 'The Highly Praised', note: 'From the Arabic root meaning praise; mentioned by name four times in the Qur’an.' },
  { number: 2, arabic: 'أَحْمَدٌ', transliteration: 'Ahmad', meaning: 'The Most Commendable', note: 'Prophet Isa (Jesus) announced his coming (Qur’an 61:6).' },
  { number: 3, arabic: 'حَامِدٌ', transliteration: 'Hamid', meaning: 'The One Who Praises' },
  { number: 4, arabic: 'مَحْمُودٌ', transliteration: 'Mahmud', meaning: 'The Praised' },
  { number: 5, arabic: 'قَاسِمٌ', transliteration: 'Qasim', meaning: 'The Distributor', note: 'His kunya was Abu al-Qasim — father of Qasim.' },
  { number: 6, arabic: 'عَاقِبٌ', transliteration: 'Aqib', meaning: 'The Last in Succession', note: '“I am the Aqib, after whom there will be no prophet.” (Bukhari & Muslim)' },
  { number: 7, arabic: 'فَاتِحٌ', transliteration: 'Fatih', meaning: 'The Opener and Victor', note: 'A title linked to the opening (conquest) of Makkah.' },
  { number: 8, arabic: 'شَاهِدٌ', transliteration: 'Shahid', meaning: 'The Witness' },
  { number: 9, arabic: 'حَاشِرٌ', transliteration: 'Hashir', meaning: 'The Gatherer', note: '“I am the Hashir, at whose feet people will be resurrected.” (Muslim)' },
  { number: 10, arabic: 'رَشِيدٌ', transliteration: 'Rashid', meaning: 'The Rightly Guiding' },
  { number: 11, arabic: 'مَشْهُودٌ', transliteration: 'Mashhud', meaning: 'The Witnessed' },
  { number: 12, arabic: 'بَشِيرٌ', transliteration: 'Bashir', meaning: 'The Bringer of Good News' },
  { number: 13, arabic: 'نَذِيرٌ', transliteration: 'Nadhir', meaning: 'The Warner' },
  { number: 14, arabic: 'دَاعٍ', transliteration: "Dae'i", meaning: 'The Caller' },
  { number: 15, arabic: 'شَافٍ', transliteration: 'Shafi', meaning: 'The Healer' },
  { number: 16, arabic: 'هَادٍ', transliteration: 'Hadi', meaning: 'The Guide' },
  { number: 17, arabic: 'مَهْدِيٌّ', transliteration: 'Mahdi', meaning: 'The Guided' },
  { number: 18, arabic: 'مَاحٍ', transliteration: 'Mahi', meaning: 'The Effacer of Disbelief', note: '“I am the Mahi — through me Allah will erase disbelief.” (Bukhari & Muslim)' },
  { number: 19, arabic: 'مُنْجٍ', transliteration: 'Munji', meaning: 'The Deliverer' },
  { number: 20, arabic: 'نَاهٍ', transliteration: 'Nahi', meaning: 'The One Who Forbids Wrong' },
  { number: 21, arabic: 'رَسُولٌ', transliteration: 'Rasul', meaning: 'The Messenger' },
  { number: 22, arabic: 'نَبِيٌّ', transliteration: 'Nabi', meaning: 'The Prophet' },
  { number: 23, arabic: 'أُمِّيٌّ', transliteration: 'Ummi', meaning: 'The Unlettered Prophet', note: 'The unlettered prophet, mentioned by name (Qur’an 7:158).' },
  { number: 24, arabic: 'تِهَامِيٌّ', transliteration: 'Tihami', meaning: 'The One from Tihama' },
  { number: 25, arabic: 'هَاشِمِيٌّ', transliteration: 'Hashimi', meaning: 'The One from Banu Hashim' },
  { number: 26, arabic: 'أَبْطَحِيٌّ', transliteration: 'Abtahi', meaning: 'The One from al-Bathaa' },
  { number: 27, arabic: 'عَزِيزٌ', transliteration: 'Aziz', meaning: 'The Noble and Dear' },
  { number: 28, arabic: 'حَرِيصٌ عَلَيْكُمْ', transliteration: 'Harisun Alaykum', meaning: 'Full of Concern for You', note: 'A Qur’anic description of his deep concern for the believers (9:128).' },
  { number: 29, arabic: 'رَؤُوفٌ', transliteration: 'Rauf', meaning: 'The Most Kind' },
  { number: 30, arabic: 'رَحِيمٌ', transliteration: 'Rahim', meaning: 'The Merciful' },
  { number: 31, arabic: 'طٰهٰ', transliteration: 'Ta Ha', meaning: 'A Traditional Prophetic Name', note: 'The opening letters of Surah Ta-Ha (20).' },
  { number: 32, arabic: 'مُجْتَبَىٰ', transliteration: 'Mujtaba', meaning: 'The Chosen', note: 'Chosen and well-pleasing to Allah.' },
  { number: 33, arabic: 'طٰسٓ', transliteration: 'Ta Sin', meaning: 'A Traditional Prophetic Name', note: 'The opening letters of Surah Ash-Shu’ara’ (26) and Al-Qasas (27).' },
  { number: 34, arabic: 'مُرْتَضَىٰ', transliteration: 'Murtada', meaning: 'The One Pleasing to Allah' },
  { number: 35, arabic: 'حٰمٓ', transliteration: 'Ha Mim', meaning: 'A Traditional Prophetic Name', note: 'The opening letters of seven suras, from Ghafir (40) to Al-Ahqaf (46).' },
  { number: 36, arabic: 'مُصْطَفَىٰ', transliteration: 'Mustafa', meaning: 'The Chosen One', note: 'Purified and selected by Allah for prophethood.' },
  { number: 37, arabic: 'يٰسٓ', transliteration: 'Ya Sin', meaning: 'A Traditional Prophetic Name', note: 'The opening letters of Surah Ya-Sin (36).' },
  { number: 38, arabic: 'أَوْلَىٰ', transliteration: 'Awla', meaning: 'The Most Worthy' },
  { number: 39, arabic: 'مُزَّمِّلٌ', transliteration: 'Muzammil', meaning: 'The Enwrapped', note: 'Named in Surah Al-Muzzammil (73).' },
  { number: 40, arabic: 'وَلِيٌّ', transliteration: 'Wali', meaning: 'The Protecting Friend' },
  { number: 41, arabic: 'مُدَّثِّرٌ', transliteration: 'Mudaththir', meaning: 'The Cloaked', note: 'Named in Surah Al-Mudaththir (74).' },
  { number: 42, arabic: 'مَتِينٌ', transliteration: 'Matin', meaning: 'The Firm' },
  { number: 43, arabic: 'مُصَدِّقٌ', transliteration: 'Musaddiq', meaning: 'The Confirmer of Truth' },
  { number: 44, arabic: 'طَيِّبٌ', transliteration: 'Tayyib', meaning: 'The Good and Pure' },
  { number: 45, arabic: 'نَاصِرٌ', transliteration: 'Nasir', meaning: 'The Helper' },
  { number: 46, arabic: 'مَنْصُورٌ', transliteration: 'Mansur', meaning: 'The Divinely Aided', note: 'Described as divinely aided (Qur’an 48:29).' },
  { number: 47, arabic: 'مِصْبَاحٌ', transliteration: 'Misbah', meaning: 'The Lamp' },
  { number: 48, arabic: 'آمِرٌ', transliteration: 'Amir', meaning: 'The Commander' },
  { number: 49, arabic: 'حِجَازِيٌّ', transliteration: 'Hijazi', meaning: 'The One from the Hijaz' },
  { number: 50, arabic: 'نِزَارِيٌّ', transliteration: 'Nizari', meaning: 'The Descendant of Nizar' },
  { number: 51, arabic: 'قُرَيْشِيٌّ', transliteration: 'Qurashi', meaning: 'The One from Quraysh' },
  { number: 52, arabic: 'مُضَرِيٌّ', transliteration: 'Mudari', meaning: 'The Descendant of Mudar' },
  { number: 53, arabic: 'نَبِيُّ التَّوْبَةِ', transliteration: 'Nabiyy al-Tawbah', meaning: 'The Prophet of Repentance', note: 'Mentioned in Surah At-Tawbah (9:118).' },
  { number: 54, arabic: 'حَافِظٌ', transliteration: 'Hafiz', meaning: 'The Preserver' },
  { number: 55, arabic: 'كَامِلٌ', transliteration: 'Kamil', meaning: 'The Complete' },
  { number: 56, arabic: 'صَادِقٌ', transliteration: 'Sadiq', meaning: 'The Truthful', note: 'Known as As-Sadiq — the truthful one, by the people of Makkah.' },
  { number: 57, arabic: 'أَمِينٌ', transliteration: 'Amin', meaning: 'The Trustworthy', note: 'Called the Trustworthy by the Quraysh long before his prophethood.' },
  { number: 58, arabic: 'عَبْدُ اللهِ', transliteration: 'Abdullah', meaning: 'The Servant of Allah' },
  { number: 59, arabic: 'كَلِيمُ اللهِ', transliteration: 'Kalimullah', meaning: 'The One Addressed by Allah' },
  { number: 60, arabic: 'حَبِيبُ اللهِ', transliteration: 'Habibullah', meaning: 'The Beloved of Allah' },
  { number: 61, arabic: 'نَجِيُّ اللهِ', transliteration: 'Najiyyullah', meaning: 'The Intimate of Allah' },
  { number: 62, arabic: 'صَفِيُّ اللهِ', transliteration: 'Safiyyullah', meaning: 'The Chosen Friend of Allah' },
  { number: 63, arabic: 'خَاتَمُ الْأَنْبِيَاءِ', transliteration: 'Khatam al-Anbiya', meaning: 'The Seal of the Prophets', note: 'Allah sealed the line of prophets through him (Qur’an 33:40).' },
  { number: 64, arabic: 'حَسِيبٌ', transliteration: 'Hasib', meaning: 'The Esteemed' },
  { number: 65, arabic: 'مُجِيبٌ', transliteration: 'Mujib', meaning: 'The Responsive' },
  { number: 66, arabic: 'شَكُورٌ', transliteration: 'Shakur', meaning: 'The Most Grateful' },
  { number: 67, arabic: 'مُقْتَصِدٌ', transliteration: 'Muqtasid', meaning: 'The Balanced' },
  { number: 68, arabic: 'رَسُولُ الرَّحْمَةِ', transliteration: 'Rasul al-Rahmah', meaning: 'The Messenger of Mercy', note: 'Sent as a mercy to all the worlds (Qur’an 21:107).' },
  { number: 69, arabic: 'قَوِيٌّ', transliteration: 'Qawi', meaning: 'The Strong' },
  { number: 70, arabic: 'حَفِيٌّ', transliteration: 'Hafi', meaning: 'The Caring and Well-Informed' },
  { number: 71, arabic: 'مَأْمُونٌ', transliteration: "Ma'mun", meaning: 'The Trusted' },
  { number: 72, arabic: 'مَعْلُومٌ', transliteration: "Ma'lum", meaning: 'The Well-Known' },
  { number: 73, arabic: 'حَقٌّ', transliteration: 'Haqq', meaning: 'The True' },
  { number: 74, arabic: 'مُبِينٌ', transliteration: 'Mubin', meaning: 'The Clear and Evident' },
  { number: 75, arabic: 'مُطِيعٌ', transliteration: 'Muti', meaning: 'The Obedient' },
  { number: 76, arabic: 'أَوَّلٌ', transliteration: 'Awwal', meaning: 'The First' },
  { number: 77, arabic: 'آخِرٌ', transliteration: 'Akhir', meaning: 'The Last' },
  { number: 78, arabic: 'ظَاهِرٌ', transliteration: 'Zahir', meaning: 'The Manifest' },
  { number: 79, arabic: 'بَاطِنٌ', transliteration: 'Batin', meaning: 'The Inward' },
  { number: 80, arabic: 'يَتِيمٌ', transliteration: 'Yatim', meaning: 'The Orphan', note: 'Allah found him an orphan and sheltered him (Qur’an 93:6).' },
  { number: 81, arabic: 'كَرِيمٌ', transliteration: 'Karim', meaning: 'The Generous' },
  { number: 82, arabic: 'حَكِيمٌ', transliteration: 'Hakim', meaning: 'The Wise' },
  { number: 83, arabic: 'سَيِّدٌ', transliteration: 'Sayyid', meaning: 'The Master', note: 'Master of the children of Adam (Tirmidhi).' },
  { number: 84, arabic: 'سِرَاجٌ', transliteration: 'Siraj', meaning: 'The Lamp', note: 'The Qur’an calls him a lamp conveying light (Qur’an 33:46).' },
  { number: 85, arabic: 'مُنِيرٌ', transliteration: 'Munir', meaning: 'The Illuminating' },
  { number: 86, arabic: 'مُحَرَّمٌ', transliteration: 'Muhram', meaning: 'The Sacred and Protected' },
  { number: 87, arabic: 'مُكَرَّمٌ', transliteration: 'Mukarram', meaning: 'The Honoured' },
  { number: 88, arabic: 'مُبَشِّرٌ', transliteration: 'Mubashshir', meaning: 'The Bearer of Glad Tidings' },
  { number: 89, arabic: 'مُذَكِّرٌ', transliteration: 'Mudhakkir', meaning: 'The Reminder' },
  { number: 90, arabic: 'مُطَهَّرٌ', transliteration: 'Mutahhar', meaning: 'The Purified', note: 'Purified from every fault by Allah.' },
  { number: 91, arabic: 'قَرِيبٌ', transliteration: 'Qarib', meaning: 'The Near' },
  { number: 92, arabic: 'خَلِيلٌ', transliteration: 'Khalil', meaning: 'The Close Friend' },
  { number: 93, arabic: 'مَدْعُوٌّ', transliteration: 'Maduww', meaning: 'The One Who Is Called' },
  { number: 94, arabic: 'جَوَّادٌ', transliteration: 'Jawwad', meaning: 'The Magnanimous' },
  { number: 95, arabic: 'خَاتِمٌ', transliteration: 'Khatim', meaning: 'The Seal' },
  { number: 96, arabic: 'عَادِلٌ', transliteration: 'Adil', meaning: 'The Just' },
  { number: 97, arabic: 'شَهِيرٌ', transliteration: 'Shahir', meaning: 'The Renowned' },
  { number: 98, arabic: 'شَهِيدٌ', transliteration: 'Shaheed', meaning: 'The Witness' },
  { number: 99, arabic: 'رَسُولُ الْمَلَاحِمِ', transliteration: 'Rasul al-Malahim', meaning: 'The Messenger of the Final Battles', note: 'The messenger of the great events before the Day of Judgement.' },
];
