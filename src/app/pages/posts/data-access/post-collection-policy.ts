import type { ResolvedWordPressContentPolicy } from '../../../core/wordpress/wordpress-content-policy';
import type { WordPressCategory, WordPressPost } from '../../../core/wordpress/wordpress-response';

/** Publicações vizinhas e sugestões de tags permanecem na coleção do artigo. */
export function readingCollection(
  post: WordPressPost,
  categories: readonly WordPressCategory[],
  policy: ResolvedWordPressContentPolicy,
): { readonly categoryIds?: readonly number[]; readonly excludedIds: readonly number[] } {
  const volumeId = policy.sanakaverseCategoryId;
  const volumeIds = categoryBranchIds(categories, volumeId === undefined ? [] : [volumeId]);
  const isVolume = volumeId !== undefined && post.categories.some((id) => volumeIds.has(id));
  return {
    categoryIds: isVolume ? [volumeId] : undefined,
    excludedIds: isVolume ? policy.excludedCategoryIds : archiveExcludedCategoryIds(policy),
  };
}

/** O arquivo geral reserva os volumes para Sanaka-loka. */
export function archiveExcludedCategoryIds(
  policy: ResolvedWordPressContentPolicy,
): readonly number[] {
  return [
    ...policy.excludedCategoryIds,
    ...(policy.sanakaverseCategoryId === undefined ? [] : [policy.sanakaverseCategoryId]),
  ];
}

export function categoryBranchIds(
  categories: readonly WordPressCategory[],
  roots: readonly number[],
): ReadonlySet<number> {
  const ids = new Set(roots);
  let previousSize: number;
  do {
    previousSize = ids.size;
    for (const category of categories) if (ids.has(category.parent)) ids.add(category.id);
  } while (ids.size !== previousSize);
  return ids;
}
