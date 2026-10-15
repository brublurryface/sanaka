/** Explica a ação atual; código e snapshots só aparecem quando a pessoa os solicita. */
import { JsonPipe } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { StudyHistoryView } from './study-history';
import { StudySource } from './matrix-study-definition';
import { StudySourceCode } from './study-source-code';

@Component({
  selector: 'app-study-step-viewer',
  host: { class: 'matrix-study-host' },
  imports: [JsonPipe, TranslocoPipe, StudySourceCode],
  templateUrl: './study-step-viewer.html',
})
export class StudyStepViewer {
  // required impede renderizar um visualizador sem a fonte dos estados.
  readonly history = input.required<StudyHistoryView>();
  readonly source = input<StudySource>();
  readonly playback = input(false);
  readonly nextStepKey = input('matrix.studies.common.nextStep');
  readonly parameters = input<Record<string, string | number>>({});
  readonly explanationParameters = computed(() => ({
    ...this.history().current().parameters,
    ...this.parameters(),
  }));
  // A explicação técnica usa o mesmo evento do domínio que produziu o retorno visível.
  readonly technicalKey = computed(() =>
    this.history().current().explanationKey.replace('.events.', '.technicalEvents.'),
  );
}
