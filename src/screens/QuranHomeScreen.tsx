import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  FlatList,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Polygon } from 'react-native-svg';
import { TabFlatList } from '../components/layout/TabScreen';
import { AppText } from '../components/ui/AppText';
import { getCardShadow, getHeroCardShadow, getPillShadow } from '../lib/theme';
import { fontRoles, useThemeTokens } from '../theme/tokens';
import { hScrollRTLStyle } from '../lib/rtl';
import { fetchSurahList, fetchSurahListForLanguage, getBundledSurahs114, SurahMeta } from '../lib/quran';
import { SURAHS_114 } from '../lib/surahs114';
import { ArabicText, QURAN_FONT_FAMILIES } from '../components/ArabicText';
import { GeometricPattern } from '../components/GeometricPattern';
import { isRTL, t } from '../lib/i18n';
import { LastReadPosition, loadLastReadPosition, loadQuranCache } from '../lib/db';
import { getContinueReadingPosition, addReadingPositionListener, ReadingPosition } from '../lib/continuing';
import { getLocalizedSurahName, getLocalizedLanguageName, normalizeSearchText } from '../lib/surahNamesLocalized';
import { getLocalizedTranslatorName } from '../lib/quranLanguages';
import { getRecentSurahs, RecentSurah } from '../lib/recentSurahs';
import { useQuranLanguage } from '../lib/quranLanguageState';
import { getBookmarks, getNotes } from '../lib/study';
import { QuranLanguageModal } from '../components/QuranLanguageModal';
import { useQuranPreload } from '../lib/quranPreloader';
import { useSettings } from '../lib/settings';
import { useFlatListRestore } from '../lib/useScrollRestore';
import { useSearchHistory } from '../lib/searchHistory';
import { EmptyState } from '../components/EmptyState';
import { getForwardIcon } from '../lib/iconMap';
import { HOME_THEME_TOKENS } from '../lib/homeThemeTokens';

interface QuranHomeScreenProps {
  onOpenSurah: (surahNumber: number, initialAyah?: number, initialPage?: number) => void;
  onOpenAudio: () => void;
  onOpenTafsir: () => void;
  onOpenTopics: () => void;
  onOpenCompare: () => void;
  onOpenBookmarks: () => void;
  onOpenNotes: () => void;
  onOpenPlans: () => void;
  onOpenHifz: () => void;
  /** True when this screen's pane is the visible one (used to refresh state on focus). */
  isActive?: boolean;
}

const OCTAGRAM_POINTS =
  '17.0,2.0 21.4,6.4 27.6,6.4 27.6,12.6 32.0,17.0 27.6,21.4 27.6,27.6 21.4,27.6 17.0,32.0 12.6,27.6 6.4,27.6 6.4,21.4 2.0,17.0 6.4,12.6 6.4,6.4 12.6,6.4';

function getCleanArabicSurahName(surahNumber: number, fallbackName?: string): string {
  const canonical = SURAHS_114[surahNumber - 1]?.name;
  const raw = canonical || (fallbackName ? fallbackName.replace(/^(سُورَةُ\s*|سورة\s*)/, '').trim() : '');
  return raw.replace(/[\u064B-\u065F\u0670]/g, '').trim();
}

function SurahRosetteBadge({
  number,
  borderColor,
  fillColor,
  textColor,
}: {
  number: number;
  borderColor: string;
  fillColor: string;
  textColor: string;
}) {
  return (
    <View style={styles.rosetteBadge}>
      <Svg width={28} height={28} viewBox="0 0 34 34" style={StyleSheet.absoluteFill}>
        <Polygon
          points={OCTAGRAM_POINTS}
          stroke={borderColor}
          strokeWidth={1.3}
          fill={fillColor}
        />
      </Svg>
      <AppText
        variant="numeral"
        style={[
          styles.rosetteNumberText,
          {
            fontSize: number >= 100 ? 8.5 : 9.5,
          },
        ]}
        maxFontSizeMultiplier={1.1}
      >
        {number}
      </AppText>
    </View>
  );
}

interface SurahRowProps {
  item: SurahMeta;
  tokens: ReturnType<typeof useThemeTokens>['tokens'];
  mode: Parameters<typeof getCardShadow>[0];
  isCompact: boolean;
  trName?: string;
  flag?: string;
  isMarked: boolean;
  readingPositionAyah?: number;
  readingPositionPage?: number;
  onOpenSurah: (surahNumber: number, initialAyah?: number, initialPage?: number) => void;
}

const SurahRow = React.memo(function SurahRow({
  item,
  tokens,
  mode,
  isCompact,
  trName,
  flag,
  isMarked,
  readingPositionAyah,
  readingPositionPage,
  onOpenSurah,
}: SurahRowProps) {
  const cleanArabic = getCleanArabicSurahName(item.number, item.name);
  const handlePress = useCallback(() => {
    onOpenSurah(
      item.number,
      isMarked ? (readingPositionAyah ?? 1) : 1,
      isMarked ? readingPositionPage : undefined
    );
  }, [item.number, isMarked, readingPositionAyah, readingPositionPage, onOpenSurah]);

  return (
    <TouchableOpacity
      style={[
        styles.surahRow,
        {
          backgroundColor: tokens.cardTop,
          borderColor: tokens.cardBorder,
          ...getCardShadow(mode),
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`Open Surah ${item.number} ${item.englishName}`}
      testID={`surah-row-${item.number}`}
      onPress={handlePress}
      pressRetentionOffset={{ top: 10, bottom: 10, left: 20, right: 20 }}
      hitSlop={{ top: 2, bottom: 2, left: 0, right: 0 }}
      activeOpacity={0.7}
    >
      <View style={styles.surahLeft}>
        <SurahRosetteBadge
          number={item.number}
          borderColor={tokens.gold}
          fillColor={tokens.ringFill}
          textColor={tokens.text}
        />
        <View style={styles.nameBlock}>
          <AppText
            variant="rowTitle"
            style={[
              styles.englishName,
              { fontSize: isCompact ? 12.5 : 13.5 },
            ]}
            numberOfLines={1}
            ellipsizeMode="tail"
            maxFontSizeMultiplier={1.2}
          >
            {getLocalizedSurahName(item.number, item.englishName)}
          </AppText>
          <AppText
            variant="caption"
            style={[
              styles.metaSubtitle,
              { fontSize: isCompact ? 9.5 : 10.5 },
            ]}
            numberOfLines={2}
            ellipsizeMode="tail"
            maxFontSizeMultiplier={1.2}
          >
            {trName ? `${flag} ${trName} · ` : ''}{t(item.revelationType)} · {item.numberOfAyahs} {t('ayahs')}
          </AppText>
        </View>
      </View>
      <ArabicText
        size={isCompact ? 16 : 17}
        numberOfLines={1}
        bold
        fontFamily={QURAN_FONT_FAMILIES.notonaskh.bold}
        style={[styles.arabicName, { color: tokens.arabicName }]}
      >
        {cleanArabic}
      </ArabicText>
    </TouchableOpacity>
  );
});

const QuranHomeScreen = React.memo(function QuranHomeScreen({
  onOpenSurah,
  onOpenAudio,
  onOpenTafsir,
  onOpenTopics,
  onOpenCompare,
  onOpenBookmarks,
  onOpenNotes,
  onOpenPlans,
  onOpenHifz,
  isActive,
}: QuranHomeScreenProps) {
  const { mode, tokens } = useThemeTokens();
  const { width } = useWindowDimensions();
  const isCompact = width <= 360;
  const isNarrow = width < 380;
  const horizontalPadding = isCompact ? 12 : isNarrow ? 16 : 20;

  const { language, edition, flag } = useQuranLanguage();
  const [langPickerOpen, setLangPickerOpen] = useState(false);
  const [translatedNames, setTranslatedNames] = useState<Record<number, string> | null>(null);
  const { progress: preloadProgress, startPreload, pausePreload } = useQuranPreload();
  const { setQuranPreloadRequested } = useSettings();

  const [surahs, setSurahs] = useState<SurahMeta[]>(() => {
    try {
      const cached = loadQuranCache<SurahMeta[]>('surah-list');
      if (cached && Array.isArray(cached) && cached.length === 114) {
        return cached;
      }
    } catch {
      // non-fatal
    }
    return getBundledSurahs114();
  });
  const [loading] = useState<boolean>(false);
  const [bookmarkCount] = useState(() => getBookmarks().length);
  const [noteCount] = useState(() => getNotes().length);
  const [error, setError] = useState<string | null>(null);

  // Debounced search input (150ms)
  const [inputQuery, setInputQuery] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [lastRead, setLastRead] = useState<LastReadPosition | null>(() => loadLastReadPosition());
  const [readingPosition, setReadingPosition] = useState<ReadingPosition | null>(null);
  const [recentSurahs, setRecentSurahs] = useState<RecentSurah[]>([]);
  const [isResuming, setIsResuming] = useState(false);
  const isResumingRef = useRef(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      isResumingRef.current = false;
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  const handleSearchChange = useCallback((text: string) => {
    setInputQuery(text);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      setSearchQuery(text);
    }, 150);
  }, []);

  const handleClearSearch = useCallback(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    setInputQuery('');
    setSearchQuery('');
  }, []);

  const {
    history: searchHistory,
    addQuery,
    removeQuery: removeSearchHistoryQuery,
    clearHistory: clearSearchHistory,
  } = useSearchHistory('quran-surahs');

  // Search filter state
  const [searchFilter, setSearchFilter] = useState<'name' | 'meaning' | 'all'>('all');

  // Detect verse reference pattern (e.g., "2:255", "Baqarah 2:255", "Al-Baqarah 2:255")
  const verseRef = useMemo(() => {
    const trimmed = searchQuery.trim();
    const verseRefRegex = /^(?:.+\s+)?(\d+):(\d+)$/;
    const match = trimmed.match(verseRefRegex);
    if (match) {
      const surah = parseInt(match[1], 10);
      const ayah = parseInt(match[2], 10);
      if (surah >= 1 && surah <= 114) {
        const surahMeta = surahs?.find((s) => s.number === surah);
        if (surahMeta && ayah >= 1 && ayah <= surahMeta.numberOfAyahs) {
          return { surah, ayah };
        }
      }
    }
    return null;
  }, [searchQuery, surahs]);

  const listRef = useRef<FlatList<SurahMeta>>(null);

  const loadData = useCallback(async () => {
    setError(null);
    try {
      const [list] = await Promise.all([
        fetchSurahList(),
      ]);
      setSurahs(list);
    } catch {
      // Fallback is already present in state
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    fetchSurahList()
      .then((list) => {
        if (mounted) setSurahs(list);
      })
      .catch(() => {
        // Fallback is already present in state
      });
    return () => {
      mounted = false;
    };
  }, []);

  if (language === 'en' && translatedNames !== null) {
    if (language === 'en') {
      setTranslatedNames(null);
    }
  }

  // Load per-language surah names when selected language changes
  useEffect(() => {
    let mounted = true;
    fetchSurahListForLanguage(language)
      .then((map) => {
        if (mounted) setTranslatedNames(map);
      })
      .catch(() => {
        if (mounted) setTranslatedNames(null);
      });
    return () => {
      mounted = false;
    };
  }, [language]);

  // Android hardware back: close language modal if open
  useEffect(() => {
    if (!langPickerOpen) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setLangPickerOpen(false);
      return true;
    });
    return () => sub.remove();
  }, [langPickerOpen]);

  // Refresh continue-reading position + recently read surahs on mount
  useEffect(() => {
    let mounted = true;
    getContinueReadingPosition()
      .then((pos) => {
        if (mounted) setReadingPosition(pos);
      })
      .catch(() => {});
    getRecentSurahs()
      .then((list) => {
        if (mounted) setRecentSurahs(list);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const wasActiveRef = useRef<boolean>(!!isActive);
  const refreshGenRef = useRef(0);
  useEffect(() => {
    if (!isActive || wasActiveRef.current) return;
    wasActiveRef.current = true;
    const gen = ++refreshGenRef.current;
    setLastRead(loadLastReadPosition());
    getContinueReadingPosition()
      .then((pos) => {
        if (gen === refreshGenRef.current) setReadingPosition(pos);
      })
      .catch(() => {});
    getRecentSurahs()
      .then((list) => {
        if (gen === refreshGenRef.current) setRecentSurahs(list);
      })
      .catch(() => {});
  }, [isActive]);
  useEffect(() => {
    if (!isActive) {
      wasActiveRef.current = false;
      isResumingRef.current = false;
      if (isMountedRef.current) setIsResuming(false);
    }
  }, [isActive]);

  useEffect(() => {
    let mounted = true;
    const unsub = addReadingPositionListener(() => {
      const gen = ++refreshGenRef.current;
      getContinueReadingPosition()
        .then((pos) => {
          if (mounted && gen === refreshGenRef.current) setReadingPosition(pos);
        })
        .catch(() => {});
    });
    return () => {
      mounted = false;
      unsub();
    };
  }, []);

  const filteredSurahs = useMemo(() => {
    if (!surahs) return [];
    const rawQuery = searchQuery.trim();
    if (!rawQuery) return surahs;

    if (verseRef) {
      return surahs.filter((s) => s.number === verseRef.surah);
    }

    const normQuery = normalizeSearchText(rawQuery);
    const lowerQuery = rawQuery.toLowerCase();

    return surahs.filter((s) => {
      const englishNameMatch = s.englishName.toLowerCase().includes(lowerQuery);
      const meaningMatch = s.englishNameTranslation.toLowerCase().includes(lowerQuery);
      const tr = translatedNames?.[s.number]?.toLowerCase() || '';
      const trMatch = tr.includes(lowerQuery);
      const numberMatch = s.number.toString() === lowerQuery;

      const urduName = getLocalizedSurahName(s.number, s.englishName);
      const normUrdu = normalizeSearchText(urduName);
      const normArabic = normalizeSearchText(s.name);
      const normEnglish = normalizeSearchText(s.englishName);

      const urduMatch = normUrdu.includes(normQuery) || (normQuery === 'یس' && s.number === 36);
      const arabicMatch = normArabic.includes(normQuery);

      const nameMatch = englishNameMatch || normEnglish.includes(normQuery) || urduMatch || arabicMatch;

      switch (searchFilter) {
        case 'name':
          return nameMatch || numberMatch;
        case 'meaning':
          return meaningMatch || trMatch;
        case 'all':
        default:
          return nameMatch || meaningMatch || trMatch || numberMatch;
      }
    });
  }, [surahs, searchQuery, translatedNames, searchFilter, verseRef]);

  useEffect(() => {
    if (verseRef && searchQuery.trim().length > 0) {
      const timer = setTimeout(() => {
        onOpenSurah(verseRef.surah, verseRef.ayah);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [verseRef, searchQuery, onOpenSurah]);

  const { onScroll: onSurahListScroll } = useFlatListRestore('quran-home-scroll', listRef);

  const resumeTarget = useMemo(() => {
    if (readingPosition) {
      const meta = surahs?.find((s) => s.number === readingPosition.surah);
      return {
        surah: readingPosition.surah,
        ayah: readingPosition.ayah,
        page: readingPosition.page,
        name: meta ? getLocalizedSurahName(meta.number, meta.englishName) : `${t('Surah')} ${readingPosition.surah}`,
      };
    }
    if (lastRead) {
      return {
        surah: lastRead.surah,
        ayah: lastRead.ayah,
        page: lastRead.page,
        name: lastRead.surahName || `${t('Surah')} ${lastRead.surah}`,
      };
    }
    return null;
  }, [readingPosition, lastRead, surahs]);

  const handleResumeReading = useCallback(async () => {
    if (isResumingRef.current) return;
    isResumingRef.current = true;
    if (isMountedRef.current) setIsResuming(true);
    try {
      const freshPos = await getContinueReadingPosition();
      if (freshPos && freshPos.surah > 0) {
        onOpenSurah(freshPos.surah, freshPos.ayah, freshPos.page);
        return;
      }
      if (resumeTarget) {
        onOpenSurah(resumeTarget.surah, resumeTarget.ayah, resumeTarget.page);
      } else {
        onOpenSurah(1, 1, 1);
      }
    } catch {
      isResumingRef.current = false;
      if (isMountedRef.current) setIsResuming(false);
    } finally {
      isResumingRef.current = false;
      if (isMountedRef.current) setIsResuming(false);
    }
  }, [onOpenSurah, resumeTarget]);

  const submitSearch = useCallback(() => {
    const q = inputQuery.trim();
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    setSearchQuery(q);
    if (q.length >= 2) addQuery(q);
  }, [inputQuery, addQuery]);

  const handleSelectSearchHistory = useCallback((item: string) => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    setInputQuery(item);
    setSearchQuery(item);
    addQuery(item);
  }, [addQuery]);

  const handleOpenRecentSurah = useCallback((recent: RecentSurah) => {
    const isMarked = readingPosition && readingPosition.surah === recent.surah;
    const cached = loadQuranCache<{ ayah: number }>(`surah-last-ayah:${recent.surah}`);
    const ayah = isMarked
      ? readingPosition.ayah
      : (cached && typeof cached.ayah === 'number' ? cached.ayah : 1);
    const page = isMarked ? readingPosition.page : undefined;
    onOpenSurah(recent.surah, ayah, page);
  }, [readingPosition, onOpenSurah]);

  // Stable memoized header element containing Search, Offline card, Hero, Tiles, Chips, and Surahs section header
  const headerElement = useMemo(() => {
    const heroSurahMeta = surahs?.find((s) => s.number === (resumeTarget?.surah || 1));
    const rawArabic = heroSurahMeta?.name || 'الفاتحة';
    const heroArabicName = getCleanArabicSurahName(heroSurahMeta?.number || 1, rawArabic);
    const heroLatinName = resumeTarget?.name || (heroSurahMeta ? getLocalizedSurahName(heroSurahMeta.number, heroSurahMeta.englishName) : t('Al-Faatiha'));
    const heroAyahInfo = resumeTarget
      ? `${heroSurahMeta?.englishNameTranslation || `${t('Surah')} ${resumeTarget.surah}`} · ${t('Ayah')} ${resumeTarget.ayah}`
      : `${t('The Opening')} · ${t('Ayah')} 1`;

    const heroGradient = mode === 'ink'
      ? tokens.heroGradient
      : HOME_THEME_TOKENS.hero.lightGradient;

    const pillBorderColor = mode === 'paper' ? tokens.cardBorder : 'rgba(142, 116, 64, 0.6)';

    const mostRecent = recentSurahs.length > 0 ? recentSurahs[0] : null;
    const mostRecentAyah = (() => {
      if (!mostRecent) return undefined;
      const isMarked = readingPosition && readingPosition.surah === mostRecent.surah;
      const cached = loadQuranCache<{ ayah: number }>(`surah-last-ayah:${mostRecent.surah}`);
      return isMarked
        ? readingPosition.ayah
        : (cached && typeof cached.ayah === 'number' ? cached.ayah : undefined);
    })();

    return (
      <View style={styles.headerArea}>
        {/* Match the title hierarchy used by the Home, Library, and Tools tabs. */}
        <View style={[styles.titleSection, { paddingStart: Math.max(0, 26 - horizontalPadding) }]}>
          <AppText
            variant="eyebrow"
            style={[
              styles.titleEyebrow,
              {
                fontFamily: isRTL() ? 'Amiri_400Regular' : 'Poppins_500Medium',
                letterSpacing: isRTL() ? 0 : 2.2,
                textTransform: isRTL() ? 'none' : 'uppercase',
              },
            ]}
            maxFontSizeMultiplier={1.2}
          >
            {t('Read')}
          </AppText>
          <AppText
            variant="screenTitle"
            style={[
              styles.titleMain,
              { fontFamily: isRTL() ? 'Amiri_700Bold' : 'Lora_500Medium' },
            ]}
            maxFontSizeMultiplier={1.2}
          >
            {t('Quran')}
          </AppText>
        </View>

        {/* 1. Search Bar (pill card matching reference) */}
        <View
          style={[
            styles.searchBar,
            {
              backgroundColor: tokens.cardTop,
              borderColor: tokens.cardBorder,
              ...getCardShadow(mode),
            },
          ]}
        >
          <Ionicons name="search" size={16} color={tokens.accent} />
          <TextInput
            key="quran-search-input"
            style={[
              styles.searchInput,
              {
                color: tokens.text,
                fontSize: isCompact ? (isRTL() ? 13.5 : 12.5) : (isRTL() ? 14.5 : 13.5),
                fontFamily: isRTL() ? fontRoles.arabicNoto : 'Manrope_500Medium',
                textAlign: isRTL() ? 'right' : 'left',
                writingDirection: isRTL() ? 'rtl' : 'ltr',
              },
            ]}
            placeholder={
              verseRef
                ? `${t('Jumping to')} ${surahs?.find((s) => s.number === verseRef?.surah)?.englishName || t('Surah')} ${verseRef?.ayah}…`
                : searchFilter === 'name'
                ? t('Search surah name…')
                : searchFilter === 'meaning'
                ? t('Search meaning…')
                : t('Search surah name or meaning…')
            }
            placeholderTextColor={tokens.muted}
            accessibilityLabel={t('Search surah name or meaning…')}
            value={inputQuery}
            onChangeText={handleSearchChange}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            onSubmitEditing={submitSearch}
            maxFontSizeMultiplier={1.2}
          />
          {inputQuery.length > 0 && (
            <TouchableOpacity
              onPress={handleClearSearch}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityRole="button"
              accessibilityLabel={t('Clear search')}
            >
              <Ionicons name="close-circle" size={16} color={tokens.muted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Search Filters & Recent Searches when searching / focused */}
        {(inputQuery.length > 0 || searchHistory.length > 0 || verseRef) && (
          <View style={styles.searchDetailsWrap}>
            <View style={styles.searchFilterRow}>
              {(['all', 'name', 'meaning'] as const).map((filter) => {
                const labels = { all: t('All'), name: t('Surah Name'), meaning: t('Meaning') };
                const isSelected = searchFilter === filter;
                return (
                  <TouchableOpacity
                    key={filter}
                    style={[
                      styles.searchFilterBtn,
                      {
                        backgroundColor: isSelected ? tokens.gold : tokens.ringFill,
                        borderColor: isSelected ? tokens.gold : tokens.cardBorder,
                      },
                    ]}
                    onPress={() => setSearchFilter(filter)}
                    hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                  >
                    <AppText
                      variant="caption"
                      tone={isSelected ? 'onGold' : undefined}
                      style={styles.searchFilterBtnText}
                      maxFontSizeMultiplier={1.2}
                    >
                      {labels[filter]}
                    </AppText>
                  </TouchableOpacity>
                );
              })}
            </View>

            {verseRef && (
              <View
                style={[
                  styles.verseRefHint,
                  { backgroundColor: tokens.ringFill, borderColor: tokens.cardBorder },
                ]}
              >
                <Ionicons name={getForwardIcon('arrow')} size={13} color={tokens.accent} />
                <AppText
                  variant="caption"
                  style={styles.verseRefHintText}
                  numberOfLines={1}
                  maxFontSizeMultiplier={1.2}
                >
                  {t('Verse reference detected — jumping to')}{' '}
                  <AppText variant="caption" highlight style={{ fontFamily: 'Manrope_700Bold' }}>
                    {(() => {
                      const m = surahs?.find((s) => s.number === verseRef.surah);
                      return m ? getLocalizedSurahName(m.number, m.englishName) : `${t('Surah')} ${verseRef.surah}`;
                    })()}{' '}
                    {verseRef.ayah}
                  </AppText>
                </AppText>
              </View>
            )}

            {searchHistory.length > 0 && !inputQuery && (
              <View style={styles.searchRecentWrap}>
                <View style={styles.searchRecentHeader}>
                  <AppText variant="eyebrow" style={styles.searchRecentLabel} maxFontSizeMultiplier={1.2}>
                    {t('Recent searches')}
                  </AppText>
                  <TouchableOpacity
                    onPress={clearSearchHistory}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityRole="button"
                    accessibilityLabel={t('Clear surah search history')}
                  >
                    <AppText variant="caption" style={styles.searchRecentClear} maxFontSizeMultiplier={1.2}>
                      {t('Clear')}
                    </AppText>
                  </TouchableOpacity>
                </View>
                <ScrollView
                  horizontal
                  nestedScrollEnabled
                  showsHorizontalScrollIndicator={false}
                  onScroll={(e) => { (e as any)?.stopPropagation?.(); }}
                  scrollEventThrottle={16}
                  contentContainerStyle={[styles.searchRecentScroll, hScrollRTLStyle()]}
                >
                  {searchHistory.map((item) => (
                    <View
                      key={item}
                      style={[
                        styles.searchRecentChip,
                        {
                          backgroundColor: tokens.ringFill,
                          borderColor: pillBorderColor,
                          ...getPillShadow(mode),
                        },
                      ]}
                    >
                      <TouchableOpacity
                        onPress={() => handleSelectSearchHistory(item)}
                        style={styles.searchRecentChipBtn}
                        hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                        accessibilityRole="button"
                        accessibilityLabel={`${t('Search for')} ${item}`}
                      >
                        <Ionicons name="time-outline" size={12} color={tokens.accent} />
                        <AppText
                          variant="caption"
                          style={styles.searchRecentChipText}
                          numberOfLines={1}
                          maxFontSizeMultiplier={1.2}
                        >
                          {item}
                        </AppText>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => removeSearchHistoryQuery(item)}
                        style={styles.searchRecentChipRemove}
                        accessibilityRole="button"
                        accessibilityLabel={t('Remove from search history')}
                        hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
                      >
                        <Ionicons name="close" size={11} color={tokens.muted} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
        )}

        {/* 2. Transient Preload / Cache Progress Notification Card (dismissed when complete) */}
        {!preloadProgress.isComplete && (
          <View
            style={[
              styles.offlineCard,
              {
                backgroundColor: tokens.cardTop,
                borderColor: tokens.cardBorder,
                ...getCardShadow(mode),
              },
            ]}
          >
            <View style={styles.offlineLeft}>
              <View
                style={[
                  styles.offlineRing,
                  {
                    backgroundColor: tokens.ringFill,
                    borderColor: tokens.ringBorder,
                  },
                ]}
              >
                <Ionicons
                  name={preloadProgress.isRunning ? 'cloud-download-outline' : 'arrow-down-outline'}
                  size={15}
                  color={preloadProgress.isRunning ? tokens.gold : tokens.accent}
                />
              </View>
              <View style={styles.offlineTextCol}>
                <AppText
                  variant="sectionTitle"
                  style={styles.offlineTitle}
                  numberOfLines={1}
                  maxFontSizeMultiplier={1.2}
                >
                  {preloadProgress.isRunning
                    ? `${t('Preloading Quran…')} ${preloadProgress.cached}/114`
                    : `${preloadProgress.cached}/114 ${t('Surahs Cached Offline')}`}
                </AppText>
                <AppText
                  variant="caption"
                  style={styles.offlineSubtitle}
                  maxFontSizeMultiplier={1.2}
                >
                  {t('Instant opening with Arabic & translations cached')}
                </AppText>
                <View style={[styles.offlineTrack, { backgroundColor: tokens.ringFill }]}>
                  <View
                    style={[
                      styles.offlineFill,
                      {
                        backgroundColor: tokens.gold,
                        width: `${Math.max(preloadProgress.cached > 0 ? 3 : 0, Math.min(100, Math.round((preloadProgress.cached / 114) * 100)))}%`,
                      },
                    ]}
                  />
                </View>
              </View>
            </View>
            <TouchableOpacity
              style={[
                styles.offlineBtn,
                {
                  backgroundColor: mode === 'paper' ? tokens.cardTop : tokens.ringFill,
                  borderColor: tokens.gold,
                },
              ]}
              onPress={() => {
                if (preloadProgress.isRunning) {
                  pausePreload();
                  setQuranPreloadRequested(false);
                } else {
                  setQuranPreloadRequested(true);
                  startPreload(false);
                }
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel={preloadProgress.isRunning ? t('Pause preloading') : t('Preload all surahs')}
            >
              <AppText
                variant="caption"
                highlight
                style={styles.offlineBtnText}
                maxFontSizeMultiplier={1.2}
              >
                {preloadProgress.isRunning ? t('Pause') : t('Preload All')}
              </AppText>
            </TouchableOpacity>
          </View>
        )}

        {/* 2b. Paired Responsive Row: Translation Switch & Recently Read Selector */}
        <View style={[styles.pairedRow, { gap: isCompact ? 6 : 8 }]}>
          {/* Translation Card */}
          <TouchableOpacity
            style={[
              styles.pairedCard,
              {
                backgroundColor: tokens.cardTop,
                borderColor: tokens.cardBorder,
                ...getCardShadow(mode),
              },
            ]}
            onPress={() => setLangPickerOpen(true)}
            hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
            accessibilityRole="button"
            accessibilityLabel={`${t('Translation')}. ${t('Current')}: ${edition.language}`}
            activeOpacity={0.75}
          >
            <View style={styles.pairedCardHeader}>
              <View style={styles.pairedCardHeaderLeft}>
                <Ionicons name="globe-outline" size={13} color={tokens.accent} />
                <AppText
                  variant="eyebrow"
                  style={styles.pairedCardLabel}
                  numberOfLines={1}
                  maxFontSizeMultiplier={1.2}
                >
                  {t('Translation')}
                </AppText>
              </View>
              <Ionicons name={getForwardIcon('chevron')} size={12} color={tokens.muted} />
            </View>
            <View style={styles.pairedCardBody}>
              <AppText
                variant="rowTitle"
                style={[
                  styles.pairedCardTitle,
                  { fontSize: isCompact ? 11.5 : 12.5 },
                ]}
                numberOfLines={1}
                maxFontSizeMultiplier={1.2}
              >
                {flag} {getLocalizedLanguageName(edition.language)}
              </AppText>
              <AppText
                variant="caption"
                style={[
                  styles.pairedCardSub,
                  { fontSize: isCompact ? 9 : 10 },
                ]}
                numberOfLines={2}
                maxFontSizeMultiplier={1.2}
              >
                {getLocalizedTranslatorName(edition.editionIdentifier, edition.name)}
              </AppText>
            </View>
          </TouchableOpacity>

          {/* Recently Read Card */}
          <View
            style={[
              styles.pairedCard,
              {
                backgroundColor: tokens.cardTop,
                borderColor: tokens.cardBorder,
                ...getCardShadow(mode),
              },
            ]}
          >
            {mostRecent ? (
              <>
                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={() => handleOpenRecentSurah(mostRecent)}
                  accessibilityRole="button"
                  accessibilityLabel={`${t('Recently Read')}. ${t('Open Surah')} ${mostRecent.surah} ${mostRecent.name}`}
                  style={styles.recentMainTouchable}
                >
                  <View style={styles.pairedCardHeader}>
                    <View style={styles.pairedCardHeaderLeft}>
                      <Ionicons name="time-outline" size={13} color={tokens.accent} />
                      <AppText
                        variant="eyebrow"
                        style={styles.pairedCardLabel}
                        numberOfLines={1}
                        maxFontSizeMultiplier={1.2}
                      >
                        {t('Recently Read')}
                      </AppText>
                    </View>
                    <AppText
                      variant="caption"
                      highlight
                      style={styles.recentResumeBadge}
                      numberOfLines={1}
                      maxFontSizeMultiplier={1.2}
                    >
                      {mostRecentAyah ? `${t('Ayah')} ${mostRecentAyah}` : t('Resume')}
                    </AppText>
                  </View>
                  <View style={styles.recentSurahMainRow}>
                    <AppText
                      variant="rowTitle"
                      style={[
                        styles.pairedCardTitle,
                        { flex: 1, fontSize: isCompact ? 11.5 : 12.5 },
                      ]}
                      numberOfLines={1}
                      maxFontSizeMultiplier={1.2}
                    >
                      {mostRecent.surah}. {getLocalizedSurahName(mostRecent.surah, mostRecent.name)}
                    </AppText>
                    <ArabicText
                      size={isCompact ? 11 : 12}
                      numberOfLines={1}
                      bold
                      style={{ color: tokens.arabicName, flexShrink: 0 }}
                    >
                      {getCleanArabicSurahName(mostRecent.surah, mostRecent.arabicName)}
                    </ArabicText>
                  </View>
                </TouchableOpacity>

                {recentSurahs.length > 1 && (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    nestedScrollEnabled
                    onScroll={(e) => { (e as any)?.stopPropagation?.(); }}
                    scrollEventThrottle={16}
                    contentContainerStyle={[styles.recentMiniList, hScrollRTLStyle()]}
                  >
                    {recentSurahs.map((recent, idx) => {
                      const isFirst = idx === 0;
                      return (
                        <TouchableOpacity
                          key={`recent-card-item-${recent.surah}`}
                          onPress={() => handleOpenRecentSurah(recent)}
                          hitSlop={{ top: 4, bottom: 4, left: 2, right: 2 }}
                          accessibilityRole="button"
                          accessibilityLabel={`${t('Open Surah')} ${recent.surah} ${recent.name}`}
                          style={[
                            styles.recentMiniChip,
                            {
                              backgroundColor: isFirst
                                ? tokens.ringFill
                                : tokens.bgTop,
                              borderColor: isFirst ? tokens.gold : tokens.cardBorder,
                            },
                          ]}
                        >
                          <AppText
                            variant="caption"
                            highlight={isFirst}
                            style={styles.recentMiniChipText}
                            numberOfLines={1}
                          >
                            {recent.surah}. {getLocalizedSurahName(recent.surah, recent.name)}
                          </AppText>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                )}
              </>
            ) : (
              <View style={styles.recentEmptyWrap}>
                <View style={styles.pairedCardHeader}>
                  <View style={styles.pairedCardHeaderLeft}>
                    <Ionicons name="time-outline" size={13} color={tokens.accent} />
                    <AppText
                      variant="eyebrow"
                      style={styles.pairedCardLabel}
                      numberOfLines={1}
                      maxFontSizeMultiplier={1.2}
                    >
                      {t('Recently Read')}
                    </AppText>
                  </View>
                </View>
                <View style={styles.pairedCardBody}>
                  <AppText
                    variant="caption"
                    style={styles.pairedEmptyText}
                    numberOfLines={1}
                    maxFontSizeMultiplier={1.2}
                  >
                    {t('None')}
                  </AppText>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* 3. Hero Card: Start / Continue Reading */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handleResumeReading}
          disabled={isResuming}
          accessibilityRole="button"
          accessibilityState={{ busy: isResuming, disabled: isResuming }}
          accessibilityLabel={`${resumeTarget ? t('CONTINUE READING') : t('START READING')}. ${heroLatinName}. ${heroAyahInfo}`}
          style={[
            styles.heroCard,
            {
              borderColor: HOME_THEME_TOKENS.hero.outerBorder,
              backgroundColor:
                mode === 'ink'
                  ? tokens.heroGradient[0]
                  : HOME_THEME_TOKENS.hero.lightGradient[0],
              opacity: isResuming ? 0.75 : 1,
              ...getHeroCardShadow(mode),
            },
          ]}
        >
          <LinearGradient
            colors={heroGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 0.8, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <GeometricPattern
            variant="tessellation"
            tileSize={40}
            opacity={0.06}
            color={tokens.gold}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.heroInnerBorder} pointerEvents="none" />

          <View style={styles.heroContent}>
            {/* Top row: Gold diamond + letter-spaced small-caps */}
            <View style={styles.heroTopRow}>
              <View
                style={[
                  styles.heroDiamond,
                  { backgroundColor: mode === 'paper' ? HOME_THEME_TOKENS.paper.gold : tokens.gold },
                ]}
              />
              <AppText
                variant="eyebrow"
                style={[
                  styles.heroBadgeText,
                  {
                    color: mode === 'paper' ? HOME_THEME_TOKENS.paper.gold : tokens.gold,
                    textAlign: isRTL() ? 'right' : 'left',
                  },
                ]}
                maxFontSizeMultiplier={1.2}
              >
                {resumeTarget ? t('CONTINUE READING') : t('START READING')}
              </AppText>
            </View>

            {/* Middle row: Latin and Arabic names (no overlap at 360dp) */}
            <View style={styles.heroNameRow}>
              <AppText
                variant="onHeroTitle"
                onHero
                style={[
                  styles.heroSurahName,
                  {
                    fontSize: isCompact ? 23 : 27,
                    textAlign: isRTL() ? 'right' : 'left',
                    fontFamily: isRTL() ? 'Amiri_700Bold' : 'InstrumentSerif_400Regular',
                  },
                ]}
                numberOfLines={1}
                ellipsizeMode="tail"
                maxFontSizeMultiplier={1.2}
              >
                {heroLatinName}
              </AppText>
              <ArabicText
                size={isCompact ? 24 : 28}
                numberOfLines={1}
                bold
                fontFamily={QURAN_FONT_FAMILIES.notonaskh.bold}
                style={[styles.heroArabicName, { color: tokens.gold }]}
              >
                {heroArabicName}
              </ArabicText>
            </View>

            {/* Subtitle: existing meaning and ayah position */}
            <AppText
              variant="onHeroSubtitle"
              onHero
              style={[
                styles.heroSubtitle,
                {
                  fontSize: isCompact ? 11.5 : 12,
                  textAlign: isRTL() ? 'right' : 'left',
                },
              ]}
              numberOfLines={2}
              maxFontSizeMultiplier={1.2}
            >
              {heroAyahInfo}
            </AppText>

            {/* Bottom action: Gold gradient rounded Start/Resume button at bottom-left */}
            <View style={styles.heroResumeBtnWrap}>
              <LinearGradient
                colors={HOME_THEME_TOKENS.goldGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.heroResumeBtn}
              >
                <AppText
                  variant="caption"
                  tone="onGold"
                  style={styles.heroResumeBtnText}
                  maxFontSizeMultiplier={1.2}
                >
                  {resumeTarget ? t('Resume') : t('Start')}
                </AppText>
                <Ionicons name={getForwardIcon('arrow')} size={14} color={tokens.onGold} />
              </LinearGradient>
            </View>
          </View>
        </TouchableOpacity>

        {/* 4. 2x2 Feature Tiles (side-by-side rows matching reference) */}
        <View style={styles.tilesGrid}>
          {/* Row 1: Audio Center & Tafsir */}
          <View style={[styles.tileRow, { gap: isCompact ? 6 : 8 }]}>
            <TouchableOpacity
              style={[
                styles.tileCard,
                {
                  backgroundColor: tokens.cardTop,
                  borderColor: tokens.cardBorder,
                  alignItems: isRTL() ? 'flex-end' : 'flex-start',
                  ...getCardShadow(mode),
                },
              ]}
              onPress={onOpenAudio}
              pressRetentionOffset={{ top: 20, left: 40, right: 40, bottom: 20 }}
              accessibilityRole="button"
              accessibilityLabel={t('Audio Center')}
              activeOpacity={0.75}
            >
              <View
                style={[
                  styles.tileIconRing,
                  {
                    backgroundColor: tokens.ringFill,
                    borderColor: tokens.ringBorder,
                  },
                ]}
              >
                <Ionicons name="headset-outline" size={14} color={tokens.accent} />
              </View>
              <View style={styles.tileTextCol}>
                <AppText
                  variant="sectionTitle"
                  style={[styles.tileTitle, { textAlign: isRTL() ? 'right' : 'left' }]}
                  numberOfLines={1}
                  maxFontSizeMultiplier={1.2}
                >
                  {t('Audio Center')}
                </AppText>
                <AppText
                  variant="caption"
                  style={[styles.tileSub, { textAlign: isRTL() ? 'right' : 'left' }]}
                  numberOfLines={2}
                  ellipsizeMode="tail"
                  maxFontSizeMultiplier={1.2}
                >
                  {t('Reciters & Playlists')}
                </AppText>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tileCard,
                {
                  backgroundColor: tokens.cardTop,
                  borderColor: tokens.cardBorder,
                  alignItems: isRTL() ? 'flex-end' : 'flex-start',
                  ...getCardShadow(mode),
                },
              ]}
              onPress={onOpenTafsir}
              pressRetentionOffset={{ top: 20, left: 40, right: 40, bottom: 20 }}
              accessibilityRole="button"
              accessibilityLabel={t('Tafsir')}
              activeOpacity={0.75}
            >
              <View
                style={[
                  styles.tileIconRing,
                  {
                    backgroundColor: tokens.ringFill,
                    borderColor: tokens.ringBorder,
                  },
                ]}
              >
                <Ionicons name="book-outline" size={14} color={tokens.accent} />
              </View>
              <View style={styles.tileTextCol}>
                <AppText
                  variant="sectionTitle"
                  style={[styles.tileTitle, { textAlign: isRTL() ? 'right' : 'left' }]}
                  numberOfLines={1}
                  maxFontSizeMultiplier={1.2}
                >
                  {t('Tafsir')}
                </AppText>
                <AppText
                  variant="caption"
                  style={[styles.tileSub, { textAlign: isRTL() ? 'right' : 'left' }]}
                  numberOfLines={2}
                  ellipsizeMode="tail"
                  maxFontSizeMultiplier={1.2}
                >
                  {t('Jalalayn Commentary')}
                </AppText>
              </View>
            </TouchableOpacity>
          </View>

          {/* Row 2: Topics & Compare */}
          <View style={[styles.tileRow, { gap: isCompact ? 6 : 8 }]}>
            <TouchableOpacity
              style={[
                styles.tileCard,
                {
                  backgroundColor: tokens.cardTop,
                  borderColor: tokens.cardBorder,
                  alignItems: isRTL() ? 'flex-end' : 'flex-start',
                  ...getCardShadow(mode),
                },
              ]}
              onPress={onOpenTopics}
              pressRetentionOffset={{ top: 20, left: 40, right: 40, bottom: 20 }}
              accessibilityRole="button"
              accessibilityLabel={t('Topics')}
              activeOpacity={0.75}
            >
              <View
                style={[
                  styles.tileIconRing,
                  {
                    backgroundColor: tokens.ringFill,
                    borderColor: tokens.ringBorder,
                  },
                ]}
              >
                <Ionicons name="compass-outline" size={14} color={tokens.accent} />
              </View>
              <View style={styles.tileTextCol}>
                <AppText
                  variant="sectionTitle"
                  style={[styles.tileTitle, { textAlign: isRTL() ? 'right' : 'left' }]}
                  numberOfLines={1}
                  maxFontSizeMultiplier={1.2}
                >
                  {t('Topics')}
                </AppText>
                <AppText
                  variant="caption"
                  style={[styles.tileSub, { textAlign: isRTL() ? 'right' : 'left' }]}
                  numberOfLines={2}
                  ellipsizeMode="tail"
                  maxFontSizeMultiplier={1.2}
                >
                  {t('Thematic Passages')}
                </AppText>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tileCard,
                {
                  backgroundColor: tokens.cardTop,
                  borderColor: tokens.cardBorder,
                  alignItems: isRTL() ? 'flex-end' : 'flex-start',
                  ...getCardShadow(mode),
                },
              ]}
              onPress={onOpenCompare}
              pressRetentionOffset={{ top: 20, left: 40, right: 40, bottom: 20 }}
              accessibilityRole="button"
              accessibilityLabel={t('Compare')}
              activeOpacity={0.75}
            >
              <View
                style={[
                  styles.tileIconRing,
                  {
                    backgroundColor: tokens.ringFill,
                    borderColor: tokens.ringBorder,
                  },
                ]}
              >
                <Ionicons name="swap-horizontal-outline" size={14} color={tokens.accent} />
              </View>
              <View style={styles.tileTextCol}>
                <AppText
                  variant="sectionTitle"
                  style={[styles.tileTitle, { textAlign: isRTL() ? 'right' : 'left' }]}
                  numberOfLines={1}
                  maxFontSizeMultiplier={1.2}
                >
                  {t('Compare')}
                </AppText>
                <AppText
                  variant="caption"
                  style={[styles.tileSub, { textAlign: isRTL() ? 'right' : 'left' }]}
                  numberOfLines={2}
                  ellipsizeMode="tail"
                  maxFontSizeMultiplier={1.2}
                >
                  {t('Dual Translations')}
                </AppText>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* 5. Horizontal Chips: Bookmarks, Notes, Plans, Hifz, Translation, Recent (matching reference) */}
        <View style={styles.chipsRow}>
          <ScrollView
            horizontal
            nestedScrollEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={(e) => { (e as any)?.stopPropagation?.(); }}
            scrollEventThrottle={16}
            contentContainerStyle={[styles.chipsScroll, { gap: isCompact ? 6 : 8 }, hScrollRTLStyle()]}
          >
            {/* Bookmarks */}
            <TouchableOpacity
              style={[
                styles.chipBtn,
                {
                  backgroundColor: mode === 'paper' ? tokens.cardTop : tokens.ringFill,
                  borderColor: mode === 'paper' ? tokens.cardBorder : pillBorderColor,
                  ...getPillShadow(mode),
                },
              ]}
              onPress={onOpenBookmarks}
              pressRetentionOffset={{ top: 20, left: 40, right: 40, bottom: 20 }}
              hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
              accessibilityRole="button"
              accessibilityLabel={t('Bookmarks')}
            >
              <Ionicons name="bookmark-outline" size={13} color={tokens.accent} />
              <AppText variant="caption" style={styles.chipText} maxFontSizeMultiplier={1.2}>
                {t('Bookmarks')}
              </AppText>
              {bookmarkCount > 0 && (
                <View style={[styles.chipBadge, { backgroundColor: tokens.gold }]}>
                  <AppText variant="caption" tone="onGold" style={styles.chipBadgeText} maxFontSizeMultiplier={1.2}>
                    {bookmarkCount}
                  </AppText>
                </View>
              )}
            </TouchableOpacity>

            {/* Notes */}
            <TouchableOpacity
              style={[
                styles.chipBtn,
                {
                  backgroundColor: mode === 'paper' ? tokens.cardTop : tokens.ringFill,
                  borderColor: mode === 'paper' ? tokens.cardBorder : pillBorderColor,
                  ...getPillShadow(mode),
                },
              ]}
              onPress={onOpenNotes}
              pressRetentionOffset={{ top: 20, left: 40, right: 40, bottom: 20 }}
              hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
              accessibilityRole="button"
              accessibilityLabel={t('Notes')}
            >
              <Ionicons name="create-outline" size={13} color={tokens.accent} />
              <AppText variant="caption" style={styles.chipText} maxFontSizeMultiplier={1.2}>
                {t('Notes')}
              </AppText>
              {noteCount > 0 && (
                <View style={[styles.chipBadge, { backgroundColor: tokens.gold }]}>
                  <AppText variant="caption" tone="onGold" style={styles.chipBadgeText} maxFontSizeMultiplier={1.2}>
                    {noteCount}
                  </AppText>
                </View>
              )}
            </TouchableOpacity>

            {/* Reading Plans */}
            <TouchableOpacity
              style={[
                styles.chipBtn,
                {
                  backgroundColor: mode === 'paper' ? tokens.cardTop : tokens.ringFill,
                  borderColor: mode === 'paper' ? tokens.cardBorder : pillBorderColor,
                  ...getPillShadow(mode),
                },
              ]}
              onPress={onOpenPlans}
              pressRetentionOffset={{ top: 20, left: 40, right: 40, bottom: 20 }}
              hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
              accessibilityRole="button"
              accessibilityLabel={t('Reading Plans')}
            >
              <Ionicons name="calendar-outline" size={13} color={tokens.accent} />
              <AppText variant="caption" style={styles.chipText} maxFontSizeMultiplier={1.2}>
                {t('Reading Plans')}
              </AppText>
            </TouchableOpacity>

            {/* Hifz */}
            <TouchableOpacity
              style={[
                styles.chipBtn,
                {
                  backgroundColor: mode === 'paper' ? tokens.cardTop : tokens.ringFill,
                  borderColor: mode === 'paper' ? tokens.cardBorder : pillBorderColor,
                  ...getPillShadow(mode),
                },
              ]}
              onPress={onOpenHifz}
              pressRetentionOffset={{ top: 20, left: 40, right: 40, bottom: 20 }}
              hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
              accessibilityRole="button"
              accessibilityLabel={t('Hifz')}
            >
              <Ionicons name="school-outline" size={13} color={tokens.accent} />
              <AppText variant="caption" style={styles.chipText} maxFontSizeMultiplier={1.2}>
                {t('Hifz')}
              </AppText>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* 6. Surahs Section Header (NO Juz selector matching reference) */}
        <View style={[styles.surahsSectionHeader, { flexDirection: 'row' }]}>
          <AppText
            variant="title"
            style={[
              styles.surahsTitle,
              {
                fontFamily: isRTL() ? 'Amiri_700Bold' : 'InstrumentSerif_400Regular',
                textAlign: isRTL() ? 'right' : 'left',
              },
            ]}
            maxFontSizeMultiplier={1.2}
          >
            {t('Surahs')}
          </AppText>
          <AppText
            variant="caption"
            style={[
              styles.surahsCount,
              { color: tokens.gold, textAlign: isRTL() ? 'left' : 'right' },
            ]}
            maxFontSizeMultiplier={1.2}
          >
            {filteredSurahs.length === 114 ? '114' : `${filteredSurahs.length} / 114`}
          </AppText>
        </View>
      </View>
    );
  }, [
    tokens, mode, isCompact, horizontalPadding,
    inputQuery, searchHistory, searchFilter, verseRef,
    preloadProgress, startPreload, pausePreload, setQuranPreloadRequested,
    bookmarkCount, noteCount, filteredSurahs,
    edition, flag,
    onOpenAudio, onOpenTafsir, onOpenTopics, onOpenCompare,
    onOpenBookmarks, onOpenNotes, onOpenPlans, onOpenHifz,
    setSearchFilter, handleSearchChange, handleClearSearch, submitSearch,
    handleSelectSearchHistory, removeSearchHistoryQuery, clearSearchHistory,
    handleResumeReading, isResuming, resumeTarget, surahs, recentSurahs, readingPosition, handleOpenRecentSurah,
  ]);

  // Render individual Surah Row (equal-height card matching reference)
  const renderSurahRow = useCallback(
    ({ item }: { item: SurahMeta }) => {
      const isMarked = Boolean(readingPosition && readingPosition.surah === item.number);
      return (
        <SurahRow
          item={item}
          tokens={tokens}
          mode={mode}
          isCompact={isCompact}
          trName={translatedNames?.[item.number]}
          flag={flag}
          isMarked={isMarked}
          readingPositionAyah={isMarked ? readingPosition?.ayah : undefined}
          readingPositionPage={isMarked ? readingPosition?.page : undefined}
          onOpenSurah={onOpenSurah}
        />
      );
    },
    [tokens, mode, isCompact, translatedNames, flag, readingPosition, onOpenSurah]
  );

  if (loading && (!surahs || surahs.length === 0)) {
    return (
      <View style={[styles.center, { backgroundColor: tokens.bgTop }]}>
        <ActivityIndicator size="large" color={tokens.accent} />
      </View>
    );
  }

  if (error && (!surahs || surahs.length === 0)) {
    return (
      <View style={[styles.center, { backgroundColor: tokens.bgTop }]}>
        <AppText variant="body" style={styles.errorText}>{error}</AppText>
        <TouchableOpacity
          style={[styles.retryBtn, { borderColor: tokens.accent }]}
          onPress={loadData}
          accessibilityRole="button"
          accessibilityLabel={t('Retry')}
        >
          <AppText variant="caption" highlight style={styles.retryBtnText}>{t('Retry')}</AppText>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TabFlatList
        ref={listRef}
        style={styles.list}
        data={filteredSurahs}
        keyExtractor={(item) => String(item.number)}
        renderItem={renderSurahRow}
        ListHeaderComponent={headerElement}
        contentContainerStyle={[
          styles.listContent,
          {
            paddingHorizontal: horizontalPadding,
          },
        ]}
        onScroll={onSurahListScroll}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        initialNumToRender={20}
        maxToRenderPerBatch={20}
        windowSize={9}
        onScrollToIndexFailed={() => {}}
        ListEmptyComponent={
          searchQuery.trim().length > 0 ? (
            <EmptyState
              icon="search-outline"
              title={t('No surahs found')}
              subtitle={
                verseRef
                  ? `${t('Surah')} ${verseRef.surah} ${t('does not have ayah')} ${verseRef.ayah}`
                  : `${t('No surahs match')} "${searchQuery}"${searchFilter !== 'all' ? ` ${t('in')} "${searchFilter === 'name' ? t('Surah Name') : t('Meaning')}"` : ''}`
              }
              actionLabel={t('Clear search')}
              onAction={handleClearSearch}
            />
          ) : null
        }
      />

      <QuranLanguageModal
        visible={langPickerOpen}
        onClose={() => setLangPickerOpen(false)}
      />
    </View>
  );
}, (prev, next) => prev.isActive === next.isActive);

export default QuranHomeScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    flex: 1,
    width: '100%',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  errorText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 14,
    marginBottom: 12,
  },
  retryBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  retryBtnText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
  },
  listContent: {
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
  },
  headerArea: {
    marginBottom: 4,
  },
  titleSection: {
    marginBottom: 12,
  },
  titleEyebrow: {
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 2.2,
    textTransform: 'uppercase',
  },
  titleMain: {
    fontSize: 33.5,
    lineHeight: 38,
    marginTop: 2,
  },

  /* 1. Search Bar (pill card matching reference) */
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 12,
    gap: 8,
    marginBottom: 5,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Manrope_500Medium',
    paddingVertical: 0,
  },
  searchDetailsWrap: {
    marginBottom: 8,
  },
  searchFilterRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 6,
  },
  searchFilterBtn: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    minHeight: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchFilterBtnText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11.5,
  },
  verseRefHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 6,
  },
  verseRefHintText: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 11,
    flex: 1,
  },
  searchRecentWrap: {
    marginBottom: 5,
  },
  searchRecentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  searchRecentLabel: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 10.5,
  },
  searchRecentClear: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 10.5,
  },
  searchRecentScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  searchRecentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 11,
    borderWidth: 1,
    paddingStart: 7,
    paddingEnd: 5,
    minHeight: 24,
  },
  searchRecentChipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  searchRecentChipText: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 10.5,
    maxWidth: 120,
  },
  searchRecentChipRemove: {
    padding: 2,
    marginStart: 2,
  },

  /* 2. Offline Cache Card (spacious floating card) */
  offlineCard: {
    minHeight: 56,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  offlineLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginEnd: 8,
  },
  offlineRing: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginEnd: 8,
    flexShrink: 0,
  },
  offlineTextCol: {
    flex: 1,
  },
  offlineTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 13,
  },
  offlineSubtitle: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 11.5,
    marginTop: 1,
  },
  offlineTrack: {
    height: 2.5,
    borderRadius: 1.5,
    overflow: 'hidden',
    marginTop: 3,
    width: '98%',
  },
  offlineFill: {
    height: '100%',
    borderRadius: 1.5,
  },
  offlineBtn: {
    minHeight: 30,
    paddingHorizontal: 10,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  offlineBtnText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11.5,
  },
  offlineDoneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
  },
  offlineDoneText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11.5,
  },

  /* 2b. Paired Row: Translation Switch & Recently Read Selector */
  pairedRow: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  pairedCard: {
    flex: 1,
    minWidth: 0,
    minHeight: 64,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
    justifyContent: 'space-between',
  },
  pairedCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  pairedCardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pairedCardLabel: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
  },
  pairedCardBody: {
    justifyContent: 'center',
  },
  pairedCardTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 13.5,
  },
  pairedCardSub: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 11.5,
    marginTop: 1,
  },
  pairedEmptyText: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
    fontStyle: 'italic',
  },
  recentMainTouchable: {
    width: '100%',
  },
  recentResumeBadge: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 11,
  },
  recentSurahMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
  },
  recentMiniList: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 4,
    alignItems: 'center',
  },
  recentMiniChip: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    minHeight: 24,
    borderRadius: 6,
    borderWidth: 1,
    justifyContent: 'center',
  },
  recentMiniChipText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 10.5,
  },
  recentEmptyWrap: {
    width: '100%',
  },

  /* 3. Hero Card: Start / Continue Reading */
  heroCard: {
    minHeight: 131,
    borderRadius: 22,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 5,
  },
  heroInnerBorder: {
    position: 'absolute',
    top: 3,
    left: 3,
    right: 3,
    bottom: 3,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: HOME_THEME_TOKENS.hero.innerBorder,
    opacity: 0.5,
  },
  heroContent: {
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 2,
  },
  heroDiamond: {
    width: 4.5,
    height: 4.5,
    backgroundColor: HOME_THEME_TOKENS.paper.gold,
    transform: [{ rotate: '45deg' }],
  },
  heroBadgeText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 10,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: HOME_THEME_TOKENS.paper.gold,
  },
  heroNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    width: '100%',
    minHeight: 28,
  },
  heroSurahName: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    letterSpacing: 0.2,
  },
  heroArabicName: {
    flexShrink: 0,
    maxWidth: '45%',
    textAlign: 'right',
  },
  heroSubtitle: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 11.5,
    marginTop: 1,
    marginBottom: 6,
  },
  heroResumeBtnWrap: {
    alignSelf: 'flex-start',
  },
  heroResumeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 11,
    borderRadius: 12,
    minHeight: 30,
  },
  heroResumeBtnText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 12,
    color: HOME_THEME_TOKENS.paper.onGold,
    letterSpacing: 0.2,
  },

  /* 4. 2x2 Feature Tiles (column layout matching reference) */
  tilesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 5,
    marginBottom: 5,
  },
  tileRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  tileCard: {
    flex: 1,
    minWidth: 0,
    minHeight: 78,
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: 7,
    paddingHorizontal: 10,
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  tileIconRing: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  tileTextCol: {
    width: '100%',
  },
  tileTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 13,
    flexShrink: 1,
  },
  tileSub: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 11.5,
    marginTop: 1,
    flexShrink: 1,
  },

  /* 5. Horizontal Chips */
  chipsRow: {
    marginBottom: 5,
  },
  chipsScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
    paddingEnd: 4,
  },
  chipBtn: {
    minHeight: 32,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  chipText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11.5,
  },
  chipBadge: {
    minWidth: 16,
    minHeight: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  chipBadgeText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 10,
  },

  /* 6. Surahs Section Header */
  surahsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: 3,
    marginBottom: 5,
  },
  surahsTitle: {
    fontSize: 20,
  },
  surahsCount: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 11.5,
  },

  /* 7. Surah Rows (equal-height card matching reference) */
  surahRow: {
    minHeight: 44,
    marginBottom: 5,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  surahLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  rosetteBadge: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  rosetteNumberText: {
    fontFamily: 'Manrope_600SemiBold',
    textAlign: 'center',
  },
  nameBlock: {
    flex: 1,
    minWidth: 0,
  },
  englishName: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 13,
  },
  metaSubtitle: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 11.5,
    marginTop: 1,
  },
  arabicName: {
    flexShrink: 0,
    maxWidth: '42%',
    textAlign: 'right',
  },
});
