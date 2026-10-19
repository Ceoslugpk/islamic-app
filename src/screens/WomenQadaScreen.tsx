// ============================================================================
// PRIVACY & EXPLICIT-RECORDING RULE:
// Missed fasts are only created when explicitly logged by the user.
// The app never auto-logs missed fasts or changes fasting states from predictions.
// ============================================================================

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  TextInput,
  useWindowDimensions,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useThemeTokens, cardTokens } from '../theme/tokens';
import { getPillShadow } from '../lib/homeThemeTokens';
import { isRTL } from '../lib/i18n';
import { SubHeader } from '../components/layout/SubHeader';
import { DetailScreen } from '../components/layout/DetailScreen';
import { PremiumCard } from '../components/ui';
import { AppText } from '../components/ui/AppText';
import { EmptyState } from '../components/EmptyState';
import { PrimaryButton } from '../components/ui/PrimaryButton';
import { LinearGradient } from 'expo-linear-gradient';
import { useUndoToast, withUndoToast } from '../lib/undoToast';
import { buttonTokens, touchTargetTokens } from '../lib/buttonTokens';
import {
  MissedFastItem,
  loadMissedFasts,
  saveMissedFast,
  toggleMissedFastMadeUp,
  deleteMissedFast,
} from '../lib/db';
import { formatYMD, isValidYMD } from '../lib/womensFiqh';

interface WomenQadaScreenProps {
  onBack?: () => void;
  backLabel?: string;
  onOpenCycle?: () => void;
}

function WomenQadaScreen({
  onBack,
  backLabel = 'Tools',
  onOpenCycle,
}: WomenQadaScreenProps) {
  const { t } = useTranslation();
  const { tokens, mode } = useThemeTokens();
  const { width } = useWindowDimensions();
  const maxW = Math.min(width, 680);
  const { saveUndoState } = useUndoToast();

  // Qada / Missed fasts state
  const [allMissedFasts, setAllMissedFasts] = useState<MissedFastItem[]>([]);
  const [showAddQada, setShowAddQada] = useState(false);
  const [qadaDate, setQadaDate] = useState(formatYMD(new Date()));
  const [qadaReason, setQadaReason] = useState('Menstruation / Post-natal');
  const [qadaNote, setQadaNote] = useState('');

  const todayStr = useMemo(() => formatYMD(new Date()), []);
  const yesterdayStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return formatYMD(d);
  }, []);

  const refreshData = useCallback(() => {
    setAllMissedFasts(loadMissedFasts());
  }, []);

  useEffect(() => {
    // Preserve the existing local DB hydration lifecycle.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshData();
  }, [refreshData]);

  // Filter to women's worship missed fasts (menses & postnatal)
  const womenMissedFasts = useMemo(() => {
    return allMissedFasts.filter((f) => {
      const r = (f.reason || '').toLowerCase();
      return r.includes('menstru') || r.includes('post-natal') || r.includes('postnatal');
    });
  }, [allMissedFasts]);

  const qadaStats = useMemo(() => {
    const total = womenMissedFasts.length;
    const completed = womenMissedFasts.filter((f) => f.madeUp).length;
    const pending = total - completed;
    return { total, completed, pending };
  }, [womenMissedFasts]);

  // Handlers for Qada
  const handleSaveQada = () => {
    const cleanDate = qadaDate.trim();
    if (!cleanDate) {
      Alert.alert(t('Date Required'), t('Please enter a valid date in YYYY-MM-DD format.'));
      return;
    }

    if (!isValidYMD(cleanDate)) {
      Alert.alert(t('Invalid Date'), t('Please enter date in YYYY-MM-DD format (e.g. 2026-10-05).'));
      return;
    }

    const item: MissedFastItem = {
      id: `missed_${Date.now()}`,
      date: cleanDate,
      reason: qadaReason.trim() + (qadaNote.trim() ? ` · ${qadaNote.trim()}` : ''),
      madeUp: false,
      createdAt: Date.now(),
    };
    saveMissedFast(item);
    setShowAddQada(false);
    setQadaDate(formatYMD(new Date()));
    setQadaNote('');
    refreshData();
  };

  const handleToggleQada = (id: string, current: boolean) => {
    toggleMissedFastMadeUp(id, !current);
    refreshData();
  };

  const handleDeleteQada = (fast: MissedFastItem) => {
    Alert.alert(
      t('Delete Missed Fast Record?'),
      `Are you sure you want to delete the record for ${fast.date}?`,
      [
        { text: t('Cancel'), style: 'cancel' },
        {
          text: t('Delete'),
          style: 'destructive',
          onPress: () => {
            deleteMissedFast(fast.id);
            refreshData();
            saveUndoState({
              id: fast.id,
              action: t('Missed fast record deleted'),
              revert: () => {
                saveMissedFast(fast);
                refreshData();
              },
            });
          },
        },
      ]
    );
  };

  const isCompact = width < 380;
  const paddingH = isCompact ? 16 : 20;

  return (
    <DetailScreen
      style={[styles.container, { backgroundColor: tokens.bgTop }]}
      header={
        <SubHeader
          eyebrow={t("Women's Worship")}
          title={t('Qada Fasts')}
          subtitle={t('Track and make up missed Ramadan fasts due to menstruation or postpartum.')}
          onBack={onBack}
          backLabel={t(backLabel)}
          borderBottom
          showFade
        />
      }
    >
      <DetailScreen.ScrollView
        style={{ flex: 1, backgroundColor: 'transparent' }}
        contentContainerStyle={[
          styles.content,
          {
            alignSelf: 'center',
            width: '100%',
            maxWidth: maxW,
            paddingHorizontal: paddingH,
          },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Discreet Privacy Note */}
        <View style={[styles.privacyBadge, getPillShadow(mode), { backgroundColor: tokens.cardTop, borderColor: tokens.cardBorder }]}>
          <Ionicons name="shield-checkmark" size={14} color={tokens.goldText} />
          <AppText variant="caption" tone="faint" style={styles.privacyText}>
            {t('Private & synchronized · Stored safely in your local fasting database')}
          </AppText>
        </View>

        {/* Explicit Recording Reassurance */}
        <View style={[styles.explicitBadge, { backgroundColor: tokens.ringFill, borderColor: tokens.cardBorder }]}>
          <Ionicons name="information-circle-outline" size={14} color={tokens.muted} />
          <AppText variant="caption" tone="faint" style={styles.explicitText}>
            {t('Explicit recording only: Missed fasts are only logged when you manually add them. Predictions never auto-create records.')}
          </AppText>
        </View>

        {/* Stats Bar */}
        <View style={styles.qadaStatsRow}>
          <PremiumCard padded={false} borderRadius={cardTokens.borderRadius} style={styles.qadaStatBox} contentStyle={styles.qadaStatBoxContent}>
            <AppText variant="numeral" highlight style={styles.qadaStatNum}>{qadaStats.total}</AppText>
            <AppText variant="caption" tone="faint" style={styles.qadaStatLbl}>{t('Logged Fasts')}</AppText>
          </PremiumCard>
          <PremiumCard padded={false} borderRadius={cardTokens.borderRadius} style={styles.qadaStatBox} contentStyle={styles.qadaStatBoxContent}>
            <AppText variant="numeral" style={[styles.qadaStatNum, { color: mode === 'paper' ? tokens.accent : tokens.success }]}>{qadaStats.completed}</AppText>
            <AppText variant="caption" tone="faint" style={styles.qadaStatLbl}>{t('Made Up (Qada)')}</AppText>
          </PremiumCard>
          <PremiumCard padded={false} borderRadius={cardTokens.borderRadius} style={styles.qadaStatBox} contentStyle={styles.qadaStatBoxContent}>
            <AppText variant="numeral" tone={qadaStats.pending > 0 ? 'danger' : undefined} style={styles.qadaStatNum}>
              {qadaStats.pending}
            </AppText>
            <AppText variant="caption" tone="faint" style={styles.qadaStatLbl}>{t('Remaining Days')}</AppText>
          </PremiumCard>
        </View>

        {/* Quick Add Button */}
        {!showAddQada && (
          <TouchableOpacity
            style={[styles.primaryBtn, getPillShadow(mode), { borderColor: tokens.goldBorder, marginVertical: 14 }]}
            onPress={() => setShowAddQada(true)}
            accessibilityRole="button"
            accessibilityLabel={t('Log Missed Ramadan Fast')}
          >
            <LinearGradient pointerEvents="none" colors={tokens.goldGradient} style={[StyleSheet.absoluteFill, { borderRadius: 14 }]} />
            <Ionicons name="add-circle" size={18} color={tokens.onGold} />
            <AppText variant="rowTitle" tone="onGold" style={styles.primaryBtnText}>
              {t('Log Missed Ramadan Fast')}
            </AppText>
          </TouchableOpacity>
        )}

        {/* Add Form */}
        {showAddQada && (
          <PremiumCard padded={false} borderRadius={cardTokens.borderRadius} style={styles.formCard} contentStyle={styles.formCardContent}>
            <AppText variant="sectionTitle" style={styles.formTitle}>
              {t('Log Missed Fast Day')}
            </AppText>
            <View style={styles.labelRow}>
              <AppText variant="caption" tone="faint" style={styles.inputLabel}>{t('Date (YYYY-MM-DD)')}</AppText>
              <View style={styles.quickPillsRow}>
                <TouchableOpacity
                  style={[styles.quickPill, getPillShadow(mode), { borderColor: tokens.cardBorder, backgroundColor: tokens.ringFill }]}
                  onPress={() => setQadaDate(todayStr)}
                >
                  <AppText variant="caption" highlight style={styles.quickPillText}>{t('Today')}</AppText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.quickPill, getPillShadow(mode), { borderColor: tokens.cardBorder, backgroundColor: tokens.ringFill }]}
                  onPress={() => setQadaDate(yesterdayStr)}
                >
                  <AppText variant="caption" tone="faint" style={styles.quickPillText}>{t('Yesterday')}</AppText>
                </TouchableOpacity>
              </View>
            </View>
            <TextInput
              style={[
                styles.textInput,
                {
                  color: tokens.text,
                  borderColor: tokens.cardBorder,
                  backgroundColor: tokens.ringFill,
                  textAlign: isRTL() ? 'right' : 'left',
                },
              ]}
              value={qadaDate}
              onChangeText={setQadaDate}
              placeholder={t('YYYY-MM-DD')}
              placeholderTextColor={tokens.muted}
              accessibilityLabel={t('Date (YYYY-MM-DD)')}
              keyboardType="numbers-and-punctuation"
            />
            <AppText variant="caption" tone="faint" style={styles.inputLabel}>{t('Reason')}</AppText>
            <TextInput
              style={[
                styles.textInput,
                {
                  color: tokens.text,
                  borderColor: tokens.cardBorder,
                  backgroundColor: tokens.ringFill,
                  textAlign: isRTL() ? 'right' : 'left',
                },
              ]}
              value={qadaReason}
              onChangeText={setQadaReason}
              placeholder={t('Reason')}
              placeholderTextColor={tokens.muted}
              accessibilityLabel={t('Reason')}
            />
            <AppText variant="caption" tone="faint" style={styles.inputLabel}>{t('Notes (Optional)')}</AppText>
            <TextInput
              style={[
                styles.textInput,
                {
                  color: tokens.text,
                  borderColor: tokens.cardBorder,
                  backgroundColor: tokens.ringFill,
                  textAlign: isRTL() ? 'right' : 'left',
                },
              ]}
              value={qadaNote}
              onChangeText={setQadaNote}
              placeholder={t('e.g. Ramadan Day 4')}
              placeholderTextColor={tokens.muted}
              accessibilityLabel={t('Notes (Optional)')}
            />
            <View style={styles.formBtnRow}>
              <TouchableOpacity
                style={[styles.cancelBtn, getPillShadow(mode), { borderColor: tokens.cardBorder, backgroundColor: tokens.ringFill }]}
                onPress={() => setShowAddQada(false)}
                accessibilityRole="button"
                accessibilityLabel={t('Cancel')}
              >
                <AppText variant="caption" tone="faint">
                  {t('Cancel')}
                </AppText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitBtn, getPillShadow(mode), { borderColor: tokens.goldBorder }]}
                onPress={handleSaveQada}
                accessibilityRole="button"
                accessibilityLabel={t('Save Missed Fast')}
              >
                <LinearGradient pointerEvents="none" colors={tokens.goldGradient} style={[StyleSheet.absoluteFill, { borderRadius: 14 }]} />
                <AppText variant="caption" tone="onGold">
                  {t('Save Fast')}
                </AppText>
              </TouchableOpacity>
            </View>
          </PremiumCard>
        )}

        {/* Fast List */}
        <AppText variant="sectionTitle" style={[styles.sectionTitle, { marginTop: 8 }]}>
          {t('Missed Fast Ledger')}
        </AppText>
        <AppText variant="caption" tone="faint" style={styles.sectionDesc}>
          {t('Tap checkbox once made up. Synchronized with your central fasting records.')}
        </AppText>

        {womenMissedFasts.length === 0 ? (
          <PremiumCard padded={false} borderRadius={cardTokens.borderRadius} style={styles.emptyCard} contentStyle={styles.emptyCardContent}>
            <EmptyState
              icon="moon-outline"
              title={t('No missed fasts recorded')}
              subtitle={t('Days missed during Ramadan due to menstruation or postpartum can be recorded here.')}
              iconSize={40}
            />
            <PrimaryButton title={t('+ Log Missed Fast')} onPress={() => setShowAddQada(true)} style={{ alignSelf: 'center', marginBottom: 12 }} />
          </PremiumCard>
        ) : (
          womenMissedFasts.map((fast) => (
            <PremiumCard
              key={fast.id}
              padded={false}
              borderRadius={cardTokens.borderRadius}
              borderColor={fast.madeUp ? tokens.success : tokens.cardBorder}
              style={[styles.fastCard, { marginBottom: 10 }]}
              contentStyle={styles.fastCardContent}
            >
              <View style={styles.qadaRow}>
                <TouchableOpacity
                  style={[
                    styles.checkbox,
                    { borderColor: fast.madeUp ? tokens.success : tokens.cardBorder },
                    fast.madeUp && { backgroundColor: tokens.success },
                  ]}
                  onPress={() => handleToggleQada(fast.id, fast.madeUp)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: fast.madeUp }}
                  accessibilityLabel={`Mark fast from ${fast.date} as ${fast.madeUp ? 'unmade' : 'made up'}`}
                  hitSlop={touchTargetTokens.hitSlop10}
                >
                  {fast.madeUp && <Ionicons name="checkmark" size={14} color={tokens.onGold} />}
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                  <AppText
                    variant="rowTitle"
                    tone={fast.madeUp ? 'faint' : undefined}
                    style={[
                      styles.qadaDate,
                      fast.madeUp && { textDecorationLine: 'line-through' },
                    ]}
                  >
                    {fast.date}
                  </AppText>
                  <AppText variant="body" tone="faint" style={styles.qadaReason}>
                    {fast.reason}
                  </AppText>
                  {fast.madeUpDate && (
                    <AppText variant="caption" style={[styles.qadaMadeUpNote, { color: mode === 'paper' ? tokens.accent : tokens.success }]}>
                      {t('Made up on')} {fast.madeUpDate}
                    </AppText>
                  )}
                </View>
                <TouchableOpacity
                  onPress={() => handleDeleteQada(fast)}
                  accessibilityRole="button"
                  accessibilityLabel={`Delete missed fast for ${fast.date}`}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={styles.deleteQadaButton}
                >
                  <Ionicons name="trash-outline" size={16} color={tokens.muted} />
                </TouchableOpacity>
              </View>
            </PremiumCard>
          ))
        )}
      </DetailScreen.ScrollView>
    </DetailScreen>
  );
}

export default withUndoToast(WomenQadaScreen);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minWidth: 0,
  },
  content: {
    paddingTop: 10,
  },
  fastCard: {
    borderRadius: cardTokens.borderRadius,
  },
  fastCardContent: {
    padding: 16,
  },
  emptyCard: {
    borderRadius: cardTokens.borderRadius,
    marginTop: 8,
  },
  emptyCardContent: {
    padding: 20,
  },
  backBtn: {
    alignSelf: 'flex-start',
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingEnd: 10,
    marginBottom: 4,
  },
  backText: {
    fontSize: 13,
  },
  privacyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 10,
  },
  privacyText: {
    fontSize: 12,
    flex: 1,
    minWidth: 0,
  },
  explicitBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  explicitText: {
    fontSize: 12,
    flex: 1,
    minWidth: 0,
  },
  qadaStatsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  qadaStatBox: {
    flex: 1,
    borderRadius: cardTokens.borderRadius,
    minWidth: 90,
  },
  qadaStatBoxContent: {
    padding: 14,
    alignItems: 'center',
  },
  qadaStatNum: {
    fontSize: 20,
  },
  qadaStatLbl: {
    fontSize: 12,
    marginTop: 2,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: buttonTokens.md.minHeight,
    borderRadius: buttonTokens.md.borderRadius,
  },
  primaryBtnText: {
    fontSize: 14,
  },
  formCard: {
    borderRadius: cardTokens.borderRadius,
    marginBottom: 14,
  },
  formCardContent: {
    padding: 16,
    gap: 8,
  },
  formTitle: {
    fontSize: 15,
    marginBottom: 4,
  },
  labelRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  inputLabel: {
    fontSize: 12,
  },
  quickPillsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  quickPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickPillText: {
    fontSize: 12,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
  },
  formBtnRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 6,
  },
  cancelBtn: {
    paddingHorizontal: 14,
    minHeight: buttonTokens.sm.minHeight,
    borderRadius: buttonTokens.sm.borderRadius,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtn: {
    paddingHorizontal: 16,
    minHeight: buttonTokens.sm.minHeight,
    borderRadius: buttonTokens.sm.borderRadius,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 15,
  },
  sectionDesc: {
    fontSize: 12,
    marginBottom: 8,
    lineHeight: 16,
  },
  qadaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  deleteQadaButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -8,
    marginEnd: -8,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qadaDate: {
    fontSize: 14,
  },
  qadaReason: {
    fontSize: 14,
    marginTop: 2,
  },
  qadaMadeUpNote: {
    fontSize: 12,
    marginTop: 2,
  },
});
