import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const read = (file) => fs.readFileSync(path.join(process.cwd(), file), 'utf8');
const arabicText = read('src/components/ArabicText.tsx');
const appText = read('src/components/ui/AppText.tsx');
assert.match(arabicText, /Math\.max\(requestedLineHeight \?\? 0, minimumLineHeight\)/);
assert.match(arabicText, /\{ lineHeight: resolvedLineHeight \}/);
assert.match(appText, /safeLineHeight === undefined \? undefined : \{ lineHeight: safeLineHeight \}/);

const prayerGuide = read('src/screens/PrayerGuideScreen.tsx');
const umrahGuide = read('src/screens/UmrahGuideScreen.tsx');
const hajjJourney = read('src/screens/HajjJourneyScreen.tsx');
for (const [name, source, offset] of [
  ['Prayer Guide', prayerGuide, 'sectionOffsets.current[sec.id]'],
  ['Umrah Guide', umrahGuide, 'stepOffsets.current[s.id]'],
  ['Hajj Journey', hajjJourney, 'dayOffsets.current[d.id]'],
]) {
  assert.ok(source.includes(offset), `${name} quick navigation must locate its selected section`);
  assert.ok(source.includes('scrollRef.current?.scrollTo'), `${name} quick navigation must scroll to the section`);
}

assert.ok(read('src/screens/LocationScreen.tsx').includes('styles.coordsRowCompact'), 'location coordinate fields must stack on narrow screens');
assert.ok(read('src/screens/DownloadsScreen.tsx').includes('styles.nameColumn'), 'download names must stack on compact screens');
assert.ok(!read('src/screens/DuasScreen.tsx').includes('autoFocus'), 'Duas screen should not open the keyboard over the content on entry');
assert.ok(read('src/screens/WomenQadaScreen.tsx').includes('hitSlop={touchTargetTokens.hitSlop10}'), 'Qada status controls must have a usable touch target');

const settings = read('src/screens/SettingsScreen.tsx');
assert.ok(!settings.includes('Accent color'), 'the ineffective accent color picker should be removed from Settings');
assert.ok(settings.includes('handleThemeModeChange'), 'theme mode selection must remain wired');
assert.ok(settings.includes('setHapticsEnabled'), 'the haptics toggle must remain wired');
assert.ok(!read('src/lib/theme.tsx').includes('accentKey'), 'unused accent state should not drive the theme provider');

const mosqueFinder = read('src/screens/MosqueFinderScreen.tsx');
assert.ok(mosqueFinder.includes('fetchNearbyMosques'), 'Mosque Finder must use the tested API client');
assert.ok(mosqueFinder.includes('mosqueRequestIdRef'), 'late API responses must not replace the current search results');
assert.ok(mosqueFinder.includes('activeAreaSearchRef'), 'an area search must be cancellable when replaced');
assert.ok(!/onPress=\{\(\)\s*=>\s*\{\s*\}\s*\}/.test(read('src/screens/CalendarScreen.tsx')), 'calendar event cards must not expose an empty press action');

function collectSourceFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return collectSourceFiles(target);
    return /\.(tsx|ts)$/.test(entry.name) ? [target] : [];
  });
}
const inertHandler = /onPress=\{\(\)\s*=>\s*\{\s*\}\s*\}/;
const inertFile = collectSourceFiles('src').find((file) => inertHandler.test(fs.readFileSync(file, 'utf8')));
assert.equal(inertFile, undefined, `no empty onPress callbacks should remain (${inertFile ?? ''})`);

console.log('✓ Arabic line boxes, narrow layouts, quick-jump controls, theme settings, and press handlers verified');
