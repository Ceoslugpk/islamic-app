import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  FlatList,
  useWindowDimensions,
  BackHandler,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme';
import { t } from '../lib/i18n';
import { ScreenHeader } from '../components/ScreenHeader';
import { Hairline } from '../components/Hairline';
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
  const { colors } = useTheme();
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [progressMap, setProgressMap] = useState<Record<string, Record<number, boolean>>>({});

  // Load progress for all plans on mount
  useEffect(() => {
    const loaded: Record<string, Record<number, boolean>> = {};
    for (const plan of PLANS) {
      loaded[plan.id] = loadPlanProgress(plan.id);
    }
    setProgressMap(loaded);
  }, []);

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

  const { width } = useWindowDimensions();
  const isCompact = width < 380;
  const paddingH = isCompact ? 16 : 20;

  // If a plan is selected, show detail view
  if (selectedPlan) {
    const currentPlanProgress = progressMap[selectedPlan.id] || {};
    const completedCount = getPlanCompletedCount(selectedPlan);
    const percent = Math.round((completedCount / selectedPlan.durationDays) * 100);

    return (
      <View style={[styles.container, { backgroundColor: colors.bgBase, paddingHorizontal: paddingH }]}>
        <View style={styles.contentWrap}>
          <ScreenHeader
            eyebrow={t(selectedPlan.pace)}
            title={t(selectedPlan.title)}
            onBack={() => setSelectedPlanId(null)}
            backLabel={t('All Plans')}
          />

        {/* Progress Card */}
        <View
          style={[
            styles.progressCard,
            {
              backgroundColor: colors.bgSurface,
              borderColor: colors.borderSubtle,
            },
          ]}
        >
          <View style={styles.progressHeader}>
            <Text style={[styles.progressTitle, { color: colors.textPrimary }]}>
              {completedCount} {t('of')} {selectedPlan.durationDays} {t('completed')}
            </Text>
            <Text style={[styles.progressPercent, { color: colors.accent }]}>
              {percent}%
            </Text>
          </View>

          {/* Progress Bar */}
          <View style={[styles.progressBarTrack, { backgroundColor: colors.borderSubtle }]}>
            <View
              style={[
                styles.progressBarFill,
                {
                  backgroundColor: colors.accent,
                  width: `${percent}%`,
                },
              ]}
            />
          </View>

          <Text style={[styles.planDesc, { color: colors.textMuted }]}>
            {t(selectedPlan.description)}
          </Text>
        </View>

        {/* Daily Checklist */}
        <FlatList
          data={selectedPlan.days}
          keyExtractor={(item) => item.day.toString()}
          ItemSeparatorComponent={Hairline}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.daysList}
          renderItem={({ item }) => {
            const isCompleted = currentPlanProgress[item.day] === true;
            const displayLabel = item.label.replace('Day', t('Day')).replace('Milestone', t('Milestone'));
            const displayPortion = item.portion.replace('Juz', t('Juz')).replace('Part', t('Part'));
            return (
              <TouchableOpacity
                style={styles.dayRow}
                onPress={() => toggleDay(selectedPlan.id, item.day)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isCompleted }}
                accessibilityLabel={`${displayLabel}: ${displayPortion}. ${isCompleted ? t('Completed') : t('Not completed')}`}
              >
                <View
                  style={[
                    styles.checkCircle,
                    {
                      borderColor: isCompleted ? colors.accent : colors.borderSubtle,
                      backgroundColor: isCompleted ? colors.accent : 'transparent',
                    },
                  ]}
                >
                  {isCompleted && (
                    <Ionicons name="checkmark" size={14} color={colors.bgBase} />
                  )}
                </View>

                <View style={styles.dayTextWrap}>
                  <Text
                    style={[
                      styles.dayLabel,
                      {
                        color: isCompleted ? colors.textMuted : colors.textPrimary,
                        textDecorationLine: isCompleted ? 'line-through' : 'none',
                      },
                    ]}
                  >
                    {displayLabel}
                  </Text>
                  <Text style={[styles.dayPortion, { color: colors.textSecondary }]}>
                    {displayPortion}
                  </Text>
                </View>

                {isCompleted && (
                  <Text style={[styles.doneTag, { color: colors.accent }]}>{t('Done')}</Text>
                )}
              </TouchableOpacity>
            );
          }}
        />
        </View>
      </View>
    );
  }

  // Plans List View
  return (
    <ScrollView
      style={{ backgroundColor: colors.bgBase }}
      contentContainerStyle={[styles.content, { paddingHorizontal: paddingH }]}
    >
      <View style={styles.contentWrap}>
        <ScreenHeader
          eyebrow={t('Khatmah')}
          title={t('Reading Plans')}
          onBack={onBack}
          backLabel={t('Quran')}
        />

      <Text style={[styles.introText, { color: colors.textSecondary }]}>
        {t('Choose a structured plan to recite the Holy Quran at your own pace. Your progress is saved automatically.')}
      </Text>

      <View style={styles.planCards}>
        {PLANS.map((plan) => {
          const completedCount = getPlanCompletedCount(plan);
          const percent = Math.round((completedCount / plan.durationDays) * 100);

          return (
            <TouchableOpacity
              key={plan.id}
              style={[
                styles.planCard,
                {
                  backgroundColor: colors.bgSurface,
                  borderColor: colors.borderSubtle,
                },
              ]}
              onPress={() => setSelectedPlanId(plan.id)}
              accessibilityRole="button"
              accessibilityLabel={`${t('Select reading plan')} ${t(plan.title)}`}
            >
              <View style={styles.planCardTop}>
                <View style={styles.planTitleCol}>
                  <Text style={[styles.planCardTitle, { color: colors.textPrimary }]}>
                    {t(plan.title)}
                  </Text>
                  <Text style={[styles.planCardSub, { color: colors.textMuted }]}>
                    {t(plan.subtitle)}
                  </Text>
                </View>
                <View
                  style={[
                    styles.paceBadge,
                    {
                      backgroundColor: colors.accentDim,
                      borderColor: colors.accent,
                    },
                  ]}
                >
                  <Text style={[styles.paceBadgeText, { color: colors.accent }]}>
                    {t(plan.pace)}
                  </Text>
                </View>
              </View>

              <Text style={[styles.planCardDesc, { color: colors.textSecondary }]}>
                {t(plan.description)}
              </Text>

              {/* Progress Bar & Status */}
              <View style={styles.planCardFooter}>
                <View style={[styles.progressBarTrack, { backgroundColor: colors.borderSubtle, flex: 1 }]}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        backgroundColor: colors.accent,
                        width: `${percent}%`,
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.percentText, { color: colors.accent }]}>
                  {completedCount}/{plan.durationDays} ({percent}%)
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingVertical: 20,
    paddingBottom: 0,
  },
  content: {
    paddingVertical: 10,
    paddingBottom: 40,
  },
  contentWrap: {
    flex: 1,
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
  },
  introText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12.5,
    lineHeight: 18,
    marginBottom: 12,
  },
  planCards: {
    gap: 16,
  },
  planCard: {
    borderWidth: 1,
    borderRadius: 14,
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
    borderRadius: 6,
    borderWidth: 1,
  },
  paceBadgeText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
  },
  planCardDesc: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 16,
  },
  planCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  percentText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
  },
  progressCard: {
    borderWidth: 1,
    borderRadius: 14,
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
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  planDesc: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 12,
  },
  daysList: {
    paddingBottom: 30,
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 14,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayTextWrap: {
    flex: 1,
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
  doneTag: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
    textTransform: 'uppercase',
  },
});
