import { Location } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';

import { Post } from '../post';

@Component({
  imports: [RouterLink, TranslocoPipe],
  selector: 'app-post-card',
  templateUrl: './post-card.html',
  styleUrl: './post-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PostCard {
  private readonly location = inject(Location);
  private readonly router = inject(Router);
  private readonly transloco = inject(TranslocoService);

  readonly post = input.required<Post>();

  private readonly activeLanguage = toSignal(this.transloco.langChanges$, {
    initialValue: this.transloco.getActiveLang(),
  });

  readonly formattedPublishedAt = computed(() => {
    const publishedAt = this.post().publishedAt;
    const [year, month, day] = publishedAt.split('-').map(Number);

    const date = new Date(Date.UTC(year, month - 1, day));

    return new Intl.DateTimeFormat(this.activeLanguage(), {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(date);
  });

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
