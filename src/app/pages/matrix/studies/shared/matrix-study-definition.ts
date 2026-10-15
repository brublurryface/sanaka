/** Contratos editoriais compartilhados, sem impor um algoritmo único aos estudos. */
export type MatrixStudyId = 'obolos' | 'entregas' | 'jogo' | 'padaria';

export interface MatrixStudyDefinition {
  readonly id: MatrixStudyId;
  // As listas contêm identificadores de tradução, nunca HTML injetado.
  readonly topics: readonly string[];
  readonly investigations: readonly string[];
  readonly relatedRoute?: string;
  // Sem arte disponível, undefined significa fallback neutro: nenhuma URL quebrada.
  readonly desktopImage?: string;
  readonly mobileImage?: string;
}

/** Faixa de cor que aponta ao texto original, com os mesmos tokens visuais de Components. */
export interface StudySourceToken {
  // Os limites usam posições do texto original, sem copiar nem reescrever o código.
  readonly start: number;
  readonly end: number;
  readonly className: string;
}

/** Um recorte gerado do arquivo real, mantendo explicações em PT-BR. */
export interface StudySource {
  readonly index: number;
  readonly fileName: string;
  readonly titleKey: string;
  readonly descriptionKey: string;
  readonly text: string;
  readonly tokens: readonly StudySourceToken[];
}

/** Localiza um recorte pelo marcador do gerador, sem depender da ordem do catálogo. */
export function studySource(
  sources: readonly StudySource[],
  section: string,
): StudySource | undefined {
  return sources.find((source) => source.titleKey.endsWith(`.sources.${section}.title`));
}
