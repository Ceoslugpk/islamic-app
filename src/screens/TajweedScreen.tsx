import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme';
import { ScreenHeader } from '../components/ScreenHeader';
import { ArabicText } from '../components/ArabicText';
import { TajweedText, TajweedLegend } from '../components/TajweedText';
import { TAJWEED_SURAHS, TajweedSurah } from '../lib/tajweed';

interface Props {
  onBack: () => void;
}

export function TajweedScreen({ onBack }: Props) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const isCompact = width < 380;
  const [open, setOpen] = useState<TajweedSurah | null>(null);
  const [showLegend, setShowLegend] = useState(false);

  return (
    <View style={[styles.container, { backgroundColor: colors.bgBase }]}>
      <ScreenHeader
        title="Tajweed Colors"
        subtitle="Color-coded Quran reading · curated surahs"
        onBack={onBack}
      />

      {open === null ? (
        <ScrollView contentContainerStyle={styles.content} style={{ flex: 1 }}>
          <View style={[styles.infoCard, { backgroundColor: colors.accentDim, borderColor: colors.borderSubtle }]}>
            <Ionicons name="information-circle-outline" size={18} color={colors.accent} />
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              Read with the standard tajweed color rules — ghunnah, idgham, qalqalah, ikhfa, madd and silent letters. Tap a surah to read it in color.
            </Text>
          </View>

          {TAJWEED_SURAHS.map((s) => (
            <TouchableOpacity
              key={s.number}
              onPress={() => setOpen(s)}
              style={[styles.row, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }]}
              accessibilityRole="button"
              accessibilityLabel={`Read ${s.nameEn} with tajweed colors`}
            >
              <View style={[styles.numBox, { backgroundColor: colors.accentDim }]}>
                <Text style={[styles.numText, { color: colors.accent }]}>{s.number}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowName, { color: colors.textPrimary }]}>{s.nameEn}</Text>
                <Text style={[styles.rowCount, { color: colors.textMuted }]}>{s.ayahs.length} ayahs</Text>
              </View>
              <ArabicText size={18}>{s.nameAr}</ArabicText>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} style={{ marginLeft: 8 }} />
            </TouchableOpacity>
          ))}

          <TouchableOpacity
            onPress={() => setShowLegend((v) => !v)}
            style={[styles.legendToggle, { borderColor: colors.borderSubtle }]}
            accessibilityRole="button"
          >
            <Ionicons name={showLegend ? 'chevron-up' : 'chevron-down'} size={15} color={colors.accent} />
            <Text style={[styles.legendToggleText, { color: colors.accent }]}>
              {showLegend ? 'Hide color legend' : 'Show color legend'}
            </Text>
          </TouchableOpacity>

          {showLegend && (
            <View style={[styles.legendCard, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }]}>
              <TajweedLegend />
            </View>
          )}
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.content} style={{ flex: 1 }}>
          <View style={styles.surahHeader}>
            <TouchableOpacity
              onPress={() => setOpen(null)}
              style={[styles.backChip, { borderColor: colors.borderSubtle }]}
              accessibilityRole="button"
              accessibilityLabel="Back to tajweed surah list"
            >
              <Ionicons name="chevron-back" size={15} color={colors.textSecondary} />
              <Text style={[styles.backChipText, { color: colors.textSecondary }]}>All surahs</Text>
            </TouchableOpacity>
            <Text style={[styles.surahTitle, { color: colors.textPrimary }]}>{open.nameEn}</Text>
            <TouchableOpacity
              onPress={() => setShowLegend((v) => !v)}
              style={[styles.backChip, { borderColor: colors.borderSubtle }]}
              accessibilityRole="button"
            >
              <Ionicons name="color-palette-outline" size={15} color={colors.accent} />
              <Text style={[styles.backChipText, { color: colors.accent }]}>Legend</Text>
            </TouchableOpacity>
          </View>

          {showLegend && (
            <View style={[styles.legendCard, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }]}>
              <TajweedLegend compact />
            </View>
          )}

          <View style={[styles.ayahCard, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }]}>
            {open.ayahs.map((a, i) => (
              <View key={i} style={styles.ayahBlock}>
                <Text style={[styles.ayahNum, { color: colors.textMuted }]}>
                  {open.number}:{i + 1}
                </Text>
                <TajweedText text={a} size={isCompact ? 22 : 25} />
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  infoCard: { flexDirection: 'row', gap: 10, borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 16 },
  infoText: { fontFamily: 'Manrope_400Regular', fontSize: 12.5, lineHeight: 18, flex: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  numBox: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  numText: { fontFamily: 'Manrope_700Bold', fontSize: 13 },
  rowName: { fontFamily: 'InstrumentSerif_400Regular', fontSize: 18 },
  rowCount: { fontFamily: 'Manrope_400Regular', fontSize: 11, marginTop: 1 },
  legendToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 40,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 10,
  },
  legendToggleText: { fontFamily: 'Manrope_600SemiBold', fontSize: 13 },
  legendCard: { borderRadius: 14, borderWidth: 1, padding: 16, marginTop: 12 },
  surahHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  backChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
  },
  backChipText: { fontFamily: 'Manrope_500Medium', fontSize: 12 },
  surahTitle: { fontFamily: 'InstrumentSerif_400Regular', fontSize: 22 },
  ayahCard: { borderRadius: 16, borderWidth: 1, padding: 18 },
  ayahBlock: { marginBottom: 16 },
  ayahNum: { fontFamily: 'Manrope_500Medium', fontSize: 11, letterSpacing: 0.4, marginBottom: 6 },
});
