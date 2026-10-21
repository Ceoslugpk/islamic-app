import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

const ROOT = path.resolve(import.meta.dirname, '..');
const SOURCE = path.join(ROOT, 'src/screens/ToolsScreen.tsx');
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
  default: { memo: (component) => component, createElement: () => null },
  useState: (initial) => [typeof initial === 'function' ? initial() : initial, () => {}],
  useEffect: () => {},
  useMemo: (factory) => factory(),
};
const rn = {
  Pressable: 'Pressable',
  StyleSheet: { absoluteFill: {}, create: (styles) => styles },
  View: 'View',
  useWindowDimensions: () => ({ width: 390 }),
  AccessibilityRole: {},
  Animated: {},
  AccessibilityInfo: {},
};
const modules = {
  react: React,
  'react-native': rn,
  'expo-linear-gradient': { LinearGradient: 'LinearGradient' },
  'react-native-svg': { __esModule: true, default: 'Svg', Path: 'Path' },
  '@expo/vector-icons': { Ionicons: { glyphMap: {} } },
  '../lib/homeThemeTokens': {
    HOME_THEME_TOKENS: { hero: { outerBorder: '#111', innerBorder: '#222' } },
    getCardShadow: () => ({}),
    getHeroCardShadow: () => ({}),
  },
  '../theme/tokens': { themeTokens: { paper: { gold: '#b8862f' }, ink: {} }, GOLD_GRADIENT: [] },
};
const fallback = new Proxy({}, { get: () => () => null });
const moduleObject = { exports: {} };
const sandbox = {
  module: moduleObject,
  exports: moduleObject.exports,
  require: (request) => modules[request] || fallback,
  console,
  process,
  Date,
  setTimeout,
  clearTimeout,
};
vm.createContext(sandbox);
vm.runInContext(output, sandbox, { filename: SOURCE });

assert.equal(typeof moduleObject.exports.getTrackedNextPrayerName, 'function', 'Tools must expose the production marker mapping');
assert.equal(moduleObject.exports.getTrackedNextPrayerName('Sunrise'), 'Dhuhr', 'Sunrise must point the marker at the next tracked salah');
assert.equal(moduleObject.exports.getTrackedNextPrayerName('Asr'), 'Asr', 'real tracked prayers must keep their marker identity');
assert.equal(moduleObject.exports.getTrackedNextPrayerName(undefined), undefined, 'missing next-prayer data must remain unmarked');

console.log('v1.1.96 Tools Sunrise-marker production test passed');
