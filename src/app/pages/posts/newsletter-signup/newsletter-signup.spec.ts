import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTransloco, TranslocoLoader, TranslocoService } from '@jsverse/transloco';
import { of, Subject, throwError } from 'rxjs';

import type {
  NewsletterAvailability,
  NewsletterSignupResponse,
} from '../../../../shared/newsletter';
import { NewsletterService } from './data-access/newsletter.service';
import { NewsletterSignup } from './newsletter-signup';

class MockNewsletterService {
  getAvailability = vi.fn(() => of<NewsletterAvailability>({ available: true }));
  subscribe = vi.fn(() => of<NewsletterSignupResponse>({ accepted: true }));
}

class MockTranslocoLoader implements TranslocoLoader {
  getTranslation(lang: string) {
    return of({
      common: { actions: { retry: 'Tentar novamente' } },
      newsletter: {
        eyebrow: 'Novidades de Sanaka',
        title: lang === 'en' ? 'Sanaka also arrives by email.' : 'Sanaka também chega por e-mail.',
        intro: 'Novidades com pequenos comentários meus.',
        email: 'Seu e-mail',
        consent: 'Quero receber as novidades de Sanaka por e-mail.',
        website: 'Seu site — deixe vazio',
        privacy: 'Brevo administra os e-mails. Você pode cancelar a assinatura.',
        submit: 'Assinar',
        submitting: 'Enviando',
        checking: 'Consultando as inscrições…',
        unavailable: 'As inscrições não estão disponíveis.',
        pendingConfirmation: 'Confira seu e-mail para confirmar a assinatura.',
        rateLimited: 'Aguarde antes de tentar novamente.',
        error: 'Não foi possível solicitar a confirmação.',
        errors: { email: 'Informe um e-mail válido.', consent: 'Marque a opção para assinar.' },
      },
    });
  }
}

describe('NewsletterSignup', () => {
  let fixture: ComponentFixture<NewsletterSignup>;
  let service: MockNewsletterService;
  let element: HTMLElement;

  beforeEach(async () => {
    service = new MockNewsletterService();
    await TestBed.configureTestingModule({
      imports: [NewsletterSignup],
      providers: [
        { provide: NewsletterService, useValue: service },
        provideTransloco({
          config: {
            availableLangs: ['pt-BR', 'en'],
            defaultLang: 'pt-BR',
            reRenderOnLangChange: true,
            prodMode: true,
          },
          loader: MockTranslocoLoader,
        }),
      ],
    }).compileComponents();
  });

  async function render(): Promise<void> {
    fixture = TestBed.createComponent(NewsletterSignup);
    element = fixture.nativeElement;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  function fillEmail(email = 'reader@example.com'): void {
    const input = element.querySelector<HTMLInputElement>('input[type="email"]')!;
    input.value = email;
    input.dispatchEvent(new Event('input'));
  }

  function giveConsent(): void {
    const checkbox = element.querySelector<HTMLInputElement>('input[type="checkbox"]')!;
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event('change'));
  }

  function submit(): void {
    element.querySelector<HTMLFormElement>('form')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  }

  it('offers only email and explicit, initially unchecked consent', async () => {
    await render();

    expect(element.querySelector('h2')?.textContent).toContain('Sanaka também chega por e-mail.');
    expect(element.querySelector<HTMLInputElement>('input[type="checkbox"]')?.checked).toBe(false);
    expect(element.querySelector<HTMLInputElement>('input[type="email"]')?.maxLength).toBe(254);
    expect(element.querySelector('input[formControlName="name"]')).toBeNull();
    expect(
      element.querySelector('input[formControlName="website"]')?.getAttribute('tabindex'),
    ).toBe('-1');
    expect(service.subscribe).not.toHaveBeenCalled();
  });

  it('explains invalid input and associates both errors with their controls', async () => {
    await render();
    submit();

    expect(service.subscribe).not.toHaveBeenCalled();
    expect(element.querySelector('#newsletter-email-error')?.textContent).toContain(
      'e-mail válido',
    );
    expect(element.querySelector('#newsletter-consent-error')?.textContent).toContain(
      'Marque a opção',
    );
    expect(element.querySelector('input[type="email"]')?.getAttribute('aria-invalid')).toBe('true');
    expect(element.querySelector('input[type="checkbox"]')?.getAttribute('aria-describedby')).toBe(
      'newsletter-consent-error',
    );
  });

  it('does not enroll a valid address without consent', async () => {
    await render();
    fillEmail();
    submit();

    expect(service.subscribe).not.toHaveBeenCalled();
    expect(element.querySelector('#newsletter-email-error')).toBeNull();
    expect(element.querySelector('#newsletter-consent-error')).not.toBeNull();
  });

  it('rejects an invalid email even when consent is checked', async () => {
    await render();
    fillEmail('invalid');
    giveConsent();
    submit();

    expect(service.subscribe).not.toHaveBeenCalled();
    expect(element.querySelector('#newsletter-email-error')).not.toBeNull();
  });

  it('normalizes the email and asks the reader to confirm, without announcing a confirmed subscription', async () => {
    await render();
    fillEmail('  reader@example.com  ');
    giveConsent();
    submit();

    expect(service.subscribe).toHaveBeenCalledWith({
      email: 'reader@example.com',
      consent: true,
      website: '',
    });
    expect(element.querySelector('[role="status"]')?.textContent).toContain('Confira seu e-mail');
    expect(element.querySelector('form')).toBeNull();
  });

  it('disables interaction and ignores duplicate submits while a request is pending', async () => {
    const pending = new Subject<NewsletterSignupResponse>();
    service.subscribe.mockReturnValue(pending);
    await render();
    fillEmail();
    giveConsent();
    submit();
    submit();

    expect(service.subscribe).toHaveBeenCalledTimes(1);
    expect(element.querySelector('fieldset')?.disabled).toBe(true);
    expect(element.querySelector<HTMLButtonElement>('.newsletter__submit')?.disabled).toBe(true);

    pending.next({ accepted: true });
    fixture.detectChanges();
    expect(element.querySelector('[role="status"]')?.textContent).toContain('Confira seu e-mail');
  });

  it('keeps the address for a retry if the server does not accept the request', async () => {
    service.subscribe.mockReturnValue(of({ accepted: false }));
    await render();
    fillEmail();
    giveConsent();
    submit();

    expect(element.textContent).toContain('Não foi possível solicitar a confirmação.');
    expect(element.querySelector<HTMLInputElement>('input[type="email"]')?.value).toBe(
      'reader@example.com',
    );
  });

  it.each([
    [429, 'Aguarde antes de tentar novamente.'],
    [502, 'Não foi possível solicitar a confirmação.'],
    [503, 'As inscrições não estão disponíveis.'],
  ])('presents an honest, recoverable state for HTTP %s', async (status, message) => {
    service.subscribe.mockReturnValue(throwError(() => new HttpErrorResponse({ status })));
    await render();
    fillEmail();
    giveConsent();
    submit();

    expect(element.textContent).toContain(message);
    expect(element.textContent).not.toContain('Confira seu e-mail');
  });

  it('does not show an active signup form until availability is known', async () => {
    const availability = new Subject<NewsletterAvailability>();
    service.getAvailability.mockReturnValue(availability);
    await render();

    expect(element.textContent).toContain('Consultando as inscrições');
    expect(element.querySelector('form')).toBeNull();

    availability.next({ available: true });
    fixture.detectChanges();
    expect(element.querySelector('form')).not.toBeNull();
  });

  it('allows checking availability again after configuration is completed', async () => {
    service.getAvailability.mockReturnValueOnce(of({ available: false }));
    await render();
    expect(element.querySelector('form')).toBeNull();

    element.querySelector<HTMLButtonElement>('.newsletter__retry')!.click();
    fixture.detectChanges();

    expect(service.getAvailability).toHaveBeenCalledTimes(2);
    expect(element.querySelector('form')).not.toBeNull();
    expect(service.subscribe).not.toHaveBeenCalled();
  });

  it('handles an availability network failure without breaking the page', async () => {
    service.getAvailability.mockReturnValue(throwError(() => new Error('offline')));
    await render();

    expect(element.textContent).toContain('As inscrições não estão disponíveis.');
    expect(service.subscribe).not.toHaveBeenCalled();
  });

  it('unsubscribes a pending request when the component is destroyed', async () => {
    const pending = new Subject<NewsletterSignupResponse>();
    service.subscribe.mockReturnValue(pending);
    await render();
    fillEmail();
    giveConsent();
    submit();
    expect(pending.observed).toBe(true);

    fixture.destroy();
    expect(pending.observed).toBe(false);
  });

  it('uses the active UI language', async () => {
    await render();
    TestBed.inject(TranslocoService).setActiveLang('en');
    fixture.detectChanges();
    await fixture.whenStable();

    expect(element.querySelector('h2')?.textContent).toContain('Sanaka also arrives by email.');
  });
});
