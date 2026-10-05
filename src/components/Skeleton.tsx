import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View, ViewStyle, Platform } from 'react-native';
import { useTheme } from '../lib/theme';

function useReducedMotion(): boolean {
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    // Guard: `window` may be absent in SSR/web-worker contexts.
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduceMotion(mediaQuery.matches);
    const handler = (e: MediaQueryListEvent) => setReduceMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);
  return reduceMotion;
}

export interface SkeletonProps {
  width?: number | string;
  height: number;
  borderRadius?: number;
  style?: ViewStyle;
  variant?: 'default' | 'circle' | 'rect';
}

export function Skeleton({
  width,
  height,
  borderRadius = 8,
  style,
  variant = 'default',
}: SkeletonProps) {
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();
  const animRef = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduceMotion) return;
    animRef.setValue(0);
    Animated.loop(
      Animated.sequence([
        Animated.timing(animRef, {
          toValue: 1,
          duration: 220, // calm micro fade-in
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.delay(900), // long still pause between shimmer passes
        Animated.timing(animRef, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [reduceMotion, animRef]);

  const animatedStyle = animRef.interpolate({
    inputRange: [0, 1],
    outputRange: [0.35, 0.75],
  });

  const baseColor = colors.bgRaised || colors.bgSurface;
  const highlightColor = colors.accentDim || colors.borderSubtle;

  const resolvedWidth = typeof width === 'string' ? width : width ?? '100%';

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width: resolvedWidth as any,
          height,
          borderRadius: variant === 'circle' ? height / 2 : borderRadius,
          backgroundColor: baseColor,
        },
        style,
      ]}
    >
      <Animated.View
        style={[
          styles.shimmer,
          {
            backgroundColor: highlightColor,
            opacity: animatedStyle,
          },
        ]}
      />
    </Animated.View>
  );
}

export interface SkeletonBlockProps {
  rows?: number;
  rowHeight?: number;
  rowGap?: number;
  lastRowWidth?: number | string;
  style?: ViewStyle;
}

export function SkeletonBlock({
  rows = 3,
  rowHeight = 14,
  rowGap = 8,
  lastRowWidth = '60%',
  style,
}: SkeletonBlockProps) {
  return (
    <View style={[{ gap: rowGap }, style]}>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton
          key={i}
          width={i === rows - 1 ? lastRowWidth : '100%'}
          height={rowHeight}
          borderRadius={4}
        />
      ))}
    </View>
  );
}

export interface SkeletonCardProps {
  lines?: number;
  lineHeight?: number;
  lineGap?: number;
  avatar?: boolean;
  avatarSize?: number;
  style?: ViewStyle;
}

export function SkeletonCard({
  lines = 3,
  lineHeight = 14,
  lineGap = 8,
  avatar = false,
  avatarSize = 40,
  style,
}: SkeletonCardProps) {
  return (
    <View style={[styles.card, style]}>
      {avatar && (
        <View style={styles.avatarRow}>
          <Skeleton width={avatarSize} height={avatarSize} borderRadius={avatarSize / 2} variant="circle" />
          <SkeletonBlock rows={2} rowHeight={lineHeight} rowGap={4} lastRowWidth="50%" />
        </View>
      )}
      <SkeletonBlock rows={lines} rowHeight={lineHeight} rowGap={lineGap} />
    </View>
  );
}

export interface SurahSkeletonProps {
  compact?: boolean;
}

export function SurahSkeleton({ compact = false }: SurahSkeletonProps) {
  const numberSize = compact ? 30 : 34;
  const textSize = compact ? 13 : 15;
  const gap = compact ? 10 : 12;

  return (
    <View style={[styles.surahRow, { paddingVertical: compact ? 11 : 14, gap }]}>
      <Skeleton width={numberSize} height={numberSize} borderRadius={numberSize / 2} />
      <View style={styles.surahMain}>
        <Skeleton width="70%" height={textSize + 2} borderRadius={4} />
        <Skeleton width="85%" height={textSize - 2} borderRadius={4} />
      </View>
      <View style={styles.surahRight}>
        <Skeleton width={compact ? 50 : 60} height={textSize + 4} borderRadius={4} />
        <Skeleton width={compact ? 45 : 55} height={textSize - 3} borderRadius={4} />
      </View>
    </View>
  );
}

export interface PrayerRowSkeletonProps {
  compact?: boolean;
}

export function PrayerRowSkeleton({ compact = false }: PrayerRowSkeletonProps) {
  return (
    <View style={styles.prayerRow}>
      <Skeleton width={22} height={22} borderRadius={6} />
      <Skeleton width={compact ? 60 : 70} height={16} borderRadius={4} />
      <Skeleton width={compact ? 45 : 55} height={16} borderRadius={4} />
    </View>
  );
}

export interface CountdownCardSkeletonProps {
  compact?: boolean;
}

export function CountdownCardSkeleton({ compact = false }: CountdownCardSkeletonProps) {
  return (
    <View style={styles.countdownCard}>
      <Skeleton width="30%" height={11} borderRadius={4} />
      <Skeleton width="50%" height={compact ? 38 : 44} borderRadius={4} />
      <Skeleton width="40%" height={compact ? 22 : 26} borderRadius={4} />
      <Skeleton width="35%" height={13} borderRadius={4} />
      <View style={styles.progressWrap}>
        <View style={styles.progressTrack}>
          <Skeleton width="40%" height={6} borderRadius={3} />
        </View>
        <Skeleton width="50%" height={11} borderRadius={4} />
      </View>
    </View>
  );
}

export interface DuaCardSkeletonProps {
  compact?: boolean;
}

export function DuaCardSkeleton({ compact = false }: DuaCardSkeletonProps) {
  return (
    <View style={styles.duaCard}>
      <View style={styles.duaHeader}>
        <Skeleton width={compact ? 120 : 150} height={compact ? 18 : 20} borderRadius={4} />
        <Skeleton width={compact ? 55 : 70} height={compact ? 14 : 16} borderRadius={6} />
      </View>
      <Skeleton width="100%" height={compact ? 32 : 42} borderRadius={4} />
      <Skeleton width="100%" height={compact ? 12 : 13} borderRadius={4} />
      <Skeleton width="80%" height={compact ? 20 : 22} borderRadius={4} />
      <View style={styles.duaRef}>
        <Skeleton width={compact ? 100 : 130} height={11} borderRadius={4} />
      </View>
    </View>
  );
}

export interface NameRowSkeletonProps {
  compact?: boolean;
}

export function NameRowSkeleton({ compact = false }: NameRowSkeletonProps) {
  const numberSize = compact ? 30 : 34;
  const gap = compact ? 12 : 14;

  return (
    <View style={[styles.nameRow, { paddingVertical: compact ? 12 : 14, gap }]}>
      <Skeleton width={numberSize} height={numberSize} borderRadius={8} />
      <View style={styles.nameMain}>
        <Skeleton width="45%" height={15} borderRadius={4} />
        <Skeleton width={compact ? 60 : 70} height={23} borderRadius={4} />
        <Skeleton width="75%" height={12} borderRadius={4} />
        <Skeleton width="60%" height={12} borderRadius={4} />
        <View style={styles.nameMeta}>
          <Skeleton width="40%" height={10} borderRadius={4} />
          <Skeleton width={30} height={30} borderRadius={15} variant="circle" />
        </View>
      </View>
    </View>
  );
}

export interface CalendarGridSkeletonProps {
  compact?: boolean;
}

export function CalendarGridSkeleton({ compact = false }: CalendarGridSkeletonProps) {
  const cellSize = compact ? 40 : 44;

  return (
    <View style={styles.calendarGrid}>
      <View style={styles.calendarWeekRow}>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <Skeleton key={d} width="14.28%" height={11} borderRadius={4} />
        ))}
      </View>
      <View style={styles.calendarGridCells}>
        {Array.from({ length: 42 }).map((_, i) => (
          <View key={i} style={styles.calendarCell}>
            <Skeleton width={cellSize} height={cellSize} borderRadius={8} />
          </View>
        ))}
      </View>
    </View>
  );
}

export interface MosqueCardSkeletonProps {
  compact?: boolean;
}

export function MosqueCardSkeleton({ compact = false }: MosqueCardSkeletonProps) {
  return (
    <View style={styles.mosqueCard}>
      <View style={styles.mosqueHeader}>
        <Skeleton width={compact ? 180 : 220} height={15} borderRadius={4} />
        <Skeleton width={compact ? 70 : 85} height={14} borderRadius={12} />
      </View>
      <Skeleton width="90%" height={12} borderRadius={4} />
      <Skeleton width="70%" height={12} borderRadius={4} />
      <Skeleton width={compact ? 100 : 120} height={36} borderRadius={8} />
    </View>
  );
}

export interface BookSkeletonProps {
  compact?: boolean;
}

export function BookSkeleton({ compact = false }: BookSkeletonProps) {
  return (
    <View style={styles.bookSkeleton}>
      <View style={styles.bookHeader}>
        <Skeleton width={compact ? 70 : 85} height={14} borderRadius={4} />
        <Skeleton width={compact ? 60 : 75} height={12} borderRadius={4} />
      </View>
      <Skeleton width="70%" height={compact ? 15 : 18} borderRadius={4} />
      <Skeleton width="50%" height={compact ? 20 : 22} borderRadius={4} />
      <Skeleton width="60%" height={12} borderRadius={4} />
      <Skeleton width={compact ? 100 : 120} height={14} borderRadius={4} />
    </View>
  );
}

export interface HadithRowSkeletonProps {
  compact?: boolean;
}

export function HadithRowSkeleton({ compact = false }: HadithRowSkeletonProps) {
  return (
    <View style={styles.hadithRow}>
      <Skeleton width={compact ? 90 : 110} height={14} borderRadius={4} />
      <Skeleton width="80%" height={compact ? 20 : 26} borderRadius={4} />
      <Skeleton width="90%" height={compact ? 20 : 26} borderRadius={4} />
      <Skeleton width="60%" height={12} borderRadius={4} />
    </View>
  );
}

export interface CollectionCardSkeletonProps {
  compact?: boolean;
}

export function CollectionCardSkeleton({ compact = false }: CollectionCardSkeletonProps) {
  return (
    <View style={styles.collectionCard}>
      <View style={styles.collectionTop}>
        <Skeleton width={compact ? 160 : 200} height={compact ? 20 : 22} borderRadius={4} />
        <Skeleton width={compact ? 50 : 60} height={compact ? 20 : 22} borderRadius={4} />
      </View>
      <Skeleton width="70%" height={compact ? 12 : 13} borderRadius={4} />
      <Skeleton width="100%" height={compact ? 12 : 13} borderRadius={4} />
      <Skeleton width={compact ? 100 : 120} height={14} borderRadius={4} />
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    overflow: 'hidden',
    position: 'relative',
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    transform: [{ translateX: '-100%' }],
  },
  card: {
    gap: 10,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  surahRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  surahMain: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
    gap: 2,
  },
  surahRight: {
    flexShrink: 0,
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 2,
  },
  prayerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  countdownCard: {
    gap: 4,
  },
  progressWrap: {
    marginTop: 8,
    gap: 6,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  duaCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 18,
    gap: 12,
  },
  duaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  duaRef: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  nameMain: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  nameMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  calendarGrid: {
    gap: 8,
  },
  calendarWeekRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  calendarGridCells: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarCell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  mosqueCard: {
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  mosqueHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  hadithRow: {
    padding: 16,
    gap: 8,
  },
  collectionCard: {
    padding: 16,
    gap: 8,
  },
  collectionTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  bookSkeleton: {
    padding: 16,
    gap: 8,
  },
  bookHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 8,
  },
});