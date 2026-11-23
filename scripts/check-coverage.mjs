import { readFile } from 'node:fs/promises';

import { coveragePolicy, evaluateCoverage } from './coverage-policy.mjs';

const target = process.argv[2];
if (!Object.hasOwn(coveragePolicy, target)) {
  throw new Error('Informe o escopo de cobertura: angular ou server.');
}

const report = coveragePolicy[target].report;
const summaryPath = new URL(`../coverage/${report}/coverage-summary.json`, import.meta.url);
const summary = JSON.parse(await readFile(summaryPath, 'utf8'));
const results = evaluateCoverage(summary, target);

for (const { metric, actual, minimum, passed } of results) {
  console.log(
    `${passed ? 'OK' : 'FALHA'} ${target} / ${metric}: ${actual.toFixed(2)}% (mínimo ${minimum}%)`,
  );
}

if (results.some(({ passed }) => !passed)) {
  throw new Error(`Regressão de cobertura no escopo ${target}.`);
}
