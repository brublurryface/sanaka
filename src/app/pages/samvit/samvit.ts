import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

import { chooseSamvitMessageKey, chooseSamvitPresence } from './samvit-presence';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoPipe],
  selector: 'app-samvit',
  styleUrl: './samvit.scss',
  templateUrl: './samvit.html',
})
export class Samvit {
  protected readonly presence = chooseSamvitPresence(Math.random());
  protected readonly messageKey = chooseSamvitMessageKey(this.presence, Math.random());
}
