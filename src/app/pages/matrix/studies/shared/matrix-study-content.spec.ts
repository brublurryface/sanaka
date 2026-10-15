/** A estrutura editorial e os placeholders não podem divergir entre os idiomas. */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { EntregasLab } from '../entregas/entregas-lab';
import { JogoLab } from '../jogo/jogo-lab';
import { ObolosLab } from '../obolos/obolos-lab';
import { PadariaLab } from '../padaria/padaria-lab';
import { MATRIX_EXPERIMENTS } from '../../matrix-experiments';

interface TextTree {
  [key: string]: string | TextTree;
}
const resources = ['pt-BR', 'en'].map((language) => ({
  language,
  tree: JSON.parse(
    readFileSync(join(process.cwd(), 'public/i18n', `${language}.json`), 'utf8'),
  ) as TextTree,
}));

function lookup(tree: TextTree, key: string): string | TextTree | undefined {
  let current: string | TextTree | undefined = tree;
  for (const part of key.split('.')) {
    current = typeof current === 'object' ? current[part] : undefined;
  }
  return current;
}

function leaves(tree: TextTree, prefix = ''): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(tree)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') {
      result[fullKey] = value;
    } else {
      Object.assign(result, leaves(value, fullKey));
    }
  }
  return result;
}

describe('Matrix study translations and content', () => {
  it('keeps study keys and interpolation variables identical in both languages', () => {
    const pt = leaves(lookup(resources[0].tree, 'matrix.studies') as TextTree);
    const en = leaves(lookup(resources[1].tree, 'matrix.studies') as TextTree);
    expect(Object.keys(pt).sort()).toEqual(Object.keys(en).sort());
    const placeholders = (text: string) =>
      [...text.matchAll(/{{\s*([^}]+?)\s*}}/g)].map((match) => match[1].trim()).sort();
    for (const [key, value] of Object.entries(pt)) {
      expect(placeholders(value), key).toEqual(placeholders(en[key]));
    }
  });
  it.each(resources)(
    'has guided actions, both explanation levels and source captions in $language',
    ({ tree }) => {
      for (const page of [new ObolosLab(), new EntregasLab(), new JogoLab(), new PadariaLab()]) {
        const prefix = `matrix.studies.${page.study.id}`;
        for (const topic of page.study.topics) {
          for (const level of ['title', 'everyday', 'technical']) {
            expect(lookup(tree, `${prefix}.topics.${topic}.${level}`)).toBeTypeOf('string');
          }
          expect(lookup(tree, `${prefix}.topics.${topic}.implementation`)).toBeUndefined();
        }
        for (const lesson of page.lessons) {
          for (const part of ['title', 'goal', 'next']) {
            expect(lookup(tree, `${prefix}.journey.${lesson}.${part}`)).toBeTypeOf('string');
          }
        }
        const events = lookup(tree, `${prefix}.events`) as TextTree;
        for (const event of Object.keys(events)) {
          expect(lookup(tree, `${prefix}.technicalEvents.${event}`), event).toBeTypeOf('string');
        }
        for (const source of page.sources) {
          expect(lookup(tree, source.titleKey)).toBeTypeOf('string');
          expect(lookup(tree, source.descriptionKey)).toBeTypeOf('string');
        }
        for (const question of page.study.investigations) {
          expect(lookup(tree, `${prefix}.investigations.${question}.question`)).toBeTypeOf(
            'string',
          );
          expect(lookup(tree, `${prefix}.investigations.${question}.answer`)).toBeTypeOf('string');
        }
      }
      for (const experiment of MATRIX_EXPERIMENTS) {
        for (const concept of experiment.concepts) {
          expect(lookup(tree, `matrix.studies.common.concepts.${concept}`)).toBeTypeOf('string');
        }
      }
    },
  );

  it('colors complete source ranges without losing characters, comments or whitespace', () => {
    const allowedClasses = new Set([
      '',
      'token-keyword',
      'token-call',
      'token-string',
      'token-type',
      'token-boolean',
      'token-constant',
      'token-comment',
    ]);
    const sources = [new ObolosLab(), new EntregasLab(), new JogoLab(), new PadariaLab()].flatMap(
      (page) => page.sources,
    );
    for (const source of sources) {
      let cursor = 0;
      for (const token of source.tokens) {
        expect(token.start, source.titleKey).toBe(cursor);
        expect(token.end).toBeGreaterThan(token.start);
        expect(allowedClasses.has(token.className)).toBe(true);
        cursor = token.end;
      }
      expect(cursor, source.titleKey).toBe(source.text.length);
      expect(source.tokens.map((token) => source.text.slice(token.start, token.end)).join('')).toBe(
        source.text,
      );
    }
    expect(
      sources.some((source) => source.tokens.some((token) => token.className === 'token-string')),
    ).toBe(true);
    expect(
      sources.some((source) => source.tokens.some((token) => token.className === 'token-comment')),
    ).toBe(true);
  });
});
