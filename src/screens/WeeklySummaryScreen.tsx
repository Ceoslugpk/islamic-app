import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useThemeTokens, cardTokens, fontRoles } from '../theme/tokens';
import { SubHeader } from '../components/layout/SubHeader';
import { DetailScreen } from '../components/layout/DetailScreen';
import { PremiumCard } from '../components/ui';
import { Hairline } from '../components/Hairline';
import { buildWeeklySummary, WeeklySummary } from '../lib/weeklySummary';

interface Props {
  onBack: () => void;
  backLabel?: string;
}

export function WeeklySummaryScreen({ onBack, backLabel }: Props) {
  const { t } = useTranslation();
  const { tokens, mode } = useThemeTokens();
  const [summary, setSummary] = useState<WeeklySummary | null>(null);
  const [loading, setLoading] = useState(true);

  const { width } = useWindowDimensions();
  const maxW = Math.min(width, 680);
  const isCompact = width < 380;
  const paddingH = isCompact ? 16 : 20;

  useEffect(() => {
    (async () => {
      try {
        const s = await buildWeeklySummary();
        setSummary(s);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const fmtDate = (iso: string) => {
    try {
      return new Date(iso + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch {
      return iso;
    }
  };

  return (
    <DetailScreen
      style={{ backgroundColor: tokens.bgTop }}
      header={
        <SubHeader
          title={t('Weekly Summary')}
          subtitle={t('Your past 7 days, at a glance: Quran recitation, prayer consistency, Hifz milestones, and study reflections.')}
          eyebrow={t('Personal Journey')}
          backLabel={backLabel ? t(backLabel) : t('Library')}
          onBack={onBack}
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
            alignSelf: 'center',
            width: '100%',
            maxWidth: maxW,
            paddingHorizontal: paddingH,
          },
        ]}
      >
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={tokens.goldText} size="large" />
          </View>
        ) : summary ? (
          <>
            {/* Hero Overview Card */}
            <PremiumCard
              style={styles.heroCard}
              padded
            >
              <View style={styles.heroTopRow}>
                <View style={[styles.heroBadge, { backgroundColor: tokens.ringFill, borderColor: tokens.goldBorder }]}>
                  <Ionicons name="sparkles" size={13} color={tokens.goldText} />
                  <Text style={[styles.heroBadgeText, { color: tokens.goldText }]}>
                    {t('7-Day Overview')}
                  </Text>
                </View>
                <View style={[styles.dateRangePill, { backgroundColor: tokens.inset }]}>
                  <Ionicons name="calendar-outline" size={12} color={tokens.textMuted} />
                  <Text style={[styles.dateRangeText, { color: tokens.textSecondary }]}>
                    {fmtDate(summary.weekStart)} – {fmtDate(summary.weekEnd)}
                  </Text>
                </View>
              </View>

              <Text style={[styles.heroTitle, { color: tokens.textPrimary }]}>
                {t('A Week of Devotion & Learning')}
              </Text>
              <Text style={[styles.heroDesc, { color: tokens.textSecondary }]}>
                {t('Gentle on-device reflection of your daily habits and spiritual consistency.')}
              </Text>

              <View style={[styles.statGrid, { borderTopColor: tokens.cardBorder }]}>
                <View style={styles.statCol}>
                  <Text style={[styles.statNum, { color: tokens.goldText }]}>{summary.totalAyahsRead}</Text>
                  <Text style={[styles.statLabel, { color: tokens.textMuted }]}>{t('Ayahs')}</Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: tokens.goldBorder }]} />
                <View style={styles.statCol}>
                  <Text style={[styles.statNum, { color: tokens.goldText }]}>{summary.salahDays}</Text>
                  <Text style={[styles.statLabel, { color: tokens.textMuted }]}>{t('Salah Days')}</Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: tokens.goldBorder }]} />
                <View style={styles.statCol}>
                  <Text style={[styles.statNum, { color: tokens.goldText }]}>{summary.totalReadingMinutes}</Text>
                  <Text style={[styles.statLabel, { color: tokens.textMuted }]}>{t('Mins Listened')}</Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: tokens.goldBorder }]} />
                <View style={styles.statCol}>
                  <Text style={[styles.statNum, { color: tokens.goldText }]}>{summary.salahStreak}</Text>
                  <Text style={[styles.statLabel, { color: tokens.textMuted }]}>{t('Day Streak')}</Text>
                </View>
              </View>
            </PremiumCard>

            {/* Quran reading card */}
            <Text style={[styles.groupLabel, { color: tokens.goldText }]}>{t('QURAN READING')}</Text>
            <PremiumCard style={styles.card} padded>
              <View style={styles.row}>
                <View style={[styles.iconWrap, { backgroundColor: tokens.ringFill }]}>
                  <Ionicons name="book-outline" size={18} color={tokens.goldText} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.cardStatValue, { color: tokens.textPrimary }]}>{summary.totalAyahsRead}</Text>
                  <Text style={[styles.cardStatLabel, { color: tokens.textMuted }]}>{t('ayahs read this week')}</Text>
                </View>
                <View style={styles.rowRight}>
                  <Text style={[styles.cardStatValue, { color: tokens.textPrimary }]}>{summary.daysRead}</Text>
                  <Text style={[styles.cardStatLabel, { color: tokens.textMuted }]}>{t('days active')}</Text>
                </View>
              </View>
              <Hairline style={{ marginVertical: 12 }} />
              <View style={styles.row}>
                <View style={[styles.iconWrap, { backgroundColor: tokens.ringFill }]}>
                  <Ionicons name="time-outline" size={18} color={tokens.goldText} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.cardStatValue, { color: tokens.textPrimary }]}>{summary.totalReadingMinutes}</Text>
                  <Text style={[styles.cardStatLabel, { color: tokens.textMuted }]}>{t('minutes of listening')}</Text>
                </View>
              </View>
            </PremiumCard>

            {/* Salah card */}
            <Text style={[styles.groupLabel, { color: tokens.goldText }]}>{t('SALAH')}</Text>
            <PremiumCard style={styles.card} padded>
              <View style={styles.row}>
                <View style={[styles.iconWrap, { backgroundColor: tokens.ringFill }]}>
                  <Ionicons name="checkmark-done-outline" size={18} color={tokens.goldText} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.cardStatValue, { color: tokens.textPrimary }]}>{summary.salahDays}</Text>
                  <Text style={[styles.cardStatLabel, { color: tokens.textMuted }]}>{t('days with salah logged')}</Text>
                </View>
                <View style={styles.rowRight}>
                  <Text style={[styles.cardStatValue, { color: tokens.textPrimary }]}>{summary.salahStreak}</Text>
                  <Text style={[styles.cardStatLabel, { color: tokens.textMuted }]}>{t('day streak')}</Text>
                </View>
              </View>
            </PremiumCard>

            {/* Hifz card */}
            <Text style={[styles.groupLabel, { color: tokens.goldText }]}>{t('HIFZ')}</Text>
            <PremiumCard style={styles.card} padded>
              <View style={styles.row}>
                <View style={[styles.iconWrap, { backgroundColor: tokens.ringFill }]}>
                  <Ionicons name="ribbon-outline" size={18} color={tokens.goldText} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.cardStatValue, { color: tokens.textPrimary }]}>{summary.hifzMemorized}</Text>
                  <Text style={[styles.cardStatLabel, { color: tokens.textMuted }]}>{t('surahs memorized')}</Text>
                </View>
              </View>
            </PremiumCard>

            {/* Notes card */}
            <Text style={[styles.groupLabel, { color: tokens.goldText }]}>{t('NOTES')}</Text>
            <PremiumCard style={styles.card} padded>
              <View style={styles.row}>
                <View style={[styles.iconWrap, { backgroundColor: tokens.ringFill }]}>
                  <Ionicons name="create-outline" size={18} color={tokens.goldText} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.cardStatValue, { color: tokens.textPrimary }]}>{summary.notesAdded}</Text>
                  <Text style={[styles.cardStatLabel, { color: tokens.textMuted }]}>{t('notes added this week')}</Text>
                </View>
              </View>
            </PremiumCard>

            <View style={styles.footnoteRow}>
              <Ionicons name="shield-checkmark-outline" size={14} color={tokens.textMuted} />
              <Text style={[styles.footnote, { color: tokens.textMuted }]}>
                {t('All data stays on your device. Recap updates each time you open it.')}
              </Text>
            </View>
          </>
        ) : (
          <View style={styles.center}>
            <Text style={[styles.errorText, { color: tokens.textSecondary }]}>
              {t('Could not build your weekly summary.')}
            </Text>
          </View>
        )}
      </DetailScreen.ScrollView>
    </DetailScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 14 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 },
  heroCard: {
    marginBottom: 16,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 8,
    flexWrap: 'wrap',
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: cardTokens.borderWidth,
  },
  heroBadgeText: {
    fontFamily: fontRoles.uiBold,
    fontSize: 11,
    letterSpacing: 0.5,
  },
  dateRangePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
  },
  dateRangeText: {
    fontFamily: fontRoles.ui,
    fontSize: 11,
  },
  heroTitle: {
    fontFamily: fontRoles.title,
    fontSize: 20,
    marginBottom: 4,
  },
  heroDesc: {
    fontFamily: fontRoles.ui,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 14,
  },
  statGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: 10,
    borderTopWidth: cardTokens.borderWidth,
  },
  statCol: {
    alignItems: 'center',
    flex: 1,
  },
  statDivider: {
    width: 1,
    height: 28,
  },
  statNum: {
    fontFamily: fontRoles.titleFallback,
    fontSize: 24,
    lineHeight: 26,
  },
  statLabel: {
    fontFamily: fontRoles.ui,
    fontSize: 10,
    marginTop: 2,
    textAlign: 'center',
  },
  groupLabel: {
    fontFamily: fontRoles.eyebrow,
    fontSize: 11,
    letterSpacing: 1.2,
    marginTop: 10,
    marginBottom: 6,
  },
  card: {
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowRight: {
    alignItems: 'flex-end',
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardStatValue: {
    fontFamily: fontRoles.titleFallback,
    fontSize: 24,
    lineHeight: 26,
  },
  cardStatLabel: {
    fontFamily: fontRoles.ui,
    fontSize: 12,
    marginTop: 1,
  },
  footnoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 18,
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  footnote: {
    fontFamily: fontRoles.ui,
    fontSize: 11,
    textAlign: 'center',
  },
  errorText: {
    fontFamily: fontRoles.ui,
    fontSize: 14,
  },
});
