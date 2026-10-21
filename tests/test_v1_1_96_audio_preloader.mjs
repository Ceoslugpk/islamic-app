import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import ts from 'typescript';

const REPO_ROOT = path.resolve(import.meta.dirname, '..');
const TMP_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'islamic-v1-1-96-preloader-'));

function transpileProduction(relativePath, outputName, replacements) {
  let source = fs.readFileSync(path.join(REPO_ROOT, relativePath), 'utf8');
  for (const [from, to] of replacements) {
    assert.ok(source.includes(from), `expected replacement target in ${relativePath}: ${from}`);
    source = source.replaceAll(from, to);
  }
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: relativePath,
  }).outputText;
  const filePath = path.join(TMP_DIR, outputName);
  fs.writeFileSync(filePath, output);
  return filePath;
}

fs.writeFileSync(path.join(TMP_DIR, 'preloaderExpo.mjs'), `
  export async function preload() {}
  export function createAudioPlayer(source) {
    return {
      source,
      removeCalls: 0,
      releaseCalls: 0,
      remove() { this.removeCalls += 1; },
      release() { this.releaseCalls += 1; },
      volume: 1,
    };
  }
`);

const preloaderFile = transpileProduction('src/lib/audioPreloader.ts', 'audioPreloader.mjs', [
  ["from 'expo-audio'", "from './preloaderExpo.mjs'"],
  [
    'const cache = new Map<string, PreloadCacheEntry>();',
    'export const cache = new Map<string, PreloadCacheEntry>();',
  ],
  [
    'const inFlight = new Map<string, Promise<AudioPlayer | null>>();',
    'export const inFlight = new Map<string, Promise<AudioPlayer | null>>();',
  ],
]);
const preloader = await import(preloaderFile);

const realSetTimeout = globalThis.setTimeout;
const realClearTimeout = globalThis.clearTimeout;
const pendingTimers = new Set();
let createdTimers = 0;
let clearedTimers = 0;
const realDate = globalThis.Date;
globalThis.setTimeout = (callback) => {
  const timer = { callback, number: ++createdTimers };
  pendingTimers.add(timer);
  return timer;
};
globalThis.clearTimeout = (timer) => {
  if (pendingTimers.delete(timer)) clearedTimers += 1;
};

try {
  const url = 'https://example.test/race.mp3';
  const releasedPlayer = {
    removeCalls: 0,
    releaseCalls: 0,
    remove() { this.removeCalls += 1; },
    release() { this.releaseCalls += 1; },
  };
  let resolveInFlight;
  preloader.inFlight.set(url, new Promise((resolve) => { resolveInFlight = resolve; }));

  const takePromise = preloader.takePreloadedSound(url);
  await Promise.resolve();
  // Stage the exact stop-vs-take interleave: take is awaiting the real in-flight
  // promise, while stop can see and release the same player through the cache.
  preloader.cache.set(url, { player: releasedPlayer, url, lastAccessedAt: 0 });
  await preloader.stopAudioPreloading();
  assert.equal(releasedPlayer.removeCalls, 1, 'stop must release the staged cached player');
  assert.equal(releasedPlayer.releaseCalls, 1, 'stop must release native ownership');
  resolveInFlight(releasedPlayer);
  assert.equal(await takePromise, null, 'take must reject a player invalidated by stop');
  assert.equal(clearedTimers, 1, 'the stopped take race must clear its timeout');

  const fastUrl = 'https://example.test/fast.mp3';
  const fastPlayer = { remove() {}, release() {} };
  preloader.inFlight.set(fastUrl, Promise.resolve(fastPlayer));
  assert.equal(await preloader.takePreloadedSound(fastUrl), fastPlayer);
  assert.equal(createdTimers, 2, 'each in-flight take must create one timeout');
  assert.equal(clearedTimers, 2, 'a fast in-flight winner must clear its timeout');

  // Exercise the requested cache-insertion leak guard through a re-entrant stop
  // at the real Date.now() call immediately before cache.set().
  let stoppedDuringTimestamp = false;
  globalThis.Date = class extends realDate {
    static now() {
      if (!stoppedDuringTimestamp) {
        stoppedDuringTimestamp = true;
        void preloader.stopAudioPreloading();
      }
      return realDate.now();
    }
  };
  preloader.enqueuePreloadUrls(['https://example.test/insertion.mp3']);
  await new Promise((resolve) => realSetTimeout(resolve, 0));
  globalThis.Date = realDate;
  assert.equal(preloader.getAudioPreloadStats().cachedCount, 0, 'a stop during insertion must not leave a cache orphan');
} finally {
  globalThis.setTimeout = realSetTimeout;
  globalThis.clearTimeout = realClearTimeout;
  globalThis.Date = realDate;
  await preloader.stopAudioPreloading();
}

console.log('PASS: preloader invalidation, insertion cleanup, and timeout cleanup execute in the real module');
