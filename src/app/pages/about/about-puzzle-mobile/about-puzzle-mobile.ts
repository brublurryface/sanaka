import { Component, input, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

import { ABOUT_PUZZLE_MOBILE_VIEW_BOXES, ABOUT_PUZZLE_PIECE_PATHS } from '../about-puzzle.geometry';
import { AboutCyclePost } from '../data-access/about-cycles.service';

@Component({
  selector: 'app-about-puzzle-mobile',
  imports: [TranslocoPipe],
  templateUrl: './about-puzzle-mobile.html',
  styleUrl: './about-puzzle-mobile.scss',
})
export class AboutPuzzleMobile {
  readonly cycles = input.required<readonly AboutCyclePost[]>();
  readonly selectedCycleId = input<number | null>(null);
  readonly cycleSelected = output<number>();

  protected readonly puzzlePiecePaths = ABOUT_PUZZLE_PIECE_PATHS;
  protected readonly puzzleViewBoxes = ABOUT_PUZZLE_MOBILE_VIEW_BOXES;
}
