/**
 * Tajweed parser tests — self-contained (mirrors src/lib/tajweed.ts logic).
 */
import assert from 'node:assert/strict';

console.log('=== TAJWEED PARSER TEST SUITE ===\n');

const MARKER_MAP = { m: 'ghunnah', d: 'idgham', s: 'silent', q: 'qalqalah', i: 'ikhfa', g: 'madd' };

function parseTajweed(text) {
  const spans = [];
  const regex = /\{([a-z])\}([^{]*)/g;
  let lastIndex = 0;
  let m;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > lastIndex) spans.push({ text: text.slice(lastIndex, m.index) });
    spans.push({ text: m[2], rule: MARKER_MAP[m[1]] });
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) spans.push({ text: text.slice(lastIndex) });
  return spans.length ? spans : [{ text }];
}

function stripMarkers(text) {
  return text.replace(/\{[a-z]\}/g, '');
}

// 1. Plain text → single unmarked span
assert.deepEqual(parseTajweed('قُلْ'), [{ text: 'قُلْ' }]);
console.log('  ✓ plain text stays unmarked');

// 2. One marker splits into marked span
const s1 = parseTajweed('بِسْمِ {i}ٱللَّهِ');
assert.equal(s1.length, 2);
assert.equal(s1[0].text, 'بِسْمِ ');
assert.equal(s1[1].rule, 'ikhfa');
console.log('  ✓ single marker maps to rule');

// 3. Multiple markers
const s2 = parseTajweed('{q}ٱلْحَمْدُ {i}ٱلْعَـٰلَمِينَ');
assert.equal(s2.length, 2);
assert.equal(s2[0].rule, 'qalqalah');
assert.equal(s2[1].rule, 'ikhfa');
console.log('  ✓ multiple markers each map');

// 4. Stripping markers restores plain text
const tagged = '{i}ٱللَّهِ {q}ٱلرَّحْمَـٰنِ';
assert.equal(stripMarkers(tagged), 'ٱللَّهِ ٱلرَّحْمَـٰنِ');
console.log('  ✓ marker stripping is lossless for display');

// 5. All curated surah ayahs parse without throwing + every marker maps
const curated = [
  'بِسْمِ {i}ٱللَّهِ {q}ٱلرَّحْمَـٰنِ {i}ٱلرَّحِيمِ',
  '{q}ٱلْحَمْدُ لِلَّهِ رَبِّ {i}ٱلْعَـٰلَمِينَ',
  'وَلَمْ يَكُن لَّهُ كُفُوًا أَحَدٌ',
  'قُلْ أَعُوذُ بِرَبِّ {i}ٱلْفَلَقِ',
];
for (const ayah of curated) {
  const spans = parseTajweed(ayah);
  assert.ok(spans.length >= 1);
  for (const sp of spans) {
    if (sp.rule) assert.ok(Object.values(MARKER_MAP).includes(sp.rule));
  }
}
console.log('  ✓ all curated markers resolve to known rules');

// 6. Empty text → single empty span (no crash)
assert.deepEqual(parseTajweed(''), [{ text: '' }]);
console.log('  ✓ empty text handled');

console.log('\n========================================================');
console.log('ALL 6 TAJWEED TESTS PASSED SUCCESSFULLY!');
console.log('========================================================');
