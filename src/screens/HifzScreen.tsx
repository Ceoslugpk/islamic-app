import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  View,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  BackHandler,
  Platform,
} from 'react-native';
import { AppText } from '../components/ui/AppText';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useThemeTokens, cardTokens } from '../theme/tokens';
import { getCardShadow, getHeroCardShadow, getPillShadow } from '../lib/homeThemeTokens';
import { t, isRTL } from '../lib/i18n';
import { SubHeader } from '../components/layout/SubHeader';
import { DetailScreen } from '../components/layout/DetailScreen';
import { ArabicText } from '../components/ArabicText';
import { SURAHS_114, SurahSummary } from '../lib/surahs114';
import { HifzStatus, saveHifzStatus, loadHifzStatuses } from '../lib/db';
import { EmptyState } from '../components/EmptyState';
import { HifzPracticeScreen } from './HifzPracticeScreen';

type FilterTab = 'All' | 'Memorized' | 'Revising' | 'Not started';

const FILTER_TABS: FilterTab[] = ['All', 'Memorized', 'Revising', 'Not started'];

const NEXT_STATUS: Record<HifzStatus, HifzStatus> = {
  'not-started': 'revising',
  'revising': 'memorized',
  'memorized': 'not-started',
};

export default function HifzScreen({ onBack }: { onBack?: () => void }) {
  const { tokens, mode } = useThemeTokens();
  const isRtl = isRTL();
  const { width } = useWindowDimensions();
  const isCompact = width < 380;
  const paddingH = isCompact ? 14 : 20;

  const [statuses, setStatuses] = useState<Record<number, HifzStatus>>(() => loadHifzStatuses());
  const [activeFilter, setActiveFilter] = useState<FilterTab>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [practiceSurah, setPracticeSurah] = useState<number | null>(null);

  // Return from practice sub-screen on Android hardware back
  useEffect(() => {
    if (practiceSurah === null) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setPracticeSurah(null);
      return true;
    });
    return () => sub.remove();
  }, [practiceSurah]);

  const handleCycleStatus = useCallback(async (surahNumber: number) => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // ignore
    }

    const current = statuses[surahNumber] || 'not-started';
    const next = NEXT_STATUS[current];

    setStatuses((prev) => ({
      ...prev,
      [surahNumber]: next,
    }));
    saveHifzStatus(surahNumber, next);
  }, [statuses]);

  // Statistics
  const stats = useMemo(() => {
    let memorized = 0;
    let revising = 0;
    let notStarted = 0;

    for (const surah of SURAHS_114) {
      const s = statuses[surah.number] || 'not-started';
      if (s === 'memorized') memorized++;
      else if (s === 'revising') revising++;
      else notStarted++;
    }

    const percent = Math.round((memorized / 114) * 100);
    return { memorized, revising, notStarted, percent };
  }, [statuses]);

  const filteredSurahs = useMemo(() => {
    let list = SURAHS_114;

    if (activeFilter === 'Memorized') {
      list = list.filter((s) => (statuses[s.number] || 'not-started') === 'memorized');
    } else if (activeFilter === 'Revising') {
      list = list.filter((s) => (statuses[s.number] || 'not-started') === 'revising');
    } else if (activeFilter === 'Not started') {
      list = list.filter((s) => (statuses[s.number] || 'not-started') === 'not-started');
    }

    const q = searchQuery.trim().toLowerCase();
    if (!q) return list;

    return list.filter(
      (s) =>
        s.englishName.toLowerCase().includes(q) ||
        s.name.includes(q) ||
        s.number.toString() === q
    );
  }, [activeFilter, searchQuery, statuses]);

  const renderStatusBadge = (status: HifzStatus) => {
    if (status === 'memorized') {
      return (
        <View
          style={[
            styles.badge,
            getPillShadow(mode),
            {
              backgroundColor: tokens.gold,
              borderColor: tokens.goldBorder,
            },
          ]}
        >
          <Ionicons name="checkmark-circle" size={13} color={tokens.onGold} style={{ marginEnd: 4 }} />
          <AppText variant="eyebrow" tone="onGold" style={styles.badgeText}>{t('Memorized')}</AppText>
        </View>
      );
    }
    if (status === 'revising') {
      return (
        <View
          style={[
            styles.badge,
            getPillShadow(mode),
            {
              backgroundColor: tokens.ringFill,
              borderColor: tokens.ringBorder,
            },
          ]}
        >
          <Ionicons name="sync-outline" size={13} color={tokens.goldText} style={{ marginEnd: 4 }} />
          <AppText variant="eyebrow" highlight style={styles.badgeText}>{t('Revising')}</AppText>
        </View>
      );
    }
    return (
      <View
        style={[
          styles.badge,
          {
            backgroundColor: tokens.ringFill,
            borderColor: tokens.cardBorder,
          },
        ]}
      >
        <AppText variant="eyebrow" tone="faint" style={styles.badgeText}>{t('Not started')}</AppText>
      </View>
    );
  };

  const renderSurah = ({ item }: { item: SurahSummary }) => {
    const status = statuses[item.number] || 'not-started';
    const statusLabel = status === 'memorized' ? t('Memorized') : status === 'revising' ? t('Revising') : t('Not started');

    return (
      <TouchableOpacity
        style={[
          styles.rowCard,
          getCardShadow(mode),
          {
            backgroundColor: tokens.cardTop,
            borderColor: tokens.cardBorder,
          },
        ]}
        onPress={() => handleCycleStatus(item.number)}
        accessibilityRole="button"
        accessibilityLabel={`${t('Surah')} ${item.number} ${item.englishName}. ${t('Status')}: ${statusLabel}. ${t('Tap to cycle')}.`}
      >
        <View
          style={[
            styles.numberBox,
            getPillShadow(mode),
            {
              backgroundColor: tokens.ringFill,
              borderColor: tokens.ringBorder,
            },
          ]}
        >
          <AppText variant="numeral" highlight style={styles.numberText}>
            {item.number}
          </AppText>
        </View>

        <View style={styles.midCol}>
          <View style={styles.nameRow}>
            <AppText variant="rowTitle" style={styles.englishName}>
              {item.englishName}
            </AppText>
            <ArabicText size={20} align="right" style={[styles.arabicName, { color: tokens.arabicName }]}>
              {item.name}
            </ArabicText>
          </View>
          <AppText variant="caption" tone="faint" style={styles.ayahCount}>
            {item.numberOfAyahs} {t('ayahs')} · {t(item.revelationType)}
          </AppText>
          <View style={styles.rowActions}>
            {renderStatusBadge(status)}
            <TouchableOpacity
              onPress={() => setPracticeSurah(item.number)}
              style={[
                styles.practiceBtn,
                getPillShadow(mode),
                { backgroundColor: tokens.ringFill, borderColor: tokens.goldBorder },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`${t('Practice')} ${item.englishName}`}
            >
              <Ionicons name="eye-outline" size={12} color={tokens.goldText} />
              <AppText variant="caption" highlight style={styles.practiceText}>{t('Practice')}</AppText>
            </TouchableOpacity>
          </View>
          <AppText variant="caption" tone="faint" style={styles.tapHint}>
            {t('Tap to cycle')}
          </AppText>
        </View>
      </TouchableOpacity>
    );
  };

  if (practiceSurah !== null) {
    return (
      <HifzPracticeScreen
        surahNumber={practiceSurah}
        onBack={() => setPracticeSurah(null)}
      />
    );
  }

  return (
    <DetailScreen
      style={[styles.container, { backgroundColor: tokens.bgTop }]}
      header={
        <SubHeader
          eyebrow={t('Memorization')}
          title={t('Hifz Tracker')}
          subtitle={t('Track memorization progress, revisions, and test recall')}
          onBack={onBack}
          backLabel={t('Quran')}
          borderBottom
          showFade
        />
      }
    >
      <View style={styles.contentWrap}>
        {/* Summary Scorecard */}
        <View style={{ paddingHorizontal: paddingH, paddingTop: 12 }}>
          <View
            style={[
              styles.summaryCard,
              getHeroCardShadow(mode),
              {
                backgroundColor: tokens.cardTop,
                borderColor: tokens.cardBorder,
              },
            ]}
          >
            <View style={styles.statCol}>
              <AppText variant="numeral" highlight style={styles.statValue}>
                {stats.memorized}
              </AppText>
              <AppText variant="eyebrow" tone="faint" style={styles.statLabel}>
                {t('MEMORIZED')}
              </AppText>
            </View>

            <View style={[styles.statDivider, { backgroundColor: tokens.cardBorder }]} />

            <View style={styles.statCol}>
              <AppText variant="numeral" style={styles.statValue}>
                {stats.revising}
              </AppText>
              <AppText variant="eyebrow" tone="faint" style={styles.statLabel}>
                {t('REVISING')}
              </AppText>
            </View>

            <View style={[styles.statDivider, { backgroundColor: tokens.cardBorder }]} />

            <View style={styles.statCol}>
              <AppText variant="numeral" tone="faint" style={styles.statValue}>
                {stats.notStarted}
              </AppText>
              <AppText variant="eyebrow" tone="faint" style={styles.statLabel}>
                {t('NOT STARTED')}
              </AppText>
            </View>
          </View>
        </View>

        {/* Search Input */}
        <View style={{ paddingHorizontal: paddingH }}>
          <View
            style={[
              styles.searchBox,
              getPillShadow(mode),
              {
                backgroundColor: tokens.cardTop,
                borderColor: tokens.cardBorder,
              },
            ]}
          >
            <Ionicons name="search" size={16} color={tokens.muted} style={styles.searchIcon} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={t('Search surahs by name or number...')}
              placeholderTextColor={tokens.muted}
              accessibilityLabel={t('Search surahs by name or number...')}
              style={[
                styles.searchInput,
                {
                  color: tokens.text,
                  textAlign: isRtl ? 'right' : 'left',
                  writingDirection: isRtl ? 'rtl' : 'ltr',
                },
                Platform.OS === 'web' && ({ outlineStyle: 'none' } as any),
              ]}
              autoCapitalize="none"
              autoCorrect={false}
              clearButtonMode="while-editing"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close-circle" size={16} color={tokens.muted} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Filter Tabs */}
        <View style={[styles.filterRow, { paddingHorizontal: paddingH }]}>
          {FILTER_TABS.map((tab) => {
            const isSelected = tab === activeFilter;
            return (
              <TouchableOpacity
                key={tab}
                style={[
                  styles.filterTab,
                  getPillShadow(mode),
                  {
                    backgroundColor: isSelected ? tokens.gold : tokens.ringFill,
                    borderColor: isSelected ? tokens.goldBorder : tokens.ringBorder,
                  },
                ]}
                onPress={() => setActiveFilter(tab)}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
              >
                <AppText
                  variant="caption"
                  tone={isSelected ? 'onGold' : 'faint'}
                  style={styles.filterTabText}
                >
                  {t(tab)}
                </AppText>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Surahs List */}
        <DetailScreen.FlatList
          data={filteredSurahs}
          keyExtractor={(item) => item.number.toString()}
          renderItem={renderSurah}
          showsVerticalScrollIndicator={false}
          style={{ flex: 1 }}
          contentContainerStyle={[
            styles.listContent,
            {
              paddingHorizontal: paddingH,
            },
          ]}
          ListEmptyComponent={
            <EmptyState
              icon="search-outline"
              title={t('No surahs found')}
              subtitle={
                searchQuery
                  ? `${t('Nothing matches')} "${searchQuery}". ${t('Try a different name or number.')}`
                  : t('Nothing in this category yet — tap a surah to start memorizing.')
              }
              actionLabel={t('Clear filters')}
              onAction={() => {
                setActiveFilter('All');
                setSearchQuery('');
              }}
            />
          }
        />
      </View>
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
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: cardTokens.borderWidth,
    borderRadius: 20,
    paddingVertical: 14,
    marginBottom: 10,
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
    minWidth: 0,
  },
  statValue: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 24,
  },
  statLabel: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 9.5,
    letterSpacing: 0.6,
    marginTop: 2,
    paddingVertical: 2,
  },
  statDivider: {
    width: 1,
    height: '60%',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: cardTokens.borderWidth,
    borderRadius: 22,
    paddingHorizontal: 14,
    minHeight: 44,
    marginBottom: 8,
  },
  searchIcon: {
    marginEnd: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
    paddingVertical: 0,
    minWidth: 0,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  filterTab: {
    flex: 1,
    minHeight: 44,
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: 14,
    borderWidth: cardTokens.borderWidth,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 68,
  },
  filterTabText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
    paddingVertical: 2,
  },
  headerWrap: {
    paddingTop: 4,
    paddingBottom: 4,
  },
  listContent: {
    paddingTop: 8,
    gap: 10,
  },
  rowCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    borderRadius: 18,
    borderWidth: cardTokens.borderWidth,
    gap: 12,
    minHeight: 44,
  },
  numberBox: {
    minWidth: 36,
    minHeight: 36,
    borderRadius: 18,
    borderWidth: cardTokens.borderWidth,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    paddingHorizontal: 4,
  },
  numberText: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 18,
  },
  midCol: {
    flex: 1,
    minWidth: 0,
  },
  nameRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  englishName: {
    flexShrink: 1,
    minWidth: 100,
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 15,
  },
  ayahCount: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    minHeight: 22,
    borderRadius: 12,
    borderWidth: cardTokens.borderWidth,
  },
  badgeText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    paddingVertical: 2,
  },
  arabicName: { flexShrink: 1 },
  tapHint: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    marginTop: 2,
    paddingVertical: 2,
  },
  rowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 4,
    rowGap: 4,
    marginTop: 4,
  },
  practiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minHeight: 44,
    borderRadius: 14,
    borderWidth: cardTokens.borderWidth,
  },
  practiceText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
    paddingVertical: 2,
  },
});
