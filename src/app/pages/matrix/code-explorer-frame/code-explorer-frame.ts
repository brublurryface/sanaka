import { Component, Directive, computed, inject, input, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import type { CodeExplorerSlide } from '../code-explorer.controller';

/** Apresenta os exemplos da experiência e devolve os pedidos de navegação ao dono da seleção. */
@Component({
  selector: 'section[appMatrixCodeExplorerFrame]',
  imports: [TranslocoPipe],
  templateUrl: './code-explorer-frame.html',
})
export class MatrixCodeExplorerFrame {
  readonly slides = input.required<readonly CodeExplorerSlide[]>();
  readonly activeSlide = input.required<CodeExplorerSlide>();
  readonly language = input.required<string>();
  readonly paginationKey = input.required<string>();

  readonly slideRequested = output<number>();
  readonly previousRequested = output<void>();
  readonly nextRequested = output<void>();
}

/** Aplica seleção, visibilidade e foco ao mesmo trecho que o laboratório fornece em HTML. */
@Directive({
  selector: 'pre[appMatrixCodeSnippet]',
  host: {
    class: 'code-window__snippet matrix-code-layer',
    '[class.matrix-code-layer--active]': 'active()',
    '[attr.aria-hidden]': '!active()',
    '[attr.tabindex]': 'active() ? 0 : -1',
  },
})
export class MatrixCodeSnippet {
  private readonly explorer = inject(MatrixCodeExplorerFrame);
  readonly index = input.required<number>({ alias: 'appMatrixCodeSnippet' });
  protected readonly active = computed(() => this.explorer.activeSlide().index === this.index());
}
