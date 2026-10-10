// Gerado por scripts/matrix-study-source.mjs. Fonte: delivery-queue.ts.
import { StudySource } from '../shared/matrix-study-definition';
export const DELIVERY_SOURCES: readonly StudySource[] = [
  {
    index: 0,
    fileName: 'delivery-queue.ts',
    titleKey: 'matrix.studies.entregas.sources.start-delivery.title',
    descriptionKey: 'matrix.studies.entregas.sources.start-delivery.description',
    text: "export function startDelivery(state: DeliveryState): StudyStep<DeliveryState> {\n  if (state.processing !== null) {\n    return step(state, 'busy');\n  }\n  if (state.head >= state.entries.length) {\n    return step(state, 'empty');\n  }\n  const fifo = state.discipline === 'queue';\n  const parcel = state.entries[fifo ? state.head : state.entries.length - 1];\n  return step(\n    {\n      ...state,\n      // FIFO não chama shift: avança o índice. O prefixo permanece até o reinício.\n      head: fifo ? state.head + 1 : state.head,\n      entries: fifo ? state.entries : state.entries.slice(0, -1),\n      processing: { ...parcel, attempts: parcel.attempts + 1 },\n    },\n    fifo ? 'startFifo' : 'startLifo',\n    { label: parcel.label, attempt: parcel.attempts + 1 },\n  );\n}",
  },
  {
    index: 1,
    fileName: 'delivery-queue.ts',
    titleKey: 'matrix.studies.entregas.sources.confirm-delivery.title',
    descriptionKey: 'matrix.studies.entregas.sources.confirm-delivery.description',
    text: "export function acknowledgeDelivery(state: DeliveryState): StudyStep<DeliveryState> {\n  if (state.processing === null) {\n    return step(state, 'nothingToConfirm');\n  }\n  const parcel = state.processing;\n  return step({ ...state, processing: null, delivered: [...state.delivered, parcel] }, 'ack', {\n    label: parcel.label,\n  });\n}",
  },
  {
    index: 2,
    fileName: 'delivery-queue.ts',
    titleKey: 'matrix.studies.entregas.sources.retry-delivery.title',
    descriptionKey: 'matrix.studies.entregas.sources.retry-delivery.description',
    text: "export function failDelivery(state: DeliveryState): StudyStep<DeliveryState> {\n  if (state.processing === null) {\n    return step(state, 'nothingToFail');\n  }\n  const parcel = state.processing;\n  if (parcel.attempts < MAX_DELIVERY_ATTEMPTS) {\n    return step({ ...state, processing: null, entries: [...state.entries, parcel] }, 'retry', {\n      label: parcel.label,\n      attempt: parcel.attempts,\n    });\n  }\n  return step(\n    { ...state, processing: null, deadLetters: [...state.deadLetters, parcel] },\n    'deadLetter',\n    { label: parcel.label, attempt: parcel.attempts },\n  );\n}",
  },
  {
    index: 3,
    fileName: 'delivery-queue.ts',
    titleKey: 'matrix.studies.entregas.sources.compare-structures.title',
    descriptionKey: 'matrix.studies.entregas.sources.compare-structures.description',
    text: 'export function compareQueues(labels: readonly string[]): QueueComparison {\n  const queue: string[] = [];\n  const stack: string[] = [];\n  for (const label of labels) {\n    queue.push(label);\n    stack.push(label);\n  }\n  const fifo: string[] = [];\n  const lifo: string[] = [];\n  const indexed: string[] = [];\n  let conceptualShifts = 0;\n  while (queue.length > 0) {\n    conceptualShifts += queue.length - 1;\n    // O guarda acima assegura que shift retorna string, não undefined.\n    fifo.push(queue.shift()!);\n    lifo.push(stack.pop()!);\n  }\n  // A consulta de cada posição não exige deslocar as posições seguintes.\n  for (let head = 0; head < labels.length; head += 1) {\n    indexed.push(labels[head]);\n  }\n  return { fifo, lifo, indexed, conceptualShifts, headReads: labels.length };\n}',
  },
];
