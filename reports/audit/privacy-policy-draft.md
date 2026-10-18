# Privacy Policy for Islamic — Your Daily Companion

**Effective Date:** [EFFECTIVE_DATE]
**Last Updated:** [EFFECTIVE_DATE]
**Entity/Publisher:** [OWNER_LEGAL_ENTITY_NAME]
**Contact:** [OWNER_CONTACT_EMAIL]
**Public Hosted URL:** [OWNER_PUBLIC_PRIVACY_URL]
**Application Identifier:** `com.qashi.islamic`

---

> [!IMPORTANT]
> **Owner Deployment Action Required**
> Google Play Store policy requires this Privacy Policy to be hosted at an active, publicly accessible HTTPS URL and linked in the Google Play Console under **Policy and programs > App content > Privacy policy** prior to app submission.
>
> Placeholders requiring repository owner input before publication are indicated throughout this document with square brackets:
> - `[OWNER_LEGAL_ENTITY_NAME]` (e.g., your organization, studio, or individual developer name)
> - `[OWNER_CONTACT_EMAIL]` (e.g., `hi@qashi.uz` or privacy contact address)
> - `[OWNER_PUBLIC_PRIVACY_URL]` (e.g., `https://qashi.uz/privacy` or GitHub Pages URL)
> - `[EFFECTIVE_DATE]` (e.g., date of publication)

---

## 1. Introduction & Core Philosophy

**Islamic — Your Daily Companion** is developed as a free, open religious companion built as *Sadaqah Jariyah* (continuous charity) for the Muslim Ummah. We believe your spiritual practices, daily prayers, reflections, personal notes, and intimate worship routines are sacred and private to you alone.

Our privacy architecture is built on three core pillars:
1. **Zero Data Monetization:** We do not sell, rent, monetize, broker, or trade any user data under any circumstances.
2. **Account-Free Architecture:** The application does not require account registration, login credentials, email addresses, phone numbers, or user profiles.
3. **On-Device Storage:** Your personal worship records, reflections, and settings are stored locally on your device in sandboxed application storage and are never uploaded to any remote server operated by us.

---

## 2. Information We Do NOT Collect

To provide complete transparency, the application operates with the following explicit privacy guarantees:
- **No Personal Identifiers:** We do not collect your name, email address, phone number, physical address, national identity numbers, or account usernames.
- **No Financial Data:** The app contains zero in-app purchases, paid subscriptions, or payment gateways. We collect no credit card or banking details.
- **No Device or Advertising Identifiers:** The app does not collect the Google Advertising ID (GAID), Apple Identifier for Advertisers (IDFA), IMEI, or MAC address.
- **No Analytics or Usage Telemetry:** The app bundles zero analytics SDKs (no Google Analytics, Firebase Analytics, Segment, Mixpanel, or Amplitude). We do not record screen views, tap events, or session duration.
- **No Crash Trackers or Error Telemetry:** The app contains zero third-party crash reporting SDKs (no Sentry, Bugsnag, or Crashlytics).
- **No Advertising Networks:** The app contains zero ad SDKs (no AdMob, Unity Ads, or AppLovin) and serves zero advertisements.

---

## 3. Data Stored Locally on Your Device

All personal data generated during your use of the application is stored exclusively within your device's private, sandboxed local storage (embedded SQLite database `salah.db` and key-value storage `AsyncStorage` on Android/iOS; sandboxed `localStorage` on Web preview). This data includes:

### A. Prayer & Worship Logs
- **Salah Tracker:** Daily prayer completion records and prayer streak statistics stored in the local `salah_entries` database table.
- **Tasbih Counter:** Digital dhikr tallies, target counts, and daily tasbih records stored in `tasbih_entries` and `tasbih_daily`.
- **Fasting Tracker:** Fasting logs (Ramadan, voluntary, expiation/kaffarah, and qada) stored in `fasting_entries` and `missed_fasts`.
- **Zakat Calculator:** User-entered financial calculation worksheets stored in `zakat_history`.
- **Hifz & Hadith:** Memorization progress stored in `hifz_entries`, saved hadiths in `hadith_saved`, and reading markers in `hadith_read_markers`.

### B. Quran Reader & Personal Reflections
- **Reading Progress:** Last read surah, ayah, and Mushaf page position.
- **Bookmarks & Notes:** Personal verse bookmarks (`bookmarks` table) and private reflection notes (`notes` table).
- **Reading Plans:** Custom Quran completion schedules and progress tracking (`plan_entries`).

### C. Women's Worship & Cycle Health Records
The optional Women's Worship section allows Muslim women to track religious obligations (prayer exemptions, fasting make-up days, and ghusl purity intervals) in strict alignment with Islamic jurisprudence.
- **Data Categories:** Menstrual period start and end dates (`period_entries`), post-natal bleeding intervals (`nifas_entries`), purity days, private notes, and missed fast records where the reason pertains to menstruation or nifas.
- **Storage Boundary:** Kept exclusively in on-device SQLite storage. **Never transmitted to external APIs, analytics, or third parties.**
- **No Health Connect Integration:** The application does not integrate with Android Health Connect, Apple HealthKit, or any third-party health data broker.
- **Privacy Lock:** Access to the Women's Worship section is guarded by an optional device authentication gate (biometrics or a local 4-digit PIN). Local PINs are hashed using a slow 100,000-iteration key derivation function (`kdf_v2_100000_`) with exponential lockout protection. PIN hashes are never transmitted.
- **Privacy Masking:** When the app is locked or viewed outside the authenticated gate, intimate missed-fast reasons are automatically masked as `"Excused (Private)"` to prevent shoulder-surfing disclosure.

### D. Downloaded Media & Cache
- **Quran Text & Translations:** Preloaded surahs and multilingual translation text files stored in `quran_cache`.
- **Audio Recitations:** Cached verse-by-verse recitation audio files stored in device cache directory (`quran-audio-downloads`).

### E. Application Settings & Preferences
- Selected language, calculation method, juristic school (madhab), notification preferences, font size, theme mode, and chosen Quran reciter stored in `islamic-settings`.

---

## 4. Device Permissions

The application requests only the minimum device permissions necessary for core religious functionality. All permissions are optional and may be revoked at any time through your device settings:

| Permission | Technical Name | Purpose & Data Handling |
|---|---|---|
| **Location (Precise & Approximate)** | `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION` | **Prayer Times & Qibla Compass:** Used on-device to determine your local prayer timetable and calculate the geographic direction to the Kaaba. Your coordinates are used ephemerally to query the prayer timetable API and are never stored on external servers or linked to your identity. If permission is denied, you may select a manual city with zero GPS access. |
| **Notifications** | `POST_NOTIFICATIONS`, `SCHEDULE_EXACT_ALARM`, `RECEIVE_BOOT_COMPLETED` | **Prayer & Reminder Alerts:** Used exclusively to schedule local on-device alarms for Adhan, prayer times, and daily Quran reminders. Notifications are generated locally by your device operating system without remote push servers. |
| **Media Playback & Foreground Service** | `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_MEDIA_PLAYBACK`, `WAKE_LOCK` | **Background Audio Recitation:** Allows continuous Quran recitation and Adhan playback when the screen is turned off or when navigating outside the application. |
| **Biometrics** | `USE_BIOMETRIC`, `USE_FINGERPRINT` | **Women's Worship Gate:** Used strictly via native operating system authentication prompts to unlock the private Women's Worship section. Biometric data is processed entirely by your device hardware; the application never accesses, reads, or stores biometric templates. |
| **Storage (Media & Files)** | `READ_EXTERNAL_STORAGE`, `WRITE_EXTERNAL_STORAGE` (maxSdkVersion=32) | **Legacy Cache Access:** Used on Android 12 and older devices to save and access downloaded Quran audio and translation cache. |

### Proactively Removed Permissions
The application explicitly removes library-injected permissions that are not required for our functionality:
- `android.permission.RECORD_AUDIO` is **removed** (the application only plays audio; it never records audio).
- `android.permission.ACTIVITY_RECOGNITION` is **removed** (no physical activity or pedometer tracking).
- `android.permission.SYSTEM_ALERT_WINDOW` is **removed** (no floating screen overlays).

---

## 5. Network Requests & External Services

The application connects to external servers only when necessary to fetch public religious data, astronomical calculations, or streaming audio. All network requests use encrypted HTTPS (`https://`) transport.

| Service / Endpoint | Provider | Purpose & Transmitted Data |
|---|---|---|
| `api.islamic.app` | Islamic.app | **Prayer Times & Hadith:** Receives approximate latitude, longitude, calculation method ID, and madhab to return prayer schedules and authentic Hadith collections. Zero user identifiers sent. |
| `api.alquran.cloud`, `cdn.alquran.cloud` | AlQuran Cloud | **Quran Text & Translations:** Downloads verified Uthmani script and translated text editions. No personal data transmitted. |
| `cdn.islamic.network`, `everyayah.com` | Islamic Network / EveryAyah | **Quran Audio:** Streams verse-by-verse audio recitations from renowned reciters (e.g. Alafasy, Abdulbasit). No personal data transmitted. |
| `api.aladhan.com` | AlAdhan | **Hijri Date Validation:** Fallback astronomical calendar verification. No personal data transmitted. |
| `nominatim.openstreetmap.org`, `overpass-api.de` | OpenStreetMap Foundation | **City Geocoding & Mosque Search:** Receives user-typed city search terms or coordinates to return city names or nearby mosque locations. |
| `esmaulhusna.org` | EsmaulHusna.org | **99 Names Commentary:** Fetches meanings and commentary for the 99 Names of Allah. No user identifiers sent. |
| `www.youtube.com`, `www.youtube-nocookie.com` | Google LLC / YouTube | **Makkah & Madinah Live Streams:** Embedded live stream video playback via origin-restricted WebView. Subject to YouTube's standard terms. |

---

## 6. Backups, Export & Data Portability

- **User-Controlled Export:** You may create a full backup of your personal records at any time via **Settings > Backup & Restore > Export Backup**. The export generates a standard JSON file containing your worship logs, bookmarks, and settings.
- **PIN Security on Export:** To safeguard your privacy, Women's Worship PIN hashes and lock configuration are **strictly stripped and excluded** from exported backup files. When restoring a backup on a new device, the privacy PIN must be re-established locally.
- **Storage & Sharing:** The app does not automatically upload or sync backup files to any cloud service. You control where the exported file is stored or shared using your device's native document picker or share sheet.
- **Import Validation:** When restoring a backup, the application validates the file schema, enforces strict key allowlists, and parameterizes all database writes to protect against corrupted or malicious input.

---

## 7. Data Retention, Deletion & Management

Because all data resides locally on your device, **you maintain absolute control over retention and deletion**:
- **Deleting Women's Worship Data:** You can permanently erase all cycle, purity, nifas, and related qada records at any time by navigating to **Settings > Women's Worship > Delete women's data**.
- **Deleting Downloaded Audio & Text:** You can reclaim device storage by navigating to **Settings > Downloads > Clear All Downloads**, which wipes cached Quran text and recitation audio files.
- **Deleting All Application Data:** You can completely and irreversibly wipe all local databases, settings, and cached files through your device's operating system settings: **Android Settings > Apps > Islamic > Storage > Clear Data / Clear Storage**, or by uninstalling the application.
- **Intentional Omission of Global In-App Factory Reset:** To protect users against catastrophic, irreversible accidental data destruction (such as loss of multi-year prayer logs, fasting history, or reflection notes), a single-tap global in-app wipe button is intentionally not included within the UI. Complete deletion is safely handled by the operating system storage controls described above.

---

## 8. Children's Privacy

The application is rated for **Everyone (4+)** across major application stores. It contains no adult content, violence, crude language, gambling, or commercial advertising. The application does not knowingly collect personal information from children or any other user. Because no accounts, profiles, or personal data collection exist, parents and guardians can be confident that children's privacy is fully respected.

---

## 9. Security Safeguards

Although the application operates strictly on-device without remote accounts, we apply rigorous client-side defensive engineering:
- **100% HTTPS Enforcement:** All remote API calls and asset downloads use encrypted HTTPS (`https://`). Cleartext HTTP traffic is disabled.
- **Slow KDF & Lockout Protection:** The Women's Worship PIN is derived using a 100,000-round PBKDF-style algorithm (`hashPinKdf`) and enforces exponential backoff lockout timers upon consecutive incorrect attempts.
- **Origin-Restricted WebViews:** External embedded video content is strictly restricted to YouTube Live origins with message validation.
- **Input Sanitization & Parameterized SQL:** All local database queries use parameterized SQL execution to prevent injection. Search inputs are bounded and validated in-memory.

---

## 10. Changes to This Privacy Policy

We may periodically update this Privacy Policy to reflect application updates or regulatory standards. Any revisions will be published at `[OWNER_PUBLIC_PRIVACY_URL]` and reflected within the in-app Legal screen. Continued use of the application following an update indicates acceptance of the revised policy.

---

## 11. Contact & Inquiries

For questions regarding this Privacy Policy, feedback on Islamic data handling, or community support, please contact:

**[OWNER_LEGAL_ENTITY_NAME]**
Email: `[OWNER_CONTACT_EMAIL]`
Website / Repository: `[OWNER_PUBLIC_PRIVACY_URL]`
