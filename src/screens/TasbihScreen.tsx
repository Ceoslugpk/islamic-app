import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme';
import { useHaptics } from '../lib/haptics';
import { SectionHeader } from '../components/SectionHeader';
import { Hairline } from '../components/Hairline';
import { ArabicText } from '../components/ArabicText';
import { saveTasbihCount, loadTasbihCounts, saveTasbihDayTotal, loadTasbihDayTotal } from '../lib/db';
import { useUndoToast, withUndoToast } from '../lib/undoToast';

export interface DhikrItem {
  id: string;
  arabic: string;
  transliteration: string;
  meaning: string;
}

export const DHIKR_PRESETS: DhikrItem[] = [
  {
    id: 'subhanallah',
    arabic: 'سُبْحَانَ اللَّهِ',
    transliteration: 'SubhanAllah',
    meaning: 'Glory be to Allah',
  },
  {
    id: 'alhamdulillah',
    arabic: 'الْحَمْدُ لِلَّهِ',
    transliteration: 'Alhamdulillah',
    meaning: 'Praise be to Allah',
  },
  {
    id: 'allahuakbar',
    arabic: 'اللَّهُ أَكْبَرُ',
    transliteration: 'Allahu Akbar',
    meaning: 'Allah is the Greatest',
  },
  {
    id: 'lailahaillallah',
    arabic: 'لَا إِلَٰهَ إِلَّا اللَّهُ',
    transliteration: 'La ilaha illallah',
    meaning: 'There is no god but Allah',
  },
  {
    id: 'astaghfirullah',
    arabic: 'أَسْتَغْفِرُ اللَّهَ',
    transliteration: 'Astaghfirullah',
    meaning: 'I seek forgiveness from Allah',
  },
];

const TARGET_OPTIONS = [33, 99];

function TasbihScreen({ onBack }: { onBack?: () => void }) {
  const { colors } = useTheme();
  const { haptic } = useHaptics();
  const [selectedDhikr, setSelectedDhikr] = useState<DhikrItem>(DHIKR_PRESETS[0]);
  const [target, setTarget] = useState<number>(33);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [todayTotal, setTodayTotal] = useState<number>(0);
  const { saveUndoState } = useUndoToast();

  const todayKey = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    const loaded = loadTasbihCounts();
    setCounts(loaded);
    const daily = loadTasbihDayTotal(todayKey);
    setTodayTotal(daily);
  }, [todayKey]);

  const currentCount = counts[selectedDhikr.id] || 0;

  const handleTap = useCallback(() => {
    haptic('light');

    const nextCount = currentCount + 1;
    setCounts((prev) => ({
      ...prev,
      [selectedDhikr.id]: nextCount,
    }));
    saveTasbihCount(selectedDhikr.id, nextCount);

    // Increment daily total
    const nextDaily = todayTotal + 1;
    setTodayTotal(nextDaily);
    saveTasbihDayTotal(todayKey, 1);

    // Give an extra success impact if target reached
    if (nextCount > 0 && nextCount % target === 0) {
      haptic('success');
    }
  }, [currentCount, selectedDhikr.id, target, haptic, todayTotal, todayKey]);

  const handleReset = useCallback(() => {
    haptic('warning');
    const prevCount = counts[selectedDhikr.id] || 0;
    setCounts((prev) => ({
      ...prev,
      [selectedDhikr.id]: 0,
    }));
    saveTasbihCount(selectedDhikr.id, 0);
    saveUndoState({
      id: `tasbih:${selectedDhikr.id}`,
      action: 'Count reset',
      revert: () => {
        setCounts((prev) => ({
          ...prev,
          [selectedDhikr.id]: prevCount,
        }));
        saveTasbihCount(selectedDhikr.id, prevCount);
      },
    });
  }, [selectedDhikr.id, haptic, counts, saveUndoState]);

  const rounds = Math.floor(currentCount / target);
  const progressInRound = currentCount % target;
  const progressFraction = target > 0 ? progressInRound / target : 0;

  const { width } = useWindowDimensions();
  const isCompact = width < 380;
  const paddingH = isCompact ? 16 : 20;

  return (
    <ScrollView
      style={{ backgroundColor: colors.bgBase }}
      contentContainerStyle={[styles.content, { paddingHorizontal: paddingH }]}
    >
      <View style={styles.contentWrap}>
        {onBack && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel="Back to Library"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={[styles.backText, { color: colors.accent, fontSize: isCompact ? 13 : 14 }]}>← Library</Text>
          </TouchableOpacity>
        )}

        <SectionHeader compact eyebrow="Dhikr & Remembrance" title="Tasbih" />

      {/* Dhikr Selector Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.dhikrList}
      >
        {DHIKR_PRESETS.map((d) => {
          const isSelected = d.id === selectedDhikr.id;
          return (
            <TouchableOpacity
              key={d.id}
              style={[
                styles.dhikrChip,
                {
                  backgroundColor: isSelected ? colors.accentDim : colors.bgSurface,
                  borderColor: isSelected ? colors.accent : colors.borderSubtle,
                },
              ]}
              onPress={() => setSelectedDhikr(d)}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
            >
              <Text
                style={[
                  styles.dhikrChipText,
                  { color: isSelected ? colors.accent : colors.textSecondary },
                ]}
              >
                {d.transliteration}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Target Selector & Round Meta */}
      <View style={[styles.metaBar, { borderColor: colors.borderSubtle }]}>
        <View style={styles.metaLeft}>
          <Text style={[styles.metaLabel, { color: colors.textMuted }]}>TARGET</Text>
          <View style={styles.targetRow}>
            {TARGET_OPTIONS.map((t) => {
              const active = target === t;
              return (
                <TouchableOpacity
                  key={t}
                  onPress={() => setTarget(t)}
                  style={[
                    styles.targetBtn,
                    {
                      backgroundColor: active ? colors.accent : colors.bgSurface,
                      borderColor: active ? colors.accent : colors.borderSubtle,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Target ${t}`}
                >
                  <Text
                    style={[
                      styles.targetBtnText,
                      { color: active ? colors.bgBase : colors.textSecondary },
                    ]}
                  >
                    {t}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.metaRight}>
          <Text style={[styles.metaLabel, { color: colors.textMuted }]}>ROUNDS</Text>
          <Text style={[styles.metaValue, { color: colors.accent }]}>
            {rounds} <Text style={{ color: colors.textMuted, fontSize: 13 }}>({progressInRound}/{target})</Text>
          </Text>
        </View>
      </View>

      {/* Today Summary */}
      <View
        style={[
          styles.summaryCard,
          {
            backgroundColor: colors.bgSurface,
            borderColor: colors.borderSubtle,
          },
        ]}
      >
        <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Today</Text>
        <Text style={[styles.summaryValue, { color: colors.accent }]}>{todayTotal}</Text>
        <Text style={[styles.summaryUnit, { color: colors.textMuted }]}>counts</Text>
      </View>

      {/* Current Dhikr Phrase Card */}
      <View
        style={[
          styles.phraseCard,
          {
            backgroundColor: colors.bgSurface,
            borderColor: colors.borderSubtle,
          },
        ]}
      >
        <ArabicText size={32} align="center" style={styles.arabic}>
          {selectedDhikr.arabic}
        </ArabicText>
        <Text style={[styles.translit, { color: colors.textPrimary }]}>
          {selectedDhikr.transliteration}
        </Text>
        <Text style={[styles.meaning, { color: colors.textMuted }]}>
          &ldquo;{selectedDhikr.meaning}&rdquo;
        </Text>
      </View>

      {/* Big Circular Tap Counter Zone */}
      <View style={styles.counterWrap}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleTap}
          style={[
            styles.counterCircle,
            {
              backgroundColor: colors.bgSurface,
              borderColor: colors.accent,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel={`Dhikr counter: ${currentCount}. Tap to increment.`}
        >
          <Text style={[styles.counterNumber, { color: colors.textPrimary }]}>
            {currentCount}
          </Text>
          <Text style={[styles.tapLabel, { color: colors.accent }]}>
            TAP TO COUNT
          </Text>
        </TouchableOpacity>
      </View>

      {/* Progress Indicator */}
      <View style={styles.progressWrap}>
        <View style={styles.progressMeta}>
          <Text style={[styles.progressText, { color: colors.textSecondary }]}>
            {progressInRound} / {target}
          </Text>
          <Text style={[styles.progressPercent, { color: colors.textMuted }]}>
            {Math.round(progressFraction * 100)}%
          </Text>
        </View>
        <View style={[styles.progressTrack, { backgroundColor: colors.borderSubtle }]}>
          <View
            style={[
              styles.progressFill,
              {
                backgroundColor: colors.accent,
                width: `${Math.round(progressFraction * 100)}%`,
              },
            ]}
          />
        </View>
      </View>

      {/* Bottom Action Controls */}
      <View style={styles.bottomRow}>
        <TouchableOpacity
          onPress={handleReset}
          style={[
            styles.resetBtn,
            {
              borderColor: colors.borderSubtle,
              backgroundColor: colors.bgSurface,
            },
          ]}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel="Reset count to zero"
        >
          <Ionicons name="refresh-outline" size={16} color={colors.textSecondary} style={{ marginRight: 6 }} />
          <Text style={[styles.resetText, { color: colors.textSecondary }]}>
            Reset Count
          </Text>
        </TouchableOpacity>
      </View>

      <Hairline style={{ marginTop: 24, marginBottom: 16 }} />

      <Text style={[styles.footnote, { color: colors.textMuted }]}>
        Tap anywhere on the large dial to count. Your count for each phrase is automatically saved offline.
      </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingVertical: 12,
    paddingBottom: 40,
  },
  contentWrap: {
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
  },
  backButton: {
    alignSelf: 'flex-start',
    minHeight: 30,
    justifyContent: 'center',
    paddingVertical: 3,
    paddingRight: 10,
    marginBottom: 2,
  },
  backText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
  },
  dhikrList: {
    paddingVertical: 4,
    gap: 6,
    marginBottom: 12,
  },
  dhikrChip: {
    height: 28,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dhikrChipText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
  },
  metaBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  metaLeft: {
    flexDirection: 'column',
    gap: 6,
  },
  metaRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  metaLabel: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 10,
    letterSpacing: 0.8,
  },
  targetRow: {
    flexDirection: 'row',
    gap: 6,
  },
  targetBtn: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  targetBtnText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
  },
  metaValue: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 22,
  },
  phraseCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 24,
  },
  arabic: {
    marginBottom: 8,
  },
  translit: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 17,
    marginBottom: 4,
  },
  meaning: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
    textAlign: 'center',
  },
  counterWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
  },
  counterCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterNumber: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 64,
    lineHeight: 70,
  },
  tapLabel: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 11,
    letterSpacing: 1.2,
    marginTop: 4,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  resetText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
  },
  footnote: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  summaryCard: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  summaryLabel: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  summaryValue: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 28,
    lineHeight: 34,
  },
  summaryUnit: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 13,
    marginTop: 2,
  },
  progressWrap: {
    width: '100%',
    maxWidth: 320,
    alignSelf: 'center',
    marginTop: 16,
    marginBottom: 8,
    gap: 6,
  },
  progressMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
  },
  progressPercent: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
});

export default withUndoToast(TasbihScreen);

