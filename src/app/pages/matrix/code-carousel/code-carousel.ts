import { Component, Input, OnChanges, SimpleChanges, signal } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

interface CodeSlide {
  readonly index: number;
  readonly fileName: string;
  readonly language: 'TypeScript' | 'HTML';
  readonly titleKey: string;
  readonly descriptionKey: string;
}

@Component({
  selector: 'app-matrix-code-carousel',
  imports: [TranslocoPipe],
  templateUrl: './code-carousel.html',
  styleUrl: './code-carousel.scss',
})
export class MatrixCodeCarousel implements OnChanges {
  @Input({ required: true }) currentStep = 1;

  readonly activeIndex = signal(0);
  readonly slides: readonly CodeSlide[] = [
    {
      index: 0,
      fileName: 'matrix.ts',
      language: 'TypeScript',
      titleKey: 'matrix.exhibit.code.slides.parent.title',
      descriptionKey: 'matrix.exhibit.code.slides.parent.description',
    },
    {
      index: 1,
      fileName: 'matrix.html',
      language: 'HTML',
      titleKey: 'matrix.exhibit.code.slides.binding.title',
      descriptionKey: 'matrix.exhibit.code.slides.binding.description',
    },
    {
      index: 2,
      fileName: 'message-node.ts',
      language: 'TypeScript',
      titleKey: 'matrix.exhibit.code.slides.child.title',
      descriptionKey: 'matrix.exhibit.code.slides.child.description',
    },
    {
      index: 3,
      fileName: 'matrix.ts',
      language: 'TypeScript',
      titleKey: 'matrix.exhibit.code.slides.return.title',
      descriptionKey: 'matrix.exhibit.code.slides.return.description',
    },
  ];

  get activeSlide(): CodeSlide {
    return this.slides[this.activeIndex()];
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['currentStep']) {
      const stepSlide = this.currentStep <= 1 ? 0 : this.currentStep === 2 ? 2 : 3;
      this.showSlide(stepSlide);
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
