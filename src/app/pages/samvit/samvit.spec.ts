import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTransloco, TranslocoLoader } from '@jsverse/transloco';
import { of } from 'rxjs';

import { Samvit } from './samvit';
import { chooseSamvitMessageKey, chooseSamvitPresence } from './samvit-presence';

class MockTranslocoLoader implements TranslocoLoader {
  getTranslation() {
    return of({
      app: {
        pageTitles: { samvit: 'Saṃvit' },
      },
      samvit: {
        presences: {
          sesha: {
            label: 'Saṃvit dormindo sobre Śeṣa',
            alt: 'Saṃvit dorme sobre Śeṣa.',
            message1: 'Sesha 1',
            message2: 'Sesha 2',
            message3: 'Sesha 3',
            message4: 'Sesha 4',
            message5: 'Sesha 5',
          },
          curious: {
            label: 'Saṃvit se manifestando-se em Īśvara',
            alt: 'Saṃvit observa com curiosidade.',
            message1: 'Curiosa 1',
            message2: 'Curiosa 2',
            message3: 'Curiosa 3',
            message4: 'Curiosa 4',
            message5: 'Curiosa 5',
          },
          contemplative: {
            label: 'Saṃvit meditando e se editando',
            alt: 'Saṃvit contempla.',
            message1: 'Contemplativa 1',
            message2: 'Contemplativa 2',
            message3: 'Contemplativa 3',
            message4: 'Contemplativa 4',
            message5: 'Contemplativa 5',
          },
          suspicious: {
            label: 'Saṃvit entrando em contato com o Administrador',
            alt: 'Saṃvit observa seriamente.',
            message1: 'Desconfiada 1',
            message2: 'Desconfiada 2',
            message3: 'Desconfiada 3',
            message4: 'Desconfiada 4',
            message5: 'Desconfiada 5',
          },
          dotEye: {
            label: 'Saṃvit vivendo um erro 404',
            alt: 'Saṃvit está surpresa.',
            message1: 'Dot-eye 1',
            message2: 'Dot-eye 2',
            message3: 'Dot-eye 3',
            message4: 'Dot-eye 4',
            message5: 'Dot-eye 5',
          },
          withBhu: {
            label: 'Saṃvit acolhendo Bhu',
            alt: 'Saṃvit acolhe Bhu no colo.',
            message1: 'Bhu 1',
            message2: 'Bhu 2',
            message3: 'Bhu 3',
            message4: 'Bhu 4',
            message5: 'Bhu 5',
          },
        },
        dialogue: {
          inputLabel: 'Entre você e Saṃvit',
          placeholder: 'O portal permanece bloqueado enquanto Saṃvit não permitir liberá-lo',
          send: 'Enviar',
        },
      },
    });
  }
}

describe('Samvit', () => {
  let fixture: ComponentFixture<Samvit>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Samvit],
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
    fixture = TestBed.createComponent(Samvit);
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    const image = compiled.querySelector<HTMLImageElement>('.samvit-presence__image');
    const textarea = compiled.querySelector<HTMLTextAreaElement>('#samvit-message');
    const sendButton = compiled.querySelector<HTMLButtonElement>('.samvit-composer button');

    expect(fixture.componentInstance).toBeTruthy();
    expect(compiled.querySelector('.samvit-page__header')).toBeNull();
    expect(compiled.querySelector('.samvit-dialogue__threshold')).toBeNull();
    expect(compiled.querySelectorAll('.samvit-presence__image')).toHaveLength(1);
    expect(compiled.querySelector('picture source')?.getAttribute('srcset')).toBe(
      '/images/samvit/presences/samvit-sesha-sleeping-still.webp',
    );
    expect(image?.getAttribute('src')).toBe(
      '/images/samvit/presences/samvit-sesha-sleeping-still.webp',
    );
    expect(image?.getAttribute('width')).toBe('1448');
    expect(image?.getAttribute('height')).toBe('1086');
    expect(image?.getAttribute('alt')).toBe('Saṃvit dorme sobre Śeṣa.');
    expect(compiled.querySelector('.samvit-presence figcaption')?.textContent).toContain(
      'Saṃvit dormindo sobre Śeṣa',
    );
    expect(compiled.querySelector('.samvit-page__message')?.textContent).toContain('Sesha 1');
    expect(compiled.querySelector('.samvit-composer label')?.textContent).toContain(
      'Entre você e Saṃvit',
    );
    expect(textarea?.placeholder).toBe(
      'O portal permanece bloqueado enquanto Saṃvit não permitir liberá-lo',
    );
    expect(textarea?.disabled).toBe(true);
    expect(sendButton?.disabled).toBe(true);
    expect(compiled.querySelector('audio')).toBeNull();
  });

  it.each([
    [0, 'sesha'],
    [0.3999, 'sesha'],
    [0.4, 'curious'],
    [0.5199, 'curious'],
    [0.52, 'contemplative'],
    [0.64, 'suspicious'],
    [0.76, 'dotEye'],
    [0.88, 'withBhu'],
    [0.9999, 'withBhu'],
  ])('should map the roll %s to the %s presence', (roll, expectedPresence) => {
    expect(chooseSamvitPresence(roll).id).toBe(expectedPresence);
  });

  it('should select one of the five messages and keep the selection for the component lifetime', async () => {
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.8).mockReturnValueOnce(0.9999);

    fixture = TestBed.createComponent(Samvit);
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    const message = compiled.querySelector('.samvit-page__message')?.textContent;

    expect(message).toContain('Dot-eye 5');

    fixture.detectChanges();

    expect(compiled.querySelector('.samvit-page__message')?.textContent).toContain('Dot-eye 5');
  });

  it('should use the first message as the fallback for an invalid roll', () => {
    const presence = chooseSamvitPresence(Number.NaN);

    expect(presence.id).toBe('sesha');
    expect(chooseSamvitMessageKey(presence, Number.POSITIVE_INFINITY)).toBe(
      'samvit.presences.sesha.message1',
    );
  });

  it.each([
    [0.45, 'samvit-curious-still.png', 1122, 1402],
    [0.6, 'samvit-contemplative-still.webp', 1122, 1402],
    [0.7, 'samvit-abhaya-still.png', 1233, 1634],
    [0.8, 'samvit-dot-eye-still.png', 1024, 1536],
    [0.95, 'samvit-with-bhu-still.png', 1122, 1402],
  ])(
    'should show the approved still for roll %s at its original dimensions',
    async (roll, file, width, height) => {
      vi.spyOn(Math, 'random').mockReturnValueOnce(Number(roll)).mockReturnValueOnce(0);
      fixture = TestBed.createComponent(Samvit);
      fixture.detectChanges();
      await fixture.whenStable();

      const root = fixture.nativeElement as HTMLElement;
      const image = root.querySelector<HTMLImageElement>('.samvit-presence__image');

      expect(image?.getAttribute('src')).toBe(`/images/samvit/presences/${file}`);
      expect(image?.getAttribute('width')).toBe(String(width));
      expect(image?.getAttribute('height')).toBe(String(height));
      expect(root.querySelector<HTMLTextAreaElement>('textarea')?.disabled).toBe(true);
      expect(root.querySelector<HTMLButtonElement>('button')?.disabled).toBe(true);

      if (Number(roll) === 0.95) {
        const animatedSource = root.querySelector('picture source');

        expect(animatedSource?.getAttribute('srcset')).toBe(
          '/images/samvit/presences/samvit-with-bhu-blink.webp',
        );
        expect(animatedSource?.getAttribute('media')).toBe(
          '(prefers-reduced-motion: no-preference)',
        );
        expect(animatedSource?.getAttribute('type')).toBe('image/webp');
        expect(root.querySelector('figcaption')?.textContent).toContain('Saṃvit acolhendo Bhu');
        expect(root.querySelector('.samvit-page__message')?.textContent).toContain('Bhu 1');
      } else {
        expect(root.querySelector('picture source')?.getAttribute('srcset')).toBe(
          image?.getAttribute('src'),
        );
        expect(root.querySelector('picture source')?.getAttribute('type')).toBeNull();
      }
    },
  );
});
