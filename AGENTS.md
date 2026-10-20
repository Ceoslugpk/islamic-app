# AGENTS.md — project instructions for every agent session

> **Read `rules.md` first — it contains the binding 29-rule contract (build/release gates, branch
> model, agent dispatch, localization contracts, verification). Violating any rule = rejected work.**
>
> Precedence: the current task prompt > `rules.md` > this file > an installed skill > your own
> judgement. If two sources conflict, stop and say so in your report rather than silently choosing.

---

# PART 1 — OPERATING RULES FOR AGENT PASSES

## 1.1 What this is

An Expo / React Native Islamic app (Quran reader, prayer times, qibla, hadith, duas, tools, 49
locales, light/dark themes, RTL languages). TypeScript. Package id `com.qashi.islamic`. Private repo
`Ceoslugpk/islamic-app`. `master` = public/stable, `testing` = the working branch that always carries
the gated diagnostic instrumentation (rules 24-29).

**Environment:** headless Linux VPS, Android SDK at `/opt/android-sdk`. There is **no emulator and
no attached device** — you cannot verify anything visually, so never claim device behaviour.

## 1.2 Non-negotiables

1. **Never commit, push, tag, build an APK or publish.** The parent agent verifies first and does
   that itself. Your work ends with source changes plus a report.
2. **Stay in your scope.** Your prompt names the files you own. Other agents may be editing other
   files in the same working tree right now. Never touch theirs; report if you think one needs a
   change.
3. **Do not change version or versionCode** unless the prompt explicitly instructs it.
4. **Root cause, not symptom.** If every caller routes through one function, fix that function. Do
   not redesign screens unless the task is a redesign, and never refactor opportunistically.
5. **Never weaken or delete a test to make things pass.** If an existing test encodes old, wrong
   behaviour, update the assertion and say so explicitly.
6. **Never fabricate evidence** — no invented exit codes, byte counts, line numbers or results. If
   you could not run something, write "not run, because …".
7. **If another writer is active in this tree, do not run the full `npm test` chain** (~8 minutes,
   46+ suites) — it will fail on their half-finished edits. Run your focused suites and say which.

## 1.3 The verification bar — where previous passes failed

In this project **nine of nine implementer reports claimed green gates while independent QA then
found real defects**, including a regression the implementer itself introduced, suites that could
not fail, and false statements inside the reports. Your work is judged by execution, not assertion.

A test counts as evidence only if it:

- **imports and executes the real production module** (transpile/import it — never copy production
  logic into the test file), and
- **goes RED when the production change is reverted**, and GREEN when it is restored.

Treated as a failed pass:

- `String.includes(...)` or regex over source text presented as behavioural proof;
- hand-copied mirrors of production logic inside a test;
- tautologies (e.g. comparing `app.json` against a value derived from `app.json`);
- "mutation checks" that mutate a local helper instead of production source;
- claiming "0 full-table scans" with a pattern that does not match the real query.

For every guarantee: apply **your own** mutation, observe RED, restore, observe GREEN, report both.
If a guarantee cannot be made falsifiable, say so instead of implying coverage.

## 1.4 Report format

Write to the path your prompt names, and include:

- per item: file/line, what was wrong, the fix, the test proving it, mutation RED/GREEN;
- the real exit code of every command you ran;
- what you deliberately did NOT touch;
- what you could NOT verify without a device;
- plainly, which guarantees are falsifiable and which are still not.

---

# PART 2 — COMMANDS AND BUILD TRAPS

## 2.1 Verification commands

| Purpose | Command |
|---|---|
| One focused suite | `node tests/<name>.mjs` |
| Full chain (~8 min, 46+ suites) | `npm test` |
| Typecheck | `NODE_OPTIONS=--max-old-space-size=6144 npx tsc --noEmit` |
| Lint | `npm run lint` (= `expo lint`) |
| Dependency / config doctor | `npx expo-doctor` |
| Locale key parity (49 locales) | `python3 scripts/verify_locale.py` |
| Whitespace / conflict check | `git diff --check` |
| Install an Expo package | `npx expo install <pkg>` (never `npm add` — resolves SDK-compatible versions) |

## 2.2 Building (only when explicitly instructed)

```bash
# Diagnostic APK — gate ON
cd android && EXPO_PUBLIC_ANDROID_DIAGNOSTIC=1 \
  EXPO_PUBLIC_DIAGNOSTIC_BUILD_ID=RTL-STRUCT-<version>-EVIDENCE \
  ANDROID_HOME=/opt/android-sdk \
  GRADLE_OPTS="-Xmx2048m -XX:MaxMetaspaceSize=768m -Dorg.gradle.workers.max=4" \
  ./gradlew assembleRelease --no-daemon

# Public APK — same command with NEITHER EXPO_PUBLIC_* variable set
```

Verify any built APK before trusting it:

```bash
/opt/android-sdk/build-tools/36.0.0/aapt dump badging app-release.apk | grep ^package:
/opt/android-sdk/build-tools/36.0.0/apksigner verify --verbose --print-certs app-release.apk
```

## 2.3 Traps that have already cost us device round-trips

- **`android/` is generated and untracked.** A fresh `git worktree` has no `gradlew`, no
  `settings.gradle`, no native project — you cannot build there as-is.
- **`expo prebuild` DELETES `android/local.properties`** — re-add `sdk.dir=/opt/android-sdk`.
- **Signing files are gitignored** (`android/keystore.properties`, `android/release.keystore`) and
  live only in the canonical repo; a build elsewhere needs them symlinked, removed afterwards.
- **Background Gradle builds get SIGTERM'd** on this host. Build in the foreground (~4 min cold).
- **Version identity must agree across `app.json` (`expo.version`, `expo.android.versionCode`),
  `package.json` (`version`) and `android/app/build.gradle` (`versionName`, `versionCode`)** before
  any build.
- **`DIAGNOSTIC_BUILD_ID` is derived from `DIAGNOSTIC_VERSION`, never hardcoded separately** — the
  gate compares the build-time env value to that constant, so a mismatch silently switches
  diagnostics off (this shipped once and burned a whole device round).
- Never `grep` a compiled binary expecting readable output; use `strings` and narrow patterns.

### The two-factor diagnostic gate

Diagnostics run only when BOTH `EXPO_PUBLIC_ANDROID_DIAGNOSTIC=1` AND the exact matching
`EXPO_PUBLIC_DIAGNOSTIC_BUILD_ID` are present at bundle time. Gate off ⇒ zero probes, zero
`onLayout`, zero listeners, zero timers, zero network wrapping, and no change to host props.

**Verifying a bundle: grepping for the build id is NOT proof.** The string is present either way.
Check that the two inlined literals of the gate comparison are equal (in a correct build the id
typically appears exactly once, because the minifier interns both sides to the same string) and that
no stale id remains.

---

# PART 3 — PROJECT MAP AND LANDSCAPE

## 3.1 Where things live

- `App.tsx` — root component, view-state union navigation, render branches, language bootstrap.
- `src/screens/*` — one file per screen; `SettingsScreen.tsx` is the largest and builds its own
  pressable rows inline (relevant to any instrumentation work).
- `src/lib/db.native.ts` and `src/lib/db.ts` — native SQLite and web KV implementations of the same
  API. **Fix both** when a defect exists in both.
- `src/lib/settings.tsx` + `src/lib/settingsWriteQueue.ts` — every write to `islamic-settings` goes
  through the serialized writer (rule 19); never add a direct setter write.
- `src/lib/i18n.ts`, `src/lib/rtl.ts`, `src/lib/strings.ts` — language bootstrap, native direction,
  translations. Direction must be applied **exactly once per process, before UI mount**; never call
  `forceRTL`/`allowRTL` after mount (it triggers an Android configuration recreation).
- `src/lib/backup.ts` — export/restore. Restore must validate every row against the target schema
  **before** the first destructive `DELETE`, abort all-or-nothing, and never report success for a
  lossy restore.
- `src/lib/quranAudio.ts`, `src/lib/audio.ts`, `src/lib/quranPreloader.ts` — playback and caching,
  full of races; use generation tokens.
- `src/lib/diagnostic/**`, `src/components/diagnostic/**` — the gated recorder: probes, defect
  classes, interaction ledger, language/theme matrices, network and error ledgers, export.
- `tests/*.mjs` — plain Node `assert` scripts wired into the `npm test` chain in `package.json`;
  several use a transpile-and-execute harness so they run real TypeScript.
- `docs/` — `brand-guidelines.md`, `ui-review.md`, `adding-app-languages.md`, `docs/antigravity/*`.
  Read the matching guide before UI or localization work.

## 3.2 Known defect landscape — do not re-fix or undo

- **Language switch (fixed, commit `23a3bdf`).** The app used to restart on a language switch and
  then leave screens unresponsive: native direction was applied twice — once at module load, again
  in a post-mount effect — with different inputs. Now applied once, pre-mount, from a reactive
  source. Regression suite: `tests/test_v1_1_94_language_switch_recovery.mjs`.
- **Diagnostic signal quality (fixed, `fe4959d`).** `offScreen` no longer fires on ordinary
  scrolling; `center` is never an RTL mismatch; truncation distinguishes "at limit" from "over
  limit"; interaction effect classification and screen attribution corrected.
- **Quran cache accounting (in progress).** The budget counter validated against itself, so a
  count-preserving write drifted undetected and eviction never fired. In scope only if your prompt
  says so.
- **Audit backlog:** `/home/ubuntu/.hermes/cache/islamic-app-code-audit.md` holds 44 findings
  (F-01…F-45) with evidence. F-01…F-05 (criticals) and F-06/F-07/F-35/F-38 are done; the rest are
  batched. Read a finding before working on it — several interact.

## 3.3 Device evidence outranks automation

Real reports exported from the app on the user's physical Android phone live under
`/home/ubuntu/.hermes/cache/documents/native-inputs/**` and `/home/ubuntu/.hermes/cache/scratch/*.json`.
They are the only ground truth about real-device behaviour. When one exists, **use its exact
recorded values as regression fixtures** — this project has a history of "fixes" that passed every
automated gate and changed nothing the user could see.

## 3.4 Installed skills (read the relevant one before starting)

`islamic-app-rules` · `islamic-app` · `expo-react-native-vps` · `systematic-debugging` ·
`test-driven-development` · `codebase-inspection` · `islamic-app-locale-translations` ·
`locale-file-translation` · `github`.

## 3.5 Communication

Be blunt and specific. State any assumption you had to make. Report out-of-scope defects rather than
silently fixing them. If you cannot satisfy a requirement, name it and say why. A short honest report
beats a long confident one.

---

# PART 4 — EXPO / REACT NATIVE PROJECT GUIDANCE (pre-existing)

## Antigravity / Gemini feature guides

Before editing, read the matching repository guide:

- Any feature or bug fix: `docs/antigravity/FEATURE_IMPLEMENTATION_GUIDE.md`
- Any new screen or navigation change: `docs/antigravity/NEW_SCREEN_CHECKLIST.md`
- Any localization work or untranslated-string audit: `docs/antigravity/LOCALIZATION_AUDIT.md`
- Adding a whole app language: `docs/adding-app-languages.md`

`docs/antigravity/README.md` defines instruction precedence and the default execution protocol.

This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and
cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or
removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with
   corrections to common LLM misconceptions. Follow its links; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Navigation & Routing

- This repository currently uses typed view-state unions and render branches in `App.tsx`; screens
  live in `src/screens/`.
- Extend the existing `LibraryView`, `QuranView`, or `ToolsView` union and wire the entry, render
  branch, and back path completely.
- Do **not** introduce Expo Router or a second navigation system unless the user explicitly requests
  an architecture migration.
- Keep reusable components, hooks, services, and utilities outside `src/screens/`.

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship
over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as
`bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute
that for bare `eas` in docs examples. Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native
  Generation). Never create or edit them by hand — configure native behavior in `app.json` and
  config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app
  needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before
  adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md
