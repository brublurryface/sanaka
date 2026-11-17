import { readFileSync } from 'node:fs';
import { builtinModules } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const nodeModules = new Set(builtinModules.map((name) => name.replace(/^node:/, '')));
const serverPackages = ['express', 'nodemailer', '@angular/ssr', '@angular/platform-server'];
const testFile = /\.(?:spec|test)\.[cm]?[jt]s$/;
const sourceFile = /\.[cm]?[jt]sx?$/;

function dependencies(source) {
  const edges = [];
  const add = (node, literal, typeOnly = false) => {
    edges.push({
      specifier: literal && ts.isStringLiteralLike(literal) ? literal.text : undefined,
      typeOnly,
      line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1,
    });
  };
  const visit = (node) => {
    if (ts.isImportDeclaration(node)) {
      const clause = node.importClause;
      const bindings = clause?.namedBindings;
      const typeOnly =
        clause?.isTypeOnly ||
        (!clause?.name &&
          bindings &&
          ts.isNamedImports(bindings) &&
          bindings.elements.length > 0 &&
          bindings.elements.every((item) => item.isTypeOnly));
      add(node, node.moduleSpecifier, Boolean(typeOnly));
    } else if (ts.isExportDeclaration(node) && node.moduleSpecifier) {
      const clause = node.exportClause;
      const typeOnly =
        node.isTypeOnly ||
        (clause &&
          ts.isNamedExports(clause) &&
          clause.elements.length > 0 &&
          clause.elements.every((item) => item.isTypeOnly));
      add(node, node.moduleSpecifier, Boolean(typeOnly));
    } else if (
      ts.isImportEqualsDeclaration(node) &&
      ts.isExternalModuleReference(node.moduleReference)
    ) {
      add(node, node.moduleReference.expression, node.isTypeOnly);
    } else if (
      ts.isCallExpression(node) &&
      (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) && node.expression.text === 'require'))
    ) {
      add(node, node.arguments[0]);
    } else if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument)) {
      add(node, node.argument.literal, true);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return edges;
}

function layer(file) {
  const feature = /^src\/app\/pages\/([^/]+)\//.exec(file);
  if (feature) return `feature:${feature[1]}`;
  if (file.startsWith('src/app/pages/')) return 'composition';
  if (file.startsWith('src/app/core/')) return 'core';
  if (file.startsWith('src/app/shared/') || file.startsWith('src/shared/')) return 'shared';
  if (/^src\/app\/[^/]+\.ts$/.test(file)) return 'composition';
  return undefined;
}

function forbiddenLayer(from, to) {
  if (['core', 'shared'].includes(from) && to?.startsWith('feature:')) {
    return `${from} cannot import a page feature`;
  }
  if (from?.startsWith('feature:') && to?.startsWith('feature:') && from !== to) {
    return 'a feature cannot import another feature';
  }
  if (from && from !== 'composition' && to === 'composition') {
    return 'application composition cannot be imported by its building blocks';
  }
  return undefined;
}

function serverOnly(file) {
  return (
    file.startsWith('src/server/') ||
    file === 'src/server.ts' ||
    /(?:\.server|-server\.)/.test(file)
  );
}

function serverModule(specifier) {
  return (
    specifier.startsWith('node:') ||
    nodeModules.has(specifier) ||
    serverPackages.some((name) => specifier === name || specifier.startsWith(`${name}/`))
  );
}

export function checkArchitecture(root) {
  root = path.resolve(root);
  const workspace = JSON.parse(readFileSync(path.join(root, 'angular.json'), 'utf8'));
  const build = workspace.projects.sanaka.architect.build.options;
  const configPath = path.resolve(root, build.tsConfig);
  const config = ts.readConfigFile(configPath, ts.sys.readFile);
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, path.dirname(configPath));
  const configErrors = [config.error, ...parsed.errors].filter(Boolean);
  if (configErrors.length) {
    throw new Error(
      ts.formatDiagnosticsWithColorAndContext(configErrors, {
        getCurrentDirectory: () => root,
        getCanonicalFileName: (name) => name,
        getNewLine: () => '\n',
      }),
    );
  }

  const relative = (file) => path.relative(root, file).split(path.sep).join('/');
  const graph = new Map();
  const violations = [];
  const report = (file, edge, rule, message) => {
    violations.push(`${relative(file)}:${edge.line} [${rule}] ${message}`);
  };
  const resolutionCache = ts.createModuleResolutionCache(root, (name) => name, parsed.options);
  const read = (file) => {
    if (graph.has(file)) return;
    const source = ts.createSourceFile(
      file,
      readFileSync(file, 'utf8'),
      ts.ScriptTarget.Latest,
      true,
    );
    const edges = dependencies(source);
    graph.set(file, edges);
    for (const edge of edges) {
      if (!edge.specifier) {
        report(
          file,
          edge,
          'static-import',
          'use a literal module path for an auditable dependency',
        );
        continue;
      }
      const resolved = ts.resolveModuleName(
        edge.specifier,
        file,
        parsed.options,
        ts.sys,
        resolutionCache,
      ).resolvedModule;
      if (
        resolved &&
        !resolved.isExternalLibraryImport &&
        !resolved.resolvedFileName.includes('/node_modules/')
      ) {
        edge.target = path.resolve(resolved.resolvedFileName);
        const reason = forbiddenLayer(layer(relative(file)), layer(relative(edge.target)));
        if (reason) report(file, edge, 'layer', `${reason}: ${edge.specifier}`);
        if (testFile.test(edge.target)) {
          report(
            file,
            edge,
            'production-test',
            `production cannot import a test: ${edge.specifier}`,
          );
        } else if (sourceFile.test(edge.target) && !edge.target.endsWith('.d.ts')) {
          read(edge.target);
        }
      } else if (
        !resolved &&
        (edge.specifier.startsWith('.') ||
          Object.keys(parsed.options.paths ?? {}).some((alias) => {
            const [prefix, suffix] = alias.split('*');
            return suffix === undefined
              ? edge.specifier === prefix
              : edge.specifier.startsWith(prefix) && edge.specifier.endsWith(suffix);
          }))
      ) {
        report(file, edge, 'unresolved-local', `cannot resolve ${edge.specifier}`);
      }
    }
  };

  // Unit tests may integrate features. Production imports remain checked even in unused files.
  for (const file of parsed.fileNames) {
    if (!testFile.test(file) && !file.endsWith('.d.ts')) read(path.resolve(file));
  }

  const browserEntry = path.resolve(root, build.browser);
  read(browserEntry);
  const reached = new Set();
  const visitBrowser = (file) => {
    if (reached.has(file)) return;
    reached.add(file);
    for (const edge of graph.get(file) ?? []) {
      if (edge.typeOnly || !edge.specifier) continue;
      if (serverModule(edge.specifier) || (edge.target && serverOnly(relative(edge.target)))) {
        report(
          file,
          edge,
          'browser-server',
          `browser runtime reaches server code: ${edge.specifier}`,
        );
      } else if (edge.target) {
        visitBrowser(edge.target);
      }
    }
  };
  visitBrowser(browserEntry);
  return { violations, files: graph.size, browserFiles: reached.size };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const result = checkArchitecture(process.argv[2] ?? process.cwd());
    if (result.violations.length) {
      console.error(result.violations.join('\n'));
      process.exitCode = 1;
    } else {
      console.log(
        `Architecture passed: ${result.files} source files; ${result.browserFiles} browser runtime files.`,
      );
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
