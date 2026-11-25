import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideTransloco } from '@jsverse/transloco';
import { beforeEach, describe, expect, it } from 'vitest';
import { TranslationFixture } from '../../../../testing/translation-fixture';

import { Matrix } from './matrix';

describe('Matrix', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Matrix],
      providers: [
        provideRouter([]),
        provideTransloco({
          config: {
            availableLangs: ['pt-BR', 'en'],
            defaultLang: 'en',
            fallbackLang: 'en',
            prodMode: true,
          },
          loader: TranslationFixture,
        }),
      ],
    }).compileComponents();
  });

  it('should create the Matrix page', () => {
    expect(TestBed.createComponent(Matrix).componentInstance).toBeTruthy();
  });

  it('should present the components atmosphere as a cinematic image', () => {
    const fixture = TestBed.createComponent(Matrix);
    fixture.detectChanges();

    const hero = fixture.nativeElement.querySelector('.matrix-hero') as HTMLElement;
    const image = hero.querySelector('.sanaka-atmosphere-hero__image') as HTMLImageElement;

    expect(hero.classList.contains('sanaka-atmosphere-hero--cinematic')).toBe(true);
    expect(image.getAttribute('src')).toBe(
      '/images/matrix/components/components-atmosphere-desktop.webp',
    );
    expect(image.getAttribute('width')).toBe('1942');
  });

  it('should keep the experiment anchor inside the components route', () => {
    const fixture = TestBed.createComponent(Matrix);
    fixture.detectChanges();

    const action = fixture.nativeElement.querySelector('.matrix-hero__action') as HTMLAnchorElement;

    expect(action.getAttribute('href')).toBe('/matrix/components#component-exhibit');
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
