import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { test } from 'node:test';

import { missingServerCoverage } from './coverage-inventory.mjs';
import { coveragePolicy, evaluateCoverage } from './coverage-policy.mjs';

function reportFor(target) {
  return { total: structuredClone(coveragePolicy[target].baseline) };
}

for (const target of Object.keys(coveragePolicy)) {
  test(`${target}: aceita exatamente os contadores da linha de base`, () => {
    assert.ok(evaluateCoverage(reportFor(target), target).every(({ passed }) => passed));
  });

  for (const metric of Object.keys(coveragePolicy[target].baseline)) {
    test(`${target}: rejeita regressão de ${metric} mesmo com percentual arredondado igual`, () => {
      const report = reportFor(target);
      const entry = report.total[metric];
      entry.total *= 10000;
      entry.covered *= 10000;
      entry.covered -= 1;
      // O percentual declarado não pode mascarar a perda de instruções cobertas.
      entry.pct = 100;
      const results = evaluateCoverage(report, target);
      assert.deepEqual(
        results.filter(({ passed }) => !passed).map((entry) => entry.metric),
        [metric],
      );
    });
  }

  test(`${target}: aceita proporções iguais com contadores diferentes`, () => {
    const report = reportFor(target);
    for (const entry of Object.values(report.total)) {
      entry.total *= 2;
      entry.covered *= 2;
    }
    assert.ok(evaluateCoverage(report, target).every(({ passed }) => passed));
  });

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

test('inventário: aceita caminhos absolutos e relativos e as exclusões documentadas', () => {
  const root = resolve('sanaka-fixture');
  const sources = [
    'src/server/contact.ts',
    'src/shared/analytics.ts',
    'src/server/legacy-wordpress-data.ts',
    'src/shared/contact.ts',
    'src/shared/newsletter.ts',
    'src/server/contact.spec.ts',
    'src/server/types.d.ts',
  ];
  const summary = {
    total: {},
    [resolve(root, sources[0])]: {},
    [sources[1]]: {},
  };
  assert.deepEqual(missingServerCoverage(summary, sources, root), []);
});

test('inventário: encontra módulos novos e módulos compartilhados ausentes do relatório', () => {
  const root = resolve('sanaka-fixture');
  const summary = { total: {}, 'src/server/contact.ts': {} };
  const sources = [
    'src/server/contact.ts',
    'src/server/nested/new-module.ts',
    'src/shared/new-contract.ts',
  ];
  assert.deepEqual(missingServerCoverage(summary, sources, root), [
    'src/server/nested/new-module.ts',
    'src/shared/new-contract.ts',
  ]);
});
