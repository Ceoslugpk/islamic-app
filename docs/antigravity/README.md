# Antigravity Engineering Guides

These guides are written for Antigravity using Gemini 3.8 on the Islamic App repository.

## Authority order

When instructions conflict, follow this order:

1. The user's latest task-specific instruction.
2. Root `rules.md` — binding project, localization, verification, build, commit, and release gates.
3. Root `AGENTS.md` — repository and Expo guidance.
4. The guides in this directory.
5. Existing code patterns.

Never weaken a higher-priority rule to complete a task faster.

## Required reading by task

- Any feature or bug fix: [`FEATURE_IMPLEMENTATION_GUIDE.md`](./FEATURE_IMPLEMENTATION_GUIDE.md)
- Any new screen or navigation change: [`NEW_SCREEN_CHECKLIST.md`](./NEW_SCREEN_CHECKLIST.md)
- Any localization work, new user-facing text, or translation audit: [`LOCALIZATION_AUDIT.md`](./LOCALIZATION_AUDIT.md)
- Adding a whole app language: [`../adding-app-languages.md`](../adding-app-languages.md)

## Default execution protocol

1. Read `rules.md`, `AGENTS.md`, and the relevant guide above.
2. Run `git status --short`; do not overwrite unrelated work.
3. Inspect the real call path and at least two comparable implementations before editing.
4. State the smallest coherent file list and acceptance criteria.
5. Reuse existing components, helpers, state, services, and tests.
6. Implement only the requested scope.
7. Add focused regression coverage for the production mechanism.
8. Run focused tests, full `npm test`, TypeScript, and `git diff --check`.
9. Review the final diff for unrelated changes, raw English, accessibility gaps, RTL issues, hardcoded colors, permissions, and user-data risk.
10. Report exact files changed, commands actually run, results, and any device-only verification still pending.

## Hard stops

- Do not build an APK unless the user explicitly asks.
- Do not commit or push unless the user explicitly confirms.
- Do not redesign Home or alter the established visual system unless requested.
- Do not add dependencies, native permissions, analytics, accounts, cloud sync, or data migrations as side quests.
- Do not modify Quran Arabic text, prayer methodology, package ID, signing configuration, or release keys.
- Do not claim physical-device verification without a physical device.
