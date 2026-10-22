import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

const ROOT = path.resolve(import.meta.dirname, '..');

function loadProductionPrimitive() {
  const sourcePath = path.join(ROOT, 'src/components/InteractiveSurface.tsx');
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
  const react = {
    useState(initial) {
      return [typeof initial === 'function' ? initial() : initial, () => {}];
    },
    useRef(initial) {
      return { current: initial };
    },
    useEffect() {},
    createElement(type, props, ...children) {
      return { type, props: { ...(props || {}), children: children.length <= 1 ? children[0] ?? null : children } };
    },
  };
  const reactNative = {
    Pressable: 'Pressable',
    View: 'View',
    StyleSheet: {
      absoluteFill: { position: 'absolute', inset: 0 },
      flatten(style) {
        if (!Array.isArray(style)) return style || undefined;
        return style.reduce((result, item) => Object.assign(result, this.flatten(item) || {}), {});
      },
      create: (styles) => styles,
    },
  };
  const localRequire = (id) => {
    if (id === 'react') return { __esModule: true, default: react };
    if (id === 'react-native') return reactNative;
    throw new Error(`Unexpected import: ${id}`);
  };
  vm.runInNewContext(output, {
    module,
    exports: module.exports,
    require: localRequire,
    console,
  }, { filename: sourcePath });
  return module.exports.InteractiveSurface;
}

function loadProductionLiveMiniPlayer(InteractiveSurface) {
  const sourcePath = path.join(ROOT, 'src/components/LiveMiniPlayer.tsx');
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
  const react = {
    useState(initial) {
      return [typeof initial === 'function' ? initial() : initial, () => {}];
    },
    createElement(type, props, ...children) {
      const normalizedChildren = children.length <= 1 ? children[0] ?? null : children;
      if (typeof type === 'function') return type({ ...(props || {}), children: normalizedChildren });
      return { type, props: { ...(props || {}), children: normalizedChildren } };
    },
  };
  const reactNative = {
    StyleSheet: { create: (styles) => styles, absoluteFill: {} },
    View: 'View',
    TouchableOpacity: 'TouchableOpacity',
    useWindowDimensions: () => ({ width: 390 }),
  };
  const appText = ({ children, ...props }) => react.createElement('AppText', props, children);
  const localRequire = (id) => {
    if (id === 'react') return { __esModule: true, default: react };
    if (id === 'react-native') return reactNative;
    if (id === '@expo/vector-icons') return { Ionicons: 'Ionicons' };
    if (id === '../lib/theme') return { useTheme: () => ({ colors: {
      bgSurface: '#fff', borderSubtle: '#ddd', accent: '#a80', textMuted: '#888',
    } }) };
    if (id === '../lib/liveStream') return { toggleLiveStreamPlayPause: () => {} };
    if (id === './ui/AppText') return { AppText: appText };
    if (id === '../lib/i18n') return { t: (key) => key };
    if (id === './InteractiveSurface') return { InteractiveSurface };
    throw new Error(`Unexpected import while loading LiveMiniPlayer: ${id}`);
  };
  vm.runInNewContext(output, {
    module,
    exports: module.exports,
    require: localRequire,
    console,
  }, { filename: sourcePath });
  return module.exports.LiveMiniPlayer;
}

function createProductionReact() {
  const React = {
    useState(initial) {
      return [typeof initial === 'function' ? initial() : initial, () => {}];
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

function loadProductionToolsAccessiblePressable(InteractiveSurface) {
  const sourcePath = path.join(ROOT, 'src/screens/ToolsScreen.tsx');
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
  const React = createProductionReact();
  const fallback = new Proxy({}, { get: () => () => null, has: () => true });
  const themeTokens = {
    paper: { gold: '#a80' },
    ink: {},
  };
  const localRequire = (id) => {
    if (id === 'react') return { __esModule: true, default: React, ...React };
    if (id === 'react-native') return {
      __esModule: true,
      Pressable: 'Pressable',
      StyleSheet: { absoluteFill: {}, create: (styles) => styles },
      View: 'View',
      AppState: { addEventListener: () => ({ remove() {} }) },
      useWindowDimensions: () => ({ width: 390 }),
      AccessibilityRole: undefined,
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
  };
  vm.runInNewContext(output, {
    module,
    exports: module.exports,
    require: localRequire,
    console,
  }, { filename: sourcePath });
  return module.exports.AccessiblePressable;
}

function loadProductionPremiumCard(InteractiveSurface) {
  const sourcePath = path.join(ROOT, 'src/components/ui/PremiumCard.tsx');
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
  const React = createProductionReact();
  const tokens = {
    paper: { cardBorder: '#aaa', cardTop: '#fff', cardGradient: ['#fff', '#eee'] },
    ink: { cardBorder: '#aaa', cardTop: '#111', cardGradient: ['#111', '#222'] },
  };
  const cardTokens = {
    borderRadius: 18,
    borderWidth: 1,
    shadow: { paper: {}, ink: {} },
  };
  const localRequire = (id) => {
    if (id === 'react') return { __esModule: true, default: React, ...React };
    if (id === 'react-native') return {
      __esModule: true,
      StyleSheet: { flatten: (style) => Array.isArray(style) ? Object.assign({}, ...style.filter(Boolean)) : style, create: (styles) => styles },
      View: 'View',
      Platform: { OS: 'android' },
      LayoutChangeEvent: undefined,
    };
    if (id === 'expo-linear-gradient') return { LinearGradient: 'LinearGradient' };
    if (id === '../../lib/theme') return { useTheme: () => ({ mode: 'paper' }) };
    if (id === '../../theme/tokens') return { cardTokens, themeTokens: tokens };
    if (id === '../../lib/diagnostic') return { useAutoProbe: () => ({}) };
    if (id === '../InteractiveSurface') return { InteractiveSurface };
    throw new Error(`Unexpected import while loading PremiumCard: ${id}`);
  };
  vm.runInNewContext(output, {
    module,
    exports: module.exports,
    require: localRequire,
    console,
  }, { filename: sourcePath });
  return module.exports.PremiumCard;
}

function findPath(node, type, path = []) {
  if (!node || typeof node !== 'object') return null;
  const nextPath = [...path, node];
  if (node.type === type) return nextPath;
  const children = node.props?.children;
  const list = Array.isArray(children) ? children : [children];
  for (const child of list) {
    const match = findPath(child, type, nextPath);
    if (match) return match;
  }
  return null;
}

function findPaths(node, type, path = [], matches = []) {
  if (!node || typeof node !== 'object') return matches;
  const nextPath = [...path, node];
  if (node.type === type) matches.push(nextPath);
  const children = node.props?.children;
  const list = Array.isArray(children) ? children : [children];
  for (const child of list) findPaths(child, type, nextPath, matches);
  return matches;
}

function pressTarget(root, type, event) {
  const path = findPath(root, type);
  assert.ok(path, `${type} must be rendered by the real production primitive`);
  pressPath(path, event);
}

function pressPath(path, event) {
  const target = path[path.length - 1];
  target.props.onPress?.(event);
  for (let index = path.length - 2; index >= 0; index -= 1) {
    path[index].props?.onPress?.(event);
  }
}

const InteractiveSurface = loadProductionPrimitive();
const calls = [];
const callback = (event) => calls.push(event);
const event = { target: 'same-control-event' };
const tree = InteractiveSurface({
  onPress: callback,
  children: {
    type: 'TouchableOpacity',
    props: { onPress: callback, children: null },
  },
});

assert.equal(tree.type, 'View', 'the shared primitive must provide a non-interactive structural wrapper');
pressTarget(tree, 'Pressable', event);
assert.deepEqual(calls, [event], 'a parent press must fire the callback once with its event');
pressTarget(tree, 'TouchableOpacity', event);
assert.deepEqual(calls, [event, event], 'a child press must fire once and must not bubble into the parent');

const LiveMiniPlayer = loadProductionLiveMiniPlayer(InteractiveSurface);
const expandCalls = [];
const closeCalls = [];
const liveTree = LiveMiniPlayer({
  stream: { title: 'Live', subtitle: 'Test', isPlaying: true },
  onExpand: (value) => expandCalls.push(value),
  onClose: (value) => closeCalls.push(value),
});
const liveParentPath = findPath(liveTree, 'Pressable');
const liveChildPaths = findPaths(liveTree, 'TouchableOpacity');
assert.ok(liveParentPath, 'real LiveMiniPlayer must render the shared parent hit target');
assert.equal(liveChildPaths.length, 2, 'real LiveMiniPlayer must retain both child controls');
const liveSurface = liveParentPath[liveParentPath.length - 2];
const liveSurfaceChildren = Array.isArray(liveSurface.props.children)
  ? liveSurface.props.children
  : [liveSurface.props.children];
const liveContent = liveSurfaceChildren.find((node) => node?.type === 'View');
assert.ok(
  liveContent?.props?.style?.some((style) => style?.flexDirection === 'row'),
  'real LiveMiniPlayer row style must reach the production content wrapper',
);
pressTarget(liveTree, 'Pressable', event);
pressTarget(liveTree, 'TouchableOpacity', event);
assert.deepEqual(expandCalls, [event], 'LiveMiniPlayer parent callback must fire once with the event');
assert.deepEqual(closeCalls, [], 'the first LiveMiniPlayer child is play/pause, not close');
pressPath(liveChildPaths[1], event);
assert.deepEqual(closeCalls, [event], 'LiveMiniPlayer close callback must fire once with the same event');

const ToolsAccessiblePressable = loadProductionToolsAccessiblePressable(InteractiveSurface);
const toolsOuterCalls = [];
const toolsInnerCalls = [];
const toolsTree = ToolsAccessiblePressable({
  onPress: (value) => toolsOuterCalls.push(value),
  children: {
    type: 'Pressable',
    props: { onPress: (value) => toolsInnerCalls.push(value), children: null },
  },
});
const toolsPressables = findPaths(toolsTree, 'Pressable');
assert.equal(toolsPressables.length, 2, 'real Tools AccessiblePressable must retain its parent and child press targets');
pressPath(toolsPressables[0], event);
assert.deepEqual(toolsOuterCalls, [event], 'Tools hero body must fire its outer handler once');
assert.deepEqual(toolsInnerCalls, [], 'Tools hero body press must not fire the inner prayer handler');
pressPath(toolsPressables[1], event);
assert.deepEqual(toolsOuterCalls, [event], 'Tools inner prayer press must not bubble to the hero handler');
assert.deepEqual(toolsInnerCalls, [event], 'Tools inner prayer press must fire its handler once');

const PremiumCard = loadProductionPremiumCard(InteractiveSurface);
const cardOuterCalls = [];
const cardInnerCalls = [];
const cardTree = PremiumCard({
  onPress: (value) => cardOuterCalls.push(value),
  children: {
    type: 'TouchableOpacity',
    props: { onPress: (value) => cardInnerCalls.push(value), children: null },
  },
});
const cardParentPath = findPath(cardTree, 'Pressable');
const cardChildPath = findPath(cardTree, 'TouchableOpacity');
assert.ok(cardParentPath, 'real PremiumCard must render its parent press target');
assert.ok(cardChildPath, 'real PremiumCard must retain its child control');
pressPath(cardParentPath, event);
assert.deepEqual(cardOuterCalls, [event], 'Bookmark card body must fire its outer handler once');
assert.deepEqual(cardInnerCalls, [], 'Bookmark card body press must not fire delete');
pressPath(cardChildPath, event);
assert.deepEqual(cardOuterCalls, [event], 'Bookmark delete press must not bubble to the card handler');
assert.deepEqual(cardInnerCalls, [event], 'Bookmark delete press must fire exactly once');

console.log('PASS: production InteractiveSurface preserves one callback per parent/child press with the same argument');
