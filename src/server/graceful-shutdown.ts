import type { Server } from 'node:http';

/** O Render envia SIGTERM antes do desligamento. Quem já está enviando uma mensagem pode concluir. */
export function installGracefulShutdown(server: Server, deadlineMs = 25_000): void {
  let draining = false;
  process.on('SIGTERM', () => {
    if (draining) return;
    draining = true;
    server.close();
    // O timer não mantém o processo vivo quando as requisições e os demais recursos terminam.
    setTimeout(() => {
      server.closeAllConnections();
      process.exit(1);
    }, deadlineMs).unref();
  });
}
