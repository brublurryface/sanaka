import { DOCUMENT } from '@angular/common';
import { inject, Injectable } from '@angular/core';

/** Converte campos HTML renderizados pelo WordPress em texto seguro para a interface. */
@Injectable({ providedIn: 'root' })
export class WordPressTextService {
  private readonly inertDocument = inject(DOCUMENT).implementation.createHTMLDocument('');

  toText(html: string): string {
    // O documento não possui janela; o conteúdo do template nunca entra no DOM da aplicação.
    const template = this.inertDocument.createElement('template');

    template.innerHTML = html.replace(/<\/(?:p|div|blockquote|li|h[1-6])>/gi, ' ');
    const content = template.content;
    content.querySelectorAll('.more-link, script, style').forEach((element) => element.remove());

    return (content.textContent ?? '').replace(/\s+/g, ' ').trim();
  }
}
