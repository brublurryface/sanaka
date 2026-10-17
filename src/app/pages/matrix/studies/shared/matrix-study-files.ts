/**
 * Endereços dos arquivos reais. O caminho do algoritmo é informado uma única vez.
 * Os links apontam ao commit que contém o código desta entrega, em vez de depender
 * do nome de uma branch. Assim, continuam úteis quando a branch de trabalho for removida.
 */
import { MatrixStudyId } from './matrix-study-definition';

// A referência fixa liga os recortes desta revisão aos arquivos correspondentes,
// inclusive depois que a branch de trabalho for removida.
export const MATRIX_STUDY_SOURCE_REF: string | undefined =
  '690bca5fb8a2772aa3363fddc5fa9088619d7865';

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
