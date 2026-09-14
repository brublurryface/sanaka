import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideTransloco, TranslocoLoader } from '@jsverse/transloco';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it } from 'vitest';

import { Matrix } from './matrix';

class MockTranslocoLoader implements TranslocoLoader {
  getTranslation() {
    return of({
      matrix: {
        header: {
          back: 'Back to the Matrix catalog',
          eyebrow: 'Interactive laboratory',
          title: { line1: 'Matrix', line2: 'Online' },
          intro: 'Watch Angular respond.',
          action: 'Enter the experiment',
        },
        exhibit: {
          eyebrow: 'Experiment 01',
          title: 'Components in conversation',
          intro: 'A parent and child exchange data.',
          guide: {
            eyebrow: 'How to experiment',
            title: 'Send the message through the circuit',
            parent: { title: 'The parent sends', text: 'Write a message.' },
            child: { title: 'The child chooses', text: 'Select a reply.' },
            return: { title: 'The parent receives', text: 'Watch it return.' },
          },
          parent: {
            eyebrow: 'Parent component',
            title: 'Sender',
            label: 'Message',
            placeholder: 'Write a message',
            hint: 'Start with a ready-made message.',
            useExample: 'Use example',
            exampleMessage: 'Did you receive this message?',
            send: 'Send',
            inputNote: 'passes a value to the child.',
          },
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
          return: {
            label: 'Return to parent',
            waiting: 'No reply yet',
            responses: {
              acknowledge: 'Child: message received.',
              measure: 'Child: {{ count }} characters.',
              echo: 'Child: {{ message }}',
            },
          },
          timeline: {
            eyebrow: 'Angular log',
            title: 'What happened beneath the interface',
            automatic: 'Updates automatically',
            note: 'This panel does not receive clicks.',
            parentState: 'Parent updates its state.',
            binding: 'Angular evaluates the binding.',
            childInput: 'Child receives the input.',
            childOutput: 'Child emits an output.',
            parentHandler: 'Parent handles the event.',
          },
          reset: 'Reset',
          code: {
            eyebrow: 'Code in motion',
            title: 'See inside the circuit',
            status: 'Snippet {{ current }} of {{ total }}',
            previous: 'Previous',
            next: 'Next',
            pagination: 'Code snippets',
            goTo: 'View snippet {{ page }}',
            slides: {
              parent: { title: 'Parent sends', description: 'Signals hold the value.' },
              binding: { title: 'Template connects', description: 'Bindings connect both sides.' },
              child: { title: 'Child receives', description: '@Input receives the value.' },
              return: { title: 'Parent handles', description: '@Output returns the event.' },
            },
          },
        },
        explanation: {
          action: { title: 'What do you do?', text: 'Send and reply.' },
          angular: { title: 'What does Angular notice?', text: 'Bindings and events.' },
          code: { title: 'What moves in code?', text: 'Data moves between components.' },
        },
      },
    });
  }
}

describe('Matrix', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Matrix],
      providers: [
        provideRouter([]),
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

  it('should create the Matrix page', () => {
    expect(TestBed.createComponent(Matrix).componentInstance).toBeTruthy();
  });

  it('should send the parent value to the child component', () => {
    const fixture = TestBed.createComponent(Matrix);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const input = element.querySelector<HTMLInputElement>('#parent-message')!;
    const form = element.querySelector<HTMLFormElement>('form')!;

    input.value = 'Atravessar a Matrix';
    input.dispatchEvent(new Event('input'));
    form.dispatchEvent(new Event('submit', { cancelable: true }));
    fixture.detectChanges();

    expect(fixture.componentInstance.deliveredMessage()).toBe('Atravessar a Matrix');
    expect(fixture.componentInstance.stage()).toBe(3);
    expect(element.querySelector('app-matrix-message-node')?.textContent).toContain(
      'Atravessar a Matrix',
    );
  });

  it('should receive the child output in the parent component', () => {
    const fixture = TestBed.createComponent(Matrix);

    fixture.componentInstance.draftMessage.set('Olá, componente');
    fixture.componentInstance.sendMessage();
    fixture.detectChanges();

    const replyButton = fixture.nativeElement.querySelector(
      'app-matrix-message-node button',
    ) as HTMLButtonElement;

    replyButton.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.childReply()).toEqual({
      kind: 'acknowledge',
      originalMessage: 'Olá, componente',
      characterCount: 15,
    });
    expect(fixture.componentInstance.stage()).toBe(5);
    expect(fixture.nativeElement.querySelector('.return-panel').textContent).toContain(
      'message received',
    );
  });

  it('should provide a ready-made message for the experiment', () => {
    const fixture = TestBed.createComponent(Matrix);
    fixture.detectChanges();

    fixture.componentInstance.useExample();

    expect(fixture.componentInstance.draftMessage()).toBe('Did you receive this message?');
  });

  it('should reset the complete experiment state', () => {
    const fixture = TestBed.createComponent(Matrix);
    const component = fixture.componentInstance;

    component.draftMessage.set('Mensagem');
    component.sendMessage();
    component.receiveReply({
      kind: 'echo',
      originalMessage: 'Mensagem',
      characterCount: 8,
    });
    component.resetExperiment();

    expect(component.draftMessage()).toBe('');
    expect(component.deliveredMessage()).toBe('');
    expect(component.childReply()).toBeNull();
    expect(component.stage()).toBe(0);
  });
});
