import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const read = (file) => fs.readFileSync(path.resolve(file), 'utf8');

const tokens = read('src/theme/tokens.ts');
const card = read('src/components/Card.tsx');
const premiumCard = read('src/components/ui/PremiumCard.tsx');
const shadowTokens = read('src/lib/homeThemeTokens.ts');
const appText = read('src/components/ui/AppText.tsx');
const header = read('src/components/layout/AppHeader.tsx');
const layout = read('src/components/layout/layout.constants.ts');
const tabScreen = read('src/components/layout/TabScreen.tsx');
const detailScreen = read('src/components/layout/DetailScreen.tsx');
const mosqueFinder = read('src/screens/MosqueFinderScreen.tsx');

assert.match(tokens, /borderRadius:\s*18,\s*\n\s*innerRadius:\s*17/);
assert.match(tokens, /standard:\s*\{\s*borderRadius:\s*18,\s*innerRadius:\s*17/);
assert.match(tokens, /listTile:\s*\{\s*borderRadius:\s*16,\s*innerRadius:\s*15/);

assert.match(card, /resolvedRadius\s*=\s*Math\.max\(cardTokens\.borderRadius/);
assert.match(card, /borderColor:\s*tokens\.cardBorder/);
assert.match(card, /borderRadius:\s*resolvedRadius/);
assert.match(premiumCard, /requestedRadius\s*=\s*StyleSheet\.flatten\(style\)\?\.borderRadius/);
assert.match(premiumCard, /Math\.max\([\s\S]*?cardTokens\.borderRadius[\s\S]*?requestedRadius/);
assert.match(premiumCard, /currentTokens\.cardBorder/);
assert.match(premiumCard, /innerRadius\s*=\s*Math\.max\(0,\s*resolvedRadius\s*-\s*1\)/);

assert.match(shadowTokens, /shadowOpacity:\s*0\.10/);
assert.match(shadowTokens, /shadowOpacity:\s*0\.34/);
assert.doesNotMatch(shadowTokens, /rgba\(0,0,0,0\.60\)/);

assert.match(appText, /rowTitle:\s*\{\s*fontSize:\s*13/);
assert.match(appText, /body:\s*\{\s*fontSize:\s*14/);
assert.match(appText, /subtitle:\s*\{\s*fontSize:\s*12/);
const sharedButtonTokens = tokens.match(/export const buttonTokens = \{[^}]+\}/)?.[0] ?? '';
assert.match(sharedButtonTokens, /borderRadius:\s*22/);
assert.match(tokens, /cardBorder:\s*'#DCE4DB'[\s\S]*?goldBorder:\s*'#E2CC9C'/);
assert.match(header, /width:\s*44,[\s\S]*?height:\s*44,[\s\S]*?borderRadius:\s*22/);
assert.match(layout, /HEADER_ROW_HEIGHT = 48/);
assert.match(layout, /SCREEN_CONTENT_MAX_WIDTH = 680/);
assert.match(tabScreen, /styles\.contentFrame[\s\S]*?maxWidth:\s*SCREEN_CONTENT_MAX_WIDTH/);
assert.match(detailScreen, /styles\.contentFrame[\s\S]*?maxWidth:\s*SCREEN_CONTENT_MAX_WIDTH/);
assert.match(mosqueFinder, /searchRowCompact:\s*\{[\s\S]*?flexDirection:\s*'row'/);
assert.match(mosqueFinder, /searchButtonCompact:\s*\{[\s\S]*?minWidth:\s*84/);

const screens = fs.readdirSync('src/screens').filter((file) => file.endsWith('.tsx'));
assert.ok(screens.length >= 45, 'The refresh should cover the existing app-wide screen inventory');

console.log(`✓ Shared card, typography, control, and header refresh contracts pass across ${screens.length} screen modules.`);

// Exercise production AppText rather than duplicating its script/metric logic.
const React = (await import('react')).default;
const ts = (await import('typescript')).default;
function load(file, modules) {
  const { outputText } = ts.transpileModule(read(file), {
    compilerOptions: { jsx: ts.JsxEmit.React, module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  });
  const module = { exports: {} };
  new Function('require', 'module', 'exports', outputText)((name) => {
    assert.ok(name in modules, `Unexpected production import: ${name}`);
    return modules[name];
  }, module, module.exports);
  return module.exports;
}
const flatten = (style) => Object.assign({}, ...[style].flat(Infinity).filter(Boolean));
const native = { Text: 'Text', Platform: { OS: 'android' }, StyleSheet: { create: (s) => s, flatten } };
const type = load('src/lib/typography.ts', {});
let language = 'ur';
const roles = {
  title: 'InstrumentSerif_400Regular', titleRtl: 'NotoNaskhArabic_700Bold',
  arabic: 'Amiri_400Regular', arabicNoto: 'NotoNaskhArabic_400Regular',
  arabicNotoBold: 'NotoNaskhArabic_700Bold', ui: 'Manrope_400Regular',
  uiMedium: 'Manrope_500Medium', subtitle: 'Manrope_400Regular', eyebrow: 'Manrope_600SemiBold',
  urduNastaliq: 'NotoNastaliqUrdu_400Regular',
};
const { AppText } = load('src/components/ui/AppText.tsx', {
  react: React, 'react-native': native,
  '../../lib/theme': { useTheme: () => ({ tokens: { heading: '#111', body: '#222', subtle: '#555', faint: '#777' } }) },
  '../../theme/tokens': { fontRoles: roles },
  '../../lib/i18n': { getCurrentLanguage: () => language },
  '../../lib/typography': type,
  '../../lib/diagnostic': { useAutoProbe: () => ({}) },
});
function renderText(props) {
  const node = AppText.render(props, null);
  return { props: node.props, style: flatten(node.props.style) };
}
for (language of ['ur', 'ar', 'en']) {
  for (const children of ['12:25', '15+', 'Tafsir al-Jalalayn']) {
    const { style } = renderText({ children, variant: 'title', style: { fontFamily: roles.titleRtl, fontSize: 24, lineHeight: 20 } });
    assert.equal(style.fontFamily, roles.title, 'Latin labels and digits must not use an inherited Arabic font');
    assert.equal(style.lineHeight, 32, 'Latin headings need sufficient glyph height without Urdu-sized boxes');
    assert.equal(style.includeFontPadding, false);
  }
}
language = 'ur';
const urdu = renderText({ children: 'نماز ٹریکر', variant: 'title', style: { fontFamily: roles.title, fontSize: 24, lineHeight: 20, letterSpacing: 2 } });
assert.equal(urdu.style.fontFamily, roles.urduNastaliq, 'Translated text must override a Latin screen font and resolve to Urdu Nastaliq');
assert.equal(urdu.style.lineHeight, 53, 'Urdu text line-height must be 2.2x font size');
assert.equal(urdu.style.writingDirection, 'rtl');
assert.equal(urdu.style.textAlign, 'right');
assert.equal(urdu.style.letterSpacing, 0);
assert.equal(urdu.style.includeFontPadding, true);

// Verify Arabic text resolves to Naskh (NotoNaskhArabic_700Bold) with 1.8x line-height
language = 'ar';
const arabic = renderText({ children: 'الفاتحة', variant: 'title', style: { fontFamily: roles.title, fontSize: 24, lineHeight: 20, letterSpacing: 2 } });
assert.equal(arabic.style.fontFamily, roles.titleRtl, 'Arabic text must resolve to Naskh (NotoNaskhArabic_700Bold)');
assert.equal(arabic.style.lineHeight, 44, 'Arabic text line-height must be 1.8x font size');
assert.equal(arabic.style.writingDirection, 'rtl');
assert.equal(arabic.style.textAlign, 'right');

// Verify Quran Arabic with explicit Amiri/Naskh font override is preserved and not changed to Urdu Nastaliq
language = 'ur';
const quranArabic = renderText({
  children: 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ',
  variant: 'title',
  style: { fontFamily: roles.arabic, fontSize: 24, lineHeight: 20 },
});
assert.equal(quranArabic.style.fontFamily, roles.arabic, 'Quran Arabic text with Amiri font override must remain Amiri and not be changed to Urdu Nastaliq');

assert.equal(renderText({ children: 'نماز', style: { textAlign: 'center' } }).style.textAlign, 'center');
assert.equal(renderText({ children: 'Read', style: { fontSize: 16, lineHeight: 12 } }).style.lineHeight, 24, 'Custom body sizes must also avoid clipping');
console.log('✓ Production text rendering preserves Latin metrics, RTL fonts/alignment, centered controls, and minimum line boxes.');
