# Android Release APK Build & Upload Verification Audit Report

**Application:** Islamic - Your Daily Companion (`com.qashi.islamic`)
**Version:** `1.1.70` (VersionCode `89`)
**Target Platform:** Android (Native Release APK)
**Governing Standard:** `rules.md` (Standing Project Rules 1–23)
**Audit Date:** 2026-10-17
**Build Toolchain:** Gradle 9.3.1, Android SDK 36.0.0, Kotlin Daemon, React Native 0.83 / Expo SDK 57
**Execution Posture:** Synchronous Foreground Compilation, Independent Verification & Verified Release Upload

---

## 1. Executive Summary & Freshness Proof

Following explicit user authorization to compile a signed production release APK containing the latest Home "DUA AFTER PRAYER" card fix and upload it to GitHub release `v1.1.70`, the release workflow was executed end-to-end.

Freshness is proven by comparative filesystem metadata and cryptographic hashing against the pre-build baseline.

### 1.1 Freshness & Artifact Comparison

| Property | Baseline APK (Pre-Build) | Newly Compiled Release APK | Verification Result |
| :--- | :--- | :--- | :--- |
| **Path** | `android/app/build/outputs/apk/release/app-release.apk` | `android/app/build/outputs/apk/release/app-release.apk` | Target Path Confirmed |
| **Modification Time (mtime)** | `2026-10-17T18:29:01.872Z` | `2026-10-17T18:58:24.766Z` | **PROVEN FRESH** (+29 minutes newer) |
| **File Size (bytes)** | `106,141,745` bytes | `106,142,897` bytes | **PROVEN FRESH** (+1,152 bytes) |
| **SHA-256 Digest** | `de4ebc00344667c07965f9f61d7351de5027c73b66433f47d3dc4228f04cd3aa` | `4308e2a5e4bb35d7457203785ad85c0f9d184a63d55c1196fee55d1c4bd09661` | **PROVEN FRESH** (Hash changed) |

---

## 2. Release Preflight Audit

All required preflight checks passed cleanly with exit code 0 prior to compilation:

| Preflight Check | Execution Command | Result / Exit Code | Evidence Summary |
| :--- | :--- | :--- | :--- |
| **Focused DUA Test** | `node tests/test_home_dua_after_prayer.mjs` | **0** | All 8 sub-tests passed (data validity, prayer specificity, ordering, snap math) |
| **Whitespace & Diff Check** | `git diff --check` | **0** | Clean, zero whitespace errors or merge residue |
| **TypeScript Typecheck** | `NODE_OPTIONS=--max-old-space-size=6144 npx tsc --noEmit` | **0** | Zero type errors |
| **ESLint / Expo Lint** | `npx expo lint` | **0** | Zero lint errors or warnings |
| **Full Test Suite** | `npm test` | **0** | 32 test scripts passed, including locale parity and security checks |
| **Expo Web Export** | `npx expo export --platform web` | **0** | Successfully bundled web target without bundling errors |

---

## 3. Package Identity & Badging Audit (`aapt dump badging`)

Synchronous inspection using `/opt/android-sdk/build-tools/36.0.0/aapt dump badging` verifies manifest configuration:

```text
package: name='com.qashi.islamic' versionCode='89' versionName='1.1.70' platformBuildVersionName='16' platformBuildVersionCode='36' compileSdkVersion='36' compileSdkVersionCodename='16'
sdkVersion:'24'
targetSdkVersion:'36'
application-label:'Islamic - Your Daily Companion'
application: label='Islamic - Your Daily Companion' icon='res/BW.xml'
```

### 3.1 Identifiers Summary
- **Application ID:** `com.qashi.islamic` (Preserved exactly)
- **Version Code:** `89` (Preserved exactly)
- **Version Name:** `1.1.70` (Preserved exactly)
- **Min SDK:** `24` (Android 7.0 Nougat)
- **Target SDK:** `36` (Android 16 / Latest API level)
- **Compile SDK:** `36`
- **Application Label:** `Islamic - Your Daily Companion`

### 3.2 Debuggable State Audit
- **`android:debuggable`:** Absent (`false`), verified non-debuggable production release.
- **`testOnly`:** Absent (Not a test-only build).
- **Verdict:** **NON-DEBUGGABLE PRODUCTION RELEASE**

---

## 4. Cryptographic Signature Verification (`apksigner`)

Verification executed via `/opt/android-sdk/build-tools/36.0.0/apksigner verify --verbose --print-certs`:

```text
Verifies
Verified using v1 scheme (JAR signing): false
Verified using v2 scheme (APK Signature Scheme v2): true
Verified using v3 scheme (APK Signature Scheme v3): false
Verified using v3.1 scheme (APK Signature Scheme v3.1): false
Verified using v4 scheme (APK Signature Scheme v4): false
Verified for SourceStamp: false
Number of signers: 1
Signer #1 certificate DN: CN=Ceoslugpk, OU=Islamic App, O=Ceoslugpk, L=Dubai, ST=Dubai, C=AE
Signer #1 certificate SHA-256 digest: e6e788c76f8400dcc216be66e8a74c5bd1d415c55f322b9b36d401087315458f
Signer #1 certificate SHA-1 digest: 6d8fb1134d0476201b7fbe4ca8a42122e2fb16f2
Signer #1 certificate MD5 digest: 3acc36562dab3b55d572ff2158c0061b
Signer #1 key algorithm: RSA
Signer #1 key size (bits): 2048
Signer #1 public key SHA-256 digest: 525f4d7139232388b7c01a586a79b8348c836c33e0b8b7036fe556cf879e1c7a
```

### 4.1 Signing Identity Audit
- **Keystore / Signing Identity:** Existing production key preserved (`CN=Ceoslugpk, OU=Islamic App, O=Ceoslugpk, L=Dubai, ST=Dubai, C=AE`).
- **Certificate SHA-256:** `e6e788c76f8400dcc216be66e8a74c5bd1d415c55f322b9b36d401087315458f` (Exact production match).
- **Scheme:** APK Signature Scheme v2 (`true`).
- **Zero Key Alteration:** Keystore was not regenerated or replaced.

---

## 5. Android 12+ Splash Resource Configuration (`aapt2`)

Compiled splash screen resource entries in `app-release.apk` inspected via `/opt/android-sdk/build-tools/36.0.0/aapt2 dump resources`:

```text
resource 0x7f130287 style/Theme.App.SplashScreen
  () (style) size=1 parent=style/AppTheme (0x7f13000d)
    0x01010054=@drawable/splashscreen_logo
  (v31) (style) size=3 parent=style/AppTheme (0x7f13000d)
    0x0101062c=@color/splashscreen_background
    0x0101062d=@drawable/splashscreen_logo
    0x01010630=@color/splashscreen_background
  (night-v31) (style) size=3 parent=style/AppTheme (0x7f13000d)
    0x0101062c=#ff0e1214
    0x0101062d=@drawable/splashscreen_logo
    0x01010630=#ff0e1214
```

- **Android 12+ (v31) Background:** `@color/splashscreen_background`
- **Android 12+ Night (night-v31) Background:** `#ff0e1214`
- **Animated Icon:** `@drawable/splashscreen_logo`
- **Physical Splash Verification Status:** Static resource compilation verified. Per **Rules 4 & 21**, physical launch and splash transition behavior remain unverified until tested on a connected physical device.

---

## 6. Declared Permissions Audit

Inspection of badging confirms only authorized permissions:

1. **Location & Prayer Times:**
   - `android.permission.ACCESS_FINE_LOCATION`
   - `android.permission.ACCESS_COARSE_LOCATION`
2. **Audio & Background Services:**
   - `android.permission.FOREGROUND_SERVICE`
   - `android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK`
   - `android.permission.MODIFY_AUDIO_SETTINGS`
   - `android.permission.WAKE_LOCK`
3. **Connectivity & Web Access:**
   - `android.permission.INTERNET`
   - `android.permission.ACCESS_NETWORK_STATE`
4. **Boot & Alarms / Notifications:**
   - `android.permission.RECEIVE_BOOT_COMPLETED`
   - `android.permission.POST_NOTIFICATIONS`
   - `android.permission.VIBRATE`
5. **Biometrics:**
   - `android.permission.USE_BIOMETRIC`
   - `android.permission.USE_FINGERPRINT`
6. **Scoped Storage Compliance:**
   - `android.permission.READ_EXTERNAL_STORAGE` (`maxSdkVersion='32'`)
   - `android.permission.WRITE_EXTERNAL_STORAGE` (`maxSdkVersion='32'`)
7. **IPC & System Badging:**
   - `com.google.android.c2dm.permission.RECEIVE`
   - `com.qashi.islamic.DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION`
   - `com.google.android.finsky.permission.BIND_GET_INSTALL_REFERRER_SERVICE`
   - OEM Badge Providers: Samsung, HTC, Sony, Huawei, Oppo, Everything Badger.

**Zero Invasive Permissions:** No microphone, camera, contacts, or SMS permissions.

---

## 7. GitHub Release Upload & Verification

### 7.1 Target Release Metadata
- **Repository:** `Ceoslugpk/islamic-app`
- **Release Tag:** `v1.1.70`
- **Release Page URL:** `https://github.com/Ceoslugpk/islamic-app/releases/tag/v1.1.70`
- **Asset Name:** `app-release.apk`

### 7.2 Upload Execution
```bash
gh release upload v1.1.70 /home/ubuntu/apps/islamic_app/android/app/build/outputs/apk/release/app-release.apk --repo Ceoslugpk/islamic-app --clobber
```
Result: Successfully uploaded 1 asset to `v1.1.70` (exit code `0`).

### 7.3 Post-Upload Byte-for-Byte & Cryptographic Hash Verification
1. **Remote Asset Metadata Query (`gh release view`):**
   - Remote Asset Name: `app-release.apk`
   - Remote Asset ID: `RA_kwDOU6dJT84m0kUc` (Asset ID `651314460`)
   - Remote Asset Size: `106,142,897` bytes
2. **Authenticated Download & Checksum Comparison:**
   - Downloaded to temporary verification scratch directory via `gh release download`.
   - Local APK Size: `106,142,897` bytes
   - Remote Downloaded APK Size: `106,142,897` bytes
   - **Size Match: TRUE (Exact byte match)**
   - Local APK SHA-256: `4308e2a5e4bb35d7457203785ad85c0f9d184a63d55c1196fee55d1c4bd09661`
   - Remote APK SHA-256: `4308e2a5e4bb35d7457203785ad85c0f9d184a63d55c1196fee55d1c4bd09661`
   - **SHA-256 Match: TRUE (Identical hash)**

---

## 8. Deployment Preparation

Inspection of `/opt/android-sdk/platform-tools/adb devices` reported no attached devices. No physical installation was performed.

### Prepared ADB Installation Command
To install or update the app on an attached device or emulator preserving user data, settings, and prayer history:

```bash
adb install -r /home/ubuntu/apps/islamic_app/android/app/build/outputs/apk/release/app-release.apk
```

---

## 9. Physical-Device Testing Hold (Rules 4 & 21)

Per **Rule 20** (No fabricated results) and **Rule 21** (No physical-device claims without a device), the following items require a connected physical Android device and cannot be declared verified by headless compilation alone:

1. **Rule 4 Grey/White Pattern Flash Check:**
   - Must be verified by launching the app on an Android 12+ (API 31+) device in light and dark mode to observe the launch window to splash transition.
2. **Physical Compass Sensor:**
   - Qibla sensor declination, smooth pointer rotation, and magnetometer calibration.
3. **Background Media Playback & Notification Controls:**
   - Hardware audio focus transitions, lock screen mini-player, and wake-lock reliability under OEM battery optimization.
4. **Native RTL Layout on Device:**
   - Rendering of Arabic and Urdu text layout, scroll rail gesture fluidity, and card expansion touch areas on a physical screen.

---

## 10. Verification Sign-Off

- **Audit Tooling:** `/opt/android-sdk/build-tools/36.0.0/apksigner`, `/opt/android-sdk/build-tools/36.0.0/aapt`, `/opt/android-sdk/build-tools/36.0.0/aapt2`, `python3 (hashlib)`, `gh release view`, `gh release download`.
- **Verdict:** **PASSED** — Artifact newly compiled, signed with established production certificate, verified byte-for-byte and hash-matched against the GitHub release asset.
