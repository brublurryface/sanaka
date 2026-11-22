import { once } from 'node:events';
import { createServer, type AddressInfo, type Socket } from 'node:net';

type SmtpMode = 'success' | 'silent' | 'idle' | 'active' | 'reject' | 'disconnect' | 'hold';

/** Simula a confirmação SMTP em loopback para os testes HTTP e os do bundle de produção. */
export async function createSmtpFixture(mode: SmtpMode) {
  const sockets = new Set<Socket>();
  let confirmDelivery: (() => void) | undefined;
  const stats = { connections: 0, messages: 0, beats: 0 };
  const server = createServer((socket) => {
    stats.connections++;
    sockets.add(socket);
    socket.setEncoding('utf8');
    let buffer = '';
    let data = false;
    let heartbeat: ReturnType<typeof setInterval> | undefined;
    socket.on('error', () => {});
    socket.on('close', () => {
      sockets.delete(socket);
      clearInterval(heartbeat);
    });
    if (mode === 'silent') return;
    socket.write('220 local.test ESMTP\r\n');
    socket.on('data', (chunk) => {
      buffer += chunk;
      while (buffer.includes('\r\n')) {
        if (data) {
          const end = buffer.indexOf('\r\n.\r\n');
          if (end === -1) return;
          buffer = buffer.slice(end + 5);
          data = false;
          stats.messages++;
          if (mode === 'success') socket.write('250 queued\r\n');
          else if (mode === 'hold') confirmDelivery = () => socket.write('250 queued\r\n');
          else if (mode === 'disconnect') socket.destroy();
          else if (mode === 'active') {
            heartbeat = setInterval(() => {
              stats.beats++;
              socket.write('250-still processing\r\n');
            }, 15);
            heartbeat.unref();
          }
          continue;
        }
        const end = buffer.indexOf('\r\n');
        const line = buffer.slice(0, end);
        buffer = buffer.slice(end + 2);
        if (line.startsWith('EHLO')) socket.write('250-local.test\r\n250 AUTH PLAIN\r\n');
        else if (line.startsWith('AUTH'))
          socket.write(
            mode === 'reject' ? '535 credentials rejected\r\n' : '235 authenticated\r\n',
          );
        else if (line.startsWith('MAIL') || line.startsWith('RCPT')) socket.write('250 ok\r\n');
        else if (line === 'DATA') {
          data = true;
          socket.write('354 send data\r\n');
        } else if (line === 'QUIT') socket.end('221 bye\r\n');
      }
    });
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');

  return {
    stats,
    confirm: () => {
      if (!confirmDelivery) throw new Error('SMTP has no pending message');
      confirmDelivery();
    },
    close: async () => {
      for (const socket of sockets) socket.destroy();
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    },
    activeConnections: () => sockets.size,
    environment: {
      SMTP_HOST: '127.0.0.1',
      SMTP_PORT: String((server.address() as AddressInfo).port),
      SMTP_SECURE: 'false',
      SMTP_USER: 'sender@example.test',
      SMTP_PASS: 'fake-test-secret',
      CONTACT_FROM_EMAIL: 'sender@example.test',
      CONTACT_TO_EMAIL: 'recipient@example.test',
    },
  };
}
