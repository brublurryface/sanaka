/** Tamanho padrão da página editorial, compartilhado pela store e pelo adaptador HTTP. */
export const POSTS_PAGE_SIZE = 20;

export type PostsViewMode = 'continuous' | 'paged';

export function normalizeTaxonomySlug(value: string | null): string | undefined {
  return value?.trim() || undefined;
}

/** Na leitura contínua a URL identifica a coleção. Somente o modo paginado codifica uma página. */
export function readPostsRoute(
  view: unknown,
  pageValue: string | null,
  category: string | null,
  tag: string | null,
) {
  const mode: PostsViewMode = view === 'paged' ? 'paged' : 'continuous';
  const parsedPage = Number(pageValue);
  const validPage =
    pageValue !== null &&
    /^\d+$/.test(pageValue) &&
    Number.isSafeInteger(parsedPage) &&
    parsedPage > 0;
  const page = mode === 'paged' && validPage ? parsedPage : 1;
  return {
    mode,
    page,
    categorySlug: normalizeTaxonomySlug(category),
    tagSlug: normalizeTaxonomySlug(tag),
    replacePage:
      mode === 'paged' && pageValue !== null && (page === 1 || pageValue !== String(page)),
  };
}

export function postsPageCommands(mode: PostsViewMode, page: number): (string | number)[] {
  if (mode === 'continuous') return ['/posts'];
  return page === 1 ? ['/posts', 'paged'] : ['/posts', 'paged', page];
}
