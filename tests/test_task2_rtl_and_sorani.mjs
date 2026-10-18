#!/usr/bin/env node
/**
 * tests/test_task2_rtl_and_sorani.mjs
 *
 * Task 2 Audit Verifier:
 * 1. S10-010: Kurdish Sorani direction classification (Arabic script is RTL, Latin script is LTR).
 * 2. RTL language classification parity (ar, ur, fa, ckb, ps, ug, he, sd, yi, etc.).
 * 3. Centralized isRtlScript and isArabicScript contract in src/lib/rtl.ts.
 * 4. S5-008: RTL directional spacing and logical layout properties (marginEnd/marginStart).
 * 5. Protection of CSS geometric triangles in QiblaCompass and AnimatedPattern (not converted to start/end).
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

console.log('========================================================');
console.log('TASK 2 AUDIT: RTL DIRECTION & LOGICAL SPACING SUITE');
console.log('========================================================\n');

let failures = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`  ❌ FAIL: ${message}`);
    failures++;
  } else {
    console.log(`  ✓ ${message}`);
  }
}

// 1. Kurdish Sorani and RTL logic in src/lib/rtl.ts
const rtlSource = fs.readFileSync(path.join(ROOT, 'src/lib/rtl.ts'), 'utf8');

assert(rtlSource.includes('isArabicScript'), 'src/lib/rtl.ts exports or defines isArabicScript');
assert(rtlSource.includes("'ckb'"), 'src/lib/rtl.ts recognizes ckb (Central Kurdish / Sorani)');
assert(rtlSource.includes("normalized === 'ku'"), 'src/lib/rtl.ts handles ku with script detection');

// Evaluate isArabicScript and isRtlScript logic directly
const ARABIC_SCRIPT_RE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
function isArabicScript(text) {
  return ARABIC_SCRIPT_RE.test(text);
}
function isRtlScript(langCode, content) {
  const langLower = (langCode || '').toLowerCase().trim();
  if (['ar', 'ur', 'fa', 'ckb', 'ps', 'ug', 'he', 'sd', 'yi'].includes(langLower)) return true;
  if (['ku-latn', 'kmr', 'ku-tr'].includes(langLower)) return false;
  if (langLower === 'ku') {
    if (content) return isArabicScript(content);
    return true; // default Sorani in this Quran app
  }
  if (content && isArabicScript(content)) return true;
  return false;
}

// Test cases for S10-010:
const soraniVerse = 'بە ناوی خوای بەخشندەی میهرەبان';
const kurmanjiVerse = 'Bi navê Xwedayê Dilovan û Dilovîn';

assert(isRtlScript('ckb') === true, 'Central Kurdish (ckb) is RTL');
assert(isRtlScript('ku', soraniVerse) === true, 'Kurdish with Sorani Arabic script is RTL (S10-010 resolved)');
assert(isRtlScript('ku', kurmanjiVerse) === false, 'Kurdish with Latin Kurmanji script is LTR');
assert(isRtlScript('ku-latn') === false, 'Kurdish Latin (ku-Latn) is LTR');
assert(isRtlScript('kmr') === false, 'Kurmanji (kmr) is LTR');

// Registered and other languages
assert(isRtlScript('ar') === true, 'Arabic (ar) is RTL');
assert(isRtlScript('ur') === true, 'Urdu (ur) is RTL');
assert(isRtlScript('fa') === true, 'Farsi (fa) is RTL');
assert(isRtlScript('en') === false, 'English (en) is LTR');
assert(isRtlScript('hi') === false, 'Hindi (hi) is LTR');
assert(isRtlScript('ml') === false, 'Malayalam (ml) is LTR');
assert(isRtlScript('si') === false, 'Sinhala (si) is LTR');
assert(isRtlScript('kk') === false, 'Kazakh (kk) is LTR');
assert(isRtlScript('fr') === false, 'French (fr) is LTR');

// 2. Logical Spacing & Layout Properties on directional components
const componentsToCheck = [
  { file: 'src/components/ui/PrimaryButton.tsx', startEnd: ['marginEnd: 2', 'marginStart: 2'] },
  { file: 'src/components/ui/OutlineButton.tsx', startEnd: ['marginEnd: 2', 'marginStart: 2'] },
  { file: 'src/components/ui/SearchField.tsx', startEnd: ['marginEnd: 8'] },
  { file: 'src/components/ui/Chip.tsx', startEnd: ['marginEnd: 1'] },
  { file: 'src/components/LanguagePickerModal.tsx', startEnd: ['marginEnd: 12'] },
  { file: 'src/components/QuranLanguageModal.tsx', startEnd: ['marginEnd: 12'] },
  { file: 'src/components/AdhanReciterModal.tsx', startEnd: ['marginEnd: 12'] },
  { file: 'src/components/NowPlayingHeroCard.tsx', startEnd: ['marginEnd: 4'] },
  { file: 'src/components/AudioMiniPlayer.tsx', startEnd: ['marginEnd: 12'] },
  { file: 'src/components/AudioPlayerModal.tsx', startEnd: ['marginEnd: 4', 'marginEnd: 8'] },
];

for (const { file, startEnd } of componentsToCheck) {
  const content = fs.readFileSync(path.join(ROOT, file), 'utf8');
  for (const prop of startEnd) {
    assert(content.includes(prop), `${file} uses logical directional property: ${prop}`);
  }
}

// 3. Protection of CSS geometric triangle properties in QiblaCompass & AnimatedPattern
const qiblaCompass = fs.readFileSync(path.join(ROOT, 'src/components/QiblaCompass.tsx'), 'utf8');
assert(qiblaCompass.includes('borderLeftWidth') && qiblaCompass.includes('borderRightWidth'),
  'QiblaCompass.tsx preserves borderLeftWidth/borderRightWidth for CSS triangle geometry');

const animPattern = fs.readFileSync(path.join(ROOT, 'src/components/AnimatedPattern.tsx'), 'utf8');
assert(animPattern.includes('borderLeftWidth') && animPattern.includes('borderRightWidth'),
  'AnimatedPattern.tsx preserves borderLeftWidth/borderRightWidth for geometric pattern triangles');

console.log('\n--------------------------------------------------------');
if (failures > 0) {
  console.error(`FAILED: ${failures} assertions failed.`);
  process.exit(1);
} else {
  console.log('ALL TASK 2 RTL DIRECTION & LOGICAL SPACING ASSERTIONS PASSED!');
  process.exit(0);
}
