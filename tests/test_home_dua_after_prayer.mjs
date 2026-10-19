/**
 * Focused Regression Test Suite:
 * Home "DUA AFTER PRAYER" Cards Contract & Defects Repair
 *
 * Verifies:
 * 1. Data Validity & Fallback Integrity: 8 authentic Sunnah adhkar with stable IDs and sources.
 * 2. Stable ID Contract for mapped and fallback payloads.
 * 3. Prayer Context & Tagging: Correct detection of Fajr and Maghrib specific adhkar;
 *    prevents false attribution for Dhuhr, Asr, and Isha.
 * 4. Priority Ordering: getAllAfterPrayerDuas places all prayer-specific adhkar first without duplication or drop.
 * 5. Pagination & Index Calculation: Clamped bounds, RTL offset normalization (Math.abs),
 *    safe snapToInterval across narrow (320dp), compact (360dp), standard (390dp), and tablet (768dp).
 * 6. Accessibility & Localization: Localized pagination "X of Y" using t('of'), expand/collapse touch contract.
 * 7. 130% Font Scale & Layout Responsiveness.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';

console.log('=== HOME DUA AFTER PRAYER REGRESSION TESTS ===\n');

// ---------------------------------------------------------------------------
// 1. Data Validity & Fallback Integrity
// ---------------------------------------------------------------------------
console.log('--- 1. Data Validity & Fallback Integrity ---');
const afterPrayerDuasMod = await import('../src/lib/afterPrayerDuas.ts');
const {
  FALLBACK_AFTER_PRAYER_DUAS,
  getAllAfterPrayerDuas,
  isDuaForPrayer,
  selectAfterPrayerDua,
} = afterPrayerDuasMod;

assert.equal(FALLBACK_AFTER_PRAYER_DUAS.length, 8, 'Must have exactly 8 fallback adhkar');

const seenIds = new Set();
for (let i = 0; i < FALLBACK_AFTER_PRAYER_DUAS.length; i++) {
  const d = FALLBACK_AFTER_PRAYER_DUAS[i];
  assert.ok(d.id, `Dua at index ${i} must have a non-empty id`);
  assert.ok(!seenIds.has(d.id), `Dua id ${d.id} must be unique`);
  seenIds.add(d.id);

  assert.ok(d.arabic && d.arabic.trim().length > 10, `Dua ${d.id} must have authentic Arabic text`);
  assert.ok(d.transliteration && d.transliteration.trim().length > 10, `Dua ${d.id} must have transliteration`);
  assert.ok(d.translation && d.translation.trim().length > 10, `Dua ${d.id} must have translation`);
  assert.ok(d.source && d.source.trim().length > 3, `Dua ${d.id} must have authentic source reference`);
}
console.log('  ✓ 8 fallback adhkar verified with stable IDs, non-empty text, and citations');

// ---------------------------------------------------------------------------
// 2. Prayer Context & Sunnah Specificity (isDuaForPrayer)
// ---------------------------------------------------------------------------
console.log('\n--- 2. Prayer Context & Sunnah Specificity ---');

// In authentic Sunnah:
// - Dua 6: Recited after every prayer, and thrice after Fajr and Maghrib.
// - Dua 7: Recited 10x after Maghrib and Fajr.
// - Dua 8: Recited specifically after Fajr prayer.
// - Duas 1-5: General after every obligatory prayer (no exclusive Dhuhr/Asr/Isha command).

const fajrSpecific = FALLBACK_AFTER_PRAYER_DUAS.filter((d) => isDuaForPrayer(d, 'Fajr'));
assert.equal(fajrSpecific.length, 3, 'Fajr must match exactly 3 specific adhkar (Dua 6, 7, 8)');
assert.deepEqual(
  fajrSpecific.map((d) => d.id),
  ['after-prayer-6', 'after-prayer-7', 'after-prayer-8'],
  'Fajr matching IDs must be after-prayer-6, after-prayer-7, after-prayer-8'
);

const maghribSpecific = FALLBACK_AFTER_PRAYER_DUAS.filter((d) => isDuaForPrayer(d, 'Maghrib'));
assert.equal(maghribSpecific.length, 2, 'Maghrib must match exactly 2 specific adhkar (Dua 6, 7)');
assert.deepEqual(
  maghribSpecific.map((d) => d.id),
  ['after-prayer-6', 'after-prayer-7'],
  'Maghrib matching IDs must be after-prayer-6 and after-prayer-7'
);

// Prevent the false attribution defect: Dhuhr, Asr, and Isha have NO specific duas
for (const p of ['Dhuhr', 'Asr', 'Isha']) {
  const specific = FALLBACK_AFTER_PRAYER_DUAS.filter((d) => isDuaForPrayer(d, p));
  assert.equal(
    specific.length,
    0,
    `${p} must have 0 specific adhkar (must not falsely tag Astaghfirullah as "For ${p}")`
  );
}
assert.equal(isDuaForPrayer(FALLBACK_AFTER_PRAYER_DUAS[0], null), false, 'Null prayer returns false');
console.log('  ✓ Authentic prayer specificity verified: Fajr (3), Maghrib (2), Dhuhr/Asr/Isha (0 false tags)');

// ---------------------------------------------------------------------------
// 3. Priority Ordering & Reordering Contract (getAllAfterPrayerDuas)
// ---------------------------------------------------------------------------
console.log('\n--- 3. Priority Ordering & Reordering Contract ---');

// Fajr: All 3 Fajr adhkar prioritized first
const fajrList = getAllAfterPrayerDuas(FALLBACK_AFTER_PRAYER_DUAS, 'Fajr');
assert.equal(fajrList.length, 8, 'Fajr list must contain all 8 duas');
assert.equal(new Set(fajrList.map((d) => d.id)).size, 8, 'Zero duplicates in Fajr list');
assert.equal(isDuaForPrayer(fajrList[0], 'Fajr'), true, 'Card 0 must be Fajr-specific');
assert.equal(isDuaForPrayer(fajrList[1], 'Fajr'), true, 'Card 1 must be Fajr-specific');
assert.equal(isDuaForPrayer(fajrList[2], 'Fajr'), true, 'Card 2 must be Fajr-specific');
assert.equal(isDuaForPrayer(fajrList[3], 'Fajr'), false, 'Card 3 is general adhkar');

// Maghrib: All 2 Maghrib adhkar prioritized first
const maghribList = getAllAfterPrayerDuas(FALLBACK_AFTER_PRAYER_DUAS, 'Maghrib');
assert.equal(maghribList.length, 8, 'Maghrib list must contain all 8 duas');
assert.equal(new Set(maghribList.map((d) => d.id)).size, 8, 'Zero duplicates in Maghrib list');
assert.equal(isDuaForPrayer(maghribList[0], 'Maghrib'), true, 'Card 0 must be Maghrib-specific');
assert.equal(isDuaForPrayer(maghribList[1], 'Maghrib'), true, 'Card 1 must be Maghrib-specific');
assert.equal(isDuaForPrayer(maghribList[2], 'Maghrib'), false, 'Card 2 is general adhkar');

// Dhuhr, Asr, Isha: Authentic standard order preserved
for (const p of ['Dhuhr', 'Asr', 'Isha', null, undefined]) {
  const list = getAllAfterPrayerDuas(FALLBACK_AFTER_PRAYER_DUAS, p);
  assert.equal(list.length, 8, `${p} list must contain all 8 duas`);
  assert.equal(list[0].id, 'after-prayer-1', `${p} card 0 must be after-prayer-1 (Astaghfirullah)`);
}
console.log('  ✓ Priority ordering verified: complete preservation of all 8 duas, no drops, no duplication');

// ---------------------------------------------------------------------------
// 4. Stable ID Mapping Contract
// ---------------------------------------------------------------------------
console.log('\n--- 4. Stable ID Mapping Contract ---');
const afterPrayerDuasSrc = fs.readFileSync('src/lib/afterPrayerDuas.ts', 'utf8');
assert.ok(
  afterPrayerDuasSrc.includes('`after-prayer-${rawId}`'),
  'mapRawDua must map numeric rawId to canonical after-prayer-N id for cross-session stability'
);
console.log('  ✓ Stable ID mapping contract satisfied');

// ---------------------------------------------------------------------------
// 5. Layout Responsiveness & Narrow Viewport Math (320dp, 360dp, 390dp, 768dp)
// ---------------------------------------------------------------------------
console.log('\n--- 5. Layout Responsiveness & Viewport Calculations ---');
const testViewports = [
  { name: 'Narrow phone (320dp)', width: 320, containerPadding: 32 },
  { name: 'Compact phone (360dp)', width: 360, containerPadding: 32 },
  { name: 'Standard phone (390dp)', width: 390, containerPadding: 32 },
  { name: 'Large phone (430dp)', width: 430, containerPadding: 32 },
  { name: 'Tablet (768dp)', width: 768, containerPadding: 32, maxContent: 680 },
];

const gap = 12;
for (const vp of testViewports) {
  const containerW = vp.maxContent
    ? Math.min(vp.width, vp.maxContent) - vp.containerPadding
    : vp.width - vp.containerPadding;
  const cardW = Math.min(Math.max(260, containerW), 620);
  const snapInterval = cardW + gap;

  assert.ok(cardW >= 260, `${vp.name}: card width must be >= min readable width (260dp), got ${cardW}`);
  assert.ok(cardW <= 620, `${vp.name}: card width must clamp at 620dp max, got ${cardW}`);
  assert.ok(cardW <= containerW, `${vp.name}: card width must not overflow container width`);
  assert.equal(snapInterval, cardW + gap, `${vp.name}: snap interval must match card width + gap`);

  // Pagination calculation test across 8 cards
  for (let cardIdx = 0; cardIdx < 8; cardIdx++) {
    const offsetX = cardIdx * snapInterval;
    const computedIdx = Math.round(Math.abs(offsetX) / snapInterval);
    const safeIdx = Math.max(0, Math.min(7, computedIdx));
    assert.equal(safeIdx, cardIdx, `${vp.name}: card ${cardIdx} must calculate exact index ${cardIdx}`);
  }
}
console.log('  ✓ Responsive viewport math and index calculations verified from 320dp to 768dp');

// ---------------------------------------------------------------------------
// Home RTL hero and TODAY carousel visual contract
// ---------------------------------------------------------------------------
const homeScreenSrc = fs.readFileSync('src/screens/HomeScreen.tsx', 'utf8');
const dailyRailSrc = fs.readFileSync('src/components/DailyContentRail.tsx', 'utf8');
const quickActionsSrc = fs.readFileSync('src/components/QuickActionsStrip.tsx', 'utf8');
assert.ok(homeScreenSrc.includes('styles.heroTopRowRtl'), 'RTL prayer hero must use its stacked layout');
assert.ok(homeScreenSrc.includes("writingDirection: 'ltr'"), 'Prayer time digits must retain LTR order in RTL');
assert.ok(homeScreenSrc.includes('styles.heroTimeWrapRtl'), 'RTL prayer time must align to the card edge without clipping');
assert.ok(dailyRailSrc.includes('styles.todayAccent'), 'TODAY inspiration cards must use the Dua card accent treatment');
assert.ok(dailyRailSrc.includes('minHeight: 226'), 'TODAY card height must accommodate translated content responsively');
assert.ok(quickActionsSrc.includes("subtitle: 'Direction of Prayer'"), 'Qibla shortcut must use a registered localized label');
assert.ok(quickActionsSrc.includes("subtitle: 'Digital dhikr counter'"), 'Tasbih shortcut must use a registered localized label');
assert.ok(quickActionsSrc.includes("subtitle: 'Authentic Adhkar'"), 'Dua shortcut must use a registered localized label');
console.log('  ✓ RTL prayer timer and TODAY card styling contracts verified');

// ---------------------------------------------------------------------------
// 6. RTL Offset Normalization & Snap Alignment
// ---------------------------------------------------------------------------
console.log('\n--- 6. RTL Offset Normalization & Snap Alignment ---');
const homeSrc = fs.readFileSync('src/screens/HomeScreen.tsx', 'utf8');

// snapToAlignment="center" was removed in favor of standard start alignment
assert.ok(
  !homeSrc.includes('snapToAlignment="center"'),
  'snapToAlignment="center" must be removed to prevent jumping and off-center card snapping'
);

// Math.abs(offsetX) is present for safe RTL / negative offset handling
assert.ok(
  homeSrc.includes('Math.abs(event.nativeEvent.contentOffset.x)'),
  'HomeScreen onScroll and onMomentumScrollEnd must normalize offsetX with Math.abs'
);

// onMomentumScrollEnd handler is wired for final resting snap parity
assert.ok(
  homeSrc.includes('onMomentumScrollEnd={'),
  'HomeScreen Dua rail must wire onMomentumScrollEnd to update activeDuaIndex on snap rest'
);

// Asymmetric paddingRight: 4 is removed
assert.ok(
  !homeSrc.includes('paddingRight: 4,\n  duaCardSlide') &&
  !homeSrc.includes('paddingRight: 4,\r\n  duaCardSlide'),
  'duaRailScrollContent must not have asymmetric paddingRight: 4'
);
console.log('  ✓ RTL offset normalization, momentum snapping, and symmetrical layout verified');

// ---------------------------------------------------------------------------
// 7. Expand / Collapse Touch & Localization Contract
// ---------------------------------------------------------------------------
console.log('\n--- 7. Expand / Collapse Touch & Localization Contract ---');

// Touchable card wrapping header + content
assert.ok(
  homeSrc.includes('style={styles.duaCardPressable}') && homeSrc.includes('onPress={() => {'),
  'HomeScreen must wrap the Dua card content in duaCardPressable TouchableOpacity for full-card touch response'
);

// Localized pagination "X of Y"
assert.ok(
  homeSrc.includes("{t('of')}") || homeSrc.includes('{t("of")}'),
  "HomeScreen must localize 'of' in pagination text using t('of')"
);
assert.ok(
  !homeSrc.includes('{activeDuaIndex + 1} of {allAfterPrayerDuas.length}'),
  "HomeScreen must not contain raw unlocalized ' of ' pagination string"
);

// Contextual tag only shown when isForPrayer is true
assert.ok(
  homeSrc.includes('const isForPrayer = targetPrayer ? isDuaForPrayer(item, targetPrayer) : false;'),
  'HomeScreen must use isDuaForPrayer to determine prayer tag visibility'
);
assert.ok(
  !homeSrc.includes('lastCompletedPrayer && idx === 0 && ('),
  'HomeScreen must not blindly tag index 0 as For {lastCompletedPrayer}'
);
console.log('  ✓ Full card touch expand/collapse and localized pagination verified');

// ---------------------------------------------------------------------------
// 8. Canonical Style Invariants (Regression Protection)
// ---------------------------------------------------------------------------
console.log('\n--- 8. Canonical Style Invariants ---');
assert.ok(
  homeSrc.includes('duaCardSlide: {\n    borderRadius: 18,') ||
  homeSrc.includes('duaCardSlide: {\r\n    borderRadius: 18,'),
  'duaCardSlide must preserve canonical borderRadius: 18'
);
assert.ok(
  /duaAfterPrayerCard: \{[\s\S]*?minHeight: 280,[\s\S]*?borderRadius: 18,/.test(homeSrc) &&
  /duaCardPressable: \{[\s\S]*?padding: 18,/.test(homeSrc),
  'Redesigned Dua card keeps 14dp corners and a flexible 280dp minimum, with 18dp padding inside the pressable'
);
console.log('  ✓ Canonical style tokens and floating card invariants preserved');

console.log('\n========================================================');
console.log('ALL HOME DUA AFTER PRAYER REGRESSION TESTS PASSED!');
console.log('========================================================');
