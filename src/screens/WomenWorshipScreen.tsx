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
import { Hairline } from '../components/Hairline';
import { Card } from '../components/Card';
import { ArabicText } from '../components/ArabicText';
import {
  PeriodEntry,
  NifasEntry,
  PurityStatus,
  savePeriodEntry,
  deletePeriodEntry,
  loadPeriodEntries,
  saveNifasEntry,
  deleteNifasEntry,
  loadNifasEntries,
  MissedFastItem,
  loadMissedFasts,
  saveMissedFast,
  toggleMissedFastMadeUp,
  deleteMissedFast,
} from '../lib/db';
import {
  GHUSL_REASONS,
  GHUSL_STEPS,
  WORSHIP_GUIDELINES,
  BLEEDING_TYPES,
  WOMENS_FIQH_RESOURCES,
  formatYMD,
  computeAverageCycleLength,
  predictNextPeriod,
  getCycleDay,
  getFertileWindow,
} from '../lib/womensFiqh';

type WomenSubTab = 'cycle' | 'ghusl' | 'guidance' | 'qada';

export default function WomenWorshipScreen({ onBack }: { onBack?: () => void }) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const maxW = Math.min(width, 680);

  const [activeTab, setActiveTab] = useState<WomenSubTab>('cycle');

  // Cycle state
  const [periodEntries, setPeriodEntries] = useState<PeriodEntry[]>([]);
  const [showLogPeriod, setShowLogPeriod] = useState(false);
  const [newStartDate, setNewStartDate] = useState(formatYMD(new Date()));
  const [newEndDate, setNewEndDate] = useState('');
  const [newNotes, setNewNotes] = useState('');

  // Nifas state
  const [nifasEntries, setNifasEntries] = useState<NifasEntry[]>([]);
  const [showLogNifas, setShowLogNifas] = useState(false);
  const [newNifasStart, setNewNifasStart] = useState(formatYMD(new Date()));
  const [newNifasEnd, setNewNifasEnd] = useState('');
  const [newNifasNotes, setNewNifasNotes] = useState('');

  // Qada / Missed fasts state
  const [missedFasts, setMissedFasts] = useState<MissedFastItem[]>([]);
  const [showAddQada, setShowAddQada] = useState(false);
  const [qadaDate, setQadaDate] = useState(formatYMD(new Date()));
  const [qadaReason, setQadaReason] = useState('Menstruation / Post-natal');
  const [qadaNote, setQadaNote] = useState('');

  // Ghusl step filter
  const [ghuslFilter, setGhuslFilter] = useState<'all' | 'obligatory' | 'sunnah'>('all');

  // Load data
  const refreshData = useCallback(() => {
    setPeriodEntries(loadPeriodEntries());
    setNifasEntries(loadNifasEntries());
    setMissedFasts(loadMissedFasts());
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

  // Active nifas calculation
  const activeNifas = useMemo(() => {
    return nifasEntries.find((n) => !n.endDate);
  }, [nifasEntries]);

  const nifasDay = useMemo(() => {
    if (!activeNifas) return 1;
    return getCycleDay(activeNifas.startDate);
  }, [activeNifas]);

  // Filtered Qada list (show women's reasons or all)
  const womenQadaFasts = useMemo(() => {
    return missedFasts;
  }, [missedFasts]);

  const qadaStats = useMemo(() => {
    const total = womenQadaFasts.length;
    const completed = womenQadaFasts.filter((f) => f.madeUp).length;
    const pending = total - completed;
    return { total, completed, pending };
  }, [womenQadaFasts]);

  // Handlers for Period
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
      'Remember to perform Ghusl (ritual purification) before resuming your daily prayers and fasting. Tap "Ghusl & Nifas" tab for steps.',
      [{ text: 'View Ghusl Guide', onPress: () => setActiveTab('ghusl') }, { text: 'Done', style: 'cancel' }]
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

  // Handlers for Nifas
  const handleSaveNifas = () => {
    if (!newNifasStart.trim()) return;
    const entry: NifasEntry = {
      id: `nifas_${Date.now()}`,
      startDate: newNifasStart.trim(),
      endDate: newNifasEnd.trim() ? newNifasEnd.trim() : undefined,
      notes: newNifasNotes.trim() ? newNifasNotes.trim() : undefined,
      createdAt: Date.now(),
    };
    saveNifasEntry(entry);
    setShowLogNifas(false);
    setNewNifasStart(formatYMD(new Date()));
    setNewNifasEnd('');
    setNewNifasNotes('');
    refreshData();
  };

  const handleEndNifas = (entry: NifasEntry) => {
    const today = formatYMD(new Date());
    const updated: NifasEntry = {
      ...entry,
      endDate: today,
    };
    saveNifasEntry(updated);
    refreshData();
    Alert.alert(
      'Nifas Ended · Purity Resumed',
      'Please perform Ghusl to purify yourself and resume your prayers and fasting.',
      [{ text: 'OK' }]
    );
  };

  const handleDeleteNifas = (id: string) => {
    deleteNifasEntry(id);
    refreshData();
  };

  // Handlers for Qada
  const handleSaveQada = () => {
    if (!qadaDate.trim()) return;
    const item: MissedFastItem = {
      id: `missed_${Date.now()}`,
      date: qadaDate.trim(),
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

  const handleDeleteQada = (id: string) => {
    deleteMissedFast(id);
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
        eyebrow="Worship & Purity"
        title="Women's Worship"
        subtitle="Cycle tracking, purity markers, ghusl guidance, and authentic fiqh."
      />

      {/* Discreet Privacy Note */}
      <View style={[styles.privacyBadge, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }]}>
        <Ionicons name="shield-checkmark" size={14} color={colors.accent} />
        <Text style={[styles.privacyText, { color: colors.textSecondary }]}>
          Private & local · All logs are stored securely on your device only
        </Text>
      </View>

      {/* Tab Navigation */}
      <View style={[styles.tabBar, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }]}>
        {(['cycle', 'ghusl', 'guidance', 'qada'] as WomenSubTab[]).map((tab) => {
          const isSelected = activeTab === tab;
          const labels: Record<WomenSubTab, string> = {
            cycle: 'Cycle',
            ghusl: 'Ghusl & Nifas',
            guidance: 'Worship Guide',
            qada: 'Missed Fasts',
          };
          return (
            <TouchableOpacity
              key={tab}
              style={[
                styles.tabBtn,
                isSelected && { backgroundColor: colors.accentDim, borderColor: colors.accent },
              ]}
              onPress={() => setActiveTab(tab)}
              accessibilityRole="tab"
              accessibilityState={{ selected: isSelected }}
            >
              <Text
                style={[
                  styles.tabBtnText,
                  { color: isSelected ? colors.accent : colors.textMuted },
                ]}
                numberOfLines={1}
              >
                {labels[tab]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ─── TAB 1: CYCLE & PURITY ─────────────────────────────────── */}
      {activeTab === 'cycle' && (
        <View style={styles.tabContent}>
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

          {/* Log Period Modal / Form */}
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
              periodEntries.map((item, i) => (
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
        </View>
      )}

      {/* ─── TAB 2: GHUSL & NIFAS ───────────────────────────────────── */}
      {activeTab === 'ghusl' && (
        <View style={styles.tabContent}>
          {/* Postpartum / Nifas Tracker Card */}
          <Card style={styles.sectionCard}>
            <View style={styles.cardHeaderRow}>
              <Ionicons name="heart-outline" size={16} color={colors.accent} />
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                Postpartum Tracker (Nifas)
              </Text>
            </View>
            <Text style={[styles.cardSub, { color: colors.textSecondary }]}>
              Postpartum bleeding following childbirth. Standard Prophetic maximum is 40 days.
            </Text>

            {activeNifas ? (
              <View style={[styles.activeNifasBox, { backgroundColor: colors.accentDim, borderColor: colors.accent }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.activeNifasTitle, { color: colors.accent }]}>
                    Active Nifas · Day {nifasDay} of 40
                  </Text>
                  <Text style={[styles.activeNifasSub, { color: colors.textSecondary }]}>
                    Started: {activeNifas.startDate} · Once bleeding ceases completely, perform Ghusl.
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.smallBtn, { backgroundColor: colors.accent }]}
                  onPress={() => handleEndNifas(activeNifas)}
                >
                  <Text style={[styles.smallBtnText, { color: colors.onAccent }]}>Mark Pure</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.secondaryBtn, { borderColor: colors.accent, backgroundColor: colors.accentDim, marginTop: 8 }]}
                onPress={() => setShowLogNifas(true)}
              >
                <Ionicons name="add" size={16} color={colors.accent} />
                <Text style={[styles.secondaryBtnText, { color: colors.accent }]}>
                  Log Postpartum (Nifas) Delivery Date
                </Text>
              </TouchableOpacity>
            )}

            {showLogNifas && (
              <View style={[styles.innerForm, { borderColor: colors.borderSubtle }]}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Delivery Date (YYYY-MM-DD)</Text>
                <TextInput
                  style={[styles.textInput, { color: colors.textPrimary, borderColor: colors.borderSubtle, backgroundColor: colors.bgBase }]}
                  value={newNifasStart}
                  onChangeText={setNewNifasStart}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.textMuted}
                />
                <View style={styles.formBtnRow}>
                  <TouchableOpacity
                    style={[styles.cancelBtn, { borderColor: colors.borderSubtle }]}
                    onPress={() => setShowLogNifas(false)}
                  >
                    <Text style={{ color: colors.textMuted, fontSize: 12 }}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.submitBtn, { backgroundColor: colors.accent }]}
                    onPress={handleSaveNifas}
                  >
                    <Text style={{ color: colors.onAccent, fontSize: 12, fontFamily: 'Manrope_700Bold' }}>Save</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </Card>

          {/* When Ghusl is Obligatory */}
          <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginTop: 14 }]}>
            When is Ghusl Required?
          </Text>
          {GHUSL_REASONS.map((r) => (
            <Card key={r.id} style={{ marginBottom: 10, padding: 14 }}>
              <Text style={[styles.reasonTitle, { color: colors.textPrimary }]}>{r.title}</Text>
              <Text style={[styles.reasonDesc, { color: colors.textSecondary }]}>{r.description}</Text>
              <Text style={[styles.reasonRef, { color: colors.accent }]}>{r.reference}</Text>
            </Card>
          ))}

          {/* How to Perform Ghusl */}
          <View style={[styles.historyHeader, { marginTop: 14 }]}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>How to Perform Ghusl</Text>
            <View style={styles.filterPills}>
              {(['all', 'obligatory', 'sunnah'] as const).map((f) => (
                <TouchableOpacity
                  key={f}
                  style={[
                    styles.filterPill,
                    ghuslFilter === f && { backgroundColor: colors.accent, borderColor: colors.accent },
                  ]}
                  onPress={() => setGhuslFilter(f)}
                >
                  <Text
                    style={[
                      styles.filterPillText,
                      { color: ghuslFilter === f ? colors.onAccent : colors.textMuted },
                    ]}
                  >
                    {f === 'all' ? 'All Steps' : f === 'obligatory' ? 'Obligatory (Fard)' : 'Sunnah'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {GHUSL_STEPS.filter((s) => ghuslFilter === 'all' || s.type === ghuslFilter).map((s) => (
            <Card key={s.id} style={{ marginBottom: 10, padding: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text style={[styles.stepTitle, { color: colors.textPrimary }]}>{s.title}</Text>
                <View
                  style={[
                    styles.stepBadge,
                    {
                      backgroundColor: s.type === 'obligatory' ? colors.accentDim : colors.bgSurface,
                      borderColor: s.type === 'obligatory' ? colors.accent : colors.borderSubtle,
                    },
                  ]}
                >
                  <Text style={[styles.stepBadgeText, { color: s.type === 'obligatory' ? colors.accent : colors.textMuted }]}>
                    {s.type === 'obligatory' ? 'Obligatory (Rukn)' : 'Sunnah'}
                  </Text>
                </View>
              </View>
              {s.arabic && (
                <ArabicText size={20} style={{ marginVertical: 6 }}>
                  {s.arabic}
                </ArabicText>
              )}
              {s.transliteration && (
                <Text style={[styles.stepTranslit, { color: colors.accent }]}>
                  {s.transliteration}
                </Text>
              )}
              <Text style={[styles.stepDesc, { color: colors.textSecondary }]}>{s.description}</Text>
            </Card>
          ))}

          {/* Signs of Purity Card */}
          <Card style={{ ...styles.infoCard, borderColor: colors.accent, backgroundColor: colors.accentDim }}>
            <Ionicons name="sparkles" size={18} color={colors.accent} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.infoCardTitle, { color: colors.accent }]}>
                Recognizing Purity (Tuhr)
              </Text>
              <Text style={[styles.infoCardDesc, { color: colors.textPrimary }]}>
                A woman knows her period has ended by either:
                {'\n'}1. <Text style={{ fontFamily: 'Manrope_700Bold' }}>Al-Qassah Al-Bayda:</Text> A clear, white fluid discharged at the conclusion of menses.
                {'\n'}2. <Text style={{ fontFamily: 'Manrope_700Bold' }}>Al-Jufuf (Complete Dryness):</Text> A piece of clean cotton emerges completely dry without any trace of blood, yellowish, or brownish discharge.
              </Text>
            </View>
          </Card>
        </View>
      )}

      {/* ─── TAB 3: WORSHIP GUIDANCE & FIQH ───────────────────────── */}
      {activeTab === 'guidance' && (
        <View style={styles.tabContent}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Rulings During Menses & Postpartum
          </Text>
          <Text style={[styles.sectionDesc, { color: colors.textSecondary }]}>
            Authentic guidance on exemptions, permitted devotional acts, and divine mercy.
          </Text>

          {WORSHIP_GUIDELINES.map((item) => {
            const statusConfig = {
              restricted: { color: '#EF4444', icon: 'close-circle', label: 'Exempt / Restricted' },
              permitted: { color: '#3B82F6', icon: 'checkmark-circle', label: 'Permitted' },
              recommended: { color: '#10B981', icon: 'star', label: 'Highly Encouraged' },
            }[item.status];

            return (
              <Card key={item.id} style={{ marginBottom: 12, padding: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Text style={[styles.worshipTopic, { color: colors.textPrimary }]}>{item.topic}</Text>
                  <View style={[styles.worshipBadge, { borderColor: statusConfig.color }]}>
                    <Ionicons name={statusConfig.icon as any} size={12} color={statusConfig.color} />
                    <Text style={[styles.worshipBadgeText, { color: statusConfig.color }]}>
                      {statusConfig.label}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.worshipRuling, { color: colors.accent }]}>{item.ruling}</Text>
                <Text style={[styles.worshipDetails, { color: colors.textSecondary }]}>{item.details}</Text>
                <Text style={[styles.worshipEvidence, { color: colors.textMuted }]}>
                  Source: {item.evidence}
                </Text>
              </Card>
            );
          })}

          {/* Hayd vs Nifas vs Istihadha */}
          <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginTop: 16 }]}>
            Hayd, Nifas & Istihadha (Irregular Bleeding)
          </Text>
          {BLEEDING_TYPES.map((b) => (
            <Card key={b.name} style={{ marginBottom: 10, padding: 14 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <Text style={[styles.bleedingName, { color: colors.textPrimary }]}>{b.name}</Text>
                <ArabicText size={18}>{b.arabic}</ArabicText>
              </View>
              <Text style={[styles.bleedingDef, { color: colors.textSecondary }]}>{b.definition}</Text>
              <View style={styles.bleedingRow}>
                <Text style={[styles.bleedingLabel, { color: colors.accent }]}>Duration: </Text>
                <Text style={[styles.bleedingVal, { color: colors.textPrimary }]}>{b.duration}</Text>
              </View>
              <View style={styles.bleedingRow}>
                <Text style={[styles.bleedingLabel, { color: colors.accent }]}>Rulings: </Text>
                <Text style={[styles.bleedingVal, { color: colors.textPrimary }]}>{b.rulings}</Text>
              </View>
            </Card>
          ))}

          {/* Recommended Reading List */}
          <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginTop: 16 }]}>
            Recommended Fiqh References
          </Text>
          {WOMENS_FIQH_RESOURCES.map((res) => (
            <Card key={res.id} style={{ marginBottom: 10, padding: 14 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={[styles.resourceTitle, { color: colors.textPrimary }]}>{res.title}</Text>
                <View style={[styles.catBadge, { borderColor: colors.borderSubtle }]}>
                  <Text style={[styles.catBadgeText, { color: colors.accent }]}>{res.category}</Text>
                </View>
              </View>
              <Text style={[styles.resourceAuthor, { color: colors.accent }]}>{res.author}</Text>
              <Text style={[styles.resourceDesc, { color: colors.textSecondary }]}>{res.description}</Text>
            </Card>
          ))}

          {/* Scholar Consultation Disclaimer */}
          <Card style={{ ...styles.disclaimerCard, borderColor: colors.borderSubtle }}>
            <Ionicons name="medical-outline" size={20} color={colors.accent} />
            <Text style={[styles.disclaimerCardText, { color: colors.textSecondary }]}>
              Rulings on bleeding duration and irregularities vary according to individual circumstances and classical legal schools (Madhhabs). If you encounter irregular bleeding exceeding 15 days, or medical complications, please consult both a qualified Islamic scholar and a physician.
            </Text>
          </Card>
        </View>
      )}

      {/* ─── TAB 4: MISSED FASTS (QADA) ────────────────────────────── */}
      {activeTab === 'qada' && (
        <View style={styles.tabContent}>
          {/* Stats Bar */}
          <View style={styles.qadaStatsRow}>
            <View style={[styles.qadaStatBox, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }]}>
              <Text style={[styles.qadaStatNum, { color: colors.accent }]}>{qadaStats.total}</Text>
              <Text style={[styles.qadaStatLbl, { color: colors.textMuted }]}>Logged Fasts</Text>
            </View>
            <View style={[styles.qadaStatBox, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }]}>
              <Text style={[styles.qadaStatNum, { color: '#10B981' }]}>{qadaStats.completed}</Text>
              <Text style={[styles.qadaStatLbl, { color: colors.textMuted }]}>Made Up (Qada)</Text>
            </View>
            <View style={[styles.qadaStatBox, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }]}>
              <Text style={[styles.qadaStatNum, { color: qadaStats.pending > 0 ? '#EF4444' : colors.textPrimary }]}>
                {qadaStats.pending}
              </Text>
              <Text style={[styles.qadaStatLbl, { color: colors.textMuted }]}>Remaining Days</Text>
            </View>
          </View>

          {/* Quick Add Button */}
          {!showAddQada && (
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: colors.accent, marginVertical: 12 }]}
              onPress={() => setShowAddQada(true)}
            >
              <Ionicons name="add-circle" size={18} color={colors.onAccent} />
              <Text style={[styles.primaryBtnText, { color: colors.onAccent }]}>
                Log Missed Ramadan Fast
              </Text>
            </TouchableOpacity>
          )}

          {/* Add Form */}
          {showAddQada && (
            <Card style={styles.formCard}>
              <Text style={[styles.formTitle, { color: colors.textPrimary }]}>
                Log Missed Fast Day
              </Text>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Date (YYYY-MM-DD)</Text>
              <TextInput
                style={[styles.textInput, { color: colors.textPrimary, borderColor: colors.borderSubtle, backgroundColor: colors.bgBase }]}
                value={qadaDate}
                onChangeText={setQadaDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textMuted}
              />
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Reason</Text>
              <TextInput
                style={[styles.textInput, { color: colors.textPrimary, borderColor: colors.borderSubtle, backgroundColor: colors.bgBase }]}
                value={qadaReason}
                onChangeText={setQadaReason}
                placeholder="Reason"
                placeholderTextColor={colors.textMuted}
              />
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Notes (Optional)</Text>
              <TextInput
                style={[styles.textInput, { color: colors.textPrimary, borderColor: colors.borderSubtle, backgroundColor: colors.bgBase }]}
                value={qadaNote}
                onChangeText={setQadaNote}
                placeholder="e.g. Ramadan Day 4"
                placeholderTextColor={colors.textMuted}
              />
              <View style={styles.formBtnRow}>
                <TouchableOpacity
                  style={[styles.cancelBtn, { borderColor: colors.borderSubtle }]}
                  onPress={() => setShowAddQada(false)}
                >
                  <Text style={{ color: colors.textMuted, fontSize: 13, fontFamily: 'Manrope_600SemiBold' }}>
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.submitBtn, { backgroundColor: colors.accent }]}
                  onPress={handleSaveQada}
                >
                  <Text style={{ color: colors.onAccent, fontSize: 13, fontFamily: 'Manrope_700Bold' }}>
                    Save Fast
                  </Text>
                </TouchableOpacity>
              </View>
            </Card>
          )}

          {/* Fast List */}
          <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginTop: 12 }]}>
            Missed Fast Ledger
          </Text>
          <Text style={[styles.sectionDesc, { color: colors.textSecondary }]}>
            Synchronized with the main Fasting tracker. Tap the checkbox once made up.
          </Text>

          {womenQadaFasts.length === 0 ? (
            <Card style={{ alignItems: 'center', padding: 24, marginTop: 8 }}>
              <Ionicons name="moon-outline" size={28} color={colors.textMuted} style={{ marginBottom: 8 }} />
              <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>No missed fasts recorded</Text>
              <Text style={[styles.emptySub, { color: colors.textMuted }]}>
                Days missed during Ramadan due to menstruation or postpartum can be recorded here.
              </Text>
            </Card>
          ) : (
            womenQadaFasts.map((fast) => (
              <Card key={fast.id} style={{ marginBottom: 10, padding: 14 }}>
                <View style={styles.qadaRow}>
                  <TouchableOpacity
                    style={[
                      styles.checkbox,
                      { borderColor: fast.madeUp ? '#10B981' : colors.borderSubtle },
                      fast.madeUp && { backgroundColor: '#10B981' },
                    ]}
                    onPress={() => handleToggleQada(fast.id, fast.madeUp)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: fast.madeUp }}
                  >
                    {fast.madeUp && <Ionicons name="checkmark" size={14} color="#FFF" />}
                  </TouchableOpacity>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.qadaDate,
                        { color: fast.madeUp ? colors.textMuted : colors.textPrimary },
                        fast.madeUp && { textDecorationLine: 'line-through' },
                      ]}
                    >
                      {fast.date}
                    </Text>
                    <Text style={[styles.qadaReason, { color: colors.textSecondary }]}>
                      {fast.reason}
                    </Text>
                    {fast.madeUpDate && (
                      <Text style={[styles.qadaMadeUpNote, { color: '#10B981' }]}>
                        Made up on {fast.madeUpDate}
                      </Text>
                    )}
                  </View>
                  <TouchableOpacity
                    onPress={() => handleDeleteQada(fast.id)}
                    accessibilityLabel="Delete missed fast"
                  >
                    <Ionicons name="trash-outline" size={16} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>
              </Card>
            ))
          )}
        </View>
      )}
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
  tabBar: {
    flexDirection: 'row',
    borderRadius: 10,
    borderWidth: 1,
    padding: 4,
    marginBottom: 16,
    gap: 4,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 7,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tabBtnText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
  },
  tabContent: {
    gap: 12,
  },
  heroCard: {
    padding: 18,
    marginBottom: 4,
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
  sectionDesc: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    marginBottom: 10,
    lineHeight: 17,
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
  activeNifasBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 6,
  },
  activeNifasTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 13,
  },
  activeNifasSub: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 11.5,
    marginTop: 2,
  },
  smallBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  smallBtnText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 11,
  },
  innerForm: {
    marginTop: 10,
    padding: 10,
    borderWidth: 1,
    borderRadius: 8,
    gap: 6,
  },
  reasonTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 13,
    marginBottom: 4,
  },
  reasonDesc: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 4,
  },
  reasonRef: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
  },
  filterPills: {
    flexDirection: 'row',
    gap: 6,
  },
  filterPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  filterPillText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 10.5,
  },
  stepTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 13,
    flex: 1,
  },
  stepBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
  },
  stepBadgeText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 10,
  },
  stepTranslit: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
    marginBottom: 4,
  },
  stepDesc: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    lineHeight: 17,
  },
  infoCard: {
    flexDirection: 'row',
    gap: 10,
    padding: 14,
    marginTop: 8,
  },
  infoCardTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 13,
    marginBottom: 4,
  },
  infoCardDesc: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    lineHeight: 17,
  },
  worshipTopic: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 13,
    flex: 1,
  },
  worshipBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  worshipBadgeText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 10,
  },
  worshipRuling: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
    marginBottom: 4,
  },
  worshipDetails: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 4,
  },
  worshipEvidence: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 11,
    fontStyle: 'italic',
  },
  bleedingName: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 13.5,
  },
  bleedingDef: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    marginBottom: 6,
    lineHeight: 16,
  },
  bleedingRow: {
    flexDirection: 'row',
    marginTop: 2,
    flexWrap: 'wrap',
  },
  bleedingLabel: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 11.5,
  },
  bleedingVal: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 11.5,
    flex: 1,
  },
  resourceTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 13,
    flex: 1,
  },
  catBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  catBadgeText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 10,
  },
  resourceAuthor: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11.5,
    marginBottom: 3,
  },
  resourceDesc: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    lineHeight: 16,
  },
  disclaimerCard: {
    flexDirection: 'row',
    gap: 10,
    padding: 14,
    marginTop: 8,
  },
  disclaimerCardText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 11.5,
    lineHeight: 16,
    flex: 1,
  },
  qadaStatsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  qadaStatBox: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  qadaStatNum: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 20,
  },
  qadaStatLbl: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 10.5,
    marginTop: 2,
  },
  qadaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
    fontFamily: 'Manrope_700Bold',
    fontSize: 13,
  },
  qadaReason: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 11.5,
  },
  qadaMadeUpNote: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 10.5,
    marginTop: 2,
  },
});
