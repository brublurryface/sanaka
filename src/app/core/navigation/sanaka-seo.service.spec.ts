import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { Meta, Title } from '@angular/platform-browser';

import { SanakaSeoService } from './sanaka-seo.service';

describe('SanakaSeoService', () => {
  let document: Document;
  let meta: Meta;
  let service: SanakaSeoService;
  let title: Title;

  beforeEach(() => {
    TestBed.configureTestingModule({});

    document = TestBed.inject(DOCUMENT);
    meta = TestBed.inject(Meta);
    service = TestBed.inject(SanakaSeoService);
    title = TestBed.inject(Title);

    document.head.querySelector("link[rel='canonical']")?.remove();
    document.head.querySelectorAll('meta').forEach((element) => element.remove());
  });

  it('should apply canonical and social metadata for a regular page', () => {
    service.applyPage({
      pageTitle: 'Matrix on-line',
      description: 'Observe o Angular em movimento.',
      path: '/matrix?origem=teste#circuitos',
      language: 'pt-BR',
    });

    expect(title.getTitle()).toBe('Matrix on-line | Sanaka');
    expect(document.documentElement.lang).toBe('pt-BR');
    expect(document.querySelector<HTMLLinkElement>("link[rel='canonical']")?.href).toBe(
      'https://sanaka.com.br/matrix',
    );
    expect(meta.getTag("name='description'")?.content).toBe('Observe o Angular em movimento.');
    expect(meta.getTag("name='robots'")?.content).toBe('index, follow');
    expect(meta.getTag("property='og:type'")?.content).toBe('website');
    expect(meta.getTag("property='og:url'")?.content).toBe('https://sanaka.com.br/matrix');
    expect(meta.getTag("property='og:locale'")?.content).toBe('pt_BR');
    expect(meta.getTag("name='twitter:card'")?.content).toBe('summary_large_image');
  });

  it('should expose publication metadata and remove it on the next regular page', () => {
    service.applyPage({
      pageTitle: 'VOCÊ',
      description: 'Quem é você?',
      path: '/posts/voce',
      language: 'en',
      type: 'article',
      imageUrl: 'https://images.example/voce.webp',
      imageAlt: 'Māyā diante de um livro',
      publishedAt: '2026-09-22',
    });

    expect(document.documentElement.lang).toBe('en');
    expect(meta.getTag("property='og:type'")?.content).toBe('article');
    expect(meta.getTag("property='og:image'")?.content).toBe('https://images.example/voce.webp');
    expect(meta.getTag("property='og:image:alt'")?.content).toBe('Māyā diante de um livro');
    expect(meta.getTag("property='article:published_time'")?.content).toBe('2026-09-22');

    service.applyPage({
      pageTitle: 'Sanaka',
      description: 'Santuário de conhecimento e consciência.',
      path: '/',
      language: 'pt-BR',
      indexable: false,
    });

    expect(title.getTitle()).toBe('Sanaka');
    expect(meta.getTag("name='robots'")?.content).toBe('noindex, nofollow');
    expect(meta.getTag("property='article:published_time'")).toBeNull();
  });
});
