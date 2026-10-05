import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme';
import { ScreenHeader } from '../components/ScreenHeader';
import { ArabicText } from '../components/ArabicText';
import { fetchSurah, SurahDetail } from '../lib/quran';
import { SURAHS_114 } from '../lib/surahs114';

/**
 * Hifz Hide & Peek practice mode.
 * Shows ayahs hidden (placeholder dots); user recites from memory,
 * taps "Peek" to reveal, then moves to the next ayah. Peeked count is
 * tracked for revision.
 */
interface Props {
  surahNumber: number;
  onBack: () => void;
}

export function HifzPracticeScreen({ surahNumber, onBack }: Props) {
  const { colors } = useTheme();
  const [detail, setDetail] = useState<SurahDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [peekedCount, setPeekedCount] = useState(0);

  const surah = useMemo(() => SURAHS_114.find((s) => s.number === surahNumber), [surahNumber]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    fetchSurah(surahNumber, false)
      .then((d) => {
        if (alive) setDetail(d);
      })
      .catch(() => alive && setError('Could not load surah text. Check your connection and try again.'))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [surahNumber]);

  const ayahs = useMemo(() => detail?.ayahs || [], [detail]);
  const current = ayahs[index];

  const handleReveal = () => {
    if (!revealed) {
      setRevealed(true);
      setPeekedCount((c) => c + 1);
    }
  };

  const goNext = useCallback(() => {
    setRevealed(false);
    setIndex((i) => Math.min(ayahs.length - 1, i + 1));
  }, [ayahs.length]);

  const goPrev = () => {
    setRevealed(false);
    setIndex((i) => Math.max(0, i - 1));
  };

  const restart = () => {
    setIndex(0);
    setRevealed(false);
    setPeekedCount(0);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bgBase }]}>
      <ScreenHeader
        title={surah?.englishName || `Surah ${surahNumber}`}
        subtitle={`Hide & Peek · ${surah?.numberOfAyahs || 0} ayahs`}
        onBack={onBack}
      />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} size="large" />
          <Text style={[styles.hint, { color: colors.textMuted }]}>Loading surah text...</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={40} color={colors.textMuted} />
          <Text style={[styles.errorText, { color: colors.textSecondary }]}>{error}</Text>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: colors.accent }]}
            onPress={() => {
              setLoading(true);
              setError(null);
              fetchSurah(surahNumber, true)
                .then(setDetail)
                .catch(() => setError('Still could not load. Try again later.'))
                .finally(() => setLoading(false));
            }}
            accessibilityRole="button"
          >
            <Text style={styles.primaryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} style={{ flex: 1 }}>
          {/* Progress header */}
          <View style={styles.progressRow}>
            <Text style={[styles.progressText, { color: colors.textSecondary }]}>
              Ayah {index + 1} of {ayahs.length}
            </Text>
            <Text style={[styles.progressText, { color: colors.textMuted }]}>
              {peekedCount} peeked
            </Text>
          </View>
          <View style={[styles.progressTrack, { backgroundColor: colors.borderSubtle }]}>
            <View
              style={[
                styles.progressFill,
                { backgroundColor: colors.accent, width: `${ayahs.length ? ((index + 1) / ayahs.length) * 100 : 0}%` },
              ]}
            />
          </View>

          {/* Ayah card */}
          {current ? (
            <View style={[styles.ayahCard, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }]}>
              <Text style={[styles.ayahNum, { color: colors.accent }]}>
                {surahNumber}:{current.numberInSurah}
              </Text>

              {revealed ? (
                <ArabicText size={24} align="right" style={styles.ayahArabic}>
                  {current.text}
                </ArabicText>
              ) : (
                <View style={styles.hiddenBox}>
                  <Text style={[styles.hiddenDots, { color: colors.textMuted }]}>
                    • • • • • • • • •
                  </Text>
                  <Text style={[styles.hiddenHint, { color: colors.textMuted }]}>
                    Recite from memory, then peek to check.
                  </Text>
                </View>
              )}

              {revealed && current.translation ? (
                <Text style={[styles.ayahTrans, { color: colors.textSecondary }]} numberOfLines={4}>
                  {current.translation}
                </Text>
              ) : null}

              {!revealed && (
                <TouchableOpacity
                  style={[styles.peekBtn, { backgroundColor: colors.accent }]}
                  onPress={handleReveal}
                  accessibilityRole="button"
                  accessibilityLabel="Reveal this ayah"
                >
                  <Ionicons name="eye-outline" size={16} color="#FFF" />
                  <Text style={styles.peekBtnText}>Peek</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : null}

          {/* Controls */}
          <View style={styles.controlsRow}>
            <TouchableOpacity
              style={[styles.ctrlBtn, { borderColor: colors.borderSubtle }]}
              onPress={goPrev}
              disabled={index === 0}
              accessibilityRole="button"
              accessibilityLabel="Previous ayah"
            >
              <Ionicons name="chevron-back" size={20} color={index === 0 ? colors.textMuted : colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.ctrlBtn, styles.ctrlPrimary, { backgroundColor: colors.accent }]}
              onPress={revealed ? goNext : handleReveal}
              accessibilityRole="button"
              accessibilityLabel={revealed ? 'Next ayah' : 'Reveal this ayah'}
            >
              <Text style={styles.ctrlPrimaryText}>{revealed ? 'Next Ayah' : 'Peek'}</Text>
              <Ionicons name={revealed ? 'chevron-forward' : 'eye-outline'} size={18} color="#FFF" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.ctrlBtn, { borderColor: colors.borderSubtle }]}
              onPress={goNext}
              disabled={index === ayahs.length - 1}
              accessibilityRole="button"
              accessibilityLabel="Next ayah"
            >
              <Ionicons
                name="chevron-forward"
                size={20}
                color={index === ayahs.length - 1 ? colors.textMuted : colors.textSecondary}
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.restartBtn, { borderColor: colors.borderSubtle }]}
            onPress={restart}
            accessibilityRole="button"
            accessibilityLabel="Restart practice from the beginning"
          >
            <Ionicons name="refresh-outline" size={15} color={colors.textSecondary} />
            <Text style={[styles.restartText, { color: colors.textSecondary }]}>Restart</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30, gap: 12 },
  hint: { fontFamily: 'Manrope_400Regular', fontSize: 13 },
  errorText: { fontFamily: 'Manrope_400Regular', fontSize: 13, lineHeight: 19, textAlign: 'center' },
  primaryBtn: { paddingHorizontal: 22, minHeight: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  primaryBtnText: { fontFamily: 'Manrope_600SemiBold', fontSize: 14, color: '#FFF' },
  content: { padding: 20, paddingBottom: 40 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  progressText: { fontFamily: 'Manrope_500Medium', fontSize: 12 },
  progressTrack: { height: 4, borderRadius: 2, overflow: 'hidden', marginBottom: 18 },
  progressFill: { height: 4, borderRadius: 2 },
  ayahCard: { borderRadius: 16, borderWidth: 1, padding: 20, marginBottom: 20 },
  ayahNum: { fontFamily: 'Manrope_600SemiBold', fontSize: 12, letterSpacing: 0.4, marginBottom: 12 },
  ayahArabic: { marginBottom: 12 },
  ayahTrans: { fontFamily: 'Manrope_400Regular', fontSize: 13, lineHeight: 19 },
  hiddenBox: { alignItems: 'center', paddingVertical: 24 },
  hiddenDots: { fontSize: 26, letterSpacing: 8, marginBottom: 10 },
  hiddenHint: { fontFamily: 'Manrope_400Regular', fontSize: 12, textAlign: 'center' },
  peekBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 42,
    borderRadius: 21,
    marginTop: 10,
  },
  peekBtnText: { fontFamily: 'Manrope_600SemiBold', fontSize: 14, color: '#FFF' },
  controlsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14 },
  ctrlBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minWidth: 92,
    minHeight: 46,
    borderRadius: 23,
    borderWidth: 1,
    paddingHorizontal: 16,
  },
  ctrlPrimary: { borderWidth: 0 },
  ctrlPrimaryText: { fontFamily: 'Manrope_600SemiBold', fontSize: 15, color: '#FFF' },
  restartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 40,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 16,
  },
  restartText: { fontFamily: 'Manrope_500Medium', fontSize: 13 },
});
