# Islamic — Publishing Checklist

Complete store-publishing reference: Google Play, Huawei App Gallery, Apple App Store (and Vivo/OPPO as applicable).

> App identity: **Islamic — Your Daily Companion** · Package `com.qashi.islamic` · Scheme `salah://` · Free, no IAP, no ads, Sadaqah Jariyah.

---

## 1. Content Rating

### Google Play (IARC questionnaire) → **Everyone**

| Question | Answer | Basis |
|---|---|---|
| Violence | **None** | No violent content |
| Sexual content / crude humor / profanity | **None** | None present |
| Alcohol / tobacco / drugs | **None** | No references |
| Gambling | **None** | No gambling |
| User interaction (social) | **No** | Notes/bookmarks are private, on-device; no public posts, chat, or community |
| Digital purchases | **No** | No IAP, billing, subscriptions, or ads |
| Location sharing | **No** | Location is used on-device only (prayer times + Qibla); not shared with other users |
| Health-related data collection | **No** | Women's cycle/purity data stays on-device; never collected or transmitted |

**Result: Everyone** (App Gallery: **Everyone / 4+**, Apple: **4+**).

---

## 2. Google Play Data Safety Form

| Category | Declaration | Note |
|---|---|---|
| **Location** (approx + precise) | **Collected — functionality only** | Used on-device for prayer times & Qibla. The only transmission is the coordinate + method sent to the free public prayer-times service to compute the schedule. Not sold, not shared, not used for ads, no account link. |
| **Personal info** (name/email/phone/IDs) | **Not collected** | No accounts, no sign-in. |
| **Financial info** | **Not collected** | No payments. |
| **Health & fitness** | **Not collected** | Cycle/purity/qada records are device-local only, never uploaded. |
| **Messages / Photos / Contacts / Files** | **Not collected** | — |
| **App activity / Web browsing / Diagnostics** | **Not collected** | No analytics, no crash trackers, no telemetry. |
| **Device identifiers** | **Not collected** | No IDFA/GAID collection. |
| **Ads** | **No** | No ad SDKs. |
| **Data deletion** | **Not applicable (no server data)** | All data is on-device; users delete via in-app actions, Android "Clear data", or uninstall. |
| **Data in transit** | **Encrypted (HTTPS)** | All API calls are HTTPS. |
| **Data sharing** | **Not shared** | No third-party data sharing; public APIs receive only required query parameters. |

---

## 3. Permission Justifications (Play may require these)

| Permission | Why it's declared | Honest note for reviewers |
|---|---|---|
| `ACCESS_FINE_LOCATION` / `ACCESS_COARSE_LOCATION` | Prayer times + Qibla for the user's location; manual city works without it | Optional, revocable; saved location used silently; requested only when genuinely needed (never on every launch) |
| `POST_NOTIFICATIONS` (Android 13+) | Prayer + Quran reminders, Adhan | Optional; only asked when reminders are enabled; channel-based |
| `RECORD_AUDIO` | **Declared by the audio playback library (expo-audio), NOT used for recording** | ⚠️ Likely flagged — answer: "The app only plays audio (Adhan/Quran); the permission is a library default and no recording occurs." If rejected, remove it via plugin config (`recordAudioAndroid: false`) |
| `MODIFY_AUDIO_SETTINGS` | Audio playback | Playback-only |
| `FOREGROUND_SERVICE` + `FOREGROUND_SERVICE_MEDIA_PLAYBACK` + `WAKE_LOCK` | Background Quran/Adhan audio playback | Foreground service type: mediaPlayback |
| `RECEIVE_BOOT_COMPLETED` | Re-schedule prayer notifications after reboot | expo-notifications boot recovery |
| `SCHEDULE_EXACT_ALARM` / `USE_EXACT_ALARM` | On-time prayer + pre-prayer notifications | Exact alarms declared for religious reminders |
| `VIBRATE` | Notification vibration | — |
| `READ/WRITE_EXTERNAL_STORAGE` (maxSdk 32) | Legacy library default; unused in-app | Legacy, SDK≤32 only |
| `SYSTEM_ALERT_WINDOW` | Legacy library default; unused | If flagged, remove from manifest |
| `USE_BIOMETRIC` / `USE_FINGERPRINT` | Women's Worship privacy lock (system biometrics) | Added by expo-local-authentication; biometrics handled by the OS, never stored/processed by the app |

---

## 4. Store Listing Copy (short)

- **Short description:** "Prayer times, Qur'an, Hadith, Duas & Qibla — free forever as Sadaqah Jariyah."
- **Full description:** Use the website copy (features, offline, privacy, no accounts) — see README.
- **Category:** Lifestyle (or Education → Religion). Google Play has no "Religion" category; **Lifestyle** is the common fit.
- **Tags/keywords:** prayer times, adhan, quran, hadith, qibla, islamic, salah, fasting, zakat, dua.
- **Privacy Policy URL:** host the website's legal/privacy.html (or a copy) at a public URL — required by Play. The site is already served at `http://38.60.176.137:9998` (dev); publish it properly (any static host/GitHub Pages) before submitting.
- **Contact email:** hi@qashi.uz

---

## 5. App Gallery (Huawei) / Vivo / OPPO notes

- Same content rating (Everyone / 4+).
- Privacy policy must state **no cross-border transfer** (already in the website's Global Store Compliance section) — data is device-local.
- APK: same signed release APK works; App Gallery may require an **additional Huawei signature** only for their store-specific builds (AAB/APK with Huawei signing) — the standalone APK upload is usually accepted.
- Declare permissions identically; RECORD_AUDIO is the likely reviewer question everywhere.

---

## 6. Apple App Store notes (when iOS is published)

- **Privacy labels:** "Data Not Collected" across all categories (declare location only if iOS build uses it — functionality-only).
- **Account deletion:** not required (no accounts) — state "no accounts, nothing to delete" in App Review notes.
- **App Privacy → Tracking:** "Does not track" (no IDFA).
- iOS WidgetKit widgets are a placeholder currently — if shipping iOS without widgets, no claim.
- **Content rating:** 4+.

---

## 7. Release checklist before submitting

- [ ] tsc passes (`NODE_OPTIONS=--max-old-space-size=6144 npx tsc --noEmit`)
- [ ] `npm test` (10 architecture tests) passes
- [ ] Release APK builds (`assembleRelease`) + widgets verified in manifest
- [ ] Privacy policy live at a public HTTPS URL (required)
- [ ] hi@qashi.uz contact reachable
- [ ] Screenshots: phone (Home/Quran/Tools/Settings) + tablet, both themes (already in `screenshots/`)
- [ ] Feature graphic 1024×500 (Play) — can be generated from the website hero
- [ ] App icon 512×512 (have it)
- [ ] Data Safety form filled per §2
- [ ] Content rating completed per §1
- [ ] Declare target API level ≥ current Play requirement (targetSdk 36)

---

## 8. Known reviewer questions to preempt

1. **"Why RECORD_AUDIO?"** → playback-only library default; no recording. (Or remove via `recordAudioAndroid: false`.)
2. **"Why exact alarms?"** → religious reminder timeliness; declared + requested only with reminders enabled.
3. **"Location on first launch?"** → only when genuinely needed; manual city works without it; saved location used silently.
4. **"Where is the privacy policy?"** → live URL + in-app Settings → About & Legal.
5. **"No account deletion?"** → no accounts exist; state it in review notes.
