import type { Translation, TranslocoLoader } from '@jsverse/transloco';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { of } from 'rxjs';

/** Usa os catálogos publicados para não duplicar traduções nas fixtures de interface. */
export class TranslationFixture implements TranslocoLoader {
  getTranslation(language: string) {
    if (language !== 'pt-BR' && language !== 'en') {
      throw new Error(`Idioma não suportado na fixture: ${language}`);
    }
    const content = readFileSync(join(process.cwd(), 'public', 'i18n', `${language}.json`), 'utf8');
    return of(JSON.parse(content) as Translation);
  }
}
