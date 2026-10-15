/** Usa as mesmas cores de Components, com recortes fiéis e sem injetar HTML. */
import { Component, computed, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { StudySource } from './matrix-study-definition';

@Component({
  selector: 'app-study-source-code',
  host: { class: 'code-window__viewport' },
  imports: [TranslocoPipe],
  template: `<pre
    class="code-window__snippet"
    tabindex="0"
    [attr.aria-label]="source().titleKey | transloco"
  ><code>@for (token of tokens(); track $index) {<span [class]="token.className">{{ token.text }}</span>}</code></pre>`,
})
export class StudySourceCode {
  readonly source = input.required<StudySource>();

  // A análise de TypeScript ocorre no gerador, fora do navegador. Aqui só recortamos
  // o texto e deixamos o Angular tratá-lo como texto, inclusive se contiver tags HTML.
  readonly tokens = computed(() => {
    const source = this.source();
    return source.tokens.map((token) => ({
      className: token.className,
      text: source.text.slice(token.start, token.end),
    }));
  });
}
