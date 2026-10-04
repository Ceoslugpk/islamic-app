import React, { useEffect, useMemo, useState } from 'react';
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
import { AnimatedPattern } from '../components/AnimatedPattern';
import { ArabicText } from '../components/ArabicText';
import { HadithCard } from '../components/HadithCard';
import { useHadithOfDay } from '../lib/useHadithOfDay';
import { AyahCard } from '../components/AyahCard';
import { useAyahOfDay, getDayOfYear } from '../lib/useAyahOfDay';
import { useConnectivity } from '../lib/useConnectivity';
import { LocationPermissionNote } from '../components/LocationPermissionNote';
import {
  CountdownCardSkeleton,
  PrayerRowSkeleton,
  Skeleton,
} from '../components/Skeleton';

const PRAYER_ORDER: { key: keyof DayTimings['timings']; label: string }[] = [
  { key: 'Fajr', label: 'Fajr' },
  { key: 'Sunrise', label: 'Sunrise' },
  { key: 'Dhuhr', label: 'Dhuhr' },
  { key: 'Asr', label: 'Asr' },
  { key: 'Maghrib', label: 'Maghrib' },
  { key: 'Isha', label: 'Isha' },
];

function parseHm(hm: string): number {
  const [h, m] = hm.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export interface HomeScreenProps {
  onOpenNames?: () => void;
}

export default function HomeScreen({
  onOpenNames,
}: HomeScreenProps) {
  const { colors } = useTheme();
  const { settings } = useSettings();
  const { haptic } = useHaptics();
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
          </Card>
          <View style={[styles.trackerRow, { borderColor: colors.borderSubtle, backgroundColor: colors.bgSurface }]}>
            <View style={styles.trackerStat}>
              <Skeleton width="40" height={24} borderRadius={4} />
              <Skeleton width="70" height={12} borderRadius={4} />
            </View>
            <View style={[styles.trackerDivider, { backgroundColor: colors.borderSubtle }]} />
            <View style={styles.trackerStat}>
              <Skeleton width="30" height={24} borderRadius={4} />
              <Skeleton width="60" height={12} borderRadius={4} />
            </View>
          </View>
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
            tintColor={colors.accent}
          />
        }
      >
        <GeometricPattern size={260} opacity={0.04} style={styles.patternTop} />

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

        {/* 1. Prayer Hero (Next prayer, time, remaining countdown, elapsed progress bar) */}
        <Card style={styles.countdownCard}>
          <AnimatedPattern variant="star" size={isCompact ? 280 : 340} />
          <Text style={[styles.countdownEyebrow, { color: colors.accent }]}>
            {next ? 'Next Prayer' : 'Next Prayer · Tomorrow'}
          </Text>
          <Text style={[styles.countdownName, { color: colors.textPrimary }]}>
            {next ? next.name : 'Fajr'}
          </Text>
          <Text style={[styles.countdownTime, { color: colors.textPrimary }]}>
            {formatTime(next ? next.time : data.timings.Fajr, fmt)}
          </Text>
          {countdownRemaining ? (
            <Text style={[styles.countdownRemaining, { color: colors.textMuted }]}>
              {countdownRemaining === 'Now' ? 'Now' : `in ${countdownRemaining}`}
            </Text>
          ) : null}

          <View style={styles.progressWrap}>
            <View style={[styles.progressTrack, { backgroundColor: colors.borderSubtle }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: colors.accent,
                    width: `${Math.round(progress * 100)}%`,
                  },
                ]}
              />
            </View>
            <View style={styles.progressMeta}>
              <Text style={[styles.progressText, { color: colors.textMuted }]}>
                {Math.round(progress * 100)}% elapsed
              </Text>
            </View>
          </View>
        </Card>

        {/* 2. Prayer Times (5 prayers + sunrise list with completion toggles) */}
        <Card style={styles.prayerListCard} padded={false}>
          <AnimatedPattern variant="arch" size={isCompact ? 260 : 320} />
          {PRAYER_ORDER.map((p, i) => {
            const time = data.timings[p.key] || '--:--';
            const isActive = next?.name === p.key;
            const isDone = !!completed[p.key];
            return (
              <View key={p.key}>
                {i > 0 && <Hairline />}
                <TouchableOpacity
                  style={[
                    styles.row,
                    {
                      backgroundColor: isActive ? colors.accentDim : 'transparent',
                      borderLeftWidth: 4,
                      borderLeftColor: isActive ? colors.accent : 'transparent',
                    },
                  ]}
                  onPress={() => togglePrayer(p.key)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: isDone }}
                  accessibilityLabel={`${p.label} at ${time}, ${isDone ? 'completed' : 'not completed'}`}
                >
                  <View style={styles.rowLeft}>
                    <View
                      style={[
                        styles.check,
                        { borderColor: isDone ? colors.accent : colors.borderStrong },
                        isDone && { backgroundColor: colors.accent },
                      ]}
                    >
                      {isDone && <Text style={styles.checkMark}>✓</Text>}
                    </View>
                    <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>{p.label}</Text>
                    {isActive && (
                      <Text style={[styles.rowBadge, { color: colors.accent }]}>Now</Text>
                    )}
                  </View>
                  <Text style={[styles.rowTime, { color: colors.textPrimary }]}>
                    {formatTime(time, fmt)}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </Card>

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

        {/* 4. Salah Completion (today X/5 + streak) */}
        <View style={[styles.trackerRow, { borderColor: colors.borderSubtle, backgroundColor: colors.bgSurface }]}>
          <View style={styles.trackerStat}>
            <Text style={[styles.trackerValue, { color: colors.textPrimary }]}>
              {completedCount}/5
            </Text>
            <Text style={[styles.trackerLabel, { color: colors.textMuted }]}>Today&apos;s Salah</Text>
          </View>
          <View style={[styles.trackerDivider, { backgroundColor: colors.borderSubtle }]} />
          <View style={styles.trackerStat}>
            <Text style={[styles.trackerValue, { color: colors.accent }]}>{streak}</Text>
            <Text style={[styles.trackerLabel, { color: colors.textMuted }]}>Day Streak</Text>
          </View>
        </View>

        {/* 5. Ayah of the Day */}
        {ayah && (
          <View style={styles.cardWithPattern}>
            <AyahCard ayah={ayah} onRefresh={refreshAyah} loading={ayahLoading} />
            <AnimatedPattern variant="bloom" size={isCompact ? 280 : 340} />
          </View>
        )}

        {/* 6. Hadith of the Day */}
        {hadith && (
          <View style={styles.cardWithPattern}>
            <HadithCard hadith={hadith} onRefresh={refreshHadith} loading={hadithLoading} />
            <AnimatedPattern variant="rings" size={isCompact ? 260 : 320} />
          </View>
        )}

        {/* 7. 99 Names of Allah (Name of the Day) */}
        <Card style={styles.cardSection}>
          <AnimatedPattern variant="star-small" size={isCompact ? 220 : 280} />
          <View style={styles.cardHeaderRow}>
            <Text style={[styles.sectionEyebrow, { color: colors.accent }]}>
              Name of the Day · #{nameOfDay.number}
            </Text>
            {onOpenNames && (
              <TouchableOpacity onPress={onOpenNames} style={styles.headerActionBtn}>
                <Text style={[styles.headerActionText, { color: colors.accent }]}>
                  All 99 →
                </Text>
              </TouchableOpacity>
            )}
          </View>
          <Hairline style={styles.cardDivider} />
          <View style={styles.nameRow}>
            <View style={styles.nameLeft}>
              <Text style={[styles.nameTranslit, { color: colors.textPrimary }]}>
                {nameOfDay.transliteration}
              </Text>
              <Text style={[styles.nameMeaning, { color: colors.textSecondary }]}>
                {nameOfDay.meaning}
              </Text>
            </View>
            <ArabicText size={32} bold align="right">
              {nameOfDay.arabic}
            </ArabicText>
          </View>
        </Card>

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
  countdownCard: { marginBottom: 20 },
  cardWithPattern: {
    position: 'relative',
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  countdownEyebrow: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  countdownName: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 44,
    lineHeight: 48,
    marginTop: 6,
  },
  countdownTime: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 26,
    lineHeight: 32,
    marginTop: 2,
  },
  countdownRemaining: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
    letterSpacing: 0.2,
  },
  progressWrap: {
    marginTop: 16,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressMeta: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 6,
  },
  progressText: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 11,
  },
  prayerListCard: {
    marginBottom: 20,
    borderRadius: 12,
    overflow: 'hidden',
  },
  trackerRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 24,
    overflow: 'hidden',
    alignItems: 'center',
  },
  trackerStat: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    gap: 2,
  },
  trackerDivider: {
    width: 1,
    height: 36,
  },
  trackerValue: { fontFamily: 'Manrope_700Bold', fontSize: 24 },
  trackerLabel: { fontFamily: 'Manrope_500Medium', fontSize: 12 },
  check: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: { color: '#121110', fontFamily: 'Manrope_700Bold', fontSize: 13 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowLabel: { fontFamily: 'Manrope_500Medium', fontSize: 16 },
  rowBadge: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  rowTime: { fontFamily: 'Manrope_700Bold', fontSize: 16 },
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