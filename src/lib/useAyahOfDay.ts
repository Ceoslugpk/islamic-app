import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isAppOnline } from './useConnectivity';

export interface AyahOfDay {
  arabic: string;
  text: string;
  translation: string;
  reference: string;
  surahNumber: number;
  ayahNumber: number;
  /** Short reflective note shown under the verse. */
  reflection?: string;
}

const CACHE_PREFIX = 'ayah-of-the-day-';

const STATIC_FALLBACK_VERSES: AyahOfDay[] = [
  {
    arabic: 'اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ ۚ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ ۚ لَّهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ',
    text: 'اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ ۚ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ ۚ لَّهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ',
    translation: 'Allah - there is no deity except Him, the Ever-Living, the Sustainer of [all] existence. Neither drowsiness overtakes Him nor sleep. To Him belongs whatever is in the heavens and whatever is on the earth.',
    reference: 'Al-Baqarah 2:255',
    surahNumber: 2,
    ayahNumber: 255,
    reflection: 'The One who sustains all of existence never tires — no worry is too heavy to bring to Him.',
  },
  {
    arabic: 'الَّذِينَ آمَنُوا وَتَطْمَئِنُّ قُلُوبُهُم بِذِكْرِ اللَّهِ ۗ أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ',
    text: 'الَّذِينَ آمَنُوا وَتَطْمَئِنُّ قُلُوبُهُم بِذِكْرِ اللَّهِ ۗ أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ',
    translation: 'Those who have believed and whose hearts are assured by the remembrance of Allah. Unquestionably, by the remembrance of Allah hearts are assured.',
    reference: 'Ar-Ra\'d 13:28',
    surahNumber: 13,
    ayahNumber: 28,
    reflection: 'Peace of heart is found in remembrance — turn to Allah when your mind will not settle.',
  },
  {
    arabic: 'فَإِنَّ مَعَ الْعُسْرِ يُسْرًا ۝ إِنَّ مَعَ الْعُسْرِ يُسْرًا',
    text: 'فَإِنَّ مَعَ الْعُسْرِ يُسْرًا ۝ إِنَّ مَعَ الْعُسْرِ يُسْرًا',
    translation: 'For indeed, with hardship [will be] ease. Indeed, with hardship [will be] ease.',
    reference: 'Ash-Sharh 94:5-6',
    surahNumber: 94,
    ayahNumber: 5,
    reflection: 'Ease is promised — not only after hardship, but with it. Patience is never wasted.',
  },
  {
    arabic: 'فَاذْكُرُونِي أَذْكُرْكُمْ وَاشْكُرُوا لِي وَلَا تَكْفُرُونِ',
    text: 'فَاذْكُرُونِي أَذْكُرْكُمْ وَاشْكُرُوا لِي وَلَا تَكْفُرُونِ',
    translation: 'So remember Me; I will remember you. And be grateful to Me and do not deny Me.',
    reference: 'Al-Baqarah 2:152',
    surahNumber: 2,
    ayahNumber: 152,
    reflection: 'You are never forgotten — remembering Allah brings His remembrance of you.',
  },
  {
    arabic: 'وَلَا تَهِنُوا وَلَا تَحْزَنُوا وَأَنتُمُ الْأَعْلَوْنَ إِن كُنتُم مُّؤْمِنِينَ',
    text: 'وَلَا تَهِنُوا وَلَا تَحْزَنُوا وَأَنتُمُ الْأَعْلَوْنَ إِن كُنتُم مُّؤْمِنِينَ',
    translation: 'So do not weaken and do not grieve, and you will be superior if you are [true] believers.',
    reference: 'Ali \'Imran 3:139',
    surahNumber: 3,
    ayahNumber: 139,
    reflection: 'Faith lifts you higher — do not let weariness or grief lower your conviction.',
  },
  {
    arabic: 'وَيَرْزُقْهُ مِنْ حَيْثُ لَا يَحْتَسِبُ ۚ وَمَن يَتَوَكَّلْ عَلَى اللَّهِ فَهُوَ حَسْبُهُ',
    text: 'وَيَرْزُقْهُ مِنْ حَيْثُ لَا يَحْتَسِبُ ۚ وَمَن يَتَوَكَّلْ عَلَى اللَّهِ فَهُوَ حَسْبُهُ',
    translation: 'And will provide for him from where he does not expect. And whoever relies upon Allah - then He is sufficient for him.',
    reference: 'At-Talaq 65:3',
    surahNumber: 65,
    ayahNumber: 3,
    reflection: 'Provision can arrive from where you least expect — trust in Allah covers what planning cannot.',
  },
  {
    arabic: 'وَإِذَا سَأَلَكَ عِبَادِي عَنِّي فَإِنِّي قَرِيبٌ ۖ أُجِيبُ دَعْوَةَ الدَّاعِ إِذَا دَعَانِ',
    text: 'وَإِذَا سَأَلَكَ عِبَادِي عَنِّي فَإِنِّي قَرِيبٌ ۖ أُجِيبُ دَعْوَةَ الدَّاعِ إِذَا دَعَانِ',
    translation: 'And when My servants ask you concerning Me, indeed I am near. I respond to the invocation of the supplicant when he calls upon Me.',
    reference: 'Al-Baqarah 2:186',
    surahNumber: 2,
    ayahNumber: 186,
    reflection: 'He is near — closer than the distance between a du\'a and its answer. Call on Him directly.',
  },
  {
    arabic: 'فَبِأَيِّ آلَاءِ رَبِّكُمَا تُكَذِّبَانِ',
    text: 'فَبِأَيِّ آلَاءِ رَبِّكُمَا تُكَذِّبَانِ',
    translation: 'So which of the favors of your Lord would you deny?',
    reference: 'Ar-Rahman 55:13',
    surahNumber: 55,
    ayahNumber: 13,
    reflection: 'Count the favors, not the lacks — gratitude multiplies what you already have.',
  },
  {
    arabic: 'وَلَسَوْفَ يُعْطِيكَ رَبُّكَ فَتَرْضَىٰ',
    text: 'وَلَسَوْفَ يُعْطِيكَ رَبُّكَ فَتَرْضَىٰ',
    translation: 'And your Lord is going to give you, and you will be satisfied.',
    reference: 'Ad-Duhaa 93:5',
    surahNumber: 93,
    ayahNumber: 5,
    reflection: 'The future holds goodness for you — keep your hope in the Giver, not in the gift.',
  },
  {
    arabic: 'لَئِن شَكَرْتُمْ لَأَزِيدَنَّكُمْ ۖ وَلَئِن كَفَرْتُمْ إِنَّ عَذَابِي لَشَدِيدٌ',
    text: 'لَئِن شَكَرْتُمْ لَأَزِيدَنَّكُمْ ۖ وَلَئِن كَفَرْتُمْ إِنَّ عَذَابِي لَشَدِيدٌ',
    translation: 'If you are grateful, I will surely increase you [in favor]; but if you deny, indeed, My punishment is severe.',
    reference: 'Ibrahim 14:7',
    surahNumber: 14,
    ayahNumber: 7,
    reflection: 'Gratitude is the door to increase — the more you thank, the more you receive.',
  },
];

export function getDayOfYear(date = new Date()): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
}

function getTodayKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function getFallbackAyah(dayOfYear: number): AyahOfDay {
  const index = Math.abs(dayOfYear) % STATIC_FALLBACK_VERSES.length;
  return STATIC_FALLBACK_VERSES[index];
}

export function useAyahOfDay() {
  const [ayah, setAyah] = useState<AyahOfDay>(() => getFallbackAyah(getDayOfYear()));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const dayOfYear = getDayOfYear();
    const verseIndex = (dayOfYear % 6236) + 1;
    const cacheKey = CACHE_PREFIX + getTodayKey();

    try {
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached) as Partial<AyahOfDay>;
        const arabicText = parsed.arabic || parsed.text || '';
        if (arabicText && parsed.translation) {
          setAyah({
            arabic: arabicText,
            text: arabicText,
            translation: parsed.translation,
            reference: parsed.reference || '',
            surahNumber: parsed.surahNumber || 1,
            ayahNumber: parsed.ayahNumber || 1,
          });
          setLoading(false);
          return;
        }
      }
    } catch {
      // Ignore cache read failures
    }

    if (!isAppOnline()) {
      const fallback = getFallbackAyah(dayOfYear);
      setAyah(fallback);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;

    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          try { controller.abort(); } catch {}
          reject(new Error('Ayah fetch timed out'));
        }, 3500);
      });

      const fetchPromise = fetch(
        `https://api.alquran.cloud/v1/ayah/${verseIndex}/editions/quran-uthmani,en.sahih`,
        { signal: controller.signal }
      );

      const response = await Promise.race([fetchPromise, timeoutPromise]);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const json = await response.json();
      if (json.code === 200 && Array.isArray(json.data) && json.data.length >= 2) {
        const uthmani = json.data[0];
        const translation = json.data[1];
        const cleanArabic = uthmani.text?.replace(/^﻿/, '').trim() || '';
        const cleanTranslation = translation.text?.trim() || '';
        const surahName = uthmani.surah?.englishName || `Surah ${uthmani.surah?.number || ''}`;
        const surahNumber = uthmani.surah?.number || 1;
        const ayahNumber = uthmani.numberInSurah || 1;

        if (cleanArabic && cleanTranslation) {
          const resolvedAyah: AyahOfDay = {
            arabic: cleanArabic,
            text: cleanArabic,
            translation: cleanTranslation,
            reference: `${surahName} ${surahNumber}:${ayahNumber}`,
            surahNumber,
            ayahNumber,
          };

          setAyah(resolvedAyah);
          await AsyncStorage.setItem(cacheKey, JSON.stringify(resolvedAyah)).catch(() => {});
          return;
        }
      }

      throw new Error('Malformed API payload');
    } catch {
      const fallback = getFallbackAyah(dayOfYear);
      setAyah((prev) => prev || fallback);
      setError('Using offline ayah');
    } finally {
      clearTimeout(timer!);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { ayah, loading, error, refresh: load };
}
