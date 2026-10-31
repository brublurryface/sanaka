/**
 * Interface Angular da padaria. Dados, processamento e histórico ficam na própria sessão.
 * Nenhum serviço global, formulário bancário ou chamada de rede é criado neste estudo.
 */
import { JsonPipe } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { MatrixStudyFrame } from '../shared/matrix-study-frame';
import { MatrixStudyDefinition, studySource } from '../shared/matrix-study-definition';
import { StudyCheck } from '../shared/study-checks';
import { StudyHistory } from '../shared/study-history';
import { StudyStepViewer } from '../shared/study-step-viewer';
import { StudyWalkthrough } from '../shared/study-walkthrough';
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
  imports: [JsonPipe, MatrixStudyFrame, StudyStepViewer, StudyWalkthrough, TranslocoPipe],
  templateUrl: './padaria-lab.html',
})
export class PadariaLab {
  readonly study: MatrixStudyDefinition = {
    id: 'padaria',
    desktopImage: '/images/matrix/padaria/padaria-atmosphere-desktop.webp',
    topics: ['contract', 'layers', 'idempotency'],
    investigations: ['invalid', 'repeated', 'failure', 'newRule'],
    relatedRoute: '/matrix/rest-api',
  };
  readonly sources = BAKERY_SOURCES;
  readonly lessons = ['menu', 'order', 'query', 'payment'] as const;
  readonly lessonIndex = signal(0);
  readonly lastAction = signal<'request' | 'repeat'>('request');
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
    () => !this.pending() && this.history.state().request?.path === '/api/pagamentos',
  );
  readonly latestOrder = computed(() => this.history.state().orders.at(-1));
  // A consulta pode pedir um registro anterior; não mostramos sempre o último criado.
  readonly responseOrder = computed(() => {
    const state = this.history.state();
    if (state.response?.status !== 200 && state.response?.status !== 201) return undefined;
    return state.orders.find((order) =>
      state.request?.path === '/api/pedidos'
        ? order.id === this.latestOrder()?.id
        : state.request?.path === `/api/pedidos/${order.id}`,
    );
  });
  readonly hasOrder = computed(() =>
    this.history.state().orders.some((order) => order.id === this.orderId()),
  );
  readonly lessonComplete = computed(() => {
    const state = this.history.state();
    if (state.phase !== 'success') return false;
    switch (this.lessonIndex()) {
      case 0:
        return state.request?.path === '/api/produtos' || state.request?.path === '/bff/padaria';
      case 1:
        return state.request?.path === '/api/pedidos' && state.response?.status === 201;
      case 2:
        return state.request?.method === 'GET' && state.request.path.startsWith('/api/pedidos/');
      default:
        return state.request?.path === '/api/pagamentos' && this.lastAction() === 'repeat';
    }
  });
  readonly stepSource = computed(() => {
    const path = this.history.state().request?.path;
    return studySource(
      this.sources,
      path === '/api/pagamentos'
        ? 'idempotent-payment'
        : path === '/api/pedidos'
          ? 'create-order'
          : path === '/bff/padaria'
            ? 'bff-view'
            : 'request-contract',
    );
  });

  /** A navegação preserva pedidos/estoque, mas não abandona uma requisição pendente. */
  changeLesson(index: number): void {
    if (!Number.isInteger(index) || !this.lessons[index] || this.pending()) return;
    this.lessonIndex.set(index);
    this.history.record({
      state: { ...this.history.state(), request: null, response: null, phase: 'idle' },
      explanationKey: 'matrix.studies.padaria.events.initial',
      parameters: {},
    });
    this.lastAction.set('request');
  }

  /** void significa que a transição foi guardada, não que uma resposta HTTP já chegou. */
  request(request: BakeryRequest): void {
    // this é a página desta aba. record acrescenta uma transição, não chama um servidor.
    this.history.record(beginBakeryRequest(this.history.state(), request, this.failure()));
    this.lastAction.set('request');
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
      this.lastAction.set('repeat');
    }
  }

  /** Executa o servidor simulado e registra suas etapas reais para inspeção reversível. */
  complete(): void {
    for (const transition of completeBakeryRequest(this.history.state())) {
      this.history.record(transition);
    }
    // O próximo campo recebe o ID realmente criado, inclusive depois do segundo pedido.
    if (
      this.history.state().request?.path === '/api/pedidos' &&
      this.history.state().response?.status === 201
    ) {
      this.orderId.set(this.latestOrder()!.id);
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
    this.lessonIndex.set(0);
    this.lastAction.set('request');
    this.orderId.set('order-1');
  }

  runChecks(): void {
    this.checks.set(runBakeryChecks());
  }
}
