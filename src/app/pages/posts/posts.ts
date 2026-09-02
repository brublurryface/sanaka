import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  map,
  of,
  startWith,
  Subject,
  switchMap,
} from 'rxjs';

import { Post } from './post';
import { PostCard } from './post-card/post-card';
import { WordPressPostsService } from './wordpress-posts.service';

interface PostsState {
  readonly status: 'loading' | 'success' | 'error';
  readonly posts: readonly Post[];
}

@Component({
  imports: [ReactiveFormsModule, PostCard, TranslocoPipe],
  selector: 'app-posts',
  styleUrl: './posts.scss',
  templateUrl: './posts.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Posts {
  private readonly postsService = inject(WordPressPostsService);
  private readonly reloadPosts = new Subject<void>();

  private readonly state = toSignal(
    this.reloadPosts.pipe(
      startWith(undefined),
      switchMap(() =>
        this.postsService.getPosts().pipe(
          map((posts): PostsState => ({
            status: 'success',
            posts,
          })),
          startWith<PostsState>({
            status: 'loading',
            posts: [],
          }),
          catchError(() =>
            of<PostsState>({
              status: 'error',
              posts: [],
            }),
          ),
        ),
      ),
    ),
    {
      initialValue: {
        status: 'loading',
        posts: [],
      } satisfies PostsState,
    },
  );

  readonly searchControl = new FormControl('', {
    nonNullable: true,
  });

  private readonly searchTerm = toSignal(
    this.searchControl.valueChanges.pipe(
      startWith(this.searchControl.value),
      debounceTime(300),
      map((term) => this.normalizeSearchValue(term)),
      distinctUntilChanged(),
    ),
    {
      initialValue: '',
    },
  );

  readonly posts = computed(() => this.state().posts);
  readonly isLoading = computed(() => this.state().status === 'loading');
  readonly hasError = computed(() => this.state().status === 'error');
  readonly filteredPosts = computed(() => this.filterPosts(this.searchTerm(), this.posts()));

  private readonly syncSearchAvailability = effect(() => {
    if (this.isLoading()) {
      this.searchControl.disable({ emitEvent: false });
      return;
    }

    this.searchControl.enable({ emitEvent: false });
  });

  retry(): void {
    this.reloadPosts.next();
  }

  private filterPosts(term: string, posts: readonly Post[]): readonly Post[] {
    if (!term) {
      return posts;
    }

    return posts.filter((post) =>
      [post.title, post.excerpt, post.category].some((value) =>
        this.normalizeSearchValue(value).includes(term),
      ),
    );
  }

  private normalizeSearchValue(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLocaleLowerCase('pt-BR');
  }
}
