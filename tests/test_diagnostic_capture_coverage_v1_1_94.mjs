/**
 * FOCUSED SUITE: diagnostic recorder capture coverage (v1.1.94)
 *
 * Every assertion executes the REAL production modules - SettingsScreen.tsx and
 * src/lib/diagnostic/* - through a mini CommonJS loader that transpiles the on-disk
 * TypeScript and renders it with the real React server renderer. Only genuine
 * platform/library modules (react-native, expo-*, theme tokens) are stubbed.
 *
 * Each guarantee is checked GREEN against production code and RED against a mutant
 * built from the real source with the production change reverted, so an unnoticed
 * regression fails this suite.
 *
 * Run: node tests/test_diagnostic_capture_coverage_v1_1_94.mjs
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const ROOT = path.resolve(import.meta.dirname, '..');
const rel = (abs) => path.relative(ROOT, abs).split(path.sep).join('/');
const readSrc = (relPath) => fs.readFileSync(path.join(ROOT, relPath), 'utf8');
const DIAG_DIR = path.join(ROOT, 'src/lib/diagnostic');
const REAL_MODULES = new Set([
  'src/screens/SettingsScreen.tsx',
  ...fs.readdirSync(DIAG_DIR).map((f) => `src/lib/diagnostic/${f}`),
]);

console.log('=== DIAGNOSTIC CAPTURE COVERAGE SUITE (v1.1.94) ===\n');

// ---------------------------------------------------------------------------
// 0. Build identity (real config source)
// ---------------------------------------------------------------------------
const diagConfigSource = readSrc('src/lib/diagnostic/diagnosticConfig.ts');
assert.ok(
  diagConfigSource.includes('export const DIAGNOSTIC_BUILD_ID = `RTL-STRUCT-${DIAGNOSTIC_VERSION}-EVIDENCE`'),
  'DIAGNOSTIC_BUILD_ID must stay derived from DIAGNOSTIC_VERSION'
);
const APP_VERSION = JSON.parse(readSrc('app.json')).expo.version;
const EXPECTED_BUILD_ID = `RTL-STRUCT-${APP_VERSION}-EVIDENCE`;
console.log(`--- Build identity: ${EXPECTED_BUILD_ID} ---\n`);

// ---------------------------------------------------------------------------
// Mini CommonJS loader over the real sources (+ optional mutations)
// ---------------------------------------------------------------------------
const TRANSPILED = new Map();
function transpile(absPath, source) {
  // Keyed on the SOURCE, not just the path: mutation universes transpile a modified
  // copy of the same file and must not reuse the pristine output.
  const key = `${absPath}\u0000${source}`;
  if (!TRANSPILED.has(key)) {
    TRANSPILED.set(
      key,
      ts.transpileModule(source, {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React },
        fileName: absPath,
      }).outputText
    );
  }
  return TRANSPILED.get(key);
}

function resolveRelative(fromFile, id) {
  const base = path.resolve(path.dirname(fromFile), id);
  for (const candidate of [base, `${base}.ts`, `${base}.tsx`, path.join(base, 'index.ts'), path.join(base, 'index.tsx')]) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  }
  return null;
}

const stubLog = new Set();
/** Permissive stand-in for a library/view-only module (never a diagnostic module). */
function magicStub(id) {
  stubLog.add(id);
  return new Proxy(function Stub() {}, {
    get: () => undefined,
    apply: () => null,
    construct: () => ({}),
  });
}

/**
 * Isolated "universe": one fresh instance of every real module, so diagnostic state
 * never leaks between scenarios. `mutations` maps repo-relative paths to { from, to }
 * replacements applied to the on-disk source (this is how RED mutation checks revert
 * a production change).
 */
function createUniverse({ gateOn = true, language = 'en', isRTL = false, appIsRtl, mutations = {} } = {}) {
  const cache = new Map();
  const hosts = [];
  const world = { language, isRTL, gateOn, appIsRtl };

  const hostComponent = (name) => {
    const Comp = (props) => {
      hosts.push({ name, props });
      // A lowercase host tag keeps React from warning about component casing; the props
      // are captured above and the testID is emitted so markup assertions can find it.
      return React.createElement(
        `host-${name.toLowerCase()}`,
        props.testID ? { 'data-testid': props.testID } : null,
        props.children ?? null
      );
    };
    Comp.displayName = `Host(${name})`;
    return Comp;
  };

  const tokensProxy = new Proxy({}, { get: (_t, prop) => (prop === 'shadow' ? { light: {}, dark: {} } : '#000000') });
  const reactNativeStub = {
    Platform: { OS: 'android', select: (obj) => (obj && 'android' in obj ? obj.android : obj?.default) },
    I18nManager: {
      get isRTL() {
        return world.isRTL;
      },
      allowRTL() {},
      forceRTL() {},
      getConstants: () => ({ isRTL: world.isRTL }),
    },
    StyleSheet: { create: (s) => s, flatten: (s) => s || {}, hairlineWidth: 1, absoluteFill: {} },
    Appearance: { getColorScheme: () => 'light' },
    Dimensions: { get: () => ({ width: 360, height: 740 }) },
    useWindowDimensions: () => ({ width: 360, height: 740 }),
    View: hostComponent('View'),
    Text: hostComponent('Text'),
    Pressable: hostComponent('Pressable'),
    TouchableOpacity: hostComponent('TouchableOpacity'),
    ScrollView: hostComponent('ScrollView'),
    Image: hostComponent('Image'),
    ActivityIndicator: hostComponent('ActivityIndicator'),
    Modal: hostComponent('Modal'),
    Alert: { alert: () => {} },
    Linking: { openURL: async () => {} },
    Clipboard: { setString: () => {} },
    Share: { share: async () => ({ action: 'sharedAction' }) },
    BackHandler: { addEventListener: () => ({ remove() {} }) },
    AccessibilityInfo: { isReduceMotionEnabled: async () => false, addEventListener: () => ({ remove() {} }) },
  };

  const appHelpersRtl = () =>
    world.appIsRtl === undefined ? /^(ur|ar|ps)\b/i.test(String(world.language || '')) : Boolean(world.appIsRtl);
  const i18nStub = {
    __esModule: true,
    default: { get language() { return world.language; } },
    isRTL: () => appHelpersRtl(),
    isRtlLanguage: (lang) => /^(ur|ar|ps)\b/i.test(String(lang || '').trim()),
    getBootLanguage: () => world.language,
    getCurrentLanguage: () => world.language,
    setAppLanguage: () => {},
    prepareNativeLayoutDirection: () => {},
    resolvePersistedLanguage: async () => world.language,
    t: (key) => key,
    useIsRTL: () => appHelpersRtl(),
    useTranslation: () => ({ i18n: { language: world.language } }),
  };

  const themeStub = {
    useTheme: () => ({ mode: 'light', colors: tokensProxy, tokens: tokensProxy }),
    getCardShadow: () => ({}),
    useThemeTokens: () => ({ mode: 'light', tokens: tokensProxy }),
  };

  const mocks = {
    react: React,
    'react-native': reactNativeStub,
    '../components/ui/AppText': { AppText: hostComponent('AppText') },
    '../theme/tokens': {
      useThemeTokens: themeStub.useThemeTokens,
      getTokens: () => tokensProxy,
      cardTokens: { shadow: { light: {}, dark: {} } },
      getBrandLogoSource: () => null,
    },
    '../lib/theme': themeStub,
    '../lib/i18n': i18nStub,
    '../i18n': i18nStub,
    '../../app.json': JSON.parse(readSrc('app.json')),
    '../../components/diagnostic/RtlDiagnosticModal': { RtlDiagnosticModal: () => null },
    '@expo/vector-icons': { Ionicons: hostComponent('Ionicons') },
    'expo-linear-gradient': { LinearGradient: hostComponent('LinearGradient') },
    'expo-sharing': { isAvailableAsync: async () => false, shareAsync: async () => {} },
    'expo-file-system/legacy': { documentDirectory: '/tmp/', cacheDirectory: '/tmp/', writeAsStringAsync: async () => {} },
  };

  const requireFrom = (fromFile, id) => {
    if (Object.prototype.hasOwnProperty.call(mocks, id)) return mocks[id];
    const resolved = resolveRelative(fromFile, id);
    const relPath = resolved ? rel(resolved) : null;
    const isJson = relPath && relPath.endsWith('.json');
    if (!resolved || (!isJson && !REAL_MODULES.has(relPath))) {
      if (id.startsWith('.') && !resolved) {
        throw new Error(`Unresolved relative import "${id}" from ${rel(fromFile)}`);
      }
      return magicStub(id);
    }
    if (cache.has(resolved)) return cache.get(resolved).exports;
    if (isJson) {
      const value = JSON.parse(fs.readFileSync(resolved, 'utf8'));
      cache.set(resolved, { exports: value });
      return value;
    }

    let source = readSrc(relPath);
    for (const mutation of mutations[relPath] || []) {
      assert.ok(
        source.includes(mutation.from),
        `mutation anchor must exist in ${relPath}: ${JSON.stringify(mutation.from.slice(0, 70))}`
      );
      source = source.replace(mutation.from, mutation.to);
    }

    const module = { exports: {} };
    cache.set(resolved, module);
    const code = transpile(resolved, source);
    // The real realm (not a vm sandbox): hooks, timers and React must be the actual ones.
    const fn = new Function('require', 'module', 'exports', '__filename', '__dirname', code);
    fn((childId) => requireFrom(resolved, childId), module, module.exports, resolved, path.dirname(resolved));
    return module.exports;
  };

  const entry = path.join(ROOT, 'src/screens/SettingsScreen.tsx');
  // The two-factor gate is evaluated at CALL time from process.env, so the env for a
  // universe is set when it is created and deliberately left in place: every universe
  // is created and exercised inside one synchronous (or awaited) step.
  if (gateOn) {
    process.env.EXPO_PUBLIC_ANDROID_DIAGNOSTIC = '1';
    process.env.EXPO_PUBLIC_DIAGNOSTIC_BUILD_ID = EXPECTED_BUILD_ID;
  } else {
    delete process.env.EXPO_PUBLIC_ANDROID_DIAGNOSTIC;
    delete process.env.EXPO_PUBLIC_DIAGNOSTIC_BUILD_ID;
    delete process.env.EXPO_PUBLIC_BUILD_IDENTITY;
  }

  const universe = {
    world,
    hosts,
    hostProps: (name) => hosts.filter((h) => h.name === name).map((h) => h.props),
    lastHostProps: (name) => {
      const all = hosts.filter((h) => h.name === name);
      return all.length ? all[all.length - 1].props : undefined;
    },
    diagConfig: requireFrom(entry, '../lib/diagnostic/diagnosticConfig'),
    diagState: requireFrom(entry, '../lib/diagnostic/diagnosticState'),
    diagContext: requireFrom(entry, '../lib/diagnostic/diagnosticScreenContext'),
    SettingsScreen: requireFrom(entry, './SettingsScreen'),
    load: (relPath) => requireFrom(path.join(ROOT, relPath), `./${path.basename(relPath)}`),
    reset: () => {
      universe.diagState.resetDiagnosticProbes();
      hosts.length = 0;
    },
  };
  liveUniverses.push(universe);
  return universe;
}

// ---------------------------------------------------------------------------
// Assertion helpers: GREEN on production, RED on a reverted mutant
// ---------------------------------------------------------------------------
let greenCount = 0;
let redCount = 0;

/**
 * Every universe that loads the app barrel also installs the boot observer (that is the
 * production wiring under test), so process-level hooks are released between checks.
 */
const liveUniverses = [];
function cleanupUniverses() {
  for (const universe of liveUniverses.splice(0)) {
    try {
      universe.diagState.restoreDiagnosticErrorInterceptor();
      universe.diagState.restoreDiagnosticUnhandledRejectionInterceptor();
      universe.diagState.restoreDiagnosticNetworkInterceptor();
    } catch {
      /* a mutated universe may not expose every hook */
    }
  }
  delete globalThis.ErrorUtils;
}

function expectGreen(label, fn) {
  fn();
  cleanupUniverses();
  greenCount++;
  console.log(`  ✓ GREEN  ${label}`);
}
async function expectGreenAsync(label, fn) {
  await fn();
  cleanupUniverses();
  greenCount++;
  console.log(`  ✓ GREEN  ${label}`);
}
function expectRed(label, fn) {
  let reason = '';
  let failed = false;
  try {
    fn();
  } catch (err) {
    failed = true;
    reason = String(err && err.message ? err.message : err).split('\n')[0].slice(0, 120);
  }
  assert.ok(failed, `mutation must break this guarantee (it stayed GREEN): ${label}`);
  cleanupUniverses();
  redCount++;
  console.log(`  ✓ RED    ${label}\n             ${reason}`);
}
async function expectRedAsync(label, fn) {
  let reason = '';
  let failed = false;
  try {
    await fn();
  } catch (err) {
    failed = true;
    reason = String(err && err.message ? err.message : err).split('\n')[0].slice(0, 120);
  }
  assert.ok(failed, `mutation must break this guarantee (it stayed GREEN): ${label}`);
  cleanupUniverses();
  redCount++;
  console.log(`  ✓ RED    ${label}\n             ${reason}`);
}

/** Renders the real Settings `Row` inside the real diagnostic screen provider. */
function renderRow(universe, props) {
  const tree = React.createElement(
    universe.diagContext.DiagScreenProvider,
    { name: 'Settings' },
    React.createElement(universe.SettingsScreen.Row, props)
  );
  renderToStaticMarkup(tree);
  return universe.lastHostProps('Pressable');
}

function pressRow(universe, props) {
  const host = renderRow(universe, props);
  assert.equal(typeof host.onPress, 'function', 'the rendered row must expose an onPress');
  host.onPress();
  return universe.diagState.getInteractionLedger();
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ===========================================================================
// U1: a real press on the real Settings row is recorded
// ===========================================================================
function guaranteeRowPressRecorded(universe) {
  universe.reset();
  const pressed = [];
  const ledger = pressRow(universe, {
    title: 'Font Size',
    probeId: 'font-size',
    onPress: () => {
      pressed.push(1);
      // A real settings row mutates app state; this is the production probe API the
      // interaction effect classifier watches.
      universe.diagState.recordProbeLayout('Settings::AppText::probe#1', 'AppText', 'Settings', {
        x: 0,
        y: 0,
        width: 10,
        height: 10,
      });
    },
  });
  assert.equal(pressed.length, 1, 'the original handler must still run');
  assert.equal(ledger.length, 1, 'exactly one interaction must be recorded');
  const entry = ledger[0];
  assert.equal(entry.id, 'Settings::row::font-size', 'the id must be screen::kind::name');
  assert.equal(entry.screen, 'Settings', 'screen must be captured');
  assert.equal(entry.language, 'ur', 'language must be captured');
  assert.equal(entry.theme, 'light', 'theme must be captured');
  assert.equal(entry.handlerPresent, true);
  assert.equal(entry.disabled, false);
  assert.equal(entry.effect, 'stateChanged', 'a handler that changes app state must classify as stateChanged');
}

expectGreen('U1 real Settings Row press records Settings::row::font-size (screen/language/theme/effect)', () =>
  guaranteeRowPressRecorded(createUniverse({ gateOn: true, language: 'ur', isRTL: true }))
);
expectRed('U1 revert: Row onPress is no longer wrapped -> press is not recorded', () =>
  guaranteeRowPressRecorded(
    createUniverse({
      gateOn: true,
      language: 'ur',
      isRTL: true,
      mutations: {
        'src/screens/SettingsScreen.tsx': [
          { from: 'onPress={probeId ? rowProbe.onPress : onPress}', to: 'onPress={onPress}' },
        ],
      },
    })
  )
);

{
  const universe = createUniverse({ gateOn: true, language: 'ur', isRTL: true });
  guaranteeRowPressRecorded(universe);
  await sleep(320);
  const ledger = universe.diagState.getInteractionLedger();
  assert.equal(ledger.length, 1);
  assert.equal(ledger[0].effect, 'stateChanged', 'effect must stay truthful after the 250 ms re-check');
  expectGreen('U1 effect is still truthful after the delayed re-check', () => {});
}

// ===========================================================================
// U1: switch and stepper are instrumented too
// ===========================================================================
function guaranteeSwitchAndStepperRecorded(universe) {
  universe.reset();
  const tree = React.createElement(
    universe.diagContext.DiagScreenProvider,
    { name: 'Settings' },
    React.createElement(
      React.Fragment,
      null,
      React.createElement(universe.SettingsScreen.Toggle, { checked: false, onChange: () => {}, probeId: 'women-lock' }),
      React.createElement(universe.SettingsScreen.AdjustRow, {
        label: 'Font Size',
        valueLabel: '20',
        min: 14,
        max: 30,
        step: 1,
        value: 20,
        onChange: () => {},
        probeId: 'font-size',
      })
    )
  );
  renderToStaticMarkup(tree);

  const toggle = universe.hostProps('Pressable').find((p) => p.accessibilityRole === 'switch');
  assert.ok(toggle, 'the switch must render a host pressable');
  toggle.onPress();
  const ledger = universe.diagState.getInteractionLedger();
  assert.equal(ledger.length, 1, 'the switch press must be recorded');
  assert.equal(ledger[0].id, 'Settings::switch::women-lock');

  const ids = universe.diagState.getControlRegistry().map((c) => c.id);
  for (const expected of [
    'Settings::stepper::font-size-decrease',
    'Settings::stepper::font-size-increase',
    'Settings::stepper::font-size-track',
  ]) {
    assert.ok(ids.includes(expected), `${expected} must be registered`);
  }
}

expectGreen('U1 switch + stepper are instrumented with readable ids', () =>
  guaranteeSwitchAndStepperRecorded(createUniverse({ gateOn: true }))
);
expectRed('U1 revert: Toggle is no longer probed -> switch press is not recorded', () =>
  guaranteeSwitchAndStepperRecorded(
    createUniverse({
      gateOn: true,
      mutations: {
        'src/screens/SettingsScreen.tsx': [
          { from: 'onPress={probeId ? switchProbe.onPress : onChange}', to: 'onPress={onChange}' },
        ],
      },
    })
  )
);

// ===========================================================================
// U1 gate OFF: zero wrappers, zero timers, host props unchanged
// ===========================================================================
const HOST_ROW_PROP_KEYS = [
  'accessibilityLabel',
  'accessibilityRole',
  'accessibilityState',
  'children',
  'hitSlop',
  'onPress',
  'style',
  'testID',
];

function guaranteeGateOffIsFree(universe) {
  universe.reset();
  const realOnPress = () => {};
  let timerCalls = 0;
  const realSetTimeout = globalThis.setTimeout;
  const realClearTimeout = globalThis.clearTimeout;
  globalThis.setTimeout = (...args) => {
    timerCalls++;
    return realSetTimeout(...args);
  };
  let props;
  try {
    const tree = React.createElement(
      universe.diagContext.DiagScreenProvider,
      { name: 'Settings' },
      React.createElement(universe.SettingsScreen.Row, {
        title: 'Font Size',
        probeId: 'font-size',
        testID: 'row-font-size',
        onPress: realOnPress,
      })
    );
    renderToStaticMarkup(tree);
    props = universe.lastHostProps('Pressable');
    assert.ok(props, 'the row must render a host pressable');
    props.onPress();
    props.onPress();
  } finally {
    globalThis.setTimeout = realSetTimeout;
    globalThis.clearTimeout = realClearTimeout;
  }

  assert.equal(props.onPress, realOnPress, "gate off: the host must receive the caller's own handler, unwrapped");
  assert.equal(props.testID, 'row-font-size', 'gate off: testID must pass through unchanged');
  assert.deepEqual(Object.keys(props).sort(), HOST_ROW_PROP_KEYS, 'gate off: no extra props may reach the host element');
  assert.equal(timerCalls, 0, 'gate off: zero timers created');
  assert.equal(universe.diagState.getInteractionLedger().length, 0, 'gate off: zero interactions');
  assert.equal(universe.diagState.getControlRegistry().length, 0, 'gate off: zero controls registered');
  assert.equal(universe.diagState.getErrorLedger().length, 0, 'gate off: zero errors');
  assert.equal(universe.diagState.getAutoProbes().length, 0, 'gate off: zero probes');
  assert.equal(universe.diagState.getDiagnosticListenerCount(), 0, 'gate off: zero listeners');
  assert.equal(universe.diagState.getLanguageSwitchAttempts().length, 0, 'gate off: zero switch attempts');
  assert.equal(universe.diagState.isErrorInterceptorInstalled(), false, 'gate off: error interceptor must not install');
  assert.equal(
    universe.diagState.isUnhandledRejectionInterceptorInstalled(),
    false,
    'gate off: rejection interceptor must not install'
  );
  assert.equal(universe.diagState.isDiagnosticAppStateObserverInstalled(), false, 'gate off: observer must not install');
  const before = process.listenerCount('unhandledRejection');
  universe.diagState.installDiagnosticAppStateObserver();
  assert.equal(process.listenerCount('unhandledRejection'), before, 'gate off: zero process listeners added');
  assert.equal(process.env.EXPO_PUBLIC_ANDROID_DIAGNOSTIC, undefined, 'gate off: no env flag is faked');
}

expectGreen('U1 gate OFF: zero wrappers/timers/listeners, host props identical', () =>
  guaranteeGateOffIsFree(createUniverse({ gateOn: false }))
);
expectRed('U1 revert: gate-off path returns a wrapper anyway -> host props change', () =>
  guaranteeGateOffIsFree(
    createUniverse({
      gateOn: false,
      mutations: {
        'src/lib/diagnostic/diagnosticState.ts': [
          {
            from:
              "  if (!isEnabled) {\n    // Hard gate: the caller's exact props, no wrapper of any kind.\n    return { onPress: options?.onPress, testID: options?.testID, controlId: '' };\n  }",
            to: "  if (!isEnabled) {\n    return { onPress: (e?: any) => options?.onPress?.(e), testID: options?.testID, controlId: '' };\n  }",
          },
        ],
      },
    })
  )
);

// ===========================================================================
// U2: press-handler errors reach the ledger with the control id, grouped
// ===========================================================================
function guaranteePressErrorRecorded(universe) {
  universe.reset();
  const props = renderRow(universe, {
    title: 'Font Size',
    probeId: 'font-size',
    onPress: () => {
      throw new Error('db write failed');
    },
  });
  assert.throws(() => props.onPress(), /db write failed/, 'the handler error must still propagate to the caller');

  const errors = universe.diagState.getErrorLedger();
  assert.equal(errors.length, 1, 'exactly one error entry');
  const entry = errors[0];
  assert.equal(entry.controlId, 'Settings::row::font-size', 'the error must name the control that triggered it');
  assert.equal(entry.source, 'press');
  assert.equal(entry.screen, 'Settings');
  assert.equal(entry.language, 'ur');
  assert.equal(entry.theme, 'light');
  assert.equal(entry.occurrences, 1);

  const ledger = universe.diagState.getInteractionLedger();
  assert.equal(ledger.length, 1, 'the interaction record must be discoverable next to it');
  assert.equal(ledger[0].effect, 'error');
  assert.equal(ledger[0].errorName, 'Error');
  assert.equal(ledger[0].id, errors[0].controlId, 'both records must carry the same control id');

  const groups = universe.diagState.buildDiagnosticReport().errors.groups;
  assert.equal(groups.length, 1, 'errors.groups must group the failure');
  assert.equal(groups[0].controlId, 'Settings::row::font-size');
  assert.equal(groups[0].screen, 'Settings');
  assert.equal(groups[0].source, 'press');
  assert.equal(groups[0].occurrences, 1);
  assert.ok(groups[0].errorClass.startsWith('Error'), 'the group must carry a coarse error class');
}

expectGreen('U2 press-handler error reaches the ledger with control id + is grouped', () =>
  guaranteePressErrorRecorded(createUniverse({ gateOn: true, language: 'ur', isRTL: true }))
);
expectRed('U2 revert: press errors no longer recorded -> error ledger stays empty', () =>
  guaranteePressErrorRecorded(
    createUniverse({
      gateOn: true,
      language: 'ur',
      isRTL: true,
      mutations: {
        'src/lib/diagnostic/diagnosticState.ts': [
          {
            from: "    recordDiagnosticRuntimeError(err, { screen: preScreen, controlId: spec.id, source: 'press' });\n",
            to: '',
          },
        ],
      },
    })
  )
);

// ===========================================================================
// U2: render errors are recorded by the boundary instead of blanking
// ===========================================================================
function guaranteeRenderErrorRecorded(universe) {
  universe.reset();
  const { DiagErrorBoundary } = universe.diagContext;
  assert.equal(typeof DiagErrorBoundary, 'function', 'the gated error boundary must exist');

  const boundary = new DiagErrorBoundary({ screen: 'Settings', children: React.createElement('div', null, 'screen content') });

  // Healthy tree: the boundary must be a transparent pass-through.
  const healthy = renderToStaticMarkup(boundary.render());
  assert.ok(healthy.includes('screen content'), 'a healthy tree must render through the boundary untouched');
  assert.ok(!healthy.includes('diag-render-error-fallback'), 'no fallback may render while the tree is healthy');

  // A render failure: the real class lifecycle React would drive (getDerivedStateFromError
  // then componentDidCatch). react-dom's offline renderers do not invoke boundaries, and a
  // live RN renderer is not available off-device, so the production class is driven directly.
  const error = new Error('render exploded');
  const derived = DiagErrorBoundary.getDerivedStateFromError(error);
  assert.equal(derived.hasError, true, 'getDerivedStateFromError must switch the boundary into the error state');
  assert.equal(derived.error, error);
  boundary.state = derived;
  boundary.componentDidCatch(error, { componentStack: '' });

  const errors = universe.diagState.getErrorLedger();
  assert.equal(errors.length, 1, 'the render failure must be recorded exactly once');
  assert.equal(errors[0].source, 'render');
  assert.equal(errors[0].screen, 'Settings');
  assert.equal(errors[0].errorName, 'Error');
  assert.equal(errors[0].treeStillRenders, true);

  const fallback = renderToStaticMarkup(boundary.render());
  assert.ok(
    fallback.includes('diag-render-error-fallback'),
    `the boundary must render a diagnostic fallback instead of blanking, got: ${fallback.slice(0, 140)}`
  );
  assert.ok(!fallback.includes('screen content'), 'the failed subtree must not be rendered again');
  assert.equal(universe.diagState.buildDiagnosticReport().errors.total, 1);
}

expectGreen('U2 render error is recorded by the boundary and a fallback renders (not blank)', () =>
  guaranteeRenderErrorRecorded(createUniverse({ gateOn: true }))
);
expectRed('U2 revert: componentDidCatch no longer records -> render error is lost', () =>
  guaranteeRenderErrorRecorded(
    createUniverse({
      gateOn: true,
      mutations: {
        'src/lib/diagnostic/diagnosticScreenContext.tsx': [
          {
            from: "    if (!isDiagnosticModeEnabled()) return;\n    const screen = this.props.screen || getGlobalActiveScreen() || 'App';",
            to: '    if (true) return;',
          },
        ],
      },
    })
  )
);

// ===========================================================================
// U2 gate OFF: the boundary is invisible - exactly as if it were not there
// ===========================================================================
function guaranteeGateOffBoundaryInvisible(universe) {
  universe.reset();
  const { DiagErrorBoundary } = universe.diagContext;
  const child = React.createElement('div', null, 'screen content');
  const boundary = new DiagErrorBoundary({ screen: 'Settings', children: child });
  const healthy = renderToStaticMarkup(boundary.render());
  assert.ok(healthy.includes('screen content'), 'gate off: children render untouched');
  assert.equal(Object.keys(healthy).length > 0, true);

  // Even in the error state the gate-off boundary must keep rendering the children.
  boundary.state = { hasError: true, error: new Error('render exploded') };
  const errored = renderToStaticMarkup(boundary.render());
  assert.ok(errored.includes('screen content'), 'gate off: no fallback may replace the screen tree');
  assert.ok(!errored.includes('diag-render-error-fallback'), 'gate off: the diagnostic fallback must not exist');
  boundary.componentDidCatch(new Error('render exploded'), { componentStack: '' });
  assert.equal(universe.diagState.getErrorLedger().length, 0, 'gate off: nothing is recorded');
}

expectGreen('U2 gate OFF: the error boundary behaves exactly like no boundary at all', () =>
  guaranteeGateOffBoundaryInvisible(createUniverse({ gateOn: false }))
);
expectRed('U2 revert: boundary ignores the gate -> a gate-off build shows the diagnostic fallback', () =>
  guaranteeGateOffBoundaryInvisible(
    createUniverse({
      gateOn: false,
      mutations: {
        'src/lib/diagnostic/diagnosticScreenContext.tsx': [
          { from: '  render(): React.ReactNode {\n    if (!isDiagnosticModeEnabled()) {\n      return this.props.children;\n    }', to: '  render(): React.ReactNode {' },
        ],
      },
    })
  )
);

// ===========================================================================
// U2: unhandled promise rejections + global JS errors are captured, class-only
// ===========================================================================
function restoreAllInterceptors(universe) {
  universe.diagState.restoreDiagnosticErrorInterceptor();
  universe.diagState.restoreDiagnosticUnhandledRejectionInterceptor();
  universe.diagState.restoreDiagnosticNetworkInterceptor();
  delete globalThis.ErrorUtils;
}

async function guaranteeAsyncErrorsCaptured(universe) {
  universe.reset();
  // The deliberate rejection below must not kill the test process when a mutant has
  // removed the production hook: the assertion is about the diagnostic ledger, and this
  // guard only keeps Node from re-throwing.
  const guard = () => {};
  process.on('unhandledRejection', guard);
  try {
    await guaranteeAsyncErrorsCapturedBody(universe);
  } finally {
    process.removeListener('unhandledRejection', guard);
    restoreAllInterceptors(universe);
  }
}

async function guaranteeAsyncErrorsCapturedBody(universe) {
  universe.diagState.installDiagnosticAppStateObserver();
  assert.equal(universe.diagState.isUnhandledRejectionInterceptorInstalled(), true, 'the rejection hook must install');

  // A REAL unhandled rejection in this process.
  void Promise.reject(new Error('network request failed at https://secret.example/token=abc'));
  await sleep(30);

  const asyncErrors = universe.diagState.getErrorLedger().filter((e) => e.source === 'async');
  assert.equal(asyncErrors.length, 1, 'one async failure must be captured');
  assert.equal(asyncErrors[0].errorName, 'Error');
  assert.ok(asyncErrors[0].messageClass.includes('network'), 'a coarse class, never the message text');
  const serialized = JSON.stringify(asyncErrors[0]);
  assert.ok(!serialized.includes('secret.example'), 'no URL may be recorded');
  assert.ok(!serialized.includes('token=abc'), 'no token may be recorded');
  assert.ok(!serialized.includes('network request failed'), 'no free-text message may be recorded');

  // Global JS error through the real ErrorUtils hook, preserving the previous handler.
  const handled = [];
  globalThis.ErrorUtils = {
    _handler: (err) => handled.push(err),
    getGlobalHandler() {
      return this._handler;
    },
    setGlobalHandler(fn) {
      this._handler = fn;
    },
  };
  try {
    universe.diagState.installDiagnosticErrorInterceptor();
    assert.equal(universe.diagState.isErrorInterceptorInstalled(), true);
    globalThis.ErrorUtils.getGlobalHandler()(new TypeError('cannot read property of undefined'), false);
    assert.equal(handled.length, 1, 'the original global handler must still run');
    const globalErrors = universe.diagState.getErrorLedger().filter((e) => e.source === 'global');
    assert.equal(globalErrors.length, 1, 'the global JS error must be captured');
    assert.equal(globalErrors[0].errorName, 'TypeError');
    assert.ok(!JSON.stringify(globalErrors[0]).includes('cannot read property'), 'no free-text message may be recorded');
  } finally {
    delete globalThis.ErrorUtils;
  }

  // One failing control pressed twice collapses into one entry with an honest count.
  universe.reset();
  const props = renderRow(universe, {
    title: 'Font Size',
    probeId: 'font-size',
    onPress: () => {
      throw new Error('db write failed');
    },
  });
  assert.throws(() => props.onPress());
  assert.throws(() => props.onPress());
  const pressErrors = universe.diagState.getErrorLedger().filter((e) => e.source === 'press');
  assert.equal(pressErrors.length, 1, 'a repeated identical failure must be one entry');
  assert.equal(pressErrors[0].occurrences, 2, 'with an honest occurrence count');
  const group = universe.diagState.buildDiagnosticReport().errors.groups[0];
  assert.equal(group.occurrences, 2);
}

await expectGreenAsync('U2 unhandled rejection + global JS error captured class-only, repeats counted', () =>
  guaranteeAsyncErrorsCaptured(createUniverse({ gateOn: true }))
);
await expectRedAsync('U2 revert: rejection host hook removed -> async failure is lost', () =>
  guaranteeAsyncErrorsCaptured(
    createUniverse({
      gateOn: true,
      mutations: {
        'src/lib/diagnostic/diagnosticState.ts': [
          { from: "  if (typeof process !== 'undefined' && typeof (process as any).on === 'function') {", to: '  if (false) {' },
        ],
      },
    })
  )
);

// ===========================================================================
// U3: coverage reports instrumented vs actually pressed, honestly
// ===========================================================================
function guaranteeCoverageIsHonest(universe) {
  universe.reset();
  renderRow(universe, { title: 'Font Size', probeId: 'font-size', onPress: () => {} });
  renderRow(universe, { title: 'Line Height', probeId: 'line-height', onPress: () => {} });

  let report = universe.diagState.buildDiagnosticReport();
  assert.equal(report.coverage.interactiveControls.totalInstrumented, 2);
  assert.equal(report.coverage.interactiveControls.totalPressed, 0, 'nothing pressed yet');
  assert.equal(report.coverage.interactiveControls.coveragePercent, 0);
  assert.deepEqual(report.coverage.interactiveControls.unpressedControlIds, [
    'Settings::row::font-size',
    'Settings::row::line-height',
  ]);
  assert.deepEqual(report.coverage.interactiveControls.unpressedScreensWithInstrumentedControls, ['Settings']);
  assert.deepEqual(report.coverage.unpressedScreensWithInstrumentedControls, ['Settings']);
  assert.equal(report.summary.instrumentedControls, 2);
  assert.equal(report.summary.pressedControls, 0);

  pressRow(universe, { title: 'Font Size', probeId: 'font-size', onPress: () => {} });
  report = universe.diagState.buildDiagnosticReport();
  assert.equal(report.coverage.interactiveControls.totalInstrumented, 2);
  assert.equal(report.coverage.interactiveControls.totalPressed, 1);
  assert.equal(report.coverage.interactiveControls.coveragePercent, 50);
  assert.deepEqual(report.coverage.interactiveControls.unpressedControlIds, ['Settings::row::line-height']);
  assert.deepEqual(report.coverage.interactiveControls.byScreen.Settings.pressed, ['Settings::row::font-size']);
  assert.equal(report.summary.pressedControls, 1);
  assert.equal(report.appState.controls.pressedCount, 1);
}

expectGreen('U3 coverage reports instrumented (2) vs pressed (1) and names the untouched control', () =>
  guaranteeCoverageIsHonest(createUniverse({ gateOn: true }))
);
expectRed('U3 revert: pressed count inflated -> an untouched control is reported as pressed', () =>
  guaranteeCoverageIsHonest(
    createUniverse({
      gateOn: true,
      mutations: {
        'src/lib/diagnostic/diagnosticState.ts': [
          {
            from: '    totalPressed: pressedCount,\n    unpressedCount: records.length - pressedCount,',
            to: '    totalPressed: records.length,\n    unpressedCount: records.length - pressedCount,',
          },
        ],
      },
    })
  )
);

// ===========================================================================
// U4: stuck-disabled controls are flagged (the reported bug)
// ===========================================================================
function guaranteeStuckDisabledDetected(universe) {
  universe.reset();
  const threshold = universe.diagState.STUCK_DISABLED_THRESHOLD_MS;
  assert.ok(threshold > 0 && threshold <= 10000, 'the threshold must be bounded and small');

  renderRow(universe, { title: 'Font Size', probeId: 'font-size', disabled: true, onPress: () => {} });
  const now = Date.now();

  assert.deepEqual(universe.diagState.evaluateStuckControls(now), [], 'a freshly disabled control is not stuck');
  const stuck = universe.diagState.evaluateStuckControls(now + threshold + 1);
  assert.equal(stuck.length, 1, 'a control disabled past the threshold must be flagged');
  assert.equal(stuck[0].id, 'Settings::row::font-size');

  const appState = universe.diagState.buildDiagnosticAppState(now + threshold + 1);
  assert.equal(appState.controls.stuckDisabledCount, 1);
  assert.deepEqual(appState.controls.stuckControlIds, ['Settings::row::font-size']);
  assert.equal(appState.controls.totalDisabled, 1);
  assert.equal(appState.defectsByClass.stuckDisabledControl, 1, 'app-state defect counts must be present');
  const defect = appState.defects.find((d) => d.defectClass === 'stuckDisabledControl');
  assert.ok(defect, 'a stuckDisabledControl defect entry must be raised');
  assert.equal(defect.controlId, 'Settings::row::font-size');
  assert.equal(defect.screen, 'Settings');

  // At the real clock the control is disabled but not yet stuck: the report must say so
  // honestly, and start flagging it once the bounded threshold has actually elapsed.
  let report = universe.diagState.buildDiagnosticReport();
  assert.equal(report.appState.controls.totalDisabled, 1, 'the report must carry the live appState section');
  assert.equal(report.appState.controls.stuckDisabledCount, 0, 'a freshly disabled control is not reported as stuck');
  assert.equal(report.summary.stuckDisabledControls, 0);
  assert.equal(report.summary.instrumentedControls, 1);
  return report;
}

async function guaranteeStuckSurfacesInReportAfterRealDelay(universe) {
  universe.reset();
  const threshold = universe.diagState.STUCK_DISABLED_THRESHOLD_MS;
  renderRow(universe, { title: 'Font Size', probeId: 'font-size', disabled: true, onPress: () => {} });
  // Wait the real bounded threshold: this is the reported case (a control left disabled
  // for the whole session), exercised end to end through buildDiagnosticReport().
  await sleep(threshold + 250);
  const report = universe.diagState.buildDiagnosticReport();
  assert.equal(report.appState.controls.stuckDisabledCount, 1, 'the report must flag a genuinely stuck control');
  assert.deepEqual(report.appState.controls.stuckControlIds, ['Settings::row::font-size']);
  assert.equal(report.summary.stuckDisabledControls, 1);
  assert.ok(
    report.appState.defects.some((d) => d.defectClass === 'stuckDisabledControl'),
    'the defect entry must be in the report'
  );
}

expectGreen('U4 a control disabled past the bounded threshold raises stuckDisabledControl', () =>
  guaranteeStuckDisabledDetected(createUniverse({ gateOn: true }))
);
expectRed('U4 revert: Row stops reporting its disabled state -> stuck control is never detected', () =>
  guaranteeStuckDisabledDetected(
    createUniverse({
      gateOn: true,
      mutations: {
        'src/screens/SettingsScreen.tsx': [
          { from: "usePressProbe(probeId || '', 'row', { onPress, disabled })", to: "usePressProbe(probeId || '', 'row', { onPress })" },
        ],
      },
    })
  )
);

await expectGreenAsync('U4 after the real threshold elapses, buildDiagnosticReport flags the stuck control', () =>
  guaranteeStuckSurfacesInReportAfterRealDelay(createUniverse({ gateOn: true }))
);

// ===========================================================================
// U4: language-switch attempts, the never-cleared lock, and completed switches
// ===========================================================================
function guaranteeLanguageSwitchAttempt(universe) {
  universe.reset();
  const handle = universe.diagState.beginLanguageSwitch('en', 'ur', { reloadRequested: true });
  assert.ok(handle.id, 'a real attempt must return a handle');
  renderRow(universe, { title: 'Font Size', probeId: 'font-size', disabled: true, onPress: () => {} });

  const past = Date.now() + universe.diagState.STUCK_DISABLED_THRESHOLD_MS + 1;
  const appState = universe.diagState.buildDiagnosticAppState(past);

  assert.equal(appState.languageSwitchAttempts.total, 1);
  const attempt = appState.languageSwitchAttempts.items[0];
  assert.equal(attempt.fromLanguage, 'en');
  assert.equal(attempt.toLanguage, 'ur');
  assert.equal(attempt.reloadRequested, true);
  assert.equal(
    attempt.status,
    'noRestartObserved',
    'a switch still pending long after the request never restarted the app'
  );
  assert.ok(attempt.elapsedMs > universe.diagState.STUCK_DISABLED_THRESHOLD_MS);
  // The lock never cleared, so the controls it gates are stuck: the reported bug.
  assert.deepEqual(appState.controls.stuckControlIds, ['Settings::row::font-size']);

  // A completed switch is reported resolved and no longer explains a stuck lock.
  universe.reset();
  const done = universe.diagState.beginLanguageSwitch('en', 'ur', { reloadRequested: false });
  assert.equal(universe.diagState.getLanguageSwitchAttempts()[0].status, 'pending');
  done.markResolved();
  const resolved = universe.diagState.getLanguageSwitchAttempts()[0];
  assert.equal(resolved.status, 'resolved');
  assert.ok(resolved.elapsedMs >= 0 && typeof resolved.completedAt === 'string');
  // First outcome wins: a late fail-safe must not rewrite a recorded rejection.
  const rejected = universe.diagState.beginLanguageSwitch('en', 'ar', { reloadRequested: true });
  rejected.markRejected(new Error('save failed'));
  rejected.markNoRestart();
  assert.equal(universe.diagState.getLanguageSwitchAttempts()[1].status, 'rejected');
  assert.equal(universe.diagState.getLanguageSwitchAttempts()[1].errorClass, 'Error');
}

expectGreen('U4 switch attempt + never-cleared lock -> noRestartObserved + stuck controls; resolved/rejected honest', () =>
  guaranteeLanguageSwitchAttempt(createUniverse({ gateOn: true }))
);
expectRed('U4 revert: pending attempts never age out -> a dead switch looks permanently fine', () =>
  guaranteeLanguageSwitchAttempt(
    createUniverse({
      gateOn: true,
      mutations: {
        'src/lib/diagnostic/diagnosticState.ts': [
          { from: "    if (copy.status === 'pending' && age > STUCK_DISABLED_THRESHOLD_MS) {", to: '    if (false) {' },
        ],
      },
    })
  )
);

// ===========================================================================
// U4: language/direction disagreement is a recorded defect
// ===========================================================================
function guaranteeDirectionMismatchRecorded(universe) {
  universe.reset();
  const verdict = universe.diagState.evaluateConsistency();
  const expectedRtl = /^(ur|ar|ps)\b/i.test(String(universe.world.language));
  const appIsRtl = universe.world.appIsRtl === undefined ? expectedRtl : Boolean(universe.world.appIsRtl);

  assert.equal(verdict.persistedLanguage, universe.world.language);
  assert.equal(verdict.resolvedLanguage, universe.world.language);
  assert.equal(verdict.i18nManagerIsRTL, universe.world.isRTL);
  assert.equal(verdict.appDirection, appIsRtl ? 'rtl' : 'ltr');

  const nativeDisagrees = universe.world.isRTL !== expectedRtl;
  const helperDisagrees = appIsRtl !== expectedRtl;
  const shouldMismatch = nativeDisagrees || helperDisagrees || universe.world.persistedDiffers === true;

  if (shouldMismatch) {
    assert.equal(verdict.agrees, false, 'language and direction must be reported as disagreeing');
    assert.equal(verdict.verdict, 'languageDirectionMismatch');
    assert.ok(verdict.reason && verdict.reason.length > 0, 'the reason must say which signal disagrees');
    if (nativeDisagrees) assert.ok(verdict.reason.includes('I18nManager.isRTL'), 'native disagreement must be named');
    if (helperDisagrees) assert.ok(verdict.reason.includes('direction helper'), 'helper disagreement must be named');
  } else {
    assert.equal(verdict.agrees, true, 'a matching language/direction pair must agree');
    assert.equal(verdict.verdict, 'consistent');
    assert.equal(verdict.reason, undefined);
  }

  universe.diagState.recordConsistencyCheck();
  const stored = universe.diagState.getLastConsistencyVerdict();
  assert.ok(stored, 'recordConsistencyCheck must store the verdict');
  const appState = universe.diagState.buildDiagnosticAppState();
  assert.equal(appState.consistency.verdict, verdict.verdict);

  const defect = appState.defects.find((d) => d.defectClass === 'languageDirectionMismatch');
  if (shouldMismatch) {
    assert.ok(defect, 'a mismatch must produce a languageDirectionMismatch defect entry');
    assert.ok(defect.reason.length > 0, 'the defect entry must explain the disagreement');
    const report = universe.diagState.buildDiagnosticReport();
    // App-state defects keep their own counts; the probe defect contract is untouched.
    assert.equal(report.appState.defectsByClass.languageDirectionMismatch, 1);
    assert.equal(report.appState.defects.length, 1);
    assert.equal(report.appState.consistency.verdict, 'languageDirectionMismatch');
    assert.deepEqual(
      Object.keys(report.defects.countsByClass).sort(),
      [
        'fixedHeightTextRisk',
        'lineBoxTooTight',
        'lineOverlap',
        'offScreen',
        'outsideParent',
        'rtlTextAlignMismatch',
        'rtlWritingDirectionSuspicious',
        'siblingOverlap',
        'subTouchTarget',
        'textClipped',
        'textRectOverlap',
        'textTruncated',
      ].sort(),
      'countsByClass must stay the probe-defect contract (app-state defects are counted in appState)'
    );
    assert.equal(report.defects.totalDefects, 0, 'app-state defects must not inflate the probe defect total');
  } else {
    assert.equal(defect, undefined, 'a consistent app must raise no defect');
    assert.equal(appState.defects.length, 0);
  }
}

expectGreen('U4 half-switched app (ur + native LTR) records languageDirectionMismatch', () =>
  guaranteeDirectionMismatchRecorded(createUniverse({ gateOn: true, language: 'ur', isRTL: false }))
);
expectGreen('U4 broken app-direction helper (ur + native RTL) records languageDirectionMismatch', () =>
  guaranteeDirectionMismatchRecorded(createUniverse({ gateOn: true, language: 'ur', isRTL: true, appIsRtl: false }))
);
expectGreen('U4 consistent app records no language/direction defect', () =>
  guaranteeDirectionMismatchRecorded(createUniverse({ gateOn: true, language: 'en', isRTL: false }))
);
expectGreen('U4 consistent RTL app records no language/direction defect', () =>
  guaranteeDirectionMismatchRecorded(createUniverse({ gateOn: true, language: 'ur', isRTL: true }))
);
expectRed('U4 revert: native direction no longer compared -> a half-switched app looks consistent', () =>
  guaranteeDirectionMismatchRecorded(
    createUniverse({
      gateOn: true,
      language: 'ur',
      isRTL: false,
      mutations: {
        'src/lib/diagnostic/diagnosticState.ts': [{ from: '  if (i18nManagerIsRTL !== expectedRtl) {', to: '  if (false) {' }],
      },
    })
  )
);
expectRed('U4 revert: app-direction helper no longer compared -> a self-inconsistent app looks fine', () =>
  guaranteeDirectionMismatchRecorded(
    createUniverse({
      gateOn: true,
      language: 'ur',
      isRTL: true,
      appIsRtl: false,
      mutations: {
        'src/lib/diagnostic/diagnosticState.ts': [{ from: '  if (appIsRtl !== expectedRtl) {', to: '  if (false) {' }],
      },
    })
  )
);

// ===========================================================================
// gate OFF: the boot observer and every recording entry point are inert
// ===========================================================================
function guaranteeGateOffObserverIsInert(universe) {
  universe.reset();
  const listenersBefore = process.listenerCount('unhandledRejection');
  try {
    guaranteeGateOffObserverIsInertBody(universe, listenersBefore);
  } finally {
    restoreAllInterceptors(universe);
  }
}

function guaranteeGateOffObserverIsInertBody(universe, listenersBefore) {
  universe.diagState.installDiagnosticAppStateObserver();
  assert.equal(process.listenerCount('unhandledRejection'), listenersBefore, 'zero process listeners');
  assert.equal(universe.diagState.isDiagnosticAppStateObserverInstalled(), false);
  assert.equal(universe.diagState.getLastConsistencyVerdict(), null, 'no verdict recorded with the gate off');
  universe.diagState.recordConsistencyCheck();
  assert.equal(universe.diagState.getLastConsistencyVerdict(), null);
  const handle = universe.diagState.beginLanguageSwitch('en', 'ur');
  assert.equal(handle.id, '');
  handle.markResolved();
  handle.markNoRestart();
  handle.markRejected(new Error('x'));
  handle.markReloadRequested();
  assert.equal(universe.diagState.getLanguageSwitchAttempts().length, 0);
  universe.diagState.recordControlState('Settings::row::font-size', 'row', 'Settings', true);
  assert.equal(universe.diagState.getControlRegistry().length, 0);
  assert.deepEqual(universe.diagState.evaluateStuckControls(Date.now() + 60000), []);
  universe.diagState.recordControlPress('Settings::row::font-size');
  assert.equal(universe.diagState.getControlRegistry().length, 0);
  assert.equal(universe.diagState.recordDiagnosticRuntimeError(new Error('x')), null, 'error recording is inert');
}

expectGreen('gate OFF: observer, switch attempts, control registry and error recording are all inert', () =>
  guaranteeGateOffObserverIsInert(createUniverse({ gateOn: false }))
);
expectRed('gate OFF revert: observer installs without the gate -> process listener appears', () =>
  guaranteeGateOffObserverIsInert(
    createUniverse({
      gateOn: false,
      mutations: {
        'src/lib/diagnostic/diagnosticState.ts': [
          {
            from: 'export function installDiagnosticAppStateObserver(): void {\n  if (!isDiagnosticModeEnabled()) return;',
            to: 'export function installDiagnosticAppStateObserver(): void {',
          },
        ],
      },
    })
  )
);

// ===========================================================================
// The app's own barrel () wires the observer at import time - gate ON only
// ===========================================================================
function guaranteeBarrelBootWiring() {
  const on = process.listenerCount('unhandledRejection');
  const universe = createUniverse({ gateOn: true });
  const barrel = universe.load('src/lib/diagnostic/index.ts');
  for (const required of [
    'usePressProbe',
    'wrapControlPress',
    'recordControlState',
    // Every name SettingsScreen imports from the barrel must actually be re-exported:
    // a missing re-export is undefined at runtime, not a compile error, on device.
    'noteControlPress',
    'beginLanguageSwitch',
    'recordConsistencyCheck',
    'buildDiagnosticAppState',
    'buildInteractiveControlCoverage',
    'installDiagnosticAppStateObserver',
    'DiagErrorBoundary',
    'STUCK_DISABLED_THRESHOLD_MS',
  ]) {
    assert.ok(
      typeof barrel[required] === 'function' || typeof barrel[required] === 'number',
      `the app barrel must export ${required}`
    );
  }
  assert.equal(
    universe.diagState.isDiagnosticAppStateObserverInstalled(),
    true,
    'importing the barrel must install the observer (gate ON)'
  );
  assert.equal(process.listenerCount('unhandledRejection'), on + 1, 'the barrel import must add the rejection hook');
  universe.diagState.restoreDiagnosticUnhandledRejectionInterceptor();
}

expectGreen("the app's diagnostic barrel installs the observer at import time (gate ON)", () =>
  guaranteeBarrelBootWiring()
);
expectRed('barrel revert: boot install call removed -> observer never installed', () => {
  const on = process.listenerCount('unhandledRejection');
  const universe = createUniverse({
    gateOn: true,
    mutations: { 'src/lib/diagnostic/index.ts': [{ from: '\ninstallDiagnosticAppStateObserver();\n', to: '\n' }] },
  });
  const barrel = universe.load('src/lib/diagnostic/index.ts');
  void barrel;
  assert.equal(universe.diagState.isDiagnosticAppStateObserverInstalled(), true, 'observer must be installed');
  assert.equal(process.listenerCount('unhandledRejection'), on + 1, 'the rejection hook must be installed');
});

// ===========================================================================
// Privacy: only ids, never user-facing text
// ===========================================================================
function guaranteeNoUserContent(universe) {
  universe.reset();
  const props = renderRow(universe, {
    title: 'Secret User Note',
    desc: 'my private reminder text',
    probeId: 'font-size',
    onPress: () => {},
  });
  props.onPress();
  const payload = JSON.stringify(universe.diagState.buildDiagnosticReport());
  assert.ok(!payload.includes('Secret User Note'), 'no row title may be recorded');
  assert.ok(!payload.includes('my private reminder text'), 'no row description may be recorded');
  assert.ok(payload.includes('Settings::row::font-size'), 'the control id must be recorded');
}

expectGreen('privacy: control ids only, never the row title/description text', () =>
  guaranteeNoUserContent(createUniverse({ gateOn: true }))
);
expectRed('privacy revert: row title leaks into the recorded id', () =>
  guaranteeNoUserContent(
    createUniverse({
      gateOn: true,
      mutations: {
        'src/screens/SettingsScreen.tsx': [
          {
            from: "  const rowProbe = usePressProbe(probeId || '', 'row', { onPress, disabled });",
            to: "  const rowProbe = usePressProbe(probeId ? `${probeId}-${title}` : '', 'row', { onPress, disabled });",
          },
        ],
      },
    })
  )
);

// ===========================================================================
// U1: mapped inline rows (Settings language rows) - registered on render, press noted
// ===========================================================================
function guaranteeInlineMappedRow(universe) {
  universe.reset();
  const id = 'Settings::row::language-ur';
  // Exactly what the language row does while it renders and when it is tapped.
  universe.diagState.recordControlState(id, 'row', 'Settings', false);
  assert.equal(universe.diagState.getControlRegistry().length, 1, 'the row must be registered while it renders');
  universe.diagState.noteControlPress(id, 'row', 'Settings', { disabled: false });

  const ledger = universe.diagState.getInteractionLedger();
  assert.equal(ledger.length, 1, 'the tap must be recorded');
  assert.equal(ledger[0].id, id);
  assert.equal(ledger[0].screen, 'Settings');
  assert.equal(ledger[0].language, universe.world.language);
  assert.equal(ledger[0].handlerPresent, true);
  const registered = universe.diagState.getControlRegistry()[0];
  assert.equal(registered.pressCount, 1, 'the press must count toward coverage');

  // A language row gated on the switch lock: registered as disabled, and stuck once the
  // bounded threshold passes with the lock never cleared (the reported symptom).
  universe.diagState.recordControlState(id, 'row', 'Settings', true);
  const past = Date.now() + universe.diagState.STUCK_DISABLED_THRESHOLD_MS + 1;
  assert.deepEqual(universe.diagState.evaluateStuckControls(past).map((c) => c.id), [id]);

  // And the production screen really wires it this way.
  const screenSource = readSrc('src/screens/SettingsScreen.tsx');
  assert.ok(
    screenSource.includes("probeControlState('row', `language-${opt.value}`, isSwitchingLanguage)"),
    'the language row must register itself while it renders'
  );
  assert.ok(
    screenSource.includes("noteProbedPress('row', `language-${opt.value}`, isSwitchingLanguage)"),
    'the language row must note the press inside its own handler'
  );
  assert.ok(
    screenSource.includes('onPress={onSelectLanguage}'),
    'the row handler must stay the element\'s own onPress reference'
  );
}

expectGreen('U1 mapped language row: registered on render, press noted, stuck-disabled detectable', () =>
  guaranteeInlineMappedRow(createUniverse({ gateOn: true, language: 'ur', isRTL: true }))
);
expectRed('U1 revert: the press note is dropped -> mapped-row presses vanish from the ledger', () =>
  guaranteeInlineMappedRow(
    createUniverse({
      gateOn: true,
      language: 'ur',
      isRTL: true,
      mutations: {
        'src/lib/diagnostic/diagnosticState.ts': [
          { from: 'export function noteControlPress(\n  controlId: string,\n  kind: string,\n  screen: string,\n  options?: { disabled?: boolean; targetScreen?: string }\n): void {\n  if (!isDiagnosticModeEnabled() || !controlId) return;', to: 'export function noteControlPress(\n  controlId: string,\n  kind: string,\n  screen: string,\n  options?: { disabled?: boolean; targetScreen?: string }\n): void {\n  if (true) return;' },
        ],
      },
    })
  )
);

// ---------------------------------------------------------------------------
assert.equal(
  process.listenerCount('unhandledRejection'),
  0,
  'the suite must release every process-level diagnostic listener it installed'
);
console.log(`\n${greenCount} guarantees GREEN on production code; ${redCount} mutation checks confirmed RED.`);
console.log(`(stubbed platform modules: ${[...stubLog].sort().join(', ')})`);
console.log('=== CAPTURE COVERAGE SUITE PASSED ===');
