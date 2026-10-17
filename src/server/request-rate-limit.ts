interface RateLimitEntry {
  count: number;
  readonly expiresAt: number;
}

interface RateLimitOptions {
  readonly maxRequests: number;
  readonly windowMs: number;
  readonly maxEntries?: number;
}

/**
 * Cria um limite independente por endpoint e por IP, sem cookies ou armazenamento permanente.
 * Retorna zero quando permite a tentativa; caso contrário, os segundos restantes da janela.
 * O limite é local ao processo Node: não substitui proteção compartilhada entre várias instâncias.
 */
export function createRateLimiter({
  maxRequests,
  windowMs,
  maxEntries = 1_000,
}: RateLimitOptions): (key: string) => number {
  const entries = new Map<string, RateLimitEntry>();

  return (key) => {
    const now = Date.now();
    const entry = entries.get(key);

    if (entry && entry.expiresAt > now) {
      entry.count += 1;
      return entry.count > maxRequests ? Math.ceil((entry.expiresAt - now) / 1_000) : 0;
    }

    // Remove janelas vencidas antes de aceitar novos IPs. A memória nunca cresce sem limite.
    if (entries.size >= maxEntries) {
      for (const [storedKey, storedEntry] of entries) {
        if (storedEntry.expiresAt <= now) {
          entries.delete(storedKey);
        }
      }

      if (entries.size >= maxEntries) {
        return Math.ceil(windowMs / 1_000);
      }
    }

    entries.set(key, { count: 1, expiresAt: now + windowMs });
    return 0;
  };
}
