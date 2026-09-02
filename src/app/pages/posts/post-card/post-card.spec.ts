import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  Translation,
  TranslocoLoader,
  TranslocoService,
  provideTransloco,
} from '@jsverse/transloco';
import { of } from 'rxjs';

import { Post } from '../post';
import { PostCard } from './post-card';

class MockTranslocoLoader implements TranslocoLoader {
  getTranslation(lang: string) {
    const translations: Record<string, Translation> = {
      'pt-BR': {},
      en: {},
    };

    return of(translations[lang] ?? {});
  }
}

describe('PostCard', () => {
  let component: PostCard;
  let fixture: ComponentFixture<PostCard>;
  let transloco: TranslocoService;

  const post: Post = {
    id: 1,
    slug: 'despertando-a-maya',
    title: 'Despertando a Māyā',
    excerpt: 'Uma jornada de presença e renovação.',
    publishedAt: '2026-08-28',
    category: 'Ritual',
    coverImageUrl: '/images/home/hero.jpg',
    coverImageAlt: 'Pessoa meditando em silêncio',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PostCard],
      providers: [
        provideTransloco({
          config: {
            availableLangs: ['pt-BR', 'en'],
            defaultLang: 'pt-BR',
            fallbackLang: 'pt-BR',
            reRenderOnLangChange: true,
          },
          loader: MockTranslocoLoader,
        }),
      ],
    }).compileComponents();

    transloco = TestBed.inject(TranslocoService);
    transloco.setActiveLang('pt-BR');

    fixture = TestBed.createComponent(PostCard);
    component = fixture.componentInstance;

    fixture.componentRef.setInput('post', post);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render the post metadata and content', () => {
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('.post-card__category')?.textContent?.trim()).toBe('Ritual');

    expect(compiled.querySelector('.post-card__title')?.textContent?.trim()).toBe(
      'Despertando a Māyā',
    );

    expect(compiled.querySelector('.post-card__excerpt')?.textContent?.trim()).toBe(
      'Uma jornada de presença e renovação.',
    );
  });

  it('should preserve the ISO publication date in the datetime attribute', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const time = compiled.querySelector('time');

    expect(time?.getAttribute('datetime')).toBe('2026-08-28');
  });

  it('should format the publication date for pt-BR without changing the calendar day', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const text = compiled.querySelector('time')?.textContent?.trim() ?? '';

    expect(text).toContain('28');
    expect(text.toLocaleLowerCase('pt-BR')).toContain('ago');
    expect(text).toContain('2026');
  });

  it('should reformat the publication date when the language changes to English', () => {
    transloco.setActiveLang('en');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const text = compiled.querySelector('time')?.textContent?.trim() ?? '';

    expect(text).toContain('Aug');
    expect(text).toContain('28');
    expect(text).toContain('2026');
  });

  it('should render the cover image when coverImageUrl is provided', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const image = compiled.querySelector('img');

    expect(image).toBeTruthy();
    expect(image?.getAttribute('src')).toBe('/images/home/hero.jpg');
    expect(image?.getAttribute('alt')).toBe('Pessoa meditando em silêncio');
  });

  it('should not render the image when coverImageUrl is missing', () => {
    fixture.componentRef.setInput('post', {
      ...post,
      coverImageUrl: undefined,
      coverImageAlt: undefined,
    });

    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('img')).toBeNull();
  });
});
