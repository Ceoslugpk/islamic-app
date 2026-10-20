/**
 * F-44 regression: expo-background-fetch -> expo-background-task migration.
 *
 * This suite transpiles and EXECUTES the REAL src/lib/backgroundPreload.ts
 * (no hand-copied mirror of the logic) with the native modules stubbed so we
 * can observe exactly what the real registration call receives.
 *
 * It asserts:
 *   1. registerTaskAsync is called with the exact task name and minimumInterval: 15.
 *   2. TaskManager.defineTask is called exactly once, even when register runs twice.
 *   3. The settings pause flag (quranPreloadRequested === false) suppresses the work.
 *   4. unregisterTaskAsync is called with the same task name.
 *   5. getStatusAsync maps to the isBackgroundPreloadRegistered boolean.
 *
 * Every assertion observes a REAL call made by the production module into the
 * stub boundary; nothing matches source text.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import ts from 'typescript';

const REPO_ROOT = path.resolve(import.meta.dirname, '..');
const SRC_LIB = path.join(REPO_ROOT, 'src/lib');
const TMP_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'bg_task_migration_'));

console.log('=== RUNNING F-44 BACKGROUND TASK MIGRATION SUITE ===\n');

/* -------------------------------------------------------------------------- */
/* Build harness: real backgroundPreload.ts + faithful stubs                    */
/* -------------------------------------------------------------------------- */

// A faithful in-memory TaskManager stub (mirrors the real defineTask/isTaskDefined
// semantics: tasks is a Map keyed by name, so a second define with the same name
// would overwrite — the test counts defineTask CALLS, not map size).
fs.writeFileSync(
  path.join(TMP_DIR, 'stubTaskManager.mjs'),
  `
  export const defined = new Map();
  export const defineCalls = [];
  export function defineTask(name, executor) {
    defineCalls.push(name);
    defined.set(name, executor);
  }
  export function isTaskDefined(name) { return defined.has(name); }
  export async function isTaskRegisteredAsync() { return false; }
`
);

// Observable expo-background-task stub. Records what the REAL production module
// passes to registerTaskAsync / unregisterTaskAsync.
fs.writeFileSync(
  path.join(TMP_DIR, 'stubBackgroundTask.mjs'),
  `
  export const registerCalls = [];
  export const unregisterCalls = [];
  let status = 'Available';
  export function __setStatus(s) { status = s; }
  export const BackgroundTaskStatus = { Restricted: 1, Available: 2 };
  export const BackgroundTaskResult = { Success: 1, Failed: 2 };
  export async function registerTaskAsync(name, options) {
    registerCalls.push({ name, options });
  }
  export async function unregisterTaskAsync(name) {
    unregisterCalls.push(name);
  }
  export async function getStatusAsync() {
    return status === 'Available' ? BackgroundTaskStatus.Available : BackgroundTaskStatus.Restricted;
  }
`
);

// quranPreloader stub: lets the test drive progress + record preload starts.
fs.writeFileSync(
  path.join(TMP_DIR, 'stubQuranPreloader.mjs'),
  `
  export const preloadStarts = [];
  let progress = { isComplete: false };
  export function __setProgress(p) { progress = p; }
  export function __reset() { preloadStarts.length = 0; progress = { isComplete: false }; }
  export function getQuranPreloadProgress() { return progress; }
  export async function startQuranPreload() { preloadStarts.push(Date.now()); }
`
);

// AsyncStorage stub backed by an in-memory Map.
fs.writeFileSync(
  path.join(TMP_DIR, 'stubAsyncStorage.mjs'),
  `
  const store = new Map();
  export const __store = store;
  export function __reset() { store.clear(); }
  export default {
    async getItem(k) { return store.has(k) ? store.get(k) : null; },
    async setItem(k, v) { store.set(k, v); },
    async removeItem(k) { store.delete(k); },
  };
`
);

// Transpile the REAL production file, rewriting only its module specifiers.
const src = fs.readFileSync(path.join(SRC_LIB, 'backgroundPreload.ts'), 'utf8');
const rewrites = [
  ["import * as BackgroundTask from 'expo-background-task'", "import * as BackgroundTask from './stubBackgroundTask.mjs'"],
  ["import * as TaskManager from 'expo-task-manager'", "import * as TaskManager from './stubTaskManager.mjs'"],
  ["from './quranPreloader'", "from './stubQuranPreloader.mjs'"],
];
let rewritten = src;
for (const [from, to] of rewrites) {
  if (!rewritten.includes(from)) {
    throw new Error(`Harness rewrite target not found in backgroundPreload.ts: "${from}"`);
  }
  rewritten = rewritten.replace(from, to);
}
// Rewrite the dynamic AsyncStorage import.
if (!rewritten.includes("import('@react-native-async-storage/async-storage')")) {
  throw new Error('Harness rewrite target not found: dynamic AsyncStorage import');
}
rewritten = rewritten.replace(
  "import('@react-native-async-storage/async-storage')",
  "import('./stubAsyncStorage.mjs')"
);

const out = ts.transpileModule(rewritten, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  fileName: 'backgroundPreload.ts',
}).outputText;
fs.writeFileSync(path.join(TMP_DIR, 'backgroundPreload.mjs'), out);

// The production module keeps a module-level `lastRunAt` burst-gap guard, so a
// scenario that invokes the executor must get its OWN module instance. Import
// with a cache-busting query; the stubs are still shared (same URL, cached).
let bgImportSeq = 0;
function freshBG() {
  return import(path.join(TMP_DIR, `backgroundPreload.mjs?fresh=${bgImportSeq++}`));
}
const BG = await freshBG();
const stubTaskManager = await import(path.join(TMP_DIR, 'stubTaskManager.mjs'));
const stubBackgroundTask = await import(path.join(TMP_DIR, 'stubBackgroundTask.mjs'));
const stubQuranPreloader = await import(path.join(TMP_DIR, 'stubQuranPreloader.mjs'));
const asyncStorageMod = await import(path.join(TMP_DIR, 'stubAsyncStorage.mjs'));

const TASK_NAME = 'islamic-quran-preload';

function resetAll() {
  stubTaskManager.defineCalls.length = 0;
  stubTaskManager.defined.clear();
  stubBackgroundTask.registerCalls.length = 0;
  stubBackgroundTask.unregisterCalls.length = 0;
  stubBackgroundTask.__setStatus('Available');
  stubQuranPreloader.__reset();
  asyncStorageMod.__reset();
}

/* -------------------------------------------------------------------------- */
/* Assertions                                                                   */
/* -------------------------------------------------------------------------- */

// Test 1: registration passes the exact name + 15-minute minimum interval.
{
  resetAll();
  await BG.registerBackgroundPreload();
  assert.equal(stubBackgroundTask.registerCalls.length, 1, 'registerTaskAsync must be called exactly once');
  const call = stubBackgroundTask.registerCalls[0];
  assert.equal(call.name, TASK_NAME, `registerTaskAsync must receive the task name "${TASK_NAME}"`);
  assert.ok(call.options && typeof call.options === 'object', 'registerTaskAsync must receive an options object');
  assert.equal(call.options.minimumInterval, 15, 'minimumInterval must be exactly 15 minutes');
  console.log('PASS: registerTaskAsync called with', JSON.stringify(call));
}

// Test 2: task is defined exactly once across repeated register calls.
{
  resetAll();
  await BG.registerBackgroundPreload();
  await BG.registerBackgroundPreload();
  assert.equal(stubTaskManager.defineCalls.length, 1, 'defineTask must be called exactly once even when register runs twice');
  assert.equal(stubTaskManager.defineCalls[0], TASK_NAME, 'the defined task name must match');
  console.log('PASS: defineTask called exactly once across two register calls');
}

// Test 3: pause flag suppresses the work (executor is invoked directly).
{
  resetAll();
  const bg = await freshBG();
  asyncStorageMod.__store.set('islamic-settings', JSON.stringify({ quranPreloadRequested: false }));
  stubQuranPreloader.__setProgress({ isComplete: false });
  await bg.registerBackgroundPreload();

  const executor = stubTaskManager.defined.get(TASK_NAME);
  assert.ok(typeof executor === 'function', 'the real executor must be registered');
  const result = await executor();
  assert.equal(
    stubQuranPreloader.preloadStarts.length,
    0,
    'startQuranPreload must NOT run when quranPreloadRequested is false'
  );
  assert.equal(result, stubBackgroundTask.BackgroundTaskResult.Success, 'executor must report Success on pause');
  console.log('PASS: pause flag (quranPreloadRequested=false) suppresses preload work');
}

// Test 3b: the control — with preloading enabled the executor DOES run the work.
{
  resetAll();
  const bg = await freshBG();
  asyncStorageMod.__store.set('islamic-settings', JSON.stringify({ quranPreloadRequested: true }));
  stubQuranPreloader.__setProgress({ isComplete: false });
  await bg.registerBackgroundPreload();
  const executor = stubTaskManager.defined.get(TASK_NAME);
  await executor();
  assert.equal(
    stubQuranPreloader.preloadStarts.length,
    1,
    'startQuranPreload must run when quranPreloadRequested is true (control for the pause test)'
  );
  console.log('PASS: enabled flag runs the preload (control)');
}

// Test 4: unregister calls the real unregister with the same task name.
{
  resetAll();
  await BG.unregisterBackgroundPreload();
  assert.equal(stubBackgroundTask.unregisterCalls.length, 1, 'unregisterTaskAsync must be called exactly once');
  assert.equal(stubBackgroundTask.unregisterCalls[0], TASK_NAME, 'unregisterTaskAsync must receive the same task name');
  console.log('PASS: unregisterTaskAsync called with', stubBackgroundTask.unregisterCalls[0]);
}

// Test 5: isBackgroundPreloadRegistered reflects getStatusAsync.
{
  resetAll();
  stubBackgroundTask.__setStatus('Available');
  assert.equal(await BG.isBackgroundPreloadRegistered(), true, 'Available -> true');
  stubBackgroundTask.__setStatus('Restricted');
  assert.equal(await BG.isBackgroundPreloadRegistered(), false, 'Restricted -> false');
  console.log('PASS: isBackgroundPreloadRegistered maps status correctly');
}

console.log('\n=== ALL F-44 MIGRATION ASSERTIONS PASSED ===');
