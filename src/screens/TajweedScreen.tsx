import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  FlatList,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme';
import { ScreenHeader } from '../components/ScreenHeader';
import { ArabicText } from '../components/ArabicText';
import { TajweedText, TajweedLegend } from '../components/TajweedText';
import { fetchTajweedSurah, TajweedAyah } from '../lib/tajweed';
import { SURAHS_114 } from '../lib/surahs114';

interface Props {
  onBack: () => void;
}

export function TajweedScreen({ onBack }: Props) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const isCompact = width < 380;
  const [openSurah, setOpenSurah] = useState<number | null>(null);
  const [showLegend, setShowLegend] = useState(false);
  const [ayahs, setAyahs] = useState<TajweedAyah[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const loadSurah = useCallback(async (surah: number) => {
    setLoading(true);
    setError(null);
    setAyahs(null);
    try {
      const data = await fetchTajweedSurah(surah);
      setAyahs(data);
    } catch {
      setError('Could not load tajweed text. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (openSurah !== null) loadSurah(openSurah);
  }, [openSurah, loadSurah]);

  const filtered = SURAHS_114.filter(
    (s) =>
      s.englishName.toLowerCase().includes(query.toLowerCase()) ||
      s.number.toString().includes(query)
  );

  const openMeta = openSurah !== null ? SURAHS_114.find((s) => s.number === openSurah) : null;

  return (
    <View style={[styles.container, { backgroundColor: colors.bgBase }]}>
      <ScreenHeader
        title="Tajweed Colors"
        subtitle="Full Quran · color-coded recitation rules"
        onBack={onBack}
      />

      {openSurah === null ? (
        <ScrollView contentContainerStyle={styles.content} style={{ flex: 1 }}>
          <View style={[styles.infoCard, { backgroundColor: colors.accentDim, borderColor: colors.borderSubtle }]}>
            <Ionicons name="information-circle-outline" size={18} color={colors.accent} />
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              Every surah of the Quran in standard tajweed colors — ghunnah, idgham, qalqalah, ikhfa, madd and silent letters. Data from islamic.app (uthmani tajweed edition).
            </Text>
          </View>

          <View style={[styles.searchBox, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }]}>
            <Ionicons name="search" size={16} color={colors.textMuted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search surah..."
              placeholderTextColor={colors.textMuted}
              style={[styles.searchInput, { color: colors.textPrimary }]}
            />
          </View>

          {filtered.map((s) => (
            <TouchableOpacity
              key={s.number}
              onPress={() => setOpenSurah(s.number)}
              style={[styles.row, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }]}
              accessibilityRole="button"
              accessibilityLabel={`Read ${s.englishName} with tajweed colors`}
            >
              <View style={[styles.numBox, { backgroundColor: colors.accentDim }]}>
                <Text style={[styles.numText, { color: colors.accent }]}>{s.number}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowName, { color: colors.textPrimary }]}>{s.englishName}</Text>
                <Text style={[styles.rowCount, { color: colors.textMuted }]}>{s.numberOfAyahs} ayahs</Text>
              </View>
              <ArabicText size={18}>{s.name}</ArabicText>
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
        <View style={{ flex: 1 }}>
          <View style={[styles.content, { paddingBottom: 0 }]}>
            <View style={styles.surahHeader}>
              <TouchableOpacity
                onPress={() => setOpenSurah(null)}
                style={[styles.backChip, { borderColor: colors.borderSubtle }]}
                accessibilityRole="button"
                accessibilityLabel="Back to tajweed surah list"
              >
                <Ionicons name="chevron-back" size={15} color={colors.textSecondary} />
                <Text style={[styles.backChipText, { color: colors.textSecondary }]}>All surahs</Text>
              </TouchableOpacity>
              <Text style={[styles.surahTitle, { color: colors.textPrimary }]}>
                {openMeta?.englishName || openSurah}
              </Text>
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
          </View>

          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator color={colors.accent} size="large" />
              <Text style={[styles.hint, { color: colors.textMuted }]}>Loading tajweed text...</Text>
            </View>
          ) : error ? (
            <View style={styles.center}>
              <Ionicons name="cloud-offline-outline" size={40} color={colors.textMuted} />
              <Text style={[styles.errorText, { color: colors.textSecondary }]}>{error}</Text>
              <TouchableOpacity
                style={[styles.retryBtn, { backgroundColor: colors.accent }]}
                onPress={() => loadSurah(openSurah)}
                accessibilityRole="button"
              >
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={ayahs || []}
              keyExtractor={(a) => a.verseKey}
              contentContainerStyle={styles.ayahCard}
              initialNumToRender={12}
              maxToRenderPerBatch={12}
              windowSize={7}
              removeClippedSubviews={Platform.OS !== 'web'}
              ListHeaderComponent={
                <Text style={[styles.listHint, { color: colors.textMuted }]}>
                  {ayahs?.length || 0} ayahs · tajweed colors
                </Text>
              }
              renderItem={({ item }: { item: TajweedAyah }) => (
                <View style={styles.ayahBlock}>
                  <Text style={[styles.ayahNum, { color: colors.textMuted }]}>{item.verseKey}</Text>
                  <TajweedText text={item.html} size={isCompact ? 22 : 25} />
                </View>
              )}
            />
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  infoCard: { flexDirection: 'row', gap: 10, borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 16 },
  infoText: { fontFamily: 'Manrope_400Regular', fontSize: 12.5, lineHeight: 18, flex: 1 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  searchInput: { flex: 1, fontFamily: 'Manrope_400Regular', fontSize: 14, paddingVertical: 10 },
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
  surahTitle: { fontFamily: 'InstrumentSerif_400Regular', fontSize: 22, flex: 1, textAlign: 'center' },
  center: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  hint: { fontFamily: 'Manrope_400Regular', fontSize: 13 },
  errorText: { fontFamily: 'Manrope_400Regular', fontSize: 13, lineHeight: 19, textAlign: 'center' },
  retryBtn: { paddingHorizontal: 22, minHeight: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  retryText: { fontFamily: 'Manrope_600SemiBold', fontSize: 14, color: '#FFF' },
  ayahCard: { borderRadius: 16, borderWidth: 1, padding: 18, backgroundColor: 'transparent' },
  listHint: { fontFamily: 'Manrope_500Medium', fontSize: 11, color: '#8C8474', marginBottom: 10 },
  ayahBlock: { marginBottom: 16 },
  ayahNum: { fontFamily: 'Manrope_500Medium', fontSize: 11, letterSpacing: 0.4, marginBottom: 6 },
});
