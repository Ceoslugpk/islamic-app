import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

const ROOT = path.resolve(import.meta.dirname, '..');

function loadModule(relativePath, modules = {}) {
  const filename = path.join(ROOT, relativePath);
  const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.React,
      esModuleInterop: true,
    },
    fileName: filename,
  }).outputText;
  const generic = new Proxy({}, {
    get: (_target, property) => property === '__esModule' ? true : (() => null),
  });
  const moduleObject = { exports: {} };
  const sandbox = {
    module: moduleObject,
    exports: moduleObject.exports,
    require: (request) => modules[request] || generic,
    console,
    Array,
    Date,
    Math,
    Number,
    Object,
    Promise,
    Set,
    String,
  };
  vm.createContext(sandbox);
  vm.runInContext(output, sandbox, { filename });
  return moduleObject.exports;
}

const classifier = loadModule('src/lib/womenReason.ts');
const reactNative = {
  StyleSheet: { absoluteFill: {}, create: (styles) => styles },
};
const fasting = loadModule('src/screens/FastingScreen.tsx', {
  '../lib/womenReason': classifier,
  'react-native': reactNative,
});

assert.equal(typeof fasting.getVisibleMissedFasts, 'function');

const records = [
  { id: 'period', reason: 'Menstruation / Post-natal' },
  { id: 'alternative-token', reason: 'نِفَاس' },
  { id: 'ordinary', reason: 'Illness / Medical' },
];

assert.deepEqual(
  fasting.getVisibleMissedFasts(records, true, false).map((record) => record.id),
  ['ordinary'],
  'a locked women-enabled session must hide all women-specific missed-fast records, including shared-classifier tokens',
);
assert.deepEqual(
  fasting.getVisibleMissedFasts(records, false, true).map((record) => record.id),
  ['ordinary'],
  'the list must remain private when the women feature is disabled even if an unlock flag is stale',
);
assert.deepEqual(
  fasting.getVisibleMissedFasts(records, true, true).map((record) => record.id),
  ['period', 'alternative-token', 'ordinary'],
  'an enabled and unlocked women session may display its complete missed-fast ledger',
);

console.log('v1.1.96 Fasting women-lock ledger test passed');
