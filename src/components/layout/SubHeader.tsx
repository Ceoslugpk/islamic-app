import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ViewStyle,
  StyleProp,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../lib/theme';
import { getBackIcon } from '../../lib/iconMap';
import { touchTargetTokens } from '../../lib/buttonTokens';
import { isRTL, t } from '../../lib/i18n';
import {
  HEADER_HORIZONTAL_PADDING,
  HEADER_MAX_WIDTH,
  HEADER_PADDING_VERTICAL,
  HEADER_SEPARATOR,
} from '../../lib/headerTokens';
import { HEADER_FADE, SUBHEADER_HEIGHT } from './layout.constants';
import { fontRoles, useThemeTokens } from '../../theme/tokens';
import { HeaderRingButton } from './HeaderRingButton';

export interface SubHeaderProps {
  /** Main screen title in Lora (display font) or Noto Naskh Arabic (RTL) at 24sp */
  title: string;
  /** Secondary subtitle or context text (supports up to 2 lines) */
  subtitle?: string;
  /** Uppercase overline / category eyebrow in Poppins 11sp */
  eyebrow?: string;
  /** Back navigation callback. If omitted, no back button is rendered. */
  onBack?: () => void;
  /** Optional label for back button (e.g. "Library", "Tools", "Settings") */
  backLabel?: string;
  /** Right action element (e.g. icon button, action pill) */
  rightAction?: React.ReactNode;
  /** Custom container style override */
  style?: StyleProp<ViewStyle>;
  /** Whether to show a bottom hairline border. Defaults to false. */
  borderBottom?: boolean;
  /** Whether to show the 10dp bottom gradient fade. Defaults to true. */
  showFade?: boolean;
  /** Whether to pad safe-area top inset. Defaults to false. */
  includeTopInset?: boolean;
  /** Optional testID for automation (defaults to 'sub-header') */
  testID?: string;
}

/**
 * Authoritative SubHeader for secondary and detail screens across the app.
 * Specifications:
 * - 32dp ring back button at 16dp radius with 0.75dp tokens.border & minimum 44x44 touch target
 * - Eyebrow in Poppins_500Medium at 11sp, letterSpacing 1.8, tokens.goldText (#8A6420 paper, #E6BE6C ink)
 * - Title in Lora_500Medium at 24sp / 28px line-height (Noto Naskh Arabic for RTL)
 * - Subtitle in Poppins_400Regular at 11sp / 15px line-height supporting up to 2 lines
 * - 10dp subtle fade at bottom edge
 * - Named theme tokens, full accessibility, and RTL awareness.
 */
export function SubHeader({
  title,
  subtitle,
  eyebrow,
  onBack,
  backLabel,
  rightAction,
  style,
  borderBottom = HEADER_SEPARATOR,
  showFade = true,
  includeTopInset = false,
  testID = 'sub-header',
}: SubHeaderProps) {
  const { colors, mode } = useTheme();
  const { tokens } = useThemeTokens();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isCompact = width < 380;
  const rtl = isRTL();

  const backIconName = getBackIcon('chevron');
  const safeTopPadding = includeTopInset ? insets.top : 0;

  const fadeColors: [string, string] =
    mode === 'ink'
      ? ['rgba(8, 36, 31, 0.4)', 'rgba(8, 36, 31, 0)']
      : ['rgba(234, 226, 210, 0.45)', 'rgba(247, 244, 235, 0)'];

  return (
    <View
      testID={testID}
      style={[
        styles.container,
        {
          paddingTop: safeTopPadding + HEADER_PADDING_VERTICAL,
          paddingHorizontal: HEADER_HORIZONTAL_PADDING,
          borderBottomColor: colors.borderSubtle,
          borderBottomWidth: borderBottom ? StyleSheet.hairlineWidth : 0,
        },
        style,
      ]}
    >
      <View
        style={[
          styles.innerRow,
          { flexDirection: rtl ? 'row-reverse' : 'row' },
        ]}
      >
        {/* Left: 32dp ring back button at 16dp radius with 44x44 touch target */}
        {onBack ? (
          <TouchableOpacity
            testID={`${testID}-back-btn`}
            style={[
              styles.backButtonTouch,
              { flexDirection: rtl ? 'row-reverse' : 'row' },
            ]}
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel={backLabel ? `${t('Back')} ${t(backLabel)}` : t('Back')}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            activeOpacity={0.7}
          >
            <HeaderRingButton
              testID={`${testID}-back-ring`}
              iconName={backIconName}
              iconSize={16}
              iconColor={colors.accent}
              asView
            />
            {backLabel && !isCompact ? (
              <Text
                testID={`${testID}-back-label`}
                style={[
                  styles.backLabelText,
                  {
                    color: colors.accent,
                    fontFamily: rtl ? fontRoles.arabicNotoBold : fontRoles.eyebrow,
                  },
                ]}
                numberOfLines={1}
              >
                {t(backLabel)}
              </Text>
            ) : null}
          </TouchableOpacity>
        ) : (
          <View style={styles.leftSpacer} />
        )}

        {/* Center: Eyebrow, Title (24sp Lora), and 2-line Subtitle (11sp/15px Poppins) */}
        <View style={styles.titleColumn}>
          {eyebrow ? (
            <Text
              testID={`${testID}-eyebrow`}
              style={[
                styles.eyebrow,
                {
                  color: tokens.goldText,
                  fontFamily: rtl ? fontRoles.arabicNotoBold : fontRoles.eyebrow,
                  fontSize: 11,
                  letterSpacing: 1.8,
                  textAlign: rtl ? 'right' : 'left',
                },
              ]}
              numberOfLines={1}
              maxFontSizeMultiplier={1.3}
            >
              {t(eyebrow)}
            </Text>
          ) : null}
          <Text
            testID={`${testID}-title`}
            style={[
              styles.title,
              {
                color: tokens.text,
                fontFamily: rtl ? fontRoles.titleRtl : fontRoles.title,
                fontSize: 24,
                lineHeight: 28,
                textAlign: rtl ? 'right' : 'left',
              },
            ]}
            numberOfLines={1}
            ellipsizeMode="tail"
            accessibilityRole="header"
            maxFontSizeMultiplier={1.4}
          >
            {t(title)}
          </Text>
          {subtitle ? (
            <Text
              testID={`${testID}-subtitle`}
              style={[
                styles.subtitle,
                {
                  color: tokens.muted,
                  fontFamily: rtl ? fontRoles.arabicNoto : fontRoles.subtitle,
                  fontSize: 11,
                  lineHeight: 15,
                  textAlign: rtl ? 'right' : 'left',
                },
              ]}
              numberOfLines={2}
              ellipsizeMode="tail"
              maxFontSizeMultiplier={1.4}
            >
              {t(subtitle)}
            </Text>
          ) : null}
        </View>

        {/* Right: Actions or spacer */}
        <View style={styles.rightActionWrap}>
          {rightAction ? (
            rightAction
          ) : onBack ? (
            <View style={styles.rightSpacer} />
          ) : null}
        </View>
      </View>

      {/* 10dp Subtle Header Fade */}
      {showFade && (
        <LinearGradient
          colors={fadeColors}
          style={styles.fadeBar}
          pointerEvents="none"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: SUBHEADER_HEIGHT,
    justifyContent: 'center',
    width: '100%',
    maxWidth: HEADER_MAX_WIDTH,
    alignSelf: 'center',
    paddingBottom: HEADER_PADDING_VERTICAL,
    position: 'relative',
  },
  innerRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  backButtonTouch: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginEnd: 8,
  },
  backButtonRing: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 0.75,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backLabelText: {
    fontSize: 13,
    letterSpacing: 0.1,
  },
  leftSpacer: {
    width: 0,
  },
  titleColumn: {
    flex: 1,
    justifyContent: 'center',
    minWidth: 0,
  },
  eyebrow: {
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  title: {
    letterSpacing: -0.3,
  },
  subtitle: {
    lineHeight: 15,
    marginTop: 2,
  },
  rightActionWrap: {
    minWidth: 40,
    minHeight: 40,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  rightSpacer: {
    width: 36,
    height: 36,
  },
  fadeBar: {
    position: 'absolute',
    bottom: -HEADER_FADE,
    left: 0,
    right: 0,
    height: HEADER_FADE,
    zIndex: 1,
  },
});
