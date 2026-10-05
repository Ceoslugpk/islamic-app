import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme';
import { LocationPermissionStatus } from '../lib/useLocation';

export interface LocationPermissionNoteProps {
  status: LocationPermissionStatus;
  onEnable?: () => void | Promise<void>;
  onChooseCity?: () => void;
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
  loading = false,
  fallbackCity = 'Makkah, Saudi Arabia',
  compact = false,
  style,
  customMessage,
}: LocationPermissionNoteProps) {
  const { colors } = useTheme();

  // Only render when permission is denied or unavailable
  if (status !== 'denied' && status !== 'unavailable') {
    return null;
  }

  const isDenied = status === 'denied';
  const title = isDenied
    ? 'Location permission needed'
    : 'Location detection unavailable';

  const defaultDesc = isDenied
    ? `Enable location access so prayer times and Qibla direction are calculated for where you are. Until then, the app uses the saved location (${fallbackCity}). You'll only be asked once on first launch.`
    : `GPS is not available on this device or platform. Currently using saved location (${fallbackCity}).`;

  const description = customMessage || defaultDesc;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.bgSurface,
          borderColor: colors.borderSubtle,
        },
        compact && styles.containerCompact,
        style,
      ]}
    >
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
          <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            {description}
          </Text>
        </View>
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
              accessibilityLabel="Choose city from world cities"
            >
              <Ionicons name="business-outline" size={14} color={colors.textPrimary} />
              <Text style={[styles.cityBtnText, { color: colors.textPrimary }]}>Choose City</Text>
            </TouchableOpacity>
          )}

          {onEnable && (
            <TouchableOpacity
              style={[
                styles.enableBtn,
                {
                  backgroundColor: colors.accent,
                },
              ]}
              onPress={onEnable}
              disabled={loading}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={isDenied ? 'Enable location' : 'Retry detection'}
            >
              {loading ? (
                <ActivityIndicator size="small" color={colors.onAccent} />
              ) : (
                <>
                  <Ionicons
                    name={isDenied ? 'shield-checkmark-outline' : 'refresh-outline'}
                    size={14}
                    color={colors.onAccent}
                  />
                  <Text style={[styles.enableBtnText, { color: colors.onAccent }]}>
                    {isDenied ? 'Enable Location' : 'Retry Detection'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginVertical: 10,
  },
  containerCompact: {
    padding: 12,
    marginVertical: 6,
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
});
