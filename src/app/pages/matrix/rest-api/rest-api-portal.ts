import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { catchError, map, of, Subject, switchMap, takeUntil, tap } from 'rxjs';

import { NASA_IMAGE_PRESETS } from './nasa-image-presets';
import { NasaImagesService } from './nasa-images.service';
import { ArcanePortal } from './arcane-portal/arcane-portal';
import { RestCodeExplorer } from './code-explorer/rest-code-explorer';
import { RestRequestInspector } from './request-inspector/rest-request-inspector';
import { ImageSearchResult, PortalPhase } from './rest-api.models';

type SearchOutcome =
  | { readonly kind: 'result'; readonly result: ImageSearchResult }
  | { readonly kind: 'error'; readonly status: number };

@Component({
  selector: 'app-rest-api-portal',
  imports: [RouterLink, TranslocoPipe, ArcanePortal, RestCodeExplorer, RestRequestInspector],
  templateUrl: './rest-api-portal.html',
  styleUrl: './rest-api-portal.scss',
})
export class RestApiPortal {
  private readonly api = inject(NasaImagesService);
  private readonly searchRequests = new Subject<string>();
  private readonly cancelRequests = new Subject<void>();

  readonly queryMaxLength = 60;
  readonly query = signal('Orion nebula');
  readonly submittedQuery = signal<string | null>(null);
  readonly lastQuery = signal<string | null>(null);
  readonly phase = signal<PortalPhase>('idle');
  readonly result = signal<ImageSearchResult | null>(null);
  readonly errorStatus = signal<number | null>(null);
  readonly imageFailed = signal(false);
  readonly imageLoaded = signal(false);

  readonly presets = NASA_IMAGE_PRESETS;

  readonly canSearch = computed(() => this.query().trim().length > 0);
  readonly requestDetails = computed(() =>
    this.api.describeRequest(this.submittedQuery() ?? this.query()),
  );
  readonly responseStatus = computed(() => {
    const status = this.result()?.status ?? this.errorStatus();
    // Angular uses 0 when no HTTP status is available; it is not a server response code.
    return status && status > 0 ? status : null;
  });
  readonly currentCodeStep = computed(() => {
    switch (this.phase()) {
      case 'loading':
        return 1;
      case 'error':
        return 2;
      case 'success':
      case 'empty':
        return 3;
      default:
        return 0;
    }
  });
  readonly mappedResponse = computed(() => {
    const image = this.result()?.image;

    if (!image) {
      return '{}';
    }

    return JSON.stringify(
      {
        id: image.id,
        title: image.title,
        credit: image.credit,
        date: image.date,
        center: image.center,
        imageUrl: image.imageUrl,
      },
      null,
      2,
    );
  });

  constructor() {
    this.searchRequests
      .pipe(
        tap((query) => this.beginRequest(query)),
        switchMap((query) =>
          this.api.searchImages(query).pipe(
            map((result): SearchOutcome => ({ kind: 'result', result })),
            catchError((error: unknown) =>
              of<SearchOutcome>({
                kind: 'error',
                status: error instanceof HttpErrorResponse ? error.status : 0,
              }),
            ),
            takeUntil(this.cancelRequests),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((outcome) => this.finishRequest(outcome));
  }

  updateQuery(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value.slice(0, this.queryMaxLength));
  }

  search(): void {
    const query = this.query().trim().replace(/\s+/g, ' ');

    if (!query) {
      return;
    }

    this.query.set(query);
    this.searchRequests.next(query);
  }

  selectPreset(query: string): void {
    this.query.set(query);
    this.search();
  }

  retry(): void {
    const query = this.lastQuery();

    if (!query) {
      return;
    }

    this.query.set(query);
    this.searchRequests.next(query);
  }

  startOver(): void {
    this.cancelRequests.next();
    this.phase.set('idle');
    this.submittedQuery.set(null);
    this.result.set(null);
    this.errorStatus.set(null);
    this.imageFailed.set(false);
    this.imageLoaded.set(false);
  }

  handleImageLoaded(): void {
    this.imageLoaded.set(true);
  }

  handleImageError(): void {
    this.imageFailed.set(true);
  }

  private beginRequest(query: string): void {
    this.submittedQuery.set(query);
    this.lastQuery.set(query);
    this.phase.set('loading');
    this.result.set(null);
    this.errorStatus.set(null);
    this.imageFailed.set(false);
    this.imageLoaded.set(false);
  }

  private finishRequest(outcome: SearchOutcome): void {
    if (outcome.kind === 'error') {
      this.errorStatus.set(outcome.status);
      this.phase.set('error');
      return;
    }

    this.result.set(outcome.result);
    this.phase.set(outcome.result.image ? 'success' : 'empty');
  }
}
