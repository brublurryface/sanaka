// Contadores jscpd observados em b0324ac, sem alterar os filtros de detecção.
const appBaseline = {
  typescript: {
    lines: 9445,
    duplicatedLines: 106,
    tokens: 65603,
    duplicatedTokens: 936,
    clones: 14,
  },
  markup: { lines: 4004, duplicatedLines: 11, tokens: 26166, duplicatedTokens: 66, clones: 1 },
  scss: { lines: 8020, duplicatedLines: 72, tokens: 43936, duplicatedTokens: 507, clones: 8 },
};

export const duplicationPolicy = {
  app: appBaseline,
  styles: {
    scss: { lines: 9246, duplicatedLines: 85, tokens: 52252, duplicatedTokens: 562, clones: 9 },
  },
};

/** Não aceita relatório vazio nem permite compensar regressões entre formatos. */
export function evaluateDuplication(report, target) {
  if (!Object.hasOwn(duplicationPolicy, target)) {
    throw new Error(`Escopo de duplicação desconhecido: ${target}`);
  }

  return Object.entries(duplicationPolicy[target]).map(([format, baseline]) => {
    const current = report?.statistics?.formats?.[format];
    if (
      !current ||
      !Number.isSafeInteger(current.sources) ||
      current.sources <= 0 ||
      ['lines', 'tokens'].some((key) => !Number.isSafeInteger(current[key]) || current[key] <= 0) ||
      ['duplicatedLines', 'duplicatedTokens', 'clones'].some(
        (key) => !Number.isSafeInteger(current[key]) || current[key] < 0,
      )
    ) {
      throw new Error(`Relatório de duplicação inválido: ${target} / ${format}`);
    }

    // Reduzir código não duplicado pode aumentar a proporção sem adicionar clones.
    const passed = ['clones', 'duplicatedLines', 'duplicatedTokens'].every(
      (key) => current[key] <= baseline[key],
    );

    return { format, current, baseline, passed };
  });
}
