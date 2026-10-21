import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

const ROOT = path.resolve(import.meta.dirname, '..');
const SOURCE = path.join(ROOT, 'src/screens/TasbihScreen.tsx');
process.env.TZ = 'Asia/Karachi';

const output = ts.transpileModule(fs.readFileSync(SOURCE, 'utf8'), {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    jsx: ts.JsxEmit.React,
    esModuleInterop: true,
  },
  fileName: SOURCE,
}).outputText;

const React = {
  __esModule: true,
  default: { createElement: () => null },
  useState: () => [undefined, () => {}],
  useCallback: (callback) => callback,
  useRef: (value) => ({ current: value }),
};
const rn = {
  StyleSheet: { create: (styles) => styles },
  View: 'View',
  TouchableOpacity: 'TouchableOpacity',
  Pressable: 'Pressable',
  ScrollView: 'ScrollView',
  useWindowDimensions: () => ({ width: 390 }),
};
const modules = {
  react: React,
  'react-native': rn,
  '@expo/vector-icons': { Ionicons: 'Ionicons' },
  'expo-linear-gradient': { LinearGradient: 'LinearGradient' },
};
const fallback = new Proxy({}, { get: () => () => null });
const dateKeyOutput = ts.transpileModule(
  fs.readFileSync(path.join(ROOT, 'src/lib/dateKey.ts'), 'utf8'),
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
    fileName: path.join(ROOT, 'src/lib/dateKey.ts'),
  },
).outputText;
const dateKeyObject = { exports: {} };
const dateKeySandbox = {
  module: dateKeyObject,
  exports: dateKeyObject.exports,
  require: () => fallback,
  console,
  Date,
};
vm.createContext(dateKeySandbox);
vm.runInContext(dateKeyOutput, dateKeySandbox, { filename: 'dateKey.ts' });
modules['../lib/dateKey'] = dateKeyObject.exports;
const moduleObject = { exports: {} };
const sandbox = {
  module: moduleObject,
  exports: moduleObject.exports,
  require: (request) => modules[request] || fallback,
  console,
  process,
  Date,
};
vm.createContext(sandbox);
vm.runInContext(output, sandbox, { filename: SOURCE });

assert.equal(typeof moduleObject.exports.getTasbihTodayKey, 'function', 'Tasbih must expose its production local-date key helper');
const PakistanAfterMidnight = new Date('2026-10-20T21:00:00.000Z');
assert.equal(
  moduleObject.exports.getTasbihTodayKey(PakistanAfterMidnight),
  '2026-10-21',
  'Tasbih Today must use the device-local calendar date, not the UTC date',
);

console.log('v1.1.96 Tasbih local-date production test passed');
