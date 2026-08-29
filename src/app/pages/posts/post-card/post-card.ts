import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { Post } from '../post';

@Component({
  selector: 'app-post-card',
  templateUrl: './post-card.html',
  styleUrl: './post-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PostCard {
  readonly post = input.required<Post>();
}
