import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoService } from '@jsverse/transloco';

/** O dia editorial do WordPress permanece o mesmo em qualquer fuso do leitor. */
@Component({
  selector: 'time[appPostDate]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[attr.datetime]': 'date()' },
  template: '{{ formatted() }}',
})
export class PostDate {
  readonly date = input.required<string>({ alias: 'appPostDate' });
  readonly month = input<'short' | 'long'>('short');
  private readonly transloco = inject(TranslocoService);
  private readonly language = toSignal(this.transloco.langChanges$, {
    initialValue: this.transloco.getActiveLang(),
  });
  private readonly formatter = computed(
    () =>
      new Intl.DateTimeFormat(this.language(), {
        day: '2-digit',
        month: this.month(),
        year: 'numeric',
        timeZone: 'UTC',
      }),
  );
  protected readonly formatted = computed(() => {
    const date = this.date();
    if (!date) return '';
    const [year, month, day] = date.split('-').map(Number);
    return this.formatter().format(new Date(Date.UTC(year, month - 1, day)));
  });
}
