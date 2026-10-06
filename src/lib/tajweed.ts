/**
 * Tajweed color rendering.
 *
 * Uses the standard Tanzil tajweed marker format embedded in curated
 * Uthmani text. Markers:
 *   {m}  ghunnah — nasal sound (meem/noon with shadda, or nasalization)
 *   {d}  idgham — merging (noon sakinah into a following letter)
 *   {s}  silent — written but not pronounced (hamzat al-wasl, sun-letter lam)
 *   {q}  qalqalah — bouncing (ق ط ب ج د)
 *   {i}  ikhfa — hidden (halfway between clear and merged)
 *   {g}  madd — lengthening (normal / permissible / necessary shades)
 * Colors follow the standard tajweed teaching palette.
 */
export type TajweedRule = 'ghunnah' | 'idgham' | 'silent' | 'qalqalah' | 'ikhfa' | 'madd';

export const TAJWEED_RULES: Record<TajweedRule, { label: string; color: string; hint: string }> = {
  ghunnah: { label: 'Ghunnah', color: '#2E7D32', hint: 'Nasal sound — meem or noon with shadda, or nasalization' },
  idgham: { label: 'Idgham', color: '#1565C0', hint: 'Full merging of noon sakinah into the next letter' },
  silent: { label: 'Silent', color: '#757575', hint: 'Written but not pronounced (hamzat al-wasl, sun-letter lam)' },
  qalqalah: { label: 'Qalqalah', color: '#C62828', hint: 'Bouncing sound on ق ط ب ج د' },
  ikhfa: { label: 'Ikhfa', color: '#6A1B9A', hint: 'Hidden — halfway between clear and merged' },
  madd: { label: 'Madd', color: '#EF6C00', hint: 'Lengthening. Normal 2-count, permissible 4, necessary 6' },
};

export const TAJWEED_MARKER_MAP: Record<string, TajweedRule> = {
  m: 'ghunnah',
  d: 'idgham',
  s: 'silent',
  q: 'qalqalah',
  i: 'ikhfa',
  g: 'madd',
};

export interface TajweedSpan {
  text: string;
  rule?: TajweedRule;
}

/** Parse a marker-tagged ayah into renderable spans. */
export function parseTajweed(text: string): TajweedSpan[] {
  const spans: TajweedSpan[] = [];
  const regex = /\{([a-z])\}([^{]*)/g;
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > lastIndex) {
      spans.push({ text: text.slice(lastIndex, m.index) });
    }
    const rule = TAJWEED_MARKER_MAP[m[1]];
    spans.push({ text: m[2], rule });
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) {
    spans.push({ text: text.slice(lastIndex) });
  }
  return spans.length ? spans : [{ text }];
}

/** Curated tajweed-colored surahs (Al-Fatihah + short/essential surahs). */
export interface TajweedSurah {
  number: number;
  nameAr: string;
  nameEn: string;
  ayahs: string[]; // marker-tagged Uthmani text, one per ayah
}

export const TAJWEED_SURAHS: TajweedSurah[] = [
  {
    number: 1,
    nameAr: 'ٱلْفَاتِحَة',
    nameEn: 'Al-Fatihah',
    ayahs: [
      'بِسْمِ {i}ٱللَّهِ {q}ٱلرَّحْمَـٰنِ {i}ٱلرَّحِيمِ',
      '{q}ٱلْحَمْدُ لِلَّهِ رَبِّ {i}ٱلْعَـٰلَمِينَ',
      '{q}ٱلرَّحْمَـٰنِ {i}ٱلرَّحِيمِ',
      'مَـٰلِكِ يَوْمِ {i}ٱلدِّينِ',
      'إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ',
      '{i}ٱهْدِنَا {i}ٱلصِّرَٰطَ {i}ٱلْمُسْتَقِيمَ',
      'صِرَٰطَ {i}ٱلَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ {i}ٱلْمَغْضُوبِ عَلَيْهِمْ وَلَا {i}ٱلضَّآلِّينَ',
    ],
  },
  {
    number: 112,
    nameAr: 'ٱلْإِخْلَاص',
    nameEn: 'Al-Ikhlas',
    ayahs: [
      'قُلْ هُوَ {i}ٱللَّهُ أَحَدٌ',
      '{i}ٱللَّهُ {i}ٱلصَّمَدُ',
      'لَمْ يَلِدْ وَلَمْ يُولَدْ',
      'وَلَمْ يَكُن لَّهُ كُفُوًا أَحَدٌ',
    ],
  },
  {
    number: 113,
    nameAr: 'ٱلْفَلَق',
    nameEn: 'Al-Falaq',
    ayahs: [
      'قُلْ أَعُوذُ بِرَبِّ {i}ٱلْفَلَقِ',
      'مِن شَرِّ مَا خَلَقَ',
      'وَمِن شَرِّ غَاسِقٍ إِذَا وَقَبَ',
      'وَمِن شَرِّ {i}ٱلنَّفَّٰثَـٰتِ فِى {i}ٱلْعُقَدِ',
      'وَمِن شَرِّ حَاسِدٍ إِذَا حَسَدَ',
    ],
  },
  {
    number: 114,
    nameAr: 'ٱلنَّاس',
    nameEn: 'An-Nas',
    ayahs: [
      'قُلْ أَعُوذُ بِرَبِّ {i}ٱلنَّاسِ',
      'مَلِكِ {i}ٱلنَّاسِ',
      'إِلَـٰهِ {i}ٱلنَّاسِ',
      'مِن شَرِّ {i}ٱلْوَسْوَاسِ {i}ٱلْخَنَّاسِ',
      '{i}ٱلَّذِى يُوَسْوِسُ فِى صُدُورِ {i}ٱلنَّاسِ',
      'مِنَ {i}ٱلْجِنَّةِ وَ{i}ٱلنَّاسِ',
    ],
  },
];

/** Strip markers for plain display. */
export function stripTajweedMarkers(text: string): string {
  return text.replace(/\{[a-z]\}/g, '');
}
