/** Verificações locais e determinísticas; não enviam pagamentos/requisições reais. */
import { runStudyChecks, StudyCheck } from '../shared/study-checks';
import {
  bakeryState,
  beginBakeryRequest,
  completeBakeryRequest,
  createBakeryOrder,
  payBakeryOrder,
} from './bakery-api';

export function runBakeryChecks(): readonly StudyCheck[] {
  const body = { productId: 'bread', quantity: 2, delivery: false };
  const ordered = createBakeryOrder(bakeryState(), body);
  const payment = {
    method: 'POST',
    path: '/api/pagamentos',
    body: { orderId: 'order-1', token: 'demo-token' },
    idempotencyKey: 'demo-key',
  } as const;
  const paid = payBakeryOrder(ordered, payment);
  return runStudyChecks([
    {
      key: 'matrix.studies.padaria.checks.created',
      expected: 201,
      run: () => ordered.response!.status,
    },
    {
      key: 'matrix.studies.padaria.checks.invalid',
      expected: 400,
      run: () => createBakeryOrder(bakeryState(), { ...body, quantity: 0 }).response!.status,
    },
    {
      key: 'matrix.studies.padaria.checks.stock',
      expected: 409,
      run: () => createBakeryOrder(bakeryState(true), body).response!.status,
    },
    {
      key: 'matrix.studies.padaria.checks.server',
      expected: 500,
      run: () =>
        completeBakeryRequest(
          beginBakeryRequest(bakeryState(), { method: 'GET', path: '/api/produtos' }, 'server')
            .state,
        ).at(-1)!.state.response!.status,
    },
    { key: 'matrix.studies.padaria.checks.payment', expected: 1, run: () => paid.payments.length },
    {
      key: 'matrix.studies.padaria.checks.idempotency',
      expected: 1,
      run: () => payBakeryOrder(paid, payment).payments.length,
    },
  ]);
}
