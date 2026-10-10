import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  ViewChild,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { catchError, distinctUntilChanged, map, of, startWith, Subject, switchMap } from 'rxjs';

import { PostDetail } from '../post';
import { SanakaSeoService } from '../../../core/navigation/sanaka-seo.service';
import { WordPressPostsService } from '../data-access/wordpress-posts.service';
import { CharacterOboloStore } from './character-obolo.store';
import { SanakaOboloDialog } from './sanaka-obolo-dialog/sanaka-obolo-dialog';
import { SanakaOboloWidget } from './sanaka-obolo-widget/sanaka-obolo-widget';

type PostDetailState =
  | { readonly status: 'loading' }
  | { readonly status: 'success'; readonly post: PostDetail }
  | { readonly status: 'not-found' }
  | { readonly status: 'error' };

@Component({
  selector: 'app-post-detail',
  imports: [RouterLink, TranslocoPipe, SanakaOboloWidget, SanakaOboloDialog],
  templateUrl: './post-detail.html',
  styleUrl: './post-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [CharacterOboloStore],
})
export class PostDetailPage {
  @ViewChild(SanakaOboloDialog) private oboloDialog?: SanakaOboloDialog;

  private readonly route = inject(ActivatedRoute);
  private readonly postsService = inject(WordPressPostsService);
  private readonly oboloStore = inject(CharacterOboloStore);
  private readonly seo = inject(SanakaSeoService);
  private readonly transloco = inject(TranslocoService);
  private readonly document = inject(DOCUMENT);
  private readonly requests = new Subject<string>();
  private readonly currentSlug = signal('');

  private readonly activeLanguage = toSignal(this.transloco.langChanges$, {
    initialValue: this.transloco.getActiveLang(),
  });
  private readonly defaultDescription = toSignal(
    this.transloco.selectTranslate('app.pageDescriptions.post'),
    { initialValue: '' },
  );
  private readonly defaultTitle = toSignal(this.transloco.selectTranslate('app.pageTitles.post'), {
    initialValue: 'Sanaka',
  });

  readonly readingProgress = signal(0);
  readonly oboloState = this.oboloStore.state;

  readonly state = toSignal(
    this.requests.pipe(
      switchMap((slug) =>
        this.postsService.getPostBySlug(slug).pipe(
          map((post): PostDetailState =>
            post ? { status: 'success', post } : { status: 'not-found' },
          ),
          startWith<PostDetailState>({ status: 'loading' }),
          catchError(() => of<PostDetailState>({ status: 'error' })),
        ),
      ),
    ),
    { initialValue: { status: 'loading' } as PostDetailState },
  );

  readonly post = computed(() => {
    const state = this.state();
    return state.status === 'success' ? state.post : null;
  });

  readonly formattedPublishedAt = computed(() => {
    const publishedAt = this.post()?.publishedAt;

    if (!publishedAt) {
      return '';
    }

    const [year, month, day] = publishedAt.split('-').map(Number);

    return new Intl.DateTimeFormat(this.activeLanguage(), {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(Date.UTC(year, month - 1, day)));
  });

  constructor() {
    effect(() => {
      const state = this.state();
      const post = state.status === 'success' ? state.post : null;
      const slug = post?.slug ?? this.currentSlug();

      this.seo.applyPage({
        pageTitle: post?.title ?? this.defaultTitle(),
        description: post?.excerpt ?? this.defaultDescription(),
        path: slug ? `/posts/${encodeURIComponent(slug)}` : '/posts',
        language: this.activeLanguage(),
        type: post ? 'article' : 'website',
        imageUrl: post?.coverImageUrl,
        imageAlt: post?.coverImageAlt,
        publishedAt: post?.publishedAt,
        indexable: state.status !== 'not-found' && state.status !== 'error',
      });
    });

    effect(() => {
      this.oboloStore.setCharacter(this.post()?.obolo?.characterSlug);
    });

    this.route.paramMap
      .pipe(
        map((params) => params.get('slug') ?? ''),
        distinctUntilChanged(),
        takeUntilDestroyed(),
      )
      .subscribe((slug) => {
        this.currentSlug.set(slug);
        this.readingProgress.set(0);
        this.requests.next(slug);
      });
  }

  @HostListener('window:scroll')
  @HostListener('window:resize')
  updateReadingProgress(): void {
    const article = this.document.getElementById('post-reading-nave');
    const window = this.document.defaultView;

    if (!article || !window) {
      return;
    }

    const scrollTop = window.scrollY || this.document.documentElement.scrollTop;
    const start = article.getBoundingClientRect().top + scrollTop;
    const end = start + article.scrollHeight - window.innerHeight;
    const distance = Math.max(end - start, 1);
    const progress = ((scrollTop - start) / distance) * 100;

    this.readingProgress.set(Math.min(100, Math.max(0, Math.round(progress))));
  }

  retry(): void {
    this.requests.next(this.currentSlug());
  }

  openOboloPanel(trigger: HTMLElement): void {
    this.oboloDialog?.open(trigger);
  }

  retryObolo(): void {
    this.oboloStore.retry();
  }

  offerObolo(): void {
    this.oboloStore.offer();
  }
}
