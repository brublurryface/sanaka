// Os limites preservam os valores observados na PR #123, sem arredondá-los para baixo.
export const coveragePolicy = {
  angular: {
    report: 'sanaka',
    minimum: { statements: 94.19, branches: 92.71, functions: 94.65, lines: 94.29 },
  },
  server: {
    report: 'server',
    minimum: { statements: 99.75, branches: 98.65, functions: 100, lines: 99.73 },
  },
};

/** Compara os contadores reais; um relatório ausente ou inválido não pode aprovar a entrega. */
export function evaluateCoverage(summary, target) {
  if (!Object.hasOwn(coveragePolicy, target)) {
    throw new Error(`Escopo de cobertura desconhecido: ${target}`);
  }

  return Object.entries(coveragePolicy[target].minimum).map(([metric, minimum]) => {
    const entry = summary?.total?.[metric];
    const { covered, total } = entry ?? {};

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
      minimum,
      actual: (covered / total) * 100,
      passed: covered * 10000 >= Math.round(minimum * 100) * total,
    };
  });
}
