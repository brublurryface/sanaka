/**
 * Fila e mensageria didática de Ākāśa. Tudo existe só na memória desta página.
 * Não há broker real, disco, garantia de entrega ou ordenação distribuída.
 *
 * O núcleo da fila usa um índice inicial. Snapshots imutáveis e relatórios têm
 * custos adicionais de cópia; não são uma fila de produção otimizada.
 */
import { StudyStep } from '../shared/study-history';

export type DeliveryDiscipline = 'queue' | 'stack';
export const DELIVERY_LIMIT = 16;
// Limite da demonstração inteira: também limita prefixos e registros de entregas/falhas.
// Não representa uma política ou capacidade de um broker real.
export const DELIVERY_SESSION_LIMIT = 64;
export const MAX_DELIVERY_ATTEMPTS = 2;

/** id identifica a encomenda; uma nova tentativa não cria outro id. */
export interface Delivery {
  readonly id: number;
  readonly label: string;
  readonly attempts: number;
}

export interface DeliveryState {
  readonly discipline: DeliveryDiscipline;
  readonly entries: readonly Delivery[];
  readonly head: number;
  // null significa "consumidor livre". Não existe uma encomenda misteriosa indefinida.
  readonly processing: Delivery | null;
  readonly delivered: readonly Delivery[];
  readonly deadLetters: readonly Delivery[];
  readonly nextId: number;
}

export function deliveryState(discipline: DeliveryDiscipline = 'queue'): DeliveryState {
  return {
    discipline,
    entries: ['volume-01', 'volume-02', 'volume-03'].map((label, index) => ({
      id: index + 1,
      label,
      attempts: 0,
    })),
    head: 0,
    processing: null,
    delivered: [],
    deadLetters: [],
    nextId: 4,
  };
}

/** slice cria uma vista copiável para a interface, sem remover o prefixo já consumido. */
export function waitingDeliveries(state: DeliveryState): readonly Delivery[] {
  return state.entries.slice(state.head);
}

/** Um evento inclui sua explicação, evitando que a UI invente uma transição separada. */
function step(
  state: DeliveryState,
  event: string,
  parameters: Record<string, string | number> = {},
): StudyStep<DeliveryState> {
  return { state, explanationKey: `matrix.studies.entregas.events.${event}`, parameters };
}

/** O produtor pode adicionar enquanto o consumidor ainda trabalha em outra encomenda. */
// @study-start enqueue
export function enqueueDelivery(state: DeliveryState, label: string): StudyStep<DeliveryState> {
  const normalized = label.trim();
  if (!normalized) {
    return step(state, 'emptyInput');
  }
  const outstanding = state.entries.length - state.head + (state.processing === null ? 0 : 1);
  if (outstanding >= DELIVERY_LIMIT) {
    return step(state, 'limit', { limit: DELIVERY_LIMIT });
  }
  if (state.nextId > DELIVERY_SESSION_LIMIT) {
    return step(state, 'sessionLimit', { limit: DELIVERY_SESSION_LIMIT });
  }
  const parcel: Delivery = { id: state.nextId, label: normalized, attempts: 0 };
  // Os três pontos copiam referências. Esta atualização imutável custa O(n), não O(1).
  return step(
    { ...state, entries: [...state.entries, parcel], nextId: state.nextId + 1 },
    'enqueue',
    { label: normalized },
  );
}

// @study-end enqueue

/**
 * FIFO escolhe entries[head]; LIFO escolhe o final e usa slice para criar o snapshot.
 * Em ambos os casos a encomenda fica em processamento, ainda não confirmada.
 */
// @study-start start-delivery
export function startDelivery(state: DeliveryState): StudyStep<DeliveryState> {
  if (state.processing !== null) {
    return step(state, 'busy');
  }
  if (state.head >= state.entries.length) {
    return step(state, 'empty');
  }
  const fifo = state.discipline === 'queue';
  const parcel = state.entries[fifo ? state.head : state.entries.length - 1];
  return step(
    {
      ...state,
      // FIFO não chama shift: avança o índice. O prefixo permanece até o reinício.
      head: fifo ? state.head + 1 : state.head,
      entries: fifo ? state.entries : state.entries.slice(0, -1),
      processing: { ...parcel, attempts: parcel.attempts + 1 },
    },
    fifo ? 'startFifo' : 'startLifo',
    { label: parcel.label, attempt: parcel.attempts + 1 },
  );
}
// @study-end start-delivery

/** Ack simulado: só depois da confirmação a encomenda aparece em delivered. */
// @study-start confirm-delivery
export function acknowledgeDelivery(state: DeliveryState): StudyStep<DeliveryState> {
  if (state.processing === null) {
    return step(state, 'nothingToConfirm');
  }
  const parcel = state.processing;
  return step({ ...state, processing: null, delivered: [...state.delivered, parcel] }, 'ack', {
    label: parcel.label,
  });
}
// @study-end confirm-delivery

/**
 * A falha devolve a encomenda ao final enquanto houver tentativas.
 * Depois do limite, registra uma dead-letter local para inspeção.
 * Não prometemos "exactly once": esta é uma política explícita de simulação.
 */
// @study-start retry-delivery
export function failDelivery(state: DeliveryState): StudyStep<DeliveryState> {
  if (state.processing === null) {
    return step(state, 'nothingToFail');
  }
  const parcel = state.processing;
  if (parcel.attempts < MAX_DELIVERY_ATTEMPTS) {
    return step({ ...state, processing: null, entries: [...state.entries, parcel] }, 'retry', {
      label: parcel.label,
      attempt: parcel.attempts,
    });
  }
  return step(
    { ...state, processing: null, deadLetters: [...state.deadLetters, parcel] },
    'deadLetter',
    { label: parcel.label, attempt: parcel.attempts },
  );
}
// @study-end retry-delivery

export interface QueueComparison {
  readonly fifo: readonly string[];
  readonly lifo: readonly string[];
  readonly indexed: readonly string[];
  readonly conceptualShifts: number;
  readonly headReads: number;
}

/**
 * Executa push/shift/pop e a leitura por índice com as mesmas entradas.
 * conceptualShifts estima posições que precisam mudar num modelo denso simples;
 * não mede instruções internas do motor JS nem tempo de execução.
 */
// @study-start compare-structures
export function compareQueues(labels: readonly string[]): QueueComparison {
  const queue: string[] = [];
  const stack: string[] = [];
  for (const label of labels) {
    queue.push(label);
    stack.push(label);
  }
  const fifo: string[] = [];
  const lifo: string[] = [];
  const indexed: string[] = [];
  let conceptualShifts = 0;
  while (queue.length > 0) {
    conceptualShifts += queue.length - 1;
    // O guarda acima assegura que shift retorna string, não undefined.
    fifo.push(queue.shift()!);
    lifo.push(stack.pop()!);
  }
  // A consulta de cada posição não exige deslocar as posições seguintes.
  for (let head = 0; head < labels.length; head += 1) {
    indexed.push(labels[head]);
  }
  return { fifo, lifo, indexed, conceptualShifts, headReads: labels.length };
}
// @study-end compare-structures
