import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  type ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { fromEvent, merge, type Observable, of, switchMap, take } from 'rxjs';

import { PageLoading } from '../../../shared/loading-indicator/page-loading';

@Component({
  imports: [RouterLink, TranslocoPipe, PageLoading],
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-sanctuary-hero',
  styleUrl: './sanctuary-hero.scss',
  templateUrl: './sanctuary-hero.html',
})
export class SanctuaryHero {
  private readonly backdrop = viewChild.required<ElementRef<HTMLImageElement>>('backdrop');
  protected readonly sceneState = signal<'initial' | 'loading' | 'ready' | 'failed'>('initial');

  constructor() {
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      // O HTML já pode ter carregado o cenário antes da hidratação.
      const image = this.backdrop().nativeElement;
      const cached = image.complete;
      // Exibe o loading apenas quando a imagem ainda não está pronta para ser
      // mostrada no próximo quadro, inclusive se o download já terminou
      // mas a decodificação continua pendente.
      const frame = requestAnimationFrame(() => {
        if (this.sceneState() === 'initial') this.sceneState.set('loading');
      });
      destroyRef.onDestroy(() => cancelAnimationFrame(frame));

      const settled: Observable<unknown> = cached
        ? of(null)
        : merge(fromEvent(image, 'load'), fromEvent(image, 'error')).pipe(take(1));

      settled
        .pipe(
          switchMap(async () => {
            if (!image.naturalWidth) return false;
            await image.decode?.();
            return true;
          }),
          takeUntilDestroyed(destroyRef),
        )
        .subscribe({
          next: (ready) => this.sceneState.set(ready ? 'ready' : 'failed'),
          error: () => this.sceneState.set('failed'),
        });
    });
  }
}
