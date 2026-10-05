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
import { ArabicText } from '../components/ArabicText';
import { useUndoToast, withUndoToast } from '../lib/undoToast';
import { getBackIcon } from '../lib/iconMap';
import { buttonTokens, touchTargetTokens } from '../lib/buttonTokens';
import {
  NifasEntry,
  saveNifasEntry,
  deleteNifasEntry,
  loadNifasEntries,
} from '../lib/db';
import {
  GHUSL_REASONS,
  GHUSL_STEPS,
  formatYMD,
  isValidYMD,
  getCycleDay,
} from '../lib/womensFiqh';

interface WomenPurityScreenProps {
  onBack?: () => void;
  onOpenCycle?: () => void;
  onOpenQada?: () => void;
  onOpenGuidance?: () => void;
}

function WomenPurityScreen({ onBack, onOpenCycle, onOpenQada, onOpenGuidance }: WomenPurityScreenProps) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const maxW = Math.min(width, 680);
  const { saveUndoState } = useUndoToast();

  // Nifas state
  const [nifasEntries, setNifasEntries] = useState<NifasEntry[]>([]);
  const [showLogNifas, setShowLogNifas] = useState(false);
  const [newNifasStart, setNewNifasStart] = useState(formatYMD(new Date()));
  const [newNifasEnd, setNewNifasEnd] = useState('');
  const [newNifasNotes, setNewNifasNotes] = useState('');

  // Ghusl step filter & interactive completion
  const [ghuslFilter, setGhuslFilter] = useState<'all' | 'obligatory' | 'sunnah'>('all');
  const [completedSteps, setCompletedSteps] = useState<Record<string, boolean>>({});

  const todayStr = useMemo(() => formatYMD(new Date()), []);
  const yesterdayStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return formatYMD(d);
  }, []);

  const refreshData = useCallback(() => {
    setNifasEntries(loadNifasEntries());
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Active nifas calculation
  const activeNifas = useMemo(() => {
    return nifasEntries.find((n) => !n.endDate);
  }, [nifasEntries]);

  const nifasDay = useMemo(() => {
    if (!activeNifas) return 1;
    return getCycleDay(activeNifas.startDate);
  }, [activeNifas]);

  // Handlers for Nifas
  const handleSaveNifas = () => {
    const cleanStart = newNifasStart.trim();
    const cleanEnd = newNifasEnd.trim();
    const cleanNotes = newNifasNotes.trim();

    if (!cleanStart) {
      Alert.alert('Delivery Date Required', 'Please enter delivery start date in YYYY-MM-DD format.');
      return;
    }

    if (!isValidYMD(cleanStart)) {
      Alert.alert('Invalid Date', 'Please enter delivery date in YYYY-MM-DD format (e.g. 2026-10-05).');
      return;
    }

    if (cleanEnd && !isValidYMD(cleanEnd)) {
      Alert.alert('Invalid End Date', 'Please enter end date in YYYY-MM-DD format.');
      return;
    }

    if (cleanEnd && cleanEnd < cleanStart) {
      Alert.alert('Invalid Range', 'End date cannot be earlier than start date.');
      return;
    }

    const entry: NifasEntry = {
      id: `nifas_${Date.now()}`,
      startDate: cleanStart,
      endDate: cleanEnd || undefined,
      notes: cleanNotes || undefined,
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
      'Please perform Ghusl to lift major ritual impurity and resume your daily prayers and fasting. Follow the step-by-step method below.',
      [{ text: 'OK' }]
    );
  };

  const handleDeleteNifas = (item: NifasEntry) => {
    Alert.alert(
      'Delete Postpartum Record?',
      `Are you sure you want to delete the record for ${item.startDate}${item.endDate ? ` → ${item.endDate}` : ' (Active)'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteNifasEntry(item.id);
            refreshData();
            saveUndoState({
              id: item.id,
              action: 'Postpartum record deleted',
              revert: () => {
                saveNifasEntry(item);
                refreshData();
              },
            });
          },
        },
      ]
    );
  };

  const toggleGhuslStep = (stepId: string) => {
    setCompletedSteps((prev) => ({
      ...prev,
      [stepId]: !prev[stepId],
    }));
  };

  const resetGhuslSteps = () => {
    setCompletedSteps({});
  };

  const completedCount = useMemo(() => {
    return Object.values(completedSteps).filter(Boolean).length;
  }, [completedSteps]);

  const isCompact = width < 380;
  const paddingH = isCompact ? 16 : 20;

  return (
    <ScrollView
      style={{ backgroundColor: colors.bgBase }}
      contentContainerStyle={[styles.content, { alignSelf: 'center', width: '100%', maxWidth: maxW, paddingHorizontal: paddingH }]}
      keyboardShouldPersistTaps="handled"
    >
      {onBack && (
        <TouchableOpacity
          style={styles.backBtn}
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Back to Tools"
          hitSlop={touchTargetTokens.hitSlop8}
        >
          <Ionicons name={getBackIcon()} size={18} color={colors.accent} />
          <Text style={[styles.backText, { color: colors.accent, fontSize: isCompact ? 13 : 14 }]}>Tools</Text>
        </TouchableOpacity>
      )}

      <SectionHeader
        compact
        eyebrow="Women's Worship"
        title="Purity & Ghusl"
        subtitle="Step-by-step ghusl guide, signs of tuhr, and postpartum (nifas) tracker."
      />

      {/* Discreet Privacy Note */}
      <View style={[styles.privacyBadge, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }]}>
        <Ionicons name="shield-checkmark" size={14} color={colors.accent} />
        <Text style={[styles.privacyText, { color: colors.textSecondary }]}>
          Private & local · Stored securely on your device only
        </Text>
      </View>

      {/* Postpartum / Nifas Tracker Card */}
      <Card style={styles.sectionCard}>
        <View style={styles.cardHeaderRow}>
          <Ionicons name="heart-outline" size={16} color={colors.accent} />
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
            Postpartum Tracker (Nifas)
          </Text>
        </View>
        <Text style={[styles.cardSub, { color: colors.textSecondary }]}>
          Bleeding following childbirth. Standard Prophetic norm is up to 40 days (majority).
        </Text>

        {activeNifas ? (
          <View style={[styles.activeNifasBox, { backgroundColor: colors.accentDim, borderColor: colors.accent }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.activeNifasTitle, { color: colors.accent }]}>
                Active Nifas · Day {nifasDay} of ~40
              </Text>
              <Text style={[styles.activeNifasSub, { color: colors.textSecondary }]}>
                Started: {activeNifas.startDate} · Once bleeding ceases completely, perform Ghusl.
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.smallBtn, { backgroundColor: colors.accent }]}
              onPress={() => handleEndNifas(activeNifas)}
              accessibilityRole="button"
              accessibilityLabel="Mark Nifas Pure"
            >
              <Text style={[styles.smallBtnText, { color: colors.onAccent }]}>Mark Pure</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.secondaryBtn, { borderColor: colors.accent, backgroundColor: colors.accentDim, marginTop: 4 }]}
            onPress={() => setShowLogNifas(true)}
            accessibilityRole="button"
            accessibilityLabel="Log Postpartum Delivery Date"
          >
            <Ionicons name="add" size={16} color={colors.accent} />
            <Text style={[styles.secondaryBtnText, { color: colors.accent }]}>
              Log Postpartum (Nifas) Delivery Date
            </Text>
          </TouchableOpacity>
        )}

        {showLogNifas && (
          <View style={[styles.innerForm, { borderColor: colors.borderSubtle, backgroundColor: colors.bgBase }]}>
            <View style={styles.labelRow}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Delivery Date (YYYY-MM-DD)</Text>
              <View style={styles.quickPillsRow}>
                <TouchableOpacity
                  style={[styles.quickPill, { borderColor: colors.borderSubtle, backgroundColor: colors.bgSurface }]}
                  onPress={() => setNewNifasStart(todayStr)}
                >
                  <Text style={[styles.quickPillText, { color: colors.accent }]}>Today</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.quickPill, { borderColor: colors.borderSubtle, backgroundColor: colors.bgSurface }]}
                  onPress={() => setNewNifasStart(yesterdayStr)}
                >
                  <Text style={[styles.quickPillText, { color: colors.textSecondary }]}>Yesterday</Text>
                </TouchableOpacity>
              </View>
            </View>
            <TextInput
              style={[styles.textInput, { color: colors.textPrimary, borderColor: colors.borderSubtle, backgroundColor: colors.bgSurface }]}
              value={newNifasStart}
              onChangeText={setNewNifasStart}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textMuted}
              keyboardType="numbers-and-punctuation"
            />

            <View style={styles.labelRow}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>End Date (Optional)</Text>
              {newNifasEnd ? (
                <TouchableOpacity
                  style={[styles.quickPill, { borderColor: colors.borderSubtle, backgroundColor: colors.bgSurface }]}
                  onPress={() => setNewNifasEnd('')}
                >
                  <Text style={[styles.quickPillText, { color: colors.textMuted }]}>Clear</Text>
                </TouchableOpacity>
              ) : null}
            </View>
            <TextInput
              style={[styles.textInput, { color: colors.textPrimary, borderColor: colors.borderSubtle, backgroundColor: colors.bgSurface }]}
              value={newNifasEnd}
              onChangeText={setNewNifasEnd}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textMuted}
              keyboardType="numbers-and-punctuation"
            />

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Notes (Optional)</Text>
            <TextInput
              style={[styles.textInput, { color: colors.textPrimary, borderColor: colors.borderSubtle, backgroundColor: colors.bgSurface }]}
              value={newNifasNotes}
              onChangeText={setNewNifasNotes}
              placeholder="Delivery notes, physician guidance..."
              placeholderTextColor={colors.textMuted}
            />
            <View style={styles.formBtnRow}>
              <TouchableOpacity
                style={[styles.cancelBtn, { borderColor: colors.borderSubtle }]}
                onPress={() => setShowLogNifas(false)}
                accessibilityRole="button"
                accessibilityLabel="Cancel"
              >
                <Text style={{ color: colors.textMuted, fontSize: 12 }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: colors.accent }]}
                onPress={handleSaveNifas}
                accessibilityRole="button"
                accessibilityLabel="Save Postpartum Record"
              >
                <Text style={{ color: colors.onAccent, fontSize: 12, fontFamily: 'Manrope_700Bold' }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Nifas History List */}
        {nifasEntries.length > 0 && (
          <View style={styles.nifasHistory}>
            {nifasEntries.map((item) => (
              <View key={item.id} style={[styles.nifasHistoryItem, { borderColor: colors.borderSubtle }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.nifasHistoryText, { color: colors.textPrimary }]}>
                    {item.startDate} {item.endDate ? `→ ${item.endDate}` : '· (Active)'}
                  </Text>
                  {item.notes && (
                    <Text style={[styles.nifasHistoryNotes, { color: colors.textMuted }]}>{item.notes}</Text>
                  )}
                </View>
                <TouchableOpacity
                  onPress={() => handleDeleteNifas(item)}
                  accessibilityRole="button"
                  accessibilityLabel={`Delete entry for ${item.startDate}`}
                  hitSlop={touchTargetTokens.hitSlop10}
                >
                  <Ionicons name="trash-outline" size={15} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </Card>

      {/* Signs of Purity Card */}
      <Card style={{ ...styles.infoCard, borderColor: colors.accent, backgroundColor: colors.accentDim }}>
        <Ionicons name="sparkles" size={18} color={colors.accent} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.infoCardTitle, { color: colors.accent }]}>
            Recognizing Purity (Tuhr)
          </Text>
          <Text style={[styles.infoCardDesc, { color: colors.textPrimary }]}>
            A woman knows her menses or postpartum has ended by either:
            {'\n'}1. <Text style={{ fontFamily: 'Manrope_700Bold' }}>Al-Qassah Al-Bayda:</Text> A clear, white fluid discharged at the conclusion of menses.
            {'\n'}2. <Text style={{ fontFamily: 'Manrope_700Bold' }}>Al-Jufuf (Complete Dryness):</Text> Clean cotton emerges completely dry without any trace of blood, yellowish, or brownish discharge.
          </Text>
        </View>
      </Card>

      {/* When Ghusl is Obligatory */}
      <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginTop: 18, marginBottom: 8 }]}>
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
      <View style={[styles.historyHeader, { marginTop: 18, marginBottom: 10 }]}>
        <View>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>How to Perform Ghusl</Text>
          <Text style={[styles.progressSubtitle, { color: colors.textMuted }]}>
            {completedCount} of 6 steps marked · Tap any step to track progress
          </Text>
        </View>
        {completedCount > 0 && (
          <TouchableOpacity onPress={resetGhuslSteps} hitSlop={touchTargetTokens.hitSlop8}>
            <Text style={[styles.resetText, { color: colors.accent }]}>Reset</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.filterPills}>
        {(['all', 'obligatory', 'sunnah'] as const).map((f) => (
          <TouchableOpacity
            key={f}
            style={[
              styles.filterPill,
              { borderColor: colors.borderSubtle, backgroundColor: colors.bgSurface },
              ghuslFilter === f && { backgroundColor: colors.accent, borderColor: colors.accent },
            ]}
            onPress={() => setGhuslFilter(f)}
            accessibilityRole="tab"
            accessibilityState={{ selected: ghuslFilter === f }}
          >
            <Text
              style={[
                styles.filterPillText,
                { color: ghuslFilter === f ? colors.onAccent : colors.textSecondary },
              ]}
            >
              {f === 'all' ? 'All Steps' : f === 'obligatory' ? 'Obligatory (Rukn)' : 'Sunnah'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {GHUSL_STEPS.filter((s) => ghuslFilter === 'all' || s.type === ghuslFilter).map((s) => {
        const isDone = completedSteps[s.id] === true;
        return (
          <Card
            key={s.id}
            style={{
              marginBottom: 10,
              padding: 14,
              borderColor: isDone ? '#10B981' : colors.borderSubtle,
              backgroundColor: isDone ? (colors.bgSurface) : colors.bgSurface,
            }}
          >
            <TouchableOpacity
              onPress={() => toggleGhuslStep(s.id)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: isDone }}
              accessibilityLabel={`${s.title}, ${isDone ? 'Completed' : 'Not completed'}`}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                  <View
                    style={[
                      styles.stepCheckbox,
                      { borderColor: isDone ? '#10B981' : colors.borderSubtle },
                      isDone && { backgroundColor: '#10B981' },
                    ]}
                  >
                    {isDone && <Ionicons name="checkmark" size={13} color="#FFFFFF" />}
                  </View>
                  <Text
                    style={[
                      styles.stepTitle,
                      { color: isDone ? colors.textMuted : colors.textPrimary },
                      isDone && { textDecorationLine: 'line-through' },
                    ]}
                  >
                    {s.title}
                  </Text>
                </View>
                <View
                  style={[
                    styles.stepBadge,
                    {
                      backgroundColor: s.type === 'obligatory' ? colors.accentDim : colors.bgBase,
                      borderColor: s.type === 'obligatory' ? colors.accent : colors.borderSubtle,
                    },
                  ]}
                >
                  <Text style={[styles.stepBadgeText, { color: s.type === 'obligatory' ? colors.accent : colors.textMuted }]}>
                    {s.type === 'obligatory' ? 'Obligatory' : 'Sunnah'}
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
            </TouchableOpacity>
          </Card>
        );
      })}
    </ScrollView>
  );
}

export default withUndoToast(WomenPurityScreen);

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
    marginBottom: 10,
    lineHeight: 16,
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
    paddingVertical: 7,
    borderRadius: 6,
  },
  smallBtnText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 11.5,
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: buttonTokens.md.minHeight,
    borderRadius: buttonTokens.md.borderRadius,
    borderWidth: 1,
  },
  secondaryBtnText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
  },
  innerForm: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 10,
    gap: 6,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
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
  inputLabel: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11.5,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontFamily: 'Manrope_400Regular',
    fontSize: 12.5,
  },
  formBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 4,
  },
  cancelBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  submitBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
  },
  nifasHistory: {
    marginTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#FFFFFF15',
    paddingTop: 8,
    gap: 6,
  },
  nifasHistoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  nifasHistoryText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12.5,
  },
  nifasHistoryNotes: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 11,
    marginTop: 1,
  },
  infoCard: {
    flexDirection: 'row',
    gap: 12,
    padding: 14,
    marginBottom: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  infoCardTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 13.5,
    marginBottom: 4,
  },
  infoCardDesc: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    lineHeight: 17,
  },
  sectionTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 14.5,
  },
  progressSubtitle: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 11.5,
    marginTop: 2,
  },
  resetText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12.5,
  },
  reasonTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 13.5,
    marginBottom: 2,
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
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  filterPills: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
  },
  filterPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  filterPillText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11.5,
  },
  stepCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 13.5,
    flex: 1,
  },
  stepBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  stepBadgeText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 10,
  },
  stepTranslit: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11.5,
    fontStyle: 'italic',
    marginBottom: 4,
  },
  stepDesc: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    lineHeight: 17,
  },
});
