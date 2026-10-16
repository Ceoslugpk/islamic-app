import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useThemeTokens } from '../theme/tokens';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getCardShadow, getPillShadow } from '../lib/homeThemeTokens';
import { TAB_PAD_BOTTOM } from '../components/layout/layout.constants';
import { iconSizes, getForwardIcon } from '../lib/iconMap';
import { fetchSurahList, fetchSurahListForLanguage, SurahMeta } from '../lib/quran';
import { ArabicText } from '../components/ArabicText';
import { SubHeader } from '../components/layout/SubHeader';
import { DetailScreen } from '../components/layout/DetailScreen';
import { SectionHeader } from '../components/SectionHeader';
import { Hairline } from '../components/Hairline';
import { useQuranLanguage } from '../lib/quranLanguageState';
import { QuranLanguageModal } from '../components/QuranLanguageModal';
import { getLocalizedTranslatorName } from '../lib/quranLanguages';
import { getLocalizedLanguageName } from '../lib/surahNamesLocalized';
import { useConnectivity } from '../lib/useConnectivity';
import { SurahSkeleton, Skeleton } from '../components/Skeleton';
import { hScrollRTLStyle } from '../lib/rtl';


interface QuranScreenProps {
  onOpenSurah: (n: number) => void;
  onBack?: () => void;
}

const JUZ_LIST = Array.from({ length: 30 }, (_, i) => i + 1);

const JUZ_START_SURAH: Record<number, number> = {
  1: 1, 2: 2, 3: 2, 4: 3, 5: 4, 6: 4, 7: 5, 8: 6, 9: 7, 10: 8,
  11: 9, 12: 11, 13: 12, 14: 15, 15: 17, 16: 18, 17: 21, 18: 23, 19: 25, 20: 27,
  21: 29, 22: 33, 23: 36, 24: 39, 25: 41, 26: 46, 27: 51, 28: 58, 29: 67, 30: 78,
};

const REVELATION_OPTIONS = [
  { value: null, label: 'All' },
  { value: 'Meccan' as const, label: 'Meccan' },
  { value: 'Medinan' as const, label: 'Medinan' },
] as const;

export default function QuranScreen({ onOpenSurah, onBack }: QuranScreenProps) {
  const { t } = useTranslation();
  const { tokens, mode } = useThemeTokens();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isCompact = width <= 360;
  const isNarrow = width < 380;
  const horizontalPadding = isCompact ? 12 : isNarrow ? 16 : 20;

  const { refreshKey } = useConnectivity();

  const { language, setLanguage, edition, flag } = useQuranLanguage();
  const [langPickerOpen, setLangPickerOpen] = useState(false);
  const [translatedNames, setTranslatedNames] = useState<Record<number, string> | null>(null);

  const [surahs, setSurahs] = useState<SurahMeta[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedJuz, setSelectedJuz] = useState<number | null>(null);
  const [selectedRevelation, setSelectedRevelation] = useState<'Meccan' | 'Medinan' | null>(null);
  const listRef = useRef<FlatList<SurahMeta>>(null);

  const loadSurahs = useCallback(async (force = false) => {
    if (!force) setLoading(true);
    setError(null);
    try {
      const data = await fetchSurahList(force);
      setSurahs(data);
    } catch {
      if (!surahs) {
        setError(t('Could not load the Quran. Check your connection.'));
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [surahs]);

  useEffect(() => {
    loadSurahs();
  }, [loadSurahs]);

  // Auto-refresh when connectivity returns
  useEffect(() => {
    if (refreshKey > 0 && surahs) {
      loadSurahs(true);
    }
  }, [refreshKey, surahs, loadSurahs]);

  // Load per-language surah names when selected language changes
  useEffect(() => {
    let mounted = true;
    if (language === 'en') {
      setTranslatedNames(null);
    } else {
      fetchSurahListForLanguage(language)
        .then((map) => {
          if (mounted) setTranslatedNames(map);
        })
        .catch(() => {
          if (mounted) setTranslatedNames(null);
        });
    }
    return () => {
      mounted = false;
    };
  }, [language]);

  const filteredSurahs = useMemo(() => {
    if (!surahs) return [];
    let result = surahs;

    const query = searchQuery.trim().toLowerCase();
    if (query) {
      result = result.filter((s) => {
        const tr = translatedNames?.[s.number]?.toLowerCase() || '';
        return (
          s.englishName.toLowerCase().includes(query) ||
          s.englishNameTranslation.toLowerCase().includes(query) ||
          tr.includes(query)
        );
      });
    }

    if (selectedJuz !== null) {
      const startSurah = JUZ_START_SURAH[selectedJuz];
      const nextJuz = selectedJuz < 30 ? selectedJuz + 1 : null;
      const endSurah = nextJuz ? JUZ_START_SURAH[nextJuz] - 1 : 114;
      result = result.filter((s) => s.number >= startSurah && s.number <= endSurah);
    }

    if (selectedRevelation !== null) {
      result = result.filter((s) => s.revelationType === selectedRevelation);
    }

    return result;
  }, [surahs, searchQuery, translatedNames, selectedJuz, selectedRevelation]);

  const handleSelectJuz = (j: number) => {
    const nextJuz = selectedJuz === j ? null : j;
    setSelectedJuz(nextJuz);
    if (nextJuz !== null) {
      const targetSurah = JUZ_START_SURAH[nextJuz];
      const index = filteredSurahs.findIndex((s) => s.number === targetSurah);
      if (index >= 0) {
        try {
          listRef.current?.scrollToIndex({ index, animated: true });
        } catch {
          // ignore if unmeasured
        }
      }
    }
  };

  if (loading && !surahs) {
    return (
      <DetailScreen
        style={[styles.wrap, { backgroundColor: tokens.bgBase }]}
        header={
          <SubHeader
            eyebrow={t('The Holy Quran')}
            title={t('Surahs')}
            subtitle={t('All 114 Surahs with translations, audio & verse commentary')}
            onBack={onBack}
            backLabel={t('Quran')}
            borderBottom
          />
        }
      >
        <View style={styles.contentWrap}>
          <View style={[styles.header, { paddingHorizontal: horizontalPadding }]}>
            <View
              style={[
                styles.langBar,
                getCardShadow(mode),
                { backgroundColor: tokens.cardTop, borderColor: tokens.cardBorder },
              ]}
            >
              <View style={styles.langBarLeft}>
                <Text style={[styles.langBarLabel, { color: tokens.goldText }]}>{t('TRANSLATION')}</Text>
                <Skeleton width="60%" height={13} borderRadius={4} />
              </View>
              <Skeleton width={80} height={32} borderRadius={6} />
            </View>
            <View
              style={[
                styles.searchBar,
                getCardShadow(mode),
                { backgroundColor: tokens.cardTop, borderColor: tokens.cardBorder },
              ]}
            >
              <Skeleton width="100%" height={24} borderRadius={8} />
            </View>
            <View style={styles.juzSection}>
              <Skeleton width="40" height={11} borderRadius={4} />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.juzScrollView}
                contentContainerStyle={styles.juzScroll}
              >
                {JUZ_LIST.slice(0, 10).map((j) => (
                  <Skeleton key={j} width={40} height={40} borderRadius={20} />
                ))}
              </ScrollView>
            </View>
          </View>
          <FlatList
            data={Array.from({ length: 15 })}
            keyExtractor={(_, i) => `skeleton-${i}`}
            contentContainerStyle={[
              styles.listContent,
              { paddingHorizontal: horizontalPadding, paddingBottom: TAB_PAD_BOTTOM(insets.bottom) },
            ]}
            ItemSeparatorComponent={() => <Hairline />}
            renderItem={() => <SurahSkeleton compact={isCompact} />}
          />
        </View>
      </DetailScreen>
    );
  }

  if (error && !surahs) {
    return (
      <DetailScreen
        style={[styles.wrap, { backgroundColor: tokens.bgBase }]}
        header={
          <SubHeader
            eyebrow={t('The Holy Quran')}
            title={t('Surahs')}
            subtitle={t('All 114 Surahs with translations, audio & verse commentary')}
            onBack={onBack}
            backLabel={t('Quran')}
            borderBottom
          />
        }
      >
        <View style={styles.center}>
          <View style={styles.contentWrap}>
            <View style={styles.errorInner}>
              <Text style={[styles.errorText, { color: tokens.textSecondary }]}>{error}</Text>
              <TouchableOpacity
                style={[
                  styles.retryBtn,
                  getCardShadow(mode),
                  { borderColor: tokens.cardBorder, backgroundColor: tokens.cardTop },
                ]}
                onPress={() => loadSurahs()}
                accessibilityRole="button"
                accessibilityLabel={t('Retry loading surahs')}
              >
                <Text style={[styles.retryBtnText, { color: tokens.goldText }]}>{t('Retry')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </DetailScreen>
    );
  }

  return (
    <DetailScreen
      style={[styles.wrap, { backgroundColor: tokens.bgTop }]}
      header={
        <SubHeader
          eyebrow={t('The Holy Quran')}
          title={t('Surahs')}
          subtitle={t('All 114 Surahs with translations, audio & verse commentary')}
          onBack={onBack}
          backLabel={t('Quran')}
          borderBottom
        />
      }
    >
      <View style={styles.contentWrap}>
        <View style={{ paddingHorizontal: horizontalPadding }}>
          {/* Translation Language Selector Banner */}
          <View
            style={[
              styles.langBar,
              getCardShadow(mode),
              { backgroundColor: tokens.cardTop, borderColor: tokens.cardBorder },
            ]}
          >
            <View style={styles.langBarLeft}>
              <Text style={[styles.langBarLabel, { color: tokens.goldText }]}>{t('TRANSLATION')}</Text>
              <Text style={[styles.langBarTitle, { color: tokens.textPrimary }]} numberOfLines={1}>
                {flag} {getLocalizedLanguageName(edition.language)} <Text style={{ color: tokens.textSecondary, fontSize: 12 }}>· {getLocalizedTranslatorName(edition.editionIdentifier, edition.name)}</Text>
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.langChangeBtn,
                { backgroundColor: tokens.ringFill, borderColor: tokens.ringBorder },
              ]}
              onPress={() => setLangPickerOpen(true)}
              accessibilityRole="button"
              accessibilityLabel={t('Change translation language')}
            >
              <Text style={[styles.langChangeBtnText, { color: tokens.goldText }]}>{t('Change')}</Text>
              <Ionicons name={getForwardIcon()} size={12} color={tokens.goldText} />
            </TouchableOpacity>
          </View>

          {/* Search input */}
          <View
            style={[
              styles.searchBar,
              getCardShadow(mode),
              {
                backgroundColor: tokens.cardTop,
                borderColor: tokens.cardBorder,
              },
            ]}
          >
            <TextInput
              style={[
                styles.searchInput,
                { color: tokens.textPrimary, fontSize: isCompact ? 13 : 14 },
              ]}
              placeholder={t('Search by name or meaning...')}
              placeholderTextColor={tokens.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
              clearButtonMode="while-editing"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                style={styles.clearSearchBtn}
                accessibilityRole="button"
                accessibilityLabel={t('Clear search')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={[styles.clearSearchText, { color: tokens.textMuted }]}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Juz Section Header */}
          <View style={styles.juzSection}>
            <Text style={[styles.juzLabel, { color: tokens.textMuted }]}>{t('JUZ')}</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={[styles.juzScrollView, { marginHorizontal: -horizontalPadding }]}
              contentContainerStyle={[
                styles.juzScroll,
                { paddingHorizontal: horizontalPadding, gap: isCompact ? 6 : 8 },
                hScrollRTLStyle(),
              ]}
            >
              {JUZ_LIST.map((j) => {
                const isSelected = selectedJuz === j;
                return (
                  <TouchableOpacity
                    key={j}
                    style={[
                      styles.juzPill,
                      isSelected ? getPillShadow(mode) : null,
                      {
                        backgroundColor: isSelected ? tokens.gold : tokens.cardTop,
                        borderColor: isSelected ? tokens.gold : tokens.cardBorder,
                        minWidth: isCompact ? 36 : 40,
                        height: isCompact ? 36 : 40,
                        borderRadius: isCompact ? 18 : 20,
                      },
                    ]}
                    onPress={() => handleSelectJuz(j)}
                    accessibilityRole="button"
                    accessibilityLabel={`${t('Juz')} ${j}`}
                    accessibilityState={{ selected: isSelected }}
                  >
                    <Text
                      style={[
                        styles.juzPillText,
                        {
                          color: isSelected ? tokens.onGold : tokens.muted,
                          fontSize: isCompact ? 12 : 13,
                        },
                      ]}
                    >
                      {j}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Revelation Type Filter Chips */}
          <View style={styles.revelationSection}>
            <Text style={[styles.revelationLabel, { color: tokens.textMuted }]}>{t('REVELATION')}</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={[styles.revelationScrollView, { marginHorizontal: -horizontalPadding }]}
              contentContainerStyle={[
                styles.revelationScroll,
                { paddingHorizontal: horizontalPadding, gap: isCompact ? 4 : 6 },
                hScrollRTLStyle(),
              ]}
            >
              {REVELATION_OPTIONS.map((opt) => {
                const isSelected = selectedRevelation === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.revelationChip,
                      isSelected ? getPillShadow(mode) : null,
                      {
                        backgroundColor: isSelected ? tokens.gold : tokens.cardTop,
                        borderColor: isSelected ? tokens.gold : tokens.cardBorder,
                        paddingHorizontal: isCompact ? 10 : 12,
                        height: isCompact ? 28 : 32,
                        borderRadius: isCompact ? 14 : 16,
                      },
                    ]}
                    onPress={() => setSelectedRevelation(opt.value)}
                    accessibilityRole="button"
                    accessibilityLabel={opt.value === null ? t('All') : opt.value === 'Meccan' ? t('Meccan') : t('Medinan')}
                    accessibilityState={{ selected: isSelected }}
                  >
                    <Text
                      style={[
                        styles.revelationChipText,
                        {
                          color: isSelected ? tokens.onGold : tokens.muted,
                          fontSize: isCompact ? 10 : 11,
                        },
                      ]}
                    >
                      {opt.value === null ? t('All') : opt.value === 'Meccan' ? t('Meccan') : t('Medinan')}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            {surahs && (
              <Text
                style={[
                  styles.revelationCounts,
                  { color: tokens.textMuted, fontSize: isCompact ? 9 : 10 },
                ]}
              >
                {t('Meccan')} {surahs.filter((s) => s.revelationType === 'Meccan').length} · {t('Medinan')}{' '}
                {surahs.filter((s) => s.revelationType === 'Medinan').length} · {surahs.length}
              </Text>
            )}
          </View>
        </View>

        <FlatList
          ref={listRef}
          onScrollToIndexFailed={(info) => {
            listRef.current?.scrollToOffset({
              offset: info.averageItemLength * info.index,
              animated: true,
            });
          }}
          data={filteredSurahs}
          keyExtractor={(s) => String(s.number)}
          contentContainerStyle={[
            styles.listContent,
            {
              paddingHorizontal: horizontalPadding,
              paddingBottom: TAB_PAD_BOTTOM(insets.bottom),
            },
          ]}
          ItemSeparatorComponent={() => <Hairline />}
          initialNumToRender={15}
          maxToRenderPerBatch={15}
          windowSize={11}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadSurahs(true);
              }}
              tintColor={tokens.gold}
            />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.row,
                { paddingVertical: isCompact ? 11 : 14, gap: isCompact ? 10 : 12 },
              ]}
              onPress={() => onOpenSurah(item.number)}
              accessibilityLabel={`${t('Open Surah')} ${item.englishName}`}
            >
              <View
                style={[
                  styles.numberBadge,
                  {
                    backgroundColor: tokens.ringFill,
                    borderColor: tokens.ringBorder,
                    width: isCompact ? 32 : 36,
                    height: isCompact ? 32 : 36,
                    borderRadius: isCompact ? 16 : 18,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.number,
                    { color: tokens.goldText, fontSize: isCompact ? 12 : 13 },
                  ]}
                >
                  {item.number}
                </Text>
              </View>
              <View style={styles.rowMain}>
                <Text
                  style={[
                    styles.englishName,
                    { color: tokens.textPrimary, fontSize: isCompact ? 14 : 15 },
                  ]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {item.englishName}
                </Text>
                <Text
                  style={[
                    styles.translation,
                    { color: tokens.textMuted, fontSize: isCompact ? 11 : 12 },
                  ]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {translatedNames?.[item.number] ? `${flag} ${translatedNames[item.number]} · ` : ''}{item.englishNameTranslation} · {item.revelationType === 'Meccan' ? t('Meccan') : t('Medinan')}
                </Text>
              </View>
              <View style={styles.rowRight}>
                <ArabicText
                  size={isCompact ? 16 : 18}
                  numberOfLines={1}
                  style={styles.arabicName}
                >
                  {item.name}
                </ArabicText>
                <Text
                  style={[
                    styles.ayahCount,
                    { color: tokens.gold, fontSize: isCompact ? 10 : 11 },
                  ]}
                  numberOfLines={1}
                >
                  {item.numberOfAyahs} {t('ayahs')}
                </Text>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={[styles.emptyText, { color: tokens.textMuted }]}>
                {t('No Surahs match')} &ldquo;{searchQuery}&rdquo;
              </Text>
            </View>
          }
        />
      </View>

      <QuranLanguageModal
        visible={langPickerOpen}
        onClose={() => setLangPickerOpen(false)}
      />
    </DetailScreen>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  contentWrap: {
    flex: 1,
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorInner: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  errorText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  retryBtnText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 14,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 4,
  },
  backBtn: {
    alignSelf: 'flex-start',
    minHeight: 30,
    justifyContent: 'center',
    paddingVertical: 3,
    paddingRight: 12,
    marginBottom: 2,
  },
  backText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
  },
  sectionHeader: {
    marginBottom: 8,
  },
  langBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 8,
  },
  langBarLeft: {
    flex: 1,
    marginRight: 10,
  },
  langBarLabel: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 9,
    letterSpacing: 1,
    marginBottom: 1,
  },
  langBarTitle: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12.5,
  },
  langChangeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minHeight: 34,
    borderRadius: 10,
    borderWidth: 1,
  },
  langChangeBtnText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11.5,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    height: 46,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Manrope_400Regular',
    fontSize: 13.5,
    height: '100%',
    padding: 0,
    minWidth: 0,
    paddingVertical: 0,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none', outlineWidth: 0 } as any) : {}),
  },
  clearSearchBtn: {
    minWidth: 32,
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  clearSearchText: {
    fontSize: 13,
  },
  juzSection: {
    marginTop: 0,
    marginBottom: 4,
  },
  juzLabel: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  juzScrollView: {
    marginHorizontal: -20,
  },
  juzScroll: {
    paddingHorizontal: 20,
    gap: 6,
  },
  juzPill: {
    minWidth: 40,
    height: 40,
    borderRadius: 20,
    paddingHorizontal: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  juzPillText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    minHeight: 52,
  },
  numberBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  number: { fontFamily: 'Manrope_700Bold', fontSize: 13 },
  rowMain: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  englishName: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 15,
  },
  translation: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    marginTop: 2,
  },
  rowRight: {
    flexShrink: 0,
    alignItems: 'flex-end',
    justifyContent: 'center',
    maxWidth: '30%',
    gap: 2,
  },
  arabicName: {
    textAlign: 'right',
  },
  ayahCount: { fontFamily: 'Manrope_400Regular', fontSize: 11 },
  emptyWrap: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 14,
  },
  revelationSection: {
    marginTop: 4,
    marginBottom: 8,
  },
  revelationLabel: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  revelationScrollView: {
    marginHorizontal: -20,
  },
  revelationScroll: {
    paddingHorizontal: 20,
    gap: 8,
  },
  revelationChip: {
    paddingHorizontal: 12,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  revelationChipText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
  },
  revelationCounts: {
    marginTop: 6,
    fontFamily: 'Manrope_400Regular',
  },
});
