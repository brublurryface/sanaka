import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { missingServerCoverage, serverSourcePaths } from './coverage-inventory.mjs';
import { coveragePolicy, evaluateCoverage } from './coverage-policy.mjs';

const target = process.argv[2];
if (!Object.hasOwn(coveragePolicy, target)) {
  throw new Error('Informe o escopo de cobertura: angular ou server.');
}

const report = coveragePolicy[target].report;
const summaryPath = new URL(`../coverage/${report}/coverage-summary.json`, import.meta.url);
const summary = JSON.parse(await readFile(summaryPath, 'utf8'));
const results = evaluateCoverage(summary, target);

for (const { metric, baseline, covered, total, passed } of results) {
  console.log(
    `${passed ? 'OK' : 'FALHA'} ${target} / ${metric}: ${covered}/${total} (base ${baseline.covered}/${baseline.total})`,
  );
}

if (results.some(({ passed }) => !passed)) {
  throw new Error(`Regressão de cobertura no escopo ${target}.`);
}

if (target === 'server') {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const missing = missingServerCoverage(summary, await serverSourcePaths(root), root);
  if (missing.length > 0) {
    throw new Error(`Módulos do servidor ausentes da cobertura: ${missing.join(', ')}.`);
  }
  console.log('Inventário de cobertura do servidor verificado.');
}
