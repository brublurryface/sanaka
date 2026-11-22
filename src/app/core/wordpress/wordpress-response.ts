/** Indica que a resposta HTTP recebida diverge do contrato WordPress usado pelo Sanaka. */
export class WordPressContractError extends Error {
  constructor(message = 'Resposta do WordPress incompatível com o contrato esperado.') {
    super(message);
    this.name = 'WordPressContractError';
  }
}

export interface WordPressRenderedField {
  readonly rendered: string;
}

export interface WordPressPostReference {
  readonly slug: string;
  readonly title: WordPressRenderedField;
}

export interface WordPressIdentity {
  readonly id: number;
  readonly slug: string;
}

export interface WordPressCategory extends WordPressIdentity {
  readonly name: string;
  readonly parent: number;
}

export interface WordPressTag extends WordPressIdentity {
  readonly name: string;
}

export interface WordPressMedia {
  readonly id: number;
  readonly source_url: string;
  readonly alt_text: string;
  readonly media_details?: {
    readonly sizes?: Readonly<Record<string, { readonly source_url: string }>>;
  };
}

export interface WordPressPost extends WordPressIdentity, WordPressPostReference {
  readonly date: string;
  readonly excerpt: WordPressRenderedField;
  readonly content?: WordPressRenderedField;
  readonly featured_media: number;
  readonly categories: readonly number[];
  readonly tags?: readonly number[];
  readonly sanaka_character_slug?: string;
  readonly sanaka_character_name?: string;
  readonly sanaka_obolo_front?: string;
  readonly sanaka_obolo_back?: string;
  readonly _embedded?: { readonly 'wp:featuredmedia': readonly WordPressMedia[] };
}

export function isWordPressRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function wordPressRecord(value: unknown): Record<string, unknown> {
  if (!isWordPressRecord(value)) throw new WordPressContractError();
  return value;
}

export function wordPressArray(value: unknown): readonly unknown[] {
  if (!Array.isArray(value)) throw new WordPressContractError();
  return value;
}

function positiveId(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

export function wordPressIdentity(value: unknown): WordPressIdentity {
  const item = wordPressRecord(value);
  if (!positiveId(item['id']) || typeof item['slug'] !== 'string' || !item['slug'].trim())
    throw new WordPressContractError();
  return { id: item['id'], slug: item['slug'] };
}

export function wordPressRenderedField(value: unknown): WordPressRenderedField {
  const item = wordPressRecord(value);
  if (typeof item['rendered'] !== 'string') throw new WordPressContractError();
  return { rendered: item['rendered'] };
}

export function wordPressPostReference(value: unknown): WordPressPostReference {
  const item = wordPressRecord(value);
  if (typeof item['slug'] !== 'string' || !item['slug'].trim()) throw new WordPressContractError();
  return { slug: item['slug'], title: wordPressRenderedField(item['title']) };
}

export function assertWordPressIdentities(items: readonly WordPressIdentity[]): void {
  if (
    new Set(items.map((item) => item.id)).size !== items.length ||
    new Set(items.map((item) => item.slug)).size !== items.length
  )
    throw new WordPressContractError('Identidades duplicadas na resposta do WordPress.');
}

function idList(value: unknown): readonly number[] {
  const ids = wordPressArray(value);
  if (!ids.every(positiveId)) throw new WordPressContractError();
  return ids;
}

function optionalIds(value: unknown): readonly number[] | undefined {
  return Array.isArray(value) && value.every(positiveId) ? value : undefined;
}

export function optionalWordPressText(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function media(value: unknown): WordPressMedia | undefined {
  if (!isWordPressRecord(value) || !positiveId(value['id'])) return undefined;
  const source = optionalWordPressText(value['source_url']);
  if (!source?.trim()) return undefined;
  const details = value['media_details'];
  const sizes = isWordPressRecord(details) ? details['sizes'] : undefined;
  const validSizes: Record<string, { readonly source_url: string }> = {};
  if (isWordPressRecord(sizes)) {
    for (const name of ['medium_large', 'large']) {
      const size = sizes[name];
      if (
        isWordPressRecord(size) &&
        typeof size['source_url'] === 'string' &&
        size['source_url'].trim()
      )
        validSizes[name] = { source_url: size['source_url'] };
    }
  }
  return {
    id: value['id'],
    source_url: source,
    alt_text: optionalWordPressText(value['alt_text']) ?? '',
    media_details: { sizes: validSizes },
  };
}

/** Rejeita o registro obrigatório inválido para preservar a coerência dos totais da página. */
export function parseWordPressPosts(value: unknown, detail = false): readonly WordPressPost[] {
  const posts = wordPressArray(value).map((entry) => {
    const item = wordPressRecord(entry);
    const identity = wordPressIdentity(item);
    const date = item['date'];
    if (
      typeof date !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}T/u.test(date) ||
      !Number.isFinite(Date.parse(date))
    )
      throw new WordPressContractError();
    const embedded = item['_embedded'];
    const images = isWordPressRecord(embedded) ? embedded['wp:featuredmedia'] : undefined;
    const validMedia = Array.isArray(images)
      ? images.map(media).filter((item) => item !== undefined)
      : [];
    const feature = item['featured_media'];
    const content = detail ? wordPressRenderedField(item['content']) : undefined;
    return {
      ...identity,
      date,
      title: wordPressRenderedField(item['title']),
      excerpt: wordPressRenderedField(item['excerpt']),
      content,
      featured_media: positiveId(feature) ? feature : 0,
      categories: idList(item['categories']),
      tags: optionalIds(item['tags']),
      sanaka_character_slug: optionalWordPressText(item['sanaka_character_slug']),
      sanaka_character_name: optionalWordPressText(item['sanaka_character_name']),
      sanaka_obolo_front: optionalWordPressText(item['sanaka_obolo_front']),
      sanaka_obolo_back: optionalWordPressText(item['sanaka_obolo_back']),
      _embedded: { 'wp:featuredmedia': validMedia },
    };
  });
  assertWordPressIdentities(posts);
  return posts;
}

export function parseWordPressEditorialCategories(value: unknown): readonly WordPressIdentity[] {
  const categories = wordPressArray(value).map(wordPressIdentity);
  assertWordPressIdentities(categories);
  return categories;
}

export function parseWordPressCategories(value: unknown): readonly WordPressCategory[] {
  return wordPressArray(value).map((entry) => {
    const item = wordPressRecord(entry);
    const parent = item['parent'];
    if (
      typeof item['name'] !== 'string' ||
      typeof parent !== 'number' ||
      !Number.isSafeInteger(parent) ||
      parent < 0
    )
      throw new WordPressContractError();
    return { ...wordPressIdentity(item), name: item['name'], parent };
  });
}

/** Aceita pais omitidos pela projeção e rejeita ciclos entre os ancestrais presentes. */
export function assertWordPressCategoryTree(categories: readonly WordPressCategory[]): void {
  assertWordPressIdentities(categories);
  const byId = new Map(categories.map((category) => [category.id, category]));
  for (const category of categories) {
    const visited = new Set<number>();
    let current: WordPressCategory | undefined = category;
    while (current) {
      if (visited.has(current.id))
        throw new WordPressContractError('Hierarquia de categorias do WordPress circular.');
      visited.add(current.id);
      current = byId.get(current.parent);
    }
  }
}

export function parseWordPressTags(value: unknown): readonly WordPressTag[] {
  return wordPressArray(value).map((entry) => {
    const item = wordPressRecord(entry);
    if (typeof item['name'] !== 'string') throw new WordPressContractError();
    return { ...wordPressIdentity(item), name: item['name'] };
  });
}

export function parseWordPressTagContexts(
  value: unknown,
): readonly Pick<WordPressPost, 'categories' | 'tags'>[] {
  return wordPressArray(value).map((entry) => {
    const item = wordPressRecord(entry);
    return { categories: idList(item['categories']), tags: optionalIds(item['tags']) };
  });
}

export function wordPressCountHeader(value: string | null): number {
  if (value === null || !/^\d+$/.test(value.trim()))
    throw new WordPressContractError(
      'Metadados de paginação do WordPress indisponíveis ou inválidos.',
    );
  const count = Number(value);
  if (!Number.isSafeInteger(count))
    throw new WordPressContractError(
      'Metadados de paginação do WordPress indisponíveis ou inválidos.',
    );
  return count;
}
