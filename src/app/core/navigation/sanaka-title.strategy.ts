import { DestroyRef, Injectable, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { ActivatedRouteSnapshot, RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { TranslocoService } from '@jsverse/transloco';

/** Mantém o título da aba sincronizado com a rota e o idioma da interface. */
@Injectable()
export class SanakaTitleStrategy extends TitleStrategy {
  private readonly title = inject(Title);
  private readonly transloco = inject(TranslocoService);
  private readonly destroyRef = inject(DestroyRef);
  private currentSnapshot: RouterStateSnapshot | null = null;

  constructor() {
    super();

    this.transloco.langChanges$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      if (this.currentSnapshot) {
        this.applyTitle(this.currentSnapshot);
      }
    });
  }

  override updateTitle(snapshot: RouterStateSnapshot): void {
    this.currentSnapshot = snapshot;
    this.applyTitle(snapshot);
  }

  private applyTitle(snapshot: RouterStateSnapshot): void {
    const route = this.deepestRoute(snapshot.root);

    if (route.data['dynamicTitle']) {
      return;
    }

    const titleKey = route.data['titleKey'];
    const pageTitle = typeof titleKey === 'string' ? this.transloco.translate(titleKey) : '';

    this.title.setTitle(pageTitle ? `${pageTitle} | Sanaka` : 'Sanaka');
  }

  private deepestRoute(route: ActivatedRouteSnapshot): ActivatedRouteSnapshot {
    return route.firstChild ? this.deepestRoute(route.firstChild) : route;
  }
}
