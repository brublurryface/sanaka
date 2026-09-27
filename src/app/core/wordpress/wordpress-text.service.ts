import { DOCUMENT } from '@angular/common';
import { inject, Injectable } from '@angular/core';

/** Converte campos HTML renderizados pelo WordPress em texto seguro para a interface. */
@Injectable({ providedIn: 'root' })
export class WordPressTextService {
  private readonly document = inject(DOCUMENT);

  toText(html: string): string {
    const container = this.document.createElement('div');

    container.innerHTML = html.replace(/<\/(?:p|div|blockquote|li|h[1-6])>/gi, ' ');
    container.querySelectorAll('.more-link, script, style').forEach((element) => element.remove());

    return (container.textContent ?? '').replace(/\s+/g, ' ').trim();
  }
}
