import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTransloco, TranslocoLoader } from '@jsverse/transloco';
import { of } from 'rxjs';

import { Maya } from './maya';
import { chooseMayaMessageKey, chooseMayaPresence } from './maya-presence';

class MockTranslocoLoader implements TranslocoLoader {
  getTranslation() {
    return of({
      app: {
        pageTitles: { maya: 'Māyā' },
      },
      maya: {
        presences: {
          sesha: {
            label: 'Māyā dormindo sobre Śeṣa',
            alt: 'Māyā dorme sobre Śeṣa.',
            message1: 'Sesha 1',
            message2: 'Sesha 2',
            message3: 'Sesha 3',
            message4: 'Sesha 4',
            message5: 'Sesha 5',
          },
          curious: {
            label: 'Māyā se manifestando-se em Īśvara',
            alt: 'Māyā observa com curiosidade.',
            message1: 'Curiosa 1',
            message2: 'Curiosa 2',
            message3: 'Curiosa 3',
            message4: 'Curiosa 4',
            message5: 'Curiosa 5',
          },
          contemplative: {
            label: 'Māyā meditando e se editando',
            alt: 'Māyā contempla.',
            message1: 'Contemplativa 1',
            message2: 'Contemplativa 2',
            message3: 'Contemplativa 3',
            message4: 'Contemplativa 4',
            message5: 'Contemplativa 5',
          },
          suspicious: {
            label: 'Māyā entrando em contato com o Administrador',
            alt: 'Māyā observa seriamente.',
            message1: 'Desconfiada 1',
            message2: 'Desconfiada 2',
            message3: 'Desconfiada 3',
            message4: 'Desconfiada 4',
            message5: 'Desconfiada 5',
          },
          dotEye: {
            label: 'Māyā vivendo um erro 404',
            alt: 'Māyā está surpresa.',
            message1: 'Dot-eye 1',
            message2: 'Dot-eye 2',
            message3: 'Dot-eye 3',
            message4: 'Dot-eye 4',
            message5: 'Dot-eye 5',
          },
        },
        dialogue: {
          inputLabel: 'Entre você e Māyā',
          placeholder: 'O portal permanece bloqueado enquanto Māyā não permitir liberá-lo',
          send: 'Enviar',
        },
      },
    });
  }
}

describe('Maya', () => {
  let fixture: ComponentFixture<Maya>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Maya],
      providers: [
        provideTransloco({
          config: {
            availableLangs: ['pt-BR'],
            defaultLang: 'pt-BR',
            reRenderOnLangChange: true,
            prodMode: true,
          },
          loader: MockTranslocoLoader,
        }),
      ],
    }).compileComponents();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create the silent portal with Śeṣa as the prioritized presence', async () => {
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.2).mockReturnValueOnce(0);
    fixture = TestBed.createComponent(Maya);
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    const image = compiled.querySelector<HTMLImageElement>('.maya-presence__image');
    const textarea = compiled.querySelector<HTMLTextAreaElement>('#maya-message');
    const sendButton = compiled.querySelector<HTMLButtonElement>('.maya-composer button');

    expect(fixture.componentInstance).toBeTruthy();
    expect(compiled.querySelector('.maya-page__header')).toBeNull();
    expect(compiled.querySelector('.maya-dialogue__threshold')).toBeNull();
    expect(compiled.querySelectorAll('.maya-presence__image')).toHaveLength(1);
    expect(
      compiled.querySelector('.maya-presence__sleep-motion')?.getAttribute('aria-hidden'),
    ).toBe('true');
    expect(compiled.querySelectorAll('.maya-presence__gem')).toHaveLength(5);
    expect(compiled.querySelectorAll('.maya-presence__breath')).toHaveLength(2);
    expect(image?.getAttribute('src')).toBe(
      '/images/maya/presences/maya-sesha-sleeping-still.webp',
    );
    expect(image?.getAttribute('width')).toBe('1448');
    expect(image?.getAttribute('height')).toBe('1086');
    expect(image?.getAttribute('alt')).toBe('Māyā dorme sobre Śeṣa.');
    expect(compiled.querySelector('.maya-presence figcaption')?.textContent).toContain(
      'Māyā dormindo sobre Śeṣa',
    );
    expect(compiled.querySelector('.maya-page__message')?.textContent).toContain('Sesha 1');
    expect(compiled.querySelector('.maya-composer label')?.textContent).toContain(
      'Entre você e Māyā',
    );
    expect(textarea?.placeholder).toBe(
      'O portal permanece bloqueado enquanto Māyā não permitir liberá-lo',
    );
    expect(textarea?.disabled).toBe(true);
    expect(sendButton?.disabled).toBe(true);
    expect(compiled.querySelector('audio')).toBeNull();
  });

  it.each([
    [0, 'sesha'],
    [0.3999, 'sesha'],
    [0.4, 'curious'],
    [0.5499, 'curious'],
    [0.55, 'contemplative'],
    [0.7, 'suspicious'],
    [0.85, 'dotEye'],
    [0.9999, 'dotEye'],
  ])('should map the roll %s to the %s presence', (roll, expectedPresence) => {
    expect(chooseMayaPresence(roll).id).toBe(expectedPresence);
  });

  it('should select one of the five messages and keep the selection for the component lifetime', async () => {
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.9).mockReturnValueOnce(0.9999);

    fixture = TestBed.createComponent(Maya);
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    const message = compiled.querySelector('.maya-page__message')?.textContent;

    expect(message).toContain('Dot-eye 5');
    expect(compiled.querySelector('.maya-presence__sleep-motion')).toBeNull();

    fixture.detectChanges();

    expect(compiled.querySelector('.maya-page__message')?.textContent).toContain('Dot-eye 5');
  });

  it('should use the first message as the fallback for an invalid roll', () => {
    const presence = chooseMayaPresence(Number.NaN);

    expect(presence.id).toBe('sesha');
    expect(chooseMayaMessageKey(presence, Number.POSITIVE_INFINITY)).toBe(
      'maya.presences.sesha.message1',
    );
  });
});
