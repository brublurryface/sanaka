import {
  ChangeDetectionStrategy,
  Component,
  ViewChild,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { catchError, distinctUntilChanged, map, of, startWith, Subject, switchMap } from 'rxjs';

import { PageLoading } from '../../../shared/loading-indicator/page-loading';
import type { PostDetailState } from '../post';
import { PostDate } from '../post-date';
import { bindPostDocument } from './post-document';
import { ReadingProgress } from './reading-progress';
import { SANAKA_WORDPRESS_CONTENT_LANGUAGE } from '../../../core/wordpress/wordpress-content-policy';
import { WordPressPostsService } from '../data-access/wordpress-posts.service';
import { CharacterOboloStore } from './character-obolo.store';
import { SanakaOboloDialog } from './sanaka-obolo-dialog/sanaka-obolo-dialog';
import { SanakaOboloWidget } from './sanaka-obolo-widget/sanaka-obolo-widget';

@Component({
  selector: 'app-post-detail',
  imports: [
    RouterLink,
    TranslocoPipe,
    SanakaOboloWidget,
    SanakaOboloDialog,
    PageLoading,
    PostDate,
    ReadingProgress,
  ],
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
  private readonly requests = new Subject<string>();
  private readonly currentSlug = signal('');

  readonly contentLanguage = inject(SANAKA_WORDPRESS_CONTENT_LANGUAGE);
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

  constructor() {
    bindPostDocument(this.state, this.currentSlug);

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
        this.requests.next(slug);
      });
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
