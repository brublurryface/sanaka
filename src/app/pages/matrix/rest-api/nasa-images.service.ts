import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { inject, Injectable, InjectionToken } from '@angular/core';
import { map, Observable, timeout } from 'rxjs';

import { NASA_IMAGE_PRESETS } from './nasa-image-presets';
import { ImageSearchResult, PortalImageViewModel, RestRequestDetails } from './rest-api.models';

export const NASA_IMAGES_API_URL = new InjectionToken<string>('NASA_IMAGES_API_URL', {
  factory: () => 'https://images-api.nasa.gov',
});

const RESULT_LIMIT = 12;
const QUERY_LIMIT = 60;

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

@Injectable({ providedIn: 'root' })
export class NasaImagesService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(NASA_IMAGES_API_URL);
  private readonly requestTimeoutMs = 15_000;

  readonly endpoint = `${this.apiUrl.replace(/\/$/, '')}/search`;

  searchImages(query: string): Observable<ImageSearchResult> {
    const normalizedQuery = this.normalizeQuery(query);

    return this.http
      .get<NasaSearchResponseDto>(this.endpoint, {
        params: this.buildParams(normalizedQuery),
        observe: 'response',
      })
      .pipe(
        map((response) => this.mapResponse(response, normalizedQuery)),
        timeout({ first: this.requestTimeoutMs }),
      );
  }

  describeRequest(query: string): RestRequestDetails {
    const params = this.buildParams(this.normalizeQuery(query));

    return {
      method: 'GET',
      endpoint: this.endpoint,
      parameters: params.keys().map((name) => ({ name, value: params.get(name) ?? '' })),
      url: `${this.endpoint}?${params.toString()}`,
    };
  }

  private buildParams(query: string): HttpParams {
    const nasaId = this.curatedNasaId(query);

    return new HttpParams()
      .set(nasaId ? 'nasa_id' : 'q', nasaId ?? query)
      .set('media_type', 'image')
      .set('page_size', String(RESULT_LIMIT));
  }

  private mapResponse(
    response: HttpResponse<NasaSearchResponseDto>,
    query: string,
  ): ImageSearchResult {
    const collection = response.body?.collection;
    const requestedId = this.curatedNasaId(query);
    let image: PortalImageViewModel | null = null;

    for (const item of collection?.items ?? []) {
      const data = item.data?.find((entry) => entry.media_type === 'image');
      const previewUrl = item.links
        ?.find((link) => link.rel === 'preview' && link.render === 'image')
        ?.href?.trim();
      const id = data?.nasa_id?.trim();
      const title = data?.title?.trim();

      if (!data || !id || !title || !previewUrl || !this.isHttpsUrl(previewUrl)) {
        continue;
      }

      if (requestedId && id !== requestedId) {
        continue;
      }

      image = {
        id,
        title,
        credit: data.photographer?.trim() || data.secondary_creator?.trim() || 'NASA',
        date: data.date_created?.slice(0, 10) || null,
        center: data.center?.trim() || null,
        // Keep the URL returned by NASA; do not guess an asset path or image size.
        imageUrl: previewUrl,
        imageAlt: title,
        sourceUrl: previewUrl,
      };
      break;
    }

    return {
      image,
      query,
      status: response.status,
      total: collection?.metadata?.total_hits ?? 0,
    };
  }

  private isHttpsUrl(value: string): boolean {
    try {
      return new URL(value).protocol === 'https:';
    } catch {
      return false;
    }
  }

  private normalizeQuery(query: string): string {
    return query.trim().replace(/\s+/g, ' ').slice(0, QUERY_LIMIT);
  }

  private curatedNasaId(query: string): string | undefined {
    return NASA_IMAGE_PRESETS.find((preset) => preset.query.toLowerCase() === query.toLowerCase())
      ?.nasaId;
  }
}
