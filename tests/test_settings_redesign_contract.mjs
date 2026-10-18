import assert from 'node:assert/strict';
import fs from 'node:fs';

const screen = fs.readFileSync('src/screens/SettingsScreen.tsx', 'utf8');
const prayerTimes = fs.readFileSync('src/lib/prayerTimes.ts', 'utf8');

for (const name of [
  'Dubai',
  'Umm al-Qura (Makkah)',
  'Gulf Region (UAE, Qatar, Kuwait)',
  'Muslim World League',
  'ISNA',
  'Karachi (UIK)',
  'Egyptian General Authority',
  'Diyanet (Turkey)',
]) {
  assert.ok(prayerTimes.includes(`name: '${name}'`), `Missing calculation method ${name}`);
}

assert.match(screen, /const \[methodSheetOpen, setMethodSheetOpen\] = useState\(false\)/);
assert.match(screen, /visible=\{methodSheetOpen\}/);
assert.match(screen, /setMethod\(m\.id\)/);
assert.match(screen, /setTimeout\(\(\) => setMethodSheetOpen\(false\), 150\)/);
assert.match(screen, /MISSION_TRANSLATIONS\.find\(\(item\) => item\.lang === selectedMissionLanguage\)/);
assert.doesNotMatch(screen, /MISSION_TRANSLATIONS\.map\(/);
assert.match(screen, /setAccent\(/);

// Mission card: five tabs, selected-language content, and the specified geometry.
for (const label of ['English', 'العربية', 'اردو', 'Indonesia', 'Français']) {
  assert.ok(screen.includes(`label: '${label}'`), `Missing mission tab ${label}`);
}
for (const lang of ['English', 'العربية', 'اردو', 'Bahasa Indonesia', 'Français']) {
  assert.ok(screen.includes(`lang: '${lang}'`), `Missing existing mission translation ${lang}`);
}
assert.match(screen, /minHeight: 130/);
assert.match(screen, /borderRadius: 17\.5/);
assert.match(screen, /paddingBottom: 18/);
assert.match(screen, /marginTop: 7\.8/);
assert.match(screen, /height: 20\.4/);
assert.match(screen, /gap: 4\.4/);
assert.match(screen, /paddingHorizontal: 7\.3/);
assert.match(screen, /lineHeight: isUrdu \? 34 : isArabic \? 26 : 19/);
assert.match(screen, /fontSize: isArabic \|\| isUrdu \? 15 : 13/);
assert.match(screen, /textAlign: isArabic \|\| isUrdu \? 'right' : 'left'/);
assert.match(screen, /writingDirection: isArabic \|\| isUrdu \? 'rtl' : 'ltr'/);

// Responsive Settings controls and existing behavior-preserving rows.
assert.match(screen, /Math\.max\(150,/);
assert.match(screen, /minHeight: isRadio \? 35 : 39\.3/);
assert.match(screen, /minHeight: 55\.3/);
assert.match(screen, /minHeight: 39\.3/);
assert.match(screen, /flexWrap: inline \|\| compact \? 'nowrap' : 'wrap'/);
for (const label of ['Preload Quran text', 'Verify offline copy', 'Arabic Font', 'Translation', 'Prayer reminders', 'Remind before prayer', 'Adhan Reciter', 'Test adhan sound', 'Quran reminder', "Women's Worship", 'Privacy Policy', 'Terms of Use', 'Data & Privacy', 'Open Source Licenses', 'Third-Party Services', 'Backup & Restore', 'App Credits']) {
  assert.ok(screen.includes(`title={t("${label}")}`) || screen.includes(`title={t('${label}')`), `Missing Settings row ${label}`);
}
assert.match(screen, /label=\{t\("Font Size"\)\}/);
assert.match(screen, /label=\{t\("Line Height"\)\}/);
assert.match(screen, /Reminders deliver on your device/);
assert.match(screen, /Browsers can’t schedule notifications, so these switches are saved as preferences/);
assert.match(screen, /Off — no prayer notifications/);
assert.match(screen, /Off — no daily reminder/);
assert.match(screen, /onOpenToolsItem\('women-cycle'\)/);
assert.match(screen, /onOpenToolsItem\('women-purity'\)/);
assert.match(screen, /onOpenToolsItem\('women-guidance'\)/);
assert.doesNotMatch(screen, /I18nManager\.(?:forceRTL|allowRTL|swapLeftAndRightInRTL)\s*\(/);

// Method sheet geometry and exact save/close behavior.
assert.match(screen, /maxHeight: screenHeight \* 0\.72/);
assert.match(screen, /rgba\(0,0,0,0\.65\)/);
assert.match(screen, /paddingBottom: insets\.bottom \+ 16/);
assert.match(screen, /height: 44\.4/);
assert.match(screen, /borderRadius: 20/);
assert.match(screen, /marginStart: 29/);
assert.match(screen, /marginEnd: -11\.75/);

// Preserve all legal destinations/copy and render identity from app metadata.
for (const [title, subtitle] of [
  ['Privacy Policy', 'No tracking, no accounts, data stays on device'],
  ['Terms of Use', 'Free service provided as-is for educational use'],
  ['Data & Privacy', 'Local storage, third-party requests & data removal'],
  ['Open Source Licenses', 'Expo, React Native & open-source libraries'],
  ['Third-Party Services', 'Public APIs for prayer times, Quran text & audio'],
  ['Backup & Restore', 'Export or restore your local data from a file'],
  ['App Credits', 'Built with the open-source Expo & React Native ecosystem'],
]) {
  assert.ok(screen.includes(`title={t("${title}")}`), `Missing About row ${title}`);
  assert.ok(screen.includes(`desc={t("${subtitle}")}`), `Missing About copy for ${title}`);
}
assert.match(screen, /const APP_VERSION = appConfig\.expo\.version/);
assert.match(screen, /Islamic — Your Daily Companion/);
assert.match(screen, /marginTop: 25\.5, height: 77\.8/);
assert.match(screen, /getMissionLanguage\(settings\.language\)/);
assert.match(screen, /Math\.max\(150,/);
assert.match(screen, /minHeight: isRadio \? 35 : 39\.3/);
assert.doesNotMatch(screen, /I18nManager\.(?:forceRTL|allowRTL|swapLeftAndRightInRTL)\s*\(/);

console.log('Settings redesign contract: layout, settings preservation, legal copy, mission tabs, RTL, and calculation sheet verified.');
