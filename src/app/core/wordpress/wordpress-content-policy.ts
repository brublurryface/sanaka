import { InjectionToken } from '@angular/core';

/** Regras editoriais que delimitam o conteúdo público de Sanaka no WordPress compartilhado. */
export interface WordPressContentPolicy {
  readonly excludedCategoryIds: readonly number[];
}

/**
 * A categoria Romance pertence ao WoD e não pode atravessar a fronteira pública de Sanaka.
 *
 * O ID 43 pertence à instalação WordPress que é a fonte de verdade dos dois projetos. Se uma
 * migração recriar as taxonomias, este é o único ponto da aplicação que precisa ser atualizado.
 */
export const SANAKA_WORDPRESS_CONTENT_POLICY = new InjectionToken<WordPressContentPolicy>(
  'SANAKA_WORDPRESS_CONTENT_POLICY',
  {
    factory: () => ({ excludedCategoryIds: [43] }),
  },
);
