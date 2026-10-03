import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { HADITHS, Hadith } from './hadith';

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
  const source = `${data.collection.charAt(0).toUpperCase() + data.collection.slice(1)} ${data.bookNumber}:${data.hadithNumber}`;
  return {
    id: Date.now(),
    arabic: data.ar?.text?.replace(/<[^>]*>/g, '').trim() || '',
    transliteration: '',
    translation: data.en?.text?.replace(/<[^>]*>/g, '').trim() || '',
    source,
  };
}

export function useHadithOfDay() {
  const [hadith, setHadith] = useState<Hadith | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const cacheKey = CACHE_PREFIX + getTodayKey();
      const cached = await AsyncStorage.getItem(cacheKey);

      if (cached) {
        try {
          const parsed = JSON.parse(cached) as Hadith;
          setHadith(parsed);
          setLoading(false);
          return;
        } catch {
          // Invalid cache, continue to fetch
        }
      }

      const response = await fetch('https://api.islamic.app/v1/hadith/today');
      if (!response.ok) throw new Error('API request failed');

      const json = (await response.json()) as ApiHadithResponse;

      if (json.code === 200 && json.data) {
        const normalized = normalizeApiResponse(json.data);
        if (normalized.arabic || normalized.translation) {
          setHadith(normalized);
          await AsyncStorage.setItem(cacheKey, JSON.stringify(normalized)).catch(() => {});
          setLoading(false);
          return;
        }
      }

      throw new Error('Invalid API response');
    } catch {
      const fallback = getFallbackHadith();
      setHadith(fallback);
      setError('Using offline hadith');
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('https://api.islamic.app/v1/hadith/random');
      if (!response.ok) throw new Error('API request failed');

      const json = (await response.json()) as ApiHadithResponse;

      if (json.code === 200 && json.data) {
        const normalized = normalizeApiResponse(json.data);
        if (normalized.arabic || normalized.translation) {
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
      setHadith(fallback);
      setError('Using offline hadith');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { hadith, loading, error, refresh };
}