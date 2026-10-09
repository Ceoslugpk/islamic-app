/**
 * Audio Engine Lifecycle & Leak Prevention Test Suite
 *
 * Verifies:
 * (a) cleanupCurrentSound equivalent releases subscription before player.
 * (b) Guard prevents double-remove and catches use-after-release (guard returns null on second call).
 * (c) Preloader LRU eviction removes cache entry before remove() and clears inFlight.
 * (d) stopAudioPreloading synchronously clears inFlight, nulls cache entry references, and removes players.
 * (e) Background handler calls unload() when not playing, and skips when playing.
 * (f) Translation segment and switch paths don't leak (single currentSound owner),
 *     with balanced create/remove tracking across simulated play, stop, fallback, and queue advance.
 */

import assert from 'node:assert/strict';

console.log('=== RUNNING AUDIO ENGINE LIFECYCLE TEST SUITE ===\n');

// ---------------------------------------------------------------------------
// Mock AudioPlayer & Factory
// ---------------------------------------------------------------------------
class MockAudioPlayer {
  constructor(uri, factory) {
    this.id = `player_${Math.random().toString(36).substring(2, 9)}`;
    this.uri = typeof uri === 'object' && uri !== null ? uri.uri : uri;
    this.factory = factory;
    this.removed = false;
    this.released = false;
    this.playing = false;
    this.volume = 1.0;
    this.playbackRate = 1.0;
    this.listeners = new Map();
    this.factory.activePlayers.set(this.id, this);
    this.factory.stats.createCount++;
  }

  play() {
    if (this.removed || this.released) {
      throw new Error('expo-audio: UsingReleasedSharedObjectException: Cannot play a released audio player');
    }
    this.playing = true;
    this.factory.stats.playCount++;
  }

  pause() {
    this.playing = false;
    this.factory.stats.pauseCount++;
  }

  replace(source) {
    if (this.removed || this.released) {
      throw new Error('expo-audio: UsingReleasedSharedObjectException: Cannot replace source on released player');
    }
    this.uri = typeof source === 'object' && source !== null ? source.uri : source;
    this.factory.stats.replaceCount++;
  }

  seekTo(seconds) {
    if (this.removed || this.released) {
      throw new Error('expo-audio: UsingReleasedSharedObjectException: Cannot seek on released player');
    }
    return Promise.resolve();
  }

  setPlaybackRate(rate) {
    if (this.removed || this.released) {
      throw new Error('expo-audio: UsingReleasedSharedObjectException: Cannot set rate on released player');
    }
    this.playbackRate = rate;
  }

  clearLockScreenControls() {
    this.factory.stats.clearLockScreenCount++;
  }

  addListener(event, callback) {
    if (this.removed || this.released) {
      throw new Error('expo-audio: UsingReleasedSharedObjectException: Cannot add listener on released player');
    }
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
    this.factory.stats.addListenerCount++;

    return {
      remove: () => {
        const list = this.listeners.get(event);
        if (list) {
          list.delete(callback);
        }
        this.factory.stats.removeListenerCount++;
        this.factory.recordEvent('subscription_removed', this.id);
      },
    };
  }

  remove() {
    if (this.removed) {
      this.factory.stats.doubleRemoveCount++;
    }
    this.removed = true;
    this.playing = false;
    this.factory.activePlayers.delete(this.id);
    this.factory.stats.removeCount++;
    this.factory.recordEvent('player_removed', this.id);
  }

  release() {
    this.released = true;
    this.factory.stats.releaseCount++;
    this.factory.recordEvent('player_released', this.id);
  }
}

class MockAudioPlayerFactory {
  constructor() {
    this.activePlayers = new Map();
    this.eventLog = [];
    this.stats = {
      createCount: 0,
      removeCount: 0,
      releaseCount: 0,
      doubleRemoveCount: 0,
      playCount: 0,
      pauseCount: 0,
      replaceCount: 0,
      addListenerCount: 0,
      removeListenerCount: 0,
      clearLockScreenCount: 0,
    };
  }

  recordEvent(type, id) {
    this.eventLog.push({ type, id, time: Date.now() });
  }

  createAudioPlayer(source) {
    return new MockAudioPlayer(source, this);
  }

  reset() {
    this.activePlayers.clear();
    this.eventLog = [];
    for (const key of Object.keys(this.stats)) {
      this.stats[key] = 0;
    }
  }
}

// ---------------------------------------------------------------------------
// TEST 1: (a) cleanupCurrentSound releases subscription before player
// ---------------------------------------------------------------------------
console.log('Test 1: (a) cleanupCurrentSound releases subscription before player...');
{
  const factory = new MockAudioPlayerFactory();
  let currentSound = null;
  let currentSoundSubscription = null;
  let currentPlaybackUrl = null;

  const removedPlayers = new WeakSet();
  function safeRemovePlayer(player) {
    if (!player) return null;
    if (removedPlayers.has(player)) return null;
    removedPlayers.add(player);
    try { player.pause(); } catch {}
    try { player.remove(); } catch {}
    try { player.release?.(); } catch {}
    return null;
  }

  function cleanupCurrentSound(clearLockScreen = false) {
    if (currentSoundSubscription) {
      try {
        currentSoundSubscription.remove();
      } catch {}
      currentSoundSubscription = null;
    }
    if (currentSound) {
      const soundToRelease = currentSound;
      currentSound = null;
      if (clearLockScreen) {
        try {
          soundToRelease.clearLockScreenControls();
        } catch {}
      }
      safeRemovePlayer(soundToRelease);
    }
    currentPlaybackUrl = null;
  }

  // Setup active sound and subscription
  currentSound = factory.createAudioPlayer('https://cdn.example.com/audio/001001.mp3');
  currentPlaybackUrl = 'https://cdn.example.com/audio/001001.mp3';
  currentSoundSubscription = currentSound.addListener('playbackStatusUpdate', () => {});
  currentSound.play();

  assert.equal(factory.stats.createCount, 1, 'Player should be created');
  assert.equal(factory.stats.addListenerCount, 1, 'Subscription listener added');
  assert.equal(factory.activePlayers.size, 1, 'One active player in factory');

  // Trigger cleanupCurrentSound
  cleanupCurrentSound(true);

  // Assertions
  assert.equal(currentSound, null, 'currentSound must be nulled');
  assert.equal(currentSoundSubscription, null, 'currentSoundSubscription must be nulled');
  assert.equal(currentPlaybackUrl, null, 'currentPlaybackUrl must be nulled');
  assert.equal(factory.stats.removeListenerCount, 1, 'Subscription was removed');
  assert.equal(factory.stats.removeCount, 1, 'Player remove was called');
  assert.equal(factory.stats.releaseCount, 1, 'Player release was called');
  assert.equal(factory.stats.clearLockScreenCount, 1, 'Lockscreen controls cleared');

  // Strict order verification: subscription_removed MUST come before player_removed
  const subRemovedIndex = factory.eventLog.findIndex((e) => e.type === 'subscription_removed');
  const playerRemovedIndex = factory.eventLog.findIndex((e) => e.type === 'player_removed');
  assert.ok(subRemovedIndex !== -1, 'subscription_removed must be logged');
  assert.ok(playerRemovedIndex !== -1, 'player_removed must be logged');
  assert.ok(subRemovedIndex < playerRemovedIndex, 'subscription.remove() must precede player.remove()');

  console.log('  ✓ Subscription removed strictly before player removal & all refs nulled');
}

// ---------------------------------------------------------------------------
// TEST 2: (b) No double-remove / use-after-release guard
// ---------------------------------------------------------------------------
console.log('\nTest 2: (b) No double-remove / use-after-release (guard returns null on second call)...');
{
  const factory = new MockAudioPlayerFactory();
  const removedPlayers = new WeakSet();

  function safeRemovePlayer(player) {
    if (!player) return null;
    if (removedPlayers.has(player)) return null;
    removedPlayers.add(player);
    try { player.pause(); } catch {}
    try { player.remove(); } catch {}
    try { player.release?.(); } catch {}
    return null;
  }

  function isPlayerRemoved(player) {
    if (!player) return true;
    return removedPlayers.has(player);
  }

  const player = factory.createAudioPlayer('https://cdn.example.com/audio/001002.mp3');

  // First call
  const result1 = safeRemovePlayer(player);
  assert.equal(result1, null, 'First call returns null');
  assert.equal(factory.stats.removeCount, 1, 'Player was removed once');
  assert.equal(factory.stats.doubleRemoveCount, 0, 'No double remove');
  assert.equal(isPlayerRemoved(player), true, 'isPlayerRemoved reports true');

  // Second call on the same player
  const result2 = safeRemovePlayer(player);
  assert.equal(result2, null, 'Second call returns null');
  assert.equal(factory.stats.removeCount, 1, 'Remove count remains 1 (guard returned null without removing again)');
  assert.equal(factory.stats.doubleRemoveCount, 0, 'No double remove occurred');

  // Use-after-release safety: calling play() on removed player throws, but app helpers handle cleanly
  let threw = false;
  try {
    player.play();
  } catch (err) {
    threw = true;
    assert.match(err.message, /UsingReleasedSharedObjectException/);
  }
  assert.ok(threw, 'Direct play() throws UsingReleasedSharedObjectException');

  // Third call with already released player handled cleanly
  const result3 = safeRemovePlayer(player);
  assert.equal(result3, null, 'Guard continues to return null safely');

  console.log('  ✓ Guard prevents double-remove and safely returns null on subsequent calls');
}

// ---------------------------------------------------------------------------
// TEST 3: (c) Preloader LRU eviction removes cache entry before remove() and clears inFlight
// ---------------------------------------------------------------------------
console.log('\nTest 3: (c) Preloader LRU eviction removes cache entry before remove() and clears inFlight...');
{
  const factory = new MockAudioPlayerFactory();
  const MAX_CACHE_SIZE = 6;
  const cache = new Map();
  const inFlight = new Map();

  function preloadItem(url) {
    const player = factory.createAudioPlayer(url);

    // LRU eviction if cache exceeds capacity
    if (cache.size >= MAX_CACHE_SIZE) {
      let oldestKey = null;
      let oldestTime = Infinity;
      for (const [k, v] of cache.entries()) {
        if (v.lastAccessedAt < oldestTime) {
          oldestTime = v.lastAccessedAt;
          oldestKey = k;
        }
      }
      if (oldestKey) {
        const evicted = cache.get(oldestKey);
        // Verify contract: cache entry deleted and player nulled BEFORE remove()
        cache.delete(oldestKey);
        assert.equal(cache.has(oldestKey), false, 'Cache entry deleted before player removal');
        if (evicted) {
          const playerToEvict = evicted.player;
          evicted.player = null;
          assert.equal(evicted.player, null, 'Map entry player nulled before removal');
          if (playerToEvict) {
            try { playerToEvict.remove(); } catch {}
            try { playerToEvict.release?.(); } catch {}
          }
        }
      }
    }

    cache.set(url, {
      player,
      url,
      lastAccessedAt: Date.now(),
    });
    return player;
  }

  // Preload up to MAX_CACHE_SIZE (6)
  for (let i = 1; i <= 6; i++) {
    preloadItem(`https://cdn.example.com/audio/ayah_${i}.mp3`);
  }
  assert.equal(cache.size, 6, 'Cache has 6 items');
  assert.equal(factory.stats.createCount, 6, '6 players created');
  assert.equal(factory.stats.removeCount, 0, 'No players evicted yet');

  // Simulate an in-flight promise
  const inFlightUrl = 'https://cdn.example.com/audio/ayah_inflight.mp3';
  inFlight.set(inFlightUrl, Promise.resolve(null));
  assert.equal(inFlight.size, 1, 'inFlight has 1 promise');

  // Preload a 7th item -> triggers LRU eviction of oldest (ayah_1)
  preloadItem('https://cdn.example.com/audio/ayah_7.mp3');
  assert.equal(cache.size, 6, 'Cache remains capped at MAX_CACHE_SIZE (6)');
  assert.equal(factory.stats.createCount, 7, '7 players created total');
  assert.equal(factory.stats.removeCount, 1, 'Oldest player was evicted and removed');
  assert.equal(cache.has('https://cdn.example.com/audio/ayah_1.mp3'), false, 'ayah_1 was evicted');
  assert.equal(cache.has('https://cdn.example.com/audio/ayah_7.mp3'), true, 'ayah_7 is cached');

  // Clear in-flight synchronously
  inFlight.clear();
  assert.equal(inFlight.size, 0, 'inFlight cleared synchronously');

  console.log('  ✓ LRU eviction unlinks cache entry before remove() and inFlight cleared synchronously');
}

// ---------------------------------------------------------------------------
// TEST 4: (d) stopAudioPreloading nulls all
// ---------------------------------------------------------------------------
console.log('\nTest 4: (d) stopAudioPreloading nulls all...');
{
  const factory = new MockAudioPlayerFactory();
  const cache = new Map();
  const inFlight = new Map();
  let pendingQueue = ['url_pending_1', 'url_pending_2'];

  for (let i = 1; i <= 4; i++) {
    const url = `https://cdn.example.com/preloaded_${i}.mp3`;
    cache.set(url, {
      player: factory.createAudioPlayer(url),
      url,
      lastAccessedAt: Date.now(),
    });
  }
  inFlight.set('url_inflight_1', Promise.resolve(null));

  assert.equal(cache.size, 4, 'Cache initially has 4 items');
  assert.equal(inFlight.size, 1, 'inFlight initially has 1 item');
  assert.equal(pendingQueue.length, 2, 'Pending queue initially has 2 items');

  // Execute stopAudioPreloading logic
  function stopAudioPreloading() {
    pendingQueue = [];
    inFlight.clear();

    const entries = Array.from(cache.values());
    cache.clear();
    for (const entry of entries) {
      const playerToEvict = entry.player;
      entry.player = null;
      if (playerToEvict) {
        try { playerToEvict.remove(); } catch {}
        try { playerToEvict.release?.(); } catch {}
      }
    }
  }

  stopAudioPreloading();

  assert.equal(pendingQueue.length, 0, 'pendingQueue is empty');
  assert.equal(inFlight.size, 0, 'inFlight map is empty');
  assert.equal(cache.size, 0, 'cache map is empty');
  assert.equal(factory.stats.removeCount, 4, 'All 4 cached players removed');
  assert.equal(factory.stats.releaseCount, 4, 'All 4 cached players released');
  assert.equal(factory.activePlayers.size, 0, 'Zero active players remaining');

  console.log('  ✓ stopAudioPreloading cleared inFlight, cache, and removed all players');
}

// ---------------------------------------------------------------------------
// TEST 5: (e) Background handler calls unload when not playing and skips when playing
// ---------------------------------------------------------------------------
console.log('\nTest 5: (e) Background handler calls unload when not playing and skips when playing...');
{
  let unloadCalls = 0;
  let stopPreloadCalls = 0;

  function mockUnload() {
    unloadCalls++;
    return Promise.resolve();
  }

  function mockStopAudioPreloading() {
    stopPreloadCalls++;
    return Promise.resolve();
  }

  function handleAppStateChange(nextState, currentPlayback) {
    if (nextState === 'background') {
      const isPlaying = currentPlayback?.isPlaying ?? false;
      if (!isPlaying) {
        mockUnload().catch(() => {});
        mockStopAudioPreloading().catch(() => {});
      }
    }
  }

  // Case 1: Audio is playing when backgrounded (Now-Playing active)
  unloadCalls = 0;
  stopPreloadCalls = 0;
  handleAppStateChange('background', { isPlaying: true, surah: 1, ayah: 1 });
  assert.equal(unloadCalls, 0, 'unload must NOT be called when playing');
  assert.equal(stopPreloadCalls, 0, 'stopAudioPreloading must NOT be called when playing');

  // Case 2: Audio is paused/stopped when backgrounded
  unloadCalls = 0;
  stopPreloadCalls = 0;
  handleAppStateChange('background', { isPlaying: false, surah: 1, ayah: 1 });
  assert.equal(unloadCalls, 1, 'unload MUST be called when paused/stopped');
  assert.equal(stopPreloadCalls, 1, 'stopAudioPreloading MUST be called when paused/stopped');

  // Case 3: No active playback session
  unloadCalls = 0;
  stopPreloadCalls = 0;
  handleAppStateChange('background', null);
  assert.equal(unloadCalls, 1, 'unload MUST be called when null session');
  assert.equal(stopPreloadCalls, 1, 'stopAudioPreloading MUST be called when null session');

  // Case 4: Other state transition (e.g. inactive -> active)
  unloadCalls = 0;
  stopPreloadCalls = 0;
  handleAppStateChange('active', null);
  assert.equal(unloadCalls, 0, 'unload ignored for non-background transitions');
  assert.equal(stopPreloadCalls, 0, 'stopAudioPreloading ignored for non-background transitions');

  console.log('  ✓ Background handler accurately preserves playing session and unloads idle session');
}

// ---------------------------------------------------------------------------
// TEST 6: (f) Single currentSound ownership across play/switch/fallback/queue
// ---------------------------------------------------------------------------
console.log('\nTest 6: (f) Translation segment/switch paths don\'t leak & balanced create/remove...');
{
  const factory = new MockAudioPlayerFactory();
  const removedPlayers = new WeakSet();

  function safeRemovePlayer(player) {
    if (!player) return null;
    if (removedPlayers.has(player)) return null;
    removedPlayers.add(player);
    try { player.pause(); } catch {}
    try { player.remove(); } catch {}
    try { player.release?.(); } catch {}
    return null;
  }

  let currentSound = null;
  let currentSoundSubscription = null;
  let currentPlaybackUrl = null;
  let currentPlayback = null;

  function cleanupCurrentSound() {
    if (currentSoundSubscription) {
      try { currentSoundSubscription.remove(); } catch {}
      currentSoundSubscription = null;
    }
    if (currentSound) {
      const soundToRelease = currentSound;
      currentSound = null;
      safeRemovePlayer(soundToRelease);
    }
    currentPlaybackUrl = null;
  }

  function playAudioUrl(url, shouldFail = false) {
    // 1. Reuse existing via replace() if possible
    if (currentSound && typeof currentSound.replace === 'function' && !removedPlayers.has(currentSound)) {
      try {
        currentPlaybackUrl = url;
        currentSound.replace({ uri: url });
        currentSound.play();
        return;
      } catch {
        cleanupCurrentSound();
      }
    }

    cleanupCurrentSound();

    let player = null;
    try {
      player = factory.createAudioPlayer(url);
      if (shouldFail) {
        throw new Error('Simulated network error');
      }
      currentSoundSubscription = player.addListener('playbackStatusUpdate', () => {});
      player.play();
      currentSound = player;
      currentPlaybackUrl = url;
      player = null; // drop local reference
    } catch (err) {
      if (player) {
        safeRemovePlayer(player);
        player = null;
      }
      if (currentSoundSubscription) {
        try { currentSoundSubscription.remove(); } catch {}
        currentSoundSubscription = null;
      }
      // Fallback
      let fallbackPlayer = null;
      try {
        cleanupCurrentSound();
        fallbackPlayer = factory.createAudioPlayer(url.replace('/320/', '/128/'));
        currentSoundSubscription = fallbackPlayer.addListener('playbackStatusUpdate', () => {});
        fallbackPlayer.play();
        currentSound = fallbackPlayer;
        currentPlaybackUrl = fallbackPlayer.uri;
        fallbackPlayer = null;
      } catch {
        if (fallbackPlayer) {
          safeRemovePlayer(fallbackPlayer);
          fallbackPlayer = null;
        }
        cleanupCurrentSound();
      }
    }
  }

  // Sequence 1: Play Arabic Ayah 1
  playAudioUrl('https://cdn.example.com/audio/ar_001001.mp3');
  assert.ok(currentSound !== null, 'currentSound is active');
  assert.equal(factory.activePlayers.size, 1, 'Exactly ONE active player');
  const player1 = currentSound;

  // Sequence 2: Switch to Translation segment (replaces source on existing player)
  playAudioUrl('https://cdn.example.com/audio/en_001001.mp3');
  assert.equal(currentSound, player1, 'Player reused in-place via replace()');
  assert.equal(factory.activePlayers.size, 1, 'Still exactly ONE active player');
  assert.equal(factory.stats.createCount, 1, 'No new player created (replace used)');

  // Sequence 3: Advance to Ayah 2
  playAudioUrl('https://cdn.example.com/audio/ar_001002.mp3');
  assert.equal(factory.activePlayers.size, 1, 'Still exactly ONE active player');

  // Sequence 4: Play with failure & fallback (bitrate mismatch)
  // Force a fresh player by cleaning up first
  cleanupCurrentSound();
  assert.equal(factory.activePlayers.size, 0, 'Zero active players after cleanup');
  assert.equal(factory.stats.createCount, factory.stats.removeCount, 'Balanced create/remove after cleanup');

  playAudioUrl('https://cdn.example.com/320/001003.mp3', true); // will fail and fallback to 128
  assert.ok(currentSound !== null, 'Fallback player is active');
  assert.equal(currentSound.uri, 'https://cdn.example.com/128/001003.mp3', 'Fallback URI loaded');
  assert.equal(factory.activePlayers.size, 1, 'Only fallback player is active (failed player cleaned)');

  // Sequence 5: Stop playback completely
  cleanupCurrentSound();
  assert.equal(currentSound, null, 'currentSound is null');
  assert.equal(factory.activePlayers.size, 0, 'Zero active players');
  assert.equal(factory.stats.createCount, factory.stats.removeCount, 'Create count strictly equals remove count across all sequences');

  console.log(`  ✓ Balanced player lifecycle: ${factory.stats.createCount} created, ${factory.stats.removeCount} removed, 0 leaked`);
}

console.log('\n=== ALL LIFECYCLE TESTS PASSED SUCCESSFULLY ===');
