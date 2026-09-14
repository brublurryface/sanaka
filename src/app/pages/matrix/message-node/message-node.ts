import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

export type MatrixReplyKind = 'acknowledge' | 'measure' | 'echo';

export interface MatrixReply {
  readonly kind: MatrixReplyKind;
  readonly originalMessage: string;
  readonly characterCount: number;
}

interface MatrixReplyOption {
  readonly kind: MatrixReplyKind;
  readonly translationKey: string;
}

@Component({
  selector: 'app-matrix-message-node',
  imports: [TranslocoPipe],
  templateUrl: './message-node.html',
  styleUrl: './message-node.scss',
})
export class MatrixMessageNode {
  @Input({ required: true }) message = '';
  @Output() readonly reply = new EventEmitter<MatrixReply>();

  readonly replyOptions: readonly MatrixReplyOption[] = [
    {
      kind: 'acknowledge',
      translationKey: 'matrix.exhibit.child.options.acknowledge',
    },
    {
      kind: 'measure',
      translationKey: 'matrix.exhibit.child.options.measure',
    },
    {
      kind: 'echo',
      translationKey: 'matrix.exhibit.child.options.echo',
    },
  ];

  selectReply(kind: MatrixReplyKind): void {
    this.reply.emit({
      kind,
      originalMessage: this.message,
      characterCount: Array.from(this.message).length,
    });
  }
}
