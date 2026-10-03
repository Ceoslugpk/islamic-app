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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme';
import { SectionHeader } from '../components/SectionHeader';
import { Card } from '../components/Card';
import {
  MissedFastItem,
  loadMissedFasts,
  saveMissedFast,
  toggleMissedFastMadeUp,
  deleteMissedFast,
} from '../lib/db';
import { formatYMD } from '../lib/womensFiqh';

export default function WomenQadaScreen({ onBack }: { onBack?: () => void }) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const maxW = Math.min(width, 680);

  // Qada / Missed fasts state
  const [missedFasts, setMissedFasts] = useState<MissedFastItem[]>([]);
  const [showAddQada, setShowAddQada] = useState(false);
  const [qadaDate, setQadaDate] = useState(formatYMD(new Date()));
  const [qadaReason, setQadaReason] = useState('Menstruation / Post-natal');
  const [qadaNote, setQadaNote] = useState('');

  const refreshData = useCallback(() => {
    setMissedFasts(loadMissedFasts());
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const qadaStats = useMemo(() => {
    const total = missedFasts.length;
    const completed = missedFasts.filter((f) => f.madeUp).length;
    const pending = total - completed;
    return { total, completed, pending };
  }, [missedFasts]);

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
        eyebrow="Women's Worship"
        title="Qada Fasts"
        subtitle="Track and make up missed Ramadan fasts due to menstruation or postpartum."
      />

      {/* Discreet Privacy Note */}
      <View style={[styles.privacyBadge, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }]}>
        <Ionicons name="shield-checkmark" size={14} color={colors.accent} />
        <Text style={[styles.privacyText, { color: colors.textSecondary }]}>
          Private & synchronized · Stored in your central fasting tracker
        </Text>
      </View>

      {/* Explicit Recording Reassurance */}
      <View style={[styles.explicitBadge, { backgroundColor: colors.bgBase, borderColor: colors.borderSubtle }]}>
        <Ionicons name="information-circle-outline" size={14} color={colors.textMuted} />
        <Text style={[styles.explicitText, { color: colors.textMuted }]}>
          Explicit recording only: Fasts are only tracked when you manually log them here. Predictions never auto-create missed fasts.
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
          <Text style={[styles.qadaStatNum, { color: qadaStats.pending > 0 ? '#EF4444' : colors.textPrimary }]}>
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
      <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginTop: 8 }]}>
        Missed Fast Ledger
      </Text>
      <Text style={[styles.sectionDesc, { color: colors.textSecondary }]}>
        Synchronized with the main Fasting tracker. Tap the checkbox once made up.
      </Text>

      {missedFasts.length === 0 ? (
        <Card style={{ alignItems: 'center', padding: 24, marginTop: 8 }}>
          <Ionicons name="moon-outline" size={28} color={colors.textMuted} style={{ marginBottom: 8 }} />
          <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>No missed fasts recorded</Text>
          <Text style={[styles.emptySub, { color: colors.textMuted }]}>
            Days missed during Ramadan due to menstruation or postpartum can be recorded here.
          </Text>
        </Card>
      ) : (
        missedFasts.map((fast) => (
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
  explicitBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
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
    paddingVertical: 12,
    borderRadius: 8,
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
