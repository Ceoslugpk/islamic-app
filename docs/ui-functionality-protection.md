# UI Functionality Protection & Guard Contract

This document outlines the strict boundary separating presentation from business logic in the application. Any visual pass, redesign, or UI polish task MUST conform to these non-negotiable rules.

---

## 1. The UI-Only Boundary

When executing visual passes or redesigns:
- **Never touch data handling or state transitions**:
  - Quran reading position resolvers and bookmarks.
  - Tafsir language loaders and offline caching.
  - Prayer calculation engines, adhan scheduling, audio playback streams.
  - Storage persistence keys (`islamic-settings`, `onboardingDone`, `quran-last-reading`, etc.).
  - Language switching queue, atomic serialized writer, and native RTL reload triggers.
- **Never modify function signatures or event callbacks**:
  - Callback props (`onBack`, `onPress`, `onToggleBookmark`, `onSelectReciter`) must be forwarded unmodified.
  - Never wrap callbacks in async side-effects or debounce logic unless specified in requirements.
- **Never alter testIDs or accessibility labels**:
  - Automation scripts, end-to-end tests, and screen readers rely on exact accessibility contracts.

---

## 2. Protected Business Logic Contracts

The repository enforces 7 core functional anchors through automated tests:

### 2.1 Navigation Route Names & Screen Unions
The typed view-state unions in [`App.tsx`](file:///home/ubuntu/apps/islamic_app/App.tsx) govern all routing:
- `TabKey`: `'home' | 'quran' | 'library' | 'tools'`
- `LibraryView`: `'index' | 'names' | 'duas' | 'hadith' | 'plans' | 'hifz' | 'hifzPractice' | 'topics' | 'compare' | 'bookmarks' | 'notes' | 'fasting' | 'umrah' | 'umrahResources' | 'makkahLive' | 'madinahLive' | 'ramadan' | 'prayerGuide' | 'shahada' | 'downloads' | 'vocab' | 'weeklySummary' | 'tajweed'`
- `QuranView`: `'index' | 'reader' | 'audio'`
- `ToolsView`: `'index' | 'tasbih' | 'qibla' | 'reminders' | 'zakat' | 'calendar' | 'mosque' | 'settings' | 'womenCycle' | 'womenPurity' | 'womenQada' | 'womenGuidance' | 'hajjLive' | 'hajjJourney' | 'legal' | 'backupRestore' | 'cities'`

### 2.2 Storage Keys
The following AsyncStorage and local keys are immutable:
- Settings: `'islamic-settings'`
- Onboarding status: `'onboardingDone'`
- Quran last read: `'quran-last-reading'`
- Quran marker: `'quran-reading-marker'`
- Audio translation: `'audio-translation'`

### 2.3 Language Switch Serialized Writer Queue
Language switching in [`src/lib/settings.tsx`](file:///home/ubuntu/apps/islamic_app/src/lib/settings.tsx) utilizes an atomic serialization queue to prevent race conditions during AsyncStorage writes, native layout direction updates (`I18nManager.forceRTL`), and runtime reloads (`Updates.reloadAsync`).

### 2.4 Quran Reader Bounds & Clamping
In [`src/screens/QuranReaderScreen.tsx`](file:///home/ubuntu/apps/islamic_app/src/screens/QuranReaderScreen.tsx):
- Surah bounds: 1 to 114
- Ayah bounds: 1 to total ayahs for the given surah
- Mushaf page bounds: 1 to 604
- Font scale clamps: minimum and maximum allowed font sizes must not be bypassed by styling changes.

### 2.5 Continue Reading Exact Position Highlighting
- When a user resumes reading, the target ayah is scrolled to with layout-driven measurement and highlighted for exactly 2000ms with Tajweed/Uthmani parity.

---

## 3. Functionality Guard Test Workflow

Before and after any UI modification, execute the functionality guard:

```bash
# Run the dedicated static contract guard
node tests/test_ui_redesign_functionality_guard.mjs
```

The guard statically parses source files to verify:
1. Navigation unions and `isTopLevelScreen` contract.
2. Storage keys existence and consistency.
3. Onboarding screen functional anchors (persistence, RTL prepare, modal triggers).
4. Language-switch serialized writer queue integrity.
5. Quran reader display modes and font range clamps.
6. Continue Reading position resolver, target bounds, and highlight duration.
7. Prayer & audio playback handler contracts.

---

## 4. Release Gates & Verification Checklist

Before considering any UI pass complete, the following gates must be met:
1. **Functionality Guard**: `node tests/test_ui_redesign_functionality_guard.mjs` exits with code 0.
2. **Typecheck**: `NODE_OPTIONS=--max-old-space-size=6144 npx tsc --noEmit` exits with zero errors.
3. **Full Regression Suite**: `npm test` passes all tests.
4. **Git Diff Audit**: `git diff --check` passes with no whitespace errors; inspect diff to confirm only presentational files were altered.
5. **Web Bundle Export**: `npx expo export --platform web` succeeds without bundling errors.
6. **No Build/Release Actions**: Strictly adhere to the rule prohibiting `git commit`, `git push`, EAS build, or version increments during UI redesign passes.
