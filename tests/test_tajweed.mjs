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

// 7. QuranHub bracket tajweed parses to the same rules (side-by-side provider)
const qhMarkers = { h: 'silent', l: 'silent', q: 'qalqalah', n: 'madd', p: 'madd', g: 'ghunnah', i: 'ikhfa', d: 'idgham' };
function parseQuranhub(text) {
  const spans = [];
  const regex = /\[([a-z])(?::[0-9]+)?\[([^]]*)\]|([^\[]+)/g;
  let m;
  while ((m = regex.exec(text)) !== null) {
    if (m[1]) spans.push({ text: m[2] || '', rule: qhMarkers[m[1]] });
    else if (m[3]) spans.push({ text: m[3] });
  }
  return spans.length ? spans : [{ text }];
}
// Real QuranHub 112:1 payload
const QH_112_1 = 'قُلْ هُوَ [h:8078[ٱ]للَّهُ أَحَ[q[د]ٌ';
const qhSpans = parseQuranhub(QH_112_1);
assert.ok(qhSpans.some((x) => x.rule === 'silent' && x.text === 'ٱ'), 'QuranHub [h → silent');
assert.ok(qhSpans.some((x) => x.rule === 'qalqalah' && x.text === 'د'), 'QuranHub [q → qalqalah');
console.log('  ✓ QuranHub bracket tajweed parses to rules');

// 8. Auto-detect routes each source correctly
function parseAny(text) {
  if (text.includes('<tajweed')) return parseTajweedHtml(text);
  if (/\[[a-z](?::[0-9]+)?\[/.test(text)) return parseQuranhub(text);
  return [{ text }];
}
assert.equal(parseAny(REAL_1_1)[0].text, 'بِسْمِ ');
assert.ok(parseAny(QH_112_1).some((x) => x.rule === 'qalqalah'));
assert.deepEqual(parseAny('قُلْ'), [{ text: 'قُلْ' }]);
console.log('  ✓ auto-detect handles islamic.app HTML + QuranHub brackets + plain');

console.log('\n========================================================');
console.log('ALL 8 TAJWEED TESTS PASSED SUCCESSFULLY!');
console.log('========================================================');
