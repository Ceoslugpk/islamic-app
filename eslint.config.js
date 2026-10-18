// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

// Local rule plugin enforcing no raw color literals in UI styles
const colorLiteralsPlugin = {
  rules: {
    'no-color-literals': {
      meta: {
        type: 'problem',
        docs: {
          description: 'Disallow raw hex/rgb/rgba/hsl/hsla color literals in text/style props',
        },
        schema: [],
        messages: {
          noColorLiteral:
            'Raw color literal "{{color}}" is disallowed. Use semantic theme tokens instead.',
        },
      },
      create(context) {
        const COLOR_REGEX = /^#(?:[0-9a-fA-F]{3,8})$|^rgba?\(|^hsla?\(/i;
        return {
          Property(node) {
            if (
              node.key &&
              (node.key.name === 'color' || node.key.value === 'color') &&
              node.value &&
              node.value.type === 'Literal' &&
              typeof node.value.value === 'string' &&
              COLOR_REGEX.test(node.value.value.trim())
            ) {
              context.report({
                node: node.value,
                messageId: 'noColorLiteral',
                data: { color: node.value.value },
              });
            }
          },
        };
      },
    },
  },
};

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
  },
  {
    // Scoped restrictions for screens and UI components
    files: [
      "src/screens/**/*.{ts,tsx,js,jsx}",
      "src/components/**/*.{ts,tsx,js,jsx}",
    ],
    ignores: [
      "src/components/ui/AppText.tsx",
      // Approved Arabic/native exceptions
      "src/components/ArabicText.tsx",
      "src/components/TajweedText.tsx",
      "src/screens/QuranReaderScreen.tsx",
      "src/screens/LibraryScreen.tsx",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "react-native",
              importNames: ["Text"],
              message:
                "Direct Text import from react-native is prohibited outside approved text components. Use AppText from src/components/ui/AppText instead.",
            },
            {
              name: "../lib/constants",
              importNames: ["palette"],
              message:
                "Direct palette import is prohibited in UI components. Use dynamic tokens from useTheme() or useThemeTokens().",
            },
            {
              name: "../../lib/constants",
              importNames: ["palette"],
              message:
                "Direct palette import is prohibited in UI components. Use dynamic tokens from useTheme() or useThemeTokens().",
            },
            {
              name: "../theme/tokens",
              importNames: ["textTokens"],
              message:
                "Direct static textTokens import is prohibited in UI components. Use dynamic tokens from useTheme() or useThemeTokens().",
            },
            {
              name: "../../theme/tokens",
              importNames: ["textTokens"],
              message:
                "Direct static textTokens import is prohibited in UI components. Use dynamic tokens from useTheme() or useThemeTokens().",
            },
          ],
        },
      ],
    },
  },
  {
    // Color literals restriction
    files: [
      "src/screens/**/*.{ts,tsx,js,jsx}",
      "src/components/**/*.{ts,tsx,js,jsx}",
    ],
    ignores: [
      "src/theme/**",
      "src/lib/constants.ts",
      "src/lib/homeThemeTokens.ts",
      "src/lib/tajweed.ts",
      "src/lib/nowPlayingNotification.ts",
      "src/components/PrayerHeroAtmosphere.tsx",
      "src/screens/QuranReaderScreen.tsx",
    ],
    plugins: {
      "react-native": colorLiteralsPlugin,
    },
    rules: {
      "react-native/no-color-literals": "error",
    },
  },
  {
    // Header gap guardrail: disallow manual top margin/padding on first children inside shared wrappers
    files: [
      "src/screens/**/*.{ts,tsx}",
    ],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "JSXElement[openingElement.name.name=/^(DetailScreen|TabScreen)$/] > JSXElement:first-child JSXAttribute[name.name='style'] Property[key.name=/^(marginTop|paddingTop)$/][value.value>0]",
          message: "First child inside shared screen wrapper (DetailScreen/TabScreen) must not define marginTop or paddingTop. Header spacing is owned exclusively by the shared wrapper via CONTENT_GAP."
        }
      ]
    }
  },
]);
