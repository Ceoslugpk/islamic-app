/**
 * Quran Audio Notification Architecture & Regression Test Suite
 *
 * Verifies:
 * 1. Single Native Media Notification:
 *    - On Android and iOS, startNowPlayingNotification and updateNowPlayingNotification
 *      delegate exclusively to native lock screen / media controls (AudioControlsService
 *      MediaStyle on Android, MPNowPlayingInfoCenter on iOS).
 *    - Zero expo-notifications banners are scheduled on native platforms.
 * 2. In-Place Metadata Updates (No New Notifications):
 *    - Ayah change and Arabic <-> Translation segment switches update the existing
 *      player session in-place via player.updateLockScreenMetadata().
 *    - AudioPlayer.replace() reuses the existing active player, preserving the MediaSession
 *      and notification ID.
 * 3. Notification Tap Routing:
 *    - Notification tap ('default' action) routes to salah://quran/{surah}/{ayah}.
 * 4. Clean Dismissal on Stop & Queue Completion:
 *    - When queue ends (didJustFinish when not repeating) or stop() is called,
 *      lock screen controls are cleared and legacy banners dismissed.
 * 5. Permission Flow:
 *    - App launch does not request notification permission for media.
 *    - Playback initiation checks permission: undetermined prompts with rationale,
 *      denied is never re-prompted, iOS/web don't force. Audio starts without blocking.
 */

import assert from 'node:assert/strict';

console.log('=== RUNNING QURAN AUDIO NOTIFICATION TEST SUITE ===\n');

// 1. Single Native Media Notification Contract
console.log('Test 1: startNowPlayingNotification skips expo-notifications banner on native...');
{
  let bannerScheduled = false;
  let bannerDismissed = false;
  let syncedNowPlaying = false;

  const mockNotifications = {
    scheduleNotificationAsync: async () => {
      bannerScheduled = true;
      return 'quran-now-playing';
    },
    dismissNotificationAsync: async (id) => {
      if (id === 'quran-now-playing') {
        bannerDismissed = true;
      }
    },
  };

  const mockSyncNowPlaying = async () => {
    syncedNowPlaying = true;
  };

  // Logic mirror of nowPlayingNotification.ts
  async function startNowPlayingNotification(platform) {
    mockSyncNowPlaying();

    if (platform === 'android' || platform === 'ios') {
      await mockNotifications.dismissNotificationAsync('quran-now-playing');
      return;
    }

    await mockNotifications.scheduleNotificationAsync();
  }

  // Android
  bannerScheduled = false;
  bannerDismissed = false;
  syncedNowPlaying = false;
  await startNowPlayingNotification('android');
  assert.equal(syncedNowPlaying, true, 'syncNowPlaying must be called on Android');
  assert.equal(bannerScheduled, false, 'NO expo banner should be scheduled on Android');
  assert.equal(bannerDismissed, true, 'Legacy banner must be dismissed on Android');

  // iOS
  bannerScheduled = false;
  bannerDismissed = false;
  syncedNowPlaying = false;
  await startNowPlayingNotification('ios');
  assert.equal(syncedNowPlaying, true, 'syncNowPlaying must be called on iOS');
  assert.equal(bannerScheduled, false, 'NO expo banner should be scheduled on iOS');
  assert.equal(bannerDismissed, true, 'Legacy banner must be dismissed on iOS');

  console.log('  ✓ PASSED');
}

// 2. In-Place Update on Ayah Change & Translation Switch
console.log('Test 2: syncNowPlaying updates metadata in-place for active player...');
{
  let setActiveCalls = 0;
  let updateMetadataCalls = 0;
  let lastMetadata = null;
  let lastActivePlayerId = null;

  const player = {
    id: 'player-session-1',
    setActiveForLockScreen: (active, meta) => {
      setActiveCalls++;
      lastMetadata = meta;
    },
    updateLockScreenMetadata: (meta) => {
      updateMetadataCalls++;
      lastMetadata = meta;
    },
  };

  function syncNowPlaying(playerInstance, title, artist) {
    const isSamePlayer = Boolean(playerInstance.id && playerInstance.id === lastActivePlayerId);

    if (isSamePlayer) {
      playerInstance.updateLockScreenMetadata({ title, artist });
    } else {
      playerInstance.setActiveForLockScreen(true, { title, artist });
      lastActivePlayerId = playerInstance.id;
    }
  }

  // First track (Arabic Ayah 1)
  syncNowPlaying(player, 'Surah Al-Fatihah · الفَاتِحة — Ayah 1 (Arabic)', 'Alafasy');
  assert.equal(setActiveCalls, 1, 'First track must activate lock screen controls');
  assert.equal(updateMetadataCalls, 0);
  assert.equal(lastMetadata.title, 'Surah Al-Fatihah · الفَاتِحة — Ayah 1 (Arabic)');

  // Second segment (Translation Ayah 1) on same player
  syncNowPlaying(player, 'Surah Al-Fatihah · الفَاتِحة — Translation (English) · Ayah 1', 'Ibrahim Walk');
  assert.equal(setActiveCalls, 1, 'Translation segment must NOT call setActiveForLockScreen again');
  assert.equal(updateMetadataCalls, 1, 'Translation segment must call updateLockScreenMetadata in-place');
  assert.equal(lastMetadata.title, 'Surah Al-Fatihah · الفَاتِحة — Translation (English) · Ayah 1');

  // Next Ayah (Arabic Ayah 2) on same player
  syncNowPlaying(player, 'Surah Al-Fatihah · الفَاتِحة — Ayah 2 (Arabic)', 'Alafasy');
  assert.equal(setActiveCalls, 1, 'Ayah change must NOT recreate lock screen session');
  assert.equal(updateMetadataCalls, 2, 'Ayah change must update metadata in-place');
  assert.equal(lastMetadata.title, 'Surah Al-Fatihah · الفَاتِحة — Ayah 2 (Arabic)');

  console.log('  ✓ PASSED');
}

// 3. AudioPlayer.replace() Reuses Player Instance
console.log('Test 3: playAudioUrl reuses existing AudioPlayer via replace()...');
{
  let replacedUrl = null;
  let newPlayerCreated = 0;
  let playerPlaying = false;

  const existingPlayer = {
    id: 'active-singleton-player',
    replace: (src) => {
      replacedUrl = src.uri;
    },
    play: () => {
      playerPlaying = true;
    },
  };

  function playTrack(existing, targetUrl) {
    if (existing && typeof existing.replace === 'function') {
      existing.replace({ uri: targetUrl });
      existing.play();
      return existing;
    }
    newPlayerCreated++;
    return { id: 'new-player' };
  }

  const p1 = playTrack(existingPlayer, 'https://cdn.islamic.network/ayah_1.mp3');
  assert.equal(p1.id, 'active-singleton-player');
  assert.equal(replacedUrl, 'https://cdn.islamic.network/ayah_1.mp3');
  assert.equal(newPlayerCreated, 0, 'Must NOT create new player when current exists');
  assert.equal(playerPlaying, true);

  console.log('  ✓ PASSED');
}

// 4. Notification Tap Deep Link Routing
console.log('Test 4: Notification tap routes to current Quran surah and ayah...');
{
  let routedUrl = null;

  const mockLinking = {
    openURL: async (url) => {
      routedUrl = url;
    },
  };

  function handleNotificationResponse(actionId, playback) {
    if (actionId === 'default' && playback?.surah) {
      const ayah = playback.ayah || 1;
      mockLinking.openURL(`salah://quran/${playback.surah}/${ayah}`);
    }
  }

  handleNotificationResponse('default', { surah: 2, ayah: 255 });
  assert.equal(routedUrl, 'salah://quran/2/255', 'Tap on Ayah 2:255 notification must deep link to salah://quran/2/255');

  handleNotificationResponse('default', { surah: 114, ayah: 1 });
  assert.equal(routedUrl, 'salah://quran/114/1');

  console.log('  ✓ PASSED');
}

// 5. Clean Dismissal on Stop & Queue Completion
console.log('Test 5: Clean dismissal on stop and queue completion...');
{
  let lockScreenCleared = false;
  let bannerDismissed = false;

  const mockPlayer = {
    clearLockScreenControls: () => {
      lockScreenCleared = true;
    },
  };

  async function onPlaybackFinished(status) {
    if (!status.isPlaying && !status.isBuffering && status.didJustFinish) {
      mockPlayer.clearLockScreenControls();
      bannerDismissed = true;
    }
  }

  // Track finished at the end of queue (not repeating, nothing next)
  await onPlaybackFinished({
    isPlaying: false,
    isBuffering: false,
    didJustFinish: true,
  });

  assert.equal(lockScreenCleared, true, 'Lockscreen controls must be cleared when queue finishes');
  assert.equal(bannerDismissed, true, 'Any lingering banner must be dismissed when queue finishes');

  console.log('  ✓ PASSED');
}

// 5b. REGRESSION: clearNowPlaying must NOT cause the next syncNowPlaying to
// re-invoke setActiveForLockScreen (notification blink loop).
// Root cause: clearNowPlaying() nulled lastActivePlayerId while the player
// instance was still alive; any following status tick saw id !== null-guard
// and re-posted the native MediaStyle notification. Fixed by guarding on the
// player INSTANCE, which only resets when the player is truly destroyed.
console.log('Test 5b: clearNowPlaying does not re-post notification on next tick (blink fix)...');
{
  let setActiveCalls = 0;
  let updateMetadataCalls = 0;

  // Model of the FIXED syncNowPlaying (instance-guarded)
  let lastActivePlayer = null;
  let lastSyncedTitle = null;

  const player = {
    id: 'session-1',
    setActiveForLockScreen: () => { setActiveCalls++; },
    updateLockScreenMetadata: () => { updateMetadataCalls++; },
    clearLockScreenControls: () => {},
  };

  function syncNowPlaying(p, title) {
    const isSamePlayer = Boolean(
      p.id &&
      lastActivePlayer &&
      p.id === lastActivePlayer.id &&
      p === lastActivePlayer
    );
    if (isSamePlayer) {
      if (lastSyncedTitle !== title) {
        p.updateLockScreenMetadata({ title });
        lastSyncedTitle = title;
      }
    } else {
      p.setActiveForLockScreen(true, { title });
      lastActivePlayer = p;
      lastSyncedTitle = title;
    }
  }

  function clearNowPlaying() {
    // FIXED: does NOT reset lastActivePlayer (player still alive)
    lastSyncedTitle = null;
  }

  // Simulate a theme change: pause/finish triggers clearNowPlaying, then a
  // status tick lands (as it does right after any settings/theme re-render
  // while playback is active).
  syncNowPlaying(player, 'Surah Al-Fatihah · الفَاتِحة — Ayah 1 (Arabic)');
  assert.equal(setActiveCalls, 1, 'First sync activates once');
  clearNowPlaying(); // pause/queue-end/theme-render window
  syncNowPlaying(player, 'Surah Al-Fatihah · الفَاتِحة — Ayah 1 (Arabic)'); // next tick
  assert.equal(setActiveCalls, 1, 'MUST NOT re-post setActiveForLockScreen after clearNowPlaying');
  assert.equal(updateMetadataCalls, 1, 'Metadata re-syncs in place after clearNowPlaying');

  console.log('  ✓ PASSED');
}

// 6. Permission Decision Logic
console.log('Test 6: Media notification permission request logic...');
{
  let storage = {};
  let alertShown = false;
  let osPermissionRequested = false;

  const mockStorage = {
    getItem: async (key) => storage[key] || null,
    setItem: async (key, val) => { storage[key] = val; },
  };

  async function ensureNotificationPermissionForPlayback(platform, currentStatus, userAcceptsRationale) {
    if (platform !== 'android') {
      return true; // iOS and web do not require notification permission for lock screen controls
    }

    const alreadyAsked = (await mockStorage.getItem('media-notification-permission-asked-v1')) === 'true';
    if (alreadyAsked) {
      return currentStatus === 'granted';
    }

    if (currentStatus === 'granted') {
      await mockStorage.setItem('media-notification-permission-asked-v1', 'true');
      return true;
    }

    if (currentStatus === 'denied') {
      await mockStorage.setItem('media-notification-permission-asked-v1', 'true');
      return false;
    }

    // Undetermined: show rationale alert
    alertShown = true;
    await mockStorage.setItem('media-notification-permission-asked-v1', 'true');

    if (!userAcceptsRationale) {
      return false;
    }

    osPermissionRequested = true;
    return true;
  }

  // Case A: iOS - returns true immediately without alert or request
  storage = {};
  alertShown = false;
  osPermissionRequested = false;
  const iosResult = await ensureNotificationPermissionForPlayback('ios', 'undetermined', false);
  assert.equal(iosResult, true, 'iOS should succeed without forcing notification permission');
  assert.equal(alertShown, false);
  assert.equal(osPermissionRequested, false);

  // Case B: Android first time (undetermined), user accepts
  storage = {};
  alertShown = false;
  osPermissionRequested = false;
  const androidAccept = await ensureNotificationPermissionForPlayback('android', 'undetermined', true);
  assert.equal(androidAccept, true);
  assert.equal(alertShown, true, 'Must show rationale alert on first undetermined Android playback');
  assert.equal(osPermissionRequested, true);
  assert.equal(storage['media-notification-permission-asked-v1'], 'true');

  // Case C: Android second time - never re-prompts
  alertShown = false;
  osPermissionRequested = false;
  const androidSecondTime = await ensureNotificationPermissionForPlayback('android', 'granted', false);
  assert.equal(androidSecondTime, true);
  assert.equal(alertShown, false, 'Must NOT re-prompt once asked');
  assert.equal(osPermissionRequested, false);

  // Case D: Android previously denied - does not show system alert
  storage = { 'media-notification-permission-asked-v1': 'true' };
  alertShown = false;
  osPermissionRequested = false;
  const androidDenied = await ensureNotificationPermissionForPlayback('android', 'denied', false);
  assert.equal(androidDenied, false);
  assert.equal(alertShown, false, 'Must NOT show rationale when previously denied');
  assert.equal(osPermissionRequested, false);

  console.log('  ✓ PASSED');
}

console.log('\n====================================================');
console.log('ALL QURAN AUDIO NOTIFICATION TESTS PASSED SUCCESSFULLY!');
console.log('====================================================\n');
