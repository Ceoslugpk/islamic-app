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
import { useTheme } from '../lib/theme';
import { SectionHeader } from '../components/SectionHeader';
import { Card } from '../components/Card';
import {
  PeriodEntry,
  PurityStatus,
  savePeriodEntry,
  deletePeriodEntry,
  loadPeriodEntries,
} from '../lib/db';
import {
  formatYMD,
  computeAverageCycleLength,
  predictNextPeriod,
  getCycleDay,
  getFertileWindow,
} from '../lib/womensFiqh';

export default function WomenCycleScreen({ onBack }: { onBack?: () => void }) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const maxW = Math.min(width, 680);

  const [periodEntries, setPeriodEntries] = useState<PeriodEntry[]>([]);
  const [showLogPeriod, setShowLogPeriod] = useState(false);
  const [newStartDate, setNewStartDate] = useState(formatYMD(new Date()));
  const [newEndDate, setNewEndDate] = useState('');
  const [newNotes, setNewNotes] = useState('');

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

  // Handlers
  const handleSavePeriod = () => {
    if (!newStartDate.trim()) return;
    const entry: PeriodEntry = {
      id: `period_${Date.now()}`,
      startDate: newStartDate.trim(),
      endDate: newEndDate.trim() ? newEndDate.trim() : undefined,
      notes: newNotes.trim() ? newNotes.trim() : undefined,
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

  const handleEndPeriod = (entry: PeriodEntry) => {
    const today = formatYMD(new Date());
    const updated: PeriodEntry = {
      ...entry,
      endDate: today,
    };
    savePeriodEntry(updated);
    refreshData();
    Alert.alert(
      'Period Ended · Purity Resumed',
      'Remember to perform Ghusl (ritual purification) before resuming your daily prayers and fasting. Check the Purity & Ghusl tool for step-by-step guidance.',
      [{ text: 'OK' }]
    );
  };

  const handleDeletePeriod = (id: string) => {
    deletePeriodEntry(id);
    refreshData();
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

  return (
    <ScrollView
      style={{ backgroundColor: colors.bgBase }}
      contentContainerStyle={[styles.content, { alignSelf: 'center', width: '100%', maxWidth: maxW }]}
    >
      {onBack && (
        <TouchableOpacity
          style={styles.backBtn}
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Back to Tools"
        >
          <Text style={[styles.backText, { color: colors.accent }]}>← Tools</Text>
        </TouchableOpacity>
      )}

      <SectionHeader
        eyebrow="Women's Worship"
        title="Cycle Tracker"
        subtitle="Period logging, cycle duration, predictions & daily purity status."
      />

      {/* Discreet Privacy Note */}
      <View style={[styles.privacyBadge, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }]}>
        <Ionicons name="shield-checkmark" size={14} color={colors.accent} />
        <Text style={[styles.privacyText, { color: colors.textSecondary }]}>
          Private & local · All logs are stored securely on your device only
        </Text>
      </View>

      {/* Active Status Hero Card */}
      <Card style={styles.heroCard}>
        <View style={styles.heroHeader}>
          <View>
            <Text style={[styles.heroEyebrow, { color: colors.accent }]}>
              {activePeriod ? 'ACTIVE PERIOD' : 'PURITY STATE'}
            </Text>
            <Text style={[styles.heroTitle, { color: colors.textPrimary }]}>
              {activePeriod
                ? `Menstruating · Day ${getCycleDay(activePeriod.startDate)}`
                : `Ritual Purity · Day ${cycleDay}`}
            </Text>
          </View>
          <View
            style={[
              styles.statusPill,
              {
                backgroundColor: activePeriod ? '#991B1B25' : colors.accentDim,
                borderColor: activePeriod ? '#DC2626' : colors.accent,
              },
            ]}
          >
            <Ionicons
              name={activePeriod ? 'water' : 'sparkles'}
              size={14}
              color={activePeriod ? '#EF4444' : colors.accent}
            />
            <Text
              style={[
                styles.statusPillText,
                { color: activePeriod ? '#EF4444' : colors.accent },
              ]}
            >
              {activePeriod ? 'Exempt from Salah' : 'Salah Obligatory'}
            </Text>
          </View>
        </View>

        {activePeriod ? (
          <View style={styles.heroBody}>
            <Text style={[styles.heroDesc, { color: colors.textSecondary }]}>
              Started on {activePeriod.startDate}. Prayer and fasting are exempt out of divine mercy.
            </Text>
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: colors.accent }]}
              onPress={() => handleEndPeriod(activePeriod)}
            >
              <Ionicons name="checkmark-done" size={16} color={colors.onAccent} />
              <Text style={[styles.primaryBtnText, { color: colors.onAccent }]}>
                End Period / Mark Pure
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.heroBody}>
            {prediction && (
              <View style={[styles.predictionBox, { borderColor: colors.borderSubtle }]}>
                <Ionicons name="calendar-outline" size={16} color={colors.accent} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.predictionTitle, { color: colors.textPrimary }]}>
                    Next predicted cycle in ~{prediction.daysRemaining > 0 ? `${prediction.daysRemaining} days` : 'soon'}
                  </Text>
                  <Text style={[styles.predictionSub, { color: colors.textMuted }]}>
                    Estimated: {prediction.nextDate} · Avg interval: {avgCycle} days
                  </Text>
                </View>
              </View>
            )}

            {fertileWindow && (
              <View style={[styles.fertileBadge, { borderColor: colors.borderSubtle }]}>
                <Ionicons name="information-circle-outline" size={14} color={colors.textMuted} />
                <Text style={[styles.fertileText, { color: colors.textSecondary }]}>
                  Approx. fertile window: {fertileWindow.start} to {fertileWindow.end}
                </Text>
              </View>
            )}
            <Text style={[styles.disclaimerText, { color: colors.textMuted }]}>
              Predictions are calculated from past averages for personal tracking only. Not for medical diagnosis or contraception.
            </Text>

            <TouchableOpacity
              style={[styles.secondaryBtn, { borderColor: colors.accent, backgroundColor: colors.accentDim }]}
              onPress={() => setShowLogPeriod(true)}
            >
              <Ionicons name="add-circle-outline" size={16} color={colors.accent} />
              <Text style={[styles.secondaryBtnText, { color: colors.accent }]}>
                Log New Period Start
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </Card>

      {/* Current Period Day-by-Day Purity Chips */}
      {activePeriod && (
        <Card style={styles.sectionCard}>
          <View style={styles.cardHeaderRow}>
            <Ionicons name="flower-outline" size={16} color={colors.accent} />
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
              Daily Purity Status
            </Text>
          </View>
          <Text style={[styles.cardSub, { color: colors.textSecondary }]}>
            Tap any day to toggle status: Menstruating → Spotting → Pure
          </Text>
          <View style={styles.chipsGrid}>
            {Array.from({ length: Math.min(15, Math.max(7, getCycleDay(activePeriod.startDate))) }).map(
              (_, idx) => {
                const dayNum = idx + 1;
                const d = new Date(activePeriod.startDate);
                d.setDate(d.getDate() + idx);
                const dStr = formatYMD(d);
                const status = activePeriod.purityDays?.[dStr] || (dayNum <= getCycleDay(activePeriod.startDate) ? 'menstruating' : 'pure');

                const statusColors = {
                  menstruating: { bg: '#991B1B25', border: '#DC2626', text: '#EF4444', label: 'Flow' },
                  spotting: { bg: '#D9770620', border: '#D97706', text: '#F59E0B', label: 'Spot' },
                  pure: { bg: '#05966920', border: '#059669', text: '#10B981', label: 'Pure' },
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
                    accessibilityLabel={`Day ${dayNum}, ${status}`}
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
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
              <Text style={[styles.legendText, { color: colors.textMuted }]}>Flow (Bleeding)</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} />
              <Text style={[styles.legendText, { color: colors.textMuted }]}>Spotting</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
              <Text style={[styles.legendText, { color: colors.textMuted }]}>Pure (Dry / White)</Text>
            </View>
          </View>
        </Card>
      )}

      {/* Log Period Form */}
      {showLogPeriod && (
        <Card style={styles.formCard}>
          <Text style={[styles.formTitle, { color: colors.textPrimary }]}>Log Period Entry</Text>
          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Start Date (YYYY-MM-DD)</Text>
          <TextInput
            style={[styles.textInput, { color: colors.textPrimary, borderColor: colors.borderSubtle, backgroundColor: colors.bgBase }]}
            value={newStartDate}
            onChangeText={setNewStartDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.textMuted}
          />
          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>End Date (Optional, leave blank if active)</Text>
          <TextInput
            style={[styles.textInput, { color: colors.textPrimary, borderColor: colors.borderSubtle, backgroundColor: colors.bgBase }]}
            value={newEndDate}
            onChangeText={setNewEndDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.textMuted}
          />
          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Notes (Optional)</Text>
          <TextInput
            style={[styles.textInput, { color: colors.textPrimary, borderColor: colors.borderSubtle, backgroundColor: colors.bgBase }]}
            value={newNotes}
            onChangeText={setNewNotes}
            placeholder="Cycle notes, flow intensity..."
            placeholderTextColor={colors.textMuted}
          />
          <View style={styles.formBtnRow}>
            <TouchableOpacity
              style={[styles.cancelBtn, { borderColor: colors.borderSubtle }]}
              onPress={() => setShowLogPeriod(false)}
            >
              <Text style={{ color: colors.textMuted, fontFamily: 'Manrope_600SemiBold', fontSize: 13 }}>
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: colors.accent }]}
              onPress={handleSavePeriod}
            >
              <Text style={{ color: colors.onAccent, fontFamily: 'Manrope_700Bold', fontSize: 13 }}>
                Save Entry
              </Text>
            </TouchableOpacity>
          </View>
        </Card>
      )}

      {/* Recent Cycles History */}
      <View style={styles.historySection}>
        <View style={styles.historyHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Recent History</Text>
          {!showLogPeriod && (
            <TouchableOpacity onPress={() => setShowLogPeriod(true)}>
              <Text style={[styles.actionLink, { color: colors.accent }]}>+ Add Past Entry</Text>
            </TouchableOpacity>
          )}
        </View>

        {periodEntries.length === 0 ? (
          <Card style={{ alignItems: 'center', padding: 24 }}>
            <Ionicons name="calendar-outline" size={28} color={colors.textMuted} style={{ marginBottom: 8 }} />
            <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>No periods recorded yet</Text>
            <Text style={[styles.emptySub, { color: colors.textMuted }]}>
              Log the start of your cycle to track duration, predictions, and purity markers.
            </Text>
          </Card>
        ) : (
          periodEntries.map((item) => (
            <Card key={item.id} style={{ marginBottom: 10, padding: 14 }}>
              <View style={styles.historyRow}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={[styles.historyDates, { color: colors.textPrimary }]}>
                      {item.startDate} {item.endDate ? `→ ${item.endDate}` : '· (Active)'}
                    </Text>
                    {!item.endDate && (
                      <View style={[styles.liveBadge, { backgroundColor: '#EF444425' }]}>
                        <Text style={{ color: '#EF4444', fontSize: 10, fontFamily: 'Manrope_700Bold' }}>
                          ACTIVE
                        </Text>
                      </View>
                    )}
                  </View>
                  {item.notes && (
                    <Text style={[styles.historyNotes, { color: colors.textMuted }]}>{item.notes}</Text>
                  )}
                </View>
                <TouchableOpacity
                  onPress={() => handleDeletePeriod(item.id)}
                  accessibilityLabel="Delete entry"
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

const styles = StyleSheet.create({
  content: {
    padding: 20,
    paddingBottom: 60,
  },
  backBtn: {
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  backText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 14,
  },
  privacyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: -8,
    marginBottom: 16,
  },
  privacyText: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 11.5,
  },
  heroCard: {
    padding: 18,
    marginBottom: 14,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
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
    fontSize: 24,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  statusPillText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
  },
  heroBody: {
    gap: 10,
  },
  heroDesc: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
    lineHeight: 18,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
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
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  secondaryBtnText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
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
    borderTopColor: '#FFFFFF15',
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
  inputLabel: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11.5,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
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
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
  },
  submitBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
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
  emptyTitle: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13.5,
  },
  emptySub: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 11.5,
    textAlign: 'center',
    marginTop: 4,
  },
});
