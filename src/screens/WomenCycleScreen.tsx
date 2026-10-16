// ============================================================================
// PRIVACY & EXPLICIT-RECORDING RULE:
// Cycle predictions, average intervals, and fertile windows are strictly
// informational estimates computed locally from past dates.
// The app NEVER auto-alters prayer times, NEVER auto-silences notifications,
// and NEVER auto-creates qada fasts based on predictions.
// All worship exemptions and qada logs depend strictly on EXPLICIT user recording.
// ============================================================================

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  useWindowDimensions,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useThemeTokens, cardTokens } from '../theme/tokens';
import { getCardShadow, getPillShadow } from '../lib/homeThemeTokens';
import { SubHeader } from '../components/layout/SubHeader';
import { DetailScreen } from '../components/layout/DetailScreen';
import { EmptyState } from '../components/EmptyState';
import { PrimaryButton } from '../components/ui/PrimaryButton';
import { LinearGradient } from 'expo-linear-gradient';
import { useUndoToast, withUndoToast } from '../lib/undoToast';
import { buttonTokens, touchTargetTokens } from '../lib/buttonTokens';
import {
  PeriodEntry,
  PurityStatus,
  savePeriodEntry,
  deletePeriodEntry,
  loadPeriodEntries,
} from '../lib/db';
import {
  formatYMD,
  parseYMD,
  isValidYMD,
  computeAverageCycleLength,
  predictNextPeriod,
  getCycleDay,
  getFertileWindow,
} from '../lib/womensFiqh';

interface WomenCycleScreenProps {
  onBack?: () => void;
  backLabel?: string;
  onOpenPurity?: () => void;
  onOpenQada?: () => void;
  onOpenGuidance?: () => void;
}

function WomenCycleScreen({
  onBack,
  backLabel = 'Tools',
  onOpenPurity,
  onOpenQada,
  onOpenGuidance,
}: WomenCycleScreenProps) {
  const { t } = useTranslation();
  const { tokens, mode } = useThemeTokens();
  const { width } = useWindowDimensions();
  const maxW = Math.min(width, 680);
  const { saveUndoState } = useUndoToast();

  const [periodEntries, setPeriodEntries] = useState<PeriodEntry[]>(() => loadPeriodEntries());
  const [showLogPeriod, setShowLogPeriod] = useState(false);
  const [newStartDate, setNewStartDate] = useState(formatYMD(new Date()));
  const [newEndDate, setNewEndDate] = useState('');
  const [newNotes, setNewNotes] = useState('');

  const todayStr = useMemo(() => formatYMD(new Date()), []);
  const yesterdayStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return formatYMD(d);
  }, []);

  const refreshData = useCallback(() => {
    setPeriodEntries(loadPeriodEntries());
  }, []);

  // Active period calculation
  const activePeriod = useMemo(() => {
    return periodEntries.find((e) => !e.endDate);
  }, [periodEntries]);

  // Average cycle length and next period prediction
  const avgCycle = useMemo(() => {
    return computeAverageCycleLength(periodEntries, 28);
  }, [periodEntries]);

  const latestStart = useMemo(() => {
    if (periodEntries.length === 0) return null;
    return periodEntries[0].startDate;
  }, [periodEntries]);

  const prediction = useMemo(() => {
    if (!latestStart) return null;
    return predictNextPeriod(latestStart, avgCycle);
  }, [latestStart, avgCycle]);

  const fertileWindow = useMemo(() => {
    if (!latestStart) return null;
    return getFertileWindow(latestStart, avgCycle);
  }, [latestStart, avgCycle]);

  const cycleDay = useMemo(() => {
    if (!latestStart) return 1;
    return getCycleDay(latestStart);
  }, [latestStart]);

  const todayRecordedStatus = useMemo<PurityStatus | undefined>(() => {
    if (!activePeriod) return undefined;
    return activePeriod.purityDays?.[todayStr] || (activePeriod.startDate === todayStr ? 'menstruating' : undefined);
  }, [activePeriod, todayStr]);

  // Handlers
  const handleSavePeriod = () => {
    if (!isValidYMD(newStartDate)) {
      Alert.alert(t('Invalid Start Date'), t('Please enter a valid start date (YYYY-MM-DD).'));
      return;
    }
    if (newEndDate && !isValidYMD(newEndDate)) {
      Alert.alert(t('Invalid End Date'), t('Please enter a valid end date (YYYY-MM-DD) or leave it blank.'));
      return;
    }
    if (newEndDate && newEndDate < newStartDate) {
      Alert.alert(t('Date Order Error'), t('End date cannot be earlier than start date.'));
      return;
    }

    const newEntry: PeriodEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      startDate: newStartDate,
      endDate: newEndDate || undefined,
      notes: newNotes.trim() || undefined,
      purityDays: {
        [newStartDate]: 'menstruating',
      },
      createdAt: Date.now(),
    };

    savePeriodEntry(newEntry);
    refreshData();
    setShowLogPeriod(false);
    setNewStartDate(todayStr);
    setNewEndDate('');
    setNewNotes('');
  };

  const handleEndPeriod = (entry: PeriodEntry) => {
    Alert.alert(
      t('Mark Period Ended?'),
      t('This will set today as the end date of your active cycle. You should perform Ghusl before resuming Salah & fasting.'),
      [
        { text: t('Cancel'), style: 'cancel' },
        {
          text: t('End & Mark Pure'),
          onPress: () => {
            const updated: PeriodEntry = {
              ...entry,
              endDate: todayStr,
              purityDays: {
                ...(entry.purityDays || {}),
                [todayStr]: 'pure',
              },
            };
            savePeriodEntry(updated);
            refreshData();
          },
        },
      ]
    );
  };

  const handleDeletePeriod = (entry: PeriodEntry) => {
    deletePeriodEntry(entry.id);
    refreshData();
    saveUndoState({
      id: entry.id,
      action: t('Period entry deleted'),
      revert: () => {
        savePeriodEntry(entry);
        refreshData();
      },
    });
  };

  const handleToggleDayPurity = (entry: PeriodEntry, dateKey: string) => {
    const current: PurityStatus = entry.purityDays?.[dateKey] || 'menstruating';
    const nextStatus: Record<PurityStatus, PurityStatus> = {
      menstruating: 'spotting',
      spotting: 'pure',
      pure: 'menstruating',
    };
    const updatedStatus = nextStatus[current];
    const updatedEntry: PeriodEntry = {
      ...entry,
      purityDays: {
        ...(entry.purityDays || {}),
        [dateKey]: updatedStatus,
      },
    };
    savePeriodEntry(updatedEntry);
    refreshData();
  };

  const isCompact = width < 380;
  const paddingH = isCompact ? 16 : 20;

  return (
    <DetailScreen
      style={[styles.container, { backgroundColor: tokens.bgTop }]}
      header={
        <SubHeader
          eyebrow={t("Women's Worship")}
          title={t('Cycle Tracker')}
          subtitle={t('Period logging, cycle duration, predictions & daily purity status.')}
          onBack={onBack}
          backLabel={t(backLabel)}
          borderBottom
          showFade
        />
      }
    >
      <DetailScreen.ScrollView
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
        showsVerticalScrollIndicator={false}
      >
        {/* Discreet Privacy Note */}
        <View style={[styles.privacyBadge, getPillShadow(mode), { backgroundColor: tokens.cardTop, borderColor: tokens.cardBorder }]}>
          <Ionicons name="shield-checkmark" size={14} color={tokens.goldText} />
          <Text style={[styles.privacyText, { color: tokens.muted }]}>
            {t('Private & local · Stored securely on your device only · Never sent to servers')}
          </Text>
        </View>

        {/* Active Status Hero Card */}
        <View style={[styles.heroCard, activePeriod ? styles.heroCardActive : styles.heroCardEmpty, getCardShadow(mode), { backgroundColor: tokens.cardTop, borderColor: activePeriod ? tokens.goldBorder : tokens.cardBorder, borderWidth: cardTokens.borderWidth, borderRadius: 20 }]}>
          <LinearGradient pointerEvents="none" colors={tokens.cardGradient} style={[StyleSheet.absoluteFill, { borderRadius: 20 }]} />
          <View style={styles.heroHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.heroEyebrow, { color: tokens.goldText }]}>
                {activePeriod ? t('ACTIVE CYCLE') : t('PURITY STATE')}
              </Text>
              <Text style={[styles.heroTitle, { color: tokens.text }]}>
                {activePeriod
                  ? `${t('Menstruating · Day')} ${getCycleDay(activePeriod.startDate)}`
                  : `${t('Ritual Purity (Tuhr) · Day')} ${cycleDay}`}
              </Text>
            </View>
            <View
              style={[
                styles.statusPill,
                getPillShadow(mode),
                {
                  backgroundColor: activePeriod ? (tokens.danger + '20') : tokens.ringFill,
                  borderColor: activePeriod ? tokens.danger : tokens.goldBorder,
                },
              ]}
            >
              <Ionicons
                name={activePeriod ? 'water' : 'sparkles'}
                size={13}
                color={activePeriod ? tokens.danger : tokens.goldText}
              />
              <Text
                style={[
                  styles.statusPillText,
                  { color: activePeriod ? tokens.danger : tokens.goldText },
                ]}
              >
                {activePeriod ? t('Exempt from Salah') : t('Normal Worship')}
              </Text>
            </View>
          </View>

          {activePeriod ? (
            <View style={styles.heroBody}>
              <Text style={[styles.heroDesc, { color: tokens.muted }]}>
                {t('Started on')} {activePeriod.startDate}. {t('Prayer and fasting are exempt out of divine mercy.')}
              </Text>

              {/* Explicit-recording driven status reminder */}
              {todayRecordedStatus === 'menstruating' && (
                <View style={[styles.recordedReminderChip, { backgroundColor: tokens.danger + '15', borderColor: tokens.danger + '50' }]}>
                  <Ionicons name="information-circle" size={15} color={tokens.danger} />
                  <Text style={[styles.recordedReminderText, { color: tokens.text }]}>
                    {t('Recorded as Flow today:')} <Text style={{ fontFamily: 'Manrope_600SemiBold' }}>{t('Exempt from fasting; record qada makeup days later.')}</Text>
                  </Text>
                </View>
              )}
              {todayRecordedStatus === 'pure' && (
                <View style={[styles.recordedReminderChip, { backgroundColor: tokens.ringFill, borderColor: tokens.success }]}>
                  <Ionicons name="sparkles" size={15} color={tokens.success} />
                  <Text style={[styles.recordedReminderText, { color: tokens.text }]}>
                    {t('Recorded as Pure today:')} <Text style={{ fontFamily: 'Manrope_600SemiBold' }}>{t('Perform Ghusl before resuming Salah & fasting.')}</Text>
                  </Text>
                </View>
              )}

              <View style={styles.heroBtnRow}>
                <TouchableOpacity
                  style={[styles.primaryBtn, getPillShadow(mode), { borderColor: tokens.goldBorder }]}
                  onPress={() => handleEndPeriod(activePeriod)}
                  accessibilityRole="button"
                  accessibilityLabel={t('End Period and Mark Pure')}
                >
                  <LinearGradient pointerEvents="none" colors={tokens.goldGradient} style={[StyleSheet.absoluteFill, { borderRadius: 14 }]} />
                  <Ionicons name="checkmark-done" size={16} color={tokens.onGold} />
                  <Text style={[styles.primaryBtnText, { color: tokens.onGold }]}>
                    {t('End Period / Mark Pure')}
                  </Text>
                </TouchableOpacity>
                {onOpenPurity && (
                  <TouchableOpacity
                    style={[styles.guideLinkBtn, getPillShadow(mode), { borderColor: tokens.goldBorder, backgroundColor: tokens.cardTop }]}
                    onPress={onOpenPurity}
                    accessibilityRole="button"
                    accessibilityLabel={t('View Ghusl Guide')}
                  >
                    <Ionicons name="water-outline" size={15} color={tokens.goldText} />
                    <Text style={[styles.guideLinkText, { color: tokens.goldText }]}>{t('Ghusl Guide')}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ) : (
            <View style={styles.heroBody}>
              {prediction && (
                <View style={[styles.predictionBox, { borderColor: tokens.cardBorder, backgroundColor: tokens.ringFill }]}>
                  <Ionicons name="calendar-outline" size={16} color={tokens.goldText} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.predictionTitle, { color: tokens.text }]}>
                      {t('Next predicted cycle in ~')}{prediction.daysRemaining > 0 ? `${prediction.daysRemaining} ${t('days')}` : t('soon')}
                    </Text>
                    <Text style={[styles.predictionSub, { color: tokens.muted }]}>
                      {t('Estimated:')} {prediction.nextDate} · {t('Average interval:')} {avgCycle} {t('days')}
                    </Text>
                  </View>
                </View>
              )}

              {fertileWindow && (
                <View style={[styles.fertileBadge, { borderColor: tokens.cardBorder, backgroundColor: tokens.ringFill }]}>
                  <Ionicons name="information-circle-outline" size={14} color={tokens.muted} />
                  <Text style={[styles.fertileText, { color: tokens.muted }]}>
                    {t('Estimated fertile window:')} {fertileWindow.start} {t('to')} {fertileWindow.end}
                  </Text>
                </View>
              )}
              <Text style={[styles.disclaimerText, { color: tokens.muted }]}>
                {t('Predictions are informational estimates computed strictly from past entries. Not for medical diagnosis or contraception.')}
              </Text>

              <View style={[styles.explicitRuleBox, { borderColor: tokens.cardBorder, backgroundColor: tokens.ringFill }]}>
                <Ionicons name="shield-checkmark-outline" size={14} color={tokens.goldText} />
                <Text style={[styles.explicitRuleText, { color: tokens.muted }]}>
                  {t('Explicit recording rule: Predictions never auto-change prayer schedules, reminders, or fasting records.')}
                </Text>
              </View>

              <View style={styles.heroBtnRow}>
                <TouchableOpacity
                  style={[styles.primaryBtn, getPillShadow(mode), { borderColor: tokens.goldBorder, flex: 1 }]}
                  onPress={() => setShowLogPeriod(true)}
                  accessibilityRole="button"
                  accessibilityLabel={t('Log New Period Start')}
                >
                  <LinearGradient pointerEvents="none" colors={tokens.goldGradient} style={[StyleSheet.absoluteFill, { borderRadius: 14 }]} />
                  <Ionicons name="add-circle-outline" size={16} color={tokens.onGold} />
                  <Text style={[styles.primaryBtnText, { color: tokens.onGold }]}>
                    {t('Log Period Start')}
                  </Text>
                </TouchableOpacity>
                {onOpenPurity && (
                  <TouchableOpacity
                    style={[styles.guideLinkBtn, getPillShadow(mode), { borderColor: tokens.goldBorder, backgroundColor: tokens.cardTop }]}
                    onPress={onOpenPurity}
                    accessibilityRole="button"
                    accessibilityLabel={t('View Ghusl Guide')}
                  >
                    <Ionicons name="water-outline" size={15} color={tokens.goldText} />
                    <Text style={[styles.guideLinkText, { color: tokens.goldText }]}>{t('Ghusl Guide')}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        </View>

        {/* Current Period Day-by-Day Purity Chips */}
        {activePeriod && (
          <View style={[styles.sectionCard, getCardShadow(mode), { backgroundColor: tokens.cardTop, borderColor: tokens.cardBorder, borderWidth: cardTokens.borderWidth, borderRadius: 20 }]}>
            <LinearGradient pointerEvents="none" colors={tokens.cardGradient} style={[StyleSheet.absoluteFill, { borderRadius: 20 }]} />
            <View style={styles.cardHeaderRow}>
              <Ionicons name="flower-outline" size={16} color={tokens.goldText} />
              <Text style={[styles.cardTitle, { color: tokens.text }]}>
                {t('Daily Purity Status')}
              </Text>
            </View>
            <Text style={[styles.cardSub, { color: tokens.muted }]}>
              {t('Tap any day to toggle status: Flow → Spotting → Pure')}
            </Text>
            <View style={styles.chipsGrid}>
              {Array.from({ length: Math.min(15, Math.max(7, getCycleDay(activePeriod.startDate))) }).map(
                (_, idx) => {
                  const dayNum = idx + 1;
                  const d = parseYMD(activePeriod.startDate);
                  d.setDate(d.getDate() + idx);
                  const dStr = formatYMD(d);
                  const status = activePeriod.purityDays?.[dStr] || (dayNum <= getCycleDay(activePeriod.startDate) ? 'menstruating' : 'pure');

                  const statusColors = {
                    menstruating: { bg: tokens.danger + '20', border: tokens.danger, text: tokens.danger, label: t('Flow') },
                    spotting: { bg: tokens.gold + '20', border: tokens.goldText, text: tokens.goldText, label: t('Spot') },
                    pure: { bg: tokens.ringFill, border: tokens.success, text: mode === 'paper' ? tokens.accent : tokens.success, label: t('Pure') },
                  }[status];

                  return (
                    <TouchableOpacity
                      key={dStr}
                      style={[
                        styles.dayChip,
                        { backgroundColor: statusColors.bg, borderColor: statusColors.border },
                      ]}
                      onPress={() => handleToggleDayPurity(activePeriod, dStr)}
                      accessibilityRole="button"
                      accessibilityLabel={`${t('Day')} ${dayNum}, ${dStr}, ${statusColors.label}`}
                    >
                      <Text style={[styles.dayChipNum, { color: tokens.text }]}>
                        D{dayNum}
                      </Text>
                      <Text style={[styles.dayChipStatus, { color: statusColors.text }]}>
                        {statusColors.label}
                      </Text>
                    </TouchableOpacity>
                  );
                }
              )}
            </View>
            <View style={[styles.legendRow, { borderTopColor: tokens.cardBorder }]}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: tokens.danger }]} />
                <Text style={[styles.legendText, { color: tokens.muted }]}>{t('Flow (Bleeding)')}</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: tokens.goldText }]} />
                <Text style={[styles.legendText, { color: tokens.muted }]}>{t('Spotting')}</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: tokens.success }]} />
                <Text style={[styles.legendText, { color: tokens.muted }]}>{t('Pure (Dry / Tuhr)')}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Log Period Form */}
        {showLogPeriod && (
          <View style={[styles.formCard, getCardShadow(mode), { backgroundColor: tokens.cardTop, borderColor: tokens.cardBorder, borderWidth: cardTokens.borderWidth, borderRadius: 20 }]}>
            <LinearGradient pointerEvents="none" colors={tokens.cardGradient} style={[StyleSheet.absoluteFill, { borderRadius: 20 }]} />
            <Text style={[styles.formTitle, { color: tokens.text }]}>{t('Log Period Entry')}</Text>

            <View style={styles.labelRow}>
              <Text style={[styles.inputLabel, { color: tokens.muted }]}>{t('Start Date (YYYY-MM-DD)')}</Text>
              <View style={styles.quickPillsRow}>
                <TouchableOpacity
                  style={[styles.quickPill, getPillShadow(mode), { borderColor: tokens.cardBorder, backgroundColor: tokens.ringFill }]}
                  onPress={() => setNewStartDate(todayStr)}
                >
                  <Text style={[styles.quickPillText, { color: tokens.goldText }]}>{t('Today')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.quickPill, getPillShadow(mode), { borderColor: tokens.cardBorder, backgroundColor: tokens.ringFill }]}
                  onPress={() => setNewStartDate(yesterdayStr)}
                >
                  <Text style={[styles.quickPillText, { color: tokens.muted }]}>{t('Yesterday')}</Text>
                </TouchableOpacity>
              </View>
            </View>
            <TextInput
              style={[styles.textInput, { color: tokens.text, borderColor: tokens.cardBorder, backgroundColor: tokens.ringFill }]}
              value={newStartDate}
              onChangeText={setNewStartDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={tokens.muted}
              keyboardType="numbers-and-punctuation"
            />

            <View style={styles.labelRow}>
              <Text style={[styles.inputLabel, { color: tokens.muted }]}>{t('End Date (Optional, leave blank if active)')}</Text>
              <View style={styles.quickPillsRow}>
                <TouchableOpacity
                  style={[styles.quickPill, getPillShadow(mode), { borderColor: tokens.cardBorder, backgroundColor: tokens.ringFill }]}
                  onPress={() => setNewEndDate(todayStr)}
                >
                  <Text style={[styles.quickPillText, { color: tokens.goldText }]}>{t('Today')}</Text>
                </TouchableOpacity>
                {newEndDate ? (
                  <TouchableOpacity
                    style={[styles.quickPill, getPillShadow(mode), { borderColor: tokens.cardBorder, backgroundColor: tokens.ringFill }]}
                    onPress={() => setNewEndDate('')}
                  >
                    <Text style={[styles.quickPillText, { color: tokens.muted }]}>{t('Clear')}</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
            <TextInput
              style={[styles.textInput, { color: tokens.text, borderColor: tokens.cardBorder, backgroundColor: tokens.ringFill }]}
              value={newEndDate}
              onChangeText={setNewEndDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={tokens.muted}
              keyboardType="numbers-and-punctuation"
            />

            <Text style={[styles.inputLabel, { color: tokens.muted }]}>{t('Notes (Optional)')}</Text>
            <TextInput
              style={[styles.textInput, { color: tokens.text, borderColor: tokens.cardBorder, backgroundColor: tokens.ringFill }]}
              value={newNotes}
              onChangeText={setNewNotes}
              placeholder={t('Cycle notes, flow intensity, pain...')}
              placeholderTextColor={tokens.muted}
            />
            <View style={styles.formBtnRow}>
              <TouchableOpacity
                style={[styles.cancelBtn, getPillShadow(mode), { borderColor: tokens.cardBorder, backgroundColor: tokens.ringFill }]}
                onPress={() => setShowLogPeriod(false)}
                accessibilityRole="button"
                accessibilityLabel={t('Cancel')}
              >
                <Text style={{ color: tokens.muted, fontFamily: 'Manrope_600SemiBold', fontSize: 13 }}>
                  {t('Cancel')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitBtn, getPillShadow(mode), { borderColor: tokens.goldBorder }]}
                onPress={handleSavePeriod}
                accessibilityRole="button"
                accessibilityLabel={t('Save Period Entry')}
              >
                <LinearGradient pointerEvents="none" colors={tokens.goldGradient} style={[StyleSheet.absoluteFill, { borderRadius: 14 }]} />
                <Text style={{ color: tokens.onGold, fontFamily: 'Manrope_700Bold', fontSize: 13 }}>
                  {t('Save Entry')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Recent Cycles History */}
        <View style={styles.historySection}>
          <View style={styles.historyHeader}>
            <Text style={[styles.sectionTitle, { color: tokens.text }]}>{t('Recent History')}</Text>
            {!showLogPeriod && (
              <TouchableOpacity onPress={() => setShowLogPeriod(true)}>
                <Text style={[styles.actionLink, { color: tokens.goldText }]}>{t('+ Add Past Entry')}</Text>
              </TouchableOpacity>
            )}
          </View>

          {periodEntries.length === 0 ? (
            <View style={[styles.emptyCard, getCardShadow(mode), { backgroundColor: tokens.cardTop, borderColor: tokens.cardBorder, borderWidth: cardTokens.borderWidth, borderRadius: 24, padding: 20 }]}>
              <LinearGradient pointerEvents="none" colors={tokens.cardGradient} style={[StyleSheet.absoluteFill, { borderRadius: 24 }]} />
              <EmptyState
                icon="calendar-outline"
                title={t('No periods recorded yet')}
                subtitle={t('Log the start of your cycle to track duration, predictions, and purity markers.')}
                iconSize={40}
              />
              <PrimaryButton title={t('+ Log Period Start')} onPress={() => setShowLogPeriod(true)} style={{ alignSelf: 'center', marginBottom: 12 }} />
            </View>
          ) : (
            periodEntries.map((item) => (
              <View key={item.id} style={[styles.historyCard, getCardShadow(mode), { backgroundColor: item.id === activePeriod?.id ? tokens.ringFill : tokens.cardTop, borderColor: item.id === activePeriod?.id ? tokens.goldBorder : tokens.cardBorder, borderWidth: cardTokens.borderWidth, borderRadius: 20, marginBottom: 10, padding: 16 }]}>
                <LinearGradient pointerEvents="none" colors={tokens.cardGradient} style={[StyleSheet.absoluteFill, { borderRadius: 20 }]} />
                <View style={styles.historyRow}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={[styles.historyDates, { color: tokens.text }]}>
                        {item.startDate} {item.endDate ? `→ ${item.endDate}` : `· (${t('Active')})`}
                      </Text>
                      {!item.endDate && (
                        <View style={[styles.liveBadge, { backgroundColor: tokens.danger + '20', borderColor: tokens.danger, borderWidth: 1 }]}>
                          <Text style={{ color: tokens.danger, fontSize: 9.5, fontFamily: 'Manrope_700Bold' }}>
                            {t('ACTIVE')}
                          </Text>
                        </View>
                      )}
                    </View>
                    {item.notes && (
                      <Text style={[styles.historyNotes, { color: tokens.muted }]}>{item.notes}</Text>
                    )}
                  </View>
                  <TouchableOpacity
                    onPress={() => handleDeletePeriod(item)}
                    accessibilityRole="button"
                    accessibilityLabel={`${t('Delete')} ${item.startDate}`}
                    hitSlop={touchTargetTokens.hitSlop10}
                  >
                    <Ionicons name="trash-outline" size={16} color={tokens.muted} />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>
      </DetailScreen.ScrollView>
    </DetailScreen>
  );
}

export default withUndoToast(WomenCycleScreen);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingTop: 10,
  },
  historyCard: {
    borderRadius: 20,
  },
  emptyCard: {
    borderRadius: 20,
  },
  privacyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: -4,
    marginBottom: 12,
  },
  privacyText: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 11.5,
    flex: 1,
  },
  heroCard: {
    padding: 18,
    marginBottom: 14,
  },
  heroCardActive: {
    borderLeftWidth: 4,
  },
  heroCardEmpty: {
    paddingBottom: 20,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },
  heroEyebrow: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 10.5,
    letterSpacing: 1,
    marginBottom: 2,
  },
  heroTitle: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 23,
    lineHeight: 28,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  statusPillText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 10.5,
  },
  heroBody: {
    gap: 10,
  },
  heroDesc: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
    lineHeight: 18,
  },
  heroBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  primaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
  },
  primaryBtnText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 13,
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  secondaryBtnText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
  },
  guideLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  guideLinkText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12.5,
  },
  predictionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  predictionTitle: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
  },
  predictionSub: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 11.5,
    marginTop: 2,
  },
  fertileBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  fertileText: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 11.5,
    flex: 1,
  },
  disclaimerText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 10.5,
    lineHeight: 14,
  },
  sectionCard: {
    padding: 16,
    marginBottom: 14,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  cardTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 14,
  },
  cardSub: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    marginBottom: 12,
  },
  chipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  dayChip: {
    width: 44,
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  dayChipNum: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 12,
  },
  dayChipStatus: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 9,
    marginTop: 2,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 11,
  },
  formCard: {
    padding: 16,
    gap: 8,
    marginBottom: 14,
  },
  formTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 14.5,
    marginBottom: 4,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  inputLabel: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11.5,
  },
  quickPillsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  quickPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  quickPillText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 10.5,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
  },
  formBtnRow: {
    flexDirection: 'row',
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
  historySection: {
    marginTop: 8,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 14.5,
  },
  actionLink: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12.5,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  historyDates: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
  },
  historyNotes: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 11.5,
    marginTop: 2,
  },
  liveBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  recordedReminderChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginVertical: 4,
  },
  recordedReminderText: {
    flex: 1,
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    lineHeight: 16,
  },
  explicitRuleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginVertical: 4,
  },
  explicitRuleText: {
    flex: 1,
    fontFamily: 'Manrope_500Medium',
    fontSize: 11,
    lineHeight: 15,
  },
});
