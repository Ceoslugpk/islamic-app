import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const ROOT = path.resolve(import.meta.dirname, '..');
const SOURCE = path.join(ROOT, 'src/lib/timeFormat.ts');
const output = ts.transpileModule(fs.readFileSync(SOURCE, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  fileName: SOURCE,
}).outputText;

const moduleObject = { exports: {} };
new Function('module', 'exports', 'require', output)(
  moduleObject,
  moduleObject.exports,
  (request) => {
    if (request === './i18n') return { getCurrentLanguage: () => 'ar' };
    throw new Error(`Unexpected import from ${SOURCE}: ${request}`);
  },
);

const { formatTime } = moduleObject.exports;
assert.equal(typeof formatTime, 'function', 'the real formatTime export must load');

assert.equal(formatTime('15:30', '24h'), '15:30', '24-hour formatting remains unchanged');
assert.equal(
  formatTime('15:30', '12h'),
  '3:30 م',
  '12-hour formatting must use the active Arabic locale day period instead of hardcoded PM',
);

console.log('v1.1.96 timeFormat locale regression test passed');
