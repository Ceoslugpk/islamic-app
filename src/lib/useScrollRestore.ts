import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  FlatList,
  ScrollView,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ScrollPosition = { x: number; y: number };

const MEMORY_SCROLL_CACHE = new Map<string, ScrollPosition>();

interface UseScrollRestoreOptions {
  key: string;
  minDelayMs?: number;
}

export function useScrollRestore({
  key,
  minDelayMs = 300,
}: UseScrollRestoreOptions) {
  const [scrollPosition, setScrollPosition] = useState<ScrollPosition>(() => {
    return MEMORY_SCROLL_CACHE.get(key) || { x: 0, y: 0 };
  });
  const lastScrollTime = useRef<number>(0);

  useEffect(() => {
    let mounted = true;
    const restorePosition = async () => {
      try {
        const mem = MEMORY_SCROLL_CACHE.get(key);
        if (mem) {
          if (mounted) setScrollPosition(mem);
          return;
        }
        const saved = await AsyncStorage.getItem(key);
        if (saved && mounted) {
          const pos: ScrollPosition = JSON.parse(saved);
          MEMORY_SCROLL_CACHE.set(key, pos);
          setScrollPosition(pos);
        }
      } catch {
        // non-fatal
      }
    };

    restorePosition();
    return () => {
      mounted = false;
    };
  }, [key]);

  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset } = event.nativeEvent;
      const now = Date.now();
      if (now - lastScrollTime.current < minDelayMs) return;
      lastScrollTime.current = now;

      const pos = { x: contentOffset.x, y: contentOffset.y };
      MEMORY_SCROLL_CACHE.set(key, pos);
      setScrollPosition(pos);

      try {
        AsyncStorage.setItem(key, JSON.stringify(pos)).catch(() => {});
      } catch {
        // non-fatal
      }
    },
    [key, minDelayMs]
  );

  return { scrollPosition, onScroll };
}

export function useFlatListRestore<Item, R extends React.Key = any>(
  key: string,
  listRef: React.MutableRefObject<FlatList<Item> | null>,
  extraDeps: any[] = []
) {
  const [scrollPosition, setScrollPosition] = useState<ScrollPosition>(() => {
    return MEMORY_SCROLL_CACHE.get(key) || { x: 0, y: 0 };
  });
  const restoredRef = useRef<boolean>(false);
  const lastScrollTime = useRef<number>(0);

  useEffect(() => {
    let mounted = true;
    const restorePosition = async () => {
      try {
        const mem = MEMORY_SCROLL_CACHE.get(key);
        if (mem) {
          if (mounted) {
            setScrollPosition(mem);
            if (!restoredRef.current && (mem.y > 0 || mem.x > 0)) {
              restoredRef.current = true;
              requestAnimationFrame(() => {
                listRef.current?.scrollToOffset({
                  offset: mem.y || mem.x,
                  animated: false,
                });
              });
            }
          }
          return;
        }
        const saved = await AsyncStorage.getItem(key);
        if (saved && mounted) {
          const pos: ScrollPosition = JSON.parse(saved);
          MEMORY_SCROLL_CACHE.set(key, pos);
          setScrollPosition(pos);
          if (!restoredRef.current && (pos.y > 0 || pos.x > 0)) {
            restoredRef.current = true;
            requestAnimationFrame(() => {
              listRef.current?.scrollToOffset({
                offset: pos.y || pos.x,
                animated: false,
              });
            });
          }
        }
      } catch {
        // non-fatal
      }
    };

    restorePosition();
    return () => {
      mounted = false;
    };
  }, [key]);

  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset } = event.nativeEvent;
      const now = Date.now();
      if (now - lastScrollTime.current < 250) return;
      lastScrollTime.current = now;

      const pos = { x: contentOffset.x, y: contentOffset.y };
      MEMORY_SCROLL_CACHE.set(key, pos);
      setScrollPosition(pos);

      try {
        AsyncStorage.setItem(key, JSON.stringify(pos)).catch(() => {});
      } catch {
        // non-fatal
      }
    },
    [key]
  );

  return { listRef, onScroll, scrollPosition };
}