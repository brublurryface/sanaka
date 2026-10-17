/**
 * Servidor HTTP inteiramente simulado em memória. Não usa fetch, HttpClient ou dinheiro.
 * Funções puras recebem o banco fictício e devolvem outro snapshot; não gravam nada fora.
 * find/map/spread copiam ou percorrem coleções: o simulador não promete custo O(1).
 */
import { StudyStep } from '../shared/study-history';

export type BakeryFailure = 'none' | 'server' | 'network';
export type BakeryPhase =
  'idle' | 'pending' | 'success' | 'httpError' | 'networkError' | 'localError';
export interface BakeryProduct {
  readonly id: string;
  readonly priceCredits: number;
  readonly stock: number;
}
export interface BakeryOrder {
  readonly id: string;
  readonly productId: string;
  readonly quantity: number;
  readonly totalCredits: number;
  readonly delivery: boolean;
}
export interface BakeryPayment {
  readonly id: string;
  readonly orderId: string;
  readonly amountCredits: number;
}

// @study-start request-contract
/** Contratos do exemplo. O servidor ainda valida entradas: tipos TS não protegem uma API real. */
export type OrderBody = {
  readonly productId: string;
  readonly quantity: number;
  readonly delivery: boolean;
};
export type PaymentBody = { readonly orderId: string; readonly token: 'demo-token' };
export interface BakeryRequest {
  readonly method: 'GET' | 'POST';
  readonly path: string;
  readonly body?: Readonly<Record<string, string | number | boolean>>;
  // Aqui a chave representa um header de requisição, não um campo do pagamento.
  readonly idempotencyKey?: string;
}
export interface BakeryResponse {
  readonly status: 200 | 201 | 400 | 404 | 409 | 500;
  readonly body: unknown;
  readonly headers?: Readonly<Record<string, string>>;
}
// @study-end request-contract

interface PaymentMemo {
  readonly fingerprint: string;
  readonly payment: BakeryPayment;
}
export interface BakeryState {
  readonly products: readonly BakeryProduct[];
  readonly orders: readonly BakeryOrder[];
  readonly payments: readonly BakeryPayment[];
  readonly paymentKeys: Readonly<Record<string, PaymentMemo>>;
  readonly request: BakeryRequest | null;
  readonly response: BakeryResponse | null;
  readonly phase: BakeryPhase;
  readonly failure: BakeryFailure;
}

/** Produtos e créditos não correspondem a uma loja ou moeda real. */
export function bakeryState(unavailable = false): BakeryState {
  return {
    products: [
      { id: 'bread', priceCredits: 3, stock: unavailable ? 0 : 8 },
      { id: 'cake', priceCredits: 5, stock: 5 },
    ],
    orders: [],
    payments: [],
    paymentKeys: {},
    request: null,
    response: null,
    phase: 'idle',
    failure: 'none',
  };
}

function step(state: BakeryState, event: string): StudyStep<BakeryState> {
  return { state, explanationKey: `matrix.studies.padaria.events.${event}`, parameters: {} };
}

/**
 * Limite local evita uma entrada acidentalmente gigantesca. O backend valida novamente.
 * Number.isInteger rejeita NaN, infinito e frações, não só valores negativos.
 */
export function validQuantity(quantity: unknown): quantity is number {
  return (
    typeof quantity === 'number' && Number.isInteger(quantity) && quantity >= 1 && quantity <= 20
  );
}

export function localQuantityError(state: BakeryState): StudyStep<BakeryState> {
  return step({ ...state, request: null, response: null, phase: 'localError' }, 'localValidation');
}

/** Pending é uma espera controlada. A pessoa resolve a requisição, sem timer invisível. */
export function beginBakeryRequest(
  state: BakeryState,
  request: BakeryRequest,
  failure: BakeryFailure,
): StudyStep<BakeryState> {
  if (state.phase === 'pending') {
    return step(state, 'busy');
  }
  return step({ ...state, request, failure, response: null, phase: 'pending' }, 'pending');
}

function respond(
  state: BakeryState,
  status: BakeryResponse['status'],
  body: unknown,
  headers?: BakeryResponse['headers'],
): BakeryState {
  return {
    ...state,
    response: { status, body, ...(headers ? { headers } : {}) },
    phase: status >= 400 ? 'httpError' : 'success',
  };
}

// @study-start create-order
/** Validação e criação são responsabilidades do servidor simulado, não do template. */
export function createBakeryOrder(state: BakeryState, body: BakeryRequest['body']): BakeryState {
  // [] lê campos de um Record. typeof e a guarda de quantidade estreitam seus tipos.
  if (
    !body ||
    typeof body['productId'] !== 'string' ||
    !validQuantity(body['quantity']) ||
    typeof body['delivery'] !== 'boolean'
  ) {
    return respond(state, 400, { code: 'INVALID_ORDER' });
  }
  const product = state.products.find((item) => item.id === body['productId']);
  if (!product) {
    return respond(state, 404, { code: 'PRODUCT_NOT_FOUND' });
  }
  if (product.stock < body['quantity']) {
    return respond(state, 409, { code: 'INSUFFICIENT_STOCK' });
  }
  // Limite didático da sessão, não uma regra de negócio recomendada para produção.
  if (state.orders.length >= 20) {
    return respond(state, 409, { code: 'DEMO_LIMIT' });
  }
  const order: BakeryOrder = {
    id: `order-${state.orders.length + 1}`,
    productId: product.id,
    quantity: body['quantity'],
    totalCredits: product.priceCredits * body['quantity'],
    delivery: body['delivery'],
  };
  const products = state.products.map((item) =>
    item.id === product.id ? { ...item, stock: item.stock - order.quantity } : item,
  );
  return respond(
    { ...state, products, orders: [...state.orders, order] },
    201,
    { order },
    { Location: `/api/pedidos/${order.id}` },
  );
}
// @study-end create-order

// @study-start idempotent-payment
/**
 * Pagamento FICTÍCIO. Só aceita o token constante demo-token. Nunca peça dados bancários.
 * Chave + conteúdo identificam a intenção. Repetir a mesma intenção não produz novo efeito.
 * Sem chave, o modo deliberadamente inseguro duplica registros para demonstrar o problema.
 * Produção exigiria autenticação, armazenamento durável, transações, concorrência e expiração.
 */
export function payBakeryOrder(state: BakeryState, request: BakeryRequest): BakeryState {
  const body = request.body;
  if (!body || typeof body['orderId'] !== 'string' || body['token'] !== 'demo-token') {
    return respond(state, 400, { code: 'INVALID_DEMO_PAYMENT' });
  }
  const order = state.orders.find((item) => item.id === body['orderId']);
  if (!order) {
    return respond(state, 404, { code: 'ORDER_NOT_FOUND' });
  }
  const key = request.idempotencyKey?.trim();
  if (request.idempotencyKey !== undefined && !key) {
    return respond(state, 400, { code: 'EMPTY_KEY' });
  }
  const fingerprint = JSON.stringify({ orderId: order.id, token: body['token'] });
  // hasOwn evita confundir chaves como "constructor" com propriedades herdadas de Object.
  const memo = key && Object.hasOwn(state.paymentKeys, key) ? state.paymentKeys[key] : undefined;
  if (memo) {
    return memo.fingerprint === fingerprint
      ? respond(state, 200, { payment: memo.payment, replayed: true })
      : respond(state, 409, { code: 'KEY_CONFLICT' });
  }
  if (state.payments.length >= 40) {
    return respond(state, 409, { code: 'DEMO_LIMIT' });
  }
  const payment: BakeryPayment = {
    id: `payment-${state.payments.length + 1}`,
    orderId: order.id,
    amountCredits: order.totalCredits,
  };
  const paymentKeys = key
    ? { ...state.paymentKeys, [key]: { fingerprint, payment } }
    : state.paymentKeys;
  return respond({ ...state, payments: [...state.payments, payment], paymentKeys }, 201, {
    payment,
    replayed: false,
  });
}
// @study-end idempotent-payment

// @study-start bff-view
/**
 * Exemplo de contrato adaptado para uma tela, montado a partir de duas coleções locais.
 * Um BFF real poderia buscar serviços separados. Aqui não há outro servidor ou rede.
 * Só faz sentido ter essa camada se agregar/adaptar dados beneficiar seus consumidores.
 */
export function bakeryView(products: readonly BakeryProduct[], orders: readonly BakeryOrder[]) {
  return {
    menu: products.map(({ id, stock, priceCredits }) => ({ id, stock, priceCredits })),
    recentOrders: orders
      .slice(-3)
      .map((order) => ({ id: order.id, productId: order.productId, quantity: order.quantity })),
  };
}
// @study-end bff-view

/** Encaminha paths conhecidos. Não executa código ou URL fornecidos pelo visitante. */
function routeRequest(state: BakeryState, request: BakeryRequest): BakeryState {
  if (request.method === 'GET') {
    if (request.path === '/api/produtos') {
      return respond(state, 200, { products: state.products });
    }
    if (request.path === '/bff/padaria') {
      return respond(state, 200, bakeryView(state.products, state.orders));
    }
    const order = state.orders.find((item) => `/api/pedidos/${item.id}` === request.path);
    return order
      ? respond(state, 200, { order })
      : respond(state, 404, { code: 'RESOURCE_NOT_FOUND' });
  }
  if (request.path === '/api/pedidos') {
    return createBakeryOrder(state, request.body);
  }
  if (request.path === '/api/pagamentos') {
    return payBakeryOrder(state, request);
  }
  return respond(state, 404, { code: 'RESOURCE_NOT_FOUND' });
}

/**
 * A camada de acesso distingue rede de HTTP. Uma falha de rede não tem status 500.
 * Os snapshots do percurso não são outra API: registram a execução do roteador acima.
 */
export function completeBakeryRequest(state: BakeryState): readonly StudyStep<BakeryState>[] {
  if (state.phase !== 'pending' || state.request === null) {
    return [step(state, 'noPending')];
  }
  const steps = [step(state, 'dataAccess')];
  if (state.failure === 'network') {
    return [...steps, step({ ...state, phase: 'networkError', response: null }, 'networkFailure')];
  }
  steps.push(step(state, state.request.path === '/bff/padaria' ? 'bff' : 'server'));
  const result =
    state.failure === 'server'
      ? respond(state, 500, { code: 'SIMULATED_SERVER_FAILURE' })
      : routeRequest(state, state.request);
  return [...steps, step(result, result.phase === 'httpError' ? 'httpFailure' : 'response')];
}
