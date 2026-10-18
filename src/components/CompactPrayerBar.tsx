import React from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { useTheme } from '../lib/theme';
import { HOME_THEME_TOKENS, getPillShadow } from '../lib/homeThemeTokens';
import { isRTL, t } from '../lib/i18n';
import { AppText } from './ui/AppText';
import { PrayerCountdown } from './PrayerCountdown';

export interface CompactPrayerBarProps {
  prayerName: string;
  prayerTime: string;
  targetTime?: string;
  onPress?: () => void;
  onExpire?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  isActive?: boolean;
}

/**
 * CompactPrayerBar: A slim, persistent floating pill displaying the current/upcoming
 * prayer name and time, paired with the live tabular countdown.
 * Cross-fades into view as the user scrolls past the full Prayer Hero centerpiece.
 * Styled in the premium theme-matched visual language with muted gold accent.
 */
export const CompactPrayerBar = React.memo(function CompactPrayerBar({
  prayerName,
  prayerTime,
  targetTime,
  onPress,
  onExpire,
  style,
  testID = 'compact-prayer-bar',
  isActive = true,
}: CompactPrayerBarProps) {
  const { mode, tokens: activeText } = useTheme();
  const tokens = HOME_THEME_TOKENS[mode];
  const rtl = isRTL();
  const shadow = getPillShadow(mode);

  const containerStyle: StyleProp<ViewStyle> = [
    styles.container,
    shadow,
    {
      backgroundColor: tokens.cardTop,
      borderColor: tokens.cardBorder,
      flexDirection: rtl ? 'row-reverse' : 'row',
    },
    style,
  ];

  const content = (
    <>
      {/* Indicator dot + localized PRAYER NAME · prayerTime */}
      <View
        style={[
          styles.leftRow,
          { flexDirection: rtl ? 'row-reverse' : 'row' },
        ]}
      >
        <View
          style={[styles.statusDot, { backgroundColor: activeText.eyebrow }]}
          testID={`${testID}-dot`}
        />
        <AppText
          variant="eyebrow"
          style={styles.prayerName}
          numberOfLines={1}
          ellipsizeMode="tail"
          testID={`${testID}-name`}
        >
          {rtl ? t(prayerName) : t(prayerName).toUpperCase()}
        </AppText>
        <AppText variant="caption" tone="faint" style={styles.separator}>
          ·
        </AppText>
        <AppText
          variant="numeral"
          style={[styles.prayerTime, { writingDirection: 'ltr' }]}
          numberOfLines={1}
          testID={`${testID}-time`}
        >
          {prayerTime}
        </AppText>
      </View>

      {/* Live tabular countdown */}
      <View style={styles.rightRow} testID={`${testID}-countdown`}>
        <PrayerCountdown
          targetTime={targetTime}
          color={activeText.eyebrow}
          separatorColor={activeText.subtle}
          fontSize={14}
          onExpire={onExpire}
          isActive={isActive}
        />
      </View>
    </>
  );

  const accessibilityLabel = `${t(prayerName)} at ${prayerTime}. Tap to return to top.`;

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.88}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={containerStyle}
        testID={testID}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return (
    <View style={containerStyle} testID={testID}>
      {content}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 52,
    borderRadius: 26,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  leftRow: {
    alignItems: 'center',
    flexShrink: 1,
    minWidth: 0,
    marginEnd: 8,
  },
  statusDot: {
    width: 6.5,
    height: 6.5,
    borderRadius: 3.25,
    marginEnd: 8,
    flexShrink: 0,
  },
  prayerName: {
    letterSpacing: 1.2,
    flexShrink: 1,
  },
  separator: {
    marginHorizontal: 6,
    flexShrink: 0,
  },
  prayerTime: {
    fontSize: 17,
    letterSpacing: 0.3,
    flexShrink: 0,
  },
  rightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    marginStart: 4,
  },
});
