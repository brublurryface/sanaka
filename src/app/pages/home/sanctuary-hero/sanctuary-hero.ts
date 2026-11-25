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
import {
  animationFrames,
  finalize,
  fromEvent,
  merge,
  type Observable,
  of,
  switchMap,
  take,
  timer,
} from 'rxjs';

import { PageLoading } from '../../../shared/loading-indicator/page-loading';

const cachedSceneGraceMs = 150;

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
      // decode() é assíncrono mesmo quando a imagem já foi decodificada.
      // Uma cena baixada tem uma janela curta para concluir essa confirmação,
      // evitando solicitar Nandinī por uma disputa com o próximo frame.
      const loading = (cached ? timer(cachedSceneGraceMs) : animationFrames())
        .pipe(take(1))
        .subscribe(() => this.sceneState.set('loading'));

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
          finalize(() => loading.unsubscribe()),
        )
        .subscribe({
          next: (ready) => this.sceneState.set(ready ? 'ready' : 'failed'),
          error: () => this.sceneState.set('failed'),
        });
    });
  }
}
