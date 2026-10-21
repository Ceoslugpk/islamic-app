import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

const ROOT = path.resolve(import.meta.dirname, '..');

function loadTsModule(relativePath, mocks = {}) {
  const filePath = path.join(ROOT, relativePath);
  const output = ts.transpileModule(fs.readFileSync(filePath, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.React,
      esModuleInterop: true,
    },
    fileName: filePath,
  }).outputText;
  const moduleObject = { exports: {} };
  const reactNative = {
    StyleSheet: { create: (styles) => styles },
    Platform: { OS: 'android' },
  };
  const react = {
    __esModule: true,
    default: { createElement: () => null },
    useCallback: (fn) => fn,
    useEffect: () => {},
    useMemo: (fn) => fn(),
    useRef: (value) => ({ current: value }),
    useState: (value) => [value, () => {}],
  };
  const generic = new Proxy({}, {
    get: (_target, property) => property === '__esModule' ? true : (() => null),
  });
  const requireMap = { react, 'react-native': reactNative, ...mocks };
  const sandbox = {
    module: moduleObject,
    exports: moduleObject.exports,
    require: (request) => requireMap[request] ?? generic,
    console,
    process,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    Math,
    Date,
    Object,
    Array,
    String,
    Number,
    Boolean,
    JSON,
    Promise,
    Error,
    globalThis,
  };
  vm.createContext(sandbox);
  vm.runInContext(output, sandbox, { filename: filePath });
  return moduleObject.exports;
}

const qiblaScreen = loadTsModule('src/screens/QiblaScreen.tsx');
assert.equal(typeof qiblaScreen.resolveQiblaLocation, 'function');

const gpsLocation = { latitude: 40.7128, longitude: -74.006, label: 'GPS' };
const autoLocation = { latitude: 51.5074, longitude: -0.1278, label: 'Saved auto' };
const manualLocation = { latitude: 24.8607, longitude: 67.0011, label: 'Manual city' };

assert.deepEqual(
  JSON.parse(JSON.stringify(qiblaScreen.resolveQiblaLocation(
    gpsLocation,
    'manual',
    autoLocation,
    manualLocation,
  ))),
  manualLocation,
  'manual mode must select the saved manual location even while a GPS fix is held',
);
assert.deepEqual(
  JSON.parse(JSON.stringify(qiblaScreen.resolveQiblaLocation(
    gpsLocation,
    'auto',
    autoLocation,
    manualLocation,
  ))),
  gpsLocation,
  'auto mode must continue to prefer the live GPS fix',
);
assert.deepEqual(
  JSON.parse(JSON.stringify(qiblaScreen.resolveQiblaLocation(
    null,
    'auto',
    autoLocation,
    manualLocation,
  ))),
  autoLocation,
  'auto mode must fall back to the saved automatic location without a live fix',
);

console.log('v1.1.96 Qibla manual-location production test passed');
