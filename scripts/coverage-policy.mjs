// Contadores V8 observados no commit c386702 da PR #123.
export const coveragePolicy = {
  angular: {
    report: 'sanaka',
    baseline: {
      statements: { covered: 2452, total: 2603 },
      branches: { covered: 1705, total: 1839 },
      functions: { covered: 673, total: 711 },
      lines: { covered: 2050, total: 2174 },
    },
  },
  server: {
    report: 'server',
    baseline: {
      statements: { covered: 400, total: 401 },
      branches: { covered: 368, total: 373 },
      functions: { covered: 67, total: 67 },
      lines: { covered: 370, total: 371 },
    },
  },
};

/** Compara proporções exatas; o percentual arredondado não determina a aprovação. */
export function evaluateCoverage(summary, target) {
  if (!Object.hasOwn(coveragePolicy, target)) {
    throw new Error(`Escopo de cobertura desconhecido: ${target}`);
  }

  return Object.entries(coveragePolicy[target].baseline).map(([metric, baseline]) => {
    const { covered, total } = summary?.total?.[metric] ?? {};

    if (
      !Number.isSafeInteger(total) ||
      !Number.isSafeInteger(covered) ||
      total <= 0 ||
      covered < 0 ||
      covered > total
    ) {
      throw new Error(`Relatório de cobertura inválido: ${target} / ${metric}`);
    }

    return {
      metric,
      baseline,
      covered,
      total,
      passed: BigInt(covered) * BigInt(baseline.total) >= BigInt(baseline.covered) * BigInt(total),
    };
  });
}
