# Rendered UI review

The secondary-screen refresh uses the existing cream/charcoal, green, and gold theme. Shared text respects the script of its actual content, keeps Urdu/Arabic joining and glyph height, and keeps clocks/counts compact. Cards separate surface/shadow styling from their inner content layout. Headers, actions, tabs, and guide passages expand with their labels. The Tools hero uses flowing rows instead of fixed prayer-circle coordinates; Hifz separates reading metadata from actions.

Run the normal regression suite, TypeScript, and scoped ESLint first. For a rendered offline review, export the web app and use an available Playwright installation and Chromium:

```sh
EXPO_NO_TELEMETRY=1 npx expo export --platform web
PLAYWRIGHT_MODULE=/path/to/playwright UI_REVIEW_WIDTH=320 UI_REVIEW_LOWER=1 node scripts/review-ui.cjs
PLAYWRIGHT_MODULE=/path/to/playwright UI_REVIEW_WIDTH=393 node scripts/review-ui.cjs
```

`CHROMIUM_PATH` overrides `/usr/bin/chromium`; `UI_REVIEW_OUT` overrides the output directory under `/tmp`. This optional script adds no application dependency. It captures every typed navigation branch plus Settings, legal pages, and backup/restore in English/Urdu and light/dark modes. It asserts no runtime errors or clipped visible text. Inspect screenshots as well: a fitting text box can still be too narrow to read comfortably.

External requests are deliberately blocked. Prayer times are screenshot fixtures stored only in isolated browser contexts. These checks cover layouts and offline/error states, not live APIs, audio, notification delivery, or native Android rendering. Before releasing, verify those behaviors and large system-font settings on a physical Android device, including Urdu-to-English switching and light/dark theme changes.
