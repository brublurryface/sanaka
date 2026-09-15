export type PortalPhase = 'idle' | 'loading' | 'success' | 'empty' | 'error';

export interface PortalImageViewModel {
  readonly id: string;
  readonly title: string;
  readonly credit: string;
  readonly date: string | null;
  readonly center: string | null;
  readonly imageUrl: string;
  readonly imageAlt: string;
  readonly sourceUrl: string;
}

export interface ImageSearchResult {
  readonly image: PortalImageViewModel | null;
  readonly query: string;
  readonly status: number;
  readonly total: number;
}

export interface RestRequestParameter {
  readonly name: string;
  readonly value: string;
}

export interface RestRequestDetails {
  readonly method: 'GET';
  readonly endpoint: string;
  readonly parameters: readonly RestRequestParameter[];
  readonly url: string;
}
