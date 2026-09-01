import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  imports: [RouterLink, TranslocoPipe],
  selector: 'app-sanctuary-paths',
  styleUrl: './sanctuary-paths.scss',
  templateUrl: './sanctuary-paths.html',
})
export class SanctuaryPaths {}
