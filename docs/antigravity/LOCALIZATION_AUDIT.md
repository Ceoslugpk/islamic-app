# Localization Audit Instructions for Antigravity

Use this document to find every user-visible English string that is untranslated, missing from locale files, or bypassing `t()`. Read root `rules.md` first.

## Operating modes

### Audit mode — default

Read-only. Produce a complete cited report; do not modify code or locale files. Audit mode is preferred when the user asks to "scan", "audit", "find", or "report".

### Fix mode — only when explicitly requested

Apply fixes in small verified batches. Follow the one-locale-file rule in `rules.md`; do not rewrite valid locale files to repair a few values. Never fill missing translations by copying English.

## Definition of user-visible text

Audit all text a user or screen reader can encounter, including:

- `<Text>` and `ArabicText` children
- component props such as `title`, `subtitle`, `eyebrow`, `label`, `description`, `message`, `actionLabel`, `backLabel`, and tab names
- `placeholder`, `accessibilityLabel`, `accessibilityHint`, state announcements, and image descriptions
- `Alert.alert`, toast/undo messages, errors, retries, permission rationale, notifications, share text, and clipboard text
- empty/loading/offline/unavailable states
- labels stored in arrays, maps, presets, menu definitions, service output, or domain data
- template literals and concatenated labels such as `Play ${name}`
- strings passed through reusable components that translate internally

Developer-only logs, internal IDs, cache keys, URLs, API identifiers, analytics event names, and test descriptions are not user-visible unless rendered.

## Scope

Scan:

- `App.tsx`
- `src/screens/**/*.{ts,tsx}`
- `src/components/**/*.{ts,tsx}`
- `src/lib/**/*.{ts,tsx}` when values are rendered, announced, notified, shared, or returned as UI errors
- all `src/locales/*.json`
- tests that encode localization contracts

Do not scan only `src/screens`; many leaks originate in reusable components, data arrays, accessibility strings, notifications, and helpers.

## Phase 1 — Establish the locale baseline

1. Parse `src/locales/en.json`; it is the authoritative key set.
2. Enumerate every other JSON file in `src/locales` programmatically.
3. For every locale, calculate and report:
   - total keys
   - missing keys
   - extra keys
   - empty/whitespace-only values
   - interpolation-token mismatches
   - newline mismatches
   - values identical to English
   - suspicious English-language values not on the allowlist
4. Fail the audit for malformed JSON, non-string values, missing/extra keys, empties, or token/newline mismatches.

Do not hardcode the expected key count; read it from `en.json`. The standing rules currently mention 2,302, but the file is authoritative if it changes.

### Interpolation comparison

Extract every `{{token}}` from the English and translated values, sort them, and require exact equality. Do not translate token names.

### Identical-to-English analysis

Identical values are candidates, not automatic defects. Allow only justified items such as:

- proper nouns and brand names
- URLs, emails, file extensions, and technical identifiers
- numbers, time/date formats, units, and short universal abbreviations
- Quranic Arabic intentionally shared across locales

Each allowed identical value must be categorized. A blanket allowlist for an entire locale is forbidden. A target locale with more than 5% unexplained English-identical values fails.

## Phase 2 — Build a source-string inventory with the TypeScript AST

Do not rely only on regex. Use the installed `typescript` package and traverse each source file's AST. Record file, line, node type, enclosing component/function, and literal/template text.

Collect candidates from:

- `JsxText` containing letters
- string/template literals inside JSX expressions
- JSX attributes used for visible/a11y copy
- calls to `Alert.alert`, toast/undo helpers, notification builders, share/clipboard helpers, and user-facing error constructors
- object/array properties named `title`, `subtitle`, `label`, `description`, `message`, `placeholder`, `actionLabel`, `backLabel`, `accessibilityLabel`, or equivalent
- template expressions and binary `+` concatenations used by those surfaces
- literals supplied to reusable UI components

The scanner is a candidate generator. Manually classify every candidate; do not auto-wrap identifiers or developer messages in `t()`.

## Phase 3 — Validate translation usage

For each candidate, assign exactly one status:

- `TRANSLATED_LITERAL` — wrapped in `t('literal key')`, and the key exists everywhere
- `TRANSLATED_BY_COMPONENT` — a component such as `ScreenHeader` translates the prop internally; cite that implementation
- `LOCALIZED_HELPER` — rendered through a verified domain localization helper
- `DYNAMIC_TRANSLATED` — `t(variable)` where every possible finite value is traced and present in all locales
- `NOT_USER_VISIBLE` — internal identifier/log/test data; explain why
- `INTENTIONAL_SHARED_TEXT` — proper noun, URL, canonical Arabic, etc.; explain why
- `DEFECT_RAW_ENGLISH` — visible English bypasses localization
- `DEFECT_MISSING_KEY` — `t()` key absent from English or another locale
- `DEFECT_PARTIAL_TEMPLATE` — only part of a sentence/template is translated
- `NEEDS_HUMAN_REVIEW` — dynamic/network content whose source cannot be proven

Never assume a prop is translated. Trace the receiving component. For example, if `ScreenHeader` calls `t(title)`, a literal `title="Cities"` may be valid, but another custom component may render the same prop raw.

For `t(variable)`, locate the finite source array/map/union. Validate every possible value. If the values are unbounded network data, they are not locale keys and need a localized display helper or server-provided locale policy.

## Phase 4 — Search for high-risk leaks

After the AST pass, use text search as a second net for:

- raw `accessibilityLabel={` template strings
- raw `placeholder="..."`
- raw `<Text>English words</Text>`
- `Alert.alert('...')`
- `action: '...'`, `message: '...'`, `title: '...'`, and `label: '...'` in UI data
- English fragments inside template literals
- ternaries where only one branch uses `t()`
- error objects rendered directly to users
- fallback expressions such as `t(key) || 'English fallback'`

A grep result is not proof of a defect; trace it to the rendered surface. Conversely, zero grep hits is not proof of a clean audit.

## Phase 5 — Detect locale content defects

Beyond key parity, scan each locale for:

- English sentences left untranslated
- wrong-language contamination
- placeholder prefixes/suffixes such as `[Urdu]`, `Translation:`, or `__TERM__`
- copied English punctuation/sentence patterns inconsistent with the target language
- mojibake, replacement characters, broken escapes, or truncated values
- profanity or inappropriate words in Quran-app context; report false positives separately
- incorrect plural/interpolation handling

Use language-aware heuristics only to flag candidates. Do not mass-rewrite a locale based on a heuristic.

## Required audit report

Write the report as Markdown with these sections:

1. **Scope and evidence** — files/locales scanned and exact commands/scripts used.
2. **Executive summary** — counts by severity and category.
3. **Raw English defects** — one row per finding:
   - severity
   - `file:line`
   - exact string/template
   - surface (visual/a11y/alert/notification/share/etc.)
   - why it is user-visible
   - existing key/helper, if any
   - minimal fix
4. **Missing/invalid keys** — locale, key, defect type, tokens/newlines.
5. **Suspicious locale values** — locale, key, current value, reason, confidence.
6. **Intentional exceptions** — every allowlisted category with examples.
7. **Unresolved dynamic content** — ownership/source and required human decision.
8. **Verification matrix** — commands and real exit codes.

Sort findings by severity, then file and line. Deduplicate the same root string rendered through multiple callers, but list all affected callers.

## Severity

- **P0:** corrupted Quran/Islamic text, unsafe religious meaning, privacy/security leak.
- **P1:** primary visual text or accessibility action untranslated/missing in a shipped locale.
- **P2:** secondary metadata, empty/error state, notification, toast, or partial template leak.
- **P3:** wording quality, suspicious translation, or low-impact inconsistency.

## Fix-mode rules

When explicitly asked to fix:

1. Add or reuse one English key; do not create spelling variants for the same sentence.
2. Wrap the complete sentence/template, not isolated words that produce unnatural grammar.
3. Preserve exact interpolation tokens and newlines.
4. Add genuine translations to every shipped locale in controlled batches. Never copy English to achieve parity.
5. Reuse localized domain helpers for Quran editions, Surah names, cities, dhikr, and similar structured data.
6. Add a regression test that scans the production source or executes the real helper.
7. Search the full test tree for obsolete source-string assertions after changing call shapes.

## Acceptance gates

An audit is complete only when:

- every source candidate has a classification
- every literal `t()` key exists in `en.json` and every shipped locale
- every finite dynamic key is resolved and checked
- all locales have exact key parity, non-empty values, and token/newline parity
- identical-to-English findings are explained and unexplained ratio is within policy
- all P0/P1 findings are fixed or explicitly blocked by the user
- focused localization tests, full `npm test`, TypeScript, and `git diff --check` pass

Required commands after fixes:

```bash
node tests/test_i18n_urdu.mjs
node tests/test_language_switching.mjs
node tests/test_defect_regressions.mjs
npm test
NODE_OPTIONS=--max-old-space-size=6144 npx tsc --noEmit
git diff --check
```

## Prohibited shortcuts

- Do not report "all strings translated" from key counts alone.
- Do not trust agent self-reported counts; parse files from disk.
- Do not treat regex as the complete audit.
- Do not copy English into target locales.
- Do not regenerate a valid locale to fix a few entries.
- Do not create comments/dead aliases merely to satisfy static tests.
- Do not claim native RTL or visual quality from static analysis.
