import React from 'react';
import {
  Modal,
  StyleSheet,
  View,
  TouchableOpacity,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { AppText } from './ui/AppText';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme';
import { t } from '../lib/i18n';

interface WomenConsentModalProps {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function WomenConsentModal({ visible, onConfirm, onCancel }: WomenConsentModalProps) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const maxW = Math.min(width - 32, 460);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.bgSurface,
              borderColor: colors.borderSubtle,
              width: maxW,
            },
          ]}
        >
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Header Icon */}
            <View style={[styles.iconWrap, { backgroundColor: colors.accentDim, borderColor: colors.accent }]}>
              <Ionicons name="shield-checkmark" size={28} color={colors.accent} />
            </View>

            <AppText variant="title" style={styles.title}>
              {t('Private & On-Device')}
            </AppText>
            <AppText variant="subtitle" style={styles.subtitle}>
              {t('Your cycle, purity, and worship data are deeply personal. We protect your privacy with strict on-device guarantees:')}
            </AppText>

            {/* Guarantees List */}
            <View style={styles.list}>
              <View style={styles.listItem}>
                <View style={[styles.bulletCircle, { backgroundColor: colors.accentDim }]}>
                  <Ionicons name="phone-portrait-outline" size={16} color={colors.accent} />
                </View>
                <View style={styles.listTextWrap}>
                  <AppText variant="rowTitle" style={styles.listHeading}>
                    {t('Stays on this device')}
                  </AppText>
                  <AppText variant="body" style={styles.listBody}>
                    {t('All period entries, purity days, and notes are stored strictly in local device storage.')}
                  </AppText>
                </View>
              </View>

              <View style={styles.listItem}>
                <View style={[styles.bulletCircle, { backgroundColor: colors.accentDim }]}>
                  <Ionicons name="person-circle-outline" size={16} color={colors.accent} />
                </View>
                <View style={styles.listTextWrap}>
                  <AppText variant="rowTitle" style={styles.listHeading}>
                    {t('No account or sign-in')}
                  </AppText>
                  <AppText variant="body" style={styles.listBody}>
                    {t('No login, email, or cloud profile is ever required or attached to your records.')}
                  </AppText>
                </View>
              </View>

              <View style={styles.listItem}>
                <View style={[styles.bulletCircle, { backgroundColor: colors.accentDim }]}>
                  <Ionicons name="eye-off-outline" size={16} color={colors.accent} />
                </View>
                <View style={styles.listTextWrap}>
                  <AppText variant="rowTitle" style={styles.listHeading}>
                    {t('Zero analytics or telemetry')}
                  </AppText>
                  <AppText variant="body" style={styles.listBody}>
                    {t('Cycle data is never sent to remote servers or included in analytics or telemetry logs.')}
                  </AppText>
                </View>
              </View>

              <View style={styles.listItem}>
                <View style={[styles.bulletCircle, { backgroundColor: colors.accentDim }]}>
                  <Ionicons name="trash-bin-outline" size={16} color={colors.accent} />
                </View>
                <View style={styles.listTextWrap}>
                  <AppText variant="rowTitle" style={styles.listHeading}>
                    {t('Delete or hide anytime')}
                  </AppText>
                  <AppText variant="body" style={styles.listBody}>
                    {t('You can hide the feature from the menu or permanently wipe all records anytime in Settings.')}
                  </AppText>
                </View>
              </View>
            </View>

            {/* Buttons */}
            <View style={styles.btnCol}>
              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: colors.accent }]}
                onPress={onConfirm}
                accessibilityRole="button"
                accessibilityLabel={t("I Understand and enable Women's Worship")}
              >
                <AppText
                  variant="rowTitle"
                  tone="onGold"
                  style={styles.primaryBtnText}
                  maxFontSizeMultiplier={1.4}
                >
                  {t('I Understand')}
                </AppText>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.cancelBtn, { borderColor: colors.borderSubtle }]}
                onPress={onCancel}
                accessibilityRole="button"
                accessibilityLabel={t('Cancel')}
              >
                <AppText
                  variant="body"
                  style={styles.cancelBtnText}
                  maxFontSizeMultiplier={1.4}
                >
                  {t('Cancel')}
                </AppText>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  scrollContent: {
    padding: 24,
    alignItems: 'center',
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 20,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 20,
  },
  list: {
    width: '100%',
    gap: 14,
    marginBottom: 24,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  bulletCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  listTextWrap: {
    flex: 1,
  },
  listHeading: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 14,
    marginBottom: 2,
  },
  listBody: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    lineHeight: 17,
  },
  btnCol: {
    width: '100%',
    gap: 10,
  },
  primaryBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 15,
  },
  cancelBtn: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 14,
  },
});
