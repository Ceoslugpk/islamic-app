import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const ROOT = path.resolve(import.meta.dirname, '..');

function compile(sourcePath, requireMap) {
  const source = fs.readFileSync(sourcePath, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.React,
      esModuleInterop: true,
    },
    fileName: sourcePath,
  }).outputText;
  const module = { exports: {} };
  const localRequire = (id) => {
    assert.ok(Object.prototype.hasOwnProperty.call(requireMap, id), `Unexpected import: ${id}`);
    return requireMap[id];
  };
  new Function('module', 'exports', 'require', output)(module, module.exports, localRequire);
  return module.exports;
}

const AppText = function AppText() {};
const ArabicText = function ArabicText() {};
const PremiumCard = function PremiumCard() {};
const Hairline = function Hairline() {};
const DetailScreen = function DetailScreen() {};
DetailScreen.ScrollView = function ScrollView() {};
const SubHeader = function SubHeader() {};

const react = {
  __esModule: true,
  default: {
    createElement(type, props, ...children) {
      return {
        type,
        props: { ...(props || {}), children: children.length <= 1 ? children[0] : children },
      };
    },
  },
};

const shahadaData = compile(path.join(ROOT, 'src/lib/shahada.ts'), {});
const screen = compile(path.join(ROOT, 'src/screens/ShahadaScreen.tsx'), {
  react,
  'react-native': {
    StyleSheet: { create: (styles) => styles },
    View: function View() {},
    useWindowDimensions: () => ({ width: 390, height: 844 }),
  },
  '../components/ui/AppText': { AppText },
  '../theme/tokens': {
    fontRoles: { arabic: 'Arabic' },
    useThemeTokens: () => ({ tokens: { bgTop: '#fff', text: '#111' } }),
  },
  '../lib/i18n': { t: (key) => key },
  '../components/layout/SubHeader': { SubHeader },
  '../components/layout/DetailScreen': { DetailScreen },
  '../components/ui': { PremiumCard },
  '../components/ArabicText': { ArabicText },
  '../components/Hairline': { Hairline },
  '../lib/shahada': shahadaData,
}).default;

function visit(node, callback) {
  if (Array.isArray(node)) {
    node.forEach((child) => visit(child, callback));
    return;
  }
  if (!node || typeof node !== 'object') return;
  callback(node);
  visit(node.props?.children, callback);
}

const rendered = screen({ onBack: () => {} });
const declarationTranslations = [];
visit(rendered, (node) => {
  if (node.type === AppText && typeof node.props?.children === 'string' && node.props.children.includes('I bear witness')) {
    declarationTranslations.push(node.props.children);
  }
});

assert.deepEqual(
  declarationTranslations,
  ['"I bear witness that there is no god but Allah, and I bear witness that Muhammad is the Messenger of Allah."'],
  'the localized standalone declaration must be rendered exactly once',
);

console.log('Shahada declaration is rendered once using the localized accessible copy');
