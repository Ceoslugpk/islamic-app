import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

const ROOT = path.resolve(import.meta.dirname, '..');

function createReact() {
  const React = {
    useState(initial) {
      return [typeof initial === 'function' ? initial() : initial, () => {}];
    },
    useRef(initial) {
      return { current: initial };
    },
    useEffect() {},
    useMemo(factory) {
      return factory();
    },
    memo(component) {
      return component;
    },
    createElement(type, props, ...children) {
      const normalizedChildren = children.length <= 1 ? children[0] ?? null : children;
      if (typeof type === 'function') return type({ ...(props || {}), children: normalizedChildren });
      return { type, props: { ...(props || {}), children: normalizedChildren } };
    },
  };
  return React;
}

function transpileAndLoad(relativePath, localRequire) {
  const sourcePath = path.join(ROOT, relativePath);
  const output = ts.transpileModule(fs.readFileSync(sourcePath, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.React,
      esModuleInterop: true,
    },
    fileName: sourcePath,
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(output, {
    module,
    exports: module.exports,
    require: localRequire,
    console,
  }, { filename: sourcePath });
  return module.exports;
}

function createPrimitiveLoader(InteractiveSurface) {
  const React = createReact();
  const reactNative = {
    __esModule: true,
    Pressable: 'Pressable',
    StyleSheet: {
      absoluteFill: { position: 'absolute', inset: 0 },
      flatten: (style) => Array.isArray(style) ? Object.assign({}, ...style.filter(Boolean)) : style,
      create: (styles) => styles,
    },
    View: 'View',
    Platform: { OS: 'android' },
  };
  const fallback = new Proxy({}, { get: () => () => null, has: () => true });
  return { React, reactNative, fallback };
}

function loadInteractiveSurface() {
  const { React, reactNative } = createPrimitiveLoader();
  const module = transpileAndLoad('src/components/InteractiveSurface.tsx', (id) => {
    if (id === 'react') return { __esModule: true, default: React, ...React };
    if (id === 'react-native') return reactNative;
    throw new Error(`Unexpected InteractiveSurface import: ${id}`);
  });
  return { component: module.InteractiveSurface, React };
}

function loadToolsAccessiblePressable(InteractiveSurface) {
  const { React, reactNative, fallback } = createPrimitiveLoader(InteractiveSurface);
  const themeTokens = { paper: { gold: '#a80' }, ink: {} };
  const module = transpileAndLoad('src/screens/ToolsScreen.tsx', (id) => {
    if (id === 'react') return { __esModule: true, default: React, ...React };
    if (id === 'react-native') return {
      ...reactNative,
      AppState: { addEventListener: () => ({ remove() {} }) },
      useWindowDimensions: () => ({ width: 390 }),
      Animated: {},
      AccessibilityInfo: {},
    };
    if (id === '../components/InteractiveSurface') return { InteractiveSurface };
    if (id === 'expo-linear-gradient') return { LinearGradient: 'LinearGradient' };
    if (id === 'react-native-svg') return { __esModule: true, default: 'Svg', Path: 'Path' };
    if (id === '@expo/vector-icons') return { Ionicons: 'Ionicons' };
    if (id === '../lib/theme') return { useTheme: () => ({ mode: 'paper' }) };
    if (id === '../lib/homeThemeTokens') return {
      HOME_THEME_TOKENS: { hero: { outerBorder: '#aaa', innerBorder: '#bbb' } },
      getCardShadow: () => ({}),
      getHeroCardShadow: () => ({}),
    };
    if (id === '../theme/tokens') return { themeTokens, GOLD_GRADIENT: ['#a80', '#b90'] };
    if (id === '../lib/i18n') return { isRTL: () => false, t: (value) => value };
    if (id === '../lib/iconMap') return { getForwardIcon: () => 'arrow-forward' };
    if (id === '../components/GeometricPattern') return { GeometricPattern: 'GeometricPattern' };
    if (id === '../components/ui/AppText') return { AppText: 'AppText' };
    if (id === '../components/layout/TabScreen') return { TabScrollView: 'TabScrollView' };
    if (id === '../lib/useLocation') return { useLocation: () => ({}) };
    if (id === '../lib/settings') return { useSettings: () => ({}) };
    if (id === '../lib/qibla') return { qiblaBearing: () => 0 };
    if (id === '../lib/db') return { getSalahEntries: () => ({}), getSalahStreak: () => 0, markSalahCompleted() {} };
    if (id === '../lib/prayerTimes') return {
      fetchPrayerTimes: async () => null,
      getCachedPrayerTimes: () => null,
      getNextPrayer: () => null,
      parseHm: () => 0,
    };
    if (id === '../lib/fasting') return { getHijriDate: () => null };
    if (id === '../lib/dateKey') return { getLocalDateKey: () => '2026-01-01' };
    return fallback;
  });
  return module.AccessiblePressable;
}

function loadPremiumCard(InteractiveSurface) {
  const { React, reactNative } = createPrimitiveLoader(InteractiveSurface);
  const tokens = {
    paper: { cardBorder: '#aaa', cardTop: '#fff', cardGradient: ['#fff', '#eee'] },
    ink: { cardBorder: '#aaa', cardTop: '#111', cardGradient: ['#111', '#222'] },
  };
  const cardTokens = { borderRadius: 18, borderWidth: 1, shadow: { paper: {}, ink: {} } };
  const module = transpileAndLoad('src/components/ui/PremiumCard.tsx', (id) => {
    if (id === 'react') return { __esModule: true, default: React, ...React };
    if (id === 'react-native') return reactNative;
    if (id === 'expo-linear-gradient') return { LinearGradient: 'LinearGradient' };
    if (id === '../../lib/theme') return { useTheme: () => ({ mode: 'paper' }) };
    if (id === '../../theme/tokens') return { cardTokens, themeTokens: tokens };
    if (id === '../../lib/diagnostic') return { useAutoProbe: () => ({}) };
    if (id === '../InteractiveSurface') return { InteractiveSurface };
    throw new Error(`Unexpected PremiumCard import: ${id}`);
  });
  return module.PremiumCard;
}

function findFirst(node, predicate) {
  if (!node || typeof node !== 'object') return null;
  if (predicate(node)) return node;
  const children = Array.isArray(node.props?.children) ? node.props.children : [node.props?.children];
  for (const child of children) {
    const found = findFirst(child, predicate);
    if (found) return found;
  }
  return null;
}

function simulateDescendantTap(root, target) {
  const event = { target: 'descendant-touch', nativeEvent: { pageX: 100, pageY: 100 } };
  if (target?.props?.onPress) {
    target.props.onPress(event);
    return event;
  }
  const wantsResponder = root.props?.onStartShouldSetResponder?.(event) === true;
  if (wantsResponder) {
    root.props.onResponderGrant?.(event);
    root.props.onResponderRelease?.(event);
  }
  return event;
}

function assertCardSurfaceBehavior(name, render, React) {
  const outerCalls = [];
  const innerCalls = [];
  const child = React.createElement(
    'View',
    { testID: `${name}-body` },
    React.createElement('Pressable', {
      testID: `${name}-inner-control`,
      onPress: (event) => innerCalls.push(event),
    }),
  );
  const root = render((event) => outerCalls.push(event), child);
  const body = findFirst(root, (node) => node.props?.testID === `${name}-body`);
  const inner = findFirst(root, (node) => node.props?.testID === `${name}-inner-control`);
  assert.ok(body, `${name} must render the real presentational body`);
  assert.ok(inner, `${name} must retain the real nested control`);

  const bodyEvent = simulateDescendantTap(root, body);
  assert.deepEqual(outerCalls, [bodyEvent], `${name} body taps must reach the card callback once`);
  assert.deepEqual(innerCalls, [], `${name} body taps must not activate the nested control`);

  const innerEvent = simulateDescendantTap(root, inner);
  assert.deepEqual(innerCalls, [innerEvent], `${name} nested control must receive its own tap`);
  assert.deepEqual(outerCalls, [bodyEvent], `${name} nested control taps must not bubble to the card callback`);
}

const { component: InteractiveSurface, React } = loadInteractiveSurface();
const ToolsAccessiblePressable = loadToolsAccessiblePressable(InteractiveSurface);
const PremiumCard = loadPremiumCard(InteractiveSurface);

assertCardSurfaceBehavior(
  'tools',
  (onPress, child) => ToolsAccessiblePressable({ onPress, children: child, testID: 'tools-card' }),
  React,
);
assertCardSurfaceBehavior(
  'premium',
  (onPress, child) => PremiumCard({ onPress, children: child, testID: 'premium-card' }),
  React,
);

console.log('PASS: Tools and PremiumCard surface taps coexist with nested controls at the production component seam');
