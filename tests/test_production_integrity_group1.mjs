import assert from 'node:assert/strict';
import fs from 'node:fs';

console.log('=== GROUP 1 PRODUCTION INTEGRITY & DATA REGRESSION SUITE ===\n');

// 1. PIN upgrade and settings queue verification
console.log('--- 1. PIN Upgrade Direct Write Removal & Shared Queue Routing ---');
const privacyCode = fs.readFileSync('src/lib/privacy.ts', 'utf8');
assert.ok(
  !privacyCode.includes("AsyncStorage.setItem('islamic-settings'"),
  'privacy.ts must NOT directly write islamic-settings with raw AsyncStorage.setItem'
);
assert.ok(
  privacyCode.includes('enqueueSettingsUpdate'),
  'privacy.ts must route PIN upgrade through enqueueSettingsUpdate'
);

const settingsCode = fs.readFileSync('src/lib/settings.tsx', 'utf8');
assert.ok(
  settingsCode.includes('export async function enqueueSettingsUpdate('),
  'settings.tsx must export enqueueSettingsUpdate'
);
assert.ok(
  settingsCode.includes('defaultSharedSettingsWriter'),
  'settings.tsx must unify defaultSharedSettingsWriter queue across provider and standalone callers'
);

// 2. WomenPinModal onSetPin routing
console.log('--- 2. WomenPinModal Provider-First Routing ---');
const modalCode = fs.readFileSync('src/components/WomenPinModal.tsx', 'utf8');
assert.ok(
  modalCode.includes('if (onSetPin) {\n            onSetPin(res.upgradedHash);\n          } else {\n            await persistUpgradedPinHash(res.upgradedHash);\n          }'),
  'WomenPinModal must prioritize onSetPin over standalone persistUpgradedPinHash'
);

// 3. Women\'s Worship render gate and disable cleanup in App.tsx
console.log('--- 3. Women\'s Worship Render Gate & Deep-Link Safety ---');
const appCode = fs.readFileSync('App.tsx', 'utf8');
assert.ok(
  !appCode.includes("tools.screen === 'women-cycle' || tools.screen === 'women-qada') && (tools.screen === 'women-cycle'"),
  'App.tsx must NOT allow tools.screen alone to bypass settings.womenWorshipEnabled'
);
assert.ok(
  appCode.includes("{settings.womenWorshipEnabled && (tools.screen === 'women-cycle' || tools.screen === 'women-purity' || tools.screen === 'women-guidance' || tools.screen === 'women-qada') && ("),
  'App.tsx must strictly gate Tools Women\'s Worship views with settings.womenWorshipEnabled'
);
assert.ok(
  appCode.includes('if (!settings.womenWorshipEnabled) return;') && appCode.includes('const openToolsItem'),
  'openToolsItem must return early if womenWorshipEnabled is false'
);
assert.ok(
  appCode.includes('if (!settings.womenWorshipEnabled) return;') && appCode.includes('const openLibraryItem'),
  'openLibraryItem must return early if womenWorshipEnabled is false'
);
assert.ok(
  appCode.includes('if (target.type.startsWith(\'women-\') && !settings.womenWorshipEnabled) {\n        return;\n      }'),
  'routeDeepLinkUrl must reject women- deep links if womenWorshipEnabled is false'
);
assert.ok(
  appCode.includes('if (!settings.womenWorshipEnabled) {\n      setWomenUnlocked(false);\n      setPendingWomenScreen(null);'),
  'App.tsx must have an effect that clears womenUnlocked and pending screen when womenWorshipEnabled becomes false'
);

// 4. Audio translation serialization & language side-effects generation guard
console.log('--- 4. Audio Translation Serialization & Language Generation Guard ---');
const quranAudioCode = fs.readFileSync('src/lib/quranAudio.ts', 'utf8');
assert.ok(
  quranAudioCode.includes('let audioTranslationTail: Promise<void> = Promise.resolve();'),
  'quranAudio.ts must declare a serialization tail for audio translation transactions'
);
assert.ok(
  quranAudioCode.includes('const task = audioTranslationTail.then(runTransaction, runTransaction);'),
  'quranAudio.ts setAudioTranslationEdition must chain transactions through audioTranslationTail'
);

assert.ok(
  settingsCode.includes('const languageSwitchGenerationRef = useRef(0);'),
  'settings.tsx must track language switch generation'
);
assert.ok(
  settingsCode.includes('const generation = ++languageSwitchGenerationRef.current;'),
  'settings.tsx setLanguage must increment generation counter'
);
assert.ok(
  settingsCode.includes('if (generation !== languageSwitchGenerationRef.current) {\n        return;\n      }'),
  'settings.tsx setLanguage must abort superseded language switch side effects'
);
assert.ok(
  settingsCode.includes('generation === languageSwitchGenerationRef.current && settingsRef.current.tafsirSourceId !== nextTafsir'),
  'settings.tsx must guard tafsir side effect with generation check'
);

// 5. MosqueFinder Nominatim Service Layer
console.log('--- 5. MosqueFinder Service Layer Migration ---');
const mosqueApiCode = fs.readFileSync('src/lib/mosqueFinderApi.ts', 'utf8');
assert.ok(
  mosqueApiCode.includes('export async function geocodeAreaNominatim('),
  'mosqueFinderApi.ts must export geocodeAreaNominatim'
);
assert.ok(
  mosqueApiCode.includes('https://nominatim.openstreetmap.org/search'),
  'mosqueFinderApi.ts must own the Nominatim endpoint'
);

const mosqueScreenCode = fs.readFileSync('src/screens/MosqueFinderScreen.tsx', 'utf8');
assert.ok(
  !mosqueScreenCode.includes('https://nominatim.openstreetmap.org/search'),
  'MosqueFinderScreen.tsx must NOT directly contain Nominatim fetch URL'
);
assert.ok(
  mosqueScreenCode.includes('geocodeAreaNominatim'),
  'MosqueFinderScreen.tsx must call geocodeAreaNominatim from the service layer'
);

console.log('\n✓ ALL GROUP 1 PRODUCTION INTEGRITY & DATA REGRESSION CHECKS PASSED!\n');
