import { signal } from '@angular/core';

export interface CodeExplorerSlide {
  readonly index: number;
  readonly fileName: string;
  readonly titleKey: string;
  readonly descriptionKey: string;
}

/** Compartilha apenas o estado e a navegação comuns aos exploradores de código da Matrix. */
export abstract class CodeExplorerController<TSlide extends CodeExplorerSlide> {
  readonly activeIndex = signal(0);

  abstract readonly slides: readonly TSlide[];

  get activeSlide(): TSlide {
    return this.slides[this.activeIndex()];
  }

  previous(): void {
    this.showSlide((this.activeIndex() - 1 + this.slides.length) % this.slides.length);
  }

  next(): void {
    this.showSlide((this.activeIndex() + 1) % this.slides.length);
  }

  showSlide(index: number): void {
    const boundedIndex = Math.min(Math.max(index, 0), this.slides.length - 1);
    this.activeIndex.set(boundedIndex);
  }
}
