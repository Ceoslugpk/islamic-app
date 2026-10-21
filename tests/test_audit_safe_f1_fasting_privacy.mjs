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
const fasting = loadModule('src/screens/FastingScreen.tsx', {
  '../lib/womenReason': classifier,
  'react-native': {
    StyleSheet: { absoluteFill: {}, create: (styles) => styles },
  },
});

const womenScopedFreeTextRow = {
  id: 'pregnancy-row',
  date: '2026-01-01',
  reason: 'Pregnancy / Nursing',
  madeUp: false,
  createdAt: 1,
};

assert.deepEqual(
  fasting.getVisibleMissedFasts([womenScopedFreeTextRow], true, false),
  [],
  'a non-token women-scoped row must not be visible while the women lock is engaged',
);
assert.deepEqual(
  fasting.getVisibleMissedFasts([womenScopedFreeTextRow], true, true),
  [womenScopedFreeTextRow],
  'the same row must be visible after the women session is unlocked',
);

console.log('Audit F1 PASS: locked Fasting ledger fails closed for a non-token women row');
