/**
 * Página de Ākāśa: separa modo estrutura e modo mensageria simulada.
 * Não inicializa broker, timers ou serviços globais. Os passos têm controle manual.
 */
import { Component, computed, signal } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { MatrixStudyFrame } from '../shared/matrix-study-frame';
import { MatrixStudyDefinition } from '../shared/matrix-study-definition';
import { StudyCheck } from '../shared/study-checks';
import { StudyHistory } from '../shared/study-history';
import { StudyStepViewer } from '../shared/study-step-viewer';
import { runDeliveryChecks } from './delivery-checks';
import {
  acknowledgeDelivery,
  compareQueues,
  DeliveryDiscipline,
  DeliveryState,
  deliveryState,
  enqueueDelivery,
  failDelivery,
  MAX_DELIVERY_ATTEMPTS,
  startDelivery,
  waitingDeliveries,
} from './delivery-queue';
import { DELIVERY_SOURCES } from './entregas-source.generated';

@Component({
  selector: 'app-entregas-lab',
  host: { class: 'matrix-study-host' },
  imports: [MatrixStudyFrame, StudyStepViewer, TranslocoPipe],
  templateUrl: './entregas-lab.html',
})
export class EntregasLab {
  readonly study: MatrixStudyDefinition = {
    id: 'entregas',
    topics: ['discipline', 'performance', 'messaging'],
    investigations: ['empty', 'repeated', 'failure', 'newRule'],
  };
  readonly sources = DELIVERY_SOURCES;
  readonly maxAttempts = MAX_DELIVERY_ATTEMPTS;
  // set altera a entrada; computed abaixo recalcula só quando sua dependência muda.
  readonly mode = signal<'structure' | 'messaging'>('structure');
  readonly draft = signal('volume-04');
  readonly checks = signal<readonly StudyCheck[]>([]);
  readonly history = new StudyHistory<DeliveryState>({
    state: deliveryState(),
    explanationKey: 'matrix.studies.entregas.events.initial',
    parameters: {},
  });
  readonly waiting = computed(() => waitingDeliveries(this.history.state()));
  readonly comparison = computed(() => compareQueues(this.waiting().map((parcel) => parcel.label)));

  /** Recomeça o cenário: trocar FIFO/LIFO não deve reordenar silenciosamente ações antigas. */
  restart(discipline: DeliveryDiscipline = this.history.state().discipline): void {
    this.history.replace([
      {
        state: deliveryState(discipline),
        explanationKey: 'matrix.studies.entregas.events.initial',
        parameters: {},
      },
    ]);
  }

  changeMode(mode: 'structure' | 'messaging'): void {
    this.mode.set(mode);
    this.restart();
  }

  enqueue(): void {
    // this referencia esta instância; history.state() lê o snapshot atualmente inspecionado.
    this.history.record(enqueueDelivery(this.history.state(), this.draft()));
  }

  /** No modo estrutura, a remoção já termina; no modo broker simulado, exige ack/falha. */
  process(): void {
    const transition = startDelivery(this.history.state());
    this.history.record(transition);
    if (this.mode() === 'structure' && transition.state.processing !== null) {
      this.history.record(acknowledgeDelivery(transition.state));
    }
  }

  confirm(): void {
    this.history.record(acknowledgeDelivery(this.history.state()));
  }

  fail(): void {
    this.history.record(failDelivery(this.history.state()));
  }

  runChecks(): void {
    this.checks.set(runDeliveryChecks());
  }
}
