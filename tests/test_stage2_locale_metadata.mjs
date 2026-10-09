import assert from 'node:assert';
import fs from 'node:fs';

console.log('=== STAGE-2 QA: LOCALE LIFECYCLE + 114 SURAH NAMES + METADATA LOCALIZATION + HEADER WORDMARK ===\n');

const ok = (m) => console.log(`  [ok] ${m}`);
const fail = (m) => { throw new Error(`FAIL: ${m}`); };

// ── 1. Locale lifecycle: language persistence + auto-link restore (en<->ur) ──
// Static assertions on the code paths that implement the en->ur reload, the
// ur->en restore of English content defaults, and repeated switches.
const settingsCode = fs.readFileSync('src/lib/settings.tsx', 'utf8');
const i18nCode = fs.readFileSync('src/lib/i18n.ts', 'utf8');

// (a) ur boots from persisted language BEFORE i18n init (deterministic boot)
assert.ok(
  i18nCode.includes("const PERSISTED_LANGUAGE_KEY = 'islamic-settings'"),
  'i18n reads the persisted app language from islamic-settings'
);
assert.ok(
  i18nCode.includes('languageResolved') && i18nCode.includes('persistedLanguage'),
  'i18n caches resolved boot language'
);
assert.ok(
  i18nCode.includes("applyRTL(initialLanguage === 'ur')"),
  'RTL applied once at module load from boot language'
);
ok('locale boot: persisted language resolved before i18n init; RTL set at boot');

// (b) en->ur: persist FIRST, then reload boots in the new language
assert.ok(
  settingsCode.includes('setAppLanguage(nextLang)'),
  'setLanguage applies the new language immediately'
);
assert.ok(
  settingsCode.includes("persist({\n          ...prev,\n          language: nextLang,"),
  'setLanguage persists the language in the same call'
);
// The reload must happen AFTER the persist resolves so the reload boots in ur
const settingsScreenCode = fs.readFileSync('src/screens/SettingsScreen.tsx', 'utf8');
assert.ok(
  settingsScreenCode.includes('Promise.resolve(setLanguage(nextLang)).then(() =>'),
  'SettingsScreen awaits language persist before reload'
);
assert.ok(
  settingsScreenCode.includes('Updates.reloadAsync()'),
  'native reload triggered after persist (boots in new language)'
);
ok('en->ur: language persisted before Updates.reloadAsync — reload boots in Urdu');

// (c) ur->en: English content defaults restored (quran translation, tafsir, audio)
assert.ok(
  settingsCode.includes("if (currentQuranLang === 'ur') {\n            await setQuranTranslationLanguage('en');"),
  'ur->en restores quran translation language to en'
);
assert.ok(
  settingsCode.includes("if (settings.tafsirSourceId === 'api-ibn-kathir-urdu') {\n          nextTafsir = 'jalalayn';"),
  'ur->en restores tafsir source to jalalayn'
);
assert.ok(
  settingsCode.includes("if (savedAudioEdition === 'ur.everyayah-shamshad') {\n            await setAudioTranslationEdition(DEFAULT_AUDIO_TRANSLATION_EDITION_ID);"),
  'ur->en restores audio translation edition to default'
);
ok('ur->en: English content defaults restored (translation lang, tafsir, audio edition)');

// (d) repeated switches: both branches guarded by current-state checks (idempotent)
assert.ok(
  settingsCode.includes("if (nextLang === 'ur')") && settingsCode.includes('} else {'),
  'setLanguage has symmetric ur and en branches'
);
assert.ok(
  settingsCode.includes("if (currentQuranLang === 'en')"),
  'ur branch only switches quran lang when currently en (no redundant writes)'
);
ok('repeated switches: symmetric ur/en branches with state guards');

// ── 2. 114 surah name coverage (SURAH_NAMES_UR + SURAH_NAME_TRANSLATIONS.ur) ──
const namesCode = fs.readFileSync('src/lib/surahNamesLocalized.ts', 'utf8');
const transCode = fs.readFileSync('src/lib/surahTranslationsData.ts', 'utf8');
const urBlocks = [...namesCode.matchAll(/'([^']+)',\s*\/\/\s*(\d+)/g)].map((m) => [+m[2], m[1]]);
const urNames = new Map(urBlocks);
assert.strictEqual(urNames.size, 114, `SURAH_NAMES_UR must have 114 entries, got ${urNames.size}`);
for (let i = 1; i <= 114; i++) {
  assert.ok(urNames.has(i), `SURAH_NAMES_UR missing surah ${i}`);
  const n = urNames.get(i);
  assert.ok(n.length > 0, `SURAH_NAMES_UR[${i}] empty`);
  assert.ok(/[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/.test(n), `SURAH_NAMES_UR[${i}] not Arabic/Urdu script: "${n}"`);
}
// No duplicate names (each surah has a distinct localized name)
assert.strictEqual(new Set(urNames.values()).size, 114, 'SURAH_NAMES_UR has duplicate names');
// getLocalizedSurahName semantics: ur returns Urdu name, en returns english fallback, out-of-range falls back
assert.ok(namesCode.includes("if (lang === 'ur')"), 'getLocalizedSurahName branches on ur');
assert.ok(namesCode.includes('SURAH_NAMES_UR[idx]'), 'getLocalizedSurahName indexes SURAH_NAMES_UR');
assert.ok(namesCode.includes('return englishFallback;'), 'getLocalizedSurahName falls back to englishFallback');
ok('SURAH_NAMES_UR: 114 unique Arabic-script names, 1..114 complete, bounds-guarded helper');

// SURAH_NAME_TRANSLATIONS.ur (meaning translations used by QuranHome list) — 114 complete too
const urTransMatch = transCode.match(/ur: \{([\s\S]*?)\n  \},/);
assert.ok(urTransMatch, 'SURAH_NAME_TRANSLATIONS has ur block');
const transEntries = [...urTransMatch[1].matchAll(/(\d+):\s*'([^']*)'/g)].map((m) => [+m[1], m[2]]);
assert.strictEqual(transEntries.length, 114, `ur meaning translations must have 114 entries, got ${transEntries.length}`);
const transNums = transEntries.map(([n]) => n);
for (let i = 1; i <= 114; i++) assert.ok(transNums.includes(i), `ur meaning translation missing surah ${i}`);
assert.strictEqual(new Set(transNums).size, 114, 'ur meaning translation has duplicate surah numbers');
assert.ok(transEntries.every(([, v]) => v.length > 0 && !/[a-zA-Z]/.test(v)), 'ur meaning translations non-empty, no latin text');
ok('SURAH_NAME_TRANSLATIONS.ur: 114 complete, no dups, no latin content');

// ── 3. Metadata localization presence: language names (tafsir/translation language display) ──
// LANGUAGE_NAMES_UR covers all QURAN_LANGUAGE_EDITIONS languages so the Urdu UI
// can show a localized language name for every selectable translation language.
const quranLangsCode = fs.readFileSync('src/lib/quranLanguages.ts', 'utf8');
// Keys in LANGUAGE_NAMES_UR may be quoted ('Bosnian (Mehanović)') or bare (Arabic).
const langNamesBlock = namesCode.match(/LANGUAGE_NAMES_UR: Record<string, string> = \{([\s\S]*?)\n\};/);
assert.ok(langNamesBlock, 'LANGUAGE_NAMES_UR block found');
const langNames = [...langNamesBlock[1].matchAll(/(?:'([^']+)'|([^:,\n]+?))\s*:\s*'([^']+)'/g)].map((m) => [(m[1] || m[2]).trim().replace(/^'(.*)'$/, '$1'), m[3]]);
const urLangKeys = new Set(langNames.map(([k]) => k));
assert.strictEqual(urLangKeys.size, langNames.length, `LANGUAGE_NAMES_UR has duplicate keys: ${langNames.length} entries, ${urLangKeys.size} unique`);
assert.ok(langNames.length >= 40, `LANGUAGE_NAMES_UR should cover 40+ languages, got ${langNames.length}`);
for (const [enName] of langNames) {
  assert.ok(enName.length > 0, 'LANGUAGE_NAMES_UR has empty key');
}
// The edition languages in quranLanguages must ALL have an entry in LANGUAGE_NAMES_UR
const editionLangs = [...quranLangsCode.matchAll(/language:\s*'([^']+)'/g)].map((m) => m[1]);
const uniqueEditionLangs = [...new Set(editionLangs)];
const uncovered = uniqueEditionLangs.filter((l) => !urLangKeys.has(l));
assert.deepStrictEqual(uncovered, [], `Quran edition languages without Urdu name: ${uncovered.join(', ')}`);
ok(`LANGUAGE_NAMES_UR covers all ${uniqueEditionLangs.length} selectable translation languages`);

// getLocalizedLanguageName: ur lookup, en passthrough
assert.ok(namesCode.includes("if (lang === 'ur' && LANGUAGE_NAMES_UR[englishName])"), 'getLocalizedLanguageName branches on ur');
assert.ok(namesCode.includes('return englishName;'), 'getLocalizedLanguageName passthrough for en');
ok('getLocalizedLanguageName semantics verified (ur lookup, en passthrough)');

// ── 4. Header wordmark: اسلامک in Urdu, ISLAMIC in English, Amiri in RTL ──
const appCode = fs.readFileSync('App.tsx', 'utf8');
assert.ok(appCode.includes("{isRTL() ? 'اسلامک' : 'ISLAMIC'}"), 'AppHeader wordmark shows اسلامک when RTL, ISLAMIC otherwise');
assert.ok(
  appCode.includes("fontFamily: I18nManager.isRTL ? 'Amiri_700Bold' : 'SourceSans3_500Medium'"),
  'wordmark font is Amiri (Urdu script) in RTL, Source Sans in LTR'
);
assert.ok(appCode.includes("letterSpacing: I18nManager.isRTL ? 0 : 4"), 'wordmark letter-spacing disabled in RTL (Arabic script)');
// Amiri_700Bold must actually be loaded at boot (else the RTL wordmark renders in a fallback font)
const fontsCode = fs.readFileSync('src/lib/fonts.ts', 'utf8');
assert.ok(fontsCode.includes('Amiri_700Bold'), 'Amiri_700Bold loaded in useEditorialFonts');
ok('header wordmark: اسلامک in RTL w/ Amiri_700Bold, ISLAMIC in LTR w/ SourceSans3');

// ── 5. QuranHome localized names wiring (fetchSurahListForLanguage on non-en) ──
const quranHomeCode = fs.readFileSync('src/screens/QuranHomeScreen.tsx', 'utf8');
assert.ok(quranHomeCode.includes("if (language === 'en') {\n      setTranslatedNames(null);"), 'QuranHome clears translated names for en');
assert.ok(quranHomeCode.includes('fetchSurahListForLanguage(language)'), 'QuranHome fetches translated names for non-en');
ok('QuranHome: per-language surah names wired to fetchSurahListForLanguage');

// ── 6. en/ur parity (fresh check) ──
const en = JSON.parse(fs.readFileSync('src/locales/en.json', 'utf8'));
const ur = JSON.parse(fs.readFileSync('src/locales/ur.json', 'utf8'));
const enKeys = Object.keys(en);
const urKeys = Object.keys(ur);
assert.strictEqual(enKeys.length, urKeys.length, `en/ur key count mismatch: ${enKeys.length} vs ${urKeys.length}`);
for (const k of enKeys) {
  assert.ok(k in ur, `missing ur key: "${k}"`);
  assert.ok(typeof ur[k] === 'string' && ur[k].trim().length > 0, `empty ur value for "${k}"`);
}
for (const k of urKeys) assert.ok(k in en, `missing en key: "${k}"`);
ok(`en/ur parity: ${enKeys.length} keys both ways, all ur values non-empty`);

console.log('\nALL STAGE-2 QA TESTS PASSED SUCCESSFULLY!');
