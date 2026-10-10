import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTransloco, TranslocoLoader } from '@jsverse/transloco';
import { of } from 'rxjs';

import { Contact } from './contact';
import { ContactService } from './data-access/contact.service';

class MockContactService {
  send = vi.fn(() => of({ delivered: true }));
}

class MockTranslocoLoader implements TranslocoLoader {
  getTranslation() {
    return of({
      contact: {
        hero: {
          eyebrow: 'Contato',
          title: { line1: 'Entre vozes,', line2: 'presenças e caminhos' },
          intro: 'Sanaka também se abre ao diálogo.',
          imageAlt: 'Māyā e Sarama observam uma nuvem de vozes.',
        },
        contentLabel: 'Redes e formulário de contato',
        social: {
          eyebrow: 'Outros portais',
          title: 'Onde me encontrar',
          intro: 'Cada rede mostra uma face diferente.',
          instagram: {
            presence: 'Sanaka sem limites',
            description: 'Imagens e fragmentos.',
          },
          linkedin: {
            presence: 'Sanaka formal',
            description: 'Trajetória profissional.',
          },
        },
        email: { label: 'E-mail direto', address: 'sanaka@sanaka.com.br' },
        form: {
          eyebrow: 'Passagem direta',
          title: 'Escreva para Sanaka',
          intro: 'A mensagem chega por e-mail.',
          name: 'Nome',
          email: 'E-mail',
          subject: 'Assunto',
          message: 'Mensagem',
          submit: 'Enviar mensagem',
          sending: 'Enviando',
          privacy: 'Dados usados apenas para resposta.',
          success: 'A mensagem atravessou o portal.',
          rateLimited: 'Aguarde antes de tentar novamente.',
          error: 'A mensagem não pôde ser entregue.',
          errors: {
            name: 'Informe o seu nome.',
            email: 'Informe um e-mail válido.',
            message: 'Escreva a mensagem.',
          },
        },
      },
    });
  }
}

describe('Contact', () => {
  let fixture: ComponentFixture<Contact>;
  let contactService: MockContactService;

  beforeEach(async () => {
    contactService = new MockContactService();

    await TestBed.configureTestingModule({
      imports: [Contact],
      providers: [
        { provide: ContactService, useValue: contactService },
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

    fixture = TestBed.createComponent(Contact);
    fixture.detectChanges();
  });

  it('should present the approved atmosphere and the two active social profiles', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const image = compiled.querySelector<HTMLImageElement>('.contact-hero__image');
    const socialLinks = Array.from(compiled.querySelectorAll<HTMLAnchorElement>('.contact-social'));

    expect(image?.getAttribute('src')).toBe('/images/contact/contact-atmosphere-desktop.webp');
    expect(image?.getAttribute('width')).toBe('1942');
    expect(socialLinks.map((link) => link.getAttribute('href'))).toEqual([
      'https://www.instagram.com/omsanaka/',
      'https://br.linkedin.com/in/brublurryface',
    ]);
    expect(compiled.textContent).toContain('Sanaka sem limites');
    expect(compiled.textContent).toContain('Sanaka formal');
  });

  it('should expose validation errors before sending an empty form', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    compiled.querySelector<HTMLFormElement>('form')?.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(contactService.send).not.toHaveBeenCalled();
    expect(compiled.querySelectorAll('.contact-message__error')).toHaveLength(3);
  });

  it('should send a valid message and show its success state', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    setInputValue(compiled, 'input[formControlName="name"]', 'Bruna');
    setInputValue(compiled, 'input[formControlName="email"]', 'bruna@example.com');
    setInputValue(compiled, 'input[formControlName="subject"]', 'Sanaka');
    setInputValue(compiled, 'textarea[formControlName="message"]', 'Uma mensagem.');

    compiled.querySelector<HTMLFormElement>('form')?.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(contactService.send).toHaveBeenCalledWith({
      name: 'Bruna',
      email: 'bruna@example.com',
      subject: 'Sanaka',
      message: 'Uma mensagem.',
      website: '',
    });
    expect(compiled.querySelector('.contact-message__status')?.textContent).toContain(
      'A mensagem atravessou o portal.',
    );
  });
});

function setInputValue(compiled: HTMLElement, selector: string, value: string): void {
  const control = compiled.querySelector<HTMLInputElement | HTMLTextAreaElement>(selector);
  if (!control) {
    throw new Error(`Control not found: ${selector}`);
  }

  control.value = value;
  control.dispatchEvent(new Event('input'));
}
