import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  FlatList,
  ScrollView,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ScrollPosition = { x: number; y: number };

interface UseScrollRestoreOptions {
  key: string;
  minDelayMs?: number;
}

export function useScrollRestore({
  key,
  minDelayMs = 300,
}: UseScrollRestoreOptions) {
  const [scrollPosition, setScrollPosition] = useState<ScrollPosition>({ x: 0, y: 0 });
  const lastScrollTime = useRef<number>(0);

  useEffect(() => {
    const restorePosition = async () => {
      try {
        const saved = await AsyncStorage.getItem(key);
        if (saved) {
          const pos: ScrollPosition = JSON.parse(saved);
          setScrollPosition(pos);
        }
      } catch (e) {
        console.error('Failed to restore scroll position', e);
      }
    };

    restorePosition();
  }, [key]);

  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset } = event.nativeEvent;
      const now = Date.now();
      if (now - lastScrollTime.current < minDelayMs) return;
      lastScrollTime.current = now;

      setScrollPosition({
        x: contentOffset.x,
        y: contentOffset.y,
      });

      try {
        AsyncStorage.setItem(key, JSON.stringify({ x: contentOffset.x, y: contentOffset.y }));
      } catch (e) {
        console.error('Failed to save scroll position', e);
      }
    },
    [key]
  );

  return { scrollPosition, onScroll };
}

export function useFlatListRestore<Item, R extends React.Key>(
  key: string,
  listRef: React.MutableRefObject<FlatList<Item> | null>,
  extraDeps: any[] = []
) {
  const [scrollPosition, setScrollPosition] = useState<ScrollPosition>({ x: 0, y: 0 });
  const lastScrollTime = useRef<number>(0);

  useEffect(() => {
    const restorePosition = async () => {
      try {
        const saved = await AsyncStorage.getItem(key);
        if (saved) {
          const pos: ScrollPosition = JSON.parse(saved);
          setScrollPosition(pos);
        }
      } catch (e) {
        console.error('Failed to restore FlatList position', e);
      }
    };

    restorePosition();
  }, [key]);

  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset } = event.nativeEvent;
      const now = Date.now();
      if (now - lastScrollTime.current < 300) return;
      lastScrollTime.current = now;

      setScrollPosition({
        x: contentOffset.x,
        y: contentOffset.y,
      });

      try {
        AsyncStorage.setItem(key, JSON.stringify({ x: contentOffset.x, y: contentOffset.y }));
      } catch (e) {
        console.error('Failed to save FlatList position', e);
      }
    },
    [key]
  );

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollToOffset({
        offset: scrollPosition.y || scrollPosition.x,
        animated: false,
      });
    }
  }, [scrollPosition.x, scrollPosition.y]);

  return { listRef, onScroll, scrollPosition };
}