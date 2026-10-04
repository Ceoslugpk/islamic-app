# Library Screen Enhancements — Research & Recommendations
Researched: 2026-10-04

## 1. Verified Keyless API Sources (curl-tested)

| API | Base URL | Status | CORS | Notes |
|-----|----------|--------|------|-------|
| **islamic.app** (Hadith + Dhikr) | `https://api.islamic.app/v1` | ✅ **200** | ✅ `*` | Primary — 17 collections, 268 adhkar, FTS5 search, random/daily |
| **UmmahAPI** (Hadith + Duas) | `https://ummahapi.com/api` | ✅ **200** | ✅ `*` | 10 collections, 126 duas, simpler structure |
| **HisnMuslim.com** (Adhkar) | `https://www.hisnmuslim.com/api` | ✅ **200** | ✅ browser | Original Hisn al-Muslim source, 132 categories, audio |
| **Quran.com v4** (Quran content) | `https://api.quran.com/api/v4` | ✅ **200** | ✅ `*` | Chapters, verses, translations, audio — **requires key for tafsir/hadith-by-ayah** |
| **Aladhan** (Prayer times/Calendar) | `https://api.aladhan.com/v1` | ✅ **200** (timings) / 302 (calendar) | ✅ `*` | Prayer times solid; calendar redirects (use `islamic.app` or local calc) |
| **fawazahmed0/hadith-api** (static JSON) | GitHub raw / jsDelivr | ❌ 404 (raw) | ✅ `*` | Static files only — good for offline bundling, no search |

> **Verification method**: `curl -I -H "Origin: https://example.com" <endpoint>` — all keyless, CORS `access-control-allow-origin: *` unless noted.

---

## 2. Feature Ideas for Library Screen

### A. Content Sections (Knowledge Expansion)

| # | Idea | Description | Why It Fits | Effort | Priority |
|---|------|-------------|-------------|--------|----------|
| A1 | **Seerah / Prophet's Life** | Chronological biography with sourced events (birth, revelation, hijra, battles, farewell hajj). Powered by hadith search (islamic.app `q=seerah`) + static timeline data. | Natural companion to Hadith Library; high user demand; offline-first with bundled JSON. | M | **P0** |
| A2 | **Tafsir Library** | Curated tafsir collection (Ibn Kathir, Jalalayn, Sa'di, Ma'arif) — browse by surah/ayah, search, bookmark. Quran.com v4 has tafsir metadata (needs key); fallback: bundle public-domain tafsir JSON. | Quran tab has reader/tafsir screen but no *library* browse; completes "Knowledge" pillar. | L | P1 |
| A3 | **Islamic Books & Articles** | Free classical texts (Riyad as-Salihin already in hadith; add: Adab al-Mufrad, Bulugh al-Maram, Minhaj al-Muslim, Fortress of the Muslim). Bundle as searchable offline books. | Extends "Knowledge" group; users expect book library in Islamic apps. | M | P1 |
| A4 | **Prayer Guides (Fiqh)** | Step-by-step guides: wudu, salah (with madhab variants), janazah, eid, istikhara, taraweeh. Illustrated + audio cues. | Practical daily need; fits Dhikr/Worship; low API dependency. | S | P1 |
| A5 | **Ramadan / Eid Guides** | Seasonal hub: fasting rules, laylatul qadr schedule, itikaf guide, zakat al-fitr calc, eid salah, takbirat. Auto-surfaces in Ramadan. | High seasonal engagement; aligns with Calendar group; reusable yearly. | S | **P0** |
| A6 | **Knowledge Quizzes / Flashcards** | Daily 5-question quiz (hadith, Quran, seerah, fiqh, names). Spaced-repetition flashcards for 99 Names, duas, hadith. Progress tracked locally. | Gamifies learning; high retention; offline; uses existing data (names, duas, hadith). | M | P2 |
| A7 | **Daily Reminders / Habits** | Customizable cards: "Morning adhkar ✓", "Quran 1 page", "Salah on time", "Charity". Streaks, weekly review. | Extends Salah Tracker into habit layer; personalization; no API needed. | M | P2 |

---

### B. Dhikr & Worship (Deepen Existing)

| # | Idea | Description | Why It Fits | Effort | Priority |
|---|------|-------------|-------------|--------|----------|
| B1 | **Advanced Tasbih (Custom Sets)** | Create named dhikr sets (e.g. "Post-Salah", "Morning", "Istighfar 100x") with per-item counters, vibration/haptic at targets, session history. | Current Tasbih is single-counter; power users want sets; haptics already in Settings. | M | **P0** |
| B2 | **Adhkar Timers (Scheduled)** | Morning/evening adhkar notifications at configurable times (fajr+20min, maghrib+20min). Pre-load content from islamic.app `/dhikr/morning`, `/dhikr/evening`. | Duas & Adhkar exists but no *reminder*; users forget; uses existing data + local notifications. | M | **P0** |
| B3 | **Istighfar / Dua Tracking** | Counter for "Astaghfirullah" (target 100/day), "SubhanAllah wa bihamdihi" (100), custom dua repetition. Daily reset, weekly stats. | Tasbih + Duas combined; spiritual quantified-self; zero API. | S | P1 |
| B4 | **Quran Memorization (Hifz) Hub** | Track surah/ayah progress, revision schedule (spaced repetition), audio playback loop, teacher mode. **Note: `HifzScreen.tsx` already exists** — integrate into Library as entry point. | Already built; just needs Library visibility; high value for serious users. | S | **P0** |
| B5 | **Hisn al-Muslim Audio Player** | Full audio for each dua (HisnMuslim.com provides MP3 URLs). Playlist: morning, evening, sleep, mosque, travel. Background play, offline cache. | Duas screen has text only; audio transforms usability; keyless audio URLs verified. | M | P1 |

---

### C. Calendar & Events (Extend Hijri Calendar)

| # | Idea | Description | Why It Fits | Effort | Priority |
|---|------|-------------|-------------|--------|----------|
| C1 | **Islamic Year Overview** | Visual year wheel: 12 months with key dates (Ramadan, Dhul Hijjah, Ashura, Mawlid, Isra/Miraj, etc.). Tap month → events list. | Calendar screen exists but no *year view*; educational; offline calc. | S | P1 |
| C2 | **Fasting Planner** | Voluntary fasts calendar: Mondays/Thursdays, White Days (13-15), Arafah, Ashura, 6 of Shawwal, Muharram. Toggle reminders, mark complete. | Fasting screen exists; planner adds *proactive* scheduling; integrates with notifications. | M | P1 |
| C3 | **Prayer-Time Table Export** | Generate PDF/CSV/ICS for month: fajr/sunrise/dhuhr/asr/maghrib/isha + hijri date. Share/print. | Aladhan provides times; export is offline feature users request. | S | P2 |
| C4 | **Hijri Birthday / Age Calculator** | Input Gregorian birthdate → shows hijri birthday, age in hijri years, next milestone. Shareable card. | Fun personal feature; uses existing hijri conversion; no API. | S | P2 |

---

### D. Personal & Progress (User-Centric)

| # | Idea | Description | Why It Fits | Effort | Priority |
|---|------|-------------|-------------|--------|----------|
| D1 | **Reading Goals** | "Read Quran in 30/60/90 days", "Finish Riyad as-Salihin", "Memorize Juz Amma". Daily target, progress ring, streak. | Quran tab has "Continue Reading" but no *goal*; Books/Notes have no tracker. | M | P1 |
| D2 | **Notes & Reflections Hub** | Aggregate: Quran bookmarks/notes, Hadith saves, personal journal entries. Tag, search, export (markdown/PDF). | BookmarksScreen + NotesScreen exist but siloed; unified hub = "my knowledge". | M | P1 |
| D3 | **Favorites Collection** | Cross-content "❤️" — favorite hadith, dua, ayah, name, article. Single "My Favorites" screen with mixed feed. | Users save across features; no unified view; low effort (add `favorite` flag to local stores). | S | **P0** |
| D4 | **Progress Stats Dashboard** | Weekly/monthly: Quran pages read, hadith read, adhkar completed, tasbih count, salah streak, fasts kept. Visual charts. | Settings has "Privacy" but no *insights*; motivates consistency; all data local. | M | P2 |
| D5 | **Custom Library Sections** | User can reorder/hide/show groups (Knowledge, Dhikr, Calendar, Personal). Drag-to-reorder, per-item visibility. | LibraryScreen is the *hub*; personalization respects diverse use cases. | S | P2 |

---

## 3. Top 5 Recommendations (Best Value/Effort for This App)

| Rank | Feature | Justification |
|------|---------|---------------|
| **1** | **Favorites Collection (D3)** | Unifies saves across Quran/Hadith/Duas/Names — the #1 missing "personal" feature. ~2 days: add `isFavorite` to local stores (AsyncStorage/SQLite), one "Favorites" screen, Library entry row. High perceived value, zero API, offline-native. |
| **2** | **Advanced Tasbih / Custom Dhikr Sets (B1)** | Tasbih is single-counter today; users *request* sets (post-salah, morning, istighfar). Reuses haptics + audio infra. ~3 days: data model (sets + items), set builder UI, session persistence. Directly deepens the strongest Dhikr feature. |
| **3** | **Seerah / Prophet's Life (A1)** | Completes "Knowledge" group (currently only Hadith). islamic.app hadith search (`q=seerah`) + bundled timeline JSON = rich content keyless. ~5 days: timeline data, search integration, event detail screen. High educational value, differentiates from basic hadith apps. |
| **4** | **Adhkar Timers / Scheduled Reminders (B2)** | Duas & Adhkar has content but no *trigger*. Local notifications + islamic.app `/dhikr/morning|evening` = instant win. ~3 days: notification scheduling, time prefs, content preload. Solves "I forget my adhkar" — core user pain point. |
| **5** | **Hifz Hub Entry Point (B4)** | `HifzScreen.tsx` already built but buried. Add Library row → Hifz, plus quick-actions (today's revision, add surah). ~1 day wiring. Leverages existing code; serves serious users; no new dev. |

---

## 4. Implementation Notes (for the team)

- **Offline-first**: All P0/P1 features work with bundled JSON + local storage. APIs (islamic.app, UmmahAPI) are for *enrichment* (search, random, daily) — never blocking.
- **Data model**: Extend existing `LibraryItemKey` + `GROUPS` in `LibraryScreen.tsx` — add `Personal` group for Favorites, Hifz, Goals, Stats.
- **Theming**: New screens inherit `useTheme()` — zero extra work if tokens used (per `theming-research.md`).
- **Notifications**: Use `expo-notifications` (already in project for Salah). Schedule at `fajr+20min` / `maghrib+20min` using Aladhan times (cached).
- **Audio**: HisnMuslim.com MP3s are direct URLs — cache with `expo-file-system` for offline play.
- **PDF/ICS export**: `expo-print` + `expo-sharing` for prayer tables; `ics` generator for calendar events.

---

## 5. API Verification Summary

| Endpoint | HTTP | Keyless | CORS | Use Case |
|----------|------|---------|------|----------|
| `https://api.islamic.app/v1/hadith/collections` | 200 | ✅ | ✅ | Hadith Library (existing) |
| `https://api.islamic.app/v1/dhikr` | 200 | ✅ | ✅ | Duas & Adhkar (existing) |
| `https://api.islamic.app/v1/hadith/search?q=seerah` | 200 | ✅ | ✅ | Seerah content (A1) |
| `https://api.islamic.app/v1/hadith/today` | 200 | ✅ | ✅ | Daily hadith widget |
| `https://api.islamic.app/v1/dhikr/morning` | 200 | ✅ | ✅ | Adhkar timers (B2) |
| `https://api.islamic.app/v1/dhikr/evening` | 200 | ✅ | ✅ | Adhkar timers (B2) |
| `https://ummahapi.com/api/hadith/collections` | 200 | ✅ | ✅ | Backup hadith source |
| `https://www.hisnmuslim.com/api/en/husn_en.json` | 200 | ✅ | ✅ | Dua audio URLs (B5) |
| `https://api.quran.com/api/v4/chapters` | 200 | ✅ | ✅ | Quran metadata (A2 fallback) |
| `https://api.aladhan.com/v1/timingsByCity?city=Mecca&country=Saudi%20Arabia&method=4` | 302 | ✅ | ✅ | Prayer times (C3) — use cached |

> **Needs verification**: Sunnah.com official API (requires key, manual approval), Quran.com tafsir endpoints (require key), IslamicFinder (no public API found).

---

## 6. Suggested LibraryScreen Group Structure (After Enhancements)

```
Knowledge
├── Hadith Library          (existing)
├── Seerah / Prophet's Life (NEW — A1)
├── Tafsir Library          (NEW — A2)
├── Islamic Books           (NEW — A3)

Dhikr & Worship
├── Duas & Adhkar           (existing)
├── Tasbih                  (existing → enhanced B1)
├── Adhkar Reminders        (NEW — B2)
├── 99 Names of Allah       (existing)
├── 99 Names of the Prophet (existing)
├── Hifz / Memorization     (NEW entry — B4)

Calendar & Time
├── Hijri Calendar          (existing)
├── Islamic Year Overview   (NEW — C1)
├── Fasting Planner         (NEW — C2)
├── Prayer Time Export      (NEW — C3)

Personal
├── Favorites               (NEW — D3) ⭐ P0
├── Reading Goals           (NEW — D1)
├── Notes & Reflections     (NEW — D2)
├── Progress Stats          (NEW — D4)
```

---

*End of document. Ready for team review → prioritize P0s for next sprint.*