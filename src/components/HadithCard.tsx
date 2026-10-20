import React from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { AppText } from './ui/AppText';
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
  return (
    <Card style={styles.card} testID="hadith-card">
      <View style={styles.header}>
        <AppText variant="eyebrow" style={styles.eyebrow}>{t('Hadith of the Day')}</AppText>
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
            <AppText
              variant="eyebrow"
              tone={loading ? 'faint' : undefined}
              style={styles.refreshText}
            >
              {loading ? t('Loading...') : t('Another')}
            </AppText>
          </TouchableOpacity>
        )}
      </View>

      <Hairline style={styles.divider} />

      <ArabicText size={22} align="right" style={styles.arabic} numberOfLines={8}>
        {hadith.arabic}
      </ArabicText>

      <View style={styles.translationWrap}>
        <AppText variant="body" style={styles.translation}>{hadith.translation}</AppText>
      </View>

      <AppText variant="caption" tone="faint" style={styles.source}>{hadith.source}</AppText>
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