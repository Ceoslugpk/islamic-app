import React from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  useWindowDimensions,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme';

export interface LocationSetupModalProps {
  visible: boolean;
  onUseCurrentLocation: () => void | Promise<void>;
  onChooseCity: () => void;
  onDismiss: () => void;
  loading?: boolean;
}

/**
 * Concise, non-blocking location setup modal for first-time users.
 * Replaces the old Android Alert with vague "OK" button.
 * Offers 3 clear options:
 * 1. "Use current location" -> requests OS location permission
 * 2. "Choose a city" -> opens existing CitiesScreen city picker
 * 3. "Not now" -> dismisses and lets Home proceed with default fallback
 */
export function LocationSetupModal({
  visible,
  onUseCurrentLocation,
  onChooseCity,
  onDismiss,
  loading = false,
}: LocationSetupModalProps) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const cardWidth = Math.min(width - 40, 420);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <Pressable style={styles.backdrop} onPress={onDismiss}>
        <Pressable
          style={[
            styles.card,
            {
              backgroundColor: colors.bgSurface,
              borderColor: colors.borderSubtle,
              width: cardWidth,
            },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Close button in top-right */}
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onDismiss}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Close location setup"
          >
            <Ionicons name="close" size={20} color={colors.textMuted} />
          </TouchableOpacity>

          {/* Header Icon */}
          <View
            style={[
              styles.iconWrap,
              {
                backgroundColor: colors.accentDim,
                borderColor: colors.borderSubtle,
              },
            ]}
          >
            <Ionicons name="location" size={28} color={colors.accent} />
          </View>

          {/* Title & Concise Education */}
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Location for prayer times
          </Text>
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            Islamic uses your location to calculate accurate prayer times and
            the Qibla direction for where you are. You can use your device
            location, choose a city, or decide later in Settings.
          </Text>

          {/* Action Buttons Column */}
          <View style={styles.btnCol}>
            {/* Primary: Use current location */}
            <TouchableOpacity
              style={[
                styles.primaryBtn,
                { backgroundColor: colors.accent },
                loading && styles.btnDisabled,
              ]}
              onPress={onUseCurrentLocation}
              disabled={loading}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Use current device location"
            >
              {loading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Ionicons name="navigate-outline" size={18} color="#ffffff" />
                  <Text style={styles.primaryBtnText}>Use current location</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Secondary: Choose a city */}
            <TouchableOpacity
              style={[
                styles.secondaryBtn,
                {
                  borderColor: colors.borderSubtle,
                  backgroundColor: colors.bgBase,
                },
              ]}
              onPress={onChooseCity}
              disabled={loading}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Choose a city from list"
            >
              <Ionicons
                name="business-outline"
                size={18}
                color={colors.textPrimary}
              />
              <Text
                style={[styles.secondaryBtnText, { color: colors.textPrimary }]}
              >
                Choose a city
              </Text>
            </TouchableOpacity>

            {/* Tertiary: Not now */}
            <TouchableOpacity
              style={styles.tertiaryBtn}
              onPress={onDismiss}
              disabled={loading}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Dismiss location setup and use default location"
            >
              <Text
                style={[styles.tertiaryBtnText, { color: colors.textSecondary }]}
              >
                Not now
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 20,
    alignItems: 'center',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  iconWrap: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 20,
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 24,
  },
  btnCol: {
    width: '100%',
    gap: 10,
  },
  primaryBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  primaryBtnText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 15,
    color: '#ffffff',
  },
  secondaryBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  secondaryBtnText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 15,
  },
  tertiaryBtn: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  tertiaryBtnText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 14,
  },
  btnDisabled: {
    opacity: 0.6,
  },
});
