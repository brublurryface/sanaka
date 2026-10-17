import { afterEach, describe, expect, it, vi } from 'vitest';

import { createRateLimiter } from './request-rate-limit';

describe('createRateLimiter', () => {
  afterEach(() => vi.useRealTimers());

  it('allows the configured number of attempts and returns the remaining wait in seconds', () => {
    vi.useFakeTimers();
    const limit = createRateLimiter({ maxRequests: 2, windowMs: 10_000 });

    expect(limit('first-ip')).toBe(0);
    expect(limit('first-ip')).toBe(0);
    vi.advanceTimersByTime(1_100);
    expect(limit('first-ip')).toBe(9);
    expect(limit('second-ip')).toBe(0);
  });

  it('starts a new window after the previous one expires', () => {
    vi.useFakeTimers();
    const limit = createRateLimiter({ maxRequests: 1, windowMs: 1_000 });

    expect(limit('ip')).toBe(0);
    expect(limit('ip')).toBe(1);
    vi.advanceTimersByTime(1_000);
    expect(limit('ip')).toBe(0);
  });

  it('keeps memory bounded, rejects new keys at capacity, and reclaims expired entries', () => {
    vi.useFakeTimers();
    const limit = createRateLimiter({ maxRequests: 1, windowMs: 1_000, maxEntries: 2 });

    expect(limit('first-ip')).toBe(0);
    expect(limit('second-ip')).toBe(0);
    expect(limit('third-ip')).toBe(1);
    vi.advanceTimersByTime(1_000);
    expect(limit('third-ip')).toBe(0);
    expect(limit('first-ip')).toBe(0);
  });
});
