import { Component, Input, OnChanges, SimpleChanges, signal } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

interface RestCodeSlide {
  readonly index: number;
  readonly fileName: string;
  readonly titleKey: string;
  readonly descriptionKey: string;
}

@Component({
  selector: 'app-rest-code-explorer',
  imports: [TranslocoPipe],
  templateUrl: './rest-code-explorer.html',
  styleUrl: './rest-code-explorer.scss',
})
export class RestCodeExplorer implements OnChanges {
  @Input({ required: true }) currentStep = 0;

  readonly activeIndex = signal(0);
  readonly slides: readonly RestCodeSlide[] = [
    {
      index: 0,
      fileName: 'rest-api-portal.ts',
      titleKey: 'matrix.rest.code.slides.action.title',
      descriptionKey: 'matrix.rest.code.slides.action.description',
    },
    {
      index: 1,
      fileName: 'nasa-images.service.ts',
      titleKey: 'matrix.rest.code.slides.request.title',
      descriptionKey: 'matrix.rest.code.slides.request.description',
    },
    {
      index: 2,
      fileName: 'rest-api-portal.ts',
      titleKey: 'matrix.rest.code.slides.stream.title',
      descriptionKey: 'matrix.rest.code.slides.stream.description',
    },
    {
      index: 3,
      fileName: 'nasa-images.service.ts',
      titleKey: 'matrix.rest.code.slides.mapping.title',
      descriptionKey: 'matrix.rest.code.slides.mapping.description',
    },
  ];

  get activeSlide(): RestCodeSlide {
    return this.slides[this.activeIndex()];
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['currentStep']) {
      this.showSlide(Math.min(Math.max(this.currentStep, 0), this.slides.length - 1));
    }
  }

  previous(): void {
    this.showSlide((this.activeIndex() - 1 + this.slides.length) % this.slides.length);
  }

  next(): void {
    this.showSlide((this.activeIndex() + 1) % this.slides.length);
  }

  showSlide(index: number): void {
    this.activeIndex.set(index);
  }
}
