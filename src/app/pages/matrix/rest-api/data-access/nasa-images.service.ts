import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { inject, Injectable, InjectionToken } from '@angular/core';
import { map, Observable, timeout } from 'rxjs';

import { normalizeNasaQuery } from '../nasa-query';
import { parseNasaImagesResponse } from './nasa-images-response';
import { ImageSearchResult, RestRequestDetails } from '../rest-api.models';

export const NASA_IMAGES_API_URL = new InjectionToken<string>('NASA_IMAGES_API_URL', {
  factory: () => 'https://images-api.nasa.gov',
});

const RESULT_LIMIT = 12;

/** Adaptador HTTP que consulta a NASA e converte a resposta para o modelo do portal. */
@Injectable({ providedIn: 'root' })
export class NasaImagesService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(NASA_IMAGES_API_URL);
  private readonly requestTimeoutMs = 15_000;

  readonly endpoint = `${this.apiUrl.replace(/\/$/, '')}/search`;

  /**
   * Pesquisa imagens por texto ou por um identificador fornecido explicitamente pelo chamador.
   *
   * @param query Assunto informado no portal.
   * @returns Um fluxo com a primeira imagem válida e os metadados da resposta.
   */
  searchImages(query: string, nasaId?: string): Observable<ImageSearchResult> {
    const normalizedQuery = normalizeNasaQuery(query);
    const requestedId = nasaId?.trim() || undefined;

    return this.http
      .get<unknown>(this.endpoint, {
        params: this.buildParams(normalizedQuery, requestedId),
        observe: 'response',
      })
      .pipe(
        map((response) => this.mapResponse(response, normalizedQuery, requestedId)),
        timeout({ first: this.requestTimeoutMs }),
      );
  }

  /**
   * Produz a mesma requisição exibida pelo inspetor didático, sem enviá-la.
   *
   * @param query Assunto que será normalizado para a consulta.
   * @returns Método, endpoint, parâmetros e URL final da requisição.
   */
  describeRequest(query: string, nasaId?: string): RestRequestDetails {
    const params = this.buildParams(normalizeNasaQuery(query), nasaId?.trim() || undefined);

    return {
      method: 'GET',
      endpoint: this.endpoint,
      parameters: params.keys().map((name) => ({ name, value: params.get(name) ?? '' })),
      url: `${this.endpoint}?${params.toString()}`,
    };
  }

  private buildParams(query: string, nasaId?: string): HttpParams {
    return new HttpParams()
      .set(nasaId ? 'nasa_id' : 'q', nasaId ?? query)
      .set('media_type', 'image')
      .set('page_size', String(RESULT_LIMIT));
  }

  private mapResponse(
    response: HttpResponse<unknown>,
    query: string,
    requestedId?: string,
  ): ImageSearchResult {
    // HTTP 204 deliberately has no JSON document; a null body on HTTP 200 is invalid.
    const parsed =
      response.status === 204 && response.body === null
        ? { image: null, total: 0 }
        : parseNasaImagesResponse(response.body, requestedId);
    return { ...parsed, query, status: response.status };
  }
}
