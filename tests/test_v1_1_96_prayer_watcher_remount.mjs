import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import ts from 'typescript';

const REPO_ROOT = path.resolve(import.meta.dirname, '..');
const TMP_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'islamic-v1-1-96-watcher-'));

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

fs.writeFileSync(path.join(TMP_DIR, 'watcherReact.mjs'), `
  export function useRef(value) { return { current: value }; }
  export function useEffect(effect) {
    globalThis.__watcherCleanup = effect() || (() => {});
  }
`);
fs.writeFileSync(path.join(TMP_DIR, 'watcherPrayerTimes.mjs'), '');

const watcherDateKey = transpileProduction('src/lib/dateKey.ts', 'watcherDateKey.mjs', []);
void watcherDateKey;

fs.writeFileSync(path.join(TMP_DIR, 'watcherAudio.mjs'), `
  export const calls = [];
  export function playAdhan(...args) { calls.push(args); return Promise.resolve(); }
`);
fs.writeFileSync(path.join(TMP_DIR, 'watcherSettings.mjs'), `
  export function useSettings() {
    return { settings: {
      adhanReciterId: 'alafasy',
      prayerConfigs: {
        Fajr: { enabled: true, adhan: true, vibration: true },
        Dhuhr: { enabled: true, adhan: true, vibration: true },
        Asr: { enabled: true, adhan: true, vibration: true },
        Maghrib: { enabled: true, adhan: true, vibration: true },
        Isha: { enabled: true, adhan: true, vibration: true },
      },
    }};
  }
`);

const watcherFile = transpileProduction('src/lib/usePrayerWatcher.ts', 'watcher.mjs', [
  ["from 'react'", "from './watcherReact.mjs'"],
  ["from './dateKey'", "from './watcherDateKey.mjs'"],
  ["from './prayerTimes'", "from './watcherPrayerTimes.mjs'"],
  ["from './audio'", "from './watcherAudio.mjs'"],
  ["from './settings'", "from './watcherSettings.mjs'"],
]);
const watcher = await import(watcherFile);
const audio = await import(path.join(TMP_DIR, 'watcherAudio.mjs'));

const timings = {
  timings: { Fajr: '05:00', Dhuhr: '12:00', Asr: '15:00', Maghrib: '18:00', Isha: '19:00' },
};
const realDate = globalThis.Date;
globalThis.Date = class extends realDate {
  constructor(...args) {
    super(...(args.length ? args : [2026, 9, 20, 12, 0, 30]));
  }
  static now() {
    return new realDate(2026, 9, 20, 12, 0, 30).getTime();
  }
};

try {
  watcher.usePrayerWatcher(timings, true);
  globalThis.__watcherCleanup?.();
  watcher.usePrayerWatcher(timings, true);
  globalThis.__watcherCleanup?.();
  assert.equal(audio.calls.length, 1, 'a HomeScreen remount in the same minute must not replay the adhan');
} finally {
  globalThis.Date = realDate;
}

console.log('PASS: the real prayer watcher marker survives a same-day remount');
