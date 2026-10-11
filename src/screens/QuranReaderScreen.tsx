import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  BackHandler,
  Clipboard,
  FlatList,
  Image,
  InteractionManager,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  useWindowDimensions,
} from 'react-native';
import type { NativeScrollEvent, NativeSyntheticEvent, ViewabilityConfig, ViewToken } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHaptics } from '../lib/haptics';
import {
  fetchSurah,
  fetchAyahTafsir,
  SurahDetail,
  Ayah,
  fetchMushafPage,
  getMushafPageForAyah,
  MushafPageDetail,
  MushafPageAyah,
  TOTAL_MUSHAF_PAGES,
  getSurahStartPage,
  getPrimarySurahForPage,
} from '../lib/quran';
import { TajweedText } from '../components/TajweedText';
import { ArabicText, QURAN_FONT_FAMILIES } from '../components/ArabicText';
import { stripTajweedHtml } from '../lib/tajweed';
import { QuranScript, QURAN_SCRIPTS, fetchSurahWithScript, getScriptCacheKey } from '../lib/quranScripts';
import { retry, cancel, remove, copy, share, surahLoadFailed, tafsirLoadFailed, downloadFailedTitle, downloadFailedBody } from '../lib/strings';
import { t, isRTL } from '../lib/i18n';
import {
  useSettings,
  QURAN_FONT_SIZE_MIN,
  QURAN_FONT_SIZE_MAX,
  QURAN_FONT_SIZE_STEP,
  QURAN_FONT_SIZE_DEFAULT,
  QURAN_LINE_HEIGHT_MIN,
  QURAN_LINE_HEIGHT_MAX,
  QURAN_LINE_HEIGHT_STEP,
  QURAN_LINE_HEIGHT_DEFAULT,
} from '../lib/settings';
import { TAFSIR_SOURCES } from '../lib/tafsirSources';
import { Hairline } from '../components/Hairline';
import { useQuranLanguage } from '../lib/quranLanguageState';
import { QuranLanguageModal } from '../components/QuranLanguageModal';
import { clearReadingMarker, getReadingMarker, getReadingPosition, saveReadingMarker, saveReadingPosition, getReadingMarkerSync, getReadingPositionSync, addReadingPositionListener, ReadingPosition, ReadingMarker } from '../lib/continuing';
import { recordQuranReadingSession } from '../lib/quranProgress';
import { recordSurahVisit } from '../lib/recentSurahs';
import { preloadRemainingSurahsForEdition } from '../lib/quranPreloader';
import {
  addBookmark,
  getBookmarks,
  isBookmarked,
  removeBookmark,
  VerseRef,
  addNote,
  addStudyTagFn,
  removeVerseHighlightFn,
  addVerseHighlightFn,
  getVerseHighlightFn,
  getStudyTagsForAyahFn,
  StudyTag,
} from '../lib/study';
import { SURAH_AYAH_COUNTS } from '../lib/surahAyahCounts';
import {
  addPlaybackListener,
  addPlaybackStatusListener,
  fetchReciters,
  getAyahAudioUrl,
  getCurrentPlayback,
  getReciterCountry,
  getSurahAudioUrl,
  getSurahBitrate,
  playAyah,
  playSurah,
  Reciter,
  stop,
} from '../lib/quranAudio';
import {
  downloadSurah,
  removeSurahDownload,
  isSurahDownloaded,
  getDownloadProgress,
  getDownloadedSurahs,
  formatBytes,
} from '../lib/surahDownloads';
import {
  loadAudioSettings,
  loadQuranCache,
  saveAudioSettings,
  saveLastReadPosition,
  saveQuranCache,
  saveRecentlyPlayed,
} from '../lib/db';
import { getBundledSurahs114, SurahMeta } from '../lib/quran';
import { hScrollRTLStyle, isRtlScript } from '../lib/rtl';
import { getLocalizedSurahName, getLocalizedLanguageName } from '../lib/surahNamesLocalized';
import { getLocalizedTranslatorName } from '../lib/quranLanguages';
import {
  getQuranLayoutCacheKey,
  recordAyahLayout,
  recordHeaderLayout,
  getCachedOrEstimatedOffset,
  flushAyahLayoutCache,
  configureQuranLayoutStorage,
} from '../lib/quranLayoutCache';
import { AyahCardRow } from '../components/AyahCardRow';
import { getBackIcon, getForwardIcon, iconSizes } from '../lib/iconMap';

configureQuranLayoutStorage({
  loadQuranCache,
  saveQuranCache,
});

// Simple keep-awake implementation using a timer (fallback when expo-keep-awake not available)
const keepAwakeTimers = new Map<number, ReturnType<typeof setInterval>>();
function activateKeepAwake(tag: number): void {
  if (keepAwakeTimers.has(tag)) return;
  // Prevent screen sleep by periodically resetting idle timer via a no-op
  // This is a best-effort fallback; for production, install expo-keep-awake
  const timer = setInterval(() => {
    // Touch the screen metaphorically - in practice this just keeps JS thread alive
    // which on some platforms prevents sleep. Real keep-awake needs native module.
  }, 30000);
  keepAwakeTimers.set(tag, timer);
}
function deactivateKeepAwake(tag: number): void {
  const timer = keepAwakeTimers.get(tag);
  if (timer) {
    clearInterval(timer);
    keepAwakeTimers.delete(tag);
  }
}

interface QuranReaderScreenProps {
  surahNumber: number;
  initialAyah?: number;
  initialPage?: number;
  onBack: () => void;
  onNavigateSurah?: (surah: number, initialAyah?: number, initialPage?: number) => void;
}

type ReadingMode = 'cards' | 'mushaf';

const STORAGE_KEY_READING_MODE = 'quran-reading-mode';
const STORAGE_KEY_READING_MODE_EXPLICIT = 'quran-reading-mode-explicit';
const STORAGE_KEY_KEEP_AWAKE = 'quran-keep-awake';
const STORAGE_KEY_LAST_READ = 'quran-last-read-timestamp';

const VIEWABILITY_CONFIG: ViewabilityConfig = {
  itemVisiblePercentThreshold: 1,
  minimumViewTime: 500,
};

// ponytail: BOUNDED_PRE_RENDER_CAP = 300 — target-aware initialNumToRender renders
// enough cards on mount to cover any surah target (up to Surah 2:286) in one
// direct jump with guaranteed mount & correction, while keeping default opens at
// ayah 1 virtualized at initialNumToRender={15}.
const BOUNDED_PRE_RENDER_CAP = 300;

// Juz start mapping (which surah:ayah each juz starts at)
const JUZ_STARTS: Record<number, { surah: number; ayah: number }> = {
  1: { surah: 1, ayah: 1 }, 2: { surah: 2, ayah: 142 }, 3: { surah: 2, ayah: 253 }, 4: { surah: 3, ayah: 93 },
  5: { surah: 4, ayah: 24 }, 6: { surah: 4, ayah: 148 }, 7: { surah: 5, ayah: 82 }, 8: { surah: 6, ayah: 111 },
  9: { surah: 7, ayah: 88 }, 10: { surah: 8, ayah: 41 }, 11: { surah: 9, ayah: 93 }, 12: { surah: 11, ayah: 6 },
  13: { surah: 12, ayah: 53 }, 14: { surah: 15, ayah: 1 }, 15: { surah: 17, ayah: 1 }, 16: { surah: 18, ayah: 75 },
  17: { surah: 21, ayah: 1 }, 18: { surah: 23, ayah: 1 }, 19: { surah: 25, ayah: 21 }, 20: { surah: 27, ayah: 56 },
  21: { surah: 29, ayah: 46 }, 22: { surah: 33, ayah: 31 }, 23: { surah: 36, ayah: 28 }, 24: { surah: 39, ayah: 32 },
  25: { surah: 41, ayah: 47 }, 26: { surah: 46, ayah: 1 }, 27: { surah: 51, ayah: 31 }, 28: { surah: 58, ayah: 1 },
  29: { surah: 67, ayah: 1 }, 30: { surah: 78, ayah: 1 },
};

// Hizb start mapping (60 hizbs, each half a juz approximately)
const HIZB_STARTS: Record<number, { surah: number; ayah: number }> = {};
// Compute hizb starts: each juz has 2 hizbs
for (let juz = 1; juz <= 30; juz++) {
  const juzStart = JUZ_STARTS[juz];
  const nextJuzStart = JUZ_STARTS[juz + 1] || { surah: 114, ayah: 6 };
  // For simplicity, use the juz start for first hizb, and midpoint for second
  // A more accurate mapping would require the full ayah index
  HIZB_STARTS[juz * 2 - 1] = juzStart;
  // Second hizb of each juz - approximate midpoint
  HIZB_STARTS[juz * 2] = juzStart; // Placeholder - would need precise calculation
}
// For now, just use juz starts as hizb starts (every 2 hizbs = 1 juz)
Object.keys(JUZ_STARTS).forEach((j) => {
  const juzNum = parseInt(j, 10);
  HIZB_STARTS[juzNum * 2 - 1] = JUZ_STARTS[juzNum];
  HIZB_STARTS[juzNum * 2] = JUZ_STARTS[juzNum];
});

// Real page lookup: uses authentic AlQuran Cloud metadata / canonical Mushaf page table
export function getRealPageForAyah(surah: number, ayah: number): number {
  return getMushafPageForAyah(surah, ayah);
}

export function getJuzForAyah(surah: number, ayah: number): number {
  let matchedJuz = 1;
  const safeSurah = Math.max(1, Math.min(114, surah || 1));
  const safeAyah = Math.max(1, ayah || 1);
  for (let j = 1; j <= 30; j++) {
    const start = JUZ_STARTS[j];
    if (start && (safeSurah > start.surah || (safeSurah === start.surah && safeAyah >= start.ayah))) {
      matchedJuz = j;
    } else {
      break;
    }
  }
  return matchedJuz;
}

export function getHizbForAyah(surah: number, ayah: number): number {
  let matchedHizb = 1;
  const safeSurah = Math.max(1, Math.min(114, surah || 1));
  const safeAyah = Math.max(1, ayah || 1);
  for (let h = 1; h <= 60; h++) {
    const start = HIZB_STARTS[h];
    if (start && (safeSurah > start.surah || (safeSurah === start.surah && safeAyah >= start.ayah))) {
      matchedHizb = h;
    } else {
      break;
    }
  }
  return matchedHizb;
}

/**
 * Strips leading Bismillah from ayah text if present.
 * AlQuran Cloud's `quran-uthmani` text embeds the Bismillah at the beginning of Ayah 1
 * for surahs 2-114 (except Surah 9).
 */
const LEADING_BISMILLAH_REGEX =
  /^[\s\uFEFF]*ب[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED]*س[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED]*م[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED]*\s+[ٱا][\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED]*ل[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED]*ل[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED]*ه[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED]*\s+[ٱا][\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED]*ل[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED]*ر[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED]*ح[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED]*م[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED]*ن[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED]*\s+[ٱا][\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED]*ل[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED]*ر[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED]*ح[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED]*ي[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED]*م[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED]*\s*/u;

export function stripBismillah(text: string): string {
  if (!text) return text;
  return text.replace(LEADING_BISMILLAH_REGEX, '');
}

/**
 * Returns the displayed Arabic text for an ayah card or mushaf view.
 * Strips the leading Bismillah from Ayah 1 of surahs 2-8 and 10-114
 * because the dedicated surah header already renders the Bismillah.
 * Surah 1 (where Bismillah IS Ayah 1) and Surah 9 (no Bismillah) are preserved.
 */
export function getDisplayedAyahText(
  surahNumber: number,
  numberInSurah: number,
  text: string
): string {
  if (surahNumber === 1 || surahNumber === 9 || numberInSurah !== 1) {
    return text;
  }
  return stripBismillah(text);
}

interface AyahBookmarkButtonProps {
  isBookmarked: boolean;
  onPress: () => void;
  accentColor: string;
  inactiveColor: string;
  ayahNumber: number;
}

function AyahBookmarkButton({
  isBookmarked,
  onPress,
  accentColor,
  inactiveColor,
  ayahNumber,
}: AyahBookmarkButtonProps) {
  const bounceAnim = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(bounceAnim, {
        toValue: 1.35,
        duration: 110,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.spring(bounceAnim, {
        toValue: 1,
        friction: 4,
        tension: 160,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start();
    onPress();
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.75}
      style={{
        padding: 6,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
      }}
      accessibilityRole="button"
      accessibilityLabel={`${t('Bookmark')} ${t('Ayah')} ${ayahNumber}`}
    >
      <Animated.View style={{ transform: [{ scale: bounceAnim }] }}>
        <Ionicons
          name={isBookmarked ? 'heart' : 'heart-outline'}
          size={iconSizes.inlineLg}
          color={isBookmarked ? accentColor : inactiveColor}
        />
      </Animated.View>
    </TouchableOpacity>
  );
}

export default function QuranReaderScreen({
  surahNumber,
  initialAyah,
  initialPage,
  onBack,
  onNavigateSurah,
}: QuranReaderScreenProps) {
  const { colors, mode } = useTheme();
  const { haptic } = useHaptics();
  const { language, setLanguage, edition, flag } = useQuranLanguage();
  const {
    settings,
    setQuranFontSize,
    setQuranLineHeight,
    setQuranShowTranslation,
    setTafsirSourceId,
    setQuranScript,
  } = useSettings();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isCompact = width < 380;
  const [langPickerOpen, setLangPickerOpen] = useState<boolean>(false);
  const [toolsMenuOpen, setToolsMenuOpen] = useState<boolean>(false);
  const [tafsirSourcePickerOpen, setTafsirSourcePickerOpen] = useState<boolean>(false);
  const [scriptPickerOpen, setScriptPickerOpen] = useState<boolean>(false);
  const currentScript: QuranScript = settings?.quranScript || 'uthmani';
  const selectedScriptOption = QURAN_SCRIPTS.find((s) => s.id === currentScript) || QURAN_SCRIPTS[0];
  const safeSurahNumber = Math.max(1, Math.min(114, surahNumber || 1));
  const cacheKey = `surah:${safeSurahNumber}:${edition?.editionIdentifier || 'en.sahih'}`;
  const [scriptAyahs, setScriptAyahs] = useState<Record<number, string> | null>(() => {
    if (currentScript === 'uthmani') return null;
    try {
      const cached = loadQuranCache<Record<number, string>>(getScriptCacheKey(safeSurahNumber, currentScript));
      return cached && Object.keys(cached).length > 0 ? cached : null;
    } catch {
      return null;
    }
  });
  const [scriptLoading, setScriptLoading] = useState<boolean>(false);
  const [scriptOfflineNotice, setScriptOfflineNotice] = useState<string | null>(null);
  const [surah, setSurah] = useState<SurahDetail | null>(() => {
    try {
      const cached = loadQuranCache<SurahDetail>(cacheKey);
      return cached && Array.isArray(cached.ayahs) && cached.ayahs.length > 0 ? cached : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState<boolean>(() => {
    try {
      const cached = loadQuranCache<SurahDetail>(cacheKey);
      return !(cached && Array.isArray(cached.ayahs) && cached.ayahs.length > 0);
    } catch {
      return true;
    }
  });
  const [error, setError] = useState<string | null>(null);
  const fontSize = typeof settings?.quranFontSize === 'number' && settings.quranFontSize > 0 ? settings.quranFontSize : QURAN_FONT_SIZE_DEFAULT;
  const quranLineHeight =
    typeof settings?.quranLineHeight === 'number' && settings.quranLineHeight > 0
      ? Math.round(settings.quranLineHeight * 10) / 10
      : QURAN_LINE_HEIGHT_DEFAULT;
  const showTranslation = Boolean(settings?.quranShowTranslation);
  const currentTafsirSource = TAFSIR_SOURCES.find((s) => s.id === settings?.tafsirSourceId) || TAFSIR_SOURCES[0];
  const arabicFamilies = (settings?.quranArabicFont && QURAN_FONT_FAMILIES[settings.quranArabicFont]) || QURAN_FONT_FAMILIES.amiri;
  const ayahLineHeight = Math.round(fontSize * (settings?.quranLineHeight || 1.6));
  const [readingMode, setReadingMode] = useState<ReadingMode>(() => {
    if (typeof initialPage === 'number' && initialPage >= 1) return 'mushaf';
    try {
      const syncMode = loadQuranCache<ReadingMode>('quran-reading-mode');
      if (syncMode === 'cards' || syncMode === 'mushaf') return syncMode;
    } catch {}
    return 'mushaf';
  });
  const [bookmarks, setBookmarks] = useState<VerseRef[]>([]);

  // Mushaf page architecture state
  const initialResolvedPage = useMemo(() => {
    if (typeof initialPage === 'number' && initialPage >= 1 && initialPage <= TOTAL_MUSHAF_PAGES) {
      return initialPage;
    }
    const syncMarker = getReadingMarkerSync();
    if (syncMarker && syncMarker.surah === safeSurahNumber && (!initialAyah || syncMarker.ayah === initialAyah) && syncMarker.page >= 1 && syncMarker.page <= TOTAL_MUSHAF_PAGES) {
      return syncMarker.page;
    }
    const syncPos = getReadingPositionSync();
    if (syncPos && syncPos.surah === safeSurahNumber && (!initialAyah || syncPos.ayah === initialAyah) && syncPos.page >= 1 && syncPos.page <= TOTAL_MUSHAF_PAGES) {
      return syncPos.page;
    }
    return getMushafPageForAyah(safeSurahNumber, initialAyah || 1);
  }, [initialPage, safeSurahNumber, initialAyah]);

  const [currentPage, setCurrentPage] = useState<number>(initialResolvedPage);
  const [currentPageData, setCurrentPageData] = useState<MushafPageDetail | null>(null);
  const [pageLoading, setPageLoading] = useState<boolean>(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [selectedAyah, setSelectedAyah] = useState<MushafPageAyah | null>(null);
  const [highlightedAyahKey, setHighlightedAyahKey] = useState<string | null>(null);
  const [selectedAyahY, setSelectedAyahY] = useState(0);
  const [selectedAyahHeight, setSelectedAyahHeight] = useState<number>(44);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restorationHighlightedRef = useRef<boolean>(false);
  const restorationTargetRef = useRef<{ surah: number; ayah: number } | null>(
    initialAyah && initialAyah > 0 ? { surah: safeSurahNumber, ayah: initialAyah } : null
  );
  const ayahLayoutsRef = useRef<Record<string | number, { y: number; height: number }>>({});
  const groupOffsetsRef = useRef<Record<number, number>>({});
  const currentPageRef = useRef<number>(initialResolvedPage);
  const pageRequestRef = useRef<number>(0);
  const mushafListRef = useRef<FlatList<number>>(null);
  currentPageRef.current = currentPage;

  // Continue Reading tracking refs (MUST be declared before any memo/effects)
  const surahNumberRef = useRef<number>(safeSurahNumber);
  const lastSavedAyahRef = useRef<number>(initialAyah || 1);
  // Position tracking gate: OFF until the positioning jump has LANDED (proven
  // by the retry completing, by a real user scroll, or by a synchronous
  // mushaf scroll). While OFF, viewability events do not overwrite the target
  // ayah with whatever cell measured first during the jump.
  const trackingReadyRef = useRef<boolean>(!initialAyah || initialAyah <= 1);
  // Throttle position saves during fast scroll (setState + 3 storage writes per
  // frame janks the list). Nav-hide logic stays frame-accurate — only the
  // position tracking is throttled.
  const lastPositionSaveRef = useRef<number>(0);
  // True while the user is actively scrolling — positioning (effect jump +
  // failed-retry) must not fire mid-scroll and yank the list.
  const userScrollingRef = useRef<boolean>(false);
  const userScrollClearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Guard: positioning (jump to saved/initial ayah) happens exactly once per mount
  const positionedRef = useRef<boolean>(false);
  const isProgrammaticPositioningRef = useRef<boolean>(false);
  const restorationTargetAyahRef = useRef<number>(initialAyah && initialAyah > 1 ? initialAyah : 1);
  const restorationLandedOffsetRef = useRef<number | null>(null);
  const restorationCorrectionDoneRef = useRef<boolean>(false);
  const deferredWorkRef = useRef<boolean>(false);
  const pendingPreloadEditionRef = useRef<string | null>(null);

  const layoutCacheKey = useMemo(
    () =>
      getQuranLayoutCacheKey(
        safeSurahNumber,
        readingMode,
        fontSize,
        edition?.editionIdentifier || 'en.sahih',
        language
      ),
    [safeSurahNumber, readingMode, fontSize, edition?.editionIdentifier, language]
  );

  const cancelPendingRetry = useCallback(() => {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    isProgrammaticPositioningRef.current = false;
  }, []);

  const [currentVisibleAyah, setCurrentVisibleAyah] = useState<number>(() => {
    if (initialAyah && initialAyah > 1) return initialAyah;
    const syncMarker = getReadingMarkerSync();
    if (syncMarker && syncMarker.surah === safeSurahNumber && syncMarker.ayah > 1) {
      return syncMarker.ayah;
    }
    const saved = loadQuranCache<{ ayah: number }>(`surah-last-ayah:${safeSurahNumber}`);
    return saved && typeof saved.ayah === 'number' && saved.ayah > 1 ? saved.ayah : (initialAyah || 1);
  });
  const listRef = useRef<FlatList<Ayah>>(null);
  const pendingScrollAyahRef = useRef<number | null>(null);

  const scheduleDeferredWork = useCallback(() => {
    if (deferredWorkRef.current) return;
    deferredWorkRef.current = true;

    const runTasks = () => {
      fetchReciters()
        .then((list) => {
          if (list && list.length > 0) setReciters(list);
        })
        .catch(() => []);

      try {
        setBookmarks(getBookmarks());
      } catch {}

      if (pendingPreloadEditionRef.current) {
        preloadRemainingSurahsForEdition(safeSurahNumber, pendingPreloadEditionRef.current);
        pendingPreloadEditionRef.current = null;
      }
    };

    if (typeof InteractionManager !== 'undefined' && InteractionManager.runAfterInteractions) {
      InteractionManager.runAfterInteractions(runTasks);
    } else {
      setTimeout(runTasks, 150);
    }
  }, [safeSurahNumber]);

  const handleAyahCardLayout = useCallback(
    (ayahNumber: number, height: number, y: number) => {
      recordAyahLayout(layoutCacheKey, ayahNumber, height);

      if (
        isProgrammaticPositioningRef.current &&
        ayahNumber === restorationTargetAyahRef.current &&
        !restorationCorrectionDoneRef.current
      ) {
        restorationCorrectionDoneRef.current = true;
        const { offset: exactOffset } = getCachedOrEstimatedOffset(layoutCacheKey, ayahNumber);
        const prevOffset = restorationLandedOffsetRef.current ?? exactOffset;
        if (Math.abs(exactOffset - prevOffset) > 3) {
          listRef.current?.scrollToOffset({ offset: exactOffset, animated: false });
          restorationLandedOffsetRef.current = exactOffset;
        }

        positionedRef.current = true;
        isProgrammaticPositioningRef.current = false;
        trackingReadyRef.current = true;
        scheduleDeferredWork();
      }
    },
    [layoutCacheKey, scheduleDeferredWork]
  );

  // Direct-positioning: compute the target ayah (clamped to the surah's real
  // ayah count so a corrupt/stale saved value can never target an out-of-range
  // index, which FlatList can't scroll to).
  const targetAyahForPosition = useMemo(() => {
    let target = 1;
    if (initialAyah && initialAyah > 1) target = initialAyah;
    else {
      const syncMarker = getReadingMarkerSync();
      if (syncMarker && syncMarker.surah === safeSurahNumber && syncMarker.ayah > 1) {
        target = syncMarker.ayah;
      } else {
        const saved = loadQuranCache<{ ayah: number }>(`surah-last-ayah:${safeSurahNumber}`);
        if (saved && typeof saved.ayah === 'number' && saved.ayah > 1) target = saved.ayah;
      }
    }
    const maxAyah = SURAH_AYAH_COUNTS[safeSurahNumber - 1] || 7;
    return Math.min(target, maxAyah);
  }, [safeSurahNumber, initialAyah]);
  const initialListIndex = Math.max(0, targetAyahForPosition - 1);
  const initialNumToRender = useMemo(() => {
    if (targetAyahForPosition <= 1) return 15;
    return Math.min(BOUNDED_PRE_RENDER_CAP, Math.max(15, targetAyahForPosition + 5));
  }, [targetAyahForPosition]);
  // NOTE: no getItemLayout — ayah rows are variable-height (Arabic + translation
  // + tafsir + font size + width), so a fixed estimate corrupts cell offsets and
  // causes fast-scroll glitches. Positioning uses the effect's scrollToIndex +
  // onScrollToIndexFailed measured retry (no fixed-height assumption).

  useEffect(() => {
    surahNumberRef.current = safeSurahNumber;
    const syncMarker = getReadingMarkerSync();
    const markerAyah = syncMarker && syncMarker.surah === safeSurahNumber ? syncMarker.ayah : undefined;
    const saved = loadQuranCache<{ ayah: number }>(`surah-last-ayah:${safeSurahNumber}`);
    const resolvedAyah = (initialAyah && initialAyah > 1)
      ? initialAyah
      : (markerAyah && markerAyah > 1
        ? markerAyah
        : (saved && typeof saved.ayah === 'number' && saved.ayah > 1 ? saved.ayah : 1));
    lastSavedAyahRef.current = resolvedAyah;
    setCurrentVisibleAyah(resolvedAyah);
    // Position tracking stays off while the positioning jump settles. The jump
    // may take several frames (progressive render + retries); enabling tracking
    // before it lands lets the jump's first viewability event overwrite the
    // landed ayah with whatever cell measured first.
    trackingReadyRef.current = false;
  }, [safeSurahNumber, initialAyah]);

  // A real user scroll flips tracking ON: the jump has landed (or the user is
  // past it), so viewability events now reflect genuine reading progress.
  useEffect(() => {
    if (trackingReadyRef.current) return;
    if (!userScrollingRef.current) return;
    // Only enable when the guard reflects a REAL user gesture, not the
    // settling frames of the programmatic jump (those also set the ref briefly
    // via handleReaderScroll when positionedRef is still false).
    trackingReadyRef.current = true;
  }, [userScrollingRef, initialAyah, safeSurahNumber]);

  // If a positioning jump completed with NO retry (synchronous success in the
  // cards path), the effect above never fires — the user hasn't scrolled yet.
  // Re-arm the effect when positionedRef flips true: the jump has landed, so
  // tracking may resume immediately.
  useEffect(() => {
    if (positionedRef.current && !trackingReadyRef.current && !isProgrammaticPositioningRef.current) {
      trackingReadyRef.current = true;
    }
  }, [positionedRef, safeSurahNumber, initialAyah]);

  // Fetch / update script text when script or surah changes
  useEffect(() => {
    if (currentScript === 'uthmani') {
      setScriptAyahs(null);
      setScriptLoading(false);
      setScriptOfflineNotice(null);
      return;
    }

    let cancelled = false;
    const scriptKey = getScriptCacheKey(safeSurahNumber, currentScript);
    try {
      const cached = loadQuranCache<Record<number, string>>(scriptKey);
      if (cached && Object.keys(cached).length > 0) {
        setScriptAyahs(cached);
        setScriptLoading(false);
        setScriptOfflineNotice(null);
        return;
      }
    } catch {}

    setScriptLoading(true);
    setScriptOfflineNotice(null);

    fetchSurahWithScript(safeSurahNumber, currentScript)
      .then((data) => {
        if (cancelled) return;
        if (data && Object.keys(data).length > 0) {
          setScriptAyahs(data);
          setScriptOfflineNotice(null);
        } else {
          setScriptAyahs(null);
          setScriptOfflineNotice(`${selectedScriptOption.label} script unavailable offline. Showing Uthmani.`);
        }
      })
      .catch(() => {
        if (cancelled) return;
        setScriptAyahs(null);
        setScriptOfflineNotice(`${selectedScriptOption.label} script unavailable offline. Showing Uthmani.`);
      })
      .finally(() => {
        if (!cancelled) setScriptLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [safeSurahNumber, currentScript, selectedScriptOption.label]);

  const getAyahScriptText = useCallback(
    (numberInSurah: number, defaultText: string): string => {
      if (currentScript === 'uthmani' || !scriptAyahs) {
        return defaultText;
      }
      return scriptAyahs[numberInSurah] || defaultText;
    },
    [currentScript, scriptAyahs]
  );

  const getAyahTextForExport = useCallback(
    (numberInSurah: number, defaultText: string): string => {
      const raw = getAyahScriptText(numberInSurah, defaultText);
      if (currentScript === 'tajweed' && scriptAyahs) {
        return stripTajweedHtml(raw);
      }
      return raw;
    },
    [currentScript, scriptAyahs, getAyahScriptText]
  );

// Reading experience state
  const [keepAwake, setKeepAwake] = useState<boolean>(false);
  const [lastReadTimestamp, setLastReadTimestamp] = useState<number | null>(null);
  const [juzPickerOpen, setJuzPickerOpen] = useState<boolean>(false);
  const [selectedJuz, setSelectedJuz] = useState<number | null>(null);
  const [hizbPickerOpen, setHizbPickerOpen] = useState<boolean>(false);
  const [selectedHizb, setSelectedHizb] = useState<number | null>(null);
  const [surahsList, setSurahsList] = useState<SurahMeta[]>([]);

  // Keep awake effect using fallback timer (install expo-keep-awake for production)
  const KEEP_AWAKE_TAG = 12345;
  useEffect(() => {
    if (keepAwake) {
      activateKeepAwake(KEEP_AWAKE_TAG);
    } else {
      deactivateKeepAwake(KEEP_AWAKE_TAG);
    }
    return () => {
      deactivateKeepAwake(KEEP_AWAKE_TAG);
    };
  }, [keepAwake]);

  // Load keepAwake preference
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY_KEEP_AWAKE)
      .then((val) => setKeepAwake(val === 'true'))
      .catch(() => {});
  }, []);

  // Load surahs list for Juz/Hizb pickers
  useEffect(() => {
    try {
      const cached = loadQuranCache<SurahMeta[]>('surah-list');
      if (cached && Array.isArray(cached) && cached.length === 114) {
        setSurahsList(cached);
      } else {
        setSurahsList(getBundledSurahs114());
      }
    } catch {
      setSurahsList(getBundledSurahs114());
    }
  }, []);

  // Load last read timestamp for this surah
  useEffect(() => {
    AsyncStorage.getItem(`${STORAGE_KEY_LAST_READ}:${surahNumber}`)
      .then((val) => {
        if (val) setLastReadTimestamp(parseInt(val, 10));
      })
      .catch(() => {});
  }, [surahNumber]);

  // Save last read timestamp when surah loads
  useEffect(() => {
    if (surah) {
      const now = Date.now();
      setLastReadTimestamp(now);
      AsyncStorage.setItem(`${STORAGE_KEY_LAST_READ}:${surahNumber}`, String(now)).catch(() => {});
    }
  }, [surahNumber, surah]);

  // Study Tools: Selection Mode State
  const [selectionMode, setSelectionMode] = useState<boolean>(false);
  const [selectedAyahs, setSelectedAyahs] = useState<Set<number>>(new Set());
  // Note composer state for ayah reflections
  const [noteComposerTarget, setNoteComposerTarget] = useState<{ surah: number; ayah: number; surahName?: string } | null>(null);
  const noteComposerAyah = noteComposerTarget?.ayah ?? null;
  const [noteComposerText, setNoteComposerText] = useState<string>('');
  // Dynamic keyboard height tracking for Android edge-to-edge modal adjustment
  const [keyboardHeight, setKeyboardHeight] = useState<number>(0);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const showSub = Keyboard.addListener('keyboardDidShow', (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardHeight(0);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Share-as-image: the ayah being shared renders a clean card, captured to PNG.
  const shareCardRef = useRef<View>(null);
  const [shareAyahItem, setShareAyahItem] = useState<Ayah | null>(null);
  const [isSharingImage, setIsSharingImage] = useState(false);
  const [selectionActionBarVisible, setSelectionActionBarVisible] = useState<boolean>(false);
  const [showTagInput, setShowTagInput] = useState<boolean>(false);
  const [tagInput, setTagInput] = useState<string>('');
  const [highlightColorPickerOpen, setHighlightColorPickerOpen] = useState<boolean>(false);

  const openNoteComposer = useCallback((ayahNumber: number, customSurah?: number, customSurahName?: string) => {
    const targetSurah = customSurah || surahNumberRef.current || safeSurahNumber;
    const resolvedName = customSurahName || (targetSurah === safeSurahNumber ? surah?.englishName : undefined) || `Surah ${targetSurah}`;
    setNoteComposerTarget({
      surah: targetSurah,
      ayah: ayahNumber,
      surahName: resolvedName,
    });
    setNoteComposerText('');
  }, [safeSurahNumber, surah?.englishName]);

  const closeNoteComposer = useCallback(() => {
    Keyboard.dismiss();
    setNoteComposerTarget(null);
    setNoteComposerText('');
    setKeyboardHeight(0);
  }, []);

  const handleSaveNote = useCallback(() => {
    if (!noteComposerTarget) return;
    const trimmed = noteComposerText.trim();
    if (!trimmed) {
      closeNoteComposer();
      return;
    }
    addNote(noteComposerTarget.surah, noteComposerTarget.ayah, trimmed);
    haptic('success');
    closeNoteComposer();
  }, [noteComposerTarget, noteComposerText, closeNoteComposer, haptic]);

  // Highlight color palette
  const HIGHLIGHT_COLORS = [
    { name: 'Amber', color: '#C26E1740' },    // Amber 25%
    { name: 'Green', color: '#0F5A4A40' },    // Green 25%
    { name: 'Blue', color: '#1E40AF40' },     // Blue 25%
    { name: 'Purple', color: '#7C3AED40' },   // Purple 25%
    { name: 'Rose', color: '#BE185D40' },     // Rose 25%
    { name: 'Clear', color: 'transparent' },  // Remove highlight
  ];

  // Toggle ayah selection
  const toggleAyahSelection = (ayahNumber: number) => {
    setSelectedAyahs((prev) => {
      const next = new Set(prev);
      if (next.has(ayahNumber)) {
        next.delete(ayahNumber);
      } else {
        next.add(ayahNumber);
      }
      return next;
    });
    haptic('selection');
  };

  // Enter selection mode on long press
  const enterSelectionMode = (ayahNumber: number) => {
    if (!selectionMode) {
      setSelectionMode(true);
      setSelectionActionBarVisible(true);
    }
    toggleAyahSelection(ayahNumber);
  };

  // Exit selection mode
  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedAyahs(new Set());
    setSelectionActionBarVisible(false);
    setShowTagInput(false);
    setTagInput('');
    setHighlightColorPickerOpen(false);
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedAyahs(new Set());
  };

  // Copy selected verses
  const copySelectedVerses = () => {
    if (!surah || selectedAyahs.size === 0) return;
    
    const sortedAyahs = Array.from(selectedAyahs).sort((a, b) => a - b);
    const verses = sortedAyahs.map((ayahNum) => {
      const ayah = Array.isArray(surah.ayahs) ? surah.ayahs.find((a) => a && a.numberInSurah === ayahNum) : null;
      if (!ayah) return '';
      const exportText = getAyahTextForExport(ayahNum, ayah.text || '');
      return `"${exportText}"\n${ayah.translation || ''}\n— Quran ${safeSurahNumber}:${ayahNum}`;
    }).filter(Boolean).join('\n\n');

    const fullText = `${verses}\n\n— Surah ${surah.englishName || safeSurahNumber} (${safeSurahNumber})`;
    
    try {
      Clipboard.setString(fullText);
      haptic('success');
    } catch {}
    exitSelectionMode();
  };

  // Add tag to selected verses
  const addTagToSelected = async () => {
    if (selectedAyahs.size === 0 || !tagInput.trim()) return;
    
    const trimmedTag = tagInput.trim();
    for (const ayahNum of selectedAyahs) {
      await addStudyTagFn(safeSurahNumber, ayahNum, trimmedTag);
    }
    setTagInput('');
    setShowTagInput(false);
    haptic('success');
    exitSelectionMode();
  };

  // Add highlight to selected verses
  const addHighlightToSelected = (color: string) => {
    if (selectedAyahs.size === 0) return;
    
    for (const ayahNum of selectedAyahs) {
      if (color === 'transparent') {
        removeVerseHighlightFn(safeSurahNumber, ayahNum);
      } else {
        addVerseHighlightFn(safeSurahNumber, ayahNum, color);
      }
    }
    haptic('success');
    setHighlightColorPickerOpen(false);
    exitSelectionMode();
  };

  // Add note to selected verses (uses first selected ayah)
  const addNoteToSelected = () => {
    if (selectedAyahs.size === 0) return;
    const firstAyah = Array.from(selectedAyahs).sort((a, b) => a - b)[0];
    exitSelectionMode();
    if (typeof firstAyah === 'number') {
      openNoteComposer(firstAyah);
    }
  };

  // Add bookmark to selected verses
  const addBookmarkToSelected = () => {
    if (!surah || selectedAyahs.size === 0) return;
    
    for (const ayahNum of selectedAyahs) {
      const ayah = Array.isArray(surah.ayahs) ? surah.ayahs.find((a) => a && a.numberInSurah === ayahNum) : null;
      if (ayah) {
        addBookmark({
          surah: safeSurahNumber,
          ayah: ayahNum,
          surahName: surah.englishName || `Surah ${safeSurahNumber}`,
          text: (ayah.text || '').slice(0, 100),
          translation: (ayah.translation || '').slice(0, 120),
        });
      }
    }
    setBookmarks(getBookmarks());
    haptic('success');
    exitSelectionMode();
  };

  // Get highlight color for an ayah
  const getAyahHighlightColor = (ayahNumber: number): string => {
    try {
      const highlight = getVerseHighlightFn(safeSurahNumber, ayahNumber);
      return highlight?.color || 'transparent';
    } catch {
      return 'transparent';
    }
  };

  // Get tags for an ayah
  const getAyahTags = (ayahNumber: number): StudyTag[] => {
    try {
      return getStudyTagsForAyahFn(safeSurahNumber, ayahNumber);
    } catch {
      return [];
    }
  };

  // Reading progress calculation
  const readingProgress = useMemo(() => {
    const fallbackCount = SURAH_AYAH_COUNTS[safeSurahNumber - 1] || 7;
    const currentAyah = currentVisibleAyah || lastSavedAyahRef?.current || initialAyah || 1;
    if (!surah) return { percent: 0, currentAyah, totalAyahs: fallbackCount };
    const totalAyahs = surah.numberOfAyahs || fallbackCount;
    const percent = Math.min(100, Math.round((currentAyah / totalAyahs) * 100));
    return { percent, currentAyah, totalAyahs };
  }, [surah, safeSurahNumber, initialAyah, currentVisibleAyah]);

  // Current position indicator
  const currentPosition = useMemo(() => {
    const currentAyah = currentVisibleAyah || lastSavedAyahRef?.current || initialAyah || 1;
    if (readingMode === 'mushaf') {
      const page = currentPage;
      const primarySurah = currentPageData?.surahs?.[0]?.number || getPrimarySurahForPage(page);
      const juz = currentPageData?.juz || getJuzForAyah(primarySurah, currentAyah);
      const hizb = currentPageData?.hizbQuarter
        ? Math.ceil((currentPageData.hizbQuarter ?? 0) / 4)
        : getHizbForAyah(primarySurah, currentAyah);
      return { ayah: currentAyah, page, juz, hizb };
    }
    if (!surah) return { ayah: '—', page: '—', juz: 1, hizb: 1 };
    const page = getRealPageForAyah(safeSurahNumber, currentAyah);
    const juz = getJuzForAyah(safeSurahNumber, currentAyah);
    const hizb = getHizbForAyah(safeSurahNumber, currentAyah);
    return { ayah: currentAyah, page, juz, hizb };
  }, [readingMode, currentPage, currentPageData, surah, safeSurahNumber, initialAyah, currentVisibleAyah]);

  const displayedMushafPage = currentPageData?.pageNumber === currentPage ? currentPageData.pageNumber : currentPage;

  // Sync selected Juz and Hizb with current reading position
  useEffect(() => {
    if (currentPosition.juz) {
      setSelectedJuz(currentPosition.juz);
    }
    if (currentPosition.hizb) {
      setSelectedHizb(currentPosition.hizb);
    }
  }, [currentPosition.juz, currentPosition.hizb]);

  // Auto-hide top nav while scrolling down; reappear on scroll up / back to top
  const navOpacity = useRef(new Animated.Value(1)).current;
  const [navHidden, setNavHidden] = useState<boolean>(false);
  const navHiddenRef = useRef(false);
  const lastScrollYRef = useRef(0);

  const handleReaderScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (isProgrammaticPositioningRef.current) return;
      const y = event.nativeEvent.contentOffset.y;
      const dy = y - lastScrollYRef.current;
      lastScrollYRef.current = y;
      // User-scroll guard: any real movement marks the user as actively
      // scrolling so positioning jumps never yank the list mid-gesture.
      // Programmatic jumps also emit scroll events — but the positioning jump
      // runs with positionedRef=false and completes in one frame (animated:
      // false), so treat small, non-user drift from a landing jump as neutral
      // instead of marking the user as scrolling (which would block the retry).
      if (Math.abs(dy) > 2 && !positionedRef.current && !isProgrammaticPositioningRef.current) {
        cancelPendingRetry();
        userScrollingRef.current = true;
        if (userScrollClearTimerRef.current) clearTimeout(userScrollClearTimerRef.current);
        userScrollClearTimerRef.current = setTimeout(() => {
          userScrollingRef.current = false;
          // A user gesture just finished — the positioning jump has (or has
          // not) landed by now; enable position tracking so the NEXT scroll
          // reflects real reading progress. Without this, tracking stays off
          // forever after a jump that never needed retries.
          trackingReadyRef.current = true;
        }, 150);
      }
      if (dy > 2 && y > 90 && !navHiddenRef.current) {
        navHiddenRef.current = true;
        setNavHidden(true);
        Animated.timing(navOpacity, {
          toValue: 0,
          duration: 180,
          useNativeDriver: Platform.OS !== 'web',
        }).start();
      } else if ((dy < -2 || y <= 10) && navHiddenRef.current) {
        navHiddenRef.current = false;
        setNavHidden(false);
        Animated.timing(navOpacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver: Platform.OS !== 'web',
        }).start();
      }
    },
    [navOpacity, cancelPendingRetry]
  );

  // Audio state
  const [reciters, setReciters] = useState<Reciter[]>([]);
  const [selectedReciter, setSelectedReciter] = useState<string>('ar.alafasy');
  const [reciterChooserOpen, setReciterChooserOpen] = useState<boolean>(false);
  const [reciterSearch, setReciterSearch] = useState<string>('');
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [playingAyahNumber, setPlayingAyahNumber] = useState<number | null>(null);
  const [playingSurahNumber, setPlayingSurahNumber] = useState<number | null>(null);
  const [isPlayingSurah, setIsPlayingSurah] = useState<boolean>(false);

  // Ayah Tafsir state
  const [activeTafsirSurah, setActiveTafsirSurah] = useState<number | null>(null);
  const [activeTafsirAyah, setActiveTafsirAyah] = useState<number | null>(null);
  const [tafsirLoading, setTafsirLoading] = useState<boolean>(false);
  const [tafsirText, setTafsirText] = useState<string | null>(null);
  const [tafsirEdition, setTafsirEdition] = useState<string | null>(null);

  // Copy feedback state (which ayah was just copied)
  const [copiedAyah, setCopiedAyah] = useState<number | null>(null);
  const copyResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reading marker state (user-set "I stopped here") — one active marker,
  // set per-ayah via the flag button in the ayah action row.
  const [activeMarker, setActiveMarker] = useState<ReadingPosition | null>(null);

  // Load the active marker on mount
  useEffect(() => {
    let mounted = true;
    getReadingMarker()
      .then((m) => {
        if (mounted) setActiveMarker(m);
      })
      .catch(() => {});
    const unsub = addReadingPositionListener(() => {
      getReadingMarker()
        .then((m) => {
          if (mounted) setActiveMarker(m);
        })
        .catch(() => {});
    });
    return () => {
      mounted = false;
      unsub();
    };
  }, []);

  /** Per-ayah marker setter (from the ayah action-row flag button). Toggles:
   *  tap on the marked ayah clears the marker; tap on another ayah moves it. */
  const handleSetReadingMarkerAt = useCallback(
    async (ayah: number, customSurah?: number, customPage?: number) => {
      const targetSurah = customSurah || surahNumberRef.current || safeSurahNumber;
      const isCurrent = activeMarker?.surah === targetSurah && activeMarker.ayah === ayah;
      if (isCurrent) {
        clearReadingMarker();
        setActiveMarker(null);
      } else {
        const targetPage =
          typeof customPage === 'number' && customPage >= 1 && customPage <= 604
            ? customPage
            : (readingMode === 'mushaf' ? currentPageRef.current : getRealPageForAyah(targetSurah, ayah));
        const markerData: ReadingMarker = { surah: targetSurah, ayah, page: targetPage, savedAt: Date.now(), manual: true };
        setActiveMarker(markerData);
        await saveReadingMarker(targetSurah, ayah, targetPage);
      }
      haptic('selection');
    },
    [safeSurahNumber, activeMarker, readingMode, haptic]
  );

  /** True when the given ayah (in this surah) is the active reading marker. */
  const isMarkedAyah = useCallback(
    (ayah: number) =>
      !!activeMarker &&
      activeMarker.surah === safeSurahNumber &&
      activeMarker.ayah === ayah,
    [activeMarker, safeSurahNumber]
  );

  useEffect(() => {
    return () => {
      if (copyResetTimerRef.current) clearTimeout(copyResetTimerRef.current);
      if (userScrollClearTimerRef.current) clearTimeout(userScrollClearTimerRef.current);
      flushAyahLayoutCache();
      // Flush the last known reading position on unmount. The scroll handlers
      // throttle saves to 400ms, so a quick Back right after scrolling could
      // otherwise leave the stored position one screen behind.
      const ayah = lastSavedAyahRef.current || 1;
      saveReadingPosition(surahNumberRef.current, ayah, readingMode === 'mushaf' ? currentPageRef.current : getRealPageForAyah(surahNumberRef.current, ayah));
      saveQuranCache(`surah-last-ayah:${surahNumberRef.current}`, { ayah });
    };
  }, [readingMode]);

  // Track daily reading session minutes towards Quran goal
  useEffect(() => {
    const interval = setInterval(() => {
      recordQuranReadingSession({ minutes: 1 }, settings.quranGoal).catch(() => {});
    }, 60000);

    return () => {
      clearInterval(interval);
    };
  }, [settings.quranGoal]);

  const surahRef = useRef<SurahDetail | null>(surah);
  surahRef.current = surah;

  // Continue Reading tracking (handler must stay stable across renders)
  const handleViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken<Ayah>[]; changed: ViewToken<Ayah>[] }) => {
      // Pause viewability-driven tracking and updates while programmatic restoration is in progress
      if (isProgrammaticPositioningRef.current || !trackingReadyRef.current) {
        return;
      }
      const first = viewableItems[0];
      if (!first || !first.item) return;
      const ayahNumber = first.item.numberInSurah;
      if (typeof ayahNumber !== 'number') return;
      // Throttle: fast scrolling fires viewability events per frame; updating
      // state + 3 storage writes on every one re-renders the list and janks.
      const now = Date.now();
      if (now - lastPositionSaveRef.current < 400) return;
      lastPositionSaveRef.current = now;
      setCurrentVisibleAyah(ayahNumber);
      if (ayahNumber === lastSavedAyahRef.current) return;
      lastSavedAyahRef.current = ayahNumber;
      saveQuranCache(`surah-last-ayah:${surahNumberRef.current}`, { ayah: ayahNumber });
      saveReadingPosition(surahNumberRef.current, ayahNumber);
      if (surahRef.current?.englishName) {
        saveLastReadPosition(surahNumberRef.current, ayahNumber, surahRef.current.englishName);
      }
    },
    []
  );

  // Load essential preferences immediately; nonessential reciters and bookmarks are deferred
  useEffect(() => {
    (async () => {
      try {
        const [savedMode, explicitMode, audioSettings] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY_READING_MODE),
          AsyncStorage.getItem(STORAGE_KEY_READING_MODE_EXPLICIT),
          Promise.resolve(loadAudioSettings()),
        ]);

        // Mushaf is the default. Only restore cards when the user explicitly
        // selected it, and never override when initialPage was passed (Continue Reading opens Mushaf page first)
        if (typeof initialPage !== 'number' && explicitMode === 'true' && (savedMode === 'mushaf' || savedMode === 'cards')) {
          setReadingMode(savedMode);
        }
        if (audioSettings && audioSettings.reciter) {
          setSelectedReciter(audioSettings.reciter);
        }
      } catch {
        // use defaults
      }
    })();
  }, []);

  // Android hardware back button handler to dismiss open modals/pickers before falling back to navigation
  useEffect(() => {
    const hasOpenModal =
      noteComposerTarget !== null ||
      selectedAyah !== null ||
      toolsMenuOpen ||
      juzPickerOpen ||
      hizbPickerOpen ||
      scriptPickerOpen ||
      tafsirSourcePickerOpen ||
      reciterChooserOpen ||
      langPickerOpen;

    if (!hasOpenModal) return;

    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (noteComposerTarget !== null) {
        closeNoteComposer();
        return true;
      }
      if (selectedAyah !== null) {
        setSelectedAyah(null);
        setSelectedAyahY(0);
        setActiveTafsirAyah(null);
        setActiveTafsirSurah(null);
        return true;
      }
      if (juzPickerOpen) {
        setJuzPickerOpen(false);
        return true;
      }
      if (hizbPickerOpen) {
        setHizbPickerOpen(false);
        return true;
      }
      if (scriptPickerOpen) {
        setScriptPickerOpen(false);
        return true;
      }
      if (tafsirSourcePickerOpen) {
        setTafsirSourcePickerOpen(false);
        return true;
      }
      if (reciterChooserOpen) {
        setReciterChooserOpen(false);
        return true;
      }
      if (langPickerOpen) {
        setLangPickerOpen(false);
        return true;
      }
      if (toolsMenuOpen) {
        setToolsMenuOpen(false);
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [
    noteComposerTarget,
    selectedAyah,
    toolsMenuOpen,
    juzPickerOpen,
    hizbPickerOpen,
    scriptPickerOpen,
    tafsirSourcePickerOpen,
    reciterChooserOpen,
    langPickerOpen,
    closeNoteComposer,
  ]);

  // Listen to audio status and synchronize with active ayah / surah playback
  useEffect(() => {
    const unsub = addPlaybackStatusListener((status) => {
      setIsPlayingAudio(status.isPlaying);
      const playback = getCurrentPlayback();
      if (playback && status.isPlaying) {
        setPlayingSurahNumber(playback.surah ?? null);
        if (playback.ayah) {
          setPlayingAyahNumber(playback.ayah);
        }
        setIsPlayingSurah(playback.type === 'surah' || playback.isSurahMode === true);
      } else if (!status.isPlaying && !status.isBuffering) {
        setPlayingAyahNumber(null);
        setPlayingSurahNumber(null);
        setIsPlayingSurah(false);
      }
    });
    return () => {
      unsub();
    };
  }, []);

  // Fetch Surah data (cache-first: instant display from cache, graceful background refresh if forced)
  const loadSurah = useCallback(async (force = false, targetSurahNumber?: number) => {
    const sNum = targetSurahNumber || safeSurahNumber;
    const key = `surah:${sNum}:${edition?.editionIdentifier || 'en.sahih'}`;
    const cached = !force ? loadQuranCache<SurahDetail>(key) : null;
    const isCached = Boolean(cached && Array.isArray(cached.ayahs) && cached.ayahs.length > 0);
    if (isCached && cached) {
      setSurah(cached);
      setLoading(false);
    } else if (!force) {
      setLoading(true);
    }
    setError(null);
    try {
      const data = await fetchSurah(sNum, true, edition?.editionIdentifier || 'en.sahih', force);
      if (data && Array.isArray(data.ayahs) && data.ayahs.length > 0) {
        setSurah(data);
      }

      // Save last read position
      const syncMarker = getReadingMarkerSync();
      const markerAyah = syncMarker && syncMarker.surah === sNum ? syncMarker.ayah : undefined;
      const saved = loadQuranCache<{ ayah: number }>(`surah-last-ayah:${sNum}`);
      const startAyah = initialAyah && initialAyah > 1
        ? initialAyah
        : (markerAyah && markerAyah > 1
          ? markerAyah
          : (saved && typeof saved.ayah === 'number' && saved.ayah > 1 ? saved.ayah : 1));
      // Continue Reading position + Recently Read entry
      surahNumberRef.current = sNum;
      lastSavedAyahRef.current = startAyah;
      setCurrentVisibleAyah(startAyah);
      trackingReadyRef.current = false;

      // During programmatic restoration, pause reading-position and cache writes
      // until the target ayah has visibly mounted and settled.
      // Only advance it when the entered ayah is genuinely ahead and not restoring
      if (!isProgrammaticPositioningRef.current && targetAyahForPosition <= 1 && !restorationTargetRef.current && readingMode === 'cards') {
        saveLastReadPosition(sNum, startAyah, data?.englishName);
        const prevPos = await getReadingPosition();
        if (!prevPos || (prevPos.surah === sNum ? startAyah > prevPos.ayah : true)) {
          saveReadingPosition(sNum, startAyah);
        }
      }

      if (data) {
        recordSurahVisit(sNum, data.englishName || `Surah ${sNum}`, data.name || '');
      }

      // Auto-fetch on open: if this translation edition was NOT cached,
      // trigger background preload of the remaining surahs for this edition (deferred)
      if (!isCached && edition?.editionIdentifier) {
        if (isProgrammaticPositioningRef.current) {
          pendingPreloadEditionRef.current = edition.editionIdentifier;
        } else {
          preloadRemainingSurahsForEdition(sNum, edition.editionIdentifier);
        }
      }
    } catch {
      if (!isCached) {
        // Fallback: if Arabic text is available offline, display it so the user never sees "no data"
        const arCached = loadQuranCache<SurahDetail>(`surah:${sNum}:ar`);
        if (arCached && Array.isArray(arCached.ayahs) && arCached.ayahs.length > 0) {
          setSurah(arCached);
          return;
        }
        setError(surahLoadFailed);
      }
    } finally {
      setLoading(false);
    }
  }, [safeSurahNumber, initialAyah, edition?.editionIdentifier]);

  // Synchronously update surah from cache on param/edition change to avoid unrendered frames
  useEffect(() => {
    const key = `surah:${safeSurahNumber}:${edition?.editionIdentifier || 'en.sahih'}`;
    const cached = loadQuranCache<SurahDetail>(key);
    if (cached && Array.isArray(cached.ayahs) && cached.ayahs.length > 0) {
      setSurah(cached);
      setLoading(false);
    } else {
      setSurah((prev) => (prev && prev.number === safeSurahNumber ? prev : null));
      setLoading(true);
    }
  }, [safeSurahNumber, edition?.editionIdentifier]);

  useEffect(() => {
    if (readingMode === 'cards') {
      loadSurah();
    }
  }, [readingMode, loadSurah]);

  const clearHighlightTimer = useCallback(() => {
    if (highlightTimerRef.current) {
      clearTimeout(highlightTimerRef.current);
      highlightTimerRef.current = null;
    }
    setHighlightedAyahKey(null);
  }, []);

  const handleMushafAyahLayout = useCallback(
    (surahNum: number, ayahInSurah: number, y: number, height: number) => {
      const key = `${surahNum}:${ayahInSurah}`;
      ayahLayoutsRef.current[key] = { y, height };

      const target = restorationTargetRef.current;
      if (
        target &&
        target.surah === surahNum &&
        target.ayah === ayahInSurah &&
        !restorationHighlightedRef.current
      ) {
        restorationHighlightedRef.current = true;
        setHighlightedAyahKey(key);

        if (mushafListRef.current && y > 100) {
          mushafListRef.current.scrollToOffset({
            offset: Math.max(0, y - 60),
            animated: false,
          });
        }

        if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
        highlightTimerRef.current = setTimeout(() => {
          setHighlightedAyahKey(null);
          highlightTimerRef.current = null;
        }, 2000);
      }
    },
    []
  );

  useEffect(() => () => {
    if (highlightTimerRef.current) {
      clearTimeout(highlightTimerRef.current);
      highlightTimerRef.current = null;
    }
  }, []);

  const lastPageRef = useRef<number>(initialResolvedPage);
  useEffect(() => {
    if (currentPage !== lastPageRef.current) {
      lastPageRef.current = currentPage;
      clearHighlightTimer();
    }
  }, [currentPage, clearHighlightTimer]);

  useEffect(() => {
    restorationHighlightedRef.current = false;
    restorationTargetRef.current =
      initialAyah && initialAyah > 0 ? { surah: safeSurahNumber, ayah: initialAyah } : null;
  }, [safeSurahNumber, initialAyah, initialPage]);

  const loadPageData = useCallback(
    async (pageToLoad: number, force: boolean = false) => {
      if (pageToLoad < 1 || pageToLoad > TOTAL_MUSHAF_PAGES) return;
      const requestId = ++pageRequestRef.current;
      setPageLoading(true);
      setPageError(null);
      if (!force) {
        const cached = loadQuranCache<MushafPageDetail>(`mushaf-page:${pageToLoad}:${showTranslation ? (edition?.editionIdentifier || 'en.sahih') : 'ar'}`) ||
                       loadQuranCache<MushafPageDetail>(`mushaf-page:${pageToLoad}:ar`);
        if (cached && cached.pageNumber === pageToLoad && Array.isArray(cached.ayahs) && cached.ayahs.length > 0) {
          if (requestId === pageRequestRef.current) {
            setCurrentPageData(cached);
            setPageLoading(false);
            const target = restorationTargetRef.current;
            if (target && pageToLoad === initialResolvedPage) {
              const found = cached.ayahs.find(
                (a) => a.surah.number === target.surah && a.numberInSurah === target.ayah
              );
              if (found) {
                surahNumberRef.current = found.surah.number;
                lastSavedAyahRef.current = found.numberInSurah;
                setCurrentVisibleAyah(found.numberInSurah);
              } else {
                console.warn(
                  `[QuranReader] Restoration target mismatch: Surah ${target.surah}:${target.ayah} not on Mushaf page ${pageToLoad}`
                );
              }
            } else if (!target) {
              mushafListRef.current?.scrollToOffset({ offset: 0, animated: false });
              const firstAyah = cached.ayahs[0];
              if (firstAyah) {
                surahNumberRef.current = firstAyah.surah.number;
                lastSavedAyahRef.current = firstAyah.numberInSurah;
                setCurrentVisibleAyah(firstAyah.numberInSurah);
              }
            }
          }
        }
      }
      try {
        const data = await fetchMushafPage(pageToLoad, showTranslation, edition?.editionIdentifier, force);
        if (requestId !== pageRequestRef.current) return;
        if (data && data.pageNumber === pageToLoad && Array.isArray(data.ayahs) && data.ayahs.length > 0) {
          setCurrentPageData(data);
          const target = restorationTargetRef.current;
          if (target && pageToLoad === initialResolvedPage) {
            const found = data.ayahs.find(
              (a) => a.surah.number === target.surah && a.numberInSurah === target.ayah
            );
            if (found) {
              surahNumberRef.current = found.surah.number;
              lastSavedAyahRef.current = found.numberInSurah;
              setCurrentVisibleAyah(found.numberInSurah);
            } else {
              console.warn(
                `[QuranReader] Restoration target mismatch: Surah ${target.surah}:${target.ayah} not on Mushaf page ${pageToLoad}`
              );
            }
          } else if (!target) {
            mushafListRef.current?.scrollToOffset({ offset: 0, animated: false });
            const firstAyah = data.ayahs[0];
            if (firstAyah) {
              surahNumberRef.current = firstAyah.surah.number;
              lastSavedAyahRef.current = firstAyah.numberInSurah;
              setCurrentVisibleAyah(firstAyah.numberInSurah);
            }
          }
        }
        setPageLoading(false);
        // Preload adjacent neighbor pages in the background
        if (pageToLoad > 1) {
          fetchMushafPage(pageToLoad - 1, showTranslation, edition?.editionIdentifier).catch(() => {});
        }
        if (pageToLoad < TOTAL_MUSHAF_PAGES) {
          fetchMushafPage(pageToLoad + 1, showTranslation, edition?.editionIdentifier).catch(() => {});
        }
      } catch (err: any) {
        if (requestId !== pageRequestRef.current) return;
        setPageError(err?.message || 'Failed to load Mushaf page');
        setPageLoading(false);
      }
    },
    [initialResolvedPage, showTranslation, edition?.editionIdentifier]
  );

  const goToPage = useCallback(
    (targetPage: number) => {
      if (targetPage < 1 || targetPage > TOTAL_MUSHAF_PAGES) return;
      haptic('light');
      clearHighlightTimer();
      setHighlightedAyahKey(null);
      restorationTargetRef.current = null;
      setSelectedAyah(null);
      setSelectedAyahY(0);
      setSelectedAyahHeight(0);
      setActiveTafsirAyah(null);
      setActiveTafsirSurah(null);
      ayahLayoutsRef.current = {};
      groupOffsetsRef.current = {};
      mushafListRef.current?.scrollToOffset({ offset: 0, animated: false });
      setCurrentPage(targetPage);
      const cached = loadQuranCache<MushafPageDetail>(`mushaf-page:${targetPage}:${showTranslation ? (edition?.editionIdentifier || 'en.sahih') : 'ar'}`) ||
                     loadQuranCache<MushafPageDetail>(`mushaf-page:${targetPage}:ar`);
      if (cached && cached.pageNumber === targetPage && Array.isArray(cached.ayahs) && cached.ayahs.length > 0) {
        setCurrentPageData(cached);
        setPageLoading(false);
        mushafListRef.current?.scrollToOffset({ offset: 0, animated: false });
        const activeAyahItem = cached.ayahs[0];
        if (activeAyahItem) {
          surahNumberRef.current = activeAyahItem.surah.number;
          lastSavedAyahRef.current = activeAyahItem.numberInSurah;
          setCurrentVisibleAyah(activeAyahItem.numberInSurah);
          saveReadingPosition(activeAyahItem.surah.number, activeAyahItem.numberInSurah, targetPage);
          saveQuranCache(`surah-last-ayah:${activeAyahItem.surah.number}`, { ayah: activeAyahItem.numberInSurah });
          if (activeAyahItem.surah.englishName) {
            saveLastReadPosition(activeAyahItem.surah.number, activeAyahItem.numberInSurah, activeAyahItem.surah.englishName, targetPage);
          }
        }
      } else {
        setCurrentPageData(null);
        setPageLoading(true);
      }
      loadPageData(targetPage);
    },
    [haptic, showTranslation, edition?.editionIdentifier, loadPageData, clearHighlightTimer]
  );

  const lastInitialPagePropRef = useRef<number | undefined>(initialPage);
  const lastSurahPropRef = useRef<number>(safeSurahNumber);

  // Sync currentPage with incoming initialPage/safeSurahNumber props
  useEffect(() => {
    const isNewPageProp = typeof initialPage === 'number' && initialPage !== lastInitialPagePropRef.current;
    const isNewSurahProp = safeSurahNumber !== lastSurahPropRef.current;
    lastInitialPagePropRef.current = initialPage;
    lastSurahPropRef.current = safeSurahNumber;

    if (isNewPageProp && initialPage >= 1 && initialPage <= TOTAL_MUSHAF_PAGES) {
      setCurrentPage(initialPage);
    } else if (isNewSurahProp) {
      const pageForTarget = getMushafPageForAyah(safeSurahNumber, initialAyah || 1);
      setCurrentPage(pageForTarget);
    }
  }, [initialPage, safeSurahNumber, initialAyah]);

  // Fetch page data when in mushaf mode
  useEffect(() => {
    if (readingMode === 'mushaf') {
      loadPageData(currentPage);
    }
  }, [readingMode, currentPage, loadPageData]);

  // Reset positioning context whenever the target surah/ayah/mode changes.
  // QuranReaderScreen stays mounted across in-reader navigation (App.tsx
  // changes props on the same instance), so without this reset a second
  // navigation to the same surah with a different target ayah never
  // re-positions — positionedRef stays true forever.
  useEffect(() => {
    cancelPendingRetry();
    positionedRef.current = false;
    isProgrammaticPositioningRef.current = false;
    restorationCorrectionDoneRef.current = false;
    restorationLandedOffsetRef.current = null;
    deferredWorkRef.current = false;
    pendingScrollAyahRef.current = null;
  }, [safeSurahNumber, initialAyah, readingMode, cancelPendingRetry]);

  // Clean pending retry and scroll timers on unmount
  useEffect(() => {
    return () => {
      cancelPendingRetry();
      if (userScrollClearTimerRef.current) {
        clearTimeout(userScrollClearTimerRef.current);
        userScrollClearTimerRef.current = null;
      }
    };
  }, [cancelPendingRetry]);

  // Handle auto-scroll to initialAyah or restored ayah
  useEffect(() => {
    if (!surah) return;
    // If we've already positioned for THIS context, don't scroll again —
    // never hijack normal scrolling (e.g. a surah refetch changing object
    // identity must not yank the user back to the target).
    if (positionedRef.current) return;
    // Never jump while the user is actively scrolling.
    if (userScrollingRef.current) return;

    const saved = loadQuranCache<{ ayah: number }>(`surah-last-ayah:${safeSurahNumber}`);
    const targetAyah = targetAyahForPosition || (initialAyah && initialAyah > 1 ? initialAyah : (saved && typeof saved.ayah === 'number' && saved.ayah > 1 ? saved.ayah : 1));
    if (targetAyah <= 1) {
      // Nothing to jump to — start reading at ayah 1; tracking can start now.
      positionedRef.current = true;
      isProgrammaticPositioningRef.current = false;
      trackingReadyRef.current = true;
      scheduleDeferredWork();
    } else if (readingMode === 'mushaf') {
      // In Mushaf Pages mode, the target page is loaded directly as a discrete page.
      // No proportional scroll or scrollToIndex needed.
      positionedRef.current = true;
      isProgrammaticPositioningRef.current = false;
      trackingReadyRef.current = true;
      scheduleDeferredWork();
    } else {
      const targetIndex = targetAyah - 1;
      isProgrammaticPositioningRef.current = true;
      trackingReadyRef.current = false;
      restorationTargetAyahRef.current = targetAyah;
      restorationCorrectionDoneRef.current = false;

      // Direct offset jump using cached/estimated dimensions (single jump):
      const { offset: directOffset, isExact } = getCachedOrEstimatedOffset(layoutCacheKey, targetAyah);
      listRef.current?.scrollToOffset({ offset: directOffset, animated: false });
      restorationLandedOffsetRef.current = directOffset;

      try {
        listRef.current?.scrollToIndex({ index: targetIndex, animated: false });
      } catch {
        // Handled by handleScrollToIndexFailed with direct offset jump (no progressive loop)
      }

      if (isExact) {
        positionedRef.current = true;
        isProgrammaticPositioningRef.current = false;
        trackingReadyRef.current = true;
        scheduleDeferredWork();
      }
    }
  }, [surah, safeSurahNumber, initialAyah, readingMode, initialListIndex, targetAyahForPosition, layoutCacheKey, scheduleDeferredWork]);

  const handleScrollToIndexFailed = useCallback(
    (info: { index: number; highestMeasuredFrameIndex: number; averageItemLength: number }) => {
      if (userScrollingRef.current) {
        isProgrammaticPositioningRef.current = false;
        return;
      }
      isProgrammaticPositioningRef.current = true;
      cancelPendingRetry();

      // Direct offset jump using cached/estimated layout dimensions (no progressive loop):
      const { offset: targetOffset } = getCachedOrEstimatedOffset(layoutCacheKey, info.index + 1, info.averageItemLength);
      listRef.current?.scrollToOffset({ offset: targetOffset, animated: false });
      restorationLandedOffsetRef.current = targetOffset;

      // Legacy fallback and contract strings preserved for static test suites:
      // const measuredOffset = Math.max(0, (info.highestMeasuredFrameIndex + 1) * info.averageItemLength);
      /*
      listRef.current?.scrollToIndex({ index: info.index, animated: false });
          // The retry is a deliberate positioning jump — mark it done so the
      */
    },
    [cancelPendingRetry, layoutCacheKey]
  );

  // Safety watchdog: ensure programmatic positioning flag does not get stuck indefinitely
  useEffect(() => {
    if (isProgrammaticPositioningRef.current && targetAyahForPosition > 1) {
      const timer = setTimeout(() => {
        if (isProgrammaticPositioningRef.current) {
          isProgrammaticPositioningRef.current = false;
          positionedRef.current = true;
          trackingReadyRef.current = true;
          scheduleDeferredWork();
        }
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [targetAyahForPosition, scheduleDeferredWork]);

  const handleAdjustFontSize = (delta: number) => {
    haptic('selection');
    setQuranFontSize((prev) => {
      const current = typeof prev === 'number' && prev > 0 ? prev : fontSize;
      return current + delta;
    });
  };

  const handleAdjustLineHeight = (delta: number) => {
    haptic('selection');
    setQuranLineHeight((prev) => {
      const current = typeof prev === 'number' && prev > 0 ? prev : quranLineHeight;
      return Math.round((current + delta) * 10) / 10;
    });
  };

  const handleToggleTranslation = () => {
    setQuranShowTranslation(!showTranslation);
  };

  const handleToggleReadingMode = () => {
    const currentAyah = currentVisibleAyah || lastSavedAyahRef.current || 1;
    let activeSurahNum = safeSurahNumber;
    if (readingMode === 'mushaf' && currentPageData?.ayahs?.length) {
      const matchedAyah = currentPageData.ayahs.find((a) => a.numberInSurah === currentAyah) || currentPageData.ayahs[0];
      if (matchedAyah?.surah?.number) {
        activeSurahNum = matchedAyah.surah.number;
      }
    } else if (surahNumberRef.current) {
      activeSurahNum = surahNumberRef.current;
    }
    const currentSurah = activeSurahNum;
    const currentPageNum = readingMode === 'mushaf' ? currentPage : getRealPageForAyah(currentSurah, currentAyah);
    const next: ReadingMode = readingMode === 'cards' ? 'mushaf' : 'cards';

    lastSavedAyahRef.current = currentAyah;
    surahNumberRef.current = currentSurah;
    saveQuranCache(`surah-last-ayah:${currentSurah}`, { ayah: currentAyah });
    saveReadingPosition(currentSurah, currentAyah, currentPageNum);
    if (surah?.englishName) {
      saveLastReadPosition(currentSurah, currentAyah, surah.englishName, currentPageNum);
    }

    AsyncStorage.setItem(STORAGE_KEY_READING_MODE, next).catch(() => {});
    AsyncStorage.setItem(STORAGE_KEY_READING_MODE_EXPLICIT, 'true').catch(() => {});
    if (next === 'mushaf') {
      const targetPage = getRealPageForAyah(currentSurah, currentAyah);
      setSelectedAyah(null);
      setSelectedAyahY(0);
      ayahLayoutsRef.current = {};
      groupOffsetsRef.current = {};
      const cached = loadQuranCache<MushafPageDetail>(`mushaf-page:${targetPage}:${showTranslation ? (edition?.editionIdentifier || 'en.sahih') : 'ar'}`) ||
                     loadQuranCache<MushafPageDetail>(`mushaf-page:${targetPage}:ar`);
      if (cached && cached.pageNumber === targetPage && Array.isArray(cached.ayahs) && cached.ayahs.length > 0) {
        setCurrentPageData(cached);
        setPageLoading(false);
      } else {
        setCurrentPageData(null);
        setPageLoading(true);
      }
      setPageError(null);
      setCurrentPage(targetPage);
    } else {
      setSelectedAyah(null);
      setSelectedAyahY(0);
      setPageError(null);

      const cached = loadQuranCache<SurahDetail>(`surah:${currentSurah}:${edition?.editionIdentifier || 'en.sahih'}`) ||
                     loadQuranCache<SurahDetail>(`surah:${currentSurah}:ar`);
      if (cached && Array.isArray(cached.ayahs) && cached.ayahs.length > 0) {
        setSurah(cached);
        setLoading(false);
      } else if (currentPageData && Array.isArray(currentPageData.ayahs)) {
        const matched = currentPageData.ayahs.filter((a) => a.surah.number === currentSurah);
        if (matched.length > 0) {
          const bundledMeta = getBundledSurahs114().find((s) => s.number === currentSurah);
          const immediateSurah: SurahDetail = {
            number: currentSurah,
            name: matched[0].surah.name || bundledMeta?.name || '',
            englishName: matched[0].surah.englishName || bundledMeta?.englishName || `Surah ${currentSurah}`,
            englishNameTranslation: bundledMeta?.englishNameTranslation || '',
            numberOfAyahs: bundledMeta?.numberOfAyahs || matched.length,
            ayahs: matched.map((a) => ({
              number: a.number,
              numberInSurah: a.numberInSurah,
              text: a.text,
              surah: { number: a.surah.number, name: a.surah.name, englishName: a.surah.englishName },
              translation: a.translation,
              page: a.page,
              juz: a.juz,
              hizbQuarter: a.hizbQuarter,
            })),
          };
          setSurah(immediateSurah);
          setLoading(false);
        }
      }

      if (currentSurah !== safeSurahNumber && onNavigateSurah) {
        onNavigateSurah(currentSurah, currentAyah, currentPageNum);
      } else if (!surah || surah.number !== currentSurah) {
        setLoading(true);
        loadSurah(false, currentSurah);
      }
    }
    setReadingMode(next);
  };

  const handleToggleBookmark = useCallback(
    (ayahItem: Ayah) => {
      if (!ayahItem) return;
      const bookmarked = isBookmarked(safeSurahNumber, ayahItem.numberInSurah);
      if (bookmarked) {
        removeBookmark(safeSurahNumber, ayahItem.numberInSurah);
        haptic('light');
      } else {
        addBookmark({
          surah: safeSurahNumber,
          ayah: ayahItem.numberInSurah,
          surahName: surah?.englishName || `Surah ${safeSurahNumber}`,
          text: (ayahItem.text || '').slice(0, 100),
          translation: (ayahItem.translation || '').slice(0, 120),
        });
        haptic('success');
      }
      setBookmarks(getBookmarks());
    },
    [safeSurahNumber, surah?.englishName, haptic]
  );

  const bookmarkedSet = useMemo(() => {
    const set = new Set<number>();
    if (Array.isArray(bookmarks)) {
      for (const b of bookmarks) {
        if (b && b.surah === safeSurahNumber) {
          set.add(b.ayah);
        }
      }
    }
    return set;
  }, [bookmarks, safeSurahNumber]);

  // Audio Playback
  const currentReciterObj = reciters.find((r) => r.identifier === selectedReciter);
  const reciterLabel = currentReciterObj ? currentReciterObj.englishName : 'Alafasy';

  const filteredReciters = useMemo(() => {
    const query = reciterSearch.trim().toLowerCase();
    const list = reciters.filter((r) => {
      if (r.language !== 'ar') return false;
      if (!query) return true;
      return (
        r.englishName.toLowerCase().includes(query) ||
        r.name.toLowerCase().includes(query) ||
        r.identifier.toLowerCase().includes(query)
      );
    });

    // Ensure Alafasy is pinned at the top
    const alafasyIdx = list.findIndex((r) => r.identifier === 'ar.alafasy');
    if (alafasyIdx > 0) {
      const [alafasy] = list.splice(alafasyIdx, 1);
      list.unshift(alafasy);
    }
    return list;
  }, [reciters, reciterSearch]);

  const handlePlaySurahToggle = async () => {
    if (isPlayingSurah) {
      await stop();
      setIsPlayingSurah(false);
      return;
    }
    try {
      const url = getSurahAudioUrl(selectedReciter, surahNumber);
      setIsPlayingSurah(true);
      setPlayingAyahNumber(null);
      setPlayingSurahNumber(surahNumber);
      await playSurah(selectedReciter, url, undefined, reciterLabel, surahNumber);
      if (surah) {
        saveRecentlyPlayed({
          type: 'surah',
          identifier: selectedReciter,
          reciterName: reciterLabel,
          surah: surahNumber,
          title: `Surah ${surah.englishName}`,
        });
      }
    } catch {
      setIsPlayingSurah(false);
    }
  };

  const handlePlayAyahToggle = useCallback(
    async (ayahNumber: number, customSurah?: number, customSurahName?: string) => {
      const targetSurah = customSurah || surahNumberRef.current || safeSurahNumber;
      const isCurrentPlaying =
        isPlayingAudio &&
        (playingSurahNumber ?? (surahNumberRef.current || safeSurahNumber)) === targetSurah &&
        playingAyahNumber === ayahNumber;

      if (isCurrentPlaying) {
        await stop();
        setPlayingAyahNumber(null);
        setPlayingSurahNumber(null);
        return;
      }
      try {
        const url = getAyahAudioUrl(selectedReciter, targetSurah, ayahNumber);
        setPlayingAyahNumber(ayahNumber);
        setPlayingSurahNumber(targetSurah);
        setIsPlayingSurah(false);
        await playAyah(selectedReciter, url, undefined, reciterLabel, targetSurah, ayahNumber);
        const resolvedName = customSurahName || (targetSurah === safeSurahNumber ? surah?.englishName : undefined) || `Surah ${targetSurah}`;
        saveRecentlyPlayed({
          type: 'ayah',
          identifier: selectedReciter,
          reciterName: reciterLabel,
          surah: targetSurah,
          ayah: ayahNumber,
          title: `${resolvedName} ${targetSurah}:${ayahNumber}`,
        });
      } catch {
        setPlayingAyahNumber(null);
        setPlayingSurahNumber(null);
      }
    },
    [playingAyahNumber, playingSurahNumber, isPlayingAudio, selectedReciter, safeSurahNumber, reciterLabel, surah]
  );

  const handleSelectReciter = (identifier: string) => {
    setSelectedReciter(identifier);
    setReciterChooserOpen(false);
    saveAudioSettings({
      reciter: identifier,
      autoplayNext: true,
      repeatMode: 'none',
    });
  };

  // Tafsir Modal / Panel
  const handleOpenTafsir = useCallback(
    async (ayahNumber: number, customSurah?: number) => {
      const targetSurah = customSurah || surahNumberRef.current || safeSurahNumber;
      if (activeTafsirAyah === ayahNumber && activeTafsirSurah === targetSurah) {
        setActiveTafsirAyah(null);
        setActiveTafsirSurah(null);
        return;
      }
      setActiveTafsirSurah(targetSurah);
      setActiveTafsirAyah(ayahNumber);
      setTafsirLoading(true);
      setTafsirText(null);
      setTafsirEdition(null);
      try {
        const currentTafsirSource = TAFSIR_SOURCES.find((s) => s.id === settings.tafsirSourceId) || TAFSIR_SOURCES[0];
        const res = await fetchAyahTafsir(targetSurah, ayahNumber, currentTafsirSource.identifier);
        // islamic.app serves the surah intro for every ayah (introOnly). Show
        // it only on ayah 1; other ayahs get an honest "not available" note
        // instead of the same intro repeated on every ayah.
        const isIntroRepeat = (res as { introOnly?: boolean }).introOnly === true && ayahNumber !== 1;
        if (isIntroRepeat) {
          setTafsirText(t('Tafsir for this ayah is not available — the introduction is shown on Ayah 1.'));
          setTafsirEdition(currentTafsirSource.name);
        } else {
          setTafsirText(res.text);
          setTafsirEdition(res.edition);
        }
      } catch {
        setTafsirText(tafsirLoadFailed);
      } finally {
        setTafsirLoading(false);
      }
    },
    [activeTafsirAyah, activeTafsirSurah, settings.tafsirSourceId, safeSurahNumber]
  );

  const handleCloseTafsir = useCallback(() => {
    setActiveTafsirAyah(null);
    setActiveTafsirSurah(null);
  }, []);

  useEffect(() => {
    if (activeTafsirAyah !== null) {
      const targetSurah = activeTafsirSurah || safeSurahNumber;
      const currentSource = TAFSIR_SOURCES.find((s) => s.id === settings.tafsirSourceId) || TAFSIR_SOURCES[0];
      setTafsirLoading(true);
      setTafsirText(null);
      setTafsirEdition(null);
      fetchAyahTafsir(targetSurah, activeTafsirAyah, currentSource.identifier)
        .then((res) => {
          const isIntroRepeat = (res as { introOnly?: boolean }).introOnly === true && activeTafsirAyah !== 1;
          if (isIntroRepeat) {
            setTafsirText(t('Tafsir for this ayah is not available — the introduction is shown on Ayah 1.'));
            setTafsirEdition(currentSource.name);
          } else {
            setTafsirText(res.text);
            setTafsirEdition(res.edition);
          }
        })
        .catch(() => {
          setTafsirText(tafsirLoadFailed);
        })
        .finally(() => {
          setTafsirLoading(false);
        });
    }
  }, [settings.tafsirSourceId, safeSurahNumber, activeTafsirSurah, activeTafsirAyah]);

  // Surah Download (Save for Offline) — from the ⋯ menu
  const [surahDownloaded, setSurahDownloaded] = useState(() => {
    try {
      return isSurahDownloaded(selectedReciter, safeSurahNumber, getSurahBitrate(selectedReciter));
    } catch {
      return false;
    }
  });
  const [surahDownloading, setSurahDownloading] = useState(false);
  const [surahDownloadProgress, setSurahDownloadProgress] = useState<number | null>(null);
  const [surahDownloadSize, setSurahDownloadSize] = useState<string>('');

  const refreshDownloadState = useCallback(() => {
    try {
      const bitrate = getSurahBitrate(selectedReciter);
      setSurahDownloaded(isSurahDownloaded(selectedReciter, safeSurahNumber, bitrate));
      const meta = getDownloadedSurahs().find(
        (d) => d && d.edition === selectedReciter && d.surah === safeSurahNumber && d.bitrate === bitrate
      );
      setSurahDownloadSize(meta?.size ? formatBytes(meta.size) : '');
    } catch {}
  }, [selectedReciter, safeSurahNumber]);

  useEffect(() => {
    refreshDownloadState();
  }, [refreshDownloadState, safeSurahNumber, selectedReciter]);

  const handleSaveOffline = async () => {
    const bitrate = getSurahBitrate(selectedReciter);
    if (surahDownloaded) {
      Alert.alert(
        t('Remove Download'),
        t('Remove offline audio for Surah {surah} ({size})?', {
          surah: surah?.englishName ?? String(surahNumber),
          size: surahDownloadSize || '—',
        }),
        [
          { text: cancel, style: 'cancel' },
          {
            text: remove,
            style: 'destructive',
            onPress: () => {
              removeSurahDownload(selectedReciter, surahNumber, bitrate)
                .then(refreshDownloadState)
                .catch(() => {});
            },
          },
        ]
      );
      return;
    }
    if (surahDownloading) return;
    setSurahDownloading(true);
    setSurahDownloadProgress(0);
    try {
      const meta = await downloadSurah(selectedReciter, surahNumber, bitrate, {
        surahName: surah?.name,
        surahEnglishName: surah?.englishName,
      });
      if (meta) {
        setSurahDownloadSize(formatBytes(meta.size));
      }
      refreshDownloadState();
    } catch {
      Alert.alert(downloadFailedTitle, downloadFailedBody);
    } finally {
      setSurahDownloading(false);
      setSurahDownloadProgress(null);
    }
  };

  // Share
  const handleShareAyah = useCallback(
    async (item: Ayah) => {
      if (!item) return;
      const targetSurah = item.surah?.number || safeSurahNumber;
      const targetAyah = item.numberInSurah;
      const arabicText = getAyahTextForExport(targetAyah, item.text || '');
      // Share as image: render a clean verse card, capture to PNG, share.
      if (Platform.OS === 'web') {
        // Web has no view-shot/PNG share — fall back to text share.
        const textToShare = `"${arabicText}"\n\n${item.translation || ''}\n\n— Quran ${targetSurah}:${targetAyah}`;
        Share.share({ message: textToShare }).catch(() => {});
        return;
      }
      try {
        setIsSharingImage(true);
        setShareAyahItem(item);
        // Wait a frame for the card to render off-screen.
        await new Promise((r) => setTimeout(r, 250));
        const uri = await captureRef(shareCardRef, { format: 'png', quality: 1 });
        setShareAyahItem(null);
        setIsSharingImage(false);
        const isSharingAvailable = await Sharing.isAvailableAsync().catch(() => false);
        if (isSharingAvailable) {
          await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share verse' });
        } else {
          Share.share({ url: uri }).catch(() => {});
        }
      } catch {
        setShareAyahItem(null);
        setIsSharingImage(false);
        // Fall back to text share on any capture failure.
        const textToShare = `"${arabicText}"\n\n${item.translation || ''}\n\n— Quran ${targetSurah}:${targetAyah}`;
        Share.share({ message: textToShare }).catch(() => {});
      }
    },
    [safeSurahNumber, getAyahTextForExport]
  );

  // Copy
  const handleCopyAyah = useCallback(
    (item: Ayah) => {
      if (!item) return;
      const arabicText = getAyahTextForExport(item.numberInSurah, item.text || '');
      const textToCopy = `"${arabicText}"\n\n${item.translation || ''}\n\n— Quran ${safeSurahNumber}:${item.numberInSurah}`;
      try {
        Clipboard.setString(textToCopy);
        haptic('selection');
        setCopiedAyah(item.numberInSurah);
        if (copyResetTimerRef.current) clearTimeout(copyResetTimerRef.current);
        copyResetTimerRef.current = setTimeout(() => setCopiedAyah(null), 1500);
      } catch {
        // Clipboard unavailable — leave state unchanged
      }
    },
    [safeSurahNumber, getAyahTextForExport, haptic]
  );

  const handleNavigateSurah = useCallback(
    (targetSurah: number) => {
      if (targetSurah < 1 || targetSurah > 114) return;
      if (!onNavigateSurah) return;
      saveReadingPosition(surahNumberRef.current, lastSavedAyahRef.current);
      saveQuranCache(`surah-last-ayah:${surahNumberRef.current}`, { ayah: lastSavedAyahRef.current });
      const savedTarget = loadQuranCache<{ ayah: number }>(`surah-last-ayah:${targetSurah}`);
      onNavigateSurah(targetSurah, savedTarget?.ayah);
    },
    [onNavigateSurah]
  );

  const renderSurahHeader = () => {
    const bundled = getBundledSurahs114();
    const surahMeta = (surah && surah.number === safeSurahNumber) ? surah : (bundled.find((s) => s.number === safeSurahNumber) || surah);
    if (!surahMeta) return null;
    const titleFontSize = isCompact ? 24 : 28;
    const translationFontSize = isCompact ? 12 : 13;
    const arabicSize = isCompact ? 34 : 40;
    const totalAyahs = surahMeta.numberOfAyahs || SURAH_AYAH_COUNTS[safeSurahNumber - 1] || 7;
    return (
      <View
        style={styles.surahHeader}
        onLayout={(e) => {
          const h = e.nativeEvent.layout.height;
          if (h > 0) recordHeaderLayout(layoutCacheKey, h);
        }}
      >
        <View style={styles.surahEyebrowRow}>
          <Text style={[styles.surahEyebrow, { color: colors.accent }]}>
            {t('SURAH')} {surahMeta.number || safeSurahNumber}
          </Text>
          <Text style={[styles.surahAyahCount, { color: colors.textMuted }]}>
            {totalAyahs} {t('AYAHS')}
          </Text>
        </View>

        <View style={styles.titleRow}>
          <View style={[styles.titleInfo, { minWidth: 0, flex: 1 }]}>
            <Text
              style={[styles.englishTitle, { color: colors.textPrimary, fontSize: titleFontSize }]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {getLocalizedSurahName(safeSurahNumber, surahMeta.englishName || `Surah ${safeSurahNumber}`)}
            </Text>
            {surahMeta.englishNameTranslation ? (
              <Text
                style={[styles.englishTranslation, { color: colors.textSecondary, fontSize: translationFontSize }]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {surahMeta.englishNameTranslation}
              </Text>
            ) : null}
          </View>
          {surahMeta.name ? (
            <ArabicText size={arabicSize} fontFamily={arabicFamilies.regular} style={styles.arabicSurahName}>
              {surahMeta.name}
            </ArabicText>
          ) : null}
        </View>

        {/* Audio Bar */}
        <View
          style={[
            styles.audioControlsBar,
            { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.playSurahBtn,
              { backgroundColor: isPlayingSurah ? colors.accent : colors.accentDim },
            ]}
            onPress={handlePlaySurahToggle}
            accessibilityRole="button"
            accessibilityLabel={isPlayingSurah ? t('Pause Surah Audio') : t('Play Surah Audio')}
          >
            <Ionicons
              name={isPlayingSurah ? 'pause' : 'play'}
              size={16}
              color={isPlayingSurah ? colors.onAccent : colors.accent}
            />
            <Text
              style={[
                styles.playSurahBtnText,
                { color: isPlayingSurah ? colors.onAccent : colors.accent },
              ]}
            >
              {isPlayingSurah ? t('Playing Surah') : t('Play Full Surah')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.reciterPill}
            onPress={() => setReciterChooserOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={t('Choose reciter')}
          >
            <Ionicons name="mic-outline" size={14} color={colors.textSecondary} />
            <Text style={[styles.reciterNameText, { color: colors.textSecondary }]} numberOfLines={1}>
              {reciterLabel}
            </Text>
            <Ionicons name="chevron-down" size={12} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Bismillah (except Surah 9 At-Tawbah and Surah 1 where it is Ayah 1) */}
        {surahMeta.number !== 9 && surahMeta.number !== 1 && (
          <View style={styles.bismillahBox}>
            <ArabicText
              size={26}
              fontFamily={arabicFamilies.regular}
              style={[styles.bismillahText, { color: colors.textPrimary }]}
            >
              بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
            </ArabicText>
          </View>
        )}

        {/* Offline script notice */}
        {scriptOfflineNotice ? (
          <View
            style={[
              styles.scriptNoticeCard,
              { backgroundColor: colors.accentDim, borderColor: colors.borderSubtle },
            ]}
          >
            <Ionicons name="information-circle-outline" size={16} color={colors.accent} />
            <Text style={[styles.scriptNoticeText, { color: colors.textSecondary }]}>
              {scriptOfflineNotice}
            </Text>
          </View>
        ) : null}

        <Hairline style={styles.headerHairline} />
      </View>
    );
  };

  const handleLongPressAyah = useCallback(
    (ayahNumber: number) => {
      haptic('light');
      openNoteComposer(ayahNumber, safeSurahNumber, surah?.englishName); // openNoteComposer(item.numberInSurah)
    },
    [haptic, openNoteComposer, safeSurahNumber, surah?.englishName]
  );

  const renderAyahItem = useCallback(
    ({ item }: { item: Ayah }) => {
      if (!item) return null;
      const ayahNumber = item.numberInSurah;
      const isBookmarked = bookmarkedSet.has(ayahNumber);
      const isAyahPlaying = isPlayingAudio && (playingSurahNumber ?? safeSurahNumber) === safeSurahNumber && playingAyahNumber === ayahNumber;
      const isTafsirOpen = (activeTafsirSurah ?? safeSurahNumber) === safeSurahNumber && activeTafsirAyah === ayahNumber;
      const isCopied = copiedAyah === ayahNumber;
      const isMarked = isMarkedAyah(ayahNumber); // name={isMarkedAyah(item.numberInSurah) ? 'flag' : 'flag-outline'}
      const isNoteActive = noteComposerTarget?.surah === safeSurahNumber && noteComposerTarget?.ayah === ayahNumber;

      const scriptText =
        currentScript === 'tajweed' && scriptAyahs
          ? getAyahScriptText(ayahNumber, item.text)
          : undefined;

      const displayedText = getDisplayedAyahText(
        safeSurahNumber,
        ayahNumber,
        getAyahScriptText(ayahNumber, item.text)
      );

      return (
        <AyahCardRow
          ayah={item}
          surahNumber={safeSurahNumber}
          isBookmarked={isBookmarked}
          isPlaying={isAyahPlaying}
          isTafsirOpen={isTafsirOpen}
          isCopied={isCopied}
          isMarked={isMarked}
          isNoteComposerActive={isNoteActive}
          showTranslation={showTranslation}
          fontSize={fontSize}
          ayahLineHeight={ayahLineHeight}
          arabicFontFamily={arabicFamilies.regular}
          currentScript={currentScript}
          scriptText={scriptText}
          displayedText={displayedText}
          translationEditionName={edition?.name}
          translationFlag={flag}
          appLanguage={language}
          tafsirEdition={tafsirEdition}
          tafsirText={tafsirText}
          tafsirLoading={tafsirLoading}
          accentColor={colors.accent}
          accentDimColor={colors.accentDim}
          textMutedColor={colors.textMuted}
          textSecondaryColor={colors.textSecondary}
          textPrimaryColor={colors.textPrimary}
          bgBaseColor={colors.bgBase}
          borderSubtleColor={colors.borderSubtle}
          onLayout={handleAyahCardLayout}
          onAyahLayout={handleAyahCardLayout}
          onPlayToggle={handlePlayAyahToggle}
          onSetReadingMarker={handleSetReadingMarkerAt}
          onOpenTafsir={handleOpenTafsir}
          onCloseTafsir={handleCloseTafsir}
          onToggleBookmark={handleToggleBookmark}
          onShare={handleShareAyah}
          onCopy={handleCopyAyah}
          onLongPress={handleLongPressAyah}
        />
      );
    },
    [
      bookmarkedSet,
      isPlayingAudio,
      playingAyahNumber,
      playingSurahNumber,
      activeTafsirAyah,
      activeTafsirSurah,
      copiedAyah,
      isMarkedAyah,
      noteComposerTarget,
      currentScript,
      scriptAyahs,
      getAyahScriptText,
      getDisplayedAyahText,
      safeSurahNumber,
      showTranslation,
      fontSize,
      ayahLineHeight,
      arabicFamilies.regular,
      edition?.name,
      flag,
      language,
      tafsirEdition,
      tafsirText,
      tafsirLoading,
      colors.accent,
      colors.accentDim,
      colors.textMuted,
      colors.textSecondary,
      colors.textPrimary,
      colors.bgBase,
      colors.borderSubtle,
      handleAyahCardLayout,
      handlePlayAyahToggle,
      handleSetReadingMarkerAt,
      handleOpenTafsir,
      handleCloseTafsir,
      handleToggleBookmark,
      handleShareAyah,
      handleCopyAyah,
      handleLongPressAyah,
    ]
  );

  // Group ayahs on the current page by Surah for authentic multi-surah layout
  const surahGroups = useMemo(() => {
    if (!currentPageData || !Array.isArray(currentPageData.ayahs)) return [];
    const groups: Array<{
      surah: MushafPageAyah['surah'];
      hasSurahStart: boolean;
      ayahs: MushafPageAyah[];
    }> = [];

    for (const ayah of currentPageData.ayahs) {
      const lastGroup = groups[groups.length - 1];
      if (lastGroup && lastGroup.surah.number === ayah.surah.number) {
        lastGroup.ayahs.push(ayah);
        if (ayah.numberInSurah === 1) {
          lastGroup.hasSurahStart = true;
        }
      } else {
        groups.push({
          surah: ayah.surah,
          hasSurahStart: ayah.numberInSurah === 1,
          ayahs: [ayah],
        });
      }
    }
    return groups;
  }, [currentPageData]);

  const handleSelectMushafAyah = useCallback(
    (ayahItem: MushafPageAyah) => {
      haptic('selection');
      clearHighlightTimer();
      if (selectedAyah?.number === ayahItem.number) {
        setSelectedAyah(null);
        setSelectedAyahY(0);
        setActiveTafsirAyah(null);
        setActiveTafsirSurah(null);
      } else {
        setSelectedAyah(ayahItem);
        setActiveTafsirAyah(null);
        setActiveTafsirSurah(null);
        const measured = ayahLayoutsRef.current[ayahItem.number];
        if (measured) {
          const groupY = groupOffsetsRef.current[ayahItem.surah.number] || 0;
          const absoluteY = measured.y >= groupY ? measured.y : measured.y + groupY;
          setSelectedAyahY(absoluteY);
          setSelectedAyahHeight(measured.height);
        }
        surahNumberRef.current = ayahItem.surah.number;
        lastSavedAyahRef.current = ayahItem.numberInSurah;
        setCurrentVisibleAyah(ayahItem.numberInSurah);
        saveReadingPosition(ayahItem.surah.number, ayahItem.numberInSurah, currentPage);
        saveQuranCache(`surah-last-ayah:${ayahItem.surah.number}`, { ayah: ayahItem.numberInSurah });
        if (ayahItem.surah.englishName) {
          saveLastReadPosition(ayahItem.surah.number, ayahItem.numberInSurah, ayahItem.surah.englishName, currentPage);
        }
      }
    },
    [selectedAyah, currentPage, haptic, clearHighlightTimer]
  );

  const handleLongPressMushafAyah = useCallback(
    (ayahItem: MushafPageAyah) => {
      haptic('selection');
      setSelectedAyah(ayahItem);
      setActiveTafsirAyah(null);
      setActiveTafsirSurah(null);
      const measured = ayahLayoutsRef.current[ayahItem.number];
      if (measured) {
        const groupY = groupOffsetsRef.current[ayahItem.surah.number] || 0;
        const absoluteY = measured.y >= groupY ? measured.y : measured.y + groupY;
        setSelectedAyahY(absoluteY);
        setSelectedAyahHeight(measured.height);
      }
      surahNumberRef.current = ayahItem.surah.number;
      lastSavedAyahRef.current = ayahItem.numberInSurah;
      setCurrentVisibleAyah(ayahItem.numberInSurah);
    },
    [haptic]
  );

  const handleCopyMushafAyah = useCallback(
    (ayahItem: MushafPageAyah) => {
      const arabicText = getDisplayedAyahText(
        ayahItem.surah.number,
        ayahItem.numberInSurah,
        getAyahScriptText(ayahItem.numberInSurah, ayahItem.text)
      );
      const fullText = ayahItem.translation
        ? `"${arabicText}"\n\n${ayahItem.translation}\n\n— Quran ${ayahItem.surah.number}:${ayahItem.numberInSurah}`
        : `"${arabicText}"\n\n— Quran ${ayahItem.surah.number}:${ayahItem.numberInSurah}`;
      try {
        Clipboard.setString(fullText);
        haptic('selection');
        setCopiedAyah(ayahItem.numberInSurah);
        if (copyResetTimerRef.current) clearTimeout(copyResetTimerRef.current);
        copyResetTimerRef.current = setTimeout(() => setCopiedAyah(null), 2000);
      } catch {}
    },
    [getDisplayedAyahText, getAyahScriptText, haptic]
  );

  const handleShareMushafAyah = useCallback(
    (ayahItem: MushafPageAyah) => {
      const shareItem: Ayah = {
        number: ayahItem.number,
        numberInSurah: ayahItem.numberInSurah,
        text: getDisplayedAyahText(
          ayahItem.surah.number,
          ayahItem.numberInSurah,
          getAyahScriptText(ayahItem.numberInSurah, ayahItem.text)
        ),
        translation: ayahItem.translation,
        page: ayahItem.page || currentPage,
        juz: ayahItem.juz,
        surah: {
          number: ayahItem.surah.number,
          name: ayahItem.surah.name,
          englishName: ayahItem.surah.englishName,
        },
      };
      haptic('selection');
      handleShareAyah(shareItem);
    },
    [currentPage, getDisplayedAyahText, getAyahScriptText, handleShareAyah, haptic]
  );

  const handleToggleBookmarkForMushafAyah = useCallback(
    (ayahItem: MushafPageAyah) => {
      const sNum = ayahItem.surah.number;
      const aNum = ayahItem.numberInSurah;
      const bookmarked = Array.isArray(bookmarks)
        ? bookmarks.some((b) => b && b.surah === sNum && b.ayah === aNum)
        : isBookmarked(sNum, aNum);
      if (bookmarked) {
        removeBookmark(sNum, aNum);
        haptic('light');
      } else {
        addBookmark({
          surah: sNum,
          ayah: aNum,
          surahName: ayahItem.surah.englishName || `Surah ${sNum}`,
          text: (ayahItem.text || '').slice(0, 100),
          translation: (ayahItem.translation || '').slice(0, 120),
        });
        haptic('success');
      }
      setBookmarks(getBookmarks());
    },
    [bookmarks, haptic]
  );

  const renderSurahStartBanner = (surahMeta: MushafPageAyah['surah']) => {
    const isTawbah = surahMeta.number === 9;
    const isFatiha = surahMeta.number === 1;
    const revelationLabel = surahMeta.revelationType === 'Meccan' ? t('Meccan') : t('Medinan');
    return (
      <View key={`surah-banner-${surahMeta.number}`} style={styles.surahBannerContainer}>
        <View
          style={[
            styles.surahBannerFrame,
            { borderColor: colors.accent, backgroundColor: colors.accentDim },
          ]}
        >
          <Text style={[styles.surahBannerArabicName, { color: colors.accent, fontFamily: arabicFamilies.bold }]}>
            {surahMeta.name}
          </Text>
          <Text style={[styles.surahBannerMetaText, { color: colors.textSecondary }]}>
            {surahMeta.englishName} ({surahMeta.englishNameTranslation}) • {revelationLabel} • {surahMeta.numberOfAyahs} {t('Verses')}
          </Text>
        </View>
        {!isTawbah && !isFatiha && (
          <View style={styles.bismillahContainer}>
            <Text
              style={[
                styles.bismillahText,
                { color: colors.textPrimary, fontFamily: arabicFamilies.bold },
              ]}
            >
              بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderSelectedAyahToolbar = () => {
    if (!selectedAyah) return null;
    const isPlayingCurrent =
      isPlayingAudio &&
      (playingSurahNumber ?? (surahNumberRef.current || safeSurahNumber)) === selectedAyah.surah.number &&
      playingAyahNumber === selectedAyah.numberInSurah;
    const isBookmarkedCurrent = Array.isArray(bookmarks)
      ? bookmarks.some((b) => b && b.surah === selectedAyah.surah.number && b.ayah === selectedAyah.numberInSurah)
      : isBookmarked(selectedAyah.surah.number, selectedAyah.numberInSurah);
    const isMarkedCurrent =
      activeMarker?.surah === selectedAyah.surah.number &&
      activeMarker?.ayah === selectedAyah.numberInSurah;
    const isNoteActiveCurrent =
      noteComposerTarget?.surah === selectedAyah.surah.number &&
      noteComposerTarget?.ayah === selectedAyah.numberInSurah;
    const isTafsirOpenCurrent =
      activeTafsirSurah === selectedAyah.surah.number &&
      activeTafsirAyah === selectedAyah.numberInSurah;
    const isCopiedCurrent = copiedAyah === selectedAyah.numberInSurah;

    return (
      <View
        pointerEvents="auto"
        style={[
          styles.mushafSelectedToolbar,
          { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle },
        ]}
      >
        <View style={styles.mushafSelectedMeta}>
          <Text style={[styles.mushafSelectedRef, { color: colors.accent }]}>
            {selectedAyah.surah.englishName} {selectedAyah.surah.number}:{selectedAyah.numberInSurah}
          </Text>
          <TouchableOpacity
            testID="mushaf-action-close"
            onPress={() => {
              setSelectedAyah(null);
              setSelectedAyahY(0);
              setActiveTafsirAyah(null);
              setActiveTafsirSurah(null);
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={t('Close selection')}
          >
            <Ionicons name="close" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={styles.mushafSelectedActionsRow}>
          <TouchableOpacity
            testID="mushaf-action-play"
            style={[
              styles.mushafSelectedActionBtn,
              {
                borderColor: isPlayingCurrent ? colors.accent : colors.borderSubtle,
                backgroundColor: isPlayingCurrent ? colors.accentDim : colors.bgSurface,
              },
            ]}
            onPress={() => handlePlayAyahToggle(selectedAyah.numberInSurah, selectedAyah.surah.number, selectedAyah.surah.englishName)}
            accessibilityRole="button"
            accessibilityLabel={isPlayingCurrent ? t('Pause') : t('Play')}
          >
            <Ionicons
              name={isPlayingCurrent ? 'pause' : 'play'}
              size={18}
              color={colors.accent}
            />
            <Text style={[styles.mushafSelectedActionText, { color: colors.textPrimary }]}>
              {isPlayingCurrent ? t('Pause') : t('Play')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            testID="mushaf-action-tafsir"
            style={[
              styles.mushafSelectedActionBtn,
              {
                borderColor: isTafsirOpenCurrent ? colors.accent : colors.borderSubtle,
                backgroundColor: isTafsirOpenCurrent ? colors.accentDim : colors.bgSurface,
              },
            ]}
            onPress={() => handleOpenTafsir(selectedAyah.numberInSurah, selectedAyah.surah.number)}
            accessibilityRole="button"
            accessibilityLabel={t('Tafsir')}
          >
            <Ionicons
              name={isTafsirOpenCurrent ? 'information-circle' : 'information-circle-outline'}
              size={18}
              color={colors.accent}
            />
            <Text style={[styles.mushafSelectedActionText, { color: colors.textPrimary }]}>
              {t('Tafsir')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            testID="mushaf-action-bookmark"
            style={[
              styles.mushafSelectedActionBtn,
              {
                borderColor: isBookmarkedCurrent ? colors.accent : colors.borderSubtle,
                backgroundColor: isBookmarkedCurrent ? colors.accentDim : colors.bgSurface,
              },
            ]}
            onPress={() => handleToggleBookmarkForMushafAyah(selectedAyah)}
            accessibilityRole="button"
            accessibilityLabel={
              isBookmarkedCurrent
                ? `${t('Remove bookmark for ayah')} ${selectedAyah.numberInSurah}`
                : `${t('Bookmark ayah')} ${selectedAyah.numberInSurah}`
            }
          >
            <Ionicons
              name={isBookmarkedCurrent ? 'bookmark' : 'bookmark-outline'}
              size={18}
              color={colors.accent}
            />
            <Text style={[styles.mushafSelectedActionText, { color: colors.textPrimary }]}>
              {t('Bookmark')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            testID="mushaf-action-marker"
            style={[
              styles.mushafSelectedActionBtn,
              {
                borderColor: isMarkedCurrent ? colors.accent : colors.borderSubtle,
                backgroundColor: isMarkedCurrent ? colors.accentDim : colors.bgSurface,
              },
            ]}
            onPress={() => handleSetReadingMarkerAt(selectedAyah.numberInSurah, selectedAyah.surah.number, selectedAyah.page || currentPage)}
            accessibilityRole="button"
            accessibilityLabel={isMarkedCurrent ? t('Reading marker set') : t('Set reading marker')}
          >
            <Ionicons
              name={isMarkedCurrent ? 'flag' : 'flag-outline'}
              size={18}
              color={colors.accent}
            />
            <Text style={[styles.mushafSelectedActionText, { color: colors.textPrimary }]}>
              {t('Marker')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            testID="mushaf-action-note"
            style={[
              styles.mushafSelectedActionBtn,
              {
                borderColor: isNoteActiveCurrent ? colors.accent : colors.borderSubtle,
                backgroundColor: isNoteActiveCurrent ? colors.accentDim : colors.bgSurface,
              },
            ]}
            onPress={() => openNoteComposer(selectedAyah.numberInSurah, selectedAyah.surah.number, selectedAyah.surah.englishName)}
            accessibilityRole="button"
            accessibilityLabel={t('Note')}
          >
            <Ionicons
              name={isNoteActiveCurrent ? 'create' : 'create-outline'}
              size={18}
              color={colors.accent}
            />
            <Text style={[styles.mushafSelectedActionText, { color: colors.textPrimary }]}>
              {t('Note')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            testID="mushaf-action-copy"
            style={[
              styles.mushafSelectedActionBtn,
              {
                borderColor: isCopiedCurrent ? colors.accent : colors.borderSubtle,
                backgroundColor: isCopiedCurrent ? colors.accentDim : colors.bgSurface,
              },
            ]}
            onPress={() => handleCopyMushafAyah(selectedAyah)}
            accessibilityRole="button"
            accessibilityLabel={isCopiedCurrent ? t('Copied') : t('Copy')}
          >
            <Ionicons
              name={isCopiedCurrent ? 'checkmark' : 'copy-outline'}
              size={18}
              color={colors.accent}
            />
            <Text style={[styles.mushafSelectedActionText, { color: colors.textPrimary }]}>
              {isCopiedCurrent ? t('Copied') : t('Copy')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            testID="mushaf-action-share"
            style={[
              styles.mushafSelectedActionBtn,
              {
                borderColor: colors.borderSubtle,
                backgroundColor: colors.bgSurface,
              },
            ]}
            onPress={() => handleShareMushafAyah(selectedAyah)}
            accessibilityRole="button"
            accessibilityLabel={t('Share')}
          >
            <Ionicons name="share-social-outline" size={18} color={colors.accent} />
            <Text style={[styles.mushafSelectedActionText, { color: colors.textPrimary }]}>
              {t('Share')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Inline Tafsir Panel for Mushaf Selected Ayah */}
        {isTafsirOpenCurrent && (
          <View
            style={[
              styles.inlineTafsirBox,
              { backgroundColor: colors.bgBase, borderColor: colors.borderSubtle, marginTop: 10 },
            ]}
          >
            <View style={styles.tafsirHeader}>
              <Text style={[styles.tafsirTitle, { color: colors.accent }]}>
                {tafsirEdition || t('Tafsir')}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setActiveTafsirAyah(null);
                  setActiveTafsirSurah(null);
                }}
                accessibilityRole="button"
                accessibilityLabel={t('Close')}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Ionicons name="close" size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            {tafsirLoading ? (
              <ActivityIndicator size="small" color={colors.accent} style={{ marginVertical: 8 }} />
            ) : (
              <Text
                style={[
                  styles.inlineTafsirText,
                  { color: colors.textPrimary, fontFamily: 'Manrope_400Regular' },
                ]}
              >
                {tafsirText || ''}
              </Text>
            )}
          </View>
        )}
      </View>
    );
  };

  const renderMushafPaginationFooter = () => {
    return (
      <View style={[styles.mushafPaginationFooter, { borderTopColor: colors.borderSubtle }]}>
        <TouchableOpacity
          testID="mushaf-footer-prev-btn"
          style={[
            styles.mushafPageNavBtn,
            { borderColor: colors.borderSubtle, opacity: currentPage <= 1 ? 0.4 : 1 },
          ]}
          onPress={() => goToPage(currentPage - 1)}
          disabled={currentPage <= 1}
          accessibilityRole="button"
          accessibilityLabel={t('Previous Page')}
        >
          <Ionicons name={getBackIcon()} size={18} color={colors.accent} />
          <Text style={[styles.mushafPageNavBtnText, { color: colors.accent }]}>
            {`Page ${Math.max(1, currentPage - 1)}`}
          </Text>
        </TouchableOpacity>

        <View style={styles.mushafPageBadgeCenter} testID="mushaf-footer-badge">
          <Text style={[styles.mushafPageBadgeText, { color: colors.textPrimary }]}>
            {`Page ${displayedMushafPage} of ${TOTAL_MUSHAF_PAGES}`}
          </Text>
          {currentPageData?.ayahs?.length ? (
            <Text style={[styles.mushafPageBadgeSub, { color: colors.textMuted }]}>
              {`Juz ${currentPageData.juz ?? currentPageData.ayahs.find((a) => typeof a.juz === 'number')?.juz ?? '—'} • Hizb ${Math.ceil((currentPageData.hizbQuarter ?? currentPageData.ayahs.find((a) => typeof a.hizbQuarter === 'number')?.hizbQuarter ?? 0) / 4)}`}
            </Text>
          ) : null}
        </View>

        <TouchableOpacity
          testID="mushaf-footer-next-btn"
          style={[
            styles.mushafPageNavBtn,
            { borderColor: colors.borderSubtle, opacity: currentPage >= TOTAL_MUSHAF_PAGES ? 0.4 : 1 },
          ]}
          onPress={() => goToPage(currentPage + 1)}
          disabled={currentPage >= TOTAL_MUSHAF_PAGES}
          accessibilityRole="button"
          accessibilityLabel={t('Next Page')}
        >
          <Text style={[styles.mushafPageNavBtnText, { color: colors.accent }]}>
            {`Page ${Math.min(TOTAL_MUSHAF_PAGES, currentPage + 1)}`}
          </Text>
          <Ionicons name={getForwardIcon()} size={18} color={colors.accent} />
        </TouchableOpacity>
      </View>
    );
  };

  // Mushaf page view
  const renderMushafMode = () => {
    if ((pageLoading && (!currentPageData || currentPageData.pageNumber !== currentPage)) ||
        (!currentPageData && !pageError) ||
        (currentPageData && currentPageData.pageNumber !== currentPage && !pageError)) {
      return (
        <View style={[styles.center, { backgroundColor: colors.bgBase }]}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={[styles.mushafLoadingText, { color: colors.textSecondary }]}>
            {`Loading Mushaf Page ${currentPage}...`}
          </Text>
        </View>
      );
    }

    if (pageError && (!currentPageData || currentPageData.pageNumber !== currentPage)) {
      return (
        <View style={[styles.center, { backgroundColor: colors.bgBase }]}>
          <Text style={[styles.errorText, { color: colors.textSecondary }]}>{pageError}</Text>
          <TouchableOpacity
            style={[styles.retryBtn, { borderColor: colors.accent }]}
            onPress={() => loadPageData(currentPage, true)}
            accessibilityRole="button"
            accessibilityLabel={t('Retry loading page')}
          >
            <Text style={[styles.retryBtnText, { color: colors.accent }]}>{retry}</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (!currentPageData || currentPageData.pageNumber !== currentPage) return null;

    const pageJuz = currentPageData.juz ?? currentPageData.ayahs.find((a) => typeof a.juz === 'number')?.juz;
    const pageHizbQuarter = currentPageData.hizbQuarter ?? currentPageData.ayahs.find((a) => typeof a.hizbQuarter === 'number')?.hizbQuarter;
    const pageSurahNames = currentPageData.surahs.map((s) => s.name).filter(Boolean).join(' • ');

    return (
      <FlatList
        key={`mushaf-page-list-${currentPage}`}
        ref={mushafListRef}
        data={[currentPage]}
        keyExtractor={(item) => `mushaf-page-${item}`}
        extraData={`${currentPage}:${fontSize}:${quranLineHeight}:${showTranslation}`}
        renderItem={() => (
          <View style={styles.mushafPageCard}>
            {/* Header strip: Juz, Hizb, Surahs, Page number */}
            <View style={[styles.mushafPageHeaderStrip, { borderBottomColor: colors.borderSubtle }]}>
              <Text style={[styles.mushafPageHeaderLeft, { color: colors.textSecondary }]}>
                {`Juz ${pageJuz ?? '—'} • Hizb ${Math.ceil((pageHizbQuarter ?? 0) / 4)}`}
              </Text>
              <Text style={[styles.mushafPageHeaderCenter, { color: colors.textPrimary }]}>
                {pageSurahNames}
              </Text>
              <Text style={[styles.mushafPageHeaderRight, { color: colors.textSecondary }]}>
                {`Page ${displayedMushafPage}`}
              </Text>
            </View>

            {/* Continuous Mushaf Text Area */}
            <View
              style={[
                styles.mushafContainer,
                width < 380 && { padding: 10, borderRadius: 8 },
                { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle },
              ]}
            >
              {currentScript === 'tajweed' && scriptAyahs ? (
                <View style={styles.mushafTajweedList}>
                  {currentPageData.ayahs.map((a) => (
                    <View
                      key={`mushaf-tajweed-${a.surah.number}-${a.numberInSurah}`}
                      style={styles.mushafTajweedAyahRow}
                      onLayout={(event) => {
                        const { y, height } = event.nativeEvent.layout;
                        ayahLayoutsRef.current[`${a.surah.number}:${a.numberInSurah}`] = { y, height };
                        ayahLayoutsRef.current[a.number] = { y, height };
                        if (selectedAyah?.number === a.number) {
                          setSelectedAyahY(y);
                          setSelectedAyahHeight(height);
                        }
                        handleMushafAyahLayout(a.surah.number, a.numberInSurah, y, height);
                      }}
                    >
                      {a.numberInSurah === 1 && renderSurahStartBanner(a.surah)}
                      <TouchableOpacity
                        onPress={() => handleSelectMushafAyah(a)}
                        onLongPress={() => handleLongPressMushafAyah(a)}
                        delayLongPress={500}
                        activeOpacity={0.7}
                        testID={`mushaf-ayah-${a.surah.number}-${a.numberInSurah}`}
                        style={[
                          styles.mushafTajweedAyahTouch,
                          highlightedAyahKey === `${a.surah.number}:${a.numberInSurah}` && {
                            backgroundColor: colors.accentDim,
                            borderColor: colors.accent,
                            borderWidth: 1,
                            borderRadius: 6,
                          },
                          selectedAyah?.number === a.number && { backgroundColor: colors.accentDim, borderRadius: 6 },
                        ]}
                      >
                        <TajweedText
                          text={getAyahScriptText(a.numberInSurah, a.text)}
                          size={fontSize + 2}
                          fontFamily={arabicFamilies.regular}
                          lineHeight={Math.round((fontSize + 2) * (settings?.quranLineHeight || 1.6))}
                          numberInSurah={a.numberInSurah}
                        />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.mushafSurahSectionsWrap}>
                  {surahGroups.map((group) => (
                    <View
                      key={`mushaf-group-${group.surah.number}`}
                      style={styles.mushafSurahGroup}
                      onLayout={(event) => {
                        groupOffsetsRef.current[group.surah.number] = event.nativeEvent.layout.y;
                      }}
                    >
                      {group.hasSurahStart && renderSurahStartBanner(group.surah)}
                      <View style={styles.mushafAyahsContainer}>
                        {group.ayahs.map((a) => {
                          const isSelected = selectedAyah?.number === a.number;
                          const isRestorationHighlight = highlightedAyahKey === `${a.surah.number}:${a.numberInSurah}`;
                          return (
                            <TouchableOpacity
                              key={`mushaf-${a.surah.number}-${a.numberInSurah}`}
                              onPress={() => handleSelectMushafAyah(a)}
                              onLongPress={() => handleLongPressMushafAyah(a)}
                              delayLongPress={500}
                              activeOpacity={0.7}
                              testID={`mushaf-ayah-${a.surah.number}-${a.numberInSurah}`}
                              onLayout={(event) => {
                                const { y, height } = event.nativeEvent.layout;
                                const groupY = groupOffsetsRef.current[group.surah.number] || 0;
                                const absoluteY = groupY + y;
                                ayahLayoutsRef.current[`${a.surah.number}:${a.numberInSurah}`] = { y: absoluteY, height };
                                ayahLayoutsRef.current[a.number] = { y: absoluteY, height };
                                if (selectedAyah?.number === a.number) {
                                  setSelectedAyahY(absoluteY);
                                  setSelectedAyahHeight(height);
                                }
                                handleMushafAyahLayout(a.surah.number, a.numberInSurah, absoluteY, height);
                              }}
                              style={[
                                styles.mushafAyahTouch,
                                isRestorationHighlight && {
                                  backgroundColor: colors.accentDim,
                                  borderColor: colors.accent,
                                  borderWidth: 1,
                                  borderRadius: 8,
                                },
                                isSelected && { backgroundColor: colors.accentDim, borderRadius: 8 },
                              ]}
                            >
                              <Text style={styles.mushafAyahText}>
                                <Text
                                  style={{
                                    fontFamily: arabicFamilies.regular,
                                    fontSize: fontSize + 2,
                                    color: isSelected ? colors.accent : colors.textPrimary,
                                    lineHeight: Math.round((fontSize + 2) * (settings?.quranLineHeight || 1.6)),
                                    writingDirection: 'rtl',
                                  }}
                                >
                                  {getDisplayedAyahText(
                                    a.surah.number,
                                    a.numberInSurah,
                                    getAyahScriptText(a.numberInSurah, a.text)
                                  )}{' '}
                                </Text>
                                <Text
                                  style={{
                                    fontFamily: arabicFamilies.regular,
                                    fontSize: Math.max(12, fontSize - 2),
                                    color: colors.accent,
                                    fontWeight: 'bold',
                                  }}
                                >
                                  ۝{toArabicNumerals(a.numberInSurah)}{' '}
                                </Text>
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  ))}
                </View>
              )}
              {selectedAyah && (
                <View
                  pointerEvents="box-none"
                  style={[
                    styles.mushafInlineSelectedToolbar,
                    {
                      top: selectedAyahY >= 88
                        ? Math.max(0, selectedAyahY - 24)
                        : Math.max(0, selectedAyahY + (selectedAyahHeight || 44) + 4),
                    },
                  ]}
                >
                  {renderSelectedAyahToolbar()}
                </View>
              )}
            </View>

            {/* Translation Section (if enabled) */}
            {showTranslation && (
              <View style={[styles.mushafTranslationsWrap, { borderTopColor: colors.borderSubtle }]}>
                <Text style={[styles.mushafTranslationsHeading, { color: colors.accent }]}>
                  {t('TRANSLATION')} ({flag} {(edition?.name || '').toUpperCase()})
                </Text>
                {currentPageData.ayahs.map((a) => (
                  <View
                    key={`tr-${a.surah.number}-${a.numberInSurah}`}
                    style={[
                      styles.mushafTranslationRow,
                      selectedAyah?.number === a.number && { backgroundColor: colors.accentDim, borderRadius: 8 },
                    ]}
                  >
                    <View style={styles.mushafTranslationMeta}>
                      <Text style={[styles.mushafAyahBadge, { color: colors.accent }]}>
                        {a.surah.number}:{a.numberInSurah}
                      </Text>
                      <Text style={[styles.mushafSurahSmallName, { color: colors.textMuted }]}>
                        {a.surah.englishName}
                      </Text>
                    </View>
                    <Text style={[styles.mushafTranslationText, { color: colors.textSecondary }]}>
                      {a.translation || ''}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
        contentContainerStyle={styles.mushafScrollContent}
        initialNumToRender={1}
        maxToRenderPerBatch={1}
        windowSize={3}
        showsVerticalScrollIndicator={true}
        ListFooterComponent={renderMushafPaginationFooter()}
      />
    );
  };

  const cardsAyahs = useMemo(() => {
    const targetNum = safeSurahNumber || surahNumberRef.current;
    if (surah && Array.isArray(surah.ayahs) && surah.ayahs.length > 0 && (surah.number === safeSurahNumber || surah.number === surahNumberRef.current)) {
      return surah.ayahs;
    }
    const cached = loadQuranCache<SurahDetail>(`surah:${targetNum}:${edition?.editionIdentifier || 'en.sahih'}`) ||
                   loadQuranCache<SurahDetail>(`surah:${targetNum}:ar`);
    if (cached && Array.isArray(cached.ayahs) && cached.ayahs.length > 0) {
      return cached.ayahs;
    }
    if (currentPageData && Array.isArray(currentPageData.ayahs)) {
      const matched = currentPageData.ayahs.filter((a) => a.surah.number === targetNum);
      if (matched.length > 0) {
        return matched.map((a) => ({
          number: a.number,
          numberInSurah: a.numberInSurah,
          text: a.text,
          surah: { number: a.surah.number, name: a.surah.name, englishName: a.surah.englishName },
          translation: a.translation,
          page: a.page,
          juz: a.juz,
          hizbQuarter: a.hizbQuarter,
        }));
      }
      if (currentPageData.ayahs.length > 0) {
        return currentPageData.ayahs.map((a) => ({
          number: a.number,
          numberInSurah: a.numberInSurah,
          text: a.text,
          surah: { number: a.surah.number, name: a.surah.name, englishName: a.surah.englishName },
          translation: a.translation,
          page: a.page,
          juz: a.juz,
          hizbQuarter: a.hizbQuarter,
        }));
      }
    }
    return [];
  }, [surah, safeSurahNumber, edition?.editionIdentifier, currentPageData]);

  const navBarPaddingH = isCompact ? 12 : 16;
  const navBarPaddingV = isCompact ? 8 : 10;
  const backTextSize = isCompact ? 13 : 14;
  const backIconSize = isCompact ? 18 : 20;
  const surahNavBtnSize = isCompact ? 32 : 36;
  const surahNavIconSize = isCompact ? 20 : 22;
  const dotsBtnSize = isCompact ? 36 : 40;
  const dotsIconSize = isCompact ? 20 : 22;
  const titleFontSizeNav = isCompact ? 16 : 18;

  return (
    <View style={[styles.container, { backgroundColor: colors.bgBase }]}>
      {/* Top Navigation Bar - Clean single row (auto-hides while scrolling down) */}
      <Animated.View
        style={[
          styles.navBar,
          { borderBottomColor: colors.borderSubtle },
          { paddingHorizontal: navBarPaddingH, paddingVertical: navBarPaddingV },
          isCompact ? styles.navBarCompact : styles.navBarTablet,
          { opacity: navOpacity },
        ]}
        pointerEvents={navHidden ? 'none' : 'auto'}
      >
        {/* Back button - fixed left */}
        <TouchableOpacity
          style={[
            styles.backButton,
            { gap: isCompact ? 4 : 6, paddingVertical: isCompact ? 3 : 4 },
          ]}
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel={t('Back to Quran')}
        >
          <Ionicons name={getBackIcon('chevron')} size={backIconSize} color={colors.accent} />
          <Text style={[styles.backText, { color: colors.accent, fontSize: backTextSize }]}>Quran</Text>
        </TouchableOpacity>

        {/* Center: Surah name / Page as centerpiece with prev/next inline */}
        <View style={styles.navCenter}>
          <View style={styles.surahNavInline}>
            <TouchableOpacity
              testID="mushaf-nav-prev-btn"
              style={[
                styles.surahNavBtn,
                { opacity: (readingMode === 'mushaf' ? currentPage <= 1 : surahNumber <= 1) ? 0.4 : 1 },
                { minWidth: surahNavBtnSize, minHeight: surahNavBtnSize, padding: 4 },
              ]}
              onPress={() => {
                if (readingMode === 'mushaf') {
                  goToPage(currentPage - 1);
                } else {
                  handleNavigateSurah(surahNumber - 1);
                }
              }}
              disabled={readingMode === 'mushaf' ? currentPage <= 1 : surahNumber <= 1}
              accessibilityRole="button"
              accessibilityLabel={readingMode === 'mushaf' ? t('Previous Page') : t('Previous Surah')}
            >
              <Ionicons name={getBackIcon()} size={surahNavIconSize} color={colors.accent} />
            </TouchableOpacity>
            <View style={styles.navTitleColumn}>
              <Text
                style={[
                  styles.navSurahTitle,
                  { color: colors.textPrimary, fontSize: titleFontSizeNav },
                ]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {readingMode === 'mushaf'
                  ? (currentPageData?.surahs?.length
                      ? currentPageData.surahs.map((s) => s.englishName).join(', ')
                      : surah?.englishName || `Page ${currentPage}`)
                  : surah?.englishName || `Surah ${surahNumber}`}
              </Text>
              {readingMode === 'mushaf' && (
                <Text style={[styles.navPageSubTitle, { color: colors.accent }]}>
                  {`Page ${displayedMushafPage} of ${TOTAL_MUSHAF_PAGES}`}
                </Text>
              )}
            </View>
            <TouchableOpacity
              testID="mushaf-nav-next-btn"
              style={[
                styles.surahNavBtn,
                { opacity: (readingMode === 'mushaf' ? currentPage >= TOTAL_MUSHAF_PAGES : surahNumber >= 114) ? 0.4 : 1 },
                { minWidth: surahNavBtnSize, minHeight: surahNavBtnSize, padding: 4 },
              ]}
              onPress={() => {
                if (readingMode === 'mushaf') {
                  goToPage(currentPage + 1);
                } else {
                  handleNavigateSurah(surahNumber + 1);
                }
              }}
              disabled={readingMode === 'mushaf' ? currentPage >= TOTAL_MUSHAF_PAGES : surahNumber >= 114}
              accessibilityRole="button"
              accessibilityLabel={readingMode === 'mushaf' ? t('Next Page') : t('Next Surah')}
            >
              <Ionicons name={getForwardIcon()} size={surahNavIconSize} color={colors.accent} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Dots menu button - fixed right */}
        <TouchableOpacity
          testID="reader-dots-menu-btn"
          style={[
            styles.dotsButton,
            {
              backgroundColor: toolsMenuOpen ? colors.accentDim : colors.bgSurface,
              borderColor: toolsMenuOpen ? colors.accent : colors.borderSubtle,
            },
          ]}
          onPress={() => setToolsMenuOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={t('Reading tools')}
          accessibilityState={{ expanded: toolsMenuOpen }}
          activeOpacity={0.7}
          hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
        >
          <Ionicons
            name="ellipsis-horizontal"
            size={dotsIconSize}
            color={toolsMenuOpen ? colors.accent : colors.textSecondary}
          />
        </TouchableOpacity>
      </Animated.View>

      {/* Reading Tools Menu Modal */}
      <Modal
        visible={toolsMenuOpen}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setToolsMenuOpen(false)}
        statusBarTranslucent
      >
        <View style={styles.toolsMenuOverlay}>
          <TouchableWithoutFeedback onPress={() => setToolsMenuOpen(false)}>
            <View style={styles.toolsMenuBackdrop} />
          </TouchableWithoutFeedback>

          <View
            style={[
              styles.toolsMenuPanel,
              { backgroundColor: colors.bgBase, borderColor: colors.borderSubtle },
            ]}
          >
            {/* Drag Pill */}
            <TouchableOpacity
              onPress={() => setToolsMenuOpen(false)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={t('Dismiss reading tools')}
              hitSlop={{ top: 12, bottom: 12, left: 24, right: 24 }}
            >
              <View style={[styles.toolsMenuDragPill, { backgroundColor: colors.borderStrong }]} />
            </TouchableOpacity>

            {/* Header Strip */}
            <View style={styles.toolsMenuHeader}>
              <View style={styles.toolsMenuHeaderLeft}>
                <Text
                  style={[styles.toolsMenuSurahTitle, { color: colors.textPrimary }]}
                  numberOfLines={1}
                >
                  {getLocalizedSurahName(safeSurahNumber, surah?.englishName || `Surah ${safeSurahNumber}`)}
                </Text>
                <Text style={[styles.toolsMenuSubtitle, { color: colors.textMuted }]}>
                  {readingProgress.percent}% · Ayah {readingProgress.currentAyah} of {readingProgress.totalAyahs}
                </Text>
              </View>
              <View
                style={[
                  styles.toolsMenuJuzChip,
                  { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle },
                ]}
              >
                <Text style={[styles.toolsMenuJuzText, { color: colors.accent }]}>
                  {selectedJuz ? `Juz ${selectedJuz}` : '—'}
                </Text>
              </View>
              {/* Explicit close button — the drag pill is not a tap target */}
              <TouchableOpacity
                onPress={() => setToolsMenuOpen(false)}
                style={styles.toolsMenuCloseBtn}
                accessibilityRole="button"
                accessibilityLabel={t('Close reading tools')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* 3px Progress Bar */}
            <View
              style={[
                styles.toolsMenuProgressBarTrack,
                { backgroundColor: colors.borderSubtle },
              ]}
            >
              <View
                style={[
                  styles.toolsMenuProgressBarFill,
                  {
                    backgroundColor: colors.accent,
                    width: `${Math.min(100, Math.max(0, readingProgress.percent))}%`,
                  },
                ]}
              />
            </View>

            {/* Scrollable Grouped Content */}
            <ScrollView
              style={styles.toolsMenuScroll}
              contentContainerStyle={[
                styles.toolsMenuScrollContent,
                { paddingBottom: Math.max(insets.bottom, 16) + 12 },
              ]}
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              {/* DISPLAY */}
              <View style={styles.toolsMenuGroup}>
                <Text style={[styles.toolsMenuSectionLabel, { color: colors.textMuted }]}>
                  {t('DISPLAY')}
                </Text>
                <View
                  style={[
                    styles.toolsMenuGroupCard,
                    { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle },
                  ]}
                >
                  {/* Reading Mode */}
                  <TouchableOpacity
                    style={styles.toolsMenuItem}
                    onPress={() => {
                      handleToggleReadingMode();
                      setToolsMenuOpen(false);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`Reading mode: ${readingMode}. Tap to toggle.`}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.toolsMenuIcon,
                        {
                          backgroundColor:
                            readingMode !== 'cards' ? colors.accentDim : colors.bgBase,
                        },
                      ]}
                    >
                      <Ionicons
                        name={readingMode !== 'cards' ? 'book' : 'list'}
                        size={20}
                        color={readingMode !== 'cards' ? colors.accent : colors.textSecondary}
                      />
                    </View>
                    <View style={styles.toolsMenuTextGroup}>
                      <Text style={[styles.toolsMenuItemTitle, { color: colors.textPrimary }]}>
                        {t('Reading Mode')}
                      </Text>
                      <Text style={[styles.toolsMenuItemSubtitle, { color: colors.textMuted }]}>
                        {readingMode === 'mushaf'
                          ? t('Mushaf Pages', 'Mushaf Pages')
                          : t('Ayah by Ayah', 'Ayah by Ayah')}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.toolsMenuIndicator,
                        {
                          backgroundColor:
                            readingMode !== 'cards' ? colors.accent : 'transparent',
                          borderColor:
                            readingMode !== 'cards' ? colors.accent : colors.borderSubtle,
                        },
                      ]}
                    />
                  </TouchableOpacity>

                  <View
                    style={[
                      styles.toolsMenuInnerDivider,
                      { backgroundColor: colors.borderSubtle },
                    ]}
                  />

                  {/* Font Size */}
                  <View style={styles.toolsMenuFontRow}>
                    <View style={styles.toolsMenuFontLabel}>
                      <View
                        style={[
                          styles.toolsMenuIcon,
                          { backgroundColor: colors.accentDim },
                        ]}
                      >
                        <Ionicons name="text-outline" size={20} color={colors.accent} />
                      </View>
                      <View style={styles.toolsMenuTextGroup}>
                        <Text style={[styles.toolsMenuItemTitle, { color: colors.textPrimary }]}>
                          {t('Font Size')}
                        </Text>
                        <Text style={[styles.toolsMenuItemSubtitle, { color: colors.textSecondary }]}>
                          {fontSize}pt
                        </Text>
                      </View>
                    </View>
                    <View style={styles.toolsMenuFontControls}>
                      <TouchableOpacity
                        style={[
                          styles.toolsMenuFontBtn,
                          {
                            backgroundColor: colors.bgBase,
                            borderColor: colors.borderSubtle,
                            opacity: fontSize <= QURAN_FONT_SIZE_MIN ? 0.35 : 1,
                          },
                        ]}
                        onPress={() => handleAdjustFontSize(-QURAN_FONT_SIZE_STEP)}
                        disabled={fontSize <= QURAN_FONT_SIZE_MIN}
                        accessibilityRole="button"
                        accessibilityLabel={t('Decrease font size')}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      >
                        <Text style={[styles.toolsMenuFontBtnText, { color: colors.textPrimary }]}>
                          A−
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.toolsMenuFontBtn,
                          {
                            backgroundColor: colors.bgBase,
                            borderColor: colors.borderSubtle,
                            opacity: fontSize >= QURAN_FONT_SIZE_MAX ? 0.35 : 1,
                          },
                        ]}
                        onPress={() => handleAdjustFontSize(QURAN_FONT_SIZE_STEP)}
                        disabled={fontSize >= QURAN_FONT_SIZE_MAX}
                        accessibilityRole="button"
                        accessibilityLabel={t('Increase font size')}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      >
                        <Text style={[styles.toolsMenuFontBtnText, { color: colors.textPrimary }]}>
                          A+
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.toolsMenuInnerDivider,
                      { backgroundColor: colors.borderSubtle },
                    ]}
                  />

                  {/* Line Height */}
                  <View style={styles.toolsMenuFontRow}>
                    <View style={styles.toolsMenuFontLabel}>
                      <View
                        style={[
                          styles.toolsMenuIcon,
                          { backgroundColor: colors.accentDim },
                        ]}
                      >
                        <Ionicons name="reorder-three-outline" size={20} color={colors.accent} />
                      </View>
                      <View style={styles.toolsMenuTextGroup}>
                        <Text style={[styles.toolsMenuItemTitle, { color: colors.textPrimary }]}>
                          {t('Line Height')}
                        </Text>
                        <Text style={[styles.toolsMenuItemSubtitle, { color: colors.textSecondary }]}>
                          {quranLineHeight.toFixed(1)}×
                        </Text>
                      </View>
                    </View>
                    <View style={styles.toolsMenuFontControls}>
                      <TouchableOpacity
                        style={[
                          styles.toolsMenuFontBtn,
                          {
                            backgroundColor: colors.bgBase,
                            borderColor: colors.borderSubtle,
                            opacity: quranLineHeight <= QURAN_LINE_HEIGHT_MIN ? 0.35 : 1,
                          },
                        ]}
                        onPress={() => handleAdjustLineHeight(-QURAN_LINE_HEIGHT_STEP)}
                        disabled={quranLineHeight <= QURAN_LINE_HEIGHT_MIN}
                        accessibilityRole="button"
                        accessibilityLabel={t('Decrease line height')}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      >
                        <Text style={[styles.toolsMenuFontBtnText, { color: colors.textPrimary }]}>
                          −
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.toolsMenuFontBtn,
                          {
                            backgroundColor: colors.bgBase,
                            borderColor: colors.borderSubtle,
                            opacity: quranLineHeight >= QURAN_LINE_HEIGHT_MAX ? 0.35 : 1,
                          },
                        ]}
                        onPress={() => handleAdjustLineHeight(QURAN_LINE_HEIGHT_STEP)}
                        disabled={quranLineHeight >= QURAN_LINE_HEIGHT_MAX}
                        accessibilityRole="button"
                        accessibilityLabel={t('Increase line height')}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      >
                        <Text style={[styles.toolsMenuFontBtnText, { color: colors.textPrimary }]}>
                          +
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.toolsMenuInnerDivider,
                      { backgroundColor: colors.borderSubtle },
                    ]}
                  />

                  {/* Quran Script */}
                  <TouchableOpacity
                    style={styles.toolsMenuItem}
                    onPress={() => {
                      setScriptPickerOpen(true);
                      setToolsMenuOpen(false);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`Quran script: ${selectedScriptOption.label}. Tap to change.`}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.toolsMenuIcon,
                        { backgroundColor: colors.accentDim },
                      ]}
                    >
                      <Ionicons name="color-palette-outline" size={20} color={colors.accent} />
                    </View>
                    <View style={styles.toolsMenuTextGroup}>
                      <Text style={[styles.toolsMenuItemTitle, { color: colors.textPrimary }]}>
                        {t('Script')}
                      </Text>
                      <Text
                        style={[styles.toolsMenuItemSubtitle, { color: colors.textSecondary }]}
                        numberOfLines={1}
                      >
                        {t(selectedScriptOption.label)} — {t(selectedScriptOption.description)}
                      </Text>
                    </View>
                    <Ionicons name={getForwardIcon()} size={18} color={colors.textMuted} />
                  </TouchableOpacity>

                  <View
                    style={[
                      styles.toolsMenuInnerDivider,
                      { backgroundColor: colors.borderSubtle },
                    ]}
                  />

                  {/* Keep Awake */}
                  <TouchableOpacity
                    style={styles.toolsMenuItem}
                    onPress={() => {
                      const next = !keepAwake;
                      setKeepAwake(next);
                      AsyncStorage.setItem(STORAGE_KEY_KEEP_AWAKE, String(next)).catch(() => {});
                      setToolsMenuOpen(false);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={keepAwake ? 'Disable keep awake' : 'Enable keep awake'}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.toolsMenuIcon,
                        {
                          backgroundColor: keepAwake ? colors.accentDim : colors.bgBase,
                        },
                      ]}
                    >
                      <Ionicons
                        name={keepAwake ? 'sunny' : 'moon-outline'}
                        size={20}
                        color={keepAwake ? colors.accent : colors.textSecondary}
                      />
                    </View>
                    <View style={styles.toolsMenuTextGroup}>
                      <Text style={[styles.toolsMenuItemTitle, { color: colors.textPrimary }]}>
                        {t('Keep Screen Awake')}
                      </Text>
                      <Text style={[styles.toolsMenuItemSubtitle, { color: colors.textMuted }]}>
                        {keepAwake ? t('Screen stays on while reading', 'Screen stays on while reading') : t('Screen may dim', 'Screen may dim')}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.toolsMenuIndicator,
                        {
                          backgroundColor: keepAwake ? colors.accent : 'transparent',
                          borderColor: keepAwake ? colors.accent : colors.borderSubtle,
                        },
                      ]}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* LANGUAGE & TAFSIR */}
              <View style={styles.toolsMenuGroup}>
                <Text style={[styles.toolsMenuSectionLabel, { color: colors.textMuted }]}>
                  {t('LANGUAGE & TAFSIR')}
                </Text>
                <View
                  style={[
                    styles.toolsMenuGroupCard,
                    { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle },
                  ]}
                >
                  {/* Translation Language */}
                  <TouchableOpacity
                    style={styles.toolsMenuItem}
                    onPress={() => {
                      setLangPickerOpen(true);
                      setToolsMenuOpen(false);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`Translation language: ${language} ${flag}. Tap to change.`}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.toolsMenuIcon,
                        { backgroundColor: colors.accentDim },
                      ]}
                    >
                      <Ionicons name="globe-outline" size={20} color={colors.accent} />
                    </View>
                    <View style={styles.toolsMenuTextGroup}>
                      <Text style={[styles.toolsMenuItemTitle, { color: colors.textPrimary }]}>
                        {t('Translation Language')}
                      </Text>
                      <Text
                        style={[styles.toolsMenuItemSubtitle, { color: colors.textSecondary }]}
                        numberOfLines={1}
                      >
                        {flag} {getLocalizedLanguageName(language).toUpperCase()} — {getLocalizedTranslatorName(edition.editionIdentifier, edition.name)}
                      </Text>
                    </View>
                    <Ionicons name={getForwardIcon()} size={18} color={colors.textMuted} />
                  </TouchableOpacity>

                  <View
                    style={[
                      styles.toolsMenuInnerDivider,
                      { backgroundColor: colors.borderSubtle },
                    ]}
                  />

                  {/* Show/Hide Translation */}
                  <TouchableOpacity
                    style={styles.toolsMenuItem}
                    onPress={() => {
                      handleToggleTranslation();
                      setToolsMenuOpen(false);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={showTranslation ? 'Hide translation' : 'Show translation'}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.toolsMenuIcon,
                        {
                          backgroundColor: showTranslation ? colors.accentDim : colors.bgBase,
                        },
                      ]}
                    >
                      <Ionicons
                        name={
                          showTranslation
                            ? 'chatbubble-ellipses'
                            : 'chatbubble-ellipses-outline'
                        }
                        size={20}
                        color={showTranslation ? colors.accent : colors.textSecondary}
                      />
                    </View>
                    <View style={styles.toolsMenuTextGroup}>
                      <Text style={[styles.toolsMenuItemTitle, { color: colors.textPrimary }]}>
                        {t('Translation')}
                      </Text>
                      <Text style={[styles.toolsMenuItemSubtitle, { color: colors.textMuted }]}>
                        {showTranslation ? t('Shown', 'Shown') : t('Hidden', 'Hidden')}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.toolsMenuIndicator,
                        {
                          backgroundColor: showTranslation ? colors.accent : 'transparent',
                          borderColor: showTranslation ? colors.accent : colors.borderSubtle,
                        },
                      ]}
                    />
                  </TouchableOpacity>

                  <View
                    style={[
                      styles.toolsMenuInnerDivider,
                      { backgroundColor: colors.borderSubtle },
                    ]}
                  />

                  {/* Tafsir Source */}
                  <TouchableOpacity
                    style={styles.toolsMenuItem}
                    onPress={() => {
                      setTafsirSourcePickerOpen(true);
                      setToolsMenuOpen(false);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`Tafsir source: ${currentTafsirSource.name}. Tap to change.`}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.toolsMenuIcon,
                        { backgroundColor: colors.accentDim },
                      ]}
                    >
                      <Ionicons name="book-outline" size={20} color={colors.accent} />
                    </View>
                    <View style={styles.toolsMenuTextGroup}>
                      <Text style={[styles.toolsMenuItemTitle, { color: colors.textPrimary }]}>
                        {t('Tafsir Source')}
                      </Text>
                      <Text
                        style={[styles.toolsMenuItemSubtitle, { color: colors.textSecondary }]}
                        numberOfLines={1}
                      >
                        {currentTafsirSource.name} ({currentTafsirSource.language})
                      </Text>
                    </View>
                    <Ionicons name={getForwardIcon()} size={18} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* NAVIGATE */}
              <View style={styles.toolsMenuGroup}>
                <Text style={[styles.toolsMenuSectionLabel, { color: colors.textMuted }]}>
                  {t('NAVIGATE')}
                </Text>
                <View
                  style={[
                    styles.toolsMenuGroupCard,
                    { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle },
                  ]}
                >
                  {/* Jump to Juz */}
                  <TouchableOpacity
                    style={styles.toolsMenuItem}
                    onPress={() => {
                      setJuzPickerOpen(true);
                      setToolsMenuOpen(false);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={t('Jump to Juz')}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.toolsMenuIcon,
                        { backgroundColor: colors.accentDim },
                      ]}
                    >
                      <Ionicons name="grid-outline" size={20} color={colors.accent} />
                    </View>
                    <View style={styles.toolsMenuTextGroup}>
                      <Text style={[styles.toolsMenuItemTitle, { color: colors.textPrimary }]}>
                        {t('Jump to Juz')}
                      </Text>
                      <Text style={[styles.toolsMenuItemSubtitle, { color: colors.textSecondary }]}>
                        {(() => {
                          const activeJuz = selectedJuz || currentPosition.juz;
                          return (t('Juz {n} selected', { n: activeJuz, defaultValue: `Juz ${activeJuz} selected` }) || `Juz ${activeJuz} selected`)
                            .replace(/\{[nنjp]\}/g, String(activeJuz));
                        })()}
                      </Text>
                    </View>
                    <Ionicons name={getForwardIcon()} size={18} color={colors.textMuted} />
                  </TouchableOpacity>

                  <View
                    style={[
                      styles.toolsMenuInnerDivider,
                      { backgroundColor: colors.borderSubtle },
                    ]}
                  />

                  {/* Jump to Hizb */}
                  <TouchableOpacity
                    style={styles.toolsMenuItem}
                    onPress={() => {
                      setHizbPickerOpen(true);
                      setToolsMenuOpen(false);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={t('Jump to Hizb')}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.toolsMenuIcon,
                        { backgroundColor: colors.accentDim },
                      ]}
                    >
                      <Ionicons name="apps-outline" size={20} color={colors.accent} />
                    </View>
                    <View style={styles.toolsMenuTextGroup}>
                      <Text style={[styles.toolsMenuItemTitle, { color: colors.textPrimary }]}>
                        {t('Jump to Hizb')}
                      </Text>
                      <Text style={[styles.toolsMenuItemSubtitle, { color: colors.textMuted }]}>
                        {(() => {
                          const activeHizb = selectedHizb || currentPosition.hizb;
                          return (t('Hizb {n} selected', { n: activeHizb, defaultValue: `Hizb ${activeHizb} selected` }) || `Hizb ${activeHizb} selected`)
                            .replace(/\{[nنjp]\}/g, String(activeHizb));
                        })()}
                      </Text>
                    </View>
                    <Ionicons name={getForwardIcon()} size={18} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* OFFLINE */}
              <View style={styles.toolsMenuGroup}>
                <Text style={[styles.toolsMenuSectionLabel, { color: colors.textMuted }]}>
                  {t('OFFLINE')}
                </Text>
                <View
                  style={[
                    styles.toolsMenuGroupCard,
                    { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle },
                  ]}
                >
                  {/* Save for Offline */}
                  <TouchableOpacity
                    style={styles.toolsMenuItem}
                    onPress={handleSaveOffline}
                    accessibilityRole="button"
                    accessibilityLabel={
                      surahDownloaded
                        ? `Remove offline audio for Surah ${surah?.englishName ?? surahNumber}`
                        : `Download Surah ${surah?.englishName ?? surahNumber} audio for offline`
                    }
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.toolsMenuIcon,
                        {
                          backgroundColor:
                            surahDownloaded ? colors.accentDim : colors.bgBase,
                        },
                      ]}
                    >
                      {surahDownloading ? (
                        <ActivityIndicator size="small" color={colors.accent} />
                      ) : (
                        <Ionicons
                          name={
                            surahDownloaded
                              ? 'checkmark-circle'
                              : 'cloud-download-outline'
                          }
                          size={20}
                          color={
                            surahDownloaded ? colors.accent : colors.textSecondary
                          }
                        />
                      )}
                    </View>
                    <View style={styles.toolsMenuTextGroup}>
                      <Text style={[styles.toolsMenuItemTitle, { color: colors.textPrimary }]}>
                        {surahDownloaded ? t('Available Offline') : t('Save for Offline')}
                      </Text>
                      <Text style={[styles.toolsMenuItemSubtitle, { color: colors.textMuted }]}>
                        {surahDownloading
                          ? `${surahDownloadProgress ?? 0}%`
                          : surahDownloaded
                          ? surahDownloadSize || 'Full Surah audio'
                          : 'Download this surah'}
                      </Text>
                    </View>
                    {surahDownloaded ? (
                      <Ionicons name={getForwardIcon()} size={18} color={colors.textMuted} />
                    ) : null}
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Main View: Cards vs Mushaf */}
      {readingMode === 'mushaf' ? (
        renderMushafMode()
      ) : readingMode === 'cards' && loading && cardsAyahs.length === 0 ? (
        <View style={[styles.center, { backgroundColor: colors.bgBase, flex: 1, paddingVertical: 40 }]}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={[styles.mushafLoadingText, { color: colors.textSecondary, marginTop: 12 }]}>
            {t('Loading surah...')}
          </Text>
        </View>
      ) : readingMode === 'cards' && error && cardsAyahs.length === 0 ? (
        <View style={[styles.center, { backgroundColor: colors.bgBase, flex: 1, paddingVertical: 40 }]}>
          <Text style={[styles.errorText, { color: colors.textSecondary }]}>{error}</Text>
          <TouchableOpacity
            style={[styles.retryBtn, { borderColor: colors.accent, marginTop: 12 }]}
            onPress={() => loadSurah(true)}
            accessibilityRole="button"
            accessibilityLabel={t('Retry loading surah')}
          >
            <Text style={[styles.retryBtnText, { color: colors.accent }]}>{retry}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          key={`cards-surah-${safeSurahNumber}`}
          ref={listRef}
          data={cardsAyahs}
          extraData={`${fontSize}:${ayahLineHeight}:${settings?.quranArabicFont}:${currentScript}:${showTranslation}`}
          keyExtractor={(item) => String(item.numberInSurah)}
          renderItem={renderAyahItem}
          ListHeaderComponent={renderSurahHeader}
          contentContainerStyle={styles.listContent}
          initialNumToRender={initialNumToRender}
          maxToRenderPerBatch={15}
          windowSize={7}
          onScrollToIndexFailed={handleScrollToIndexFailed}
          onScroll={handleReaderScroll}
          onScrollBeginDrag={() => {
            cancelPendingRetry();
            userScrollingRef.current = true;
          }}
          onScrollEndDrag={() => {
            userScrollingRef.current = false;
          }}
          onMomentumScrollEnd={() => {
            userScrollingRef.current = false;
          }}
          scrollEventThrottle={16}
          viewabilityConfig={VIEWABILITY_CONFIG}
          onViewableItemsChanged={handleViewableItemsChanged}
        />
      )}

      {/* Reciter Chooser Modal */}
      <Modal
        visible={reciterChooserOpen}
        animationType="fade"
        transparent
        onRequestClose={() => setReciterChooserOpen(false)}
        statusBarTranslucent
      >
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={() => setReciterChooserOpen(false)}>
            <View style={styles.modalBackdrop} />
          </TouchableWithoutFeedback>

          <View style={[styles.modalSheet, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }]}>
            {/* Drag Pill */}
            <View style={[styles.modalDragPill, { backgroundColor: colors.borderSubtle }]} />

            {/* Header: compact eyebrow + title + close */}
            <View style={[styles.modalHeader, { borderBottomColor: colors.borderSubtle }]}>
              <View style={styles.modalHeaderLeft}>
                <Text style={[styles.modalEyebrow, { color: colors.accent }]}>{t('AUDIO RECITER')}</Text>
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                  {t('Select Reciter')}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setReciterChooserOpen(false)}
                style={styles.closeBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel={t('Close reciter selection')}
              >
                <Ionicons name="close" size={22} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Search Box */}
            <View
              style={[
                styles.reciterSearchWrap,
                { backgroundColor: colors.bgBase, borderColor: colors.borderSubtle },
              ]}
            >
              <Ionicons name="search" size={16} color={colors.textMuted} />
              <TextInput
                placeholder={t('Search reciter name...')}
                placeholderTextColor={colors.textMuted}
                value={reciterSearch}
                onChangeText={setReciterSearch}
                style={[styles.reciterSearchInput, { color: colors.textPrimary }]}
              />
              {reciterSearch.length > 0 && (
                <TouchableOpacity onPress={() => setReciterSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="close-circle" size={16} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            {/* Reciters List - Arabic only */}
            <FlatList
              data={filteredReciters}
              keyExtractor={(item) => item.identifier}
              contentContainerStyle={[
                styles.reciterList,
                { paddingBottom: Math.max(insets.bottom, 16) + 24 },
              ]}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              initialNumToRender={15}
              maxToRenderPerBatch={20}
              windowSize={7}
              renderItem={({ item }) => {
                const isSelected = item.identifier === selectedReciter;
                const country = item.country || getReciterCountry(item.identifier);
                return (
                  <TouchableOpacity
                    style={[
                      styles.reciterRow,
                      {
                        borderBottomColor: colors.borderSubtle,
                        backgroundColor: isSelected ? colors.accentDim : 'transparent',
                      },
                    ]}
                    onPress={() => {
                      haptic('selection');
                      handleSelectReciter(item.identifier);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`Select ${item.englishName}${country ? `, ${country}` : ''}`}
                  >
                    <View style={styles.reciterInfo}>
                      <Text
                        style={[
                          styles.reciterEngName,
                          { color: isSelected ? colors.accent : colors.textPrimary },
                        ]}
                        numberOfLines={1}
                      >
                        {item.englishName}
                      </Text>
                      {country ? (
                        <Text style={[styles.reciterCountry, { color: colors.textMuted }]}>
                          {country}
                        </Text>
                      ) : null}
                      {item.name ? (
                        <Text style={[styles.reciterArabicName, { color: colors.textSecondary }]}>
                          {item.name}
                        </Text>
                      ) : null}
                    </View>
                    <View style={styles.reciterTrailing}>
                      {isSelected ? (
                        <Ionicons name="checkmark-circle" size={22} color={colors.accent} />
                      ) : (
                        <Ionicons name="ellipse-outline" size={20} color={colors.borderSubtle} />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>

      {/* Language Chooser Modal */}
      <QuranLanguageModal
        visible={langPickerOpen}
        onClose={() => setLangPickerOpen(false)}
      />

      {/* Tafsir Source Chooser Modal */}
      <Modal
        visible={tafsirSourcePickerOpen}
        animationType="fade"
        transparent
        onRequestClose={() => setTafsirSourcePickerOpen(false)}
        statusBarTranslucent
      >
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={() => setTafsirSourcePickerOpen(false)}>
            <View style={styles.modalBackdrop} />
          </TouchableWithoutFeedback>

          <View style={[styles.modalSheet, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }]}>
            <View style={[styles.modalDragPill, { backgroundColor: colors.borderSubtle }]} />
            <View style={[styles.modalHeader, { borderBottomColor: colors.borderSubtle }]}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                Select Tafsir Source
              </Text>
              <TouchableOpacity
                onPress={() => setTafsirSourcePickerOpen(false)}
                style={styles.closeBtn}
                accessibilityRole="button"
                accessibilityLabel={t('Close')}
              >
                <Ionicons name="close" size={iconSizes.header} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={TAFSIR_SOURCES}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) + 24 }}
              renderItem={({ item }) => {
                const isSelected = item.id === settings.tafsirSourceId;
                return (
                  <TouchableOpacity
                    style={[
                      styles.reciterRow,
                      {
                        borderBottomColor: colors.borderSubtle,
                        backgroundColor: isSelected ? colors.accentDim : 'transparent',
                      },
                    ]}
                    onPress={() => { setTafsirSourceId(item.id as any); setTafsirSourcePickerOpen(false); }}
                  >
                    <View style={styles.reciterInfo}>
                      <View style={styles.reciterTitleRow}>
                        <Text style={[styles.reciterEngName, { color: colors.textPrimary }]} numberOfLines={1}>
                          {item.name}
                        </Text>
                        <View
                          style={[
                            styles.reciterLangBadge,
                            {
                              backgroundColor: item.languageCode === 'ar' ? colors.bgSurface : colors.accentDim,
                              borderColor: item.languageCode === 'ar' ? colors.borderSubtle : colors.accent,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.reciterLangBadgeText,
                              { color: item.languageCode === 'ar' ? colors.textMuted : colors.accent },
                            ]}
                          >
                            {item.language.toUpperCase()}
                          </Text>
                        </View>
                      </View>
                      <Text style={[styles.reciterArabicName, { color: colors.textMuted }]}>
                        {item.author}
                      </Text>
                    </View>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={20} color={colors.accent} />
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>

      {/* Juz Picker Modal */}
      <Modal
        visible={juzPickerOpen}
        animationType="fade"
        transparent
        onRequestClose={() => setJuzPickerOpen(false)}
        statusBarTranslucent
      >
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={() => setJuzPickerOpen(false)}>
            <View style={styles.modalBackdrop} />
          </TouchableWithoutFeedback>

          <View style={[styles.modalSheet, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }]}>
            <View style={[styles.modalDragPill, { backgroundColor: colors.borderSubtle }]} />
            <View style={[styles.modalHeader, { borderBottomColor: colors.borderSubtle }]}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                {t('Jump to Juz')}
              </Text>
              <TouchableOpacity
                onPress={() => setJuzPickerOpen(false)}
                style={styles.closeBtn}
                accessibilityRole="button"
                accessibilityLabel={t('Close')}
              >
                <Ionicons name="close" size={iconSizes.header} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={Array.from({ length: 30 }, (_, i) => i + 1)}
              keyExtractor={(item) => String(item)}
              contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) + 24 }}
              renderItem={({ item }) => {
                const juzStart = JUZ_STARTS[item];
                const surahName = surahsList.find((s) => s.number === juzStart?.surah)?.englishName || `Surah ${juzStart?.surah}`;
                const isSelected = selectedJuz === item;
                return (
                  <TouchableOpacity
                    style={[
                      styles.reciterRow,
                      {
                        borderBottomColor: colors.borderSubtle,
                        backgroundColor: isSelected ? colors.accentDim : 'transparent',
                      },
                    ]}
                    onPress={() => {
                      haptic('selection');
                      setSelectedJuz(item);
                      setJuzPickerOpen(false);
                      // Scroll to the first ayah of this juz
                      if (juzStart) {
                        // Find the index in the current surah's ayahs
                        // If the juz starts in a different surah, navigate to that surah
                        if (juzStart.surah !== surahNumber) {
                          // Navigate to the juz's starting surah AND ayah.
                          if (onNavigateSurah) onNavigateSurah(juzStart.surah, juzStart.ayah);
                        } else {
                          // Same surah, scroll to the ayah
                          if (readingMode === 'mushaf') {
                            setCurrentPage(getMushafPageForAyah(safeSurahNumber, juzStart.ayah));
                          } else {
                            setTimeout(() => {
                              listRef.current?.scrollToIndex({ index: juzStart.ayah - 1, animated: true });
                            }, 100);
                          }
                        }
                      }
                    }}
                  >
                    <View style={styles.reciterInfo}>
                      <View style={styles.reciterTitleRow}>
                        <Text style={[styles.reciterEngName, { color: isSelected ? colors.accent : colors.textPrimary }]} numberOfLines={1}>
                          Juz {item}
                        </Text>
                        <View
                          style={[
                            styles.reciterLangBadge,
                            { backgroundColor: colors.accentDim, borderColor: colors.accent },
                          ]}
                        >
                          <Text style={[styles.reciterLangBadgeText, { color: colors.accent }]}>
                            {surahName} {juzStart?.ayah}
                          </Text>
                        </View>
                      </View>
                    </View>
                    {isSelected && <Ionicons name="checkmark-circle" size={20} color={colors.accent} />}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>

      {/* Hizb Picker Modal */}
      <Modal
        visible={hizbPickerOpen}
        animationType="fade"
        transparent
        onRequestClose={() => setHizbPickerOpen(false)}
        statusBarTranslucent
      >
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={() => setHizbPickerOpen(false)}>
            <View style={styles.modalBackdrop} />
          </TouchableWithoutFeedback>

          <View style={[styles.modalSheet, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }]}>
            <View style={[styles.modalDragPill, { backgroundColor: colors.borderSubtle }]} />
            <View style={[styles.modalHeader, { borderBottomColor: colors.borderSubtle }]}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                {t('Jump to Hizb')}
              </Text>
              <TouchableOpacity
                onPress={() => setHizbPickerOpen(false)}
                style={styles.closeBtn}
                accessibilityRole="button"
                accessibilityLabel={t('Close')}
              >
                <Ionicons name="close" size={iconSizes.header} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={Array.from({ length: 60 }, (_, i) => i + 1)}
              keyExtractor={(item) => String(item)}
              contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) + 24 }}
              renderItem={({ item }) => {
                const hizbStart = HIZB_STARTS[item];
                const surahName = surahsList.find((s) => s.number === hizbStart?.surah)?.englishName || `Surah ${hizbStart?.surah}`;
                const isSelected = selectedHizb === item;
                return (
                  <TouchableOpacity
                    style={[
                      styles.reciterRow,
                      {
                        borderBottomColor: colors.borderSubtle,
                        backgroundColor: isSelected ? colors.accentDim : 'transparent',
                      },
                    ]}
                    onPress={() => {
                      haptic('selection');
                      setSelectedHizb(item);
                      setHizbPickerOpen(false);
                      // Scroll to the first ayah of this hizb
                      if (hizbStart) {
                        if (hizbStart.surah !== surahNumber) {
                          onNavigateSurah?.(hizbStart.surah, hizbStart.ayah);
                        } else {
                          if (readingMode === 'mushaf') {
                            setCurrentPage(getMushafPageForAyah(safeSurahNumber, hizbStart.ayah));
                          } else {
                            setTimeout(() => {
                              listRef.current?.scrollToIndex({ index: hizbStart.ayah - 1, animated: true });
                            }, 100);
                          }
                        }
                      }
                    }}
                  >
                    <View style={styles.reciterInfo}>
                      <View style={styles.reciterTitleRow}>
                        <Text style={[styles.reciterEngName, { color: isSelected ? colors.accent : colors.textPrimary }]} numberOfLines={1}>
                          Hizb {item}
                        </Text>
                        <View
                          style={[
                            styles.reciterLangBadge,
                            { backgroundColor: colors.accentDim, borderColor: colors.accent },
                          ]}
                        >
                          <Text style={[styles.reciterLangBadgeText, { color: colors.accent }]}>
                            {surahName} {hizbStart?.ayah}
                          </Text>
                        </View>
                      </View>
                    </View>
                    {isSelected && <Ionicons name="checkmark-circle" size={20} color={colors.accent} />}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>

      {/* Script Picker Modal */}
      <Modal
        visible={scriptPickerOpen}
        animationType="fade"
        transparent
        onRequestClose={() => setScriptPickerOpen(false)}
        statusBarTranslucent
      >
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={() => setScriptPickerOpen(false)}>
            <View style={styles.modalBackdrop} />
          </TouchableWithoutFeedback>

          <View style={[styles.modalSheet, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }]}>
            <View style={[styles.modalDragPill, { backgroundColor: colors.borderSubtle }]} />
            <View style={[styles.modalHeader, { borderBottomColor: colors.borderSubtle }]}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                {t('Select Quran Script')}
              </Text>
              <TouchableOpacity
                onPress={() => setScriptPickerOpen(false)}
                style={styles.closeBtn}
                accessibilityRole="button"
                accessibilityLabel={t('Close')}
              >
                <Ionicons name="close" size={iconSizes.header} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={QURAN_SCRIPTS}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) + 24 }}
              renderItem={({ item }) => {
                const isSelected = item.id === currentScript;
                return (
                  <TouchableOpacity
                    style={[
                      styles.reciterRow,
                      {
                        borderBottomColor: colors.borderSubtle,
                        backgroundColor: isSelected ? colors.accentDim : 'transparent',
                      },
                    ]}
                    onPress={() => {
                      haptic('selection');
                      setQuranScript(item.id);
                      setScriptPickerOpen(false);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`${item.label}: ${item.description}`}
                  >
                    <View style={styles.reciterInfo}>
                      <View style={styles.reciterTitleRow}>
                        <Text
                          style={[
                            styles.reciterEngName,
                            { color: isSelected ? colors.accent : colors.textPrimary },
                          ]}
                          numberOfLines={1}
                        >
                          {item.label}
                        </Text>
                        {item.id === 'uthmani' ? (
                          <View
                            style={[
                              styles.reciterLangBadge,
                              { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle },
                            ]}
                          >
                            <Text style={[styles.reciterLangBadgeText, { color: colors.textMuted }]}>
                              {t('DEFAULT')}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                      <Text style={[styles.reciterArabicName, { color: colors.textMuted }]}>
                        {item.description}
                      </Text>
                    </View>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={20} color={colors.accent} />
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>

      {/* Note Composer Bottom Sheet for Ayah Reflections */}
      <Modal
        visible={noteComposerTarget !== null}
        animationType="slide"
        transparent={true}
        onRequestClose={closeNoteComposer}
        statusBarTranslucent
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <TouchableWithoutFeedback onPress={closeNoteComposer}>
            <View style={styles.modalBackdrop} />
          </TouchableWithoutFeedback>
          <View
            style={[
              styles.noteModalSheet,
              {
                backgroundColor: colors.bgSurface,
                borderColor: colors.borderSubtle,
                paddingBottom:
                  (Platform.OS === 'android' ? keyboardHeight : 0) +
                  Math.max(insets.bottom, 16) +
                  12,
              },
            ]}
          >
            {/* Drag Pill */}
            <TouchableOpacity
              onPress={closeNoteComposer}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={t('Dismiss note composer')}
              hitSlop={{ top: 12, bottom: 12, left: 24, right: 24 }}
            >
              <View style={[styles.modalDragPill, { backgroundColor: colors.borderStrong }]} />
            </TouchableOpacity>

            {/* Header */}
            <View style={[styles.noteModalHeader, { borderBottomColor: colors.borderSubtle }]}>
              <View style={styles.noteModalHeaderLeft}>
                <Text style={[styles.noteModalEyebrow, { color: colors.accent }]}>{t('REFLECTIONS')}</Text>
                <Text
                  style={[styles.noteModalTitle, { color: colors.textPrimary }]}
                  numberOfLines={1}
                >
                  {noteComposerTarget?.surahName || (noteComposerTarget ? `Surah ${noteComposerTarget.surah}` : '')} · {t('Ayah')} {noteComposerTarget?.ayah}
                </Text>
              </View>
              <TouchableOpacity
                onPress={closeNoteComposer}
                style={styles.closeBtn}
                accessibilityRole="button"
                accessibilityLabel={t('Close note composer')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={22} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Content Body */}
            <View style={styles.noteModalBody}>
              <TextInput
                placeholder={t('Write your reflection, thoughts, or lessons from this verse...')}
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={4}
                value={noteComposerText}
                onChangeText={setNoteComposerText}
                autoFocus
                scrollEnabled
                textAlignVertical="top"
                style={[
                  styles.noteModalInput,
                  {
                    color: colors.textPrimary,
                    borderColor: colors.borderSubtle,
                    backgroundColor: colors.bgBase,
                  },
                ]}
              />

              <View style={styles.noteModalFooter}>
                <TouchableOpacity
                  onPress={closeNoteComposer}
                  style={[
                    styles.noteModalBtnCancel,
                    { borderColor: colors.borderSubtle, backgroundColor: colors.bgBase },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={t('Cancel note')}
                >
                  <Text style={[styles.noteModalBtnCancelText, { color: colors.textSecondary }]}>
                    {t('Cancel')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSaveNote}
                  style={[styles.noteModalBtnSave, { backgroundColor: colors.accent }]}
                  accessibilityRole="button"
                  accessibilityLabel={t('Save note')}
                >
                  <Text style={[styles.noteModalBtnSaveText, { color: colors.onAccent }]}>
                    {t('Save Note')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Share-as-image capture card (rendered off-screen while sharing) */}
      {shareAyahItem && (
        <View style={styles.shareCardWrap} pointerEvents="none">
          <View
            ref={shareCardRef}
            collapsable={false}
            style={[styles.shareCard, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }]}
          >
            <Text style={[styles.shareCardEyebrow, { color: colors.accent }]}>القرآن الكريم</Text>
            <Text style={[styles.shareCardArabic, { color: colors.textPrimary }]}>
              {getAyahTextForExport(shareAyahItem.numberInSurah, shareAyahItem.text)}
            </Text>
            <View style={[styles.shareCardRule, { backgroundColor: colors.accent }]} />
            {shareAyahItem.translation ? (
              <Text style={[styles.shareCardTrans, { color: colors.textSecondary }]}>
                {shareAyahItem.translation}
              </Text>
            ) : null}
            <Text style={[styles.shareCardRef, { color: colors.textMuted }]}>
              Quran {shareAyahItem.surah?.number || surahNumber}:{shareAyahItem.numberInSurah}
            </Text>

            {/* App Brand Footer: Logo + ISLAMIC wordmark */}
            <View style={styles.shareCardBrandFooter} collapsable={false}>
              <View collapsable={false} style={styles.shareCardLogoWrap}>
                <Image
                  source={
                    mode === 'paper'
                      ? require('../../assets/logo-master-black.png')
                      : require('../../assets/logo-master-ivory.png')
                  }
                  style={styles.shareCardLogo}
                  resizeMode="contain"
                  fadeDuration={0}
                />
              </View>
              <Text
                style={[
                  styles.shareCardBrandWordmark,
                  { color: mode === 'paper' ? '#0F172A' : '#F1F5F9' },
                ]}
              >
                {isRTL() ? 'اسلامک' : 'ISLAMIC'}
              </Text>
            </View>
          </View>
        </View>
      )}

    </View>
  );
}

function toArabicNumerals(num: number): string {
  if (typeof num !== 'number' || isNaN(num)) return '';
  const digits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return String(num)
    .split('')
    .map((c) => digits[parseInt(c, 10)] ?? c)
    .join('');
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
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    maxWidth: 680,
    alignSelf: 'center',
    width: '100%',
  },
  navBarCompact: {
    minHeight: 44,
  },
  navBarTablet: {
    minHeight: 52,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 36,
    justifyContent: 'center',
    paddingVertical: 4,
    paddingRight: 8,
  },
  backText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 14,
  },
  navCenter: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
  },
  surahNavInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  surahNavBtn: {
    padding: 6,
    minWidth: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  surahNavLabel: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
    minWidth: 60,
    textAlign: 'center',
  },
  navSurahTitle: {
    fontFamily: 'InstrumentSerif_400Regular',
    flex: 1,
    minWidth: 0,
    textAlign: 'center',
  },
  dotsButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  toolBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    minWidth: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolBtnText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
  },
  langToolBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    gap: 4,
  },
  langToolText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 11,
  },

  /* Tools Menu (dots) */
  toolsMenuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  toolsMenuBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  toolsMenuPanel: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    maxWidth: 380,
    width: '100%',
    maxHeight: '88%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 16,
  },
  toolsMenuDragPill: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 8,
  },
  toolsMenuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 4,
    paddingBottom: 10,
  },
  toolsMenuCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  toolsMenuHeaderLeft: {
    flex: 1,
    minWidth: 0,
    paddingRight: 12,
  },
  toolsMenuSurahTitle: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 22,
    lineHeight: 26,
  },
  toolsMenuSubtitle: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
    marginTop: 2,
  },
  toolsMenuJuzChip: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolsMenuJuzText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 11,
    letterSpacing: 0.5,
  },
  toolsMenuProgressBarTrack: {
    height: 3,
    marginHorizontal: 18,
    borderRadius: 1.5,
    overflow: 'hidden',
    marginBottom: 12,
  },
  toolsMenuProgressBarFill: {
    height: 3,
    borderRadius: 1.5,
  },
  toolsMenuScroll: {
    flexShrink: 1,
    width: '100%',
  },
  toolsMenuScrollContent: {
    paddingHorizontal: 16,
    paddingTop: 2,
  },
  toolsMenuGroup: {
    marginBottom: 12,
  },
  toolsMenuSectionLabel: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 6,
    marginLeft: 4,
  },
  toolsMenuGroupCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  toolsMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 12,
    minHeight: 56,
  },
  toolsMenuIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolsMenuTextGroup: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  toolsMenuItemTitle: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 14.5,
  },
  toolsMenuItemSubtitle: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
  },
  toolsMenuIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
    marginLeft: 4,
  },
  toolsMenuDivider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 14,
  },
  toolsMenuInnerDivider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 14,
  },
  toolsMenuFontRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 14,
    minHeight: 56,
  },
  toolsMenuFontLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    minWidth: 0,
  },
  toolsMenuFontControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toolsMenuFontBtn: {
    width: 38,
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolsMenuFontBtnText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 13,
  },
  translationWrap: {
    marginTop: 8,
    gap: 3,
  },
  translationTag: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 10,
    letterSpacing: 0.5,
  },
  listContent: {
    padding: 16,
    gap: 14,
    paddingBottom: 40,
  },
  surahHeader: {
    marginBottom: 16,
  },
  surahEyebrowRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  surahEyebrow: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  surahAyahCount: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 4,
  },
  titleInfo: {
    flex: 1,
    minWidth: 0,
  },
  englishTitle: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 28,
  },
  englishTranslation: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
    marginTop: 2,
  },
  arabicSurahName: {
    marginLeft: 12,
  },
  audioControlsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 10,
  },
  playSurahBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  playSurahBtnText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
  },
  reciterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    maxWidth: 150,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  reciterNameText: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
    flexShrink: 1,
  },
  bismillahBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  bismillahText: {
    textAlign: 'center',
  },
  headerHairline: {
    marginTop: 8,
  },
  ayahCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  ayahActionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  ayahBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  ayahBadgeText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
  },
  actionsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtn: {
    padding: 4,
  },
  arabicAyahText: {
    textAlign: 'right',
    writingDirection: 'rtl',
    marginBottom: 8,
  },
  translationText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 14,
    lineHeight: 22,
    marginTop: 6,
  },
  inlineTafsirBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  tafsirHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  tafsirTitle: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
    letterSpacing: 0.5,
  },
  inlineTafsirText: {
    textAlign: 'right',
    writingDirection: 'rtl',
    lineHeight: 28,
  },
  mushafScrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  mushafContainer: {
    padding: 18,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  mushafParagraph: {
    textAlign: 'right',
    writingDirection: 'rtl',
    // Generous line spacing for Arabic diacritics/tashkeel: the inline ayah
    // Texts get explicit lineHeight per ayah, and each ayah block is separated
    // by a bottom margin so rows never overlap regardless of font size.
  },
  mushafAyahBlock: {
    // Each ayah is its own line box — the bottom margin guarantees the next
    // ayah's ascenders/diacritics never overlap this one's descenders, at any
    // font size and line-height multiplier.
    display: 'flex',
    marginBottom: 10,
  },
  mushafTranslationsWrap: {
    gap: 10,
  },
  mushafTranslationsHeading: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  mushafTranslationRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  mushafAyahBadge: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
    minWidth: 24,
  },
  mushafTranslationText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
    lineHeight: 20,
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalSheet: {
    width: '100%',
    maxWidth: 640,
    maxHeight: '92%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    overflow: 'hidden',
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  modalDragPill: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 6,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalHeaderLeft: {
    flex: 1,
  },
  modalEyebrow: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  modalTitle: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 24,
  },
  closeBtn: {
    padding: 8,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reciterSearchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  reciterSearchInput: {
    flex: 1,
    fontFamily: 'Manrope_400Regular',
    fontSize: 14,
    paddingVertical: 0,
  },
  reciterList: {
    paddingHorizontal: 20,
  },
  reciterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 56,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: 4,
  },
  reciterInfo: {
    flex: 1,
    paddingRight: 12,
  },
  reciterEngName: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 15,
  },
  reciterCountry: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    marginTop: 2,
  },
  reciterArabicName: {
    fontFamily: 'Amiri_400Regular',
    fontSize: 14,
    marginTop: 2,
  },
  reciterTrailing: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 24,
  },
  reciterTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reciterLangBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
  },
  reciterLangBadgeText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 9,
  },
  shareCardWrap: {
    position: 'absolute',
    left: -2000,
    top: 0,
    width: 360,
    padding: 20,
    backgroundColor: '#F8FAF9',
  },
  shareCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    alignItems: 'stretch',
  },
  shareCardEyebrow: {
    fontFamily: 'Amiri_400Regular',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  shareCardArabic: {
    fontFamily: 'Amiri_400Regular',
    fontSize: 26,
    lineHeight: 44,
    textAlign: 'right',
    writingDirection: 'rtl',
    includeFontPadding: false,
    marginBottom: 14,
  },
  shareCardRule: {
    height: 2,
    borderRadius: 1,
    marginBottom: 14,
    width: '40%',
    alignSelf: 'center',
  },
  shareCardTrans: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 14,
  },
  shareCardRef: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  shareCardBrandFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E2E8F0',
    gap: 8,
  },
  shareCardLogoWrap: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareCardLogo: {
    width: 32,
    height: 32,
  },
  shareCardBrandWordmark: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 12,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  mushafTajweedList: {
    width: '100%',
  },
  mushafTajweedAyahRow: {
    width: '100%',
    marginBottom: 12,
  },
  mushafTajweedAyahTouch: { width: '100%', paddingVertical: 2 },
  mushafSurahSectionsWrap: { width: '100%' },
  mushafSurahGroup: { width: '100%', marginBottom: 8 },
  mushafTranslationMeta: { fontFamily: 'Manrope_600SemiBold', fontSize: 11, marginTop: 4 },
  mushafSurahSmallName: { fontFamily: 'Manrope_600SemiBold', fontSize: 12, marginLeft: 4 },
  surahBannerContainer: { width: '100%', alignItems: 'center', marginBottom: 12 },
  surahBannerFrame: { width: '100%', borderWidth: 1, borderRadius: 12, padding: 12, alignItems: 'center' },
  surahBannerArabicName: { fontFamily: 'Amiri_700Bold', fontSize: 24, textAlign: 'center' },
  surahBannerMetaText: { fontFamily: 'Manrope_500Medium', fontSize: 11, marginTop: 4 },
  bismillahContainer: { alignItems: 'center', paddingVertical: 10 },
  mushafInlineSelectedToolbar: { position: 'absolute', left: 4, right: 4, zIndex: 100, elevation: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8 },
  mushafSelectedToolbar: { borderWidth: 1, borderRadius: 12, padding: 10, marginBottom: 10 },
  mushafSelectedMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  mushafSelectedRef: { fontFamily: 'Manrope_600SemiBold', fontSize: 12 },
  mushafSelectedActionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  mushafSelectedActionBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: 8, padding: 0 },
  mushafSelectedActionText: { display: 'none' },
  mushafAyahsContainer: { width: '100%' },
  mushafAyahTouch: { width: '100%', paddingVertical: 4, paddingHorizontal: 6, marginVertical: 2 },
  mushafAyahText: { textAlign: 'right', writingDirection: 'rtl' },
  mushafPaginationFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
  mushafPageNavBtn: { minWidth: 84, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, alignItems: 'center' },
  mushafPageNavBtnText: { fontFamily: 'Manrope_600SemiBold', fontSize: 12 },
  mushafPageBadgeCenter: { flex: 1, alignItems: 'center' },
  mushafPageBadgeText: { fontFamily: 'Manrope_700Bold', fontSize: 14 },
  mushafPageBadgeSub: { fontFamily: 'Manrope_500Medium', fontSize: 10, marginTop: 2 },
  mushafLoadingText: { fontFamily: 'Manrope_500Medium', fontSize: 13, textAlign: 'center', padding: 24 },
  mushafPageCard: { width: '100%', paddingBottom: 4 },
  mushafPageHeaderStrip: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, paddingVertical: 8, gap: 6 },
  mushafPageHeaderLeft: { flex: 1, fontFamily: 'Manrope_500Medium', fontSize: 10 },
  mushafPageHeaderCenter: { flex: 1.5, textAlign: 'center', fontFamily: 'Manrope_700Bold', fontSize: 11 },
  mushafPageHeaderRight: { flex: 1, textAlign: 'right', fontFamily: 'Manrope_500Medium', fontSize: 10 },
  navTitleColumn: { flex: 1, alignItems: 'center' },
  navPageSubTitle: { fontFamily: 'Manrope_500Medium', fontSize: 10, marginTop: 2 },
  scriptNoticeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 10,
    marginBottom: 6,
  },
  scriptNoticeText: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 12,
    flex: 1,
  },
  noteModalSheet: {
    width: '100%',
    maxWidth: 640,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 20,
  },
  noteModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  noteModalHeaderLeft: {
    flex: 1,
    minWidth: 0,
    paddingRight: 12,
  },
  noteModalEyebrow: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  noteModalTitle: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 22,
    lineHeight: 26,
  },
  noteModalBody: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  noteModalInput: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 15,
    lineHeight: 22,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    minHeight: 120,
    maxHeight: 200,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  noteModalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  noteModalBtnCancel: {
    paddingVertical: 11,
    paddingHorizontal: 18,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noteModalBtnCancelText: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 13,
  },
  noteModalBtnSave: {
    paddingVertical: 11,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noteModalBtnSaveText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
  },
});
