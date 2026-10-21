import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const ROOT = path.resolve(import.meta.dirname, '..');
const INTERACTIVE_TAGS = new Set([
  'Pressable',
  'TouchableOpacity',
  'TouchableHighlight',
  'TouchableNativeFeedback',
  'TouchableWithoutFeedback',
]);

const KNOWN_BEFORE_ANCESTORS = new Set([
  'src/screens/ToolsScreen.tsx:497',
  'src/screens/BookmarksScreen.tsx:76',
]);

const COMPONENT_SOURCE_FILES = [
  ...sourceFiles('src/components'),
  'src/screens/ToolsScreen.tsx',
  'src/screens/LibraryScreen.tsx',
];

function tagName(tag) {
  return ts.isIdentifier(tag) ? tag.text : null;
}

function getJsxTags(root) {
  const tags = [];
  function visit(node) {
    if (ts.isJsxElement(node)) {
      tags.push(node);
      ts.forEachChild(node, visit);
      return;
    }
    if (ts.isJsxSelfClosingElement(node)) {
      tags.push(node);
      return;
    }
    ts.forEachChild(node, visit);
  }
  visit(root);
  return tags;
}

function componentName(node) {
  if (ts.isFunctionDeclaration(node) && node.name && /^[A-Z]/.test(node.name.text)) {
    return node.name.text;
  }
  return null;
}

function collectComponentBodies(file) {
  const components = [];
  function visit(node) {
    const functionName = componentName(node);
    if (functionName && node.body) {
      components.push({ name: functionName, body: node.body, file });
    }
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && /^[A-Z]/.test(node.name.text)) {
      const initializer = node.initializer;
      if (initializer && (ts.isArrowFunction(initializer) || ts.isFunctionExpression(initializer))) {
        components.push({ name: node.name.text, body: initializer.body, file });
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(file.sourceFile);
  return components;
}

function hasRenderableChildren(node) {
  return ts.isJsxElement(node) && node.children.some((child) => {
    if (ts.isJsxText(child)) return child.text.trim().length > 0;
    return true;
  });
}

function deriveComponentSets() {
  const components = [];
  for (const relativePath of COMPONENT_SOURCE_FILES) {
    const source = fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
    const sourceFile = ts.createSourceFile(relativePath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    components.push(...collectComponentBodies({ relativePath, sourceFile }));
  }

  const internalInteractiveComponents = new Set(INTERACTIVE_TAGS);
  const interactiveWrapperComponents = new Set();
  const componentNamesByFile = new Map();
  const wrapperComponentsByFile = new Map();
  for (const component of components) {
    if (!componentNamesByFile.has(component.file.relativePath)) componentNamesByFile.set(component.file.relativePath, new Set());
    componentNamesByFile.get(component.file.relativePath).add(component.name);
  }
  let changed = true;
  while (changed) {
    changed = false;
    for (const component of components) {
      const tags = getJsxTags(component.body);
      if (tags.some((node) => internalInteractiveComponents.has(tagName(node.openingElement?.tagName || node.tagName)))) {
        if (!internalInteractiveComponents.has(component.name)) {
          internalInteractiveComponents.add(component.name);
          changed = true;
        }
      }
      if (tags.some((node) => {
        const name = tagName(node.openingElement?.tagName || node.tagName);
        return name && INTERACTIVE_TAGS.has(name) && hasRenderableChildren(node);
      })) {
        interactiveWrapperComponents.add(component.name);
        if (!wrapperComponentsByFile.has(component.file.relativePath)) wrapperComponentsByFile.set(component.file.relativePath, new Set());
        wrapperComponentsByFile.get(component.file.relativePath).add(component.name);
      }
    }
  }
  return { internalInteractiveComponents, interactiveWrapperComponents, componentNamesByFile, wrapperComponentsByFile };
}

const {
  internalInteractiveComponents,
  interactiveWrapperComponents,
  componentNamesByFile,
  wrapperComponentsByFile,
} = deriveComponentSets();

function scanFile(relativePath) {
  const source = fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
  const file = ts.createSourceFile(relativePath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const findings = [];

  function visit(node, ancestors) {
    if (ts.isJsxElement(node)) {
      const name = tagName(node.openingElement.tagName);
      const interactiveAncestors = ancestors.filter(Boolean);
      const isInteractive = name && internalInteractiveComponents.has(name);
      if (isInteractive && interactiveAncestors.length > 0) {
        const location = file.getLineAndCharacterOfPosition(node.openingElement.getStart(file)).line + 1;
        const parent = interactiveAncestors[interactiveAncestors.length - 1];
        findings.push({
          file: relativePath,
          line: location,
          parent: parent.name,
          parentLine: parent.line,
          child: name,
        });
      }
      const localNames = componentNamesByFile.get(relativePath);
      const localWrappers = wrapperComponentsByFile.get(relativePath) || new Set();
      const isWrapper = name && (
        INTERACTIVE_TAGS.has(name)
        || (localNames?.has(name) ? localWrappers.has(name) : interactiveWrapperComponents.has(name))
      );
      const nextAncestors = isWrapper
        ? [...interactiveAncestors, { name, line: file.getLineAndCharacterOfPosition(node.openingElement.getStart(file)).line + 1 }]
        : interactiveAncestors;
      ts.forEachChild(node, (child) => visit(child, nextAncestors));
      return;
    }
    if (ts.isJsxSelfClosingElement(node)) return;
    ts.forEachChild(node, (child) => visit(child, ancestors));
  }

  visit(file, []);
  return findings;
}

function sourceFiles(relativeDir) {
  const absoluteDir = path.join(ROOT, relativeDir);
  return fs.readdirSync(absoluteDir, { withFileTypes: true }).flatMap((entry) => {
    const relative = path.join(relativeDir, entry.name);
    if (entry.isDirectory()) return sourceFiles(relative);
    return entry.isFile() && entry.name.endsWith('.tsx') ? [relative] : [];
  });
}

function scanTree() {
  return [...sourceFiles('src/components'), ...sourceFiles('src/screens')]
    .flatMap(scanFile)
    .sort((a, b) => `${a.file}:${a.line}`.localeCompare(`${b.file}:${b.line}`));
}

const findings = scanTree();
const keys = new Set(findings.map(({ file, line }) => `${file}:${line}`));

if (process.argv.includes('--before')) {
  const ancestorKeys = new Set(findings.map(({ file, parentLine }) => `${file}:${parentLine}`));
  const missing = [...KNOWN_BEFORE_ANCESTORS].filter((key) => !ancestorKeys.has(key));
  assert.deepEqual(missing, [], `unfixed-tree calibration missed known sites: ${missing.join(', ')}`);
  assert.ok(findings.length >= KNOWN_BEFORE_ANCESTORS.size, 'unfixed-tree calibration must find the known nesting');
  console.log(`BEFORE RED-CONTROL: ${findings.length} nested controls found`);
  for (const finding of findings) {
    console.log(`  ${finding.file}:${finding.line} ${finding.parent}@${finding.parentLine} -> ${finding.child}`);
  }
} else {
  assert.deepEqual(
    findings,
    [],
    `nested interactive controls remain:\n${findings.map((finding) => `  ${finding.file}:${finding.line} ${finding.parent}@${finding.parentLine} -> ${finding.child}`).join('\n')}`,
  );
  console.log('AFTER GREEN: no nested interactive controls found');
}
