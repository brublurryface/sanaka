/** Cenários da interface: executam o mesmo algoritmo que o inventário de Mors. */
import { runStudyChecks, StudyCheck } from '../shared/study-checks';
import {
  addObolo,
  countObolos,
  inventoryReport,
  nestedDuplicateSteps,
  readObolo,
  setDuplicateSteps,
} from './obolo-inventory';

export function runOboloChecks(): readonly StudyCheck[] {
  // Cada caso fornece entrada, expectativa e ação, como no Arrange/Act/Assert dos specs.
  return runStudyChecks([
    {
      key: 'matrix.studies.obolos.checks.zero',
      expected: 'mors',
      run: () => readObolo(['mors'], 0),
    },
    {
      key: 'matrix.studies.obolos.checks.missing',
      expected: undefined,
      run: () => readObolo([], 0),
    },
    {
      key: 'matrix.studies.obolos.checks.duplicates',
      expected: ['maya'],
      run: () => inventoryReport(setDuplicateSteps(['maya', 'mors', 'maya'])).duplicates,
    },
    {
      key: 'matrix.studies.obolos.checks.agreement',
      expected: true,
      run: () => {
        const items = ['mors', 'maya', 'maya', 'mors'];
        return (
          JSON.stringify(inventoryReport(nestedDuplicateSteps(items)).duplicates) ===
          JSON.stringify(inventoryReport(setDuplicateSteps(items)).duplicates)
        );
      },
    },
    {
      key: 'matrix.studies.obolos.checks.operations',
      expected: 6,
      run: () => inventoryReport(nestedDuplicateSteps(['a', 'b', 'c', 'd'])).comparisons,
    },
    { key: 'matrix.studies.obolos.checks.empty', expected: [], run: () => addObolo([], '   ') },
    {
      key: 'matrix.studies.obolos.checks.map',
      expected: 2,
      run: () => countObolos(['mors', 'mors']).get('mors'),
    },
  ]);
}
