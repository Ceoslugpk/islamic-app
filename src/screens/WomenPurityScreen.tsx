import React, { useState, useMemo, useCallback } from 'react';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useThemeTokens } from '../theme/tokens';
import { LinearGradient } from 'expo-linear-gradient';
import { getPillShadow } from '../lib/homeThemeTokens';
import { TAB_PAD_BOTTOM } from '../components/layout/layout.constants';
import { SubHeader } from '../components/layout/SubHeader';
import { DetailScreen } from '../components/layout/DetailScreen';
import { PremiumCard } from '../components/ui';
import { ArabicText } from '../components/ArabicText';
import { useUndoToast, withUndoToast } from '../lib/undoToast';
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
  backLabel?: string;
  onOpenCycle?: () => void;
  onOpenQada?: () => void;
  onOpenGuidance?: () => void;
}

function WomenPurityScreen({
  onBack,
  backLabel = 'Tools',
  onOpenCycle,
  onOpenQada,
  onOpenGuidance,
}: WomenPurityScreenProps) {
  const { t } = useTranslation();
  const { tokens, mode } = useThemeTokens();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const maxW = Math.min(width, 680);
  const { saveUndoState } = useUndoToast();

  // Nifas state
  const [nifasEntries, setNifasEntries] = useState<NifasEntry[]>(() => loadNifasEntries());
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
      Alert.alert(t('Delivery Date Required'), t('Please enter delivery start date in YYYY-MM-DD format.'));
      return;
    }

    if (!isValidYMD(cleanStart)) {
      Alert.alert(t('Invalid Date'), t('Please enter delivery date in YYYY-MM-DD format (e.g. 2026-10-05).'));
      return;
    }

    if (cleanEnd && !isValidYMD(cleanEnd)) {
      Alert.alert(t('Invalid End Date'), t('Please enter end date in YYYY-MM-DD format.'));
      return;
    }

    if (cleanEnd && cleanEnd < cleanStart) {
      Alert.alert(t('Invalid Range'), t('End date cannot be earlier than start date.'));
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
      t('Nifas Ended · Purity Resumed'),
      t('Please perform Ghusl to lift major ritual impurity and resume your daily prayers and fasting. Follow the step-by-step method below.'),
      [{ text: 'OK' }]
    );
  };

  const handleDeleteNifas = (item: NifasEntry) => {
    Alert.alert(
      t('Delete Postpartum Record?'),
      `Are you sure you want to delete the record for ${item.startDate}${item.endDate ? ` → ${item.endDate}` : ' (Active)'}?`,
      [
        { text: t('Cancel'), style: 'cancel' },
        {
          text: t('Delete'),
          style: 'destructive',
          onPress: () => {
            deleteNifasEntry(item.id);
            refreshData();
            saveUndoState({
              id: item.id,
              action: t('Postpartum record deleted'),
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
    <DetailScreen
      style={[styles.container, { backgroundColor: tokens.bgTop }]}
      header={
        <SubHeader
          eyebrow={t("Women's Worship")}
          title={t('Purity & Ghusl')}
          subtitle={t('Step-by-step ghusl guide, signs of tuhr, and postpartum (nifas) tracker.')}
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
        showsVerticalScrollIndicator={false}
      >
        {/* Discreet Privacy Note */}
        <View style={[styles.privacyBadge, getPillShadow(mode), { backgroundColor: tokens.cardTop, borderColor: tokens.cardBorder }]}>
          <Ionicons name="shield-checkmark" size={14} color={tokens.goldText} />
          <Text style={[styles.privacyText, { color: tokens.muted }]}>
            {t('Private & local · Stored securely on your device only')}
          </Text>
        </View>

        {/* Postpartum / Nifas Tracker Card */}
        <PremiumCard style={styles.sectionCard}>
          <View style={styles.cardHeaderRow}>
            <Ionicons name="heart-outline" size={16} color={tokens.goldText} />
            <Text style={[styles.cardTitle, { color: tokens.text }]}>
              {t('Postpartum Tracker (Nifas)')}
            </Text>
          </View>
          <Text style={[styles.cardSub, { color: tokens.muted }]}>
            {t('Bleeding following childbirth. Standard Prophetic norm is up to 40 days (majority).')}
          </Text>

          {activeNifas ? (
            <View style={[styles.activeNifasBox, { backgroundColor: tokens.ringFill, borderColor: tokens.goldBorder }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.activeNifasTitle, { color: tokens.goldText }]}>
                  {t('Active Nifas · Day')} {nifasDay} {t('of ~40')}
                </Text>
                <Text style={[styles.activeNifasSub, { color: tokens.muted }]}>
                  {t('Started:')} {activeNifas.startDate} · {t('Once bleeding ceases completely, perform Ghusl.')}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.smallBtn, getPillShadow(mode), { borderColor: tokens.goldBorder }]}
                onPress={() => handleEndNifas(activeNifas)}
                accessibilityRole="button"
                accessibilityLabel={t('Mark Pure')}
              >
                <LinearGradient pointerEvents="none" colors={tokens.goldGradient} style={[StyleSheet.absoluteFill, { borderRadius: 6 }]} />
                <Text style={[styles.smallBtnText, { color: tokens.onGold }]}>{t('Mark Pure')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.secondaryBtn, getPillShadow(mode), { borderColor: tokens.goldBorder, marginTop: 4 }]}
              onPress={() => setShowLogNifas(true)}
              accessibilityRole="button"
              accessibilityLabel={t('Log Postpartum Delivery Date')}
            >
              <LinearGradient pointerEvents="none" colors={tokens.goldGradient} style={[StyleSheet.absoluteFill, { borderRadius: 14 }]} />
              <Ionicons name="add" size={16} color={tokens.onGold} />
              <Text style={[styles.secondaryBtnText, { color: tokens.onGold }]}>
                {t('Log Postpartum (Nifas) Delivery Date')}
              </Text>
            </TouchableOpacity>
          )}

        {showLogNifas && (
          <View style={[styles.innerForm, { borderColor: tokens.cardBorder, backgroundColor: tokens.ringFill }]}>
            <View style={styles.labelRow}>
              <Text style={[styles.inputLabel, { color: tokens.muted }]}>{t('Delivery Date (YYYY-MM-DD)')}</Text>
              <View style={styles.quickPillsRow}>
                <TouchableOpacity
                  style={[styles.quickPill, { borderColor: tokens.cardBorder, backgroundColor: tokens.cardTop }]}
                  onPress={() => setNewNifasStart(todayStr)}
                >
                  <Text style={[styles.quickPillText, { color: tokens.goldText }]}>{t('Today')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.quickPill, { borderColor: tokens.cardBorder, backgroundColor: tokens.cardTop }]}
                  onPress={() => setNewNifasStart(yesterdayStr)}
                >
                  <Text style={[styles.quickPillText, { color: tokens.muted }]}>{t('Yesterday')}</Text>
                </TouchableOpacity>
              </View>
            </View>
            <TextInput
              style={[styles.textInput, { color: tokens.text, borderColor: tokens.cardBorder, backgroundColor: tokens.cardTop }]}
              value={newNifasStart}
              onChangeText={setNewNifasStart}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={tokens.muted}
              keyboardType="numbers-and-punctuation"
            />

            <View style={styles.labelRow}>
              <Text style={[styles.inputLabel, { color: tokens.muted }]}>{t('End Date (Optional)')}</Text>
              {newNifasEnd ? (
                <TouchableOpacity
                  style={[styles.quickPill, { borderColor: tokens.cardBorder, backgroundColor: tokens.cardTop }]}
                  onPress={() => setNewNifasEnd('')}
                >
                  <Text style={[styles.quickPillText, { color: tokens.muted }]}>{t('Clear')}</Text>
                </TouchableOpacity>
              ) : null}
            </View>
            <TextInput
              style={[styles.textInput, { color: tokens.text, borderColor: tokens.cardBorder, backgroundColor: tokens.cardTop }]}
              value={newNifasEnd}
              onChangeText={setNewNifasEnd}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={tokens.muted}
              keyboardType="numbers-and-punctuation"
            />

            <Text style={[styles.inputLabel, { color: tokens.muted }]}>{t('Notes (Optional)')}</Text>
            <TextInput
              style={[styles.textInput, { color: tokens.text, borderColor: tokens.cardBorder, backgroundColor: tokens.cardTop }]}
              value={newNifasNotes}
              onChangeText={setNewNifasNotes}
              placeholder={t('Delivery notes, physician guidance...')}
              placeholderTextColor={tokens.muted}
            />
            <View style={styles.formBtnRow}>
              <TouchableOpacity
                style={[styles.cancelBtn, { borderColor: tokens.cardBorder, backgroundColor: tokens.cardTop }]}
                onPress={() => setShowLogNifas(false)}
                accessibilityRole="button"
                accessibilityLabel={t('Cancel')}
              >
                <Text style={{ color: tokens.muted, fontSize: 12 }}>{t('Cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitBtn, getPillShadow(mode), { borderColor: tokens.goldBorder }]}
                onPress={handleSaveNifas}
                accessibilityRole="button"
                accessibilityLabel={t('Save Postpartum Record')}
              >
                <LinearGradient pointerEvents="none" colors={tokens.goldGradient} style={[StyleSheet.absoluteFill, { borderRadius: 6 }]} />
                <Text style={{ color: tokens.onGold, fontSize: 12, fontFamily: 'Manrope_700Bold' }}>{t('Save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {nifasEntries.length > 0 && (
          <View style={[styles.nifasHistory, { borderTopColor: tokens.cardBorder }]}>
            {nifasEntries.map((item) => (
              <View key={item.id} style={[styles.nifasHistoryItem, { borderColor: tokens.cardBorder }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.nifasHistoryText, { color: tokens.text }]}>
                    {item.startDate} {item.endDate ? `→ ${item.endDate}` : `· (${t('Active')})`}
                  </Text>
                  {item.notes && (
                    <Text style={[styles.nifasHistoryNotes, { color: tokens.muted }]}>{item.notes}</Text>
                  )}
                </View>
                <TouchableOpacity
                  onPress={() => handleDeleteNifas(item)}
                  accessibilityRole="button"
                  accessibilityLabel={`${t('Delete')} ${item.startDate}`}
                  hitSlop={touchTargetTokens.hitSlop10}
                >
                  <Ionicons name="trash-outline" size={15} color={tokens.muted} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
        </PremiumCard>

        {/* Signs of Purity Card */}
        <PremiumCard style={{ ...styles.infoCard, borderColor: tokens.goldBorder, backgroundColor: tokens.ringFill }}>
          <Ionicons name="sparkles" size={18} color={tokens.goldText} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.infoCardTitle, { color: tokens.goldText }]}>
              {t('Recognizing Purity (Tuhr)')}
            </Text>
            <Text style={[styles.infoCardDesc, { color: tokens.text }]}>
              {t('A woman knows her menses or postpartum has ended by either:')}
              {'\n'}1. <Text style={{ fontFamily: 'Manrope_700Bold' }}>{t('Al-Qassah Al-Bayda:')}</Text> {t('A clear, white fluid discharged at the conclusion of menses.')}
              {'\n'}2. <Text style={{ fontFamily: 'Manrope_700Bold' }}>{t('Al-Jufuf (Complete Dryness):')}</Text> {t('Clean cotton emerges completely dry without any trace of blood, yellowish, or brownish discharge.')}
            </Text>
          </View>
        </PremiumCard>

        {/* When Ghusl is Obligatory */}
        <Text style={[styles.sectionTitle, { color: tokens.text, marginTop: 18, marginBottom: 8 }]}>
          {t('When is Ghusl Required?')}
        </Text>
        {GHUSL_REASONS.map((r) => (
          <PremiumCard key={r.id} style={{ marginBottom: 10 }}>
            <Text style={[styles.reasonTitle, { color: tokens.text }]}>{t(r.title)}</Text>
            <Text style={[styles.reasonDesc, { color: tokens.muted }]}>{t(r.description)}</Text>
            <Text style={[styles.reasonRef, { color: tokens.goldText }]}>{t(r.reference)}</Text>
          </PremiumCard>
        ))}

        {/* How to Perform Ghusl */}
        <View style={[styles.historyHeader, { marginTop: 18, marginBottom: 10 }]}>
          <View>
            <Text style={[styles.sectionTitle, { color: tokens.text }]}>{t('How to Perform Ghusl')}</Text>
            <Text style={[styles.progressSubtitle, { color: tokens.muted }]}>
              {completedCount} {t('of')} 6 {t('steps marked · Tap any step to track progress')}
            </Text>
          </View>
          {completedCount > 0 && (
            <TouchableOpacity onPress={resetGhuslSteps} hitSlop={touchTargetTokens.hitSlop8}>
              <Text style={[styles.resetText, { color: tokens.goldText }]}>{t('Reset')}</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.filterPills}>
          {(['all', 'obligatory', 'sunnah'] as const).map((f) => (
            <TouchableOpacity
              key={f}
              style={[
                styles.filterPill,
                getPillShadow(mode),
                { borderColor: tokens.cardBorder, backgroundColor: tokens.cardTop },
                ghuslFilter === f && { borderColor: tokens.goldBorder },
              ]}
              onPress={() => setGhuslFilter(f)}
              accessibilityRole="tab"
              accessibilityState={{ selected: ghuslFilter === f }}
            >
              {ghuslFilter === f && <LinearGradient pointerEvents="none" colors={tokens.goldGradient} style={[StyleSheet.absoluteFill, { borderRadius: 14 }]} />}
              <Text
                style={[
                  styles.filterPillText,
                  { color: ghuslFilter === f ? tokens.onGold : tokens.muted },
                ]}
              >
                {f === 'all' ? t('All Steps') : f === 'obligatory' ? t('Obligatory (Rukn)') : t('Sunnah')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {GHUSL_STEPS.filter((s) => ghuslFilter === 'all' || s.type === ghuslFilter).map((s) => {
          const isDone = completedSteps[s.id] === true;
          return (
            <PremiumCard
              key={s.id}
              style={{
                marginBottom: 10,
                borderColor: isDone ? tokens.success : tokens.cardBorder,
              }}
            >
              <TouchableOpacity
                onPress={() => toggleGhuslStep(s.id)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isDone }}
                accessibilityLabel={`${t(s.title)}, ${isDone ? t('Completed') : t('Not completed')}`}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                    <View
                      style={[
                        styles.stepCheckbox,
                        { borderColor: isDone ? tokens.success : tokens.cardBorder },
                        isDone && { backgroundColor: tokens.success },
                      ]}
                    >
                      {isDone && <Ionicons name="checkmark" size={13} color={tokens.onGold} />}
                    </View>
                    <Text
                      style={[
                        styles.stepTitle,
                        { color: isDone ? tokens.muted : tokens.text },
                        isDone && { textDecorationLine: 'line-through' },
                      ]}
                    >
                      {t(s.title)}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.stepBadge,
                      {
                        backgroundColor: s.type === 'obligatory' ? tokens.ringFill : 'transparent',
                        borderColor: s.type === 'obligatory' ? tokens.goldBorder : tokens.cardBorder,
                      },
                    ]}
                  >
                    <Text style={[styles.stepBadgeText, { color: s.type === 'obligatory' ? tokens.goldText : tokens.muted }]}>
                      {s.type === 'obligatory' ? t('Obligatory') : t('Sunnah')}
                    </Text>
                  </View>
                </View>
                {s.arabic && (
                  <ArabicText size={20} style={{ marginVertical: 6 }}>
                    {s.arabic}
                  </ArabicText>
                )}
                {s.transliteration && (
                  <Text style={[styles.stepTranslit, { color: tokens.goldText }]}>
                    {s.transliteration}
                  </Text>
                )}
                <Text style={[styles.stepDesc, { color: tokens.muted }]}>{t(s.description)}</Text>
              </TouchableOpacity>
            </PremiumCard>
          );
        })}
      </DetailScreen.ScrollView>
    </DetailScreen>
  );
}

export default withUndoToast(WomenPurityScreen);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingTop: 10,
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
