import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import type { AboutCyclePost } from '../data-access/about-cycles.service';

/** Compartilha recorte, filtro e máscara das peças entre o tabuleiro e a faixa móvel. */
@Component({
  selector: 'svg[appAboutPuzzleArt]',
  templateUrl: './about-puzzle-art.html',
  styleUrl: './about-puzzle-art.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true', focusable: 'false' },
})
export class AboutPuzzleArt {
  readonly artId = input.required<string>();
  readonly cycles = input.required<readonly AboutCyclePost[]>();
  readonly paths = input.required<readonly string[]>();
  readonly selectedCycleId = input.required<number | null>();
}
