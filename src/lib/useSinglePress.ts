import { useState, useRef, useCallback, useEffect } from 'react';

export interface UseSinglePressOptions {
  debounceMs?: number;
}

/**
 * Guards an async or sync callback against duplicate double-taps.
 * Re-entry is blocked while the callback is executing and for an additional debounce window (~800ms).
 * Returns `{ onPress, busy }`.
 */
export function useSinglePress<T extends (...args: any[]) => any>(
  callback: T,
  options?: UseSinglePressOptions
): {
  onPress: (...args: Parameters<T>) => Promise<ReturnType<T> | undefined>;
  busy: boolean;
} {
  const [busy, setBusy] = useState(false);
  const isBusyRef = useRef(false);
  const debounceMs = options?.debounceMs ?? 800;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const onPress = useCallback(
    async (...args: Parameters<T>): Promise<ReturnType<T> | undefined> => {
      if (isBusyRef.current) {
        return undefined;
      }
      isBusyRef.current = true;
      setBusy(true);

      try {
        const result = await callback(...args);
        return result;
      } finally {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
        }
        timerRef.current = setTimeout(() => {
          isBusyRef.current = false;
          setBusy(false);
        }, debounceMs);
      }
    },
    [callback, debounceMs]
  );

  return { onPress, busy };
}
