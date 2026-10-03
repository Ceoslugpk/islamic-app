import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
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
  saveTasbihCount,
  loadTasbihCounts,
} from '../lib/db';
import { qiblaBearing } from '../lib/qibla';
import { NAMES_99 } from '../lib/names99';
import { DUAS_DATA } from '../lib/duas';
import { ADHKAR } from '../lib/adhkar';
import { DHIKR_PRESETS } from './TasbihScreen';
import { Card } from '../components/Card';
import { Hairline } from '../components/Hairline';
import { SectionHeader } from '../components/SectionHeader';
import { GeometricPattern } from '../components/GeometricPattern';
import { ArabicText } from '../components/ArabicText';
import { HadithCard } from '../components/HadithCard';
import { useHadithOfDay } from '../lib/useHadithOfDay';
import { AyahCard } from '../components/AyahCard';
import { useAyahOfDay, getDayOfYear } from '../lib/useAyahOfDay';

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
  onOpenQibla?: () => void;
  onOpenAudio?: () => void;
  onOpenTasbih?: () => void;
  onOpenNames?: () => void;
  onOpenDuas?: () => void;
}

export default function HomeScreen({
  onOpenQibla,
  onOpenAudio,
  onOpenTasbih,
  onOpenNames,
  onOpenDuas,
}: HomeScreenProps) {
  const { colors } = useTheme();
  const { settings } = useSettings();
  const { haptic } = useHaptics();
  const { location: gpsLocation } = useLocation(true);
  const [data, setData] = useState<DayTimings | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(new Date());
  const [completed, setCompleted] = useState<Record<string, boolean>>({});
  const [streak, setStreak] = useState(0);

  // Tasbih Quick Counter state
  const [selectedTasbihIdx, setSelectedTasbihIdx] = useState(0);
  const [tasbihCounts, setTasbihCounts] = useState<Record<string, number>>({});

  // Ayah and Hadith of the Day
  const { ayah, loading: ayahLoading, refresh: refreshAyah } = useAyahOfDay();
  const { hadith, loading: hadithLoading, refresh: refreshHadith } = useHadithOfDay();

  // Load today's completion + streak
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

  // Load Tasbih counts on mount
  useEffect(() => {
    setTasbihCounts(loadTasbihCounts());
  }, []);

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

  // Tick every 30s for countdown & clock updates
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);

  // Effective location: auto uses GPS (falls back to manual), manual uses manualLocation
  const effectiveLocation = useMemo(() => {
    if (settings.locationMode === 'auto' && gpsLocation) return gpsLocation;
    return settings.manualLocation;
  }, [settings.locationMode, gpsLocation, settings.manualLocation]);

  // Adhan playback when a prayer time arrives (only if reminders enabled)
  usePrayerWatcher(data, settings.remindersEnabled);

  // Configure audio mode once on mount
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
      setError('Could not load prayer times. Check your connection.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  // Reload when location/method changes
  useEffect(() => {
    load(true);
  }, [effectiveLocation.latitude, effectiveLocation.longitude, settings.methodId]);

  const next = useMemo(() => (data ? getNextPrayer(data.timings, now) : null), [data, now]);

  // Countdown text (e.g., "4h 24m") — after Isha wraps to tomorrow's Fajr
  const countdownRemaining = useMemo(() => {
    const hm = next ? next.time : data?.timings.Fajr;
    if (!hm) return '';
    const nowMin = now.getHours() * 60 + now.getMinutes();
    let targetMin = parseHm(hm);
    if (targetMin <= nowMin) targetMin += 1440;
    const diffMs = (targetMin - nowMin) * 60000 - now.getSeconds() * 1000;
    return formatCountdown(diffMs);
  }, [next, now, data]);

  // Calculate elapsed fraction of the current prayer window
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
        // Next is Fajr (index 0). Previous window started at yesterday's Isha.
        prevMin = parseHm(data.timings.Isha || '00:00') - 1440;
        nextMin = parseHm(next.time);
      }
    } else {
      // After Isha: next is tomorrow's Fajr.
      prevMin = parseHm(data.timings.Isha || '00:00');
      nextMin = parseHm(data.timings.Fajr || '00:00') + 1440;
    }

    const diff = nextMin - prevMin;
    if (diff <= 0) return 0;
    const fraction = (nowMin - prevMin) / diff;
    return Math.min(1, Math.max(0, fraction));
  }, [data, next, now]);

  // Qibla bearing calculation
  const qiblaDeg = useMemo(() => {
    return Math.round(qiblaBearing(effectiveLocation.latitude, effectiveLocation.longitude));
  }, [effectiveLocation.latitude, effectiveLocation.longitude]);

  // Day of year for deterministic daily selections
  const dayOfYear = useMemo(() => getDayOfYear(now), [now]);

  // 99 Name of the day
  const nameOfDay = useMemo(() => {
    const idx = Math.abs(dayOfYear) % NAMES_99.length;
    return NAMES_99[idx];
  }, [dayOfYear]);

  // Dua of the day
  const duaOfDay = useMemo(() => {
    const idx = Math.abs(dayOfYear) % DUAS_DATA.length;
    return DUAS_DATA[idx];
  }, [dayOfYear]);

  // Adhkar for morning/evening
  const isMorning = now.getHours() < 15;
  const currentAdhkar = useMemo(() => {
    const timeKey = isMorning ? 'morning' : 'evening';
    return ADHKAR.filter((d) => d.time === timeKey).slice(0, 3);
  }, [isMorning]);

  // Current Tasbih preset and count
  const currentDhikr = DHIKR_PRESETS[selectedTasbihIdx];
  const currentTasbihCount = tasbihCounts[currentDhikr.id] || 0;

  const handleTasbihIncrement = useCallback(() => {
    haptic('light');
    const nextCount = currentTasbihCount + 1;
    setTasbihCounts((prev) => ({ ...prev, [currentDhikr.id]: nextCount }));
    saveTasbihCount(currentDhikr.id, nextCount);

    if (nextCount > 0 && nextCount % 33 === 0) {
      haptic('success');
    }
  }, [currentTasbihCount, currentDhikr.id, haptic]);

  const handleTasbihReset = useCallback(() => {
    haptic('warning');
    setTasbihCounts((prev) => ({ ...prev, [currentDhikr.id]: 0 }));
    saveTasbihCount(currentDhikr.id, 0);
  }, [currentDhikr.id, haptic]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bgBase }]}>
        <ActivityIndicator color={colors.accent} />
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

  const hijriLabel = `${data.hijri.day} ${data.hijri.monthEn} ${data.hijri.year}`;
  const locLabel = effectiveLocation.label;
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
            onRefresh={() => {
              setRefreshing(true);
              load(false, true);
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
          subtitle={`${locLabel} · ${hijriLabel} (${data.readable || data.gregorian})`}
          style={styles.sectionHeader}
        />

        {/* 1. Prayer Hero (Next prayer, time, remaining countdown, elapsed progress bar) */}
        <Card style={styles.countdownCard}>
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

        {/* 3. Salah Completion (today X/5 + streak) */}
        <View style={[styles.trackerRow, { borderColor: colors.borderSubtle, backgroundColor: colors.bgSurface }]}>
          <View style={styles.trackerStat}>
            <Text style={[styles.trackerValue, { color: colors.textPrimary }]}>
              {Object.values(completed).filter(Boolean).length}/5
            </Text>
            <Text style={[styles.trackerLabel, { color: colors.textMuted }]}>Today's Salah</Text>
          </View>
          <View style={[styles.trackerDivider, { backgroundColor: colors.borderSubtle }]} />
          <View style={styles.trackerStat}>
            <Text style={[styles.trackerValue, { color: colors.accent }]}>{streak}</Text>
            <Text style={[styles.trackerLabel, { color: colors.textMuted }]}>Day Streak</Text>
          </View>
        </View>

        {/* 4. Ayah of the Day */}
        {ayah && (
          <AyahCard ayah={ayah} onRefresh={refreshAyah} loading={ayahLoading} />
        )}

        {/* 5. Hadith of the Day */}
        {hadith && (
          <HadithCard hadith={hadith} onRefresh={refreshHadith} loading={hadithLoading} />
        )}

        {/* 6. 99 Names of Allah (Name of the Day) */}
        <Card style={styles.cardSection}>
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

        {/* 7. Qibla Shortcut Card */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onOpenQibla}
          disabled={!onOpenQibla}
          accessibilityRole="button"
          accessibilityLabel="Open Qibla compass"
        >
          <Card style={styles.cardSection}>
            <View style={styles.cardHeaderRow}>
              <Text style={[styles.sectionEyebrow, { color: colors.accent }]}>
                Qibla Direction
              </Text>
              {onOpenQibla && (
                <View style={styles.headerActionBtn}>
                  <Text style={[styles.headerActionText, { color: colors.accent }]}>
                    Open Qibla →
                  </Text>
                </View>
              )}
            </View>
            <Hairline style={styles.cardDivider} />
            <View style={styles.qiblaRow}>
              <View style={styles.qiblaLeft}>
                <Text style={[styles.qiblaBearing, { color: colors.textPrimary }]}>
                  {qiblaDeg}°
                </Text>
                <Text style={[styles.qiblaLabel, { color: colors.textSecondary }]}>
                  Bearing towards the Kaaba
                </Text>
                <Text style={[styles.qiblaLocation, { color: colors.textMuted }]}>
                  Calculated for {locLabel}
                </Text>
              </View>
              <View style={[styles.compassIconWrap, { backgroundColor: colors.accentDim, borderColor: colors.borderSubtle }]}>
                <Ionicons name="compass-outline" size={36} color={colors.accent} />
              </View>
            </View>
          </Card>
        </TouchableOpacity>

        {/* 8. Duas (Dua of the Day) */}
        <Card style={styles.cardSection}>
          <View style={styles.cardHeaderRow}>
            <Text style={[styles.sectionEyebrow, { color: colors.accent }]}>
              Dua of the Day · {duaOfDay.category}
            </Text>
            {onOpenDuas && (
              <TouchableOpacity onPress={onOpenDuas} style={styles.headerActionBtn}>
                <Text style={[styles.headerActionText, { color: colors.accent }]}>
                  All Duas →
                </Text>
              </TouchableOpacity>
            )}
          </View>
          <Hairline style={styles.cardDivider} />
          <Text style={[styles.duaTitle, { color: colors.textPrimary }]}>
            {duaOfDay.title}
          </Text>
          <ArabicText size={20} align="right" style={styles.duaArabic} numberOfLines={6}>
            {duaOfDay.arabic}
          </ArabicText>
          <Text style={[styles.duaTranslation, { color: colors.textSecondary }]}>
            {duaOfDay.translation}
          </Text>
          <Text style={[styles.duaRef, { color: colors.textMuted }]}>
            {duaOfDay.reference}
          </Text>
        </Card>

        {/* 9. Adhkar Strip (Morning / Evening) */}
        <View style={styles.adhkarSection}>
          <View style={styles.adhkarHeaderRow}>
            <Text style={[styles.sectionEyebrow, { color: colors.accent }]}>
              Daily Adhkar · {isMorning ? 'Morning' : 'Evening'}
            </Text>
            <Text style={[styles.adhkarSub, { color: colors.textMuted }]}>
              {currentAdhkar.length} supplications
            </Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.adhkarScrollContent}
          >
            {currentAdhkar.map((d) => (
              <Card key={d.id} style={styles.adhkarCard}>
                <View style={styles.adhkarCardHeader}>
                  <Text style={[styles.adhkarSource, { color: colors.textMuted }]} numberOfLines={1}>
                    {d.source}
                  </Text>
                  {d.count ? (
                    <View style={[styles.adhkarCountBadge, { backgroundColor: colors.accentDim }]}>
                      <Text style={[styles.adhkarCountText, { color: colors.accent }]}>
                        {d.count}x
                      </Text>
                    </View>
                  ) : null}
                </View>
                <ArabicText size={18} align="right" style={styles.adhkarArabic} numberOfLines={3}>
                  {d.arabic}
                </ArabicText>
                <Text style={[styles.adhkarTrans, { color: colors.textSecondary }]} numberOfLines={3}>
                  {d.translation}
                </Text>
              </Card>
            ))}
          </ScrollView>
        </View>

        {/* 10. Tasbih Quick Counter Card */}
        <Card style={styles.cardSection}>
          <View style={styles.cardHeaderRow}>
            <Text style={[styles.sectionEyebrow, { color: colors.accent }]}>
              Tasbih · Quick Counter
            </Text>
            {onOpenTasbih && (
              <TouchableOpacity onPress={onOpenTasbih} style={styles.headerActionBtn}>
                <Text style={[styles.headerActionText, { color: colors.accent }]}>
                  Full Tasbih →
                </Text>
              </TouchableOpacity>
            )}
          </View>
          <Hairline style={styles.cardDivider} />

          {/* Preset Selector */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.presetScroll}
          >
            {DHIKR_PRESETS.map((p, idx) => {
              const isSelected = idx === selectedTasbihIdx;
              return (
                <TouchableOpacity
                  key={p.id}
                  style={[
                    styles.presetChip,
                    {
                      backgroundColor: isSelected ? colors.accent : colors.bgBase,
                      borderColor: isSelected ? colors.accent : colors.borderSubtle,
                    },
                  ]}
                  onPress={() => setSelectedTasbihIdx(idx)}
                >
                  <Text
                    style={[
                      styles.presetChipText,
                      { color: isSelected ? '#121110' : colors.textSecondary },
                    ]}
                  >
                    {p.transliteration}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Dhikr Arabic & Meaning */}
          <View style={styles.tasbihDhikrWrap}>
            <ArabicText size={26} bold align="center" style={styles.tasbihArabic}>
              {currentDhikr.arabic}
            </ArabicText>
            <Text style={[styles.tasbihMeaning, { color: colors.textSecondary }]}>
              {currentDhikr.meaning}
            </Text>
          </View>

          {/* Counter Display & Tap Button */}
          <View style={styles.tasbihCounterRow}>
            <TouchableOpacity
              style={[
                styles.tasbihTapBtn,
                { backgroundColor: colors.accentDim, borderColor: colors.accent },
              ]}
              onPress={handleTasbihIncrement}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`Count tasbih for ${currentDhikr.transliteration}. Current count ${currentTasbihCount}. Tap to count.`}
            >
              <Text style={[styles.tasbihCountNum, { color: colors.textPrimary }]}>
                {currentTasbihCount}
              </Text>
              <Text style={[styles.tasbihTapLabel, { color: colors.accent }]}>
                Tap to count
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleTasbihReset}
              style={[styles.tasbihResetBtn, { borderColor: colors.borderSubtle }]}
              accessibilityRole="button"
              accessibilityLabel="Reset tasbih count"
            >
              <Ionicons name="refresh-outline" size={18} color={colors.textMuted} />
              <Text style={[styles.tasbihResetText, { color: colors.textMuted }]}>
                Reset
              </Text>
            </TouchableOpacity>
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
  qiblaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  qiblaLeft: {
    flex: 1,
  },
  qiblaBearing: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 40,
    lineHeight: 44,
  },
  qiblaLabel: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
    marginTop: 2,
  },
  qiblaLocation: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 11,
    marginTop: 2,
  },
  compassIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 16,
  },
  duaTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 16,
    marginBottom: 10,
  },
  duaArabic: {
    marginBottom: 12,
    lineHeight: 34,
  },
  duaTranslation: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 8,
  },
  duaRef: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
  },
  adhkarSection: {
    marginBottom: 24,
  },
  adhkarHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  adhkarSub: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
  },
  adhkarScrollContent: {
    gap: 12,
    paddingRight: 8,
  },
  adhkarCard: {
    width: 270,
    marginBottom: 0,
  },
  adhkarCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  adhkarSource: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 11,
    flex: 1,
    marginRight: 6,
  },
  adhkarCountBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  adhkarCountText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 10,
  },
  adhkarArabic: {
    marginBottom: 8,
    lineHeight: 28,
  },
  adhkarTrans: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    lineHeight: 18,
  },
  presetScroll: {
    gap: 8,
    marginBottom: 16,
  },
  presetChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  presetChipText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
  },
  tasbihDhikrWrap: {
    alignItems: 'center',
    marginBottom: 16,
  },
  tasbihArabic: {
    marginBottom: 4,
  },
  tasbihMeaning: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
  },
  tasbihCounterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tasbihTapBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  tasbihCountNum: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 48,
    lineHeight: 52,
  },
  tasbihTapLabel: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  tasbihResetBtn: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  tasbihResetText: {
    fontFamily: 'Manrope_500Medium',
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
