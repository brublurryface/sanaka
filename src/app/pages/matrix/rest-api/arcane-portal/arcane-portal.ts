import { Component, computed, EventEmitter, inject, input, Input, Output } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';

import { MetatronMark } from '../metatron-mark/metatron-mark';
import { PortalImageViewModel, PortalPhase } from '../rest-api.models';

@Component({
  selector: 'app-arcane-portal',
  imports: [TranslocoPipe, MetatronMark],
  templateUrl: './arcane-portal.html',
  styleUrl: './arcane-portal.scss',
})
export class ArcanePortal {
  private readonly transloco = inject(TranslocoService);
  private readonly activeLanguage = toSignal(this.transloco.langChanges$, {
    initialValue: this.transloco.getActiveLang(),
  });

  @Input({ required: true }) phase: PortalPhase = 'idle';
  readonly image = input<PortalImageViewModel | null>(null);
  @Input() query: string | null = null;
  @Input() imageFailed = false;
  @Input() imageLoaded = false;
  @Input() canSearch = false;

  readonly formattedRecordDate = computed(() => {
    const recordDate = this.image()?.date;

    if (!recordDate || !/^\d{4}-\d{2}-\d{2}$/.test(recordDate)) {
      return null;
    }

    // É uma data civil, não um horário local. UTC evita o deslocamento para o dia anterior.
    const date = new Date(`${recordDate}T00:00:00Z`);

    if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== recordDate) {
      return null;
    }

    const locale = this.activeLanguage() === 'pt-BR' ? 'pt-BR' : 'en-US';

    return new Intl.DateTimeFormat(locale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(date);
  });

  @Output() readonly searchRequested = new EventEmitter<void>();
  @Output() readonly retryRequested = new EventEmitter<void>();
  @Output() readonly resetRequested = new EventEmitter<void>();
  @Output() readonly imageLoadFailed = new EventEmitter<void>();
  @Output() readonly imageLoadSucceeded = new EventEmitter<void>();
}
