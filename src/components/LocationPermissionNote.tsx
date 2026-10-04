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
  loading?: boolean;
  fallbackCity?: string;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
  customMessage?: string;
}

/**
 * Reusable banner/note displayed when location permission is denied or unavailable.
 * Harmonizes the "using manual location (City)" notice and provides an "Enable" retry button.
 */
export function LocationPermissionNote({
  status,
  onEnable,
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
    ? `Enable location access to automatically detect prayer times and Qibla direction for your area. Currently using manual location (${fallbackCity}).`
    : `GPS is not available on this device or platform. Currently using manual location (${fallbackCity}).`;

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

      {onEnable && (
        <View style={styles.actionRow}>
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
            accessibilityLabel={isDenied ? 'Enable auto-location' : 'Retry location detection'}
          >
            {loading ? (
              <ActivityIndicator size="small" color={colors.bgBase} />
            ) : (
              <>
                <Ionicons
                  name={isDenied ? 'shield-checkmark-outline' : 'refresh-outline'}
                  size={15}
                  color={colors.bgBase}
                />
                <Text style={[styles.enableBtnText, { color: colors.bgBase }]}>
                  {isDenied ? 'Enable Auto-Location' : 'Retry Detection'}
                </Text>
              </>
            )}
          </TouchableOpacity>
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
