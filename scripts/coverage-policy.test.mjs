import assert from 'node:assert/strict';
import { test } from 'node:test';

import { coveragePolicy, evaluateCoverage } from './coverage-policy.mjs';

function reportFor(target) {
  const total = Object.fromEntries(
    Object.entries(coveragePolicy[target].minimum).map(([metric, minimum]) => [
      metric,
      { total: 10000, covered: Math.round(minimum * 100) },
    ]),
  );
  return { total };
}

for (const target of Object.keys(coveragePolicy)) {
  test(`${target}: aceita exatamente os limites registrados`, () => {
    assert.ok(evaluateCoverage(reportFor(target), target).every(({ passed }) => passed));
  });

  for (const metric of Object.keys(coveragePolicy[target].minimum)) {
    test(`${target}: rejeita regressão de ${metric}`, () => {
      const report = reportFor(target);
      report.total[metric].covered -= 1;
      // O percentual declarado não pode mascarar a perda de instruções cobertas.
      report.total[metric].pct = 100;
      const results = evaluateCoverage(report, target);
      assert.deepEqual(
        results.filter(({ passed }) => !passed).map((entry) => entry.metric),
        [metric],
      );
    });
  }

  test(`${target}: rejeita relatório incompleto ou contadores inválidos`, () => {
    for (const entry of [
      undefined,
      { total: 0, covered: 0 },
      { total: 10, covered: 11 },
      { total: 10, covered: -1 },
      { total: 10, covered: 1.5 },
    ]) {
      const report = reportFor(target);
      report.total.lines = entry;
      assert.throws(() => evaluateCoverage(report, target), /inválido/);
    }
    assert.throws(() => evaluateCoverage({}, target), /inválido/);
  });
}

test('rejeita escopos desconhecidos', () => {
  assert.throws(() => evaluateCoverage({}, 'unknown'), /desconhecido/);
  assert.throws(() => evaluateCoverage({}, 'constructor'), /desconhecido/);
});
