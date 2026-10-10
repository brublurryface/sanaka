/**
 * Catálogo único da Matrix. Este arquivo descreve a navegação; não executa os estudos.
 *
 * `readonly` protege o contrato contra atribuições acidentais no TypeScript.
 * Não equivale a congelar objetos em tempo de execução. A interface não deve mutá-los.
 */
export interface MatrixExperiment {
  readonly id: string;
  readonly number: string;
  readonly translationKey: string;
  readonly status: 'available' | 'planned';
  readonly route?: string;
  readonly character?: string;
  readonly concepts: readonly string[];
  readonly difficulty: 'introductory' | 'intermediate';
  readonly prerequisites: readonly string[];
}

/**
 * Os números pertencem ao catálogo, não a cada card. Há seis estudos disponíveis
 * na V1 completa e três futuros. Um estudo só recebe link quando estiver funcional.
 */
export const MATRIX_EXPERIMENTS: readonly MatrixExperiment[] = [
  {
    id: 'components',
    number: '01',
    translationKey: 'matrix.catalog.available',
    status: 'available',
    route: '/matrix/components',
    concepts: ['@Input', '@Output'],
    difficulty: 'introductory',
    prerequisites: [],
  },
  {
    id: 'rest-api',
    number: '02',
    translationKey: 'matrix.catalog.rest',
    status: 'available',
    route: '/matrix/rest-api',
    concepts: ['HTTP', 'RxJS'],
    difficulty: 'introductory',
    prerequisites: [],
  },
  {
    id: 'obolos',
    number: '03',
    translationKey: 'matrix.studies.obolos',
    status: 'available',
    route: '/matrix/obolos',
    character: 'Mors',
    concepts: ['Array', 'Set', 'Map', 'Big-O'],
    difficulty: 'introductory',
    prerequisites: [],
  },
  {
    id: 'entregas',
    number: '04',
    translationKey: 'matrix.studies.entregas',
    status: 'available',
    route: '/matrix/entregas',
    character: 'Ākāśa',
    concepts: ['Queue', 'Stack', 'FIFO', 'retry'],
    difficulty: 'intermediate',
    prerequisites: ['obolos'],
  },
  {
    id: 'jogo',
    number: '05',
    translationKey: 'matrix.studies.jogo',
    status: 'available',
    route: '/matrix/jogo',
    character: 'Kālikā',
    concepts: ['OOP', 'composition', 'SOLID'],
    difficulty: 'intermediate',
    prerequisites: ['obolos'],
  },
  {
    id: 'padaria',
    number: '06',
    translationKey: 'matrix.studies.padaria',
    status: 'available',
    route: '/matrix/padaria',
    character: 'Māyā',
    concepts: ['HTTP', 'API', 'BFF', 'idempotency'],
    difficulty: 'intermediate',
    prerequisites: ['entregas'],
  },
  {
    id: 'signals',
    number: '07',
    translationKey: 'matrix.catalog.upcoming.signals',
    status: 'planned',
    concepts: ['Signals'],
    difficulty: 'introductory',
    prerequisites: [],
  },
  {
    id: 'observables',
    number: '08',
    translationKey: 'matrix.catalog.upcoming.observables',
    status: 'planned',
    concepts: ['Observables'],
    difficulty: 'intermediate',
    prerequisites: [],
  },
  {
    id: 'lifecycle',
    number: '09',
    translationKey: 'matrix.catalog.upcoming.lifecycle',
    status: 'planned',
    concepts: ['Lifecycle'],
    difficulty: 'intermediate',
    prerequisites: [],
  },
];
