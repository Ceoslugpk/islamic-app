#!/usr/bin/env node
/**
 * scripts/check-colors.js
 *
 * PHASE 3 BATCH 16A — Static Color & Text Guardrails Scanner
 *
 * Verifies the text-color and AppText migration contract across the real repository:
 * 1. Prohibits direct `Text` imports from `react-native` outside approved exceptions.
 * 2. Prohibits ordinary `<Text>` tags outside approved exceptions.
 * 3. Prohibits direct static `palette` and `textTokens` imports in UI screens & components.
 * 4. Prohibits unauthorized raw hex/rgb/rgba/hsl/hsla text colors and direct text color styles.
 * 5. Prohibits hardcoded dark-mode token literals in UI code.
 *
 * Preserves explicit narrow allowlists for non-text SVG/icons/brand tokens and approved Arabic components.
 * Reports file/line findings and exits nonzero on any violation.
 */

/* global __dirname */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const SRC_DIR = path.join(ROOT_DIR, 'src');

// Approved exception files for direct Text import / usage
const APPROVED_TEXT_IMPORT_EXCEPTIONS = new Set([
  'src/components/ui/AppText.tsx',
  'src/components/ArabicText.tsx',
  'src/components/TajweedText.tsx',
  'src/screens/QuranReaderScreen.tsx',
  'src/screens/LibraryScreen.tsx', // Approved only for 3 Arabic book-spine labels
]);

// Approved theme definitions / design token files (allowed to define raw palette constants)
const THEME_TOKEN_FILES = new Set([
  'src/theme/tokens.ts',
  'src/lib/constants.ts',
  'src/lib/homeThemeTokens.ts',
  'src/lib/theme.tsx',
  'src/lib/tajweed.ts', // Quranic tajweed rule color metadata
  'src/lib/nowPlayingNotification.ts', // System notification accent
  'src/components/PrayerHeroAtmosphere.tsx', // Sky lighting atmosphere gradients
]);

// Dark mode token literals that must not be hardcoded in UI text styling
const DARK_MODE_TEXT_TOKEN_LITERALS = [
  '#F3EEDD',
  '#A8A6AE',
  '#E6BE6C',
  '#EECA80',
  '#1A1408',
  '#F6F0E1',
  '#B0AEB8',
  '#E07A70',
  '#6E6C78',
];

function walkDir(dir) {
  let files = [];
  for (const item of fs.readdirSync(dir)) {
    const full = path.join(dir, item);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      files.push(...walkDir(full));
    } else if (/\.(tsx?|jsx?)$/.test(item)) {
      files.push(full);
    }
  }
  return files;
}

function stripComments(content) {
  // Strip block comments /* ... */ while preserving line count
  let cleaned = content.replace(/\/\*[\s\S]*?\*\//g, (match) => {
    return '\n'.repeat(match.split('\n').length - 1);
  });
  // Strip single-line comments // ...
  cleaned = cleaned.replace(/\/\/[^\n]*/g, '');
  return cleaned;
}

function runColorCheck() {
  const allFiles = walkDir(SRC_DIR);
  const findings = [];

  for (const filePath of allFiles) {
    const relPath = path.relative(ROOT_DIR, filePath).replace(/\\/g, '/');
    const rawContent = fs.readFileSync(filePath, 'utf8');
    const lines = rawContent.split('\n');
    const cleanedContent = stripComments(rawContent);
    const cleanedLines = cleanedContent.split('\n');

    const isThemeFile = THEME_TOKEN_FILES.has(relPath);
    const isApprovedTextFile = APPROVED_TEXT_IMPORT_EXCEPTIONS.has(relPath);

    // 1. Check for direct Text import from 'react-native'
    // Matches: import { ..., Text, ... } from 'react-native';
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (/from\s+['"]react-native['"]/.test(line) && /\bText\b/.test(line)) {
        if (!isApprovedTextFile) {
          findings.push({
            file: relPath,
            line: i + 1,
            rule: 'no-direct-text-import',
            message: `Direct 'Text' import from 'react-native' is prohibited outside approved text components. Use 'AppText' from 'src/components/ui/AppText' instead.`,
          });
        }
      }
    }

    // Multiline import check for 'react-native'
    const multilineRnImports = cleanedContent.match(/import\s+(?:\{[^}]*\}|\w+)\s+from\s+['"]react-native['"]/gs) || [];
    for (const imp of multilineRnImports) {
      if (/\bText\b/.test(imp) && !isApprovedTextFile) {
        // Find line number
        const idx = cleanedContent.indexOf(imp);
        const lineNum = cleanedContent.slice(0, idx).split('\n').length;
        if (!findings.some((f) => f.file === relPath && f.line === lineNum && f.rule === 'no-direct-text-import')) {
          findings.push({
            file: relPath,
            line: lineNum,
            rule: 'no-direct-text-import',
            message: `Direct 'Text' import from 'react-native' is prohibited outside approved text components. Use 'AppText' from 'src/components/ui/AppText' instead.`,
          });
        }
      }
    }

    // 2. Check for direct static palette or textTokens import in screens/components
    if ((relPath.startsWith('src/screens/') || relPath.startsWith('src/components/')) && !isThemeFile) {
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (/import\s+.*\{[^}]*\bpalette\b[^}]*\}\s+from\s+['"].*constants['"]/.test(line)) {
          findings.push({
            file: relPath,
            line: i + 1,
            rule: 'no-static-palette-import',
            message: `Direct 'palette' import is prohibited in UI components. Use dynamic tokens via useTheme() or useThemeTokens().`,
          });
        }
        if (/import\s+.*\{[^}]*\btextTokens\b[^}]*\}\s+from\s+['"].*tokens['"]/.test(line)) {
          findings.push({
            file: relPath,
            line: i + 1,
            rule: 'no-static-text-tokens-import',
            message: `Direct static 'textTokens' import is prohibited in UI components. Use dynamic tokens via useTheme() or useThemeTokens().`,
          });
        }
      }
    }

    // 3. Check for ordinary <Text> tags
    if (!isApprovedTextFile) {
      for (let i = 0; i < cleanedLines.length; i++) {
        const line = cleanedLines[i];
        if (/<\s*Text\b/.test(line)) {
          findings.push({
            file: relPath,
            line: i + 1,
            rule: 'no-raw-text-tag',
            message: `Direct '<Text>' tag is prohibited. Use '<AppText>' from 'src/components/ui/AppText' instead.`,
          });
        }
      }
    } else if (relPath === 'src/screens/LibraryScreen.tsx') {
      // LibraryScreen is approved strictly for the 3 Arabic book-spine labels with NotoNaskh font
      let rawTextCount = 0;
      for (let i = 0; i < cleanedLines.length; i++) {
        const line = cleanedLines[i];
        if (/<\s*Text\b/.test(line)) {
          rawTextCount++;
          // Ensure it's for book-spine label
          const contextWindow = cleanedLines.slice(i, i + 8).join(' ');
          if (!contextWindow.includes('bookArabicTitle') && !contextWindow.includes('fontNotoNaskh')) {
            findings.push({
              file: relPath,
              line: i + 1,
              rule: 'no-unapproved-library-text-tag',
              message: `Unapproved '<Text>' tag in LibraryScreen. Only the 3 Arabic book-spine labels are allowed.`,
            });
          }
        }
      }
      if (rawTextCount > 3) {
        findings.push({
          file: relPath,
          line: 1,
          rule: 'excessive-library-text-tags',
          message: `Expected at most 3 Arabic book-spine <Text> tags in LibraryScreen, found ${rawTextCount}.`,
        });
      }
    }

    // 4. Check for unauthorized raw hex/rgb/rgba/hsl/hsla text colors and direct text color styles
    if (!isThemeFile) {
      for (let i = 0; i < cleanedLines.length; i++) {
        const line = cleanedLines[i];
        const trimmed = line.trim();

        // Check for text style property: color: '#...' or color: 'rgba(...)'
        if (/\bcolor\s*:\s*['"](?:#[0-9a-fA-F]{3,8}|rgba?\(|hsla?\()/.test(trimmed)) {
          // Allowlist checks:
          // A. Non-text SVG components (fill/stroke)
          if (/<(?:Path|Circle|Rect|Svg|Line|Polygon|G)\b/.test(line)) continue;
          // B. Icon components (<Ionicons, <Feather, etc. - allowed to have tint)
          if (/<(?:Ionicons|MaterialIcons|MaterialCommunityIcons|FontAwesome|FontAwesome5|Feather|Octicons|AntDesign|Entypo|SimpleLineIcons|BookStarEmblem|TabIcon)\b/.test(line)) continue;
          // C. GeometricPattern SVG pattern
          if (/<GeometricPattern\b/.test(line) || /tileSize=/.test(line)) continue;
          // D. QuranReader ayah highlight palette definitions
          if (relPath === 'src/screens/QuranReaderScreen.tsx' && /\{\s*name:\s*['"][^'"]+['"],\s*color:\s*['"]#/.test(line)) continue;

          // If it matches a raw color literal on color: property in UI code
          const colorMatch = trimmed.match(/\bcolor\s*:\s*(['"][^'"]+['"])/);
          const colorVal = colorMatch ? colorMatch[1] : 'literal';
          findings.push({
            file: relPath,
            line: i + 1,
            rule: 'no-raw-text-color-literal',
            message: `Unauthorized raw color literal ${colorVal} on 'color' property. Use semantic theme tokens instead.`,
          });
        }

        // 5. Check for hardcoded dark-mode token literals in UI code
        for (const darkToken of DARK_MODE_TEXT_TOKEN_LITERALS) {
          if (trimmed.includes(darkToken)) {
            // Check context window (previous 5 lines and current line) to see if inside non-text SVG/icon component
            const startContext = Math.max(0, i - 5);
            const contextWindow = cleanedLines.slice(startContext, i + 1).join(' ');
            if (
              contextWindow.includes('GeometricPattern') ||
              contextWindow.includes('BookStarEmblem') ||
              contextWindow.includes('TabIcon') ||
              contextWindow.includes('Svg') ||
              contextWindow.includes('Path')
            ) {
              continue;
            }
            if (line.includes('//') || line.includes('/*')) continue;

            findings.push({
              file: relPath,
              line: i + 1,
              rule: 'no-dark-mode-token-literal',
              message: `Hardcoded dark mode token literal ${darkToken} found. Dynamic tokens from useTheme() or useThemeTokens() must be used.`,
            });
          }
        }
      }
    }
  }

  // Summary and Exit
  console.log('='.repeat(70));
  console.log('PHASE 3 BATCH 16A — STATIC COLOR & TEXT GUARDRAILS SCANNER');
  console.log('='.repeat(70));
  console.log(`Scanned ${allFiles.length} files under src/`);

  if (findings.length > 0) {
    console.error(`\n[FAIL] Found ${findings.length} guardrail violation(s):\n`);
    findings.forEach((f, idx) => {
      console.error(`  ${idx + 1}. ${f.file}:${f.line} [${f.rule}]`);
      console.error(`     ${f.message}\n`);
    });
    process.exit(1);
  } else {
    console.log('\n[PASS] Zero guardrail violations found across all scanned files.');
    console.log('  ✓ No unauthorized Text imports from react-native');
    console.log('  ✓ No ordinary <Text> tags outside approved exceptions');
    console.log('  ✓ No direct static palette/textTokens imports in UI screens & components');
    console.log('  ✓ No unauthorized raw hex/rgb/rgba/hsl text colors in text styling');
    console.log('  ✓ No hardcoded dark-mode token literals');
    console.log('  ✓ Narrow allowlists verified for approved Arabic/native exceptions\n');
    process.exit(0);
  }
}

runColorCheck();
