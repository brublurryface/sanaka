import { HttpParams } from '@angular/common/http';
import { InjectionToken } from '@angular/core';

/** Regras editoriais que delimitam o conteúdo público de Sanaka no WordPress compartilhado. */
export interface WordPressContentPolicy {
  readonly excludedCategorySlugs: readonly string[];
  readonly aboutCycleCategorySlug: string;
  readonly sanakaverseCategorySlug: string;
}

/** IDs confirmados no CMS, sem vínculo com a instalação original. */
export interface ResolvedWordPressContentPolicy {
  readonly excludedCategoryIds: readonly number[];
  readonly aboutCycleCategoryId?: number;
  readonly sanakaverseCategoryId?: number;
}

/**
 * Romance pertence ao WoD, Sobre reúne os fragmentos autobiográficos e Sanaka-loka identifica
 * sua coleção por slugs estáveis. Os IDs exigidos pela REST API são resolvidos no CMS.
 */
export const SANAKA_WORDPRESS_CONTENT_POLICY = new InjectionToken<WordPressContentPolicy>(
  'SANAKA_WORDPRESS_CONTENT_POLICY',
  {
    factory: () => ({
      excludedCategorySlugs: ['romance'],
      aboutCycleCategorySlug: 'sobre',
      sanakaverseCategorySlug: 'sanaka-loka',
    }),
  },
);

/** A forma simples de categories_exclude não inclui descendentes na REST API. */
export function excludeWordPressCategoryBranches(
  params: HttpParams,
  categoryIds: readonly number[],
): HttpParams {
  return categoryIds.length
    ? params
        .set('categories_exclude[terms]', categoryIds.join(','))
        .set('categories_exclude[include_children]', 'true')
    : params;
}
