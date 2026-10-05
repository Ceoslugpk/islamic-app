import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { HADITHS, Hadith } from './hadith';
import { isAppOnline } from './useConnectivity';

interface ApiHadithResponse {
  code: number;
  status: string;
  data: {
    collection: string;
    bookNumber: string;
    hadithNumber: string;
    en: { text: string };
    ar: { text: string };
  };
}

const CACHE_PREFIX = 'hadith-of-day-';

function getTodayKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function getFallbackHadith(): Hadith {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  return HADITHS[dayOfYear % HADITHS.length];
}

function normalizeApiResponse(data: ApiHadithResponse['data']): Hadith {
  const collectionName = data?.collection
    ? data.collection.charAt(0).toUpperCase() + data.collection.slice(1)
    : 'Hadith';
  const bookNumber = data?.bookNumber || '1';
  const hadithNumber = data?.hadithNumber || '1';
  const source = `${collectionName} ${bookNumber}:${hadithNumber}`;
  const ar = data?.ar?.text?.replace(/<[^>]*>/g, '').trim() || '';
  const en = data?.en?.text?.replace(/<[^>]*>/g, '').trim() || '';
  return {
    id: Date.now(),
    arabic: ar,
    transliteration: '',
    translation: en,
    source,
    reference: source,
  };
}

export function useHadithOfDay() {
  const [hadith, setHadith] = useState<Hadith>(() => getFallbackHadith());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const cacheKey = CACHE_PREFIX + getTodayKey();
      const cached = await AsyncStorage.getItem(cacheKey);

      if (cached) {
        try {
          const parsed = JSON.parse(cached) as Partial<Hadith>;
          if (parsed && parsed.arabic && parsed.translation) {
            const src = parsed.source || parsed.reference || 'Hadith';
            setHadith({
              id: parsed.id ?? Date.now(),
              arabic: parsed.arabic,
              transliteration: parsed.transliteration || '',
              translation: parsed.translation,
              source: src,
              reference: parsed.reference || src,
            });
            setLoading(false);
            return;
          }
        } catch {
          // Invalid cache, continue to fetch
        }
      }

      if (!isAppOnline()) {
        const fallback = getFallbackHadith();
        setHadith((prev) => prev || fallback);
        setLoading(false);
        return;
      }

      const controller = new AbortController();
      let timer: ReturnType<typeof setTimeout>;

      try {
        const timeoutPromise = new Promise<never>((_, reject) => {
          timer = setTimeout(() => {
            try { controller.abort(); } catch {}
            reject(new Error('Hadith fetch timed out'));
          }, 3500);
        });

        const fetchPromise = fetch('https://api.islamic.app/v1/hadith/today', {
          signal: controller.signal,
        });

        const response = await Promise.race([fetchPromise, timeoutPromise]);
        if (!response.ok) throw new Error('API request failed');

        const json = (await response.json()) as ApiHadithResponse;

        if (json.code === 200 && json.data) {
          const normalized = normalizeApiResponse(json.data);
          if (normalized.arabic && normalized.translation) {
            setHadith(normalized);
            await AsyncStorage.setItem(cacheKey, JSON.stringify(normalized)).catch(() => {});
            setLoading(false);
            return;
          }
        }

        throw new Error('Invalid API response');
      } finally {
        clearTimeout(timer!);
      }
    } catch {
      const fallback = getFallbackHadith();
      setHadith((prev) => prev || fallback);
      setError('Using offline hadith');
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;

    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          try { controller.abort(); } catch {}
          reject(new Error('Hadith refresh timed out'));
        }, 5000);
      });

      const fetchPromise = fetch('https://api.islamic.app/v1/hadith/random', {
        signal: controller.signal,
      });

      const response = await Promise.race([fetchPromise, timeoutPromise]);
      if (!response.ok) throw new Error('API request failed');

      const json = (await response.json()) as ApiHadithResponse;

      if (json.code === 200 && json.data) {
        const normalized = normalizeApiResponse(json.data);
        if (normalized.arabic && normalized.translation) {
          setHadith(normalized);
          const cacheKey = CACHE_PREFIX + getTodayKey();
          await AsyncStorage.setItem(cacheKey, JSON.stringify(normalized)).catch(() => {});
          setLoading(false);
          return;
        }
      }

      throw new Error('Invalid API response');
    } catch {
      const fallback = getFallbackHadith();
      setHadith((prev) => prev || fallback);
      setError('Using offline hadith');
    } finally {
      clearTimeout(timer!);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { hadith, loading, error, refresh };
}