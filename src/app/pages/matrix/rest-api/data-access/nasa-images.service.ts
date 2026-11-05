import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { inject, Injectable, InjectionToken } from '@angular/core';
import { map, Observable, timeout } from 'rxjs';

import { normalizeNasaQuery } from '../nasa-query';
import { ImageSearchResult, PortalImageViewModel, RestRequestDetails } from '../rest-api.models';

export const NASA_IMAGES_API_URL = new InjectionToken<string>('NASA_IMAGES_API_URL', {
  factory: () => 'https://images-api.nasa.gov',
});

const RESULT_LIMIT = 12;

interface NasaImageDataDto {
  readonly nasa_id?: string;
  readonly title?: string;
  readonly media_type?: string;
  readonly photographer?: string;
  readonly secondary_creator?: string;
  readonly date_created?: string;
  readonly center?: string;
}

interface NasaImageLinkDto {
  readonly href?: string;
  readonly rel?: string;
  readonly render?: string;
}

interface NasaImageItemDto {
  readonly data?: readonly NasaImageDataDto[];
  readonly links?: readonly NasaImageLinkDto[];
}

interface NasaSearchResponseDto {
  readonly collection?: {
    readonly items?: readonly NasaImageItemDto[];
    readonly metadata?: { readonly total_hits?: number };
  };
}

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
      .get<NasaSearchResponseDto>(this.endpoint, {
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
    response: HttpResponse<NasaSearchResponseDto>,
    query: string,
    requestedId?: string,
  ): ImageSearchResult {
    const collection = response.body?.collection;

    return {
      image: this.findImage(collection?.items ?? [], requestedId),
      query,
      status: response.status,
      total: collection?.metadata?.total_hits ?? 0,
    };
  }

  private findImage(
    items: readonly NasaImageItemDto[],
    requestedId?: string,
  ): PortalImageViewModel | null {
    for (const item of items) {
      const image = this.toPortalImage(item);

      if (image && (!requestedId || image.id === requestedId)) {
        return image;
      }
    }

    return null;
  }

  private toPortalImage(item: NasaImageItemDto): PortalImageViewModel | null {
    const data = item.data?.find((entry) => entry.media_type === 'image');
    const previewUrl = item.links
      ?.find((link) => link.rel === 'preview' && link.render === 'image')
      ?.href?.trim();
    const id = data?.nasa_id?.trim();
    const title = data?.title?.trim();

    if (!data || !id || !title || !previewUrl || !this.isHttpsUrl(previewUrl)) {
      return null;
    }

    return {
      id,
      title,
      credit: data.photographer?.trim() || data.secondary_creator?.trim() || 'NASA',
      date: data.date_created?.slice(0, 10) || null,
      center: data.center?.trim() || null,
      // Preserva a URL devolvida pela NASA; não deduz caminhos nem tamanhos de imagem.
      imageUrl: previewUrl,
      imageAlt: title,
      sourceUrl: previewUrl,
    };
  }

  private isHttpsUrl(value: string): boolean {
    try {
      return new URL(value).protocol === 'https:';
    } catch {
      return false;
    }
  }
}
