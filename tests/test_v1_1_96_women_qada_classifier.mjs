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
const qada = loadModule('src/screens/WomenQadaScreen.tsx', {
  '../lib/womenReason': classifier,
  'react-native': reactNative,
  '../lib/buttonTokens': {
    buttonTokens: { sm: { minHeight: 40, borderRadius: 8 }, md: { minHeight: 44, borderRadius: 10 } },
    touchTargetTokens: { hitSlop10: 10 },
  },
});

assert.equal(typeof qada.getWomenMissedFasts, 'function');

const reasons = [
  'Menstruation',
  'Nifaas',
  'Haydh',
  'Post–natal',
  'نِفَاس',
  'Illness / Medical',
];
const records = reasons.map((reason, index) => ({ id: String(index), reason }));

assert.deepEqual(
  qada.getWomenMissedFasts(records).map((record) => record.id),
  ['0', '1', '2', '3', '4'],
  'Women Qada must use the shared classifier so alternative English and Arabic reason tokens remain visible and deletable',
);

console.log('v1.1.96 Women Qada classifier test passed');
