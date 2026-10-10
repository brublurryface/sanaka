import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Translation, TranslocoLoader, provideTransloco } from '@jsverse/transloco';
import { Observable, of } from 'rxjs';
import { vi } from 'vitest';

import { CharacterObolo } from '../../post';
import { SanakaOboloDialog } from './sanaka-obolo-dialog';

class MockTranslocoLoader implements TranslocoLoader {
  getTranslation(): Observable<Translation> {
    return of({
      common: { actions: { retry: 'Tentar novamente' } },
      posts: {
        detail: {
          obolo: {
            close: 'Fechar oferta de óbolo',
            dialogEyebrow: 'Oferta à personagem',
            frontImageAlt: 'Frente do óbolo de {{ name }}',
            backImageAlt: 'Verso do óbolo de {{ name }}',
            receivedLabelOne: 'óbolo recebido',
            receivedLabelMany: 'óbolos recebidos',
            loading: 'Reunindo óbolos...',
            invitation: 'Este gesto pertence a {{ name }}, não à publicação.',
            submitting: 'Depositando o óbolo...',
            success: 'Seu óbolo foi recebido por {{ name }}.',
            loadError: 'Não foi possível consultar os óbolos agora.',
            offerError: 'O óbolo não pôde ser depositado.',
            confirmOffer: 'Ofertar um óbolo',
            offered: 'Óbolo ofertado',
          },
        },
      },
    });
  }
}

describe('SanakaOboloDialog', () => {
  let fixture: ComponentFixture<SanakaOboloDialog>;

  const character: CharacterObolo = {
    characterSlug: 'nandini',
    characterName: 'Nandinī',
    frontImageUrl: 'https://example.com/front.webp',
    backImageUrl: 'https://example.com/back.webp',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SanakaOboloDialog],
      providers: [
        provideTransloco({
          config: {
            availableLangs: ['pt-BR'],
            defaultLang: 'pt-BR',
            fallbackLang: 'pt-BR',
            prodMode: true,
          },
          loader: MockTranslocoLoader,
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SanakaOboloDialog);
    fixture.componentRef.setInput('character', character);
    fixture.componentRef.setInput('status', 'ready');
    fixture.componentRef.setInput('total', 128);
    fixture.detectChanges();
  });

  it('should open, close and restore focus to the invoking control', () => {
    const trigger = document.createElement('button');
    const focus = vi.spyOn(trigger, 'focus');
    const compiled = fixture.nativeElement as HTMLElement;
    const dialog = compiled.querySelector('dialog') as HTMLDialogElement;

    fixture.componentInstance.open(trigger);
    expect(dialog.hasAttribute('open')).toBe(true);

    compiled.querySelector<HTMLButtonElement>('.obolo-dialog__close')?.click();
    fixture.detectChanges();

    expect(dialog.hasAttribute('open')).toBe(false);
    expect(focus).toHaveBeenCalledOnce();
  });

  it('should emit one offer request and reveal the reverse after success', () => {
    const offerRequested = vi.fn();
    const compiled = fixture.nativeElement as HTMLElement;
    fixture.componentInstance.offerRequested.subscribe(offerRequested);

    compiled.querySelector<HTMLButtonElement>('.obolo-dialog__primary')?.click();
    expect(offerRequested).toHaveBeenCalledOnce();

    fixture.componentRef.setInput('status', 'success');
    fixture.componentRef.setInput('total', 129);
    fixture.detectChanges();

    expect(compiled.querySelector('.obolo-dialog__coin--revealed')).not.toBeNull();
    expect(
      compiled
        .querySelector<HTMLImageElement>('.obolo-dialog__coin-front')
        ?.getAttribute('aria-hidden'),
    ).toBe('true');
    expect(
      compiled
        .querySelector<HTMLImageElement>('.obolo-dialog__coin-back')
        ?.hasAttribute('aria-hidden'),
    ).toBe(false);
    expect(compiled.querySelector<HTMLButtonElement>('.obolo-dialog__primary')?.disabled).toBe(
      true,
    );
  });
});
