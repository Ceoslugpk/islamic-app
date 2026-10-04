import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Languages the primary source (islamic.app) ships a meaning for on all 99 names:
 * `en`/`es` at the top level, `bn de fr id ru tr ur` under `i18n`.
 */
export type NamesLanguage = 'en' | 'fr' | 'tr' | 'es' | 'de' | 'id' | 'bn' | 'ru' | 'ur';

export interface NameVerseRef {
  surah: number;
  ayah: number;
}

export interface Name99 {
  number: number;
  arabic: string;
  transliteration: string;
  meaning: string;
  /** Localized name title when the source provides one (the bundled list does not). */
  name?: string;
  /** Absolute recitation URL (https://esmaulhusna.org/audio/{slug}.mp3). */
  audioUrl?: string;
  /** Up to two Quran references for this name, e.g. Quran 55:1. */
  verses?: NameVerseRef[];
}

export const NAMES_99: Name99[] = [
  { number: 1, arabic: 'الرَّحْمَنُ', transliteration: 'Ar-Rahman', meaning: 'The Most Gracious' },
  { number: 2, arabic: 'الرَّحِيمُ', transliteration: 'Ar-Raheem', meaning: 'The Most Merciful' },
  { number: 3, arabic: 'الْمَلِكُ', transliteration: 'Al-Malik', meaning: 'The Sovereign / King' },
  { number: 4, arabic: 'الْقُدُّوسُ', transliteration: 'Al-Quddus', meaning: 'The Most Holy' },
  { number: 5, arabic: 'السَّلَامُ', transliteration: 'As-Salam', meaning: 'The Source of Peace' },
  { number: 6, arabic: 'الْمُؤْمِنُ', transliteration: 'Al-Mu’min', meaning: 'The Guardian of Faith' },
  { number: 7, arabic: 'الْمُهَيْمِنُ', transliteration: 'Al-Muhaymin', meaning: 'The Protector' },
  { number: 8, arabic: 'الْعَزِيزُ', transliteration: 'Al-Aziz', meaning: 'The All-Mighty' },
  { number: 9, arabic: 'الْجَبَّارُ', transliteration: 'Al-Jabbar', meaning: 'The Compeller' },
  { number: 10, arabic: 'الْمُتَكَبِّرُ', transliteration: 'Al-Mutakabbir', meaning: 'The Supreme' },
  { number: 11, arabic: 'الْخَالِقُ', transliteration: 'Al-Khaliq', meaning: 'The Creator' },
  { number: 12, arabic: 'الْبَارِئُ', transliteration: 'Al-Bari’', meaning: 'The Maker of Order' },
  { number: 13, arabic: 'الْمُصَوِّرُ', transliteration: 'Al-Musawwir', meaning: 'The Fashioner of Forms' },
  { number: 14, arabic: 'الْغَفَّارُ', transliteration: 'Al-Ghaffar', meaning: 'The Ever-Forgiving' },
  { number: 15, arabic: 'الْقَهَّارُ', transliteration: 'Al-Qahhar', meaning: 'The All-Subduing' },
  { number: 16, arabic: 'الْوَهَّابُ', transliteration: 'Al-Wahhab', meaning: 'The Bestower' },
  { number: 17, arabic: 'الرَّزَّاقُ', transliteration: 'Ar-Razzaq', meaning: 'The Provider' },
  { number: 18, arabic: 'الْفَتَّاحُ', transliteration: 'Al-Fattah', meaning: 'The Opener' },
  { number: 19, arabic: 'الْعَلِيمُ', transliteration: 'Al-Alim', meaning: 'The All-Knowing' },
  { number: 20, arabic: 'الْقَابِضُ', transliteration: 'Al-Qabid', meaning: 'The Withholder' },
  { number: 21, arabic: 'الْبَاسِطُ', transliteration: 'Al-Basit', meaning: 'The Expander' },
  { number: 22, arabic: 'الْخَافِضُ', transliteration: 'Al-Khafid', meaning: 'The Abaser' },
  { number: 23, arabic: 'الرَّافِعُ', transliteration: 'Ar-Rafi’', meaning: 'The Exalter' },
  { number: 24, arabic: 'الْمُعِزُّ', transliteration: 'Al-Mu’izz', meaning: 'The Bestower of Honor' },
  { number: 25, arabic: 'الْمُذِلُّ', transliteration: 'Al-Mudhill', meaning: 'The Humiliator' },
  { number: 26, arabic: 'السَّمِيعُ', transliteration: 'As-Sami’', meaning: 'The All-Hearing' },
  { number: 27, arabic: 'الْبَصِيرُ', transliteration: 'Al-Basir', meaning: 'The All-Seeing' },
  { number: 28, arabic: 'الْحَكَمُ', transliteration: 'Al-Hakam', meaning: 'The Impartial Judge' },
  { number: 29, arabic: 'الْعَدْلُ', transliteration: 'Al-Adl', meaning: 'The Utterly Just' },
  { number: 30, arabic: 'اللَّطِيفُ', transliteration: 'Al-Latif', meaning: 'The Subtle One' },
  { number: 31, arabic: 'الْخَبِيرُ', transliteration: 'Al-Khabir', meaning: 'The All-Aware' },
  { number: 32, arabic: 'الْحَلِيمُ', transliteration: 'Al-Halim', meaning: 'The Forbearing' },
  { number: 33, arabic: 'الْعَظِيمُ', transliteration: 'Al-Azim', meaning: 'The Magnificent' },
  { number: 34, arabic: 'الْغَفُورُ', transliteration: 'Al-Ghafur', meaning: 'The All-Forgiving' },
  { number: 35, arabic: 'الشَّكُورُ', transliteration: 'Ash-Shakur', meaning: 'The Most Appreciative' },
  { number: 36, arabic: 'الْعَلِيُّ', transliteration: 'Al-Aliyy', meaning: 'The Most High' },
  { number: 37, arabic: 'الْكَبِيرُ', transliteration: 'Al-Kabir', meaning: 'The Greatest' },
  { number: 38, arabic: 'الْحَفِيظُ', transliteration: 'Al-Hafiz', meaning: 'The Preserver' },
  { number: 39, arabic: 'الْمُقِيتُ', transliteration: 'Al-Muqit', meaning: 'The Sustainer' },
  { number: 40, arabic: 'الْحَسِيبُ', transliteration: 'Al-Hasib', meaning: 'The Reckoner' },
  { number: 41, arabic: 'الْجَلِيلُ', transliteration: 'Al-Jalil', meaning: 'The Majestic' },
  { number: 42, arabic: 'الْكَرِيمُ', transliteration: 'Al-Karim', meaning: 'The Most Generous' },
  { number: 43, arabic: 'الرَّقِيبُ', transliteration: 'Ar-Raqib', meaning: 'The Watchful' },
  { number: 44, arabic: 'الْمُجِيبُ', transliteration: 'Al-Mujib', meaning: 'The Responsive' },
  { number: 45, arabic: 'الْوَاسِعُ', transliteration: 'Al-Wasi’', meaning: 'The Boundless' },
  { number: 46, arabic: 'الْحَكِيمُ', transliteration: 'Al-Hakim', meaning: 'The All-Wise' },
  { number: 47, arabic: 'الْوَدُودُ', transliteration: 'Al-Wadud', meaning: 'The Most Loving' },
  { number: 48, arabic: 'الْمَجِيدُ', transliteration: 'Al-Majid', meaning: 'The Glorious' },
  { number: 49, arabic: 'الْبَاعِثُ', transliteration: 'Al-Ba’ith', meaning: 'The Resurrector' },
  { number: 50, arabic: 'الشَّهِيدُ', transliteration: 'Ash-Shahid', meaning: 'The Universal Witness' },
  { number: 51, arabic: 'الْحَقُّ', transliteration: 'Al-Haqq', meaning: 'The Absolute Truth' },
  { number: 52, arabic: 'الْوَكِيلُ', transliteration: 'Al-Wakil', meaning: 'The Trustee' },
  { number: 53, arabic: 'الْقَوِيُّ', transliteration: 'Al-Qawiyy', meaning: 'The Most Strong' },
  { number: 54, arabic: 'الْمَتِينُ', transliteration: 'Al-Matin', meaning: 'The Firm' },
  { number: 55, arabic: 'الْوَلِيُّ', transliteration: 'Al-Waliyy', meaning: 'The Protecting Associate' },
  { number: 56, arabic: 'الْحَمِيدُ', transliteration: 'Al-Hamid', meaning: 'The All-Praiseworthy' },
  { number: 57, arabic: 'الْمُحْصِي', transliteration: 'Al-Muhsi', meaning: 'The Accounter' },
  { number: 58, arabic: 'الْمُبْدِئُ', transliteration: 'Al-Mubdi’', meaning: 'The Originator' },
  { number: 59, arabic: 'الْمُعِيدُ', transliteration: 'Al-Mu’id', meaning: 'The Restorer' },
  { number: 60, arabic: 'الْمُحْيِي', transliteration: 'Al-Muhyi', meaning: 'The Giver of Life' },
  { number: 61, arabic: 'الْمُمِيتُ', transliteration: 'Al-Mumit', meaning: 'The Bringer of Death' },
  { number: 62, arabic: 'الْحَيُّ', transliteration: 'Al-Hayy', meaning: 'The Ever-Living' },
  { number: 63, arabic: 'الْقَيُّومُ', transliteration: 'Al-Qayyum', meaning: 'The Self-Existing Sustainer' },
  { number: 64, arabic: 'الْوَاجِدُ', transliteration: 'Al-Wajid', meaning: 'The Perceiver' },
  { number: 65, arabic: 'الْمَاجِدُ', transliteration: 'Al-Majid', meaning: 'The Illustrious' },
  { number: 66, arabic: 'الْوَاحِدُ', transliteration: 'Al-Wahid', meaning: 'The One' },
  { number: 67, arabic: 'الْأَحَدُ', transliteration: 'Al-Ahad', meaning: 'The Unique Indivisible' },
  { number: 68, arabic: 'الصَّمَدُ', transliteration: 'As-Samad', meaning: 'The Eternal Refuge' },
  { number: 69, arabic: 'الْقَادِرُ', transliteration: 'Al-Qadir', meaning: 'The All-Capable' },
  { number: 70, arabic: 'الْمُقْتَدِرُ', transliteration: 'Al-Muqtadir', meaning: 'The Determiner' },
  { number: 71, arabic: 'الْمُقَدِّمُ', transliteration: 'Al-Muqaddim', meaning: 'The Expediter' },
  { number: 72, arabic: 'الْمُؤَخِّرُ', transliteration: 'Al-Mu’akhkhir', meaning: 'The Delayer' },
  { number: 73, arabic: 'الْأَوَّلُ', transliteration: 'Al-Awwal', meaning: 'The First' },
  { number: 74, arabic: 'الْآخِرُ', transliteration: 'Al-Akhir', meaning: 'The Last' },
  { number: 75, arabic: 'الظَّاهِرُ', transliteration: 'Az-Zahir', meaning: 'The Manifest' },
  { number: 76, arabic: 'الْبَاطِنُ', transliteration: 'Al-Batin', meaning: 'The Hidden' },
  { number: 77, arabic: 'الْوَالِي', transliteration: 'Al-Wali', meaning: 'The Sole Governor' },
  { number: 78, arabic: 'الْمُتَعَالِي', transliteration: 'Al-Muta’ali', meaning: 'The Self-Exalted' },
  { number: 79, arabic: 'الْبَرُّ', transliteration: 'Al-Barr', meaning: 'The Source of All Goodness' },
  { number: 80, arabic: 'التَّوَّابُ', transliteration: 'At-Tawwab', meaning: 'The Ever-Acceptor of Repentance' },
  { number: 81, arabic: 'الْمُنْتَقِمُ', transliteration: 'Al-Muntaqim', meaning: 'The Just Avenger' },
  { number: 82, arabic: 'الْعَفُوُّ', transliteration: 'Al-Afuww', meaning: 'The Pardoner' },
  { number: 83, arabic: 'الرَّءُوفُ', transliteration: 'Ar-Ra’uf', meaning: 'The Most Kind' },
  { number: 84, arabic: 'مَالِكُ الْمُلْكِ', transliteration: 'Malik-ul-Mulk', meaning: 'The Owner of All Sovereignty' },
  { number: 85, arabic: 'ذُو الْجَلَالِ وَالْإِكْرَامِ', transliteration: 'Dhul-Jalali wal-Ikram', meaning: 'Lord of Majesty and Generosity' },
  { number: 86, arabic: 'الْمُقْسِطُ', transliteration: 'Al-Muqsit', meaning: 'The Equitable' },
  { number: 87, arabic: 'الْجَامِعُ', transliteration: 'Al-Jami’', meaning: 'The Gatherer' },
  { number: 88, arabic: 'الْغَنِيُّ', transliteration: 'Al-Ghaniyy', meaning: 'The Self-Sufficient' },
  { number: 89, arabic: 'الْمُغْنِي', transliteration: 'Al-Mughni', meaning: 'The Enricher' },
  { number: 90, arabic: 'الْمَانِعُ', transliteration: 'Al-Mani’', meaning: 'The Preventer of Harm' },
  { number: 91, arabic: 'الضَّارُّ', transliteration: 'Ad-Darr', meaning: 'The Creator of the Harmful' },
  { number: 92, arabic: 'النَّافِعُ', transliteration: 'An-Nafi’', meaning: 'The Creator of Good' },
  { number: 93, arabic: 'النُّورُ', transliteration: 'An-Nur', meaning: 'The Illuminating Light' },
  { number: 94, arabic: 'الْهَادِي', transliteration: 'Al-Hadi', meaning: 'The Guide' },
  { number: 95, arabic: 'الْبَدِيعُ', transliteration: 'Al-Badi’', meaning: 'The Incomparable Originator' },
  { number: 96, arabic: 'الْبَاقِي', transliteration: 'Al-Baqi', meaning: 'The Everlasting' },
  { number: 97, arabic: 'الْوَارِثُ', transliteration: 'Al-Warith', meaning: 'The Supreme Inheritor' },
  { number: 98, arabic: 'الرَّشِيدُ', transliteration: 'Ar-Rashid', meaning: 'The Infallible Teacher' },
  { number: 99, arabic: 'الصَّبُورُ', transliteration: 'As-Sabur', meaning: 'The Timeless Patient' },
];

/* ─── Keyless, CORS-enabled fetch layer ───────────────────────── */

/**
 * Primary source — islamic.app's Asma al-Husna API. Keyless, sends
 * `access-control-allow-origin: *` (plus a 204 CORS preflight), and every one of the
 * 99 records carries `en`, `es` and `i18n.{bn,de,fr,id,ru,tr,ur}` meanings.
 */
export const NAMES_API_URL = 'https://api.islamic.app/v1/asma-al-husna';

/**
 * Secondary source — UmmahAPI. Keyless and CORS `*`, but English-only; used only when
 * the primary request fails (its output is never cached, so a translation cache is never
 * downgraded to English).
 */
export const NAMES_FALLBACK_API_URL = 'https://ummahapi.com/api/asma-ul-husna';

/**
 * Recitation clips: neither JSON API serves audio, so play URLs point at EsmaulHusna's
 * static mp3 host. That host has no CORS headers, but playback goes through an
 * `<audio>` element / native player (neither needs CORS) and `playNameAudio` already
 * degrades gracefully if a clip ever fails to load.
 */
export const NAMES_AUDIO_BASE = 'https://esmaulhusna.org';

export const NAMES_LANGUAGES: { code: NamesLanguage; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Français' },
  { code: 'tr', label: 'Türkçe' },
  { code: 'es', label: 'Español' },
  { code: 'de', label: 'Deutsch' },
  { code: 'id', label: 'Indonesia' },
  { code: 'bn', label: 'বাংলা' },
  { code: 'ru', label: 'Русский' },
  { code: 'ur', label: 'اردو' },
];

/** Which dataset produced the list currently on screen (shown in the source label). */
export type NamesProvider = 'islamic.app' | 'UmmahAPI' | 'EsmaulHusna.org' | 'Bundled';

export interface NamesFeedData {
  names: Name99[];
  provider: NamesProvider;
}

const CACHE_PREFIX = 'names99:cache:';
const FETCH_TIMEOUT_MS = 12000;
const MIN_EXPECTED_NAMES = 90;

/** islamic.app /v1/asma-al-husna record. */
type I18nLanguage = Exclude<NamesLanguage, 'en' | 'es'>;

interface IslamicNameRecord {
  number?: number;
  name?: string;
  transliteration?: string;
  en?: { meaning?: string };
  es?: { meaning?: string };
  i18n?: Partial<Record<I18nLanguage, { meaning?: string }>>;
}

/** UmmahAPI /api/asma-ul-husna record. */
interface UmmahNameRecord {
  number?: number;
  arabic?: string;
  transliteration?: string;
  english?: string;
  meaning?: string;
}

/**
 * 1-indexed recitation slugs for numbers 1-99 (`https://esmaulhusna.org/audio/{slug}.mp3`).
 * Every URL in this table was HEAD-checked: 99/99 return 200 with `audio/mpeg`.
 */
const AUDIO_SLUGS =
  'ar-rahman|ar-raheem|al-malik|al-quddus|as-salam|al-mumin|al-muhaymin|al-aziz|al-jabbar|' +
  'al-mutakabbir|al-khaliq|al-bari|al-musawwir|al-ghaffar|al-qahhar|al-wahhab|ar-razzaq|' +
  'al-fattah|al-alim|al-qabid|al-basit|al-khafid|ar-rafi|al-muizz|al-mudhill|as-sami|al-basir|' +
  'al-hakam|al-adl|al-latif|al-khabir|al-halim|al-azeem|al-ghafur|ash-shakur|al-ali|al-kabir|' +
  'al-hafiz|al-muqit|al-hasib|al-jalil|al-karim|ar-raqib|al-mujib|al-wasi|al-hakim|al-wadud|' +
  'al-majeed|al-baith|ash-shahid|al-haqq|al-wakeel|al-qawi|al-matin|al-waliyy|al-hamid|al-muhsi|' +
  'al-mubdi|al-muid|al-muhyi|al-mumit|al-hayy|al-qayyum|al-wajid|al-majid|al-wahid|al-ahad|' +
  'as-samad|al-qadir|al-muqtadir|al-muqaddim|al-muakhkhir|al-awwal|al-akhir|az-zahir|al-batin|' +
  'al-wali|al-muta-ali|al-barr|at-tawwab|al-muntaqim|al-afuw|ar-rauf|malikul-mulk|' +
  'dhul-jalali-wal-ikram|al-muqsit|al-jami|al-ghaniyy|al-mughni|al-mani|ad-darr|an-nafi|an-nur|' +
  'al-hadi|al-badi|al-baqi|al-warith|ar-rashid|as-sabur'.split('|');

/**
 * Quran references per name as `number=surah:ayah,surah:ayah` (up to two, ascending) —
 * carried over from the previous source so the "Quran 55:1" meta chip keeps working.
 */
const VERSE_REFS_RAW =
  '1=1:2,2:163|2=1:2,2:37|3=1:3,2:107|4=59:23,62:1|5=36:58,37:181|6=59:23|7=59:23|' +
  '8=2:129,3:4|9=59:23|10=59:23|11=2:21,3:47|12=59:24|13=3:6,59:24|14=20:82,38:66|' +
  '15=13:16,14:48|16=3:8,38:9|17=2:22,3:37|18=34:26|19=2:29,3:29|20=2:245|21=2:245|' +
  '23=88:18|26=2:127,3:34|27=2:96,3:15|28=2:113,4:141|30=6:103,12:100|31=2:234,3:153|' +
  '32=2:225,3:155|33=2:255,3:174|34=2:173,3:31|35=2:158,4:147|36=2:255,4:34|37=4:34,13:9|' +
  '38=11:57,12:64|39=4:85|40=3:19,4:6|42=27:40,82:6|43=4:1,5:117|44=11:61|45=2:115,3:73|' +
  '46=2:32,3:6|47=11:90,85:14|48=11:73,85:15|49=6:60,62:2|50=3:81,4:33|51=6:62,10:32|' +
  '52=3:173,4:81|53=2:165,8:52|54=7:183,51:58|55=2:257,3:68|56=2:267,4:131|57=2:284,14:34|' +
  '58=85:13|59=85:13|60=2:28,3:27|61=2:28,3:27|62=2:255,3:2|63=2:255,3:2|65=11:73|' +
  '66=2:163,4:171|67=112:1|68=112:2|69=2:20,3:26|70=18:45,54:42|73=37:126,57:3|74=57:3|' +
  '75=57:3|76=57:3|78=13:9,22:62|79=52:28|80=2:37,4:16|81=3:4,43:41|82=2:52,3:152|' +
  '83=2:143,3:30|84=3:26,24:42|85=55:27|88=2:263,4:131|93=5:15,24:35|94=2:213,3:86|' +
  '95=2:117,6:101|97=3:180,15:23|98=2:256,18:10';


const STATIC_BY_NUMBER = new Map<number, Name99>(NAMES_99.map((item) => [item.number, item]));

function nonEmpty(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

/** Parse the compact `number=surah:ayah,...` table into per-name references. */
function buildVerseRefs(): Map<number, NameVerseRef[]> {
  const map = new Map<number, NameVerseRef[]>();
  for (const entry of VERSE_REFS_RAW.split('|')) {
    const sep = entry.indexOf('=');
    if (sep <= 0) continue;
    const number = Number.parseInt(entry.slice(0, sep), 10);
    if (!Number.isFinite(number) || number < 1 || number > 99) continue;
    const refs: NameVerseRef[] = [];
    for (const pair of entry.slice(sep + 1).split(',')) {
      const [surahRaw, ayahRaw] = pair.split(':');
      const surah = Number.parseInt(surahRaw, 10);
      const ayah = Number.parseInt(ayahRaw, 10);
      if (Number.isFinite(surah) && Number.isFinite(ayah) && surah >= 1 && surah <= 114 && ayah > 0) {
        refs.push({ surah, ayah });
      }
      if (refs.length >= 2) break;
    }
    if (refs.length > 0) map.set(number, refs);
  }
  return map;
}

const VERSE_REFS = buildVerseRefs();

/** Assemble one Name99, attaching the recitation clip and Quran refs for its number. */
function assembleName(
  number: number,
  arabic: string,
  transliteration: string,
  meaning: string
): Name99 {
  const mapped: Name99 = { number, arabic, transliteration, meaning };
  const slug = AUDIO_SLUGS[number - 1];
  if (slug) mapped.audioUrl = `${NAMES_AUDIO_BASE}/audio/${slug}.mp3`;
  const verses = VERSE_REFS.get(number);
  if (verses && verses.length > 0) mapped.verses = verses;
  return mapped;
}

/** Meaning in the requested language, falling back to English before the bundled list. */
function islamicMeaning(item: IslamicNameRecord, language: NamesLanguage): string | undefined {
  const localized =
    language === 'en'
      ? nonEmpty(item.en?.meaning)
      : language === 'es'
      ? nonEmpty(item.es?.meaning)
      : nonEmpty(item.i18n?.[language]?.meaning);
  return localized || nonEmpty(item.en?.meaning);
}

/** Map one islamic.app record onto the app's Name99 shape. */
function mapIslamicItem(item: IslamicNameRecord, language: NamesLanguage): Name99 | null {
  const number = Number(item?.number);
  if (!Number.isFinite(number)) return null;
  const fallback = STATIC_BY_NUMBER.get(number);
  if (!fallback) return null;

  const arabic = nonEmpty(item.name) || fallback.arabic;
  const transliteration = nonEmpty(item.transliteration) || fallback.transliteration;
  const meaning = islamicMeaning(item, language) || fallback.meaning;
  return assembleName(number, arabic, transliteration, meaning);
}

/** Map one UmmahAPI record (English-only) onto the app's Name99 shape. */
function mapUmmahItem(item: UmmahNameRecord): Name99 | null {
  const number = Number(item?.number);
  if (!Number.isFinite(number)) return null;
  const fallback = STATIC_BY_NUMBER.get(number);
  if (!fallback) return null;

  const arabic = nonEmpty(item.arabic) || fallback.arabic;
  const transliteration = nonEmpty(item.transliteration) || fallback.transliteration;
  const meaning = nonEmpty(item.english) || fallback.meaning;
  return assembleName(number, arabic, transliteration, meaning);
}

function isValidCachedName(item: unknown): item is Name99 {
  if (!item || typeof item !== 'object') return false;
  const candidate = item as Partial<Name99>;
  return (
    typeof candidate.number === 'number' &&
    typeof candidate.arabic === 'string' &&
    typeof candidate.transliteration === 'string' &&
    typeof candidate.meaning === 'string'
  );
}

interface CachedNamesPayload {
  provider: NamesProvider;
  names: Name99[];
}

function cacheKey(language: NamesLanguage): string {
  return `${CACHE_PREFIX}${language}`;
}

function isNamesProvider(value: unknown): value is NamesProvider {
  return (
    value === 'islamic.app' ||
    value === 'UmmahAPI' ||
    value === 'EsmaulHusna.org' ||
    value === 'Bundled'
  );
}

/**
 * Read previously cached names for a language (instant offline render). New writes use a
 * `{ provider, names }` envelope so the screen's source label stays accurate; a plain array
 * is the legacy EsmaulHusna.org format, still accepted and labelled with its real source.
 */
export async function loadCachedNames(language: NamesLanguage): Promise<NamesFeedData | null> {
  try {
    const raw = await AsyncStorage.getItem(cacheKey(language));
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);

    if (Array.isArray(parsed)) {
      const items = parsed.filter(isValidCachedName);
      if (items.length >= MIN_EXPECTED_NAMES) return { names: items, provider: 'EsmaulHusna.org' };
      return null;
    }

    if (parsed && typeof parsed === 'object') {
      const payload = parsed as Partial<CachedNamesPayload>;
      if (Array.isArray(payload.names)) {
        const items = payload.names.filter(isValidCachedName);
        if (items.length >= MIN_EXPECTED_NAMES) {
          return {
            names: items,
            provider: isNamesProvider(payload.provider) ? payload.provider : 'islamic.app',
          };
        }
      }
    }
  } catch {
    // Cache read failed; caller decides the fallback
  }
  return null;
}

async function fetchJsonWithTimeout(url: string): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as unknown;
  } finally {
    clearTimeout(timer);
  }
}

/** islamic.app wraps the list in `{ code, status, data: [...] }`. */
function extractList(json: unknown): unknown[] | null {
  if (Array.isArray(json)) return json;
  if (json && typeof json === 'object') {
    const data = (json as { data?: unknown }).data;
    if (Array.isArray(data)) return data;
  }
  return null;
}

/** UmmahAPI nests its list in `{ data: { names: [...] } }`. */
function extractUmmahList(json: unknown): unknown[] | null {
  if (json && typeof json === 'object') {
    const data = (json as { data?: unknown }).data;
    if (data && typeof data === 'object') {
      const names = (data as { names?: unknown }).names;
      if (Array.isArray(names)) return names;
    }
  }
  return null;
}

function sortNames(items: Name99[]): Name99[] {
  items.sort((a, b) => a.number - b.number);
  return items;
}

/** Primary source: islamic.app. A successful payload is cached per language. */
async function fetchPrimaryNames(language: NamesLanguage): Promise<Name99[] | null> {
  try {
    const json = await fetchJsonWithTimeout(NAMES_API_URL);
    const list = extractList(json);
    if (!list) return null;

    const items: Name99[] = [];
    for (const entry of list) {
      const mapped = mapIslamicItem(entry as IslamicNameRecord, language);
      if (mapped) items.push(mapped);
    }
    if (items.length < MIN_EXPECTED_NAMES) return null;
    sortNames(items);

    try {
      const payload: CachedNamesPayload = { provider: 'islamic.app', names: items };
      await AsyncStorage.setItem(cacheKey(language), JSON.stringify(payload));
    } catch {
      // Non-fatal cache write failure
    }
    return items;
  } catch {
    return null;
  }
}

/**
 * Secondary source: UmmahAPI (English-only). Never written to the cache so a temporary
 * primary outage can't downgrade an already-cached translation to English.
 */
async function fetchFallbackNames(): Promise<Name99[] | null> {
  try {
    const json = await fetchJsonWithTimeout(NAMES_FALLBACK_API_URL);
    const list = extractUmmahList(json);
    if (!list) return null;

    const items: Name99[] = [];
    for (const entry of list) {
      const mapped = mapUmmahItem(entry as UmmahNameRecord);
      if (mapped) items.push(mapped);
    }
    if (items.length < MIN_EXPECTED_NAMES) return null;
    return sortNames(items);
  } catch {
    return null;
  }
}

/**
 * Fetch the 99 names for a language: islamic.app first (keyless, CORS `*`, real
 * translations for every supported language, cached per language), then UmmahAPI
 * (English-only, CORS `*`), then the last cached list, and finally the bundled English
 * NAMES_99 — so the screen always has something to render.
 */
export async function fetchNames(language: NamesLanguage): Promise<NamesFeedData> {
  const primary = await fetchPrimaryNames(language);
  if (primary) return { names: primary, provider: 'islamic.app' };

  const fallback = await fetchFallbackNames();
  if (fallback) return { names: fallback, provider: 'UmmahAPI' };

  const cached = await loadCachedNames(language);
  if (cached) return cached;

  return { names: NAMES_99, provider: 'Bundled' };
}
