import { useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TAFSIR_SOURCES, DEFAULT_TAFSIR_SOURCE_ID, getTafsirSourceById } from './tafsirSources';

export const TAFSIR_SOURCE_KEY = 'tafsir-source-id';

let currentTafsirSourceId = DEFAULT_TAFSIR_SOURCE_ID;
const tafsirListeners = new Set<(sourceId: string) => void>();

AsyncStorage.getItem(TAFSIR_SOURCE_KEY)
  .then((saved) => {
    if (saved && TAFSIR_SOURCES.some((s) => s.id === saved)) {
      currentTafsirSourceId = saved;
      tafsirListeners.forEach((fn) => fn(saved));
    }
  })
  .catch(() => {});

export function getTafsirSourceId(): string {
  return currentTafsirSourceId;
}

export async function setTafsirSourceId(sourceId: string): Promise<void> {
  const valid = TAFSIR_SOURCES.some((s) => s.id === sourceId);
  const next = valid ? sourceId : DEFAULT_TAFSIR_SOURCE_ID;
  currentTafsirSourceId = next;
  tafsirListeners.forEach((fn) => fn(next));
  try {
    await AsyncStorage.setItem(TAFSIR_SOURCE_KEY, next);
  } catch {
    // ignore persistence errors
  }
}

export function subscribeTafsirSource(listener: (sourceId: string) => void): () => void {
  tafsirListeners.add(listener);
  return () => {
    tafsirListeners.delete(listener);
  };
}

export function useTafsirSource() {
  const [sourceId, setSourceIdState] = useState<string>(getTafsirSourceId());

  useEffect(() => {
    setSourceIdState(getTafsirSourceId());
    return subscribeTafsirSource((nextSourceId) => {
      setSourceIdState(nextSourceId);
    });
  }, []);

  const source = useMemo(() => {
    return getTafsirSourceById(sourceId) || getTafsirSourceById(DEFAULT_TAFSIR_SOURCE_ID)!;
  }, [sourceId]);

  return {
    sourceId,
    setSourceId: setTafsirSourceId,
    source,
  };
}