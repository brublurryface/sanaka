import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, NavigationEnd, Router, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { debounceTime, distinctUntilChanged, filter, map } from 'rxjs';

import { LoadingIndicator } from '../../shared/loading-indicator/loading-indicator';
import { PostCard } from './post-card/post-card';
import { NewsletterSignup } from './newsletter-signup/newsletter-signup';
import { PostsStore, PostsViewMode } from './posts.store';

@Component({
  imports: [
    ReactiveFormsModule,
    RouterLink,
    PostCard,
    NewsletterSignup,
    TranslocoPipe,
    LoadingIndicator,
  ],
  selector: 'app-posts',
  styleUrl: './posts.scss',
  templateUrl: './posts.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Posts {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly store = inject(PostsStore);

  readonly searchControl = new FormControl(this.store.search(), {
    nonNullable: true,
  });
  readonly categoryControl = new FormControl('', { nonNullable: true });
  readonly subcategoryControl = new FormControl('', { nonNullable: true });

  readonly rootCategories = this.store.rootCategories;
  readonly subcategories = this.store.subcategories;
  readonly activeCategories = this.store.activeCategories;
  readonly selectedRootCategory = this.store.selectedRootCategory;
  readonly selectedTagSlug = this.store.selectedTagSlug;
  readonly hasActiveFilters = this.store.hasActiveFilters;
  readonly isLoadingCategories = this.store.isLoadingCategories;
  readonly hasCategoriesError = this.store.hasCategoriesError;

  readonly posts = this.store.posts;
  readonly total = this.store.total;
  readonly totalPages = this.store.totalPages;
  readonly isLoading = this.store.isLoading;
  readonly hasError = this.store.hasError;
  readonly isLoadingMore = this.store.isLoadingMore;
  readonly hasLoadMoreError = this.store.hasLoadMoreError;
  readonly hasMore = this.store.hasMore;
  readonly pageNumbers = this.store.pageNumbers;
  readonly paginationItems = this.store.paginationItems;
  readonly viewMode = this.store.viewMode;
  readonly currentPage = this.store.currentPage;

  constructor() {
    this.activateRoute();

    effect(() => {
      this.categoryControl.setValue(this.store.selectedRootCategory()?.slug ?? '', {
        emitEvent: false,
      });
      this.subcategoryControl.setValue(this.store.selectedSubcategory()?.slug ?? '', {
        emitEvent: false,
      });
      const unavailable = this.isLoadingCategories() || this.hasCategoriesError();
      if (unavailable) {
        this.categoryControl.disable({ emitEvent: false });
      } else {
        this.categoryControl.enable({ emitEvent: false });
      }
      if (unavailable || this.subcategories().length === 0) {
        this.subcategoryControl.disable({ emitEvent: false });
      } else {
        this.subcategoryControl.enable({ emitEvent: false });
      }
    });

    this.categoryControl.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((slug) => this.store.setCategory(slug));
    this.subcategoryControl.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((slug) => this.store.setCategory(slug || this.selectedRootCategory()?.slug || ''));

    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.activateRoute());

    this.searchControl.valueChanges
      .pipe(
        map((term) => term.trim()),
        debounceTime(300),
        distinctUntilChanged(),
        takeUntilDestroyed(),
      )
      .subscribe((search) => this.store.setSearch(search));
  }

  private activateRoute(): void {
    this.store.activateRoute(
      this.route.snapshot.data['view'],
      this.route.snapshot.paramMap.get('page'),
      this.route.snapshot.queryParamMap.get('category'),
      this.route.snapshot.queryParamMap.get('tag'),
    );
  }

  setViewMode(mode: PostsViewMode): void {
    this.store.setViewMode(mode);
  }

  clearSearch(input: HTMLInputElement): void {
    this.searchControl.setValue('');
    input.focus();
  }

  removeCategory(slug: string, input: HTMLSelectElement): void {
    this.store.removeCategory(slug);
    input.focus();
  }

  removeTag(input: HTMLSelectElement): void {
    this.store.removeTag();
    input.focus();
  }

  clearFilters(input: HTMLSelectElement): void {
    this.store.clearFilters();
    input.focus();
  }

  retryCategories(): void {
    this.store.retryCategories();
    if (this.hasError()) {
      this.store.retry();
    }
  }

  loadMore(): void {
    this.store.loadMore();
  }

  goToPage(page: number): void {
    this.store.goToPage(page);
  }

  previousPage(): void {
    this.store.previousPage();
  }

  nextPage(): void {
    this.store.nextPage();
  }

  retry(): void {
    this.store.retry();
  }
}
