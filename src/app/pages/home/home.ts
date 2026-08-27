import { Component } from '@angular/core';
import { SanctuaryHero } from './sanctuary-hero/sanctuary-hero';
import { SanctuaryPaths } from './sanctuary-paths/sanctuary-paths';

@Component({
  imports: [SanctuaryHero, SanctuaryPaths],
  selector: 'app-home',
  templateUrl: './home.html',
})
export class Home {}
