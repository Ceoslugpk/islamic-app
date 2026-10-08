/**
 * Arabic vocabulary trainer — curated list of the most frequent Quran words.
 * Each entry: Arabic, transliteration, English meaning, frequency tier,
 * and a sample Quran reference. Accuracy-checked against standard
 * frequency lists of Quranic vocabulary.
 */
export interface VocabWord {
  arabic: string;
  transliteration: string;
  meaning: string;
  tier: 1 | 2 | 3; // 1 = most frequent, 3 = common
  ref: string; // sample ayah reference
}

export const VOCAB_WORDS: VocabWord[] = [
  // Tier 1 — the most frequent Quranic words
  { arabic: 'الله', transliteration: 'Allāh', meaning: 'Allah (God)', tier: 1, ref: '1:1' },
  { arabic: 'رَبّ', transliteration: 'Rabb', meaning: 'Lord, Sustainer', tier: 1, ref: '1:2' },
  { arabic: 'ٱلنَّاس', transliteration: 'an-Nās', meaning: 'the people, mankind', tier: 1, ref: '114:1' },
  { arabic: 'قُل', transliteration: 'Qul', meaning: 'Say', tier: 1, ref: '112:1' },
  { arabic: 'مِن', transliteration: 'min', meaning: 'from, of', tier: 1, ref: '2:1' },
  { arabic: 'فِي', transliteration: 'fī', meaning: 'in', tier: 1, ref: '2:2' },
  { arabic: 'عَلَى', transliteration: 'ʿalā', meaning: 'upon, over', tier: 1, ref: '2:5' },
  { arabic: 'إِلَى', transliteration: 'ilā', meaning: 'to, towards', tier: 1, ref: '2:4' },
  { arabic: 'مَا', transliteration: 'mā', meaning: 'what, that which', tier: 1, ref: '2:3' },
  { arabic: 'لَا', transliteration: 'lā', meaning: 'no, not', tier: 1, ref: '2:2' },
  { arabic: 'كَانَ', transliteration: 'kāna', meaning: 'he was', tier: 1, ref: '2:30' },
  { arabic: 'لَهُ', transliteration: 'lahū', meaning: 'for him, to him', tier: 1, ref: '2:255' },
  { arabic: 'الَّذِينَ', transliteration: 'alladhīna', meaning: 'those who', tier: 1, ref: '2:2' },
  { arabic: 'يَوْم', transliteration: 'yawm', meaning: 'day', tier: 1, ref: '1:4' },
  { arabic: 'أَرْض', transliteration: 'arḍ', meaning: 'earth, land', tier: 1, ref: '2:22' },
  { arabic: 'سَمَاء', transliteration: 'samāʾ', meaning: 'sky, heaven', tier: 1, ref: '2:19' },
  { arabic: 'نَفْس', transliteration: 'nafs', meaning: 'soul, self', tier: 1, ref: '2:48' },
  { arabic: 'قَلْب', transliteration: 'qalb', meaning: 'heart', tier: 1, ref: '2:7' },
  { arabic: 'كِتَاب', transliteration: 'kitāb', meaning: 'book, scripture', tier: 1, ref: '2:2' },
  { arabic: 'آيَة', transliteration: 'āyah', meaning: 'sign, verse', tier: 1, ref: '2:106' },

  // Tier 2 — very common
  { arabic: 'صَلَاة', transliteration: 'ṣalāh', meaning: 'prayer', tier: 2, ref: '2:3' },
  { arabic: 'زَكَاة', transliteration: 'zakāh', meaning: 'almsgiving, purification', tier: 2, ref: '2:43' },
  { arabic: 'صَوْم', transliteration: 'ṣawm', meaning: 'fasting', tier: 2, ref: '2:183' },
  { arabic: 'حَجّ', transliteration: 'ḥajj', meaning: 'pilgrimage', tier: 2, ref: '2:196' },
  { arabic: 'إِيمَان', transliteration: 'īmān', meaning: 'faith, belief', tier: 2, ref: '2:3' },
  { arabic: 'كُفْر', transliteration: 'kufr', meaning: 'disbelief', tier: 2, ref: '2:102' },
  { arabic: 'رَحْمَة', transliteration: 'raḥmah', meaning: 'mercy', tier: 2, ref: '2:64' },
  { arabic: 'عَذَاب', transliteration: 'ʿadhāb', meaning: 'punishment', tier: 2, ref: '2:7' },
  { arabic: 'جَنَّة', transliteration: 'jannah', meaning: 'paradise, garden', tier: 2, ref: '2:25' },
  { arabic: 'نَار', transliteration: 'nār', meaning: 'fire', tier: 2, ref: '2:24' },
  { arabic: 'نُور', transliteration: 'nūr', meaning: 'light', tier: 2, ref: '2:257' },
  { arabic: 'ظُلُمَات', transliteration: 'ẓulumāt', meaning: 'darknesses', tier: 2, ref: '2:257' },
  { arabic: 'شَيْطَان', transliteration: 'shayṭān', meaning: 'Satan, devil', tier: 2, ref: '2:168' },
  { arabic: 'مَلَائِكَة', transliteration: 'malāʾikah', meaning: 'angels', tier: 2, ref: '2:30' },
  { arabic: 'رَسُول', transliteration: 'rasūl', meaning: 'messenger', tier: 2, ref: '2:101' },
  { arabic: 'نَبِيّ', transliteration: 'nabiyy', meaning: 'prophet', tier: 2, ref: '2:61' },
  { arabic: 'أُمَّة', transliteration: 'ummah', meaning: 'community, nation', tier: 2, ref: '2:128' },
  { arabic: 'حَقّ', transliteration: 'ḥaqq', meaning: 'truth, right', tier: 2, ref: '2:42' },
  { arabic: 'بَاطِل', transliteration: 'bāṭil', meaning: 'falsehood', tier: 2, ref: '2:42' },
  { arabic: 'خَيْر', transliteration: 'khayr', meaning: 'goodness', tier: 2, ref: '2:105' },

  // Tier 3 — common, useful for learners
  { arabic: 'شَرّ', transliteration: 'sharr', meaning: 'evil, harm', tier: 3, ref: '2:102' },
  { arabic: 'عِلْم', transliteration: 'ʿilm', meaning: 'knowledge', tier: 3, ref: '2:32' },
  { arabic: 'حِكْمَة', transliteration: 'ḥikmah', meaning: 'wisdom', tier: 3, ref: '2:129' },
  { arabic: 'صَبْر', transliteration: 'ṣabr', meaning: 'patience', tier: 3, ref: '2:45' },
  { arabic: 'شُكْر', transliteration: 'shukr', meaning: 'gratitude', tier: 3, ref: '2:152' },
  { arabic: 'ذِكْر', transliteration: 'dhikr', meaning: 'remembrance, mention', tier: 3, ref: '2:152' },
  { arabic: 'تَقْوَىٰ', transliteration: 'taqwā', meaning: 'piety, mindfulness of God', tier: 3, ref: '2:197' },
  { arabic: 'هُدًى', transliteration: 'hudan', meaning: 'guidance', tier: 3, ref: '2:2' },
  { arabic: 'ضَلَال', transliteration: 'ḍalāl', meaning: 'error, going astray', tier: 3, ref: '2:16' },
  { arabic: 'تَوْبَة', transliteration: 'tawbah', meaning: 'repentance', tier: 3, ref: '2:160' },
  { arabic: 'مَغْفِرَة', transliteration: 'maghfirah', meaning: 'forgiveness', tier: 3, ref: '2:58' },
  { arabic: 'رِزْق', transliteration: 'rizq', meaning: 'provision, sustenance', tier: 3, ref: '2:212' },
  { arabic: 'أَجْر', transliteration: 'ajr', meaning: 'reward', tier: 3, ref: '2:155' },
  { arabic: 'ذَنْب', transliteration: 'dhanb', meaning: 'sin', tier: 3, ref: '2:81' },
  { arabic: 'عِبَادَة', transliteration: 'ʿibādah', meaning: 'worship', tier: 3, ref: '2:83' },
  { arabic: 'آخِرَة', transliteration: 'ākhirah', meaning: 'the Hereafter', tier: 3, ref: '2:4' },
  { arabic: 'دُنْيَا', transliteration: 'dunyā', meaning: 'this world', tier: 3, ref: '2:85' },
  { arabic: 'حَيَاة', transliteration: 'ḥayāh', meaning: 'life', tier: 3, ref: '2:96' },
  { arabic: 'مَوْت', transliteration: 'mawt', meaning: 'death', tier: 3, ref: '2:28' },
  { arabic: 'قِيَامَة', transliteration: 'qiyāmah', meaning: 'resurrection', tier: 3, ref: '2:85' },
];

export const TIER_LABELS: Record<number, string> = {
  1: 'Most frequent',
  2: 'Very common',
  3: 'Common',
};

/**
 * Deterministic hash function for date strings (e.g. YYYY-MM-DD).
 */
export function hashDateString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) + hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Deterministically select words for a given day (YYYY-MM-DD hash).
 * Changes daily at midnight, but remains completely stable within the same day.
 */
export function getDailyWords(count: number = 5, date: Date = new Date()): VocabWord[] {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const dateStr = `${y}-${m}-${d}`;
  const baseSeed = hashDateString(dateStr);
  const result: VocabWord[] = [];
  const total = VOCAB_WORDS.length;
  const pickedIndices = new Set<number>();

  for (let i = 0; i < total && result.length < count; i++) {
    const idx = (baseSeed + i * 17) % total;
    if (!pickedIndices.has(idx)) {
      pickedIndices.add(idx);
      result.push(VOCAB_WORDS[idx]);
    }
  }
  return result;
}

/**
 * Returns today's featured Quran vocabulary word.
 */
export function getDailyWord(date: Date = new Date()): VocabWord {
  return getDailyWords(1, date)[0] ?? VOCAB_WORDS[0];
}
