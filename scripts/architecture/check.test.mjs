import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

import { checkArchitecture } from './check.mjs';

const checker = fileURLToPath(new URL('./check.mjs', import.meta.url));

function fixture(t, files = {}) {
  const root = mkdtempSync(path.join(tmpdir(), 'sanaka-architecture-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const entries = {
    'angular.json': JSON.stringify({
      projects: {
        sanaka: {
          architect: {
            build: {
              options: {
                browser: 'src/main.ts',
                tsConfig: 'tsconfig.app.json',
              },
            },
          },
        },
      },
    }),
    'tsconfig.app.json': JSON.stringify({
      compilerOptions: {
        module: 'preserve',
        moduleResolution: 'bundler',
        paths: { '@pages/*': ['./src/app/pages/*'], '@contracts/*': ['./src/shared/*'] },
      },
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.spec.ts'],
    }),
    'src/main.ts': 'import "./app/app.config";',
    'src/app/app.config.ts': 'export { start } from "./pages/posts/entry";',
    'src/app/pages/posts/entry.ts': 'export const start = 1;',
    'src/app/pages/home/entry.ts': 'export interface Home { title: string }',
    ...files,
  };
  for (const [name, source] of Object.entries(entries)) {
    const file = path.join(root, name);
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, source);
  }
  return root;
}

test('allows composition, own-feature imports, shared contracts, cycles and isolated server code', (t) => {
  const root = fixture(t, {
    'src/app/pages/posts/entry.ts':
      'import "../../core/client"; import "./detail"; export const start = 1;',
    'src/app/pages/posts/detail.ts': 'import "./entry";',
    'src/app/core/client.ts':
      'import "../shared/view"; import type { Contract } from "@contracts/contact";',
    'src/app/shared/view.ts': 'export const view = 1;',
    'src/shared/contact.ts': 'export interface Contract { message: string }',
    'src/main.server.ts': 'import "node:fs"; import "./app/core/transloco-server.loader";',
    'src/app/core/transloco-server.loader.ts': 'import "node:fs/promises";',
    'src/app/core/integration.spec.ts': 'import "../pages/posts/entry";',
  });
  assert.deepEqual(checkArchitecture(root).violations, []);
});

for (const [name, file, code] of [
  ['core to page', 'src/app/core/client.ts', 'import "../pages/posts/entry";'],
  ['shared to page', 'src/app/shared/view.ts', 'import "../pages/posts/entry";'],
  ['feature to feature', 'src/app/pages/posts/detail.ts', 'import "../home/entry";'],
  [
    'type coupling between features',
    'src/app/pages/posts/detail.ts',
    'import type { Home } from "../home/entry";',
  ],
  ['core through an alias', 'src/app/core/client.ts', 'import "@pages/posts/entry";'],
  ['feature through composition', 'src/app/pages/posts/detail.ts', 'import "../../app.config";'],
  [
    'lazy cross-feature import',
    'src/app/pages/posts/detail.ts',
    'const load = () => import("../home/entry");',
  ],
  ['re-export coupling', 'src/app/shared/view.ts', 'export * from "../pages/posts/entry";'],
  [
    'client/server contract barrel to page',
    'src/shared/barrel.ts',
    'export * from "../app/pages/posts/entry";',
  ],
  ['feature through a page barrel', 'src/app/pages/posts/detail.ts', 'import "../index";'],
]) {
  test(`rejects ${name}, including unreachable production files`, (t) => {
    const result = checkArchitecture(
      fixture(t, {
        'src/app/pages/index.ts': 'export * from "./home/entry";',
        [file]: code,
      }),
    );
    assert.ok(
      result.violations.some((item) => item.includes('[layer]')),
      result.violations.join('\n'),
    );
  });
}

for (const [name, code] of [
  ['node protocol', 'import "node:fs";'],
  ['bare Node builtin', 'import "fs/promises";'],
  ['server package', 'import "nodemailer/lib/smtp-transport";'],
  ['Angular server package', 'export * from "@angular/ssr/node";'],
  ['dynamic import', 'export const load = () => import("node:fs");'],
  ['CommonJS require', 'const fs = require("node:fs");'],
  ['import equals', 'import fs = require("node:fs");'],
  ['mixed type and runtime bindings', 'import { type Stats, stat } from "node:fs";'],
]) {
  test(`rejects browser access to ${name} through a shared barrel`, (t) => {
    const result = checkArchitecture(
      fixture(t, {
        'src/app/pages/posts/entry.ts': 'import "@contracts/barrel"; export const start = 1;',
        'src/shared/barrel.ts': code,
      }),
    );
    assert.ok(
      result.violations.some((item) => item.includes('[browser-server]')),
      result.violations.join('\n'),
    );
  });
}

for (const file of [
  'src/server/handler.ts',
  'src/server.ts',
  'src/app/core/transloco-server.loader.ts',
  'src/app/app.config.server.ts',
]) {
  test(`rejects a lazy browser import of ${file} even without a Node import`, (t) => {
    const specifier = `./${file.slice(4, -3)}`;
    const result = checkArchitecture(
      fixture(t, {
        'src/main.ts': `import(${JSON.stringify(specifier)});`,
        [file]: 'export const server = true;',
      }),
    );
    assert.ok(
      result.violations.some((item) => item.includes('[browser-server]')),
      result.violations.join('\n'),
    );
  });
}

for (const code of [
  'import type { Server } from "node:http";',
  'import { type Server } from "node:http";',
  'export type { Server } from "node:http";',
  'export { type Server } from "node:http";',
  'export type Server = import("node:http").Server;',
  'import type * as http from "node:http";',
]) {
  test(`does not treat an explicit erased type contract as runtime: ${code}`, (t) => {
    const root = fixture(t, { 'src/app/pages/posts/entry.ts': code });
    assert.deepEqual(checkArchitecture(root).violations, []);
  });
}

test('rejects production imports of tests rather than exempting their dependency graph', (t) => {
  const result = checkArchitecture(
    fixture(t, {
      'src/app/pages/posts/entry.ts': 'import "./escape.spec";',
      'src/app/pages/posts/escape.spec.ts': 'import "node:fs";',
    }),
  );
  assert.ok(result.violations.some((item) => item.includes('[production-test]')));
});

test('rejects nonliteral imports that would hide feature or server dependencies', (t) => {
  const result = checkArchitecture(
    fixture(t, {
      'src/app/pages/posts/entry.ts': 'declare const moduleName: string; import(moduleName);',
    }),
  );
  assert.ok(result.violations.some((item) => item.includes('[static-import]')));
});

test('reports missing local and aliased dependencies', (t) => {
  const result = checkArchitecture(
    fixture(t, {
      'src/app/pages/posts/entry.ts': 'import "./missing"; import "@pages/missing/entry";',
    }),
  );
  assert.equal(result.violations.filter((item) => item.includes('[unresolved-local]')).length, 2);
});

test('the actual CLI fails with a file and line for a forbidden fixture', (t) => {
  const root = fixture(t, { 'src/app/core/client.ts': 'import "../pages/posts/entry";' });
  const result = spawnSync(process.execPath, [checker, root], { encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /src\/app\/core\/client\.ts:1 \[layer\]/);
});

test('the actual CLI passes an allowed fixture', (t) => {
  const result = spawnSync(process.execPath, [checker, fixture(t)], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Architecture passed/);
});
