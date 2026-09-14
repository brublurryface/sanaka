import { TestBed } from '@angular/core/testing';
import { provideTransloco, TranslocoLoader } from '@jsverse/transloco';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MatrixFlowGuide } from './flow-guide';

class MockTranslocoLoader implements TranslocoLoader {
  getTranslation() {
    return of({
      matrix: {
        exhibit: {
          guide: {
            eyebrow: 'How to experiment',
            title: 'Send the message through the circuit',
            parent: { title: 'The parent sends', text: 'Write a message.' },
            child: { title: 'The child chooses', text: 'Select a reply.' },
            return: { title: 'The parent receives', text: 'Watch it return.' },
          },
          reset: 'Reset',
        },
      },
    });
  }
}

describe('MatrixFlowGuide', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MatrixFlowGuide],
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

  it('should highlight the current experiment step', () => {
    const fixture = TestBed.createComponent(MatrixFlowGuide);

    fixture.componentRef.setInput('currentStep', 2);
    fixture.detectChanges();

    const activeStep = fixture.nativeElement.querySelector('[aria-current="step"]');

    expect(activeStep.textContent).toContain('The child chooses');
  });

  it('should ask the parent page to reset the experiment', () => {
    const fixture = TestBed.createComponent(MatrixFlowGuide);
    const emitSpy = vi.spyOn(fixture.componentInstance.reset, 'emit');

    fixture.detectChanges();
    fixture.nativeElement.querySelector('button').click();

    expect(emitSpy).toHaveBeenCalledOnce();
  });
});
