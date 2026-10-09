import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '../lib/theme';
import { t } from '../lib/i18n';
import { Card } from './Card';
import { ArabicText } from './ArabicText';
import { Hairline } from './Hairline';
import { AyahOfDay } from '../lib/useAyahOfDay';

interface AyahCardProps {
  ayah: AyahOfDay;
  onRefresh?: () => void;
  onLongPress?: () => void;
}

export function AyahCard({ ayah, onRefresh }: AyahCardProps) {
  const { colors } = useTheme();

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Text style={[styles.eyebrow, { color: colors.accent }]}>{t('Ayah of the Day')}</Text>
        {onRefresh && (
          <TouchableOpacity
            onPress={onRefresh}
            style={styles.refreshBtn}
            accessibilityRole="button"
            accessibilityLabel={t('Refresh Ayah of the Day')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={[styles.refreshText, { color: colors.accent }]}>{t('Refresh')}</Text>
          </TouchableOpacity>
        )}
      </View>

      <Hairline style={styles.divider} />

      <ArabicText size={22} align="right" style={styles.arabic} numberOfLines={8}>
        {ayah.arabic}
      </ArabicText>

      <View style={styles.translationWrap}>
        <Text style={[styles.translation, { color: colors.textSecondary }]}>{ayah.translation}</Text>
      </View>

      <Text style={[styles.source, { color: colors.textSecondary }]}>{ayah.reference}</Text>
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
