import { DOCUMENT } from '@angular/common';
import { inject, Injectable } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

const SANAKA_ORIGIN = 'https://sanaka.com.br';
const DEFAULT_SOCIAL_IMAGE = `${SANAKA_ORIGIN}/images/home/sanctuary-hero.png`;

export interface SanakaPageSeo {
  readonly pageTitle: string;
  readonly description: string;
  readonly path: string;
  readonly language: string;
  readonly type?: 'article' | 'website';
  readonly imageUrl?: string;
  readonly imageAlt?: string;
  readonly publishedAt?: string;
  readonly indexable?: boolean;
}

/** Mantém os metadados da página alinhados entre navegação no navegador e renderização no servidor. */
@Injectable({ providedIn: 'root' })
export class SanakaSeoService {
  private readonly document = inject(DOCUMENT);
  private readonly meta = inject(Meta);
  private readonly title = inject(Title);

  applyPage(page: SanakaPageSeo): void {
    const documentTitle = this.formatDocumentTitle(page.pageTitle);
    const canonicalUrl = this.canonicalUrl(page.path);
    const imageUrl = this.absoluteUrl(page.imageUrl ?? DEFAULT_SOCIAL_IMAGE);
    const language = page.language === 'en' ? 'en' : 'pt-BR';
    const locale = language === 'en' ? 'en_US' : 'pt_BR';
    const type = page.type ?? 'website';

    this.document.documentElement.lang = language;
    this.title.setTitle(documentTitle);
    this.updateCanonical(canonicalUrl);

    this.updateNamedMeta('description', page.description);
    this.updateNamedMeta(
      'robots',
      page.indexable === false ? 'noindex, nofollow' : 'index, follow',
    );
    this.updateNamedMeta('twitter:card', 'summary_large_image');
    this.updateNamedMeta('twitter:title', documentTitle);
    this.updateNamedMeta('twitter:description', page.description);
    this.updateNamedMeta('twitter:image', imageUrl);

    this.updatePropertyMeta('og:site_name', 'Sanaka');
    this.updatePropertyMeta('og:title', documentTitle);
    this.updatePropertyMeta('og:description', page.description);
    this.updatePropertyMeta('og:type', type);
    this.updatePropertyMeta('og:url', canonicalUrl);
    this.updatePropertyMeta('og:locale', locale);
    this.updatePropertyMeta('og:image', imageUrl);
    this.updatePropertyMeta('og:image:alt', page.imageAlt ?? 'Sanaka');

    if (type === 'article' && page.publishedAt) {
      this.updatePropertyMeta('article:published_time', page.publishedAt);
    } else {
      this.meta.removeTag("property='article:published_time'");
    }
  }

  private formatDocumentTitle(pageTitle: string): string {
    return pageTitle === 'Sanaka' ? pageTitle : `${pageTitle} | Sanaka`;
  }

  private canonicalUrl(path: string): string {
    const url = new URL(path || '/', SANAKA_ORIGIN);
    const pathname = url.pathname === '/' ? '/' : url.pathname.replace(/\/+$/, '');

    return `${SANAKA_ORIGIN}${pathname}`;
  }

  private absoluteUrl(url: string): string {
    return new URL(url, SANAKA_ORIGIN).toString();
  }

  private updateCanonical(url: string): void {
    let canonical = this.document.head.querySelector<HTMLLinkElement>("link[rel='canonical']");

    if (!canonical) {
      canonical = this.document.createElement('link');
      canonical.rel = 'canonical';
      this.document.head.appendChild(canonical);
    }

    canonical.href = url;
  }

  private updateNamedMeta(name: string, content: string): void {
    this.meta.updateTag({ name, content }, `name='${name}'`);
  }

  private updatePropertyMeta(property: string, content: string): void {
    this.meta.updateTag({ property, content }, `property='${property}'`);
  }
}
