import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import ts from 'typescript';

const REPO_ROOT = path.resolve(import.meta.dirname, '..');
const TMP_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'islamic-v1-1-96-summary-'));

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

fs.writeFileSync(path.join(TMP_DIR, 'summaryStorage.mjs'), `
  export const store = new Map();
  export default {
    async getItem(key) { return store.has(key) ? store.get(key) : null; },
    async setItem(key, value) { store.set(key, value); },
    async getAllKeys() { return [...store.keys()]; },
    async multiRemove(keys) { for (const key of keys) store.delete(key); },
  };
`);
fs.writeFileSync(path.join(TMP_DIR, 'summarySettings.mjs'), 'export {}\n');
fs.writeFileSync(path.join(TMP_DIR, 'summaryDb.mjs'), `
  export function getSalahHistory() { return {}; }
  export function computeStreak() { return 0; }
  export function loadHifzStatuses() { return {}; }
`);
fs.writeFileSync(path.join(TMP_DIR, 'summaryStudy.mjs'), 'export function getNotes() { return []; }\n');

const dateKeyFile = transpileProduction('src/lib/dateKey.ts', 'dateKey.mjs', []);
void dateKeyFile;

const progressFile = transpileProduction('src/lib/quranProgress.ts', 'quranProgress.mjs', [
  ["from '@react-native-async-storage/async-storage'", "from './summaryStorage.mjs'"],
  ["from './settings'", "from './summarySettings.mjs'"],
]);
const summaryFile = transpileProduction('src/lib/weeklySummary.ts', 'weeklySummary.mjs', [
  ["from '@react-native-async-storage/async-storage'", "from './summaryStorage.mjs'"],
  ["from './dateKey'", "from './dateKey.mjs'"],
  ["from './db'", "from './summaryDb.mjs'"],
  ["from './study'", "from './summaryStudy.mjs'"],
]);
const progress = await import(progressFile);
const summary = await import(summaryFile);
const storage = await import(path.join(TMP_DIR, 'summaryStorage.mjs'));

await progress.recordQuranReadingSession(
  { minutes: 12, pages: 2, custom: 7 },
  { type: 'custom', target: 10 },
  '2026-10-20',
);

assert.ok(storage.store.has('quran-daily-progress:2026-10-20'), 'the real writer must use the colon key');
const result = await summary.buildWeeklySummary(new Date(2026, 9, 20, 12, 0, 0));
assert.equal(result.daysRead, 1, 'a stored Quran progress record must count as an active day');
assert.equal(result.totalAyahsRead, 7, 'the existing summary field must read the writer\'s custom units');
assert.equal(result.totalReadingMinutes, 12, 'the summary must read minutesRead, not secondsPlayed');

console.log('PASS: weekly summary consumes records written by the real quranProgress module');
