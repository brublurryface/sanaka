import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { Posts } from './posts';

describe('Posts', () => {
  let component: Posts;
  let fixture: ComponentFixture<Posts>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Posts],
    }).compileComponents();

    fixture = TestBed.createComponent(Posts);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render one post card for each post', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const cards = compiled.querySelectorAll('app-post-card');

    expect(cards.length).toBe(component.posts.length);
  });

  it('should render the post titles', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const titles = Array.from(compiled.querySelectorAll('.post-card__title')).map((title) =>
      title.textContent?.trim(),
    );

    expect(titles).toEqual(component.posts.map((post) => post.title));
  });

  it('should wait for the debounce before filtering posts', async () => {
    vi.useFakeTimers();

    component.searchControl.setValue('maya');

    await vi.advanceTimersByTimeAsync(299);

    expect(component.filteredPosts()).toEqual(component.posts);

    await vi.advanceTimersByTimeAsync(1);

    expect(component.filteredPosts().map((post) => post.title)).toEqual(['A presença de Māyā']);
  });

  it('should ignore accents and casing when filtering posts', async () => {
    vi.useFakeTimers();

    component.searchControl.setValue('SILENCIO');

    await vi.advanceTimersByTimeAsync(300);

    expect(component.filteredPosts().map((post) => post.title)).toEqual([
      'O silêncio do santuário',
    ]);
  });

  it('should search across post title, excerpt and category', async () => {
    vi.useFakeTimers();

    component.searchControl.setValue('REFLEXOES');

    await vi.advanceTimersByTimeAsync(300);

    expect(component.filteredPosts().map((post) => post.title)).toEqual([
      'Sanaka como espaço de estudo',
      'O silêncio do santuário',
    ]);
  });

  it('should render an empty state when no posts match the search', async () => {
    vi.useFakeTimers();

    component.searchControl.setValue('conteudo inexistente');

    await vi.advanceTimersByTimeAsync(300);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelectorAll('app-post-card').length).toBe(0);
    expect(compiled.querySelector('.posts-empty')?.textContent?.trim()).toBe(
      'Nenhuma publicação encontrada.',
    );
  });
});
