// Gerado por scripts/matrix-study-source.mjs. Fonte: obolo-inventory.ts.
import { StudySource } from '../shared/matrix-study-definition';
export const OBOLO_SOURCES: readonly StudySource[] = [
  {
    index: 0,
    fileName: 'obolo-inventory.ts',
    titleKey: 'matrix.studies.obolos.sources.read-index.title',
    descriptionKey: 'matrix.studies.obolos.sources.read-index.description',
    text: 'export function readObolo(items: readonly string[], index: number): string | undefined {\n  // Number.isInteger rejeita 1.5, NaN e Infinity. A conjunção && exige ambas as condições.\n  if (!Number.isInteger(index) || index < 0 || index >= items.length) {\n    return undefined;\n  }\n  // O operador [] consulta a posição, não procura um identificador por todo o array.\n  return items[index];\n}',
  },
  {
    index: 1,
    fileName: 'obolo-inventory.ts',
    titleKey: 'matrix.studies.obolos.sources.nested-loops.title',
    descriptionKey: 'matrix.studies.obolos.sources.nested-loops.description',
    text: "export function nestedDuplicateSteps(\n  items: readonly string[],\n): readonly StudyStep<InventoryState>[] {\n  const initial = inventoryState(items);\n  const steps: StudyStep<InventoryState>[] = [\n    { state: initial, explanationKey: 'matrix.studies.obolos.events.nestedStart', parameters: {} },\n  ];\n  const duplicates = new Set<string>();\n  // let permite atualizar o contador; const impediria sua reatribuição.\n  let comparisons = 0;\n\n  for (let left = 0; left < items.length; left += 1) {\n    // right começa depois de left: não compara um elemento consigo mesmo ou uma dupla duas vezes.\n    for (let right = left + 1; right < items.length; right += 1) {\n      comparisons += 1;\n      const equal = items[left] === items[right];\n      if (equal) {\n        duplicates.add(items[left]);\n      }\n      steps.push({\n        state: {\n          ...initial,\n          activeIndex: left,\n          comparedIndex: right,\n          duplicates: [...duplicates].sort(),\n          comparisons,\n        },\n        explanationKey: equal\n          ? 'matrix.studies.obolos.events.equal'\n          : 'matrix.studies.obolos.events.different',\n        parameters: { left, right, comparisons },\n      });\n    }\n  }\n  return steps;\n}",
  },
  {
    index: 2,
    fileName: 'obolo-inventory.ts',
    titleKey: 'matrix.studies.obolos.sources.set-search.title',
    descriptionKey: 'matrix.studies.obolos.sources.set-search.description',
    text: "export function setDuplicateSteps(items: readonly string[]): readonly StudyStep<InventoryState>[] {\n  const initial = inventoryState(items);\n  const steps: StudyStep<InventoryState>[] = [\n    { state: initial, explanationKey: 'matrix.studies.obolos.events.setStart', parameters: {} },\n  ];\n  const seen = new Set<string>();\n  const duplicates = new Set<string>();\n\n  for (let index = 0; index < items.length; index += 1) {\n    const identifier = items[index];\n    // has() responde se a chave existe; não informa quantas vezes ela apareceu.\n    const repeated = seen.has(identifier);\n    if (repeated) {\n      duplicates.add(identifier);\n    }\n    seen.add(identifier);\n    steps.push({\n      state: {\n        ...initial,\n        activeIndex: index,\n        lookups: index + 1,\n        duplicates: [...duplicates].sort(),\n        seen: [...seen],\n      },\n      explanationKey: repeated\n        ? 'matrix.studies.obolos.events.repeated'\n        : 'matrix.studies.obolos.events.new',\n      parameters: { index, identifier, lookups: index + 1 },\n    });\n  }\n  return steps;\n}",
  },
  {
    index: 3,
    fileName: 'obolo-inventory.ts',
    titleKey: 'matrix.studies.obolos.sources.map-count.title',
    descriptionKey: 'matrix.studies.obolos.sources.map-count.description',
    text: 'export function countObolos(items: readonly string[]): ReadonlyMap<string, number> {\n  const quantities = new Map<string, number>();\n  for (const identifier of items) {\n    // get() pode devolver undefined. ?? usa zero apenas para null/undefined, não para todo falsy.\n    const previous = quantities.get(identifier) ?? 0;\n    quantities.set(identifier, previous + 1);\n  }\n  return quantities;\n}',
  },
];
