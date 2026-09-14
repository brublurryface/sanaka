import { TestBed } from '@angular/core/testing';
import { provideTransloco, TranslocoLoader } from '@jsverse/transloco';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MatrixMessageNode, type MatrixReply } from './message-node';

class MockTranslocoLoader implements TranslocoLoader {
  getTranslation() {
    return of({
      matrix: {
        exhibit: {
          child: {
            eyebrow: 'Child component',
            title: 'Receiver',
            receivedLabel: 'Received value',
            waiting: 'Waiting',
            reply: 'Reply',
            options: {
              acknowledge: 'Confirm it was received',
              measure: 'Count the characters',
              echo: 'Return an echo',
            },
            outputNote: 'emits an event.',
          },
        },
      },
    });
  }
}

describe('MatrixMessageNode', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MatrixMessageNode],
      providers: [
        provideTransloco({
          config: {
            availableLangs: ['pt-BR', 'en'],
            defaultLang: 'pt-BR',
            fallbackLang: 'pt-BR',
            prodMode: true,
          },
          loader: MockTranslocoLoader,
        }),
      ],
    }).compileComponents();
  });

  it('should display the value received from its parent', () => {
    const fixture = TestBed.createComponent(MatrixMessageNode);

    fixture.componentRef.setInput('message', 'Atravessar a Matrix');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Atravessar a Matrix');
  });

  it('should process the message and emit a reply to its parent', () => {
    const fixture = TestBed.createComponent(MatrixMessageNode);
    const emittedValues: MatrixReply[] = [];

    fixture.componentRef.setInput('message', 'Olá');
    fixture.componentInstance.reply.subscribe((value) => emittedValues.push(value));
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    button.click();

    expect(emittedValues).toEqual([
      {
        kind: 'acknowledge',
        originalMessage: 'Olá',
        characterCount: 3,
      },
    ]);
  });

  it('should prevent replies before a message is received', () => {
    const fixture = TestBed.createComponent(MatrixMessageNode);
    const emitSpy = vi.spyOn(fixture.componentInstance.reply, 'emit');

    fixture.detectChanges();

    const fieldset = fixture.nativeElement.querySelector('fieldset') as HTMLFieldSetElement;

    expect(fieldset.disabled).toBe(true);
    expect(emitSpy).not.toHaveBeenCalled();
  });
});
