/**
 * After-prayer adhkar from the keyless islamic.app dhikr API.
 *
 * Verified (2026-10-04):
 *   GET https://api.islamic.app/v1/dhikr/after-prayer   → HTTP 200, CORS `*`
 *   → { code: 200, status: "OK",
 *       data: { shortcut: "after-prayer", label: "After-prayer adhkar", count: 8, duas: [...] } }
 *   each dua: { number, category: { number, en, ar }, slug?, transliteration?,
 *               en: { body: <html>, text: <plain> }, ar: { body: <html>, text: <plain> } }
 *
 * The English body carries the transliteration, translation and reference inside
 * `<span class="transliteration|translation|hisn_english_reference">` tags, so the
 * HTML is parsed here into a plain { arabic, transliteration, translation, source }.
 * Result is cached in AsyncStorage; the static DUAS_DATA entry is the offline fallback.
 */
import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface AfterPrayerDua {
  id: string;
  arabic: string;
  transliteration: string;
  translation: string;
  source: string;
  reference?: string;
}

const ENDPOINT = 'https://api.islamic.app/v1/dhikr/after-prayer';
const CACHE_KEY = 'after-prayer-duas:v1';
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 12000;

const PRAYER_ORDER = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'] as const;
const ANY_PRAYER_RE = /\b(fajr|dhuhr|asr|maghrib|isha)\b/i;

/** Static offline fallback: 8 authentic after-prayer adhkar from Hisn al-Muslim / Sunnah. */
export const FALLBACK_AFTER_PRAYER_DUAS: AfterPrayerDua[] = [
  {
    id: 'after-prayer-1',
    arabic: 'أَسْتَغْفِرُ اللهَ (ثَلاثاً)، اللَّهُمَّ أَنْتَ السَّلامُ وَمِنْكَ السَّلامُ، تَبَارَكْتَ يَا ذَا الْجَلالِ وَالإِكْرَامِ',
    transliteration: 'Astaghfirullāh (three times). Allāhumma antas-salāmu wa minkas-salām, tabārakta yā dhal-jalāli wal-ikrām.',
    translation: 'I ask Allah for forgiveness (three times). O Allah, You are Peace and from You comes peace. Blessed are You, O Possessor of majesty and honor.',
    source: 'Sahih Muslim 591',
    reference: 'Sahih Muslim 591',
  },
  {
    id: 'after-prayer-2',
    arabic: 'لَا إِلَهَ إِلَّا اللهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ، اللَّهُمَّ لَا مَانِعَ لِمَا أَعْطَيْتَ، وَلَا مُعْطِيَ لِمَا مَنَعْتَ، وَلَا يَنْفَعُ ذَا الْجَدِّ مِنْكَ الْجَدُّ',
    transliteration: 'Lā ilāha illallāhu waḥdahū lā sharīka lah, lahul-mulku wa lahul-ḥamd, wa huwa ʿalā kulli shayʾin qadīr. Allāhumma lā māniʿa limā aʿṭayta, wa lā muʿṭiya limā manaʿta, wa lā yanfaʿu dhal-jaddi minkal-jadd.',
    translation: 'None has the right to be worshipped except Allah alone, without partner. To Him belongs all sovereignty and praise, and He is over all things omnipotent. O Allah, none can prevent what You give, and none can give what You withhold, nor can the fortune of the wealthy avail them against You.',
    source: 'Sahih al-Bukhari 844, Sahih Muslim 593',
    reference: 'Sahih al-Bukhari 844, Sahih Muslim 593',
  },
  {
    id: 'after-prayer-3',
    arabic: 'لَا إِلَهَ إِلَّا اللهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ، لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللهِ، لَا إِلَهَ إِلَّا اللهُ، وَلَا نَعْبُدُ إِلَّا إِيَّاهُ، لَهُ النِّعْمَةُ وَلَهُ الْفَضْلُ وَلَهُ الثَّنَاءُ الْحَسَنُ، لَا إِلَهَ إِلَّا اللهُ مُخْلِصِينَ لَهُ الدِّينَ وَلَوْ كَرِهَ الْكَافِرُونَ',
    transliteration: 'Lā ilāha illallāhu waḥdahū lā sharīka lah, lahul-mulku wa lahul-ḥamd, wa huwa ʿalā kulli shayʾin qadīr. Lā ḥawla wa lā quwwata illā billāh, lā ilāha illallāh, wa lā naʿbudu illā iyyāh, lahun-niʿmatu wa lahul-faḍlu wa lahu-thanāʾul-ḥasan, lā ilāha illallāhu mukhliṣīna lahud-dīna wa law karihal-kāfirūn.',
    translation: 'None has the right to be worshipped except Allah alone, without partner. To Him belongs all sovereignty and praise, and He is over all things omnipotent. There is no power and no might except through Allah. None has the right to be worshipped except Allah, and we worship none but Him. To Him belongs blessing, majesty, and worthy praise.',
    source: 'Sahih Muslim 594',
    reference: 'Sahih Muslim 594',
  },
  {
    id: 'after-prayer-4',
    arabic: 'سُبْحَانَ اللهِ (٣٣)، وَالْحَمْدُ للهِ (٣٣)، وَاللهُ أَكْبَرُ (٣٣)، لَا إِلَهَ إِلَّا اللهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ',
    transliteration: 'Subḥānallāh (33x), wal-ḥamdu lillāh (33x), wallāhu akbar (33x). Lā ilāha illallāhu waḥdahū lā sharīka lah, lahul-mulku wa lahul-ḥamd, wa huwa ʿalā kulli shayʾin qadīr.',
    translation: 'Glory be to Allah (33 times), praise be to Allah (33 times), Allah is the greatest (33 times). None has the right to be worshipped except Allah alone, without partner, to Him belongs all sovereignty and praise, and He is over all things omnipotent.',
    source: 'Sahih Muslim 597',
    reference: 'Sahih Muslim 597',
  },
  {
    id: 'after-prayer-5',
    arabic: '﴿اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ لَّهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ مَن ذَا الَّذِي يَشْفَعُ عِندَهُ إِلَّا بِإِذْنِهِ يَعْلَمُ مَا بَيْنَ أَيْدِيهِمْ وَمَا خَلْفَهُمْ وَلَا يُحِيطُونَ بِشَيْءٍ مِّنْ عِلْمِهِ إِلَّا بِمَا شَاءَ وَسِعَ كُرْسِيُّهُ السَّمَاوَاتِ وَالْأَرْضَ وَلَا يَئُودُهُ حِفْظُهُمَا وَهُوَ الْعَلِيُّ الْعَظِيمُ﴾',
    transliteration: 'Allāhu lā ilāha illā huwal-ḥayyul-qayyūm, lā taʾkhudhuhū sinatuw-wa lā nawm, lahū mā fis-samāwāti wa mā fil-arḍ, man dhal-ladhī yashfaʿu ʿindahū illā bi-idhnih, yaʿlamu mā bayna aydīhim wa mā khalfahum, wa lā yuḥīṭūna bi-shayʾim-min ʿilmihī illā bimā shāʾ, wasiʿa kursiyyuhus-samāwāti wal-arḍ, wa lā yaʾūduhū ḥifẓuhumā, wa huwal-ʿaliyyul-ʿaẓīm.',
    translation: 'Allah — there is no deity except Him, the Ever-Living, the Sustainer of existence. Neither drowsiness overtakes Him nor sleep... Whoever recites Ayat al-Kursi after every obligatory prayer, nothing will prevent him from entering Paradise except death.',
    source: 'Quran 2:255 / Sunan an-Nasa\'i (Al-Kubra 9848)',
    reference: 'Quran 2:255',
  },
  {
    id: 'after-prayer-6',
    arabic: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ ﴿قُلْ هُوَ اللَّهُ أَحَدٌ...﴾ وَ ﴿قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ...﴾ وَ ﴿قُلْ أَعُوذُ بِرَبِّ النَّاسِ...﴾',
    transliteration: 'Surah Al-Ikhlas, Surah Al-Falaq, and Surah An-Nas (Recited after each prayer, and thrice after Fajr and Maghrib).',
    translation: 'Recite the three protective Surahs (Al-Ikhlas, Al-Falaq, An-Nas) after every prayer.',
    source: 'Sunan Abi Dawud 1523, Sunan an-Nasa\'i 1336',
    reference: 'Sunan Abi Dawud 1523',
  },
  {
    id: 'after-prayer-7',
    arabic: 'لَا إِلَهَ إِلَّا اللهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ يُحْيِي وَيُمِيتُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ (عَشْرَ مَرَّاتٍ بَعْدَ الْمَغْرِبِ وَالصُّبْحِ)',
    transliteration: 'Lā ilāha illallāhu waḥdahū lā sharīka lah, lahul-mulku wa lahul-ḥamd, yuḥyī wa yumītu wa huwa ʿalā kulli shayʾin qadīr (10x after Maghrib and Fajr).',
    translation: 'None has the right to be worshipped except Allah alone, without partner. To Him belongs all kingdom and praise, He gives life and causes death, and He is over all things omnipotent. (Recite 10 times after Fajr and Maghrib).',
    source: 'Jami\' at-Tirmidhi 3474',
    reference: 'Jami\' at-Tirmidhi 3474',
  },
  {
    id: 'after-prayer-8',
    arabic: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ عِلْمًا نَافِعًا، وَرِزْقًا طَيِّبًا، وَعَمَلًا مُتَقَبَّلًا (بَعْدَ صَلَاةِ الْفَجْرِ)',
    transliteration: 'Allāhumma innī as-aluka ʿilman nāfiʿan, wa rizqan ṭayyiban, wa ʿamalan mutaqabbalan (after Fajr prayer).',
    translation: 'O Allah, I ask You for beneficial knowledge, good and pure provision, and deeds that are accepted. (Said after Fajr prayer).',
    source: 'Sunan Ibn Majah 925',
    reference: 'Sunan Ibn Majah 925',
  },
];

interface RawDua {
  number?: string | number;
  slug?: string;
  transliteration?: string | { en?: string };
  en?: { body?: string; text?: string };
  ar?: { body?: string; text?: string };
}

interface RawPayload {
  code?: number;
  data?: { duas?: RawDua[] };
}

interface CacheEntry {
  fetchedAt: number;
  duas: AfterPrayerDua[];
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  lsquo: '\u2018',
  rsquo: '\u2019',
  ldquo: '\u201c',
  rdquo: '\u201d',
  ndash: '\u2013',
  mdash: '\u2014',
  hellip: '\u2026',
};

function decodeEntities(text: string): string {
  return text.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, body: string) => {
    if (body[0] === '#') {
      const code =
        body[1] === 'x' || body[1] === 'X'
          ? parseInt(body.slice(2), 16)
          : parseInt(body.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff
        ? String.fromCodePoint(code)
        : match;
    }
    return NAMED_ENTITIES[body.toLowerCase()] ?? match;
  });
}

/** HTML → plain text, keeping block breaks as newlines. */
function stripHtml(html: string): string {
  const withBreaks = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6])>/gi, '\n');
  const text = withBreaks.replace(/<[^>]*>/g, '');
  return decodeEntities(text)
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function spanByClass(html: string, className: string): string {
  const pattern = new RegExp(
    `<span[^>]*class=["'][^"']*\\b${className}\\b[^"']*["'][^>]*>([\\s\\S]*?)<\\/span>`,
    'i'
  );
  const match = html.match(pattern);
  return match ? stripHtml(match[1]) : '';
}

function removeSpansByClass(html: string, classNames: string[]): string {
  return classNames.reduce((out, className) => {
    const pattern = new RegExp(
      `<span[^>]*class=["'][^"']*\\b${className}\\b[^"']*["'][^>]*>[\\s\\S]*?<\\/span>`,
      'gi'
    );
    return out.replace(pattern, '');
  }, html);
}

function mapRawDua(raw: RawDua, index: number): AfterPrayerDua | null {
  const enBody = raw.en?.body ?? '';
  const arabic = stripHtml(raw.ar?.body ?? '') || (raw.ar?.text ?? '').trim();
  const translation = spanByClass(enBody, 'translation') || (raw.en?.text ?? '').trim();
  // Everything left after dropping translation/reference spans: transliteration
  // plus the recitation instructions ("three times", "after Fajr and Maghrib", …).
  const transliteration =
    stripHtml(
      removeSpansByClass(enBody, ['translation', 'reference_label', 'hisn_english_reference'])
    ) ||
    (typeof raw.transliteration === 'string'
      ? stripHtml(raw.transliteration)
      : stripHtml(raw.transliteration?.en ?? ''));
  const source = spanByClass(enBody, 'hisn_english_reference');

  if (!arabic || !translation) return null;
  const rawId = raw.number ?? raw.slug ?? (index + 1);
  const id = typeof rawId === 'number' || /^\d+$/.test(String(rawId))
    ? `after-prayer-${rawId}`
    : String(rawId);
  return {
    id,
    arabic,
    transliteration,
    translation,
    source,
    reference: source,
  };
}

async function requestAfterPrayerDuas(): Promise<AfterPrayerDua[]> {
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = controller
    ? setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
    : null;
  try {
    const response = await fetch(ENDPOINT, {
      headers: {
        Accept: 'application/json',
      },
      ...(controller ? { signal: controller.signal } : {}),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = (await response.json()) as RawPayload;
    const raw = payload?.data?.duas;
    if (payload?.code !== 200 || !Array.isArray(raw)) {
      throw new Error('Malformed dhikr payload');
    }
    const duas = raw
      .map(mapRawDua)
      .filter((dua): dua is AfterPrayerDua => dua !== null);
    if (!duas.length) throw new Error('Empty after-prayer list');
    return duas;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function readCache(): Promise<CacheEntry | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry;
    if (!Array.isArray(parsed?.duas) || !parsed.duas.length) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Fresh cache → network → stale cache → bundled static entry. */
export async function loadAfterPrayerDuas(): Promise<AfterPrayerDua[]> {
  const cached = await readCache();
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) return cached.duas;
  try {
    const fresh = await requestAfterPrayerDuas();
    const entry: CacheEntry = { fetchedAt: Date.now(), duas: fresh };
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(entry)).catch(() => {});
    return fresh;
  } catch {
    if (cached) return cached.duas;
    return FALLBACK_AFTER_PRAYER_DUAS;
  }
}

export function useAfterPrayerDuas() {
  const [duas, setDuas] = useState<AfterPrayerDua[]>(FALLBACK_AFTER_PRAYER_DUAS);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setDuas(await loadAfterPrayerDuas());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadAfterPrayerDuas()
      .then((data) => {
        if (!cancelled) {
          setDuas(data);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { duas, loading, refresh };
}

function searchable(dua: AfterPrayerDua): string {
  return `${dua.transliteration}\n${dua.translation}\n${dua.source}`;
}

/**
 * Picks the single dua shown under the prayer card: one that names the given
 * prayer when islamic.app tags one (e.g. "after the Maghrib and Fajr prayers"),
 * otherwise a rotating entry from the prayer-agnostic ones.
 */
export function selectAfterPrayerDua(
  duas: AfterPrayerDua[],
  prayer?: string | null
): AfterPrayerDua | null {
  if (!duas.length) return null;
  if (!prayer) return duas[0];

  const prayerRe = new RegExp(`\\b${prayer}\\b`, 'i');
  const tagged = duas.find((dua) => prayerRe.test(searchable(dua)));
  if (tagged) return tagged;

  const general = duas.filter((dua) => !ANY_PRAYER_RE.test(searchable(dua)));
  const pool = general.length ? general : duas;
  const position = PRAYER_ORDER.indexOf(
    prayer as (typeof PRAYER_ORDER)[number]
  );
  return pool[(position >= 0 ? position : 0) % pool.length];
}

/**
 * Returns true if a dua contains authentic recommendations specifically
 * naming the given prayer (e.g. Fajr, Maghrib).
 */
export function isDuaForPrayer(
  dua: AfterPrayerDua,
  prayer?: string | null
): boolean {
  if (!prayer) return false;
  const prayerRe = new RegExp(`\\b${prayer}\\b`, 'i');
  return prayerRe.test(searchable(dua));
}

/**
 * Returns all after-prayer duas, placing any duas specifically recommended
 * for the given prayer first in the swipe order while maintaining authentic sequence.
 */
export function getAllAfterPrayerDuas(
  duas: AfterPrayerDua[],
  prayer?: string | null
): AfterPrayerDua[] {
  const list = duas && duas.length > 0 ? duas : FALLBACK_AFTER_PRAYER_DUAS;
  if (!prayer) return list;

  const matching = list.filter((dua) => isDuaForPrayer(dua, prayer));
  const rest = list.filter((dua) => !isDuaForPrayer(dua, prayer));

  if (matching.length > 0) {
    return [...matching, ...rest];
  }
  return list;
}
