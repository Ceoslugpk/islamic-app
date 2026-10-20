import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import ts from 'typescript';

const REPO_ROOT = path.resolve(import.meta.dirname, '..');
const SRC_LIB = path.join(REPO_ROOT, 'src/lib');
const TMP_DIR = path.join(os.tmpdir(), 'islamic_app_test_prod_build');

let built = false;

export function setupHarness() {
  if (built && fs.existsSync(TMP_DIR)) {
    return TMP_DIR;
  }
  fs.rmSync(TMP_DIR, { recursive: true, force: true });
  fs.mkdirSync(TMP_DIR, { recursive: true });

  // 1. Parse DDL from real db.native.ts
  const dbSrc = fs.readFileSync(path.join(SRC_LIB, 'db.native.ts'), 'utf8');
  const ddlStart = dbSrc.indexOf('CREATE TABLE IF NOT EXISTS salah_entries');
  const ddl = dbSrc.slice(ddlStart, dbSrc.indexOf('`);', ddlStart));
  const SCHEMA = {};
  for (const m of ddl.matchAll(/CREATE TABLE IF NOT EXISTS (\w+)\s*\(([\s\S]*?)\);/g)) {
    const [, table, body] = m;
    const cols = [];
    for (const raw of body.split('\n')) {
      const line = raw.trim().replace(/,$/, '');
      if (!line || line.startsWith('UNIQUE(') || line.startsWith('PRIMARY KEY(')) continue;
      const parts = line.split(/\s+/);
      if (parts.length < 2) continue;
      if (['PRIMARY', 'UNIQUE', 'FOREIGN', 'CHECK', 'CONSTRAINT'].includes(parts[0].toUpperCase())) continue;
      cols.push({
        name: parts[0],
        type: parts[1],
        notnull: /\bNOT NULL\b/.test(line) || /\bPRIMARY KEY\b/.test(line),
        pk: /\bPRIMARY KEY\b/.test(line),
      });
    }
    const uniq = body.match(/UNIQUE\(([^)]*)\)/);
    SCHEMA[table] = { cols, unique: uniq ? uniq[1].split(',').map((s) => s.trim()) : null };
  }
  fs.writeFileSync(path.join(TMP_DIR, 'schema.json'), JSON.stringify(SCHEMA, null, 2));

  // 2. Transpile helper
  function transpileFile(filename, rewrites, outName) {
    let src = fs.readFileSync(path.join(SRC_LIB, filename), 'utf8');
    for (const [from, to] of rewrites) {
      if (!src.includes(from)) {
        throw new Error(`Rewrite target not found in ${filename}: "${from}"`);
      }
      src = src.replace(from, to);
    }
    const out = ts.transpileModule(src, {
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
      fileName: filename,
    }).outputText;
    fs.writeFileSync(path.join(TMP_DIR, outName), out);
  }

  // 3. Stubs
  fs.writeFileSync(path.join(TMP_DIR, 'stubRN.mjs'), `
    export const Platform = { OS: 'android' };
    export const Linking = { openURL: async () => {} };
    export const Alert = { alert: () => {} };
  `);

  fs.writeFileSync(path.join(TMP_DIR, 'stubDb.mjs'), `
    export const markSalahCompleted = () => {};
    export default {};
  `);

  fs.writeFileSync(path.join(TMP_DIR, 'stubWebStorage.mjs'), `export const webKV = {};\n`);

  fs.writeFileSync(path.join(TMP_DIR, 'stubSettings.mjs'), `
    export const sanitizeSettings = (x) => x;
    export async function enqueueSettingsUpdate() {}
  `);

  fs.writeFileSync(path.join(TMP_DIR, 'stubAsyncStorage.mjs'), `
    const store = new Map();
    export const calls = [];
    export const __store = store;
    export function __resetStorage() { store.clear(); calls.length = 0; }
    export default {
      async getItem(k) { calls.push(['getItem', k]); return store.has(k) ? store.get(k) : null; },
      async setItem(k, v) { calls.push(['setItem', k, v]); store.set(k, v); },
      async removeItem(k) { calls.push(['removeItem', k]); store.delete(k); },
      async multiGet(keys) { return keys.map(k => [k, store.has(k) ? store.get(k) : null]); },
      async multiSet(entries) { calls.push(['multiSet', entries.map(e => e[0])]); entries.forEach(([k, v]) => store.set(k, v)); },
      async getAllKeys() { return [...store.keys()]; },
    };
  `);

  fs.writeFileSync(path.join(TMP_DIR, 'stubSqlite.mjs'), `
    export const log = [];
    let store = {};
    let failTransaction = false;
    export function __failNextTransaction(val = true) { failTransaction = val; }
    export function __seed(t, rows) { store[t] = JSON.parse(JSON.stringify(rows)); }
    export function __dump(t) { return JSON.parse(JSON.stringify(store[t] || [])); }
    export function __reset() { store = {}; log.length = 0; failTransaction = false; }
    let SCHEMA = {};
    export function __schema(s) { SCHEMA = s; }
    export default {
      openDatabaseSync(name) {
        return {
          withTransactionSync(cb) {
            log.push(['withTransactionSync']);
            if (failTransaction) {
              log.push(['rollback']);
              throw new Error('Simulated SQLite disk error during table import');
            }
            const snapshot = JSON.parse(JSON.stringify(store));
            try {
              const res = cb();
              log.push(['commit']);
              return res;
            } catch (e) {
              store = snapshot;
              log.push(['rollback']);
              throw e;
            }
          },
          execSync(sql) {
            log.push(['execSync', sql]);
            const m = sql.match(/DELETE FROM (\\w+)/);
            if (m) store[m[1]] = [];
          },
          runSync(sql, ...args) {
            const m = sql.match(/INSERT OR REPLACE INTO (\\w+) \\(([^)]*)\\)/);
            log.push(['runSync', m ? m[1] : sql.slice(0, 40)]);
            if (!m) return;
            const table = m[1];
            const cols = m[2].split(',').map((c) => c.trim().replace(/"/g, ''));
            const rowObj = {};
            cols.forEach((c, i) => { rowObj[c] = args[i]; });
            const sch = SCHEMA[table];
            if (sch) {
              for (const c of cols) {
                if (!sch.cols.some((sc) => sc.name === c)) throw new Error('no such column: ' + c);
              }
              for (const sc of sch.cols) {
                if (sc.notnull && !(sc.pk && sc.type === 'INTEGER') && (rowObj[sc.name] === undefined || rowObj[sc.name] === null)) {
                  throw new Error('NOT NULL constraint failed: ' + table + '.' + sc.name);
                }
              }
            }
            if (!store[table]) store[table] = [];
            store[table].push(rowObj);
          },
          getAllSync(sql) {
            log.push(['getAllSync', sql]);
            const m = sql.match(/SELECT \\* FROM (\\w+)/);
            return m && store[m[1]] ? JSON.parse(JSON.stringify(store[m[1]])) : [];
          },
          getFirstSync(sql, param) {
            log.push(['getFirstSync', sql, param]);
            return null;
          },
        };
      },
    };
  `);

  fs.writeFileSync(path.join(TMP_DIR, 'stubNotif.mjs'), `
    export const store = new Map();
    export const log = [];
    let seq = 0;
    export const SchedulableTriggerInputTypes = { DAILY: 'daily', TIME_INTERVAL: 'timeInterval', DATE: 'date' };
    export function __seed(id, content, trigger) { store.set(id, { identifier: id, content, trigger }); }
    export function __ids() { return [...store.keys()]; }
    export function __clear() { store.clear(); log.length = 0; seq = 0; }
    export default {
      SchedulableTriggerInputTypes: { DAILY: 'daily', TIME_INTERVAL: 'timeInterval', DATE: 'date' },
      async getAllScheduledNotificationsAsync() { return [...store.values()]; },
      async cancelScheduledNotificationAsync(id) { log.push(['cancel', id]); store.delete(id); },
      async scheduleNotificationAsync({ content, trigger, identifier }) {
        const id = identifier || 'auto-' + (++seq);
        log.push(['schedule', id, (content && content.data && content.data.type) || 'none']);
        store.set(id, { identifier: id, content, trigger });
        return id;
      },
      async setNotificationCategoryAsync() {},
      async setNotificationChannelAsync() {},
      async getPermissionsAsync() { return { status: 'granted', granted: true }; },
      async requestPermissionsAsync() { return { status: 'granted', granted: true }; },
      async cancelAllScheduledNotificationsAsync() { store.clear(); },
      async dismissNotificationAsync(id) { store.delete(id); },
      async getPresentedNotificationsAsync() { return []; },
      async setNotificationHandler() {},
    };
  `);

  fs.writeFileSync(path.join(TMP_DIR, 'stubHaptics.mjs'), `export default {};\n`);
  fs.writeFileSync(path.join(TMP_DIR, 'stubDeeplinks.mjs'), `export const buildDeepLink = () => 'salah://tracker';\nexport const parseDeepLink = () => null;\n`);
  fs.writeFileSync(path.join(TMP_DIR, 'stubUseLocation.mjs'), `export const sanitizeLocationLabel = (s) => s;\n`);
  fs.writeFileSync(path.join(TMP_DIR, 'stubAudio.mjs'), `export const stopAdhan = async () => {};\n`);
  fs.writeFileSync(path.join(TMP_DIR, 'stubQuranProgress.mjs'), `export const isQuranDailyGoalCompleted = async () => false;\n`);
  fs.writeFileSync(path.join(TMP_DIR, 'stubI18n.mjs'), `export const t = (k) => k;\n`);
  fs.writeFileSync(path.join(TMP_DIR, 'stubContinuing.mjs'), `export const getContinueReadingPosition = async () => null;\n`);
  fs.writeFileSync(path.join(TMP_DIR, 'stubSurahs.mjs'), `export const SURAHS_114 = [];\n`);
  fs.writeFileSync(path.join(TMP_DIR, 'stubPrayerTimes.mjs'), `
    export const fetchPrayerTimes = async () => ({
      timings: { Fajr: '05:00', Sunrise: '06:20', Dhuhr: '12:30', Asr: '15:45', Maghrib: '18:20', Isha: '19:45' },
    });
  `);
  fs.writeFileSync(path.join(TMP_DIR, 'stubSettingsN.mjs'), `
    export const DEFAULT_PRAYER_CONFIGS = {
      Fajr: { enabled: true, adhan: true, vibration: true },
      Dhuhr: { enabled: true, adhan: true, vibration: true },
      Asr: { enabled: true, adhan: true, vibration: true },
      Maghrib: { enabled: true, adhan: true, vibration: true },
      Isha: { enabled: true, adhan: true, vibration: true },
    };
    export const DEFAULT_QURAN_GOAL = { type: 'minutes', target: 15 };
  `);

  // 4. Transpile production modules
  transpileFile('settingsWriteQueue.ts', [], 'settingsWriteQueue.mjs');
  transpileFile('privacy.ts', [
    ["from '@react-native-async-storage/async-storage'", "from './stubAsyncStorage.mjs'"],
    ["from './settings'", "from './stubSettings.mjs'"],
    ["from './settingsWriteQueue'", "from './settingsWriteQueue.mjs'"],
  ], 'privacy.mjs');

  transpileFile('backup.ts', [
    ["import { Platform } from 'react-native'", "import { Platform } from './stubRN.mjs'"],
    ["import AsyncStorage from '@react-native-async-storage/async-storage'", "import AsyncStorage from './stubAsyncStorage.mjs'"],
    ["import * as SQLite from 'expo-sqlite'", "import SQLite from './stubSqlite.mjs'"],
    ["import * as db from './db'", "import db from './stubDb.mjs'"],
    ["import { sanitizeSettings } from './settings'", "import { sanitizeSettings } from './stubSettings.mjs'"],
    ["import { webKV } from './webStorage'", "import { webKV } from './stubWebStorage.mjs'"],
  ], 'backup.mjs');

  transpileFile('notifications.ts', [
    ["import * as Notifications from 'expo-notifications'", "import Notifications from './stubNotif.mjs'"],
    ["import { Platform, Linking, Alert } from 'react-native'", "import { Platform, Linking, Alert } from './stubRN.mjs'"],
    ["import AsyncStorage from '@react-native-async-storage/async-storage'", "import AsyncStorage from './stubAsyncStorage.mjs'"],
    ["import { DayTimings, Location } from './prayerTimes'", "import './stubPrayerTimes.mjs'"],
    ["import { markSalahCompleted } from './db'", "import { markSalahCompleted } from './stubDb.mjs'"],
    ["import * as Haptics from 'expo-haptics'", "import Haptics from './stubHaptics.mjs'"],
    ["import { buildDeepLink, parseDeepLink } from './deeplinks'", "import { buildDeepLink, parseDeepLink } from './stubDeeplinks.mjs'"],
    ["import { sanitizeLocationLabel } from './useLocation'", "import { sanitizeLocationLabel } from './stubUseLocation.mjs'"],
    ["} from './settings'", "} from './stubSettingsN.mjs'"],
    ["import { stopAdhan } from './audio'", "import { stopAdhan } from './stubAudio.mjs'"],
    ["import { isQuranDailyGoalCompleted } from './quranProgress'", "import { isQuranDailyGoalCompleted } from './stubQuranProgress.mjs'"],
    ["import { t } from './i18n'", "import { t } from './stubI18n.mjs'"],
  ], 'notifications.mjs');

  // Replace dynamic imports in notifications.mjs
  let notifSrc = fs.readFileSync(path.join(TMP_DIR, 'notifications.mjs'), 'utf8');
  for (const [a, b] of [["'./prayerTimes'", "'./stubPrayerTimes.mjs'"], ["'./continuing'", "'./stubContinuing.mjs'"], ["'./surahs114'", "'./stubSurahs.mjs'"]]) {
    notifSrc = notifSrc.split(`import(${a})`).join(`import(${b})`);
  }
  fs.writeFileSync(path.join(TMP_DIR, 'notifications.mjs'), notifSrc);

  built = true;
  return TMP_DIR;
}
