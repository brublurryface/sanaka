import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewChild,
  input,
  output,
} from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

import { CharacterObolo } from '../../post';
import { OboloInteractionStatus } from '../character-obolo.store';

/** Painel único de oferta, aberto tanto pelo módulo desktop quanto pelo link mobile. */
@Component({
  selector: 'sanaka-obolo-dialog',
  imports: [TranslocoPipe],
  templateUrl: './sanaka-obolo-dialog.html',
  styleUrl: './sanaka-obolo-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SanakaOboloDialog {
  @ViewChild('dialog') private dialog?: ElementRef<HTMLDialogElement>;

  readonly character = input.required<CharacterObolo>();
  readonly status = input.required<OboloInteractionStatus>();
  readonly total = input<number | null>(null);
  readonly offerRequested = output<void>();
  readonly retryRequested = output<void>();

  private lastTrigger: HTMLElement | null = null;

  open(trigger: HTMLElement): void {
    const dialog = this.dialog?.nativeElement;

    if (!dialog) {
      return;
    }

    this.lastTrigger = trigger;

    if (typeof dialog.showModal === 'function') {
      if (!dialog.open) {
        dialog.showModal();
      }
      return;
    }

    dialog.setAttribute('open', '');
  }

  protected close(): void {
    const dialog = this.dialog?.nativeElement;

    if (!dialog) {
      return;
    }

    if (typeof dialog.close === 'function') {
      dialog.close();
    } else {
      dialog.removeAttribute('open');
    }

    this.restoreTrigger();
  }

  protected closeFromBackdrop(event: MouseEvent): void {
    if (event.target === this.dialog?.nativeElement) {
      this.close();
    }
  }

  protected restoreTrigger(): void {
    const trigger = this.lastTrigger;

    this.lastTrigger = null;
    trigger?.focus();
  }
}
