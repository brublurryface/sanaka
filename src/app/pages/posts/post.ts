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
