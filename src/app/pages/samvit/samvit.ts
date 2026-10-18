import { afterNextRender, ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

import { chooseSamvitMessageKey, chooseSamvitPresence, SamvitPresence } from './samvit-presence';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoPipe],
  selector: 'app-samvit',
  styleUrl: './samvit.scss',
  templateUrl: './samvit.html',
})
export class Samvit {
  protected readonly encounter = signal<{
    readonly presence: SamvitPresence;
    readonly messageKey: string;
  } | null>(null);

  constructor() {
    // O HTML prerenderizado fica neutro. Sortear no servidor e no navegador exibia duas poses.
    // O callback roda uma vez no navegador; pose e frase entram juntas e ficam até a próxima visita.
    afterNextRender({
      write: () => {
        const presence = chooseSamvitPresence(Math.random());
        this.encounter.set({
          presence,
          messageKey: chooseSamvitMessageKey(presence, Math.random()),
        });
      },
    });
  }
}
