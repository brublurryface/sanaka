import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { finalize } from 'rxjs';

import { SanakaverseBooksService } from './data-access/sanakaverse-books.service';
import { SanakaverseBook } from './sanakaverse-book';

@Component({
  selector: 'app-sanakaverse',
  imports: [RouterLink, TranslocoPipe],
  templateUrl: './sanakaverse.html',
  styleUrl: './sanakaverse.scss',
})
export class Sanakaverse implements OnInit {
  private readonly booksService = inject(SanakaverseBooksService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly books = signal<readonly SanakaverseBook[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly hasError = signal(false);

  ngOnInit(): void {
    this.loadBooks();
  }

  protected retry(): void {
    this.loadBooks();
  }

  private loadBooks(): void {
    this.isLoading.set(true);
    this.hasError.set(false);

    this.booksService
      .getBooks()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isLoading.set(false)),
      )
      .subscribe({
        next: (books) => this.books.set(books),
        error: () => {
          this.books.set([]);
          this.hasError.set(true);
        },
      });
  }
}
