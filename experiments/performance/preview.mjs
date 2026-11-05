import { readFile, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const packageFile = new URL('../../package.json', import.meta.url);
const original = await readFile(packageFile, 'utf8');
try {
  const config = JSON.parse(original);
  config.scripts.dev = 'node experiments/performance/server.mjs';
  await writeFile(packageFile, JSON.stringify(config, null, 2) + '\n');
  const result = spawnSync('sites-preview', ['start', root], { stdio: 'inherit' });
  process.exitCode = result.status ?? 1;
} finally {
  await writeFile(packageFile, original);
}
