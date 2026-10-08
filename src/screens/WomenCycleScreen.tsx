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
  ScrollView,
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
import { useTheme } from '../lib/theme';
import { ScreenHeader } from '../components/ScreenHeader';
import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { useUndoToast, withUndoToast } from '../lib/undoToast';
import { getBackIcon } from '../lib/iconMap';
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
  onOpenPurity?: () => void;
  onOpenQada?: () => void;
  onOpenGuidance?: () => void;
}

function WomenCycleScreen({
  onBack,
  onOpenPurity,
  onOpenQada,
  onOpenGuidance,
}: WomenCycleScreenProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const maxW = Math.min(width, 680);
  const { saveUndoState } = useUndoToast();

  const [periodEntries, setPeriodEntries] = useState<PeriodEntry[]>([]);
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

  useEffect(() => {
    refreshData();
  }, [refreshData]);

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

  const todayRecordedStatus = useMemo(() => {
    if (!activePeriod) return undefined;
    return activePeriod.purityDays?.[todayStr] || (activePeriod.startDate === todayStr ? 'menstruating' : undefined);
  }, [activePeriod, todayStr]);

  // Handlers
  const proceedSavePeriod = (startDate: string, endDate?: string, notes?: string) => {
    const entry: PeriodEntry = {
      id: `period_${Date.now()}`,
      startDate,
      endDate: endDate || undefined,
      notes: notes || undefined,
      purityDays: {},
      createdAt: Date.now(),
    };
    savePeriodEntry(entry);
    setShowLogPeriod(false);
    setNewStartDate(formatYMD(new Date()));
    setNewEndDate('');
    setNewNotes('');
    refreshData();
  };

  const handleSavePeriod = () => {
    const cleanStart = newStartDate.trim();
    const cleanEnd = newEndDate.trim();
    const cleanNotes = newNotes.trim();

    if (!cleanStart) {
      Alert.alert(t('Start Date Required'), t('Please provide a valid start date for this period.'));
      return;
    }

    if (!isValidYMD(cleanStart)) {
      Alert.alert(t('Invalid Start Date'), t('Please enter start date in YYYY-MM-DD format (e.g. 2026-10-05).'));
      return;
    }

    if (cleanEnd && !isValidYMD(cleanEnd)) {
      Alert.alert(t('Invalid End Date'), t('Please enter end date in YYYY-MM-DD format (e.g. 2026-10-10).'));
      return;
    }

    if (cleanEnd && cleanEnd < cleanStart) {
      Alert.alert(t('Invalid Range'), t('End date cannot be earlier than start date.'));
      return;
    }

    // Check if an ongoing active period exists
    if (!cleanEnd && activePeriod && activePeriod.startDate !== cleanStart) {
      Alert.alert(
        t('Active Period in Progress'),
        t('An active cycle is currently open. Would you like to end the previous cycle and start this new entry?'),
        [
          { text: t('Cancel'), style: 'cancel' },
          {
            text: t('End Previous & Start New'),
            onPress: () => {
              const closedPrevious: PeriodEntry = {
                ...activePeriod,
                endDate: cleanStart,
              };
              savePeriodEntry(closedPrevious);
              proceedSavePeriod(cleanStart, cleanEnd, cleanNotes);
            },
          },
        ]
      );
      return;
    }

    proceedSavePeriod(cleanStart, cleanEnd, cleanNotes);
  };

  const handleEndPeriod = (entry: PeriodEntry) => {
    const today = formatYMD(new Date());
    const updated: PeriodEntry = {
      ...entry,
      endDate: today,
    };
    savePeriodEntry(updated);
    refreshData();
    Alert.alert(
      t('Period Ended · Purity Resumed'),
      t('Remember to perform Ghusl (ritual purification) before resuming your daily prayers and fasting.'),
      [
        { text: t('Later'), style: 'cancel' },
        ...(onOpenPurity
          ? [
              {
                text: t('View Ghusl Guide'),
                onPress: () => onOpenPurity(),
              },
            ]
          : [{ text: t('OK') }]),
      ]
    );
  };

  const handleDeletePeriod = (item: PeriodEntry) => {
    Alert.alert(
      t('Delete Period Entry?'),
      t('Are you sure you want to delete this period record?'),
      [
        { text: t('Cancel'), style: 'cancel' },
        {
          text: t('Delete'),
          style: 'destructive',
          onPress: () => {
            deletePeriodEntry(item.id);
            refreshData();
            saveUndoState({
              id: item.id,
              action: t('Period entry deleted'),
              revert: () => {
                savePeriodEntry(item);
                refreshData();
              },
            });
          },
        },
      ]
    );
  };

  const handleToggleDayPurity = (entry: PeriodEntry, dateKey: string) => {
    const current = entry.purityDays?.[dateKey] || 'menstruating';
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
    <ScrollView
      style={{ backgroundColor: colors.bgBase }}
      contentContainerStyle={[styles.content, { alignSelf: 'center', width: '100%', maxWidth: maxW, paddingHorizontal: paddingH }]}
      keyboardShouldPersistTaps="handled"
    >
      <ScreenHeader
        eyebrow={t("Women's Worship")}
        title={t('Cycle Tracker')}
        subtitle={t('Period logging, cycle duration, predictions & daily purity status.')}
        onBack={onBack}
        backLabel={t('Tools')}
      />

      {/* Discreet Privacy Note */}
      <View style={[styles.privacyBadge, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }]}>
        <Ionicons name="shield-checkmark" size={14} color={colors.accent} />
        <Text style={[styles.privacyText, { color: colors.textSecondary }]}>
          {t('Private & local · Stored securely on your device only · Never sent to servers')}
        </Text>
      </View>

      {/* Active Status Hero Card */}
      <Card style={styles.heroCard}>
        <View style={styles.heroHeader}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.heroEyebrow, { color: colors.accent }]}>
              {activePeriod ? t('ACTIVE CYCLE') : t('PURITY STATE')}
            </Text>
            <Text style={[styles.heroTitle, { color: colors.textPrimary }]}>
              {activePeriod
                ? `${t('Menstruating · Day')} ${getCycleDay(activePeriod.startDate)}`
                : `${t('Ritual Purity (Tuhr) · Day')} ${cycleDay}`}
            </Text>
          </View>
          <View
            style={[
              styles.statusPill,
              {
                backgroundColor: activePeriod ? '#991B1B20' : colors.accentDim,
                borderColor: activePeriod ? colors.destructive : colors.accent,
              },
            ]}
          >
            <Ionicons
              name={activePeriod ? 'water' : 'sparkles'}
              size={13}
              color={activePeriod ? colors.destructive : colors.accent}
            />
            <Text
              style={[
                styles.statusPillText,
                { color: activePeriod ? colors.destructive : colors.accent },
              ]}
            >
              {activePeriod ? t('Exempt from Salah') : t('Normal Worship')}
            </Text>
          </View>
        </View>

        {activePeriod ? (
          <View style={styles.heroBody}>
            <Text style={[styles.heroDesc, { color: colors.textSecondary }]}>
              {t('Started on')} {activePeriod.startDate}. {t('Prayer and fasting are exempt out of divine mercy.')}
            </Text>

            {/* Explicit-recording driven status reminder */}
            {todayRecordedStatus === 'menstruating' && (
              <View style={[styles.recordedReminderChip, { backgroundColor: '#EF444415', borderColor: '#EF444450' }]}>
                <Ionicons name="information-circle" size={15} color={colors.destructive} />
                <Text style={[styles.recordedReminderText, { color: colors.textPrimary }]}>
                  {t('Recorded as Flow today:')} <Text style={{ fontFamily: 'Manrope_600SemiBold' }}>{t('Exempt from fasting; record qada makeup days later.')}</Text>
                </Text>
              </View>
            )}
            {todayRecordedStatus === 'pure' && (
              <View style={[styles.recordedReminderChip, { backgroundColor: '#10B98115', borderColor: '#10B98150' }]}>
                <Ionicons name="sparkles" size={15} color="#10B981" />
                <Text style={[styles.recordedReminderText, { color: colors.textPrimary }]}>
                  {t('Recorded as Pure today:')} <Text style={{ fontFamily: 'Manrope_600SemiBold' }}>{t('Perform Ghusl before resuming Salah & fasting.')}</Text>
                </Text>
              </View>
            )}

            <View style={styles.heroBtnRow}>
              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: colors.accent }]}
                onPress={() => handleEndPeriod(activePeriod)}
                accessibilityRole="button"
                accessibilityLabel={t('End Period and Mark Pure')}
              >
                <Ionicons name="checkmark-done" size={16} color={colors.onAccent} />
                <Text style={[styles.primaryBtnText, { color: colors.onAccent }]}>
                  {t('End Period / Mark Pure')}
                </Text>
              </TouchableOpacity>
              {onOpenPurity && (
                <TouchableOpacity
                  style={[styles.guideLinkBtn, { borderColor: colors.borderSubtle }]}
                  onPress={onOpenPurity}
                  accessibilityRole="button"
                  accessibilityLabel={t('View Ghusl Guide')}
                >
                  <Ionicons name="water-outline" size={15} color={colors.accent} />
                  <Text style={[styles.guideLinkText, { color: colors.accent }]}>{t('Ghusl Guide')}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ) : (
          <View style={styles.heroBody}>
            {prediction && (
              <View style={[styles.predictionBox, { borderColor: colors.borderSubtle, backgroundColor: colors.bgSurface }]}>
                <Ionicons name="calendar-outline" size={16} color={colors.accent} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.predictionTitle, { color: colors.textPrimary }]}>
                    {t('Next predicted cycle in ~')}{prediction.daysRemaining > 0 ? `${prediction.daysRemaining} ${t('days')}` : t('soon')}
                  </Text>
                  <Text style={[styles.predictionSub, { color: colors.textMuted }]}>
                    {t('Estimated:')} {prediction.nextDate} · {t('Average interval:')} {avgCycle} {t('days')}
                  </Text>
                </View>
              </View>
            )}

            {fertileWindow && (
              <View style={[styles.fertileBadge, { borderColor: colors.borderSubtle, backgroundColor: colors.bgSurface }]}>
                <Ionicons name="information-circle-outline" size={14} color={colors.textMuted} />
                <Text style={[styles.fertileText, { color: colors.textSecondary }]}>
                  {t('Estimated fertile window:')} {fertileWindow.start} {t('to')} {fertileWindow.end}
                </Text>
              </View>
            )}
            <Text style={[styles.disclaimerText, { color: colors.textMuted }]}>
              {t('Predictions are informational estimates computed strictly from past entries. Not for medical diagnosis or contraception.')}
            </Text>

            <View style={[styles.explicitRuleBox, { borderColor: colors.borderSubtle, backgroundColor: colors.bgSurface }]}>
              <Ionicons name="shield-checkmark-outline" size={14} color={colors.accent} />
              <Text style={[styles.explicitRuleText, { color: colors.textMuted }]}>
                {t('Explicit recording rule: Predictions never auto-change prayer schedules, reminders, or fasting records.')}
              </Text>
            </View>

            <View style={styles.heroBtnRow}>
              <TouchableOpacity
                style={[styles.secondaryBtn, { borderColor: colors.accent, backgroundColor: colors.accentDim, flex: 1 }]}
                onPress={() => setShowLogPeriod(true)}
                accessibilityRole="button"
                accessibilityLabel={t('Log New Period Start')}
              >
                <Ionicons name="add-circle-outline" size={16} color={colors.accent} />
                <Text style={[styles.secondaryBtnText, { color: colors.accent }]}>
                  {t('Log Period Start')}
                </Text>
              </TouchableOpacity>
              {onOpenPurity && (
                <TouchableOpacity
                  style={[styles.guideLinkBtn, { borderColor: colors.borderSubtle }]}
                  onPress={onOpenPurity}
                  accessibilityRole="button"
                  accessibilityLabel={t('View Ghusl Guide')}
                >
                  <Ionicons name="water-outline" size={15} color={colors.accent} />
                  <Text style={[styles.guideLinkText, { color: colors.accent }]}>{t('Ghusl Guide')}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </Card>

      {/* Current Period Day-by-Day Purity Chips */}
      {activePeriod && (
        <Card style={styles.sectionCard}>
          <View style={styles.cardHeaderRow}>
            <Ionicons name="flower-outline" size={16} color={colors.accent} />
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
              {t('Daily Purity Status')}
            </Text>
          </View>
          <Text style={[styles.cardSub, { color: colors.textSecondary }]}>
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
                  menstruating: { bg: '#991B1B20', border: colors.destructive, text: colors.destructive, label: t('Flow') },
                  spotting: { bg: '#D9770620', border: '#D97706', text: '#F59E0B', label: t('Spot') },
                  pure: { bg: '#05966920', border: '#059669', text: '#10B981', label: t('Pure') },
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
                    <Text style={[styles.dayChipNum, { color: colors.textPrimary }]}>
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
          <View style={[styles.legendRow, { borderTopColor: colors.borderSubtle }]}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.destructive }]} />
              <Text style={[styles.legendText, { color: colors.textMuted }]}>{t('Flow (Bleeding)')}</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} />
              <Text style={[styles.legendText, { color: colors.textMuted }]}>{t('Spotting')}</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
              <Text style={[styles.legendText, { color: colors.textMuted }]}>{t('Pure (Dry / Tuhr)')}</Text>
            </View>
          </View>
        </Card>
      )}

      {/* Log Period Form */}
      {showLogPeriod && (
        <Card style={styles.formCard}>
          <Text style={[styles.formTitle, { color: colors.textPrimary }]}>{t('Log Period Entry')}</Text>
          
          <View style={styles.labelRow}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('Start Date (YYYY-MM-DD)')}</Text>
            <View style={styles.quickPillsRow}>
              <TouchableOpacity
                style={[styles.quickPill, { borderColor: colors.borderSubtle, backgroundColor: colors.bgBase }]}
                onPress={() => setNewStartDate(todayStr)}
              >
                <Text style={[styles.quickPillText, { color: colors.accent }]}>{t('Today')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.quickPill, { borderColor: colors.borderSubtle, backgroundColor: colors.bgBase }]}
                onPress={() => setNewStartDate(yesterdayStr)}
              >
                <Text style={[styles.quickPillText, { color: colors.textSecondary }]}>{t('Yesterday')}</Text>
              </TouchableOpacity>
            </View>
          </View>
          <TextInput
            style={[styles.textInput, { color: colors.textPrimary, borderColor: colors.borderSubtle, backgroundColor: colors.bgBase }]}
            value={newStartDate}
            onChangeText={setNewStartDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.textMuted}
            keyboardType="numbers-and-punctuation"
          />

          <View style={styles.labelRow}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('End Date (Optional, leave blank if active)')}</Text>
            <View style={styles.quickPillsRow}>
              <TouchableOpacity
                style={[styles.quickPill, { borderColor: colors.borderSubtle, backgroundColor: colors.bgBase }]}
                onPress={() => setNewEndDate(todayStr)}
              >
                <Text style={[styles.quickPillText, { color: colors.accent }]}>{t('Today')}</Text>
              </TouchableOpacity>
              {newEndDate ? (
                <TouchableOpacity
                  style={[styles.quickPill, { borderColor: colors.borderSubtle, backgroundColor: colors.bgBase }]}
                  onPress={() => setNewEndDate('')}
                >
                  <Text style={[styles.quickPillText, { color: colors.textMuted }]}>{t('Clear')}</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
          <TextInput
            style={[styles.textInput, { color: colors.textPrimary, borderColor: colors.borderSubtle, backgroundColor: colors.bgBase }]}
            value={newEndDate}
            onChangeText={setNewEndDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.textMuted}
            keyboardType="numbers-and-punctuation"
          />

          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('Notes (Optional)')}</Text>
          <TextInput
            style={[styles.textInput, { color: colors.textPrimary, borderColor: colors.borderSubtle, backgroundColor: colors.bgBase }]}
            value={newNotes}
            onChangeText={setNewNotes}
            placeholder={t('Cycle notes, flow intensity, pain...')}
            placeholderTextColor={colors.textMuted}
          />
          <View style={styles.formBtnRow}>
            <TouchableOpacity
              style={[styles.cancelBtn, { borderColor: colors.borderSubtle }]}
              onPress={() => setShowLogPeriod(false)}
              accessibilityRole="button"
              accessibilityLabel={t('Cancel')}
            >
              <Text style={{ color: colors.textMuted, fontFamily: 'Manrope_600SemiBold', fontSize: 13 }}>
                {t('Cancel')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: colors.accent }]}
              onPress={handleSavePeriod}
              accessibilityRole="button"
              accessibilityLabel={t('Save Period Entry')}
            >
              <Text style={{ color: colors.onAccent, fontFamily: 'Manrope_700Bold', fontSize: 13 }}>
                {t('Save Entry')}
              </Text>
            </TouchableOpacity>
          </View>
        </Card>
      )}

      {/* Recent Cycles History */}
      <View style={styles.historySection}>
        <View style={styles.historyHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('Recent History')}</Text>
          {!showLogPeriod && (
            <TouchableOpacity onPress={() => setShowLogPeriod(true)}>
              <Text style={[styles.actionLink, { color: colors.accent }]}>{t('+ Add Past Entry')}</Text>
            </TouchableOpacity>
          )}
        </View>

        {periodEntries.length === 0 ? (
          <EmptyState
            icon="calendar-outline"
            title={t('No periods recorded yet')}
            subtitle={t('Log the start of your cycle to track duration, predictions, and purity markers.')}
            actionLabel={t('+ Log Period Start')}
            onAction={() => setShowLogPeriod(true)}
            iconSize={40}
          />
        ) : (
          periodEntries.map((item) => (
            <Card key={item.id} style={{ marginBottom: 10, padding: 14 }}>
              <View style={styles.historyRow}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={[styles.historyDates, { color: colors.textPrimary }]}>
                      {item.startDate} {item.endDate ? `→ ${item.endDate}` : `· (${t('Active')})`}
                    </Text>
                    {!item.endDate && (
                      <View style={[styles.liveBadge, { backgroundColor: '#EF444420', borderColor: colors.destructive, borderWidth: 1 }]}>
                        <Text style={{ color: colors.destructive, fontSize: 9.5, fontFamily: 'Manrope_700Bold' }}>
                          {t('ACTIVE')}
                        </Text>
                      </View>
                    )}
                  </View>
                  {item.notes && (
                    <Text style={[styles.historyNotes, { color: colors.textMuted }]}>{item.notes}</Text>
                  )}
                </View>
                <TouchableOpacity
                  onPress={() => handleDeletePeriod(item)}
                  accessibilityRole="button"
                  accessibilityLabel={`${t('Delete')} ${item.startDate}`}
                  hitSlop={touchTargetTokens.hitSlop10}
                >
                  <Ionicons name="trash-outline" size={16} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
            </Card>
          ))
        )}
      </View>
    </ScrollView>
  );
}

export default withUndoToast(WomenCycleScreen);

const styles = StyleSheet.create({
  content: {
    padding: 20,
    paddingTop: 10,
    paddingBottom: 60,
  },
  backBtn: {
    alignSelf: 'flex-start',
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingRight: 10,
    marginBottom: 4,
  },
  backText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
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
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  primaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: buttonTokens.md.minHeight,
    paddingHorizontal: 14,
    borderRadius: buttonTokens.md.borderRadius,
  },
  primaryBtnText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 13.5,
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: buttonTokens.md.minHeight,
    paddingHorizontal: 14,
    borderRadius: buttonTokens.md.borderRadius,
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
    minHeight: buttonTokens.md.minHeight,
    paddingHorizontal: 12,
    borderRadius: buttonTokens.md.borderRadius,
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
