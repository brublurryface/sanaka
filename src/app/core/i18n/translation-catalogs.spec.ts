import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { translocoConfig } from './transloco.config';

/** Preserva a árvore de chaves e as variáveis de cada frase, independentemente do idioma. */
function catalogContract(language: string): unknown {
  const text = readFileSync(join(process.cwd(), 'public/i18n', language + '.json'), 'utf8');
  return JSON.parse(text, (key, value: unknown) => {
    if (typeof value === 'string') {
      if (!value.trim()) throw new Error(language + ': tradução vazia em ' + key);
      return Array.from(value.matchAll(/\{\{\s*([^}]+?)\s*\}\}/gu), (match) =>
        match[1].trim(),
      ).sort();
    }
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new Error(language + ': valor de tradução inválido em ' + key);
    }
    return value;
  });
}

describe('published translation catalogs', () => {
  const { availableLangs, defaultLang } = translocoConfig.config!;
  const languages = availableLangs!.map((language) =>
    typeof language === 'string' ? language : language.id,
  );
  it.each(languages.filter((language) => language !== defaultLang))(
    'keeps the keys and interpolation variables of the default language in %s',
    (language) => {
      expect(catalogContract(language)).toEqual(catalogContract(defaultLang!));
    },
  );
});
