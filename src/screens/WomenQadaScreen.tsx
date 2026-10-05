// ============================================================================
// PRIVACY & EXPLICIT-RECORDING RULE:
// Missed fasts are only created when explicitly logged by the user.
// The app never auto-logs missed fasts or changes fasting states from predictions.
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
import { useTheme } from '../lib/theme';
import { SectionHeader } from '../components/SectionHeader';
import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { useUndoToast, withUndoToast } from '../lib/undoToast';
import { getBackIcon } from '../lib/iconMap';
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
  onOpenCycle?: () => void;
}

function WomenQadaScreen({ onBack, onOpenCycle }: WomenQadaScreenProps) {
  const { colors } = useTheme();
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
      Alert.alert('Date Required', 'Please enter a valid date in YYYY-MM-DD format.');
      return;
    }

    if (!isValidYMD(cleanDate)) {
      Alert.alert('Invalid Date', 'Please enter date in YYYY-MM-DD format (e.g. 2026-10-05).');
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
      'Delete Missed Fast Record?',
      `Are you sure you want to delete the record for ${fast.date}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteMissedFast(fast.id);
            refreshData();
            saveUndoState({
              id: fast.id,
              action: 'Missed fast record deleted',
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
        title="Qada Fasts"
        subtitle="Track and make up missed Ramadan fasts due to menstruation or postpartum."
      />

      {/* Discreet Privacy Note */}
      <View style={[styles.privacyBadge, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }]}>
        <Ionicons name="shield-checkmark" size={14} color={colors.accent} />
        <Text style={[styles.privacyText, { color: colors.textSecondary }]}>
          Private & synchronized · Stored safely in your local fasting database
        </Text>
      </View>

      {/* Explicit Recording Reassurance */}
      <View style={[styles.explicitBadge, { backgroundColor: colors.bgBase, borderColor: colors.borderSubtle }]}>
        <Ionicons name="information-circle-outline" size={14} color={colors.textMuted} />
        <Text style={[styles.explicitText, { color: colors.textMuted }]}>
          Explicit recording only: Missed fasts are only logged when you manually add them. Predictions never auto-create records.
        </Text>
      </View>

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
          <Text style={[styles.qadaStatNum, { color: qadaStats.pending > 0 ? colors.destructive : colors.textPrimary }]}>
            {qadaStats.pending}
          </Text>
          <Text style={[styles.qadaStatLbl, { color: colors.textMuted }]}>Remaining Days</Text>
        </View>
      </View>

      {/* Quick Add Button */}
      {!showAddQada && (
        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: colors.accent, marginVertical: 14 }]}
          onPress={() => setShowAddQada(true)}
          accessibilityRole="button"
          accessibilityLabel="Log Missed Ramadan Fast"
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
          <View style={styles.labelRow}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Date (YYYY-MM-DD)</Text>
            <View style={styles.quickPillsRow}>
              <TouchableOpacity
                style={[styles.quickPill, { borderColor: colors.borderSubtle, backgroundColor: colors.bgBase }]}
                onPress={() => setQadaDate(todayStr)}
              >
                <Text style={[styles.quickPillText, { color: colors.accent }]}>Today</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.quickPill, { borderColor: colors.borderSubtle, backgroundColor: colors.bgBase }]}
                onPress={() => setQadaDate(yesterdayStr)}
              >
                <Text style={[styles.quickPillText, { color: colors.textSecondary }]}>Yesterday</Text>
              </TouchableOpacity>
            </View>
          </View>
          <TextInput
            style={[styles.textInput, { color: colors.textPrimary, borderColor: colors.borderSubtle, backgroundColor: colors.bgBase }]}
            value={qadaDate}
            onChangeText={setQadaDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.textMuted}
            keyboardType="numbers-and-punctuation"
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
              accessibilityRole="button"
              accessibilityLabel="Cancel"
            >
              <Text style={{ color: colors.textMuted, fontSize: 13, fontFamily: 'Manrope_600SemiBold' }}>
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: colors.accent }]}
              onPress={handleSaveQada}
              accessibilityRole="button"
              accessibilityLabel="Save Missed Fast"
            >
              <Text style={{ color: colors.onAccent, fontSize: 13, fontFamily: 'Manrope_700Bold' }}>
                Save Fast
              </Text>
            </TouchableOpacity>
          </View>
        </Card>
      )}

      {/* Fast List */}
      <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginTop: 8 }]}>
        Missed Fast Ledger
      </Text>
      <Text style={[styles.sectionDesc, { color: colors.textSecondary }]}>
        Tap checkbox once made up. Synchronized with your central fasting records.
      </Text>

      {womenMissedFasts.length === 0 ? (
        <EmptyState
          icon="moon-outline"
          title="No missed fasts recorded"
          subtitle="Days missed during Ramadan due to menstruation or postpartum can be recorded here."
          actionLabel="+ Log Missed Fast"
          onAction={() => setShowAddQada(true)}
          iconSize={40}
        />
      ) : (
        womenMissedFasts.map((fast) => (
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
                accessibilityLabel={`Mark fast from ${fast.date} as ${fast.madeUp ? 'unmade' : 'made up'}`}
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
                onPress={() => handleDeleteQada(fast)}
                accessibilityRole="button"
                accessibilityLabel={`Delete missed fast for ${fast.date}`}
                hitSlop={touchTargetTokens.hitSlop10}
              >
                <Ionicons name="trash-outline" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          </Card>
        ))
      )}
    </ScrollView>
  );
}

export default withUndoToast(WomenQadaScreen);

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
    marginBottom: 10,
  },
  privacyText: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 11.5,
    flex: 1,
  },
  explicitBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  explicitText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 11,
    flex: 1,
  },
  qadaStatsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
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
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: buttonTokens.md.minHeight,
    borderRadius: buttonTokens.md.borderRadius,
  },
  primaryBtnText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 13.5,
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
  sectionTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 14.5,
  },
  sectionDesc: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    marginBottom: 8,
    lineHeight: 16,
  },
  qadaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 5,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qadaDate: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 13.5,
  },
  qadaReason: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    marginTop: 2,
  },
  qadaMadeUpNote: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
    marginTop: 2,
  },
});
