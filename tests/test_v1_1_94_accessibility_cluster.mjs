import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import ts from 'typescript';

const REPO_ROOT = path.resolve(import.meta.dirname, '..');
const TMP_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'a11y_cluster_'));

function qaComponent() {
  const component = function QaStubComponent() { return null; };
  component.__qaStub = true;
  return component;
}

const COMPONENTS = [
  'View', 'Pressable', 'TouchableOpacity', 'TouchableWithoutFeedback', 'Modal',
  'ScrollView', 'TextInput', 'ActivityIndicator', 'Image', 'FlatList',
  'SafeAreaView', 'KeyboardAvoidingView', 'Animated',
].reduce((acc, name) => {
  acc[name] = qaComponent();
  return acc;
}, {});

function animatedValue() {
  this.setValue = () => {};
  this.interpolate = () => 0;
}
COMPONENTS.Animated = {
  View: COMPONENTS.View,
  Value: animatedValue,
  timing: () => ({ start() {}, stop() {} }),
  loop: (animation) => ({ start: animation.start, stop: animation.stop }),
  sequence: (animations) => animations[0] || { start() {}, stop() {} },
};

const createElement = (type, props, ...children) => {
  const nextProps = { ...(props || {}) };
  if (children.length === 1) nextProps.children = children[0];
  else if (children.length > 1) nextProps.children = children;
  return { __qaElement: true, type, props: nextProps };
};

const ReactDefault = {
  createElement,
  memo: (component) => component,
  forwardRef: (component) => component,
  useState: null,
  useEffect: null,
  useMemo: null,
  useCallback: null,
  useRef: null,
};

const ReactExports = {
  default: ReactDefault,
  createElement,
  memo: ReactDefault.memo,
  forwardRef: ReactDefault.forwardRef,
  useState(init) {
    const value = typeof init === 'function' ? init() : init;
    return [value, () => {}];
  },
  useEffect() {},
  useMemo(factory) { return factory(); },
  useCallback(callback) { return callback; },
  useRef(value) { return { current: value }; },
};

// Components that use the default import (`import React from 'react'`) reach the
// hooks through ReactDefault. Wire the real hook stand-ins onto it so a loaded
// production component behaves the same whether it destructures or uses `React.x`.
Object.assign(ReactDefault, {
  useState: ReactExports.useState,
  useEffect: ReactExports.useEffect,
  useMemo: ReactExports.useMemo,
  useCallback: ReactExports.useCallback,
  useRef: ReactExports.useRef,
});

const styleSheet = {
  create(styles) { return styles; },
  absoluteFill: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
};

const rnExports = {
  ...COMPONENTS,
  StyleSheet: styleSheet,
  Platform: { OS: 'android' },
  AccessibilityInfo: {
    isReduceMotionEnabled: () => Promise.resolve(false),
    addEventListener: () => ({ remove() {} }),
  },
  PanResponder: {
    create: () => ({ panHandlers: {} }),
  },
  useWindowDimensions: () => ({ width: 390, height: 844, scale: 1, fontScale: 1 }),
  Alert: { alert() {} },
  ...Object.fromEntries(['AccessibilityRole', 'ColorValue'].map((name) => [name, undefined])),
};

const inertTokens = new Proxy({}, {
  get(target, property) {
    if (property === Symbol.toPrimitive) return () => '#000000';
    return '#000000';
  },
});

const themeTokens = {
  paper: inertTokens,
  ink: inertTokens,
};

function commonOverrides() {
  const appText = qaComponent();
  return {
    react: ReactExports,
    'react-native': rnExports,
    '@expo/vector-icons': { Ionicons: qaComponent() },
    'expo-linear-gradient': { LinearGradient: qaComponent() },
    'react-native-svg': { default: qaComponent(), Svg: qaComponent(), Path: qaComponent() },
    './ui/AppText': { AppText: appText },
    '../components/ui/AppText': { AppText: appText },
    '../lib/theme': { useTheme: () => ({ colors: inertTokens }) },
    // Emulate the real translator: return the key with any {{token}} placeholders
    // substituted, so a localization refactor does not hide the actual rendered value.
    '../lib/i18n': { isRTL: () => false, t: interpolateStub },
  };
}

function interpolateStub(key, vars) {
  if (!vars || typeof vars !== 'object') return key;
  return String(key).replace(/\{\{(\w+)\}\}/g, (match, name) =>
    Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : match
  );
}

function parseImports(source) {
  const sourceFile = ts.createSourceFile('component.tsx', source, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TSX);
  return sourceFile.statements
    .filter(ts.isImportDeclaration)
    .map((declaration) => {
      const clause = declaration.importClause;
      const names = [];
      let hasDefault = false;
      if (clause?.name) hasDefault = true;
      if (clause?.namedBindings && ts.isNamedImports(clause.namedBindings)) {
        for (const element of clause.namedBindings.elements) {
          names.push(element.propertyName?.text || element.name.text);
        }
      }
      return { specifier: declaration.moduleSpecifier.text, names, hasDefault };
    });
}

async function loadModule(relativePath, overrides) {
  const sourcePath = path.join(REPO_ROOT, relativePath);
  const source = fs.readFileSync(sourcePath, 'utf8');
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.React,
    },
    fileName: path.basename(sourcePath),
  }).outputText;

  const moduleDir = fs.mkdtempSync(path.join(TMP_DIR, 'module_'));
  const imports = parseImports(source);
  let rewritten = transpiled;
  const seen = new Map();
  for (const { specifier, names, hasDefault } of imports) {
    if (seen.has(specifier)) continue;
    const stubName = `stub_${seen.size}.mjs`;
    const stubPath = path.join(moduleDir, stubName);
    const specOverrides = overrides[specifier];

    // A `__realPath` override loads the real production module and re-exports it,
    // so the suite exercises that component's actual implementation instead of a
    // null stand-in. This matters for InteractiveSurface, whose job (a card's hit
    // target and its inner controls as SIBLINGS, not nested) is what the
    // accessibility cluster exists to verify.
    if (specOverrides && specOverrides.__realPath) {
      const realModule = await loadModule(specOverrides.__realPath, overrides);
      const realExports = [`export * from ${JSON.stringify(realModule.outputPath)};`];
      if (realModule.module && 'default' in realModule.module) {
        realExports.push(`export { default } from ${JSON.stringify(realModule.outputPath)};`);
      }
      fs.writeFileSync(stubPath, `${realExports.join('\n')}\n`);
      const realImportText = `from '${specifier}'`;
      rewritten = rewritten.split(realImportText).join(`from '${stubPath}'`);
      rewritten = rewritten.split(`from "${specifier}"`).join(`from "${stubPath}"`);
      seen.set(specifier, stubPath);
      continue;
    }

    const lines = [];
    for (const name of new Set(names)) {
      lines.push(`export const ${name} = globalThis.__qaOverrides[${JSON.stringify(specifier)}]?.[${JSON.stringify(name)}] ?? globalThis.__qaStub;`);
    }
    if (hasDefault) {
      lines.push(`export default globalThis.__qaOverrides[${JSON.stringify(specifier)}]?.default ?? globalThis.__qaStub;`);
    }
    if (!lines.length) lines.push('export default globalThis.__qaStub;');
    fs.writeFileSync(stubPath, lines.join('\n'));
    const importText = `from '${specifier}'`;
    const replacement = `from '${stubPath}'`;
    rewritten = rewritten.split(importText).join(replacement);
    rewritten = rewritten.split(`from "${specifier}"`).join(`from "${stubPath}"`);
    seen.set(specifier, stubPath);
  }

  const outputPath = path.join(moduleDir, 'production.mjs');
  fs.writeFileSync(outputPath, rewritten);
  globalThis.__qaStub = qaComponent();
  globalThis.__qaOverrides = { ...overrides };
  return { module: await import(outputPath), outputPath };
}

async function loadProductionComponent(relativePath, overrides) {
  return (await loadModule(relativePath, overrides)).module;
}

function materialize(value) {
  if (Array.isArray(value)) return value.map(materialize);
  if (!value || value.__qaElement !== true) return value;

  if (typeof value.type === 'function' && !value.type.__qaStub) {
    return materialize(value.type(value.props));
  }

  const props = { ...value.props };
  if (Object.prototype.hasOwnProperty.call(props, 'children')) {
    props.children = materialize(props.children);
  }
  return { ...value, props };
}

function elementsIn(value, result = []) {
  if (Array.isArray(value)) {
    value.forEach((item) => elementsIn(item, result));
    return result;
  }
  if (!value || value.__qaElement !== true) return result;
  result.push(value);
  elementsIn(value.props?.children, result);
  return result;
}

function childComponent() {
  return qaComponent();
}

const toolsOverrides = {
  ...commonOverrides(),
  // Exercise the REAL shared primitive: it is the component that guarantees the
  // card hit target and its inner controls stay siblings (no control-in-control).
  '../components/InteractiveSurface': { __realPath: 'src/components/InteractiveSurface.tsx' },
  '../components/layout/TabScreen': { TabScrollView: childComponent() },
  '../components/GeometricPattern': { GeometricPattern: childComponent() },
  '../lib/homeThemeTokens': {
    HOME_THEME_TOKENS: { hero: { outerBorder: '#000000', innerBorder: '#000000' } },
    getCardShadow: () => ({}),
    getHeroCardShadow: () => ({}),
  },
  '../theme/tokens': { themeTokens, GOLD_GRADIENT: ['#000000', '#000000'] },
  '../lib/settings': {
    persistLanguageChange: async () => {},
    useSettings: () => ({ settings: { locationMode: 'manual', autoLocation: null, manualLocation: null, methodId: 2 } }),
  },
  '../lib/useLocation': { useLocation: () => ({ location: null }) },
  '../lib/qibla': { qiblaBearing: () => 258 },
  '../lib/db': {
    getSalahEntries: () => ({}),
    computeStreak: () => 0,
    getSalahHistory: () => [],
    markSalahCompleted: () => {},
  },
  '../lib/prayerTimes': {
    fetchPrayerTimes: async () => null,
    getCachedPrayerTimes: () => null,
    getNextPrayer: () => null,
  },
  '../lib/fasting': { getHijriDate: () => ({ month: 1, day: 1 }) },
  '../lib/iconMap': { getForwardIcon: () => 'chevron-forward' },
};

const zakatOverrides = {
  ...commonOverrides(),
  '../components/layout/SubHeader': { SubHeader: childComponent() },
  '../components/layout/DetailScreen': { DetailScreen: childComponent() },
  '../components/Hairline': { Hairline: childComponent() },
  '../components/Card': { Card: childComponent() },
  '../components/EmptyState': { EmptyState: childComponent() },
  'expo-haptics': {
    impactAsync: async () => {},
    ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
  },
  'react-i18next': { useTranslation: () => ({ t: (key) => key }) },
  '../lib/i18n': { isRTL: () => false },
  '../theme/tokens': { useThemeTokens: () => ({ tokens: inertTokens, mode: 'paper' }) },
  '../lib/homeThemeTokens': { getCardShadow: () => ({}), getPillShadow: () => ({}) },
  '../lib/undoToast': { useUndoToast: () => ({ saveUndoState() {} }), withUndoToast: (component) => component },
  'react-native-safe-area-context': { useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) },
  '../lib/zakat': {
    SUPPORTED_CURRENCIES: [],
    getCurrencyConfig: () => ({ code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', goldPricePerGram: 250, silverPricePerGram: 3 }),
    calculateZakat: () => ({
      totalGrossAssets: 1000,
      netZakatableWealth: 1000,
      zakatDue: 25,
      nisabThreshold: 85,
      cashValue: 1000,
      goldValue: 0,
      silverValue: 0,
      investmentsValue: 0,
      otherAssetsValue: 0,
      totalLiabilities: 0,
      conversions: [],
      convertedDue: [],
    }),
    formatCurrencyAmount: (value) => String(value),
  },
  '../lib/db': {
    loadZakatCalculations: () => [],
    saveZakatCalculation: () => {},
    deleteZakatCalculation: () => {},
  },
  '../lib/womensFiqh': { formatYMD: (date) => date.toISOString().slice(0, 10) },
};

const womenOverrides = {
  ...commonOverrides(),
  'expo-haptics': {
    impactAsync: async () => {},
    notificationAsync: async () => {},
    ImpactFeedbackStyle: { Light: 'light' },
    NotificationFeedbackType: { Error: 'error' },
  },
  '../lib/privacy': {
    loadPinLockoutState: async () => ({ lockedUntil: 0 }),
    verifyPinDetailed: () => ({ valid: false }),
    recordFailedPinAttempt: async () => ({ locked: false, remainingSeconds: 0 }),
    resetPinLockoutState: async () => {},
    persistUpgradedPinHash: async () => {},
    hashPin: () => 'hash',
  },
};

const audioOverrides = {
  ...commonOverrides(),
  '../lib/iconMap': { iconSizes: {} },
  '../lib/quranAudio': {},
  '../lib/formatDuration': { formatProgress: () => '0:00' },
  '../lib/rtl': { calculateTimelineRatio: () => 0 },
};

const countdownOverrides = commonOverrides();

const toolsModule = await loadProductionComponent('src/screens/ToolsScreen.tsx', toolsOverrides);
const toolsTree = materialize(toolsModule.default({ onOpen() {}, isActive: false }));
const toolsElements = elementsIn(toolsTree);
const hero = toolsElements.find((element) => element.props.testID === 'tools-card-salah-hero');
assert.ok(hero, 'Salah hero must render');
assert.equal(hero.props.accessible, false, 'The hero container must not swallow its accessible children');
const prayerToggles = toolsElements.filter((element) => (
  element.props.accessibilityRole === 'button'
  && element.props.accessibilityState
  && Object.prototype.hasOwnProperty.call(element.props.accessibilityState, 'selected')
));
assert.equal(prayerToggles.length, 5, 'Each of the five prayer toggles must be independently focusable');
for (const toggle of prayerToggles) {
  assert.equal(toggle.props.accessible, true);
  assert.equal(typeof toggle.props.accessibilityLabel, 'string');
  assert.equal(typeof toggle.props.accessibilityState.selected, 'boolean');
  assert.equal(typeof toggle.props.onPress, 'function');
}

const zakatModule = await loadProductionComponent('src/screens/ZakatScreen.tsx', zakatOverrides);
const zakatTree = materialize(zakatModule.default({ onBack() {} }));
const zakatElements = elementsIn(zakatTree);
const nisabOptions = zakatElements.filter((element) => element.props.accessibilityRole === 'radio');
assert.equal(nisabOptions.length, 2, 'Both nisab options must expose radio semantics');
assert.deepEqual(nisabOptions.map((element) => element.props.accessibilityState?.selected), [true, false]);

const womenModule = await loadProductionComponent('src/components/WomenPinModal.tsx', womenOverrides);
const womenTree = materialize(womenModule.WomenPinModal({
  visible: true,
  mode: 'set',
  currentHash: null,
  onSuccess() {},
  onCancel() {},
}));
const womenElements = elementsIn(womenTree);
const modalContent = womenElements.find((element) => element.props.accessibilityViewIsModal === true);
assert.ok(modalContent, 'PIN modal content must isolate VoiceOver focus');
assert.equal(modalContent.props.importantForAccessibility, 'yes', 'PIN modal content must be important to TalkBack');

const audioModule = await loadProductionComponent('src/components/AudioMiniPlayer.tsx', audioOverrides);
const audioTree = materialize(audioModule.AudioMiniPlayer({
  playback: { title: 'Al-Fatihah', reciterName: 'Reciter', surahNumber: 1, ayahNumber: 1 },
  status: { isPlaying: false, isBuffering: false, positionMillis: 0, durationMillis: 1000 },
  onPlayPause() {},
  onStop() {},
  onOpenAudio() {},
  onSeek() {},
}));
const progress = elementsIn(audioTree).find((element) => (
  typeof element.props.onLayout === 'function' && typeof element.props.onTouchEnd === 'function'
));
assert.ok(progress, 'Audio seek control must render');
const progressStyle = Array.isArray(progress.props.style)
  ? Object.assign({}, ...progress.props.style.filter(Boolean))
  : progress.props.style;
assert.equal(progressStyle.height, 3, 'The visible seek line must remain 3px tall');
assert.ok(progress.props.hitSlop, 'The seek control must expose an enlarged touch target');
assert.ok(
  progressStyle.height + progress.props.hitSlop.top + progress.props.hitSlop.bottom >= 44,
  'The seek control hit target must be at least 44dp tall',
);

const countdownModule = await loadProductionComponent('src/components/PrayerCountdown.tsx', countdownOverrides);
const boundary = new Date(2026, 0, 1, 12, 0, 0, 0);
assert.equal(countdownModule.getPrayerCountdownMilliseconds('12:00', boundary), 0, 'Prayer minute boundary must expire immediately');
for (const variant of ['inline', 'tiles']) {
  const tree = materialize(countdownModule.PrayerCountdown({ targetTime: '12:01', variant }));
  const liveElement = elementsIn(tree).find((element) => element.props.accessibilityRole === 'text');
  assert.ok(liveElement, `${variant} countdown must remain accessible`);
  assert.equal(liveElement.props.accessibilityLiveRegion, 'none', `${variant} countdown must not announce each tick`);
  assert.match(liveElement.props.accessibilityLabel, /^Countdown \d{2}:\d{2}:\d{2}$/);
}

console.log('Accessibility cluster production-render tests passed.');
