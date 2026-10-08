import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../lib/theme';
import { ScreenHeader } from '../components/ScreenHeader';
import { ArabicText } from '../components/ArabicText';
import { VOCAB_WORDS, VocabWord, TIER_LABELS, getDailyWord, getDailyWords } from '../lib/vocab';
import { hScrollRTLStyle } from '../lib/rtl';

const PROGRESS_KEY = 'vocab-trainer-progress-v1';

interface Progress {
  known: Record<string, boolean>; // arabic -> known
  lastIndex: number;
}

function loadProgress(): Progress {
  try {
    // AsyncStorage is async; this sync helper reads from a module cache set at init.
    return { known: {}, lastIndex: 0 };
  } catch {
    return { known: {}, lastIndex: 0 };
  }
}

interface Props {
  onBack: () => void;
  backLabel?: string;
}

export function VocabTrainerScreen({ onBack, backLabel }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const isCompact = width < 380;

  const [known, setKnown] = useState<Record<string, boolean>>({});
  const [revealed, setRevealed] = useState(false);
  const [index, setIndex] = useState(0);
  const [tierFilter, setTierFilter] = useState<number | 'daily' | null>(null);
  const [sessionKnown, setSessionKnown] = useState(0);

  const dailyWord = useMemo(() => getDailyWord(), []);
  const dailyWords = useMemo(() => getDailyWords(5), []);

  // Load progress on mount
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(PROGRESS_KEY);
        if (raw) {
          const p: Progress = JSON.parse(raw);
          setKnown(p.known || {});
          setIndex(p.lastIndex || 0);
        }
      } catch {
        // ignore
      }
    })();
  }, []);

  const words = useMemo(() => {
    if (tierFilter === 'daily') return dailyWords;
    if (tierFilter === null) return VOCAB_WORDS;
    return VOCAB_WORDS.filter((w) => w.tier === tierFilter);
  }, [tierFilter, dailyWords]);

  const current: VocabWord | undefined = words[index % words.length] ?? words[0];

  const persist = async (k: Record<string, boolean>, i: number) => {
    try {
      await AsyncStorage.setItem(PROGRESS_KEY, JSON.stringify({ known: k, lastIndex: i }));
    } catch {
      // ignore
    }
  };

  const markKnown = async () => {
    if (!current) return;
    const next = { ...known, [current.arabic]: true };
    setKnown(next);
    setSessionKnown((c) => c + 1);
    setRevealed(false);
    const nextIndex = (index + 1) % words.length;
    setIndex(nextIndex);
    await persist(next, nextIndex);
  };

  const next = async () => {
    setRevealed(false);
    const nextIndex = (index + 1) % words.length;
    setIndex(nextIndex);
    await persist(known, nextIndex);
  };

  const prev = () => {
    setRevealed(false);
    const prevIndex = (index - 1 + words.length) % words.length;
    setIndex(prevIndex);
  };

  const knownCount = useMemo(() => Object.keys(known).filter((k) => known[k]).length, [known]);
  const progressPercent = Math.round((knownCount / VOCAB_WORDS.length) * 100);

  return (
    <View style={[styles.container, { backgroundColor: colors.bgBase }]}>
      <ScreenHeader
        title={t('Quran Vocabulary')}
        subtitle={t('Most frequent words of the Quran')}
        eyebrow={t('Learn')}
        backLabel={backLabel ? t(backLabel) : t('Library')}
        onBack={onBack}
      />

      <ScrollView contentContainerStyle={styles.content} style={{ flex: 1 }}>
        {/* Progress */}
        <View style={styles.statsRow}>
          <View style={[styles.statChip, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }]}>
            <Ionicons name="checkmark-circle" size={14} color={colors.accent} />
            <Text style={[styles.statText, { color: colors.textSecondary }]}>
              {knownCount}/{VOCAB_WORDS.length} {t('known')}
            </Text>
          </View>
          <View style={[styles.statChip, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }]}>
            <Ionicons name="trending-up" size={14} color={colors.accent} />
            <Text style={[styles.statText, { color: colors.textSecondary }]}>{progressPercent}%</Text>
          </View>
        </View>

        {/* Today's Word Card (Prominently featured Quranic word of the day) */}
        <View
          style={[
            styles.dailyCard,
            {
              backgroundColor: colors.bgSurface,
              borderColor: colors.borderSubtle,
            },
          ]}
        >
          <View style={styles.dailyTopRow}>
            <View style={[styles.dailyBadge, { backgroundColor: colors.accentDim }]}>
              <Ionicons name="sparkles" size={12} color={colors.accent} />
              <Text style={[styles.dailyBadgeText, { color: colors.accent }]}>{t("TODAY'S WORD")}</Text>
            </View>
            <View style={[styles.tierBadge, { backgroundColor: colors.accentDim }]}>
              <Text style={[styles.tierText, { color: colors.accent }]}>
                {t(TIER_LABELS[dailyWord.tier])}
              </Text>
            </View>
          </View>

          <View style={styles.dailyBody}>
            <ArabicText size={34} align="center" style={styles.dailyArabic}>
              {dailyWord.arabic}
            </ArabicText>
            <Text style={[styles.dailyTranslit, { color: colors.textSecondary }]}>
              {dailyWord.transliteration}
            </Text>
            <Text style={[styles.dailyMeaning, { color: colors.textPrimary }]}>
              &quot;{t(dailyWord.meaning)}&quot;
            </Text>
            <Text style={[styles.dailyRef, { color: colors.textMuted }]}>
              Quran {dailyWord.ref}
            </Text>
          </View>

          <View style={styles.dailyFooter}>
            <TouchableOpacity
              onPress={() => {
                setTierFilter(null);
                const foundIdx = VOCAB_WORDS.findIndex((w) => w.arabic === dailyWord.arabic);
                if (foundIdx >= 0) {
                  setIndex(foundIdx);
                  setRevealed(false);
                }
              }}
              style={[
                styles.dailyActionBtn,
                { backgroundColor: colors.bgBase, borderColor: colors.borderSubtle },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Practice ${dailyWord.transliteration} in flashcards`}
            >
              <Ionicons name="school-outline" size={14} color={colors.accent} />
              <Text style={[styles.dailyActionBtnText, { color: colors.accent }]}>
                {t('Practice in Trainer')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={async () => {
                const isK = !!known[dailyWord.arabic];
                const nextK = { ...known, [dailyWord.arabic]: !isK };
                setKnown(nextK);
                await persist(nextK, index);
              }}
              style={[
                styles.dailyActionBtn,
                {
                  backgroundColor: known[dailyWord.arabic] ? colors.accentDim : colors.bgBase,
                  borderColor: known[dailyWord.arabic] ? colors.accent : colors.borderSubtle,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={known[dailyWord.arabic] ? t('Mark as unlearned') : t('Mark as known')}
            >
              <Ionicons
                name={known[dailyWord.arabic] ? 'checkmark-circle' : 'checkmark-circle-outline'}
                size={14}
                color={known[dailyWord.arabic] ? colors.accent : colors.textMuted}
              />
              <Text
                style={[
                  styles.dailyActionBtnText,
                  { color: known[dailyWord.arabic] ? colors.accent : colors.textSecondary },
                ]}
              >
                {known[dailyWord.arabic] ? t('Learned ✓') : t('Mark Known')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tier filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.filterRow, hScrollRTLStyle()]}>
          {[
            { id: null, label: t('All') },
            { id: 'daily' as const, label: t("Today's Set") },
            { id: 1, label: t(TIER_LABELS[1]) },
            { id: 2, label: t(TIER_LABELS[2]) },
            { id: 3, label: t(TIER_LABELS[3]) },
          ].map((item) => (
            <TouchableOpacity
              key={String(item.id)}
              onPress={() => {
                setTierFilter(item.id);
                setIndex(0);
                setRevealed(false);
              }}
              style={[
                styles.filterChip,
                {
                  backgroundColor: tierFilter === item.id ? colors.accent : colors.bgSurface,
                  borderColor: tierFilter === item.id ? colors.accent : colors.borderSubtle,
                },
              ]}
              accessibilityRole="button"
            >
              <Text
                style={[
                  styles.filterText,
                  { color: tierFilter === item.id ? '#FFF' : colors.textSecondary },
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Flashcard */}
        {current ? (
          <TouchableOpacity
            onPress={() => setRevealed((r) => !r)}
            activeOpacity={0.92}
            style={[styles.card, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }]}
            accessibilityRole="button"
            accessibilityLabel={`Vocabulary card ${index + 1} of ${words.length}. Tap to flip.`}
          >
            <View style={styles.cardTopRow}>
              <Text style={[styles.cardCount, { color: colors.textMuted }]}>
                {index + 1} / {words.length}
              </Text>
              <View style={[styles.tierBadge, { backgroundColor: colors.accentDim }]}>
                <Text style={[styles.tierText, { color: colors.accent }]}>{t(TIER_LABELS[current.tier])}</Text>
              </View>
            </View>

            {!revealed ? (
              <View style={styles.cardFace}>
                <ArabicText size={44} align="center" style={styles.cardArabic}>
                  {current.arabic}
                </ArabicText>
                <Text style={[styles.cardHint, { color: colors.textMuted }]}>
                  {t('Tap to reveal meaning')}
                </Text>
              </View>
            ) : (
              <View style={styles.cardFace}>
                <ArabicText size={30} align="center" style={styles.cardArabic}>
                  {current.arabic}
                </ArabicText>
                <Text style={[styles.cardTranslit, { color: colors.textSecondary }]}>
                  {current.transliteration}
                </Text>
                <View style={[styles.meaningRule, { backgroundColor: colors.accent }]} />
                <Text style={[styles.cardMeaning, { color: colors.textPrimary }]}>
                  {t(current.meaning)}
                </Text>
                <Text style={[styles.cardRef, { color: colors.textMuted }]}>
                  Quran {current.ref}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ) : null}

        {/* Controls */}
        <View style={styles.controlsRow}>
          <TouchableOpacity
            style={[styles.ctrlBtn, { borderColor: colors.borderSubtle }]}
            onPress={prev}
            accessibilityRole="button"
            accessibilityLabel={t('Previous word')}
          >
            <Ionicons name="chevron-back" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.knowBtn, { backgroundColor: colors.accent }]}
            onPress={markKnown}
            accessibilityRole="button"
            accessibilityLabel={t('Mark this word as known')}
          >
            <Ionicons name="checkmark" size={18} color="#FFF" />
            <Text style={styles.knowBtnText}>{t('I know this')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.ctrlBtn, { borderColor: colors.borderSubtle }]}
            onPress={next}
            accessibilityRole="button"
            accessibilityLabel={t('Next word')}
          >
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <Text style={[styles.sessionHint, { color: colors.textMuted }]}>
          {sessionKnown} {t('marked known this session')}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
    borderWidth: 1,
  },
  statText: { fontFamily: 'Manrope_500Medium', fontSize: 12 },
  filterRow: { gap: 8, marginBottom: 18 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 8,
  },
  filterText: { fontFamily: 'Manrope_600SemiBold', fontSize: 12 },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 22,
    minHeight: 240,
    justifyContent: 'center',
  },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardCount: { fontFamily: 'Manrope_400Regular', fontSize: 12 },
  tierBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  tierText: { fontFamily: 'Manrope_600SemiBold', fontSize: 10, letterSpacing: 0.3 },
  cardFace: { alignItems: 'center', paddingVertical: 12 },
  cardArabic: { marginBottom: 12 },
  cardHint: { fontFamily: 'Manrope_400Regular', fontSize: 12, marginTop: 8 },
  cardTranslit: { fontFamily: 'Manrope_500Medium', fontSize: 16, marginBottom: 12, fontStyle: 'italic' },
  meaningRule: { height: 2, width: 44, borderRadius: 1, marginBottom: 14 },
  cardMeaning: { fontFamily: 'Manrope_600SemiBold', fontSize: 20, textAlign: 'center', marginBottom: 10 },
  cardRef: { fontFamily: 'Manrope_400Regular', fontSize: 12 },
  controlsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14, marginTop: 20 },
  ctrlBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  knowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 46,
    paddingHorizontal: 22,
    borderRadius: 23,
  },
  knowBtnText: { fontFamily: 'Manrope_600SemiBold', fontSize: 14, color: '#FFF' },
  sessionHint: { fontFamily: 'Manrope_400Regular', fontSize: 12, textAlign: 'center', marginTop: 14 },
  dailyCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    marginBottom: 16,
  },
  dailyTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  dailyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  dailyBadgeText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 10,
    letterSpacing: 0.8,
  },
  dailyBody: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  dailyArabic: {
    marginBottom: 6,
  },
  dailyTranslit: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 15,
    fontStyle: 'italic',
    marginBottom: 4,
  },
  dailyMeaning: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 17,
    textAlign: 'center',
    marginBottom: 6,
  },
  dailyRef: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
  },
  dailyFooter: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
    justifyContent: 'center',
  },
  dailyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    borderWidth: 1,
  },
  dailyActionBtnText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
  },
});
