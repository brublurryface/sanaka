/**
 * Página de Ākāśa: separa modo estrutura e modo mensageria simulada.
 * Não inicializa broker, timers ou serviços globais. Os passos têm controle manual.
 */
import { Component, computed, signal } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { MatrixStudyFrame } from '../shared/matrix-study-frame';
import { MatrixStudyDefinition, studySource } from '../shared/matrix-study-definition';
import { StudyCheck } from '../shared/study-checks';
import { StudyHistory } from '../shared/study-history';
import { StudyStepViewer } from '../shared/study-step-viewer';
import { StudyWalkthrough } from '../shared/study-walkthrough';
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
  imports: [MatrixStudyFrame, StudyStepViewer, StudyWalkthrough, TranslocoPipe],
  templateUrl: './entregas-lab.html',
})
export class EntregasLab {
  readonly study: MatrixStudyDefinition = {
    id: 'entregas',
    desktopImage: '/images/matrix/entregas/entregas-atmosphere-desktop.webp',
    topics: ['discipline', 'performance', 'messaging'],
    investigations: ['empty', 'repeated', 'failure', 'newRule'],
  };
  readonly sources = DELIVERY_SOURCES;
  readonly lessons = ['queue', 'stack', 'messaging'] as const;
  readonly lessonIndex = signal(0);
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
  readonly nextParcel = computed(() =>
    this.history.state().discipline === 'queue' ? this.waiting()[0] : this.waiting().at(-1),
  );
  readonly lessonComplete = computed(
    () =>
      this.history.state().delivered.length > 0 ||
      (this.lessonIndex() === 2 &&
        (this.history.current().explanationKey.endsWith('.retry') ||
          this.history.state().deadLetters.length > 0)),
  );
  readonly stepSource = computed(() => {
    const event = this.history.current().explanationKey.split('.').at(-1);
    const section =
      event === 'ack' || event === 'nothingToConfirm'
        ? 'confirm-delivery'
        : event === 'retry' || event === 'deadLetter' || event === 'nothingToFail'
          ? 'retry-delivery'
          : event === 'enqueue' ||
              event === 'emptyInput' ||
              event === 'limit' ||
              event === 'sessionLimit'
            ? 'enqueue'
            : 'start-delivery';
    return studySource(this.sources, section);
  });

  /** Cada disciplina recomeça a mesma cena: a ordem de retirada fica comparável. */
  changeLesson(index: number): void {
    if (!Number.isInteger(index) || !this.lessons[index]) return;
    this.lessonIndex.set(index);
    this.mode.set(index === 2 ? 'messaging' : 'structure');
    this.restart(index === 1 ? 'stack' : 'queue');
  }

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
      const completed = acknowledgeDelivery(transition.state);
      this.history.record({
        ...completed,
        explanationKey: `matrix.studies.entregas.events.${transition.state.discipline === 'queue' ? 'removeFifo' : 'removeLifo'}`,
      });
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
