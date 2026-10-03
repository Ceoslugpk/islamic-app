import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { pause, resume, stop, playNext, playPrevious, getCurrentPlayback, getPlaybackStatus } from './quranAudio';

const NOW_PLAYING_CHANNEL_ID = 'now-playing';
const NOW_PLAYING_CATEGORY_ID = 'now-playing-media';
const NOW_PLAYING_NOTIFICATION_ID = 'quran-now-playing';

const ACTION_PLAY_PAUSE = 'play-pause';
const ACTION_NEXT = 'next';
const ACTION_PREVIOUS = 'previous';
const ACTION_STOP = 'stop';

let isCategoryRegistered = false;
let isChannelConfigured = false;
let responseListener: Notifications.EventSubscription | null = null;
let currentNotificationId: string | null = null;

function getPlayPauseTitle(isPlaying: boolean): string {
  return isPlaying ? 'Pause' : 'Play';
}

function getPlayPauseIdentifier(isPlaying: boolean): string {
  return isPlaying ? ACTION_PLAY_PAUSE : ACTION_PLAY_PAUSE;
}

async function ensureCategoryRegistered(): Promise<void> {
  if (isCategoryRegistered) return;

  const actions: Notifications.NotificationAction[] = [
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

  try {
    await Notifications.setNotificationCategoryAsync(NOW_PLAYING_CATEGORY_ID, actions, {
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
    await Notifications.setNotificationChannelAsync(NOW_PLAYING_CHANNEL_ID, {
      name: 'Now Playing',
      description: 'Media playback controls for Quran audio',
      importance: Notifications.AndroidImportance.LOW,
      sound: 'default',
      vibrationPattern: [],
      lightColor: '#121110',
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: false,
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
      default:
        break;
    }
  });
}

function buildNotificationContent(
  playback: { title: string; reciterName: string; surah?: number; ayah?: number } | null,
  status: { isPlaying: boolean; positionMillis: number; durationMillis: number }
): Notifications.NotificationContentInput {
  const title = playback?.title || 'Quran Playback';
  const reciter = playback?.reciterName || 'Unknown Reciter';
  const surah = playback?.surah;
  const ayah = playback?.ayah;

  let body = reciter;
  if (surah && ayah) {
    body += ` · Surah ${surah}:${ayah}`;
  } else if (surah) {
    body += ` · Surah ${surah}`;
  }

  const progressPercent = status.durationMillis > 0
    ? Math.round((status.positionMillis / status.durationMillis) * 100)
    : 0;

  const progressText = `${Math.floor(status.positionMillis / 60000)}:${String(Math.floor((status.positionMillis % 60000) / 1000)).padStart(2, '0')} / ${Math.floor(status.durationMillis / 60000)}:${String(Math.floor((status.durationMillis % 60000) / 1000)).padStart(2, '0')} (${progressPercent}%)`;

  return {
    title,
    subtitle: reciter,
    body: `${body}\n${progressText}`,
    categoryIdentifier: NOW_PLAYING_CATEGORY_ID,
    sticky: true,
    autoDismiss: false,
    priority: Platform.OS === 'android' ? Notifications.AndroidNotificationPriority.LOW : undefined,
    color: '#121110',
    data: { nowPlaying: true },
  };
}

export async function startNowPlayingNotification(): Promise<void> {
  await ensureCategoryRegistered();
  await ensureChannelConfigured();
  setupResponseHandler();

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
  } catch (error) {
    console.warn('[nowPlayingNotification] Failed to show notification:', error);
  }
}

export async function updateNowPlayingNotification(): Promise<void> {
  const playback = getCurrentPlayback();
  const status = getPlaybackStatus();

  if (!playback) {
    await stopNowPlayingNotification();
    return;
  }

  const content = buildNotificationContent(playback, status);

  try {
    if (currentNotificationId) {
      await Notifications.dismissNotificationAsync(currentNotificationId);
    }
    currentNotificationId = await Notifications.scheduleNotificationAsync({
      content,
      trigger: null,
      identifier: NOW_PLAYING_NOTIFICATION_ID,
    });
  } catch (error) {
    console.warn('[nowPlayingNotification] Failed to update notification:', error);
  }
}

export async function stopNowPlayingNotification(): Promise<void> {
  if (currentNotificationId) {
    try {
      await Notifications.dismissNotificationAsync(currentNotificationId);
    } catch {
      // ignore
    }
    currentNotificationId = null;
  }
}

export function cleanupNowPlayingNotification(): void {
  if (responseListener) {
    responseListener.remove();
    responseListener = null;
  }
  isCategoryRegistered = false;
  isChannelConfigured = false;
}

export function registerNotificationResponseHandler(handler: (action: string) => void): () => void {
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    handler(response.actionIdentifier);
  });
  return () => subscription.remove();
}