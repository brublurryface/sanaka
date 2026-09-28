import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { CodeExplorerController, CodeExplorerSlide } from '../../code-explorer.controller';

type RestCodeSlide = CodeExplorerSlide;

@Component({
  selector: 'app-rest-code-explorer',
  imports: [TranslocoPipe],
  templateUrl: './rest-code-explorer.html',
  styleUrl: './rest-code-explorer.scss',
})
export class RestCodeExplorer extends CodeExplorerController<RestCodeSlide> implements OnChanges {
  @Input({ required: true }) currentStep = 0;

  override readonly slides: readonly RestCodeSlide[] = [
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

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['currentStep']) {
      this.showSlide(Math.min(Math.max(this.currentStep, 0), this.slides.length - 1));
    }
  }
}
