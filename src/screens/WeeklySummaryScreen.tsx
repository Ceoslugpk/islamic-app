import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../lib/theme';
import { ScreenHeader } from '../components/ScreenHeader';
import { buildWeeklySummary, WeeklySummary } from '../lib/weeklySummary';

interface Props {
  onBack: () => void;
  backLabel?: string;
}

export function WeeklySummaryScreen({ onBack, backLabel }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [summary, setSummary] = useState<WeeklySummary | null>(null);
  const [loading, setLoading] = useState(true);

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
    <View style={[styles.container, { backgroundColor: colors.bgBase }]}>
      <ScreenHeader
        title={t('Weekly Summary')}
        subtitle={t('Your past 7 days, at a glance')}
        eyebrow={t('Learn')}
        backLabel={backLabel ? t(backLabel) : t('Library')}
        onBack={onBack}
      />

      <ScrollView contentContainerStyle={styles.content} style={{ flex: 1 }}>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.accent} size="large" />
          </View>
        ) : summary ? (
          <>
            <Text style={[styles.range, { color: colors.textMuted }]}>
              {fmtDate(summary.weekStart)} – {fmtDate(summary.weekEnd)}
            </Text>

            {/* Quran reading */}
            <Text style={[styles.groupLabel, { color: colors.accent }]}>{t('QURAN READING')}</Text>
            <View style={[styles.card, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }]}>
              <View style={styles.row}>
                <View style={[styles.iconWrap, { backgroundColor: colors.accentDim }]}>
                  <Ionicons name="book-outline" size={18} color={colors.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.statValue, { color: colors.textPrimary }]}>{summary.totalAyahsRead}</Text>
                  <Text style={[styles.statLabel, { color: colors.textMuted }]}>{t('ayahs read this week')}</Text>
                </View>
                <View style={styles.rowRight}>
                  <Text style={[styles.statValue, { color: colors.textPrimary }]}>{summary.daysRead}</Text>
                  <Text style={[styles.statLabel, { color: colors.textMuted }]}>{t('days active')}</Text>
                </View>
              </View>
              <View style={[styles.hairline, { backgroundColor: colors.borderSubtle }]} />
              <View style={styles.row}>
                <View style={[styles.iconWrap, { backgroundColor: colors.accentDim }]}>
                  <Ionicons name="time-outline" size={18} color={colors.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.statValue, { color: colors.textPrimary }]}>{summary.totalReadingMinutes}</Text>
                  <Text style={[styles.statLabel, { color: colors.textMuted }]}>{t('minutes of listening')}</Text>
                </View>
              </View>
            </View>

            {/* Salah */}
            <Text style={[styles.groupLabel, { color: colors.accent }]}>{t('SALAH')}</Text>
            <View style={[styles.card, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }]}>
              <View style={styles.row}>
                <View style={[styles.iconWrap, { backgroundColor: colors.accentDim }]}>
                  <Ionicons name="checkmark-done-outline" size={18} color={colors.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.statValue, { color: colors.textPrimary }]}>{summary.salahDays}</Text>
                  <Text style={[styles.statLabel, { color: colors.textMuted }]}>{t('days with salah logged')}</Text>
                </View>
                <View style={styles.rowRight}>
                  <Text style={[styles.statValue, { color: colors.textPrimary }]}>{summary.salahStreak}</Text>
                  <Text style={[styles.statLabel, { color: colors.textMuted }]}>{t('day streak')}</Text>
                </View>
              </View>
            </View>

            {/* Hifz */}
            <Text style={[styles.groupLabel, { color: colors.accent }]}>{t('HIFZ')}</Text>
            <View style={[styles.card, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }]}>
              <View style={styles.row}>
                <View style={[styles.iconWrap, { backgroundColor: colors.accentDim }]}>
                  <Ionicons name="ribbon-outline" size={18} color={colors.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.statValue, { color: colors.textPrimary }]}>{summary.hifzMemorized}</Text>
                  <Text style={[styles.statLabel, { color: colors.textMuted }]}>{t('surahs memorized')}</Text>
                </View>
              </View>
            </View>

            {/* Notes */}
            <Text style={[styles.groupLabel, { color: colors.accent }]}>{t('NOTES')}</Text>
            <View style={[styles.card, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }]}>
              <View style={styles.row}>
                <View style={[styles.iconWrap, { backgroundColor: colors.accentDim }]}>
                  <Ionicons name="create-outline" size={18} color={colors.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.statValue, { color: colors.textPrimary }]}>{summary.notesAdded}</Text>
                  <Text style={[styles.statLabel, { color: colors.textMuted }]}>{t('notes added this week')}</Text>
                </View>
              </View>
            </View>

            <Text style={[styles.footnote, { color: colors.textMuted }]}>
              {t('All data stays on your device. Recap updates each time you open it.')}
            </Text>
          </>
        ) : (
          <View style={styles.center}>
            <Text style={[styles.errorText, { color: colors.textSecondary }]}>
              {t('Could not build your weekly summary.')}
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 },
  range: { fontFamily: 'Manrope_400Regular', fontSize: 13, marginBottom: 18, textAlign: 'center' },
  groupLabel: { fontFamily: 'Manrope_700Bold', fontSize: 11, letterSpacing: 1.2, marginTop: 14, marginBottom: 8 },
  card: { borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowRight: { alignItems: 'flex-end' },
  iconWrap: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontFamily: 'InstrumentSerif_400Regular', fontSize: 26, lineHeight: 28 },
  statLabel: { fontFamily: 'Manrope_400Regular', fontSize: 12, marginTop: 1 },
  hairline: { height: 1, marginVertical: 12 },
  footnote: { fontFamily: 'Manrope_400Regular', fontSize: 11, textAlign: 'center', marginTop: 18 },
  errorText: { fontFamily: 'Manrope_400Regular', fontSize: 14 },
});
