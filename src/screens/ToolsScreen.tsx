import React, { useState, useEffect, useMemo } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
  AccessibilityRole,
  Animated,
  AccessibilityInfo,
} from 'react-native';
import { TabScrollView } from '../components/layout/TabScreen';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';


import { useTheme } from '../lib/theme';
import { HOME_THEME_TOKENS, getCardShadow, getHeroCardShadow } from '../lib/homeThemeTokens';
import { themeTokens, GOLD_GRADIENT } from '../theme/tokens';
import { useSettings } from '../lib/settings';
import { isRTL, t } from '../lib/i18n';
import { getForwardIcon } from '../lib/iconMap';
import { GeometricPattern } from '../components/GeometricPattern';
import { AppText } from '../components/ui/AppText';
import { useLocation } from '../lib/useLocation';
import { qiblaBearing } from '../lib/qibla';
import {
  getSalahEntries,
  computeStreak,
  getSalahHistory,
  markSalahCompleted,
} from '../lib/db';
import {
  fetchPrayerTimes,
  getCachedPrayerTimes,
  getNextPrayer,
  parseHm,
  DayTimings,
} from '../lib/prayerTimes';
import { getHijriDate } from '../lib/fasting';

/* ─── Route Union ────────────────────────────────────────────────────────── */

export type ToolsItemKey =
  | 'tasbih'
  | 'summary'
  | 'qibla'
  | 'tracker'
  | 'location'
  | 'cities'
  | 'notifications'
  | 'prayer-reminders'
  | 'fasting'
  | 'zakat'
  | 'calendar'
  | 'mosque'
  | 'women-cycle'
  | 'women-purity'
  | 'women-guidance'
  | 'women-qada'
  | 'umrah-guide'
  | 'umrah-resources'
  | 'hajj-journey'
  | 'makkah-live'
  | 'madinah-live'
  | 'hajj-live';

export interface ToolsScreenProps {
  onOpen: (key: ToolsItemKey) => void;
  onOpenSettings?: () => void;
  onOpenNotifications?: () => void;
  isActive?: boolean;
}

/* ─── Shared Theme Tokens ────────────────────────────────────────────────── */

const GOLD_SOLID = themeTokens.paper.gold;
const HERO_OUTER_BORDER = HOME_THEME_TOKENS.hero.outerBorder;
const HERO_INNER_BORDER = HOME_THEME_TOKENS.hero.innerBorder;

function getTokens(isDark: boolean) {
  return isDark ? themeTokens.ink : themeTokens.paper;
}

/* ─── Local Micro-Components ─────────────────────────────────────────────── */

interface AccessiblePressableProps {
  onPress?: () => void;
  style?: any;
  scaleOnPress?: number;
  activeOpacity?: number;
  children: React.ReactNode;
  accessibilityRole?: AccessibilityRole;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessible?: boolean;
  testID?: string;
}

function AccessiblePressable({
  onPress,
  style,
  scaleOnPress = 0.98,
  activeOpacity = 0.85,
  children,
  accessibilityRole = 'button',
  accessibilityLabel,
  accessibilityHint,
  accessible,
  testID,
}: AccessiblePressableProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessible={accessible}
      testID={testID}
      style={({ pressed }) => [
        style,
        pressed && {
          transform: [{ scale: scaleOnPress }],
          opacity: activeOpacity,
        },
      ]}
    >
      {children}
    </Pressable>
  );
}

function DiamondIcon({ size = 6, color = GOLD_SOLID }: { size?: number; color?: string }) {
  const half = size / 2;
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Path
        d={`M ${half} 0 L ${size} ${half} L ${half} ${size} L 0 ${half} Z`}
        fill={color}
      />
    </Svg>
  );
}

function getTodayIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

const PRAYERS_LIST = [
  { key: 'Fajr', label: 'Fajr' },
  { key: 'Dhuhr', label: 'Dhuhr' },
  { key: 'Asr', label: 'Asr' },
  { key: 'Maghrib', label: 'Maghrib' },
  { key: 'Isha', label: 'Isha' },
] as const;

/* ─── Main ToolsScreen ───────────────────────────────────────────────────── */

const ToolsScreen = React.memo(function ToolsScreen({
  onOpen,
  onOpenSettings,
  onOpenNotifications,
  isActive = true,
}: ToolsScreenProps) {
  const { mode } = useTheme();
  const isDark = mode === 'ink';
  const tokens = getTokens(isDark);
  const { width } = useWindowDimensions();
  const { settings } = useSettings();
  const { location: gpsLocation } = useLocation(false);
  const rtl = isRTL();

  const fontPoppinsRegular = 'Poppins_400Regular';
  const fontPoppinsMedium = 'Poppins_500Medium';
  const fontLoraMedium = 'Lora_500Medium';

  const contentMaxWidth = Math.min(width, 680);
  const horizontalMargin = 14.5;
  const gridGap = 7.3;
  const tileWidth = Math.max(0, (contentMaxWidth - 2 * horizontalMargin - gridGap) / 2);

  const effectiveLocation = useMemo(() => {
    if (settings.locationMode === 'auto') {
      return gpsLocation || settings.autoLocation || settings.manualLocation;
    }
    return settings.manualLocation;
  }, [settings.locationMode, gpsLocation, settings.autoLocation, settings.manualLocation]);

  // 1. Tracker Data & Streak
  const [completed, setCompleted] = useState<Record<string, boolean>>(() => getSalahEntries(getTodayIso()));
  const [streak, setStreak] = useState(() => computeStreak(getSalahHistory(30)));
  const [prayerTimings, setPrayerTimings] = useState<DayTimings | null>(() => {
    const loc = effectiveLocation;
    if (loc?.latitude != null && loc?.longitude != null) {
      return getCachedPrayerTimes(loc, settings.methodId, new Date());
    }
    return null;
  });

  useEffect(() => {
    if (!isActive) return;
    let cancelled = false;
    const loc = effectiveLocation;
    if (loc?.latitude != null && loc?.longitude != null) {
      fetchPrayerTimes(loc, settings.methodId)
        .then((res) => {
          if (!cancelled && res) {
            setPrayerTimings((prev) => {
              if (prev && JSON.stringify(prev.timings) === JSON.stringify(res.timings)) {
                return prev;
              }
              return res;
            });
          }
        })
        .catch(() => {});
    }
    return () => {
      cancelled = true;
    };
  }, [isActive, effectiveLocation, settings.methodId]);

  function togglePrayer(prayer: string) {
    const iso = getTodayIso();
    const next = !completed[prayer];
    markSalahCompleted(iso, prayer, next);
    setCompleted((prev) => ({ ...prev, [prayer]: next }));
    const history = getSalahHistory(30);
    setStreak(computeStreak(history));
  }

  const completedCount = useMemo(() => {
    return PRAYERS_LIST.filter((p) => completed[p.key]).length;
  }, [completed]);

  const nextPrayer = useMemo(() => {
    if (prayerTimings?.timings) {
      return getNextPrayer(prayerTimings.timings);
    }
    return null;
  }, [prayerTimings]);

  // Live bearing to Kaaba
  const liveBearing = useMemo(() => {
    if (effectiveLocation?.latitude != null && effectiveLocation?.longitude != null) {
      return Math.round(qiblaBearing(effectiveLocation.latitude, effectiveLocation.longitude));
    }
    return 258;
  }, [effectiveLocation]);

  // Hajj Season detection
  const isHajjLive = useMemo(() => {
    const hijri = getHijriDate(new Date());
    return hijri.month === 12 && hijri.day >= 8 && hijri.day <= 13;
  }, []);

  // Reduce motion & Pulse animation
  const [pulseAnim] = useState(() => new Animated.Value(1));
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      sub?.remove();
    };
  }, []);

  useEffect(() => {
    if (reduceMotion || !isActive) {
      pulseAnim.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.35,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [reduceMotion, pulseAnim, isActive]);

  // Trackers & Calculators list
  const trackerGridItems: {
    key: ToolsItemKey;
    title: string;
    subtitle: string;
    icon: keyof typeof Ionicons.glyphMap;
  }[] = [
    {
      key: 'fasting',
      title: 'Fasting',
      subtitle: 'Tracker · Ramadan · voluntary & missed fasts',
      icon: 'moon',
    },
    {
      key: 'women-qada',
      title: 'Qada Fasts',
      subtitle: 'Missed fasts tracker & makeup scorecard',
      icon: 'calendar',
    },
    {
      key: 'zakat',
      title: 'Zakat',
      subtitle: 'Calculator · gold/silver, cash, investments',
      icon: 'calculator',
    },
    {
      key: 'qibla',
      title: 'Qibla',
      subtitle: 'Direction to Kaaba',
      icon: 'compass',
    },
    {
      key: 'tasbih',
      title: 'Tasbih',
      subtitle: 'Digital dhikr counter',
      icon: 'repeat',
    },
    {
      key: 'summary',
      title: 'Weekly Summary',
      subtitle: 'Your past 7 days of reading, salah & Hifz',
      icon: 'stats-chart',
    },
  ];

  // Utilities & Location list
  const utilitiesListItems: {
    key: ToolsItemKey;
    title: string;
    subtitle: string;
    icon: keyof typeof Ionicons.glyphMap;
    hasBearing?: boolean;
  }[] = [
    {
      key: 'mosque',
      title: 'Mosque Finder',
      subtitle: 'Nearby mosques & directions',
      icon: 'location',
    },
    {
      key: 'location',
      title: 'Location',
      subtitle: 'GPS auto vs manual coordinates · choose a city',
      icon: 'navigate',
    },
    {
      key: 'calendar',
      title: 'Hijri Calendar',
      subtitle: 'Islamic dates · month grid',
      icon: 'calendar',
    },
    {
      key: 'prayer-reminders',
      title: 'Prayer Reminders',
      subtitle: 'Per-prayer alerts & audio',
      icon: 'notifications',
    },
    {
      key: 'umrah-resources',
      title: 'Umrah Resources',
      subtitle: 'Packing Checklist',
      icon: 'list',
    },
  ];

  // Live Broadcasts
  const liveBroadcasts: {
    key: ToolsItemKey;
    title: string;
    subtitle: string;
    isLive: boolean;
  }[] = [
    {
      key: 'makkah-live',
      title: 'Makkah Live TV',
      subtitle: 'Masjid al-Haram · 24/7 official live broadcast',
      isLive: true,
    },
    {
      key: 'madinah-live',
      title: 'Madinah Live',
      subtitle: 'Masjid an-Nabawi · 24/7 official Sunnah TV stream',
      isLive: true,
    },
    {
      key: 'hajj-live',
      title: 'Hajj Live',
      subtitle: 'Holy sites broadcast · Arafah, Mina & Muzdalifah',
      isLive: isHajjLive,
    },
  ];

  return (
    <View style={styles.root}>
      <TabScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={[styles.container, { maxWidth: contentMaxWidth }]}>
          {/* ─── Title Section ─────────────────────────────────────────── */}
          <View style={styles.titleSection}>
            <AppText
              variant="eyebrow"
              style={[
                styles.titleEyebrow,
                {
                  fontFamily: fontPoppinsMedium,
                },
              ]}
              maxFontSizeMultiplier={1.2}
            >
              {t('Tools').toLocaleUpperCase()}
            </AppText>
            <AppText
              variant="screenTitle"
              style={[
                styles.titleMain,
                {
                  fontFamily: fontLoraMedium,
                },
              ]}
              maxFontSizeMultiplier={1.2}
            >
              {t('Utilities')}
            </AppText>
          </View>

          {/* ─── 3. Hero: Salah Tracker ───────────────────────────────────── */}
          <AccessiblePressable
            onPress={() => onOpen('tracker')}
            accessible={false}
            style={[
              styles.heroCardWrap,
              { backgroundColor: tokens.heroGradient[0] },
              getHeroCardShadow(mode),
            ]}
            scaleOnPress={0.98}
            accessibilityRole="button"
            accessibilityLabel={`${t('Salah Tracker')}, ${completedCount} of 5 ${t('prayers completed')}, ${streak} ${t('day streak')}`}
            testID="tools-card-salah-hero"
          >
            <View style={[styles.heroCard, { borderColor: HERO_OUTER_BORDER }]}>
              <View style={[StyleSheet.absoluteFill, { borderRadius: 21, overflow: 'hidden' }]}>
                <LinearGradient
                  colors={tokens.heroGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />

                {/* Clipped Geometric SVG Pattern */}
                <GeometricPattern
                  variant="tessellation"
                  color={HERO_OUTER_BORDER}
                  opacity={0.12}
                  style={StyleSheet.absoluteFill}
                />
              </View>

              {/* Inner Inset 4.5 Border */}
              <View style={styles.heroInnerBorder} pointerEvents="none" />

              <View style={styles.heroSummaryRow}>
                <View style={styles.heroSummaryCopy}>
                  <View style={styles.heroTodayRow}>
                    <DiamondIcon size={6} color={tokens.gold} />
                    <AppText variant="eyebrow" onHero style={styles.heroTodayText}>
                      {t('Today')}
                    </AppText>
                  </View>
                  <AppText variant="onHeroTitle" onHero style={styles.heroTitle}>
                    {t('Salah Tracker')}
                  </AppText>
                  <AppText variant="onHeroSubtitle" onHero style={styles.heroSubtitle}>
                    {t('Daily 5 prayers checklist & streaks')}
                  </AppText>
                </View>
                <View style={styles.heroStreakCluster} pointerEvents="none">
                  <AppText variant="numeral" onHero style={styles.heroBigStreak} maxFontSizeMultiplier={1.2}>
                    {streak}
                  </AppText>
                  <AppText variant="onHeroSubtitle" onHero style={styles.heroStreakLabel}>
                    {t('day streak')}
                  </AppText>
                </View>
              </View>

              <View style={styles.heroPrayersRow}>
                {PRAYERS_LIST.map((prayer) => {
                  const isDone = Boolean(completed[prayer.key]);
                  const isNext = nextPrayer?.name === prayer.key;
                  let isPassed = false;
                  if (!isDone && !isNext && prayerTimings?.timings?.[prayer.key]) {
                    const now = new Date();
                    const nowMin = now.getHours() * 60 + now.getMinutes();
                    const pMin = parseHm(prayerTimings.timings[prayer.key]);
                    if (nowMin > pMin) isPassed = true;
                  }
                  return (
                    <Pressable
                      key={prayer.key}
                      onPress={() => togglePrayer(prayer.key)}
                      accessible
                      hitSlop={{ top: 4, bottom: 4, left: 2, right: 2 }}
                      accessibilityRole="button"
                      accessibilityLabel={`${t(prayer.label)}, ${isDone ? t('done') : t('not done')}`}
                      accessibilityState={{ selected: isDone }}
                      style={styles.heroPrayerButton}
                    >
                      <View style={[styles.prayerCircle, {
                        backgroundColor: isDone ? tokens.gold : 'transparent',
                        borderColor: isDone || isNext ? tokens.gold : isPassed ? tokens.onHeroMuted : tokens.cardBorder,
                        borderWidth: isNext ? 1.5 : 1,
                      }]}>
                        {isDone && <Ionicons name="checkmark" size={14} color={tokens.onGold} />}
                        {!isDone && isNext && <View style={[styles.nextPrayerDot, { backgroundColor: tokens.gold }]} />}
                      </View>
                      <AppText variant="caption" onHero style={[styles.prayerNameText, { color: isNext ? tokens.gold : tokens.onHeroMuted }]} numberOfLines={1}>
                        {t(prayer.label)}
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>

              <AccessiblePressable
                onPress={() => onOpen('tracker')}
                style={styles.heroOpenBtnWrap}
                scaleOnPress={0.96}
                accessibilityRole="button"
                accessibilityLabel={`${t('Open')} ${t('Salah Tracker')}`}
              >
                <LinearGradient colors={GOLD_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.heroOpenBtn}>
                  <AppText variant="body" tone="onGold" style={styles.heroOpenBtnText}>
                    {t('Open')} {rtl ? '←' : '→'}
                  </AppText>
                </LinearGradient>
              </AccessiblePressable>
            </View>
          </AccessiblePressable>

          {/* ─── 4. TRACKERS & CALCULATORS ─────────────────────────────────── */}
          <AppText
            variant="eyebrow"
            style={[
              styles.sectionLabel,
              {
                fontFamily: fontPoppinsMedium,
              },
            ]}
            accessibilityRole="header"
            maxFontSizeMultiplier={1.2}
          >
            {t('TRACKERS & CALCULATORS')}
          </AppText>

          {/* 2 Equal Columns Grid (6 tiles in 3 rows) */}
          <View style={styles.trackerGrid}>
            {trackerGridItems.map((item) => (
              <AccessiblePressable
                key={item.key}
                onPress={() => onOpen(item.key)}
                style={[
                  styles.trackerTileWrap,
                  {
                    width: tileWidth,
                    backgroundColor: tokens.cardTop,
                  },
                  getCardShadow(mode),
                ]}
                scaleOnPress={0.98}
                accessibilityRole="button"
                accessibilityLabel={`${t(item.title)}, ${t(item.subtitle)}`}
                testID={`tools-card-${item.key}`}
              >
                <View
                  style={[
                    styles.trackerTileInner,
                    {
                      borderColor: tokens.cardBorder,
                    },
                  ]}
                >
                  <LinearGradient
                    colors={[tokens.cardTop, tokens.cardBottom]}
                    style={StyleSheet.absoluteFill}
                  />
                  <View
                    style={[
                      styles.tileRingIcon,
                      {
                        borderColor: tokens.ringBorder,
                        backgroundColor: tokens.ringFill,
                      },
                    ]}
                  >
                    <Ionicons name={item.icon} size={14} color={tokens.accent} />
                  </View>
                  <View style={styles.tileTextWrap}>
                    <AppText
                      variant="title"
                      style={[
                        styles.tileTitle,
                        {
                          fontFamily: fontPoppinsMedium,
                        },
                      ]}

                      adjustsFontSizeToFit
                      minimumFontScale={0.85}
                      maxFontSizeMultiplier={1.2}
                    >
                      {t(item.title)}
                    </AppText>
                    <AppText
                      variant="subtitle"
                      style={[
                        styles.tileSubtitle,
                        {
                          fontFamily: fontPoppinsRegular,
                        },
                      ]}

                      maxFontSizeMultiplier={1.2}
                    >
                      {t(item.subtitle)}
                    </AppText>
                  </View>
                </View>
              </AccessiblePressable>
            ))}
          </View>

          {/* ─── 5. UTILITIES & LOCATION ───────────────────────────────────── */}
          <AppText
            variant="eyebrow"
            style={[
              styles.utilitiesSectionLabel,
              {
                fontFamily: fontPoppinsMedium,
              },
            ]}
            accessibilityRole="header"
            maxFontSizeMultiplier={1.2}
          >
            {t('UTILITIES & LOCATION')}
          </AppText>

          {/* Inset List Card (6 rows x 40.7) */}
          <View
            style={[
              styles.utilitiesCardWrap,
              {
                backgroundColor: tokens.cardTop,
              },
              getCardShadow(mode),
            ]}
            testID="tools-card-utilities"
          >
            <View
              style={[
                styles.utilitiesCardInner,
                {
                  borderColor: tokens.cardBorder,
                },
              ]}
            >
              <LinearGradient
                colors={[tokens.cardTop, tokens.cardBottom]}
                style={StyleSheet.absoluteFill}
              />

              {utilitiesListItems.map((item, index) => {
                const isLast = index === utilitiesListItems.length - 1;
                return (
                  <View key={item.key} style={styles.utilityRowWrap}>
                    <UtilityRowItem
                      item={item}
                      tokens={tokens}
                      isDark={isDark}
                      liveBearing={liveBearing}
                      fontPoppinsMedium={fontPoppinsMedium}
                      fontPoppinsRegular={fontPoppinsRegular}
                      onPress={() => onOpen(item.key)}
                    />
                    {!isLast && (
                      <View
                        style={[
                          styles.utilitySeparator,
                          {
                            backgroundColor: tokens.cardBorder,
                          },
                        ]}
                      />
                    )}
                  </View>
                );
              })}
            </View>
          </View>

          {/* ─── 6. LIVE BROADCASTS ───────────────────────────────────────── */}
          <AppText
            variant="eyebrow"
            style={[
              styles.liveSectionLabel,
              {
                fontFamily: fontPoppinsMedium,
              },
            ]}
            accessibilityRole="header"
            maxFontSizeMultiplier={1.2}
          >
            {t('LIVE BROADCASTS')}
          </AppText>

          {/* Three Stacked PremiumCards (54.5 high, gap 5.8) */}
          <View style={styles.liveCardsStack}>
            {liveBroadcasts.map((card) => (
              <AccessiblePressable
                key={card.key}
                onPress={() => onOpen(card.key)}
                style={[
                  styles.liveCardWrap,
                  {
                    backgroundColor: tokens.cardTop,
                  },
                  getCardShadow(mode),
                ]}
                scaleOnPress={0.98}
                accessibilityRole="button"
                accessibilityLabel={`${t(card.title)}, ${card.isLive ? t('live stream') : t('offline')}`}
                testID={`tools-card-${card.key}`}
              >
                <View
                  style={[
                    styles.liveCardInner,
                    {
                      borderColor: tokens.cardBorder,
                    },
                  ]}
                >
                  <LinearGradient
                    colors={[tokens.cardTop, tokens.cardBottom]}
                    style={StyleSheet.absoluteFill}
                  />

                  {/* Leading Thumbnail (natural flex row start edge; formerly rtl && styles.liveThumbnailRtl) */}
                  <View
                    style={[
                      styles.liveThumbnail,
                      {
                        borderColor: isDark ? 'rgba(222, 184, 110, 0.35)' : 'rgba(16, 90, 75, 0.2)',
                      },
                    ]}
                  >
                    <LinearGradient
                      colors={tokens.heroGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={StyleSheet.absoluteFill}
                    />
                    <GeometricPattern
                      variant="tessellation"
                      color={HERO_OUTER_BORDER}
                      opacity={0.15}
                      style={StyleSheet.absoluteFill}
                    />
                    <View style={styles.liveThumbnailOverlay} />

                    {/* Center Gold Gradient Play Circle 20.4 */}
                    <LinearGradient
                      colors={GOLD_GRADIENT}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.livePlayCircle}
                    >
                      <Ionicons name="play" size={10} color={tokens.onGold} style={{ marginStart: 1 }} />
                    </LinearGradient>
                  </View>

                  {/* Flexible Middle Text */}
                  <View style={styles.liveTextContainer}>
                    {/* LIVE Dot 4.4 + Label Poppins medium11 letterSpacing1.5 gold */}
                    <View style={styles.liveStatusRow}>
                      {card.isLive ? (
                        <>
                          <Animated.View
                            style={[
                              styles.liveStatusDot,
                              {
                                backgroundColor: tokens.gold,
                              },
                              !reduceMotion && { opacity: pulseAnim },
                            ]}
                          />
                          <AppText
                            variant="caption"
                            highlight
                            style={[
                              styles.liveStatusText,
                              {
                                fontFamily: fontPoppinsMedium,
                              },
                            ]}
                            maxFontSizeMultiplier={1.2}
                          >
                            {t('LIVE').toLocaleUpperCase()}
                          </AppText>
                        </>
                      ) : (
                        <>
                          <View
                            style={[
                              styles.liveStatusDot,
                              {
                                backgroundColor: tokens.muted,
                              },
                            ]}
                          />
                          <AppText
                            variant="caption"
                            style={[
                              styles.liveStatusText,
                              {
                                fontFamily: fontPoppinsMedium,
                              },
                            ]}
                            maxFontSizeMultiplier={1.2}
                          >
                            {t('OFFLINE').toLocaleUpperCase()}
                          </AppText>
                        </>
                      )}
                    </View>

                    {/* Title */}
                    <AppText
                      variant="title"
                      style={[
                        styles.liveTitle,
                        {
                          fontFamily: fontPoppinsMedium,
                        },
                      ]}
                      maxFontSizeMultiplier={1.2}
                    >
                      {t(card.title)}
                    </AppText>

                    {/* Subtitle */}
                    <AppText
                      variant="subtitle"
                      style={[
                        styles.liveSubtitle,
                        {
                          fontFamily: fontPoppinsRegular,
                        },
                      ]}
                      maxFontSizeMultiplier={1.2}
                    >
                      {t(card.subtitle)}
                    </AppText>
                  </View>

                  {/* Trailing Chevron */}
                  <View style={styles.liveChevronWrap}>
                    <Ionicons
                      name={getForwardIcon()}
                      size={10}
                      color={tokens.gold}
                    />
                  </View>
                </View>
              </AccessiblePressable>
            ))}
          </View>
        </View>
      </TabScrollView>
    </View>
  );
});

/* ─── Utility Row Item with 8% Accent Pressed Tint ───────────────────────── */

interface UtilityRowItemProps {
  item: {
    key: ToolsItemKey;
    title: string;
    subtitle: string;
    icon: keyof typeof Ionicons.glyphMap;
    hasBearing?: boolean;
  };
  tokens: ReturnType<typeof getTokens>;
  isDark: boolean;
  liveBearing: number;
  fontPoppinsMedium?: string;
  fontPoppinsRegular?: string;
  onPress: () => void;
}

function UtilityRowItem({
  item,
  tokens,
  isDark,
  liveBearing,
  fontPoppinsMedium,
  fontPoppinsRegular,
  onPress,
}: UtilityRowItemProps) {
  const pressedBg = isDark ? 'rgba(222, 184, 110, 0.08)' : 'rgba(16, 90, 75, 0.08)';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.utilityRow,
        pressed && { backgroundColor: pressedBg },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${t(item.title)}, ${t(item.subtitle)}`}
    >
      <View
        style={[
          styles.utilityRingIcon,
          {
            borderColor: tokens.ringBorder,
            backgroundColor: tokens.ringFill,
          },
        ]}
      >
        <Ionicons name={item.icon} size={11.6} color={tokens.accent} />
      </View>
      <View style={styles.utilityTextWrap}>
        <AppText
          variant="title"
          style={[
            styles.utilityTitle,
            {
              fontFamily: fontPoppinsMedium,
            },
          ]}

          maxFontSizeMultiplier={1.2}
        >
          {t(item.title)}
        </AppText>
        <AppText
          variant="subtitle"
          style={[
            styles.utilitySubtitle,
            {
              fontFamily: fontPoppinsRegular,
            },
          ]}

          maxFontSizeMultiplier={1.2}
        >
          {t(item.subtitle)}
        </AppText>
      </View>

      {item.hasBearing && (
        <AppText
          variant="numeral"
          highlight
          style={[
            styles.utilityBearing,
            {
              fontFamily: fontPoppinsMedium,
            },
          ]}
          maxFontSizeMultiplier={1.2}
        >
          {liveBearing}°
        </AppText>
      )}

      <Ionicons
        name={getForwardIcon()}
        size={9}
        color={tokens.gold}
      />
    </Pressable>
  );
}

/* ─── Stylesheet ─────────────────────────────────────────────────────────── */

export const styles = StyleSheet.create({
  root: {
    flex: 1,
    minHeight: '100%',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 0,
  },
  container: {
    width: '100%',
    alignSelf: 'center',
  },

  /* Title Section: Eyebrow TOOLS Poppins medium 11 letterSpacing2.2 gold, Utilities Lora 33.5 */
  titleSection: {
    paddingStart: 26,
  },
  titleEyebrow: {
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 2.2,
    textTransform: 'uppercase',
  },
  titleMain: {
    fontSize: 33.5,
    lineHeight: 38,
    marginTop: 2,
  },

  /* Flowing hero rows expand with translated text and system font size. */
  heroCardWrap: {
    marginHorizontal: 14.5,
    marginTop: 19.5,
    borderRadius: 22,
  },
  heroCard: { minHeight: 220, borderRadius: 22, borderWidth: 1, position: 'relative', padding: 16, gap: 12 },
  heroInnerBorder: {
    position: 'absolute',
    top: 4.5,
    left: 4.5,
    right: 4.5,
    bottom: 4.5,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: HERO_INNER_BORDER,
  },
  heroTodayRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },

  heroTodayText: {
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: 2,
  },
  heroTitle: { fontSize: 24, lineHeight: 32 },

  heroSubtitle: { fontSize: 12, lineHeight: 18 },


  /* Streak summary */
  heroStreakCluster: { alignItems: 'center', minWidth: 58, maxWidth: 76 },


  heroBigStreak: { fontSize: 52, lineHeight: 64, textAlign: 'center' },
  heroStreakLabel: { fontSize: 11, textAlign: 'center' },

  /* Prayer controls */
  prayerCircle: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  prayerNameText: { fontSize: 11, textAlign: 'center' },

  /* Tracker action */
  heroOpenBtnWrap: { alignSelf: 'flex-start', minWidth: 110, borderRadius: 22, overflow: 'hidden' },

  heroOpenBtn: { minHeight: 44, paddingHorizontal: 16, paddingVertical: 4, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  heroOpenBtnText: { fontSize: 12, textAlign: 'center' },

  /* Section Labels */
  sectionLabel: {
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 2,
    textTransform: 'uppercase',
    paddingStart: 26,
    marginTop: 20,
    marginBottom: 8,
  },
  utilitiesSectionLabel: {
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 2,
    textTransform: 'uppercase',
    paddingStart: 26,
    marginTop: 24,
    marginBottom: 8,
  },
  liveSectionLabel: {
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 2,
    textTransform: 'uppercase',
    paddingStart: 26,
    marginTop: 24,
    marginBottom: 8,
  },

  /* Tracker Grid: 2 equal columns, gaps 7.3, height 83.5, radius 13 */
  trackerGrid: {
    marginHorizontal: 14.5,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7.3,
  },
  trackerTileWrap: {
    minHeight: 83.5,
    borderRadius: 18,
  },
  trackerTileInner: {
    flexGrow: 1,
    flexShrink: 0,
    minHeight: 83.5,
    borderRadius: 17,
    borderWidth: 1,
    overflow: 'hidden',
    paddingHorizontal: 11,
    paddingTop: 9,
    paddingBottom: 8,
    position: 'relative',
    justifyContent: 'flex-start',
  },
  tileRingIcon: {
    width: 30.5,
    height: 30.5,
    borderRadius: 15.25,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileTextWrap: {
    marginTop: 6,
    flexShrink: 1,
    minWidth: 0,
  },
  tileTitle: {
    fontSize: 13,
    lineHeight: 17,
  },
  tileSubtitle: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },

  /* Utilities Card: margin 14.5, radius 14, 6 rows x 40.7 */
  utilitiesCardWrap: {
    marginHorizontal: 14.5,
    borderRadius: 18,
  },
  utilitiesCardInner: {
    borderRadius: 17,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  utilityRowWrap: {},
  utilityRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    paddingStart: 12,
    paddingEnd: 16,
    paddingVertical: 4,
  },
  utilityRingIcon: {
    width: 24.7,
    height: 24.7,
    borderRadius: 12.35,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  utilityTextWrap: {
    marginStart: 8.3,
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  utilityTitle: {
    fontSize: 13,
    lineHeight: 17,
  },
  utilitySubtitle: {
    fontSize: 12,
    lineHeight: 16,
  },
  utilityBearing: {
    fontSize: 12,
    lineHeight: 15,
    marginEnd: 6,
    flexShrink: 0,
  },
  utilitySeparator: {
    height: 0.5,
    marginStart: 45,
    marginEnd: 16,
  },

  /* Live Broadcasts: 3 stacked cards, content-driven flex row, gap 5.8, radius 18/17 */
  liveCardsStack: {
    marginHorizontal: 14.5,
    gap: 5.8,
  },
  liveCardWrap: {
    borderRadius: 18,
  },
  liveCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 17,
    borderWidth: 1,
    overflow: 'hidden',
    paddingStart: 7.5,
    paddingEnd: 12,
    paddingVertical: 7,
  },
  liveThumbnail: {
    width: 87.3,
    height: 44,
    borderRadius: 8.7,
    borderWidth: 0.5,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginEnd: 10,
  },
  liveThumbnailOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  livePlayCircle: {
    width: 20.4,
    height: 20.4,
    borderRadius: 10.2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveTextContainer: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
    paddingVertical: 2,
  },
  liveStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  liveStatusDot: {
    width: 4.4,
    height: 4.4,
    borderRadius: 2.2,
  },
  liveStatusText: {
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: 1.5,
  },
  liveTitle: {
    fontSize: 13,
    lineHeight: 17,
    marginTop: 2,
  },
  liveSubtitle: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 1,
  },
  liveChevronWrap: {
    flexShrink: 0,
    marginStart: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  heroSummaryRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  heroSummaryCopy: { flex: 1, minWidth: 0, gap: 4 },
  heroPrayersRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 4 },
  heroPrayerButton: { flex: 1, minWidth: 0, minHeight: 52, alignItems: 'center', gap: 4 },
  nextPrayerDot: { width: 6, height: 6, borderRadius: 3 },
});

export default ToolsScreen;
