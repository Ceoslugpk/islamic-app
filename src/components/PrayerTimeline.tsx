import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Animated,
  Easing,
  Platform,
  I18nManager,
  AccessibilityInfo,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme';
import { Card } from './Card';
import { Hairline } from './Hairline';
import { formatTime } from '../lib/timeFormat';
import { DayTimings } from '../lib/prayerTimes';
import { t } from '../lib/i18n';

const USE_NATIVE_DRIVER = Platform.OS !== 'web';

const PRAYER_LIST: { key: keyof DayTimings['timings']; label: string; isSalah: boolean }[] = [
  { key: 'Fajr', label: 'Fajr', isSalah: true },
  { key: 'Sunrise', label: 'Sunrise', isSalah: false },
  { key: 'Dhuhr', label: 'Dhuhr', isSalah: true },
  { key: 'Asr', label: 'Asr', isSalah: true },
  { key: 'Maghrib', label: 'Maghrib', isSalah: true },
  { key: 'Isha', label: 'Isha', isSalah: true },
];

interface TimelineDotProps {
  isCompleted: boolean;
  isCurrent: boolean;
  isSalah: boolean;
  reducedMotion: boolean;
}

function TimelineDot({
  isCompleted,
  isCurrent,
  isSalah,
  reducedMotion,
}: TimelineDotProps) {
  const { colors } = useTheme();
  const popAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(0.4)).current;
  const prevCompleted = useRef(isCompleted);
  const [popStep, setPopStep] = useState<'idle' | 'circle' | 'filled' | 'checked'>('idle');

  // Completion 3-step pop sequence: ○ → ◉ → ✓ (calm cubic-out, no springs)
  useEffect(() => {
    let t1: any;
    let t2: any;
    if (!prevCompleted.current && isCompleted && !reducedMotion) {
      setPopStep('circle');
      Animated.sequence([
        Animated.timing(popAnim, {
          toValue: 0.85,
          duration: 80,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(popAnim, {
          toValue: 1.25,
          duration: 140,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(popAnim, {
          toValue: 1,
          duration: 120,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ]).start();

      t1 = setTimeout(() => setPopStep('filled'), 70);
      t2 = setTimeout(() => setPopStep('checked'), 200);
    } else if (!isCompleted) {
      setPopStep('idle');
      popAnim.setValue(1);
    }
    prevCompleted.current = isCompleted;
    return () => {
      if (t1) clearTimeout(t1);
      if (t2) clearTimeout(t2);
    };
  }, [isCompleted, popAnim, reducedMotion]);

  // Current prayer glowing/pulsing ring loop — ambient brand pulse, gated by
  // reduce-motion. Calm 1400ms cycle with cubic easing, not linear.
  useEffect(() => {
    if (isCurrent && !reducedMotion) {
      const pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 700,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: USE_NATIVE_DRIVER,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0.35,
            duration: 700,
            easing: Easing.inOut(Easing.cubic),
            useNativeDriver: USE_NATIVE_DRIVER,
          }),
        ])
      );
      pulseLoop.start();
      return () => pulseLoop.stop();
    } else {
      pulseAnim.setValue(0.4);
    }
  }, [isCurrent, pulseAnim, reducedMotion]);

  if (!isSalah) {
    // Sunrise non-salah checkpoint
    return (
      <View style={styles.dotContainer}>
        <View
          style={[
            styles.sunriseDot,
            {
              borderColor: isCurrent ? colors.accent : colors.borderSubtle,
              backgroundColor: isCurrent ? colors.accentDim : colors.bgSurface,
            },
          ]}
        >
          <Ionicons
            name="sunny-outline"
            size={11}
            color={isCurrent ? colors.accent : colors.textMuted}
          />
        </View>
      </View>
    );
  }

  if (isCompleted) {
    return (
      <View style={styles.dotContainer}>
        <Animated.View
          style={[
            styles.completedDot,
            popStep === 'circle'
              ? {
                  backgroundColor: colors.bgSurface,
                  borderColor: colors.accent,
                  borderWidth: 2,
                  transform: [{ scale: popAnim }],
                }
              : popStep === 'filled'
              ? {
                  backgroundColor: colors.accent,
                  transform: [{ scale: popAnim }],
                }
              : {
                  backgroundColor: colors.accent,
                  transform: [{ scale: popAnim }],
                },
          ]}
        >
          {popStep === 'circle' ? (
            <View
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: 'transparent',
              }}
            />
          ) : popStep === 'filled' ? (
            <View
              style={{
                width: 7,
                height: 7,
                borderRadius: 3.5,
                backgroundColor: colors.onAccent,
              }}
            />
          ) : (
            <Ionicons name="checkmark" size={11} color={colors.onAccent} />
          )}
        </Animated.View>
      </View>
    );
  }

  if (isCurrent) {
    return (
      <View style={styles.dotContainer}>
        <Animated.View
          style={[
            styles.currentOuterRing,
            {
              borderColor: colors.accent,
              opacity: pulseAnim,
            },
          ]}
        />
        <View
          style={[
            styles.currentInnerDot,
            {
              backgroundColor: colors.accent,
            },
          ]}
        />
      </View>
    );
  }

  // Upcoming
  return (
    <View style={styles.dotContainer}>
      <View
        style={[
          styles.upcomingDot,
          {
            borderColor: colors.borderStrong,
            backgroundColor: colors.bgSurface,
          },
        ]}
      />
    </View>
  );
}

export interface PrayerTimelineProps {
  timings: DayTimings['timings'];
  completed: Record<string, boolean>;
  onTogglePrayer: (prayer: string) => void;
  currentPrayerSegment: string; // The one happening right now
  nextPrayerName?: string;
  progressFraction: number; // 0 to 1 elapsed in current prayer
  timeFormat: '12h' | '24h';
  streak: number;
}

export function PrayerTimeline({
  timings,
  completed,
  onTogglePrayer,
  currentPrayerSegment,
  progressFraction,
  timeFormat,
  streak,
}: PrayerTimelineProps) {
  const { colors } = useTheme();
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
        setReducedMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
      }
    } else {
      AccessibilityInfo.isReduceMotionEnabled()
        .then((val) => setReducedMotion(!!val))
        .catch(() => {});
    }
  }, []);

  // Compute 5 Salah completed count
  const salahKeys = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
  const completedCount = salahKeys.filter((k) => !!completed?.[k]).length;

  return (
    <Card style={styles.timelineCard} padded={false}>
      <View style={styles.rowsContainer}>
        {PRAYER_LIST.map((item, index) => {
          const time = timings?.[item.key] || '--:--';
          const isDone = item.isSalah ? !!completed?.[item.key] : false;
          const isCurrent = currentPrayerSegment === item.key;
          const isFirst = index === 0;
          const isLast = index === PRAYER_LIST.length - 1;

          return (
            <View key={item.key}>
              <TouchableOpacity
                style={[
                  styles.timelineRow,
                  {
                    backgroundColor: isCurrent ? colors.accentDim : 'transparent',
                  },
                ]}
                onPress={() => {
                  if (item.isSalah) {
                    onTogglePrayer(item.key);
                  }
                }}
                disabled={!item.isSalah}
                activeOpacity={item.isSalah ? 0.7 : 1}
                accessibilityRole={item.isSalah ? 'checkbox' : 'none'}
                accessibilityState={item.isSalah ? { checked: isDone } : undefined}
                accessibilityLabel={`${item.label} at ${time}, ${item.isSalah ? (isDone ? 'completed' : 'not completed') : 'timing'}`}
              >
                {/* Left rail column */}
                <View style={styles.railColumn}>
                  {/* Top rail segment */}
                  {!isFirst && (
                    <View
                      style={[
                        styles.railLineTop,
                        {
                          backgroundColor: colors.borderSubtle,
                        },
                      ]}
                    />
                  )}

                  {/* Dot */}
                  <TimelineDot
                    isCompleted={isDone}
                    isCurrent={isCurrent}
                    isSalah={item.isSalah}
                    reducedMotion={reducedMotion}
                  />

                  {/* Bottom rail segment */}
                  {!isLast && (
                    <View
                      style={[
                        styles.railLineBottom,
                        {
                          backgroundColor: colors.borderSubtle,
                        },
                      ]}
                    />
                  )}
                </View>

                {/* Right content column */}
                <View style={styles.contentColumn}>
                  <View style={styles.rowMain}>
                    <View style={styles.labelGroup}>
                      <Text
                        style={[
                          styles.rowLabel,
                          {
                            color: isCurrent
                              ? colors.accent
                              : isDone
                              ? colors.textSecondary
                              : colors.textPrimary,
                            fontFamily: isCurrent
                              ? (I18nManager.isRTL ? 'Amiri_700Bold' : 'Manrope_700Bold')
                              : (I18nManager.isRTL ? 'Amiri_400Regular' : 'Manrope_500Medium'),
                          },
                        ]}
                      >
                        {t(item.label)}
                      </Text>
                      {isCurrent && (
                        <View
                          style={[
                            styles.nowBadge,
                            {
                              backgroundColor: colors.accent,
                            },
                          ]}
                        >
                          <Text style={[styles.nowBadgeText, { color: colors.onAccent }]}>{t('NOW')}</Text>
                        </View>
                      )}
                    </View>

                    <Text
                      style={[
                        styles.rowTime,
                        {
                          color: isCurrent
                            ? colors.accent
                            : isDone
                            ? colors.textSecondary
                            : colors.textMuted,
                          fontFamily: isCurrent
                            ? 'Manrope_700Bold'
                            : 'Manrope_600SemiBold',
                        },
                      ]}
                    >
                      {formatTime(time, timeFormat)}
                    </Text>
                  </View>

                  {/* Elapsed progress line under current prayer */}
                  {isCurrent && (
                    <View style={styles.currentProgressTrackWrap}>
                      <View
                        style={[
                          styles.currentProgressTrack,
                          { backgroundColor: colors.borderSubtle },
                        ]}
                      >
                        <View
                          style={[
                            styles.currentProgressFill,
                            {
                              backgroundColor: colors.accent,
                              width: `${Math.round(Math.min(1, Math.max(0, progressFraction)) * 100)}%`,
                            },
                          ]}
                        />
                      </View>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            </View>
          );
        })}
      </View>

      {/* Integrated Salah Tracker Footer */}
      <Hairline />
      <View style={styles.trackerFooter}>
        <View style={styles.trackerLeft}>
          <Text style={[styles.trackerText, { color: colors.textSecondary }]}>
            <Text style={[styles.trackerBold, { color: colors.textPrimary }]}>
              {completedCount} / 5
            </Text>{' '}
            {t('Salah')}
          </Text>
        </View>

        <View style={styles.trackerRight}>
          <Text style={[styles.trackerText, { color: colors.textSecondary }]}>
            {t('Streak')}{' '}
            <Text style={[styles.trackerBold, { color: colors.accent }]}>
              {streak}
            </Text>
          </Text>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  timelineCard: {
    marginBottom: 20,
    borderRadius: 14,
    overflow: 'hidden',
  },
  rowsContainer: {
    paddingVertical: 2,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingEnd: 16,
    minHeight: 46,
  },
  railColumn: {
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    // ponytail: alignSelf stretch, not height:'100%' — height:100% on a child of
    // a row-flex parent creates a circular layout on Fabric (rail height depends
    // on row height which depends on rail), collapsing the row content to 0.
    alignSelf: 'stretch',
  },
  railLineTop: {
    position: 'absolute',
    top: 0,
    bottom: '50%',
    width: 2,
  },
  railLineBottom: {
    position: 'absolute',
    top: '50%',
    bottom: 0,
    width: 2,
  },
  dotContainer: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  completedDot: {
    width: 17,
    height: 17,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentOuterRing: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
  },
  currentInnerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  upcomingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1.5,
  },
  sunriseDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentColumn: {
    flex: 1,
    justifyContent: 'center',
  },
  rowMain: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  labelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rowLabel: {
    fontSize: 15,
  },
  nowBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  nowBadgeText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 9,
    letterSpacing: 0.5,
  },
  rowTime: {
    fontSize: 15,
  },
  currentProgressTrackWrap: {
    marginTop: 6,
    paddingEnd: 4,
  },
  currentProgressTrack: {
    height: 3,
    borderRadius: 2,
    overflow: 'hidden',
  },
  currentProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  trackerFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  trackerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trackerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trackerText: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
  },
  trackerBold: {
    fontFamily: 'Manrope_700Bold',
  },
});
