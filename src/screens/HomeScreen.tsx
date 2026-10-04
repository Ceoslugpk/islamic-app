import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  RefreshControl,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme';
import { useSettings } from '../lib/settings';
import { useHaptics } from '../lib/haptics';
import { useLocation } from '../lib/useLocation';
import { fetchPrayerTimes, DayTimings, getNextPrayer } from '../lib/prayerTimes';
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
  selectAfterPrayerDua,
  FALLBACK_AFTER_PRAYER_DUAS,
} from '../lib/afterPrayerDuas';
import { Card } from '../components/Card';
import { Hairline } from '../components/Hairline';
import { SectionHeader } from '../components/SectionHeader';
import { GeometricPattern } from '../components/GeometricPattern';
import { AnimatedPattern, IslamicPullToRefreshIndicator } from '../components/AnimatedPattern';
import { ArabicText } from '../components/ArabicText';
import { useHadithOfDay } from '../lib/useHadithOfDay';
import { useAyahOfDay, getDayOfYear } from '../lib/useAyahOfDay';
import { useConnectivity } from '../lib/useConnectivity';
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
import { PrayerCountdown } from '../components/PrayerCountdown';
import { PrayerTimeline } from '../components/PrayerTimeline';
import { ContinueReadingCard } from '../components/ContinueReadingCard';
import { DailyContentRail } from '../components/DailyContentRail';
import { QuickActionsStrip } from '../components/QuickActionsStrip';

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

export interface HomeScreenProps {
  onOpenNames?: () => void;
  onOpenQuran?: (surah?: number, ayah?: number) => void;
  onOpenReader?: (surah: number, ayah: number) => void;
  onOpenQuranTab?: () => void;
  onOpenHadith?: () => void;
  onOpenQibla?: () => void;
  onOpenDuas?: () => void;
  onOpenAdhkar?: () => void;
  onOpenTasbih?: () => void;
}

export default function HomeScreen({
  onOpenNames,
  onOpenQuran,
  onOpenReader,
  onOpenQuranTab,
  onOpenHadith,
  onOpenQibla,
  onOpenDuas,
  onOpenAdhkar,
  onOpenTasbih,
}: HomeScreenProps) {
  const { colors } = useTheme();
  const { settings } = useSettings();
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
  const { location: gpsLocation, status: locStatus, request: requestLocation, loading: locLoading } = useLocation(true);
  const { refreshKey } = useConnectivity();
  const { width } = useWindowDimensions();
  const [data, setData] = useState<DayTimings | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(new Date());
  const [completed, setCompleted] = useState<Record<string, boolean>>({});
  const [streak, setStreak] = useState(0);
  const [afterPrayerExpanded, setAfterPrayerExpanded] = useState(false);

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

  const effectiveLocation = useMemo(() => {
    if (settings.locationMode === 'auto' && gpsLocation) return gpsLocation;
    return settings.manualLocation;
  }, [settings.locationMode, gpsLocation, settings.manualLocation]);

  useEffect(() => {
    if (refreshKey > 0) {
      load(false, true);
    }
  }, [refreshKey, effectiveLocation.latitude, effectiveLocation.longitude, settings.methodId]);

  usePrayerWatcher(data, settings.remindersEnabled);

  useEffect(() => {
    configureAudio();
  }, []);

  async function load(showSpinner = false, force = false) {
    if (showSpinner) setLoading(true);
    setError(null);
    try {
      const result = await fetchPrayerTimes(effectiveLocation, settings.methodId, new Date(), force);
      setData(result);
    } catch {
      if (!data) {
        setError('Could not load prayer times. Check your connection.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load(true);
  }, [effectiveLocation.latitude, effectiveLocation.longitude, settings.methodId]);

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
  const afterPrayerDua = useMemo(
    () =>
      selectAfterPrayerDua(afterPrayerDuas, lastCompletedPrayer) ??
      FALLBACK_AFTER_PRAYER_DUAS[0],
    [afterPrayerDuas, lastCompletedPrayer]
  );

  const isCompact = useMemo(() => width <= 380, [width]);

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
          <GeometricPattern size={260} opacity={0.04} style={styles.patternTop} />
          <SectionHeader
            eyebrow="Today"
            title="Loading..."
            subtitle="Preparing your dashboard"
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
      <View style={[styles.center, { backgroundColor: colors.bgBase }]}>
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>
          {error || 'No data available.'}
        </Text>
      </View>
    );
  }

  if (error && data) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bgBase }]}>
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>{error}</Text>
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
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <View style={[styles.root, { backgroundColor: colors.bgBase }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: 40 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              if (settings.locationMode === 'auto' && (locStatus === 'denied' || locStatus === 'pending')) {
                await requestLocation(true);
              }
              await load(false, true);
            }}
            tintColor="transparent"
            colors={['transparent']}
            progressBackgroundColor="transparent"
          />
        }
      >
        <GeometricPattern size={260} opacity={0.04} style={styles.patternTop} />
        <IslamicPullToRefreshIndicator refreshing={refreshing} />

        {/* Section Header: Eyebrow Today + Greeting */}
        <SectionHeader
          eyebrow="Today"
          title={greeting}
          subtitle={`${locDisplay} · ${hijriLabel} (${data.readable || data.gregorian})`}
          style={styles.sectionHeader}
        />

        {/* Location Permission Note if auto mode enabled but permission denied/unavailable */}
        {settings.locationMode === 'auto' && (locStatus === 'denied' || locStatus === 'unavailable') && (
          <LocationPermissionNote
            status={locStatus}
            onEnable={async () => {
              await requestLocation(true);
            }}
            loading={locLoading}
            fallbackCity={settings.manualLocation.label || 'Dubai, UAE'}
          />
        )}

        {/* 1. Prayer Hero (Visual Centerpiece with time-of-day atmosphere & smart countdown) */}
        <Card style={styles.prayerHeroCard} padded={false}>
          <PrayerHeroAtmosphere
            segment={currentSegment}
            size={isCompact ? 280 : 340}
          />
          <View style={styles.heroContent}>
            {/* Line 1: Weekday · Hijri date */}
            <Text style={[styles.heroEyebrow, { color: colors.textMuted }]}>
              {weekdayHijriLabel}
            </Text>

            {/* Line 2: Arabic prayer name */}
            <ArabicText
              size={isCompact ? 26 : 30}
              align="center"
              style={styles.heroArabicName}
            >
              {nextArabicName}
            </ArabicText>

            {/* Line 3: English name */}
            <Text style={[styles.heroEnglishName, { color: colors.textPrimary }]}>
              {next ? next.name : 'Fajr'}
            </Text>

            {/* Line 4: Very large TIME */}
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

            {/* Line 5: Tabular figures countdown with digit transitions */}
            <View style={styles.heroCountdownWrap}>
              <PrayerCountdown
                targetTime={next ? next.time : data.timings.Fajr}
                color={colors.accent}
                separatorColor={colors.textMuted}
                fontSize={18}
              />
            </View>

            {/* Line 6: Divider + transition hint */}
            <View style={styles.heroTransitionWrap}>
              <View
                style={[styles.heroDivider, { backgroundColor: colors.borderSubtle }]}
              />
              <Text style={[styles.heroTransitionText, { color: colors.textMuted }]}>
                {currentSegment}{' '}
                <Text style={{ color: colors.accent }}>→</Text>{' '}
                {next ? next.name : 'Fajr'}
              </Text>
            </View>
          </View>
        </Card>

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

        {/* 3. Dua After Prayer — compact, collapsible, contextual */}
        <Card style={styles.duaAfterPrayerCard}>
          <AnimatedPattern variant="rings" size={isCompact ? 240 : 300} />
          <TouchableOpacity
            style={styles.duaAfterPrayerHeader}
            onPress={() => {
              haptic('light');
              setAfterPrayerExpanded((prev) => !prev);
            }}
            accessibilityRole="button"
            accessibilityState={{ expanded: afterPrayerExpanded }}
            accessibilityLabel={`Dua after prayer${lastCompletedPrayer ? ` for ${lastCompletedPrayer}` : ''}. Tap to expand.`}
          >
            <View style={styles.duaAfterPrayerHeaderLeft}>
              <Text style={[styles.duaAfterPrayerEyebrow, { color: colors.accent }]}>
                Dua After Prayer
              </Text>
              {lastCompletedPrayer && (
                <Text style={[styles.duaAfterPrayerContext, { color: colors.textMuted }]}>
                  For {lastCompletedPrayer}
                </Text>
              )}
            </View>
            <Ionicons
              name={afterPrayerExpanded ? 'chevron-up-outline' : 'chevron-down-outline'}
              size={20}
              color={colors.textMuted}
            />
          </TouchableOpacity>

          <View style={styles.duaAfterPrayerContent}>
            <ArabicText size={22} align="right" style={styles.duaAfterPrayerArabic} numberOfLines={afterPrayerExpanded ? 8 : 2}>
              {afterPrayerDua.arabic}
            </ArabicText>
            {afterPrayerExpanded && (
              <>
                <Text style={[styles.duaAfterPrayerTransliteration, { color: colors.textSecondary }]}>
                  {afterPrayerDua.transliteration}
                </Text>
                <Text style={[styles.duaAfterPrayerTranslation, { color: colors.textSecondary }]}>
                  {afterPrayerDua.translation}
                </Text>
                {(afterPrayerDua.reference || afterPrayerDua.source) ? (
                  <Text style={[styles.duaAfterPrayerRef, { color: colors.textMuted }]}>
                    {afterPrayerDua.reference || afterPrayerDua.source}
                  </Text>
                ) : null}
              </>
            )}
          </View>
        </Card>



        {/* 4. Quick Actions Control Strip */}
        <QuickActionsStrip
          onOpenQibla={onOpenQibla}
          onOpenDuas={onOpenDuas}
          onOpenAdhkar={onOpenAdhkar}
          onOpenTasbih={onOpenTasbih}
        />

        {/* 5. One "Continue Reading" Primary Action Surface */}
        <ContinueReadingCard
          onOpenReader={handleOpenReader}
          onOpenQuranTab={handleOpenQuranTab}
          style={{ marginBottom: 20 }}
        />

        {/* 6. Daily Content Rail (Ayah / Hadith / 99 Names horizontal swipe discovery rail) */}
        <DailyContentRail
          ayah={ayah}
          hadith={hadith}
          nameOfDay={nameOfDay}
          ayahLoading={ayahLoading}
          hadithLoading={hadithLoading}
          onRefreshAyah={refreshAyah}
          onRefreshHadith={refreshHadith}
          onOpenAyah={handleOpenReader}
          onOpenHadith={onOpenHadith}
          onOpenNames={onOpenNames}
        />

        {/* Method + location note */}
        <Text style={[styles.methodNote, { color: colors.textMuted }]}>
          {data.method} · {data.timezone}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { fontFamily: 'Manrope_400Regular', fontSize: 14 },
  content: { padding: 20 },
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
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 34,
    lineHeight: 38,
    textAlign: 'center',
    letterSpacing: 0.5,
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
  duaAfterPrayerCard: {
    marginBottom: 20,
  },
  duaAfterPrayerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  duaAfterPrayerHeaderLeft: {
    flex: 1,
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
  },
  duaAfterPrayerArabic: {
    lineHeight: 36,
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
    marginTop: 4,
  },
  methodNote: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
});