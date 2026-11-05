/** Limite didático do portal; não é um limite de vocabulário da NASA. */
export const NASA_QUERY_MAX_LENGTH = 60;

export function normalizeNasaQuery(query: string): string {
  return query.trim().replace(/\s+/g, ' ').slice(0, NASA_QUERY_MAX_LENGTH);
}
