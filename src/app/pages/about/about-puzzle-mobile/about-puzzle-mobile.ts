import { Component, input, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

import {
  ABOUT_PUZZLE_MOBILE_OVERLAP,
  ABOUT_PUZZLE_MOBILE_PIECE_PATHS,
  ABOUT_PUZZLE_MOBILE_VIEW_BOXES,
} from '../about-puzzle.geometry';
import { AboutCyclePost } from '../data-access/about-cycles.service';

@Component({
  selector: 'app-about-puzzle-mobile',
  imports: [TranslocoPipe],
  templateUrl: './about-puzzle-mobile.html',
  styleUrl: './about-puzzle-mobile.scss',
  host: { '[style.--piece-overlap]': 'pieceOverlap' },
})
export class AboutPuzzleMobile {
  readonly cycles = input.required<readonly AboutCyclePost[]>();
  readonly selectedCycleId = input<number | null>(null);
  readonly cycleSelected = output<number>();

  protected readonly pieceOverlap = ABOUT_PUZZLE_MOBILE_OVERLAP;
  protected readonly puzzlePiecePaths = ABOUT_PUZZLE_MOBILE_PIECE_PATHS;
  protected readonly puzzleViewBoxes = ABOUT_PUZZLE_MOBILE_VIEW_BOXES;
}
