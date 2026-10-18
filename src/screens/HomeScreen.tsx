import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  TouchableOpacity,
  useWindowDimensions,
  Animated,
  Platform,
  AccessibilityInfo,
  NativeSyntheticEvent,
  NativeScrollEvent,
  AppState,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  useTheme,
  getCardShadow,
  getHeroCardShadow,
  getActivePrayerShadow,
} from '../lib/theme';
import { useSettings } from '../lib/settings';
import { useHaptics } from '../lib/haptics';
import { useLocation } from '../lib/useLocation';
import { fetchPrayerTimes, getCachedPrayerTimes, todayDdmmyyyy, DayTimings, getNextPrayer } from '../lib/prayerTimes';
import { formatTime } from '../lib/timeFormat';
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
  isDuaForPrayer,
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
import { ContinueReadingCard } from '../components/ContinueReadingCard';
import { DailyContentRail } from '../components/DailyContentRail';
import { QuickActionsStrip } from '../components/QuickActionsStrip';
import { CompactPrayerBar } from '../components/CompactPrayerBar';
import { hScrollRTLStyle } from '../lib/rtl';
import { LinearGradient } from 'expo-linear-gradient';
import { TabScrollView, TabAnimatedScrollView, useTabScreen } from '../components/layout/TabScreen';
import { HOME_THEME_TOKENS } from '../lib/constants';
import { getFloatingCardShadow } from '../lib/homeThemeTokens';
import { themeTokens } from '../theme/tokens';
import { AppText } from '../components/ui/AppText';

const FIVE_PRAYERS: { key: 'Fajr' | 'Dhuhr' | 'Asr' | 'Maghrib' | 'Isha'; label: string }[] = [
  { key: 'Fajr', label: 'Fajr' },
  { key: 'Dhuhr', label: 'Dhuhr' },
  { key: 'Asr', label: 'Asr' },
  { key: 'Maghrib', label: 'Maghrib' },
  { key: 'Isha', label: 'Isha' },
];

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

function IslamicStar({ isFull, color, size = 18 }: { isFull: boolean; color: string; size?: number }) {
  const half = Math.round(size * 0.72);
  if (isFull) {
    return (
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: half, height: half, backgroundColor: color, borderRadius: 1.5 }} />
        <View
          style={{
            position: 'absolute',
            width: half,
            height: half,
            backgroundColor: color,
            borderRadius: 1.5,
            transform: [{ rotate: '45deg' }],
          }}
        />
      </View>
    );
  }
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: half, height: half, borderWidth: 1.4, borderColor: color, borderRadius: 1.5 }} />
      <View
        style={{
          position: 'absolute',
          width: half,
          height: half,
          borderWidth: 1.4,
          borderColor: color,
          borderRadius: 1.5,
          transform: [{ rotate: '45deg' }],
        }}
      />
    </View>
  );
}

export interface HomeScreenProps {
  onOpenNames?: () => void;
  onOpenQuran?: (surah?: number, ayah?: number, page?: number) => void;
  onOpenReader?: (surah: number, ayah: number, page?: number) => void;
  onOpenQuranTab?: () => void;
  onOpenHadith?: () => void;
  onOpenQibla?: () => void;
  onOpenDuas?: () => void;
  onOpenTasbih?: () => void;
  onOpenCities?: () => void;
  isActive?: boolean;
}

const HomeScreen = React.memo(function HomeScreen({
  onOpenNames,
  onOpenQuran,
  onOpenReader,
  onOpenQuranTab,
  onOpenHadith,
  onOpenQibla,
  onOpenDuas,
  onOpenTasbih,
  onOpenCities,
  isActive = true,
}: HomeScreenProps) {
  const { mode } = useTheme();
  const { padTop, padBottom, safeTop } = useTabScreen();
  const homeTokens = HOME_THEME_TOKENS[mode];
  const { settings, setAutoLocation } = useSettings();
  const { haptic } = useHaptics();

  const handleOpenReader = useCallback(
    (surah: number, ayah?: number, page?: number) => {
      if (onOpenReader) {
        onOpenReader(surah, ayah ?? 1, page);
      } else if (onOpenQuran) {
        onOpenQuran(surah, ayah, page);
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

  const [data, setData] = useState<DayTimings | null>(() => {
    return getCachedPrayerTimes(
      effectiveLocation,
      settings.methodId,
      new Date(),
      settings.madhab
    );
  });
  const [loading, setLoading] = useState<boolean>(() => {
    return !getCachedPrayerTimes(
      effectiveLocation,
      settings.methodId,
      new Date(),
      settings.madhab
    );
  });
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(new Date());
  const [completed, setCompleted] = useState<Record<string, boolean>>(() => {
    const currentDate = new Date();
    const iso = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
    return getSalahEntries(iso);
  });
  const [salahHistory, setSalahHistory] = useState<Record<string, Record<string, boolean>>>(() => {
    return getSalahHistory(30);
  });
  const [streak, setStreak] = useState<number>(() => {
    return computeStreak(getSalahHistory(30));
  });
  const [activeDuaIndex, setActiveDuaIndex] = useState(0);
  const [expandedDuaIds, setExpandedDuaIds] = useState<Record<string, boolean>>({});

  const { ayah, refresh: refreshAyah } = useAyahOfDay();
  const { hadith, refresh: refreshHadith } = useHadithOfDay();

  function togglePrayer(prayer: string) {
    const currentDate = new Date();
    const iso = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
    const nextVal = !completed[prayer];
    markSalahCompleted(iso, prayer, nextVal);
    setCompleted((prev) => ({ ...prev, [prayer]: nextVal }));
    const history = getSalahHistory(30);
    setSalahHistory(history);
    setStreak(computeStreak(history));
    if (nextVal) {
      haptic('success');
    } else {
      haptic('light');
    }
  }

  const starDays = useMemo(() => {
    const days: { key: string; label: string; count: number; isFull: boolean; isToday: boolean }[] = [];
    const weekdayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const isToday = i === 0;
      const dayEntries = isToday ? completed : (salahHistory[iso] || {});
      const salahKeys = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
      const count = salahKeys.filter((k) => !!dayEntries[k]).length;
      const isFull = count >= 5;
      const dayOfWeek = (d.getDay() + 6) % 7; // Monday = 0 ... Sunday = 6
      days.push({
        key: iso,
        label: weekdayLabels[dayOfWeek],
        count,
        isFull,
        isToday,
      });
    }
    return days;
  }, [now, completed, salahHistory]);

  const [isAppActive, setIsAppActive] = useState(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      return !document.hidden;
    }
    return AppState.currentState === 'active';
  });

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      setIsAppActive(state === 'active');
    });
    let handleVisibility: (() => void) | undefined;
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      handleVisibility = () => {
        setIsAppActive(!document.hidden);
      };
      document.addEventListener('visibilitychange', handleVisibility);
    }
    return () => {
      sub.remove();
      if (handleVisibility && typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibility);
      }
    };
  }, []);

  const isHomeVisible = Boolean(isActive && isAppActive);

  useEffect(() => {
    if (!isHomeVisible) return;
    const syncTimer = setTimeout(() => setNow(new Date()), 0);
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => {
      clearTimeout(syncTimer);
      clearInterval(id);
    };
  }, [isHomeVisible]);

  // Real-time prayer rollover: when the countdown hits zero, refresh `now`
  // immediately so `next`/`currentSegment`/compact bar switch to the next prayer
  // without waiting for the 30s clock tick.
  const handlePrayerExpire = useCallback(() => {
    setNow(new Date());
  }, []);

  const lastDateStrRef = useRef<string>(todayDdmmyyyy(new Date()));
  const dataRef = useRef(data);
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

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
      if (!dataRef.current) {
        setError(prayerTimesOfflineError);
      }
      return;
    }

    // 3. Needs fetch: only show spinner if we don't already have data to display
    if (showSpinner && !dataRef.current) {
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
    } catch {
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
      } else if (!dataRef.current) {
        setError(prayerTimesOfflineError);
      }
    } finally {
      setLoading(false);
    }
  }, [effectiveLocation, settings.methodId, settings.madhab]);

  // Initial mount & config change effect: fetch only when config changed or cache missing
  useEffect(() => {
    let isMounted = true;
    const run = async () => {
      await Promise.resolve();
      if (isMounted) {
        load(true, false);
      }
    };
    void run();
    return () => {
      isMounted = false;
    };
  }, [load]);

  // Calendar date rollover effect: when midnight passes, load new day's schedule
  useEffect(() => {
    const todayStr = todayDdmmyyyy(now);
    if (lastDateStrRef.current !== todayStr) {
      lastDateStrRef.current = todayStr;
      load(false, false);
      const iso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      setCompleted(getSalahEntries(iso));
      const history = getSalahHistory(30);
      setSalahHistory(history);
      setStreak(computeStreak(history));
    }
  }, [now, load]);

  // Connectivity restored effect: if we were offline without data, fetch now
  useEffect(() => {
    let isMounted = true;
    if (refreshKey > 0 && !data) {
      const run = async () => {
        await Promise.resolve();
        if (isMounted) {
          load(true, false);
        }
      };
      void run();
    }
    return () => {
      isMounted = false;
    };
  }, [refreshKey, data, load]);

  usePrayerWatcher(data, settings.remindersEnabled);

  useEffect(() => {
    configureAudio();
  }, []);

  const next = useMemo(() => (data ? getNextPrayer(data.timings, now) : null), [data, now]);

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
      } else if (next.isTomorrow || nowMin >= parseHm(data.timings.Isha || '00:00')) {
        prevMin = parseHm(data.timings.Isha || '00:00');
        nextMin = parseHm(next.time) + 1440;
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
  const currentSegment = useMemo((): PrayerSegment => {
    if (!data) return 'Dhuhr';
    if (!next) return 'Isha';
    if (next.index === 0) return 'Isha';
    const prevKey = PRAYER_ORDER[next.index - 1].key as PrayerSegment;
    return prevKey;
  }, [data, next]);

  const lastCompletedPrayer = useMemo(() => {
    const prayerKeys = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
    if (completed[currentSegment]) return currentSegment;
    for (let i = prayerKeys.length - 1; i >= 0; i--) {
      if (completed[prayerKeys[i]]) return prayerKeys[i];
    }
    return null;
  }, [completed, currentSegment]);

  const targetPrayer = useMemo(() => {
    return currentSegment || lastCompletedPrayer;
  }, [currentSegment, lastCompletedPrayer]);

  const { duas: afterPrayerDuas } = useAfterPrayerDuas();
  const allAfterPrayerDuas = useMemo(
    () => getAllAfterPrayerDuas(afterPrayerDuas, targetPrayer),
    [afterPrayerDuas, targetPrayer]
  );

  const hasSpecificPrayerDuas = useMemo(
    () => (targetPrayer ? allAfterPrayerDuas.some((d) => isDuaForPrayer(d, targetPrayer)) : false),
    [allAfterPrayerDuas, targetPrayer]
  );

  const isCompact = useMemo(() => width <= 380, [width]);
  const [duaRailWidth, setDuaRailWidth] = useState(0);
  const effectiveDuaWidth = duaRailWidth || Math.max(260, width - 48);
  const duaCardWidth = useMemo(() => Math.min(effectiveDuaWidth, 620), [effectiveDuaWidth]);
  const duaGap = 12;
  const duaSnapInterval = duaCardWidth + duaGap;

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

  const [scrollY] = useState(() => new Animated.Value(0));
  const scrollRef = useRef<ScrollView>(null);
  const [isScrolled, setIsScrolled] = useState(false);

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const nextIsScrolled = e.nativeEvent.contentOffset.y > 180;
      setIsScrolled((current) => (current === nextIsScrolled ? current : nextIsScrolled));
    },
    []
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

  // 8. Compact bar: cross-fades IN (opacity 0→1 over 200-300px), slight translateY (-8→0)
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
      <View style={styles.root}>
        <TabScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
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
        </TabScrollView>
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.root}>
        <View style={[styles.center, { flex: 1, padding: 24, paddingTop: padTop + 24, paddingBottom: padBottom + 24 }]}>
          <Ionicons name="cloud-offline-outline" size={iconSizes.emptyState} color={homeTokens.muted} style={{ marginBottom: 16 }} />
        <AppText
          variant="sectionTitle"
          tone="danger"
          style={[styles.errorText, { textAlign: 'center', marginBottom: 8, fontSize: 16, fontWeight: '600' }]}
        >
          {t(error || prayerTimesOfflineError)}
        </AppText>
        <AppText
          variant="subtitle"
          style={{ textAlign: 'center', marginBottom: 20, fontSize: 14 }}
        >
          {t(prayerTimesNeedsConnection)}
        </AppText>
        <TouchableOpacity
          style={{
            backgroundColor: homeTokens.gold,
            paddingHorizontal: 20,
            paddingVertical: 10,
            minHeight: 44,
            minWidth: 44,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 8,
          }}
          onPress={() => {
            haptic('light');
            load(true, true);
          }}
          accessibilityRole="button"
          accessibilityLabel={t('Retry loading prayer times')}
        >
          <AppText
            variant="body"
            tone="onGold"
            style={{ fontWeight: '600', fontSize: 14 }}
          >
            {t(retry)}
          </AppText>
        </TouchableOpacity>
        </View>
      </View>
    );
  }


  const locLabel = effectiveLocation.label;
  const isFallback = settings.locationMode === 'auto' && !gpsLocation;
  const locDisplay = isFallback
    ? `Using manual location (${settings.manualLocation.label || 'Dubai, UAE'})`
    : locLabel;
  const fmt = settings.timeFormat;

  const heroRawTime = next ? next.time : data.timings.Fajr;
  const heroFormatted = formatTime(heroRawTime, fmt);
  const heroParts = heroFormatted.split(' ');
  const heroTimeStr = heroParts[0] || heroFormatted;
  const heroPeriodStr = heroParts[1] || '';

  const prevKey: keyof DayTimings['timings'] = currentSegment;

  const prevTimeRaw = data?.timings[prevKey] || '--:--';
  const prevTimeFmt = formatTime(prevTimeRaw, fmt);
  const nextTimeFmt = formatTime(heroRawTime, fmt);

  return (
    <View style={styles.root}>
      {/* Part 10: full-screen time-of-day phase wash (subtle, gradual crossfade) */}
      {mode === 'ink' && <PhaseWash segment={currentSegment} intensity={0.35} />}

      {/* Pinned persistent compact prayer bar on scroll */}
      <Animated.View
        style={[
          styles.pinnedBarWrap,
          {
            top: (safeTop || 0) + 8,
            opacity: compactBarOpacity,
            transform: [{ translateY: compactBarTranslateY }],
            display: isScrolled ? 'flex' : 'none',
          },
        ]}
        pointerEvents={isScrolled ? 'auto' : 'none'}
        testID="pinned-prayer-bar-wrap"
      >
        <CompactPrayerBar
          prayerName={next ? next.name : 'Fajr'}
          prayerTime={formatTime(next ? next.time : data.timings.Fajr, fmt)}
          targetTime={next ? next.time : data.timings.Fajr}
          isActive={isHomeVisible && isScrolled}
          onPress={() => {
            haptic('light');
            scrollRef.current?.scrollTo({ y: 0, animated: true });
          }}
          onExpire={handlePrayerExpire}
          testID="compact-prayer-bar"
        />
      </Animated.View>

      <TabAnimatedScrollView
        ref={scrollRef as any}
        style={styles.scroll}
        contentContainerStyle={styles.content}
        // Keep native-driven visual interpolation at display refresh rate while
        // limiting JS scroll notifications to the pinned-bar threshold check.
        scrollEventThrottle={64}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          {
            useNativeDriver: true,
            listener: handleScroll,
          }
        )}
      >
        {/* Section Header: Eyebrow Today + Greeting (animates on scroll) */}
        <Animated.View
          style={{
            opacity: greetingOpacity,
            transform: [{ translateY: greetingTranslateY }],
            marginBottom: 14.5,
          }}
        >
          {/* Small uppercase letter-spaced date line */}
          <AppText
            variant="eyebrow"
            style={[
              styles.headerDateLine,
              {
                textAlign: isRTL() ? 'right' : 'left',
              },
            ]}
          >
            {weekdayHijriLabel.toUpperCase()}
          </AppText>

          {/* Large editorial serif greeting */}
          <AppText
            variant="screenTitle"
            style={[
              styles.headerGreetingTitle,
              {
                fontFamily: isRTL() ? 'Amiri_700Bold' : 'InstrumentSerif_400Regular',
                textAlign: isRTL() ? 'right' : 'left',
                fontSize: isCompact ? 36 : 42,
                lineHeight: isCompact ? 40 : 46,
              },
            ]}
          >
            {t('Assalam o Alaikum')}
          </AppText>

          {/* Small muted location line directly below greeting */}
          <AppText
            variant="subtitle"
            style={[
              styles.headerLocationText,
              {
                textAlign: isRTL() ? 'right' : 'left',
                fontSize: 13.5,
                lineHeight: 18,
              },
            ]}
          >
            {locDisplay}
          </AppText>
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

        {/* 1. Next Prayer Hero (~225dp rounded patterned green hero) */}
        <Animated.View
          style={[
            {
              transform: [{ scale: heroCardScale }],
              marginBottom: 14.5,
              borderRadius: 18,
              backgroundColor:
                mode === 'ink'
                  ? themeTokens.ink.heroGradient[0]
                  : HOME_THEME_TOKENS.hero.lightGradient[0],
              ...getHeroCardShadow(mode),
            },
          ]}
        >
          <View
            style={[
              styles.prayerHeroCard,
              {
                borderColor: mode === 'paper' ? 'rgba(212, 163, 89, 0.35)' : 'rgba(196, 160, 86, 0.35)',
                backgroundColor:
                  mode === 'ink'
                    ? themeTokens.ink.heroGradient[0]
                    : HOME_THEME_TOKENS.hero.lightGradient[0],
              },
            ]}
          >
            <LinearGradient
              colors={
                mode === 'ink'
                  ? [...themeTokens.ink.heroGradient]
                  : [...HOME_THEME_TOKENS.hero.lightGradient]
              }
              style={StyleSheet.absoluteFill}
            />
            <View
              style={[
                StyleSheet.absoluteFill,
                styles.heroInsetBorder,
                { borderColor: mode === 'paper' ? HOME_THEME_TOKENS.hero.innerBorder : 'rgba(120, 98, 52, 0.35)' },
              ]}
              pointerEvents="none"
            />
            <PrayerHeroAtmosphere
              segment={currentSegment}
              size={isCompact ? 280 : 340}
            />
            <GeometricPattern variant="tessellation" tileSize={44} color={HOME_THEME_TOKENS.hero.ivory} opacity={mode === 'paper' ? 0.09 : 0.05} />
            <View style={styles.heroInnerContent}>
              {/* Top Row: Left details (Next Prayer, Name, Big Time) + Right (Arabic name) */}
              <View style={styles.heroTopRow}>
                <View style={styles.heroLeftCol}>
                  {/* Eyebrow: Diamond + NEXT PRAYER */}
                  <Animated.View
                    style={{
                      opacity: eyebrowOpacity,
                      transform: [{ translateY: eyebrowTranslateY }],
                    }}
                  >
                    <View style={styles.heroNextPrayerBadge}>
                      <AppText variant="caption" onHero style={styles.heroDiamondGlyph}>◆</AppText>
                      <AppText variant="eyebrow" onHero style={styles.heroNextPrayerLabel}>
                        {t('NEXT PRAYER')}
                      </AppText>
                    </View>
                  </Animated.View>

                  {/* Prayer English Name */}
                  <Animated.View
                    style={{
                      opacity: englishOpacity,
                      transform: [{ translateY: englishTranslateY }],
                    }}
                  >
                    <AppText
                      variant="onHeroTitle"
                      onHero
                      style={[
                        styles.heroPrayerName,
                        {
                          fontFamily: isRTL() ? 'Amiri_700Bold' : 'InstrumentSerif_400Regular',
                          fontSize: isCompact ? 30 : 34,
                          lineHeight: isCompact ? 34 : 38,
                        },
                      ]}
                    >
                      {t(next ? next.name : 'Fajr')}
                    </AppText>
                  </Animated.View>

                  {/* Big Time + Period (PM/AM) */}
                  <Animated.View
                    style={{
                      opacity: bigTimeOpacity,
                      transform: [
                        { translateY: bigTimeTranslateY },
                        { scale: bigTimeScale },
                      ],
                    }}
                  >
                    <View style={styles.heroTimeWrap}>
                      <AppText
                        variant="numeral"
                        style={[
                          styles.heroTimeBig,
                          {
                            fontFamily: isRTL() ? 'Amiri_700Bold' : 'InstrumentSerif_400Regular',
                            fontSize: isCompact ? 38 : 44,
                            lineHeight: isCompact ? 42 : 48,
                            color: homeTokens.gold,
                          },
                        ]}
                      >
                        {heroTimeStr}
                      </AppText>
                      {Boolean(heroPeriodStr) && (
                        <AppText variant="caption" style={[styles.heroTimePeriod, { color: homeTokens.gold }]}>
                          {heroPeriodStr}
                        </AppText>
                      )}
                    </View>
                  </Animated.View>
                </View>

                {/* Right: Large Arabic prayer name */}
                <Animated.View
                  style={{
                    opacity: arabicOpacity,
                    transform: [{ translateY: arabicTranslateY }],
                  }}
                >
                  <ArabicText
                    size={isCompact ? 34 : 40}
                    style={[styles.heroArabicDisplay, { color: homeTokens.gold }]}
                  >
                    {nextArabicName}
                  </ArabicText>
                </Animated.View>
              </View>

              {/* Middle Row: Countdown Boxes + 'until [Prayer]' */}
              <Animated.View
                style={{
                  opacity: countdownOpacity,
                  transform: [{ translateY: countdownTranslateY }],
                }}
              >
                <View style={styles.heroCountdownSection}>
                  <PrayerCountdown
                    targetTime={next ? next.time : data.timings.Fajr}
                    variant="tiles"
                    color={HOME_THEME_TOKENS.hero.ivory}
                    tileBg={mode === 'paper' ? 'rgba(5, 36, 28, 0.75)' : 'rgba(26, 25, 34, 0.75)'}
                    tileBorder={mode === 'paper' ? 'rgba(212, 163, 89, 0.3)' : 'rgba(196, 160, 86, 0.4)'}
                    labelColor={mode === 'ink' ? homeTokens.muted : HOME_THEME_TOKENS.hero.mintLight}
                    separatorColor={homeTokens.gold}
                    isActive={isHomeVisible}
                    onExpire={handlePrayerExpire}
                  />
                  <AppText
                    variant="onHeroSubtitle"
                    onHero
                    style={styles.heroUntilText}
                  >
                    {`${t('until')} ${t(next ? next.name : 'Fajr')}`}
                  </AppText>
                </View>
              </Animated.View>

              {/* Bottom Row: Progress line with knob + prayer labels */}
              <View style={styles.heroProgressSection}>
                <View style={styles.heroProgressTrack}>
                  <View
                    style={[
                      styles.heroProgressFill,
                      {
                        backgroundColor: homeTokens.gold,
                        width: `${Math.round(progress * 100)}%`,
                      },
                    ]}
                  />
                  <View
                    style={[
                      styles.heroProgressKnob,
                      {
                        backgroundColor: homeTokens.gold,
                        left: `${Math.round(progress * 100)}%`,
                      },
                    ]}
                  />
                </View>
                <View style={styles.heroProgressLabelsRow}>
                  <AppText
                    variant="caption"
                    onHero
                    style={styles.heroProgressEndpointLabel}
                  >
                    {`${t(prevKey)} ${prevTimeFmt}`}
                  </AppText>
                  <AppText
                    variant="caption"
                    onHero
                    style={styles.heroProgressEndpointLabel}
                  >
                    {`${t(next ? next.name : 'Fajr')} ${nextTimeFmt}`}
                  </AppText>
                </View>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* 2. Five 80dp Equal Responsive Prayer Tiles (Fajr, Dhuhr, Asr, Maghrib, Isha) */}
        <View style={styles.fivePrayerRow}>
          {FIVE_PRAYERS.map((item) => {
            const isDone = Boolean(completed[item.key]);
            const isNext = next ? next.name === item.key : item.key === 'Fajr';
            const rawTime = data.timings[item.key] || '--:--';
            const formattedTime = formatTime(rawTime, fmt);
            const timeParts = formattedTime.split(' ');
            const timeMain = timeParts[0];
            const timePeriod = timeParts[1] || '';
            const tileState = isDone ? 'DONE' : isNext ? 'NEXT' : 'UPCOMING';

            return (
              <TouchableOpacity
                key={item.key}
                style={[
                  styles.prayerTile,
                  {
                    borderColor: isNext ? homeTokens.gold : homeTokens.cardBorder,
                    backgroundColor: isNext ? homeTokens.gold : homeTokens.cardTop,
                    ...(isNext ? getActivePrayerShadow(mode) : getCardShadow(mode)),
                  },
                ]}
                onPress={() => togglePrayer(item.key)}
                activeOpacity={0.75}
                hitSlop={{ top: 8, bottom: 8, left: 3, right: 3 }}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isDone }}
                accessibilityLabel={`${t(item.label)} at ${formattedTime}, ${tileState === 'DONE' ? t('completed') : tileState === 'NEXT' ? t('next') : t('upcoming')}`}
              >
                <LinearGradient
                  colors={
                    isNext
                      ? [...HOME_THEME_TOKENS.goldGradient]
                      : [homeTokens.cardTop, homeTokens.cardBottom]
                  }
                  style={StyleSheet.absoluteFill}
                />
                <View style={styles.prayerTileStatusWrap}>
                  {isDone ? (
                    <View
                      style={[
                        styles.prayerTileDoneBadge,
                        { backgroundColor: isNext ? homeTokens.onGold : homeTokens.accent },
                      ]}
                    >
                      <Ionicons
                        name="checkmark"
                        size={11}
                        color={isNext ? homeTokens.onGold : HOME_THEME_TOKENS.hero.ivory}
                      />
                    </View>
                  ) : isNext ? (
                    <View
                      style={[
                        styles.prayerTileActiveDotWrap,
                        {
                          borderColor: homeTokens.gold,
                          backgroundColor: 'transparent',
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.prayerTileActiveInnerDot,
                          { backgroundColor: homeTokens.gold },
                        ]}
                      />
                    </View>
                  ) : (
                    <View
                      style={[
                        styles.prayerTileUpcomingDot,
                        { borderColor: homeTokens.ringBorder },
                      ]}
                    />
                  )}
                </View>

                <AppText
                  variant="rowTitle"
                  tone={isNext ? 'onGold' : undefined}
                  style={[
                    styles.prayerTileName,
                    {
                      fontFamily: isNext ? 'Manrope_700Bold' : 'Manrope_600SemiBold',
                    },
                  ]}
                  numberOfLines={1}
                >
                  {t(item.label)}
                </AppText>

                <View style={styles.prayerTileTimeWrap}>
                  <AppText
                    variant="numeral"
                    tone={isNext ? 'onGold' : undefined}
                    style={[
                      styles.prayerTileTime,
                      {
                        fontFamily: isNext ? 'Manrope_700Bold' : 'Manrope_600SemiBold',
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {timeMain}
                  </AppText>
                  {Boolean(timePeriod) && (
                    <AppText
                      variant="caption"
                      tone={isNext ? 'onGold' : undefined}
                      style={[
                        styles.prayerTilePeriod,
                        {
                          fontFamily: isNext ? 'Manrope_600SemiBold' : 'Manrope_500Medium',
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {timePeriod}
                    </AppText>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* 3. 80dp Continue Reading Premium Card */}
        <ContinueReadingCard
          onOpenReader={handleOpenReader}
          onOpenQuranTab={handleOpenQuranTab}
          style={{ marginBottom: 14.5 }}
        />

        {/* 4. Three 84dp Quick Action Cards */}
        <QuickActionsStrip
          onOpenQibla={onOpenQibla}
          onOpenDuas={onOpenDuas}
          onOpenHadith={onOpenHadith}
          onOpenTasbih={onOpenTasbih}
          style={{ marginBottom: 14.5 }}
        />

        {/* 5. 73dp Salah Streak Card with Seven StarBadges */}
        <View
          style={[
            styles.streakCard,
            {
              borderColor: homeTokens.cardBorder,
              backgroundColor: homeTokens.cardTop,
              ...getCardShadow(mode),
            },
          ]}
        >
          <LinearGradient
            colors={[homeTokens.cardTop, homeTokens.cardBottom]}
            style={StyleSheet.absoluteFill}
          />
          {mode === 'paper' ? (
            <View style={styles.streakInnerRow}>
              <View style={styles.streakLeftCol}>
                <AppText
                  variant="eyebrow"
                  style={[
                    styles.streakOverline,
                    {
                      textAlign: isRTL() ? 'right' : 'left',
                    },
                  ]}
                >
                  {t('SALAH STREAK')}
                </AppText>
                <AppText
                  variant="numeral"
                  style={[
                    styles.streakBigCount,
                    {
                      fontFamily: isRTL() ? 'Amiri_700Bold' : 'InstrumentSerif_400Regular',
                      textAlign: isRTL() ? 'right' : 'left',
                    },
                  ]}
                >
                  {`${streak} ${t(streak === 1 ? 'day' : 'days')}`}
                </AppText>
              </View>

              <View
                style={styles.starBadgesRow}
                accessibilityRole="text"
                accessibilityLabel={`${streak} ${t('Day Streak')}, ${completedCount} / 5 ${t('Salah Today')}`}
              >
                {starDays.map((day) => (
                  <View key={day.key} style={styles.starBadgeItem}>
                    <IslamicStar
                      isFull={day.isFull}
                      color={homeTokens.gold}
                      size={18}
                    />
                  </View>
                ))}
              </View>
            </View>
          ) : (
            <View style={styles.streakInnerRow}>
              <View style={styles.streakLeftCol}>
                <View style={styles.streakTitleRow}>
                  <Ionicons name="flame" size={16} color={homeTokens.gold} />
                  <AppText
                    variant="title"
                    style={[
                      styles.streakTitleText,
                      {
                        textAlign: isRTL() ? 'right' : 'left',
                      },
                    ]}
                  >
                    {streak} {t('Day Streak')}
                  </AppText>
                </View>
                <AppText
                  variant="subtitle"
                  style={[
                    styles.streakSubText,
                    {
                      textAlign: isRTL() ? 'right' : 'left',
                    },
                  ]}
                >
                  {completedCount} / 5 {t('Salah Today')}
                </AppText>
              </View>

              <View style={styles.starBadgesRow}>
                {starDays.map((day) => (
                  <View key={day.key} style={styles.starBadgeItem}>
                    <AppText
                      variant="caption"
                      highlight={day.isToday}
                      style={[
                        styles.starDayLabel,
                        {
                          fontFamily: day.isToday ? 'Manrope_700Bold' : 'Manrope_600SemiBold',
                        },
                      ]}
                    >
                      {day.label}
                    </AppText>
                    <View
                      style={[
                        styles.starIconWrap,
                        day.isFull
                          ? { backgroundColor: homeTokens.gold }
                          : {
                              backgroundColor: homeTokens.ringFill,
                              borderColor: homeTokens.ringBorder,
                              borderWidth: 1,
                            },
                      ]}
                      accessibilityRole="image"
                      accessibilityLabel={`${day.label}: ${day.count} / 5 ${t('Salah')}`}
                    >
                      {day.isFull ? (
                        <Ionicons name="star" size={10} color={homeTokens.onGold} />
                      ) : day.count > 0 ? (
                        <Ionicons name="star" size={9} color={homeTokens.gold} />
                      ) : (
                        <Ionicons name="star-outline" size={9} color={homeTokens.muted} />
                      )}
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* 6. Sunrise Auxiliary Card (Preserved in card system below Salah Streak) */}
        <View
          style={[
            styles.sunriseAuxCard,
            {
              borderColor: homeTokens.cardBorder,
              backgroundColor: homeTokens.cardTop,
              ...getCardShadow(mode),
            },
          ]}
        >
          <LinearGradient
            colors={[homeTokens.cardTop, homeTokens.cardBottom]}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.sunriseInnerRow}>
            <View style={styles.sunriseLeftGroup}>
              <View
                style={[
                  styles.sunriseIconBadge,
                  {
                    backgroundColor: homeTokens.ringFill,
                    borderColor: homeTokens.ringBorder,
                  },
                ]}
              >
                <Ionicons name="sunny-outline" size={16} color={homeTokens.gold} />
              </View>
              <View style={styles.sunriseTextGroup}>
                <AppText
                  variant="title"
                  style={[
                    styles.sunriseTitle,
                    {
                      textAlign: isRTL() ? 'right' : 'left',
                    },
                  ]}
                >
                  {t('Sunrise')}
                </AppText>
                <AppText
                  variant="subtitle"
                  style={[
                    styles.sunriseSubtitle,
                    {
                      textAlign: isRTL() ? 'right' : 'left',
                    },
                  ]}
                >
                  {t('Non-Salah checkpoint')}
                </AppText>
              </View>
            </View>
            <AppText
              variant="numeral"
              highlight
              style={styles.sunriseTime}
            >
              {formatTime(data.timings.Sunrise, fmt)}
            </AppText>
          </View>
        </View>

        {/* 7. Daily Content Rail (Ayah / Hadith / 99 Names horizontal swipe discovery rail) */}
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
        <View
          style={styles.duaRailContainer}
          onLayout={(e) => {
            const w = Math.round(e.nativeEvent.layout.width);
            if (w > 0 && Math.abs(w - duaRailWidth) > 1) {
              setDuaRailWidth(w);
            }
          }}
        >
          {/* Header Row: Eyebrow + context + pagination */}
          <View style={styles.duaRailHeaderRow}>
            <View style={styles.duaRailHeaderLeft}>
              <AppText
                variant="eyebrow"
                style={[styles.duaAfterPrayerEyebrow, { textAlign: isRTL() ? 'right' : 'left' }]}
              >
                {t('Dua After Prayer')}
              </AppText>
              <AppText
                variant="subtitle"
                style={[styles.duaAfterPrayerContext, { textAlign: isRTL() ? 'right' : 'left' }]}
              >
                {hasSpecificPrayerDuas && targetPrayer ? `${t('For')} ${t(targetPrayer)}` : t('Authentic Adhkar')}
              </AppText>
            </View>

            {/* Pagination indicator: 1 of N + dots */}
            <View style={[styles.duaPaginationWrap, { alignItems: isRTL() ? 'flex-start' : 'flex-end' }]}>
              <AppText
                variant="caption"
                style={[styles.duaPaginationText, { textAlign: isRTL() ? 'right' : 'left' }]}
              >
                {Math.max(0, Math.min(activeDuaIndex, allAfterPrayerDuas.length - 1)) + 1} {t('of')} {allAfterPrayerDuas.length}
              </AppText>
              <View style={styles.duaDotsRow}>
                {allAfterPrayerDuas.map((_, i) => {
                  const isActive = i === Math.max(0, Math.min(activeDuaIndex, allAfterPrayerDuas.length - 1));
                  return (
                    <View
                      key={i}
                      style={[
                        styles.duaDot,
                        {
                          backgroundColor: isActive ? homeTokens.gold : homeTokens.ringBorder,
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
            decelerationRate="fast"
            nestedScrollEnabled
            contentContainerStyle={[styles.duaRailScrollContent, hScrollRTLStyle()]}
            onScroll={(event) => {
              const offsetX = Math.abs(event.nativeEvent.contentOffset.x);
              const index = Math.round(offsetX / (duaSnapInterval || 1));
              const safeIndex = Math.max(0, Math.min(allAfterPrayerDuas.length - 1, index));
              if (safeIndex !== activeDuaIndex) {
                setActiveDuaIndex(safeIndex);
              }
            }}
            onMomentumScrollEnd={(event) => {
              const offsetX = Math.abs(event.nativeEvent.contentOffset.x);
              const index = Math.round(offsetX / (duaSnapInterval || 1));
              const safeIndex = Math.max(0, Math.min(allAfterPrayerDuas.length - 1, index));
              if (safeIndex !== activeDuaIndex) {
                setActiveDuaIndex(safeIndex);
              }
            }}
            scrollEventThrottle={16}
          >
            {allAfterPrayerDuas.map((item, idx) => {
              const isExpanded = !!expandedDuaIds[item.id];
              const isForPrayer = targetPrayer ? isDuaForPrayer(item, targetPrayer) : false;
              return (
                <View
                  key={item.id || idx}
                  style={[styles.duaCardSlide, { width: duaCardWidth, ...getFloatingCardShadow(mode) }]}
                >
                  <Card
                    style={StyleSheet.flatten([
                      styles.duaAfterPrayerCard,
                      {
                        borderColor: mode === 'ink' ? 'rgba(142,116,64,0.38)' : 'rgba(234,226,210,0.58)',
                        backgroundColor: homeTokens.cardTop,
                      },
                    ])}
                    padded={false}
                  >
                    <LinearGradient
                      colors={[homeTokens.cardTop, homeTokens.cardBottom]}
                      style={StyleSheet.absoluteFill}
                    />
                    <GeometricPattern
                      variant="tessellation"
                      tileSize={40}
                      color={homeTokens.accent}
                      opacity={mode === 'ink' ? 0.045 : 0.025}
                    />
                    <TouchableOpacity
                      activeOpacity={0.88}
                      style={styles.duaCardPressable}
                      onPress={() => {
                        haptic('light');
                        setExpandedDuaIds((prev) => ({ ...prev, [item.id]: !prev[item.id] }));
                      }}
                      accessibilityRole="button"
                      accessibilityState={{ expanded: isExpanded }}
                      accessibilityLabel={`${t('Dua')} ${idx + 1} ${t('of')} ${allAfterPrayerDuas.length}. ${isExpanded ? t('Less') : t('More')}.`}
                    >
                      <View style={styles.duaAfterPrayerHeader}>
                        <View style={styles.duaBadgeRow}>
                          <View
                            style={[
                              styles.duaNumberBadge,
                              {
                                backgroundColor: homeTokens.ringFill,
                                borderColor: homeTokens.ringBorder,
                                borderWidth: 1,
                              },
                            ]}
                          >
                            <AppText variant="caption" highlight style={styles.duaNumberBadgeText}>
                              {idx + 1}
                            </AppText>
                          </View>
                          {isForPrayer && (
                            <View
                              style={[
                                styles.duaForPrayerTag,
                                {
                                  backgroundColor: homeTokens.ringFill,
                                  borderColor: homeTokens.ringBorder,
                                },
                              ]}
                            >
                              <AppText variant="caption" highlight style={styles.duaForPrayerTagText}>
                                {t('For')} {t(targetPrayer)}
                              </AppText>
                            </View>
                          )}
                        </View>
                        <View style={styles.duaExpandBtn}>
                          <AppText variant="caption" style={styles.duaExpandBtnText}>
                            {isExpanded ? t('Less') : t('More')}
                          </AppText>
                          <Ionicons
                            name={isExpanded ? 'chevron-up-outline' : 'chevron-down-outline'}
                            size={16}
                            color={homeTokens.muted}
                          />
                        </View>
                      </View>

                      <View style={styles.duaAfterPrayerContent}>
                        <ArabicText
                          size={isCompact ? 20 : 22}
                          align="right"
                          lineHeight={isCompact ? 38 : 42}
                          style={styles.duaAfterPrayerArabic}
                          numberOfLines={isExpanded ? undefined : 3}
                        >
                          {item.arabic}
                        </ArabicText>

                        {isExpanded ? (
                          <View style={styles.duaExpandedDetails}>
                            <AppText
                              variant="body"
                              tone="faint"
                              style={[
                                styles.duaAfterPrayerTransliteration,
                                { textAlign: isRTL() ? 'right' : 'left' },
                              ]}
                            >
                              {item.transliteration}
                            </AppText>
                            <AppText
                              variant="body"
                              style={[
                                styles.duaAfterPrayerTranslation,
                                { textAlign: isRTL() ? 'right' : 'left', writingDirection: isRTL() ? 'rtl' : 'ltr' },
                              ]}
                            >
                              {item.translation}
                            </AppText>
                            {(item.reference || item.source) ? (
                              <View
                                style={[
                                  styles.duaRefRow,
                                  { borderTopColor: homeTokens.ringBorder },
                                ]}
                              >
                                <Ionicons name="book-outline" size={11} color={homeTokens.muted} />
                                <AppText
                                  variant="caption"
                                  style={[styles.duaAfterPrayerRef, { textAlign: isRTL() ? 'right' : 'left' }]}
                                >
                                  {item.reference || item.source}
                                </AppText>
                              </View>
                            ) : null}
                          </View>
                        ) : (
                          <AppText
                            variant="body"
                            style={[
                              styles.duaAfterPrayerTranslation,
                              { textAlign: isRTL() ? 'right' : 'left', writingDirection: isRTL() ? 'rtl' : 'ltr' },
                            ]}
                            numberOfLines={2}
                          >
                            {item.translation}
                          </AppText>
                        )}
                      </View>
                    </TouchableOpacity>
                  </Card>
                </View>
              );
            })}
          </ScrollView>
        </View>
      </TabAnimatedScrollView>
    </View>
  );
}, (prev, next) => prev.isActive === next.isActive);

export default HomeScreen;

const styles = StyleSheet.create({
  root: { flex: 1 },
  pinnedBarWrap: {
    position: 'absolute',
    top: 10,
    left: 14,
    right: 14,
    zIndex: 100,
  },
  scroll: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { fontFamily: 'Manrope_400Regular', fontSize: 14 },
  content: {
    paddingHorizontal: 16,
    paddingTop: 0,
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
  },
  patternTop: { top: -40, right: -60 },
  sectionHeader: { marginBottom: 20 },
  headerDateLine: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 11.5,
    lineHeight: 15,
    letterSpacing: 2.2,
    marginBottom: 5,
    textTransform: 'uppercase',
    paddingVertical: 2,
  },
  headerGreetingTitle: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 42,
    lineHeight: 46,
    marginBottom: 5,
  },
  headerTimeGreeting: {
    fontSize: 14,
    marginBottom: 4,
  },
  headerLocationText: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 13.5,
    lineHeight: 18,
    marginBottom: 0,
  },
  prayerHeroCard: {
    minHeight: 224,
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  heroInsetBorder: {
    margin: 1,
    borderWidth: 1,
    borderRadius: 15,
  },
  heroInnerContent: {
    padding: 16,
    minHeight: 224,
    flex: 1,
    justifyContent: 'space-between',
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  heroLeftCol: {
    flex: 1,
    gap: 2,
  },
  heroNextPrayerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 1,
  },
  heroDiamondGlyph: {
    fontSize: 8,
  },
  heroNextPrayerLabel: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 10,
    letterSpacing: 2,
    paddingVertical: 2,
  },
  heroPrayerName: {
    fontSize: 32,
    lineHeight: 36,
    paddingVertical: 2,
  },
  heroTimeWrap: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  heroTimeBig: {
    // dynamically styled with font and size
  },
  heroTimePeriod: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
    letterSpacing: 0.5,
    paddingVertical: 2,
  },
  heroArabicDisplay: {
    textAlign: 'right',
    marginTop: 2,
  },
  heroCountdownSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 2,
  },
  heroUntilText: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 11.5,
    paddingVertical: 2,
  },
  heroProgressSection: {
    gap: 6,
    marginTop: 2,
  },
  heroProgressTrack: {
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 1.5,
    position: 'relative',
    overflow: 'visible',
    justifyContent: 'center',
  },
  heroProgressFill: {
    height: 3,
    borderRadius: 1.5,
  },
  heroProgressKnob: {
    position: 'absolute',
    width: 9,
    height: 9,
    borderRadius: 4.5,
    top: -3,
    marginLeft: -4.5,
  },
  heroProgressLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroProgressEndpointLabel: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 10,
    letterSpacing: 0.4,
    paddingVertical: 2,
  },
  fivePrayerRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 14.5,
    width: '100%',
  },
  prayerTile: {
    flex: 1,
    minWidth: 0,
    minHeight: 94,
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 2,
  },
  prayerTileName: {
    fontSize: 11.5,
    textAlign: 'center',
    letterSpacing: 0.2,
    paddingVertical: 2,
  },
  prayerTileStatusWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 20,
  },
  prayerTileDoneBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prayerTileActiveDotWrap: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prayerTileActiveInnerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  prayerTileNextBadge: {
    minHeight: 15,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 7.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prayerTileNextText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 8.5,
    letterSpacing: 0.5,
    paddingVertical: 2,
  },
  prayerTileUpcomingDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    opacity: 0.7,
  },
  prayerTileTimeWrap: {
    alignItems: 'center',
    gap: 0,
  },
  prayerTileTime: {
    fontSize: 11.5,
    textAlign: 'center',
    lineHeight: 15,
    paddingVertical: 1,
  },
  prayerTilePeriod: {
    fontSize: 8.5,
    textAlign: 'center',
    lineHeight: 11,
    paddingVertical: 1,
  },
  streakCard: {
    minHeight: 78,
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 14.5,
    justifyContent: 'center',
    paddingVertical: 10,
  },
  streakOverline: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 2,
    paddingVertical: 2,
  },
  streakBigCount: {
    fontSize: 32,
    lineHeight: 36,
    paddingVertical: 2,
  },
  streakInnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  streakLeftCol: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  streakTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  streakTitleText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 13,
    letterSpacing: 0.2,
    paddingVertical: 2,
  },
  streakSubText: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 11,
    paddingVertical: 2,
  },
  starBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  starBadgeItem: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  starDayLabel: {
    fontSize: 9,
    textAlign: 'center',
    paddingVertical: 2,
  },
  starIconWrap: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sunriseAuxCard: {
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 14.5,
    justifyContent: 'center',
    paddingVertical: 8,
  },
  sunriseInnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
  },
  sunriseLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  sunriseIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  sunriseTextGroup: {
    gap: 1,
    flex: 1,
    minWidth: 0,
  },
  sunriseTitle: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
    paddingVertical: 2,
  },
  sunriseSubtitle: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 10.5,
    paddingVertical: 2,
  },
  sunriseTime: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 13.5,
    flexShrink: 0,
    paddingVertical: 2,
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
    paddingVertical: 2,
  },
  heroArabicName: {
    lineHeight: 40,
    textAlign: 'center',
    marginBottom: 2,
  },
  heroEnglishName: {
    fontSize: 34,
    lineHeight: 38,
    textAlign: 'center',
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
    paddingVertical: 2,
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
    paddingVertical: 2,
  },
  headerActionBtn: {
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  headerActionText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
    paddingVertical: 2,
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
    marginBottom: 0,
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
  },
  duaCardSlide: {
    borderRadius: 14,
    overflow: 'visible',
  },
  duaCardPressable: {
    zIndex: 2,
    flex: 1,
  },
  duaAfterPrayerCard: {
    position: 'relative',
    overflow: 'hidden',
    minHeight: 210,
    padding: 18,
    borderRadius: 14,
  },
  duaAfterPrayerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
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
    marginTop: 2,
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
