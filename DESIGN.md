# Islamic App — Canonical Visual System & Brand Guidelines (DESIGN.md)

This document establishes the authoritative visual system for the entire application, derived from the reference brand specification. Every screen, component, modal, card, dialog, and state in the app must adhere to these tokens and patterns.

---

## 1. Core Visual Identity

The design language embodies a calm, elevated, and authentic Islamic aesthetic:
- **Tone**: Spacious, refined, warm, and intentional. Free of generic SaaS tropes, loud purple gradients, cluttered cards, or decorative noise.
- **Surface Philosophy**: Warm ivory/paper base with crisp, elevated white surfaces for content groupings and interactive settings panels.
- **Color Temperature**: Earthy and organic—warm cream, deep forest green, and soft sage accents.
- **Typography Pairing**: High-contrast pairing of editorial serif display headlines (`InstrumentSerif_400Regular`) with humanistic, legible sans-serif UI copy (`Manrope`). Authentic Arabic calligraphy fonts (`Amiri`, `NotoNaskhArabic`) for sacred texts and RTL headings.

---

## 2. Color Palette Tokens

All colors are exposed through `useTheme()` and defined in [`src/lib/constants.ts`](file:///home/ubuntu/apps/islamic_app/src/lib/constants.ts) under `THEME_COLORS`.

### 2.1 Paper / Light Brand System (Default)
| Token Name | Hex Code | Semantic Role |
| :--- | :--- | :--- |
| `bgBase` | `#F4EEDE` | Root window background, canonical cream brand surface (RGB 244, 238, 222) |
| `bgSurface` | `#FFFFFF` | Elevated cards, action sheets, settings panels |
| `cardElevated` | `#FFFFFF` | Crisp white elevated content cards |
| `forestGreen` | `#105A4B` | Primary brand green (RGB 16, 90, 75), high-emphasis actions, active states |
| `forestDark` | `#0B3F34` | Deep forest green for high-emphasis accents and pill text |
| `sage` | `#3F6E5F` | Supporting muted accessible green, secondary headlines, icons |
| `sageDim` | `#E0EAE5` | Soft sage wash for card backings and badge backgrounds |
| `sagePill` | `#DBE7E1` | Pill badge background for capabilities, highlights |
| `iconCircleBg` | `#E0EAE5` | Circular icon badge backgrounds |
| `iconCircleFg` | `#105A4B` | Circular icon badge foreground glyphs |
| `textPrimary` | `#112620` | Deep forest-tinted ink, maximum contrast headings & body text |
| `textSecondary`| `#4A5B53` | Medium warm ink, secondary labels, subtitles |
| `textMuted` | `#708279` | Warm muted tone, hints, timestamps, metadata |
| `borderSubtle` | `#E6DFC9` | Warm hairline borders, dividers, subtle card outlines |
| `borderStrong` | `#BFB499` | Interactive element borders, focused inputs |
| `destructive` | `#BA2D2D` | Semantic alerts, deletion, warnings |

### 2.2 Dark Mode (`ink`) Compatibility
The dark mode retains the refined visual tone while ensuring high contrast:
- `bgBase`: `#0E1214` (Deep obsidian)
- `bgSurface`: `#151B1E` (Subtle elevated dark surface)
- `cardElevated`: `#151B1E`
- `forestGreen`: `#10B981` (Brightened emerald for legibility on dark background)
- `sage`: `#34D399`
- `sageDim`: `rgba(16, 185, 129, 0.14)`
- `sagePill`: `rgba(16, 185, 129, 0.18)`
- `iconCircleBg`: `rgba(16, 185, 129, 0.16)`
- `iconCircleFg`: `#34D399`
- `textPrimary`: `#F5F3EC` (Warm ivory text)
- `textSecondary`: `#A3A096`
- `textMuted`: `#6E6B63`
- `borderSubtle`: `#262E33`

---

## 3. Typography Hierarchy

Fonts are loaded globally by `useEditorialFonts()` in [`src/lib/theme.tsx`](file:///home/ubuntu/apps/islamic_app/src/lib/theme.tsx).

| Element | Font Family | Size | Line Height | Case / Letter Spacing |
| :--- | :--- | :--- | :--- | :--- |
| **App Wordmark** | `InstrumentSerif_400Regular` / `Amiri_700Bold` (RTL) | 16–18 | 20 | All caps, +1.2px spacing |
| **Display Title / Hero** | `InstrumentSerif_400Regular` / `Amiri_700Bold` (RTL) | 28–36 | 32–40 | Sentence case, -0.3px spacing |
| **Screen Header Title** | `InstrumentSerif_400Regular` / `Amiri_700Bold` (RTL) | 22–24 | 26–28 | Natural |
| **Eyebrow / Overline** | `Manrope_600SemiBold` / `Amiri_400Regular` (RTL) | 10–11 | 14 | Uppercase, +1.5px spacing |
| **Section Title** | `InstrumentSerif_400Regular` / `Amiri_700Bold` (RTL) | 20–22 | 26 | Natural |
| **Card / Row Heading** | `Manrope_600SemiBold` | 14–16 | 20–22 | Natural |
| **Body UI Text** | `Manrope_400Regular` | 13–15 | 18–22 | Natural |
| **Caption / Meta** | `Manrope_500Medium` / `Manrope_400Regular` | 11–12 | 15–16 | Natural |
| **Quran Arabic** | `Amiri_400Regular` / `NotoNaskhArabic_700Bold` | User pref | Scaled 1.8x | Right-aligned / RTL |

---

## 4. Surfaces, Corners & Elevation

1. **Radii Tokens**:
   - Elevated Cards (`Card`, setting groups, hero cards): `borderRadius: 18–24` (preferred: `20` for standard cards, `24` for full grouped panels).
   - Inner Items & Rows within a card: `borderRadius: 14–16`.
   - Small Badges & Pills (`sagePill`): `borderRadius: 12–14`.
   - Circular Elements (icon circles, chevrons, close buttons, dial, play buttons): `borderRadius: width / 2`.
2. **Borders**:
   - Always 1px solid `colors.borderSubtle` (`#ECE5DB`).
   - No heavy drop shadows; use soft, warm shadow:
     ```ts
     shadowColor: '#1C1917',
     shadowOffset: { width: 0, height: 2 },
     shadowOpacity: 0.05,
     shadowRadius: 8,
     elevation: 2,
     ```

---

## 5. Screen Composition Standards

Every primary screen must follow a cohesive anatomy:
1. **Root Screen Container**:
   - `backgroundColor: colors.bgBase` (`#F4F1EA`).
   - Centered content width on tablet/desktop: `maxWidth: 680`, `alignSelf: 'center'`, `width: '100%'`.
2. **Header**:
   - Standard [`ScreenHeader`](file:///home/ubuntu/apps/islamic_app/src/components/ScreenHeader.tsx) with serif title, optional eyebrow, circular back button (`touchTargetTokens.hitSlop8`), and optional right actions.
3. **Card Groups**:
   - Wrap related rows into an elevated white panel (`backgroundColor: colors.cardElevated`, `borderRadius: 20–24`, `borderWidth: 1`, `borderColor: colors.borderSubtle`).
   - Group rows feature:
     - Left: Circular sage icon badge (`width: 38`, `height: 38`, `borderRadius: 19`, `backgroundColor: colors.iconCircleBg`, `color: colors.iconCircleFg`).
     - Center: Title (`Manrope_600SemiBold`) + optional subtitle (`Manrope_400Regular`, `colors.textSecondary`).
     - Right: Compact circular chevron or disclosure button.
4. **Primary CTAs**:
   - Deep forest green (`#105A4B`) background, full-width or pill container (`borderRadius: 24–28`).
   - White text (`#FFFFFF`, `Manrope_600SemiBold`), accompanied by a circular accessory icon.

---

## 6. Animation Principles & Approved Brand Motifs

Animation in the Islamic app is purposeful, calm, devotional, and restrained. It exists to honor the contemplative editorial atmosphere, never to distract or perform gratuitous acrobatics.

### 6.1 Core Animation Philosophy
1. **Devotional Restraint**:
   - Never animate every icon. Do not use rapid bouncing, endless spinning, or jarring elastic wobbles.
   - Micro-motion uses slow, organic respiratory cadences (3200ms–4200ms cycles) with gentle amplitudes (scale variance ≤ 4%, translation ≤ 3px).
2. **Reduced-Motion by Default**:
   - Every animated element must observe `usePrefersReducedMotion()` / `AccessibilityInfo.isReduceMotionEnabled()`.
   - When reduced motion is active, looping motion immediately halts and rests at static canonical geometry. Screen crossfades reduce to an instantaneous transition (0ms).
3. **No Leaked Timers & Pure Opacity Transitions**:
   - All animated loops and timers must be terminated on component unmount via `animation.stop()`.
   - Theme switches must animate via crossfade layers using `opacity` with `useNativeDriver: true` where possible; avoid animating unsupported native color string props directly to prevent platform rendering bugs.

### 6.2 Approved Brand Icon Motifs ([`AnimatedBrandIcons.tsx`](file:///home/ubuntu/apps/islamic_app/src/components/AnimatedBrandIcons.tsx))
- **`AnimatedCrescentOrbit`**: A classical Islamic crescent moon coupled with a gently orbiting 8-point star. Uses `Easing.inOut(Easing.sin)` over a 3800ms period with a subtle 3px vertical float.
- **`AnimatedArabesqueKhatim`**: The authentic 8-point geometric star (Rub el Hizb / Khatim al-Sulayman) with interlocking squares, breathing at a 4200ms cadence (`Easing.inOut(Easing.quad)`).
- **`AnimatedBrandBadge`**: The signature arch squircle brand mark with a soft ambient aura wash (`rgba(16, 90, 75, 0.16)` in light, `rgba(16, 185, 129, 0.28)` in dark) pulsing over 3200ms.
- **`OnboardingThemeToggle`**: 44x44pt accessible theme toggle at the top-right of onboarding. Features an animated spring rotation (`0deg` ↔ `180deg`) and scale micro-rebound (`0.82` → `1.0`) when switching between light (crescent moon) and dark (radiant sun).

---

## 7. Native Splash Screen & System Colors

The native launch screen and initial JS splash transition strictly match the canonical brand identity to prevent any jarring color flashes or brightness jumps during boot.

### 7.1 Exact Color Anchors
| Target | Light Mode Token | Dark Mode Token | Role |
| :--- | :--- | :--- | :--- |
| **Splash Background** | `#F4EEDE` (RGB 244, 238, 222) | `#0E1214` (RGB 14, 18, 20) | Root launch window background |
| **Splash Logo Glyph** | `#0E1214` (ink) | `#F4EEDE` (ivory) | Exact match with `splash-icon-ink.png` / `splash-icon.png` |
| **Splash Accent / Slit** | `#105A4B` (primary green) | `#10B981` (emerald green) | Slit light opening & tagline |
| **Adaptive Icon Base** | `#105A4B` (RGB 16, 90, 75) | `#105A4B` (RGB 16, 90, 75) | Android launcher adaptive background |

### 7.2 Anti-Flash Architecture
1. **Config Alignment**: `app.json` declares `splash.backgroundColor = "#F4EEDE"`, `splash.dark.backgroundColor = "#0E1214"`, and `adaptiveIcon.backgroundColor = "#105A4B"`.
2. **Android Resource Mirroring**: `android/app/src/main/res/values/colors.xml` defines `<color name="splashscreen_background">#F4EEDE</color>` and `<color name="iconBackground">#105A4B</color>`.
3. **Density Bitmap Background Purity**: `android/app/src/main/res/drawable-{mdpi,hdpi,xhdpi,xxhdpi,xxxhdpi}/splashscreen_logo.png` bitmaps have corner and border pixels matching RGB (244, 238, 222, 255) byte-for-byte, eliminating any bounding box or rectangular flash on Android 11 and older.
4. **Android 12+ (API 31+) Splash API**: `values-v31/styles.xml` sets `windowSplashScreenBackground` and `windowSplashScreenIconBackgroundColor` to `@color/splashscreen_background`, while `values-night-v31/styles.xml` anchors them to `#0E1214`.
5. **Physical Device Verification**: Standalone release-build physical device verification remains strictly required before production releases.
