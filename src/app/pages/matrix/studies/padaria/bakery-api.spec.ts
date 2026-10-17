/**
 * Testes de contratos e efeitos. Nenhum teste envia dinheiro ou chama uma API.
 * Helpers executam a mesma função de domínio usada pela página.
 */
import { describe, expect, it } from 'vitest';
import {
  BakeryRequest,
  BakeryState,
  bakeryState,
  bakeryView,
  beginBakeryRequest,
  completeBakeryRequest,
  createBakeryOrder,
  localQuantityError,
  payBakeryOrder,
  validQuantity,
} from './bakery-api';
import { runBakeryChecks } from './bakery-checks';

const orderBody = { productId: 'bread', quantity: 2, delivery: true };
const paymentRequest: BakeryRequest = {
  method: 'POST',
  path: '/api/pagamentos',
  body: { orderId: 'order-1', token: 'demo-token' },
  idempotencyKey: 'same-intent',
};

function execute(state: BakeryState, request: BakeryRequest): BakeryState {
  return completeBakeryRequest(beginBakeryRequest(state, request, 'none').state).at(-1)!.state;
}

describe('Bakery API simulation', () => {
  it('queries menu without altering stock or orders', () => {
    const state = bakeryState();
    const queried = execute(state, { method: 'GET', path: '/api/produtos' });
    expect(queried.response).toEqual({ status: 200, body: { products: state.products } });
    expect(queried.orders).toHaveLength(0);
    expect(queried.products).toBe(state.products);
  });
  it('creates a resource, updates stock and exposes Location then queries it', () => {
    const original = bakeryState();
    const before = JSON.stringify(original);
    const created = execute(original, { method: 'POST', path: '/api/pedidos', body: orderBody });
    expect(created.response!.status).toBe(201);
    expect(created.response!.headers).toEqual({ Location: '/api/pedidos/order-1' });
    expect(created.orders[0]).toEqual({
      id: 'order-1',
      productId: 'bread',
      quantity: 2,
      totalCredits: 6,
      delivery: true,
    });
    expect(created.products.map((product) => product.stock)).toEqual([6, 5]);
    expect(JSON.stringify(original)).toBe(before);
    expect(execute(created, { method: 'GET', path: '/api/pedidos/order-1' }).response).toEqual({
      status: 200,
      body: { order: created.orders[0] },
    });
  });
  it.each([0, -1, 0.5, 21, Infinity, NaN, '2', false])(
    'rejects quantity %s at the server',
    (quantity) => {
      expect(validQuantity(quantity)).toBe(false);
      const rejected = createBakeryOrder(bakeryState(), { ...orderBody, quantity });
      expect(rejected.response!.status).toBe(400);
      expect(rejected.orders).toHaveLength(0);
    },
  );
  it('rejects missing and malformed bodies without effects', () => {
    expect(createBakeryOrder(bakeryState(), undefined).response!.status).toBe(400);
    expect(
      createBakeryOrder(bakeryState(), { quantity: 1, delivery: false }).response!.status,
    ).toBe(400);
    expect(
      createBakeryOrder(bakeryState(), { productId: 'bread', quantity: 1 }).response!.status,
    ).toBe(400);
  });
  it('distinguishes missing product from insufficient stock', () => {
    expect(
      createBakeryOrder(bakeryState(), { ...orderBody, productId: 'unknown' }).response!.status,
    ).toBe(404);
    const emptyStock = bakeryState(true);
    const rejected = createBakeryOrder(emptyStock, orderBody);
    expect(rejected.response!.status).toBe(409);
    expect(rejected.products).toBe(emptyStock.products);
  });
  it.each([
    { method: 'GET', path: '/unknown' },
    { method: 'POST', path: '/unknown' },
  ] as const)('rejects unknown path $method', (request) => {
    expect(execute(bakeryState(), request).response!.status).toBe(404);
  });
  it('separates local validation, HTTP failure and network failure', () => {
    const state = bakeryState();
    expect(localQuantityError(state).state).toMatchObject({
      phase: 'localError',
      request: null,
      response: null,
    });
    const request: BakeryRequest = { method: 'POST', path: '/api/pedidos', body: orderBody };
    const server = completeBakeryRequest(beginBakeryRequest(state, request, 'server').state).at(
      -1,
    )!.state;
    expect(server).toMatchObject({ phase: 'httpError', response: { status: 500 } });
    const network = completeBakeryRequest(beginBakeryRequest(state, request, 'network').state).at(
      -1,
    )!.state;
    expect(network).toMatchObject({ phase: 'networkError', response: null });
    expect(server.orders).toHaveLength(0);
    expect(network.orders).toHaveLength(0);
  });
  it('keeps a pending contract stable and preserves idle state without pending work', () => {
    const pending = beginBakeryRequest(
      bakeryState(),
      { method: 'GET', path: '/api/produtos' },
      'none',
    ).state;
    expect(beginBakeryRequest(pending, { method: 'GET', path: '/unknown' }, 'server').state).toBe(
      pending,
    );
    const idle = bakeryState();
    expect(completeBakeryRequest(idle)[0].state).toBe(idle);
    expect(completeBakeryRequest({ ...idle, phase: 'pending' })[0].state.request).toBeNull();
  });
  it('adapts menu and the three most recent orders in the simulated BFF', () => {
    let state = bakeryState();
    for (let index = 0; index < 4; index += 1) {
      state = createBakeryOrder(state, { ...orderBody, quantity: 1 });
    }
    const steps = completeBakeryRequest(
      beginBakeryRequest(state, { method: 'GET', path: '/bff/padaria' }, 'none').state,
    );
    expect(steps[1].explanationKey).toBe('matrix.studies.padaria.events.bff');
    expect(steps.at(-1)!.state.response!.body).toEqual(bakeryView(state.products, state.orders));
    expect(bakeryView(state.products, state.orders).recentOrders.map((order) => order.id)).toEqual([
      'order-2',
      'order-3',
      'order-4',
    ]);
  });
  it('replays keyed payments but deliberately duplicates unkeyed demo payments', () => {
    const ordered = createBakeryOrder(bakeryState(), orderBody);
    const paid = execute(ordered, paymentRequest);
    const replayed = execute(paid, paymentRequest);
    expect(paid.response!.status).toBe(201);
    expect(replayed.response!.status).toBe(200);
    expect(replayed.response!.body).toEqual({ payment: paid.payments[0], replayed: true });
    expect(replayed.payments).toHaveLength(1);
    const unkeyed = { ...paymentRequest, idempotencyKey: undefined };
    const twice = execute(execute(ordered, unkeyed), unkeyed);
    expect(twice.payments).toHaveLength(2);
    expect(twice.payments[1].id).toBe('payment-2');
  });
  it('rejects a key reused for another intent without a new effect', () => {
    const ordered = createBakeryOrder(createBakeryOrder(bakeryState(), orderBody), orderBody);
    const paid = payBakeryOrder(ordered, paymentRequest);
    const conflict = payBakeryOrder(paid, {
      ...paymentRequest,
      body: { orderId: 'order-2', token: 'demo-token' },
    });
    expect(conflict.response).toEqual({ status: 409, body: { code: 'KEY_CONFLICT' } });
    expect(conflict.payments).toHaveLength(1);
  });
  it.each(['constructor', '__proto__'])(
    'treats special key %s as data, not inherited configuration',
    (key) => {
      const ordered = createBakeryOrder(bakeryState(), orderBody);
      const request = { ...paymentRequest, idempotencyKey: key };
      const paid = payBakeryOrder(ordered, request);
      expect(paid.payments).toHaveLength(1);
      expect(payBakeryOrder(paid, request).payments).toHaveLength(1);
    },
  );
  it('accepts only fake payment contracts and known orders', () => {
    const ordered = createBakeryOrder(bakeryState(), orderBody);
    expect(payBakeryOrder(ordered, { ...paymentRequest, body: undefined }).response!.status).toBe(
      400,
    );
    expect(
      payBakeryOrder(ordered, {
        ...paymentRequest,
        body: { orderId: 'order-1', token: 'not-bank-data' },
      }).response!.status,
    ).toBe(400);
    expect(
      payBakeryOrder(ordered, { ...paymentRequest, body: { orderId: 1, token: 'demo-token' } })
        .response!.status,
    ).toBe(400);
    expect(
      payBakeryOrder(ordered, { ...paymentRequest, idempotencyKey: ' ' }).response!.status,
    ).toBe(400);
    expect(payBakeryOrder(bakeryState(), paymentRequest).response!.status).toBe(404);
  });
  it('bounds session data rather than accumulating unlimited records', () => {
    const ordered = createBakeryOrder(bakeryState(), orderBody);
    const manyOrders = { ...ordered, orders: Array.from({ length: 20 }, () => ordered.orders[0]) };
    expect(createBakeryOrder(manyOrders, orderBody).response!.status).toBe(409);
    const paid = payBakeryOrder(ordered, paymentRequest);
    const full = { ...paid, payments: Array.from({ length: 40 }, () => paid.payments[0]) };
    expect(
      payBakeryOrder(full, { ...paymentRequest, idempotencyKey: undefined }).response!.status,
    ).toBe(409);
    expect(payBakeryOrder(full, paymentRequest).response!.status).toBe(200);
  });
  it('runs the browser demonstration checks successfully', () => {
    expect(runBakeryChecks().every((check) => check.passed)).toBe(true);
  });
});
