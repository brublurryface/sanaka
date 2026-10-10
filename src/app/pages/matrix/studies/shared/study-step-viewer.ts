/** Apresentação reutilizável dos snapshots. Não altera nem executa algoritmos. */
import { JsonPipe } from '@angular/common';
import { Component, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { StudyHistoryView } from './study-history';

@Component({
  selector: 'app-study-step-viewer',
  host: { class: 'matrix-study-host' },
  imports: [JsonPipe, TranslocoPipe],
  templateUrl: './study-step-viewer.html',
})
export class StudyStepViewer {
  // required impede renderizar um visualizador sem a fonte dos estados.
  readonly history = input.required<StudyHistoryView>();
}
