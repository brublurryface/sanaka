import { TestBed } from '@angular/core/testing';

import { PageLoadingState } from './page-loading-state';

describe('PageLoadingState', () => {
  it('should remain busy for the current page when an older request is cancelled', () => {
    const state = TestBed.inject(PageLoadingState);
    const finishPosts = state.begin({ variant: 'vasuki', labelKey: 'posts.loading' });
    const article = { variant: 'maninaga', labelKey: 'posts.detail.loading' } as const;
    const finishArticle = state.begin(article);

    finishPosts();
    finishPosts();
    expect(state.current()).toEqual(article);

    finishArticle();
    expect(state.current()).toBeNull();
  });

  it('should restore another pending owner instead of clearing the screen prematurely', () => {
    const state = TestBed.inject(PageLoadingState);
    const books = { variant: 'sabala', labelKey: 'sanakaverse.loading' } as const;
    const finishBooks = state.begin(books);
    const finishPuzzle = state.begin({ variant: 'samvit', labelKey: 'about.puzzle.loading' });

    finishPuzzle();
    expect(state.current()).toEqual(books);
    finishBooks();
    expect(state.current()).toBeNull();
  });
});
