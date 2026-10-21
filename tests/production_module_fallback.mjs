import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

const INTERNAL_IMPORT = /^\.\/(?!\.)(?:[^/]+\/)*[^/]+$/;

function repoRelative(root, filename) {
  return path.relative(root, filename).split(path.sep).join('/');
}

function resolveSource(root, importerRelativePath, request) {
  const importer = path.resolve(root, importerRelativePath);
  const libraryRoot = path.resolve(root, 'src/lib');
  if (!INTERNAL_IMPORT.test(request) || !importer.startsWith(`${libraryRoot}${path.sep}`)) {
    return null;
  }

  const base = path.resolve(path.dirname(importer), request.slice(2));
  const candidates = [`${base}.ts`, path.join(base, 'index.ts')];
  const sourcePath = candidates.find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
  if (!sourcePath || !sourcePath.startsWith(`${libraryRoot}${path.sep}`)) {
    throw new Error(
      `Cannot resolve relative internal import "${request}" from "${repoRelative(root, importer)}"; ` +
      `tried ${candidates.map((candidate) => repoRelative(root, candidate)).join(' and ')}`,
    );
  }
  return repoRelative(root, sourcePath);
}

/**
 * Execute a real CommonJS-transpiled production module with explicit seams.
 * Explicit entries are authoritative; only unmapped relative imports from
 * src/lib are resolved to real source files on demand.
 */
export function loadCommonJsModule({ root, relativePath, modules = {}, globals = {} }) {
  const cache = new Map();

  function load(moduleRelativePath) {
    const normalizedPath = moduleRelativePath.split(path.sep).join('/');
    const cached = cache.get(normalizedPath);
    if (cached) return cached.exports;

    const filename = path.resolve(root, normalizedPath);
    const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
        jsx: ts.JsxEmit.React,
      },
      fileName: filename,
    }).outputText;
    const moduleObject = { exports: {} };
    cache.set(normalizedPath, moduleObject);

    const localRequire = (request) => {
      if (Object.prototype.hasOwnProperty.call(modules, request)) return modules[request];
      const internalPath = resolveSource(root, normalizedPath, request);
      if (internalPath) return load(internalPath);
      if (request.startsWith('./')) {
        throw new Error(`Cannot resolve relative import "${request}" from "${normalizedPath}"`);
      }
      throw new Error(`Unexpected external import "${request}" from "${normalizedPath}"`);
    };

    const sandbox = {
      module: moduleObject,
      exports: moduleObject.exports,
      require: localRequire,
      console,
      Array,
      Date,
      Error,
      JSON,
      Math,
      Number,
      Object,
      Promise,
      Set,
      String,
      ...globals,
    };
    vm.createContext(sandbox);
    vm.runInContext(output, sandbox, { filename });
    return moduleObject.exports;
  }

  return load(relativePath);
}

function replaceExplicitImports(source, replacements, sourceRelativePath) {
  let rewritten = source;
  for (const [from, to] of replacements) {
    if (!rewritten.includes(from)) {
      throw new Error(`Rewrite target not found in ${sourceRelativePath}: "${from}"`);
    }
    rewritten = rewritten.replaceAll(from, to);
  }
  return rewritten;
}

/**
 * Transpile an ESM production module into a temp directory. Explicit rewrites
 * remain stubs/shims; every other relative ./ import from src/lib is compiled
 * from its real .ts or index.ts source and linked with an explicit .mjs path.
 */
export function compileEsmProductionModule({
  root,
  tmpDir,
  sourceRelativePath,
  source,
  outputName,
  replacements = [],
}) {
  const generated = new Map();
  const compileInternal = (relativePath) => {
    const normalizedPath = relativePath.split(path.sep).join('/');
    const existing = generated.get(normalizedPath);
    if (existing) return existing;

    const safeName = normalizedPath.replace(/[^a-zA-Z0-9._-]+/g, '_');
    const outputPath = path.join(tmpDir, `internal-${safeName.replace(/\.ts$/, '')}.mjs`);
    generated.set(normalizedPath, outputPath);
    const originalSource = fs.readFileSync(path.join(root, normalizedPath), 'utf8');
    compileSource(normalizedPath, originalSource, outputPath);
    return outputPath;
  };

  const compileSource = (relativePath, originalSource, outputPath) => {
    const rewritten = originalSource.replace(
      /((?:\bfrom\s+|\bimport\s*)(['"]))(\.\/[^'"]+)\2/g,
      (match, prefix, quote, request) => {
        if (request.endsWith('.mjs') || request.endsWith('.js') || request.endsWith('.json')) return match;
        const internalPath = resolveSource(root, relativePath, request);
        if (!internalPath) return match;
        const targetPath = compileInternal(internalPath);
        const relativeTarget = `./${path.relative(path.dirname(outputPath), targetPath).split(path.sep).join('/')}`;
        return `${prefix}${relativeTarget}${quote}`;
      },
    );
    const output = ts.transpileModule(rewritten, {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.React,
      },
      fileName: path.join(root, relativePath),
    }).outputText;
    fs.writeFileSync(outputPath, output);
  };

  const outputPath = path.join(tmpDir, outputName);
  const rewrittenRoot = replaceExplicitImports(source, replacements, sourceRelativePath);
  compileSource(sourceRelativePath, rewrittenRoot, outputPath);
  return outputPath;
}
