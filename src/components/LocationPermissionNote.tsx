import React from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { AppText } from './ui/AppText';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../lib/theme';
import { getTokens, cardTokens } from '../theme/tokens';
import { getCardShadow } from '../lib/homeThemeTokens';
import { LocationPermissionStatus } from '../lib/useLocation';
import { t } from '../lib/i18n';

export interface LocationPermissionNoteProps {
  status: LocationPermissionStatus;
  onEnable?: () => void | Promise<void>;
  onChooseCity?: () => void;
  onDismiss?: () => void;
  loading?: boolean;
  fallbackCity?: string;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
  customMessage?: string;
}

/**
 * Reusable banner/note displayed when location permission is denied or unavailable.
 * Harmonizes the "using saved location (City)" notice and provides "Choose City" and "Enable Location" buttons.
 */
export function LocationPermissionNote({
  status,
  onEnable,
  onChooseCity,
  onDismiss,
  loading = false,
  fallbackCity = 'Makkah, Saudi Arabia',
  compact = false,
  style,
  customMessage,
}: LocationPermissionNoteProps) {
  const { colors, mode } = useTheme();
  const tokens = getTokens(mode);

  // Only render when permission is denied or unavailable
  if (status !== 'denied' && status !== 'unavailable') {
    return null;
  }

  const isDenied = status === 'denied';
  const title = isDenied
    ? t('Location permission needed')
    : t('Location detection unavailable');

  const defaultDesc = isDenied
    ? t('Enable location access so prayer times and Qibla direction are calculated for where you are. Until then, the app uses the saved location ({{city}}). You\'ll only be asked once on first launch.', { city: fallbackCity })
    : t('GPS is not available on this device or platform. Currently using saved location ({{city}}).', { city: fallbackCity });

  const description = customMessage || defaultDesc;

  // If the user has permanently denied (Android "don't ask again"), an in-app
  // retry can never succeed — the only path back is the OS settings screen.
  const openDeviceSettings = () => {
    Linking.openSettings().catch(() => {});
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: tokens.cardTop,
          borderColor: tokens.cardBorder,
        },
        getCardShadow(mode),
        compact && styles.containerCompact,
        style,
      ]}
    >
      <LinearGradient
        colors={[...tokens.cardGradient]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[StyleSheet.absoluteFill, styles.gradientSurface]}
        pointerEvents="none"
      />
      <View style={styles.topRow}>
        <View
          style={[
            styles.iconWrap,
            {
              backgroundColor: colors.accentDim,
              borderColor: colors.borderSubtle,
            },
          ]}
        >
          <Ionicons
            name={isDenied ? 'location-outline' : 'navigate-outline'}
            size={compact ? 16 : 18}
            color={colors.accent}
          />
        </View>

        <View style={styles.textWrap}>
          <AppText variant="sectionTitle" style={styles.title}>{title}</AppText>
          <AppText variant="subtitle" style={styles.description}>
            {description}
          </AppText>
        </View>

        {onDismiss && (
          <TouchableOpacity
            onPress={onDismiss}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={t('Dismiss')}
            style={styles.dismissBtn}
          >
            <Ionicons name="close" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {(onEnable || onChooseCity) && (
        <View style={styles.actionRow}>
          {onChooseCity && (
            <TouchableOpacity
              style={[
                styles.cityBtn,
                {
                  borderColor: colors.borderSubtle,
                  backgroundColor: colors.bgBase,
                },
              ]}
              onPress={onChooseCity}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={t('Choose city from world cities')}
            >
              <Ionicons name="business-outline" size={14} color={colors.textPrimary} />
              <AppText variant="rowTitle" style={styles.cityBtnText}>{t('Choose City')}</AppText>
            </TouchableOpacity>
          )}

          {onEnable && (
            <TouchableOpacity
              style={styles.enableBtnWrap}
              onPress={onEnable}
              disabled={loading}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={isDenied ? t('Enable Location') : t('Retry Detection')}
            >
              <LinearGradient
                colors={tokens.goldGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={styles.enableBtn}
              >
                {loading ? (
                  <ActivityIndicator size="small" color={tokens.onGold} />
                ) : (
                  <>
                    <Ionicons
                      name={isDenied ? 'shield-checkmark-outline' : 'refresh-outline'}
                      size={14}
                      color={tokens.onGold}
                    />
                    <AppText variant="rowTitle" tone="onGold" style={styles.enableBtnText}>
                      {isDenied ? t('Enable Location') : t('Retry Detection')}
                    </AppText>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          )}

          {isDenied && (
            <TouchableOpacity
              style={[
                styles.cityBtn,
                {
                  borderColor: colors.borderSubtle,
                  backgroundColor: colors.bgBase,
                },
              ]}
              onPress={openDeviceSettings}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={t('Open device settings to enable location')}
            >
              <Ionicons name="settings-outline" size={14} color={colors.textPrimary} />
              <AppText variant="rowTitle" style={styles.cityBtnText}>{t('Device Settings')}</AppText>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: cardTokens.borderWidth,
    borderRadius: 12,
    padding: 16,
    marginVertical: 10,
    position: 'relative',
  },
  containerCompact: {
    padding: 12,
    marginVertical: 6,
  },
  gradientSurface: {
    borderRadius: 11.25,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  textWrap: {
    flex: 1,
  },
  title: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 14,
    marginBottom: 4,
  },
  description: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12.5,
    lineHeight: 18,
  },
  actionRow: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  cityBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 36,
  },
  cityBtnText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12.5,
  },
  enableBtnWrap: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  enableBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    minHeight: 36,
  },
  enableBtnText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12.5,
  },
  dismissBtn: {
    padding: 4,
    marginStart: 4,
    alignSelf: 'flex-start',
  },
});
