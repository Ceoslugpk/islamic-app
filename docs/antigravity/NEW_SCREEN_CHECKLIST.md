# New Screen Checklist for Antigravity

Use this guide for every new full screen, detail view, hub, modal, or navigation destination. Read root `rules.md` and `FEATURE_IMPLEMENTATION_GUIDE.md` first.

## 1. Choose the correct screen type

Decide before coding:

- **Top-level hub:** one of Home, Quran, Library, or Tools; uses the global app header/tab structure.
- **Detail screen:** opened from a hub and owns exactly one canonical `ScreenHeader` with a working back path.
- **Modal/sheet:** temporary task that should not become another navigation state.
- **Reusable content component:** not a screen; keep it in `src/components` and let a screen own navigation/loading.

Do not turn a simple modal into a new screen or create a second route system.

## 2. Inspect comparable screens

Read two existing screens with the same role before editing. Check:

- how they receive `onBack` and other callbacks
- how they use `ScreenHeader`, `SectionHeader`, `Card`, `Hairline`, and empty/loading components
- how they handle safe areas, maximum width, compact width, keyboard, and scrolling
- how they obtain theme, settings, haptics, language, and data
- how `App.tsx` represents and renders their navigation state

Reuse the closest pattern rather than inventing a new layout language.

## 3. Wire navigation completely

This project currently uses state-driven navigation in `App.tsx`, not Expo Router routes.

For a new Library, Quran, or Tools detail screen:

1. Add the screen state to the correct typed union in `App.tsx`.
2. Import the screen.
3. Add the render branch with all required props.
4. Add the hub/list entry that opens it.
5. Wire `onBack` to the correct parent state.
6. Verify Android hardware back and modal/back-ref behavior where relevant.
7. Update `isTopLevelScreen()` only if the new destination is intentionally a top-level hub.
8. Add a regression assertion for the entry, union, render branch, and back path.

A screen file existing on disk is not completion if no user can navigate to it or return from it.

## 4. Canonical screen skeleton

A detail screen should normally contain:

- root `View` or `ScrollView` using `colors.bgBase`
- one `ScreenHeader`
- responsive horizontal padding
- centered content with the established maximum width
- explicit bottom padding for the safe area/tab overlap
- loading, empty, offline/error, and retry states as needed

Use the shared header directly. Do not recreate a custom back row, title geometry, or chevron.

## 5. Responsive and keyboard behavior

Verify at minimum:

- 320–360 px narrow phone
- 390–430 px common phone
- 600+ px wide/tablet
- portrait with large font scaling
- keyboard open for every input/composer

Rules:

- derive widths from the measured container, not stale global screen constants
- constrain long/mixed-script text with `flexShrink`, `minWidth: 0`, wrapping, or `numberOfLines` deliberately
- use `FlatList`/virtualization for large or growing collections
- avoid nesting same-axis virtual lists inside `ScrollView`
- clean up timers, subscriptions, audio, listeners, and async work on unmount

## 6. Theme, language, and RTL

- Use `useTheme()` and existing tokens for every visible color.
- Test Ink, Paper, and System themes; do not infer effective System mode from the stored setting alone.
- Wrap all user-visible copy in `t()` before considering the screen complete.
- Test English, Urdu, and Arabic with long strings.
- Use shared RTL helpers and directional icons. Assign one mirroring owner per axis; avoid nested `row-reverse` that double-mirrors content.
- Keep canonical IDs/data in their source language and localize only at render/search boundaries.

## 7. Accessibility minimum

Every interactive element needs:

- correct `accessibilityRole`
- localized `accessibilityLabel`
- `accessibilityState` for selected, expanded, checked, disabled, or busy states
- at least a 40–44 px target or established `hitSlop`
- non-color indication for selection/error/status

Headers must expose a heading role. Images/icons conveying information need labels; decorative elements must not create noisy announcements.

## 8. Screen acceptance matrix

Before reporting done, exercise:

- open from the intended hub
- back button and Android hardware back
- cold open/default data
- loading → success
- empty
- offline/cached
- error → retry
- rapid repeated taps
- unmount/remount
- Ink/Paper/System
- English/Urdu/Arabic
- narrow/common/wide widths
- keyboard and large text where applicable

Automated checks do not replace physical Android verification for native direction, keyboard, permissions, notifications, audio, or splash behavior.

## 9. Do / do not

**Do:** reuse shared headers/cards/tokens, keep navigation typed, add focused tests, preserve state, and keep the diff scoped.

**Do not:** introduce Expo Router into this existing state navigator, duplicate a screen under two owners, add a new global provider for one screen, hardcode English/colors/direction, redesign Home, or leave navigation/back wiring for a later pass.
