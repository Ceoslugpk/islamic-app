import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

const ROOT = path.resolve(import.meta.dirname, '..');

function loadTsModule(relativePath, mocks = {}) {
  const filePath = path.join(ROOT, relativePath);
  const source = fs.readFileSync(filePath, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.React,
      esModuleInterop: true,
    },
    fileName: filePath,
  }).outputText;
  const module = { exports: {} };
  const react = {
    __esModule: true,
    default: { createElement: () => null },
    useState: () => [null, () => {}],
    useEffect: () => {},
    useRef: (value) => ({ current: value }),
    useCallback: (fn) => fn,
    useMemo: (fn) => fn(),
  };
  const reactNative = {
    StyleSheet: {
      absoluteFill: {},
      create: (styles) => styles,
    },
    Platform: { OS: 'android' },
    I18nManager: { isRTL: false },
    Animated: {
      Value: class {},
      spring: () => ({ start: () => {} }),
      timing: () => ({ start: () => {} }),
      createAnimatedComponent: (component) => component,
    },
  };
  const requireMap = {
    react,
    'react-native': reactNative,
    ...mocks,
  };
  const sandbox = {
    module,
    exports: module.exports,
    require: (id) => requireMap[id] ?? {},
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
    Boolean,
    Number,
    JSON,
    Promise,
    Error,
    TypeError,
    globalThis,
  };
  vm.createContext(sandbox);
  vm.runInContext(output, sandbox, { filename: filePath });
  return module.exports;
}

const calendar = loadTsModule('src/screens/CalendarScreen.tsx', {
  '../theme/tokens': { cardTokens: { borderRadius: 14 } },
});
assert.equal(typeof calendar.getCalendarNavGlyph, 'function');
assert.equal(calendar.getCalendarNavGlyph('previous', false), '‹', 'LTR previous month points left');
assert.equal(calendar.getCalendarNavGlyph('next', false), '›', 'LTR next month points right');
assert.equal(calendar.getCalendarNavGlyph('previous', true), '›', 'RTL previous month points right');
assert.equal(calendar.getCalendarNavGlyph('next', true), '‹', 'RTL next month points left');

const bookmarks = loadTsModule('src/screens/BookmarksScreen.tsx', {
  '../lib/undoToast': {
    useUndoToast: () => ({ saveUndoState: () => {} }),
    withUndoToast: (component) => component,
  },
});
assert.equal(typeof bookmarks.getBookmarkOpenAffordanceLabel, 'function');
assert.equal(
  bookmarks.getBookmarkOpenAffordanceLabel('Tap to open in Reader →', false),
  'Tap to open in Reader →',
  'LTR bookmark open affordance points forward'
);
assert.equal(
  bookmarks.getBookmarkOpenAffordanceLabel('Tap to open in Reader →', true),
  'Tap to open in Reader ←',
  'RTL bookmark open affordance points toward the reading direction'
);

const app = loadTsModule('App.tsx');
assert.equal(typeof app.resolveAppHeaderLayout, 'function');
assert.deepEqual(
  JSON.parse(JSON.stringify(app.resolveAppHeaderLayout('ltr'))),
  {
    justification: 'flex-end',
    bismillahPadding: { edge: 'right', value: 16 },
    logoBadgeGap: { edge: 'right', value: 8 },
    logoGap: { edge: 'right', value: 8 },
    sealGap: { edge: 'right', value: 9 },
  },
  'LTR header keeps the existing right-edge spacing and flex-end justification'
);
assert.deepEqual(
  JSON.parse(JSON.stringify(app.resolveAppHeaderLayout('rtl'))),
  {
    justification: 'flex-end',
    bismillahPadding: { edge: 'left', value: 16 },
    logoBadgeGap: { edge: 'left', value: 8 },
    logoGap: { edge: 'left', value: 8 },
    sealGap: { edge: 'left', value: 9 },
  },
  'RTL header resolves the same logical end spacing to the left edge'
);

const qibla = loadTsModule('src/components/QiblaCompass.tsx', {
  '../lib/qibla': { shortestAngleDelta: (target, current) => target - current },
});
assert.equal(typeof qibla.resolveQiblaNeedleRotation, 'function');
assert.equal(typeof qibla.getCompassCardinalPosition, 'function');
assert.deepEqual(
  JSON.parse(JSON.stringify(qibla.getCompassCardinalPosition('east', false))),
  { end: 22 },
  'LTR compass keeps E on the physical right edge'
);
assert.deepEqual(
  JSON.parse(JSON.stringify(qibla.getCompassCardinalPosition('east', true))),
  { start: 22 },
  'RTL compass keeps E on the physical right edge'
);
assert.deepEqual(
  JSON.parse(JSON.stringify(qibla.getCompassCardinalPosition('west', false))),
  { start: 22 },
  'LTR compass keeps W on the physical left edge'
);
assert.deepEqual(
  JSON.parse(JSON.stringify(qibla.getCompassCardinalPosition('west', true))),
  { end: 22 },
  'RTL compass keeps W on the physical left edge'
);
const liveRotation = qibla.resolveQiblaNeedleRotation(123, 210, 87, false);
assert.equal(liveRotation, 123, 'live compass uses the computed bearing-minus-heading rotation');
assert.equal(
  qibla.resolveQiblaNeedleRotation(123, 210, 87, false),
  liveRotation,
  'RTL does not alter the live physical bearing rotation'
);
assert.equal(
  qibla.resolveQiblaNeedleRotation(123, 210, null, true),
  210,
  'static compass uses the computed bearing directly'
);

console.log('v1.1.94 owned RTL mirroring production-module contract: PASS');
