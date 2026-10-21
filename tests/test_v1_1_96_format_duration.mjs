import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const ROOT = path.resolve(import.meta.dirname, '..');
const SOURCE = path.join(ROOT, 'src/lib/formatDuration.ts');
const output = ts.transpileModule(fs.readFileSync(SOURCE, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  fileName: SOURCE,
}).outputText;

const moduleObject = { exports: {} };
new Function('module', 'exports', 'require', output)(
  moduleObject,
  moduleObject.exports,
  (request) => {
    throw new Error(`Unexpected import from ${SOURCE}: ${request}`);
  },
);

const { formatDuration, formatProgress } = moduleObject.exports;
assert.equal(typeof formatDuration, 'function', 'the real formatDuration export must load');

assert.equal(formatDuration(3599.9), '59:59', 'sub-hour durations keep the m:ss shape');
assert.equal(formatDuration(7200.9), '2:00:00', 'durations of two hours must not clamp to 59:59');
assert.equal(
  formatProgress(7200, 7322),
  '2:00:00 / 2:02:02',
  'the real progress formatter must carry the hour-aware duration through to its callers',
);

console.log('v1.1.96 formatDuration regression test passed');
