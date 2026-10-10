export interface Post {
  readonly id: number;
  readonly slug: string;
  readonly title: string;
  readonly excerpt: string;
  readonly publishedAt: string;
  readonly category: string;
  readonly coverImageUrl?: string;
  readonly coverImageAlt?: string;
}

export interface PostTaxonomy {
  readonly id: number;
  readonly name: string;
  readonly slug: string;
}

export interface PostNavigation {
  readonly slug: string;
  readonly title: string;
}

/** Identidade e artes do óbolo associado a uma personagem do Sanakaverse. */
export interface CharacterObolo {
  readonly characterSlug: string;
  readonly characterName: string;
  readonly frontImageUrl: string;
  readonly backImageUrl?: string;
}

export interface PostDetail extends Post {
  readonly contentHtml: string;
  readonly categories: readonly PostTaxonomy[];
  readonly relatedCategories: readonly PostTaxonomy[];
  readonly exploreCategories: readonly PostTaxonomy[];
  readonly tags: readonly PostTaxonomy[];
  readonly exploreTags: readonly PostTaxonomy[];
  readonly readingMinutes: number;
  readonly obolo?: CharacterObolo;
  readonly previous?: PostNavigation;
  readonly next?: PostNavigation;
}
