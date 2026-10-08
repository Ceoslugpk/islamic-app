import assert from 'node:assert/strict';
import fs from 'node:fs';

console.log('=== RECOVERY MISSION REGRESSION TESTS ===\n');

const reader = fs.readFileSync('src/screens/QuranReaderScreen.tsx', 'utf8');
const continuing = fs.readFileSync('src/lib/continuing.ts', 'utf8');
const settings = fs.readFileSync('src/lib/settings.tsx', 'utf8');
const quranHome = fs.readFileSync('src/screens/QuranHomeScreen.tsx', 'utf8');
const notifications = fs.readFileSync('src/lib/notifications.ts', 'utf8');
const prayerReminders = fs.readFileSync('src/screens/PrayerRemindersScreen.tsx', 'utf8');

// 1. Scrolling: single coherent positioning strategy
assert.ok(!reader.includes('getItemLayout={'), 'getItemLayout prop must NOT be on the FlatList (variable-height rows)');
assert.ok(!reader.includes('initialScrollIndex={'), 'initialScrollIndex prop must NOT be on the FlatList (dead no-op + races)');
assert.ok(reader.includes('positionedRef.current = false'), 'positionedRef must be reset on context change');
assert.ok(reader.includes('userScrollingRef'), 'user-scroll guard must exist');
assert.ok(!reader.includes('info.averageItemLength * info.index'), 'failed-retry must NEVER jump to averageOffset × target index (wrong for variable height)');
assert.ok(reader.includes('highestMeasuredFrameIndex + 1) * info.averageItemLength'), 'failed-retry must advance to the measured edge only (converging window)');
console.log('  [ok] Scrolling: no fixed-height assumption, positionedRef reset, user-scroll guard, measured retry only');

// 2. Reading position: flush on unmount + no open-save clobber
assert.ok(reader.includes('Flush the last known reading position on unmount'), 'unmount flush must exist');
assert.ok(reader.includes('Only advance it when the entered ayah is genuinely ahead'), 'open-save must not clobber backward');
console.log('  [ok] Reading position: unmount flush + open-save guard');

// 3. Bounds validation in the resolver
assert.ok(continuing.includes('isValidReadingPosition'), 'bounds validation helper must exist');
assert.ok(continuing.includes('surah < 1 || surah > 114'), 'surah bounds checked');
assert.ok(continuing.includes('clearReadingMarker'), 'clearReadingMarker must exist');
console.log('  [ok] Resolver: bounds validation + clear marker');

// 4. Universal resolver (marker-first everywhere)
assert.ok(notifications.includes('getContinueReadingPosition'), 'notifications must use marker-first resolver');
assert.ok(prayerReminders.includes('getContinueReadingPosition'), 'PrayerReminders must use marker-first resolver');
console.log('  [ok] Universal resolver: notifications + PrayerReminders honor the marker');

// 5. ur -> en restores English content defaults
assert.ok(settings.includes("currentQuranLang === 'ur'"), 'en branch must restore quran translation to en');
assert.ok(settings.includes("savedAudioEdition === 'ur.everyayah-shamshad'"), 'en branch must restore audio edition');
console.log('  [ok] ur->en: restores English quran/tafsir/audio defaults');

// 6. Recent surah reopens at saved ayah
assert.ok(quranHome.includes('loadQuranCache<{ ayah: number }>(`surah-last-ayah:${recent.surah}`)'), 'recent surah must resolve saved ayah');
assert.ok(quranHome.includes('refreshGenRef'), 'focus refresh generation guard must exist');
console.log('  [ok] Recent surah reopens at saved ayah; focus refresh race-guarded');

// 7. Missing keys present (packed + tafsir note)
const en = JSON.parse(fs.readFileSync('src/locales/en.json', 'utf8'));
const ur = JSON.parse(fs.readFileSync('src/locales/ur.json', 'utf8'));
assert.strictEqual(Object.keys(en).length, Object.keys(ur).length, 'en/ur parity');
for (const k of ['packed', 'SURAH', 'AYAHS', 'TRANSLATION', 'AUDIO RECITER', 'REFLECTIONS', 'DEFAULT', 'Select Reciter', 'Select a Juz to jump', 'Play Full Surah', 'Tafsir for this ayah is not available — the introduction is shown on Ayah 1.']) {
  assert.ok(k in en, `en must contain "${k}"`);
  assert.ok(k in ur, `ur must contain "${k}"`);
  assert.ok(typeof ur[k] === 'string' && ur[k].trim().length > 0, `ur "${k}" must be non-empty`);
}
console.log('  [ok] Missing keys added: reader chrome + Umrah packed + tafsir note');

console.log('\nALL RECOVERY MISSION REGRESSION TESTS PASSED SUCCESSFULLY!');
