# Brand Guidelines & Visual Design Specification

This document details the brand tokens, design constraints, and implementation rules for the Islamic application UI.

---

## 1. Color Palette

The app utilizes a dual-theme system (`paper` as default light mode, `ink` as dark mode), centered on organic earth, parchment, and green tones.

### 1.1 Brand Tokens
```ts
// src/lib/constants.ts -> THEME_COLORS.paper
bgBase: '#F4EEDE',          // Canonical cream brand surface (RGB 244, 238, 222)
bgSurface: '#FFFFFF',       // Elevated white surfaces
cardElevated: '#FFFFFF',    // Crisp white card container
forestGreen: '#105A4B',     // Core primary forest green (RGB 16, 90, 75)
forestDark: '#0B3F34',      // Deep forest green accent & pill text
sage: '#3F6E5F',            // Secondary muted sage
sageDim: '#E0EAE5',         // Gentle sage container wash
sagePill: '#DBE7E1',        // Capability pill badge background
iconCircleBg: '#E0EAE5',    // Standard circular icon badge background
iconCircleFg: '#105A4B',    // Icon glyph within circular badge
textPrimary: '#112620',     // Warm dark ink
textSecondary: '#4A5B53',   // Neutral reading ink
textMuted: '#708279',       // Subtle metadata & hint ink
borderSubtle: '#E6DFC9',    // Warm hairline border
borderStrong: '#BFB499',    // High-contrast border
```

### 1.2 Dark Mode Contract
When `mode === 'ink'`:
- Backgrounds switch to obsidian `#0E1214` and surface `#151B1E`.
- `forestGreen` becomes `#10B981` (accessible luminance on dark surfaces).
- `iconCircleBg` transitions to `rgba(16, 185, 129, 0.16)` with `#34D399` glyphs.
- Never use pure black (`#000000`) or cold slate (`#0F172A`).

---

## 2. Typography

All typography is rendered using loaded Google Fonts via Expo Font.

### 2.1 Typefaces
1. **Instrument Serif** (`InstrumentSerif_400Regular`, `InstrumentSerif_400Regular_Italic`):
   - Used for display titles, headers, screen hero statements, and brand accents.
   - Characterized by tall ascenders, high-contrast strokes, and editorial warmth.
2. **Manrope** (`Manrope_400Regular`, `Manrope_500Medium`, `Manrope_600SemiBold`, `Manrope_700Bold`):
   - Modern, geometric sans-serif for UI labels, lists, buttons, subtitles, and descriptions.
3. **Amiri** (`Amiri_400Regular`, `Amiri_700Bold`):
   - Classical Naskh Arabic typeface for Quran verses, Hadith Arabic text, and RTL screen titles/eyebrows.
4. **Noto Naskh Arabic** (`NotoNaskhArabic_400Regular`, `NotoNaskhArabic_700Bold`):
   - Clean, modern Arabic typeface used in reciter names, secondary Arabic cards, and Tajweed text.

### 2.2 RTL & Localization Typographic Contract
- When `isRTL()` is true:
  - Screen titles dynamically swap from `InstrumentSerif_400Regular` to `Amiri_700Bold` to guarantee proper Arabic script rendering, baseline alignment, and diacritics support.
  - Eyebrows swap from `Manrope_600SemiBold` to `Amiri_400Regular`.
  - Body text uses `Amiri_400Regular` or `NotoNaskhArabic_400Regular`.

---

## 3. Spacing & Grid System

Consistent 4px/8px modular scale:
- `4px`: Micro gap (icon to text, badges)
- `8px`: Standard gap between elements
- `12px`: Medium card gap
- `16px`: Comfortable row padding
- `20px`: Standard screen horizontal padding, card internal padding
- `24px`: Section margin bottom
- `32px`: Screen top/bottom margins

---

## 4. Radii & Surface Styling

| Element Type | Border Radius | Border Width | Border Color | Background |
| :--- | :--- | :--- | :--- | :--- |
| **Panel / Settings Group** | `20–24px` | 1px | `colors.borderSubtle` | `colors.cardElevated` |
| **Standard Card (`Card.tsx`)** | `18–20px` | 1px | `colors.borderSubtle` | `colors.cardElevated` |
| **Item / Row inside Panel** | `14–16px` | 1px or 0 | `colors.borderSubtle` | transparent or `colors.bgSurface` |
| **Pill Badges** | `12–14px` | 0 | none | `colors.sagePill` |
| **Icon Badges (`iconCircle`)** | `50%` (half width) | 0 | none | `colors.iconCircleBg` |
| **Primary Buttons** | `24–28px` (pill) | 0 | none | `colors.forestGreen` |

---

## 5. Iconography Rules

- Always use `@expo/vector-icons` (`Ionicons` preferred).
- **Group/Menu Row Icons**:
  - Encapsulated in a circular container: `width: 38`, `height: 38`, `borderRadius: 19`.
  - Background: `colors.iconCircleBg` (`#E2EDE8`).
  - Glyph color: `colors.iconCircleFg` (`#144D3F`).
  - Size: 18–20px.
- **Chevrons**:
  - Circular accessory wrap (`width: 32`, `height: 32`, `borderRadius: 16`, `borderWidth: 1`, `borderColor: colors.borderSubtle`).
  - RTL-aware: Automatically flip between `chevron-forward` and `chevron-back`.

---

## 6. Responsive Breakpoints

The application supports widths from narrow mobile to desktop:
- **320px (Compact / iPhone SE 1st gen)**:
  - Padding: 16px.
  - Headers drop to 21px font size; compact rows with flexible text wrapping.
- **360px–390px (Standard Mobile / Android & iPhone)**:
  - Padding: 20px.
  - Standard headers: 24px–28px font size.
- **412px (Phablet / Galaxy S / Pixel Pro)**:
  - Standard full layout.
- **600px–1024px (Tablet & Desktop / Web)**:
  - Content width is constrained: `maxWidth: 680px`, `alignSelf: 'center'`.
  - Background margins show the warm `colors.bgBase` paper texture.

---

## 7. Accessibility & Touch Targets

- Minimum touch target: 44x44px. All buttons use `hitSlop` or explicit minWidth/minHeight of 40–44px.
- High contrast: Text colors (`textPrimary` #1C1917 on #F4F1EA and #FFFFFF) exceed WCAG AAA standards (> 7:1).
- Every interactive element includes explicit `accessibilityRole` and localized `accessibilityLabel`.

---

## 8. Animation Principles & Approved Brand Motifs

Animation is employed with editorial dignity and contemplative restraint. It creates subtle atmosphere without ever demanding attention or compromising responsiveness.

### 8.1 Motion Rules
1. **Calm Cadence**: Looping ambient animations use slow sinusoids (3200ms–4200ms) with small displacements (scale: 0.98–1.03, translation: ≤3px).
2. **Reduced Motion**: All animations subscribe to `usePrefersReducedMotion()`. When active, loops pause immediately at neutral geometric rest; interactive screen transitions execute with 0ms duration (instantaneous cut).
3. **Crossfade Mechanics**: Screen-level theme transitions use React Native Animated `opacity` crossfades (280ms duration) with native driver where available. Avoid animating unsupported native color string props directly to prevent platform rendering discrepancies.
4. **Lifecycle Hygiene**: Every animation loop explicitly halts via `animation.stop()` when unmounted; zero background timers or memory leaks.

### 8.2 Approved Motifs
- **Crescent & Star Orbit (`AnimatedCrescentOrbit`)**: Classical Islamic crescent with an orbiting 8-point star executing a calm vertical float (3800ms loop, `Easing.inOut(Easing.sin)`).
- **Geometric Arabesque Khatim (`AnimatedArabesqueKhatim`)**: 8-point Islamic star formed by interlocking squares, pulsing gently (4200ms loop, `Easing.inOut(Easing.quad)`).
- **Brand Badge Arch (`AnimatedBrandBadge`)**: Minaret arch squircle mark wrapped in a soft breathing aura ring (3200ms loop).
- **Onboarding Theme Switcher (`OnboardingThemeToggle`)**: 44x44pt touch target button at the top-right of the onboarding flow. Animates rotation (0° ↔ 180°) and scale micro-rebound upon switching between dark (sun) and light (crescent) mode.

---

## 9. Splash Screen & Adaptive Icon Specifications

Launch screens must adhere to exact brand hex values to ensure an anti-flash, seamless transition from OS boot to app interaction.

### 9.1 Anchor Colors
- **Light Splash Background**: `#F4EEDE` (RGB 244, 238, 222)
- **Dark Splash Background**: `#0E1214` (RGB 14, 18, 20)
- **Light Splash Glyph**: `#0E1214` (ink, matching `assets/splash-icon-ink.png`)
- **Dark Splash Glyph**: `#F4EEDE` (ivory, matching `assets/splash-icon.png`)
- **Splash Light Accent / Slit**: `#105A4B` (RGB 16, 90, 75)
- **Splash Dark Accent / Slit**: `#10B981` (RGB 16, 185, 129)
- **Android Adaptive Icon Background**: `#105A4B` (RGB 16, 90, 75)

### 9.2 Anti-Flash Verification Contract
- `app.json` config, `android/app/src/main/res/values/colors.xml`, and the corner pixels of all `android/app/src/main/res/drawable-*/splashscreen_logo.png` density bitmaps must match RGB (244, 238, 222, 255) identically.
- Android 12+ (v31) styles in `values-v31` and `values-night-v31` link directly to `@color/splashscreen_background` and `#0E1214`.
- Standalone physical-device verification is mandatory prior to any production release.
