import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { nextThemeMode } from '../src/lib/themeMode.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

assert.equal(nextThemeMode('paper'), 'ink', 'Light mode must switch directly to dark mode');
assert.equal(nextThemeMode('ink'), 'paper', 'Dark mode must switch directly to light mode');

const theme = read('src/lib/theme.tsx');
assert.ok(theme.includes('setThemeMode(nextThemeMode(mode))'), 'Theme toggle must target the opposite visible mode');
assert.ok(theme.includes('const contextValue = useMemo<ThemeContextValue>'), 'Theme context value must stay stable when unrelated settings change');
const settings = read('src/lib/settings.tsx');
assert.ok(settings.includes('const setThemeMode = useCallback(') && settings.includes('const setAccentKey = useCallback('), 'Theme settings setters must stay stable between unrelated settings updates');

const header = read('src/components/layout/AppHeader.tsx');
assert.ok(header.includes("mode === 'ink' ? 'sunny-outline' : 'moon-outline'"), 'Appearance icon must show the mode the button will switch to');
assert.ok(header.includes('width: 38') && header.includes('height: 38'), 'App header action buttons must be more visible');
assert.ok(header.includes('accessibilityState={{ selected: mode === \'ink\' }}'), 'Appearance control must expose its active state');
assert.ok(read('src/components/layout/layout.constants.ts').includes('HEADER_ROW_HEIGHT = 40'), 'Header row must grow with the larger action buttons');

const home = read('src/screens/HomeScreen.tsx');
assert.ok(home.includes("alignSelf: isRTL() ? 'flex-end' : 'flex-start'"), 'Home prayer progress fill must grow from the RTL start edge');
assert.ok(home.includes("right: isRTL() ? `${Math.round(progress * 100)}%` : undefined"), 'Home prayer progress knob must follow the RTL start edge');

const library = read('src/screens/LibraryScreen.tsx');
assert.ok(library.includes('paddingEnd: heroTextPadding'), 'Library hero text must reserve the decorative book area at logical end');
assert.ok(library.includes('end: heroBooksOffset'), 'Library hero books must anchor to logical end');

const tools = read('src/screens/ToolsScreen.tsx');
assert.ok(tools.includes('rtl && styles.liveThumbnailRtl'), 'Tools broadcast artwork must mirror with RTL text');
assert.ok(tools.includes('paddingStart: 12') && tools.includes('marginStart: 8.3'), 'Tools rows must use logical horizontal spacing');

const screenRoot = path.join(root, 'src/screens');
const screenFiles = [];
function collectScreens(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) collectScreens(target);
    else if (entry.isFile() && target.endsWith('.tsx')) screenFiles.push(target);
  }
}
collectScreens(screenRoot);
const physicalSpacing = /\b(?:margin|padding)(?:Left|Right)\s*:/;
for (const file of screenFiles) {
  assert.doesNotMatch(fs.readFileSync(file, 'utf8'), physicalSpacing, `${path.relative(root, file)} must use logical horizontal spacing in RTL layouts`);
}

console.log(`✓ Theme switching and RTL card spacing verified across ${screenFiles.length} screens`);
