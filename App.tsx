import React, { useState, useCallback, useEffect, useRef } from 'react';
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
  useWindowDimensions,
  Linking,
  AppState,
  BackHandler,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ThemeProvider, useTheme } from './src/lib/theme';
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

import HomeScreen from './src/screens/HomeScreen';
import QiblaScreen from './src/screens/QiblaScreen';
import QuranHomeScreen from './src/screens/QuranHomeScreen';
import QuranReaderScreen from './src/screens/QuranReaderScreen';
import QuranAudioScreen from './src/screens/QuranAudioScreen';
import TafsirScreen from './src/screens/TafsirScreen';
import QuranTopicsScreen from './src/screens/QuranTopicsScreen';
import TranslationCompareScreen from './src/screens/TranslationCompareScreen';
import BookmarksScreen from './src/screens/BookmarksScreen';
import NotesScreen from './src/screens/NotesScreen';
import CalendarScreen from './src/screens/CalendarScreen';
import LibraryScreen, { LibraryItemKey } from './src/screens/LibraryScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import TasbihScreen from './src/screens/TasbihScreen';
import NamesScreen from './src/screens/NamesScreen';
import DuasScreen from './src/screens/DuasScreen';
import ReadingPlansScreen from './src/screens/ReadingPlansScreen';
import HifzScreen from './src/screens/HifzScreen';
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
import WomenPurityScreen from './src/screens/WomenPurityScreen';
import WomenGuidanceScreen from './src/screens/WomenGuidanceScreen';
import WomenQadaScreen from './src/screens/WomenQadaScreen';
import UmrahGuideScreen from './src/screens/UmrahGuideScreen';
import UmrahResourcesScreen from './src/screens/UmrahResourcesScreen';
import HajjJourneyScreen from './src/screens/HajjJourneyScreen';
import MakkahLiveScreen from './src/screens/MakkahLiveScreen';
import MadinahLiveScreen from './src/screens/MadinahLiveScreen';
import HajjLiveScreen from './src/screens/HajjLiveScreen';
import RamadanGuideScreen from './src/screens/RamadanGuideScreen';
import PrayerGuideScreen from './src/screens/PrayerGuideScreen';
import DownloadsScreen from './src/screens/DownloadsScreen';
import { AudioMiniPlayer } from './src/components/AudioMiniPlayer';
import { AudioPlayerModal } from './src/components/AudioPlayerModal';
import { useAudioMiniPlayer } from './src/lib/useAudioMiniPlayer';
import { startNowPlayingNotification, updateNowPlayingNotification, stopNowPlayingNotification, cleanupNowPlayingNotification } from './src/lib/nowPlayingNotification';
import { addPlaybackStatusListener, getPlaybackStatus, getCurrentPlayback } from './src/lib/quranAudio';
import { rescheduleIfNeeded, setupNotificationResponseHandler } from './src/lib/notifications';
import { startQuranPreload } from './src/lib/quranPreloader';
import { runFirstLaunchWarmup } from './src/lib/warmup';
import {
  runFirstLaunchPermissions,
  hasDismissedLocationSetup,
  markLocationSetupDismissed,
} from './src/lib/firstLaunchPermissions';
import { LocationSetupModal } from './src/components/LocationSetupModal';
import { useLocation, refreshLocationSilently, computeDistanceKm } from './src/lib/useLocation';
import { updateWidgetSnapshot } from './src/lib/widgetBridge';
import { registerBackgroundPreload } from './src/lib/backgroundPreload';

type TabKey = 'home' | 'quran' | 'library' | 'tools';

interface TabItemConfig {
  key: TabKey;
  label: string;
  iconActive: keyof typeof Ionicons.glyphMap;
  iconInactive: keyof typeof Ionicons.glyphMap;
}

const TABS: TabItemConfig[] = [
  { key: 'home', label: 'Home', iconActive: 'home', iconInactive: 'home-outline' },
  { key: 'quran', label: 'Quran', iconActive: 'book', iconInactive: 'book-outline' },
  { key: 'library', label: 'Library', iconActive: 'albums', iconInactive: 'albums-outline' },
  { key: 'tools', label: 'Tools', iconActive: 'construct', iconInactive: 'construct-outline' },
];

function TabBar({ active, onChange }: { active: TabKey; onChange: (t: TabKey) => void }) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isCompact = width < 380;
  const isTiny = width <= 340;

  const iconSize = isTiny ? 17 : isCompact ? 18 : 20;
  const fontSize = isTiny ? 10 : isCompact ? 11 : 12;
  const indicatorWidth = isCompact ? 18 : 24;

  return (
    <View
      style={[
        styles.tabBar,
        {
          backgroundColor: colors.bgSurface,
          borderTopColor: colors.borderSubtle,
          paddingBottom: insets.bottom + (isCompact ? 4 : 6),
          paddingTop: isCompact ? 2 : 4,
        },
      ]}
    >
      {TABS.map((tab) => {
        const isActive = tab.key === active;
        const iconName = isActive ? tab.iconActive : tab.iconInactive;
        const iconColor = isActive ? colors.accent : colors.textMuted;
        return (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tabItem,
              {
                paddingVertical: isCompact ? 6 : 8,
                gap: isCompact ? 2 : 4,
              },
            ]}
            onPress={() => onChange(tab.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={tab.label}
          >
            <Ionicons name={iconName} size={iconSize} color={iconColor} />
            <Text
              style={[
                styles.tabLabel,
                {
                  color: iconColor,
                  fontSize,
                  letterSpacing: isCompact ? 0 : 0.3,
                },
              ]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {tab.label}
            </Text>
            <View
              style={[
                styles.tabIndicator,
                {
                  width: indicatorWidth,
                  backgroundColor: isActive ? colors.accent : 'transparent',
                },
              ]}
            />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

/** Top app header: brand mark + ISLAMIC wordmark + settings gear. */
function AppHeader({ onOpenSettings }: { onOpenSettings: () => void }) {
  const { colors, mode } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.appHeader,
        {
          borderBottomColor: colors.borderSubtle,
          paddingTop: insets.top + 10,
        },
      ]}
    >
      <View style={styles.headerBrand}>
        <Image
          source={
            mode === 'paper'
              ? require('./assets/logo-small-black.png')
              : require('./assets/logo-small-ivory.png')
          }
          style={styles.headerLogo}
          resizeMode="contain"
        />
        <View
          style={styles.headerSeal}
          accessible={false}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <View
            style={[
              styles.headerSealSquare,
              { borderColor: colors.accent, opacity: 0.6 },
            ]}
          />
          <View
            style={[
              styles.headerSealSquare,
              styles.headerSealSquareRotated,
              { borderColor: colors.accent, opacity: 0.6 },
            ]}
          />
        </View>
        <Text
          style={[styles.headerWordmark, { color: colors.textPrimary }]}
          numberOfLines={1}
        >
          ISLAMIC
        </Text>
      </View>
      <TouchableOpacity
        onPress={onOpenSettings}
        accessibilityRole="button"
        accessibilityLabel="Open settings"
        style={styles.gearBtn}
      >
        <Text style={[styles.gear, { color: colors.textSecondary }]}>⚙︎</Text>
      </TouchableOpacity>
    </View>
  );
}

type LibraryView =
  | { screen: 'hub' }
  | { screen: 'tasbih' }
  | { screen: 'names' }
  | { screen: 'names-prophet' }
  | { screen: 'duas' }
  | { screen: 'hadith' }
  | { screen: 'ramadan-guide' }
  | { screen: 'prayer-guide' }
  | { screen: 'downloads' };

type QuranView =
  | { screen: 'home' }
  | { screen: 'reader'; surah: number; initialAyah?: number }
  | { screen: 'audio' }
  | { screen: 'tafsir'; surah?: number }
  | { screen: 'topics' }
  | { screen: 'compare'; surah?: number; ayah?: number }
  | { screen: 'bookmarks' }
  | { screen: 'notes' }
  | { screen: 'plans' }
  | { screen: 'hifz' };

type ToolsView =
  | { screen: 'hub' }
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

function Root({ splashDone }: { splashDone: boolean }) {
  const { colors, mode } = useTheme();
  const { isOnline } = useConnectivity();
  const { settings, setAutoLocation } = useSettings();
  const { request: requestLocation, status: locStatus } = useLocation();
  const [tab, setTab] = useState<TabKey>('home');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [audioModalOpen, setAudioModalOpen] = useState(false);
  const [showLocationSetup, setShowLocationSetup] = useState(false);
  const [locationSetupLoading, setLocationSetupLoading] = useState(false);
  const [citiesReturnTab, setCitiesReturnTab] = useState<TabKey>('tools');
  const [library, setLibrary] = useState<LibraryView>({ screen: 'hub' });
  const [quran, setQuran] = useState<QuranView>({ screen: 'home' });
  const [tools, setTools] = useState<ToolsView>({ screen: 'hub' });

  // Global Audio Mini Player state
  const { playback, status, visible, onPlayPause, onStop, onSeek } = useAudioMiniPlayer();

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
  useEffect(() => {
    if (!splashDone) return;
    let isMounted = true;

    async function checkLocationSetup() {
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
      if (isMounted) {
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
      }
    } catch {
      // Non-fatal
    } finally {
      setLocationSetupLoading(false);
      await markLocationSetupDismissed();
      setShowLocationSetup(false);
    }
  };

  const handleChooseCityFromSetup = async () => {
    await markLocationSetupDismissed();
    setShowLocationSetup(false);
    setCitiesReturnTab('home');
    setTools({ screen: 'cities' });
    setTab('tools');
  };

  const handleDismissLocationSetup = async () => {
    await markLocationSetupDismissed();
    setShowLocationSetup(false);
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

    const handleStatusChange = async (newStatus: { isPlaying: boolean }) => {
      if (!isMounted) return;

      const currentPlayback = getCurrentPlayback();
      const fullStatus = getPlaybackStatus();

      if (currentPlayback && (newStatus.isPlaying || fullStatus.isLoaded || fullStatus.isBuffering)) {
        await updateNowPlayingNotification();
      } else if (!currentPlayback || (!newStatus.isPlaying && !fullStatus.isLoaded && !fullStatus.isBuffering)) {
        await stopNowPlayingNotification();
      }
    };

    const unsub = addPlaybackStatusListener(handleStatusChange);

    // Initial check
    const initialPlayback = getCurrentPlayback();
    const initialStatus = getPlaybackStatus();
    if (initialPlayback && (initialStatus.isLoaded || initialStatus.isPlaying || initialStatus.isBuffering)) {
      startNowPlayingNotification();
    }

    return () => {
      isMounted = false;
      unsub();
      stopNowPlayingNotification();
      cleanupNowPlayingNotification();
    };
  }, []);

  // Deep link handling - initial URL (cold start)
  useEffect(() => {
    let isMounted = true;
    const checkInitialUrl = async () => {
      if (!isMounted) return;
      try {
        const initialUrl = await Linking.getInitialURL();
        if (initialUrl) {
          const target = parseDeepLink(initialUrl);
          if (target) {
            const setters: NavigationSetters = {
              setTab,
              setQuran,
              setLibrary,
              setTools,
              setSettingsOpen,
            };
            handleDeepLink(target, setters);
          }
        }
      } catch {
        // Ignore linking errors
      }
    };
    checkInitialUrl();
    return () => { isMounted = false; };
  }, [setTab, setQuran, setLibrary, setTools, setSettingsOpen]);

  // Deep link handling - event listener (app already running)
  useEffect(() => {
    const handleUrl = ({ url }: { url: string }) => {
      const target = parseDeepLink(url);
      if (target) {
        const setters: NavigationSetters = {
          setTab,
          setQuran,
          setLibrary,
          setTools,
          setSettingsOpen,
        };
        handleDeepLink(target, setters);
      }
    };

    const subscription = Linking.addEventListener('url', handleUrl);
    return () => {
      subscription.remove();
    };
  }, [setTab, setQuran, setLibrary, setTools, setSettingsOpen]);
  // Sync the home-screen widget snapshot: on mount, when the app returns to
  // foreground, and after prayer data loads (data changes → widget refresh).
  useEffect(() => {
    updateWidgetSnapshot();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        updateWidgetSnapshot();
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

  // Android hardware back: go back through screens instead of exiting.
  // Priority: settings modal → audio player modal → sub-screen → tab hub → default (exit).
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (settingsOpen) {
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
      if (library.screen !== 'hub') {
        setLibrary({ screen: 'hub' });
        return true;
      }
      if (quran.screen !== 'home') {
        setQuran({ screen: 'home' });
        return true;
      }
      if (tools.screen !== 'hub') {
        setTools({ screen: 'hub' });
        return true;
      }
      if (tab !== 'home') {
        setTab('home');
        return true;
      }
      return false; // let default back behavior exit the app
    });
    return () => sub.remove();
  }, [settingsOpen, audioModalOpen, showLocationSetup, library, quran, tools, tab]);

  const isAudioCenter = tab === 'quran' && quran.screen === 'audio';
  const showMiniPlayer = visible && playback !== null && !isAudioCenter;

  const handleOpenAudio = () => {
    setLibrary({ screen: 'hub' });
    setTools({ screen: 'hub' });
    setQuran({ screen: 'audio' });
    setTab('quran');
  };

  function switchTab(next: TabKey) {
    // Reset sub-views when switching away
    if (next !== 'library') setLibrary({ screen: 'hub' });
    if (next !== 'quran') setQuran({ screen: 'home' });
    if (next !== 'tools') setTools({ screen: 'hub' });
    if (next === 'quran' && getQuranPreloadRequested()) startQuranPreload();
    setTab(next);
  }

  function openToolsItem(key: ToolsItemKey) {
    if (key === 'qibla') setTools({ screen: 'qibla' });
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
  }

  function openLibraryItem(key: LibraryItemKey) {
    if (key === 'tasbih') setLibrary({ screen: 'tasbih' });
    else if (key === 'names') setLibrary({ screen: 'names' });
    else if (key === 'names-prophet') setLibrary({ screen: 'names-prophet' });
    else if (key === 'duas') setLibrary({ screen: 'duas' });
    else if (key === 'hadith') setLibrary({ screen: 'hadith' });
    else if (key === 'ramadan-guide') setLibrary({ screen: 'ramadan-guide' });
    else if (key === 'prayer-guide') setLibrary({ screen: 'prayer-guide' });
    else if (key === 'downloads') setLibrary({ screen: 'downloads' });
  }

  return (
    <View style={[styles.safe, { backgroundColor: colors.bgBase }]}>
        <StatusBar style={mode === 'ink' ? 'light' : 'dark'} />
        <AppHeader onOpenSettings={() => setSettingsOpen(true)} />
        {!isOnline && <OfflineBanner />}
        <View style={styles.screenWrap}>
        {tab === 'home' && (
          <HomeScreen
            onOpenNames={() => {
              setQuran({ screen: 'home' });
              setTools({ screen: 'hub' });
              setLibrary({ screen: 'names' });
              setTab('library');
            }}
            onOpenQuran={(surah, ayah) => {
              setLibrary({ screen: 'hub' });
              setTools({ screen: 'hub' });
              if (surah) {
                setQuran({ screen: 'reader', surah, initialAyah: ayah });
              } else {
                setQuran({ screen: 'home' });
              }
              setTab('quran');
            }}
            onOpenHadith={() => {
              setQuran({ screen: 'home' });
              setTools({ screen: 'hub' });
              setLibrary({ screen: 'hadith' });
              setTab('library');
            }}
            onOpenQibla={() => {
              setQuran({ screen: 'home' });
              setLibrary({ screen: 'hub' });
              setTools({ screen: 'qibla' });
              setTab('tools');
            }}
            onOpenDuas={() => {
              setQuran({ screen: 'home' });
              setTools({ screen: 'hub' });
              setLibrary({ screen: 'duas' });
              setTab('library');
            }}
            onOpenAdhkar={() => {
              setQuran({ screen: 'home' });
              setTools({ screen: 'hub' });
              setLibrary({ screen: 'duas' });
              setTab('library');
            }}
            onOpenTasbih={() => {
              setQuran({ screen: 'home' });
              setTools({ screen: 'hub' });
              setLibrary({ screen: 'tasbih' });
              setTab('library');
            }}
            onOpenCities={() => {
              setTools({ screen: 'cities' });
              setTab('tools');
            }}
          />
        )}

        {/* Quran Tab Views */}
        {tab === 'quran' && quran.screen === 'home' && (
          <QuranHomeScreen
            onOpenSurah={(n, a) => setQuran({ screen: 'reader', surah: n, initialAyah: a })}
            onOpenAudio={() => setQuran({ screen: 'audio' })}
            onOpenTafsir={() => setQuran({ screen: 'tafsir' })}
            onOpenTopics={() => setQuran({ screen: 'topics' })}
            onOpenCompare={() => setQuran({ screen: 'compare' })}
            onOpenBookmarks={() => setQuran({ screen: 'bookmarks' })}
            onOpenNotes={() => setQuran({ screen: 'notes' })}
            onOpenPlans={() => setQuran({ screen: 'plans' })}
            onOpenHifz={() => setQuran({ screen: 'hifz' })}
          />
        )}
        {tab === 'quran' && quran.screen === 'reader' && (
          <QuranReaderScreen
            surahNumber={quran.surah}
            initialAyah={quran.initialAyah}
            onBack={() => setQuran({ screen: 'home' })}
            onNavigateSurah={(s) => setQuran({ screen: 'reader', surah: s })}
          />
        )}
        {tab === 'quran' && quran.screen === 'audio' && (
          <QuranAudioScreen onBack={() => setQuran({ screen: 'home' })} />
        )}
        {tab === 'quran' && quran.screen === 'tafsir' && (
          <TafsirScreen
            surahNumber={quran.surah}
            onBack={() => setQuran({ screen: 'home' })}
            onOpenReader={(s, a) => setQuran({ screen: 'reader', surah: s, initialAyah: a })}
          />
        )}
        {tab === 'quran' && quran.screen === 'topics' && (
          <QuranTopicsScreen
            onBack={() => setQuran({ screen: 'home' })}
            onOpenSurah={(s, a) => setQuran({ screen: 'reader', surah: s, initialAyah: a })}
          />
        )}
        {tab === 'quran' && quran.screen === 'compare' && (
          <TranslationCompareScreen
            initialSurah={quran.surah}
            initialAyah={quran.ayah}
            onBack={() => setQuran({ screen: 'home' })}
            onOpenReader={(s, a) => setQuran({ screen: 'reader', surah: s, initialAyah: a })}
          />
        )}
        {tab === 'quran' && quran.screen === 'bookmarks' && (
          <BookmarksScreen
            backLabel="Quran"
            onBack={() => setQuran({ screen: 'home' })}
            onOpenVerse={(s, a) => setQuran({ screen: 'reader', surah: s, initialAyah: a })}
          />
        )}
        {tab === 'quran' && quran.screen === 'notes' && (
          <NotesScreen
            backLabel="Quran"
            onBack={() => setQuran({ screen: 'home' })}
            onOpenVerse={(s, a) => setQuran({ screen: 'reader', surah: s, initialAyah: a })}
          />
        )}
        {tab === 'quran' && quran.screen === 'plans' && (
          <ReadingPlansScreen onBack={() => setQuran({ screen: 'home' })} />
        )}
        {tab === 'quran' && quran.screen === 'hifz' && (
          <HifzScreen onBack={() => setQuran({ screen: 'home' })} />
        )}

        {/* Library Tab Views */}
        {tab === 'library' && library.screen === 'hub' && (
          <LibraryScreen onOpen={openLibraryItem} />
        )}
        {tab === 'library' && library.screen === 'tasbih' && (
          <TasbihScreen onBack={() => setLibrary({ screen: 'hub' })} />
        )}
        {tab === 'library' && library.screen === 'names' && (
          <NamesScreen onBack={() => setLibrary({ screen: 'hub' })} />
        )}
        {tab === 'library' && library.screen === 'names-prophet' && (
          <NamesScreen variant="prophet" onBack={() => setLibrary({ screen: 'hub' })} />
        )}
        {tab === 'library' && library.screen === 'duas' && (
          <DuasScreen onBack={() => setLibrary({ screen: 'hub' })} />
        )}
        {tab === 'library' && library.screen === 'hadith' && (
          <HadithLibraryScreen onBack={() => setLibrary({ screen: 'hub' })} />
        )}
        {tab === 'library' && library.screen === 'ramadan-guide' && (
          <RamadanGuideScreen onBack={() => setLibrary({ screen: 'hub' })} />
        )}
        {tab === 'library' && library.screen === 'prayer-guide' && (
          <PrayerGuideScreen onBack={() => setLibrary({ screen: 'hub' })} />
        )}
        {tab === 'library' && library.screen === 'downloads' && (
          <DownloadsScreen
            onBack={() => setLibrary({ screen: 'hub' })}
            onOpenSurah={(surah) => {
              setQuran({ screen: 'reader', surah });
              setTab('quran');
            }}
          />
        )}


        {/* Tools Tab Views */}
        {tab === 'tools' && tools.screen === 'hub' && (
          <ToolsScreen onOpen={openToolsItem} />
        )}
        {tab === 'tools' && tools.screen === 'qibla' && (
          <QiblaScreen
            onBack={() => setTools({ screen: 'hub' })}
            onOpenCities={() => setTools({ screen: 'cities' })}
          />
        )}
        {tab === 'tools' && tools.screen === 'tracker' && (
          <SalahTrackerScreen onBack={() => setTools({ screen: 'hub' })} />
        )}
        {tab === 'tools' && tools.screen === 'location' && (
          <LocationScreen
            onBack={() => setTools({ screen: 'hub' })}
            onOpenCities={() => setTools({ screen: 'cities' })}
          />
        )}
        {tab === 'tools' && tools.screen === 'cities' && (
          <CitiesScreen onBack={() => setTools({ screen: 'hub' })} />
        )}
        {tab === 'tools' && (tools.screen === 'prayer-reminders' || tools.screen === 'notifications') && (
          <PrayerRemindersScreen onBack={() => setTools({ screen: 'hub' })} />
        )}
        {tab === 'tools' && tools.screen === 'fasting' && (
          <FastingScreen onBack={() => setTools({ screen: 'hub' })} />
        )}
        {tab === 'tools' && tools.screen === 'zakat' && (
          <ZakatScreen onBack={() => setTools({ screen: 'hub' })} />
        )}
        {tab === 'tools' && tools.screen === 'calendar' && (
          <CalendarScreen onBack={() => setTools({ screen: 'hub' })} />
        )}
        {tab === 'tools' && tools.screen === 'mosque' && (
          <MosqueFinderScreen
            onBack={() => setTools({ screen: 'hub' })}
            onOpenCities={() => setTools({ screen: 'cities' })}
          />
        )}

        {/* Women's Worship Views */}
        {tab === 'tools' && tools.screen === 'women-cycle' && (
          <WomenCycleScreen onBack={() => setTools({ screen: 'hub' })} />
        )}
        {tab === 'tools' && tools.screen === 'women-purity' && (
          <WomenPurityScreen onBack={() => setTools({ screen: 'hub' })} />
        )}
        {tab === 'tools' && tools.screen === 'women-guidance' && (
          <WomenGuidanceScreen onBack={() => setTools({ screen: 'hub' })} />
        )}
        {tab === 'tools' && tools.screen === 'women-qada' && (
          <WomenQadaScreen onBack={() => setTools({ screen: 'hub' })} />
        )}

        {/* Hajj & Umrah Views */}
        {tab === 'tools' && tools.screen === 'umrah-guide' && (
          <UmrahGuideScreen
            onBack={() => setTools({ screen: 'hub' })}
            onOpenDuas={() => {
              setTools({ screen: 'hub' });
              setLibrary({ screen: 'duas' });
              setTab('library');
            }}
          />
        )}
        {tab === 'tools' && tools.screen === 'umrah-resources' && (
          <UmrahResourcesScreen
            onBack={() => setTools({ screen: 'hub' })}
            onOpenDuas={() => {
              setTools({ screen: 'hub' });
              setLibrary({ screen: 'duas' });
              setTab('library');
            }}
          />
        )}
        {tab === 'tools' && tools.screen === 'hajj-journey' && (
          <HajjJourneyScreen
            onBack={() => setTools({ screen: 'hub' })}
            onOpenDuas={() => {
              setTools({ screen: 'hub' });
              setLibrary({ screen: 'duas' });
              setTab('library');
            }}
          />
        )}
        {tab === 'tools' && tools.screen === 'makkah-live' && (
          <MakkahLiveScreen onBack={() => setTools({ screen: 'hub' })} />
        )}
        {tab === 'tools' && tools.screen === 'madinah-live' && (
          <MadinahLiveScreen onBack={() => setTools({ screen: 'hub' })} />
        )}
        {tab === 'tools' && tools.screen === 'hajj-live' && (
          <HajjLiveScreen onBack={() => setTools({ screen: 'hub' })} />
        )}
      </View>
      {showMiniPlayer && playback && (
        <AudioMiniPlayer
          playback={playback}
          status={status}
          onPlayPause={onPlayPause}
          onStop={onStop}
          onOpenAudio={() => setAudioModalOpen(true)}
          onSeek={onSeek}
        />
      )}
      <TabBar active={tab} onChange={switchTab} />

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
      />
    </View>
  );
}

function SettingsModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [anim] = useState(() => new Animated.Value(0));

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
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.settingsOverlay}>
        <TouchableWithoutFeedback onPress={onClose} accessibilityLabel="Close settings">
          <View style={styles.settingsBackdrop} />
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
              { backgroundColor: colors.borderSubtle, marginTop: insets.top + 8 },
            ]}
          />
          <View
            style={[
              styles.settingsSheetContent,
              { paddingBottom: Math.max(insets.bottom, 16) + 12 },
            ]}
          >
            <SettingsScreen onClose={onClose} />
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

export default function App() {
  const [fontsLoaded, fontError] = useEditorialFonts();
  const [splashDone, setSplashDone] = useState(false);

  const handleSplashDone = useCallback(() => {
    setSplashDone(true);
  }, []);

  if (!fontsLoaded && !fontError) {
    return <View style={styles.loading} />;
  }

  return (
    <SettingsProvider>
      <ThemeProvider>
        <SafeAreaProvider>
          <Root splashDone={splashDone} />
          {!splashDone && <AnimatedSplash onDone={handleSplashDone} />}
        </SafeAreaProvider>
      </ThemeProvider>
    </SettingsProvider>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  screenWrap: { flex: 1 },
  loading: { flex: 1, backgroundColor: '#121110' },
  appHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  headerBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
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
    fontFamily: 'SourceSans3_500Medium',
    fontSize: 13,
    lineHeight: 16,
    letterSpacing: 4,
  },
  gearBtn: {
    padding: 8,
  },
  gear: {
    fontSize: 20,
  },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingBottom: 6,
    paddingTop: 4,
  },
  tabItem: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  tabLabel: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
    letterSpacing: 0.3,
  },
  tabIndicator: {
    width: 24,
    height: 2,
    borderRadius: 1,
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
    marginBottom: 6,
  },
  settingsSheetContent: {
    flex: 1,
  },
});
