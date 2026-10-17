/** Testes da política local: nenhum teste depende de um broker ou serviço externo. */
import { describe, expect, it } from 'vitest';
import {
  acknowledgeDelivery,
  compareQueues,
  DELIVERY_LIMIT,
  DELIVERY_SESSION_LIMIT,
  DeliveryState,
  deliveryState,
  enqueueDelivery,
  failDelivery,
  MAX_DELIVERY_ATTEMPTS,
  startDelivery,
  waitingDeliveries,
} from './delivery-queue';
import { runDeliveryChecks } from './delivery-checks';

describe('Delivery queue', () => {
  it('enqueues at the end and leaves the old state unchanged', () => {
    const original = deliveryState();
    const added = enqueueDelivery(original, ' volume-04 ').state;
    expect(waitingDeliveries(added).map((item) => item.label)).toEqual([
      'volume-01',
      'volume-02',
      'volume-03',
      'volume-04',
    ]);
    expect(added.nextId).toBe(5);
    expect(original.entries).toHaveLength(3);
    expect(enqueueDelivery(original, ' ').state).toBe(original);
  });

  it('reserves capacity for processing and retries', () => {
    let state = startDelivery(deliveryState()).state;
    for (let count = 0; count < DELIVERY_LIMIT; count += 1) {
      state = enqueueDelivery(state, String(count)).state;
    }
    expect(waitingDeliveries(state)).toHaveLength(DELIVERY_LIMIT - 1);
    expect(enqueueDelivery(state, 'overflow').explanationKey).toContain('.limit');
    expect(waitingDeliveries(failDelivery(state).state)).toHaveLength(DELIVERY_LIMIT);
  });

  it('bounds total arrivals as well as the number waiting', () => {
    const state = { ...deliveryState(), entries: [], nextId: DELIVERY_SESSION_LIMIT + 1 };
    const rejected = enqueueDelivery(state, 'overflow');
    expect(rejected.state).toBe(state);
    expect(rejected.explanationKey).toContain('.sessionLimit');
  });

  it('processes FIFO while preserving a consumed prefix for inspection', () => {
    const initial = deliveryState();
    const first = startDelivery(initial).state;
    expect(first.head).toBe(1);
    expect(first.processing?.label).toBe('volume-01');
    expect(first.processing?.attempts).toBe(1);
    expect(first.delivered).toEqual([]);
    expect(first.entries).toBe(initial.entries);
    const acknowledged = acknowledgeDelivery(first).state;
    expect(acknowledged.processing).toBeNull();
    expect(acknowledged.delivered[0].id).toBe(1);
    expect(startDelivery(acknowledged).state.processing?.label).toBe('volume-02');
  });

  it('uses LIFO for a stack with the same arrivals', () => {
    const first = startDelivery(deliveryState('stack')).state;
    expect(first.head).toBe(0);
    expect(first.processing?.label).toBe('volume-03');
    const acknowledged = acknowledgeDelivery(first).state;
    expect(startDelivery(acknowledged).state.processing?.label).toBe('volume-02');
  });

  it('rejects a second processing operation while the consumer is busy', () => {
    const busy = startDelivery(deliveryState()).state;
    expect(startDelivery(busy).state).toBe(busy);
    expect(startDelivery(busy).explanationKey).toContain('.busy');
    const added = enqueueDelivery(busy, 'new-volume').state;
    expect(added.processing).toBe(busy.processing);
  });

  it('does not fabricate an item, acknowledgement or failure on an empty state', () => {
    const empty: DeliveryState = { ...deliveryState(), entries: [] };
    expect(startDelivery(empty).state).toBe(empty);
    expect(startDelivery(empty).explanationKey).toContain('.empty');
    expect(acknowledgeDelivery(empty).state).toBe(empty);
    expect(failDelivery(empty).state).toBe(empty);
  });

  // Retry conserva identidade. A segunda falha esgota a política, não reinicia attempts.
  it.each(['queue', 'stack'] as const)(
    'retries then dead-letters in %s discipline',
    (discipline) => {
      let state: DeliveryState = {
        ...deliveryState(discipline),
        entries: [{ id: 8, label: 'only-volume', attempts: 0 }],
      };
      state = startDelivery(state).state;
      const retry = failDelivery(state);
      expect(retry.explanationKey).toContain('.retry');
      state = retry.state;
      expect(waitingDeliveries(state)[0].id).toBe(8);
      state = startDelivery(state).state;
      expect(state.processing?.attempts).toBe(MAX_DELIVERY_ATTEMPTS);
      const dead = failDelivery(state);
      expect(dead.explanationKey).toContain('.deadLetter');
      expect(dead.state.deadLetters[0]).toEqual({ id: 8, label: 'only-volume', attempts: 2 });
      expect(waitingDeliveries(dead.state)).toEqual([]);
      expect(dead.state.processing).toBeNull();
    },
  );

  it('gives equal labels different arrival ids without claiming deduplication', () => {
    let state = enqueueDelivery(deliveryState(), 'repeated').state;
    state = enqueueDelivery(state, 'repeated').state;
    const repeated = waitingDeliveries(state).filter((item) => item.label === 'repeated');
    expect(repeated.map((item) => item.id)).toEqual([4, 5]);
  });

  it.each([{ input: [] }, { input: ['a'] }, { input: ['a', 'b', 'c'] }])(
    'compares actual orders for $input',
    ({ input }) => {
      const original = Object.freeze([...input]);
      const report = compareQueues(original);
      expect(report.fifo).toEqual(input);
      expect(report.indexed).toEqual(input);
      expect(report.lifo).toEqual([...input].reverse());
      expect(report.conceptualShifts).toBe(Math.max(0, (input.length * (input.length - 1)) / 2));
      expect(report.headReads).toBe(input.length);
    },
  );

  it('passes every local demonstration scenario', () => {
    expect(runDeliveryChecks().every((check) => check.passed)).toBe(true);
  });
});
