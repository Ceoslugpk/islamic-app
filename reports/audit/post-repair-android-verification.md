# Post-Repair Android Verification Audit Report

**Application:** Islamic - Your Daily Companion (`com.qashi.islamic`)
**Version:** v1.1.70 (VersionCode 89)
**Target Platform:** Android (Native Release APK/AAB)
**Governing Standard:** `rules.md` (Standing Project Rules 1–23)
**Audit Date:** 2026-10-17
**Execution Posture:** Read-Only Specialist Verification Sequence
**Overall Release Verdict:** **GO WITH CONDITIONS** (Android GitHub Release) / **CONDITIONAL HOLD** (Google Play Store)

---

## Executive Summary & Specialist Verification Sequence

In accordance with user instructions, this post-repair audit evaluates the inherited codebase following defect remediation across Tasks 1 through 5. Six specialized domain analyses were executed sequentially:

1. **Android Specialist:** Native configurations, Android 12+ splash theme alignment, manifest permissions, and Expo SDK 57 compatibility.
2. **Storage Specialist:** SQLite database architecture, transactions, atomic rollback, `SQLITE_FULL` failure resilience, LRU cache budget eviction, never-evict guarantees, and backup sanitization.
3. **RTL Specialist:** Script classification, Kurdish Sorani / Arabic / Urdu RTL layout symmetry, 49-locale key parity (2,470 keys), and token interpolation preservation.
4. **Quran Specialist:** Continue Reading architecture, reading marker vs. automatic position precedence, hop elimination, and progress persistence across Ayahs 15, 35, and 70 during English ↔ Urdu switches.
5. **Release Specialist:** Inspection of existing release APK (`app-release.apk`), APK Signature Scheme v2 verification, strict adherence to Rule 1 (no unauthorized build), and release compilation instructions.
6. **Independent QA Specialist:** Machine-readable findings matrix reconciliation (exactly 375 rows), resolution of the 328-vs-329 narrative discrepancy, classification of all 23 remaining STILL FAILING findings, synchronous command ledger, and release sign-off.

---

## 1. Specialist 1: Android Platform & Build Configuration

### 1.1 Application Identifiers & Build Manifest Parity
Static verification confirms 100% alignment across repository configuration surfaces:
- **Package Identifier:** `com.qashi.islamic` (`app.json:28`, `android/app/build.gradle:100`).
- **Version Name:** `1.1.70` (`package.json:3`, `app.json:7`, `android/app/build.gradle:104`).
- **Version Code:** `89` (`app.json:30`, `android/app/build.gradle:103`).
- **Target SDK:** API 36 (`android/app/build.gradle:93`).
- **Compile SDK:** API 36 (`android/app/build.gradle:91`).
- **Minimum SDK:** API 24 (Android 7.0 Nougat, `android/app/build.gradle:92`).

### 1.2 AndroidManifest & Permission Sanitization
Inspection of `android/app/src/main/AndroidManifest.xml` and APK badging confirms permission boundaries:
- `android.permission.ACCESS_FINE_LOCATION` & `ACCESS_COARSE_LOCATION`: Required for prayer times calculation; guarded by persistent user dismissal (`src/lib/useLocation.ts`).
- `android.permission.FOREGROUND_SERVICE` & `FOREGROUND_SERVICE_MEDIA_PLAYBACK`: Required for Quran audio playback while backgrounded.
- `android.permission.INTERNET`: Required for fetching remote recitations and geocoding.
- `android.permission.RECEIVE_BOOT_COMPLETED`: Reschedules local prayer alarms on device reboot.
- `android.permission.READ_EXTERNAL_STORAGE`: Restricted via `android:maxSdkVersion="32"`, ensuring compliance with modern Android 13+ granular media permissions.
- **Invasive Permissions Removed:** Zero tracking permissions, zero background location, zero contacts, zero microphone, zero camera permissions.

### 1.3 Android 12+ Splash Screen Theme Alignment (Rule 4)
- **Theme Configuration:** `android/app/src/main/res/values/styles.xml` defines `Theme.App.SplashScreen` setting `windowBackground` to `#0A0E1A` (dark) and `#F4EEDE` (light), matching `app.json` splash background.
- **Verification Status:** **UNVERIFIED (Requires Physical Hardware per Rule 4 and Rule 21)**. Automated static analysis confirms XML theme tokens are aligned, but physical cold-launch observation on Android 12+ is mandatory to guarantee zero grey/white pattern flash between zygote launch and app interactive render.

### 1.4 Expo SDK 57 Compatibility
- `npx expo-doctor`: Passed **21 of 21 checks** with zero warnings or errors.
- `npx expo install --check`: Confirmed all dependencies are up to date and compatible with Expo SDK 57.

---

## 2. Specialist 2: Storage Architecture & SQLITE_FULL Resilience

### 2.1 SQLite Initialization & Migration Tracing
- **Implementation:** `src/lib/db.native.ts` serves as the native facade using `expo-sqlite` (`SQLite.openDatabaseSync('salah.db')`).
- **Migration Protocol:** Runs `migrate(db)` on open. Tables are created idempotently via `CREATE TABLE IF NOT EXISTS` across 15 dedicated tables: `salah_entries`, `prayer_cache`, `quran_cache`, `tasbih_entries`, `tasbih_daily`, `plan_entries`, `hifz_entries`, `hadith_saved`, `hadith_recent`, `hadith_read_markers`, `fasting_entries`, `missed_fasts`, `zakat_history`, `period_entries`, `nifas_entries`, `study_tags`.

### 2.2 Transactions & Atomic Rollback
- SQLite executes statements (`INSERT ... ON CONFLICT DO UPDATE`) inside atomic transactions.
- When disk space is exhausted (`SQLITE_FULL`), SQLite rolls back the statement atomically.
- In `markSalahCompleted`, `saveFastingEntry`, `saveZakatCalculation`, and `savePeriodEntry`, errors are safely caught in non-fatal `catch` blocks. Existing rows in the database are **never deleted or overwritten** when an insert or update encounters `SQLITE_FULL`.

### 2.3 Cache Eviction Budget & Never-Evict Guarantees
- **Budget Threshold:** `QURAN_CACHE_BUDGET_BYTES` = 400 MB.
- **Eviction Implementation (`enforceQuranCacheBudget`):**
  - Triggers LRU deletion (`ORDER BY cached_at ASC LIMIT 50`) when total payload length exceeds 400 MB.
  - Deletes **only** disposable cache keys: `surah:%`, `ayah:%`, `mosque:%`, `tafsir:%`, `tafsir-%`, `tajweed:%`, `hadith:%`.
  - **Never-Evict Guarantee:** Strictly excludes:
    - User tables (`salah_entries`, `fasting_entries`, `zakat_history`, `period_entries`, `nifas_entries`, etc.).
    - Protected cache keys: `bookmarks`, `notes`, `playlists`, `audio-queue`, `audio-settings`, `last-read`, `recent-audio`, `quran-audio-downloads`, `surah-list`.
    - Prayer timings keys: `prayer-%`, `prayer:%`.
    - Reading position keys: `surah-last-ayah:%`.

### 2.4 Web Storage Quota Recovery & Backup Security
- **Web Storage (`src/lib/webStorage.ts`):** `storageSet` catches `QuotaExceededError` and seamlessly routes writes to in-memory store (`memStore[key] = value`), preventing web UI crashes.
- **Backup Sanitization (`src/lib/backup.ts`):** `validateBackup` strictly enforces schema version 1, validates table names, sanitizes column names with regex `/^[A-Za-z_][A-Za-z0-9_]*$/`, and explicitly deletes sensitive tokens (`womenPinHash`, `womenLockEnabled`) on both export and import.

### 2.5 Physical Device Logcat Evidence Boundaries
Automated unit tests verified eviction math, key protection, and quota handling. However, the following **strictly mandate physical Android phone testing**:
1. Real ext4/f2fs volume saturation (0 free blocks in `/data/user/0/com.qashi.islamic/databases/salah.db`).
2. Native `android.database.sqlite.SQLiteFullException` bridge propagation into Hermes.
3. SQLite WAL file (`salah.db-wal`) checkpoint recovery under disk exhaustion.
4. Android logcat inspection: `adb logcat | grep -E "SQLiteFull|db.native|salah.db"`.

---

## 3. Specialist 3: RTL Direction & Localization Parity

### 3.1 Kurdish Sorani & Script Directionality (`S10-010`)
- `src/lib/rtl.ts` handles multi-script language classification:
  - Central Kurdish (`ckb`) and Arabic-script Kurdish (`ku`) are correctly classified as **RTL**.
  - Latin-script Kurdish (`ku-Latn`, `kmr`) is correctly classified as **LTR**.
  - Arabic (`ar`), Urdu (`ur`), Farsi (`fa`), and Hebrew (`he`) are classified as **RTL**.
  - English (`en`), French (`fr`), Turkish (`tr`), Kazakh (`kk`), Hindi (`hi`), Malayalam (`ml`), and Sinhala (`si`) are classified as **LTR**.

### 3.2 Key & Token Parity Across 49 Locales
- **Authoritative Canonical File:** `src/locales/en.json` contains exactly **2,470 keys** (2,302 baseline + 168 new keys added across Tasks 1–5).
- **Parity Verification:** All 49 registered locale files pass 100% key parity with zero missing keys, zero extra keys, and zero empty/whitespace values.
- **Restored Kazakh Locale (`S1-011`):** `kk.json` was restored from 2,263 keys to all 2,470 keys with authentic Kazakh translations for Women's PIN protection and Yawm Arafah.
- **Sacred Token Preservation:** 100% placeholder and token parity (`{n}`, `{count}`, `{edition}`, etc.) verified across all 49 locales. Corrupted `{ن}` token in `ar.json` eliminated.

### 3.3 Logical Spacing & Layout Symmetry
- Replaced physical directional CSS properties (`marginLeft`, `marginRight`) with logical directional properties (`marginStart`, `marginEnd`) across `PrimaryButton`, `OutlineButton`, `SearchField`, `Chip`, `LanguagePickerModal`, `QuranLanguageModal`, `AdhanReciterModal`, `NowPlayingHeroCard`, and `AudioPlayerModal`.
- Preserved physical `borderLeftWidth`/`borderRightWidth` exclusively in geometric shapes (`QiblaCompass.tsx`, `AnimatedPattern.tsx`).

---

## 4. Specialist 4: Quran Continue Reading & Multi-Position Persistence

### 4.1 Continue Reading Architecture
- **Precedence Hierarchy (`src/lib/continuing.ts`):** `getContinueReadingPosition()` checks `getReadingMarker()` first (explicit user bookmark); if null, falls back to `getReadingPosition()` (automatic unmount position).
- **Hop Elimination (`QuranReaderScreen.tsx`):** Implemented dynamic `initialNumToRender` bounded up to 290 (`BOUNDED_PRE_RENDER_CAP`), ensuring target Ayahs (including deep Ayahs 255 and 286) land in a single interaction frame without intermediate scrolling jumps.

### 4.2 Automated Production-Path Verification: Ayahs 15, 35, and 70
Automated test suite `tests/test_audit_en_ur_quran_positions.mjs` executed the complete production persistence flow:
- **Ayah 15 (Surah 2):** Marked in English -> Switched to Urdu -> Restart simulated -> Read back in Urdu (Surah 2, Ayah 15 intact) -> Switched to English -> Restart simulated -> Read back in English (Surah 2, Ayah 15 intact).
- **Ayah 35 (Surah 2):** Marked in English -> Switched to Urdu -> Restart simulated -> Read back in Urdu (Surah 2, Ayah 35 intact) -> Switched to English -> Restart simulated -> Read back in English (Surah 2, Ayah 35 intact).
- **Ayah 70 (Surah 2):** Marked in English -> Switched to Urdu -> Restart simulated -> Read back in Urdu (Surah 2, Ayah 70 intact) -> Switched to English -> Restart simulated -> Read back in English (Surah 2, Ayah 70 intact).
- **Outcome:** **100% byte-invariant survival** of reading marker and active language across cold restarts.

---

## 5. Specialist 5: Release Engineering & APK Inspection

### 5.1 Existing Release APK Verification (No New Build)
In compliance with user instructions and **Rule 1** ("No APK build until the user explicitly says build"), no new APK build was produced. The existing release APK was inspected:
- **Location:** `android/app/build/outputs/apk/release/app-release.apk`
- **File Size:** 99 MB (103,425,514 bytes)
- **SHA-256 Checksum:** `f33d0aa9e9eca5565982c5ac4eaebe432eaaa58e97d035d7dfea793186b2924e`
- **Signature Scheme:** Verified using APK Signature Scheme v2 (`apksigner verify`).
- **Signing Certificate:** `CN=Ceoslugpk, OU=Islamic App, O=Ceoslugpk, L=Dubai, ST=Dubai, C=AE`.
- **Package Inspection:** `package: name='com.qashi.islamic' versionCode='89' versionName='1.1.70' compileSdkVersion='36' targetSdkVersion='36' sdkVersion='24'`.

### 5.2 Release Build Protocol (Owner Authorization Required)
When authorized by the project owner, execute the following compilation and installation workflow:

```bash
# Preflight: Verify local.properties sdk.dir and keystore presence
cat android/local.properties # must include sdk.dir=/opt/android-sdk
ls -la android/release.keystore android/keystore.properties

# Step 1: Release compilation (Rule 6)
cd android && ANDROID_HOME=/opt/android-sdk GRADLE_OPTS="-Xmx2048m -XX:MaxMetaspaceSize=768m -Dorg.gradle.workers.max=4" ./gradlew assembleRelease --no-daemon

# Step 2: Signature verification
/opt/android-sdk/build-tools/35.0.0/apksigner verify --verbose --print-certs android/app/build/outputs/apk/release/app-release.apk

# Step 3: Package dump
/opt/android-sdk/build-tools/35.0.0/aapt dump badging android/app/build/outputs/apk/release/app-release.apk | grep -E "package|sdkVersion"

# Step 4: Device installation preserving data (Rule 3)
adb install -r android/app/build/outputs/apk/release/app-release.apk
```

---

## 6. Specialist 6: Independent QA Reconciliation & Classification

### 6.1 Findings Matrix Reconciliation (375 Total Rows)
The machine-readable findings matrix (`reports/audit/task6-findings-matrix.json`) is the authoritative source of truth:

| Classification | Count | Percentage | Definition |
|---|---:|---:|---|
| **FIXED** | 329 | 87.7% | Verified resolved by Tasks 1–5 remediation and test suites. |
| **STILL FAILING** | 23 | 6.1% | Open issues: build tooling advisories, web bundle size, owner store assets. |
| **BLOCKED** | 14 | 3.7% | Blocked by physical device testing or absence of baseline commit. |
| **NOT APPLICABLE** | 8 | 2.1% | Web PWA edge headers or non-applicable doctrinal checks. |
| **UNVERIFIED** | 1 | 0.3% | Statically verified splash theme, pending physical device sign-off (Rule 4). |
| **Total** | **375** | **100.0%** | Exact mathematical reconciliation across all 12 audit sections. |

### 6.2 328-vs-329 Narrative Discrepancy Resolution
- **Root Cause:** In the baseline audit, `S1-007` (Expo Config & SDK Compatibility) was marked `FAIL` because `expo-doctor` failed 3 checks. During Task 6 verification, synchronous re-execution of `npx expo-doctor` passed **21 of 21 checks** and `npx expo install --check` confirmed dependencies were up to date.
- `S1-007` was reclassified from `STILL FAILING` to `FIXED`.
- Earlier draft narrative reports recorded 328 FIXED / 24 STILL FAILING before updating to the matrix truth of **329 FIXED / 23 STILL FAILING**. All audit reports are now fully reconciled to 329 / 23 / 14 / 8 / 1 (Total: 375).

### 6.3 Categorization of All 23 STILL FAILING Findings
1. **Android Release Blockers (0 items):** Zero blockers for direct Android GitHub release.
2. **Google Play Store Blockers / Owner Action (3 items):**
   - `S11-019` (Critical): Public HTTPS Privacy Policy URL required for Google Play Console metadata.
   - `S11-022` (High): 1024×500 Feature Graphic required for Google Play Console listing.
   - `S11-025` / `S1-022` (High): Store release readiness evaluation pending owner store assets.
3. **Web-Only Issues (2 items):**
   - `S7-001` (High): Fast-3G cold load FCP ~30.5s exceeds 2.5s budget on web.
   - `S7-003` (High): Monolithic web JS export bundle (~6.29MB raw / 1.43MB gzip) required for 100% offline web Quran availability.
4. **Accepted Risks (18 items):**
   - `S1-006` & `S9-013`: 26 npm audit vulnerabilities (17 high, 9 moderate) in build tooling (`braces`, `node-forge`, `uuid`); zero runtime presence in native release APK.
   - `S1-012`: Residual TODO/console.log statements in non-critical catch handlers.
   - `S11-012`: Resource shrinking disabled (`enableMinifyInReleaseBuilds=false`) to avoid reflection issues.
   - `S2-004`: Residual hex literals in secondary screens.
   - `S5-012`, `S5-013`, `S5-018`: Hardcoded English explanatory strings in modals.
   - `S5-022`, `S5-025`, `S5-027`, `S5-028`, `S5-032`, `S5-034`, `S5-036`, `S5-037`: Secondary route Urdu leftover English strings.
   - `S8-034`: Plaintext SQLite storage at rest (isolated in app sandbox `/data/user/0/com.qashi.islamic/databases/`).

### 6.4 Synchronous Test Execution Ledger

| Check # | Verification Command | Exit Code | Verified Outcome |
|:---:|---|:---:|---|
| 1 | `node tests/test_task1_next_prayer_rollover.mjs` | **0** | PASSED: After-Isha tomorrow Fajr rollover verified |
| 2 | `node tests/test_task1_location_dismissal.mjs` | **0** | PASSED: Location modal dismissal persistence verified |
| 3 | `node tests/test_task1_notification_web_guard.mjs` | **0** | PASSED: Web notification promise rejection guard verified |
| 4 | `node tests/test_task2_locale_parity.mjs` | **0** | PASSED: 49 locales, 2,470 keys, 100% key and token parity |
| 5 | `node tests/test_task2_persistence_and_progress.mjs` | **0** | PASSED: Language switching & Quran progress invariant |
| 6 | `node tests/test_task2_rtl_and_sorani.mjs` | **0** | PASSED: Kurdish Sorani RTL & logical directional properties |
| 7 | `tsx tests/test_task3_accessibility_and_spacing.spec.ts` | **0** | PASSED: FloatingNav tablist, aria-checked, touch targets >= 44dp, 24dp gap |
| 8 | `node tests/test_task4_bundle_manifest.mjs` | **0** | PASSED: Bundle manifest: 6.48MB raw / 1.44MB gzip / 0.95MB br |
| 9 | `node tests/test_task4_home_interval_lifecycle.mjs` | **0** | PASSED: Home interval active lifecycle & tab unmount clean |
| 10 | `node tests/test_task4_storage_and_recovery.mjs` | **0** | PASSED: Storage recovery, quota error resilience, PIN purge |
| 11 | `node tests/test_task5_security_licensing_release.mjs` | **0** | PASSED: VersionCode 89, licenses, 512x512 icon, 100% HTTPS |
| 12 | `node tests/test_continue_reading_fix.mjs` | **0** | PASSED: Quran continue reading hop elimination & persistence |
| 13 | `node tests/test_audit_en_ur_quran_positions.mjs` | **0** | PASSED: Ayahs 15, 35, 70 survival across En<->Ur restart cycles |
| 14 | `npm run lint` | **0** | PASSED: Clean, zero lint warnings or errors |
| 15 | `NODE_OPTIONS=--max-old-space-size=6144 npx tsc --noEmit` | **0** | PASSED: TypeScript type check clean, zero errors |
| 16 | `npm test` | **0** | PASSED: Full test suite executed cleanly |
| 17 | `npx expo-doctor` | **0** | PASSED: 21/21 checks passed, zero issues detected |
| 18 | `npx expo install --check` | **0** | PASSED: Dependencies up to date |
| 19 | `npm audit --audit-level=high` | **1** | EXPECTED: 26 vulnerabilities (17 high, 9 moderate) in build tooling only |
| 20 | Test APK / Release Compilation | **UNVERIFIED / BLOCKED** | Preserved per Rule 1 & Rule 6 (Owner command specified) |

---

## 7. Final Pre-Release Verdict

### Verdict: **GO WITH CONDITIONS**

1. **Direct Android Distribution (GitHub Release APK/AAB):** **GO WITH CONDITIONS**
   - **Condition:** Mandatory human verification on a physical Android 12+ device confirming zero white or grey pattern flash on cold launch (Rule 4), following `reports/audit/physical-android-test-checklist.md`.
2. **Google Play Store Release:** **CONDITIONAL HOLD**
   - **Hold Rationale:** Mandatory store assets require human owner action:
     - Deploy `reports/audit/privacy-policy-draft.md` to an active public HTTPS endpoint and submit URL to Play Console.
     - Design and upload a 1024×500 PNG/JPEG feature graphic.
3. **Web PWA Deployment:** **CONDITIONAL HOLD**
   - **Hold Rationale:** Monolithic web bundle requires reverse proxy edge compression (gzip/brotli) and HTTPS security headers (HSTS, CSP). Does not impact Android APK release.
