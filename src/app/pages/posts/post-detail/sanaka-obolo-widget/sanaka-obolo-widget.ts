import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

import { CharacterObolo } from '../../post';
import { OboloInteractionStatus } from '../character-obolo.store';

/** Apresenta o mesmo óbolo como módulo lateral ou link editorial compacto. */
@Component({
  selector: 'sanaka-obolo-widget',
  imports: [TranslocoPipe],
  templateUrl: './sanaka-obolo-widget.html',
  styleUrl: './sanaka-obolo-widget.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SanakaOboloWidget {
  readonly character = input.required<CharacterObolo>();
  readonly status = input.required<OboloInteractionStatus>();
  readonly total = input<number | null>(null);
  readonly isCompact = input(false);
  readonly opened = output<HTMLElement>();

  protected openPanel(event: Event): void {
    this.opened.emit(event.currentTarget as HTMLElement);
  }
}
