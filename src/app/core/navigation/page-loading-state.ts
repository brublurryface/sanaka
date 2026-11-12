import { Injectable, signal } from '@angular/core';

import { LoadingVariant } from '../../shared/loading-indicator/loading-artwork';

export interface PageLoadingRequest {
  readonly variant: LoadingVariant;
  readonly labelKey: string;
}

/** Keeps the application busy only while a routed page is waiting for its initial data. */
@Injectable({ providedIn: 'root' })
export class PageLoadingState {
  private readonly requests = new Map<symbol, PageLoadingRequest>();
  private readonly currentRequest = signal<PageLoadingRequest | null>(null);
  readonly current = this.currentRequest.asReadonly();

  begin(request: PageLoadingRequest): () => void {
    const owner = Symbol();
    this.requests.set(owner, request);
    this.currentRequest.set(request);

    return () => {
      this.requests.delete(owner);
      this.currentRequest.set([...this.requests.values()].at(-1) ?? null);
    };
  }
}
