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
    'has complete three-level explanations, Q&A and source captions in $language',
    ({ tree }) => {
      for (const page of [new ObolosLab(), new EntregasLab(), new JogoLab(), new PadariaLab()]) {
        const prefix = `matrix.studies.${page.study.id}`;
        for (const topic of page.study.topics) {
          for (const level of ['title', 'everyday', 'technical', 'implementation']) {
            expect(lookup(tree, `${prefix}.topics.${topic}.${level}`)).toBeTypeOf('string');
          }
          for (const question of ['one', 'two', 'three']) {
            for (const part of ['question', 'answer', 'example']) {
              expect(
                lookup(tree, `${prefix}.topics.${topic}.questions.${question}.${part}`),
              ).toBeTypeOf('string');
            }
          }
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
});
