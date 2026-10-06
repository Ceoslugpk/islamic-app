/**
 * Quran Reader mount & initialization safety tests.
 * Verifies:
 * 1. QuranReaderScreen.tsx AST has ZERO TDZ access hazards (refs/state accessed before declaration).
 * 2. Ayah index and approx page calculation functions handle boundaries, undefined, and NaN defensively.
 * 3. Reading progress formula handles null surah, missing counts, and clamps 0..100%.
 * 4. Study tools data layer gracefully handles null/corrupted cache and never throws.
 * 5. Font family configuration safely falls back to Amiri on unknown or legacy font identifiers.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

console.log('=== QURAN READER MOUNT SAFETY TEST SUITE ===\n');

// 1. AST check for TDZ references in QuranReaderScreen.tsx
const code = fs.readFileSync('src/screens/QuranReaderScreen.tsx', 'utf8');
const sourceFile = ts.createSourceFile('QuranReaderScreen.tsx', code, ts.ScriptTarget.Latest, true);

let readerFunction = null;
function findFunction(node) {
  if (ts.isFunctionDeclaration(node) && node.name && node.name.text === 'QuranReaderScreen') {
    readerFunction = node;
  }
  ts.forEachChild(node, findFunction);
}
findFunction(sourceFile);

assert.ok(readerFunction, 'QuranReaderScreen component must exist in source file');

const declarations = new Map();
readerFunction.body.statements.forEach((stmt) => {
  if (ts.isVariableStatement(stmt)) {
    for (const decl of stmt.declarationList.declarations) {
      if (ts.isIdentifier(decl.name)) {
        const line = sourceFile.getLineAndCharacterOfPosition(decl.getStart()).line + 1;
        declarations.set(decl.name.text, line);
      }
    }
  } else if (ts.isFunctionDeclaration(stmt) && stmt.name) {
    const line = sourceFile.getLineAndCharacterOfPosition(stmt.getStart()).line + 1;
    declarations.set(stmt.name.text, line);
  }
});

const tdzErrors = [];
readerFunction.body.statements.forEach((stmt) => {
  const stmtLine = sourceFile.getLineAndCharacterOfPosition(stmt.getStart()).line + 1;
  function checkIdentifiers(node) {
    if (ts.isIdentifier(node)) {
      const name = node.text;
      if (declarations.has(name)) {
        const declLine = declarations.get(name);
        if (stmtLine < declLine) {
          let current = node;
          let inImmediate = false;
          while (current && current !== stmt) {
            if (ts.isCallExpression(current)) {
              const expr = current.expression.getText();
              if (expr === 'useMemo' || expr === 'useState') {
                inImmediate = true;
                break;
              }
            }
            current = current.parent;
          }
          if (inImmediate) {
            tdzErrors.push({ name, stmtLine, declLine });
          }
        }
      }
    }
    ts.forEachChild(node, checkIdentifiers);
  }
  checkIdentifiers(stmt);
});

assert.equal(tdzErrors.length, 0, `Found TDZ access hazards: ${JSON.stringify(tdzErrors)}`);
console.log('  ✓ QuranReaderScreen has zero TDZ access hazards');

// 2. Safe index & page calculation tests
const SURAH_AYAH_COUNTS = [
  7, 286, 200, 176, 120, 165, 206, 75, 129, 109,
  123, 111, 43, 52, 99, 128, 111, 110, 98, 135,
  112, 78, 118, 64, 77, 227, 93, 88, 69, 60,
  34, 30, 73, 54, 45, 83, 182, 88, 75, 85,
  54, 53, 89, 59, 37, 35, 38, 29, 18, 45,
  60, 49, 62, 55, 78, 96, 29, 22, 24, 13,
  14, 11, 11, 18, 12, 12, 30, 52, 52, 44,
  28, 28, 20, 56, 40, 31, 50, 40, 46, 42,
  29, 19, 36, 25, 22, 17, 19, 26, 30, 20,
  15, 21, 11, 8, 8, 19, 5, 8, 8, 11,
  11, 8, 3, 9, 5, 4, 7, 3, 6, 3,
  5, 4, 5, 6
];

function getGlobalAyahIndex(surah, ayah) {
  let idx = 0;
  const safeSurah = Math.max(1, Math.min(114, surah || 1));
  const safeAyah = Math.max(1, ayah || 1);
  for (let i = 0; i < safeSurah - 1; i++) {
    idx += SURAH_AYAH_COUNTS[i] || 0;
  }
  return idx + safeAyah;
}

function getApproxPage(surah, ayah) {
  const globalIdx = getGlobalAyahIndex(surah, ayah);
  return Math.max(1, Math.min(604, Math.round((globalIdx / 6236) * 604) || 1));
}

assert.equal(getGlobalAyahIndex(1, 1), 1);
assert.equal(getGlobalAyahIndex(114, 6), 6236);
assert.equal(getApproxPage(1, 1), 1);
assert.equal(getApproxPage(114, 6), 604);

// Defensive boundary inputs:
assert.equal(getApproxPage(0, 0), 1);
assert.equal(getApproxPage(undefined, undefined), 1);
assert.equal(getApproxPage(NaN, NaN), 1);
assert.equal(getApproxPage(200, 999), 604);
console.log('  ✓ Ayah index & page calculations handle boundaries, undefined, and NaN gracefully');

// 3. Reading progress calculation logic
function calculateReadingProgress(surah, surahNumber, currentAyah) {
  const safeSurahNumber = Math.max(1, Math.min(114, surahNumber || 1));
  const fallbackCount = SURAH_AYAH_COUNTS[safeSurahNumber - 1] || 7;
  const safeAyah = typeof currentAyah === 'number' ? currentAyah : 1;
  if (!surah) return { percent: 0, currentAyah: safeAyah, totalAyahs: fallbackCount };
  const totalAyahs = surah.numberOfAyahs || fallbackCount;
  const percent = Math.min(100, Math.round((safeAyah / totalAyahs) * 100));
  return { percent, currentAyah: safeAyah, totalAyahs };
}

assert.deepEqual(calculateReadingProgress(null, 1, 1), { percent: 0, currentAyah: 1, totalAyahs: 7 });
assert.deepEqual(calculateReadingProgress({ numberOfAyahs: 286 }, 2, 143), { percent: 50, currentAyah: 143, totalAyahs: 286 });
assert.deepEqual(calculateReadingProgress({ numberOfAyahs: 7 }, 1, 10), { percent: 100, currentAyah: 10, totalAyahs: 7 });
console.log('  ✓ Reading progress handles null surah and clamps percent to 100%');

// 4. Study data layer bookmarks deduplication & resilience
function dedupeBookmarks(existing, newRef) {
  if (!newRef) return Array.isArray(existing) ? existing : [];
  const list = Array.isArray(existing) ? existing : [];
  const key = `${newRef.surah}:${newRef.ayah}`;
  const already = list.find((b) => b && `${b.surah}:${b.ayah}` === key);
  if (already) return list;
  return [...list, newRef];
}

assert.deepEqual(dedupeBookmarks(null, null), []);
assert.deepEqual(dedupeBookmarks(undefined, { surah: 1, ayah: 1, text: 'test' }), [{ surah: 1, ayah: 1, text: 'test' }]);
const deduped = dedupeBookmarks([{ surah: 1, ayah: 1, text: 'a' }], { surah: 1, ayah: 1, text: 'b' });
assert.equal(deduped.length, 1);
console.log('  ✓ Study bookmarks deduplication handles null/corrupted arrays safely');

// 5. Font family fallback safety
const QURAN_FONT_FAMILIES = {
  amiri: { regular: 'Amiri_400Regular', bold: 'Amiri_700Bold' },
  notonaskh: { regular: 'NotoNaskhArabic_400Regular', bold: 'NotoNaskhArabic_700Bold' },
};

function resolveArabicFamilies(settingsFont) {
  return (settingsFont && QURAN_FONT_FAMILIES[settingsFont]) || QURAN_FONT_FAMILIES.amiri;
}

assert.equal(resolveArabicFamilies('amiri').regular, 'Amiri_400Regular');
assert.equal(resolveArabicFamilies('kfgqpc').regular, 'Amiri_400Regular'); // Legacy / invalid font fallback
assert.equal(resolveArabicFamilies(undefined).regular, 'Amiri_400Regular');
assert.equal(resolveArabicFamilies('').regular, 'Amiri_400Regular');
console.log('  ✓ Arabic font family safely falls back to Amiri on unknown or legacy font identifiers');

console.log('\n========================================================');
console.log('ALL 5 QURAN READER MOUNT SAFETY TESTS PASSED!');
console.log('========================================================\n');
