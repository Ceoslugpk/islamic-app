import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  AppState,
  useWindowDimensions,
} from 'react-native';
import { AppText } from '../components/ui/AppText';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { useThemeTokens, cardTokens } from '../theme/tokens';
import { getPillShadow } from '../lib/homeThemeTokens';
import { SubHeader } from '../components/layout/SubHeader';
import { DetailScreen } from '../components/layout/DetailScreen';
import { PremiumCard } from '../components/ui';
import { ArabicText } from '../components/ArabicText';
import { VOCAB_WORDS, VocabWord, TIER_LABELS, getDailyWord, getDailyWords } from '../lib/vocab';
import { getLocalDateKey } from '../lib/dateKey';
import { hScrollRTLStyle } from '../lib/rtl';
import { getBackIcon, getForwardIcon } from '../lib/iconMap';

const PROGRESS_KEY = 'vocab-trainer-progress-v1';

/**
 * Reactively track the local calendar day. The screen can stay mounted across
 * midnight (the app keeps tab panes mounted), so a value captured once on mount
 * would freeze "Today's Word" on yesterday. Re-derive at local midnight and on
 * foreground resume.
 */
function useTodayKey(): string {
  const [todayKey, setTodayKey] = useState(() => getLocalDateKey());

  useEffect(() => {
    let midnightTimer: ReturnType<typeof setTimeout> | null = null;

    const refresh = () => {
      const next = getLocalDateKey();
      setTodayKey((previous) => (previous === next ? previous : next));
    };

    const schedule = () => {
      if (midnightTimer !== null) clearTimeout(midnightTimer);
      const now = new Date();
      const nextMidnight = new Date(now);
      nextMidnight.setHours(24, 0, 0, 0);
      midnightTimer = setTimeout(() => {
        refresh();
        schedule();
      }, Math.max(1, nextMidnight.getTime() - now.getTime()));
    };

    schedule();
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') refresh();
    });

    return () => {
      subscription.remove();
      if (midnightTimer !== null) clearTimeout(midnightTimer);
    };
  }, []);

  return todayKey;
}

interface Progress {
  known: Record<string, boolean>; // arabic -> known
  lastIndex: number;
}

interface Props {
  onBack: () => void;
  backLabel?: string;
}

export function VocabTrainerScreen({ onBack, backLabel }: Props) {
  const { t } = useTranslation();
  const { tokens, mode } = useThemeTokens();
  const { width } = useWindowDimensions();
  const isCompact = width < 380;
  const paddingH = isCompact ? 14 : 20;

  const [known, setKnown] = useState<Record<string, boolean>>({});
  const [revealed, setRevealed] = useState(false);
  const [index, setIndex] = useState(0);
  const [tierFilter, setTierFilter] = useState<number | 'daily' | null>(null);
  const [sessionKnown, setSessionKnown] = useState(0);

  const todayKey = useTodayKey();
  const dailyWord = useMemo(() => getDailyWord(new Date(`${todayKey}T12:00:00`)), [todayKey]);
  const dailyWords = useMemo(() => getDailyWords(5, new Date(`${todayKey}T12:00:00`)), [todayKey]);

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
    <DetailScreen
      style={{ backgroundColor: tokens.bgTop }}
      header={
        <SubHeader
          title={t('Quran Vocabulary')}
          subtitle={t('Most frequent words of the Quran')}
          eyebrow={t('Learn')}
          backLabel={backLabel ? t(backLabel) : t('Library')}
          onBack={onBack}
          borderBottom
          showFade
        />
      }
    >
      <DetailScreen.ScrollView
        style={[styles.contentWrap, { flex: 1 }]}
        contentContainerStyle={[
          styles.content,
          { paddingHorizontal: paddingH },
        ]}
      >
          {/* Progress */}
          <View style={styles.statsRow}>
            <View
              style={[
                styles.statChip,
                getPillShadow(mode),
                {
                  backgroundColor: tokens.ringFill,
                  borderColor: tokens.ringBorder,
                },
              ]}
            >
              <Ionicons name="checkmark-circle" size={14} color={tokens.goldText} />
              <AppText variant="caption" style={styles.statText}>
                {knownCount}/{VOCAB_WORDS.length} {t('known')}
              </AppText>
            </View>
            <View
              style={[
                styles.statChip,
                getPillShadow(mode),
                {
                  backgroundColor: tokens.ringFill,
                  borderColor: tokens.ringBorder,
                },
              ]}
            >
              <Ionicons name="trending-up" size={14} color={tokens.goldText} />
              <AppText variant="caption" style={styles.statText}>{progressPercent}%</AppText>
            </View>
          </View>

          {/* Today's Word Card (Prominently featured Quranic word of the day) */}
          <PremiumCard
            padded={false}
            style={styles.dailyCard}
            contentStyle={styles.dailyCardContent}
          >
            <View style={styles.dailyTopRow}>
              <View
                style={[
                  styles.dailyBadge,
                  getPillShadow(mode),
                  {
                    backgroundColor: tokens.ringFill,
                    borderColor: tokens.ringBorder,
                    borderWidth: cardTokens.borderWidth,
                  },
                ]}
              >
                <Ionicons name="sparkles" size={12} color={tokens.goldText} />
                <AppText variant="eyebrow" highlight style={styles.dailyBadgeText}>{t("TODAY'S WORD")}</AppText>
              </View>
              <View
                style={[
                  styles.tierBadge,
                  getPillShadow(mode),
                  {
                    backgroundColor: tokens.ringFill,
                    borderColor: tokens.ringBorder,
                    borderWidth: cardTokens.borderWidth,
                  },
                ]}
              >
                <AppText variant="eyebrow" highlight style={styles.tierText}>
                  {t(TIER_LABELS[dailyWord.tier])}
                </AppText>
              </View>
            </View>

            <View style={styles.dailyBody}>
              <ArabicText size={34} align="center" style={[styles.dailyArabic, { color: tokens.arabicName }]}>
                {dailyWord.arabic}
              </ArabicText>
              <AppText variant="body" tone="faint" style={styles.dailyTranslit}>
                {dailyWord.transliteration}
              </AppText>
              <AppText variant="sectionTitle" style={styles.dailyMeaning}>
                &quot;{t(dailyWord.meaning)}&quot;
              </AppText>
              <AppText variant="caption" tone="faint" style={styles.dailyRef}>
                {t('Quran')} {dailyWord.ref}
              </AppText>
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
                  getPillShadow(mode),
                  {
                    backgroundColor: tokens.ringFill,
                    borderColor: tokens.ringBorder,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`${t('Practice')} ${dailyWord.transliteration} ${t('in flashcards')}`}
              >
                <Ionicons name="school-outline" size={14} color={tokens.goldText} />
                <AppText variant="link" style={styles.dailyActionBtnText}>
                  {t('Practice in Trainer')}
                </AppText>
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
                  getPillShadow(mode),
                  {
                    backgroundColor: known[dailyWord.arabic] ? tokens.gold : tokens.ringFill,
                    borderColor: known[dailyWord.arabic] ? tokens.goldBorder : tokens.ringBorder,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel={known[dailyWord.arabic] ? t('Mark as unlearned') : t('Mark as known')}
              >
                <Ionicons
                  name={known[dailyWord.arabic] ? 'checkmark-circle' : 'checkmark-circle-outline'}
                  size={14}
                  color={known[dailyWord.arabic] ? tokens.onGold : tokens.goldText}
                />
                <AppText
                  variant="link"
                  tone={known[dailyWord.arabic] ? 'onGold' : undefined}
                  style={styles.dailyActionBtnText}
                >
                  {known[dailyWord.arabic] ? t('Learned ✓') : t('Mark Known')}
                </AppText>
              </TouchableOpacity>
            </View>
          </PremiumCard>

          {/* Tier filter */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={[styles.filterRow, hScrollRTLStyle()]}>
            {[
              { id: null, label: t('All') },
              { id: 'daily' as const, label: t("Today's Set") },
              { id: 1, label: t(TIER_LABELS[1]) },
              { id: 2, label: t(TIER_LABELS[2]) },
              { id: 3, label: t(TIER_LABELS[3]) },
            ].map((item) => {
              const isSelected = tierFilter === item.id;
              return (
                <TouchableOpacity
                  key={String(item.id)}
                  onPress={() => {
                    setTierFilter(item.id);
                    setIndex(0);
                    setRevealed(false);
                  }}
                  style={[
                    styles.filterChip,
                    getPillShadow(mode),
                    {
                      backgroundColor: isSelected ? tokens.gold : tokens.cardTop,
                      borderColor: isSelected ? tokens.goldBorder : tokens.cardBorder,
                    },
                  ]}
                  accessibilityRole="button"
                >
                  <AppText
                    variant="caption"
                    tone={isSelected ? 'onGold' : 'faint'}
                    style={styles.filterText}
                  >
                    {item.label}
                  </AppText>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Flashcard */}
          {current ? (
            <PremiumCard
              onPress={() => setRevealed((r) => !r)}
              activeOpacity={0.92}
              padded={false}
              style={styles.card}
              contentStyle={styles.cardContent}
              accessibilityRole="button"
              accessibilityLabel={`${t('Vocabulary card')} ${index + 1} ${t('of')} ${words.length}. ${t('Tap to flip.')}`}
            >
              <View style={styles.cardTopRow}>
                <AppText variant="caption" tone="faint" style={styles.cardCount}>
                  {index + 1} / {words.length}
                </AppText>
                <View
                  style={[
                    styles.tierBadge,
                    getPillShadow(mode),
                    {
                      backgroundColor: tokens.ringFill,
                      borderColor: tokens.ringBorder,
                      borderWidth: cardTokens.borderWidth,
                    },
                  ]}
                >
                  <AppText variant="eyebrow" highlight style={styles.tierText}>{t(TIER_LABELS[current.tier])}</AppText>
                </View>
              </View>

              {!revealed ? (
                <View style={styles.cardFace}>
                  <ArabicText size={44} align="center" style={[styles.cardArabic, { color: tokens.arabicName }]}>
                    {current.arabic}
                  </ArabicText>
                  <AppText variant="caption" tone="faint" style={styles.cardHint}>
                    {t('Tap to reveal meaning')}
                  </AppText>
                </View>
              ) : (
                <View style={styles.cardFace}>
                  <ArabicText size={30} align="center" style={[styles.cardArabic, { color: tokens.arabicName }]}>
                    {current.arabic}
                  </ArabicText>
                  <AppText variant="body" tone="faint" style={styles.cardTranslit}>
                    {current.transliteration}
                  </AppText>
                  <View style={[styles.meaningRule, { backgroundColor: tokens.goldBorder }]} />
                  <AppText variant="title" style={styles.cardMeaning}>
                    {t(current.meaning)}
                  </AppText>
                  <AppText variant="caption" tone="faint" style={styles.cardRef}>
                    {t('Quran')} {current.ref}
                  </AppText>
                </View>
              )}
            </PremiumCard>
          ) : null}

          {/* Controls */}
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
              onPress={prev}
              accessibilityRole="button"
              accessibilityLabel={t('Previous word')}
            >
              <Ionicons name={getBackIcon()} size={20} color={tokens.text} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.knowBtn,
                getPillShadow(mode),
                {
                  backgroundColor: tokens.gold,
                  borderColor: tokens.goldBorder,
                },
              ]}
              onPress={markKnown}
              accessibilityRole="button"
              accessibilityLabel={t('Mark this word as known')}
            >
              <Ionicons name="checkmark" size={18} color={tokens.onGold} />
              <AppText variant="rowTitle" tone="onGold" style={styles.knowBtnText}>{t('I know this')}</AppText>
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
              onPress={next}
              accessibilityRole="button"
              accessibilityLabel={t('Next word')}
            >
              <Ionicons name={getForwardIcon()} size={20} color={tokens.text} />
            </TouchableOpacity>
          </View>

          <AppText variant="caption" tone="faint" style={styles.sessionHint}>
            {sessionKnown} {t('marked known this session')}
          </AppText>
        </DetailScreen.ScrollView>
    </DetailScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minWidth: 0,
  },
  contentWrap: {
    flex: 1,
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
    minWidth: 0,
  },
  headerWrap: {
  },
  content: {
  },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
    borderWidth: cardTokens.borderWidth,
  },
  statText: { fontFamily: 'Manrope_500Medium', fontSize: 12 },
  filterRow: { gap: 8, marginBottom: 18 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: cardTokens.borderWidth,
    marginEnd: 8,
    minHeight: 44,
  },
  filterText: { fontFamily: 'Manrope_600SemiBold', fontSize: 12 },
  card: {
    borderRadius: 20,
    minHeight: 240,
  },
  cardContent: {
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
    borderWidth: cardTokens.borderWidth,
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
    borderWidth: cardTokens.borderWidth,
  },
  knowBtnText: { fontFamily: 'Manrope_600SemiBold', fontSize: 14 },
  sessionHint: { fontFamily: 'Manrope_400Regular', fontSize: 12, textAlign: 'center', marginTop: 14 },
  dailyCard: {
    borderRadius: 20,
    marginBottom: 16,
  },
  dailyCardContent: {
    padding: 18,
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
    flexWrap: 'wrap',
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
    minHeight: 44,
  },
  dailyActionBtnText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
  },
});
