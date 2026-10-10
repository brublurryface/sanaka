/**
 * Integração Angular + DOM com os JSON reais de tradução.
 * Verifica ações e contratos acessíveis, não finge medir layout no ambiente jsdom.
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
    // Apenas testes Node leem disco; nenhum acesso de filesystem entra no cliente Angular.
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

/** Uma ação por nome acessível aproxima o teste da leitura de quem usa a interface. */
function button(root: HTMLElement, name: string): HTMLButtonElement {
  const result = [...root.querySelectorAll('button')].find(
    (item) => item.textContent?.trim() === name,
  );
  if (!result) {
    throw new Error(`Botão não encontrado: ${name}`);
  }
  return result;
}

describe('Matrix studies in the Angular DOM', () => {
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
    'renders $id with shared structure, real code and route-qualified anchors',
    ({ id, component }) => {
      const fixture = TestBed.createComponent(component);
      fixture.detectChanges();
      const root = fixture.nativeElement as HTMLElement;
      expect(root.querySelectorAll('h1')).toHaveLength(1);
      expect(root.querySelector('main')).toBeNull();
      expect(root.querySelector('.study-hero--neutral')).not.toBeNull();
      expect(root.querySelector('img')).toBeNull();
      expect(root.querySelectorAll('.study-topic')).toHaveLength(3);
      expect(root.querySelectorAll('.study-topic dt')).toHaveLength(9);
      const experimentLink = root.querySelector(`a[href='/matrix/${id}#study-experiment']`);
      expect(experimentLink).not.toBeNull();
      const frame = fixture.debugElement.query(By.directive(MatrixStudyFrame))
        .componentInstance as MatrixStudyFrame;
      expect(root.querySelector('.code-window__snippet')!.textContent).toBe(frame.activeSlide.text);
      frame.next();
      fixture.detectChanges();
      expect(root.querySelector('.code-window__snippet')!.textContent).toBe(frame.activeSlide.text);
      frame.previous();
      fixture.detectChanges();
      button(root, 'Executar cenários').click();
      fixture.detectChanges();
      expect(root.querySelectorAll('.study-checks li').length).toBeGreaterThanOrEqual(6);
      expect(root.querySelector('.study-checks')!.textContent).not.toContain('Falhou');
      const ids = [...root.querySelectorAll('[id]')].map((element) => element.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const control of root.querySelectorAll('input, select')) {
        expect(
          root.querySelector(`label[for='${control.id}']`) || control.closest('label'),
        ).not.toBeNull();
      }
    },
  );

  it('updates labels when language changes', () => {
    const fixture = TestBed.createComponent(ObolosLab);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('h1').textContent).toBe('Os óbolos de Mors');
    TestBed.inject(TranslocoService).setActiveLang('en');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('h1').textContent).toBe('Mors’s obols');
  });

  it('supports separate responsive art sources without requiring them in other labs', () => {
    const fixture = TestBed.createComponent(MatrixStudyFrame);
    // Assets já existentes são apenas dados do teste; nenhum Header novo os usa por padrão.
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
    expect(root.querySelector('.study-hero--neutral')).toBeNull();
    expect(root.querySelector('picture source')!.getAttribute('media')).toBe('(max-width: 700px)');
    expect(root.querySelector('img')!.getAttribute('width')).toBe('2400');
    fixture.componentRef.setInput('study', {
      id: 'obolos',
      topics: [],
      investigations: [],
      desktopImage: '/images/matrix/matrix-atmosphere-desktop.webp',
    });
    fixture.detectChanges();
    expect(root.querySelector('picture source')).toBeNull();
  });

  it('selects index zero and steps through a real traversal', () => {
    const fixture = TestBed.createComponent(ObolosLab);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    fixture.componentInstance.execute('traverse');
    fixture.detectChanges();
    const next = root.querySelector('.study-step-viewer button:last-child') as HTMLButtonElement;
    next.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.history.state().activeIndex).toBe(0);
    expect(root.querySelector('.study-item--active')).not.toBeNull();
    const previous = root.querySelector(
      '.study-step-viewer button:first-child',
    ) as HTMLButtonElement;
    previous.click();
    fixture.detectChanges();
    expect(previous.disabled).toBe(true);
  });

  it('requires an explicit ack in simulated messaging mode', () => {
    const fixture = TestBed.createComponent(EntregasLab);
    fixture.detectChanges();
    fixture.componentInstance.changeMode('messaging');
    fixture.detectChanges();
    fixture.componentInstance.process();
    fixture.detectChanges();
    expect(fixture.componentInstance.history.state().delivered).toHaveLength(0);
    const root = fixture.nativeElement as HTMLElement;
    button(root, 'Confirmar · ACK').click();
    fixture.detectChanges();
    expect(fixture.componentInstance.history.state().delivered).toHaveLength(1);
    expect(button(root, 'Confirmar · ACK').disabled).toBe(true);
  });

  it('reveals game outcomes only after their real evaluation step', () => {
    const fixture = TestBed.createComponent(JogoLab);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    button(root, 'Avaliar rodada').click();
    fixture.detectChanges();
    expect(root.querySelector('.study-result')!.textContent).toContain('Avance');
    fixture.componentInstance.history.finish();
    fixture.detectChanges();
    expect(root.querySelector('.study-result')!.textContent).toContain('Kālikā vence');
  });

  it('blocks another bakery request until the pending response resolves', () => {
    const fixture = TestBed.createComponent(PadariaLab);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    button(root, 'POST /api/pedidos').click();
    fixture.detectChanges();
    expect(button(root, 'POST /api/pedidos').disabled).toBe(true);
    button(root, 'Resolver requisição').click();
    fixture.detectChanges();
    expect(button(root, 'Resolver requisição').disabled).toBe(true);
    expect(fixture.componentInstance.history.state().response!.status).toBe(201);
    expect(root.querySelector('.study-result')!.textContent).toContain('sucesso');
  });
});
