/**
 * Tajweed parser tests — self-contained (mirrors src/lib/tajweed.ts logic
 * parsing islamic.app `text_uthmani_tajweed` HTML).
 */
import assert from 'node:assert/strict';

console.log('=== TAJWEED PARSER TEST SUITE ===\n');

const CLASS_MAP = {
  ham_wasl: 'silent',
  laam_shamsiyah: 'silent',
  qalaqah: 'qalqalah',
  madda_normal: 'madd',
  madda_permissible: 'madd',
  idgham_wo_ghunnah: 'idgham',
  ikhfa: 'ikhfa',
  ghunnah: 'ghunnah',
};

function parseTajweedHtml(text) {
  const spans = [];
  const regex = /<tajweed class=([a-z_]+)>([^<]*)<\/tajweed>|([^<]+)/g;
  let m;
  while ((m = regex.exec(text)) !== null) {
    if (m[1]) {
      spans.push({ text: m[2] || '', rule: CLASS_MAP[m[1]] });
    } else if (m[3]) {
      spans.push({ text: m[3] });
    }
  }
  return spans.length ? spans : [{ text }];
}

function stripTajweedHtml(text) {
  return text.replace(/<tajweed class=[a-z_]+>([^<]*)<\/tajweed>/g, '$1').replace(/<end[^>]*\/?>/g, '');
}

// Real payloads captured live from api.islamic.app (surah 1:1, 112:1)
const REAL_1_1 = 'بِسْمِ <tajweed class=ham_wasl>ٱ</tajweed>للَّهِ <tajweed class=ham_wasl>ٱ</tajweed><tajweed class=laam_shamsiyah>ل</tajweed>رَّحْمَ<tajweed class=madda_normal>ـٰ</tajweed>نِ';
const REAL_112_1 = 'قُلْ هُوَ <tajweed class=ham_wasl>ٱ</tajweed>للَّهُ أَحَ<tajweed class=qalaqah>دْ</tajweed>';

// 1. Plain text → single unmarked span
assert.deepEqual(parseTajweedHtml('قُلْ'), [{ text: 'قُلْ' }]);
console.log('  ✓ plain text stays unmarked');

// 2. Real 1:1 payload parses into expected rules
const s1 = parseTajweedHtml(REAL_1_1);
const rules = s1.map((x) => x.rule).filter(Boolean);
assert.ok(rules.includes('silent'), 'ham_wasl → silent');
assert.ok(rules.includes('madd'), 'madda_normal → madd');
assert.ok(s1.some((x) => x.rule === 'silent' && x.text === 'ل'), 'laam_shamsiyah → silent lam');
console.log('  ✓ real 1:1 payload maps classes correctly');

// 3. Real 112:1 qalqalah
const s3 = parseTajweedHtml(REAL_112_1);
assert.ok(s3.some((x) => x.rule === 'qalqalah' && x.text === 'دْ'), 'qalaqah → qalqalah');
console.log('  ✓ real 112:1 qalqalah maps');

// 4. Stripping restores plain Uthmani (no tags)
const plain = stripTajweedHtml(REAL_1_1);
assert.ok(!plain.includes('<tajweed'), 'tags removed');
assert.ok(plain.includes('بِسْمِ') && plain.includes('ٱللَّهِ') && plain.includes('نِ'), 'text preserved');
console.log('  ✓ stripping is lossless');

// 5. All known classes map to a rule
for (const [, rule] of Object.entries(CLASS_MAP)) {
  assert.ok(['ghunnah', 'idgham', 'silent', 'qalqalah', 'ikhfa', 'madd'].includes(rule), `${rule} valid`);
}
console.log('  ✓ every class maps to a display rule');

// 6. Empty text → single empty span (no crash)
assert.deepEqual(parseTajweedHtml(''), [{ text: '' }]);
console.log('  ✓ empty text handled');

console.log('\n========================================================');
console.log('ALL 6 TAJWEED TESTS PASSED SUCCESSFULLY!');
console.log('========================================================');
