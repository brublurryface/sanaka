import { Location } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { PageLoadingState } from './page-loading-state';

describe('PageLoadingState', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideRouter([])] }));

  it('should hide the initial client shell before the first navigation starts', () => {
    const router = TestBed.inject(Router);
    router.resetConfig([{ path: 'waiting', data: { initialLoading: true }, children: [] }]);
    TestBed.inject(Location).go('/waiting?source=direct');

    const state = TestBed.inject(PageLoadingState);
    expect(state.current()).toBeNull();
    expect(state.active()).toBe(true);
  });

  it('should not leave a navigation hold in server-rendered HTML', () => {
    TestBed.overrideProvider(PLATFORM_ID, { useValue: 'server' });
    expect(TestBed.inject(PageLoadingState).active()).toBe(false);
  });

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
