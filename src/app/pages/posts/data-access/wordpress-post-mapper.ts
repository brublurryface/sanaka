import { Injectable, SecurityContext, inject } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import type {
  WordPressCategory,
  WordPressMedia,
  WordPressPost,
  WordPressPostReference,
  WordPressTag,
} from '../../../core/wordpress/wordpress-response';
import { WordPressTextService } from '../../../core/wordpress/wordpress-text.service';
import type { CharacterObolo, Post, PostNavigation, PostTaxonomy } from '../post';

/** Converte DTOs já validados nos modelos de leitura do Sanaka. */
@Injectable({ providedIn: 'root' })
export class WordPressPostMapper {
  private readonly wordpressText = inject(WordPressTextService);
  private readonly sanitizer = inject(DomSanitizer);

  summary(post: WordPressPost, categories: readonly WordPressCategory[]): Post {
    return { ...this.postFields(post, false), ...this.categoryFields(post, categories) };
  }

  /** O corpo chega com o artigo e é sanitizado uma única vez para essa resposta do CMS. */
  articleContent(post: WordPressPost) {
    const html = post.content?.rendered ?? '';
    const text = this.wordpressText.toText(html);
    return {
      ...this.postFields(post, true),
      contentHtml: this.sanitizer.sanitize(SecurityContext.HTML, html) ?? '',
      readingMinutes: Math.max(1, Math.ceil(text.split(/\s+/).filter(Boolean).length / 200)),
      obolo: this.mapCharacterObolo(post),
    };
  }

  articleTaxonomies(
    post: WordPressPost,
    categories: readonly WordPressCategory[],
    tags: readonly WordPressTag[],
    exploreTags: readonly WordPressTag[],
    excludedIds: ReadonlySet<number>,
  ) {
    const ancestry = this.categoryFields(post, categories);
    const rootCategory = ancestry.categories[0];
    const selectedCategoryIds = new Set(post.categories);
    const selectedTagIds = new Set(post.tags ?? []);
    const mappedTags = [...new Map(tags.map((tag) => [tag.id, this.toTaxonomy(tag)])).values()];
    return {
      ...ancestry,
      relatedCategories: rootCategory
        ? categories
            .filter(
              (category) =>
                category.parent === rootCategory.id &&
                !selectedCategoryIds.has(category.id) &&
                !excludedIds.has(category.id),
            )
            .map((category) => this.toTaxonomy(category))
        : [],
      exploreCategories: categories
        .filter(
          (category) =>
            category.parent === 0 &&
            category.id !== rootCategory?.id &&
            !excludedIds.has(category.id),
        )
        .map((category) => this.toTaxonomy(category)),
      tags: mappedTags.filter((tag) => selectedTagIds.has(tag.id)),
      exploreTags: [...new Map(exploreTags.map((tag) => [tag.id, this.toTaxonomy(tag)])).values()],
    };
  }

  navigation(post: WordPressPostReference): PostNavigation {
    return { slug: post.slug, title: this.wordpressText.toText(post.title.rendered) };
  }

  private postFields(post: WordPressPost, detail: boolean): Omit<Post, 'category' | 'categories'> {
    const cover = post._embedded?.['wp:featuredmedia']?.find(
      (media) => media.id === post.featured_media,
    );
    return {
      id: post.id,
      ...this.navigation(post),
      excerpt: this.wordpressText.toText(post.excerpt.rendered),
      publishedAt: post.date.slice(0, 10),
      coverImageUrl:
        this.getCoverImageUrl(cover, detail) ??
        (detail ? '/images/posts/posts-atmosphere-desktop.webp' : undefined),
      coverImageAlt: cover?.alt_text ?? (detail ? '' : undefined),
    };
  }

  private categoryFields(post: WordPressPost, categories: readonly WordPressCategory[]) {
    const lineage = this.mapTaxonomies(post.categories, categories);
    return { categories: lineage, category: lineage.map((item) => item.name).join(' · ') };
  }

  /** Só expõe o óbolo quando o conjunto mínimo de metadados está completo no WordPress. */
  private mapCharacterObolo(post: WordPressPost): CharacterObolo | undefined {
    const characterSlug = post.sanaka_character_slug?.trim();
    const characterName = post.sanaka_character_name?.trim();
    const frontImageUrl = post.sanaka_obolo_front?.trim();
    const backImageUrl = post.sanaka_obolo_back?.trim();

    if (!characterSlug || !characterName || !frontImageUrl) {
      return undefined;
    }

    return {
      characterSlug,
      characterName,
      frontImageUrl,
      backImageUrl: backImageUrl || undefined,
    };
  }

  private mapTaxonomies(
    selectedIds: readonly number[],
    categories: readonly WordPressCategory[],
  ): readonly PostTaxonomy[] {
    const categoryById = new Map(categories.map((category) => [category.id, category]));
    const ordered: WordPressCategory[] = [];

    for (const selectedId of selectedIds) {
      const lineage: WordPressCategory[] = [];
      let current = categoryById.get(selectedId);

      while (current) {
        lineage.unshift(current);
        current = current.parent > 0 ? categoryById.get(current.parent) : undefined;
      }

      for (const category of lineage) {
        if (!ordered.some((item) => item.id === category.id)) {
          ordered.push(category);
        }
      }
    }

    return ordered.map((category) => this.toTaxonomy(category));
  }

  toTaxonomy(item: WordPressCategory | WordPressTag): PostTaxonomy {
    return {
      id: item.id,
      name: this.wordpressText.toText(item.name),
      slug: item.slug,
    };
  }

  private getCoverImageUrl(
    coverImage: WordPressMedia | undefined,
    useOriginalImage: boolean,
  ): string | undefined {
    if (!coverImage) {
      return undefined;
    }

    if (useOriginalImage) {
      return coverImage.source_url;
    }

    const sizes = coverImage.media_details?.sizes;

    return (
      sizes?.['medium_large']?.source_url ?? sizes?.['large']?.source_url ?? coverImage.source_url
    );
  }
}
