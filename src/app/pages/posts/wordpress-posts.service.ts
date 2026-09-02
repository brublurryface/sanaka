import { DOCUMENT } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable, InjectionToken } from '@angular/core';
import { forkJoin, map, Observable, of, switchMap, timeout } from 'rxjs';

import { Post } from './post';

export const WORDPRESS_API_URL = new InjectionToken<string>('WORDPRESS_API_URL', {
  factory: () => 'https://www.sanaka.com.br/wp-json/wp/v2',
});

interface WordPressRenderedField {
  readonly rendered: string;
}

interface WordPressPost {
  readonly id: number;
  readonly slug: string;
  readonly date: string;
  readonly title: WordPressRenderedField;
  readonly excerpt: WordPressRenderedField;
  readonly featured_media: number;
  readonly categories: readonly number[];
}

interface WordPressCategory {
  readonly id: number;
  readonly name: string;
}

interface WordPressMedia {
  readonly id: number;
  readonly source_url: string;
  readonly alt_text: string;
}

@Injectable({
  providedIn: 'root',
})
export class WordPressPostsService {
  private readonly requestTimeoutMs = 10_000;

  private readonly document = inject(DOCUMENT);
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(WORDPRESS_API_URL);

  getPosts(): Observable<readonly Post[]> {
    return this.http
      .get<readonly WordPressPost[]>(`${this.apiUrl}/posts`, {
        params: new HttpParams()
          .set('per_page', '100')
          .set('_fields', 'id,slug,date,title,excerpt,featured_media,categories'),
      })
      .pipe(
        switchMap((posts) =>
          forkJoin({
            categories: this.getCategories(),
            media: this.getMedia(posts),
          }).pipe(map(({ categories, media }) => this.mapPosts(posts, categories, media))),
        ),
        timeout({ first: this.requestTimeoutMs }),
      );
  }

  private getCategories(): Observable<readonly WordPressCategory[]> {
    return this.http.get<readonly WordPressCategory[]>(`${this.apiUrl}/categories`, {
      params: new HttpParams().set('per_page', '100').set('_fields', 'id,name'),
    });
  }

  private getMedia(posts: readonly WordPressPost[]): Observable<readonly WordPressMedia[]> {
    const mediaIds = [...new Set(posts.map((post) => post.featured_media).filter((id) => id > 0))];

    if (mediaIds.length === 0) {
      return of([]);
    }

    return this.http.get<readonly WordPressMedia[]>(`${this.apiUrl}/media`, {
      params: new HttpParams()
        .set('include', mediaIds.join(','))
        .set('per_page', String(mediaIds.length))
        .set('_fields', 'id,source_url,alt_text'),
    });
  }

  private mapPosts(
    posts: readonly WordPressPost[],
    categories: readonly WordPressCategory[],
    media: readonly WordPressMedia[],
  ): readonly Post[] {
    const categoryById = new Map(
      categories.map((category) => [category.id, this.htmlToText(category.name)]),
    );
    const mediaById = new Map(media.map((item) => [item.id, item]));

    return posts.map((post) => {
      const coverImage = mediaById.get(post.featured_media);
      const category = post.categories
        .map((categoryId) => categoryById.get(categoryId))
        .filter((name): name is string => Boolean(name))
        .join(' · ');

      return {
        id: post.id,
        slug: post.slug,
        title: this.htmlToText(post.title.rendered),
        excerpt: this.htmlToText(post.excerpt.rendered),
        publishedAt: post.date.slice(0, 10),
        category,
        coverImageUrl: coverImage?.source_url,
        coverImageAlt: coverImage?.alt_text,
      };
    });
  }

  private htmlToText(html: string): string {
    const container = this.document.createElement('div');

    container.innerHTML = html.replace(/<\/(?:p|div|blockquote|li|h[1-6])>/gi, ' ');

    return (container.textContent ?? '').replace(/\s+/g, ' ').trim();
  }
}
