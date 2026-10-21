import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

const ROOT = path.resolve(import.meta.dirname, '..');
const SOURCE = path.join(ROOT, 'src/lib/quranProgress.ts');
process.env.TZ = 'Asia/Karachi';

const output = ts.transpileModule(fs.readFileSync(SOURCE, 'utf8'), {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
    esModuleInterop: true,
  },
  fileName: SOURCE,
}).outputText;

const NativeDate = Date;
const FIXED_ISO = '2025-12-31T19:30:00.000Z';
class FixedDate extends NativeDate {
  constructor(...args) {
    super(...(args.length === 0 ? [FIXED_ISO] : args));
  }

  static now() {
    return NativeDate.parse(FIXED_ISO);
  }
}

const oldBoundaryKey = 'quran-daily-progress:2025-10-02';
const cutoffBoundaryKey = 'quran-daily-progress:2025-10-03';
const removed = [];
const storage = {
  async getAllKeys() {
    return [oldBoundaryKey, cutoffBoundaryKey, 'unrelated-key'];
  },
  async multiRemove(keys) {
    removed.push(...keys);
  },
};

const moduleObject = { exports: {} };
const sandbox = {
  module: moduleObject,
  exports: moduleObject.exports,
  require(request) {
    if (request === '@react-native-async-storage/async-storage') {
      return { __esModule: true, default: storage };
    }
    if (request === './settings') return {};
    throw new Error(`Unexpected import from ${SOURCE}: ${request}`);
  },
  console,
  Date: FixedDate,
  JSON,
  Math,
  Number,
  Object,
  String,
  Array,
  Promise,
  Error,
};
vm.createContext(sandbox);
vm.runInContext(output, sandbox, { filename: SOURCE });

const { pruneOldQuranDailyProgress } = moduleObject.exports;
assert.equal(typeof pruneOldQuranDailyProgress, 'function', 'the real prune function must load');

await pruneOldQuranDailyProgress();
assert.ok(
  removed.includes(oldBoundaryKey),
  'a key 90 local calendar days before the local date must be pruned at the boundary',
);
assert.ok(
  !removed.includes(cutoffBoundaryKey),
  'the local cutoff date itself must be retained',
);

console.log('v1.1.96 Quran progress local-cutoff regression test passed');
