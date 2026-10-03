import React, { useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme';
import { useSettings } from '../lib/settings';
import { useLocation } from '../lib/useLocation';
import { fetchPrayerTimes, DayTimings } from '../lib/prayerTimes';
import { formatTime } from '../lib/timeFormat';
import {
  markSalahCompleted,
  getSalahEntries,
  computeStreak,
  getSalahHistory,
} from '../lib/db';
import { SectionHeader } from '../components/SectionHeader';
import { Card } from '../components/Card';
import { Hairline } from '../components/Hairline';

const PRAYERS = [
  { key: 'Fajr', label: 'Fajr' },
  { key: 'Dhuhr', label: 'Dhuhr' },
  { key: 'Asr', label: 'Asr' },
  { key: 'Maghrib', label: 'Maghrib' },
  { key: 'Isha', label: 'Isha' },
] as const;

function getTodayIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export default function SalahTrackerScreen({ onBack }: { onBack?: () => void }) {
  const { colors } = useTheme();
  const { settings } = useSettings();
  const { location: gpsLocation } = useLocation(true);

  const [data, setData] = useState<DayTimings | null>(null);
  const [loading, setLoading] = useState(true);
  const [completed, setCompleted] = useState<Record<string, boolean>>({});
  const [streak, setStreak] = useState(0);

  const effectiveLocation = useMemo(() => {
    if (settings.locationMode === 'auto' && gpsLocation) return gpsLocation;
    return settings.manualLocation;
  }, [settings.locationMode, gpsLocation, settings.manualLocation]);

  // Load tracker status & streak
  useEffect(() => {
    const iso = getTodayIso();
    const entries = getSalahEntries(iso);
    setCompleted(entries);
    const history = getSalahHistory(30);
    setStreak(computeStreak(history));
  }, []);

  // Fetch today's prayer times
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchPrayerTimes(effectiveLocation, settings.methodId)
      .then((res) => {
        if (!cancelled) {
          setData(res);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [effectiveLocation.latitude, effectiveLocation.longitude, settings.methodId]);

  function togglePrayer(prayer: string) {
    const iso = getTodayIso();
    const next = !completed[prayer];
    markSalahCompleted(iso, prayer, next);
    setCompleted((prev) => ({ ...prev, [prayer]: next }));
    const history = getSalahHistory(30);
    setStreak(computeStreak(history));
  }

  const completedCount = useMemo(() => {
    return PRAYERS.filter((p) => completed[p.key]).length;
  }, [completed]);

  const progressPercent = Math.round((completedCount / 5) * 100);

  // Past 7 days history
  const recentHistory = useMemo(() => {
    const hist = getSalahHistory(7);
    return Object.entries(hist)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, comp]) => ({
        date,
        completed: comp,
      }));
  }, [completed]);

  const { width } = useWindowDimensions();
  const isCompact = width < 380;
  const paddingH = isCompact ? 16 : 20;

  return (
    <ScrollView
      style={{ backgroundColor: colors.bgBase }}
      contentContainerStyle={[styles.content, { paddingHorizontal: paddingH }]}
    >
      <View style={styles.contentWrap}>
        {onBack && (
          <TouchableOpacity
            style={styles.backBtn}
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel="Back to Tools"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={[styles.backText, { color: colors.accent, fontSize: isCompact ? 13 : 14 }]}>← Tools</Text>
          </TouchableOpacity>
        )}

        <SectionHeader
          eyebrow="Daily Obligations"
          title="Salah Tracker"
          subtitle="Track your daily 5 prayers and build a consistent habit"
        />

      {/* Summary Scorecard */}
      <View style={styles.statsRow}>
        <Card style={styles.statCard} padded>
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>
            {completedCount}<Text style={{ fontSize: 16, color: colors.textMuted }}>/5</Text>
          </Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Today's Prayers</Text>
          <View style={[styles.progressBarTrack, { backgroundColor: colors.borderSubtle }]}>
            <View
              style={[
                styles.progressBarFill,
                { backgroundColor: colors.accent, width: `${progressPercent}%` },
              ]}
            />
          </View>
        </Card>

        <Card style={styles.statCard} padded>
          <View style={styles.streakWrap}>
            <Text style={[styles.statValue, { color: colors.accent }]}>{streak}</Text>
            <Ionicons name="flame" size={20} color={colors.accent} />
          </View>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Day Streak</Text>
          <Text style={[styles.streakHint, { color: colors.textSecondary }]}>
            {streak === 0 ? 'Start your streak today' : `${streak} continuous days`}
          </Text>
        </Card>
      </View>

      {/* Today's Checklist */}
      <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>TODAY'S PRAYERS</Text>
      <View style={[styles.listContainer, { borderColor: colors.borderSubtle, backgroundColor: colors.bgSurface }]}>
        {loading && !data ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : (
          PRAYERS.map((p, i) => {
            const isDone = !!completed[p.key];
            const rawTime = data?.timings[p.key] || '--:--';
            const formatted = data ? formatTime(rawTime, settings.timeFormat) : '--:--';

            return (
              <View key={p.key}>
                {i > 0 && <Hairline />}
                <TouchableOpacity
                  style={[
                    styles.prayerRow,
                    isDone && { backgroundColor: colors.accentDim },
                  ]}
                  onPress={() => togglePrayer(p.key)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: isDone }}
                  accessibilityLabel={`${p.label} at ${formatted}, ${isDone ? 'completed' : 'not completed'}`}
                >
                  <View style={styles.rowLeft}>
                    <View
                      style={[
                        styles.checkbox,
                        { borderColor: isDone ? colors.accent : colors.borderStrong },
                        isDone && { backgroundColor: colors.accent },
                      ]}
                    >
                      {isDone && <Ionicons name="checkmark" size={14} color={colors.onAccent} />}
                    </View>
                    <View>
                      <Text
                        style={[
                          styles.prayerName,
                          { color: colors.textPrimary },
                          isDone && { textDecorationLine: 'line-through', color: colors.textSecondary },
                        ]}
                      >
                        {p.label}
                      </Text>
                      <Text style={[styles.prayerStatus, { color: isDone ? colors.accent : colors.textMuted }]}>
                        {isDone ? 'Completed' : 'Pending'}
                      </Text>
                    </View>
                  </View>

                  <Text style={[styles.prayerTime, { color: colors.textPrimary }]}>
                    {formatted}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </View>

      {/* Past 7 Days Activity */}
      {recentHistory.length > 0 && (
        <>
          <Text style={[styles.sectionTitle, { color: colors.textMuted, marginTop: 28 }]}>
            RECENT DAYS HISTORY
          </Text>
          <View style={[styles.historyContainer, { borderColor: colors.borderSubtle, backgroundColor: colors.bgSurface }]}>
            {recentHistory.map((item, idx) => {
              const dayPrayers = Object.values(item.completed || {}).filter(Boolean).length;
              return (
                <View key={item.date}>
                  {idx > 0 && <Hairline />}
                  <View style={styles.historyRow}>
                    <Text style={[styles.historyDate, { color: colors.textPrimary }]}>
                      {item.date}
                    </Text>
                    <View style={styles.historyRight}>
                      <Text style={[styles.historyCount, { color: colors.textSecondary }]}>
                        {dayPrayers}/5
                      </Text>
                      <View
                        style={[
                          styles.historyIndicator,
                          {
                            backgroundColor:
                              dayPrayers === 5
                                ? colors.accent
                                : dayPrayers > 0
                                ? colors.accentDim
                                : colors.borderSubtle,
                          },
                        ]}
                      />
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        </>
      )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 40 },
  contentWrap: {
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
  },
  backBtn: {
    alignSelf: 'flex-start',
    minHeight: 36,
    justifyContent: 'center',
    paddingVertical: 6,
    paddingRight: 12,
    marginBottom: 4,
  },
  backText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 14,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  statValue: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 34,
    lineHeight: 38,
  },
  statLabel: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  progressBarTrack: {
    height: 4,
    borderRadius: 2,
    marginTop: 12,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  streakWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  streakHint: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 11,
    marginTop: 6,
  },
  sectionTitle: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  listContainer: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  loadingWrap: {
    padding: 24,
    alignItems: 'center',
  },
  prayerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prayerName: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 15,
  },
  prayerStatus: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 11,
    marginTop: 1,
  },
  prayerTime: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 14,
  },
  historyContainer: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  historyDate: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 13,
  },
  historyRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  historyCount: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
  },
  historyIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});
