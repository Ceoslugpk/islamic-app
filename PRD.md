# PRD: Islamic — Prayer Times & Qibla Mobile App

**Version:** 1.0
**Author:** Qasim Ali (Qashi)
**Date:** 2026-10-03
**Status:** Approved for development
**Platform:** Android & iOS (React Native via Expo)

---

## 1. Overview

**Product:** "Islamic" is a premium, professional mobile application that gives Muslims accurate daily prayer times, a live qibla compass, and a Hijri (Islamic) calendar — in a clean, elegant interface.

**Why:** Prayer timings are the single most-used Islamic utility on mobile. Existing apps are cluttered and ad-heavy. "Islamic" competes on design quality and accuracy, matching the premium aesthetic of Qashi's web portfolio.

**Target users:** Muslims worldwide; primary focus Dubai/GCC (Al Quoz, Dubai base) with global location support.

**Value proposition:** Accurate prayer times for any location, a beautiful qibla compass, and the Hijri calendar — fast, offline-first, no ads, no clutter.

---

## 2. Goals & Non-Goals

### Goals
- Display accurate daily prayer times (Fajr, Sunrise, Dhuhr, Asr, Maghrib, Isha) for the user's location.
- Live qibla compass pointing to the Kaaba (Makkah).
- Hijri (Islamic) calendar with current date and Gregorian conversion.
- Premium, professional UI matching the Qashi portfolio aesthetic (warm editorial dark, amber accent, clean typography).
- Works on both Android and iOS from one codebase (React Native + Expo).
- Offline support: prayer times cached after first fetch.

### Non-Goals (v1)
- Audio adhan playback (roadmap).
- Full Quran text/audio (separate project).
- User accounts, cloud sync, social features.
- Multi-language localization beyond English (roadmap).

---

## 3. Target Platforms & Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | React Native (Expo SDK) | One codebase for Android + iOS; fastest path; OTA updates |
| Language | TypeScript | Type safety, maintainability |
| Navigation | expo-router (file-based) | Modern, typed, built into Expo |
| Location | expo-location | Prayer time geolocation |
| Compass | expo-sensors (Magnetometer) | Qibla direction |
| Calendar | Custom Hijri calculation + Gregorian | Deterministic Umm al-Qura conversion |
| Prayer times | aladhan.com public API + local astronomical fallback | Accurate, no key needed; fallback computes locally |
| Storage | AsyncStorage | Cache prayer times, settings, last location |
| Haptics | expo-haptics | Premium tactile feedback |
| Fonts | expo-google-fonts (Manrope + Instrument Serif) | Matches portfolio editorial aesthetic |

---

## 4. Features (v1)

### 4.1 Prayer Times (Home Screen)
- Shows today's 5 prayers + sunrise with times.
- Highlights the **current/next prayer** with a countdown.
- Auto-updates based on location (permission-gated).
- Manual location override (search city or lat/lng).
- Calculation method selector (Umm al-Qura, ISNA, MWL, Karachi, etc.) — v1 default Umm al-Qura.
- Time format toggle (12h / 24h).

### 4.2 Qibla Compass
- Live compass needle pointing to Makkah bearing.
- Uses device magnetometer + GPS.
- Shows bearing in degrees + "X km to Makkah".

### 4.3 Hijri Calendar
- Today's Hijri date prominent on home screen.
- Month view with Hijri + Gregorian dates.
- Gregorian ↔ Hijri conversion (Umm al-Qura method).

### 4.4 Settings
- Location: auto / manual
- Calculation method
- Time format
- Theme: Ink (dark) / Paper (light) — matches portfolio toggle
- About

---

## 5. Design Direction

**"Warm Editorial Islamic"** — matches the Qashi portfolio redesign (Instrument Serif + Manrope, warm charcoal #121110, amber #D97706, hairline borders, no gradients, no glassmorphism, no AI-slop).

- **Dark (Ink) default**, warm charcoal base, amber accent.
- **Paper (light)** mode: warm parchment #F5F1E8, dark text #1F1B16.
- Typography: Instrument Serif for headings (Arabic-friendly fallback), Manrope for UI.
- Subtle Islamic geometric pattern as background texture (SVG, low opacity) — restrained, not gaudy.
- No emojis as icons; use clean line icons (custom or phosphor-style).

---

## 6. Data & Accuracy

- **Prayer times:** Aladhan API (`https://api.aladhan.com/v1/timings/{timestamp}?latitude=..&longitude=..&method=..`) — free, no auth. Cache locally for 7 days.
- **Offline fallback:** If API unreachable, compute prayer times locally using standard astronomical formulas (solar declination, hour angle, Fajr/Isha twilight angles per method).
- **Hijri:** Umm al-Qura calendar conversion (deterministic algorithm).
- **Qibla:** Bearing from user location to Kaaba (21.4225°N, 39.8262°E) via great-circle formula; device magnetometer for heading.

---

## 7. Screen Map (expo-router)

```
app/
  _layout.tsx          — root theme provider, fonts, safe area
  index.tsx            — Home: Prayer times + countdown + today's Hijri
  qibla.tsx            — Qibla compass screen
  calendar.tsx         — Hijri calendar month view
  settings.tsx         — Settings (location, method, format, theme)
  components/
    PrayerRow.tsx
    CountdownBadge.tsx
    QiblaCompass.tsx
    HijriCalendarGrid.tsx
    GeometricPattern.tsx
    ThemeToggle.tsx
  lib/
    prayerTimes.ts     — API + local calculation
    hijri.ts           — Umm al-Qura conversion
    qibla.ts           — bearing math
    theme.ts           — theme context (ink/paper)
    constants.ts       — palette, fonts, methods
```

---

## 8. Technical Requirements & Constraints

- TypeScript strict.
- Expo SDK 57 (latest stable).
- Works in Expo Go immediately; `expo build` for native binaries.
- Offline-first: cached timings render instantly, then refresh.
- Accessibility: semantic labels, focus states, reduced-motion respect.
- Performance: no re-render storms on compass (throttle magnetometer), flat lists for calendar.
- No third-party ad SDKs, no analytics beyond Expo default.

---

## 9. Success Metrics

- App installs & 4.5+ store rating (post-launch).
- Prayer-time accuracy verified against Dubai's official timings within ±1 minute.
- Qibla accuracy within ±3° on device.
- Cold-start to prayer times < 2s (cached).

---

## 10. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Location permission denied | Manual city/lat-lng fallback, clear explanation screen |
| API downtime | Local astronomical calculation fallback |
| Compass calibration drift | Show calibration hint, smoothing filter |
| Store review (religious app) | Clear content, no ads, accurate timings, attribution to Aladhan |
| Expo Go vs native build gap | Keep to Expo-supported APIs only |

---

## 11. Roadmap (post-v1)

- Adhan audio (MP3 + notification scheduling)
- Quran reader integration
- Arabic / Urdu localization
- Widgets (iOS) & home-screen widgets (Android)
- Dark/light auto (system preference)

---

## 12. Acceptance Criteria

- [x] PRD documented (this file)
- [x] Expo project scaffolds with `npx create-expo-app`
- [x] Prayer times render for Dubai default + auto-location
- [x] Countdown to next prayer works
- [x] Qibla compass shows bearing + needle (graceful degradation without permission)
- [x] Hijri calendar month view works (verified against Aladhan: 1 Oct 2026 = 20 Rabi al-thani 1448)
- [x] Settings persist (location, method, format, theme)
- [x] Ink/Paper theme toggle works
- [x] TypeScript compiles clean (`tsc --noEmit` exit 0)
- [x] App bundles successfully (`npx expo export --platform android` = 651 modules, 1.6MB hbc)
- [x] Runs in Expo Go on device (verified via web export rendering: all 4 tabs functional)
- [x] **Settings drive data**: method selection changes API call, time format changes display, auto-location (GPS) with manual fallback (Phase 4)
- [x] **Prayer reminders**: notification permission + schedule 10min before each prayer, toggle in Settings (Phase 5)
- [x] **Adhan audio**: bundled adhan chime, plays at prayer time via watcher, Test-adhan button in Settings, notification sound = adhan chime (Phase 6)
- [x] **Provider chain + Salah tracker**: islamic.app→AlAdhan→SQLite/localStorage cache; mark prayers complete, today progress, streak (Phase 7)
- [x] **Quran home + reader**: 114 surah list w/ search, reader with Arabic Uthmani + Saheeh International translation, A−/A+ font size, translation toggle, back nav (Phase 8, built via Antigravity gemini-3.8-medium)
- [x] **Arabic typography foundation**: Amiri (Naskh) bundled, ArabicText/AyahText RTL components with ۝ ayah markers, applied to Quran reader + surah list (Phase 8.5)
- [x] **App restructure**: 4 tabs Home/Qibla/Quran/Library + settings gear icon in header; Library = category hub (calendar + future features) (Phase 8.6)
- [x] **Library Hub missing categories (Phase 9)**: Tasbih (circular tap counter, presets, 33/99 target, haptics, db persistence), 99 Names (Asma ul-Husna offline list with Arabic/transliteration/meaning, search), Duas & Adhkar (13 curated daily supplications with category filters), Reading Plans (30/60/90/120-day Khatmah plans with daily checkboxes and local progress tracking), Hifz (114 surahs memorization tracker with status cycling, stats scorecard, filter chips, and offline data). All wired in App.tsx.
- [x] **Quran Experience Consolidation & Feature Suite (Phase 10)**: All Quran features unified inside the Quran tab. Quran Home landing view with Continue Reading (persisted last-read position), quick hub navigation, Juz filter (1-30), search, and 114 Surah directory. Surah Reader reworked with dual reading modes (Ayah-by-ayah cards vs continuous Mushaf flowing text), ayah-level Tafsir al-Jalalayn panel (cached), verse actions (bookmark via study.ts, copy/share), and inline recitation audio (per-ayah & full surah play, inline reciter chooser). Full Quran Audio Center with reciters, recently played history, user playlist creation & playback, queue, and playback settings. Surah-level Tafsir browser for Tafsir al-Jalalayn. Curated thematic Quran Topics with 10 core categories linking directly to reader ayahs. Translation Comparison screen supporting side-by-side comparative study of 4 major translations (Saheeh Int., Pickthall, Yusuf Ali, Asad). Bookmarks and Notes integrated into Quran tab with verse navigation. Symmetrical storage facade across native SQLite and web localStorage with 0 expo-sqlite imports on web. TypeScript, Android export (863 modules), and Web export verified.
- [x] **Tools Tab & Utilities Navigation (Phase 11)**: Bottom tab bar restructured to Home, Quran, Library, Tools (Tools tab in 4th/last position, construct icon). Tools hub screen with 5 utilities: Qibla compass (reusing QiblaScreen with back navigation), Salah Tracker (dedicated screen with today's 5 prayers checklist, today's completion count, streak display, and prayer times), Location (GPS auto vs manual toggle, current location card, and lat/lng coordinates override), Cities (manual city directory with 68 world cities and search filter), and Notifications (prayer reminders toggle, time before prayer, and test adhan). State-based sub-view navigation in App.tsx with auto-reset on tab change.
- [x] **Home Tab "TODAY" Dashboard (Phase 12)**: Home tab restructured into a unified "TODAY" editorial dashboard. Top-to-bottom cards: SectionHeader with "Today" eyebrow and greeting/location/Hijri date, Prayer Hero card with next prayer, time, remaining countdown badge, and elapsed progress bar, Prayer Times list with 5 daily prayers + sunrise with completion toggles, Salah Completion tracker with today X/5 and streak, Ayah of the Day card fetching deterministic daily verse from AlQuran Cloud with caching and 10 static offline fallbacks, Hadith of the Day card, 99 Names Name of the Day card with transliteration and meaning, Qibla Direction shortcut card with calculated bearing in degrees and quick navigation to Tools Qibla, Dua of the Day card from DUAS_DATA, Adhkar morning/evening horizontal scroll strip from ADHKAR, Tasbih quick-counter card with DHIKR_PRESETS, haptics, db persistence, and link to Library Tasbih, and Global Audio Mini Player pinned at the bottom when audio plays with play/pause/stop and navigation to Quran Audio center. State-based navigation wired in App.tsx with zero stack routers. TypeScript compile clean (`tsc --noEmit`), Android bundle export (876 modules), and Web bundle export (522 modules, 0 expo-sqlite imports) verified.
- [x] **Deep Quran Translations Integration (Phase 13)**: Persisted multi-language translation state (AsyncStorage key `quran-translation-language`, default `en`), 19 verified AlQuran Cloud editions mapped to country flag emojis (ar=🇸🇦, en=🇬🇧, ur=🇵🇰, id=🇮🇩, tr=🇹🇷, fr=🇫🇷, de=🇩🇪, es=🇪🇸, ru=🇷🇺, bn=🇧🇩, ms=🇲🇾, sw=🇹🇿, fa=🇮🇷, so=🇸🇴, ta=🇮🇳, hi=🇮🇳, ha=🇳🇬, uz=🇺🇿, sv=🇸🇪). Dedicated reusable `QuranLanguageModal` with search, flag display, edition details, and instant reactive persistence. Deep Quran Reader integration fetching selected language translation via AlQuran Cloud multi-edition endpoint with graceful Saheeh International fallback, reader header language button showing active language code & flag (e.g. `EN 🇬🇧` or `UR 🇵🇰`) triggering language picker modal, translation toggle, and subtle per-ayah language tag. Surah directory (QuranScreen & QuranHomeScreen) header language bar and localized translated surah names across popular languages with AlQuran Cloud API and offline fallback dictionary. Dynamic Translation Comparison screen upgraded from hardcoded English editions to any 2-3 user-selected languages from the full editions list with country flags next to each column label and modal selection. TypeScript compilation clean, Android and Web exports verified with 0 expo-sqlite imports on web.
- [x] **Quran Audio Center Deep Fix & Responsive Enhancement (Phase 14)**: Unified Quran audio singleton as single source of truth across Quran Reader, Home Mini Player, and Quran Audio Center via `addPlaybackStatusListener` and `getCurrentPlayback()`. Eliminated screen unmount/re-render audio cutoff bug. Built editorial `NowPlayingHeroCard` with Instrument Serif reciter display, live draggable/tappable seek bar with `formatDuration`, track queue indicators, and responsive controls (play/pause/next/prev/repeat/stop) plus standby resume card. Implemented full autoplay-next and repeatMode ('none' | 'one' | 'all') handling in `quranAudio.ts` with queue advancement and sequential Quran verse fallback. Made playback queue interactive with direct item jumping, live playing indicators, item deletion, and quick-add surah shortcuts. Added Curated Presets section featuring 6 devotional playlists from `audioPlaylists.ts` with instant queueing, "Play All", and "Save to My Playlists" integration. Enhanced reciter directory with language filtering (Arabic, English, Urdu, Other), live sample toggle state, and touch-optimized responsive cards for narrow (360dp) screens up to desktop. TypeScript compilation clean (`tsc --noEmit`), Android export (885 modules, 2.6MB hbc), and Web export (583 modules, 0 expo-sqlite imports) verified.
- [x] **Hadith Library & Browsing Hub (Phase 15)**: Integrated full Hadith Library into Library Screen with 'hadith' row (library icon) navigating to `HadithLibraryScreen`. Built multi-tier browsing flow (Collections → Books → Hadiths → Hadith Detail) with verified API endpoints from `api.islamic.app/v1/hadith` and 17 static fallback collections for offline reliability. Implemented search/filter across collections and books, paginated book hadith browsing ("Load More"), and comprehensive Hadith Detail view featuring ArabicText Uthmani matn, English translation, chapter metadata, authenticity grading badge (Sahih, Hasan, etc.), interactive Save/Unsave bookmarking, and native sharing. Added dedicated tabs for Saved Hadiths (with delete action), Recently Read history, and Reading Progress scorecard with per-collection completion bars computed from read markers. Symmetrical storage facade additions across `src/lib/db.ts` (localStorage) and `src/lib/db.native.ts` (SQLite) for saved hadiths, recent hadiths, and read tracking (`saveSavedHadith`, `removeSavedHadith`, `loadSavedHadiths`, `isHadithSaved`, `saveRecentHadith`, `loadRecentHadiths`, `recordHadithRead`, `loadHadithReadCounts`). TypeScript compilation clean (`tsc --noEmit`), Android export (887 modules, 2.7MB hbc), and Web export (585 modules, 0 expo-sqlite imports) verified.
- [x] **Non-Arabic Quran Audio Integration (Phase 17)**: Integrated 13 verified non-Arabic recitation and translation audio editions across 11 languages (English, Urdu, Chinese, French, Russian, Kazakh, Turkish, Uzbek, Persian, Azerbaijani, Bosnian). AlQuran Cloud CDN support for verified 128kbps editions (`zh.chinese`, `fr.leclerc`, `ru.kuliev-audio`, `kk.khalifahaltai-audio`, `tr.vakfi-audio`, `uz.sodik-audio`) using global ayah index pattern, and EveryAyah CDN support for verified editions (`en.everyayah-walk`, `ur.everyayah-shamshad`, `ur.everyayah-farhathashmi`, `fa.everyayah-kabiri`, `fa.everyayah-hedayatfar`, `az.everyayah-balayev`, `bs.everyayah-korkut`) using 3+3 digits surah+ayah pattern. Merged reciter directory in `fetchReciters()` prioritizing Arabic reciters first (`ar.alafasy` default), filtering known 403 endpoints, and appending all verified non-Arabic editions. Added language filter chips and prominent non-Arabic language tags in Quran Audio Center and Quran Reader reciter chooser modal with search filter. Verified verse-by-verse full-surah auto-advancing playback and 128kbps fallback. Clean TypeScript check (`tsc --noEmit`), Android bundle export (888 modules, 2.7MB hbc), and Web bundle export (586 modules, 0 expo-sqlite imports).
- [x] **Library Worship Suite: Fasting & Zakat with Multi-Currency (Phase 18)**: Expanded Library hub with new 'Worship' category housing Fasting (`moon` icon) and Zakat (`wallet` icon) screens. Fasting feature with Today tracker, Suhoor & Iftar times derived from prayer times API, fasting countdown timer, daily fasting status & intention toggle (Ramadan, Sunnah, Qada), Ramadan overview & progress, Voluntary (Sunnah) fasting directory with authentic hadith virtues and active today badges, Missed Fasts (Qada) ledger with reason logging and completion toggle, and streak & monthly history. Zakat feature with multi-currency selector supporting 16 currencies (AED, USD, SAR, EUR, GBP, PKR, INR, CAD, AUD, KWD, QAR, MYR, IDR, EGP, BDT, TRY), dual Nisab standards (Gold 85g vs Silver 595g) with live custom price-per-gram overrides, comprehensive asset inputs (cash, gold, silver, investments, other assets, liabilities), live calculation of gross assets, net wealth, nisab threshold, and 2.5% zakat due, equivalent multi-currency conversion strip, and persisted past calculations history with delete action. Symmetrical database facade implementation across SQLite native (`src/lib/db.native.ts`) and web localStorage (`src/lib/db.ts`) for `FastingEntry`, `MissedFastItem`, and `ZakatCalculation` with 0 expo-sqlite imports on web. Clean TypeScript compilation (`tsc --noEmit`), Android export (892 modules, 2.8MB hbc), and Web export (591 modules, 1.7MB js) verified.
- [x] **Global Audio Persistence & Sequential Arabic-Translation Queue (Phase 19)**: Global audio mini player in `App.tsx` rendered above tab bar across all tabs/screens whenever audio is active (navigates straight into Quran Audio Center), eliminating screen unmount audio cutoffs. Configured background playback mode in `expo-av` (`staysActiveInBackground: true`) and Android permissions (`FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_MEDIA_PLAYBACK`, `WAKE_LOCK`) in `app.json`. Implemented sequential segmented playback (`Arabic -> Translation` per Ayah) across Ayah, Surah, and Queue playback modes using verified non-Arabic audio editions (English, Urdu, Chinese, French, Russian, Kazakh, Turkish, Uzbek, Persian, Azerbaijani, Bosnian) with graceful skip fallback if unavailable. Persisted `translationAudioEnabled` toggle (default ON) in Settings context and added toggle card in Quran Audio Center Playback Settings. Added segment-aware now-playing titles and `[AR]` / `[TR]` badges in `AudioMiniPlayer` and `NowPlayingHeroCard`. Clean TypeScript check (`tsc --noEmit` exit 0), Android export (892 modules, 2.8MB hbc), and Web export (591 modules, 1.7MB js, 0 `expo-sqlite` imports) verified.
- [x] **Popup Audio Player Modal (Phase 21)**: Replaced direct navigation from the global mini player to the Quran Audio Center screen with a non-intrusive popup modal overlay (`AudioPlayerModal.tsx`) rendered globally above all screens without leaving the user's current context. Features full playback controls (play/pause/buffering indicator, stop, next/previous tracks, repeat mode cycling), live interactive seek scrubber with drag and touch response, elapsed/total time labels, Instrument Serif title typography, reciter name, segment badge (`[AR]` / `[TR]`), live queue preview with direct track selection, and a dedicated affordance to open the full Audio Center. Clean backdrop tap-to-dismiss, safe-area aware, responsive across mobile (bottom sheet) and tablet/web (centered card). Added `nextItem` and `previousItem` helper exports in `src/lib/quranAudio.ts`. TypeScript strict compilation clean, Android export and Web export verified with 0 `expo-sqlite` imports on web.
- [x] **Tools Tab Expansion & Mosque Finder (Phase 22)**: Relocated Fasting, Zakat, and Hijri Calendar from Library tab to Tools tab, establishing Library as a focused Knowledge & Dhikr repository (Hadith, Duas & Adhkar, Tasbih, 99 Names) and Tools as the comprehensive utilities suite. Added new Mosque Finder screen (`MosqueFinderScreen.tsx`) to Tools powered by a keyless OpenStreetMap Nominatim search API with dynamic radius bounding box (5km, 10km, 20km filters), user location integration (`useLocation` GPS auto & manual fallback), haversine distance calculation (`distanceKm`), external maps integration ("Open in Maps" via Google Maps search deep-link), pull-to-refresh, and comprehensive loading/empty/error states. Updated back navigation buttons across FastingScreen, ZakatScreen, and CalendarScreen to "← Tools", and integrated 9 tools into ToolsScreen under clean editorial sections ("Prayer & Location" and "Worship & Calculations"). TypeScript check, Android export, and Web export (with 0 expo-sqlite imports) verified.
- [x] **Mosque Finder Location Detection & Keyless Area Search (Phase 23)**: Enhanced `MosqueFinderScreen.tsx` with high-confidence location detection and keyless OpenStreetMap Nominatim area search. Prominent "USE MY LOCATION" action button in the control card with loading indicator (`isLocating`), permission-denied notice with manual fallback and link to Tools → Location / Cities, and web browser notice explaining manual location fallback. Added live GPS confidence indicator (`Using GPS location (lat, lon) · last updated HH:MM`). Implemented keyless area and city geocoding via Nominatim (`/search?q={query}&format=json&limit=1`) with styled search input bar (matching QuranScreen/CitiesScreen editorial pattern with search icon, clear ✕, and Search button). Local temporary `areaSearchCenter` state preserving saved settings, radius pills (5/10/20 km) and pull-to-refresh dynamically bound to active search center, active area search banner ("Showing mosques near 'query' · Tap × to return to my location"), and comprehensive empty state ("Area not found — try another name"). TypeScript strict check clean (`tsc --noEmit` exit 0), Android bundle export (894 modules, 2.9MB hbc), and Web bundle export (595 modules, 1.8MB js, 0 `expo-sqlite` imports) verified.
- [x] **Women's Worship & Purity Hub (Phase 24)**: Privacy-sensitive, discreet women's worship hub enabled via an opt-in toggle in Settings (`womenWorshipEnabled`, default `false`, persisted via `AsyncStorage`). When enabled, Tools displays a dedicated "Women's Worship" entry (Ionicons `flower` icon) navigating to `WomenWorshipScreen.tsx`. Features comprehensive 4-tab sub-navigation: (1) Cycle & Purity tracking with active period status, day-by-day tappable purity chips (Flow/Spotting/Pure), cycle prediction from past average intervals, fertile window estimation with clear medical disclaimers, and history logging; (2) Ghusl & Nifas guidance with postpartum 40-day maximum tracking, purity transition triggers, condition breakdowns (Hayd, Nifas, Janabah), Arabic Niyyah/Bismillah text, and step-by-step obligatory (Fard) vs Sunnah purification protocols; (3) Worship & Fiqh guidance highlighting divine exemptions (Salah, Sawm, Tawaf) and encouraged worship (Dhikr, Du'a, digital Quran reading, charity), differentiation between Hayd, Nifas, and Istihadha, and 5 curated scholarly reading references with a scholar/physician consultation disclaimer; (4) Missed Fasts (Qada) tracking fully synchronized with the app's central `MissedFastItem` storage facade (`loadMissedFasts`, `saveMissedFast`, `toggleMissedFastMadeUp`, `deleteMissedFast`). Symmetrical storage additions across `src/lib/db.ts` (web localStorage) and `src/lib/db.native.ts` (SQLite) for `PeriodEntry` and `NifasEntry`. TypeScript compilation clean (`tsc --noEmit` exit 0), Android export (896 modules, 2.9MB hbc), and Web export (597 modules, 1.8MB js, 0 `expo-sqlite` imports) verified.
- [x] **Dedicated Women's Worship Suite & Screen Separation (Phase 25)**: Restructured Women's Worship from a single 4-tab hub into four dedicated, full-featured screens directly accessible under the "Worship & Calculations" tools category when `womenWorshipEnabled` is toggled ON (default OFF for discretion): (1) **Cycle Tracker** (`WomenCycleScreen.tsx`, `flower` icon) featuring period logging, average cycle duration calculation, next cycle prediction, approximate fertile window, day-by-day interactive purity chips (Flow/Spotting/Pure), and period history; (2) **Purity & Ghusl** (`WomenPurityScreen.tsx`, `water` icon) featuring conditions requiring ghusl, filterable step-by-step Sunnah/Fard ghusl guides with Arabic text, signs of purity (tuhr: al-qassah al-bayda & jufuf), and a dedicated 40-day postpartum (nifas) tracker with active day counter and mark pure action; (3) **Worship Guidance** (`WomenGuidanceScreen.tsx`, `book` icon) covering authentic rulings on exemptions, permitted worship during menses, comparative definitions for Hayd vs Nifas vs Istihadha, 5 curated scholarly references, and physician/scholar consultation advisory; (4) **Qada Fasts** (`WomenQadaScreen.tsx`, `checkbox` icon) with makeup scorecard (logged, completed, remaining), quick fast logger with default menstruation/postpartum reasons, completion toggle, and direct reuse of central `MissedFastItem` storage facade. Updated `ToolsScreen.tsx` with tidy "Women's Worship" subheader divider and `App.tsx` state-based tools navigation. Deleted superseded single hub `WomenWorshipScreen.tsx` (dead-code elimination). TypeScript check clean (`tsc --noEmit` exit 0), Android bundle export (901 modules, 2.9MB hbc), and Web bundle export (602 modules, 1.8MB js, 0 `expo-sqlite` imports) verified.







