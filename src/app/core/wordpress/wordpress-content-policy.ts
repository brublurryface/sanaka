import { InjectionToken } from '@angular/core';

/** Regras editoriais que delimitam o conteúdo público de Sanaka no WordPress compartilhado. */
export interface WordPressContentPolicy {
  readonly excludedCategoryIds: readonly number[];
  readonly aboutCycleCategoryId: number;
  readonly sanakaverseCategorySlug: string;
}

/**
 * Romance pertence ao WoD, Sobre reúne os fragmentos autobiográficos e Sanakaverse identifica
 * sua coleção pela categoria editorial estável.
 *
 * Os IDs pertencem à instalação WordPress que é a fonte de verdade dos dois projetos. Se uma
 * migração recriar as taxonomias, este é o único ponto da aplicação que precisa ser atualizado.
 */
export const SANAKA_WORDPRESS_CONTENT_POLICY = new InjectionToken<WordPressContentPolicy>(
  'SANAKA_WORDPRESS_CONTENT_POLICY',
  {
    factory: () => ({
      excludedCategoryIds: [43],
      aboutCycleCategoryId: 62,
      sanakaverseCategorySlug: 'sanakaverse',
    }),
  },
);
