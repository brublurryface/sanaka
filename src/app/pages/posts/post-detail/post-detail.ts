import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { catchError, distinctUntilChanged, map, of, startWith, Subject, switchMap } from 'rxjs';

import { PostDetail } from '../post';
import { WordPressPostsService } from '../data-access/wordpress-posts.service';

type PostDetailState =
  | { readonly status: 'loading' }
  | { readonly status: 'success'; readonly post: PostDetail }
  | { readonly status: 'not-found' }
  | { readonly status: 'error' };

@Component({
  selector: 'app-post-detail',
  imports: [RouterLink, TranslocoPipe],
  templateUrl: './post-detail.html',
  styleUrl: './post-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PostDetailPage {
  private readonly route = inject(ActivatedRoute);
  private readonly postsService = inject(WordPressPostsService);
  private readonly transloco = inject(TranslocoService);
  private readonly pageTitle = inject(Title);
  private readonly document = inject(DOCUMENT);
  private readonly requests = new Subject<string>();
  private currentSlug = '';

  private readonly activeLanguage = toSignal(this.transloco.langChanges$, {
    initialValue: this.transloco.getActiveLang(),
  });

  readonly readingProgress = signal(0);

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
      this.activeLanguage();
      const post = this.post();
      const title = post?.title ?? this.transloco.translate('app.pageTitles.post');

      this.pageTitle.setTitle(`${title} | Sanaka`);
    });

    this.route.paramMap
      .pipe(
        map((params) => params.get('slug') ?? ''),
        distinctUntilChanged(),
        takeUntilDestroyed(),
      )
      .subscribe((slug) => {
        this.currentSlug = slug;
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
    this.requests.next(this.currentSlug);
  }
}
