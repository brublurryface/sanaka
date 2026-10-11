/**
 * Percursos com traduções reais: começar, agir, entender o retorno e continuar.
 * jsdom verifica contratos e eventos; não substitui a revisão visual em navegador.
 */
import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import {
  provideTransloco,
  Translation,
  TranslocoLoader,
  TranslocoService,
} from '@jsverse/transloco';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it } from 'vitest';
import { EntregasLab } from '../entregas/entregas-lab';
import { JogoLab } from '../jogo/jogo-lab';
import { ObolosLab } from '../obolos/obolos-lab';
import { PadariaLab } from '../padaria/padaria-lab';
import { MatrixStudyFrame } from './matrix-study-frame';

class ActualTranslations implements TranslocoLoader {
  getTranslation(language: string) {
    return of(
      JSON.parse(
        readFileSync(join(process.cwd(), 'public/i18n', `${language}.json`), 'utf8'),
      ) as Translation,
    );
  }
}
const labs: readonly { id: string; component: Type<unknown> }[] = [
  { id: 'obolos', component: ObolosLab },
  { id: 'entregas', component: EntregasLab },
  { id: 'jogo', component: JogoLab },
  { id: 'padaria', component: PadariaLab },
];
function button(root: HTMLElement, name: string): HTMLButtonElement {
  const result = [...root.querySelectorAll('button')].find(
    (item) => item.textContent?.replace(/\s+/g, ' ').trim() === name,
  );
  if (!result) throw new Error(`Botão não encontrado: ${name}`);
  return result;
}
function click(root: HTMLElement, name: string, detect: () => void): void {
  const control = button(root, name);
  expect(control.disabled, name).toBe(false);
  control.click();
  detect();
}
function open(root: HTMLElement, selector: string): HTMLDetailsElement {
  const detail = root.querySelector(selector) as HTMLDetailsElement;
  detail.open = true;
  return detail;
}

describe('Matrix guided journeys in the Angular DOM', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: labs.map((lab) => lab.component),
      providers: [
        provideRouter([]),
        provideTransloco({
          config: {
            availableLangs: ['pt-BR', 'en'],
            defaultLang: 'pt-BR',
            fallbackLang: 'pt-BR',
            reRenderOnLangChange: true,
            prodMode: true,
          },
          loader: ActualTranslations,
        }),
      ],
    }).compileComponents();
  });

  it.each(labs)(
    'starts $id with an action and keeps reference material optional',
    ({ id, component }) => {
      const fixture = TestBed.createComponent(component);
      fixture.detectChanges();
      const root = fixture.nativeElement as HTMLElement;
      expect(root.querySelectorAll('h1')).toHaveLength(1);
      expect(root.querySelector('main')).toBeNull();
      expect(root.querySelector('#study-story')).toBeNull();
      expect(root.querySelector('#study-explanation')).toBeNull();
      expect(root.querySelector('#study-experiment app-study-walkthrough')).not.toBeNull();
      expect(root.querySelector('a[href="/matrix/' + id + '#study-experiment"]')).not.toBeNull();
      expect(root.querySelector('.study-journey [aria-current="step"]')).not.toBeNull();
      expect((root.querySelector('.study-technical') as HTMLDetailsElement).open).toBe(false);
      for (const details of root.querySelectorAll<HTMLDetailsElement>('.study-reference'))
        expect(details.open).toBe(false);
      if (id === 'obolos') {
        expect(root.querySelector('img')!.getAttribute('src')).toBe(
          '/images/matrix/obolos/obolos-atmosphere-desktop.webp',
        );
      } else {
        expect(root.querySelector('.study-hero--neutral')).not.toBeNull();
        expect(root.querySelector('img')).toBeNull();
      }

      // A biblioteca continua disponível, mas não ocupa o primeiro contato.
      open(root, '#study-code .study-reference');
      const frame = fixture.debugElement.query(By.directive(MatrixStudyFrame))
        .componentInstance as MatrixStudyFrame;
      expect(root.querySelector('#study-code .code-window__snippet')!.textContent).toBe(
        frame.activeSlide.text,
      );
      frame.next();
      fixture.detectChanges();
      expect(root.querySelector('#study-code .code-window__snippet')!.textContent).toBe(
        frame.activeSlide.text,
      );
      frame.previous();
      open(root, '#study-tests .study-reference');
      click(root, 'Testar exemplos prontos', () => fixture.detectChanges());
      expect(root.querySelectorAll('.study-checks li').length).toBeGreaterThanOrEqual(6);
      expect(root.querySelector('.study-checks')!.textContent).not.toContain('Falhou');

      const ids = [...root.querySelectorAll('[id]')].map((element) => element.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const control of root.querySelectorAll('input, select')) {
        expect(
          root.querySelector(`label[for='${control.id}']`) || control.closest('label'),
        ).not.toBeNull();
      }
      expect(root.textContent).not.toMatch(/matrix\.studies\.|{{/);
    },
  );

  it('updates the action, feedback and technical explanation when language changes', () => {
    const fixture = TestBed.createComponent(ObolosLab);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    click(root, 'Consultar posição', () => fixture.detectChanges());
    open(root, '.study-technical');
    expect(root.querySelector('.study-feedback')!.textContent).toContain('posição 0');
    TestBed.inject(TranslocoService).setActiveLang('en');
    fixture.detectChanges();
    expect(root.querySelector('h1')!.textContent).toBe('Mors’s obols');
    expect(button(root, 'Look up position')).not.toBeNull();
    expect(root.querySelector('.study-feedback')!.textContent).toContain('Position 0');
    expect(root.querySelector('.study-technical')!.textContent).toContain('Index 0 is valid');
  });

  it('supports a separate mobile art source without making art mandatory', () => {
    const fixture = TestBed.createComponent(MatrixStudyFrame);
    fixture.componentRef.setInput('study', {
      id: 'obolos',
      topics: [],
      investigations: [],
      desktopImage: '/images/matrix/matrix-atmosphere-desktop.webp',
      mobileImage: '/images/matrix/rest-api/rest-api-atmosphere-desktop.webp',
    });
    fixture.componentRef.setInput('sources', new ObolosLab().sources);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('picture source')!.getAttribute('media')).toBe('(max-width: 700px)');
    fixture.componentRef.setInput('study', { id: 'obolos', topics: [], investigations: [] });
    fixture.detectChanges();
    expect(root.querySelector('img')).toBeNull();
    expect(root.querySelector('.study-hero--neutral')).not.toBeNull();
  });

  it('guides lookup, editing, searching and counting without showing results early', async () => {
    const fixture = TestBed.createComponent(ObolosLab);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const detect = () => fixture.detectChanges();
    expect(button(root, 'Continuar: Organizar a caixa →').disabled).toBe(true);
    expect(root.querySelector('#obolo-name')).toBeNull();
    click(root, 'Consultar posição', detect);
    expect(root.querySelector('.study-feedback')!.textContent).toContain('maya');
    expect(fixture.componentInstance.stepSource()!.text).toContain('readObolo');
    click(root, 'Continuar: Organizar a caixa →', detect);
    await fixture.whenStable();
    expect(document.activeElement).toBe(root.querySelector('.study-lesson-heading h3'));
    click(root, 'Adicionar ao final', detect);
    expect(root.querySelector('.study-feedback')!.textContent).toContain('mors entrou');
    click(root, 'Continuar: Encontrar repetições →', detect);
    expect(root.querySelector('table')).toBeNull();
    click(root, 'Procurar nomes repetidos', detect);
    expect(fixture.componentInstance.history.state().activeIndex).toBe(0);
    expect(button(root, 'Continuar: Contar por nome →').disabled).toBe(true);
    while (fixture.componentInstance.history.canGoForward())
      click(root, 'Examinar próximo óbolo →', detect);
    expect(fixture.componentInstance.history.state().duplicates).toEqual(['maya', 'mors']);
    open(root, '.study-technical');
    expect(root.querySelector('.study-technical .code-window__snippet')!.textContent).toContain(
      'seen.has',
    );
    click(root, 'Continuar: Contar por nome →', detect);
    expect(root.querySelector('.study-counts')).toBeNull();
    click(root, 'Contar moedas por nome', detect);
    expect(root.querySelector('.study-counts')!.textContent).toContain('mors · 3');
  });

  it('makes FIFO, LIFO and confirmation three distinct activities', () => {
    const fixture = TestBed.createComponent(EntregasLab);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const detect = () => fixture.detectChanges();
    expect(root.querySelector('.study-actions')).toBeNull();
    click(root, 'Retirar próxima encomenda', detect);
    expect(fixture.componentInstance.history.state().delivered[0].label).toBe('volume-01');
    click(root, 'Continuar: Quem chegou por último →', detect);
    click(root, 'Retirar próxima encomenda', detect);
    expect(fixture.componentInstance.history.state().delivered[0].label).toBe('volume-03');
    click(root, 'Continuar: Entregar ou tentar de novo →', detect);
    click(root, 'Levar próxima encomenda', detect);
    expect(fixture.componentInstance.history.state().delivered).toHaveLength(0);
    expect(root.querySelector('#delivery-confirm-help')!.textContent).toContain('chegou');
    click(root, 'Simular falha na entrega', detect);
    expect(fixture.componentInstance.waiting().at(-1)?.label).toBe('volume-01');
    expect(root.querySelector('.study-feedback')!.textContent).toContain('voltou ao final');
    click(root, 'Levar próxima encomenda', detect);
    click(root, 'Confirmar chegada', detect);
    expect(fixture.componentInstance.history.state().delivered[0].label).toBe('volume-02');
    expect(
      [...root.querySelectorAll('button')].some(
        (item) => item.textContent?.trim() === 'Confirmar chegada',
      ),
    ).toBe(false);
  });

  it('plays immediately, then explains composed rules one at a time', () => {
    const fixture = TestBed.createComponent(JogoLab);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const detect = () => fixture.detectChanges();
    click(root, 'Jogar rodada', detect);
    expect(root.querySelector('.study-result')!.textContent).toContain('Kālikā vence');
    click(root, 'Continuar: Acompanhar a decisão →', detect);
    click(root, 'Jogar rodada', detect);
    expect(root.querySelector('.study-result')).toBeNull();
    click(root, 'Examinar próxima regra →', detect);
    expect(root.querySelector('.study-feedback')!.textContent).toContain('Os gestos são iguais?');
    expect(root.querySelector('.study-feedback')!.textContent).not.toContain('tie');
    click(root, 'Examinar próxima regra →', detect);
    expect(root.querySelector('.study-result')!.textContent).toContain('Kālikā vence');
    expect(fixture.componentInstance.stepSource()!.text).toContain('DominanceRule');
    click(root, 'Continuar: Acrescentar dois gestos →', detect);
    expect(root.querySelectorAll('#game-player option')).toHaveLength(5);
    const player = root.querySelector('#game-player') as HTMLSelectElement;
    player.value = 'lizard';
    player.dispatchEvent(new Event('change', { bubbles: true }));
    const opponent = root.querySelector('#game-opponent') as HTMLSelectElement;
    opponent.value = 'spock';
    opponent.dispatchEvent(new Event('change', { bubbles: true }));
    detect();
    click(root, 'Jogar rodada', detect);
    while (fixture.componentInstance.history.canGoForward())
      click(root, 'Examinar próxima regra →', detect);
    expect(root.querySelector('.study-result')!.textContent).toContain('Kālikā vence');
  });

  it('walks menu, order, lookup and payment replay with an explicit response action', () => {
    const fixture = TestBed.createComponent(PadariaLab);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const detect = () => fixture.detectChanges();
    expect(root.querySelector('#bakery-product')).toBeNull();
    click(root, 'Consultar cardápio', detect);
    expect(button(root, 'Consultar cardápio').disabled).toBe(true);
    expect(
      [...root.querySelectorAll<HTMLButtonElement>('.study-journey button')].every(
        (item) => item.disabled,
      ),
    ).toBe(true);
    expect(root.querySelector('.study-feedback')!.textContent).toContain('Receber resposta');
    click(root, 'Receber resposta →', detect);
    expect(root.querySelector('.study-menu')!.textContent).toContain('Pão');
    click(root, 'Continuar: Criar um pedido →', detect);
    click(root, 'Enviar pedido', detect);
    click(root, 'Receber resposta →', detect);
    expect(root.querySelector('.study-result')!.textContent).toContain('201');
    click(root, 'Continuar: Encontrar o pedido →', detect);
    expect((root.querySelector('#bakery-order-id') as HTMLInputElement).value).toBe('order-1');
    click(root, 'Consultar pedido', detect);
    click(root, 'Receber resposta →', detect);
    click(root, 'Continuar: Repetir com cuidado →', detect);
    expect(button(root, 'Repetir esse pagamento').disabled).toBe(true);
    click(root, 'Simular pagamento', detect);
    click(root, 'Receber resposta →', detect);
    click(root, 'Repetir esse pagamento', detect);
    click(root, 'Receber resposta →', detect);
    expect(fixture.componentInstance.history.state().payments).toHaveLength(1);
    expect(fixture.componentInstance.lessonComplete()).toBe(true);
    expect(root.textContent).not.toMatch(/matrix\.studies\.|{{/);
  });
});
