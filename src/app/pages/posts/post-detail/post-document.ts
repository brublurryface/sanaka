import { RESPONSE_INIT, effect, inject, type Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoService } from '@jsverse/transloco';
import { SanakaSeoService } from '../../../core/navigation/sanaka-seo.service';
import type { PostDetailState } from '../post';

/** Sincroniza a página canônica, a indexação e a resposta SSR com a mesma leitura do artigo. */
export function bindPostDocument(
  articleState: Signal<PostDetailState>,
  requestedSlug: Signal<string>,
): void {
  const response = inject(RESPONSE_INIT, { optional: true });
  const seo = inject(SanakaSeoService);
  const transloco = inject(TranslocoService);
  const activeLanguage = toSignal(transloco.langChanges$, {
    initialValue: transloco.getActiveLang(),
  });
  const defaultDescription = toSignal(transloco.selectTranslate('app.pageDescriptions.post'), {
    initialValue: '',
  });
  const defaultTitle = toSignal(transloco.selectTranslate('app.pageTitles.post'), {
    initialValue: 'Sanaka',
  });

  effect(() => {
    const state = articleState();
    const post = state.status === 'success' ? state.post : null;
    const slug = post?.slug ?? requestedSlug();

    if (response && state.status !== 'loading') {
      response.status = state.status === 'success' ? 200 : state.status === 'not-found' ? 404 : 503;
      const headers = new Headers(response.headers);
      headers.set(
        'Cache-Control',
        state.status === 'success' ? 'public, max-age=0, must-revalidate' : 'no-store',
      );
      if (state.status === 'error') headers.set('Retry-After', '60');
      else headers.delete('Retry-After');
      response.headers = headers;
    }

    seo.applyPage({
      pageTitle: post?.title ?? defaultTitle(),
      description: post?.excerpt ?? defaultDescription(),
      path: slug ? `/posts/${encodeURIComponent(slug)}` : '/posts',
      language: activeLanguage(),
      type: post ? 'article' : 'website',
      imageUrl: post?.coverImageUrl,
      imageAlt: post?.coverImageAlt,
      publishedAt: post?.publishedAt,
      indexable: state.status !== 'not-found',
    });
  });
}
