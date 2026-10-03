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
  getCycleDay,
} from '../lib/womensFiqh';

export default function WomenPurityScreen({ onBack }: { onBack?: () => void }) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const maxW = Math.min(width, 680);

  // Nifas state
  const [nifasEntries, setNifasEntries] = useState<NifasEntry[]>([]);
  const [showLogNifas, setShowLogNifas] = useState(false);
  const [newNifasStart, setNewNifasStart] = useState(formatYMD(new Date()));
  const [newNifasEnd, setNewNifasEnd] = useState('');
  const [newNifasNotes, setNewNifasNotes] = useState('');

  // Ghusl step filter
  const [ghuslFilter, setGhuslFilter] = useState<'all' | 'obligatory' | 'sunnah'>('all');

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
      'Please perform Ghusl to purify yourself and resume your daily prayers and fasting.',
      [{ text: 'OK' }]
    );
  };

  const handleDeleteNifas = (id: string) => {
    deleteNifasEntry(id);
    refreshData();
  };

  const isCompact = width < 380;
  const paddingH = isCompact ? 16 : 20;

  return (
    <ScrollView
      style={{ backgroundColor: colors.bgBase }}
      contentContainerStyle={[styles.content, { alignSelf: 'center', width: '100%', maxWidth: maxW, paddingHorizontal: paddingH }]}
    >
      {onBack && (
        <TouchableOpacity
          style={styles.backBtn}
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Back to Tools"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={[styles.backText, { color: colors.accent, fontSize: isCompact ? 13 : 14 }]}>← Tools</Text>
        </TouchableOpacity>
      )}

      <SectionHeader
        eyebrow="Women's Worship"
        title="Purity & Ghusl"
        subtitle="Step-by-step ghusl guide, signs of tuhr, and postpartum (nifas) tracker."
      />

      {/* Discreet Privacy Note */}
      <View style={[styles.privacyBadge, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }]}>
        <Ionicons name="shield-checkmark" size={14} color={colors.accent} />
        <Text style={[styles.privacyText, { color: colors.textSecondary }]}>
          Private & local · All records are kept strictly on your device
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
            style={[styles.secondaryBtn, { borderColor: colors.accent, backgroundColor: colors.accentDim, marginTop: 4 }]}
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
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>End Date (Optional)</Text>
            <TextInput
              style={[styles.textInput, { color: colors.textPrimary, borderColor: colors.borderSubtle, backgroundColor: colors.bgBase }]}
              value={newNifasEnd}
              onChangeText={setNewNifasEnd}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textMuted}
            />
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Notes (Optional)</Text>
            <TextInput
              style={[styles.textInput, { color: colors.textPrimary, borderColor: colors.borderSubtle, backgroundColor: colors.bgBase }]}
              value={newNifasNotes}
              onChangeText={setNewNifasNotes}
              placeholder="Delivery notes, physician advice..."
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
                  onPress={() => handleDeleteNifas(item.id)}
                  accessibilityLabel="Delete entry"
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
            A woman knows her period or nifas has ended by either:
            {'\n'}1. <Text style={{ fontFamily: 'Manrope_700Bold' }}>Al-Qassah Al-Bayda:</Text> A clear, white fluid discharged at the conclusion of menses.
            {'\n'}2. <Text style={{ fontFamily: 'Manrope_700Bold' }}>Al-Jufuf (Complete Dryness):</Text> A piece of clean cotton emerges completely dry without any trace of blood, yellowish, or brownish discharge.
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    paddingBottom: 60,
  },
  backBtn: {
    alignSelf: 'flex-start',
    minHeight: 36,
    justifyContent: 'center',
    paddingVertical: 6,
    paddingRight: 12,
    marginBottom: 4,
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
  innerForm: {
    marginTop: 10,
    padding: 10,
    borderWidth: 1,
    borderRadius: 8,
    gap: 6,
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
    marginTop: 4,
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
  nifasHistory: {
    marginTop: 12,
    gap: 6,
  },
  nifasHistoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderRadius: 6,
  },
  nifasHistoryText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
  },
  nifasHistoryNotes: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 11,
    marginTop: 1,
  },
  infoCard: {
    flexDirection: 'row',
    gap: 10,
    padding: 14,
    marginBottom: 8,
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
  sectionTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 14.5,
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
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
});
