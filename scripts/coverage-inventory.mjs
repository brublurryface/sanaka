import { readdir } from 'node:fs/promises';
import { relative, resolve, sep } from 'node:path';

// A composição src/server.ts é verificada no servidor real pelos testes E2E.
// O inventário de URLs e os contratos declarativos têm escopo próprio de revisão.
const serverExclusions = new Set([
  'src/server/legacy-wordpress-data.ts',
  'src/shared/contact.ts',
  'src/shared/newsletter.ts',
]);

function relativePath(root, path) {
  return relative(root, resolve(root, path)).split(sep).join('/');
}

/** Identifica módulos do servidor ausentes do relatório, inclusive novos arquivos. */
export function missingServerCoverage(summary, sources, root) {
  const reported = new Set(
    Object.keys(summary)
      .filter((path) => path !== 'total')
      .map((path) => relativePath(root, path)),
  );

  return sources
    .map((path) => relativePath(root, path))
    .filter((path) => path.endsWith('.ts') && !/\.(?:spec|test|d)\.ts$/u.test(path))
    .filter((path) => !serverExclusions.has(path) && !reported.has(path))
    .sort();
}

export async function serverSourcePaths(root) {
  const directories = ['src/server', 'src/shared'];
  const entries = await Promise.all(
    directories.map((directory) =>
      readdir(resolve(root, directory), { recursive: true, withFileTypes: true }),
    ),
  );

  return entries
    .flat()
    .filter((entry) => entry.isFile())
    .map((entry) => resolve(entry.parentPath, entry.name));
}
