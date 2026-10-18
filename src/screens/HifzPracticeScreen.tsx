import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { AppText } from '../components/ui/AppText';
import { Ionicons } from '@expo/vector-icons';
import { useThemeTokens, cardTokens } from '../theme/tokens';
import { getPillShadow } from '../lib/homeThemeTokens';
import { t } from '../lib/i18n';
import { SubHeader } from '../components/layout/SubHeader';
import { DetailScreen } from '../components/layout/DetailScreen';
import { ArabicText } from '../components/ArabicText';
import { PremiumCard } from '../components/ui';
import { fetchSurah, SurahDetail } from '../lib/quran';
import { SURAHS_114 } from '../lib/surahs114';
import { getBackIcon, getForwardIcon } from '../lib/iconMap';

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
  const { tokens, mode } = useThemeTokens();
  const { width } = useWindowDimensions();
  const isCompact = width < 380;
  const paddingH = isCompact ? 14 : 20;
  const [detail, setDetail] = useState<SurahDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [peekedCount, setPeekedCount] = useState(0);

  const surah = useMemo(() => SURAHS_114.find((s) => s.number === surahNumber), [surahNumber]);

  useEffect(() => {
    let alive = true;
    fetchSurah(surahNumber, false)
      .then((d) => {
        if (alive) setDetail(d);
      })
      .catch(() => alive && setError(t('Could not load surah text. Check your connection and try again.')))
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
    <DetailScreen
      style={[styles.container, { backgroundColor: tokens.bgTop }]}
      header={
        <SubHeader
          eyebrow={t('Hide & Peek')}
          title={surah?.englishName || `${t('Surah')} ${surahNumber}`}
          subtitle={`${surah?.numberOfAyahs || 0} ${t('ayahs')} · ${t('Recite from memory & test recall')}`}
          onBack={onBack}
          backLabel={t('Hifz')}
          borderBottom
          showFade
        />
      }
    >
      <View style={styles.contentWrap}>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={tokens.gold} size="large" />
            <AppText variant="caption" tone="faint" style={styles.hint}>{t('Loading surah text...')}</AppText>
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Ionicons name="cloud-offline-outline" size={40} color={tokens.muted} />
            <AppText variant="body" tone="faint" style={styles.errorText}>{error}</AppText>
            <TouchableOpacity
              style={[styles.primaryBtn, getPillShadow(mode), { backgroundColor: tokens.gold, borderColor: tokens.goldBorder }]}
              onPress={() => {
                setLoading(true);
                setError(null);
                fetchSurah(surahNumber, true)
                  .then(setDetail)
                  .catch(() => setError(t('Still could not load. Try again later.')))
                  .finally(() => setLoading(false));
              }}
              accessibilityRole="button"
            >
              <AppText variant="rowTitle" tone="onGold" style={styles.primaryBtnText}>{t('Retry')}</AppText>
            </TouchableOpacity>
          </View>
        ) : (
          <DetailScreen.ScrollView
            contentContainerStyle={[
              styles.content,
              {
                paddingHorizontal: paddingH,
              },
            ]}
            style={{ flex: 1 }}
          >
            {/* Progress header card */}
            <PremiumCard
              style={styles.progressCard}
              padded
              borderRadius={16}
            >
              <View style={styles.progressRow}>
                <AppText variant="caption" style={styles.progressText}>
                  {t('Ayah')} {index + 1} {t('of')} {ayahs.length}
                </AppText>
                <AppText variant="caption" tone="faint" style={styles.progressText}>
                  {peekedCount} {t('peeked')}
                </AppText>
              </View>
              <View style={[styles.progressTrack, { backgroundColor: tokens.trackColor }]}>
                <View
                  style={[
                    styles.progressFill,
                    { backgroundColor: tokens.gold, width: `${ayahs.length ? ((index + 1) / ayahs.length) * 100 : 0}%` },
                  ]}
                />
              </View>
            </PremiumCard>

            {/* Ayah card */}
            {current ? (
              <PremiumCard
                style={styles.ayahCard}
                padded
                borderRadius={20}
              >
                <AppText variant="eyebrow" highlight style={styles.ayahNum}>
                  {surahNumber}:{current.numberInSurah}
                </AppText>

                {revealed ? (
                  <ArabicText size={24} align="right" style={[styles.ayahArabic, { color: tokens.text }]}>
                    {current.text}
                  </ArabicText>
                ) : (
                  <View style={styles.hiddenBox}>
                    <AppText variant="title" tone="faint" style={styles.hiddenDots}>
                      • • • • • • • • •
                    </AppText>
                    <AppText variant="caption" tone="faint" style={styles.hiddenHint}>
                      {t('Recite from memory, then peek to check.')}
                    </AppText>
                  </View>
                )}

                {revealed && current.translation ? (
                  <AppText variant="body" tone="faint" style={styles.ayahTrans}>
                    {current.translation}
                  </AppText>
                ) : null}

                {!revealed && (
                  <TouchableOpacity
                    style={[
                      styles.peekBtn,
                      getPillShadow(mode),
                      { backgroundColor: tokens.gold, borderColor: tokens.goldBorder },
                    ]}
                    onPress={handleReveal}
                    accessibilityRole="button"
                    accessibilityLabel={t('Reveal this ayah')}
                  >
                    <Ionicons name="eye-outline" size={16} color={tokens.onGold} />
                    <AppText variant="rowTitle" tone="onGold" style={styles.peekBtnText}>{t('Peek')}</AppText>
                  </TouchableOpacity>
                )}
              </PremiumCard>
            ) : null}

            {/* Controls panel */}
            <PremiumCard style={styles.controlsCard} padded borderRadius={18}>
              <View style={styles.controlsRow}>
                <TouchableOpacity
                  style={[
                    styles.ctrlBtn,
                    getPillShadow(mode),
                    {
                      backgroundColor: tokens.cardTop,
                      borderColor: tokens.cardBorder,
                    },
                  ]}
                  onPress={goPrev}
                  disabled={index === 0}
                  accessibilityRole="button"
                  accessibilityLabel={t('Previous ayah')}
                >
                  <Ionicons
                    name={getBackIcon()}
                    size={20}
                    color={index === 0 ? tokens.muted : tokens.text}
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.ctrlBtn,
                    styles.ctrlPrimary,
                    getPillShadow(mode),
                    { backgroundColor: tokens.gold, borderColor: tokens.goldBorder },
                  ]}
                  onPress={revealed ? goNext : handleReveal}
                  accessibilityRole="button"
                  accessibilityLabel={revealed ? t('Next ayah') : t('Reveal this ayah')}
                >
                  <AppText variant="rowTitle" tone="onGold" style={styles.ctrlPrimaryText}>
                    {revealed ? t('Next Ayah') : t('Peek')}
                  </AppText>
                  <Ionicons
                    name={revealed ? 'chevron-forward' : 'eye-outline'}
                    size={18}
                    color={tokens.onGold}
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.ctrlBtn,
                    getPillShadow(mode),
                    {
                      backgroundColor: tokens.cardTop,
                      borderColor: tokens.cardBorder,
                    },
                  ]}
                  onPress={goNext}
                  disabled={index === ayahs.length - 1}
                  accessibilityRole="button"
                  accessibilityLabel={t('Next ayah')}
                >
                  <Ionicons
                    name={getForwardIcon()}
                    size={20}
                    color={index === ayahs.length - 1 ? tokens.muted : tokens.text}
                  />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[
                  styles.restartBtn,
                  getPillShadow(mode),
                  {
                    backgroundColor: tokens.cardTop,
                    borderColor: tokens.cardBorder,
                  },
                ]}
                onPress={restart}
                accessibilityRole="button"
                accessibilityLabel={t('Restart practice from the beginning')}
              >
                <Ionicons name="refresh-outline" size={15} color={tokens.muted} />
                <AppText variant="caption" tone="faint" style={styles.restartText}>{t('Restart')}</AppText>
              </TouchableOpacity>
            </PremiumCard>
          </DetailScreen.ScrollView>
        )}
      </View>
    </DetailScreen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentWrap: {
    flex: 1,
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30, gap: 12 },
  hint: { fontFamily: 'Manrope_400Regular', fontSize: 13 },
  errorText: { fontFamily: 'Manrope_400Regular', fontSize: 13, textAlign: 'center' },
  primaryBtn: { paddingHorizontal: 22, minHeight: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  primaryBtnText: { fontFamily: 'Manrope_600SemiBold', fontSize: 14 },
  content: { paddingTop: 10, paddingBottom: 40 },
  progressCard: { marginBottom: 14 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  progressText: { fontFamily: 'Manrope_500Medium', fontSize: 12 },
  progressTrack: { height: 4, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: 4, borderRadius: 2 },
  ayahCard: { marginBottom: 14, minHeight: 140 },
  controlsCard: { marginBottom: 20 },
  ayahNum: { fontFamily: 'Manrope_600SemiBold', fontSize: 12, letterSpacing: 0.4, marginBottom: 12 },
  ayahArabic: { marginBottom: 12, paddingVertical: 4 },
  ayahTrans: { fontFamily: 'Manrope_400Regular', fontSize: 13 },
  hiddenBox: { alignItems: 'center', paddingVertical: 24, minHeight: 80 },
  hiddenDots: { fontSize: 26, letterSpacing: 8, marginBottom: 10 },
  hiddenHint: { fontFamily: 'Manrope_400Regular', fontSize: 12, textAlign: 'center' },
  peekBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 20,
    minHeight: 42,
    borderRadius: 21,
    marginTop: 10,
  },
  peekBtnText: { fontFamily: 'Manrope_600SemiBold', fontSize: 14 },
  controlsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: 14 },
  ctrlBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minWidth: 84,
    flexShrink: 1,
    minHeight: 46,
    borderRadius: 23,
    borderWidth: cardTokens.borderWidth,
    paddingHorizontal: 16,
  },
  ctrlPrimary: { borderWidth: cardTokens.borderWidth },
  ctrlPrimaryText: { fontFamily: 'Manrope_600SemiBold', fontSize: 15, flexShrink: 1 },
  restartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 16,
    minHeight: 40,
    borderRadius: 20,
    borderWidth: cardTokens.borderWidth,
    marginTop: 16,
  },
  restartText: { fontFamily: 'Manrope_500Medium', fontSize: 13 },
});
