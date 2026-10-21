/**
 * Regression test for the Tajweed word-fusing bug (agy `formatters` F7).
 *
 * THE BUG: `parseTajweedHtml` applied `.trim()` to the plain-text chunks that sit BETWEEN `<tajweed>` spans.
 * Those chunks carry the whitespace that separates words, and `TajweedText.tsx` renders the spans adjacent with
 * no separator - so trimming them FUSED adjacent words in the rendered Quran text.
 *
 * WHY THIS FILE EXISTS: the pre-existing `tests/test_tajweed.mjs` re-implements the parser inline instead of
 * importing it, and its copy never had the `.trim()` - so it passes with OR without the bug and could never
 * catch a regression. This test transpiles and executes the REAL `src/lib/tajweed.ts`. Proven sensitive: with
 * `.trim()` re-added to the real source this file exits 1; with the fix in place it exits 0.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const ROOT = path.resolve(import.meta.dirname, '..');
const SRC = path.join(ROOT, 'src/lib/tajweed.ts');

const compiled = ts.transpileModule(fs.readFileSync(SRC, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;

const stub = {
  './db': {
    loadQuranCache: () => null,
    saveQuranCache: () => {},
  },
};
const module_ = { exports: {} };
new Function('module', 'exports', 'require', compiled)(
  module_,
  module_.exports,
  (id) => {
    if (Object.prototype.hasOwnProperty.call(stub, id)) return stub[id];
    throw new Error(`unexpected import while executing ${SRC}: ${id}`);
  }
);

const { parseTajweedHtml } = module_.exports;
assert.equal(typeof parseTajweedHtml, 'function', 'real parseTajweedHtml must be exported');

console.log('=== TAJWEED WHITESPACE (real source) ===\n');

// 1. A plain-text chunk between two tajweed spans must keep its surrounding spaces.
const between = 'قُلْ <tajweed class=ham_wasl>ٱ</tajweed> ب <tajweed class=qalaqah>دْ</tajweed>';
const spans = parseTajweedHtml(between);
const plainChunks = spans.filter((s) => !s.rule).map((s) => s.text);

assert.ok(
  plainChunks.some((t) => t.includes(' ٱ') || t.trim() !== t),
  `a plain chunk adjacent to a tajweed span lost its whitespace - got ${JSON.stringify(plainChunks)}`
);
console.log('  ✓ inter-span whitespace survives (no .trim() on plain chunks)');

// 2. The exact shape that fused words: plain chunk AFTER a span must not be trimmed.
const after = '<tajweed class=ham_wasl>ٱ</tajweed>للَّهُ <tajweed class=madda_normal>ـٰ</tajweed>نِ';
const s2 = parseTajweedHtml(after);
const trailing = s2.filter((s) => !s.rule).map((s) => s.text);
assert.ok(
  trailing.some((t) => t.endsWith(' ')),
  `the plain chunk following a tajweed span lost its trailing space - got ${JSON.stringify(trailing)}`
);
console.log('  ✓ trailing space after a span survives');

// 3. Leading spaces are preserved too (the mirror of case 2).
const leading = ' بِسْمِ <tajweed class=ham_wasl>ٱ</tajweed>للَّهِ';
const s3 = parseTajweedHtml(leading);
const lead = s3.filter((s) => !s.rule).map((s) => s.text);
assert.ok(
  lead.some((t) => t.startsWith(' ')),
  `the plain chunk preceding a tajweed span lost its leading space - got ${JSON.stringify(lead)}`
);
console.log('  ✓ leading space before a span survives');

// 4. The ayah-end marker digits must STILL be stripped (the half of the old behaviour that was correct).
const withMarker = '<tajweed class=ghunnah>نَّ</tajweed>١٢٣';
const s4 = parseTajweedHtml(withMarker);
const cleaned = s4.filter((s) => !s.rule).map((s) => s.text).join('');
assert.ok(!/[٠-٩]/.test(cleaned), `ayah-end digits must still be stripped - got ${JSON.stringify(cleaned)}`);
console.log('  ✓ ayah-end marker digits still stripped');

// 5. Sanity: real captured payload still maps its rules.
const REAL_1_1 =
  'بِسْمِ <tajweed class=ham_wasl>ٱ</tajweed>للَّهِ <tajweed class=ham_wasl>ٱ</tajweed><tajweed class=laam_shamsiyah>ل</tajweed>رَّحْمَ<tajweed class=madda_normal>ـٰ</tajweed>نِ';
const rules = parseTajweedHtml(REAL_1_1).map((s) => s.rule).filter(Boolean);
assert.ok(rules.includes('silent') && rules.includes('madd'), 'real payload rule mapping intact');
console.log('  ✓ real 1:1 payload still maps classes');

console.log('\nall tajweed whitespace assertions passed');
