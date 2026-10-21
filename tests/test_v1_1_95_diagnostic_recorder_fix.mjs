import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

let timerCalls = 0;

function loadTsModule(filePath, mocks = {}) {
  const code = fs.readFileSync(filePath, 'utf8');
  const transpiled = ts.transpileModule(code, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.React,
    },
  }).outputText;

  const exportsObj = {};
  const moduleObj = { exports: exportsObj };
  const sandbox = {
    module: moduleObj,
    exports: exportsObj,
    require: (id) => mocks[id] || {},
    console,
    process,
    Set,
    Map,
    Promise,
    Error,
    TypeError,
    String,
    Boolean,
    Array,
    Object,
    Math,
    Date,
    JSON,
    URL,
    Blob: typeof Blob !== 'undefined' ? Blob : class {},
    parseInt,
    parseFloat,
    isNaN,
    setTimeout: (...args) => {
      timerCalls += 1;
      return setTimeout(...args);
    },
    clearTimeout,
    setInterval,
    clearInterval,
    globalThis: { fetch: undefined },
  };
  vm.createContext(sandbox);
  vm.runInContext(transpiled, sandbox);
  return moduleObj.exports;
}

const diagConfig = loadTsModule('src/lib/diagnostic/diagnosticConfig.ts');
const diagScreens = loadTsModule('src/lib/diagnostic/diagnosticScreens.ts');
const mockReact = {
  useState: (initial) => [typeof initial === 'function' ? initial() : initial, () => {}],
  useEffect: () => {},
  useCallback: (fn) => fn,
  useContext: () => undefined,
};
const mockReactNative = {
  Platform: { OS: 'android' },
  I18nManager: { isRTL: false },
  Share: { share: () => Promise.resolve({ action: 'sharedAction' }) },
  Clipboard: { setString: () => {} },
  StyleSheet: { flatten: (style) => style || {} },
  Dimensions: { get: () => ({ width: 360, height: 740 }) },
  Appearance: { getColorScheme: () => 'light' },
};
const diagScreenContext = {
  useDiagScreen: () => 'Home',
  useDiagParent: () => undefined,
  getGlobalActiveScreen: () => 'Home',
  setDiagErrorRecorder: () => {},
};
const diagState = loadTsModule('src/lib/diagnostic/diagnosticState.ts', {
  react: mockReact,
  'react-native': mockReactNative,
  './diagnosticConfig': diagConfig,
  './diagnosticI18n': {
    diagT: (key) => key,
    getDiagnosticShareTitle: () => 'Title',
    getDiagnosticShareDialogTitle: () => 'Dialog',
  },
  './diagnosticScreens': diagScreens,
  './diagnosticScreenContext': diagScreenContext,
  '../i18n': {
    default: { language: 'en' },
    isRTL: () => false,
    isRtlLanguage: () => false,
    getBootLanguage: () => 'en',
  },
  'expo-file-system/legacy': {},
  'expo-sharing': {},
});

const layout = (width = 180, height = 42) => ({
  nativeEvent: { layout: { x: 4, y: 8, width, height } },
});
const textLayout = (lines) => ({ nativeEvent: { lines } });
const line = (y, height) => ({ x: 0, y, width: 160, height, ascender: 12, descender: 4 });

console.log('=== v1.1.95 diagnostic recorder regression suite ===');

console.log('--- deferred text metrics and gate-off behavior ---');
diagConfig.setDiagnosticModeOverride(false);
diagState.resetDiagnosticProbes();
const gateOffProps = diagState.useAutoProbe('gate-off-text', 'AppText', { isText: true });
assert.equal(gateOffProps.onLayout, undefined, 'Gate off must expose no layout handler');
assert.equal(gateOffProps.onTextLayout, undefined, 'Gate off must expose no text-layout handler');
diagState.recordProbeTextLayout('gate-off-text', [line(0, 20)]);
assert.equal(diagState.getAutoProbes().length, 0, 'Gate off must not create a probe or stash metrics');
assert.equal(timerCalls, 0, 'Gate off must not schedule a timer for deferred metrics');

diagConfig.setDiagnosticModeOverride(true);
diagState.recordProbeLayout('gate-off-text', 'AppText', 'Home', { x: 4, y: 8, width: 180, height: 42 }, { isText: true });
assert.equal(
  diagState.getAutoProbe('gate-off-text').reportedLineCount,
  undefined,
  'Metrics sent while gate off must not reappear when the gate is enabled',
);

diagState.resetDiagnosticProbes();
const orderedProps = diagState.useAutoProbe('ordered-text', 'AppText', {
  isText: true,
  numberOfLines: 2,
});
assert.equal(typeof orderedProps.onTextLayout, 'function');
assert.equal(typeof orderedProps.onLayout, 'function');

orderedProps.onTextLayout(textLayout([line(0, 20), line(20, 22)]));
assert.equal(diagState.getAutoProbes().length, 0, 'Text layout before layout must be deferred, not dropped into a partial record');

orderedProps.onLayout(layout(180, 42));
const orderedId = diagState.getAutoProbes()[0].id;
let orderedProbe = diagState.getAutoProbe(orderedId);
assert.equal(orderedProbe.reportedLineCount, 2, 'Deferred lines must apply when the layout record arrives');
assert.deepEqual(orderedProbe.textLines.map((item) => item.height), [20, 22]);
assert.equal(orderedProbe.measuredContainerHeight, 42, 'Deferred metrics must capture the post-layout container height');
assert.equal(orderedProbe.defects.textClipped.flag, false, 'Deferred metrics must participate in defect derivation');

orderedProps.onTextLayout(textLayout([line(0, 18), line(18, 18), line(36, 18)]));
orderedProbe = diagState.getAutoProbe(orderedId);
assert.equal(orderedProbe.reportedLineCount, 3, 'A later text-layout event must replace the deferred metrics');
assert.deepEqual(orderedProbe.textLines.map((item) => item.height), [18, 18, 18]);
assert.equal(orderedProbe.measuredContainerHeight, 42, 'Later metrics must continue using the recorded layout height');

console.log('  ✓ 1 text probe captured metrics across text-layout → layout → re-layout ordering');

console.log('--- bounded no-layout stash ---');
diagState.resetDiagnosticProbes();
for (let i = 0; i < diagState.MAX_PENDING_TEXT_LAYOUTS; i += 1) {
  diagState.recordProbeTextLayout(`pending-${i}`, [line(0, i + 1)]);
}
diagState.recordProbeTextLayout(`pending-${diagState.MAX_PENDING_TEXT_LAYOUTS}`, [line(0, 999)]);
diagState.recordProbeLayout('pending-0', 'AppText', 'Home', { x: 0, y: 0, width: 100, height: 20 }, { isText: true });
assert.equal(
  diagState.getAutoProbe('pending-0').reportedLineCount,
  undefined,
  'The oldest no-layout stash entry must be evicted at the bound',
);
diagState.recordProbeLayout(
  `pending-${diagState.MAX_PENDING_TEXT_LAYOUTS}`,
  'AppText',
  'Home',
  { x: 0, y: 0, width: 100, height: 20 },
  { isText: true },
);
assert.equal(
  diagState.getAutoProbe(`pending-${diagState.MAX_PENDING_TEXT_LAYOUTS}`).reportedLineCount,
  1,
  'The newest no-layout stash entry must survive until its layout arrives',
);
console.log(`  ✓ no-layout metrics are bounded at ${diagState.MAX_PENDING_TEXT_LAYOUTS} entries`);

console.log('--- stale geometry is excluded from defect computation ---');
diagState.resetDiagnosticProbes();
diagState.recordProbeLayout(
  'dead-offscreen',
  'PrimaryButton',
  'Home',
  { x: 350, y: 0, width: 100, height: 48 },
  { isInteractive: true },
);
diagState.markProbeStale('dead-offscreen', 'PrimaryButton unmounted');
let report = diagState.buildDiagnosticReport();
assert.equal(report.probes.find((probe) => probe.id === 'dead-offscreen').staleAfterUnmount, true);
assert.equal(report.defects.items.some((item) => item.probeId === 'dead-offscreen'), false);
assert.equal(report.defects.totalDefects, 0, 'A stale off-screen rect must not create a report defect');

diagState.resetDiagnosticProbes();
diagState.recordProbeLayout(
  'dead-text',
  'AppText',
  'Home',
  { x: 90, y: 0, width: 30, height: 10 },
  { isText: true, frameWidth: 100, frameHeight: 100 },
);
diagState.recordProbeTextLayout('dead-text', [line(0, 20)]);
diagState.markProbeStale('dead-text', 'AppText unmounted');
report = diagState.buildDiagnosticReport();
const deadText = report.probes.find((probe) => probe.id === 'dead-text');
assert.equal(deadText.staleAfterUnmount, true);
assert.equal(deadText.defects.outsideParent.flag, true, 'Stale export should retain the original outsideParent evidence');
assert.equal(deadText.defects.textClipped.flag, true, 'Stale export should retain the original textClipped evidence');
assert.equal(report.defects.items.some((item) => item.probeId === 'dead-text'), false);
assert.equal(report.defects.totalDefects, 0, 'Stale outsideParent/textClipped evidence must not count as current defects');

diagState.resetDiagnosticProbes();
diagState.recordProbeLayout(
  'dead-sibling',
  'PrimaryButton',
  'Home',
  { x: 10, y: 10, width: 100, height: 40 },
  { frameWidth: 200, frameHeight: 100 },
);
diagState.recordProbeLayout(
  'live-sibling',
  'PrimaryButton',
  'Home',
  { x: 0, y: 0, width: 100, height: 40 },
  { frameWidth: 200, frameHeight: 100 },
);
diagState.markProbeStale('dead-sibling', 'PrimaryButton unmounted');
report = diagState.buildDiagnosticReport();
assert.equal(
  report.defects.items.some((item) => item.probeId === 'live-sibling' && item.defectClass === 'siblingOverlap'),
  false,
  'A stale sibling rect must not create an overlap defect for a live probe',
);

diagState.resetDiagnosticProbes();
diagState.recordProbeLayout(
  'dead-text-sibling',
  'AppText',
  'Home',
  { x: 0, y: 0, width: 100, height: 40 },
  { isText: true, parentIdentity: 'text-parent', frameWidth: 200, frameHeight: 100 },
);
diagState.recordProbeLayout(
  'live-text-sibling',
  'AppText',
  'Home',
  { x: 10, y: 10, width: 100, height: 40 },
  { isText: true, parentIdentity: 'text-parent', frameWidth: 200, frameHeight: 100 },
);
diagState.markProbeStale('dead-text-sibling', 'AppText unmounted');
report = diagState.buildDiagnosticReport();
assert.equal(
  report.defects.items.some((item) => item.probeId === 'live-text-sibling' && item.defectClass === 'textRectOverlap'),
  false,
  'A stale text sibling rect must not create a textRectOverlap defect for a live probe',
);
console.log('  ✓ stale probe geometry remains exported but cannot contribute to defects');

console.log('--- factual coverage verdict ---');
diagState.resetDiagnosticProbes();
diagState.setDiagnosticActiveLanguage('en');
diagState.setDiagnosticActiveTheme('light');
diagState.recordProbeLayout('coverage-probe', 'AppText', 'Home', { x: 0, y: 0, width: 100, height: 20 }, { isText: true });
report = diagState.buildDiagnosticReport();
assert.ok(report.coverageVerdict.includes(`Visited 1 of ${diagScreens.KNOWN_SCREENS.length} known screens.`));
assert.ok(report.coverageVerdict.includes('screens. Screens not visited:'), 'Coverage clauses must remain readable in the exported verdict');
assert.ok(report.coverageVerdict.includes('Screens not visited:'));
assert.ok(report.coverageVerdict.includes('1 language captured; language geometry cannot be compared'));
assert.ok(report.coverageVerdict.includes('1 theme captured; theme geometry cannot be compared'));
assert.equal(diagState.buildDiagnosticSummary().coverageVerdict, report.coverageVerdict);
console.log('  ✓ coverage verdict is derived from the captured screens, language, and theme sets');

console.log('All v1.1.95 diagnostic recorder regression tests passed.');
