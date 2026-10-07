import { Appearance, Platform, Linking } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Notifications from 'expo-notifications';
import type { AudioMetadata, AudioLockScreenOptions } from 'expo-audio';
import { SURAHS_114 } from './surahs114';
import {
  addPlaybackStatusListener,
  addSoundCreatedListener,
  CurrentPlayback,
  getCurrentAudioPlayer,
  getCurrentPlayback,
  getPlaybackStatus,
  getRate,
  pause,
  PlaybackStatus,
  playNext,
  playPrevious,
  resume,
  seekTo,
  stop,
} from './quranAudio';

export interface SystemMediaMetadata {
  title: string;
  arabicTitle?: string;
  reciter: string;
  artworkUrl?: string;
  durationMillis?: number;
  positionMillis?: number;
  isPlaying?: boolean;
  rate?: number;
  surah?: number;
  ayah?: number;
}

export type RemoteMediaCommand =
  | 'play'
  | 'pause'
  | 'toggle'
  | 'next'
  | 'previous'
  | 'seek'
  | 'stop'
  | 'skipForward'
  | 'skipBackward';

// Embedded offline base64 logos (584 bytes & 1.7 KB) from assets/logo-small-black.png & assets/logo-small-ivory.png
const LOGO_SMALL_BLACK_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAYAAADDPmHLAAACD0lEQVR4nO3cvU7DQBAA4Q2iRBS8/zOmiNJDA5IJFiA72R/PfDVS7rxzlzQmQpIkSRLLqXoBmd5eX96zP/N8ubZ+xq0Xt1fFwH/TMYZ2C9qr29DXdAqhzUL2mDD0NR1CKF/AHlMHv1QdwcgAjjD4pcoInqo+eKujDT+idk9jboAjDv5WxU0w4gYgDD+iZp/tA6AMv0rrAIjDz95z2wCIw6/QMgD68DP33y4A+vCztQrA4edrE4DD/y7rebQIwOHXKQ/A4dcqD0C1SgPw9NfzBoArC8DT30NJAA6/D78C4AwALj0Ar/9evAHgUgPw9PfjDQBnAHBpAXj99+QNAGcAcAYA91y9gAluX9k60u+ZlHfRpj6wv97Ve/S+Mt4V9AZY8d8H//V3UwOP8DfAD1tOXfU/edjDABYmD3IrA7iTqfEYAJwBfJp6gvcygDuaGJEBwBkAnAHAGQCcAcAZAJwBwBkAnAHAGQCcAcAZAJwBwBkAnAHAGQCcAcAZAJwBwBkAnAHAGQCcAcAZAJwBwBkAnAHAGQCcAcAZAJwBwBkAnAHAGQCcAcAZAJwBwBkAnAHAGQCcAcAZAJwBwBkAnAHAGQCcAcAZAJwBwBkAnAHAGQCcAcAZAJwBwBkAnAHAGQCcAcAZAJwBwBkAnAHAGQCcAUTE+XI9Va9BkiRJkiTp0T4ANDddO/tjZeEAAAAASUVORK5CYII=';

const LOGO_SMALL_IVORY_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAYAAADDPmHLAAAABmJLR0QA/wD/AP+gvaeTAAABJ0lEQVR4nO3bQW6EQBAEwPv/R94F45BYFpWkrh4f6Ekyy20PMAAAAABJRU5ErkJggg==';

let cachedArtworkLightUri: string | null = null;
let cachedArtworkDarkUri: string | null = null;
let isArtworkPreparing = false;

// Quran ayah artwork from AlQuran Cloud CDN (already the app's audio source).
// Real page images make the lock screen + vivo OriginOS Origin/Atomic Island
// media card render rich artwork (the island themes itself around artwork).
const QURAN_IMAGE_CDN = 'https://cdn.islamic.network/quran/images';

/**
 * Resolves a stable local file:// URI for the CURRENT playing ayah's Quran
 * page image (e.g. 2_255.png). Downloads once, caches on disk, falls back
 * to the embedded logo when offline / the CDN is unreachable.
 */
export async function getOrPrepareQuranArtworkUri(
  playback?: { surah?: number; ayah?: number } | null
): Promise<string | null> {
  const surah = playback?.surah;
  const ayah = playback?.ayah || 1; // Support full surah mode too by using ayah 1
  if (!surah) return null;

  const filename = `quran_artwork_${surah}_${ayah}.png`;
  const fileUri = `${FileSystem.cacheDirectory}${filename}`;

  try {
    const info = await FileSystem.getInfoAsync(fileUri);
    if (info.exists && info.size > 0) return fileUri;

    const remote = `${QURAN_IMAGE_CDN}/${surah}_${ayah}.png`;
    const dl = await FileSystem.downloadAsync(remote, fileUri);
    if (dl.status === 200) return fileUri;
    return null;
  } catch {
    return null; // offline / blocked — caller falls back to the logo
  }
}

/**
 * Prepares and resolves a stable local offline file:// URI for artwork.
 * Both Android ExoPlayer / MediaSession and iOS MPNowPlayingInfoCenter
 * reliably decode local file:// URIs offline with zero network dependency.
 */
export async function getOrPrepareArtworkUri(preferredDark?: boolean): Promise<string | null> {
  const isDark = preferredDark ?? Appearance.getColorScheme() === 'dark';

  if (Platform.OS === 'web') {
    return isDark ? '/assets/logo-small-ivory.png' : '/assets/logo-small-black.png';
  }

  const cached = isDark ? cachedArtworkDarkUri : cachedArtworkLightUri;
  if (cached) return cached;

  if (isArtworkPreparing) {
    return isDark ? cachedArtworkDarkUri : cachedArtworkLightUri;
  }

  isArtworkPreparing = true;
  try {
    const filename = isDark ? 'quran_player_logo_dark.png' : 'quran_player_logo_light.png';
    const fileUri = `${FileSystem.cacheDirectory}${filename}`;

    const info = await FileSystem.getInfoAsync(fileUri);
    if (!info.exists || info.size === 0) {
      const data = isDark ? LOGO_SMALL_IVORY_BASE64 : LOGO_SMALL_BLACK_BASE64;
      await FileSystem.writeAsStringAsync(fileUri, data, {
        encoding: FileSystem.EncodingType.Base64,
      });
    }

    if (isDark) {
      cachedArtworkDarkUri = fileUri;
    } else {
      cachedArtworkLightUri = fileUri;
    }
    return fileUri;
  } catch {
    return null;
  } finally {
    isArtworkPreparing = false;
  }
}

export function getShortReciterName(reciterName?: string, identifier?: string): string {
  if (identifier) {
    const idLower = identifier.toLowerCase();
    if (idLower.includes('alafasy') || idLower.includes('afasy')) return 'Alafasy';
    if (idLower.includes('minshawi')) return 'Al-Minshawi';
    if (idLower.includes('husary') || idLower.includes('hussary')) return 'Al-Husary';
    if (idLower.includes('abdulbasit') || idLower.includes('abdul_basit') || idLower.includes('basit')) return 'Abdul Basit';
    if (idLower.includes('ghamadi')) return 'Al-Ghamadi';
    if (idLower.includes('shuraym') || idLower.includes('shuraim')) return 'Al-Shuraym';
    if (idLower.includes('sudais')) return 'Al-Sudais';
    if (idLower.includes('ajamy') || idLower.includes('ajmi')) return 'Al-Ajamy';
    if (idLower.includes('rifai')) return 'Al-Rifai';
  }
  if (!reciterName) return 'Arabic';
  const nameLower = reciterName.toLowerCase();
  if (nameLower.includes('alafasy') || nameLower.includes('al-afasy')) return 'Alafasy';
  if (nameLower.includes('minshawi')) return 'Al-Minshawi';
  if (nameLower.includes('husary') || nameLower.includes('hussary')) return 'Al-Husary';
  if (nameLower.includes('abdulbasit') || nameLower.includes('abdul basit')) return 'Abdul Basit';
  if (nameLower.includes('ghamadi')) return 'Al-Ghamadi';
  if (nameLower.includes('shuraym') || nameLower.includes('shuraim')) return 'Al-Shuraym';
  if (nameLower.includes('sudais')) return 'Al-Sudais';
  if (nameLower.includes('ajamy') || nameLower.includes('ajmi')) return 'Al-Ajamy';
  if (nameLower.includes('rifai')) return 'Al-Rifai';

  const parts = reciterName.trim().split(/\s+/);
  if (parts.length > 2) {
    return parts[parts.length - 1];
  }
  return reciterName;
}

/**
 * Formats Quran playback metadata honoring both English and Arabic titles:
 * - Ayah Arabic: "Surah Al-Fatihah · الفَاتِحة — Ayah 1 (Arabic)", artist: reciter, album: "سُورَةُ الفَاتِحة · Surah Al-Fatihah"
 * - Ayah Translation: "Surah Al-Fatihah · الفَاتِحة — Translation (English) · Ayah 1", artist: reciter
 * - Surah Arabic: "Surah Al-Fatihah · الفَاتِحة — Arabic (Alafasy)", album: "The Noble Quran · القران الكريم"
 * - Surah Translation: "Surah Al-Fatihah · الفَاتِحة — Translation (English)"
 * - Custom: preserves title from CurrentPlayback
 */
export function formatNowPlayingMetadata(
  playback: CurrentPlayback | null,
  status?: PlaybackStatus
): {
  title: string;
  artist: string;
  albumTitle: string;
  surahEnglishName?: string;
  surahArabicName?: string;
} {
  if (!playback) {
    return {
      title: 'The Holy Quran',
      artist: 'Quran Audio',
      albumTitle: 'Islamic',
    };
  }

  const reciter = playback.reciterName || 'Quran Reciter';
  const surahNum = playback.surah;
  const ayahNum = playback.ayah;

  if (surahNum && surahNum >= 1 && surahNum <= 114) {
    const surahMeta = SURAHS_114[surahNum - 1];
    const engName = surahMeta?.englishName || `Surah ${surahNum}`;
    const arName = surahMeta?.name || '';
    const baseSurah = arName ? `Surah ${engName} · ${arName}` : `Surah ${engName}`;

    // Translation segment (either single ayah or whole surah)
    if (playback.segmentType === 'translation') {
      const lang = playback.translationLang || 'English';
      const ayahBadge = ayahNum ? ` · Ayah ${ayahNum}` : '';
      return {
        title: `${baseSurah} — Translation (${lang})${ayahBadge}`,
        artist: reciter,
        albumTitle: arName ? `سُورَةُ ${arName} · Surah ${engName}` : `Surah ${engName}`,
        surahEnglishName: engName,
        surahArabicName: arName,
      };
    }

    // Ayah playback (Arabic)
    if (playback.type === 'ayah' && ayahNum) {
      return {
        title: `${baseSurah} — Ayah ${ayahNum} (Arabic)`,
        artist: reciter,
        albumTitle: arName ? `سُورَةُ ${arName} · Surah ${engName}` : `Surah ${engName}`,
        surahEnglishName: engName,
        surahArabicName: arName,
      };
    }

    // Full Surah playback (Arabic)
    const shortReciter = getShortReciterName(reciter, playback.identifier);
    return {
      title: `${baseSurah} — Arabic (${shortReciter})`,
      artist: reciter,
      albumTitle: 'The Noble Quran · القران الكريم',
      surahEnglishName: engName,
      surahArabicName: arName,
    };
  }

  // Non-Quran / custom items (e.g. 99 Names)
  return {
    title: playback.title || 'Quran Audio',
    artist: reciter,
    albumTitle: 'Islamic',
  };
}

let lastActivePlayerId: string | null = null;
let lastSyncedTitle: string | null = null;
let lastSyncedArtist: string | null = null;
let lastSyncedArtwork: string | null = null;

/**
 * The AudioPlayer instance whose lock-screen controls / MediaStyle notification
 * are currently active. Guarding on the INSTANCE (not just the id) prevents
 * `setActiveForLockScreen(true, ...)` from being re-invoked on every status
 * tick after a metadata-only re-sync — which would re-post the native MediaStyle
 * notification repeatedly (blinking) and eventually crash the MediaSession.
 */
let lastActivePlayer: { id: string } | null = null;

/**
 * Whether the native lock-screen controls / MediaStyle notification are
 * currently SHOWN. `clearNowPlaying()` removes the notification, so this goes
 * false and the next sync MUST re-activate (updateLockScreenMetadata is a
 * no-op on a cleared notification). Only differs from lastActivePlayer when
 * the notification was dismissed but the player instance survives.
 */
let isLockScreenActive = false;

/**
 * Pushes Now Playing metadata (title, reciter, artwork, duration, position, playing)
 * to the platform's native surface:
 * - iOS: AVPlayer -> MPNowPlayingInfoCenter + MPRemoteCommandCenter (Lock screen, Control Center, Dynamic Island)
 * - Android: ExoPlayer -> MediaSession + MediaStyle Foreground Notification (Lock screen, Notification Shade)
 * - Web: HTML5 navigator.mediaSession
 */
export async function syncNowPlaying(meta?: Partial<SystemMediaMetadata>): Promise<void> {
  const playback = getCurrentPlayback();
  const player = getCurrentAudioPlayer();
  const status = getPlaybackStatus();

  if (!playback) {
    await clearNowPlaying();
    return;
  }

  const formatted = formatNowPlayingMetadata(playback, status);
  const title = meta?.title || formatted.title;
  const artist = meta?.reciter || formatted.artist;
  const albumTitle = meta?.arabicTitle || formatted.albumTitle;
  const isPlaying = meta?.isPlaying ?? status.isPlaying;
  // For external surfaces like OriginOS Island / SystemUI that cannot read app internal file:// URIs,
  // we pass the public HTTPS CDN URL so the system can resolve the image directly.
  // We also trigger local background caching via getOrPrepareQuranArtworkUri so offline fallback works.
  const surah = playback.surah;
  const ayah = playback.ayah || 1;
  const cdnArtworkUrl = surah ? `${QURAN_IMAGE_CDN}/${surah}_${ayah}.png` : null;

  // Background warm local file cache
  getOrPrepareQuranArtworkUri(playback).catch(() => null);

  const localArtworkUri = await getOrPrepareQuranArtworkUri(playback).catch(() => null);
  const fallbackLogoUri = await getOrPrepareArtworkUri();

  const artworkUri = meta?.artworkUrl || cdnArtworkUrl || localArtworkUri || fallbackLogoUri;

  // Web platform
  if (Platform.OS === 'web') {
    if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
      try {
        navigator.mediaSession.metadata = new (window as any).MediaMetadata({
          title,
          artist,
          album: albumTitle,
          artwork: artworkUri ? [{ src: artworkUri, sizes: '128x128', type: 'image/png' }] : [],
        });
        navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
        if (status.durationMillis > 0) {
          navigator.mediaSession.setPositionState?.({
            duration: status.durationMillis / 1000,
            playbackRate: getRate(),
            position: Math.min(status.durationMillis / 1000, status.positionMillis / 1000),
          });
        }
      } catch {
        // non-fatal web MediaMetadata error
      }
    }
    return;
  }

  // Native platforms (iOS & Android via expo-audio AudioPlayer)
  if (player) {
    try {
      const audioMetadata: AudioMetadata = {
        title,
        artist,
        albumTitle,
        artworkUrl: artworkUri || undefined,
      };
      const options: AudioLockScreenOptions = {
        showSeekForward: true,
        showSeekBackward: true,
      };

      const isSamePlayer = Boolean(
        player.id &&
        lastActivePlayer &&
        player.id === lastActivePlayer.id &&
        player === lastActivePlayer
      );

      if (isSamePlayer && isLockScreenActive) {
        // Player already active AND notification currently shown — update metadata in place
        const isMetadataSame =
          lastSyncedTitle === title &&
          lastSyncedArtist === artist &&
          lastSyncedArtwork === (artworkUri || null);
        if (!isMetadataSame) {
          player.updateLockScreenMetadata(audioMetadata);
          lastSyncedTitle = title;
          lastSyncedArtist = artist;
          lastSyncedArtwork = artworkUri || null;
        }
      } else {
        // New player, or the notification was dismissed (pause/finish) —
        // (re)activate lock screen controls and re-post the notification once.
        player.setActiveForLockScreen(true, audioMetadata, options);
        lastActivePlayerId = player.id || 'active';
        lastActivePlayer = player;
        isLockScreenActive = true;
        lastSyncedTitle = title;
        lastSyncedArtist = artist;
        lastSyncedArtwork = artworkUri || null;
      }
    } catch {
      // non-fatal native lock screen sync error
    }
  }
}

/**
 * Clears the active lock screen controls and Now Playing presentation
 * when playback finishes or stops.
 */
export async function clearNowPlaying(): Promise<void> {
  const player = getCurrentAudioPlayer();
  // The notification/now-playing is being removed — mark inactive so the next
  // sync re-activates (updateLockScreenMetadata is a no-op on a cleared
  // notification). Keep lastActivePlayer so a SAME-instance metadata re-sync
  // (e.g. an unrelated status tick) does NOT re-post while the notification
  // is still up — that re-post storm is the blink/crash bug.
  isLockScreenActive = false;
  lastSyncedTitle = null;
  lastSyncedArtist = null;
  lastSyncedArtwork = null;

  try {
    await Notifications.dismissNotificationAsync('quran-now-playing');
  } catch {}

  if (Platform.OS === 'web') {
    if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
      try {
        navigator.mediaSession.metadata = null;
        navigator.mediaSession.playbackState = 'none';
      } catch {}
    }
    return;
  }

  if (player) {
    try {
      player.clearLockScreenControls();
    } catch {}
  }
}

let lastProgressThrottle = 0;

/**
 * Updates progress (position, duration, playing state) from the existing PlaybackStatus listener.
 * Reuses the 250ms update interval from quranAudio without introducing extra timers.
 */
export function updateProgress(
  positionMillis: number,
  durationMillis: number,
  isPlaying: boolean
): void {
  const playback = getCurrentPlayback();
  if (!playback) {
    clearNowPlaying().catch(() => {});
    return;
  }

  const now = Date.now();
  if (now - lastProgressThrottle < 250) {
    return;
  }
  lastProgressThrottle = now;

  if (Platform.OS === 'web') {
    if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
      try {
        navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
        if (durationMillis > 0) {
          navigator.mediaSession.setPositionState?.({
            duration: durationMillis / 1000,
            playbackRate: getRate(),
            position: Math.min(durationMillis / 1000, positionMillis / 1000),
          });
        }
      } catch {}
    }
  }
  // On iOS and Android:
  // AVPlayer & ExoPlayer status updates (250ms tick) automatically push elapsed time
  // and duration to MPNowPlayingInfoCenter & MediaSession through expo-audio's native layer.
}

/**
 * Routes remote commands (play/pause/seek/next/prev from lock screen,
 * Control Center, notification shade, headset, or Bluetooth) back to
 * existing quranAudio functions.
 */
export async function handleRemoteCommand(
  command: RemoteMediaCommand,
  param?: number
): Promise<boolean> {
  const status = getPlaybackStatus();

  switch (command) {
    case 'play':
      await resume();
      return true;

    case 'pause':
      await pause();
      return true;

    case 'toggle':
      if (status.isPlaying) {
        await pause();
      } else {
        await resume();
      }
      return true;

    case 'next':
      return await playNext();

    case 'previous':
      return await playPrevious();

    case 'seek':
      if (typeof param === 'number' && !isNaN(param)) {
        await seekTo(param);
        return true;
      }
      return false;

    case 'skipForward': {
      const step = typeof param === 'number' ? param : 10000;
      const target = status.positionMillis + step;
      await seekTo(target);
      return true;
    }

    case 'skipBackward': {
      const step = typeof param === 'number' ? param : 10000;
      const target = Math.max(0, status.positionMillis - step);
      await seekTo(target);
      return true;
    }

    case 'stop':
      await stop(true);
      return true;

    default:
      return false;
  }
}

/**
 * Configures web MediaSession action handlers (play, pause, stop, seekto, seekforward, seekbackward, previoustrack, nexttrack).
 */
function setupWebMediaSessionHandlers(): void {
  if (Platform.OS !== 'web' || typeof navigator === 'undefined' || !('mediaSession' in navigator)) {
    return;
  }

  try {
    navigator.mediaSession.setActionHandler('play', () => {
      handleRemoteCommand('play').catch(() => {});
    });
    navigator.mediaSession.setActionHandler('pause', () => {
      handleRemoteCommand('pause').catch(() => {});
    });
    navigator.mediaSession.setActionHandler('stop', () => {
      handleRemoteCommand('stop').catch(() => {});
    });
    navigator.mediaSession.setActionHandler('seekto', (details: any) => {
      if (typeof details?.seekTime === 'number') {
        handleRemoteCommand('seek', details.seekTime * 1000).catch(() => {});
      }
    });
    navigator.mediaSession.setActionHandler('seekforward', (details: any) => {
      handleRemoteCommand('skipForward', (details?.seekOffset || 10) * 1000).catch(() => {});
    });
    navigator.mediaSession.setActionHandler('seekbackward', (details: any) => {
      handleRemoteCommand('skipBackward', (details?.seekOffset || 10) * 1000).catch(() => {});
    });
    navigator.mediaSession.setActionHandler('nexttrack', () => {
      handleRemoteCommand('next').catch(() => {});
    });
    navigator.mediaSession.setActionHandler('previoustrack', () => {
      handleRemoteCommand('previous').catch(() => {});
    });
  } catch {
    // ignore web mediaSession handler registration errors
  }
}

/**
 * Handles external notification response actions (headset / Bluetooth / notification triggers)
 * routing them back to the existing player.
 */
function setupNotificationResponseHandler(): () => void {
  if (Platform.OS === 'web') return () => {};
  try {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const actionId = response.actionIdentifier;
      if (actionId === 'play-pause') {
        handleRemoteCommand('toggle').catch(() => {});
      } else if (actionId === 'next') {
        handleRemoteCommand('next').catch(() => {});
      } else if (actionId === 'previous') {
        handleRemoteCommand('previous').catch(() => {});
      } else if (actionId === 'stop') {
        handleRemoteCommand('stop').catch(() => {});
      } else if (actionId === 'default' || actionId === Notifications.DEFAULT_ACTION_IDENTIFIER) {
        const playback = getCurrentPlayback();
        if (playback?.surah) {
          const ayah = playback.ayah || 1;
          Linking.openURL(`salah://quran/${playback.surah}/${ayah}`).catch(() => {});
        }
      }
    });
    return () => sub.remove();
  } catch {
    return () => {};
  }
}

let isAdapterInitialized = false;
let adapterCleanup: (() => void) | null = null;

/**
 * Ensures system media notification channels are pre-configured on Android with DEFAULT
 * importance so vivo OriginOS Origin/Atomic Island, HyperOS Island, and Android MediaStyle
 * treat the session as active foreground media (not filtered as silent LOW importance).
 */
export async function ensureSystemMediaNotificationChannels(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    await Notifications.setNotificationChannelAsync('expo_audio_channel', {
      name: 'Quran Audio Player',
      description: 'Media playback and lock screen controls',
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: null,
      enableVibrate: false,
      vibrationPattern: [],
      lightColor: '#0F5A4A',
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: false,
      showBadge: false,
    });

    await Notifications.setNotificationChannelAsync('now-playing', {
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
  } catch {
    // Non-fatal
  }
}

/**
 * Subscribes ONCE to quranAudio singleton state so the adapter tracks
 * play/pause/stop/seek/rate/surah-change automatically. Safe for initial bundle evaluation
 * (no native module calls during module evaluation).
 */
export function initSystemMediaAdapter(): () => void {
  if (isAdapterInitialized && adapterCleanup) {
    return adapterCleanup;
  }

  isAdapterInitialized = true;

  // 1. Listen for whenever a new sound instance is created / replaced in quranAudio
  const unsubSoundCreated = addSoundCreatedListener((_sound) => {
    syncNowPlaying().catch(() => {});
  });

  // 2. Listen for playback status changes (250ms ticks, play, pause, seek, completion)
  const unsubStatus = addPlaybackStatusListener((status) => {
    const current = getCurrentPlayback();
    if (!current || (!status.isPlaying && !status.isBuffering && status.didJustFinish)) {
      clearNowPlaying().catch(() => {});
      return;
    }
    if (status.isPlaying || status.isLoaded) {
      updateProgress(status.positionMillis, status.durationMillis, status.isPlaying);
    }
  });

  // 3. Web MediaSession handlers
  setupWebMediaSessionHandlers();

  // 4. Notification response listener
  const unsubNotifications = setupNotificationResponseHandler();

  // 5. Pre-warm media notification channels for OriginOS / lock screen integration
  ensureSystemMediaNotificationChannels().catch(() => {});

  // 6. Pre-warm artwork in cache asynchronously
  getOrPrepareArtworkUri(false).catch(() => {});
  getOrPrepareArtworkUri(true).catch(() => {});

  // 7. If playback is already active at call time, sync immediately
  const existingPlayback = getCurrentPlayback();
  if (existingPlayback) {
    syncNowPlaying().catch(() => {});
  }

  adapterCleanup = () => {
    unsubSoundCreated();
    unsubStatus();
    unsubNotifications();
    isAdapterInitialized = false;
    adapterCleanup = null;
  };

  return adapterCleanup;
}

// Auto-initialize once on module load.
// Uses only JS listeners (safe during bundle evaluation, no native calls).
initSystemMediaAdapter();
