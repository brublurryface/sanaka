import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { finalize } from 'rxjs';

import { LoadingIndicator } from '../../shared/loading-indicator/loading-indicator';
import { PageLoading } from '../../shared/loading-indicator/page-loading';
import { SanakaverseBooksService } from './data-access/sanakaverse-books.service';
import { SanakaverseBook } from './sanakaverse-book';

@Component({
  selector: 'app-sanakaverse',
  imports: [RouterLink, TranslocoPipe, LoadingIndicator, PageLoading],
  templateUrl: './sanakaverse.html',
  styleUrl: './sanakaverse.scss',
})
export class Sanakaverse implements OnInit {
  private readonly booksService = inject(SanakaverseBooksService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly books = signal<readonly SanakaverseBook[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly hasError = signal(false);
  protected readonly isLoadingMore = signal(false);
  protected readonly hasLoadMoreError = signal(false);
  protected readonly total = signal(0);
  private readonly currentPage = signal(0);
  private readonly totalPages = signal(0);
  protected readonly hasMore = computed(() => this.currentPage() < this.totalPages());

  ngOnInit(): void {
    this.loadBooks();
  }

  protected retry(): void {
    if (!this.isLoading() && !this.isLoadingMore()) this.loadBooks();
  }

  protected loadMore(): void {
    if (this.isLoading() || this.isLoadingMore() || !this.hasMore()) return;
    this.loadBooks(this.currentPage() + 1, true);
  }

  private loadBooks(page = 1, append = false): void {
    this.isLoading.set(!append);
    this.isLoadingMore.set(append);
    this.hasError.set(false);
    this.hasLoadMoreError.set(false);

    this.booksService
      .getBooks(page)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.isLoading.set(false);
          this.isLoadingMore.set(false);
        }),
      )
      .subscribe({
        next: (result) => {
          const books =
            append && result.total > 0 ? [...this.books(), ...result.books] : result.books;
          this.books.set([...new Map(books.map((book) => [book.id, book])).values()]);
          this.currentPage.set(result.page);
          this.total.set(result.total);
          this.totalPages.set(result.totalPages);
        },
        error: () => {
          if (append) this.hasLoadMoreError.set(true);
          else {
            this.books.set([]);
            this.hasError.set(true);
          }
        },
      });
  }
}
