import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { CodeExplorerController, CodeExplorerSlide } from '../code-explorer.controller';

interface CodeSlide extends CodeExplorerSlide {
  readonly language: 'TypeScript' | 'HTML';
}

@Component({
  selector: 'app-matrix-code-carousel',
  imports: [TranslocoPipe],
  templateUrl: './code-carousel.html',
  styleUrl: './code-carousel.scss',
})
export class MatrixCodeCarousel extends CodeExplorerController<CodeSlide> implements OnChanges {
  @Input({ required: true }) currentStep = 1;

  override readonly slides: readonly CodeSlide[] = [
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

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['currentStep']) {
      const stepSlide = this.currentStep <= 1 ? 0 : this.currentStep === 2 ? 2 : 3;
      this.showSlide(stepSlide);
    }
  }
}
