# Project Rules (Standing)

These are the hard rules for working on this project. They apply to every session, every agent (Hermes/Niro, Antigravity/agy, OpenCode), and every task. Violating a rule = rejected work.

## Build & Release Rules
1. **No APK build until the user explicitly says build.** After code changes land: commit + push, then STOP. Do NOT pre-build, assembleRelease, or upload. Only build when asked.
2. **No commit and no push until the user confirms.** Work sits uncommitted until explicit approval (e.g. "commit", "push that").
3. **Preserve package ID, signing key, permissions, and user data — always.** Package ID is `com.qashi.islamic`. Never regenerate or replace the release signing key. Never clear app data or uninstall during installs/updates.
4. **Grey/white pattern flash check (MANDATORY on every build):** verify there is NO grey/white pattern flash between app launch and the splash screen. This issue recurred in v1.1.54. Suspects: expo-splash-screen config, Android 12+ splash theme, `windowBackground` mismatch. Never claim it is fixed without evidence.
5. **Versioning:** bump version per fix round (`1.1.x` → next). Update both `versionCode` and `versionName` in `android/app/build.gradle`.
6. **Release build command:** `cd android && ANDROID_HOME=/opt/android-sdk GRADLE_OPTS="-Xmx2048m -XX:MaxMetaspaceSize=768m -Dorg.gradle.workers.max=4" ./gradlew assembleRelease --no-daemon`.
7. **`expo prebuild` DELETES `android/local.properties`** — re-add `sdk.dir=/opt/android-sdk` after every prebuild.
8. **Ship via GitHub release** (never Google Play). Upload APK/AAB to `Ceoslugpk/islamic-app` releases; direct asset download URLs are 404 unauthenticated (private repo) — share the release page URL. Verify uploaded asset size matches local byte-for-byte.

## Agent Dispatch Rules
9. **All tasks go to agy (Antigravity) with a proper prompt.** Default model: `gemini-3.6-flash-low` (user-selected). Do NOT hand-code fixes yourself while agy is available — write the prompt, dispatch, verify.
10. **OpenCode is for read-only audits only** — never code changes. Run audits in an isolated detached worktree (e.g. `~/.hermes/cache/scratch/islamic-app-<name>`), never the main tree being edited. Verify `git status` is clean before AND after.
11. **Quota handling:** when agy hits quota (429), wait for the reset (read the actual reset time). If the user authorizes take-over, finish the work yourself. Hand to OpenCode only when the user allows or agy is effectively dead.
12. **Never trust agent self-reports.** Independently re-run checks (files exist, `tsc --noEmit`, tests, key counts, content quality) before declaring done.

## Localization Rules
13. **Locale files must have exact key parity** with `src/locales/en.json` (currently 2,302 keys; the source file is authoritative): same key set, zero missing, zero extra, zero empty values, valid JSON, UTF-8.
14. **Interpolation tokens are sacred:** keep EXACT token names (`{{count}}`, `{{n}}`, `{{flag}}`, `{{edition}}`, `{{valid}}`, `{{missing}}`, `{{incomplete}}`) — never translate, rename, or drop them.
15. **Translations must be genuine:** never copy English values to pad key count (≤5% identical-to-English, only proper nouns/URLs/time formats may match). Never use stub placeholders (`[Sindhi]`), artifact prefixes (`Polskie tłumaczenie:`), or `__TERM__` markers. Each file must be in its own correct language (no language mixing, e.g. German into Czech).
16. **Quran-app content scan:** before shipping a locale, scan for profanity/negative/bad words. Flag false positives separately; verify each hit.
17. **One locale file per task run:** agents may touch ONLY the named locale files — no stray scripts, cache files, model dirs, or package.json changes.
18. **A new app language is incomplete without the full checklist in `docs/adding-app-languages.md`.** In the same change, register the locale centrally, keep exact locale parity, localize domain data, add and test its Quran text/translation edition, same-language tafsir default, and an honest audio policy using verified existing editions only (never fabricate an unavailable translation-audio source). Switching must be symmetric with every registered app language, preserve explicit custom Quran/tafsir/audio selections, persist before reload, and pass cold-boot plus pairwise transition tests.
19. **Language and appearance are one persistence surface.** Every write to `islamic-settings` must use `src/lib/settingsWriteQueue.ts`; never add a direct setter write. Language switching remains `queued write → in-queue read-back verification → prepareNativeLayoutDirection → one reload`.

## Verification Rules
20. **No fabricated results.** Real tool output only. A report table is NOT proof — require on-disk evidence (file exists, real size, parsed content).
21. **No physical-device claims without a device.** Automated/static checks are not device verification.
22. **Test suite must pass:** `node tests/<focused>.mjs`, full `npm test`, `NODE_OPTIONS=--max-old-space-size=6144 npx tsc --noEmit`, `git diff --check` before any commit.
