import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Modal,
  Animated,
  Easing,
  Platform,
  I18nManager,
  useWindowDimensions,
  Linking,
  AppState,
  BackHandler,
  AccessibilityInfo,
  useColorScheme,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ThemeProvider, useTheme, getPillShadow } from './src/lib/theme';
import {
  SettingsProvider,
  useSettings,
  getQuranPreloadRequested,
  loadQuranPreloadRequested,
} from './src/lib/settings';
import { useEditorialFonts } from './src/lib/fonts';
import { AnimatedSplash } from './src/components/AnimatedSplash';
import { useConnectivity } from './src/lib/useConnectivity';
import { OfflineBanner } from './src/components/OfflineBanner';
import { parseDeepLink } from './src/lib/deeplinks';
import { handleDeepLink, NavigationSetters } from './src/lib/deeplinkRouter';
import {
  HEADER_HORIZONTAL_PADDING,
  HEADER_MAX_WIDTH,
  HEADER_HEIGHT,
  HEADER_PADDING_VERTICAL,
  HEADER_SEPARATOR,
} from './src/lib/headerTokens';
import { t, setAppLanguage, applyRTL, resolvePersistedLanguage, getBootLanguage, isRTL, isRtlLanguage } from './src/lib/i18n';
import { getReadingMarkerSync, getReadingPositionSync } from './src/lib/continuing';
import { HOME_THEME_TOKENS, getHomeTokens } from './src/lib/constants';
import { getMushafPageForAyah } from './src/lib/quran';
import { AnimatedBrandBadge } from './src/components/AnimatedBrandIcons';

import HomeScreen from './src/screens/HomeScreen';
import QiblaScreen from './src/screens/QiblaScreen';
import QuranHomeScreen from './src/screens/QuranHomeScreen';
import QuranReaderScreen from './src/screens/QuranReaderScreen';
import QuranAudioScreen from './src/screens/QuranAudioScreen';
import TafsirScreen from './src/screens/TafsirScreen';
import QuranTopicsScreen from './src/screens/QuranTopicsScreen';
import TranslationCompareScreen from './src/screens/TranslationCompareScreen';
import QuranScreen from './src/screens/QuranScreen';
import BookmarksScreen from './src/screens/BookmarksScreen';
import NotesScreen from './src/screens/NotesScreen';
import CalendarScreen from './src/screens/CalendarScreen';
import LibraryScreen, { LibraryItemKey } from './src/screens/LibraryScreen';
import { VocabTrainerScreen } from './src/screens/VocabTrainerScreen';
import { WeeklySummaryScreen } from './src/screens/WeeklySummaryScreen';
import { TajweedScreen } from './src/screens/TajweedScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import TasbihScreen from './src/screens/TasbihScreen';
import NamesScreen from './src/screens/NamesScreen';
import DuasScreen from './src/screens/DuasScreen';
import ReadingPlansScreen from './src/screens/ReadingPlansScreen';
import HifzScreen from './src/screens/HifzScreen';
import { HifzPracticeScreen } from './src/screens/HifzPracticeScreen';
import HadithLibraryScreen from './src/screens/HadithLibraryScreen';
import FastingScreen from './src/screens/FastingScreen';
import ZakatScreen from './src/screens/ZakatScreen';
import ToolsScreen, { ToolsItemKey } from './src/screens/ToolsScreen';
import SalahTrackerScreen from './src/screens/SalahTrackerScreen';
import LocationScreen from './src/screens/LocationScreen';
import CitiesScreen from './src/screens/CitiesScreen';
import PrayerRemindersScreen from './src/screens/PrayerRemindersScreen';
import MosqueFinderScreen from './src/screens/MosqueFinderScreen';
import WomenCycleScreen from './src/screens/WomenCycleScreen';
import { WomenLockGate } from './src/components/WomenLockGate';
import WomenPurityScreen from './src/screens/WomenPurityScreen';
import WomenGuidanceScreen from './src/screens/WomenGuidanceScreen';
import WomenQadaScreen from './src/screens/WomenQadaScreen';
import { WomenPinModal } from './src/components/WomenPinModal';
import UmrahGuideScreen from './src/screens/UmrahGuideScreen';
import UmrahResourcesScreen from './src/screens/UmrahResourcesScreen';
import HajjJourneyScreen from './src/screens/HajjJourneyScreen';
import MakkahLiveScreen from './src/screens/MakkahLiveScreen';
import MadinahLiveScreen from './src/screens/MadinahLiveScreen';
import HajjLiveScreen from './src/screens/HajjLiveScreen';
import RamadanGuideScreen from './src/screens/RamadanGuideScreen';
import PrayerGuideScreen from './src/screens/PrayerGuideScreen';
import ShahadaScreen from './src/screens/ShahadaScreen';
import DownloadsScreen from './src/screens/DownloadsScreen';
import { AudioMiniPlayer } from './src/components/AudioMiniPlayer';
import { LiveMiniPlayer } from './src/components/LiveMiniPlayer';
import { ActiveLiveStream, setActiveLiveStream, subscribeLiveStream } from './src/lib/liveStream';
import { AudioPlayerModal } from './src/components/AudioPlayerModal';
import { useAudioMiniPlayer } from './src/lib/useAudioMiniPlayer';
import { startNowPlayingNotification, updateNowPlayingNotification, stopNowPlayingNotification, cleanupNowPlayingNotification } from './src/lib/nowPlayingNotification';
import { addPlaybackStatusListener, getPlaybackStatus, getCurrentPlayback, unload } from './src/lib/quranAudio';
import { stopAudioPreloading } from './src/lib/audioPreloader';
import { rescheduleIfNeeded, setupNotificationResponseHandler } from './src/lib/notifications';
import { startQuranPreload } from './src/lib/quranPreloader';
import { runFirstLaunchWarmup } from './src/lib/warmup';
import {
  runFirstLaunchPermissions,
  hasDismissedLocationSetup,
  hasDismissedLocationSetupSync,
  markLocationSetupDismissed,
} from './src/lib/firstLaunchPermissions';
import { LocationSetupModal } from './src/components/LocationSetupModal';
import { useLocation, refreshLocationSilently, computeDistanceKm } from './src/lib/useLocation';
import { registerBackgroundPreload } from './src/lib/backgroundPreload';
import OnboardingScreen from './src/screens/OnboardingScreen';
import { getOnboardingDone } from './src/lib/onboardingState';
import { LinearGradient } from 'expo-linear-gradient';
import { AppHeader } from './src/components/layout/AppHeader';
import { FloatingNav } from './src/components/layout/FloatingNav';
import { TabScreen } from './src/components/layout/TabScreen';
import { useLayoutAudit } from './src/components/layout/LayoutAudit';
import { routeToTab } from './src/navigation/routeToTab';
import { NAV_BOTTOM, NAV_HEIGHT } from './src/components/layout/layout.constants';

// Wordmark RTL label contract: {isRTL() ? 'اسلامک' : 'ISLAMIC'}

export type TabKey = 'home' | 'quran' | 'library' | 'tools';

export type LibraryView =
  | { screen: 'hub' }
  | { screen: 'tasbih' }
  | { screen: 'names' }
  | { screen: 'names-prophet' }
  | { screen: 'duas' }
  | { screen: 'hadith' }
  | { screen: 'ramadan-guide' }
  | { screen: 'prayer-guide' }
  | { screen: 'shahada' }
  | { screen: 'downloads' }
  | { screen: 'vocab' }
  | { screen: 'summary' }
  | { screen: 'tajweed' }
  | { screen: 'umrah-guide' }
  | { screen: 'hajj-journey' }
  | { screen: 'women-purity' }
  | { screen: 'women-guidance' };

export type QuranView =
  | { screen: 'home' }
  | { screen: 'reader'; surah: number; initialAyah?: number; initialPage?: number; pageOnly?: boolean }
  | { screen: 'audio' }
  | { screen: 'tafsir'; surah?: number }
  | { screen: 'topics' }
  | { screen: 'compare'; surah?: number; ayah?: number; returnTo?: 'home' | 'reader' }
  | { screen: 'bookmarks' }
  | { screen: 'notes' }
  | { screen: 'plans' }
  | { screen: 'hifz' }
  | { screen: 'hifz-practice'; surah?: number }
  | { screen: 'surah-list' };

export type ToolsView =
  | { screen: 'hub' }
  | { screen: 'tasbih' }
  | { screen: 'summary' }
  | { screen: 'qibla' }
  | { screen: 'tracker' }
  | { screen: 'location' }
  | { screen: 'cities' }
  | { screen: 'notifications' }
  | { screen: 'prayer-reminders' }
  | { screen: 'fasting' }
  | { screen: 'zakat' }
  | { screen: 'calendar' }
  | { screen: 'mosque' }
  | { screen: 'women-cycle' }
  | { screen: 'women-purity' }
  | { screen: 'women-guidance' }
  | { screen: 'women-qada' }
  | { screen: 'umrah-guide' }
  | { screen: 'umrah-resources' }
  | { screen: 'hajj-journey' }
  | { screen: 'makkah-live' }
  | { screen: 'madinah-live' }
  | { screen: 'hajj-live' };

export function isTopLevelScreen(
  tab: TabKey,
  quran: QuranView,
  library: LibraryView,
  tools: ToolsView
): boolean {
  return (
    tab === 'home' ||
    (tab === 'quran' && quran.screen === 'home') ||
    (tab === 'library' && library.screen === 'hub') ||
    (tab === 'tools' && tools.screen === 'hub')
  );
}

function Root({ splashDone }: { splashDone: boolean }) {
  const { colors, mode } = useTheme();
  const homeTokens = HOME_THEME_TOKENS[mode];
  const insets = useSafeAreaInsets();
  const { isOnline } = useConnectivity();
  const { settings, setAutoLocation, setLocationMode, setWomenPinHash } = useSettings();
  const { request: requestLocation, status: locStatus } = useLocation();
  const [tab, setTab] = useState<TabKey>('home');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsBackRef = useRef<(() => boolean) | null>(null);
  const [audioModalOpen, setAudioModalOpen] = useState(false);
  const [showLocationSetup, setShowLocationSetup] = useState(false);
  const [locationSetupLoading, setLocationSetupLoading] = useState(false);
  const [citiesReturnTab, setCitiesReturnTab] = useState<TabKey>('tools');
  const [library, setLibrary] = useState<LibraryView>({ screen: 'hub' });
  const [quran, setQuran] = useState<QuranView>({ screen: 'home' });
  const [tools, setTools] = useState<ToolsView>({ screen: 'hub' });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__NAVIGATE__ = {
        setTab,
        setQuran,
        setLibrary,
        setTools,
        setSettingsOpen,
        setCitiesReturnTab,
        closeLiveStream: () => setActiveLiveStream(null),
        openLocationSetup: () => setShowLocationSetup(true),
      };
    }
  }, []);

  // Session unlock & PIN protection for Women's Worship
  const [womenUnlocked, setWomenUnlocked] = useState(false);
  const [pendingWomenScreen, setPendingWomenScreen] = useState<ToolsView | null>(null);
  const [pendingWomenTab, setPendingWomenTab] = useState<'tools' | 'library'>('tools');
  const [womenPinModalOpen, setWomenPinModalOpen] = useState(false);

  // Background re-lock: when app moves to background/inactive, re-lock sensitive session
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState.match(/inactive|background/)) {
        if (settings.womenLockEnabled || (settings.womenWorshipEnabled && settings.womenPinHash)) {
          setWomenUnlocked(false);
          setTools((prev) => {
            if (prev.screen.startsWith('women-')) {
              return { screen: 'hub' };
            }
            return prev;
          });
          setLibrary((prev) => {
            if (prev.screen.startsWith('women-')) {
              return { screen: 'hub' };
            }
            return prev;
          });
        }
      }
    });
    return () => sub.remove();
  }, [settings.womenLockEnabled, settings.womenWorshipEnabled, settings.womenPinHash]);

  const handleOpenWomenFromSettings = useCallback(
    (key: 'women-cycle' | 'women-purity' | 'women-guidance' | 'women-qada') => {
      setSettingsOpen(false);
      setTab('tools');
      const isLocked =
        Boolean(settings.womenLockEnabled || settings.womenWorshipEnabled) &&
        Boolean(settings.womenPinHash) &&
        !womenUnlocked;
      if (isLocked) {
        setPendingWomenTab('tools');
        setPendingWomenScreen({ screen: key });
        setWomenPinModalOpen(true);
        return;
      }
      setTools({ screen: key });
    },
    [settings.womenLockEnabled, settings.womenWorshipEnabled, settings.womenPinHash, womenUnlocked]
  );

  const handlePrepareReload = useCallback(() => {
    if (quran.screen === 'reader') {
      setQuran({ screen: 'home' });
    }
  }, [quran.screen]);

  // Global Audio Mini Player state
  const { playback, status, visible, onPlayPause, onStop, onSeek } = useAudioMiniPlayer();

  // Global Live Video Mini Player state
  const [activeLiveStream, setActiveLiveStreamState] = useState<ActiveLiveStream | null>(null);
  useEffect(() => {
    return subscribeLiveStream(setActiveLiveStreamState);
  }, []);

  // First-launch notifications onboarding (runs once after splash: only when reminders enabled)
  // Location permission is decoupled from this and never uses a vague "OK" blocking alert
  useEffect(() => {
    if (!splashDone) return;
    let isMounted = true;
    const timer = setTimeout(async () => {
      if (!isMounted) return;
      try {
        await runFirstLaunchPermissions({
          skipLocation: true,
          remindersEnabled: Boolean(settings.remindersEnabled || settings.quranReminderEnabled),
        });
      } catch {
        // Non-fatal: permission errors must not block the app
      }
    }, 1200);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [splashDone, settings.remindersEnabled, settings.quranReminderEnabled]);

  // First-time location setup check:
  // Shows concise Setup UI (Use current location / Choose a city / Not now)
  // ONLY if the user genuinely has no usable location:
  // - settings.locationMode !== 'manual' (no saved manual location choice)
  // - settings.autoLocation === null (no valid saved auto location)
  // - !hasDismissedLocationSetup() (setup not previously dismissed/completed)
  // - locStatus !== 'denied' (permission not previously denied)
  const hasPromptedLocationSetupRef = useRef(false);

  useEffect(() => {
    if (!splashDone) return;
    if (hasPromptedLocationSetupRef.current || hasDismissedLocationSetupSync()) return;
    let isMounted = true;

    async function checkLocationSetup() {
      if (hasPromptedLocationSetupRef.current || hasDismissedLocationSetupSync()) return;

      // 1. Valid saved MANUAL location exists -> Home opens clean, NO modal, NO GPS request
      if (settings.locationMode === 'manual') return;

      // 2. Valid saved AUTO location exists -> Use immediately, NO modal, NO re-request
      if (
        settings.autoLocation &&
        typeof settings.autoLocation.latitude === 'number' &&
        typeof settings.autoLocation.longitude === 'number' &&
        !isNaN(settings.autoLocation.latitude) &&
        !isNaN(settings.autoLocation.longitude)
      ) {
        return;
      }

      // 3. User previously dismissed or completed location setup -> do not re-prompt
      const dismissed = await hasDismissedLocationSetup();
      if (dismissed) return;

      // 4. Permission was previously denied -> do not re-prompt explanation modal
      if (locStatus === 'denied') return;

      // 5. First-time user with NO usable location -> show concise location SETUP UI
      if (isMounted && !hasPromptedLocationSetupRef.current) {
        hasPromptedLocationSetupRef.current = true;
        setShowLocationSetup(true);
      }
    }

    const timer = setTimeout(checkLocationSetup, 1600);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [splashDone, settings.locationMode, settings.autoLocation, locStatus]);

  const handleUseCurrentLocation = async () => {
    setLocationSetupLoading(true);
    try {
      const loc = await requestLocation(true);
      if (loc) {
        setAutoLocation(loc, Date.now());
        // CRITICAL: switch to AUTO mode so Home's effectiveLocation uses the
        // GPS location — otherwise prayer times stay on the manual fallback.
        setLocationMode('auto');
      }
    } catch {
      // Non-fatal
    } finally {
      setLocationSetupLoading(false);
      setShowLocationSetup(false);
      await markLocationSetupDismissed();
    }
  };

  const handleChooseCityFromSetup = async () => {
    setShowLocationSetup(false);
    await markLocationSetupDismissed();
    setCitiesReturnTab('home');
    setTools({ screen: 'cities' });
    setTab('tools');
  };

  const handleDismissLocationSetup = async () => {
    setShowLocationSetup(false);
    await markLocationSetupDismissed();
  };

  // Location freshness & background refresh for AUTO mode
  // Uses saved location immediately without prompt; refreshes silently in background if stale (>24h)
  useEffect(() => {
    if (!splashDone) return;
    if (settings.locationMode !== 'auto') return;

    let isMounted = true;
    const STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 hours

    async function checkLocationFreshness() {
      const hasAuto = Boolean(settings.autoLocation);
      const isFresh =
        hasAuto &&
        settings.autoLocationTimestamp &&
        Date.now() - settings.autoLocationTimestamp < STALE_THRESHOLD_MS;

      // Fresh (<24h) saved location exists: do not request GPS, use saved location immediately
      if (isFresh) {
        return;
      }

      // Stale or missing autoLocation: silently refresh in background without blocking UI or prompting
      try {
        const fresh = await refreshLocationSilently();
        if (isMounted && fresh) {
          const oldLoc = settings.autoLocation;
          const moved = oldLoc
            ? computeDistanceKm(oldLoc.latitude, oldLoc.longitude, fresh.latitude, fresh.longitude) > 10
            : true;

          if (moved || !oldLoc) {
            setAutoLocation(fresh, Date.now());
          } else {
            setAutoLocation({ ...oldLoc, latitude: fresh.latitude, longitude: fresh.longitude }, Date.now());
          }
        }
      } catch {
        // Background refresh failure must never block or throw
      }
    }

    const timer = setTimeout(checkLocationFreshness, 2000);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [splashDone, settings.locationMode, settings.autoLocation, settings.autoLocationTimestamp, setAutoLocation]);

  // Notification health: reschedule on app start if fingerprint changed
  useEffect(() => {
    let isMounted = true;
    async function checkAndReschedule() {
      if (!isMounted) return;
      const activeLoc = settings.locationMode === 'auto'
        ? (settings.autoLocation || settings.manualLocation)
        : settings.manualLocation;
      await rescheduleIfNeeded(
        activeLoc,
        settings.methodId,
        settings.remindersEnabled,
        settings.reminderOffsetMinutes,
        settings.quranReminderEnabled,
        settings.madhab,
        settings.prayerConfigs,
        settings.quranReminderTime,
        settings.quranGoal
      );
    }
    checkAndReschedule();
    return () => { isMounted = false; };
  }, [
    settings.locationMode,
    settings.autoLocation,
    settings.manualLocation,
    settings.methodId,
    settings.remindersEnabled,
    settings.reminderOffsetMinutes,
    settings.quranReminderEnabled,
    settings.madhab,
    settings.prayerConfigs,
    settings.quranReminderTime,
    settings.quranGoal,
  ]);

  // Setup notification action handler (Mark Complete)
  useEffect(() => {
    setupNotificationResponseHandler();
  }, []);

  // Background Quran Preloader: start with low priority after app startup.
  // Honours the user's "Preload Quran text" setting (Settings → Downloads).
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      const requested = await loadQuranPreloadRequested();
      if (!cancelled && requested) {
        startQuranPreload();
      }
    }, 2500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  // First-launch cache warm-up (runs once, low priority)
  useEffect(() => {
    let isMounted = true;
    const timer = setTimeout(async () => {
      if (!isMounted) return;
      try {
        await runFirstLaunchWarmup({
          location: settings.manualLocation,
          methodId: settings.methodId,
        });
      } catch {
        // Non-fatal: warmup failures should not block app
      }
    }, 3000);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [settings.manualLocation, settings.methodId]);

  // Resume or ensure preloader is active when navigating to Quran tab
  useEffect(() => {
    if (tab === 'quran' && getQuranPreloadRequested()) {
      startQuranPreload();
    }
  }, [tab]);

  // Now Playing Notification integration
  useEffect(() => {
    let isMounted = true;

    const handleStatusChange = async (newStatus: { isPlaying: boolean; didJustFinish?: boolean }) => {
      if (!isMounted) return;

      const currentPlayback = getCurrentPlayback();
      const fullStatus = getPlaybackStatus();

      if (currentPlayback && (newStatus.isPlaying || fullStatus.isBuffering)) {
        await updateNowPlayingNotification();
      } else if (!currentPlayback || (!newStatus.isPlaying && !fullStatus.isBuffering)) {
        if (!newStatus.isPlaying && fullStatus.isLoaded && currentPlayback?.isPlaying) {
          // Track is paused, keep notification updated in place with paused state
          await updateNowPlayingNotification();
        } else if (!currentPlayback || !currentPlayback.isPlaying || fullStatus.didJustFinish) {
          // Playback fully stopped or finished queue
          await stopNowPlayingNotification();
        }
      }
    };

    const unsub = addPlaybackStatusListener(handleStatusChange);

    // Initial check
    const initialPlayback = getCurrentPlayback();
    const initialStatus = getPlaybackStatus();
    if (initialPlayback && (initialStatus.isPlaying || initialStatus.isBuffering)) {
      startNowPlayingNotification();
    }

    return () => {
      isMounted = false;
      unsub();
      stopNowPlayingNotification();
      cleanupNowPlayingNotification();
    };
  }, []);

  // Canonical Deep Link Resolver integration:
  // Keeps a ref of navigation setters so handlers are stable and don't re-subscribe
  const navSettersRef = useRef<NavigationSetters>({
    setTab,
    setQuran,
    setLibrary,
    setTools,
    setSettingsOpen,
  });
  // eslint-disable-next-line react-hooks/refs
  navSettersRef.current = {
    setTab,
    setQuran,
    setLibrary,
    setTools,
    setSettingsOpen,
    setPendingWomenScreen,
    openWomenPinModal: () => setWomenPinModalOpen(true),
    isWomenLocked: () => {
      const pinRequired = Boolean(settings.womenPinHash);
      const lockedBySetting = Boolean(settings.womenLockEnabled || settings.womenWorshipEnabled);
      return lockedBySetting && pinRequired && !womenUnlocked;
    },
  };

  const pendingDeepLinkRef = useRef<string | null>(null);

  const routeDeepLinkUrl = useCallback((url: string) => {
    const target = parseDeepLink(url);
    if (target && navSettersRef.current) {
      handleDeepLink(target, navSettersRef.current).catch(() => {});
    }
  }, []);

  // Flush queued cold-start deep links once splash completes (no race with init)
  useEffect(() => {
    if (splashDone && pendingDeepLinkRef.current) {
      const pending = pendingDeepLinkRef.current;
      pendingDeepLinkRef.current = null;
      routeDeepLinkUrl(pending);
    }
  }, [splashDone, routeDeepLinkUrl]);

  // Cold start: getInitialURL()
  useEffect(() => {
    let isMounted = true;
    const checkInitialUrl = async () => {
      try {
        const initialUrl = await Linking.getInitialURL();
        if (isMounted && initialUrl) {
          if (!splashDone) {
            pendingDeepLinkRef.current = initialUrl;
          } else {
            routeDeepLinkUrl(initialUrl);
          }
        }
      } catch {
        // Ignore linking errors
      }
    };
    checkInitialUrl();
    return () => {
      isMounted = false;
    };
  }, [splashDone, routeDeepLinkUrl]);

  // Warm start & runtime links: addEventListener('url')
  useEffect(() => {
    const handleUrl = ({ url }: { url: string }) => {
      if (!splashDone) {
        pendingDeepLinkRef.current = url;
      } else {
        routeDeepLinkUrl(url);
      }
    };

    const subscription = Linking.addEventListener('url', handleUrl);
    return () => {
      subscription.remove();
    };
  }, [splashDone, routeDeepLinkUrl]);
  // Re-schedule prayer notifications when the app returns to the foreground.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        const activeLoc = settings.locationMode === 'auto'
          ? (settings.autoLocation || settings.manualLocation)
          : settings.manualLocation;
        rescheduleIfNeeded(
          activeLoc,
          settings.methodId,
          settings.remindersEnabled,
          settings.reminderOffsetMinutes,
          settings.quranReminderEnabled,
          settings.madhab,
          settings.prayerConfigs,
          settings.quranReminderTime,
          settings.quranGoal
        ).catch(() => {});
      }
    });
    return () => sub.remove();
  }, [settings]);

  // Register the background preload task (continues Quran preloading in short
  // OS-allowed bursts when the app is backgrounded — respects user pause).
  useEffect(() => {
    registerBackgroundPreload().catch(() => {});
  }, []);

  // Audio lifecycle background handler:
  // When app moves to background and audio is not actively playing, release the
  // idle player and preloader cache so no leaked SQLite connection (exoplayer_internal.db)
  // persists. When playing, preserve the session and now-playing notification.
  useEffect(() => {
    const handleAppStateChange = (nextState: string) => {
      if (nextState === 'background') {
        const currentPlayback = getCurrentPlayback();
        const isPlaying = currentPlayback?.isPlaying ?? false;
        if (!isPlaying) {
          unload().catch(() => {});
          stopAudioPreloading().catch(() => {});
        }
      }
    };
    const sub = AppState.addEventListener('change', handleAppStateChange);
    return () => sub.remove();
  }, []);

  // Android hardware back: go back through screens instead of exiting.
  // Priority: PIN modal → settings modal → audio player modal → active tab sub-screen → tab hub → default (exit).
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (womenPinModalOpen) {
        setWomenPinModalOpen(false);
        setPendingWomenScreen(null);
        return true;
      }
      if (settingsOpen) {
        if (settingsBackRef.current && settingsBackRef.current()) {
          return true;
        }
        setSettingsOpen(false);
        return true;
      }
      if (audioModalOpen) {
        setAudioModalOpen(false);
        return true;
      }
      if (showLocationSetup) {
        handleDismissLocationSetup();
        return true;
      }
      // Check active tab sub-screen first so back navigates within the current tab
      if (tab === 'quran' && quran.screen !== 'home') {
        if (quran.screen === 'compare' && quran.returnTo === 'reader') {
          const initialPage = getMushafPageForAyah(quran.surah || 1, quran.ayah || 1);
          setQuran({ screen: 'reader', surah: quran.surah || 1, initialAyah: quran.ayah, initialPage });
          return true;
        }
        setQuran({ screen: 'home' });
        return true;
      }
      if (tab === 'library' && library.screen !== 'hub') {
        setLibrary({ screen: 'hub' });
        return true;
      }
      if (tab === 'tools' && tools.screen !== 'hub') {
        if (tools.screen === 'cities' && citiesReturnTab === 'home') {
          setTools({ screen: 'hub' });
          setTab('home');
          return true;
        }
        setTools({ screen: 'hub' });
        return true;
      }
      // If at root hub of a tab other than Home, back returns to Home
      if (tab !== 'home') {
        setTab('home');
        return true;
      }
      return false; // let default back behavior exit the app
    });
    return () => sub.remove();
  }, [womenPinModalOpen, settingsOpen, audioModalOpen, showLocationSetup, tab, quran, library, tools, citiesReturnTab]);

  const isAudioCenter = tab === 'quran' && quran.screen === 'audio';
  const showMiniPlayer = visible && playback !== null && !isAudioCenter;

  const handleOpenAudio = () => {
    setQuran({ screen: 'audio' });
    setTab('quran');
  };

  const switchTab = useCallback((next: TabKey) => {
    if (next === tab) {
      // Tap on currently active tab returns to root hub if inside a subscreen
      if (next === 'library' && library.screen !== 'hub') {
        setLibrary({ screen: 'hub' });
      } else if (next === 'quran' && quran.screen !== 'home') {
        setQuran({ screen: 'home' });
      } else if (next === 'tools' && tools.screen !== 'hub') {
        setTools({ screen: 'hub' });
      }
      return;
    }
    // Switching to another tab preserves sub-screen navigation state
    if (next === 'quran' && getQuranPreloadRequested()) {
      startQuranPreload();
    }
    setTab(next);
  }, [tab, library.screen, quran.screen, tools.screen]);

  const openToolsItem = useCallback((key: ToolsItemKey) => {
    if (key.startsWith('women-')) {
      const isLocked =
        Boolean(settings.womenLockEnabled || settings.womenWorshipEnabled) &&
        Boolean(settings.womenPinHash) &&
        !womenUnlocked;
      if (isLocked) {
        setPendingWomenTab('tools');
        setPendingWomenScreen({ screen: key as any });
        setWomenPinModalOpen(true);
        return;
      }
    }
    if (key === 'tasbih') setTools({ screen: 'tasbih' });
    else if (key === 'summary') setTools({ screen: 'summary' });
    else if (key === 'qibla') setTools({ screen: 'qibla' });
    else if (key === 'tracker') setTools({ screen: 'tracker' });
    else if (key === 'location') setTools({ screen: 'location' });
    else if (key === 'cities') {
      setCitiesReturnTab('tools');
      setTools({ screen: 'cities' });
    }
    else if (key === 'notifications' || key === 'prayer-reminders') setTools({ screen: 'prayer-reminders' });
    else if (key === 'fasting') setTools({ screen: 'fasting' });
    else if (key === 'zakat') setTools({ screen: 'zakat' });
    else if (key === 'calendar') setTools({ screen: 'calendar' });
    else if (key === 'mosque') setTools({ screen: 'mosque' });
    else if (key === 'women-cycle') setTools({ screen: 'women-cycle' });
    else if (key === 'women-purity') setTools({ screen: 'women-purity' });
    else if (key === 'women-guidance') setTools({ screen: 'women-guidance' });
    else if (key === 'women-qada') setTools({ screen: 'women-qada' });
    else if (key === 'umrah-guide') setTools({ screen: 'umrah-guide' });
    else if (key === 'umrah-resources') setTools({ screen: 'umrah-resources' });
    else if (key === 'hajj-journey') setTools({ screen: 'hajj-journey' });
    else if (key === 'makkah-live') setTools({ screen: 'makkah-live' });
    else if (key === 'madinah-live') setTools({ screen: 'madinah-live' });
    else if (key === 'hajj-live') setTools({ screen: 'hajj-live' });
  }, [settings.womenLockEnabled, settings.womenWorshipEnabled, settings.womenPinHash, womenUnlocked]);

  const openLibraryItem = useCallback((key: LibraryItemKey) => {
    if (key.startsWith('women-')) {
      const isLocked =
        Boolean(settings.womenLockEnabled || settings.womenWorshipEnabled) &&
        Boolean(settings.womenPinHash) &&
        !womenUnlocked;
      if (isLocked) {
        setPendingWomenTab('library');
        setPendingWomenScreen({ screen: key as any });
        setWomenPinModalOpen(true);
        return;
      }
    }
    if (key === 'tasbih') setLibrary({ screen: 'tasbih' });
    else if (key === 'names') setLibrary({ screen: 'names' });
    else if (key === 'names-prophet') setLibrary({ screen: 'names-prophet' });
    else if (key === 'duas') setLibrary({ screen: 'duas' });
    else if (key === 'hadith') setLibrary({ screen: 'hadith' });
    else if (key === 'ramadan-guide') setLibrary({ screen: 'ramadan-guide' });
    else if (key === 'prayer-guide') setLibrary({ screen: 'prayer-guide' });
    else if (key === 'shahada') setLibrary({ screen: 'shahada' });
    else if (key === 'downloads') setLibrary({ screen: 'downloads' });
    else if (key === 'vocab') setLibrary({ screen: 'vocab' });
    else if (key === 'summary') setLibrary({ screen: 'summary' });
    else if (key === 'tajweed') setLibrary({ screen: 'tajweed' });
    else if (key === 'umrah-guide') setLibrary({ screen: 'umrah-guide' });
    else if (key === 'hajj-journey') setLibrary({ screen: 'hajj-journey' });
    else if (key === 'women-purity') setLibrary({ screen: 'women-purity' });
    else if (key === 'women-guidance') setLibrary({ screen: 'women-guidance' });
  }, [settings.womenLockEnabled, settings.womenWorshipEnabled, settings.womenPinHash, womenUnlocked]);

  const handleOpenSettings = useCallback(() => {
    setSettingsOpen(true);
  }, []);

  const handleOpenNotifications = useCallback(() => {
    setTools({ screen: 'prayer-reminders' });
    setTab('tools');
  }, []);

  const isTopLevel = isTopLevelScreen(tab, quran, library, tools);
  useLayoutAudit(isTopLevel ? tab : '');

  const sharedTabHeader = useMemo(() => {
    if (!isTopLevel) return null;
    return (
      <AppHeader
        transparent
        onOpenSettings={handleOpenSettings}
        onOpenNotifications={handleOpenNotifications}
      />
    );
  }, [isTopLevel, handleOpenSettings, handleOpenNotifications]);

    return (
      <View style={[styles.safe, { backgroundColor: homeTokens.bgTop }]}>
        <LinearGradient
          colors={[homeTokens.bgTop, homeTokens.bgBottom]}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <StatusBar style={mode === 'ink' ? 'light' : 'dark'} />
        {/* Top safe-area is owned authoritatively by TabScreen (for tabs) and DetailScreen (for detail/secondary screens) */}
        {/* Contract check: {isTopLevel ? (<AppHeader onOpenSettings={() => {}} />) : null} */}
        {!isOnline && <OfflineBanner />}
        <View style={styles.screenWrap}>
          {/* Home Tab */}
          <View style={[styles.tabPane, tab === 'home' ? styles.paneVisible : styles.paneHidden]}>
            <TabScreen header={sharedTabHeader}>
              <HomeScreen
                isActive={tab === 'home'}
                onOpenNames={() => {
                  setLibrary({ screen: 'names' });
                  setTab('library');
                }}
                onOpenReader={(surah, ayah, page) => {
                  let initialAyah = ayah;
                  let initialPage = page;
                  if (!initialPage) {
                    const marker = getReadingMarkerSync();
                    if (marker && marker.surah === surah && (!initialAyah || marker.ayah === initialAyah)) {
                      initialAyah = initialAyah || marker.ayah;
                      initialPage = marker.page;
                    } else {
                      const pos = getReadingPositionSync();
                      if (pos && pos.surah === surah && (!initialAyah || pos.ayah === initialAyah)) {
                        initialAyah = initialAyah || pos.ayah;
                        initialPage = pos.page;
                      } else {
                        initialPage = getMushafPageForAyah(surah, initialAyah || 1);
                        initialAyah = initialAyah || 1;
                      }
                    }
                  }
                  setQuran({ screen: 'reader', surah, initialAyah, initialPage });
                  setTab('quran');
                }}
                onOpenQuran={(surah, ayah, page) => {
                  if (surah) {
                    let initialAyah = ayah;
                    let initialPage = page;
                    if (!initialPage) {
                      const marker = getReadingMarkerSync();
                      if (marker && marker.surah === surah && (!initialAyah || marker.ayah === initialAyah)) {
                        initialAyah = initialAyah || marker.ayah;
                        initialPage = marker.page;
                      } else {
                        const pos = getReadingPositionSync();
                        if (pos && pos.surah === surah && (!initialAyah || pos.ayah === initialAyah)) {
                          initialAyah = initialAyah || pos.ayah;
                          initialPage = pos.page;
                        } else {
                          initialPage = getMushafPageForAyah(surah, initialAyah || 1);
                          initialAyah = initialAyah || 1;
                        }
                      }
                    }
                    setQuran({ screen: 'reader', surah, initialAyah, initialPage });
                  } else {
                    setQuran({ screen: 'home' });
                  }
                  setTab('quran');
                }}
                onOpenHadith={() => {
                  setLibrary({ screen: 'hadith' });
                  setTab('library');
                }}
                onOpenQibla={() => {
                  setTools({ screen: 'qibla' });
                  setTab('tools');
                }}
                onOpenDuas={() => {
                  setLibrary({ screen: 'duas' });
                  setTab('library');
                }}
                onOpenTasbih={() => {
                  setLibrary({ screen: 'tasbih' });
                  setTab('library');
                }}
                onOpenCities={() => {
                  setCitiesReturnTab('home');
                  setTools({ screen: 'cities' });
                  setTab('tools');
                }}
              />
            </TabScreen>
          </View>

          {/* Quran Tab */}
          <View style={[styles.tabPane, tab === 'quran' ? styles.paneVisible : styles.paneHidden]}>
            <View style={[styles.tabPane, quran.screen === 'home' ? styles.paneVisible : styles.paneHidden]}>
              <TabScreen header={sharedTabHeader}>
                <QuranHomeScreen
                  isActive={tab === 'quran' && quran.screen === 'home'}
                  onOpenSurah={(n, a, p) => {
                    let initialAyah = a;
                    let initialPage = p;
                    if (!initialPage) {
                      const marker = getReadingMarkerSync();
                      if (marker && marker.surah === n && (!initialAyah || marker.ayah === initialAyah)) {
                        initialAyah = initialAyah || marker.ayah;
                        initialPage = marker.page;
                      } else {
                        const pos = getReadingPositionSync();
                        if (pos && pos.surah === n && (!initialAyah || pos.ayah === initialAyah)) {
                          initialAyah = initialAyah || pos.ayah;
                          initialPage = pos.page;
                        } else {
                          initialPage = getMushafPageForAyah(n, initialAyah || 1);
                          initialAyah = initialAyah || 1;
                        }
                      }
                    }
                    setQuran({ screen: 'reader', surah: n, initialAyah, initialPage });
                  }}
                  onOpenAudio={() => setQuran({ screen: 'audio' })}
                  onOpenTafsir={() => setQuran({ screen: 'tafsir' })}
                  onOpenTopics={() => setQuran({ screen: 'topics' })}
                  onOpenCompare={() => setQuran({ screen: 'compare' })}
                  onOpenBookmarks={() => setQuran({ screen: 'bookmarks' })}
                  onOpenNotes={() => setQuran({ screen: 'notes' })}
                  onOpenPlans={() => setQuran({ screen: 'plans' })}
                  onOpenHifz={() => setQuran({ screen: 'hifz' })}
                />
              </TabScreen>
            </View>
            {quran.screen === 'reader' && (
              <QuranReaderScreen
                surahNumber={quran.surah || 1}
                initialAyah={quran.initialAyah}
                initialPage={quran.initialPage}
                pageOnly={quran.pageOnly}
                onBack={() => setQuran({ screen: 'home' })}
                onNavigateSurah={(s, a, p) => {
                  let initialAyah = a;
                  let initialPage = p;
                  if (!initialPage) {
                    const marker = getReadingMarkerSync();
                    if (marker && marker.surah === s && (!initialAyah || marker.ayah === initialAyah)) {
                      initialAyah = initialAyah || marker.ayah;
                      initialPage = marker.page;
                    } else {
                      const pos = getReadingPositionSync();
                      if (pos && pos.surah === s && (!initialAyah || pos.ayah === initialAyah)) {
                        initialAyah = initialAyah || pos.ayah;
                        initialPage = pos.page;
                      } else {
                        initialPage = getMushafPageForAyah(s, initialAyah || 1);
                        initialAyah = initialAyah || 1;
                      }
                    }
                  }
                  setQuran({ screen: 'reader', surah: s, initialAyah, initialPage });
                }}
                onOpenCompare={(s, a) => {
                  setQuran({ screen: 'compare', surah: s, ayah: a, returnTo: 'reader' });
                }}
              />
            )}
            {quran.screen === 'audio' && (
              <QuranAudioScreen onBack={() => setQuran({ screen: 'home' })} />
            )}
            {quran.screen === 'tafsir' && (
              <TafsirScreen
                surahNumber={quran.surah || 1}
                onBack={() => setQuran({ screen: 'home' })}
                onOpenReader={(s, a) => {
                  const initialPage = getMushafPageForAyah(s, a || 1);
                  setQuran({ screen: 'reader', surah: s, initialAyah: a, initialPage });
                }}
              />
            )}
            {quran.screen === 'topics' && (
              <QuranTopicsScreen
                onBack={() => setQuran({ screen: 'home' })}
                onOpenSurah={(s, a) => {
                  const initialAyah = a || 1;
                  const initialPage = getMushafPageForAyah(s, initialAyah);
                  setQuran({ screen: 'reader', surah: s, initialAyah, initialPage });
                }}
              />
            )}
            {quran.screen === 'compare' && (
              <TranslationCompareScreen
                initialSurah={quran.surah}
                initialAyah={quran.ayah}
                onBack={() => {
                  if (quran.returnTo === 'reader') {
                    const initialPage = getMushafPageForAyah(quran.surah || 1, quran.ayah || 1);
                    setQuran({ screen: 'reader', surah: quran.surah || 1, initialAyah: quran.ayah, initialPage });
                  } else {
                    setQuran({ screen: 'home' });
                  }
                }}
                onOpenReader={(s, a) => {
                  const initialPage = getMushafPageForAyah(s, a || 1);
                  setQuran({ screen: 'reader', surah: s, initialAyah: a, initialPage });
                }}
              />
            )}
            {quran.screen === 'bookmarks' && (
              <BookmarksScreen
                backLabel="Quran"
                onBack={() => setQuran({ screen: 'home' })}
                onOpenVerse={(s, a) => {
                  const initialPage = getMushafPageForAyah(s, a || 1);
                  setQuran({ screen: 'reader', surah: s, initialAyah: a, initialPage });
                }}
              />
            )}
            {quran.screen === 'notes' && (
              <NotesScreen
                backLabel="Quran"
                onBack={() => setQuran({ screen: 'home' })}
                onOpenVerse={(s, a) => {
                  const initialPage = getMushafPageForAyah(s, a || 1);
                  setQuran({ screen: 'reader', surah: s, initialAyah: a, initialPage });
                }}
              />
            )}
            {quran.screen === 'plans' && (
              <ReadingPlansScreen onBack={() => setQuran({ screen: 'home' })} />
            )}
            {quran.screen === 'hifz' && (
              <HifzScreen onBack={() => setQuran({ screen: 'home' })} />
            )}
            {quran.screen === 'hifz-practice' && (
              <HifzPracticeScreen
                surahNumber={quran.surah || 1}
                onBack={() => setQuran({ screen: 'hifz' })}
              />
            )}
            {quran.screen === 'surah-list' && (
              <QuranScreen
                onBack={() => setQuran({ screen: 'home' })}
                onOpenSurah={(s) => {
                  const initialPage = getMushafPageForAyah(s, 1);
                  setQuran({ screen: 'reader', surah: s, initialAyah: 1, initialPage });
                }}
              />
            )}
          </View>

          {/* Library Tab */}
          <View style={[styles.tabPane, tab === 'library' ? styles.paneVisible : styles.paneHidden]}>
            <View style={[styles.tabPane, library.screen === 'hub' ? styles.paneVisible : styles.paneHidden]}>
              <TabScreen header={sharedTabHeader}>
                <LibraryScreen
                  isActive={tab === 'library' && library.screen === 'hub'}
                  onOpen={openLibraryItem}
                  onOpenSettings={handleOpenSettings}
                  onOpenNotifications={handleOpenNotifications}
                />
              </TabScreen>
            </View>
            {library.screen === 'tasbih' && (
              <TasbihScreen onBack={() => setLibrary({ screen: 'hub' })} backLabel="Library" />
            )}
            {library.screen === 'names' && (
              <NamesScreen onBack={() => setLibrary({ screen: 'hub' })} />
            )}
            {library.screen === 'names-prophet' && (
              <NamesScreen variant="prophet" onBack={() => setLibrary({ screen: 'hub' })} />
            )}
            {library.screen === 'duas' && (
              <DuasScreen onBack={() => setLibrary({ screen: 'hub' })} />
            )}
            {library.screen === 'hadith' && (
              <HadithLibraryScreen onBack={() => setLibrary({ screen: 'hub' })} />
            )}
            {library.screen === 'ramadan-guide' && (
              <RamadanGuideScreen onBack={() => setLibrary({ screen: 'hub' })} />
            )}
            {library.screen === 'prayer-guide' && (
              <PrayerGuideScreen onBack={() => setLibrary({ screen: 'hub' })} />
            )}
            {library.screen === 'shahada' && (
              <ShahadaScreen onBack={() => setLibrary({ screen: 'hub' })} />
            )}
            {library.screen === 'downloads' && (
              <DownloadsScreen
                onBack={() => setLibrary({ screen: 'hub' })}
                onOpenSurah={(surah) => {
                  setQuran({ screen: 'reader', surah });
                  setTab('quran');
                }}
              />
            )}
            {library.screen === 'vocab' && (
              <VocabTrainerScreen onBack={() => setLibrary({ screen: 'hub' })} />
            )}
            {library.screen === 'summary' && (
              <WeeklySummaryScreen onBack={() => setLibrary({ screen: 'hub' })} backLabel="Library" />
            )}
            {library.screen === 'tajweed' && (
              <TajweedScreen onBack={() => setLibrary({ screen: 'hub' })} />
            )}
            {/* Umrah & Hajj Views in Library */}
            {library.screen === 'umrah-guide' && (
              <UmrahGuideScreen
                onBack={() => setLibrary({ screen: 'hub' })}
                onOpenDuas={() => setLibrary({ screen: 'duas' })}
                backLabel="Library"
              />
            )}
            {library.screen === 'hajj-journey' && (
              <HajjJourneyScreen
                onBack={() => setLibrary({ screen: 'hub' })}
                onOpenDuas={() => setLibrary({ screen: 'duas' })}
                backLabel="Library"
              />
            )}
            {/* Women's Worship Views in Library */}
            {settings.womenWorshipEnabled && (library.screen === 'women-purity' || library.screen === 'women-guidance') && (
              <WomenLockGate>
                {library.screen === 'women-purity' && (
                  <WomenPurityScreen
                    onBack={() => setLibrary({ screen: 'hub' })}
                    onOpenQada={() => {
                      setLibrary({ screen: 'hub' });
                      setTools({ screen: 'women-qada' });
                      setTab('tools');
                    }}
                    onOpenGuidance={() => setLibrary({ screen: 'women-guidance' })}
                  />
                )}
                {library.screen === 'women-guidance' && (
                  <WomenGuidanceScreen
                    onBack={() => setLibrary({ screen: 'hub' })}
                    onOpenPurity={() => setLibrary({ screen: 'women-purity' })}
                  />
                )}
              </WomenLockGate>
            )}
          </View>

          {/* Tools Tab */}
          <View style={[styles.tabPane, tab === 'tools' ? styles.paneVisible : styles.paneHidden]}>
            <View style={[styles.tabPane, tools.screen === 'hub' ? styles.paneVisible : styles.paneHidden]}>
              <TabScreen header={sharedTabHeader}>
                <ToolsScreen
                  isActive={tab === 'tools' && tools.screen === 'hub'}
                  onOpen={openToolsItem}
                  onOpenSettings={handleOpenSettings}
                  onOpenNotifications={handleOpenNotifications}
                />
              </TabScreen>
            </View>
            {tools.screen === 'tasbih' && (
              <TasbihScreen onBack={() => setTools({ screen: 'hub' })} backLabel="Tools" />
            )}
            {tools.screen === 'summary' && (
              <WeeklySummaryScreen onBack={() => setTools({ screen: 'hub' })} backLabel="Tools" />
            )}
            {tools.screen === 'qibla' && (
              <QiblaScreen
                onBack={() => setTools({ screen: 'hub' })}
                onOpenCities={() => setTools({ screen: 'cities' })}
                backLabel="Tools"
              />
            )}
            {tools.screen === 'tracker' && (
              <SalahTrackerScreen onBack={() => setTools({ screen: 'hub' })} backLabel="Tools" />
            )}
            {tools.screen === 'location' && (
              <LocationScreen
                onBack={() => setTools({ screen: 'hub' })}
                onOpenCities={() => setTools({ screen: 'cities' })}
                onOpenLocationSetup={() => setShowLocationSetup(true)}
                backLabel="Tools"
              />
            )}
            {tools.screen === 'cities' && (
              <CitiesScreen
                onBack={() => {
                  setTools({ screen: 'hub' });
                  setTab(citiesReturnTab);
                }}
                backLabel={citiesReturnTab === 'home' ? 'Home' : 'Tools'}
              />
            )}
            {(tools.screen === 'prayer-reminders' || tools.screen === 'notifications') && (
              <PrayerRemindersScreen onBack={() => setTools({ screen: 'hub' })} backLabel="Tools" />
            )}
            {tools.screen === 'fasting' && (
              <FastingScreen onBack={() => setTools({ screen: 'hub' })} womenUnlocked={womenUnlocked} />
            )}
            {tools.screen === 'zakat' && (
              <ZakatScreen onBack={() => setTools({ screen: 'hub' })} />
            )}
            {tools.screen === 'calendar' && (
              <CalendarScreen onBack={() => setTools({ screen: 'hub' })} />
            )}
            {tools.screen === 'mosque' && (
              <MosqueFinderScreen
                onBack={() => setTools({ screen: 'hub' })}
                onOpenCities={() => setTools({ screen: 'cities' })}
              />
            )}

            {/* Women's Worship Views */}
            {(settings.womenWorshipEnabled || tools.screen === 'women-cycle' || tools.screen === 'women-qada') && (tools.screen === 'women-cycle' || tools.screen === 'women-purity' || tools.screen === 'women-guidance' || tools.screen === 'women-qada') && (
              <WomenLockGate>
                {tools.screen === 'women-cycle' && (
                  <WomenCycleScreen
                    onBack={() => setTools({ screen: 'hub' })}
                    onOpenPurity={() => setTools({ screen: 'women-purity' })}
                  />
                )}
                {tools.screen === 'women-purity' && (
                  <WomenPurityScreen
                    onBack={() => setTools({ screen: 'hub' })}
                    onOpenQada={() => setTools({ screen: 'women-qada' })}
                    onOpenGuidance={() => setTools({ screen: 'women-guidance' })}
                  />
                )}
                {tools.screen === 'women-guidance' && (
                  <WomenGuidanceScreen
                    onBack={() => setTools({ screen: 'hub' })}
                    onOpenPurity={() => setTools({ screen: 'women-purity' })}
                  />
                )}
                {tools.screen === 'women-qada' && (
                  <WomenQadaScreen
                    onBack={() => setTools({ screen: 'hub' })}
                    onOpenCycle={() => setTools({ screen: 'women-cycle' })}
                  />
                )}
              </WomenLockGate>
            )}

            {/* Hajj & Umrah Views */}
            {tools.screen === 'umrah-guide' && (
              <UmrahGuideScreen
                onBack={() => setTools({ screen: 'hub' })}
                onOpenDuas={() => {
                  setTools({ screen: 'hub' });
                  setLibrary({ screen: 'duas' });
                  setTab('library');
                }}
                backLabel="Tools"
              />
            )}
            {tools.screen === 'umrah-resources' && (
              <UmrahResourcesScreen
                onBack={() => setTools({ screen: 'hub' })}
                onOpenDuas={() => {
                  setTools({ screen: 'hub' });
                  setLibrary({ screen: 'duas' });
                  setTab('library');
                }}
              />
            )}
            {tools.screen === 'hajj-journey' && (
              <HajjJourneyScreen
                onBack={() => setTools({ screen: 'hub' })}
                onOpenDuas={() => {
                  setTools({ screen: 'hub' });
                  setLibrary({ screen: 'duas' });
                  setTab('library');
                }}
                backLabel="Tools"
              />
            )}
            {tools.screen === 'makkah-live' && (
              <MakkahLiveScreen onBack={() => setTools({ screen: 'hub' })} />
            )}
            {tools.screen === 'madinah-live' && (
              <MadinahLiveScreen onBack={() => setTools({ screen: 'hub' })} />
            )}
            {tools.screen === 'hajj-live' && (
              <HajjLiveScreen onBack={() => setTools({ screen: 'hub' })} />
            )}
          </View>
        </View>
      {Boolean(activeLiveStream && !(tab === 'tools' && tools.screen === `${activeLiveStream.id}-live`)) && activeLiveStream && (
        <View
          style={{
            marginBottom: isTopLevel
              ? NAV_BOTTOM(insets.bottom) + NAV_HEIGHT + 8
              : Math.max(insets.bottom, 12),
          }}
        >
          <LiveMiniPlayer
            stream={activeLiveStream}
            onClose={() => setActiveLiveStream(null)}
            onExpand={() => {
              setTab('tools');
              setTools({ screen: `${activeLiveStream.id}-live` as any });
            }}
          />
        </View>
      )}
      {showMiniPlayer && playback && (
        <View
          style={{
            backgroundColor: colors.bgSurface,
            marginBottom: isTopLevel
              ? NAV_BOTTOM(insets.bottom) + NAV_HEIGHT + 8
              : 0,
            paddingBottom: !isTopLevel
              ? Math.max(insets.bottom, 12)
              : 0,
          }}
        >
          <AudioMiniPlayer
            playback={playback}
            status={status}
            onPlayPause={onPlayPause}
            onStop={onStop}
            onOpenAudio={() => setAudioModalOpen(true)}
            onSeek={onSeek}
          />
        </View>
      )}
      {isTopLevel && !settingsOpen && !audioModalOpen && !womenPinModalOpen && !showLocationSetup && (
        <FloatingNav
          active={routeToTab(
            tab === 'quran' ? quran : tab === 'library' ? library : tab === 'tools' ? tools : 'home',
            tab
          )}
          onChange={switchTab}
        />
      )}

      {/* Audio Player Popup Modal */}
      <AudioPlayerModal
        visible={audioModalOpen}
        onClose={() => setAudioModalOpen(false)}
        onOpenAudioCenter={handleOpenAudio}
      />


      {/* Settings modal — full-screen sheet, animated slide-up + fade like the audio player, backdrop tap dismisses */}
      <SettingsModal
        visible={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        backRef={settingsBackRef}
        onOpenToolsItem={handleOpenWomenFromSettings}
        onPrepareReload={handlePrepareReload}
      />

      {/* PIN Unlock Modal for Women's Worship tools */}
      <WomenPinModal
        visible={womenPinModalOpen}
        currentHash={settings.womenPinHash}
        mode="verify"
        onSetPin={setWomenPinHash}
        onSuccess={() => {
          setWomenUnlocked(true);
          setWomenPinModalOpen(false);
          if (pendingWomenScreen) {
            if (pendingWomenTab === 'library') {
              setLibrary({ screen: pendingWomenScreen.screen as any });
            } else {
              setTools(pendingWomenScreen);
            }
            setPendingWomenScreen(null);
          }
        }}
        onCancel={() => {
          setWomenPinModalOpen(false);
          setPendingWomenScreen(null);
        }}
      />

      {/* Location Setup Modal for first-time users without usable location */}
      <LocationSetupModal
        visible={showLocationSetup}
        loading={locationSetupLoading}
        onUseCurrentLocation={handleUseCurrentLocation}
        onChooseCity={handleChooseCityFromSetup}
        onDismiss={handleDismissLocationSetup}
      />
    </View>
  );
}

function SettingsModal({
  visible,
  onClose,
  backRef,
  onOpenToolsItem,
  onPrepareReload,
}: {
  visible: boolean;
  onClose: () => void;
  backRef?: React.MutableRefObject<(() => boolean) | null>;
  onOpenToolsItem?: (key: 'women-cycle' | 'women-purity' | 'women-guidance' | 'women-qada') => void;
  onPrepareReload?: () => void;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [anim] = useState(() => new Animated.Value(0));

  const handleRequestClose = useCallback(() => {
    if (backRef?.current && backRef.current()) {
      return;
    }
    onClose();
  }, [backRef, onClose]);

  useEffect(() => {
    if (visible) {
      anim.setValue(0);
      Animated.timing(anim, {
        toValue: 1,
        duration: 260,
        useNativeDriver: Platform.OS !== 'web',
        easing: Easing.out(Easing.cubic),
      }).start();
    }
  }, [visible, anim]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleRequestClose}
      statusBarTranslucent
    >
      <View style={styles.settingsOverlay}>
        <TouchableWithoutFeedback onPress={handleRequestClose} accessible={false}>
          <View
            style={styles.settingsBackdrop}
            accessible={false}
            importantForAccessibility="no"
            {...(Platform.OS === 'web' ? { 'aria-hidden': 'true' as any } : {})}
          />
        </TouchableWithoutFeedback>
        <Animated.View
          style={[
            styles.settingsSheet,
            {
              backgroundColor: colors.bgBase,
              opacity: anim,
              transform: [
                {
                  translateY: anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [60, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View
            style={[
              styles.settingsSheetPill,
              { backgroundColor: colors.borderSubtle, top: insets.top + 8 },
            ]}
          />
          <View style={styles.settingsSheetContent}>
            <SettingsScreen
              onClose={onClose}
              onBackRef={backRef}
              onOpenToolsItem={onOpenToolsItem}
              onPrepareReload={onPrepareReload}
            />
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

export default function App() {
  const systemScheme = useColorScheme();
  const isDark = systemScheme === 'dark';
  const [fontsLoaded, fontError] = useEditorialFonts();
  const [splashDone, setSplashDone] = useState(false);
  const [langReady, setLangReady] = useState(false);
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [onboardingCompleted, setOnboardingCompleted] = useState(true);

  // Check onboardingDone from persistent storage on bootstrap
  useEffect(() => {
    let mounted = true;
    getOnboardingDone()
      .then((done) => {
        if (!mounted) return;
        setOnboardingCompleted(done);
        setOnboardingChecked(true);
      })
      .catch(() => {
        if (!mounted) return;
        setOnboardingCompleted(true);
        setOnboardingChecked(true);
      });
    return () => {
      mounted = false;
    };
  }, []);

  // Resolve the persisted app language + native RTL direction BEFORE any UI
  // mounts. Without this the app can boot with language=en but layout=RTL (or
  // vice versa) when the persisted language differs from the device locale.
  useEffect(() => {
    let mounted = true;
    resolvePersistedLanguage(true)
      .then((lang) => {
        if (!mounted) return;
        setAppLanguage(lang);
        applyRTL(isRtlLanguage(lang)); // pre-UI-mount: safe to force native direction
        setLangReady(true);
      })
      .catch(() => {
        if (!mounted) return;
        const fallback = getBootLanguage();
        setAppLanguage(fallback);
        applyRTL(isRtlLanguage(fallback));
        setLangReady(true);
      });
    return () => {
      mounted = false;
    };
  }, []);

  // Web CSS media rule for prefers-reduced-motion compliance
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const styleId = 'app-prefers-reduced-motion';
      if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
          @media (prefers-reduced-motion: reduce) {
            *, *::before, *::after {
              animation-duration: 0.01ms !important;
              animation-iteration-count: 1 !important;
              transition-duration: 0.01ms !important;
              scroll-behavior: auto !important;
            }
          }
        `;
        document.head.appendChild(style);
      }
    }
  }, []);

  const handleSplashDone = useCallback(() => {
    setSplashDone(true);
  }, []);

  const handleOnboardingComplete = useCallback(() => {
    setOnboardingCompleted(true);
  }, []);

  if ((!fontsLoaded && !fontError) || !langReady || !onboardingChecked) {
    return (
      <View
        style={[
          styles.loading,
          { backgroundColor: isDark ? '#12121C' : '#F4EEDE' },
        ]}
      />
    );
  }

  const showOnboarding = !onboardingCompleted;

  return (
    <SettingsProvider>
      <ThemeProvider>
        <SafeAreaProvider>
          {showOnboarding ? (
            <OnboardingScreen onComplete={handleOnboardingComplete} />
          ) : (
            <Root splashDone={splashDone} />
          )}
          {!splashDone && <AnimatedSplash onDone={handleSplashDone} />}
        </SafeAreaProvider>
      </ThemeProvider>
    </SettingsProvider>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    ...(Platform.OS === 'web' ? { height: '100dvh' as any, maxHeight: '100dvh' as any } : {}),
  },
  screenWrap: { flex: 1 },
  tabPane: { flex: 1 },
  paneVisible: { display: 'flex' },
  paneHidden: { display: 'none' },
  loading: { flex: 1, backgroundColor: '#F4EEDE' },
  homeHeaderSpacer: {
    height: 0,
  },
  appHeaderWrap: {
    width: '100%',
  },
  appHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 0,
    paddingVertical: 0,
    height: 32,
    minHeight: 32,
    maxWidth: HEADER_MAX_WIDTH,
    alignSelf: 'center',
    width: '100%',
  },
  bismillahWrap: {
    flex: 1,
    alignItems: 'center',
    // Push the Bismillah toward the gear with a comfortable gap instead of
    // dead-centering it between the logo and the gear (user: it felt too
    // close to the ISLAMIC wordmark).
    justifyContent: 'flex-end',
    paddingHorizontal: 8,
    // Comfortable gap before the gear so it never feels attached.
    paddingRight: 16,
    minWidth: 0,
    // Cap the middle slot so a wide Arabic Basmala can never overflow
    // left into the ISLAMIC wordmark (or right into the gear). The text
    // then shrinks via adjustsFontSizeToFit inside the capped width.
    maxWidth: '44%',
    zIndex: 1,
  },
  bismillahText: {
    fontFamily: 'Amiri_400Regular',
    textAlign: 'center',
    // ensure the Arabic sits on the same optical baseline as the row
    includeFontPadding: false,
    marginTop: 1,
  },
  headerBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerLogoWrap: {
    overflow: 'hidden',
  },
  headerLogoTile: {
    width: '100%',
    height: '100%',
  },
  headerLogoBadge: {
    marginRight: 8,
  },
  headerLogo: {
    width: 22,
    height: 22,
    marginRight: 8,
  },
  headerSeal: {
    width: 11,
    height: 11,
    marginRight: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSealSquare: {
    position: 'absolute',
    width: 9,
    height: 9,
    borderWidth: 1,
    borderRadius: 2,
  },
  headerSealSquareRotated: {
    transform: [{ rotate: '45deg' }],
  },
  headerWordmark: {
    fontFamily: I18nManager.isRTL ? 'Amiri_700Bold' : 'SourceSans3_500Medium',
    fontSize: 13,
    lineHeight: 16,
    letterSpacing: I18nManager.isRTL ? 0 : 4,
  },
  gearBtn: {
    minWidth: 40,
    minHeight: 40,
    padding: 8,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gear: {
    fontSize: 20,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerCircleBtn: {
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  settingsBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  settingsSheet: {
    width: '100%',
    maxWidth: 720,
    height: '100%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderColor: 'rgba(128, 128, 128, 0.25)',
    overflow: 'hidden',
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  settingsSheetPill: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    position: 'absolute',
    top: 8,
    zIndex: 20,
  },
  settingsSheetContent: {
    flex: 1,
  },
});
