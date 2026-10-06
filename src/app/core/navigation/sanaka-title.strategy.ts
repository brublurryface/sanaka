import { DestroyRef, Injectable, PendingTasks, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRouteSnapshot, RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { TranslocoService } from '@jsverse/transloco';
import { combineLatest, EMPTY, map, Subject, switchMap } from 'rxjs';

import { SanakaSeoService } from './sanaka-seo.service';

interface RouteMetadataRequest {
  readonly descriptionKey: string;
  readonly path: string;
  readonly titleKey: string;
}

/** Mantém o título da aba sincronizado com a rota e o idioma da interface. */
@Injectable()
export class SanakaTitleStrategy extends TitleStrategy {
  private readonly destroyRef = inject(DestroyRef);
  private readonly metadataRequests = new Subject<RouteMetadataRequest | null>();
  private readonly pendingTasks = inject(PendingTasks);
  private readonly seo = inject(SanakaSeoService);
  private readonly transloco = inject(TranslocoService);
  private releaseInitialTranslation: (() => void) | null = null;

  constructor() {
    super();

    this.metadataRequests
      .pipe(
        switchMap((request) => {
          if (!request) {
            return EMPTY;
          }

          return combineLatest([
            this.transloco.selectTranslate(request.titleKey),
            this.transloco.selectTranslate(request.descriptionKey),
          ]).pipe(map(([pageTitle, description]) => ({ description, pageTitle, request })));
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(({ description, pageTitle, request }) => {
        this.seo.applyPage({
          pageTitle,
          description,
          path: request.path,
          language: this.transloco.getActiveLang(),
        });
        this.finishInitialTranslation();
      });

    this.destroyRef.onDestroy(() => this.finishInitialTranslation());
  }

  override updateTitle(snapshot: RouterStateSnapshot): void {
    const route = this.deepestRoute(snapshot.root);

    this.finishInitialTranslation();

    if (route.data['dynamicTitle']) {
      this.metadataRequests.next(null);
      return;
    }

    const titleKey = route.data['titleKey'];
    const descriptionKey = route.data['descriptionKey'];

    if (typeof titleKey !== 'string' || typeof descriptionKey !== 'string') {
      this.metadataRequests.next(null);
      return;
    }

    // O prerender só serializa a página depois que a primeira tradução dos metadados chega.
    this.releaseInitialTranslation = this.pendingTasks.add();
    this.metadataRequests.next({ descriptionKey, path: snapshot.url, titleKey });
  }

  private finishInitialTranslation(): void {
    this.releaseInitialTranslation?.();
    this.releaseInitialTranslation = null;
  }

  private deepestRoute(route: ActivatedRouteSnapshot): ActivatedRouteSnapshot {
    return route.firstChild ? this.deepestRoute(route.firstChild) : route;
  }
}
