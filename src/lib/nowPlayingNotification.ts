import * as Notifications from 'expo-notifications';
import { Platform, Linking } from 'react-native';
import {
  pause,
  resume,
  stop,
  playNext,
  playPrevious,
  seekTo,
  getCurrentPlayback,
  getPlaybackStatus,
  CurrentPlayback,
} from './quranAudio';
import {
  syncNowPlaying,
  clearNowPlaying,
  formatNowPlayingMetadata,
  ensureSystemMediaNotificationChannels,
} from './systemMediaAdapter';

const NOW_PLAYING_CHANNEL_ID = 'now-playing';
const NOW_PLAYING_CATEGORY_ID = 'now-playing-media';
const NOW_PLAYING_PAUSED_CATEGORY_ID = 'now-playing-media-paused';
const NOW_PLAYING_NOTIFICATION_ID = 'quran-now-playing';

const ACTION_PLAY_PAUSE = 'play-pause';
const ACTION_NEXT = 'next';
const ACTION_PREVIOUS = 'previous';
const ACTION_STOP = 'stop';

let isCategoryRegistered = false;
let isChannelConfigured = false;
let isHandlerConfigured = false;
let responseListener: Notifications.EventSubscription | null = null;
let currentNotificationId: string | null = null;

let lastUpdateTimestamp = 0;
let lastPlaybackTitle: string | null = null;
let lastIsPlaying: boolean | null = null;

async function hasNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    const perm = await Notifications.getPermissionsAsync();
    return perm.granted || perm.status === 'granted';
  } catch {
    return false;
  }
}

function ensureNotificationHandler(): void {
  if (isHandlerConfigured) return;
  try {
    Notifications.setNotificationHandler({
      handleNotification: async (notification) => {
        const isNowPlaying = notification?.request?.content?.data?.nowPlaying === true;
        return {
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: isNowPlaying ? false : true,
          shouldSetBadge: false,
        };
      },
    });
    isHandlerConfigured = true;
  } catch {
    // Presentation handler may be unsupported on certain platforms
  }
}

async function ensureCategoryRegistered(): Promise<void> {
  if (isCategoryRegistered) return;

  const playingActions: Notifications.NotificationAction[] = [
    {
      identifier: ACTION_PREVIOUS,
      buttonTitle: 'Previous',
      options: { opensAppToForeground: false },
    },
    {
      identifier: ACTION_PLAY_PAUSE,
      buttonTitle: 'Pause',
      options: { opensAppToForeground: false },
    },
    {
      identifier: ACTION_NEXT,
      buttonTitle: 'Next',
      options: { opensAppToForeground: false },
    },
    {
      identifier: ACTION_STOP,
      buttonTitle: 'Stop',
      options: { isDestructive: true, opensAppToForeground: false },
    },
  ];

  const pausedActions: Notifications.NotificationAction[] = [
    {
      identifier: ACTION_PREVIOUS,
      buttonTitle: 'Previous',
      options: { opensAppToForeground: false },
    },
    {
      identifier: ACTION_PLAY_PAUSE,
      buttonTitle: 'Play',
      options: { opensAppToForeground: false },
    },
    {
      identifier: ACTION_NEXT,
      buttonTitle: 'Next',
      options: { opensAppToForeground: false },
    },
    {
      identifier: ACTION_STOP,
      buttonTitle: 'Stop',
      options: { isDestructive: true, opensAppToForeground: false },
    },
  ];

  try {
    await Notifications.setNotificationCategoryAsync(NOW_PLAYING_CATEGORY_ID, playingActions, {
      showTitle: true,
      showSubtitle: true,
    });
    await Notifications.setNotificationCategoryAsync(NOW_PLAYING_PAUSED_CATEGORY_ID, pausedActions, {
      showTitle: true,
      showSubtitle: true,
    });
    isCategoryRegistered = true;
  } catch (error) {
    console.warn('[nowPlayingNotification] Failed to register notification category:', error);
  }
}

async function ensureChannelConfigured(): Promise<void> {
  if (isChannelConfigured || Platform.OS !== 'android') return;

  try {
    // Pre-warm expo-audio channel with DEFAULT importance for OriginOS/HyperOS Island
    await ensureSystemMediaNotificationChannels();

    await Notifications.setNotificationChannelAsync(NOW_PLAYING_CHANNEL_ID, {
      name: 'Now Playing',
      description: 'Media playback controls for Quran audio',
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: null,
      enableVibrate: false,
      vibrationPattern: [],
      lightColor: '#0F5A4A',
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: false,
      showBadge: false,
    });
    isChannelConfigured = true;
  } catch (error) {
    console.warn('[nowPlayingNotification] Failed to configure notification channel:', error);
  }
}

function setupResponseHandler(): void {
  if (responseListener) return;

  responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
    const actionId = response.actionIdentifier;

    switch (actionId) {
      case 'default':
      case Notifications.DEFAULT_ACTION_IDENTIFIER: {
        const playback = getCurrentPlayback();
        if (playback?.surah) {
          const ayah = playback.ayah || 1;
          Linking.openURL(`salah://quran/${playback.surah}/${ayah}`).catch(() => {});
        }
        break;
      }
      case ACTION_PLAY_PAUSE: {
        const status = getPlaybackStatus();
        if (status.isPlaying) {
          pause();
        } else {
          resume();
        }
        break;
      }
      case ACTION_NEXT: {
        playNext();
        break;
      }
      case ACTION_PREVIOUS: {
        playPrevious();
        break;
      }
      case ACTION_STOP: {
        stop(true);
        break;
      }
      case 'skipForward':
      case 'skip-forward': {
        const status = getPlaybackStatus();
        seekTo(status.positionMillis + 10000);
        break;
      }
      case 'skipBackward':
      case 'skip-backward': {
        const status = getPlaybackStatus();
        seekTo(Math.max(0, status.positionMillis - 10000));
        break;
      }
      default:
        break;
    }
  });
}

async function ensureSetup(): Promise<boolean> {
  const permitted = await hasNotificationPermission();
  if (!permitted) return false;

  await ensureCategoryRegistered();
  await ensureChannelConfigured();
  ensureNotificationHandler();
  setupResponseHandler();
  return true;
}

function buildNotificationContent(
  playback: CurrentPlayback | null,
  status: { isPlaying: boolean; positionMillis: number; durationMillis: number }
): Notifications.NotificationContentInput {
  const formatted = formatNowPlayingMetadata(playback, status as any);
  const title = formatted.title;
  const reciter = formatted.artist;

  const progressPercent = status.durationMillis > 0
    ? Math.round((status.positionMillis / status.durationMillis) * 100)
    : 0;

  const progressText = `${Math.floor(status.positionMillis / 60000)}:${String(Math.floor((status.positionMillis % 60000) / 1000)).padStart(2, '0')} / ${Math.floor(status.durationMillis / 60000)}:${String(Math.floor((status.durationMillis % 60000) / 1000)).padStart(2, '0')} (${progressPercent}%)`;

  return {
    title,
    subtitle: reciter,
    body: `${reciter}\n${progressText}`,
    categoryIdentifier: status.isPlaying ? NOW_PLAYING_CATEGORY_ID : NOW_PLAYING_PAUSED_CATEGORY_ID,
    sticky: true,
    autoDismiss: false,
    sound: false,
    priority: Platform.OS === 'android' ? Notifications.AndroidNotificationPriority.DEFAULT : undefined,
    color: '#0F5A4A',
    data: {
      nowPlaying: true,
      url: playback?.surah ? `salah://quran/${playback.surah}/${playback.ayah || 1}` : undefined,
    },
  };
}

export async function startNowPlayingNotification(): Promise<void> {
  // Ensure notification response actions are hooked
  setupResponseHandler();

  // Drive native lock screen / Control Center / Dynamic Island / MediaSession
  syncNowPlaying().catch(() => {});

  // iOS: the native MPNowPlayingInfoCenter lock-screen media controls (via
  // syncNowPlaying → player.setActiveForLockScreen) ARE the proper media
  // controls with play/pause/next/prev/seek.
  // Android: expo-audio AudioControlsService posts the native MediaStyle
  // notification (via setActiveForLockScreen).
  // On both native platforms, scheduling an additional expo-notifications
  // banner creates a duplicate notification. We explicitly dismiss any legacy/duplicate
  // banner and never schedule a banner on native.
  if (Platform.OS === 'android' || Platform.OS === 'ios') {
    try {
      await Notifications.dismissNotificationAsync(NOW_PLAYING_NOTIFICATION_ID);
    } catch {}
    return;
  }

  const ready = await ensureSetup();
  if (!ready) return;

  const playback = getCurrentPlayback();
  const status = getPlaybackStatus();

  if (!playback) return;

  const content = buildNotificationContent(playback, status);

  try {
    currentNotificationId = await Notifications.scheduleNotificationAsync({
      content,
      trigger: null,
      identifier: NOW_PLAYING_NOTIFICATION_ID,
    });
    lastUpdateTimestamp = Date.now();
    lastPlaybackTitle = playback.title;
    lastIsPlaying = status.isPlaying;
  } catch (error) {
    console.warn('[nowPlayingNotification] Failed to show notification:', error);
  }
}

export async function updateNowPlayingNotification(): Promise<void> {
  // Drive native lock screen / Control Center / Dynamic Island / MediaSession
  syncNowPlaying().catch(() => {});

  // iOS & Android: native Now Playing and MediaStyle handle controls and progress — no banner updates.
  if (Platform.OS === 'android' || Platform.OS === 'ios') {
    return;
  }

  const playback = getCurrentPlayback();
  const status = getPlaybackStatus();

  if (!playback) {
    await stopNowPlayingNotification();
    return;
  }

  const ready = await ensureSetup();
  if (!ready) return;

  const now = Date.now();
  const playbackTitle = playback.title;
  const isPlaying = status.isPlaying;

  const titleChanged = lastPlaybackTitle !== playbackTitle;
  const isPlayingChanged = lastIsPlaying !== isPlaying;
  const timeSinceLastUpdate = now - lastUpdateTimestamp;

  // Always update immediately if track changed or play/pause state changed.
  // Throttle progress updates to at most once per second during playback.
  if (currentNotificationId && !titleChanged && !isPlayingChanged && timeSinceLastUpdate < 1000) {
    return;
  }

  const content = buildNotificationContent(playback, status);

  try {
    currentNotificationId = await Notifications.scheduleNotificationAsync({
      content,
      trigger: null,
      identifier: NOW_PLAYING_NOTIFICATION_ID,
    });
    lastUpdateTimestamp = now;
    lastPlaybackTitle = playbackTitle;
    lastIsPlaying = isPlaying;
  } catch (error) {
    console.warn('[nowPlayingNotification] Failed to update notification:', error);
  }
}

export async function stopNowPlayingNotification(): Promise<void> {
  clearNowPlaying().catch(() => {});
  if (Platform.OS !== 'web') {
    try {
      await Notifications.dismissNotificationAsync(NOW_PLAYING_NOTIFICATION_ID);
    } catch {
      // ignore
    }
  }
  currentNotificationId = null;
  lastPlaybackTitle = null;
  lastIsPlaying = null;
  lastUpdateTimestamp = 0;
}

export function cleanupNowPlayingNotification(): void {
  clearNowPlaying().catch(() => {});
  if (responseListener) {
    try {
      responseListener.remove();
    } catch {
      // ignore
    }
    responseListener = null;
  }
  isCategoryRegistered = false;
  isChannelConfigured = false;
  isHandlerConfigured = false;
  currentNotificationId = null;
  lastPlaybackTitle = null;
  lastIsPlaying = null;
  lastUpdateTimestamp = 0;
}

export function registerNotificationResponseHandler(handler: (action: string) => void): () => void {
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    handler(response.actionIdentifier);
  });
  return () => subscription.remove();
}