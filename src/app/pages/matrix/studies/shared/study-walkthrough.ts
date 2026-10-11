/**
 * Guia visual compartilhado. A página continua decidindo o que cada etapa faz.
 * Trocar uma etapa emite uma intenção; este componente não executa o domínio.
 */
import {
  afterNextRender,
  Component,
  ElementRef,
  inject,
  Injector,
  input,
  output,
  viewChild,
} from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  selector: 'app-study-walkthrough',
  imports: [TranslocoPipe],
  template: `
    <div class="study-walkthrough">
      <nav [attr.aria-label]="'matrix.studies.common.journeyNavigation' | transloco">
        <ol class="study-journey">
          @for (step of steps(); track step; let index = $index) {
            <li>
              <button
                type="button"
                [attr.aria-current]="activeIndex() === index ? 'step' : null"
                [disabled]="locked()"
                (click)="select(index)"
              >
                <span class="sanaka-editorial-label">{{ index + 1 }}</span>
                {{ translationKey() + '.' + step + '.title' | transloco }}
              </button>
            </li>
          }
        </ol>
      </nav>
      <header class="study-lesson-heading">
        <p class="sanaka-editorial-label">
          {{
            'matrix.studies.common.stepCount'
              | transloco: { current: activeIndex() + 1, total: steps().length }
          }}
        </p>
        <h3 #lessonHeading tabindex="-1">
          {{ translationKey() + '.' + steps()[activeIndex()] + '.title' | transloco }}
        </h3>
        <p>{{ translationKey() + '.' + steps()[activeIndex()] + '.goal' | transloco }}</p>
      </header>
      <ng-content />
      <footer class="study-lesson-footer">
        <p>
          {{
            (complete()
              ? 'matrix.studies.common.lessonComplete'
              : translationKey() + '.' + steps()[activeIndex()] + '.next'
            ) | transloco
          }}
        </p>
        @if (activeIndex() < steps().length - 1) {
          <button
            type="button"
            class="study-button"
            [disabled]="!complete()"
            (click)="select(activeIndex() + 1)"
          >
            {{ 'matrix.studies.common.continueTo' | transloco }}
            {{ translationKey() + '.' + steps()[activeIndex() + 1] + '.title' | transloco }} →
          </button>
        } @else if (complete()) {
          <p class="study-result">{{ 'matrix.studies.common.journeyComplete' | transloco }}</p>
        }
        <button type="button" class="study-text-button" (click)="restart.emit()">
          {{ restartLabelKey() | transloco }}
        </button>
      </footer>
    </div>
  `,
})
export class StudyWalkthrough {
  private readonly injector = inject(Injector);
  private readonly heading = viewChild<ElementRef<HTMLElement>>('lessonHeading');
  readonly steps = input.required<readonly string[]>();
  readonly activeIndex = input.required<number>();
  readonly translationKey = input.required<string>();
  readonly complete = input(false);
  readonly locked = input(false);
  readonly restartLabelKey = input('matrix.studies.common.restartLesson');
  readonly stepChange = output<number>();
  readonly restart = output<void>();

  /** Leva o foco à nova orientação depois que o DOM muda, inclusive no teclado. */
  select(index: number): void {
    if (this.locked() || index === this.activeIndex()) return;
    this.stepChange.emit(index);
    afterNextRender(() => this.heading()?.nativeElement.focus(), { injector: this.injector });
  }
}
