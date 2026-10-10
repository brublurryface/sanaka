/**
 * Pequenos cenários executáveis na interface. Usam as funções reais do domínio.
 * Não substituem a suíte Vitest e não executam código fornecido por visitantes.
 */
export interface StudyCheck {
  readonly key: string;
  readonly passed: boolean;
  readonly expected: string;
  readonly actual: string;
}

/** Os casos são definidos pela autora; não há eval, new Function ou interpretação de texto. */
export interface StudyCheckCase {
  readonly key: string;
  readonly expected: unknown;
  readonly run: () => unknown;
}

export function runStudyChecks(cases: readonly StudyCheckCase[]): readonly StudyCheck[] {
  // map percorre todos os cenários e devolve uma lista nova com os resultados.
  return cases.map((test) => {
    const expected = String(JSON.stringify(test.expected));
    let actual: string;
    try {
      // A função já existe no programa. A interface apenas a chama, sem compilar texto.
      actual = String(JSON.stringify(test.run()));
    } catch (error) {
      // unknown obriga verificar o tipo antes de consultar message.
      actual = error instanceof Error ? error.message : String(error);
    }
    return { key: test.key, passed: actual === expected, expected, actual };
  });
}
