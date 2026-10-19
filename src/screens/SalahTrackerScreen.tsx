import React, { useEffect, useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { AppText } from '../components/ui/AppText';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeTokens } from '../theme/tokens';
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
  const { tokens } = useThemeTokens();
  const { settings } = useSettings();
  const { location: gpsLocation } = useLocation(false);

  const [data, setData] = useState<DayTimings | null>(null);
  const [loading, setLoading] = useState(true);
  const [completed, setCompleted] = useState<Record<string, boolean>>(() => {
    return getSalahEntries(getTodayIso());
  });
  const [streak, setStreak] = useState<number>(() => {
    return computeStreak(getSalahHistory(30));
  });

  const effectiveLocation = useMemo(() => {
    if (settings.locationMode === 'auto') {
      return gpsLocation || settings.autoLocation || settings.manualLocation;
    }
    return settings.manualLocation;
  }, [settings.locationMode, gpsLocation, settings.autoLocation, settings.manualLocation]);

  // Fetch today's prayer times
  const [fetchFailed, setFetchFailed] = useState(false);
  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (!cancelled) {
        setLoading(true);
        setFetchFailed(false);
      }
    });
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
  }, [effectiveLocation, settings.methodId]);

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
    void completed;
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
            <PremiumCard style={styles.statCard} contentStyle={styles.statCardContent} padded>
              <AppText variant="numeral" style={styles.statValue}>
                {completedCount}<AppText variant="numeral" tone="faint" style={{ fontSize: 16 }}>/5</AppText>
              </AppText>
              <AppText variant="eyebrow" tone="faint" style={styles.statLabel}>{t("Today's Prayers")}</AppText>
              <View style={[styles.progressBarTrack, { backgroundColor: tokens.ringBorder }]}>
                <View
                  style={[
                    styles.progressBarFill,
                    { backgroundColor: tokens.gold, width: `${progressPercent}%` },
                  ]}
                />
              </View>
            </PremiumCard>

            <PremiumCard style={styles.statCard} contentStyle={styles.statCardContent} padded>
              <View style={styles.streakWrap}>
                <AppText variant="numeral" highlight style={styles.statValue}>{streak}</AppText>
                <Ionicons name="flame" size={20} color={tokens.goldText} />
              </View>
              <AppText variant="eyebrow" tone="faint" style={styles.statLabel}>{t('Day Streak')}</AppText>
              <AppText variant="caption" tone="faint" style={styles.streakHint}>
                {streak === 0 ? t('Start your streak today') : `${streak} ${t('continuous days')}`}
              </AppText>
            </PremiumCard>
          </View>

          {/* Today's Checklist */}
          <AppText variant="eyebrow" tone="faint" style={styles.sectionTitle}>{t("TODAY'S PRAYERS")}</AppText>
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
                        <View style={styles.prayerTextWrap}>
                          <AppText
                            variant="rowTitle"
                            tone={isDone ? 'faint' : undefined}
                            style={[
                              styles.prayerName,
                              isDone && { textDecorationLine: 'line-through' },
                            ]}
                          >
                            {t(p.label)}
                          </AppText>
                          <AppText
                            variant="caption"
                            highlight={isDone}
                            tone={!isDone ? 'faint' : undefined}
                            style={styles.prayerStatus}
                          >
                            {isDone ? t('Completed') : t('Pending')}
                          </AppText>
                        </View>
                      </View>

                      <AppText variant="rowTitle" style={styles.prayerTime}>
                        {formatted}
                      </AppText>
                    </TouchableOpacity>
                  </View>
                );
              })
            )}
          </PremiumCard>

          {/* Past 7 Days Activity */}
          {recentHistory.length > 0 && (
            <>
              <AppText variant="eyebrow" tone="faint" style={[styles.sectionTitle, { marginTop: 28 }]}>
                {t('RECENT DAYS HISTORY')}
              </AppText>
              <PremiumCard style={styles.historyContainer} padded={false}>
                {recentHistory.map((item, idx) => {
                  const dayPrayers = Object.values(item.completed || {}).filter(Boolean).length;
                  return (
                    <View key={item.date}>
                      {idx > 0 && <Hairline style={{ backgroundColor: tokens.cardBorder }} />}
                      <View style={styles.historyRow}>
                        <AppText variant="body" style={styles.historyDate}>
                          {item.date}
                        </AppText>
                        <View style={styles.historyRight}>
                          <AppText variant="caption" tone="faint" style={styles.historyCount}>
                            {dayPrayers}/5
                          </AppText>
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
    minWidth: 0,
  },
  detailScreen: {
    flex: 1,
    backgroundColor: 'transparent',
    minWidth: 0,
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
    minHeight: 96,
    minWidth: 0,
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
    fontSize: 12,
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
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  rowLeft: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  prayerTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  prayerName: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 15,
  },
  prayerStatus: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    marginTop: 1,
  },
  prayerTime: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 14,
    flexShrink: 0,
    textAlign: 'right',
  },
  historyContainer: {
    borderWidth: 1,
    borderRadius: 20,
    overflow: 'hidden',
  },
  historyRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  historyDate: {
    flex: 1,
    minWidth: 0,
    fontFamily: 'Manrope_500Medium',
    fontSize: 14,
  },
  historyRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
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

  statCardContent: {
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
});
