import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, useWindowDimensions } from 'react-native';
import { AppText } from '../components/ui/AppText';
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
  const { tokens } = useThemeTokens();
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
                  <AppText variant="eyebrow" highlight style={styles.heroBadgeText}>
                    {t('7-Day Overview')}
                  </AppText>
                </View>
                <View style={[styles.dateRangePill, { backgroundColor: tokens.inset }]}>
                  <Ionicons name="calendar-outline" size={12} color={tokens.textMuted} />
                  <AppText variant="caption" style={styles.dateRangeText}>
                    {fmtDate(summary.weekStart)} – {fmtDate(summary.weekEnd)}
                  </AppText>
                </View>
              </View>

              <AppText variant="title" style={styles.heroTitle}>
                {t('A Week of Devotion & Learning')}
              </AppText>
              <AppText variant="body" style={styles.heroDesc}>
                {t('Gentle on-device reflection of your daily habits and spiritual consistency.')}
              </AppText>

              <View style={[styles.statGrid, { borderTopColor: tokens.cardBorder }]}>
                <View style={styles.statCol}>
                  <AppText variant="numeral" highlight style={styles.statNum}>{summary.totalAyahsRead}</AppText>
                  <AppText variant="caption" tone="faint" style={styles.statLabel}>{t('Ayahs')}</AppText>
                </View>
                <View style={[styles.statDivider, { backgroundColor: tokens.goldBorder }]} />
                <View style={styles.statCol}>
                  <AppText variant="numeral" highlight style={styles.statNum}>{summary.salahDays}</AppText>
                  <AppText variant="caption" tone="faint" style={styles.statLabel}>{t('Salah Days')}</AppText>
                </View>
                <View style={[styles.statDivider, { backgroundColor: tokens.goldBorder }]} />
                <View style={styles.statCol}>
                  <AppText variant="numeral" highlight style={styles.statNum}>{summary.totalReadingMinutes}</AppText>
                  <AppText variant="caption" tone="faint" style={styles.statLabel}>{t('Mins Listened')}</AppText>
                </View>
                <View style={[styles.statDivider, { backgroundColor: tokens.goldBorder }]} />
                <View style={styles.statCol}>
                  <AppText variant="numeral" highlight style={styles.statNum}>{summary.salahStreak}</AppText>
                  <AppText variant="caption" tone="faint" style={styles.statLabel}>{t('Day Streak')}</AppText>
                </View>
              </View>
            </PremiumCard>

            {/* Quran reading card */}
            <AppText variant="eyebrow" highlight style={styles.groupLabel}>{t('QURAN READING')}</AppText>
            <PremiumCard style={styles.card} padded>
              <View style={styles.row}>
                <View style={[styles.iconWrap, { backgroundColor: tokens.ringFill }]}>
                  <Ionicons name="book-outline" size={18} color={tokens.goldText} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <AppText variant="numeral" style={styles.cardStatValue}>{summary.totalAyahsRead}</AppText>
                  <AppText variant="caption" tone="faint" style={styles.cardStatLabel}>{t('ayahs read this week')}</AppText>
                </View>
                <View style={[styles.rowRight, { flexShrink: 0 }]}>
                  <AppText variant="numeral" style={styles.cardStatValue}>{summary.daysRead}</AppText>
                  <AppText variant="caption" tone="faint" style={styles.cardStatLabel}>{t('days active')}</AppText>
                </View>
              </View>
              <Hairline style={{ marginVertical: 12 }} />
              <View style={styles.row}>
                <View style={[styles.iconWrap, { backgroundColor: tokens.ringFill }]}>
                  <Ionicons name="time-outline" size={18} color={tokens.goldText} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <AppText variant="numeral" style={styles.cardStatValue}>{summary.totalReadingMinutes}</AppText>
                  <AppText variant="caption" tone="faint" style={styles.cardStatLabel}>{t('minutes of listening')}</AppText>
                </View>
              </View>
            </PremiumCard>

            {/* Salah card */}
            <AppText variant="eyebrow" highlight style={styles.groupLabel}>{t('SALAH')}</AppText>
            <PremiumCard style={styles.card} padded>
              <View style={styles.row}>
                <View style={[styles.iconWrap, { backgroundColor: tokens.ringFill }]}>
                  <Ionicons name="checkmark-done-outline" size={18} color={tokens.goldText} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <AppText variant="numeral" style={styles.cardStatValue}>{summary.salahDays}</AppText>
                  <AppText variant="caption" tone="faint" style={styles.cardStatLabel}>{t('days with salah logged')}</AppText>
                </View>
                <View style={[styles.rowRight, { flexShrink: 0 }]}>
                  <AppText variant="numeral" style={styles.cardStatValue}>{summary.salahStreak}</AppText>
                  <AppText variant="caption" tone="faint" style={styles.cardStatLabel}>{t('day streak')}</AppText>
                </View>
              </View>
            </PremiumCard>

            {/* Hifz card */}
            <AppText variant="eyebrow" highlight style={styles.groupLabel}>{t('HIFZ')}</AppText>
            <PremiumCard style={styles.card} padded>
              <View style={styles.row}>
                <View style={[styles.iconWrap, { backgroundColor: tokens.ringFill }]}>
                  <Ionicons name="ribbon-outline" size={18} color={tokens.goldText} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <AppText variant="numeral" style={styles.cardStatValue}>{summary.hifzMemorized}</AppText>
                  <AppText variant="caption" tone="faint" style={styles.cardStatLabel}>{t('surahs memorized')}</AppText>
                </View>
              </View>
            </PremiumCard>

            {/* Notes card */}
            <AppText variant="eyebrow" highlight style={styles.groupLabel}>{t('NOTES')}</AppText>
            <PremiumCard style={styles.card} padded>
              <View style={styles.row}>
                <View style={[styles.iconWrap, { backgroundColor: tokens.ringFill }]}>
                  <Ionicons name="create-outline" size={18} color={tokens.goldText} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <AppText variant="numeral" style={styles.cardStatValue}>{summary.notesAdded}</AppText>
                  <AppText variant="caption" tone="faint" style={styles.cardStatLabel}>{t('notes added this week')}</AppText>
                </View>
              </View>
            </PremiumCard>

            <View style={styles.footnoteRow}>
              <Ionicons name="shield-checkmark-outline" size={14} color={tokens.textMuted} style={{ flexShrink: 0 }} />
              <AppText variant="caption" tone="faint" style={styles.footnote}>
                {t('All data stays on your device. Recap updates each time you open it.')}
              </AppText>
            </View>
          </>
        ) : (
          <View style={styles.center}>
            <AppText variant="body" tone="faint" style={styles.errorText}>
              {t('Could not build your weekly summary.')}
            </AppText>
          </View>
        )}
      </DetailScreen.ScrollView>
    </DetailScreen>
  );
}

const styles = StyleSheet.create({
  content: {},
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    minWidth: 0,
  },
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
    paddingVertical: 2,
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
    fontSize: 12,
    paddingVertical: 2,
  },
  heroTitle: {
    fontFamily: fontRoles.title,
    fontSize: 20,
    marginBottom: 4,
  },
  heroDesc: {
    fontFamily: fontRoles.ui,
    fontSize: 14,
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
    minWidth: 0,
  },
  statDivider: {
    width: 1,
    height: 28,
  },
  statNum: {
    fontFamily: fontRoles.titleFallback,
    fontSize: 24,
  },
  statLabel: {
    fontFamily: fontRoles.ui,
    fontSize: 12,
    marginTop: 2,
    textAlign: 'center',
    paddingVertical: 2,
  },
  groupLabel: {
    fontFamily: fontRoles.eyebrow,
    fontSize: 11,
    letterSpacing: 1.2,
    marginTop: 10,
    marginBottom: 6,
    paddingVertical: 2,
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
    marginBottom: 0,
    paddingHorizontal: 16,
  },
  footnote: {
    fontFamily: fontRoles.ui,
    fontSize: 12,
    textAlign: 'center',
    flex: 1,
    minWidth: 0,
  },
  errorText: {
    fontFamily: fontRoles.ui,
    fontSize: 14,
  },
});
