import React from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { t } from '../lib/i18n';
import { Card } from './Card';
import { ArabicText } from './ArabicText';
import { Hairline } from './Hairline';
import { AyahOfDay } from '../lib/useAyahOfDay';
import { AppText } from './ui/AppText';

interface AyahCardProps {
  ayah: AyahOfDay;
  onRefresh?: () => void;
  onLongPress?: () => void;
}

export function AyahCard({ ayah, onRefresh }: AyahCardProps) {
  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <AppText variant="eyebrow" style={styles.eyebrow}>{t('Ayah of the Day')}</AppText>
        {onRefresh && (
          <TouchableOpacity
            onPress={onRefresh}
            style={styles.refreshBtn}
            accessibilityRole="button"
            accessibilityLabel={t('Refresh Ayah of the Day')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <AppText variant="link" style={styles.refreshText}>{t('Refresh')}</AppText>
          </TouchableOpacity>
        )}
      </View>

      <Hairline style={styles.divider} />

      <ArabicText size={22} align="right" style={styles.arabic} numberOfLines={8}>
        {ayah.arabic}
      </ArabicText>

      <View style={styles.translationWrap}>
        <AppText variant="body" style={styles.translation}>{ayah.translation}</AppText>
      </View>

      <AppText variant="caption" style={styles.source}>{ayah.reference}</AppText>
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
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  refreshBtn: {
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  refreshText: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
  },
  divider: {
    marginBottom: 16,
  },
  arabic: {
    marginBottom: 14,
    lineHeight: 38,
  },
  translationWrap: {
    marginBottom: 14,
  },
  translation: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 14,
    lineHeight: 22,
  },
  source: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
    letterSpacing: 0.5,
  },
});
