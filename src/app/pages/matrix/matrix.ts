import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';

import { MatrixCodeCarousel } from './code-carousel/code-carousel';
import { MatrixFlowGuide } from './flow-guide/flow-guide';
import { MatrixMessageNode, type MatrixReply } from './message-node/message-node';

interface MatrixStep {
  readonly index: number;
  readonly translationKey: string;
}

@Component({
  selector: 'app-matrix',
  imports: [RouterLink, TranslocoPipe, MatrixCodeCarousel, MatrixFlowGuide, MatrixMessageNode],
  templateUrl: './matrix.html',
  styleUrl: './matrix.scss',
})
export class Matrix {
  private readonly transloco = inject(TranslocoService);

  readonly draftMessage = signal('');
  readonly deliveredMessage = signal('');
  readonly childReply = signal<MatrixReply | null>(null);
  readonly stage = signal(0);

  readonly canSend = computed(() => this.draftMessage().trim().length > 0);
  readonly hasReply = computed(() => this.childReply() !== null);
  readonly currentStep = computed(() => {
    if (!this.deliveredMessage()) {
      return 1;
    }

    return this.hasReply() ? 3 : 2;
  });

  readonly timelineSteps: readonly MatrixStep[] = [
    { index: 1, translationKey: 'matrix.exhibit.timeline.parentState' },
    { index: 2, translationKey: 'matrix.exhibit.timeline.binding' },
    { index: 3, translationKey: 'matrix.exhibit.timeline.childInput' },
    { index: 4, translationKey: 'matrix.exhibit.timeline.childOutput' },
    { index: 5, translationKey: 'matrix.exhibit.timeline.parentHandler' },
  ];

  updateDraft(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.draftMessage.set(input.value);
  }

  useExample(): void {
    this.draftMessage.set(this.transloco.translate('matrix.exhibit.parent.exampleMessage'));
  }

  sendMessage(): void {
    const message = this.draftMessage().trim();

    if (!message) {
      return;
    }

    this.deliveredMessage.set(message);
    this.childReply.set(null);
    this.stage.set(3);
  }

  receiveReply(reply: MatrixReply): void {
    this.childReply.set(reply);
    this.stage.set(5);
  }

  resetExperiment(): void {
    this.draftMessage.set('');
    this.deliveredMessage.set('');
    this.childReply.set(null);
    this.stage.set(0);
  }
}
