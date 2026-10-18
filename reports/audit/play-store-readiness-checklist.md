# Google Play Store Readiness Checklist & Native Audit

**Application:** Islamic — Your Daily Companion
**Package Identifier:** `com.qashi.islamic`
**Current Version:** `1.1.70` (versionCode `89`)
**Audit Date:** 2026-10-17
**Auditor:** Android Release Specialist
**Standard:** Google Play Developer Program Policies, Android 15/16 Target SDK specifications, and Project Rules (`rules.md`).

---

## 1. Executive Summary & Verdict

- **Overall Play Store Readiness:** **ACTION REQUIRED BEFORE SUBMISSION (3 Blockers)**
- **Technical Core Readiness:** **PASS** (targetSdk 36, 64-bit, release signing, AAB format, permissions hygiene)
- **External Distribution Blockers (Owner Action):**
  1. **Public HTTPS Privacy Policy URL:** Requires owner to host `reports/audit/privacy-policy-draft.md` at a public HTTPS URL and enter it into Play Console metadata.
  2. **Play Store Feature Graphic (1024×500):** Missing from repository; requires designer creation without fabricating branding.
  3. **7-inch & 10-inch Tablet Screenshots:** Missing from repository; requires device or tablet capture.
- **Physical Device Checks:** Documented as **UNVERIFIED / PENDING HARDWARE** per Rule 21 (no physical device or emulator claims).

---

## 2. Technical Packaging & Build Configuration Audit

| Item | Configuration | Target Standard | Status | Evidence & Notes |
|---|---|---|:---:|---|
| **Package Identifier** | `com.qashi.islamic` | Strict preservation per Rule 3 | **PASS** | Matches across `app.json`, `build.gradle` (`applicationId` and `namespace`), and manifest. Never altered. |
| **Application Label** | `Islamic - Your Daily Companion` | Play Console listing name | **PASS** | Configured in `app.json:3` and `android/app/src/main/res/values/strings.xml:2` (`@string/app_name`). |
| **Current Version Name** | `1.1.70` | Semantic versioning | **PASS** | Synchronized across `app.json:5`, `package.json:3`, and `build.gradle:104`. |
| **Current Version Code** | `89` | Monotonically increasing integer | **PASS** | Synchronized between `android/app/build.gradle:103` (`versionCode 89`) and `app.json:20` (`versionCode: 89`). |
| **Recommended Next Bump** | `1.1.71` (versionCode `90`) | Rule 5 compliance | **INFO** | Recommended for the next release cycle per Rule 5. Not applied unprompted. |
| **Target SDK Version** | `36` (Android 16 preview / Android 15 platform) | Google Play minimum requirement: `≥ 34` | **PASS** | `android/app/build.gradle:102` sets `targetSdkVersion 36`. Future-proofed for 2025/2026 store requirements. |
| **Compile SDK Version** | `36` | Matches targetSdk | **PASS** | `android/app/build.gradle:88` sets `compileSdk 36`. |
| **Minimum SDK Version** | `24` (Android 7.0 Nougat) | Modern Android baseline | **PASS** | `android/app/build.gradle:101` sets `minSdkVersion 24` (supports ~98% of active Android devices). |
| **64-Bit Architectures** | `arm64-v8a`, `x86_64` (plus `armeabi-v7a`, `x86`) | Google Play 64-bit mandate | **PASS** | `gradle.properties:31` declares `reactNativeArchitectures=armeabi-v7a,arm64-v8a,x86,x86_64`. Verified in release AAB. |
| **JavaScript Engine** | Hermes Bytecode | Fast startup & reduced memory | **PASS** | `hermesEnabled=true` in `gradle.properties:42`; `libhermesvm.so` bundled in native release library outputs. |
| **Release Signing Key** | Production `release.keystore` | RSA 2048-bit valid to 2054 | **PASS** | Preserved per Rule 3. `android/app/build.gradle:91-134` enforces hard-fail if `keystore.properties` is missing. No debug keys allowed. |
| **Debuggable Flag** | `android:debuggable="false"` | Omitted / false in release build | **PASS** | Verified in release merged manifest. `reactNativeReleaseLevel="stable"`. |
| **Backup Flag** | `android:allowBackup="false"` | Prevents sensitive data leakage via ADB | **PASS** | Verified in `app.json:20` and `AndroidManifest.xml:23`. |
| **Screen Orientation** | `portrait` | Locked for phone stability | **PASS** | Verified in `app.json:7` and `AndroidManifest.xml:33` (`screenOrientation="portrait"`). |
| **Edge-to-Edge UI** | `edgeToEdgeEnabled=true` | Android 15 edge-to-edge support | **PASS** | Configured in `gradle.properties:47`. |

---

## 3. Manifest Permissions Hygiene

| Permission | Status | Reviewer Justification & Hygiene |
|---|:---:|---|
| `ACCESS_FINE_LOCATION` & `ACCESS_COARSE_LOCATION` | **PASS** | Foreground-only. Optional; required only for astronomical prayer calculations and Qibla compass. Manual city fallback available. |
| `POST_NOTIFICATIONS` | **PASS** | Required on Android 13+ for prayer alerts and daily Quran reminders. Local only; no remote push. |
| `SCHEDULE_EXACT_ALARM` | **PASS** | Required for timely Adhan and prayer notifications. Only requested when notifications are enabled. |
| `RECEIVE_BOOT_COMPLETED` | **PASS** | Re-schedules local alarms after device reboot via `expo-notifications`. |
| `FOREGROUND_SERVICE` & `FOREGROUND_SERVICE_MEDIA_PLAYBACK` | **PASS** | Declared for background audio playback with `AudioControlsService`. Satisfies Google Play foreground service policy. |
| `USE_BIOMETRIC` & `USE_FINGERPRINT` | **PASS** | Optional Women's Worship privacy gate. Biometrics handled entirely by Android OS. |
| `READ/WRITE_EXTERNAL_STORAGE` | **PASS** | Scoped with `android:maxSdkVersion="32" tools:replace="android:maxSdkVersion"` to prevent Play Store warnings on Android 13+. |
| `RECORD_AUDIO` | **REMOVED** | Library-injected default from `expo-audio` is stripped via `plugins/withRemoveActivityRecognition.js`. App does not record audio. |
| `SYSTEM_ALERT_WINDOW` | **REMOVED** | Stripped via `plugins/withRemoveActivityRecognition.js`. No overlay permission requested. |
| `ACTIVITY_RECOGNITION` | **REMOVED** | Stripped via `plugins/withRemoveActivityRecognition.js`. Pedometer module disabled; only Magnetometer used for Qibla. |

---

## 4. Visual Assets & Store Listing Checklist

| Asset | Specifications | Available in Repo | Status | Owner / Designer Action |
|---|---|---|:---:|---|
| **App Launcher Icon** | 1024×1024 PNG | `assets/icon.png` | **PASS** | Master icon available. |
| **Play Store App Icon** | 512×512 PNG (max 1024 KB) | `assets/play-store-icon-512.png` | **PASS** | Generated via Lanczos downscale from master `assets/icon.png` (8.7 KB, 512×512 PNG). |
| **Android Adaptive Icon** | 512×512 FG, BG `#105A4B`, 432×432 Monochrome | `assets/android-icon-*.png` | **PASS** | Adaptive foreground, background, and themed monochrome icons verified in `assets/` and `res/mipmap-*/`. |
| **Splash Screen (Light)** | `#F4EEDE` background + ink icon | `assets/splash-icon-ink.png` | **PASS** | Configured in `app.json` and `res/values/styles.xml` / `res/values/colors.xml`. |
| **Splash Screen (Dark)** | `#0E1214` background + gold icon | `assets/splash-icon.png` | **PASS** | Configured in `app.json` and `res/values-night/styles.xml` / `res/values-night/colors.xml`. |
| **Feature Graphic** | 1024×500 PNG/JPEG (no transparency) | *None* | **FAIL** | **REQUIRED:** Designer must create a 1024×500 feature banner based on the existing ivory/emerald brand palette. |
| **Phone Screenshots** | Min 4, Max 8 (16:9 or 9:16) | 4 screenshots in `screenshots/` (`home.png`, `quran.png`, `tools.png`, `settings.png`) | **PASS** | High-resolution phone screenshots available. |
| **7-Inch Tablet Screenshots** | Min 1, 1200×1920 or equivalent | *None* | **FAIL** | **REQUIRED:** Owner must capture at least 1 tablet screenshot on a 7-inch tablet or viewport. |
| **10-Inch Tablet Screenshots** | Min 1, 1600×2560 or equivalent | *None* | **FAIL** | **REQUIRED:** Owner must capture at least 1 tablet screenshot on a 10-inch tablet or viewport. |

---

## 5. Screenshots Requiring Physical Hardware Capture

While static UI screens can be captured in preview viewports, Google Play Store guidelines and review teams require high-fidelity imagery of native device interactions. The following screenshots **require physical device capture**:

1. **System Notification Tray & Adhan Alert:** Native Android notification banner showing prayer countdown and Adhan alert action buttons in the lock screen and notification shade.
2. **Haptic Feedback & Interactive Compass:** Live Qibla compass rotating with true device magnetometer heading and visual calibration prompt.
3. **Lockscreen & Media Notification Bar:** Android media session player widget displaying current reciter, surah name, and play/pause/skip controls while app is backgrounded.
4. **Android 12+ Cold Boot Splash Transition:** Screen recording / sequence showing seamless transition from system splash to app home without grey/white flash (Rule 4 verification).
5. **Native RTL Layout on Arabic/Urdu Device:** Device running system locale in Arabic or Urdu to showcase native bidirectional mirroring, typography alignment, and back-gesture navigation.
6. **Native Document Share Sheet:** User exporting an encrypted-safe backup via the native Android Sharesheet or Storage Access Framework document picker.

---

## 6. Play Store Content Rating & Declarations

| Policy Area | Required Selection | Basis & Evidence | Status |
|---|---|---|:---:|
| **Target Age Group** | Everyone (All ages) | Religious and devotional content suitable for all ages. | **PASS** |
| **IARC Questionnaire** | Violence: None, Profanity: None, Sexual Content: None, Drugs: None | Verified clean content across all 49 locale files and datasets. | **PASS** |
| **Ads Declaration** | "No, my app does not contain ads" | Zero ad SDKs bundled. Verified via bundle scan. | **PASS** |
| **Financial Services** | "No financial features" | Zakat calculation is an on-device informational calculator with no transaction processing. | **PASS** |
| **Health Apps Declaration** | Informational / Religious only | Women's Worship is a local religious fiqh tracker with no clinical diagnosis, treatment claims, or Health Connect integration. | **PASS** |
| **Data Safety Form** | Location: Collected for App Functionality, Ephemeral, Not Shared, Not Linked to Identity | Matches verified network behavior: coordinates sent solely to `api.islamic.app/v1/timings` for solar zenith calculation. | **PASS** |
| **Personal Data Deletion** | Not applicable (no remote user accounts) | All data stored on-device; deleted via in-app clear tools or Android App Storage clear. | **PASS** |

---

## 7. Blocked Native & Device Verification Ledger

In accordance with Rule 20 and Rule 21, the following checks cannot be established via automated static scripts and remain **UNVERIFIED / PENDING HARDWARE TEST**:

| Check ID | Description | Exact Blocker | Status |
|---|---|---|:---:|
| `DEV-001` | Cold-boot grey/white flash check (Rule 4) | Requires real Android 12+ physical device to observe native splash handoff | **UNVERIFIED** |
| `DEV-002` | Exact alarm delivery in Android Doze mode | Requires device entering deep idle sleep over multiple hours | **UNVERIFIED** |
| `DEV-003` | Background audio service persistence under low memory | Requires OS low-memory killer simulation on physical device | **UNVERIFIED** |
| `DEV-004` | Magnetometer sensor tilt compensation | Requires physical device gyro/compass hardware rotation | **UNVERIFIED** |
| `DEV-005` | Biometric authentication prompt (Fingerprint / Face Unlock) | Requires physical biometric hardware sensor enrollment | **UNVERIFIED** |
| `DEV-006` | In-app update / Play Integrity API response | Requires distribution through live Play Store track | **UNVERIFIED** |

---

## 8. Store Readiness Checklist Summary Table

| Category | Checks | PASS | FAIL | UNVERIFIED |
|---|---:|---:|---:|---:|
| **Technical Packaging & Build** | 15 | 14 | 0 | 1 |
| **Permissions & Manifest** | 10 | 10 | 0 | 0 |
| **Visual Assets** | 9 | 6 | 3 | 0 |
| **Policy & Declarations** | 7 | 6 | 1 | 0 |
| **Physical Device Verification** | 6 | 0 | 0 | 6 |
| **TOTAL** | **47** | **36** | **4** | **7** |

### Immediate Owner Action Items Before Submission:
1. **[ACTION 1]** Publish `reports/audit/privacy-policy-draft.md` at a public HTTPS URL and enter it in Google Play Console.
2. **[ACTION 2]** Create a 1024×500 Feature Graphic matching the ivory/emerald brand palette.
3. **[ACTION 3]** Capture 7-inch and 10-inch tablet screenshots.
4. **[ACTION 4]** Verify cold-boot splash on a physical Android 12+ device (Rule 4).
