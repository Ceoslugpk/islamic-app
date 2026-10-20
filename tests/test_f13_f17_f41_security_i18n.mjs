import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import ts from 'typescript';

const ROOT = path.resolve(import.meta.dirname, '..');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'islamic-f13-f17-f41-'));

function transpileProduction(relativePath, outputName, replacements = []) {
  let source = fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
  for (const [from, to] of replacements) {
    assert.ok(source.includes(from), `${relativePath} must contain ${from}`);
    source = source.replaceAll(from, to);
  }
  const output = ts.transpileModule(source, {
    compilerOptions: {
      jsx: ts.JsxEmit.React,
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: relativePath,
  }).outputText;
  const outputPath = path.join(TMP, outputName);
  fs.writeFileSync(outputPath, output);
  return outputPath;
}

function writeStub(name, source) {
  const filePath = path.join(TMP, name);
  fs.writeFileSync(filePath, source);
  return filePath;
}

async function loadStringsModule() {
  writeStub('f13-i18n.mjs', `
    let language = 'en';
    const translations = {
      en: { Retry: 'Retry' },
      ur: { Retry: 'دوبارہ کوشش کریں' },
    };
    export function setLanguage(next) { language = next; }
    export function t(key) { return translations[language]?.[key] ?? key; }
  `);
  const file = transpileProduction('src/lib/strings.ts', 'strings.mjs', [
    ["from './i18n'", "from './f13-i18n.mjs'"],
  ]);
  const strings = await import(`${pathToFileURL(file).href}?strings=${Date.now()}`);
  const i18n = await import(pathToFileURL(path.join(TMP, 'f13-i18n.mjs')).href);
  return { strings, i18n };
}

function pathToFileURL(filePath) {
  return new URL(`file://${filePath}`);
}

async function loadZakatModule() {
  writeStub('f41-i18n.mjs', `
    let language = 'en';
    export function setLanguage(next) { language = next; }
    export function getCurrentLanguage() { return language; }
    export function isAppLanguage(value) {
      return ['en', 'ur', 'ar', 'hi', 'ml', 'si', 'bn', 'ms', 'ta', 'id', 'ps'].includes(value);
    }
  `);
  const file = transpileProduction('src/lib/zakat.ts', 'zakat.mjs', [
    ["from './i18n'", "from './f41-i18n.mjs'"],
  ]);
  const zakat = await import(`${pathToFileURL(file).href}?zakat=${Date.now()}`);
  const i18n = await import(pathToFileURL(path.join(TMP, 'f41-i18n.mjs')).href);
  return { zakat, i18n };
}

async function loadLiveVideoPlayerModule() {
  writeStub('f17-react.mjs', `
    export function useEffect() {}
    export function useMemo(factory) { return factory(); }
    export function useState(initial) { return [typeof initial === 'function' ? initial() : initial, () => {}]; }
    export function useRef(current) { return { current }; }
    export default {
      useEffect,
      useMemo,
      useState,
      useRef,
      createElement(type, props, ...children) { return { type, props: props || {}, children }; },
    };
  `);
  writeStub('f17-react-native.mjs', `
    export const Platform = { OS: 'android' };
    export const View = 'View';
    export const StyleSheet = { create: (styles) => styles };
    export const TouchableOpacity = 'TouchableOpacity';
    export const Linking = { openURL: async () => {} };
    export const useWindowDimensions = () => ({ width: 390, height: 844 });
    export const ActivityIndicator = 'ActivityIndicator';
  `);
  writeStub('f17-app-text.mjs', `export const AppText = 'AppText';\n`);
  writeStub('f17-icons.mjs', `export const Ionicons = 'Ionicons';\n`);
  writeStub('f17-webview.mjs', `export const WebView = 'WebView';\n`);
  writeStub('f17-video.mjs', `
    export const VideoView = 'VideoView';
    export function useVideoPlayer() { return {}; }
  `);
  writeStub('f17-theme.mjs', `
    export function useThemeTokens() {
      return { mode: 'paper', tokens: { cardBottom: '#fff', cardBorder: '#ddd', cardTop: '#fff', overlay: '#0008', goldText: '#9a6b00', accentDim: '#eee', sageDim: '#eee', accent: '#080' } };
    }
  `);
  writeStub('f17-home-theme.mjs', `
    export const getCardShadow = () => ({});
    export const getPillShadow = () => ({});
  `);
  writeStub('f17-card.mjs', `export const Card = 'Card';\n`);
  writeStub('f17-live-stream.mjs', `export function setActiveLiveStream() {}\n`);
  writeStub('f17-i18n.mjs', `export function t(key) { return key; }\n`);

  const replacements = [
    ["from 'react'", "from './f17-react.mjs'"],
    ["from 'react-native'", "from './f17-react-native.mjs'"],
    ["from './ui/AppText'", "from './f17-app-text.mjs'"],
    ["from '@expo/vector-icons'", "from './f17-icons.mjs'"],
    ["from 'react-native-webview'", "from './f17-webview.mjs'"],
    ["from 'expo-video'", "from './f17-video.mjs'"],
    ["from '../theme/tokens'", "from './f17-theme.mjs'"],
    ["from '../lib/homeThemeTokens'", "from './f17-home-theme.mjs'"],
    ["from './Card'", "from './f17-card.mjs'"],
    ["from '../lib/liveStream'", "from './f17-live-stream.mjs'"],
    ["from '../lib/i18n'", "from './f17-i18n.mjs'"],
  ];
  const file = transpileProduction('src/components/LiveVideoPlayer.tsx', 'live-video-player.mjs', replacements);
  return import(`${pathToFileURL(file).href}?video=${Date.now()}`);
}

function findElement(tree, type) {
  if (!tree || typeof tree !== 'object') return null;
  if (tree.type === type) return tree;
  for (const child of tree.children || []) {
    const found = findElement(child, type);
    if (found) return found;
  }
  return null;
}

console.log('=== F-13 / F-17 / F-41 real-module regression suite ===');

console.log('F-17: the real WebView navigation handler rejects hostile origins and is wired to the component');
const video = await loadLiveVideoPlayerModule();
assert.deepEqual(video.LIVE_VIDEO_ORIGIN_WHITELIST, [
  'https://www.youtube-nocookie.com',
  'https://www.youtube.com',
]);
const blocked = [];
const navigationHandler = video.createLiveVideoNavigationHandler((url) => blocked.push(url));
assert.equal(navigationHandler({ url: 'https://www.youtube.com/embed/abc' }), true);
assert.equal(navigationHandler({ url: 'https://www.youtube-nocookie.com/embed/abc' }), true);
for (const hostileUrl of [
  'javascript:alert(1)',
  'data:text/html,<script>alert(1)</script>',
  'https://example.com/player',
  'https://youtube.com.evil.example/embed/abc',
]) {
  assert.equal(navigationHandler({ url: hostileUrl }), false, `must block ${hostileUrl}`);
}
assert.deepEqual(blocked, [
  'javascript:alert(1)',
  'data:text/html,<script>alert(1)</script>',
  'https://example.com/player',
  'https://youtube.com.evil.example/embed/abc',
]);
assert.equal(video.sanitizeYouTubeEmbedUrl('https://youtube.com.evil.example/embed/abc'), null);
const html = video.buildLiveVideoHtml('https://www.youtube.com/embed/abc?x=" onerror="alert(1)', '#fff');
assert.match(html, /sandbox="allow-scripts allow-same-origin"/);
assert.match(html, /src="https:\/\/www\.youtube\.com\/embed\/abc\?x=%22\+onerror%3D%22alert%281%29&amp;playsinline=1&amp;enablejsapi=1"/);
assert.doesNotMatch(html, /src="[^"]*" onerror=/);

const rendered = video.LiveVideoPlayer({
  embedUrl: 'https://www.youtube.com/embed/abc',
  title: 'Makkah',
});
const webView = findElement(rendered, 'WebView');
assert.ok(webView, 'native player must render a WebView for a valid embed');
assert.deepEqual(webView.props.originWhitelist, [
  'https://www.youtube-nocookie.com',
  'https://www.youtube.com',
]);
assert.equal(typeof webView.props.onShouldStartLoadWithRequest, 'function');
assert.equal(webView.props.onShouldStartLoadWithRequest({ url: 'https://www.youtube.com/embed/abc' }), true);
assert.equal(webView.props.onShouldStartLoadWithRequest({ url: 'https://youtube.com.evil.example/' }), false);

console.log('F-41: the real formatter follows a non-US active app language and falls back for unknown language');
const { zakat, i18n: zakatI18n } = await loadZakatModule();
zakatI18n.setLanguage('en');
assert.equal(zakat.formatCurrencyAmount(1234567.89, 'USD'), '1,234,567.89');
zakatI18n.setLanguage('hi');
assert.equal(zakat.formatCurrencyAmount(1234567.89, 'USD'), '12,34,567.89');
zakatI18n.setLanguage('unknown');
assert.equal(zakat.formatCurrencyAmount(1234567.89, 'USD'), '1,234,567.89');

console.log('F-13: the real strings module resolves translations at call time after language changes');
const { strings, i18n: stringsI18n } = await loadStringsModule();
const stringExports = [
  'retry', 'cancel', 'save', 'remove', 'copy', 'share', 'play', 'bookmark', 'search', 'close', 'offline',
  'loadingEllipsis', 'gettingPrayerTimes', 'preparingDashboard', 'offlineUsingSavedData',
  'prayerTimesOfflineError', 'prayerTimesNeedsConnection', 'surahLoadFailed', 'tafsirLoadFailed',
  'downloadFailedTitle', 'downloadFailedBody', 'notificationPermissionDenied', 'testAlertPermission',
  'allowNotifications', 'latitudeInvalid', 'longitudeInvalid', 'locationSaved', 'notificationsRescheduled',
  'notificationsRescheduleFailed', 'snoozedTenMinutes', 'testAlertSent', 'dailyGoalDone', 'dailyGoalReopened',
];
for (const name of stringExports) {
  assert.equal(typeof strings[name], 'function', `${name} must resolve lazily`);
}
stringsI18n.setLanguage('en');
assert.equal(strings.retry(), 'Retry');
stringsI18n.setLanguage('ur');
assert.equal(strings.retry(), 'دوبارہ کوشش کریں');

console.log('PASS: F-13, F-17, and F-41 production-path regressions are covered');
