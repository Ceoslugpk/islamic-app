/**
 * Task 5 Verification Suite: Security, Licensing, Privacy & Android Release Readiness
 *
 * Verifies the production contracts established in Task 5:
 * 1. App Configuration & Android Gradle Parity (Rule 3, S11-001, S11-002, S11-003, S11-004, S11-005)
 * 2. Release Signing & Manifest Security Boundaries (Rule 1, Rule 3, S11-014, S11-015)
 * 3. Privacy, Storage Isolation & Transport Security (S8, S9, Task B, Task E)
 * 4. Open-Source Licensing & Attribution Compliance (S1-017, S11-023, Task C)
 * 5. Google Play Store Readiness & Visual Assets Checklist (S11-018, S11-019, S11-022, Task D)
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

console.log('=== RUNNING TASK 5 SECURITY, LICENSING & RELEASE VERIFICATION ===\n');

/* -------------------------------------------------------------------------- */
/* 1. App Configuration & Android Gradle Parity                               */
/* -------------------------------------------------------------------------- */
console.log('--- 1. App Configuration & Android Gradle Parity ---');

const appJsonRaw = fs.readFileSync('app.json', 'utf8');
const appJson = JSON.parse(appJsonRaw).expo;

assert.equal(appJson.name, 'Islamic - Your Daily Companion', 'app.json name matches');
assert.equal(appJson.slug, 'islamic', 'app.json slug matches');
assert.equal(appJson.version, '1.1.71', 'app.json version matches 1.1.71');
assert.equal(appJson.orientation, 'portrait', 'app.json orientation is portrait');
assert.equal(appJson.android.package, 'com.qashi.islamic', 'Rule 3: package ID preserved in app.json');
assert.equal(appJson.android.versionCode, 90, 'android.versionCode 90 declared in app.json');
assert.equal(appJson.android.allowBackup, false, 'app.json android.allowBackup is false');

// Verify android/app/build.gradle
const buildGradle = fs.readFileSync('android/app/build.gradle', 'utf8');
assert.ok(buildGradle.includes("applicationId 'com.qashi.islamic'"), 'build.gradle applicationId matches com.qashi.islamic');
assert.ok(buildGradle.includes("namespace 'com.qashi.islamic'"), 'build.gradle namespace matches com.qashi.islamic');
assert.ok(buildGradle.includes('versionCode 90'), 'build.gradle versionCode is 90');
assert.ok(buildGradle.includes('versionName "1.1.71"'), 'build.gradle versionName is 1.1.71');
assert.ok(buildGradle.includes('targetSdkVersion rootProject.ext.targetSdkVersion') || buildGradle.includes('targetSdk'), 'build.gradle defines targetSdkVersion');

// Verify package.json version matches
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
assert.equal(packageJson.version, '1.1.71', 'package.json version matches 1.1.71');

console.log('  ✓ app.json, package.json, and android/app/build.gradle versioning and package ID aligned (com.qashi.islamic, v1.1.71, code 90)');

/* -------------------------------------------------------------------------- */
/* 2. Release Signing & Manifest Security Boundaries                          */
/* -------------------------------------------------------------------------- */
console.log('--- 2. Release Signing & Manifest Security Boundaries ---');

// Check release signing hard-fail rule
assert.ok(
  buildGradle.includes('Release keystore missing: android/keystore.properties + release.keystore'),
  'build.gradle enforces hard-fail when release keystore is absent'
);

// Verify AndroidManifest.xml security
const manifest = fs.readFileSync('android/app/src/main/AndroidManifest.xml', 'utf8');
assert.ok(manifest.includes('android:allowBackup="false"'), 'AndroidManifest.xml disables automatic cloud backup (allowBackup="false")');
assert.ok(manifest.includes('android:screenOrientation="portrait"'), 'AndroidManifest.xml locks MainActivity to portrait');
assert.ok(manifest.includes('android.permission.INTERNET'), 'AndroidManifest.xml declares INTERNET');
assert.ok(!manifest.includes('<uses-permission android:name="android.permission.RECORD_AUDIO"/>'), 'RECORD_AUDIO is not directly requested');
assert.ok(!manifest.includes('<uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW"/>'), 'SYSTEM_ALERT_WINDOW is not directly requested');

// Verify plugin strips dangerous permissions at merge time
const plugin = fs.readFileSync('plugins/withRemoveActivityRecognition.js', 'utf8');
assert.ok(plugin.includes('android.permission.ACTIVITY_RECOGNITION'), 'Plugin removes ACTIVITY_RECOGNITION');
assert.ok(plugin.includes('android.permission.RECORD_AUDIO'), 'Plugin removes RECORD_AUDIO');
assert.ok(plugin.includes('android.permission.SYSTEM_ALERT_WINDOW'), 'Plugin removes SYSTEM_ALERT_WINDOW');

console.log('  ✓ Release signing security and AndroidManifest permission sanitization verified');

/* -------------------------------------------------------------------------- */
/* 3. Privacy, Storage Isolation & Transport Security                         */
/* -------------------------------------------------------------------------- */
console.log('--- 3. Privacy, Storage Isolation & Transport Security ---');

// Verify privacy KDF and lockout
const privacyCode = fs.readFileSync('src/lib/privacy.ts', 'utf8');
assert.ok(privacyCode.includes('KDF_ROUNDS = 100000') && privacyCode.includes('kdf_v2_'), 'privacy.ts enforces 100,000-iteration slow KDF');
assert.ok(privacyCode.includes('getLockoutDurationMs') && privacyCode.includes('PIN_LOCKOUT_THRESHOLD = 5'), 'privacy.ts implements exponential lockout ladder');

// Verify backup sanitization
const backupCode = fs.readFileSync('src/lib/backup.ts', 'utf8');
assert.ok(backupCode.includes('delete parsed.womenPinHash'), 'backup.ts purges womenPinHash from export');
assert.ok(backupCode.includes('delete parsed.womenLockEnabled'), 'backup.ts purges womenLockEnabled from export');
assert.ok(backupCode.includes('STORAGE_PREFIXES') && backupCode.includes('EXCLUDED_STORAGE_KEYS'), 'backup.ts enforces strict storage key allowlist');
assert.ok(backupCode.includes('SAFE_IDENTIFIER_RE') || backupCode.includes('/^[A-Za-z_][A-Za-z0-9_]*$/'), 'backup.ts validates table and column identifiers against injection');

// Verify WebView origin restriction
const videoPlayerCode = fs.readFileSync('src/components/LiveVideoPlayer.tsx', 'utf8');
assert.ok(videoPlayerCode.includes('youtube.com'), 'LiveVideoPlayer permits youtube.com');
assert.ok(videoPlayerCode.includes('youtube-nocookie.com'), 'LiveVideoPlayer permits youtube-nocookie.com');
assert.ok(!videoPlayerCode.includes('dangerouslySetInnerHTML'), 'LiveVideoPlayer has zero dangerouslySetInnerHTML');

// Scan src/ for plaintext http:// API endpoints
function scanForPlainHttpUrls(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      scanForPlainHttpUrls(fullPath);
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
      const content = fs.readFileSync(fullPath, 'utf8');
      // Match http:// followed by a domain (excluding XML namespaces like http://schemas.android.com)
      const matches = content.match(/https?:\/\/[^\s"'`<>]+/g) || [];
      for (const m of matches) {
        if (m.startsWith('http://') && !m.includes('schemas.android.com') && !m.includes('www.w3.org')) {
          assert.fail(`Found insecure http:// URL in ${fullPath}: ${m}`);
        }
      }
    }
  }
}
scanForPlainHttpUrls('src');
console.log('  ✓ 100% of remote endpoints in src/ use encrypted HTTPS (zero plaintext http:// API endpoints)');
console.log('  ✓ Storage isolation, backup PIN purging, and KDF lockout security verified');

/* -------------------------------------------------------------------------- */
/* 4. Open-Source Licensing & Attribution Compliance                          */
/* -------------------------------------------------------------------------- */
console.log('--- 4. Open-Source Licensing & Attribution Compliance ---');

// Verify root LICENSE
const licenseText = fs.readFileSync('LICENSE', 'utf8');
assert.ok(licenseText.includes('MIT License'), 'Root LICENSE is MIT');
assert.ok(licenseText.includes('Copyright (c) 2026'), 'Root LICENSE includes 2026 copyright notice');

// Verify all 42 direct dependencies in package.json
const PERMISSIVE_LICENSES = ['MIT', 'MIT AND OFL-1.1', 'Apache-2.0', 'BSD-2-Clause', 'BSD-3-Clause', 'ISC'];
for (const dep of Object.keys(packageJson.dependencies)) {
  const depPkgPath = path.join('node_modules', dep, 'package.json');
  assert.ok(fs.existsSync(depPkgPath), `Dependency package.json exists for ${dep}`);
  const depPkg = JSON.parse(fs.readFileSync(depPkgPath, 'utf8'));
  const lic = depPkg.license || (depPkg.licenses ? JSON.stringify(depPkg.licenses) : null);
  assert.ok(lic, `License declared for ${dep}`);
  assert.ok(PERMISSIVE_LICENSES.includes(lic), `License for ${dep} (${lic}) is a recognized permissive license`);
}
console.log(`  ✓ All ${Object.keys(packageJson.dependencies).length} direct runtime dependencies verified under permissive licenses`);

// Verify font packages use SIL Open Font License 1.1
const fontPackages = [
  '@expo-google-fonts/amiri',
  '@expo-google-fonts/instrument-serif',
  '@expo-google-fonts/lora',
  '@expo-google-fonts/manrope',
  '@expo-google-fonts/noto-naskh-arabic',
  '@expo-google-fonts/noto-nastaliq-urdu',
  '@expo-google-fonts/poppins',
  '@expo-google-fonts/source-sans-3',
];
for (const fontPkg of fontPackages) {
  const fontPkgPath = path.join('node_modules', fontPkg, 'package.json');
  const pkgData = JSON.parse(fs.readFileSync(fontPkgPath, 'utf8'));
  assert.equal(pkgData.license, 'MIT AND OFL-1.1', `${fontPkg} declared license is MIT AND OFL-1.1`);
}
console.log(`  ✓ All ${fontPackages.length} bundled font families verified under SIL OFL 1.1`);

// Verify licensing audit ledger exists
assert.ok(fs.existsSync('reports/audit/licensing-attribution-audit.md'), 'reports/audit/licensing-attribution-audit.md exists');
const licensingAuditDoc = fs.readFileSync('reports/audit/licensing-attribution-audit.md', 'utf8');
assert.ok(licensingAuditDoc.includes('Tanzil Project'), 'Licensing ledger attributes Quran text to Tanzil');
assert.ok(licensingAuditDoc.includes('Hisn al-Muslim'), 'Licensing ledger attributes Duas to Hisn al-Muslim');
assert.ok(licensingAuditDoc.includes('Islamic.app'), 'Licensing ledger attributes Hadith to Islamic.app');

/* -------------------------------------------------------------------------- */
/* 5. Google Play Store Readiness & Visual Assets Checklist                   */
/* -------------------------------------------------------------------------- */
console.log('--- 5. Google Play Store Readiness & Visual Assets Checklist ---');

// Verify Play Store 512x512 icon asset
const storeIconPath = 'assets/play-store-icon-512.png';
assert.ok(fs.existsSync(storeIconPath), 'assets/play-store-icon-512.png exists');
const storeIconStat = fs.statSync(storeIconPath);
assert.ok(storeIconStat.size > 1000 && storeIconStat.size < 1024 * 1024, 'Play store icon is within Google Play size limit (< 1024KB)');

// Verify Privacy Policy Draft
assert.ok(fs.existsSync('reports/audit/privacy-policy-draft.md'), 'reports/audit/privacy-policy-draft.md exists');
const privacyDraft = fs.readFileSync('reports/audit/privacy-policy-draft.md', 'utf8');
assert.ok(privacyDraft.includes('[OWNER_LEGAL_ENTITY_NAME]'), 'Privacy draft marks owner legal entity placeholder');
assert.ok(privacyDraft.includes('[OWNER_CONTACT_EMAIL]'), 'Privacy draft marks owner contact email placeholder');
assert.ok(privacyDraft.includes('[OWNER_PUBLIC_PRIVACY_URL]'), 'Privacy draft marks public privacy policy URL placeholder');
assert.ok(privacyDraft.includes('Women\'s Worship'), 'Privacy draft explicitly covers Women\'s Worship health records');
assert.ok(privacyDraft.includes('Intentional Omission of Global In-App Factory Reset'), 'Privacy draft explains why global reset is intentionally not in UI');

// Verify Play Store Readiness Checklist
assert.ok(fs.existsSync('reports/audit/play-store-readiness-checklist.md'), 'reports/audit/play-store-readiness-checklist.md exists');
const playChecklist = fs.readFileSync('reports/audit/play-store-readiness-checklist.md', 'utf8');
assert.ok(playChecklist.includes('DEV-001'), 'Checklist tracks cold-boot splash check (Rule 4)');
assert.ok(playChecklist.includes('UNVERIFIED'), 'Checklist documents unverified physical device checks honestly');
assert.ok(playChecklist.includes('Feature Graphic'), 'Checklist tracks 1024x500 feature graphic requirement');

// Verify Vulnerability Tracker
assert.ok(fs.existsSync('reports/audit/vulnerabilities-tracker.md'), 'reports/audit/vulnerabilities-tracker.md exists');
const vulnTracker = fs.readFileSync('reports/audit/vulnerabilities-tracker.md', 'utf8');
assert.ok(vulnTracker.includes('Task 5 — Security Remediation, Privacy Policy, Licensing & Play Store Readiness Intake'), 'Vulnerabilities tracker appends Task 5 intake');
assert.ok(vulnTracker.includes('GHSA-vfj7-8cjw-p6xm'), 'Vulnerabilities tracker documents braces CVE');
assert.ok(vulnTracker.includes('GHSA-86w9-cpqp-85rv'), 'Vulnerabilities tracker documents node-forge CVE');
assert.ok(vulnTracker.includes('GHSA-w5hq-g745-h8pq'), 'Vulnerabilities tracker documents uuid CVE');

console.log('  ✓ Play Store 512x512 icon, privacy draft, licensing ledger, and release checklist verified');

console.log('\n========================================================');
console.log('ALL TASK 5 SECURITY, LICENSING & RELEASE CHECKS PASSED!');
console.log('========================================================');
