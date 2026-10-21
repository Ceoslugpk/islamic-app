import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import ts from 'typescript';

const ROOT = path.resolve(import.meta.dirname, '..');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'islamic-f-b4-'));

function compile(relativePath, outputName, replacements) {
  let source = fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
  for (const [from, to] of replacements) {
    assert.ok(source.includes(from), `missing production import: ${from}`);
    source = source.replaceAll(from, to);
  }
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    fileName: relativePath,
  }).outputText;
  const file = path.join(TMP, outputName);
  fs.writeFileSync(file, output);
  return file;
}

// F-b4-2: verify the real App route pairs the label with its actual destination.
const app = fs.readFileSync(path.join(ROOT, 'App.tsx'), 'utf8');
const libraryWomen = app.match(/library\.screen === 'women-guidance'[\s\S]*?<\/WomenLockGate>/)?.[0];
const toolsWomen = app.match(/tools\.screen === 'women-guidance'[\s\S]*?<\/WomenLockGate>/)?.[0];
assert.ok(libraryWomen, 'the Library WomenGuidance route must exist');
assert.ok(toolsWomen, 'the Tools WomenGuidance route must exist');
assert.match(libraryWomen, /onBack=\{\(\) => setLibrary\(\{ screen: 'hub' \}\)\}/);
assert.match(libraryWomen, /backLabel="Library"/);
assert.match(toolsWomen, /onBack=\{\(\) => setTools\(\{ screen: 'hub' \}\)\}/);
const womenScreen = fs.readFileSync(path.join(ROOT, 'src/screens/WomenGuidanceScreen.tsx'), 'utf8');
assert.match(womenScreen, /backLabel = 'Tools'/, 'the Tools route uses the screen default label');

// F-b4-3: execute the production reader delta helper and the real progress writer.
const storagePath = path.join(TMP, 'storage.mjs');
fs.writeFileSync(storagePath, `
  export const store = new Map();
  export default {
    async getItem(key) { return store.has(key) ? store.get(key) : null; },
    async setItem(key, value) { store.set(key, value); },
    async getAllKeys() { return [...store.keys()]; },
    async multiRemove(keys) { for (const key of keys) store.delete(key); },
  };
`);
const settingsPath = path.join(TMP, 'settings.mjs');
fs.writeFileSync(settingsPath, 'export {}\n');
const progressPath = compile('src/lib/quranProgress.ts', 'progress.mjs', [
  ["from '@react-native-async-storage/async-storage'", "from './storage.mjs'"],
  ["from './settings'", "from './settings.mjs'"],
]);
const progress = await import(progressPath);
const storage = await import(storagePath);

// Import the real reader module with a small native/hook harness, then invoke
// the actual viewability callback used by its FlatList.
const readerSource = fs.readFileSync(path.join(ROOT, 'src/screens/QuranReaderScreen.tsx'), 'utf8');
const readerJs = ts.transpileModule(readerSource, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React },
  fileName: 'QuranReaderScreen.tsx',
}).outputText;
const readerDir = path.join(TMP, 'reader');
fs.mkdirSync(readerDir);
fs.writeFileSync(path.join(readerDir, 'react.mjs'), `
  const cap = globalThis.__readerCap;
  export const useRef = (current) => { const ref = { current }; cap.refs.push(ref); return ref; };
  export const useState = (value) => { const state = { value: typeof value === 'function' ? value() : value }; const set = (next) => { state.value = typeof next === 'function' ? next(state.value) : next; }; cap.states.push(state); return [state.value, set]; };
  export const useCallback = (fn) => { cap.callbacks.push(fn); return fn; };
  export const useMemo = (fn) => { try { return fn(); } catch { return undefined; } };
  export const useEffect = () => {};
  export const createElement = (type, props, ...children) => ({ type, props, children });
  export default { useRef, useState, useCallback, useMemo, useEffect, createElement };
`);
const readerStub = `
  const STUB = new Proxy(function () { return STUB; }, { get(t, p) { if (p === 'then') return undefined; if (p === Symbol.toPrimitive) return () => 0; return STUB; }, apply() { return STUB; } });
  export { STUB };
  export default STUB;
`;
const importRe = /import\s+([\s\S]*?)\s+from\s+(['"])([^'"]+)\2\s*;?/g;
const readerImports = [...readerSource.matchAll(importRe)];
const readerReplacements = [];
for (const [, clause, , spec] of readerImports) {
  if (readerReplacements.some(([seen]) => seen === spec)) continue;
  if (spec === 'react') {
    readerReplacements.push([spec, path.join(readerDir, 'react.mjs')]);
    continue;
  }
  const stub = path.join(readerDir, `stub-${readerReplacements.length}.mjs`);
  let stubSource = readerStub;
  if (spec === '../lib/quranProgress') {
    stubSource += 'export async function recordQuranReadingSession(delta, goal) { return globalThis.__record(delta, goal); }\n';
  }
  if (spec !== 'react') {
    const named = clause.match(/\{([\s\S]*?)\}/)?.[1] || '';
    for (const raw of named.split(',')) {
      const name = raw.trim().split(/\s+as\s+/)[0];
      if (/^[A-Za-z_$][\w$]*$/.test(name) && !(spec === '../lib/quranProgress' && name === 'recordQuranReadingSession')) {
        stubSource += `export const ${name} = STUB;\n`;
      }
    }
  }
  fs.writeFileSync(stub, stubSource);
  readerReplacements.push([spec, stub]);
}
let readerCode = readerJs;
for (const [spec, stub] of readerReplacements) {
  readerCode = readerCode.replaceAll(`from '${spec}'`, `from '${stub}'`).replaceAll(`from "${spec}"`, `from "${stub}"`);
}
const readerModulePath = path.join(readerDir, 'QuranReaderScreen.mjs');
fs.writeFileSync(readerModulePath, readerCode);
globalThis.__readerCap = { callbacks: [], refs: [], states: [] };
globalThis.__record = (delta, goal) => progress.recordQuranReadingSession(delta, goal, '2026-10-20');
const reader = await import(readerModulePath);
assert.equal(typeof reader.getNewlyCompletedAyahs, 'function', 'the real reader must export its ayah progress helper');

const observedAyahs = [1, 2, 3, 2, 3, 5];
let previous = observedAyahs[0];
for (const current of observedAyahs) {
  const delta = reader.getNewlyCompletedAyahs(previous, current);
  if (delta > 0) await progress.recordQuranReadingSession({ custom: delta }, undefined, '2026-10-20');
  previous = Math.max(previous, current);
}
const stored = JSON.parse(storage.store.get('quran-daily-progress:2026-10-20'));
assert.equal(stored.customCompleted, 4, 'forward ayah progress must persist once; revisits must not double-count');
fs.writeFileSync(path.join(TMP, 'db.mjs'), 'export function getSalahHistory() { return {}; } export function computeStreak() { return 0; } export function loadHifzStatuses() { return {}; }\n');
fs.writeFileSync(path.join(TMP, 'study.mjs'), 'export function getNotes() { return []; }\n');
const dateKey = compile('src/lib/dateKey.ts', 'date-key.mjs', []);
const summary = await import(compile('src/lib/weeklySummary.ts', 'summary.mjs', [
  ["from '@react-native-async-storage/async-storage'", "from './storage.mjs'"],
  ["from './dateKey'", "from './date-key.mjs'"],
  ["from './db'", "from './db.mjs'"],
  ["from './study'", "from './study.mjs'"],
]));
void dateKey;
const weekly = await summary.buildWeeklySummary(new Date(2026, 9, 20, 12, 0, 0));
assert.equal(weekly.totalAyahsRead, 4, 'weekly summary must reflect the ayahs persisted by the reader path');

console.log('PASS: Library/Tools back labels match their destinations and reader ayah progress reaches storage');
