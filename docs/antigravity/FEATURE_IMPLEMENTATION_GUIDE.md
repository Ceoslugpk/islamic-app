# Feature Implementation Guide for Antigravity

Use this guide whenever adding or changing a feature. Read root `rules.md` first.

## 1. Understand before editing

- Restate the user-visible outcome and explicit non-goals.
- Trace the flow end to end: entry point → screen/component → hook/context → service/storage/API → rendered states.
- Search every caller of any shared helper you plan to change.
- Read at least two working neighboring features and reuse their pattern.
- Check `git status --short` before editing. Preserve unrelated changes.
- For a bug fix, identify and test the root cause; do not patch only the reported screen if sibling callers share the defect.

## 2. Prefer the smallest existing solution

Use this order:

1. Skip speculative scope.
2. Reuse an existing component, helper, hook, context, service, type, token, or test pattern.
3. Use React Native, Expo, TypeScript, or JavaScript built-ins.
4. Use an already-installed dependency.
5. Add the minimum new code only when the earlier options do not fit.

Do not introduce a new dependency for behavior already available in the project. If an Expo API is involved, confirm the installed Expo major version in `package.json` and use matching versioned documentation.

## 3. Protect project architecture

- Keep screens in `src/screens`, reusable UI in `src/components`, and business/data logic in `src/lib`.
- This app currently uses typed screen-state unions and render branches in `App.tsx`; do not introduce a second navigation framework.
- Keep API calls in existing client/service modules. Do not fetch directly from arbitrary components if a service layer already exists.
- Preserve local-first and offline behavior. Cached/user-created data must survive updates.
- Use the existing `SettingsProvider`; every `islamic-settings` write must go through `src/lib/settingsWriteQueue.ts`.
- Preserve explicit user choices when applying automatic defaults.
- Keep stable API identifiers, database keys, cache keys, and storage keys language-neutral.

## 4. Required feature states

Every feature that loads or mutates data must deliberately handle:

- initial/loading
- success
- empty
- offline or cached
- recoverable error with retry
- unavailable/unsupported platform
- permission denied and permission permanently denied, when applicable
- unmount/cancellation so late async results do not overwrite newer state

Never use an infinite spinner as an error state. Never silently discard user input after an I/O failure.

## 5. UI and interaction contract

- Use `useTheme()` colors and existing typography/tokens; do not hardcode a parallel palette.
- Verify Ink, Paper, and System modes.
- Use `t()` for every user-visible string, including accessibility, placeholders, alerts, toasts, empty/error states, and generated labels.
- Support English LTR plus Urdu and Arabic RTL. Direction comes from shared helpers, not Urdu-only checks.
- Use directional icon helpers for arrows/back/forward. Do not mirror non-directional icons.
- Keep touch targets at least 40–44 px and provide accessibility role, label, state, and hint where useful.
- Test narrow phones, common phones, large font scaling, long translated strings, and tablet/wide layouts.
- Respect reduced motion and avoid JS-driven animation when a native/static solution is sufficient.
- Do not redesign Home or global navigation unless the task explicitly requests it.

## 6. Islamic-content safety

- Never silently edit Quran Arabic text.
- Do not invent hadith, citations, translations, tafsir sources, reciters, audio editions, or religious rulings.
- Preserve recognized scholarly differences and existing prayer calculation settings.
- Verify external Islamic content against the repository's established sources before shipping it.
- If a requested source is unavailable, show an honest unavailable state rather than fabricated fallback content.

## 7. Data, privacy, and security

- Validate imported, restored, deep-linked, and network data at trust boundaries.
- Preserve package ID `com.qashi.islamic`, release signing, user data, and offline databases.
- Do not add Android/iOS permissions without explicit approval and a clear need.
- Do not log PINs, private worship data, precise location, tokens, or backup contents.
- Reuse established privacy gates for women's worship and other sensitive surfaces.
- Migrations must be idempotent, backward compatible, and tested with old/malformed data.

## 8. Tests before completion

For non-trivial behavior, add one focused regression test that fails for the defect or missing feature and exercises the production mechanism. Do not test a toy queue/parser/cache while leaving the real implementation unexercised.

Required checks:

```bash
node tests/<focused-test>.mjs
npm test
NODE_OPTIONS=--max-old-space-size=6144 npx tsc --noEmit
git diff --check
```

Also run scoped ESLint on changed TypeScript/TSX files. Repository-wide lint has legacy findings; report new findings separately rather than hiding them.

## 9. Final diff review

Before reporting completion, verify:

- requested behavior is complete; no placeholder or dead UI
- no unrelated refactor or dependency change
- no direct `islamic-settings` write
- no raw user-facing English
- no lost interpolation tokens
- no hardcoded light/dark-only colors
- no RTL double-mirroring
- no duplicate source of truth
- no new permissions or sensitive logs
- loading, empty, offline, error, and retry paths exist
- relevant tests are in the full `npm test` chain

## Do

- Reuse established code.
- Make the smallest root-cause fix.
- Preserve offline and user state.
- Add evidence-producing tests.
- Report what remains device-only.

## Do not

- Rewrite working architecture for style.
- Add abstractions with one implementation.
- Add speculative settings or scaffolding.
- Fabricate API/content support.
- Satisfy source-string tests with comments or dead aliases.
- Build, commit, push, or release without the required user authorization.
