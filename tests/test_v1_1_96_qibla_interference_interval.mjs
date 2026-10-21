import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

const ROOT = path.resolve(import.meta.dirname, '..');
const SOURCE = path.join(ROOT, 'src/screens/QiblaScreen.tsx');

function loadQiblaScreen() {
  const output = ts.transpileModule(fs.readFileSync(SOURCE, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.React,
      esModuleInterop: true,
    },
    fileName: SOURCE,
  }).outputText;

  const stateValues = [
    10,
    'magnetometer',
    'high',
    false,
    null,
    false,
    { hasInterference: false, level: 'none', details: '' },
  ];
  const stateSetters = [];
  const refs = [];
  let stateCursor = 0;
  let refCursor = 0;
  let effectCursor = 0;
  let previousEffectDeps = [];
  let effects = [];
  const intervals = [];
  const interferenceCalls = [];

  const React = {
    __esModule: true,
    default: { createElement: () => null },
    useCallback: (fn) => fn,
    useEffect: (callback, deps) => {
      const index = effectCursor++;
      const previous = previousEffectDeps[index];
      const shouldRun = !previous || deps.some((value, depIndex) => value !== previous[depIndex]);
      previousEffectDeps[index] = deps;
      effects.push({ callback, deps, shouldRun, index });
    },
    useMemo: (factory) => factory(),
    useRef: (value) => {
      const index = refCursor++;
      if (!refs[index]) refs[index] = { current: value };
      return refs[index];
    },
    useState: (initial) => {
      const index = stateCursor++;
      if (!(index in stateValues)) stateValues[index] = typeof initial === 'function' ? initial() : initial;
      const setter = (value) => {
        stateValues[index] = typeof value === 'function' ? value(stateValues[index]) : value;
      };
      stateSetters[index] = setter;
      return [stateValues[index], setter];
    },
  };

  const reactNative = {
    ActivityIndicator: () => null,
    Platform: { OS: 'android' },
    StyleSheet: { create: (styles) => styles },
    TouchableOpacity: () => null,
    View: () => null,
    useWindowDimensions: () => ({ width: 390, height: 844 }),
  };
  const detailScreen = () => null;
  detailScreen.ScrollView = () => null;
  const qibla = {
    qiblaBearing: () => 90,
    distanceToKaabaKm: () => 100,
    smoothHeading: (value) => value,
    magneticDeclination: () => 0,
    headingFromMagnetometer: () => 0,
    resolveLocationHeading: () => 0,
    isFacingQibla: () => false,
    shortestAngleDelta: () => 0,
    formatDistanceToKaaba: () => '100 km',
    checkMagneticInterference: (heading, accuracy) => {
      interferenceCalls.push({ heading, accuracy });
      return { hasInterference: false, level: 'none', details: '' };
    },
    getCalibrationGuidance: () => ({
      step: 'ready',
      title: '',
      description: '',
      icon: 'compass-outline',
      progress: 1,
    }),
  };
  const generic = new Proxy({}, {
    get: (_target, property) => property === '__esModule' ? true : (() => null),
  });
  const requireMap = {
    react: React,
    'react-native': reactNative,
    '../lib/qibla': qibla,
    '../lib/theme': { useTheme: () => ({ colors: {} }) },
    '../lib/haptics': { useHaptics: () => ({ haptic: () => {} }) },
    '../theme/tokens': { useThemeTokens: () => ({ tokens: { bgTop: '', cardTop: '', cardBorder: '', accent: '', gold: '', muted: '' }, mode: 'light' }) },
    '../lib/homeThemeTokens': { getCardShadow: () => ({}), getPillShadow: () => ({}) },
    '../components/layout/SubHeader': { SubHeader: () => null },
    '../components/layout/DetailScreen': { DetailScreen: detailScreen },
    '../components/Card': { Card: () => null },
    '../components/ui': { PremiumCard: () => null },
    '../components/Hairline': { Hairline: () => null },
    '../components/GeometricPattern': { GeometricPattern: () => null },
    '../components/QiblaCompass': { QiblaCompass: () => null },
    '../components/LocationPermissionNote': { LocationPermissionNote: () => null },
    '../lib/useLocation': { useLocation: () => ({ location: null, status: 'denied', loading: false, request: async () => null, refresh: async () => null }) },
    '../lib/settings': {
      useSettings: () => ({
        settings: {
          locationMode: 'auto',
          autoLocation: null,
          manualLocation: { latitude: 21.4225, longitude: 39.8262, label: 'Makkah' },
        },
        setAutoLocation: () => {},
      }),
    },
    '../lib/i18n': { t: (value) => value },
    '@expo/vector-icons': { Ionicons: () => null },
    'expo-location': { __esModule: true },
    'expo-sensors': { Magnetometer: { isAvailableAsync: async () => false, setUpdateInterval: () => {}, addListener: () => ({ remove: () => {} }) } },
    'react-native-safe-area-context': { useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }) },
  };
  const moduleObject = { exports: {} };
  const sandbox = {
    module: moduleObject,
    exports: moduleObject.exports,
    require: (request) => requireMap[request] ?? generic,
    console,
    process,
    setTimeout,
    clearTimeout,
    setInterval: (callback, delay) => {
      const timer = { callback, delay };
      intervals.push(timer);
      return timer;
    },
    clearInterval: () => {},
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
  vm.runInContext(output, sandbox, { filename: SOURCE });

  return {
    Component: moduleObject.exports.default,
    get effects() {
      return effects;
    },
    intervals,
    interferenceCalls,
    rerender() {
      stateCursor = 0;
      refCursor = 0;
      effectCursor = 0;
      effects = [];
      moduleObject.exports.default();
    },
    setHeading: (value) => stateSetters[0](value),
    setAccuracy: (value) => stateSetters[2](value),
  };
}

const harness = loadQiblaScreen();
harness.Component();
const firstRefSyncEffect = harness.effects.find(
  (effect) => effect.deps.length === 2 && effect.deps[0] === 10 && effect.deps[1] === 'high',
);
assert.ok(firstRefSyncEffect, 'the heading/accuracy ref synchronization effect must be present');
firstRefSyncEffect.callback();
const firstTargetEffect = harness.effects.find(
  (effect) => effect.deps.length === 1 && effect.deps[0] === 'magnetometer',
);
assert.ok(firstTargetEffect, 'the interference effect must depend on the source, not sensor samples');
firstTargetEffect.callback();
await Promise.resolve();
assert.equal(harness.intervals.length, 1, 'the interference poller must install one interval');
assert.equal(harness.intervals[0].delay, 2000, 'the interference poller must tick every two seconds');

harness.setHeading(42);
harness.setAccuracy('medium');
harness.rerender();
const secondTargetEffect = harness.effects.find((effect) => effect.index === firstTargetEffect.index);
assert.equal(secondTargetEffect.shouldRun, false, 'heading and accuracy updates must not recreate the interval effect');
const secondRefSyncEffect = harness.effects.find(
  (effect) => effect.deps.length === 2 && effect.deps[0] === 42 && effect.deps[1] === 'medium',
);
assert.ok(secondRefSyncEffect.shouldRun, 'the refs must refresh when sensor state changes');
secondRefSyncEffect.callback();
harness.intervals[0].callback();
assert.deepEqual(
  harness.interferenceCalls.at(-1),
  { heading: 42, accuracy: 'medium' },
  'the stable interval must read the latest heading and accuracy from refs',
);

console.log('v1.1.96 Qibla interference-interval production test passed');
