/** Cenários locais usam exatamente as transições que a pessoa aciona na página. */
import { runStudyChecks, StudyCheck } from '../shared/study-checks';
import {
  acknowledgeDelivery,
  compareQueues,
  DeliveryState,
  deliveryState,
  failDelivery,
  startDelivery,
  waitingDeliveries,
} from './delivery-queue';

export function runDeliveryChecks(): readonly StudyCheck[] {
  return runStudyChecks([
    {
      key: 'matrix.studies.entregas.checks.fifo',
      expected: 'volume-01',
      run: () => startDelivery(deliveryState()).state.processing?.label,
    },
    {
      key: 'matrix.studies.entregas.checks.lifo',
      expected: 'volume-03',
      run: () => startDelivery(deliveryState('stack')).state.processing?.label,
    },
    {
      key: 'matrix.studies.entregas.checks.ack',
      expected: 1,
      run: () => acknowledgeDelivery(startDelivery(deliveryState()).state).state.delivered.length,
    },
    {
      key: 'matrix.studies.entregas.checks.retry',
      expected: 1,
      run: () => {
        const failed = failDelivery(startDelivery(deliveryState()).state).state;
        return waitingDeliveries(failed).at(-1)?.attempts;
      },
    },
    {
      key: 'matrix.studies.entregas.checks.deadLetter',
      expected: 1,
      run: () => {
        let state: DeliveryState = {
          ...deliveryState(),
          entries: [{ id: 1, label: 'volume-01', attempts: 0 }],
        };
        state = failDelivery(startDelivery(state).state).state;
        return failDelivery(startDelivery(state).state).state.deadLetters.length;
      },
    },
    {
      key: 'matrix.studies.entregas.checks.strategies',
      expected: true,
      run: () => {
        const report = compareQueues(['a', 'b', 'c']);
        return JSON.stringify(report.fifo) === JSON.stringify(report.indexed);
      },
    },
  ]);
}
