import { ComponentFixture, TestBed } from '@angular/core/testing';

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
});
