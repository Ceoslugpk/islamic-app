import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ViewStyle,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme';
import { getBackIcon, iconSizes } from '../lib/iconMap';
import { touchTargetTokens } from '../lib/buttonTokens';
import {
  HEADER_HORIZONTAL_PADDING,
  HEADER_MAX_WIDTH,
  HEADER_HEIGHT,
  HEADER_PADDING_VERTICAL,
  HEADER_SEPARATOR,
} from '../lib/headerTokens';

export interface ScreenHeaderProps {
  /** Main screen title in Instrument Serif (display font) */
  title: string;
  /** Optional secondary subtitle or context text */
  subtitle?: string;
  /** Optional uppercase overline / category eyebrow */
  eyebrow?: string;
  /** Back navigation callback. If omitted, no back button is rendered. */
  onBack?: () => void;
  /** Optional label for back button (e.g. "Tools", "Library", "Quran") */
  backLabel?: string;
  /** Right action element (e.g. icon button, action pill) */
  rightAction?: React.ReactNode;
  /** Custom container style override */
  style?: ViewStyle;
  /** Whether to show a hairline bottom border. Defaults to HEADER_SEPARATOR (false). */
  borderBottom?: boolean;
}

/**
 * Canonical ScreenHeader across the app.
 * Height 54px, 40x40 min back-button touch target, Instrument Serif 23px title,
 * optional subtitle, right actions, and RTL-aware back icon.
 */
export function ScreenHeader({
  title,
  subtitle,
  eyebrow,
  onBack,
  backLabel,
  rightAction,
  style,
  borderBottom = HEADER_SEPARATOR,
}: ScreenHeaderProps) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const isCompact = width < 380;
  const paddingH = HEADER_HORIZONTAL_PADDING;

  const backIconName = getBackIcon('chevron');

  return (
    <View
      style={[
        styles.container,
        {
          paddingHorizontal: paddingH,
          borderBottomColor: colors.borderSubtle,
          borderBottomWidth: borderBottom ? 1 : 0,
        },
        style,
      ]}
    >
      <View style={styles.innerRow}>
        {/* Left: Back Button or spacer */}
        {onBack ? (
          <TouchableOpacity
            style={styles.backButton}
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel={backLabel ? `Back to ${backLabel}` : 'Back'}
            hitSlop={touchTargetTokens.hitSlop8}
            activeOpacity={0.7}
          >
            <Ionicons name={backIconName} size={iconSizes.header} color={colors.accent} />
            {backLabel && !isCompact ? (
              <Text
                style={[styles.backLabelText, { color: colors.accent }]}
                numberOfLines={1}
              >
                {backLabel}
              </Text>
            ) : null}
          </TouchableOpacity>
        ) : (
          <View style={styles.leftSpacer} />
        )}

        {/* Center / Fill: Title, Eyebrow & Subtitle */}
        <View style={styles.titleColumn}>
          {eyebrow ? (
            <Text
              style={[
                styles.eyebrow,
                { color: colors.accent, fontSize: isCompact ? 9.5 : 10.5 },
              ]}
              numberOfLines={1}
              maxFontSizeMultiplier={1.4}
            >
              {eyebrow}
            </Text>
          ) : null}
          <Text
            style={[
              styles.title,
              {
                color: colors.textPrimary,
                fontSize: isCompact ? 21 : 23,
                lineHeight: isCompact ? 25 : 27,
              },
            ]}
            numberOfLines={1}
            ellipsizeMode="tail"
            accessibilityRole="header"
            maxFontSizeMultiplier={1.4}
          >
            {title}
          </Text>
          {subtitle ? (
            <Text
              style={[
                styles.subtitle,
                { color: colors.textSecondary, fontSize: isCompact ? 11 : 12 },
              ]}
              numberOfLines={1}
              ellipsizeMode="tail"
              maxFontSizeMultiplier={1.4}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>

        {/* Right: Actions or spacer */}
        <View style={styles.rightActionWrap}>
          {rightAction ? (
            rightAction
          ) : (
            // Keeps title balanced when back button exists
            onBack ? <View style={styles.rightSpacer} /> : null
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: HEADER_HEIGHT,
    justifyContent: 'center',
    width: '100%',
    maxWidth: HEADER_MAX_WIDTH,
    alignSelf: 'center',
    paddingVertical: HEADER_PADDING_VERTICAL,
  },
  innerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    minWidth: 40,
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 2,
    marginRight: 8,
  },
  backLabelText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
    letterSpacing: 0.1,
  },
  leftSpacer: {
    width: 0,
  },
  titleColumn: {
    flex: 1,
    justifyContent: 'center',
  },
  eyebrow: {
    fontFamily: 'Manrope_600SemiBold',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 1,
  },
  title: {
    fontFamily: 'InstrumentSerif_400Regular',
    letterSpacing: -0.2,
  },
  subtitle: {
    fontFamily: 'Manrope_400Regular',
    lineHeight: 16,
    marginTop: 1,
  },
  rightActionWrap: {
    minWidth: 40,
    minHeight: 40,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  rightSpacer: {
    width: 40,
    height: 40,
  },
});
