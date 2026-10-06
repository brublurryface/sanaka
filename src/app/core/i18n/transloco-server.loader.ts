import { inject, Injectable, InjectionToken } from '@angular/core';
import { Translation, TranslocoLoader } from '@jsverse/transloco';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const SUPPORTED_LANGUAGES = new Set(['en', 'pt-BR']);

export function resolveServerTranslationsDirectory(
  moduleDirectory = import.meta.dirname,
  workspaceDirectory = process.cwd(),
  directoryExists: (path: string) => boolean = existsSync,
): string {
  const bundledDirectory = join(moduleDirectory, '../browser/i18n');

  if (directoryExists(bundledDirectory)) {
    return bundledDirectory;
  }

  // Durante o prerender, o bundle roda numa pasta temporária; a origem pública continua no workspace.
  return join(workspaceDirectory, 'public/i18n');
}

export const SERVER_TRANSLATIONS_DIRECTORY = new InjectionToken<string>(
  'SERVER_TRANSLATIONS_DIRECTORY',
  {
    providedIn: 'root',
    factory: () => resolveServerTranslationsDirectory(),
  },
);

/** Lê traduções diretamente do build durante SSR, sem criar uma requisição HTTP interna. */
@Injectable()
export class TranslocoServerLoader implements TranslocoLoader {
  private readonly translationsDirectory = inject(SERVER_TRANSLATIONS_DIRECTORY);

  async getTranslation(lang: string): Promise<Translation> {
    if (!SUPPORTED_LANGUAGES.has(lang)) {
      throw new Error(`Idioma não suportado no SSR: ${lang}`);
    }

    const content = await readFile(join(this.translationsDirectory, `${lang}.json`), 'utf8');

    return JSON.parse(content) as Translation;
  }
}
