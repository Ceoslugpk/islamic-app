/* eslint-disable react-hooks/set-state-in-effect */
import React, { useEffect, useMemo, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeTokens } from '../theme/tokens';
import { getCardShadow } from '../lib/homeThemeTokens';
import { t } from '../lib/i18n';
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
import { SubHeader } from '../components/layout/SubHeader';
import { DetailScreen } from '../components/layout/DetailScreen';
import { PremiumCard } from '../components/ui';
import { Hairline } from '../components/Hairline';
import { EmptyState } from '../components/EmptyState';

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

export default function SalahTrackerScreen({
  onBack,
  backLabel = 'Tools',
}: {
  onBack?: () => void;
  backLabel?: string;
}) {
  const { tokens, mode } = useThemeTokens();
  const { settings } = useSettings();
  const { location: gpsLocation } = useLocation(false);

  const [data, setData] = useState<DayTimings | null>(null);
  const [loading, setLoading] = useState(true);
  const [completed, setCompleted] = useState<Record<string, boolean>>({});
  const [streak, setStreak] = useState(0);

  const effectiveLocation = useMemo(() => {
    if (settings.locationMode === 'auto') {
      return gpsLocation || settings.autoLocation || settings.manualLocation;
    }
    return settings.manualLocation;
  }, [settings.locationMode, gpsLocation, settings.autoLocation, settings.manualLocation]);

  // Load tracker status & streak
  useEffect(() => {
    const iso = getTodayIso();
    const entries = getSalahEntries(iso);
    setCompleted(entries);
    const history = getSalahHistory(30);
    setStreak(computeStreak(history));
  }, []);

  // Fetch today's prayer times
  const [fetchFailed, setFetchFailed] = useState(false);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setFetchFailed(false);
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
          setFetchFailed(true);
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
    <View style={styles.container}>
      <LinearGradient
        colors={tokens.bgGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <DetailScreen
        style={styles.detailScreen}
        header={
          <SubHeader
            eyebrow={t('Daily Obligations')}
            title={t('Salah Tracker')}
            subtitle={t('Track your daily 5 prayers and build a consistent habit')}
            onBack={onBack}
            backLabel={t(backLabel)}
            borderBottom
            showFade
          />
        }
      >
        <DetailScreen.ScrollView
          style={{ flex: 1, backgroundColor: 'transparent' }}
          contentContainerStyle={[
            styles.content,
            {
              paddingHorizontal: paddingH,
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
        <View style={styles.contentWrap}>
          {/* Summary Scorecard */}
          <View style={styles.statsRow}>
            <PremiumCard style={styles.statCard} padded>
              <Text style={[styles.statValue, { color: tokens.text }]}>
                {completedCount}<Text style={{ fontSize: 16, color: tokens.muted }}>/5</Text>
              </Text>
              <Text style={[styles.statLabel, { color: tokens.muted }]}>{t("Today's Prayers")}</Text>
              <View style={[styles.progressBarTrack, { backgroundColor: tokens.ringBorder }]}>
                <View
                  style={[
                    styles.progressBarFill,
                    { backgroundColor: tokens.gold, width: `${progressPercent}%` },
                  ]}
                />
              </View>
            </PremiumCard>

            <PremiumCard style={styles.statCard} padded>
              <View style={styles.streakWrap}>
                <Text style={[styles.statValue, { color: tokens.goldText }]}>{streak}</Text>
                <Ionicons name="flame" size={20} color={tokens.goldText} />
              </View>
              <Text style={[styles.statLabel, { color: tokens.muted }]}>{t('Day Streak')}</Text>
              <Text style={[styles.streakHint, { color: tokens.muted }]}>
                {streak === 0 ? t('Start your streak today') : `${streak} ${t('continuous days')}`}
              </Text>
            </PremiumCard>
          </View>

          {/* Today's Checklist */}
          <Text style={[styles.sectionTitle, { color: tokens.muted }]}>{t("TODAY'S PRAYERS")}</Text>
          <PremiumCard style={styles.listContainer} padded={false}>
            {loading && !data ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator color={tokens.goldText} />
              </View>
            ) : fetchFailed && !data ? (
              <EmptyState
                icon="cloud-offline-outline"
                title={t('Prayer times unavailable')}
                subtitle={t("Couldn't load today's prayer times. Check your connection or location, then try again.")}
                actionLabel={t('Retry')}
                onAction={() => {
                  setLoading(true);
                  setFetchFailed(false);
                  fetchPrayerTimes(effectiveLocation, settings.methodId)
                    .then((res) => {
                      setData(res);
                      setLoading(false);
                    })
                    .catch(() => {
                      setLoading(false);
                      setFetchFailed(true);
                    });
                }}
              />
            ) : (
              PRAYERS.map((p, i) => {
                const isDone = !!completed[p.key];
                const rawTime = data?.timings[p.key] || '--:--';
                const formatted = data ? formatTime(rawTime, settings.timeFormat) : '--:--';

                return (
                  <View key={p.key}>
                    {i > 0 && <Hairline style={{ backgroundColor: tokens.cardBorder }} />}
                    <TouchableOpacity
                      style={[
                        styles.prayerRow,
                        isDone && { backgroundColor: tokens.ringFill },
                      ]}
                      onPress={() => togglePrayer(p.key)}
                      activeOpacity={0.7}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: isDone }}
                      accessibilityLabel={`${p.label} at ${formatted}, ${isDone ? t('completed') : t('not completed')}`}
                    >
                      <View style={styles.rowLeft}>
                        <View
                          style={[
                            styles.checkbox,
                            { borderColor: isDone ? tokens.gold : tokens.cardBorder },
                            isDone && { backgroundColor: tokens.gold },
                          ]}
                        >
                          {isDone && <Ionicons name="checkmark" size={14} color={tokens.onGold} />}
                        </View>
                        <View>
                          <Text
                            style={[
                              styles.prayerName,
                              { color: tokens.text },
                              isDone && { textDecorationLine: 'line-through', color: tokens.muted },
                            ]}
                          >
                            {t(p.label)}
                          </Text>
                          <Text style={[styles.prayerStatus, { color: isDone ? tokens.goldText : tokens.muted }]}>
                            {isDone ? t('Completed') : t('Pending')}
                          </Text>
                        </View>
                      </View>

                      <Text style={[styles.prayerTime, { color: tokens.text }]}>
                        {formatted}
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              })
            )}
          </PremiumCard>

          {/* Past 7 Days Activity */}
          {recentHistory.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { color: tokens.muted, marginTop: 28 }]}>
                {t('RECENT DAYS HISTORY')}
              </Text>
              <PremiumCard style={styles.historyContainer} padded={false}>
                {recentHistory.map((item, idx) => {
                  const dayPrayers = Object.values(item.completed || {}).filter(Boolean).length;
                  return (
                    <View key={item.date}>
                      {idx > 0 && <Hairline style={{ backgroundColor: tokens.cardBorder }} />}
                      <View style={styles.historyRow}>
                        <Text style={[styles.historyDate, { color: tokens.text }]}>
                          {item.date}
                        </Text>
                        <View style={styles.historyRight}>
                          <Text style={[styles.historyCount, { color: tokens.muted }]}>
                            {dayPrayers}/5
                          </Text>
                          <View
                            style={[
                              styles.historyIndicator,
                              {
                                backgroundColor:
                                  dayPrayers === 5
                                    ? tokens.gold
                                    : dayPrayers > 0
                                    ? tokens.ringFill
                                    : tokens.cardBorder,
                              },
                            ]}
                          />
                        </View>
                      </View>
                    </View>
                  );
                })}
              </PremiumCard>
            </>
          )}
        </View>
      </DetailScreen.ScrollView>
    </DetailScreen>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  detailScreen: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  content: { paddingVertical: 12 },
  contentWrap: {
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
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
    borderRadius: 20,
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
    borderRadius: 8,
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
    borderRadius: 20,
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
