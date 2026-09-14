import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  selector: 'app-matrix-flow-guide',
  imports: [TranslocoPipe],
  templateUrl: './flow-guide.html',
  styleUrl: './flow-guide.scss',
})
export class MatrixFlowGuide {
  @Input({ required: true }) currentStep = 1;
  @Output() readonly reset = new EventEmitter<void>();
}
