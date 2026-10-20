#!/usr/bin/env node
/**
 * tests/test_focused_rtl_qa_repair.mjs
 *
 * Focused Production-Path Verification Suite for Independent QA Gaps:
 * 1. InputField (src/components/ui/InputField.tsx)
 *    - Reactive writingDirection: rtl ? 'rtl' : 'ltr'
 *    - Dynamic textAlign: rtl ? 'right' : 'left'
 *    - Preservation of caller overrides via inputStyle
 *    - Preservation of labels, accessibility, callbacks, and dimensions
 * 2. WomenQadaScreen (src/screens/WomenQadaScreen.tsx)
 *    - Render-time writingDirection and textAlign on all 3 TextInputs (date, reason, notes)
 *    - Preservation of numeric/punctuation keyboardType, callbacks, persistence, accessibility
 * 3. HomeScreen (src/screens/HomeScreen.tsx)
 *    - heroLeftCol & heroLeftColRtl stretch contract
 *    - Verification that heroLeftCol occupies available width without modifying Home design
 *    - Preservation of heroTimeWrap alignSelf: 'flex-start'
 * 4. Language Matrix & ckb/Sorani Configuration
 *    - Exact registered AppLanguage union: en, ur, ar, hi, ml, si, bn, ms, ta, id, ps
 *    - Distinction between direction-detection helper and registered production locales
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const read = (relPath) => fs.readFileSync(path.join(ROOT, relPath), 'utf8');

console.log('========================================================');
console.log('FOCUSED QA RTL REPAIR VERIFICATION SUITE');
console.log('========================================================\n');

const ts = (await import('typescript')).default;
const React = (await import('react')).default;

function loadModule(filePath, mocks = {}) {
  const code = read(filePath);
  const { outputText } = ts.transpileModule(code, {
    compilerOptions: {
      jsx: ts.JsxEmit.React,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  });
  const moduleObj = { exports: {} };
  const requireFn = (id) => {
    if (id in mocks) return mocks[id];
    for (const [key, val] of Object.entries(mocks)) {
      if (id.endsWith(key) || key.endsWith(id)) return val;
    }
    throw new Error(`Unexpected import in test runner: ${id}`);
  };
  const fn = new Function('require', 'module', 'exports', outputText);
  fn(requireFn, moduleObj, moduleObj.exports);
  return moduleObj.exports;
}

const flatten = (style) => Object.assign({}, ...[style].flat(Infinity).filter(Boolean));

// ---------------------------------------------------------------------------
// 1. InputField Component Verification (Static & Runtime)
// ---------------------------------------------------------------------------
console.log('1. Verifying InputField component (src/components/ui/InputField.tsx)...');

const inputFieldSrc = read('src/components/ui/InputField.tsx');

// Static verification
assert.match(
  inputFieldSrc,
  /textAlign:\s*rtl\s*\?\s*['"]right['"]\s*:\s*['"]left['"]/,
  'InputField must dynamically set textAlign based on rtl'
);
assert.match(
  inputFieldSrc,
  /writingDirection:\s*rtl\s*\?\s*['"]rtl['"]\s*:\s*['"]ltr['"]/,
  'InputField must dynamically set writingDirection based on rtl'
);

// Verify style order: default styles first, then dynamic object, then inputStyle override
const inputStyleArrMatch = inputFieldSrc.match(/style=\s*\{\[\s*styles\.input\s*,\s*\{[\s\S]*?\}\s*,\s*inputStyle\s*,?\s*\]\}/);
assert.ok(
  inputStyleArrMatch,
  'InputField must apply inputStyle after dynamic style object to preserve caller overrides'
);

// Runtime verification with mock environment
let currentIsRTL = false;
const inputFieldModule = loadModule('src/components/ui/InputField.tsx', {
  react: React,
  'react-native': {
    StyleSheet: { create: (s) => s },
    View: 'View',
    TextInput: 'TextInput',
  },
  '../../lib/theme': {
    useTheme: () => ({
      mode: 'light',
      colors: {
        destructive: '#ef4444',
        borderSubtle: '#e2e8f0',
        bgBase: '#ffffff',
        textPrimary: '#0f172a',
        textMuted: '#64748b',
      },
    }),
  },
  '../../theme/tokens': {
    themeTokens: {
      light: { cardBorder: '#cbd5e1', bgTop: '#ffffff' },
    },
    fontRoles: { uiSemiBold: 'Manrope_600SemiBold', ui: 'Manrope_400Regular' },
  },
  '../../lib/i18n': {
    isRTL: () => currentIsRTL,
  },
  './AppText': {
    AppText: 'AppText',
  },
});

const { InputField } = inputFieldModule;

// Test 1.1: LTR runtime behavior
currentIsRTL = false;
const ltrElement = InputField({
  label: 'City name',
  value: 'London',
  placeholder: 'Enter city',
});
const ltrInput = ltrElement.props.children.find((c) => c && c.type === 'TextInput');
assert.ok(ltrInput, 'InputField must render a TextInput element');
const ltrStyle = flatten(ltrInput.props.style);
assert.equal(ltrStyle.textAlign, 'left', 'LTR default textAlign must be left');
assert.equal(ltrStyle.writingDirection, 'ltr', 'LTR default writingDirection must be ltr');

// Test 1.2: RTL runtime behavior
currentIsRTL = true;
const rtlElement = InputField({
  label: 'شہر کا نام',
  value: 'لاہور',
  placeholder: 'شہر درج کریں',
});
const rtlInput = rtlElement.props.children.find((c) => c && c.type === 'TextInput');
assert.ok(rtlInput, 'InputField must render a TextInput element');
const rtlStyle = flatten(rtlInput.props.style);
assert.equal(rtlStyle.textAlign, 'right', 'RTL default textAlign must be right');
assert.equal(rtlStyle.writingDirection, 'rtl', 'RTL default writingDirection must be rtl');

// Test 1.3: Caller overrides preserved (e.g. numeric coordinates in RTL context)
const overrideElement = InputField({
  label: 'Latitude',
  value: '31.5204',
  inputStyle: {
    writingDirection: 'ltr',
    textAlign: 'left',
  },
});
const overrideInput = overrideElement.props.children.find((c) => c && c.type === 'TextInput');
const overrideStyle = flatten(overrideInput.props.style);
assert.equal(overrideStyle.textAlign, 'left', 'Caller textAlign override must be respected');
assert.equal(overrideStyle.writingDirection, 'ltr', 'Caller writingDirection override must be respected');

console.log('  ✓ InputField static and runtime contracts verified (LTR, RTL, and caller overrides)');

// ---------------------------------------------------------------------------
// 2. WomenQadaScreen Component Verification
// ---------------------------------------------------------------------------
console.log('2. Verifying WomenQadaScreen TextInputs (src/screens/WomenQadaScreen.tsx)...');

const qadaSrc = read('src/screens/WomenQadaScreen.tsx');

// Check that isRTL is imported
assert.ok(qadaSrc.includes("import { isRTL } from '../lib/i18n';"), 'WomenQadaScreen must import isRTL');

// Verify all 3 TextInputs have both textAlign and writingDirection dynamic expressions
const qadaWritingDirMatches = [...qadaSrc.matchAll(/writingDirection:\s*isRTL\(\)\s*\?\s*['"]rtl['"]\s*:\s*['"]ltr['"]/g)];
assert.equal(
  qadaWritingDirMatches.length,
  3,
  'WomenQadaScreen must set writingDirection on all 3 TextInputs (date, reason, notes)'
);

const qadaTextAlignMatches = [...qadaSrc.matchAll(/textAlign:\s*isRTL\(\)\s*\?\s*['"]right['"]\s*:\s*['"]left['"]/g)];
assert.equal(
  qadaTextAlignMatches.length,
  3,
  'WomenQadaScreen must set textAlign on all 3 TextInputs (date, reason, notes)'
);

// Verify Date input preserves keyboardType and placeholder
assert.ok(
  qadaSrc.includes('keyboardType="numbers-and-punctuation"'),
  'Date input in WomenQadaScreen must preserve keyboardType="numbers-and-punctuation"'
);
assert.ok(
  qadaSrc.includes("placeholder={t('YYYY-MM-DD')}"),
  'Date input in WomenQadaScreen must preserve YYYY-MM-DD placeholder'
);

console.log('  ✓ WomenQadaScreen 3 TextInputs (date, reason, notes) verified for bidi direction');

// ---------------------------------------------------------------------------
// 3. HomeScreen heroLeftCol Contract Verification
// ---------------------------------------------------------------------------
console.log('3. Verifying HomeScreen alignment contract (src/screens/HomeScreen.tsx)...');

const homeSrc = read('src/screens/HomeScreen.tsx');

// heroLeftCol in LTR
assert.match(
  homeSrc,
  /heroLeftCol:\s*\{\s*flex:\s*1,\s*minWidth:\s*0,\s*gap:\s*2,\s*\}/,
  'heroLeftCol must specify flex: 1, minWidth: 0, gap: 2'
);

// heroLeftColRtl in RTL
assert.match(
  homeSrc,
  /heroLeftColRtl:\s*\{\s*flex:\s*1,\s*minWidth:\s*0,\s*alignItems:\s*['"]stretch['"],\s*\}/,
  'heroLeftColRtl must specify flex: 1, minWidth: 0, alignItems: "stretch"'
);

// heroLeftColRtl must NOT be flex-start (which collapes child containers to text width)
assert.ok(
  !homeSrc.includes("heroLeftColRtl: {\n    flex: 1,\n    minWidth: 0,\n    alignItems: 'flex-start'"),
  'heroLeftColRtl must NOT have alignItems: flex-start'
);

// heroTimeWrap must retain alignSelf: 'flex-start' so the time aligns properly without redesigning Home
assert.match(
  homeSrc,
  /heroTimeWrap:\s*\{[\s\S]*?alignSelf:\s*['"]flex-start['"]/,
  'heroTimeWrap must keep alignSelf: "flex-start"'
);
assert.match(
  homeSrc,
  /heroTimeWrapRtl:\s*\{[\s\S]*?alignSelf:\s*['"]flex-start['"]/,
  'heroTimeWrapRtl must keep alignSelf: "flex-start"'
);

console.log('  ✓ HomeScreen heroLeftCol stretch contract and non-regression verified');

// ---------------------------------------------------------------------------
// 4. Configured App Language Matrix & ckb/Sorani Verification
// ---------------------------------------------------------------------------
console.log('4. Verifying production AppLanguage matrix and ckb/Sorani policy...');

const i18nSrc = read('src/lib/i18n.ts');

// Production AppLanguage type union
const appLangTypeMatch = i18nSrc.match(/export type AppLanguage =\s*([^;]+);/);
assert.ok(appLangTypeMatch, 'AppLanguage type definition must exist in i18n.ts');
const expectedLanguages = ['en', 'ur', 'ar', 'hi', 'ml', 'si', 'bn', 'ms', 'ta', 'id', 'ps'];

for (const lang of expectedLanguages) {
  assert.ok(
    appLangTypeMatch[1].includes(`'${lang}'`),
    `AppLanguage must include '${lang}'`
  );
}

// ckb must NOT be in AppLanguage union
assert.ok(
  !appLangTypeMatch[1].includes("'ckb'"),
  'ckb must NOT be in the registered AppLanguage union (not a selectable app language)'
);

// Check isRtlLanguage handles ckb correctly as a direction script tag
const isRtlLangMatch = i18nSrc.includes("['ckb', 'fa', 'ug', 'he', 'sd', 'dv'].some");
assert.ok(
  isRtlLangMatch,
  'isRtlLanguage must recognize ckb among RTL script codes for bidi direction classification'
);

// Verify registered resource files
for (const lang of expectedLanguages) {
  const localeFile = path.join(ROOT, `src/locales/${lang}.json`);
  assert.ok(fs.existsSync(localeFile), `Locale file ${lang}.json must exist for registered language`);
}
assert.ok(
  !fs.existsSync(path.join(ROOT, 'src/locales/ckb.json')),
  'ckb.json must not exist as ckb is not a registered app language'
);

console.log('  ✓ AppLanguage matrix (11 registered locales; ckb direction-only) verified');

console.log('\n========================================================');
console.log('ALL FOCUSED QA RTL REPAIRS PASSED SUCCESSFULLY!');
console.log('========================================================');
