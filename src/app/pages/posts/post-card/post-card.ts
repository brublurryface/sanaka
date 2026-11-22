import { Location } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';

import type { Post } from '../post';
import { PostDate } from '../post-date';
import { SANAKA_WORDPRESS_CONTENT_LANGUAGE } from '../../../core/wordpress/wordpress-content-policy';

@Component({
  imports: [RouterLink, TranslocoPipe, PostDate],
  selector: 'app-post-card',
  templateUrl: './post-card.html',
  styleUrl: './post-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PostCard {
  private readonly location = inject(Location);
  private readonly router = inject(Router);

  readonly post = input.required<Post>();
  readonly contentLanguage = inject(SANAKA_WORDPRESS_CONTENT_LANGUAGE);

  categoryHref(slug: string): string {
    const url = this.router.createUrlTree(['/posts'], { queryParams: { category: slug } });
    return this.location.prepareExternalUrl(this.router.serializeUrl(url));
  }

  selectCategory(event: MouseEvent, slug: string): void {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) {
      return;
    }

    event.preventDefault();
    void this.router.navigate(['/posts'], {
      queryParams: { category: slug },
      scroll: 'manual',
    });
  }
}
