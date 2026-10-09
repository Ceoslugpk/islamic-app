import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '../lib/theme';
import { t } from '../lib/i18n';
import { Card } from './Card';
import { ArabicText } from './ArabicText';
import { Hairline } from './Hairline';

interface HadithCardProps {
  hadith: {
    arabic: string;
    translation: string;
    source: string;
  };
  onRefresh?: () => void;
  loading?: boolean;
}

export function HadithCard({ hadith, onRefresh, loading }: HadithCardProps) {
  const { colors } = useTheme();

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Text style={[styles.eyebrow, { color: colors.accent }]}>{t('Hadith of the Day')}</Text>
        {onRefresh && (
          <TouchableOpacity
            onPress={onRefresh}
            disabled={loading}
            style={styles.refreshBtn}
            accessibilityRole="button"
            accessibilityLabel={loading ? t('Loading hadith') : t('Show another hadith')}
            accessibilityState={{ disabled: !!loading }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text
              style={[
                styles.refreshText,
                // textMuted fails contrast on bgSurface (3.15:1) — use
                // textSecondary for the disabled state instead.
                { color: loading ? colors.textSecondary : colors.accent },
              ]}
            >
              {loading ? t('Loading...') : t('Another')}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <Hairline style={styles.divider} />

      <ArabicText size={22} align="right" style={styles.arabic} numberOfLines={8}>
        {hadith.arabic}
      </ArabicText>

      <View style={styles.translationWrap}>
        <Text style={[styles.translation, { color: colors.textSecondary }]}>{hadith.translation}</Text>
      </View>

      <Text style={[styles.source, { color: colors.textSecondary }]}>{hadith.source}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  eyebrow: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  refreshBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  refreshText: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  divider: {
    marginVertical: 12,
  },
  arabic: {
    marginBottom: 12,
    lineHeight: 34,
  },
  translationWrap: {
    marginBottom: 8,
  },
  translation: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 15,
    lineHeight: 22,
  },
  source: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 11,
    letterSpacing: 0.3,
    textAlign: 'right',
  },
});