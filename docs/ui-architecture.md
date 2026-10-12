# UI Architecture & Component Guidelines

This guide specifies how screens and UI components are structured in this codebase, which shared tokens and components to utilize, and rules for adding or refactoring screens.

---

## 1. Shared Tokens & Component Directory

Always use the shared primitives rather than re-implementing styles or inline hex values:

| Component / Utility | Location | Role |
| :--- | :--- | :--- |
| `useTheme()` | [`src/lib/theme.tsx`](file:///home/ubuntu/apps/islamic_app/src/lib/theme.tsx) | Theme context providing dynamic `colors`, `mode`, and `palette` |
| `THEME_COLORS` | [`src/lib/constants.ts`](file:///home/ubuntu/apps/islamic_app/src/lib/constants.ts) | Canonical source for all color values |
| `ScreenHeader` | [`src/components/ScreenHeader.tsx`](file:///home/ubuntu/apps/islamic_app/src/components/ScreenHeader.tsx) | Standard top app bar with serif title, back navigation, and right actions |
| `SectionHeader` | [`src/components/SectionHeader.tsx`](file:///home/ubuntu/apps/islamic_app/src/components/SectionHeader.tsx) | Category / grouping header with eyebrow, title, and subtitle |
| `Card` | [`src/components/Card.tsx`](file:///home/ubuntu/apps/islamic_app/src/components/Card.tsx) | Rounded container with `cardElevated` background and `borderSubtle` |
| `EmptyState` | [`src/components/EmptyState.tsx`](file:///home/ubuntu/apps/islamic_app/src/components/EmptyState.tsx) | Refined zero-data state with circular icon, title, description, and CTA |
| `QuickActionsStrip` | [`src/components/QuickActionsStrip.tsx`](file:///home/ubuntu/apps/islamic_app/src/components/QuickActionsStrip.tsx) | Standard scrollable action pills on Home/Quran screens |
| `LanguagePickerModal` | [`src/components/LanguagePickerModal.tsx`](file:///home/ubuntu/apps/islamic_app/src/components/LanguagePickerModal.tsx) | Standard bottom-sheet modal for language and reciter selection |
| `iconSizes`, `getBackIcon` | [`src/lib/iconMap.ts`](file:///home/ubuntu/apps/islamic_app/src/lib/iconMap.ts) | Standardized icon sizes and direction-aware back button resolver |
| `touchTargetTokens` | [`src/lib/buttonTokens.ts`](file:///home/ubuntu/apps/islamic_app/src/lib/buttonTokens.ts) | Canonical minimum touch target helpers and hitSlops |

---

## 2. Screen Composition Pattern

Every screen inside `src/screens/` should adhere to this template:

```tsx
import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../lib/theme';
import { ScreenHeader } from '../components/ScreenHeader';
import { Card } from '../components/Card';
import { t } from '../lib/i18n';

interface MyScreenProps {
  onBack?: () => void;
}

export function MyScreen({ onBack }: MyScreenProps) {
  const { colors } = useTheme();

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.bgBase }]} edges={['top', 'left', 'right']}>
      <ScreenHeader
        title={t('Screen Title')}
        eyebrow={t('CATEGORY')}
        onBack={onBack}
        backLabel={t('Back')}
      />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          {/* Grouped Panel */}
          <View style={[styles.panel, { backgroundColor: colors.cardElevated, borderColor: colors.borderSubtle }]}>
            {/* Rows / Content */}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  container: {
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
    paddingHorizontal: 20,
    gap: 16,
  },
  panel: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 16,
    overflow: 'hidden',
  },
});
```

---

## 3. How to Add a New Screen

1. **State Union in `App.tsx`**:
   - Determine which tab the screen belongs to (`home`, `quran`, `library`, or `tools`).
   - Add the screen name to the matching view union in [`App.tsx`](file:///home/ubuntu/apps/islamic_app/App.tsx):
     - `LibraryView`: `'index' | 'names' | 'duas' | ... | 'myNewScreen'`
     - `QuranView`: `'index' | 'reader' | 'audio' | ... | 'myNewScreen'`
     - `ToolsView`: `'index' | 'tasbih' | 'qibla' | ... | 'myNewScreen'`
2. **Wire Entry Point & Back Path**:
   - Add navigation handler in parent hub screen (e.g. `LibraryScreen.tsx`).
   - Render the new component in `App.tsx` under the matching view branch.
   - Forward `onBack={() => setSubView('index')}` to guarantee back navigation.
3. **Localization**:
   - Wrap all user-facing strings with `t('String')`.
   - Add translations to `src/lib/i18n.ts` and language files (`en.json`, `ur.json`, `ar.json`).
4. **Functionality Guard**:
   - Ensure the new view union is recognized and run `node tests/test_ui_redesign_functionality_guard.mjs`.

---

## 4. Explicit Do's and Don'ts

### DO:
- **DO** use `colors.forestGreen` or `colors.accent` for primary buttons and high-emphasis controls.
- **DO** wrap icon badges in circular containers with `colors.iconCircleBg` and `colors.iconCircleFg`.
- **DO** use `InstrumentSerif_400Regular` for LTR titles and `Amiri_700Bold` for RTL titles.
- **DO** constrain wide screens with `maxWidth: 680` and `alignSelf: 'center'`.
- **DO** keep cards rounded with `borderRadius: 18–24`.

### DON'T:
- **DON'T** introduce hardcoded hex colors (e.g., `#10B981`, `#0F172A`, `#E2E8F0`). Use `colors.*` tokens.
- **DON'T** use purple gradients, floating neon buttons, or heavy black drop shadows.
- **DON'T** use React Navigation or Expo Router. Navigation in this app is strictly driven by the typed view state unions in `App.tsx`.
- **DON'T** alter business logic, storage keys, or state management during UI/styling passes.
