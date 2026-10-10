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

/** Um recorte gerado do arquivo real, mantendo explicações em PT-BR. */
export interface StudySource {
  readonly index: number;
  readonly fileName: string;
  readonly titleKey: string;
  readonly descriptionKey: string;
  readonly text: string;
}
