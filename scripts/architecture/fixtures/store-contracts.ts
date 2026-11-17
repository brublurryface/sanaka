// Compile-only regression: never execute store commands from this fixture.
import type { Signal } from '@angular/core';
import type { PostsStore, PostsViewMode } from '../../../src/app/pages/posts/posts.store';
import type {
  CharacterOboloStore,
  OboloViewState,
} from '../../../src/app/pages/posts/post-detail/character-obolo.store';

export function storeContracts(posts: PostsStore, obolos: CharacterOboloStore): void {
  const page: Signal<number> = posts.currentPage;
  const mode: Signal<PostsViewMode> = posts.viewMode;
  const counter: Signal<OboloViewState> = obolos.state;
  void [page, mode, counter];

  // @ts-expect-error Public page state must not expose a writer.
  posts.currentPage.set(2);
  // @ts-expect-error Public view state must not expose a writer.
  posts.viewMode.update(() => 'paged');
  // @ts-expect-error The writable page signal belongs to the store.
  posts.currentPageState.set(2);
  // @ts-expect-error The writable mode signal belongs to the store.
  posts.viewModeState.set('paged');
  // @ts-expect-error Public counter state must not expose a writer.
  obolos.state.set({ status: 'success', total: 999 });
  // @ts-expect-error The writable counter signal belongs to the store.
  obolos.viewState.set({ status: 'success', total: 999 });
  // @ts-expect-error Counter fields are readonly too.
  obolos.state().total = 999;

  posts.activateRoute('paged', '2');
  posts.setViewMode('paged');
  posts.goToPage(2);
  posts.setSearch('presença');
  obolos.setCharacter('nandini');
  obolos.retry();
  obolos.offer();
}
