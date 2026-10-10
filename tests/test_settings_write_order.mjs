import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createSerializedSettingsWriter } from '../src/lib/settingsWriteQueue.ts';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

class DelayedStorage {
  value = null;
  writes = [];
  failNext = false;

  async setItem(_key, value) {
    await delay(2);
    if (this.failNext) {
      this.failNext = false;
      throw new Error('forced write failure');
    }
    this.value = value;
    this.writes.push(JSON.parse(value));
  }

  async getItem() {
    await delay(2);
    return this.value;
  }
}

const storage = new DelayedStorage();
const persisted = [];
const write = createSerializedSettingsWriter(storage, 'islamic-settings', (value) => persisted.push(value));

// A language write's readback must be atomic with its queued write: a later
// appearance write cannot run between setItem and verification.
const language = { language: 'ar', themeMode: 'paper', accentKey: 'amber' };
const laterTheme = { ...language, themeMode: 'ink' };
await Promise.all([
  write(language, (raw) => {
    assert.equal(JSON.parse(raw).language, 'ar');
    assert.equal(JSON.parse(raw).themeMode, 'paper');
  }),
  write(laterTheme),
]);
assert.deepEqual(storage.writes, [language, laterTheme]);
assert.deepEqual(persisted, [language, laterTheme]);

// One rejection must not poison the queue; later language/theme writes persist.
storage.failNext = true;
await assert.rejects(write({ ...laterTheme, language: 'ur' }), /forced write failure/);
const recovered = { ...laterTheme, language: 'en', themeMode: 'paper' };
await write(recovered);
assert.deepEqual(JSON.parse(await storage.getItem()), recovered);

// Production setters must snapshot from settingsRef synchronously, rather than
// waiting for a deferred React functional updater that can enqueue stale state.
const settingsSource = fs.readFileSync('src/lib/settings.tsx', 'utf8');
assert.match(settingsSource, /function updateSettings\(/);
assert.doesNotMatch(settingsSource, /setThemeMode:\s*\([^)]*\)\s*=>\s*setSettings\(\(prev\)/);
assert.match(settingsSource, /await enqueueWrite\(nextClean,\s*\(raw\)/);

console.log('✓ serialized settings writer keeps write+readback atomic, recovers after rejection, and production setters snapshot synchronously');
