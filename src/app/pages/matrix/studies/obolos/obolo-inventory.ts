/**
 * Domínio do inventário de Mors. Nenhuma função consulta WordPress ou modifica
 * o contador real de óbolos. As moedas aqui são identificadores abstratos.
 *
 * As funções recebem listas readonly e devolvem dados novos. Isso permite testar
 * a lógica sem Angular, DOM, rede ou temporizadores.
 */
import { StudyStep } from '../shared/study-history';

// Um máximo pequeno mantém a experiência e seus snapshots legíveis no celular.
// Não representa um limite da estrutura Array do JavaScript.
export const INVENTORY_LIMIT = 16;

export interface InventoryState {
  readonly items: readonly string[];
  // null significa "nenhum índice destacado"; índice zero continua sendo válido.
  readonly activeIndex: number | null;
  readonly comparedIndex: number | null;
  readonly duplicates: readonly string[];
  readonly comparisons: number;
  readonly lookups: number;
  readonly seen: readonly string[];
}

export interface InventoryReport {
  readonly duplicates: readonly string[];
  readonly comparisons: number;
  readonly lookups: number;
}

/** Cria o primeiro estado sem guardar a referência mutável da entrada. */
export function inventoryState(items: readonly string[]): InventoryState {
  return {
    items: [...items],
    activeIndex: null,
    comparedIndex: null,
    duplicates: [],
    comparisons: 0,
    lookups: 0,
    seen: [],
  };
}

/**
 * Retorna undefined quando o índice não identifica uma posição existente.
 * Não usamos `if (!index)`, pois isso rejeitaria indevidamente o índice 0.
 */
// @study-start read-index
export function readObolo(items: readonly string[], index: number): string | undefined {
  // Number.isInteger rejeita 1.5, NaN e Infinity. A conjunção && exige ambas as condições.
  if (!Number.isInteger(index) || index < 0 || index >= items.length) {
    return undefined;
  }
  // O operador [] consulta a posição, não procura um identificador por todo o array.
  return items[index];
}
// @study-end read-index

// @study-start edit-array
/** Adicionar custa O(n) aqui: espalhamos n referências para preservar a entrada. */
export function addObolo(items: readonly string[], identifier: string): readonly string[] {
  const normalized = identifier.trim();
  if (!normalized || items.length >= INVENTORY_LIMIT) {
    return items;
  }
  return [...items, normalized];
}

/** Remoção imutável: os índices posteriores mudam, mas o array original não muda. */
export function removeObolo(items: readonly string[], index: number): readonly string[] {
  if (readObolo(items, index) === undefined) {
    return items;
  }
  return items.filter((_, position) => position !== index);
}
// @study-end edit-array

/**
 * Percurso linear. Produz exatamente um passo por elemento, sem animação obrigatória.
 * Guardar um snapshot não reexecuta a operação; voltar apenas inspeciona seu resultado.
 */
// @study-start traversal
export function traversalSteps(items: readonly string[]): readonly StudyStep<InventoryState>[] {
  const initial = inventoryState(items);
  return [
    { state: initial, explanationKey: 'matrix.studies.obolos.events.initial', parameters: {} },
    ...items.map((identifier, index) => ({
      state: { ...initial, activeIndex: index },
      explanationKey: 'matrix.studies.obolos.events.visit',
      parameters: { index, identifier },
    })),
  ];
}
// @study-end traversal

/**
 * Compara todas as duplas distintas; não para na primeira duplicata.
 * São n(n-1)/2 comparações: O(n²) de tempo para o núcleo do algoritmo.
 * O Set do resultado apenas evita listar a mesma duplicata várias vezes.
 * A coleção de duplicados ocupa O(n) no pior caso. O histórico de O(n²) passos
 * pode copiar O(n) identificadores por passo: até O(n³) referências no traçado.
 * Não confundimos essa memória de visualização com o espaço do núcleo da busca.
 */
// @study-start nested-loops
export function nestedDuplicateSteps(
  items: readonly string[],
): readonly StudyStep<InventoryState>[] {
  const initial = inventoryState(items);
  const steps: StudyStep<InventoryState>[] = [
    { state: initial, explanationKey: 'matrix.studies.obolos.events.nestedStart', parameters: {} },
  ];
  const duplicates = new Set<string>();
  // let permite atualizar o contador; const impediria sua reatribuição.
  let comparisons = 0;

  for (let left = 0; left < items.length; left += 1) {
    // right começa depois de left: não compara um elemento consigo mesmo ou uma dupla duas vezes.
    for (let right = left + 1; right < items.length; right += 1) {
      comparisons += 1;
      const equal = items[left] === items[right];
      if (equal) {
        duplicates.add(items[left]);
      }
      steps.push({
        state: {
          ...initial,
          activeIndex: left,
          comparedIndex: right,
          duplicates: [...duplicates].sort(),
          comparisons,
        },
        explanationKey: equal
          ? 'matrix.studies.obolos.events.equal'
          : 'matrix.studies.obolos.events.different',
        parameters: { left, right, comparisons },
      });
    }
  }
  return steps;
}
// @study-end nested-loops

/**
 * Percorre n elementos e realiza n chamadas a Set.has.
 * Em implementações com hash, costuma-se esperar O(n) médio para essa estratégia.
 * ECMAScript exige acesso sublinear médio, não O(1) garantido para toda consulta.
 * Os arrays `seen` e `duplicates` são cópias para mostrar os estados: seu custo não
 * faz parte da contagem de consultas e pode dominar o custo da visualização.
 * O núcleo guarda O(n) chaves; os snapshots podem acumular O(n²) referências.
 */
// @study-start set-search
export function setDuplicateSteps(items: readonly string[]): readonly StudyStep<InventoryState>[] {
  const initial = inventoryState(items);
  const steps: StudyStep<InventoryState>[] = [
    { state: initial, explanationKey: 'matrix.studies.obolos.events.setStart', parameters: {} },
  ];
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (let index = 0; index < items.length; index += 1) {
    const identifier = items[index];
    // has() responde se a chave existe; não informa quantas vezes ela apareceu.
    const repeated = seen.has(identifier);
    if (repeated) {
      duplicates.add(identifier);
    }
    seen.add(identifier);
    steps.push({
      state: {
        ...initial,
        activeIndex: index,
        lookups: index + 1,
        duplicates: [...duplicates].sort(),
        seen: [...seen],
      },
      explanationKey: repeated
        ? 'matrix.studies.obolos.events.repeated'
        : 'matrix.studies.obolos.events.new',
      parameters: { index, identifier, lookups: index + 1 },
    });
  }
  return steps;
}
// @study-end set-search

/** Extrai os fatos do último snapshot, a mesma fonte de verdade exibida na interface. */
export function inventoryReport(steps: readonly StudyStep<InventoryState>[]): InventoryReport {
  const final = steps[steps.length - 1].state;
  return { duplicates: final.duplicates, comparisons: final.comparisons, lookups: final.lookups };
}

/**
 * Um Map associa cada chave à quantidade de ocorrências. Um Set só guardaria as chaves.
 * O(n) inserções/consultas conceituais; a complexidade média de acesso depende do motor.
 */
// @study-start map-count
export function countObolos(items: readonly string[]): ReadonlyMap<string, number> {
  const quantities = new Map<string, number>();
  for (const identifier of items) {
    // get() pode devolver undefined. ?? usa zero apenas para null/undefined, não para todo falsy.
    const previous = quantities.get(identifier) ?? 0;
    quantities.set(identifier, previous + 1);
  }
  return quantities;
}
// @study-end map-count
