# Physical Android Device Verification Checklist (Post-Repair Audit)

**Application:** Islamic - Your Daily Companion (`com.qashi.islamic`)
**Target Release:** v1.1.70 (VersionCode 89)
**Audit Phase:** Post-Repair Android Verification (Task 6)
**Governing Standard:** `rules.md` (Rule 4, Rule 20, Rule 21)
**Verification Status:** **READY FOR PHYSICAL DEVICE EXECUTION**

> [!IMPORTANT]
> **Rule 21 & Integrity Mandate:** Automated static and synthetic checks cannot substitute for physical Android hardware verification. In accordance with project rules, **none of the physical tests below were performed by Hermes**. Every gate must be executed and confirmed by the human device owner on real physical Android hardware prior to public release.

---

## 1. Quick-Start Deployment Instructions (Owner Only)

Per **Rule 1** and **Rule 6**, release compilation must be authorized by the owner:

```bash
# 1. Compile signed release APK
cd android && ANDROID_HOME=/opt/android-sdk GRADLE_OPTS="-Xmx2048m -XX:MaxMetaspaceSize=768m -Dorg.gradle.workers.max=4" ./gradlew assembleRelease --no-daemon

# 2. Install on attached physical Android device (preserving all user data per Rule 3)
adb install -r android/app/build/outputs/apk/release/app-release.apk
```

---

## 2. Mandatory On-Device Verification Gates

| # | Verification Area | Target Protocol & Pass Criteria | Automated Status | Physical Device Status |
|:---:|---|---|:---:|:---:|
| **1** | **Android 12+ Splash / Grey Flash (Rule 4)** | 1. Force stop: `adb shell am force-stop com.qashi.islamic`.<br>2. Cold launch from home screen icon.<br>3. Verify zero white, grey, or unstyled rectangular flash between native launch and splash screen.<br>4. Test under both System Dark Theme and System Light Theme. | Statically verified | **Not performed by Hermes** (Requires physical Android 12+ hardware) |
| **2** | **Location Permission & Dismissal Persistence** | 1. Fresh launch with Location permission set to "Don't Allow".<br>2. Dismiss location setup prompt.<br>3. Navigate through Home, Quran, Library, Tools tabs.<br>4. Confirm modal does NOT re-trigger on tab changes or cold relaunch. | Automated pass (`test_task1_location_dismissal.mjs`) | **Not performed by Hermes** (Requires physical location manager interaction) |
| **3** | **After-Isha Tomorrow Fajr Rollover** | 1. Set device time after Isha (e.g. 21:30): `adb shell "date @$(date -d '21:30:00' +%s)"`.<br>2. Verify Home hero card and Salah Tracker highlight **Fajr (Tomorrow)** with active countdown (> 0s).<br>3. Verify zero `null` returns or UI blanking. | Automated pass (`test_task1_next_prayer_rollover.mjs`) | **Not performed by Hermes** (Requires physical device clock inspection) |
| **4** | **English ↔ Urdu / RTL Direction & Fonts** | 1. Go to Settings -> Language -> Select **Urdu (اردو)**.<br>2. Verify layout switches immediately to RTL (headers, cards, tabs, navigation).<br>3. Verify Noto Nastaliq Urdu / Amiri fonts render crisply without clipped ligatures or glyph boxes (`[]`).<br>4. Switch back to English (LTR). Verify clean symmetric transition. | Automated pass (`test_task2_rtl_and_sorani.mjs`) | **Not performed by Hermes** (Requires physical screen visual inspection) |
| **5** | **Quran Continue Reading (Ayahs 15, 35, 70)** | 1. Open Quran Reader -> Bookmark/Mark Ayah 15 -> Switch to Urdu -> Force stop app -> Relaunch -> Verify Continue Reading lands at Ayah 15.<br>2. Repeat for Ayah 35 (switch to English -> Relaunch -> Verify Ayah 35).<br>3. Repeat for Ayah 70 (verify hop elimination and direct landing). | Automated pass (`test_audit_en_ur_quran_positions.mjs`) | **Not performed by Hermes** (Requires physical touch & scroll validation) |
| **6** | **Audio / Background Media & Lock Screen** | 1. Start Surah audio playback (e.g., Al-Fatiha with Mishary Rashid).<br>2. Press Home button -> Verify audio continues playing in background.<br>3. Check Android Notification Shade -> Verify media player with title, reciter, play/pause/seek controls.<br>4. Lock device -> Verify lock-screen media widget.<br>5. Simulate incoming call -> Verify audio ducks/pauses and resumes. | Code guarded | **Not performed by Hermes** (Requires native Android MediaSession & audio focus) |
| **7** | **Notifications & Exact Alarms** | 1. Schedule Adhan notification in Prayer Reminders.<br>2. Verify `SCHEDULE_EXACT_ALARM` / AlarmManager permission on Android 12+.<br>3. Lock phone and wait for prayer time -> Verify high-priority notification and full audio adhan sound. | Code guarded | **Not performed by Hermes** (Requires physical Android notification daemon & doze mode) |
| **8** | **Backup & Restore Integrity** | 1. Log 3 prayers, add 2 bookmarks, 1 note.<br>2. Settings -> Backup & Export -> Export JSON.<br>3. Verify exported file exists in Downloads without PIN hash.<br>4. Clear app cache (not data) -> Restore Backup -> Verify all records restore identically. | Automated pass (`test_task4_storage_and_recovery.mjs`) | **Not performed by Hermes** (Requires native Android SAF file picker interaction) |
| **9** | **Offline Operation (Airplane Mode)** | 1. Enable Airplane mode: `adb shell cmd connectivity airplane-mode enable`.<br>2. Cold launch app.<br>3. Verify all 114 Surahs, Hadith collections, 99 Names, Duas, and cached prayer times load instantly without network spinners or crashes.<br>4. Disable Airplane mode -> Verify graceful reconnection. | Automated pass (`test_task4_bundle_manifest.mjs`) | **Not performed by Hermes** (Requires physical radio disconnection) |
| **10** | **Low-Storage / SQLITE_FULL Logcat Evidence** | 1. Under low internal storage (<10MB free) or simulated quota, trigger cache and prayer updates.<br>2. Capture adb logcat: `adb logcat -d \| grep -E "SQLiteFull\|db.native\|salah.db"`.<br>3. Verify cache eviction runs (`enforceQuranCacheBudget`), never evicts user tables, and never corrupts existing records. | Synthetic test pass (`test_task4_storage_and_recovery.mjs`) | **Not performed by Hermes** (Requires physical internal flash storage exhaustion) |

---

## 3. Physical Device Sign-Off Form

| Field | Owner Input / Signature |
|---|---|
| **Test Device Model** | *(e.g. Samsung Galaxy S23, Google Pixel 8)* |
| **Android OS Version / API** | *(e.g. Android 14 / API 34)* |
| **Tester Name / Role** | *(Device Owner)* |
| **Test Date** | *(YYYY-MM-DD)* |
| **Gate 1 (Splash Flash - Rule 4)** | [ ] PASS (Zero flash) &nbsp;&nbsp;&nbsp; [ ] FAIL |
| **Gate 2 (Location & Next Prayer)** | [ ] PASS &nbsp;&nbsp;&nbsp; [ ] FAIL |
| **Gate 3 (Urdu RTL & Fonts)** | [ ] PASS &nbsp;&nbsp;&nbsp; [ ] FAIL |
| **Gate 4 (Quran Positions 15/35/70)** | [ ] PASS &nbsp;&nbsp;&nbsp; [ ] FAIL |
| **Gate 5 (Audio & Lock Screen)** | [ ] PASS &nbsp;&nbsp;&nbsp; [ ] FAIL |
| **Gate 6 (Notifications & Alarms)** | [ ] PASS &nbsp;&nbsp;&nbsp; [ ] FAIL |
| **Gate 7 (Backup & Restore)** | [ ] PASS &nbsp;&nbsp;&nbsp; [ ] FAIL |
| **Gate 8 (Offline / Airplane Mode)** | [ ] PASS &nbsp;&nbsp;&nbsp; [ ] FAIL |
| **Gate 9 (Low Storage Logcat)** | [ ] PASS &nbsp;&nbsp;&nbsp; [ ] FAIL |
| **FINAL OWNER RELEASE APPROVAL** | [ ] **GO FOR RELEASE** &nbsp;&nbsp;&nbsp; [ ] **HOLD** |
