import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  imports: [RouterLink, TranslocoPipe],
  selector: 'app-sanctuary-hero',
  styleUrl: './sanctuary-hero.scss',
  templateUrl: './sanctuary-hero.html',
})
export class SanctuaryHero {}
