import React from 'react';
import {
  Modal,
  StyleSheet,
  View,
  TouchableOpacity,
  ActivityIndicator,
  useWindowDimensions,
  Pressable,
} from 'react-native';
import { AppText } from './ui/AppText';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme';
import { t } from '../lib/i18n';

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
      statusBarTranslucent
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
            accessibilityLabel={t('Close location setup')}
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
          <AppText variant="title" style={styles.title}>
            {t('Location for prayer times')}
          </AppText>
          <AppText variant="body" style={styles.description}>
            Islamic uses your location to calculate accurate prayer times and
            the Qibla direction for where you are. You can use your device
            location, choose a city, or decide later in Settings.
          </AppText>

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
              accessibilityLabel={t('Use current device location')}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Ionicons name="navigate-outline" size={18} color="#ffffff" />
                  <AppText variant="rowTitle" tone="onGold" style={styles.primaryBtnText}>{t('Use current location')}</AppText>
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
              accessibilityLabel={t('Choose a city from list')}
            >
              <Ionicons
                name="business-outline"
                size={18}
                color={colors.textPrimary}
              />
              <AppText
                variant="rowTitle"
                style={styles.secondaryBtnText}
              >
                {t('Choose a city')}
              </AppText>
            </TouchableOpacity>

            {/* Tertiary: Not now */}
            <TouchableOpacity
              style={styles.tertiaryBtn}
              onPress={onDismiss}
              disabled={loading}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={t('Dismiss location setup and use default location')}
            >
              <AppText
                variant="body"
                style={styles.tertiaryBtnText}
              >
                {t('Not now')}
              </AppText>
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
    top: 10,
    end: 10,
    width: 44,
    height: 44,
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
    minHeight: 44,
    borderRadius: 12,
    gap: 8,
  },
  primaryBtnText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 15,
  },
  secondaryBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    minHeight: 44,
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
    minHeight: 44,
  },
  tertiaryBtnText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 14,
  },
  btnDisabled: {
    opacity: 0.6,
  },
});
