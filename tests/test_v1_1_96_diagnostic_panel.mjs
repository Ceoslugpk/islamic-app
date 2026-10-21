import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

const ROOT = path.resolve(import.meta.dirname, '..');

function loadTsModule(relativePath, mocks = {}, extraSandbox = {}) {
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
  const moduleObject = { exports: {} };
  const sandbox = {
    module: moduleObject,
    exports: moduleObject.exports,
    require: (request) => {
      assert.ok(request in mocks, `Unexpected production import from ${relativePath}: ${request}`);
      return mocks[request];
    },
    console,
    process,
    globalThis,
    Set,
    Map,
    Promise,
    Error,
    TypeError,
    String,
    Boolean,
    Number,
    Array,
    Object,
    Math,
    Date,
    JSON,
    URL,
    Blob: typeof Blob === 'undefined' ? class {} : Blob,
    TextEncoder: typeof TextEncoder === 'undefined' ? undefined : TextEncoder,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    ...extraSandbox,
  };
  vm.createContext(sandbox);
  vm.runInContext(output, sandbox, { filename });
  return moduleObject.exports;
}

function createDiagnosticStateHarness() {
  const diagnosticConfig = loadTsModule('src/lib/diagnostic/diagnosticConfig.ts');
  const pendingEffects = [];
  const React = {
    useState: (initial) => [typeof initial === 'function' ? initial() : initial, () => {}],
    useEffect: (effect) => pendingEffects.push(effect),
    useCallback: (callback) => callback,
    useContext: () => undefined,
  };
  const diagnosticState = loadTsModule('src/lib/diagnostic/diagnosticState.ts', {
    react: React,
    'react-native': {
      I18nManager: { isRTL: false },
      Platform: { OS: 'android' },
      Share: { share: async () => ({ action: 'sharedAction' }) },
      Clipboard: { setString: () => {} },
      StyleSheet: { flatten: (style) => style || {} },
      Dimensions: { get: () => ({ width: 360, height: 740 }) },
      Appearance: { getColorScheme: () => 'light' },
    },
    'expo-sharing': {},
    'expo-file-system/legacy': {},
    '../i18n': {
      default: { language: 'en' },
      isRTL: () => false,
      isRtlLanguage: () => false,
      getBootLanguage: () => 'en',
    },
    './diagnosticI18n': {
      getDiagnosticShareTitle: () => 'Diagnostic report',
      getDiagnosticShareDialogTitle: () => 'Diagnostic report',
    },
    './diagnosticConfig': diagnosticConfig,
    './diagnosticScreenContext': {
      useDiagScreen: () => 'Settings',
      useDiagParent: () => undefined,
      getGlobalActiveScreen: () => 'Settings',
      setDiagErrorRecorder: () => {},
    },
    './diagnosticScreens': { KNOWN_SCREENS: [] },
  });
  return { diagnosticConfig, diagnosticState, pendingEffects };
}

function makeEmptyReport() {
  const zeroDefects = {
    totalDefects: 0,
    countsByClass: {
      textTruncated: 0,
      lineBoxTooTight: 0,
      textClipped: 0,
      lineOverlap: 0,
      textRectOverlap: 0,
      subTouchTarget: 0,
      offScreen: 0,
      outsideParent: 0,
      siblingOverlap: 0,
      rtlTextAlignMismatch: 0,
      rtlWritingDirectionSuspicious: 0,
      fixedHeightTextRisk: 0,
    },
    items: [],
  };
  const controls = {
    totalInstrumented: 0,
    pressedCount: 0,
    totalDisabled: 0,
    stuckDisabledCount: 0,
    stuckControlIds: [],
  };
  return {
    timestamp: new Date().toISOString(),
    buildId: 'test-build',
    version: 'test',
    versionCode: 0,
    locale: 'en',
    theme: 'light',
    directionHelperResult: 'ltr',
    i18nManagerIsRTL: false,
    probeCount: 0,
    probes: [],
    probesTruncated: false,
    totalProbes: 0,
    includedProbes: 0,
    probesKept: 'all',
    defects: zeroDefects,
    interactions: { total: 0, countsByEffect: { navigated: 0, stateChanged: 0, noObservableEffect: 0, error: 0 }, items: [] },
    languageMatrix: { mismatchCount: 0, items: [] },
    themeMatrix: { mismatchCount: 0, items: [] },
    network: { summary: { total: 0, ok: 0, failed: 0, transportFailures: 0, timeouts: 0, offlineFallbacks: 0 }, items: [] },
    errors: { total: 0, items: [], groups: [] },
    appState: {
      consistency: { agrees: true, verdict: 'agree', persistedLanguage: 'en', resolvedLanguage: 'en', appDirection: 'ltr', i18nManagerIsRTL: false, reason: '' },
      languageSwitchAttempts: { total: 0, pendingCount: 0, items: [] },
      controls,
      defects: [],
    },
    coverage: {
      screensVisited: [],
      screensUnvisited: [],
      visitedCount: 0,
      unvisitedCount: 0,
      coveragePercent: 0,
      interactiveControls: { totalInstrumented: 0, totalPressed: 0, totalDisabled: 0, coveragePercent: 0, unpressedScreensWithInstrumentedControls: [] },
      unpressedScreensWithInstrumentedControls: [],
    },
    coverageVerdict: '',
    summary: { probeCount: 0, totalDefects: 0, interactionCount: 0, networkRequestCount: 0, errorCount: 0, visitedScreensCount: 0, instrumentedControls: 0, pressedControls: 0, stuckDisabledControls: 0, appStateDefects: 0 },
    screensVisited: [],
    screensUnvisited: [],
    measurements: [],
  };
}

function createModalHarness() {
  const effectCallbacks = [];
  let registeredListener = null;
  let notificationStatsCalls = 0;
  let reportSizeCalls = 0;
  let summarySizeCalls = 0;
  const report = makeEmptyReport();
  const React = {
    useState: (initial) => [typeof initial === 'function' ? initial() : initial, () => {}],
    useEffect: (effect) => effectCallbacks.push(effect),
    useCallback: (callback) => callback,
    useMemo: (factory) => factory(),
    memo: (component) => component,
    createElement: (type, props, ...children) => ({
      type,
      props: { ...(props || {}), children: children.length <= 1 ? children[0] : children },
    }),
  };
  const diagnostic = {
    getTargetMeasurements: () => [],
    getAutoProbes: () => [],
    KNOWN_SCREENS: [],
    addDiagnosticListener: (listener) => {
      registeredListener = listener;
      return () => { registeredListener = null; };
    },
    buildDiagnosticReport: () => report,
    exportDiagnosticReport: async () => ({ success: true }),
    exportDiagnosticSummary: async () => ({ success: true }),
    flushDiagnosticNotifications: () => {},
    getDiagnosticNotificationStats: () => {
      notificationStatsCalls += 1;
      return { requested: notificationStatsCalls, delivered: 0, coalesced: 0 };
    },
    getDiagnosticListenerCount: () => 1,
    formatByteSize: (bytes) => `${bytes} B`,
    getEstimatedReportSizeBytes: () => {
      reportSizeCalls += 1;
      return 100 + reportSizeCalls;
    },
    getEstimatedSummarySizeBytes: () => {
      summarySizeCalls += 1;
      return 50 + summarySizeCalls;
    },
  };
  const DiagScreenProvider = (props) => React.createElement('DiagScreenProvider', props, props.children);
  const modal = loadTsModule('src/components/diagnostic/RtlDiagnosticModal.tsx', {
    react: React,
    'react-native': {
      Modal: 'Modal',
      View: 'View',
      ScrollView: 'ScrollView',
      StyleSheet: { create: (styles) => styles, hairlineWidth: 1 },
      TouchableOpacity: 'TouchableOpacity',
      I18nManager: { isRTL: false },
      Clipboard: { setString: () => {} },
    },
    'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' },
    '@expo/vector-icons': { Ionicons: 'Ionicons' },
    '../ui/AppText': { AppText: 'AppText' },
    '../ui/PremiumCard': { PremiumCard: 'PremiumCard' },
    '../ui/PrimaryButton': { PrimaryButton: 'PrimaryButton' },
    '../ui/OutlineButton': { OutlineButton: 'OutlineButton' },
    '../../theme/tokens': { useThemeTokens: () => ({ mode: 'paper', tokens: { bgTop: '#fff', bgRaised: '#fff', text: '#111', textMuted: '#777', cardBorder: '#ddd', accent: '#b8862f', accentDim: '#eadcbf', danger: '#c00', eyebrow: '#b8862f' } }) },
    '../../lib/theme': { getCardShadow: () => ({}) },
    '../../lib/i18n': { default: { language: 'en' }, isRTL: () => false, t: (key) => key },
    '../../lib/diagnostic/diagnosticI18n': { diagT: (key) => key, getLocalizedMeasurementStatus: (key) => key, getLocalizedExportStatus: (key) => key, getLocalizedUnavailabilityReason: (key) => key },
    '../../lib/diagnostic/diagnosticConfig': { DIAGNOSTIC_BUILD_ID: 'test-build', DIAGNOSTIC_VERSION: 'test', DIAGNOSTIC_VERSION_CODE: 0 },
    '../../lib/diagnostic': diagnostic,
    '../../lib/diagnostic/diagnosticScreenContext': { DiagScreenProvider },
  });
  return {
    modal,
    React,
    effectCallbacks,
    get registeredListener() { return registeredListener; },
    get notificationStatsCalls() { return notificationStatsCalls; },
    get reportSizeCalls() { return reportSizeCalls; },
    get summarySizeCalls() { return summarySizeCalls; },
  };
}

function findNode(root, predicate) {
  if (!root) return undefined;
  if (Array.isArray(root)) {
    for (const child of root) {
      const match = findNode(child, predicate);
      if (match) return match;
    }
    return undefined;
  }
  if (typeof root !== 'object') return undefined;
  if (predicate(root)) return root;
  return findNode(root.props?.children, predicate);
}

console.log('=== v1.1.96 diagnostic panel regression suite ===');

console.log('Test 1: diagnostic panel probes are isolated by the Diagnostics screen identity...');
{
  const harness = createModalHarness();
  const tree = harness.modal.RtlDiagnosticModal({ visible: true, onClose: () => {} });
  const provider = findNode(tree, (node) => node.type?.name === 'DiagScreenProvider');
  assert.ok(provider, 'the visible diagnostic modal must mount a screen provider around its content');
  assert.equal(provider.props.name, 'Diagnostics', 'the panel must identify itself as Diagnostics');
  console.log('  ✓ panel identity is real component output, not a source-string assertion');
}

console.log('Test 2: usePressProbe records controls after commit, never during render...');
{
  const harness = createDiagnosticStateHarness();
  harness.diagnosticConfig.setDiagnosticModeOverride(true);
  harness.diagnosticState.resetDiagnosticProbes();
  harness.pendingEffects.length = 0;

  harness.diagnosticState.usePressProbe('phantom', 'row', { disabled: true });
  assert.equal(harness.diagnosticState.getControlRegistry().length, 0, 'discarded render must not register a control');

  for (const effect of harness.pendingEffects) effect();
  const [control] = harness.diagnosticState.getControlRegistry();
  assert.equal(control.id, 'Settings::row::phantom');
  assert.equal(control.disabled, true);
  console.log('  ✓ control registration occurs only when the simulated commit effect runs');
}

console.log('Test 3: coalesced panel updates do not estimate or serialize report sizes...');
{
  const harness = createModalHarness();
  const tree = harness.modal.RtlDiagnosticModal({ visible: true, onClose: () => {} });
  const content = findNode(tree, (node) => node.type?.name === 'RtlDiagnosticModalContent');
  assert.ok(content, 'the visible diagnostic modal must render its real content component');
  content.type(content.props);
  for (const effect of harness.effectCallbacks) effect();
  assert.equal(typeof harness.registeredListener, 'function', 'the content must subscribe while visible');

  const reportSizeCallsBeforeFlush = harness.reportSizeCalls;
  const summarySizeCallsBeforeFlush = harness.summarySizeCalls;
  harness.registeredListener();
  assert.equal(harness.notificationStatsCalls > 0, true, 'a coalesced flush must still update notification counters');
  assert.equal(harness.reportSizeCalls, reportSizeCallsBeforeFlush, 'coalesced flush must not rebuild/serialize the report for the size readout');
  assert.equal(harness.summarySizeCalls, summarySizeCallsBeforeFlush, 'coalesced flush must not rebuild/serialize the summary for the size readout');
  console.log('  ✓ coalesced listener work is limited to cheap notification stats');
}

console.log('All v1.1.96 diagnostic panel regression tests passed.');
