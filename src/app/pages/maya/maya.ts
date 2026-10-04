import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

import { chooseMayaMessageKey, chooseMayaPresence } from './maya-presence';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoPipe],
  selector: 'app-maya',
  styleUrl: './maya.scss',
  templateUrl: './maya.html',
})
export class Maya {
  protected readonly presence = chooseMayaPresence(Math.random());
  protected readonly messageKey = chooseMayaMessageKey(this.presence, Math.random());
}
