import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  useWindowDimensions,
  BackHandler,
} from 'react-native';
import { AppText } from '../components/ui/AppText';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useThemeTokens } from '../theme/tokens';
import { getCardShadow, getHeroCardShadow, getPillShadow } from '../lib/homeThemeTokens';
import { t } from '../lib/i18n';
import { SubHeader } from '../components/layout/SubHeader';
import { DetailScreen } from '../components/layout/DetailScreen';
import { PremiumCard } from '../components/ui';
import { savePlanDay, loadPlanProgress } from '../lib/db';

export interface PlanDayItem {
  day: number;
  label: string;
  portion: string;
}

export interface ReadingPlan {
  id: string;
  title: string;
  subtitle: string;
  durationDays: number;
  pace: string;
  description: string;
  days: PlanDayItem[];
}

export function formatPlanPortion(portion: string, translate: (key: string) => string): string {
  return portion
    .replace('Juz', translate('Juz'))
    .replace('Part', translate('Part'))
    .replace("Rub'", translate("Rub'"));
}

const PLANS: ReadingPlan[] = [
  {
    id: '30-days',
    title: '30-Day Khatmah',
    subtitle: '1 Juz per day',
    durationDays: 30,
    pace: '1 Juz / day',
    description: 'Complete the entire Quran in 30 days by reading one Juz each day. Ideal for Ramadan or intensive study.',
    days: Array.from({ length: 30 }, (_, i) => ({
      day: i + 1,
      label: `Day ${i + 1}`,
      portion: `Juz ${i + 1}`,
    })),
  },
  {
    id: '60-days',
    title: '60-Day Khatmah',
    subtitle: 'Half Juz per day (1 Hizb)',
    durationDays: 60,
    pace: '1/2 Juz / day',
    description: 'A balanced two-month schedule reading half a Juz (~10 pages) every day.',
    days: Array.from({ length: 60 }, (_, i) => {
      const juz = Math.floor(i / 2) + 1;
      const part = (i % 2) + 1;
      return {
        day: i + 1,
        label: `Day ${i + 1}`,
        portion: `Juz ${juz}, Part ${part}/2`,
      };
    }),
  },
  {
    id: '90-days',
    title: '90-Day Khatmah',
    subtitle: 'One-third Juz per day',
    durationDays: 90,
    pace: '1/3 Juz / day',
    description: 'A comfortable three-month pace reading approximately 7 pages per day.',
    days: Array.from({ length: 90 }, (_, i) => {
      const juz = Math.floor(i / 3) + 1;
      const part = (i % 3) + 1;
      return {
        day: i + 1,
        label: `Day ${i + 1}`,
        portion: `Juz ${juz}, Part ${part}/3`,
      };
    }),
  },
  {
    id: '1-year',
    title: '1-Year Khatmah',
    subtitle: 'Quarter Juz per day',
    durationDays: 120,
    pace: '1/4 Juz / session',
    description: 'A gentle habit reading one Rub (quarter-juz, ~5 pages) each session across 120 milestones.',
    days: Array.from({ length: 120 }, (_, i) => {
      const juz = Math.floor(i / 4) + 1;
      const part = (i % 4) + 1;
      return {
        day: i + 1,
        label: `Milestone ${i + 1}`,
        portion: `Juz ${juz}, Rub' ${part}/4`,
      };
    }),
  },
];

export default function ReadingPlansScreen({ onBack }: { onBack?: () => void }) {
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [progressMap, setProgressMap] = useState<Record<string, Record<number, boolean>>>(() => {
    const loaded: Record<string, Record<number, boolean>> = {};
    for (const plan of PLANS) {
      loaded[plan.id] = loadPlanProgress(plan.id);
    }
    return loaded;
  });

  // Return from plan detail to plan list on Android hardware back
  useEffect(() => {
    if (!selectedPlanId) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setSelectedPlanId(null);
      return true;
    });
    return () => sub.remove();
  }, [selectedPlanId]);

  const selectedPlan = useMemo(
    () => PLANS.find((p) => p.id === selectedPlanId) || null,
    [selectedPlanId]
  );

  const toggleDay = useCallback(async (planId: string, day: number) => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // ignore
    }

    setProgressMap((prev) => {
      const planProgress = prev[planId] || {};
      const current = planProgress[day] === true;
      const next = !current;
      savePlanDay(planId, day, next);
      return {
        ...prev,
        [planId]: {
          ...planProgress,
          [day]: next,
        },
      };
    });
  }, []);

  const getPlanCompletedCount = (plan: ReadingPlan): number => {
    const p = progressMap[plan.id] || {};
    return Object.values(p).filter(Boolean).length;
  };

  const { tokens, mode } = useThemeTokens();
  const { width } = useWindowDimensions();
  const isCompact = width < 380;
  const paddingH = isCompact ? 14 : 20;

  // If a plan is selected, show detail view
  if (selectedPlan) {
    const currentPlanProgress = progressMap[selectedPlan.id] || {};
    const completedCount = getPlanCompletedCount(selectedPlan);
    const percent = Math.round((completedCount / selectedPlan.durationDays) * 100);

    return (
      <DetailScreen
        style={[styles.container, { backgroundColor: tokens.bgTop }]}
        header={
          <SubHeader
            eyebrow={t(selectedPlan.pace)}
            title={t(selectedPlan.title)}
            subtitle={t('Khatmah milestone progress & daily readings')}
            onBack={() => setSelectedPlanId(null)}
            backLabel={t('All Plans')}
            borderBottom
          />
        }
      >
        <DetailScreen.FlatList
          style={styles.contentWrap}
          data={selectedPlan.days}
          keyExtractor={(item) => item.day.toString()}
          contentContainerStyle={[
            styles.daysList,
            {
              paddingHorizontal: paddingH,
            },
          ]}
          ListHeaderComponent={
            <View style={{ paddingBottom: 12 }}>
              <View
                style={[
                  styles.progressCard,
                  getHeroCardShadow(mode),
                  {
                    backgroundColor: tokens.cardTop,
                    borderColor: tokens.cardBorder,
                  },
                ]}
              >
                <View style={styles.progressHeader}>
                  <AppText variant="sectionTitle" style={[styles.progressTitle, { flex: 1, minWidth: 0 }]}>
                    {completedCount} {t('of')} {selectedPlan.durationDays} {t('completed')}
                  </AppText>
                  <AppText variant="numeral" highlight style={[styles.progressPercent, { flexShrink: 0 }]}>
                    {percent}%
                  </AppText>
                </View>

                {/* Progress Bar */}
                <View style={[styles.progressBarTrack, { backgroundColor: tokens.trackColor }]}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        backgroundColor: tokens.gold,
                        width: `${percent}%`,
                      },
                    ]}
                  />
                </View>

                <AppText variant="caption" tone="faint" style={styles.planDesc}>
                  {t(selectedPlan.description)}
                </AppText>
              </View>
            </View>
          }
          renderItem={({ item }) => {
            const isCompleted = currentPlanProgress[item.day] === true;
            const displayLabel = item.label.replace('Day', t('Day')).replace('Milestone', t('Milestone'));
            const displayPortion = formatPlanPortion(item.portion, t);
            return (
              <TouchableOpacity
                style={[
                  styles.dayCard,
                  getCardShadow(mode),
                  {
                    backgroundColor: tokens.cardTop,
                    borderColor: tokens.cardBorder,
                  },
                ]}
                onPress={() => toggleDay(selectedPlan.id, item.day)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isCompleted }}
                accessibilityLabel={`${displayLabel}: ${displayPortion}. ${isCompleted ? t('Completed') : t('Not completed')}`}
              >
                <View
                  style={[
                    styles.checkCircle,
                    {
                      borderColor: isCompleted ? tokens.gold : tokens.cardBorder,
                      backgroundColor: isCompleted ? tokens.gold : tokens.ringFill,
                      flexShrink: 0,
                    },
                  ]}
                >
                  {isCompleted && (
                    <Ionicons name="checkmark" size={14} color={tokens.onGold} />
                  )}
                </View>

                <View style={[styles.dayTextWrap, { minWidth: 0 }]}>
                  <AppText
                    variant="rowTitle"
                    tone={isCompleted ? 'faint' : undefined}
                    style={[
                      styles.dayLabel,
                      {
                        textDecorationLine: isCompleted ? 'line-through' : 'none',
                      },
                    ]}
                  >
                    {displayLabel}
                  </AppText>
                  <AppText variant="caption" tone="faint" style={styles.dayPortion}>
                    {displayPortion}
                  </AppText>
                </View>

                {isCompleted && (
                  <View style={[styles.doneTagPill, getPillShadow(mode), { backgroundColor: tokens.ringFill, borderColor: tokens.ringBorder, flexShrink: 0 }]}>
                    <AppText variant="eyebrow" highlight style={styles.doneTag}>{t('Done')}</AppText>
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
        />
      </DetailScreen>
    );
  }

  // Plans List View
  return (
    <DetailScreen
      style={[styles.container, { backgroundColor: tokens.bgTop }]}
      header={
        <SubHeader
          eyebrow={t('Khatmah')}
          title={t('Reading Plans')}
          subtitle={t('Structured schedules to recite the Holy Quran at your own pace')}
          onBack={onBack}
          backLabel={t('Quran')}
          borderBottom
        />
      }
    >
      <DetailScreen.ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingHorizontal: paddingH,
          },
        ]}
      >
        <View style={styles.contentWrap}>
          <AppText variant="body" tone="faint" style={styles.introText}>
            {t('Choose a structured plan to recite the Holy Quran at your own pace. Your progress is saved automatically.')}
          </AppText>

          <View style={styles.planCards}>
            {PLANS.map((plan) => {
              const completedCount = getPlanCompletedCount(plan);
              const percent = Math.round((completedCount / plan.durationDays) * 100);

              return (
                <PremiumCard
                  key={plan.id}
                  onPress={() => setSelectedPlanId(plan.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`${t('Select reading plan')} ${t(plan.title)}`}
                  padded={false}
                  style={styles.planCard}
                >
                  <View style={styles.planCardInner}>
                    <View style={styles.planCardTop}>
                      <View style={[styles.planTitleCol, { minWidth: 0 }]}>
                        <AppText variant="title" style={styles.planCardTitle}>
                          {t(plan.title)}
                        </AppText>
                        <AppText variant="subtitle" tone="faint" style={styles.planCardSub}>
                          {t(plan.subtitle)}
                        </AppText>
                      </View>
                      <View
                        style={[
                          styles.paceBadge,
                          getPillShadow(mode),
                          {
                            backgroundColor: tokens.ringFill,
                            borderColor: tokens.ringBorder,
                            borderWidth: 1,
                            flexShrink: 0,
                          },
                        ]}
                      >
                        <AppText variant="eyebrow" highlight style={styles.paceBadgeText}>
                          {t(plan.pace)}
                        </AppText>
                      </View>
                    </View>

                    <AppText variant="caption" tone="faint" style={styles.planCardDesc}>
                      {t(plan.description)}
                    </AppText>

                    {/* Progress Bar & Status */}
                    <View style={styles.planCardFooter}>
                      <View style={[styles.progressBarTrack, { backgroundColor: tokens.trackColor, flex: 1 }]}>
                        <View
                          style={[
                            styles.progressBarFill,
                            {
                              backgroundColor: tokens.gold,
                              width: `${percent}%`,
                            },
                          ]}
                        />
                      </View>
                      <AppText variant="caption" highlight style={[styles.percentText, { flexShrink: 0 }]}>
                        {completedCount}/{plan.durationDays} ({percent}%)
                      </AppText>
                    </View>
                  </View>
                </PremiumCard>
              );
            })}
          </View>
        </View>
      </DetailScreen.ScrollView>
    </DetailScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minWidth: 0,
  },
  content: {
    paddingBottom: 40,
  },
  contentWrap: {
    flex: 1,
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
    minWidth: 0,
  },
  introText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 14,
    marginBottom: 12,
  },
  planCards: {
    gap: 14,
  },
  planCard: {
    borderRadius: 14,
  },
  planCardInner: {
    padding: 18,
  },
  planCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: 8,
  },
  planTitleCol: {
    flex: 1,
    minWidth: 0,
  },
  planCardTitle: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 22,
  },
  planCardSub: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
    marginTop: 2,
  },
  paceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  paceBadgeText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
    paddingVertical: 2,
  },
  planCardDesc: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
    marginBottom: 16,
  },
  planCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  percentText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
    paddingVertical: 2,
  },
  progressCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  progressTitle: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 15,
  },
  progressPercent: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 22,
  },
  progressBarTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    minWidth: 80,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  planDesc: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    marginTop: 12,
  },
  daysList: {
    paddingTop: 4,
    gap: 10,
  },
  dayCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 14,
    minHeight: 44,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  dayLabel: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 14,
  },
  dayPortion: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    marginTop: 2,
  },
  doneTagPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
  },
  doneTag: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
    textTransform: 'uppercase',
    paddingVertical: 2,
  },
});
