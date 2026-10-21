import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { compileEsmProductionModule } from './production_module_fallback.mjs';

const repoRoot = path.resolve(import.meta.dirname, '..');
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'continuing-fix-'));
fs.writeFileSync(path.join(tempDir, 'stubAsyncStorage.mjs'), `
const store = new Map();
let failSet = false;
let failRemove = false;
let failGet = false;
export default {
  async getItem(key) { if (failGet) throw new Error('async get failed'); return store.has(key) ? store.get(key) : null; },
  async setItem(key, value) { if (failSet) throw new Error('async set failed'); store.set(key, value); },
  async removeItem(key) { if (failRemove) throw new Error('async remove failed'); store.delete(key); },
};
export const __test = {
  store,
  setFailSet(value) { failSet = value; },
  setFailRemove(value) { failRemove = value; },
  setFailGet(value) { failGet = value; },
  reset() { store.clear(); failSet = false; failRemove = false; failGet = false; },
};
`);
fs.writeFileSync(path.join(tempDir, 'stubDb.mjs'), `
const store = new Map();
let failSave = false;
let failDelete = false;
export function loadQuranCache(key) { return store.has(key) ? structuredClone(store.get(key)) : null; }
export function saveQuranCache(key, value) { if (failSave) return false; store.set(key, structuredClone(value)); return true; }
export function deleteQuranCache(key) { if (failDelete) return false; store.delete(key); return true; }
export function loadLastReadPosition() { return null; }
export const __test = {
  store,
  setFailSave(value) { failSave = value; },
  setFailDelete(value) { failDelete = value; },
  reset() { store.clear(); failSave = false; failDelete = false; },
};
`);
fs.writeFileSync(path.join(tempDir, 'stubQuran.mjs'), 'export function getMushafPageForAyah() { return 1; }\n');
fs.writeFileSync(path.join(tempDir, 'stubCounts.mjs'), 'export const SURAH_AYAH_COUNTS = Array(114).fill(286);\n');

const continuing = await import(compileEsmProductionModule({
  root: repoRoot,
  tmpDir: tempDir,
  sourceRelativePath: 'src/lib/continuing.ts',
  source: fs.readFileSync(path.join(repoRoot, 'src/lib/continuing.ts'), 'utf8'),
  outputName: 'continuing.mjs',
  replacements: [
    ["from '@react-native-async-storage/async-storage'", "from './stubAsyncStorage.mjs'"],
    ["from './surahAyahCounts'", "from './stubCounts.mjs'"],
    ["from './quran'", "from './stubQuran.mjs'"],
    ["from './db'", "from './stubDb.mjs'"],
  ],
}));
const storage = (await import(path.join(tempDir, 'stubAsyncStorage.mjs'))).__test;
const db = (await import(path.join(tempDir, 'stubDb.mjs'))).__test;
const POSITION_KEY = 'quran-last-reading';
const MARKER_KEY = 'quran-reading-marker';
const oldPosition = { surah: 2, ayah: 3, page: 1, savedAt: 10 };
const oldMarker = { surah: 2, ayah: 4, page: 1, savedAt: 10, manual: true };

async function reset() {
  storage.reset();
  db.reset();
  continuing._resetReadingMemoryStateForTest();
}
function seed(key, value) {
  db.store.set(key, structuredClone(value));
  storage.store.set(key, JSON.stringify(value));
}
function dbValue(key) {
  return db.store.has(key) ? structuredClone(db.store.get(key)) : null;
}

await reset();
seed(POSITION_KEY, oldPosition);
db.setFailSave(true);
assert.equal(await continuing.saveReadingPosition(2, 5, 1), false, 'a failed authoritative SQLite write must fail the save');
assert.deepEqual(dbValue(POSITION_KEY), oldPosition, 'AsyncStorage must not be written when SQLite rejects the save');
assert.equal(storage.store.get(POSITION_KEY), JSON.stringify(oldPosition));

await reset();
seed(POSITION_KEY, oldPosition);
storage.setFailSet(true);
assert.equal(await continuing.saveReadingPosition(2, 5, 1), false, 'a failed AsyncStorage write must fail the mirrored save');
assert.deepEqual(dbValue(POSITION_KEY), oldPosition, 'SQLite must be restored when AsyncStorage rejects the save');
assert.equal(storage.store.get(POSITION_KEY), JSON.stringify(oldPosition));

await reset();
seed(POSITION_KEY, oldPosition);
storage.setFailRemove(true);
assert.equal(await continuing.clearReadingPosition(), false, 'a failed AsyncStorage clear must fail the clear');
assert.deepEqual(dbValue(POSITION_KEY), oldPosition, 'SQLite must be restored when AsyncStorage rejects the clear');
assert.equal(storage.store.get(POSITION_KEY), JSON.stringify(oldPosition));

await reset();
seed(MARKER_KEY, oldMarker);
db.setFailSave(true);
assert.equal(await continuing.saveReadingMarker(2, 5, 1), false, 'marker save must reject a failed SQLite write');
assert.deepEqual(dbValue(MARKER_KEY), oldMarker);
assert.equal(storage.store.get(MARKER_KEY), JSON.stringify(oldMarker));

await reset();
seed(MARKER_KEY, oldMarker);
storage.setFailSet(true);
assert.equal(await continuing.saveReadingMarker(2, 5, 1), false, 'marker save must reject a failed AsyncStorage write');
assert.deepEqual(dbValue(MARKER_KEY), oldMarker, 'marker SQLite value must be restored after AsyncStorage failure');
assert.equal(storage.store.get(MARKER_KEY), JSON.stringify(oldMarker));

await reset();
seed(MARKER_KEY, oldMarker);
storage.setFailRemove(true);
assert.equal(await continuing.clearReadingMarker(), false, 'marker clear must reject a failed AsyncStorage clear');
assert.deepEqual(dbValue(MARKER_KEY), oldMarker, 'marker SQLite value must be restored after AsyncStorage clear failure');
assert.equal(storage.store.get(MARKER_KEY), JSON.stringify(oldMarker));

await reset();
const newerPosition = { surah: 2, ayah: 8, page: 1, savedAt: 20 };
db.store.set(POSITION_KEY, structuredClone(newerPosition));
storage.store.set(POSITION_KEY, JSON.stringify(oldPosition));
assert.deepEqual(await continuing.getReadingPosition(), newerPosition, 'SQLite is the authoritative position tier when old stores disagree');
assert.equal(storage.store.get(POSITION_KEY), JSON.stringify(newerPosition), 'AsyncStorage must be repaired from the authoritative position tier');
assert.deepEqual(continuing.getReadingPositionSync(), newerPosition, 'sync position reads must agree with the authoritative tier');

await reset();
const newerMarker = { surah: 2, ayah: 9, page: 1, savedAt: 20, manual: true };
db.store.set(MARKER_KEY, structuredClone(newerMarker));
storage.store.set(MARKER_KEY, JSON.stringify(oldMarker));
assert.deepEqual(await continuing.getReadingMarker(), newerMarker, 'SQLite is the authoritative marker tier when old stores disagree');
assert.equal(storage.store.get(MARKER_KEY), JSON.stringify(newerMarker), 'AsyncStorage must be repaired from the authoritative marker tier');
assert.deepEqual(continuing.getReadingMarkerSync(), newerMarker, 'sync marker reads must agree with the authoritative tier');

console.log('CONTINUING FIX TEST PASSED');
