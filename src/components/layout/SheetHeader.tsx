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
import { useTheme } from '../../lib/theme';
import { HOME_THEME_TOKENS } from '../../lib/homeThemeTokens';
import { touchTargetTokens } from '../../lib/buttonTokens';
import { isRTL, t } from '../../lib/i18n';
import {
  HEADER_HORIZONTAL_PADDING,
  HEADER_MAX_WIDTH,
  HEADER_PADDING_VERTICAL,
} from '../../lib/headerTokens';
import { SUBHEADER_HEIGHT } from './layout.constants';
import { fontRoles } from '../../theme/tokens';
import { HeaderRingButton } from './HeaderRingButton';

export interface SheetHeaderProps {
  /** Title of the sheet or modal */
  title: string;
  /** Optional category or section eyebrow */
  eyebrow?: string;
  /** Optional subtitle or description */
  subtitle?: string;
  /** Close or dismiss callback */
  onClose?: () => void;
  /** Close action label (e.g. "Done" or "Cancel"). If omitted, renders close icon ring button */
  closeLabel?: string;
  /** Whether to show the top drag pill. Defaults to true */
  showDragPill?: boolean;
  /** Custom container style */
  style?: StyleProp<ViewStyle>;
  /** Whether to show bottom hairline separator. Defaults to true */
  borderBottom?: boolean;
  /** Optional testID */
  testID?: string;
}

/**
 * Authoritative SheetHeader for modal dialogs and bottom sheets.
 * Features:
 * - Centered 36x5dp drag pill with 2.5dp radius
 * - Display title (Amiri for RTL, Instrument Serif / Lora for LTR) and optional eyebrow
 * - Dismiss button (32dp ring button or text action)
 * - Hairline bottom border
 */
export function SheetHeader({
  title,
  eyebrow,
  subtitle,
  onClose,
  closeLabel,
  showDragPill = true,
  style,
  borderBottom = true,
  testID = 'sheet-header',
}: SheetHeaderProps) {
  const { colors, mode } = useTheme();
  const tokens = HOME_THEME_TOKENS[mode];
  const { width } = useWindowDimensions();
  const isCompact = width < 380;
  const rtl = isRTL();

  return (
    <View
      testID={testID}
      style={[
        styles.container,
        {
          paddingHorizontal: HEADER_HORIZONTAL_PADDING,
          borderBottomColor: colors.borderSubtle,
          borderBottomWidth: borderBottom ? StyleSheet.hairlineWidth : 0,
        },
        style,
      ]}
    >
      {/* Centered Drag Pill (36 x 5dp, radius 2.5dp) */}
      {showDragPill && (
        <View style={styles.dragPillWrap} testID={`${testID}-drag-pill-wrap`}>
          <View
            style={[
              styles.dragPill,
              { backgroundColor: mode === 'ink' ? tokens.ringBorder : colors.borderSubtle },
            ]}
            testID={`${testID}-drag-pill`}
          />
        </View>
      )}

      {/* Content Row */}
      <View
        style={[
          styles.row,
          { flexDirection: rtl ? 'row-reverse' : 'row' },
        ]}
      >
        <View style={styles.titleColumn}>
          {eyebrow ? (
            <Text
              testID={`${testID}-eyebrow`}
              style={[
                styles.eyebrow,
                {
                  color: colors.accent,
                  fontFamily: rtl ? fontRoles.arabicBold : fontRoles.eyebrowFallback,
                  fontSize: isCompact ? 10 : 11,
                  textAlign: rtl ? 'right' : 'left',
                },
              ]}
              numberOfLines={1}
            >
              {t(eyebrow)}
            </Text>
          ) : null}
          <Text
            testID={`${testID}-title`}
            style={[
              styles.title,
              {
                color: colors.textPrimary,
                fontFamily: rtl ? fontRoles.titleRtl : fontRoles.titleFallback,
                fontSize: 22,
                lineHeight: 26,
                textAlign: rtl ? 'right' : 'left',
              },
            ]}
            numberOfLines={1}
            accessibilityRole="header"
          >
            {t(title)}
          </Text>
          {subtitle ? (
            <Text
              testID={`${testID}-subtitle`}
              style={[
                styles.subtitle,
                {
                  color: colors.textSecondary,
                  fontFamily: fontRoles.ui,
                  fontSize: isCompact ? 11.5 : 12,
                  textAlign: rtl ? 'right' : 'left',
                },
              ]}
              numberOfLines={1}
            >
              {t(subtitle)}
            </Text>
          ) : null}
        </View>

        {/* Dismiss Button */}
        {onClose && (
          <View style={styles.dismissWrap}>
            {closeLabel ? (
              <TouchableOpacity
                testID={`${testID}-close-btn`}
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel={t(closeLabel)}
                hitSlop={touchTargetTokens.hitSlop8}
                activeOpacity={0.7}
                style={styles.closeTextTouch}
              >
                <Text
                  style={[
                    styles.closeText,
                    {
                      color: colors.accent,
                      fontFamily: rtl ? fontRoles.arabicBold : fontRoles.uiSemiBold,
                    },
                  ]}
                >
                  {t(closeLabel)}
                </Text>
              </TouchableOpacity>
            ) : (
              <HeaderRingButton
                testID={`${testID}-close-btn`}
                iconName="close"
                iconSize={16}
                iconColor={colors.accent}
                onPress={onClose}
                accessibilityLabel={t('Close')}
              />
            )}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: SUBHEADER_HEIGHT,
    width: '100%',
    maxWidth: HEADER_MAX_WIDTH,
    alignSelf: 'center',
    paddingVertical: HEADER_PADDING_VERTICAL,
  },
  dragPillWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 4,
    paddingBottom: 8,
  },
  dragPill: {
    width: 36,
    height: 5,
    borderRadius: 2.5,
  },
  row: {
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  titleColumn: {
    flex: 1,
    justifyContent: 'center',
    minWidth: 0,
  },
  eyebrow: {
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  title: {
    letterSpacing: -0.3,
  },
  subtitle: {
    marginTop: 2,
  },
  dismissWrap: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    minWidth: 40,
    minHeight: 40,
  },
  closeTextTouch: {
    minWidth: 40,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  closeText: {
    fontSize: 14,
  },
});
