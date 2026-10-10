/**
 * Interface Angular da padaria. Dados, processamento e histórico ficam na própria sessão.
 * Nenhum serviço global, formulário bancário ou chamada de rede é criado neste estudo.
 */
import { JsonPipe } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { MatrixStudyFrame } from '../shared/matrix-study-frame';
import { MatrixStudyDefinition } from '../shared/matrix-study-definition';
import { StudyCheck } from '../shared/study-checks';
import { StudyHistory } from '../shared/study-history';
import { StudyStepViewer } from '../shared/study-step-viewer';
import {
  BakeryFailure,
  BakeryRequest,
  bakeryState,
  beginBakeryRequest,
  completeBakeryRequest,
  localQuantityError,
  OrderBody,
  PaymentBody,
  validQuantity,
} from './bakery-api';
import { runBakeryChecks } from './bakery-checks';
import { BAKERY_SOURCES } from './padaria-source.generated';

@Component({
  selector: 'app-padaria-lab',
  host: { class: 'matrix-study-host' },
  imports: [JsonPipe, MatrixStudyFrame, StudyStepViewer, TranslocoPipe],
  templateUrl: './padaria-lab.html',
})
export class PadariaLab {
  readonly study: MatrixStudyDefinition = {
    id: 'padaria',
    topics: ['contract', 'layers', 'idempotency'],
    investigations: ['invalid', 'repeated', 'failure', 'newRule'],
    relatedRoute: '/matrix/rest-api',
  };
  readonly sources = BAKERY_SOURCES;
  readonly failures: readonly BakeryFailure[] = ['none', 'server', 'network'];
  readonly history = new StudyHistory({
    state: bakeryState(),
    explanationKey: 'matrix.studies.padaria.events.initial',
    parameters: {},
  });
  readonly productId = signal('bread');
  // signal guarda a entrada, set a substitui; computed deriva leituras sem duplicar o estado.
  readonly quantity = signal(2);
  readonly delivery = signal(false);
  readonly orderId = signal('order-1');
  readonly failure = signal<BakeryFailure>('none');
  readonly idempotent = signal(true);
  readonly key = signal('demo-key-1');
  readonly checks = signal<readonly StudyCheck[]>([]);
  readonly pending = computed(() => this.history.state().phase === 'pending');
  readonly repeatable = computed(
    () => !this.pending() && this.history.state().request?.method === 'POST',
  );

  /** void significa que a transição foi guardada, não que uma resposta HTTP já chegou. */
  request(request: BakeryRequest): void {
    // this é a página desta aba. record acrescenta uma transição, não chama um servidor.
    this.history.record(beginBakeryRequest(this.history.state(), request, this.failure()));
  }

  createOrder(): void {
    if (this.pending()) {
      return;
    }
    if (!validQuantity(this.quantity())) {
      this.history.record(localQuantityError(this.history.state()));
      return;
    }
    const body: OrderBody = {
      productId: this.productId(),
      quantity: this.quantity(),
      delivery: this.delivery(),
    };
    this.request({ method: 'POST', path: '/api/pedidos', body });
  }

  /** Bypass explícito só para ensinar 400: validação no cliente não substitui o servidor. */
  sendInvalidOrder(): void {
    this.request({
      method: 'POST',
      path: '/api/pedidos',
      body: { productId: 'bread', quantity: 0, delivery: false },
    });
  }

  queryOrder(): void {
    this.request({ method: 'GET', path: `/api/pedidos/${encodeURIComponent(this.orderId())}` });
  }

  pay(): void {
    const body: PaymentBody = { orderId: this.orderId(), token: 'demo-token' };
    this.request({
      method: 'POST',
      path: '/api/pagamentos',
      body,
      ...(this.idempotent() ? { idempotencyKey: this.key() } : {}),
    });
  }

  /** Reusa exatamente o último POST; não gera chave nova e não aumenta quantidade escondida. */
  repeat(): void {
    const request = this.history.state().request;
    if (request?.method === 'POST' && !this.pending()) {
      this.request(request);
    }
  }

  /** Executa o servidor simulado e registra suas etapas reais para inspeção reversível. */
  complete(): void {
    for (const transition of completeBakeryRequest(this.history.state())) {
      this.history.record(transition);
    }
  }

  restart(unavailable = false): void {
    this.history.replace([
      {
        state: bakeryState(unavailable),
        explanationKey: 'matrix.studies.padaria.events.initial',
        parameters: {},
      },
    ]);
    this.failure.set('none');
  }

  runChecks(): void {
    this.checks.set(runBakeryChecks());
  }
}
