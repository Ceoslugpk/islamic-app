import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const ROOT = path.resolve(import.meta.dirname, '..');
const SOURCE = path.join(ROOT, 'src/lib/qibla.ts');
const output = ts.transpileModule(fs.readFileSync(SOURCE, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  fileName: SOURCE,
}).outputText;

const moduleObject = { exports: {} };
new Function('module', 'exports', output)(moduleObject, moduleObject.exports);
const { checkMagneticInterference, resetInterferenceHistory } = moduleObject.exports;
assert.equal(typeof checkMagneticInterference, 'function');
assert.equal(typeof resetInterferenceHistory, 'function');

const realNow = Date.now;
Date.now = () => 100000;
try {
  resetInterferenceHistory();
  let wrappedResult;
  for (let i = 0; i < 10; i += 1) {
    wrappedResult = checkMagneticInterference(i % 2 === 0 ? 359 : 1, 'high');
  }
  assert.deepEqual(
    wrappedResult,
    { hasInterference: false, level: 'none', details: '' },
    'steady north-facing samples across 360/0 must not produce a variance warning',
  );

  resetInterferenceHistory();
  let unstableResult;
  for (let i = 0; i < 10; i += 1) {
    unstableResult = checkMagneticInterference(i * 10, 'high');
  }
  assert.equal(unstableResult.hasInterference, true, 'genuinely unstable headings must still be detected');
  assert.equal(unstableResult.level, 'high', 'large circular variance remains a high-level warning');
} finally {
  Date.now = realNow;
}

console.log('v1.1.96 Qibla circular-interference production test passed');
