import fs from 'node:fs';
import assert from 'node:assert/strict';

const reader = fs.readFileSync('src/screens/QuranReaderScreen.tsx', 'utf8');
const settings = fs.readFileSync('src/lib/settings.tsx', 'utf8');

assert.match(reader, /typeof initialPage !== 'number'/, 'ordinary Surah opens must create an ayah target');
assert.match(reader, /\{ surah: safeSurahNumber, ayah: 1 \}/, 'ordinary Surah opens must target ayah 1');
assert.match(reader, /restorationTargetRef\.current =/, 'Mushaf restoration target must be reset on navigation changes');
assert.match(reader, /handleMushafAyahLayout/, 'Mushaf target must use measured ayah layout');
assert.match(settings, /hydrationBaselineRef/, 'settings hydration must retain an initial baseline');
assert.match(settings, /changedDuringHydration/, 'settings hydration must merge live changes');
assert.match(settings, /Object\.is\(live\[typedKey\], baseline\[typedKey\]\)/, 'hydration merge must detect changed fields');

console.log('✓ Surah-start and settings-hydration race contracts verified');
