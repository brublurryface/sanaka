/**
 * Endereços dos arquivos reais. O caminho do algoritmo é informado uma única vez.
 * Quando a branch for publicada com autorização, defina SOURCE_REF para habilitar links.
 * Antes disso, mostramos caminhos honestos, não URLs para arquivos inexistentes no GitHub.
 */
import { MatrixStudyId } from './matrix-study-definition';

export const MATRIX_STUDY_SOURCE_REF: string | undefined = undefined;

export interface StudyFile {
  readonly kind: string;
  readonly path: string;
}
const DOMAIN_FILES: Record<MatrixStudyId, string> = {
  obolos: 'obolo-inventory',
  entregas: 'delivery-queue',
  jogo: 'kalika-game',
  padaria: 'bakery-api',
};

export function studyFiles(id: MatrixStudyId): readonly StudyFile[] {
  const directory = `src/app/pages/matrix/studies/${id}/`;
  return [
    { kind: 'component', path: `${directory}${id}-lab.ts` },
    { kind: 'template', path: `${directory}${id}-lab.html` },
    { kind: 'styles', path: 'src/styles/_matrix-studies.scss' },
    { kind: 'domain', path: `${directory}${DOMAIN_FILES[id]}.ts` },
    { kind: 'tests', path: `${directory}${DOMAIN_FILES[id]}.spec.ts` },
  ];
}

export function studySourceUrl(path: string, ref: string | undefined): string | null {
  return ref ? `https://github.com/brublurryface/sanaka/blob/${ref}/${path}` : null;
}
