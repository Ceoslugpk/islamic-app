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
  const scrollPositionRef = useRef<ScrollPosition>(
    MEMORY_SCROLL_CACHE.get(key) || { x: 0, y: 0 }
  );
  const lastScrollTime = useRef<number>(0);

  useEffect(() => {
    let mounted = true;
    const restorePosition = async () => {
      try {
        const mem = MEMORY_SCROLL_CACHE.get(key);
        if (mem) {
          scrollPositionRef.current = mem;
          return;
        }
        const saved = await AsyncStorage.getItem(key);
        if (saved && mounted) {
          const pos: ScrollPosition = JSON.parse(saved);
          MEMORY_SCROLL_CACHE.set(key, pos);
          scrollPositionRef.current = pos;
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
      const native = event?.nativeEvent;
      if (!native || !native.contentOffset) return;
      const { contentOffset } = native;
      const now = Date.now();
      if (now - lastScrollTime.current < minDelayMs) return;
      lastScrollTime.current = now;

      const pos = { x: contentOffset.x, y: contentOffset.y };
      MEMORY_SCROLL_CACHE.set(key, pos);
      scrollPositionRef.current = pos;

      try {
        AsyncStorage.setItem(key, JSON.stringify(pos)).catch(() => {});
      } catch {
        // non-fatal
      }
    },
    [key, minDelayMs]
  );

  return { scrollPosition: scrollPositionRef.current, onScroll };
}

export function useFlatListRestore<Item, R extends React.Key = any>(
  key: string,
  listRef: React.MutableRefObject<FlatList<Item> | null>,
  extraDeps: any[] = []
) {
  const scrollPositionRef = useRef<ScrollPosition>(
    MEMORY_SCROLL_CACHE.get(key) || { x: 0, y: 0 }
  );
  const restoredRef = useRef<boolean>(false);
  const lastScrollTime = useRef<number>(0);

  useEffect(() => {
    let mounted = true;
    const restorePosition = async () => {
      try {
        const mem = MEMORY_SCROLL_CACHE.get(key);
        if (mem) {
          scrollPositionRef.current = mem;
          if (mounted && !restoredRef.current && (mem.y > 0 || mem.x > 0)) {
            restoredRef.current = true;
            requestAnimationFrame(() => {
              listRef.current?.scrollToOffset({
                offset: mem.y || mem.x,
                animated: false,
              });
            });
          }
          return;
        }
        const saved = await AsyncStorage.getItem(key);
        if (saved && mounted) {
          const pos: ScrollPosition = JSON.parse(saved);
          MEMORY_SCROLL_CACHE.set(key, pos);
          scrollPositionRef.current = pos;
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
      const native = event?.nativeEvent;
      if (!native || !native.contentOffset) return;
      // Guard against synthetic scroll events bubbling up from nested horizontal child ScrollViews
      if (
        (event as any).target &&
        (event as any).currentTarget &&
        (event as any).target !== (event as any).currentTarget
      ) {
        return;
      }
      const { contentOffset } = native;
      const now = Date.now();
      if (now - lastScrollTime.current < 250) return;
      lastScrollTime.current = now;

      const pos = { x: contentOffset.x, y: contentOffset.y };
      MEMORY_SCROLL_CACHE.set(key, pos);
      scrollPositionRef.current = pos;
      // Do not call setScrollPosition to prevent host component re-renders during active scrolling
      try {
        AsyncStorage.setItem(key, JSON.stringify(pos)).catch(() => {});
      } catch {
        // non-fatal
      }
    },
    [key]
  );

  return { listRef, onScroll, scrollPosition: scrollPositionRef.current };
}