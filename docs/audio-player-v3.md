# Audio Player v3 — Build Reference

## A. Current audio code (exports, status flow, hook points)

### 1. `src/lib/quranAudio.ts` — Exported functions & interfaces

**Interfaces**
```typescript
// Line 13-20
export interface PlaybackStatus {
  isPlaying: boolean;
  positionMillis: number;
  durationMillis: number;
  isLoaded: boolean;
  isBuffering: boolean;
  didJustFinish: boolean;
}

// Line 369-378
export interface CurrentPlayback {
  identifier: string;
  reciterName: string;
  title: string;
  url: string;
  isPlaying: boolean;
  type?: 'ayah' | 'surah';
  surah?: number;
  ayah?: number;
}
```

**Exported functions (key ones)**
| Function | Line | Purpose |
|---|---|---|
| `fetchReciters()` | 266 | Fetches from AlQuran Cloud API + merges `VERIFIED_NON_ARABIC_EDITIONS` |
| `getGlobalAyahNumber(surah, ayah)` | 238 | Converts 1-based (surah, ayah) → global 1..6236 |
| `isVerseByVerseEdition(identifier)` | 248 | Returns true for all non-Arabic editions (EveryAyah + AlQuran versebyverse) |
| `getAyahAudioUrl(identifier, surah, ayah)` | 339 | Builds URL: EveryAyah uses `{surah3}{ayah3}.mp3`; AlQuran Cloud uses global ayah + bitrate |
| `getSurahAudioUrl(identifier, surah)` | 357 | Full surah URL; for verse-by-verse returns first ayah URL |
| `playAyah(identifier, url?, title?, reciterName?, surah?, ayah?)` | 777 | Sets `currentPlayback` with title resolved from URL regex; calls `playAudioUrl` |
| `playSurah(identifier, url?, title?, reciterName?, surah?)` | 857 | For verse-by-verse editions, plays ayah 1 with `autoplayNext` to chain |
| `playNext()` | 968 | Advances queue or sequential Quran (next ayah/surah) |
| `playPrevious()` | 1039 | Previous track or rewind |
| `pause()` / `resume()` / `stop()` / `unload()` | 1126+ | Playback controls |
| `addPlaybackStatusListener(listener)` | 582 | Subscribes to rich `PlaybackStatus` updates (immediate callback) |
| `addPlaybackListener(listener)` | 574 | Legacy boolean `isPlaying` subscription |

**URL construction & 128kbps fallback**
- `getAyahAudioUrl` (line 339-351): Resolves aliases via `ALIAS_MAP`. For EveryAyah editions (`EVERYAYAH_EDITIONS`): `https://everyayah.com/data/{subfolder}/{surah3}{ayah3}.mp3`. For others: `https://cdn.islamic.network/quran/audio/{bitrate}/{identifier}/{globalAyah}.mp3` where `bitrate = KNOWN_BITRATES[resolved] || '128'`.
- `playAudioUrl` (line 695-773): On load failure, if URL doesn't contain `/128/`, replaces bitrate segment with `/128/` and retries (lines 745-761).

**Status tracking in `handlePlaybackStatusUpdate` (line 630-693)**
```typescript
const newStatus: PlaybackStatus = {
  isPlaying: status.isPlaying,
  positionMillis: status.positionMillis ?? 0,
  durationMillis: status.durationMillis ?? 0,
  isLoaded: true,
  isBuffering: status.isBuffering ?? false,
  didJustFinish: status.didJustFinish ?? false,
};
```
When `status.didJustFinish` is true (line 665):
- `repeatMode === 'one'` → replay same URL
- `repeatMode === 'all' || autoplayNext` → calls `playNext()` (line 673)
- Otherwise stops playback

**`playAyah` / `playSurah` title resolution from URL regex (lines 796-812, 881-887)**
```typescript
// CDN pattern (global ayah number)
const match = playbackUrl.match(/\/audio\/\d+\/[^\/]+\/(\d+)\.mp3/);
// EveryAyah pattern (surah3+ayah3)
const everyAyahMatch = playbackUrl.match(/\/(\d{3})(\d{3})\.mp3$/);
```

**`SURAH_AYAH_COUNTS` (lines 32-45)** — Array of 114 integers for global ayah computation.

**`KNOWN_BITRATES` (lines 205-223)** — Maps edition identifier → bitrate string (e.g., `'ar.alafasy': '128'`, `'en.everyayah-walk': '192'`, `'fa.everyayah-kabiri': '16'`).

**`KNOWN_RECITER_NAMES` (lines 506-533)** — Maps identifier → display name (e.g., `'en.everyayah-walk': 'Sahih International (Ibrahim Walk)'`).

**Hook point for "next segment" (Arabic → Translation chaining)**
In `handlePlaybackStatusUpdate` at **line 665-683**, when `status.didJustFinish` fires and `autoplayNext`/`repeatMode` is active, `playNext()` is called. This is the **exact location** to inject a chaining hook: after an Arabic ayah finishes, queue the corresponding translation ayah before `playNext()` advances to the next Arabic ayah.

---

### 2. `src/lib/quranLanguages.ts` + `src/lib/quranLanguageState.ts` — Language editions & state

**`QURAN_LANGUAGE_EDITIONS` (lines 31-51)** — 20 text translation editions:
```typescript
export interface QuranLanguageEdition {
  language: string;        // e.g., "English"
  languageCode: string;    // e.g., "en"
  editionIdentifier: string; // e.g., "en.sahih"
  name: string;            // e.g., "Saheeh International"
  flag: string;            // e.g., "🇬🇧"
}
```
Full list: ar, en, ur, id, tr, fr, de, es, ru, bn, ms, sw, fa, so, ta, hi, ha, uz, sv (20 languages).

**State management (`quranLanguageState.ts`)**
| Function | Line | Purpose |
|---|---|---|
| `getQuranTranslationLanguage()` | 26 | Returns current language code (default `'en'`) |
| `setQuranTranslationLanguage(langCode)` | 30 | Validates against editions, updates `currentLanguage`, notifies listeners, persists to AsyncStorage key `'quran-translation-language'` |
| `subscribeQuranLanguage(listener)` | 42 | Subscription pattern for reactive updates |
| `useQuranLanguage()` | 49 | React hook returning `{ language, setLanguage, edition, flag }` |

---

### 3. `src/lib/quranMultiLang.ts` — Translation fetching

```typescript
// Line 3-9
export interface TranslationAyah {
  number: number;
  surah: number;
  ayahInSurah: number;
  text: string;
  edition: { identifier: string; language: string; name: string };
}

// Line 11-14
export interface SurahTranslationsResult {
  surahNumber: number;
  translations: Record<string, TranslationAyah[]>; // key = editionIdentifier
}

// Line 16-63
export async function fetchSurahTranslations(
  surahNumber: number,
  editionIdentifiers: string[]
): Promise<SurahTranslationsResult>
```
Calls `https://api.alquran.cloud/v1/surah/{surahNumber}/editions/{editionsParam}` (comma-separated identifiers). Returns ayahs with text per edition.

---

### 4. `src/lib/settings.tsx` — Settings pattern for new `translationAudioEnabled`

**`AppSettings` (lines 10-19)**
```typescript
export interface AppSettings {
  methodId: number;
  timeFormat: TimeFormat;
  locationMode: LocationMode;
  manualLocation: Location;
  autoLocation: Location | null;
  remindersEnabled: boolean;
  themeMode: ThemeMode;
  accentKey: AccentKey;
}
```

**Setter pattern (lines 68-83)** — Each setter uses functional update + `persist()`:
```typescript
function persist(next: AppSettings) {
  setSettings(next);
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
  return next;
}

// Example:
setReminders: (remindersEnabled) => setSettings((prev) => persist({ ...prev, remindersEnabled })),
```
To add `translationAudioEnabled`: add field to `AppSettings`, add `setTranslationAudioEnabled` setter following same pattern.

---

### 5. `src/App.tsx` (Expo Router) + `HomeScreen.tsx` + `AudioMiniPlayer.tsx` + `useAudioMiniPlayer.ts`

**App structure** — Uses Expo Router (`src/app/`). Root layout defines tab navigator. `HomeScreen` is a tab screen.

**Global mini player integration** (`HomeScreen.tsx` lines 682-692):
```tsx
{visible && playback && (
  <AudioMiniPlayer
    playback={playback}
    status={status}
    onPlayPause={onPlayPause}
    onStop={onStop}
    onOpenAudio={onOpenAudio}
    onSeek={onSeek}
  />
)}
```
Rendered **absolutely at bottom of `HomeScreen`** (above tab bar). `visible` comes from `useAudioMiniPlayer` → `playback !== null`.

**`useAudioMiniPlayer.ts` (lines 13-61)** — Subscribes to `addPlaybackStatusListener`, returns:
```typescript
{
  playback: CurrentPlayback | null,
  status: PlaybackStatus,
  visible: boolean,  // = playback !== null
  onPlayPause: () => void,
  onStop: () => Promise<void>,
  onSeek: (positionMillis: number) => void,
}
```

**`AudioMiniPlayer.tsx` (lines 1-283)** — Absolute positioned container (`bottom: 0, left: 0, right: 0`) with:
- Track info (title, reciter) — tap opens full audio screen
- Progress bar (tap/drag to seek)
- Play/Pause + Stop buttons

---

### 6. `app.json` — Android/iOS config gaps

```json
{
  "expo": {
    "android": { "adaptiveIcon": {...}, "predictiveBackGestureEnabled": false },
    "ios": { "supportsTablet": true },
    "plugins": ["expo-font", ["expo-notifications", {...}], "expo-sqlite"]
  }
}
```
**Missing for background audio:**
- No `android.permissions` → needs `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_MEDIA_PLAYBACK`, `WAKE_LOCK`
- No `ios.infoPlist.UIBackgroundModes` → needs `["audio"]`
- No `expo-audio` config plugin with `enableBackgroundPlayback: true`

---

## B. Background audio: expo-av reality (what works, manifest entries, Expo Go caveat)

### Current stack
- **Expo SDK**: 57 (`expo@~57.0.26`)
- **Audio lib**: `expo-av@^16.0.8` (**deprecated** since SDK 54, replaced by `expo-audio`)

### expo-av background playback (deprecated path)
| Platform | `Audio.setAudioModeAsync({ staysActiveInBackground: true })` | Additional requirements |
|---|---|---|
| **iOS** | Works in **standalone/dev builds only** | `app.json` → `ios.infoPlist.UIBackgroundModes: ["audio"]` — **NOT in Expo Go** |
| **Android** | **Insufficient alone** | Requires `FOREGROUND_SERVICE` + `FOREGROUND_SERVICE_MEDIA_PLAYBACK` permissions + **media playback foreground service** (AudioControlsService). Without it, audio stops after ~3 min (Android OS limit). |

**Expo Go reality**: Background audio **does not work reliably** on either platform in Expo Go. iOS explicitly blocks it; Android may play briefly but gets killed. A **development build** (`npx expo run:android/ios`) or **EAS build** is required.

### expo-audio (SDK 57+ recommended path) — Configuration
```json
// app.json
{
  "expo": {
    "plugins": [
      ["expo-audio", { "enableBackgroundPlayback": true }]
    ]
  }
}
```
This plugin **automatically** adds:
- **Android**: `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_MEDIA_PLAYBACK`, `WAKE_LOCK` permissions + declares `AudioControlsService` in manifest
- **iOS**: `UIBackgroundModes: ["audio"]` in Info.plist

**Runtime setup** (required on both platforms):
```typescript
import { setAudioModeAsync } from 'expo-audio';

await setAudioModeAsync({
  playsInSilentMode: true,
  shouldPlayInBackground: true,
  interruptionMode: 'doNotMix',
});
```

**Android sustained playback** — **Must** call on the player:
```typescript
player.setActiveForLockScreen(true, {
  title: 'Surah 1:1',
  artist: 'Al-Afasy',
  albumTitle: 'Quran',
  artworkUrl: 'https://...', // optional
});
```
Without this, Android kills playback after ~3 minutes.

**Lock screen / media controls**:
- **expo-audio**: Built-in via `setActiveForLockScreen()` — shows notification with controls, lock screen artwork, Control Center (iOS).
- **expo-av**: **No built-in lock screen controls**. Requires `expo-media-library` (media notification) + `react-native-track-player` (full media session) or migration to `expo-audio`.

**Source**: [Expo Audio docs SDK 57](https://docs.expo.dev/versions/v57.0.0/sdk/audio/) — "On Android, this adds a media playback foreground service and allows you to display the lockscreen controls and is required for sustained background playback."

---

## C. Translation-audio edition map (language → audio edition → URL patterns → bitrate)

### Verified non-Arabic audio editions (from `quranAudio.ts` + `quran-audio-languages.md`)

| Language | Audio Edition ID | Source | URL Pattern (Single Ayah) | Full Surah URL | Bitrate |
|---|---|---|---|---|---|
| English (en) | `en.everyayah-walk` | EveryAyah | `https://everyayah.com/data/English/Sahih_Intnl_Ibrahim_Walk_192kbps/{surah3}{ayah3}.mp3` | **N/A** (verse-by-verse only) | 192 kbps |
| Urdu (ur) | `ur.everyayah-shamshad` | EveryAyah | `https://everyayah.com/data/translations/urdu_shamshad_ali_khan_46kbps/{surah3}{ayah3}.mp3` | **N/A** | 46 kbps |
| Urdu (ur) | `ur.everyayah-farhathashmi` | EveryAyah | `https://everyayah.com/data/translations/urdu_farhat_hashmi/{surah3}{ayah3}.mp3` | **N/A** | 32 kbps |
| Chinese (zh) | `zh.chinese` | AlQuran Cloud | `https://cdn.islamic.network/quran/audio/128/zh.chinese/{globalAyah}.mp3` | `https://cdn.islamic.network/quran/audio-surah/128/zh.chinese/{surah}.mp3` | 128 kbps |
| French (fr) | `fr.leclerc` | AlQuran Cloud | `https://cdn.islamic.network/quran/audio/128/fr.leclerc/{globalAyah}.mp3` | `https://cdn.islamic.network/quran/audio-surah/128/fr.leclerc/{surah}.mp3` | 128 kbps |
| Russian (ru) | `ru.kuliev-audio` | AlQuran Cloud | `https://cdn.islamic.network/quran/audio/128/ru.kuliev-audio/{globalAyah}.mp3` | `https://cdn.islamic.network/quran/audio-surah/128/ru.kuliev-audio/{surah}.mp3` | 128 kbps |
| Turkish (tr) | `tr.vakfi-audio` | AlQuran Cloud | `https://cdn.islamic.network/quran/audio/128/tr.vakfi-audio/{globalAyah}.mp3` | `https://cdn.islamic.network/quran/audio-surah/128/tr.vakfi-audio/{surah}.mp3` | 128 kbps |
| Persian (fa) | `fa.everyayah-kabiri` | EveryAyah | `https://everyayah.com/data/translations/Makarem_Kabiri_16Kbps/{surah3}{ayah3}.mp3` | **N/A** | 16 kbps |
| Persian (fa) | `fa.everyayah-hedayatfar` | EveryAyah | `https://everyayah.com/data/translations/Fooladvand_Hedayatfar_40Kbps/{surah3}{ayah3}.mp3` | **N/A** | 40 kbps |
| Azerbaijani (az) | `az.everyayah-balayev` | EveryAyah | `https://everyayah.com/data/translations/azerbaijani/balayev/{surah3}{ayah3}.mp3` | **N/A** | 46 kbps |
| Kazakh (kk) | `kk.khalifahaltai-audio` | AlQuran Cloud | `https://cdn.islamic.network/quran/audio/128/kk.khalifahaltai-audio/{globalAyah}.mp3` | `https://cdn.islamic.network/quran/audio-surah/128/kk.khalifahaltai-audio/{surah}.mp3` | 128 kbps |
| Uzbek (uz) | `uz.sodik-audio` | AlQuran Cloud | `https://cdn.islamic.network/quran/audio/128/uz.sodik-audio/{globalAyah}.mp3` | `https://cdn.islamic.network/quran/audio-surah/128/uz.sodik-audio/{surah}.mp3` | 128 kbps |
| Bosnian (bs) | `bs.everyayah-korkut` | EveryAyah | `https://everyayah.com/data/translations/besim_korkut_ajet_po_ajet/{surah3}{ayah3}.mp3` | **N/A** | 32 kbps |

**Notes**:
- EveryAyah editions: **verse-by-verse only** (no combined surah MP3). Use `getSurahAudioUrl` → returns ayah 1 URL; rely on `autoplayNext` to chain.
- AlQuran Cloud editions: Support both ayah (`/audio/`) and surah (`/audio-surah/`) endpoints at 128kbps.
- `globalAyah` = `getGlobalAyahNumber(surah, ayah)` (1..6236).
- `{surah3}` = 3-digit zero-padded surah (001-114), `{ayah3}` = 3-digit zero-padded ayah.

---

### Mapping: Text edition languages → Matching audio edition

| Text Language | Text Edition ID | Has Audio? | Audio Edition ID(s) | Notes |
|---|---|---|---|---|
| **ar** | `ar.muyassar` | ✅ | Multiple Arabic reciters (`ar.alafasy`, `ar.husary`, etc.) | Native Arabic recitation |
| **en** | `en.sahih` | ✅ | `en.everyayah-walk` | Sahih International (Ibrahim Walk) |
| **ur** | `ur.jalandhry` | ✅ | `ur.everyayah-shamshad`, `ur.everyayah-farhathashmi` | Two Urdu options |
| **id** | `id.indonesian` | ❌ | — | **No verified audio edition** |
| **tr** | `tr.diyanet` | ✅ | `tr.vakfi-audio` | Diyanet Vakfı (Turkish) |
| **fr** | `fr.hamidullah` | ✅ | `fr.leclerc` | Youssouf Leclerc (French) |
| **de** | `de.aburida` | ❌ | — | **No verified audio edition** |
| **es** | `es.cortes` | ❌ | — | **No verified audio edition** |
| **ru** | `ru.kuliev` | ✅ | `ru.kuliev-audio` | Elmir Kuliev (Russian) |
| **bn** | `bn.bengali` | ❌ | — | **No verified audio edition** |
| **ms** | `ms.basmeih` | ❌ | — | **No verified audio edition** |
| **sw** | `sw.barwani` | ❌ | — | **No verified audio edition** |
| **fa** | `fa.ansarian` | ✅ | `fa.everyayah-kabiri`, `fa.everyayah-hedayatfar` | Two Persian options |
| **so** | `so.abduh` | ❌ | — | **No verified audio edition** |
| **ta** | `ta.tamil` | ❌ | — | **No verified audio edition** |
| **hi** | `hi.hindi` | ❌ | — | **No verified audio edition** |
| **ha** | `ha.gumi` | ❌ | — | **No verified audio edition** |
| **uz** | `uz.sodik` | ✅ | `uz.sodik-audio` | Muhammad Sodik (Uzbek) |
| **sv** | `sv.bernstrom` | ❌ | — | **No verified audio edition** |

**Summary**: **8 of 20** text languages have matching translation audio. **12 languages lack audio** — for these, the translation segment must be skipped (or TTS used as future enhancement).

**Additional audio-only languages** (no text edition in app): Kazakh (kk), Azerbaijani (az), Bosnian (bs), Chinese (zh).

---

## D. Arabic→Translation queue design notes

### Chaining strategy on `didJustFinish`

**Hook location**: `src/lib/quranAudio.ts:665-683` inside `handlePlaybackStatusUpdate`:
```typescript
if (status.didJustFinish) {
  const settings = safeLoadSettings();
  if (settings.repeatMode === 'one') { ... }
  else if (settings.repeatMode === 'all' || settings.autoplayNext) {
    playNext()  // ← INSERT CHAINING LOGIC HERE
      .then((advanced) => { ... })
      .catch(() => { ... });
    return;
  }
  ...
}
```

**Proposed flow** (when `translationAudioEnabled === true`):
1. Arabic ayah finishes → `didJustFinish = true`
2. Before calling `playNext()`, check:
   - Current playback `type === 'ayah'` and has `surah`, `ayah`
   - Selected translation language (from `getQuranTranslationLanguage()`) has a mapped audio edition
3. If yes: **queue translation ayah** as immediate next segment:
   - Create a synthetic queue item or call `playAyah(translationEditionId, translationUrl, ...)` directly
   - After translation finishes, resume normal `playNext()` (next Arabic ayah)
4. If no audio edition for language: skip translation, proceed to next Arabic ayah.

**Implementation options**:
- **Option A (queue-based)**: Push translation ayah to front of audio queue (`addToAudioQueue` at index `currentQueueIndex + 1`), let existing `playNext()` handle it.
- **Option B (direct chaining)**: In the `didJustFinish` block, `await playAyah(translationEdition, translationUrl, ...)` then `await playNext()` for Arabic continuation. Requires guarding against re-entrancy.

**Fallback when language has no audio**:
- Check mapping table (Section C). If `audioEditionId` is null → skip translation, log/notify user once per session, proceed to next Arabic ayah.

**Surah-level playback**:
- For verse-by-verse Arabic reciter + translation: same per-ayah chaining.
- For full-surah Arabic MP3 (non-verse-by-verse reciter): translation must be verse-by-verse. After full surah finishes, either:
  - Play translation surah verse-by-verse (sequential ayahs), or
  - Disable translation audio for full-surah mode (simpler v3 scope).

---

## E. Settings + global mini player integration points

### Adding `translationAudioEnabled` setting
1. **`src/lib/settings.tsx`** — Add to `AppSettings`:
   ```typescript
   export interface AppSettings {
     // ...existing fields
     translationAudioEnabled: boolean;
   }
   ```
   Add setter in `SettingsContextValue` and `persist` call:
   ```typescript
   setTranslationAudioEnabled: (enabled) => setSettings((prev) => persist({ ...prev, translationAudioEnabled: enabled })),
   ```
   Default: `false` in `DEFAULTS`.

2. **Read in audio logic** — `safeLoadSettings()` (line 409) already returns full settings; access `settings.translationAudioEnabled` in `handlePlaybackStatusUpdate`.

### Global mini player (already works cross-tab)
- `AudioMiniPlayer` renders in `HomeScreen` but **uses global singleton state** from `quranAudio.ts` (`currentPlayback`, `currentStatus`).
- To show on **all tabs**: move the conditional render from `HomeScreen` to the **root layout** (`src/app/_layout.tsx` or equivalent) so it sits above the tab bar globally.
- `useAudioMiniPlayer` hook already subscribes to global listeners — no changes needed.

### Lock screen metadata (for background)
When starting Arabic or translation playback, call (expo-audio):
```typescript
player.setActiveForLockScreen(true, {
  title: `${playback.title} (${translation ? 'Translation' : 'Arabic'})`,
  artist: playback.reciterName,
  albumTitle: `Surah ${surah}`,
  artworkUrl: 'https://cdn.islamic.network/assets/kaaba-icon.png', // optional
});
```
Update on each segment change.

---

## Verification notes

- **URLs verified** via `quran-audio-languages.md` research (tested HTTP 200 as of 2026-10-04).
- **8 of 20** text languages have matching translation audio editions.
- **Expo Go caveat**: Background audio **does not work** in Expo Go on iOS or Android; requires development build (`npx expo run:android/ios`) or EAS build with `expo-audio` plugin configured.