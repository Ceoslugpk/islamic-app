import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { useTheme } from '../lib/theme';
import { PrayerCountdown } from './PrayerCountdown';

export interface CompactPrayerBarProps {
  prayerName: string;
  prayerTime: string;
  targetTime?: string;
  onPress?: () => void;
  onExpire?: () => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * CompactPrayerBar: A slim, persistent top pill displaying the current/upcoming
 * prayer name and time on the left, paired with the live tabular countdown on the right.
 * Cross-fades into view as the user scrolls past the full Prayer Hero centerpiece.
 */
export function CompactPrayerBar({
  prayerName,
  prayerTime,
  targetTime,
  onPress,
  onExpire,
  style,
}: CompactPrayerBarProps) {
  const { colors } = useTheme();

  const content = (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.bgSurface,
          borderColor: colors.borderSubtle,
        },
        style,
      ]}
    >
      {/* Left: Indicator dot + MAGHRIB · 18:21 */}
      <View style={styles.leftRow}>
        <View style={[styles.statusDot, { backgroundColor: colors.accent }]} />
        <Text style={[styles.prayerName, { color: colors.textPrimary }]} numberOfLines={1}>
          {prayerName.toUpperCase()}
        </Text>
        <Text style={[styles.separator, { color: colors.textMuted }]}>·</Text>
        <Text style={[styles.prayerTime, { color: colors.textPrimary }]}>
          {prayerTime}
        </Text>
      </View>

      {/* Right: Tabular countdown figures */}
      <View style={styles.rightRow}>
        <PrayerCountdown
          targetTime={targetTime}
          color={colors.accent}
          separatorColor={colors.textMuted}
          fontSize={13}
          onExpire={onExpire}
        />
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.88}
        accessibilityRole="button"
        accessibilityLabel={`${prayerName} at ${prayerTime}. Tap to return to top.`}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 24,
    borderWidth: 1,
    paddingVertical: 9,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    marginEnd: 8,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginEnd: 8,
  },
  prayerName: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
    letterSpacing: 1.2,
  },
  separator: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    marginHorizontal: 5,
  },
  prayerTime: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 17,
    letterSpacing: 0.5,
  },
  rightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
  },
});
