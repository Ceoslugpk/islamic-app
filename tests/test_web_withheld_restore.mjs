/**
 * Web backup restore must preserve withheld sensitive rows.
 *
 * This imports the real src/lib/backup.ts and src/lib/db.ts. Only the
 * platform, AsyncStorage, settings, SQLite, and webKV boundaries are stubbed.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { compileEsmProductionModule } from './production_module_fallback.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'islamic-web-withheld-'));
const map = new Map();
const deleted = [];

fs.writeFileSync(path.join(TMP, 'rn.mjs'), "export const Platform = { OS: 'web' };\n");
fs.writeFileSync(path.join(TMP, 'asyncStorage.mjs'), `
  const store = new Map();
  export default {
    async getItem(key) { return store.get(key) ?? null; },
    async setItem(key, value) { store.set(key, value); },
    async removeItem(key) { store.delete(key); },
    async getAllKeys() { return [...store.keys()]; },
    async multiGet(keys) { return keys.map((key) => [key, store.get(key) ?? null]); },
    async multiSet(entries) { for (const [key, value] of entries) store.set(key, value); },
  };
`);
fs.writeFileSync(path.join(TMP, 'settings.mjs'), 'export const sanitizeSettings = (value) => value;\n');
fs.writeFileSync(path.join(TMP, 'sqlite.mjs'), 'export const openDatabaseSync = () => { throw new Error(\'SQLite must not be opened on web\'); };\n');
fs.writeFileSync(path.join(TMP, 'webStorage.mjs'), `
  export const webKV = {
    get: (key) => map.get(key) ?? null,
    set: (key, value) => map.set(key, value),
    delete: (key) => { deleted.push(key); return map.delete(key); },
    getAll: (prefix) => [...map.entries()]
      .filter(([key]) => key.startsWith(prefix))
      .map(([key, value]) => ({ key, value })),
  };
  const map = globalThis.__webMap;
  const deleted = globalThis.__webDeleted;
`);
globalThis.__webMap = map;
globalThis.__webDeleted = deleted;

function compile(source, replacements, outputName, sourceRelativePath) {
  return compileEsmProductionModule({
    root: ROOT,
    tmpDir: TMP,
    sourceRelativePath,
    source,
    outputName,
    replacements,
  });
}

const dbPath = compile(
  fs.readFileSync(path.join(ROOT, 'src/lib/db.ts'), 'utf8'),
  [["import { webKV } from './webStorage';", "import { webKV } from './webStorage.mjs';"]],
  'db-web.mjs',
  'src/lib/db.ts',
);
await import(dbPath);

const backupPath = compile(
  fs.readFileSync(path.join(ROOT, 'src/lib/backup.ts'), 'utf8'),
  [
    ["import { Platform } from 'react-native';", "import { Platform } from './rn.mjs';"],
    ["import AsyncStorage from '@react-native-async-storage/async-storage';", "import AsyncStorage from './asyncStorage.mjs';"],
    ["import * as SQLite from 'expo-sqlite';", "import * as SQLite from './sqlite.mjs';"],
    ["import * as db from './db';", "import * as db from './db-web.mjs';"],
    ["import { sanitizeSettings } from './settings';", "import { sanitizeSettings } from './settings.mjs';"],
    ["import { webKV } from './webStorage';", "import { webKV } from './webStorage.mjs';"],
  ],
  'backup-web.mjs',
  'src/lib/backup.ts',
);
const { applyRestore } = await import(backupPath);

const payload = (tables) => ({
  app: 'islamic',
  formatVersion: 1,
  exportedAt: '2026-10-21T00:00:00.000Z',
  appVersion: '1.1.88',
  data: { tables, storage: {} },
});

const setRow = (key, row) => map.set(key, JSON.stringify(row));
const has = (key) => map.has(key);

// Legacy empty arrays are withheld markers, not clear instructions.
setRow('women:period:local-period', { id: 'local-period', startDate: '2026-09-01', createdAt: 1 });
setRow('women:nifas:local-nifas', { id: 'local-nifas', startDate: '2026-09-02', createdAt: 2 });
setRow('fasting:missed:local-sensitive', {
  id: 'local-sensitive', date: '2026-09-03', reason: 'Period', madeUp: false, createdAt: 3,
});
setRow('fasting:missed:local-ordinary', {
  id: 'local-ordinary', date: '2026-09-04', reason: 'Travel', madeUp: false, createdAt: 4,
});
deleted.length = 0;
await applyRestore(payload({ period_entries: [], nifas_entries: [], missed_fasts: [] }));
for (const key of [
  'women:period:local-period',
  'women:nifas:local-nifas',
  'fasting:missed:local-sensitive',
  'fasting:missed:local-ordinary',
]) {
  assert.equal(has(key), true, `withheld empty payload must preserve ${key}`);
}
assert.deepEqual(deleted, [], 'withheld empty payload must not delete any sensitive scope key');

// Non-empty sensitive payloads remain authoritative and replace local rows.
await applyRestore(payload({
  period_entries: [{ id: 'backup-period', start_date: '2026-10-01', end_date: null, notes: null, purity_days: null, created_at: 10 }],
  nifas_entries: [{ id: 'backup-nifas', start_date: '2026-10-02', end_date: null, notes: null, created_at: 11 }],
  missed_fasts: [{ id: 'backup-sensitive', date: '2026-10-03', reason: 'Menstruation', made_up: 0, made_up_date: null, created_at: 12 }],
}));
assert.equal(has('women:period:local-period'), false);
assert.equal(has('women:period:backup-period'), true);
assert.equal(has('women:nifas:local-nifas'), false);
assert.equal(has('women:nifas:backup-nifas'), true);
assert.equal(has('fasting:missed:local-sensitive'), false);
assert.equal(has('fasting:missed:backup-sensitive'), true);

// A legacy payload containing only ordinary missed-fast rows replaces that
// subset while retaining the locally withheld sensitive rows.
setRow('fasting:missed:local-sensitive-2', {
  id: 'local-sensitive-2', date: '2026-10-04', reason: 'Post-natal', madeUp: false, createdAt: 13,
});
setRow('fasting:missed:local-ordinary-2', {
  id: 'local-ordinary-2', date: '2026-10-05', reason: 'Travel', madeUp: false, createdAt: 14,
});
await applyRestore(payload({
  missed_fasts: [{ id: 'backup-ordinary', date: '2026-10-06', reason: 'Travel', made_up: 0, made_up_date: null, created_at: 15 }],
}));
assert.equal(has('fasting:missed:local-sensitive-2'), true);
assert.equal(has('fasting:missed:local-ordinary-2'), false);
assert.equal(has('fasting:missed:backup-ordinary'), true);

// Present non-sensitive rows still replace their ordinary scope.
setRow('salah:2026-10-20:Fajr', { completed: true });
await applyRestore(payload({
  salah_entries: [{ date: '2026-10-21', prayer: 'Fajr', completed: 1 }],
}));
assert.equal(has('salah:2026-10-20:Fajr'), false);
assert.equal(has('salah:2026-10-21:Fajr'), true);

console.log('✓ real web restore preserves withheld empties, replaces actual sensitive rows, retains sensitive missed-fast rows, and preserves ordinary replacement semantics');
