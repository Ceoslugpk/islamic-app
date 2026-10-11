# Adding an App Language

This checklist is mandatory for Hermes and every coding agent. A locale file alone does not add an app language.

## 1. Register the language once

Update the shared language contract, not individual screens:

- `src/lib/i18n.ts`
  - extend `AppLanguage` (current registered: `'en' | 'ur' | 'ar' | 'hi' | 'ml' | 'si'`)
  - import and register the locale in `resources`
  - update `isAppLanguage()` and device-locale detection
  - update `isRtlLanguage()` only if the language is RTL (Urdu & Arabic are RTL; English, Hindi, Malayalam, and Sinhala are strictly LTR)
- `src/lib/settings.tsx`
  - accept the language in `sanitizeSettings()`
  - include it in the Settings language selector
- Never add scattered `language === 'ur'` direction checks. Use `isRtlLanguage(language)`.

## 2. Preserve the switching transaction

Language, theme, accent, and every other `islamic-settings` update share one serialized writer in `src/lib/settingsWriteQueue.ts`.

The native language-switch order is fixed:

1. Build the next snapshot from `settingsRef.current`.
2. Optimistically update the ref and React state.
3. Queue the complete settings snapshot.
4. Read it back inside the same queued task and verify the selected language.
5. Apply `prepareNativeLayoutDirection(nextLanguage)`.
6. Trigger exactly one reload.

Do not write `islamic-settings` directly from a new setter. Do not apply native direction or reload before read-back succeeds. A failed write must reload nothing and roll back only the failed field while preserving newer unrelated settings.

## 3. Add complete locale content

The new JSON file must match `src/locales/en.json` exactly:

- same key set and count
- no missing, extra, or empty values
- identical interpolation tokens and newline structure
- genuine translation, not copied English padding or placeholders
- UTF-8 JSON

Patch defective values only; do not regenerate an otherwise valid locale.

## 4. Add localized domain data

Audit data rendered outside locale JSON, including:

- Quran edition/language/translator metadata
- Surah names and search aliases
- city and country names
- dhikr names, meanings, and transliterations
- accessibility labels assembled from domain data

Every renderer must use the shared localized helper. Do not mutate canonical API identifiers or cache keys.

## 5. Link Quran content honestly

In the same change, add verified defaults for:

- Quran text/translation edition
- same-language tafsir
- translation audio only when a verified edition exists

Switching must be symmetric with every registered app language. Replace only known auto-linked defaults and preserve explicit user choices. Never label Arabic recitation as translated audio.

## 6. Required regression checks

Run all of these before asking to commit:

```bash
node tests/test_i18n_urdu.mjs
node tests/test_language_switching.mjs
node tests/test_settings_write_order.mjs
node tests/test_defect_regressions.mjs
npm test
NODE_OPTIONS=--max-old-space-size=6144 npx tsc --noEmit
git diff --check
```

Tests must cover every pairwise language transition, repeated switches, cold boot, RTL/LTR direction, a theme write immediately before and during a language write, delayed storage, one rejected write, and a successful write after rejection.

## 7. Device gate

Automated tests do not prove native `I18nManager` timing. On a physical Android device verify:

- every language appears in Settings and renders translated text
- all pairwise language switches, including RTL-to-RTL and RTL-to-LTR
- repeated switching and cold boot
- Dark, Light, and System theme persistence before and after each language switch
- no stale language, wrong direction, blank screen, or double reload

Do not claim device verification without performing it. Do not build, commit, or push unless the user explicitly authorizes it.

- For full details on the Malayalam & Sinhala integration, see [docs/malayalam-sinhala-languages.md](docs/malayalam-sinhala-languages.md).
