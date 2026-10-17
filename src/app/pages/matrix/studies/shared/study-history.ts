/**
 * Histórico local e reversível dos laboratórios. Não é um serviço global nem um
 * mecanismo de desfazer requisições reais. Navegar significa inspecionar snapshots.
 */
// signal guarda o estado; computed calcula leituras derivadas e as memoriza.
import { computed, signal, Signal } from '@angular/core';

/** Um passo associa fatos do programa à explicação traduzível da mudança. */
export interface StudyStep<T> {
  readonly state: T;
  readonly explanationKey: string;
  readonly parameters: Record<string, string | number>;
}

/** O visualizador recebe apenas leituras e navegação, não a escrita do domínio. */
export interface StudyHistoryView {
  readonly current: Signal<StudyStep<unknown>>;
  readonly before: Signal<unknown>;
  readonly index: Signal<number>;
  readonly length: Signal<number>;
  readonly canGoBack: Signal<boolean>;
  readonly canGoForward: Signal<boolean>;
  previous(): void;
  next(): void;
}

export class StudyHistory<T> implements StudyHistoryView {
  // private impede que a página escreva diretamente no armazenamento do histórico.
  private readonly stepsState = signal<readonly StudyStep<T>[]>([]);
  private readonly indexState = signal(0);

  // readonly protege a referência do Signal, não impede set/update em um Signal gravável.
  // asReadonly() é o que remove esses métodos da API exposta.
  readonly index = this.indexState.asReadonly();
  readonly length = computed(() => this.stepsState().length);
  readonly current = computed(() => this.stepsState()[this.indexState()]);
  readonly before = computed(() => this.stepsState()[Math.max(0, this.indexState() - 1)].state);
  readonly state = computed(() => this.current().state);
  readonly canGoBack = computed(() => this.indexState() > 0);
  readonly canGoForward = computed(() => this.indexState() < this.length() - 1);

  /** O construtor recebe o primeiro snapshot; nenhuma leitura ocorre antes dele. */
  constructor(initial: StudyStep<T>) {
    this.replace([initial]);
  }

  /**
   * Troca a sequência inteira, por exemplo ao gerar o percurso de um algoritmo.
   * A sequência precisa ter ao menos um passo para current() sempre ser definido.
   */
  replace(steps: readonly StudyStep<T>[]): void {
    if (steps.length === 0) {
      throw new Error('Um estudo precisa de um estado inicial.');
    }
    this.stepsState.set([...steps]);
    this.indexState.set(0);
  }

  /**
   * Uma ação após voltar cria outra linha de investigação e descarta o futuro antigo.
   * Limitamos o histórico a 100 snapshots para não acumular memória indefinidamente.
   * O custo desta cópia é O(h), com h limitado a 100; não é o custo do algoritmo ensinado.
   */
  record(step: StudyStep<T>): void {
    const past = this.stepsState().slice(0, this.indexState() + 1);
    const bounded = [...past, step].slice(-100);
    this.stepsState.set(bounded);
    this.indexState.set(bounded.length - 1);
  }

  // void indica que o método altera o histórico, mas não devolve um valor ao chamador.
  previous(): void {
    this.indexState.update((value) => Math.max(0, value - 1));
  }

  next(): void {
    this.indexState.update((value) => Math.min(this.length() - 1, value + 1));
  }

  /** Inspeciona o resultado sem obrigar a pessoa a percorrer todos os passos. */
  finish(): void {
    this.indexState.set(this.length() - 1);
  }
}
