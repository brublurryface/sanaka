import type { ImageSearchResult, PortalImageViewModel } from '../rest-api.models';

export class NasaContractError extends Error {
  constructor() {
    super('Resposta da NASA incompatível com o contrato esperado.');
    this.name = 'NasaContractError';
  }
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function text(value: unknown): string | undefined {
  return typeof value === 'string' ? value.trim() || undefined : undefined;
}

function preview(value: unknown): string | undefined {
  if (!record(value) || value['rel'] !== 'preview' || value['render'] !== 'image') return undefined;
  const href = text(value['href']);
  if (!href) return undefined;
  try {
    return new URL(href).protocol === 'https:' ? href : undefined;
  } catch {
    return undefined;
  }
}

function image(value: unknown): PortalImageViewModel | null {
  if (!record(value) || !Array.isArray(value['data']) || !Array.isArray(value['links']))
    return null;
  const data = value['data'].find(
    (item: unknown) => record(item) && item['media_type'] === 'image',
  );
  if (!record(data)) return null;
  const id = text(data['nasa_id']);
  const title = text(data['title']);
  const imageUrl = value['links'].map(preview).find((url) => url !== undefined);
  if (!id || !title || !imageUrl) return null;
  const created = text(data['date_created']);
  const date =
    created && /^\d{4}-\d{2}-\d{2}T/u.test(created) && Number.isFinite(Date.parse(created))
      ? created.slice(0, 10)
      : null;
  return {
    id,
    title,
    credit: text(data['photographer']) ?? text(data['secondary_creator']) ?? 'NASA',
    date,
    center: text(data['center']) ?? null,
    imageUrl,
    imageAlt: title,
    sourceUrl: imageUrl,
  };
}

/** Exige a coleção e descarta imagens inutilizáveis e créditos opcionais inválidos. */
export function parseNasaImagesResponse(
  value: unknown,
  requestedId?: string,
): Pick<ImageSearchResult, 'image' | 'total'> {
  if (!record(value) || !record(value['collection'])) throw new NasaContractError();
  const collection = value['collection'];
  const items: unknown = collection['items'];
  if (!Array.isArray(items)) throw new NasaContractError();
  const metadata = collection['metadata'];
  if (metadata != null && !record(metadata)) throw new NasaContractError();
  const total = metadata?.['total_hits'];
  if (
    total !== undefined &&
    (typeof total !== 'number' || !Number.isSafeInteger(total) || total < 0 || total < items.length)
  )
    throw new NasaContractError();
  for (const item of items) {
    const candidate = image(item);
    if (candidate && (!requestedId || candidate.id === requestedId))
      return { image: candidate, total: total ?? 0 };
  }
  return { image: null, total: total ?? 0 };
}
