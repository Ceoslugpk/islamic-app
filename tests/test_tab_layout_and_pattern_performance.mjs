import assert from 'node:assert/strict';
import fs from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';

// Exercise the production TSX with native primitives replaced by inspectable
// elements. This validates geometry and visibility contracts, not device FPS.
function loadComponent(file, platform = 'android') {
  const { outputText } = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: {
      jsx: ts.JsxEmit.React,
      module: ts.ModuleKind.CommonJS,
      esModuleInterop: true,
    },
  });
  const modules = {
    react: React,
    'react-native': {
      View: ({ children }) => React.createElement(React.Fragment, null, children),
      StyleSheet: {
        create: (styles) => styles,
        absoluteFill: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
      },
      Platform: { OS: platform },
    },
    'react-native-svg': { __esModule: true, default: 'svg', Path: 'path' },
    '../lib/theme': { useTheme: () => ({ colors: { accent: '#105A4B' } }) },
  };
  const module = { exports: {} };
  const requireStub = (name) => {
    assert.ok(name in modules, `Unexpected production import: ${name}`);
    return modules[name];
  };
  new Function('require', 'module', 'exports', outputText)(requireStub, module, module.exports);
  return module.exports;
}

const paneFile = 'src/components/layout/PersistentTabPane.tsx';
const child = React.createElement('content', null, 'retained screen');
for (const platform of ['android', 'ios', 'web']) {
  const { PersistentTabPane } = loadComponent(paneFile, platform);
  for (const active of [true, false, true, false]) {
    const pane = PersistentTabPane({ active, children: child });
    const style = Object.assign({}, ...pane.props.style);
    assert.equal(pane.props.children, child, 'Tab changes retain the same screen child');
    assert.equal(style.position, 'absolute');
    assert.equal(style.top, 0);
    assert.equal(style.bottom, 0);
    assert.equal(pane.props.pointerEvents, active ? 'auto' : 'none');
    assert.equal(pane.props.accessibilityElementsHidden, !active);
    assert.equal(pane.props['aria-hidden'], !active);
    assert.equal(pane.props.importantForAccessibility, active ? 'auto' : 'no-hide-descendants');
    if (platform === 'web' && !active) {
      assert.equal(style.display, 'none', 'Web keeps hidden panes out of browser layout');
    } else {
      assert.equal(style.display, undefined, 'Native tab changes must preserve layout');
      assert.equal(style.opacity, active ? 1 : 0);
    }
  }
}
console.log('✓ Android/iOS tabs preserve layout and hide inactive input/accessibility; web visibility preserved');

const { GeometricPattern } = loadComponent('src/components/GeometricPattern.tsx');
for (const tileSize of [24, 30, 32, 36, 37.5, 40, 44, 48]) {
  const markup = renderToStaticMarkup(React.createElement(GeometricPattern, {
    variant: 'tessellation', tileSize, color: '#D4A359',
  }));
  assert.equal((markup.match(/<path /g) || []).length, 1, 'Each pattern has only one drawing node');
  assert.ok(!/<(?:rect|line|g)[ >]/.test(markup));
  assert.ok(markup.includes('viewBox="0 0 448 336"'));
  assert.ok(markup.includes('stroke="#D4A359"'));
  const d = markup.match(/ d="([^"]+)"/)[1];
  const subpaths = d.match(/M[^M]+/g);
  const expected = [];
  const radius = Math.round(tileSize * 0.27);
  const connectorRadius = Math.round(radius * 1.414);
  // Independent reference: transform the original Rect corners by its original
  // translate/rotate(45deg)/translate matrix, then compare every segment.
  for (let row = 0; row < 8; row++) {
    for (let column = 0; column < 10; column++) {
      const cx = column * tileSize + tileSize / 2;
      const cy = row * tileSize + tileSize / 2;
      const corners = [[-radius, -radius], [radius, -radius], [radius, radius], [-radius, radius]];
      expected.push({ closed: true, points: corners.map(([x, y]) => [cx + x, cy + y]) });
      expected.push({ closed: true, points: corners.map(([x, y]) => [
        cx + x * Math.cos(Math.PI / 4) - y * Math.sin(Math.PI / 4),
        cy + x * Math.sin(Math.PI / 4) + y * Math.cos(Math.PI / 4),
      ]) });
      if (column < 9) expected.push({ closed: false, points: [[cx + connectorRadius, cy], [cx + tileSize - connectorRadius, cy]] });
      if (row < 7) expected.push({ closed: false, points: [[cx, cy + connectorRadius], [cx, cy + tileSize - connectorRadius]] });
    }
  }
  assert.equal(subpaths.length, expected.length);
  for (let i = 0; i < expected.length; i++) {
    assert.equal(subpaths[i].endsWith('Z'), expected[i].closed);
    const coordinates = subpaths[i].match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/gi).map(Number);
    const reference = expected[i].points.flat();
    assert.equal(coordinates.length, reference.length);
    coordinates.forEach((value, index) => assert.ok(Math.abs(value - reference[index]) < 1e-9));
  }
}
assert.equal(renderToStaticMarkup(React.createElement(GeometricPattern)).includes('<svg'), false);
console.log('✓ Single-path patterns preserve all 160 squares and 142 connectors at eight tile sizes');
