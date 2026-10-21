import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import ts from 'typescript';

const ROOT = path.resolve(import.meta.dirname, '..');
const TMP_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'islamic-v1-1-96-weekly-authority-'));

function transpileProduction(relativePath, outputName, replacements) {
  let source = fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
  for (const [from, to] of replacements) source = source.replaceAll(from, to);
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

const calls = [];
fs.writeFileSync(path.join(TMP_DIR, 'weeklyDb.mjs'), `
  export function getSalahHistory(days) {
    globalThis.__weeklyCalls.push(days);
    return Object.fromEntries(Array.from({ length: days }, (_, index) => [String(index), { Fajr: true }]));
  }
  export function computeStreak(history) { return Object.keys(history).length; }
  export function getSalahStreak() { globalThis.__weeklyCalls.push('authoritative-streak'); return 8; }
  export function loadHifzStatuses() { return {}; }
`);
fs.writeFileSync(path.join(TMP_DIR, 'weeklyStudy.mjs'), 'export function getNotes() { return []; }\n');
fs.writeFileSync(path.join(TMP_DIR, 'weeklyStorage.mjs'), `
  export default { async getItem() { return null; } };
`);
const callsFile = path.join(TMP_DIR, 'calls.mjs');
fs.writeFileSync(callsFile, 'export const calls = globalThis.__weeklyCalls;\n');
globalThis.__weeklyCalls = calls;

const summaryFile = transpileProduction('src/lib/weeklySummary.ts', 'weeklySummary.mjs', [
  ["from '@react-native-async-storage/async-storage'", "from './weeklyStorage.mjs'"],
  ["from './dateKey'", "from './weeklyDateKey.mjs'"],
  ["from './db'", "from './weeklyDb.mjs'"],
  ["from './study'", "from './weeklyStudy.mjs'"],
]);
const weeklyDateKey = transpileProduction('src/lib/dateKey.ts', 'weeklyDateKey.mjs', []);
void weeklyDateKey;
const summary = await import(summaryFile);

const result = await summary.buildWeeklySummary(new Date('2026-10-20T21:00:00.000Z'));
assert.equal(result.salahStreak, 8, 'Weekly Summary must display the authoritative streak, not a seven-day cap');
assert.ok(calls.includes('authoritative-streak'), 'Weekly Summary must read the shared authoritative streak');
assert.ok(calls.includes(7), 'Weekly Summary must retain its separate seven-day activity aggregation');

console.log('v1.1.96 weekly-summary streak-authority regression test passed');
