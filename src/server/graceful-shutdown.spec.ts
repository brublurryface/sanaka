import { createServer } from 'node:http';
import { afterEach, expect, it, vi } from 'vitest';
import { installGracefulShutdown } from './graceful-shutdown';

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

it('drains once and enforces one deadline even when SIGTERM is repeated', () => {
  vi.useFakeTimers();
  const server = createServer();
  const close = vi.spyOn(server, 'close').mockReturnValue(server);
  const force = vi.spyOn(server, 'closeAllConnections');
  const exit = vi.spyOn(process, 'exit').mockImplementation(() => {
    throw new Error('forced exit');
  });
  const registration = vi.spyOn(process, 'on').mockReturnValueOnce(process);
  installGracefulShutdown(server, 200);
  const [signal, shutdown] = registration.mock.calls[0];
  expect(signal).toBe('SIGTERM');

  shutdown();
  vi.advanceTimersByTime(150);
  shutdown();
  expect(close).toHaveBeenCalledTimes(1);
  expect(force).not.toHaveBeenCalled();
  expect(() => vi.advanceTimersByTime(50)).toThrow('forced exit');
  expect(force).toHaveBeenCalledTimes(1);
  expect(exit).toHaveBeenCalledExactlyOnceWith(1);
});
