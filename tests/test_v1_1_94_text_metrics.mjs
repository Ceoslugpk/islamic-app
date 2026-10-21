import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

const ROOT = path.resolve(import.meta.dirname, '..');

function loadTsModule(relativePath, mocks = {}) {
  const filePath = path.resolve(ROOT, relativePath);
  const source = fs.readFileSync(filePath, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.React,
    },
  }).outputText;
  const module = { exports: {} };
  const sandbox = {
    module,
    exports: module.exports,
    require: (id) => mocks[id] || {},
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
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    parseInt,
    parseFloat,
    isNaN,
  };
  vm.createContext(sandbox);
  vm.runInContext(output, sandbox, { filename: filePath });
  return module.exports;
}

const reactHooks = {
  useState: (initial) => [typeof initial === 'function' ? initial() : initial, () => {}],
  useEffect: () => {},
  useCallback: (fn) => fn,
  useContext: (context) => context?._currentValue,
  useRef: (value) => ({ current: value }),
  createContext: (value) => ({ _currentValue: value }),
  forwardRef: (fn) => fn,
  isValidElement: () => false,
};

const active = { language: 'en', theme: 'light', screen: 'Home' };
const reactNative = {
  Platform: { OS: 'android' },
  I18nManager: { isRTL: false },
  StyleSheet: {
    flatten: (style) => {
      if (!Array.isArray(style)) return style || {};
      return style.reduce((out, item) => ({ ...out, ...(item || {}) }), {});
    },
    create: (styles) => styles,
    hairlineWidth: 1,
  },
  Dimensions: { get: () => ({ width: 360, height: 740 }) },
  Appearance: { getColorScheme: () => active.theme },
  Share: { share: async () => ({ action: 'sharedAction' }) },
  Clipboard: { setString: () => {} },
};

const diagConfig = loadTsModule('src/lib/diagnostic/diagnosticConfig.ts', {
  react: reactHooks,
});
const diagContext = {
  useDiagScreen: () => active.screen,
  useDiagParent: () => undefined,
  getGlobalActiveScreen: () => active.screen,
  setGlobalActiveScreen: (screen) => { active.screen = screen; },
  setDiagErrorRecorder: () => {},
};
const diagScreens = { KNOWN_SCREENS: [] };
const diagI18n = {
  diagT: (key) => key,
  getDiagnosticShareTitle: () => 'Diagnostic report',
  getDiagnosticShareDialogTitle: () => 'Diagnostic report',
};
const i18n = {
  default: { get language() { return active.language; } },
  isRTL: (lang) => lang === 'ar' || lang === 'ur',
  isRtlLanguage: (lang) => lang === 'ar' || lang === 'ur',
  getBootLanguage: () => active.language,
};
const fileSystem = {
  documentDirectory: '/mock/documents/',
  cacheDirectory: '/mock/cache/',
  writeAsStringAsync: async () => {},
  getInfoAsync: async () => ({ exists: true, size: 1 }),
};
const sharing = { isAvailableAsync: async () => true, shareAsync: async () => {} };

const diagState = loadTsModule('src/lib/diagnostic/diagnosticState.ts', {
  react: reactHooks,
  'react-native': reactNative,
  './diagnosticConfig': diagConfig,
  './diagnosticScreenContext': diagContext,
  './diagnosticScreens': diagScreens,
  './diagnosticI18n': diagI18n,
  '../i18n': i18n,
  'expo-file-system/legacy': fileSystem,
  'expo-sharing': sharing,
});

function derive(probe, options = {}) {
  return diagState.deriveProbeDefects(probe, { isText: true, ...options });
}

function lines(...items) {
  return items.map(([y, height, ascender = 0, descender = 0]) => ({ y, height, ascender, descender }));
}

console.log('=== TEXT METRICS RECORDER (v1.1.94) ===');

// RED before the feature: this test must fail because the real production module
// does not yet expose the new defects or line records.
diagConfig.setDiagnosticModeOverride(true);
diagState.resetDiagnosticProbes();

const overlapLines = lines([0, 20, 15, 4], [18, 20, 15, 4]);
const overlapDefects = derive(
  {
    id: 'Home::AppText::title#1',
    kind: 'AppText',
    screen: 'Home',
    x: 10,
    y: 10,
    width: 200,
    height: 40,
    resolvedFontSize: 14,
    resolvedLineHeight: 21,
    explicitLineHeight: 21,
    fontFamily: 'Manrope_400Regular',
    textScript: 'latin',
    textLines: overlapLines,
  },
  { lines: overlapLines },
);
assert.equal(overlapDefects.lineOverlap.flag, true, 'genuinely overlapping consecutive lines must be flagged');
assert.match(overlapDefects.lineOverlap.reason, /overlap/i);

const correctLines = lines([0, 21, 15, 4], [21, 21, 15, 4]);
const correctDefects = derive(
  {
    id: 'Home::AppText::body#2',
    kind: 'AppText',
    screen: 'Home',
    x: 10,
    y: 10,
    width: 200,
    height: 42,
    resolvedFontSize: 14,
    resolvedLineHeight: 21,
    explicitLineHeight: 21,
    fontFamily: 'Manrope_400Regular',
    textScript: 'latin',
    textLines: correctLines,
  },
  { lines: correctLines },
);
assert.equal(correctDefects.lineOverlap.flag, false, 'correctly laid out lines must not be flagged as overlapping');
assert.equal(correctDefects.textClipped.flag, false, 'correctly sized container must not be flagged as clipped');
assert.equal(correctDefects.lineBoxTooTight.flag, false, 'a 1.5x Latin UI line box must not be flagged as tight');

const tightDefects = derive({
  id: 'Settings::AppText::urdu#3',
  kind: 'AppText',
  screen: 'Settings',
  height: 34,
  resolvedFontSize: 17,
  resolvedLineHeight: 30,
  explicitLineHeight: 30,
  fontFamily: 'NotoNastaliqUrdu_400Regular',
  textScript: 'urdu',
  textLines: lines([0, 30]),
});
assert.equal(tightDefects.lineBoxTooTight.flag, true, 'an explicit Urdu lineHeight below 2.2x must be flagged');
assert.match(tightDefects.lineBoxTooTight.reason, /fontSize=17/);

const clippedLines = lines([0, 20], [20, 20]);
const clippedDefects = derive(
  {
    id: 'Settings::AppText::clipped#4',
    kind: 'AppText',
    screen: 'Settings',
    height: 38,
    resolvedFontSize: 14,
    resolvedLineHeight: 20,
    explicitLineHeight: 20,
    fontFamily: 'Manrope_400Regular',
    textScript: 'latin',
    textLines: clippedLines,
  },
  { lines: clippedLines },
);
assert.equal(clippedDefects.textClipped.flag, true, 'line boxes exceeding the measured container by >1px must flag textClipped');
assert.equal(clippedDefects.textClipped.details?.lineSum, 40);

const rectangleA = {
  id: 'Home::AppText::rect-a#5',
  kind: 'AppText',
  screen: 'Home',
  x: 10,
  y: 10,
  width: 120,
  height: 30,
  frameWidth: 320,
  frameHeight: 640,
  parentIdentity: 'home-content',
  textScript: 'latin',
};
const rectangleB = {
  id: 'Home::AppText::rect-b#6',
  kind: 'AppText',
  screen: 'Home',
  x: 50,
  y: 28,
  width: 120,
  height: 30,
  frameWidth: 320,
  frameHeight: 640,
  parentIdentity: 'home-content',
  isText: true,
  textScript: 'latin',
};
rectangleA.isText = true;
const rectOverlapDefects = derive(rectangleA, { siblings: [rectangleB] });
assert.equal(rectOverlapDefects.textRectOverlap.flag, true, 'overlapping measured text rectangles must flag textRectOverlap');
assert.match(rectOverlapDefects.textRectOverlap.reason, /rect-b#6/);

const ancestorDefects = derive(rectangleA, {
  siblings: [{ ...rectangleB, id: 'Home::AppText::descendant#7', parentIdentity: rectangleA.id }],
});
assert.equal(ancestorDefects.textRectOverlap.flag, false, 'ancestor/descendant pairs must be ignored');

const reverseAncestorDefects = derive({ ...rectangleB, parentIdentity: rectangleA.id }, {
  siblings: [rectangleA],
});
assert.equal(reverseAncestorDefects.textRectOverlap.flag, false, 'descendant/ancestor pairs must be ignored in either order');

const horizontalDefects = derive(rectangleA, {
  horizontalScrollableAncestor: true,
  siblings: [rectangleB],
});
assert.equal(horizontalDefects.textRectOverlap.flag, false, 'horizontal scrolling strips must be ignored');

const genericScrollableDefects = derive(rectangleA, {
  hasScrollableAncestor: true,
  siblings: [rectangleB],
});
assert.equal(genericScrollableDefects.textRectOverlap.flag, false, 'generic scroll ancestry must be treated conservatively when direction is unavailable');

// The real hook must be inert with the gate off: no callback, no probe, no timer.
diagConfig.setDiagnosticModeOverride(false);
diagState.resetDiagnosticProbes();
const gateOff = diagState.useAutoProbe('title', 'AppText', { isText: true });
assert.equal(gateOff.onLayout, undefined, 'gate off must attach no onLayout callback');
assert.equal(gateOff.onTextLayout, undefined, 'gate off must attach no onTextLayout callback');
assert.deepEqual(Object.keys(gateOff), [], 'gate off text probe must add zero props');
assert.equal(diagState.getAutoProbes().length, 0, 'gate off must record zero probes');

// The production hook must expose its callback only when enabled and its stable id
// must retain the established screen::kind::base#instance shape.
diagConfig.setDiagnosticModeOverride(true);
const gateOn = diagState.useAutoProbe('title', 'AppText', {
  isText: true,
  resolvedFontSize: 14,
  resolvedLineHeight: 21,
  explicitLineHeight: 21,
  fontFamily: 'Manrope_400Regular',
  textScript: 'latin',
});
assert.equal(typeof gateOn.onLayout, 'function');
assert.equal(typeof gateOn.onTextLayout, 'function');
gateOn.onLayout({ nativeEvent: { layout: { x: 10, y: 10, width: 200, height: 42 } } });
gateOn.onTextLayout({ nativeEvent: { lines: correctLines } });
const recorded = diagState.getAutoProbes().find((p) => p.kind === 'AppText');
assert.ok(recorded);
assert.match(recorded.id, /^Home::AppText::title#\d+$/);
assert.equal(recorded.reportedLineCount, 2);
assert.equal(recorded.textLines?.length, 2);
assert.equal(recorded.textLines?.[0]?.ascender, 15);
assert.equal(recorded.measuredContainerHeight, 42);

console.log('PASS: real production line metrics, defect classes, gate-off inertness, and id/field recording verified');
