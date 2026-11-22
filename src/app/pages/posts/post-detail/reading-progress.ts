import { Directive, input, linkedSignal } from '@angular/core';

/** Mede apenas a seção apresentada. Trocar de artigo reinicia o progresso no mesmo componente. */
@Directive({
  selector: '[appReadingProgress]',
  exportAs: 'readingProgress',
  host: { '(window:scroll)': 'measure()', '(window:resize)': 'measure()' },
})
export class ReadingProgress {
  readonly articleSlug = input.required<string>({ alias: 'appReadingProgress' });
  readonly readingElement = input.required<HTMLElement>();
  private readonly measured = linkedSignal({
    source: this.articleSlug,
    computation: (): number => 0,
  });
  readonly percent = this.measured.asReadonly();

  protected measure(): void {
    const article = this.readingElement();
    const viewport = article.ownerDocument.defaultView;
    if (!viewport) return;
    const distance = Math.max(article.scrollHeight - viewport.innerHeight, 1);
    const progress = Math.round((-article.getBoundingClientRect().top / distance) * 100);
    this.measured.set(Math.min(100, Math.max(0, progress)));
  }
}
