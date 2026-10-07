import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  BackHandler,
  Clipboard,
  FlatList,
  Image,
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
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHaptics } from '../lib/haptics';
import { iconSizes } from '../lib/iconMap';
import { fetchSurah, fetchAyahTafsir, SurahDetail, Ayah } from '../lib/quran';
import { ArabicText, AyahText, QURAN_FONT_FAMILIES } from '../components/ArabicText';
import { TajweedText } from '../components/TajweedText';
import { stripTajweedHtml } from '../lib/tajweed';
import { QuranScript, QURAN_SCRIPTS, fetchSurahWithScript, getScriptCacheKey } from '../lib/quranScripts';
import { retry, cancel, remove, copy, share, play, bookmark, surahLoadFailed, tafsirLoadFailed, downloadFailedTitle, downloadFailedBody } from '../lib/strings';
import { useSettings, QURAN_FONT_SIZE_MIN, QURAN_FONT_SIZE_MAX, QURAN_FONT_SIZE_STEP } from '../lib/settings';
import { TAFSIR_SOURCES } from '../lib/tafsirSources';
import { Hairline } from '../components/Hairline';
import { useQuranLanguage } from '../lib/quranLanguageState';
import { QuranLanguageModal } from '../components/QuranLanguageModal';
import { saveReadingPosition } from '../lib/continuing';
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
  saveRecentlyPlayed,
} from '../lib/db';
import { getBundledSurahs114, SurahMeta } from '../lib/quran';

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
  onBack: () => void;
  onNavigateSurah?: (surah: number, initialAyah?: number) => void;
}

type ReadingMode = 'cards' | 'mushaf';

const STORAGE_KEY_READING_MODE = 'quran-reading-mode';
const STORAGE_KEY_KEEP_AWAKE = 'quran-keep-awake';
const STORAGE_KEY_LAST_READ = 'quran-last-read-timestamp';

const VIEWABILITY_CONFIG: ViewabilityConfig = {
  itemVisiblePercentThreshold: 1,
  minimumViewTime: 500,
};

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

// Page approximation: ~20 pages per juz, 604 pages total for Madani mushaf
// Approximate: page = (globalAyahIndex / 6236) * 604
function getGlobalAyahIndex(surah: number, ayah: number): number {
  let idx = 0;
  const safeSurah = Math.max(1, Math.min(114, surah || 1));
  const safeAyah = Math.max(1, ayah || 1);
  for (let i = 0; i < safeSurah - 1; i++) {
    idx += SURAH_AYAH_COUNTS[i] || 0;
  }
  return idx + safeAyah;
}

function getApproxPage(surah: number, ayah: number): number {
  const globalIdx = getGlobalAyahIndex(surah, ayah);
  return Math.max(1, Math.min(604, Math.round((globalIdx / 6236) * 604) || 1));
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
      accessibilityLabel={`Bookmark Ayah ${ayahNumber}`}
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
  onBack,
  onNavigateSurah,
}: QuranReaderScreenProps) {
  const { colors, mode } = useTheme();
  const { haptic } = useHaptics();
  const { language, setLanguage, edition, flag } = useQuranLanguage();
  const { settings, setQuranFontSize, setQuranShowTranslation, setTafsirSourceId, setQuranScript } = useSettings();
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
  const fontSize = typeof settings?.quranFontSize === 'number' && settings.quranFontSize > 0 ? settings.quranFontSize : 28;
  const showTranslation = Boolean(settings?.quranShowTranslation);
  const currentTafsirSource = TAFSIR_SOURCES.find((s) => s.id === settings?.tafsirSourceId) || TAFSIR_SOURCES[0];
  const arabicFamilies = (settings?.quranArabicFont && QURAN_FONT_FAMILIES[settings.quranArabicFont]) || QURAN_FONT_FAMILIES.amiri;
  const ayahLineHeight = Math.round(fontSize * (settings?.quranLineHeight || 1.6));
  const [readingMode, setReadingMode] = useState<ReadingMode>('cards');
  const [bookmarks, setBookmarks] = useState<VerseRef[]>([]);

  // Continue Reading tracking refs (MUST be declared before any memo/effects)
  const surahNumberRef = useRef<number>(safeSurahNumber);
  const lastSavedAyahRef = useRef<number>(initialAyah || 1);
  const trackingReadyRef = useRef<boolean>(!initialAyah || initialAyah <= 1);
  const [currentVisibleAyah, setCurrentVisibleAyah] = useState<number>(initialAyah || 1);

  useEffect(() => {
    surahNumberRef.current = safeSurahNumber;
    lastSavedAyahRef.current = initialAyah || 1;
    setCurrentVisibleAyah(initialAyah || 1);
    trackingReadyRef.current = !initialAyah || initialAyah <= 1;
  }, [safeSurahNumber, initialAyah]);

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
  const [noteComposerAyah, setNoteComposerAyah] = useState<number | null>(null);
  const [noteComposerText, setNoteComposerText] = useState<string>('');
  // Share-as-image: the ayah being shared renders a clean card, captured to PNG.
  const shareCardRef = useRef<View>(null);
  const [shareAyahItem, setShareAyahItem] = useState<Ayah | null>(null);
  const [isSharingImage, setIsSharingImage] = useState(false);
  const [selectionActionBarVisible, setSelectionActionBarVisible] = useState<boolean>(false);
  const [showTagInput, setShowTagInput] = useState<boolean>(false);
  const [tagInput, setTagInput] = useState<string>('');
  const [highlightColorPickerOpen, setHighlightColorPickerOpen] = useState<boolean>(false);

  const openNoteComposer = (ayahNumber: number) => {
    setNoteComposerAyah(ayahNumber);
    setNoteComposerText('');
  };

  const handleSaveNote = () => {
    if (!noteComposerAyah) return;
    const trimmed = noteComposerText.trim();
    if (!trimmed) {
      setNoteComposerAyah(null);
      setNoteComposerText('');
      return;
    }
    addNote(safeSurahNumber, noteComposerAyah, trimmed);
    haptic('success');
    setNoteComposerAyah(null);
    setNoteComposerText('');
  };

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
    if (!surah) return { ayah: '—', page: '—' };
    const page = getApproxPage(safeSurahNumber, currentAyah);
    return { ayah: currentAyah, page };
  }, [surah, safeSurahNumber, initialAyah, currentVisibleAyah]);

  // Auto-hide top nav while scrolling down; reappear on scroll up / back to top
  const navOpacity = useRef(new Animated.Value(1)).current;
  const [navHidden, setNavHidden] = useState<boolean>(false);
  const navHiddenRef = useRef(false);
  const lastScrollYRef = useRef(0);

  const handleReaderScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = event.nativeEvent.contentOffset.y;
      const dy = y - lastScrollYRef.current;
      lastScrollYRef.current = y;
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
    [navOpacity]
  );

  // Audio state
  const [reciters, setReciters] = useState<Reciter[]>([]);
  const [selectedReciter, setSelectedReciter] = useState<string>('ar.alafasy');
  const [reciterChooserOpen, setReciterChooserOpen] = useState<boolean>(false);
  const [reciterSearch, setReciterSearch] = useState<string>('');
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [playingAyahNumber, setPlayingAyahNumber] = useState<number | null>(null);
  const [isPlayingSurah, setIsPlayingSurah] = useState<boolean>(false);

  // Ayah Tafsir state
  const [activeTafsirAyah, setActiveTafsirAyah] = useState<number | null>(null);
  const [tafsirLoading, setTafsirLoading] = useState<boolean>(false);
  const [tafsirText, setTafsirText] = useState<string | null>(null);
  const [tafsirEdition, setTafsirEdition] = useState<string | null>(null);

  // Copy feedback state (which ayah was just copied)
  const [copiedAyah, setCopiedAyah] = useState<number | null>(null);
  const copyResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyResetTimerRef.current) clearTimeout(copyResetTimerRef.current);
    };
  }, []);

  // Track daily reading session minutes towards Quran goal
  useEffect(() => {
    const interval = setInterval(() => {
      recordQuranReadingSession({ minutes: 1 }, settings.quranGoal).catch(() => {});
    }, 60000);

    return () => {
      clearInterval(interval);
    };
  }, [settings.quranGoal]);

  const listRef = useRef<FlatList<Ayah>>(null);

  // Continue Reading tracking (handler must stay stable across renders)
  const handleViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken<Ayah>[]; changed: ViewToken<Ayah>[] }) => {
      const first = viewableItems[0];
      if (!first || !first.item) return;
      const ayahNumber = first.item.numberInSurah;
      if (typeof ayahNumber !== 'number') return;
      setCurrentVisibleAyah(ayahNumber);
      if (!trackingReadyRef.current) return;
      if (ayahNumber === lastSavedAyahRef.current) return;
      lastSavedAyahRef.current = ayahNumber;
      saveReadingPosition(surahNumberRef.current, ayahNumber);
    },
    []
  );

  // Load preferences and reciters
  useEffect(() => {
    (async () => {
      try {
        const [savedMode, audioSettings, reciterList] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY_READING_MODE),
          Promise.resolve(loadAudioSettings()),
          fetchReciters().catch(() => [] as Reciter[]),
        ]);

        if (savedMode === 'mushaf' || savedMode === 'cards') {
          setReadingMode(savedMode);
        }
        if (audioSettings && audioSettings.reciter) {
          setSelectedReciter(audioSettings.reciter);
        }
        if (reciterList && reciterList.length > 0) {
          setReciters(reciterList);
        }
        setBookmarks(getBookmarks());
      } catch {
        // use defaults
      }
    })();
  }, []);

  // Android hardware back button handler to dismiss tools menu if open
  useEffect(() => {
    if (!toolsMenuOpen) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setToolsMenuOpen(false);
      return true;
    });
    return () => sub.remove();
  }, [toolsMenuOpen]);

  // Listen to audio status and synchronize with active ayah / surah playback
  useEffect(() => {
    const unsub = addPlaybackStatusListener((status) => {
      setIsPlayingAudio(status.isPlaying);
      const playback = getCurrentPlayback();
      if (playback && status.isPlaying && playback.surah === surahNumber) {
        if (playback.ayah) {
          setPlayingAyahNumber(playback.ayah);
        }
        setIsPlayingSurah(playback.type === 'surah' || playback.isSurahMode === true);
      } else if (!status.isPlaying && !status.isBuffering) {
        setPlayingAyahNumber(null);
        setIsPlayingSurah(false);
      }
    });
    return () => {
      unsub();
    };
  }, [surahNumber]);

  // Fetch Surah data (cache-first: instant display from cache, graceful background refresh if forced)
  const loadSurah = useCallback(async (force = false) => {
    const key = `surah:${safeSurahNumber}:${edition?.editionIdentifier || 'en.sahih'}`;
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
      const data = await fetchSurah(safeSurahNumber, true, edition?.editionIdentifier || 'en.sahih', force);
      if (data && Array.isArray(data.ayahs) && data.ayahs.length > 0) {
        setSurah(data);
      }

      // Save last read position
      const startAyah = initialAyah && initialAyah > 1 ? initialAyah : 1;
      saveLastReadPosition(safeSurahNumber, startAyah, data?.englishName);

      // Continue Reading position + Recently Read entry
      surahNumberRef.current = safeSurahNumber;
      lastSavedAyahRef.current = startAyah;
      trackingReadyRef.current = startAyah <= 1;
      saveReadingPosition(safeSurahNumber, startAyah);
      if (data) {
        recordSurahVisit(safeSurahNumber, data.englishName || `Surah ${safeSurahNumber}`, data.name || '');
      }

      // Auto-fetch on open: if this translation edition was NOT cached,
      // trigger background preload of the remaining surahs for this edition
      if (!isCached && edition?.editionIdentifier) {
        preloadRemainingSurahsForEdition(safeSurahNumber, edition.editionIdentifier);
      }
    } catch {
      if (!isCached) {
        // Fallback: if Arabic text is available offline, display it so the user never sees "no data"
        const arCached = loadQuranCache<SurahDetail>(`surah:${safeSurahNumber}:ar`);
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
      setSurah(null);
      setLoading(true);
    }
  }, [safeSurahNumber, edition?.editionIdentifier]);

  useEffect(() => {
    loadSurah();
  }, [loadSurah]);

  // Handle auto-scroll to initialAyah if provided
  useEffect(() => {
    if (surah && initialAyah && initialAyah > 1) {
      const targetIndex = initialAyah - 1;
      setTimeout(() => {
        try {
          listRef.current?.scrollToIndex({ index: targetIndex, animated: true });
        } catch {
          // ignore measurement miss
        }
        trackingReadyRef.current = true;
      }, 300);
    }
  }, [surah, initialAyah]);

  const handleScrollToIndexFailed = useCallback(
    (info: { index: number; highestMeasuredFrameIndex: number; averageItemLength: number }) => {
      listRef.current?.scrollToOffset({
        offset: Math.max(0, info.averageItemLength * info.index),
        animated: false,
      });
      setTimeout(() => {
        try {
          listRef.current?.scrollToIndex({ index: info.index, animated: true });
        } catch {
          // non-fatal measurement retry
        }
      }, 100);
    },
    []
  );

  const handleAdjustFontSize = (delta: number) => {
    setQuranFontSize(fontSize + delta);
  };

  const handleToggleTranslation = () => {
    setQuranShowTranslation(!showTranslation);
  };

  const handleToggleReadingMode = () => {
    setReadingMode((curr) => {
      const next = curr === 'cards' ? 'mushaf' : 'cards';
      AsyncStorage.setItem(STORAGE_KEY_READING_MODE, next).catch(() => {});
      return next;
    });
  };

  const handleToggleBookmark = (ayahItem: Ayah) => {
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
  };

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

  const handlePlayAyahToggle = async (ayahNumber: number) => {
    if (playingAyahNumber === ayahNumber && isPlayingAudio) {
      await stop();
      setPlayingAyahNumber(null);
      return;
    }
    try {
      const url = getAyahAudioUrl(selectedReciter, surahNumber, ayahNumber);
      setPlayingAyahNumber(ayahNumber);
      setIsPlayingSurah(false);
      await playAyah(selectedReciter, url, undefined, reciterLabel, surahNumber, ayahNumber);
      if (surah) {
        saveRecentlyPlayed({
          type: 'ayah',
          identifier: selectedReciter,
          reciterName: reciterLabel,
          surah: surahNumber,
          ayah: ayahNumber,
          title: `${surah.englishName} ${surahNumber}:${ayahNumber}`,
        });
      }
    } catch {
      setPlayingAyahNumber(null);
    }
  };

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
  const handleOpenTafsir = async (ayahNumber: number) => {
    if (activeTafsirAyah === ayahNumber) {
      setActiveTafsirAyah(null);
      return;
    }
    setActiveTafsirAyah(ayahNumber);
    setTafsirLoading(true);
    setTafsirText(null);
    setTafsirEdition(null);
    try {
      const currentTafsirSource = TAFSIR_SOURCES.find((s) => s.id === settings.tafsirSourceId) || TAFSIR_SOURCES[0];
      const res = await fetchAyahTafsir(surahNumber, ayahNumber, currentTafsirSource.identifier);
      // islamic.app serves the surah intro for every ayah (introOnly). Show
      // it only on ayah 1; other ayahs get an honest "not available" note
      // instead of the same intro repeated on every ayah.
      const isIntroRepeat = (res as { introOnly?: boolean }).introOnly === true && ayahNumber !== 1;
      if (isIntroRepeat) {
        setTafsirText('Tafsir for this ayah is not available — the introduction is shown on Ayah 1.');
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
  };

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
        'Remove Download',
        `Remove offline audio for Surah ${surah?.englishName ?? surahNumber} (${surahDownloadSize || '—'})?`,
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
  const handleShareAyah = async (item: Ayah) => {
    if (!item) return;
    const arabicText = getAyahTextForExport(item.numberInSurah, item.text || '');
    // Share as image: render a clean verse card, capture to PNG, share.
    if (Platform.OS === 'web') {
      // Web has no view-shot/PNG share — fall back to text share.
      const textToShare = `"${arabicText}"\n\n${item.translation || ''}\n\n— Quran ${safeSurahNumber}:${item.numberInSurah}`;
      Share.share({ message: textToShare }).catch(() => {});
      return;
    }
    try {
      setIsSharingImage(true);
      setShareAyahItem(item);
      // Wait a frame for the card to render off-screen.
      await new Promise((r) => setTimeout(r, 80));
      const uri = await captureRef(shareCardRef, { format: 'png', quality: 1 });
      setShareAyahItem(null);
      setIsSharingImage(false);
      let Sharing: any = null;
      try {
        Sharing = require('expo-sharing');
      } catch {}
      if (Sharing && (await Sharing.isAvailableAsync())) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share verse' });
      } else {
        Share.share({ url: uri }).catch(() => {});
      }
    } catch {
      setShareAyahItem(null);
      setIsSharingImage(false);
      // Fall back to text share on any capture failure.
      const textToShare = `"${arabicText}"\n\n${item.translation || ''}\n\n— Quran ${safeSurahNumber}:${item.numberInSurah}`;
      Share.share({ message: textToShare }).catch(() => {});
    }
  };

  // Copy
  const handleCopyAyah = (item: Ayah) => {
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
  };

  const handleNavigateSurah = useCallback(
    (targetSurah: number) => {
      if (targetSurah < 1 || targetSurah > 114) return;
      if (!onNavigateSurah) return;
      saveReadingPosition(surahNumberRef.current, lastSavedAyahRef.current);
      onNavigateSurah(targetSurah);
    },
    [onNavigateSurah]
  );

  const renderSurahHeader = () => {
    if (!surah) return null;
    const titleFontSize = isCompact ? 24 : 28;
    const translationFontSize = isCompact ? 12 : 13;
    const arabicSize = isCompact ? 34 : 40;
    const totalAyahs = surah.numberOfAyahs || (Array.isArray(surah.ayahs) ? surah.ayahs.length : (SURAH_AYAH_COUNTS[safeSurahNumber - 1] || 7));
    return (
      <View style={styles.surahHeader}>
        <View style={styles.surahEyebrowRow}>
          <Text style={[styles.surahEyebrow, { color: colors.accent }]}>
            SURAH {surah.number || safeSurahNumber}
          </Text>
          <Text style={[styles.surahAyahCount, { color: colors.textMuted }]}>
            {totalAyahs} AYAHS
          </Text>
        </View>

        <View style={styles.titleRow}>
          <View style={[styles.titleInfo, { minWidth: 0, flex: 1 }]}>
            <Text
              style={[styles.englishTitle, { color: colors.textPrimary, fontSize: titleFontSize }]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {surah.englishName || `Surah ${safeSurahNumber}`}
            </Text>
            {surah.englishNameTranslation ? (
              <Text
                style={[styles.englishTranslation, { color: colors.textSecondary, fontSize: translationFontSize }]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {surah.englishNameTranslation}
              </Text>
            ) : null}
          </View>
          {surah.name ? (
            <ArabicText size={arabicSize} fontFamily={arabicFamilies.regular} style={styles.arabicSurahName}>
              {surah.name}
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
            accessibilityLabel={isPlayingSurah ? 'Pause Surah Audio' : 'Play Surah Audio'}
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
              {isPlayingSurah ? 'Playing Surah' : 'Play Full Surah'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.reciterPill}
            onPress={() => setReciterChooserOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Choose reciter"
          >
            <Ionicons name="mic-outline" size={14} color={colors.textSecondary} />
            <Text style={[styles.reciterNameText, { color: colors.textSecondary }]} numberOfLines={1}>
              {reciterLabel}
            </Text>
            <Ionicons name="chevron-down" size={12} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Bismillah (except Surah 9 At-Tawbah and Surah 1 where it is Ayah 1) */}
        {surah.number !== 9 && surah.number !== 1 && (
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

  const renderAyahItem = ({ item }: { item: Ayah }) => {
    if (!item) return null;
    const isBookmarked = bookmarkedSet.has(item.numberInSurah);
    const isAyahPlaying = isPlayingAudio && playingAyahNumber === item.numberInSurah;
    const isTafsirOpen = activeTafsirAyah === item.numberInSurah;
    // Actions stay muted except on the active ayah (playing / tafsir open / just copied)
    const isActiveAyah = isAyahPlaying || isTafsirOpen || copiedAyah === item.numberInSurah;
    const actionColor = isActiveAyah ? colors.accent : colors.textMuted;

    const handleLongPress = () => {
      Alert.alert(
        `Ayah ${item.numberInSurah}`,
        undefined,
        [
          {
            text: play,
            onPress: () => {
              handlePlayAyahToggle(item.numberInSurah);
            },
          },
          {
            text: bookmark,
            onPress: () => {
              handleToggleBookmark(item);
            },
          },
          {
            text: 'Add Note',
            onPress: () => {
              openNoteComposer(item.numberInSurah);
            },
          },
          {
            text: copy,
            onPress: () => {
              const textToCopy = `"${item.text || ''}"\n\n${item.translation || ''}\n\n— Quran ${safeSurahNumber}:${item.numberInSurah}`;
              try {
                Clipboard.setString(textToCopy);
                haptic('selection');
                setCopiedAyah(item.numberInSurah);
                if (copyResetTimerRef.current) clearTimeout(copyResetTimerRef.current);
                copyResetTimerRef.current = setTimeout(() => setCopiedAyah(null), 1500);
              } catch {}
            },
          },
          {
            text: share,
            onPress: () => {
              const textToShare = `"${item.text || ''}"\n\n${item.translation || ''}\n\n— Quran ${safeSurahNumber}:${item.numberInSurah}`;
              Share.share({ message: textToShare }).catch(() => {});
            },
          },
        ],
        { cancelable: true }
      );
    };

    return (
      <Pressable
        style={[
          styles.ayahCard,
          {
            backgroundColor: isAyahPlaying ? colors.accentDim : 'transparent',
            borderColor: isAyahPlaying ? colors.accent : 'transparent',
          },
        ]}
        onLongPress={handleLongPress}
        delayLongPress={2000}
        accessibilityRole="button"
        accessibilityLabel={`Ayah ${item.numberInSurah}. Long press for options`}
        accessibilityHint="Long press to play, bookmark, add note, copy, or share"
      >
        {/* Action Header */}
        <View style={styles.ayahActionBar}>
          <View style={[styles.ayahBadge, { backgroundColor: colors.accentDim }]}>
            <Text style={[styles.ayahBadgeText, { color: colors.accent }]}>
              {item.numberInSurah}
            </Text>
          </View>

          <View style={styles.actionsGroup}>
            {/* Play Ayah */}
            <TouchableOpacity
              onPress={() => handlePlayAyahToggle(item.numberInSurah)}
              style={styles.actionBtn}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel={`Play Ayah ${item.numberInSurah}`}
            >
              <Ionicons
                name={isAyahPlaying ? 'pause-circle' : 'play-circle-outline'}
                size={isAyahPlaying ? 22 : iconSizes.inlineLg}
                color={isAyahPlaying ? colors.accent : actionColor}
              />
            </TouchableOpacity>

            {/* Tafsir */}
            <TouchableOpacity
              onPress={() => handleOpenTafsir(item.numberInSurah)}
              style={styles.actionBtn}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel={`Tafsir for Ayah ${item.numberInSurah}`}
            >
              <Ionicons
                name={isTafsirOpen ? 'book' : 'book-outline'}
                size={iconSizes.inlineLg}
                color={isTafsirOpen ? colors.accent : actionColor}
              />
            </TouchableOpacity>

            {/* Bookmark with heart icon and scale bounce micro-interaction */}
            <AyahBookmarkButton
              isBookmarked={isBookmarked}
              onPress={() => handleToggleBookmark(item)}
              accentColor={colors.accent}
              inactiveColor={actionColor}
              ayahNumber={item.numberInSurah}
            />

            {/* Share */}
            <TouchableOpacity
              onPress={() => handleShareAyah(item)}
              style={styles.actionBtn}
              hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel={`Share Ayah ${item.numberInSurah}`}
            >
              <Ionicons name="share-social-outline" size={iconSizes.inlineLg} color={actionColor} />
            </TouchableOpacity>

            {/* Copy */}
            <TouchableOpacity
              onPress={() => handleCopyAyah(item)}
              style={styles.actionBtn}
              hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel={`Copy Ayah ${item.numberInSurah}`}
            >
              <Ionicons
                name={copiedAyah === item.numberInSurah ? 'checkmark' : 'copy-outline'}
                size={iconSizes.inlineLg}
                color={copiedAyah === item.numberInSurah ? colors.accent : actionColor}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Arabic Text */}
        {currentScript === 'tajweed' && scriptAyahs ? (
          <TajweedText
            text={getAyahScriptText(item.numberInSurah, item.text)}
            size={fontSize}
            fontFamily={arabicFamilies.regular}
            lineHeight={ayahLineHeight}
            numberInSurah={item.numberInSurah}
          />
        ) : (
          <AyahText
            text={getDisplayedAyahText(
              safeSurahNumber,
              item.numberInSurah,
              getAyahScriptText(item.numberInSurah, item.text)
            )}
            numberInSurah={item.numberInSurah}
            size={fontSize}
            fontFamily={arabicFamilies.regular}
            lineHeight={ayahLineHeight}
          />
        )}

        {/* Translation */}
        {showTranslation && item.translation && (
          <View style={styles.translationWrap}>
            <Text style={[styles.translationTag, { color: colors.textMuted }]}>
              {flag} {edition?.name || ''}
            </Text>
            <Text style={[styles.translationText, { color: colors.textSecondary }]}>
              {item.translation}
            </Text>
          </View>
        )}

        {/* Inline Tafsir Panel if opened */}
        {isTafsirOpen && (
          <View
            style={[
              styles.inlineTafsirBox,
              { backgroundColor: colors.bgBase, borderColor: colors.borderSubtle },
            ]}
          >
            <View style={styles.tafsirHeader}>
              <Text style={[styles.tafsirTitle, { color: colors.accent }]}>
                {tafsirEdition || 'Tafsir'}
              </Text>
              <TouchableOpacity onPress={() => setActiveTafsirAyah(null)}>
                <Ionicons name="close" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            {tafsirLoading ? (
              <ActivityIndicator size="small" color={colors.accent} style={{ marginVertical: 8 }} />
            ) : (
              <Text style={[
                styles.inlineTafsirText,
                { color: colors.textPrimary, fontFamily: 'Manrope_400Regular' }
              ]}>
                {tafsirText || ''}
              </Text>
            )}
          </View>
        )}
      </Pressable>
    );
  };

  // Mushaf continuous text view
  const renderMushafMode = () => {
    if (!surah || !Array.isArray(surah.ayahs) || surah.ayahs.length === 0) return null;
    return (
      <ScrollView
        contentContainerStyle={styles.mushafScrollContent}
        onScroll={handleReaderScroll}
        scrollEventThrottle={16}
      >
        {renderSurahHeader()}

        <View
          style={[
            styles.mushafContainer,
            { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle },
          ]}
        >
          {currentScript === 'tajweed' && scriptAyahs ? (
            <View style={styles.mushafTajweedList}>
              {surah.ayahs.map((a) => (
                <View key={`mushaf-tajweed-${a.numberInSurah}`} style={styles.mushafTajweedAyahRow}>
                  <TajweedText
                    text={getAyahScriptText(a.numberInSurah, a.text)}
                    size={fontSize + 2}
                    fontFamily={arabicFamilies.regular}
                    lineHeight={Math.round((fontSize + 2) * (settings?.quranLineHeight || 1.6))}
                    numberInSurah={a.numberInSurah}
                  />
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.mushafParagraph}>
              {surah.ayahs.map((a) => (
                <Text key={`mushaf-${a.numberInSurah}`}>
                  <Text
                    style={{
                      fontFamily: arabicFamilies.regular,
                      fontSize: fontSize + 2,
                      color: colors.textPrimary,
                      lineHeight: Math.round((fontSize + 2) * (settings?.quranLineHeight || 1.6)),
                      writingDirection: 'rtl',
                    }}
                  >
                    {getDisplayedAyahText(
                      surah.number,
                      a.numberInSurah,
                      getAyahScriptText(a.numberInSurah, a.text)
                    )}{' '}
                  </Text>
                  <Text
                    style={{
                      fontFamily: arabicFamilies.regular,
                      fontSize: fontSize - 2,
                      color: colors.accent,
                    }}
                  >
                    ۝{toArabicNumerals(a.numberInSurah)}{' '}
                  </Text>
                </Text>
              ))}
            </Text>
          )}
        </View>

        {showTranslation && (
          <View style={styles.mushafTranslationsWrap}>
            <Text style={[styles.mushafTranslationsHeading, { color: colors.accent }]}>
              TRANSLATION ({flag} {(edition?.name || '').toUpperCase()})
            </Text>
            {surah.ayahs.map((a) => (
              <View key={`tr-${a.numberInSurah}`} style={styles.mushafTranslationRow}>
                <Text style={[styles.mushafAyahBadge, { color: colors.accent }]}>
                  {a.numberInSurah}
                </Text>
                <Text style={[styles.mushafTranslationText, { color: colors.textSecondary }]}>
                  {a.translation || ''}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    );
  };

  if (loading && !surah) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bgBase }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (error && !surah) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bgBase }]}>
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>{error}</Text>
        <TouchableOpacity
          style={[styles.retryBtn, { borderColor: colors.accent }]}
          onPress={() => loadSurah()}
          accessibilityRole="button"
          accessibilityLabel="Retry loading surah"
        >
          <Text style={[styles.retryBtnText, { color: colors.accent }]}>{retry}</Text>
        </TouchableOpacity>
      </View>
    );
  }

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
          accessibilityLabel="Back to Quran"
        >
          <Ionicons name="arrow-back" size={backIconSize} color={colors.accent} />
          <Text style={[styles.backText, { color: colors.accent, fontSize: backTextSize }]}>Quran</Text>
        </TouchableOpacity>

        {/* Center: Surah name as centerpiece with prev/next inline */}
        <View style={styles.navCenter}>
          <View style={styles.surahNavInline}>
            <TouchableOpacity
              style={[
                styles.surahNavBtn,
                { opacity: surahNumber <= 1 ? 0.4 : 1 },
                { minWidth: surahNavBtnSize, minHeight: surahNavBtnSize, padding: 4 },
              ]}
              onPress={() => handleNavigateSurah(surahNumber - 1)}
              disabled={surahNumber <= 1}
              accessibilityRole="button"
              accessibilityLabel="Previous Surah"
            >
              <Ionicons name="chevron-back" size={surahNavIconSize} color={colors.accent} />
            </TouchableOpacity>
            {surah && (
              <Text
                style={[
                  styles.navSurahTitle,
                  { color: colors.textPrimary, fontSize: titleFontSizeNav },
                ]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {surah.englishName}
              </Text>
            )}
            <TouchableOpacity
              style={[
                styles.surahNavBtn,
                { opacity: surahNumber >= 114 ? 0.4 : 1 },
                { minWidth: surahNavBtnSize, minHeight: surahNavBtnSize, padding: 4 },
              ]}
              onPress={() => handleNavigateSurah(surahNumber + 1)}
              disabled={surahNumber >= 114}
              accessibilityRole="button"
              accessibilityLabel="Next Surah"
            >
              <Ionicons name="chevron-forward" size={surahNavIconSize} color={colors.accent} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Dots menu button - fixed right */}
        <TouchableOpacity
          style={[
            styles.dotsButton,
            {
              backgroundColor: toolsMenuOpen ? colors.accentDim : colors.bgSurface,
              borderColor: toolsMenuOpen ? colors.accent : colors.borderSubtle,
            },
          ]}
          onPress={() => setToolsMenuOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Reading tools"
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
              accessibilityLabel="Dismiss reading tools"
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
                  {surah?.englishName || `Surah ${safeSurahNumber}`}
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
                accessibilityLabel="Close reading tools"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="remove" size={20} color={colors.textSecondary} />
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
                  DISPLAY
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
                            readingMode === 'mushaf' ? colors.accentDim : colors.bgBase,
                        },
                      ]}
                    >
                      <Ionicons
                        name={readingMode === 'mushaf' ? 'book' : 'list'}
                        size={20}
                        color={readingMode === 'mushaf' ? colors.accent : colors.textSecondary}
                      />
                    </View>
                    <View style={styles.toolsMenuTextGroup}>
                      <Text style={[styles.toolsMenuItemTitle, { color: colors.textPrimary }]}>
                        Reading Mode
                      </Text>
                      <Text style={[styles.toolsMenuItemSubtitle, { color: colors.textMuted }]}>
                        {readingMode === 'mushaf'
                          ? 'Mushaf (continuous)'
                          : 'Cards (per ayah)'}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.toolsMenuIndicator,
                        {
                          backgroundColor:
                            readingMode === 'mushaf' ? colors.accent : 'transparent',
                          borderColor:
                            readingMode === 'mushaf' ? colors.accent : colors.borderSubtle,
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
                          Font Size
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
                        accessibilityLabel="Decrease font size"
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
                        accessibilityLabel="Increase font size"
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
                        Script
                      </Text>
                      <Text
                        style={[styles.toolsMenuItemSubtitle, { color: colors.textSecondary }]}
                        numberOfLines={1}
                      >
                        {selectedScriptOption.label} — {selectedScriptOption.description}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
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
                        Keep Screen Awake
                      </Text>
                      <Text style={[styles.toolsMenuItemSubtitle, { color: colors.textMuted }]}>
                        {keepAwake ? 'Screen stays on while reading' : 'Screen may dim'}
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
                  LANGUAGE & TAFSIR
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
                        Translation Language
                      </Text>
                      <Text
                        style={[styles.toolsMenuItemSubtitle, { color: colors.textSecondary }]}
                        numberOfLines={1}
                      >
                        {flag} {language.toUpperCase()} — {edition.name}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
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
                        Translation
                      </Text>
                      <Text style={[styles.toolsMenuItemSubtitle, { color: colors.textMuted }]}>
                        {showTranslation ? 'Shown' : 'Hidden'}
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
                        Tafsir Source
                      </Text>
                      <Text
                        style={[styles.toolsMenuItemSubtitle, { color: colors.textSecondary }]}
                        numberOfLines={1}
                      >
                        {currentTafsirSource.name} ({currentTafsirSource.language})
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* NAVIGATE */}
              <View style={styles.toolsMenuGroup}>
                <Text style={[styles.toolsMenuSectionLabel, { color: colors.textMuted }]}>
                  NAVIGATE
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
                    accessibilityLabel="Jump to Juz"
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
                        Jump to Juz
                      </Text>
                      <Text style={[styles.toolsMenuItemSubtitle, { color: colors.textSecondary }]}>
                        {selectedJuz ? `Juz ${selectedJuz} selected` : 'Select a Juz to jump'}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
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
                    accessibilityLabel="Jump to Hizb"
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
                        Jump to Hizb
                      </Text>
                      <Text style={[styles.toolsMenuItemSubtitle, { color: colors.textMuted }]}>
                        {selectedHizb ? `Hizb ${selectedHizb} selected` : 'Select a Hizb to jump'}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* OFFLINE */}
              <View style={styles.toolsMenuGroup}>
                <Text style={[styles.toolsMenuSectionLabel, { color: colors.textMuted }]}>
                  OFFLINE
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
                        {surahDownloaded ? 'Available Offline' : 'Save for Offline'}
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
                      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
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
      ) : (
        <FlatList
          ref={listRef}
          data={surah?.ayahs || []}
          keyExtractor={(item) => String(item.numberInSurah)}
          renderItem={renderAyahItem}
          ListHeaderComponent={renderSurahHeader}
          contentContainerStyle={styles.listContent}
          initialNumToRender={15}
          maxToRenderPerBatch={15}
          windowSize={7}
          onScrollToIndexFailed={handleScrollToIndexFailed}
          onScroll={handleReaderScroll}
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
                <Text style={[styles.modalEyebrow, { color: colors.accent }]}>AUDIO RECITER</Text>
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                  Select Reciter
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setReciterChooserOpen(false)}
                style={styles.closeBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Close reciter selection"
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
                placeholder="Search reciter name..."
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
                accessibilityLabel="Close"
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
                Jump to Juz
              </Text>
              <TouchableOpacity
                onPress={() => setJuzPickerOpen(false)}
                style={styles.closeBtn}
                accessibilityRole="button"
                accessibilityLabel="Close"
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
                          setTimeout(() => {
                            listRef.current?.scrollToIndex({ index: juzStart.ayah - 1, animated: true });
                          }, 100);
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
                Jump to Hizb
              </Text>
              <TouchableOpacity
                onPress={() => setHizbPickerOpen(false)}
                style={styles.closeBtn}
                accessibilityRole="button"
                accessibilityLabel="Close"
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
                          onNavigateSurah?.(hizbStart.surah);
                        } else {
                          setTimeout(() => {
                            listRef.current?.scrollToIndex({ index: hizbStart.ayah - 1, animated: true });
                          }, 100);
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
                Select Quran Script
              </Text>
              <TouchableOpacity
                onPress={() => setScriptPickerOpen(false)}
                style={styles.closeBtn}
                accessibilityRole="button"
                accessibilityLabel="Close"
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
                              DEFAULT
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

      {/* Note Composer Modal for Ayah Reflections */}
      <Modal
        visible={noteComposerAyah !== null}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setNoteComposerAyah(null)}
      >
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={() => setNoteComposerAyah(null)}>
            <View style={styles.modalBackdrop} />
          </TouchableWithoutFeedback>
          <View
            style={[
              styles.noteModalPanel,
              { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle },
            ]}
          >
            <View style={styles.noteModalHeader}>
              <View>
                <Text style={[styles.noteModalEyebrow, { color: colors.accent }]}>REFLECTIONS</Text>
                <Text style={[styles.noteModalTitle, { color: colors.textPrimary }]}>
                  {surah?.englishName || `Surah ${safeSurahNumber}`} · Ayah {noteComposerAyah}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setNoteComposerAyah(null)}
                style={styles.closeBtn}
                accessibilityRole="button"
                accessibilityLabel="Close note composer"
              >
                <Ionicons name="close" size={22} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <TextInput
              placeholder="Write your reflection, thoughts, or lessons from this verse..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={4}
              value={noteComposerText}
              onChangeText={setNoteComposerText}
              autoFocus
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
                onPress={() => setNoteComposerAyah(null)}
                style={[
                  styles.noteModalBtnCancel,
                  { borderColor: colors.borderSubtle, backgroundColor: colors.bgBase },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Cancel note"
              >
                <Text style={[styles.noteModalBtnCancelText, { color: colors.textSecondary }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveNote}
                style={[styles.noteModalBtnSave, { backgroundColor: colors.accent }]}
                accessibilityRole="button"
                accessibilityLabel="Save note"
              >
                <Text style={[styles.noteModalBtnSaveText, { color: colors.onAccent }]}>
                  Save Note
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
              Quran {surahNumber}:{shareAyahItem.numberInSurah}
            </Text>

            {/* App Brand Footer: Logo + ISLAMIC wordmark */}
            <View style={styles.shareCardBrandFooter}>
              <Image
                source={
                  mode === 'paper'
                    ? require('../../assets/logo-small-black.png')
                    : require('../../assets/logo-small-ivory.png')
                }
                style={styles.shareCardLogo}
                resizeMode="contain"
              />
              <Text
                style={[
                  styles.shareCardBrandWordmark,
                  { color: mode === 'paper' ? '#0F172A' : '#F1F5F9' },
                ]}
              >
                ISLAMIC
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
  shareCardLogo: {
    width: 22,
    height: 22,
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
  noteModalPanel: {
    width: '90%',
    maxWidth: 440,
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 20,
    elevation: 12,
  },
  noteModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  noteModalEyebrow: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
    letterSpacing: 1,
    marginBottom: 2,
  },
  noteModalTitle: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 20,
    lineHeight: 24,
  },
  noteModalInput: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 14,
    lineHeight: 20,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    minHeight: 110,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  noteModalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  noteModalBtnCancel: {
    paddingVertical: 10,
    paddingHorizontal: 16,
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
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noteModalBtnSaveText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 13,
  },
});
