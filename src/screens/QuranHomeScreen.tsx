import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme';
import { hScrollRTLStyle } from '../lib/rtl';
import { fetchSurahList, fetchSurahListForLanguage, getBundledSurahs114, SurahMeta } from '../lib/quran';
import { ArabicText } from '../components/ArabicText';
import { SectionHeader } from '../components/SectionHeader';
import { Hairline } from '../components/Hairline';
import { t } from '../lib/i18n';
import { LastReadPosition, loadLastReadPosition, loadQuranCache } from '../lib/db';
import { getContinueReadingPosition, ReadingPosition } from '../lib/continuing';
import { getRecentSurahs, RecentSurah } from '../lib/recentSurahs';
import { useQuranLanguage } from '../lib/quranLanguageState';
import { getBookmarks, getNotes } from '../lib/study';
import { QuranLanguageModal } from '../components/QuranLanguageModal';
import { useQuranPreload } from '../lib/quranPreloader';
import { useSettings } from '../lib/settings';
import { useFlatListRestore } from '../lib/useScrollRestore';
import { useSearchHistory } from '../lib/searchHistory';
import { EmptyState } from '../components/EmptyState';
import { getForwardIcon, getBackIcon } from '../lib/iconMap';

interface QuranHomeScreenProps {
  onOpenSurah: (surahNumber: number, initialAyah?: number) => void;
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

const JUZ_LIST = Array.from({ length: 30 }, (_, i) => i + 1);

const JUZ_START_SURAH: Record<number, number> = {
  1: 1, 2: 2, 3: 2, 4: 3, 5: 4, 6: 4, 7: 5, 8: 6, 9: 7, 10: 8,
  11: 9, 12: 11, 13: 12, 14: 15, 15: 17, 16: 18, 17: 21, 18: 23, 19: 25, 20: 27,
  21: 29, 22: 33, 23: 36, 24: 39, 25: 41, 26: 46, 27: 51, 28: 58, 29: 67, 30: 78,
};

export default function QuranHomeScreen({
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
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const isCompact = width <= 360;
  const isNarrow = width < 380;
  const horizontalPadding = isCompact ? 12 : isNarrow ? 16 : 20;

  const { language, setLanguage, edition, flag } = useQuranLanguage();
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
  const [loading, setLoading] = useState<boolean>(false);
  const [bookmarkCount, setBookmarkCount] = useState(0);
  const [noteCount, setNoteCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedJuz, setSelectedJuz] = useState<number | null>(null);
  const [lastRead, setLastRead] = useState<LastReadPosition | null>(null);
  const [readingPosition, setReadingPosition] = useState<ReadingPosition | null>(null);
  const [recentSurahs, setRecentSurahs] = useState<RecentSurah[]>([]);

  const {
    history: searchHistory,
    addQuery,
    removeQuery: removeSearchHistoryQuery,
    clearHistory: clearSearchHistory,
  } = useSearchHistory('quran-surahs');

  // Search filter state
  const [searchFilter, setSearchFilter] = useState<'name' | 'meaning' | 'all'>('all');

  // Detect verse reference pattern (e.g., "2:255", "Baqarah 2:255", "Al-Baqarah 2:255")
  const parseVerseReference = (query: string): { surah: number; ayah: number } | null => {
    const trimmed = query.trim();
    // Pattern: "surah:ayah" or "surah-name surah:ayah"
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
  };

  const verseRef = useMemo(() => parseVerseReference(searchQuery), [searchQuery, surahs]);

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
    loadData();
    setBookmarkCount(getBookmarks().length);
    setNoteCount(getNotes().length);
  }, [loadData]);

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

  // Refresh last read on focus/mount
  useEffect(() => {
    setLastRead(loadLastReadPosition());
  }, []);

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

  // Refresh when this screen becomes visible again (returning from the Surah
  // Reader via Back). The pane stays mounted, so without this the Continue
  // Reading card would show stale data until an app restart.
  const wasActiveRef = useRef<boolean>(!!isActive);
  useEffect(() => {
    if (!isActive || wasActiveRef.current) return;
    wasActiveRef.current = true;
    setLastRead(loadLastReadPosition());
    getContinueReadingPosition()
      .then((pos) => setReadingPosition(pos))
      .catch(() => {});
    getRecentSurahs()
      .then((list) => setRecentSurahs(list))
      .catch(() => {});
  }, [isActive]);
  useEffect(() => {
    if (!isActive) wasActiveRef.current = false;
  }, [isActive]);

  const filteredSurahs = useMemo(() => {
    if (!surahs) return [];
    const query = searchQuery.trim().toLowerCase();
    if (!query) return surahs;
    
    // If verse reference detected, return just that surah
    if (verseRef) {
      return surahs.filter((s) => s.number === verseRef.surah);
    }
    
    return surahs.filter((s) => {
      const tr = translatedNames?.[s.number]?.toLowerCase() || '';
      const nameMatch = s.englishName.toLowerCase().includes(query);
      const meaningMatch = s.englishNameTranslation.toLowerCase().includes(query);
      const trMatch = tr.includes(query);
      const numberMatch = s.number.toString() === query;
      
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

  // Navigate to verse reference when detected and user submits search
  useEffect(() => {
    if (verseRef && searchQuery.trim().length > 0) {
      // Auto-navigate after a short delay to allow UI to update
      const timer = setTimeout(() => {
        onOpenSurah(verseRef.surah, verseRef.ayah);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [verseRef, searchQuery, onOpenSurah]);

  // Restore the surah list scroll position when the tab remounts
  const { onScroll: onSurahListScroll } = useFlatListRestore('quran-home-scroll', listRef);

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

  const resumeTarget = useMemo(() => {
    if (readingPosition) {
      const meta = surahs?.find((s) => s.number === readingPosition.surah);
      return {
        surah: readingPosition.surah,
        ayah: readingPosition.ayah,
        name: meta?.englishName || `${t('Surah')} ${readingPosition.surah}`,
      };
    }
    if (lastRead) {
      return {
        surah: lastRead.surah,
        ayah: lastRead.ayah,
        name: lastRead.surahName || `${t('Surah')} ${lastRead.surah}`,
      };
    }
    return null;
  }, [readingPosition, lastRead, surahs]);

  const handleResumeReading = () => {
    if (resumeTarget) {
      onOpenSurah(resumeTarget.surah, resumeTarget.ayah);
    } else {
      onOpenSurah(1, 1);
    }
  };

  const submitSearch = () => {
    const q = searchQuery.trim();
    if (q.length >= 2) addQuery(q);
  };

  const renderHeader = useCallback(() => {
    return (
      <View style={styles.headerArea}>
        <SectionHeader compact eyebrow={t('The Holy Quran')} title={t('Quran')} />

        {/* Translation Language Selector Banner */}
        <View
          style={[
            styles.langBar,
            { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle },
          ]}
        >
          <View style={styles.langBarLeft}>
            <Text style={[styles.langBarLabel, { color: colors.accent }]}>{t('TRANSLATION')}</Text>
            <Text style={[styles.langBarTitle, { color: colors.textPrimary }]} numberOfLines={1}>
              {flag} {edition.language} <Text style={{ color: colors.textSecondary, fontSize: 12 }}>· {edition.name}</Text>
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.langChangeBtn, { backgroundColor: colors.accentDim, borderColor: colors.accent }]}
            onPress={() => setLangPickerOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={`${t('Change translation language')}. ${t('Current')}: ${edition.language}`}
          >
            <Text style={[styles.langChangeBtnText, { color: colors.accent }]}>{t('Change')}</Text>
            <Ionicons name={getForwardIcon()} size={12} color={colors.accent} />
          </TouchableOpacity>
        </View>

        {/* Quran Offline Preload Status & Trigger */}
        <View
          style={[
            styles.preloadBar,
            { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle },
          ]}
        >
          <View style={styles.preloadLeft}>
            <View
              style={[
                styles.preloadIconWrap,
                {
                  backgroundColor: preloadProgress.isComplete
                    ? colors.accentDim
                    : preloadProgress.isRunning
                    ? colors.accentDim
                    : colors.bgRaised,
                },
              ]}
            >
              <Ionicons
                name={
                  preloadProgress.isComplete
                    ? 'checkmark-circle'
                    : preloadProgress.isRunning
                    ? 'cloud-download'
                    : 'cloud-outline'
                }
                size={16}
                color={
                  preloadProgress.isComplete
                    ? colors.accent
                    : preloadProgress.isRunning
                    ? colors.accent
                    : colors.textSecondary
                }
              />
            </View>
            <View style={styles.preloadTextCol}>
              <Text style={[styles.preloadTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                {preloadProgress.isComplete
                  ? t('Offline Ready · 114 Surahs Cached')
                  : preloadProgress.isRunning
                  ? `${t('Preloading Quran…')} ${preloadProgress.cached}/114`
                  : preloadProgress.cached > 0
                  ? `${preloadProgress.cached}/114 ${t('Surahs Cached Offline')}`
                  : t('Preload Quran for Offline Reading')}
              </Text>
              {preloadProgress.isRunning ? (
                <View style={[styles.preloadTrack, { backgroundColor: colors.bgBase }]}>
                  <View
                    style={[
                      styles.preloadFill,
                      {
                        backgroundColor: colors.accent,
                        width: `${Math.max(2, Math.round((preloadProgress.cached / 114) * 100))}%`,
                      },
                    ]}
                  />
                </View>
              ) : (
                <Text style={[styles.preloadSubtitle, { color: colors.textMuted }]} numberOfLines={1}>
                  {preloadProgress.isComplete
                    ? t('All 114 surahs and translations cached for instant access')
                    : t('Instant opening with Arabic & translations cached')}
                </Text>
              )}
            </View>
          </View>
          {!preloadProgress.isComplete && (
            <TouchableOpacity
              style={[
                styles.preloadActionBtn,
                {
                  backgroundColor: preloadProgress.isRunning ? colors.bgRaised : colors.accentDim,
                  borderColor: preloadProgress.isRunning ? colors.borderSubtle : colors.accent,
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
              accessibilityRole="button"
              accessibilityLabel={preloadProgress.isRunning ? t('Pause preloading') : t('Preload all surahs')}
            >
              <Text
                style={[
                  styles.preloadActionText,
                  { color: preloadProgress.isRunning ? colors.textSecondary : colors.accent },
                ]}
              >
                {preloadProgress.isRunning ? t('Pause') : t('Preload All')}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Continue Reading Card */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleResumeReading}
          style={[
            styles.continueCard,
            {
              backgroundColor: colors.bgSurface,
              borderColor: colors.borderSubtle,
              padding: isNarrow ? 12 : 16,
            },
          ]}
        >
          <View style={styles.continueLeft}>
            <View style={[styles.continueBadge, { backgroundColor: colors.accentDim }]}>
              <Text style={[styles.continueBadgeText, { color: colors.accent }]}>
                {resumeTarget ? t('CONTINUE READING') : t('START READING')}
              </Text>
            </View>
            <Text
              style={[
                styles.continueSurahName,
                { color: colors.textPrimary, fontSize: isNarrow ? 19 : 22 },
              ]}
              numberOfLines={1}
            >
              {resumeTarget?.name || t('Al-Faatiha')}
            </Text>
            <Text
              style={[
                styles.continueAyahText,
                { color: colors.textSecondary, fontSize: isNarrow ? 12 : 13 },
              ]}
              numberOfLines={1}
            >
              {resumeTarget
                ? `${t('Surah')} ${resumeTarget.surah}:${resumeTarget.ayah} · ${t('Continue')}`
                : `${t('The Opening')} · ${t('Ayah')} 1`}
            </Text>
          </View>
          <View
            style={[
              styles.resumeIconWrap,
              {
                backgroundColor: colors.accent,
                width: isNarrow ? 32 : 36,
                height: isNarrow ? 32 : 36,
                borderRadius: isNarrow ? 16 : 18,
              },
            ]}
          >
            <Ionicons name={getForwardIcon('arrow')} size={isNarrow ? 16 : 18} color={colors.onAccent} />
          </View>
        </TouchableOpacity>

        {/* Recently Read */}
        {recentSurahs.length > 0 && (
          <View style={styles.recentSection}>
            <Text style={[styles.recentHeading, { color: colors.textMuted }]}>{t('RECENTLY READ')}</Text>
            <ScrollView
              horizontal
              nestedScrollEnabled
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={[styles.recentScroll, { gap: isNarrow ? 8 : 10 }, hScrollRTLStyle()]}
            >
              {recentSurahs.map((recent) => (
                <TouchableOpacity
                  key={recent.surah}
                  activeOpacity={0.7}
                  onPress={() => onOpenSurah(recent.surah)}
            pressRetentionOffset={{ top: 20, left: 40, right: 40, bottom: 20 }}
                  accessibilityRole="button"
                  accessibilityLabel={`${t('Open Surah')} ${recent.name}`}
                  style={[
                    styles.recentChip,
                    {
                      backgroundColor: colors.bgSurface,
                      borderColor: colors.borderSubtle,
                      paddingVertical: isCompact ? 8 : 10,
                      paddingHorizontal: isCompact ? 10 : 12,
                    },
                  ]}
                >
                  <View style={styles.recentChipTop}>
                    <View style={[styles.recentNumBadge, { backgroundColor: colors.accentDim }]}>
                      <Text style={[styles.recentNumText, { color: colors.accent }]}>
                        {recent.surah}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.recentChipName,
                        { color: colors.textPrimary, fontSize: isCompact ? 12 : 13 },
                      ]}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {recent.name}
                    </Text>
                  </View>
                  <ArabicText size={isCompact ? 14 : 16} numberOfLines={1} style={styles.recentChipArabic}>
                    {recent.arabicName}
                  </ArabicText>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Quick Hub Navigation Cards */}
        <View style={[styles.hubGrid, { gap: isNarrow ? 8 : 10 }]}>
          <TouchableOpacity
            style={[
              styles.hubCard,
              {
                backgroundColor: colors.bgSurface,
                borderColor: colors.borderSubtle,
                padding: isCompact ? 10 : isNarrow ? 11 : 12,
              },
            ]}
            onPress={onOpenAudio}
            pressRetentionOffset={{ top: 20, left: 40, right: 40, bottom: 20 }}
          >
            <View
              style={[
                styles.hubIconBox,
                {
                  backgroundColor: colors.accentDim,
                  width: isCompact ? 28 : 32,
                  height: isCompact ? 28 : 32,
                  marginBottom: isCompact ? 6 : 8,
                },
              ]}
            >
              <Ionicons name="headset-outline" size={isCompact ? 16 : 18} color={colors.accent} />
            </View>
            <Text
              style={[
                styles.hubCardTitle,
                { color: colors.textPrimary, fontSize: isCompact ? 12 : 13 },
              ]}
              numberOfLines={1}
            >
              {t('Audio Center')}
            </Text>
            <Text
              style={[
                styles.hubCardSub,
                { color: colors.textMuted, fontSize: isCompact ? 10 : 11 },
              ]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {t('Reciters & Playlists')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.hubCard,
              {
                backgroundColor: colors.bgSurface,
                borderColor: colors.borderSubtle,
                padding: isCompact ? 10 : isNarrow ? 11 : 12,
              },
            ]}
            onPress={onOpenTafsir}
            pressRetentionOffset={{ top: 20, left: 40, right: 40, bottom: 20 }}
          >
            <View
              style={[
                styles.hubIconBox,
                {
                  backgroundColor: colors.accentDim,
                  width: isCompact ? 28 : 32,
                  height: isCompact ? 28 : 32,
                  marginBottom: isCompact ? 6 : 8,
                },
              ]}
            >
              <Ionicons name="library-outline" size={isCompact ? 16 : 18} color={colors.accent} />
            </View>
            <Text
              style={[
                styles.hubCardTitle,
                { color: colors.textPrimary, fontSize: isCompact ? 12 : 13 },
              ]}
              numberOfLines={1}
            >
              {t('Tafsir')}
            </Text>
            <Text
              style={[
                styles.hubCardSub,
                { color: colors.textMuted, fontSize: isCompact ? 10 : 11 },
              ]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {t('Jalalayn Commentary')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.hubCard,
              {
                backgroundColor: colors.bgSurface,
                borderColor: colors.borderSubtle,
                padding: isCompact ? 10 : isNarrow ? 11 : 12,
              },
            ]}
            onPress={onOpenTopics}
            pressRetentionOffset={{ top: 20, left: 40, right: 40, bottom: 20 }}
          >
            <View
              style={[
                styles.hubIconBox,
                {
                  backgroundColor: colors.accentDim,
                  width: isCompact ? 28 : 32,
                  height: isCompact ? 28 : 32,
                  marginBottom: isCompact ? 6 : 8,
                },
              ]}
            >
              <Ionicons name="compass-outline" size={isCompact ? 16 : 18} color={colors.accent} />
            </View>
            <Text
              style={[
                styles.hubCardTitle,
                { color: colors.textPrimary, fontSize: isCompact ? 12 : 13 },
              ]}
              numberOfLines={1}
            >
              {t('Topics')}
            </Text>
            <Text
              style={[
                styles.hubCardSub,
                { color: colors.textMuted, fontSize: isCompact ? 10 : 11 },
              ]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {t('Thematic Passages')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.hubCard,
              {
                backgroundColor: colors.bgSurface,
                borderColor: colors.borderSubtle,
                padding: isCompact ? 10 : isNarrow ? 11 : 12,
              },
            ]}
            onPress={onOpenCompare}
            pressRetentionOffset={{ top: 20, left: 40, right: 40, bottom: 20 }}
          >
            <View
              style={[
                styles.hubIconBox,
                {
                  backgroundColor: colors.accentDim,
                  width: isCompact ? 28 : 32,
                  height: isCompact ? 28 : 32,
                  marginBottom: isCompact ? 6 : 8,
                },
              ]}
            >
              <Ionicons name="git-compare-outline" size={isCompact ? 16 : 18} color={colors.accent} />
            </View>
            <Text
              style={[
                styles.hubCardTitle,
                { color: colors.textPrimary, fontSize: isCompact ? 12 : 13 },
              ]}
              numberOfLines={1}
            >
              {t('Compare')}
            </Text>
            <Text
              style={[
                styles.hubCardSub,
                { color: colors.textMuted, fontSize: isCompact ? 10 : 11 },
              ]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {t('Dual Translations')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Secondary Hub Actions: Bookmarks, Notes, Plans, Hifz */}
        <View style={styles.hubChipsRow}>
          <ScrollView
            horizontal
            nestedScrollEnabled
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[styles.hubChipsScroll, { gap: isNarrow ? 6 : 8 }, hScrollRTLStyle()]}
          >
            <TouchableOpacity
              style={[
                styles.hubChip,
                {
                  backgroundColor: colors.bgSurface,
                  borderColor: colors.borderSubtle,
                  paddingHorizontal: isCompact ? 10 : 12,
                  paddingVertical: isCompact ? 6 : 7,
                },
              ]}
              onPress={onOpenBookmarks}
            pressRetentionOffset={{ top: 20, left: 40, right: 40, bottom: 20 }}
            >
              <Ionicons name="bookmark-outline" size={isCompact ? 13 : 14} color={colors.accent} />
              <Text
                style={[
                  styles.hubChipText,
                  { color: colors.textPrimary, fontSize: isCompact ? 11 : 12 },
                ]}
              >
                {t('Bookmarks')}
              </Text>
              {bookmarkCount > 0 && (
                <View style={[styles.hubChipBadge, { backgroundColor: colors.accentDim }]}>
                  <Text style={[styles.hubChipBadgeText, { color: colors.accent }]}>{bookmarkCount}</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.hubChip,
                {
                  backgroundColor: colors.bgSurface,
                  borderColor: colors.borderSubtle,
                  paddingHorizontal: isCompact ? 10 : 12,
                  paddingVertical: isCompact ? 6 : 7,
                },
              ]}
              onPress={onOpenNotes}
            pressRetentionOffset={{ top: 20, left: 40, right: 40, bottom: 20 }}
            >
              <Ionicons name="create-outline" size={isCompact ? 13 : 14} color={colors.accent} />
              <Text
                style={[
                  styles.hubChipText,
                  { color: colors.textPrimary, fontSize: isCompact ? 11 : 12 },
                ]}
              >
                {t('Notes')}
              </Text>
              {noteCount > 0 && (
                <View style={[styles.hubChipBadge, { backgroundColor: colors.accentDim }]}>
                  <Text style={[styles.hubChipBadgeText, { color: colors.accent }]}>{noteCount}</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.hubChip,
                {
                  backgroundColor: colors.bgSurface,
                  borderColor: colors.borderSubtle,
                  paddingHorizontal: isCompact ? 10 : 12,
                  paddingVertical: isCompact ? 6 : 7,
                },
              ]}
              onPress={onOpenPlans}
            pressRetentionOffset={{ top: 20, left: 40, right: 40, bottom: 20 }}
            >
              <Ionicons name="calendar-outline" size={isCompact ? 13 : 14} color={colors.accent} />
              <Text
                style={[
                  styles.hubChipText,
                  { color: colors.textPrimary, fontSize: isCompact ? 11 : 12 },
                ]}
              >
                {t('Reading Plans')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.hubChip,
                {
                  backgroundColor: colors.bgSurface,
                  borderColor: colors.borderSubtle,
                  paddingHorizontal: isCompact ? 10 : 12,
                  paddingVertical: isCompact ? 6 : 7,
                },
              ]}
              onPress={onOpenHifz}
            pressRetentionOffset={{ top: 20, left: 40, right: 40, bottom: 20 }}
            >
              <Ionicons name="school-outline" size={isCompact ? 13 : 14} color={colors.accent} />
              <Text
                style={[
                  styles.hubChipText,
                  { color: colors.textPrimary, fontSize: isCompact ? 11 : 12 },
                ]}
              >
                {t('Hifz Tracker')}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        <Hairline style={styles.sectionDivider} />

        {/* Search Bar */}
        <View style={styles.searchSection}>
          {/* Filter Picker */}
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
                      backgroundColor: isSelected ? colors.accentDim : colors.bgSurface,
                      borderColor: isSelected ? colors.accent : colors.borderSubtle,
                    },
                  ]}
                  onPress={() => setSearchFilter(filter)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                >
                  <Text
                    style={[
                      styles.searchFilterBtnText,
                      { color: isSelected ? colors.accent : colors.textSecondary },
                    ]}
                  >
                    {labels[filter]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Verse Reference Hint */}
          {verseRef && (
            <View
              style={[
                styles.verseRefHint,
                { backgroundColor: colors.accentDim, borderColor: colors.accent },
              ]}
            >
              <Ionicons name={getForwardIcon('arrow')} size={14} color={colors.accent} />
              <Text style={[styles.verseRefHintText, { color: colors.accent }]}>
                {t('Verse reference detected — jumping to')} <Text style={{ fontFamily: 'Manrope_700Bold' }}>
                  {surahs?.find((s) => s.number === verseRef.surah)?.englishName || `${t('Surah')} ${verseRef.surah}`} {verseRef.ayah}
                </Text>
              </Text>
            </View>
          )}

          {/* Recent Search Queries */}
          {searchHistory.length > 0 && !searchQuery && (
            <View style={styles.searchRecentWrap}>
              <View style={styles.searchRecentHeader}>
                <Text style={[styles.searchRecentLabel, { color: colors.textMuted }]}>{t('Recent searches')}</Text>
                <TouchableOpacity
                  onPress={clearSearchHistory}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  accessibilityRole="button"
                  accessibilityLabel={t('Clear surah search history')}
                >
                  <Text style={[styles.searchRecentClear, { color: colors.textMuted }]}>{t('Clear')}</Text>
                </TouchableOpacity>
              </View>
              <ScrollView
                horizontal
                nestedScrollEnabled
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={[styles.searchRecentScroll, hScrollRTLStyle()]}
              >
                {searchHistory.map((item) => (
                  <View
                    key={item}
                    style={[
                      styles.searchRecentChip,
                      { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle },
                    ]}
                  >
                    <TouchableOpacity
                      onPress={() => {
                        setSearchQuery(item);
                        addQuery(item);
                      }}
                      style={styles.searchRecentChipBtn}
                      accessibilityRole="button"
                      accessibilityLabel={`${t('Search for')} ${item}`}
                    >
                      <Ionicons name="time-outline" size={13} color={colors.accent} />
                      <Text style={[styles.searchRecentChipText, { color: colors.textPrimary }]} numberOfLines={1}>
                        {item}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => removeSearchHistoryQuery(item)}
                      style={styles.searchRecentChipRemove}
                      accessibilityRole="button"
                      accessibilityLabel={t('Remove from search history')}
                      hitSlop={{ top: 6, bottom: 6, left: 4, right: 6 }}
                    >
                      <Ionicons name="close" size={12} color={colors.textMuted} />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Empty History Hint */}
          {searchHistory.length === 0 && !searchQuery && !loading && (
            <View
              style={[
                styles.emptyHistoryHint,
                { backgroundColor: colors.bgRaised, borderColor: colors.borderSubtle },
              ]}
            >
              <Ionicons name="search-outline" size={16} color={colors.textMuted} />
              <Text style={[styles.emptyHistoryHintText, { color: colors.textSecondary }]}>
                {t('No recent searches yet. Type a surah name, meaning, or verse reference (e.g., "2:255").')}
              </Text>
            </View>
          )}

        </View>

        {/* Juz Filter Scroll */}
        <View style={[styles.juzRow, { gap: isNarrow ? 8 : 10 }]}>
          <Text style={[styles.juzLabel, { color: colors.textMuted }]}>{t('JUZ')}</Text>
          <ScrollView
            horizontal
            nestedScrollEnabled
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[
              styles.juzScroll,
              { gap: isNarrow ? 5 : 6 },
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
                    {
                      backgroundColor: isSelected ? colors.accent : colors.bgSurface,
                      borderColor: isSelected ? colors.accent : colors.borderSubtle,
                      paddingHorizontal: isCompact ? 9 : 11,
                      paddingVertical: isCompact ? 4 : 5,
                    },
                  ]}
                  onPress={() => handleSelectJuz(j)}
                >
                  <Text
                    style={[
                      styles.juzPillText,
                      {
                        color: isSelected ? colors.onAccent : colors.textSecondary,
                        fontSize: isCompact ? 11.5 : 12,
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
      </View>
    );
  }, [
    colors, isCompact, isNarrow, horizontalPadding,
    recentSurahs, searchHistory, selectedJuz, searchQuery, searchFilter, verseRef,
    bookmarkCount, noteCount, translatedNames, filteredSurahs,
    onOpenSurah, onOpenBookmarks, onOpenNotes, onOpenPlans, onOpenHifz,
    handleSelectJuz, setSearchFilter, setSearchQuery, addQuery, removeSearchHistoryQuery,
  ]);

  const renderSurahRow = ({ item }: { item: SurahMeta }) => {
    const trName = translatedNames?.[item.number];
    return (
      <TouchableOpacity
        style={[
          styles.surahRow,
          {
            borderBottomColor: colors.borderSubtle,
            paddingVertical: isCompact ? 11 : 14,
          },
        ]}
        onPress={() => onOpenSurah(item.number)}
            pressRetentionOffset={{ top: 20, left: 40, right: 40, bottom: 20 }}
        activeOpacity={0.7}
      >
        <View style={styles.surahLeft}>
          <View
            style={[
              styles.numberBadge,
              {
                backgroundColor: colors.bgSurface,
                borderColor: colors.borderSubtle,
                width: isCompact ? 30 : 34,
                height: isCompact ? 30 : 34,
              },
            ]}
          >
            <Text
              style={[
                styles.numberText,
                { color: colors.textSecondary, fontSize: isCompact ? 11 : 12 },
              ]}
            >
              {item.number}
            </Text>
          </View>
          <View style={styles.nameBlock}>
            <Text
              style={[
                styles.englishName,
                { color: colors.textPrimary, fontSize: isCompact ? 14 : 15 },
              ]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {item.englishName}
            </Text>
            <Text
              style={[
                styles.metaSubtitle,
                { color: colors.textMuted, fontSize: isCompact ? 11 : 12 },
              ]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {trName ? `${flag} ${trName} · ` : ''}{item.englishNameTranslation} · {item.numberOfAyahs} {t('ayahs')} · {t(item.revelationType)}
            </Text>
          </View>
        </View>
        <ArabicText
          size={isCompact ? 18 : 22}
          numberOfLines={1}
          style={styles.arabicName}
        >
          {item.name}
        </ArabicText>
      </TouchableOpacity>
    );
  };

  if (loading && (!surahs || surahs.length === 0)) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bgBase }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (error && (!surahs || surahs.length === 0)) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bgBase }]}>
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>{error}</Text>
        <TouchableOpacity
          style={[styles.retryBtn, { borderColor: colors.accent }]}
          onPress={loadData}
        >
          <Text style={[styles.retryBtnText, { color: colors.accent }]}>{t('Retry')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bgBase }]}>
      {/* Fixed search bar — OUTSIDE the FlatList header so the TextInput
          never remounts on keystroke (which was dropping keyboard focus). */}
      <View
        style={[
          styles.searchBar,
          styles.searchBarFixed,
          {
            backgroundColor: colors.bgSurface,
            borderColor: colors.borderSubtle,
          },
        ]}
      >
        <Ionicons name="search" size={16} color={colors.textMuted} />
        <TextInput
          style={[styles.searchInput, { color: colors.textPrimary, fontSize: isCompact ? 12.5 : 13 }]}
          placeholder={
            verseRef
              ? `${t('Jumping to')} ${surahs?.find((s) => s.number === verseRef?.surah)?.englishName || t('Surah')} ${verseRef?.ayah}…`
              : searchFilter === 'name'
              ? t('Search surah name…')
              : searchFilter === 'meaning'
              ? t('Search meaning…')
              : t('Search surah name or meaning…')
          }
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          onSubmitEditing={submitSearch}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        ref={listRef}
        data={filteredSurahs}
        keyExtractor={(item) => String(item.number)}
        renderItem={renderSurahRow}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={[styles.listContent, { paddingHorizontal: horizontalPadding }]}
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
              onAction={() => setSearchQuery('')}
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
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    borderRadius: 6,
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
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 40,
  },
  headerArea: {
    marginBottom: 6,
  },
  langBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 4,
    marginBottom: 4,
  },
  langBarLeft: {
    flex: 1,
    marginRight: 10,
  },
  langBarLabel: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 9.5,
    letterSpacing: 1,
    marginBottom: 2,
  },
  langBarTitle: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
  },
  langChangeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  langChangeBtnText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
  },
  preloadBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 6,
    marginBottom: 4,
  },
  preloadLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  preloadIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  preloadTextCol: {
    flex: 1,
  },
  preloadTitle: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
  },
  preloadSubtitle: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 10.5,
    marginTop: 1,
  },
  preloadTrack: {
    height: 3,
    borderRadius: 1.5,
    overflow: 'hidden',
    marginTop: 4,
    width: '95%',
  },
  preloadFill: {
    height: '100%',
    borderRadius: 1.5,
  },
  preloadActionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
  },
  preloadActionText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
  },
  continueCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 10,
    marginBottom: 14,
  },
  continueLeft: {
    flex: 1,
  },
  continueBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginBottom: 6,
  },
  continueBadgeText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 10,
    letterSpacing: 0.5,
  },
  continueSurahName: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 22,
  },
  continueAyahText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
    marginTop: 2,
  },
  resumeIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  recentSection: {
    marginBottom: 14,
  },
  recentHeading: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 10,
    letterSpacing: 1,
    marginBottom: 8,
  },
  recentScroll: {},
  recentChip: {
    borderRadius: 10,
    borderWidth: 1,
    minWidth: 116,
    maxWidth: 170,
  },
  recentChipTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  recentNumBadge: {
    width: 18,
    height: 18,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  recentNumText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 9,
  },
  recentChipName: {
    fontFamily: 'Manrope_600SemiBold',
    flexShrink: 1,
  },
  recentChipArabic: {
    marginTop: 4,
    textAlign: 'right',
  },
  hubGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  hubCard: {
    flexBasis: '47%',
    flexGrow: 1,
    minWidth: 0,
    borderRadius: 10,
    borderWidth: 1,
  },
  hubIconBox: {
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hubCardTitle: {
    fontFamily: 'Manrope_600SemiBold',
  },
  hubCardSub: {
    fontFamily: 'Manrope_400Regular',
    marginTop: 2,
  },
  hubChipsRow: {
    marginBottom: 10,
  },
  hubChipsScroll: {},
  hubChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  hubChipText: {
    fontFamily: 'Manrope_600SemiBold',
  },
  hubChipBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  hubChipBadgeText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 10,
  },
  sectionDivider: {
    marginVertical: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    height: 42,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  searchBarFixed: {
    marginHorizontal: 20,
    marginTop: 12,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Manrope_400Regular',
  },
  juzRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  searchRecentWrap: {
    marginBottom: 12,
  },
  searchRecentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  searchRecentLabel: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
    letterSpacing: 0.2,
  },
  searchRecentClear: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
  },
  searchRecentScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingRight: 4,
  },
  searchRecentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    paddingLeft: 8,
    paddingRight: 4,
    height: 28,
  },
  searchRecentChipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  searchRecentChipText: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
    maxWidth: 140,
  },
  searchRecentChipRemove: {
    padding: 4,
    marginLeft: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  juzLabel: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
    letterSpacing: 0.5,
  },
  juzScroll: {},
  juzPill: {
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  juzPillText: {
    fontFamily: 'Manrope_600SemiBold',
  },
  surahRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 8,
  },
  surahLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  numberBadge: {
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  numberText: {
    fontFamily: 'Manrope_600SemiBold',
  },
  nameBlock: {
    flex: 1,
    minWidth: 0,
  },
  englishName: {
    fontFamily: 'Manrope_600SemiBold',
  },
  metaSubtitle: {
    fontFamily: 'Manrope_400Regular',
    marginTop: 2,
  },
  arabicName: {
    marginLeft: 6,
    flexShrink: 0,
    maxWidth: '38%',
    textAlign: 'right',
  },
  searchSection: {
    marginBottom: 12,
  },
  searchFilterRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  searchFilterBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  searchFilterBtnText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
  },
  verseRefHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 6,
  },
  verseRefHintText: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
    flex: 1,
  },
  emptyHistoryHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 8,
  },
  emptyHistoryHintText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    lineHeight: 18,
    flex: 1,
  },
});
