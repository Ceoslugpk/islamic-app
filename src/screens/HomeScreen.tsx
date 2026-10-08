import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  I18nManager,
  ScrollView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  useWindowDimensions,
  Animated,
  Platform,
  AccessibilityInfo,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme';
import { useSettings } from '../lib/settings';
import { useHaptics } from '../lib/haptics';
import { useLocation } from '../lib/useLocation';
import { fetchPrayerTimes, getCachedPrayerTimes, todayDdmmyyyy, DayTimings, getNextPrayer } from '../lib/prayerTimes';
import { formatTime, formatCountdown } from '../lib/timeFormat';
import { usePrayerWatcher } from '../lib/usePrayerWatcher';
import { configureAudio } from '../lib/audio';
import {
  markSalahCompleted,
  getSalahEntries,
  computeStreak,
  getSalahHistory,
} from '../lib/db';

import { NAMES_99 } from '../lib/names99';
import {
  useAfterPrayerDuas,
  getAllAfterPrayerDuas,
  FALLBACK_AFTER_PRAYER_DUAS,
} from '../lib/afterPrayerDuas';
import { Card } from '../components/Card';
import { Hairline } from '../components/Hairline';
import { SectionHeader } from '../components/SectionHeader';
import { GeometricPattern } from '../components/GeometricPattern';
import { ArabicText } from '../components/ArabicText';
import { iconSizes } from '../lib/iconMap';
import { gettingPrayerTimes, preparingDashboard, retry, prayerTimesOfflineError, prayerTimesNeedsConnection } from '../lib/strings';
import { isRTL, t } from '../lib/i18n';
import { useHadithOfDay } from '../lib/useHadithOfDay';
import { useAyahOfDay, getDayOfYear } from '../lib/useAyahOfDay';
import { useConnectivity, isAppOnline } from '../lib/useConnectivity';
import { LocationPermissionNote } from '../components/LocationPermissionNote';
import {
  CountdownCardSkeleton,
  PrayerRowSkeleton,
  Skeleton,
} from '../components/Skeleton';
import {
  PrayerHeroAtmosphere,
  PrayerSegment,
} from '../components/PrayerHeroAtmosphere';
import { PhaseWash } from '../components/PhaseWash';
import { PrayerCountdown } from '../components/PrayerCountdown';
import { PrayerTimeline } from '../components/PrayerTimeline';
import { ContinueReadingCard } from '../components/ContinueReadingCard';
import { DailyContentRail } from '../components/DailyContentRail';
import { QuickActionsStrip } from '../components/QuickActionsStrip';
import { CompactPrayerBar } from '../components/CompactPrayerBar';
import { hScrollRTLStyle } from '../lib/rtl';

const PRAYER_ORDER: { key: keyof DayTimings['timings']; label: string }[] = [
  { key: 'Fajr', label: 'Fajr' },
  { key: 'Sunrise', label: 'Sunrise' },
  { key: 'Dhuhr', label: 'Dhuhr' },
  { key: 'Asr', label: 'Asr' },
  { key: 'Maghrib', label: 'Maghrib' },
  { key: 'Isha', label: 'Isha' },
];

const PRAYER_ARABIC: Record<string, string> = {
  Fajr: 'الفَجْر',
  Sunrise: 'الشُّرُوق',
  Dhuhr: 'الظُّهْر',
  Asr: 'العَصْر',
  Maghrib: 'المَغْرِب',
  Isha: 'العِشَاء',
};

function parseHm(hm: string): number {
  const [h, m] = hm.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

const USE_NATIVE_DRIVER = Platform.OS !== 'web';

function checkReducedMotion(cb: (reduced: boolean) => void) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      cb(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
      return;
    }
    cb(false);
    return;
  }
  AccessibilityInfo.isReduceMotionEnabled()
    .then((val) => cb(!!val))
    .catch(() => cb(false));
}

export interface HomeScreenProps {
  onOpenNames?: () => void;
  onOpenQuran?: (surah?: number, ayah?: number) => void;
  onOpenReader?: (surah: number, ayah: number) => void;
  onOpenQuranTab?: () => void;
  onOpenHadith?: () => void;
  onOpenQibla?: () => void;
  onOpenDuas?: () => void;
  onOpenTasbih?: () => void;
  onOpenCities?: () => void;
}

export default function HomeScreen({
  onOpenNames,
  onOpenQuran,
  onOpenReader,
  onOpenQuranTab,
  onOpenHadith,
  onOpenQibla,
  onOpenDuas,
  onOpenTasbih,
  onOpenCities,
}: HomeScreenProps) {
  const { colors } = useTheme();
  const { settings, setAutoLocation } = useSettings();
  const { haptic } = useHaptics();

  const handleOpenReader = useCallback(
    (surah: number, ayah?: number) => {
      if (onOpenReader) {
        onOpenReader(surah, ayah ?? 1);
      } else if (onOpenQuran) {
        onOpenQuran(surah, ayah);
      }
    },
    [onOpenReader, onOpenQuran]
  );

  const handleOpenQuranTab = useCallback(() => {
    if (onOpenQuranTab) {
      onOpenQuranTab();
    } else if (onOpenQuran) {
      onOpenQuran();
    }
  }, [onOpenQuranTab, onOpenQuran]);
  const { location: gpsLocation, status: locStatus, request: requestLocation, loading: locLoading } = useLocation(false);
  const { refreshKey } = useConnectivity();
  const { width } = useWindowDimensions();
  const [locationDismissed, setLocationDismissed] = useState(false);
  const [data, setData] = useState<DayTimings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(new Date());
  const [completed, setCompleted] = useState<Record<string, boolean>>({});
  const [streak, setStreak] = useState(0);
  const [activeDuaIndex, setActiveDuaIndex] = useState(0);
  const [expandedDuaIds, setExpandedDuaIds] = useState<Record<string, boolean>>({});

  const { ayah, loading: ayahLoading, refresh: refreshAyah } = useAyahOfDay();
  const { hadith, loading: hadithLoading, refresh: refreshHadith } = useHadithOfDay();

  useEffect(() => {
    if (data) {
      const currentDate = new Date();
      const iso = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
      const entries = getSalahEntries(iso);
      setCompleted(entries);
      const history = getSalahHistory(30);
      setStreak(computeStreak(history));
    }
  }, [data]);

  function togglePrayer(prayer: string) {
    const currentDate = new Date();
    const iso = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
    const nextVal = !completed[prayer];
    markSalahCompleted(iso, prayer, nextVal);
    setCompleted((prev) => ({ ...prev, [prayer]: nextVal }));
    const history = getSalahHistory(30);
    setStreak(computeStreak(history));
    if (nextVal) {
      haptic('success');
    } else {
      haptic('light');
    }
  }

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);

  // Real-time prayer rollover: when the countdown hits zero, refresh `now`
  // immediately so `next`/`currentSegment`/compact bar switch to the next prayer
  // without waiting for the 30s clock tick.
  const handlePrayerExpire = useCallback(() => {
    setNow(new Date());
  }, []);

  const effectiveLocation = useMemo(() => {
    if (settings.locationMode === 'auto') {
      return gpsLocation || settings.autoLocation || settings.manualLocation;
    }
    return settings.manualLocation;
  }, [settings.locationMode, gpsLocation, settings.autoLocation, settings.manualLocation]);

  const hasUsableLocation = useMemo(() => {
    const autoValid = Boolean(
      settings.autoLocation &&
      typeof settings.autoLocation.latitude === 'number' &&
      typeof settings.autoLocation.longitude === 'number' &&
      !isNaN(settings.autoLocation.latitude) &&
      !isNaN(settings.autoLocation.longitude) &&
      Boolean(settings.autoLocation.label)
    );
    const manualValid = Boolean(
      settings.manualLocation &&
      typeof settings.manualLocation.latitude === 'number' &&
      typeof settings.manualLocation.longitude === 'number' &&
      !isNaN(settings.manualLocation.latitude) &&
      !isNaN(settings.manualLocation.longitude) &&
      Boolean(settings.manualLocation.label)
    );
    return autoValid || manualValid;
  }, [settings.autoLocation, settings.manualLocation]);

  const lastDateStrRef = useRef<string>(todayDdmmyyyy(new Date()));

  const load = useCallback(async (showSpinner = false, force = false) => {
    const today = new Date();
    // 1. Fast cache check: if not forcing, check if today's schedule is already cached for current config
    if (!force) {
      const cached = getCachedPrayerTimes(
        effectiveLocation,
        settings.methodId,
        today,
        settings.madhab
      );
      if (cached) {
        setData(cached);
        setLoading(false);
        setError(null);
        return; // Valid cache exists for today's config; skip network entirely!
      }
    }

    // 2. Fast offline check: if offline and not forcing, check cache or show offline state immediately (0ms)
    if (!force && !isAppOnline()) {
      setLoading(false);
      if (!data) {
        setError(prayerTimesOfflineError);
      }
      return;
    }

    // 3. Needs fetch: only show spinner if we don't already have data to display
    if (showSpinner && !data) {
      setLoading(true);
    }
    setError(null);

    try {
      const result = await Promise.race([
        fetchPrayerTimes(effectiveLocation, settings.methodId, today, {
          force,
          madhab: settings.madhab,
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Prayer times load timed out')), 6000)
        ),
      ]);
      setData(result);
      setError(null);
    } catch (err: any) {
      // Check cache one more time in case it exists
      const fallbackCached = getCachedPrayerTimes(
        effectiveLocation,
        settings.methodId,
        today,
        settings.madhab
      );
      if (fallbackCached) {
        setData(fallbackCached);
        setError(null);
      } else if (!data) {
        setError(prayerTimesOfflineError);
      }
    } finally {
      setLoading(false);
    }
  }, [effectiveLocation, settings.methodId, settings.madhab, data]);

  // Initial mount & config change effect: fetch only when config changed or cache missing
  useEffect(() => {
    load(true, false);
  }, [
    effectiveLocation.latitude,
    effectiveLocation.longitude,
    effectiveLocation.label,
    settings.methodId,
    settings.madhab,
    settings.locationMode,
  ]);

  // Calendar date rollover effect: when midnight passes, load new day's schedule
  useEffect(() => {
    const todayStr = todayDdmmyyyy(now);
    if (lastDateStrRef.current !== todayStr) {
      lastDateStrRef.current = todayStr;
      load(false, false);
    }
  }, [now, load]);

  // Connectivity restored effect: if we were offline without data, fetch now
  useEffect(() => {
    if (refreshKey > 0 && !data) {
      load(true, false);
    }
  }, [refreshKey, data, load]);

  usePrayerWatcher(data, settings.remindersEnabled);

  useEffect(() => {
    configureAudio();
  }, []);

  const next = useMemo(() => (data ? getNextPrayer(data.timings, now) : null), [data, now]);

  const countdownRemaining = useMemo(() => {
    const hm = next ? next.time : data?.timings.Fajr;
    if (!hm) return '';
    const nowMin = now.getHours() * 60 + now.getMinutes();
    let targetMin = parseHm(hm);
    if (targetMin <= nowMin) targetMin += 1440;
    const diffMs = (targetMin - nowMin) * 60000 - now.getSeconds() * 1000;
    return formatCountdown(diffMs);
  }, [next, now, data]);

  const progress = useMemo(() => {
    if (!data) return 0;
    const nowMin = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
    let prevMin = 0;
    let nextMin = 0;

    if (next) {
      if (next.index > 0) {
        const prevKey = PRAYER_ORDER[next.index - 1].key;
        prevMin = parseHm(data.timings[prevKey] || '00:00');
        nextMin = parseHm(next.time);
      } else {
        prevMin = parseHm(data.timings.Isha || '00:00') - 1440;
        nextMin = parseHm(next.time);
      }
    } else {
      prevMin = parseHm(data.timings.Isha || '00:00');
      nextMin = parseHm(data.timings.Fajr || '00:00') + 1440;
    }

    const diff = nextMin - prevMin;
    if (diff <= 0) return 0;
    const fraction = (nowMin - prevMin) / diff;
    return Math.min(1, Math.max(0, fraction));
  }, [data, next, now]);

  const dayOfYear = useMemo(() => getDayOfYear(now), [now]);

  const nameOfDay = useMemo(() => {
    const idx = Math.abs(dayOfYear) % NAMES_99.length;
    return NAMES_99[idx];
  }, [dayOfYear]);

  const completedCount = Object.values(completed).filter(Boolean).length;
  const lastCompletedPrayer = useMemo(() => {
    const prayerKeys = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
    for (let i = prayerKeys.length - 1; i >= 0; i--) {
      if (completed[prayerKeys[i]]) return prayerKeys[i];
    }
    return null;
  }, [completed]);

  const { duas: afterPrayerDuas } = useAfterPrayerDuas();
  const allAfterPrayerDuas = useMemo(
    () => getAllAfterPrayerDuas(afterPrayerDuas, lastCompletedPrayer),
    [afterPrayerDuas, lastCompletedPrayer]
  );

  const isCompact = useMemo(() => width <= 380, [width]);
  const duaCardWidth = useMemo(() => Math.min(width - 48, 620), [width]);
  const duaGap = 12;
  const duaSnapInterval = duaCardWidth + duaGap;

  const currentSegment = useMemo((): PrayerSegment => {
    if (!data) return 'Dhuhr';
    if (!next) return 'Isha';
    if (next.index === 0) return 'Isha';
    const prevKey = PRAYER_ORDER[next.index - 1].key as PrayerSegment;
    return prevKey;
  }, [data, next]);

  const weekdayHijriLabel = useMemo(() => {
    if (!data) return '';
    const weekday = now.toLocaleDateString('en-US', { weekday: 'long' });
    return `${weekday} · ${data.hijri.day} ${data.hijri.monthEn}`;
  }, [data, now]);

  const nextArabicName = useMemo(() => {
    if (!next) return PRAYER_ARABIC.Fajr;
    return PRAYER_ARABIC[next.name] || 'الفَجْر';
  }, [next]);

  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    checkReducedMotion(setReducedMotion);
  }, []);

  const scrollY = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef<ScrollView>(null);
  const [isScrolled, setIsScrolled] = useState(false);

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = e.nativeEvent.contentOffset.y;
      if (y > 40 && !isScrolled) {
        setIsScrolled(true);
      } else if (y <= 40 && isScrolled) {
        setIsScrolled(false);
      }
    },
    [isScrolled]
  );

  // 1. Greeting header (large Today + Good morning) fades & shifts up (0-240px)
  const greetingOpacity = scrollY.interpolate({
    inputRange: [0, 240],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });
  const greetingTranslateY = scrollY.interpolate({
    inputRange: [0, 240],
    outputRange: [0, reducedMotion ? 0 : -14],
    extrapolate: 'clamp',
  });

  // 2. Prayer Hero card container subtle scale compression (0-300px)
  const heroCardScale = scrollY.interpolate({
    inputRange: [0, 300],
    outputRange: [1, reducedMotion ? 1 : 0.96],
    extrapolate: 'clamp',
  });

  // 3. Hero Date eyebrow (Weekday · Hijri date): opacity 1→0 (0-200px)
  const eyebrowOpacity = scrollY.interpolate({
    inputRange: [0, 200],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });
  const eyebrowTranslateY = scrollY.interpolate({
    inputRange: [0, 200],
    outputRange: [0, reducedMotion ? 0 : -8],
    extrapolate: 'clamp',
  });

  // 4. Arabic prayer name: opacity 1→0 (0-220px)
  const arabicOpacity = scrollY.interpolate({
    inputRange: [0, 220],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });
  const arabicTranslateY = scrollY.interpolate({
    inputRange: [0, 220],
    outputRange: [0, reducedMotion ? 0 : -10],
    extrapolate: 'clamp',
  });

  // 5. English prayer name: opacity 1→0 (0-240px)
  const englishOpacity = scrollY.interpolate({
    inputRange: [0, 240],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });
  const englishTranslateY = scrollY.interpolate({
    inputRange: [0, 240],
    outputRange: [0, reducedMotion ? 0 : -12],
    extrapolate: 'clamp',
  });

  // 6. Big time: translateY 0→-30, scale 1→0.88, opacity 1→0 (0-300px)
  const bigTimeOpacity = scrollY.interpolate({
    inputRange: [0, 300],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });
  const bigTimeTranslateY = scrollY.interpolate({
    inputRange: [0, 300],
    outputRange: [0, reducedMotion ? 0 : -30],
    extrapolate: 'clamp',
  });
  const bigTimeScale = scrollY.interpolate({
    inputRange: [0, 300],
    outputRange: [1, reducedMotion ? 1 : 0.88],
    extrapolate: 'clamp',
  });

  // 7. Hero countdown (big): fade/translate up into compact bar (40-280px)
  const countdownOpacity = scrollY.interpolate({
    inputRange: [40, 280],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });
  const countdownTranslateY = scrollY.interpolate({
    inputRange: [40, 280],
    outputRange: [0, reducedMotion ? 0 : -20],
    extrapolate: 'clamp',
  });

  // 8. Hero transition hint: opacity 1→0 (0-200px)
  const transitionOpacity = scrollY.interpolate({
    inputRange: [0, 200],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  // 9. Compact bar: cross-fades IN (opacity 0→1 over 200-300px), slight translateY (-8→0)
  const compactBarOpacity = scrollY.interpolate({
    inputRange: [200, 300],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  const compactBarTranslateY = scrollY.interpolate({
    inputRange: [200, 300],
    outputRange: [reducedMotion ? 0 : -8, 0],
    extrapolate: 'clamp',
  });

  if (loading) {
    return (
      <View style={[styles.root, { backgroundColor: colors.bgBase }]}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.content,
            { paddingBottom: 40 },
          ]}
        >
          <SectionHeader
            eyebrow="Today"
            title={gettingPrayerTimes}
            subtitle={preparingDashboard}
            style={styles.sectionHeader}
          />
          <CountdownCardSkeleton />
          <Card style={styles.prayerListCard} padded={false}>
            {PRAYER_ORDER.map((_, i) => (
              <View key={i}>
                {i > 0 && <Hairline />}
                <PrayerRowSkeleton />
              </View>
            ))}
            <Hairline />
            <View style={styles.trackerSkeletonFooter}>
              <Skeleton width="100" height={16} borderRadius={4} />
              <Skeleton width="75" height={16} borderRadius={4} />
            </View>
          </Card>
          <Card style={styles.cardSection}>
            <View style={styles.cardHeaderRow}>
              <Skeleton width="120" height={11} borderRadius={4} />
            </View>
            <Hairline style={styles.cardDivider} />
            <Skeleton width="100%" height={80} borderRadius={12} />
          </Card>
          <Card style={styles.cardSection}>
            <View style={styles.cardHeaderRow}>
              <Skeleton width="120" height={11} borderRadius={4} />
            </View>
            <Hairline style={styles.cardDivider} />
            <Skeleton width="100%" height={80} borderRadius={12} />
          </Card>
          <Card style={styles.cardSection}>
            <View style={styles.cardHeaderRow}>
              <Skeleton width="120" height={11} borderRadius={4} />
            </View>
            <Hairline style={styles.cardDivider} />
            <Skeleton width="100%" height={70} borderRadius={12} />
          </Card>
        </ScrollView>
      </View>
    );
  }

  if (!data) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bgBase, padding: 24 }]}>
        <Ionicons name="cloud-offline-outline" size={iconSizes.emptyState} color={colors.textMuted} style={{ marginBottom: 16 }} />
        <Text style={[styles.errorText, { color: colors.textPrimary, textAlign: 'center', marginBottom: 8, fontSize: 16, fontWeight: '600' }]}>
          {t(error || prayerTimesOfflineError)}
        </Text>
        <Text style={{ color: colors.textMuted, textAlign: 'center', marginBottom: 20, fontSize: 14 }}>
          {t(prayerTimesNeedsConnection)}
        </Text>
        <TouchableOpacity
          style={{
            backgroundColor: colors.accent,
            paddingHorizontal: 20,
            paddingVertical: 10,
            borderRadius: 8,
          }}
          onPress={() => {
            haptic('light');
            load(true, true);
          }}
          accessibilityRole="button"
          accessibilityLabel="Retry loading prayer times"
        >
          <Text style={{ color: colors.onAccent, fontWeight: '600', fontSize: 14 }}>{t(retry)}</Text>
        </TouchableOpacity>
      </View>
    );
  }


  const hijriLabel = `${data.hijri.day} ${data.hijri.monthEn} ${data.hijri.year}`;
  const locLabel = effectiveLocation.label;
  const isFallback = settings.locationMode === 'auto' && !gpsLocation;
  const locDisplay = isFallback
    ? `Using manual location (${settings.manualLocation.label || 'Dubai, UAE'})`
    : locLabel;
  const fmt = settings.timeFormat;
  const hour = now.getHours();
  const timeGreeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <View style={[styles.root, { backgroundColor: colors.bgBase }]}>
      {/* Part 10: full-screen time-of-day phase wash (subtle, gradual crossfade) */}
      <PhaseWash segment={currentSegment} intensity={0.35} />

      {/* Pinned persistent compact prayer bar on scroll */}
      <Animated.View
        style={[
          styles.pinnedBarWrap,
          {
            opacity: compactBarOpacity,
            transform: [{ translateY: compactBarTranslateY }],
          },
        ]}
        pointerEvents={isScrolled ? 'auto' : 'none'}
      >
        <CompactPrayerBar
          prayerName={next ? next.name : 'Fajr'}
          prayerTime={formatTime(next ? next.time : data.timings.Fajr, fmt)}
          targetTime={next ? next.time : data.timings.Fajr}
          onPress={() => {
            haptic('light');
            scrollRef.current?.scrollTo({ y: 0, animated: true });
          }}
          onExpire={handlePrayerExpire}
        />
      </Animated.View>

      <Animated.ScrollView
        ref={scrollRef as any}
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: 40 },
        ]}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          {
            // ponytail: JS driver for the scroll event — native-driven
            // Animated.event on a Fabric ScrollView can fail to commit content
            // below the initial viewport (blank cards, container visible).
            useNativeDriver: false,
            listener: handleScroll,
          }
        )}
      >
        {/* Section Header: Eyebrow Today + Greeting (animates on scroll) */}
        <Animated.View
          style={{
            opacity: greetingOpacity,
            transform: [{ translateY: greetingTranslateY }],
          }}
        >
<SectionHeader
      eyebrow="Today"
      title={t('Assalam o Alaikum')}
      subtitle={`${locDisplay} · ${hijriLabel} (${data.readable || data.gregorian})`}
      style={styles.sectionHeader}
    />
            <Text style={[
              { fontFamily: 'Manrope_400Regular', fontSize: 14, color: colors.textSecondary, marginTop: 4 },
            ]}>
              {t(timeGreeting)}
            </Text>
        </Animated.View>

        {/* Location Permission Note: only when no usable saved/manual location exists AND not dismissed this session */}
        {!hasUsableLocation && !locationDismissed && settings.locationMode === 'auto' && (locStatus === 'denied' || locStatus === 'unavailable') && (
          <LocationPermissionNote
            status={locStatus}
            compact
            onEnable={async () => {
              const loc = await requestLocation(true);
              if (loc) {
                setAutoLocation(loc, Date.now());
              }
            }}
            onChooseCity={onOpenCities}
            onDismiss={() => setLocationDismissed(true)}
            loading={locLoading}
            fallbackCity={settings.manualLocation?.label || 'Makkah, Saudi Arabia'}
          />
        )}

        {/* 1. Prayer Hero (Visual Centerpiece with time-of-day atmosphere & smart countdown) */}
        <Animated.View style={{ transform: [{ scale: heroCardScale }] }}>
          <Card style={styles.prayerHeroCard} padded={false}>
            <PrayerHeroAtmosphere
              segment={currentSegment}
              size={isCompact ? 280 : 340}
            />
            <View style={styles.heroContent}>
              {/* Line 1: Weekday · Hijri date */}
              <Animated.View
                style={{
                  opacity: eyebrowOpacity,
                  transform: [{ translateY: eyebrowTranslateY }],
                }}
              >
                <Text style={[styles.heroEyebrow, { color: colors.textMuted }]}>
                  {weekdayHijriLabel}
                </Text>
              </Animated.View>

              {/* Line 2: Arabic prayer name */}
              <Animated.View
                style={{
                  opacity: arabicOpacity,
                  transform: [{ translateY: arabicTranslateY }],
                }}
              >
                <ArabicText
                  size={isCompact ? 26 : 30}
                  align="center"
                  style={styles.heroArabicName}
                >
                  {nextArabicName}
                </ArabicText>
              </Animated.View>

              {/* Line 3: English name */}
              <Animated.View
                style={{
                  opacity: englishOpacity,
                  transform: [{ translateY: englishTranslateY }],
                }}
              >
                <Text style={[styles.heroEnglishName, { color: colors.textPrimary }]}>
                  {t(next ? next.name : 'Fajr')}
                </Text>
              </Animated.View>

              {/* Line 4: Very large TIME */}
              <Animated.View
                style={{
                  opacity: bigTimeOpacity,
                  transform: [
                    { translateY: bigTimeTranslateY },
                    { scale: bigTimeScale },
                  ],
                }}
              >
                <Text
                  style={[
                    styles.heroTime,
                    {
                      color: colors.textPrimary,
                      fontSize: isCompact ? 58 : 68,
                      lineHeight: isCompact ? 64 : 74,
                    },
                  ]}
                >
                  {formatTime(next ? next.time : data.timings.Fajr, fmt)}
                </Text>
              </Animated.View>

              {/* Line 5: Tabular figures countdown with digit transitions */}
              <Animated.View
                style={{
                  opacity: countdownOpacity,
                  transform: [{ translateY: countdownTranslateY }],
                }}
              >
                <View style={styles.heroCountdownWrap}>
                  <PrayerCountdown
                    targetTime={next ? next.time : data.timings.Fajr}
                    color={colors.accent}
                    separatorColor={colors.textMuted}
                    fontSize={18}
                    onExpire={handlePrayerExpire}
                  />
                </View>
              </Animated.View>

              {/* Line 6: Divider + transition hint */}
              <Animated.View style={{ opacity: transitionOpacity }}>
                <View style={styles.heroTransitionWrap}>
                  <View
                    style={[styles.heroDivider, { backgroundColor: colors.borderSubtle }]}
                  />
                  <Text style={[styles.heroTransitionText, { color: colors.textMuted }]}>
                    {t(currentSegment)}{' '}
                    <Text style={{ color: colors.accent }}>{isRTL() ? '←' : '→'}</Text>{' '}
                    {t(next ? next.name : 'Fajr')}
                  </Text>
                </View>
              </Animated.View>
            </View>
          </Card>
        </Animated.View>

        {/* 2. Prayer Timeline with status dots and integrated Salah tracker footer */}
        <PrayerTimeline
          timings={data.timings}
          completed={completed}
          onTogglePrayer={togglePrayer}
          currentPrayerSegment={currentSegment}
          nextPrayerName={next ? next.name : 'Fajr'}
          progressFraction={progress}
          timeFormat={fmt}
          streak={streak}
        />

        {/* 3. One "Continue Reading" Primary Action Surface */}
        <ContinueReadingCard
          onOpenReader={handleOpenReader}
          onOpenQuranTab={handleOpenQuranTab}
          style={{ marginBottom: 20 }}
        />

        {/* 4. Quick Actions Control Strip */}
        <QuickActionsStrip
          onOpenQibla={onOpenQibla}
          onOpenDuas={onOpenDuas}
          onOpenHadith={onOpenHadith}
          onOpenTasbih={onOpenTasbih}
        />

        {/* 5. Daily Content Rail (Ayah / Hadith / 99 Names horizontal swipe discovery rail) */}
        <DailyContentRail
          ayah={ayah}
          hadith={hadith}
          nameOfDay={nameOfDay}
          onRefreshAyah={refreshAyah}
          onRefreshHadith={refreshHadith}
          onOpenAyah={handleOpenReader}
          onOpenHadith={onOpenHadith}
          onOpenNames={onOpenNames}
        />

        {/* 6. Dua After Prayer — swipeable carousel showing all after-prayer duas */}
        <View style={styles.duaRailContainer}>
          {/* Header Row: Eyebrow + context + pagination */}
          <View style={styles.duaRailHeaderRow}>
            <View style={styles.duaRailHeaderLeft}>
              <Text style={[styles.duaAfterPrayerEyebrow, { color: colors.accent }]}>
                {t('Dua After Prayer')}
              </Text>
              <Text style={[styles.duaAfterPrayerContext, { color: colors.textMuted }]}>
                {lastCompletedPrayer ? `${t('For')} ${t(lastCompletedPrayer)}` : t('Authentic Adhkar')}
              </Text>
            </View>

            {/* Pagination indicator: 1 of N + dots */}
            <View style={styles.duaPaginationWrap}>
              <Text style={[styles.duaPaginationText, { color: colors.textMuted }]}>
                {activeDuaIndex + 1} of {allAfterPrayerDuas.length}
              </Text>
              <View style={styles.duaDotsRow}>
                {allAfterPrayerDuas.map((_, i) => {
                  const isActive = i === activeDuaIndex;
                  return (
                    <View
                      key={i}
                      style={[
                        styles.duaDot,
                        {
                          backgroundColor: isActive ? colors.accent : colors.borderSubtle,
                          width: isActive ? 12 : 5,
                        },
                      ]}
                    />
                  );
                })}
              </View>
            </View>
          </View>

          {/* Horizontal Swipe Rail */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={duaSnapInterval}
            snapToAlignment="center"
            decelerationRate="fast"
            nestedScrollEnabled
            contentContainerStyle={[styles.duaRailScrollContent, hScrollRTLStyle()]}
            onScroll={(event) => {
              const offsetX = event.nativeEvent.contentOffset.x;
              const index = Math.round(offsetX / duaSnapInterval);
              if (index !== activeDuaIndex && index >= 0 && index < allAfterPrayerDuas.length) {
                setActiveDuaIndex(index);
              }
            }}
            scrollEventThrottle={16}
          >
            {allAfterPrayerDuas.map((item, idx) => {
              const isExpanded = !!expandedDuaIds[item.id];
              return (
                <View
                  key={item.id || idx}
                  style={[styles.duaCardSlide, { width: duaCardWidth }]}
                >
                  <Card style={styles.duaAfterPrayerCard} padded={false}>
                    <TouchableOpacity
                      activeOpacity={0.88}
                      style={styles.duaAfterPrayerHeader}
                      onPress={() => {
                        haptic('light');
                        setExpandedDuaIds((prev) => ({ ...prev, [item.id]: !prev[item.id] }));
                      }}
                      accessibilityRole="button"
                      accessibilityState={{ expanded: isExpanded }}
                      accessibilityLabel={`Dua ${idx + 1} of ${allAfterPrayerDuas.length}. Tap to ${isExpanded ? 'collapse' : 'expand'}.`}
                    >
                      <View style={styles.duaBadgeRow}>
                        <View
                          style={[
                            styles.duaNumberBadge,
                            { backgroundColor: colors.accentDim },
                          ]}
                        >
                          <Text style={[styles.duaNumberBadgeText, { color: colors.accent }]}>
                            {idx + 1}
                          </Text>
                        </View>
                        {lastCompletedPrayer && idx === 0 && (
                          <View
                            style={[
                              styles.duaForPrayerTag,
                              {
                                backgroundColor: colors.bgBase,
                                borderColor: colors.borderSubtle,
                              },
                            ]}
                          >
                            <Text style={[styles.duaForPrayerTagText, { color: colors.accent }]}>
                              {t('For')} {t(lastCompletedPrayer)}
                            </Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.duaExpandBtn}>
                        <Text style={[styles.duaExpandBtnText, { color: colors.textMuted }]}>
                          {isExpanded ? t('Less') : t('More')}
                        </Text>
                        <Ionicons
                          name={isExpanded ? 'chevron-up-outline' : 'chevron-down-outline'}
                          size={16}
                          color={colors.textMuted}
                        />
                      </View>
                    </TouchableOpacity>

                    <View style={styles.duaAfterPrayerContent}>
                      <ArabicText
                        size={isCompact ? 20 : 22}
                        align="right"
                        style={styles.duaAfterPrayerArabic}
                        numberOfLines={isExpanded ? undefined : 3}
                      >
                        {item.arabic}
                      </ArabicText>

                      {isExpanded ? (
                        <View style={styles.duaExpandedDetails}>
                          <Text
                            style={[
                              styles.duaAfterPrayerTransliteration,
                              { color: colors.textSecondary },
                            ]}
                          >
                            {item.transliteration}
                          </Text>
                          <Text
                            style={[
                              styles.duaAfterPrayerTranslation,
                              { color: colors.textPrimary },
                            ]}
                          >
                            {item.translation}
                          </Text>
                          {(item.reference || item.source) ? (
                            <View
                              style={[
                                styles.duaRefRow,
                                { borderTopColor: colors.borderSubtle },
                              ]}
                            >
                              <Ionicons name="book-outline" size={11} color={colors.textMuted} />
                              <Text
                                style={[styles.duaAfterPrayerRef, { color: colors.textMuted }]}
                              >
                                {item.reference || item.source}
                              </Text>
                            </View>
                          ) : null}
                        </View>
                      ) : (
                        <Text
                          style={[
                            styles.duaAfterPrayerTranslation,
                            { color: colors.textSecondary },
                          ]}
                          numberOfLines={2}
                        >
                          {item.translation}
                        </Text>
                      )}
                    </View>
                  </Card>
                </View>
              );
            })}
          </ScrollView>
        </View>
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  pinnedBarWrap: {
    position: 'absolute',
    top: 10,
    left: 20,
    right: 20,
    zIndex: 100,
    elevation: 8,
  },
  scroll: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { fontFamily: 'Manrope_400Regular', fontSize: 14 },
  content: { padding: 24, gap: 24 },
  patternTop: { top: -40, right: -60 },
  sectionHeader: { marginBottom: 20 },
  prayerHeroCard: {
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  cardWithPattern: {
    position: 'relative',
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  heroContent: {
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroEyebrow: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
    letterSpacing: 2,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginBottom: 6,
  },
  heroArabicName: {
    lineHeight: 40,
    textAlign: 'center',
    marginBottom: 2,
  },
  heroEnglishName: {
    fontFamily: isRTL() ? 'Amiri_700Bold' : 'InstrumentSerif_400Regular',
    fontSize: 34,
    lineHeight: 38,
    textAlign: 'center',
    letterSpacing: isRTL() ? 0 : 0.5,
  },
  heroTime: {
    fontFamily: 'InstrumentSerif_400Regular',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 8,
  },
  heroCountdownWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  heroTransitionWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    width: '100%',
  },
  heroDivider: {
    width: 44,
    height: 1,
    marginBottom: 8,
  },
  heroTransitionText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  prayerListCard: {
    marginBottom: 20,
    borderRadius: 14,
    overflow: 'hidden',
  },
  trackerSkeletonFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  cardSection: {
    marginBottom: 24,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionEyebrow: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  headerActionBtn: {
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  headerActionText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
  },
  cardDivider: {
    marginBottom: 14,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  nameLeft: {
    flex: 1,
  },
  nameTranslit: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 18,
    marginBottom: 2,
  },
  nameMeaning: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
    lineHeight: 18,
  },
  duaRailContainer: {
    gap: 12,
    marginBottom: 20,
  },
  duaRailHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  duaRailHeaderLeft: {
    flex: 1,
  },
  duaPaginationWrap: {
    alignItems: 'flex-end',
    gap: 4,
  },
  duaPaginationText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
    letterSpacing: 0.4,
  },
  duaDotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  duaDot: {
    height: 4,
    borderRadius: 2,
  },
  duaRailScrollContent: {
    gap: 12,
    paddingRight: 4,
  },
  duaCardSlide: {
    borderRadius: 16,
  },
  duaAfterPrayerCard: {
    position: 'relative',
    overflow: 'hidden',
    padding: 16,
    borderRadius: 16,
  },
  duaAfterPrayerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    zIndex: 2,
  },
  duaBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  duaNumberBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  duaNumberBadgeText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 11,
  },
  duaForPrayerTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  duaForPrayerTagText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
  },
  duaExpandBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  duaExpandBtnText: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
  },
  duaAfterPrayerEyebrow: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  duaAfterPrayerContext: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
  },
  duaAfterPrayerContent: {
    gap: 8,
    zIndex: 1,
  },
  duaAfterPrayerArabic: {
    lineHeight: 36,
  },
  duaExpandedDetails: {
    gap: 8,
    marginTop: 4,
  },
  duaRefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 8,
    marginTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  duaAfterPrayerTransliteration: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
    lineHeight: 20,
  },
  duaAfterPrayerTranslation: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
    lineHeight: 20,
  },
  duaAfterPrayerRef: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
  },
  methodNote: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
});